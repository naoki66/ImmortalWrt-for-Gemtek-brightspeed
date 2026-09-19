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
#ifndef _XPON_MAC_FILTER_PUBLIC_H_
#define _XPON_MAC_FILTER_PUBLIC_H_

/**
* \file  xpon_mac_filter_public.h
* \brief This file is xpon  mac filter public header file that will be exported for others to use.
* \author jun.wu
* \date     2020-09-22
* \version  A001 
* \copyright EcoNet Inc                                                              
*/

/************************************************************************
*		   I N C L U D E S
*************************************************************************
*/
#include "xpon_const.h"
#include "lan_port/ponvlan_port_info.h"
#include "lan_port/lan_port_info.h"
#include <linux/ioctl.h>

/************************************************************************
*		   D E F I N E S	&	C O N S T A N T S
*************************************************************************
*/

/************************************************************************
*		   M A C R O S
*************************************************************************
*/
#define MAC_FILTER_UNICAST_RULE_LIMIT		16
#define MAC_FILTER_MULTICAST_RULE_LIMIT	    16
#define MAC_FILTER_ANI_PORT_NUM	            GPON_MAX_ANI_INTERFACE
#define MODE_HGU                            0
#define MODE_SFU                            1
#define G988_936                            0
#define G988_937                            1
#define DISABLE                             0
#define ENABLE                              1
#define RULE_FORWARD                        0
#define RULE_DISCARD                        1
#define DES_MAC                             0
#define SRC_MAC                             1
#define PON_MAC_FILTER_UPSTREAM             0
#define PON_MAC_FILTER_DOWNSTREAM           1

#ifndef IOCTL_CMD
#define IOCTL_CMD                           0xffffffffU
#endif
#define PONMACFILTER_IOC_MAGIC              'k'
#define PONMACFILTER_MAJOR                  216
#define PONMACFILTER_IOC_SWITCH_OPT         _IOR(PONMACFILTER_IOC_MAGIC, 0, unsigned long)
#define PONMACFILTER_IOC_RULE_OPT           _IOR(PONMACFILTER_IOC_MAGIC, 1, unsigned long)
#define PONMACFILTER_IOC_DBG_LEVEL_OPT      _IOR(PONMACFILTER_IOC_MAGIC, 2, unsigned long)


/************************************************************************
*		   D A T A   T Y P E S
*************************************************************************
*/

/************************************************************************
*		   D A T A   D E C L A R A T I O N S
*************************************************************************
*/
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

typedef struct pon_mac_filter_rule_s
{
	uint8_t filter_type;//0:forward 1:discard
	uint8_t mac_type;//0:des mac 1:src mac
	uint16_t ethertype;//0:don't care
	uint8_t start_mac[6];
	uint8_t end_mac[6];
}pon_mac_filter_rule, *pon_mac_filter_rule_p;

typedef struct pon_mac_filter_ioctl_data_s
{
	uint8_t option_flag;//0:get 1:set 2:del 3: clean 4:clean all 5:show

	uint8_t direction;//0:upstream,set rule on ANI port. 1:downstream,set rule on UNI port
	uint8_t ani_index;//0~31:ani port index
	uint8_t uni_index;//11~14:lan1~4  21~24:wlan 1~4  31:usb
	uint8_t rule_type;//0:unicast rule 1:multicast
	uint8_t rule_index;
	uint8_t enable_flag;	
	uint8_t dbg_level;	
	pon_mac_filter_rule rule;
}pon_mac_filter_ioctl_data, *pon_mac_filter_ioctl_data_p;


/************************************************************************
*               F U N C T I O N   D E C L A R A T I O N S
                I N L I N E  F U N C T I O N  D E F I N I T I O N S
*************************************************************************
*/

#endif
