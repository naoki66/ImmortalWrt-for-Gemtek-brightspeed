include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-clientstatus
PKG_VERSION:=1.0.9
PKG_RELEASE:=1
PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=emortal

LUCI_TITLE:=LuCI Support for Client Status Monitor && Management
LUCI_DESCRIPTION:=Web interface for clientstatus - a lightweight daemon that \
	monitors LAN client online/offline status.
LUCI_DEPENDS:=+clientstatus +luci-base +luci-compat

include $(TOPDIR)/feeds/luci/luci.mk

define Package/$(PKG_NAME)/install
	$(INSTALL_DIR) $(1)/usr/lib/lua/luci/controller
	$(INSTALL_DATA) ./luasrc/controller/clientstatus.lua $(1)/usr/lib/lua/luci/controller/

	$(INSTALL_DIR) $(1)/usr/lib/lua/luci/model/cbi/clientstatus
	$(INSTALL_DATA) ./luasrc/model/cbi/clientstatus/settings.lua $(1)/usr/lib/lua/luci/model/cbi/clientstatus/

	$(INSTALL_DIR) $(1)/usr/lib/lua/luci/view
	$(INSTALL_DATA) ./luasrc/view/clientstatus.htm $(1)/usr/lib/lua/luci/view/
endef

define Package/$(PKG_NAME)/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0
rm -f /tmp/luci-indexcache.*
rm -rf /tmp/luci-modulecache/
exit 0
endef

$(eval $(call BuildPackage,$(PKG_NAME)))
