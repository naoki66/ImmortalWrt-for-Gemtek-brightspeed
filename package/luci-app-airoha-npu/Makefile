# This is free software, licensed under the Apache License, Version 2.0 .

include $(TOPDIR)/rules.mk

LUCI_NAME:=luci-app-airoha-npu
PKG_VERSION:=1.1.0
PKG_RELEASE:=1
PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=XR1710G Maintainer
TITLE:=LuCI Airoha XR1710G NPU Status

LUCI_TITLE:=LuCI Airoha XR1710G NPU Status
LUCI_DESCRIPTION:=Displays real-time Airoha XR1710G NPU status including NPU utilization, \
	CPU frequency and load, frame engine statistics, and supports CPU overclocking.
LUCI_DEPENDS:=+luci-base

include $(TOPDIR)/feeds/luci/luci.mk

define Package/$(LUCI_NAME)/install
	# Install LuCI frontend views
	$(INSTALL_DIR) $(1)/www/luci-static/resources/view/airoha_npu
	$(INSTALL_DATA) ./htdocs/luci-static/resources/view/airoha_npu/status.js $(1)/www/luci-static/resources/view/airoha_npu/

	# Install RPC backend script (executable)
	$(INSTALL_DIR) $(1)/usr/libexec/rpcd
	$(INSTALL_BIN) ./root/usr/libexec/rpcd/luci.airoha_npu $(1)/usr/libexec/rpcd/

	# Install LuCI menu configuration
	$(INSTALL_DIR) $(1)/usr/share/luci/menu.d
	$(INSTALL_DATA) ./root/usr/share/luci/menu.d/luci-app-airoha-npu.json $(1)/usr/share/luci/menu.d/

	# Install RPC ACL configuration
	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
	$(INSTALL_DATA) ./root/usr/share/rpcd/acl.d/luci-app-airoha-npu.json $(1)/usr/share/rpcd/acl.d/
endef

define Package/$(LUCI_NAME)/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0

# Reload rpcd to register the new luci.airoha_npu backend
/etc/init.d/rpcd reload 2>/dev/null

# Clear LuCI cache so the new menu entries are picked up
rm -f /tmp/luci-indexcache.*
rm -rf /tmp/luci-modulecache/

exit 0
endef

define Package/$(LUCI_NAME)/prerm
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0

# Reload rpcd to unregister the luci.airoha_npu backend
/etc/init.d/rpcd reload 2>/dev/null

exit 0
endef

# call BuildPackage - OpenWrt buildroot signature
