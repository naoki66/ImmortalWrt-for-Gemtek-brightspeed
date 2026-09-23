// SPDX-License-Identifier: GPL-2.0-only
/*
 * Minimal EN7581 PCM-SPI control transport for the XG2010G Si32192.
 *
 * The register sequences are limited to behavior verified from the EN7581
 * SDK resource tables and the stock Linux 5.4.55 pcm1/spi modules.  The PCM
 * descriptor ring and basic ProSLIC linefeed control are implemented here;
 * full ProSLIC patch/RAM initialization and calibrated ringing still need
 * the vendor tables before they can be enabled safely.
 *
 * Direct register read/write follows the stock SPI_bytes_read_silicon() and
 * SPI_bytes_write_silicon() command-byte sequences.  The raw sysfs register
 * hook exists to make the remaining ProSLIC bring-up observable, not as a
 * replacement for a full line-control driver.
 */

#include <linux/bitfield.h>
#include <linux/delay.h>
#include <linux/device.h>
#include <linux/dma-mapping.h>
#include <linux/fs.h>
#include <linux/iopoll.h>
#include <linux/io.h>
#include <linux/kstrtox.h>
#include <linux/mfd/syscon.h>
#include <linux/miscdevice.h>
#include <linux/module.h>
#include <linux/mutex.h>
#include <linux/of.h>
#include <linux/platform_device.h>
#include <linux/regmap.h>
#include <linux/uaccess.h>
#include <linux/wait.h>

#define EN7581_SPI_CTRL			0x00
#define EN7581_SPI_TX_DATA		0x04
#define EN7581_SPI_RX_DATA		0x08
#define EN7581_SPI_MASTER		0x28
#define EN7581_SPI_MOREBUF		0x2c

#define EN7581_SPI_CTRL_START		BIT(8)
#define EN7581_SPI_CTRL_BUSY		BIT(16)
#define EN7581_SPI_MASTER_CS		GENMASK(31, 29)

#define EN7581_SPI_MASTER_ISI		0x00000134
#define EN7581_SPI_MASTER_BYTE_XFER	0x001c0000
#define EN7581_SPI_MASTER_KEEP_MASK	0x1000ffff
#define EN7581_SPI_MOREBUF_KEEP_MASK	0xc0e00e00
#define EN7581_SPI_MOREBUF_TX_EN	BIT(27)
#define EN7581_SPI_MOREBUF_RX_EN	BIT(15)

#define EN7581_PCM_SLIC_RESET		0x0834
#define EN7581_PCM_RESET_SLIC0		BIT(0)
#define EN7581_PCM_RESET_ISI		BIT(4)

#define EN7581_PCM_GLOBAL_CFG		0x0000
#define EN7581_PCM_GLOBAL_KEEP_MASK	0xfff7e7df
#define EN7581_PCM_GLOBAL_DEFAULT	0x00050306
#define EN7581_PCM_RX_CFG		0x0014
#define EN7581_PCM_DMA_CTRL		0x0040
#define EN7581_PCM_CLK_CTRL		0x00ac
#define EN7581_PCM_SLOT_SAMPLE_EN	BIT(12)
#define EN7581_PCM_SLOT_PAIR_EN		BIT(28)

#define EN7581_PCM_TX_DESC_BASE	0x0034
#define EN7581_PCM_RX_DESC_BASE	0x0038
#define EN7581_PCM_RING_SIZE		0x003c
#define EN7581_PCM_TX_DOORBELL	0x002c
#define EN7581_PCM_RX_DOORBELL	0x0030
#define EN7581_PCM_RING_CTRL		0x00a8
#define EN7581_PCM_DESC_COUNT		25
#define EN7581_PCM_FRAME_BYTES		320
#define EN7581_PCM_DESC_OWN		BIT(31)
#define EN7581_PCM_DESC_LEN		GENMASK(9, 0)
#define EN7581_PCM_DESC_IRQ		BIT(0)

#define EN7581_CHIP_SCU_PCM_CLK		0x0218
#define EN7581_CHIP_SCU_PCM_CLK_MASK	0x003f3300
#define EN7581_CHIP_SCU_PCM_CLK_ISI	0x00100000
#define EN7581_CHIP_SCU_PCM_GPIO	0x01d0
#define EN7581_CHIP_SCU_PCM_GPIO_MASK	0x00000c00
#define EN7581_NP_SCU_PCM_MUX		0x0094
#define EN7581_NP_SCU_PCM_MUX_MASK	GENMASK(3, 0)

