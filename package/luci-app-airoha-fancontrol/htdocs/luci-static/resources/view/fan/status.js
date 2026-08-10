'use strict';
'require dom';
'require poll';
'require rpc';
'require view';

var callFanStatus = rpc.declare({
	object: 'luci.fan',
	method: 'getStatus'
});

var HISTORY_WINDOW_MS = 2 * 60 * 1000;
var TIME_GRID_INTERVAL_MS = 10 * 1000;
var TIME_LABEL_INTERVAL_MS = 30 * 1000;
var VALUE_GRID_DIVISIONS = 4;
var HISTORY_STORAGE_KEY = 'airoha-fancontrol-history-v1';
var history = [];

var themeCSS = '\
.fan-dashboard{--fan-blue:#00c8ff;--fan-green:#00cc44;--fan-amber:#f5a623;--fan-red:#d0021b}\
.fan-summary-grid{display:grid;grid-template-columns:repeat(4,minmax(150px,1fr));gap:8px;margin:0 0 12px}\
.fan-summary-card,.fan-panel,.fan-chart-card,.fan-temp-card{background:var(--fan-card-bg);border:1px solid var(--fan-border);border-radius:8px;box-sizing:border-box}\
.fan-summary-card{border-left:3px solid var(--fan-accent,var(--fan-border));padding:10px 14px;min-height:82px;display:flex;flex-direction:column;justify-content:center}\
.fan-card-title{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--fan-muted);font-family:monospace;margin-bottom:5px}\
.fan-card-value{font-size:20px;line-height:1.15;font-family:monospace;font-weight:700;color:var(--fan-accent,var(--fan-text))}\
.fan-card-sub{font-size:11px;line-height:1.3;color:var(--fan-muted);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\
.fan-panel{padding:14px;margin:12px 0}\
.fan-panel-title{font-size:15px;font-weight:600;color:var(--fan-text);padding:0 0 8px;margin:0 0 12px;border-bottom:1px solid var(--fan-border)}\
.fan-chart-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}\
.fan-chart-card{border-left:3px solid var(--fan-chart-accent,var(--fan-border));padding:10px 12px;min-width:0}\
.fan-chart-value{font-size:20px;font-family:monospace;font-weight:700;line-height:1.15;color:var(--fan-text)}\
.fan-chart-canvas{display:block;width:100%;height:120px;margin-top:8px;color:var(--fan-muted);background:color-mix(in srgb,var(--fan-card-bg) 88%,var(--fan-border));border:1px solid var(--fan-border);border-radius:6px}\
.fan-temp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}\
.fan-temp-group{min-width:0}\
.fan-temp-group-title{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--fan-muted);font-family:monospace;margin:0 0 8px}\
.fan-temp-list{display:grid;gap:7px}\
.fan-temp-card{border-left:3px solid var(--fan-temp-accent,var(--fan-border));padding:8px 10px;min-width:0}\
.fan-temp-row{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:6px}\
.fan-temp-label{font-size:12px;color:var(--fan-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\
.fan-temp-value{font-family:monospace;font-size:16px;font-weight:700;color:var(--fan-temp-accent);white-space:nowrap}\
.fan-temp-track{height:6px;border-radius:999px;overflow:hidden;background:var(--fan-track)}\
.fan-temp-fill{height:100%;border-radius:inherit;background:var(--fan-temp-accent);transition:width .3s,background .3s}\
@media(max-width:1050px){.fan-summary-grid{grid-template-columns:repeat(2,minmax(160px,1fr))}.fan-chart-grid{grid-template-columns:1fr}}\
@media(max-width:640px){.fan-summary-grid,.fan-temp-grid{grid-template-columns:1fr}.fan-panel{padding:11px}.fan-summary-card{min-height:74px}.fan-chart-canvas{height:112px}}\
';

var _lastDarkMode = null;

function isDarkMode() {
	var els = [document.body, document.querySelector('.main-content'), document.querySelector('#maincontent'), document.querySelector('.cbi-map')];
	for (var i = 0; i < els.length; i++) {
		if (!els[i]) continue;
		var rgb = window.getComputedStyle(els[i]).backgroundColor.match(/\d+/g);
		if (!rgb || rgb.length < 3) continue;
		var luminance = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
		return luminance < 128;
	}
	return document.querySelectorAll('link[href*="dark"],link[href*="glass"]').length > 0;
}

