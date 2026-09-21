'use strict';
'require view';
'require poll';
'require rpc';
'require ui';
'require view.airoha.ui as aui';

/* ── Drop-delta tracking (all counters are cumulative since interface up) ── */
var _prevPseDrops    = null;
var _prevCdmHwfDrops = null;
var _prevBridgeDrops = null;
var _prevPpeBnd      = null;  // for tachometer heartbeat
var _maxUnbSeen      = 8;     // UNB scale denominator — only grows, never shrinks

/* ── Ping target (the Latency card is click-to-edit) ──
 * `_cfgPingTarget` is the value stored in uci, refreshed on every poll, so the
 * card shows what is actually configured even while the jitter daemon is down
 * and its /tmp result file is missing. `_pingRefresh` is installed by render()
 * so the editor modal can repaint the card at once instead of waiting up to 5 s
 * for the next poll. */
var _cfgPingTarget = '';
var _pingRefresh = null;

/* ── RPC Declarations ── */
var callGetOverview  = rpc.declare({ object: 'luci.airoha_flowsense', method: 'getOverview' });
var callGetPingTarget = rpc.declare({ object: 'luci.airoha_flowsense', method: 'getPingTarget' });
var callSetPingTarget = rpc.declare({ object: 'luci.airoha_flowsense', method: 'setPingTarget', params: ['target'] });

/* ── Token aliases ──
 * Every colour below resolves through the shared design tokens (ds-tokens.js),
 * so a single dark-mode re-tune repaints the gauges, cards and tables. */
var C = {
	npu: 'var(--ai-npu)', cpu: 'var(--ai-cpu)', load: 'var(--ai-load)',
	ok: 'var(--ds-ok)', warn: 'var(--ds-warn)', err: 'var(--ds-error)', info: 'var(--ds-info)',
	muted: 'var(--ds-text-muted)', text: 'var(--ds-text)',
	border: 'var(--ds-border)', borderStrong: 'var(--ds-border-strong)',
	surface: 'var(--ds-surface)', sunken: 'var(--ds-surface-sunken)',
	v6: 'var(--ai-band-6)'
};

/* ── Helpers ── */
function governorLabel(governor) {
	var labels = {
		conservative: _('conservative'), ondemand: _('ondemand'), performance: _('performance'),
		powersave: _('powersave'), schedutil: 'schedutil', userspace: _('userspace')
	};
	return labels[governor] || governor;
}

function retryColor(pct) { return pct > 20 ? C.err : pct > 5 ? C.warn : C.ok; }
function perColor(per) { return per > 15 ? C.err : per > 5 ? C.warn : C.ok; }

function getTxQueue(ti, b) {
	var q = Array.isArray(ti.tx_queues) ? ti.tx_queues : [];
	for (var i = 0; i < q.length; i++) if (q[i].band === b) return q[i];
	return null;
}

/* ── CPU Frequency State (used by CPU/NPU tachometer) ── */
function freqBarState(hw, min, max, pll, gov) {
	var pll_khz = (pll || 0) * 1000;
	// cpufreq sysfs missing (e.g. AN7581 broken DVFS) — fall back to PLL hardware read
	if (!hw && pll_khz > 0)
		return { freq: pll_khz, max: pll_khz, oc: false };
	var oc = gov === 'performance' && pll > 0 && pll_khz > max;
	return { freq: oc ? pll_khz : Math.min(hw, max), max: oc ? pll_khz : max, oc: oc };
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
	var cdmHwfDrops = ((fe.cdm1 || {}).rx_hwf_drop || 0) + ((fe.cdm2 || {}).rx_hwf_drop || 0);

	// Delta since last poll — null on first call (baseline only, no alarm)
	var pseDelta    = (_prevPseDrops    !== null && pseDrops    >= _prevPseDrops)    ? (pseDrops    - _prevPseDrops)    : 0;
	var cdmHwfDelta = (_prevCdmHwfDrops !== null && cdmHwfDrops >= _prevCdmHwfDrops) ? (cdmHwfDrops - _prevCdmHwfDrops) : 0;
	_prevPseDrops    = pseDrops;
	_prevCdmHwfDrops = cdmHwfDrops;

	// DROPPING on CDM HW-forwarding drops or very high PSE bursts (>200/poll).
	var activeDrop = cdmHwfDelta > 0 || pseDelta > 200;

	// PPE offload efficiency — BND/(BND+UNB). Shown in subtitle for info only.
	var ppeBound = (ppe.bnd || {}).total || 0;
	var ppeUnb   = (ppe.unb || {}).total || 0;
	var ppeTotal = ppeBound + ppeUnb;
	var ppePct   = ppeTotal > 0 ? Math.round(ppeBound / ppeTotal * 100) : 0;

	var color = activeDrop ? C.warn : C.ok;
	return {
		pseDrops: pseDrops, cdmHwfDrops: cdmHwfDrops, pseDelta: pseDelta, cdmHwfDelta: cdmHwfDelta,
		activeDrop: activeDrop,
		ppeBound: ppeBound, ppeTotal: ppeTotal, ppePct: ppePct,
		color: color, pulsing: activeDrop
	};
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
	return 'M ' + s[0].toFixed(1) + ' ' + s[1].toFixed(1) +
	       ' A ' + r + ' ' + r + ' 0 ' + large + ' 1 ' +
	       e[0].toFixed(1) + ' ' + e[1].toFixed(1);
}

function needleTip(latencyMs) {
	// Full west arc 120°→240° (120° sweep). Log scale so low-latency range is sensitive.
	var clamped = Math.min(Math.max(latencyMs || 0, 0), 100);
	var logPct = Math.log(clamped + 1) / Math.log(101);
	var deg = 120 + logPct * 120;
	var rad = deg * Math.PI / 180;
	return [150 + 75 * Math.cos(rad), 150 + 75 * Math.sin(rad)];
}

function latencyColor(ms) {
	if (ms <= 60) return C.ok;
	if (ms <= 100) return C.warn;
	return C.err;
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
	var bndLit = Math.min(TICKS, bndTot);
	// UNB outer (CW): sticky power-of-2 scale — grows when a new peak is seen, never shrinks
	if (unbTot > _maxUnbSeen) _maxUnbSeen = unbTot;
	var UNB_SCALE = Math.pow(2, Math.ceil(Math.log2(_maxUnbSeen + 1)));
	UNB_SCALE = Math.max(UNB_SCALE, 8);
	var unbLit = Math.min(TICKS, Math.round((unbTot / UNB_SCALE) * TICKS));

	var modeText   = mode === 'ap' ? _('AP MODE') : _('ROUTER MODE');
	var statusText = cs.npuActive ? _('HW ACCELERATED') : (cs.hwEnabled ? _('NPU IDLE') : _('CPU PATH'));
	var statusCol  = cs.npuActive ? C.npu : (cs.hwEnabled ? C.muted : C.cpu);
	var bndColor   = bndTot > 0 ? C.npu : C.muted;
	var unbColor   = unbTot > 0 ? C.warn : C.muted;

	var p = [];

	// Inner fill + dashed boundary ring
	p.push('<circle cx="150" cy="150" r="97" style="fill:' + C.border + '" opacity="0.1"/>');
	p.push('<circle cx="150" cy="150" r="98" fill="none" stroke="' + C.border + '" stroke-width="1" stroke-dasharray="3 5"/>');
	p.push('<circle cx="150" cy="150" r="56" fill="none" stroke="' + C.border + '" stroke-width="0.5" opacity="0.35"/>');
	p.push('<circle cx="150" cy="150" r="69" fill="none" stroke="' + C.border + '" stroke-width="0.5" opacity="0.35"/>');
	p.push('<circle cx="150" cy="150" r="83" fill="none" stroke="' + C.border + '" stroke-width="0.5" opacity="0.35"/>');
	// Ring labels — at 9 and 3 o'clock inside the BND inner ring
	p.push('<text x="107" y="153" text-anchor="middle" fill="' + C.npu + '" font-size="10" font-weight="700" font-family="monospace" opacity="0.9">◄BND</text>');
	p.push('<text x="193" y="153" text-anchor="middle" fill="' + C.warn + '" font-size="10" font-weight="700" font-family="monospace" opacity="0.9">UNB►</text>');

	// Heartbeat pulse on BND ring when new flows arrive
	if (pulsing) {
		p.push('<circle cx="150" cy="150" r="63" fill="none" stroke="' + C.npu + '" stroke-width="2" opacity="0.6" style="animation:sqm-pulse 1.2s ease-out forwards"/>');
	}

	// 90 tick marks: BND inner anti-clockwise (r=57–67), UNB outer clockwise (r=71–81)
	for (var i = 0; i < TICKS; i++) {
		var degU = (i / TICKS) * 360 - 90;
		var radU = degU * Math.PI / 180;
		var cU = Math.cos(radU), sU = Math.sin(radU);
		var litU = i < unbLit;
		var isEdgeU = litU && i === unbLit - 1;
		p.push('<line x1="' + (cx + 71 * cU).toFixed(1) + '" y1="' + (cy + 71 * sU).toFixed(1) +
		       '" x2="' + (cx + 81 * cU).toFixed(1) + '" y2="' + (cy + 81 * sU).toFixed(1) +
		       '" stroke="' + (litU ? C.warn : C.border) + '"' +
		       ' stroke-width="1.5" stroke-linecap="round" opacity="' + (litU ? '0.9' : '0.22') + '"' +
		       (isEdgeU ? ' filter="url(#f-tn6)"' : '') + ' />');

		var degB = -90 - (i / TICKS) * 360;
		var radB = degB * Math.PI / 180;
		var cB = Math.cos(radB), sB = Math.sin(radB);
		var litB = i < bndLit;
		var isEdgeB = litB && i === bndLit - 1;
		p.push('<line x1="' + (cx + 57 * cB).toFixed(1) + '" y1="' + (cy + 57 * sB).toFixed(1) +
		       '" x2="' + (cx + 67 * cB).toFixed(1) + '" y2="' + (cy + 67 * sB).toFixed(1) +
		       '" stroke="' + (litB ? C.npu : C.border) + '"' +
		       ' stroke-width="1.5" stroke-linecap="round" opacity="' + (litB ? '0.9' : '0.22') + '"' +
		       (isEdgeB ? ' filter="url(#f-tn4)"' : '') + ' />');
	}

	// Centre readout — mode + status at top, BND count large, IPv4/IPv6 split, UNB below
	p.push('<text x="150" y="113" text-anchor="middle" fill="' + C.text + '" font-size="11" font-weight="700" font-family="monospace" letter-spacing="0">' + modeText + '</text>');
	p.push('<text x="150" y="125" text-anchor="middle" fill="' + statusCol + '" font-size="10" font-weight="700" font-family="monospace" letter-spacing="0">' + statusText + '</text>');
	p.push('<text x="150" y="145" text-anchor="middle" fill="' + bndColor + '" font-size="24" font-weight="700" font-family="monospace">' + bndTot + '</text>');
	p.push('<text x="150" y="157" text-anchor="middle" fill="' + C.muted + '" font-size="10" font-weight="700" font-family="monospace" letter-spacing="0">' + _('Bound') + '</text>');
	p.push('<text x="117" y="176" text-anchor="middle" fill="' + C.npu + '"  font-size="10" font-weight="600" font-family="monospace">v4: ' + n4 + '</text>');
	p.push('<text x="183" y="176" text-anchor="middle" fill="' + C.v6 + '"  font-size="10" font-weight="600" font-family="monospace">v6: ' + n6 + '</text>');
	p.push('<text x="150" y="190" text-anchor="middle" fill="' + unbColor + '" font-size="15" font-weight="700" font-family="monospace">' + unbTot + '</text>');
	p.push('<text x="150" y="201" text-anchor="middle" fill="' + C.muted + '" font-size="10" font-weight="700" font-family="monospace" letter-spacing="0">' + _('Unbound') + '</text>');

	return p.join('');
}

