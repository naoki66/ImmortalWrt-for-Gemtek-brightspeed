// SPDX-License-Identifier: GPL-2.0-only
#include <linux/errno.h>
#include <linux/module.h>
#include <linux/string.h>

#include <linux/airoha_ppe_compat.h>
#include <linux/foe_hook.h>
#include <ecnt_hook/ecnt_hook.h>
#include <ecnt_hook/ecnt_hook_ppe.h>

/*
 * Keep the vendor PPE hook ABI, but route the multicast subset into the
 * native Airoha PPE driver. The native provider owns the hardware entry
 * format and rejects legacy Wi-Fi/XSI bits it cannot map safely.
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

static void foe_compat_mc_copy(struct airoha_ppe_mc_info *dst,
	const PPE_MULTICAST_INFO_t *src)
{
	memset(dst, 0, sizeof(*dst));
	dst->proto = src->proto;
	dst->vlan_tag_num = src->vlan_tag_num;
	dst->outer_tci = src->outer_tci;
	dst->inner_tci = src->inner_tci;
	memcpy(dst->grp_addr, src->grp_addr, sizeof(dst->grp_addr));
	memcpy(dst->src_addr, src->src_addr, sizeof(dst->src_addr));
	dst->orig_dev = src->ori_dev;
#if defined(CONFIG_BRIDGE_VLAN_FILTERING)
	dst->br_vid = src->br_vid;
#endif
}

static void foe_compat_mc_copy_back(PPE_MULTICAST_INFO_t *dst,
	const struct airoha_ppe_mc_info *src)
{
	dst->ori_dev = src->orig_dev;
	memcpy(dst->src_addr, src->src_addr, sizeof(dst->src_addr));
#if defined(CONFIG_BRIDGE_VLAN_FILTERING)
	dst->br_vid = src->br_vid;
#endif
}

static ecnt_ret_val foe_compat_ppe_hook(struct ecnt_data *indata)
{
	struct ecnt_ppe_data *data = (struct ecnt_ppe_data *)indata;
	struct airoha_ppe_mc_info info;
	PPE_MULTICAST_INFO_t *vendor_info;

	data->retValue = -EOPNOTSUPP;

	switch (data->function_id) {
	case PPE_API_ID_UPDATE_MULTICAST_LIST:
		vendor_info = data->multicast_update.info;
		if (!vendor_info)
			break;
		foe_compat_mc_copy(&info, vendor_info);
		data->retValue = airoha_ppe_mc_update(&info,
			data->multicast_update.update_mode,
			data->multicast_update.op_type,
			data->multicast_update.port_mask,
			data->multicast_update.local);
		break;
	case PPE_API_ID_CLEAR_MULTICAST_LIST:
		data->retValue = airoha_ppe_mc_clear();
		break;
	case PPE_API_ID_MULTICAST_SUBSCRIBE_GROUP:
		vendor_info = data->multicast_update.info;
		if (!vendor_info)
			break;
		foe_compat_mc_copy(&info, vendor_info);
		data->retValue = airoha_ppe_mc_subscribe(&info,
			data->multicast_update.update_mode);
		break;
	case PPE_API_ID_MULTICAST_GET_LOCAL:
		vendor_info = data->multicast_info;
		if (!vendor_info)
			break;
		foe_compat_mc_copy(&info, vendor_info);
		data->retValue = airoha_ppe_mc_get_local(&info);
		break;
	case PPE_API_GET_MC_ORIGDEV:
		vendor_info = data->multicast_update.info;
		if (!vendor_info)
			break;
		foe_compat_mc_copy(&info, vendor_info);
		data->retValue = airoha_ppe_mc_get_origdev(&info);
		if (!data->retValue)
			foe_compat_mc_copy_back(vendor_info, &info);
		break;
	default:
		break;
	}

	return ECNT_CONTINUE;
}

static ecnt_ret_val foe_compat_ppe_mcst_hook(struct ecnt_data *indata)
{
	struct ecnt_ppe_data *data = (struct ecnt_ppe_data *)indata;
	struct airoha_ppe_mc_info info;

	data->retValue = -EOPNOTSUPP;
	if (data->function_id == PPE_MCST_EX_API_ID_GET_PORTMASK &&
	    data->multicast_info) {
		foe_compat_mc_copy(&info, data->multicast_info);
		data->retValue = airoha_ppe_mc_get_portmask(&info, data->index);
	}

	return ECNT_CONTINUE;
}

static struct ecnt_hook_ops foe_compat_ppe_ops = {
	.name = "airoha-native-ppe-multicast",
	.is_execute = 1,
	.hookfn = foe_compat_ppe_hook,
	.maintype = ECNT_PPE,
	.subtype = ECNT_DRIVER_PPE_API,
	.priority = 0,
};

static struct ecnt_hook_ops foe_compat_ppe_mcst_ops = {
	.name = "airoha-native-ppe-multicast-extended",
	.is_execute = 1,
	.hookfn = foe_compat_ppe_mcst_hook,
	.maintype = ECNT_PPE,
	.subtype = ECNT_DRIVER_PPE_API_MCST_EX,
	.priority = 0,
};

static int __init foe_compat_init(void)
{
	int err;

	ecnt_hook_init();
	err = ecnt_register_hook(&foe_compat_ppe_ops);
	if (err)
		return err;

	err = ecnt_register_hook(&foe_compat_ppe_mcst_ops);
	if (err)
		ecnt_unregister_hook(&foe_compat_ppe_ops);

	return err;
}

static void __exit foe_compat_exit(void)
{
	ecnt_unregister_hook(&foe_compat_ppe_mcst_ops);
	ecnt_unregister_hook(&foe_compat_ppe_ops);
}

module_init(foe_compat_init);
module_exit(foe_compat_exit);

MODULE_DESCRIPTION("Airoha legacy Foe/PPE compatibility hooks");
MODULE_LICENSE("GPL");