function injectCSS() {
	var el = document.getElementById('fan-theme-css');
	if (!el) {
		el = document.createElement('style');
		el.id = 'fan-theme-css';
		document.head.appendChild(el);
	}
	var dark = isDarkMode();
	if (dark === _lastDarkMode) return;
	_lastDarkMode = dark;
	el.textContent = themeCSS + (dark
		? ':root{--fan-card-bg:#1e1e1e;--fan-border:#333;--fan-muted:#a3a3a3;--fan-text:#ececec;--fan-track:#333}'
		: ':root{--fan-card-bg:#fff;--fan-border:#d0d0d0;--fan-muted:#666;--fan-text:#222;--fan-track:#e7e7e7}');
}

function tempColor(temp) {
	if (temp <= 40) return '#00cc44';
	if (temp <= 55) return '#f5a623';
	if (temp <= 70) return '#f97316';
	return '#d0021b';
}

function restoreHistory() {
	try {
		var saved = JSON.parse(window.localStorage.getItem(HISTORY_STORAGE_KEY) || '[]');
		var cutoff = Date.now() - HISTORY_WINDOW_MS;
		if (!Array.isArray(saved)) return;
		history = saved.filter(function(sample) {
			return sample && typeof sample.time === 'number' && sample.time >= cutoff &&
				typeof sample.temperature === 'number' && typeof sample.pwm === 'number' && typeof sample.rpm === 'number';
		});
	} catch (e) {
		history = [];
	}
}

function persistHistory() {
	try {
		window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
	} catch (e) {
		/* Local storage is optional; keep the live chart working when it is unavailable. */
	}
}

function modeInfo(uciMode) {
	return uciMode === 'manual'
		? { value: _('Manual'), sub: '固定 PWM 输出', color: '#f5a623' }
		: { value: _('Automatic'), sub: '按风扇曲线自动调速', color: '#00c8ff' };
}

function presetInfo(uciMode, preset) {
	if (uciMode === 'manual') return { value: _('Manual'), sub: '当前不使用曲线', color: '#6b7280' };
	var labels = { quiet: '静音', balanced: '平衡', performance: '性能', custom: '自定义' };
	var descriptions = { quiet: '优先降低噪声', balanced: '噪声与散热平衡', performance: '优先散热', custom: '自定义温度曲线' };
	return { value: labels[preset] || labels.balanced, sub: descriptions[preset] || descriptions.balanced, color: '#00cc44' };
}

function summaryData(status) {
	var mode = modeInfo(status.uci_mode);
	var preset = presetInfo(status.uci_mode, status.uci_preset);
	return [
		{ id: 'fan-summary-rpm', title: _('Fan Speed'), value: (status.fan_rpm || 0) + ' RPM', sub: (status.fan_percentage || 0) + '% PWM 输出', color: '#00c8ff' },
		{ id: 'fan-summary-pwm', title: 'PWM', value: (status.fan_pwm || 0) + ' / 255', sub: (status.fan_percentage || 0) + '%', color: '#00cc44' },
		{ id: 'fan-summary-mode', title: _('Control Mode'), value: mode.value, sub: mode.sub, color: mode.color },
		{ id: 'fan-summary-preset', title: _('Fan Curve Preset'), value: preset.value, sub: preset.sub, color: preset.color }
	];
}

function renderSummary(status) {
	return E('div', { 'class': 'fan-summary-grid' }, summaryData(status).map(function(card) {
		return E('div', { 'id': card.id, 'class': 'fan-summary-card', 'style': '--fan-accent:' + card.color }, [
			E('div', { 'class': 'fan-card-title' }, card.title),
			E('div', { 'class': 'fan-card-value' }, card.value),
			E('div', { 'class': 'fan-card-sub' }, card.sub)
		]);
	}));
}

function updateSummary(status) {
	summaryData(status).forEach(function(card) {
		var el = document.getElementById(card.id);
		if (!el) return;
		el.style.setProperty('--fan-accent', card.color);
		var value = el.querySelector('.fan-card-value');
		var sub = el.querySelector('.fan-card-sub');
		if (value) value.textContent = card.value;
		if (sub) sub.textContent = card.sub;
	});
}

function createTempGauge(label, temp, id) {
	var color = tempColor(temp);
	var percentage = Math.min(100, Math.max(3, temp));
	return E('div', { 'id': id, 'class': 'fan-temp-card', 'style': '--fan-temp-accent:' + color }, [
		E('div', { 'class': 'fan-temp-row' }, [
			E('span', { 'class': 'fan-temp-label' }, label),
			E('span', { 'class': 'fan-temp-value' }, temp + '\u00b0C')
		]),
		E('div', { 'class': 'fan-temp-track' }, [
			E('div', { 'class': 'fan-temp-fill', 'style': 'width:' + percentage + '%' })
		])
	]);
}

