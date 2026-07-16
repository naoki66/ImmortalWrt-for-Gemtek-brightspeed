include $(TOPDIR)/rules.mk

PKG_NAME:=luci-i18n-clientstatus-zh-cn
PKG_VERSION:=1.0.9
PKG_RELEASE:=1
PKG_LICENSE:=Apache-2.0

PKG_LIBDIR:=/usr/lib/lua/luci

include $(INCLUDE_DIR)/package.mk

define Package/luci-i18n-clientstatus-zh-cn
  SECTION:=luci
  CATEGORY:=LuCI
  SUBMENU:=Translations
  TITLE:=Chinese (Simplified) translation for luci-app-clientstatus
  DEPENDS:=+luci-app-clientstatus +luci-i18n-base-zh-cn
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

$(eval $(call BuildPackage,luci-i18n-clientstatus-zh-cn))
