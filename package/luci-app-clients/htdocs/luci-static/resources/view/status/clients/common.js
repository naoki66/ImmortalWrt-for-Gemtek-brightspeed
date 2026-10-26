// SPDX-License-Identifier: Apache-2.0

'use strict';
'require baseclass';
'require fs';
'require network';
'require rpc';
'require uci';

/*
 * Shared core of the Clients pages.
 *
 * Three views - overview, devices, DNS - read the same two archives and merge
 * the same three sources, so the merge lives here once:
 *
 *   addresses   ARP + IPv6 neighbour cache     (probe)   who is reachable now
 *   rates       nf_conntrack byte counters     (probe)   LAN and WAN, split
 *   wireless    iwinfo assoclist               (probe)   which AP, SSID, signal
 *   archive     /tmp/clients-history.json      (init)    first / last seen
 *
 * The probe reports cumulative conntrack counters; turning them into a rate is
 * this layer's job because it knows the wall-clock distance between two of its
 * own samples. A helper keeping its own timer would need a daemon of its own.
 *
 * Nothing here is aware of a specific page. Each view builds a store, polls it,
 * and renders whatever it needs from the same merged rows.
 */

var PROBE = '/usr/libexec/clients-probe';
var HISTORY_PATH = '/tmp/clients-history.json';
var DNS_ARCHIVE = '/tmp/clients-dns.json';
var STYLESHEET = 'view/status/clients/clients.css';

/* Five seconds, not two: one sample walks the whole conntrack table and a box
 * can carry six bridged VLANs. The floor that matters is that the number moves
 * while someone watches it. */
var SAMPLE_INTERVAL = 5;
var LEASE_INTERVAL = 30;
var HISTORY_INTERVAL = 30;

/* A gap this long means the tab was hidden or the timer was throttled; dividing
 * the accumulated bytes by it would invent a spike, so only the baseline is
 * refreshed. */
var RESYNC_GAP = 15000;

/* How much of the trend chart is kept in memory. One sample per SAMPLE_INTERVAL
 * at 300 points is 25 minutes, which covers the "last 10 minutes" window the
 * carrier pages offer with room to spare. */
var TREND_POINTS = 300;

var callDHCPLeases = rpc.declare({
	object: 'luci-rpc',
	method: 'getDHCPLeases',
	expect: { '': {} }
});

/* ---------------- formatting ---------------- */

function sourceTitle(source) {
	switch (source) {
	case 'dhcpv6': return _('Assigned by %s').format('DHCPv6');
	case 'slaac': return _('Assigned by %s').format('SLAAC');
	case 'dynamic': return _('Assigned by %s').format('DHCP');
	case 'static': return _('Static lease: reserved in the DHCP configuration, so the address never changes');
	case 'manual': return _('Configured on the device itself, not handed out by DHCP');
	}

	return null;
}

function normalizeMAC(mac) {
	if (!mac || !/^([0-9a-f]{2}:){5}[0-9a-f]{2}$/i.test(mac))
		return null;

	mac = mac.toUpperCase();

	/* All-zero and multicast addresses are never a client's own address. */
	if (mac == '00:00:00:00:00:00' || (parseInt(mac.substr(0, 2), 16) & 1))
		return null;

	return mac;
}

/* Both the unit and the decimals follow the magnitude: a fixed one-decimal
 * KiB/s reads "999.9 KiB/s", ten characters in a column that has room for
 * eight. Scaling at 1024 and dropping decimals as the number grows keeps every
 * reading inside its column without hiding anything. */
function autoUnit(bytes, suffix) {
	var value = Number(bytes) || 0;
	var units = (suffix == '/s') ? [ 'B/s', 'KiB/s', 'MiB/s', 'GiB/s' ]
		: [ 'B', 'KiB', 'MiB', 'GiB' ];
	var unit = 0;

	while (value >= 1024 && unit < units.length - 1) {
		value = value / 1024;
		unit++;
	}

	if (value == 0)
		return '0 ' + units[unit];

	var decimals = (unit == 0 || value >= 100) ? 0 : (value >= 10 ? 1 : 2);

	return value.toFixed(decimals) + ' ' + units[unit];
}

function formatRate(bytes) {
	return (bytes == null) ? '-' : autoUnit(bytes, '/s');
}

function formatSize(bytes) {
	return (bytes == null) ? '-' : autoUnit(bytes, '');
}

/* Link bandwidth is quoted in Mbps like every other uplink figure on a router;
 * per-host throughput stays in KiB/s, where the smaller unit carries meaning. */
function formatBandwidth(bytesPerSecond) {
	if (bytesPerSecond == null)
		return '-';

	return (bytesPerSecond * 8 / 1000000).toFixed(2) + ' Mbps';
}

