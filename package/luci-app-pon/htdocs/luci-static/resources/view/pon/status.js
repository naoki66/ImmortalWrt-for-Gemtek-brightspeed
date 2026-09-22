'use strict';
'require view';
'require poll';
'require rpc';
'require ui';

/*
 * PON line status.
 *
 * Everything shown here comes from one place: luci.pon.getStatus, which runs
 * /usr/sbin/pondctl. pondctl reads /proc and /sys only and never invokes the
 * vendor CLI, so this page cannot wedge the box the way a `ponmgr`/`omcicfgCmd`
 * query can.
 *
 * Fields that cannot be obtained from proc/sys in this build are reported as
 * null and listed under "unsupported" rather than being guessed at.
 */

var callStatus = rpc.declare({ object: 'luci.pon', method: 'getStatus' });
var callApply  = rpc.declare({ object: 'luci.pon', method: 'apply' });

var POLL_SECONDS = 5;

var LIFECYCLE = {
	'operational':         [ '已上线', 'ok', 'GPON 处于 O5，可正常收发' ],
	'mpcp-registered':     [ 'MPCP 已注册', 'warn', 'EPON MPCP 已完成，但 CTC/OAM 认证状态无法从 proc/sys 读取' ],
	'registering':         [ '注册中', 'warn', '已收到 OLT 的注册请求或处于发现阶段' ],
	'ranging':             [ '测距中', 'warn', 'O4：均衡时延（EqD）协商中' ],
	'serial-number':       [ '序列号状态', 'warn', 'O2/O3：等待 OLT 分配 ONU-ID' ],
	'wait-downstream-sync': [ '等待下行同步', 'warn', 'O1：初始化，尚未同步到下行帧' ],
	'intermittent-lods':   [ '间歇性下行失步', 'err', 'O6：曾上线后丢失下行同步，TO2 内未恢复将退回 O1' ],
	'emergency-stop':      [ '紧急停止', 'err', 'O7：OLT 已 Disable，激光器强制关闭且重启后仍保持' ],
	'activating':          [ '激活中', 'warn', 'ONU 状态机已推进，但尚未到 O5' ],
	'wait-optical-signal': [ '无光信号', 'err', 'LOS 已置位，收不到下行光' ],
	'down':                [ '未注册', 'err', '已收到 OLT 的 de_register' ],
	'unknown':             [ '未知', 'skip', '当前数据源无法判定链路阶段' ]
};

// 同样的判定用在「注册与认证」表格里，避免两处颜色不一致
var ONU_STATE_CLASS = {
	'O5': 'ok', 'O5_1': 'ok', 'O5_2': 'ok', 'O5_3': 'ok',
	'O6': 'err', 'O6_1': 'err', 'O6_2': 'err', 'O6_3': 'err',
	'O7': 'err', 'O7_1': 'err', 'O7_2': 'err', 'O7_3': 'err',
	'O1': 'warn', 'O1_1': 'warn', 'O1_2': 'warn', 'O1_3': 'warn',
	'O2': 'warn', 'O2_1': 'warn', 'O2_2': 'warn', 'O2_3': 'warn',
	'O3': 'warn', 'O3_1': 'warn', 'O3_2': 'warn', 'O3_3': 'warn',
	'O4': 'warn', 'O4_1': 'warn', 'O4_2': 'warn', 'O4_3': 'warn'
};

function onuStateClass(s) {
	return ONU_STATE_CLASS[s] || 'skip';
}

var SECTION_IDS = [ 'pon-summary', 'pon-line', 'pon-optics', 'pon-registration',
	'pon-datapath', 'pon-counters', 'pon-caps', 'pon-unsupported' ];

var EMPTY = '\u2014';

function text(v) {
	if (v === null || v === undefined || v === '') return EMPTY;
	return String(v);
}

function num(v, digits) {
	if (v === null || v === undefined || v === '') return EMPTY;
	var n = Number(v);
	if (!isFinite(n)) return text(v);
	return (digits === undefined) ? String(n) : n.toFixed(digits);
}

function withUnit(v, unit, digits) {
	var s = (digits === undefined) ? text(v) : num(v, digits);
	return (s === EMPTY) ? EMPTY : (s + ' ' + unit);
}

function yesno(v) {
	if (v === null || v === undefined) return EMPTY;
	return v ? '是' : '否';
}

function onoff(v) {
	if (v === null || v === undefined) return EMPTY;
	return v ? '有' : '无';
}

