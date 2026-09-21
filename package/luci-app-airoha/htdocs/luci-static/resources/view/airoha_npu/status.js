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
var callGetVlanOffload = rpc.declare({ object: 'luci.airoha_npu', method: 'getVlanOffload' });
var callSetVlanOffload = rpc.declare({ object: 'luci.airoha_npu', method: 'setVlanOffload', params: ['enabled'] });
var callGetPppoeOffload = rpc.declare({ object: 'luci.airoha_npu', method: 'getPppoeOffload' });
var callSetPppoeOffload = rpc.declare({ object: 'luci.airoha_npu', method: 'setPppoeOffload', params: ['enabled'] });
var callGetFlowOffload = rpc.declare({ object: 'luci.airoha_npu', method: 'getFlowOffload' });
var callSetFlowOffload = rpc.declare({ object: 'luci.airoha_npu', method: 'setFlowOffload', params: ['enabled'] });
var callGetApModeOffload = rpc.declare({ object: 'luci.airoha_npu', method: 'getApModeOffload' });
var callSetApModeOffload = rpc.declare({ object: 'luci.airoha_npu', method: 'setApModeOffload', params: ['enabled'] });
var callGetDeviceMode = rpc.declare({ object: 'luci.airoha_npu', method: 'getDeviceMode' });
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

function calcTotalMem(regions) {
	var t = 0;
	(regions || []).forEach(function(r) {
		var m = (r.size || '').match(/(\d+)\s*(KiB|MiB|GiB)/i);
		if (m) { var s = parseInt(m[1]); var u = m[2][0].toUpperCase(); t += u === 'G' ? s * 1048576 : u === 'M' ? s * 1024 : s; }
	});
	return t >= 1024 ? (t / 1024).toFixed(0) + ' MiB' : t + ' KiB';
}

var psePortMap = [
	{ name: 'CDM1', label: 'CPU DMA 1',   color: 'var(--ai-cpu)' },
	{ name: 'GDM1', label: 'Switch 1G',   color: 'var(--ds-warn)' },
	{ name: 'GDM2', label: 'WAN 10G',     color: 'var(--ds-ok)' },
	{ name: 'GDM3', label: 'GDM3',        color: 'var(--ds-border-strong)' },
	{ name: 'PPE1', label: 'PPE Eng 1',   color: 'var(--ai-npu)' },
	{ name: 'CDM2', label: 'CPU DMA 2',   color: 'var(--ai-cpu)' },
	{ name: 'CDM3', label: 'CDM3',        color: 'var(--ds-border-strong)' },
	{ name: 'CDM4', label: 'WDMA WiFi',   color: 'var(--ai-band-6)' },
	{ name: 'PPE2', label: 'PPE Eng 2',   color: 'var(--ai-npu)' },
	{ name: 'GDM4', label: 'LAN2 10G',    color: 'var(--ds-ok)' }
];

/* ── Summary tiles ── */
function npuSummaryTiles(st, ti) {
	st = st || {}; ti = ti || {};
	var active = isEnabled(st.npu_loaded);
	var clock = st.npu_clock ? Math.round(st.npu_clock / 1000000) : 0;
	var bound = st.offload_bound || 0;
	var total = st.offload_total || 0;
	var mem = Array.isArray(st.memory_regions) ? st.memory_regions : [];

	// TX token pool — the hardware send tokens the NPU/WDMA draws from. This is
	// the reading the old view never surfaced.
	var tokCount = Number(ti.token_count) || 0;
	var tokSize = Number(ti.token_size) || 0;
	var tokPct = tokSize > 0 ? tokCount / tokSize * 100 : 0;
	var tokAccent = !tokSize ? 'var(--ds-text-muted)'
		: tokPct < 50 ? 'var(--ds-ok)'
			: tokPct < 80 ? 'var(--ds-warn)' : 'var(--ds-error)';

	var temp = (st.cpu_temp && st.cpu_temp !== 'N/A') ? st.cpu_temp : '';

	return {
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
		'npu-summary-memory': aui.tile({
			id: 'npu-summary-memory', title: _('Reserved Memory'),
			value: calcTotalMem(mem), accent: 'var(--ai-band-6)',
			sub: mem.length + ' ' + _('memory regions')
		}),
		'npu-summary-token': aui.tile({
			id: 'npu-summary-token', title: _('TX Token Pool'),
			value: tokSize > 0 ? (tokCount + ' / ' + tokSize) : 'N/A',
			accent: tokAccent,
			sub: tokSize > 0 ? (_('used') + ' ' + aui.fmtPct(tokPct, 0)) : _('Unknown')
		}),
		'npu-summary-temp': aui.tile({
			id: 'npu-summary-temp', title: _('CPU Temperature'),
			value: temp ? temp.replace(/[^\d.]/g, '') : '—', unit: temp ? '°C' : '',
			accent: 'var(--ds-ok)',
			sub: (st.cpu_count || 0) + ' ' + _('cores') + ' · ' + (st.soc_compat || '')
		})
	};
}

