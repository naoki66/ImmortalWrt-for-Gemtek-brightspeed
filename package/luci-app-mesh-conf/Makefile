include $(TOPDIR)/rules.mk

LUCI_NAME:=luci-app-mesh-conf
PKG_VERSION:=0.1.0
PKG_RELEASE:=2

PKG_MAINTAINER:=XR1710G Maintainer
PKG_LICENSE:=GPL-2.0-or-later

LUCI_TITLE:=LuCI batman-adv Mesh Configuration
LUCI_DESCRIPTION:=Wired or wireless 802.11s mesh backhaul (one link at a time), master/slave roles, per-radio wireless coverage with roaming checks and mesh topology discovery. Upstream WAN mode (AP / DHCP / PPPoE) is handled by luci-app-netmode.
LUCI_DEPENDS:=+luci-base +rpcd +jsonfilter +iw +iwinfo +ip-full +kmod-batman-adv +batctl-full +wpad-mesh-mbedtls
LUCI_PKGARCH:=all

include $(TOPDIR)/feeds/luci/luci.mk

define Package/$(LUCI_NAME)/install
	$(INSTALL_DIR) $(1)/www/luci-static/resources/view/meshconf
	$(INSTALL_DATA) ./htdocs/luci-static/resources/view/meshconf/meshconf.js \
		$(1)/www/luci-static/resources/view/meshconf/

	$(INSTALL_DIR) $(1)/usr/libexec/rpcd
	$(INSTALL_BIN) ./root/usr/libexec/rpcd/luci.meshconf \
		$(1)/usr/libexec/rpcd/

	$(INSTALL_DIR) $(1)/usr/share/luci/menu.d
	$(INSTALL_DATA) ./root/usr/share/luci/menu.d/luci-app-mesh-conf.json \
		$(1)/usr/share/luci/menu.d/

	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
	$(INSTALL_DATA) ./root/usr/share/rpcd/acl.d/luci-app-mesh-conf.json \
		$(1)/usr/share/rpcd/acl.d/
endef

define Package/$(LUCI_NAME)/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0
chmod 755 /usr/libexec/rpcd/luci.meshconf 2>/dev/null
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