function lifecycleOf(name) {
	return LIFECYCLE[name] || [ text(name), 'skip', '' ];
}

function section(id, title, body) {
	// LuCI 的 E() 会递归展平数组子节点，所以 body 既可以是单个节点，
	// 也可以是 [ 表格, 提示 ] 这样的列表。
	return E('div', { 'class': 'pon-section', 'id': id }, [
		E('h3', {}, [ title ]),
		body
	]);
}

function facts(rows) {
	return E('table', { 'class': 'table pon-facts' }, [
		E('tbody', {}, rows.map(function (r) {
			return E('tr', {}, [
				E('td', { 'class': 'pon-key' }, [ r[0] ]),
				E('td', { 'class': 'pon-val' + (r[2] ? ' pon-col-' + r[2] : '') }, [ r[1] ])
			]);
		}))
	]);
}

function card(title, value, sub, accent) {
	return E('div', { 'class': 'pon-card' }, [
		E('div', { 'class': 'pon-card-title' }, [ title ]),
		E('div', { 'class': 'pon-card-value pon-col-' + (accent || 'none') }, [ value ]),
		E('div', { 'class': 'pon-card-sub' }, [ sub || '' ])
	]);
}

function summaryOf(line, front) {
	var lc = lifecycleOf(line ? line.lifecycle : null);

	return E('div', { 'class': 'pon-grid' }, [
		card('链路状态', lc[0], lc[2], lc[1]),
		card('当前模式', text(line ? line.active_mode : null),
			line ? ('配置 ' + text(line.configured_mode) +
				(line.mode_pending ? ' ／ 重启后生效' : '')) : '', 'none'),
		card('收光', withUnit(front ? front.rx_power_dbm : null, 'dBm', 2),
			front ? ('发光 ' + withUnit(front.tx_power_dbm, 'dBm', 2)) : '', 'none'),
		card('光模块温度', withUnit(front ? front.temperature_celsius : null, '°C', 1),
			front ? ('PHY ' + withUnit(front.phy_temperature_celsius, '°C') +
				' ／ BOSA ' + withUnit(front.bosa_temperature_celsius, '°C')) : '', 'none')
	]);
}

function lineSection(line) {
	if (!line) return null;

	return section('pon-line', '线路', facts([
		[ '线路设备', text(line.device) ],
		[ '配置模式', text(line.configured_mode) + '（参数 ' + text(line.loaded_mode) + '）' ],
		[ '实际模式', text(line.active_mode) ],
		[ '模式待生效', yesno(line.mode_pending),
			line.mode_pending ? 'warn' : 'ok' ],
		[ '开机自启', yesno(line.auto_start) ],
		[ '光信号', onoff(line.optical_signal),
			line.optical_signal === false ? 'err' : (line.optical_signal ? 'ok' : 'skip') ],
		[ '阶段判定依据', '由 proc/sys 推导（' + text(line.lifecycle_source) + '）' ]
	]));
}

function opticsSection(front) {
	if (!front) return null;

	return section('pon-optics', '光模块 DDM', [
		facts([
			[ '数据可用', yesno(front.available), front.available ? 'ok' : 'err' ],
			[ 'LOS 无光告警', yesno(front.los), front.los ? 'err' : (front.los === false ? 'ok' : 'skip') ],
			[ '收光功率', withUnit(front.rx_power_dbm, 'dBm', 2) ],
			[ '发光功率', withUnit(front.tx_power_dbm, 'dBm', 2) ],
			[ '模块温度', withUnit(front.temperature_celsius, '°C', 1) ],
			[ 'PHY 温度', withUnit(front.phy_temperature_celsius, '°C') ],
			[ 'BOSA 温度', withUnit(front.bosa_temperature_celsius, '°C') ],
			[ '工作电压', withUnit(front.vcc_volts, 'V', 2) ],
			[ '偏置电流', withUnit(front.ibias_ma, 'mA', 1) ],
			[ '调制电流', withUnit(front.imod_ma, 'mA', 1) ],
			[ '校准状态', text(front.calibration), front.calibration === 'ready' ? 'ok' : 'warn' ],
			[ '数据来源', text(front.source) ]
		]),
		front.error ? E('div', { 'class': 'pon-note pon-col-warn' }, [ front.error ]) : ''
	]);
}

// ERR_CNT_LOS: phy_10g prints the BER counter as all-ones while LOS is
// asserted, so 0xfffffff means "no measurement" rather than "many errors".
var ERR_CNT_LOS = 0xfffffff;

