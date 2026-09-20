# SPDX-License-Identifier: GPL-2.0-only

include $(TOPDIR)/rules.mk

PKG_NAME:=airoha-pon-manager
PKG_RELEASE:=2
PKG_LICENSE:=GPL-2.0-only

include $(INCLUDE_DIR)/package.mk

define Package/airoha-pon-manager
  SECTION:=net
  CATEGORY:=Network
  TITLE:=Airoha xPON management helpers
  DEPENDS:=@TARGET_airoha_an7581_DEVICE_gemtek_xg2010g-ubi +kmod-airoha-xpon-en757x +ip-full +uci
endef

define Package/airoha-pon-manager/description
 Init script and CLI helpers for Airoha EN7581/AN7583 GPON and EPON drivers.
endef

define Build/Compile
	mkdir -p $(PKG_BUILD_DIR)
	$(TARGET_CC) $(TARGET_CFLAGS) $(TARGET_CPPFLAGS) $(TARGET_LDFLAGS) \
		-Wall -Wextra \
		-o $(PKG_BUILD_DIR)/ponctl-helper \
		$(CURDIR)/src/ponctl-helper.c
	$(TARGET_CC) $(TARGET_CFLAGS) $(TARGET_CPPFLAGS) $(TARGET_LDFLAGS) \
		-Wall -Wextra \
		-o $(PKG_BUILD_DIR)/dsdctl \
		$(CURDIR)/src/dsdctl.c \
		$(CURDIR)/src/airoha_dsd.c
	$(TARGET_CC) $(TARGET_CFLAGS) $(TARGET_CPPFLAGS) $(TARGET_LDFLAGS) \
		-Wall -Wextra \
		-o $(PKG_BUILD_DIR)/ecnt_sys \
		$(CURDIR)/src/ecnt_sys.c \
		$(CURDIR)/src/airoha_dsd.c
endef

define Package/airoha-pon-manager/install
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) ./files/etc/config/pon $(1)/etc/config/pon
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/etc/init.d/pon $(1)/etc/init.d/pon
	$(INSTALL_DIR) $(1)/etc/lddla
	$(INSTALL_DIR) $(1)/usr/sbin
	$(INSTALL_DIR) $(1)/sbin
	$(INSTALL_BIN) ./files/usr/sbin/ponctl $(1)/usr/sbin/ponctl
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/ponctl-helper $(1)/usr/sbin/ponctl-helper
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/dsdctl $(1)/usr/sbin/dsdctl
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/ecnt_sys $(1)/sbin/ecnt_sys
endef

$(eval $(call BuildPackage,airoha-pon-manager))
