'use strict';
'require rpc';
'require ui';
'require view';

var callGetStatus = rpc.declare({
	object: 'luci.netmode',
	method: 'getStatus'
});

var callApplyMode = rpc.declare({
	object: 'luci.netmode',
	method: 'applyMode',
	params: [ 'mode', 'username', 'password', 'lan_ip' ]
});

var css = [
	'.netmode-page{--nm-bg:#fff;--nm-border:#d8dee4;--nm-soft:#f6f8fa;--nm-text:#1f2328;--nm-muted:#5c6773;--nm-blue:#0969da;--nm-green:#1a7f37;--nm-orange:#bc4c00;--nm-red:#cf222e;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;font-size:13px;line-height:1.55;color:var(--nm-text);letter-spacing:0}',
	'.netmode-page h2{margin:0 0 4px;font-size:22px;line-height:1.3;font-weight:650;color:var(--nm-text)}',
	'.netmode-page .nm-lede{margin:0 0 16px;color:var(--nm-muted);font-size:12.5px}',
	'.nm-section{margin:0 0 18px;padding:18px 20px;border:1px solid var(--nm-border);border-radius:14px;background:var(--nm-bg);box-shadow:0 1px 2px rgba(16,24,40,.04)}',
	'.nm-title{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0;font-size:15px;font-weight:650}',
	'.nm-subtitle{margin:4px 0 16px;color:var(--nm-muted);font-size:12.5px}',
	'.nm-muted{color:var(--nm-muted)}',
	'.nm-hint{margin:10px 0 0;font-size:12px;line-height:1.7;color:var(--nm-muted)}',
	'.nm-alert{margin:10px 0 0;padding:9px 12px;border-radius:8px;border:1px solid rgba(188,76,0,.35);background:rgba(188,76,0,.07);color:var(--nm-orange);font-size:12px;line-height:1.6}',
	'.nm-alert.ok{border-color:rgba(26,127,55,.35);background:rgba(26,127,55,.08);color:var(--nm-green)}',
	'.nm-wait-bar{margin:12px 0 4px;height:6px;border-radius:999px;border:1px solid var(--nm-border);background:var(--nm-soft);overflow:hidden}',
	'.nm-wait-bar span{display:block;height:100%;width:0;border-radius:999px;background:var(--nm-blue);transition:width .9s linear}',
	'.nm-goto{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px}',
	'.nm-goto input{width:150px}',
	'.nm-status{display:flex;gap:8px;flex-wrap:wrap;align-items:center}',
	'.nm-pill{display:inline-flex;align-items:center;height:25px;padding:0 10px;border-radius:999px;border:1px solid var(--nm-border);background:var(--nm-soft);font-size:12px;font-weight:600;white-space:nowrap}',
	'.nm-pill.ok{color:var(--nm-green);border-color:rgba(26,127,55,.35);background:rgba(26,127,55,.08)}',
	'.nm-pill.warn{color:var(--nm-orange);border-color:rgba(188,76,0,.35);background:rgba(188,76,0,.08)}',
	'.nm-infogrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(148px,1fr));gap:8px;margin-top:12px}',
	'.nm-info{border:1px solid var(--nm-border);border-radius:10px;background:var(--nm-soft);padding:9px 11px;min-width:0}',
	'.nm-info-label{font-size:11px;font-weight:650;color:var(--nm-muted);margin-bottom:3px}',
	'.nm-info-value{font-size:14px;font-weight:650;word-break:break-all;line-height:1.35}',
	'.nm-info-sub{font-size:11px;color:var(--nm-muted);margin-top:2px;word-break:break-all}',
	'.nm-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}',
	'.nm-mode{position:relative;display:block;width:100%;min-height:108px;text-align:left;border:1.5px solid var(--nm-border);border-radius:14px;background:var(--nm-bg);padding:18px 52px 18px 18px;cursor:pointer;color:var(--nm-text);font-family:inherit;transition:border-color .2s ease,box-shadow .2s ease,transform .2s ease,background .2s ease}',
	'.nm-mode:hover{border-color:rgba(9,105,218,.55);box-shadow:0 6px 16px rgba(16,24,40,.10);transform:translateY(-2px)}',
	'.nm-mode:active{transform:translateY(0) scale(.99)}',
	'.nm-mode:focus-visible{outline:none;box-shadow:0 0 0 4px rgba(9,105,218,.22)}',
	'.nm-mode strong{display:block;font-size:16px;font-weight:650;margin-bottom:6px;line-height:1.35}',
	'.nm-mode>span{display:block;color:var(--nm-muted);font-size:12.5px;line-height:1.65}',
	'.nm-mode.active{border-color:var(--nm-blue);background:rgba(9,105,218,.06);box-shadow:0 0 0 1px var(--nm-blue),0 8px 20px rgba(9,105,218,.14)}',
	'.nm-check{position:absolute;top:16px;right:16px;width:22px;height:22px;border-radius:50%;border:1.5px solid var(--nm-border);background:var(--nm-bg);box-sizing:border-box}',
	'.nm-mode.active .nm-check{border-color:var(--nm-blue);background:var(--nm-blue)}',
	'.nm-mode.active .nm-check::after{content:"";position:absolute;left:6.5px;top:3px;width:5px;height:10px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg)}',
	'.nm-badge{display:inline-block;margin-left:8px;padding:1px 8px;border-radius:999px;background:var(--nm-blue);color:#fff;font-size:11px;font-weight:650;font-style:normal;vertical-align:2px}',
	'.nm-formbox{margin-top:18px;padding:14px 16px 16px;border:1px solid var(--nm-border);border-radius:12px;background:var(--nm-soft)}',
	'.nm-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px}',
	'.nm-field{display:flex;flex-direction:column;gap:6px;min-width:0}',
	'.nm-field>label{font-size:12px;font-weight:650;color:var(--nm-muted);letter-spacing:.02em}',
	'.nm-field input{min-height:42px;border:1.5px solid var(--nm-border);border-radius:10px;padding:10px 12px;background:var(--nm-bg);color:var(--nm-text);font-size:14px;box-sizing:border-box;width:100%;font-family:inherit;transition:border-color .2s ease,box-shadow .2s ease}',
	'.nm-field input:hover{border-color:#b6bfc9}',
	'.nm-field input:focus{outline:none;border-color:var(--nm-blue);box-shadow:0 0 0 4px rgba(9,105,218,.15)}',
	'.nm-field input::placeholder{color:#9ba5af}',
	'.nm-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;padding-top:14px;border-top:1px solid var(--nm-border)}',
	'.nm-actions .cbi-button{min-height:36px}',
	'@media(max-width:760px){.nm-grid,.nm-form{grid-template-columns:1fr}}'
].join('\n');

