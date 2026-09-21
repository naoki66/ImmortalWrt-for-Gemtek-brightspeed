'use strict';
'require rpc';
'require view';

/* Read-only view of what DAWN sees: every AP in the network, the clients on
 * each of them, and - in the hearing map - what every other AP hears from a
 * client. That last table is the one that makes a roaming problem
 * diagnosable: a client nobody else can hear is not going to be steered
 * anywhere, no matter how the scores are tuned.
 *
 * The data comes straight from ubus (dawn.get_network / dawn.get_hearing_map);
 * this page writes nothing. */

var callDawnNetwork = rpc.declare({
	object: 'dawn',
	method: 'get_network',
	expect: {}
});

var callDawnHearing = rpc.declare({
	object: 'dawn',
	method: 'get_hearing_map',
	expect: {}
});

var callHostHints = rpc.declare({
	object: 'luci-rpc',
	method: 'getHostHints',
	expect: {}
});

/* Design tokens: the same values the Mesh page inlines, mirrored here on
 * purpose - the two views ship in one package but are loaded independently,
 * and a shared module would turn "one file did not load" into "no styling at
 * all". Keep them in step with view/meshconf/meshconf.js. */
var css = [
	'.meshconf-page{--ds-surface:var(--background-color-high,#fff);--ds-surface-sunken:var(--background-color-medium,#f6f8fa);--ds-border:var(--border-color-low,#d8dee4);--ds-text:var(--text-color-high,#1f2328);--ds-text-muted:var(--text-color-low,#5c6773);--ds-primary:var(--primary-color-high,#0969da);--ds-ok:#1a7f37;--ds-ok-tint:rgba(26,127,55,.08);--ds-ok-line:rgba(26,127,55,.35);--ds-warn:#bc4c00;--ds-warn-tint:rgba(188,76,0,.08);--ds-warn-line:rgba(188,76,0,.35);--ds-error:#cf222e;--ds-error-tint:rgba(207,34,46,.08);--ds-error-line:rgba(207,34,46,.40);--ds-info:#0969da;--ds-info-tint:rgba(9,105,218,.08);--ds-info-line:rgba(9,105,218,.35);--ds-focus-ring:rgba(9,105,218,.32);--ds-r-sm:4px;--ds-r-md:6px;--ds-r-lg:8px;--ds-r-pill:999px;--ds-sp-1:.25em;--ds-sp-2:.5em;--ds-sp-3:.75em;--ds-sp-4:1em;--ds-sp-5:1.5em;--ds-fs-xs:.8em;--ds-fs-sm:.88em;--ds-fs-base:1em;--ds-fs-lg:1.1em;--ds-fs-2xl:1.6em;--ds-shadow-1:0 1px 2px rgba(16,24,40,.04);line-height:1.5;color:var(--ds-text)}',
	'.meshconf-page :focus-visible{outline:2px solid var(--ds-primary);outline-offset:2px}',
	'.meshconf-page h2{margin:0 0 var(--ds-sp-1);font-size:var(--ds-fs-2xl);line-height:1.3;font-weight:650;color:var(--ds-text)}',
	'.meshconf-page .nm-lede{margin:0 0 var(--ds-sp-4);color:var(--ds-text-muted);font-size:var(--ds-fs-sm)}',
	'.nm-section{margin:0 0 var(--ds-sp-5);padding:var(--ds-sp-4) var(--ds-sp-5);border:1px solid var(--ds-border);border-radius:var(--ds-r-lg);background:var(--ds-surface);box-shadow:var(--ds-shadow-1)}',
	'.nm-title{display:flex;align-items:center;justify-content:space-between;gap:var(--ds-sp-3);margin:0;font-size:var(--ds-fs-lg);font-weight:650}',
	'.nm-title .nm-muted{font-size:var(--ds-fs-sm);font-weight:400}',
	'.nm-subtitle{margin:var(--ds-sp-1) 0 var(--ds-sp-4);color:var(--ds-text-muted);font-size:var(--ds-fs-sm)}',
	'.nm-muted{color:var(--ds-text-muted)}',
	'.nm-hint{margin:var(--ds-sp-3) 0 0;font-size:var(--ds-fs-sm);line-height:1.6;color:var(--ds-text-muted)}',
	'.nm-table{width:100%;border-collapse:collapse;margin-top:var(--ds-sp-3);font-size:var(--ds-fs-sm)}',
	'.nm-table th,.nm-table td{border:1px solid var(--ds-border);padding:var(--ds-sp-1) var(--ds-sp-2);text-align:left;vertical-align:top;word-break:break-all}',
	'.nm-table th{background:var(--ds-surface-sunken);font-weight:650;color:var(--ds-text-muted);white-space:nowrap}',
	'.nm-table td.nowrap{white-space:nowrap}',
	'.nm-table .nm-mono,.nm-table .nm-state{font-size:.95em}',
	'.nm-mono{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:var(--ds-fs-xs)}',
	'.nm-state{display:inline-flex;align-items:center;min-height:19px;padding:0 var(--ds-sp-2);border-radius:var(--ds-r-sm);font-size:var(--ds-fs-xs);font-weight:650;background:var(--ds-surface-sunken);color:var(--ds-text-muted)}',
	'.nm-state.estab{background:var(--ds-ok-tint);color:var(--ds-ok)}',
	'.nm-banner{display:flex;gap:var(--ds-sp-2);align-items:flex-start;margin:var(--ds-sp-3) 0 0;padding:var(--ds-sp-2) var(--ds-sp-3);border:1px solid var(--ds-warn-line);border-radius:var(--ds-r-md);background:var(--ds-warn-tint);color:var(--ds-warn);font-size:var(--ds-fs-sm);line-height:1.6}',
	'.nm-banner.bad{border-color:var(--ds-error-line);background:var(--ds-error-tint);color:var(--ds-error)}',
	'.nm-banner.info{border-color:var(--ds-info-line);background:var(--ds-info-tint);color:var(--ds-info)}',
	'.nm-banner strong{display:block;margin-bottom:2px}',
	'.nm-banner.hidden{display:none}',
	'.nm-empty{display:flex;flex-direction:column;justify-content:center;min-height:90px;box-sizing:border-box;padding:var(--ds-sp-4);text-align:center;color:var(--ds-text-muted);border:1px dashed var(--ds-border);border-radius:var(--ds-r-md);margin-top:var(--ds-sp-3)}',
	'.nm-actions{display:flex;gap:var(--ds-sp-2);flex-wrap:wrap;margin-top:var(--ds-sp-4);padding-top:var(--ds-sp-3);border-top:1px solid var(--ds-border)}',
	'.nm-actions .cbi-button{min-height:34px}',
	/* A nested client table: LuCI collapses wide tables on small screens,
	 * which would fold the signal column into the one above it. */
	'.nm-table.nested{display:table;margin-top:0}',
	'@media(max-width:720px){.nm-title{flex-direction:column;align-items:flex-start;gap:var(--ds-sp-1)}}'
].join('\n');

