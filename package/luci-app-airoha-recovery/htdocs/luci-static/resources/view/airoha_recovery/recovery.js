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

var themeCSS = '\
.rec-card{background:var(--soc-card-bg);border:1px solid var(--soc-border);border-left:3px solid #00cc44;border-radius:8px;padding:14px 16px;transition:border-color .3s}\
.rec-desc{font-size:13px;color:var(--soc-muted);margin:0 0 12px;line-height:1.6}\
.rec-status{display:flex;align-items:center;gap:8px;padding:2px 0}\
.rec-status-label{font-size:13px;color:var(--soc-text)}\
.rec-status-value{font-size:14px;font-weight:700;color:#00cc44}\
.rec-status-value.fail{color:#d0021b}\
.rec-btn{display:flex;margin-top:14px}\
.rec-btn .cbi-button{flex:1;box-sizing:border-box;min-height:36px;text-align:center}\
@media(max-width:640px){.rec-card{padding:12px}}\
';

function isDarkMode() {
	var els = [document.body, document.querySelector('.main-content'), document.querySelector('#maincontent'), document.querySelector('.cbi-map')];
	for (var i = 0; i < els.length; i++) {
		if (!els[i]) continue;
		var bg = window.getComputedStyle(els[i]).backgroundColor;
		var m = bg.match(/\d+/g);
		if (m && m.length >= 3) {
			var a = m.length >= 4 ? parseFloat(m[3]) : 1;
			if (a < 0.1) continue;
			var lum = (parseInt(m[0]) * 299 + parseInt(m[1]) * 587 + parseInt(m[2]) * 114) / 1000;
			return lum < 128;
		}
	}
	var sheets = document.querySelectorAll('link[href*="dark"], link[href*="glass"]');
	return sheets.length > 0;
}

var _lastDarkMode = null;

function injectCSS() {
	var el = document.getElementById('soc-theme-css');
	if (!el) {
		el = document.createElement('style');
		el.id = 'soc-theme-css';
		document.head.appendChild(el);
	}
	var dark = isDarkMode();
	if (dark === _lastDarkMode)
		return;
	_lastDarkMode = dark;
	var vars = dark
		? ':root{--soc-card-bg:#1e1e1e;--soc-border:#333;--soc-muted:#999;--soc-text:#e0e0e0}'
		: ':root{--soc-card-bg:#fff;--soc-border:#d0d0d0;--soc-muted:#666;--soc-text:#222}';
	el.textContent = themeCSS + vars;
}

return view.extend({
	load: function() {
		return callGetStatus().catch(function() {
			return { supported: false, reason: 'rpc-failed' };
		});
	},

	render: function(status) {
		var supported = !!(status && status.supported);
		var recoveryActive = !!(status && status.recovery_active);

		injectCSS();

		var body = E([ E('h2', _('U-Boot Recovery')) ]);

		if (recoveryActive) {
			body.appendChild(E('p', { 'class': 'alert-message warning' },
				_('The device is configured to boot into the U-Boot HTTP recovery environment. Re-flash the firmware from the U-Boot interface.')));
		}

		body.appendChild(E('div', { 'class': 'rec-card' }, [
			E('p', { 'class': 'rec-desc' },
				_('Reboots the device into the U-Boot HTTP recovery environment using a one-shot trigger. The normal boot command is left unchanged.')),
			E('div', { 'class': 'rec-status' }, [
				E('span', { 'class': 'rec-status-label' }, _('U-Boot environment')),
				E('span', { 'class': 'rec-status-value' + (supported ? '' : ' fail') },
					supported ? _('Available') : _('Unavailable'))
			]),
			E('div', { 'class': 'rec-btn' }, [
				E('button', {
					'class': 'cbi-button cbi-button-action important',
					'disabled': (supported && !recoveryActive) ? null : 'disabled',
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
