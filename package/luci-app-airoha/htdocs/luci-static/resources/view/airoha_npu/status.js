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
var callGetWifiStats = rpc.declare({ object: 'luci.airoha_npu', method: 'getWifiStats' });
var callSetCpuSettings = rpc.declare({ object: 'luci.airoha_npu', method: 'setCpuSettings', params: ['governor', 'freq'] });

// Tracks whether the user has changed a CPU control select without saving yet.
// While dirty, the 5s poll must NOT overwrite the selects with live sysfs values.
var cpuSettingsDirty = false;

/* ── Shared state vocabulary ────────────────────────────────────────────── */

function isEnabled(value) {
	return value === true || value === 1 || value === '1';
}

function isBridgeOffloadBlocked(mode) {
	mode = mode || {};
	return isEnabled(mode.bridge_offload_blocked);
}

/* Token-pool occupancy → { text, kind }. */
function tokenHealth(c, s) {
	if (!s) return { text: _('Unknown'), kind: '' };
	var p = c / s * 100;
	return p < 50 ? { text: _('Normal'), kind: 'ok' }
		: p < 80 ? { text: _('Warning'), kind: 'warn' }
			: { text: _('Critical'), kind: 'error' };
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
	if (p && p.kind === 'gdm') return 'GDM' + p.reg;
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
	return !(p && p.netdev) || p.role === 'conduit' || String(p.netdev) === 'cpu';
}

/* LAN netdevs behind the internal switch sharing the same GDM data path. */
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
	if (p.role === 'pon') return 'PON';
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

/* Accent colour for a GDM card: CPU/internal-facing MACs are amber, the
 * externally-facing LAN/WAN MACs are green. */