function phySection(phy) {
	if (!phy || phy.available === false) return null;

	var los = phy.los_status;

	return section('pon-phy', 'PHY 层（/proc/pon_phy、/proc/tc3162）', [
		facts([
			[ 'PHY LOS 状态', text(los) + (los === 0 ? '（0 = 无光）' : (los === 1 ? '（1 = 有光）' : '')),
				los === 1 ? 'ok' : (los === 0 ? 'err' : 'skip') ],
			[ '收光判定（PHY）', onoff(phy.optical_signal),
				phy.optical_signal === false ? 'err' : (phy.optical_signal ? 'ok' : 'skip') ],
			[ '误码计数', phy.err_cnt_value === ERR_CNT_LOS ? 'LOS 中（未测量）' : num(phy.err_cnt_value),
				phy.err_cnt_value === ERR_CNT_LOS ? 'warn' : 'none' ],
			[ 'Rogue ONU', yesno(phy.rogue_onu),
				phy.rogue_onu === true ? 'err' : (phy.rogue_onu === false ? 'ok' : 'skip') ]
		]),
		phy.err_cnt ? E('div', {}, [
			E('div', { 'class': 'pon-sub' }, [ '/proc/pon_phy/err_cnt' ]),
			E('pre', { 'class': 'pon-pre' }, [ text(phy.err_cnt) ])
		]) : ''
	]);
}

function registrationSection(reg, proto) {
	if (!reg) return null;

	var rows = [
		[ '协议面', text(reg.plane) ]
	];

	if (reg.plane === 'epon') {
		rows.push([ 'MPCP 状态', text(reg.mpcp_state),
			reg.mpcp_state === 'registered' ? 'warn' : 'none' ]);
		rows.push([ 'LLID', num(reg.llid) ]);
		rows.push([ 'OAM 认证', text(reg.oam_auth), 'skip' ]);
	}
	else {
		rows.push([ 'ONU 状态', text(reg.onu_state), onuStateClass(reg.onu_state) ]);
		rows.push([ 'ONU-ID', num(reg.onu_id) ]);
	}

	rows.push([ '判定依据', text(reg.evidence) ]);

	if (proto && proto.report) {
		rows.push([ 'OMCI 传输口', text(proto.report.omci && proto.report.omci.device) +
			'（' + (proto.report.omci && proto.report.omci.transport ? '已创建' : '缺失') + '）' ]);
		rows.push([ 'OAM 传输口', text(proto.report.oam && proto.report.oam.device) +
			'（' + (proto.report.oam && proto.report.oam.transport ? '已创建' : '缺失') + '）' ]);
	}

	return section('pon-registration', '注册与认证', [
		facts(rows),
		onuStateNote(reg.onu_state),
		registrationNote(reg.note)
	]);
}

function registrationNote(note) {
	if (note === 'epon_debug_write_only')
		return E('div', { 'class': 'pon-note pon-col-warn' }, [
			'xpon_10g 的 /proc/epon/debug 只接受写入（read_proc 为空），读出来永远是空，' +
			'状态只能通过写入 `epon <子命令>` 后由 printk 吐到内核日志。' +
			'本工具不写驱动、不改状态，因此 MPCP 注册状态在此构建下不可读；' +
			'EPON 是否完成 CTC/OAM 认证请以 OLT 侧或「高级」页的内核日志为准。'
		]);

	return '';
}

function onuStateNote(s) {
	if (s === 'O6' || s === 'O6_1' || s === 'O6_2' || s === 'O6_3')
		return E('div', { 'class': 'pon-note pon-col-err' }, [
			'O6 间歇性下行失步：链路此前已上线，随后丢失下行同步。' +
			'若在 TO2 超时内未重新同步将退回 O1。' +
			'多为光路衰减/连接器污染，或 OLT 侧光功率异常。'
		]);

	if (s === 'O7' || s === 'O7_1' || s === 'O7_2' || s === 'O7_3')
		return E('div', { 'class': 'pon-note pon-col-err' }, [
			'O7 紧急停止：OLT 下发了 Disable_Serial_Number（disable），激光器被强制关闭。' +
			'该状态跨重启/掉电保持，重启设备无法恢复，必须由 OLT 侧重新下发 enable。' +
			'请核对 SN/口令是否与 OLT 上登记的一致，并联系局方解绑。'
		]);

	return '';
}

