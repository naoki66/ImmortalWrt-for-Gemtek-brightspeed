#
# Copyright (C) 2024-2026 luci-theme-glass contributors
#
# This is free software, licensed under the GNU General Public License v3.0.
#

include $(TOPDIR)/rules.mk

LUCI_TITLE:=Glass - Apple-inspired glassmorphism theme for LuCI
LUCI_DEPENDS:=
PKG_VERSION:=$(shell cat $(CURDIR)/ucode/template/themes/glass/version | tr -d '[:space:]')
PKG_RELEASE:=1

# The package directory retains its upstream .git metadata, so luci.mk's
# findrev-based translation version would not change with integration commits.
PKG_PO_VERSION:=100.$(PKG_VERSION)-r$(PKG_RELEASE)

# Disable CSS minification (backdrop-filter can break with csstidy)
CONFIG_LUCI_CSSTIDY:=

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
