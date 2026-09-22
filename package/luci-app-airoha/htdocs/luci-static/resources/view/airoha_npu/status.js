'use strict';
'require view';
'require poll';
'require rpc';
'require ui';
'require view.airoha.ui as aui';

/* ── RPC declarations ── */
var callNpuStatus = rpc.declare({ object: 'luci.airoha_npu', method: 'getStatus' });
var callPpeEntries = rpc.declare({ object: 'luci.airoha_npu', method: 'getPpeEntries' });
var callTokenInfo = rpc.declare({ object: 'luci.airoha_npu', method: 'getTokenInfo' });
var callFrameEngine = rpc.declare({ object: 'luci.airoha_npu', method: 'getFrameEngine' });
var callSetGovernor = rpc.declare({ object: 'luci.airoha_npu', method: 'setGovernor', params: ['governor'] });
var callSetMaxFreq = rpc.declare({ object: 'luci.airoha_npu', method: 'setMaxFreq', params: ['freq'] });
// VLAN Offload is an independent switch again (it owns the VLAN passthrough
// pair), so its declares are live here. PPPoE passthrough is owned by AP Mode
// Acceleration on this page - nothing below drives setPppoeOffload, so this
// view keeps no PPPoE declares at all.
var callGetVlanOffload = rpc.declare({ object: 'luci.airoha_npu', method: 'getVlanOffload' });
var callSetVlanOffload = rpc.declare({ object: 'luci.airoha_npu', method: 'setVlanOffload', params: ['enabled'] });
var callGetFlowOffload = rpc.declare({ object: 'luci.airoha_npu', method: 'getFlowOffload' });
var callSetFlowOffload = rpc.declare({ object: 'luci.airoha_npu', method: 'setFlowOffload', params: ['enabled'] });
var callGetApModeOffload = rpc.declare({ object: 'luci.airoha_npu', method: 'getApModeOffload' });
var callSetApModeOffload = rpc.declare({ object: 'luci.airoha_npu', method: 'setApModeOffload', params: ['enabled'] });
var callGetDeviceMode = rpc.declare({ object: 'luci.airoha_npu', method: 'getDeviceMode' });
var callGetTopology = rpc.declare({ object: 'luci.airoha_npu', method: 'getTopology' });
var callSetCpuSettings = rpc.declare({ object: 'luci.airoha_npu', method: 'setCpuSettings', params: ['governor', 'freq'] });

// Tracks whether the user has changed a CPU control select without saving yet.
// While dirty, the 5s poll must NOT overwrite the selects with live sysfs values.
var cpuSettingsDirty = false;

/* ── Shared state vocabulary ──────────────────────────────────────────────
 * The two tabs use ONE set of health words so a band, a token pool or a PLE
 * pool never reads "Good" on one page and "正常" on the other. */

function isEnabled(value) {
	return value === true || value === 1 || value === '1';
}

function isBridgeOffloadBlocked(mode) {
	mode = mode || {};
	return isEnabled(mode.bridge_offload_blocked);
}

/* Band link health → { text, kind }. */
function bandHealth(s) {
	if (!s || s.count === 0) return { text: _('No clients'), kind: '' };
	if (!s.tx_packets) return { text: _('Idle'), kind: '' };
	var r = s.tx_retries / (s.tx_packets + s.tx_retries);
	return r > 0.5 ? { text: _('Poor'), kind: 'error' }
		: r > 0.2 ? { text: _('Fair'), kind: 'warn' }
			: { text: _('Good'), kind: 'ok' };
}

/* Token-pool occupancy → { text, kind }. */
function tokenHealth(c, s) {
	if (!s) return { text: _('Unknown'), kind: '' };
	var p = c / s * 100;
	return p < 50 ? { text: _('Normal'), kind: 'ok' }
		: p < 80 ? { text: _('Warning'), kind: 'warn' }
			: { text: _('Critical'), kind: 'error' };
}

function retryPct(s) {
	if (!s || !s.tx_packets) return '—';
	return (s.tx_retries / (s.tx_packets + s.tx_retries) * 100).toFixed(1) + '%';
}

function getBandStats(ti, b) {
	var c = Array.isArray(ti.station_counts) ? ti.station_counts : [];
	for (var i = 0; i < c.length; i++) if (c[i].band === b) return c[i];
	return { band: b, count: 0, tx_packets: 0, tx_retries: 0 };
}

function getTxQueue(ti, b) {
	var q = Array.isArray(ti.tx_queues) ? ti.tx_queues : [];
	for (var i = 0; i < q.length; i++) if (q[i].band === b) return q[i];
	return null;
}

/* ── Port labels ──────────────────────────────────────────────────────────
 * External port names are pinned per board model ("10G WAN", "2.5G LAN3"…)
 * because they describe the port's design identity, not the momentary PHY
 * result — a label must not change just because a link negotiated down.
 * Boards are matched on the getTopology compatible/model string and ports on
 * their netdev name; anything unmapped (unknown board or netdev) falls back
 * to the topology-derived label. Technical tokens (GDM1, the netdev names)
 * stay untranslated, exactly as the file already treats them. */

/* Human-readable role/mode summary for one topology port. */
function portLabel(p) {
	p = p || {};
	var role = String(p.role || '').toLowerCase();
	var mode = String(p.mode || '');
	var netdev = String(p.netdev || '');
	var parts = [];
	if (mode === 'internal' || !netdev) parts.push(_('Internal Switch'));
	else if (role === 'wan') parts.push(_('WAN'));
	else if (role === 'lan') parts.push(_('LAN'));
	else parts.push(_('No netdev'));
	if (mode && mode !== 'internal') parts.push(mode.toUpperCase());
	if (netdev) parts.push(netdev);
	return parts.join(' · ');
}

function portName(p) {
	return String((p && p.key) || '').toUpperCase();
}

/* Link speed (Mbps) → compact tag: 10000 → "10G", 1000 → "1G". */
function speedTag(mbps) {
	mbps = Number(mbps) || 0;
	if (mbps >= 10000) return '10G';
	if (mbps >= 5000) return '5G';
	if (mbps >= 2500) return '2.5G';
	if (mbps >= 1000) return '1G';
	if (mbps >= 100) return '100M';
	return '';
}

/* Static per-mode speed fallback (Mbps) for ports whose link is down, so a
 * "1G LAN4" label still reads as 1G before the PHY negotiates. */