/* ── Compass SVG ── */
function compassState(bypass, hwBuf, jitter, wan, wifi, bridge, mode, topo) {
	bypass = bypass || {}; hwBuf = hwBuf || {}; jitter = jitter || {};
	wan = wan || {}; wifi = wifi || {}; bridge = bridge || {};

	// A PON ONU has no WAN uplink: its integrity signal is the optical link,
	// not WAN RX/TX error counters (which do not exist on that board).
	var pon = isPonTopo(topo) ? topo.pon : null;

	var npuActive = bypass.npu_active  === true;
	var hwEnabled = bypass.hw_offload_enabled === true;
	var cpuPct    = bypass.cpu_pct  || 0;
	var wanMbps   = bypass.wan_mbps || 0;

	var latMs = jitter.last_ping || 0;

	var errCount = 0;
	var eastAlarm = false;
	var worstSignal = 0;
	var wbDelta = [];
	if (mode === 'router') {
		if (pon) {
			// No light (los=1) is the alarm condition when the uplink is optical.
			eastAlarm = Number(pon.los) === 1;
		} else {
			errCount = (wan.rx_errors || 0) + (wan.tx_errors || 0);
			eastAlarm = errCount > 0;
		}
	} else {
		// AP mode: use per-station RSSI from iw station dump.
		(wifi.bands || []).filter(function(b) { return (b.stations || 0) > 0; }).forEach(function(b) {
			var sig = b.min_signal || 0;
			wbDelta.push({ band: b.band, stations: b.stations, signal: sig, avg_signal: b.avg_signal || 0 });
			if (sig !== 0 && (worstSignal === 0 || sig < worstSignal)) worstSignal = sig;
		});
		eastAlarm = worstSignal !== 0 && worstSignal < -75;
	}

	var eastColor;
	if (mode === 'router') {
		eastColor = eastAlarm ? C.err : C.ok;
	} else {
		eastColor = worstSignal === 0 ? C.muted
		          : worstSignal < -82  ? C.err
		          : worstSignal < -75  ? C.warn
		          :                      C.ok;
	}

	return {
		npuActive: npuActive, hwEnabled: hwEnabled, cpuPct: cpuPct, wanMbps: wanMbps,
		hwBuf: hwBuf, mode: mode,
		latMs: latMs, errCount: errCount, eastAlarm: eastAlarm,
		pon: pon,
		wbDelta: wbDelta, worstSignal: worstSignal,
		latColor: latencyColor(latMs),
		eastColor: eastColor
	};
}

