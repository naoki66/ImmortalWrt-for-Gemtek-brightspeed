'use strict';
'require view';
'require rpc';
'require ui';

/*
 * PON mode switch.
 *
 * The configured mode lives in UCI; the mode the kernel module actually loaded
 * with lives in /sys/module/xpon_10g/parameters/mode. Those drift apart between
 * "saved" and "applied", so the page shows both and flags the difference --
 * that mismatch is the usual reason a mode change appears to have done nothing.
 */

var callGetModes  = rpc.declare({ object: 'luci.pon', method: 'getModes' });
var callGetConfig = rpc.declare({ object: 'luci.pon', method: 'getConfig', params: [ 'reveal' ] });
var callSetMode   = rpc.declare({ object: 'luci.pon', method: 'setMode', params: [ 'mode' ] });
var callStatus    = rpc.declare({ object: 'luci.pon', method: 'getStatus' });

var GROUPS = [
	[ 'GPON / XG(S)-PON', [ 'auto', 'gpon', 'xgpon', 'xgspon', 'gpon-sym' ] ],
	[ 'EPON 系列', [ 'epon', '10g-1g-epon', '10g-10g-epon', '1g-1g-epon', 'turbo-epon' ] ],
	[ 'NG-PON2', [ 'ngpon2-10g-10g', 'ngpon2-10g-2g', 'ngpon2-2g-2g' ] ]
];

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

function modeName(modes, param) {
	var found = null;

	if (param === null || param === undefined) return null;

	(modes || []).forEach(function (m) {
		if (String(m.param) === String(param)) found = m.value;
	});

	return found;
}

