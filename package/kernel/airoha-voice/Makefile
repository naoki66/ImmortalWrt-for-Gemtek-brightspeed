# SPDX-License-Identifier: GPL-2.0-only

include $(TOPDIR)/rules.mk
include $(INCLUDE_DIR)/kernel.mk

PKG_NAME:=airoha-voice
PKG_RELEASE:=1
PKG_LICENSE:=GPL-2.0-only

include $(INCLUDE_DIR)/package.mk

define KernelPackage/airoha-en7581-pcm-spi
  SUBMENU:=Other modules
  TITLE:=Airoha EN7581 PCM-SPI Si32192 control transport
  DEPENDS:=@TARGET_airoha_an7581_DEVICE_gemtek_xg2010g-ubi
  FILES:=$(PKG_BUILD_DIR)/airoha_en7581_pcm_spi.ko
  AUTOLOAD:=$(call AutoProbe,airoha_en7581_pcm_spi)
endef

define KernelPackage/airoha-en7581-pcm-spi/description
 XG2010G-only EN7581 PCM-SPI control transport and Si32192 identity probe.
endef

define Build/Prepare
	$(call Build/Prepare/Default)
	$(CP) ./src/. $(PKG_BUILD_DIR)/
endef

define Build/Compile
	+$(KERNEL_MAKE) $(PKG_JOBS) M="$(PKG_BUILD_DIR)" modules
endef

$(eval $(call KernelPackage,airoha-en7581-pcm-spi))
