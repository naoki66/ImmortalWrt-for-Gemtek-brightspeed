# This is free software, licensed under the Apache License, Version 2.0 .

include $(TOPDIR)/rules.mk

PKG_VERSION:=1.1.3
PKG_RELEASE:=2
PKG_LICENSE:=Apache-2.0

LUCI_TITLE:=LuCI Airoha FlowSense — Offload & PPE Monitor
LUCI_DESCRIPTION:=Provides real-time monitoring and control for Airoha PPE hardware offload. \
	Displays NPU token usage, flow entry count, VLAN/PPPoE acceleration status, \
	and allows enabling/disabling hardware offload for specific interfaces.
LUCI_DEPENDS:=+luci-base @TARGET_airoha

include $(TOPDIR)/feeds/luci/luci.mk

define Package/luci-app-airoha-flowsense/conffiles
/etc/config/npu-monitor
endef

define Package/luci-app-airoha-flowsense/postinst
#!/bin/sh
[ -x /etc/init.d/npu-jitter ] && /etc/init.d/npu-jitter restart
[ -n "$${IPKG_INSTROOT}" ] || {
	rm -f /tmp/luci-indexcache.*
	rm -rf /tmp/luci-modulecache/
	/etc/init.d/rpcd reload 2>/dev/null
	exit 0
}
endef

# call BuildPackage - OpenWrt buildroot signature
