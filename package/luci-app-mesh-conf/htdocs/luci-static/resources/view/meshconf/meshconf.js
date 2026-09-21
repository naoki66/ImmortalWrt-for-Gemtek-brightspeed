'use strict';
'require rpc';
'require ui';
'require view';
'require view.meshconf.ds-tokens as dsTokens';

var callStatus = rpc.declare({
	object: 'luci.meshconf',
	method: 'getStatus'
});

var callScanPeers = rpc.declare({
	object: 'luci.meshconf',
	method: 'scanPeers'
});

var callApplyMesh = rpc.declare({
	object: 'luci.meshconf',
	method: 'applyMesh',
	params: [ 'enabled', 'radio', 'mesh_id', 'encryption', 'key', 'bridge_lan' ]
});

var callApplyRoaming = rpc.declare({
	object: 'luci.meshconf',
	method: 'applyRoaming',
	params: [ 'enabled' ]
});

var callToggleRoam = rpc.declare({
	object: 'luci.meshconf',
	method: 'toggleRoam',
	params: [ 'section', 'feature', 'enabled' ]
});

var callSetMd = rpc.declare({
	object: 'luci.meshconf',
	method: 'setMd',
	params: [ 'section', 'md' ]
});

var callApplySync = rpc.declare({
	object: 'luci.meshconf',
	method: 'applySync',
	params: [ 'enabled', 'port', 'key', 'peers', 'channel_mode' ]
});

var callRestartSync = rpc.declare({
	object: 'luci.meshconf',
	method: 'restartSync'
});

var callSyncPeer = rpc.declare({
	object: 'luci.meshconf',
	method: 'syncPeer',
	params: [ 'ip', 'direction' ]
});

/* The parameter list mirrors the UCI fields the backend writes; anything left
 * empty there means "keep what is already configured", so the page can send a
 * partially filled form without wiping the rest. */
var callApplySteer = rpc.declare({
	object: 'luci.meshconf',
	method: 'applySteer',
	params: [
		'enabled', 'network_option', 'broadcast_ip', 'broadcast_port', 'tcp_port',
		'key_mode', 'use_symm_enc',
		'kicking', 'kicking_threshold', 'min_number_to_kick', 'min_probe_count',
		'chan_util_avg_period', 'set_hostapd_nr',
		'g_initial_score', 'g_rssi_val', 'g_low_rssi_val', 'g_rssi_weight', 'g_rssi_center',
		'a_initial_score', 'a_rssi_val', 'a_low_rssi_val', 'a_rssi_weight', 'a_rssi_center',
		'x_initial_score', 'x_rssi_val', 'x_low_rssi_val', 'x_rssi_weight', 'x_rssi_center'
	]
});

var callSteerService = rpc.declare({
	object: 'luci.meshconf',
	method: 'steerService'
});

/* ---------------------------------------------------------------------------
 * Shared design tokens.
 *
 * The canonical values live in docs/design-luci-vlan-ui.md and are mirrored in
 * the Switch view's stylesheet (view/network/switch-vlan.css, see
 * patches/feeds/luci/.../102-align-switch-vlan-design-tokens.patch) so that
 * pages editing the same model read as one product.
 *
 * Surfaces, text and borders map onto the LuCI theme variables instead of
 * being hardcoded: the theme owns its light/dark palette, and the previous
 * fixed palette plus a body-background luminance probe made this page ignore
 * it entirely. Dark mode is detected at runtime by probing the computed
 * background luminance of the page containers plus the loaded stylesheet
 * links, so the accents re-tune correctly on any theme that ships a dark palette.
 *
 * `tokens` is the shared `--ds-*` declaration block; see ds-tokens.js for the
 * canonical values and the note about the LuCI theme owning light/dark.
 * ------------------------------------------------------------------------- */
