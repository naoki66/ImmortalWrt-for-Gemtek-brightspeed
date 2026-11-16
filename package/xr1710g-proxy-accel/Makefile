include $(TOPDIR)/rules.mk

PKG_NAME:=xr1710g-proxy-accel
PKG_VERSION:=1.0
PKG_RELEASE:=1
PKG_LICENSE:=GPL-2.0

include $(INCLUDE_DIR)/package.mk

define Package/xr1710g-proxy-accel
  SECTION:=net
  CATEGORY:=Network
  TITLE:=XR1710G OpenClash and Passwall EIP93 integration
  DEPENDS:=@TARGET_airoha_an7581 +luci-app-openclash +mihomo +luci-app-passwall +xray-core +kmod-crypto-hw-airoha-eip93 +kmod-crypto-user +kmod-crypto-gcm +kmod-cryptodev
endef

define Package/xr1710g-proxy-accel/conffiles
/etc/config/xr1710g_crypto
endef

define Build/Compile
endef

define Package/xr1710g-proxy-accel/install
	$(INSTALL_DIR) $(1)/etc/config $(1)/etc/openclash/core $(1)/usr/sbin $(1)/usr/share/xr1710g-proxy-accel
	$(INSTALL_CONF) ./files/xr1710g_crypto $(1)/etc/config/xr1710g_crypto
	$(INSTALL_BIN) ./files/xr1710g-crypto-status $(1)/usr/sbin/xr1710g-crypto-status
	$(INSTALL_DATA) ./files/env.sh $(1)/usr/share/xr1710g-proxy-accel/env.sh
	$(LN) /usr/libexec/mihomo $(1)/etc/openclash/core/clash_meta
endef

$(eval $(call BuildPackage,xr1710g-proxy-accel))