function modeFallbackMbps(mode) {
	switch (String(mode || '').toLowerCase()) {
		case 'usxgmii': case 'dxa': return 10000;
		case '2500base-x': return 2500;
		case 'sgmii': case 'internal': return 1000;
		default: return 0;
	}
}

/* Best-known speed tag for a port: negotiated speed wins, else the mode's
 * static capability. */
function portSpeedTag(p) {
	return speedTag(p && p.speed_mbps) || speedTag(modeFallbackMbps(p && p.mode));
}

/* A port that fronts the internal switch CPU (no netdev of its own). */
function isSwitchCpuPort(p) {
	return !(p && p.netdev) || String(p.netdev) === 'cpu';
}

/* LAN netdevs behind the internal switch sharing a GDM's PSE index. */
function switchLanNetdevs(pse, topo) {
	var out = [];
	(Array.isArray(topo && topo.ports) ? topo.ports : []).forEach(function(q) {
		if (q && q.kind === 'gsw' && q.pse === pse && q.netdev) out.push(q.netdev);
	});
	return out;
}

/* Fixed per-board port labels, keyed by netdev. Speeds are the ports' design
 * capability — deliberately not live negotiation, so a label never flips
 * between "10G" and "1G" while a link renegotiates.
 *   XR1710G: 10G WAN / 10G LAN2 / 1G LAN3 / 1G LAN4 (+WiFi via CDM4)
 *   XG2010G: 10G LAN1 / 10G LAN2 / 2.5G LAN3 / 1G LAN4 (uplink is the PON card) */
var BOARD_PORT_NAMES = {
	xr1710: { wan: '10G WAN', lan2: '10G LAN2', lan3: '1G LAN3', lan4: '1G LAN4' },
	xg2010: { lan1: '10G LAN1', lan2: '10G LAN2', lan3: '2.5G LAN3', lan4: '1G LAN4' }
};

/* Pick the fixed label table for this board, or null when the board is not
 * one of the pinned models (unknown boards keep the topology-derived label). */
function boardPortNames(topo) {
	var id = (((topo && topo.compatible) || '') + ' ' + ((topo && topo.model) || '')).toLowerCase();
	var keys = Object.keys(BOARD_PORT_NAMES);
	for (var i = 0; i < keys.length; i++) {
		if (id.indexOf(keys[i]) >= 0) return BOARD_PORT_NAMES[keys[i]];
	}
	return null;
}

/* Human-facing name for a topology port: "10G WAN", "10G LAN2", "1G LAN3". */
function humanPortName(p, topo) {
	p = p || {};
	if (isSwitchCpuPort(p)) {
		var lans = switchLanNetdevs(p.pse, topo);
		if (!lans.length) return _('Internal Switch');
		var fixedLans = boardPortNames(topo);
		return 'LAN · ' + lans.map(function(x) {
			return (fixedLans && fixedLans[String(x).toLowerCase()]) || x;
		}).join(', ');
	}
	var fixed = boardPortNames(topo);
	if (fixed) {
		var nd = String(p.netdev || '').toLowerCase();
		if (fixed[nd]) return fixed[nd];
	}
	var speed = portSpeedTag(p);
	if (String(p.role || '').toLowerCase() === 'wan')
		return (speed ? speed + ' ' : '') + 'WAN';
	return (speed ? speed + ' ' : '') + 'LAN' + String(p.netdev).replace(/^lan/i, '');
}

/* The GDM port a CDM engine feeds, as { label, wan } — cdmN ↔ GDM reg N.
 * Labels go through the same per-board fixed table as the GDM cards. */
function cdmSide(n, topo) {
	var g = (Array.isArray(topo && topo.ports) ? topo.ports : []).filter(function(p) {
		return p && p.kind === 'gdm' && p.reg === n;
	})[0];
	if (!g) return null;
	var fixed = boardPortNames(topo);
	if (isSwitchCpuPort(g)) {
		var lans = switchLanNetdevs(g.pse, topo);
		if (!lans.length) return null;
		return { label: lans.map(function(x) {
			return (fixed && fixed[String(x).toLowerCase()]) || x;
		}).join(', '), wan: false };
	}
	var nd = String(g.netdev || '');
	return { label: (fixed && fixed[nd.toLowerCase()]) || nd, wan: String(g.role || '').toLowerCase() === 'wan' };
}

/* Accent colour for a GDM card: CPU/internal-facing MACs are amber, the
 * externally-facing LAN/WAN MACs are green. */
function portAccent(p) {
	p = p || {};
	if (String(p.mode || '') === 'internal' || !p.netdev) return 'var(--ds-warn)';
	return 'var(--ds-ok)';
}

/* PSE port index → tile metadata. The getFrameEngine payload enumerates the
 * PSE ports 0..9; the CDM/PPE engines always get a fixed entry, the rest are
 * filled from the topology's own `pse` index. A port without its own PSE entry
 * (e.g. the switch ports behind the internal GDM) leaves the index empty and
 * the tile falls back to its PSE index. First entry wins so a GDM MAC is never
 * displaced by the internal switch ports that share its PSE. */
function buildPsePortMap(topo) {
	topo = topo || {};
	var map = [];
	map[0] = { name: 'CDM1', label: 'CPU DMA 1', color: 'var(--ai-cpu)' };
	map[4] = { name: 'PPE1', label: 'PPE Eng 1', color: 'var(--ai-npu)' };
	map[5] = { name: 'CDM2', label: 'CPU DMA 2', color: 'var(--ai-cpu)' };
	map[6] = { name: 'CDM3', label: 'CDM3', color: 'var(--ds-border-strong)' };
	map[7] = { name: 'CDM4', label: 'WDMA', color: 'var(--ai-band-6)' };
	map[8] = { name: 'PPE2', label: 'PPE Eng 2', color: 'var(--ai-npu)' };
	(Array.isArray(topo.ports) ? topo.ports : []).forEach(function(p) {
		if (!p || p.pse === undefined || p.pse === null) return;
		var idx = Number(p.pse);
		if (isNaN(idx) || map[idx]) return;
		map[idx] = { name: portName(p), label: humanPortName(p, topo), color: portAccent(p) };
	});
	return map;
}

