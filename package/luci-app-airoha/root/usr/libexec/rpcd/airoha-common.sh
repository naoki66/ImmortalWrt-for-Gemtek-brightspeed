#!/bin/sh
#
# airoha-common.sh — shared helpers for Airoha LuCI RPC backends
#
# This file is sourced by the backend scripts. It provides:
#   _run_with_deadline — run a probe behind a wall-clock deadline
#   airoha_has_wifi    — authoritative /sys/class/ieee80211 presence (true/false)
#
# Kept separate from the RPC dispatcher so hardware readers remain reusable.

# Run a command behind a wall-clock deadline so a blocking debugfs snapshot
# cannot hang rpcd forever.
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

# Authoritative wireless presence: does the board expose any ieee80211 phy?
# Prints "true" or "false". The frontend uses this to decide whether to build
# the WiFi gauges and band tables at all.
#
# This is deliberately independent of `iw dev`: on a radio-less board (e.g. the
# XG2010G) iw may still be installed and simply report no interfaces, and
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

airoha_npu_version() {
	local firmware name
	name=$(airoha_dt_read "soc/npu@1e900000/firmware-name")
	if [ -n "$name" ]; then
		firmware="/lib/firmware/$name"
	elif [ ! -f /lib/firmware/airoha/en7581_npu_rv32.bin ] &&
	     [ -f /lib/firmware/airoha/en7581_MT7996_npu_rv32.bin ]; then
		firmware=/lib/firmware/airoha/en7581_MT7996_npu_rv32.bin
	else
		firmware=/lib/firmware/airoha/en7581_npu_rv32.bin
	fi
	local version
	version=$(strings "$firmware" 2>/dev/null | grep -oE '([0-9]+\.[0-9]+\.[0-9]+-)?TLB[0-9.]+[-_v0-9]*' | head -1)
	printf '%s' "${version:-Unknown}"
}

airoha_bridge_offload_supported() {
	case "$(airoha_board_compat)" in
		gemtek,xg2010g|gemtek,xg2010g-ubi|gemtek,xg2010g-recovery) return 1 ;;
		*) return 0 ;;
	esac
}

airoha_ppe_parse() {
	awk -v state_filter="$2" -v limit="${3:-1024}" \
		-f /usr/libexec/airoha-ppe.awk "$1"
}

# >>> airoha-topo-helpers >>>
# ---------------------------------------------------------------------------
# Device-tree-driven port topology and PON facts shared by the LuCI RPC
# backends. POSIX sh; safe to call on
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
	if [ -d /sys/class/net/pon0 ] || [ -d /proc/xgpon ] || [ -d /proc/epon ] ||
	   [ -e /sys/module/xpon_10g/parameters/mode ] ||
	   { airoha_dt_node_okay "soc/ethernet@1fb50000/ethernet@2" &&
	     [ -e /proc/device-tree/soc/ethernet@1fb50000/ethernet@2/airoha,pon-data-path ]; }; then
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
		*)
			local mode
			mode=$(awk '$1 == "active_mode:" { print $2; exit }' /sys/kernel/debug/airoha-xpon-pon0/line 2>/dev/null)
			case "$mode" in
				gpon|xgpon|xgspon|epon|epon-10g-1g|epon-10g-10g) echo "$mode" ;;
				*) echo unknown ;;
			esac
			;;
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
		10g-1g-epon|epon-10g-1g) echo "10000 1000" ;;
		10g-10g-epon|epon-10g-10g) echo "10000 10000" ;;
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
	local signal
	if [ -r "$f" ]; then
		signal=$(cat "$f" 2>/dev/null)
	else
		signal=$(awk '$1 == "optical_signal:" { print $2; exit }' /sys/kernel/debug/airoha-xpon-pon0/line 2>/dev/null)
	fi
	case "$signal" in
		0) echo 1 ;;
		1) echo 0 ;;
		*) return 0 ;;
	esac
}

# GPON ONU state (e.g. "O5"), or nothing.
airoha_pon_onu_state() {
	local f="/proc/xgpon/state"
	if [ -r "$f" ]; then
		cat "$f" 2>/dev/null
	else
		awk '$1 == "onu_state:" && $2 ~ /^O[1-9]$/ { print $2; exit }' \
			/sys/kernel/debug/airoha-xpon-pon0/registration 2>/dev/null
	fi
	return 0
}

