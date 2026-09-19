// SPDX-License-Identifier: GPL-2.0-only
#include <linux/module.h>
#include <linux/netdevice.h>
#include <linux/skbuff.h>

int (*xpon_store_upstream_igmp_vlan_tci_hook)(struct sk_buff *skb);
int (*xpon_down_multicast_vlan_handle_hook)(struct sk_buff **skb);
int (*xpon_upstream_vlan_recovery_by_dynlist_hook)(struct sk_buff *skb);
int (*xpon_hgu_down_multicast_access_control_hook)(struct sk_buff *skb);
int (*xpon_hgu_set_multicast_max_groups_hook)(int max_groups);
int (*xpon_hgu_set_multicast_max_rate_hook)(unsigned int max_rate);
int (*xpon_hgu_down_multicast_vlan_tci_hook)(struct sk_buff *skb);

EXPORT_SYMBOL(xpon_store_upstream_igmp_vlan_tci_hook);
EXPORT_SYMBOL(xpon_down_multicast_vlan_handle_hook);
EXPORT_SYMBOL(xpon_upstream_vlan_recovery_by_dynlist_hook);
EXPORT_SYMBOL(xpon_hgu_down_multicast_access_control_hook);
EXPORT_SYMBOL(xpon_hgu_set_multicast_max_groups_hook);
EXPORT_SYMBOL(xpon_hgu_set_multicast_max_rate_hook);
EXPORT_SYMBOL(xpon_hgu_down_multicast_vlan_tci_hook);

int (*xpon_sfu_up_send_multicast_frame_hook)(struct sk_buff *skb, int clone);
int (*xpon_sfu_up_multicast_incoming_hook)(struct sk_buff *skb, int clone);
int (*xpon_sfu_down_multicast_incoming_hook)(struct sk_buff *skb, int clone);
int (*xpon_hgu_down_multicast_incoming_hook)(struct sk_buff *skb, int clone);
int (*xpon_hybrid_down_multicast_incoming_hook)(struct sk_buff *skb, int clone);
int (*xpon_sfu_up_multicast_vlan_hook)(struct sk_buff *skb, int clone);
int (*xpon_sfu_multicast_protocol_hook)(struct sk_buff *skb);
int (*xpon_up_igmp_uni_vlan_filter_hook)(struct sk_buff *skb);
int (*xpon_up_igmp_ani_vlan_filter_hook)(struct sk_buff *skb);
int (*isVlanOperationInMulticastModule_hook)(struct sk_buff *skb);

EXPORT_SYMBOL(xpon_sfu_up_send_multicast_frame_hook);
EXPORT_SYMBOL(xpon_sfu_up_multicast_incoming_hook);
EXPORT_SYMBOL(xpon_sfu_down_multicast_incoming_hook);
EXPORT_SYMBOL(xpon_hgu_down_multicast_incoming_hook);
EXPORT_SYMBOL(xpon_hybrid_down_multicast_incoming_hook);
EXPORT_SYMBOL(xpon_sfu_up_multicast_vlan_hook);
EXPORT_SYMBOL(xpon_sfu_multicast_protocol_hook);
EXPORT_SYMBOL(xpon_up_igmp_uni_vlan_filter_hook);
EXPORT_SYMBOL(xpon_up_igmp_ani_vlan_filter_hook);
EXPORT_SYMBOL(isVlanOperationInMulticastModule_hook);

int (*pon_check_mac_hook)(struct sk_buff *skb);
int (*pon_mac_filter_get_mode_hook)(void);

EXPORT_SYMBOL(pon_check_mac_hook);
EXPORT_SYMBOL(pon_mac_filter_get_mode_hook);

int (*gpon_mapping_hook)(struct sk_buff *skb);
int (*xpon_mode_get_hook)(void);
int (*gpon_downstream_mapping_hook)(struct sk_buff *skb);
int (*gpon_downstream_mapping_stag_hook)(struct sk_buff *skb);
int (*epon_sfu_clsfy_hook)(struct sk_buff *skb, int port);
int (*epon_mapping_hook)(struct sk_buff *skb);
int (*upstream_vlan_policer_hook)(struct sk_buff *skb);

EXPORT_SYMBOL(gpon_mapping_hook);
EXPORT_SYMBOL(xpon_mode_get_hook);
EXPORT_SYMBOL(gpon_downstream_mapping_hook);
EXPORT_SYMBOL(gpon_downstream_mapping_stag_hook);
EXPORT_SYMBOL(epon_sfu_clsfy_hook);
EXPORT_SYMBOL(epon_mapping_hook);
EXPORT_SYMBOL(upstream_vlan_policer_hook);

int (*pon_insert_tag_hook)(struct sk_buff **pskb);
int (*pon_vlan_get_mode_hook)(void);
int (*pon_store_tag_hook)(struct sk_buff *skb, struct net_device *dev);
int (*pon_check_vlan_hook)(struct net_device *dev, struct sk_buff *skb);
int (*pon_check_tpid_hook)(__u16 *buf);
int (*pon_check_user_group_hook)(struct sk_buff *skb);
int (*pon_PCP_decode_hook)(struct sk_buff **pskb);
int (*pon_hybrid_sfu_lan_check_hook)(struct sk_buff **pskb);
int (*pon_hybrid_sfu_wan_check_hook)(struct sk_buff **pskb);
int (*pon_vlan_is_ds_1_to_N_hook)(struct sk_buff **pskb, int *count);
int (*pon_vlan_ds_1_to_N_handler_hook)(struct sk_buff **pskb, int index);

EXPORT_SYMBOL(pon_insert_tag_hook);
EXPORT_SYMBOL(pon_vlan_get_mode_hook);
EXPORT_SYMBOL(pon_store_tag_hook);
EXPORT_SYMBOL(pon_check_vlan_hook);
EXPORT_SYMBOL(pon_check_tpid_hook);
EXPORT_SYMBOL(pon_check_user_group_hook);
EXPORT_SYMBOL(pon_PCP_decode_hook);
EXPORT_SYMBOL(pon_hybrid_sfu_lan_check_hook);
EXPORT_SYMBOL(pon_hybrid_sfu_wan_check_hook);
EXPORT_SYMBOL(pon_vlan_is_ds_1_to_N_hook);
EXPORT_SYMBOL(pon_vlan_ds_1_to_N_handler_hook);

int (*xpon_igmp_acl_filter_hook)(struct sk_buff *skb);
int (*xpon_igmp_ioctl_hook)(unsigned long subcmd, unsigned long argv1,
			    unsigned long argv2);
int (*xpon_hgu_multicast_data_hook)(struct sk_buff *skb);
int (*xpon_add_delete_port_hook)(struct net_device *dev, int op);

EXPORT_SYMBOL(xpon_igmp_acl_filter_hook);
EXPORT_SYMBOL(xpon_igmp_ioctl_hook);
EXPORT_SYMBOL(xpon_hgu_multicast_data_hook);
EXPORT_SYMBOL(xpon_add_delete_port_hook);
