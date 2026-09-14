include $(TOPDIR)/rules.mk

LUCI_NAME:=luci-app-airoha-factory
PKG_VERSION:=1.0.0
PKG_RELEASE:=3

PKG_MAINTAINER:=XR1710G Maintainer
PKG_LICENSE:=GPL-2.0-or-later
TITLE:=LuCI Airoha XR1710G Factory Partition Editor

LUCI_TITLE:=LuCI Airoha XR1710G Factory Partition Editor
LUCI_DESCRIPTION:=Reads and modifies the vendor (mtd0) factory block at \
	offset 0x400000 (MAC addresses, serial number, Wi-Fi defaults, admin \
	credentials). Can also push the WAN/LAN MAC into the live UBI "factory" \
	volume and the U-Boot environment so changes take effect.
LUCI_DEPENDS:=+luci-base +uboot-envtools

include $(TOPDIR)/feeds/luci/luci.mk

define Package/$(LUCI_NAME)/install
	# LuCI frontend view
	$(INSTALL_DIR) $(1)/www/luci-static/resources/view/airoha_factory
	$(INSTALL_DATA) ./htdocs/luci-static/resources/view/airoha_factory/factory.js \
		$(1)/www/luci-static/resources/view/airoha_factory/

	# RPC backend script (executable)
	$(INSTALL_DIR) $(1)/usr/libexec/rpcd
	$(INSTALL_BIN) ./root/usr/libexec/rpcd/luci.airoha_factory \
		$(1)/usr/libexec/rpcd/

	# NOTE: /etc/fw_env.config is intentionally NOT installed any more.  It
	# belongs to uboot-envtools, which appends the redundant UBI entries;
	# shipping a /dev/mtd0 entry here put an MTD device in front of the UBI
	# ones and broke every bare fw_printenv/fw_setenv call.  The vendor env
	# config is written to /etc/fw_env.factory.config by ensure_env_conf().

	# LuCI menu configuration
	$(INSTALL_DIR) $(1)/usr/share/luci/menu.d
	$(INSTALL_DATA) ./root/usr/share/luci/menu.d/luci-app-airoha-factory.json \
		$(1)/usr/share/luci/menu.d/

	# RPC ACL configuration
	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
	$(INSTALL_DATA) ./root/usr/share/rpcd/acl.d/luci-app-airoha-factory.json \
		$(1)/usr/share/rpcd/acl.d/
endef

define Package/$(LUCI_NAME)/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0

# Ensure the rpcd backend is executable even if a packaging path lost the
# +x bit; rpcd silently skips non-executable scripts in /usr/libexec/rpcd.
chmod 755 /usr/libexec/rpcd/luci.airoha_factory 2>/dev/null

# Older releases owned the shared /etc/fw_env.config and put the vendor mtd0
# entry in front of the two UBI entries appended by uboot-envtools.  fw_env
# only honours the first two entries of a config file, so that MTD+UBI mix
# made every bare fw_printenv/fw_setenv call fail with "Incompatible flash
# types!".  Drop the vendor entry from the shared file when it also carries
# UBI entries so uboot-envtools keeps full control again.  If the file only
# holds the vendor entry (uboot-envtools not installed/never run) it is left
# alone, because a single MTD entry is still a perfectly valid config.
if [ -f /etc/fw_env.config ] && grep -qE '^[[:space:]]*/dev/ubi[0-9]+_[0-9]+[[:space:]]' /etc/fw_env.config && grep -qE '^[[:space:]]*/dev/mtd[0-9]+[[:space:]]+0x200000[[:space:]]' /etc/fw_env.config; then
	grep -vE '^[[:space:]]*/dev/mtd[0-9]+[[:space:]]+0x200000[[:space:]]' /etc/fw_env.config > /etc/fw_env.config.tmp 2>/dev/null
	mv /etc/fw_env.config.tmp /etc/fw_env.config 2>/dev/null
	rm -f /etc/fw_env.config.tmp
fi

# rpcd only rescan the backend directory on a full (re)start, so restart it
# to register the new luci.airoha_factory backend.
/etc/init.d/rpcd restart 2>/dev/null

# Clear LuCI cache so the new menu entries are picked up
rm -f /tmp/luci-indexcache.*
rm -rf /tmp/luci-modulecache/

exit 0
endef

define Package/$(LUCI_NAME)/prerm
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0

# Restart rpcd to unregister the luci.airoha_factory backend
/etc/init.d/rpcd restart 2>/dev/null

exit 0
endef

# call BuildPackage - OpenWrt buildroot signature
