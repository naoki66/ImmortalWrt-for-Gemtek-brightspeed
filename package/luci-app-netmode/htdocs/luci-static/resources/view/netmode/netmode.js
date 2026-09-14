'use strict';
'require poll';
'require rpc';
'require ui';
'require view';

var callGetStatus = rpc.declare({
	object: 'luci.netmode',
	method: 'getStatus'
});

var callDiscoverMesh = rpc.declare({
	object: 'luci.netmode',
	method: 'discoverMesh'
});

var callApplyMode = rpc.declare({
	object: 'luci.netmode',
	method: 'applyMode',
	params: [ 'mode', 'username', 'password', 'lan_ip' ]
});

var callApplyMesh = rpc.declare({
	object: 'luci.netmode',
	method: 'applyMesh',
	params: [ 'wired', 'wireless', 'wired_iface', 'wired_mode', 'mesh_radios', 'mesh_id', 'mesh_key', 'gateway', 'gw_bandwidth', 'gw_sel_class', 'ap_sync', 'ap_configs' ]
});

var callRestoreBackup = rpc.declare({
	object: 'luci.netmode',
	method: 'restoreBackup',
	params: [ 'name' ]
});

var callGenerateChildConfig = rpc.declare({
	object: 'luci.netmode',
	method: 'generateChildConfig',
	params: [ 'ip_suffix' ]
});

var css = '\
.netmode-page{--nm-bg:#fff;--nm-border:#d0d7de;--nm-soft:#f6f8fa;--nm-text:#1f2328;--nm-muted:#656d76;--nm-blue:#0969da;--nm-green:#1a7f37;--nm-orange:#bc4c00;--nm-red:#cf222e;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;font-size:13px;line-height:1.5;color:var(--nm-text);letter-spacing:0}\
.netmode-page h2{margin:0 0 14px;font-size:22px;line-height:1.3;font-weight:650;letter-spacing:0;color:var(--nm-text)}\
.nm-section{margin:12px 0 16px;padding:14px;border:1px solid var(--nm-border);border-radius:8px;background:var(--nm-bg)}\
.nm-title{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 12px;font-size:16px;font-weight:650}\
.nm-muted{color:var(--nm-muted)}\
.nm-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}\
.nm-mode{min-height:104px;text-align:left;border:1px solid var(--nm-border);border-radius:8px;background:var(--nm-soft);padding:12px;cursor:pointer;color:var(--nm-text)}\
.nm-mode strong{display:block;font-size:15px;margin-bottom:4px}.nm-mode span{display:block;color:var(--nm-muted);font-size:12px}.nm-mode.active{border-color:var(--nm-blue);box-shadow:inset 0 0 0 1px var(--nm-blue);background:rgba(9,105,218,.06)}\
.nm-form{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:12px}.nm-field{display:flex;flex-direction:column;gap:4px}.nm-field label{font-size:12px;font-weight:650;color:var(--nm-muted)}.nm-field input,.nm-field select{min-height:34px;border:1px solid var(--nm-border);border-radius:6px;padding:6px 9px;background:var(--nm-bg);color:var(--nm-text);box-sizing:border-box}\
.nm-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.nm-actions .cbi-button{min-height:34px}.nm-status{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.nm-pill{display:inline-flex;align-items:center;height:24px;padding:0 9px;border-radius:999px;border:1px solid var(--nm-border);background:var(--nm-soft);font-size:12px;font-weight:650}.nm-pill.ok{color:var(--nm-green);border-color:rgba(26,127,55,.35);background:rgba(26,127,55,.08)}.nm-pill.warn{color:var(--nm-orange);border-color:rgba(188,76,0,.35);background:rgba(188,76,0,.08)}\
.nm-ap-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:12px}.nm-ap-radio{border:1px solid var(--nm-border);border-radius:8px;padding:10px;background:var(--nm-soft)}.nm-ap-radio-title{font-weight:650}.nm-ap-radio-meta{margin:2px 0 8px;color:var(--nm-muted);font-size:12px}.nm-ap-radio .nm-form{margin-top:0;grid-template-columns:1fr}.nm-config-preview{width:100%;min-height:180px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:12px;white-space:pre;box-sizing:border-box}\
.nm-switches{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.nm-switch{display:flex;align-items:flex-start;gap:10px;border:1px solid var(--nm-border);border-radius:8px;background:var(--nm-soft);padding:12px}.nm-switch input{margin-top:3px}.nm-switch strong{display:block}.nm-switch span{display:block;color:var(--nm-muted);font-size:12px}.nm-topology{width:100%;min-height:320px;border:1px solid var(--nm-border);border-radius:8px;background:var(--nm-soft);overflow:hidden}.nm-topology svg{display:block;width:100%;height:320px}.nm-empty{padding:28px;text-align:center;color:var(--nm-muted)}\
.nm-node-label{font-size:12px;font-weight:650;fill:var(--nm-text)}.nm-node-sub{font-size:10px;fill:var(--nm-muted)}.nm-line{stroke:var(--nm-border);stroke-width:2}.nm-line.mesh{stroke:var(--nm-blue);stroke-dasharray:6 4}.nm-line.lan{stroke:var(--nm-green)}\
.nm-radio-line{display:flex;gap:16px;flex-wrap:wrap;min-height:34px;align-items:center}.nm-radio-line label{display:inline-flex;gap:6px;align-items:center;font-weight:400;color:var(--nm-text);font-size:13px;cursor:pointer}.nm-radio-line input{margin:0}.nm-radio-line input:disabled+span,.nm-radio-line input:disabled~span{color:var(--nm-muted);cursor:not-allowed}.nm-field.wide{grid-column:1 / -1}.nm-hint{margin:6px 0 0;font-size:12px;line-height:1.55;color:var(--nm-muted)}\
@media(max-width:900px){.nm-ap-grid{grid-template-columns:1fr 1fr}}@media(max-width:760px){.nm-grid,.nm-form,.nm-switches,.nm-ap-grid{grid-template-columns:1fr}.nm-mode{min-height:auto}}\
';

