include $(TOPDIR)/rules.mk

PKG_NAME:=xr1710g-ui-defaults
PKG_VERSION:=1.0
PKG_RELEASE:=1
PKG_LICENSE:=GPL-2.0

include $(INCLUDE_DIR)/package.mk

define Package/xr1710g-ui-defaults
  SECTION:=luci
  CATEGORY:=LuCI
  TITLE:=XR1710G Material theme defaults
  DEPENDS:=@TARGET_airoha_an7581 +luci-theme-material
endef

define Build/Compile
endef

define Package/xr1710g-ui-defaults/install
	$(INSTALL_DIR) $(1)/etc/uci-defaults
	$(INSTALL_BIN) ./files/zz-xr1710g-material $(1)/etc/uci-defaults/zz-xr1710g-material
endef

$(eval $(call BuildPackage,xr1710g-ui-defaults))