#define SI3219X_CTRL_READ_CH0		0x60
#define SI3219X_CTRL_WRITE_CH0		0x20
#define SI3219X_REG_ID			0x00
#define SI3219X_REG_LINEFEED		0x1e
#define SI3219X_REG_HOOK_STATUS		0x22
#define SI3219X_REG_LINEFEED_CTRL		0x50
#define SI3219X_LINEFEED_CTRL_HOLD	BIT(2)
#define SI3219X_LINEFEED_MASK		GENMASK(3, 0)
#define SI3219X_HOOK_OFFHOOK		BIT(1)
#define SI3219X_ID_REV			GENMASK(2, 0)
#define SI3219X_ID_PART			GENMASK(5, 3)
#define SI32192_PART			5
#define SI32192_REV			2

struct en7581_pcm_desc {
	u32 ctrl;
	u32 irq;
	u32 addr;
};

struct en7581_pcm_spi {
	struct device *dev;
	void __iomem *spi_base;
	void __iomem *pcm_base;
	struct regmap *chip_scu;
	struct regmap *np_scu;
	struct mutex lock;
	struct en7581_pcm_desc *tx_desc;
	struct en7581_pcm_desc *rx_desc;
	dma_addr_t tx_desc_dma;
	dma_addr_t rx_desc_dma;
	u8 *tx_buf;
	u8 *rx_buf;
	dma_addr_t tx_buf_dma;
	dma_addr_t rx_buf_dma;
	unsigned int tx_head;
	unsigned int tx_tail;
	unsigned int rx_head;
	unsigned int rx_tail;
	struct miscdevice misc;
	bool pcm_ready;
	u8 reg0;
	u8 debug_reg;
	u8 pcm_debug_reg;
	unsigned int chip_select;
	bool identified;
};

static int en7581_spi_wait_idle(struct en7581_pcm_spi *priv)
{
	u32 val;

	return readl_poll_timeout(priv->spi_base + EN7581_SPI_CTRL, val,
				  !(val & EN7581_SPI_CTRL_BUSY), 1, 10000);
}

static int en7581_spi_clock_byte(struct en7581_pcm_spi *priv, u8 tx,
				  bool load_tx, u8 *rx)
{
	u32 val;
	int ret;

	ret = en7581_spi_wait_idle(priv);
	if (ret)
		return ret;

	if (load_tx)
		writel(tx, priv->spi_base + EN7581_SPI_TX_DATA);

	val = readl(priv->spi_base + EN7581_SPI_CTRL);
	writel(val | EN7581_SPI_CTRL_START,
	       priv->spi_base + EN7581_SPI_CTRL);

	ret = en7581_spi_wait_idle(priv);
	if (ret)
		return ret;

	if (rx)
		*rx = readl(priv->spi_base + EN7581_SPI_RX_DATA);

	return 0;
}

static void en7581_pcm_ring_free(struct en7581_pcm_spi *priv);

static int en7581_pcm_ring_alloc(struct en7581_pcm_spi *priv)
{
	size_t desc_size = EN7581_PCM_DESC_COUNT * sizeof(*priv->tx_desc);
	size_t buf_size = EN7581_PCM_DESC_COUNT * EN7581_PCM_FRAME_BYTES;

	priv->tx_desc = dma_alloc_coherent(priv->dev, desc_size,
					       &priv->tx_desc_dma, GFP_KERNEL);
	if (!priv->tx_desc)
		return -ENOMEM;

	priv->rx_desc = dma_alloc_coherent(priv->dev, desc_size,
					       &priv->rx_desc_dma, GFP_KERNEL);
	if (!priv->rx_desc) {
		en7581_pcm_ring_free(priv);
		return -ENOMEM;
	}

	priv->tx_buf = dma_alloc_coherent(priv->dev, buf_size,
				       &priv->tx_buf_dma, GFP_KERNEL);
	if (!priv->tx_buf) {
		en7581_pcm_ring_free(priv);
		return -ENOMEM;
	}

	priv->rx_buf = dma_alloc_coherent(priv->dev, buf_size,
				       &priv->rx_buf_dma, GFP_KERNEL);
	if (!priv->rx_buf) {
		en7581_pcm_ring_free(priv);
		return -ENOMEM;
	}

	return 0;
}

static void en7581_pcm_ring_free(struct en7581_pcm_spi *priv)
{
	size_t desc_size = EN7581_PCM_DESC_COUNT * sizeof(*priv->tx_desc);
	size_t buf_size = EN7581_PCM_DESC_COUNT * EN7581_PCM_FRAME_BYTES;

	if (priv->rx_buf)
		dma_free_coherent(priv->dev, buf_size, priv->rx_buf,
				  priv->rx_buf_dma);
	if (priv->tx_buf)
		dma_free_coherent(priv->dev, buf_size, priv->tx_buf,
				  priv->tx_buf_dma);
	if (priv->rx_desc)
		dma_free_coherent(priv->dev, desc_size, priv->rx_desc,
				  priv->rx_desc_dma);
	if (priv->tx_desc)
		dma_free_coherent(priv->dev, desc_size, priv->tx_desc,
				  priv->tx_desc_dma);
}

