'use strict';
'require dom';
'require poll';
'require rpc';
'require ui';
'require view';

var callFanStatus = rpc.declare({
	object: 'luci.fan',
	method: 'getStatus'
});

var HISTORY_WINDOW_MS = 2 * 60 * 1000;
var TIME_GRID_INTERVAL_MS = 10 * 1000;
var TIME_LABEL_INTERVAL_MS = 30 * 1000;
var VALUE_GRID_DIVISIONS = 4;

var history = [];

function tempColor(temp) {
	if (temp <= 40) return '#28a745';
	if (temp <= 55) return '#ffc107';
	if (temp <= 70) return '#fd7e14';
	return '#dc3545';
}

function createTempGauge(label, temp, id) {
	var color = tempColor(temp);
	var percentage = Math.min(100, Math.max(3, (temp / 100) * 100));
	return E('div', { 'class': 'cbi-value', 'style': 'margin-bottom: 10px;' }, [
		E('label', { 'class': 'cbi-value-title', 'style': 'width: 150px;' }, label),
		E('div', { 'class': 'cbi-value-field' }, [
			E('div', { 'style': 'display: flex; align-items: center; gap: 10px;' }, [
				E('div', { 'style': 'width: 200px; height: 20px; background: #e9ecef; border-radius: 4px; overflow: hidden;' }, [
					E('div', { 'id': id + '-bar', 'style': 'width: ' + percentage + '%; height: 100%; background: linear-gradient(90deg, ' + color + ' 0%, ' + color + 'dd 100%); transition: width 0.3s, background 0.3s;' })
				]),
				E('span', { 'id': id + '-value', 'style': 'font-weight: bold; min-width: 50px;' }, temp + '\u00B0C')
			])
		])
	]);
}

function updateGauge(id, temp) {
	var bar = document.getElementById(id + '-bar');
	var value = document.getElementById(id + '-value');
	if (bar && value) {
		var color = tempColor(temp);
		var percentage = Math.min(100, Math.max(3, (temp / 100) * 100));
		bar.style.width = percentage + '%';
		bar.style.background = 'linear-gradient(90deg, ' + color + ' 0%, ' + color + 'dd 100%)';
		value.textContent = temp + '\u00B0C';
	}
}

function appendHistory(status) {
	var now = Date.now();
	history.push({ time: now, temperature: status.temp_board || 0, pwm: status.fan_pwm || 0, rpm: status.fan_rpm || 0 });
	while (history.length && history[0].time < now - HISTORY_WINDOW_MS)
		history.shift();
}

function chartScale(hist, key, minMax, step) {
	var maximum = minMax;
	for (var i = 0; i < hist.length; i++)
		if (hist[i][key] != null)
			maximum = Math.max(maximum, hist[i][key]);
	return Math.ceil(maximum / step) * step;
}

function drawChart(canvas, hist, key, options) {
	if (!canvas || !hist.length) return;
	var style = getComputedStyle(canvas);
	var width = Math.max(canvas.clientWidth, 1);
	var height = Math.max(canvas.clientHeight, 1);
	var dpr = Math.min(window.devicePixelRatio || 1, 2);
	var ctx = canvas.getContext('2d');
	var pad = { left: 28, right: 5, top: 6, bottom: 14 };
	var plotW = Math.max(width - pad.left - pad.right, 1);
	var plotH = Math.max(height - pad.top - pad.bottom, 1);
	var plotB = pad.top + plotH;
	var now = hist[hist.length - 1].time;
	var start = now - HISTORY_WINDOW_MS;
	var maximum = chartScale(hist, key, options.minMax, options.step);
	var lineColor = options.lineColor || '#1976d2';
	var fillColor = options.fillColor || 'rgba(25,118,210,.15)';
	var labelColor = style.color || '#666';
	var gridColor = 'rgba(127,127,127,.2)';

	canvas.width = Math.round(width * dpr);
	canvas.height = Math.round(height * dpr);
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.clearRect(0, 0, width, height);

	ctx.strokeStyle = gridColor;
	ctx.lineWidth = 1;
	ctx.beginPath();
	for (var e = 0; e <= HISTORY_WINDOW_MS; e += TIME_GRID_INTERVAL_MS) {
		var gx = pad.left + plotW * e / HISTORY_WINDOW_MS;
		ctx.moveTo(gx, pad.top); ctx.lineTo(gx, plotB);
	}
	for (var d = 0; d <= VALUE_GRID_DIVISIONS; d++) {
		var gy = pad.top + plotH * d / VALUE_GRID_DIVISIONS;
		ctx.moveTo(pad.left, gy); ctx.lineTo(pad.left + plotW, gy);
	}
	ctx.stroke();

	ctx.fillStyle = labelColor;
	ctx.font = '9px sans-serif';
	ctx.textAlign = 'right';
	ctx.textBaseline = 'top';
	ctx.fillText(options.format(maximum), pad.left - 4, pad.top - 1);
	ctx.textBaseline = 'bottom';
	ctx.fillText(options.format(0), pad.left - 4, plotB + 1);
	ctx.textBaseline = 'middle';
	ctx.fillText(options.format(maximum / 2), pad.left - 4, pad.top + plotH / 2);

	ctx.textBaseline = 'bottom';
	for (var e = 0; e <= HISTORY_WINDOW_MS; e += TIME_LABEL_INTERVAL_MS) {
		var lx = pad.left + plotW * e / HISTORY_WINDOW_MS;
		var remaining = (HISTORY_WINDOW_MS - e) / 1000;
		ctx.textAlign = e === 0 ? 'left' : e === HISTORY_WINDOW_MS ? 'right' : 'center';
		ctx.fillText(remaining ? '-' + remaining + 's' : '0', lx, height);
	}

	function pt(s) {
		return {
			x: pad.left + (s.time - start) / HISTORY_WINDOW_MS * plotW,
			y: plotB - (s[key] || 0) / maximum * plotH
		};
	}

	ctx.beginPath();
	ctx.moveTo(pt(hist[0]).x, plotB);
	for (var i = 0; i < hist.length; i++)
		ctx.lineTo(pt(hist[i]).x, pt(hist[i]).y);
	ctx.lineTo(pt(hist[hist.length - 1]).x, plotB);
	ctx.closePath();
	ctx.fillStyle = fillColor;
	ctx.fill();

	ctx.beginPath();
	for (var j = 0; j < hist.length; j++) {
		var p = pt(hist[j]);
		j === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
	}
	ctx.strokeStyle = lineColor;
	ctx.lineWidth = 1.5;
	ctx.stroke();
}

