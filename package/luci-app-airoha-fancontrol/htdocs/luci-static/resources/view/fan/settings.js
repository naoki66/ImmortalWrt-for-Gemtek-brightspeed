'use strict';
'require view';
'require form';
'require uci';
'require rpc';

var callGetAllCurves = rpc.declare({
	object: 'luci.fan',
	method: 'getAllCurves'
});

var settingsCSS = '\
.fan-settings{--fan-blue:#00c8ff;--fan-green:#00cc44;--fan-amber:#f5a623;--fan-red:#d0021b}\
.fan-settings .cbi-section{background:var(--fan-card-bg);border:1px solid var(--fan-border);border-radius:8px;padding:14px;margin:12px 0!important;box-sizing:border-box}\
.fan-settings .cbi-section>h3{font-size:15px;margin:0 0 12px;padding:0 0 8px;border-bottom:1px solid var(--fan-border);color:var(--fan-text)}\
.fan-settings .cbi-section-descr{color:var(--fan-muted);font-size:12px;line-height:1.5;margin:-4px 0 10px}\
.fan-settings .cbi-value{border-bottom:1px solid var(--fan-border);padding:9px 0;margin:0}\
.fan-settings .cbi-value:last-child{border-bottom:0}\
.fan-settings .cbi-value-title{color:var(--fan-text);font-size:13px}\
.fan-settings .cbi-value-description{color:var(--fan-muted);font-size:11px;line-height:1.4;margin-top:4px}\
.fan-curve-wrap{max-width:680px;border:1px solid var(--fan-border);border-left:3px solid var(--fan-blue);border-radius:8px;padding:10px;background:var(--fan-card-bg)}\
.fan-curve-canvas{display:block;width:100%;height:300px;background:var(--fan-canvas-bg);border:1px solid var(--fan-border);border-radius:6px;box-sizing:border-box}\
@media(max-width:640px){.fan-settings .cbi-section{padding:11px}.fan-settings .cbi-value-title{float:none!important;width:auto!important;margin-bottom:6px}.fan-settings .cbi-value-field{margin-left:0!important}.fan-curve-canvas{height:240px}}\
';

var _settingsDarkMode = null;

