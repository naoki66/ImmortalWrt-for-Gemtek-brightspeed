# SPDX-License-Identifier: GPL-2.0-only

include $(TOPDIR)/rules.mk
include $(INCLUDE_DIR)/kernel.mk

PKG_NAME:=airoha-pon
PKG_RELEASE:=1
PKG_LICENSE:=GPL-2.0-only
PKG_MAINTAINER:=coolsnowwolf <coolsnowwolf@gmail.com>

include $(INCLUDE_DIR)/package.mk

AIROHA_PON_SOURCE_DIR:=$(TOPDIR)/package/kernel/airoha-pon

define KernelPackage/airoha-pon/Default
  SUBMENU:=Network Devices
  DEPENDS:=+kmod-i2c-core
  KCONFIG:=
endef

define KernelPackage/airoha-i2c
  $(call KernelPackage/airoha-pon/Default)
  DEPENDS+=@(TARGET_airoha_an7581||TARGET_airoha_an7583)
  TITLE:=Airoha SIF/I2C controller
  FILES:=$(PKG_BUILD_DIR)/i2c-airoha/i2c-airoha.ko
  AUTOLOAD:=$(call AutoLoad,12,i2c-airoha)
endef

define KernelPackage/airoha-i2c/description
  Airoha SIF-compatible I2C host controller used by xPON and board sensors.
endef

define KernelPackage/airoha-gpon-en757x
  $(call KernelPackage/airoha-pon/Default)
  DEPENDS+=@TARGET_airoha_en7523
  TITLE:=Airoha EN757x GPON driver (v1)
  FILES:= \
	$(PKG_BUILD_DIR)/gpon-en757x/xpon_phy/phy.ko \
	$(PKG_BUILD_DIR)/gpon-en757x/xpon/xpon.ko
  AUTOLOAD:=$(call AutoProbe,phy xpon)
endef

define KernelPackage/airoha-gpon-en757x/description
 Kernel modules for the v1 Airoha EN7570 and EN7571 GPON MAC and PHY.
endef

define KernelPackage/airoha-xpon-en757x
  $(call KernelPackage/airoha-pon/Default)
  DEPENDS+=@TARGET_airoha_an7581_DEVICE_gemtek_xg2010g-ubi +kmod-airoha-i2c
  KCONFIG:=CONFIG_AIROHA_PON_COMPAT=y
  TITLE:=Airoha EN757x xPON driver (v2)
  FILES:= \
	$(PON_BSP_DIR)/airoha_ecnt_hook.ko \
	$(PON_BSP_DIR)/airoha_ecnt_scu.ko \
	$(PON_BSP_DIR)/airoha_ecnt_xpon.ko \
	$(PON_BSP_DIR)/airoha_ecnt_pon_phy.ko \
	$(PON_BSP_DIR)/airoha_ecnt_olt_phy.ko \
	$(PON_BSP_DIR)/airoha_arht_board.ko \
	$(PON_BSP_DIR)/airoha_arht_serdes.ko \
	$(PON_BSP_DIR)/airoha_an7583_combo_phy.ko \
	$(PKG_BUILD_DIR)/xpon-en757x/xpon_phy_10g/phy_10g.ko \
	$(PKG_BUILD_DIR)/xpon-en757x/xpon_10g/xpon_10g.ko
  AUTOLOAD:=$(call AutoProbe,airoha_ecnt_hook airoha_ecnt_scu airoha_ecnt_xpon airoha_ecnt_pon_phy airoha_arht_board airoha_arht_serdes phy_10g)
endef

define KernelPackage/airoha-xpon-en757x/description
 Kernel modules for the v2 Airoha EN7581 and AN7583 GPON and EPON MAC and PHY.
endef

define KernelPackage/airoha-pon-plugins
  $(call KernelPackage/airoha-pon/Default)
  DEPENDS+=@TARGET_airoha_an7581_DEVICE_gemtek_xg2010g-ubi +kmod-airoha-xpon-en757x +airoha-pon-firmware
  TITLE:=Airoha EN7572 xPON helper plugins
  FILES:= \
	$(PON_PLUGIN_DIR)/econet_bob/econet_bob.ko \
	$(PON_PLUGIN_DIR)/en7572/en7572.ko
  AUTOLOAD:=$(call AutoLoad,90,econet_bob en7572)
endef

define KernelPackage/airoha-pon-plugins/description
 EN7572 LDDLA optical frontend and BoB calibration loader for Gemtek XG2010G.
endef

