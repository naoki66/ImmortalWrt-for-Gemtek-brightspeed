'use strict';
'require rpc';
'require ui';
'require view';

var callGetStatus = rpc.declare({
	object: 'luci.airoha_factory',
	method: 'getStatus'
});

var callSetFactory = rpc.declare({
	object: 'luci.airoha_factory',
	method: 'setFactory'
});

var themeCSS = '\
.fac-dashboard{--fac-blue:#00c8ff;--fac-green:#00cc44;--fac-amber:#f5a623;--fac-red:#d0021b;--airoha-font-ui:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif;--airoha-font-mono:ui-monospace,SFMono-Regular,Consolas,"Liberation Mono",Menlo,monospace;font-family:var(--airoha-font-ui);font-size:13px;line-height:1.5;letter-spacing:0;color:var(--fac-text);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}\
.fac-dashboard h2{margin:0 0 14px;font-family:var(--airoha-font-ui);font-size:22px;line-height:1.3;font-weight:600;letter-spacing:0;color:var(--fac-text)}\
.fac-dashboard .cbi-button,.fac-dashboard input{font-family:var(--airoha-font-ui);font-size:13px!important;line-height:1.4;letter-spacing:0}\
.fac-card{background:var(--fac-card-bg);border:1px solid var(--fac-border);border-radius:8px;padding:14px 16px;margin:12px 0;box-sizing:border-box}\
.fac-card-title{font-size:16px;line-height:1.4;font-weight:600;letter-spacing:0;color:var(--fac-text);padding:0 0 8px;margin:0 0 12px;border-bottom:1px solid var(--fac-border)}\
.fac-desc{font-size:13px;color:var(--fac-muted);margin:0 0 12px;line-height:1.55}\
.fac-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 16px}\
@media(max-width:640px){.fac-grid{grid-template-columns:1fr}}\
.fac-field{display:flex;flex-direction:column;gap:4px;min-width:0}\
.fac-field.wide{grid-column:1 / -1}\
.fac-field label{font-size:12px;line-height:1.4;font-weight:600;color:var(--fac-muted);text-transform:uppercase;letter-spacing:0}\
.fac-field input{background:var(--fac-input-bg);border:1px solid var(--fac-border);border-radius:6px;color:var(--fac-text);padding:8px 10px;font-family:var(--airoha-font-mono);font-size:13px}\
.fac-field input:focus{outline:none;border-color:var(--fac-accent,var(--fac-blue))}\
.fac-field input.invalid{border-color:var(--fac-red)}\
.fac-field input[readonly]{background:var(--fac-muted);opacity:.55}\
.fac-row{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}\
.fac-row .cbi-button{flex:1;min-width:140px;min-height:38px}\
.fac-kv{display:grid;grid-template-columns:160px 1fr;gap:6px 12px;font-size:13px}\
.fac-kv dt{color:var(--fac-muted);font-weight:600}\
.fac-kv dd{margin:0;font-family:var(--airoha-font-mono);color:var(--fac-text);word-break:break-all}\
.fac-badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:12px;font-weight:700}\
.fac-badge.ok{background:rgba(0,204,68,.15);color:var(--fac-green)}\
.fac-badge.ro{background:rgba(208,2,27,.15);color:var(--fac-red)}\
.fac-badge.warn{background:rgba(245,166,35,.15);color:var(--fac-amber)}\
.fac-callout{display:flex;gap:12px;align-items:flex-start;border-radius:6px;padding:12px 14px;margin:10px 0 0;border-left:4px solid var(--fac-amber);background:rgba(245,166,35,.08)}\
.fac-callout.ok{border-left-color:var(--fac-green);background:rgba(0,204,68,.08)}\
.fac-callout-icon{font-size:20px;line-height:1.2;font-weight:700;color:var(--fac-amber);flex:0 0 auto}\
.fac-callout.ok .fac-callout-icon{color:var(--fac-green)}\
.fac-callout-body{flex:1;min-width:0}\
.fac-callout-title{font-size:13px;font-weight:700;color:var(--fac-text);margin:0 0 4px;line-height:1.4}\
.fac-callout-text{font-size:12px;line-height:1.55;color:var(--fac-muted);margin:0}\
.fac-callout-text code{font-family:var(--airoha-font-mono);background:var(--fac-input-bg);padding:1px 6px;border-radius:4px;border:1px solid var(--fac-border);font-size:12px}\
.fac-step{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:var(--fac-amber);color:#fff;font-weight:700;font-size:11px;line-height:1;margin:0 4px 0 0;vertical-align:middle}\
.fac-hint-label{color:var(--fac-muted);font-weight:600;margin-right:4px}\
.fac-link{color:var(--fac-accent,var(--fac-blue));text-decoration:none;border-bottom:1px dashed currentColor;word-break:break-all;font-family:var(--airoha-font-mono);font-size:12px}\
.fac-link:hover{border-bottom-style:solid;text-decoration:none}\
.fac-stack{display:flex;flex-direction:column;gap:14px}\
.fac-warn-line{display:flex;align-items:flex-start;gap:8px;padding:8px 10px;margin:6px 0 0;border-radius:5px;background:rgba(245,166,35,.06);border:1px dashed rgba(245,166,35,.35);color:var(--fac-muted);font-size:12px;line-height:1.45}\
.fac-warn-line::before{content:"⚠";color:var(--fac-amber);font-weight:700;flex:0 0 auto;font-size:14px;line-height:1.2}\
.fac-status-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap;font-size:13px}\
.fac-status-row .fac-status-label{color:var(--fac-muted);font-weight:600}\
.fac-status-row .fac-status-value{font-family:var(--airoha-font-mono);color:var(--fac-text)}\
.fac-status-divider{width:1px;height:14px;background:var(--fac-border)}\
.fac-subsection{margin-top:18px;padding:14px;border:1px dashed var(--fac-border);border-radius:6px;background:var(--fac-input-bg)}\
.fac-subsection-title{font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--fac-muted);margin:0 0 10px;display:flex;align-items:center;gap:8px}\
.fac-subsection-title::before{content:"";width:18px;height:1px;background:var(--fac-border)}\
.fac-subsection-title::after{content:"";flex:1;height:1px;background:var(--fac-border)}\
.fac-kv.compact{grid-template-columns:140px 1fr auto;gap:6px 12px}\
.fac-kv.compact dd{font-size:13px;display:flex;align-items:center;gap:8px}\
.fac-tag{display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:600;line-height:1;padding:3px 7px;border-radius:10px;background:var(--fac-input-bg);color:var(--fac-muted);border:1px solid var(--fac-border);letter-spacing:.2px}\
.fac-tag.ok{color:var(--fac-green);border-color:rgba(0,204,68,.4);background:rgba(0,204,68,.08)}\
.fac-tag.derived{color:var(--fac-amber);border-color:rgba(245,166,35,.4);background:rgba(245,166,35,.08)}\
.fac-note{font-size:12px;color:var(--fac-muted);line-height:1.5;margin:8px 0 0}\
.fac-derive{font-size:12px;line-height:1.6;color:var(--fac-muted);background:var(--fac-input-bg);border:1px dashed var(--fac-border);border-radius:6px;padding:8px 10px;margin-top:12px;font-family:var(--airoha-font-mono)}\
.fac-derive b{color:var(--fac-text)}\
';

