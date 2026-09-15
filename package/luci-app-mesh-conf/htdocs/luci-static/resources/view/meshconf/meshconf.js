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

var callGetMeshDiag = rpc.declare({
	object: 'luci.meshconf',
	method: 'getMeshDiag'
});

var callListBackups = rpc.declare({
	object: 'luci.meshconf',
	method: 'listBackups'
});

var callRestoreBackup = rpc.declare({
	object: 'luci.meshconf',
	method: 'restoreBackup',
	params: [ 'name' ]
});

var callBlockMeshPeer = rpc.declare({
	object: 'luci.meshconf',
	method: 'blockMeshPeer',
	params: [ 'iface', 'mac', 'action' ]
});

var callApplyMesh = rpc.declare({
	object: 'luci.meshconf',
	method: 'applyMesh',
	params: [ 'backhaul', 'role', 'wired', 'wireless',
		'mesh_radio', 'mesh_id', 'mesh_key', 'gateway', 'gw_bandwidth', 'gw_sel_class',
		'slave_ip_suffix', 'unified', 'unified_ssid', 'unified_encryption', 'unified_key',
		'ap_sync', 'ap_configs', 'channels',
		'mesh_proto', 'mesh_params', 'bat_algo', 'bat_advanced' ]
});

var callApplyWireless = rpc.declare({
	object: 'luci.meshconf',
	method: 'applyWireless',
	params: [ 'ap_configs', 'channels' ]
});

var callApplyVlans = rpc.declare({
	object: 'luci.meshconf',
	method: 'applyVlans',
	params: [ 'vlans' ]
});

var callGenerateChildConfig = rpc.declare({
	object: 'luci.meshconf',
	method: 'generateChildConfig',
	params: [ 'ip_suffix', 'offset' ]
});

var css = [
	'.meshconf-page{--nm-bg:#fff;--nm-border:#d8dee4;--nm-soft:#f6f8fa;--nm-text:#1f2328;--nm-muted:#5c6773;--nm-blue:#0969da;--nm-green:#1a7f37;--nm-orange:#bc4c00;--nm-red:#cf222e;--nm-purple:#8250df;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;font-size:13px;line-height:1.55;color:var(--nm-text);letter-spacing:0}',
	'.meshconf-page h2{margin:0 0 4px;font-size:21px;line-height:1.3;font-weight:650;color:var(--nm-text)}',
	'.meshconf-page .nm-lede{margin:0 0 14px;color:var(--nm-muted);font-size:12.5px}',
	'.nm-section{margin:0 0 18px;padding:16px 18px;border:1px solid var(--nm-border);border-radius:12px;background:var(--nm-bg);box-shadow:0 1px 2px rgba(16,24,40,.04)}',
	'.nm-title{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0;font-size:15px;font-weight:650}',
	'.nm-subtitle{margin:3px 0 14px;color:var(--nm-muted);font-size:12px}',
	'.nm-muted{color:var(--nm-muted)}',
	'.nm-hint{margin:10px 0 0;font-size:12px;line-height:1.6;color:var(--nm-muted)}',
	'.nm-alert{margin:10px 0 0;padding:9px 12px;border-radius:8px;border:1px solid rgba(188,76,0,.35);background:rgba(188,76,0,.07);color:var(--nm-orange);font-size:12px;line-height:1.6}',
	'.nm-alert.ok{border-color:rgba(26,127,55,.35);background:rgba(26,127,55,.08);color:var(--nm-green)}',
	'.nm-alert.hidden{display:none}',
	'',
	'.nm-status{display:flex;gap:8px;flex-wrap:wrap;align-items:center}',
	'.nm-pill{display:inline-flex;align-items:center;height:25px;padding:0 10px;border-radius:999px;border:1px solid var(--nm-border);background:var(--nm-soft);font-size:12px;font-weight:600;white-space:nowrap}',
	'.nm-pill.ok{color:var(--nm-green);border-color:rgba(26,127,55,.35);background:rgba(26,127,55,.08)}',
	'.nm-pill.warn{color:var(--nm-orange);border-color:rgba(188,76,0,.35);background:rgba(188,76,0,.08)}',
	'.nm-pill.info{color:var(--nm-blue);border-color:rgba(9,105,218,.35);background:rgba(9,105,218,.08)}',
	'.nm-pill .dot{width:6px;height:6px;border-radius:50%;background:currentColor;margin-right:6px;opacity:.85}',
	'.nm-infogrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(148px,1fr));gap:8px;margin-top:12px}',
	'.nm-info{border:1px solid var(--nm-border);border-radius:10px;background:var(--nm-soft);padding:9px 11px;min-width:0}',
	'.nm-info-label{font-size:11px;font-weight:650;color:var(--nm-muted);margin-bottom:3px}',
	'.nm-info-value{font-size:14px;font-weight:650;word-break:break-all;line-height:1.35}',
	'.nm-info-sub{font-size:11px;color:var(--nm-muted);margin-top:2px;word-break:break-all}',
	'',
	'.nm-group{margin-top:18px;padding-top:16px;border-top:1px dashed var(--nm-border)}',
	'.nm-group.first{border-top:0;padding-top:0;margin-top:4px}',
	'.nm-group-head{display:flex;align-items:center;gap:8px;margin:0 0 3px;font-size:13px;font-weight:650}',
	'.nm-step{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:var(--nm-blue);color:#fff;font-size:11px;font-weight:700;flex:0 0 auto}',
	'.nm-group-desc{margin:0 0 12px;padding-left:28px;color:var(--nm-muted);font-size:12px;line-height:1.6}',
	'.nm-group.hidden{display:none}',
	'.nm-field.hidden{display:none}',
	'',
	'.nm-choices{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}',
	'.nm-choices.two{grid-template-columns:repeat(2,minmax(0,1fr))}',
	'.nm-choice{position:relative;display:block;border:1px solid var(--nm-border);border-radius:10px;background:var(--nm-soft);padding:12px 14px;cursor:pointer;transition:border-color .18s,box-shadow .18s,background .18s}',
	'.nm-choice input{position:absolute;width:1px;height:1px;opacity:0;margin:0}',
	'.nm-choice:hover{border-color:rgba(9,105,218,.45)}',
	'.nm-choice.active{border-color:var(--nm-blue);background:rgba(9,105,218,.06);box-shadow:0 0 0 1px var(--nm-blue)}',
	'.nm-choice:focus-within{outline:2px solid var(--nm-blue);outline-offset:2px}',
	'.nm-choice.disabled{opacity:.5;cursor:not-allowed}',
	'.nm-choice.disabled:hover{border-color:var(--nm-border)}',
	'.nm-choice-title{display:flex;align-items:center;gap:7px;font-size:13px;font-weight:650}',
	'.nm-choice-desc{display:block;margin-top:4px;color:var(--nm-muted);font-size:12px;line-height:1.5}',
	'.nm-choice-dot{width:8px;height:8px;border-radius:50%;background:var(--nm-border);flex:0 0 auto}',
	'.nm-choice.active .nm-choice-dot{background:var(--nm-blue)}',
	'',
	'.nm-form{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:12px}',
	'.nm-field{display:flex;flex-direction:column;gap:5px;min-width:0}',
	'.nm-field>label{font-size:12px;font-weight:600;color:var(--nm-muted)}',
	'.nm-field input,.nm-field select{min-height:36px;border:1px solid var(--nm-border);border-radius:8px;padding:7px 10px;background:var(--nm-bg);color:var(--nm-text);font-size:13px;box-sizing:border-box;width:100%;font-family:inherit}',
	'.nm-field input:focus,.nm-field select:focus{outline:none;border-color:var(--nm-blue);box-shadow:0 0 0 3px rgba(9,105,218,.15)}',
	'.nm-field input:disabled,.nm-field select:disabled{opacity:.55;cursor:not-allowed}',
	'.nm-field.wide{grid-column:1 / -1}',
	'.nm-field.inline{flex-direction:row;align-items:center;gap:8px;min-height:36px}',
	'.nm-field.inline>label{font-size:13px;font-weight:400;color:var(--nm-text);cursor:pointer;display:inline-flex;align-items:center;gap:7px}',
	'.nm-field.inline input[type=checkbox]{width:15px;height:15px;min-height:0;margin:0}',
	'.nm-radio-line{display:flex;gap:18px;flex-wrap:wrap;min-height:36px;align-items:center}',
	'.nm-radio-line label{display:inline-flex;gap:7px;align-items:center;font-weight:400;color:var(--nm-text);font-size:13px;cursor:pointer}',
	'.nm-radio-line input{margin:0}',
	'',
	'.nm-ap-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:10px;margin-top:12px}',
	'.nm-ap-radio{border:1px solid var(--nm-border);border-radius:10px;padding:11px 12px;background:var(--nm-soft)}',
	'.nm-ap-radio-title{display:flex;align-items:center;justify-content:space-between;gap:8px;font-weight:650;font-size:13px}',
	'.nm-band{display:inline-flex;align-items:center;height:19px;padding:0 7px;border-radius:5px;font-size:11px;font-weight:650;background:rgba(9,105,218,.10);color:var(--nm-blue)}',
	'.nm-ap-radio-meta{margin:2px 0 9px;color:var(--nm-muted);font-size:11.5px;word-break:break-all}',
	'.nm-ap-radio .nm-form{margin-top:0;grid-template-columns:1fr 1fr;gap:9px}',
	'.nm-ap-radio .nm-field.wide{grid-column:1 / -1}',
	'',
	'.nm-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;padding-top:14px;border-top:1px solid var(--nm-border)}',
	'.nm-actions .cbi-button{min-height:36px}',
	'',
	'.nm-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(116px,1fr));gap:8px;margin:12px 0}',
	'.nm-stat{border:1px solid var(--nm-border);border-radius:10px;background:var(--nm-soft);padding:9px 12px}',
	'.nm-stat-value{font-size:19px;font-weight:700;line-height:1.25;color:var(--nm-text)}',
	'.nm-stat-label{font-size:11px;color:var(--nm-muted)}',
	'.nm-topology{width:100%;box-sizing:border-box;margin:0 auto;border:1px solid var(--nm-border);border-radius:12px;background:var(--nm-soft);overflow:hidden}',
	'.nm-topology svg{display:block;width:100%;height:auto}',
	'.nm-legend{display:flex;gap:16px;flex-wrap:wrap;align-items:center;margin:10px 0 0;font-size:12px;color:var(--nm-muted)}',
	'.nm-legend i{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:5px;margin-right:6px;vertical-align:-3px;color:#fff;font-size:10px;font-weight:700;font-style:normal}',
	'.nm-legend .k-local{background:#0969da}.nm-legend .k-mesh{background:rgba(130,80,223,.9)}.nm-legend .k-lan{background:rgba(26,127,55,.9)}',
	'.nm-empty{display:flex;flex-direction:column;justify-content:center;min-height:380px;box-sizing:border-box;padding:38px 20px;text-align:center;color:var(--nm-muted)}',
	'.nm-empty strong{display:block;color:var(--nm-text);font-size:14px;margin-bottom:5px}',
	'.nm-config-preview{width:100%;min-height:180px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:12px;white-space:pre;box-sizing:border-box}',
	'',
	'.nm-t-card{fill:var(--nm-bg);stroke:var(--nm-border);stroke-width:1}',
	'.nm-t-card.local{fill:rgba(9,105,218,.10);stroke:#0969da;stroke-width:2}',
	'.nm-t-card.mesh{fill:rgba(130,80,223,.09);stroke:rgba(130,80,223,.5)}',
	'.nm-t-card.lan{fill:rgba(26,127,55,.09);stroke:rgba(26,127,55,.45)}',
	'.nm-t-badge.local{fill:#0969da}',
	'.nm-t-badge.mesh{fill:rgba(130,80,223,.9)}',
	'.nm-t-badge.lan{fill:rgba(26,127,55,.9)}',
	'.nm-t-glyph{font-size:14px;font-weight:700;fill:#fff;text-anchor:middle;font-style:normal}',
	'.nm-t-title{font-size:13px;font-weight:650;fill:var(--nm-text)}',
	'.nm-t-sub{font-size:10.5px;fill:var(--nm-muted)}',
	'.nm-t-tag{font-size:9.5px;font-weight:650;fill:var(--nm-muted)}',
	'.nm-t-col{font-size:12px;font-weight:650;fill:var(--nm-muted);letter-spacing:.04em}',
	'.nm-t-link{fill:none;stroke:rgba(26,127,55,.55);stroke-width:2}',
	'.nm-t-link.mesh{stroke:rgba(130,80,223,.6);stroke-width:2;stroke-dasharray:6 4}',
	'.nm-t-lq{font-size:9px;fill:var(--nm-muted)}',
	/* multi-SSID editor */
	'.nm-ssid-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:12px 0 7px;font-size:12px;font-weight:650;color:var(--nm-muted)}',
	'.nm-ssid-list{display:flex;flex-direction:column;gap:8px}',
	'.nm-ssid-row{border:1px solid var(--nm-border);border-radius:9px;background:var(--nm-bg);padding:9px 10px}',
	'.nm-ssid-row.removed{opacity:.6;border-style:dashed}',
	'.nm-ssid-top{display:flex;align-items:center;gap:8px}',
	'.nm-check{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--nm-text);cursor:pointer;white-space:nowrap;flex:0 0 auto}',
	'.nm-check input{width:15px;height:15px;margin:0}',
	'.nm-ssid-name{flex:1 1 auto;min-width:0;height:34px;border:1px solid var(--nm-border);border-radius:8px;padding:6px 10px;background:var(--nm-bg);color:var(--nm-text);font-size:13px;box-sizing:border-box;font-family:inherit}',
	'.nm-ssid-name:focus{outline:none;border-color:var(--nm-blue);box-shadow:0 0 0 3px rgba(9,105,218,.15)}',
	'.nm-ssid-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px}',
	'.nm-ssid-opts{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:9px;padding-top:8px;border-top:1px dashed var(--nm-border)}',
	'.nm-ssid-opts .nm-check{font-size:12px;color:var(--nm-muted)}',
	'.nm-mini{min-height:28px;padding:0 10px;font-size:12px;flex:0 0 auto}',
	/* VLAN segmentation */
	'.nm-vlan-list{display:flex;flex-direction:column;gap:10px}',
	'.nm-vlan-row{border:1px solid var(--nm-border);border-radius:10px;background:var(--nm-soft);padding:11px 12px}',
	'.nm-vlan-row.removed{opacity:.6;border-style:dashed}',
	'.nm-vlan-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:9px}',
	'.nm-vlan-title{font-size:13px;font-weight:650;margin-right:auto}',
	'.nm-tag{display:inline-flex;align-items:center;height:19px;padding:0 7px;border-radius:5px;font-size:11px;font-weight:650;background:rgba(130,80,223,.12);color:var(--nm-purple)}',
	'.nm-vlan-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(148px,1fr));gap:9px}',
	'.nm-ports{display:flex;flex-wrap:wrap;gap:8px;margin-top:9px;padding-top:9px;border-top:1px dashed var(--nm-border)}',
	'.nm-port-item{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--nm-muted)}',
	'.nm-port-item select{min-height:28px;border:1px solid var(--nm-border);border-radius:7px;padding:3px 6px;background:var(--nm-bg);color:var(--nm-text);font-size:12px;font-family:inherit}',
	/* warnings / banners */
	'.nm-banner{display:flex;gap:8px;align-items:flex-start;margin:12px 0 0;padding:9px 12px;border-radius:9px;font-size:12px;line-height:1.6;border:1px solid rgba(188,76,0,.35);background:rgba(188,76,0,.07);color:var(--nm-orange)}',
	'.nm-banner.bad{border-color:rgba(207,34,46,.4);background:rgba(207,34,46,.08);color:var(--nm-red)}',
	'.nm-banner.info{border-color:rgba(9,105,218,.35);background:rgba(9,105,218,.07);color:var(--nm-blue)}',
	'.nm-banner strong{display:block;margin-bottom:2px}',
	'.nm-banner.hidden{display:none}',
	/* 802.11s / batman diagnostics */
	'.nm-details{margin-top:12px;border:1px solid var(--nm-border);border-radius:10px;background:var(--nm-soft);overflow:hidden}',
	'.nm-details>summary{cursor:pointer;padding:9px 12px;font-size:12.5px;font-weight:650;list-style:none}',
	'.nm-details>summary::-webkit-details-marker{display:none}',
	'.nm-details>summary::before{content:"▸";display:inline-block;margin-right:8px;transition:transform .15s}',
	'.nm-details[open]>summary::before{content:"▾"}',
	'.nm-details[open]>summary{border-bottom:1px dashed var(--nm-border)}',
	'.nm-details .nm-form{margin:0;padding:12px}',
	'.nm-table{width:100%;border-collapse:collapse;margin-top:10px;font-size:12px}',
	'.nm-table th,.nm-table td{border:1px solid var(--nm-border);padding:5px 8px;text-align:left;vertical-align:top;word-break:break-all}',
	'.nm-table th{background:var(--nm-soft);font-weight:650;color:var(--nm-muted);white-space:nowrap}',
	'.nm-table td.num{text-align:right;white-space:nowrap}',
	'.nm-mono{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:11.5px}',
	'.nm-state{display:inline-flex;align-items:center;height:19px;padding:0 7px;border-radius:5px;font-size:11px;font-weight:650;background:var(--nm-soft);color:var(--nm-muted)}',
	'.nm-state.estab{background:rgba(26,127,55,.12);color:var(--nm-green)}',
	'.nm-state.listen{background:rgba(188,76,0,.12);color:var(--nm-orange)}',
	'.nm-state.blocked{background:rgba(207,34,46,.12);color:var(--nm-red)}',
	'.nm-kv{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:6px;margin-top:10px}',
	'.nm-kv-item{display:flex;justify-content:space-between;gap:10px;border:1px solid var(--nm-border);border-radius:7px;background:var(--nm-soft);padding:4px 9px;font-size:12px}',
	'.nm-kv-item span:last-child{font-weight:650}',
	/* rollback */
	'.nm-backups{display:flex;flex-direction:column;gap:6px;margin-top:10px}',
	'.nm-backup{display:flex;align-items:center;gap:10px;justify-content:space-between;border:1px solid var(--nm-border);border-radius:8px;background:var(--nm-soft);padding:6px 10px;font-size:12px}',
	'.nm-backup .nm-mono{flex:1 1 auto}',
	'.nm-scroll{max-height:280px;overflow:auto}',
	'@media(max-width:900px){.nm-choices{grid-template-columns:1fr}.nm-choices.two{grid-template-columns:1fr}}',
	'@media(max-width:760px){.nm-form,.nm-ap-radio .nm-form{grid-template-columns:1fr}}'
].join('\n');