var css = [
	'.meshconf-page{' + dsTokens.tokens + ';line-height:1.5;color:var(--ds-text)}',
	'.meshconf-page :focus-visible{outline:2px solid var(--ds-primary);outline-offset:2px}',
	'.meshconf-page h2{margin:0 0 var(--ds-sp-1);font-size:var(--ds-fs-2xl);line-height:1.3;font-weight:650;color:var(--ds-text)}',
	'.meshconf-page .nm-lede{margin:0 0 var(--ds-sp-4);color:var(--ds-text-muted);font-size:var(--ds-fs-sm)}',
	'.nm-section{margin:0 0 var(--ds-sp-5);padding:var(--ds-sp-4) var(--ds-sp-5);border:1px solid var(--ds-border);border-radius:var(--ds-r-lg);background:var(--ds-surface);box-shadow:var(--ds-shadow-1)}',
	'.nm-title{display:flex;align-items:center;justify-content:space-between;gap:var(--ds-sp-3);margin:0;font-size:var(--ds-fs-lg);font-weight:650}',
	'.nm-title .nm-muted{font-size:var(--ds-fs-sm);font-weight:400}',
	'.nm-subtitle{margin:var(--ds-sp-1) 0 var(--ds-sp-4);color:var(--ds-text-muted);font-size:var(--ds-fs-sm)}',
	'.nm-muted{color:var(--ds-text-muted)}',
	'.nm-hint{margin:var(--ds-sp-3) 0 0;font-size:var(--ds-fs-sm);line-height:1.6;color:var(--ds-text-muted)}',
	'',
	/* status pills */
	'.nm-status{display:flex;gap:var(--ds-sp-2);flex-wrap:wrap;align-items:center}',
	'.nm-pill{display:inline-flex;align-items:center;min-height:25px;padding:0 var(--ds-sp-3);border:1px solid var(--ds-border);border-radius:var(--ds-r-pill);background:var(--ds-surface-sunken);font-size:var(--ds-fs-sm);font-weight:600;white-space:nowrap}',
	'.nm-pill.ok{color:var(--ds-ok);border-color:var(--ds-ok-line);background:var(--ds-ok-tint)}',
	'.nm-pill.warn{color:var(--ds-warn);border-color:var(--ds-warn-line);background:var(--ds-warn-tint)}',
	'.nm-pill.info{color:var(--ds-info);border-color:var(--ds-info-line);background:var(--ds-info-tint)}',
	'.nm-pill .dot{width:6px;height:6px;border-radius:50%;background:currentColor;margin-right:var(--ds-sp-2);opacity:.85}',
	'.nm-infogrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(148px,1fr));gap:var(--ds-sp-2);margin-top:var(--ds-sp-3)}',
	'.nm-info{border:1px solid var(--ds-border);border-radius:var(--ds-r-md);background:var(--ds-surface-sunken);padding:var(--ds-sp-2) var(--ds-sp-3);min-width:0}',
	'.nm-info-label{font-size:var(--ds-fs-xs);font-weight:650;color:var(--ds-text-muted);margin-bottom:var(--ds-sp-1)}',
	'.nm-info-value{font-size:var(--ds-fs-lg);font-weight:650;word-break:break-all;line-height:1.35}',
	'.nm-info-sub{font-size:var(--ds-fs-xs);color:var(--ds-text-muted);margin-top:2px;word-break:break-all}',
	'',
	/* form fields */
	'.nm-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:var(--ds-sp-3);margin-top:var(--ds-sp-3)}',
	'.nm-field{display:flex;flex-direction:column;gap:var(--ds-sp-1);min-width:0}',
	'.nm-field>label{font-size:var(--ds-fs-sm);font-weight:600;color:var(--ds-text-muted)}',
	'.nm-field input,.nm-field select{min-height:34px;border:1px solid var(--ds-border);border-radius:var(--ds-r-sm);padding:var(--ds-sp-1) var(--ds-sp-2);background:var(--ds-surface);color:var(--ds-text);font-size:var(--ds-fs-base);box-sizing:border-box;width:100%;font-family:inherit}',
	'.nm-field input:focus,.nm-field select:focus{border-color:var(--ds-primary);box-shadow:0 0 0 3px var(--ds-focus-ring)}',
	'.nm-field input:focus-visible,.nm-field select:focus-visible{outline:2px solid var(--ds-primary);outline-offset:1px}',
	'.nm-field input:disabled,.nm-field select:disabled{opacity:.55;cursor:not-allowed}',
	'.nm-field.wide{grid-column:1 / -1}',
	'.nm-field.inline{flex-direction:row;align-items:center;gap:var(--ds-sp-2);min-height:34px}',
	'.nm-field.inline>label{font-size:var(--ds-fs-base);font-weight:400;color:var(--ds-text);cursor:pointer;display:inline-flex;align-items:center;gap:var(--ds-sp-2)}',
	'.nm-field.inline input[type=checkbox]{width:16px;height:16px;min-height:0;margin:0;accent-color:var(--ds-primary)}',
	'',
	/* action rows */
	'.nm-actions{display:flex;gap:var(--ds-sp-2);flex-wrap:wrap;margin-top:var(--ds-sp-4);padding-top:var(--ds-sp-3);border-top:1px solid var(--ds-border)}',
	'.nm-actions .cbi-button{min-height:34px}',
	'',
	/* peer / AP tables */
	'.nm-table{width:100%;border-collapse:collapse;margin-top:var(--ds-sp-3);font-size:var(--ds-fs-sm)}',
	'.nm-table th,.nm-table td{border:1px solid var(--ds-border);padding:var(--ds-sp-1) var(--ds-sp-2);text-align:left;vertical-align:top;word-break:break-all}',
	'.nm-table th{background:var(--ds-surface-sunken);font-weight:650;color:var(--ds-text-muted);white-space:nowrap}',
	'.nm-table td.nowrap{white-space:nowrap}',
	'.nm-table .nm-mono,.nm-table .nm-state{font-size:.95em}',
	'.nm-mono{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:var(--ds-fs-xs)}',
	'.nm-state{display:inline-flex;align-items:center;min-height:19px;padding:0 var(--ds-sp-2);border-radius:var(--ds-r-sm);font-size:var(--ds-fs-xs);font-weight:650;background:var(--ds-surface-sunken);color:var(--ds-text-muted)}',
	'.nm-state.estab{background:var(--ds-ok-tint);color:var(--ds-ok)}',
	'.nm-state.off{background:var(--ds-error-tint);color:var(--ds-error)}',
	'',
	/* k/v/r switch. :focus only adds the ring - it must not set outline:none,
	 * because a later :focus-visible rule at equal specificity would then be
	 * the one that wins the tie and keyboard users would lose the outline. */
	'.nm-toggle{display:inline-flex;align-items:center;justify-content:center;min-width:3.4em;min-height:22px;padding:0 var(--ds-sp-2);border:1px solid var(--ds-border);border-radius:var(--ds-r-pill);background:var(--ds-surface-sunken);color:var(--ds-text-muted);font-family:inherit;font-size:var(--ds-fs-xs);font-weight:650;line-height:1;cursor:pointer}',
	'.nm-toggle:hover{border-color:var(--ds-primary);color:var(--ds-primary)}',
	'.nm-toggle:focus{border-color:var(--ds-primary);box-shadow:0 0 0 3px var(--ds-focus-ring)}',
	'.nm-toggle.on{border-color:var(--ds-ok-line);background:var(--ds-ok-tint);color:var(--ds-ok)}',
	'.nm-toggle[disabled]{cursor:progress;opacity:.6}',
	'.nm-toggle.dim{opacity:.45;cursor:not-allowed}',
	/* mobility domain cell: a 4-hex-digit field, no wider than it needs to be */
	'.nm-md{width:4.6em;min-height:24px;padding:0 var(--ds-sp-1);border:1px solid var(--ds-border);border-radius:var(--ds-r-sm);background:var(--ds-surface);color:var(--ds-text);font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:var(--ds-fs-xs);text-align:center;box-sizing:border-box}',
	'.nm-md:focus{border-color:var(--ds-primary);box-shadow:0 0 0 3px var(--ds-focus-ring)}',
	'.nm-md[disabled]{opacity:.55}',
	'',
	/* banners */
	'.nm-banner{display:flex;gap:var(--ds-sp-2);align-items:flex-start;margin:var(--ds-sp-3) 0 0;padding:var(--ds-sp-2) var(--ds-sp-3);border:1px solid var(--ds-warn-line);border-radius:var(--ds-r-md);background:var(--ds-warn-tint);color:var(--ds-warn);font-size:var(--ds-fs-sm);line-height:1.6}',
	'.nm-banner.bad{border-color:var(--ds-error-line);background:var(--ds-error-tint);color:var(--ds-error)}',
	'.nm-banner.info{border-color:var(--ds-info-line);background:var(--ds-info-tint);color:var(--ds-info)}',
	'.nm-banner strong{display:block;margin-bottom:2px}',
	'.nm-banner.hidden{display:none}',
	'.nm-empty{display:flex;flex-direction:column;justify-content:center;min-height:90px;box-sizing:border-box;padding:var(--ds-sp-4);text-align:center;color:var(--ds-text-muted);border:1px dashed var(--ds-border);border-radius:var(--ds-r-md);margin-top:var(--ds-sp-3)}',
	'',
	/* One breakpoint, the same one the Switch view uses. */
	'@media(max-width:720px){.nm-title{flex-direction:column;align-items:flex-start;gap:var(--ds-sp-1)}}'
].join('\n');

/* Dark accents. Applied when isDarkMode() detects a dark page background;
 * surfaces and text already follow the theme variables, so only the semantic
 * accents have to be re-tuned for a dark background - and the tints get a
 * higher alpha, since a .08 wash is invisible on a dark surface. */
