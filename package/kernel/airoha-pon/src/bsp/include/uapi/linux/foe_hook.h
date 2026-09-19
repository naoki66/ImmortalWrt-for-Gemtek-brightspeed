/* SPDX-License-Identifier: GPL-2.0-only */
#ifndef _UAPI_LINUX_FOE_HOOK_H
#define _UAPI_LINUX_FOE_HOOK_H

#define ETH_HLEN 14
#define IP_HLEN 20

struct SkbFoeInfo {
	unsigned short ppe_magic;
	unsigned short ppe_foe_entry;
	unsigned char ppe_ai;
	unsigned char wan_type;
	unsigned short wan_index;
};

#endif