function buildCompassSVG(cs, mode, ppe, ti) {
	var cx = 150, cy = 150;
	var npuOpacity  = cs.npuActive ? '1'    : cs.hwEnabled ? '0.45' : '0.2';
	var cpuOpacity  = !cs.hwEnabled ? '1'   : cs.npuActive ? '0.2'  : '0.45';
	var npuGlow     = cs.npuActive  ? ' filter="url(#f-cyan)"'   : '';
	var cpuGlow     = !cs.hwEnabled ? ' filter="url(#f-orange)"' : '';
	var eastOpacity = cs.eastAlarm ? '1' : '0.45';
	var eastGlow    = cs.eastAlarm ? ' filter="url(#f-red)"'  : '';
	var southOpacity = cs.hwBuf.pulsing ? '1' : '0.45';
	var southAnim   = cs.hwBuf.pulsing ? ' style="animation:sqm-pulse 1.5s ease-in-out infinite"' : '';
	var tip = needleTip(cs.latMs);
	var ppeRing = _cnPpeRingStyle(ppe, ti);

	var pNpuOuter = arcPath(cx, cy, 132, 210, 330);
	var pNpuInner = arcPath(cx, cy, 118, 210, 330);
	var pEast     = arcPath(cx, cy, 126, 300, 60);
	var pSouth    = arcPath(cx, cy, 126,  30, 150);
	var pWest     = arcPath(cx, cy, 126, 120, 240);

	var tpN = 'M 35.3 69.7 A 140 140 0 0 1 264.7 69.7';
	var tpS = 'M 30.5 219.0 A 138 138 0 0 0 269.5 219.0';
	var tpE = 'M 219.0 30.5 A 138 138 0 0 1 219.0 269.5';
	var tpW = 'M 81.0 30.5 A 138 138 0 0 0 81.0 269.5';

	return '<svg viewBox="-8 -8 316 316" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:326px;display:block;margin:0 auto">' +
	'<defs>' +
	'<filter id="f-cyan"  x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
	'<filter id="f-orange" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
	'<filter id="f-red"   x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
	'<filter id="f-tn4"  x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
	'<filter id="f-tn6"  x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
	'<path id="tp-north" d="' + tpN + '" fill="none"/>' +
	'<path id="tp-south" d="' + tpS + '" fill="none"/>' +
	'<path id="tp-east"  d="' + tpE + '" fill="none"/>' +
	'<path id="tp-west"  d="' + tpW + '" fill="none"/>' +
	'</defs>' +
	'<circle cx="150" cy="150" r="148" style="fill:' + C.surface + '" stroke="' + C.border + '" stroke-width="1"/>' +
	'<g id="cp-tacho">' + buildTachoInner(ppe, cs, mode) + '</g>' +
	'<path id="cp-arc-npu" d="' + pNpuOuter + '" fill="none" stroke="' + C.npu + '" stroke-width="10" stroke-linecap="round" opacity="' + npuOpacity + '"' + npuGlow + '/>' +
	'<path id="cp-arc-cpu" d="' + pNpuInner + '" fill="none" stroke="' + C.cpu + '" stroke-width="8"  stroke-linecap="round" opacity="' + cpuOpacity + '"' + cpuGlow + '/>' +
	'<path id="cp-arc-east" d="' + pEast + '" fill="none" stroke="' + cs.eastColor + '" stroke-width="9" stroke-linecap="round" opacity="' + eastOpacity + '"' + eastGlow + '/>' +
	'<path id="cp-arc-south" d="' + pSouth + '" fill="none" stroke="' + cs.hwBuf.color + '" stroke-width="9" stroke-linecap="round" opacity="' + southOpacity + '"' + southAnim + '/>' +
	'<path id="cp-arc-west" d="' + pWest + '" fill="none" stroke="' + cs.latColor + '" stroke-width="9" stroke-linecap="round" opacity="0.7"/>' +
	'<text font-size="11" font-weight="600" font-family="monospace" letter-spacing="0" opacity="0.9" fill="' + C.npu + '"><textPath href="#tp-north" startOffset="50%" text-anchor="middle">' + _('NPU Path') + '</textPath></text>' +
	'<text font-size="11" font-weight="600" font-family="monospace" letter-spacing="0" opacity="0.9" fill="' + C.warn + '"><textPath href="#tp-south" startOffset="50%" text-anchor="middle">' + _('HW Buffer') + '</textPath></text>' +
	'<text font-size="11" font-weight="600" font-family="monospace" letter-spacing="0" opacity="0.9" fill="' + C.ok + '"><textPath href="#tp-east"  startOffset="50%" text-anchor="middle">' + _('Integrity') + '</textPath></text>' +
	'<text font-size="11" font-weight="600" font-family="monospace" letter-spacing="0" opacity="0.9" fill="' + cs.latColor + '"><textPath href="#tp-west"  startOffset="50%" text-anchor="middle">' + _('Latency') + '</textPath></text>' +
	'<line id="cp-needle" x1="150" y1="150" x2="' + tip[0].toFixed(1) + '" y2="' + tip[1].toFixed(1) + '" stroke="' + cs.latColor + '" stroke-width="2.5" stroke-linecap="round" opacity="0.9"/>' +
	'<circle id="cp-needle-pivot" cx="150" cy="150" r="4" fill="' + cs.latColor + '" opacity="0.9"/>' +
	'<circle id="cp-ppe-glow" cx="150" cy="150" r="150" fill="none" stroke="' + ppeRing.color + '" stroke-width="5" style="' + ppeRing.style + '"/>' +
	'<circle cx="150" cy="150" r="155" fill="none" stroke="' + C.borderStrong + '" stroke-width="2.5"/>' +
	'</svg>';
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

	var fs       = freqBarState(st.cpu_hw_freq, st.cpu_min_freq, st.cpu_max_freq, st.pll_freq_mhz, st.cpu_governor);
	var freqMhz  = Math.round(fs.freq / 1000);
	var governor = (st.cpu_governor && st.cpu_governor !== 'unknown') ? governorLabel(st.cpu_governor) : '';

	var npuStatusCol = cs.npuActive ? C.npu : (cs.hwEnabled ? C.muted : C.cpu);
	var npuStatus    = cs.npuActive ? _('HW ACCELERATED') : (cs.hwEnabled ? _('NPU IDLE') : _('CPU PATH'));
	var npuColor     = offloadPct > 60 ? C.npu : offloadPct > 30 ? C.warn : C.muted;

	var TICKS = 90;
	var FREQ_MIN = 500, FREQ_MAX = 1400;
	var freqLit = Math.round(Math.max(0, Math.min(TICKS, (freqMhz - FREQ_MIN) / (FREQ_MAX - FREQ_MIN) * TICKS)));
	var cpuLit = Math.round(Math.min(cpuPct, 100) / 100 * TICKS);

	var cx = 150, cy = 150;
	var p = [];

	p.push('<circle cx="150" cy="150" r="97" style="fill:' + C.border + '" opacity="0.1"/>');
	p.push('<circle cx="150" cy="150" r="98" fill="none" stroke="' + C.border + '" stroke-width="1" stroke-dasharray="3 5"/>');
	p.push('<circle cx="150" cy="150" r="56" fill="none" stroke="' + C.border + '" stroke-width="0.5" opacity="0.35"/>');
	p.push('<circle cx="150" cy="150" r="69" fill="none" stroke="' + C.border + '" stroke-width="0.5" opacity="0.35"/>');
	p.push('<circle cx="150" cy="150" r="83" fill="none" stroke="' + C.border + '" stroke-width="0.5" opacity="0.35"/>');

	p.push('<text x="107" y="153" text-anchor="middle" fill="' + C.load + '" font-size="9" font-weight="600" font-family="monospace" opacity="0.85">◄' + _('CPU LOAD') + '</text>');
	p.push('<text x="193" y="153" text-anchor="middle" fill="' + C.ok + '" font-size="9" font-weight="600" font-family="monospace" opacity="0.85">' + _('Frequency') + '►</text>');

	for (var i = 0; i < TICKS; i++) {
		var degU = (i / TICKS) * 360 - 90;
		var radU = degU * Math.PI / 180;
		var cU = Math.cos(radU), sU = Math.sin(radU);
		var litU = i < freqLit, isEdgeU = litU && i === freqLit - 1;
		p.push('<line x1="' + (cx + 71 * cU).toFixed(1) + '" y1="' + (cy + 71 * sU).toFixed(1) +
		       '" x2="' + (cx + 81 * cU).toFixed(1) + '" y2="' + (cy + 81 * sU).toFixed(1) +
		       '" stroke="' + (litU ? C.ok : C.border) + '"' +
		       ' stroke-width="1.5" stroke-linecap="round" opacity="' + (litU ? '0.9' : '0.22') + '"' +
		       (isEdgeU ? ' filter="url(#f-cn-cpu)"' : '') + ' />');

		var degB = -90 - (i / TICKS) * 360;
		var radB = degB * Math.PI / 180;
		var cB = Math.cos(radB), sB = Math.sin(radB);
		var litB = i < cpuLit, isEdgeB = litB && i === cpuLit - 1;
		p.push('<line x1="' + (cx + 57 * cB).toFixed(1) + '" y1="' + (cy + 57 * sB).toFixed(1) +
		       '" x2="' + (cx + 67 * cB).toFixed(1) + '" y2="' + (cy + 67 * sB).toFixed(1) +
		       '" stroke="' + (litB ? C.load : C.border) + '"' +
		       ' stroke-width="1.5" stroke-linecap="round" opacity="' + (litB ? '0.9' : '0.22') + '"' +
		       (isEdgeB ? ' filter="url(#f-cn-npu)"' : '') + ' />');
	}

	if (governor) p.push('<text x="150" y="118" text-anchor="middle" fill="' + C.text + '" font-size="7" font-family="monospace" letter-spacing="0">' + aui.esc(governor) + '</text>');
	if (freqMhz)  p.push('<text x="150" y="130" text-anchor="middle" fill="' + C.ok + '" font-size="9" font-weight="700" font-family="monospace">' + freqMhz + ' MHz</text>');
	p.push('<text x="150" y="148" text-anchor="middle" fill="' + C.load + '" font-size="22" font-weight="700" font-family="monospace">' + cpuPct + '%</text>');
	p.push('<text x="150" y="159" text-anchor="middle" fill="' + C.load + '" font-size="9" font-weight="600" font-family="monospace" letter-spacing="0">CPU</text>');
	p.push('<text x="150" y="175" text-anchor="middle" fill="' + npuStatusCol + '" font-size="9" font-weight="600" font-family="monospace">' + npuStatus + '</text>');
	p.push('<text x="150" y="190" text-anchor="middle" fill="' + npuColor + '" font-size="13" font-weight="700" font-family="monospace">' + offloadPct + '%</text>');
	p.push('<text x="150" y="200" text-anchor="middle" fill="' + C.muted + '" font-size="8" font-family="monospace" letter-spacing="0">' + _('Offload share') + '</text>');

	// Token pool on the north arc (r=91, CW 200°→340°); the WiFi PLE pool has
	// no backend source on this build, so the south arc says so plainly instead
	// of printing a fabricated "N/A".
	var tokCount = Number(ti && ti.token_count) || 0;
	var tokSize  = Number(ti && ti.token_size) || 0;
	var tokPct   = tokSize > 0 ? tokCount / tokSize * 100 : 0;
	var tokColor = !tokSize ? C.muted : tokPct < 50 ? C.ok : tokPct < 80 ? C.warn : C.err;
	var tokText  = tokSize > 0 ? 'TOKEN ' + tokCount + '/' + tokSize : _('Token pool') + ' N/A';

	var plR = 91;
	var topSX = (150 + plR * Math.cos(200 * Math.PI / 180)).toFixed(1);
	var topSY = (150 + plR * Math.sin(200 * Math.PI / 180)).toFixed(1);
	var topEX = (150 + plR * Math.cos(340 * Math.PI / 180)).toFixed(1);
	var topEY = (150 + plR * Math.sin(340 * Math.PI / 180)).toFixed(1);
	var botSX = (150 + plR * Math.cos(160 * Math.PI / 180)).toFixed(1);
	var botSY = (150 + plR * Math.sin(160 * Math.PI / 180)).toFixed(1);
	var botEX = (150 + plR * Math.cos( 20 * Math.PI / 180)).toFixed(1);
	var botEY = (150 + plR * Math.sin( 20 * Math.PI / 180)).toFixed(1);
	p.push('<defs>' +
		'<path id="cn-tok-arc" d="M ' + topSX + ' ' + topSY + ' A ' + plR + ' ' + plR + ' 0 0 1 ' + topEX + ' ' + topEY + '" fill="none"/>' +
		'<path id="cn-ple-arc" d="M ' + botSX + ' ' + botSY + ' A ' + plR + ' ' + plR + ' 0 0 0 ' + botEX + ' ' + botEY + '" fill="none"/>' +
	'</defs>');
	p.push('<text font-size="9" font-weight="600" font-family="monospace" fill="' + tokColor + '" opacity="0.9" letter-spacing="0"><textPath href="#cn-tok-arc" startOffset="50%" text-anchor="middle">' + aui.esc(tokText) + '</textPath></text>');
	p.push('<text font-size="9" font-weight="600" font-family="monospace" fill="' + C.muted + '" opacity="0.9" letter-spacing="0"><textPath href="#cn-ple-arc" startOffset="50%" text-anchor="middle">' + _('PLE: no data source') + '</textPath></text>');

	return p.join('');
}

function _cnPpeRingStyle(ppe, ti) {
	// TX-wedge precursor: the hardware token pool draining toward empty. The
	// historical PLE reading (ti.ple_free) is returned by neither backend, so
	// this uses the pool that actually backs WiFi TX instead of a dead value.
	var tokSize = (ti && Number(ti.token_size)) || 0;
	var tokCount = (ti && Number(ti.token_count)) || 0;
	if (tokSize > 0) {
		var tokPct = tokCount / tokSize * 100;
		if (tokPct > 95) return { style: 'filter:blur(6px);opacity:0.85', color: C.err };
		if (tokPct > 80) return { style: 'filter:blur(5px);opacity:0.7',  color: C.warn };
	}

	// Default: cyan-on-BND, invisible when no BND
	var bnd = (ppe && ppe.bnd) ? (ppe.bnd.total || 0) : 0;
	if (bnd === 0) return { style: 'opacity:0', color: C.npu };
	var intensity = Math.min(1, bnd / 100);
	var blur = (3 + intensity * 6).toFixed(1);
	var op   = (0.5 + intensity * 0.45).toFixed(2);
	return { style: 'filter:blur(' + blur + 'px);opacity:' + op, color: C.npu };
}

function buildCpuNpuCompassSVG(cs, ppe, st, ti) {
	var ring = _cnPpeRingStyle(ppe, ti);
	return '<svg viewBox="35 35 230 230" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:326px;display:block;margin:0 auto">' +
	'<defs>' +
	'<filter id="f-cn-cpu" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
	'<filter id="f-cn-npu" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
	'</defs>' +
	'<circle id="cn-glow" cx="150" cy="150" r="104" fill="none" stroke="' + ring.color + '" stroke-width="6" style="' + ring.style + '"/>' +
	'<circle cx="150" cy="150" r="102" style="fill:' + C.surface + '" stroke="' + C.border + '" stroke-width="1"/>' +
	'<g id="cn-tacho">' + buildCpuNpuTacho(cs, ppe, st, ti) + '</g>' +
	'<circle cx="150" cy="150" r="109" fill="none" stroke="' + C.borderStrong + '" stroke-width="2.5"/>' +
	'</svg>';
}

/* ── WiFi Band Tachometers ── */
function _wifiPpeRingStyle(ws, ppe, bandIdx) {
	ws = ws || {};
	if ((ws.stations || 0) === 0) return { style: 'opacity:0', color: C.muted };
	var bandBnd = (ppe && ppe.bnd && Array.isArray(ppe.bnd.band_bnd)) ? (ppe.bnd.band_bnd[bandIdx] || 0) : 0;
	if (bandBnd === 0) return { style: 'opacity:0', color: C.muted };
	var intensity = Math.min(1, bandBnd / 100);
	var blur = (3 + intensity * 6).toFixed(1);
	var op   = (0.5 + intensity * 0.45).toFixed(2);
	return { style: 'filter:blur(' + blur + 'px);opacity:' + op, color: C.npu };
}

