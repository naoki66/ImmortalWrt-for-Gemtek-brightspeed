# This is free software, licensed under the Apache License, Version 2.0 .

include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-airoha-common
PKG_VERSION:=1.0.0
PKG_RELEASE:=1
PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=XR1710G Maintainer

include $(INCLUDE_DIR)/package.mk

define Package/$(PKG_NAME)
  SECTION:=utils
  CATEGORY:=Utilities
  TITLE:=Shared Airoha LuCI RPC backend helpers
  # Pulled in automatically by luci-app-airoha-npu and luci-app-airoha-flowsense.
endef

define Package/$(PKG_NAME)/description
  Shared shell helpers (_run_with_deadline, _run_hardware_with_deadline,
  _devmem_read) sourced by the Airoha LuCI RPC backends so the timeout and
  reboot-scoped circuit-breaker logic lives in exactly one place.
endef

define Build/Compile
endef

define Package/$(PKG_NAME)/install
	$(INSTALL_DIR) $(1)/usr/libexec/rpcd
	$(INSTALL_BIN) ./root/usr/libexec/rpcd/airoha-common.sh $(1)/usr/libexec/rpcd/
endef

$(eval $(call BuildPackage,$(PKG_NAME)))
