'use strict';
'require view';
'require rpc';
'require ui';

/*
 * PON subscriber authentication.
 *
 * GPON and EPON keep separate identities: OMCI serial/LOID for GPON, OAM
 * LLID/MAC/LOID for EPON. Which set is actually used is decided by the mode
 * configured on the Mode page, so the irrelevant group is collapsed here
 * rather than removed -- pre-staging the other identity is a normal thing to do
 * before switching modes.
 *
 * Secrets are never sent back to the browser: getConfig returns
 * `*_password_set` flags instead. A password is only written when the operator
 * types a new one, or ticks the matching "clear" box.
 */

var callGetConfig = rpc.declare({ object: 'luci.pon', method: 'getConfig', params: [ 'reveal' ] });
var callSetConfig = rpc.declare({ object: 'luci.pon', method: 'setConfig', params: [ 'payload' ] });
var callGetModes  = rpc.declare({ object: 'luci.pon', method: 'getModes' });
var callApply     = rpc.declare({ object: 'luci.pon', method: 'apply' });

function input(id, value, type, extra) {
	var attrs = Object.assign({
		'id': id,
		'type': type || 'text',
		'class': 'cbi-input-text',
		'value': (value === null || value === undefined) ? '' : value
	}, extra || {});

	return E('input', attrs);
}

function checkbox(id, checked) {
	var attrs = { 'id': id, 'type': 'checkbox', 'class': 'cbi-input-checkbox' };

	// The attribute is omitted entirely when false: passing null would leave
	// the literal string "null" as the value, which still counts as checked.
	if (checked) attrs.checked = 'checked';

	return E('input', attrs);
}

function select(id, options, value) {
	return E('select', { 'id': id, 'class': 'cbi-input-select' },
		options.map(function (o) {
			var attrs = { 'value': o[0] };

			if (o[0] === value) attrs.selected = 'selected';

			return E('option', attrs, [ o[1] ]);
		}));
}

function field(label, control, hint) {
	return E('div', { 'class': 'pon-field' }, [
		E('label', {}, [ label ]),
		control,
		hint ? E('div', { 'class': 'pon-hint' }, [ hint ]) : ''
	]);
}

function secretField(id, isSet, clearId) {
	return E('div', { 'class': 'pon-field' }, [
		E('label', { 'for': id }, [ '密码' ]),
		input(id, '', 'password', { 'placeholder': isSet ? '已设置，留空表示不修改' : '未设置' }),
		E('div', { 'class': 'pon-hint' }, [
			E('label', {}, [ checkbox(clearId, false), ' 清除该密码' ])
		])
	]);
}

function row(cells) {
	return E('tr', {}, cells.map(function (c) {
		return E('td', {}, [ c ]);
	}));
}

