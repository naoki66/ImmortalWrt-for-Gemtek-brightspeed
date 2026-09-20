# SPDX-License-Identifier: GPL-2.0-only

include $(TOPDIR)/rules.mk

PKG_NAME:=airoha-an7581-mt7996-board
PKG_RELEASE:=1
PKG_LICENSE:=GPL-2.0-only
PKGARCH:=all

include $(INCLUDE_DIR)/package.mk

define Package/airoha-an7581-mt7996-board
  SECTION:=net
  CATEGORY:=Network
  TITLE:=Airoha AN7581 MT7996 board defaults
  DEPENDS:=@(TARGET_airoha_an7581_DEVICE_gemtek_xr1710g-ubi||TARGET_airoha_an7581_DEVICE_gemtek_w1700k-ubi)
  HIDDEN:=1
endef

define Package/airoha-an7581-mt7996-board/description
 Board-specific MT7996 defaults and runtime tuning for wireless AN7581 devices.
endef

define Build/Compile
endef

define Package/airoha-an7581-mt7996-board/install
	$(INSTALL_DIR) $(1)/etc/board.d
	$(INSTALL_BIN) ./files/etc/board.d/03_wifi_defaults $(1)/etc/board.d/03_wifi_defaults
	$(INSTALL_DIR) $(1)/etc/hotplug.d/net
	$(INSTALL_BIN) ./files/etc/hotplug.d/net/99-ppe-reload $(1)/etc/hotplug.d/net/99-ppe-reload
	$(INSTALL_DIR) $(1)/etc/sysctl.d
	$(INSTALL_DATA) ./files/etc/sysctl.d/11-wireless-buffers.conf $(1)/etc/sysctl.d/11-wireless-buffers.conf
	$(INSTALL_DIR) $(1)/etc/uci-defaults
	$(INSTALL_BIN) ./files/etc/uci-defaults/03_wireless $(1)/etc/uci-defaults/03_wireless
	$(INSTALL_DIR) $(1)/usr/libexec/platform
	$(INSTALL_BIN) ./files/usr/libexec/platform/packet-steering.sh $(1)/usr/libexec/platform/packet-steering.sh
endef

$(eval $(call BuildPackage,airoha-an7581-mt7996-board))
