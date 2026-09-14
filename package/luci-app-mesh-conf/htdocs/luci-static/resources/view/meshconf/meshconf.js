'use strict';
'require poll';
'require rpc';
'require ui';
'require view';

var callGetStatus = rpc.declare({
	object: 'luci.meshconf',
	method: 'getStatus'
});

var callDiscoverMesh = rpc.declare({
	object: 'luci.meshconf',
	method: 'discoverMesh'
});

var callApplyMesh = rpc.declare({
	object: 'luci.meshconf',
	method: 'applyMesh',
	params: [ 'backhaul', 'role', 'wired', 'wireless', 'wired_iface', 'wired_mode',
		'mesh_radio', 'mesh_id', 'mesh_key', 'gateway', 'gw_bandwidth', 'gw_sel_class',
		'slave_ip_suffix', 'unified', 'unified_ssid', 'unified_encryption', 'unified_key',
		'ap_sync', 'ap_configs', 'channels' ]
});

var callRestoreBackup = rpc.declare({
	object: 'luci.meshconf',
	method: 'restoreBackup',
	params: [ 'name' ]
});

var callGenerateChildConfig = rpc.declare({
	object: 'luci.meshconf',
	method: 'generateChildConfig',
	params: [ 'ip_suffix' ]
});

var css = '\
.meshconf-page{--nm-bg:#fff;--nm-border:#d8dee4;--nm-soft:#f6f8fa;--nm-text:#1f2328;--nm-muted:#5c6773;--nm-blue:#0969da;--nm-green:#1a7f37;--nm-orange:#bc4c00;--nm-red:#cf222e;--nm-purple:#8250df;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;font-size:13px;line-height:1.55;color:var(--nm-text);letter-spacing:0}\
.meshconf-page h2{margin:0 0 4px;font-size:21px;line-height:1.3;font-weight:650;color:var(--nm-text)}\
.meshconf-page .nm-lede{margin:0 0 14px;color:var(--nm-muted);font-size:12.5px}\
.nm-section{margin:0 0 18px;padding:16px 18px;border:1px solid var(--nm-border);border-radius:12px;background:var(--nm-bg);box-shadow:0 1px 2px rgba(16,24,40,.04)}\
.nm-title{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0;font-size:15px;font-weight:650}\
.nm-subtitle{margin:3px 0 14px;color:var(--nm-muted);font-size:12px}\
.nm-muted{color:var(--nm-muted)}\
.nm-hint{margin:10px 0 0;font-size:12px;line-height:1.6;color:var(--nm-muted)}\
.nm-alert{margin:10px 0 0;padding:9px 12px;border-radius:8px;border:1px solid rgba(188,76,0,.35);background:rgba(188,76,0,.07);color:var(--nm-orange);font-size:12px;line-height:1.6}\
.nm-alert.ok{border-color:rgba(26,127,55,.35);background:rgba(26,127,55,.08);color:var(--nm-green)}\
\
.nm-status{display:flex;gap:8px;flex-wrap:wrap;align-items:center}\
.nm-pill{display:inline-flex;align-items:center;height:25px;padding:0 10px;border-radius:999px;border:1px solid var(--nm-border);background:var(--nm-soft);font-size:12px;font-weight:600;white-space:nowrap}\
.nm-pill.ok{color:var(--nm-green);border-color:rgba(26,127,55,.35);background:rgba(26,127,55,.08)}\
.nm-pill.warn{color:var(--nm-orange);border-color:rgba(188,76,0,.35);background:rgba(188,76,0,.08)}\
.nm-pill.info{color:var(--nm-blue);border-color:rgba(9,105,218,.35);background:rgba(9,105,218,.08)}\
.nm-pill .dot{width:6px;height:6px;border-radius:50%;background:currentColor;margin-right:6px;opacity:.85}\
.nm-infogrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(148px,1fr));gap:8px;margin-top:12px}\
.nm-info{border:1px solid var(--nm-border);border-radius:10px;background:var(--nm-soft);padding:9px 11px;min-width:0}\
.nm-info-label{font-size:11px;font-weight:650;color:var(--nm-muted);margin-bottom:3px}\
.nm-info-value{font-size:14px;font-weight:650;word-break:break-all;line-height:1.35}\
.nm-info-sub{font-size:11px;color:var(--nm-muted);margin-top:2px;word-break:break-all}\
\
.nm-group{margin-top:18px;padding-top:16px;border-top:1px dashed var(--nm-border)}\
.nm-group.first{border-top:0;padding-top:0;margin-top:4px}\
.nm-group-head{display:flex;align-items:center;gap:8px;margin:0 0 3px;font-size:13px;font-weight:650}\
.nm-step{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:var(--nm-blue);color:#fff;font-size:11px;font-weight:700;flex:0 0 auto}\
.nm-group-desc{margin:0 0 12px;padding-left:28px;color:var(--nm-muted);font-size:12px;line-height:1.6}\
.nm-group.hidden{display:none}\
.nm-field.hidden{display:none}\
\
.nm-choices{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}\
.nm-choices.two{grid-template-columns:repeat(2,minmax(0,1fr))}\
.nm-choice{position:relative;display:block;border:1px solid var(--nm-border);border-radius:10px;background:var(--nm-soft);padding:12px 14px;cursor:pointer;transition:border-color .18s,box-shadow .18s,background .18s}\
.nm-choice input{position:absolute;width:1px;height:1px;opacity:0;margin:0}\
.nm-choice:hover{border-color:rgba(9,105,218,.45)}\
.nm-choice.active{border-color:var(--nm-blue);background:rgba(9,105,218,.06);box-shadow:0 0 0 1px var(--nm-blue)}\
.nm-choice:focus-within{outline:2px solid var(--nm-blue);outline-offset:2px}\
.nm-choice-title{display:flex;align-items:center;gap:7px;font-size:13px;font-weight:650}\
.nm-choice-desc{display:block;margin-top:4px;color:var(--nm-muted);font-size:12px;line-height:1.5}\
.nm-choice-dot{width:8px;height:8px;border-radius:50%;background:var(--nm-border);flex:0 0 auto}\
.nm-choice.active .nm-choice-dot{background:var(--nm-blue)}\
\
.nm-form{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:12px}\
.nm-field{display:flex;flex-direction:column;gap:5px;min-width:0}\
.nm-field>label{font-size:12px;font-weight:600;color:var(--nm-muted)}\
.nm-field input,.nm-field select{min-height:36px;border:1px solid var(--nm-border);border-radius:8px;padding:7px 10px;background:var(--nm-bg);color:var(--nm-text);font-size:13px;box-sizing:border-box;width:100%;font-family:inherit}\
.nm-field input:focus,.nm-field select:focus{outline:none;border-color:var(--nm-blue);box-shadow:0 0 0 3px rgba(9,105,218,.15)}\
.nm-field input:disabled,.nm-field select:disabled{opacity:.55;cursor:not-allowed}\
.nm-field.wide{grid-column:1 / -1}\
.nm-field.inline{flex-direction:row;align-items:center;gap:8px;min-height:36px}\
.nm-field.inline>label{font-size:13px;font-weight:400;color:var(--nm-text);cursor:pointer;display:inline-flex;align-items:center;gap:7px}\
.nm-field.inline input[type=checkbox]{width:15px;height:15px;min-height:0;margin:0}\
.nm-radio-line{display:flex;gap:18px;flex-wrap:wrap;min-height:36px;align-items:center}\
.nm-radio-line label{display:inline-flex;gap:7px;align-items:center;font-weight:400;color:var(--nm-text);font-size:13px;cursor:pointer}\
.nm-radio-line input{margin:0}\
\
.nm-ap-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:10px;margin-top:12px}\
.nm-ap-radio{border:1px solid var(--nm-border);border-radius:10px;padding:11px 12px;background:var(--nm-soft)}\
.nm-ap-radio-title{display:flex;align-items:center;justify-content:space-between;gap:8px;font-weight:650;font-size:13px}\
.nm-band{display:inline-flex;align-items:center;height:19px;padding:0 7px;border-radius:5px;font-size:11px;font-weight:650;background:rgba(9,105,218,.10);color:var(--nm-blue)}\
.nm-ap-radio-meta{margin:2px 0 9px;color:var(--nm-muted);font-size:11.5px;word-break:break-all}\
.nm-ap-radio .nm-form{margin-top:0;grid-template-columns:1fr 1fr;gap:9px}\
.nm-ap-radio .nm-field.wide{grid-column:1 / -1}\
\
.nm-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;padding-top:14px;border-top:1px solid var(--nm-border)}\
.nm-actions .cbi-button{min-height:36px}\
\
.nm-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(116px,1fr));gap:8px;margin:12px 0}\
.nm-stat{border:1px solid var(--nm-border);border-radius:10px;background:var(--nm-soft);padding:9px 12px}\
.nm-stat-value{font-size:19px;font-weight:700;line-height:1.25;color:var(--nm-text)}\
.nm-stat-label{font-size:11px;color:var(--nm-muted)}\
.nm-topology{width:100%;border:1px solid var(--nm-border);border-radius:12px;background:var(--nm-soft);overflow:hidden}\
.nm-topology svg{display:block;width:100%;height:auto}\
.nm-legend{display:flex;gap:16px;flex-wrap:wrap;align-items:center;margin:10px 0 0;font-size:12px;color:var(--nm-muted)}\
.nm-legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}\
.nm-legend .k-local{background:#0969da}.nm-legend .k-mesh{background:rgba(130,80,223,.55)}.nm-legend .k-lan{background:rgba(26,127,55,.55)}\
.nm-empty{padding:38px 20px;text-align:center;color:var(--nm-muted)}\
.nm-empty strong{display:block;color:var(--nm-text);font-size:14px;margin-bottom:5px}\
.nm-config-preview{width:100%;min-height:180px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:12px;white-space:pre;box-sizing:border-box}\
\
.nm-t-card{fill:var(--nm-bg);stroke:var(--nm-border);stroke-width:1}\
.nm-t-card.local{fill:rgba(9,105,218,.10);stroke:#0969da;stroke-width:2}\
.nm-t-card.mesh{fill:rgba(130,80,223,.09);stroke:rgba(130,80,223,.5)}\
.nm-t-card.lan{fill:rgba(26,127,55,.09);stroke:rgba(26,127,55,.45)}\
.nm-t-title{font-size:12px;font-weight:650;fill:var(--nm-text)}\
.nm-t-sub{font-size:10px;fill:var(--nm-muted)}\
.nm-t-tag{font-size:9px;font-weight:650;fill:var(--nm-muted)}\
.nm-t-col{font-size:11px;font-weight:650;fill:var(--nm-muted);letter-spacing:.04em}\
.nm-t-link{fill:none;stroke:rgba(26,127,55,.55);stroke-width:2}\
.nm-t-link.mesh{stroke:rgba(130,80,223,.6);stroke-width:2;stroke-dasharray:6 4}\
.nm-t-lq{font-size:9px;fill:var(--nm-muted)}\
@media(max-width:900px){.nm-choices{grid-template-columns:1fr}.nm-choices.two{grid-template-columns:1fr}}\
@media(max-width:760px){.nm-form,.nm-ap-radio .nm-form{grid-template-columns:1fr}}\
';