/* ── Summary tiles ── */
function npuSummaryTiles(st, ti) {
	st = st || {}; ti = ti || {};
	var active = isEnabled(st.npu_loaded);
	var clock = st.npu_clock ? Math.round(st.npu_clock / 1000000) : 0;
	var bound = st.offload_bound || 0;
	var total = st.offload_total || 0;

	// TX token pool — the hardware send tokens the NPU/WDMA draws from. This is
	// the reading the old view never surfaced.
	var tokCount = Number(ti.token_count) || 0;
	var tokSize = Number(ti.token_size) || 0;
	var tokPct = tokSize > 0 ? tokCount / tokSize * 100 : 0;
	var tokAccent = !tokSize ? 'var(--ds-text-muted)'
		: tokPct < 50 ? 'var(--ds-ok)'
			: tokPct < 80 ? 'var(--ds-warn)' : 'var(--ds-error)';

	var temp = (st.cpu_temp && st.cpu_temp !== 'N/A') ? st.cpu_temp : '';

	var tiles = {
		'npu-summary-status': aui.tile({
			id: 'npu-summary-status', title: _('NPU Status'),
			value: active ? _('Activated') : _('Not Activated'),
			accent: active ? 'var(--ai-npu)' : 'var(--ds-text-muted)',
			sub: active ? (st.npu_device || _('NPU device ready')) : _('Driver unavailable')
		}),
		'npu-summary-clock': aui.tile({
			id: 'npu-summary-clock', title: _('NPU Clock / Cores'),
			value: clock ? clock + ' MHz' : 'N/A', accent: 'var(--ds-ok)',
			sub: (st.npu_cores || 0) + ' ' + _('cores')
		}),
		'npu-summary-flows': aui.tile({
			id: 'npu-summary-flows', title: _('Offload Statistics'),
			value: bound + ' / ' + total,
			accent: total > 0 ? 'var(--ai-npu)' : 'var(--ds-text-muted)',
			sub: _('Bound / total PPE flows')
		}),
		// The reserved-memory regions tile was dropped: region count/size means
		// nothing to an operator and the DTS never changes after boot.
		'npu-summary-temp': aui.tile({
			id: 'npu-summary-temp', title: _('CPU Temperature'),
			value: temp ? temp.replace(/[^\d.]/g, '') : '—', unit: temp ? '°C' : '',
			accent: 'var(--ds-ok)',
			sub: (st.cpu_count || 0) + ' ' + _('cores') + ' · ' + (st.soc_compat || '')
		})
	};

	// The TX token pool tile only carries meaning when the driver exposes the
	// probe (mt76's token_info debugfs node). On builds without it the tile
	// would sit at "N/A / Unknown" forever — hide it instead.
	if (tokSize > 0) {
		tiles['npu-summary-token'] = aui.tile({
			id: 'npu-summary-token', title: _('TX Token Pool'),
			value: tokCount + ' / ' + tokSize,
			accent: tokAccent,
			sub: _('used') + ' ' + aui.fmtPct(tokPct, 0)
		});
	}

	return tiles;
}

var SUMMARY_IDS = [
	'npu-summary-status', 'npu-summary-clock', 'npu-summary-flows',
	'npu-summary-token', 'npu-summary-temp'
];

function renderSummary(st, ti) {
	var tiles = npuSummaryTiles(st, ti);
	return E('div', { 'class': 'ai-grid ai-grid--tiles', 'id': 'npu-summary-grid' },
		SUMMARY_IDS.map(function(id) { return tiles[id]; }).filter(Boolean));
}

function updateSummary(st, ti) {
	var grid = document.getElementById('npu-summary-grid');
	if (!grid) return;
	var tiles = npuSummaryTiles(st, ti);
	grid.innerHTML = '';
	SUMMARY_IDS.forEach(function(id) { if (tiles[id]) grid.appendChild(tiles[id]); });
}

/* ── CPU frequency ── */
function freqState(st) {
	st = st || {};
	var hw = st.cpu_hw_freq || 0, min = st.cpu_min_freq || 0, max = st.cpu_max_freq || 0;
	var pll = st.pll_freq_mhz || 0, gov = st.cpu_governor;
	var oc = gov === 'performance' && pll > 0 && (pll * 1000) > max;
	return { freq: oc ? pll * 1000 : Math.min(hw, max), min: min, max: oc ? pll * 1000 : max, oc: oc };
}

function renderCpuInfo(st) {
	st = st || {};
	return aui.card({
		name: _('CPU Info'), tag: _('CPU model / temperature'), accent: 'var(--ai-npu)',
		body: [
			aui.row(_('Model'), st.soc_compat || ''),
			aui.row(_('Architecture'), st.cpu_arch || ''),
			aui.row(_('Core Count'), (st.cpu_count || 0)),
			aui.row(_('Temperature'), (st.cpu_temp && st.cpu_temp !== 'N/A') ? st.cpu_temp : 'N/A')
		]
	});
}

function renderFreqCard(st) {
	st = st || {};
	var s = freqState(st);
	return aui.card({
		name: _('Current Frequency'), tag: _('CPU freq / PLL'), accent: 'var(--ds-ok)',
		body: [
			aui.bar({
				title: _('Current frequency (cpuinfo_cur_freq)'), right: aui.fmtFreq(s.freq) + ' / ' + aui.fmtFreq(s.max),
				pct: (s.max > s.min) ? Math.round((s.freq - s.min) / (s.max - s.min) * 100) : 0,
				accent: s.oc ? 'var(--ds-warn)' : 'var(--ds-ok)',
				label: s.oc ? ((st.pll_freq_mhz || 0) + ' MHz (OC)') : aui.fmtFreq(s.freq),
				tall: true, fillId: 'cpu-freq-fill', labelId: 'cpu-freq-text'
			}),
			aui.row(_('PLL Reading'), aui.fmtFreq((st.pll_freq_mhz || 0) * 1000)),
			aui.row(_('Frequency Range'), aui.fmtFreq(st.cpu_min_freq) + ' – ' + aui.fmtFreq(st.cpu_max_freq)),
			aui.row(_('Governor frequency (scaling_cur_freq)'), aui.fmtFreq(st.cpu_cur_freq))
		]
	});
}

/* ── CPU control settings (governor / max freq + save) ── */
function governorLabel(governor) {
	var labels = {
		conservative: _('conservative'), ondemand: _('ondemand'), performance: _('performance'),
		powersave: _('powersave'), schedutil: 'schedutil', userspace: _('userspace')
	};
	return labels[governor] || governor;
}

function splitList(s) {
	return String(s == null ? '' : s).trim().split(/\s+/).filter(Boolean);
}