function portAccent(p) {
	p = p || {};
	if (String(p.mode || '') === 'internal' || !p.netdev) return 'var(--ds-warn)';
	return 'var(--ds-ok)';
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
	var freq = hw || st.cpu_cur_freq || 0;
	return { freq: freq, min: min, max: max || freq };
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
				accent: 'var(--ds-ok)',
				label: aui.fmtFreq(s.freq),
				tall: true, fillId: 'cpu-freq-fill', labelId: 'cpu-freq-text'
			}),
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
	var freqs = splitList(avail).map(function(f) { return parseInt(f, 10); })
		.filter(function(f) { return isFinite(f) && f > 0 && f <= 1400000; })
		.filter(function(f, i, values) { return values.indexOf(f) === i; })
		.sort(function(a, b) { return a - b; })
		.map(String);
	return cpuSelect('cpu-maxfreq-select', freqs, cur || '', reason, function(f) {
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

function renderOffloadControls(topo, vo, flo, apo, blocked) {
	var id = String(topo && topo.compatible || '');
	if (!id) return null;
	var bridge = !/^gemtek,xg2010g(?:-|$)/.test(id) &&
		vo.supported !== false && apo.supported !== false;
	var controls = [
		renderOffloadSwitch({ rowId: 'flow-offload-row', inputId: 'flow-offload-select', badgeId: 'flow-offload-badge',
			name: _('Flow Offload'), enabled: flo.enabled, blocked: false, callFn: callSetFlowOffload })
	];
	if (bridge) {
		controls.unshift(renderOffloadSwitch({ rowId: 'vlan-offload-row', inputId: 'vlan-offload-select', badgeId: 'vlan-offload-badge',
			name: _('VLAN Offload'), enabled: vo.enabled, blocked: blocked, callFn: callSetVlanOffload }));
		controls.push(renderOffloadSwitch({ rowId: 'apmode-offload-row', inputId: 'apmode-offload-select', badgeId: 'apmode-offload-badge',
			name: _('AP Mode Acceleration'), enabled: apo.enabled, blocked: blocked, callFn: callSetApModeOffload }));
	}
	return E('div', { 'class': 'ai-offload-controls ai-grid' + (bridge ? ' ai-grid--3' : '') }, controls);
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

function renderEthernetPorts(topo) {
	topo = topo || {};
	var ports = (Array.isArray(topo.ports) ? topo.ports : []).filter(function(p) {
		return p && p.netdev && !isSwitchCpuPort(p);
	}).sort(function(a, b) {
		var aUp = a.role === 'wan' || a.role === 'pon';
		var bUp = b.role === 'wan' || b.role === 'pon';
		return aUp !== bUp ? (aUp ? -1 : 1) : a.netdev.localeCompare(b.netdev, undefined, { numeric: true });
	});
	function count(value) {
		return typeof value === 'number' && isFinite(value) ? value.toLocaleString() : 'N/A';
	}
	function bytes(value) {
		return typeof value === 'number' && isFinite(value) ? '%1024.2mB'.format(value) : 'N/A';
	}
	var table = aui.table({
		cols: [
			{ t: _('Port') }, { t: _('Path') }, { t: _('Link') }, { t: _('Speed / Duplex') },
			{ t: _('RX / TX bytes'), num: true }, { t: _('RX / TX packets'), num: true },
			{ t: _('RX / TX errors'), num: true }, { t: _('RX / TX dropped'), num: true }
		],
		rows: ports.map(function(p) {
			var state = p.present === false ? _('Unavailable') :
				p.carrier === 1 ? _('Up') : p.carrier === 0 ? _('Down') : _('Unknown');
			var speed = p.carrier === 1 && p.speed_mbps > 0 ? p.speed_mbps + ' Mbps' : 'N/A';
			var path = (p.kind === 'gsw' ? 'GSW' : 'GDM') + p.reg;
			if (p.nbq !== null && p.nbq !== undefined) path += ' / NBQ' + p.nbq;
			return [
				humanPortName(p, topo) + ' (' + p.netdev + ')',
				path, aui.pill(state, p.carrier === 1 ? 'ok' : ''),
				speed + (p.carrier === 1 && p.duplex ? ' / ' + p.duplex : ''),
				bytes(p.rx_bytes) + ' / ' + bytes(p.tx_bytes),
				count(p.rx_packets) + ' / ' + count(p.tx_packets),
				count(p.rx_errors) + ' / ' + count(p.tx_errors),
				count(p.rx_dropped) + ' / ' + count(p.tx_dropped)
			];
		}),
		emptyText: _('Port data unavailable')
	});
	table.classList.add('ai-port-table');
	return table;
}

/* Detailed MT7996 per-band health. The backend's has_wifi flag is
 * authoritative, so radio-less XG2010G systems do not render an empty table. */
function renderWifiDetails(wifi, ppe, ti, st) {
	wifi = wifi || {};
	if (!aui.hasWifiRadio(wifi)) return null;
	var bands = Array.isArray(wifi.bands) ? wifi.bands : [];
	var bandBnd = ppe && ppe.bnd && Array.isArray(ppe.bnd.band_bnd) ? ppe.bnd.band_bnd : [];
	var bandUnb = ppe && ppe.unb && Array.isArray(ppe.unb.band_unb) ? ppe.unb.band_unb : [];
	var rows = bands.map(function(bd) {
		var info = aui.BANDS[bd.band] || { full: 'Band ' + bd.band };
		var txPackets = Number(bd.tx_packets) || 0;
		var txRetries = Number(bd.tx_retries) || 0;
		var retry = txPackets + txRetries > 0 ? txRetries / (txPackets + txRetries) * 100 : (Number(bd.retry_pct) || 0);
		var retryColor = retry > 20 ? 'var(--ds-error)' : retry > 5 ? 'var(--ds-warn)' : 'var(--ds-ok)';
		var health = (bd.stations || 0) === 0 ? { text: _('No clients'), kind: '' } :
			retry > 50 ? { text: _('Poor'), kind: 'error' } :
				retry > 20 ? { text: _('Fair'), kind: 'warn' } : { text: _('Good'), kind: 'ok' };
		var txQueue = getTxQueue(ti, bd.band);
		var queueType = txQueue && txQueue.type ? String(txQueue.type).toUpperCase() :
			(isEnabled(st && st.npu_loaded) ? 'NPU' : 'DMA');
		var signal = (bd.stations || 0) > 0 ? (bd.avg_signal || 0) + ' / ' + (bd.min_signal || 0) : 'N/A';
		return [
			info.full,
			'P7 / ' + queueType,
			aui.pill(health.text, health.kind),
			String(bd.stations || 0),
			E('span', { 'style': 'color:' + retryColor }, retry.toFixed(1) + '%'),
			(bd.airtime_efficiency || 0) + '%',
			(bd.avg_phy_rate || 0) + ' / ' + (bd.avg_exp_throughput || 0),
			String(bd.tx_failed || 0),
			signal,
			String(bd.tx_mbps || 0),
			(bandBnd[bd.band] || 0) + ' / ' + (bandUnb[bd.band] || 0)
		];
	});
	var table = aui.table({
		mono: true, stack: true, emptyText: _('No entries'),
		cols: [
			{ t: _('Band') }, { t: _('Path') }, { t: _('Status') }, { t: _('Clients'), num: true },
			{ t: _('Retry'), num: true }, { t: _('Airtime'), num: true }, { t: _('PHY / Expected'), num: true },
			{ t: _('Failed'), num: true }, { t: _('Signal'), num: true }, { t: _('TX') + ' Mbps', num: true },
			{ t: 'BND / UNB', num: true }
		],
		rows: rows
	});
	table.classList.add('ai-port-table');
	return aui.section({
		title: _('WiFi Band Details'),
		hint: _('Per-band airtime efficiency, negotiated and expected rates, failure counts and BND/UNB ownership.'),
		body: table
	});
}

/* ── NPU and PPE engine status ── */
function renderEngineStatus(st, ppe) {
	st = st || {}; ppe = ppe || {};
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

	return E('div', { 'class': 'ai-grid ai-grid--2', 'style': 'margin-top:var(--ds-sp-2)' }, [ ppeCard, npuCard ]);
}

/* ── PPE flow table ── */
var PPE_SHOWN_MAX = 50;
var ppeStateFilter = '', ppeTypeFilter = '', ppePage = 0;
var ppeCurrentEntries = [], ppeCurrentMeta = {};

function filteredPpeEntries(entries) {
	return (entries || []).filter(function(e) {
		return e && (!ppeStateFilter || e.state === ppeStateFilter) &&
			(!ppeTypeFilter || String(e.type).split(' ')[0] === ppeTypeFilter);
	});
}

/* Header badge: how many entries the backend returned, the v4/v6 split, how
 * many are actually rendered, and how many were dropped by the client cap. */
function ppeCountText(entries) {
	entries = entries || [];
	if (ppeCurrentMeta.available === false) return _('PPE table unavailable');
	var total = ppeCurrentMeta.total === undefined ? entries.length : ppeCurrentMeta.total;
	var s = total + ' ' + _('flows') + ' · BND ' +
		(ppeCurrentMeta.bound || 0) + ' / UNB ' + (ppeCurrentMeta.unbound || 0) +
		' · IPv4 ' + (ppeCurrentMeta.ipv4 || 0) + ' / IPv6 ' + (ppeCurrentMeta.ipv6 || 0) +
		' / L2B ' + (ppeCurrentMeta.l2b || 0);
	if (ppeCurrentMeta.truncated) s += ' · ' + _('showing') + ' ' + entries.length + ' / ' + total;
	return s;
}

function ppeRows(entries) {
	entries = filteredPpeEntries(entries);
	if (!entries || !entries.length)
		return [ E('tr', {}, [ E('td', { 'colspan': '9' }, aui.empty(ppeCurrentMeta.available === false ? _('PPE table unavailable') : _('No matching flows'))) ]) ];
	return entries.slice(ppePage * PPE_SHOWN_MAX, (ppePage + 1) * PPE_SHOWN_MAX).map(function(e) {
		var eth = e.eth || '';
		if (eth === '00:00:00:00:00:00->00:00:00:00:00:00') eth = '-';
		var state = e.state === 'BND' ? aui.badge(e.state, 'bnd') : aui.badge(e.state, 'unb');
		return E('tr', {}, [
			E('td', { 'class': 'ai-num', 'data-label': _('Index') }, e.index),
			E('td', { 'data-label': _('State') }, state),
			E('td', { 'data-label': _('Type') }, e.type + (e.proto ? ' ' + e.proto : '')),
			E('td', { 'data-label': 'VLAN' }, e.vlan || '-'),
			E('td', { 'data-label': _('Original Flow'), 'style': 'color:var(--ai-npu)' }, e.orig || '-'),
			E('td', { 'data-label': _('New Flow') }, e.new_flow || '-'),
			E('td', { 'data-label': _('Ethernet') }, eth),
			E('td', { 'data-label': _('Packets'), 'class': 'ai-num' }, e.packets === null || e.packets === undefined ? 'N/A' : String(e.packets)),
			E('td', { 'data-label': _('Bytes'), 'class': 'ai-num' }, e.bytes === null || e.bytes === undefined ? 'N/A' : String(e.bytes))
		]);
	});
}

function renderPpeTable(entries) {
	function selectFilter(label, values, change) {
		return E('select', { 'aria-label': label, 'change': function(event) {
			change(event.target.value);
			ppePage = 0;
			updatePpeTable(ppeCurrentEntries);
		} }, [E('option', { value: '' }, label)].concat(values.map(function(value) {
			return E('option', { value: value }, value);
		})));
	}
	var tools = E('div', { 'style': 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px' }, [
		selectFilter(_('All states'), ['BND', 'UNB', 'FIN'], function(value) { ppeStateFilter = value; }),
		selectFilter(_('All types'), ['IPv4', 'IPv6', 'L2B', 'DS-LITE', '6RD'], function(value) { ppeTypeFilter = value; }),
		E('button', { 'type': 'button', 'class': 'cbi-button', 'id': 'ppe-prev', 'title': _('Previous page'),
			'aria-label': _('Previous page'), 'style': 'width:32px;height:32px', 'click': function() {
				ppePage = Math.max(0, ppePage - 1); updatePpeTable(ppeCurrentEntries);
			} }, '\u2039'),
		E('span', { 'id': 'ppe-page', 'style': 'min-width:6em;text-align:center;font-variant-numeric:tabular-nums' }, '1 / 1'),
		E('button', { 'type': 'button', 'class': 'cbi-button', 'id': 'ppe-next', 'title': _('Next page'),
			'aria-label': _('Next page'), 'style': 'width:32px;height:32px', 'click': function() {
				ppePage++; updatePpeTable(ppeCurrentEntries);
			} }, '\u203a')
	]);
	return E('div', {}, [tools, E('div', { 'class': 'ai-table-wrap' }, [
		E('table', { 'class': 'ai-table ai-table--mono ai-table--stack', 'id': 'ppe-entries-table' }, [
			E('thead', {}, [
				E('tr', {}, [
					E('th', { 'scope': 'col' }, _('Index')), E('th', { 'scope': 'col' }, _('State')),
					E('th', { 'scope': 'col' }, _('Type')), E('th', { 'scope': 'col' }, 'VLAN'),
					E('th', { 'scope': 'col' }, _('Original Flow')), E('th', { 'scope': 'col' }, _('New Flow')),
					E('th', { 'scope': 'col' }, _('Ethernet')), E('th', { 'scope': 'col' }, _('Packets')),
					E('th', { 'scope': 'col' }, _('Bytes'))
				])
			]),
			E('tbody', {}, ppeRows(entries))
		])
	])]);
}

function updatePpeTable(entries, metadata) {
	ppeCurrentEntries = entries || [];
	if (metadata) ppeCurrentMeta = metadata;
	var filtered = filteredPpeEntries(ppeCurrentEntries);
	var pages = Math.max(1, Math.ceil(filtered.length / PPE_SHOWN_MAX));
	ppePage = Math.max(0, Math.min(ppePage, pages - 1));
	var tbody = document.querySelector('#ppe-entries-table tbody');
	if (!tbody) return;
	tbody.innerHTML = '';
	ppeRows(entries).forEach(function(row) { tbody.appendChild(row); });
	var badge = document.getElementById('ppe-count');
	if (badge) badge.textContent = ppeCountText(entries);
	var page = document.getElementById('ppe-page');
	if (page) page.textContent = (ppePage + 1) + ' / ' + pages;
	var previous = document.getElementById('ppe-prev'), next = document.getElementById('ppe-next');
	if (previous) previous.disabled = ppePage === 0;
	if (next) next.disabled = ppePage + 1 >= pages;
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
		var st = data[0] || {}, ppe = data[1] || {}, ti = data[2] || {};
		var flo = data[3] || { enabled: 0 };
		var apo = data[4] || { enabled: 0 };
		var dm = data[5] || {};
		var topo = data[6] || {};
		var vo = data[7] || { enabled: 0 };
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
		]),

			aui.section({
				title: _('Ethernet Ports'),
				body: E('div', { 'id': 'ethernet-ports' }, renderEthernetPorts(topo))
			}),

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

			// NPU and hardware offload controls/status.
			aui.section({
				title: _('NPU & Offload Engine'),
				hint: _('Switches here apply the hardware offload settings for this device.'),
				body: E('div', {}, [
					renderSummary(st, ti),
					E('div', { 'id': 'offload-controls', 'style': 'margin-top:var(--ds-sp-3)' },
						renderOffloadControls(topo, vo, flo, apo, bridgeBlocked)),
					E('div', { 'id': 'engine-status' }, renderEngineStatus(st, ppe))
				])
			}),

			E('div', { 'id': 'wifi-detail' }),

			// PPE Flow Table
			aui.section({
				title: _('PPE Flow Offload Entries'),
				count: ppeCountText(entries), countId: 'ppe-count',
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
				_safeCall(callPpeEntries(), { available: false, entries: [] }),
				_safeCall(callTokenInfo(), {}),
				_safeCall(callGetFlowOffload(), { enabled: 0 }),
				_safeCall(callGetApModeOffload(), { enabled: 0 }),
				_safeCall(callGetDeviceMode(), { bridge_offload_blocked: false }),
				_safeCall(callGetTopology(), {}),
				// VLAN Offload rejoined as an independent switch; appended at the
				// END so every existing d[n] index below keeps its meaning.
				_safeCall(callGetVlanOffload(), { enabled: 0 }),
				_safeCall(callGetWifiStats(), { available: false, bands: [] })
			]).then(L.bind(function(d) {
				aui.ensureCss();
				var st = d[0] || {}, ppe = d[1] || {}, ti = d[2] || {};
				var flo = d[3] || { enabled: 0 };
				var apo = d[4] || { enabled: 0 };
				var dm = d[5] || {};
				var topo = d[6] || {};
				var vo = d[7] || { enabled: 0 };
				var wifi = d[8] || { available: false, bands: [] };
				if (typeof wifi.has_wifi !== 'boolean' && typeof ti.has_wifi === 'boolean')
					wifi.has_wifi = ti.has_wifi;
				var bridgeBlocked = isBridgeOffloadBlocked(dm);
				var entries = Array.isArray(ppe.entries) ? ppe.entries : [];
				if (requestSequence > latestPpeRequest) {
					latestPpeRequest = requestSequence;
					latestPpeEntries = entries;
					updatePpeTable(latestPpeEntries, ppe);
				}
				updateSummary(st, ti);

				// CPU info — always re-render (just text rows, no user interaction)
				var ci = document.getElementById('cpu-info-content');
				if (ci) { ci.innerHTML = ''; ci.appendChild(renderCpuInfo(st)); }

				// Freq card — always rebuild so the range and scaling_cur_freq rows
				// never retain their first-render N/A values.
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

				var controls = document.getElementById('offload-controls');
				var controlBoard = String(topo.compatible || '') + ':' + (vo.supported !== false && apo.supported !== false);
				if (controls && topo.compatible && controls.getAttribute('data-board') !== controlBoard) {
					controls.replaceChildren(renderOffloadControls(topo, vo, flo, apo, bridgeBlocked));
					controls.setAttribute('data-board', controlBoard);
				}

				var engineEl = document.getElementById('engine-status');
				if (engineEl) engineEl.replaceChildren(renderEngineStatus(st, ppe));
				var epEl = document.getElementById('ethernet-ports');
				if (epEl) { epEl.innerHTML = ''; epEl.appendChild(renderEthernetPorts(topo)); }
				var wifiEl = document.getElementById('wifi-detail');
				if (wifiEl) {
					wifiEl.replaceChildren();
					var wifiDetails = renderWifiDetails(wifi, ppe, ti, st);
					if (wifiDetails) wifiEl.appendChild(wifiDetails);
				}

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
