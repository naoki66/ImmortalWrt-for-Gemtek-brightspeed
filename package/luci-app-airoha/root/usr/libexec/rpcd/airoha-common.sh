#!/bin/sh
#
# airoha-common.sh — shared helpers for Airoha LuCI RPC backends
# (luci.airoha_npu, luci.airoha_flowsense, ...).
#
# This file is sourced by the backend scripts AFTER they define
# HARDWARE_BLOCKED_FILE. It provides:
#   _run_with_deadline          — run a probe behind a wall-clock deadline (no circuit breaker)
#   _run_hardware_with_deadline — same, but trips the reboot-scoped circuit breaker on timeout
#   _devmem_read                — timeout-protected MMIO read via devmem
#   airoha_has_wifi             — authoritative /sys/class/ieee80211 presence (true/false)
#
# Extracted from luci.airoha_npu / luci.airoha_flowsense to remove near-duplicate code.

# Run a command behind a wall-clock deadline so a blocking hardware probe
# (e.g. devmem stuck in D-state) cannot hang rpcd forever.
# Usage: _run_with_deadline <seconds> <tag> <cmd> [args...]
# Prints the command's stdout on success; returns 0 on success, 1 on command
# failure, 124 on timeout. Does NOT touch the circuit-breaker file.
_run_with_deadline() {
	local seconds="$1"
	local tag="$2"
	local output="/tmp/airoha-common.${tag}.$$.out"
	local done="/tmp/airoha-common.${tag}.$$.done"
	local child_file="/tmp/airoha-common.${tag}.$$.child"
	local worker timer child rc
	shift 2

	rm -f "$output" "$done" "$child_file"

	(
		"$@" >"$output" 2>/dev/null &
		child=$!
		printf '%s\n' "$child" >"$child_file"
		wait "$child"
		printf '%s\n' "$?" >"$done"
	) >/dev/null 2>&1 &
	worker=$!

	sleep "$seconds" >/dev/null 2>&1 &
	timer=$!

	wait -n 2>/dev/null
	if kill -0 "$worker" 2>/dev/null && kill -0 "$timer" 2>/dev/null; then
		local elapsed=0
		while [ "$elapsed" -lt "$seconds" ] && [ ! -e "$done" ]; do
			sleep 1
			elapsed=$((elapsed + 1))
		done
	fi

	if [ -e "$done" ]; then
		kill "$timer" 2>/dev/null; wait "$timer" 2>/dev/null
		wait "$worker" 2>/dev/null
		read -r rc <"$done" 2>/dev/null
		if [ "${rc:-1}" -eq 0 ]; then
			[ ! -s "$output" ] || cat "$output"
			rm -f "$output" "$done" "$child_file"
			return 0
		fi
		rm -f "$output" "$done" "$child_file"
		return 1
	fi

	[ -s "$child_file" ] && { read -r child <"$child_file" 2>/dev/null; kill -9 "$child" 2>/dev/null; }
	kill -9 "$worker" 2>/dev/null; wait "$worker" 2>/dev/null
	kill "$timer" 2>/dev/null; wait "$timer" 2>/dev/null
	rm -f "$output" "$done" "$child_file"
	return 124
}

# Hardware probes (MMIO/devmem) may block in D-state. Only these dangerous
# probes share the reboot-scoped circuit breaker; debugfs snapshots must
# remain recoverable, so they call _run_with_deadline directly instead.
# Usage: _run_hardware_with_deadline <seconds> <tag> <cmd> [args...]
_run_hardware_with_deadline() {
	local seconds="$1"
	local tag="$2"
	local rc

	[ -e "$HARDWARE_BLOCKED_FILE" ] && return 125
	_run_with_deadline "$@"
	rc=$?
	if [ "$rc" -eq 124 ]; then
		printf '%s\n' "$tag timed out" >"$HARDWARE_BLOCKED_FILE"
		logger -t airoha-common "hardware probe '$tag' timed out after ${seconds}s; disabling hardware polling until reboot" 2>/dev/null
	fi
	return "$rc"
}