var darkVars = ':root[data-darkmode="true"]{--ds-ok:#4ac26b;--ds-ok-tint:rgba(74,194,107,.18);--ds-ok-line:rgba(74,194,107,.45);--ds-warn:#e3934a;--ds-warn-tint:rgba(227,147,74,.18);--ds-warn-line:rgba(227,147,74,.45);--ds-error:#f47067;--ds-error-tint:rgba(244,112,103,.18);--ds-error-line:rgba(244,112,103,.5);--ds-info:#4d9cf6;--ds-info-tint:rgba(77,156,246,.18);--ds-info-line:rgba(77,156,246,.45);--ds-focus-ring:rgba(77,156,246,.45);--ds-shadow-1:none}';

function injectCSS() {
	var el = document.getElementById('meshconf-css');
	if (!el) {
		el = document.createElement('style');
		el.id = 'meshconf-css';
		document.head.appendChild(el);
	}
	el.textContent = css + '\n' + darkVars;
}

/* ---------------------------------------------------------------------------
 * formatting helpers
 * ------------------------------------------------------------------------- */
function hostName(hints, mac) {
	if (hints && hints[mac] && hints[mac].name)
		return hints[mac].name + ' (' + mac + ')';
	return mac || '-';
}

/* The channel is what tells two APs apart on the same band, and it is a fixed
 * arithmetic relation rather than a table: 2.4 GHz ch1 = 2412 MHz with 5 MHz
 * spacing, 5 GHz ch36 = 5180 MHz, 6 GHz ch1 = 5955 MHz. */
function channelOf(freq) {
	if (!freq) return '-';
	if (freq == 2484) return 14;
	if (freq < 2484) return Math.round((freq - 2407) / 5);
	if (freq >= 5950) return Math.round((freq - 5950) / 5);
	if (freq >= 4910 && freq <= 4980) return Math.round((freq - 4000) / 5);
	return Math.round((freq - 5000) / 5);
}

function freqText(freq) {
	if (!freq) return '-';
	return _('%s GHz (channel %s)').format((freq / 1000).toFixed(3), channelOf(freq));
}

/* DAWN reports channel utilization in 0-255, like hostapd does. */
function pct(raw) {
	var v = Number(raw);
	if (isNaN(v)) return '-';
	return (v / 2.55).toFixed(1) + '%';
}

function yesNo(v) {
	return v ? _('Supported') : '-';
}

function signalCell(signal) {
	var txt = (signal === undefined || signal === null) ? '-' : String(signal);
	return E('span', { 'class': 'nm-mono' }, txt);
}