function datapathSection(dp) {
	if (!dp) return null;

	var rows = [
		[ 'PON 网口已创建', yesno(dp.pon0_device_configured),
			dp.pon0_device_configured ? 'ok' : 'warn' ]
	];

	if (dp.links) {
		Object.keys(dp.links).forEach(function (name) {
			rows.push([ '接口 ' + name, yesno(dp.links[name]),
				dp.links[name] ? 'ok' : 'warn' ]);
		});
	}

	rows.push([ '模式参数来源', text(dp.mode_source) ]);

	return section('pon-datapath', '数据面接口', facts(rows));
}

function countersSection(counters) {
	var names = counters ? Object.keys(counters) : [];
	if (!names.length) return null;

	return section('pon-counters', '计数器原始数据', names.map(function (n) {
		return E('div', {}, [
			E('div', { 'class': 'pon-sub' }, [ '/proc/xgpon/' + n ]),
			E('pre', { 'class': 'pon-pre' }, [ text(counters[n]) ])
		]);
	}));
}

function capsSection(caps) {
	if (!caps) return null;

	var labels = {
		proc_xgpon: '/proc/xgpon',
		proc_epon: '/proc/epon',
		proc_pon_phy: '/proc/pon_phy',
		proc_tc3162_los: '/proc/tc3162/los_status',
		proc_lddla: '/proc/lddla/debug',
		sysfs_module_mode: '/sys/module/xpon_10g/parameters/mode',
		vendor_cli: '厂商 CLI (/userfs/bin)',
		omci_engine: 'OMCI 引擎',
		oam_engine: 'OAM 引擎'
	};

	var rows = Object.keys(caps).map(function (k) {
		var v = caps[k];
		var shown, cls = 'skip';

		if (typeof v === 'boolean') {
			shown = yesno(v);
			cls = v ? 'ok' : 'warn';
		}
		else {
			shown = text(v);
			cls = (v === 'unavailable') ? 'warn' : 'none';
		}

		return [ labels[k] || k, shown, cls ];
	});

	return section('pon-caps', '数据源能力探测', [
		facts(rows),
		E('div', { 'class': 'pon-note' }, [
			'标记为不可用的引擎，其页面只会显示配置项，不会伪造运行值。'
		])
	]);
}

function unsupportedSection(list) {
	if (!list || !list.length) return null;

	return section('pon-unsupported', '本版本无法读取的字段', [
		E('ul', { 'class': 'pon-list' }, list.map(function (s) {
			return E('li', {}, [ text(s) ]);
		}))
	]);
}

function envBanner(env) {
	if (!env) return null;

	var missing = [];
	if (!env.pondctl) missing.push('pondctl 未安装（airoha-pon-manager 需要升级）');
	if (!env.ponctl) missing.push('ponctl 未安装');
	if (!env.initd) missing.push('/etc/init.d/pon 未安装');
	if (!env.uci_config) missing.push('/etc/config/pon 不存在');
	if (!env.kernel_support) missing.push('未检测到 /proc/xgpon 或 /proc/epon，PON 驱动可能未加载');

	if (!missing.length) return null;

	return E('div', { 'class': 'pon-alert' }, [
		E('strong', {}, [ '环境不完整' ]),
		E('ul', { 'class': 'pon-list' }, missing.map(function (s) {
			return E('li', {}, [ s ]);
		}))
	]);
}

function renderBody(data) {
	var body = E('div', { 'class': 'pon-page' }, []);
	var report = data && data.report;

	body.appendChild(envBanner(data && data.env));

	if (!report) {
		body.appendChild(E('div', { 'class': 'pon-alert' }, [
			E('strong', {}, [ '无法读取 PON 状态' ]),
			E('div', {}, [ text(data && data.error) ])
		]));
		return body;
	}

	body.appendChild(summaryOf(report.line, report.frontend));

	var sections = [
		lineSection(report.line),
		opticsSection(report.frontend),
		phySection(report.phy),
		registrationSection(report.registration, this.proto),
		datapathSection(report.datapath),
		countersSection(report.counters),
		capsSection(report.capabilities),
		unsupportedSection(report.unsupported)
	];

	sections.forEach(function (s) {
		if (s) body.appendChild(s);
	});

	return body;
}

