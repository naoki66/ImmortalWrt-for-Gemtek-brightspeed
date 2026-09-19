/* SPDX-License-Identifier: GPL-2.0-only */
#ifndef _XPON_MAP_API_COMPAT_H_
#define _XPON_MAP_API_COMPAT_H_

/*
 * The vendor xpon_map source consumes these internal ECNT hook payloads, but
 * the SDK does not ship their public type header. Keep this compatibility
 * surface private to the in-tree mapping module; it is not a userspace ABI.
 */
#include <linux/skbuff.h>

#ifndef QOS_FILTER_MARK
#define QOS_FILTER_MARK 0x000000f0U
#endif

#ifndef GPON_FLOW_API_TYPE_UPSTREAM_ANI
enum {
	GPON_FLOW_API_TYPE_UPSTREAM_ANI = 0,
	GPON_FLOW_API_TYPE_UPSTREAM_UNI,
	GPON_FLOW_API_TYPE_DOWNSTREAM_UNI,
	GPON_FLOW_API_TYPE_DOWNSTREAM_ANI,
};
#endif

#ifndef GPON_FLOW_SUCCESS
#define GPON_FLOW_SUCCESS 0
#define GPON_FLOW_FAILURE (-1)
#define GPON_FLOW_NO_API (-2)
#endif

#ifndef XPON_MAPPING_GET_DWONSTREAM_UNI
enum {
	XPON_MAPPING_GET_DWONSTREAM_UNI = 0,
	XPON_MAPPING_GET_DWONSTREAM_UNI_EXT,
	XPON_MAPPING_GET_DWONSTREAM_TXQ,
};
#endif

#ifndef XPON_MAPPING_SUCCESS
#define XPON_MAPPING_SUCCESS 0
#define XPON_MAPPING_FAILURE (-1)
#define XPON_MAPPING_NO_API (-2)
#endif

#ifndef XPON_ETH_MAP_MARK_TO_PORT
enum {
	XPON_ETH_MAP_MARK_TO_PORT = 0,
	XPON_ETH_MAP_NAME_TO_PORT,
	XPON_ETH_MAP_PORT_TO_NAME,
	XPON_ETH_MAP_PORT_TO_ETH_TYPE,
};
#endif

#ifndef XPON_ETH_MAP_SUCCESS
#define XPON_ETH_MAP_SUCCESS 0
#define XPON_ETH_MAP_FAILURE (-1)
#define XPON_ETH_MAP_NO_API (-2)
#endif

/* ECNT subtype slots used only by the in-tree xpon_map hook registrations. */
#ifndef ECNT_GPON_FLOW_API
#define ECNT_GPON_FLOW_API 0
#endif
#ifndef ECNT_XPON_ETH_MAP
#define ECNT_XPON_ETH_MAP 1
#endif
#ifndef ECNT_XPON_MAPPING_API_TYPE_GET
#define ECNT_XPON_MAPPING_API_TYPE_GET 0
#endif

typedef struct {
	int api_type;
	struct sk_buff *skb;
	int ret;
} gpon_flow_api_data_t;

typedef struct {
	struct sk_buff *skb;
	int uni;
	void *txQos;
	int txq;
} xpon_mapping_ds_uni_data_t;

typedef struct {
	int cmd_id;
	xpon_mapping_ds_uni_data_t ds_uni;
	int ret;
} xpon_mapping_api_data_t;

typedef struct {
	int cmd_id;
	struct sk_buff *skb;
	char dev_name[DEV_NAME_LEN];
	int portid;
	int eth_type;
	int ret;
} port_info_api_data_t;

#endif