return view.extend({
	load: function () {
		return Promise.all([ callGetConfig(0), callGetModes() ]);
	},

	render: function (res) {
		var self = this;
		var cfg = (res[0] && res[0].ok) ? res[0] : null;
		var modes = (res[1] && res[1].ok) ? res[1].modes : [];

		if (!cfg) {
			return E('div', { 'class': 'pon-page' }, [
				E('h2', {}, [ 'PON 认证' ]),
				E('div', { 'class': 'pon-alert' }, [ '无法读取 PON 配置，请检查 /etc/config/pon。' ])
			]);
		}

		var gpon = cfg.gpon || {};
		var epon = cfg.epon || {};

		var modeSelect = select('pon-mode', modes.map(function (m) {
			return [ m.value, m.value + '（参数 ' + m.param + '）' ];
		}), cfg.line.mode);

		var gponBox = E('div', { 'class': 'pon-group', 'id': 'pon-group-gpon' }, [
			E('h3', {}, [ 'GPON / OMCI 身份' ]),
			field('序列号 SN（4 字节厂商码 + 8 字节序列号）', input('pon-gpon-serial', gpon.serial)),
			field('密码编码', select('pon-gpon-pwformat',
				[ [ 'ascii', 'ASCII' ], [ 'hex', 'Hex' ] ], gpon.password_format)),
			secretField('pon-gpon-password', gpon.password_set, 'pon-gpon-password-clear'),
			field('LOID', input('pon-gpon-loid', gpon.loid)),
			secretField('pon-gpon-loidpw', gpon.loid_password_set, 'pon-gpon-loidpw-clear')
		]);

		var eponBox = E('div', { 'class': 'pon-group', 'id': 'pon-group-epon' }, [
			E('h3', {}, [ 'EPON / OAM 身份' ]),
			field('LLID 索引', input('pon-epon-llid', epon.llid_index, 'number')),
			E('div', { 'class': 'pon-field' }, [
				E('label', { 'for': 'pon-epon-llid-mask' }, [ 'LLID 掩码' ]),
				E('label', {}, [ checkbox('pon-epon-llid-mask', epon.llid_mask), ' 启用' ])
			]),
			field('PON MAC', input('pon-epon-mac', epon.mac), '注册阶段 OLT 看到的 ONU MAC'),
			field('LOID', input('pon-epon-loid', epon.loid)),
			secretField('pon-epon-loidpw', epon.loid_password_set, 'pon-epon-loidpw-clear'),
			E('div', { 'class': 'pon-field' }, [
				E('label', { 'for': 'pon-epon-ctc' }, [ 'CTC OAM' ]),
				E('label', {}, [ checkbox('pon-epon-ctc', epon.ctc_oam), ' 启用' ])
			]),
			E('div', { 'class': 'pon-field' }, [
				E('label', { 'for': 'pon-epon-dying' }, [ 'Dying Gasp 告警' ]),
				E('label', {}, [ checkbox('pon-epon-dying', epon.dying_gasp), ' 启用' ])
			]),
			E('div', { 'class': 'pon-field' }, [
				E('label', { 'for': 'pon-epon-rxfec' }, [ '下行 FEC' ]),
				E('label', {}, [ checkbox('pon-epon-rxfec', epon.rx_fec), ' 启用' ])
			]),
			E('div', { 'class': 'pon-field' }, [
				E('label', { 'for': 'pon-epon-txfec' }, [ '上行 FEC' ]),
				E('label', {}, [ checkbox('pon-epon-txfec', epon.tx_fec), ' 启用' ])
			]),
			field('速率模式', input('pon-epon-rate', epon.rate_mode, 'text',
				{ 'placeholder': '例如 10g-1g' }), '留空表示由驱动决定')
		]);

		function isEpon() {
			return String(modeSelect.value).indexOf('epon') >= 0;
		}

		function syncGroups() {
			gponBox.style.display = isEpon() ? 'none' : '';
			eponBox.style.display = isEpon() ? '' : 'none';
		}

		modeSelect.addEventListener('change', function () {
			syncGroups();
			markDirty();
		});

		var dirty = false;
		var dirtyMsg = E('span', { 'class': 'pon-dirty' }, [ '' ]);

		function markDirty() {
			dirty = true;
			dirtyMsg.textContent = '有未保存的修改';
		}

		[ gponBox, eponBox ].forEach(function (box) {
			box.addEventListener('change', markDirty);
			box.addEventListener('input', markDirty);
		});

		function val(id) { return document.getElementById(id).value.trim(); }
		function chk(id) { return document.getElementById(id).checked ? 1 : 0; }

		function buildPayload(includeSecrets) {
			var p = {
				'mode': modeSelect.value,
				'auto_start': chk('pon-autostart'),
				'gpon_serial': val('pon-gpon-serial'),
				'gpon_password_format': val('pon-gpon-pwformat'),
				'gpon_loid': val('pon-gpon-loid'),
				'epon_llid_index': Number(val('pon-epon-llid') || 0),
				'epon_llid_mask': chk('pon-epon-llid-mask'),
				'epon_mac': val('pon-epon-mac'),
				'epon_loid': val('pon-epon-loid'),
				'epon_ctc_oam': chk('pon-epon-ctc'),
				'epon_dying_gasp': chk('pon-epon-dying'),
				'epon_rx_fec': chk('pon-epon-rxfec'),
				'epon_tx_fec': chk('pon-epon-txfec'),
				'epon_rate_mode': val('pon-epon-rate')
			};

			if (includeSecrets) {
				// Only send a password when it was actually typed, otherwise
				// omit the key so the backend leaves the stored value alone.
				var gp = val('pon-gpon-password');
				if (gp) p.gpon_password = gp;
				if (chk('pon-gpon-password-clear')) p.gpon_password_clear = 1;

				var gl = val('pon-gpon-loidpw');
				if (gl) p.gpon_loid_password = gl;
				if (chk('pon-gpon-loidpw-clear')) p.gpon_loid_password_clear = 1;

				var el = val('pon-epon-loidpw');
				if (el) p.epon_loid_password = el;
				if (chk('pon-epon-loidpw-clear')) p.epon_loid_password_clear = 1;
			}

			return p;
		}

		function report(result, then) {
			if (result && result.ok) {
				ui.addNotification(null, E('p', {}, [
					'已保存 ' + result.applied + ' 项配置' +
					(result.applied ? '，需点击「下发配置」后生效' : '')
				]), 'info');
				if (then) then();
				return;
			}

			var detail = result && result.invalid_fields && result.invalid_fields.length
				? ('校验未通过: ' + result.invalid_fields.join(', '))
				: ('保存失败: ' + ((result && result.error) || '未知错误'));

			ui.addNotification(null, E('p', {}, [ detail ]), 'error');
		}

		var page = E('div', { 'class': 'pon-page' }, [
			E('style', {}, [ this.css() ]),
			E('h2', {}, [ 'PON 认证' ]),
			E('div', { 'class': 'pon-section' }, [
				E('h3', {}, [ '线路' ]),
				field('工作模式', modeSelect, '切换模式会重载 PON 内核模块，链路会短暂中断'),
				E('div', { 'class': 'pon-field' }, [
					E('label', { 'for': 'pon-autostart' }, [ '开机自启' ]),
					E('label', {}, [ checkbox('pon-autostart', cfg.line.auto_start), ' 启用' ])
				])
			]),
			gponBox,
			eponBox,
			E('div', { 'class': 'pon-actions' }, [
				E('button', {
					'class': 'btn cbi-button cbi-button-save',
					'click': ui.createHandlerFn(this, function () {
						return callSetConfig(buildPayload(true)).then(function (r) {
							report(r, function () {
								dirty = false;
								dirtyMsg.textContent = '';
							});
						});
					})
				}, [ '保存' ]),
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
				dirtyMsg,
				E('span', { 'class': 'pon-hint' }, [
					'保存只写入 /etc/config/pon；下发才会重载驱动。'
				])
			])
		]);

		syncGroups();

		return page;
	},

	css: function () {
		return [
			'.pon-page{font-size:13px;line-height:1.5}',
			'.pon-section,.pon-group{background:var(--pon-card,rgba(127,127,127,.06));border:1px solid var(--pon-border,rgba(127,127,127,.25));border-radius:8px;padding:12px 14px;margin:12px 0}',
			'.pon-section>h3,.pon-group>h3{font-size:15px;font-weight:600;margin:0 0 10px;padding:0 0 8px;border-bottom:1px solid var(--pon-border,rgba(127,127,127,.25))}',
			'.pon-field{margin:0 0 12px}',
			'.pon-field>label{display:block;font-size:12px;opacity:.8;margin-bottom:4px}',
			'.pon-field input[type=text],.pon-field input[type=password],.pon-field input[type=number],.pon-field select{width:100%;max-width:420px;box-sizing:border-box}',
			'.pon-hint{font-size:12px;opacity:.75;margin-top:4px}',
			'.pon-dirty{font-size:12px;color:#d68910;font-weight:600}',
			'.pon-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:12px 0}',
			'.pon-alert{border:1px solid var(--pon-border,rgba(127,127,127,.25));border-left:3px solid #d68910;border-radius:8px;padding:10px 14px;margin:0 0 12px;background:var(--pon-card,rgba(127,127,127,.06))}'
		].join('');
	},

	handleSave: null,
	handleSaveApply: null,
	handleReset: null
});