function buildWifiBandTacho(bandIdx, ws, qType, bndCount, unbCount) {
	ws = ws || {};
	var info    = aui.BANDS[bandIdx] || { name: 'Band ' + bandIdx, full: 'Band ' + bandIdx };
	var accent  = aui.bandColor(bandIdx);
	var retryVal = ws.retry_pct || 0;
	var retryCol = retryColor(retryVal);
	var mbps    = (ws.avg_exp_throughput || 0) * (100 - retryVal) / 100;
	var stations = ws.stations || 0;
	var signal   = ws.avg_signal || 0;
	var maxScale = info.maxMbps || 1000;

	var TICKS = 90;
	var txLit    = Math.round(Math.min(TICKS, (mbps / maxScale) * TICKS));
	var retryLit = Math.round(retryVal / 100 * TICKS);

	var cx = 150, cy = 150;
	var p = [];

	p.push('<circle cx="150" cy="150" r="97" style="fill:' + C.border + '" opacity="0.1"/>');
	p.push('<circle cx="150" cy="150" r="98" fill="none" stroke="' + C.border + '" stroke-width="1" stroke-dasharray="3 5"/>');
	p.push('<circle cx="150" cy="150" r="56" fill="none" stroke="' + C.border + '" stroke-width="0.5" opacity="0.35"/>');
	p.push('<circle cx="150" cy="150" r="69" fill="none" stroke="' + C.border + '" stroke-width="0.5" opacity="0.35"/>');
	p.push('<circle cx="150" cy="150" r="83" fill="none" stroke="' + C.border + '" stroke-width="0.5" opacity="0.35"/>');

	p.push('<text x="107" y="153" text-anchor="middle" fill="' + retryCol + '" font-size="11" font-weight="700" font-family="monospace" opacity="0.9">◄' + _('Retransmit') + '</text>');
	p.push('<text x="193" y="153" text-anchor="middle" fill="' + accent + '" font-size="11" font-weight="700" font-family="monospace" opacity="0.9">' + _('TX') + '►</text>');

	for (var i = 0; i < TICKS; i++) {
		var degU = (i / TICKS) * 360 - 90;
		var radU = degU * Math.PI / 180;
		var cU = Math.cos(radU), sU = Math.sin(radU);
		var litU = i < txLit, edgeU = litU && i === txLit - 1;
		p.push('<line x1="' + (cx + 71 * cU).toFixed(1) + '" y1="' + (cy + 71 * sU).toFixed(1) +
		       '" x2="' + (cx + 81 * cU).toFixed(1) + '" y2="' + (cy + 81 * sU).toFixed(1) +
		       '" stroke="' + (litU ? accent : C.border) + '"' +
		       ' stroke-width="1.5" stroke-linecap="round" opacity="' + (litU ? '0.9' : '0.22') + '"' +
		       (edgeU ? ' filter="url(#f-wifi-tx-' + bandIdx + ')"' : '') + ' />');

		var degB = -90 - (i / TICKS) * 360;
		var radB = degB * Math.PI / 180;
		var cB = Math.cos(radB), sB = Math.sin(radB);
		var litB = i < retryLit, edgeB = litB && i === retryLit - 1;
		p.push('<line x1="' + (cx + 57 * cB).toFixed(1) + '" y1="' + (cy + 57 * sB).toFixed(1) +
		       '" x2="' + (cx + 67 * cB).toFixed(1) + '" y2="' + (cy + 67 * sB).toFixed(1) +
		       '" stroke="' + (litB ? retryCol : C.border) + '"' +
		       ' stroke-width="1.5" stroke-linecap="round" opacity="' + (litB ? '0.9' : '0.22') + '"' +
		       (edgeB ? ' filter="url(#f-wifi-rty-' + bandIdx + ')"' : '') + ' />');
	}

	var unbCnt = unbCount || 0;
	var uR = 91;
	var uSX = (150 + uR * Math.cos(200 * Math.PI / 180)).toFixed(1);
	var uSY = (150 + uR * Math.sin(200 * Math.PI / 180)).toFixed(1);
	var uEX = (150 + uR * Math.cos(340 * Math.PI / 180)).toFixed(1);
	var uEY = (150 + uR * Math.sin(340 * Math.PI / 180)).toFixed(1);
	var uPid = 'wifi-u-arc-' + bandIdx;
	var unbCol = unbCnt > 0 ? C.warn : C.muted;
	p.push('<defs><path id="' + uPid + '" d="M ' + uSX + ' ' + uSY + ' A ' + uR + ' ' + uR + ' 0 0 1 ' + uEX + ' ' + uEY + '" fill="none"/></defs>');
	p.push('<text font-size="10" font-weight="700" font-family="monospace" fill="' + unbCol + '" opacity="0.9"><textPath href="#' + uPid + '" startOffset="50%" text-anchor="middle">' + unbCnt + ' UNB</textPath></text>');

	var bndCnt = bndCount || 0;
	var bR = 91;
	var bSX = (150 + bR * Math.cos(160 * Math.PI / 180)).toFixed(1);
	var bSY = (150 + bR * Math.sin(160 * Math.PI / 180)).toFixed(1);
	var bEX = (150 + bR * Math.cos(20 * Math.PI / 180)).toFixed(1);
	var bEY = (150 + bR * Math.sin(20 * Math.PI / 180)).toFixed(1);
	var bPid = 'wifi-b-arc-' + bandIdx;
	var bndCol = bndCnt > 0 ? C.npu : C.muted;
	p.push('<defs><path id="' + bPid + '" d="M ' + bSX + ' ' + bSY + ' A ' + bR + ' ' + bR + ' 0 0 0 ' + bEX + ' ' + bEY + '" fill="none"/></defs>');
	p.push('<text font-size="10" font-weight="700" font-family="monospace" fill="' + bndCol + '" opacity="0.9"><textPath href="#' + bPid + '" startOffset="50%" text-anchor="middle">' + bndCnt + ' BND</textPath></text>');

	if (retryVal > 0)
		p.push('<text x="150" y="109" text-anchor="middle" fill="' + retryCol + '" font-size="10" font-weight="700" font-family="monospace">' + retryVal + '%</text>');
	p.push('<text x="150" y="121" text-anchor="middle" fill="' + accent + '" font-size="15" font-weight="700" font-family="monospace" letter-spacing="0">' + info.name.toUpperCase() + '</text>');

	var mbpsLabel = mbps > 0 ? Math.round(mbps).toString() : (stations > 0 ? '0' : '—');
	p.push('<text x="150" y="153" text-anchor="middle" fill="' + accent + '" font-size="21" font-weight="700" font-family="monospace">' + mbpsLabel + '</text>');
	p.push('<text x="150" y="164" text-anchor="middle" fill="' + accent + '" font-size="10" font-weight="700" font-family="monospace" letter-spacing="0">MBPS</text>');

	p.push('<text x="150" y="175" text-anchor="middle" fill="' + C.muted + '" font-size="9" font-weight="600" font-family="monospace">' + _('Max') + ' ' + Math.round(maxScale) + '</text>');
	p.push('<text x="150" y="187" text-anchor="middle" fill="' + C.muted + '" font-size="10" font-weight="600" font-family="monospace">' + stations + ' ' + _('Clients') + '</text>');

	if (stations > 0 && signal !== 0)
		p.push('<text x="150" y="200" text-anchor="middle" fill="' + C.muted + '" font-size="9" font-family="monospace">' + signal + ' dBm</text>');

	return p.join('');
}

function buildWifiBandSVG(bandIdx, ws, qType, ppe) {
	var idx      = bandIdx;
	var ring     = _wifiPpeRingStyle(ws, ppe, bandIdx);
	var bndCount = (ppe && ppe.bnd && Array.isArray(ppe.bnd.band_bnd)) ? (ppe.bnd.band_bnd[bandIdx] || 0) : 0;
	var unbCount = (ppe && ppe.unb && Array.isArray(ppe.unb.band_unb)) ? (ppe.unb.band_unb[bandIdx] || 0) : 0;
	return '<svg viewBox="35 35 230 230" xmlns="http://www.w3.org/2000/svg" overflow="hidden" style="width:100%;max-width:326px;display:block;margin:0 auto">' +
	'<defs>' +
	'<filter id="f-wifi-tx-' + idx + '" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
	'<filter id="f-wifi-rty-' + idx + '" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
	'</defs>' +
	'<circle id="wifi-glow-' + idx + '" cx="150" cy="150" r="104" fill="none" stroke="' + ring.color + '" stroke-width="6" style="' + ring.style + '"/>' +
	'<circle cx="150" cy="150" r="102" style="fill:' + C.surface + '" stroke="' + C.border + '" stroke-width="1"/>' +
	'<g id="wifi-tacho-' + idx + '">' + buildWifiBandTacho(bandIdx, ws, qType, bndCount, unbCount) + '</g>' +
	'<circle cx="150" cy="150" r="109" fill="none" stroke="' + C.borderStrong + '" stroke-width="2.5"/>' +
	'</svg>';
}

/* Build one WiFi band gauge (SVG + caption), or null when the band is absent. */
function buildWifiGauge(band, wifi, ti, st, ppe, hasWifi) {
	if (!hasWifi) return null;
	var bands = (wifi && Array.isArray(wifi.bands)) ? wifi.bands : [];
	var ws = null;
	for (var j = 0; j < bands.length; j++) if (bands[j].band === band) { ws = bands[j]; break; }
	var fallbackType = (st && st.npu_loaded) ? 'npu' : 'dma';
	var txQ = getTxQueue(ti, band) || { type: fallbackType };
	var info = aui.BANDS[band] || { full: 'Band ' + band };
	var mbps = ws ? (ws.avg_exp_throughput || 0) * (100 - (ws.retry_pct || 0)) / 100 : 0;
	var cap = [
		E('b', {}, ws ? String(Math.round(mbps)) : '—'), ' Mbps · ',
		_('Retransmit') + ' ', E('b', {}, (ws ? (ws.retry_pct || 0) : 0) + '%'), ' · ',
		E('b', {}, ws ? (ws.stations || 0) : 0), ' ' + _('Clients')
	];
	return aui.gauge(buildWifiBandSVG(band, ws, txQ.type, ppe), cap, 'wifi-svg-wrap-' + band);
}

/* ── Conflict Alerts ── */
function translateAlertMsg(msg) {
	var t = _(msg);
	if (t !== msg) return t;
	var m = msg.match(/^([^(]+)\s*\(([^)]+)\)\s*(.*)$/);
	if (m) {
		var template = m[1].trim() + '. ' + m[3].trim();
		template = template.replace(/\.\s*\./g, '.');
		var tt = _(template);
		if (tt !== template) {
			var firstPeriod = tt.indexOf('。');
			if (firstPeriod === -1) firstPeriod = tt.indexOf('.');
			if (firstPeriod !== -1) {
				return tt.substring(0, firstPeriod) + ' (' + m[2] + ')' + tt.substring(firstPeriod);
			}
		}
	}
	return msg;
}

