// SPDX-License-Identifier: GPL-2.0-only
#include <linux/if_ether.h>
#include <linux/if_vlan.h>
#include <linux/module.h>
#include <linux/skbuff.h>
#include <linux/types.h>

/* Keep the vendor VLAN helper ABI while using the 6.18 VLAN primitives. */
struct sk_buff *__vlan_put_tag(struct sk_buff *skb, u16 vlan_tci)
{
	skb->protocol = htons(ETH_P_8021Q);
	return vlan_insert_tag(skb, skb->protocol, vlan_tci);
}
EXPORT_SYMBOL(__vlan_put_tag);

struct sk_buff *__pon_vlan_put_tag(struct sk_buff *skb, u16 tpid,
	unsigned short vlan_tci)
{
	struct vlan_ethhdr *veth;

	if (!skb || skb_cow_head(skb, VLAN_HLEN) < 0) {
		kfree_skb(skb);
		return NULL;
	}

	veth = (struct vlan_ethhdr *)skb_push(skb, VLAN_HLEN);
	memmove(skb->data, skb->data + VLAN_HLEN, 2 * ETH_ALEN);
	skb->mac_header -= VLAN_HLEN;
	veth->h_vlan_proto = htons(tpid);
	veth->h_vlan_TCI = htons(vlan_tci);
	skb->protocol = htons(tpid);

	return skb;
}
EXPORT_SYMBOL(__pon_vlan_put_tag);

/*
 * Linux 6.18 keeps the packet-type registry private to net/core/dev.c.
 * pon_vlan already tracks its own registrations, so preserve the vendor
 * "not found" result without duplicating that private kernel registry.
 */
int pon_check_pack(__u16 type)
{
	return 1;
}
EXPORT_SYMBOL(pon_check_pack);
