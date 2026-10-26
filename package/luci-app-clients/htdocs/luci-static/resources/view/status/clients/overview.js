// SPDX-License-Identifier: Apache-2.0

'use strict';
'require dom';
'require poll';
'require ui';
'require view';
'require view.status.clients.common as common';

/*
 * Overview - the totals, and the trend that makes them interpretable.
 *
 * The chart is drawn as inline SVG rather than pulled from a charting library.
 * A router image has no room for one, and the shape needed here is two lines
 * with a shared axis: a library would add more code than the drawing does.
 *
 * The series lives in memory. Points accumulate every SAMPLE_INTERVAL while the
 * page is open and are dropped when it closes, because a few minutes of history
 * is not worth writing to a file - and writing it to flash on a timer is
 * exactly what a status page should not do.
 *
 * The totals come from conntrack, so they are floors rather than lifetime
 * figures. The footnote under the chart says that once instead of repeating it
 * in every tile.
 */

var WINDOWS = [
	{ label: _('Last 5 minutes'), minutes: 5 },
	{ label: _('Last 10 minutes'), minutes: 10 },
	{ label: _('Last 25 minutes'), minutes: 25 }
];

var TYPES = [
	{ value: 'total', label: _('Total') },
	{ value: 'lan', label: _('LAN') },
	{ value: 'wan', label: _('WAN') }
];

/* Nice round numbers for the Y axis: a chart whose top reads "3.47 MiB/s" is
 * harder to read than one whose top reads "4 MiB/s". */
function niceCeiling(value) {
	if (!value || value <= 0)
		return 1;

	var exponent = Math.floor(Math.log(value) / Math.LN2);
	var base = Math.pow(2, exponent);
	var steps = [ 1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8 ];

	for (var i = 0; i < steps.length; i++)
		if (steps[i] * base >= value)
			return steps[i] * base;

	return 2 * base;
}