var darkVars = ':root{--nm-bg:#1e1f22;--nm-border:#3a3d42;--nm-soft:#26282d;--nm-text:#f0f3f6;--nm-muted:#a7adb5}';

function injectCSS() {
	var el = document.getElementById('netmode-css');
	if (!el) {
		el = document.createElement('style');
		el.id = 'netmode-css';
		document.head.appendChild(el);
	}
	var bg = window.getComputedStyle(document.body).backgroundColor;
	var nums = bg.match(/\d+/g) || [];
	var dark = nums.length >= 3 && ((+nums[0] * 299 + +nums[1] * 587 + +nums[2] * 114) / 1000) < 128;
	el.textContent = css + (dark ? darkVars : '');
}

function textLimit(s, n) {
	s = String(s || '');
	return s.length > n ? s.substr(0, n - 1) + '...' : s;
}

function radioTitle(config) {
	var labels = {
		'2g': _('2.4G radio'),
		'5g': _('5G radio'),
		'6g': _('6G radio')
	};
	return labels[config.band] || config.radio || _('无线 radio');
}

function nodeColor(kind) {
	if (kind === 'local') return '#0969da';
	if (kind === 'mesh') return '#8250df';
	return '#1a7f37';
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

function renderTopology(data) {
	var nodes = dedupeNodes(data && data.nodes || []);
	var links = data && data.links || [];
	if (!nodes.length)
		return E('div', { 'class': 'nm-topology' }, E('div', { 'class': 'nm-empty' }, _('暂无发现到的节点')));

	var local = nodes.filter(function(n) { return n.kind === 'local'; })[0] || nodes[0];
	var others = nodes.filter(function(n) { return n.id !== local.id; });
	var pos = {};
	pos[local.id] = { x: 120, y: 160 };
	others.forEach(function(n, i) {
		var angle = others.length === 1 ? 0 : (Math.PI * 2 * i / others.length);
		pos[n.id] = {
			x: 430 + Math.cos(angle) * 240,
			y: 160 + Math.sin(angle) * 105
		};
	});

	var svgChildren = [];
	links.forEach(function(l) {
		if (!pos[l.from] || !pos[l.to]) return;
		svgChildren.push(E('line', {
			'class': 'nm-line ' + (l.kind || 'lan'),
			'x1': pos[l.from].x,
			'y1': pos[l.from].y,
			'x2': pos[l.to].x,
			'y2': pos[l.to].y
		}));
	});

	nodes.forEach(function(n) {
		var p = pos[n.id];
		if (!p) return;
		var meta = n.kind === 'mesh'
			? [n.iface, n.tq ? 'TQ ' + n.tq : '', n.last_seen].filter(function(x) { return x; }).join(' / ')
			: (n.ip || n.mac || '');
		svgChildren.push(E('circle', {
			'cx': p.x,
			'cy': p.y,
			'r': n.kind === 'local' ? 24 : 18,
			'fill': nodeColor(n.kind),
			'opacity': '0.92'
		}));
		svgChildren.push(E('text', {
			'class': 'nm-node-label',
			'x': p.x,
			'y': p.y + 38,
			'text-anchor': 'middle'
		}, textLimit(n.label || n.ip || n.mac || n.id, 20)));
		svgChildren.push(E('text', {
			'class': 'nm-node-sub',
			'x': p.x,
			'y': p.y + 54,
			'text-anchor': 'middle'
		}, textLimit(meta, 28)));
	});

	return E('div', { 'class': 'nm-topology' }, E('svg', { 'viewBox': '0 0 820 320', 'role': 'img' }, svgChildren));
}

function statusPills(status) {
	var mesh = status.mesh || {};
	var deps = status.deps || {};
	var depOk = deps.batctl && deps.iw && deps.wpad;
	return E('div', { 'class': 'nm-status' }, [
		E('span', { 'class': 'nm-pill ok' }, _('当前模式: %s').format(status.mode || 'unknown')),
		E('span', { 'class': 'nm-pill' }, _('LAN IP: %s').format(status.lan_ip || _('自动获取'))),
		E('span', { 'class': 'nm-pill ' + (mesh.up ? 'ok' : '') }, mesh.enabled ? (mesh.up ? _('Mesh 运行中') : _('Mesh 未运行')) : _('Mesh 未启用')),
		mesh.wired ? E('span', { 'class': 'nm-pill' }, _('有线回程: %s').format(mesh.wired_mode === 'dedicated' ? (mesh.wired_iface || '-') : _('全部 LAN 口'))) : '',
		(mesh.wireless_count || 0) > 0 ? E('span', { 'class': 'nm-pill' }, _('无线回程: %d 个 radio').format(mesh.wireless_count)) : '',
		mesh.enabled ? E('span', { 'class': 'nm-pill' }, _('网关角色: %s').format(mesh.gateway || 'off')) : '',
		E('span', { 'class': 'nm-pill ' + (depOk ? 'ok' : 'warn') }, depOk ? _('依赖正常') : _('依赖缺失'))
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

		var mode = this.status.mode || 'unknown';
		var mesh = this.status.mesh || {};
		var root = E('div', { 'class': 'cbi-map netmode-page' }, [
			E('h2', {}, _('网络模式与 Mesh'))
		]);

		if (this.status.error)
			root.appendChild(E('p', { 'class': 'alert-message error' }, _('读取状态失败: %s').format(this.status.error)));

		this.statusBox = E('div', {}, statusPills(this.status));
		root.appendChild(E('div', { 'class': 'nm-section' }, [
			E('div', { 'class': 'nm-title' }, [
				E('span', {}, _('当前状态')),
				E('button', { 'class': 'cbi-button cbi-button-neutral', 'click': ui.createHandlerFn(this, 'refresh') }, _('刷新'))
			]),
			this.statusBox
		]));

		var modeCards = [
			this.modeCard('ap', _('AP 模式'), _('WAN 口并入 LAN 桥，上级路由分配地址，本机关闭 DHCP。'), mode === 'ap'),
			this.modeCard('dhcp', _('DHCP 路由'), _('WAN 口自动获取上网地址，LAN 侧开启 DHCP。'), mode === 'dhcp'),
			this.modeCard('pppoe', _('PPPoE 拨号'), _('WAN 口拨号上网，LAN 侧开启 DHCP。'), mode === 'pppoe')
		];

		this.lanIpInput = E('input', { 'type': 'text', 'value': this.status.lan_ip || '192.168.50.1', 'placeholder': '192.168.50.1' });
		this.pppoeUserInput = E('input', { 'type': 'text', 'autocomplete': 'off' });
		this.pppoePassInput = E('input', { 'type': 'password', 'autocomplete': 'new-password' });

		root.appendChild(E('div', { 'class': 'nm-section' }, [
			E('div', { 'class': 'nm-title' }, _('一键切换')),
			E('div', { 'class': 'nm-grid' }, modeCards),
			E('div', { 'class': 'nm-form' }, [
				E('div', { 'class': 'nm-field' }, [ E('label', {}, _('LAN IP')), this.lanIpInput ]),
				E('div', { 'class': 'nm-field' }, [ E('label', {}, _('PPPoE 账号')), this.pppoeUserInput ]),
				E('div', { 'class': 'nm-field' }, [ E('label', {}, _('PPPoE 密码')), this.pppoePassInput ])
			]),
			E('p', { 'class': 'nm-muted' }, _('AP 模式会关闭本机 DHCP 并从上级网络获取管理地址；切换后 LuCI 访问地址可能改变。'))
		]));

		this.wiredInput = E('input', { 'type': 'checkbox' });
		this.wiredInput.checked = !!mesh.wired;
		this.wirelessInput = E('input', { 'type': 'checkbox' });
		this.wirelessInput.checked = (mesh.wireless_count || 0) > 0;

		// wired backhaul transport: the whole br-lan bridge as batman-adv
		// hardif (no dedicated port needed, AP mode default) or one physical
		// port removed from br-lan and given exclusively to bat0
		var initialWiredMode = mesh.wired
			? (mesh.wired_mode === 'dedicated' ? 'dedicated' : 'bridge')
			: (mode === 'ap' ? 'bridge' : 'dedicated');
		this.wiredModeBridgeRadio = E('input', {
			'type': 'radio',
			'name': 'nm-wired-mode',
			'value': 'bridge',
			'checked': initialWiredMode === 'bridge' ? 'checked' : null
		});
		this.wiredModeDedicatedRadio = E('input', {
			'type': 'radio',
			'name': 'nm-wired-mode',
			'value': 'dedicated',
			'checked': initialWiredMode === 'dedicated' ? 'checked' : null
		});

		this.wiredIfaceInput = E('select', {}, [
			E('option', { 'value': '' }, _('请选择端口'))
		].concat((this.status.netdevs || []).map(function(iface) {
			return E('option', { 'value': iface }, iface);
		})));
		this.wiredIfaceInput.value = (mesh.wired && mesh.wired_mode === 'dedicated') ? (mesh.wired_iface || '') : '';
		this.wiredIfaceField = null;
		this.meshIdInput = E('input', { 'type': 'text', 'value': mesh.mesh_id || 'XR1710G-MESH' });
		this.meshKeyInput = E('input', { 'type': 'password', 'value': '12345678', 'autocomplete': 'new-password' });
		this.gatewayInput = E('select', {}, [
			E('option', { 'value': 'off' }, _('关闭网关')),
			E('option', { 'value': 'server' }, _('网关服务器')),
			E('option', { 'value': 'client' }, _('网关客户端'))
		]);
		this.gatewayInput.value = mesh.gateway || 'off';
		this.gwBandwidthInput = E('input', {
			'type': 'text',
			'value': mesh.gw_bandwidth || '',
			'placeholder': _('自动读取物理速率')
		});
		this.gwSelClassInput = E('input', {
			'type': 'number',
			'min': '1',
			'max': '255',
			'value': mesh.gw_sel_class || '20'
		});
		var currentSuffix = parseInt(String(this.status.lan_ip || '').split('.').pop(), 10);
		var childSuffix = currentSuffix >= 2 && currentSuffix < 254 ? currentSuffix + 1 : 252;
		this.childSuffixInput = E('input', {
			'type': 'number',
			'min': '2',
			'max': '254',
			'value': String(childSuffix)
		});
		this.apSyncInput = E('input', { 'type': 'checkbox' });
		this.apSyncInput.checked = mesh.ap_sync !== false || !mesh.enabled;
		this.apConfigInputs = (mesh.ap_configs || []).map(function(config) {
			var enabled = E('input', { 'type': 'checkbox' });
			var meshEnabled = E('input', { 'type': 'checkbox' });
			var ssid = E('input', {
				'type': 'text',
				'value': config.ssid || '',
				'maxlength': '32',
				'placeholder': _('例如 XR1710G-5G')
			});
			var encryption = E('select', {}, [
				E('option', { 'value': 'sae-mixed' }, _('WPA2/WPA3 混合')),
				E('option', { 'value': 'psk2' }, _('WPA2-PSK')),
				E('option', { 'value': 'sae' }, _('WPA3-SAE')),
				E('option', { 'value': 'psk-mixed' }, _('WPA/WPA2 混合')),
				E('option', { 'value': 'owe' }, _('OWE')),
				E('option', { 'value': 'none' }, _('开放网络'))
			]);
			var key = E('input', {
				'type': 'password',
				'autocomplete': 'new-password',
				'placeholder': config.has_key ? _('留空沿用当前密钥') : _('请输入 AP 密钥')
			});
			enabled.checked = config.enabled !== false;
			encryption.value = config.encryption || 'sae-mixed';
			// if mesh is not currently enabled every radio is preselected;
			// otherwise restore the exact radio set used for backhaul
			var selectedMeshRadios = mesh.mesh_radios || [];
			meshEnabled.checked = !mesh.enabled || selectedMeshRadios.length === 0 ||
				selectedMeshRadios.indexOf(config.radio) >= 0;

			return {
				radio: config.radio,
				enabled: enabled,
				mesh: meshEnabled,
				ssid: ssid,
				encryption: encryption,
				key: key,
				view: E('div', { 'class': 'nm-ap-radio' }, [
					E('div', { 'class': 'nm-ap-radio-title' }, radioTitle(config)),
					E('div', { 'class': 'nm-ap-radio-meta' }, [
						config.radio || '',
						config.channel ? _(' / 信道 %s').format(config.channel) : '',
						config.htmode ? _(' / %s').format(config.htmode) : ''
					]),
					E('div', { 'class': 'nm-form' }, [
						E('div', { 'class': 'nm-field' }, [
							E('label', {}, [ enabled, ' ', _('启用 AP') ])
						]),
						E('div', { 'class': 'nm-field' }, [
							E('label', {}, [ meshEnabled, ' ', _('Mesh 回程 (802.11s)') ])
						]),
						E('div', { 'class': 'nm-field' }, [ E('label', {}, _('SSID')), ssid ]),
						E('div', { 'class': 'nm-field' }, [ E('label', {}, _('加密')), encryption ]),
						E('div', { 'class': 'nm-field' }, [ E('label', {}, _('密码')), key ])
					])
				])
			};
		});
		this.apConfigInputs.forEach(function(config) {
			var updateKeyState = function() {
				config.key.disabled = config.encryption.value === 'none' || !config.enabled.checked;
				config.ssid.disabled = !config.enabled.checked;
				config.encryption.disabled = !config.enabled.checked;
			};
			config.enabled.addEventListener('change', updateKeyState);
			config.encryption.addEventListener('change', updateKeyState);
			updateKeyState();
		});
		var apConfigViews = this.apConfigInputs.map(function(config) {
			return config.view;
		});

		this.wiredIfaceField = E('div', { 'class': 'nm-field' }, [
			E('label', {}, _('有线 Mesh 独立端口')), this.wiredIfaceInput
		]);
		var wiredModeField = E('div', { 'class': 'nm-field wide' }, [
			E('label', {}, _('有线回程方式')),
			E('div', { 'class': 'nm-radio-line' }, [
				E('label', {}, [ this.wiredModeBridgeRadio, E('span', {}, _('全部 LAN 口（br-lan 透传，AP 模式推荐，无需独占端口）')) ]),
				E('label', {}, [ this.wiredModeDedicatedRadio, E('span', {}, _('指定独立回程端口（该端口只跑 Mesh）')) ])
			])
		]);
		this.wiredInput.addEventListener('change', ui.createHandlerFn(this, 'updateMeshState'));
		this.wirelessInput.addEventListener('change', ui.createHandlerFn(this, 'updateMeshState'));
		this.wiredModeBridgeRadio.addEventListener('change', ui.createHandlerFn(this, 'updateMeshState'));
		this.wiredModeDedicatedRadio.addEventListener('change', ui.createHandlerFn(this, 'updateMeshState'));

		root.appendChild(E('div', { 'class': 'nm-section' }, [
			E('div', { 'class': 'nm-title' }, _('Mesh 回程')),
			E('div', { 'class': 'nm-switches' }, [
				E('label', { 'class': 'nm-switch' }, [
					this.wiredInput,
					E('span', {}, [ E('strong', {}, _('有线 Mesh')), E('span', {}, _('AP 模式下可直接复用 br-lan 全部网口作为 batman-adv 回程，bat0 并入 br-lan；也可指定独立端口。')) ])
				]),
				E('label', { 'class': 'nm-switch' }, [
					this.wirelessInput,
					E('span', {}, [ E('strong', {}, _('无线 Mesh')), E('span', {}, _('在下方勾选的 radio 上创建 802.11s + SAE mesh 回程接口。')) ])
				])
			]),
			E('p', { 'class': 'nm-hint' }, _('有线与无线回程可以同时启用（不互斥）：batman-adv 会按链路质量自动优选，有线通常优先、无线作为补充；已启用 bridge loop avoidance 防止有线环路。')),
			E('div', { 'class': 'nm-form' }, [
				E('div', { 'class': 'nm-field' }, [ E('label', {}, _('Mesh ID')), this.meshIdInput ]),
				E('div', { 'class': 'nm-field' }, [ E('label', {}, _('Mesh 密钥')), this.meshKeyInput ]),
				E('div', { 'class': 'nm-field' }, [ E('label', {}, _('BATMAN 网关角色')), this.gatewayInput ]),
				wiredModeField,
				this.wiredIfaceField,
				E('div', { 'class': 'nm-field' }, [ E('label', {}, _('网关带宽 kbit/s')), this.gwBandwidthInput ]),
				E('div', { 'class': 'nm-field' }, [ E('label', {}, _('网关选择等级')), this.gwSelClassInput ]),
				E('div', { 'class': 'nm-field' }, [ E('label', {}, _('子节点 IP 尾号')), this.childSuffixInput ]),
				E('div', { 'class': 'nm-field' }, [
					E('label', {}, [ this.apSyncInput, ' ', _('应用各 radio 的 AP 配置') ])
				])
			]),
			E('div', { 'class': 'nm-ap-grid' }, apConfigViews.length ? apConfigViews : [
				E('div', { 'class': 'nm-empty' }, _('未发现无线 radio'))
			]),
			E('p', { 'class': 'nm-muted' }, _('每个 radio 单独设置 SSID、加密和密码；2.4G、5G、6G 可以使用不同配置。各 radio 的 band、channel、htmode 等频段参数保持原值。当前识别到 %s 个 radio。网关带宽留空时会读取物理接口速率并写入 下行/上行 kbit/s。').format(mesh.radio_count || 0)),
			E('div', { 'class': 'nm-actions' }, [
				E('button', { 'class': 'cbi-button cbi-button-apply', 'click': ui.createHandlerFn(this, 'confirmMesh') }, _('应用 Mesh')),
				E('button', { 'class': 'cbi-button cbi-button-neutral', 'click': ui.createHandlerFn(this, 'generateChildConfig') }, _('生成子节点配置')),
				E('button', { 'class': 'cbi-button cbi-button-negative', 'click': ui.createHandlerFn(this, 'confirmDisableMesh') }, _('关闭 Mesh')),
				(mesh && (this.status.backups || []).length) ? E('button', {
					'class': 'cbi-button cbi-button-neutral',
					'click': ui.createHandlerFn(this, 'restoreLatestBackup')
				}, _('恢复最近备份')) : ''
			])
		]));

		this.topologyBox = E('div', {}, renderTopology(this.discovery));
		root.appendChild(E('div', { 'class': 'nm-section' }, [
			E('div', { 'class': 'nm-title' }, [
				E('span', {}, _('Mesh / 局域网拓扑')),
				E('span', { 'class': 'nm-muted' }, _('自动发现 DHCP 租约与 BATMAN 邻居'))
			]),
			this.topologyBox
		]));

		this.updateMeshState();

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

	modeCard: function(mode, title, desc, active) {
		return E('button', {
			'class': 'nm-mode' + (active ? ' active' : ''),
			'click': ui.createHandlerFn(this, 'confirmMode', mode, title)
		}, [
			E('strong', {}, title),
			E('span', {}, desc)
		]);
	},

	confirmMode: function(mode, title) {
		var details = mode === 'ap'
			? _('将把 WAN 加入 br-lan，LAN 改为 DHCP 客户端，关闭本机 DHCP，并移除 WAN 防火墙转发。')
			: _('将 WAN 设为外网接口，LAN 使用静态地址并开启 DHCP，同时恢复 WAN 防火墙 NAT 与 LAN 到 WAN 转发。');
		var addresses = this.status.addresses || [];
		return ui.showModal(_('确认切换到 %s').format(title), [
			E('p', {}, details),
			mode === 'ap' && addresses.length
				? E('p', {}, _('切换前当前管理地址（切换到 AP 后该静态地址会失效，将改为上级 DHCP 分配）: %s').format(addresses.map(function(item) {
					return item.address + (item.interface ? ' (' + item.interface + ')' : '');
				}).join(', ')))
				: '',
			mode === 'ap' && !addresses.length
				? E('p', {}, _('AP 模式可能改为由上级路由 DHCP 分配管理地址，请切换后到上级路由 DHCP 租约列表查看。'))
				: '',
			E('p', {}, _('应用后会备份当前 network、dhcp、wireless、firewall 配置，并重载 network、dnsmasq、odhcpd、firewall 与 Wi-Fi。管理地址可能改变。')),
			E('div', { 'class': 'right' }, [
				E('button', {
					'class': 'cbi-button cbi-button-apply',
					'click': ui.createHandlerFn(this, 'applyMode', mode)
				}, _('确认应用')),
				' ',
				E('button', { 'class': 'cbi-button cbi-button-neutral', 'click': ui.hideModal }, _('取消'))
			])
		]);
	},

	wiredMode: function() {
		return this.wiredModeDedicatedRadio.checked ? 'dedicated' : 'bridge';
	},

	collectMeshRadios: function() {
		return this.apConfigInputs.filter(function(config) {
			return config.mesh.checked;
		}).map(function(config) {
			return config.radio;
		});
	},

	// enable/disable dependent controls based on the two mesh switches
	// and the wired transport selection
	updateMeshState: function() {
		var wired = this.wiredInput.checked;
		var wireless = this.wirelessInput.checked;
		var dedicated = this.wiredModeDedicatedRadio.checked;

		this.wiredModeBridgeRadio.disabled = !wired;
		this.wiredModeDedicatedRadio.disabled = !wired;
		this.wiredIfaceInput.disabled = !(wired && dedicated);

		this.apConfigInputs.forEach(function(config) {
			config.mesh.disabled = !wireless;
		});
	},

	confirmMesh: function() {
		var wiredMode = this.wiredMode();
		if (this.wiredInput.checked && wiredMode === 'dedicated' && !this.wiredIfaceInput.value) {
			ui.addNotification(null, E('p',
				_('请选择一个独立回程端口，或把有线回程方式改为“全部 LAN 口”。')));
			return;
		}
		var meshRadios = this.collectMeshRadios();
		if (this.wirelessInput.checked && !meshRadios.length) {
			ui.addNotification(null, E('p',
				_('无线 Mesh 至少需要在一个 radio 上勾选“Mesh 回程”。')));
			return;
		}

		var wiredText;
		if (!this.wiredInput.checked)
			wiredText = _('有线 Mesh 未启用。');
		else if (wiredMode === 'bridge')
			wiredText = _('有线 Mesh 将在 br-lan 网桥上运行，LAN2/LAN3/LAN4/WAN 任意网口接入对端节点即可回程，无需独占端口；bridge loop avoidance 会防止环路。');
		else
			wiredText = _('有线 Mesh 会把端口 %s 从 br-lan 中移出并交给 bat0 独占使用；请确认这不是当前唯一管理入口。').format(this.wiredIfaceInput.value);

		return ui.showModal(_('确认应用 Mesh 回程'), [
			E('p', {}, _('这会修改 batman-adv、wireless、network 配置并重载网络。')),
			E('p', {}, wiredText),
			E('p', {}, this.wirelessInput.checked
				? _('无线 Mesh 将在 %s 上创建 802.11s SAE 回程。').format(meshRadios.join(', '))
				: _('无线 Mesh 未启用。')),
			this.apSyncInput.checked
				? E('p', {}, _('将分别应用 2.4G、5G、6G radio 各自的 AP SSID、加密方式和密钥；不同 radio 可以使用不同配置。'))
				: E('p', {}, _('不会修改各 radio 当前的普通 AP 配置。')),
			E('div', { 'class': 'right' }, [
				E('button', {
					'class': 'cbi-button cbi-button-apply',
					'click': ui.createHandlerFn(this, 'applyMesh')
				}, _('确认应用')),
				' ',
				E('button', { 'class': 'cbi-button cbi-button-neutral', 'click': ui.hideModal }, _('取消'))
			])
		]);
	},

	confirmDisableMesh: function() {
		return ui.showModal(_('确认关闭 Mesh'), [
			E('p', {}, _('这会删除 netmode 创建的 bat0、有线 Mesh hardif 和无线 802.11s 回程配置，然后重载网络。')),
			E('div', { 'class': 'right' }, [
				E('button', {
					'class': 'cbi-button cbi-button-negative',
					'click': ui.createHandlerFn(this, 'disableMesh')
				}, _('确认关闭')),
				' ',
				E('button', { 'class': 'cbi-button cbi-button-neutral', 'click': ui.hideModal }, _('取消'))
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
			if (mode === 'ap') {
				// A transport error here is expected: validation failures are
				// returned as resolved {"success":false}, while uci commit runs
				// before the network reload that drops this very connection.
				return this.showApAppliedModal(e);
			}
			ui.addNotification(null, E('p', e.message || _('应用失败')));
		}, this));
	},

	applyMesh: function(syncAp) {
		ui.hideModal();
		var wired = this.wiredInput.checked;
		var wiredMode = this.wiredMode();
		return callApplyMesh(
			wired ? '1' : '0',
			this.wirelessInput.checked ? '1' : '0',
			(wired && wiredMode === 'dedicated') ? (this.wiredIfaceInput.value || '') : '__bridge__',
			wired ? wiredMode : '',
			JSON.stringify(this.collectMeshRadios()),
			(this.meshIdInput.value || '').trim(),
			this.meshKeyInput.value || '',
			this.gatewayInput.value || 'off',
			(this.gwBandwidthInput.value || '').trim(),
			(this.gwSelClassInput.value || '').trim(),
			syncAp === false ? '0' : (this.apSyncInput.checked ? '1' : '0'),
			JSON.stringify(this.apConfigInputs.map(function(config) {
				return {
					radio: config.radio,
					enabled: config.enabled.checked,
					ssid: (config.ssid.value || '').trim(),
					encryption: config.encryption.value || 'sae-mixed',
					key: config.key.value || ''
				};
			}))
		).then(L.bind(this.afterApply, this)).catch(function(e) {
			ui.addNotification(null, E('p', e.message || _('应用失败')));
		});
	},

	disableMesh: function() {
		ui.hideModal();
		this.wiredInput.checked = false;
		this.wirelessInput.checked = false;
		this.updateMeshState();
		return this.applyMesh(false);
	},

	afterApply: function(res) {
		if (!res || !res.success) {
			ui.addNotification(null, E('p', (res && res.error) || _('应用失败')));
			return;
		}
		ui.addNotification(null, E('p', _('已应用，配置备份在: %s').format(res.backup || '-')));
		return this.refresh();
	},

	afterModeApply: function(mode, res) {
		if (!res || !res.success) {
			ui.addNotification(null, E('p', (res && res.error) || _('应用失败')));
			return;
		}

		if (mode !== 'ap') {
			return this.afterApply(res);
		}

		var addresses = res.addresses || [];
		var addressNodes = addresses.length
			? E('ul', {}, addresses.map(function(item) {
				return E('li', {}, [
					E('a', { 'href': 'http://' + item.address + '/', 'target': '_blank', 'rel': 'noreferrer' }, item.address),
					' (', item.interface || _('管理接口'), ')'
				]);
			}))
			: E('p', {}, _('当前没有静态管理地址。AP 模式下管理地址由上级路由 DHCP 分配，请到上级路由的 DHCP 租约列表查看。'));

		var statusEl = E('p', { 'class': 'nm-muted' },
			_('设备正在重载网络，将自动尝试重新检测设备…'));
		var modal = ui.showModal(_('AP 模式已应用'), [
			E('p', {}, _('配置已成功提交，网络服务正在重载。')),
			E('p', {}, _('以下为切换前的管理地址，重载后可能失效：')),
			addressNodes,
			statusEl,
			E('p', { 'class': 'nm-muted' }, _('若自动检测失败，请在上级路由中查找本设备的 DHCP 租约；也可以通过设备 MAC 地址定位。')),
			E('div', { 'class': 'right' }, [
				E('button', {
					'class': 'cbi-button cbi-button-apply',
					'click': function() { window.location.reload(); }
				}, _('刷新页面')),
				' ',
				E('button', { 'class': 'cbi-button cbi-button-neutral', 'click': ui.hideModal }, _('关闭'))
			])
		]);
		setTimeout(L.bind(this.probeApDevice, this, statusEl, 0), 3000);
		return modal;
	},

	showApAppliedModal: function(error) {
		var statusEl = E('p', { 'class': 'nm-muted' },
			_('设备正在重载网络，将自动尝试重新检测设备…'));
		var modal = ui.showModal(_('AP 模式已应用'), [
			E('p', {}, _('配置已成功提交，设备正在切换到 AP 模式。')),
			E('p', {}, _('切换会把管理地址由静态 IP 改为上级路由 DHCP 分配，当前页面连接中断属于正常现象，并不表示失败。')),
			statusEl,
			E('p', {}, _('若自动检测失败，请到上级路由 DHCP 租约列表中按主机名/MAC 查找本设备的新管理地址，然后用新地址打开 LuCI。')),
			error && error.message
				? E('p', { 'class': 'nm-muted' }, _('连接提示: %s').format(error.message))
				: '',
			E('div', { 'class': 'right' }, [
				E('button', {
					'class': 'cbi-button cbi-button-apply',
					'click': function() { window.location.reload(); }
				}, _('刷新页面')),
				' ',
				E('button', { 'class': 'cbi-button cbi-button-neutral', 'click': ui.hideModal }, _('关闭'))
			])
		]);
		setTimeout(L.bind(this.probeApDevice, this, statusEl, 0), 3000);
		return modal;
	},

	// After the AP switch the old static address disappears; poll getStatus
	// on the current address for up to ~90s. If the device is still reachable
	// (same LAN segment / fast DHCP) reload the page at the new state.
	probeApDevice: function(statusEl, attempt) {
		var maxAttempts = 30;
		if (attempt >= maxAttempts) {
			statusEl.textContent = _('自动检测超时：设备可能已获取新的 DHCP 地址，请改用上级路由分配的新地址访问。');
			return;
		}
		callGetStatus().then(L.bind(function(res) {
			if (res && res.mode === 'ap') {
				ui.hideModal();
				ui.addNotification(null, E('p',
					_('设备已进入 AP 模式，当前管理地址: %s').format(res.lan_ip || '-')));
				window.location.reload();
				return;
			}
			statusEl.textContent = _('设备已有响应，等待模式切换完成…（%d/%d）').format(attempt + 1, maxAttempts);
			setTimeout(L.bind(this.probeApDevice, this, statusEl, attempt + 1), 3000);
		}, this)).catch(L.bind(function() {
			statusEl.textContent = _('网络重载中，正在重试检测…（%d/%d）').format(attempt + 1, maxAttempts);
			setTimeout(L.bind(this.probeApDevice, this, statusEl, attempt + 1), 3000);
		}, this));
	},

	generateChildConfig: function() {
		return callGenerateChildConfig((this.childSuffixInput.value || '').trim()).then(L.bind(function(res) {
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
			E('p', {}, _('设备临时目录: %s').format(res.path || '-')),
			E('textarea', {
				'class': 'nm-config-preview',
				'readonly': 'readonly',
				'wrap': 'off'
			}, chunks),
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
		if (!this.topologyBox) return;
		this.topologyBox.innerHTML = '';
		this.topologyBox.appendChild(renderTopology(this.discovery));
	}
});