function formatCount(value) {
	return (value == null) ? '-' : String(value);
}

/* "Last seen" is only useful as a distance from now - a wall-clock timestamp
 * makes the reader do the subtraction. The absolute time stays in the tooltip. */
function relativeTime(epoch) {
	if (!epoch || epoch <= 0)
		return null;

	var seconds = Math.max(0, Math.round(Date.now() / 1000) - epoch);

	if (seconds < 60)
		return _('just now');

	if (seconds < 3600)
		return _('%d min ago').format(Math.floor(seconds / 60));

	if (seconds < 86400)
		return _('%d h ago').format(Math.floor(seconds / 3600));

	return _('%d d ago').format(Math.floor(seconds / 86400));
}

function absoluteTime(epoch) {
	if (!epoch || epoch <= 0)
		return '-';

	return new Date(epoch * 1000).toLocaleString();
}

function clockTime(epoch) {
	if (!epoch || epoch <= 0)
		return '-';

	var d = new Date(epoch * 1000);

	function pad(n) { return (n < 10) ? '0' + n : String(n); }

	return d.getFullYear() + '/' + pad(d.getMonth() + 1) + '/' + pad(d.getDate()) + ' '
		+ pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
}

/* ---------------- addresses ---------------- */

function ipv4Value(address) {
	var parts = String(address || '').split('.');
	var value = 0, part;

	if (parts.length != 4)
		return null;

	for (var i = 0; i < 4; i++) {
		part = parseInt(parts[i], 10);

		if (isNaN(part) || part < 0 || part > 255)
			return null;

		value = value * 256 + part;
	}

	return value;
}

/* IPv6 addresses only sort correctly once the shorthand is expanded: comparing
 * "…:4d" with "…:1ee0:…" as text puts 1ee0 after 4d. Eight zero-padded hextets
 * compare lexicographically and numerically at once. */
function ipv6Value(address) {
	var text = String(address || '').toLowerCase();
	var halves = text.split('::');
	var head, tail, filled, groups = [];

	if (!text || halves.length > 2)
		return null;

	head = (halves[0] == '') ? [] : halves[0].split(':');
	tail = (halves.length == 2 && halves[1] != '') ? halves[1].split(':') : [];
	filled = 8 - head.length - tail.length;

	if (filled < 0 || (halves.length == 1 && head.length != 8))
		return null;

	function pad(group) {
		while (group.length < 4)
			group = '0' + group;

		return group;
	}

	head.forEach(function(group) { groups.push(pad(group)); });

	for (var i = 0; i < filled; i++)
		groups.push('0000');

	tail.forEach(function(group) { groups.push(pad(group)); });

	return groups.join(':');
}

/* An IPv6 address is 39 characters and decides whether the counters stay
 * reachable. Breaking at the colon keeps it readable, and <wbr> adds the
 * opportunity without putting a character into the text, so a copied address
 * stays a valid address. */
function ipv6Nodes(address) {
	var parts = String(address).split(':');
	var nodes = [];

	parts.forEach(function(part, index) {
		nodes.push(part, (index < parts.length - 1) ? ':' : null,
			(index < parts.length - 1) ? E('wbr') : null);
	});

	return nodes;
}

/* Which network an address belongs to, decided from the subnets the probe
 * reported. This is the fallback for a row whose interface is unknown: a host
 * known only from the archive, or one the neighbour cache has already forgotten
 * but conntrack still holds a flow for. Without it those rows lose their VLAN
 * the moment ARP ages them out, which looks like the device moved networks. */
function subnetContains(cidr, address) {
	var parts = String(cidr || '').split('/');
	var mask = parseInt(parts[1], 10);

	if (!parts[0] || isNaN(mask))
		return false;

	if (String(address).indexOf(':') >= 0) {
		var base6 = ipv6Value(parts[0]);
		var addr6 = ipv6Value(address);

		if (!base6 || !addr6 || mask < 0 || mask > 128)
			return false;

		var bits = Math.floor(mask / 4);

		return base6.replace(/:/g, '').slice(0, bits) == addr6.replace(/:/g, '').slice(0, bits);
	}

	var base4 = ipv4Value(parts[0]);
	var addr4 = ipv4Value(address);

	if (base4 == null || addr4 == null || mask < 0 || mask > 32)
		return false;

	/* Math.pow, not a shift: 1 << 24 overflows a 32-bit signed shift into a
	 * negative size for a /8 and every comparison after it is nonsense. */
	var size = Math.pow(2, 32 - mask);

	return addr4 >= base4 && addr4 < base4 + size;
}