/* Map the backend cpufreq reason code to its translatable string. */
function cpuReasonText(reason) {
	if (reason === 'no_governors') return _('No CPU governors reported by the kernel');
	if (reason === 'no_frequencies') return _('No selectable CPU frequencies reported by the kernel');
	return _('CPU frequency scaling is not available on this board');
}

/* Returns '' while cpufreq is usable, otherwise the reason text to show. A
 * missing availability key fails open (a backend that predates the key must
 * keep working); the key is only treated as "unavailable" when the kernel also
 * reported nothing to choose from. */
function cpufreqReason(st) {
	st = st || {};
	var avail = st.cpu_cpufreq_available;
	if (avail !== undefined && avail !== null)
		return isEnabled(avail) ? '' : cpuReasonText(st.cpu_cpufreq_reason);
	if (splitList(st.cpu_avail_governors).length || splitList(st.cpu_avail_freqs).length)
		return '';
	return cpuReasonText(st.cpu_cpufreq_reason);
}

/* Build a CPU control <select>. It is ALWAYS a real select element (never a
 * bare text node) so the poll path and the Save handler can always find it.
 * When the available list is empty the live value is seeded so the control
 * still displays the current setting; when nothing is known at all it becomes
 * a disabled placeholder carrying the backend reason as its only option. */
function cpuSelect(id, values, current, placeholder, labelFn) {
	var attrs = {
		'id': id, 'class': 'cbi-input-select',
		'change': function() { cpuSettingsDirty = true; updateCpuSettingsHint(); }
	};
	var opts;
	if (values && values.length) {
		opts = values.map(function(v) {
			return E('option', { 'value': v, 'selected': String(v) === String(current) ? '' : null }, labelFn(v));
		});
	} else if (current !== undefined && current !== null && String(current) !== '') {
		opts = [ E('option', { 'value': String(current), 'selected': '' }, labelFn(current)) ];
	} else {
		opts = [ E('option', { 'value': '', 'selected': '' }, placeholder || 'N/A') ];
	}
	if (!(values && values.length)) attrs.disabled = '';
	return E('select', attrs, opts);
}

function renderGovSelect(avail, active, reason) {
	return cpuSelect('cpu-governor-select', splitList(avail), active || '', reason, governorLabel);
}

function renderMaxFreqSelect(avail, cur, reason) {
	return cpuSelect('cpu-maxfreq-select', splitList(avail), cur || '', reason, function(f) {
		return Math.round(parseInt(f, 10) / 1000) + ' MHz';
	});
}

function updateCpuSettingsHint() {
	var hint = document.getElementById('cpu-settings-hint');
	if (!hint) return;
	if (cpuSettingsDirty) { hint.textContent = _('Unsaved changes'); hint.style.color = 'var(--ds-warn)'; }
	else { hint.textContent = ''; hint.style.color = ''; }
}

function renderControlSettings(st) {
	// Container rebuilt from live status → selections reflect what is currently applied.
	st = st || {};
	cpuSettingsDirty = false;

	var reason = cpufreqReason(st);

	var saveBtn = E('button', {
		'id': 'cpu-settings-save',
		'class': 'ai-btn ai-btn--primary',
		'title': reason || null,
		'click': function(ev) {
			var btn = ev.target;
			var gs = document.getElementById('cpu-governor-select');
			var fs = document.getElementById('cpu-maxfreq-select');
			if (!gs || !fs || gs.disabled || fs.disabled) {
				ui.addNotification(null, E('p', {}, reason || _('No CPU frequency controls are available on this board')), 'warning');
				return;
			}
			btn.disabled = true;
			callSetCpuSettings(gs.value, parseInt(fs.value)).then(function(r) {
				btn.disabled = false;
				if (r && r.error) {
					ui.addNotification(null, E('p', {}, _('Error: ') + r.error), 'error');
				} else {
					cpuSettingsDirty = false;
					updateCpuSettingsHint();
					ui.addNotification(null, E('p', {}, _('CPU settings saved — they will persist after a reboot')), 'info');
				}
			}).catch(function() { btn.disabled = false; });
		}
	}, _('Save'));
	// The Save button is always rendered; it is only disabled while there is
	// nothing selectable, and its title explains why.
	if (reason) saveBtn.disabled = true;

	var hint = E('span', { 'id': 'cpu-settings-hint', 'class': 'ai-muted' }, '');
	var note = E('div', {
		'id': 'cpu-cpufreq-note', 'class': 'ai-hint',
		'style': 'flex-basis:100%;margin:0'
	}, reason || '');

	return E('div', { 'class': 'ai-form' }, [
		E('div', { 'class': 'ai-field' }, [
			E('label', { 'class': 'ai-field-label', 'for': 'cpu-governor-select' }, _('Governor')),
			renderGovSelect(st.cpu_avail_governors, st.cpu_governor, reason)
		]),
		E('div', { 'class': 'ai-field' }, [
			E('label', { 'class': 'ai-field-label', 'for': 'cpu-maxfreq-select' }, _('Max Freq')),
			renderMaxFreqSelect(st.cpu_avail_freqs, st.cpu_max_freq, reason)
		]),
		saveBtn,
		hint,
		note
	]);
}

/* ── Offload switches ── */
function offloadState(enabled, blocked) {
	enabled = isEnabled(enabled);
	blocked = isEnabled(blocked);
	if (blocked) return { kind: 'warn', text: _('Router mode restricted') };
	return enabled ? { kind: 'ok', text: _('Enabled') } : { kind: '', text: _('Disabled') };
}

function renderOffloadSwitch(cfg) {
	return aui.switchRow({
		rowId: cfg.rowId,
		inputId: cfg.inputId,
		badgeId: cfg.badgeId,
		name: cfg.name,
		note: cfg.note,
		on: isEnabled(cfg.enabled),
		blocked: isEnabled(cfg.blocked),
		onLabel: _('Enabled'),
		offLabel: _('Disabled'),
		blockedLabel: _('Router mode restricted'),
		title: isEnabled(cfg.blocked)
			? (isEnabled(cfg.enabled) ? _('Suggested off in router mode') : _('Use hardware flow offload in router mode'))
			: (isEnabled(cfg.enabled) ? _('Click to disable') : _('Click to enable')),
		onChange: function(input) {
			var val = input.checked ? 1 : 0;
			var blocked = input.getAttribute('data-blocked') === '1';
			if (blocked && val === 1) {
				input.checked = false;
				ui.addNotification(null, E('p', {}, _('Use hardware flow offload in router mode')), 'warning');
				return;
			}
			input.disabled = true;
			cfg.callFn(val).then(function(r) {
				input.disabled = false;
				if (r && r.error) {
					input.checked = !val;
					ui.addNotification(null, E('p', {}, _('Error: ') + r.error), 'error');
				} else {
					updateOffloadControl(cfg.inputId, cfg.badgeId, cfg.rowId, val, blocked);
				}
			}).catch(function() {
				input.checked = !val;
				input.disabled = false;
			});
		}
	});
}

