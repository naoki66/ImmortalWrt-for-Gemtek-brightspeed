# This is free software, licensed under the Apache License, Version 2.0.
include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-mlo
PKG_VERSION:=1.0.0
PKG_RELEASE:=1
PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=YYH2913

LUCI_TITLE:=LuCI Support for Wi-Fi MLO
LUCI_DESCRIPTION:=A dedicated editor for OpenWrt Multi-Link Operation. \
	Manages multi-radio device lists, shows MLD runtime state, \
	and prefills safer MLO defaults.
LUCI_DEPENDS:=+luci-base +luci-mod-network

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - luci.mk handles install, i18n, and postinst automatically