define KernelPackage/airoha-pon-dataplane
  $(call KernelPackage/airoha-pon/Default)
  DEPENDS+=@TARGET_airoha_an7581_DEVICE_gemtek_xg2010g-ubi +kmod-airoha-xpon-en757x
  TITLE:=Airoha xPON VLAN, MAC filter and mapping plugins
  FILES:= \
	$(PON_PLUGIN_DIR)/xpon_map/xponmap.ko \
	$(PON_PLUGIN_DIR)/pon_vlan/ponvlan.ko \
	$(PON_PLUGIN_DIR)/pon_mac_filter/ponmacfilter.ko
  AUTOLOAD:=$(call AutoLoad,91,xponmap ponvlan ponmacfilter)
endef

define KernelPackage/airoha-pon-dataplane/description
 Vendor xPON VLAN processing, MAC filtering and GEM/LLID mapping plugins.
endef

define KernelPackage/airoha-xpon-igmp
  $(call KernelPackage/airoha-pon/Default)
  DEPENDS+=@TARGET_airoha_an7581_DEVICE_gemtek_xg2010g-ubi +kmod-airoha-pon-dataplane
  TITLE:=Airoha 10G xPON IGMP plugin
  FILES:=$(PON_PLUGIN_DIR)/xpon_igmp/xpon_igmp.ko
  AUTOLOAD:=$(call AutoLoad,92,xpon_igmp)
endef

define KernelPackage/airoha-xpon-igmp/description
 Multicast control plugin for the EN7581 10G xPON data path.
endef

define KernelPackage/airoha-gpon-igmp
  $(call KernelPackage/airoha-pon/Default)
  DEPENDS+=@TARGET_airoha_an7581_DEVICE_gemtek_xg2010g-ubi +kmod-airoha-pon-dataplane
  TITLE:=Airoha legacy GPON IGMP plugin
  FILES:=$(PON_PLUGIN_DIR)/gpon_igmp/gpon_igmp.ko
  AUTOLOAD:=$(call AutoLoad,92,gpon_igmp)
endef

define KernelPackage/airoha-gpon-igmp/description
 Legacy GPON multicast control plugin used alongside the 10G xPON path.
endef

define Package/airoha-pon-firmware
  SECTION:=firmware
  CATEGORY:=Firmware
  DEPENDS:=@TARGET_airoha_an7581_DEVICE_gemtek_xg2010g-ubi
  TITLE:=Airoha EN7572 LDDLA firmware
  PKGARCH:=all
endef

define Package/airoha-pon-firmware/description
 PM and DM firmware paired with the Airoha EN7572 LDDLA optical frontend.
endef

define Package/airoha-pon-firmware/install
	$(INSTALL_DIR) $(1)/etc/lddla
	$(INSTALL_DATA) ./files/lddla/A60993.elf.pm $(1)/etc/lddla/
	$(INSTALL_DATA) ./files/lddla/A60993.elf.dm $(1)/etc/lddla/
endef

PON_BSP_DIR:=$(PKG_BUILD_DIR)/bsp
PON_PLUGIN_DIR:=$(PKG_BUILD_DIR)/plugins
PON_INCLUDE_FLAGS:= \
	-I$(PON_BSP_DIR)/include \
	-I$(PON_BSP_DIR)/include/global_inc \
	-I$(PON_BSP_DIR)/include/global_inc/version \
	-I$(PON_BSP_DIR)/an7583/pon_pma/inc \
	-I$(PON_BSP_DIR)/qdma
PON_V2_CPU_CFLAGS:= \
	-D__IMEM= \
	-DTCSUPPORT_CPU_ARMV8=1 \
	-DTCSUPPORT_CPU_ARMV8_64=1 \
	-DTCSUPPORT_CPU_EN7581=1 \
	-DTCSUPPORT_BOARD_SELECT=1 \
	-DCONFIG_USE_MT7520_ASIC=1 \
	$(if $(CONFIG_TARGET_airoha_an7583),-DTCSUPPORT_CPU_AN7583=1)
PON_V2_CPU_MAKE:=TCSUPPORT_CPU_EN7581=1 $(if $(CONFIG_TARGET_airoha_an7583),TCSUPPORT_CPU_AN7583=1)
PON_DATAPLANE_CFLAGS:= \
	-DTCSUPPORT_PON_VLAN=1 \
	-DTCSUPPORT_PON_VLAN_FILTER=1 \
	-DTCSUPPORT_PON_MAC_FILTER=1 \
	-DTCSUPPORT_XPON_IGMP=1 \
	-DTCSUPPORT_GPON_MAPPING=1 \
	-DTCSUPPORT_EPON_MAPPING=1 \
	-DTCSUPPORT_UPSTREAM_VLAN_POLICER=1
PON_PLUGIN_CFLAGS:= \
	$(PON_INCLUDE_FLAGS) \
	$(PON_V2_CPU_CFLAGS) \
	$(PON_DATAPLANE_CFLAGS) \
	-DTCSUPPORT_WAN_GPON=1 \
	-DTCSUPPORT_WAN_EPON=1 \
	-include $(PON_BSP_DIR)/include/linux/xpon_skb.h
