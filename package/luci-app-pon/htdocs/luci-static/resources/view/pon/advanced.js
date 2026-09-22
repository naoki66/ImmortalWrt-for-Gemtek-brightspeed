'use strict';
'require view';
'require rpc';
'require ui';

/*
 * PON diagnostics: protocol plane, raw kernel logs, and destructive actions.
 *
 * The log view exists because the optical module's DDM values only ever reach
 * userspace through printk: the en7572 driver answers bob_info/bosa_info by
 * writing to /proc/lddla/debug and the reply lands in the kernel log. When a DDM
 * field shows as null on the status page, this is where the reason is.
 */

var callProto = rpc.declare({ object: 'luci.pon', method: 'getProto' });
var callLogs  = rpc.declare({ object: 'luci.pon', method: 'getLogs', params: [ 'lines' ] });
var callApply = rpc.declare({ object: 'luci.pon', method: 'apply' });

var EMPTY = '\u2014';

function text(v) {
	if (v === null || v === undefined || v === '') return EMPTY;
	return String(v);
}

function yesno(v) {
	if (v === null || v === undefined) return EMPTY;
	return v ? '是' : '否';
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

return view.extend({
	load: function () {
		return Promise.all([ callProto(), callLogs(300) ]);
	},

	render: function (res) {
		var proto = res[0] || {};
		var logs = res[1] || {};
		var rep = proto.report || null;

		var protoRows = [];

		if (rep) {
			protoRows.push([ '模式', text(rep.mode) ]);

			if (rep.omci) {
				protoRows.push([ 'OMCI 设备', text(rep.omci.device) ]);
				protoRows.push([ 'OMCI 身份已配置', yesno(rep.omci.configured),
					rep.omci.configured ? 'ok' : 'warn' ]);
				protoRows.push([ 'OMCI 接口已创建', yesno(rep.omci.transport),
					rep.omci.transport ? 'ok' : 'warn' ]);
				protoRows.push([ 'OMCI 运行态', text(rep.omci.runtime), 'warn' ]);
			}

			if (rep.oam) {
				protoRows.push([ 'OAM 设备', text(rep.oam.device) ]);
				protoRows.push([ 'OAM 身份已配置', yesno(rep.oam.configured),
					rep.oam.configured ? 'ok' : 'warn' ]);
				protoRows.push([ 'CTC OAM', yesno(rep.oam.ctc_oam) ]);
				protoRows.push([ 'OAM 接口已创建', yesno(rep.oam.transport),
					rep.oam.transport ? 'ok' : 'warn' ]);
				protoRows.push([ 'OAM 运行态', text(rep.oam.runtime), 'warn' ]);
			}
		}

		function pre(title, body) {
			return E('div', {}, [
				E('div', { 'class': 'pon-sub' }, [ title ]),
				E('pre', { 'class': 'pon-pre' }, [ body || '（无内容）' ])
			]);
		}

		return E('div', { 'class': 'pon-page' }, [
			E('style', {}, [ this.css() ]),
			E('h2', {}, [ 'PON 高级 / 诊断' ]),

			E('div', { 'class': 'pon-section' }, [
				E('h3', {}, [ '管理平面' ]),
				proto.ok
					? facts(protoRows)
					: E('div', { 'class': 'pon-alert' }, [ '无法读取管理平面状态: ' + text(proto.error) ]),
				E('div', { 'class': 'pon-note' }, [
					'OMCI / OAM 的用户态引擎不在本仓库范围内，因此「运行态」一列只会显示 available 之外的值。',
					E('br'),
					'EPON 的 OAM 认证状态只能通过厂商 CLI 读取，本页不会代为调用。'
				])
			]),

			E('div', { 'class': 'pon-section' }, [
				E('h3', {}, [ '内核日志（含光模块 DDM 应答）' ]),
				pre('最近 ' + text(logs.lines) + ' 行，已按 PON 关键字过滤', logs.kernel)
			]),

			E('div', { 'class': 'pon-section' }, [
				E('h3', {}, [ '系统日志' ]),
				pre('logread 过滤结果', logs.syslog)
			]),

			E('div', { 'class': 'pon-section' }, [
				E('h3', {}, [ '操作' ]),
				E('div', { 'class': 'pon-actions' }, [
					E('button', {
						'class': 'btn cbi-button cbi-button-apply',
						'click': ui.createHandlerFn(this, function () {
							return callApply().then(function (r) {
								ui.addNotification(null, E('p', {}, [
									r && r.ok ? '已下发配置' : ('下发失败: ' + (r && r.error))
								]), r && r.ok ? 'info' : 'error');
							});
						})
					}, [ '下发配置' ]),
					E('button', {
						'class': 'btn cbi-button',
						'click': ui.createHandlerFn(this, function () {
							location.reload();
						})
					}, [ '重新读取' ])
				]),
				E('div', { 'class': 'pon-hint' }, [
					'「下发配置」等同于 /etc/init.d/pon apply，会重载 PON 内核模块。'
				])
			])
		]);
	},

	css: function () {
		return [
			'.pon-page{font-size:13px;line-height:1.5}',
			'.pon-section{background:var(--pon-card,rgba(127,127,127,.06));border:1px solid var(--pon-border,rgba(127,127,127,.25));border-radius:8px;padding:12px 14px;margin:12px 0}',
			'.pon-section>h3{font-size:15px;font-weight:600;margin:0 0 10px;padding:0 0 8px;border-bottom:1px solid var(--pon-border,rgba(127,127,127,.25))}',
			'.pon-facts{width:100%;border-collapse:collapse}',
			'.pon-facts tr{border-bottom:1px solid var(--pon-border,rgba(127,127,127,.15))}',
			'.pon-facts tr:last-child{border-bottom:0}',
			'.pon-facts td{padding:5px 0;vertical-align:top}',
			'.pon-key{width:38%;opacity:.75;padding-right:12px!important}',
			'.pon-col-ok{color:#1fa34a;font-weight:600}',
			'.pon-col-warn{color:#d68910;font-weight:600}',
			'.pon-pre{max-height:320px;overflow:auto;font-size:12px;padding:8px;margin:4px 0 0;background:var(--pon-card,rgba(127,127,127,.08));border:1px solid var(--pon-border,rgba(127,127,127,.25));border-radius:6px;white-space:pre-wrap;word-break:break-all}',
			'.pon-sub{font-size:12px;opacity:.7;margin-top:10px}',
			'.pon-note{font-size:12px;opacity:.85;margin-top:8px}',
			'.pon-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0}',
			'.pon-hint{font-size:12px;opacity:.75;margin-top:8px}',
			'.pon-alert{border:1px solid var(--pon-border,rgba(127,127,127,.25));border-left:3px solid #d68910;border-radius:8px;padding:10px 14px;margin:0;background:var(--pon-card,rgba(127,127,127,.06))}'
		].join('');
	},

	handleSave: null,
	handleSaveApply: null,
	handleReset: null
});
