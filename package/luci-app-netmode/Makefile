include $(TOPDIR)/rules.mk

LUCI_NAME:=luci-app-netmode
PKG_VERSION:=0.1.0
PKG_RELEASE:=1

PKG_MAINTAINER:=XR1710G Maintainer
PKG_LICENSE:=GPL-2.0-or-later

LUCI_TITLE:=LuCI Network Mode (AP / DHCP / PPPoE)
LUCI_DESCRIPTION:=One-click switching between AP mode, DHCP router mode and PPPoE router mode, with automatic config backup and restore.
LUCI_DEPENDS:=+luci-base +rpcd +jsonfilter +ppp-mod-pppoe
LUCI_PKGARCH:=all

include $(TOPDIR)/feeds/luci/luci.mk

define Package/$(LUCI_NAME)/install
	$(INSTALL_DIR) $(1)/www/luci-static/resources/view/netmode
	$(INSTALL_DATA) ./htdocs/luci-static/resources/view/netmode/netmode.js \
		$(1)/www/luci-static/resources/view/netmode/

	$(INSTALL_DIR) $(1)/usr/libexec/rpcd
	$(INSTALL_BIN) ./root/usr/libexec/rpcd/luci.netmode \
		$(1)/usr/libexec/rpcd/

	$(INSTALL_DIR) $(1)/usr/share/luci/menu.d
	$(INSTALL_DATA) ./root/usr/share/luci/menu.d/luci-app-netmode.json \
		$(1)/usr/share/luci/menu.d/

	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
	$(INSTALL_DATA) ./root/usr/share/rpcd/acl.d/luci-app-netmode.json \
		$(1)/usr/share/rpcd/acl.d/
endef

define Package/$(LUCI_NAME)/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0
chmod 755 /usr/libexec/rpcd/luci.netmode 2>/dev/null
/etc/init.d/rpcd restart 2>/dev/null
rm -f /tmp/luci-indexcache.*
rm -rf /tmp/luci-modulecache/
exit 0
endef

define Package/$(LUCI_NAME)/prerm
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0
/etc/init.d/rpcd restart 2>/dev/null
exit 0
endef

# call BuildPackage - OpenWrt buildroot signature