PON_PLUGIN_MAKE:= \
	XPON_BSP_GLOBAL_INC_PRIVATE=$(PON_BSP_DIR)/include/global_inc \
	XPON_BSP_GLOBAL_INC_PUBLIC=$(PON_BSP_DIR)/include/global_inc \
	XPON_BSP_ECNT_HOOK_DIR=$(PON_BSP_DIR) \
	GLOBAL_INC_DIR=$(PON_BSP_DIR)/include/global_inc
PON_PLUGIN_SYMVERS:= \
	$(PON_BSP_DIR)/Module.symvers \
	$(PKG_BUILD_DIR)/xpon-en757x/xpon_phy_10g/Module.symvers \
	$(PKG_BUILD_DIR)/xpon-en757x/xpon_10g/Module.symvers

define Build/Prepare
	rm -rf $(PKG_BUILD_DIR)
	mkdir -p $(PKG_BUILD_DIR)
	$(CP) $(AIROHA_PON_SOURCE_DIR)/src/. $(PKG_BUILD_DIR)/
	$(Build/Patch)
endef

define Build/Patch
	$(call PatchDir,$(PKG_BUILD_DIR),$(AIROHA_PON_SOURCE_DIR)/patches,)
endef

define Build/Compile/i2c
	+$(KERNEL_MAKE) $(PKG_JOBS) M="$(PKG_BUILD_DIR)/i2c-airoha" \
		modules
endef

define Build/Compile/v1
	+$(KERNEL_MAKE) $(PKG_JOBS) M="$(PKG_BUILD_DIR)/gpon-en757x/xpon_phy" \
		KCFLAGS="$(PON_INCLUDE_FLAGS) -DTCSUPPORT_CPU_EN7521=1" \
		MODULES_PHY_DIR="$(PKG_BUILD_DIR)/gpon-en757x/xpon_phy" \
		MODULES_QDMA_7512_DIR="$(PON_BSP_DIR)/qdma" \
		TCSUPPORT_CPU_EN7521=1 \
		modules
	+$(KERNEL_MAKE) $(PKG_JOBS) M="$(PKG_BUILD_DIR)/gpon-en757x/xpon" \
		KCFLAGS="$(PON_INCLUDE_FLAGS) -DTCSUPPORT_CPU_EN7521=1" \
		MODULES_XPON_WAN_DIR="$(PKG_BUILD_DIR)/gpon-en757x/xpon" \
		MODULES_QDMA_7512_DIR="$(PON_BSP_DIR)/qdma" \
		MODULES_FE_7512_DIR="$(PKG_BUILD_DIR)/gpon-en757x/raeth" \
		GLOBAL_INC_DIR="$(PON_BSP_DIR)/include/global_inc" \
		TCSUPPORT_WAN_GPON=1 \
		TCSUPPORT_CPU_EN7521=1 \
		modules
endef

