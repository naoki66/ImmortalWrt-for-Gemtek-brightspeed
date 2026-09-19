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
#ifndef _XPON_PON_VLAN_PUBLIC_H_
#define _XPON_PON_VLAN_PUBLIC_H_

/**
* \file  xpon_pon_vlan_public.h 
* \brief This file is xpon pon vlan public header file that will be exported for others to use.
* \author jun.wu
* \date     2020-09-22
* \version  A001 
* \copyright EcoNet Inc                                                              
*/

/************************************************************************
*		   I N C L U D E S
*************************************************************************
*/
#include "lan_port/ponvlan_port_info.h"
#include "lan_port/lan_port_info.h"

/************************************************************************
*		   D E F I N E S	&	C O N S T A N T S
*************************************************************************
*/

/************************************************************************
* 		   M A C R O S
*************************************************************************
*/
#define ENABLE          1
#define DISABLE         0
#define MODE_EPON       2
#define DOWNSTREAM_MODE_FORWARD 0
#define DOWNSTREAM_MODE_DISCARD 1


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

#define	PON_VLAN_ITF_NAME_SIZE                  16
#define HYBRID_WAN_VLAN_ID 						0

#define GPON_VLAN_FILTR_PORT_TYPE_LAN	        0
#define GPON_VLAN_FILTR_PORT_TYPE_ANI	        1
#define GPON_VLAN_FILTR_TYPE_UNTAGGED	        (1<<0)
#define GPON_VLAN_FILTR_TYPE_TAGGED		        (1<<1)
#define GPON_VLAN_FILTR_TYPE_TAGGED_UNTAGGED    (GPON_VLAN_FILTR_TYPE_TAGGED | GPON_VLAN_FILTR_TYPE_UNTAGGED)
#define GPON_VLAN_FILTER_ACTION_BRIDGE	        0
#define GPON_VLAN_FILTER_ACTION_DISCARD	        1
#define GPON_VLAN_FILTER_ACTION_G_VID	        21
#define GPON_VLAN_FILTER_ACTION_G_PBIT	        22
#define GPON_VLAN_FILTER_ACTION_G_TCI	        23
#define GPON_VLAN_FILTER_ACTION_H_VID	        31
#define GPON_VLAN_FILTER_ACTION_H_PBIT	        32
#define GPON_VLAN_FILTER_ACTION_H_TCI	        33
#define GPON_VLAN_FILTER_ACTION_J_VID		    41
#define GPON_VLAN_FILTER_ACTION_J_PBIT	        42
#define GPON_VLAN_FILTER_ACTION_J_TCI		    43
#define MAX_GPON_VLAN_FILTER_LIST 		        12
#define MAX_GPON_VLAN_FILTER_LIST_BYTES	        24


/************************************************************************
*		   D A T A   T Y P E S
*************************************************************************
*/

/************************************************************************
*		   D A T A   D E C L A R A T I O N S
*************************************************************************
*/
enum gponVlanFilter_status {
	GPON_VLAN_FILTER_SUCCESS=0,
	GPON_VLAN_FILTER_FAIL=1,
	GPON_VLAN_FILTER_ENTRY_NOT_FOUND=2,
	GPON_VLAN_FILTER_ENTRY_EXIST=3,
	GPON_VLAN_FILTER_HANDLE_RESULT_FILTER_TYPE=4, //execute discard function
	GPON_VLAN_FILTER_HANDLE_RESULT_FORWARD_TYPE=5,//execute forward function
};
/****************************************************************************
                   EPON   DATA MACRO
****************************************************************************/

#define EPON_VLAN_RULE_MAX_NUM 1  /* Only 1 tag for CT standard. */

typedef enum{
	EPON_VLAN_OP_ADD,
	EPON_VLAN_OP_DEL,
	EPON_VLAN_OP_CLR_PORT,
	EPON_VLAN_OP_CLR_ALL,
	EPON_VLAN_OP_CLR_HWNAT,
}EPON_OP_TYPE_E;

typedef enum{
	EPON_VLAN_TR_PASS,
	EPON_VLAN_TR_DROP,
	EPON_VLAN_TR_ADD_ONE,
	EPON_VLAN_TR_STRIP_ONE,
	EPON_VLAN_TR_TRANS,
}EPON_TREATMENT_TYPE_E;

typedef enum{
	EPON_VLAN_MASK_VID=0x1,
	EPON_VLAN_MASK_CFI=0x2,
	EPON_VLAN_MASK_PRI=0x4,
	EPON_VLAN_MASK_TPID=0x8,
}EPON_COMPARE_MASK_E;

typedef enum{
	EPON_VLAN_DIR_UP,
	EPON_VLAN_DIR_DOWN
}EPON_DIR_TYPE_E;