function chartCard(label, valueText, canvasId) {
	return E('div', { 'style': 'flex:1;min-width:0;padding:.55rem .7rem;' }, [
		E('span', { 'style': 'display:block;color:var(--text-color-medium,#666);font-size:.72rem;' }, label),
		E('div', { 'style': 'display:flex;align-items:baseline;gap:.3rem;margin-top:.12rem;' }, [
			E('span', { 'id': canvasId + '-val', 'style': 'font-size:1.18rem;font-weight:600;line-height:1.3;' }, valueText)
		]),
		E('div', { 'style': 'height:72px;margin-top:.4rem;' }, [
			E('canvas', {
				'id': canvasId,
				'style': 'display:block;width:100%;height:100%;color:var(--text-color-medium,#666);background:rgba(127,127,127,.025);border:1px solid rgba(127,127,127,.24);border-radius:3px;'
			})
		])
	]);
}

function drawAllCharts() {
	if (!history.length) return;
	drawChart(document.getElementById('fc-temp'), history, 'temperature', {
		minMax: 40, step: 20,
		lineColor: '#c74b45', fillColor: 'rgba(199,75,69,.15)',
		format: function(v) { return v + '\u00B0'; }
	});
	drawChart(document.getElementById('fc-pwm'), history, 'pwm', {
		minMax: 100, step: 50,
		lineColor: '#1976d2', fillColor: 'rgba(25,118,210,.15)',
		format: function(v) { return String(v); }
	});
	drawChart(document.getElementById('fc-rpm'), history, 'rpm', {
		minMax: 1000, step: 500,
		lineColor: '#2f8a57', fillColor: 'rgba(47,138,87,.15)',
		format: function(v) { return String(v); }
	});
}