var darkVars = dsTokens.dark;

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
	var el = document.getElementById('meshconf-css');
	if (!el) {
		el = document.createElement('style');
		el.id = 'meshconf-css';
		document.head.appendChild(el);
	}
	el.textContent = css + (isDarkMode() ? '\n' + darkVars : '');
}

/* ---------------------------------------------------------------------------
 * tiny DOM helpers
 * ------------------------------------------------------------------------- */
function checkbox(checked, onchange) {
	var el = E('input', { type: 'checkbox' });
	el.checked = !!checked;
	if (onchange) el.addEventListener('change', onchange);
	return el;
}

function textInput(value, opts) {
	opts = opts || {};
	var el = E('input', { type: opts.type || 'text', placeholder: opts.placeholder || '' });
	el.value = (value === null || value === undefined) ? '' : String(value);
	if (opts.onchange) el.addEventListener('change', opts.onchange);
	return el;
}

function select(options, value, onchange) {
	var el = E('select');
	options.forEach(function(o) {
		var opt = E('option', { value: o.value }, o.label);
		if (o.disabled) opt.disabled = true;
		el.appendChild(opt);
	});
	el.value = value;
	if (onchange) el.addEventListener('change', onchange);
	return el;
}

function field(label, control, wide) {
	return E('div', { 'class': 'nm-field' + (wide ? ' wide' : '') }, [
		E('label', {}, label),
		control
	]);
}

function inlineField(label, control) {
	return E('div', { 'class': 'nm-field inline' }, [ control, E('label', {}, label) ]);
}

function pill(state, text) {
	var el = E('span', { 'class': 'nm-pill ' + (state || '') }, [ E('i', { 'class': 'dot' }), document.createTextNode(text) ]);
	return el;
}

function info(label, value, sub) {
	return E('div', { 'class': 'nm-info' }, [
		E('div', { 'class': 'nm-info-label' }, label),
		E('div', { 'class': 'nm-info-value' }, value),
		sub ? E('div', { 'class': 'nm-info-sub' }, sub) : ''
	]);
}

function notify(msg, kind) {
	ui.addNotification(null, E('p', msg), kind || 'info');
}

/* ---------------------------------------------------------------------------
 * page state
 * ------------------------------------------------------------------------- */
var statusData = null;
var peerData = null;
var pageBody = null;
var updatedEl = null;

function markUpdated() {
	if (updatedEl)
		updatedEl.textContent = _('Updated %s').format(new Date().toLocaleTimeString());
}

function refresh() {
	if (!pageBody) return Promise.resolve();
	pageBody.innerHTML = '';
	pageBody.appendChild(E('div', { 'class': 'nm-empty' }, _('Loading…')));

	return callStatus().then(function(res) {
		statusData = res || {};
		render();
		markUpdated();
	}, function(e) {
		pageBody.innerHTML = '';
		pageBody.appendChild(E('div', { 'class': 'nm-banner bad' }, [
			E('strong', {}, _('Failed to load data')),
			E('div', {}, e.message || _('The rpcd plugin (luci.meshconf) did not respond.'))
		]));
		markUpdated();
	});
}

function render() {
	if (!pageBody || !statusData) return;
	pageBody.innerHTML = '';
	pageBody.appendChild(renderStatus());
	pageBody.appendChild(renderMesh());
	pageBody.appendChild(renderSync());
	pageBody.appendChild(renderRoaming());
	pageBody.appendChild(renderSteer());
}

function withButton(btn, busyLabel, fn) {
	var orig = btn.textContent;
	btn.disabled = true;
	btn.textContent = busyLabel;
	var done = function() {
		btn.disabled = false;
		btn.textContent = orig;
	};
	return fn().then(function(res) {
		done();
		if (!res || res.success === false) {
			notify((res && res.error) || _('Operation failed'), 'danger');
			return res;
		}
		notify(_('Applied; the wireless configuration is reloading (a few seconds).'), 'success');
		return refresh();
	}, function(e) {
		done();
		notify(e.message || _('Operation failed'), 'danger');
	});
}

/* ---------------------------------------------------------------------------
 * status
 * ------------------------------------------------------------------------- */
function meshPill() {
	var m = statusData.mesh || {};
	if (!m.enabled) return pill('', _('Wireless Mesh: disabled'));
	if (m.state === 'up') return pill('ok', _('Wireless Mesh: connected, %d peer(s)').format(m.peers || 0));
	if (m.state === 'waiting') return pill('warn', _('Wireless Mesh: waiting for peers'));
	return pill('warn', _('Wireless Mesh: enabled but not up'));
}

function roamPill() {
	var r = statusData.roaming || {};
	if (!r.enabled) return pill('', _('Roaming: off'));
	return pill('ok', _('Roaming: on for %d/%d SSIDs').format(r.ap_ready || 0, r.ap_total || 0));
}

function syncPill() {
	var s = statusData.sync || {};
	if (!s.enabled) return pill('', _('Wired sync: disabled'));
	if (!s.running) return pill('warn', _('Wired sync: service not running'));
	return pill('ok', _('Wired sync: port %s').format(s.port || '7761'));
}

function renderStatus() {
	var l = statusData.local || {};
	var m = statusData.mesh || {};
	var s = statusData.sync || {};

	return E('div', { 'class': 'nm-section' }, [
		E('div', { 'class': 'nm-title' }, [
			E('span', {}, _('Local status')),
			E('span', { 'class': 'nm-muted' }, l.hostname || '')
		]),
		E('div', { 'class': 'nm-status', 'style': 'margin-top:var(--ds-sp-3)' }, [
			meshPill(), roamPill(), syncPill(), steerPill()
		]),
		E('div', { 'class': 'nm-infogrid' }, [
			info(_('Model'), l.model || '-'),
			info(_('LAN IP'), l.lan_ip || '-', l.mac || ''),
			info(_('Wireless config revision'), E('span', { 'class': 'nm-mono' }, l.wifirev || '-'), _('Used to compare whether two devices match')),
			info(_('Mesh interface'), m.iface || '-', m.state === 'up' ? _('%d peers').format(m.peers) : (m.enabled ? _('Link not established') : _('Not configured'))),
			info(_('Sync key'), s.key_set ? _('Set') : _('Not set'), s.last_peer ? _('Last peer %s').format(s.last_peer) : _('Never synced'))
		])
	]);
}

/* ---------------------------------------------------------------------------
 * wireless 802.11s
 * ------------------------------------------------------------------------- */