/*
**********************************************************************************
vlan filter  data structure.
**********************************************************************************
*/


typedef struct pon_vlan_rule_s
{
	//Only used in tag_num = 2,filter outer Tag info
	uint32_t filter_outer_tpid;//0:don't care, 1:0x8100 2:input TPID (downstrean 3:output TPID)
	uint8_t filter_outer_pri;//0~7:pbit value  8:don't care
	uint8_t filter_outer_dei;//0,1:DEI value 2:don't care
	uint16_t filter_outer_vid;//0~4095:VID 4096:don't care
	
	//used in tag_num = 1 or 2.If Tag Num = 2,this field is
	//filter inner tag Info.
	uint32_t filter_inner_tpid;
	uint8_t filter_inner_pri;
	uint8_t filter_inner_dei;
	uint16_t filter_inner_vid;

	//used in downstream direction and tagNum is 4
	uint32_t down_filter_outer_tpid;
	uint8_t down_filter_outer_pri;
	uint8_t down_filter_outer_dei;
	uint16_t down_filter_outer_vid;
	
	//used in downstream direction and tagNum is 3
	uint32_t down_filter_inner_tpid;
	uint8_t down_filter_inner_pri;
	uint8_t down_filter_inner_dei;
	uint16_t down_filter_inner_vid;
	
	uint8_t tag_num;//0~5 	(downstream 3,4 mean tagNum 5:ignore this entry)
	uint16_t filter_ethertype;//0x0000 :Don't care. Other value mean true Ethertype.0x0800 mean IPoE frames

	/*
	0:transparent
	1:block
	2x:x=1,2. Add x Tag(s) or 23:add a Tag and modify original outer tag(use add_sec field to store change info)
	3x:x=1,2. Del x Tag(s) or 33:del a Tag and modify original inner tag(use add_sec field to store change info)
	4x:x=0,1,2. 40:change inner Tag. 41:change outer Tag. 42:change two tags.
	treatment_method should be set 40 if you want change tag when packet only have one tag.
	If packet has 2 tags and you only want to change outer tag,you should config Add_Sec_XXX to support this func.
	*/
	uint8_t treatment_method;

	//used when treatment_method = 2 and Add_Num = 1 or 2
	//this field indicate how to add first Tag.
	uint32_t add_fst_tpid;//0:0x8100 1:output TPID 2:copy from inner tag 3:copy from outer tag	(downstream 4:input TPID)
	uint8_t add_fst_pri;//0~7 pbit value . 8:copy from inner tag 9:copy from outer tag 10:derive pbit from DSCP
	uint8_t add_fst_dei;//0,1:DEI value 2:copy from inner tag 3:copy from outer tag
	uint16_t add_fst_vid;//0~4095 VID value 4096:copy from inner tag 4097:copy from outer tag

	//used when treatment_method = 2 and Add_Num = 2
	//this field indicate how to add second Tag.
	uint32_t add_sec_tpid;
	uint8_t add_sec_pri;
	uint8_t add_sec_dei;
	uint16_t add_sec_vid;
	
	uint32_t rule_priority;//0:high 1:low
	uint8_t rule_complexity;
}pon_vlan_rule,*pon_vlan_rule_p;

typedef struct pon_vlan_trace_drop_s
{
    uint8_t src_mac[6];
    uint8_t dst_mac[6];
    uint16_t inner_vid;
    uint16_t outer_vid;
    int check_mark;
}pon_vlan_trace_drop, *pon_vlan_trace_drop_p;

