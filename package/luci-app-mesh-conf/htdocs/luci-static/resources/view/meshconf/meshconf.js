'use strict';
'require rpc';
'require ui';
'require view';

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
 * it entirely. Themes that ship a dark mode also set
 * :root[data-darkmode="true"], which is the only extra hook the accents need.
 *
 * Sizes are em-based, never px: the LuCI theme sets the base font size, and
 * only a relative scale keeps the page in step with it.
 * ------------------------------------------------------------------------- */
var css = [
	'.meshconf-page{--ds-surface:var(--background-color-high,#fff);--ds-surface-sunken:var(--background-color-medium,#f6f8fa);--ds-border:var(--border-color-low,#d8dee4);--ds-text:var(--text-color-high,#1f2328);--ds-text-muted:var(--text-color-low,#5c6773);--ds-primary:var(--primary-color-high,#0969da);--ds-ok:#1a7f37;--ds-ok-tint:rgba(26,127,55,.08);--ds-ok-line:rgba(26,127,55,.35);--ds-warn:#bc4c00;--ds-warn-tint:rgba(188,76,0,.08);--ds-warn-line:rgba(188,76,0,.35);--ds-error:#cf222e;--ds-error-tint:rgba(207,34,46,.08);--ds-error-line:rgba(207,34,46,.40);--ds-info:#0969da;--ds-info-tint:rgba(9,105,218,.08);--ds-info-line:rgba(9,105,218,.35);--ds-focus-ring:rgba(9,105,218,.32);--ds-r-sm:4px;--ds-r-md:6px;--ds-r-lg:8px;--ds-r-pill:999px;--ds-sp-1:.25em;--ds-sp-2:.5em;--ds-sp-3:.75em;--ds-sp-4:1em;--ds-sp-5:1.5em;--ds-fs-xs:.8em;--ds-fs-sm:.88em;--ds-fs-base:1em;--ds-fs-lg:1.1em;--ds-fs-2xl:1.6em;--ds-shadow-1:0 1px 2px rgba(16,24,40,.04);line-height:1.5;color:var(--ds-text)}',
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

/* Dark accents. LuCI themes that ship a dark mode set this attribute on :root;
 * surfaces and text already follow the theme variables, so only the semantic
 * accents have to be re-tuned for a dark background - and the tints get a
 * higher alpha, since a .08 wash is invisible on a dark surface. */
var darkVars = ':root[data-darkmode="true"]{--ds-ok:#4ac26b;--ds-ok-tint:rgba(74,194,107,.18);--ds-ok-line:rgba(74,194,107,.45);--ds-warn:#e3934a;--ds-warn-tint:rgba(227,147,74,.18);--ds-warn-line:rgba(227,147,74,.45);--ds-error:#f47067;--ds-error-tint:rgba(244,112,103,.18);--ds-error-line:rgba(244,112,103,.5);--ds-info:#4d9cf6;--ds-info-tint:rgba(77,156,246,.18);--ds-info-line:rgba(77,156,246,.45);--ds-focus-ring:rgba(77,156,246,.45);--ds-shadow-1:none}';

function injectCSS() {
	var el = document.getElementById('meshconf-css');
	if (!el) {
		el = document.createElement('style');
		el.id = 'meshconf-css';
		document.head.appendChild(el);
	}
	el.textContent = css + '\n' + darkVars;
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

function refresh() {
	if (!pageBody) return Promise.resolve();
	pageBody.innerHTML = '';
	pageBody.appendChild(E('div', { 'class': 'nm-empty' }, '加载中…'));

	return callStatus().then(function(res) {
		statusData = res || {};
		render();
	}, function(e) {
		pageBody.innerHTML = '';
		pageBody.appendChild(E('div', { 'class': 'nm-banner bad' }, [
			E('strong', {}, '无法读取状态'),
			E('div', {}, e.message || 'rpcd 插件没有响应（luci.meshconf）。')
		]));
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
			notify((res && res.error) || '操作失败', 'danger');
			return res;
		}
		notify('已应用，无线配置正在重新加载（约几秒）。', 'success');
		return refresh();
	}, function(e) {
		done();
		notify(e.message || '操作失败', 'danger');
	});
}

/* ---------------------------------------------------------------------------
 * status
 * ------------------------------------------------------------------------- */
function meshPill() {
	var m = statusData.mesh || {};
	if (!m.enabled) return pill('', '无线 Mesh：未启用');
	if (m.state === 'up') return pill('ok', '无线 Mesh：已连接 ' + (m.peers || 0) + ' 个对端');
	if (m.state === 'waiting') return pill('warn', '无线 Mesh：等待对端');
	return pill('warn', '无线 Mesh：已启用但未起来');
}

function roamPill() {
	var r = statusData.roaming || {};
	if (!r.enabled) return pill('', '漫游：未开启');
	return pill('ok', '漫游：已开启 ' + (r.ap_ready || 0) + '/' + (r.ap_total || 0) + ' 个 SSID');
}

function syncPill() {
	var s = statusData.sync || {};
	if (!s.enabled) return pill('', '有线同步：未启用');
	if (!s.running) return pill('warn', '有线同步：服务未运行');
	return pill('ok', '有线同步：端口 ' + (s.port || '7761'));
}

function renderStatus() {
	var l = statusData.local || {};
	var m = statusData.mesh || {};
	var s = statusData.sync || {};

	return E('div', { 'class': 'nm-section' }, [
		E('div', { 'class': 'nm-title' }, [
			E('span', {}, '本机状态'),
			E('span', { 'class': 'nm-muted' }, l.hostname || '')
		]),
		E('div', { 'class': 'nm-status', 'style': 'margin-top:var(--ds-sp-3)' }, [
			meshPill(), roamPill(), syncPill(), steerPill()
		]),
		E('div', { 'class': 'nm-infogrid' }, [
			info('型号', l.model || '-'),
			info('LAN IP', l.lan_ip || '-', l.mac || ''),
			info('无线配置版本', E('span', { 'class': 'nm-mono' }, l.wifirev || '-'), '用于比较两台设备是否一致'),
			info('Mesh 接口', m.iface || '-', m.state === 'up' ? '对端 ' + m.peers + ' 个' : (m.enabled ? '尚未建立链路' : '未配置')),
			info('同步密钥', s.key_set ? '已设置' : '未设置', s.last_peer ? '最近对端 ' + s.last_peer : '尚未同步过')
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
		var label = r.name + '（' + (r.band || '?') + '，信道 ' + (r.channel || 'auto') + '）';
		if (!r.mesh_capable) label += ' · 不支持 mesh';
		return { value: r.name, label: label, disabled: !r.mesh_capable };
	}), m.radio || (radios.length ? radios[0].name : ''));

	var meshIdInput = textInput(m.mesh_id || 'XR1710G-Mesh');
	var encSel = select([
		{ value: 'sae', label: 'SAE（推荐）' },
		{ value: 'none', label: '不加密' }
	], m.encryption || 'sae', function() {
		keyField.style.display = (encSel.value === 'sae') ? '' : 'none';
	});
	// `m.key_set ? '' : ''` was a typo: both branches were empty, so the box
	// was always blank and every save stored an empty key. Send the value.
	var keyInput = textInput(m.key || '', { type: 'password', placeholder: m.key_set ? '留空表示不修改' : '至少 8 位' });
	var keyField = field('Mesh 密钥', keyInput);
	keyField.style.display = (m.encryption === 'none') ? 'none' : '';

	var bridgeBox = checkbox(m.bridge_lan !== false, function() {});

	function toggleMeshFields(on) {
		[ radioSel, meshIdInput, encSel, keyInput, bridgeBox ].forEach(function(el) {
			el.disabled = !on;
		});
	}
	toggleMeshFields(!!m.enabled);

	var saveBtn = E('button', { 'class': 'cbi-button cbi-button-apply' }, '保存并应用');
	saveBtn.addEventListener('click', function() {
		if (enabledBox.checked && !radioSel.value) {
			notify('请选择一个支持 mesh 的 radio。', 'danger');
			return;
		}
		if (enabledBox.checked && !meshIdInput.value.trim()) {
			notify('请填写 Mesh ID，两台设备必须一致。', 'danger');
			return;
		}
		withButton(saveBtn, '应用中…', function() {
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

	var stopBtn = E('button', { 'class': 'cbi-button cbi-button-reset' }, '停用 802.11s');
	stopBtn.disabled = !m.enabled;
	stopBtn.addEventListener('click', function() {
		withButton(stopBtn, '停用中…', function() {
			return callApplyMesh('0', radioSel.value, meshIdInput.value.trim(), encSel.value, '', '1');
		});
	});

	var warn = '';
	if (!m.wpad_mesh) {
		warn = E('div', { 'class': 'nm-banner' }, [
			E('strong', {}, 'wpad 可能不支持 mesh'),
			E('div', {}, '802.11s 需要带 mesh 支持的 hostapd（wpad-mesh-* 或 wpad-openssl）。当前检测到 /usr/sbin/hostapd 里没有 mesh 相关特性，接口可能起不来。')
		]);
	} else if (m.enabled && m.state === 'down') {
		warn = E('div', { 'class': 'nm-banner' }, [
			E('strong', {}, 'Mesh 接口没有起来'),
			E('div', {}, '请确认两台设备的 Mesh ID、加密方式与密钥完全一致，且所选 radio 已启用。')
		]);
	}

	return E('div', { 'class': 'nm-section' }, [
		E('div', { 'class': 'nm-title' }, [
			E('span', {}, '无线 Mesh（802.11s）'),
			E('span', { 'class': 'nm-muted' }, m.enabled ? (m.state === 'up' ? '已连接' : '已配置') : '未启用')
		]),
		E('p', { 'class': 'nm-subtitle' }, '在选定的 radio 上建立 802.11s mesh 接口并桥接到 LAN，两台设备即处于同一二层网络。原生 802.11s，不需要 batman-adv。'),
		E('div', { 'class': 'nm-form' }, [
			E('div', { 'class': 'nm-field wide' }, [ inlineField('启用 802.11s mesh', enabledBox) ]),
			field('无线电', radioSel),
			field('Mesh ID', meshIdInput),
			field('加密', encSel),
			keyField,
			E('div', { 'class': 'nm-field wide' }, [ inlineField('桥接到 LAN（两台设备同一二层）', bridgeBox) ])
		]),
		warn,
		E('div', { 'class': 'nm-actions' }, [ saveBtn, stopBtn ]),
		E('p', { 'class': 'nm-hint' }, '保存后会重新加载无线，已连接的终端会短暂断开。')
	]);
}

/* ---------------------------------------------------------------------------
 * wired sync
 * ------------------------------------------------------------------------- */
function peerRow(p) {
	var selfRev = (statusData.local || {}).wifirev;
	var same = p.wifirev && p.wifirev === selfRev;
	var chNote = ((statusData.sync || {}).channel_mode !== 'follow')
		? '（信道会自动错开，本已不同的保持不动）' : '（信道会一起被覆盖）';

	var pullBtn = E('button', { 'class': 'cbi-button cbi-button-action' }, '拉取到本地');
	pullBtn.addEventListener('click', function() {
		if (!confirm('将用 ' + p.ip + ' 的无线配置覆盖本机' + chNote + '（当前配置会备份到 /etc/config/wireless.meshconf-bak），继续？')) return;
		withButton(pullBtn, '拉取中…', function() {
			return callSyncPeer(p.ip, 'pull');
		});
	});

	var pushBtn = E('button', { 'class': 'cbi-button cbi-button-apply' }, '推送到对端');
	pushBtn.addEventListener('click', function() {
		if (!confirm('将用本机的无线配置覆盖 ' + p.ip + '（对端按自身设置决定是否错开信道），继续？')) return;
		withButton(pushBtn, '推送中…', function() {
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
			same ? E('span', { 'class': 'nm-state estab', 'style': 'margin-left:var(--ds-sp-1)' }, '与本机一致') : ''
		]),
		E('td', { 'class': 'nowrap' }, p.source === 'manual' ? '手动添加' : '二层发现'),
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
	var keyInput = textInput(s.key || '', { type: 'text', placeholder: s.key_set ? '留空表示不修改' : '所有设备必须使用同一个密钥' });
	var peersInput = textInput(((s.peers) || []).join(', '), { placeholder: '例如 192.168.2.1, 192.168.3.10' });

	var saveBtn = E('button', { 'class': 'cbi-button cbi-button-apply' }, '保存并应用');
	saveBtn.addEventListener('click', function() {
		// Only a pair that has never had a key needs one typed in; on a
		// configured pair the box is prefilled and an empty value means
		// "keep it", which is what the backend does with it too.
		if (enabledBox.checked && !s.key_set && !keyInput.value.trim()) {
			notify('请设置共享密钥：所有设备必须一致，否则无法同步。', 'danger');
			return;
		}
		withButton(saveBtn, '保存中…', function() {
			return callApplySync(enabledBox.checked ? '1' : '0', portInput.value.trim(), keyInput.value.trim(), peersInput.value, keepBox.checked ? 'stagger' : 'follow');
		});
	});

	var scanBtn = E('button', { 'class': 'cbi-button cbi-button-action' }, '扫描局域网设备');
	scanBtn.addEventListener('click', function() {
		var self = scanBtn;
		var orig = self.textContent;
		self.disabled = true;
		self.textContent = '扫描中…';
		callScanPeers().then(function(res) {
			self.disabled = false;
			self.textContent = orig;
			peerData = res || { peers: [] };
			render();
			var n = (peerData.peers || []).length;
			notify(n ? '发现 ' + n + ' 台设备。' : '没有发现其他设备：确认对端已启用有线同步、密钥一致，并接在同一个局域网。', n ? 'success' : 'info');
		}, function(e) {
			self.disabled = false;
			self.textContent = orig;
			notify(e.message || '扫描失败', 'danger');
		});
	});

	[ portInput, keyInput, peersInput, keepBox ].forEach(function(el) { el.disabled = !s.enabled; });
	scanBtn.disabled = !s.enabled;

	var peers = (peerData && peerData.peers) || [];
	var table = E('div', { 'class': 'nm-empty' }, '点击"扫描局域网设备"查找同一局域网内的 XR1710G。');
	if (peers.length) {
		table = E('div', {}, [
			E('table', { 'class': 'nm-table' }, [
				E('thead', {}, E('tr', {}, [
					E('th', {}, '设备'),
					E('th', {}, 'IP'),
					E('th', {}, '配置版本'),
					E('th', {}, '来源'),
					E('th', {}, '同步')
				])),
				E('tbody', {}, peers.map(peerRow))
			])
		]);
	}

	var warn = '';
	if (s.enabled && !s.running) {
		var startBtn = E('button', { 'class': 'cbi-button cbi-button-apply' }, '启动服务');
		startBtn.addEventListener('click', function() {
			var self = startBtn, orig = self.textContent;
			self.disabled = true;
			self.textContent = '启动中…';
			var done = function() {
				self.disabled = false;
				self.textContent = orig;
			};
			callRestartSync().then(function(res) {
				done();
				if (res && res.running) notify('同步服务已启动。', 'success');
				else notify('服务仍然没有起来，请 SSH 执行 logread -e meshconf 查看原因。', 'danger');
				return refresh();
			}, function(e) {
				done();
				notify(e.message || '启动失败', 'danger');
			});
		});
		warn = E('div', { 'class': 'nm-banner bad' }, [
			E('strong', {}, '同步服务没有运行'),
			E('div', {}, s.reason || '服务进程不存在。保存后应自动启动，也可以直接点下面按钮手动拉起。'),
			E('div', { 'style': 'margin-top:.5em' }, [ startBtn ])
		]);
	}

	return E('div', { 'class': 'nm-section' }, [
		E('div', { 'class': 'nm-title' }, [
			E('span', {}, '有线同步（同型号设备）'),
			E('span', { 'class': 'nm-muted' }, s.enabled ? '已启用' : '未启用')
		]),
		E('p', { 'class': 'nm-subtitle' }, '设备已经接在同一个局域网时，用这一台的配置统一其它设备：周期性广播发现邻居，再凭共享密钥同步 /etc/config/wireless（含 SSID、密钥与 k/v/r 参数）。'),
		E('div', { 'class': 'nm-form' }, [
			E('div', { 'class': 'nm-field wide' }, [ inlineField('启用有线同步（同时开启被发现）', enabledBox) ]),
			field('端口', portInput),
			field('共享密钥', keyInput),
			field('手动添加的设备 IP', peersInput, true),
			E('div', { 'class': 'nm-field wide' }, [ inlineField('同步时自动错开信道', keepBox) ]),
			E('p', { 'class': 'nm-hint' }, '若2个AP距离较远，可选择关闭。')
		]),
		warn,
		E('div', { 'class': 'nm-actions' }, [ saveBtn, scanBtn ]),
		table,
		E('p', { 'class': 'nm-hint' }, '同步会把整份 /etc/config/wireless 覆盖到对端；拉取到本地时会自动备份为 /etc/config/wireless.meshconf-bak。不在同一二层（跨三层）的设备请填在"手动添加的设备 IP"里。勾选"自动错开信道"时，收到配置的一端会在同一频段内挪到与对端不重叠的信道（2.4G 走 1/6/11，5G/6G 按信道宽度跳跃）；本已错开的信道保持不动，承载 802.11s 回程的 radio 也保持与对端一致（mesh 要求同信道）。SSID、密钥与 k/v/r 照常同步，漫游不受影响。')
	]);
}

/* ---------------------------------------------------------------------------
 * 802.11k/v/r
 * ------------------------------------------------------------------------- */
var ROAM_LABEL = { k: '802.11k 邻居报告', v: '802.11v BTM 过渡', r: '802.11r 快速漫游' };

function roamToggle(ap, feat) {
	var on = !!ap[feat];
	// FT derives PMK-R0/R1 from the key, so an open network has no R to give.
	var blocked = (feat === 'r' && !ap.ft_ok);
	var title = on ? '点击关闭 ' + ROAM_LABEL[feat] : '点击开启 ' + ROAM_LABEL[feat];
	if (blocked) {
		title = '开放 / OWE 网络无法开启 802.11r';
	} else if (feat === 'r' && ap.wpa3) {
		// WPA3 has no PSK to derive a local PMK-R0 from; say so up front.
		title += '（WPA3 网络：ft_psk_generate_local 会置 0）';
	}
	var b = E('button', {
		'class': 'nm-toggle' + (on ? ' on' : '') + (blocked ? ' dim' : ''),
		'type': 'button',
		'title': title
	}, on ? '开' : '关');

	if (blocked) {
		b.disabled = true;
		return b;
	}
	b.addEventListener('click', function() {
		withButton(b, '…', function() { return callToggleRoam(ap.section, feat, on ? '0' : '1'); });
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
		'placeholder': '自动',
		'title': '4 位十六进制（0-9 / a-f）；清空并回车即恢复按 SSID 自动派生。同一 SSID 的所有接口会一起更新。'
	});

	inp.addEventListener('change', function() {
		var v = inp.value.trim().toLowerCase();
		if (v === current) return;
		inp.disabled = true;
		callSetMd(ap.section, v).then(function(res) {
			if (!res || res.success === false) {
				inp.disabled = false;
				notify((res && res.error) || '保存失败', 'danger');
				return;
			}
			notify(v
				? '移动域已设为 ' + res.md + '（同 SSID 的 ' + res.applied + ' 个接口一起更新）。'
				: '已清空，恢复按 SSID 自动派生（' + res.md + '）。', 'success');
			return refresh();
		}, function(e) {
			inp.disabled = false;
			notify(e.message || '保存失败', 'danger');
		});
	});

	return E('td', { 'class': 'nowrap' }, [
		inp,
		ap.md_set ? '' : E('span', { 'class': 'nm-state', 'style': 'margin-left:var(--ds-sp-1)' }, '自动')
	]);
}

function renderRoaming() {
	var r = statusData.roaming || {};
	var aps = statusData.aps || [];

	var onBtn = E('button', { 'class': 'cbi-button cbi-button-apply' }, '开启 k/v/r');
	onBtn.addEventListener('click', function() {
		withButton(onBtn, '开启中…', function() { return callApplyRoaming('1'); });
	});

	var offBtn = E('button', { 'class': 'cbi-button cbi-button-reset' }, '关闭 k/v/r');
	offBtn.addEventListener('click', function() {
		withButton(offBtn, '关闭中…', function() { return callApplyRoaming('0'); });
	});

	var table = E('div', { 'class': 'nm-empty' }, '当前没有 AP 接口。');
	if (aps.length) {
		table = E('table', { 'class': 'nm-table' }, [
			E('thead', {}, E('tr', {}, [
				E('th', {}, 'SSID'),
				E('th', {}, '频段'),
				E('th', {}, '网络'),
				E('th', { 'title': ROAM_LABEL.k }, 'K'),
				E('th', { 'title': ROAM_LABEL.v }, 'V'),
				E('th', { 'title': ROAM_LABEL.r }, 'R'),
				E('th', {}, '移动域 MD')
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
			E('span', {}, '802.11k/v/r 漫游'),
			E('span', { 'class': 'nm-muted' }, (r.ap_ready || 0) + '/' + (r.ap_total || 0) + ' 个 SSID 已开启')
		]),
		E('p', { 'class': 'nm-subtitle' }, '表格里的 K / V / R 可以逐个 SSID 单独开关。K 写邻居报告与信标报告，V 写 BTM 过渡与 WNM 睡眠，R 写快速漫游（Over the Air、20s 重关联时限、移动域）。mobility domain 由 SSID 派生：同一个 SSID 在所有设备、所有频段上得到相同的 MD，不同 SSID 自动区分。'),
		(function() {
			var w = (aps.filter(function(a) { return a.wpa3; })).length;
			return w ? E('p', { 'class': 'nm-hint' }, '有 ' + w + ' 个接口使用 WPA3 / WPA3 混合加密：这些接口没有 PSK 可供派生本地 PMK-R0，开启 R 时 ft_psk_generate_local 会强制写 0（其余加密方式写 1）。') : '';
		})(),
		E('div', { 'class': 'nm-actions', 'style': 'margin-top:0;border-top:0;padding-top:0' }, [ onBtn, offBtn ]),
		table,
		E('p', { 'class': 'nm-hint' }, '上面两个按钮一次性作用于所有 SSID；表格里的开关只改对应接口。MD 列可直接编辑，填 4 位十六进制（0-9 / a-f），清空即恢复按 SSID 自动派生；改一个接口会把同 SSID 的所有接口一起改掉，否则跨频段漫游时 FT 不会生效。开启后配合"有线同步"把配置推到其它设备，整组网才会有一致的 SSID 与 MD。')
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
	{ pfx: 'g', name: '802_11g', label: '2.4 GHz' },
	{ pfx: 'a', name: '802_11a', label: '5 GHz' },
	{ pfx: 'x', name: '802_11a_6g', label: '6 GHz' }
];

var STEER_KEYS = [ 'initial_score', 'rssi_val', 'low_rssi_val', 'rssi_weight', 'rssi_center' ];

function steerPill() {
	var s = statusData.steering || {};
	if (!s.installed) return pill('', '漫游引导：DAWN 未安装');
	if (!s.enabled) return pill('', '漫游引导：未启用');
	if (!s.running) return pill('warn', '漫游引导：服务未运行');
	if (!s.ubus) return pill('warn', '漫游引导：未连上 ubus');
	return pill('ok', '漫游引导：已启用');
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
		placeholder: s.suggest_bcast || '例如 192.168.1.255'
	});

	var netSel = select([
		{ value: '2', label: 'umdns + TCP（推荐）' },
		{ value: '0', label: 'UDP 广播' },
		{ value: '1', label: 'UDP 组播' },
		{ value: '3', label: 'TCP（不自动发现）' }
	], net.network_option || '2');

	var bportInput = textInput(net.broadcast_port || '1025', { type: 'number' });
	var tportInput = textInput(net.tcp_port || '1026', { type: 'number' });

	/* Every node needs the same key, and typing a hex string on every node is
	 * how they stop being the same. The pair already agrees on one for the
	 * wired sync, so DAWN's is stretched from that instead. */
	var keySel = select([
		{ value: 'derived', label: '派生自“有线同步”共享密钥（推荐）' },
		{ value: 'keep', label: '保持当前密钥不变' }
	], 'derived');
	if (!net.key_set) keySel.value = 'derived';

	var useEncBox = checkbox(net.use_symm_enc === '1', function() {});

	/* Upstream defaults to 3 ("both"), which also kicks on an absolute
	 * threshold - even when there is no better AP to hand the client to. */
	var kickSel = select([
		{ value: '1', label: 'RSSI 比较（推荐）' },
		{ value: '2', label: '绝对 RSSI' },
		{ value: '3', label: '两者都要' },
		{ value: '0', label: '不动客户端' }
	], met.kicking || '1');

	var ktInput = numCell(met.kicking_threshold);
	var nkInput = numCell(met.min_number_to_kick);
	var pcInput = numCell(met.min_probe_count);
	var capInput = numCell(met.chan_util_avg_period);
	var nrSel = select([
		{ value: '0', label: '关闭' },
		{ value: '1', label: '静态（全网 AP）' },
		{ value: '2', label: '动态（按客户端听到的邻居）' }
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

	var saveBtn = E('button', { 'class': 'cbi-button cbi-button-apply' }, '保存并应用');
	saveBtn.addEventListener('click', function() {
		if (enabledBox.checked && keySel.value === 'derived' && !s.sync_key_set) {
			notify('请先在“有线同步”里设置共享密钥：DAWN 的密钥由它派生，否则两台设备无法互相解密。', 'danger');
			return;
		}
		withButton(saveBtn, '保存中…', function() {
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

	var startBtn = E('button', { 'class': 'cbi-button cbi-button-action' }, '启动服务');
	startBtn.addEventListener('click', function() {
		var self = startBtn, orig = self.textContent;
		self.disabled = true;
		self.textContent = '启动中…';
		var done = function() { self.disabled = false; self.textContent = orig; };
		callSteerService().then(function(res) {
			done();
			if (res && res.running) notify('漫游引导服务已启动。', 'success');
			else notify('服务仍然没有起来，请 SSH 执行 logread -e dawn 查看原因。', 'danger');
			return refresh();
		}, function(e) {
			done();
			notify(e.message || '启动失败', 'danger');
		});
	});

	/* Banners, worst first. */
	var banners = [];
	if (!s.installed) {
		banners.push(E('div', { 'class': 'nm-banner bad' }, [
			E('strong', {}, '没有安装 DAWN'),
			E('div', {}, '本包已经把 dawn 声明为依赖：如果这台机器的固件是在加入依赖之前编出来的，请用 opkg install dawn 补装（会带上 umdns），然后刷新页面。在此之前，802.11k/v/r 仍然生效，只是没有人来做"该换 AP 了"这一步决定。')
		]));
	} else if (s.enabled && s.reason) {
		banners.push(E('div', { 'class': 'nm-banner bad' }, [
			E('strong', {}, '漫游引导没有正常工作'),
			E('div', {}, s.reason)
		]));
	}

	var r = statusData.roaming || {};
	if (s.enabled && r.ap_total > 0 && r.ap_ready < r.ap_total) {
		banners.push(E('div', { 'class': 'nm-banner' }, [
			E('strong', {}, '有 ' + (r.ap_total - r.ap_ready) + ' 个 SSID 还没有开启 k/v'),
			E('div', {}, 'DAWN 靠 802.11v 的 BSS Transition 把客户端交出去，802.11k 让它知道该交给谁。请在上面的表格里把这些 SSID 的 K 与 V 打开。')
		]));
	}

	if (s.has_6g_radio) {
		var six = bandConf('802_11a_6g');
		if (!six.present) {
			banners.push(E('div', { 'class': 'nm-banner info' }, [
				E('strong', {}, '这台设备有 6 GHz 射频，但当前 DAWN 不认识 6G 配置段'),
				E('div', {}, '没有打 6 GHz 补丁的 DAWN 只有 802_11g 与 802_11a 两组参数，6G 会被判成最后一组（802_11a）共用同样的分数。下面的 6 GHz 行可以照常填写并参与同步，但只有带 patches/feeds/packages/net/dawn 补丁的固件才会真正读它。')
			]));
		}
	}

	return E('div', { 'class': 'nm-section' }, [
		E('div', { 'class': 'nm-title' }, [
			E('span', {}, '漫游引导（DAWN）'),
			E('span', { 'class': 'nm-muted' }, s.installed ? (enabled ? '已启用' : '未启用') : 'DAWN 未安装')
		]),
		E('p', { 'class': 'nm-subtitle' }, '802.11k/v/r 只是把信息发出去：AP 能回答"还有谁"，客户端也可以自己问。DAWN 负责的是另一半 —— 它汇总所有设备看到的每个客户端，给候选 AP 打分，再让当前 AP 用 BSS Transition 把客户端交到更好的那一个上。两台设备同一个 SSID 而没有任何东西做这个决定，客户端就会一直粘在原 AP 上直到信号彻底断掉。'),
		E('div', { 'class': 'nm-form' }, [
			E('div', { 'class': 'nm-field wide' }, [ inlineField('启用漫游引导（DAWN）', enabledBox) ]),
			field('发现方式', netSel),
			field('广播地址', bcastInput),
			field('广播端口', bportInput),
			field('TCP 端口', tportInput),
			field('DAWN 密钥', keySel),
			E('div', { 'class': 'nm-field wide' }, [ inlineField('加密相邻设备之间的报文（所有设备必须一致）', useEncBox) ])
		]),
		E('div', { 'class': 'nm-subtitle', 'style': 'margin-top:var(--ds-sp-4)' }, '什么时候把客户端交出去'),
		E('div', { 'class': 'nm-form' }, [
			field('踢人策略', kickSel),
			field('分数差阈值', ktInput),
			field('连续判定次数', nkInput),
			field('最少 probe 次数', pcInput),
			field('信道利用率平均周期', capInput),
			field('下发邻居报告', nrSel)
		]),
		E('div', { 'class': 'nm-subtitle', 'style': 'margin-top:var(--ds-sp-4)' }, '每个频段的评分'),
		E('table', { 'class': 'nm-table' }, [
			E('thead', {}, E('tr', {}, [
				E('th', {}, '频段'),
				E('th', { 'title': '该频段 AP 的基础分：2.4G 一般比 5G/6G 低一些' }, '基础分'),
				E('th', { 'title': '信号好于此值时加分' }, '好信号阈值'),
				E('th', { 'title': '信号差于此值时减分' }, '差信号阈值'),
				E('th', { 'title': '每偏离中点 1 dB 的加减分；设为非 0 后下面两项会被弱化，评分主要跟着信号强 弱走' }, 'RSSI 权重'),
				E('th', { 'title': '评分围绕的信号中点' }, 'RSSI 中点')
			])),
			E('tbody', {}, bandRows)
		]),
		banners,
		E('p', { 'class': 'nm-hint' }, '想让评分完全跟着信号强弱走（DAWN 文档推荐的做法）：把三档的"RSSI 权重"设为 2、"RSSI 中点"设为 -20，并把该档的好/差信号加分与信道利用率加减分都设为 0，评分就简化为 基础分 + (RSSI − 中点) × 权重 —— 两台 AP 挨得很近、信号差 20 dB 时也会选出更好的那一个，而不是落进同一个区间得到同样的分数。'),
		E('div', { 'class': 'nm-actions' }, [ saveBtn, startBtn ]),
		E('p', { 'class': 'nm-hint' }, '这里的配置会通过"有线同步"连同 /etc/config/wireless 一起搬到对端，所以两台设备的评分规则也是一致的；对端是旧版本固件时会自动跳过这一步。SAVE 之后 DAWN 会重启一次，正在进行的换 AP 决策会中断但客户端不会掉线。'),
		E('p', { 'class': 'nm-hint' }, '看各 AP 上连了谁、谁在谁的覆盖范围内：' , E('a', { 'href': L.url('admin/network/meshconf/steering') }, 'AP 与客户端'))
	]);
}

return view.extend({
	render: function() {
		injectCSS();

		pageBody = E('div');

		var root = E('div', { 'class': 'meshconf-page' }, [
			E('h2', {}, 'Mesh 组网'),
			E('p', { 'class': 'nm-lede' }, '两台 XR1710G 之间的组网：无线用原生 802.11s；有线则在同一局域网内互相发现，并同步 /etc/config/wireless。'),
			pageBody
		]);

		refresh();

		return root;
	}
});
