#!/bin/sh
# Shared helpers for luci-app-mesh-conf.
#
# Sourced by both halves that accept a foreign /etc/config/wireless:
#   /usr/libexec/rpcd/luci.meshconf   (pull)
#   /usr/share/meshconf/www/cgi/sync  (put, when a peer pushes into us)
# so that "stagger my channels" is implemented once.
#
# Two units that sit next to each other and broadcast the same SSID must NOT
# end up on the same channel: they would split airtime instead of adding to it,
# and 802.11k/v/r would spend its life handing clients back and forth between
# two APs that interfere. Syncing SSID/keys/k-v-r is what makes roaming work;
# the channel is the one thing that has to differ.

MESHCONF_LIB=1

meshconf_wifi()
{
	printf '%s' "${MESHCONF_WIFI:-/etc/config/wireless}"
}

# stagger (default) - make sure this unit is not on the peer's channel
# follow            - take the peer's channels verbatim
meshconf_channel_mode()
{
	local m
	m="$(uci -q get meshconf.sync.channel_mode 2>/dev/null)"
	case "$m" in
		stagger|follow) printf '%s' "$m"; return 0 ;;
	esac
	# Pre-0.3 configs only carried keep_channel: 1 = keep mine (which is what
	# stagger does when the channels already differ), 0 = take the peer's.
	case "$(uci -q get meshconf.sync.keep_channel 2>/dev/null)" in
		0|off|false|no) printf 'follow' ;;
		*) printf 'stagger' ;;
	esac
}

meshconf_stagger_enabled()
{
	[ "$(meshconf_channel_mode)" = "stagger" ]
}