# Timeout-protected hardware register read via devmem.
# Returns register value on success, "0" on timeout/error.
_devmem_read() {
	local addr="$1"
	local to="${2:-2}"
	[ -e "$HARDWARE_BLOCKED_FILE" ] && { echo "0"; return 1; }
	local val rc
	val=$(_run_hardware_with_deadline "$to" devmem devmem "$addr")
	rc=$?
	echo "${val:-0}"
	[ "$rc" -eq 0 ] && [ -n "$val" ]
}

# Authoritative wireless presence: does the board expose any ieee80211 phy?
# Prints "true" or "false". The frontend uses this to decide whether to build
# the WiFi gauges and band tables at all.
#
# This is deliberately independent of `iw dev`: on a radio-less board (e.g. the
# XR1710G 2010) iw may still be installed and simply report no interfaces, and
# get_wifi_stats cannot distinguish "no radio" from "radio present, no clients".
# /sys/class/ieee80211/phy* is the ground truth.
airoha_has_wifi() {
	local phy
	for phy in /sys/class/ieee80211/phy*; do
		[ -e "$phy" ] && { echo "true"; return 0; }
	done
	echo "false"
	return 1
}

# >>> airoha-topo-helpers >>>
# ---------------------------------------------------------------------------
# Device-tree-driven port topology and PON facts shared by the LuCI RPC
# backends (luci.airoha_npu, luci.airoha_flowsense). POSIX sh; safe to call on
# both the XR1710G (router) and the XG2010G (PON ONU); never writes to stderr.
# ---------------------------------------------------------------------------

# Minimal JSON string sanitiser: drop quotes, backslashes and newlines.
_airoha_json_str() {
	printf '%s' "$1" | tr -d '"' | tr -d '\\' | tr -d '\n\r'
}

# airoha_dt_read <relpath> — first NUL-terminated string of the DT property.
airoha_dt_read() {
	local path="/proc/device-tree/$1"
	[ -e "$path" ] || return 0
	tr '\0' '\n' < "$path" 2>/dev/null | sed -n '1p'
	return 0
}

# airoha_dt_node_okay <relpath> — 0 iff the node exists and is enabled
# (status "okay", or no status property: the device-tree default).
airoha_dt_node_okay() {
	local node="/proc/device-tree/$1"
	[ -e "$node" ] || return 1
	[ -e "$node/status" ] || return 0
	[ "$(airoha_dt_read "$1/status")" = "okay" ]
}

# Board identity.
airoha_board_model() {
	airoha_dt_read "model"
}

airoha_board_compat() {
	airoha_dt_read "compatible"
}

# Kernel PSE port index for a GDM (matches the frame-engine port map).
airoha_pse_for_gdm() {
	case "$1" in
		1) echo 1 ;;
		2) echo 2 ;;
		3) echo 3 ;;
		4) echo 9 ;;
		*) return 0 ;;
	esac
}

# PON presence.
airoha_pon_present() {
	if [ -d /proc/xgpon ] || [ -d /proc/epon ] || [ -e /sys/module/xpon_10g/parameters/mode ]; then
		echo 1
	else
		echo 0
	fi
}

# Negotiated PON mode (integer), or nothing.
airoha_pon_mode_int() {
	local f="/sys/module/xpon_10g/parameters/mode"
	[ -r "$f" ] || return 0
	cat "$f" 2>/dev/null
	return 0
}

# Negotiated PON mode name, "unknown" when unrecognised.
airoha_pon_mode_name() {
	case "$(airoha_pon_mode_int)" in
		0) echo auto ;;
		1) echo gpon ;;
		2) echo epon ;;
		3) echo 10g-1g-epon ;;
		4) echo 10g-10g-epon ;;
		5) echo 1g-1g-epon ;;
		6) echo xgpon ;;
		7) echo xgspon ;;
		8) echo ngpon2-10g-10g ;;
		9) echo ngpon2-10g-2g ;;
		10) echo ngpon2-2g-2g ;;
		11) echo gpon-sym ;;
		12) echo turbo-epon ;;
		*) echo unknown ;;
	esac
}

