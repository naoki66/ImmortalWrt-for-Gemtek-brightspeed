// SPDX-License-Identifier: GPL-2.0-only
/*
 * Airoha SIF-compatible I2C host controller.
 *
 * The vendor xPON stack exposes SIF_X_Read/SIF_X_Write through the Linux
 * I2C adapter API. Keep the controller as a small standalone module so the
 * XR1710G sensor path and the XG2010G EN7572 path share one provider.
 */

#include <linux/clk.h>
#include <linux/delay.h>
#include <linux/i2c.h>
#include <linux/io.h>
#include <linux/iopoll.h>
#include <linux/module.h>
#include <linux/of.h>
#include <linux/platform_device.h>

#define REG_SIFMCTL0_REG            0x40
#define REG_SIFMCTL1_REG            0x44
#define REG_SIFMD0_REG              0x50
#define REG_SIFMD1_REG              0x54

#define SM0CTL0_CLK_DIV_MASK        (0xfff << 16)
#define SM0CTL0_CLK_DIV_MAX         0xfff
#define SM0CTL0_EN                  BIT(1)
#define SM0CTL0_SCL_STRETCH         BIT(0)

#define SM0CTL1_ACK_MASK            (0xff << 16)
#define SM0CTL1_PGLEN_MASK          (0x7 << 8)
#define SM0CTL1_PGLEN(x)            ((((x) - 1) << 8) & SM0CTL1_PGLEN_MASK)
#define SM0CTL1_READ                (5 << 4)
#define SM0CTL1_READ_LAST           (4 << 4)
#define SM0CTL1_STOP               (3 << 4)
#define SM0CTL1_WRITE              (2 << 4)
#define SM0CTL1_START              (1 << 4)
#define SM0CTL1_TRI                BIT(0)

#define TIMEOUT_MS                  1000
#define SYS_CLOCK                   20000000
#define I2C_MAX_STANDARD_MODE_FREQ 100000

struct airoha_i2c {
	void __iomem *base;
	struct device *dev;
	struct i2c_adapter adap;
	u32 clk_div;
};

static int airoha_i2c_wait_idle(struct airoha_i2c *i2c)
{
	u32 val;

	return readl_relaxed_poll_timeout_atomic(i2c->base + REG_SIFMCTL1_REG,
						 val, !(val & SM0CTL1_TRI), 10,
						 TIMEOUT_MS * 1000);
}

static void airoha_i2c_reset(struct airoha_i2c *i2c)
{
	iowrite32(((i2c->clk_div << 16) & SM0CTL0_CLK_DIV_MASK) |
		  SM0CTL0_EN | SM0CTL0_SCL_STRETCH,
		  i2c->base + REG_SIFMCTL0_REG);
}

static void airoha_i2c_dump_reg(struct airoha_i2c *i2c)
{
	dev_dbg(i2c->dev,
		"SIFMCTL0 %08x, SIFMCTL1 %08x, SIFMD0 %08x, SIFMD1 %08x\n",
		ioread32(i2c->base + REG_SIFMCTL0_REG),
		ioread32(i2c->base + REG_SIFMCTL1_REG),
		ioread32(i2c->base + REG_SIFMD0_REG),
		ioread32(i2c->base + REG_SIFMD1_REG));
}

static int airoha_i2c_check_ack(struct airoha_i2c *i2c, u32 expected)
{
	u32 ack = readl_relaxed(i2c->base + REG_SIFMCTL1_REG);
	u32 ack_expected = (expected << 16) & SM0CTL1_ACK_MASK;

	return ((ack & ack_expected) == ack_expected) ? 0 : -ENXIO;
}

static int airoha_i2c_master_start(struct airoha_i2c *i2c)
{
	iowrite32(SM0CTL1_START | SM0CTL1_TRI,
		  i2c->base + REG_SIFMCTL1_REG);
	return airoha_i2c_wait_idle(i2c);
}

static int airoha_i2c_master_stop(struct airoha_i2c *i2c)
{
	iowrite32(SM0CTL1_STOP | SM0CTL1_TRI,
		  i2c->base + REG_SIFMCTL1_REG);
	return airoha_i2c_wait_idle(i2c);
}

static int airoha_i2c_master_cmd(struct airoha_i2c *i2c, u32 cmd,
				 int page_len)
{
	iowrite32(cmd | SM0CTL1_TRI | SM0CTL1_PGLEN(page_len),
		  i2c->base + REG_SIFMCTL1_REG);
	return airoha_i2c_wait_idle(i2c);
}

static int airoha_i2c_master_xfer(struct i2c_adapter *adap,
					 struct i2c_msg *msgs, int num)
{
	struct airoha_i2c *i2c = i2c_get_adapdata(adap);
	struct i2c_msg *pmsg;
	u16 addr;
	int i, j, ret, len, page_len;
	u32 cmd;
	u32 data[2];
	u32 reg;

	if (i2c->clk_div > SM0CTL0_CLK_DIV_MAX)
		i2c->clk_div = SM0CTL0_CLK_DIV_MAX;

	reg = ioread32(i2c->base + REG_SIFMCTL0_REG) &
		~SM0CTL0_CLK_DIV_MASK;
	iowrite32(((i2c->clk_div << 16) & SM0CTL0_CLK_DIV_MASK) | reg,
		  i2c->base + REG_SIFMCTL0_REG);

