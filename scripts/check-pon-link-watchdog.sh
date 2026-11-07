#!/bin/sh
# Host-side regression checks; all router commands and recovery are mocked.
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
# Load the production functions without invoking the router entry point.
eval "$(sed '/^main "\$@"$/d' "$root/files/usr/sbin/pon-link-watchdog")"
scratch=$(mktemp -d)
trap 'rm -f "$scratch/down" "$scratch/events" "$scratch/sampled"; rmdir "$scratch/lock" 2>/dev/null || :; rmdir "$scratch"' 0
trap 'exit 1' 1 2 15

DEV=lo
DOWN_STATE=$scratch/down
LOCK_DIR=$scratch/lock

uci() {
	case "$*" in
	'-q get network.pppoe.proto')
		[ "$protocol" != missing ] || return 1
		printf '%s\n' "$protocol"
		;;
	'-q get network.wan.proto') printf '%s\n' "$wan_protocol" ;;
	'-q get network.wan.luci_wanup') printf '%s\n' "$wan_managed" ;;
	*) return 1 ;;
	esac
}

ifstatus() {
	[ "$1" = "$expected_wan" ] || return 1
	[ "$status_up" != missing ] || return 1
	printf '{"up":%s}\n' "$status_up"
}

jsonfilter() {
	[ "$*" = '-e @.up' ] || return 1
	python3 -c 'import json, sys
try:
    print(str(json.load(sys.stdin)["up"]).lower())
except (ValueError, KeyError):
    pass'
}

date() { printf '1000\n'; }
onu_state() { printf '%s\n' "$onu"; }
mbi_overruns() { printf '%s\n' "$overrun"; }
logger() { printf '%s\n' "$*" >> "$scratch/events"; }
recover() { printf 'RECOVER\n' >> "$scratch/events"; }

sleep() {
	touch "$scratch/sampled"
	[ "$up_during_sample" = no ] || status_up=true
	[ "$bridge_during_sample" = no ] || protocol=missing
	return 0
}

read_stat() {
	case "$1" in
	rx_packets)
		if [ -f "$scratch/sampled" ]; then
			printf '%s\n' "$rx_after"
		else
			printf '100\n'
		fi
		;;
	tx_packets) printf '200\n' ;;
	esac
}

reset_case() {
	rm -f "$scratch/down" "$scratch/events" "$scratch/sampled"
	protocol=pppoe
	WAN=pppoe
	wan_protocol=none
	wan_managed=0
	expected_wan=pppoe
	status_up=false
	onu=O5
	overrun=1
	rx_after=100
	up_during_sample=no
	bridge_during_sample=no
	# An outage older than PERSIST.
	printf '1\n' > "$DOWN_STATE"
}

no_recovery() {
	if [ -f "$scratch/events" ] && grep -q RECOVER "$scratch/events"; then
		printf 'FAIL: unexpected recovery\n' >&2
		exit 1
	fi
}

for protocol_case in missing dhcp static; do
	reset_case
	protocol=$protocol_case
	(main)
	[ ! -f "$DOWN_STATE" ]
	[ ! -f "$scratch/sampled" ]
	no_recovery
done
printf 'PASS: bridging or absent/non-PPPoE interfaces skip recovery\n'

reset_case
status_up=true
(main)
[ ! -f "$DOWN_STATE" ]
no_recovery
printf 'PASS: compact PPPoE up status clears the outage\n'

reset_case
protocol=missing
wan_protocol=pppoe
wan_managed=1
expected_wan=wan
(main)
grep -q '^RECOVER$' "$scratch/events"
reset_case
protocol=missing
wan_protocol=pppoe
wan_managed=1
expected_wan=wan
status_up=true
(main)
[ ! -f "$DOWN_STATE" ]
no_recovery
printf 'PASS: ONU-managed PPPoE on wan is monitored when pppoe is absent\n'

reset_case
wan_protocol=pppoe
wan_managed=1
status_up=true
(main)
[ ! -f "$DOWN_STATE" ]
no_recovery
printf 'PASS: the explicit pppoe interface takes priority over managed wan\n'

reset_case
protocol=missing
wan_protocol=pppoe
(main)
[ ! -f "$DOWN_STATE" ]
no_recovery
printf 'PASS: unrelated Ethernet PPPoE on wan is not monitored\n'

reset_case
rm -f "$DOWN_STATE"
(main)
[ "$(cat "$DOWN_STATE")" = 1000 ]
[ ! -f "$scratch/sampled" ]
no_recovery
printf 'PASS: a new outage starts the persistence window\n'

reset_case
printf '900\n' > "$DOWN_STATE"
(main)
[ ! -f "$scratch/sampled" ]
no_recovery
printf 'PASS: a brief outage does not reset the MAC\n'

reset_case
(main)
grep -q '^RECOVER$' "$scratch/events"
[ ! -d "$LOCK_DIR" ]
printf 'PASS: persistent PPPoE failure with an O5 RX stall requests recovery\n'

reset_case
rx_after=101
(main)
no_recovery
printf 'PASS: downstream progress suppresses recovery\n'

reset_case
overrun=0
(main)
no_recovery
printf 'PASS: idle traffic without an MBI overrun does not reset the MAC\n'

reset_case
onu=O4
(main)
no_recovery
printf 'PASS: off-O5 recovery belongs to the driver\n'

reset_case
up_during_sample=yes
(main)
[ ! -f "$DOWN_STATE" ]
no_recovery
reset_case
bridge_during_sample=yes
(main)
[ ! -f "$DOWN_STATE" ]
no_recovery
printf 'PASS: PPPoE recovery or switching to bridging cancels a pending reload\n'

reset_case
mkdir "$LOCK_DIR"
(main)
[ -d "$LOCK_DIR" ]
[ ! -f "$scratch/sampled" ]
no_recovery
rmdir "$LOCK_DIR"
printf 'PASS: another watchdog instance retains its lock and sole recovery ownership\n'