function networkOfAddress(addresses, networkList) {
	for (var i = 0; i < addresses.length; i++) {
		for (var j = 0; j < networkList.length; j++) {
			var network = networkList[j];
			var subnets = network.subnets || [];

			for (var k = 0; k < subnets.length; k++)
				if (subnetContains(subnets[k], addresses[i]))
					return network;
		}
	}

	return null;
}

/* A client accumulates addresses from three sources; keep each one once. */
function addAddress(list, address) {
	if (!address)
		return;

	var bare = String(address).replace(/\/\d+$/, '');

	for (var i = 0; i < list.length; i++)
		if (list[i] == bare)
			return;

	list.push(bare);
}

function reservedAddresses() {
	var map = Object.create(null);
	var sections = uci.sections('dhcp', 'host') || [];

	sections.forEach(function(section) {
		/* `ip` may be a list: dhcp-host accepts several addresses per host. */
		L.toArray(section.ip).forEach(function(address) {
			var bare = String(address || '').replace(/\/\d+$/, '');

			if (bare)
				map[bare] = true;
		});
	});

	return map;
}

function ensureStylesheet() {
	var href = L.resource(STYLESHEET);
	var links = document.querySelectorAll('link[rel="stylesheet"]');

	for (var i = 0; i < links.length; i++)
		if (links[i].getAttribute('href') == href)
			return;

	document.head.appendChild(E('link', {
		'rel': 'stylesheet',
		'type': 'text/css',
		'href': href
	}));
}

/* ---------------- merge ---------------- */

/*
 * Merge leases, neighbour entries, association records, counters and the
 * archive into one row per client. MAC is the identity; a client whose leases
 * never expose a MAC (some IPv6-only hosts, keyed by DUID) is keyed by its DUID
 * instead, so it still gets one row rather than one per lease, and is folded
 * back into its MAC row further down when the neighbour cache can tell which
 * MAC the address belongs to.
 *
 * IPv6 addresses carry their source. odhcpd's DHCPv6 leases are authoritative:
 * an address handed out with a lease is not SLAAC, whatever the neighbour cache
 * thinks. Everything else in the neighbour cache got there through router
 * advertisements, i.e. SLAAC. IPv4 has the same map, but only two of its three
 * cases are decidable here: "dynamic" is a lease, "manual" is an ARP entry that
 * no lease and no reservation covers. "static" is decided by the caller from
 * the reservation list, so a reserved host keeps its colour while offline.
 *
 * Traffic is summed in three buckets - total, LAN and WAN - as delivered by the
 * probe. The page never re-derives the split: the decision needs the subnet
 * list, and the probe already had it.
 */