# PON line rates "<down_mbps> <up_mbps>", "0 0" when unknown. The kernel does
# not expose line rates anywhere, so they are derived from the mode only.
airoha_pon_rates() {
	case "$(airoha_pon_mode_name)" in
		xgpon)          echo "10000 2500" ;;
		xgspon)         echo "10000 10000" ;;
		gpon)           echo "2488 1244" ;;
		gpon-sym)       echo "2488 2488" ;;
		epon)           echo "1250 1250" ;;
		10g-1g-epon)    echo "10000 1000" ;;
		10g-10g-epon)   echo "10000 10000" ;;
		1g-1g-epon)     echo "1000 1000" ;;
		ngpon2-10g-10g) echo "10000 10000" ;;
		ngpon2-10g-2g)  echo "10000 2000" ;;
		ngpon2-2g-2g)   echo "2000 2000" ;;
		turbo-epon)     echo "2000 2000" ;;
		*)              echo "0 0" ;;
	esac
}

# Optical LOS. /proc/tc3162/los_status uses INVERTED polarity:
#   0 = no light (LOS asserted) -> echo 1 ; 1 = light present -> echo 0 ; else nothing.
airoha_pon_los() {
	local f="/proc/tc3162/los_status"
	[ -r "$f" ] || return 0
	case "$(cat "$f" 2>/dev/null)" in
		0) echo 1 ;;
		1) echo 0 ;;
		*) return 0 ;;
	esac
}

# GPON ONU state (e.g. "O5"), or nothing.
airoha_pon_onu_state() {
	local f="/proc/xgpon/state"
	[ -r "$f" ] || return 0
	cat "$f" 2>/dev/null
	return 0
}

# PON datapath netdev (uci pon.line0.device, default "pon").
airoha_pon_netdev() {
	local dev
	dev=$(uci -q get pon.line0.device 2>/dev/null)
	[ -n "$dev" ] || dev="pon"
	echo "$dev"
}

# Negotiated link speed (Mbps) of a netdev, empty when unavailable
# (missing interface, driver error, link down with "-1" reporting).
_airoha_netdev_speed_mbps() {
	local dev="$1" s
	[ -n "$dev" ] || return 0
	[ -e "/sys/class/net/$dev" ] || return 0
	s=$(cat "/sys/class/net/$dev/speed" 2>/dev/null)
	case "$s" in ''|*[!0-9]*) return 0 ;; esac
	[ "$s" -gt 0 ] 2>/dev/null || return 0
	echo "$s"
	return 0
}

