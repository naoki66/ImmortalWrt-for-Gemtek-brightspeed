include $(TOPDIR)/rules.mk

LUCI_NAME:=luci-app-clientstatus
PKG_VERSION:=1.0.9
PKG_RELEASE:=2
PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=emortal

# The menuconfig row is built as "<package name>.....<title>" and padded to 72
# columns by scripts/package-metadata.pl. When the name and the title together
# reach 72 characters the title is dropped from the row completely and the
# entry shows up with nothing but the package name. The old title
# "LuCI Support for Client Status Monitor && Management" is 52 characters and
# together with the 21 character package name it does not fit, so the row had
# no comment at all. Keep the title short.
LUCI_TITLE:=LuCI Client Status Monitor & Management
LUCI_DESCRIPTION:=Web interface for clientstatus - a lightweight daemon that \
	monitors LAN client online/offline status.
LUCI_DEPENDS:=+clientstatus +luci-base +luci-compat

include $(TOPDIR)/feeds/luci/luci.mk

define Package/$(LUCI_NAME)/install
	$(INSTALL_DIR) $(1)/usr/lib/lua/luci/controller
	$(INSTALL_DATA) ./luasrc/controller/clientstatus.lua $(1)/usr/lib/lua/luci/controller/

	$(INSTALL_DIR) $(1)/usr/lib/lua/luci/model/cbi/clientstatus
	$(INSTALL_DATA) ./luasrc/model/cbi/clientstatus/settings.lua $(1)/usr/lib/lua/luci/model/cbi/clientstatus/

	$(INSTALL_DIR) $(1)/usr/lib/lua/luci/view
	$(INSTALL_DATA) ./luasrc/view/clientstatus.htm $(1)/usr/lib/lua/luci/view/
endef

define Package/$(LUCI_NAME)/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0
rm -f /tmp/luci-indexcache.*
rm -rf /tmp/luci-modulecache/
exit 0
endef

# call BuildPackage - OpenWrt buildroot signature
#
# feeds/luci/luci.mk (included above) already runs
#   $(foreach pkg,$(LUCI_BUILD_PACKAGES),$(eval $(call BuildPackage,$(pkg))))
# for this package, so no explicit
#   $(eval $(call BuildPackage,$(LUCI_NAME)))
# may be added here. A second eval defines the package twice: the package
# metadata is dumped twice into tmp/.packageinfo, .config-package.in ends up
# with two "config PACKAGE_luci-app-clientstatus" blocks and make menuconfig
# lists the package on two rows (scripts/config/menu.c:menu_add_entry() always
# allocates a new menu entry, it does not look for an existing one).
#
# The literal string above is nevertheless REQUIRED: include/scan.mk discovers
# package Makefiles with
#   find ... -name Makefile | xargs grep -aHE 'call (Build/DefaultTargets|BuildPackage|KernelPackage)'
# so a Makefile without it is never scanned, never lands in tmp/.packageinfo
# and the package silently disappears from every generated image.
#
# Note for later: this package has no po/ directory, so luci.mk does not
# generate a translation package for it. Should one be added, luci.mk would
# name it luci-i18n-clientstatus-zh-cn - the same name the hand written
# package/emortal/luci-i18n-clientstatus-zh-cn already uses, and the two would
# collide.