static void en7581_pcm_rx_submit(struct en7581_pcm_spi *priv,
				 unsigned int slot)
{
	struct en7581_pcm_desc *desc = &priv->rx_desc[slot];

	desc->addr = priv->rx_buf_dma + slot * EN7581_PCM_FRAME_BYTES;
	desc->irq = EN7581_PCM_DESC_IRQ;
	desc->ctrl = EN7581_PCM_FRAME_BYTES | EN7581_PCM_DESC_OWN;
	dma_wmb();
}

static int en7581_pcm_ring_init(struct en7581_pcm_spi *priv)
{
	unsigned int i;

	priv->tx_head = 0;
	priv->tx_tail = 0;
	priv->rx_head = 0;
	priv->rx_tail = 0;

	for (i = 0; i < EN7581_PCM_DESC_COUNT; i++) {
		priv->tx_desc[i].ctrl = 0;
		priv->tx_desc[i].irq = EN7581_PCM_DESC_IRQ;
		priv->tx_desc[i].addr = priv->tx_buf_dma +
					   i * EN7581_PCM_FRAME_BYTES;
		en7581_pcm_rx_submit(priv, i);
	}

	writel(priv->tx_desc_dma | EN7581_PCM_DESC_OWN,
	       priv->pcm_base + EN7581_PCM_TX_DESC_BASE);
	writel(priv->rx_desc_dma | EN7581_PCM_DESC_OWN,
	       priv->pcm_base + EN7581_PCM_RX_DESC_BASE);
	writel(EN7581_PCM_DESC_COUNT - 1,
	       priv->pcm_base + EN7581_PCM_RING_SIZE);
	writel(0xa0, priv->pcm_base + EN7581_PCM_RING_CTRL);

	writel(readl(priv->pcm_base + EN7581_PCM_DMA_CTRL) | GENMASK(1, 0),
	       priv->pcm_base + EN7581_PCM_DMA_CTRL);
	writel(1, priv->pcm_base + EN7581_PCM_RX_DOORBELL);
	priv->pcm_ready = true;

	return 0;
}

static void en7581_pcm_ring_stop(struct en7581_pcm_spi *priv)
{
	if (!priv->pcm_base)
		return;

	writel(readl(priv->pcm_base + EN7581_PCM_DMA_CTRL) & ~GENMASK(1, 0),
	       priv->pcm_base + EN7581_PCM_DMA_CTRL);
	priv->pcm_ready = false;
}

static void en7581_spi_prepare(struct en7581_pcm_spi *priv, bool read)
{
	u32 master = readl(priv->spi_base + EN7581_SPI_MASTER);
	u32 morebuf = readl(priv->spi_base + EN7581_SPI_MOREBUF);

	master &= EN7581_SPI_MASTER_KEEP_MASK;
	master |= EN7581_SPI_MASTER_BYTE_XFER;
	master &= ~EN7581_SPI_MASTER_CS;
	master |= FIELD_PREP(EN7581_SPI_MASTER_CS, priv->chip_select);

	morebuf &= EN7581_SPI_MOREBUF_KEEP_MASK;
	morebuf |= read ? EN7581_SPI_MOREBUF_RX_EN :
			 EN7581_SPI_MOREBUF_TX_EN;

	writel(master, priv->spi_base + EN7581_SPI_MASTER);
	writel(morebuf, priv->spi_base + EN7581_SPI_MOREBUF);
}

static int en7581_si3219x_read(struct en7581_pcm_spi *priv, u8 reg, u8 *val)
static int en7581_si3219x_read_ch(struct en7581_pcm_spi *priv,
				  unsigned int channel, u8 reg, u8 *val)
{
	u32 morebuf;
	int ret;

	en7581_spi_prepare(priv, false);

	ret = en7581_spi_clock_byte(priv, SI3219X_CTRL_READ_CH0 | channel,
				   true, NULL);
	if (ret)
		return ret;

	ret = en7581_spi_clock_byte(priv, reg, true, NULL);
	if (ret)
		return ret;

	morebuf = readl(priv->spi_base + EN7581_SPI_MOREBUF);
	morebuf &= EN7581_SPI_MOREBUF_KEEP_MASK;
	morebuf |= EN7581_SPI_MOREBUF_RX_EN;
	writel(morebuf, priv->spi_base + EN7581_SPI_MOREBUF);
	writel(0, priv->spi_base + EN7581_SPI_RX_DATA);

	return en7581_spi_clock_byte(priv, 0, false, val);
}