function isDarkMode() {
	var els = [document.body, document.querySelector('.main-content'), document.querySelector('#maincontent'), document.querySelector('.cbi-map')];
	for (var i = 0; i < els.length; i++) {
		if (!els[i]) continue;
		var rgb = window.getComputedStyle(els[i]).backgroundColor.match(/\d+/g);
		if (!rgb || rgb.length < 3) continue;
		return (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000 < 128;
	}
	return document.querySelectorAll('link[href*="dark"],link[href*="glass"]').length > 0;
}

function injectCSS() {
	var el = document.getElementById('fan-settings-theme-css');
	if (!el) {
		el = document.createElement('style');
		el.id = 'fan-settings-theme-css';
		document.head.appendChild(el);
	}
	var dark = isDarkMode();
	if (dark === _settingsDarkMode) return;
	_settingsDarkMode = dark;
	el.textContent = settingsCSS + (dark
		? ':root{--fan-card-bg:#1e1e1e;--fan-canvas-bg:#191919;--fan-border:#333;--fan-muted:#a3a3a3;--fan-text:#ececec;--fan-grid:rgba(255,255,255,.14);--fan-axis:#b5b5b5}'
		: ':root{--fan-card-bg:#fff;--fan-canvas-bg:#fbfcfd;--fan-border:#d0d0d0;--fan-muted:#666;--fan-text:#222;--fan-grid:rgba(80,90,100,.18);--fan-axis:#555}');
}

function canvasColor(canvas, property, fallback) {
	return window.getComputedStyle(canvas).getPropertyValue(property).trim() || fallback;
}

function drawCurveCanvas(canvasId, curves, activePreset, customPreview) {
	var canvas = document.getElementById(canvasId);
	if (!canvas) return;
	var ctx = canvas.getContext('2d');
	var dpr = Math.min(window.devicePixelRatio || 1, 2);
	var cssW = canvas.clientWidth || 500;
	var cssH = canvas.clientHeight || 300;
	canvas.width = Math.round(cssW * dpr);
	canvas.height = Math.round(cssH * dpr);
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	var width = cssW;
	var height = cssH;
	var padding = 40;
	var background = canvasColor(canvas, '--fan-canvas-bg', '#fbfcfd');
	var grid = canvasColor(canvas, '--fan-grid', 'rgba(80,90,100,.18)');
	var axis = canvasColor(canvas, '--fan-axis', '#555');
	var muted = canvasColor(canvas, '--fan-muted', '#666');
	var text = canvasColor(canvas, '--fan-text', '#222');

	ctx.fillStyle = background;
	ctx.fillRect(0, 0, width, height);

	ctx.strokeStyle = grid;
	ctx.lineWidth = 1;
	for (var t = 0; t <= 100; t += 10) {
		var x = padding + (t / 100) * (width - 2 * padding);
		ctx.beginPath(); ctx.moveTo(x, padding); ctx.lineTo(x, height - padding); ctx.stroke();
	}
	for (var p = 0; p <= 255; p += 51) {
		var y = height - padding - (p / 255) * (height - 2 * padding);
		ctx.beginPath(); ctx.moveTo(padding, y); ctx.lineTo(width - padding, y); ctx.stroke();
	}

	ctx.strokeStyle = axis;
	ctx.lineWidth = 1.5;
	ctx.beginPath();
	ctx.moveTo(padding, padding);
	ctx.lineTo(padding, height - padding);
	ctx.lineTo(width - padding, height - padding);
	ctx.stroke();

	ctx.fillStyle = text;
	ctx.font = '11px sans-serif';
	ctx.textAlign = 'center';
	ctx.fillText('温度 (\u00B0C)', width / 2, height - 5);
	ctx.save();
	ctx.translate(12, height / 2);
	ctx.rotate(-Math.PI / 2);
	ctx.fillText('PWM (0-255)', 0, 0);
	ctx.restore();

	ctx.fillStyle = muted;
	ctx.font = '9px sans-serif';
	ctx.textAlign = 'center';
	for (var t = 0; t <= 100; t += 20) {
		ctx.fillText(t, padding + (t / 100) * (width - 2 * padding), height - padding + 13);
	}
	ctx.textAlign = 'right';
	for (var p = 0; p <= 255; p += 51) {
		ctx.fillText(p, padding - 4, height - padding - (p / 255) * (height - 2 * padding) + 4);
	}

	var colors = {
		'quiet': '#28a745',
		'balanced': '#007bff',
		'performance': '#dc3545',
		'custom': '#6f42c1'
	};

	function drawLine(points, color, alpha, lineW, dots) {
		if (!points || !points.length) return;
		ctx.strokeStyle = color;
		ctx.lineWidth = lineW || 1.5;
		ctx.globalAlpha = alpha != null ? alpha : 0.4;
		ctx.beginPath();
		points.forEach(function(pt, idx) {
			var px = padding + (pt.temp / 100) * (width - 2 * padding);
			var py = height - padding - (pt.pwm / 255) * (height - 2 * padding);
			idx === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
		});
		ctx.stroke();
		if (dots) {
			ctx.fillStyle = color;
			points.forEach(function(pt) {
				var px = padding + (pt.temp / 100) * (width - 2 * padding);
				var py = height - padding - (pt.pwm / 255) * (height - 2 * padding);
				ctx.beginPath(); ctx.arc(px, py, 4, 0, 2 * Math.PI); ctx.fill();
			});
		}
		ctx.globalAlpha = 1;
	}

	Object.keys(curves).forEach(function(preset) {
		var isActive = preset === activePreset && !customPreview;
		drawLine(curves[preset], colors[preset], isActive ? 1 : 0.3, isActive ? 2.5 : 1, isActive);
	});

	if (customPreview) {
		drawLine(customPreview, '#ff6600', 1, 2.5, true);
	}

	var legendY = 15;
	Object.keys(colors).forEach(function(preset) {
		ctx.fillStyle = colors[preset];
		ctx.globalAlpha = preset === activePreset ? 1 : 0.5;
		ctx.fillRect(width - 100, legendY, 12, 12);
		ctx.globalAlpha = 1;
		ctx.fillStyle = text;
		ctx.font = '10px sans-serif';
		ctx.textAlign = 'left';
		ctx.fillText({ quiet: '静音', balanced: '平衡', performance: '性能', custom: '自定义' }[preset] || preset, width - 84, legendY + 10);
		legendY += 17;
	});
	if (customPreview) {
		ctx.fillStyle = '#ff6600';
		ctx.fillRect(width - 100, legendY, 12, 12);
		ctx.fillStyle = text;
		ctx.fillText('预览', width - 84, legendY + 10);
	}
}

function readCustomPoints() {
	var points = [];
	for (var i = 1; i <= 5; i++) {
		var tEl = document.querySelector('[data-name="point' + i + '_temp"] input');
		var pEl = document.querySelector('[data-name="point' + i + '_pwm"] input');
		var temp = tEl ? parseInt(tEl.value, 10) : 0;
		var pwm = pEl ? parseInt(pEl.value, 10) : 0;
		if (isNaN(temp)) temp = 0;
		if (isNaN(pwm)) pwm = 0;
		points.push({ temp: Math.min(100, Math.max(0, temp)), pwm: Math.min(255, Math.max(0, pwm)) });
	}
	return points;
}

return view.extend({
	load: function() {
		return Promise.all([
			uci.load('fan'),
			callGetAllCurves()
		]);
	},

	render: function(data) {
		var curves = data[1] || {};
		var m, s, o;
		injectCSS();

		m = new form.Map('fan', null,
			_('Configure fan control mode and speed curves.'));

		s = m.section(form.NamedSection, 'settings', 'fancontrol', _('Control Mode'));
		s.anonymous = true;

		o = s.option(form.ListValue, 'mode', _('Mode'));
		o.value('auto', _('Automatic (Follow Curve)'));
		o.value('manual', _('Manual (Fixed Speed)'));
		o.default = 'auto';

		o = s.option(form.Value, 'manual_pwm', _('Manual Fan Speed (PWM)'),
			_('Set a fixed PWM value (0-255). 0 = Off, 255 = Full Speed'));
		o.datatype = 'range(0,255)';
		o.default = '127';
		o.depends('mode', 'manual');
		o.rmempty = false;

		o = s.option(form.ListValue, 'curve_preset', _('Fan Curve Preset'));
		o.value('quiet', _('Quiet - Lower speeds, higher temps'));
		o.value('balanced', _('Balanced - Good mix of noise and cooling'));
		o.value('performance', _('Performance - Higher speeds, lower temps'));
		o.value('custom', _('Custom - Define your own curve'));
		o.default = 'balanced';
		o.depends('mode', 'auto');

		o = s.option(form.DummyValue, '_curve_graph', _('Curve Preview'));
		o.depends('mode', 'auto');
		o.rawhtml = true;
		o.cfgvalue = function() {
			return '<div class="fan-curve-wrap"><canvas id="curve-canvas" class="fan-curve-canvas"></canvas></div>';
		};

		s = m.section(form.NamedSection, 'custom', 'curve', _('\u81EA\u5B9A\u4E49\u66F2\u7EBF\u7F16\u8F91\u5668'),
			_('\u5B9A\u4E495\u4E2A\u6E29\u5EA6/PWM\u70B9\u3002\u66F2\u7EBF\u9884\u89C8\u968F\u8F93\u5165\u5B9E\u65F6\u66F4\u65B0\u3002'));
		s.anonymous = true;
		s.addremove = false;

		var defaults = {
			point1_temp: 40, point1_pwm: 54,
			point2_temp: 50, point2_pwm: 69,
			point3_temp: 60, point3_pwm: 95,
			point4_temp: 70, point4_pwm: 199,
			point5_temp: 80, point5_pwm: 255
		};

		for (var i = 1; i <= 5; i++) {
			o = s.option(form.Value, 'point' + i + '_temp',
				_('\u7B2C%d\u70B9 - \u6E29\u5EA6 (\u00B0C)').format(i));
			o.datatype = 'range(0,100)';
			o.default = String(defaults['point' + i + '_temp']);
			o.rmempty = false;

			o = s.option(form.Value, 'point' + i + '_pwm',
				_('\u7B2C%d\u70B9 - PWM (0-255)').format(i));
			o.datatype = 'range(0,255)';
			o.default = String(defaults['point' + i + '_pwm']);
			o.rmempty = false;
		}

		return m.render().then(function(node) {
			node.classList.add('fan-settings');
			requestAnimationFrame(function() {
				injectCSS();
				var presetSelect = node.querySelector('[data-name="curve_preset"] select');
				var modeSelect = node.querySelector('[data-name="mode"] select');
				var point1Marker = node.querySelector('[data-name="point1_temp"]');

				function getCurrentPreset() {
					return presetSelect ? presetSelect.value : uci.get('fan', 'settings', 'curve_preset') || 'balanced';
				}

				function getCurrentMode() {
					return modeSelect ? modeSelect.value : uci.get('fan', 'settings', 'mode') || 'auto';
				}

				function toggleCustomSection() {
					var visible = getCurrentMode() === 'auto' && getCurrentPreset() === 'custom';
					if (point1Marker) {
						var section = point1Marker.closest('.cbi-section');
						if (section) section.style.display = visible ? '' : 'none';
					}
				}

				function redrawCanvas() {
					var preset = getCurrentPreset();
					if (preset === 'custom') {
						drawCurveCanvas('curve-canvas', curves, preset, readCustomPoints());
					} else {
						drawCurveCanvas('curve-canvas', curves, preset, null);
					}
				}

				redrawCanvas();
				toggleCustomSection();

				if (presetSelect) {
					presetSelect.addEventListener('change', function() {
						toggleCustomSection();
						setTimeout(redrawCanvas, 50);
					});
				}

				if (modeSelect) {
					modeSelect.addEventListener('change', function() {
						toggleCustomSection();
						setTimeout(redrawCanvas, 50);
					});
				}

				for (var i = 1; i <= 5; i++) {
					['_temp', '_pwm'].forEach(function(suffix) {
						var el = node.querySelector('[data-name="point' + i + suffix + '"] input');
						if (el) el.addEventListener('input', redrawCanvas);
					});
				}
			});
			return node;
		});
	}
});
