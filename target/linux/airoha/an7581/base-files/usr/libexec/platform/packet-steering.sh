#!/bin/sh

. /lib/functions.sh
. /lib/functions/system.sh

mode="$1"

steering_flows="$(uci -q get 'network.@globals[0].steering_flows')"
opts=""
case "$steering_flows" in
	''|*[!0-9]*) ;;
	*) [ "$steering_flows" -gt 0 ] && opts="-l $steering_flows" ;;
esac

/usr/libexec/network/packet-steering.uc $opts "$mode"

[ "$mode" != "0" ] || exit 0

[ "$(board_name)" = "gemtek,xr1710g-ubi" ] || exit 0

cpu_count=0
for cpu_path in /sys/devices/system/cpu/cpu[0-9]*; do
	[ -d "$cpu_path" ] || continue
	[ "$(cat "$cpu_path/online" 2>/dev/null)" = "0" ] && continue
	cpu_count=$((cpu_count + 1))
done

# Keep CPU0 available for the GIC and Ethernet hard IRQs. The mt7996 driver
# creates several threaded-NAPI workers with the same truncated task name;
# netifd otherwise groups every worker onto one CPU.
[ "$cpu_count" -gt 1 ] || exit 0

next_cpu=1
tx_cpu=1
[ "$cpu_count" -gt 2 ] && tx_cpu=2

for comm in /proc/[0-9]*/task/[0-9]*/comm; do
	[ -r "$comm" ] || continue
	read -r name < "$comm"
	task="${comm%/comm}"
	tid="${task##*/}"
	case "$name" in
		napi/phy*)
			taskset -pc "$next_cpu" "$tid" >/dev/null 2>&1
			next_cpu=$((next_cpu + 1))
			[ "$next_cpu" -lt "$cpu_count" ] || next_cpu=1
			;;
		mt76-tx\ phy*)
			taskset -pc "$tx_cpu" "$tid" >/dev/null 2>&1
			;;
	esac
done
