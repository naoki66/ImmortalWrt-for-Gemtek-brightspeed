// SPDX-License-Identifier: Apache-2.0

'use strict';
'require dom';
'require poll';
'require ui';
'require view';
'require view.status.clients.common as common';

/*
 * Devices - one row per client, with the LAN and WAN halves of its traffic side
 * by side.
 *
 * The split is the reason this page exists in this shape. "This phone used
 * 300 MB" says nothing about whether it went to the internet (which costs
 * upstream bandwidth) or to the NAS in the next room (which does not). The
 * probe decides it from the far end of each flow and reports both halves;
 * this view only displays them.
 *
 * Totals are session totals. conntrack accounting belongs to the flow, so when
 * a flow is reaped its byte count leaves this table with it - there is no
 * lifetime counter to read. The column header says so rather than implying a
 * precision the data does not have.
 */

var SORT_KEYS = [ 'state', 'hostname', 'ipv4', 'ipv6', 'mac', 'network', 'signal', 'lan', 'wan', 'month', 'conns', 'last' ];
var SORT_STORAGE = 'clients.devices.sort';

/* The long-term counters move on a monthly scale; polling them every five
 * seconds would buy nothing and cost one netlink round trip each time. */
var NLBW_INTERVAL = 60;

return view.extend({
	store: null,
	clients: null,
	oui: null,
	sort: { key: 'state', desc: true },
	activeAddresses: null,
	ip6Source: null,
	ip4Source: null,
	reserved4: null,

	load: function() {
		var self = this;

		this.store = common.createStore();
		this.restoreSort();

		return common.loadOUI().then(function(oui) {
			self.oui = oui;
			return self.store.loadHistory();
		}).then(function() {
			return self.store.fetchLeases();
		}).then(function() {
			return self.store.fetchNlbw();
		}).then(function() {
			return self.store.fetchSnapshot();
		});
	},

	/* ---------------- cells ---------------- */

	ipv4SourceOf: function(ip) {
		if (this.reserved4 && this.reserved4[ip])
			return 'static';

		return (this.ip4Source && this.ip4Source[ip]) || null;
	},

	addressCell: function(list, className, checkable) {
		if (!list.length)
			return '-';

		var family = (className == 'clients__ip6') ? 6 : 4;

		return E('div', {}, list.map(L.bind(function(ip) {
			/* Only ARP can prove an address is still in use, and ARP is IPv4: an
			 * IPv6 address is never marked expired just because it does not
			 * appear in a table that cannot describe it. */
			var stale = checkable && !this.activeAddresses[ip];
			var classes = [ className ];
			var source = (family == 6) ? (this.ip6Source[ip] || null) : this.ipv4SourceOf(ip);

			if (stale)
				classes.push('clients__stale');

			if (family == 4)
				classes.push('clients__ip4');

			if (source)
				classes.push('clients__ip' + family + '--' + source);

			return E('div', {
				'class': classes.join(' '),
				'title': common.sourceTitle(source) || (stale ? _('Expired') : null)
			}, (family == 6) ? common.ipv6Nodes(ip) : ip);
		}, this)));
	},

	hostnameCell: function(entry) {
		var name = E('span', {
			'class': 'clients__name',
			'title': entry.hostname || null
		}, entry.hostname || '-');
		var wrapper = E('span', { 'class': 'clients__hostwrap' }, name);

		if (this.oui && entry.mac) {
			try {
				this.oui.decorate(name, entry.mac, false);
			}
			catch (e) {
				L.error(e);
			}
		}

		return wrapper;
	},

	/* Where the client sits, in one column: a wireless row says which SSID and
	 * band it associated with, a wired row says which VLAN its address arrived
	 * on. Those are two answers to the same question. */
	networkCell: function(entry) {
		var parts = [];

		if (entry.ssid) {
			parts.push(E('span', { 'class': 'clients__ssid', 'title': entry.ssid }, entry.ssid));

			if (entry.band)
				parts.push(E('span', {
					'class': 'clients__band clients__band--' + String(entry.band).replace('.', '')
				}, entry.band));
		}
		else if (entry.vlan != null) {
			parts.push(E('span', { 'class': 'clients__vlan' }, _('VLAN %d').format(entry.vlan)));
		}
		else {
			parts.push(E('span', { 'class': 'clients__muted' }, entry.wireless ? _('Wireless') : _('Wired')));
		}

		return E('div', { 'class': 'clients__net' }, parts);
	},

	signalCell: function(entry) {
		if (entry.signal == null)
			return E('span', { 'class': 'clients__muted' }, '-');

		var quality = Math.min(Math.max((entry.signal + 110) / 70 * 100, 0), 100);
		var icon;

		if (quality == 0)
			icon = 'signal-000-000.svg';
		else if (quality < 25)
			icon = 'signal-000-025.svg';
		else if (quality < 50)
			icon = 'signal-025-050.svg';
		else if (quality < 75)
			icon = 'signal-050-075.svg';
		else
			icon = 'signal-075-100.svg';

		var title = (entry.noise != null)
			? '%s: %d %s / %s: %d %s / %s %d'.format(
				_('Signal'), entry.signal, _('dBm'),
				_('Noise'), entry.noise, _('dBm'),
				_('SNR'), entry.signal - entry.noise)
			: '%s: %d %s'.format(_('Signal'), entry.signal, _('dBm'));

		return E('span', { 'class': 'clients__signal', 'title': title }, [
			E('img', { 'src': L.resource('icons/' + icon), 'class': 'clients__signal-icon', 'alt': '' }),
			String(entry.signal)
		]);
	},

	/*
	 * One scope's traffic: the rate on top, the session total underneath, both
	 * with the direction arrows the carrier pages use. The total is deliberately
	 * quiet - it is a floor, not a lifetime figure, and giving it the same
	 * weight as the rate would invite the wrong reading.
	 */
	trafficCell: function(entry, scope) {
		if (!entry || !entry.rate)
			return E('span', { 'class': 'clients__muted' }, '-');

		var rateUp = entry.rate[scope + 'Up'] || 0;
		var rateDown = entry.rate[scope + 'Down'] || 0;
		var totalUp = entry.total[scope + 'Up'] || 0;
		var totalDown = entry.total[scope + 'Down'] || 0;

		if (!rateUp && !rateDown && !totalUp && !totalDown)
			return E('span', { 'class': 'clients__muted' }, '-');

		return E('div', { 'class': 'clients__traffic' }, [
			E('div', { 'class': 'clients__traffic-rate' }, [
				E('span', { 'class': 'clients__traffic-up' }, [
					E('span', { 'class': 'clients__dir', 'aria-hidden': 'true' }, '↑'), ' ',
					common.formatRate(rateUp)
				]),
				E('span', { 'class': 'clients__traffic-down' }, [
					E('span', { 'class': 'clients__dir', 'aria-hidden': 'true' }, '↓'), ' ',
					common.formatRate(rateDown)
				])
			]),
			E('div', {
				'class': 'clients__traffic-total',
				'title': _('Traffic seen while this view was open. conntrack counters belong to a flow, so the figure is a floor, not a lifetime total.')
			}, [
				E('span', {}, '↑ ' + common.formatSize(totalUp)),
				E('span', {}, '↓ ' + common.formatSize(totalDown))
			])
		]);
	},

	/*
	 * The accounting period total from nlbwmon - the only figure here that
	 * survives a stream being reaped, because nlbwmon sees the stream die and
	 * keeps its final counters. Empty when nlbwmon is not installed; the header
	 * says which period it covers so an empty column is not read as "zero".
	 */
	monthCell: function(entry) {
		if (!entry.month)
			return E('span', {
				'class': 'clients__muted',
				'title': _('Long-term counters need the nlbwmon package')
			}, '-');

		return E('div', { 'class': 'clients__traffic' }, [
			E('div', { 'class': 'clients__traffic-rate' }, [
				E('span', { 'class': 'clients__traffic-up' }, [
					E('span', { 'class': 'clients__dir', 'aria-hidden': 'true' }, '↑'), ' ',
					common.formatSize(entry.month.up)
				]),
				E('span', { 'class': 'clients__traffic-down' }, [
					E('span', { 'class': 'clients__dir', 'aria-hidden': 'true' }, '↓'), ' ',
					common.formatSize(entry.month.down)
				])
			])
		]);
	},

	renderRow: function(entry) {
		var seen = entry.online
			? _('now')
			: (common.relativeTime(entry.last) || '-');

		return E('tr', { 'class': entry.online ? null : 'clients__offline' }, [
			E('td', {}, E('span', { 'class': 'pon-state' }, [
				E('span', {
					'class': 'pon-dot',
					'data-state': entry.online ? 'ok' : 'error',
					'aria-hidden': 'true'
				}),
				entry.online ? _('Online') : _('Offline')
			])),
			E('td', { 'class': 'clients__host' }, this.hostnameCell(entry)),
			E('td', {}, this.addressCell(entry.ipv4, 'clients__addr', true)),
			E('td', {}, this.addressCell(entry.ipv6, 'clients__ip6', false)),
			E('td', { 'class': 'clients__addr' }, entry.mac || '-'),
			E('td', {}, this.networkCell(entry)),
			E('td', {}, this.signalCell(entry)),
			E('td', { 'class': 'clients__num' }, this.trafficCell(entry, 'lan')),
			E('td', { 'class': 'clients__num' }, this.trafficCell(entry, 'wan')),
			E('td', { 'class': 'clients__num' }, this.monthCell(entry)),
			E('td', { 'class': 'clients__num' }, common.formatCount(entry.conns)),
			E('td', { 'class': 'clients__seen', 'title': common.absoluteTime(entry.last) }, [
				E('div', { 'class': 'clients__seen-last' }, seen),
				entry.first ? E('div', { 'class': 'clients__seen-first' },
					_('first %s').format(common.relativeTime(entry.first) || common.absoluteTime(entry.first))) : null
			])
		]);
	},

	/* A sortable header: the whole cell is the control, so it also responds to
	 * Enter and Space and carries aria-sort for screen readers. */
	headerCell: function(label, key, className) {
		var active = (this.sort.key == key);
		var classes = [ className || '', active ? 'clients__sorted' : '' ];

		var cell = E('th', {
			'class': classes.join(' ').trim() || null,
			'role': 'button',
			'tabindex': '0',
			'data-key': key,
			'aria-sort': active ? (this.sort.desc ? 'descending' : 'ascending') : 'none',
			'title': _('Sort by %s').format(label),
			'click': ui.createHandlerFn(this, 'handleSort', key)
		}, [
			label,
			E('span', { 'class': 'clients__arrow', 'aria-hidden': 'true' },
				active ? (this.sort.desc ? '▼' : '▲') : '')
		]);

		cell.addEventListener('keydown', ui.createHandlerFn(this, 'handleSortKey', key));

		return cell;
	},

	buildTable: function(clients) {
		var head = [
			this.headerCell(_('State'), 'state'),
			this.headerCell(_('Hostname'), 'hostname'),
			this.headerCell(_('IPv4 address'), 'ipv4'),
			this.headerCell(_('IPv6 address'), 'ipv6'),
			this.headerCell(_('MAC address'), 'mac'),
			this.headerCell(_('Network'), 'network'),
			this.headerCell(_('Signal'), 'signal'),
			this.headerCell(_('LAN') + ' (↑ / ↓)', 'lan', 'clients__num'),
			this.headerCell(_('WAN') + ' (↑ / ↓)', 'wan', 'clients__num'),
			this.headerCell(_('This month') + ' (↑ / ↓)', 'month', 'clients__num'),
			this.headerCell(_('Connections'), 'conns', 'clients__num'),
			this.headerCell(_('Last seen'), 'last')
		];

		this.activeAddresses = Object.create(null);
		(this.store.state.arp || []).forEach(L.bind(function(neighbour) {
			this.activeAddresses[neighbour.ip] = true;
		}, this));

		var body = clients.length
			? clients.map(L.bind(this.renderRow, this))
			: [ E('tr', {}, [
				E('td', { 'colspan': head.length, 'class': 'clients__empty' },
					E('em', {}, _('No clients are online right now.')))
			]) ];

		/* Fixed widths, because automatic layout sizes the IPv6 column by its
		 * widest hextet and then pushes the counters out of the card. */
		var widths = [ '4.5rem', '7.5rem', '7.5rem', '9.5rem', '9rem', '7.5rem',
			'4.75rem', '7.5rem', '7.5rem', '7rem', '5rem', '6.5rem' ];

		return E('table', { 'class': 'clients' }, [
			E('colgroup', {}, widths.map(function(width) {
				return E('col', { 'style': 'width:' + width });
			})),
			E('thead', {}, E('tr', {}, head)),
			E('tbody', {}, body)
		]);
	},

	/* Sorts from the cached client list, so the order survives the refresh
	 * without re-reading anything. Entries with no value for the active column
	 * always sink to the bottom, whichever direction is selected. */
	sortEntries: function(clients) {
		var sort = this.sort;

		clients.sort(function(a, b) {
			var av = common.sortValue(a, sort.key);
			var bv = common.sortValue(b, sort.key);
			var cmp;

			if (av == null || bv == null) {
				if (av == null && bv == null)
					cmp = 0;
				else
					return (av == null) ? 1 : -1;
			}
			else if (typeof av == 'number' && typeof bv == 'number') {
				cmp = av - bv;
			}
			else {
				cmp = L.naturalCompare(String(av), String(bv));
			}

			if (cmp != 0)
				return sort.desc ? -cmp : cmp;

			var at = a.total.up + a.total.down;
			var bt = b.total.up + b.total.down;

			if (at != bt)
				return bt - at;

			return L.naturalCompare(a.hostname || a.mac || a.id, b.hostname || b.mac || b.id);
		});
	},

	handleSort: function(key, ev) {
		if (ev && ev.preventDefault)
			ev.preventDefault();

		if (this.sort.key == key)
			this.sort.desc = !this.sort.desc;
		else
			this.sort = { key: key, desc: (key == 'state') };

		this.saveSort();
		this.updateTable();

		var cell = this.table.querySelector('th[data-key="' + key + '"]');

		if (cell)
			cell.focus();
	},

	handleSortKey: function(key, ev) {
		if (ev.key != 'Enter' && ev.key != ' ')
			return;

		ev.preventDefault();
		this.handleSort(key);
	},

	saveSort: function() {
		try {
			window.localStorage.setItem(SORT_STORAGE, JSON.stringify(this.sort));
		}
		catch (e) {
			/* Private mode / quota: the choice simply does not persist. */
		}
	},

	restoreSort: function() {
		var stored = null;

		try {
			stored = JSON.parse(window.localStorage.getItem(SORT_STORAGE) || 'null');
		}
		catch (e) {
			stored = null;
		}

		if (stored && SORT_KEYS.indexOf(stored.key) >= 0)
			this.sort = { key: stored.key, desc: stored.desc === true };
		else
			this.sort = { key: 'state', desc: true };
	},

	updateTable: function() {
		this.ip6Source = Object.create(null);
		this.ip4Source = Object.create(null);
		this.store.state.ip6Source = this.ip6Source;
		this.store.state.ip4Source = this.ip4Source;

		var clients = this.store.clients();

		this.reserved4 = this.store.state.reserved4;
		this.clients = clients;
		this.sortEntries(clients);

		var online = 0, total = clients.length;

		clients.forEach(function(entry) {
			if (entry.online)
				online++;
		});

		var table = this.buildTable(clients);

		/* childNodes is a live NodeList: copy it before dom.content() moves the
		 * nodes out of the freshly built table. */
		dom.content(this.table, Array.prototype.slice.call(table.childNodes));
		this.count.textContent = _('%d online / %d total').format(online, total);
	},

	render: function() {
		var self = this;

		common.ensureStylesheet();

		this.count = E('span', { 'class': 'clients-count' }, '-');
		this.table = E('table', { 'class': 'clients' });

		this.updateTable();

		/* Nothing in this build listens for visibilitychange, so a page left in a
		 * background tab would keep paying for a conntrack walk every interval. */
		poll.add(L.bind(function() {
			var jobs;

			/* hidden covers the background tab and the inactive tab case. */
			if (document.hidden || this.hidden)
				return Promise.resolve();

			jobs = [ this.store.fetchSnapshot() ];

			if ((Date.now() - this.store.lastLeaseLoad) >= common.LEASE_INTERVAL * 1000)
				jobs.push(this.store.fetchLeases());

			if ((Date.now() - this.store.lastHistoryLoad) >= common.HISTORY_INTERVAL * 1000)
				jobs.push(this.store.loadHistory());

			if ((Date.now() - (this.store.lastNlbwLoad || 0)) >= NLBW_INTERVAL * 1000)
				jobs.push(this.store.fetchNlbw());

			return Promise.all(jobs).then(function() {
				self.updateTable();
			}).catch(function(error) {
				/* A failing probe must not stop the poll: the next tick retries and
				 * the page keeps the last known rows on screen. */
				L.error(error);
			});
		}, this), common.SAMPLE_INTERVAL);

		return E('div', { 'class': 'clients-pane' }, [
			E('div', { 'class': 'cbi-map-descr' },
				_('Every station this device can see, with its addresses, the network it sits on, and its traffic split between the LAN and the WAN.')),
			E('div', { 'class': 'cbi-section' }, [
				E('h3', {}, [
					_('Known clients'),
					E('span', { 'class': 'pull-right clients-tags' }, this.count)
				]),
				E('div', { 'class': 'clients-wrap' }, this.table),
				E('div', { 'class': 'clients-footer' }, [
					E('div', { 'class': 'clients-footer__legend' }, [
						E('span', { 'class': 'clients-legend clients-legend--ip4-dynamic' }, 'DHCP'),
						E('span', { 'class': 'clients-legend clients-legend--ip4-static' }, _('Static lease')),
						E('span', { 'class': 'clients-legend clients-legend--ip4-manual' }, _('Manual')),
						E('span', { 'class': 'clients-legend clients-legend--ip6-dhcpv6' }, 'DHCPv6'),
						E('span', { 'class': 'clients-legend clients-legend--ip6-slaac' }, 'SLAAC'),
						E('span', { 'class': 'clients-footer__text' },
							_('addresses are coloured by who assigned them'))
					]),
					E('p', { 'class': 'clients-note' },
						_('LAN counts traffic to other addresses inside this network; WAN counts everything else. Rates are differentiated from kernel conntrack counters, which keep counting for hardware-offloaded flows.')),
					E('p', { 'class': 'clients-note' },
						_('The subtotals are what this view has seen since it was opened. conntrack counters belong to a flow, so a flow that ends takes its bytes with it - treat the figure as a floor, not a lifetime total.')),
					E('p', { 'class': 'clients-note' },
						_('The month column comes from nlbwmon, which records every stream when it closes and therefore can give a real period total. It requires the nlbwmon package; without it the column stays empty and nothing else changes.'))
				])
			])
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
