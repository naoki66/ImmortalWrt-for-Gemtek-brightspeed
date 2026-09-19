/* SPDX-License-Identifier: GPL-2.0-only */
#ifndef _LINUX_XPON_SKB_H
#define _LINUX_XPON_SKB_H

#include <linux/build_bug.h>
#include <linux/if_ether.h>
#include <linux/netdevice.h>
#include <linux/skbuff.h>
#include <linux/string.h>
#include <linux/timer.h>
#include <linux/types.h>

#ifndef TIMER_FUN_PAAM
#define TIMER_FUN_PAAM struct timer_list *
#endif

/* Shared xPON metadata stored in the standard 48-byte skb control buffer. */
struct xpon_skb_cb {
	u32 pon_mark;
	u32 mark2;
	u32 pon_vlan_flag;
	u32 vlan_tag_flag;
	u16 gem_port;
	u16 lan_vlan_tci;
	u16 pon_vlan_tpid[4];
	u16 pon_vlan_tci[4];
	u16 vlan_tags[2];
	u8 gem_type;
	u8 v_if;
	u8 lan_vlan_tci_valid;
	u8 pon_mac_filter_flag;
	u8 pon_tag_num;
	u8 qosEnque;
	u8 xpon_igmp_flag;
	u8 epon_queue:3;
	u8 epon_pbit:3;
	u8 is_unknown_mul:1;
	u8 reserved:1;
};

static_assert(sizeof(struct xpon_skb_cb) == sizeof(((struct sk_buff *)0)->cb));

#define XPON_SKB_CB(skb) ((struct xpon_skb_cb *)((skb)->cb))

#ifndef ETH_P_QinQ_88a8
#define ETH_P_QinQ_88a8 ETH_P_8021AD
#endif
#ifndef ETH_P_QinQ_9100
#define ETH_P_QinQ_9100 ETH_P_QINQ1
#endif
/* Bit 16 is the only gap in the vendor pon_vlan_flag layout. */
#ifndef PON_CLASSIFICATION_REMARK
#define PON_CLASSIFICATION_REMARK (1U << 16)
#endif

/* Caller must hold rcu_read_lock() while using the returned device. */
static inline struct net_device *
xpon_skb_ingress_dev_rcu(const struct sk_buff *skb)
{
	struct net_device *dev = NULL;

	if (skb->skb_iif && skb->dev)
		dev = dev_get_by_index_rcu(dev_net(skb->dev), skb->skb_iif);

	return dev ? dev : skb->dev;
}

/* Preserve the vendor original_dev meaning with the standard skb_iif index. */
static inline void
xpon_skb_preserve_ingress_dev(struct sk_buff *skb)
{
	if (skb && skb->dev && !skb->skb_iif)
		skb->skb_iif = skb->dev->ifindex;
}

static inline bool
xpon_skb_copy_ingress_name(const struct sk_buff *skb, char *name, size_t len)
{
	struct net_device *dev;
	bool found = false;

	rcu_read_lock();
	dev = xpon_skb_ingress_dev_rcu(skb);
	if (dev) {
		strscpy(name, dev->name, len);
		found = true;
	}
	rcu_read_unlock();

	return found;
}

#ifndef QOS_TSID_MARK
#define QOS_TSID_MARK 0x0000001f
#endif
#ifndef QOS_TSE_MARK
#define QOS_TSE_MARK 0x00000020
#endif
#ifndef DS_PKT_FORM_WAN
#define DS_PKT_FORM_WAN 0x00000400
#endif

#ifndef PON_PKT_FROM_CPE
#define PON_PKT_FROM_CPE              (1U << 0)
#define PON_PKT_FROM_LAN              (1U << 1)
#define PON_PKT_FROM_WLAN             (1U << 2)
#define PON_PKT_FROM_WAN              (1U << 3)
#define PON_PKT_FROM_USB              (1U << 4)
#define PON_PKT_FROM_IGMP             (1U << 5)
#define PON_PKT_INSERT_FLAG           (1U << 6)
#define PON_PKT_ROUTING_FLAG          (1U << 7)
#define PON_PKT_SEND_TO_WAN           (1U << 8)
#define PON_VLAN_RX_CALL_HOOK         (1U << 9)
#define PON_VLAN_TX_CALL_HOOK         (1U << 10)
#define PON_USER_GROUP_FLAG           (1U << 11)
#define PON_PKT_VOIP_RX               (1U << 12)
#define PON_PKT_VOIP_TX               (1U << 13)
#define PON_MULTICAST_ANI_FILTER_FLAG (1U << 14)
#define PON_LEAVE_PKT_DEAL            (1U << 15)
#define PON_PKT_TR69_RX               (1U << 17)
#define PON_PKT_TR69_TX               (1U << 18)
#define PON_PKT_DROP_FLAG             (1U << 19)
#define PON_PKT_TRACE_FLAG            (1U << 20)
#define PON_PKT_FROM_HYBRID_PPTP      (1U << 21)
#define PON_PKT_FROM_HYBRID_VEIP      (1U << 22)
#define PON_PKT_FROM_HYBRID_SFU_WAN   (1U << 23)
#endif

#ifndef PKT_FROM_LAN
#define PKT_FROM_LAN                 (1U << 0)
#define PKT_FROM_WAN                 (1U << 1)
#define PKT_SEND_TO_WAN              (1U << 2)
#define PKT_FILTER_FLAG              (1U << 3)
#define PON_MAC_FILTER_RX_CALL_HOOK  (1U << 4)
#define PON_MAC_FILTER_TX_CALL_HOOK  (1U << 5)
#define PKT_SEND_TO_LAN              (1U << 6)
#endif

#ifndef VLAN_PACKET
#define VLAN_PACKET                   (1U << 0)
#define VLAN_2TAGS_PACKET             (1U << 1)
#define ROUTING_MODE_PACKET           (1U << 2)
#define VLAN_TAG_FROM_INDEV           (1U << 3)
#define VLAN_TAG_INSERT_FLAG          (1U << 4)
#define VLAN_TAG_CHECK_FLAG           (1U << 5)
#define VLAN_TAG_FROM_WAN             (1U << 6)
#define VLAN_TAG_FOR_DNS              (1U << 7)
#define VLAN_TAG_PBIT_RESERVE0        (1U << 8)
#define VLAN_TAG_PBIT_RESERVE1        (1U << 9)
#define VLAN_TAG_PBIT_RESERVE2        (1U << 10)
#define VLAN_TAG_PBIT_RESERVE3        (1U << 11)
#define VLAN_TAG_FOR_CFI              (1U << 14)
#define VLAN_TAG_PBIT_REMARK_ENABLE   (1U << 15)
#define VLAN_TAG_PBIT_REMARK_BIT1     (1U << 16)
#define VLAN_TAG_PBIT_REMARK_BIT2     (1U << 17)
#define VLAN_TAG_PBIT_REMARK_BIT3     (1U << 18)
#define VLAN_TAG_MULTICAST_VLAN       (1U << 19)
#endif

#ifndef XPON_IGMP_IS_MULTICAST
#define XPON_IGMP_IS_MULTICAST              (1U << 0)
#define XPON_IGMP_UPSTREAM_RESTORE           (1U << 1)
#define XPON_IGMP_UPSTREAM_RECOVERY          (1U << 2)
#define XPON_IGMP_DOWNSTREAM_VLAN_HANDLE     (1U << 3)
#endif

#endif
