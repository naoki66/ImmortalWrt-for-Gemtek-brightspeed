// SPDX-License-Identifier: GPL-2.0-only

#include <linux/iopoll.h>
#include <linux/mutex.h>
#include <asm/mach-rtl-otto/mach-rtl-otto.h>

#include "table.h"

static struct table_reg rtl838x_tbl_regs[] = {
	TBL_DESC(0x6900, 0x6908, 3, 15, 13, 1),		/* RTL8380_TBL_L2 */
	TBL_DESC(0x6914, 0x6918, 18, 14, 12, 1),	/* RTL8380_TBL_0 */
	TBL_DESC(0xA4C8, 0xA4CC, 6, 14, 12, 1),		/* RTL8380_TBL_1 */

	TBL_DESC(0x1180, 0x1184, 3, 16, 14, 0),		/* RTL8390_TBL_L2 */
	TBL_DESC(0x1190, 0x1194, 17, 15, 12, 0),	/* RTL8390_TBL_0 */
	TBL_DESC(0x6B80, 0x6B84, 4, 14, 12, 0),		/* RTL8390_TBL_1 */
	TBL_DESC(0x611C, 0x6120, 9, 8, 6, 0),		/* RTL8390_TBL_2 */

	TBL_DESC(0xB320, 0xB334, 3, 18, 16, 0),		/* RTL9300_TBL_L2 */
	TBL_DESC(0xB340, 0xB344, 19, 16, 12, 0),	/* RTL9300_TBL_0 */
	TBL_DESC(0xB3A0, 0xB3A4, 20, 16, 13, 0),	/* RTL9300_TBL_1 */
	TBL_DESC(0xCE04, 0xCE08, 6, 14, 12, 0),		/* RTL9300_TBL_2 */
	TBL_DESC(0xD600, 0xD604, 30, 7, 6, 0),		/* RTL9300_TBL_HSB */
	TBL_DESC(0x7880, 0x7884, 22, 9, 8, 0),		/* RTL9300_TBL_HSA */

	TBL_DESC(0x8500, 0x8508, 8, 19, 15, 0),		/* RTL9310_TBL_0 */
	TBL_DESC(0x40C0, 0x40C4, 22, 16, 14, 0),	/* RTL9310_TBL_1 */
	TBL_DESC(0x8528, 0x852C, 6, 18, 14, 0),		/* RTL9310_TBL_2 */
	TBL_DESC(0x0200, 0x0204, 9, 15, 12, 0),		/* RTL9310_TBL_3 */
	TBL_DESC(0x20dc, 0x20e0, 29, 7, 6, 0),		/* RTL9310_TBL_4 */
	TBL_DESC(0x7e1c, 0x7e20, 53, 8, 6, 0),		/* RTL9310_TBL_5 */
};

void rtl_table_init(void)
{
	for (int i = 0; i < RTL_TBL_END; i++)
		mutex_init(&rtl838x_tbl_regs[i].lock);
}

/* Request access to table t in table access register r
 * Returns a handle to a lock for that table
 */
struct table_reg *rtl_table_get(rtl838x_tbl_reg_t r, int t)
{
	if (r >= RTL_TBL_END)
		return NULL;

	if (t >= BIT(rtl838x_tbl_regs[r].c_bit - rtl838x_tbl_regs[r].t_bit))
		return NULL;

	mutex_lock(&rtl838x_tbl_regs[r].lock);
	rtl838x_tbl_regs[r].tbl = t;

	return &rtl838x_tbl_regs[r];
}

/* Release a table r, unlock the corresponding lock */
void rtl_table_release(struct table_reg *r)
{
	if (!r)
		return;

/*	pr_info("Unlocking %08x\n", (u32)r); */
	mutex_unlock(&r->lock);
/*	pr_info("Unlock done\n"); */
}

static int rtl_table_exec(struct table_reg *r, bool is_write, int idx)
{
	int ret = 0;
	u32 cmd, val;

	/* Read/write bit has inverted meaning on RTL838x */
	if (r->rmode)
		cmd = is_write ? 0 : BIT(r->c_bit);
	else
		cmd = is_write ? BIT(r->c_bit) : 0;

	cmd |= BIT(r->c_bit + 1); /* Execute bit */
	cmd |= r->tbl << r->t_bit; /* Table type */
	cmd |= idx & (BIT(r->t_bit) - 1); /* Index */

	sw_w32(cmd, r->addr);

	ret = readx_poll_timeout(sw_r32, r->addr, val,
				 !(val & BIT(r->c_bit + 1)), 20, 10000);
	if (ret)
		pr_err("%s: timeout\n", __func__);

	return ret;
}

/* Reads table index idx into the data registers of the table */
int rtl_table_read(struct table_reg *r, int idx)
{
	return rtl_table_exec(r, false, idx);
}

/* Writes the content of the table data registers into the table at index idx */
int rtl_table_write(struct table_reg *r, int idx)
{
	return rtl_table_exec(r, true, idx);
}

/* Returns the address of the ith data register of table register r
 * the address is relative to the beginning of the Switch-IO block at 0xbb000000
 */
inline u16 rtl_table_data(struct table_reg *r, int i)
{
	if (i >= r->max_data)
		i = r->max_data - 1;
	return r->data + i * 4;
}

inline u32 rtl_table_data_r(struct table_reg *r, int i)
{
	return sw_r32(rtl_table_data(r, i));
}

inline void rtl_table_data_w(struct table_reg *r, u32 v, int i)
{
	sw_w32(v, rtl_table_data(r, i));
}