function updateOffloadControl(inputId, badgeId, rowId, enabled, blocked) {
	enabled = isEnabled(enabled);
	blocked = isEnabled(blocked);
	var input = document.getElementById(inputId);
	if (input) {
		input.setAttribute('data-blocked', blocked ? '1' : '0');
		if (!input.matches(':focus')) input.checked = enabled;
		input.disabled = blocked && !enabled;
	}
	var row = document.getElementById(rowId);
	if (row) {
		row.setAttribute('data-on', enabled ? 'true' : 'false');
		row.setAttribute('data-blocked', blocked ? 'true' : 'false');
	}
	var b = document.getElementById(badgeId);
	if (b) {
		var state = offloadState(enabled, blocked);
		b.className = 'ai-pill' + (state.kind ? ' ai-pill--' + state.kind : '');
		// Keep the leading dot; only the label text is swapped.
		b.textContent = '';
		b.appendChild(E('span', { 'class': 'dot' }));
		b.appendChild(document.createTextNode(state.text));
	}
}

/* ── Frame engine diagram ── */
function renderFeDiagram(fe, ti, st, ppe, topo) {
	if (!fe || fe.error) return aui.empty(_('Frame engine data is not available on this build'));
	ti = ti || {}; st = st || {}; ppe = ppe || {}; topo = topo || {};
	var ports = Array.isArray(fe.pse_ports) ? fe.pse_ports : [];
	// The GDM MAC cards and the PSE tile labels are generated from the live
	// topology, never from a fixed board layout, so the 2010 (no WAN, lan1 on
	// GDM4, no GDM2) and the 1710 (USXGMII WAN on GDM2) both render correctly.
	var topoPorts = Array.isArray(topo.ports) ? topo.ports : [];
	var psePortMap = buildPsePortMap(topo);

	// The per-band cards (tx_queues / station_counts) are indexed by wireless
	// band, so they are skipped entirely on a radio-less board (e.g. the 2010)
	// instead of rendering three empty cards. has_wifi is authoritative; the
	// shared predicate fails open if the flag is missing.
	var hasWifi = aui.hasWifiRadio({ has_wifi: ti.has_wifi });

	function gdmCard(key, name, tag, accent) {
		var d = fe[key] || {};
		var body = [ aui.row('TX', aui.fmtK(d.tx)), aui.row('RX', aui.fmtK(d.rx)) ];
		if (d.tx_drop > 0) body.push(aui.row('TX Drop', aui.fmtK(d.tx_drop), 'ai-err'));
		if (d.rx_drop > 0) body.push(aui.row('RX Drop', aui.fmtK(d.rx_drop), 'ai-err'));
		body.push(aui.row(_('State'), (d.tx > 0 || d.rx > 0) ? _('Active') : _('Idle')));
		return aui.card({ name: name, tag: tag, accent: accent, body: body });
	}

	function cdmCard(key, name, tag, pse) {
		var d = fe[key] || {};
		var total = (d.rx_cpu || 0) + (d.rx_hwf || 0);
		var p = total > 0 ? (d.rx_hwf / total) * 100 : 0;
		var bcol = total === 0 ? 'var(--ds-border)' : p > 80 ? 'var(--ds-ok)' : p > 50 ? 'var(--ds-warn)' : 'var(--ds-error)';
		return aui.card({
			name: name + ' ' + pse, tag: tag, accent: 'var(--ai-npu)',
			body: [
				aui.bar({ title: 'HW Offload', right: aui.fmtPct(p), pct: p, accent: bcol }),
				aui.row('CPU', aui.fmtK(d.rx_cpu || 0)),
				aui.row('HWF', aui.fmtK(d.rx_hwf || 0)),
				(d.rx_cpu_drop > 0) ? aui.row('CPU Drop', aui.fmtK(d.rx_cpu_drop), 'ai-err') : null,
				(d.rx_hwf_drop > 0) ? aui.row('HWF Drop', aui.fmtK(d.rx_hwf_drop), 'ai-err') : null,
				aui.row('TX', aui.fmtK(d.tx || 0))
			]
		});
	}

	// WiFi band chips (CDM4) — data sources are indexed by wireless band.
	var bandChips = [];
	if (hasWifi) {
		for (var b = 0; b < 3; b++) {
			var stats = getBandStats(ti, b);
			var txQ = getTxQueue(ti, b);
			var type = txQ ? txQ.type : '?';
			var h = bandHealth(stats);
			bandChips.push(aui.card({
				name: aui.BANDS[b].full, tag: 'P7 ' + type.toUpperCase(), accent: aui.bandColor(b),
				body: [
					h.kind || h.text ? aui.pill(h.text, h.kind) : null,
					aui.row(_('Clients'), String(stats.count)),
					aui.row(_('Retransmit'), retryPct(stats))
				]
			}));
		}
	}

	var bandBlock = hasWifi ? [
		E('div', { 'class': 'ai-subhead', 'style': 'margin:var(--ds-sp-2) 0 var(--ds-sp-1)' }, _('Bands')),
		E('div', { 'class': 'ai-grid ai-grid--bands', 'style': 'gap:var(--ds-sp-1)' }, bandChips)
	] : [];

	var p7 = ports[7] || { iq: 0, oq: 0, drops: 0 };
	// CDM cards carry the real interfaces they feed: cdmN ↔ GDM reg N, so the
	// XR1710G shows "CDM1 · LAN (lan3, lan4)" and "CDM2 · WAN" instead of bare
	// engine names.
	var cdm1Side = cdmSide(1, topo);
	var cdm2Side = cdmSide(2, topo);
	var cdm4WiFi = aui.card({
		name: 'CDM4 · WiFi', tag: 'P7 WiFi DMA', accent: 'var(--ai-band-6)',
		body: [
			aui.bar({ title: 'IQ / OQ', right: 'IQ ' + p7.iq + ' · OQ ' + p7.oq, pct: (p7.oq / 256 * 100), accent: 'var(--ai-band-6)' })
		].concat(bandBlock)
	});

	var wifiBanner = hasWifi ? null : aui.banner('info', _('No wireless hardware detected'),
		_('The per-band cards are indexed by wireless band and are skipped entirely on this board. The rest of the frame engine (PSE / GDM / CDM / NPU) is unaffected.'));

	var npuActive = isEnabled(st.npu_loaded);
	var npuCard = aui.card({
		name: 'NPU', tag: npuActive ? 'ACTIVE' : 'OFF',
		accent: npuActive ? 'var(--ai-npu)' : 'var(--ds-border-strong)',
		body: [
			aui.row(_('Firmware / Clock / Cores'), (st.npu_version || 'Unknown') + ' · ' + (st.npu_clock ? Math.round(st.npu_clock / 1000000) + ' MHz' : 'N/A')),
			aui.row('RISC-V', (st.npu_cores || 0) + ' ' + _('cores') + ' · PCIe RAM')
		]
	});

	var unbCount = (Array.isArray(ppe.entries) ? ppe.entries : []).filter(function(e) {
		return e && e.state && e.state !== 'BND';
	}).length;
	var ppeCard = aui.card({
		name: 'PPE Engines', tag: 'P4 + P8', accent: 'var(--ai-npu)',
		body: [
			aui.row(_('Bound'), String(st.offload_bound || 0)),
			aui.row(_('Total'), String(st.offload_total || 0)),
			aui.row(_('Unbound'), String(unbCount))
		]
	});

	var pseT = (fe.pse_used || 0) + (fe.pse_free || 0);
	var pseP = pseT > 0 ? (fe.pse_used / pseT) * 100 : 0;
	var pseCol = pseP > 80 ? 'var(--ds-error)' : pseP > 50 ? 'var(--ds-warn)' : 'var(--ds-ok)';

	// A PSE port without a topology mapping (e.g. P3 on the XR1710G, reserved)
	// carries no interpretable label or queue data - rendering it produced a
	// "P3 ?" tile that read as broken data. Skip unmapped ports entirely.
	var portCells = ports.filter(function(p) { return p.port !== 7 && psePortMap[p.port]; }).map(function(p) {
		var info = psePortMap[p.port];
		return aui.tile({
			title: 'P' + p.port + ' ' + info.name,
			value: p.iq + ' / ' + p.oq,
			accent: p.drops > 0 ? 'var(--ds-error)' : 'var(--ds-border)',
			sub: 'IQ / OQ' + (p.drops > 0 ? ' · ' + _('Drop') + ' ' + aui.fmtK(p.drops) : '')
		});
	});

	// The PSE per-port IQ/OQ readout is constant "2 / 0" while idle — pure
	// noise. Show the grid only when at least one mapped port has queued
	// output or drops; while idle the whole subsection stays hidden.
	var pseActive = ports.some(function(p) {
		return p.port !== 7 && psePortMap[p.port] && ((p.oq || 0) > 0 || (p.drops || 0) > 0);
	});

	return E('div', { 'id': 'fe-diagram' }, [
		wifiBanner,
		aui.bar({
			title: 'PSE Shared Buffer', right: (fe.pse_used || 0) + ' ' + _('used') + ' / ' + (fe.pse_free || 0) + ' ' + _('free') + ' (' + aui.fmtPct(pseP) + ')',
			pct: pseP, accent: pseCol
		}),
		E('div', { 'class': 'ai-subhead' }, 'GDM Ports'),
		E('div', { 'class': 'ai-grid ai-grid--3' }, (function() {
			// One card per external port so the device's full port list is
			// visible: each GDM-backed port uses its own FE counters, each
			// internal-switch user port (gsw*) surfaces the shared GDM
			// counters, and a PON board gets a PON uplink card.
			var cards = [];
			topoPorts.forEach(function(p) {
				if (!p) return;
				var pse = (p.pse !== undefined && p.pse !== null) ? p.pse : '?';
				if (p.kind === 'gdm') {
					if (isSwitchCpuPort(p) && topoPorts.some(function(q) {
						return q && q.kind === 'gsw' && q.pse === p.pse;
					})) return; // user ports below carry the visible labels
					cards.push(gdmCard(p.key, humanPortName(p, topo), portName(p) + ' · P' + pse, portAccent(p)));
				} else if (p.kind === 'gsw') {
					var conduit = topoPorts.filter(function(q) {
						return q && q.kind === 'gdm' && q.pse === p.pse;
					})[0];
					var feKey = conduit ? conduit.key : 'gdm1';
					cards.push(gdmCard(feKey, humanPortName(p, topo),
						portName(p) + ' · P' + pse + ' · ' + feKey.toUpperCase() + ' ' + _('shared'),
						portAccent(p)));
				}
			});
			if (topo.pon) {
				cards.unshift(aui.card({
					name: 'PON', tag: 'pon · ' + (topo.pon.mode_name || ''),
					accent: 'var(--ai-npu)',
					body: [
						aui.row(_('ONU state'), topo.pon.onu_state || '—'),
						aui.row(_('Optical signal'), (topo.pon.los === 1) ? 'LOS' : 'OK'),
						aui.row(_('Downstream'), (topo.pon.down_mbps || 0) + ' Mbps'),
						aui.row(_('Upstream'), (topo.pon.up_mbps || 0) + ' Mbps')
					]
				}));
			}
			return cards;
		})()),
		E('div', { 'class': 'ai-subhead' }, hasWifi ? 'CPU DMA / WiFi DMA' : 'CPU DMA'),
		E('div', { 'class': 'ai-grid ai-grid--3' }, [
			cdmCard('cdm1', cdm1Side ? 'CDM1 · LAN' : 'CDM1', 'P0 · ' + (cdm1Side ? cdm1Side.label : 'CPU DMA 1'), 'P0'),
			cdmCard('cdm2', cdm2Side ? 'CDM2 · ' + (cdm2Side.wan ? 'WAN' : 'LAN') : 'CDM2', 'P5 · ' + (cdm2Side ? cdm2Side.label : 'CPU DMA 2'), 'P5')
		].concat(hasWifi ? [ cdm4WiFi ] : [])),
		E('div', { 'class': 'ai-grid ai-grid--2', 'style': 'margin-top:var(--ds-sp-2)' }, [ ppeCard, npuCard ]),
		pseActive ? E('div', { 'class': 'ai-subhead' }, 'PSE Port Queue Status') : null,
		pseActive ? E('div', { 'class': 'ai-grid ai-grid--pse' }, portCells) : null
	]);
}