# meshconf_rewrite_channels <incoming file> [local file]
#
# Rewrites every wifi-device section of <incoming> so that its channel is at
# least one non-overlapping step away from the peer's, in place.
#
#   * already far enough apart -> the local channel is kept, so a unit that is
#     already staggered does not move every time somebody syncs;
#   * otherwise -> step by the band's gap (see gapfor below) and clamp to the
#     band, trying +gap then -gap.
#
# Matching is by section name (radio0/radio1/...) and falls back to the first
# local radio with the same band that has not been claimed yet - different
# firmware revisions do not always number their radios the same way.
#
# One radio is exempt: whichever one carries an 802.11s interface (mode=mesh).
# Mesh points can only associate when they sit on the same channel, so moving
# that radio would cut the very link the config was synced over - both ends
# have to stay on the peer's channel for that radio. Detected on both sides,
# because either config may be the one that has the mesh interface.
#
# This is deliberately a textual rewrite and not `uci set; uci commit`: commit
# rewrites the whole file, drops every comment and reorders every option, which
# would make the config revision (wifirev, shown in the peer table) change on
# every single sync even when nothing meaningful moved.
meshconf_rewrite_channels()
{
	local inc="$1" loc="${2:-$(meshconf_wifi)}" tmp

	[ -n "$inc" ] && [ -f "$inc" ] || return 1
	[ -f "$loc" ] || return 1

	tmp="$inc.meshconf-chan.$$"

	awk '
	function dequote(s,   c) {
		gsub(/^[[:space:]]+|[[:space:]]+$/, "", s)
		c = substr(s, 1, 1)
		if ((c == Q || c == DQ) && length(s) > 1 && substr(s, length(s), 1) == c)
			s = substr(s, 2, length(s) - 2)
		return s
	}
	function sectname(line,   s) {
		s = line
		sub(/^[[:space:]]*config[[:space:]]+[A-Za-z0-9_.-]+[[:space:]]*/, "", s)
		return dequote(s)
	}
	function isconf(line) {
		return (line ~ /^[[:space:]]*config[[:space:]]+[A-Za-z0-9_.-]+([[:space:]]|$)/)
	}
	function isdev(line) {
		return (line ~ /^[[:space:]]*config[[:space:]]+wifi-device([[:space:]]|$)/)
	}
	function hasopt(line, name) {
		return (line ~ ("^[[:space:]]*option[[:space:]]+" name "[[:space:]]"))
	}
	function optval(line, name,   s) {
		s = line
		sub(/^[[:space:]]*option[[:space:]]+/, "", s)
		sub(/^[A-Za-z0-9_.-]+[[:space:]]*/, "", s)
		return dequote(s)
	}
	function setchan(line, ch,   pre, tail, q) {
		pre = ""
		if (match(line, /^[[:space:]]*/)) pre = substr(line, 1, RLENGTH)
		tail = line
		sub(/^[[:space:]]*option[[:space:]]+channel[[:space:]]*/, "", tail)
		if (tail == "") return ""
		q = substr(tail, 1, 1)
		if (q != Q && q != DQ) q = ""
		return pre "option channel " q ch q
	}
	# How far apart two channels have to be, in channel numbers, before they
	# stop overlapping. 2.4 GHz only really has 1/6/11; everywhere else the
	# number is just the occupied bandwidth divided by the 5 MHz spacing.
	function gapfor(band, ht,   n) {
		if (band == "2g") return 5
		n = ht
		gsub(/[^0-9]/, "", n)
		if (n == "") return 4
		if (n + 0 < 20) return 4
		return int((n + 0) / 5)
	}
	function bmin(band) {
		if (band == "2g") return 1
		if (band == "5g") return 36
		if (band == "6g") return 1
		return 0
	}
	function bmax(band) {
		if (band == "2g") return 13
		if (band == "5g") return 177
		if (band == "6g") return 233
		return 0
	}
	function pick(inc, gap, band,   c, lo, hi) {
		lo = bmin(band); hi = bmax(band)
		if (!hi) return inc + gap
		c = inc + gap
		if (c <= hi) return c
		c = inc - gap
		if (c >= lo) return c
		return ""
	}
	function flush(   i, j, key, loc, inc, band, ht, gap, ch, d, line, r, found) {
		if (!insec) return
		insec = 0
		if (!secdev) {
			for (i = 1; i <= nbuf; i++) print buf[i]
			nbuf = 0
			return
		}
		# what the peer is using
		inc = ""; band = ""; ht = ""
		for (i = 1; i <= nbuf; i++) {
			if (hasopt(buf[i], "channel")) inc = optval(buf[i], "channel")
			else if (hasopt(buf[i], "band")) band = optval(buf[i], "band")
			else if (hasopt(buf[i], "htmode")) ht = optval(buf[i], "htmode")
		}

		# which local radio is the same one
		key = ""
		if (secname != "" && (secname in lseen)) key = secname
		if (key == "" && band != "")
			for (j = 1; j <= ln; j++)
				if (!lused[lord[j]] && lband[lord[j]] == band) { key = lord[j]; break }
		if (key != "") lused[key] = 1
		loc = (key == "" ? "" : lchan[key])
		if (band == "" && key != "") band = lband[key]
		if (ht == "" && key != "") ht = lht[key]

		# 802.11s backhaul: this radio must land on the channel the peer uses,
		# or the two mesh points lose each other.
		if ((secname != "" && (secname in lmesh)) || (key != "" && (key in lmesh))) {
			ch = (inc != "" ? inc : loc)
		}

		# ch is already set for a mesh radio; only stagger when it is not.
		if (ch == "") {
			gap = gapfor(band, ht)
			if (inc ~ /^[0-9]+$/) {
				if (loc ~ /^[0-9]+$/) {
					d = loc - inc
					if (d < 0) d = -d
					if (d >= gap) ch = loc
				}
				if (ch == "") {
					ch = pick(inc + 0, gap, band)
					if (ch == "" && loc != "") ch = loc
				}
			} else if (loc != "") ch = loc
		}

		if (ch == "") {
			for (i = 1; i <= nbuf; i++) print buf[i]
			nbuf = 0
			return
		}

		# Does the incoming section carry a channel at all? Decided up front:
		# when it does not, the new one is inserted straight after the section
		# header (where a reader expects it) instead of at the end, after any
		# trailing blank lines.
		found = 0
		for (i = 1; i <= nbuf; i++)
			if (hasopt(buf[i], "channel")) { found = 1; break }

		if (!found) {
			print buf[1]
			print "\toption channel " Q ch Q
			for (i = 2; i <= nbuf; i++) print buf[i]
			nbuf = 0
			return
		}
		for (i = 1; i <= nbuf; i++) {
			line = buf[i]
			if (hasopt(line, "channel")) {
				r = setchan(line, ch)
				if (r != "") { print r; continue }
			}
			print line
		}
		nbuf = 0
	}
	BEGIN { Q = sprintf("%c", 39); DQ = sprintf("%c", 34); ln = 0; nbuf = 0; insec = 0 }

	# Three passes over three files (local, incoming, incoming). The incoming
	# file is read twice because a mesh interface can sit below the radio it
	# belongs to - the radios have to be known before the first one is emitted.
	FNR == 1 { fno++ }

	# pass 1 - the local config is the reference
	fno == 1 {
		if (isconf($0)) {
			curname = sectname($0)
			curdev = isdev($0)
			if (curdev && curname != "") { lord[++ln] = curname; lseen[curname] = 1 }
			next
		}
		if (curname == "") next
		if (curdev) {
			if (hasopt($0, "channel")) lchan[curname] = optval($0, "channel")
			else if (hasopt($0, "band")) lband[curname] = optval($0, "band")
			else if (hasopt($0, "htmode")) lht[curname] = optval($0, "htmode")
		} else {
			if (hasopt($0, "device")) idev[curname] = optval($0, "device")
			else if (hasopt($0, "mode")) imode[curname] = optval($0, "mode")
		}
		next
	}

	# pass 2 - the incoming config, scan only: mark the mesh radios
	fno == 2 && FNR == 1 {
		for (s in imode)
			if (imode[s] == "mesh" && idev[s] != "") lmesh[idev[s]] = 1
	}
	fno == 2 {
		if (isconf($0)) { curname = sectname($0); next }
		if (curname == "") next
		if (hasopt($0, "device")) jdev[curname] = optval($0, "device")
		else if (hasopt($0, "mode")) jmode[curname] = optval($0, "mode")
		next
	}
	fno == 3 && FNR == 1 {
		for (s in jmode)
			if (jmode[s] == "mesh" && jdev[s] != "") lmesh[jdev[s]] = 1
	}

	# pass 3 - the incoming config, rewritten
	fno == 3 {
		if (isconf($0)) {
			flush()
			nbuf = 0
			insec = 1
			secdev = isdev($0)
			secname = sectname($0)
			buf[++nbuf] = $0
			next
		}
		if (insec) { buf[++nbuf] = $0; next }
		print
	}
	END { flush() }
	' "$loc" "$inc" "$inc" > "$tmp" 2>/dev/null || { rm -f "$tmp"; return 1; }

	[ -s "$tmp" ] || { rm -f "$tmp"; return 1; }
	# Copy contents rather than mv, so the incoming file keeps the mode and
	# ownership the caller gave it.
	cat "$tmp" > "$inc" 2>/dev/null || { rm -f "$tmp"; return 1; }
	rm -f "$tmp"
	return 0
}

