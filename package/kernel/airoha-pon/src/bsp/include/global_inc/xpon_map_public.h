/***************************************************************
Copyright Statement:

This software/firmware and related documentation (“EcoNet Software”) 
are protected under relevant copyright laws. The information contained herein 
is confidential and proprietary to EcoNet (HK) Limited (“EcoNet”) and/or 
its licensors. Without the prior written permission of EcoNet and/or its licensors, 
any reproduction, modification, use or disclosure of EcoNet Software, and 
information contained herein, in whole or in part, shall be strictly prohibited.

EcoNet (HK) Limited  EcoNet. ALL RIGHTS RESERVED.

BY OPENING OR USING THIS FILE, RECEIVER HEREBY UNEQUIVOCALLY 
ACKNOWLEDGES AND AGREES THAT THE SOFTWARE/FIRMWARE AND ITS 
DOCUMENTATIONS (“ECONET SOFTWARE”) RECEIVED FROM ECONET 
AND/OR ITS REPRESENTATIVES ARE PROVIDED TO RECEIVER ON AN “AS IS” 
BASIS ONLY. ECONET EXPRESSLY DISCLAIMS ANY AND ALL WARRANTIES, 
WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE IMPLIED 
WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, 
OR NON-INFRINGEMENT. NOR DOES ECONET PROVIDE ANY WARRANTY 
WHATSOEVER WITH RESPECT TO THE SOFTWARE OF ANY THIRD PARTIES WHICH 
MAY BE USED BY, INCORPORATED IN, OR SUPPLIED WITH THE ECONET SOFTWARE. 
RECEIVER AGREES TO LOOK ONLY TO SUCH THIRD PARTIES FOR ANY AND ALL 
WARRANTY CLAIMS RELATING THERETO. RECEIVER EXPRESSLY ACKNOWLEDGES 
THAT IT IS RECEIVER’S SOLE RESPONSIBILITY TO OBTAIN FROM ANY THIRD 
PARTY ALL PROPER LICENSES CONTAINED IN ECONET SOFTWARE.

ECONET SHALL NOT BE RESPONSIBLE FOR ANY ECONET SOFTWARE RELEASES 
MADE TO RECEIVER’S SPECIFICATION OR CONFORMING TO A PARTICULAR 
STANDARD OR OPEN FORUM. RECEIVER'S SOLE AND EXCLUSIVE REMEDY AND 
ECONET'S ENTIRE AND CUMULATIVE LIABILITY WITH RESPECT TO THE ECONET 
SOFTWARE RELEASED HEREUNDER SHALL BE, AT ECONET'S SOLE OPTION, TO 
REVISE OR REPLACE THE ECONET SOFTWARE AT ISSUE OR REFUND ANY SOFTWARE 
LICENSE FEES OR SERVICE CHARGES PAID BY RECEIVER TO ECONET FOR SUCH 
ECONET SOFTWARE.
***************************************************************/

#ifndef _XPON_MAP_PUBLIC_H_
#define _XPON_MAP_PUBLIC_H_

/**
* \file  xpon_map_public.h
* \brief This file is xpon map public header file that will be exported for others to use.
* \author jun.wu
* \date     2020-09-22
* \version  A001 
* \copyright EcoNet Inc                                                              
*/

/************************************************************************
*		   I N C L U D E S
*************************************************************************
*/
#include <lan_port/lan_port_info.h>
#ifdef __KERNEL__
#include <linux/ioctl.h>
#else
#include <sys/ioctl.h>
#endif

/************************************************************************
*		   D E F I N E S	&	C O N S T A N T S
*************************************************************************
*/

/************************************************************************
* 		   M A C R O S
*************************************************************************
*/
/****************************************************************************************************

*************************************  DATA MACRO **************************************************

*****************************************************************************************************/
#define OUT
#define IN

#define ETH_ALEN                    6
#define PORT_NUM                    MAX_ECNT_ETHER_PORT_NUM
#define CLSFY_NUM_PER_PORT          64   //8  // the num of every port max classification rules
#define TRUE                        1
#define FALSE                       0
#define EPONMAP_ENABLE              1
#define EPONMAP_DISABLE             0

