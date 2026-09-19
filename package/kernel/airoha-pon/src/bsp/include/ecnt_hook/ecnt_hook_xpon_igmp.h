/* SPDX-License-Identifier: GPL-2.0-only */
#ifndef _ECNT_HOOK_XPON_IGMP_H
#define _ECNT_HOOK_XPON_IGMP_H

#include <linux/netdevice.h>
#include <linux/skbuff.h>
#include <linux/types.h>

/*
 * These names live in a vendor-private XPON header that is not exported by
 * the EN757x SDK snapshot. Keep the kernel-only compatibility ABI local to
 * the hook header until the original private header is available.
 */
#ifndef ECNT_XPON_IGMP_API
#define ECNT_XPON_IGMP_API 0
#endif

#ifndef XPON_IGMP_API_TYPE_GET
#define XPON_IGMP_API_TYPE_GET 0
#endif

#ifndef XPON_IGMP_API_TYPE_SET
#define XPON_IGMP_API_TYPE_SET 1
#endif

#ifndef XPON_IGMP_CMD_PORT_TYPE
#define XPON_IGMP_CMD_PORT_TYPE 0
#endif

#ifndef XPON_IGMP_CMD_BRIDGE_WAN
#define XPON_IGMP_CMD_BRIDGE_WAN 1
#endif

#ifndef XPON_HYBRID_MODE_PORT_TYPE_PPTP
#define XPON_HYBRID_MODE_PORT_TYPE_PPTP 0
#endif

#ifndef XPON_HYBRID_MODE_PORT_TYPE_VEIP
#define XPON_HYBRID_MODE_PORT_TYPE_VEIP 1
#endif

#ifndef AIROHA_XPON_IGMP_API_COMPAT
#define AIROHA_XPON_IGMP_API_COMPAT

#ifndef PON_VLAN_ITF_NAME_SIZE
#define PON_VLAN_ITF_NAME_SIZE 16
#endif

#define AIROHA_XPON_IGMP_PORT_MAX 4

typedef struct airoha_xpon_igmp_port_s {
	char portName[PON_VLAN_ITF_NAME_SIZE];
	int portType;
} airoha_xpon_igmp_port_t;

typedef struct airoha_xpon_igmp_port_data_s {
	int isHybridMode;
	int portNum;
	airoha_xpon_igmp_port_t portList[AIROHA_XPON_IGMP_PORT_MAX];
} xpon_igmp_port_data_t;

typedef struct airoha_xpon_igmp_api_data_s {
	int api_type;
	int cmd_id;
	union {
		xpon_igmp_port_data_t port_data;
		char *bridgeWan;
	} data;
} xpon_igmp_api_data_t;

#endif

extern int (*xpon_store_upstream_igmp_vlan_tci_hook)(struct sk_buff *skb);
extern int (*xpon_down_multicast_vlan_handle_hook)(struct sk_buff **skb);
extern int (*xpon_upstream_vlan_recovery_by_dynlist_hook)(struct sk_buff *skb);
extern int (*xpon_hgu_down_multicast_access_control_hook)(struct sk_buff *skb);
extern int (*xpon_hgu_set_multicast_max_groups_hook)(int max_groups);
extern int (*xpon_hgu_set_multicast_max_rate_hook)(unsigned int max_rate);
extern int (*xpon_hgu_down_multicast_vlan_tci_hook)(struct sk_buff *skb);

extern int (*xpon_sfu_up_send_multicast_frame_hook)(struct sk_buff *skb,
						    int clone);
extern int (*xpon_sfu_up_multicast_incoming_hook)(struct sk_buff *skb,
						  int clone);
extern int (*xpon_sfu_down_multicast_incoming_hook)(struct sk_buff *skb,
						    int clone);
extern int (*xpon_hgu_down_multicast_incoming_hook)(struct sk_buff *skb,
						    int clone);
extern int (*xpon_hybrid_down_multicast_incoming_hook)(struct sk_buff *skb,
						       int clone);
extern int (*xpon_sfu_up_multicast_vlan_hook)(struct sk_buff *skb, int clone);
extern int (*xpon_sfu_multicast_protocol_hook)(struct sk_buff *skb);
extern int (*xpon_up_igmp_uni_vlan_filter_hook)(struct sk_buff *skb);
extern int (*xpon_up_igmp_ani_vlan_filter_hook)(struct sk_buff *skb);
extern int (*isVlanOperationInMulticastModule_hook)(struct sk_buff *skb);

extern int (*xpon_igmp_acl_filter_hook)(struct sk_buff *skb);
extern int (*xpon_igmp_ioctl_hook)(unsigned long subcmd, unsigned long argv1,
				   unsigned long argv2);
extern int (*xpon_hgu_multicast_data_hook)(struct sk_buff *skb);
extern int (*xpon_add_delete_port_hook)(struct net_device *dev, int op);

#endif
