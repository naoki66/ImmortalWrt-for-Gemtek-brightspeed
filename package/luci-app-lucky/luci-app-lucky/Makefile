# SPDX-License-Identifier: GPL-3.0-only
#
# Copyright (C) 2022-2023  gdy
#
# This is free software, licensed under the Apache License, Version 2.0 .
#
include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-lucky
PKG_VERSION:=2.2.2
PKG_RELEASE:=2

LUCI_TITLE:=LuCI Support for lucky
LUCI_DEPENDS:=+lucky +luci-compat
LUCI_PKGARCH:=all

include $(TOPDIR)/feeds/luci/luci.mk

define Package/$(PKG_NAME)/install
	$(INSTALL_DIR) $(1)/usr/lib/lua/luci/controller
	$(INSTALL_DATA) ./luasrc/controller/lucky.lua $(1)/usr/lib/lua/luci/controller/

	$(INSTALL_DIR) $(1)/usr/lib/lua/luci/model/cbi/lucky
	$(INSTALL_DATA) ./luasrc/model/cbi/lucky/lucky.lua $(1)/usr/lib/lua/luci/model/cbi/lucky/

	$(INSTALL_DIR) $(1)/usr/lib/lua/luci/view/lucky
	$(INSTALL_DATA) ./luasrc/view/lucky/lucky_status.htm $(1)/usr/lib/lua/luci/view/lucky/

	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) ./root/usr/bin/luckyarch $(1)/usr/bin/luckyarch

	$(INSTALL_DIR) $(1)/etc/uci-defaults
	$(INSTALL_DATA) ./root/etc/uci-defaults/66_luci-lucky $(1)/etc/uci-defaults/

	$(INSTALL_DIR) $(1)/usr/share/luci/menu.d
	$(INSTALL_DATA) ./root/usr/share/luci/menu.d/luci-app-lucky.json $(1)/usr/share/luci/menu.d/

	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
	$(INSTALL_DATA) ./root/usr/share/rpcd/acl.d/luci-app-lucky.json $(1)/usr/share/rpcd/acl.d/
endef

define Package/$(PKG_NAME)/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0
rm -f /tmp/luci-indexcache.*
rm -rf /tmp/luci-modulecache/
exit 0
endef

$(eval $(call BuildPackage,$(PKG_NAME)))