/* ---------------------------------------------------------------------------
 * tables
 * ------------------------------------------------------------------------- */
function clientTable(ap, hints) {
	var rows = [];
	Object.keys(ap).forEach(function(k) {
		var c = ap[k];
		if (typeof c !== 'object' || c === null) return;
		rows.push(E('tr', {}, [
			E('td', {}, hostName(hints, k)),
			E('td', {}, yesNo(c.ht)),
			E('td', {}, yesNo(c.vht)),
			E('td', {}, signalCell(c.signal))
		]));
	});

	if (!rows.length)
		return E('em', {}, _('No clients'));

	return E('table', { 'class': 'nm-table nested' }, [
		E('thead', {}, E('tr', {}, [
			E('th', {}, _('Client')),
			E('th', { 'title': _('High Throughput') }, 'HT'),
			E('th', { 'title': _('Very High Throughput') }, 'VHT'),
			E('th', {}, _('Signal'))
		])),
		E('tbody', {}, rows)
	]);
}

function renderNetwork(net, hints) {
	var ssids = Object.keys(net || {});
	if (!ssids.length)
		return E('div', { 'class': 'nm-empty' }, _('DAWN has not learned any AP yet.'));

	var out = E('div', {});
	ssids.forEach(function(ssid) {
		var aps = net[ssid] || {};
		var rows = Object.keys(aps).map(function(bssid) {
			var ap = aps[bssid] || {};
			return E('tr', {}, [
				E('td', {}, [
					E('div', {}, ap.hostname || '-'),
					E('div', { 'class': 'nm-muted' }, ap.iface || '')
				]),
				E('td', { 'class': 'nowrap' }, E('span', { 'class': 'nm-mono' }, bssid)),
				E('td', {}, pct(ap.channel_utilization)),
				E('td', {}, freqText(ap.freq)),
				E('td', {}, String(ap.num_sta === undefined ? '-' : ap.num_sta)),
				E('td', {}, yesNo(ap.ht_support)),
				E('td', {}, yesNo(ap.vht_support)),
				E('td', {}, clientTable(ap, hints))
			]);
		});

		out.appendChild(E('div', { 'class': 'nm-section' }, [
			E('div', { 'class': 'nm-title' }, [
				E('span', {}, _('SSID: %s').format(ssid)),
				E('span', { 'class': 'nm-muted' }, _('%d APs').format(Object.keys(aps).length))
			]),
			E('p', { 'class': 'nm-subtitle' }, _('Each AP under the same SSID: the higher the utilization and client count, the more DAWN prefers to give a new client to another AP.')),
			E('table', { 'class': 'nm-table' }, [
				E('thead', {}, E('tr', {}, [
					E('th', {}, _('AP')),
					E('th', {}, _('BSSID')),
					E('th', { 'title': _('Channel utilization (scaled from 0-255)') }, _('Utilization')),
					E('th', {}, _('Frequency')),
					E('th', {}, _('Clients')),
					E('th', { 'title': _('High Throughput') }, 'HT'),
					E('th', { 'title': _('Very High Throughput') }, 'VHT'),
					E('th', {}, _('Client'))
				])),
				E('tbody', {}, rows)
			])
		]));
	});
	return out;
}

