/* SPDX-License-Identifier: GPL-2.0-only */
#include <linux/foe_hook.h>
#include <linux/module.h>

/*
 * The SDK exposes these as cross-module callbacks. EN7581 uses the 6.18
 * Airoha PPE/NPU path instead of the legacy FE/HWNAT provider, so keep the
 * ABI available and NULL by default until a native provider claims it.
 */
int (*ra_sw_nat_hook_rx_set_l2lu)(struct sk_buff *skb,
	unsigned int direction, int ppe_index);
EXPORT_SYMBOL(ra_sw_nat_hook_rx_set_l2lu);

int (*ra_sw_nat_hook_rx)(struct sk_buff *skb);
EXPORT_SYMBOL(ra_sw_nat_hook_rx);

#ifdef TCSUPPORT_MT7510_FE
int (*ra_sw_nat_hook_tx)(struct sk_buff *skb,
	struct port_info *pinfo, int magic);
EXPORT_SYMBOL(ra_sw_nat_hook_tx);

void (*restore_offload_info_hook)(struct sk_buff *skb,
	struct port_info *pinfo, int magic);
EXPORT_SYMBOL(restore_offload_info_hook);
#else
int (*ra_sw_nat_hook_tx)(struct sk_buff *skb, int gmac_no);
EXPORT_SYMBOL(ra_sw_nat_hook_tx);
#endif

int (*ra_sw_nat_hook_free)(struct sk_buff *skb);
EXPORT_SYMBOL(ra_sw_nat_hook_free);

int (*ra_sw_nat_hook_rxinfo)(struct sk_buff *skb, int magic,
	char *data, int data_length);
EXPORT_SYMBOL(ra_sw_nat_hook_rxinfo);

int (*ra_sw_nat_hook_txq)(struct sk_buff *skb, int txq);
EXPORT_SYMBOL(ra_sw_nat_hook_txq);

int (*ra_sw_nat_hook_magic)(struct sk_buff *skb, int magic);
EXPORT_SYMBOL(ra_sw_nat_hook_magic);

int (*ra_sw_nat_hook_set_magic)(struct sk_buff *skb, int magic);
EXPORT_SYMBOL(ra_sw_nat_hook_set_magic);

int (*ra_sw_nat_hook_xfer)(struct sk_buff *skb,
	const struct sk_buff *prev_p);
EXPORT_SYMBOL(ra_sw_nat_hook_xfer);

int (*ra_sw_nat_hook_clean_entry_by_channel)(int channel_idx);
EXPORT_SYMBOL(ra_sw_nat_hook_clean_entry_by_channel);

int (*ra_sw_nat_hook_drop_packet)(struct sk_buff *skb);
EXPORT_SYMBOL(ra_sw_nat_hook_drop_packet);

int (*ra_sw_nat_hook_clean_table)(void);
EXPORT_SYMBOL(ra_sw_nat_hook_clean_table);

int (*ra_sw_nat_hook_clean_multicast_entry)(void);
EXPORT_SYMBOL(ra_sw_nat_hook_clean_multicast_entry);

int (*ra_sw_nat_hook_tls_vtag_handle_hook)(struct sk_buff **pskb);
EXPORT_SYMBOL(ra_sw_nat_hook_tls_vtag_handle_hook);

int (*ra_sw_nat_cds_all_ratelimit_hook)(struct sk_buff *skb);
EXPORT_SYMBOL(ra_sw_nat_cds_all_ratelimit_hook);

int (*hwnat_clean_entry_by_dst_mac_hook)(const unsigned char *mac);
EXPORT_SYMBOL(hwnat_clean_entry_by_dst_mac_hook);

int (*hwnat_is_alive_pkt_hook)(struct sk_buff *skb);
EXPORT_SYMBOL(hwnat_is_alive_pkt_hook);

int (*hwnat_skb_to_foe_hook)(struct sk_buff *skb);
EXPORT_SYMBOL(hwnat_skb_to_foe_hook);

int (*hwnat_set_special_tag_hook)(int index, int tag);
EXPORT_SYMBOL(hwnat_set_special_tag_hook);

int (*hwnat_delete_foe_entry_hook)(int index);
EXPORT_SYMBOL(hwnat_delete_foe_entry_hook);

int (*hwnat_delete_foe_entry_hook_unlock)(int index);
EXPORT_SYMBOL(hwnat_delete_foe_entry_hook_unlock);

int (*hwnat_is_multicast_entry_hook)(int index,
	unsigned char *grp_addr, unsigned char *src_addr, int type);
EXPORT_SYMBOL(hwnat_is_multicast_entry_hook);

int (*hwnat_is_drop_entry_hook)(int index,
	unsigned char *grp_addr, unsigned char *src_addr, int type);
EXPORT_SYMBOL(hwnat_is_drop_entry_hook);

int (*hwnat_set_multicast_vlan_hook)(int index, int vid, int vpm);
EXPORT_SYMBOL(hwnat_set_multicast_vlan_hook);

int (*hwnat_multicast_set_info_for_sfu_hook)(int index, int tag);
EXPORT_SYMBOL(hwnat_multicast_set_info_for_sfu_hook);

int (*hwnat_set_rule_according_to_state_hook)(int index, int state,
	unsigned long mask);
EXPORT_SYMBOL(hwnat_set_rule_according_to_state_hook);

int (*xpon_igmp_learn_flow_hook)(struct sk_buff *skb);
EXPORT_SYMBOL(xpon_igmp_learn_flow_hook);

int (*multicast_hwnat_drop_entry_hook)(struct sk_buff *skb);
EXPORT_SYMBOL(multicast_hwnat_drop_entry_hook);

int (*wan_multicast_drop_hook)(struct sk_buff *skb);
EXPORT_SYMBOL(wan_multicast_drop_hook);

int (*wan_multicast_undrop_hook)(void);
EXPORT_SYMBOL(wan_multicast_undrop_hook);

int (*wan_multicast_undrop_by_grpip_hook)(unsigned char is_ipv6,
	unsigned char *grp_ip);
EXPORT_SYMBOL(wan_multicast_undrop_by_grpip_hook);

int (*wan_mvlan_change_hook)(void);
EXPORT_SYMBOL(wan_mvlan_change_hook);

int is_hwnat_dont_clean;
EXPORT_SYMBOL(is_hwnat_dont_clean);
