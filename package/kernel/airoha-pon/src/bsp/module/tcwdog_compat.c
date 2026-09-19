/* SPDX-License-Identifier: GPL-2.0-only */
#include <linux/module.h>

/*
 * The SDK implementation reloads the legacy MIPS CR_WDOG_RLD register.
 * EN7581 does not expose that register through the 6.18 PON package; the
 * platform watchdog owns reloads, so retain only the vendor call ABI here.
 */
void tc3162wdog_kick(void)
{
}
EXPORT_SYMBOL(tc3162wdog_kick);
