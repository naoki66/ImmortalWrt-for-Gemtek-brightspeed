include $(TOPDIR)/rules.mk

PKG_NAME:=xr1710g-tcp-window
PKG_VERSION:=1.0
PKG_RELEASE:=1
PKG_LICENSE:=GPL-2.0-only

include $(INCLUDE_DIR)/package.mk

define Package/xr1710g-tcp-window
  SECTION:=net
  CATEGORY:=Network
  TITLE:=Opt-in local TCP receive-window workaround for a 2.4GHz station
  DEPENDS:=@TARGET_airoha +ip-full +iw +uci
endef

define Package/xr1710g-tcp-window/description
 Applies a route receive-window metric only for one explicitly configured
 2.4GHz station. IPv4 router-local TCP only. Disabled by default.
endef

define Package/xr1710g-tcp-window/conffiles
/etc/config/xr1710g_tcp_window
endef

define Build/Compile
endef

define Package/xr1710g-tcp-window/install
	$(INSTALL_DIR) $(1)/usr/sbin $(1)/etc/init.d $(1)/etc/config
	$(INSTALL_BIN) ./files/xr1710g-tcp-window $(1)/usr/sbin/xr1710g-tcp-window
	$(INSTALL_BIN) ./files/xr1710g-tcp-window.init $(1)/etc/init.d/xr1710g-tcp-window
	$(INSTALL_CONF) ./files/xr1710g_tcp_window $(1)/etc/config/xr1710g_tcp_window
endef

$(eval $(call BuildPackage,xr1710g-tcp-window))