var darkVars = ':root{--nm-bg:#1e1f22;--nm-border:#3a3d42;--nm-soft:#26282d;--nm-text:#f0f3f6;--nm-muted:#a7adb5;--nm-blue:#4d9cf6;--nm-green:#4ac26b;--nm-orange:#e3934a;--nm-red:#f47067;--nm-purple:#a98bf5}.nm-t-card.local{fill:rgba(77,156,246,.16);stroke:#4d9cf6}.nm-t-card.mesh{fill:rgba(169,139,245,.14);stroke:rgba(169,139,245,.6)}.nm-t-card.lan{fill:rgba(74,194,107,.13);stroke:rgba(74,194,107,.5)}.nm-t-link{stroke:rgba(74,194,107,.6)}.nm-t-link.mesh{stroke:rgba(169,139,245,.7)}.nm-t-badge.local{fill:#4d9cf6}.nm-t-badge.mesh{fill:rgba(169,139,245,.95)}.nm-t-badge.lan{fill:rgba(74,194,107,.95)}';

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

// Roaming happens between nodes on the same band, so radios of different
// bands may advertise different SSIDs (e.g. separate 2.4G / 5G / 6G names).
// Only multiple enabled radios inside one band must share SSID / encryption
// / key.
//
// Preferred non-overlapping channels per band, shared with the backend:
// child node N picks entry ((N-master) mod length) for each band, so APs on
// the same band never share a channel. 2.4G/5G/6G are different bands and do
// not need to differ from each other on the same node.
var CHANNEL_SPREAD = {
	'2g': [ '1', '6', '11', '2', '7', '12', '3', '8', '13' ],
	'5g': [ '36', '149', '44', '153', '52', '157', '60', '161', '100', '165' ],
	'6g': [ '37', '5', '69', '101', '133', '165', '197', '229' ]
};

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

// Channel widths offered per radio. Mixed generation hardware (802.11ax
// peering with 802.11ac only peers) has to use the same width on both ends,
// so this is editable instead of being inherited from the board defaults.
var HTMODES = [ 'auto', 'NOHT', 'HT20', 'HT40', 'VHT20', 'VHT40', 'VHT80', 'VHT80_80', 'VHT160',
	'HE20', 'HE40', 'HE80', 'HE80_80', 'HE160', 'EHT20', 'EHT40', 'EHT80', 'EHT160' ];

// Backhaul L2 routing: batman-adv (B.A.T.M.A.N. IV / V, supports the gateway
// role used by master/slave) or plain 802.11s HWMP (kernel built in, no
// batman-adv at all).
var MESH_PROTOS = [
	[ 'batman', _('batman-adv（推荐）'), _('自带网关选举与环路避免，支持主/从节点的出口统一管理') ],
	[ 'hwmp', _('802.11s HWMP'), _('纯内核路由、开销最小，但没有网关选举，适合纯桥接或已另有出口网关') ]
];

var BATMAN_ALGOS = [
	[ 'BATMAN_IV', 'BATMAN IV', _('兼容性最好，旧设备默认算法') ],
	[ 'BATMAN_V', 'BATMAN V', _('基于吞吐量的判优，新设备推荐') ]
];

// batman-adv tunables surfaced in the advanced block. Anything left empty
// falls back to the default shown here on the device.
var BATMAN_ADV_FIELDS = [
	[ 'hop_penalty', '0-255', 30, _('每跳惩罚') ],
	[ 'orig_interval', '1-100000', 1000, _('OGM 间隔 (ms)') ],
	[ 'multicast_fanout', '1-64', 16, _('组播扇出') ],
	[ 'log_level', '0-15', 0, _('日志级别') ]
];

// 802.11s operating parameters, exactly as netifd's mac80211.sh declares
// them (MP_CONFIG_INT / _BOOL / _STRING). The upstream typo
// mesh_sync_offset_max_neighor is kept so the generated UCI matches.
// An empty field removes the option and restores the kernel default.
var MESH_PARAM_FIELDS = [
	[ 'mesh_ttl', 'int', _('Mesh TTL'), _('HWMP 报文生存跳数') ],
	[ 'mesh_element_ttl', 'int', _('元素 TTL (跳)'), _('网内广播元素的生存跳数') ],
	[ 'mesh_plink_timeout', 'int', _('邻居链路超时 (s)'), _('超过该时间无活动则断开 peer link') ],
	[ 'mesh_max_peer_links', 'int', _('最大邻居数'), _('本接口允许建立的 peer link 上限') ],
	[ 'mesh_max_retries', 'int', _('最大重试次数'), _('peer link 建立过程中的重试上限') ],
	[ 'mesh_retry_timeout', 'int', _('重试超时 (ms)'), '' ],
	[ 'mesh_confirm_timeout', 'int', _('确认超时 (ms)'), '' ],
	[ 'mesh_holding_timeout', 'int', _('保持超时 (ms)'), '' ],
	[ 'mesh_hwmp_max_preq_retries', 'int', _('HWMP PREQ 重试'), '' ],
	[ 'mesh_path_refresh_time', 'int', _('路径刷新时间 (ms)'), '' ],
	[ 'mesh_min_discovery_timeout', 'int', _('最小发现超时 (ms)'), '' ],
	[ 'mesh_hwmp_active_path_timeout', 'int', _('活跃路径超时 (ms)'), '' ],
	[ 'mesh_hwmp_preq_min_interval', 'int', _('PREQ 最小间隔 (ms)'), '' ],
	[ 'mesh_hwmp_net_diameter_traversal_time', 'int', _('网络直径遍历时间 (ms)'), '' ],
	[ 'mesh_hwmp_root_interval', 'int', _('Root 间隔 (ms)'), '' ],
	[ 'mesh_hwmp_rann_interval', 'int', _('RANN 间隔 (ms)'), _('根节点公告间隔') ],
	[ 'mesh_hwmp_confirmation_interval', 'int', _('HWMP 确认间隔 (ms)'), '' ],
	[ 'mesh_hwmp_active_path_to_root_timeout', 'int', _('到根路径超时 (ms)'), '' ],
	[ 'mesh_gate_announcements', 'int', _('网关公告 (0/1)'), _('是否向外通告本节点可作为出口') ],
	[ 'mesh_hwmp_rootmode', 'int', _('根节点模式 (0-4)'), _('0 关闭 / 其余数值对应不同的根通告强度') ],
	[ 'mesh_sync_offset_max_neighor', 'int', _('同步偏移最大邻居数'), _('上游拼写如此，保持与 netifd 一致') ],
	[ 'mesh_rssi_threshold', 'int', _('RSSI 门限 (dBm)'), _('低于该信号强度不建立 peer link，通常为负值') ],
	[ 'mesh_awake_window', 'int', _('唤醒窗口 (ms)'), _('省电模式的 awake window') ],
	[ 'mesh_auto_open_plinks', 'bool', _('自动建立 peer link'), _('关闭后需手工放行邻居') ],
	[ 'mesh_fwding', 'bool', _('Mesh 转发'), _('允许本节点为其它节点转发报文') ],
	[ 'mesh_nolearn', 'bool', _('不学习路径'), _('仅 ucode 版 netifd 支持') ],
	[ 'mesh_power_mode', 'string', _('省电模式'), _('active / light / deep') ]
];

