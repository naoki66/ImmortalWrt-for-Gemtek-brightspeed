'use strict';
'require view';
'require form';
'require uci';
'require rpc';

var callGetAllCurves = rpc.declare({
	object: 'luci.fan',
	method: 'getAllCurves'
});

function drawCurveCanvas(canvasId, curves, activePreset) {
	var canvas = document.getElementById(canvasId);
	if (!canvas) return;
	var ctx = canvas.getContext('2d');
	var width = canvas.width;
	var height = canvas.height;
	var padding = 40;

	ctx.fillStyle = '#fff';
	ctx.fillRect(0, 0, width, height);

	ctx.strokeStyle = '#e0e0e0';
	ctx.lineWidth = 1;
	for (var t = 0; t <= 100; t += 10) {
		var x = padding + (t / 100) * (width - 2 * padding);
		ctx.beginPath();
		ctx.moveTo(x, padding);
		ctx.lineTo(x, height - padding);
		ctx.stroke();
	}
	for (var p = 0; p <= 255; p += 51) {
		var y = height - padding - (p / 255) * (height - 2 * padding);
		ctx.beginPath();
		ctx.moveTo(padding, y);
		ctx.lineTo(width - padding, y);
		ctx.stroke();
	}

	ctx.strokeStyle = '#333';
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(padding, padding);
	ctx.lineTo(padding, height - padding);
	ctx.lineTo(width - padding, height - padding);
	ctx.stroke();

	ctx.fillStyle = '#333';
	ctx.font = '12px sans-serif';
	ctx.textAlign = 'center';
	ctx.fillText(_('Temperature (\u00B0C)'), width / 2, height - 5);
	ctx.save();
	ctx.translate(12, height / 2);
	ctx.rotate(-Math.PI / 2);
	ctx.fillText(_('PWM (0-255)'), 0, 0);
	ctx.restore();

	ctx.textAlign = 'center';
	for (var t = 0; t <= 100; t += 20) {
		var x = padding + (t / 100) * (width - 2 * padding);
		ctx.fillText(t.toString(), x, height - padding + 15);
	}
	ctx.textAlign = 'right';
	for (var p = 0; p <= 255; p += 51) {
		var y = height - padding - (p / 255) * (height - 2 * padding);
		ctx.fillText(p.toString(), padding - 5, y + 4);
	}

	var colors = {
		'quiet': '#28a745',
		'balanced': '#007bff',
		'performance': '#dc3545',
		'custom': '#6f42c1'
	};

	Object.keys(curves).forEach(function(preset) {
		var points = curves[preset];
		var color = colors[preset] || '#999';
		var isActive = preset === activePreset;
		ctx.strokeStyle = color;
		ctx.lineWidth = isActive ? 3 : 1.5;
		ctx.globalAlpha = isActive ? 1 : 0.4;
		ctx.beginPath();
		points.forEach(function(point, idx) {
			var x = padding + (point.temp / 100) * (width - 2 * padding);
			var y = height - padding - (point.pwm / 255) * (height - 2 * padding);
			if (idx === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		});
		ctx.stroke();
		if (isActive) {
			ctx.fillStyle = color;
			points.forEach(function(point) {
				var x = padding + (point.temp / 100) * (width - 2 * padding);
				var y = height - padding - (point.pwm / 255) * (height - 2 * padding);
				ctx.beginPath();
				ctx.arc(x, y, 5, 0, 2 * Math.PI);
				ctx.fill();
			});
		}
		ctx.globalAlpha = 1;
	});

	var legendY = 15;
	Object.keys(colors).forEach(function(preset) {
		ctx.fillStyle = colors[preset];
		ctx.fillRect(width - 100, legendY, 15, 15);
		ctx.fillStyle = '#333';
		ctx.textAlign = 'left';
		ctx.fillText(_(preset), width - 80, legendY + 12);
		legendY += 20;
	});
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

		m = new form.Map('fan', _('Settings'),
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
			return '<canvas id="curve-canvas" width="500" height="300" style="border: 1px solid #ccc; background: #fff; display: block; margin: 10px auto;"></canvas>';
		};

		s = m.section(form.NamedSection, 'custom', 'curve', _('Custom Curve Editor'),
			_('Define temperature thresholds and corresponding fan speeds.'));
		s.anonymous = true;
		s.addremove = false;

		s.render = function() {
			var mode = uci.get('fan', 'settings', 'mode');
			var preset = uci.get('fan', 'settings', 'curve_preset');
			if (mode !== 'auto' || preset !== 'custom') {
				return E('div');
			}
			return form.NamedSection.prototype.render.apply(this, arguments);
		};

		s.tab('points', _('Curve Points'));
		for (var i = 1; i <= 5; i++) {
			o = s.taboption('points', form.Value, 'point' + i + '_temp', _('Point %d Temperature (\u00B0C)').format(i));
			o.datatype = 'range(0,100)';
			o.rmempty = false;
			o = s.taboption('points', form.Value, 'point' + i + '_pwm', _('Point %d PWM (0-255)').format(i));
			o.datatype = 'range(0,255)';
			o.rmempty = false;
		}

		m.render().then(function(node) {
			requestAnimationFrame(function() {
				var preset = uci.get('fan', 'settings', 'curve_preset') || 'balanced';
				drawCurveCanvas('curve-canvas', curves, preset);
				var presetSelect = node.querySelector('[data-name="curve_preset"] select');
				if (presetSelect) {
					presetSelect.addEventListener('change', function(ev) {
						drawCurveCanvas('curve-canvas', curves, ev.target.value);
					});
				}
			});
			return node;
		});

		return m.render();
	}
});