#define OP_NEVER_MATCH                  0x00
#define OP_EQUAL                        0x01
#define OP_NOT_EQUAL                    0x02
#define OP_LESS_THAN                    0x03
#define OP_GREATER_THAN                 0x04
#define OP_EXISTS                       0x05
#define OP_NOT_EXIST                    0x06
#define OP_ALWAYS_MATCH                 0x07
#define OP_NOT_SET                      0x08

#define LEVEL_ETHER             2
#define LEVEL_IP                3
#define LEVEL_TRANS             4

#define FIELD_DMAC              0x00
#define FIELD_SMAC              0x01
#define FIELD_PBIT              0x02
#define FIELD_VLANID            0x03
#define FIELD_ETHTYPE           0x04
#define FIELD_DIP4              0x05
#define FIELD_SIP4              0x06
#define FIELD_IPPROTO4          0x07
#define FIELD_IPDSCP4           0x08
#define FIELD_IPDSCP6           0x09
#define FIELD_SPORT             0x0A
#define FIELD_DPORT             0x0B
#define FIELD_IPVER             0x0C
#define FIELD_FLOWLABEL6        0x0D
#define FIELD_DIP6              0x0E
#define FIELD_SIP6              0x0F
#define FIELD_DIP6PREX          0x10
#define FIELD_SIP6PREX          0x11
#define FIELD_IPPROTO6          0x12
#define MAX_FIELD_NUM           19 // old is 14


/* -------------------------Qos Priority queue mapping to LLID's queue------------------------- */
#define PRIORITY_QUEUE_NUM_MAX  64
#define LLID_NUM_MAX            8
#define LLID_QUEUE_NUM_MAX      8

#define QUEUEMAP_ENABLE  1
#define QUEUEMAP_DISABLE 0

#define DEV_NAME_LEN 8

/* Public userspace ABI from libgponmap.h and libeponmap.h. */
#ifndef XPONMAP_IOC_MAGIC
#define XPONMAP_IOC_MAGIC 'a'
#define XPONMAP_MAJOR 210
#define XPONMAP_DEV "/dev/xponmap"

#define GEMPORT_MAPPING_ADD_ENTRY      _IOW(XPONMAP_IOC_MAGIC, 0, unsigned long)
#define GEMPORT_MAPPING_DEL_ENTRY      _IOW(XPONMAP_IOC_MAGIC, 1, unsigned long)
#define QUEUE_MAPPING_ADD_ENTRY        _IOW(XPONMAP_IOC_MAGIC, 2, unsigned long)
#define QUEUE_MAPPING_DEL_ENTRY        _IOW(XPONMAP_IOC_MAGIC, 3, unsigned long)
#define GEMPORT_MAPPING_DUMP_ALL_ENTRY _IOW(XPONMAP_IOC_MAGIC, 4, unsigned long)
#define QUEUE_MAPPING_DUMP_ALL_ENTRY   _IOW(XPONMAP_IOC_MAGIC, 5, unsigned long)
#define DOWNSTREAM_SWITCH_OPT          _IOW(XPONMAP_IOC_MAGIC, 6, unsigned long)
#define DOWNSTREAM_MAPPING_RULE_OPT    _IOW(XPONMAP_IOC_MAGIC, 7, unsigned long)
#define UPSTREAM_VLAN_POLICER_ADD_RULE _IOW(XPONMAP_IOC_MAGIC, 8, unsigned long)
#define UPSTREAM_VLAN_POLICER_DEL_RULE _IOW(XPONMAP_IOC_MAGIC, 9, unsigned long)