static int en7581_si3219x_read(struct en7581_pcm_spi *priv, u8 reg, u8 *val)
{
	return en7581_si3219x_read_ch(priv, 0, reg, val);
}

static int en7581_si3219x_write(struct en7581_pcm_spi *priv, u8 reg, u8 val)
static int en7581_si3219x_write_ch(struct en7581_pcm_spi *priv,
				   unsigned int channel, u8 reg, u8 val)
{
	int ret;

	en7581_spi_prepare(priv, false);

	ret = en7581_spi_clock_byte(priv, SI3219X_CTRL_WRITE_CH0 | channel,
				   true, NULL);
	if (ret)
		return ret;

	ret = en7581_spi_clock_byte(priv, reg, true, NULL);
	if (ret)
		return ret;

	return en7581_spi_clock_byte(priv, val, true, NULL);
}

static int en7581_si3219x_write(struct en7581_pcm_spi *priv, u8 reg, u8 val)
{
	return en7581_si3219x_write_ch(priv, 0, reg, val);
}

static const u16 en7581_pcm_tx_slot_regs[16] = {
	0x0004, 0x0008, 0x000c, 0x0010, 0x0048, 0x004c, 0x0050, 0x0054,
	0x0058, 0x005c, 0x0060, 0x0064, 0x0068, 0x006c, 0x0070, 0x0074,
};

static const u16 en7581_pcm_rx_slot_regs[16] = {
	0x0014, 0x0018, 0x001c, 0x0020, 0x0078, 0x007c, 0x0080, 0x0084,
	0x0088, 0x008c, 0x0090, 0x0094, 0x0098, 0x009c, 0x00a0, 0x00a4,
};

static int en7581_pcm_controller_init(struct en7581_pcm_spi *priv)
{
	unsigned int i;
	u32 val;

	val = readl(priv->pcm_base + EN7581_PCM_DMA_CTRL);
	writel(val & ~GENMASK(1, 0), priv->pcm_base + EN7581_PCM_DMA_CTRL);

	val = readl(priv->pcm_base + EN7581_PCM_RX_CFG);
	writel(val & ~BIT(26), priv->pcm_base + EN7581_PCM_RX_CFG);
	usleep_range(5000, 6000);

	val = readl(priv->pcm_base + EN7581_PCM_GLOBAL_CFG);
	val &= EN7581_PCM_GLOBAL_KEEP_MASK;
	val |= EN7581_PCM_GLOBAL_DEFAULT;
	writel(val, priv->pcm_base + EN7581_PCM_GLOBAL_CFG);
	writel(0x3, priv->pcm_base + EN7581_PCM_CLK_CTRL);

	for (i = 0; i < ARRAY_SIZE(en7581_pcm_tx_slot_regs); i++) {
		unsigned int offset = i * 8;

		val = FIELD_PREP(GENMASK(9, 0), offset) |
		      FIELD_PREP(GENMASK(25, 16), offset + 8) |
		      EN7581_PCM_SLOT_SAMPLE_EN | EN7581_PCM_SLOT_PAIR_EN;
		writel(val, priv->pcm_base + en7581_pcm_tx_slot_regs[i]);
		writel(val, priv->pcm_base + en7581_pcm_rx_slot_regs[i]);
	}

	return 0;
}

static int en7581_pcm_spi_hw_init(struct en7581_pcm_spi *priv)
{
	u32 val;
	int ret;

	ret = regmap_update_bits(priv->chip_scu, EN7581_CHIP_SCU_PCM_CLK,
				 EN7581_CHIP_SCU_PCM_CLK_MASK,
				 EN7581_CHIP_SCU_PCM_CLK_ISI);
	if (ret)
		return ret;

	ret = regmap_update_bits(priv->chip_scu, EN7581_CHIP_SCU_PCM_GPIO,
				 EN7581_CHIP_SCU_PCM_GPIO_MASK, 0);
	if (ret)
		return ret;

	ret = regmap_update_bits(priv->np_scu, EN7581_NP_SCU_PCM_MUX,
				 EN7581_NP_SCU_PCM_MUX_MASK,
				 EN7581_NP_SCU_PCM_MUX_MASK);
	if (ret)
		return ret;

	ret = en7581_pcm_controller_init(priv);
	if (ret)
		return ret;

	val = readl(priv->pcm_base + EN7581_PCM_SLIC_RESET);
	writel(val | EN7581_PCM_RESET_ISI,
	       priv->pcm_base + EN7581_PCM_SLIC_RESET);
	usleep_range(5000, 6000);
	writel(val & ~EN7581_PCM_RESET_ISI,
	       priv->pcm_base + EN7581_PCM_SLIC_RESET);
	usleep_range(5000, 6000);

	val = readl(priv->pcm_base + EN7581_PCM_SLIC_RESET);
	writel(val | EN7581_PCM_RESET_SLIC0,
	       priv->pcm_base + EN7581_PCM_SLIC_RESET);
	usleep_range(5000, 6000);
	writel(val & ~EN7581_PCM_RESET_SLIC0,
	       priv->pcm_base + EN7581_PCM_SLIC_RESET);
	usleep_range(5000, 6000);

	ret = en7581_spi_wait_idle(priv);
	if (ret)
		return ret;

	val = readl(priv->spi_base + EN7581_SPI_MASTER);
	val &= ~EN7581_SPI_MASTER_CS;
	val |= EN7581_SPI_MASTER_ISI;
	writel(val, priv->spi_base + EN7581_SPI_MASTER);

	return 0;
}