return view.extend({
	store: null,
	clients: null,
	selectedMac: '',
	selectedType: 'total',
	windowMinutes: 10,

	load: function() {
		this.store = common.createStore();

		return this.store.fetchLeases().then(L.bind(function() {
			return this.store.fetchSnapshot();
		}, this));
	},

	/* ---------------- summary ---------------- */

	summarise: function(clients) {
		var summary = {
			online: 0, total: clients.length, wireless: 0,
			lanUp: 0, lanDown: 0, wanUp: 0, wanDown: 0,
			lanTotalUp: 0, lanTotalDown: 0, wanTotalUp: 0, wanTotalDown: 0,
			connections: this.store.state.stats ? this.store.state.stats.conntrack : null,
			capacity: this.store.state.stats ? this.store.state.stats.conntrack_max : null
		};

		clients.forEach(function(entry) {
			if (entry.online)
				summary.online++;
			if (entry.wireless)
				summary.wireless++;

			if (!entry.rate)
				return;

			summary.lanUp += entry.rate.lanUp || 0;
			summary.lanDown += entry.rate.lanDown || 0;
			summary.wanUp += entry.rate.wanUp || 0;
			summary.wanDown += entry.rate.wanDown || 0;

			summary.lanTotalUp += entry.total.lanUp || 0;
			summary.lanTotalDown += entry.total.lanDown || 0;
			summary.wanTotalUp += entry.total.wanUp || 0;
			summary.wanTotalDown += entry.total.wanDown || 0;
		});

		return summary;
	},

	renderSummary: function(summary) {
		function block(label, up, down, totalUp, totalDown) {
			return E('div', { 'class': 'clients-block' }, [
				E('div', { 'class': 'clients-block__title' }, label),
				E('div', { 'class': 'clients-block__row' }, [
					E('span', { 'class': 'clients-block__dir clients-block__dir--up' }, '↑'),
					E('span', { 'class': 'clients-block__rate' }, common.formatRate(up)),
					E('span', { 'class': 'clients-block__total' }, '(' + common.formatSize(totalUp) + ')')
				]),
				E('div', { 'class': 'clients-block__row' }, [
					E('span', { 'class': 'clients-block__dir clients-block__dir--down' }, '↓'),
					E('span', { 'class': 'clients-block__rate' }, common.formatRate(down)),
					E('span', { 'class': 'clients-block__total' }, '(' + common.formatSize(totalDown) + ')')
				])
			]);
		}

		var totalUp = summary.lanUp + summary.wanUp;
		var totalDown = summary.lanDown + summary.wanDown;
		var totalUpBytes = summary.lanTotalUp + summary.wanTotalUp;
		var totalDownBytes = summary.lanTotalDown + summary.wanTotalDown;

		dom.content(this.summary, [
			block(_('LAN traffic'), summary.lanUp, summary.lanDown,
				summary.lanTotalUp, summary.lanTotalDown),
			block(_('WAN traffic'), summary.wanUp, summary.wanDown,
				summary.wanTotalUp, summary.wanTotalDown),
			block(_('Total'), totalUp, totalDown, totalUpBytes, totalDownBytes),
			E('div', { 'class': 'clients-block clients-block--facts' }, [
				E('div', { 'class': 'clients-block__title' }, _('Clients')),
				E('div', { 'class': 'clients-block__fact' }, [
					E('span', { 'class': 'clients-block__value' }, String(summary.online)),
					E('span', { 'class': 'clients-block__unit' }, _('online of %s').format(String(summary.total)))
				]),
				E('div', { 'class': 'clients-block__fact' }, [
					E('span', { 'class': 'clients-block__value' }, String(summary.wireless)),
					E('span', { 'class': 'clients-block__unit' }, _('wireless'))
				]),
				E('div', { 'class': 'clients-block__fact' }, [
					E('span', { 'class': 'clients-block__value' }, common.formatCount(summary.connections)),
					E('span', { 'class': 'clients-block__unit' },
						summary.capacity ? _('connections of %s').format(String(summary.capacity))
							: _('connections'))
				])
			])
		]);
	},

	/* ---------------- chart ---------------- */

	/*
	 * Two series, one axis. `pick(point)` returns { up, down } in bytes/second
	 * for a point, which lets the same drawing code serve the totals and a
	 * single device without a second implementation.
	 */
	seriesFor: function() {
		var type = this.selectedType;
		var mac = this.selectedMac;

		return function(point) {
			var source = point;

			if (mac) {
				source = point.byMac ? point.byMac[mac] : null;

				if (!source)
					return { up: 0, down: 0 };
			}

			if (type == 'lan')
				return { up: source.lanUp || 0, down: source.lanDown || 0 };

			if (type == 'wan')
				return { up: source.wanUp || 0, down: source.wanDown || 0 };

			return {
				up: (source.lanUp || 0) + (source.wanUp || 0),
				down: (source.lanDown || 0) + (source.wanDown || 0)
			};
		};
	},

	visiblePoints: function() {
		var trend = this.store.trend || [];
		var cutoff = Date.now() - this.windowMinutes * 60000;

		return trend.filter(function(point) { return point.t >= cutoff; });
	},

	renderChart: function() {
		var points = this.visiblePoints();
		var pick = this.seriesFor();

		var width = 720, height = 220;
		var padLeft = 58, padRight = 12, padTop = 12, padBottom = 26;
		var plotW = width - padLeft - padRight;
		var plotH = height - padTop - padBottom;

		if (!points.length) {
			dom.content(this.chart, [
				E('div', { 'class': 'clients-chart__empty' },
					_('Collecting samples. The chart fills in as the page stays open.'))
			]);
			return;
		}

		var values = points.map(pick);
		var peak = 0;

		values.forEach(function(v) {
			peak = Math.max(peak, v.up, v.down);
		});

		var ceiling = niceCeiling(peak);
		var t0 = points[0].t;
		var t1 = points[points.length - 1].t;

		/* A single sample has no span; give it a nominal one so the line lands
		 * in the middle instead of dividing by zero. */
		if (t1 <= t0)
			t1 = t0 + 1000;

		function x(t) { return padLeft + (t - t0) / (t1 - t0) * plotW; }
		function y(v) { return padTop + plotH - (v / ceiling) * plotH; }

		function path(key) {
			return points.map(function(point, index) {
				var v = values[index][key];

				return (index ? 'L' : 'M') + x(point.t).toFixed(1) + ' ' + y(v).toFixed(1);
			}).join(' ');
		}

		var gridlines = [];

		for (var i = 0; i <= 4; i++) {
			var value = ceiling * i / 4;
			var gy = y(value);

			gridlines.push(E('line', {
				'x1': padLeft, 'y1': gy.toFixed(1), 'x2': width - padRight, 'y2': gy.toFixed(1),
				'stroke': 'var(--cl-rule)', 'stroke-width': '1'
			}));
			gridlines.push(E('text', {
				'x': padLeft - 8, 'y': (gy + 3).toFixed(1), 'text-anchor': 'end',
				'font-size': '10', 'fill': 'var(--cl-muted)'
			}, common.formatRate(value)));
		}

		/* Three time labels: start, middle, end. More would collide at this size. */
		function timeLabel(t) {
			var d = new Date(t);

			function pad(n) { return (n < 10) ? '0' + n : String(n); }

			return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
		}

		var labels = [
			E('text', { 'x': padLeft, 'y': height - 8, 'text-anchor': 'start',
				'font-size': '10', 'fill': 'var(--cl-muted)' }, timeLabel(t0)),
			E('text', { 'x': padLeft + plotW / 2, 'y': height - 8, 'text-anchor': 'middle',
				'font-size': '10', 'fill': 'var(--cl-muted)' }, timeLabel((t0 + t1) / 2)),
			E('text', { 'x': width - padRight, 'y': height - 8, 'text-anchor': 'end',
				'font-size': '10', 'fill': 'var(--cl-muted)' }, timeLabel(t1))
		];

		var svg = E('svg', {
			'viewBox': '0 0 ' + width + ' ' + height,
			'width': '100%',
			'class': 'clients-chart__svg',
			'role': 'img'
		}, [
			E('title', {}, _('Traffic trend')),
			E('desc', {}, _('Upload and download rates over the selected window.')),
			E('g', {}, gridlines),
			E('g', {}, labels),
			E('path', {
				'd': path('up'), 'fill': 'none',
				'stroke': 'var(--cl-up)', 'stroke-width': '1.5',
				'stroke-linejoin': 'round', 'stroke-linecap': 'round'
			}),
			E('path', {
				'd': path('down'), 'fill': 'none',
				'stroke': 'var(--cl-down)', 'stroke-width': '1.5',
				'stroke-linejoin': 'round', 'stroke-linecap': 'round'
			})
		]);

		dom.content(this.chart, [ svg ]);
	},

	deviceOptions: function() {
		var clients = this.clients || [];
		var options = [ E('option', { 'value': '' }, _('All devices')) ];

		clients.filter(function(entry) { return entry.mac; }).forEach(function(entry) {
			options.push(E('option', { 'value': entry.mac }, [
				entry.hostname || entry.ipv4[0] || entry.mac
			]));
		});

		return options;
	},

	refreshDeviceSelect: function() {
		var select = this.deviceSelect;
		var current = select.value;
		var options = this.deviceOptions();

		dom.content(select, options);

		/* Keep the selection across a refresh, and drop it if the device left the
		 * table - otherwise the chart would silently go flat. */
		var still = options.some(function(option) { return option.getAttribute('value') == current; });

		select.value = still ? current : '';
		this.selectedMac = select.value;
	},

	/* ---------------- view ---------------- */

	update: function() {
		var clients = this.store.clients();

		this.clients = clients;
		this.store.pushTrend(clients);

		this.renderSummary(this.summarise(clients));
		this.refreshDeviceSelect();
		this.renderChart();
	},

	render: function() {
		var self = this;

		common.ensureStylesheet();

		this.summary = E('div', { 'class': 'clients-blocks' });
		this.chart = E('div', { 'class': 'clients-chart' });
		this.deviceSelect = E('select', { 'id': 'clients-ov-device', 'name': 'clients-ov-device', 'class': 'cbi-input-select' }, this.deviceOptions());

		this.deviceSelect.addEventListener('change', function() {
			self.selectedMac = self.deviceSelect.value;
			self.renderChart();
		});

		var typeSelect = E('select', { 'id': 'clients-ov-type', 'name': 'clients-ov-type', 'class': 'cbi-input-select' }, TYPES.map(function(type) {
			return E('option', { 'value': type.value, 'selected': (type.value == self.selectedType) }, type.label);
		}));

		typeSelect.addEventListener('change', function() {
			self.selectedType = typeSelect.value;
			self.renderChart();
		});

		var windowSelect = E('select', { 'id': 'clients-ov-window', 'name': 'clients-ov-window', 'class': 'cbi-input-select' }, WINDOWS.map(function(win) {
			return E('option', { 'value': String(win.minutes), 'selected': (win.minutes == self.windowMinutes) }, win.label);
		}));

		windowSelect.addEventListener('change', function() {
			self.windowMinutes = parseInt(windowSelect.value, 10) || 10;
			self.renderChart();
		});

		this.update();

		poll.add(L.bind(function() {
			var jobs;

			/* hidden covers two cases: the browser tab being in the background,
			 * and this pane not being the active tab of the page - the main
			 * view flips the flag when the user switches tabs. */
			if (document.hidden || this.hidden)
				return Promise.resolve();

			jobs = [ this.store.fetchSnapshot() ];

			if ((Date.now() - this.store.lastLeaseLoad) >= common.LEASE_INTERVAL * 1000)
				jobs.push(this.store.fetchLeases());

			if ((Date.now() - this.store.lastHistoryLoad) >= common.HISTORY_INTERVAL * 1000)
				jobs.push(this.store.loadHistory());

			return Promise.all(jobs).then(function() {
				self.update();
			}).catch(function(error) {
				L.error(error);
			});
		}, this), common.SAMPLE_INTERVAL);

		return E('div', { 'class': 'clients-pane' }, [
			E('div', { 'class': 'cbi-map-descr' },
				_('Aggregate traffic of every client this device can see, split between the local network and the internet.')),
			E('div', { 'class': 'cbi-section' }, [
				this.summary,
				E('h3', {}, _('Realtime traffic trends')),
				E('div', { 'class': 'clients-chart__controls' }, [
					E('label', { 'class': 'clients-control' }, [
						E('span', {}, _('Select device')),
						this.deviceSelect
					]),
					E('label', { 'class': 'clients-control' }, [
						E('span', {}, _('Type')),
						typeSelect
					]),
					E('label', { 'class': 'clients-control' }, [
						E('span', {}, _('Window')),
						windowSelect
					]),
					E('div', { 'class': 'clients-chart__legend' }, [
						E('span', { 'class': 'clients-chart__key clients-chart__key--up' }, _('Upload rate')),
						E('span', { 'class': 'clients-chart__key clients-chart__key--down' }, _('Download rate'))
					])
				]),
				this.chart,
				E('p', { 'class': 'clients-note' },
					_('Rates are differentiated from kernel conntrack counters, which keep counting for hardware-offloaded flows. The bracketed figures are what this view has seen while it was open - conntrack counters belong to a flow, so they are a floor, not a lifetime total.'))
			])
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