# PON datapath netdev (uci pon.line0.device, default "pon").
airoha_pon_netdev() {
	local dev
	dev=$(uci -q get pon.line0.device 2>/dev/null)
	[ -n "$dev" ] || dev="pon0"
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
	base=$(readlink -f "/proc/device-tree/$rel")
	for iface in /sys/class/net/*; do
		[ -e "$iface/of_node" ] || continue
		onode=$(readlink -f "$iface/of_node" 2>/dev/null)
		[ "$onode" = "$base" ] || continue
		name=$(basename "$iface")
		break
	done
	printf '%s' "${name:-}"
	return 0
}

# Unknown/down-link sysfs values must not look like measured zero counters.
_airoha_net_number() {
	local value
	value=$(cat "$1" 2>/dev/null)
	case "$value" in ''|*[!0-9]*) printf 'null' ;; *) printf '%s' "$value" ;; esac
}

_airoha_port_json() {
	local rel="$1" kind="$2" reg="$3" nbq="$4"
	local netdev mode role pse key base field
	mode=$(airoha_dt_read "$rel/phy-mode")
	if [ "$kind" = "gsw" ]; then
		netdev=$(airoha_dt_read "$rel/label")
		[ -n "$netdev" ] || return
		pse=1
		key="gsw$reg"
		role=lan
		[ -n "$mode" ] || mode=internal
	else
		netdev=$(_airoha_gdm_netdev "$rel")
		pse=$(airoha_pse_for_gdm "$reg")
		key="gdm$reg"
		[ "$nbq" = null ] || key="$key-$nbq"
		role=lan
		[ "$reg" = 2 ] && role=wan
		[ "$mode" = internal ] && role=conduit
		[ -e "/proc/device-tree/$rel/airoha,pon-data-path" ] && role=pon
	fi
	base="/sys/class/net/$netdev"
	local present=false
	[ -n "$netdev" ] && [ -d "$base" ] && present=true
	printf '{"key":"%s","kind":"%s","reg":%s,"port":%s,"nbq":%s,"pse":%s,"netdev":"%s","role":"%s","mode":"%s","present":%s' \
		"$key" "$kind" "$reg" "$reg" "$nbq" "$pse" "$(_airoha_json_str "$netdev")" "$role" "$mode" "$present"
	printf ',"carrier":%s,"speed_mbps":%s,"duplex":"%s"' \
		"$(_airoha_net_number "$base/carrier")" \
		"$(_airoha_net_number "$base/speed")" \
		"$(_airoha_json_str "$(cat "$base/duplex" 2>/dev/null)")"
	for field in rx_bytes tx_bytes rx_packets tx_packets rx_errors tx_errors rx_dropped tx_dropped; do
		printf ',"%s":%s' "$field" "$(_airoha_net_number "$base/statistics/$field")"
	done
	printf '}'
}

# Include split GDM/NBQ children as separate netdevs, never shared MIB samples.
airoha_port_topology_json() {
	local model compatible
	model=$(airoha_board_model)
	compatible=$(airoha_board_compat)

	local ports=""
	local lan_raw="" wan_netdev=""
	local lan_json="[]" lan_count=0 wan_count=0
	local n rel netdev first x child nbq entry children

	# Enabled GDM ports: soc/ethernet@1fb50000/ethernet@N.
	for n in 1 2 3 4; do
		rel="soc/ethernet@1fb50000/ethernet@$n"
		airoha_dt_node_okay "$rel" || continue
		children=0
		for child in /proc/device-tree/"$rel"/ethernet-port@*; do
			[ -d "$child" ] || continue
			children=1
			child="${child#/proc/device-tree/}"
			airoha_dt_node_okay "$child" || continue
			nbq="${child##*@}"
			case "$nbq" in ''|*[!0-9a-fA-F]*) continue ;; esac
			entry=$(_airoha_port_json "$child" gdm "$n" "$((0x$nbq))")
			[ -z "$ports" ] || ports="$ports,"
			ports="$ports$entry"
		done
		[ "$children" = 0 ] || continue
		entry=$(_airoha_port_json "$rel" gdm "$n" null)
		[ -z "$ports" ] || ports="$ports,"
		ports="$ports$entry"
		netdev=$(_airoha_gdm_netdev "$rel")
		if [ "$n" = 2 ]; then
			[ -n "$netdev" ] && wan_netdev="$netdev"
		fi
	done

	# Enabled, labelled DSA user ports: soc/switch@1fb58000/ports/port@N.
	# The switch CPU/conduit port (@6) carries no label and is skipped.
	for n in 1 2 3 4; do
		rel="soc/switch@1fb58000/ports/port@$n"
		airoha_dt_node_okay "$rel" || continue
		netdev=$(airoha_dt_read "$rel/label")
		[ -n "$netdev" ] || continue
		entry=$(_airoha_port_json "$rel" gsw "$n" null)
		[ -z "$ports" ] || ports="$ports,"
		ports="$ports$entry"
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
	for x in $(printf '%s' "$lan_raw" | grep -E '^lan[0-9]+$' | sort -u); do
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
		case "$pmode" in ''|*[!0-9]*) pmode=null ;; esac
		pname=$(airoha_pon_mode_name)
		pdown=$(printf '%s' "$rates" | awk '{print $1}')
		pup=$(printf '%s' "$rates" | awk '{print $2}')
		case "$pdown" in ''|*[!0-9]*) pdown=0 ;; esac
		case "$pup" in ''|*[!0-9]*) pup=0 ;; esac
		plos=$(airoha_pon_los)
		case "$plos" in ''|*[!0-9]*) plos=null ;; esac
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

# Per-band wireless health shared by the unified NPU page. XR1710G exposes
# three MT7996 bands; XG2010G has no radio and returns has_wifi=false.
airoha_wifi_stats_json() {
	local all_ifaces iface band_idx freq d
	local dump0="" dump1="" dump2="" ifaces0="" ifaces1="" ifaces2=""

	if ! command -v iw >/dev/null 2>&1; then
		printf '{"available":false,"has_wifi":%s,"bands":[]}' "$(airoha_has_wifi)"
		return
	fi

	all_ifaces=$(iw dev 2>/dev/null | awk '/Interface/{iface=$2} /type AP/{print iface}')
	[ -n "$all_ifaces" ] || {
		printf '{"available":true,"has_wifi":%s,"bands":[]}' "$(airoha_has_wifi)"
		return
	}

	for iface in $all_ifaces; do
		band_idx=$(printf '%s' "$iface" | sed -n 's/^[^.]*\.\([0-9][0-9]*\)-.*/\1/p')
		if [ -z "$band_idx" ]; then
			freq=$(iw dev "$iface" info 2>/dev/null | grep 'channel' | \
				grep -oE '[0-9]+' | awk '$0+0 > 1000 { print $0+0; exit }')
			case "$freq" in ''|*[!0-9]*) continue ;; esac
			if [ "$freq" -ge 5925 ]; then band_idx=2
			elif [ "$freq" -ge 5000 ]; then band_idx=1
			else band_idx=0
			fi
		fi

		case "$band_idx" in
			0) ifaces0="${ifaces0} ${iface}" ;;
			1) ifaces1="${ifaces1} ${iface}" ;;
			2) ifaces2="${ifaces2} ${iface}" ;;
			*) continue ;;
		esac

		d=$(iw dev "$iface" station dump 2>/dev/null)
		[ -n "$d" ] || continue
		case "$band_idx" in
			0) dump0="${dump0}