static int en7581_pcm_spi_parse_chip_select(struct en7581_pcm_spi *priv)
{
	u32 chip_select;
	int ret;

	ret = of_property_read_u32(priv->dev->of_node,
				 "airoha,spi-chip-select", &chip_select);
	if (ret == -EINVAL) {
		priv->chip_select = 0;
		return 0;
	}
	if (ret)
		return ret;
	if (chip_select > FIELD_MAX(EN7581_SPI_MASTER_CS))
		return -EINVAL;

	priv->chip_select = chip_select;

	return 0;
}

static int en7581_pcm_spi_identify(struct en7581_pcm_spi *priv)
{
	u8 id;
	int ret;

	mutex_lock(&priv->lock);
	ret = en7581_pcm_spi_hw_init(priv);
	if (!ret)
		ret = en7581_si3219x_read(priv, SI3219X_REG_ID, &id);
	if (!ret) {
		priv->reg0 = id;
		priv->identified = FIELD_GET(SI3219X_ID_PART, id) == SI32192_PART &&
				   FIELD_GET(SI3219X_ID_REV, id) == SI32192_REV;
	}
	mutex_unlock(&priv->lock);

	if (ret)
		return ret;

	if (!priv->identified)
		return -ENODEV;

	return 0;
}

static ssize_t identity_show(struct device *dev,
			     struct device_attribute *attr, char *buf)
{
	struct en7581_pcm_spi *priv = dev_get_drvdata(dev);

	if (!priv->identified)
		return sysfs_emit(buf, "unknown raw=0x%02x\n", priv->reg0);

	return sysfs_emit(buf, "si32192 revision=%u raw=0x%02x\n",
			  (unsigned int)FIELD_GET(SI3219X_ID_REV, priv->reg0),
			  priv->reg0);
}
static DEVICE_ATTR_RO(identity);

static ssize_t rescan_store(struct device *dev, struct device_attribute *attr,
			    const char *buf, size_t count)
{
	struct en7581_pcm_spi *priv = dev_get_drvdata(dev);
	bool rescan;
	int ret;

	ret = kstrtobool(buf, &rescan);
	if (ret)
		return ret;
	if (!rescan)
		return -EINVAL;

	ret = en7581_pcm_spi_identify(priv);
	if (ret)
		return ret;

	return count;
}
static DEVICE_ATTR_WO(rescan);

static ssize_t chip_select_show(struct device *dev,
				struct device_attribute *attr, char *buf)
{
	struct en7581_pcm_spi *priv = dev_get_drvdata(dev);

	return sysfs_emit(buf, "%u\n", priv->chip_select);
}
static DEVICE_ATTR_RO(chip_select);

static ssize_t raw_register_show(struct device *dev,
			     struct device_attribute *attr, char *buf)
{
	struct en7581_pcm_spi *priv = dev_get_drvdata(dev);
	u8 val = 0;
	int ret;

	mutex_lock(&priv->lock);
	ret = en7581_si3219x_read(priv, priv->debug_reg, &val);
	mutex_unlock(&priv->lock);
	if (ret)
		return ret;

	return sysfs_emit(buf, "0x%02x\n", val);
}

static ssize_t raw_register_store(struct device *dev,
			      struct device_attribute *attr,
			      const char *buf, size_t count)
{
	struct en7581_pcm_spi *priv = dev_get_drvdata(dev);
	unsigned int reg, val;
	int ret;

	ret = sscanf(buf, "%x %x", &reg, &val);
	if (ret != 2 || reg > 0xff || val > 0xff)
		return -EINVAL;

	mutex_lock(&priv->lock);
	ret = en7581_si3219x_write(priv, reg, val);
	if (!ret)
		priv->debug_reg = reg;
	mutex_unlock(&priv->lock);
	if (ret)
		return ret;

	return count;
}
static DEVICE_ATTR_RW(raw_register);