function renderMesh() {
	var m = statusData.mesh || {};
	var radios = statusData.radios || [];

	var enabledBox = checkbox(m.enabled, function() {
		toggleMeshFields(enabledBox.checked);
	});

	var radioSel = select(radios.map(function(r) {
		var label = _('%s (%s, channel %s)').format(r.name, r.band || '?', r.channel || 'auto');
		if (!r.mesh_capable) label += _(' · mesh not supported');
		return { value: r.name, label: label, disabled: !r.mesh_capable };
	}), m.radio || (radios.length ? radios[0].name : ''));

	var meshIdInput = textInput(m.mesh_id || 'XR1710G-Mesh');
	var encSel = select([
		{ value: 'sae', label: _('SAE (recommended)') },
		{ value: 'none', label: _('No encryption') }
	], m.encryption || 'sae', function() {
		keyField.style.display = (encSel.value === 'sae') ? '' : 'none';
	});
	// `m.key_set ? '' : ''` was a typo: both branches were empty, so the box
	// was always blank and every save stored an empty key. Send the value.
	var keyInput = textInput(m.key || '', { type: 'password', placeholder: m.key_set ? _('Leave blank to keep unchanged') : _('At least 8 characters') });
	var keyField = field(_('Mesh key'), keyInput);
	keyField.style.display = (m.encryption === 'none') ? 'none' : '';

	var bridgeBox = checkbox(m.bridge_lan !== false, function() {});

	function toggleMeshFields(on) {
		[ radioSel, meshIdInput, encSel, keyInput, bridgeBox ].forEach(function(el) {
			el.disabled = !on;
		});
	}
	toggleMeshFields(!!m.enabled);

	var saveBtn = E('button', { 'class': 'cbi-button cbi-button-apply' }, _('Save & apply'));
	saveBtn.addEventListener('click', function() {
		if (enabledBox.checked && !radioSel.value) {
			notify(_('Please select a mesh-capable radio.'), 'danger');
			return;
		}
		if (enabledBox.checked && !meshIdInput.value.trim()) {
			notify(_('Please enter a Mesh ID; both devices must use the same one.'), 'danger');
			return;
		}
		withButton(saveBtn, _('Applying…'), function() {
			return callApplyMesh(
				enabledBox.checked ? '1' : '0',
				radioSel.value,
				meshIdInput.value.trim(),
				encSel.value,
				keyInput.value,
				bridgeBox.checked ? '1' : '0'
			);
		});
	});

	var stopBtn = E('button', { 'class': 'cbi-button cbi-button-reset' }, _('Disable 802.11s'));
	stopBtn.disabled = !m.enabled;
	stopBtn.addEventListener('click', function() {
		withButton(stopBtn, _('Disabling…'), function() {
			return callApplyMesh('0', radioSel.value, meshIdInput.value.trim(), encSel.value, '', '1');
		});
	});

	var warn = '';
	if (!m.wpad_mesh) {
		warn = E('div', { 'class': 'nm-banner' }, [
			E('strong', {}, _('wpad may not support mesh')),
			E('div', {}, _('802.11s needs a hostapd built with mesh support (wpad-mesh-* or wpad-openssl). No mesh features were found in /usr/sbin/hostapd, so the interface may not come up.'))
		]);
	} else if (m.enabled && m.state === 'down') {
		warn = E('div', { 'class': 'nm-banner' }, [
			E('strong', {}, _('The Mesh interface is down')),
			E('div', {}, _('Make sure both devices use an identical Mesh ID, encryption method and key, and that the selected radio is enabled.'))
		]);
	}

	return E('div', { 'class': 'nm-section' }, [
		E('div', { 'class': 'nm-title' }, [
			E('span', {}, _('Wireless Mesh (802.11s)')),
			E('span', { 'class': 'nm-muted' }, m.enabled ? (m.state === 'up' ? _('Connected') : _('Configured')) : _('Disabled'))
		]),
		E('p', { 'class': 'nm-subtitle' }, _('Create an 802.11s mesh interface on the selected radio and bridge it to the LAN, so both devices share one layer-2 network. Native 802.11s, no batman-adv required.')),
		E('div', { 'class': 'nm-form' }, [
			E('div', { 'class': 'nm-field wide' }, [ inlineField(_('Enable 802.11s mesh'), enabledBox) ]),
			field(_('Radio'), radioSel),
			field(_('Mesh ID'), meshIdInput),
			field(_('Encryption'), encSel),
			keyField,
			E('div', { 'class': 'nm-field wide' }, [ inlineField(_('Bridge to LAN (both devices on one layer-2)'), bridgeBox) ])
		]),
		warn,
		E('div', { 'class': 'nm-actions' }, [ saveBtn, stopBtn ]),
		E('p', { 'class': 'nm-hint' }, _('Saving reloads the wireless; connected clients will briefly disconnect.'))
	]);
}

/* ---------------------------------------------------------------------------
 * wired sync
 * ------------------------------------------------------------------------- */
function peerRow(p) {
	var selfRev = (statusData.local || {}).wifirev;
	var same = p.wifirev && p.wifirev === selfRev;
	var chNote = ((statusData.sync || {}).channel_mode !== 'follow')
		? _(' (channels are staggered automatically; already-different ones stay as they are)') : _(' (channels are overwritten together)');

	var pullBtn = E('button', { 'class': 'cbi-button cbi-button-action' }, _('Pull to local'));
	pullBtn.addEventListener('click', function() {
		if (!confirm(_('Overwrite this device with the wireless config from %s%s (the current config is backed up to /etc/config/wireless.meshconf-bak). Continue?').format(p.ip, chNote))) return;
		withButton(pullBtn, _('Pulling…'), function() {
			return callSyncPeer(p.ip, 'pull');
		});
	});

	var pushBtn = E('button', { 'class': 'cbi-button cbi-button-apply' }, _('Push to peer'));
	pushBtn.addEventListener('click', function() {
		if (!confirm(_('Overwrite %s with the wireless config of this device (the peer decides whether to stagger channels). Continue?').format(p.ip))) return;
		withButton(pushBtn, _('Pushing…'), function() {
			return callSyncPeer(p.ip, 'push');
		});
	});

	return E('tr', {}, [
		E('td', {}, [
			E('div', {}, p.hostname || '-'),
			E('div', { 'class': 'nm-muted' }, p.model || '')
		]),
		E('td', { 'class': 'nowrap' }, E('span', { 'class': 'nm-mono' }, p.ip)),
		E('td', { 'class': 'nowrap' }, [
			E('span', { 'class': 'nm-mono' }, p.wifirev || '-'),
			same ? E('span', { 'class': 'nm-state estab', 'style': 'margin-left:var(--ds-sp-1)' }, _('Matches this device')) : ''
		]),
		E('td', { 'class': 'nowrap' }, p.source === 'manual' ? _('Manual') : _('Layer-2 discovery')),
		E('td', { 'class': 'nowrap' }, [ pullBtn, ' ', pushBtn ])
	]);
}

