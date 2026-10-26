include $(TOPDIR)/rules.mk

PKG_NAME:=luci-i18n-clientstatus-zh-cn
PKG_VERSION:=1.0.9
PKG_RELEASE:=2
PKG_LICENSE:=Apache-2.0

PKG_LIBDIR:=/usr/lib/lua/luci

include $(INCLUDE_DIR)/package.mk

define Package/luci-i18n-clientstatus-zh-cn
  SECTION:=luci
  CATEGORY:=LuCI
  SUBMENU:=Translations
  # Same 72 column budget as every other menuconfig row: the name
  # (27 characters) plus the title must stay below it, otherwise
  # scripts/package-metadata.pl drops the title and the row shows the package
  # name without any comment. The old title was 58 characters and did not
  # fit.
  TITLE:=luci-app-clientstatus - zh-cn translation
  # luci-i18n-base-zh-cn does not exist in this tree (the luci feed dropped
  # the base translation packages and ships one .lmo per app instead), so
  # depending on it made this package impossible to select: the row stayed
  # greyed out in menuconfig and the translation never reached the image.
  DEPENDS:=luci-app-clientstatus
  PKGARCH:=all
endef

define Build/Compile
endef

define Package/luci-i18n-clientstatus-zh-cn/install
	$(INSTALL_DIR) $(1)/etc/uci-defaults
	$(INSTALL_DATA) ./root/etc/uci-defaults/luci-i18n-clientstatus-zh-cn $(1)/etc/uci-defaults/

	$(INSTALL_DIR) $(1)$(PKG_LIBDIR)/i18n
	$(INSTALL_DATA) ./root$(PKG_LIBDIR)/i18n/clientstatus.zh-cn.lmo $(1)$(PKG_LIBDIR)/i18n/
endef

# call BuildPackage - OpenWrt buildroot signature
#
# This package does not use feeds/luci/luci.mk, it ships a prebuilt .lmo, so
# the explicit eval here is the only one and it stays. The literal string is
# also what include/scan.mk greps for to discover the package at all.
$(eval $(call BuildPackage,luci-i18n-clientstatus-zh-cn))