static ssize_t line_state_show(struct device *dev,
			       struct device_attribute *attr, char *buf)
{
	struct en7581_pcm_spi *priv = dev_get_drvdata(dev);
	u8 val0 = 0, val1 = 0;
	int ret;

	mutex_lock(&priv->lock);
	ret = en7581_si3219x_read_ch(priv, 0, SI3219X_REG_LINEFEED, &val0);
	if (!ret)
		ret = en7581_si3219x_read_ch(priv, 1, SI3219X_REG_LINEFEED,
					    &val1);
	mutex_unlock(&priv->lock);
	if (ret)
		return ret;

	return sysfs_emit(buf, "0:%u 1:%u\n",
			  val0 & SI3219X_LINEFEED_MASK,
			  val1 & SI3219X_LINEFEED_MASK);
}

static ssize_t line_state_store(struct device *dev,
				struct device_attribute *attr,
				const char *buf, size_t count)
{
	struct en7581_pcm_spi *priv = dev_get_drvdata(dev);
	unsigned int channel = 0, state;
	u8 ctrl, val;
	int ret;

	ret = sscanf(buf, "%u %u", &channel, &state);
	if (ret == 1) {
		state = channel;
		channel = 0;
	} else if (ret != 2) {
		return -EINVAL;
	}
	if (channel > 1 || state > SI3219X_LINEFEED_MASK)
		return -EINVAL;

	mutex_lock(&priv->lock);
	ret = en7581_si3219x_read_ch(priv, channel, SI3219X_REG_LINEFEED_CTRL,
				    &ctrl);
	if (ret)
		goto out;
	ret = en7581_si3219x_write_ch(priv, channel, SI3219X_REG_LINEFEED_CTRL,
				     ctrl & ~SI3219X_LINEFEED_CTRL_HOLD);
	if (ret)
		goto out;
	ret = en7581_si3219x_read_ch(priv, channel, SI3219X_REG_LINEFEED,
				    &val);
	if (ret)
		goto out;
	val = (val & ~SI3219X_LINEFEED_MASK) | state;
	ret = en7581_si3219x_write_ch(priv, channel, SI3219X_REG_LINEFEED, val);
	if (ret)
		goto out;
	ret = en7581_si3219x_write_ch(priv, channel, SI3219X_REG_LINEFEED_CTRL,
				     ctrl);
out:
	mutex_unlock(&priv->lock);
	if (ret)
		return ret;

	return count;
}
static DEVICE_ATTR_RW(line_state);

static ssize_t hook_state_show(struct device *dev,
			       struct device_attribute *attr, char *buf)
{
	struct en7581_pcm_spi *priv = dev_get_drvdata(dev);
	u8 val0 = 0, val1 = 0;
	int ret;

	mutex_lock(&priv->lock);
	ret = en7581_si3219x_read_ch(priv, 0, SI3219X_REG_HOOK_STATUS, &val0);
	if (!ret)
		ret = en7581_si3219x_read_ch(priv, 1, SI3219X_REG_HOOK_STATUS,
					    &val1);
	mutex_unlock(&priv->lock);
	if (ret)
		return ret;

	return sysfs_emit(buf, "0:%u 1:%u\n",
			  !!(val0 & SI3219X_HOOK_OFFHOOK),
			  !!(val1 & SI3219X_HOOK_OFFHOOK));
}
static DEVICE_ATTR_RO(hook_state);

static ssize_t pcm_register_show(struct device *dev,
				 struct device_attribute *attr, char *buf)
{
	struct en7581_pcm_spi *priv = dev_get_drvdata(dev);
	unsigned int reg = priv->pcm_debug_reg & ~GENMASK(1, 0);
	u32 val;

	if (reg >= 0x5000)
		return -EINVAL;

	mutex_lock(&priv->lock);
	val = readl(priv->pcm_base + reg);
	mutex_unlock(&priv->lock);

	return sysfs_emit(buf, "0x%08x\n", val);
}

static ssize_t pcm_register_store(struct device *dev,
				  struct device_attribute *attr,
				  const char *buf, size_t count)
{
	struct en7581_pcm_spi *priv = dev_get_drvdata(dev);
	unsigned int reg, val;
	int ret;

	ret = sscanf(buf, "%x %x", &reg, &val);
	if (ret != 2 || reg >= 0x5000 || reg & GENMASK(1, 0))
		return -EINVAL;

	mutex_lock(&priv->lock);
	writel(val, priv->pcm_base + reg);
	priv->pcm_debug_reg = reg;
	mutex_unlock(&priv->lock);

	return count;
}
static DEVICE_ATTR_RW(pcm_register);

