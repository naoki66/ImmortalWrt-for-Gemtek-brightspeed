#!/bin/sh

# Validate the running layout, not just a board name or saved UCI version.
gemtek_ubi_layout_check() {
	local board="${1:-$(board_name)}" mtd bl2="" ubi="" dev attached=""
	local count=0 volume found bytes rootdisk
	case "$board" in
		gemtek,xg2010g|gemtek,xg2010g-ubi|gemtek,xr1710g-ubi) ;;
		*) return 1 ;;
	esac
	for mtd in /sys/class/mtd/mtd[0-9]*; do
		[ -r "$mtd/name" ] || continue
		count=$((count + 1))
		case "$(cat "$mtd/name")" in
			bl2) bl2="$mtd" ;;
			ubi) ubi="$mtd" ;;
		esac
	done
	[ "$count" = 2 ] && [ -n "$bl2" ] && [ -n "$ubi" ] || return 1
	[ "$(cat "$bl2/offset")" = 0 ] &&
	[ "$(cat "$bl2/size")" = 131072 ] &&
	[ "$(cat "$ubi/offset")" = 131072 ] || return 1

	for dev in /sys/class/ubi/ubi[0-9]*; do
		[ -r "$dev/mtd_num" ] || continue
		[ "$(cat "$dev/mtd_num")" = "${ubi##*/mtd}" ] && attached="$dev"
	done
	[ -n "$attached" ] || return 1
	for volume in fip ubootenv ubootenv2 factory fit; do
		found=""
		for dev in "$attached"_*; do
			[ -r "$dev/name" ] || continue
			[ "$(cat "$dev/name")" = "$volume" ] || continue
			bytes=$(cat "$dev/data_bytes")
			case "$bytes" in ''|*[!0-9]*) return 1 ;; esac
			[ "$bytes" -gt 0 ] || return 1
			found=1
		done
		[ "$found" = 1 ] || return 1
	done

	# fit_do_upgrade follows this phandle; it must target this UBI's fit.
	rootdisk=/sys/firmware/devicetree/base/chosen/rootdisk
	[ -s "$rootdisk" ] || return 1
	for dev in "$ubi"/of_node/volumes/*; do
		[ -r "$dev/volname" ] && [ -r "$dev/phandle" ] || continue
		# Command substitution removes the NUL terminator from DT string properties.
		[ "$(cat "$dev/volname")" = fit ] || continue
		# Compare binary phandles without relying on optional tr/cmp packages.
		[ "$(md5sum "$rootdisk" | cut -d' ' -f1)" = \
			"$(md5sum "$dev/phandle" | cut -d' ' -f1)" ] && return 0
	done
	return 1
}

gemtek_ubi_compat_migrate() {
	local board="${1:-$(board_name)}" version
	case "$board" in
		gemtek,xg2010g|gemtek,xg2010g-ubi|gemtek,xr1710g-ubi) ;;
		*) return 0 ;;
	esac
	uci -q get 'system.@system[0]' >/dev/null || return 1
	version=$(uci -q get 'system.@system[0].compat_version')
	case "$version" in
		2.0) return 0 ;;
		""|1.0) ;;
		*) return 1 ;;
	esac
	gemtek_ubi_layout_check "$board" || {
		echo "Gemtek UBI layout is not verified; compatibility version unchanged." >&2
		return 1
	}
	uci set 'system.@system[0].compat_version=2.0' && uci commit system
}
