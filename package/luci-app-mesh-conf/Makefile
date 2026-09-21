include $(TOPDIR)/rules.mk

LUCI_NAME:=luci-app-mesh-conf
# 0.3.0 - adds the steering layer on top of 802.11k/v/r: the DAWN daemon makes
# the roaming decisions, this package generates its config (including the
# derived broadcast address and shared key), ships it to the peer and shows
# what the whole network sees.
PKG_VERSION:=0.3.0
PKG_RELEASE:=1

PKG_MAINTAINER:=XR1710G Maintainer
PKG_LICENSE:=GPL-2.0-or-later

LUCI_TITLE:=LuCI Mesh Configuration
LUCI_DESCRIPTION:=Join two XR1710G units: native 802.11s wireless mesh, or wired sync over the LAN (L2 neighbour discovery plus push/pull of /etc/config/wireless behind a shared key) with one-click 802.11k/v/r roaming, DAWN-driven client steering and a shared view of every AP and client in the network.
# wpad-mesh-* replaces wpad-basic: 802.11s needs a hostapd built with mesh
# support. socat carries the L2 discovery datagrams; uhttpd serves the sync
# endpoint and uclient-fetch is the http client used to push a config.
# dawn is the steering daemon: 802.11k/v only tells a client where it could
# go, DAWN is what decides that it should. It talks to the same hostapd whose
# ubus support the mesh wpad already brings, and needs umdns (its own dep).
LUCI_DEPENDS:=+luci-base +rpcd +jsonfilter +iw +uhttpd +uclient-fetch +socat +wpad-mesh-mbedtls +dawn
LUCI_PKGARCH:=all

include $(TOPDIR)/feeds/luci/luci.mk

# Files are stripped of CR and installed from a *regular* file, never through
# `| install -m <mode> /dev/stdin <dst>`. That form shipped
# /usr/sbin/meshconf-beacon as 0664 on a real device: procd could not exec it,
# so no instance ever spawned, `ubus call service list {"name":"meshconf"}`
# answered {} and the page reported "service not running" - with an empty
# logread, because nothing had failed loudly enough to log.
#
# The exec bit is the only thing keeping this package alive (the postinst
# chmods do not run when the package is built into the image: IPKG_INSTROOT is
# set and it exits early), so the recipe verifies it instead of trusting it.
#
# The CR strip is belt and braces: .gitattributes already pins this package to
# LF, but a CRLF shebang fails exactly like a missing exec bit, and this
# package has shipped a dead rpcd plugin twice before.
MESHCONF_STAGE:=$(TMP_DIR)/luci-app-mesh-conf

# $(1) source, $(2) destination, $(3) mode
define MeshConf/install-file
	$(INSTALL_DIR) $(MESHCONF_STAGE) $(dir $(2))
	[ -f $(1) ] || { echo "luci-app-mesh-conf: missing source $(1)" >&2; exit 1; }
	tr -d '\r' < $(1) > $(MESHCONF_STAGE)/$(notdir $(2))
	install -m $(3) $(MESHCONF_STAGE)/$(notdir $(2)) $(2)
endef

# $(1) source, $(2) destination - 0755, and fail the build if it does not take
define MeshConf/install-exec
	$(call MeshConf/install-file,$(1),$(2),0755)
	chmod 0755 $(2)
	[ -x $(2) ] || { \
		echo "luci-app-mesh-conf: $(2) shipped without the exec bit (mode $$(stat -c '%a' $(2) 2>/dev/null)); procd cannot start it" >&2; \
		exit 1; \
	}
endef

define Package/$(LUCI_NAME)/install
	$(call MeshConf/install-file,./htdocs/luci-static/resources/view/meshconf/meshconf.js,$(1)/www/luci-static/resources/view/meshconf/meshconf.js,0644)
	$(call MeshConf/install-file,./htdocs/luci-static/resources/view/meshconf/steering.js,$(1)/www/luci-static/resources/view/meshconf/steering.js,0644)
	$(call MeshConf/install-file,./htdocs/luci-static/resources/view/meshconf/ds-tokens.js,$(1)/www/luci-static/resources/view/meshconf/ds-tokens.js,0644)
	$(call MeshConf/install-exec,./root/usr/libexec/rpcd/luci.meshconf,$(1)/usr/libexec/rpcd/luci.meshconf)
	$(call MeshConf/install-exec,./root/usr/sbin/meshconf-beacon,$(1)/usr/sbin/meshconf-beacon)
	$(call MeshConf/install-file,./root/usr/share/meshconf/lib.sh,$(1)/usr/share/meshconf/lib.sh,0644)
	$(call MeshConf/install-exec,./root/usr/share/meshconf/www/cgi/sync,$(1)/usr/share/meshconf/www/cgi/sync)
	$(call MeshConf/install-file,./root/usr/share/luci/menu.d/luci-app-mesh-conf.json,$(1)/usr/share/luci/menu.d/luci-app-mesh-conf.json,0644)
	$(call MeshConf/install-file,./root/usr/share/rpcd/acl.d/luci-app-mesh-conf.json,$(1)/usr/share/rpcd/acl.d/luci-app-mesh-conf.json,0644)
	$(call MeshConf/install-exec,./root/etc/init.d/meshconf,$(1)/etc/init.d/meshconf)

	# Only a default: an upgrade must not overwrite the sync key the operator
	# already set. When $(1) is the live rootfs the file exists and is kept.
	$(INSTALL_DIR) $(1)/etc/config
	[ -f $(1)/etc/config/meshconf ] || \
		(tr -d '\r' < ./root/etc/config/meshconf > $(MESHCONF_STAGE)/meshconf && \
		 install -m 0644 $(MESHCONF_STAGE)/meshconf $(1)/etc/config/meshconf)

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
sed -i 's/\r$$//' /www/luci-static/resources/view/meshconf/steering.js 2>/dev/null
sed -i 's/\r$$//' /www/luci-static/resources/view/meshconf/ds-tokens.js 2>/dev/null

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
