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
