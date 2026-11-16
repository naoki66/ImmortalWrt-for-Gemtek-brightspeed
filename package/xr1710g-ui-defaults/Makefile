include $(TOPDIR)/rules.mk

PKG_NAME:=xr1710g-ui-defaults
PKG_VERSION:=1.0
PKG_RELEASE:=3
PKG_LICENSE:=GPL-2.0

include $(INCLUDE_DIR)/package.mk

define Package/xr1710g-ui-defaults
  SECTION:=luci
  CATEGORY:=LuCI
  TITLE:=XR1710G Glass theme defaults (YYH)
  DEPENDS:=@TARGET_airoha_an7581 +luci-theme-glass +luci-i18n-base-zh-cn +luci-i18n-glass-zh-cn
endef

define Build/Compile
endef

define Package/xr1710g-ui-defaults/install
	$(INSTALL_DIR) $(1)/etc/uci-defaults
	$(INSTALL_BIN) ./files/zz-xr1710g-glass $(1)/etc/uci-defaults/zz-xr1710g-glass
endef

$(eval $(call BuildPackage,xr1710g-ui-defaults))
