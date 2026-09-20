// SPDX-License-Identifier: GPL-2.0-only

#include <linux/bitops.h>
#include <linux/errno.h>
#include <linux/io.h>
#include <linux/kernel.h>
#include <linux/module.h>
#include <linux/of.h>
#include <linux/platform_device.h>
#include <linux/ptp_clock_kernel.h>
#include <linux/time64.h>

#define AIROHA_TOD_CTRL               0x00
#define AIROHA_TOD_NEW_SEC_H16        0x04
#define AIROHA_TOD_NEW_SEC_L32        0x08
#define AIROHA_TOD_NEW_NSEC32         0x0c
#define AIROHA_TOD_OFFSET_SEC_H16    0x10
#define AIROHA_TOD_OFFSET_SEC_L32    0x14
#define AIROHA_TOD_OFFSET_NSEC       0x18
#define AIROHA_TOD_CUR_SEC_H16       0x54
#define AIROHA_TOD_CUR_SEC_L32       0x58
#define AIROHA_TOD_CUR_NSEC32        0x5c
#define AIROHA_TOD_INT_STATUS        0x64

#define AIROHA_TOD_CTRL_LOAD_NEW     BIT(0)
#define AIROHA_TOD_CTRL_ADJ_OFFSET   BIT(8)
#define AIROHA_TOD_OFFSET_NEGATIVE   BIT(31)
#define AIROHA_TOD_SEC_H16_MASK      GENMASK(15, 0)
#define AIROHA_TOD_SEC_MASK          GENMASK_ULL(47, 0)

struct airoha_tod {
	void __iomem *base;
	struct ptp_clock *clock;
	struct ptp_clock_info info;
};

static int airoha_tod_gettime64(struct ptp_clock_info *info,
				struct timespec64 *ts)
{
	struct airoha_tod *tod = container_of(info, struct airoha_tod, info);
	u32 sec_hi = 0, sec_lo = 0, nsec = 0, sec_hi_after;
	u64 sec = 0;
	int retry;

	/* The SDK exposes a split 48-bit seconds counter without a latch. */
	for (retry = 0; retry < 5; retry++) {
		sec_hi = readl(tod->base + AIROHA_TOD_CUR_SEC_H16) &
			AIROHA_TOD_SEC_H16_MASK;
		sec_lo = readl(tod->base + AIROHA_TOD_CUR_SEC_L32);
		nsec = readl(tod->base + AIROHA_TOD_CUR_NSEC32);
		sec_hi_after = readl(tod->base + AIROHA_TOD_CUR_SEC_H16) &
			AIROHA_TOD_SEC_H16_MASK;
		if (sec_hi == sec_hi_after)
			break;
	}

	if (retry == 5)
		return -EAGAIN;

	sec = ((u64)sec_hi << 32) | sec_lo;
	if (nsec >= NSEC_PER_SEC) {
		sec += nsec / NSEC_PER_SEC;
		nsec %= NSEC_PER_SEC;
	}

	ts->tv_sec = sec;
	ts->tv_nsec = nsec;
	return 0;
}

static int airoha_tod_settime64(struct ptp_clock_info *info,
				const struct timespec64 *ts)
{
	struct airoha_tod *tod = container_of(info, struct airoha_tod, info);
	u32 ctrl;

	if (ts->tv_sec < 0 || ts->tv_nsec < 0 ||
	    ts->tv_nsec >= NSEC_PER_SEC ||
	    (u64)ts->tv_sec > AIROHA_TOD_SEC_MASK)
		return -EINVAL;

	writel((u32)((u64)ts->tv_sec >> 32) & AIROHA_TOD_SEC_H16_MASK,
	       tod->base + AIROHA_TOD_NEW_SEC_H16);
	writel((u32)ts->tv_sec, tod->base + AIROHA_TOD_NEW_SEC_L32);
	writel(ts->tv_nsec, tod->base + AIROHA_TOD_NEW_NSEC32);

	/* Matches the SDK set_timestamp_to_tod() load sequence. */
	ctrl = readl(tod->base + AIROHA_TOD_CTRL);
	writel(ctrl | AIROHA_TOD_CTRL_LOAD_NEW, tod->base + AIROHA_TOD_CTRL);

	return 0;
}

