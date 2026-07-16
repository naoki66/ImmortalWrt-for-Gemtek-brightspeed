'use strict';
'require view';
'require poll';
'require rpc';
'require ui';

/* ── Drop-delta tracking (all counters are cumulative since interface up) ── */
var _prevPseDrops    = null;
var _prevCdmHwfDrops = null;
var _prevBridgeDrops = null;
var _prevPpeBnd      = null;  // for tachometer heartbeat
var _maxUnbSeen      = 8;     // UNB scale denominator — only grows, never shrinks
var _prevWifiRetry   = {};    // keyed by band_idx: {tx_packets, tx_retries}
var _maxWifiThroughput = 1000; // legacy; superseded by per-band maxMbps in bandInfo
var _prevEthBytes    = {};    // iface -> {tx, rx, time}
var _maxEthMbps      = {};    // iface -> peak Mbps seen; grows, never shrinks

/* ── RPC Declarations ── */
var callNpuStatus        = rpc.declare({ object: 'luci.airoha_flowsense', method: 'getStatus' });
var callPpeEntries       = rpc.declare({ object: 'luci.airoha_flowsense', method: 'getPpeEntries' });
var callTokenInfo        = rpc.declare({ object: 'luci.airoha_flowsense', method: 'getTokenInfo' });
var callFrameEngine      = rpc.declare({ object: 'luci.airoha_flowsense', method: 'getFrameEngine' });
var callTxStats          = rpc.declare({ object: 'luci.airoha_flowsense', method: 'getTxStats' });
var callGetVlanOffload   = rpc.declare({ object: 'luci.airoha_flowsense', method: 'getVlanOffload' });
var callGetFlowOffload   = rpc.declare({ object: 'luci.airoha_flowsense', method: 'getFlowOffload' });
var callGetPppoeOffload      = rpc.declare({ object: 'luci.airoha_flowsense', method: 'getPppoeOffload' });
var callGetDeviceMode    = rpc.declare({ object: 'luci.airoha_flowsense', method: 'getDeviceMode' });
var callGetNpuBypass     = rpc.declare({ object: 'luci.airoha_flowsense', method: 'getNpuBypass' });
var callGetWanHealth     = rpc.declare({ object: 'luci.airoha_flowsense', method: 'getWanHealth' });
var callGetJitterResult  = rpc.declare({ object: 'luci.airoha_flowsense', method: 'getJitterResult' });
var callGetConflictAlerts= rpc.declare({ object: 'luci.airoha_flowsense', method: 'getConflictAlerts' });
var callGetWifiStats     = rpc.declare({ object: 'luci.airoha_flowsense', method: 'getWifiStats' });
var callGetBridgeStats   = rpc.declare({ object: 'luci.airoha_flowsense', method: 'getBridgeStats' });
var callGetEthStats      = rpc.declare({ object: 'luci.airoha_flowsense', method: 'getEthStats' });

/* ── Theme-adaptive CSS ── */
var themeCSS = '\
.soc-card{background:var(--soc-card-bg);border:1px solid var(--soc-border);border-radius:8px;padding:14px;transition:border-color .3s}\
.soc-card-accent{border-left-width:3px;border-left-style:solid}\
.soc-muted{color:var(--soc-muted)}\
.soc-text{color:var(--soc-text)}\
.soc-label{font-size:11px;color:var(--soc-muted)}\
.soc-bar-track{background:var(--soc-bar-track);border-radius:4px;overflow:hidden}\
.soc-pse-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:6px}\
.soc-pse-cell{background:var(--soc-card-bg);border:1px solid var(--soc-border);border-radius:5px;padding:6px 8px;font-size:12px}\
.soc-band-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:10px}\
.soc-gdm-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:10px}\
.soc-cdm-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:10px}\
.compass-wrap{display:flex;flex-direction:row;align-items:flex-end;gap:2px;padding:4px 0;flex-wrap:wrap}\
.eth-gauge-wrap{display:flex;flex-direction:row;gap:8px;flex-wrap:wrap;margin-top:8px}\
.compass-svg-wrap{flex-shrink:0;max-width:326px;width:100%}\
.compass-cards{display:flex;flex-direction:row;gap:8px;flex-wrap:wrap;margin-top:12px;margin-bottom:4px}\
.compass-card{background:var(--soc-card-bg);border:1px solid var(--soc-border);border-radius:8px;padding:10px 14px;flex:1;min-width:140px}\
.compass-card-title{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--soc-muted);margin-bottom:4px;font-family:monospace}\
.compass-card-value{font-size:20px;font-weight:700;line-height:1.1;font-family:monospace}\
.compass-card-sub{font-size:11px;color:var(--soc-muted);margin-top:3px}\
.mode-banner{display:flex;align-items:center;gap:12px;padding:8px 14px;border-radius:6px;margin-bottom:8px;border:1px solid var(--soc-border);background:var(--soc-card-bg)}\
.mode-badge{font-size:11px;font-weight:700;letter-spacing:1px;padding:3px 10px;border-radius:3px;font-family:monospace}\
.mode-router{background:rgba(0,200,255,0.15);color:#00c8ff;border:1px solid rgba(0,200,255,0.35)}\
.mode-ap{background:rgba(255,160,0,0.15);color:#ffa000;border:1px solid rgba(255,160,0,0.35)}\
.offload-badge{font-size:13px;font-weight:700;letter-spacing:1px;padding:0 10px;border-radius:3px;font-family:monospace;display:inline-flex;align-items:center;align-self:stretch}\
.offload-on{background:rgba(0,255,0,0.12);color:#00ff00;border:1px solid rgba(0,255,0,0.35)}\
.offload-off{background:rgba(255,160,0,0.15);color:#ffa000;border:1px solid rgba(255,160,0,0.35)}\
.alert-wrap{margin-bottom:8px}\
.alert-item{display:flex;align-items:flex-start;gap:10px;padding:8px 12px;border-radius:5px;margin-bottom:5px;font-size:13px}\
.alert-warning{border-left:3px solid #f5a623;background:rgba(245,166,35,0.1)}\
.alert-error{border-left:3px solid #d0021b;background:rgba(208,2,27,0.1)}\
.alert-icon{font-size:16px;line-height:1;flex-shrink:0;margin-top:1px}\
.alert-title{font-weight:600;margin-bottom:2px}\
.alert-msg{font-size:12px;color:var(--soc-muted)}\
@keyframes sqm-pulse{0%{opacity:0.2}50%{opacity:1}100%{opacity:0.2}}\
@keyframes ppe-blink{0%,100%{opacity:1}50%{opacity:0}}\
.ppe-terminal{background:#0c0c0c;border:1px solid #2a2a2a;border-radius:6px;overflow:hidden;display:flex;flex-direction:column;flex:1;min-width:220px}\
.ppe-terminal-bar{background:#1a1a1a;padding:5px 10px;display:flex;align-items:center;gap:5px;border-bottom:1px solid #2a2a2a;flex-shrink:0}\
.ppe-terminal-dot{width:10px;height:10px;border-radius:50%;display:inline-block;flex-shrink:0}\
.ppe-terminal-title{color:#555;font-size:10px;margin-left:6px;font-family:monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\
.ppe-terminal-body{padding:8px 10px;overflow-y:auto;flex:1;font-size:10px;line-height:1.55;color:#ccc;font-family:"Courier New",Courier,monospace;white-space:pre-wrap;word-break:break-all;min-height:200px}\
.ppe-cursor{animation:ppe-blink 1s step-end infinite}\
';

function isDarkMode() {
	var els = [document.body, document.querySelector('.main-content'), document.querySelector('#maincontent'), document.querySelector('.cbi-map')];
	for (var i = 0; i < els.length; i++) {
		if (!els[i]) continue;
		var bg = window.getComputedStyle(els[i]).backgroundColor;
		var m = bg.match(/\d+/g);
		if (m && m.length >= 3) {
			var a = m.length >= 4 ? parseFloat(m[3]) : 1;
			if (a < 0.1) continue;
			var lum = (parseInt(m[0]) * 299 + parseInt(m[1]) * 587 + parseInt(m[2]) * 114) / 1000;
			return lum < 128;
		}
	}
	var sheets = document.querySelectorAll('link[href*="dark"], link[href*="glass"]');
	return sheets.length > 0;
}

var _lastDarkMode = null;

function injectCSS() {
	var el = document.getElementById('soc-theme-css');
	if (!el) { el = document.createElement('style'); el.id = 'soc-theme-css'; document.head.appendChild(el); }
	var dark = isDarkMode();
	if (dark === _lastDarkMode) return;
	_lastDarkMode = dark;
	var vars = dark
		? ':root{--soc-card-bg:#1e1e1e;--soc-border:#333;--soc-muted:#999;--soc-text:#e0e0e0;--soc-bar-track:#333}'
		: ':root{--soc-card-bg:#fff;--soc-border:#d0d0d0;--soc-muted:#666;--soc-text:#222;--soc-bar-track:#e0e0e0}';
	el.textContent = themeCSS + vars;
}

/* ── Existing Helpers ── */
var bandInfo = [
	{ name: '2.4 GHz', accent: '#FFFFFF', rtyCol: '#EFBF04', maxMbps: 688   },
	{ name: '5 GHz',   accent: '#FFFFFF', rtyCol: '#305CDE', maxMbps: 5765  },
	{ name: '6 GHz',   accent: '#FFFFFF', rtyCol: '#2CFF05', maxMbps: 11529 }
];


function fmtFreq(khz) { return (!khz || khz === 0) ? 'N/A' : (khz / 1000).toFixed(0) + ' MHz'; }
function fmtK(n) {
	if (!n || n === 0) return '0';
	if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
	if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
	return n.toString();
}

function calcTotalMem(regions) {
	var t = 0;
	(regions || []).forEach(function(r) {
		var m = (r.size || '').match(/(\d+)\s*(KiB|MiB|GiB)/i);
		if (m) { var s = parseInt(m[1]); var u = m[2][0].toUpperCase(); t += u === 'G' ? s*1048576 : u === 'M' ? s*1024 : s; }
	});
	return t >= 1024 ? (t/1024).toFixed(0)+' MiB' : t+' KiB';
}

function pleHealth(free) {
	if (typeof free !== 'number' || free < 0) return { text: 'N/A', color: '#888' };
	if (free >= 1000000) return { text: 'OK',   color: '#4caf50' };
	if (free >=  100000) return { text: 'WARN', color: '#ff9800' };
	return { text: 'CRIT', color: '#f44336' };
}

function formatPleCount(free) {
	if (typeof free !== 'number' || free < 0) return '—';
	if (free >= 1000000) return (free/1000000).toFixed(1) + 'M';
	if (free >= 1000)    return Math.round(free/1000) + 'K';
	return free + '';
}

function getBandStats(ti, b) {
	var c = Array.isArray(ti.station_counts) ? ti.station_counts : [];
	for (var i=0;i<c.length;i++) if (c[i].band===b) return c[i];
	return { band:b, count:0, tx_packets:0, tx_retries:0 };
}

var _prevBandStats = [null, null, null];

function getBandDelta(current, band) {
	var prev = _prevBandStats[band];
	_prevBandStats[band] = { tx_packets: current.tx_packets || 0, tx_retries: current.tx_retries || 0 };
	if (!prev) return { band: band, count: current.count || 0, tx_packets: 0, tx_retries: 0 };
	var dp = (current.tx_packets || 0) - prev.tx_packets;
	var dr = (current.tx_retries || 0) - prev.tx_retries;
	if (dp < 0) dp = current.tx_packets || 0;
	if (dr < 0) dr = current.tx_retries || 0;
	return { band: band, count: current.count || 0, tx_packets: dp, tx_retries: dr };
}

function getTxQueue(ti, b) {
	var q = Array.isArray(ti.tx_queues) ? ti.tx_queues : [];
	for (var i=0;i<q.length;i++) if (q[i].band===b) return q[i];
	return null;
}

