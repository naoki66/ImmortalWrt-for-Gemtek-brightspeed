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
	method: 'setFactory',
	params: [ 'fields', 'ethaddr' ]
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
.fac-current{width:100%;border-collapse:collapse;font-size:12px;margin:2px 0 4px}\
.fac-current th,.fac-current td{padding:5px 8px;text-align:left;vertical-align:middle;border-bottom:1px dotted var(--fac-border)}\
.fac-current tr:last-child th,.fac-current tr:last-child td{border-bottom:none}\
.fac-current th{color:var(--fac-muted);font-weight:600;width:170px;white-space:nowrap}\
.fac-current .fac-current-value{font-family:var(--airoha-font-mono);color:var(--fac-text);word-break:break-all}\
.fac-current .fac-current-tag{text-align:right;white-space:nowrap}\
.fac-modal-list{margin:0 0 10px;padding-left:20px}\
.fac-modal-list li{margin:4px 0;font-family:var(--airoha-font-mono)}\
.fac-modal-list b{font-family:var(--airoha-font-ui)}\
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

// first three octets, formatted 00:AA:BB
function deriveOui(v) {
	var hex = v.replace(/:/g, '').toUpperCase();
	if (hex.length < 6) return '';
	return hex.substr(0, 6).match(/.{1,2}/g).join(':');
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

// Build the "Current device values" table. All rows are live-updated by
// renderCurrentValues() whenever the user edits WAN/LAN, so the table always
// mirrors what is currently typed in the form.
function buildCurrentTable(self) {
	var status = self._status || {};
	var wrap = E('table', { 'class': 'fac-current' });
	var tbody = E('tbody');
	wrap.appendChild(tbody);

	function row(scope, label, value, tagText, tagCls) {
		var tagSpan = tagText
			? E('span', { 'class': 'fac-tag ' + (tagCls || '') }, tagText)
			: null;
		tbody.appendChild(E('tr', { 'data-scope': scope }, [
			E('th', {}, label),
			E('td', { 'class': 'fac-current-value' }, value || '-'),
			E('td', { 'class': 'fac-current-tag' }, tagSpan || '')
		]));
	}

	row('wan',     _('WAN MAC'), status.wan, '', '');
	row('lan',     _('LAN MAC'), status.lan, '', '');
	row('eth',     _('U-Boot ethaddr'), '', '', '');
	row('oui',     _('OUI'),     '', _('derived from ethaddr'), 'derived');
	row('wifi-24g', _('Wi-Fi 2.4G BSSID'), '', _('derived from WAN'), 'derived');
	row('wifi-5g',  _('Wi-Fi 5G BSSID'),  '', _('derived from WAN'), 'derived');
	row('wifi-6g',  _('Wi-Fi 6G BSSID'),  '', _('derived from WAN'), 'derived');

	return wrap;
}

// Refresh every value cell in the "Current device values" table from the
// user's current input. OUI always derives from the U-Boot ethaddr field.
// Wi-Fi BSSID convention observed on the stock firmware (10.10.20.250):
// 2.4G primary = WAN+0x02, 5G = WAN+0x12, 6G = WAN+0x22.
function renderCurrentValues(table, wanMac, lanMac, ethMac) {
	if (!table) return;

	function setVal(scope, val) {
		var tr = table.querySelector('tr[data-scope="' + scope + '"]');
		if (!tr) return;
		var td = tr.querySelector('.fac-current-value');
		if (td) td.textContent = val || '-';
	}

	setVal('wan', macValid(wanMac) ? wanMac.toUpperCase() : wanMac);
	setVal('lan', macValid(lanMac) ? lanMac.toUpperCase() : lanMac);
	setVal('eth', macValid(ethMac) ? ethMac.toUpperCase() : ethMac);
	setVal('oui', macValid(ethMac) ? deriveOui(ethMac) : '');

	var bands = [ { key: 'wifi-24g', off: 0x02 }, { key: 'wifi-5g', off: 0x12 }, { key: 'wifi-6g', off: 0x22 } ];
	bands.forEach(function(b) {
		setVal(b.key, macValid(wanMac) ? macPlusOffset(wanMac, b.off) : '');
	});
}

// MAC + offset added to the last octet with carry.
function macPlusOffset(v, off) {
	var hex = v.replace(/:/g, '').toUpperCase();
	if (hex.length !== 12) return v;
	var b = [];
	for (var i = 0; i < 6; i++) b.push(parseInt(hex.substr(i * 2, 2), 16));
	var carry = off;
	for (var j = 5; j >= 0 && carry > 0; j--) {
		var s = b[j] + carry;
		b[j] = s & 0xff;
		carry = s >>> 8;
	}
	return b.map(function(x) { return ('0' + x.toString(16).toUpperCase()).slice(-2); }).join(':');
}

// factory.js — build @ 2026-09-07 08:10 GMT+8 (cache buster: move MAC warn under desc)
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
				_('All write targets are ready. You can save changes directly.')));
		} else {
			hintBody.innerHTML =
				'<strong>适配提示：</strong>写入功能需要刷入新版 ' +
				'<code>U-Boot</code> 与新版的固件<code>Firmware</code> 。<br>' +
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
				'<em>刷入新版 U-Boot 和新版固件 Firmware 后，本页面才能正确修改设备序列号等数据。</em>';
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
		EDIT_KEYS.forEach(function(k) {
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
		});

	// ---- U-Boot ethaddr: linked to WAN by default, manually overridable ----
	var envEth = (this._status.env && this._status.env.ethaddr) || '';
	var wanInitial = this._fields.wan_mac || '';
	var ethInitial = macValid(envEth) ? envEth : wanInitial;
	// if the stored ethaddr already differs from WAN it was set manually:
	// pin it so typing a new WAN does not clobber it
	this._ethTouched = !!(macValid(ethInitial) && macValid(wanInitial) &&
		ethInitial.replace(/:/g, '').toUpperCase() !== wanInitial.replace(/:/g, '').toUpperCase());
	var ethInp = E('input', {
		'class': 'mac',
		'type': 'text',
		'value': ethInitial,
		'data-key': 'ethaddr',
		'autocomplete': 'off',
		'spellcheck': 'false'
	});
	ethInp.addEventListener('input', function() {
		self._ethTouched = true;
		self.refreshDerived();
		self.validate();
	});
	this._ethaddrInput = ethInp;
	this._inputs.ethaddr = ethInp;
	stack.appendChild(E('div', { 'class': 'fac-field' }, [
		E('label', { 'for': 'fac-ethaddr' }, _('U-Boot ethaddr')),
		ethInp
	]));

	var wifiBox = E('div', { 'class': 'fac-subsection' }, [
			E('div', { 'class': 'fac-subsection-title' }, _('Current device values')),
			buildCurrentTable(this)
		]);
		this._wifiBox = wifiBox;
		this._currentTable = wifiBox.querySelector('.fac-current');

		var saveBtn = E('button', {
			'class': 'cbi-button cbi-button-apply',
			'click': ui.createHandlerFn(self, 'handleSave')
		}, _('Save Factory Block'));

		var reloadBtn = E('button', {
			'class': 'cbi-button cbi-button-neutral',
			'click': ui.createHandlerFn(self, 'handleReload')
		}, _('Reload'));

		body.appendChild(E('div', { 'class': 'fac-card' }, [
			E('div', { 'class': 'fac-card-title' }, _('Factory Data')),
			E('p', { 'class': 'fac-desc' },
				_('Only WAN MAC, LAN MAC, U-Boot ethaddr and Serial Number are edited here. LAN defaults to WAN+1 and U-Boot ethaddr defaults to WAN (both editable). OUI derives from the U-Boot ethaddr.')),
			E('div', { 'class': 'fac-warn-line' },
				_('Same LAN should not have multiple devices with the same MAC.')),
			stack,
			wifiBox,
			E('div', { 'class': 'fac-row' }, [ saveBtn, reloadBtn ])
		]));

		// initialise the current-values table from loaded values
		this.refreshDerived();

		this._body = body;
		return body;
	},

	onWanInput: function() {
		this.refreshDerived();
		this.validate();
	},

	// keep the "Current device values" table in sync with the form:
	// LAN mirrors WAN+1 and U-Boot ethaddr mirrors WAN unless the user
	// touched them; OUI always derives from ethaddr; Wi-Fi BSSIDs derive
	// from WAN.
	refreshDerived: function() {
		var wan = this._wanInput.value.trim();
		var lan = this._lanInput.value.trim();
		var eth = this._ethaddrInput.value.trim();
		if (macValid(wan) && !this._lanTouched) {
			lan = macPlus1(wan);
			this._lanInput.value = lan;
		}
		if (macValid(wan) && !this._ethTouched) {
			eth = wan;
			this._ethaddrInput.value = wan;
		}
		if (this._currentTable) {
			renderCurrentValues(this._currentTable, wan, lan, eth);
		}
	},

	validate: function() {
		var ok = true;
		['wan_mac', 'lan_mac', 'ethaddr'].forEach(function(k) {
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
		var eth = (this._ethaddrInput.value || '').trim();
		function modalRow(label, value) {
			return E('li', {}, [
				E('b', {}, label + ': '),
				String(value)
			]);
		}
		return L.ui.showModal(_('Write factory data + reboot'), [
			E('ul', { 'class': 'fac-modal-list' }, [
				modalRow(_('WAN MAC'), wan),
				modalRow(_('LAN MAC'), lan),
				modalRow(_('U-Boot ethaddr'), eth),
				modalRow(_('Serial Number'), fields.serial_number || _('(unchanged)'))
			]),
			E('div', { 'class': 'right' }, [
				E('button', {
					'class': 'cbi-button cbi-button-apply',
					'click': function() {
						L.ui.hideModal();
						callSetFactory({ fields: fields, ethaddr: eth }).then(function(res) {
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
