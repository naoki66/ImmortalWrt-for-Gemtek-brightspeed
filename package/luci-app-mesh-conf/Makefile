include $(TOPDIR)/rules.mk

LUCI_NAME:=luci-app-mesh-conf
PKG_VERSION:=0.2.0
PKG_RELEASE:=1

PKG_MAINTAINER:=XR1710G Maintainer
PKG_LICENSE:=GPL-2.0-or-later

LUCI_TITLE:=LuCI Mesh Configuration
LUCI_DESCRIPTION:=Join two XR1710G units: native 802.11s wireless mesh, or wired sync over the LAN (L2 neighbour discovery plus push/pull of /etc/config/wireless behind a shared key) with one-click 802.11k/v/r roaming.
# wpad-mesh-* replaces wpad-basic: 802.11s needs a hostapd built with mesh
# support. socat carries the L2 discovery datagrams; uhttpd serves the sync
# endpoint and uclient-fetch is the http client used to push a config.
LUCI_DEPENDS:=+luci-base +rpcd +jsonfilter +iw +uhttpd +uclient-fetch +socat +wpad-mesh-mbedtls
LUCI_PKGARCH:=all

include $(TOPDIR)/feeds/luci/luci.mk

# Every file goes in as
#   [ -f ./src ] && tr -d '\r' < ./src | install -m <mode> /dev/stdin <dst>
#
# - install -m <mode> is what $(INSTALL_DATA)/$(INSTALL_BIN) expand to anyway
#   (rules.mk). It replaced "tr > dst; chmod dst" because a standalone chmod on
#   the ipkg-install path (which expands with a doubled slash) did not stick
#   during fakeroot packaging: the rpcd plugin shipped mode 0664, had no exec
#   bit, rpcd dropped it on startup, and every call answered -32000
#   "Object not found". install(1) sets the mode on the file it creates.
# - The [ -f ] test keeps the existence check $(INSTALL_DATA) used to give us:
#   the shell reports only a pipeline's last status, so without it a missing
#   source would let install write a 0-byte file and the recipe would pass.
# - The CR strip is belt and braces: .gitattributes already pins this package
#   to LF, but a CRLF shebang fails exactly like a missing exec bit did, and
#   this package has shipped a dead rpcd plugin twice before.
define Package/$(LUCI_NAME)/install
	$(INSTALL_DIR) $(1)/www/luci-static/resources/view/meshconf
	[ -f ./htdocs/luci-static/resources/view/meshconf/meshconf.js ] && tr -d '\r' < ./htdocs/luci-static/resources/view/meshconf/meshconf.js \
		| install -m 0644 /dev/stdin $(1)/www/luci-static/resources/view/meshconf/meshconf.js

	$(INSTALL_DIR) $(1)/usr/libexec/rpcd
	[ -f ./root/usr/libexec/rpcd/luci.meshconf ] && tr -d '\r' < ./root/usr/libexec/rpcd/luci.meshconf \
		| install -m 0755 /dev/stdin $(1)/usr/libexec/rpcd/luci.meshconf

	$(INSTALL_DIR) $(1)/usr/sbin
	[ -f ./root/usr/sbin/meshconf-beacon ] && tr -d '\r' < ./root/usr/sbin/meshconf-beacon \
		| install -m 0755 /dev/stdin $(1)/usr/sbin/meshconf-beacon

	$(INSTALL_DIR) $(1)/usr/share/meshconf
	[ -f ./root/usr/share/meshconf/lib.sh ] && tr -d '\r' < ./root/usr/share/meshconf/lib.sh \
		| install -m 0644 /dev/stdin $(1)/usr/share/meshconf/lib.sh

	$(INSTALL_DIR) $(1)/usr/share/meshconf/www/cgi
	[ -f ./root/usr/share/meshconf/www/cgi/sync ] && tr -d '\r' < ./root/usr/share/meshconf/www/cgi/sync \
		| install -m 0755 /dev/stdin $(1)/usr/share/meshconf/www/cgi/sync

	$(INSTALL_DIR) $(1)/usr/share/luci/menu.d
	[ -f ./root/usr/share/luci/menu.d/luci-app-mesh-conf.json ] && tr -d '\r' < ./root/usr/share/luci/menu.d/luci-app-mesh-conf.json \
		| install -m 0644 /dev/stdin $(1)/usr/share/luci/menu.d/luci-app-mesh-conf.json

	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
	[ -f ./root/usr/share/rpcd/acl.d/luci-app-mesh-conf.json ] && tr -d '\r' < ./root/usr/share/rpcd/acl.d/luci-app-mesh-conf.json \
		| install -m 0644 /dev/stdin $(1)/usr/share/rpcd/acl.d/luci-app-mesh-conf.json

	$(INSTALL_DIR) $(1)/etc/init.d
	[ -f ./root/etc/init.d/meshconf ] && tr -d '\r' < ./root/etc/init.d/meshconf \
		| install -m 0755 /dev/stdin $(1)/etc/init.d/meshconf

	# Only a default: an upgrade must not overwrite the sync key the operator
	# already set. When $(1) is the live rootfs the file exists and is kept.
	$(INSTALL_DIR) $(1)/etc/config
	[ -f $(1)/etc/config/meshconf ] || \
		(tr -d '\r' < ./root/etc/config/meshconf | install -m 0644 /dev/stdin $(1)/etc/config/meshconf)

	# The package is usually built into the image (=y), so postinst runs with
	# IPKG_INSTROOT set and bails out before it can enable the service.
	# Ship the rc.d link in the image instead.
	$(INSTALL_DIR) $(1)/etc/rc.d
	ln -sf ../init.d/meshconf $(1)/etc/rc.d/S95meshconf
endef

define Package/$(LUCI_NAME)/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0

# The previous release shipped a second init script whose only job was to
# repair this package's file modes. opkg leaves files it no longer owns in
# place, so a stale /etc/rc.d/S11meshconf-fix would keep pointing at it.
rm -f /etc/init.d/meshconf-fix /etc/rc.d/S??meshconf-fix

# Self-heal. rpcd enumerates /usr/libexec/rpcd at startup and drops any plugin
# it cannot exec -> a CRLF shebang ("/bin/sh\r") or a missing exec bit shows up
# as -32000 "Object not found" until it is fixed by hand.
sed -i 's/\r$$//' /usr/libexec/rpcd/luci.meshconf 2>/dev/null
chmod 0755 /usr/libexec/rpcd/luci.meshconf 2>/dev/null
chmod 0755 /usr/sbin/meshconf-beacon 2>/dev/null
chmod 0755 /usr/share/meshconf/www/cgi/sync 2>/dev/null
sed -i 's/\r$$//' /www/luci-static/resources/view/meshconf/meshconf.js 2>/dev/null

/etc/init.d/meshconf enable 2>/dev/null
/etc/init.d/meshconf restart 2>/dev/null

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
/etc/init.d/meshconf disable 2>/dev/null
/etc/init.d/meshconf stop 2>/dev/null
rm -f /etc/rc.d/S??meshconf
/etc/init.d/rpcd restart 2>/dev/null
exit 0
endef

# call BuildPackage - OpenWrt buildroot signature
