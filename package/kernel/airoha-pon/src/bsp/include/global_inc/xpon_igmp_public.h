/***************************************************************
Copyright Statement:

This software/firmware and related documentation (揈coNet Software? 
are protected under relevant copyright laws. The information contained herein 
is confidential and proprietary to EcoNet (HK) Limited (揈coNet? and/or 
its licensors. Without the prior written permission of EcoNet and/or its licensors, 
any reproduction, modification, use or disclosure of EcoNet Software, and 
information contained herein, in whole or in part, shall be strictly prohibited.

EcoNet (HK) Limited  EcoNet. ALL RIGHTS RESERVED.

BY OPENING OR USING THIS FILE, RECEIVER HEREBY UNEQUIVOCALLY 
ACKNOWLEDGES AND AGREES THAT THE SOFTWARE/FIRMWARE AND ITS 
DOCUMENTATIONS (揈CONET SOFTWARE? RECEIVED FROM ECONET 
AND/OR ITS REPRESENTATIVES ARE PROVIDED TO RECEIVER ON AN 揂S IS?
BASIS ONLY. ECONET EXPRESSLY DISCLAIMS ANY AND ALL WARRANTIES, 
WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE IMPLIED 
WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, 
OR NON-INFRINGEMENT. NOR DOES ECONET PROVIDE ANY WARRANTY 
WHATSOEVER WITH RESPECT TO THE SOFTWARE OF ANY THIRD PARTIES WHICH 
MAY BE USED BY, INCORPORATED IN, OR SUPPLIED WITH THE ECONET SOFTWARE. 
RECEIVER AGREES TO LOOK ONLY TO SUCH THIRD PARTIES FOR ANY AND ALL 
WARRANTY CLAIMS RELATING THERETO. RECEIVER EXPRESSLY ACKNOWLEDGES 
THAT IT IS RECEIVER扴 SOLE RESPONSIBILITY TO OBTAIN FROM ANY THIRD 
PARTY ALL PROPER LICENSES CONTAINED IN ECONET SOFTWARE.

ECONET SHALL NOT BE RESPONSIBLE FOR ANY ECONET SOFTWARE RELEASES 
MADE TO RECEIVER扴 SPECIFICATION OR CONFORMING TO A PARTICULAR 
STANDARD OR OPEN FORUM. RECEIVER'S SOLE AND EXCLUSIVE REMEDY AND 
ECONET'S ENTIRE AND CUMULATIVE LIABILITY WITH RESPECT TO THE ECONET 
SOFTWARE RELEASED HEREUNDER SHALL BE, AT ECONET'S SOLE OPTION, TO 
REVISE OR REPLACE THE ECONET SOFTWARE AT ISSUE OR REFUND ANY SOFTWARE 
LICENSE FEES OR SERVICE CHARGES PAID BY RECEIVER TO ECONET FOR SUCH 
ECONET SOFTWARE.
***************************************************************/
#ifndef _XPON_IGMP_PUBLIC_H_
#define _XPON_IGMP_PUBLIC_H_

/**
* \file  xpon_igmp_public.h
* \brief This file is xpon igmp public header file that will be exported for others to use.
* \author jun.wu
* \date     2020-09-22
* \version  A001 
* \copyright EcoNet Inc                                                              
*/

/************************************************************************
*		   I N C L U D E S
*************************************************************************
*/
#include "lan_port/lan_port_info.h"


/************************************************************************
*		   D E F I N E S	&	C O N S T A N T S
*************************************************************************
*/
#define OMCI_IPV4_PROTOCOL 0 
#define OMCI_IPV6_PROTOCOL 1