function renderSync() {
	var s = statusData.sync || {};
	var enabledBox = checkbox(s.enabled, function() {
		[ portInput, keyInput, peersInput, keepBox ].forEach(function(el) { el.disabled = !enabledBox.checked; });
		scanBtn.disabled = !enabledBox.checked;
	});

	// Default on, including on a unit that has never been configured here:
	// two units sharing a channel split airtime instead of adding to it,
	// which is the worse way to be wrong.
	var keepBox = checkbox(s.channel_mode !== 'follow', function() {});

	var portInput = textInput(s.port || '7761', { type: 'number' });
	// The backend now hands the stored key back, so the box is filled in on
	// load and can be copied onto the other unit. It used to render empty
	// (only key_set was sent) and one save later the stored key was gone.
	var keyInput = textInput(s.key || '', { type: 'text', placeholder: s.key_set ? _('Leave blank to keep unchanged') : _('All devices must use the same key') });
	var peersInput = textInput(((s.peers) || []).join(', '), { placeholder: _('e.g. 192.168.2.1, 192.168.3.10') });

	var saveBtn = E('button', { 'class': 'cbi-button cbi-button-apply' }, _('Save & apply'));
	saveBtn.addEventListener('click', function() {
		// Only a pair that has never had a key needs one typed in; on a
		// configured pair the box is prefilled and an empty value means
		// "keep it", which is what the backend does with it too.
		if (enabledBox.checked && !s.key_set && !keyInput.value.trim()) {
			notify(_('Please set the shared key; all devices must match it, otherwise sync will fail.'), 'danger');
			return;
		}
		withButton(saveBtn, _('Saving…'), function() {
			return callApplySync(enabledBox.checked ? '1' : '0', portInput.value.trim(), keyInput.value.trim(), peersInput.value, keepBox.checked ? 'stagger' : 'follow');
		});
	});

	var scanBtn = E('button', { 'class': 'cbi-button cbi-button-action' }, _('Scan LAN for devices'));
	scanBtn.addEventListener('click', function() {
		var self = scanBtn;
		var orig = self.textContent;
		self.disabled = true;
		self.textContent = _('Scanning…');
		callScanPeers().then(function(res) {
			self.disabled = false;
			self.textContent = orig;
			peerData = res || { peers: [] };
			render();
			var n = (peerData.peers || []).length;
			notify(n ? _('Found %d device(s).').format(n) : _('No other devices found. Check that the peer has wired sync enabled, uses the same key, and is on the same LAN.'), n ? 'success' : 'info');
		}, function(e) {
			self.disabled = false;
			self.textContent = orig;
			notify(e.message || _('Scan failed'), 'danger');
		});
	});

	[ portInput, keyInput, peersInput, keepBox ].forEach(function(el) { el.disabled = !s.enabled; });
	scanBtn.disabled = !s.enabled;

	var peers = (peerData && peerData.peers) || [];
	var table = E('div', { 'class': 'nm-empty' }, _('Click "Scan LAN for devices" to find XR1710G units on the same LAN.'));
	if (peers.length) {
		table = E('div', {}, [
			E('table', { 'class': 'nm-table' }, [
				E('thead', {}, E('tr', {}, [
					E('th', {}, _('Device')),
					E('th', {}, _('IP')),
					E('th', {}, _('Config revision')),
					E('th', {}, _('Source')),
					E('th', {}, _('Sync'))
				])),
				E('tbody', {}, peers.map(peerRow))
			])
		]);
	}

	var warn = '';
	if (s.enabled && !s.running) {
		var startBtn = E('button', { 'class': 'cbi-button cbi-button-apply' }, _('Start service'));
		startBtn.addEventListener('click', function() {
			var self = startBtn, orig = self.textContent;
			self.disabled = true;
			self.textContent = _('Starting…');
			var done = function() {
				self.disabled = false;
				self.textContent = orig;
			};
			callRestartSync().then(function(res) {
				done();
				if (res && res.running) notify(_('The sync service has started.'), 'success');
				else notify(_('The service is still not up; run "logread -e meshconf" over SSH to see why.'), 'danger');
				return refresh();
			}, function(e) {
				done();
				notify(e.message || _('Start failed'), 'danger');
			});
		});
		warn = E('div', { 'class': 'nm-banner bad' }, [
			E('strong', {}, _('The sync service is not running')),
			E('div', {}, s.reason || _('The service process is missing. It should start automatically after saving; you can also start it manually with the button below.')),
			E('div', { 'style': 'margin-top:.5em' }, [ startBtn ])
		]);
	}

	return E('div', { 'class': 'nm-section' }, [
		E('div', { 'class': 'nm-title' }, [
			E('span', {}, _('Wired sync (same-model devices)')),
			E('span', { 'class': 'nm-muted' }, s.enabled ? _('Enabled') : _('Disabled'))
		]),
		E('p', { 'class': 'nm-subtitle' }, _('When the devices are already on the same LAN, use this one to unify the others: it periodically broadcasts to discover neighbours, then syncs /etc/config/wireless (including SSID, key and k/v/r parameters) using the shared key.')),
		E('div', { 'class': 'nm-form' }, [
			E('div', { 'class': 'nm-field wide' }, [ inlineField(_('Enable wired sync (also makes this device discoverable)'), enabledBox) ]),
			field(_('Port'), portInput),
			field(_('Shared key'), keyInput),
			field(_('Manually added device IPs'), peersInput, true),
			E('div', { 'class': 'nm-field wide' }, [ inlineField(_('Automatically stagger channels when syncing'), keepBox) ]),
			E('p', { 'class': 'nm-hint' }, _('If the two APs are far apart, you may turn this off.'))
		]),
		warn,
		E('div', { 'class': 'nm-actions' }, [ saveBtn, scanBtn ]),
		table,
		E('p', { 'class': 'nm-hint' }, _('Syncing overwrites the whole /etc/config/wireless on the peer; pulling to this device automatically backs it up to /etc/config/wireless.meshconf-bak. For devices not on the same layer-2 (across routers), add them under "Manually added device IPs". With "Automatically stagger channels" checked, the receiving end moves within the same band to a channel that does not overlap the peer (2.4G uses 1/6/11, 5G/6G hops by channel width); channels that are already staggered stay as they are, and the radio carrying the 802.11s backhaul stays on the same channel as the peer (mesh requires a shared channel). SSID, key and k/v/r sync as usual and roaming is unaffected.'))
	]);
}

/* ---------------------------------------------------------------------------
 * 802.11k/v/r
 * ------------------------------------------------------------------------- */
var ROAM_LABEL = { k: _('802.11k neighbor report'), v: _('802.11v BTM transition'), r: _('802.11r fast roaming') };

