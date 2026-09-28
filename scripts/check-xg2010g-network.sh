#!/bin/sh
# Run on the XG2010G after LAN is up; does not change configuration or rules.
set -eu

[ "$(cat /tmp/sysinfo/board_name)" = "gemtek,xg2010g" ] || {
	echo "This check is for Gemtek XG2010G." >&2
	exit 1
}

status="$(ubus call network.interface.lan status)"
[ "$(printf '%s' "$status" | jsonfilter -e '@.up')" = "true" ]
[ "$(printf '%s' "$status" | jsonfilter -e '@.l3_device')" = "br-lan" ]

fw4 check
nft list chain inet fw4 input | grep -F 'iifname "br-lan" jump input_lan'
nft list chain inet fw4 accept_from_lan | grep -E 'iifname "br-lan".* accept'
netstat -lnu | grep -E ':67[[:space:]]'

echo "PASS: LAN is up, fw4 validates, LAN input is reachable, DHCP is listening."
echo "A downstream DHCP exchange is still required to verify packet delivery."