# Resolve a GDM node's netdev: prefer openwrt,netdev-name; else the
# /sys/class/net device whose of_node is that node.
_airoha_gdm_netdev() {
	local rel="$1" name iface base onode
	name=$(airoha_dt_read "$rel/openwrt,netdev-name")
	if [ -n "$name" ]; then
		printf '%s' "$name"
		return 0
	fi
	base=$(basename "$rel")
	for iface in /sys/class/net/*; do
		[ -e "$iface/of_node" ] || continue
		onode=$(basename "$(readlink -f "$iface/of_node" 2>/dev/null)" 2>/dev/null)
		[ "$onode" = "$base" ] || continue
		name=$(basename "$iface")
		break
	done
	printf '%s' "${name:-}"
	return 0
}

# airoha_port_topology_json — compact single-line, null-free topology JSON.
airoha_port_topology_json() {
	local model compatible
	model=$(airoha_board_model)
	compatible=$(airoha_board_compat)

	local ports="" port_n=0
	local lan_raw="" wan_netdev=""
	local lan_json="[]" lan_count=0 wan_count=0
	local n rel netdev role mode key first x spd

	# Enabled GDM ports: soc/ethernet@1fb50000/ethernet@N.
	for n in 1 2 3 4; do
		rel="soc/ethernet@1fb50000/ethernet@$n"
		airoha_dt_node_okay "$rel" || continue
		netdev=$(_airoha_gdm_netdev "$rel")
		mode=$(airoha_dt_read "$rel/phy-mode")
		role="lan"
		[ "$n" = "2" ] && role="wan"
		spd=0
		[ -n "$netdev" ] && spd=$(_airoha_netdev_speed_mbps "$netdev")
		case "$spd" in ''|*[!0-9]*) spd=0 ;; esac
		key="gdm$n"
		port_n=$((port_n + 1))
		[ "$port_n" -gt 1 ] && ports="${ports},"
		ports="${ports}{\"key\":\"${key}\",\"kind\":\"gdm\",\"reg\":${n},\"pse\":$(airoha_pse_for_gdm "$n"),\"netdev\":\"$(_airoha_json_str "$netdev")\",\"role\":\"${role}\",\"mode\":\"$(_airoha_json_str "$mode")\",\"speed_mbps\":${spd}}"
		if [ "$role" = "wan" ]; then
			[ -n "$netdev" ] && wan_netdev="$netdev"
		elif [ -n "$netdev" ]; then
			lan_raw="${lan_raw}${netdev}
"
		fi
	done

	# Enabled, labelled DSA user ports: soc/switch@1fb58000/ports/port@N.
	# The switch CPU/conduit port (@6) carries no label and is skipped.
	for n in 1 2 3 4; do
		rel="soc/switch@1fb58000/ports/port@$n"
		airoha_dt_node_okay "$rel" || continue
		netdev=$(airoha_dt_read "$rel/label")
		[ -n "$netdev" ] || continue
		mode=$(airoha_dt_read "$rel/phy-mode")
		[ -n "$mode" ] || mode="internal"
		spd=$(_airoha_netdev_speed_mbps "$netdev")
		case "$spd" in ''|*[!0-9]*) spd=0 ;; esac
		key="gsw$n"
		port_n=$((port_n + 1))
		[ "$port_n" -gt 1 ] && ports="${ports},"
		ports="${ports}{\"key\":\"${key}\",\"kind\":\"gsw\",\"port\":${n},\"pse\":1,\"netdev\":\"$(_airoha_json_str "$netdev")\",\"role\":\"lan\",\"mode\":\"$(_airoha_json_str "$mode")\",\"speed_mbps\":${spd}}"
		lan_raw="${lan_raw}${netdev}
"
	done

	# LAN netdevs: role=="lan" port netdevs plus existing /sys/class/net/lan*.
	# The DSA conduit ("cpu") is not a LAN-facing port, so keep only lan* names.
	local d
	for d in /sys/class/net/lan*; do
		[ -e "$d" ] || continue
		lan_raw="${lan_raw}$(basename "$d")
"
	done
	lan_json=""
	lan_count=0
	first=1
	for x in $(printf '%s' "$lan_raw" | grep '^lan' | sort -u); do
		[ "$first" = "1" ] || lan_json="${lan_json},"
		first=0
		lan_json="${lan_json}\"$(_airoha_json_str "$x")\""
		lan_count=$((lan_count + 1))
	done
	lan_json="[${lan_json}]"

	[ -n "$wan_netdev" ] && wan_count=1

	local has_pon pon_json
	has_pon=$(airoha_pon_present)
	if [ "$has_pon" = "1" ]; then
		local pmode pname pdown pup plos ponu pdev rates
		rates=$(airoha_pon_rates)
		pmode=$(airoha_pon_mode_int)
		case "$pmode" in ''|*[!0-9]*) pmode=0 ;; esac
		pname=$(airoha_pon_mode_name)
		pdown=$(printf '%s' "$rates" | awk '{print $1}')
		pup=$(printf '%s' "$rates" | awk '{print $2}')
		case "$pdown" in ''|*[!0-9]*) pdown=0 ;; esac
		case "$pup" in ''|*[!0-9]*) pup=0 ;; esac
		plos=$(airoha_pon_los)
		case "$plos" in ''|*[!0-9]*) plos=0 ;; esac
		ponu=$(airoha_pon_onu_state)
		pdev=$(airoha_pon_netdev)
		pon_json="{\"present\":${has_pon},\"mode\":${pmode},\"mode_name\":\"$(_airoha_json_str "$pname")\",\"down_mbps\":${pdown},\"up_mbps\":${pup},\"los\":${plos},\"onu_state\":\"$(_airoha_json_str "$ponu")\",\"netdev\":\"$(_airoha_json_str "$pdev")\"}"
	else
		pon_json="null"
	fi

	printf '{"model":"%s","compatible":"%s","lan_netdevs":%s,"wan_netdev":"%s","lan_count":%d,"wan_count":%d,"has_pon":%d,"ports":[%s],"pon":%s}' \
		"$(_airoha_json_str "$model")" "$(_airoha_json_str "$compatible")" "$lan_json" "$(_airoha_json_str "$wan_netdev")" \
		"$lan_count" "$wan_count" "$has_pon" "$ports" "$pon_json"
}
# <<< airoha-topo-helpers <<<