static struct attribute *en7581_pcm_spi_attrs[] = {
	&dev_attr_identity.attr,
	&dev_attr_rescan.attr,
	&dev_attr_chip_select.attr,
	&dev_attr_raw_register.attr,
	&dev_attr_line_state.attr,
	&dev_attr_hook_state.attr,
	&dev_attr_pcm_register.attr,
	NULL,
};
ATTRIBUTE_GROUPS(en7581_pcm_spi);

static ssize_t en7581_pcm_write(struct en7581_pcm_spi *priv,
				const char __user *buf)
{
	struct en7581_pcm_desc *desc;
	unsigned int slot;

	mutex_lock(&priv->lock);
	if (!priv->pcm_ready) {
		mutex_unlock(&priv->lock);
		return -ENODEV;
	}

	slot = priv->tx_tail;
	desc = &priv->tx_desc[slot];
	if (desc->ctrl & EN7581_PCM_DESC_OWN) {
		mutex_unlock(&priv->lock);
		return -EAGAIN;
	}

	if (copy_from_user(priv->tx_buf + slot * EN7581_PCM_FRAME_BYTES,
			   buf, EN7581_PCM_FRAME_BYTES)) {
		mutex_unlock(&priv->lock);
		return -EFAULT;
	}

	desc->addr = priv->tx_buf_dma + slot * EN7581_PCM_FRAME_BYTES;
	desc->irq = EN7581_PCM_DESC_IRQ;
	desc->ctrl = EN7581_PCM_FRAME_BYTES | EN7581_PCM_DESC_OWN;
	dma_wmb();
	writel(1, priv->pcm_base + EN7581_PCM_TX_DOORBELL);
	priv->tx_tail = (slot + 1) % EN7581_PCM_DESC_COUNT;
	mutex_unlock(&priv->lock);

	return EN7581_PCM_FRAME_BYTES;
}

static ssize_t en7581_pcm_read(struct en7581_pcm_spi *priv, char __user *buf)
{
	struct en7581_pcm_desc *desc;
	unsigned int slot;

	mutex_lock(&priv->lock);
	if (!priv->pcm_ready) {
		mutex_unlock(&priv->lock);
		return -ENODEV;
	}

	slot = priv->rx_head;
	desc = &priv->rx_desc[slot];
	if (desc->ctrl & EN7581_PCM_DESC_OWN) {
		mutex_unlock(&priv->lock);
		return -EAGAIN;
	}

	if (copy_to_user(buf, priv->rx_buf + slot * EN7581_PCM_FRAME_BYTES,
			 EN7581_PCM_FRAME_BYTES)) {
		mutex_unlock(&priv->lock);
		return -EFAULT;
	}

	en7581_pcm_rx_submit(priv, slot);
	writel(1, priv->pcm_base + EN7581_PCM_RX_DOORBELL);
	priv->rx_head = (slot + 1) % EN7581_PCM_DESC_COUNT;
	mutex_unlock(&priv->lock);

	return EN7581_PCM_FRAME_BYTES;
}

static int en7581_pcm_open(struct inode *inode, struct file *file)
{
	struct miscdevice *misc = file->private_data;
	struct en7581_pcm_spi *priv = container_of(misc, struct en7581_pcm_spi,
						 misc);

	if (!priv->pcm_ready)
		return -ENODEV;

	return 0;
}

static ssize_t en7581_pcm_read_user(struct file *file, char __user *buf,
				    size_t count, loff_t *ppos)
{
	struct miscdevice *misc = file->private_data;
	struct en7581_pcm_spi *priv = container_of(misc, struct en7581_pcm_spi,
						 misc);
	unsigned int retries = 100;
	ssize_t ret;

	if (count < EN7581_PCM_FRAME_BYTES)
		return -EINVAL;

	while (retries--) {
		ret = en7581_pcm_read(priv, buf);
		if (ret != -EAGAIN)
			return ret;
		if (file->f_flags & O_NONBLOCK)
			return -EAGAIN;
		usleep_range(10000, 11000);
	}

	return -EAGAIN;
}

static ssize_t en7581_pcm_write_user(struct file *file,
				     const char __user *buf, size_t count,
				     loff_t *ppos)
{
	struct miscdevice *misc = file->private_data;
	struct en7581_pcm_spi *priv = container_of(misc, struct en7581_pcm_spi,
						 misc);
	unsigned int retries = 100;
	ssize_t ret;

	if (count < EN7581_PCM_FRAME_BYTES)
		return -EINVAL;

	while (retries--) {
		ret = en7581_pcm_write(priv, buf);
		if (ret != -EAGAIN)
			return ret;
		if (file->f_flags & O_NONBLOCK)
			return -EAGAIN;
		usleep_range(10000, 11000);
	}

	return -EAGAIN;
}

