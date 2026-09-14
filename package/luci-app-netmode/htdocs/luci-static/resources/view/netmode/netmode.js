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

var MODE_LABELS = {
	ap: _('AP 模式'),
	dhcp: _('DHCP 路由'),
	pppoe: _('PPPoE 拨号')
};

function modeLabel(mode) {
	return MODE_LABELS[mode] || _('未知模式');
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

	return E('div', {}, [
		E('div', { 'class': 'nm-status' }, [
			E('span', { 'class': 'nm-pill' }, modeLabel(status.mode)),
			E('span', { 'class': 'nm-pill ' + wanPillClass }, wanPillText)
		]),
		E('div', { 'class': 'nm-infogrid' }, [
			infoCard(_('设备型号'), status.board),
			infoCard(_('主机名'), status.hostname),
			infoCard(_('管理地址 (LAN)'), status.lan_ip || _('获取中…')),
			isAp
				? infoCard(_('WAN 地址'), _('桥接至 br-lan'))
				: infoCard(_('WAN 地址'), status.wan_ip || _('未获取'))
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
			E('h2', {}, _('上网模式')),
			E('p', { 'class': 'nm-lede' }, _('选择这台设备如何连接上级网络。'))
		]);

		if (this.status.error)
			root.appendChild(E('p', { 'class': 'alert-message error' },
				_('读取状态失败: %s').format(this.status.error)));

		this.statusBox = E('div', {}, statusPills(this.status));
		root.appendChild(E('div', { 'class': 'nm-section' }, [
			E('div', { 'class': 'nm-title' }, [
				E('span', {}, _('当前状态')),
				E('button', {
					'class': 'cbi-button cbi-button-neutral',
					'click': ui.createHandlerFn(this, 'refresh')
				}, _('刷新'))
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
			'type': 'text', 'autocomplete': 'off', 'placeholder': _('宽带账号')
		});
		this.pppoePassInput = E('input', {
			'type': 'password', 'autocomplete': 'new-password', 'placeholder': _('宽带密码')
		});

		root.appendChild(E('div', { 'class': 'nm-section' }, [
			E('div', { 'class': 'nm-title' }, _('一键切换')),
			E('p', { 'class': 'nm-subtitle' }, _('点击任一模式卡片即可切换，配置将立即生效。')),
			E('div', { 'class': 'nm-grid' }, [
				this.modeCard('ap', _('AP 模式'), _('WAN 口并入 br-lan，由上级路由分配地址，本机只做桥接。'), mode === 'ap'),
				this.modeCard('dhcp', _('DHCP 路由'), _('WAN 口自动获取上级地址，本机负责 NAT 与 DHCP。'), mode === 'dhcp'),
				this.modeCard('pppoe', _('PPPoE 拨号'), _('WAN 口用宽带账号密码拨号，本机负责 NAT 与 DHCP。'), mode === 'pppoe')
			]),
			E('div', { 'class': 'nm-formbox' }, [
				E('div', { 'class': 'nm-form' }, [
					E('div', { 'class': 'nm-field' }, [
						E('label', {}, _('LAN IP')), this.lanIpInput
					]),
					E('div', { 'class': 'nm-field' }, [
						E('label', {}, _('PPPoE 账号')), this.pppoeUserInput
					]),
					E('div', { 'class': 'nm-field' }, [
						E('label', {}, _('PPPoE 密码')), this.pppoePassInput
					])
				]),
				E('p', { 'class': 'nm-hint' }, _('AP 模式下 LAN IP 即为访问本机的地址，留空由上级路由自动分配。')),
				E('p', { 'class': 'nm-hint' }, _('LAN IP 在路由模式下为网关，留空则使用 192.168.50.1；PPPoE 账号与密码仅在 PPPoE 模式需要。'))
			])
		]));

		return root;
	},

	modeCard: function(mode, title, desc, active) {
		return E('button', {
			'class': 'nm-mode' + (active ? ' active' : ''),
			'click': ui.createHandlerFn(this, 'confirmMode', mode, title)
		}, [
			E('strong', {}, [
				title,
				active ? E('em', { 'class': 'nm-badge' }, _('当前')) : ''
			]),
			E('span', {}, desc),
			E('span', { 'class': 'nm-check' })
		]);
	},

	confirmMode: function(mode, title) {
		var summary = ({
			ap: _('WAN 口并入 br-lan，本机改为由上级路由分配地址并关闭 DHCP。'),
			dhcp: _('WAN 口自动获取上级地址，LAN 使用静态地址并开启 DHCP。'),
			pppoe: _('WAN 口拨号上网，LAN 使用静态地址并开启 DHCP。')
		})[mode];

		var addresses = this.status.addresses || [];
		var notice = mode === 'ap'
			? (addresses.length
				? _('当前管理地址 %s 将失效，改由上级路由分配。')
					.format(addresses.map(function(i) { return i.address; }).join(', '))
				: _('管理地址将改为由上级路由分配。'))
			: '';

		if (mode === 'pppoe' && !(this.pppoeUserInput.value || '').trim()) {
			ui.addNotification(null, E('p', _('请先填写 PPPoE 账号。')));
			return;
		}

		return ui.showModal(_('切换到 %s').format(title), [
			E('p', {}, summary),
			notice ? E('div', { 'class': 'nm-alert' }, notice) : '',
			E('p', { 'class': 'nm-muted' }, _('配置将立即生效并重新加载网络。')),
			E('div', { 'class': 'right' }, [
				E('button', {
					'class': 'cbi-button cbi-button-apply',
					'click': ui.createHandlerFn(this, 'applyMode', mode)
				}, _('确认切换')),
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
			// A dropped reply is expected here: uci commit happens before the
			// delayed network reload, and that reload tears down the very
			// connection carrying the response. Never report it as a failure -
			// go straight into the wait / probe cycle.
			return this.waitForSwitch(mode, { transport_error: e.message || String(e) });
		}, this));
	},

	afterModeApply: function(mode, res) {
		if (!res || !res.success) {
			ui.addNotification(null, E('p', (res && res.error) || _('应用失败')));
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
	// bogus "应用失败"), then poll for up to 90s and show a countdown the
	// whole time. Real validation errors still arrive as {"success":false}
	// and are reported immediately.
	// ---------------------------------------------------------------------
	waitForSwitch: function(mode, res) {
		if (res && res.success === false) {
			ui.addNotification(null, E('p', (res && res.error) || _('应用失败')));
			return;
		}

		var isAp = (mode === 'ap');
		var lanIp = (this.lanIpInput && (this.lanIpInput.value || '').trim()) || '192.168.50.1';
		var copy = ({
			ap: {
				title: _('AP 模式已应用'),
				doing: _('配置已成功提交，设备正在切换到 AP 模式。'),
				why: _('切换会把管理地址改为上级路由 DHCP 分配，当前页面断开属于正常现象，并不表示失败。'),
				done: _('设备已进入 AP 模式。')
			},
			dhcp: {
				title: _('DHCP 路由模式已应用'),
				doing: _('配置已成功提交，设备正在切换到 DHCP 路由模式。'),
				why: _('切换会把管理地址改回 LAN 静态地址，当前页面断开属于正常现象，并不表示失败。'),
				done: _('设备已进入 DHCP 路由模式。')
			},
			pppoe: {
				title: _('PPPoE 路由模式已应用'),
				doing: _('配置已成功提交，设备正在切换到 PPPoE 路由模式。'),
				why: _('切换会把管理地址改回 LAN 静态地址，当前页面断开属于正常现象，并不表示失败。'),
				done: _('设备已进入 PPPoE 路由模式。')
			}
		})[mode] || {
			title: _('配置已应用'),
			doing: _('配置已成功提交，设备正在切换上网模式。'),
			why: _('切换会改变管理地址，当前页面断开属于正常现象，并不表示失败。'),
			done: _('设备已完成切换。')
		};

		var TOTAL = 90, SILENT = 12, PROBE_EVERY = 3;
		var state = { cancelled: false, done: false };
		var started = Date.now();
		var lastProbe = 0;
		var self = this;

		var bar = E('span', {});
		var statusEl = E('p', { 'class': 'nm-muted' }, _('配置已提交，网络服务正在重载…'));
		var resultBox = E('div', {}, '');

		var elapsed = function() { return Math.round((Date.now() - started) / 1000); };
		var remain = function() { return Math.max(0, TOTAL - elapsed()); };

		var showSuccess = function(st) {
			state.done = true;
			bar.style.width = '100%';
			statusEl.textContent = copy.done;
			resultBox.innerHTML = '';
			resultBox.appendChild(E('div', { 'class': 'nm-alert ok' },
				_('已检测到设备，当前管理地址: %s').format(st.lan_ip || '-')));
			resultBox.appendChild(E('div', { 'class': 'nm-goto' }, [
				E('button', {
					'class': 'cbi-button cbi-button-apply',
					'click': function() {
						window.location.href = window.location.protocol + '//' +
							(st.lan_ip || window.location.hostname) + '/';
					}
				}, _('打开新地址')),
				E('button', {
					'class': 'cbi-button cbi-button-neutral',
					'click': function() { window.location.reload(); }
				}, _('刷新页面'))
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
				statusEl.textContent = _('设备已有响应，等待模式切换完成…（剩余 %d 秒）').format(remain());
			}).catch(function() {
				// address not answering yet, which is the normal case while
				// the interface is being reconfigured
			});
		};

		var showTimeout = function() {
			var host = (self.status && self.status.hostname) || '-';
			var wanIp = (self.status && self.status.wan_ip) || '';
			statusEl.textContent = _('自动检测超时。');
			resultBox.innerHTML = '';
			resultBox.appendChild(E('p', {}, _('配置已经下发成功，只是没能在当前地址上重新找到设备。')));
			if (isAp) {
				resultBox.appendChild(E('p', {}, wanIp
					? _('新地址由上级路由分配，通常与切换前的 WAN 地址 %s 同网段；请按主机名「%s」或 MAC 在上级路由的 DHCP 租约里查找。')
						.format(wanIp, host)
					: _('新地址由上级路由分配；请按主机名「%s」或 MAC 在上级路由的 DHCP 租约里查找。').format(host)));
			}
			else {
				resultBox.appendChild(E('p', {},
					_('新地址为 LAN 静态地址 %s；请确认网线接在 LAN 口，且本机网卡已设为自动获取（DHCP）。').format(lanIp)));
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
				}, _('用这个地址打开'))
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
				statusEl.textContent = _('仍在等待设备…（%d 秒后开始检测，剩余 %d 秒）').format(SILENT - e, TOTAL - e);
			} else {
				if (e - lastProbe >= PROBE_EVERY) {
					lastProbe = e;
					probe();
				}
				if (!state.done)
					statusEl.textContent = _('仍在等待设备…（剩余 %d 秒）').format(TOTAL - e);
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
				}, _('关闭'))
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
		}, this));
	}
});