function updateGauge(id, temp) {
	var card = document.getElementById(id);
	if (!card) return;
	var color = tempColor(temp);
	var value = card.querySelector('.fan-temp-value');
	var fill = card.querySelector('.fan-temp-fill');
	card.style.setProperty('--fan-temp-accent', color);
	if (value) value.textContent = temp + '\u00b0C';
	if (fill) fill.style.width = Math.min(100, Math.max(3, temp)) + '%';
}

function appendHistory(status) {
	var now = Date.now();
	history.push({ time: now, temperature: status.temp_board || 0, pwm: status.fan_pwm || 0, rpm: status.fan_rpm || 0 });
	while (history.length && history[0].time < now - HISTORY_WINDOW_MS) history.shift();
	persistHistory();
}

function chartScale(hist, key, minMax, step) {
	var maximum = minMax;
	for (var i = 0; i < hist.length; i++) if (hist[i][key] != null) maximum = Math.max(maximum, hist[i][key]);
	return Math.ceil(maximum / step) * step;
}

function drawChart(canvas, hist, key, options) {
	if (!canvas || !hist.length) return;
	var style = getComputedStyle(canvas);
	var width = Math.max(canvas.clientWidth, 1);
	var height = Math.max(canvas.clientHeight, 1);
	var dpr = Math.min(window.devicePixelRatio || 1, 2);
	var ctx = canvas.getContext('2d');
	var pad = { left: 31, right: 6, top: 7, bottom: 16 };
	var plotW = Math.max(width - pad.left - pad.right, 1);
	var plotH = Math.max(height - pad.top - pad.bottom, 1);
	var plotB = pad.top + plotH;
	var now = hist[hist.length - 1].time;
	var start = now - HISTORY_WINDOW_MS;
	var maximum = chartScale(hist, key, options.minMax, options.step);
	var labelColor = style.color || '#666';

	canvas.width = Math.round(width * dpr);
	canvas.height = Math.round(height * dpr);
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.clearRect(0, 0, width, height);
	ctx.strokeStyle = 'rgba(127,127,127,.24)';
	ctx.lineWidth = 1;
	ctx.beginPath();
	for (var e = 0; e <= HISTORY_WINDOW_MS; e += TIME_GRID_INTERVAL_MS) {
		var gx = pad.left + plotW * e / HISTORY_WINDOW_MS;
		ctx.moveTo(gx, pad.top);
		ctx.lineTo(gx, plotB);
	}
	for (var d = 0; d <= VALUE_GRID_DIVISIONS; d++) {
		var gy = pad.top + plotH * d / VALUE_GRID_DIVISIONS;
		ctx.moveTo(pad.left, gy);
		ctx.lineTo(pad.left + plotW, gy);
	}
	ctx.stroke();

	ctx.fillStyle = labelColor;
	ctx.font = '9px sans-serif';
	ctx.textAlign = 'right';
	ctx.textBaseline = 'top';
	ctx.fillText(options.format(maximum), pad.left - 4, pad.top - 1);
	ctx.textBaseline = 'middle';
	ctx.fillText(options.format(maximum / 2), pad.left - 4, pad.top + plotH / 2);
	ctx.textBaseline = 'bottom';
	ctx.fillText(options.format(0), pad.left - 4, plotB + 1);
	for (var t = 0; t <= HISTORY_WINDOW_MS; t += TIME_LABEL_INTERVAL_MS) {
		var lx = pad.left + plotW * t / HISTORY_WINDOW_MS;
		var remaining = (HISTORY_WINDOW_MS - t) / 1000;
		ctx.textAlign = t === 0 ? 'left' : t === HISTORY_WINDOW_MS ? 'right' : 'center';
		ctx.fillText(remaining ? '-' + remaining + 's' : '0', lx, height);
	}

	function point(sample) {
		return { x: pad.left + (sample.time - start) / HISTORY_WINDOW_MS * plotW, y: plotB - (sample[key] || 0) / maximum * plotH };
	}
	ctx.beginPath();
	ctx.moveTo(point(hist[0]).x, plotB);
	for (var i = 0; i < hist.length; i++) { var fillPoint = point(hist[i]); ctx.lineTo(fillPoint.x, fillPoint.y); }
	ctx.lineTo(point(hist[hist.length - 1]).x, plotB);
	ctx.closePath();
	ctx.fillStyle = options.fillColor;
	ctx.fill();
	ctx.beginPath();
	for (var j = 0; j < hist.length; j++) {
		var linePoint = point(hist[j]);
		j === 0 ? ctx.moveTo(linePoint.x, linePoint.y) : ctx.lineTo(linePoint.x, linePoint.y);
	}
	ctx.strokeStyle = options.lineColor;
	ctx.lineWidth = 1.7;
	ctx.stroke();
}