static int airoha_tod_adjtime(struct ptp_clock_info *info, s64 delta)
{
	struct airoha_tod *tod = container_of(info, struct airoha_tod, info);
	u64 magnitude, sec;
	u32 nsec, ctrl, sec_hi;
	bool negative;

	negative = delta < 0;
	if (negative)
		magnitude = (u64)(-(delta + 1)) + 1;
	else
		magnitude = (u64)delta;

	sec = div_u64_rem(magnitude, NSEC_PER_SEC, &nsec);
	if (sec > AIROHA_TOD_SEC_MASK)
		return -ERANGE;

	sec_hi = (u32)(sec >> 32) & AIROHA_TOD_SEC_H16_MASK;
	if (negative)
		sec_hi |= AIROHA_TOD_OFFSET_NEGATIVE;

	writel(sec_hi, tod->base + AIROHA_TOD_OFFSET_SEC_H16);
	writel((u32)sec, tod->base + AIROHA_TOD_OFFSET_SEC_L32);
	writel(nsec, tod->base + AIROHA_TOD_OFFSET_NSEC);

	/* SDK set_offset_via_tod() applies the programmed signed offset here. */
	ctrl = readl(tod->base + AIROHA_TOD_CTRL);
	writel(ctrl | AIROHA_TOD_CTRL_ADJ_OFFSET,
	       tod->base + AIROHA_TOD_CTRL);

	return 0;
}

static int airoha_tod_adjfine(struct ptp_clock_info *info, long scaled_ppm)
{
	/* FREQ_ADJ_* scaling is vendor-defined and not safe to infer. */
	return -EOPNOTSUPP;
}

static int airoha_tod_enable(struct ptp_clock_info *info,
				struct ptp_clock_request *request, int on)
{
	return -EOPNOTSUPP;
}

static irqreturn_t airoha_tod_irq(int irq, void *data)
{
	struct airoha_tod *tod = data;
	u32 status;

	status = readl(tod->base + AIROHA_TOD_INT_STATUS);
	if (!status)
		return IRQ_NONE;

	/* Status bits are write-one-to-clear in the SDK driver. */
	writel(status, tod->base + AIROHA_TOD_INT_STATUS);
	return IRQ_HANDLED;
}

static int airoha_tod_probe(struct platform_device *pdev)
{
	struct airoha_tod *tod;
	int irq;

	tod = devm_kzalloc(&pdev->dev, sizeof(*tod), GFP_KERNEL);
	if (!tod)
		return -ENOMEM;

	tod->base = devm_platform_ioremap_resource(pdev, 0);
	if (IS_ERR(tod->base))
		return PTR_ERR(tod->base);

	irq = platform_get_irq_optional(pdev, 0);
	if (irq == -EPROBE_DEFER)
		return irq;
	if (irq > 0) {
		int ret = devm_request_irq(&pdev->dev, irq, airoha_tod_irq,
					   0, dev_name(&pdev->dev), tod);
		if (ret)
			return ret;
	}

	tod->info = (struct ptp_clock_info) {
		.owner = THIS_MODULE,
		.name = "airoha-tod",
		.max_adj = 0,
		.n_alarm = 0,
		.n_ext_ts = 0,
		.n_per_out = 0,
		.n_pins = 0,
		.pps = 0,
		.gettime64 = airoha_tod_gettime64,
		.settime64 = airoha_tod_settime64,
		.adjtime = airoha_tod_adjtime,
		.adjfine = airoha_tod_adjfine,
		.enable = airoha_tod_enable,
	};

	tod->clock = ptp_clock_register(&tod->info, &pdev->dev);
	if (IS_ERR(tod->clock))
		return PTR_ERR(tod->clock);

	platform_set_drvdata(pdev, tod);
	dev_info(&pdev->dev, "registered Airoha ToD PHC\n");
	return 0;
}

static void airoha_tod_remove(struct platform_device *pdev)
{
	struct airoha_tod *tod = platform_get_drvdata(pdev);

	ptp_clock_unregister(tod->clock);
}

static const struct of_device_id airoha_tod_of_match[] = {
	{ .compatible = "econet,ecnt-tod" },
	{ }
};
MODULE_DEVICE_TABLE(of, airoha_tod_of_match);

static struct platform_driver airoha_tod_driver = {
	.probe = airoha_tod_probe,
	.remove = airoha_tod_remove,
	.driver = {
		.name = "airoha-tod",
		.of_match_table = airoha_tod_of_match,
	},
};
module_platform_driver(airoha_tod_driver);

MODULE_DESCRIPTION("Airoha EN7581 ToD PTP hardware clock");
MODULE_LICENSE("GPL");
