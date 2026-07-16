include $(TOPDIR)/rules.mk

PKG_NAME:=clientstatus
PKG_VERSION:=1.0.8
PKG_RELEASE:=1
PKG_LICENSE:=GPL-2.0
PKG_MAINTAINER:=emortal

include $(INCLUDE_DIR)/package.mk

define Package/clientstatus
  SECTION:=net
  CATEGORY:=Network
  TITLE:=LAN Client Status Monitor
  DEPENDS:=@TARGET_airoha +libc
  DESCRIPTION:=\
	A lightweight daemon that monitors LAN client online/offline status \
	by combining ARP table, ip neigh, and DHCP lease data with ICMP probes.
endef

define Build/Prepare
endef

define Build/Compile
endef

define Package/clientstatus/install
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) ./files/clientstatus.aarch64 $(1)/usr/bin/clientstatus

	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/clientstatus.init $(1)/etc/init.d/clientstatus

	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_DATA) ./files/clientstatus.config $(1)/etc/config/clientstatus
endef

$(eval $(call BuildPackage,clientstatus))
