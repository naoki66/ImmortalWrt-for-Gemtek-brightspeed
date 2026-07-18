'use strict';
'require view';
'require poll';
'require rpc';
'require ui';

var callFanStatus = rpc.declare({
	object: 'luci.fan',
	method: 'getStatus'
});

function tempColor(temp) {
	if (temp <= 40) return '#28a745';      // Green - cool
	if (temp <= 55) return '#ffc107';      // Yellow - warm
	if (temp <= 70) return '#fd7e14';      // Orange - hot
	return '#dc3545';                       // Red - critical
}

function createTempGauge(label, temp, id) {
	var color = tempColor(temp);
	var percentage = Math.min(100, Math.max(3, (temp / 100) * 100));
	return E('div', { 'class': 'cbi-value', 'style': 'margin-bottom: 10px;' }, [
		E('label', { 'class': 'cbi-value-title', 'style': 'width: 150px;' }, label),
		E('div', { 'class': 'cbi-value-field' }, [
			E('div', { 'style': 'display: flex; align-items: center; gap: 10px;' }, [
				E('div', {
					'style': 'width: 200px; height: 20px; background: #e9ecef; border-radius: 4px; overflow: hidden;'
				}, [
					E('div', {
						'id': id + '-bar',
						'style': 'width: ' + percentage + '%; height: 100%; background: linear-gradient(90deg, ' + color + ' 0%, ' + color + 'dd 100%); transition: width 0.3s, background 0.3s;'
					})
				]),
				E('span', { 'id': id + '-value', 'style': 'font-weight: bold; min-width: 50px;' }, temp + '\u00B0C')
			])
		])
	]);
}

function createFanGauge(rpm, pwm, percentage) {
	return E('div', { 'class': 'cbi-value', 'style': 'margin-bottom: 10px;' }, [
		E('label', { 'class': 'cbi-value-title', 'style': 'width: 150px;' }, _('Fan Speed')),
		E('div', { 'class': 'cbi-value-field' }, [
			E('div', { 'style': 'display: flex; align-items: center; gap: 10px;' }, [
				E('div', {
					'style': 'width: 200px; height: 20px; background: #e9ecef; border-radius: 4px; overflow: hidden;'
				}, [
					E('div', {
						'id': 'fan-bar',
						'style': 'width: ' + percentage + '%; height: 100%; background: #17a2b8; transition: width 0.3s;'
					})
				]),
				E('span', { 'id': 'fan-value', 'style': 'font-weight: bold;' },
					rpm + ' RPM (' + percentage + '%)')
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

function updateFanGauge(rpm, percentage) {
	var bar = document.getElementById('fan-bar');
	var value = document.getElementById('fan-value');
	if (bar && value) {
		bar.style.width = percentage + '%';
		value.textContent = rpm + ' RPM (' + percentage + '%)';
	}
}

return view.extend({
	load: function() {
		return callFanStatus();
	},

	render: function(status) {
		status = status || {};
		var modeClass = status.fan_mode === 2 ? 'label-success' : 'label-warning';
		var modeText = this.getModeText(status.uci_mode);
		var presetText = this.getPresetText(status.uci_mode, status.uci_preset);

		var viewEl = E('div', { 'class': 'cbi-map' }, [
			E('div', { 'class': 'cbi-map-descr' }, _('View real-time fan speed and system temperatures.')),
			E('div', { 'class': 'cbi-section' }, [
				E('div', { 'class': 'cbi-section-node' }, [
					createFanGauge(status.fan_rpm || 0, status.fan_pwm || 0, status.fan_percentage || 0),
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

		poll.add(L.bind(function() {
			return callFanStatus().then(L.bind(function(status) {
				status = status || {};
				updateGauge('temp-cpu', status.temp_cpu || 0);
				updateGauge('temp-board', status.temp_board || 0);
				updateGauge('temp-phy1', status.temp_phy1 || 0);
				updateGauge('temp-phy2', status.temp_phy2 || 0);
				updateGauge('temp-wifi24g', status.wifi_24g || 0);
				updateGauge('temp-wifi5g', status.wifi_5g || 0);
				updateGauge('temp-wifi6g', status.wifi_6g || 0);
				updateFanGauge(status.fan_rpm || 0, status.fan_percentage || 0);
				var modeEl = document.getElementById('fan-mode');
				if (modeEl) {
					modeEl.textContent = this.getModeText(status.uci_mode);
					modeEl.className = status.fan_mode === 2 ? 'label-success' : 'label-warning';
				}
				var presetEl = document.getElementById('fan-preset');
				if (presetEl) {
					presetEl.textContent = this.getPresetText(status.uci_mode, status.uci_preset);
				}
			}, this));
		}, this), 3);

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
