include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-airoha-fancontrol
PKG_VERSION:=1.0.0
PKG_RELEASE:=1

PKG_MAINTAINER:=XR1710G Maintainer
PKG_LICENSE:=GPL-2.0-or-later

LUCI_TITLE:=LuCI Airoha Fan Control
LUCI_DESCRIPTION:=Provides fan speed monitoring and control for Airoha-based devices. \
	Displays current temperature and fan RPM, supports manual/auto speed modes \
	and temperature threshold configuration.
LUCI_DEPENDS:=+luci-compat

include $(TOPDIR)/feeds/luci/luci.mk

define Package/$(PKG_NAME)/install
	# Install LuCI frontend views
	$(INSTALL_DIR) $(1)/www/luci-static/resources/view/fan
	$(INSTALL_DATA) ./htdocs/luci-static/resources/view/fan/status.js $(1)/www/luci-static/resources/view/fan/
	$(INSTALL_DATA) ./htdocs/luci-static/resources/view/fan/settings.js $(1)/www/luci-static/resources/view/fan/

	# Install UCI configuration
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_DATA) ./root/etc/config/fan $(1)/etc/config/

	# Install init.d script (executable)
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./root/etc/init.d/fan $(1)/etc/init.d/

	# Install RPC backend script (executable)
	$(INSTALL_DIR) $(1)/usr/libexec/rpcd
	$(INSTALL_BIN) ./root/usr/libexec/rpcd/luci.fan $(1)/usr/libexec/rpcd/

	# Install LuCI menu configuration
	$(INSTALL_DIR) $(1)/usr/share/luci/menu.d
	$(INSTALL_DATA) ./root/usr/share/luci/menu.d/luci-app-airoha-fancontrol.json $(1)/usr/share/luci/menu.d/

	# Install RPC ACL configuration
	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
	$(INSTALL_DATA) ./root/usr/share/rpcd/acl.d/luci-app-airoha-fancontrol.json $(1)/usr/share/rpcd/acl.d/
endef

define Package/$(PKG_NAME)/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0

# Enable and start the fan service
/etc/init.d/fan enable 2>/dev/null
/etc/init.d/fan start 2>/dev/null

# Disable and stop the conflicting airoha_fan service if present
if [ -f /etc/init.d/airoha_fan ]; then
	/etc/init.d/airoha_fan stop 2>/dev/null
	/etc/init.d/airoha_fan disable 2>/dev/null
fi

# Reload rpcd to register the new luci.fan backend
/etc/init.d/rpcd reload 2>/dev/null

# Clear LuCI cache so the new menu entries are picked up
rm -f /tmp/luci-indexcache.*
rm -rf /tmp/luci-modulecache/

exit 0
endef

define Package/$(PKG_NAME)/prerm
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0

# Stop and disable the fan service
/etc/init.d/fan stop 2>/dev/null
/etc/init.d/fan disable 2>/dev/null

# Reload rpcd to unregister the luci.fan backend
/etc/init.d/rpcd reload 2>/dev/null

exit 0
endef
