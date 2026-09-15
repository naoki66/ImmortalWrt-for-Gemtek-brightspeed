include $(TOPDIR)/rules.mk

LUCI_NAME:=luci-app-mesh-conf
PKG_VERSION:=0.1.0
PKG_RELEASE:=8

PKG_MAINTAINER:=XR1710G Maintainer
PKG_LICENSE:=GPL-2.0-or-later

LUCI_TITLE:=LuCI batman-adv Mesh Configuration
LUCI_DESCRIPTION:=Wired or wireless 802.11s mesh backhaul (one link at a time), batman-adv or HWMP routing, master/slave roles, multi-SSID per radio with VLAN binding and 802.11k/v/r roaming options, bridge-vlan network segmentation, 802.11s link diagnostics, config backup/rollback and mesh topology discovery. Upstream WAN mode (AP / DHCP / PPPoE) is handled by luci-app-netmode.
# iw-full is deliberately NOT a dependency: it conflicts with the plain iw
# build (both provide /usr/sbin/iw). Only "iw station set <mac> plink_action"
# needs it, so the diagnostics page reports the feature as unavailable and
# tells the operator to swap the package by hand.
LUCI_DEPENDS:=+luci-base +rpcd +jsonfilter +iw +iwinfo +ip-full +kmod-batman-adv +batctl-full +wpad-mesh-mbedtls
LUCI_PKGARCH:=all

include $(TOPDIR)/feeds/luci/luci.mk

# mesh-conf installs every file as
#   [ -f ./src ] && tr -d '\r' < ./src | install -m <mode> /dev/stdin <dst>
#
# - install -m <mode> is what $(INSTALL_DATA)/$(INSTALL_BIN) expand to anyway
#   (rules.mk:332/335). It replaced "tr > dst; chmod dst" because a standalone
#   chmod on the ipkg-install path (which expands with a doubled slash) did not
#   stick during fakeroot packaging: the rpcd plugin shipped mode 0664, had no
#   exec bit, rpcd dropped it on startup, and every call answered -32000
#   "Object not found". install(1) sets the mode on the file it creates.
# - The [ -f ] test keeps the existence check $(INSTALL_DATA) used to give us:
#   the shell reports only a pipeline's last status, so without it a missing
#   source would let install write a 0-byte file and the recipe would still pass.
# - The CR strip is belt and braces. .gitattributes already pins
#   package/luci-app-mesh-conf/** to LF, so a CRLF shebang should not reach the
#   tree - but this package has shipped a dead rpcd plugin twice, and a CRLF
#   shebang fails exactly like the missing exec bit did.
#
# Deliberately NOT applied to the other luci-app packages: they have no such
# history and keep the plain INSTALL_DATA/INSTALL_BIN form.
define Package/$(LUCI_NAME)/install
	$(INSTALL_DIR) $(1)/www/luci-static/resources/view/meshconf
	[ -f ./htdocs/luci-static/resources/view/meshconf/meshconf.js ] && tr -d '\r' < ./htdocs/luci-static/resources/view/meshconf/meshconf.js \
		| install -m 0644 /dev/stdin $(1)/www/luci-static/resources/view/meshconf/meshconf.js

	$(INSTALL_DIR) $(1)/usr/libexec/rpcd
	[ -f ./root/usr/libexec/rpcd/luci.meshconf ] && tr -d '\r' < ./root/usr/libexec/rpcd/luci.meshconf \
		| install -m 0755 /dev/stdin $(1)/usr/libexec/rpcd/luci.meshconf

	$(INSTALL_DIR) $(1)/usr/share/luci/menu.d
	[ -f ./root/usr/share/luci/menu.d/luci-app-mesh-conf.json ] && tr -d '\r' < ./root/usr/share/luci/menu.d/luci-app-mesh-conf.json \
		| install -m 0644 /dev/stdin $(1)/usr/share/luci/menu.d/luci-app-mesh-conf.json

	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
	[ -f ./root/usr/share/rpcd/acl.d/luci-app-mesh-conf.json ] && tr -d '\r' < ./root/usr/share/rpcd/acl.d/luci-app-mesh-conf.json \
		| install -m 0644 /dev/stdin $(1)/usr/share/rpcd/acl.d/luci-app-mesh-conf.json

	$(INSTALL_DIR) $(1)/etc/init.d
	[ -f ./root/etc/init.d/meshconf-fix ] && tr -d '\r' < ./root/etc/init.d/meshconf-fix \
		| install -m 0755 /dev/stdin $(1)/etc/init.d/meshconf-fix

	# The package is usually built into the image (=y), so postinst runs with
	# IPKG_INSTROOT set and bails out before it can enable the service.
	# Ship the rc.d link in the image instead.
	$(INSTALL_DIR) $(1)/etc/rc.d
	ln -sf ../init.d/meshconf-fix $(1)/etc/rc.d/S11meshconf-fix
endef

define Package/$(LUCI_NAME)/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0

# Self-heal. rpcd enumerates /usr/libexec/rpcd at startup and drops any
# plugin it cannot exec -> a CRLF shebang ("/bin/sh\r") or a missing exec
# bit shows up as -32000 "Object not found" until it is fixed by hand.
sed -i 's/\r$$//' /usr/libexec/rpcd/luci.meshconf 2>/dev/null
chmod 0755 /usr/libexec/rpcd/luci.meshconf 2>/dev/null
sed -i 's/\r$$//' /www/luci-static/resources/view/meshconf/meshconf.js 2>/dev/null

/etc/init.d/meshconf-fix enable 2>/dev/null

# rpcd must be restarted (not just signalled) to re-enumerate the plugins
/etc/init.d/rpcd restart 2>/dev/null

# give rpcd a few seconds to publish the object before giving up
i=0
while [ $$i -lt 5 ]; do
	ubus list luci.meshconf >/dev/null 2>&1 && break
	i=$$((i + 1))
	sleep 1
done

rm -f /tmp/luci-indexcache.*
rm -rf /tmp/luci-modulecache/
exit 0
endef

define Package/$(LUCI_NAME)/prerm
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0
/etc/init.d/meshconf-fix disable 2>/dev/null
rm -f /etc/rc.d/S??meshconf-fix
/etc/init.d/rpcd restart 2>/dev/null
exit 0
endef

# call BuildPackage - OpenWrt buildroot signature
