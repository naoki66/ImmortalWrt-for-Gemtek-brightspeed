include $(TOPDIR)/rules.mk

LUCI_NAME:=luci-app-airoha-recovery
PKG_VERSION:=1.0.0
PKG_RELEASE:=3

PKG_MAINTAINER:=XR1710G Maintainer
PKG_LICENSE:=GPL-2.0-or-later
TITLE:=LuCI Airoha XR1710G U-Boot Recovery

LUCI_TITLE:=LuCI Airoha XR1710G U-Boot Recovery
LUCI_DESCRIPTION:=Reboots the device into the U-Boot HTTP recovery environment. \
	Uses the native one-shot recovery trigger and leaves the normal bootcmd \
	unchanged.
LUCI_DEPENDS:=+luci-base +uboot-envtools

include $(TOPDIR)/feeds/luci/luci.mk

define Package/$(LUCI_NAME)/install
	# Install LuCI frontend views
	$(INSTALL_DIR) $(1)/www/luci-static/resources/view/airoha_recovery
	$(INSTALL_DATA) ./htdocs/luci-static/resources/view/airoha_recovery/recovery.js $(1)/www/luci-static/resources/view/airoha_recovery/

	# Install RPC backend script (executable)
	$(INSTALL_DIR) $(1)/usr/libexec/rpcd
	$(INSTALL_BIN) ./root/usr/libexec/rpcd/luci.airoha_recovery $(1)/usr/libexec/rpcd/

	# Install LuCI menu configuration
	$(INSTALL_DIR) $(1)/usr/share/luci/menu.d
	$(INSTALL_DATA) ./root/usr/share/luci/menu.d/luci-app-airoha-recovery.json $(1)/usr/share/luci/menu.d/

	# Install RPC ACL configuration
	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
	$(INSTALL_DATA) ./root/usr/share/rpcd/acl.d/luci-app-airoha-recovery.json $(1)/usr/share/rpcd/acl.d/
endef

define Package/$(LUCI_NAME)/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0

# Reload rpcd to register the new luci.airoha_recovery backend
/etc/init.d/rpcd reload 2>/dev/null

# Clear LuCI cache so the new menu entries are picked up
rm -f /tmp/luci-indexcache.*
rm -rf /tmp/luci-modulecache/

exit 0
endef

define Package/$(LUCI_NAME)/prerm
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0

# Reload rpcd to unregister the luci.airoha_recovery backend
/etc/init.d/rpcd reload 2>/dev/null

exit 0
endef

# call BuildPackage - OpenWrt buildroot signature