/************************************************************************
* 		   M A C R O S
*************************************************************************
*/
#define XPON_IGMP_CMD			                    1000
#define XPON_IGMP_GET_VER				            1001
#define XPON_IGMP_SET_VER				            1002
#define XPON_IGMP_GET_FUNC			                1003
#define XPON_IGMP_SET_FUNC			                1004
#define XPON_IGMP_GET_FASTLEAVE		                1005
#define XPON_IGMP_SET_FASTLEAVE		                1006
#define XPON_IGMP_GET_UPTCI			                1007
#define XPON_IGMP_SET_UPTCI			                1008
#define XPON_IGMP_GET_UPTAGCTL		                1009
#define XPON_IGMP_SET_UPTAGCTL		                1010
#define XPON_IGMP_GET_DOWNTCI		                1011
#define XPON_IGMP_SET_DOWNTCI		                1012
#define XPON_IGMP_GET_DOWNTAGCTL	                1013
#define XPON_IGMP_SET_DOWNTAGCTL	                1014
#define XPON_IGMP_GET_MAXRATE		                1015
#define XPON_IGMP_SET_MAXRATE		                1016
#define XPON_IGMP_GET_ROBUST			            1017
#define XPON_IGMP_SET_ROBUST			            1018
#define XPON_IGMP_GET_UNAUTHOR		                1019
#define XPON_IGMP_SET_UNAUTHOR		                1020
#define XPON_IGMP_GET_QUERYIP		                1021
#define XPON_IGMP_SET_QUERYIP		                1022
#define XPON_IGMP_GET_QUERYINTERVAL	                1023
#define XPON_IGMP_SET_QUERYINTERVAL	                1024
#define XPON_IGMP_GET_LASTINTERVAL	                1025
#define XPON_IGMP_SET_LASTINTERVAL	                1026
#define XPON_IGMP_GET_QUERYMAXRESP	                1027
#define XPON_IGMP_SET_QUERYMAXRESP	                1028
#define XPON_IGMP_GET_MAXPLAYGROUP	                1029
#define XPON_IGMP_SET_MAXPLAYGROUP	                1030
#define XPON_IGMP_GET_TAGSTRIP			            1031
#define XPON_IGMP_SET_TAGSTRIP			            1032
#define XPON_IGMP_GET_PORTFLAG			            1033
#define XPON_IGMP_SET_PORTFLAG			            1034

#define XPON_IGMP_GET_MAXBANDWIDTH	                1035
#define XPON_IGMP_SET_MAXBANDWIDTH	                1036
#define XPON_IGMP_GET_BWENFORCEMENT	                1037
#define XPON_IGMP_SET_BWENFORCEMENT	                1038
#define XPON_IGMP_GET_COUNTER_CURRENT_MCAST_BW      1039
#define XPON_IGMP_GET_COUNTER_JOIN_MSG	            1040
#define XPON_IGMP_GET_COUNTER_BW_EXCEEDED           1041
#define XPON_IGMP_GET_USER_SUBSCRIBE_CNT            1042
#define XPON_IGMP_GET_USER_SUBSCRIBE_BY_INDEX       1043
#define XPON_IGMP_GET_VEIP_ACL                      1044
#define XPON_IGMP_SET_VEIP_ACL                      1045
#define XPON_IGMP_GET_EMPTRY_DYNLIST_PASS           1046
#define XPON_IGMP_SET_EMPTRY_DYNLIST_PASS           1047

#define XPON_IGMP_ADD_DYNWHITELIST			        2001
#define XPON_IGMP_DEL_DYNWHITELIST			        2002
#define XPON_IGMP_CLEAR_DYNWHITELIST			    2003
#define XPON_IGMP_GET_DYNWHITELISTCNT		        2004
#define XPON_IGMP_GET_DYNWHITELIST			        2005
#define XPON_IGMP_ADD_STAWHITELIST			        2006
#define XPON_IGMP_DEL_STAWHITELIST			        2007
#define XPON_IGMP_CLEAR_STAWHITELIST			    2008
#define XPON_IGMP_GET_STAWHITELISTCNT		        2009
#define XPON_IGMP_GET_STAWHITELIST			        2010

#define XPON_IGMP_ADD_PORTVLAN			            3001
#define XPON_IGMP_DEL_PORTVLAN			            3002
#define XPON_IGMP_CLEAR_PORTVLAN		            3003
#define XPON_IGMP_GET_PORTVLANCNT		            3004
#define XPON_IGMP_GET_PORTVLANID		            3005
#define XPON_IGMP_SET_VLANSWITCHVID	                3006
#define XPON_IGMP_SET_PORTVLANFLAG	                3007
#define XPON_IGMP_GET_PORTVLANFLAG	                3008


#define XPON_IGMP_ADD_FWDENTRY		                4001
#define XPON_IGMP_DEL_FWDENTRY		                4002
#define XPON_IGMP_GET_FWDENTRYCNT	                4003
#define XPON_IGMP_GET_FWDENTRY		                4004
#define XPON_IGMP_CLEAR_FWDENTRY	                4005
#define XPON_IGMP_SET_FWDMODE		                4006
#define XPON_IGMP_GET_FWDMODE		                4007