function buildClients(state) {
	var clients = Object.create(null);
	var byAddress = Object.create(null);
	var hints = (state.hints && state.hints.hosts) ? state.hints.hosts : (state.hints || {});
	var networks = Object.create(null);
	var networkList = state.interfaces || [];

	networkList.forEach(function(entry) {
		if (entry.device)
			networks[entry.device] = entry;
	});

	function client(mac, key) {
		var id = String(key || mac || '').toLowerCase();

		if (!id)
			return null;

		if (!clients[id])
			clients[id] = {
				mac: mac || null,
				hostname: null,
				ipv4: [],
				ipv6: [],
				leases4: [],
				leases6: [],
				online: false,
				wireless: false,
				ssid: null,
				band: null,
				signal: null,
				noise: null,
				device: null,
				vlan: null,
				iface: null,
				rate: null,
				total: { up: 0, down: 0 },
				stored: null,
				conns: null,
				first: null,
				last: null,
				precision: null
			};

		if (mac && !clients[id].mac)
			clients[id].mac = mac;

		return clients[id];
	}

	function addLease(lease, family) {
		var mac = normalizeMAC(lease.macaddr);
		var key = mac;

		if (!key && lease.duid)
			key = 'duid:' + String(lease.duid).toLowerCase() + (lease.iaid ? '%' + lease.iaid : '');

		if (!key) {
			var address = (family == 4) ? lease.ipaddr : (L.toArray(lease.ip6addrs)[0] || lease.ip6addr);

			if (!address)
				return;

			key = 'addr:' + address;
		}

		var entry = client(mac, key);

		if (!entry)
			return;

		if (!entry.hostname && lease.hostname)
			entry.hostname = lease.hostname;

		if (family == 4) {
			addAddress(entry.ipv4, lease.ipaddr);
			entry.leases4.push(lease);
			state.ip4Source[String(lease.ipaddr).replace(/\/\d+$/, '')] = 'dynamic';
		}
		else {
			/* Field names differ between LuCI releases and between a lease taken
			 * from odhcpd and one reconstructed from state files: accept all
			 * three spellings rather than dropping the address on the floor. */
			var addresses = L.toArray(lease.ip6addrs);

			if (!addresses.length && lease.ip6addr)
				addresses = L.toArray(lease.ip6addr);

			if (!addresses.length && lease.ipaddr)
				addresses = L.toArray(lease.ipaddr);

			addresses.forEach(function(ip) {
				addAddress(entry.ipv6, ip);
				state.ip6Source[String(ip).replace(/\/\d+$/, '')] = 'dhcpv6';
			});
			entry.leases6.push(lease);
		}
	}

	state.leases4.forEach(function(lease) { addLease(lease, 4); });
	state.leases6.forEach(function(lease) { addLease(lease, 6); });

	/* A neighbour entry is the only proof that a host is reachable right now. */
	(state.arp || []).forEach(function(neighbour) {
		var mac = normalizeMAC(neighbour.mac);
		var entry = client(mac, mac || ('addr:' + neighbour.ip));

		if (!entry)
			return;

		addAddress(entry.ipv4, neighbour.ip);
		entry.online = true;

		if (neighbour.name && !entry.hostname)
			entry.hostname = neighbour.name;

		if (neighbour.device && !entry.device)
			entry.device = neighbour.device;
	});

	/* Names the LAN side already knows. They enrich a client that a lease, a
	 * neighbour row or a byte counter already placed on the LAN - they never
	 * create one, because the hint cache also reports WAN-side neighbours and
	 * the uplink gateway would otherwise be listed as a LAN host. Addresses are
	 * deliberately not taken from the hints: that cache outlives the host. */
	Object.keys(hints).forEach(function(mac) {
		var hint = hints[mac] || {};
		var normalised = normalizeMAC(mac);
		var entry = normalised ? clients[normalised.toLowerCase()] : null;

		if (!entry)
			return;

		if (hint.name && !entry.hostname)
			entry.hostname = hint.name;
	});

	/* IPv6: every neighbour-cache entry that resolved to a MAC belongs to that
	 * client, and any address odhcpd did not lease came from SLAAC. */
	(state.neigh6 || []).forEach(function(neighbour) {
		var mac = normalizeMAC(neighbour.mac);
		var entry = mac ? clients[mac.toLowerCase()] : null;
		var address = String(neighbour.ip).replace(/\/\d+$/, '');

		if (!entry)
			return;

		addAddress(entry.ipv6, address);
		entry.online = true;

		if (neighbour.device && !entry.device)
			entry.device = neighbour.device;

		if (!state.ip6Source[address])
			state.ip6Source[address] = 'slaac';
	});

	/* Wireless association. Information the ARP table can never carry: which
	 * radio, which SSID, how strong the link. A station without an address yet
	 * (DHCP in flight) still gets a row, which is why this can create a client. */
	Object.keys(state.wifi || {}).forEach(function(mac) {
		var assoc = state.wifi[mac] || {};
		var normalised = normalizeMAC(mac);
		var entry = normalised ? client(normalised, normalised) : null;

		if (!entry)
			return;

		entry.wireless = true;
		entry.online = true;
		entry.ssid = assoc.ssid || entry.ssid;

		if (assoc.band)
			entry.band = assoc.band;

		/* A reading of 0 dBm is "not reported", not "no signal". */
		if (assoc.signal)
			entry.signal = assoc.signal;

		if (assoc.noise)
			entry.noise = assoc.noise;
	});

	/* Fold a DUID-keyed orphan into the MAC row that already owns its address. */
	var macOfAddress = Object.create(null);

	(state.arp || []).forEach(function(neighbour) {
		var mac = normalizeMAC(neighbour.mac);

		if (mac)
			macOfAddress[neighbour.ip] = mac;
	});
	(state.neigh6 || []).forEach(function(neighbour) {
		var mac = normalizeMAC(neighbour.mac);

		if (mac)
			macOfAddress[String(neighbour.ip).replace(/\/\d+$/, '')] = mac;
	});

	Object.keys(clients).forEach(function(id) {
		var orphan = clients[id];

		if (id.indexOf('duid:') != 0 && id.indexOf('addr:') != 0)
			return;

		var target = null;

		orphan.ipv4.concat(orphan.ipv6).forEach(function(ip) {
			var mac = macOfAddress[ip];

			if (mac && clients[mac.toLowerCase()] && clients[mac.toLowerCase()] !== orphan)
				target = clients[mac.toLowerCase()];
		});

		if (!target)
			return;

		if (!target.hostname && orphan.hostname)
			target.hostname = orphan.hostname;

		orphan.ipv4.forEach(function(ip) { addAddress(target.ipv4, ip); });
		orphan.ipv6.forEach(function(ip) { addAddress(target.ipv6, ip); });
		target.leases4 = target.leases4.concat(orphan.leases4);
		target.leases6 = target.leases6.concat(orphan.leases6);
		target.online = target.online || orphan.online;

		delete clients[id];
	});

	/* IPv4: an address with no lease behind it was set on the device by hand -
	 * but only once this box has shown that it hands addresses out at all. */
	var arpAddresses = Object.create(null);
	var dhcpKnown = state.leases4.length > 0 ||
		Object.keys(state.reserved4 || {}).length > 0;

	(state.arp || []).forEach(function(neighbour) {
		arpAddresses[neighbour.ip] = true;
	});

	Object.keys(clients).forEach(function(id) {
		clients[id].ipv4.forEach(function(ip) {
			if (!state.ip4Source[ip] && dhcpKnown && arpAddresses[ip])
				state.ip4Source[ip] = 'manual';
		});
	});

	Object.keys(clients).forEach(function(id) {
		var entry = clients[id];

		entry.ipv4.forEach(function(ip) { byAddress[ip] = entry; });
		entry.ipv6.forEach(function(ip) { byAddress[ip] = entry; });
	});

	/* Counters arrive per address; a client with several addresses sums them.
	 * The LAN/WAN split is taken from the counters verbatim. */
	Object.keys(state.traffic || {}).forEach(function(ip) {
		var counters = state.traffic[ip];
		var entry = byAddress[ip];

		if (!entry) {
			/* An address with traffic but neither lease nor neighbour row is
			 * still a host; without a row its bytes would vanish from the
			 * totals. */
			entry = client(null, 'addr:' + ip);

			if (!entry)
				return;

			addAddress(ip.indexOf(':') >= 0 ? entry.ipv6 : entry.ipv4, ip);
			byAddress[ip] = entry;
		}

		if (counters.device && !entry.device)
			entry.device = counters.device;

		entry.rate = entry.rate || { up: 0, down: 0, lanUp: 0, lanDown: 0, wanUp: 0, wanDown: 0 };
		entry.total = entry.total || { up: 0, down: 0, lanUp: 0, lanDown: 0, wanUp: 0, wanDown: 0 };

		var rate = state.rates[ip];

		if (rate) {
			entry.rate.up += rate.up;
			entry.rate.down += rate.down;
			entry.rate.lanUp += rate.lanUp;
			entry.rate.lanDown += rate.lanDown;
			entry.rate.wanUp += rate.wanUp;
			entry.rate.wanDown += rate.wanDown;
		}

		var total = state.totals[ip];

		if (total) {
			entry.total.up += total.up;
			entry.total.down += total.down;
			entry.total.lanUp += total.lanUp;
			entry.total.lanDown += total.lanDown;
			entry.total.wanUp += total.wanUp;
			entry.total.wanDown += total.wanDown;
		}

		if (counters.conns != null)
			entry.conns = (entry.conns || 0) + counters.conns;
	});

	/*
	 * The archive: first and last seen, and the association a station had when
	 * it was last here. Merged last so a live reading always wins over a stored
	 * one - the archive is what remains when nothing is live, not a second
	 * opinion about the present.
	 */
	var archive = state.archive || {};

	Object.keys(clients).forEach(function(id) {
		var entry = clients[id];
		var stored = entry.mac ? archive[entry.mac] : null;

		if (!stored)
			return;

		entry.first = entry.first || stored.first || null;
		entry.last = stored.last || null;

		if (!entry.ssid && stored.ssid) {
			entry.ssid = stored.ssid;
			entry.band = entry.band || stored.band || null;
			entry.wireless = true;
		}

		if (entry.signal == null && stored.signal)
			entry.signal = stored.signal;

		if (!entry.hostname && stored.name)
			entry.hostname = stored.name;
	});

	/*
	 * Then the rows only the archive remembers. A device that has gone to sleep
	 * keeps its place and its last-seen time instead of disappearing from the
	 * page the moment the neighbour cache forgets it.
	 */
	Object.keys(archive).forEach(function(mac) {
		if (clients[mac.toLowerCase()])
			return;

		var stored = archive[mac];
		var entry = client(mac, mac);

		if (!entry)
			return;

		entry.hostname = stored.name || null;
		entry.online = false;
		entry.historical = true;
		entry.first = stored.first || null;
		entry.last = stored.last || null;
		entry.device = stored.device || null;

		if (stored.ip4)
			addAddress(entry.ipv4, stored.ip4);
		if (stored.ip6)
			addAddress(entry.ipv6, stored.ip6);

		if (stored.ssid) {
			entry.ssid = stored.ssid;
			entry.band = stored.band || null;
			entry.wireless = true;
		}

		if (stored.signal)
			entry.signal = stored.signal;
	});

	/*
	 * Long-term counters, joined last because they measure something else: the
	 * whole accounting period (a month with the package default), not the
	 * lifetime of the flows this page happened to observe. A row with no
	 * nlbwmon entry keeps month = null and the column stays empty rather than
	 * showing a zero that would read as "used nothing".
	 */
	var usage = state.nlbw || null;

	if (usage) {
		Object.keys(clients).forEach(function(id) {
			var entry = clients[id];
			var stored = entry.mac ? usage[entry.mac] : null;

			if (!stored)
				return;

			entry.month = { up: stored.up || 0, down: stored.down || 0 };

			if (stored.conns != null && entry.conns == null)
				entry.conns = stored.conns;
		});
	}

	/* Resolve the network each client sits on: the live ARP row said which
	 * device it arrived on; everything else is matched by subnet. */
	Object.keys(clients).forEach(function(id) {
		var entry = clients[id];
		var network = entry.device ? networks[entry.device] : null;

		if (!network)
			network = networkOfAddress(entry.ipv4.concat(entry.ipv6), networkList);

		if (!network)
			return;

		entry.vlan = (network.vlan != null) ? network.vlan : entry.vlan;
		entry.iface = entry.iface || network.iface || null;
		entry.subnet = entry.subnet || (network.subnets || [])[0] || null;
	});

	/* How much to trust the numbers in the row. conntrack accounting sees the
	 * counters the driver syncs back, so it survives the offload; ARP alone
	 * means the host is listed with no traffic figure at all. */
	Object.keys(clients).forEach(function(id) {
		var entry = clients[id];

		entry.precision = (entry.rate || entry.total.up || entry.total.down) ? 'conntrack' : 'arp';
	});

	var list = Object.keys(clients).map(function(id) {
		clients[id].id = id;
		return clients[id];
	});

	/* Online first, then by traffic, so the busiest host is at the top without
	 * the order jumping between two otherwise idle polls. */
	list.sort(function(a, b) {
		if (a.online != b.online)
			return a.online ? -1 : 1;

		var at = a.total.up + a.total.down + (a.stored ? a.stored.up + a.stored.down : 0);
		var bt = b.total.up + b.total.down + (b.stored ? b.stored.up + b.stored.down : 0);

		if (at != bt)
			return bt - at;

		return L.naturalCompare(a.hostname || a.mac || a.id, b.hostname || b.mac || b.id);
	});

	return list;
}

