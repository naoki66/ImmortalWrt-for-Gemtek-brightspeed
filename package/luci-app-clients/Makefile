# SPDX-License-Identifier: Apache-2.0

include $(TOPDIR)/rules.mk

LUCI_TITLE:=LuCI Net Clients - addresses, traffic and DNS
# ucode backs /usr/libexec/clients-probe and /usr/libexec/clients-dns, the two
# data sources of the page. rpcd-mod-iwinfo provides the iwinfo ubus object the
# probe calls for the association list.
#
# nlbwmon is a hard dependency on purpose: it is what turns the "This month"
# column from an empty heading into a real period total, and the accounting
# database only starts accumulating from the day it is installed - deferring the
# install just delays the first usable month. The page still degrades gracefully
# if the binary is missing (clients-probe reports available: false and the
# column stays empty), so a stripped image that drops it will not break.
LUCI_DEPENDS:=+luci-base +ucode +ucode-mod-fs +ucode-mod-ubus +rpcd-mod-iwinfo +nlbwmon
# Deliberately NOT a dependency: luci-app-bandix. Its per-device counters are
# exact, but they only exist with the flow offload turned off, and on a PON
# gateway that costs more throughput than the measurement is worth. Everything
# this page shows is derived from conntrack accounting (which the driver keeps
# updating for PPE-offloaded flows) plus dnsmasq's own query log.
#
# Also not a dependency, for the same reason: nlbwmon. It provides the
# long-term (per accounting period) counters the live table cannot, because it
# records each stream when it closes instead of sampling a table that forgets.
# It is enabled in the image configs, but the page must keep working on an
# image built without it - the month column simply stays empty.
LUCI_DESCRIPTION:=One place for every LAN client: addresses with their source, \
	LAN/WAN traffic split, and the DNS lookups each device made.
PKG_VERSION:=0.1.0
PKG_RELEASE:=1

PKG_LICENSE:=Apache-2.0

# root/usr/libexec/clients-* and root/etc/init.d/clients must keep their
# executable bit (0755 in git). luci.mk copies root/ with $(CP), which preserves
# the mode, so the bit recorded in git is what ends up on the target. A
# non-executable probe leaves the page permanently empty.
#
# The two files the page reads through fs.read - /tmp/clients-history.json and
# /tmp/clients-dns.json - are granted in acl.d by path. Changing
# clients.global.history_path to somewhere else needs that ACL updated too.

# dnsmasq query logging has one trap worth spelling out: OpenWrt ships
# log-facility=/dev/null inside /etc/dnsmasq.conf, and a second log-facility
# emitted from UCI aborts startup with "illegal repeated keyword at line N" -
# DNS stops entirely, including for every client on the LAN. So the base
# directive is commented out and UCI becomes the only source for the path.
# prerm puts it back, but only for the exact placeholder this installed.

define Package/luci-app-clients/postinst
[ -n "$${IPKG_INSTROOT}" ] || { \
	[ -e /etc/dnsmasq.conf ] && sed -i -e 's|^log-facility=.*|#log-facility=/dev/null|' /etc/dnsmasq.conf; \
	uci -q set dhcp.@dnsmasq[0].logqueries='1'; \
	uci -q set dhcp.@dnsmasq[0].logfacility='/tmp/dnsmasq.log'; \
	uci -q commit dhcp; \
	/etc/init.d/dnsmasq restart 2>/dev/null; \
	rm -f /tmp/luci-indexcache.*; \
	rm -rf /tmp/luci-modulecache/; \
	/etc/init.d/rpcd reload 2>/dev/null; \
	/etc/init.d/clients enable 2>/dev/null; \
	/etc/init.d/clients restart 2>/dev/null; \
	exit 0; \
}
endef

define Package/luci-app-clients/prerm
[ -n "$${IPKG_INSTROOT}" ] || { \
	/etc/init.d/clients stop 2>/dev/null; \
	/etc/init.d/clients disable 2>/dev/null; \
	uci -q delete dhcp.@dnsmasq[0].logqueries; \
	uci -q delete dhcp.@dnsmasq[0].logfacility; \
	uci -q commit dhcp; \
	[ -e /etc/dnsmasq.conf ] && sed -i -e 's|^#log-facility=/dev/null|log-facility=/dev/null|' /etc/dnsmasq.conf; \
	/etc/init.d/dnsmasq restart 2>/dev/null; \
	rm -f /tmp/clients-history.json /tmp/clients-dns.json /tmp/clients-dns.json.new; \
	rm -f /tmp/luci-indexcache.*; \
	rm -rf /tmp/luci-modulecache/; \
	exit 0; \
}
endef

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage: feed scanner marker; luci.mk generates the package rules.