return view.extend({
	load: function () {
		return Promise.all([ callGetModes(), callGetConfig(0), callStatus() ]);
	},

	render: function (res) {
		var modes = (res[0] && res[0].ok) ? res[0].modes : [];
		var cfg = (res[1] && res[1].ok) ? res[1] : null;
		var report = (res[2] && res[2].report) || null;

		if (!modes.length) {
			return E('div', { 'class': 'pon-page' }, [
				E('style', {}, [ this.css() ]),
				E('h2', {}, [ 'PON 模式' ]),
				E('div', { 'class': 'pon-alert' }, [
					'无法读取模式列表（ponctl mode-map 无输出），请检查 airoha-pon-manager 是否安装。'
				])
			]);
		}

		var current = cfg ? cfg.line.mode : null;
		var loadedParam = report ? report.line.loaded_mode : null;
		var activeName = report ? report.line.active_mode : null;
		var pending = report ? report.line.mode_pending : null;

		var known = {};
		modes.forEach(function (m) { known[m.value] = true; });

		var chosen = { value: current };

		function pick(mode) {
			chosen.value = mode;

			[].forEach.call(document.querySelectorAll('.pon-mode-option'), function (el) {
				el.classList.toggle('pon-mode-selected', el.getAttribute('data-mode') === mode);
			});

			var btn = document.getElementById('pon-mode-apply');

			if (btn) btn.disabled = (mode === current);
		}

		var groups = GROUPS.map(function (g) {
			var items = g[1].filter(function (m) { return known[m]; });

			if (!items.length) return '';

			return E('div', { 'class': 'pon-mode-group' }, [
				E('div', { 'class': 'pon-mode-group-title' }, [ g[0] ]),
				E('div', { 'class': 'pon-mode-list' }, items.map(function (m) {
					var param = '';

					modes.forEach(function (x) { if (x.value === m) param = x.param; });

					return E('div', {
						'class': 'pon-mode-option' +
							((m === current) ? ' pon-mode-selected' : ''),
						'data-mode': m,
						'click': function () { pick(m); }
					}, [
						E('div', { 'class': 'pon-mode-name' }, [ m ]),
						E('div', { 'class': 'pon-mode-param' }, [ '内核参数 ' + param ])
					]);
				}))
			]);
		});

		// Anything the backend reports that is not in our display groups would
		// otherwise be silently unpickable.
		var extra = modes.filter(function (m) {
			var listed = false;

			GROUPS.forEach(function (g) {
				if (g[1].indexOf(m.value) >= 0) listed = true;
			});

			return !listed;
		});

		var page = E('div', { 'class': 'pon-page' }, [
			E('style', {}, [ this.css() ]),
			E('h2', {}, [ 'PON 模式' ]),

			E('div', { 'class': 'pon-section' }, [
				E('h3', {}, [ '当前状态' ]),
				facts([
					[ '配置模式', text(current) ],
					[ '已加载的内核参数', text(loadedParam) ],
					[ '实际模式', text(activeName) ],
					[ '两者是否一致', yesno(pending === null ? null : !pending),
						pending ? 'warn' : 'ok' ]
				]),
				pending ? E('div', { 'class': 'pon-note pon-col-warn' }, [
					'配置的模式与内核已加载的模式不一致，需要点击下方「切换并下发」才会生效。'
				]) : ''
			]),

			E('div', { 'class': 'pon-section' }, [
				E('h3', {}, [ '选择模式' ]),
				E('div', { 'class': 'pon-mode-groups' }, groups),
				extra.length ? E('div', { 'class': 'pon-mode-group' }, [
					E('div', { 'class': 'pon-mode-group-title' }, [ '其它' ]),
					E('div', { 'class': 'pon-mode-list' }, extra.map(function (m) {
						return E('div', {
							'class': 'pon-mode-option',
							'data-mode': m.value,
							'click': function () { pick(m.value); }
						}, [ E('div', { 'class': 'pon-mode-name' }, [ m.value ]) ]);
					}))
				]) : ''
			]),

			E('div', { 'class': 'pon-actions' }, [
				E('button', {
					'id': 'pon-mode-apply',
					'class': 'btn cbi-button cbi-button-apply',
					'disabled': 'disabled',
					'click': ui.createHandlerFn(this, function () {
						var target = chosen.value;

						if (!target || target === current) return;

						return callSetMode(target).then(function (r) {
							if (r && r.ok) {
								ui.addNotification(null, E('p', {}, [
									'已切换到 ' + target + ' 并完成下发'
								]), 'info');
								window.setTimeout(function () { location.reload(); }, 1200);
								return;
							}

							var detail = (r && r.error) || '未知错误';
							var out = (r && r.apply_output) ? ('\n' + r.apply_output) : '';

							ui.addNotification(null, E('p', {}, [
								'切换失败: ' + detail + out
							]), 'error');
						});
					})
				}, [ '切换并下发' ]),
				E('span', { 'class': 'pon-hint' }, [
					'切换会重新加载 PON 内核模块，链路会中断数秒。'
				])
			])
		]);

		return page;
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
			'.pon-note{font-size:12px;opacity:.85;margin-top:8px}',
			'.pon-mode-groups{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}',
			'.pon-mode-group-title{font-size:12px;opacity:.75;margin-bottom:6px}',
			'.pon-mode-list{display:flex;flex-direction:column;gap:4px}',
			'.pon-mode-option{border:1px solid var(--pon-border,rgba(127,127,127,.25));border-radius:6px;padding:7px 10px;cursor:pointer}',
			'.pon-mode-option:hover{background:rgba(127,127,127,.10)}',
			'.pon-mode-selected{border-color:#1fa34a;border-left-width:3px}',
			'.pon-mode-name{font-weight:600}',
			'.pon-mode-param{font-size:12px;opacity:.7}',
			'.pon-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:12px 0}',
			'.pon-hint{font-size:12px;opacity:.75}',
			'.pon-alert{border:1px solid var(--pon-border,rgba(127,127,127,.25));border-left:3px solid #d68910;border-radius:8px;padding:10px 14px;margin:0 0 12px;background:var(--pon-card,rgba(127,127,127,.06))}'
		].join('');
	},

	handleSave: null,
	handleSaveApply: null,
	handleReset: null
});