#define XPON_IGMP_ADD_MULVLAN		                5001
#define XPON_IGMP_DEL_MULVLAN		                5002
#define XPON_IGMP_CLEAR_MULVLAN		                5003
#define XPON_IGMP_GET_MULVLANCNT	                5004
#define XPON_IGMP_GET_MULVLANID		                5005
#define XPON_IGMP_SET_MULVLANFLAG	                5006
#define XPON_IGMP_GET_MULVLANFLAG	                5007

#define XPON_IGMP_GET_IGMPFLAG		                6001
#define XPON_IGMP_SET_IGMPFLAG		                6002
#define XPON_IGMP_GET_XPONMODE		                6003
#define XPON_IGMP_SET_XPONMODE		                6004
#define XPON_IGMP_GET_ONUTYPE		                6005
#define XPON_IGMP_SET_DEBUG			                6006
#define XPON_IGMP_CLEAR_HW_ENTRY                    6007
#define XPON_IGMP_CLEAR_HW_DROP_ENTRY               6008
#define XPON_IGMP_SET_DS_BW_CTRL                    6009
#define XPON_IGMP_GET_GROUPNUM		                6010
#define XPON_IGMP_SET_GROUPNUM		                6011
#define XPON_IGMP_SET_CARE_DY_ST_VER                6012
#define XPON_IGMP_CLEAR_ALL                         6013
#define XPON_IGMP_SHOW_HW_ENTRY                     6014
#define XPON_IGMP_SET_LAST_QUERY_CNT                6015
#define XPON_IGMP_GET_LAST_QUERY_CNT                6016


/************************************************************************
*		   D A T A   T Y P E S
*************************************************************************
*/

/************************************************************************
*		   D A T A   D E C L A R A T I O N S
*************************************************************************
*/
typedef struct xPON_User_Subscribe_Temp_s
{
    short int index;
	unsigned char srcip[16];
	unsigned char program_ip[16];
}xPON_User_Subscribe_Temp_t;

typedef struct xPON_Whitelist_Entry_s
{
	int idx;
	int index;
	int type;
	int gem;
	int vid;
	int band;
	unsigned char srcip[16];
	unsigned char startip[16];
	unsigned char endip[16];
	unsigned short int pre_len;
	unsigned short int pre_rep_time;
	unsigned short int pre_rep_cnt;
	unsigned short int pre_rst_time;
}xPON_Whitelist_Entry_t;

typedef struct xPON_MVLanSwitch_Entry_s
{
	int idx;
	int vid;
	int newvid;
} xPON_MVLanSwitch_Entry_t;

typedef struct xPON_Forward_Entry_s
{
	int type;
	int port;
	int vid;
	unsigned char grp_addr[16];
	unsigned char src_ip[16];
	int flag;
	unsigned char client_ip[16];
	unsigned long join_time;
	int ruleType; //static or dynamic
} xPON_Forward_Entry_t;


typedef struct xPON_IGMP_Ioctl_s
{
	unsigned int subcmd;
	unsigned int argv1;
	unsigned long argv2;
}xPON_IGMP_Ioctl_t;
/*XPON igmp multcast control type*/
typedef enum {
	MULTCASTCTL_MAC_DA = 0x00,
 	MULTCASTCTL_MAC_DA_VLAN,
 	MULTCASTCTL_IPV4_SA_MAC_DA,
 	MULTCASTCTL_IPV4_DA_VLAN,
	MULTCASTCTL_IPV6_DA_VLAN,
	MULTCASTCTL_IPV6_SA_MAC_DA,
	MULTCASTCTL_IPV4_DA = 0xFE,
	MULTCASTCTL_IPV6_DA = 0xFF
} xPON_IGMP_MULT_CTL_TYPE ;


typedef enum{
    MULTCAST_SNOOPING_MODE = 0x00,
    MULTCAST_CONTROL_MODE = 0x01,

}xPONIGMP_MULT_MODE_TYPE;

typedef enum{
    MULTCAST_UPTAG_TRANSPARENT = 0x00,
    MULTCAST_UPTAG_ADD,
    MULTCAST_UPTAG_REPLACE_VID_PID,
    MULTCAST_UPTAG_REPLACE_VID

}xPONIGMP_MULT_UPTAG_MODE;

typedef struct out_fwdtbl_s{
	int i;
	int port;
	int vid;
	char grp_str[64];
}out_fwdtbl_t;

/************************************************************************
*               F U N C T I O N   D E C L A R A T I O N S
                I N L I N E  F U N C T I O N  D E F I N I T I O N S
*************************************************************************
*/

#endif /* _XPON_IGMP_PUBLIC_H_ */