function roamToggle(ap, feat) {
	var on = !!ap[feat];
	// FT derives PMK-R0/R1 from the key, so an open network has no R to give.
	var blocked = (feat === 'r' && !ap.ft_ok);
	var title = on ? _('Click to disable %s').format(ROAM_LABEL[feat]) : _('Click to enable %s').format(ROAM_LABEL[feat]);
	if (blocked) {
		title = _('802.11r cannot be enabled on an open / OWE network');
	} else if (feat === 'r' && ap.wpa3) {
		// WPA3 has no PSK to derive a local PMK-R0 from; say so up front.
		title += _(' (WPA3 network: ft_psk_generate_local is forced to 0)');
	}
	var b = E('button', {
		'class': 'nm-toggle' + (on ? ' on' : '') + (blocked ? ' dim' : ''),
		'type': 'button',
		'title': title
	}, on ? _('On') : _('Off'));

	if (blocked) {
		b.disabled = true;
		return b;
	}
	b.addEventListener('click', function() {
		withButton(b, _('…'), function() { return callToggleRoam(ap.section, feat, on ? '0' : '1'); });
	});
	return b;
}

/* Editable mobility domain. Emptying the field drops the option, which puts
 * the interface back on the SSID-derived value. */
function mdCell(ap) {
	var current = (ap.md || '').toLowerCase();
	var inp = E('input', {
		'class': 'nm-md',
		'type': 'text',
		'maxlength': '4',
		'spellcheck': 'false',
		'value': current,
		'placeholder': _('Auto'),
		'title': _('4 hex digits (0-9 / a-f); clear it and press Enter to fall back to the SSID-derived value. All interfaces of the same SSID are updated together.')
	});

	inp.addEventListener('change', function() {
		var v = inp.value.trim().toLowerCase();
		if (v === current) return;
		inp.disabled = true;
		callSetMd(ap.section, v).then(function(res) {
			if (!res || res.success === false) {
				inp.disabled = false;
				notify((res && res.error) || _('Save failed'), 'danger');
				return;
			}
			notify(v
				? _('Mobility domain set to %s (%d interfaces of the same SSID updated).').format(res.md, res.applied)
				: _('Cleared; back to deriving from the SSID (%s).').format(res.md), 'success');
			return refresh();
		}, function(e) {
			inp.disabled = false;
			notify(e.message || _('Save failed'), 'danger');
		});
	});

	return E('td', { 'class': 'nowrap' }, [
		inp,
		ap.md_set ? '' : E('span', { 'class': 'nm-state', 'style': 'margin-left:var(--ds-sp-1)' }, _('Auto'))
	]);
}

function renderRoaming() {
	var r = statusData.roaming || {};
	var aps = statusData.aps || [];

	var onBtn = E('button', { 'class': 'cbi-button cbi-button-apply' }, _('Enable k/v/r'));
	onBtn.addEventListener('click', function() {
		withButton(onBtn, _('Enabling…'), function() { return callApplyRoaming('1'); });
	});

	var offBtn = E('button', { 'class': 'cbi-button cbi-button-reset' }, _('Disable k/v/r'));
	offBtn.addEventListener('click', function() {
		withButton(offBtn, _('Disabling…'), function() { return callApplyRoaming('0'); });
	});

	var table = E('div', { 'class': 'nm-empty' }, _('There are no AP interfaces.'));
	if (aps.length) {
		table = E('table', { 'class': 'nm-table' }, [
			E('thead', {}, E('tr', {}, [
				E('th', {}, _('SSID')),
				E('th', {}, _('Band')),
				E('th', {}, _('Network')),
				E('th', { 'title': ROAM_LABEL.k }, _('K')),
				E('th', { 'title': ROAM_LABEL.v }, _('V')),
				E('th', { 'title': ROAM_LABEL.r }, _('R')),
				E('th', {}, _('Mobility domain MD'))
			])),
			E('tbody', {}, aps.map(function(a) {
				return E('tr', {}, [
					E('td', {}, a.ssid || '-'),
					E('td', {}, a.band || '-'),
					E('td', {}, a.network || 'lan'),
					E('td', {}, roamToggle(a, 'k')),
					E('td', {}, roamToggle(a, 'v')),
					E('td', {}, roamToggle(a, 'r')),
					mdCell(a)
				]);
			}))
		]);
	}

	return E('div', { 'class': 'nm-section' }, [
		E('div', { 'class': 'nm-title' }, [
			E('span', {}, _('802.11k/v/r roaming')),
			E('span', { 'class': 'nm-muted' }, _('%d/%d SSIDs enabled').format(r.ap_ready || 0, r.ap_total || 0))
		]),
		E('p', { 'class': 'nm-subtitle' }, _('The K / V / R in the table can be toggled per SSID. K writes the neighbour report and beacon report, V writes the BTM transition and WNM sleep, R writes fast roaming (Over the Air, 20s reassociation deadline, mobility domain). The mobility domain is derived from the SSID: the same SSID yields the same MD on every device and every band, while different SSIDs get distinct MDs.')),
		(function() {
			var w = (aps.filter(function(a) { return a.wpa3; })).length;
			return w ? E('p', { 'class': 'nm-hint' }, _('%d interfaces use WPA3 / WPA3 mixed encryption: they have no PSK to derive a local PMK-R0, so enabling R forces ft_psk_generate_local to 0 (1 for other encryption types).').format(w)) : '';
		})(),
		E('div', { 'class': 'nm-actions', 'style': 'margin-top:0;border-top:0;padding-top:0' }, [ onBtn, offBtn ]),
		table,
		E('p', { 'class': 'nm-hint' }, _('The two buttons above act on all SSIDs at once; the toggles in the table only change the interface on that row. The MD column is editable: enter 4 hex digits (0-9 / a-f), or clear it to fall back to the SSID-derived value. Editing one interface updates every interface of the same SSID, otherwise FT will not work when roaming across bands. Enable it, then use "Wired sync" to push the config to the other devices so the whole group shares the same SSID and MD.'))
	]);
}

/* ---------------------------------------------------------------------------
 * DAWN - the steering layer above 802.11k/v
 * ------------------------------------------------------------------------- */
/* One metric section per band. 6 GHz is the odd one out: upstream DAWN knows
 * only two, so unless this build carries patches/feeds/packages/net/dawn the
 * section is written and never read. The banner below says so when that is
 * what the numbers mean. */
var STEER_BANDS = [
	{ pfx: 'g', name: '802_11g', label: _('2.4 GHz') },
	{ pfx: 'a', name: '802_11a', label: _('5 GHz') },
	{ pfx: 'x', name: '802_11a_6g', label: _('6 GHz') }
];