function chartCard(label, valueText, canvasId, color) {
	return E('div', { 'class': 'fan-chart-card', 'style': '--fan-chart-accent:' + color }, [
		E('div', { 'class': 'fan-card-title' }, label),
		E('div', { 'id': canvasId + '-val', 'class': 'fan-chart-value' }, valueText),
		E('canvas', { 'id': canvasId, 'class': 'fan-chart-canvas' })
	]);
}

function drawAllCharts() {
	if (!history.length) return;
	drawChart(document.getElementById('fc-temp'), history, 'temperature', { minMax: 40, step: 20, lineColor: '#f97316', fillColor: 'rgba(249,115,22,.16)', format: function(value) { return value + '\u00b0'; } });
	drawChart(document.getElementById('fc-pwm'), history, 'pwm', { minMax: 100, step: 50, lineColor: '#00c8ff', fillColor: 'rgba(0,200,255,.14)', format: function(value) { return String(value); } });
	drawChart(document.getElementById('fc-rpm'), history, 'rpm', { minMax: 1000, step: 500, lineColor: '#00cc44', fillColor: 'rgba(0,204,68,.14)', format: function(value) { return String(value); } });
}

function temperatureGroup(title, entries) {
	return E('div', { 'class': 'fan-temp-group' }, [
		E('div', { 'class': 'fan-temp-group-title' }, title),
		E('div', { 'class': 'fan-temp-list' }, entries)
	]);
}

return view.extend({
	load: function() {
		return Promise.resolve([]);
	},

	render: function(data) {
		injectCSS();
		restoreHistory();
		var status = data || {};
		var viewEl = E('div', { 'class': 'cbi-map fan-dashboard' }, [
			E('div', { 'class': 'cbi-map-descr' }, _('View real-time fan speed and system temperatures.')),
			renderSummary(status),
			E('div', { 'class': 'fan-panel' }, [
				E('div', { 'class': 'fan-panel-title' }, '实时趋势'),
				E('div', { 'class': 'fan-chart-grid' }, [
					chartCard('主板温度', (status.temp_board || 0) + '\u00b0C', 'fc-temp', '#f97316'),
					chartCard('风扇 PWM', (status.fan_pwm || 0) + ' / 255', 'fc-pwm', '#00c8ff'),
					chartCard(_('Fan Speed'), (status.fan_rpm || 0) + ' RPM', 'fc-rpm', '#00cc44')
				])
			]),
			E('div', { 'class': 'fan-panel' }, [
				E('div', { 'class': 'fan-panel-title' }, _('Temperatures')),
				E('div', { 'class': 'fan-temp-grid' }, [
					temperatureGroup(_('System'), [
						createTempGauge(_('CPU'), status.temp_cpu || 0, 'temp-cpu'),
						createTempGauge(_('Board (Fan Curve)'), status.temp_board || 0, 'temp-board'),
						createTempGauge(_('10G PHY'), status.temp_phy1 || 0, 'temp-phy1'),
						createTempGauge(_('Switch PHY'), status.temp_phy2 || 0, 'temp-phy2')
					]),
					temperatureGroup(_('WiFi'), [
						createTempGauge(_('2.4 GHz Radio'), status.wifi_24g || 0, 'temp-wifi24g'),
						createTempGauge(_('5 GHz Radio'), status.wifi_5g || 0, 'temp-wifi5g'),
						createTempGauge(_('6 GHz Radio'), status.wifi_6g || 0, 'temp-wifi6g')
					])
				])
			])
		]);

		var fetchData = L.bind(function() {
			return callFanStatus().then(L.bind(function(current) {
				current = current || {};
				injectCSS();
				updateSummary(current);
				updateGauge('temp-cpu', current.temp_cpu || 0);
				updateGauge('temp-board', current.temp_board || 0);
				updateGauge('temp-phy1', current.temp_phy1 || 0);
				updateGauge('temp-phy2', current.temp_phy2 || 0);
				updateGauge('temp-wifi24g', current.wifi_24g || 0);
				updateGauge('temp-wifi5g', current.wifi_5g || 0);
				updateGauge('temp-wifi6g', current.wifi_6g || 0);
				var values = [ ['fc-temp-val', (current.temp_board || 0) + '\u00b0C'], ['fc-pwm-val', (current.fan_pwm || 0) + ' / 255'], ['fc-rpm-val', (current.fan_rpm || 0) + ' RPM'] ];
				values.forEach(function(item) { var el = document.getElementById(item[0]); if (el) el.textContent = item[1]; });
				appendHistory(current);
				drawAllCharts();
			}, this));
		}, this);

		requestAnimationFrame(function() {
			drawAllCharts();
			fetchData();
		});
		poll.add(fetchData, 3);
		return viewEl;
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