var darkVars = ':root{--nm-bg:#1e1f22;--nm-border:#3a3d42;--nm-soft:#26282d;--nm-text:#f0f3f6;--nm-muted:#a7adb5;--nm-blue:#4d9cf6;--nm-green:#4ac26b;--nm-orange:#e3934a;--nm-red:#f47067;--nm-purple:#a98bf5}.nm-t-card.local{fill:rgba(77,156,246,.16);stroke:#4d9cf6}.nm-t-card.mesh{fill:rgba(169,139,245,.14);stroke:rgba(169,139,245,.6)}.nm-t-card.lan{fill:rgba(74,194,107,.13);stroke:rgba(74,194,107,.5)}.nm-t-link{stroke:rgba(74,194,107,.6)}.nm-t-link.mesh{stroke:rgba(169,139,245,.7)}';

function injectCSS() {
	var el = document.getElementById('meshconf-css');
	if (!el) {
		el = document.createElement('style');
		el.id = 'meshconf-css';
		document.head.appendChild(el);
	}
	var bg = window.getComputedStyle(document.body).backgroundColor;
	var nums = bg.match(/\d+/g) || [];
	var dark = nums.length >= 3 && ((+nums[0] * 299 + +nums[1] * 587 + +nums[2] * 114) / 1000) < 128;
	el.textContent = css + (dark ? darkVars : '');
}

function textLimit(s, n) {
	s = String(s || '');
	return s.length > n ? s.substr(0, n - 1) + '…' : s;
}