function bandHealth(s) {
	if (!s || s.count===0) return { text:'No clients', color:'#888' };
	if (!s.tx_packets) return { text:'Idle', color:'#888' };
	var r = s.tx_retries/(s.tx_packets+s.tx_retries);
	return r>0.5 ? {text:'Poor',color:'#f44336'} : r>0.2 ? {text:'Fair',color:'#ff9800'} : {text:'Good',color:'#4caf50'};
}

function retryPct(s) {
	if (!s || !s.tx_packets) return '-';
	return (s.tx_retries/(s.tx_packets+s.tx_retries)*100).toFixed(1)+'%';
}

function getTxStatsBand(txs, band) {
	var bands = txs && Array.isArray(txs.bands) ? txs.bands : [];
	for (var i = 0; i < bands.length; i++) if (bands[i].band === band) return bands[i];
	return null;
}

function perColor(per) { return per > 15 ? '#f44336' : per > 5 ? '#ff9800' : '#4caf50'; }

function renderBandChip(band, txQ, stats, txs) {
	var info = bandInfo[band] || { name: 'Band '+band, accent: '#888' };
	var id = 'band-'+band;
	var h = bandHealth(stats);
	var type = txQ ? txQ.type : '?';
	var rp = retryPct(stats);
	var rows = [
		E('div', { 'style': 'display:flex;justify-content:space-between;align-items:center;margin-bottom:6px' }, [
			E('span', { 'class': 'soc-text', 'style': 'font-size:13px;font-weight:bold' }, info.name),
			E('span', { 'style': 'background:'+(type==='npu'?'#1565c0':'#666')+';color:#fff;padding:1px 6px;border-radius:3px;font-size:9px;font-weight:600' }, type.toUpperCase())
		]),
		E('div', { 'style': 'display:flex;justify-content:space-between;align-items:center;font-size:12px' }, [
			E('div', { 'id': id+'-health', 'style': 'display:flex;align-items:center;gap:4px' }, [
				E('span', { 'style': 'width:7px;height:7px;border-radius:50%;background:'+h.color+';display:inline-block' }),
				E('span', { 'style': 'color:'+h.color+';font-weight:500' }, h.text)
			]),
			E('span', { 'id': id+'-clients', 'class': 'soc-muted' }, stats.count + ' sta'),
			(stats.tx_packets > 0) ? E('span', { 'id': id+'-retries', 'class': 'soc-muted' }, rp) : E('span')
		])
	];
	rows.push(E('div', { 'id': id+'-txstats', 'style': 'display:flex;gap:10px;font-size:11px;margin-top:5px;padding-top:4px;border-top:1px solid var(--soc-border)' },
		(txs && txs.attempts > 0) ? [
			E('span', { 'class': 'soc-muted' }, 'Drop:'),
			E('span', { 'style': 'color:'+(txs.drops > 0 ? '#f44336' : '#4caf50') }, fmtK(txs.drops)),
			E('span', { 'style': 'color:'+perColor(txs.per) }, txs.per+'%')
		] : [ E('span', { 'class': 'soc-muted' }, 'Drop: -') ]
	));
	return E('div', { 'id': id, 'style': 'background:var(--soc-card-bg);border:1px solid var(--soc-border);border-left:2px solid '+info.accent+';border-radius:6px;padding:10px 12px' }, rows);
}

function updateBandChip(band, stats) {
	var id = 'band-'+band, h = bandHealth(stats);
	var el = document.getElementById(id+'-health');
	if (el) { el.innerHTML = ''; el.appendChild(E('span',{'style':'width:6px;height:6px;border-radius:50%;background:'+h.color+';display:inline-block'})); el.appendChild(E('span',{'style':'color:'+h.color+';font-weight:500;font-size:11px'},h.text)); }
	var cl = document.getElementById(id+'-clients'); if (cl) cl.textContent = stats.count+'sta';
	var re = document.getElementById(id+'-retries'); if (re) re.textContent = retryPct(stats);
}

/* ── CPU Frequency State (used by CPU/NPU tachometer) ── */
function freqBarState(hw, min, max, pll, gov) {
	var pll_khz = (pll || 0) * 1000;
	// cpufreq sysfs missing (e.g. AN7581 broken DVFS) — fall back to PLL hardware read
	if (!hw && pll_khz > 0)
		return { freq: pll_khz, max: pll_khz, oc: false };
	var oc = gov==='performance' && pll>0 && pll_khz>max;
	return { freq: oc ? pll_khz : Math.min(hw,max), max: oc ? pll_khz : max, oc: oc };
}






function renderOffloadBadge(enabled, id) {
	return E('span', {
		'id': id,
		'class': 'offload-badge ' + (enabled ? 'offload-on' : 'offload-off')
	}, enabled ? _('Enabled') : _('Disabled'));
}

function renderVlanOffloadStatus(enabled) {
	return renderOffloadBadge(enabled, 'vlan-offload-status');
}

function renderFlowOffloadStatus(enabled) {
	return renderOffloadBadge(enabled, 'flow-offload-status');
}

function renderPppoeOffloadStatus(enabled) {
	return renderOffloadBadge(enabled, 'pppoe-offload-status');
}

/* ── PPE Panels ── */
function renderPpePanel(label, labelColor, stateLabel, stateClass, entries, total, showNew) {
	var rows = [
		E('tr', { 'class': 'tr cbi-section-table-titles' }, [
			E('th', { 'class': 'th', 'style': 'width:55px' }, _('Index')),
			E('th', { 'class': 'th', 'style': 'width:45px' }, _('State')),
			E('th', { 'class': 'th', 'style': 'width:65px' }, _('Type')),
			E('th', { 'class': 'th' }, _('Original'))
		].concat(showNew ? [ E('th', { 'class': 'th' }, _('Translated')) ] : []))
	];

	(entries || []).forEach(function(e) {
		rows.push(E('tr', { 'class': 'tr' }, [
			E('td', { 'class': 'td', 'style': 'font-size:11px;font-family:monospace' }, e.index||'-'),
			E('td', { 'class': 'td' }, E('span', { 'class': stateClass, 'style': 'font-size:10px' }, stateLabel)),
			E('td', { 'class': 'td', 'style': 'font-size:11px' }, (e.type||'').trim()),
			E('td', { 'class': 'td', 'style': 'font-size:11px;font-family:monospace;word-break:break-all' }, e.orig||'-')
		].concat(showNew ? [
			E('td', { 'class': 'td', 'style': 'font-size:11px;font-family:monospace;word-break:break-all' }, e.new_flow||'-')
		] : [])));
	});

	if (!entries || entries.length === 0) {
		rows.push(E('tr', { 'class': 'tr' }, [
			E('td', { 'class': 'td soc-muted', 'colspan': showNew ? '5' : '4', 'style': 'text-align:center;padding:12px' }, _('No entries'))
		]));
	}

	var countText = total + ' entries' + (total > 25 ? ' (showing 25)' : '');
	return E('div', { 'style': 'flex:1;min-width:0' }, [
		E('div', { 'style': 'display:flex;align-items:baseline;gap:8px;margin-bottom:6px' }, [
			E('span', { 'style': 'font-weight:700;font-size:13px;color:'+labelColor }, label),
			E('span', { 'class': 'soc-muted', 'style': 'font-size:11px', 'id': 'ppe-count-'+(showNew?'bnd':'unb') }, countText)
		]),
		E('div', { 'style': 'overflow-x:auto' }, [
			E('table', { 'class': 'table', 'id': 'ppe-table-'+(showNew?'bnd':'unb'), 'style': 'font-size:11px' }, rows)
		])
	]);
}

function renderPpePanels(ppe) {
	var bnd = ppe.bnd || { total: 0, entries: [] };
	var unb = ppe.unb || { total: 0, entries: [] };
	return E('div', { 'style': 'display:flex;gap:16px;align-items:flex-start' }, [
		renderPpePanel('BND — Hardware Offloaded', '#00c8ff', 'BND', 'label-success', bnd.entries, bnd.total, true),
		renderPpePanel('UNB — Pending / Learning', '#4caf50', 'UNB', '', unb.entries, unb.total, false)
	]);
}

function updatePpePanels(ppe) {
	var bnd = ppe.bnd || { total: 0, entries: [] };
	var unb = ppe.unb || { total: 0, entries: [] };

	function refreshPanel(tableId, countId, entries, total, showNew, stateLabel, stateClass) {
		var el = document.getElementById(countId);
		if (el) el.textContent = total + ' entries' + (total > 25 ? ' (showing 25)' : '');
		var tb = document.getElementById(tableId);
		if (!tb) return;
		while (tb.rows.length > 1) tb.deleteRow(1);
		if (!entries || entries.length === 0) {
			var row = tb.insertRow(-1); row.className = 'tr';
			var cell = row.insertCell(-1); cell.className = 'td soc-muted';
			cell.colSpan = showNew ? 5 : 4;
			cell.style.textAlign = 'center'; cell.style.padding = '12px';
			cell.textContent = 'No entries';
			return;
		}
		entries.forEach(function(e) {
			var row = tb.insertRow(-1); row.className = 'tr';
			var c1 = row.insertCell(-1); c1.className='td'; c1.style='font-size:11px;font-family:monospace'; c1.textContent=e.index||'-';
			var c2 = row.insertCell(-1); c2.className='td';
			var badge = document.createElement('span');
			if (stateClass) badge.className = stateClass;
			badge.style.fontSize = '10px';
			badge.textContent = stateLabel;
			c2.appendChild(badge);
			var c3 = row.insertCell(-1); c3.className='td'; c3.style='font-size:11px'; c3.textContent=(e.type||'').trim();
			var c4 = row.insertCell(-1); c4.className='td'; c4.style='font-size:11px;font-family:monospace;word-break:break-all'; c4.textContent=e.orig||'-';
			if (showNew) { var c5=row.insertCell(-1); c5.className='td'; c5.style='font-size:11px;font-family:monospace;word-break:break-all'; c5.textContent=e.new_flow||'-'; }
		});
	}

	refreshPanel('ppe-table-bnd', 'ppe-count-bnd', bnd.entries, bnd.total, true, 'BND', 'label-success');
	refreshPanel('ppe-table-unb', 'ppe-count-unb', unb.entries, unb.total, false, 'UNB', '');
}