var SUMMARY_IDS = [
	'npu-summary-status', 'npu-summary-clock', 'npu-summary-flows',
	'npu-summary-memory', 'npu-summary-token', 'npu-summary-temp'
];

function renderSummary(st, ti) {
	var tiles = npuSummaryTiles(st, ti);
	return E('div', { 'class': 'ai-grid ai-grid--tiles', 'id': 'npu-summary-grid' },
		SUMMARY_IDS.map(function(id) { return tiles[id]; }));
}

function updateSummary(st, ti) {
	var grid = document.getElementById('npu-summary-grid');
	if (!grid) return;
	var tiles = npuSummaryTiles(st, ti);
	grid.innerHTML = '';
	SUMMARY_IDS.forEach(function(id) { grid.appendChild(tiles[id]); });
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
		name: _('CPU Info'), tag: 'cpuinfo / thermal', accent: 'var(--ai-npu)',
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
		name: _('Current Frequency'), tag: 'cpufreq / PLL', accent: 'var(--ds-ok)',
		body: [
			aui.bar({
				title: 'cpuinfo_cur_freq', right: aui.fmtFreq(s.freq) + ' / ' + aui.fmtFreq(s.max),
				pct: (s.max > s.min) ? Math.round((s.freq - s.min) / (s.max - s.min) * 100) : 0,
				accent: s.oc ? 'var(--ds-warn)' : 'var(--ds-ok)',
				label: s.oc ? ((st.pll_freq_mhz || 0) + ' MHz (OC)') : aui.fmtFreq(s.freq),
				tall: true, fillId: 'cpu-freq-fill', labelId: 'cpu-freq-text'
			}),
			aui.row(_('PLL Reading'), aui.fmtFreq((st.pll_freq_mhz || 0) * 1000)),
			aui.row(_('Frequency Range'), aui.fmtFreq(st.cpu_min_freq) + ' – ' + aui.fmtFreq(st.cpu_max_freq)),
			aui.row('scaling_cur_freq', aui.fmtFreq(st.cpu_cur_freq))
		]
	});
}

function updateFreqCard(st) {
	st = st || {};
	var s = freqState(st);
	var min = st.cpu_min_freq || 0;
	var pct = (s.max > min) ? Math.round((s.freq - min) / (s.max - min) * 100) : 0;
	pct = Math.max(0, Math.min(100, pct));
	var fill = document.getElementById('cpu-freq-fill');
	if (fill) {
		fill.style.width = pct + '%';
		fill.style.background = s.oc ? 'var(--ds-warn)' : 'var(--ds-ok)';
	}
	var text = document.getElementById('cpu-freq-text');
	if (text) text.textContent = s.oc ? ((st.pll_freq_mhz || 0) + ' MHz (OC)') : aui.fmtFreq(s.freq);
}

/* ── CPU control settings (governor / max freq + save) ── */
function governorLabel(governor) {
	var labels = {
		conservative: _('conservative'), ondemand: _('ondemand'), performance: _('performance'),
		powersave: _('powersave'), schedutil: 'schedutil', userspace: _('userspace')
	};
	return labels[governor] || governor;
}

function renderGovSelect(avail, active) {
	var gs = (avail || '').trim().split(/\s+/).filter(Boolean);
	if (!gs.length) return E('span', {}, 'N/A');
	return E('select', {
		'id': 'cpu-governor-select', 'class': 'cbi-input-select',
		'change': function() { cpuSettingsDirty = true; updateCpuSettingsHint(); }
	}, gs.map(function(g) {
		return E('option', { 'value': g, 'selected': g === active ? '' : null }, governorLabel(g));
	}));
}

function renderMaxFreqSelect(avail, cur) {
	var fs = (avail || '').trim().split(/\s+/).filter(Boolean);
	if (!fs.length) return E('span', {}, 'N/A');
	return E('select', {
		'id': 'cpu-maxfreq-select', 'class': 'cbi-input-select',
		'change': function() { cpuSettingsDirty = true; updateCpuSettingsHint(); }
	}, fs.map(function(f) {
		return E('option', { 'value': f, 'selected': parseInt(f) === parseInt(cur) ? '' : null }, (parseInt(f) / 1000).toFixed(0) + ' MHz');
	}));
}