typedef struct pon_vlan_ioctl_s
{
	/*
	PortNumDefine
	00:CPE	01~09 reserved
	11~14: lan port 1~4.	10,15~19 reserved
	21~24: wlan port 1~4. 20,25~29 reserved
	30:usb?not uesd
	40:default rule
	-1 error
	*/
	int port;

	// 0:disable igmp tagging.Handle igmp packet as general packet.
	// 1:enable igmp tagging.Tagging igmp packet follow igmp_mode.
	uint8_t igmp_enable;
	
	/*
	0: Pass upstream IGMP traffic transparently.
	1: Add tag.TPID=0x8100.TCI = igmp_tci.
	2: Replace TCI field with igmp_tci.If original frame is untagged.Add a tag,TPID = 0x8100 & tci = igmp_tci.
	3: Replace VID field with the VID field in igmp_tci.If original frame is untagged.Add a tag,TPID = 0x8100 & tci = igmp_tci.
	*/
	uint8_t igmp_mode;
	uint16_t igmp_tci;

	// 0:disable vlan tagging.
	// 1:enable vlan tagging.
	uint8_t vlan_enable;
	uint8_t veip_vlan_enable; 
	uint8_t rule_index;//vlan rule index.
	uint8_t option_flag;//0:get 1:set 2:del 3: clean 4:show
	uint8_t tpid_type;//flag for type of tpid.0:add special ethertype to linux kernel ethertype list. 1:set the input and output tpid in the rule
	uint16_t special_tpid;//any value but the one has been used.
	uint16_t input_tpid;
	uint16_t output_tpid;
	uint32_t dscp_map[6];//24byte map
	uint8_t downstream_mode;//0:transparent 1:do inverse option 2:stripped outer tag
	uint8_t default_vlan_rule_flag;//0:not use default vlan when no rule in this port. 1:use default when no rule in this port.

	uint8_t if_vlan_switch;//0:disable 1:enable
	uint8_t dev_name[9];//name is like nasx_y
	uint16_t dev_vid;//allowed VID on Interface,VID = 4097 mean discard all packet, VID = 4096 mean forward all packet.default value is 4097.

	uint8_t pcp_mode;//0:8P0D 1:7P1D   2:6P2D  3:5P3D

	uint8_t mac_bind_vid_enable;
	int mac_vlan_time;

	uint8_t user_group_enable;
	uint32_t user_group;
	
	uint8_t dbg_level;//0:low, only can see error message  1:medium,can see result of operation 2:high,can see lots of info when do the operation
	int uni_filter_enable;
	pon_vlan_rule rule;
	pon_vlan_trace_drop trace_pkt_info;

	int hy_enable;		//enable hybrid mode
	char hy_sfu_br_wan[PON_VLAN_ITF_NAME_SIZE];	//set bridge wan for hybrid mode
	char hy_sfu_lan[PON_VLAN_ITF_NAME_SIZE];	//set lan interface which in SFU mode
	unsigned int hy_port_mask;  //for get,  the port mask which enable hybrid
	
	uint8_t ds_bcast_1toN_enable;
	uint8_t downstream_unmatch_oper;	//0: foward, 1: discard 
	uint8_t	resort_enable; 
}pon_vlan_ioctl, *pon_vlan_ioctl_p;



typedef struct pon_vlan_epon_ioctl_s{
	uint32_t op :3 ;		/* set or clear rules. */
	uint32_t method :5 ;	/* vlan treatment. */
	uint32_t dir :1 ;		/* indicate rule for upstream or downstream. */
	uint32_t num :2 ;		/* origin frame tag num */
	uint32_t index :5 ;	/* rule index of current port */
	uint32_t mask :4 ;		/* field mask for match options. 0x1, compare vid; 0x2,compare cfi; 0x4,compare pri; 0x8,compare tpid. */
	uint32_t resv :12 ;	/* reserved. */
	uint32_t	port;			/* pon vlan port index. */
	uint32_t   old_tags[EPON_VLAN_RULE_MAX_NUM];
	uint32_t   new_tags[EPON_VLAN_RULE_MAX_NUM];
}pon_vlan_epon_ioctl, *pon_vlan_epon_ioctl_p;


typedef struct gponVlanFilterIoctl_s{
	uint16_t port; //LAN port 0~3, ANI port: 0~31
	uint8_t portType;//0:LAN port, 1:ANI port
	uint8_t type; //bit0::set for untagged frame, bit1:set for tagged frame
	uint8_t untaggedAction; //0:bridge, 1:discard
	/*
		0:bridge, 
		1:discard, 		
		21: when egress frame match vid in vlan list, then filter, others is forward.(Action g)
		22: when egress frame match pbit in vlan list, then filter, others is forward.(Action g)
		23: when egress frame match TCI in vlan list, then filter, others is forward.(Action g)		
		31: when ingress frame match vid in vlan list, then bridge, others is filter.(Action h)
		     when egress frame match vid in vlan list, then bridge, others is filter.
		32:when ingress frame match pbit in vlan list, then bridge, others is filter.(Action h)
		     when egress frame match pbit in vlan list, then bridge, others is filter.
		33:when ingress frame match TCI in vlan list, then bridge, others is filter.(Action h)
		     when egress frame match TCI in vlan list, then bridge, others is filter.
		41:when egress frame match vid in vlan list, then forward, others is filter.(Action j)
		42:when egress frame match pbit in vlan list, then forward, others is filter.(Action j)
		43:when egress frame match TCI in vlan list, then forward, others is filter.(Action j)
	*/
	uint8_t taggedAction;
	uint8_t maxValidVlanListNum; //max valid number in vlan list.
	uint8_t cleanFlag;
	uint16_t vlanList[MAX_GPON_VLAN_FILTER_LIST];
}gponVlanFilterIoctl_t, *gponVlanFilterIoctl_ptr;

/************************************************************************
*               F U N C T I O N   D E C L A R A T I O N S
                I N L I N E  F U N C T I O N  D E F I N I T I O N S
*************************************************************************
*/

#endif

