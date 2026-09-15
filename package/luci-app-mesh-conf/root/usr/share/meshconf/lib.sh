#!/bin/sh
# Shared helpers for luci-app-mesh-conf.
#
# Sourced by both halves that accept a foreign /etc/config/wireless:
#   /usr/libexec/rpcd/luci.meshconf   (pull)
#   /usr/share/meshconf/www/cgi/sync  (put, when a peer pushes into us)
# so that "keep my own channel" is implemented once.
#
# Two units that are far apart must not be forced onto one channel: the peer's
# channel is chosen for the peer's surroundings. Syncing SSID/keys/k-v-r is
# what makes roaming work; the channel is the one thing that is deliberately
# NOT synced.

MESHCONF_LIB=1

meshconf_wifi()
{
	printf '%s' "${MESHCONF_WIFI:-/etc/config/wireless}"
}

# Ask the operator's preference; on by default, because two units in the same
# room are the common case and the failure mode of getting it wrong the other
# way round (both radios on one channel, halving throughput) is worse than the
# failure mode of keeping a suboptimal channel.
meshconf_keep_channel()
{
	case "$(uci -q get meshconf.sync.keep_channel 2>/dev/null)" in
		0|off|false|no) return 1 ;;
	esac
	return 0
}

# meshconf_apply_local_channels <incoming file> [local file]
#
# Rewrites every wifi-device section of <incoming> so that it carries the
# channel of the matching local radio, in place. Matching is by section name
# (radio0/radio1/...) and falls back to the first local radio with the same
# band that has not been claimed yet - different firmware revisions do not
# always number their radios the same way.
#
# This is deliberately a textual rewrite and not `uci set; uci commit`: commit
# rewrites the whole file, drops every comment and reorders every option, which
# would make the config revision (wifirev, shown in the peer table) change on
# every single sync even when nothing meaningful moved.
meshconf_apply_local_channels()
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
	function flush(   i, j, key, ch, band, line, r, found) {
		if (!insec) return
		insec = 0
		if (!secdev) {
			for (i = 1; i <= nbuf; i++) print buf[i]
			nbuf = 0
			return
		}
		key = ""
		if (secname != "" && (secname in lseen)) key = secname
		if (key == "") {
			band = ""
			for (i = 1; i <= nbuf; i++)
				if (hasopt(buf[i], "band")) { band = optval(buf[i], "band"); break }
			if (band != "")
				for (j = 1; j <= ln; j++)
					if (!lused[lord[j]] && lband[lord[j]] == band) { key = lord[j]; break }
		}
		if (key != "") lused[key] = 1
		ch = (key == "" ? "" : lchan[key])

		if (ch == "") {
			for (i = 1; i <= nbuf; i++) print buf[i]
			nbuf = 0
			return
		}
		# Does the incoming section carry a channel at all? Decided up front:
		# when it does not, the local one is inserted straight after the
		# section header (where a reader expects it) instead of at the end of
		# the section, after any trailing blank lines.
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

	# pass 1 - the local config is the source of truth
	NR == FNR {
		if (isconf($0)) {
			curname = sectname($0)
			curdev = isdev($0)
			if (curdev && curname != "") { lord[++ln] = curname; lseen[curname] = 1 }
			next
		}
		if (!curdev || curname == "") next
		if (hasopt($0, "channel")) lchan[curname] = optval($0, "channel")
		else if (hasopt($0, "band")) lband[curname] = optval($0, "band")
		next
	}

	# pass 2 - the incoming config, rewritten
	{
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
	' "$loc" "$inc" > "$tmp" 2>/dev/null || { rm -f "$tmp"; return 1; }

	[ -s "$tmp" ] || { rm -f "$tmp"; return 1; }
	# Copy contents rather than mv, so the incoming file keeps the mode and
	# ownership the caller gave it.
	cat "$tmp" > "$inc" 2>/dev/null || { rm -f "$tmp"; return 1; }
	rm -f "$tmp"
	return 0
}