function renderConflictAlerts(alertData) {
	var alerts = (alertData && Array.isArray(alertData.alerts)) ? alertData.alerts : [];
	if (!alerts.length)
		return aui.section({ title: _('Conflicts & Alerts'), body: aui.empty(_('No conflicts detected')) });
	var items = alerts.map(function(a) {
		return aui.banner(a.severity === 'error' ? 'error' : '', _(a.title || ''), translateAlertMsg(a.message || ''));
	});
	return aui.section({ title: _('Conflicts & Alerts'), count: alerts.length + ' ' + _('alerts'), body: items });
}

/* ── Link overview tiles ── */
function renderLinkTiles(dm, bypass, st, wan, wifi, apo, flo, vo, ppo, mode, hasWifi, topo) {
	bypass = bypass || {}; st = st || {}; wan = wan || {}; wifi = wifi || {};
	var pathText = bypass.npu_active ? _('HW ACCELERATED') : (bypass.hw_offload_enabled ? _('NPU IDLE') : _('CPU PATH'));
	var ppeBound = (bypass.offload_bound || 0);
	var accOn = [vo, flo, ppo, apo].filter(function(x) { return x && (x.enabled === true || x.enabled === 1 || x.enabled === '1'); }).length;
	var wifiCount = (wifi.bands || []).reduce(function(a, x) { return a + (x.stations || 0); }, 0);
	var errCount = (wan.rx_errors || 0) + (wan.tx_errors || 0);
	var reason = dm.reason ? (' — ' + dm.reason) : '';
	// On a PON board the WAN-centric tiles become PON-centric ones.
	var isPon = isPonTopo(topo);
	var pon = isPon ? topo.pon : null;
	var optical = isPon ? ponOpticalState(pon) : null;

	var tiles = [
		aui.tile({ title: _('Working Mode'), value: mode === 'ap' ? _('AP MODE') : _('ROUTER MODE'), accent: mode === 'ap' ? C.npu : C.ok, sub: _('Auto-detected') + reason }),
		aui.tile({ title: _('NPU Path'), value: pathText, accent: bypass.npu_active ? C.npu : C.warn, sub: (bypass.offload_bound || 0) + ' ' + _('Bound') }),
		aui.tile({ title: _('Acceleration'), value: accOn + ' / 4', accent: C.warn, sub: 'VLAN · PPPoE · Flow · AP' }),
		aui.tile({ title: _('CPU LOAD'), value: String(bypass.cpu_pct || 0), unit: '%', accent: C.load, sub: aui.fmtFreq(st.cpu_hw_freq) + ' · ' + (st.cpu_governor || '') }),
		isPon
			? aui.tile({ title: _('PON'), value: ponModeName(pon), accent: C.npu, sub: ponRateText(pon) })
			: aui.tile({ title: mode === 'ap' ? _('Upstream') : _('WAN'), value: String(bypass.wan_mbps || 0), unit: 'Mbps', accent: C.ok, sub: (wan.device || '') + ' · ' + aui.fmtUptime(wan.uptime || 0) })
	];
	if (hasWifi) {
		var parts = aui.BANDS.map(function(b, i) {
			var ws = null;
			(wifi.bands || []).forEach(function(x) { if (x.band === i) ws = x; });
			return b.name + ' ' + (ws ? (ws.stations || 0) : 0);
		});
		tiles.push(aui.tile({ title: _('Clients'), value: String(wifiCount), accent: C.v6, sub: parts.join(' · ') }));
	} else if (isPon) {
		tiles.push(aui.tile({ title: _('Optical module'), value: optical.text, accent: optical.color, sub: ponModeName(pon) }));
	} else {
		tiles.push(aui.tile({ title: _('WAN errors'), value: String(errCount), accent: errCount ? C.err : C.ok, sub: errCount ? _('Check the WAN cable or SFP') : 'RX / TX 0' }));
	}
	return E('div', { 'class': 'ai-grid ai-grid--tiles' }, tiles);
}

/* ── Quadrant readout cards ── */
function renderQuad(cs, bypass, jitter, wan, wifi, bridge, mode) {
	bypass = bypass || {}; jitter = jitter || {}; wan = wan || {}; wifi = wifi || {};

	var rawBridgeDrops = bridge.tx_dropped || 0;
	var bridgeDelta = (_prevBridgeDrops !== null && rawBridgeDrops >= _prevBridgeDrops) ? (rawBridgeDrops - _prevBridgeDrops) : 0;
	_prevBridgeDrops = rawBridgeDrops;

	var northVal   = cs.npuActive ? _('ACTIVE') : (cs.hwEnabled ? _('IDLE') : _('CPU PATH'));
	var northColor = cs.npuActive ? C.npu : (cs.hwEnabled ? C.muted : C.cpu);
	// On a PON board there are no WAN Mbps to show — name the PON mode instead.
	var northSub   = mode === 'ap'
		? 'CPU: ' + cs.cpuPct + '%  |  Bridge drops Δ: ' + bridgeDelta
		: cs.pon
			? 'CPU: ' + cs.cpuPct + '%  |  PON: ' + ponModeName(cs.pon)
			: 'CPU: ' + cs.cpuPct + '%  |  WAN: ' + cs.wanMbps + ' Mbps';

	var eastVal, eastSub;
	if (mode === 'router') {
		if (cs.pon) {
			// PON has no RX/TX error counters — report the optical link instead.
			var optical = ponOpticalState(cs.pon);
			eastVal = optical.text;
			eastSub = _('PON') + ': ' + ponModeName(cs.pon);
		} else {
			eastVal = cs.eastAlarm ? cs.errCount + ' ' + _('ERROR') + (cs.errCount > 1 ? 'S' : '') : _('CLEAN');
			eastSub = 'RX errors: ' + (wan.rx_errors || 0) + '  TX errors: ' + (wan.tx_errors || 0);
		}
	} else {
		var ws = cs.worstSignal;
		eastVal = cs.wbDelta.length === 0 ? _('NO CLIENTS')
		        : ws === 0               ? _('NO DATA')
		        : ws < -82               ? _('POOR')
		        : ws < -75               ? _('WEAK')
		        :                          _('CLEAN');
		eastSub = cs.wbDelta.length > 0
			? cs.wbDelta.map(function(b) { return aui.BANDS[b.band].name + ': ' + b.signal + ' dBm'; }).join('  |  ')
			: _('No clients');
	}

	var hb = cs.hwBuf || {};
	var southVal   = hb.activeDrop ? _('DROPPING') : _('HEALTHY');
	var southSub   = 'PSE Δ: ' + hb.pseDelta + '  CDM Δ: ' + hb.cdmHwfDelta + ' | PPE: ' + hb.ppePct + '% BND (' + hb.ppeBound + '/' + hb.ppeTotal + ')';

	var latVal   = cs.latMs > 0 ? cs.latMs.toFixed(1) + 'ms' : (jitter.available === false ? 'N/A' : '---');
	// The target is whatever uci holds (getPingTarget); the daemon's runtime copy
	// is only a fallback. When neither is known show "—" instead of inventing an
	// address the operator never chose.
	var latTarget = _cfgPingTarget || jitter.target || '';
	var latSub   = _('Jitter') + ': ' + (jitter.jitter || 0).toFixed(1) + 'ms  |  ' + (jitter.samples || 0) + ' ' + _('samples') + '  |  ' + _('Ping') + ': ' + (latTarget || '—') + ' ✏';

	function card(name, val, color, sub, onclick) {
		var c = aui.card({
			name: name, accent: color,
			body: [
				E('div', { 'class': 'ai-card-title' }, [ E('span', { 'style': 'font-size:var(--ds-fs-lg);font-weight:700;color:' + color }, val) ]),
				E('div', { 'class': 'ai-gauge-cap', 'style': 'text-align:left' }, sub)
			]
		});
		if (onclick) {
			// Bind on the whole card, not only the sub-line: one small text line is
			// a tiny hit target. The sub-line is a child, so in the browser a click
			// on it still bubbles up to this handler.
			c.style.cursor = 'pointer';
			c.title = _('Click to change ping target');
			c.addEventListener('click', onclick);
		}
		return c;
	}

	var pingClick = function() {
		// A LuCI modal instead of window.prompt(): once a browser starts
		// suppressing repeated native dialogs ("prevent this page from creating
		// additional dialogs") prompt() silently returns null and the card looks
		// read-only. The modal cannot be suppressed and can validate the input.
		var input = E('input', {
			'type': 'text', 'class': 'cbi-input-text', 'style': 'width:100%',
			'placeholder': '223.5.5.5', 'value': latTarget
		});

		var submit = function() {
			var newTarget = (input.value || '').trim();
			ui.hideModal();
			if (!newTarget || newTarget === latTarget) return;
			callSetPingTarget(newTarget).then(function(res) {
				if (res && res.success) {
					_cfgPingTarget = res.target || newTarget;
					ui.addNotification(null, E('p', {}, _('Ping target changed to: ') + _cfgPingTarget), 'info');
					if (_pingRefresh) _pingRefresh();
				} else {
					ui.addNotification(null, E('p', {}, (res && res.error) || _('Failed to set ping target')), 'error');
				}
			}).catch(function(err) {
				ui.addNotification(null, E('p', {}, _('Error: ') + err), 'error');
			});
		};

		input.addEventListener('keydown', function(ev) {
			if (ev.key === 'Enter') submit();
		});

		return ui.showModal(_('Ping target'), [
			E('p', {}, _('The Latency card pings this host every 2 s to measure jitter. Enter an IP address or a hostname.')),
			input,
			E('div', { 'class': 'right' }, [
				E('button', { 'class': 'cbi-button cbi-button-apply', 'click': submit }, _('Save')),
				' ',
				E('button', { 'class': 'cbi-button cbi-button-neutral', 'click': function() { ui.hideModal(); } }, _('Cancel'))
			])
		]);
	};

	return E('div', { 'class': 'ai-grid ai-grid--4', 'style': 'margin-top:var(--ds-sp-3)' }, [
		card(_('NPU Path'), northVal, northColor, northSub),
		card(_('Integrity'), eastVal, cs.eastColor, eastSub),
		card(_('Latency'), latVal, cs.latColor, latSub, pingClick),
		card(_('HW Buffer'), southVal, hb.color || C.ok, southSub)
	]);
}

