# This is free software, licensed under the Apache License, Version 2.0 .

include $(TOPDIR)/rules.mk

LUCI_NAME:=luci-app-airoha
PKG_VERSION:=2.0.0
PKG_RELEASE:=1
PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=XR1710G Maintainer
TITLE:=LuCI Airoha XR1710G Status & FlowSense

LUCI_TITLE:=LuCI Airoha XR1710G Status & FlowSense
LUCI_DESCRIPTION:=Unified Airoha XR1710G status app presented as two tabs: a SoC/NPU tab \
	(NPU utilization, CPU frequency and load, frame engine statistics, hardware offload \
	controls) and a FlowSense tab (real-time PPE hardware offload monitoring, token usage, \
	flow/VLAN-tag/PPPoE-passthrough and AP-mode offload status). The shared rpcd shell \
	helpers ship inside this package.
LUCI_DEPENDS:=+luci-base +kmod-br-netfilter

include $(TOPDIR)/feeds/luci/luci.mk

define Package/$(LUCI_NAME)/install
	# Install LuCI frontend views (SoC/NPU tab + FlowSense tab)
	$(INSTALL_DIR) $(1)/www/luci-static/resources/view/airoha_npu
	$(INSTALL_DATA) ./htdocs/luci-static/resources/view/airoha_npu/status.js $(1)/www/luci-static/resources/view/airoha_npu/
	$(INSTALL_DIR) $(1)/www/luci-static/resources/view/airoha_flowsense
	$(INSTALL_DATA) ./htdocs/luci-static/resources/view/airoha_flowsense/status.js $(1)/www/luci-static/resources/view/airoha_flowsense/

	# Install the shared design system consumed by BOTH tabs (page tokens +
	# component kit). Without these two modules the views cannot render.
	$(INSTALL_DIR) $(1)/www/luci-static/resources/view/airoha
	$(INSTALL_DATA) ./htdocs/luci-static/resources/view/airoha/ds-tokens.js $(1)/www/luci-static/resources/view/airoha/
	$(INSTALL_DATA) ./htdocs/luci-static/resources/view/airoha/ui.js $(1)/www/luci-static/resources/view/airoha/

	# Install UCI configuration
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_DATA) ./root/etc/config/npu-monitor $(1)/etc/config/

	# Install init.d script (executable)
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./root/etc/init.d/npu-jitter $(1)/etc/init.d/

	# Install NPU jitter daemon (executable)
	$(INSTALL_DIR) $(1)/usr/libexec
	$(INSTALL_BIN) ./root/usr/libexec/npu-jitter-daemon $(1)/usr/libexec/

	# Install RPC backend scripts (executable) together with the shared helpers,
	# so airoha-common.sh ships inside this package (no cross-package dependency).
	$(INSTALL_DIR) $(1)/usr/libexec/rpcd
	$(INSTALL_BIN) ./root/usr/libexec/rpcd/luci.airoha_npu $(1)/usr/libexec/rpcd/
	$(INSTALL_BIN) ./root/usr/libexec/rpcd/luci.airoha_flowsense $(1)/usr/libexec/rpcd/
	$(INSTALL_BIN) ./root/usr/libexec/rpcd/airoha-common.sh $(1)/usr/libexec/rpcd/

	# Install LuCI menu configuration (parent entry + two tabs)
	$(INSTALL_DIR) $(1)/usr/share/luci/menu.d
	$(INSTALL_DATA) ./root/usr/share/luci/menu.d/luci-app-airoha.json $(1)/usr/share/luci/menu.d/

	# Install RPC ACL configuration (union of the NPU and FlowSense grants)
	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
	$(INSTALL_DATA) ./root/usr/share/rpcd/acl.d/luci-app-airoha.json $(1)/usr/share/rpcd/acl.d/

	# Preserve runtime-created acceleration settings during sysupgrade.
	$(INSTALL_DIR) $(1)/lib/upgrade/keep.d
	$(INSTALL_DATA) ./root/lib/upgrade/keep.d/luci-app-airoha $(1)/lib/upgrade/keep.d/

	# Install init script that re-applies persisted CPU governor / max_freq at boot.
	# Bake the rc.d symlink so the service is enabled on a freshly flashed image too
	# (the postinst 'enable' only runs on a running device, not during image build).
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./root/etc/init.d/airoha-npu $(1)/etc/init.d/
	$(INSTALL_DIR) $(1)/etc/rc.d
	ln -sf ../init.d/airoha-npu $(1)/etc/rc.d/S89airoha-npu
endef

define Package/$(LUCI_NAME)/conffiles
/etc/config/npu-monitor
endef

define Package/$(LUCI_NAME)/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0

# Reload rpcd to register the luci.airoha_npu / luci.airoha_flowsense backends
/etc/init.d/rpcd reload 2>/dev/null

# Bridge acceleration is opt-in through the NPU tab. Remove defaults from
# earlier builds so only firewall hardware flow offload is enabled by default.
rm -f /etc/sysctl.d/10-bridge-offload.conf /etc/sysctl.d/99-bridge-offload.conf

# Enable and start the npu-jitter service
/etc/init.d/npu-jitter enable 2>/dev/null
/etc/init.d/npu-jitter start 2>/dev/null

# Enable the boot-time CPU settings apply script (runs at next reboot)
/etc/init.d/airoha-npu enable 2>/dev/null

# Clear LuCI cache so the new menu entries are picked up
rm -f /tmp/luci-indexcache.*
rm -rf /tmp/luci-modulecache/

exit 0
endef

define Package/$(LUCI_NAME)/prerm
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0

# Stop and disable the npu-jitter service
/etc/init.d/npu-jitter stop 2>/dev/null
/etc/init.d/npu-jitter disable 2>/dev/null

# Stop and disable the boot-time CPU settings apply script
/etc/init.d/airoha-npu stop 2>/dev/null
/etc/init.d/airoha-npu disable 2>/dev/null

# Reload rpcd to unregister the backends
/etc/init.d/rpcd reload 2>/dev/null

exit 0
endef

# call BuildPackage - OpenWrt buildroot signature
#
# feeds/luci/luci.mk (included above) already runs
#   $(foreach pkg,$(LUCI_BUILD_PACKAGES),$(eval $(call BuildPackage,$(pkg))))
# for this app and the luci-i18n-airoha-<lang> translation packages, so no
# explicit BuildPackage eval must be added here (that would define the package
# twice). The literal string above is nevertheless REQUIRED: include/scan.mk
# discovers package Makefiles with
#   find ... -name Makefile | xargs grep -aHE 'call (Build/DefaultTargets|BuildPackage|KernelPackage)'
# so a Makefile without it is never scanned, never lands in tmp/.packageinfo
# and the package silently disappears from every generated image.
