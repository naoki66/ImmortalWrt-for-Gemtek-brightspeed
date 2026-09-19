/* SPDX-License-Identifier: GPL-2.0-only */
#ifndef _XPON_PON_VLAN_IOCTL_H_
#define _XPON_PON_VLAN_IOCTL_H_

#include <linux/ioctl.h>

/* ABI recovered from the matching vendor lib_pon_vlan.h userspace header. */
#define PONVLAN_IOC_MAGIC 'j'
#define PONVLAN_MAJOR 215

#define PONVLAN_IOC_SWITCH_OPT              _IOR(PONVLAN_IOC_MAGIC, 0, unsigned long)
#define PONVLAN_IOC_DOWNSTREAM_MODE_OPT     _IOR(PONVLAN_IOC_MAGIC, 1, unsigned long)
#define PONVLAN_IOC_TPID_OPT                _IOR(PONVLAN_IOC_MAGIC, 2, unsigned long)
#define PONVLAN_IOC_DEFAULT_RULE_FLAG_OPT   _IOR(PONVLAN_IOC_MAGIC, 3, unsigned long)
#define PONVLAN_IOC_RULE_OPT                _IOR(PONVLAN_IOC_MAGIC, 4, unsigned long)
#define PONVLAN_IOC_DSCP_MAP_OPT            _IOR(PONVLAN_IOC_MAGIC, 5, unsigned long)
#define PONVLAN_IOC_IGMP_VLAN_SWITCH_OPT    _IOR(PONVLAN_IOC_MAGIC, 6, unsigned long)
#define PONVLAN_IOC_IGMP_VLAN_MODE_OPT      _IOR(PONVLAN_IOC_MAGIC, 7, unsigned long)
#define PONVLAN_IOC_IGMP_VLAN_TCI_OPT       _IOR(PONVLAN_IOC_MAGIC, 8, unsigned long)
#define PONVLAN_IOC_IF_VLAN_SWITCH_OPT      _IOR(PONVLAN_IOC_MAGIC, 9, unsigned long)
#define PONVLAN_IOC_IF_VLAN_RULE_OPT        _IOR(PONVLAN_IOC_MAGIC, 10, unsigned long)
#define PONVLAN_IOC_DBG_LEVEL_OPT           _IOR(PONVLAN_IOC_MAGIC, 11, unsigned long)
#define PONVLAN_IOC_PCP_MODE_OPT            _IOR(PONVLAN_IOC_MAGIC, 12, unsigned long)
#define PONVLAN_IOC_MAC_BIND_VID_SWITCH_OPT _IOR(PONVLAN_IOC_MAGIC, 13, unsigned long)
#define PONVLAN_IOC_MAC_BIND_VID_TIME_OPT   _IOR(PONVLAN_IOC_MAGIC, 14, unsigned long)
#define PONVLAN_IOC_USER_GROUP_SWITCH_OPT   _IOR(PONVLAN_IOC_MAGIC, 15, unsigned long)
#define PONVLAN_IOC_USER_GROUP_RULE_OPT     _IOR(PONVLAN_IOC_MAGIC, 16, unsigned long)

#define PONVLAN_IOC_ADD_VLAN_FILTER_ENTRY   _IOR(PONVLAN_IOC_MAGIC, 20, unsigned long)
#define PONVLAN_IOC_GET_VLAN_FILTER_ENTRY   _IOR(PONVLAN_IOC_MAGIC, 21, unsigned long)
#define PONVLAN_IOC_DEL_VLAN_FILTER_ENTRY   _IOR(PONVLAN_IOC_MAGIC, 22, unsigned long)
#define PONVLAN_IOC_DISP_VLAN_FILTER_ENTRY  _IOR(PONVLAN_IOC_MAGIC, 23, unsigned long)
#define PONVLAN_IOC_VLAN_FILTER_DBG_LEVEL   _IOR(PONVLAN_IOC_MAGIC, 24, unsigned long)
#define PONVLAN_IOC_VEIP_SWITCH_OPT         _IOR(PONVLAN_IOC_MAGIC, 25, unsigned long)

/* cmd is already unsigned int on modern kernels; retain the vendor call site. */
#define IOCTL_CMD 0xffffffffU

#endif