/* ── Board topology (getOverview.topo) ──
 * The backend describes the board's ports once, in `topo`, so the view stops
 * assuming an Ethernet WAN uplink exists. A PON ONU (e.g. XG2010G) has no WAN
 * netdev at all and an optical upstream instead, and a router (XR1710G) has a
 * `wan` netdev. A missing `topo` (older RPC or a failed call) is treated as
 * "unknown" so every renderer falls back to the legacy WAN-shaped markup. */
function normalizeTopo(topo, pon) {
	if (!topo || typeof topo !== 'object') return null;
	var lanNetdevs = Array.isArray(topo.lan_netdevs) ? topo.lan_netdevs.filter(function(x) { return !!x; }) : [];
	var wanNetdev = topo.wan_netdev || '';
	var lanCount = (typeof topo.lan_count === 'number') ? topo.lan_count : lanNetdevs.length;
	var wanCount = (typeof topo.wan_count === 'number') ? topo.wan_count : (wanNetdev ? 1 : 0);
	return {
		model: topo.model || '',
		compatible: topo.compatible || '',
		lan_netdevs: lanNetdevs,
		wan_netdev: wanNetdev,
		lan_count: lanCount,
		wan_count: wanCount,
		has_pon: topo.has_pon ? 1 : 0,
		pon: topo.pon || pon || null,
		ports: Array.isArray(topo.ports) ? topo.ports : []
	};
}

/* True only for a PON-upstream board (ONU): PON present and no WAN uplink. */
function isPonTopo(topo) {
	return !!(topo && topo.has_pon && topo.pon && topo.wan_count === 0);
}

/* Negotiated PON mode, upper-cased (xgpon → XGPON). The value comes from the
 * backend, so this never hard-codes the XGPON/XGSPON rate pairs. */
function ponModeName(pon) {
	if (!pon || !pon.mode_name) return '—';
	return String(pon.mode_name).toUpperCase();
}

/* One line-rate as Gbps/Mbps. */
function ponLineRate(mbps) {
	var v = Number(mbps) || 0;
	if (v <= 0) return '—';
	return v >= 1000 ? (v / 1000) + ' Gbps' : v + ' Mbps';
}

/* "10 Gbps ↓ / 2.5 Gbps ↑", or "—" when either direction is unknown. */
function ponRateText(pon) {
	var d = Number((pon || {}).down_mbps) || 0;
	var u = Number((pon || {}).up_mbps) || 0;
	if (d <= 0 || u <= 0) return '—';
	return ponLineRate(d) + ' ↓ / ' + ponLineRate(u) + ' ↑';
}

/* Optical state derived from pon.los: 1 = no light, 0 = light present. */
function ponOpticalState(pon) {
	if (!pon || pon.los === undefined || pon.los === null)
		return { text: '—', color: C.muted, alarm: false, unknown: true };
	if (Number(pon.los) === 1)
		return { text: _('No optical signal'), color: C.err, alarm: true, unknown: false };
	return { text: _('Optical signal present'), color: C.ok, alarm: false, unknown: false };
}

/* ── Ethernet port cards ── */
function _ethSpeed(speed) {
	if (!speed || speed <= 0) return _('NO LINK');
	if (speed >= 10000) return '10G';
	if (speed >= 5000)  return '5G';
	if (speed >= 2500)  return '2.5G';
	if (speed >= 1000)  return '1G';
	if (speed >= 100)   return '100M';
	return speed + 'M';
}

function renderEthCards(ethPorts, ppe, topo) {
	var byIface = {};
	(ethPorts || []).forEach(function(p) { if (p && p.iface) byIface[p.iface] = p; });

	// Port list: LAN ports in topology order, then the WAN uplink when one
	// exists. Without topo (RPC failure) keep the payload order so nothing
	// disappears from the page.
	var order = [];
	if (topo) {
		order = topo.lan_netdevs.slice();
		if (topo.wan_netdev) order.push(topo.wan_netdev);
	} else {
		(ethPorts || []).forEach(function(p) { if (p && p.iface) order.push(p.iface); });
	}

	var cards = order.map(function(iface) {
		var p = byIface[iface] || { iface: iface };
		// WAN is whatever the topology/role says it is — never the literal 'wan'.
		var isWan = (p.role === 'wan') || (!!(topo && topo.wan_netdev) && iface === topo.wan_netdev);
		var up = !!p.up;
		var clr = isWan ? C.npu : C.ok;
		var maxSc = 100;
		// Drawn from the per-port Mbps the poll tick derives from the byte
		// counters — the backend only ever emits tx_bytes/rx_bytes.
		var txMbps = Number(p.tx_mbps) || 0, rxMbps = Number(p.rx_mbps) || 0;
		var footer;
		if (isWan) {
			var bndTotal = (ppe && ppe.bnd) ? (ppe.bnd.total || 0) : 0;
			var bandBnd = (ppe && ppe.bnd && ppe.bnd.band_bnd) ? ppe.bnd.band_bnd : [0, 0, 0];
			var wifiBnd = (bandBnd[0] || 0) + (bandBnd[1] || 0) + (bandBnd[2] || 0);
			var unbTotal = (ppe && ppe.unb) ? (ppe.unb.total || 0) : 0;
			var bandUnb = (ppe && ppe.unb && ppe.unb.band_unb) ? ppe.unb.band_unb : [0, 0, 0];
			var wifiUnb = (bandUnb[0] || 0) + (bandUnb[1] || 0) + (bandUnb[2] || 0);
			footer = 'BND: ' + Math.max(0, bndTotal - wifiBnd) + '  UNB: ' + Math.max(0, unbTotal - wifiUnb);
		} else {
			var portIdx = { lan1: 0, lan2: 1, lan3: 2, lan4: 3 }[iface];
			var bndPort = (ppe && ppe.bnd && ppe.bnd.port_bnd && portIdx !== undefined) ? (ppe.bnd.port_bnd[portIdx] || 0) : 0;
			footer = 'BND: ' + bndPort;
		}
		var errs = (p.tx_errors || 0) + (p.rx_errors || 0);
		return aui.card({
			name: iface.toUpperCase(), tag: _ethSpeed(up ? (p.speed || 0) : 0),
			accent: up ? clr : C.borderStrong,
			body: [
				aui.row('TX', (up ? aui.fmtMbps(txMbps) : '--') + ' Mb'),
				aui.bar({ pct: up ? Math.min(1, txMbps / maxSc) * 100 : 0, accent: C.npu }),
				aui.row('RX', (up ? aui.fmtMbps(rxMbps) : '--') + ' Mb'),
				aui.bar({ pct: up ? Math.min(1, rxMbps / maxSc) * 100 : 0, accent: C.cpu }),
				aui.row(footer, (errs > 0 ? _('Errors') + ' ' + errs : _('Errors') + ' 0'), errs > 0 ? 'ai-err' : '')
			]
		});
	});

	// Surface the LAN/WAN port counts the topology reports.
	var head = topo
		? E('div', { 'class': 'ai-subhead' }, _('LAN ports') + ': ' + topo.lan_count + ' · ' + _('WAN ports') + ': ' + topo.wan_count)
		: null;
	return E('div', {}, [
		head,
		E('div', { 'class': 'ai-grid ai-grid--4', 'style': 'margin-top:var(--ds-sp-3)' }, cards)
	]);
}

/* ── Mode And Acceleration Status Cards ── */
function getModeReasonText(reason) {
	var reasonMap = {
		dhcp_disabled: _('DHCP disabled in UCI'),
		no_wan: _('No WAN IP detected'),
		local_gateway: _('Local gateway detected')
	};
	return reasonMap[reason] || '';
}

function renderModeCards(dm, apo, flo, vo, ppo) {
	dm = dm || {}; apo = apo || {}; flo = flo || {}; vo = vo || {}; ppo = ppo || {};
	function isOn(value) { return value === true || value === 1 || value === '1'; }
	var mode = dm.mode || '';
	var reason = getModeReasonText(dm.reason || '');

	function accelCard(title, enabled, note) {
		return aui.card({
			name: title, accent: enabled ? C.ok : C.borderStrong,
			body: [
				E('div', { 'style': 'font-size:var(--ds-fs-lg);font-weight:700;color:' + (enabled ? C.ok : C.muted) }, enabled ? _('Enabled') : _('Disabled')),
				E('div', { 'class': 'ai-gauge-cap', 'style': 'text-align:left' }, note)
			]
		});
	}

	return E('div', {}, [
		E('div', { 'class': 'ai-grid ai-grid--4' }, [
			aui.card({
				name: _('Working Mode'), accent: mode === 'ap' ? C.npu : C.ok,
				body: [
					E('div', { 'style': 'font-size:var(--ds-fs-lg);font-weight:700' }, mode === 'ap' ? _('AP MODE') : mode === 'router' ? _('ROUTER MODE') : _('DETECTING')),
					E('div', { 'class': 'ai-gauge-cap', 'style': 'text-align:left' }, _('Auto-detected') + (reason ? ' — ' + reason : ''))
				]
			}),
			accelCard(_('AP Mode Acceleration'), isOn(apo.enabled), 'br_netfilter'),
			accelCard(_('Flow Offload'), isOn(flo.enabled), 'flow_offloading(_hw)'),
			accelCard(_('VLAN Offload'), isOn(vo.enabled), 'bridge-nf-filter-vlan-tagged'),
			accelCard(_('PPPoE Offload'), isOn(ppo.enabled), 'bridge-nf-filter-pppoe-tagged')
		]),
		E('p', { 'class': 'ai-hint', 'style': 'margin-top:var(--ds-sp-2)' }, _('This tab is read-only: switches are operated on the SoC / NPU tab so a kernel switch has only one writable entry point.'))
	]);
}