# ---------------------------------------------------------------------------
# LAN directed broadcast - shared with the DAWN layer
# ---------------------------------------------------------------------------
# DAWN ships option broadcast_ip '10.0.0.255' in its stock config, which is
# wrong for every LAN but one: changing it is step one of every DAWN how-to,
# and getting it wrong fails silently - no peer is ever discovered and the
# dashboard stays empty with nothing in the log.
#
# 255.255.255.255 is deliberately not used: the kernel sends it out whatever
# interface holds the default route, which on a router is the WAN side.
meshconf_broadcast_addr()
{
	local ip="$1" prefix="$2"
	[ -n "$ip" ] && [ -n "$prefix" ] || return 1
	case "$prefix" in ''|*[!0-9]*) return 1 ;; esac
	awk -v ip="$ip" -v p="$prefix" 'BEGIN {
		split(ip, o, ".")
		v = ((o[1] * 256 + o[2]) * 256 + o[3]) * 256 + o[4]
		if (p <= 0 || p >= 31) exit 1
		size = 2 ^ (32 - p)
		b = int(v / size) * size + size - 1
		printf "%d.%d.%d.%d\n", int(b / 16777216) % 256, int(b / 65536) % 256, int(b / 256) % 256, b % 256
	}'
}

# The same address taken from whichever interface this package calls LAN, so
# that DAWN announces itself exactly where the beacon already does. Callers
# are expected to have sourced /lib/functions/network.sh.
meshconf_lan_bcast()
{
	local ip="" pfx="" subnet=""
	network_get_ipaddr ip lan 2>/dev/null
	[ -n "$ip" ] || ip="$(ip -4 addr show dev br-lan 2>/dev/null | awk '/inet /{print $2; exit}' | cut -d/ -f1)"
	[ -n "$ip" ] || return 1

	if network_get_subnet subnet lan 2>/dev/null; then
		pfx="${subnet#*/}"
	fi
	[ -n "$pfx" ] || pfx="$(ip -4 route show dev br-lan proto kernel scope link 2>/dev/null | awk '{print $1; exit}' | cut -d/ -f2)"
	[ -n "$pfx" ] || pfx=24

	meshconf_broadcast_addr "$ip" "$pfx"
}
