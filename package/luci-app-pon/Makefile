# SPDX-License-Identifier: GPL-2.0-only
#
# LuCI management pages for the Airoha PON line on the Gemtek XG2010G.

include $(TOPDIR)/rules.mk

LUCI_NAME:=luci-app-pon
PKG_VERSION:=1.0.0
PKG_RELEASE:=1
PKG_LICENSE:=GPL-2.0-only
PKG_MAINTAINER:=XR1710G Maintainer
TITLE:=LuCI Airoha PON management

LUCI_TITLE:=LuCI Airoha PON management
LUCI_DESCRIPTION:=PON line management for the Gemtek XG2010G: link and optics \
	state, GPON/EPON subscriber identity, mode switching, and configuration \
	apply. Reads line state through pondctl, which never calls the vendor CLI.
LUCI_DEPENDS:=+luci-base +airoha-pon-manager

include $(TOPDIR)/feeds/luci/luci.mk

define Package/$(LUCI_NAME)/install
	# Frontend views
	$(INSTALL_DIR) $(1)/www/luci-static/resources/view/pon
	$(INSTALL_DATA) ./htdocs/luci-static/resources/view/pon/status.js $(1)/www/luci-static/resources/view/pon/
	$(INSTALL_DATA) ./htdocs/luci-static/resources/view/pon/auth.js $(1)/www/luci-static/resources/view/pon/
	$(INSTALL_DATA) ./htdocs/luci-static/resources/view/pon/mode.js $(1)/www/luci-static/resources/view/pon/
	$(INSTALL_DATA) ./htdocs/luci-static/resources/view/pon/advanced.js $(1)/www/luci-static/resources/view/pon/

	# RPC backend (executable)
	$(INSTALL_DIR) $(1)/usr/libexec/rpcd
	$(INSTALL_BIN) ./root/usr/libexec/rpcd/luci.pon $(1)/usr/libexec/rpcd/

	# LuCI menu
	$(INSTALL_DIR) $(1)/usr/share/luci/menu.d
	$(INSTALL_DATA) ./root/usr/share/luci/menu.d/luci-app-pon.json $(1)/usr/share/luci/menu.d/

	# RPC ACL
	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
	$(INSTALL_DATA) ./root/usr/share/rpcd/acl.d/luci-app-pon.json $(1)/usr/share/rpcd/acl.d/
endef

define Package/$(LUCI_NAME)/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0

# Register the new luci.pon backend
/etc/init.d/rpcd reload 2>/dev/null

# Drop the LuCI caches so the new menu entries and views are picked up
rm -f /tmp/luci-indexcache.*
rm -rf /tmp/luci-modulecache/

exit 0
endef

define Package/$(LUCI_NAME)/prerm
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0

/etc/init.d/rpcd reload 2>/dev/null

exit 0
endef

# call BuildPackage - OpenWrt buildroot signature