function sortValue(entry, key) {
	switch (key) {
	case 'state':
		return entry.online ? 1 : 0;

	case 'hostname':
		return entry.hostname ? entry.hostname.toLowerCase() : null;

	case 'ipv4':
		return entry.ipv4.length ? ipv4Value(entry.ipv4[0]) : null;

	case 'ipv6':
		return entry.ipv6.length ? ipv6Value(entry.ipv6[0]) : null;

	case 'mac':
		return entry.mac || null;

	case 'network':
		if (entry.ssid)
			return entry.ssid.toLowerCase();
		return (entry.vlan != null) ? ('vlan' + String(entry.vlan).padStart(3, '0')) : null;

	case 'signal':
		return (entry.signal == null) ? null : entry.signal;

	case 'lan':
		return entry.rate ? (entry.rate.lanUp + entry.rate.lanDown) : null;

	case 'wan':
		return entry.rate ? (entry.rate.wanUp + entry.rate.wanDown) : null;

	case 'conns':
		return (entry.conns == null) ? null : entry.conns;

	case 'month':
		if (!entry.month)
			return null;
		return entry.month.up + entry.month.down;

	case 'last':
		return entry.last || (entry.online ? Math.round(Date.now() / 1000) : null);
	}

	return null;
}

/* ---------------- store ---------------- */