function updateCpuSettingsHint() {
	var hint = document.getElementById('cpu-settings-hint');
	if (!hint) return;
	if (cpuSettingsDirty) { hint.textContent = _('Unsaved changes'); hint.style.color = 'var(--ds-warn)'; }
	else { hint.textContent = ''; hint.style.color = ''; }
}

function renderControlSettings(st) {
	// Container rebuilt from live status → selections reflect what is currently applied.
	cpuSettingsDirty = false;

	var saveBtn = E('button', {
		'id': 'cpu-settings-save',
		'class': 'ai-btn ai-btn--primary',
		'click': function(ev) {
			var btn = ev.target;
			var gs = document.getElementById('cpu-governor-select');
			var fs = document.getElementById('cpu-maxfreq-select');
			if (!gs || !fs) return;
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

	var hint = E('span', { 'id': 'cpu-settings-hint', 'class': 'ai-muted' }, '');

	return E('div', { 'class': 'ai-form' }, [
		E('div', { 'class': 'ai-field' }, [
			E('label', { 'class': 'ai-field-label', 'for': 'cpu-governor-select' }, _('Governor')),
			renderGovSelect(st.cpu_avail_governors, st.cpu_governor)
		]),
		E('div', { 'class': 'ai-field' }, [
			E('label', { 'class': 'ai-field-label', 'for': 'cpu-maxfreq-select' }, _('Max Freq')),
			renderMaxFreqSelect(st.cpu_avail_freqs, st.cpu_max_freq)
		]),
		saveBtn,
		hint
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
function renderFeDiagram(fe, ti, st, ppe) {
	if (!fe || fe.error) return aui.empty(_('Frame engine data is not available on this build'));
	ti = ti || {}; st = st || {}; ppe = ppe || {};
	var ports = Array.isArray(fe.pse_ports) ? fe.pse_ports : [];

	function gdmCard(key, name, label, accent, pse) {
		var d = fe[key] || {};
		var body = [ aui.row('TX', aui.fmtK(d.tx)), aui.row('RX', aui.fmtK(d.rx)) ];
		if (d.tx_drop > 0) body.push(aui.row('TX Drop', aui.fmtK(d.tx_drop), 'ai-err'));
		if (d.rx_drop > 0) body.push(aui.row('RX Drop', aui.fmtK(d.rx_drop), 'ai-err'));
		body.push(aui.row(_('State'), (d.tx > 0 || d.rx > 0) ? _('Active') : _('Idle')));
		return aui.card({ name: name, tag: pse + ' · ' + label, accent: accent, body: body });
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

	var p7 = ports[7] || { iq: 0, oq: 0, drops: 0 };
	var cdm4WiFi = aui.card({
		name: 'CDM4 / WDMA', tag: 'P7 WiFi DMA', accent: 'var(--ai-band-6)',
		body: [
			aui.bar({ title: 'IQ / OQ', right: 'IQ ' + p7.iq + ' · OQ ' + p7.oq, pct: (p7.oq / 256 * 100), accent: 'var(--ai-band-6)' }),
			E('div', { 'class': 'ai-subhead', 'style': 'margin:var(--ds-sp-2) 0 var(--ds-sp-1)' }, _('Bands')),
			E('div', { 'class': 'ai-grid ai-grid--bands', 'style': 'gap:var(--ds-sp-1)' }, bandChips)
		]
	});

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

	var portCells = ports.filter(function(p) { return p.port !== 7; }).map(function(p) {
		var info = psePortMap[p.port] || { name: 'P' + p.port, label: '?', color: 'var(--ds-text-muted)' };
		return aui.tile({
			title: 'P' + p.port + ' ' + info.name,
			value: p.iq + ' / ' + p.oq,
			accent: p.drops > 0 ? 'var(--ds-error)' : 'var(--ds-border)',
			sub: 'IQ / OQ' + (p.drops > 0 ? ' · ' + _('Drop') + ' ' + aui.fmtK(p.drops) : '')
		});
	});

	// Reserved-memory regions — surfaced as a collapsible table so the addresses
	// behind the summary tile's total are inspectable without cluttering the page.
	var mem = Array.isArray(st.memory_regions) ? st.memory_regions : [];
	var memRows = mem.map(function(r) {
		return [ (r.name || '') + ' (' + (r.size || '') + ')', (r.start || '—') + ' → ' + (r.end || '—') ];
	});

	return E('div', { 'id': 'fe-diagram' }, [
		aui.bar({
			title: 'PSE Shared Buffer', right: (fe.pse_used || 0) + ' ' + _('used') + ' / ' + (fe.pse_free || 0) + ' ' + _('free') + ' (' + aui.fmtPct(pseP) + ')',
			pct: pseP, accent: pseCol
		}),
		E('div', { 'class': 'ai-subhead' }, 'GDM Ports'),
		E('div', { 'class': 'ai-grid ai-grid--3' }, [
			gdmCard('gdm1', 'GDM1', 'Internal Switch (1G LAN3/4)', 'var(--ds-warn)', 'P1'),
			gdmCard('gdm2', 'GDM2', 'WAN (USXGMII 10G)', 'var(--ds-ok)', 'P2'),
			gdmCard('gdm4', 'GDM4', 'LAN2 (USXGMII 10G)', 'var(--ds-ok)', 'P9')
		]),
		E('div', { 'class': 'ai-subhead' }, 'CPU DMA / WiFi DMA'),
		E('div', { 'class': 'ai-grid ai-grid--3' }, [
			cdmCard('cdm1', 'CDM1', 'CPU DMA 1', 'P0'),
			cdmCard('cdm2', 'CDM2', 'CPU DMA 2', 'P5'),
			cdm4WiFi
		]),
		E('div', { 'class': 'ai-grid ai-grid--2', 'style': 'margin-top:var(--ds-sp-2)' }, [ ppeCard, npuCard ]),
		E('div', { 'class': 'ai-subhead' }, 'PSE Port Queue Status'),
		E('div', { 'class': 'ai-grid ai-grid--pse' }, portCells),
		mem.length ? aui.details(_('Reserved Memory') + ' · ' + mem.length + ' ' + _('memory regions'), aui.kv(memRows)) : null
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
		// Progressive rendering: don't block on RPC calls, let the page render immediately
		return Promise.resolve([]);
	},

	render: function(data) {
		data = data || [];
		aui.ensureCss();
		var st = data[0] || {}, ppe = data[1] || {}, ti = data[2] || {}, fe = data[3] || {};
		var vo = data[4] || { enabled: 0 }, ppo = data[5] || { enabled: 0 }, flo = data[6] || { enabled: 0 };
		var apo = data[7] || { enabled: 0 };
		var dm = data[8] || {};
		var bridgeBlocked = isBridgeOffloadBlocked(dm);
		var entries = Array.isArray(ppe.entries) ? ppe.entries : [];
		var ppeUpdatesPaused = false;
		var latestPpeEntries = entries;
		var ppeRequestSequence = 0;
		var latestPpeRequest = 0;
		var updatedEl = null;

		function markUpdated() {
			if (updatedEl)
				updatedEl.textContent = _('Updated %s').format(new Date().toLocaleTimeString());
		}

		var refreshBtn = E('button', { 'type': 'button', 'class': 'ai-btn ai-btn--primary' }, _('Refresh'));
		refreshBtn.addEventListener('click', function() {
			var self = refreshBtn, orig = self.textContent;
			self.disabled = true;
			self.textContent = _('Refreshing…');
			var done = function() { self.disabled = false; self.textContent = orig; };
			Promise.resolve(fetchData()).then(done, done);
		});

		var ppePauseButton = E('button', {
			'type': 'button',
			'class': 'ai-btn',
			'title': _('Pause'),
			'aria-pressed': 'false',
			'click': function(ev) {
				ppeUpdatesPaused = !ppeUpdatesPaused;
				var label = ppeUpdatesPaused ? _('Resume') : _('Pause');
				ev.currentTarget.textContent = label;
				ev.currentTarget.title = label;
				ev.currentTarget.setAttribute('aria-pressed', ppeUpdatesPaused ? 'true' : 'false');
				ev.currentTarget.className = 'ai-btn' + (ppeUpdatesPaused ? ' ai-btn--active' : '');
				if (!ppeUpdatesPaused) updatePpeTable(latestPpeEntries);
			}
		}, _('Pause'));

		updatedEl = E('span', { 'class': 'ai-updated' }, '');

		var view = E('div', { 'class': 'cbi-map airoha-page' }, [
			E('header', { 'class': 'ai-pagehead' }, [
				E('h2', {}, _('Airoha SoC Status')),
				E('p', { 'class': 'ai-lede' }, _('CPU frequency, NPU and frame engine, hardware offload switches · source luci.airoha_npu (5 s poll)'))
			]),
			E('div', { 'class': 'ai-toolbar' }, [ refreshBtn, ppePauseButton, E('span', { 'class': 'ai-spacer' }), updatedEl ]),

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
						renderOffloadSwitch({ rowId: 'vlan-offload-row', inputId: 'vlan-offload-select', badgeId: 'vlan-offload-badge', name: _('VLAN Offload'), note: 'bridge-nf-filter-vlan-tagged', enabled: vo.enabled, blocked: bridgeBlocked, callFn: function(v) { return callSetVlanOffload(v); } }),
						renderOffloadSwitch({ rowId: 'pppoe-offload-row', inputId: 'pppoe-offload-select', badgeId: 'pppoe-offload-badge', name: _('PPPoE Offload'), note: 'bridge-nf-filter-pppoe-tagged', enabled: ppo.enabled, blocked: bridgeBlocked, callFn: function(v) { return callSetPppoeOffload(v); } }),
						renderOffloadSwitch({ rowId: 'flow-offload-row', inputId: 'flow-offload-select', badgeId: 'flow-offload-badge', name: _('Flow Offload'), note: 'firewall.flow_offloading + _hw', enabled: flo.enabled, blocked: false, callFn: function(v) { return callSetFlowOffload(v); } }),
						renderOffloadSwitch({ rowId: 'apmode-offload-row', inputId: 'apmode-offload-select', badgeId: 'apmode-offload-badge', name: _('AP Mode Acceleration'), note: 'br_netfilter + VLAN passthrough', enabled: apo.enabled, blocked: bridgeBlocked, callFn: function(v) { return callSetApModeOffload(v); } })
					]),
					E('div', { 'class': 'ai-subhead' }, _('Frame Engine')),
					E('div', { 'id': 'fe-container' }, renderFeDiagram(fe, ti, st, ppe))
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
				_safeCall(callGetVlanOffload(), { enabled: 0 }),
				_safeCall(callGetPppoeOffload(), { enabled: 0 }),
				_safeCall(callGetFlowOffload(), { enabled: 0 }),
				_safeCall(callGetApModeOffload(), { enabled: 0 }),
				_safeCall(callGetDeviceMode(), { bridge_offload_blocked: false })
			]).then(L.bind(function(d) {
				aui.ensureCss();
				var st = d[0] || {}, ppe = d[1] || {}, ti = d[2] || {}, fe = d[3] || {};
				var vo = d[4] || { enabled: 0 }, ppo = d[5] || { enabled: 0 }, flo = d[6] || { enabled: 0 };
				var apo = d[7] || { enabled: 0 };
				var dm = d[8] || {};
				var bridgeBlocked = isBridgeOffloadBlocked(dm);
				var entries = Array.isArray(ppe.entries) ? ppe.entries : [];
				if (requestSequence > latestPpeRequest) {
					latestPpeRequest = requestSequence;
					latestPpeEntries = entries;
					if (!ppeUpdatesPaused) updatePpeTable(latestPpeEntries);
				}
				updateSummary(st, ti);

				// CPU info — always re-render (just text rows, no user interaction)
				var ci = document.getElementById('cpu-info-content');
				if (ci) { ci.innerHTML = ''; ci.appendChild(renderCpuInfo(st)); }

				// Freq card — update the bar in place if present, else rebuild the card
				var freqText = document.getElementById('cpu-freq-text');
				if (freqText) {
					updateFreqCard(st);
				} else {
					var fc = document.getElementById('cpu-freq-card');
					if (fc) { fc.innerHTML = ''; fc.appendChild(renderFreqCard(st)); }
				}

				// Control settings — update values if selects exist, otherwise re-render.
				// While there are unsaved changes, leave the selects alone so the pick is kept.
				var gs = document.getElementById('cpu-governor-select');
				if (gs) {
					if (!cpuSettingsDirty) {
						if (!gs.matches(':focus')) gs.value = st.cpu_governor || '';
						var fs = document.getElementById('cpu-maxfreq-select');
						if (fs && !fs.matches(':focus')) fs.value = (st.cpu_max_freq || 0).toString();
					}
				} else {
					var cc = document.getElementById('cpu-control-content');
					if (cc) { cc.innerHTML = ''; cc.appendChild(renderControlSettings(st)); }
				}

				updateOffloadControl('vlan-offload-select', 'vlan-offload-badge', 'vlan-offload-row', vo.enabled, bridgeBlocked);
				updateOffloadControl('pppoe-offload-select', 'pppoe-offload-badge', 'pppoe-offload-row', ppo.enabled, bridgeBlocked);
				updateOffloadControl('flow-offload-select', 'flow-offload-badge', 'flow-offload-row', flo.enabled, false);
				updateOffloadControl('apmode-offload-select', 'apmode-offload-badge', 'apmode-offload-row', apo.enabled, bridgeBlocked);

				var fcEl = document.getElementById('fe-container');
				if (fcEl) { fcEl.innerHTML = ''; fcEl.appendChild(renderFeDiagram(fe, ti, st, ppe)); }

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