// Channel widths a radio can actually run. Offering HE/EHT on a 2.4G radio
// only produces a config netifd/hostapd rejects, so the list is band aware.
function htmodeList(band, current) {
	var list = [ 'auto' ];
	if (band === '2g')
		list = list.concat([ 'NOHT', 'HT20', 'HT40' ]);
	else if (band === '6g')
		list = list.concat([ 'HE20', 'HE40', 'HE80', 'HE80_80', 'HE160',
			'EHT20', 'EHT40', 'EHT80', 'EHT160' ]);
	else
		list = list.concat(HTMODES.filter(function(m) { return m !== 'auto'; }));
	if (current && list.indexOf(current) < 0)
		list.push(current);
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

function dataTable(headers, rows, emptyText) {
	if (!rows.length)
		return E('p', { 'class': 'nm-hint' }, emptyText || _('无记录'));
	return E('table', { 'class': 'nm-table' }, [
		E('thead', {}, E('tr', {}, headers.map(function(h) { return E('th', {}, h); }))),
		E('tbody', {}, rows.map(function(r) {
			return E('tr', {}, r.map(function(c) { return E('td', {}, c); }));
		}))
	]);
}

function kvGrid(obj) {
	var keys = Object.keys(obj || {});
	if (!keys.length)
		return E('p', { 'class': 'nm-hint' }, _('无'));
	return E('div', { 'class': 'nm-kv' }, keys.map(function(k) {
		return E('div', { 'class': 'nm-kv-item' }, [
			E('span', { 'class': 'nm-mono' }, k),
			E('span', {}, String(obj[k]))
		]);
	}));
}

// 802.11s peer link states: ESTAB is a working link, the OPN_*/CNF_* ones
// mean the handshake is still in progress, BLOCKED means one side refuses.
function plinkStateEl(state) {
	var s = String(state || '').toUpperCase();
	var cls = '';
	if (s.indexOf('ESTAB') === 0)
		cls = 'estab';
	else if (s.indexOf('BLOCK') >= 0)
		cls = 'blocked';
	else if (s)
		cls = 'listen';
	return E('span', { 'class': 'nm-state ' + cls }, String(state || '—'));
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

// Advisories that have to be seen before anything is applied.
//
// The wpad check is the important one: wpad-basic-* ships hostapd and
// wpa_supplicant too, so "the binaries exist" says nothing about 802.11s.
// The backend probes the binary the way netifd does (wpa_supplicant -vmesh).
function warningBanners(status) {
	var out = [];
	var deps = status.deps || {};
	var m11 = status.mesh11sd || {};
	var foreign = status.foreign_mesh || [];

	if (!deps.batctl)
		out.push(E('div', { 'class': 'nm-banner bad' }, [
			E('strong', {}, _('缺少 batctl')),
			E('div', {}, _('batman-adv 无法查询，拓扑与链路诊断会不完整。请安装 batctl-full。'))
		]));

	if (!deps.iw)
		out.push(E('div', { 'class': 'nm-banner' }, [
			E('strong', {}, _('缺少 iw')),
			E('div', {}, _('802.11s 链路诊断（peer link / mpath / mesh_param）不可用。'))
		]));

	if (deps.wpad === false)
		out.push(E('div', { 'class': 'nm-banner bad' }, [
			E('strong', {}, _('未找到 wpad')),
			E('div', {}, _('既没有 hostapd 也没有 wpa_supplicant，无法配置任何无线接口。'))
		]));
	else if (deps.wpad_mesh === false)
		out.push(E('div', { 'class': 'nm-banner bad' }, [
			E('strong', {}, _('当前 wpad 不支持 802.11s')),
			E('div', {}, _('检测到 %s：它带有 hostapd / wpa_supplicant，但未编译 mesh 支持，无线回程永远建立不了 peer link。请安装 wpad-mesh-mbedtls（或 wpad-mesh-openssl、完整 wpad）。')
				.format(status.wpad_variant || _('未知 wpad 变体')))
		]));

	if (m11.installed === true || m11.enabled === true)
		out.push(E('div', { 'class': 'nm-banner' + (m11.enabled ? ' bad' : '') }, [
			E('strong', {}, m11.enabled ? _('mesh11sd 已启用，与本页冲突') : _('已安装 mesh11sd（未启用）')),
			E('div', {}, m11.enabled
				? _('mesh11sd 会在运行时接管并改写 mesh 接口与本页写入的 UCI 配置，两者只能选一个。请先停用 mesh11sd（/etc/init.d/mesh11sd disable && stop）再使用本页。')
				: _('mesh11sd 未启用，与本页无冲突；一旦启用它会接管回程配置。'))
		]));

	if (foreign.length)
		out.push(E('div', { 'class': 'nm-banner' }, [
			E('strong', {}, _('存在本页未管理的 mesh 接口')),
			E('div', {}, _('以下 wifi-iface 处于 mesh 模式但不是本页创建的，本页不会修改也不会删除它们：%s。请确认它们不会与本页的回程抢同一个 radio。')
				.format(foreign.join('、')))
		]));

	return out;
}

// Once a bridge-vlan exists netifd enables 802.1Q filtering on br-lan, and a
// port that is not a member of any VLAN stops forwarding. bat0 is the mesh
// backhaul port, so it silently goes dead unless it is added (tagged) to the
// VLANs that have to cross the mesh. $2 is the view object, needed by the
// "carry everything" shortcut to reach the per VLAN checkboxes.
function bat0VlanBanner(status, view) {
	var mesh = status.mesh || {};
	var bridge = status.bridge || {};
	var vlans = status.vlans || [];

	if (!mesh.enabled) return '';
	var ports = bridge.ports || [];
	if (ports.indexOf('bat0') < 0) return '';
	if (!vlans.length) return '';

	var bat0Vlans = String(bridge.trunk_vlans || '').split(',').filter(Boolean);
	if (bat0Vlans.length >= vlans.length) return '';

	var missing = vlans.map(function(v) { return String(v.vlan); })
		.filter(function(id) { return bat0Vlans.indexOf(id) < 0; });

	var fixBtn = E('button', { 'class': 'cbi-button cbi-button-neutral nm-mini' }, _('全部透传'));
	fixBtn.addEventListener('click', function() {
		((view && view.vlanRows) || []).forEach(function(r) {
			if (r.trunk) r.trunk.checked = true;
		});
	});

	return E('div', { 'class': 'nm-banner' }, [
		E('strong', {}, _('bat0 未加入全部 VLAN，这些网段不会跨节点')),
		E('div', {}, _('br-lan 已开启 802.1Q 过滤，不在任何 VLAN 里的端口不再转发流量。以下 VLAN 没有承载 bat0，流量只留在本机：%s。')
			.format(missing.join('、'))),
		E('div', { 'class': 'nm-muted' }, _('勾选下方各 VLAN 的「经 Mesh 回程透传」，或点下面按钮一次勾齐后再应用。')),
		E('div', { 'class': 'nm-actions' }, [ fixBtn ])
	]);
}

// br-lan runs in one of two L2 modes and every node has to be in the same
// one. Flat: no bridge-vlan, bat0 is an ordinary member, the whole deployment
// shares a subnet. Filtered: bridge-vlan exists, 802.1Q filtering is on and
// bat0 only carries the VLANs it is a tagged member of.
//
// A flat node and a filtered node cannot exchange a single frame even though
// bat0 stays up on both, so the mismatch looks like a healthy mesh that
// carries no traffic at all.
function bridgeModeBanner(status) {
	var mesh = status.mesh || {};
	var bridge = status.bridge || {};
	if (!mesh.enabled) return '';

	var trunk = String(bridge.trunk_vlans || '').split(',').filter(Boolean);

	if ((bridge.mode || 'flat') === 'flat')
		return E('div', { 'class': 'nm-banner info' }, [
			E('strong', {}, _('扁平模式：全网一个二层、一个子网')),
			E('div', {}, _('br-lan 上没有 bridge-vlan，802.1Q 过滤未开启，bat0 直接作为普通成员承载全部流量。')),
			E('div', { 'class': 'nm-muted' }, _('所有节点必须同样保持扁平。任何一台节点一旦建立 bridge-vlan 就切换成分段模式，它与扁平节点之间将完全不通。'))
		]);

	return E('div', { 'class': 'nm-banner info' }, [
		E('strong', {}, _('分段模式：br-lan 已开启 802.1Q 过滤')),
		E('div', {}, trunk.length
			? _('经 Mesh 回程承载的 VLAN：%s；其余 VLAN 只存在于本机。').format(trunk.join('、'))
			: _('当前没有任何 VLAN 承载 bat0，Mesh 回程上不通任何流量。')),
		E('div', { 'class': 'nm-muted' }, _('所有节点必须同为分段模式且承载的 VLAN 集合一致；子节点配置会整份复制本节点的 bridge-vlan，勾选一致即可自动成网。'))
	]);
}

function childConfigText(res) {
	var files = (res && res.files) || {};
	return [ 'network', 'wireless', 'dhcp', 'firewall' ].map(function(name) {
		return '### /etc/config/' + name + '\n' + (files[name] || '');
	}).join('\n\n');
}

// navigator.clipboard is unavailable on plain http, so fall back to the
// legacy selection based copy on a textarea.
function copyElementText(el) {
	if (!el) return;
	if (navigator.clipboard && navigator.clipboard.writeText) {
		navigator.clipboard.writeText(el.value || '');
		return;
	}
	el.focus();
	el.select();
	try { document.execCommand('copy'); } catch (e) {}
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
		// VLAN / interface inventory: the SSID rows bind against these, and
		// the VLAN section edits them.
		this.networks = status.networks || [];
		this.vlans = status.vlans || [];
		this.bridgePorts = (status.bridge && status.bridge.ports) || [];

		var root = E('div', { 'class': 'cbi-map meshconf-page' }, [
			E('h2', {}, _('Mesh 组网')),
			E('p', { 'class': 'nm-lede' }, _('先规划 VLAN 与网络分段，再按“组网方式 → 主从关系 → 回程链路 → 无线覆盖”四步配置；同一组网内所有节点保持一致即可自动成网。')),
		]);

		if (status.error)
			root.appendChild(E('p', { 'class': 'alert-message error' }, _('读取状态失败: %s').format(status.error)));

		this.statusBox = E('div', {}, statusPills(status));
		this.bannerBox = E('div', {}, warningBanners(status));
		root.appendChild(E('div', { 'class': 'nm-section' }, [
			E('div', { 'class': 'nm-title' }, [
				E('span', {}, _('当前状态')),
				E('button', { 'class': 'cbi-button cbi-button-neutral', 'click': ui.createHandlerFn(this, 'refresh') }, _('刷新'))
			]),
			this.statusBox,
			this.bannerBox
		]));

		root.appendChild(this.renderVlanSection(status));
		root.appendChild(this.renderMeshSection(status));
		root.appendChild(this.renderDiagSection());
		root.appendChild(this.renderTopologySection(status));
		root.appendChild(this.renderRollbackSection(status));

		this.updateMeshState();
		this.updateTopology();

		// the container width is only measurable once the page is in the
		// DOM; rebuild the canvas then and on window resize
		window.requestAnimationFrame(L.bind(this.updateTopology, this));
		if (!this._nmResizeBound) {
			this._nmResizeBound = true;
			var resizeTimer = null;
			window.addEventListener('resize', L.bind(function() {
				if (resizeTimer) clearTimeout(resizeTimer);
				resizeTimer = setTimeout(L.bind(this.updateTopology, this), 150);
			}, this));
		}

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

		// Only one backhaul at a time: a second parallel link is not offered,
		// so a node is either wired or wireless. Wired wins when both are
		// somehow configured (e.g. left over from an older build).
		// Without 802.11s capable wpad a wireless backhaul can only produce
		// a config that never peers, so the choice is offered but locked.
		this.noMeshWpad = !!(status.deps && status.deps.wpad_mesh === false);

		var initialBackhaul = (mesh.enabled && !mesh.wired && (mesh.wireless_count || 0) > 0)
			? 'wireless' : 'wired';
		if (this.noMeshWpad) initialBackhaul = 'wired';

		var initialRole = mesh.enabled ? (mesh.role || 'peer') : 'master';

		/* ---- step 1: backhaul (exactly one link) ---- */
		this.backhaulCards = [
			this.backhaulCard('wired', _('有线组网'), _('网线互联，全屋同一子网；稳定性最好，推荐作为主回程。'), initialBackhaul === 'wired'),
			this.backhaulCard('wireless', _('无线组网'), _('802.11s 无线回程，免布线；需要选择用于回程的 5G / 6G radio。'),
				initialBackhaul === 'wireless', this.noMeshWpad)
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
		this.gwSelClassInput = E('input', { 'type': 'number', 'min': '1', 'max': '255', 'value': mesh.gw_sel_class || '20' });

		/* ---- step 3: wireless backhaul ---- */
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

		/* ---- backhaul L2 routing protocol ---- */
		this.meshProtoInput = E('select', {}, MESH_PROTOS.map(function(p) {
			return E('option', { 'value': p[0], 'title': p[2] }, p[1]);
		}));
		this.meshProtoInput.value = mesh.proto || 'batman';
		this.meshProtoInput.addEventListener('change', L.bind(this.updateMeshState, this));

		/* ---- 802.11s / batman-adv advanced knobs ---- */
		this.meshParamInputs = {};
		var meshParams = mesh.params || {};
		var paramFields = MESH_PARAM_FIELDS.map(L.bind(function(f) {
			var name = f[0], type = f[1], el;
			if (type === 'bool') {
				el = E('select', {}, [
					E('option', { 'value': '' }, _('默认')),
					E('option', { 'value': '1' }, _('开启')),
					E('option', { 'value': '0' }, _('关闭'))
				]);
			} else if (type === 'string') {
				el = E('select', {}, [
					E('option', { 'value': '' }, _('默认')),
					E('option', { 'value': 'active' }, 'active'),
					E('option', { 'value': 'light' }, 'light'),
					E('option', { 'value': 'deep' }, 'deep')
				]);
			} else {
				el = E('input', { 'type': 'number' });
			}
			el.value = (meshParams[name] === undefined || meshParams[name] === null)
				? '' : String(meshParams[name]);
			this.meshParamInputs[name] = el;
			return E('div', { 'class': 'nm-field' }, [
				E('label', { 'title': f[3] || '' }, f[2]),
				el
			]);
		}, this));

		var bat = mesh.batman || {};
		this.batAlgoInput = E('select', {}, BATMAN_ALGOS.map(function(a) {
			return E('option', { 'value': a[0], 'title': a[2] }, a[1]);
		}));
		this.batAlgoInput.value = bat.routing_algo || 'BATMAN_IV';
		this.batAdvInputs = {};
		var batFields = BATMAN_ADV_FIELDS.map(L.bind(function(f) {
			var el = E('input', { 'type': 'number' });
			el.placeholder = String(f[2]);
			el.value = (bat[f[0]] === undefined || bat[f[0]] === null) ? '' : String(bat[f[0]]);
			this.batAdvInputs[f[0]] = el;
			return E('div', { 'class': 'nm-field' }, [
				E('label', {}, _('%s（%s）').format(f[3], f[1])),
				el
			]);
		}, this));

		this.meshAdvanced = E('details', { 'class': 'nm-details' }, [
			E('summary', {}, _('802.11s 高级参数（留空 = 内核默认值）')),
			E('div', { 'class': 'nm-form' }, paramFields),
			E('p', { 'class': 'nm-hint', 'style': 'padding:0 12px 12px' },
				_('这些参数直接对应 netifd 的 mesh_param_list。回程只需要 mesh_ttl / mesh_fwding 等少数几项，其余一般保持默认；清空后应用即可恢复默认值。'))
		]);
		this.batAdvanced = E('details', { 'class': 'nm-details' }, [
			E('summary', {}, _('batman-adv 高级参数')),
			E('div', { 'class': 'nm-form' }, [
				E('div', { 'class': 'nm-field wide' }, [ E('label', {}, _('路由算法')), this.batAlgoInput ])
			].concat(batFields)),
			E('p', { 'class': 'nm-hint', 'style': 'padding:0 12px 12px' },
				_('BATMAN V 按吞吐量选路，新硬件推荐；改为 IV/V 会让 bat0 重建并短暂断网。范围外的取值会被设备侧自动收敛到合法值。'))
		]);

		/* ---- step 4: per-radio coverage ---- */
		this.apConfigInputs = apConfigs.map(L.bind(function(config) {
			return this.buildApCard(config, this.networks);
		}, this));

		this.apSyncInput = E('input', { 'type': 'checkbox' });
		this.apSyncInput.checked = mesh.ap_sync !== false || !mesh.enabled;

		this.coverageAlert = E('div', { 'class': 'nm-alert hidden' });

		/* ---- assemble ---- */
		this.wirelessGroup = E('div', { 'class': 'nm-group' }, [
			E('div', { 'class': 'nm-group-head' }, [ E('span', { 'class': 'nm-step' }, '3'), _('无线回程链路') ]),
			E('p', { 'class': 'nm-group-desc' }, _('选定一个 radio 承载 802.11s + SAE 回程。该 radio 仍会继续广播普通 AP，Mesh ID 与密钥需全网一致。')),
			E('div', { 'class': 'nm-form' }, [
				E('div', { 'class': 'nm-field' }, [ E('label', {}, _('回程 radio')), this.meshRadioInput ]),
				E('div', { 'class': 'nm-field' }, [ E('label', {}, _('Mesh ID')), this.meshIdInput ]),
				E('div', { 'class': 'nm-field' }, [ E('label', {}, _('Mesh 密钥')), this.meshKeyInput ]),
				E('div', { 'class': 'nm-field wide' }, [ E('label', {}, _('回程路由协议')), this.meshProtoInput ])
			]),
			this.meshAdvanced,
			this.batAdvanced
		]);

		this.roleFields = E('div', { 'class': 'nm-form' }, [
			E('div', { 'class': 'nm-field' }, [ E('label', {}, _('从节点 IP 尾号')), this.slaveIpInput ]),
			E('div', { 'class': 'nm-field' }, [ E('label', {}, _('网关选择等级')), this.gwSelClassInput ])
		]);

		this.roleGroup = E('div', { 'class': 'nm-group' }, [
			E('div', { 'class': 'nm-group-head' }, [ E('span', { 'class': 'nm-step' }, '2'), _('主从关系') ]),
			E('p', { 'class': 'nm-group-desc' }, _('同一子网下只允许一个主节点分配地址；从节点关闭 DHCP，由主节点统一分配。')),
			E('div', { 'class': 'nm-choices' }, this.roleCards.map(function(c) { return c.card; })),
			this.roleFields
		]);

		this.apCards = E('div', { 'class': 'nm-ap-grid' }, this.apConfigInputs.length
			? this.apConfigInputs.map(function(c) { return c.view; })
			: [ E('div', { 'class': 'nm-empty' }, _('未发现无线 radio')) ]);

		this.coverageGroup = E('div', { 'class': 'nm-group' }, [
			E('div', { 'class': 'nm-group-head' }, [ E('span', { 'class': 'nm-step' }, '4'), _('无线覆盖（SSID）') ]),
			E('p', { 'class': 'nm-group-desc' }, _('每个 radio 可承载多个 SSID：点“添加 SSID”叠加，各 SSID 独立设置名称、加密方式与密码，并绑定到规划好的网络（VLAN 子接口）。跨机漫游只需保证多台 AP 上同名 SSID 的设置一致；多台 AP 之间同频段的频道错开由“生成子节点配置”按节点序号自动完成。')),
			this.apCards,
			this.coverageAlert,
			E('p', { 'class': 'nm-hint' }, _('密码留空表示沿用该 SSID 的当前密钥。“绑定网络”的选项来自 /etc/config/network，新增 VLAN 应用后会自动出现在列表里。802.11k / BSS Transition / WNM Sleep 是漫游辅助选项，建议保持开启。')),
			E('div', { 'class': 'nm-field inline', 'style': 'margin-top:12px' }, [
				E('label', {}, [ this.apSyncInput, _('下发上述各 radio 的无线配置（取消则保留各 radio 当前 AP 设置）') ])
			]),
			E('div', { 'class': 'nm-actions', 'style': 'margin-top:10px;padding-top:10px;border-top:1px dashed var(--nm-border)' }, [
				E('button', { 'class': 'cbi-button cbi-button-neutral', 'click': ui.createHandlerFn(this, 'confirmApplyCoverage') },
					_('仅应用无线覆盖（不改动 Mesh）'))
			])
		]);

		/* ---- wiring ---- */
		this.roleCards.forEach(L.bind(function(c) {
			c.input.addEventListener('change', L.bind(this.updateMeshState, this));
		}, this));
		this.apSyncInput.addEventListener('change', L.bind(this.updateMeshState, this));

		var section = E('div', { 'class': 'nm-section' }, [
			E('div', { 'class': 'nm-title' }, _('Mesh 组网')),
			E('p', { 'class': 'nm-subtitle' }, _('按“组网方式 → 主从关系 → 回程链路 → 无线覆盖”四步配置，所有节点保持一致即可自动成网。')),
			E('div', { 'class': 'nm-group first' }, [
				E('div', { 'class': 'nm-group-head' }, [ E('span', { 'class': 'nm-step' }, '1'), _('组网方式') ]),
				E('p', { 'class': 'nm-group-desc' }, _('有线与无线二选一：有线稳定但需布线，无线免布线但受环境影响。已开启 bridge loop avoidance 防止环路。')),
				E('div', { 'class': 'nm-choices two' }, this.backhaulCards.map(function(c) { return c.card; }))
			]),
			this.roleGroup,
			this.wirelessGroup,
			this.coverageGroup,
			E('div', { 'class': 'nm-actions' }, [
				E('button', { 'class': 'cbi-button cbi-button-apply', 'click': ui.createHandlerFn(this, 'confirmMesh') }, _('应用 Mesh')),
				E('button', { 'class': 'cbi-button cbi-button-neutral', 'click': ui.createHandlerFn(this, 'generateChildConfig') }, _('生成子节点配置')),
				E('button', { 'class': 'cbi-button cbi-button-negative', 'click': ui.createHandlerFn(this, 'confirmDisableMesh') }, _('关闭 Mesh'))
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
				E('span', {}, [ E('i', { 'class': 'k-local' }, _('本')), _('本机') ]),
				E('span', {}, [ E('i', { 'class': 'k-mesh' }, _('网')), _('Mesh 邻居') ]),
				E('span', {}, [ E('i', { 'class': 'k-lan' }, _('端')), _('局域网终端') ])
			])
		]);
	},

	/* ------------------------------------------------------------------
	 * 802.11s / batman-adv link diagnostics.
	 *
	 * batctl only reports what batman-adv knows. On a plain HWMP backhaul
	 * - or when the peer link never comes up - the kernel is the only
	 * source of truth, so this reads iw station dump / mpath dump /
	 * get mesh_param directly.
	 * ------------------------------------------------------------------ */
	renderDiagSection: function() {
		this.diagBox = E('div', { 'class': 'nm-empty' }, _('点“刷新诊断”读取 802.11s 链路状态。'));

		return E('div', { 'class': 'nm-section' }, [
			E('div', { 'class': 'nm-title' }, [
				E('span', {}, _('Mesh 链路诊断')),
				E('button', { 'class': 'cbi-button cbi-button-neutral', 'click': ui.createHandlerFn(this, 'loadDiag') }, _('刷新诊断'))
			]),
			E('p', { 'class': 'nm-subtitle' }, _('直接读取内核的 peer link、HWMP 路径表与 batman-adv 状态，不依赖本页是否创建过 mesh 接口。')),
			this.diagBox
		]);
	},

	loadDiag: function() {
		var self = this;
		if (!this.diagBox) return Promise.resolve();
		this.diagBox.innerHTML = '';
		this.diagBox.className = '';
		this.diagBox.appendChild(E('div', {}, _('读取中…')));
		return callGetMeshDiag().then(function(res) {
			self.renderDiag(res || {});
		}).catch(function(e) {
			self.diagBox.innerHTML = '';
			self.diagBox.appendChild(E('div', { 'class': 'nm-banner bad' },
				_('读取诊断失败：%s').format(e.message || String(e))));
		});
	},

	renderDiag: function(diag) {
		var self = this;
		if (!this.diagBox) return;
		this.diagBox.innerHTML = '';
		this.diagBox.className = '';

		var ifaces = diag.ifaces || [];
		var bat = diag.batman || {};

		if (!ifaces.length && !bat.present)
			this.diagBox.appendChild(E('p', { 'class': 'nm-hint' },
				_('当前没有运行中的 mesh 接口，也没有 bat0。启用 Mesh 并重载网络后再刷新。')));

		ifaces.forEach(function(f) {
			var info = f.info || {};
			var peers = f.peers || [];
			var mpath = f.mpath || [];
			var estab = peers.filter(function(p) {
				return String(p.plink || '').toUpperCase().indexOf('ESTAB') === 0;
			}).length;

			var meta = [ _('Mesh ID %s').format(f.mesh_id || '—') ];
			if (info.channel) meta.push(_('频道 %s').format(info.channel));
			if (info.width) meta.push(String(info.width));
			if (info.phy) meta.push(String(info.phy));
			if (info.mesh_point === false) meta.push(_('该接口不是 mesh point'));

			var canBlock = diag.iw_full === true;

			self.diagBox.appendChild(E('div', { 'class': 'nm-ap-radio' }, [
				E('div', { 'class': 'nm-ap-radio-title' }, [
					E('span', {}, f.iface),
					E('span', { 'class': 'nm-band' }, _('%d 邻居 / %d 已建立').format(peers.length, estab))
				]),
				E('div', { 'class': 'nm-ap-radio-meta' }, meta.join(' · ')),
				E('div', { 'class': 'nm-ssid-head' }, [ E('span', {}, _('Peer link（iw station dump）')) ]),
				dataTable(
					[ _('MAC'), _('plink'), _('信号'), _('发送速率'), _('metric'), _('空闲'), _('操作') ],
					peers.map(function(p) {
						return [
							E('span', { 'class': 'nm-mono' }, p.mac || ''),
							plinkStateEl(p.plink),
							p.signal || '—',
							p.tx_bitrate || '—',
							p.metric || '—',
							p.inactive || '—',
							canBlock
								? E('span', {}, [
									E('button', {
										'class': 'cbi-button cbi-button-neutral nm-mini',
										'click': ui.createHandlerFn(self, function() {
											return self.blockPeer(f.iface, p.mac, 'block');
										})
									}, _('阻塞')),
									' ',
									E('button', {
										'class': 'cbi-button cbi-button-neutral nm-mini',
										'click': ui.createHandlerFn(self, function() {
											return self.blockPeer(f.iface, p.mac, 'open');
										})
									}, _('放行'))
								])
								: E('span', { 'class': 'nm-muted' }, _('需 iw-full'))
						];
					}),
					_('没有发现任何 peer link。802.11s 要求两端的 Mesh ID、密钥、频道三者完全一致，请先核对这三项。')),
				E('div', { 'class': 'nm-ssid-head' }, [ E('span', {}, _('HWMP 路径表（iw mpath dump）')) ]),
				dataTable(
					[ _('目的'), _('下一跳'), _('接口'), _('metric'), _('队列'), _('标志') ],
					mpath.map(function(m) {
						return [
							E('span', { 'class': 'nm-mono' }, m.dst || ''),
							E('span', { 'class': 'nm-mono' }, m.next_hop || ''),
							m.iface || '', m.metric || '', m.qlen || '', m.flags || ''
						];
					}),
					_('路径表为空：尚未学习到任何远端节点，或本机就是唯一的 mesh 节点。')),
				E('div', { 'class': 'nm-ssid-head' }, [ E('span', {}, _('生效中的 mesh 参数')) ]),
				kvGrid(f.params)
			]));
		}, this);

		if (bat.present) {
			var gws = bat.gateways || [];
			var hardifs = bat.hardifs || [];
			this.diagBox.appendChild(E('div', { 'class': 'nm-ap-radio' }, [
				E('div', { 'class': 'nm-ap-radio-title' }, [
					E('span', {}, 'bat0'),
					E('span', { 'class': 'nm-band' }, bat.routing_algo || 'BATMAN_IV')
				]),
				E('div', { 'class': 'nm-ap-radio-meta' }, [
					_('网关角色 %s').format(bat.gw_mode || '—'),
					_(' · 源节点 %d').format(bat.originators || 0),
					_(' · 转发表 %d').format(bat.translations || 0)
				].join('')),
				E('div', { 'class': 'nm-ssid-head' }, [ E('span', {}, _('网关列表（batctl gwl）')) ]),
				dataTable(
					[ _('MAC'), _('TQ'), _('带宽'), _('状态') ],
					gws.map(function(g) {
						return [
							E('span', { 'class': 'nm-mono' }, g.mac || ''),
							g.tq || '—', g.bandwidth || '—',
							g.selected ? _('已选中') : _('候选')
						];
					}),
					_('没有候选网关：本机不在 client 模式，或网内没有节点发布网关。')),
				E('div', { 'class': 'nm-ssid-head' }, [ E('span', {}, _('batman-adv 接口（batctl if）')) ]),
				dataTable(
					[ _('接口'), _('状态') ],
					hardifs.map(function(h) { return [ h.iface || '', h.status || '' ]; }),
					_('bat0 上没有绑定任何 hardif。'))
			]));
		}
	},

	blockPeer: function(iface, mac, action) {
		var self = this;
		return callBlockMeshPeer(iface, mac, action).then(function(res) {
			if (!res || !res.success) {
				ui.addNotification(null, E('p', (res && res.error) || _('操作失败')));
				return;
			}
			ui.addNotification(null, E('p', action === 'block'
				? _('已阻塞邻居 %s').format(mac)
				: _('已放行邻居 %s').format(mac)));
			return self.loadDiag();
		}).catch(function(e) {
			ui.addNotification(null, E('p', e.message || _('操作失败')));
		});
	},

	/* ------------------------------------------------------------------
	 * Configuration rollback. Every apply backs the four config files up
	 * first, so a mistake that moves the management address can be undone
	 * without serial access.
	 * ------------------------------------------------------------------ */
	renderRollbackSection: function() {
		this.backupBox = E('div', {}, []);
		this.loadBackups();
		return E('div', { 'class': 'nm-section' }, [
			E('div', { 'class': 'nm-title' }, [
				E('span', {}, _('配置备份与回滚')),
				E('button', { 'class': 'cbi-button cbi-button-neutral', 'click': ui.createHandlerFn(this, 'loadBackups') }, _('刷新列表'))
			]),
			E('p', { 'class': 'nm-subtitle' }, _('每次应用 Mesh / 无线 / VLAN 前都会自动备份 network、wireless、dhcp、firewall，最多保留最近 8 份。')),
			this.backupBox
		]);
	},

	loadBackups: function() {
		var self = this;
		if (!this.backupBox) return Promise.resolve();
		return callListBackups().then(function(res) {
			self.renderBackups((res && res.backups) || []);
		}).catch(function(e) {
			self.backupBox.innerHTML = '';
			self.backupBox.appendChild(E('div', { 'class': 'nm-banner' },
				_('读取备份列表失败：%s').format(e.message || String(e))));
		});
	},

	renderBackups: function(backups) {
		var self = this;
		if (!this.backupBox) return;
		this.backupBox.innerHTML = '';
		if (!backups.length) {
			this.backupBox.appendChild(E('p', { 'class': 'nm-hint' }, _('还没有任何备份；应用一次配置后会自动生成。')));
			return;
		}
		this.backupBox.appendChild(E('div', { 'class': 'nm-backups nm-scroll' }, backups.map(function(b) {
			return E('div', { 'class': 'nm-backup' }, [
				E('span', { 'class': 'nm-mono' }, b.name),
				E('span', { 'class': 'nm-muted' }, b.time || ''),
				E('button', {
					'class': 'cbi-button cbi-button-neutral nm-mini',
					'click': ui.createHandlerFn(self, function() { return self.confirmRestore(b.name); })
				}, _('回滚到此处'))
			]);
		})));
	},

	confirmRestore: function(name) {
		return ui.showModal(_('确认回滚配置'), [
			E('p', {}, _('将用备份 %s 覆盖当前的 /etc/config/network、wireless、dhcp、firewall，然后重载网络。').format(name)),
			E('div', { 'class': 'nm-alert' }, [
				E('strong', {}, _('管理地址可能随之改变。')),
				E('div', {}, _('如果备份里的 LAN 地址与现在不同，回滚后需要用新地址重新登录。当前配置会先自动另存一份再覆盖。'))
			]),
			E('div', { 'class': 'right' }, [
				E('button', {
					'class': 'cbi-button cbi-button-apply',
					'click': ui.createHandlerFn(this, function() { return this.restoreBackup(name); })
				}, _('确认回滚')),
				' ',
				E('button', { 'class': 'cbi-button cbi-button-neutral', 'click': ui.hideModal }, _('取消'))
			])
		]);
	},

	restoreBackup: function(name) {
		ui.hideModal();
		var self = this;
		return callRestoreBackup(name).then(function(res) {
			if (!res || !res.success) {
				ui.addNotification(null, E('p', (res && res.error) || _('回滚失败')));
				return;
			}
			ui.addNotification(null, E('p', _('已回滚到 %s，网络正在重载。').format(name)));
			return self.loadBackups();
		}).catch(function(e) {
			ui.addNotification(null, E('p', e.message || _('回滚失败')));
		});
	},

	// Everything that has to be fixed before any wireless config is written.
	coverageErrors: function() {
		var errors = [];
		(this.apConfigInputs || []).forEach(function(card) {
			card.ssids.forEach(function(row) {
				if (row.removed || !row.enabled.checked) return;
				if (!(row.ssid.value || '').trim())
					errors.push(_('%s 上有启用的 SSID 未填写名称').format(radioTitle(card)));
			});
		});
		return errors.concat(this.coverageBlockers());
	},

	confirmApplyCoverage: function() {
		var errors = this.coverageErrors();
		if (errors.length) {
			ui.addNotification(null, E('p', _('无线覆盖配置有问题：%s。').format(errors.join('；'))));
			return;
		}

		var lines = (this.apConfigInputs || []).map(function(card) {
			var names = card.ssids.filter(function(r) {
				return !r.removed && r.enabled.checked;
			}).map(function(r) {
				return (r.ssid.value || '').trim() + ' → ' + r.network.value;
			});
			return _('%s：%s').format(radioTitle(card),
				names.length ? names.join('、') : _('（无启用的 SSID）'));
		});

		return ui.showModal(_('确认应用无线覆盖'), [
			E('p', {}, _('只修改 /etc/config/wireless 并重载 Wi-Fi，不会创建或修改 batman-adv、网络与 DHCP 配置。')),
			E('div', { 'class': 'nm-alert' }, lines.join('；')),
			E('p', { 'class': 'nm-muted' }, _('重载期间 Wi-Fi 会短暂中断，若管理口走无线请留意。')),
			E('div', { 'class': 'right' }, [
				E('button', { 'class': 'cbi-button cbi-button-apply', 'click': ui.createHandlerFn(this, 'applyCoverage') }, _('确认应用')),
				' ',
				E('button', { 'class': 'cbi-button cbi-button-neutral', 'click': ui.hideModal }, _('取消'))
			])
		]);
	},

	applyCoverage: function() {
		ui.hideModal();
		var errors = this.coverageErrors();
		if (errors.length) {
			ui.addNotification(null, E('p', _('无线覆盖配置有问题：%s。').format(errors.join('；'))));
			return;
		}
		var self = this;
		return callApplyWireless(
			JSON.stringify(this.collectApEntries()),
			JSON.stringify(this.collectChannels())
		).then(function(res) {
			if (!res || !res.success) {
				ui.addNotification(null, E('p', (res && res.error) || _('应用无线覆盖失败')));
				return;
			}
			ui.addNotification(null, E('p', _('无线覆盖已应用，Wi-Fi 正在重载。')));
			return self.refreshWireless();
		}).catch(function(e) {
			ui.addNotification(null, E('p', e.message || _('应用无线覆盖失败')));
		});
	},

	// Rebuild just the radio cards from a fresh status: newly created
	// interfaces come back with their real section names, so a follow-up
	// edit updates them instead of creating duplicates.
	refreshWireless: function() {
		var self = this;
		return callGetStatus().then(function(res) {
			self.status = res || {};
			self.networks = (res && res.networks) || [];
			self.apConfigInputs = (((res && res.mesh) || {}).ap_configs || []).map(function(c) {
				return self.buildApCard(c, self.networks);
			});
			if (self.apCards) {
				self.apCards.innerHTML = '';
				self.apConfigInputs.forEach(function(c) { self.apCards.appendChild(c.view); });
			}
			self.updateMeshState();
		}).catch(function() {});
	},

	renderVlanSection: function(status) {
		this.vlanBox = E('div', {}, []);
		this.vlanBox.appendChild(this.buildVlanList(this.vlans, this.bridgePorts));
		this.vlanBannerBox = E('div', {}, []);
		this.renderVlanBanners(status);

		return E('div', { 'class': 'nm-section' }, [
			E('div', { 'class': 'nm-title' }, [
				E('span', {}, _('VLAN 与网络分段')),
				E('span', { 'class': 'nm-muted' }, _('br-lan 上的 802.1Q 分段'))
			]),
			E('p', { 'class': 'nm-subtitle' }, _('每个 VLAN 在 br-lan 上建立一个 bridge-vlan，并生成 br-lan.<ID> 子接口；SSID 通过“绑定网络”挂到对应网段。VLAN 1 是管理网段，不允许删除。')),
			this.vlanBannerBox,
			this.vlanBox
		]);
	},

	// Applying VLANs can flip br-lan from flat to filtered, so the mode and
	// the set of carried VLANs have to be re-derived from fresh state.
	renderVlanBanners: function(status) {
		if (!this.vlanBannerBox) return;
		this.vlanBannerBox.innerHTML = '';
		[ bridgeModeBanner(status), bat0VlanBanner(status, this) ].forEach(function(b) {
			if (b && b.nodeType) this.vlanBannerBox.appendChild(b);
		}, this);
	},

	buildVlanList: function(vlans, ports) {
		var self = this;
		// bat0 is the mesh backhaul and is driven by the "carry over the
		// mesh" flag instead of the per port U/T grid - showing it in both
		// places would let the two fight over the same option.
		var gridPorts = (ports || []).filter(function(p) { return p !== 'bat0'; });

		this.vlanRows = (vlans && vlans.length)
			? vlans.map(function(v) { return self.buildVlanRow(v, gridPorts); })
			: [];

		var list = E('div', { 'class': 'nm-vlan-list' }, this.vlanRows.map(function(r) { return r.view; }));

		var addBtn = E('button', { 'class': 'cbi-button cbi-button-neutral' }, _('+ 添加 VLAN'));
		addBtn.addEventListener('click', function() {
			var row = self.buildVlanRow({}, gridPorts);
			self.vlanRows.push(row);
			list.appendChild(row.view);
		});

		var trunkAll = E('button', { 'class': 'cbi-button cbi-button-neutral' }, _('全部透传（bat0 加入所有 VLAN）'));
		trunkAll.addEventListener('click', function() {
			self.vlanRows.forEach(function(r) {
				if (r.trunk) r.trunk.checked = true;
			});
		});

		return E('div', {}, [
			list,
			E('p', { 'class': 'nm-hint' }, _('端口列中 U = untagged（出口剥离标签，接终端 / AP），T = tagged（保留标签，接上行交换机）；未选择的端口不加入该 VLAN。当一个端口从所有 VLAN 里都移除后，它也会自动从 br-lan 的成员中摘除。bat0 是 Mesh 回程端口，不在此列，由下方的「经 Mesh 回程透传」控制。')),
			E('p', { 'class': 'nm-hint' }, _('Mesh 回程上的 VLAN：br-lan 一旦建立 bridge-vlan，netifd 就会开启 802.1Q 过滤，此时“不在任何 VLAN 里的端口”不再转发流量。需要哪个 VLAN 跨节点，就勾选该 VLAN 的「经 Mesh 回程透传」——后端会把 bat0 以 tagged 成员写入该 bridge-vlan；不勾则该网段只存在于本机。mesh_* 无线回程接口由 Mesh 自行管理，不在此处配置。')),
			E('div', { 'class': 'nm-actions' }, [
				addBtn,
				trunkAll,
				E('button', { 'class': 'cbi-button cbi-button-apply', 'click': ui.createHandlerFn(this, 'confirmApplyVlans') }, _('应用 VLAN 配置'))
			])
		]);
	},

	buildVlanRow: function(v, ports) {
		var self = this;
		v = v || {};
		var isMgmt = String(v.vlan || '') === '1';

		var vlanId = E('input', { 'type': 'number', 'min': '1', 'max': '4094', 'value': v.vlan || '' });
		var iface = E('input', { 'type': 'text', 'value': v.iface || '', 'maxlength': '15',
			'placeholder': v.vlan ? 'lan' + v.vlan : 'lan2' });
		var ipaddr = E('input', { 'type': 'text', 'value': v.ipaddr || '', 'placeholder': '10.10.20.251' });
		var netmask = E('input', { 'type': 'text', 'value': v.netmask || '255.255.255.0' });
		var gateway = E('input', { 'type': 'text', 'value': v.gateway || '' });
		var dns = E('input', { 'type': 'text', 'value': v.dns || '' });
		var dhcp = E('input', { 'type': 'checkbox' });
		dhcp.checked = false;

		// Carrying a VLAN across the mesh means making bat0 a tagged member
		// of it. New segments default to carried: an operator who planned a
		// segment expects it on every node, and a segment that is silently
		// not carried just looks like a broken mesh.
		var trunk = E('input', { 'type': 'checkbox' });
		trunk.checked = (v.trunk === undefined || v.trunk === null) ? true : !!v.trunk;

		var untagged = String(v.untagged || '').split(/\s+/).filter(Boolean);
		var tagged = String(v.tagged || '').split(/\s+/).filter(Boolean);

		var portCells = (ports || []).map(function(p) {
			var sel = E('select', {}, [
				E('option', { 'value': '' }, _('未加入')),
				E('option', { 'value': 'u' }, 'U'),
				E('option', { 'value': 't' }, 'T')
			]);
			sel.value = untagged.indexOf(p) >= 0 ? 'u' : (tagged.indexOf(p) >= 0 ? 't' : '');
			return { port: p, select: sel };
		});

		var removeBtn = E('button', { 'class': 'cbi-button cbi-button-negative nm-mini' }, _('删除'));
		var titleEl = E('span', { 'class': 'nm-vlan-title' },
			isMgmt ? _('VLAN %s · 管理网段').format(v.vlan) : _('VLAN %s').format(v.vlan || '—'));

		var view = E('div', { 'class': 'nm-vlan-row' }, [
			E('div', { 'class': 'nm-vlan-head' }, [
				titleEl,
				isMgmt ? E('span', { 'class': 'nm-tag' }, _('管理')) : '',
				isMgmt ? '' : removeBtn
			]),
			E('div', { 'class': 'nm-vlan-grid' }, [
				E('div', { 'class': 'nm-field' }, [ E('label', {}, _('VLAN ID')), vlanId ]),
				E('div', { 'class': 'nm-field' }, [ E('label', {}, _('接口名')), iface ]),
				E('div', { 'class': 'nm-field' }, [ E('label', {}, _('IP 地址')), ipaddr ]),
				E('div', { 'class': 'nm-field' }, [ E('label', {}, _('子网掩码')), netmask ]),
				E('div', { 'class': 'nm-field' }, [ E('label', {}, _('网关')), gateway ]),
				E('div', { 'class': 'nm-field' }, [ E('label', {}, _('DNS')), dns ]),
				E('div', { 'class': 'nm-field inline' }, [
					E('label', { 'class': 'nm-check' }, [ dhcp, _('在该网段启用 DHCP 服务器') ])
				]),
				E('div', { 'class': 'nm-field inline' }, [
					E('label', { 'class': 'nm-check' }, [ trunk, _('经 Mesh 回程透传（bat0 加入本 VLAN）') ])
				])
			]),
			portCells.length
				? E('div', { 'class': 'nm-ports' }, portCells.map(function(c) {
					return E('span', { 'class': 'nm-port-item' }, [ c.port, c.select ]);
				}))
				: E('p', { 'class': 'nm-hint' }, _('未在 br-lan 上发现成员端口，请先在网络 → 接口中把物理端口加入 br-lan。'))
		]);

		var row = {
			section: v.section || '',
			vlan: vlanId,
			iface: iface,
			ipaddr: ipaddr,
			netmask: netmask,
			gateway: gateway,
			dns: dns,
			dhcp: dhcp,
			trunk: trunk,
			ports: portCells,
			// ports this VLAN owned when the page was rendered; needed to
			// work out which ones stop being VLAN members altogether
			initPorts: untagged.concat(tagged),
			removed: false,
			view: view
		};

		if (!isMgmt) {
			removeBtn.addEventListener('click', function() {
				if (row.section) {
					row.removed = !row.removed;
					view.classList.toggle('removed', row.removed);
					removeBtn.textContent = row.removed ? _('恢复') : _('删除');
				} else {
					var i = self.vlanRows.indexOf(row);
					if (i >= 0) self.vlanRows.splice(i, 1);
					if (view.parentNode) view.parentNode.removeChild(view);
				}
			});
		}

		vlanId.addEventListener('input', function() {
			titleEl.textContent = _('VLAN %s').format(vlanId.value || '—');
			iface.placeholder = 'lan' + (vlanId.value || '');
		});

		return row;
	},

	collectVlans: function() {
		return (this.vlanRows || []).map(function(r) {
			var untagged = [], tagged = [];
			r.ports.forEach(function(c) {
				if (c.select.value === 'u') untagged.push(c.port);
				else if (c.select.value === 't') tagged.push(c.port);
			});
			return {
				section: r.section || '',
				vlan: (r.vlan.value || '').trim(),
				iface: (r.iface.value || '').trim(),
				ipaddr: (r.ipaddr.value || '').trim(),
				netmask: (r.netmask.value || '').trim(),
				gateway: (r.gateway.value || '').trim(),
				dns: (r.dns.value || '').trim(),
				untagged: untagged.join(' '),
				tagged: tagged.join(' '),
				dhcp: r.dhcp.checked ? 1 : 0,
				trunk: (r.trunk && r.trunk.checked) ? 1 : 0,
				remove: r.removed ? 1 : 0
			};
		}).filter(function(v) { return v.vlan !== ''; });
	},

	vlanErrors: function() {
		var vlans = this.collectVlans();
		if (!vlans.length)
			return [ _('没有需要应用的 VLAN 配置。') ];

		var bad = vlans.filter(function(v) {
			return !/^[0-9]+$/.test(v.vlan) || +v.vlan < 1 || +v.vlan > 4094;
		});
		if (bad.length)
			return [ _('VLAN ID 必须是 1-4094 之间的数字。') ];

		var seen = {}, dupHit = false;
		vlans.forEach(function(v) {
			if (v.remove) return;
			if (seen[v.vlan]) dupHit = true;
			seen[v.vlan] = 1;
		});
		if (dupHit)
			return [ _('存在重复的 VLAN ID，请合并后再应用。') ];

		return [];
	},

	// Ports that were VLAN members when the page loaded but are now in none
	// of them. The backend detaches those from br-lan too, which can take
	// the uplink (or the management address) down, so surface it first.
	prunedPorts: function() {
		var before = {}, after = {};
		(this.vlanRows || []).forEach(function(r) {
			(r.initPorts || []).forEach(function(p) { before[p] = 1; });
			if (r.removed) return;
			r.ports.forEach(function(c) {
				if (c.select.value) after[c.port] = 1;
			});
		});
		return Object.keys(before).filter(function(p) { return !after[p]; });
	},

	confirmApplyVlans: function() {
		var errors = this.vlanErrors();
		if (errors.length) {
			ui.addNotification(null, E('p', errors.join('；')));
			return;
		}

		var vlans = this.collectVlans();
		var added = vlans.filter(function(v) { return !v.section && !v.remove; });
		var removed = vlans.filter(function(v) { return v.remove; });
		var pruned = this.prunedPorts();

		var lines = [ _('共下发 %d 个 VLAN 配置。').format(vlans.length) ];
		if (added.length)
			lines.push(_('新增 VLAN：%s').format(added.map(function(v) { return v.vlan; }).join('、')));
		if (removed.length)
			lines.push(_('删除 VLAN：%s').format(removed.map(function(v) { return v.vlan; }).join('、')));

		return ui.showModal(_('确认应用 VLAN 配置'), [
			E('p', {}, _('将修改 /etc/config/network、dhcp、firewall 并重载网络。')),
			E('div', { 'class': 'nm-alert' }, lines.join('；')),
			pruned.length
				? E('div', { 'class': 'nm-alert' }, [
					E('strong', {}, _('以下端口已不属于任何 VLAN，将同时从 br-lan 成员中摘除：')),
					E('div', {}, pruned.join('、')),
					E('div', { 'class': 'nm-muted' }, _('若管理地址或上行链路正走这些端口，应用后会断开连接。'))
				])
				: '',
			E('div', { 'class': 'right' }, [
				E('button', { 'class': 'cbi-button cbi-button-apply', 'click': ui.createHandlerFn(this, 'applyVlans') }, _('确认应用')),
				' ',
				E('button', { 'class': 'cbi-button cbi-button-neutral', 'click': ui.hideModal }, _('取消'))
			])
		]);
	},

	applyVlans: function() {
		ui.hideModal();
		var self = this;
		var errors = this.vlanErrors();
		if (errors.length) {
			ui.addNotification(null, E('p', errors.join('；')));
			return;
		}
		var vlans = this.collectVlans();

		return callApplyVlans(JSON.stringify(vlans)).then(function(res) {
			if (!res || !res.success) {
				ui.addNotification(null, E('p', (res && res.error) || _('应用 VLAN 失败')));
				return;
			}
			ui.addNotification(null, E('p', _('VLAN 配置已应用（%d 项），网络正在重载。').format(res.changed || 0)));
			return self.refreshNetworkOptions();
		}).catch(function(e) {
			ui.addNotification(null, E('p', e.message || _('应用 VLAN 失败')));
		});
	},

	// After VLANs change the set of bindable networks changes too, so pull a
	// fresh status and rebuild the SSID dropdowns (and the VLAN list) in
	// place instead of re-rendering the whole page and losing edits.
	refreshNetworkOptions: function() {
		var self = this;
		return callGetStatus().then(function(res) {
			self.status = res || {};
			self.networks = (res && res.networks) || [];
			self.vlans = (res && res.vlans) || [];
			self.bridgePorts = (res && res.bridge && res.bridge.ports) || [];
			(self.apConfigInputs || []).forEach(function(card) {
				card.ssids.forEach(function(row) {
					self.fillNetworkSelect(row.network, self.networks);
				});
			});
			if (self.vlanBox) {
				self.vlanBox.innerHTML = '';
				self.vlanBox.appendChild(self.buildVlanList(self.vlans, self.bridgePorts));
			}
			self.renderVlanBanners(self.status);
			self.updateCoverageAlert();
		}).catch(function() {});
	},

	fillNetworkSelect: function(sel, networks) {
		var current = sel.value;
		sel.innerHTML = '';
		(networks || []).forEach(function(n) {
			sel.appendChild(E('option', { 'value': n.name }, n.ipaddr ? n.name + ' · ' + n.ipaddr : n.name));
		});
		if (current && !(networks || []).some(function(n) { return n.name === current; }))
			sel.appendChild(E('option', { 'value': current }, current));
		sel.value = current;
	},

	backhaulCard: function(value, title, desc, active, disabled) {
		var self = this;
		var input = E('input', { 'type': 'radio', 'name': 'nm-backhaul', 'value': value });
		input.checked = !!active;
		input.disabled = !!disabled;
		var card = E('label', {
			'class': 'nm-choice' + (active ? ' active' : '') + (disabled ? ' disabled' : ''),
			'title': disabled ? _('当前 wpad 不支持 802.11s，无法使用无线回程') : ''
		}, [
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

	buildApCard: function(config, networks) {
		var self = this;
		var channel = E('select', {}, [ E('option', { 'value': 'auto' }, _('自动')) ].concat(
			channelList(config.band, config.channel).map(function(ch) {
				return E('option', { 'value': ch }, ch);
			})));
		channel.value = config.channel || 'auto';

		// Channel width: an 802.11ax radio peering with an 802.11ac only one
		// must drop to the older width (e.g. VHT80 on both ends), otherwise
		// the wireless backhaul never comes up.
		var htmode = E('select', {}, htmodeList(config.band, config.htmode).map(function(m) {
			return E('option', { 'value': m }, m === 'auto' ? _('跟随设备默认') : m);
		}));
		htmode.value = config.htmode || 'auto';

		var bandTag = bandLabel(config.band);
		var ssidList = E('div', { 'class': 'nm-ssid-list' });

		// A radio without any AP interface still gets one empty row so the
		// operator has something to fill in.
		var entries = (config.aps && config.aps.length) ? config.aps : [ {} ];
		var ssids = entries.map(function(ap) {
			var row = self.buildSsidRow(ap, networks);
			ssidList.appendChild(row.view);
			return row;
		});

		var addBtn = E('button', { 'class': 'cbi-button cbi-button-neutral nm-mini' }, _('+ 添加 SSID'));
		var countEl = E('span', {}, _('SSID 列表（%d 个）').format(ssids.length));

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
				E('div', { 'class': 'nm-field' }, [ E('label', {}, _('频道号（本机）')), channel ]),
				E('div', { 'class': 'nm-field' }, [ E('label', {}, _('频宽 (htmode)')), htmode ])
			]),
			E('div', { 'class': 'nm-ssid-head' }, [ countEl, addBtn ]),
			ssidList
		]);

		var card = {
			radio: config.radio,
			band: config.band,
			channel: channel,
			htmode: htmode,
			ssids: ssids,
			ssidList: ssidList,
			countEl: countEl,
			view: view
		};

		addBtn.addEventListener('click', function() {
			var row = self.buildSsidRow({}, self.networks);
			card.ssids.push(row);
			ssidList.appendChild(row.view);
			self.updateCoverage();
		});
		channel.addEventListener('change', L.bind(self.updateCoverage, self));
		htmode.addEventListener('change', L.bind(self.updateCoverage, self));

		return card;
	},

	buildSsidRow: function(ap, networks) {
		var self = this;
		ap = ap || {};

		var enabled = E('input', { 'type': 'checkbox' });
		enabled.checked = ap.enabled !== false;

		var ssid = E('input', {
			'class': 'nm-ssid-name', 'type': 'text', 'value': ap.ssid || '',
			'maxlength': '32', 'aria-label': _('SSID'),
			'placeholder': _('SSID 名称，例如 USHOME')
		});
		var encryption = encryptionSelect(ap.encryption);
		var key = E('input', { 'type': 'password', 'autocomplete': 'new-password' });
		key.placeholder = ap.has_key ? _('留空沿用当前密钥') : _('8-63 位');

		var netName = ap.network || 'lan';
		var network = E('select', {}, (networks || []).map(function(n) {
			return E('option', { 'value': n.name }, n.ipaddr ? n.name + ' · ' + n.ipaddr : n.name);
		}));
		if (!(networks || []).some(function(n) { return n.name === netName; }))
			network.appendChild(E('option', { 'value': netName }, netName));
		network.value = netName;

		function flag(value, fallback) {
			var el = E('input', { 'type': 'checkbox' });
			el.checked = value === undefined ? !!fallback : (value === true || value === 'true' || value === 1);
			return el;
		}

		var ieee80211k = flag(ap.ieee80211k, true);
		var bssTransition = flag(ap.bss_transition, true);
		var wnmSleep = flag(ap.wnm_sleep_mode, false);
		var proxyArp = flag(ap.proxy_arp, false);
		var isolate = flag(ap.isolate, false);
		var ieee80211r = flag(ap.ieee80211r, false);

		// 802.11r (FT): every AP advertising this SSID has to share the same
		// 4 hex digit mobility domain, so the value already in use on this
		// device is offered as the default for new SSIDs.
		var mobilityDomain = E('input', { 'type': 'text', 'maxlength': '4' });
		mobilityDomain.value = ap.mobility_domain || ((self.status && self.status.ft_domain) || '');
		mobilityDomain.placeholder = _('4 位十六进制');
		var reassocDeadline = E('input', { 'type': 'number', 'min': '1', 'max': '65535' });
		reassocDeadline.value = ap.reassociation_deadline || '';
		reassocDeadline.placeholder = '1000';
		var ftOverDs = flag(ap.ft_over_ds, true);
		var ftPskLocal = flag(ap.ft_psk_generate_local, true);
		var pmkR1Push = flag(ap.pmk_r1_push, false);

		var ftDetails = E('details', { 'class': 'nm-details' }, [
			E('summary', {}, _('802.11r 高级设置')),
			E('div', { 'class': 'nm-form' }, [
				E('div', { 'class': 'nm-field' }, [ E('label', {}, _('移动域（4 位十六进制）')), mobilityDomain ]),
				E('div', { 'class': 'nm-field' }, [ E('label', {}, _('重关联时限（1-65535）')), reassocDeadline ]),
				E('div', { 'class': 'nm-field inline' }, [
					E('label', { 'class': 'nm-check', 'title': _('通过分布式系统而非空中接口完成 FT 握手') },
						[ ftOverDs, _('FT over DS') ])
				]),
				E('div', { 'class': 'nm-field inline' }, [
					E('label', { 'class': 'nm-check', 'title': _('由本机从 PSK 推导 FT 密钥，多 AP 同一密码即可漫游') },
						[ ftPskLocal, _('本地生成 FT PSK') ])
				]),
				E('div', { 'class': 'nm-field inline' }, [
					E('label', { 'class': 'nm-check', 'title': _('认证后立即把 PMK-R1 推送到邻居 AP') },
						[ pmkR1Push, _('PMK-R1 推送') ])
				])
			]),
			E('p', { 'class': 'nm-hint', 'style': 'padding:0 12px 12px' },
				_('同一个 SSID 的所有 AP 必须使用相同的移动域；开放网络与 OWE 不支持 FT。'))
		]);
		ftDetails.open = !!ap.ieee80211r;

		// FT sub-fields only matter while FT itself is on
		function syncFt() {
			var on = ieee80211r.checked;
			[ mobilityDomain, reassocDeadline, ftOverDs, ftPskLocal, pmkR1Push ].forEach(function(el) {
				el.disabled = !on;
			});
			if (on) ftDetails.open = true;
		}
		syncFt();
		ieee80211r.addEventListener('change', function() {
			syncFt();
			self.updateCoverage();
		});

		var removeBtn = E('button', { 'class': 'cbi-button cbi-button-negative nm-mini' }, _('删除'));

		var view = E('div', { 'class': 'nm-ssid-row' }, [
			E('div', { 'class': 'nm-ssid-top' }, [
				E('label', { 'class': 'nm-check' }, [ enabled, _('启用') ]),
				ssid,
				removeBtn
			]),
			E('div', { 'class': 'nm-ssid-grid' }, [
				E('div', { 'class': 'nm-field' }, [ E('label', {}, _('加密方式')), encryption ]),
				E('div', { 'class': 'nm-field' }, [ E('label', {}, _('无线密码')), key ]),
				E('div', { 'class': 'nm-field wide' }, [ E('label', {}, _('绑定网络（VLAN）')), network ])
			]),
			E('div', { 'class': 'nm-ssid-opts' }, [
				E('label', { 'class': 'nm-check', 'title': _('802.11k 邻居报告，帮助终端快速发现邻近 AP') },
					[ ieee80211k, _('802.11k') ]),
				E('label', { 'class': 'nm-check', 'title': _('802.11v BSS Transition，AP 主动引导终端切换') },
					[ bssTransition, _('BSS Transition') ]),
				E('label', { 'class': 'nm-check', 'title': _('WNM 睡眠模式，省电终端可短暂休眠') },
					[ wnmSleep, _('WNM Sleep') ]),
				E('label', { 'class': 'nm-check', 'title': _('代理 ARP，桥接网段下改善三层互通') },
					[ proxyArp, _('Proxy ARP') ]),
				E('label', { 'class': 'nm-check', 'title': _('客户端隔离，同一 SSID 内终端互不通信') },
					[ isolate, _('客户端隔离') ]),
				E('label', { 'class': 'nm-check', 'title': _('802.11r 快速 BSS 切换，跨 AP 漫游无需完整重认证') },
					[ ieee80211r, _('802.11r FT') ])
			]),
			ftDetails
		]);

		var row = {
			section: ap.section || '',
			enabled: enabled,
			ssid: ssid,
			encryption: encryption,
			key: key,
			network: network,
			ieee80211k: ieee80211k,
			bss_transition: bssTransition,
			wnm_sleep_mode: wnmSleep,
			proxy_arp: proxyArp,
			isolate: isolate,
			ft: {
				ieee80211r: ieee80211r,
				mobility_domain: mobilityDomain,
				reassociation_deadline: reassocDeadline,
				ft_over_ds: ftOverDs,
				ft_psk_generate_local: ftPskLocal,
				pmk_r1_push: pmkR1Push
			},
			removed: false,
			view: view
		};

		removeBtn.addEventListener('click', function() {
			if (row.section) {
				// an existing interface is only marked for deletion so a
				// misclick can be undone before applying
				row.removed = !row.removed;
				view.classList.toggle('removed', row.removed);
				removeBtn.textContent = row.removed ? _('恢复') : _('删除');
			} else {
				self.removeSsidRow(row);
			}
			self.updateCoverage();
		});

		[ enabled, ssid, encryption, key, network ].forEach(function(el) {
			el.addEventListener('change', L.bind(self.updateCoverage, self));
			el.addEventListener('input', L.bind(self.updateCoverage, self));
		});

		return row;
	},

	removeSsidRow: function(row) {
		var self = this;
		(this.apConfigInputs || []).forEach(function(card) {
			var i = card.ssids.indexOf(row);
			if (i < 0) return;
			card.ssids.splice(i, 1);
			if (row.view.parentNode)
				row.view.parentNode.removeChild(row.view);
			if (!card.ssids.length) {
				var fresh = self.buildSsidRow({}, self.networks);
				card.ssids.push(fresh);
				card.ssidList.appendChild(fresh.view);
			}
		});
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

	updateMeshState: function() {
		if (!this.backhaulCards) return;
		this.syncBackhaulCards();
		this.syncRoleCards();

		var backhaul = this.backhaul();
		var role = this.role();
		var useWired = backhaul === 'wired';
		var useWireless = backhaul === 'wireless';

		this.wirelessGroup.classList.toggle('hidden', !useWireless);
		this.meshRadioInput.disabled = !useWireless;
		this.meshIdInput.disabled = !useWireless;
		this.meshKeyInput.disabled = !useWireless;
		this.meshProtoInput.disabled = !useWireless;

		// HWMP replaces batman-adv only for the wireless link - a wired
		// backhaul has no L2 routing of its own and keeps bat0
		if (this.batAdvanced)
			this.batAdvanced.classList.toggle('hidden',
				!(this.meshProtoInput.value !== 'hwmp' || useWired));

		// role specific fields
		this.slaveIpInput.parentNode.parentNode.classList.toggle('hidden', role !== 'slave');
		this.gwSelClassInput.parentNode.parentNode.classList.toggle('hidden', role !== 'slave');

		// coverage is configured per SSID: a disabled radio keeps its
		// current AP settings until it is switched back on
		this.apConfigInputs.forEach(function(card) {
			var sync = this.apSyncInput.checked;
			card.channel.disabled = !sync;
			if (card.htmode) card.htmode.disabled = !sync;
			if (card.countEl)
				card.countEl.textContent = _('SSID 列表（%d 个）').format(card.ssids.length);
			card.ssids.forEach(function(row) {
				var on = sync && !row.removed && row.enabled.checked;
				row.enabled.disabled = !sync || row.removed;
				row.ssid.disabled = !on;
				row.encryption.disabled = !on;
				row.key.disabled = !on || row.encryption.value === 'none';
				row.network.disabled = !on;
				[ row.ieee80211k, row.bss_transition, row.wnm_sleep_mode,
					row.proxy_arp, row.isolate ].forEach(function(el) {
					el.disabled = !on;
				});
				if (row.ft) {
					row.ft.ieee80211r.disabled = !on;
					[ row.ft.mobility_domain, row.ft.reassociation_deadline,
						row.ft.ft_over_ds, row.ft.ft_psk_generate_local,
						row.ft.pmk_r1_push ].forEach(function(el) {
						el.disabled = !on || !row.ft.ieee80211r.checked;
					});
				}
			});
		}, this);

		this.updateCoverageAlert();
	},

	updateCoverage: function() {
		this.updateMeshState();
	},

	// Every radio carries its own SSID / encryption / key, so bands -- and even
	// radios inside the same band -- may be named independently. Roaming only
	// needs the same SSID on several APs to share encryption and key, which the
	// "generate child config" step takes care of. The one thing worth flagging
	// here is two radios of the same band sitting on the same channel.
	// A radio only counts as "in use" when at least one of its SSIDs is
	// enabled and not marked for deletion.
	radioActive: function(card) {
		return (card.ssids || []).some(function(row) {
			return row.enabled.checked && !row.removed;
		});
	},

	// Blocking mistakes: the resulting config would be ambiguous or plainly
	// wrong, so applying is refused until they are fixed.
	coverageBlockers: function() {
		var blockers = [];

	(this.apConfigInputs || []).forEach(function(card) {
		var names = {};
		card.ssids.forEach(function(row) {
			if (row.removed || !row.enabled.checked) return;
			var name = (row.ssid.value || '').trim();
			if (!name) return;
			if (names[name]) {
				blockers.push(_('%s 上有重复的 SSID「%s」').format(radioTitle(card), name));
				return;
			}
			names[name] = 1;

			// 802.11r needs WPA2/WPA3 and a shared 4 hex digit domain
			if (row.ft && row.ft.ieee80211r.checked) {
				var enc = row.encryption.value;
				if (enc === 'none' || enc === 'owe') {
					blockers.push(_('SSID「%s」启用了 802.11r，但 %s 加密不支持 FT').format(name, enc));
					return;
				}
				if (!/^[0-9a-fA-F]{4}$/.test((row.ft.mobility_domain.value || '').trim())) {
					blockers.push(_('SSID「%s」的 802.11r 移动域必须是 4 位十六进制字符').format(name));
					return;
				}
				var dl = (row.ft.reassociation_deadline.value || '').trim();
				if (dl && (!/^[0-9]+$/.test(dl) || +dl < 1 || +dl > 65535))
					blockers.push(_('SSID「%s」的 802.11r 重关联时限必须在 1-65535 之间').format(name));
			}
		});
	});

	return blockers;
},

	coverageProblems: function() {
		var self = this;
		var active = (this.apConfigInputs || []).filter(this.radioActive);
		var problems = this.coverageBlockers();
		var seen = {};

		active.forEach(function(c) {
			var ch = c.channel.value;
			if (!ch || ch === 'auto') return;
			// only radios inside the same band can actually collide
			var k = (c.band || '') + ':' + ch;
			if (seen[k]) {
				var band = bandLabel(c.band);
				problems.push(_('%s 频段有 radio 复用频道 %s，会互相干扰，请错开')
					.format(band ? band.replace(' radio', '') : _('同'), ch));
			}
			seen[k] = 1;
		});

		// an SSID bound to a network that no longer exists would leave the
		// interface unbridged after a reload
		var known = (this.networks || []).map(function(n) { return n.name; });
		(this.apConfigInputs || []).forEach(function(card) {
			card.ssids.forEach(function(row) {
				if (row.removed || !row.enabled.checked) return;
				var net = row.network.value;
				if (net && known.length && known.indexOf(net) < 0)
					problems.push(_('SSID「%s」绑定的网络 %s 已不存在').format(
						(row.ssid.value || '').trim() || '?', net));
			});
		});

		return problems;
	},

	updateCoverageAlert: function() {
		if (!this.coverageAlert) return;
		var problems = this.coverageProblems();

		this.coverageAlert.innerHTML = '';
		this.coverageAlert.classList.toggle('hidden', !problems.length);
		if (!problems.length) return;

		this.coverageAlert.appendChild(E('strong', {}, _('无线覆盖配置提醒')));
		this.coverageAlert.appendChild(E('div', {}, problems.join('；') + '。'));
		this.coverageAlert.appendChild(E('div', {}, _('各 SSID 的名称、加密方式与密码相互独立；跨机漫游只需保证多台 AP 上同名 SSID 的设置一致。')));
	},

	// Only non-empty values are sent: an empty field means "remove the UCI
	// option", which restores the kernel / netifd default.
	collectMeshParams: function() {
		var out = {}, self = this;
		Object.keys(this.meshParamInputs || {}).forEach(function(k) {
			var v = (self.meshParamInputs[k].value || '').trim();
			if (v !== '') out[k] = v;
		});
		return out;
	},

	collectBatAdvanced: function() {
		var out = {}, self = this;
		Object.keys(this.batAdvInputs || {}).forEach(function(k) {
			var v = (self.batAdvInputs[k].value || '').trim();
			if (v !== '') out[k] = v;
		});
		return out;
	},

	collectChannels: function() {
		return this.apConfigInputs.map(function(config) {
			return {
				radio: config.radio,
				channel: config.channel.value,
				htmode: config.htmode ? config.htmode.value : ''
			};
		});
	},

	// Flatten every radio's SSID rows into the list the backend expects.
	// A brand new row that is deleted again is dropped outright; an existing
	// interface is sent with remove=1 so the backend deletes it.
	collectApEntries: function() {
		var out = [];
		this.apConfigInputs.forEach(function(card) {
			card.ssids.forEach(function(row) {
				if (!row.section && row.removed) return;
				out.push({
					radio: card.radio,
					section: row.section || '',
					remove: row.removed ? 1 : 0,
					enabled: row.enabled.checked ? 1 : 0,
					ssid: (row.ssid.value || '').trim(),
					encryption: row.encryption.value || 'sae-mixed',
					key: row.key.value || '',
					network: row.network.value || 'lan',
					ieee80211k: row.ieee80211k.checked ? 1 : 0,
					bss_transition: row.bss_transition.checked ? 1 : 0,
					wnm_sleep_mode: row.wnm_sleep_mode.checked ? 1 : 0,
					proxy_arp: row.proxy_arp.checked ? 1 : 0,
					isolate: row.isolate.checked ? 1 : 0,
					ieee80211r: (row.ft && row.ft.ieee80211r.checked) ? 1 : 0,
					mobility_domain: (row.ft ? (row.ft.mobility_domain.value || '').trim() : ''),
					ft_over_ds: (row.ft && row.ft.ft_over_ds.checked) ? 1 : 0,
					ft_psk_generate_local: (row.ft && row.ft.ft_psk_generate_local.checked) ? 1 : 0,
					reassociation_deadline: (row.ft ? (row.ft.reassociation_deadline.value || '').trim() : ''),
					pmk_r1_push: (row.ft && row.ft.pmk_r1_push.checked) ? 1 : 0
				});
			});
		});
		return out;
	},

	confirmMesh: function() {
		var backhaul = this.backhaul();
		var role = this.role();
		var useWired = backhaul === 'wired';
		var useWireless = backhaul === 'wireless';

		if (useWireless && !this.meshRadioInput.value) {
			ui.addNotification(null, E('p', _('无线组网需要选择一个用于回程的 5G / 6G radio。')));
			return;
		}
		if (useWireless && !this.meshIdInput.value.trim()) {
			ui.addNotification(null, E('p', _('请填写 Mesh ID，同一组网内所有节点必须一致。')));
			return;
		}
		if (this.apSyncInput.checked) {
			var errors = this.coverageErrors();
			if (errors.length) {
				ui.addNotification(null, E('p', _('无线覆盖配置有问题：%s。').format(errors.join('；'))));
				return;
			}
		}

		var wiredText = useWired
			? _('有线回程：复用 br-lan 全部网口，任意网口接入对端节点即可成网，bridge loop avoidance 防止环路。')
			: _('有线回程：未启用。');

		var wirelessText = useWireless
			? _('无线回程：在 %s 上创建 802.11s + SAE 链路，Mesh ID 为 %s。').format(this.meshRadioInput.value, this.meshIdInput.value.trim())
			: _('无线回程：未启用。');

		var roleText = ({
			master: _('本机作为主节点：保留 DHCP 与上网出口，batman-adv 网关角色为 server。'),
			slave: _('本机作为从节点：关闭本机 DHCP，与主节点同网段，由主节点统一分配地址，网关角色为 client。'),
			peer: _('本机作为对等节点：不发布网关，各节点自行决定出口。')
		})[role];

		return ui.showModal(_('确认应用 Mesh 组网'), [
			E('p', {}, _('将修改 batman-adv、wireless、network、dhcp 配置并立即重新加载网络。')),
			E('div', { 'class': 'nm-alert' }, roleText),
			E('p', {}, wiredText),
			E('p', {}, wirelessText),
			E('p', {}, this.apSyncInput.checked
				? _('无线覆盖：按各 SSID 的设置下发，共 %d 个 SSID，各 SSID 绑定到各自的网络（VLAN），频道号按 radio 下发。')
					.format(this.collectApEntries().filter(function(e) { return !e.remove; }).length)
				: _('无线覆盖：不下发，各 radio 保留当前 AP 配置。')),
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
		var useWired = backhaul === 'wired';
		var useWireless = backhaul === 'wireless';

		return callApplyMesh(
			backhaul,
			role,
			useWired ? '1' : '0',
			useWireless ? '1' : '0',
			useWireless ? (this.meshRadioInput.value || '') : '',
			(this.meshIdInput.value || '').trim(),
			this.meshKeyInput.value || '',
			'', /* gateway: derived from role on the device */
			'', /* gw_bandwidth: always announced at maximum on the device */
			(this.gwSelClassInput.value || '').trim(),
			(this.slaveIpInput.value || '').trim(),
			'0', /* unified: coverage is configured per radio */
			'',
			'sae-mixed',
			'',
			syncAp === false ? '0' : (this.apSyncInput.checked ? '1' : '0'),
			JSON.stringify(this.collectApEntries()),
			JSON.stringify(this.collectChannels()),
			this.meshProtoInput.value || 'batman',
			JSON.stringify(this.collectMeshParams()),
			this.batAlgoInput.value || 'BATMAN_IV',
			JSON.stringify(this.collectBatAdvanced())
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
			msg = _('已应用。');
		else if (res.backhaul === 'off')
			msg = _('Mesh 已关闭。');
		else
			msg = _('已应用（%s / %s）。').format(res.backhaul, roleLabel(res.role || 'peer'));
		ui.addNotification(null, E('p', msg));
		return this.refresh();
	},

	generateChildConfig: function() {
		var childSuffix = parseInt((this.slaveIpInput.value || '').trim(), 10);
		if (!childSuffix) {
			ui.addNotification(null, E('p', _('请先填写从节点 IP 尾号。')));
			return;
		}
		// node ordinal relative to this node: master keeps the channels it
		// runs now (offset 0), the first child gets the next channel of each
		// band, and so on - this is what actually spreads same-band channels
		// across multiple APs
		var masterSuffix = parseInt(String((this.status && this.status.lan_ip) || '').split('.').pop(), 10) || 0;
		var offset = childSuffix - masterSuffix;
		return callGenerateChildConfig(String(childSuffix), String(offset)).then(L.bind(function(res) {
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
		var self = this;
		var masterAdjLines = (res.master_adjustments || []).map(function(a) {
			var label = bandLabel(a.band);
			var from = a.from || 'auto';
			return _('%s（%s）：%s → %s%s').format(a.radio, label || a.band, from, a.to,
				a.backhaul ? _('（回程，已固定）') : '');
		});

		var channelLines = (res.channels || []).map(function(c) {
			var label = bandLabel(c.band);
			return _('%s（%s）：频道 %s%s').format(c.radio, label || c.band, c.channel,
				c.backhaul ? _('（回程，必须沿用主节点）') : '');
		});

		var preview = E('textarea', {
			'class': 'nm-config-preview', 'readonly': 'readonly', 'wrap': 'off'
		}, childConfigText(res));

		return ui.showModal(_('子节点配置已生成'), [
			E('p', {}, _('把它导入从节点即可复用主节点的 Mesh ID、SSID 与加密方式。设备临时目录: %s').format(res.path || '-')),
			masterAdjLines.length
				? E('div', { 'class': 'nm-alert' }, [
					E('strong', {}, _('主节点以下 radio 已固定到池中频道以避免与子节点重叠：')),
					E('div', {}, masterAdjLines.join('；')),
					E('div', { 'class': 'nm-muted' }, _('主节点配置已写入，需执行 wifi reload 或重启主节点后生效。'))
				])
				: '',
			channelLines.length
				? E('div', { 'class': 'nm-alert ok' }, [
					E('strong', {}, _('该子节点已按节点序号自动错开同频段频道：')),
					E('div', {}, channelLines.join('；')),
					E('div', { 'class': 'nm-muted' }, _('标记“回程”的 radio 故意与主节点保持同频道：802.11s 只能在同一频道上建立 peer link。'))
				])
				: '',
			preview,
			E('div', { 'class': 'right' }, [
				E('button', {
					'class': 'cbi-button cbi-button-neutral',
					'click': function() { self.downloadChildConfig(res); }
				}, _('下载配置')),
				' ',
				E('button', {
					'class': 'cbi-button cbi-button-neutral',
					'click': function() { copyElementText(preview); }
				}, _('复制')),
				' ',
				E('button', { 'class': 'cbi-button cbi-button-neutral', 'click': ui.hideModal }, _('关闭'))
			])
		]);
	},

	downloadChildConfig: function(res) {
		var suffix = (this.slaveIpInput && this.slaveIpInput.value || '').trim() || 'node';
		var blob = new Blob([ childConfigText(res) ], { type: 'text/plain;charset=utf-8' });
		var url = URL.createObjectURL(blob);
		var a = document.createElement('a');
		a.href = url;
		a.download = 'meshconf-child-' + suffix + '.txt';
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
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
		this.topologyBox.appendChild(renderTopologyHTML(discovery, roleText, this.topologyBox.clientWidth || 0));
	}
});

// Kept separate from renderTopology() above: the SVG markup is generated as a
// string (LuCI's E() cannot namespace SVG children) and injected once.
function renderTopologyHTML(discovery, roleText, containerW) {
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

	// The canvas always fills the section width (it is aligned with the
	// blocks above): the viewBox width tracks the container, the slack goes
	// into the link corridor between the local node and the neighbor
	// columns. Cards keep a fixed size and are never stretched; on narrow
	// screens the drawing scales down as a whole. A minimum height keeps
	// the canvas roomy for observation, and the card block is centered
	// vertically inside it.
	var PAD = 32, HEAD = 34, CARD_W = 236, CARD_H = 72, GAP = 16, MAX_ROWS = 10;
	var LOCAL_W = 208, COL_GAP = 16, LINK_GAP = 96, MIN_H = 420;
	var cols = [];
	if (meshNodes.length) cols.push({ key: 'mesh', title: _('Mesh 回程邻居'), items: meshNodes, glyph: _('网'), tag: _('Mesh') });
	if (lanNodes.length) cols.push({ key: 'lan', title: _('局域网终端'), items: lanNodes, glyph: _('端'), tag: _('LAN') });

	var rows = 0;
	cols.forEach(function(c) {
		rows = Math.max(rows, Math.min(c.items.length, MAX_ROWS) + (c.items.length > MAX_ROWS ? 1 : 0));
	});
	var bodyH = rows * CARD_H + (rows - 1) * GAP + (cols.some(function(c) { return c.items.length > MAX_ROWS; }) ? 20 : 0);
	var colsW = cols.length * CARD_W + (cols.length - 1) * COL_GAP;
	var naturalW = PAD * 2 + LOCAL_W + LINK_GAP + colsW;
	var W = Math.max(containerW || 0, naturalW);
	var areaX = W - PAD - colsW;
	if (areaX < PAD + LOCAL_W + LINK_GAP) {
		W = naturalW;
		areaX = PAD + LOCAL_W + LINK_GAP;
	}
	var contentH = PAD * 2 + HEAD + bodyH;
	var H = Math.max(MIN_H, contentH);
	var bodyTop = PAD + HEAD + (H - contentH) / 2;

	var localX = PAD;
	var localY = bodyTop + (rows * CARD_H + (rows - 1) * GAP - CARD_H) / 2;

	var svg = [ '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(_('网络拓扑')) + '">' ];

	cols.forEach(function(c, ci) {
		var x = areaX + ci * (CARD_W + COL_GAP);
		svg.push('<text class="nm-t-col" x="' + x + '" y="' + (bodyTop - 22) + '">' + esc(c.title) + '</text>');
		c.items.slice(0, MAX_ROWS).forEach(function(n, i) {
			var y = bodyTop + i * (CARD_H + GAP);
			var x1 = localX + LOCAL_W, y1 = localY + CARD_H / 2;
			var x2 = x, y2 = y + CARD_H / 2;
			var dx = Math.max(26, (x2 - x1) * 0.45);
			svg.push('<path class="nm-t-link ' + (c.key === 'mesh' ? 'mesh' : '') + '" d="M' + x1 + ' ' + y1 +
				' C' + (x1 + dx) + ' ' + y1 + ', ' + (x2 - dx) + ' ' + y2 + ', ' + x2 + ' ' + y2 + '"/>');
			if (c.key === 'mesh' && n.tq)
				svg.push('<text class="nm-t-lq" x="' + ((x1 + x2) / 2) + '" y="' + ((y1 + y2) / 2 - 5) +
					'" text-anchor="middle">' + esc('TQ ' + n.tq) + '</text>');
			svg.push(nodeCard(x, y, CARD_W, CARD_H, c.key,
				n.label || n.ip || n.mac || '', nodeMeta(n), c.tag, c.glyph));
		});
		if (c.items.length > MAX_ROWS)
			svg.push('<text class="nm-t-sub" x="' + x + '" y="' +
				(bodyTop + MAX_ROWS * (CARD_H + GAP) + 2) + '">' +
				esc(_('…另有 %d 个节点').format(c.items.length - MAX_ROWS)) + '</text>');
	});

	svg.push(nodeCard(localX, localY, LOCAL_W, CARD_H, 'local',
		local.label || _('本机'), [ roleText, local.ip ].filter(function(x) { return x; }).join(' · '), _('本机'), _('本')));
	svg.push('</svg>');

	wrap.className = 'nm-topology';
	wrap.innerHTML = svg.join('');
	return wrap;
}

function nodeCard(x, y, w, h, kind, title, sub, tag, glyph) {
	// fixed-size text badge: it identifies the node type at a glance and
	// keeps the text block from ever touching the card border
	var badge = 30;
	var bx = x + 12, by = y + (h - badge) / 2;
	var tx = bx + badge + 12;

	return '<g>' +
		'<rect class="nm-t-card ' + kind + '" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="10"/>' +
		(glyph
			? '<rect class="nm-t-badge ' + kind + '" x="' + bx + '" y="' + by + '" width="' + badge + '" height="' + badge + '" rx="9"/>' +
			  '<text class="nm-t-glyph" x="' + (bx + badge / 2) + '" y="' + (by + badge / 2 + 5) + '">' + esc(glyph) + '</text>'
			: '') +
		'<text class="nm-t-title" x="' + tx + '" y="' + (y + 31) + '">' + esc(textLimit(title, 18)) + '</text>' +
		'<text class="nm-t-sub" x="' + tx + '" y="' + (y + 50) + '">' + esc(textLimit(sub, 24)) + '</text>' +
		(tag ? '<text class="nm-t-tag" x="' + (x + w - 10) + '" y="' + (y + 16) + '" text-anchor="end">' + esc(tag) + '</text>' : '') +
		'</g>';
}