/* ── PPE Tachometer (embedded inside compass inner fill) ── */
function buildTachoInner(ppe, cs, mode) {
	var bnd    = ppe.bnd || {};
	var unb    = ppe.unb || {};
	var bndTot = bnd.total || 0;
	var unbTot = unb.total || 0;
	var n4     = bnd.ipv4  || 0;
	var n6     = bnd.ipv6  || 0;

	// Heartbeat: fires once when new BND flows arrive this poll
	var pulsing = (_prevPpeBnd !== null && bndTot > _prevPpeBnd);
	_prevPpeBnd = bndTot;

	var TICKS = 90; // 4° per tick
	var cx = 150, cy = 150;
	// BND inner (anti-CW): 1 flow = 1 tick, max 90
	var bndLit = Math.min(TICKS, bndTot);
	// UNB outer (CW): sticky power-of-2 scale — grows when new peak is seen, never shrinks
	// This prevents the ring going backwards when UNB count drops across a scale boundary
	if (unbTot > _maxUnbSeen) _maxUnbSeen = unbTot;
	var UNB_SCALE = Math.pow(2, Math.ceil(Math.log2(_maxUnbSeen + 1)));
	UNB_SCALE = Math.max(UNB_SCALE, 8);
	var unbLit = Math.min(TICKS, Math.round((unbTot / UNB_SCALE) * TICKS));

	var modeText   = mode === 'ap' ? 'AP MODE' : 'ROUTER';
	var statusText = cs.npuActive ? 'HW ACCELERATED' : (cs.hwEnabled ? 'NPU IDLE' : 'CPU PATH');
	var statusCol  = cs.npuActive ? '#00c8ff' : (cs.hwEnabled ? '#888' : '#ff6b35');
	var bndColor   = bndTot > 0 ? '#00c8ff' : 'var(--soc-muted)';
	var unbColor   = unbTot > 0 ? '#ff9800' : 'var(--soc-muted)';

	var p = [];

	// Inner fill + dashed boundary ring (replaces old compass inner circles)
	p.push('<circle cx="150" cy="150" r="97" style="fill:var(--soc-border)" opacity="0.1"/>');
	p.push('<circle cx="150" cy="150" r="98" fill="none" stroke="var(--soc-border)" stroke-width="1" stroke-dasharray="3 5"/>');
	// Guide rings at scaled tick boundaries
	p.push('<circle cx="150" cy="150" r="56" fill="none" stroke="var(--soc-border)" stroke-width="0.5" opacity="0.35"/>');
	p.push('<circle cx="150" cy="150" r="69" fill="none" stroke="var(--soc-border)" stroke-width="0.5" opacity="0.35"/>');
	p.push('<circle cx="150" cy="150" r="83" fill="none" stroke="var(--soc-border)" stroke-width="0.5" opacity="0.35"/>');
	// Ring labels — at 9 and 3 o'clock inside the BND inner ring (r<56 from centre)
	p.push('<text x="107" y="153" text-anchor="middle" fill="#00c8ff" font-size="7" font-family="monospace" opacity="0.75">◄BND</text>');
	p.push('<text x="193" y="153" text-anchor="middle" fill="#ff9800" font-size="7" font-family="monospace" opacity="0.75">UNB►</text>');

	// Heartbeat pulse on BND ring when new flows arrive
	if (pulsing) {
		p.push('<circle cx="150" cy="150" r="63" fill="none" stroke="#00c8ff" stroke-width="2" opacity="0.6" style="animation:sqm-pulse 1.2s ease-out forwards"/>');
	}

	// 90 tick marks scaled to fit inside compass inner fill (r<98):
	//   BND inner anti-clockwise: r=57–67
	//   UNB outer clockwise:      r=71–81
	for (var i = 0; i < TICKS; i++) {
		// UNB outer: clockwise (r=71–81)
		var degU = (i / TICKS) * 360 - 90;
		var radU = degU * Math.PI / 180;
		var cU = Math.cos(radU), sU = Math.sin(radU);
		var litU = i < unbLit;
		var isEdgeU = litU && i === unbLit - 1;
		p.push('<line x1="'+(cx+71*cU).toFixed(1)+'" y1="'+(cy+71*sU).toFixed(1)+
		       '" x2="'+(cx+81*cU).toFixed(1)+'" y2="'+(cy+81*sU).toFixed(1)+
		       '" stroke="'+(litU?'#ff9800':'var(--soc-border)')+'"'+
		       ' stroke-width="1.5" stroke-linecap="round" opacity="'+(litU?'0.9':'0.22')+'"'+
		       (isEdgeU?' filter="url(#f-tn6)"':'')+' />');

		// BND inner: anti-clockwise (r=57–67)
		var degB = -90 - (i / TICKS) * 360;
		var radB = degB * Math.PI / 180;
		var cB = Math.cos(radB), sB = Math.sin(radB);
		var litB = i < bndLit;
		var isEdgeB = litB && i === bndLit - 1;
		p.push('<line x1="'+(cx+57*cB).toFixed(1)+'" y1="'+(cy+57*sB).toFixed(1)+
		       '" x2="'+(cx+67*cB).toFixed(1)+'" y2="'+(cy+67*sB).toFixed(1)+
		       '" stroke="'+(litB?'#00c8ff':'var(--soc-border)')+'"'+
		       ' stroke-width="1.5" stroke-linecap="round" opacity="'+(litB?'0.9':'0.22')+'"'+
		       (isEdgeB?' filter="url(#f-tn4)"':'')+' />');
	}

	// Centre readout — mode + status at top, BND count large, IPv4/IPv6 split, UNB below
	p.push('<text x="150" y="113" text-anchor="middle" fill="var(--soc-text)" font-size="9" font-weight="700" font-family="monospace" letter-spacing="2">'+modeText+'</text>');
	p.push('<text x="150" y="124" text-anchor="middle" fill="'+statusCol+'" font-size="7" font-family="monospace" letter-spacing="1">'+statusText+'</text>');
	p.push('<text x="150" y="144" text-anchor="middle" fill="'+bndColor+'" font-size="22" font-weight="700" font-family="monospace">'+bndTot+'</text>');
	p.push('<text x="150" y="155" text-anchor="middle" fill="var(--soc-muted)" font-size="7" font-family="monospace" letter-spacing="2">BND FLOWS</text>');
	p.push('<text x="117" y="175" text-anchor="middle" fill="#00c8ff"  font-size="8" font-family="monospace">v4: '+n4+'</text>');
	p.push('<text x="183" y="175" text-anchor="middle" fill="#9c27b0"  font-size="8" font-family="monospace">v6: '+n6+'</text>');
	p.push('<text x="150" y="189" text-anchor="middle" fill="'+unbColor+'" font-size="13" font-weight="700" font-family="monospace">'+unbTot+'</text>');
	p.push('<text x="150" y="200" text-anchor="middle" fill="var(--soc-muted)" font-size="7" font-family="monospace" letter-spacing="1.5">UNB FLOWS</text>');

	return p.join('');
}

/* ── PPE Terminal Panel ── */
function buildPpeTerminalBody(ppe) {
	var bnd = ppe.bnd || {}, unb = ppe.unb || {};
	var bndTot = bnd.total || 0, unbTot = unb.total || 0;
	var bndE = bnd.entries || [], unbE = unb.entries || [];

	var grn  = 'color:#55ff55';
	var wht  = 'color:#e0e0e0';
	var dim  = 'color:#555';
	var sep  = 'color:#333';
	var mute = 'color:#666';
	var cyn  = 'color:#00c8ff';
	var org  = 'color:#ff9800';
	var pur  = 'color:#9c27b0';
	var grey = 'color:#999';

	function sp(style, text) { return '<span style="'+style+'">'+text+'</span>'; }
	function esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
	// pad: pads or truncates plain string to exactly n chars, then HTML-escapes
	function pad(s, n) {
		s = s || '';
		if (s.length > n) return esc(s.substring(0, n-1)) + '\u2026';
		var out = esc(s);
		for (var i = s.length; i < n; i++) out += ' ';
		return out;
	}

	// Column widths (chars)
	var W = { idx: 6, state: 6, type: 9, orig: 45, flow: 45, eth: 37 };
	var lineLen = W.idx+2+W.state+2+W.type+2+W.orig+2+W.flow+2+W.eth;
	var divLine = '\u2500'.repeat(lineLen);

	function hdrRow() {
		return sp(mute,
			pad('Index',W.idx)+'  '+pad('State',W.state)+'  '+pad('Type',W.type)+'  '+
			pad('Original Flow',W.orig)+'  '+pad('New Flow',W.flow)+'  '+'Ethernet'
		) + '\n';
	}

	function entryRow(e, origCol) {
		var typeStr = (e.type||'') + (e.proto ? ' '+e.proto : '');
		var isV6 = (e.type||'').indexOf('IPv6') >= 0;
		var ipCol = isV6 ? pur : grey;
		var stCol = (e.state === 'BND' || e.state === 'BIND') ? cyn : org;
		return sp(dim,     pad(e.index||'????', W.idx))    + '  ' +
		       sp(stCol,   pad(e.state||'',     W.state))  + '  ' +
		       sp(ipCol,   pad(typeStr,          W.type))   + '  ' +
		       sp(origCol, pad(e.orig||'',       W.orig))   + '  ' +
		       sp(mute,    pad(e.new_flow||'-',  W.flow))   + '  ' +
		       sp(grey,    esc(e.eth||'-')) + '\n';
	}

	var s = '';

	// Prompt + command
	s += sp(grn,'root@OpenWrt') + sp(mute,':~# ') + sp(wht,'ppe status --watch') + '\n\n';

	// BND section
	s += sp(cyn,'■ BND') + '  ' + sp(wht, bndTot+' flows');
	s += '  ' + sp(mute,'(v4:'+(bnd.ipv4||0)+' v6:'+(bnd.ipv6||0)+')') + '\n';
	s += sp(sep, divLine) + '\n';

	if (bndTot === 0) {
		s += sp(mute,'  no entries') + '\n';
	} else {
		s += hdrRow();
		s += sp(sep, divLine) + '\n';
		bndE.forEach(function(e) { s += entryRow(e, cyn); });
		if (bndTot > bndE.length) s += sp(mute,'  +' + (bndTot - bndE.length) + ' more\n');
	}

	s += '\n';

	// UNB section
	s += sp(org,'■ UNB') + '  ' + sp(wht, unbTot+' flows') + '\n';
	s += sp(sep, divLine) + '\n';

	if (unbTot === 0) {
		s += sp(mute,'  no entries') + '\n';
	} else {
		s += hdrRow();
		s += sp(sep, divLine) + '\n';
		unbE.forEach(function(e) { s += entryRow(e, org); });
		if (unbTot > unbE.length) s += sp(mute,'  +' + (unbTot - unbE.length) + ' more\n');
	}

	s += '\n';
	s += sp(grn,'root@OpenWrt') + sp(mute,':~# ') + '<span class="ppe-cursor" style="'+wht+'">▌</span>';
	return s;
}

function renderPpeTerminal(ppe) {
	var bar = E('div', { 'class': 'ppe-terminal-bar' }, [
		E('span', { 'class': 'ppe-terminal-title' }, 'ppe_monitor  —  root@OpenWrt:~')
	]);
	var body = E('div', { 'class': 'ppe-terminal-body', 'id': 'ppe-terminal-body' });
	body.innerHTML = buildPpeTerminalBody(ppe);
	return E('div', { 'class': 'ppe-terminal' }, [ bar, body ]);
}

