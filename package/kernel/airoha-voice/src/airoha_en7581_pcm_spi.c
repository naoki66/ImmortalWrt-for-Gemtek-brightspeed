// SPDX-License-Identifier: GPL-2.0-only
/*
 * Minimal EN7581 PCM-SPI control transport for the XG2010G Si32192.
 *
 * The register sequence is limited to behavior verified from the EN7581 SDK
 * resource tables and the stock Linux 5.4.55 pcm1/spi modules.  ProSLIC
 * patching, line power, ringing and PCM streaming intentionally stay out of
 * this driver until their data and control contracts are independently
 * verified.
 */

#include <linux/bitfield.h>
#include <linux/delay.h>
#include <linux/device.h>
#include <linux/iopoll.h>
#include <linux/io.h>
#include <linux/mfd/syscon.h>
#include <linux/module.h>
#include <linux/mutex.h>
#include <linux/of.h>
#include <linux/platform_device.h>
#include <linux/regmap.h>

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

#define EN7581_CHIP_SCU_PCM_CLK		0x0218
#define EN7581_CHIP_SCU_PCM_CLK_MASK	0x003f3300
#define EN7581_CHIP_SCU_PCM_CLK_ISI	0x00100000
#define EN7581_CHIP_SCU_PCM_GPIO	0x01d0
#define EN7581_CHIP_SCU_PCM_GPIO_MASK	0x00000c00
#define EN7581_NP_SCU_PCM_MUX		0x0094
#define EN7581_NP_SCU_PCM_MUX_MASK	GENMASK(3, 0)

#define SI3219X_CTRL_READ_CH0		0x60
#define SI3219X_REG_ID			0x00
#define SI3219X_ID_REV			GENMASK(2, 0)
#define SI3219X_ID_PART			GENMASK(5, 3)
#define SI32192_PART			5
#define SI32192_REV			2

struct en7581_pcm_spi {
	struct device *dev;
	void __iomem *spi_base;
	void __iomem *pcm_base;
	struct regmap *chip_scu;
	struct regmap *np_scu;
	struct mutex lock;
	u8 reg0;
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

static void en7581_spi_prepare(struct en7581_pcm_spi *priv, bool read)
{
	u32 master = readl(priv->spi_base + EN7581_SPI_MASTER);
	u32 morebuf = readl(priv->spi_base + EN7581_SPI_MOREBUF);

	master &= EN7581_SPI_MASTER_KEEP_MASK;
	master |= EN7581_SPI_MASTER_BYTE_XFER;
	master &= ~EN7581_SPI_MASTER_CS;

	morebuf &= EN7581_SPI_MOREBUF_KEEP_MASK;
	morebuf |= read ? EN7581_SPI_MOREBUF_RX_EN :
			 EN7581_SPI_MOREBUF_TX_EN;

	writel(master, priv->spi_base + EN7581_SPI_MASTER);
	writel(morebuf, priv->spi_base + EN7581_SPI_MOREBUF);
}

static int en7581_si3219x_read(struct en7581_pcm_spi *priv, u8 reg, u8 *val)
{
	u32 morebuf;
	int ret;

	en7581_spi_prepare(priv, false);

	ret = en7581_spi_clock_byte(priv, SI3219X_CTRL_READ_CH0, true, NULL);
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

	val = readl(priv->pcm_base + EN7581_PCM_SLIC_RESET);
	writel(val | EN7581_PCM_RESET_ISI,
	       priv->pcm_base + EN7581_PCM_SLIC_RESET);
	msleep(5);
	writel(val & ~EN7581_PCM_RESET_ISI,
	       priv->pcm_base + EN7581_PCM_SLIC_RESET);
	msleep(5);

	val = readl(priv->pcm_base + EN7581_PCM_SLIC_RESET);
	writel(val | EN7581_PCM_RESET_SLIC0,
	       priv->pcm_base + EN7581_PCM_SLIC_RESET);
	msleep(5);
	writel(val & ~EN7581_PCM_RESET_SLIC0,
	       priv->pcm_base + EN7581_PCM_SLIC_RESET);
	msleep(5);

	ret = en7581_spi_wait_idle(priv);
	if (ret)
		return ret;

	val = readl(priv->spi_base + EN7581_SPI_MASTER);
	val &= ~EN7581_SPI_MASTER_CS;
	val |= EN7581_SPI_MASTER_ISI;
	writel(val, priv->spi_base + EN7581_SPI_MASTER);

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

static struct attribute *en7581_pcm_spi_attrs[] = {
	&dev_attr_identity.attr,
	&dev_attr_rescan.attr,
	NULL,
};
ATTRIBUTE_GROUPS(en7581_pcm_spi);

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

	ret = en7581_pcm_spi_identify(priv);
	if (ret)
		return dev_err_probe(dev, ret,
				     "Si32192 identity probe failed (reg0=0x%02x)\n",
				     priv->reg0);

	dev_info(dev, "Si32192 detected, revision %u (reg0=0x%02x)\n",
		 (unsigned int)FIELD_GET(SI3219X_ID_REV, priv->reg0),
		 priv->reg0);

	return 0;
}

static const struct of_device_id en7581_pcm_spi_of_match[] = {
	{ .compatible = "airoha,en7581-pcm-spi-si32192" },
	{ }
};
MODULE_DEVICE_TABLE(of, en7581_pcm_spi_of_match);

static struct platform_driver en7581_pcm_spi_driver = {
	.probe = en7581_pcm_spi_probe,
	.driver = {
		.name = "airoha-en7581-pcm-spi",
		.of_match_table = en7581_pcm_spi_of_match,
		.dev_groups = en7581_pcm_spi_groups,
	},
};
module_platform_driver(en7581_pcm_spi_driver);

MODULE_DESCRIPTION("Airoha EN7581 PCM-SPI Si32192 control transport");
MODULE_LICENSE("GPL");