function esc(s) {
	return String(s == null ? '' : s)
		.replace(/&/g, '&amp;').replace(/</g, '&lt;')
		.replace(/>/g, '&gt;').replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

var BAND_LABELS = {
	'2g': _('2.4G radio'),
	'5g': _('5G radio'),
	'6g': _('6G radio')
};

function bandLabel(band) {
	return BAND_LABELS[band] || null;
}

function radioTitle(config) {
	return bandLabel(config.band) || config.radio || _('无线 radio');
}

// Channels are the only per-radio value that stays different when the
// coverage (SSID/encryption/key) is unified across the mesh.
function channelList(band, current) {
	var list;
	if (band === '2g')
		list = [ '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13' ];
	else if (band === '5g')
		list = [ '36', '40', '44', '48', '52', '56', '60', '64', '100', '104', '108', '112',
			'116', '120', '124', '128', '132', '136', '140', '144', '149', '153', '157', '161', '165' ];
	else if (band === '6g')
		list = [ '1', '5', '9', '13', '17', '21', '25', '29', '33', '37', '41', '45', '49', '53',
			'57', '61', '65', '69', '73', '77', '81', '85', '89', '93', '97', '101', '105', '109',
			'113', '117', '121', '125', '129', '133', '137', '141', '145', '149', '153', '157',
			'161', '165', '169', '173', '177', '181', '185', '189', '193', '197', '201', '205',
			'209', '213', '217', '221', '225', '229', '233' ];
	else
		list = [];
	if (current && current !== 'auto' && list.indexOf(current) < 0)
		list.unshift(current);
	return list;
}

var ENCRYPTIONS = [
	[ 'sae-mixed', _('WPA2/WPA3 混合') ],
	[ 'psk2', _('WPA2-PSK') ],
	[ 'sae', _('WPA3-SAE') ],
	[ 'psk-mixed', _('WPA/WPA2 混合') ],
	[ 'owe', _('OWE 增强开放') ],
	[ 'none', _('开放网络（无密码）') ]
];

function encryptionSelect(value) {
	var sel = E('select', {}, ENCRYPTIONS.map(function(item) {
		return E('option', { 'value': item[0] }, item[1]);
	}));
	sel.value = value || 'sae-mixed';
	return sel;
}

function dedupeNodes(nodes) {
	var map = {}, out = [];
	(nodes || []).forEach(function(n) {
		if (!n || !n.id || map[n.id]) return;
		map[n.id] = n;
		out.push(n);
	});
	return out;
}

function nodeMeta(n) {
	if (n.kind === 'mesh')
		return [ n.iface, n.tq ? 'TQ ' + n.tq : '', n.last_seen ].filter(function(x) { return x; }).join(' · ');
	return n.ip || n.mac || '';
}

var ROLE_LABELS = {
	master: _('主节点'),
	slave: _('从节点'),
	peer: _('对等节点')
};

function roleLabel(role) {
	return ROLE_LABELS[role] || _('对等节点');
}

function modeLabel(mode) {
	return ({
		ap: _('AP 模式'),
		dhcp: _('DHCP 路由'),
		pppoe: _('PPPoE 拨号')
	})[mode] || _('未知模式');
}

function infoCard(label, value, sub) {
	return E('div', { 'class': 'nm-info' }, [
		E('div', { 'class': 'nm-info-label' }, label),
		E('div', { 'class': 'nm-info-value' }, value || '—'),
		sub ? E('div', { 'class': 'nm-info-sub' }, sub) : ''
	]);
}

function statusPills(status) {
	var mesh = status.mesh || {};
	var deps = status.deps || {};
	var depOk = deps.batctl && deps.iw && deps.wpad;
	var isAp = status.mode === 'ap';

	var wanPillClass, wanPillText;
	if (isAp) {
		wanPillClass = '';
		wanPillText = _('WAN 已桥接');
	} else if (status.wan_up) {
		wanPillClass = 'ok';
		wanPillText = _('WAN 已连接');
	} else if (status.wan_proto) {
		wanPillClass = 'warn';
		wanPillText = _('WAN 未连接');
	} else {
		wanPillClass = '';
		wanPillText = _('WAN 未配置');
	}

	var meshPillClass, meshPillText;
	if (!mesh.enabled) {
		meshPillClass = '';
		meshPillText = _('Mesh 未启用');
	} else if (mesh.up) {
		meshPillClass = 'ok';
		meshPillText = _('Mesh 运行中');
	} else {
		meshPillClass = 'warn';
		meshPillText = _('Mesh 未运行');
	}

	var cards = [
		infoCard(_('设备型号'), status.board),
		infoCard(_('主机名'), status.hostname),
		infoCard(_('管理地址 (LAN)'), status.lan_ip || _('获取中…')),
		isAp
			? infoCard(_('WAN 地址'), _('桥接至 br-lan'))
			: infoCard(_('WAN 地址'), status.wan_ip || _('未获取'))
	];
	if (mesh.enabled) {
		cards.push(infoCard(_('节点角色'), roleLabel(mesh.role)));
		cards.push(infoCard(_('Mesh ID'), mesh.mesh_id || '-',
			[ mesh.wired ? _('有线回程') : '', mesh.wireless_count ? _('无线回程 x%d').format(mesh.wireless_count) : '' ]
				.filter(function(x) { return x; }).join(' + ')));
	}

	return E('div', {}, [
		E('div', { 'class': 'nm-status' }, [
			E('span', { 'class': 'nm-pill' }, modeLabel(status.mode)),
			E('span', { 'class': 'nm-pill ' + wanPillClass }, wanPillText),
			E('span', { 'class': 'nm-pill ' + meshPillClass }, [ E('span', { 'class': 'dot' }), meshPillText ]),
			E('span', { 'class': 'nm-pill ' + (depOk ? 'ok' : 'warn') }, depOk ? _('依赖正常') : _('依赖缺失'))
		]),
		E('div', { 'class': 'nm-infogrid' }, cards)
	]);
}

return view.extend({
	load: function() {
		return Promise.all([
			callGetStatus().catch(function(e) { return { error: e.message || String(e) }; }),
			callDiscoverMesh().catch(function() { return { nodes: [], links: [] }; })
		]);
	},

	render: function(data) {
		injectCSS();
		this.status = data[0] || {};
		this.discovery = data[1] || {};

		var status = this.status;
		var root = E('div', { 'class': 'cbi-map meshconf-page' }, [
			E('h2', {}, _('Mesh 组网')),
			E('p', { 'class': 'nm-lede' }, _('选择组网方式与主从角色，统一无线覆盖，再一键下发；同一组网内所有节点保持一致即可自动成网。'))
		]);

		if (status.error)
			root.appendChild(E('p', { 'class': 'alert-message error' }, _('读取状态失败: %s').format(status.error)));

		this.statusBox = E('div', {}, statusPills(status));
		root.appendChild(E('div', { 'class': 'nm-section' }, [
			E('div', { 'class': 'nm-title' }, [
				E('span', {}, _('当前状态')),
				E('button', { 'class': 'cbi-button cbi-button-neutral', 'click': ui.createHandlerFn(this, 'refresh') }, _('刷新'))
			]),
			this.statusBox
		]));

		root.appendChild(this.renderMeshSection(status));
		root.appendChild(this.renderTopologySection(status));

		this.updateMeshState();
		this.updateTopology();

		poll.add(L.bind(function() {
			return Promise.all([ callGetStatus(), callDiscoverMesh() ]).then(L.bind(function(res) {
				this.status = res[0] || {};
				this.discovery = res[1] || {};
				if (this.statusBox) {
					this.statusBox.innerHTML = '';
					this.statusBox.appendChild(statusPills(this.status));
				}
				this.updateTopology();
			}, this));
		}, this), 10);

		return root;
	},

	renderMeshSection: function(status) {
		var mesh = status.mesh || {};
		var apConfigs = mesh.ap_configs || [];
		var mode = status.mode || 'unknown';

		var initialBackhaul;
		if (!mesh.enabled)
			initialBackhaul = 'wired';
		else if (mesh.wired && (mesh.wireless_count || 0) > 0)
			initialBackhaul = 'hybrid';
		else if (mesh.wired)
			initialBackhaul = 'wired';
		else
			initialBackhaul = 'wireless';

		var initialRole = mesh.enabled ? (mesh.role || 'peer') : 'master';

		var initialWiredMode = mesh.wired
			? (mesh.wired_mode === 'dedicated' ? 'dedicated' : 'bridge')
			: (mode === 'ap' ? 'bridge' : 'dedicated');

		/* ---- step 1: backhaul ---- */
		this.backhaulCards = [
			this.backhaulCard('wired', _('有线组网'), _('网线互联，全屋同一子网；稳定性最好，推荐作为主回程。'), initialBackhaul === 'wired'),
			this.backhaulCard('wireless', _('无线组网'), _('802.11s 无线回程，免布线；需要选择用于回程的 5G / 6G radio。'), initialBackhaul === 'wireless'),
			this.backhaulCard('hybrid', _('有线 + 无线'), _('两条链路同时存在，batman-adv 按链路质量自动优选，互为备份。'), initialBackhaul === 'hybrid')
		];

		/* ---- step 2: master / slave role ---- */
		this.roleCards = [
			this.roleCard('master', _('主节点'), _('负责 DHCP 与上网出口，全网只有一台；作为 batman-adv 网关服务器。'), initialRole === 'master'),
			this.roleCard('slave', _('从节点'), _('关闭本机 DHCP，与主节点同子网，仅做桥接与覆盖；作为网关客户端。'), initialRole === 'slave'),
			this.roleCard('peer', _('对等节点'), _('不发布网关，所有节点自行决定出口；适合纯桥接或已另有网关的场景。'), initialRole === 'peer')
		];

		var currentSuffix = parseInt(String(status.lan_ip || '').split('.').pop(), 10);
		var childSuffix = currentSuffix >= 2 && currentSuffix < 254 ? currentSuffix + 1 : 252;

		this.slaveIpInput = E('input', { 'type': 'number', 'min': '2', 'max': '254', 'value': String(childSuffix) });
		this.gwBandwidthInput = E('input', {
			'type': 'text',
			'value': mesh.gw_bandwidth || '',
			'placeholder': _('自动读取物理速率')
		});
		this.gwSelClassInput = E('input', { 'type': 'number', 'min': '1', 'max': '255', 'value': mesh.gw_sel_class || '20' });

		/* ---- step 3: wired transport ---- */
		this.wiredModeBridgeRadio = E('input', {
			'type': 'radio', 'name': 'nm-wired-mode', 'value': 'bridge',
			'checked': initialWiredMode === 'bridge' ? 'checked' : null
		});
		this.wiredModeDedicatedRadio = E('input', {
			'type': 'radio', 'name': 'nm-wired-mode', 'value': 'dedicated',
			'checked': initialWiredMode === 'dedicated' ? 'checked' : null
		});
		this.wiredIfaceInput = E('select', {}, [
			E('option', { 'value': '' }, _('请选择端口'))
		].concat((status.netdevs || []).map(function(iface) {
			return E('option', { 'value': iface }, iface);
		})));
		this.wiredIfaceInput.value = (mesh.wired && mesh.wired_mode === 'dedicated') ? (mesh.wired_iface || '') : '';

		/* ---- step 4: wireless backhaul ---- */
		var backhaulCandidates = apConfigs.filter(function(c) { return c.band === '5g' || c.band === '6g'; });
		if (!backhaulCandidates.length) backhaulCandidates = apConfigs;
		this.meshRadioInput = E('select', {}, backhaulCandidates.map(function(c) {
			return E('option', { 'value': c.radio }, [ radioTitle(c), ' (', c.radio, ')' ]);
		}));
		if (!backhaulCandidates.length)
			this.meshRadioInput.appendChild(E('option', { 'value': '' }, _('未发现 5G / 6G radio')));
		var selectedRadio = (mesh.mesh_radios || [])[0] || '';
		if (!selectedRadio && backhaulCandidates.length) {
			var fiveG = backhaulCandidates.filter(function(c) { return c.band === '5g'; })[0];
			selectedRadio = (fiveG || backhaulCandidates[0]).radio;
		}
		this.meshRadioInput.value = selectedRadio;

		this.meshIdInput = E('input', { 'type': 'text', 'value': mesh.mesh_id || 'XR1710G-MESH', 'maxlength': '32' });
		this.meshKeyInput = E('input', { 'type': 'password', 'value': '', 'autocomplete': 'new-password', 'placeholder': _('8-63 位，全网一致') });

		/* ---- step 5: unified coverage ---- */
		var firstCfg = apConfigs[0] || {};
		this.unifiedInput = E('input', { 'type': 'checkbox' });
		this.unifiedInput.checked = mesh.enabled ? this.isUnified(apConfigs) : true;
		this.unifiedSsidInput = E('input', { 'type': 'text', 'maxlength': '32', 'value': firstCfg.ssid || '', 'placeholder': _('例如 XR1710G') });
		this.unifiedEncryptionInput = encryptionSelect(firstCfg.encryption || 'sae-mixed');
		this.unifiedKeyInput = E('input', { 'type': 'password', 'autocomplete': 'new-password' });
		this.unifiedKeyInput.placeholder = apConfigs.some(function(c) { return c.has_key; })
			? _('留空沿用当前密钥')
			: _('请输入 8-63 位密钥');

		this.apConfigInputs = apConfigs.map(L.bind(function(config) {
			return this.buildApCard(config, mesh);
		}, this));

		this.apSyncInput = E('input', { 'type': 'checkbox' });
		this.apSyncInput.checked = mesh.ap_sync !== false || !mesh.enabled;

		/* ---- assemble ---- */
		this.wiredGroup = E('div', { 'class': 'nm-group' }, [
			E('div', { 'class': 'nm-group-head' }, [ E('span', { 'class': 'nm-step' }, '3'), _('有线回程链路') ]),
			E('p', { 'class': 'nm-group-desc' }, _('AP 模式下可直接复用 br-lan 全部网口作为 batman-adv 回程；也可指定一个端口专跑 Mesh。')),
			E('div', { 'class': 'nm-field wide' }, [
				E('div', { 'class': 'nm-radio-line' }, [
					E('label', {}, [ this.wiredModeBridgeRadio, E('span', {}, _('全部 LAN 口（br-lan 透传，AP 模式推荐）')) ]),
					E('label', {}, [ this.wiredModeDedicatedRadio, E('span', {}, _('指定独立回程端口（该端口只跑 Mesh）')) ])
				])
			]),
			E('div', { 'class': 'nm-form' }, [
				E('div', { 'class': 'nm-field' }, [ E('label', {}, _('有线 Mesh 独立端口')), this.wiredIfaceInput ])
			])
		]);

		this.wirelessGroup = E('div', { 'class': 'nm-group' }, [
			E('div', { 'class': 'nm-group-head' }, [ E('span', { 'class': 'nm-step' }, '3'), _('无线回程链路') ]),
			E('p', { 'class': 'nm-group-desc' }, _('选定一个 radio 承载 802.11s + SAE 回程。该 radio 仍会继续广播普通 AP，Mesh ID 与密钥需全网一致。')),
			E('div', { 'class': 'nm-form' }, [
				E('div', { 'class': 'nm-field' }, [ E('label', {}, _('回程 radio')), this.meshRadioInput ]),
				E('div', { 'class': 'nm-field' }, [ E('label', {}, _('Mesh ID')), this.meshIdInput ]),
				E('div', { 'class': 'nm-field' }, [ E('label', {}, _('Mesh 密钥')), this.meshKeyInput ])
			])
		]);

		this.roleFields = E('div', { 'class': 'nm-form' }, [
			E('div', { 'class': 'nm-field' }, [ E('label', {}, _('从节点 IP 尾号')), this.slaveIpInput ]),
			E('div', { 'class': 'nm-field' }, [ E('label', {}, _('网关带宽 kbit/s')), this.gwBandwidthInput ]),
			E('div', { 'class': 'nm-field' }, [ E('label', {}, _('网关选择等级')), this.gwSelClassInput ])
		]);

		this.roleGroup = E('div', { 'class': 'nm-group' }, [
			E('div', { 'class': 'nm-group-head' }, [ E('span', { 'class': 'nm-step' }, '2'), _('主从关系') ]),
			E('p', { 'class': 'nm-group-desc' }, _('同一子网下只允许一个主节点分配地址；从节点关闭 DHCP，由主节点统一分配。')),
			E('div', { 'class': 'nm-choices' }, this.roleCards.map(function(c) { return c.card; })),
			this.roleFields
		]);

		this.unifiedForm = E('div', { 'class': 'nm-form' }, [
			E('div', { 'class': 'nm-field' }, [ E('label', {}, _('统一 SSID')), this.unifiedSsidInput ]),
			E('div', { 'class': 'nm-field' }, [ E('label', {}, _('加密方式')), this.unifiedEncryptionInput ]),
			E('div', { 'class': 'nm-field' }, [ E('label', {}, _('无线密码')), this.unifiedKeyInput ])
		]);

		this.apCards = E('div', { 'class': 'nm-ap-grid' }, this.apConfigInputs.length
			? this.apConfigInputs.map(function(c) { return c.view; })
			: [ E('div', { 'class': 'nm-empty' }, _('未发现无线 radio')) ]);

		this.coverageGroup = E('div', { 'class': 'nm-group' }, [
			E('div', { 'class': 'nm-group-head' }, [ E('span', { 'class': 'nm-step' }, '4'), _('无线覆盖（SSID）') ]),
			E('p', { 'class': 'nm-group-desc' }, _('组网漫游要求各 radio 的 SSID、加密方式与密码完全一致，仅频道号按频段各自错开。')),
			E('div', { 'class': 'nm-field inline' }, [
				E('label', {}, [ this.unifiedInput, _('统一所有 radio 的 SSID / 加密 / 密码（仅频道号不同）') ])
			]),
			this.unifiedForm,
			this.apCards,
			E('div', { 'class': 'nm-field inline', 'style': 'margin-top:12px' }, [
				E('label', {}, [ this.apSyncInput, _('下发上述无线配置（取消则保留各 radio 当前 AP 设置）') ])
			])
		]);

		/* ---- wiring ---- */
		this.roleCards.forEach(L.bind(function(c) {
			c.input.addEventListener('change', L.bind(this.updateMeshState, this));
		}, this));
		[ this.wiredModeBridgeRadio, this.wiredModeDedicatedRadio ].forEach(L.bind(function(el) {
			el.addEventListener('change', L.bind(this.updateMeshState, this));
		}, this));
		this.unifiedInput.addEventListener('change', L.bind(this.updateMeshState, this));
		this.apSyncInput.addEventListener('change', L.bind(this.updateMeshState, this));
		this.unifiedEncryptionInput.addEventListener('change', L.bind(this.updateMeshState, this));

		var section = E('div', { 'class': 'nm-section' }, [
			E('div', { 'class': 'nm-title' }, _('Mesh 组网')),
			E('p', { 'class': 'nm-subtitle' }, _('按“组网方式 → 主从关系 → 回程链路 → 无线覆盖”四步配置，所有节点保持一致即可自动成网。')),
			E('div', { 'class': 'nm-group first' }, [
				E('div', { 'class': 'nm-group-head' }, [ E('span', { 'class': 'nm-step' }, '1'), _('组网方式') ]),
				E('p', { 'class': 'nm-group-desc' }, _('有线与无线可同时启用：batman-adv 会按链路质量自动优选，已开启 bridge loop avoidance 防止环路。')),
				E('div', { 'class': 'nm-choices' }, this.backhaulCards.map(function(c) { return c.card; }))
			]),
			this.roleGroup,
			this.wiredGroup,
			this.wirelessGroup,
			this.coverageGroup,
			E('div', { 'class': 'nm-actions' }, [
				E('button', { 'class': 'cbi-button cbi-button-apply', 'click': ui.createHandlerFn(this, 'confirmMesh') }, _('应用 Mesh')),
				E('button', { 'class': 'cbi-button cbi-button-neutral', 'click': ui.createHandlerFn(this, 'generateChildConfig') }, _('生成子节点配置')),
				E('button', { 'class': 'cbi-button cbi-button-negative', 'click': ui.createHandlerFn(this, 'confirmDisableMesh') }, _('关闭 Mesh')),
				(status.backups || []).length ? E('button', {
					'class': 'cbi-button cbi-button-neutral',
					'click': ui.createHandlerFn(this, 'restoreLatestBackup')
				}, _('恢复最近备份')) : ''
			])
		]);

		return section;
	},

	renderTopologySection: function(status) {
		this.topoStats = E('div', { 'class': 'nm-stats' }, []);
		this.topologyBox = E('div', {}, []);

		return E('div', { 'class': 'nm-section' }, [
			E('div', { 'class': 'nm-title' }, [
				E('span', {}, _('Mesh / 局域网拓扑')),
				E('span', { 'class': 'nm-muted' }, _('自动发现 DHCP 租约与 BATMAN 邻居'))
			]),
			E('p', { 'class': 'nm-subtitle' }, _('每 10 秒自动刷新一次；虚线为无线 Mesh 回程，实线为有线 / 局域网接入。')),
			this.topoStats,
			this.topologyBox,
			E('div', { 'class': 'nm-legend' }, [
				E('span', {}, [ E('i', { 'class': 'k-local' }), _('本机') ]),
				E('span', {}, [ E('i', { 'class': 'k-mesh' }), _('Mesh 邻居') ]),
				E('span', {}, [ E('i', { 'class': 'k-lan' }), _('局域网终端') ])
			])
		]);
	},

	isUnified: function(configs) {
		if (!configs.length) return true;
		var first = configs[0];
		return configs.every(function(c) {
			return c.ssid === first.ssid && (c.encryption || 'none') === (first.encryption || 'none');
		});
	},

	backhaulCard: function(value, title, desc, active) {
		var self = this;
		var input = E('input', { 'type': 'radio', 'name': 'nm-backhaul', 'value': value });
		input.checked = !!active;
		var card = E('label', { 'class': 'nm-choice' + (active ? ' active' : '') }, [
			input,
			E('span', { 'class': 'nm-choice-title' }, [ E('span', { 'class': 'nm-choice-dot' }), title ]),
			E('span', { 'class': 'nm-choice-desc' }, desc)
		]);
		input.addEventListener('change', function() {
			self.syncBackhaulCards();
			self.updateMeshState();
		});
		return { value: value, input: input, card: card };
	},

	roleCard: function(value, title, desc, active) {
		var input = E('input', { 'type': 'radio', 'name': 'nm-role', 'value': value });
		input.checked = !!active;
		var card = E('label', { 'class': 'nm-choice' + (active ? ' active' : '') }, [
			input,
			E('span', { 'class': 'nm-choice-title' }, [ E('span', { 'class': 'nm-choice-dot' }), title ]),
			E('span', { 'class': 'nm-choice-desc' }, desc)
		]);
		return { value: value, input: input, card: card };
	},

	syncBackhaulCards: function() {
		this.backhaulCards.forEach(function(c) {
			c.card.classList.toggle('active', c.input.checked);
		});
	},

	syncRoleCards: function() {
		this.roleCards.forEach(function(c) {
			c.card.classList.toggle('active', c.input.checked);
		});
	},

	buildApCard: function(config, mesh) {
		var enabled = E('input', { 'type': 'checkbox' });
		var ssid = E('input', { 'type': 'text', 'value': config.ssid || '', 'maxlength': '32', 'placeholder': _('例如 XR1710G-5G') });
		var encryption = encryptionSelect(config.encryption);
		var key = E('input', { 'type': 'password', 'autocomplete': 'new-password' });
		key.placeholder = config.has_key ? _('留空沿用当前密钥') : _('请输入 AP 密钥');
		var channel = E('select', {}, [ E('option', { 'value': 'auto' }, _('自动')) ].concat(
			channelList(config.band, config.channel).map(function(ch) {
				return E('option', { 'value': ch }, ch);
			})));
		channel.value = config.channel || 'auto';
		enabled.checked = config.enabled !== false;

		var bandTag = bandLabel(config.band);

		var view = E('div', { 'class': 'nm-ap-radio' }, [
			E('div', { 'class': 'nm-ap-radio-title' }, [
				E('span', {}, radioTitle(config)),
				bandTag ? E('span', { 'class': 'nm-band' }, bandTag.replace(' radio', '')) : ''
			]),
			E('div', { 'class': 'nm-ap-radio-meta' }, [
				config.radio || '',
				config.htmode ? _(' / %s').format(config.htmode) : ''
			]),
			E('div', { 'class': 'nm-form' }, [
				E('div', { 'class': 'nm-field wide' }, [ E('label', {}, _('频道号')), channel ]),
				E('div', { 'class': 'nm-field' }, [ E('label', {}, _('SSID')), ssid ]),
				E('div', { 'class': 'nm-field' }, [ E('label', {}, _('加密')), encryption ]),
				E('div', { 'class': 'nm-field wide' }, [ E('label', {}, _('密码')), key ])
			]),
			E('div', { 'class': 'nm-field inline', 'style': 'margin-top:9px' }, [
				E('label', {}, [ enabled, _('启用该 radio 的 AP') ])
			])
		]);

		return {
			radio: config.radio,
			enabled: enabled,
			ssid: ssid,
			encryption: encryption,
			key: key,
			channel: channel,
			view: view
		};
	},

	backhaul: function() {
		// set by disableMesh() for the single call that tears the mesh down
		if (this.meshOff) return 'off';
		var picked = this.backhaulCards.filter(function(c) { return c.input.checked; })[0];
		return picked ? picked.value : 'wired';
	},

	role: function() {
		var picked = this.roleCards.filter(function(c) { return c.input.checked; })[0];
		return picked ? picked.value : 'peer';
	},

	wiredMode: function() {
		return this.wiredModeDedicatedRadio.checked ? 'dedicated' : 'bridge';
	},

	updateMeshState: function() {
		if (!this.backhaulCards) return;
		this.syncBackhaulCards();
		this.syncRoleCards();

		var backhaul = this.backhaul();
		var role = this.role();
		var useWired = backhaul === 'wired' || backhaul === 'hybrid';
		var useWireless = backhaul === 'wireless' || backhaul === 'hybrid';
		var unified = this.unifiedInput.checked;

		this.wiredGroup.classList.toggle('hidden', !useWired);
		this.wirelessGroup.classList.toggle('hidden', !useWireless);
		this.wiredModeBridgeRadio.disabled = !useWired;
		this.wiredModeDedicatedRadio.disabled = !useWired;
		this.wiredIfaceInput.disabled = !(useWired && this.wiredModeDedicatedRadio.checked);
		this.meshRadioInput.disabled = !useWireless;
		this.meshIdInput.disabled = !useWireless;
		this.meshKeyInput.disabled = !useWireless;

		// role specific fields
		this.slaveIpInput.parentNode.parentNode.classList.toggle('hidden', role !== 'slave');
		this.gwBandwidthInput.parentNode.parentNode.classList.toggle('hidden', role !== 'master');
		this.gwSelClassInput.parentNode.parentNode.classList.toggle('hidden', role !== 'slave');

		this.unifiedSsidInput.disabled = !unified;
		this.unifiedEncryptionInput.disabled = !unified;
		this.unifiedKeyInput.disabled = !unified || this.unifiedEncryptionInput.value === 'none';
		// unified coverage always writes the radios, so the switch is implied
		if (unified) {
			this.apSyncInput.checked = true;
			this.apSyncInput.disabled = true;
		} else {
			this.apSyncInput.disabled = false;
		}

		this.apConfigInputs.forEach(function(config) {
			var showPerRadio = !unified && config.enabled.checked;
			config.ssid.disabled = !showPerRadio;
			config.encryption.disabled = !showPerRadio;
			config.key.disabled = !showPerRadio || config.encryption.value === 'none';
			config.channel.disabled = false;
		});

		this.apCards.style.opacity = unified ? '0.55' : '1';
	},

	collectChannels: function() {
		return this.apConfigInputs.map(function(config) {
			return { radio: config.radio, channel: config.channel.value };
		});
	},

	confirmMesh: function() {
		var backhaul = this.backhaul();
		var role = this.role();
		var wiredMode = this.wiredMode();
		var useWired = backhaul === 'wired' || backhaul === 'hybrid';
		var useWireless = backhaul === 'wireless' || backhaul === 'hybrid';

		if (useWired && wiredMode === 'dedicated' && !this.wiredIfaceInput.value) {
			ui.addNotification(null, E('p', _('请选择一个独立回程端口，或把有线回程方式改为“全部 LAN 口”。')));
			return;
		}
		if (useWireless && !this.meshRadioInput.value) {
			ui.addNotification(null, E('p', _('无线组网需要选择一个用于回程的 5G / 6G radio。')));
			return;
		}
		if (useWireless && !this.meshIdInput.value.trim()) {
			ui.addNotification(null, E('p', _('请填写 Mesh ID，同一组网内所有节点必须一致。')));
			return;
		}
		if (this.unifiedInput.checked && !this.unifiedSsidInput.value.trim()) {
			ui.addNotification(null, E('p', _('请填写统一 SSID。')));
			return;
		}

		var wiredText;
		if (!useWired)
			wiredText = _('有线回程：未启用。');
		else if (wiredMode === 'bridge')
			wiredText = _('有线回程：br-lan 网桥透传，任意网口接入对端节点即可成网，bridge loop avoidance 防止环路。');
		else
			wiredText = _('有线回程：端口 %s 将从 br-lan 移出并交给 bat0 独占，请确认它不是当前唯一管理入口。').format(this.wiredIfaceInput.value);

		var wirelessText = useWireless
			? _('无线回程：在 %s 上创建 802.11s + SAE 链路，Mesh ID 为 %s。').format(this.meshRadioInput.value, this.meshIdInput.value.trim())
			: _('无线回程：未启用。');

		var roleText = ({
			master: _('本机作为主节点：保留 DHCP 与上网出口，batman-adv 网关角色为 server。'),
			slave: _('本机作为从节点：关闭本机 DHCP，与主节点同网段，由主节点统一分配地址，网关角色为 client。'),
			peer: _('本机作为对等节点：不发布网关，各节点自行决定出口。')
		})[role];

		return ui.showModal(_('确认应用 Mesh 组网'), [
			E('p', {}, _('将修改 batman-adv、wireless、network、dhcp 配置并重载网络；配置会自动备份。')),
			E('div', { 'class': 'nm-alert' }, roleText),
			E('p', {}, wiredText),
			E('p', {}, wirelessText),
			E('p', {}, this.unifiedInput.checked
				? _('无线覆盖：所有 radio 统一为 SSID「%s」，加密与密码一致，仅频道号保持各自独立。').format(this.unifiedSsidInput.value.trim())
				: _('无线覆盖：按各 radio 的独立设置下发；若未勾选下发则保留当前 AP 配置。')),
			E('div', { 'class': 'right' }, [
				E('button', { 'class': 'cbi-button cbi-button-apply', 'click': ui.createHandlerFn(this, 'applyMesh') }, _('确认应用')),
				' ',
				E('button', { 'class': 'cbi-button cbi-button-neutral', 'click': ui.hideModal }, _('取消'))
			])
		]);
	},

	confirmDisableMesh: function() {
		return ui.showModal(_('确认关闭 Mesh'), [
			E('p', {}, _('这会删除 bat0、有线 Mesh hardif 和无线 802.11s 回程配置，然后重载网络。')),
			E('p', { 'class': 'nm-muted' }, _('各 radio 当前的 AP 配置不会被修改。')),
			E('div', { 'class': 'right' }, [
				E('button', { 'class': 'cbi-button cbi-button-negative', 'click': ui.createHandlerFn(this, 'disableMesh') }, _('确认关闭')),
				' ',
				E('button', { 'class': 'cbi-button cbi-button-neutral', 'click': ui.hideModal }, _('取消'))
			])
		]);
	},

	applyMesh: function(syncAp) {
		ui.hideModal();
		var backhaul = this.backhaul();
		this.meshOff = false;
		var role = this.role();
		var wiredMode = this.wiredMode();
		var useWired = backhaul === 'wired' || backhaul === 'hybrid';
		var useWireless = backhaul === 'wireless' || backhaul === 'hybrid';
		var unified = this.unifiedInput.checked;

		return callApplyMesh(
			backhaul,
			role,
			useWired ? '1' : '0',
			useWireless ? '1' : '0',
			(useWired && wiredMode === 'dedicated') ? (this.wiredIfaceInput.value || '') : '__bridge__',
			useWired ? wiredMode : '',
			useWireless ? (this.meshRadioInput.value || '') : '',
			(this.meshIdInput.value || '').trim(),
			this.meshKeyInput.value || '',
			'', /* gateway: derived from role on the device */
			(this.gwBandwidthInput.value || '').trim(),
			(this.gwSelClassInput.value || '').trim(),
			(this.slaveIpInput.value || '').trim(),
			unified ? '1' : '0',
			(this.unifiedSsidInput.value || '').trim(),
			this.unifiedEncryptionInput.value || 'sae-mixed',
			this.unifiedKeyInput.value || '',
			syncAp === false ? '0' : (this.apSyncInput.checked ? '1' : '0'),
			JSON.stringify(this.apConfigInputs.map(function(config) {
				return {
					radio: config.radio,
					enabled: config.enabled.checked,
					ssid: (config.ssid.value || '').trim(),
					encryption: config.encryption.value || 'sae-mixed',
					key: config.key.value || ''
				};
			})),
			JSON.stringify(this.collectChannels())
		).then(L.bind(this.afterApply, this)).catch(function(e) {
			ui.addNotification(null, E('p', e.message || _('应用失败')));
		});
	},

	disableMesh: function() {
		ui.hideModal();
		this.meshOff = true;
		this.apSyncInput.checked = false;
		this.updateMeshState();
		return this.applyMesh(false);
	},

	afterApply: function(res) {
		if (!res || !res.success) {
			ui.addNotification(null, E('p', (res && res.error) || _('应用失败')));
			return;
		}
		var msg;
		if (!res.backhaul)
			msg = _('已应用，配置备份在: %s').format(res.backup || '-');
		else if (res.backhaul === 'off')
			msg = _('Mesh 已关闭，配置备份在: %s').format(res.backup || '-');
		else
			msg = _('已应用（%s / %s），配置备份在: %s').format(res.backhaul, roleLabel(res.role || 'peer'), res.backup || '-');
		ui.addNotification(null, E('p', msg));
		return this.refresh();
	},

	generateChildConfig: function() {
		return callGenerateChildConfig((this.slaveIpInput.value || '').trim()).then(L.bind(function(res) {
			if (!res || !res.success) {
				ui.addNotification(null, E('p', (res && res.error) || _('生成失败')));
				return;
			}
			this.showGeneratedConfig(res);
		}, this)).catch(function(e) {
			ui.addNotification(null, E('p', e.message || _('生成失败')));
		});
	},

	showGeneratedConfig: function(res) {
		var files = res.files || {};
		var chunks = [ 'network', 'wireless', 'dhcp', 'firewall' ].map(function(name) {
			return '### /etc/config/' + name + '\n' + (files[name] || '');
		}).join('\n\n');

		return ui.showModal(_('子节点配置已生成'), [
			E('p', {}, _('把它导入从节点即可复用主节点的 Mesh ID、SSID 与加密方式。设备临时目录: %s').format(res.path || '-')),
			E('textarea', { 'class': 'nm-config-preview', 'readonly': 'readonly', 'wrap': 'off' }, chunks),
			E('div', { 'class': 'right' }, [
				E('button', { 'class': 'cbi-button cbi-button-neutral', 'click': ui.hideModal }, _('关闭'))
			])
		]);
	},

	restoreLatestBackup: function() {
		var backups = this.status && this.status.backups || [];
		if (!backups.length) {
			ui.addNotification(null, E('p', _('没有可恢复的备份')));
			return;
		}
		var name = backups[0];
		return ui.showModal(_('恢复最近备份'), [
			E('p', {}, _('将恢复 network、dhcp、wireless 与 firewall 配置，并重新加载网络服务。备份时间: %s').format(name)),
			E('div', { 'class': 'right' }, [
				E('button', {
					'class': 'cbi-button cbi-button-negative',
					'click': function() {
						ui.hideModal();
						callRestoreBackup(name).then(L.bind(function(res) {
							if (!res || !res.success) {
								ui.addNotification(null, E('p', (res && res.error) || _('恢复失败')));
								return;
							}
							ui.addNotification(null, E('p', _('备份已恢复，网络服务正在重新加载。')));
							return this.refresh();
						}, this)).catch(function(e) {
							ui.addNotification(null, E('p', e.message || _('恢复失败')));
						});
					}
				}, _('确认恢复')),
				' ',
				E('button', { 'class': 'cbi-button cbi-button-neutral', 'click': ui.hideModal }, _('取消'))
			])
		]);
	},

	refresh: function() {
		return Promise.all([ callGetStatus(), callDiscoverMesh() ]).then(L.bind(function(res) {
			this.status = res[0] || {};
			this.discovery = res[1] || {};
			if (this.statusBox) {
				this.statusBox.innerHTML = '';
				this.statusBox.appendChild(statusPills(this.status));
			}
			this.updateTopology();
		}, this));
	},

	updateTopology: function() {
		var discovery = this.discovery || {};
		var nodes = dedupeNodes(discovery.nodes || []);
		var meshCount = 0, lanCount = 0;
		nodes.forEach(function(n) {
			if (n.kind === 'mesh') meshCount++;
			else if (n.kind === 'lan') lanCount++;
		});

		if (this.topoStats) {
			this.topoStats.innerHTML = '';
			this.topoStats.appendChild(E('div', { 'class': 'nm-stat' }, [
				E('div', { 'class': 'nm-stat-value' }, String(nodes.length)),
				E('div', { 'class': 'nm-stat-label' }, _('节点总数'))
			]));
			this.topoStats.appendChild(E('div', { 'class': 'nm-stat' }, [
				E('div', { 'class': 'nm-stat-value' }, String(meshCount)),
				E('div', { 'class': 'nm-stat-label' }, _('Mesh 邻居'))
			]));
			this.topoStats.appendChild(E('div', { 'class': 'nm-stat' }, [
				E('div', { 'class': 'nm-stat-value' }, String(lanCount)),
				E('div', { 'class': 'nm-stat-label' }, _('局域网终端'))
			]));
			var mesh = (this.status && this.status.mesh) || {};
			this.topoStats.appendChild(E('div', { 'class': 'nm-stat' }, [
				E('div', { 'class': 'nm-stat-value' }, mesh.up ? _('已连通') : (mesh.enabled ? _('未连通') : _('未启用'))),
				E('div', { 'class': 'nm-stat-label' }, _('Mesh 状态'))
			]));
		}

		if (!this.topologyBox) return;
		var meshState = (this.status && this.status.mesh) || {};
		var roleText = meshState.enabled ? roleLabel(meshState.role) : _('Mesh 未启用');
		this.topologyBox.innerHTML = '';
		this.topologyBox.appendChild(renderTopologyHTML(discovery, roleText));
	}
});

// Kept separate from renderTopology() above: the SVG markup is generated as a
// string (LuCI's E() cannot namespace SVG children) and injected once.
function renderTopologyHTML(discovery, roleText) {
	var nodes = dedupeNodes(discovery && discovery.nodes || []);
	var local = null, meshNodes = [], lanNodes = [];

	nodes.forEach(function(n) {
		if (n.kind === 'local') { if (!local) local = n; return; }
		if (n.kind === 'mesh') meshNodes.push(n); else lanNodes.push(n);
	});

	var wrap = document.createElement('div');

	if (!local || (!meshNodes.length && !lanNodes.length)) {
		wrap.className = 'nm-topology';
		wrap.innerHTML = '<div class="nm-empty"><strong>' + esc(local ? _('本机已就绪，暂未发现邻居') : _('尚未发现任何节点')) + '</strong>' +
			esc(local ? _('把其它节点接入同一子网或同一 Mesh ID 后，拓扑会自动出现在这里。')
				: _('启用 Mesh 并让设备接入后，这里会画出回程链路与局域网终端。')) + '</div>';
		return wrap;
	}

	var W = 900, PAD = 20, CARD_W = 178, CARD_H = 46, GAP = 10, HEAD = 24, MAX_ROWS = 7;
	var cols = [];
	if (meshNodes.length) cols.push({ key: 'mesh', title: _('Mesh 回程邻居'), items: meshNodes });
	if (lanNodes.length) cols.push({ key: 'lan', title: _('局域网终端'), items: lanNodes });

	var rows = 0;
	cols.forEach(function(c) {
		rows = Math.max(rows, Math.min(c.items.length, MAX_ROWS) + (c.items.length > MAX_ROWS ? 1 : 0));
	});
	var bodyH = rows * CARD_H + (rows - 1) * GAP + (cols.some(function(c) { return c.items.length > MAX_ROWS; }) ? 16 : 0);
	var H = PAD * 2 + HEAD + bodyH;
	var localW = 176, localX = PAD;
	var areaX = localX + localW + 76;
	var colW = Math.floor((W - areaX - PAD) / cols.length);
	var localY = PAD + HEAD + (rows * CARD_H + (rows - 1) * GAP - CARD_H) / 2;

	var svg = [ '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(_('网络拓扑')) + '">' ];

	cols.forEach(function(c, ci) {
		var x = areaX + ci * colW;
		var w = colW - 18;
		svg.push('<text class="nm-t-col" x="' + x + '" y="' + (PAD + 9) + '">' + esc(c.title) + '</text>');
		c.items.slice(0, MAX_ROWS).forEach(function(n, i) {
			var y = PAD + HEAD + i * (CARD_H + GAP);
			var x1 = localX + localW, y1 = localY + CARD_H / 2;
			var x2 = x, y2 = y + CARD_H / 2;
			var dx = Math.max(26, (x2 - x1) * 0.45);
			svg.push('<path class="nm-t-link ' + (c.key === 'mesh' ? 'mesh' : '') + '" d="M' + x1 + ' ' + y1 +
				' C' + (x1 + dx) + ' ' + y1 + ', ' + (x2 - dx) + ' ' + y2 + ', ' + x2 + ' ' + y2 + '"/>');
			if (c.key === 'mesh' && n.tq)
				svg.push('<text class="nm-t-lq" x="' + ((x1 + x2) / 2) + '" y="' + ((y1 + y2) / 2 - 5) +
					'" text-anchor="middle">' + esc('TQ ' + n.tq) + '</text>');
			svg.push(nodeCard(x, y, w, CARD_H, c.key,
				n.label || n.ip || n.mac || '', nodeMeta(n), c.key === 'mesh' ? _('Mesh') : _('LAN')));
		});
		if (c.items.length > MAX_ROWS)
			svg.push('<text class="nm-t-sub" x="' + x + '" y="' +
				(PAD + HEAD + MAX_ROWS * (CARD_H + GAP) + 2) + '">' +
				esc(_('…另有 %d 个节点').format(c.items.length - MAX_ROWS)) + '</text>');
	});

	svg.push(nodeCard(localX, localY, localW, CARD_H, 'local',
		local.label || _('本机'), [ roleText, local.ip ].filter(function(x) { return x; }).join(' · '), _('本机')));
	svg.push('</svg>');

	wrap.className = 'nm-topology';
	wrap.innerHTML = svg.join('');
	return wrap;
}

function nodeCard(x, y, w, h, kind, title, sub, tag) {
	return '<g>' +
		'<rect class="nm-t-card ' + kind + '" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="9"/>' +
		'<text class="nm-t-title" x="' + (x + 12) + '" y="' + (y + 20) + '">' + esc(textLimit(title, 22)) + '</text>' +
		'<text class="nm-t-sub" x="' + (x + 12) + '" y="' + (y + 35) + '">' + esc(textLimit(sub, 28)) + '</text>' +
		(tag ? '<text class="nm-t-tag" x="' + (x + w - 10) + '" y="' + (y + 15) + '" text-anchor="end">' + esc(tag) + '</text>' : '') +
		'</g>';
}