#define EPONMAP_IOC_ENABLE              _IOW(XPONMAP_IOC_MAGIC, 10, unsigned long)
#define EPONMAP_IOC_DISABLE             _IOW(XPONMAP_IOC_MAGIC, 11, unsigned long)
#define EPONMAP_IOC_DELETE              _IOW(XPONMAP_IOC_MAGIC, 12, unsigned long)
#define EPONMAP_IOC_ADD                 _IOW(XPONMAP_IOC_MAGIC, 13, unsigned long)
#define EPONMAP_IOC_CLEAR               _IOW(XPONMAP_IOC_MAGIC, 14, unsigned long)
#define EPONMAP_IOC_SHOW                _IOR(XPONMAP_IOC_MAGIC, 15, unsigned long)
#define EPONMAP_IOC_GETNUM              _IOR(XPONMAP_IOC_MAGIC, 16, unsigned long)
#define EPONMAP_IOC_GETRULE             _IOR(XPONMAP_IOC_MAGIC, 17, unsigned long)
#define EPONMAP_IOC_GETLLIDQ            _IOW(XPONMAP_IOC_MAGIC, 18, unsigned long)
#define EPONMAP_IOC_SETLLIDQ            _IOW(XPONMAP_IOC_MAGIC, 19, unsigned long)
#define EPONMAP_IOC_CLEARLLIDQ          _IOW(XPONMAP_IOC_MAGIC, 20, unsigned long)
#define EPONMAP_IOC_SHOWLLIDQ           _IOW(XPONMAP_IOC_MAGIC, 21, unsigned long)
#define EPONMAP_IOC_DBG_LVL             _IOW(XPONMAP_IOC_MAGIC, 22, unsigned long)
#define EPONMAP_IOC_RESETALL            _IOW(XPONMAP_IOC_MAGIC, 23, unsigned long)
#endif

#ifndef IOCTL_CMD
#define IOCTL_CMD 0xffffffffU
#endif

/************************************************************************
*		   D A T A   T Y P E S
*************************************************************************
*/

/************************************************************************
*		   D A T A   D E C L A R A T I O N S
*************************************************************************
*/
enum gponmap_status {
	GPONMAP_SUCCESS=0,
	GPONMAP_FAIL=1,
	GPONMAP_ENTRY_NOT_FOUND=2,
	GPONMAP_ENTRY_EXIST=3
};


#define MAX_GEM_PORT_NUM                        256
#define TRAFFIC_SHAPING_DISABLE					0
#define TRAFFIC_SHAPING_ENABLE					1

#ifndef OPT_ACTION
#define OPT_ACTION
typedef enum {
	OPT_GET = 0,
	OPT_SET = 1,
	OPT_DEL = 2,
	OPT_CLEAN = 3,
	OPT_CLEAN_ALL = 4,
	OPT_SHOW = 5,
}opt_act_t;
#endif

typedef struct uni_port_info_s{
	char dev_name[DEV_NAME_LEN];
	int unit_type;  /*G988, Table 9.1.5.1, 47(1G), 49(10G), 50(2.5G), 48(VEIP)*/
	int eth_type;       /*HGU Port(2), SFU Port(1), Auto Detect(0), this attribute only for hybrid*/
}uni_port_info_t, *uni_port_info_ptr;

/****************************************************************************************************

***********************************  DATA STRUCT  *****************************************************

******************************************************************************************************/
/* -----------------Qos classification rules and result structure for OAM & IOCTL----------------- */

typedef struct qosMatchRule_s
{
    uint8_t field;
    uint8_t op;
    union {
        uint8_t  v8;  // pbit / ipversion / ipproto /ipdscp4/ipdscp6
        uint16_t v16; // vid / ethertype / port
        uint32_t   ip4; // ipv4 / ipv6's flowlbl
        //struct in_addr ip4;
        uint8_t  mac[6];
        struct in6_addr ip6;
    };
}QosMatchRule_t, *QosMatchRule_Ptr;

typedef struct qosResult_s
{
        uint8_t precedence; // 1-255
        uint8_t queueMapped; // 0-7
        uint8_t priority;   // 0-7 or 0xFF 
}QosResult_t, *QosResult_Ptr;