/* ── Compass Math ── */
function arcPt(cx, cy, r, deg) {
	var rad = deg * Math.PI / 180;
	return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function arcPath(cx, cy, r, startDeg, endDeg) {
	var s = arcPt(cx, cy, r, startDeg);
	var e = arcPt(cx, cy, r, endDeg);
	var span = endDeg - startDeg;
	if (span < 0) span += 360;
	var large = span > 180 ? 1 : 0;
	return 'M '+s[0].toFixed(1)+' '+s[1].toFixed(1)+
	       ' A '+r+' '+r+' 0 '+large+' 1 '+
	       e[0].toFixed(1)+' '+e[1].toFixed(1);
}

function needleTip(latencyMs) {
	// Full west arc 120°→240° (120° sweep). Log scale so low-latency range is sensitive.
	// 0ms = 120° (lower-left, good), 100ms = 240° (upper-left, bad/near north)
	var clamped = Math.min(Math.max(latencyMs||0, 0), 100);
	var logPct = Math.log(clamped + 1) / Math.log(101); // 0→0, 100ms→1
	var deg = 120 + logPct * 120;
	var rad = deg * Math.PI / 180;
	return [150 + 75 * Math.cos(rad), 150 + 75 * Math.sin(rad)];
}

function latencyColor(ms) {
	if (ms <= 20) return '#00cc44';
	if (ms <= 60) return '#f5a623';
	return '#d0021b';
}

/* ── Mode Banner ── */
function renderModeBanner(dm) {
	var mode = dm.mode || 'router';
	var reason = dm.reason || '';
	var reasonMap = { dhcp_disabled: 'DHCP disabled in UCI', no_wan: 'No WAN IP detected', local_gateway: 'Local gateway detected' };
	var reasonText = reasonMap[reason] || '';
	return E('div', { 'class': 'mode-banner' }, [
		E('span', { 'class': 'mode-badge ' + (mode==='ap' ? 'mode-ap' : 'mode-router') },
			mode === 'ap' ? 'AP MODE' : 'ROUTER MODE'),
		E('span', { 'class': 'soc-muted', 'style': 'font-size:12px' }, 'Auto-detected' + (reasonText ? ' \u2014 '+reasonText : '')),
		E('span', { 'id': 'mode-banner-status', 'style': 'margin-left:auto;font-size:12px;color:var(--soc-muted)' }, '')
	]);
}

/* ── Conflict Alerts ── */
function renderConflictAlerts(alertData) {
	var alerts = (alertData && Array.isArray(alertData.alerts)) ? alertData.alerts : [];
	if (!alerts.length) return E('div', { 'id': 'conflict-alerts' });
	var items = alerts.map(function(a) {
		var isErr = a.severity === 'error';
		return E('div', { 'class': 'alert-item ' + (isErr ? 'alert-error' : 'alert-warning') }, [
			E('span', { 'class': 'alert-icon' }, isErr ? '\u26A0' : '\u26A1'),
			E('div', {}, [
				E('div', { 'class': 'alert-title' }, a.title || ''),
				E('div', { 'class': 'alert-msg' }, a.message || '')
			])
		]);
	});
	return E('div', { 'id': 'conflict-alerts', 'class': 'alert-wrap' }, items);
}

/* ── HW Buffer Health (replaces SQM — NPU traffic bypasses qdisc entirely) ── */
function hwBufferState(fe, ppe, mode) {
	fe = fe || {}; ppe = ppe || {}; mode = mode || 'router';

	// PSE port drops: cumulative across all internal ports (0-9).
	// These include CDM/PPE internal paths that drop normally — not a reliable
	// congestion signal on their own. Track for display only.
	var ports = Array.isArray(fe.pse_ports) ? fe.pse_ports : [];
	var pseDrops = 0;
	ports.forEach(function(p) { pseDrops += (p.drops || 0); });

	// CDM HW-forwarding drops — frames the NPU forwarded that CDM couldn't accept.
	// More sensitive than GDM TX drops (which only fire at wire-level jam) and
	// directly reflects NPU path congestion.
	var cdmHwfDrops = ((fe.cdm1||{}).rx_hwf_drop||0) + ((fe.cdm2||{}).rx_hwf_drop||0);

	// Delta since last poll — null on first call (baseline only, no alarm)
	var pseDelta    = (_prevPseDrops    !== null && pseDrops    >= _prevPseDrops)    ? (pseDrops    - _prevPseDrops)    : 0;
	var cdmHwfDelta = (_prevCdmHwfDrops !== null && cdmHwfDrops >= _prevCdmHwfDrops) ? (cdmHwfDrops - _prevCdmHwfDrops) : 0;
	_prevPseDrops    = pseDrops;
	_prevCdmHwfDrops = cdmHwfDrops;

	// DROPPING on CDM HW-forwarding drops or very high PSE bursts (>200/poll).
	var activeDrop = cdmHwfDelta > 0 || pseDelta > 200;

	// PPE offload efficiency — BND/(BND+UNB). Shown in subtitle for info only.
	// LOW OFFLOAD state removed: low BND% when idle is expected, not a problem.
	var ppeBound = (ppe.bnd || {}).total || 0;
	var ppeUnb   = (ppe.unb || {}).total || 0;
	var ppeTotal = ppeBound + ppeUnb;
	var ppePct   = ppeTotal > 0 ? Math.round(ppeBound / ppeTotal * 100) : 0;

	var color = activeDrop ? '#f5a623' : '#00cc44';
	return {
		pseDrops: pseDrops, cdmHwfDrops: cdmHwfDrops, pseDelta: pseDelta, cdmHwfDelta: cdmHwfDelta,
		activeDrop: activeDrop,
		ppeBound: ppeBound, ppeTotal: ppeTotal, ppePct: ppePct,
		color: color, pulsing: activeDrop
	};
}

/* ── Compass SVG ── */
function compassState(bypass, hwBuf, jitter, wan, wifi, bridge, mode) {
	bypass = bypass || {}; hwBuf = hwBuf || {}; jitter = jitter || {};
	wan = wan || {}; wifi = wifi || {}; bridge = bridge || {};

	var npuActive = bypass.npu_active  === true;
	var hwEnabled = bypass.hw_offload_enabled === true;
	var cpuPct    = bypass.cpu_pct  || 0;
	var wanMbps   = bypass.wan_mbps || 0;

	// Latency — jitter daemon pings upstream and works in both router and AP mode
	var latMs = jitter.last_ping || 0;

	// Integrity / errors
	var errCount = 0;
	var eastAlarm = false;
	var worstSignal = 0;  // dBm — 0 means no data; always negative when valid
	// wbDelta holds per-band signal data; stored in cs so both render paths share it.
	var wbDelta = [];
	if (mode === 'router') {
		errCount = (wan.rx_errors||0) + (wan.tx_errors||0);
		eastAlarm = errCount > 0;
	} else {
		// AP mode: use per-station RSSI from iw station dump (signal avg field).
		// min_signal = worst (lowest dBm) station on that band — most meaningful
		// for link integrity since one weak client degrades the whole band's airtime.
		(wifi.bands||[]).filter(function(b){ return (b.stations||0) > 0; }).forEach(function(b) {
			var sig = b.min_signal || 0;
			wbDelta.push({ band: b.band, stations: b.stations, signal: sig, avg_signal: b.avg_signal || 0 });
			if (sig !== 0 && (worstSignal === 0 || sig < worstSignal)) worstSignal = sig;
		});
		// Alarm thresholds: < -75 dBm = weak link, < -82 dBm = poor link
		eastAlarm = worstSignal !== 0 && worstSignal < -75;
	}

	var eastColor;
	if (mode === 'router') {
		eastColor = eastAlarm ? '#d0021b' : '#00cc44';
	} else {
		eastColor = worstSignal === 0 ? '#888'
		          : worstSignal < -82  ? '#d0021b'
		          : worstSignal < -75  ? '#f5a623'
		          :                      '#00cc44';
	}
	return {
		npuActive:npuActive, hwEnabled:hwEnabled, cpuPct:cpuPct, wanMbps:wanMbps,
		hwBuf:hwBuf, mode:mode,
		latMs:latMs, errCount:errCount, eastAlarm:eastAlarm,
		wbDelta:wbDelta, worstSignal:worstSignal,
		latColor:latencyColor(latMs),
		eastColor: eastColor
	};
}

function buildCompassSVG(cs, mode, ppe) {
	var cx=150, cy=150;
	var npuOpacity  = cs.npuActive ? '1'    : cs.hwEnabled ? '0.45' : '0.2';
	var cpuOpacity  = !cs.hwEnabled ? '1'   : cs.npuActive ? '0.2'  : '0.45';
	var npuGlow     = cs.npuActive  ? ' filter="url(#f-cyan)"'   : '';
	var cpuGlow     = !cs.hwEnabled ? ' filter="url(#f-orange)"' : '';
	var eastOpacity = cs.eastAlarm ? '1' : '0.45';
	var eastGlow    = cs.eastAlarm ? ' filter="url(#f-red)"'  : '';
	var southOpacity= cs.hwBuf.pulsing ? '1' : '0.45';
	var southAnim   = cs.hwBuf.pulsing ? ' style="animation:sqm-pulse 1.5s ease-in-out infinite"' : '';
	var tip = needleTip(cs.latMs);
	var ppeRing = _cnPpeRingStyle(ppe);

	// Arc paths
	var pNpuOuter = arcPath(cx,cy,132, 210,330);
	var pNpuInner = arcPath(cx,cy,118, 210,330);
	var pEast     = arcPath(cx,cy,126, 300, 60);
	var pSouth    = arcPath(cx,cy,126,  30,150);
	var pWest     = arcPath(cx,cy,126, 120,240);

	// Text label paths (pre-computed at r=140 for north, r=138 for others)
	// North CW 215→325: text curves along top, reads L→R
	var tpN = 'M 35.3 69.7 A 140 140 0 0 1 264.7 69.7';
	// South CCW 150→30: text curves along bottom, reads L→R
	var tpS = 'M 30.5 219.0 A 138 138 0 0 0 269.5 219.0';
	// East CW 300→60: text curves along right side, reads top→bottom
	var tpE = 'M 219.0 30.5 A 138 138 0 0 1 219.0 269.5';
	// West CCW 240→120: text curves along left side, reads top→bottom
	var tpW = 'M 81.0 30.5 A 138 138 0 0 0 81.0 269.5';

	return '<svg viewBox="-8 -8 316 316" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:326px;display:block;margin:0 auto">' +
	'<defs>' +
	'<filter id="f-cyan"  x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
	'<filter id="f-orange" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
	'<filter id="f-red"   x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
	'<filter id="f-tn4"  x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
	'<filter id="f-tn6"  x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
	'<path id="tp-north" d="'+tpN+'" fill="none"/>' +
	'<path id="tp-south" d="'+tpS+'" fill="none"/>' +
	'<path id="tp-east"  d="'+tpE+'" fill="none"/>' +
	'<path id="tp-west"  d="'+tpW+'" fill="none"/>' +
	'</defs>' +
	// Outer background
	'<circle cx="150" cy="150" r="148" style="fill:var(--soc-card-bg)" stroke="var(--soc-border)" stroke-width="1"/>' +
	// Tachometer embedded inside compass inner fill
	'<g id="cp-tacho">'+buildTachoInner(ppe, cs, mode)+'</g>' +
	// North: NPU arc (outer, cyan)
	'<path id="cp-arc-npu" d="'+pNpuOuter+'" fill="none" stroke="#00c8ff" stroke-width="10" stroke-linecap="round" opacity="'+npuOpacity+'"'+npuGlow+'/>' +
	// North: CPU arc (inner, orange)
	'<path id="cp-arc-cpu" d="'+pNpuInner+'" fill="none" stroke="#ff6b35" stroke-width="8"  stroke-linecap="round" opacity="'+cpuOpacity+'"'+cpuGlow+'/>' +
	// East: integrity arc
	'<path id="cp-arc-east" d="'+pEast+'" fill="none" stroke="'+cs.eastColor+'" stroke-width="9" stroke-linecap="round" opacity="'+eastOpacity+'"'+eastGlow+'/>' +
	// South: HW buffer arc
	'<path id="cp-arc-south" d="'+pSouth+'" fill="none" stroke="'+cs.hwBuf.color+'" stroke-width="9" stroke-linecap="round" opacity="'+southOpacity+'"'+southAnim+'/>' +
	// West: latency arc
	'<path id="cp-arc-west" d="'+pWest+'" fill="none" stroke="'+cs.latColor+'" stroke-width="9" stroke-linecap="round" opacity="0.7"/>' +
	// Quadrant labels — curved textPath following each arc
	'<text font-size="9" font-family="monospace" letter-spacing="1.5" opacity="0.75" fill="#00c8ff"><textPath href="#tp-north" startOffset="50%" text-anchor="middle">NPU PATH</textPath></text>' +
	'<text font-size="9" font-family="monospace" letter-spacing="1.5" opacity="0.75" id="cp-lbl-south"><textPath href="#tp-south" startOffset="50%" text-anchor="middle">HW BUFFER</textPath></text>' +
	'<text font-size="9" font-family="monospace" letter-spacing="1.5" opacity="0.75" id="cp-lbl-east"><textPath href="#tp-east"  startOffset="50%" text-anchor="middle">INTEGRITY</textPath></text>' +
	'<text font-size="9" font-family="monospace" letter-spacing="1.5" opacity="0.75" id="cp-lbl-west"><textPath href="#tp-west"  startOffset="50%" text-anchor="middle">LATENCY</textPath></text>' +
	// Latency needle
	'<line id="cp-needle" x1="150" y1="150" x2="'+tip[0].toFixed(1)+'" y2="'+tip[1].toFixed(1)+'" stroke="'+cs.latColor+'" stroke-width="2.5" stroke-linecap="round" opacity="0.9"/>' +
	'<circle id="cp-needle-pivot" cx="150" cy="150" r="4" fill="'+cs.latColor+'" opacity="0.9"/>' +
	// PPE state ring outside compass disc — cyan=BND present, invisible otherwise
	'<circle id="cp-ppe-glow" cx="150" cy="150" r="150" fill="none" stroke="'+ppeRing.color+'" stroke-width="5" style="'+ppeRing.style+'"/>' +
	// Solid silver outer ring — outermost dashboard border
	'<circle cx="150" cy="150" r="155" fill="none" stroke="#222222" stroke-width="2.5"/>' +
	'</svg>';
}

function updateCompassSVG(cs, mode, ppe) {
	function sa(id, attr, val) { var el=document.getElementById(id); if(el) el.setAttribute(attr, val); }

	var npuOpacity  = cs.npuActive ? '1'    : cs.hwEnabled ? '0.45' : '0.2';
	var cpuOpacity  = !cs.hwEnabled ? '1'   : cs.npuActive ? '0.2'  : '0.45';
	var eastOpacity = cs.eastAlarm ? '1' : '0.45';
	var southOpacity= cs.hwBuf.pulsing ? '1' : '0.45';
	var tip = needleTip(cs.latMs);

	sa('cp-arc-npu',   'opacity', npuOpacity);
	sa('cp-arc-cpu',   'opacity', cpuOpacity);
	sa('cp-arc-east',  'stroke',  cs.eastColor);
	sa('cp-arc-east',  'opacity', eastOpacity);
	sa('cp-arc-south', 'stroke',  cs.hwBuf.color);
	sa('cp-arc-south', 'opacity', southOpacity);
	sa('cp-arc-west',  'stroke',  cs.latColor);

	// SQM pulse animation
	var south = document.getElementById('cp-arc-south');
	if (south) south.style.animation = cs.hwBuf.pulsing ? 'sqm-pulse 1.5s ease-in-out infinite' : '';

	// NPU glow
	var arcNpu = document.getElementById('cp-arc-npu');
	if (arcNpu) { if(cs.npuActive) arcNpu.setAttribute('filter','url(#f-cyan)'); else arcNpu.removeAttribute('filter'); }
	var arcCpu = document.getElementById('cp-arc-cpu');
	if (arcCpu) { if(!cs.hwEnabled) arcCpu.setAttribute('filter','url(#f-orange)'); else arcCpu.removeAttribute('filter'); }
	var arcEast = document.getElementById('cp-arc-east');
	if (arcEast) { if(cs.eastAlarm) arcEast.setAttribute('filter','url(#f-red)'); else arcEast.removeAttribute('filter'); }

	sa('cp-needle',       'x2',    tip[0].toFixed(1));
	sa('cp-needle',       'y2',    tip[1].toFixed(1));
	sa('cp-needle',       'stroke',cs.latColor);
	sa('cp-needle-pivot', 'fill',  cs.latColor);
	sa('cp-lbl-south',    'fill',  cs.hwBuf.color);
	sa('cp-lbl-west',     'fill',  cs.latColor);
	sa('cp-lbl-east',     'fill',  cs.eastColor);

	// Rebuild tachometer group (also updates mode/status text inside)
	var tg = document.getElementById('cp-tacho');
	if (tg) tg.innerHTML = buildTachoInner(ppe, cs, mode);

	// PPE state ring on compass outer edge
	var ppeGlow = document.getElementById('cp-ppe-glow');
	if (ppeGlow) {
		var ppeRing = _cnPpeRingStyle(ppe);
		ppeGlow.setAttribute('stroke', ppeRing.color);
		ppeGlow.setAttribute('style', ppeRing.style);
	}
}

/* ── CPU/NPU Load Tachometer ── */
function buildCpuNpuTacho(cs, ppe, st, ti) {
	st = st || {};
	var cpuPct     = cs.cpuPct || 0;
	var ppeBound   = (ppe.bnd || {}).total || 0;
	var ppeUnb     = (ppe.unb || {}).total || 0;
	var ppeTotal   = ppeBound + ppeUnb;
	var offloadPct = ppeTotal > 0 ? Math.round(ppeBound / ppeTotal * 100)
	               : (cs.npuActive ? 100 : 0);

	// CPU frequency — same source as the existing freq bar
	var fs       = freqBarState(st.cpu_hw_freq, st.cpu_min_freq, st.cpu_max_freq, st.pll_freq_mhz, st.cpu_governor);
	var freqMhz  = Math.round(fs.freq / 1000);
	var governor = (st.cpu_governor && st.cpu_governor !== 'unknown') ? st.cpu_governor.toUpperCase() : '';

	// Colours
	var npuStatusCol = cs.npuActive ? '#00c8ff' : (cs.hwEnabled ? '#888' : '#ff6b35');
	var npuStatus    = cs.npuActive ? 'HW ACCELERATED' : (cs.hwEnabled ? 'NPU IDLE' : 'CPU PATH');
	var npuColor     = offloadPct > 60 ? '#00c8ff' : offloadPct > 30 ? '#f5a623' : '#888';

	var TICKS = 90;
	// Outer ring (CW, r=71-81): CPU frequency, 500–1400 MHz
	var FREQ_MIN = 500, FREQ_MAX = 1400;
	var freqLit = Math.round(Math.max(0, Math.min(TICKS, (freqMhz - FREQ_MIN) / (FREQ_MAX - FREQ_MIN) * TICKS)));
	// Inner ring (anti-CW, r=57-67): CPU load, 0–100% = full scale
	var cpuLit = Math.round(Math.min(cpuPct, 100) / 100 * TICKS);

	var cx = 150, cy = 150;
	var p = [];

	// Inner fill + boundary rings
	p.push('<circle cx="150" cy="150" r="97" style="fill:var(--soc-border)" opacity="0.1"/>');
	p.push('<circle cx="150" cy="150" r="98" fill="none" stroke="var(--soc-border)" stroke-width="1" stroke-dasharray="3 5"/>');
	p.push('<circle cx="150" cy="150" r="56" fill="none" stroke="var(--soc-border)" stroke-width="0.5" opacity="0.35"/>');
	p.push('<circle cx="150" cy="150" r="69" fill="none" stroke="var(--soc-border)" stroke-width="0.5" opacity="0.35"/>');
	p.push('<circle cx="150" cy="150" r="83" fill="none" stroke="var(--soc-border)" stroke-width="0.5" opacity="0.35"/>');

	// Ring labels at 9 and 3 o'clock
	p.push('<text x="107" y="153" text-anchor="middle" fill="#ffe066" font-size="7" font-family="monospace" opacity="0.75">◄LOAD</text>');
	p.push('<text x="193" y="153" text-anchor="middle" fill="#00cc44" font-size="7" font-family="monospace" opacity="0.75">FREQ►</text>');

	// Tachometer ticks
	for (var i = 0; i < TICKS; i++) {
		// Outer ring (CW, r=71-81): CPU frequency
		var degU = (i / TICKS) * 360 - 90;
		var radU = degU * Math.PI / 180;
		var cU = Math.cos(radU), sU = Math.sin(radU);
		var litU = i < freqLit, isEdgeU = litU && i === freqLit - 1;
		p.push('<line x1="'+(cx+71*cU).toFixed(1)+'" y1="'+(cy+71*sU).toFixed(1)+
		       '" x2="'+(cx+81*cU).toFixed(1)+'" y2="'+(cy+81*sU).toFixed(1)+
		       '" stroke="'+(litU ? '#00cc44' : 'var(--soc-border)')+'"'+
		       ' stroke-width="1.5" stroke-linecap="round" opacity="'+(litU?'0.9':'0.22')+'"'+
		       (isEdgeU?' filter="url(#f-cn-cpu)"':'')+' />');

		// Inner ring (anti-CW, r=57-67): CPU load
		var degB = -90 - (i / TICKS) * 360;
		var radB = degB * Math.PI / 180;
		var cB = Math.cos(radB), sB = Math.sin(radB);
		var litB = i < cpuLit, isEdgeB = litB && i === cpuLit - 1;
		p.push('<line x1="'+(cx+57*cB).toFixed(1)+'" y1="'+(cy+57*sB).toFixed(1)+
		       '" x2="'+(cx+67*cB).toFixed(1)+'" y2="'+(cy+67*sB).toFixed(1)+
		       '" stroke="'+(litB ? '#ffe066' : 'var(--soc-border)')+'"'+
		       ' stroke-width="1.5" stroke-linecap="round" opacity="'+(litB?'0.9':'0.22')+'"'+
		       (isEdgeB?' filter="url(#f-cn-npu)"':'')+' />');
	}

	// Centre readout
	if (governor) p.push('<text x="150" y="118" text-anchor="middle" fill="var(--soc-text)" font-size="7" font-family="monospace" letter-spacing="1">'+governor+'</text>');
	if (freqMhz)  p.push('<text x="150" y="130" text-anchor="middle" fill="#00cc44" font-size="9" font-weight="700" font-family="monospace">'+freqMhz+' MHz</text>');
	p.push('<text x="150" y="148" text-anchor="middle" fill="#ffe066" font-size="22" font-weight="700" font-family="monospace">'+cpuPct+'%</text>');
	p.push('<text x="150" y="159" text-anchor="middle" fill="#ffe066" font-size="7" font-family="monospace" letter-spacing="2">CPU LOAD</text>');
	p.push('<text x="150" y="175" text-anchor="middle" fill="'+npuStatusCol+'" font-size="8" font-family="monospace">'+npuStatus+'</text>');
	p.push('<text x="150" y="190" text-anchor="middle" fill="'+npuColor+'" font-size="13" font-weight="700" font-family="monospace">'+offloadPct+'%</text>');
	p.push('<text x="150" y="200" text-anchor="middle" fill="var(--soc-muted)" font-size="7" font-family="monospace" letter-spacing="1.5">OFFLOADED</text>');

	// PLE pool — curved textPath at r=91, south arc (CCW 160°→20°), outside the freq ring.
	// Matches the "UNB/BND FLOWS" curved-text style used on the WiFi band gauges.
	var pleFree = (ti && typeof ti.ple_free === 'number') ? ti.ple_free : -1;
	var pleH    = pleHealth(pleFree);
	var pleStr  = formatPleCount(pleFree);
	var plR  = 91;
	var plSX = (150 + plR * Math.cos(160 * Math.PI / 180)).toFixed(1);
	var plSY = (150 + plR * Math.sin(160 * Math.PI / 180)).toFixed(1);
	var plEX = (150 + plR * Math.cos( 20 * Math.PI / 180)).toFixed(1);
	var plEY = (150 + plR * Math.sin( 20 * Math.PI / 180)).toFixed(1);
	p.push('<defs><path id="cn-ple-arc" d="M '+plSX+' '+plSY+' A '+plR+' '+plR+' 0 0 0 '+plEX+' '+plEY+'" fill="none"/></defs>');
	p.push('<text font-size="8" font-family="monospace" fill="'+pleH.color+'" opacity="0.9" letter-spacing="1"><textPath href="#cn-ple-arc" startOffset="50%" text-anchor="middle">PLE '+pleStr+' ● '+pleH.text+'</textPath></text>');

	return p.join('');
}

function _cnPpeRingStyle(ppe, ti) {
	// PLE pool health overrides the BND-based cyan default when the WiFi TX buffer pool
	// drops toward zero — that's the precursor signal for mt7996 SER / TX wedge.
	var ple = (ti && typeof ti.ple_free === 'number') ? ti.ple_free : -1;
	if (ple >= 0 && ple < 100000) {
		return { style: 'filter:blur(6px);opacity:0.85', color: '#f44336' };
	}
	if (ple >= 0 && ple < 1000000) {
		return { style: 'filter:blur(5px);opacity:0.7',  color: '#ff9800' };
	}

	// Default: cyan-on-BND, invisible when no BND
	var bnd = (ppe && ppe.bnd) ? (ppe.bnd.total || 0) : 0;
	if (bnd === 0) return { style: 'opacity:0', color: '#00c8ff' };
	var intensity = Math.min(1, bnd / 100);
	var blur = (3 + intensity * 6).toFixed(1);
	var op   = (0.5 + intensity * 0.45).toFixed(2);
	return { style: 'filter:blur('+blur+'px);opacity:'+op, color: '#00c8ff' };
}

function buildCpuNpuCompassSVG(cs, ppe, st, ti) {
	// viewBox tightly wraps the tachometer (r=102 outer circle + glow headroom + silver ring)
	var ring = _cnPpeRingStyle(ppe, ti);
	return '<svg viewBox="30 30 240 240" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:213px;display:block;margin:0 auto">' +
	'<defs>' +
	'<filter id="f-cn-cpu" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
	'<filter id="f-cn-npu" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
	'</defs>' +
	// PPE/PLE-state ring rendered BEFORE outer circle so the circle fill covers the inward bleed
	'<circle id="cn-glow" cx="150" cy="150" r="104" fill="none" stroke="'+ring.color+'" stroke-width="6" style="'+ring.style+'"/>' +
	// Outer border — tight around the tachometer content
	'<circle cx="150" cy="150" r="102" style="fill:var(--soc-card-bg)" stroke="var(--soc-border)" stroke-width="1"/>' +
	'<g id="cn-tacho">'+buildCpuNpuTacho(cs, ppe, st, ti)+'</g>' +
	// Solid silver outer ring — sits outside the PPE/PLE glow ring
	'<circle cx="150" cy="150" r="109" fill="none" stroke="#222222" stroke-width="2.5"/>' +
	'</svg>';
}

function updateCpuNpuCompassSVG(cs, ppe, st, ti) {
	// Update PPE/PLE-state ring on the outer border
	var glow = document.getElementById('cn-glow');
	if (glow) {
		var ring = _cnPpeRingStyle(ppe, ti);
		glow.setAttribute('stroke', ring.color);
		glow.setAttribute('style', ring.style);
	}

	var tg = document.getElementById('cn-tacho');
	if (tg) tg.innerHTML = buildCpuNpuTacho(cs, ppe, st, ti);
}

/* ── WiFi Band Tachometers ── */
function _wifiBandHealth(ws) {
	var stations = ws ? (ws.stations || 0) : 0;
	if (stations === 0) return { text: 'NO CLIENTS', color: '#888' };
	var rty = ws.retry_pct || 0;
	if (rty > 50) return { text: 'WEAK', color: '#f44336' };
	if (rty > 20) return { text: 'FAIR', color: '#ff9800' };
	return { text: 'GOOD', color: '#4caf50' };
}

function _wifiPpeRingStyle(ws, ppe, bandIdx) {
	ws = ws || {};
	// No ring if this band has no connected clients
	if ((ws.stations || 0) === 0) return { style: 'opacity:0', color: '#888' };
	// Per-band BND count drives cyan; invisible when no BND flows for this band
	var bandBnd = (ppe && ppe.bnd && Array.isArray(ppe.bnd.band_bnd)) ? (ppe.bnd.band_bnd[bandIdx] || 0) : 0;
	if (bandBnd === 0) return { style: 'opacity:0', color: '#888' };
	// BND >= 1 for this band: cyan, brighter as count grows (saturates ~100 flows)
	var intensity = Math.min(1, bandBnd / 100);
	var blur = (3 + intensity * 6).toFixed(1);
	var op   = (0.5 + intensity * 0.45).toFixed(2);
	return { style: 'filter:blur('+blur+'px);opacity:'+op, color: '#00c8ff' };
}

function buildWifiBandTacho(bandIdx, ws, qType, bndCount, unbCount) {
	ws = ws || {};
	var info    = bandInfo[bandIdx] || { name: 'Band '+bandIdx, accent: '#888' };
	var accent   = info.accent;
	var retryCol = info.rtyCol || '#888';
	// Effective throughput: link capacity × success rate (1 − retry fraction)
	// Uses avg_exp_throughput since MT7996 HW TX path bypasses all kernel byte counters
	var mbps    = (ws.avg_exp_throughput || 0) * (100 - (ws.retry_pct || 0)) / 100;
	var retryVal = ws.retry_pct || 0;
	var stations = ws.stations || 0;
	var signal   = ws.avg_signal || 0;
	var isNpu    = qType === 'npu';

	var maxScale = info.maxMbps || 1000;

	var TICKS = 90;
	var txLit    = Math.round(Math.min(TICKS, (mbps / maxScale) * TICKS));
	var retryLit = Math.round(retryVal / 100 * TICKS); // 0–100% maps to 0–90 ticks

	var cx = 150, cy = 150;
	var p = [];

	// Background boundary rings
	p.push('<circle cx="150" cy="150" r="97" style="fill:var(--soc-border)" opacity="0.1"/>');
	p.push('<circle cx="150" cy="150" r="98" fill="none" stroke="var(--soc-border)" stroke-width="1" stroke-dasharray="3 5"/>');
	p.push('<circle cx="150" cy="150" r="56" fill="none" stroke="var(--soc-border)" stroke-width="0.5" opacity="0.35"/>');
	p.push('<circle cx="150" cy="150" r="69" fill="none" stroke="var(--soc-border)" stroke-width="0.5" opacity="0.35"/>');
	p.push('<circle cx="150" cy="150" r="83" fill="none" stroke="var(--soc-border)" stroke-width="0.5" opacity="0.35"/>');

	// Ring labels at 9 / 3 o'clock
	p.push('<text x="107" y="153" text-anchor="middle" fill="'+retryCol+'" font-size="7" font-family="monospace" opacity="0.75">◄RTY</text>');
	p.push('<text x="193" y="153" text-anchor="middle" fill="'+accent+'" font-size="7" font-family="monospace" opacity="0.75">TX►</text>');

	// Tachometer ticks
	for (var i = 0; i < TICKS; i++) {
		// Outer ring CW (r=71-81): TX throughput
		var degU = (i / TICKS) * 360 - 90;
		var radU = degU * Math.PI / 180;
		var cU = Math.cos(radU), sU = Math.sin(radU);
		var litU = i < txLit, edgeU = litU && i === txLit - 1;
		p.push('<line x1="'+(cx+71*cU).toFixed(1)+'" y1="'+(cy+71*sU).toFixed(1)+
		       '" x2="'+(cx+81*cU).toFixed(1)+'" y2="'+(cy+81*sU).toFixed(1)+
		       '" stroke="'+(litU ? accent : 'var(--soc-border)')+'"'+
		       ' stroke-width="1.5" stroke-linecap="round" opacity="'+(litU?'0.9':'0.22')+'"'+
		       (edgeU?' filter="url(#f-wifi-tx-'+bandIdx+')"':'')+' />');

		// Inner ring anti-CW (r=57-67): retry health
		var degB = -90 - (i / TICKS) * 360;
		var radB = degB * Math.PI / 180;
		var cB = Math.cos(radB), sB = Math.sin(radB);
		var litB = i < retryLit, edgeB = litB && i === retryLit - 1;
		p.push('<line x1="'+(cx+57*cB).toFixed(1)+'" y1="'+(cy+57*sB).toFixed(1)+
		       '" x2="'+(cx+67*cB).toFixed(1)+'" y2="'+(cy+67*sB).toFixed(1)+
		       '" stroke="'+(litB ? retryCol : 'var(--soc-border)')+'"'+
		       ' stroke-width="1.5" stroke-linecap="round" opacity="'+(litB?'0.9':'0.22')+'"'+
		       (edgeB?' filter="url(#f-wifi-rty-'+bandIdx+')"':'')+' />');
	}

	// UNB count arc at 12 o'clock (curved textPath, r=91, CW 200°→340°)
	var unbCnt = unbCount || 0;
	var uR = 91;
	var uSX = (150 + uR * Math.cos(200 * Math.PI / 180)).toFixed(1);
	var uSY = (150 + uR * Math.sin(200 * Math.PI / 180)).toFixed(1);
	var uEX = (150 + uR * Math.cos(340 * Math.PI / 180)).toFixed(1);
	var uEY = (150 + uR * Math.sin(340 * Math.PI / 180)).toFixed(1);
	var uPid = 'wifi-u-arc-'+bandIdx;
	var unbCol = unbCnt > 0 ? '#ff6b35' : '#555';
	p.push('<defs><path id="'+uPid+'" d="M '+uSX+' '+uSY+' A '+uR+' '+uR+' 0 0 1 '+uEX+' '+uEY+'" fill="none"/></defs>');
	p.push('<text font-size="8" font-family="monospace" fill="'+unbCol+'" opacity="0.9"><textPath href="#'+uPid+'" startOffset="50%" text-anchor="middle">'+unbCnt+' UNB</textPath></text>');

	// BND count arc at 6 o'clock (curved textPath, r=91, CCW 160°→20°) — opposite health arc
	var bndCnt = bndCount || 0;
	var bR = 91;
	var bSX = (150 + bR * Math.cos(160 * Math.PI / 180)).toFixed(1);
	var bSY = (150 + bR * Math.sin(160 * Math.PI / 180)).toFixed(1);
	var bEX = (150 + bR * Math.cos(20 * Math.PI / 180)).toFixed(1);
	var bEY = (150 + bR * Math.sin(20 * Math.PI / 180)).toFixed(1);
	var bPid = 'wifi-b-arc-'+bandIdx;
	var bndCol = bndCnt > 0 ? '#00c8ff' : '#555';
	p.push('<defs><path id="'+bPid+'" d="M '+bSX+' '+bSY+' A '+bR+' '+bR+' 0 0 0 '+bEX+' '+bEY+'" fill="none"/></defs>');
	p.push('<text font-size="8" font-family="monospace" fill="'+bndCol+'" opacity="0.9"><textPath href="#'+bPid+'" startOffset="50%" text-anchor="middle">'+bndCnt+' BND</textPath></text>');

	// Centre readout — retry % above band name
	if (retryVal > 0)
		p.push('<text x="150" y="110" text-anchor="middle" fill="'+retryCol+'" font-size="7" font-family="monospace">'+retryVal+'% RTY</text>');
	p.push('<text x="150" y="120" text-anchor="middle" fill="'+accent+'" font-size="10" font-weight="700" font-family="monospace" letter-spacing="1">'+info.name.toUpperCase()+'</text>');

	// NPU/DMA badge (rect + text)
	var badgeCol = isNpu ? '#1565c0' : '#444';
	p.push('<rect x="135" y="122" width="30" height="12" rx="2" fill="'+badgeCol+'"/>');
	p.push('<text x="150" y="131" text-anchor="middle" fill="white" font-size="7" font-weight="600" font-family="monospace">'+(isNpu?'NPU':'DMA')+'</text>');

	// Main throughput value
	var mbpsLabel = mbps > 0 ? Math.round(mbps).toString() : (stations > 0 ? '0' : '\u2014');
	p.push('<text x="150" y="152" text-anchor="middle" fill="'+accent+'" font-size="17" font-weight="700" font-family="monospace">'+mbpsLabel+'</text>');
	p.push('<text x="150" y="162" text-anchor="middle" fill="'+accent+'" font-size="7" font-family="monospace" letter-spacing="2">MBPS</text>');

	// Max scale hint
	p.push('<text x="150" y="173" text-anchor="middle" fill="var(--soc-muted)" font-size="6" font-family="monospace">max '+Math.round(maxScale)+'</text>');

	// Station count
	p.push('<text x="150" y="185" text-anchor="middle" fill="var(--soc-muted)" font-size="8" font-weight="600" font-family="monospace">'+stations+(stations===1?' STA':' STA')+'</text>');

	// Signal + retry (only when relevant)
	if (stations > 0 && signal !== 0)
		p.push('<text x="150" y="197" text-anchor="middle" fill="var(--soc-muted)" font-size="7" font-family="monospace">'+signal+' dBm</text>');

	return p.join('');
}

function buildWifiBandSVG(bandIdx, ws, qType, ppe) {
	var idx      = bandIdx;
	var ring     = _wifiPpeRingStyle(ws, ppe, bandIdx);
	var bndCount = (ppe && ppe.bnd && Array.isArray(ppe.bnd.band_bnd)) ? (ppe.bnd.band_bnd[bandIdx] || 0) : 0;
	var unbCount = (ppe && ppe.unb && Array.isArray(ppe.unb.band_unb)) ? (ppe.unb.band_unb[bandIdx] || 0) : 0;
	return '<svg viewBox="30 30 240 240" xmlns="http://www.w3.org/2000/svg" overflow="hidden" style="width:100%;max-width:207px;display:block;margin:0 auto">' +
	'<defs>' +
	'<filter id="f-wifi-tx-'+idx+'" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
	'<filter id="f-wifi-rty-'+idx+'" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
	'</defs>' +
	'<circle id="wifi-glow-'+idx+'" cx="150" cy="150" r="104" fill="none" stroke="'+ring.color+'" stroke-width="6" style="'+ring.style+'"/>' +
	'<circle cx="150" cy="150" r="102" style="fill:var(--soc-card-bg)" stroke="var(--soc-border)" stroke-width="1"/>' +
	'<g id="wifi-tacho-'+idx+'">'+buildWifiBandTacho(bandIdx, ws, qType, bndCount, unbCount)+'</g>' +
	'<circle cx="150" cy="150" r="109" fill="none" stroke="#222222" stroke-width="2.5"/>' +
	'</svg>';
}

function updateWifiBandSVG(bandIdx, ws, qType, ppe) {
	var glowEl = document.getElementById('wifi-glow-'+bandIdx);
	if (glowEl) {
		var ring = _wifiPpeRingStyle(ws, ppe, bandIdx);
		glowEl.setAttribute('stroke', ring.color);
		glowEl.setAttribute('style', ring.style);
	}
	var tg       = document.getElementById('wifi-tacho-'+bandIdx);
	var bndCount = (ppe && ppe.bnd && Array.isArray(ppe.bnd.band_bnd)) ? (ppe.bnd.band_bnd[bandIdx] || 0) : 0;
	var unbCount = (ppe && ppe.unb && Array.isArray(ppe.unb.band_unb)) ? (ppe.unb.band_unb[bandIdx] || 0) : 0;
	if (tg) tg.innerHTML = buildWifiBandTacho(bandIdx, ws, qType, bndCount, unbCount);
}

// Returns array of 3 elements (6 GHz, 5 GHz, 2.4 GHz) for direct inclusion in compass-wrap
function buildWifiTachoElements(wifi, ti, st, ppe) {
	var bands = (wifi && Array.isArray(wifi.bands)) ? wifi.bands : [];
	var fallbackType = (st && st.npu_loaded) ? 'npu' : 'dma';
	var elems = [];
	// 6 GHz → 5 GHz → 2.4 GHz (band index 2 → 1 → 0)
	for (var b = 2; b >= 0; b--) {
		var ws = null;
		for (var j = 0; j < bands.length; j++) if (bands[j].band === b) { ws = bands[j]; break; }
		var txQ = getTxQueue(ti, b) || { type: fallbackType };
		var svgWrap = E('div', { 'id': 'wifi-svg-wrap-'+b });
		svgWrap.innerHTML = buildWifiBandSVG(b, ws, txQ.type, ppe);
		elems.push(svgWrap);
	}
	return elems;
}

/* ── Ethernet Port Horizontal Bar Gauges ── */
function _ethLabel(iface) {
	var m = { wan:'WAN', lan1:'LAN 1', lan2:'LAN 2', lan3:'LAN 3', lan4:'LAN 4' };
	return m[iface] || iface.toUpperCase();
}
function _ethSpeed(speed) {
	if (!speed || speed <= 0) return 'NO LINK';
	if (speed >= 10000) return '10G';
	if (speed >= 5000)  return '5G';
	if (speed >= 2500)  return '2.5G';
	if (speed >= 1000)  return '1G';
	if (speed >= 100)   return '100M';
	return speed + 'M';
}
function _ethFmt(mbps) {
	if (mbps >= 100) return mbps.toFixed(0);
	if (mbps >= 10)  return mbps.toFixed(1);
	return mbps.toFixed(2);
}

function buildEthPortSVG(port, txMbps, rxMbps, ppe) {
	var iface    = port.iface || '';
	var isWan    = (iface === 'wan');
	var up       = !!port.up;
	var maxSc    = _maxEthMbps[iface] || 100;
	var barW     = 140;
	var txPct    = up ? Math.min(1, txMbps / maxSc) : 0;
	var rxPct    = up ? Math.min(1, rxMbps / maxSc) : 0;
	var txW      = (txPct * barW).toFixed(1);
	var rxW      = (rxPct * barW).toFixed(1);
	var txVal    = up ? _ethFmt(txMbps) : '--';
	var rxVal    = up ? _ethFmt(rxMbps) : '--';
	var label    = _ethLabel(iface);
	var spLbl    = _ethSpeed(up ? (port.speed || 0) : 0);
	var portClr  = up ? (isWan ? '#00ffff' : '#00ff00') : '#555';
	var dimOp    = up ? '1' : '0.4';
	// Footer: WAN shows wired BND (total minus per-band WiFi BND); LAN ports show per-port BND from bridge FDB match
	var footerTxt, footerClr;
	if (isWan) {
		if (up) {
			var bndTotal  = (ppe && ppe.bnd) ? (ppe.bnd.total || 0) : 0;
			var bandBnd   = (ppe && ppe.bnd && ppe.bnd.band_bnd) ? ppe.bnd.band_bnd : [0,0,0];
			var wifiBnd   = (bandBnd[0]||0) + (bandBnd[1]||0) + (bandBnd[2]||0);
			var wiredBnd  = Math.max(0, bndTotal - wifiBnd);
			var unbTotal  = (ppe && ppe.unb) ? (ppe.unb.total || 0) : 0;
			var bandUnb   = (ppe && ppe.unb && ppe.unb.band_unb) ? ppe.unb.band_unb : [0,0,0];
			var wifiUnb   = (bandUnb[0]||0) + (bandUnb[1]||0) + (bandUnb[2]||0);
			var wiredUnb  = Math.max(0, unbTotal - wifiUnb);
			footerTxt = 'BND: ' + wiredBnd + '  UNB: ' + wiredUnb;
			footerClr = '#00c8ff';
		} else {
			footerTxt = '';
			footerClr = '#555';
		}
	} else {
		var portIdx  = {lan1:0, lan2:1, lan3:2, lan4:3}[iface];
		var bndPort  = (ppe && ppe.bnd && ppe.bnd.port_bnd) ? (ppe.bnd.port_bnd[portIdx] || 0) : 0;
		footerTxt = 'BND: ' + bndPort;
		footerClr = bndPort > 0 ? '#00c8ff' : '#555';
	}

	return '<svg viewBox="0 0 240 90" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block">' +
	'<rect x="1" y="1" width="238" height="88" rx="6" fill="none" stroke="#222222" stroke-width="2.5"/>' +
	'<rect x="3" y="3" width="234" height="84" rx="5" fill="var(--soc-card-bg)" stroke="var(--soc-border)" stroke-width="1"/>' +
	'<text x="16" y="16" fill="'+portClr+'" font-size="12" font-weight="700" font-family="monospace">'+label+'</text>' +
	'<text x="234" y="16" text-anchor="end" fill="'+portClr+'" font-size="10" font-family="monospace">'+spLbl+'</text>' +
	'<line x1="12" y1="21" x2="229" y2="21" stroke="#333" stroke-width="0.5"/>' +
	'<text x="12" y="35" fill="#00c8ff" font-size="9" font-family="monospace" letter-spacing="1" opacity="'+dimOp+'">TX</text>' +
	'<rect x="30" y="26" width="'+barW+'" height="13" rx="3" fill="#1e1e1e" opacity="'+dimOp+'"/>' +
	(txPct > 0 ? '<rect x="30" y="26" width="'+txW+'" height="13" rx="3" fill="#00c8ff" opacity="'+dimOp+'"/>' : '') +
	'<text x="218" y="35" text-anchor="end" fill="var(--soc-text)" font-size="10" font-weight="700" font-family="monospace" opacity="'+dimOp+'">'+txVal+'</text>' +
	'<text x="234" y="35" text-anchor="end" fill="var(--soc-muted)" font-size="7" font-family="monospace" opacity="'+dimOp+'">Mb</text>' +
	'<text x="12" y="59" fill="#ff6b35" font-size="9" font-family="monospace" letter-spacing="1" opacity="'+dimOp+'">RX</text>' +
	'<rect x="30" y="50" width="'+barW+'" height="13" rx="3" fill="#1e1e1e" opacity="'+dimOp+'"/>' +
	(rxPct > 0 ? '<rect x="30" y="50" width="'+rxW+'" height="13" rx="3" fill="#ff6b35" opacity="'+dimOp+'"/>' : '') +
	'<text x="218" y="59" text-anchor="end" fill="var(--soc-text)" font-size="10" font-weight="700" font-family="monospace" opacity="'+dimOp+'">'+rxVal+'</text>' +
	'<text x="234" y="59" text-anchor="end" fill="var(--soc-muted)" font-size="7" font-family="monospace" opacity="'+dimOp+'">Mb</text>' +
	'<text x="120" y="80" text-anchor="middle" fill="'+footerClr+'" font-size="7.5" font-family="monospace">'+footerTxt+'</text>' +
	'</svg>';
}

function updateEthPortSVG(port, txMbps, rxMbps, ppe) {
	var wrap = document.getElementById('eth-port-svg-' + port.iface);
	if (wrap) wrap.innerHTML = buildEthPortSVG(port, txMbps, rxMbps, ppe);
}

function buildEthGaugeRow(ethPorts, ppe) {
	var wrap = E('div', { 'class': 'eth-gauge-wrap', 'id': 'eth-gauge-wrap' });
	ethPorts.forEach(function(p) {
		var div = E('div', { 'id': 'eth-port-svg-' + p.iface, 'style': 'flex:1;min-width:140px' });
		div.innerHTML = buildEthPortSVG(p, 0, 0, ppe);
		wrap.appendChild(div);
	});
	return wrap;
}

/* ── Compass Data Cards ── */
function renderCompassCards(cs, bypass, jitter, wan, wifi, bridge, mode) {
	bypass=bypass||{}; jitter=jitter||{}; wan=wan||{}; wifi=wifi||{};

	// North card: NPU Path
	bridge = bridge || {};
	var rawBridgeDrops = bridge.tx_dropped || 0;
	var bridgeDelta = (_prevBridgeDrops !== null && rawBridgeDrops >= _prevBridgeDrops) ? (rawBridgeDrops - _prevBridgeDrops) : 0;
	_prevBridgeDrops = rawBridgeDrops;
	var northVal   = cs.npuActive ? 'ACTIVE' : (cs.hwEnabled ? 'IDLE' : 'CPU PATH');
	var northColor = cs.npuActive ? '#00c8ff' : (cs.hwEnabled ? '#888' : '#ff6b35');
	var northSub   = mode === 'ap'
		? 'CPU: '+cs.cpuPct+'%  |  Bridge drops Δ: '+bridgeDelta
		: 'CPU: '+cs.cpuPct+'%  |  WAN: '+cs.wanMbps+' Mbps';

	// East card: Integrity
	var eastVal, eastSub;
	if (mode === 'router') {
		eastVal = cs.eastAlarm ? cs.errCount+' ERROR'+(cs.errCount>1?'S':'') : 'CLEAN';
		eastSub = 'RX errors: '+(wan.rx_errors||0)+'  TX errors: '+(wan.tx_errors||0);
	} else {
		var ws = cs.worstSignal;
		eastVal = cs.wbDelta.length === 0 ? 'NO CLIENTS'
		        : ws === 0               ? 'NO DATA'
		        : ws < -82               ? 'POOR'
		        : ws < -75               ? 'WEAK'
		        :                          'CLEAN';
		var bnames = ['2.4G','5G','6G'];
		eastSub = cs.wbDelta.length > 0
			? 'Signal: '+cs.wbDelta.map(function(b){ return (bnames[b.band]||('B'+b.band))+': '+b.signal+' dBm'; }).join('  |  ')
			: 'No connected clients';
	}
	var eastColor = cs.eastColor;

	// South card: HW Buffer Health
	var hb = cs.hwBuf || {};
	var southVal   = hb.activeDrop ? 'DROPPING' : 'HEALTHY';
	var southColor = hb.color || '#00cc44';
	var southSub   = 'PSE Δ: '+hb.pseDelta+' CDM Δ: '+hb.cdmHwfDelta+' | PPE: '+hb.ppePct+'% BND ('+hb.ppeBound+'/'+hb.ppeTotal+')';

	// West card: Latency
	var latVal   = cs.latMs > 0 ? cs.latMs.toFixed(1)+'ms' : (jitter.available===false ? 'N/A' : '---');
	var latColor = cs.latColor;
	var latSub   = 'Jitter: '+(jitter.jitter||0).toFixed(1)+'ms  |  '+(jitter.samples||0)+' samples  |  '+(jitter.target||'1.1.1.1');

	function card(title, val, color, sub) {
		return E('div', { 'class': 'compass-card' }, [
			E('div', { 'class': 'compass-card-title' }, title),
			E('div', { 'class': 'compass-card-value', 'style': 'color:'+color }, val),
			E('div', { 'class': 'compass-card-sub' }, sub)
		]);
	}

	return E('div', { 'class': 'compass-cards', 'id': 'compass-cards' }, [
		card('NPU Path',    northVal, northColor, northSub),
		card('Integrity',   eastVal,  eastColor,  eastSub),
		card('Latency',     latVal,   latColor,   latSub),
		card('HW Buffer',   southVal, southColor, southSub)
	]);
}

function updateCompassCards(cs, bypass, jitter, wan, wifi, bridge, mode) {
	var cards = document.getElementById('compass-cards');
	if (!cards) return;
	var divs = cards.querySelectorAll('.compass-card');
	if (divs.length < 4) return;

	bypass=bypass||{}; jitter=jitter||{}; wan=wan||{}; wifi=wifi||{}; bridge=bridge||{};

	function setCard(div, val, color, sub) {
		var v = div.querySelector('.compass-card-value');
		var s = div.querySelector('.compass-card-sub');
		if (v) { v.textContent=val; v.style.color=color; }
		if (s) s.textContent=sub;
	}

	var rawBridgeDrops2 = bridge.tx_dropped || 0;
	var bridgeDelta2 = (_prevBridgeDrops !== null && rawBridgeDrops2 >= _prevBridgeDrops) ? (rawBridgeDrops2 - _prevBridgeDrops) : 0;
	_prevBridgeDrops = rawBridgeDrops2;

	setCard(divs[0], cs.npuActive?'ACTIVE':(cs.hwEnabled?'IDLE':'CPU PATH'),
		cs.npuActive?'#00c8ff':(cs.hwEnabled?'#888':'#ff6b35'),
		mode==='ap'
			?'CPU: '+cs.cpuPct+'%  |  Bridge drops Δ: '+bridgeDelta2
			:'CPU: '+cs.cpuPct+'%  |  WAN: '+cs.wanMbps+' Mbps');

	if (mode === 'router') {
		setCard(divs[1], cs.eastAlarm?cs.errCount+' ERROR'+(cs.errCount>1?'S':''):'CLEAN',
			cs.eastColor,
			'RX errors: '+(wan.rx_errors||0)+'  TX errors: '+(wan.tx_errors||0));
	} else {
		var ws2 = cs.worstSignal;
		var bnames2 = ['2.4G','5G','6G'];
		setCard(divs[1],
			cs.wbDelta.length === 0 ? 'NO CLIENTS'
			: ws2 === 0             ? 'NO DATA'
			: ws2 < -82             ? 'POOR'
			: ws2 < -75             ? 'WEAK'
			:                         'CLEAN',
			cs.eastColor,
			cs.wbDelta.length > 0
				? 'Signal: '+cs.wbDelta.map(function(b){ return (bnames2[b.band]||('B'+b.band))+': '+b.signal+' dBm'; }).join('  |  ')
				: 'No connected clients');
	}

	var latVal = cs.latMs > 0 ? cs.latMs.toFixed(1)+'ms' : (jitter.available===false?'N/A':'---');
	setCard(divs[2], latVal, cs.latColor,
		'Jitter: '+(jitter.jitter||0).toFixed(1)+'ms  |  '+(jitter.samples||0)+' samples  |  '+(jitter.target||'1.1.1.1'));

	var hb = cs.hwBuf || {};
	setCard(divs[3],
		hb.activeDrop?'DROPPING':'HEALTHY',
		hb.color||'#00cc44',
		'PSE Δ: '+hb.pseDelta+' CDM Δ: '+hb.cdmHwfDelta+' | PPE: '+hb.ppePct+'% BND ('+hb.ppeBound+'/'+hb.ppeTotal+')');
}

/* ── Main View ── */
return view.extend({
	load: function() {
		return Promise.all([
			callNpuStatus(),        // d[0]
			callPpeEntries(),       // d[1]
			callTokenInfo(),        // d[2]
			callFrameEngine(),      // d[3]
			callGetVlanOffload(),   // d[4]
			callTxStats(),          // d[5]
			callGetDeviceMode(),    // d[6]
			callGetNpuBypass(),     // d[7]
			callGetWanHealth(),     // d[8]
			callGetJitterResult(),  // d[9]
			callGetConflictAlerts(),// d[10]
			callGetWifiStats(),     // d[11]
			callGetBridgeStats(),   // d[12]
			callGetFlowOffload(),   // d[13]
			callGetPppoeOffload(),  // d[14]
			callGetEthStats()       // d[15]
		]);
	},

	render: function(data) {
		injectCSS();
		var st=data[0]||{}, ppe=data[1]||{}, ti=data[2]||{}, fe=data[3]||{};
		var vo=data[4]||{}, txs=data[5]||{}, dm=data[6]||{};
		var bypass=data[7]||{}, wan=data[8]||{};
		var jitter=data[9]||{}, alertData=data[10]||{};
		var wifi=data[11]||{}, bridge=data[12]||{};
		var flo=data[13]||{}, ppo=data[14]||{};
		var eth=data[15]||{};
		var memR = Array.isArray(st.memory_regions) ? st.memory_regions : [];
		var mode = dm.mode || 'router';

		var hwBuf = hwBufferState(fe, ppe, mode);
		var cs = compassState(bypass, hwBuf, jitter, wan, wifi, bridge, mode);

		// Compass SVG container — tachometer is embedded inside (innerHTML so we can update by element ID)
		var compassSvgWrap = E('div', { 'class': 'compass-svg-wrap', 'id': 'compass-svg-wrap' });
		compassSvgWrap.innerHTML = buildCompassSVG(cs, mode, ppe);

		var cnWrap = E('div', { 'id': 'cpu-npu-svg-wrap', 'style': 'flex-shrink:0' });
		cnWrap.innerHTML = buildCpuNpuCompassSVG(cs, ppe, st, ti);

		var view = E('div',{'class':'cbi-map'},[
			E('h2',{},_('Airoha FlowSense')),

			// Conflict alerts
			renderConflictAlerts(alertData),

			// Offload Monitor
			E('div',{'class':'cbi-section'},[
				// Gauges: CPU/NPU tachometer, compass, WiFi tachometers, compass cards, mode banner
				E('div', { 'class': 'compass-wrap' }, [
					cnWrap,
					compassSvgWrap
				].concat(buildWifiTachoElements(wifi, ti, st, ppe))),
				renderCompassCards(cs, bypass, jitter, wan, wifi, bridge, mode),
				// Ethernet port gauges row
				buildEthGaugeRow((eth && Array.isArray(eth.ports)) ? eth.ports : [], ppe),
				renderModeBanner(dm),
				E('div',{'style':'display:flex;align-items:center;justify-content:space-evenly;margin-top:10px;flex-wrap:wrap;width:100%'},[
					E('label',{'style':'display:flex;align-items:center;gap:6px;font-size:13px'},[
						E('span',{'class':'soc-text','style':'font-weight:600'},_('HW Flow Offload')),
						renderFlowOffloadStatus(flo.enabled)
					]),
					E('label',{'style':'display:flex;align-items:center;gap:6px;font-size:13px'},[
						E('span',{'class':'soc-text','style':'font-weight:600'},_('VLAN Offload')),
						renderVlanOffloadStatus(vo.enabled)
					]),
					E('label',{'style':'display:flex;align-items:center;gap:6px;font-size:13px'},[
						E('span',{'class':'soc-text','style':'font-weight:600'},_('PPPoE Offload')),
						renderPppoeOffloadStatus(ppo.enabled)
					])
				]),
				E('div',{'style':'margin-top:12px'}, renderPpeTerminal(ppe))
			]),
		]);

		poll.add(L.bind(function() {
			return Promise.all([
				callNpuStatus(), callPpeEntries(), callTokenInfo(), callFrameEngine(),
				callGetVlanOffload(), callTxStats(),
				callGetDeviceMode(), callGetNpuBypass(),
				callGetWanHealth(), callGetJitterResult(), callGetConflictAlerts(),
				callGetWifiStats(), callGetBridgeStats(),
				callGetFlowOffload(), callGetPppoeOffload(),
				callGetEthStats()
			]).then(L.bind(function(d) {
				injectCSS();
				var st=d[0]||{}, ppe=d[1]||{}, ti=d[2]||{}, fe=d[3]||{};
				var vo=d[4]||{}, txs=d[5]||{}, dm=d[6]||{};
				var bypass=d[7]||{}, wan=d[8]||{};
				var jitter=d[9]||{}, alertData=d[10]||{};
				var wifi=d[11]||{}, bridge=d[12]||{};
				var flo=d[13]||{}, ppo=d[14]||{};
				var eth=d[15]||{};
				var mode = dm.mode || 'router';

				// Compass update (tachometer embedded inside compass)
				var hwBuf = hwBufferState(fe, ppe, mode);
				var cs = compassState(bypass, hwBuf, jitter, wan, wifi, bridge, mode);
				updateCompassSVG(cs, mode, ppe);
				updateCompassCards(cs, bypass, jitter, wan, wifi, bridge, mode);

				// CPU/NPU Load compass update
				updateCpuNpuCompassSVG(cs, ppe, st, ti);

				// WiFi band tachometers
				var wbands = (wifi && Array.isArray(wifi.bands)) ? wifi.bands : [];
				var wFallback = st.npu_loaded ? 'npu' : 'dma';
				for (var wb = 0; wb < 3; wb++) {
					var wws = null;
					for (var wj = 0; wj < wbands.length; wj++) if (wbands[wj].band === wb) { wws = wbands[wj]; break; }
					updateWifiBandSVG(wb, wws, (getTxQueue(ti, wb) || { type: wFallback }).type, ppe);
				}

				// Conflict alerts
				var alertWrap = document.getElementById('conflict-alerts');
				if (alertWrap) {
					var fresh = renderConflictAlerts(alertData);
					alertWrap.innerHTML = fresh.innerHTML;
				}

				// Offload status badges
				function _setOffloadStatus(id, on) { var b=document.getElementById(id); if(b) { b.className='offload-badge '+(on?'offload-on':'offload-off'); b.textContent=on?_('Enabled'):_('Disabled'); } }
				_setOffloadStatus('vlan-offload-status', vo.enabled);
				_setOffloadStatus('flow-offload-status', flo.enabled);
				_setOffloadStatus('pppoe-offload-status', ppo.enabled);

				// Ethernet port gauges — compute per-port Mbps deltas from cumulative byte counters
				var ethPorts = (eth && Array.isArray(eth.ports)) ? eth.ports : [];
				var now = Date.now() / 1000;
				ethPorts.forEach(function(p) {
					var prev = _prevEthBytes[p.iface];
					var txMbps = 0, rxMbps = 0;
					if (prev && prev.time) {
						var dt = now - prev.time;
						if (dt > 0) {
							txMbps = Math.max(0, (p.tx_bytes - prev.tx) * 8 / dt / 1e6);
							rxMbps = Math.max(0, (p.rx_bytes - prev.rx) * 8 / dt / 1e6);
						}
					}
					_prevEthBytes[p.iface] = { tx: p.tx_bytes, rx: p.rx_bytes, time: now };
					if (!_maxEthMbps[p.iface] || txMbps > _maxEthMbps[p.iface]) _maxEthMbps[p.iface] = Math.max(txMbps, 100);
					if (rxMbps > _maxEthMbps[p.iface]) _maxEthMbps[p.iface] = rxMbps;
					updateEthPortSVG(p, txMbps, rxMbps, ppe);
				});

				// PPE terminal
				var tb = document.getElementById('ppe-terminal-body');
				if (tb) tb.innerHTML = buildPpeTerminalBody(ppe);
			},this));
		},this), 5);

		return view;
	},

	handleSaveApply: null, handleSave: null, handleReset: null
});