/*
 * One sampler per page. It holds the baseline needed to differentiate the
 * cumulative counters, the archives, and the lease/hint data - everything the
 * three views ask for, fetched once per poll instead of once per view.
 */
function createStore() {
	return {
		samples: null,
		rates: null,
		totals: null,
		archive: {},
		archiveUpdated: 0,
		trend: null,
		nlbw: null,
		nlbwAvailable: false,
		nlbwPeriods: [],
		lastNlbwLoad: 0,
		lastLeaseLoad: 0,
		lastHistoryLoad: 0,
		state: {
			interfaces: [],
			leases4: [],
			leases6: [],
			hints: null,
			arp: [],
			neigh6: [],
			wifi: {},
			traffic: {},
			stats: null,
			reserved4: Object.create(null),
			ip6Source: Object.create(null),
			ip4Source: Object.create(null)
		},

		fetchSnapshot: function() {
			var self = this;

			return fs.exec_direct(PROBE, []).then(function(output) {
				var data = JSON.parse(output);
				var now = Date.now();
				var samples = Object.create(null);
				var rates = Object.create(null);
				var totals = self.totals || Object.create(null);
				var traffic = data.traffic || {};

				Object.keys(traffic).forEach(function(ip) {
					var current = traffic[ip];
					var previous = self.samples ? self.samples[ip] : null;
					var total = totals[ip] || {
						up: 0, down: 0, lanUp: 0, lanDown: 0, wanUp: 0, wanDown: 0
					};

					if (previous && (now - previous.ts) > RESYNC_GAP)
						previous = null;

					if (previous) {
						var seconds = Math.max((now - previous.ts) / 1000, 0.5);

						/* A counter can move backwards when a flow expires between
						 * samples; negative deltas are clamped to zero instead of
						 * producing a bogus negative rate. */
						function delta(cur, prev) { return Math.max(0, (cur || 0) - (prev || 0)); }

						var d = {
							up: delta(current.up, previous.up),
							down: delta(current.down, previous.down),
							lanUp: delta(current.lan && current.lan.up, previous.lanUp),
							lanDown: delta(current.lan && current.lan.down, previous.lanDown),
							wanUp: delta(current.wan && current.wan.up, previous.wanUp),
							wanDown: delta(current.wan && current.wan.down, previous.wanDown)
						};

						rates[ip] = {
							up: d.up / seconds,
							down: d.down / seconds,
							lanUp: d.lanUp / seconds,
							lanDown: d.lanDown / seconds,
							wanUp: d.wanUp / seconds,
							wanDown: d.wanDown / seconds
						};

						total = {
							up: total.up + d.up,
							down: total.down + d.down,
							lanUp: total.lanUp + d.lanUp,
							lanDown: total.lanDown + d.lanDown,
							wanUp: total.wanUp + d.wanUp,
							wanDown: total.wanDown + d.wanDown
						};
					}

					totals[ip] = total;
					samples[ip] = {
						ts: now,
						up: current.up,
						down: current.down,
						lanUp: current.lan && current.lan.up,
						lanDown: current.lan && current.lan.down,
						wanUp: current.wan && current.wan.up,
						wanDown: current.wan && current.wan.down
					};
				});

				/* Addresses that disappear keep their accumulated total, so a host
				 * that drops off and comes back does not restart at zero. */
				self.samples = samples;
				self.rates = rates;
				self.totals = totals;

				self.state.interfaces = data.interfaces || [];
				self.state.arp = data.arp || [];
				self.state.neigh6 = data.neigh6 || [];
				self.state.wifi = data.wifi || {};
				self.state.traffic = traffic;
				self.state.stats = data.stats || null;

				return data;
			});
		},

		fetchLeases: function() {
			var self = this;

			self.lastLeaseLoad = Date.now();

			return Promise.all([
				L.resolveDefault(callDHCPLeases(), {}),
				L.resolveDefault(network.getHostHints(), null),
				L.resolveDefault(uci.load('dhcp'), null)
			]).then(function(results) {
				var leases = results[0] || {};

				self.state.leases4 = Array.isArray(leases.dhcp_leases) ? leases.dhcp_leases : [];
				self.state.leases6 = Array.isArray(leases.dhcp6_leases) ? leases.dhcp6_leases : [];
				self.state.hints = results[1];

				/* Reading the sections needs a successful load; without the ACL
				 * grant the load rejects and the page falls back to lease-only
				 * colouring rather than failing. */
				try {
					self.state.reserved4 = reservedAddresses();
				}
				catch (e) {
					self.state.reserved4 = Object.create(null);
				}
			});
		},

		loadHistory: function() {
			var self = this;

			self.lastHistoryLoad = Date.now();

			return L.resolveDefault(fs.read(HISTORY_PATH), '').then(function(text) {
				var data = null;

				try {
					data = text ? JSON.parse(text) : null;
				}
				catch (e) {
					data = null;
				}

				self.archive = (data && data.clients) ? data.clients : {};
				self.archiveUpdated = (data && data.updated) || 0;
			});
		},

		/*
		 * Long-term counters from nlbwmon, when it is installed. This is a
		 * different measurement, not a refinement of the live one: nlbwmon sees
		 * each stream at creation and at destruction, so its figures survive the
		 * stream being reaped - which is exactly what the conntrack snapshot
		 * cannot do. Read less often than the snapshot because the numbers move
		 * on a monthly scale, not a five-second one.
		 */
		fetchNlbw: function() {
			var self = this;

			self.lastNlbwLoad = Date.now();

			return L.resolveDefault(fs.exec_direct(PROBE, [ 'nlbw' ]), '').then(function(output) {
				var data = null;

				try {
					data = output ? JSON.parse(output) : null;
				}
				catch (e) {
					data = null;
				}

				self.nlbwAvailable = !!(data && data.available);
				self.nlbwPeriods = (data && Array.isArray(data.periods)) ? data.periods : [];
				self.nlbw = self.nlbwAvailable ? (data.hosts || {}) : null;
			});
		},

		/* The merged rows, ready to render. */
		clients: function() {
			return buildClients({
				leases4: this.state.leases4,
				leases6: this.state.leases6,
				hints: this.state.hints,
				interfaces: this.state.interfaces,
				arp: this.state.arp,
				neigh6: this.state.neigh6,
				wifi: this.state.wifi,
				reserved4: this.state.reserved4,
				ip6Source: this.state.ip6Source,
				ip4Source: this.state.ip4Source,
				traffic: this.state.traffic,
				rates: this.rates || {},
				totals: this.totals || {},
				archive: this.archive,
				nlbw: this.nlbw
			});
		},

		/*
		 * One point of the trend chart: the summed rates of every client, split
		 * by scope. Kept in memory only - a chart of the last few minutes is not
		 * worth a file, and the archive already answers "how much in total".
		 */
		pushTrend: function(clients) {
			if (!this.trend)
				this.trend = [];

			var point = { t: Date.now(), lanUp: 0, lanDown: 0, wanUp: 0, wanDown: 0 };

			clients.forEach(function(entry) {
				if (!entry.rate)
					return;

				point.lanUp += entry.rate.lanUp || 0;
				point.lanDown += entry.rate.lanDown || 0;
				point.wanUp += entry.rate.wanUp || 0;
				point.wanDown += entry.rate.wanDown || 0;
			});

			/* A single client's series, for the device selector. */
			point.byMac = Object.create(null);

			clients.forEach(function(entry) {
				if (!entry.mac || !entry.rate)
					return;

				point.byMac[entry.mac] = {
					up: entry.rate.up,
					down: entry.rate.down,
					lanUp: entry.rate.lanUp,
					lanDown: entry.rate.lanDown,
					wanUp: entry.rate.wanUp,
					wanDown: entry.rate.wanDown
				};
			});

			this.trend.push(point);

			if (this.trend.length > TREND_POINTS)
				this.trend = this.trend.slice(this.trend.length - TREND_POINTS);

			return point;
		}
	};
}