typedef struct portllidmap_s
{

	uint8_t uni_port;
	uint8_t default_llid;
	uint32_t llid_mask;
	uint8_t enable;
        
}PortLlidMap_t, *PortLlidMap_Ptr;

typedef struct queueWeight_s
{
    uint8_t priQueue;
    uint8_t weight;
    uint8_t sla_enable;
}QueueWeight_t, *QueueWeight_Ptr;

typedef struct qosIOCtl_s
{
	uint8_t       portId;
	uint8_t       ruleIdx;
	uint8_t       matchNum;
	QosResult_t result;	
	QosMatchRule_t   matchs[MAX_FIELD_NUM];
}QosIOCtl_t, *QosIOCtl_Ptr;

typedef struct qosClsfyIOCtl_s
{
	uint8_t  portId;
	uint8_t  clsfyNum; // the port's clsfy rule num
}QosClsfyIOCtl_t, *QosClsfyIOCtl_Ptr;

typedef struct qosQueueMappingIOCtl_s
{
	uint8_t llid;
	uint8_t num;
	QueueWeight_t queueWts[LLID_QUEUE_NUM_MAX];
}QosQueueMappingIOCtl_t, *QosQueueMappingIOCtl_Ptr;

typedef struct PortInfoIOCtl_s
{
    uint8_t port_num;
	uni_port_info_t port_info[32];
}PortInfoIOCtl_t, *PortInfoIOCtl_Ptr;


/*
**********************************************************************************
gpon traffic class to GEM port mapping entry ioctl data structure.
**********************************************************************************
*/
typedef struct gemPortMappingIoctl_s{
        uint16_t tagCtl;
        uint8_t tagFlag;//0:untagged,1:tagged
        uint8_t userPort;//0xff: this value indicates all user ports.
        uint16_t aniPort;    
        uint16_t vid;
        uint8_t dscp;
        uint8_t pbit;
        uint16_t gemPort;    
}gemPortMappingIoctl_t, *gemPortMappingIoctl_ptr;


/*
**********************************************************************************
GEM port to priority queue mapping entry ioctl data structure.
**********************************************************************************
*/
typedef struct gponQueueMappingIoctl_s{
        uint32_t gemPort;
        uint8_t gemType;             /*gem type unicast, multicast*/
        uint8_t pqMode;              /*0--traffic scheduler, gemport-->specfic PQ; 1--traffic scheduler, gemport-->t-cont. via p-bit mapping PQ. */
        uint8_t tsEnable;            /*traffic shaping enable flag; 0--disable; 1--enable*/
        uint8_t tsChannelId; /*traffic shaping channel id(0-31)*/
        uint8_t queue;
        uint16_t allocId;
}gponQueueMappingIoctl_t, *gponQueueMappingIoctl_ptr;

typedef struct gpon_downstream_mapping_ioctl_s{
        uint16_t option_flag;
        uint16_t ds_pq_enable;
	    uint16_t ds_trtcm_enable;
        uint16_t downstream_mapping_switch;
        uint16_t gem_port_num;/*for 1g:0~4095:index of gem port; for 10g:0~65534:index of gem port*/
        //uint8_t If_Group[MAX_LAN_PORT];
        uint32_t if_mask;
        uint8_t queue;//0~7 mean the queue index,8 mean don't specify queue
        uint8_t trtcmId;
		uint8_t weight;
}gpon_downstream_mapping_ioctl, *gpon_downstream_mapping_ioctl_p;

typedef struct gpon_upstream_vlan_policer_ioctl_s{
        uint8_t   ethID;    // eth lan port number
        uint8_t   entryID;
        uint8_t   chanID;
        uint16_t  vid;
}gpon_upstream_vlan_policer_ioctl_t, * gpon_upstream_vlan_policer_ioctl_p;

/************************************************************************
*               F U N C T I O N   D E C L A R A T I O N S
                I N L I N E  F U N C T I O N  D E F I N I T I O N S
*************************************************************************
*/

#endif //_XPON_MAP_PUBLIC_H_
