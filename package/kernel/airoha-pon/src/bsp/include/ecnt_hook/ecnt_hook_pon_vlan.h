/* SPDX-License-Identifier: GPL-2.0-only */
#ifndef _ECNT_HOOK_PON_VLAN_H
#define _ECNT_HOOK_PON_VLAN_H

#include <linux/netdevice.h>
#include <linux/skbuff.h>
#include <linux/types.h>

extern int (*pon_insert_tag_hook)(struct sk_buff **pskb);
extern int (*pon_vlan_get_mode_hook)(void);
extern int (*pon_store_tag_hook)(struct sk_buff *skb,
				 struct net_device *dev);
extern int (*pon_check_vlan_hook)(struct net_device *dev,
				  struct sk_buff *skb);
extern int (*pon_check_tpid_hook)(__u16 *buf);
extern int (*pon_check_user_group_hook)(struct sk_buff *skb);
extern int (*pon_PCP_decode_hook)(struct sk_buff **pskb);
extern int (*pon_hybrid_sfu_lan_check_hook)(struct sk_buff **pskb);
extern int (*pon_hybrid_sfu_wan_check_hook)(struct sk_buff **pskb);
extern int (*pon_vlan_is_ds_1_to_N_hook)(struct sk_buff **pskb, int *count);
extern int (*pon_vlan_ds_1_to_N_handler_hook)(struct sk_buff **pskb,
						      int index);

extern int pon_vlan_get_down_vlan_opt(int port, unsigned int src_vlan,
						      int *mode, int *vlan, int *pri);

static inline int airoha_xpon_get_down_opt(int port, unsigned int src_vlan,
						   int *mode, int *vlan)
{
	int pri = 0;

	return pon_vlan_get_down_vlan_opt(port, src_vlan, mode, vlan, &pri);
}

#ifndef ECNT_API_XPON_GET_DOWN_OPT
#define ECNT_API_XPON_GET_DOWN_OPT(port, src_vlan, mode, vlan) \
	airoha_xpon_get_down_opt((port), (src_vlan), (mode), (vlan))
#endif

static inline int airoha_xpon_get_tci_down_opt(int port,
							unsigned int src_vlan,
							int *mode, __u16 *tci)
{
	int vlan = 0;
	int pri = 0;
	int ret;

	ret = pon_vlan_get_down_vlan_opt(port, src_vlan, mode, &vlan, &pri);
	if (ret != 0)
		return ret;

	/* add_fst_pri 8..10 means preserve/derive pbit in the vendor ABI. */
	if (pri <= 7)
		*tci = ((pri & 0x7) << 13) | (vlan & 0x0fff);
	else
		*tci = 0x1000 | (vlan & 0x0fff);

	return ret;
}

#ifndef ECNT_API_GET_TCI_DOWN_OPT
#define ECNT_API_GET_TCI_DOWN_OPT(port, src_vlan, mode, tci) \
	airoha_xpon_get_tci_down_opt((port), (src_vlan), (mode), (tci))
#endif

/*
 * The vendor IGMP sources use a small rule carrier that is not present in
 * the exported EN757x headers. Bridge it to the real PON VLAN matcher.
 */
#ifndef AIROHA_XPON_VLAN_FILTER_RULE_COMPAT
#define AIROHA_XPON_VLAN_FILTER_RULE_COMPAT
typedef struct xpon_vlan_filter_rule_compat {
	__u16 vlan_tag;
	__u8 vlan_type;
	__u16 port;
	__u8 portType;
	__u8 dir;
} Vlan_Filter_Rule_t;

extern int matchVlanFilterRuleOp(__u16 port, __u8 portType, __u8 type,
					 __u16 vlan_tag, __u8 dir);

#ifndef ECNT_API_XPON_MATCH_VLAN_FILTER_RULE_OP
#define ECNT_API_XPON_MATCH_VLAN_FILTER_RULE_OP(rule) \
	matchVlanFilterRuleOp((rule)->port, (rule)->portType, \
				      (rule)->vlan_type, (rule)->vlan_tag, (rule)->dir)
#endif
#endif

#endif