// only these three keys are edited in the factory text block
var EDIT_KEYS = ['wan_mac', 'lan_mac', 'serial_number'];

var LABELS = {
	wan_mac:        'WAN MAC',
	lan_mac:        'LAN MAC',
	serial_number:  'Serial Number'
};

function isDarkMode() {
	var els = [document.body, document.querySelector('.main-content'), document.querySelector('#maincontent')];
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
	return false;
}

var _lastDark = null;

function injectCSS() {
	var el = document.getElementById('fac-theme-css');
	if (!el) {
		el = document.createElement('style');
		el.id = 'fac-theme-css';
		document.head.appendChild(el);
	}
	var dark = isDarkMode();
	if (dark === _lastDark) return;
	_lastDark = dark;
	var vars = dark
		? ':root{--fac-card-bg:#1e1e1e;--fac-border:#333;--fac-muted:#999;--fac-text:#e0e0e0;--fac-input-bg:#2a2a2a}'
		: ':root{--fac-card-bg:#fff;--fac-border:#d0d0d0;--fac-muted:#666;--fac-text:#222;--fac-input-bg:#fafafa}';
	el.textContent = themeCSS + vars;
}

function macValid(v) {
	return /^([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$/.test(v);
}

// strict MAC validation: unicast, non-zero, non-broadcast
function macValidStrict(v) {
	if (!macValid(v)) return false;
	if (/^00:00:00:/i.test(v) || /^FF:FF:FF:/i.test(v)) return false;
	var first = parseInt(v.substr(0, 2), 16);
	if (first & 1) return false;
	return true;
}

// OUI validation: exactly three hex octets formatted 00:AA:BB
function ouiValid(v) {
	return /^([0-9a-fA-F]{2}:){2}[0-9a-fA-F]{2}$/i.test(v);
}

// MAC + 1 with carry
function macPlus1(v) {
	var hex = v.replace(/:/g, '').toUpperCase();
	if (hex.length !== 12) return '';
	var b = [];
	for (var i = 0; i < 6; i++) b.push(parseInt(hex.substr(i * 2, 2), 16));
	b[5]++;
	for (var j = 5; j > 0; j--) {
		if (b[j] > 255) { b[j] = 0; b[j - 1]++; }
	}
	return b.map(function(x) { return ('0' + x.toString(16).toUpperCase()).slice(-2); }).join(':');
}

// first three octets, formatted 00:AA:BB
function deriveOui(v) {
	var hex = v.replace(/:/g, '').toUpperCase();
	if (hex.length < 6) return '';
	return hex.substr(0, 6).match(/.{1,2}/g).join(':');
}

// factory.js — build @ 2026-09-06 20:14 GMT+8 (cache buster)
return view.extend({
	load: function() {
		return callGetStatus().catch(function() {
			return { error: 'rpc-failed' };
		});
	},

	render: function(status) {
		var self = this;
		injectCSS();

		this._fields = (status && status.fields) || {};
		this._status = status || {};
		this._lanTouched = false;

		var body = E('div', { 'class': 'cbi-map fac-dashboard' }, [
			E('h2', '设备序列号')
		]);

		if (status.error) {
			body.appendChild(E('p', { 'class': 'alert-message error' },
				_('Could not read the factory partition: %s').format(status.error)));
			return body;
		}

		var writable = !!(status.writable);

		// ---- status card (compact info + prominent hint) ----
		var statusCard = E('div', { 'class': 'fac-card' }, [
			E('div', { 'class': 'fac-status-row' }, [
				E('span', { 'class': 'fac-status-label' }, _('MTD device')),
				E('span', { 'class': 'fac-status-value' }, status.mtd || '-'),
				E('span', { 'class': 'fac-status-divider' }),
				E('span', { 'class': 'fac-status-label' }, _('Writable')),
				E('span', { 'class': 'fac-badge ' + (writable ? 'ok' : 'ro') },
					writable ? _('Yes') : _('No (read-only)'))
			])
		]);

		// key hint callout — the most important message
		var hintTitle = writable
			? _('✓ Write ready')
			: _('⚠ Requires latest U-Boot and Firmware');
		var hintBody = E('div', { 'class': 'fac-callout-text' });
		if (writable) {
			hintBody.appendChild(document.createTextNode(
				_('All write targets are accessible: mtd0 factory text, UBI factory volume, and U-Boot env.')));
		} else {
			hintBody.innerHTML =
				'<strong>适配提示：</strong>写入功能需要刷入新版 ' +
				'<code>U-Boot</code> 与新版的固件。<br>' +
				'<span class="fac-step">①</span> ' +
				'<span class="fac-hint-label">U-Boot 下载地址：</span>' +
				'<a class="fac-link" target="_blank" rel="noopener external" ' +
				'href="https://github.com/naoki66/XR1710G-http-uboot/releases">' +
				'https://github.com/naoki66/XR1710G-http-uboot/releases' +
				'</a><br>' +
				'<span class="fac-step">②</span> ' +
				'<span class="fac-hint-label">新版固件下载地址：</span>' +
				'<a class="fac-link" target="_blank" rel="noopener external" ' +
				'href="https://github.com/naoki66/ImmortalWrt-for-Gemtek-XR1710G/releases">' +
				'https://github.com/naoki66/ImmortalWrt-for-Gemtek-XR1710G/releases' +
				'</a><br>' +
				'<em>刷入新版 U-Boot 后，本页面才能修改原厂数据。读取功能不受限制。</em>';
		}
		statusCard.appendChild(E('div', { 'class': 'fac-callout' + (writable ? ' ok' : '') }, [
			E('div', { 'class': 'fac-callout-icon' }, writable ? '✓' : '⚠'),
			E('div', { 'class': 'fac-callout-body' }, [
				E('div', { 'class': 'fac-callout-title' }, hintTitle),
				hintBody
			])
		]));

		body.appendChild(statusCard);

		// ---- Factory Data (editable: wan_mac / lan_mac / serial_number) ----
		var stack = E('div', { 'class': 'fac-stack' });
		this._inputs = {};
		var prevKey = null;
		EDIT_KEYS.forEach(function(k) {
			// insert MAC-uniqueness hint between WAN and LAN fields
			if (prevKey === 'wan_mac' && k === 'lan_mac') {
				stack.appendChild(E('div', { 'class': 'fac-warn-line' },
					_('Same LAN should not have multiple devices with the same MAC.')));
			}
			var val = self._fields[k] || '';
			var inp = E('input', {
				'class': (k === 'wan_mac' || k === 'lan_mac') ? 'mac' : '',
				'type': 'text',
				'value': val,
				'data-key': k,
				'autocomplete': 'off',
				'spellcheck': 'false'
			});
			if (k === 'wan_mac') {
				inp.addEventListener('input', function() { self.onWanInput(); });
				self._wanInput = inp;
			} else if (k === 'lan_mac') {
				inp.addEventListener('input', function() { self._lanTouched = true; self.validate(); });
				self._lanInput = inp;
			} else {
				self._serialInput = inp;
			}
			self._inputs[k] = inp;
			stack.appendChild(E('div', { 'class': 'fac-field' }, [
				E('label', { 'for': 'fac-' + k }, LABELS[k] || k),
				inp
			]));
			prevKey = k;
		});

		this._deriveNote = E('div', { 'class': 'fac-derive' },
			_('Editing WAN MAC auto-links: LAN = WAN+1, U-Boot ethaddr = WAN, OUI = first 3 octets.'));

		var saveBtn = E('button', {
			'class': 'cbi-button cbi-button-apply',
			'click': ui.createHandlerFn(self, 'handleSave')
		}, _('Save Factory Block'));

		var reloadBtn = E('button', {
			'class': 'cbi-button cbi-button-neutral',
			'click': ui.createHandlerFn(self, 'handleReload')
		}, _('Reload'));

		// ---- merged card: factory data + U-Boot env (stored values) ----
		var env = status.env || {};
		var ouiStored = !!env.oui_stored;
		var envRow = E('div', { 'class': 'fac-kv compact' }, [
			E('dt', _('ethaddr')),
			E('dd', {}, [
				E('span', null, env.ethaddr || '-'),
				E('span', { 'class': 'fac-tag ' + (env.ethaddr ? 'ok' : '') }, _('stored'))
			]),
			E('dt', _('oui')),
			E('dd', {}, [
				E('span', null, env.oui || '-'),
				E('span', { 'class': 'fac-tag ' + (ouiStored ? 'ok' : 'derived') },
					ouiStored ? _('stored') : _('derived from ethaddr'))
			])
		]);
		var envNote = E('p', { 'class': 'fac-note' },
			_('On save, ethaddr is written as the WAN MAC and oui as its first three octets (00:AA:BB). On a stock device the `oui` variable does not exist yet — Save will create it.'));

		body.appendChild(E('div', { 'class': 'fac-card' }, [
			E('div', { 'class': 'fac-card-title' }, _('Factory Data')),
			E('p', { 'class': 'fac-desc' },
				_('Only WAN MAC, LAN MAC and Serial Number are edited here. LAN defaults to WAN+1 (editable). The other factory fields are preserved untouched.')),
			stack,
			this._deriveNote,
			E('div', { 'class': 'fac-subsection' }, [
				E('div', { 'class': 'fac-subsection-title' }, _('U-Boot Environment')),
				envRow,
				envNote
			]),
			E('div', { 'class': 'fac-row' }, [ saveBtn, reloadBtn ])
		]));

		// initialise the derived note from loaded values
		this.onWanInput();

		this._body = body;
		return body;
	},

	onWanInput: function() {
		var wan = this._wanInput.value.trim();
		if (macValid(wan)) {
			var p1 = macPlus1(wan);
			var oui = deriveOui(wan);
			this._deriveNote.innerHTML = _('Auto-linked → LAN = <b>%s</b> · U-Boot ethaddr = <b>%s</b> · OUI = <b>%s</b>')
				.format(p1, wan.toUpperCase(), oui);
			if (!this._lanTouched) {
				this._lanInput.value = p1;
			}
		} else {
			this._deriveNote.innerHTML = _('Editing WAN MAC auto-links: LAN = WAN+1, U-Boot ethaddr = WAN, OUI = first 3 octets.');
		}
		this.validate();
	},

	validate: function() {
		var ok = true;
		['wan_mac', 'lan_mac'].forEach(function(k) {
			var inp = this._inputs[k];
			if (!macValidStrict(inp.value.trim())) {
				inp.classList.add('invalid');
				ok = false;
			} else {
				inp.classList.remove('invalid');
			}
		}, this);
		return ok;
	},

	collect: function() {
		var fields = {};
		var self = this;
		EDIT_KEYS.forEach(function(k) {
			fields[k] = (self._inputs[k].value || '').trim();
		});
		return fields;
	},

	handleReload: function() {
		var self = this;
		return callGetStatus().then(function(newStatus) {
			if (newStatus && newStatus.error) {
				L.ui.addNotification(null, E('p', _('Reload failed: %s').format(newStatus.error)));
				return;
			}
			var oldBody = self._body;
			var newBody;
			try {
				newBody = self.render(newStatus);
			} catch (e) {
				L.ui.addNotification(null, E('p', e.message || _('Reload render failed')));
				return;
			}
			if (oldBody && oldBody.parentNode) {
				oldBody.parentNode.replaceChild(newBody, oldBody);
			}
			self._body = newBody;
		}).catch(function(e) {
			L.ui.addNotification(null, E('p', e.message || _('Reload failed')));
		});
	},

	handleSave: function() {
		var self = this;
		if (!this.validate()) {
			L.ui.addNotification(null, E('p', _('One or more MAC fields are invalid (expected AA:BB:CC:DD:EE:FF).')));
			return;
		}
		var fields = this.collect();
		var wan = fields.wan_mac, lan = fields.lan_mac;
		return L.ui.showModal(_('Write factory data + reboot'), [
			E('p', {}, _('This writes:\n• mtd0 factory text @ 0x400000: WAN %s, LAN %s, Serial %s\n• UBI factory volume (running MAC): WAN %s, LAN %s\n• U-Boot env @ 0x200000: ethaddr = %s, oui = %s\n\nThe device will reboot automatically after writing to apply the new addresses.')
				.format(wan, lan, fields.serial_number || '(unchanged)', wan.toUpperCase(), lan.toUpperCase(), wan.toUpperCase(), deriveOui(wan) || '-')),
			E('div', { 'class': 'right' }, [
				E('button', {
					'class': 'cbi-button cbi-button-apply',
					'click': function() {
						L.ui.hideModal();
						callSetFactory({ fields: fields }).then(function(res) {
							if (!res || !res.success) {
								L.ui.addNotification(null, E('p',
									(res && res.error) || _('Failed to write factory block')));
								return;
							}
							L.ui.showModal(_('Write successful'), [
								E('p', {}, _('Factory data written successfully. The device will reboot automatically in a few seconds to apply the new configuration.')),
								E('div', { 'class': 'right' }, [
									E('button', {
										'class': 'cbi-button cbi-button-apply',
										'click': function() { L.ui.hideModal(); }
									}, _('OK'))
								])
							]);
						}).catch(function(e) {
							L.ui.addNotification(null, E('p', e.message || _('Write failed')));
						});
					}
				}, _('Write & Reboot')),
				' ',
				E('button', {
					'class': 'cbi-button cbi-button-neutral',
					'click': function() { L.ui.hideModal(); }
				}, _('Cancel'))
			])
		]);
	}
});