/* ---------------- icons ---------------- */

/*
 * The vendor-icon bundle used to live inside luci-app-onu and was borrowed from
 * there. It ships with this package now: the host table is the only consumer,
 * and a page that silently loses its icons because an unrelated package was not
 * installed is not really self-contained.
 *
 * Best-effort by design: a missing bundle leaves the hostname as plain text and
 * must not stop the poll.
 */
var ouiPromise = null;

function loadOUI() {
	if (ouiPromise)
		return ouiPromise;

	ouiPromise = new Promise(function(resolve) {
		var script = document.createElement('script');

		script.src = L.resource('clients-oui/oui.js');
		script.async = true;
		script.onload = function() { resolve(window.luciOUI || null); };
		script.onerror = function() { resolve(null); };

		document.head.appendChild(script);
	});

	return ouiPromise;
}

/*
 * LuCI's require() only accepts class factories, and - more importantly - it
 * returns `new _class()`, an instance, never the class itself (see luci.js:
 * `const instance = new _class(); ... return instance`). The first deployment
 * hung the API on the class as static members, which passed the isSubclass
 * check and then failed with "common.createStore is not a function", because
 * the instance inherits from the prototype, not from the class object.
 *
 * The members therefore live in the extend() properties, exactly the way
 * LuCI's own rpc.js exports declare(): the instance consumers receive carries
 * every helper as an inherited method.
 */