var darkVars = ':root{--nm-bg:#1e1f22;--nm-border:#3a3d42;--nm-soft:#26282d;--nm-text:#f0f3f6;--nm-muted:#a7adb5;--nm-blue:#4d9cf6;--nm-green:#4ac26b;--nm-orange:#e3934a;--nm-red:#f47067}';

function isDarkMode() {
	/* Probe order matters: the first element with an opaque background wins.
	 * - body carries the theme background in every LuCI theme.
	 * - .main-left is Argon's sidebar: var(--menu-bg-color) (#ffffff) when
	 *   light, #333333 when dark. It is the only other always-opaque surface
	 *   Argon has, and it matters because Argon inlines css/dark.css into a
	 *   <style> block (header.ut readfile()) instead of linking it, so the
	 *   stylesheet fallback below can never match Argon.
	 * - .main-content / #maincontent / .cbi-map are the bootstrap-era wrappers.
	 * header is deliberately NOT probed: Argon paints it with var(--primary)
	 * (#5e72e4, luminance ~121), which would read as dark in light mode. */
	var els = [document.body, document.querySelector('.main-left'), document.querySelector('.main-right'),
		document.querySelector('.main-content'), document.querySelector('#maincontent'), document.querySelector('.cbi-map')];
	for (var i = 0; i < els.length; i++) {
		if (!els[i]) continue;
		/* Parse rgb()/rgba() explicitly. Matching with /\d+/g splits the
		 * fractional alpha 0.6 into "0" and "6", so m[3] reads 0 and every
		 * semi-transparent background is mistaken for a fully transparent one
		 * and skipped - semi-transparent dark surfaces then fell through to the
		 * stylesheet fallback and were reported as light. */
		var bg = window.getComputedStyle(els[i]).backgroundColor;
		var m = bg.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?/i);
		if (m) {
			var a = m[4] === undefined ? 1 : parseFloat(m[4]);
			if (a < 0.1) continue;
			var lum = (parseFloat(m[1]) * 299 + parseFloat(m[2]) * 587 + parseFloat(m[3]) * 114) / 1000;
			return lum < 128;
		}
	}
	var sheets = document.querySelectorAll('link[href*="dark"], link[href*="glass"]');
	if (sheets.length > 0) return true;
	/* Last resort: follow the OS preference. This is exactly what Argon's
	 * default mode='normal' does - it wraps the inlined dark.css in
	 * @media (prefers-color-scheme: dark) - and it also covers any theme that
	 * leaves every probed surface transparent. */
	try {
		if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return true;
	} catch (e) {}
	return false;
}

