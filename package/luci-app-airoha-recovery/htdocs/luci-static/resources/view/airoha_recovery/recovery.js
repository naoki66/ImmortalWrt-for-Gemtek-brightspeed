'use strict';
'require rpc';
'require ui';
'require view';

var callGetStatus = rpc.declare({
	object: 'luci.airoha_recovery',
	method: 'getStatus'
});

var callRebootToUboot = rpc.declare({
	object: 'luci.airoha_recovery',
	method: 'rebootToUboot'
});

return view.extend({
	load: function() {
		return callGetStatus().catch(function() {
			return { supported: false, reason: 'rpc-failed' };
		});
	},

	render: function(status) {
		var supported = !!(status && status.supported);
		var recoveryActive = !!(status && status.recovery_active);

		var body = E([ E('h2', _('U-Boot Recovery')) ]);

		if (recoveryActive) {
			body.appendChild(E('p', { 'class': 'alert-message warning' },
				_('The device is configured to boot into the U-Boot HTTP recovery environment. Re-flash the firmware from the U-Boot interface.')));
		}

		body.appendChild(E('style', { 'type': 'text/css' },
			'.rec-status{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:4px 0}\n' +
			'.rec-status-label{font-size:13px}\n' +
			'.rec-btn{margin-top:12px}\n'));

		body.appendChild(E('div', { 'class': 'cbi-section cbi-section-node' }, [
			E('div', { 'class': 'rec-status' }, [
				E('span', { 'class': 'rec-status-label' }, _('U-Boot environment')),
				E('span', { 'class': supported ? 'status-ok' : 'status-fail' },
					supported ? _('Available') : _('Unavailable'))
			]),
			E('div', { 'class': 'rec-btn' }, [
				E('button', {
					'class': 'cbi-button cbi-button-action important',
					'disabled': !(supported && !recoveryActive),
					'click': ui.createHandlerFn(this, 'handleRebootToUboot')
				}, _('Reboot to U-Boot'))
			])
		]));

		return body;
	},

	handleRebootToUboot: function(ev) {
		var self = this;

		return L.ui.showModal(_('Reboot to U-Boot'), [
			E('p', {}, _('The device will reboot into the U-Boot HTTP recovery environment now. Continue?')),
			E('div', { 'class': 'right' }, [
				E('button', {
					'class': 'cbi-button cbi-button-apply',
					'click': function() {
						L.ui.hideModal();
						self.rebootToUboot();
					}
				}, _('Reboot to U-Boot')),
				' ',
				E('button', {
					'class': 'cbi-button cbi-button-neutral',
					'click': function() { L.ui.hideModal(); }
				}, _('Cancel'))
			])
		]);
	},

	rebootToUboot: function() {
		return callRebootToUboot().then(function(res) {
			if (!res || !res.success) {
				L.ui.addNotification(null, E('p',
					(res && res.error) || _('The U-Boot recovery reboot failed')));
				return;
			}

			L.ui.showModal(_('Rebooting…'), [
				E('p', { 'class': 'spinning' }, _('Waiting for device...'))
			]);

			window.setTimeout(function() {
				L.ui.showModal(_('Rebooting…'), [
					E('p', { 'class': 'spinning alert-message warning' },
						_('Device unreachable! Still waiting for device...'))
				]);
			}, 150000);

			L.ui.awaitReconnect();
		})
		.catch(function(e) { L.ui.addNotification(null, E('p', e.message)) });
	}
});
