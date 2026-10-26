// SPDX-License-Identifier: Apache-2.0

'use strict';
'require dom';
'require fs';
'require poll';
'require ui';
'require view';
'require view.status.clients.common as common';

/*
 * DNS - what each device looked up.
 *
 * The rows come from dnsmasq's own query log, parsed by clients-dns into
 * /tmp/clients-dns.json. Nothing here talks to the resolver: the collector runs
 * on a timer and this page reads its archive, which keeps a slow or broken
 * lookup from ever blocking the view.
 *
 * One lookup produces two rows - the query and the response - because that is
 * how dnsmasq writes them and because the pair carries different information:
 * the query knows what was asked, the response knows the answer, which server
 * produced it, and how long it took. Merging them into one row would hide the
 * lookups that never got an answer, and those are usually the interesting ones.
 *
 * dnsmasq logs whole seconds, so the response time is a floor: 6 ms and 900 ms
 * both read 0. The column says so in its tooltip rather than pretending to a
 * precision the source does not have.
 */

var PAGE_SIZES = [ 20, 50, 100 ];

return view.extend({
	store: null,
	records: null,
	page: 0,
	pageSize: 20,
	filters: { kind: '', domain: '', client: '', server: '' },
	ipNames: null,

	load: function() {
		this.store = common.createStore();

		/* Only the address -> name map is needed from the probe; the DNS rows
		 * themselves come from the archive. */
		return this.store.fetchSnapshot().then(L.bind(function() {
			return this.loadArchive();
		}, this));
	},

	loadArchive: function() {
		var self = this;

		return L.resolveDefault(fs.read(common.DNS_ARCHIVE), '').then(function(text) {
			var data = null;

			try {
				data = text ? JSON.parse(text) : null;
			}
			catch (e) {
				data = null;
			}

			self.records = (data && Array.isArray(data.records)) ? data.records : [];
			self.archiveUpdated = (data && data.updated) || 0;
		});
	},

	/* Map every address a client owns to its display name, so a DNS row can say
	 * "Mac.lan / 192.168.2.154" the way the resolver header does. */
	buildNameMap: function() {
		var map = Object.create(null);

		(this.store.clients() || []).forEach(function(entry) {
			var name = entry.hostname || null;

			entry.ipv4.forEach(function(ip) {
				map[ip] = { name: name, mac: entry.mac };
			});
			entry.ipv6.forEach(function(ip) {
				map[ip] = { name: name, mac: entry.mac };
			});
		});

		return map;
	},

	deviceLabel: function(client) {
		var known = this.ipNames ? this.ipNames[client] : null;

		if (!known)
			return client || '-';

		if (known.name)
			return '%s / %s'.format(known.name, client);

		return client;
	},

	filtered: function() {
		var filters = this.filters;
		var domain = filters.domain.toLowerCase();
		var client = filters.client.toLowerCase();
		var server = filters.server.toLowerCase();

		return (this.records || []).filter(function(record) {
			if (filters.kind && record.kind != filters.kind)
				return false;

			if (domain && String(record.domain || '').toLowerCase().indexOf(domain) < 0)
				return false;

			if (client && String(record.client || '').toLowerCase().indexOf(client) < 0)
				return false;

			if (server && String(record.server || '').toLowerCase().indexOf(server) < 0)
				return false;

			return true;
		}).slice().reverse();
	},

	/* ---------------- table ---------------- */

	kindBadge: function(kind) {
		return E('span', { 'class': 'clients-dns__kind clients-dns__kind--' + kind },
			(kind == 'query') ? _('Query') : _('Response'));
	},

	renderRows: function(rows) {
		if (!rows.length)
			return [ E('tr', {}, [
				E('td', { 'colspan': 8, 'class': 'clients__empty' },
					E('em', {}, _('No DNS records match the current filters.')))
			]) ];

		return rows.map(L.bind(function(record) {
			var isResponse = (record.kind == 'response');
			var result = record.result ? E('span', { 'class': 'clients-dns__result' }, record.result)
				: E('span', { 'class': 'clients__muted' }, '-');

			return E('tr', { 'class': isResponse ? null : 'clients-dns__query-row' }, [
				E('td', { 'class': 'clients-dns__time' }, common.clockTime(record.t)),
				E('td', { 'class': 'clients-dns__domain', 'title': record.domain || null },
					record.domain || '-'),
				E('td', { 'class': 'clients-dns__qtype' }, record.qtype || '-'),
				E('td', {}, this.kindBadge(record.kind)),
				E('td', {
					'class': 'clients__num',
					'title': _('dnsmasq logs whole seconds; sub-second times cannot be resolved')
				}, isResponse && record.ms != null
					? (record.ms >= 1000 ? _('%d s').format(record.ms / 1000) : _('%d ms').format(record.ms))
					: '-'),
				E('td', { 'class': 'clients-dns__device' }, this.deviceLabel(record.client)),
				E('td', { 'class': 'clients-dns__server' }, record.server || '-'),
				E('td', { 'class': 'clients-dns__results' }, result)
			]);
		}, this));
	},

	renderPager: function(total) {
		var pages = Math.max(1, Math.ceil(total / this.pageSize));
		var page = Math.min(this.page, pages - 1);

		if (this.page != page)
			this.page = page;

		return E('div', { 'class': 'clients-pager' }, [
			E('span', { 'class': 'clients-pager__info' },
				_('Page %d of %d, %d records').format(page + 1, pages, total)),
			E('span', { 'class': 'clients-pager__buttons' }, [
				E('button', {
					'class': 'btn cbi-button',
					'disabled': page <= 0,
					'click': ui.createHandlerFn(this, function() {
						this.page = Math.max(0, this.page - 1);
						this.update();
					})
				}, _('Previous')),
				' ',
				E('button', {
					'class': 'btn cbi-button',
					'disabled': page >= pages - 1,
					'click': ui.createHandlerFn(this, function() {
						this.page = Math.min(pages - 1, this.page + 1);
						this.update();
					})
				}, _('Next'))
			])
		]);
	},

	update: function() {
		this.ipNames = this.buildNameMap();

		var rows = this.filtered();
		var start = this.page * this.pageSize;
		var page = rows.slice(start, start + this.pageSize);

		var body = E('tbody', {}, this.renderRows(page));

		dom.content(this.tbody, Array.prototype.slice.call(body.childNodes));
		dom.content(this.pager, [ this.renderPager(rows.length) ]);

		if (this.count)
			this.count.textContent = _('%d records').format(rows.length);
	},

	/* ---------------- controls ---------------- */

	filterInput: function(key, placeholder) {
		var self = this;
		var input = E('input', {
			'type': 'text',
			'id': 'clients-dns-filter-' + key,
			'name': 'clients-dns-filter-' + key,
			'class': 'cbi-input-text',
			'placeholder': placeholder,
			'value': this.filters[key] || ''
		});

		input.addEventListener('input', function() {
			self.filters[key] = input.value;
			self.page = 0;
			self.update();
		});

		return input;
	},

	render: function() {
		var self = this;

		common.ensureStylesheet();

		/* The containers have to exist before the first update(): update()
		 * writes straight into this.tbody and this.pager, so creating them after
		 * the call would throw on the very first render - which is what the
		 * offline harness caught. */
		this.count = E('span', { 'class': 'clients-count' }, '-');
		this.tbody = E('tbody');
		this.pager = E('div', { 'class': 'clients-pager' });

		this.update();

		var kindSelect = E('select', { 'id': 'clients-dns-kind', 'name': 'clients-dns-kind', 'class': 'cbi-input-select' }, [
			E('option', { 'value': '' }, _('All')),
			E('option', { 'value': 'query' }, _('Query')),
			E('option', { 'value': 'response' }, _('Response'))
		]);

		kindSelect.addEventListener('change', function() {
			self.filters.kind = kindSelect.value;
			self.page = 0;
			self.update();
		});

		var sizeSelect = E('select', { 'id': 'clients-dns-size', 'name': 'clients-dns-size', 'class': 'cbi-input-select' }, PAGE_SIZES.map(function(size) {
			return E('option', { 'value': String(size), 'selected': (size == self.pageSize) }, String(size));
		}));

		sizeSelect.addEventListener('change', function() {
			self.pageSize = parseInt(sizeSelect.value, 10) || 20;
			self.page = 0;
			self.update();
		});

		/* The archive grows on a timer, so a light poll is enough - and it keeps
		 * the page useful while sitting open on a second monitor. */
		poll.add(L.bind(function() {
			if (document.hidden || this.hidden)
				return Promise.resolve();

			return this.loadArchive().then(function() {
				self.update();
			}).catch(function(error) {
				L.error(error);
			});
		}, this), 10);

		return E('div', { 'class': 'clients-pane' }, [
			E('div', { 'class': 'cbi-map-descr' },
				_('Every DNS lookup dnsmasq answered, with the device that asked and the server it was forwarded to.')),
			E('div', { 'class': 'cbi-section' }, [
				E('h3', {}, [
					_('DNS query records'),
					E('span', { 'class': 'pull-right clients-tags' }, this.count)
				]),
				E('div', { 'class': 'clients-filters' }, [
					E('label', { 'class': 'clients-control' }, [ E('span', {}, _('Type')), kindSelect ]),
					E('label', { 'class': 'clients-control' }, [
						E('span', {}, _('Domain')), this.filterInput('domain', _('Search domain'))
					]),
					E('label', { 'class': 'clients-control' }, [
						E('span', {}, _('Device')), this.filterInput('client', _('Search device'))
					]),
					E('label', { 'class': 'clients-control' }, [
						E('span', {}, _('DNS server')), this.filterInput('server', _('Search server'))
					]),
					E('label', { 'class': 'clients-control clients-control--size' }, [
						E('span', {}, _('Per page')), sizeSelect
					])
				]),
				E('div', { 'class': 'clients-wrap' }, E('table', { 'class': 'clients clients-dns' }, [
					E('colgroup', {}, [
						E('col', { 'style': 'width:10.5rem' }),
						E('col', { 'style': 'width:auto' }),
						E('col', { 'style': 'width:5.5rem' }),
						E('col', { 'style': 'width:6rem' }),
						E('col', { 'style': 'width:6rem' }),
						E('col', { 'style': 'width:12rem' }),
						E('col', { 'style': 'width:9rem' }),
						E('col', { 'style': 'width:11rem' })
					]),
					E('thead', {}, E('tr', {}, [
						E('th', {}, _('Time')),
						E('th', {}, _('Domain')),
						E('th', {}, _('Query type')),
						E('th', {}, _('Type')),
						E('th', { 'class': 'clients__num' }, _('Response time')),
						E('th', {}, _('Device')),
						E('th', {}, _('DNS server')),
						E('th', {}, _('Response result'))
					])),
					this.tbody
				])),
				this.pager,
				E('p', { 'class': 'clients-note' },
					_('Records are kept in memory and reset when the device reboots. Logging every query costs a little CPU on a busy resolver; it can be switched off under DHCP/DNS settings.')),
				E('p', { 'class': 'clients-note' },
					_('A query and its response are two rows, joined by the query id dnsmasq assigns. A query without a response is one that never got an answer.'))
			])
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