/* ── PPE flow table ── */
var PPE_SHOWN_MAX = 100;

/* Header badge: how many entries the backend returned, the v4/v6 split, how
 * many are actually rendered, and how many were dropped by the client cap. */
function ppeCountText(entries) {
	entries = entries || [];
	var total = entries.length;
	var shown = Math.min(total, PPE_SHOWN_MAX);
	var v4 = 0, v6 = 0;
	entries.forEach(function(e) {
		if (e && String(e.type || '').indexOf('IPv6') >= 0) v6++; else v4++;
	});
	var s = total + ' ' + _('flows') + ' · v4 ' + v4 + ' / v6 ' + v6 + ' · ' + _('showing') + ' ' + shown;
	if (total > shown) s += ' · ' + _('truncated') + ' ' + (total - shown);
	return s;
}

function ppeRows(entries) {
	if (!entries || !entries.length)
		return [ E('tr', {}, [ E('td', { 'colspan': '6' }, aui.empty(_('No data'))) ]) ];
	return entries.slice(0, PPE_SHOWN_MAX).map(function(e) {
		var eth = e.eth || '';
		if (eth === '00:00:00:00:00:00->00:00:00:00:00:00') eth = '-';
		var state = e.state === 'BND' ? aui.badge(e.state, 'bnd') : aui.badge(e.state, 'unb');
		return E('tr', {}, [
			E('td', { 'class': 'ai-num' }, e.index),
			E('td', {}, state),
			E('td', {}, String(e.type || '').indexOf('IPv6') >= 0 ? E('span', { 'style': 'color:var(--ai-band-6)' }, e.type) : e.type),
			E('td', { 'data-label': _('Original Flow'), 'style': 'color:var(--ai-npu)' }, e.orig || '-'),
			E('td', { 'data-label': _('New Flow') }, e.new_flow || '-'),
			E('td', { 'data-label': _('Ethernet') }, eth)
		]);
	});
}