return view.extend({
	load: function () {
		return Promise.all([ callStatus(), callProto() ]);
	},

	render: function (results) {
		var self = this;
		var status = results[0] || {};
		var proto = results[1] || {};

		self.proto = proto;
		self.data = status;

		var host = E('div', { 'class': 'pon-page' }, [ renderBody.call(self, status) ]);

		function refresh() {
			return callStatus().then(function (st) {
				self.data = st;
				var next = renderBody.call(self, st);
				host.firstChild.replaceWith(next);
			}).catch(function (err) {
				ui.addNotification(null, E('p', {}, [ '刷新失败: ' + err ]), 'error');
			});
		}

		poll.add(refresh, POLL_SECONDS);

		return E('div', {}, [
			E('style', {}, [ this.css() ]),
			E('h2', {}, [ 'PON 线路状态' ]),
			E('div', { 'class': 'pon-toolbar' }, [
				E('button', {
					'class': 'btn cbi-button cbi-button-apply',
					'click': ui.createHandlerFn(this, function () {
						return callApply().then(function (r) {
							ui.addNotification(null, E('p', {}, [
								r && r.ok ? '已下发配置' : ('下发失败: ' + (r && r.error))
							]), r && r.ok ? 'info' : 'error');
							return refresh();
						});
					})
				}, [ '下发配置' ]),
				E('button', {
					'class': 'btn cbi-button',
					'click': ui.createHandlerFn(this, function () { return refresh(); })
				}, [ '立即刷新' ]),
				E('span', { 'class': 'pon-muted' }, [ '每 ' + POLL_SECONDS + ' 秒自动刷新' ])
			]),
			host
		]);
	},

	css: function () {
		return [
			'.pon-page{font-size:13px;line-height:1.5}',
			'.pon-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px;margin:0 0 12px}',
			'.pon-card{background:var(--pon-card,rgba(127,127,127,.06));border:1px solid var(--pon-border,rgba(127,127,127,.25));border-radius:8px;padding:10px 12px;min-height:74px}',
			'.pon-card-title{font-size:11px;text-transform:uppercase;letter-spacing:.04em;opacity:.7;margin-bottom:6px}',
			'.pon-card-value{font-size:19px;font-weight:600;font-variant-numeric:tabular-nums}',
			'.pon-card-sub{font-size:12px;opacity:.75;margin-top:4px}',
			'.pon-section{background:var(--pon-card,rgba(127,127,127,.06));border:1px solid var(--pon-border,rgba(127,127,127,.25));border-radius:8px;padding:12px 14px;margin:12px 0}',
			'.pon-section>h3{font-size:15px;font-weight:600;margin:0 0 10px;padding:0 0 8px;border-bottom:1px solid var(--pon-border,rgba(127,127,127,.25))}',
			'.pon-facts{width:100%;border-collapse:collapse}',
			'.pon-facts tr{border-bottom:1px solid var(--pon-border,rgba(127,127,127,.15))}',
			'.pon-facts tr:last-child{border-bottom:0}',
			'.pon-facts td{padding:5px 0;vertical-align:top}',
			'.pon-key{width:38%;opacity:.75;padding-right:12px!important}',
			'.pon-val{font-variant-numeric:tabular-nums}',
			'.pon-col-ok{color:#1fa34a;font-weight:600}',
			'.pon-col-warn{color:#d68910;font-weight:600}',
			'.pon-col-err{color:#e05555;font-weight:600}',
			'.pon-col-skip{opacity:.7}',
			'.pon-col-none{color:inherit}',
			'.pon-note{font-size:12px;opacity:.8;margin-top:8px}',
			'.pon-sub{font-size:12px;opacity:.7;margin-top:8px}',
			'.pon-pre{max-height:180px;overflow:auto;font-size:12px;padding:8px;margin:4px 0 0;background:var(--pon-card,rgba(127,127,127,.08));border:1px solid var(--pon-border,rgba(127,127,127,.25));border-radius:6px;white-space:pre-wrap;word-break:break-all}',
			'.pon-list{margin:6px 0 0;padding-left:20px}',
			'.pon-list li{margin:2px 0}',
			'.pon-alert{border:1px solid var(--pon-border,rgba(127,127,127,.25));border-left:3px solid #d68910;border-radius:8px;padding:10px 14px;margin:0 0 12px;background:var(--pon-card,rgba(127,127,127,.06))}',
			'.pon-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 12px}',
			'.pon-muted{opacity:.7;font-size:12px}'
		].join('');
	},

	handleSave: null,
	handleSaveApply: null,
	handleReset: null
});
