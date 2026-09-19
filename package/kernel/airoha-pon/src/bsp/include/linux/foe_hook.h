/* SPDX-License-Identifier: GPL-2.0-only */
#ifndef _LINUX_FOE_HOOK_H
#define _LINUX_FOE_HOOK_H

#include <linux/netdevice.h>
#include <linux/skbuff.h>
#include <linux/types.h>
#include <uapi/linux/foe_hook.h>

#define FOE_MAGIC_PPE  0x7276
#define FOE_MAGIC_EPON 0x7279
#define FOE_MAGIC_GPON 0x727a

/* ABI shape copied from the SDK; callbacks are NULL until a native provider claims them. */
struct port_info {
	unsigned long int tsid:8;
	unsigned long int channel:5;
	unsigned long int nbq:5;
	unsigned long int fast:1;
	unsigned long int txq:4;
	unsigned long int atm_pppoa:1;
	unsigned long int atm_ipoa:1;
	unsigned long int atm_vc_mux:1;
	unsigned long int eth_macSTagEn:1;
	unsigned long int eth_is_wan:1;
	unsigned long int ds_to_qdma:1;
	unsigned long int ds_need_offload:1;
	unsigned long int force_high_priority_ring:1;
	unsigned long int txq_is_valid:1;
	unsigned long int stag:16;
	unsigned long int magic:16;
	unsigned long int udf:8;
};

struct net_data_s;

extern int (*ra_sw_nat_hook_rx_set_l2lu)(struct sk_buff *skb,
	unsigned int direction, int ppe_index);
extern int (*ra_sw_nat_hook_rx)(struct sk_buff *skb);
#ifdef TCSUPPORT_MT7510_FE
extern int (*ra_sw_nat_hook_tx)(struct sk_buff *skb,
	struct port_info *pinfo, int magic);
extern void (*restore_offload_info_hook)(struct sk_buff *skb,
	struct port_info *pinfo, int magic);
#else
extern int (*ra_sw_nat_hook_tx)(struct sk_buff *skb, int gmac_no);
#endif
extern int (*ra_sw_nat_hook_free)(struct sk_buff *skb);
extern int (*ra_sw_nat_hook_rxinfo)(struct sk_buff *skb, int magic,
	char *data, int data_length);
extern int (*ra_sw_nat_hook_txq)(struct sk_buff *skb, int txq);
extern int (*ra_sw_nat_hook_magic)(struct sk_buff *skb, int magic);
extern int (*ra_sw_nat_hook_set_magic)(struct sk_buff *skb, int magic);
extern int (*ra_sw_nat_hook_xfer)(struct sk_buff *skb,
	const struct sk_buff *prev_p);
extern int (*ra_sw_nat_hook_clean_entry_by_channel)(int channel_idx);
extern int (*ra_sw_nat_hook_drop_packet)(struct sk_buff *skb);
extern int (*ra_sw_nat_hook_clean_table)(void);
extern int (*ra_sw_nat_hook_clean_multicast_entry)(void);
extern int (*ra_sw_nat_hook_tls_vtag_handle_hook)(struct sk_buff **pskb);
extern int (*ra_sw_nat_cds_all_ratelimit_hook)(struct sk_buff *skb);

extern int (*hwnat_clean_entry_by_dst_mac_hook)(const unsigned char *mac);
extern int (*hwnat_is_alive_pkt_hook)(struct sk_buff *skb);
extern int (*hwnat_skb_to_foe_hook)(struct sk_buff *skb);
extern int (*hwnat_set_special_tag_hook)(int index, int tag);
extern int (*hwnat_delete_foe_entry_hook)(int index);
extern int (*hwnat_delete_foe_entry_hook_unlock)(int index);
extern int (*hwnat_is_multicast_entry_hook)(int index,
	unsigned char *grp_addr, unsigned char *src_addr, int type);
extern int (*hwnat_is_drop_entry_hook)(int index,
	unsigned char *grp_addr, unsigned char *src_addr, int type);
extern int (*hwnat_set_multicast_vlan_hook)(int index, int vid, int vpm);
extern int (*hwnat_multicast_set_info_for_sfu_hook)(int index, int tag);
extern int (*hwnat_set_rule_according_to_state_hook)(int index, int state,
	unsigned long mask);
extern int (*xpon_igmp_learn_flow_hook)(struct sk_buff *skb);
extern int (*multicast_hwnat_drop_entry_hook)(struct sk_buff *skb);
extern int (*wan_multicast_drop_hook)(struct sk_buff *skb);
extern int (*wan_multicast_undrop_hook)(void);
extern int (*wan_multicast_undrop_by_grpip_hook)(unsigned char is_ipv6,
	unsigned char *grp_ip);
extern int (*wan_mvlan_change_hook)(void);

extern int is_hwnat_dont_clean;

#endif