/* ── PPE Flow Monitor console ── */
function flowSection(name, kind, stats, showV6) {
	stats = stats || {};
	var acc = kind === 'bnd' ? C.npu : C.warn;
	var total = stats.total || 0;
	var entries = Array.isArray(stats.entries) ? stats.entries : [];
	var head = name + ' · ' + total + ' ' + _('flows') + (showV6 ? '  (' + _('v4') + ': ' + (stats.ipv4 || 0) + ' · ' + _('v6') + ': ' + (stats.ipv6 || 0) + ')' : '');
	var tbl = aui.table({
		mono: true, stack: true, emptyText: _('No entries'),
		cols: [ { t: _('Index') }, { t: _('State') }, { t: _('Type') }, { t: _('Original Flow') }, { t: _('New Flow') }, { t: _('Ethernet') } ],
		rows: entries.map(function(e) {
			return [
				E('span', { 'class': 'ai-muted' }, e.index || '?'),
				kind === 'bnd' ? aui.badge('BND', 'bnd') : aui.badge('UNB', 'unb'),
				(String(e.type || '').indexOf('IPv6') >= 0 ? E('span', { 'style': 'color:' + C.v6 }, e.type) : e.type),
				E('span', { 'style': 'color:' + acc }, e.orig || '-'),
				e.new_flow || '-',
				e.eth || '-'
			];
		})
	});
	var more = (total > entries.length) ? E('p', { 'class': 'ai-hint' }, '+' + (total - entries.length) + ' ' + _('more')) : null;
	return E('div', { 'class': 'ppe-flow-section', 'style': 'margin-top:var(--ds-sp-4)' }, [
		E('div', { 'class': 'ai-subhead', 'style': 'color:' + acc }, head),
		tbl,
		more
	]);
}

function renderPpeConsoleBody(ppe) {
	ppe = ppe || {};
	var bnd = ppe.bnd || { total: 0, ipv4: 0, ipv6: 0, entries: [] };
	var unb = ppe.unb || { total: 0, ipv4: 0, ipv6: 0, entries: [] };
	var total = (bnd.total || 0) + (unb.total || 0);
	var pct = total > 0 ? ((bnd.total || 0) / total * 100) : 0;
	return E('div', {}, [
		aui.bar({ title: _('Binding rate (BND / total)'), right: aui.fmtPct(pct), pct: pct, accent: C.npu }),
		E('div', {}, [
			flowSection(_('BND — bound to hardware'), 'bnd', bnd, true),
			flowSection(_('UNB — learning (CPU path)'), 'unb', unb, true)
		])
	]);
}

function renderPpeConsole(ppe) {
	return E('div', { 'class': 'ai-console' }, [
		E('div', { 'class': 'ai-console-bar' }, [
			E('span', { 'class': 'ai-dot ai-dot--live' }),
			E('span', { 'class': 'ai-console-title' }, _('PPE Flow Monitor')),
			aui.badge(_('5 s refresh')),
			E('span', { 'class': 'ai-spacer' })
		]),
		E('div', { 'class': 'ai-console-body', 'id': 'ppe-terminal-body' }, renderPpeConsoleBody(ppe))
	]);
}

/* ── Bridge / WAN / Token detail blocks ──
 * Fields the backend has always returned but the pre-redesign views dropped:
 * the br-lan counters, the full WAN health block, the token pool size and the
 * per-band TX ring depth/occupancy (token.tx_queues). */
function isOn(value) {
	return value === true || value === 1 || value === '1';
}

function txRingRows(ti, hasWifi) {
	var q = Array.isArray(ti.tx_queues) ? ti.tx_queues : [];
	if (!hasWifi || !q.length)
		return [ [ _('TX ring depth / queued'), _('Not provided without wireless hardware') ] ];
	var byBand = {};
	q.forEach(function(e) { byBand[e.band] = e; });
	var depth = aui.BANDS.map(function(b, i) {
		var e = byBand[i]; return b.name + ' ' + (e ? e.ndesc : '—');
	}).join(' · ');
	var queued = aui.BANDS.map(function(b, i) {
		var e = byBand[i]; return b.name + ' ' + (e ? e.queued : '—');
	}).join(' · ');
	return [ [ _('TX ring depth'), depth ], [ _('TX ring queued'), queued ] ];
}

function renderDetailSection(bridge, wan, ti, fe, hasWifi, topo) {
	bridge = bridge || {}; wan = wan || {}; ti = ti || {}; fe = fe || {};

	var ports = Array.isArray(fe.pse_ports) ? fe.pse_ports : [];
	var pseDrops = 0;
	ports.forEach(function(p) { pseDrops += (p.drops || 0); });
	var pseT = (fe.pse_used || 0) + (fe.pse_free || 0);
	var psePct = pseT > 0 ? (fe.pse_used / pseT) * 100 : 0;

	var tokCount = Number(ti.token_count) || 0;
	var tokSize = Number(ti.token_size) || 0;
	var tokPct = tokSize > 0 ? tokCount / tokSize * 100 : 0;

	var bridgeKv = aui.kv([
		[ _('Bridge RX packets'), aui.nf(bridge.rx_packets || 0) ],
		[ _('Bridge TX packets'), aui.nf(bridge.tx_packets || 0) ],
		[ _('Bridge RX dropped'), String(bridge.rx_dropped || 0) ],
		[ _('Bridge TX dropped'), String(bridge.tx_dropped || 0) ],
		[ _('Forward transitions'), String(bridge.fwd_errors || 0) ],
		[ _('PSE shared buffer'), aui.fmtPct(psePct, 0) + ' (' + (fe.pse_used || 0) + ' / ' + pseT + ')' ],
		[ _('PSE port drops'), aui.fmtK(pseDrops) ]
	]);

	var wanKv = aui.kv([
		[ _('Device'), wan.device || '—' ],
		[ _('Uptime'), aui.fmtUptime(wan.uptime || 0) ],
		[ _('Received'), aui.fmtGiB(wan.rx_bytes || 0) ],
		[ _('Sent'), aui.fmtGiB(wan.tx_bytes || 0) ],
		[ _('RX errors'), String(wan.rx_errors || 0) ],
		[ _('TX errors'), String(wan.tx_errors || 0) ],
		[ _('RX dropped'), String(wan.rx_dropped || 0) ],
		[ _('TX dropped'), String(wan.tx_dropped || 0) ]
	]);

	// A PON ONU has an optical, not an Ethernet, upstream — swap the WAN health
	// block for a PON status block rather than printing meaningless WAN zeros.
	var isPon = isPonTopo(topo);
	var pon = isPon ? topo.pon : null;
	var optical = isPon ? ponOpticalState(pon) : null;
	var wanTitle = isPon ? _('PON status') : _('WAN health');
	// A PON ONU has no WAN uplink, so the section heading must not claim WAN
	// either — keep the title in step with the sub-heading it introduces.
	var detailTitle = isPon ? _('Bridge / PON / Token Details') : _('Bridge / WAN / Token Details');
	var wanBlock = isPon
		? aui.kv([
			[ _('PON mode'), ponModeName(pon) ],
			[ _('Downstream'), ponLineRate(pon.down_mbps) ],
			[ _('Upstream rate'), ponLineRate(pon.up_mbps) ],
			[ _('Optical module'), optical.text, optical.color ],
			[ _('ONU state'), (pon.onu_state !== undefined && pon.onu_state !== null && pon.onu_state !== '') ? pon.onu_state : '—' ],
			[ _('Device'), pon.netdev || '—' ]
		])
		: wanKv;

	var tokKv = aui.kv([
		[ _('Token pool'), tokSize > 0 ? (tokCount + ' / ' + tokSize + ' (' + aui.fmtPct(tokPct, 0) + ')') : '—' ],
		[ _('NPU state'), isOn(ti.npu_active) ? _('Yes') : _('No') ]
	].concat(txRingRows(ti, hasWifi)));

	return aui.section({
		title: detailTitle,
		body: E('div', {}, [
			E('div', { 'class': 'ai-subhead' }, _('Bridge & hardware buffer')),
			bridgeKv,
			E('div', { 'class': 'ai-subhead' }, wanTitle),
			wanBlock,
			E('div', { 'class': 'ai-subhead' }, _('Token pool & TX rings')),
			tokKv
		])
	});
}

/* ── WiFi band detail table ──
 * The old view only painted the three tachometers; the backend already returns
 * airtime efficiency, negotiated/expected rates, failure counts and per-band
 * BND/UNB ownership. Only rendered when a radio is present. */
function renderWifiTable(wifi, ppe, hasWifi) {
	if (!hasWifi) return null;
	var bands = (wifi && Array.isArray(wifi.bands)) ? wifi.bands : [];
	var bandBnd = (ppe && ppe.bnd && Array.isArray(ppe.bnd.band_bnd)) ? ppe.bnd.band_bnd : [];
	var bandUnb = (ppe && ppe.unb && Array.isArray(ppe.unb.band_unb)) ? ppe.unb.band_unb : [];
	var rows = bands.map(function(bd) {
		var info = aui.BANDS[bd.band] || { full: 'Band ' + bd.band };
		var retry = bd.retry_pct || 0;
		return [
			info.full,
			String(bd.stations || 0),
			(bd.airtime_efficiency || 0) + '%',
			String(bd.avg_phy_rate || 0),
			String(bd.avg_exp_throughput || 0),
			E('span', { 'style': 'color:' + (retry > 5 ? C.warn : C.ok) }, retry + '%'),
			String(bd.tx_failed || 0),
			(bd.avg_signal || 0) + ' / ' + (bd.min_signal || 0),
			String(bd.tx_mbps || 0),
			(bandBnd[bd.band] || 0) + ' / ' + (bandUnb[bd.band] || 0)
		];
	});
	return aui.section({
		title: _('WiFi Band Details'),
		hint: _('Per-band airtime efficiency, negotiated and expected rates, failure counts and BND/UNB ownership.'),
		body: aui.table({
			mono: true, stack: true, emptyText: _('No entries'),
			cols: [
				{ t: _('Band') }, { t: _('Clients'), num: true }, { t: _('Airtime'), num: true },
				{ t: _('PHY rate'), num: true }, { t: _('Expected'), num: true }, { t: _('Retry'), num: true },
				{ t: _('Failed'), num: true }, { t: _('Signal'), num: true }, { t: _('TX') + ' Mbps', num: true },
				{ t: 'BND / UNB', num: true }
			],
			rows: rows
		})
	});
}