var Common = L.Class.extend({
	PROBE: PROBE,
	HISTORY_PATH: HISTORY_PATH,
	DNS_ARCHIVE: DNS_ARCHIVE,
	STYLESHEET: STYLESHEET,
	SAMPLE_INTERVAL: SAMPLE_INTERVAL,
	LEASE_INTERVAL: LEASE_INTERVAL,
	HISTORY_INTERVAL: HISTORY_INTERVAL,
	TREND_POINTS: TREND_POINTS,
	sourceTitle: sourceTitle,
	normalizeMAC: normalizeMAC,
	autoUnit: autoUnit,
	formatRate: formatRate,
	formatSize: formatSize,
	formatBandwidth: formatBandwidth,
	formatCount: formatCount,
	relativeTime: relativeTime,
	absoluteTime: absoluteTime,
	clockTime: clockTime,
	ipv4Value: ipv4Value,
	ipv6Value: ipv6Value,
	ipv6Nodes: ipv6Nodes,
	subnetContains: subnetContains,
	networkOfAddress: networkOfAddress,
	reservedAddresses: reservedAddresses,
	ensureStylesheet: ensureStylesheet,
	buildClients: buildClients,
	sortValue: sortValue,
	createStore: createStore,
	loadOUI: loadOUI
});

return Common;