function renderHearing(hear, hints, net) {
	/* Who is already associated somewhere: the hearing map also lists APs a
	 * client only probed, and steering a client to an AP it never associated
	 * with is a different decision from moving one that already did. */
	var connected = {};
	Object.keys(net || {}).forEach(function(ssid) {
		connected[ssid] = [];
		Object.keys(net[ssid] || {}).forEach(function(bssid) {
			var ap = net[ssid][bssid] || {};
			Object.keys(ap).forEach(function(k) {
				if (typeof ap[k] === 'object' && ap[k] !== null) connected[ssid].push(k);
			});
		});
	});

	var ssids = Object.keys(hear || {});
	if (!ssids.length)
		return E('div', { 'class': 'nm-empty' }, _('No neighbour reports have been received yet (802.11k beacon reports must be enabled, or a client must send its own probe).'));

	var out = E('div', {});
	ssids.forEach(function(ssid) {
		var rows = [];
		var clients = hear[ssid] || {};
		Object.keys(clients).forEach(function(mac) {
			var aps = clients[mac] || {};
			Object.keys(aps).forEach(function(bssid) {
				var e = aps[bssid] || {};
				/* freq 0 means "DAWN knows the AP but never heard this client
				 * on it" - a row of zeroes tells you nothing. */
				if (!e.freq) return;
				rows.push(E('tr', {}, [
					E('td', {}, hostName(hints, mac)),
					E('td', {}, hostName(hints, bssid)),
					E('td', {}, freqText(e.freq)),
					E('td', {}, yesNo(e.ht_capabilities && e.ht_support)),
					E('td', {}, yesNo(e.vht_capabilities && e.vht_support)),
					E('td', {}, signalCell(e.signal)),
					E('td', {}, e.rcpi === undefined ? '-' : String(e.rcpi)),
					E('td', {}, e.rsni === undefined ? '-' : String(e.rsni)),
					E('td', {}, pct(e.channel_utilization)),
					E('td', {}, (connected[ssid] || []).indexOf(mac) >= 0
						? E('span', { 'class': 'nm-state estab' }, _('Connected'))
						: E('span', { 'class': 'nm-state' }, _('Probed only'))),
					E('td', {}, signalCell(e.score))
				]));
			});
		});

		out.appendChild(E('div', { 'class': 'nm-section' }, [
			E('div', { 'class': 'nm-title' }, [
				E('span', {}, _('Who hears whom: %s').format(ssid)),
				E('span', { 'class': 'nm-muted' }, _('%d entries').format(rows.length))
			]),
			E('p', { 'class': 'nm-subtitle' }, _('Each client\'s signal and score as seen by every AP. The higher the score, the more willing DAWN is to hand the client over; if a client only appears in one row, no other AP can hear it at all and no amount of tuning will make it steer.')),
			rows.length
				? E('table', { 'class': 'nm-table' }, [
					E('thead', {}, E('tr', {}, [
						E('th', {}, _('Client')),
						E('th', {}, _('AP')),
						E('th', {}, _('Frequency')),
						E('th', { 'title': _('High Throughput') }, 'HT'),
						E('th', { 'title': _('Very High Throughput') }, 'VHT'),
						E('th', {}, _('Signal')),
						E('th', { 'title': _('Received Channel Power Indication') }, 'RCPI'),
						E('th', { 'title': _('Received Signal to Noise Indicator') }, 'RSNI'),
						E('th', {}, _('Utilization')),
						E('th', {}, _('State')),
						E('th', {}, _('Score'))
					])),
					E('tbody', {}, rows)
				])
				: E('div', { 'class': 'nm-empty' }, _('No comparable records under this SSID yet.'))
		]));
	});
	return out;
}

/* ---------------------------------------------------------------------------
 * page
 * ------------------------------------------------------------------------- */
function dawnAvailable() {
	return rpc.list('dawn').then(function(sig) {
		return !!(sig && sig.dawn && sig.dawn.get_network && sig.dawn.get_hearing_map);
	}, function() {
		return false;
	});
}

function load(body) {
	body.innerHTML = '';
	body.appendChild(E('div', { 'class': 'nm-empty' }, _('Loading…')));

	return dawnAvailable().then(function(avail) {
		if (!avail) {
			body.innerHTML = '';
			body.appendChild(E('div', { 'class': 'nm-banner bad' }, [
				E('strong', {}, _('DAWN service unavailable')),
				E('div', {}, _('There is no dawn object on ubus: either dawn was not built into the firmware, or the service is not running. Enable and start it under "Mesh networking → Steering (DAWN)".')),
				E('div', { 'style': 'margin-top:.5em' }, [
					E('a', { 'href': L.url('admin/network/meshconf') }, _('Go to steering settings'))
				])
			]));
			return;
		}

		return Promise.all([ callDawnNetwork(), callDawnHearing(), callHostHints() ]).then(function(r) {
			body.innerHTML = '';
			body.appendChild(renderNetwork(r[0], r[2]));
			body.appendChild(renderHearing(r[1], r[2], r[0]));
		});
	}, function(e) {
		body.innerHTML = '';
		body.appendChild(E('div', { 'class': 'nm-banner bad' }, [
			E('strong', {}, _('Failed to read')),
			E('div', {}, e.message || _('An error occurred while querying DAWN.'))
		]));
	});
}

return view.extend({
	render: function() {
		injectCSS();

		var body = E('div');

		var refreshBtn = E('button', { 'class': 'cbi-button cbi-button-action' }, _('Refresh'));
		refreshBtn.addEventListener('click', function() {
			var self = refreshBtn, orig = self.textContent;
			self.disabled = true;
			self.textContent = _('Refreshing…');
			load(body).then(function() {
				self.disabled = false;
				self.textContent = orig;
			}, function() {
				self.disabled = false;
				self.textContent = orig;
			});
		});

		var root = E('div', { 'class': 'meshconf-page' }, [
			E('h2', {}, _('APs and clients')),
			E('p', { 'class': 'nm-lede' }, _('The whole network as DAWN sees it: which APs broadcast the same SSID, who is connected to each AP, and how loudly each client is heard by the other APs. Use it to tell whether roaming is actually working — instead of guessing.')),
			E('div', { 'class': 'nm-actions', 'style': 'margin-top:0;border-top:0;padding-top:0' }, [ refreshBtn ]),
			body
		]);

		load(body);

		return root;
	}
});