${d}" ;;
			1) dump1="${dump1}
${d}" ;;
			2) dump2="${dump2}
${d}" ;;
		esac
	done

	local now sta_tx0 sta_tx1 sta_tx2 tx_values tx0_mbps tx1_mbps tx2_mbps
	now=$(date +%s 2>/dev/null || awk '{printf "%d",$1}' /proc/uptime)
	sta_tx0=$(printf '%s\n' "$dump0" | awk '/tx bytes:/{t+=$NF} END{printf "%d",t+0}')
	sta_tx1=$(printf '%s\n' "$dump1" | awk '/tx bytes:/{t+=$NF} END{printf "%d",t+0}')
	sta_tx2=$(printf '%s\n' "$dump2" | awk '/tx bytes:/{t+=$NF} END{printf "%d",t+0}')
	tx_values=$(awk -v now="$now" -v c0="$sta_tx0" -v c1="$sta_tx1" -v c2="$sta_tx2" '
		BEGIN {
			pf = "/tmp/npu-wifi-bytes.prev"; tx0="0.0"; tx1="0.0"; tx2="0.0"
			if ((getline line < pf) > 0) {
				split(line, a); dt = now - (a[1]+0)
				if (a[1]+0 > 0 && dt > 0) {
					d0=c0-a[2]; if (d0<0) d0=0
					d1=c1-a[3]; if (d1<0) d1=0
					d2=c2-a[4]; if (d2<0) d2=0
					tx0=sprintf("%.1f",d0/dt/125000)
					tx1=sprintf("%.1f",d1/dt/125000)
					tx2=sprintf("%.1f",d2/dt/125000)
				}
			}
			printf "%s %s %s", tx0, tx1, tx2
		}' /dev/null)
	printf '%s %s %s %s\n' "$now" "$sta_tx0" "$sta_tx1" "$sta_tx2" > /tmp/npu-wifi-bytes.prev
	tx0_mbps=$(printf '%s\n' "$tx_values" | awk '{print $1}')
	tx1_mbps=$(printf '%s\n' "$tx_values" | awk '{print $2}')
	tx2_mbps=$(printf '%s\n' "$tx_values" | awk '{print $3}')

	local bands_json="" dump tx_mbps stats sta_tx_raw
	for band_idx in 0 1 2; do
		case "$band_idx" in
			0) [ -n "$ifaces0" ] || continue; dump="$dump0"; tx_mbps="$tx0_mbps"; sta_tx_raw="$sta_tx0" ;;
			1) [ -n "$ifaces1" ] || continue; dump="$dump1"; tx_mbps="$tx1_mbps"; sta_tx_raw="$sta_tx1" ;;
			2) [ -n "$ifaces2" ] || continue; dump="$dump2"; tx_mbps="$tx2_mbps"; sta_tx_raw="$sta_tx2" ;;
		esac

		stats=$(printf '%s\n' "$dump" | awk '
			BEGIN { stations=0; tx_pkts=0; tx_retries=0; tx_failed=0; sum_phy=0; sum_exp=0; phy_n=0; exp_n=0; sum_sig=0; sig_n=0; min_sig=0 }
			/^Station / { stations++ }
			/tx packets:/ { tx_pkts += $3+0 }
			/tx retries:/ { tx_retries += $3+0 }
			/tx failed:/ { tx_failed += $3+0 }
			/tx bitrate:/ { sum_phy += $3+0; phy_n++ }
			/expected throughput:/ { v=$3+0; if (v>0) { sum_exp+=v; exp_n++ } }
			/signal avg:/ {
				for (i=1; i<=NF; i++) if ($i ~ /^-[0-9]+$/) {
					sig=$i+0; sum_sig+=sig; sig_n++; if (sig_n==1 || sig<min_sig) min_sig=sig; break
				}
			}
			END {
				avg_phy=phy_n ? sum_phy/phy_n : 0; avg_exp=exp_n ? sum_exp/exp_n : 0
				eff=avg_phy>0 ? int(avg_exp/avg_phy*100) : 0
				retry=(tx_pkts+tx_retries)>0 ? int(tx_retries/(tx_pkts+tx_retries)*100) : 0
				avg_sig=sig_n ? int(sum_sig/sig_n) : 0
				printf "%d %d %d %d %.1f %.1f %d %d %d %d", stations, tx_pkts, tx_retries, tx_failed, avg_phy, avg_exp, eff, retry, avg_sig, min_sig
			}')
		set -- $stats
		[ -n "$bands_json" ] && bands_json="${bands_json},"
		bands_json="${bands_json}{\"band\":${band_idx},\"stations\":${1:-0},\"tx_packets\":${2:-0},\"tx_retries\":${3:-0},\"tx_failed\":${4:-0},\"avg_phy_rate\":${5:-0},\"avg_exp_throughput\":${6:-0},\"airtime_efficiency\":${7:-0},\"retry_pct\":${8:-0},\"avg_signal\":${9:-0},\"min_signal\":${10:-0},\"tx_mbps\":${tx_mbps:-0},\"tx_bytes_raw\":${sta_tx_raw:-0}}"
	done

	printf '{"available":true,"has_wifi":%s,"bands":[%s]}' "$(airoha_has_wifi)" "$bands_json"
}