function injectCSS() {
	var el = document.getElementById('netmode-css');
	if (!el) {
		el = document.createElement('style');
		el.id = 'netmode-css';
		document.head.appendChild(el);
	}
	el.textContent = css + (isDarkMode() ? darkVars : '');
}

var MODE_LABELS = {
	ap: _('AP mode'),
	dhcp: _('DHCP router'),
	pppoe: _('PPPoE dial-up')
};

function modeLabel(mode) {
	return MODE_LABELS[mode] || _('Unknown mode');
}

function infoCard(label, value, sub) {
	return E('div', { 'class': 'nm-info' }, [
		E('div', { 'class': 'nm-info-label' }, label),
		E('div', { 'class': 'nm-info-value' }, value || '—'),
		sub ? E('div', { 'class': 'nm-info-sub' }, sub) : ''
	]);
}

function statusPills(status) {
	var isAp = status.mode === 'ap';

	var wanPillClass, wanPillText;
	if (isAp) {
		wanPillClass = '';
		wanPillText = _('WAN bridged');
	} else if (status.wan_up) {
		wanPillClass = 'ok';
		wanPillText = _('WAN connected');
	} else if (status.wan_proto) {
		wanPillClass = 'warn';
		wanPillText = _('WAN disconnected');
	} else {
		wanPillClass = '';
		wanPillText = _('WAN not configured');
	}

	return E('div', {}, [
		E('div', { 'class': 'nm-status' }, [
			E('span', { 'class': 'nm-pill' }, modeLabel(status.mode)),
			E('span', { 'class': 'nm-pill ' + wanPillClass }, wanPillText)
		]),
		E('div', { 'class': 'nm-infogrid' }, [
			infoCard(_('Device model'), status.board),
			infoCard(_('Hostname'), status.hostname),
			infoCard(_('Management address (LAN)'), status.lan_ip || _('Loading…')),
			isAp
				? infoCard(_('WAN address'), _('Bridged to br-lan'))
				: infoCard(_('WAN address'), status.wan_ip || _('Not obtained'))
		])
	]);
}

