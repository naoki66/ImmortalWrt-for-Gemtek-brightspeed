/* SPDX-License-Identifier: GPL-2.0-only */
#ifndef _ECNT_HOOK_XPON_MAPPING_H
#define _ECNT_HOOK_XPON_MAPPING_H

#include <linux/skbuff.h>

extern int (*gpon_mapping_hook)(struct sk_buff *skb);
extern int (*xpon_mode_get_hook)(void);
extern int (*gpon_downstream_mapping_hook)(struct sk_buff *skb);
extern int (*gpon_downstream_mapping_stag_hook)(struct sk_buff *skb);
extern int (*epon_sfu_clsfy_hook)(struct sk_buff *skb, int port);
extern int (*epon_mapping_hook)(struct sk_buff *skb);
extern int (*upstream_vlan_policer_hook)(struct sk_buff *skb);

int mark2port(struct sk_buff *skb);
int name2port(char *dev_name);
int port2name(int portid, char *dev_name);

#define ENCT_HOOK_XPON_ETH_MAP_MARK_TO_PORT(skb) mark2port(skb)
#define ENCT_HOOK_XPON_ETH_MAP_DEV_NAME_TO_PORT(name) name2port(name)
#define ENCT_HOOK_XPON_ETH_MAP_PORT_TO_DEV_NAME(port, name) port2name((port), (name))

#endif