static const struct file_operations en7581_pcm_fops = {
	.owner = THIS_MODULE,
	.open = en7581_pcm_open,
	.read = en7581_pcm_read_user,
	.write = en7581_pcm_write_user,
};

static int en7581_pcm_misc_register(struct en7581_pcm_spi *priv)
{
	priv->misc.minor = MISC_DYNAMIC_MINOR;
	priv->misc.name = "pcm1";
	priv->misc.fops = &en7581_pcm_fops;
	priv->misc.parent = priv->dev;

	return misc_register(&priv->misc);
}

static void en7581_pcm_misc_unregister(struct en7581_pcm_spi *priv)
{
	if (priv->misc.this_device)
		misc_deregister(&priv->misc);
}

static int en7581_pcm_spi_probe(struct platform_device *pdev)
{
	struct device *dev = &pdev->dev;
	struct en7581_pcm_spi *priv;
	int ret;

	priv = devm_kzalloc(dev, sizeof(*priv), GFP_KERNEL);
	if (!priv)
		return -ENOMEM;

	priv->dev = dev;
	mutex_init(&priv->lock);
	platform_set_drvdata(pdev, priv);

	priv->spi_base = devm_platform_ioremap_resource_byname(pdev, "spi");
	if (IS_ERR(priv->spi_base))
		return PTR_ERR(priv->spi_base);

	priv->pcm_base = devm_platform_ioremap_resource_byname(pdev, "pcm");
	if (IS_ERR(priv->pcm_base))
		return PTR_ERR(priv->pcm_base);

	priv->chip_scu = syscon_regmap_lookup_by_phandle(dev->of_node,
							 "airoha,chip-scu");
	if (IS_ERR(priv->chip_scu))
		return dev_err_probe(dev, PTR_ERR(priv->chip_scu),
				     "failed to get chip SCU\n");

	priv->np_scu = syscon_regmap_lookup_by_phandle(dev->of_node,
						       "airoha,np-scu");
	if (IS_ERR(priv->np_scu))
		return dev_err_probe(dev, PTR_ERR(priv->np_scu),
				     "failed to get NP SCU\n");

	ret = en7581_pcm_spi_parse_chip_select(priv);
	if (ret)
		return dev_err_probe(dev, ret, "invalid SPI chip select\n");

	ret = en7581_pcm_spi_identify(priv);
	if (ret)
		return dev_err_probe(dev, ret,
				     "Si32192 identity probe failed (reg0=0x%02x)\n",
				     priv->reg0);

	ret = en7581_pcm_ring_alloc(priv);
	if (ret)
		return dev_err_probe(dev, ret, "failed to allocate PCM DMA ring\n");

	ret = en7581_pcm_ring_init(priv);
	if (ret)
		goto err_ring_free;

	ret = en7581_pcm_misc_register(priv);
	if (ret)
		goto err_ring_stop;

	dev_info(dev, "Si32192 detected, revision %u cs=%u (reg0=0x%02x)\n",
		 priv->chip_select,
		 (unsigned int)FIELD_GET(SI3219X_ID_REV, priv->reg0),
		 priv->reg0);

	return 0;

err_ring_stop:
	en7581_pcm_ring_stop(priv);
err_ring_free:
	en7581_pcm_ring_free(priv);
	return ret;
}

static void en7581_pcm_spi_remove(struct platform_device *pdev)
{
	struct en7581_pcm_spi *priv = platform_get_drvdata(pdev);

	en7581_pcm_misc_unregister(priv);
	en7581_pcm_ring_stop(priv);
	en7581_pcm_ring_free(priv);
}

static const struct of_device_id en7581_pcm_spi_of_match[] = {
	{ .compatible = "airoha,en7581-pcm-spi-si32192" },
	{ }
};
MODULE_DEVICE_TABLE(of, en7581_pcm_spi_of_match);

static struct platform_driver en7581_pcm_spi_driver = {
	.probe = en7581_pcm_spi_probe,
	.remove = en7581_pcm_spi_remove,
	.driver = {
		.name = "airoha-en7581-pcm-spi",
		.of_match_table = en7581_pcm_spi_of_match,
		.dev_groups = en7581_pcm_spi_groups,
	},
};
module_platform_driver(en7581_pcm_spi_driver);

MODULE_DESCRIPTION("Airoha EN7581 PCM-SPI Si32192 control transport");
MODULE_LICENSE("GPL");
