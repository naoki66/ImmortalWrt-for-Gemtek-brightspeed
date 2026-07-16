# This is free software, licensed under the Apache License, Version 2.0 .

include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-airoha-flowsense
PKG_VERSION:=1.1.3
PKG_RELEASE:=3
PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=XR1710G Maintainer

LUCI_TITLE:=LuCI Airoha FlowSense — Offload & PPE Monitor
LUCI_DESCRIPTION:=Provides real-time monitoring and control for Airoha PPE hardware offload. \
	Displays NPU token usage, flow entry count, VLAN/PPPoE acceleration status, \
	and allows enabling/disabling hardware offload for specific interfaces.
LUCI_DEPENDS:=+luci-base @TARGET_airoha

include $(TOPDIR)/feeds/luci/luci.mk

define Package/$(PKG_NAME)/install
	# Install LuCI frontend views
	$(INSTALL_DIR) $(1)/www/luci-static/resources/view/airoha_flowsense
	$(INSTALL_DATA) ./htdocs/luci-static/resources/view/airoha_flowsense/status.js $(1)/www/luci-static/resources/view/airoha_flowsense/

	# Install UCI configuration
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_DATA) ./root/etc/config/npu-monitor $(1)/etc/config/

	# Install init.d script (executable)
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./root/etc/init.d/npu-jitter $(1)/etc/init.d/

	# Install RPC backend script (executable)
	$(INSTALL_DIR) $(1)/usr/libexec/rpcd
	$(INSTALL_BIN) ./root/usr/libexec/rpcd/luci.airoha_flowsense $(1)/usr/libexec/rpcd/

	# Install NPU jitter daemon (executable)
	$(INSTALL_DIR) $(1)/usr/libexec
	$(INSTALL_BIN) ./root/usr/libexec/npu-jitter-daemon $(1)/usr/libexec/

	# Install LuCI menu configuration
	$(INSTALL_DIR) $(1)/usr/share/luci/menu.d
	$(INSTALL_DATA) ./root/usr/share/luci/menu.d/luci-app-airoha-flowsense.json $(1)/usr/share/luci/menu.d/

	# Install RPC ACL configuration
	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
	$(INSTALL_DATA) ./root/usr/share/rpcd/acl.d/luci-app-airoha-flowsense.json $(1)/usr/share/rpcd/acl.d/
endef

define Package/$(PKG_NAME)/conffiles
/etc/config/npu-monitor
endef

define Package/$(PKG_NAME)/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0

# Enable and start the npu-jitter service
/etc/init.d/npu-jitter enable 2>/dev/null
/etc/init.d/npu-jitter start 2>/dev/null

# Reload rpcd to register the new luci.airoha_flowsense backend
/etc/init.d/rpcd reload 2>/dev/null

# Clear LuCI cache so the new menu entries are picked up
rm -f /tmp/luci-indexcache.*
rm -rf /tmp/luci-modulecache/

exit 0
endef

define Package/$(PKG_NAME)/prerm
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0

# Stop and disable the npu-jitter service
/etc/init.d/npu-jitter stop 2>/dev/null
/etc/init.d/npu-jitter disable 2>/dev/null

# Reload rpcd to unregister the luci.airoha_flowsense backend
/etc/init.d/rpcd reload 2>/dev/null

exit 0
endef

$(eval $(call BuildPackage,$(PKG_NAME)))
