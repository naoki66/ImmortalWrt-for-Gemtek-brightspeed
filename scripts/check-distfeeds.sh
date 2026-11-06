#!/usr/bin/env bash
# Generate distfeeds the way base-files does and reject build-only git feeds.
# Those feeds are compiled into the image, but public OpenWrt/ImmortalWrt
# snapshot trees do not publish packages/<arch>/<feed>/packages.adb for them.
# Listing them makes runtime `apk update` fail with HTTP 404 (wget exit 8).

set -Eeuo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

fail() {
	echo "check-distfeeds: $*" >&2
	exit 1
}

render() {
	local mode="$1"
	local apk="$tmp/$mode.apk"
	local opkg="$tmp/$mode.opkg"
	local per_feed="$2"
	local buildbot="$3"

	cat >"$tmp/$mode.mk" <<EOF
TMP_DIR := $tmp/empty
TOPDIR := $root
SCRIPT_DIR := \$(TOPDIR)/scripts
include $root/include/feeds.mk

# Production FEEDS_AVAILABLE is sorted. Keep that order here.
FEEDS_AVAILABLE := app_airoha easytier glass helloworld luci luci_app_bandix onu_config openwrt_bandix packages pon_drivers pon_userspace pushbot routing telephony video

CONFIG_PER_FEED_REPO := $per_feed
CONFIG_BUILDBOT := $buildbot
CONFIG_FEED_packages := y
CONFIG_FEED_luci := y
CONFIG_FEED_routing := y
CONFIG_FEED_telephony := y
CONFIG_FEED_video := m
CONFIG_FEED_app_airoha := y
CONFIG_FEED_easytier := y
CONFIG_FEED_glass := y
CONFIG_FEED_helloworld := y
CONFIG_FEED_luci_app_bandix := y
CONFIG_FEED_onu_config := y
CONFIG_FEED_openwrt_bandix := y
CONFIG_FEED_pon_drivers := y
CONFIG_FEED_pon_userspace := y
CONFIG_FEED_pushbot := y
LINUX_VERSION := 6.18
LINUX_RELEASE := 1
LINUX_VERMAGIC := testverm

OUT_APK := $apk
OUT_OPKG := $opkg

.PHONY: all
all:
	rm -f \$(OUT_APK) \$(OUT_OPKG)
	\$(call FeedSourcesAppendAPK,\$(OUT_APK))
	\$(call FeedSourcesAppendOPKG,\$(OUT_OPKG))
EOF

	make -C "$tmp" -f "$tmp/$mode.mk" all >/dev/null
	printf '%s %s\n' "$apk" "$opkg"
}

assert_file() {
	local path="$1"
	local expected="$2"
	local actual
	actual="$(cat "$path")"
	if [[ "$actual" != "$expected" ]]; then
		echo "check-distfeeds: mismatch: $path" >&2
		diff -u <(printf '%s\n' "$expected") "$path" >&2 || true
		exit 1
	fi
}

read -r apk opkg < <(render per-feed y '')

assert_file "$apk" "$(cat <<'EOF'
# This file is auto-generated and build-specific, any changes will be intentionally lost in sysupgrade.
# Add your custom feeds to /etc/apk/repositories.d/customfeeds.list
%U/targets/%S/packages/packages.adb
%U/packages/%A/base/packages.adb
%U/packages/%A/luci/packages.adb
%U/packages/%A/packages/packages.adb
%U/packages/%A/routing/packages.adb
%U/packages/%A/telephony/packages.adb
# %U/packages/%A/video/packages.adb
EOF
)"

assert_file "$opkg" "$(cat <<'EOF'
src/gz %d_core %U/targets/%S/packages
src/gz %d_base %U/packages/%A/base
src/gz %d_luci %U/packages/%A/luci
src/gz %d_packages %U/packages/%A/packages
src/gz %d_routing %U/packages/%A/routing
src/gz %d_telephony %U/packages/%A/telephony
# src/gz %d_video %U/packages/%A/video
EOF
)"

read -r apk opkg < <(render buildbot y y)

assert_file "$apk" "$(cat <<'EOF'
# This file is auto-generated and build-specific, any changes will be intentionally lost in sysupgrade.
# Add your custom feeds to /etc/apk/repositories.d/customfeeds.list
%U/targets/%S/packages/packages.adb
%U/packages/%A/base/packages.adb
%U/targets/%S/kmods/6.18-1-testverm/packages.adb
%U/packages/%A/luci/packages.adb
%U/packages/%A/packages/packages.adb
%U/packages/%A/routing/packages.adb
%U/packages/%A/telephony/packages.adb
# %U/packages/%A/video/packages.adb
EOF
)"

read -r apk opkg < <(render core '' '')

assert_file "$apk" "$(cat <<'EOF'
# This file is auto-generated and build-specific, any changes will be intentionally lost in sysupgrade.
# Add your custom feeds to /etc/apk/repositories.d/customfeeds.list
%U/targets/%S/packages/packages.adb
EOF
)"

assert_file "$opkg" "$(cat <<'EOF'
src/gz %d_core %U/targets/%S/packages
EOF
)"

# Device configs enable the build-only feeds. None of those names may be
# emitted, including when the feed is commented out in feeds.conf.default
# but still set in an older .config (glass, pon_userspace).
for cfg in "$root"/2010.config "$root"/2010-2g.config "$root"/1710.config "$root"/040.config; do
	[[ -f "$cfg" ]] || continue
	names="$(sed -n 's/^CONFIG_FEED_\([A-Za-z0-9_]*\)=.*/\1/p' "$cfg" | sort -u | tr '\n' ' ')"
	[[ -n "$names" ]] || fail "no CONFIG_FEED_* entries in $cfg"
	mode="$(basename "$cfg")"
	cat >"$tmp/$mode.mk" <<EOF
TMP_DIR := $tmp/empty
TOPDIR := $root
SCRIPT_DIR := \$(TOPDIR)/scripts
include $root/include/feeds.mk

FEEDS_AVAILABLE := $names
CONFIG_PER_FEED_REPO := y
EOF
	while read -r line; do
		[[ "$line" =~ ^CONFIG_FEED_([A-Za-z0-9_]*)=(.*)$ ]] || continue
		printf 'CONFIG_FEED_%s := %s\n' "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}" >>"$tmp/$mode.mk"
	done <"$cfg"
	cat >>"$tmp/$mode.mk" <<EOF
OUT_APK := $tmp/$mode.apk
.PHONY: all
all:
	rm -f \$(OUT_APK)
	\$(call FeedSourcesAppendAPK,\$(OUT_APK))
EOF
	make -C "$tmp" -f "$tmp/$mode.mk" all >/dev/null
	for blocked in app_airoha easytier glass helloworld luci_app_bandix onu_config openwrt_bandix pon_drivers pon_userspace pushbot; do
		if grep -q "/${blocked}/" "$tmp/$mode.apk"; then
			echo "check-distfeeds: $cfg still lists build-only feed $blocked" >&2
			cat "$tmp/$mode.apk" >&2
			exit 1
		fi
	done
	for required in base luci packages routing telephony; do
		grep -qx "%U/packages/%A/${required}/packages.adb" "$tmp/$mode.apk" \
			|| fail "$cfg dropped published feed $required"
	done
done

echo "check-distfeeds: ok"