define Build/Compile/v2
	+$(KERNEL_MAKE) $(PKG_JOBS) M="$(PON_BSP_DIR)" \
		AIROHA_PON_CFLAGS="$(PON_INCLUDE_FLAGS) $(PON_V2_CPU_CFLAGS)" \
		$(PON_V2_CPU_MAKE) \
		modules
	+$(KERNEL_MAKE) $(PKG_JOBS) M="$(PKG_BUILD_DIR)/xpon-en757x/xpon_phy_10g" \
		KCFLAGS="$(PON_INCLUDE_FLAGS) $(PON_V2_CPU_CFLAGS)" \
		KBUILD_EXTRA_SYMBOLS="$(PON_BSP_DIR)/Module.symvers" \
		MODULES_PHY_10G_DIR="$(PKG_BUILD_DIR)/xpon-en757x/xpon_phy_10g" \
		MODULES_QDMA_DIR="$(PON_BSP_DIR)/qdma" \
		$(PON_V2_CPU_MAKE) \
		modules
	+$(KERNEL_MAKE) $(PKG_JOBS) M="$(PKG_BUILD_DIR)/xpon-en757x/xpon_10g" \
		KCFLAGS="$(PON_INCLUDE_FLAGS) $(PON_V2_CPU_CFLAGS) $(PON_DATAPLANE_CFLAGS) -DTCSUPPORT_WAN_GPON=1 -DTCSUPPORT_WAN_EPON=1" \
		KBUILD_MODPOST_WARN=1 \
		KBUILD_EXTRA_SYMBOLS="$(PON_BSP_DIR)/Module.symvers $(PKG_BUILD_DIR)/xpon-en757x/xpon_phy_10g/Module.symvers" \
		XPON_BSP_MODULES_XPON_10G_DRIVER="$(PKG_BUILD_DIR)/xpon-en757x/xpon_10g" \
		XPON_BSP_GLOBAL_INC_PRIVATE="$(PON_BSP_DIR)/include/global_inc" \
		XPON_BSP_GLOBAL_INC_PUBLIC="$(PON_BSP_DIR)/include/global_inc" \
		XPON_BSP_ECNT_HOOK_DIR="$(PON_BSP_DIR)" \
		TCSUPPORT_WAN_GPON=1 \
		TCSUPPORT_WAN_EPON=1 \
		$(PON_V2_CPU_MAKE) \
		modules
	+$(KERNEL_MAKE) $(PKG_JOBS) M="$(PON_PLUGIN_DIR)/econet_bob" \
		KCFLAGS="$(PON_V2_CPU_CFLAGS) -DTCSUPPORT_MT7572=1" \
		TCSUPPORT_MT7572=1 \
		modules
	+$(KERNEL_MAKE) $(PKG_JOBS) M="$(PON_PLUGIN_DIR)/en7572" \
		KCFLAGS="$(PON_INCLUDE_FLAGS) $(PON_V2_CPU_CFLAGS) -DTCSUPPORT_MT7572=1" \
		KBUILD_MODPOST_WARN=1 \
		KBUILD_EXTRA_SYMBOLS="$(PON_BSP_DIR)/Module.symvers $(PKG_BUILD_DIR)/xpon-en757x/xpon_phy_10g/Module.symvers $(PKG_BUILD_DIR)/xpon-en757x/xpon_10g/Module.symvers" \
		TCSUPPORT_MT7572=1 \
		modules
	+$(KERNEL_MAKE) $(PKG_JOBS) M="$(PON_PLUGIN_DIR)/pon_vlan" \
		KCFLAGS="$(PON_PLUGIN_CFLAGS)" \
		KBUILD_MODPOST_WARN=1 \
		KBUILD_EXTRA_SYMBOLS="$(PON_PLUGIN_SYMVERS)" \
		$(PON_PLUGIN_MAKE) \
		modules
	+$(KERNEL_MAKE) $(PKG_JOBS) M="$(PON_PLUGIN_DIR)/pon_mac_filter" \
		KCFLAGS="$(PON_PLUGIN_CFLAGS)" \
		KBUILD_MODPOST_WARN=1 \
		KBUILD_EXTRA_SYMBOLS="$(PON_PLUGIN_SYMVERS)" \
		$(PON_PLUGIN_MAKE) \
		modules
	+$(KERNEL_MAKE) $(PKG_JOBS) M="$(PON_PLUGIN_DIR)/xpon_map" \
		KCFLAGS="$(PON_PLUGIN_CFLAGS)" \
		KBUILD_MODPOST_WARN=1 \
		KBUILD_EXTRA_SYMBOLS="$(PON_PLUGIN_SYMVERS)" \
		$(PON_PLUGIN_MAKE) \
		modules
	+$(KERNEL_MAKE) $(PKG_JOBS) M="$(PON_PLUGIN_DIR)/xpon_igmp" \
		KCFLAGS="$(PON_PLUGIN_CFLAGS)" \
		KBUILD_MODPOST_WARN=1 \
		KBUILD_EXTRA_SYMBOLS="$(PON_PLUGIN_SYMVERS)" \
		$(PON_PLUGIN_MAKE) \
		modules
	+$(KERNEL_MAKE) $(PKG_JOBS) M="$(PON_PLUGIN_DIR)/gpon_igmp" \
		KCFLAGS="$(PON_PLUGIN_CFLAGS)" \
		KBUILD_MODPOST_WARN=1 \
		KBUILD_EXTRA_SYMBOLS="$(PON_PLUGIN_SYMVERS)" \
		$(PON_PLUGIN_MAKE) \
		modules
endef

# Build only the hardware-specific part selected by the active target. The
# package definitions share one source tree and therefore one build directory.
define Build/Compile
	$(if $(filter y,$(CONFIG_TARGET_airoha_an7581) $(CONFIG_TARGET_airoha_an7583)),$(Build/Compile/i2c))
	$(if $(filter y,$(CONFIG_TARGET_airoha_en7523)),$(Build/Compile/v1))
	$(if $(filter y,$(CONFIG_TARGET_airoha_an7581_DEVICE_gemtek_xg2010g-ubi)),$(Build/Compile/v2))
endef

$(eval $(call KernelPackage,airoha-gpon-en757x))
$(eval $(call KernelPackage,airoha-i2c))
$(eval $(call KernelPackage,airoha-xpon-en757x))
$(eval $(call KernelPackage,airoha-pon-plugins))
$(eval $(call KernelPackage,airoha-pon-dataplane))
$(eval $(call KernelPackage,airoha-xpon-igmp))
$(eval $(call KernelPackage,airoha-gpon-igmp))
$(eval $(call BuildPackage,airoha-pon-firmware))