function renderPpeTable(entries) {
	return E('div', { 'class': 'ai-table-wrap' }, [
		E('table', { 'class': 'ai-table ai-table--mono ai-table--stack', 'id': 'ppe-entries-table' }, [
			E('thead', {}, [
				E('tr', {}, [
					E('th', { 'scope': 'col' }, _('Index')), E('th', { 'scope': 'col' }, _('State')),
					E('th', { 'scope': 'col' }, _('Type')), E('th', { 'scope': 'col' }, _('Original Flow')),
					E('th', { 'scope': 'col' }, _('New Flow')), E('th', { 'scope': 'col' }, _('Ethernet'))
				])
			]),
			E('tbody', {}, ppeRows(entries))
		])
	]);
}

function updatePpeTable(entries) {
	var tbody = document.querySelector('#ppe-entries-table tbody');
	if (!tbody) return;
	tbody.innerHTML = '';
	ppeRows(entries).forEach(function(row) { tbody.appendChild(row); });
	var badge = document.getElementById('ppe-count');
	if (badge) badge.textContent = ppeCountText(entries);
}

/* ── Main view ── */
return view.extend({
	load: function() {
		// Progressive rendering: don't block on RPC calls, let the page render
		// immediately. Stylesheet goes in here (not in render) so it is already
		// applied when the view node is inserted — no width flash, matching the
		// fancontrol views' approach.
		aui.ensureCss();
		return Promise.resolve([]);
	},

	render: function(data) {
		data = data || [];
		aui.ensureCss();
		// These first-render defaults must mirror the live Promise.all slot order
		// further down, slot for slot. They are only ever fed the empty array
		// today (load() returns Promise.resolve([])), so a mismatch would NOT
		// surface here - it would silently mis-slot real data (e.g. show the
		// Flow Offload value in the VLAN slot) the moment load() starts
		// returning data. Whenever the Promise.all order below changes, update
		// this block in the same commit.
		var st = data[0] || {}, ppe = data[1] || {}, ti = data[2] || {}, fe = data[3] || {};
		var flo = data[4] || { enabled: 0 };
		var apo = data[5] || { enabled: 0 };
		var dm = data[6] || {};
		var topo = data[7] || {};
		var vo = data[8] || { enabled: 0 };
		var bridgeBlocked = isBridgeOffloadBlocked(dm);
		var entries = Array.isArray(ppe.entries) ? ppe.entries : [];
		var latestPpeEntries = entries;
		var ppeRequestSequence = 0;
		var latestPpeRequest = 0;
		var updatedEl = null;
		// Last cpufreq reason, so the poll can rebuild the control container when
		// the board's cpufreq availability changes. Null forces one rebuild once
		// the live status lands (the controls always exist, so their presence can
		// no longer signal "not rendered yet").
		var prevCpuReason = null;

		function markUpdated() {
			if (updatedEl)
				updatedEl.textContent = _('Updated %s').format(new Date().toLocaleTimeString());
		}

		// The page auto-polls every 5 s; the only "refresh" affordance is the
		// system-level updated-time stamp on the right. Manual Refresh /
		// Pause-Resume buttons were removed — they conflicted with it.
		updatedEl = E('span', { 'class': 'ai-updated' }, '');

		// Width policy: the root carries no width rules of its own (fancontrol
		// style) — the layout inherits the theme's content width, so the
		// late-injected stylesheet never changes geometry (no width flash).
		var view = E('div', { 'class': 'cbi-map airoha-page' }, [
			E('header', { 'class': 'ai-pagehead' }, [
				E('h2', {}, _('Airoha SoC Status')),
			E('p', { 'class': 'ai-lede' }, _('CPU frequency, NPU and frame engine, hardware offload switches · source luci.airoha_npu (5 s poll)'))
		]),

		// CPU Frequency
			aui.section({
				title: _('CPU Frequency'),
				body: E('div', {}, [
					E('div', { 'class': 'ai-grid ai-grid--2' }, [
						E('div', { 'id': 'cpu-info-content' }, [ renderCpuInfo(st) ]),
						E('div', { 'id': 'cpu-freq-card' }, [ renderFreqCard(st) ])
					]),
					E('div', { 'class': 'ai-grid', 'style': 'margin-top:var(--ds-sp-2)' }, [
						aui.card({ name: _('Control Settings'), accent: 'var(--ai-npu)', body: E('div', { 'id': 'cpu-control-content' }, [ renderControlSettings(st) ]) })
					])
				])
			}),

			// NPU & Frame Engine (unified)
			aui.section({
				title: _('NPU & Offload Engine'),
				hint: _('Switches here are write operations; the same values are mirrored read-only on the FlowSense tab so there is only one place to change them.'),
				body: E('div', {}, [
					renderSummary(st, ti),
					E('div', { 'class': 'ai-grid ai-grid--2', 'style': 'margin-top:var(--ds-sp-3)' }, [
						renderOffloadSwitch({ rowId: 'vlan-offload-row', inputId: 'vlan-offload-select', badgeId: 'vlan-offload-badge', name: _('VLAN Offload'), note: _('VLAN passthrough') + ' · bridge-nf-filter-vlan-tagged / pass-vlan-input-dev', enabled: vo.enabled, blocked: bridgeBlocked, callFn: function(v) { return callSetVlanOffload(v); } }),
						renderOffloadSwitch({ rowId: 'flow-offload-row', inputId: 'flow-offload-select', badgeId: 'flow-offload-badge', name: _('Flow Offload'), note: _('Hardware flow offload (UCI firewall)') + ' · firewall.flow_offloading + _hw', enabled: flo.enabled, blocked: false, callFn: function(v) { return callSetFlowOffload(v); } }),
						renderOffloadSwitch({ rowId: 'apmode-offload-row', inputId: 'apmode-offload-select', badgeId: 'apmode-offload-badge', name: _('AP Mode Acceleration'), note: _('Bridge firewall passthrough · PPPoE') + ' · br_netfilter', enabled: apo.enabled, blocked: bridgeBlocked, callFn: function(v) { return callSetApModeOffload(v); } })
					]),
					E('div', { 'class': 'ai-subhead' }, _('Frame Engine')),
					E('div', { 'id': 'fe-container' }, renderFeDiagram(fe, ti, st, ppe, topo))
				])
			}),

			// PPE Flow Table
			aui.section({
				title: _('PPE Flow Offload Entries'),
				count: ppeCountText(entries), countId: 'ppe-count',
				hint: _('BND = bound to hardware (NPU path); UNB = learning (CPU path). The client renders the first 100 rows.'),
				body: renderPpeTable(entries)
			})
		]);

		// Data fetch + DOM update function — called immediately and via poll.
		// Each RPC call is wrapped with .catch() so one failure doesn't block others.
		function _safeCall(promise, fallback) {
			return promise.catch(function() { return fallback; });
		}

		var fetchData = L.bind(function() {
			var requestSequence = ++ppeRequestSequence;
			return Promise.all([
				_safeCall(callNpuStatus(), {}),
				_safeCall(callPpeEntries(), { entries: [] }),
				_safeCall(callTokenInfo(), {}),
				_safeCall(callFrameEngine(), {}),
				_safeCall(callGetFlowOffload(), { enabled: 0 }),
				_safeCall(callGetApModeOffload(), { enabled: 0 }),
				_safeCall(callGetDeviceMode(), { bridge_offload_blocked: false }),
				_safeCall(callGetTopology(), {}),
				// VLAN Offload rejoined as an independent switch; appended at the
				// END so every existing d[n] index below keeps its meaning.
				_safeCall(callGetVlanOffload(), { enabled: 0 })
			]).then(L.bind(function(d) {
				aui.ensureCss();
				var st = d[0] || {}, ppe = d[1] || {}, ti = d[2] || {}, fe = d[3] || {};
				var flo = d[4] || { enabled: 0 };
				var apo = d[5] || { enabled: 0 };
				var dm = d[6] || {};
				var topo = d[7] || {};
				var vo = d[8] || { enabled: 0 };
				var bridgeBlocked = isBridgeOffloadBlocked(dm);
				var entries = Array.isArray(ppe.entries) ? ppe.entries : [];
				if (requestSequence > latestPpeRequest) {
					latestPpeRequest = requestSequence;
					latestPpeEntries = entries;
					updatePpeTable(latestPpeEntries);
				}
				updateSummary(st, ti);

				// CPU info — always re-render (just text rows, no user interaction)
				var ci = document.getElementById('cpu-info-content');
				if (ci) { ci.innerHTML = ''; ci.appendChild(renderCpuInfo(st)); }

				// Freq card — always rebuild. The old in-place path only updated
				// the bar fill/label, so the text rows (PLL Reading, Frequency
				// Range, scaling_cur_freq) kept the first-render N/A forever.
				var fc = document.getElementById('cpu-freq-card');
				if (fc) { fc.innerHTML = ''; fc.appendChild(renderFreqCard(st)); }

				// Control settings — the selects now always exist, so their presence can
				// no longer signal "not rendered yet". Rebuild the container whenever the
				// board's cpufreq availability/reason changes (cpufreq appearing or
				// disappearing between polls); otherwise update the live values in place,
				// unless the user has unsaved changes.
				var cpuReason = cpufreqReason(st);
				var gs = document.getElementById('cpu-governor-select');
				if (!gs || cpuReason !== prevCpuReason) {
					var cc = document.getElementById('cpu-control-content');
					if (cc) { cc.innerHTML = ''; cc.appendChild(renderControlSettings(st)); }
					prevCpuReason = cpuReason;
				} else if (!cpuSettingsDirty) {
					if (!gs.matches(':focus')) gs.value = st.cpu_governor || '';
					var fsSel = document.getElementById('cpu-maxfreq-select');
					if (fsSel && !fsSel.matches(':focus')) fsSel.value = (st.cpu_max_freq || 0).toString();
				}

				updateOffloadControl('vlan-offload-select', 'vlan-offload-badge', 'vlan-offload-row', vo.enabled, bridgeBlocked);
				updateOffloadControl('flow-offload-select', 'flow-offload-badge', 'flow-offload-row', flo.enabled, false);
				updateOffloadControl('apmode-offload-select', 'apmode-offload-badge', 'apmode-offload-row', apo.enabled, bridgeBlocked);

				var fcEl = document.getElementById('fe-container');
				if (fcEl) { fcEl.innerHTML = ''; fcEl.appendChild(renderFeDiagram(fe, ti, st, ppe, topo)); }

				markUpdated();
			}, this)).catch(function(err) {
				console.error('[airoha_npu] fetchData error:', err);
			});
		}, this);

		// Fetch data immediately (page shows with defaults, then updates)
		fetchData();
		// Poll for periodic updates
		poll.add(fetchData, 5);

		return view;
	},

	handleSaveApply: null, handleSave: null, handleReset: null
});