return view.extend({
	load: function() {
		return callGetStatus().catch(function(e) { return { error: e.message || String(e) }; });
	},

	render: function(status) {
		injectCSS();
		this.status = status || {};

		var mode = this.status.mode || 'unknown';
		var root = E('div', { 'class': 'cbi-map netmode-page' }, [
			E('h2', {}, _('Internet mode')),
			E('p', { 'class': 'nm-lede' }, _('Choose how this device connects to the upstream network.'))
		]);

		if (this.status.error)
			root.appendChild(E('p', { 'class': 'alert-message error' },
				_('Failed to load data') + ': ' + this.status.error));

		this.statusBox = E('div', {}, statusPills(this.status));
		root.appendChild(E('div', { 'class': 'nm-section' }, [
			E('div', { 'class': 'nm-title' }, [
				E('span', {}, _('Current status')),
				E('button', {
					'class': 'cbi-button cbi-button-neutral',
					'click': ui.createHandlerFn(this, 'refresh')
				}, _('Refresh'))
			]),
			this.statusBox
		]));

		this.lanIpInput = E('input', {
			'type': 'text',
			// in AP mode status.lan_ip is the upstream DHCP lease and must
			// not be carried over as the router-mode static LAN address;
			// leave empty so the backend applies its 192.168.50.1 default
			'value': this.status.mode === 'ap' ? '' : (this.status.lan_ip || ''),
			'placeholder': '192.168.50.1'
		});
		this.pppoeUserInput = E('input', {
			'type': 'text', 'autocomplete': 'off', 'placeholder': _('Broadband account')
		});
		this.pppoePassInput = E('input', {
			'type': 'password', 'autocomplete': 'new-password', 'placeholder': _('Broadband password')
		});

		root.appendChild(E('div', { 'class': 'nm-section' }, [
			E('div', { 'class': 'nm-title' }, _('One-click switch')),
			E('p', { 'class': 'nm-subtitle' }, _('Click any mode card to switch; the change takes effect immediately.')),
			E('div', { 'class': 'nm-grid' }, [
				this.modeCard('ap', _('AP mode'), _('The WAN port joins br-lan; the upstream router assigns the address and this device only bridges.'), mode === 'ap'),
				this.modeCard('dhcp', _('DHCP router'), _('The WAN port obtains an upstream address automatically; this device provides NAT and DHCP.'), mode === 'dhcp'),
				this.modeCard('pppoe', _('PPPoE dial-up'), _('The WAN port dials with the broadband account and password; this device provides NAT and DHCP.'), mode === 'pppoe')
			]),
			E('div', { 'class': 'nm-formbox' }, [
				E('div', { 'class': 'nm-form' }, [
					E('div', { 'class': 'nm-field' }, [
						E('label', {}, _('LAN IP')), this.lanIpInput
					]),
					E('div', { 'class': 'nm-field' }, [
						E('label', {}, _('PPPoE account')), this.pppoeUserInput
					]),
					E('div', { 'class': 'nm-field' }, [
						E('label', {}, _('PPPoE password')), this.pppoePassInput
					])
				]),
				E('p', { 'class': 'nm-hint' }, _('In AP mode the LAN IP is the address used to reach this device; leave it blank to let the upstream router assign one.')),
				E('p', { 'class': 'nm-hint' }, _('In router mode the LAN IP is the gateway; leave it blank to use 192.168.50.1. The PPPoE account and password are only needed in PPPoE mode.'))
			])
		]));

		this.updatedEl = E('p', { 'class': 'nm-muted', 'style': 'margin:14px 0 0;text-align:right;font-size:12px' }, '');
		root.appendChild(this.updatedEl);
		this.markUpdated();

		return root;
	},

	markUpdated: function() {
		if (this.updatedEl)
			this.updatedEl.textContent = _('Updated %s').format(new Date().toLocaleTimeString());
	},

	modeCard: function(mode, title, desc, active) {
		return E('button', {
			'class': 'nm-mode' + (active ? ' active' : ''),
			'click': ui.createHandlerFn(this, 'confirmMode', mode, title)
		}, [
			E('strong', {}, [
				title,
				active ? E('em', { 'class': 'nm-badge' }, _('Current')) : ''
			]),
			E('span', {}, desc),
			E('span', { 'class': 'nm-check' })
		]);
	},

	confirmMode: function(mode, title) {
		var summary = ({
			ap: _('The WAN port joins br-lan; this device takes an address from the upstream router and disables DHCP.'),
			dhcp: _('The WAN port obtains an upstream address automatically; the LAN uses a static address with DHCP enabled.'),
			pppoe: _('The WAN port dials up; the LAN uses a static address with DHCP enabled.')
		})[mode];

		var addresses = this.status.addresses || [];
		var notice = mode === 'ap'
			? (addresses.length
				? _('The current management address %s will stop working; the upstream router will assign a new one.')
					.format(addresses.map(function(i) { return i.address; }).join(', '))
				: _('The management address will be assigned by the upstream router.'))
			: '';

		if (mode === 'pppoe' && !(this.pppoeUserInput.value || '').trim()) {
			ui.addNotification(null, E('p', _('Please enter the PPPoE account first.')));
			return;
		}

		return ui.showModal(_('Switch to %s').format(title), [
			E('p', {}, summary),
			notice ? E('div', { 'class': 'nm-alert' }, notice) : '',
			E('p', { 'class': 'nm-muted' }, _('The configuration takes effect immediately and the network will be reloaded.')),
			E('div', { 'class': 'right' }, [
				E('button', {
					'class': 'cbi-button cbi-button-apply',
					'click': ui.createHandlerFn(this, 'applyMode', mode)
				}, _('Confirm switch')),
				' ',
				E('button', { 'class': 'cbi-button cbi-button-neutral', 'click': ui.hideModal }, _('Cancel'))
			])
		]);
	},

	applyMode: function(mode) {
		ui.hideModal();
		return callApplyMode(
			mode,
			(this.pppoeUserInput.value || '').trim(),
			this.pppoePassInput.value || '',
			(this.lanIpInput.value || '').trim()
		).then(L.bind(function(res) {
			return this.afterModeApply(mode, res);
		}, this)).catch(L.bind(function(e) {
			// A dropped reply is expected here: uci commit happens before the
			// delayed network reload, and that reload tears down the very
			// connection carrying the response. Never report it as a failure -
			// go straight into the wait / probe cycle.
			return this.waitForSwitch(mode, { transport_error: e.message || String(e) });
		}, this));
	},

	afterModeApply: function(mode, res) {
		if (!res || !res.success) {
			ui.addNotification(null, E('p', (res && res.error) || _('Apply failed')));
			return;
		}
		return this.waitForSwitch(mode, res);
	},

	// ---------------------------------------------------------------------
	// Mode handover, in both directions: router -> AP and AP -> router.
	//
	// Either way the management address moves. Going to AP it becomes a lease
	// handed out by the upstream router; going back to router mode it becomes
	// the static LAN address again. The page we are currently on goes away in
	// both cases, so waiting is the only sane reaction: stay quiet while the
	// reload is in flight (probing during that window is what used to raise a
	// bogus "apply failed"), then poll for up to 90s and show a countdown the
	// whole time. Real validation errors still arrive as {"success":false}
	// and are reported immediately.
	// ---------------------------------------------------------------------
	waitForSwitch: function(mode, res) {
		if (res && res.success === false) {
			ui.addNotification(null, E('p', (res && res.error) || _('Apply failed')));
			return;
		}

		var isAp = (mode === 'ap');
		var lanIp = (this.lanIpInput && (this.lanIpInput.value || '').trim()) || '192.168.50.1';
		var copy = ({
			ap: {
				title: _('AP mode applied'),
				doing: _('Configuration submitted; the device is switching to AP mode.'),
				why: _('The switch changes the management address to an upstream DHCP lease; this page disconnecting is expected and does not mean failure.'),
				done: _('The device is now in AP mode.')
			},
			dhcp: {
				title: _('DHCP router mode applied'),
				doing: _('Configuration submitted; the device is switching to DHCP router mode.'),
				why: _('The switch changes the management address back to the static LAN address; this page disconnecting is expected and does not mean failure.'),
				done: _('The device is now in DHCP router mode.')
			},
			pppoe: {
				title: _('PPPoE router mode applied'),
				doing: _('Configuration submitted; the device is switching to PPPoE router mode.'),
				why: _('The switch changes the management address back to the static LAN address; this page disconnecting is expected and does not mean failure.'),
				done: _('The device is now in PPPoE router mode.')
			}
		})[mode] || {
			title: _('Configuration applied'),
			doing: _('Configuration submitted; the device is switching internet mode.'),
			why: _('The switch changes the management address; this page disconnecting is expected and does not mean failure.'),
			done: _('The device has finished switching.')
		};

		var TOTAL = 90, SILENT = 12, PROBE_EVERY = 3;
		var state = { cancelled: false, done: false };
		var started = Date.now();
		var lastProbe = 0;
		var self = this;

		var bar = E('span', {});
		var statusEl = E('p', { 'class': 'nm-muted' }, _('Configuration submitted; the network service is reloading…'));
		var resultBox = E('div', {}, '');

		var elapsed = function() { return Math.round((Date.now() - started) / 1000); };
		var remain = function() { return Math.max(0, TOTAL - elapsed()); };

		var showSuccess = function(st) {
			state.done = true;
			bar.style.width = '100%';
			statusEl.textContent = copy.done;
			resultBox.innerHTML = '';
			resultBox.appendChild(E('div', { 'class': 'nm-alert ok' },
				_('Device detected; current management address: %s').format(st.lan_ip || '-')));
			resultBox.appendChild(E('div', { 'class': 'nm-goto' }, [
				E('button', {
					'class': 'cbi-button cbi-button-apply',
					'click': function() {
						window.location.href = window.location.protocol + '//' +
							(st.lan_ip || window.location.hostname) + '/';
					}
				}, _('Open new address')),
				E('button', {
					'class': 'cbi-button cbi-button-neutral',
					'click': function() { window.location.reload(); }
				}, _('Reload page'))
			]));
		};

		var probe = function() {
			if (state.cancelled || state.done) return;
			callGetStatus().then(function(st) {
				if (state.cancelled || state.done) return;
				if (st && st.mode === mode) {
					showSuccess(st);
					return;
				}
				statusEl.textContent = _('The device is responding; waiting for the mode switch to finish… (%d s left)').format(remain());
			}).catch(function() {
				// address not answering yet, which is the normal case while
				// the interface is being reconfigured
			});
		};

		var showTimeout = function() {
			var host = (self.status && self.status.hostname) || '-';
			var wanIp = (self.status && self.status.wan_ip) || '';
			statusEl.textContent = _('Automatic detection timed out.');
			resultBox.innerHTML = '';
			resultBox.appendChild(E('p', {}, _('The configuration was applied, but the device could not be found at the current address.')));
			if (isAp) {
				resultBox.appendChild(E('p', {}, wanIp
					? _('The new address is assigned by the upstream router, usually on the same subnet as the previous WAN address %s; look it up by hostname "%s" or MAC in the DHCP leases of the upstream router.')
						.format(wanIp, host)
					: _('The new address is assigned by the upstream router; look it up by hostname "%s" or MAC in the DHCP leases of the upstream router.').format(host)));
			}
			else {
				resultBox.appendChild(E('p', {},
					_('The new address is the static LAN address %s; make sure the cable is in a LAN port and the computer is set to obtain an address automatically (DHCP).').format(lanIp)));
			}

			var input = E('input', { 'type': 'text', 'placeholder': isAp ? '192.168.1.x' : lanIp });
			resultBox.appendChild(E('div', { 'class': 'nm-goto' }, [
				input,
				E('button', {
					'class': 'cbi-button cbi-button-apply',
					'click': function() {
						var v = (input.value || '').trim();
						if (!v) return;
						window.location.href = window.location.protocol + '//' + v + '/';
					}
				}, _('Open with this address'))
			]));
		};

		var tick = function() {
			if (state.cancelled || state.done) return;
			var e = elapsed();
			bar.style.width = Math.min(100, (e / TOTAL) * 100) + '%';
			if (e >= TOTAL) {
				showTimeout();
				return;
			}
			if (e < SILENT) {
				statusEl.textContent = _('Still waiting for the device… (probing starts in %d s, %d s left)').format(SILENT - e, TOTAL - e);
			} else {
				if (e - lastProbe >= PROBE_EVERY) {
					lastProbe = e;
					probe();
				}
				if (!state.done)
					statusEl.textContent = _('Still waiting for the device… (%d s left)').format(TOTAL - e);
			}
			setTimeout(tick, 1000);
		};

		var modal = ui.showModal(copy.title, [
			E('p', {}, copy.doing),
			E('p', {}, copy.why),
			E('div', { 'class': 'nm-wait-bar' }, bar),
			statusEl,
			resultBox,
			E('div', { 'class': 'right' }, [
				E('button', {
					'class': 'cbi-button cbi-button-neutral',
					'click': function() { state.cancelled = true; ui.hideModal(); }
				}, _('Close'))
			])
		]);

		setTimeout(tick, 200);
		return modal;
	},

	refresh: function() {
		return callGetStatus().then(L.bind(function(res) {
			this.status = res || {};
			if (this.statusBox) {
				this.statusBox.innerHTML = '';
				this.statusBox.appendChild(statusPills(this.status));
			}
			this.markUpdated();
		}, this));
	}
});