	for (i = 0; i < num; i++) {
		pmsg = &msgs[i];

		ret = airoha_i2c_wait_idle(i2c);
		if (ret)
			goto err_timeout;

		ret = airoha_i2c_master_start(i2c);
		if (ret)
			goto err_timeout;

		if (pmsg->flags & I2C_M_TEN) {
			addr = 0xf0 | ((pmsg->addr >> 7) & 0x06);
			addr |= (pmsg->addr & 0xff) << 8;
			if (pmsg->flags & I2C_M_RD)
				addr |= 1;
			iowrite32(addr, i2c->base + REG_SIFMD0_REG);
			ret = airoha_i2c_master_cmd(i2c, SM0CTL1_WRITE, 2);
		} else {
			addr = i2c_8bit_addr_from_msg(pmsg);
			iowrite32(addr, i2c->base + REG_SIFMD0_REG);
			ret = airoha_i2c_master_cmd(i2c, SM0CTL1_WRITE, 1);
		}
		if (ret)
			goto err_timeout;

		if (!(pmsg->flags & I2C_M_IGNORE_NAK)) {
			ret = airoha_i2c_check_ack(i2c, BIT(0));
			if (ret)
				goto err_ack;
		}

		for (len = pmsg->len, j = 0; len > 0; len -= 8, j += 8) {
			page_len = min(len, 8);

			if (pmsg->flags & I2C_M_RD) {
				cmd = len > 8 ? SM0CTL1_READ : SM0CTL1_READ_LAST;
			} else {
				memcpy(data, &pmsg->buf[j], page_len);
				iowrite32(data[0], i2c->base + REG_SIFMD0_REG);
				iowrite32(data[1], i2c->base + REG_SIFMD1_REG);
				cmd = SM0CTL1_WRITE;
			}

			ret = airoha_i2c_master_cmd(i2c, cmd, page_len);
			if (ret)
				goto err_timeout;

			if (pmsg->flags & I2C_M_RD) {
				data[0] = ioread32(i2c->base + REG_SIFMD0_REG);
				data[1] = ioread32(i2c->base + REG_SIFMD1_REG);
				memcpy(&pmsg->buf[j], data, page_len);
			} else if (!(pmsg->flags & I2C_M_IGNORE_NAK)) {
				ret = airoha_i2c_check_ack(i2c, (1 << page_len) - 1);
				if (ret)
					goto err_ack;
			}
		}
	}

	ret = airoha_i2c_master_stop(i2c);
	if (ret)
		goto err_timeout;

	return i;

err_ack:
	if (!airoha_i2c_master_stop(i2c))
		return -ENXIO;

err_timeout:
	airoha_i2c_dump_reg(i2c);
	airoha_i2c_reset(i2c);
	return ret;
}

static u32 airoha_i2c_func(struct i2c_adapter *adap)
{
	return I2C_FUNC_I2C | I2C_FUNC_SMBUS_EMUL |
	       I2C_FUNC_PROTOCOL_MANGLING;
}

static const struct i2c_algorithm airoha_i2c_algo = {
	.master_xfer = airoha_i2c_master_xfer,
	.functionality = airoha_i2c_func,
};

static const struct of_device_id airoha_i2c_dt_ids[] = {
	{ .compatible = "airoha,airoha-i2c" },
	{ }
};
MODULE_DEVICE_TABLE(of, airoha_i2c_dt_ids);

static int airoha_i2c_probe(struct platform_device *pdev)
{
	struct airoha_i2c *i2c;
	struct i2c_adapter *adap;
	struct resource *res;
	u32 bus_freq;
	int ret;

	i2c = devm_kzalloc(&pdev->dev, sizeof(*i2c), GFP_KERNEL);
	if (!i2c)
		return -ENOMEM;

	res = platform_get_resource(pdev, IORESOURCE_MEM, 0);
	i2c->base = devm_ioremap_resource(&pdev->dev, res);
	if (IS_ERR(i2c->base))
		return PTR_ERR(i2c->base);

	i2c->dev = &pdev->dev;
	if (of_property_read_u32(pdev->dev.of_node, "clock-frequency",
				 &bus_freq))
		bus_freq = I2C_MAX_STANDARD_MODE_FREQ;
	if (!bus_freq)
		bus_freq = I2C_MAX_STANDARD_MODE_FREQ;

	i2c->clk_div = SYS_CLOCK / bus_freq - 1;
	if (i2c->clk_div > SM0CTL0_CLK_DIV_MAX)
		i2c->clk_div = SM0CTL0_CLK_DIV_MAX;
	airoha_i2c_reset(i2c);

	adap = &i2c->adap;
	adap->owner = THIS_MODULE;
	adap->algo = &airoha_i2c_algo;
	adap->retries = 3;
	adap->dev.parent = &pdev->dev;
	adap->dev.of_node = pdev->dev.of_node;
	i2c_set_adapdata(adap, i2c);
	strscpy(adap->name, dev_name(&pdev->dev), sizeof(adap->name));

	platform_set_drvdata(pdev, i2c);
	ret = i2c_add_adapter(adap);
	if (ret)
		return ret;

	dev_info(&pdev->dev, "Airoha SIF I2C registered at %u kHz\n",
		 bus_freq / 1000);
	return 0;
}

static void airoha_i2c_remove(struct platform_device *pdev)
{
	struct airoha_i2c *i2c = platform_get_drvdata(pdev);

	i2c_del_adapter(&i2c->adap);
}

static struct platform_driver airoha_i2c_driver = {
	.probe = airoha_i2c_probe,
	.remove = airoha_i2c_remove,
	.driver = {
		.name = "airoha-i2c",
		.of_match_table = airoha_i2c_dt_ids,
	},
};

module_platform_driver(airoha_i2c_driver);

MODULE_AUTHOR("Airoha");
MODULE_DESCRIPTION("Airoha SIF-compatible I2C host controller");
MODULE_LICENSE("GPL v2");