return view.extend({
	load: function() {
		return Promise.resolve([]);
	},

	render: function(data) {
		data = data || {};
		var status = data || {};
		var modeClass = status.fan_mode === 2 ? 'label-success' : 'label-warning';
		var modeText = this.getModeText(status.uci_mode);
		var presetText = this.getPresetText(status.uci_mode, status.uci_preset);

		var viewEl = E('div', { 'class': 'cbi-map' }, [
			E('div', { 'class': 'cbi-map-descr' }, _('View real-time fan speed and system temperatures.')),

			E('div', { 'class': 'cbi-section' }, [
				E('div', { 'class': 'cbi-section-node' }, [
					E('div', { 'class': 'cbi-value' }, [
						E('label', { 'class': 'cbi-value-title', 'style': 'width: 150px;' }, _('Fan Speed')),
						E('div', { 'class': 'cbi-value-field' }, [
							E('span', { 'id': 'fan-rpm-value', 'style': 'font-weight: bold;' },
								(status.fan_rpm || 0) + ' RPM (' + (status.fan_percentage || 0) + '%)')
						])
					]),
					E('div', { 'class': 'cbi-value' }, [
						E('label', { 'class': 'cbi-value-title', 'style': 'width: 150px;' }, _('Control Mode')),
						E('div', { 'class': 'cbi-value-field' }, [
							E('span', { 'id': 'fan-mode', 'class': modeClass }, modeText)
						])
					]),
					E('div', { 'class': 'cbi-value' }, [
						E('label', { 'class': 'cbi-value-title', 'style': 'width: 150px;' }, _('Fan Curve Preset')),
						E('div', { 'class': 'cbi-value-field' }, [
							E('span', { 'id': 'fan-preset' }, presetText)
						])
					])
				])
			]),

			E('div', { 'class': 'cbi-section' }, [
				E('div', { 'style': 'display:flex;flex-wrap:nowrap;' }, [
					chartCard('\u4E3B\u677F\u6E29\u5EA6', (status.temp_board || 0) + '\u00B0C', 'fc-temp'),
					E('div', { 'style': 'width:1px;background:rgba(127,127,127,.2);flex-shrink:0;' }),
					chartCard('\u98CE\u6247 PWM', (status.fan_pwm || 0) + ' / 255', 'fc-pwm'),
					E('div', { 'style': 'width:1px;background:rgba(127,127,127,.2);flex-shrink:0;' }),
					chartCard('\u98CE\u6247\u8F6C\u901F', (status.fan_rpm || 0) + ' RPM', 'fc-rpm')
				])
			]),

			E('div', { 'class': 'cbi-section' }, [
				E('div', { 'style': 'display: flex; flex-wrap: wrap; gap: 20px;' }, [
					E('div', { 'style': 'flex: 1; min-width: 300px;' }, [
						E('div', { 'class': 'cbi-section-node' }, [
							createTempGauge(_('CPU'), status.temp_cpu || 0, 'temp-cpu'),
							createTempGauge(_('Board (Fan Curve)'), status.temp_board || 0, 'temp-board'),
							createTempGauge(_('10G PHY'), status.temp_phy1 || 0, 'temp-phy1'),
							createTempGauge(_('Switch PHY'), status.temp_phy2 || 0, 'temp-phy2')
						])
					]),
					E('div', { 'style': 'flex: 1; min-width: 300px;', 'id': 'wifi-temps-section' }, [
						E('div', { 'class': 'cbi-section-node' }, [
							createTempGauge(_('2.4 GHz Radio'), status.wifi_24g || 0, 'temp-wifi24g'),
							createTempGauge(_('5 GHz Radio'), status.wifi_5g || 0, 'temp-wifi5g'),
							createTempGauge(_('6 GHz Radio'), status.wifi_6g || 0, 'temp-wifi6g')
						])
					])
				])
			])
		]);

		var fetchData = L.bind(function() {
			return callFanStatus().then(L.bind(function(status) {
				status = status || {};
				updateGauge('temp-cpu', status.temp_cpu || 0);
				updateGauge('temp-board', status.temp_board || 0);
				updateGauge('temp-phy1', status.temp_phy1 || 0);
				updateGauge('temp-phy2', status.temp_phy2 || 0);
				updateGauge('temp-wifi24g', status.wifi_24g || 0);
				updateGauge('temp-wifi5g', status.wifi_5g || 0);
				updateGauge('temp-wifi6g', status.wifi_6g || 0);

				var rpmEl = document.getElementById('fan-rpm-value');
				if (rpmEl) rpmEl.textContent = (status.fan_rpm || 0) + ' RPM (' + (status.fan_percentage || 0) + '%)';

				var modeEl = document.getElementById('fan-mode');
				if (modeEl) {
					modeEl.textContent = this.getModeText(status.uci_mode);
					modeEl.className = status.fan_mode === 2 ? 'label-success' : 'label-warning';
				}
				var presetEl = document.getElementById('fan-preset');
				if (presetEl) presetEl.textContent = this.getPresetText(status.uci_mode, status.uci_preset);

				var tVal = document.getElementById('fc-temp-val');
				if (tVal) tVal.textContent = (status.temp_board || 0) + '\u00B0C';
				var pVal = document.getElementById('fc-pwm-val');
				if (pVal) pVal.textContent = (status.fan_pwm || 0) + ' / 255';
				var rVal = document.getElementById('fc-rpm-val');
				if (rVal) rVal.textContent = (status.fan_rpm || 0) + ' RPM';

				appendHistory(status);
				drawAllCharts();
			}, this));
		}, this);

		requestAnimationFrame(function() { fetchData(); });
		poll.add(fetchData, 3);

		return viewEl;
	},

	getModeText: function(uciMode) {
		if (uciMode === 'manual') return _('Manual (Fixed Speed)');
		return _('Automatic (Follow Curve)');
	},

	getPresetText: function(uciMode, uciPreset) {
		if (uciMode === 'manual') return _('Manual (Fixed Speed)');
		switch (uciPreset) {
			case 'quiet': return _('Quiet - Lower speeds, higher temps');
			case 'performance': return _('Performance - Higher speeds, lower temps');
			case 'custom': return _('Custom - Define your own curve');
			case 'balanced':
			default: return _('Balanced - Good mix of noise and cooling');
		}
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});