var STEER_KEYS = [ 'initial_score', 'rssi_val', 'low_rssi_val', 'rssi_weight', 'rssi_center' ];

function steerPill() {
	var s = statusData.steering || {};
	if (!s.installed) return pill('', _('Steering: DAWN not installed'));
	if (!s.enabled) return pill('', _('Steering: disabled'));
	if (!s.running) return pill('warn', _('Steering: service not running'));
	if (!s.ubus) return pill('warn', _('Steering: not connected to ubus'));
	return pill('ok', _('Steering: enabled'));
}

function bandConf(name) {
	var bands = (statusData.steering || {}).bands || [];
	for (var i = 0; i < bands.length; i++)
		if (bands[i].name === name) return bands[i];
	return {};
}

/* Same tokens and focus rules as the mobility-domain field, just wide enough
 * for a negative RSSI threshold. Values are validated in the backend: a field
 * that is not an integer keeps whatever DAWN is already using rather than
 * silently becoming a zero. */
function numCell(value) {
	var el = E('input', {
		'class': 'nm-md', 'type': 'text', 'spellcheck': 'false',
		'inputmode': 'numeric', 'style': 'width:5.2em'
	});
	el.value = (value === null || value === undefined) ? '' : String(value);
	return el;
}

function renderSteer() {
	var s = statusData.steering || {};
	var net = s.network || {};
	var met = s.metric || {};
	var enabled = !!s.enabled;

	var enabledBox = checkbox(enabled, function() { setSteerFields(enabledBox.checked); });

	/* Stock DAWN ships 10.0.0.255, which reaches nobody on this LAN. This is
	 * the address the neighbour discovery already uses, computed the same way. */
	var bcastInput = textInput(net.broadcast_ip || s.suggest_bcast || '', {
		placeholder: s.suggest_bcast || _('e.g. 192.168.1.255')
	});

	var netSel = select([
		{ value: '2', label: _('umdns + TCP (recommended)') },
		{ value: '0', label: _('UDP broadcast') },
		{ value: '1', label: _('UDP multicast') },
		{ value: '3', label: _('TCP (no auto-discovery)') }
	], net.network_option || '2');

	var bportInput = textInput(net.broadcast_port || '1025', { type: 'number' });
	var tportInput = textInput(net.tcp_port || '1026', { type: 'number' });

	/* Every node needs the same key, and typing a hex string on every node is
	 * how they stop being the same. The pair already agrees on one for the
	 * wired sync, so DAWN's is stretched from that instead. */
	var keySel = select([
		{ value: 'derived', label: _('Derived from the "wired sync" shared key (recommended)') },
		{ value: 'keep', label: _('Keep the current key') }
	], 'derived');
	if (!net.key_set) keySel.value = 'derived';

	var useEncBox = checkbox(net.use_symm_enc === '1', function() {});

	/* Upstream defaults to 3 ("both"), which also kicks on an absolute
	 * threshold - even when there is no better AP to hand the client to. */
	var kickSel = select([
		{ value: '1', label: _('RSSI comparison (recommended)') },
		{ value: '2', label: _('Absolute RSSI') },
		{ value: '3', label: _('Both') },
		{ value: '0', label: _('Do not move clients') }
	], met.kicking || '1');

	var ktInput = numCell(met.kicking_threshold);
	var nkInput = numCell(met.min_number_to_kick);
	var pcInput = numCell(met.min_probe_count);
	var capInput = numCell(met.chan_util_avg_period);
	var nrSel = select([
		{ value: '0', label: _('Off') },
		{ value: '1', label: _('Static (all APs)') },
		{ value: '2', label: _('Dynamic (from neighbours a client hears)') }
	], met.set_hostapd_nr || '0');

	var bandInputs = {};
	var bandRows = STEER_BANDS.map(function(b) {
		var c = bandConf(b.name), cells = {};
		STEER_KEYS.forEach(function(k) { cells[k] = numCell(c[k]); });
		bandInputs[b.pfx] = cells;
		return E('tr', {}, [
			E('td', { 'class': 'nowrap' }, b.label),
			E('td', {}, cells.initial_score),
			E('td', {}, cells.rssi_val),
			E('td', {}, cells.low_rssi_val),
			E('td', {}, cells.rssi_weight),
			E('td', {}, cells.rssi_center)
		]);
	});

	function setSteerFields(on) {
		[ bcastInput, netSel, bportInput, tportInput, keySel, useEncBox,
		  kickSel, ktInput, nkInput, pcInput, capInput, nrSel ].forEach(function(el) {
			el.disabled = !on;
		});
		STEER_BANDS.forEach(function(b) {
			STEER_KEYS.forEach(function(k) { bandInputs[b.pfx][k].disabled = !on; });
		});
	}
	setSteerFields(enabled);

	var saveBtn = E('button', { 'class': 'cbi-button cbi-button-apply' }, _('Save & apply'));
	saveBtn.addEventListener('click', function() {
		if (enabledBox.checked && keySel.value === 'derived' && !s.sync_key_set) {
			notify(_('Please set the shared key in "Wired sync" first: the DAWN key is derived from it, otherwise the two devices cannot decrypt each other.'), 'danger');
			return;
		}
		withButton(saveBtn, _('Saving…'), function() {
			var band = function(pfx, k) { return bandInputs[pfx][k].value; };
			return callApplySteer(
				enabledBox.checked ? '1' : '0',
				netSel.value, bcastInput.value.trim(), bportInput.value.trim(), tportInput.value.trim(),
				keySel.value, useEncBox.checked ? '1' : '0',
				kickSel.value, ktInput.value, nkInput.value, pcInput.value, capInput.value, nrSel.value,
				band('g', 'initial_score'), band('g', 'rssi_val'), band('g', 'low_rssi_val'), band('g', 'rssi_weight'), band('g', 'rssi_center'),
				band('a', 'initial_score'), band('a', 'rssi_val'), band('a', 'low_rssi_val'), band('a', 'rssi_weight'), band('a', 'rssi_center'),
				band('x', 'initial_score'), band('x', 'rssi_val'), band('x', 'low_rssi_val'), band('x', 'rssi_weight'), band('x', 'rssi_center')
			);
		});
	});

	var startBtn = E('button', { 'class': 'cbi-button cbi-button-action' }, _('Start service'));
	startBtn.addEventListener('click', function() {
		var self = startBtn, orig = self.textContent;
		self.disabled = true;
		self.textContent = _('Starting…');
		var done = function() { self.disabled = false; self.textContent = orig; };
		callSteerService().then(function(res) {
			done();
			if (res && res.running) notify(_('The steering service has started.'), 'success');
			else notify(_('The service is still not up; run "logread -e dawn" over SSH to see why.'), 'danger');
			return refresh();
		}, function(e) {
			done();
			notify(e.message || _('Start failed'), 'danger');
		});
	});

	/* Banners, worst first. */
	var banners = [];
	if (!s.installed) {
		banners.push(E('div', { 'class': 'nm-banner bad' }, [
			E('strong', {}, _('DAWN is not installed')),
			E('div', {}, _('This package declares dawn as a dependency: if this device was built before that dependency was added, install it with opkg install dawn (umdns comes with it) and then reload the page. Until then 802.11k/v/r still work; there is simply nothing to make the "time to change AP" decision.'))
		]));
	} else if (s.enabled && s.reason) {
		banners.push(E('div', { 'class': 'nm-banner bad' }, [
			E('strong', {}, _('Steering is not working properly')),
			E('div', {}, s.reason)
		]));
	}

	var r = statusData.roaming || {};
	if (s.enabled && r.ap_total > 0 && r.ap_ready < r.ap_total) {
		banners.push(E('div', { 'class': 'nm-banner' }, [
			E('strong', {}, _('%d SSIDs still do not have k/v enabled').format(r.ap_total - r.ap_ready)),
			E('div', {}, _('DAWN hands a client off with the 802.11v BSS Transition, and 802.11k tells it whom to hand the client to. Turn on K and V for these SSIDs in the table above.'))
		]));
	}

	if (s.has_6g_radio) {
		var six = bandConf('802_11a_6g');
		if (!six.present) {
			banners.push(E('div', { 'class': 'nm-banner info' }, [
				E('strong', {}, _('This device has a 6 GHz radio, but the current DAWN does not recognise the 6G section')),
				E('div', {}, _('DAWN without the 6 GHz patch only has two parameter sets, 802_11g and 802_11a, so 6G is treated as the last group (802_11a) and shares its scores. The 6 GHz row below can still be filled in and synced, but only firmware carrying the patches/feeds/packages/net/dawn patch actually reads it.'))
			]));
		}
	}

	return E('div', { 'class': 'nm-section' }, [
		E('div', { 'class': 'nm-title' }, [
			E('span', {}, _('Steering (DAWN)')),
			E('span', { 'class': 'nm-muted' }, s.installed ? (enabled ? _('Enabled') : _('Disabled')) : _('DAWN not installed'))
		]),
		E('p', { 'class': 'nm-subtitle' }, _('802.11k/v/r only publish information: an AP can answer "who else is there", and a client can ask on its own. DAWN does the other half — it aggregates what every device sees for each client, scores the candidate APs, and then has the current AP hand the client to a better one with a BSS Transition. With two devices on the same SSID and nothing making that decision, a client sticks to its original AP until the signal dies completely.')),
		E('div', { 'class': 'nm-form' }, [
			E('div', { 'class': 'nm-field wide' }, [ inlineField(_('Enable steering (DAWN)'), enabledBox) ]),
			field(_('Discovery method'), netSel),
			field(_('Broadcast address'), bcastInput),
			field(_('Broadcast port'), bportInput),
			field(_('TCP port'), tportInput),
			field(_('DAWN key'), keySel),
			E('div', { 'class': 'nm-field wide' }, [ inlineField(_('Encrypt traffic between neighbouring devices (all devices must match)'), useEncBox) ])
		]),
		E('div', { 'class': 'nm-subtitle', 'style': 'margin-top:var(--ds-sp-4)' }, _('When to hand a client off')),
		E('div', { 'class': 'nm-form' }, [
			field(_('Kicking policy'), kickSel),
			field(_('Score difference threshold'), ktInput),
			field(_('Consecutive evaluation count'), nkInput),
			field(_('Minimum probe count'), pcInput),
			field(_('Channel utilization averaging period'), capInput),
			field(_('Send neighbour reports'), nrSel)
		]),
		E('div', { 'class': 'nm-subtitle', 'style': 'margin-top:var(--ds-sp-4)' }, _('Scoring per band')),
		E('table', { 'class': 'nm-table' }, [
			E('thead', {}, E('tr', {}, [
				E('th', {}, _('Band')),
				E('th', { 'title': _('Base score of an AP on this band: 2.4G is usually a little lower than 5G/6G') }, _('Base score')),
				E('th', { 'title': _('Add points when the signal is better than this') }, _('Good signal threshold')),
				E('th', { 'title': _('Subtract points when the signal is worse than this') }, _('Bad signal threshold')),
				E('th', { 'title': _('Points added or subtracted per 1 dB away from the center; once it is non-zero the two fields below are de-emphasised and the score mostly tracks signal strength') }, _('RSSI weight')),
				E('th', { 'title': _('The signal center the score is built around') }, _('RSSI center'))
			])),
			E('tbody', {}, bandRows)
		]),
		banners,
		E('p', { 'class': 'nm-hint' }, _('To make the score track signal strength exactly (the approach the DAWN docs recommend): set the "RSSI weight" of all three bands to 2 and the "RSSI center" to -20, and set the good/bad signal scores and the channel-utilization adjustments to 0 for that band. The score then reduces to base score + (RSSI − center) × weight, so even with two APs 20 dB apart the better one wins instead of both falling into the same bucket and scoring the same.')),
		E('div', { 'class': 'nm-actions' }, [ saveBtn, startBtn ]),
		E('p', { 'class': 'nm-hint' }, _('This configuration is carried to the peer together with /etc/config/wireless by "Wired sync", so both devices score identically; when the peer runs older firmware this step is skipped automatically. After SAVE, DAWN restarts once: an in-flight AP-change decision is interrupted but clients do not drop.')),
		E('p', { 'class': 'nm-hint' }, _('See who is connected to each AP and who is in whose range:'), E('a', { 'href': L.url('admin/network/meshconf/steering') }, _('APs and clients')))
	]);
}

return view.extend({
	render: function() {
		injectCSS();

		pageBody = E('div');

		var refreshBtn = E('button', { 'class': 'cbi-button cbi-button-action' }, _('Refresh'));
		refreshBtn.addEventListener('click', function() {
			var self = refreshBtn, orig = self.textContent;
			self.disabled = true;
			self.textContent = _('Refreshing…');
			var done = function() { self.disabled = false; self.textContent = orig; };
			refresh().then(done, done);
		});

		updatedEl = E('span', { 'class': 'nm-muted' }, '');

		var root = E('div', { 'class': 'meshconf-page' }, [
			E('h2', {}, _('Mesh networking')),
			E('p', { 'class': 'nm-lede' }, _('Networking between two XR1710G units: wireless uses native 802.11s; wired uses discovery on the same LAN plus /etc/config/wireless sync.')),
			E('div', { 'class': 'nm-actions', 'style': 'margin-top:0;border-top:0;padding-top:0' }, [ refreshBtn, updatedEl ]),
			pageBody
		]);

		refresh();

		return root;
	}
});