/* ── Main View ── */
return view.extend({
	load: function() {
		// Progressive rendering: don't block on RPC calls, let the page render immediately
		return Promise.resolve([]);
	},

	render: function(data) {
		data = data || [];
		aui.ensureCss();
		var st = data[0] || {}, ppe = data[1] || {}, ti = data[2] || {}, fe = data[3] || {};
		var vo = data[4] || {}, txs = data[5] || {}, dm = data[6] || {};
		var bypass = data[7] || {}, wan = data[8] || {};
		var jitter = data[9] || {}, alertData = data[10] || {};
		var wifi = data[11] || {}, bridge = data[12] || {};
		var flo = data[13] || {}, ppo = data[14] || {}, apo = data[15] || {};
		var eth = data[16] || {};
		var mode = dm.mode || 'router';
		// Wireless presence gates the three WiFi gauges and the clients tile.
		// ui.hasWifiRadio() fails open, so one failed RPC never drops the gauges.
		var hasWifi = aui.hasWifiRadio(wifi);
		var ppePaused = false;
		var latestPpe = ppe;
		var latestEth = eth;
		// Board topology (+ PON upstream) from getOverview; null = unknown, so
		// every renderer keeps the legacy WAN-shaped fallback until it arrives.
		var latestTopo = null;
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

		var pauseBtn = E('button', {
			'type': 'button', 'class': 'ai-btn', 'title': _('Pause'), 'aria-pressed': 'false',
			'click': function(ev) {
				ppePaused = !ppePaused;
				var label = ppePaused ? _('Resume') : _('Pause');
				ev.currentTarget.textContent = label;
				ev.currentTarget.title = label;
				ev.currentTarget.setAttribute('aria-pressed', ppePaused ? 'true' : 'false');
				ev.currentTarget.className = 'ai-btn' + (ppePaused ? ' ai-btn--active' : '');
				if (!ppePaused) updateInto('ppe-console', [ renderPpeConsole(latestPpe) ]);
			}
		}, _('Pause'));

		function updateInto(id, nodes) {
			var el = document.getElementById(id);
			if (!el) return;
			el.innerHTML = '';
			nodes.forEach(function(n) { if (n) el.appendChild(n); });
		}

		function renderGaugeRow() {
			var hwBuf = hwBufferState(fe, ppe, mode);
			var cs = compassState(bypass, hwBuf, jitter, wan, wifi, bridge, mode, latestTopo);
			var ppeBound = (ppe.bnd || {}).total || 0;
			var ppeUnb = (ppe.unb || {}).total || 0;
			var ppeTotal = ppeBound + ppeUnb;
			var ppePct = ppeTotal > 0 ? Math.round(ppeBound / ppeTotal * 100) : 0;

			var cnCap = [ E('b', {}, String(cs.cpuPct) + '%'), ' ' + _('CPU LOAD') + ' · ', E('b', {}, aui.fmtFreq(st.cpu_hw_freq)), ' · ' + _('Offload share') + ' ', E('b', {}, ppePct + '%') ];
			var cpCap = [ E('b', {}, String(ppeBound)), ' ' + _('Bound') + ' / ', E('b', {}, String(ppeUnb)), ' ' + _('Unbound') + ' · ' + _('Latency') + ' ', E('b', {}, (cs.latMs || 0) + ' ms') ];

			var arr = [
				aui.gauge(buildCpuNpuCompassSVG(cs, ppe, st, ti), cnCap, 'cpu-npu-svg-wrap'),
				aui.gauge(buildCompassSVG(cs, mode, ppe, ti), cpCap, 'compass-svg-wrap')
			];
			for (var b = 0; b < 3; b++) {
				var g = buildWifiGauge(b, wifi, ti, st, ppe, hasWifi);
				if (g) arr.push(g);
			}
			return arr;
		}

		var view = E('div', { 'class': 'cbi-map airoha-page' }, [
			E('header', { 'class': 'ai-pagehead' }, [
				E('h2', {}, _('Airoha FlowSense')),
				E('p', { 'class': 'ai-lede' }, _('Real-time PPE hardware offload monitoring, link health and hardware offload status · source luci.airoha_flowsense (5 s poll)'))
			]),
			E('div', { 'class': 'ai-toolbar' }, [ refreshBtn, pauseBtn, E('span', { 'class': 'ai-spacer' }), updatedEl = E('span', { 'class': 'ai-updated' }, '') ]),

			// Conflict alerts
			E('div', { 'id': 'conflict-alerts' }, [ renderConflictAlerts(alertData) ]),

			// Link overview
			aui.section({
				title: _('Link Overview'),
				hint: _('The gauge row is an auto-fit grid: on a board without wireless the three WiFi gauges are not built at all, so the remainder reflows to fill the row.'),
				body: E('div', {}, [
					E('div', { 'id': 'link-tiles' }, [ renderLinkTiles(dm, bypass, st, wan, wifi, apo, flo, vo, ppo, mode, hasWifi, latestTopo) ]),
					E('div', { 'id': 'gauge-row', 'class': 'ai-gauge-row', 'style': 'margin-top:var(--ds-sp-3)' }, renderGaugeRow()),
					E('div', { 'id': 'link-quad' }, [
						renderQuad(compassState(bypass, hwBufferState(fe, ppe, mode), jitter, wan, wifi, bridge, mode, latestTopo), bypass, jitter, wan, wifi, bridge, mode)
					]),
					E('div', { 'id': 'eth-row' }, [ renderEthCards((eth && Array.isArray(eth.ports)) ? eth.ports : [], ppe, latestTopo) ])
				])
			}),

			// Mode & acceleration (read-only mirror)
			aui.section({
				title: _('Mode & Acceleration Status'),
				body: E('div', { 'id': 'mode-cards' }, [ renderModeCards(dm, apo, flo, vo, ppo) ])
			}),

			// PPE flow monitor
			aui.section({
				title: _('PPE Flow Monitor'),
				body: E('div', { 'id': 'ppe-console' }, [ renderPpeConsole(ppe) ])
			}),

			// Bridge / WAN / Token detail blocks
			E('div', { 'id': 'detail-blocks' }, [ renderDetailSection(bridge, wan, ti, fe, hasWifi, latestTopo) ]),

			// WiFi band detail table (skipped entirely on a radio-less board)
			E('div', { 'id': 'wifi-detail', 'class': 'ai-wifi-only' }, [ renderWifiTable(wifi, ppe, hasWifi) ])
		]);

		// Gate the whole page on wireless presence; the auto-fit grids reflow to
		// fill the row when the WiFi gauges are skipped. Updated on every poll.
		view.setAttribute('data-wifi', hasWifi ? 'true' : 'false');

		// Data fetch + DOM update function — called immediately and via poll
		var fetchData = L.bind(function() {
			// One round trip for the page plus one tiny uci read for the configured
			// ping target, so the Latency card stays correct even if the overview
			// call fails and the daemon's /tmp result file is gone.
			return Promise.all([
				callGetOverview().catch(function() { return {}; }),
				callGetPingTarget().catch(function() { return {}; })
			]).then(L.bind(function(results) {
				results = results || [];
				var overview = results[0] || {};
				_cfgPingTarget = (results[1] && results[1].target) || _cfgPingTarget || '';
				var d = [
					overview.status, overview.ppe, overview.token, overview.frame,
					overview.vlan, overview.tx, overview.mode, overview.bypass,
					overview.wan, overview.jitter, overview.alerts, overview.wifi,
					overview.bridge, overview.flow, overview.pppoe, overview.apmode,
					overview.eth
				];
				aui.ensureCss();
				var st = d[0] || {}, ppe = d[1] || {}, ti = d[2] || {}, fe = d[3] || {};
				var vo = d[4] || {}, txs = d[5] || {}, dm = d[6] || {};
				var bypass = d[7] || {}, wan = d[8] || {};
				var jitter = d[9] || {}, alertData = d[10] || {};
				var wifi = d[11] || {}, bridge = d[12] || {};
				var flo = d[13] || {}, ppo = d[14] || {}, apo = d[15] || {};
				var eth = d[16] || {};
				var mode = dm.mode || 'router';
				hasWifi = aui.hasWifiRadio(wifi);
				view.setAttribute('data-wifi', hasWifi ? 'true' : 'false');
				latestPpe = ppe;
				latestEth = eth;
				latestTopo = normalizeTopo(overview.topo, overview.pon);

				var hwBuf = hwBufferState(fe, ppe, mode);
				var cs = compassState(bypass, hwBuf, jitter, wan, wifi, bridge, mode, latestTopo);

				// Per-port Mbps deltas from cumulative byte counters
				updateInto('link-tiles', [ renderLinkTiles(dm, bypass, st, wan, wifi, apo, flo, vo, ppo, mode, hasWifi, latestTopo) ]);

				// Rebuild the gauge row (SVG gauges have no interactive state, so a
				// full rebuild is cheaper to reason about than in-place patching).
				var gRow = document.getElementById('gauge-row');
				if (gRow) {
					gRow.innerHTML = '';
					renderGaugeRow().forEach(function(n) { gRow.appendChild(n); });
				}

				updateInto('link-quad', [ renderQuad(cs, bypass, jitter, wan, wifi, bridge, mode) ]);
				updateInto('conflict-alerts', [ renderConflictAlerts(alertData) ]);
				updateInto('mode-cards', [ renderModeCards(dm, apo, flo, vo, ppo) ]);
				if (!ppePaused) updateInto('ppe-console', [ renderPpeConsole(latestPpe) ]);
				updateInto('detail-blocks', [ renderDetailSection(bridge, wan, ti, fe, hasWifi, latestTopo) ]);
				updateInto('wifi-detail', [ renderWifiTable(wifi, ppe, hasWifi) ]);

				markUpdated();
			}, this));
		}, this);

		// Fetch data immediately, then on every poll; eth deltas are computed from
		// the cumulative counters the backend returns, after each refresh.
		var prevEthBytes = {};
		var ethTick = L.bind(function() {
			var ports = (latestEth && Array.isArray(latestEth.ports)) ? latestEth.ports : [];
			var now = Date.now() / 1000;
			ports.forEach(function(p) {
				var prev = prevEthBytes[p.iface];
				var txMbps = 0, rxMbps = 0;
				if (prev && prev.time) {
					var dt = now - prev.time;
					if (dt > 0) {
						txMbps = Math.max(0, (p.tx_bytes - prev.tx) * 8 / dt / 1e6);
						rxMbps = Math.max(0, (p.rx_bytes - prev.rx) * 8 / dt / 1e6);
					}
				}
				prevEthBytes[p.iface] = { tx: p.tx_bytes, rx: p.rx_bytes, time: now };
				p.tx_mbps = txMbps;
				p.rx_mbps = rxMbps;
			});
			updateInto('eth-row', [ renderEthCards(ports, latestPpe, latestTopo) ]);
		}, this);

		// Let the ping-target modal repaint the Latency card immediately rather
		// than waiting for the next 5 s poll.
		_pingRefresh = fetchData;

		fetchData().then(ethTick, ethTick);
		poll.add(function() { return fetchData().then(ethTick, ethTick); }, 5);

		return view;
	},

	handleSaveApply: null, handleSave: null, handleReset: null
});
