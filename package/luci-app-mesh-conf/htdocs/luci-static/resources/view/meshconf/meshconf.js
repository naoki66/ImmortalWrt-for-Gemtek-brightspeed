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
	params: [ 'vlans', 'mode' ]
});

var callGenerateChildConfig = rpc.declare({
	object: 'luci.meshconf',
	method: 'generateChildConfig',
	params: [ 'ip_suffix', 'offset' ]
});

/* ---------------------------------------------------------------------------
 * Shared design tokens.
 *
 * The canonical values live in docs/design-luci-vlan-ui.md and are mirrored in
 * the Switch view's stylesheet (view/network/switch-vlan.css, see
 * patches/feeds/luci/.../102-align-switch-vlan-design-tokens.patch) so that
 * the two pages editing the same bridge-vlan model read as one product.
 *
 * Surfaces, text and borders map onto the LuCI theme variables instead of
 * being hardcoded: the theme owns its light/dark palette, and the previous
 * fixed GitHub palette plus the body-background luminance probe made this page
 * ignore it entirely. Themes that ship a dark mode also set
 * :root[data-darkmode="true"], which is the only extra hook the accents need.
 *
 * Sizes are em-based, never px: the LuCI theme sets the base font size, and
 * only a relative scale keeps the page in step with it.
 *
 * Every foreground below was verified against its own tint to reach WCAG 2.2
 * AA (>= 4.5:1, or >= 3:1 for borders and non-text UI); the measured ratios
 * are tabulated in the design document.
 * ------------------------------------------------------------------------- */
var css = [
	'.meshconf-page{--ds-surface:var(--background-color-high,#fff);--ds-surface-sunken:var(--background-color-medium,#f6f8fa);--ds-border:var(--border-color-low,#d8dee4);--ds-border-strong:var(--border-color-medium,#b8c0c8);--ds-text:var(--text-color-high,#1f2328);--ds-text-muted:var(--text-color-low,#5c6773);--ds-primary:var(--primary-color-high,#0969da);--ds-primary-text:#0969da;--ds-ok:#1a7f37;--ds-ok-tint:rgba(26,127,55,.08);--ds-ok-line:rgba(26,127,55,.35);--ds-warn:#bc4c00;--ds-warn-tint:rgba(188,76,0,.08);--ds-warn-line:rgba(188,76,0,.35);--ds-error:#cf222e;--ds-error-tint:rgba(207,34,46,.08);--ds-error-line:rgba(207,34,46,.40);--ds-info:#0969da;--ds-info-tint:rgba(9,105,218,.08);--ds-info-line:rgba(9,105,218,.35);--ds-focus-ring:rgba(9,105,218,.32);--ds-accent:#6f42c1;--ds-accent-tint:rgba(130,80,223,.10);--ds-untagged:#0f766e;--ds-untagged-tint:rgba(13,148,136,.10);--ds-tagged:#92400e;--ds-tagged-tint:rgba(217,119,6,.10);--ds-r-sm:4px;--ds-r-md:6px;--ds-r-lg:8px;--ds-r-pill:999px;--ds-sp-1:.25em;--ds-sp-2:.5em;--ds-sp-3:.75em;--ds-sp-4:1em;--ds-sp-5:1.5em;--ds-fs-xs:.8em;--ds-fs-sm:.88em;--ds-fs-base:1em;--ds-fs-lg:1.1em;--ds-fs-xl:1.35em;--ds-fs-2xl:1.6em;--ds-shadow-1:0 1px 2px rgba(16,24,40,.04);line-height:1.5;color:var(--ds-text)}',
	'.meshconf-page :focus-visible{outline:2px solid var(--ds-primary);outline-offset:2px}',
	'.meshconf-page h2{margin:0 0 var(--ds-sp-1);font-size:var(--ds-fs-2xl);line-height:1.3;font-weight:650;color:var(--ds-text)}',
	'.meshconf-page .nm-lede{margin:0 0 var(--ds-sp-4);color:var(--ds-text-muted);font-size:var(--ds-fs-sm)}',
	'.nm-section{margin:0 0 var(--ds-sp-5);padding:var(--ds-sp-4) var(--ds-sp-5);border:1px solid var(--ds-border);border-radius:var(--ds-r-lg);background:var(--ds-surface);box-shadow:var(--ds-shadow-1)}',
	'.nm-title{display:flex;align-items:center;justify-content:space-between;gap:var(--ds-sp-3);margin:0;font-size:var(--ds-fs-lg);font-weight:650}',
	'.nm-title .nm-muted{font-size:var(--ds-fs-sm);font-weight:400}',
	'.nm-subtitle{margin:var(--ds-sp-1) 0 var(--ds-sp-4);color:var(--ds-text-muted);font-size:var(--ds-fs-sm)}',
	'.nm-muted{color:var(--ds-text-muted)}',
	'.nm-hint{margin:var(--ds-sp-3) 0 0;font-size:var(--ds-fs-sm);line-height:1.6;color:var(--ds-text-muted)}',
	'.nm-alert{margin:var(--ds-sp-3) 0 0;padding:var(--ds-sp-2) var(--ds-sp-3);border:1px solid var(--ds-warn-line);border-radius:var(--ds-r-md);background:var(--ds-warn-tint);color:var(--ds-warn);font-size:var(--ds-fs-sm);line-height:1.6}',
	'.nm-alert.ok{border-color:var(--ds-ok-line);background:var(--ds-ok-tint);color:var(--ds-ok)}',
	'.nm-alert.hidden{display:none}',
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
	/* numbered step groups */
	'.nm-group{margin-top:var(--ds-sp-5);padding-top:var(--ds-sp-4);border-top:1px dashed var(--ds-border)}',
	'.nm-group.first{border-top:0;padding-top:0;margin-top:var(--ds-sp-1)}',
	'.nm-group-head{display:flex;align-items:center;gap:var(--ds-sp-2);margin:0 0 var(--ds-sp-1);font-size:var(--ds-fs-base);font-weight:650}',
	'.nm-step{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:var(--ds-primary-text);color:#fff;font-size:var(--ds-fs-xs);font-weight:700;flex:0 0 auto}',
	'.nm-group-desc{margin:0 0 var(--ds-sp-3);padding-left:28px;color:var(--ds-text-muted);font-size:var(--ds-fs-sm);line-height:1.6}',
	'.nm-group.hidden{display:none}',
	'.nm-field.hidden{display:none}',
	'',
	/* choice cards: auto-fit grid, so no breakpoint is needed */
	'.nm-choices{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:var(--ds-sp-3)}',
	'.nm-choices.two{grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}',
	'.nm-choice{position:relative;display:block;min-height:44px;border:1px solid var(--ds-border);border-radius:var(--ds-r-md);background:var(--ds-surface-sunken);padding:var(--ds-sp-3) var(--ds-sp-4);cursor:pointer;transition:border-color .18s,box-shadow .18s,background .18s}',
	'.nm-choice input{position:absolute;width:1px;height:1px;opacity:0;margin:0}',
	'.nm-choice:hover{border-color:var(--ds-primary)}',
	'.nm-choice.active{border-color:var(--ds-primary);background:var(--ds-info-tint);box-shadow:0 0 0 1px var(--ds-primary)}',
	'.nm-choice:focus-within{outline:2px solid var(--ds-primary);outline-offset:2px}',
	'.nm-choice.disabled{opacity:.5;cursor:not-allowed}',
	'.nm-choice.disabled:hover{border-color:var(--ds-border)}',
	'.nm-choice-title{display:flex;align-items:center;gap:var(--ds-sp-2);font-size:var(--ds-fs-base);font-weight:650}',
	'.nm-choice-desc{display:block;margin-top:var(--ds-sp-1);color:var(--ds-text-muted);font-size:var(--ds-fs-sm);line-height:1.5}',
	'.nm-choice-dot{width:8px;height:8px;border-radius:50%;background:var(--ds-border-strong);flex:0 0 auto}',
	'.nm-choice.active .nm-choice-dot{background:var(--ds-primary)}',
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
	'.nm-radio-line{display:flex;gap:var(--ds-sp-5);flex-wrap:wrap;min-height:34px;align-items:center}',
	'.nm-radio-line label{display:inline-flex;gap:var(--ds-sp-2);align-items:center;font-weight:400;color:var(--ds-text);font-size:var(--ds-fs-base);cursor:pointer}',
	'.nm-radio-line input{margin:0;accent-color:var(--ds-primary)}',
	'.nm-check input{width:16px;height:16px;margin:0;accent-color:var(--ds-primary)}',
	'',
	/* per-radio cards (diagnostics only - the coverage step is a summary) */
	'.nm-ap-radio{border:1px solid var(--ds-border);border-radius:var(--ds-r-md);padding:var(--ds-sp-3);background:var(--ds-surface-sunken)}',
	'.nm-ap-radio-title{display:flex;align-items:center;justify-content:space-between;gap:var(--ds-sp-2);font-weight:650;font-size:var(--ds-fs-base)}',
	'.nm-band{display:inline-flex;align-items:center;min-height:19px;padding:0 var(--ds-sp-2);border-radius:var(--ds-r-sm);font-size:var(--ds-fs-xs);font-weight:650;background:var(--ds-info-tint);color:var(--ds-info)}',
	'.nm-ap-radio-meta{margin:2px 0 var(--ds-sp-2);color:var(--ds-text-muted);font-size:var(--ds-fs-xs);word-break:break-all}',
	'.nm-ap-radio .nm-form{margin-top:0;grid-template-columns:1fr 1fr;gap:var(--ds-sp-2)}',
	'.nm-ap-radio .nm-field.wide{grid-column:1 / -1}',
	'',
	/* action rows */
	'.nm-actions{display:flex;gap:var(--ds-sp-2);flex-wrap:wrap;margin-top:var(--ds-sp-4);padding-top:var(--ds-sp-3);border-top:1px solid var(--ds-border)}',
	'.nm-actions .cbi-button{min-height:34px}',
	'',
	/* topology */
	'.nm-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(116px,1fr));gap:var(--ds-sp-2);margin:var(--ds-sp-3) 0}',
	'.nm-stat{border:1px solid var(--ds-border);border-radius:var(--ds-r-md);background:var(--ds-surface-sunken);padding:var(--ds-sp-2) var(--ds-sp-3)}',
	'.nm-stat-value{font-size:var(--ds-fs-xl);font-weight:700;line-height:1.25;color:var(--ds-text)}',
	'.nm-stat-label{font-size:var(--ds-fs-xs);color:var(--ds-text-muted)}',
	'.nm-topology{width:100%;box-sizing:border-box;margin:0 auto;border:1px solid var(--ds-border);border-radius:var(--ds-r-lg);background:var(--ds-surface-sunken);overflow:hidden}',
	'.nm-topology svg{display:block;width:100%;height:auto}',
	'.nm-legend{display:flex;gap:var(--ds-sp-4);flex-wrap:wrap;align-items:center;margin:var(--ds-sp-3) 0 0;font-size:var(--ds-fs-sm);color:var(--ds-text-muted)}',
	'.nm-legend i{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:var(--ds-r-sm);margin-right:var(--ds-sp-2);vertical-align:-3px;color:#fff;font-size:var(--ds-fs-xs);font-weight:700;font-style:normal}',
	'.nm-legend .k-local{background:var(--ds-primary-text)}.nm-legend .k-mesh{background:var(--ds-accent)}.nm-legend .k-lan{background:var(--ds-ok)}',
	'.nm-empty{display:flex;flex-direction:column;justify-content:center;min-height:220px;box-sizing:border-box;padding:var(--ds-sp-5) var(--ds-sp-4);text-align:center;color:var(--ds-text-muted);border:1px dashed var(--ds-border);border-radius:var(--ds-r-md)}',
	'.nm-empty strong{display:block;color:var(--ds-text);font-size:var(--ds-fs-lg);margin-bottom:var(--ds-sp-1)}',
	'.nm-config-preview{width:100%;min-height:180px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:var(--ds-fs-xs);white-space:pre;box-sizing:border-box}',
	'',
	/* topology SVG primitives */
	'.nm-t-card{fill:var(--ds-surface);stroke:var(--ds-border);stroke-width:1}',
	'.nm-t-card.local{fill:var(--ds-info-tint);stroke:var(--ds-primary-text);stroke-width:2}',
	'.nm-t-card.mesh{fill:var(--ds-accent-tint);stroke:var(--ds-accent)}',
	'.nm-t-card.lan{fill:var(--ds-ok-tint);stroke:var(--ds-ok)}',
	'.nm-t-badge.local{fill:var(--ds-primary-text)}',
	'.nm-t-badge.mesh{fill:var(--ds-accent)}',
	'.nm-t-badge.lan{fill:var(--ds-ok)}',
	'.nm-t-glyph{font-size:14px;font-weight:700;fill:#fff;text-anchor:middle;font-style:normal}',
	'.nm-t-title{font-size:var(--ds-fs-base);font-weight:650;fill:var(--ds-text)}',
	'.nm-t-sub{font-size:var(--ds-fs-xs);fill:var(--ds-text-muted)}',
	'.nm-t-tag{font-size:var(--ds-fs-xs);font-weight:650;fill:var(--ds-text-muted)}',
	'.nm-t-col{font-size:var(--ds-fs-sm);font-weight:650;fill:var(--ds-text-muted);letter-spacing:.04em}',
	'.nm-t-link{fill:none;stroke:var(--ds-ok);stroke-width:2}',
	'.nm-t-link.mesh{stroke:var(--ds-accent);stroke-width:2;stroke-dasharray:6 4}',
	'.nm-t-lq{font-size:var(--ds-fs-xs);fill:var(--ds-text-muted)}',
	'',
	/* Wireless coverage summary. The per-SSID editor is gone: the mesh profile
	 * *is* the node's own wireless config, so the page only has to state what
	 * is being distributed. Each radio is one row, and the SSID is real text -
	 * never only a colour or a tooltip (WCAG 2.2 SC 1.3.1 / 1.4.1). */
	'.nm-ssid-head{display:flex;align-items:center;justify-content:space-between;gap:var(--ds-sp-2);margin:var(--ds-sp-3) 0 var(--ds-sp-2);font-size:var(--ds-fs-sm);font-weight:650;color:var(--ds-text-muted)}',
	'.nm-cover-list{display:flex;flex-direction:column;gap:var(--ds-sp-1)}',
	'.nm-cover-item{display:flex;flex-wrap:wrap;align-items:baseline;gap:var(--ds-sp-1) var(--ds-sp-3);border:1px solid var(--ds-border);border-radius:var(--ds-r-md);background:var(--ds-surface-sunken);padding:var(--ds-sp-2) var(--ds-sp-3);font-size:var(--ds-fs-sm)}',
	'.nm-cover-radio{font-weight:650;flex:0 0 auto}',
	'.nm-cover-ssid{font-weight:650;flex:1 1 auto;min-width:0;word-break:break-all}',
	'.nm-cover-meta{color:var(--ds-text-muted);font-size:var(--ds-fs-xs);flex:0 0 auto}',
	'.nm-check{display:inline-flex;align-items:center;gap:var(--ds-sp-2);font-size:var(--ds-fs-sm);color:var(--ds-text);cursor:pointer;white-space:nowrap;flex:0 0 auto}',
	'.nm-mini{min-height:26px;padding:0 var(--ds-sp-2);font-size:var(--ds-fs-sm);flex:0 0 auto}',
	'',
	/* VLAN segmentation */
	'.nm-vlan-list{display:flex;flex-direction:column;gap:var(--ds-sp-3)}',
	'.nm-vlan-row{border:1px solid var(--ds-border);border-radius:var(--ds-r-md);background:var(--ds-surface-sunken);padding:var(--ds-sp-3)}',
	'.nm-vlan-row.removed{opacity:.6;border-style:dashed}',
	'.nm-vlan-row.conflict{border-color:var(--ds-error);box-shadow:0 0 0 1px var(--ds-error)}',
	'.nm-vlan-head{display:flex;align-items:center;gap:var(--ds-sp-2);flex-wrap:wrap;margin-bottom:var(--ds-sp-2)}',
	'.nm-vlan-title{font-size:var(--ds-fs-base);font-weight:650;margin-right:auto}',
	'.nm-tag{display:inline-flex;align-items:center;min-height:19px;padding:0 var(--ds-sp-2);border-radius:var(--ds-r-sm);font-size:var(--ds-fs-xs);font-weight:650;background:var(--ds-accent-tint);color:var(--ds-accent)}',
	'.nm-vlan-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(148px,1fr));gap:var(--ds-sp-2)}',
	'.nm-ports{display:flex;flex-wrap:wrap;gap:var(--ds-sp-2);margin-top:var(--ds-sp-2);padding-top:var(--ds-sp-2);border-top:1px dashed var(--ds-border)}',
	'.nm-port-item{display:inline-flex;align-items:center;gap:var(--ds-sp-1);font-size:var(--ds-fs-sm);color:var(--ds-text-muted);border:1px solid var(--ds-border);border-radius:var(--ds-r-md);background:var(--ds-surface);padding:var(--ds-sp-1) var(--ds-sp-2) var(--ds-sp-1) var(--ds-sp-3)}',
	'.nm-port-name{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-weight:650;color:var(--ds-text);font-size:var(--ds-fs-sm)}',
	/* Tri-state port egress control: the same off / U / T model, and the same
	 * teal-untagged / amber-tagged language, as the Switch view. 26x24px keeps
	 * it at the WCAG 2.2 minimum target size. */
	'.nm-port-set{display:inline-flex;align-items:stretch;border:1px solid var(--ds-border);border-radius:var(--ds-r-sm);overflow:hidden}',
	'.nm-port-opt{appearance:none;border:0;border-left:1px solid var(--ds-border);background:var(--ds-surface-sunken);color:var(--ds-text-muted);font-family:inherit;font-size:var(--ds-fs-sm);font-weight:650;line-height:1;min-width:26px;min-height:24px;padding:0 var(--ds-sp-2);cursor:pointer}',
	'.nm-port-opt:first-child{border-left:0}',
	'.nm-port-opt:hover{background:var(--ds-surface)}',
	'.nm-port-opt[aria-pressed=true][data-role=""]{background:var(--ds-surface);color:var(--ds-text);box-shadow:inset 0 0 0 1px var(--ds-border-strong)}',
	'.nm-port-opt[aria-pressed=true].u{background:var(--ds-untagged-tint);color:var(--ds-untagged);box-shadow:inset 0 0 0 1px var(--ds-untagged)}',
	'.nm-port-opt[aria-pressed=true].t{background:var(--ds-tagged-tint);color:var(--ds-tagged);box-shadow:inset 0 0 0 1px var(--ds-tagged)}',
	'.nm-port-opt:focus-visible{outline:2px solid var(--ds-primary);outline-offset:-2px}',
	'.nm-legend-role{display:inline-flex;align-items:center;gap:var(--ds-sp-1);font-size:var(--ds-fs-sm);color:var(--ds-text-muted)}',
	'.nm-legend-role b{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;border-radius:var(--ds-r-sm);font-size:var(--ds-fs-xs);font-weight:700}',
	'.nm-legend-role b.u{background:var(--ds-untagged-tint);color:var(--ds-untagged)}',
	'.nm-legend-role b.t{background:var(--ds-tagged-tint);color:var(--ds-tagged)}',
	'',
	/* warnings / banners */
	'.nm-banner{display:flex;gap:var(--ds-sp-2);align-items:flex-start;margin:var(--ds-sp-3) 0 0;padding:var(--ds-sp-2) var(--ds-sp-3);border:1px solid var(--ds-warn-line);border-radius:var(--ds-r-md);background:var(--ds-warn-tint);color:var(--ds-warn);font-size:var(--ds-fs-sm);line-height:1.6}',
	'.nm-banner.bad{border-color:var(--ds-error-line);background:var(--ds-error-tint);color:var(--ds-error)}',
	'.nm-banner.info{border-color:var(--ds-info-line);background:var(--ds-info-tint);color:var(--ds-info)}',
	'.nm-banner strong{display:block;margin-bottom:2px}',
	'.nm-banner.hidden{display:none}',
	'',
	/* 802.11s / batman diagnostics */
	'.nm-details{margin-top:var(--ds-sp-3);border:1px solid var(--ds-border);border-radius:var(--ds-r-md);background:var(--ds-surface-sunken);overflow:hidden}',
	'.nm-details>summary{cursor:pointer;padding:var(--ds-sp-2) var(--ds-sp-3);font-size:var(--ds-fs-sm);font-weight:650;list-style:none}',
	'.nm-details>summary::-webkit-details-marker{display:none}',
	'.nm-details>summary::before{content:"▸";display:inline-block;margin-right:var(--ds-sp-2);transition:transform .15s}',
	'.nm-details[open]>summary::before{content:"▾"}',
	'.nm-details[open]>summary{border-bottom:1px dashed var(--ds-border)}',
	'.nm-details .nm-form{margin:0;padding:var(--ds-sp-3)}',
	'.nm-table{width:100%;border-collapse:collapse;margin-top:var(--ds-sp-3);font-size:var(--ds-fs-sm)}',
	'.nm-table th,.nm-table td{border:1px solid var(--ds-border);padding:var(--ds-sp-1) var(--ds-sp-2);text-align:left;vertical-align:top;word-break:break-all}',
	'.nm-table th{background:var(--ds-surface-sunken);font-weight:650;color:var(--ds-text-muted);white-space:nowrap}',
	'.nm-table td.num{text-align:right;white-space:nowrap}',
	/* em sizes compound, so anything nested one level deeper than the table is
	 * scaled back up instead of shrinking twice. */
	'.nm-table .nm-mono,.nm-table .nm-state,.nm-table .nm-tag,.nm-kv-item .nm-mono{font-size:.95em}',
	'.nm-mono{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:var(--ds-fs-xs)}',
	'.nm-state{display:inline-flex;align-items:center;min-height:19px;padding:0 var(--ds-sp-2);border-radius:var(--ds-r-sm);font-size:var(--ds-fs-xs);font-weight:650;background:var(--ds-surface-sunken);color:var(--ds-text-muted)}',
	'.nm-state.estab{background:var(--ds-ok-tint);color:var(--ds-ok)}',
	'.nm-state.listen{background:var(--ds-warn-tint);color:var(--ds-warn)}',
	'.nm-state.blocked{background:var(--ds-error-tint);color:var(--ds-error)}',
	'.nm-kv{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:var(--ds-sp-1);margin-top:var(--ds-sp-3)}',
	'.nm-kv-item{display:flex;justify-content:space-between;gap:var(--ds-sp-3);border:1px solid var(--ds-border);border-radius:var(--ds-r-sm);background:var(--ds-surface-sunken);padding:var(--ds-sp-1) var(--ds-sp-2);font-size:var(--ds-fs-sm)}',
	'.nm-kv-item span:last-child{font-weight:650}',
	'',
	/* One breakpoint, the same one the Switch view uses. */
	'@media(max-width:720px){.nm-ap-radio .nm-form{grid-template-columns:1fr}.nm-cover-item{flex-direction:column;align-items:flex-start}}'
].join('\n');

/* Dark accents. LuCI themes that ship a dark mode set this attribute on :root;
 * surfaces and text already follow the theme variables, so only the semantic
 * accents have to be re-tuned for a dark background - and the tints get a
 * higher alpha, since a .08 wash is invisible on a dark surface. */
var darkVars = ':root[data-darkmode="true"]{--ds-ok:#4ac26b;--ds-ok-tint:rgba(74,194,107,.18);--ds-ok-line:rgba(74,194,107,.45);--ds-warn:#e3934a;--ds-warn-tint:rgba(227,147,74,.18);--ds-warn-line:rgba(227,147,74,.45);--ds-error:#f47067;--ds-error-tint:rgba(244,112,103,.18);--ds-error-line:rgba(244,112,103,.5);--ds-info:#4d9cf6;--ds-info-tint:rgba(77,156,246,.18);--ds-info-line:rgba(77,156,246,.45);--ds-focus-ring:rgba(77,156,246,.45);--ds-primary-text:#4d9cf6;--ds-accent:#a98bf5;--ds-accent-tint:rgba(169,139,245,.18);--ds-untagged:#2dd4bf;--ds-untagged-tint:rgba(45,212,191,.18);--ds-tagged:#fbbf24;--ds-tagged-tint:rgba(251,191,36,.18);--ds-border-strong:#4a4e55;--ds-shadow-1:none}';

function injectCSS() {
	var el = document.getElementById('meshconf-css');
	if (!el) {
		el = document.createElement('style');
		el.id = 'meshconf-css';
		document.head.appendChild(el);
	}
	el.textContent = css + '\n' + darkVars;
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

// Read-only summary of what the mesh distributes: one row per radio, showing
// the SSID of every AP it advertises and the channel it runs on. Deliberately
// not an editor - the SSID, the encryption and the key live on 网络 → 无线,
// and the generated child bundle copies them from there verbatim, so a second
// editor here would only be a second place for the two to disagree.
//
// The non-overlapping channel pools a child node is spread across stay in the
// backend (CHANNEL_SPREAD there): the page no longer offers a per-radio
// channel dropdown, so it has no use for them.
function coverageRows(configs) {
	if (!configs || !configs.length)
		return [ E('p', { 'class': 'nm-hint' }, _('未发现无线 radio。')) ];

	return configs.map(function(c) {
		var names = (c.aps || []).filter(function(a) { return a.ssid; })
			.map(function(a) { return a.ssid; });
		var meta = [ c.radio ];
		if (c.channel) meta.push(_('频道 %s').format(c.channel));
		if (c.htmode) meta.push(c.htmode);
		if (names.length > 1) meta.push(_('%d 个 SSID').format(names.length));

		return E('div', { 'class': 'nm-cover-item' }, [
			E('span', { 'class': 'nm-cover-radio' }, radioTitle(c)),
			E('span', { 'class': 'nm-cover-ssid' }, names.length ? names.join(' / ') : _('该 radio 未启用 AP')),
			E('span', { 'class': 'nm-cover-meta' }, meta.join(' · '))
		]);
	});
}

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

/* Mirror a port cell's U/T state onto its buttons. `cell.select.value` is the
 * model; the three buttons are only a view of it, so every write goes through
 * here to keep the pressed state in step. */
function syncPortCell(cell) {
	(cell.buttons || []).forEach(function(b) {
		b.setAttribute('aria-pressed', b.getAttribute('data-role') === cell.select.value ? 'true' : 'false');
	});
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

	// Port specs the U/T grid cannot round-trip. Applying rebuilds every
	// bridge-vlan ports list from the grid, so these would be flattened to a
	// single membership; the backend refuses until they are corrected, and
	// saying so here means the operator finds out before clicking apply.
	// The Switch view flags the same two combinations as unsupported.
	if (status.vlan_foreign)
		out.push(E('div', { 'class': 'nm-banner bad' }, [
			E('strong', {}, _('br-lan 上有无法用 U/T 表示的端口标记')),
			E('div', {}, _('以下端口标记带有「同时 tagged 与 untagged」或「只有 PVID、两种出口都没有」的语义：%s。本页的 U/T 网格无法保留它们，应用 VLAN 会被拒绝；请先在 网络 → 交换机/VLAN 页把它们改成明确的 U 或 T。')
				.format(status.vlan_foreign))
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
			E('strong', {}, _('当前：全部透传（扁平二层，全网一个子网）')),
			E('div', {}, _('br-lan 上没有 bridge-vlan，802.1Q 过滤未开启，每个网口与 bat0 都是同一广播域的普通成员，Mesh 回程因此自动承载全部流量。')),
			E('div', { 'class': 'nm-muted' }, _('所有节点必须同样保持透传。任何一台节点一旦建立 bridge-vlan 就切换成分段模式，它与透传节点之间将完全不通。'))
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
		// VLAN / interface inventory the VLAN section edits.
		this.vlans = status.vlans || [];
		this.bridgePorts = (status.bridge && status.bridge.ports) || [];

		var root = E('div', { 'class': 'cbi-map meshconf-page' }, [
			E('h2', {}, _('Mesh 组网')),
			E('p', { 'class': 'nm-lede' }, _('网络分段默认全部透传，不需要任何设置；按“组网方式 → 主从关系 → 回程链路 → 无线覆盖”四步配置即可，同一组网内所有节点保持一致就能自动成网。')),
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

		/* Only a 5G/6G radio may carry the 802.11s backhaul. The 2.4G band has
		 * neither the bandwidth nor the airtime, and it is the one band every
		 * legacy client still depends on, so the candidate list is *not*
		 * widened to the full radio set when nothing matches: silently
		 * offering 2.4G is how a mesh ends up on the band it must not use. */
		var backhaulCandidates = apConfigs.filter(function(c) { return c.band === '5g' || c.band === '6g'; });
		this.backhaulCandidates = backhaulCandidates;
		this.wirelessBlocked = this.noMeshWpad
			? _('当前 wpad 不支持 802.11s，无法使用无线回程')
			: (backhaulCandidates.length ? '' : _('未发现 5G / 6G radio，无法使用无线回程'));

		// Wired is the default: it is the more stable link and needs no radio
		// at all. Wireless is only preselected when a wireless backhaul is
		// already up and working.
		var initialBackhaul = (mesh.enabled && !mesh.wired && (mesh.wireless_count || 0) > 0)
			? 'wireless' : 'wired';
		if (this.wirelessBlocked) initialBackhaul = 'wired';

		var initialRole = mesh.enabled ? (mesh.role || 'peer') : 'master';

		/* ---- step 1: backhaul (exactly one link) ---- */
		this.backhaulCards = [
			this.backhaulCard('wired', _('有线组网（推荐）'), _('网线互联，全屋同一子网；稳定性最好，不需要占用任何 radio。'), initialBackhaul === 'wired'),
			this.backhaulCard('wireless', _('无线组网'), _('802.11s 无线回程，免布线；只能使用 5G / 6G radio。'),
				initialBackhaul === 'wireless', this.wirelessBlocked)
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
		this.meshRadioInput = E('select', {}, backhaulCandidates.length
			? backhaulCandidates.map(function(c) {
				return E('option', { 'value': c.radio }, [ radioTitle(c), ' (', c.radio, ')' ]);
			})
			: [ E('option', { 'value': '' }, _('未发现 5G / 6G radio，无法使用无线回程')) ]);
		if (!backhaulCandidates.length) this.meshRadioInput.disabled = true;
		var selectedRadio = (mesh.mesh_radios || [])[0] || '';
		if (!selectedRadio && backhaulCandidates.length) {
			// The 6G radio wins when it exists: on a tri-band node it has no
			// legacy client traffic competing with the mesh link. 5G is the
			// fallback, and the operator can still pick either one.
			var sixG = backhaulCandidates.filter(function(c) { return c.band === '6g'; })[0];
			selectedRadio = (sixG || backhaulCandidates[0]).radio;
		}
		this.meshRadioInput.value = selectedRadio;
		if (this.wirelessBlocked) this.meshRadioInput.disabled = true;

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

		/* ---- step 4: per-radio coverage ----
		 * There is no per-SSID editor any more. The mesh-wide wireless
		 * profile *is* this node's own wireless config - the same one the
		 * generated child bundle copies verbatim - so all this step decides
		 * is whether those settings take part in the deployment (and whether
		 * the radio channel plan is written here) or are left untouched.
		 *
		 * The rows below are read-only on purpose: the SSID, the encryption
		 * and the key stay on 网络 → 无线, and a second editor here only
		 * created a second place for the two to disagree.
		 */
		this.apConfigs = apConfigs;
		this.coverageCountEl = E('span', {}, _('%d 个 radio').format(apConfigs.length));
		this.coverageList = E('div', { 'class': 'nm-cover-list' }, coverageRows(apConfigs));

		this.apSyncInput = E('input', { 'type': 'checkbox' });
		// On by default; only an explicitly stored 0 turns it off. Absent is
		// the fresh case and has to read as "on" - that is what makes the
		// node's own coverage part of the deployment without any setting.
		this.apSyncInput.checked = !mesh.ap_sync_set || mesh.ap_sync === true;
		this.apSyncLabel = E('span', {});

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

		this.coverageGroup = E('div', { 'class': 'nm-group' }, [
			E('div', { 'class': 'nm-group-head' }, [ E('span', { 'class': 'nm-step' }, '4'), _('无线覆盖（SSID）') ]),
			E('p', { 'class': 'nm-group-desc' }, _('各 radio 的 SSID、加密方式与密码沿用“网络 → 无线”里当前的设置，本页不再单独编辑：跨机漫游只要多台设备上同名 SSID 的设置一致即可。下面列出本机参与下发的无线配置。')),
			E('div', { 'class': 'nm-ssid-head' }, [ E('span', {}, _('本机各 radio 的无线配置')), this.coverageCountEl ]),
			this.coverageList,
			this.coverageAlert,
			E('p', { 'class': 'nm-hint' }, _('勾选后本节点按上面的配置参与全网统一覆盖，并接管各 radio 的频道规划；取消则完全不动无线配置，各 radio 保留当前 AP 设置。频道在多个节点之间按节点序号自动错开，由“生成子节点配置”完成。')),
			E('div', { 'class': 'nm-field inline', 'style': 'margin-top:12px' }, [
				E('label', {}, [ this.apSyncInput, this.apSyncLabel ])
			]),
			E('div', { 'class': 'nm-actions', 'style': 'margin-top:10px;padding-top:10px;border-top:1px dashed var(--ds-border)' }, [
				E('button', { 'class': 'cbi-button cbi-button-neutral', 'click': ui.createHandlerFn(this, 'confirmApplyChannels') },
					_('仅应用频道规划（不改动 Mesh）'))
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
	 * Channel plan.
	 *
	 * The channel is the one part of a radio's wireless settings that is
	 * per node rather than shared: neighbouring APs must not sit on the same
	 * channel of the same band. It is written from here and spread across
	 * nodes by "生成子节点配置"; the SSID, the encryption and the key stay
	 * on 网络 → 无线 and are never rewritten by this page.
	 * ------------------------------------------------------------------ */
	confirmApplyChannels: function() {
		var lines = this.channelLines();

		return ui.showModal(_('确认应用频道规划'), [
			E('p', {}, _('只修改各 radio 的频道与频宽（/etc/config/wireless）并重载 Wi-Fi；不会创建或修改 batman-adv、网络与 DHCP 配置，也不会改动 SSID 与密码。')),
			lines.length
				? E('div', { 'class': 'nm-alert' }, lines.join('；'))
				: E('p', { 'class': 'nm-muted' }, _('未发现无线 radio。')),
			E('p', { 'class': 'nm-muted' }, _('重载期间 Wi-Fi 会短暂中断，若管理口走无线请留意。')),
			E('div', { 'class': 'right' }, [
				E('button', { 'class': 'cbi-button cbi-button-apply', 'click': ui.createHandlerFn(this, 'applyChannels') }, _('确认应用')),
				' ',
				E('button', { 'class': 'cbi-button cbi-button-neutral', 'click': ui.hideModal }, _('取消'))
			])
		]);
	},

	channelLines: function() {
		return (this.apConfigs || []).map(function(c) {
			return _('%s：频道 %s / %s').format(radioTitle(c), c.channel || 'auto', c.htmode || 'auto');
		});
	},

	applyChannels: function() {
		ui.hideModal();
		var self = this;
		return callApplyWireless('[]', JSON.stringify(this.collectChannels())).then(function(res) {
			if (!res || !res.success) {
				ui.addNotification(null, E('p', (res && res.error) || _('应用频道规划失败')));
				return;
			}
			ui.addNotification(null, E('p', _('频道规划已应用，Wi-Fi 正在重载。')));
			return self.refreshWireless();
		}).catch(function(e) {
			ui.addNotification(null, E('p', e.message || _('应用频道规划失败')));
		});
	},

	// The coverage summary is rendered from the status snapshot, so re-reading
	// it is what keeps the rows in step with a radio renamed or added
	// elsewhere (and with a channel change that just went in).
	refreshWireless: function() {
		var self = this;
		return callGetStatus().then(function(res) {
			self.status = res || {};
			self.networks = (res && res.networks) || [];
			self.apConfigs = ((res && res.mesh) || {}).ap_configs || [];
			self.renderCoverageRows();
			self.updateMeshState();
		}).catch(function() {});
	},

	renderCoverageRows: function() {
		if (!this.coverageList) return;
		this.coverageList.innerHTML = '';
		coverageRows(this.apConfigs).forEach(function(row) {
			this.coverageList.appendChild(row);
		}, this);
		if (this.coverageCountEl)
			this.coverageCountEl.textContent = _('%d 个 radio').format((this.apConfigs || []).length);
	},

	renderVlanSection: function(status) {
		var bridge = status.bridge || {};
		// "全部透传" is the mode this page defaults to, and it stays selected
		// unless the bridge really is segmented right now: showing the
		// editor for a flat bridge would hide the state the device is in.
		this.vlanMode = (bridge.mode === 'filtered' && (this.vlans || []).length) ? 'custom' : 'flat';

		this.vlanBox = E('div', {}, []);
		this.vlanBox.appendChild(this.buildVlanList(this.vlans, this.bridgePorts));
		this.vlanBannerBox = E('div', {}, []);
		this.renderVlanBanners(status);

		this.vlanModeCards = [
			this.vlanModeCard('flat', _('全部透传（默认）'),
				_('不建立 bridge-vlan：所有网口与 bat0 同处 br-lan 内，全网一个二层、一个子网，Mesh 回程自动承载全部流量，不需要任何 VLAN 设置。')),
			this.vlanModeCard('custom', _('自定义网络分段'),
				_('建立 bridge-vlan 做 802.1Q 分段。每个网段默认都经 Mesh 回程透传，只有需要留在本机的网段才单独取消。'))
		];

		this.flatPanel = E('div', { 'class': 'nm-group' }, [
			E('p', { 'class': 'nm-hint' }, _('当前为全部透传：br-lan 不做 802.1Q 过滤，每个网口与 bat0 都在同一个广播域里，跨节点不需要任何额外配置。')),
			E('div', { 'class': 'nm-actions' }, [
				E('button', { 'class': 'cbi-button cbi-button-apply', 'click': ui.createHandlerFn(this, 'confirmApplyFlat') },
					_('应用「全部透传」'))
			])
		]);

		this.customPanel = E('div', { 'class': 'nm-group' }, [ this.vlanBox ]);

		var section = E('div', { 'class': 'nm-section' }, [
			E('div', { 'class': 'nm-title' }, [
				E('span', {}, _('VLAN 与网络分段')),
				E('span', { 'class': 'nm-muted' }, _('br-lan 上的 802.1Q 分段（可选）'))
			]),
			E('p', { 'class': 'nm-subtitle' }, _('默认不需要设置：不建立 bridge-vlan 时 br-lan 不做 802.1Q 过滤，所有网口与 Mesh 回程同处一个二层域。需要把设备或 SSID 划分到不同网段时，再切换到「自定义网络分段」。')),
			E('div', { 'class': 'nm-choices two' }, this.vlanModeCards.map(function(c) { return c.card; })),
			this.flatPanel,
			this.customPanel,
			this.vlanBannerBox
		]);

		this.updateVlanMode();
		return section;
	},

	vlanModeCard: function(value, title, desc) {
		var self = this;
		var input = E('input', { 'type': 'radio', 'name': 'nm-vlan-mode', 'value': value });
		var card = E('label', { 'class': 'nm-choice' }, [
			input,
			E('span', { 'class': 'nm-choice-title' }, [ E('span', { 'class': 'nm-choice-dot' }), title ]),
			E('span', { 'class': 'nm-choice-desc' }, desc)
		]);
		input.checked = this.vlanMode === value;
		input.addEventListener('change', function() {
			self.vlanMode = value;
			self.updateVlanMode();
		});
		return { value: value, input: input, card: card };
	},

	syncVlanModeCards: function() {
		(this.vlanModeCards || []).forEach(function(c) {
			c.input.checked = (c.value === this.vlanMode);
			c.card.classList.toggle('active', c.input.checked);
		}, this);
	},

	updateVlanMode: function() {
		var custom = this.vlanMode === 'custom';
		this.syncVlanModeCards();
		if (this.flatPanel) this.flatPanel.classList.toggle('hidden', custom);
		if (this.customPanel) this.customPanel.classList.toggle('hidden', !custom);
	},

	confirmApplyFlat: function() {
		var labels = (this.vlans || []).map(function(v) {
			return _('VLAN %s%s').format(v.vlan, v.iface ? '（' + v.iface + '）' : '');
		});

		return ui.showModal(_('确认应用「全部透传」'), [
			E('p', {}, _('将删除 br-lan 上的全部 bridge-vlan，并把所有网口重新加入 br-lan，恢复扁平二层。')),
			labels.length
				? E('div', { 'class': 'nm-alert' }, [
					E('strong', {}, _('以下分段配置会被删除：')),
					E('div', {}, labels.join('、')),
					E('div', { 'class': 'nm-muted' }, _('各网段的接口、地址与 DHCP 配置一并移除，管理接口改回 br-lan。同一组网内所有节点必须同为透传模式，否则互不相通。'))
				])
				: E('p', { 'class': 'nm-muted' }, _('当前没有任何分段配置；应用后会确保所有网口与 bat0 都在 br-lan 中。')),
			E('div', { 'class': 'right' }, [
				E('button', { 'class': 'cbi-button cbi-button-apply', 'click': ui.createHandlerFn(this, 'applyFlat') }, _('确认应用')),
				' ',
				E('button', { 'class': 'cbi-button cbi-button-neutral', 'click': ui.hideModal }, _('取消'))
			])
		]);
	},

	applyFlat: function() {
		ui.hideModal();
		var self = this;
		return callApplyVlans('', 'flat').then(function(res) {
			if (!res || !res.success) {
				ui.addNotification(null, E('p', (res && res.error) || _('应用失败')));
				return;
			}
			ui.addNotification(null, E('p', _('已切换为「全部透传」，网络正在重载。')));
			return self.refreshNetworkOptions();
		}).catch(function(e) {
			ui.addNotification(null, E('p', e.message || _('应用失败')));
		});
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
			self.refreshVlanOwnership();
		});

		var trunkAll = E('button', { 'class': 'cbi-button cbi-button-neutral' }, _('全部跨节点透传（bat0 加入所有 VLAN）'));
		trunkAll.addEventListener('click', function() {
			self.vlanRows.forEach(function(r) {
				if (r.trunk) r.trunk.checked = true;
			});
		});

		return E('div', {}, [
			list,
			// The U/T wording and the teal/amber colours are the same ones the
			// Switch view uses, so the two pages describe one model.
			E('div', { 'class': 'nm-legend' }, [
				E('span', { 'class': 'nm-legend-role' }, [ E('b', { 'class': 'u' }, 'U'), _('untagged：出口剥离标签，接终端 / AP（同一端口只能属于一个 U）') ]),
				E('span', { 'class': 'nm-legend-role' }, [ E('b', { 'class': 't' }, 'T'), _('tagged：保留标签，接上行交换机（一个端口可属于多个 T）') ]),
				E('span', { 'class': 'nm-legend-role' }, [ E('b', {}, '—'), _('不加入该 VLAN') ])
			]),
			E('p', { 'class': 'nm-hint' }, _('未选择的端口不加入该 VLAN。当一个端口从所有 VLAN 里都移除后，它也会自动从 br-lan 的成员中摘除。bat0 是 Mesh 回程端口，不在此列，由「经 Mesh 回程透传」控制。')),
			E('p', { 'class': 'nm-hint' }, _('Mesh 回程上的 VLAN：br-lan 一旦建立 bridge-vlan，netifd 就会开启 802.1Q 过滤，此时“不在任何 VLAN 里的端口”不再转发流量。每个 VLAN 的「经 Mesh 回程透传」默认就是勾选的——后端会把 bat0 以 tagged 成员写入该 bridge-vlan，网段自动跨节点；只有需要让某个网段只留在本机时才取消。mesh_* 无线回程接口由 Mesh 自行管理，不在此处配置。')),
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
		// netifd treats an absent "local" as true; the backend is what decides,
		// so absent and '1' mean the same thing here.
		var isLocal = v.local === undefined || v.local === null || v.local === '' || !!v.local;

		var vlanId = E('input', { 'type': 'number', 'min': '1', 'max': '4094', 'value': v.vlan || '' });
		var iface = E('input', { 'type': 'text', 'value': v.iface || '', 'maxlength': '15',
			'placeholder': v.vlan ? 'lan' + v.vlan : 'lan2' });
		var ipaddr = E('input', { 'type': 'text', 'value': v.ipaddr || '', 'placeholder': '10.10.20.251' });
		var netmask = E('input', { 'type': 'text', 'value': v.netmask || '255.255.255.0' });
		var gateway = E('input', { 'type': 'text', 'value': v.gateway || '', 'placeholder': '留空 = 不带默认路由' });
		var dns = E('input', { 'type': 'text', 'value': v.dns || '', 'placeholder': '留空 = 继承上游' });
		// The real state has to come back from the device: a checkbox that always
		// starts unchecked would silently switch a running DHCP server off on the
		// next apply of any unrelated VLAN change.
		var dhcp = E('input', { 'type': 'checkbox' });
		dhcp.checked = v.dhcp === 1 || v.dhcp === true;

		// Local termination: the VLAN gets a br-lan.<ID> interface on this node.
		// It has to match what the bridge does, otherwise the interface this page
		// creates sits on a device netifd never builds. VLAN 1 carries the
		// management address, so it is pinned on.
		var local = E('input', { 'type': 'checkbox' });
		local.checked = isMgmt ? true : isLocal;
		if (isMgmt) local.disabled = true;

		// Carrying a VLAN across the mesh means making bat0 a tagged member
		// of it. New segments default to carried: an operator who planned a
		// segment expects it on every node, and a segment that is silently
		// not carried just looks like a broken mesh.
		var trunk = E('input', { 'type': 'checkbox' });
		trunk.checked = (v.trunk === undefined || v.trunk === null) ? true : !!v.trunk;

		var untagged = String(v.untagged || '').split(/\s+/).filter(Boolean);
		var tagged = String(v.tagged || '').split(/\s+/).filter(Boolean);

		/* One off / U / T control per port. `cell.select.value` stays the model
		 * so the collector and the prune logic read the same field they always
		 * did; the buttons only mirror it, and keep aria-pressed in step. */
		var portCells = (ports || []).map(function(p) {
			var cell = { port: p, select: { value: untagged.indexOf(p) >= 0 ? 'u' : (tagged.indexOf(p) >= 0 ? 't' : '') } };
			var btns = [ '', 'u', 't' ].map(function(role) {
				var b = E('button', {
					'type': 'button',
					'class': 'nm-port-opt' + (role ? ' ' + role : ''),
					'data-role': role,
					'title': role === 'u' ? _('untagged') : (role === 't' ? _('tagged') : _('不加入该 VLAN'))
				}, role === 'u' ? 'U' : (role === 't' ? 'T' : '—'));
				b.addEventListener('click', function() {
					self.setPortRole(portCells, cell, role);
				});
				return b;
			});
			cell.buttons = btns;
			var set = E('span', { 'class': 'nm-port-set', 'role': 'group',
				'aria-label': _('端口 %s 在本 VLAN 中的出口方式').format(p) }, btns);
			cell.view = E('span', { 'class': 'nm-port-item' }, [ E('span', { 'class': 'nm-port-name' }, p), set ]);
			return cell;
		});

		var removeBtn = E('button', { 'class': 'cbi-button cbi-button-negative nm-mini' }, _('删除'));
		var titleEl = E('span', { 'class': 'nm-vlan-title' },
			isMgmt ? _('VLAN %s · 管理网段').format(v.vlan) : _('VLAN %s').format(v.vlan || '—'));

		// Address fields only exist for a locally terminated VLAN: with local
		// off there is no br-lan.<ID> device to put them on.
		var addrFields = [
			E('div', { 'class': 'nm-field' }, [ E('label', {}, _('IPv4 地址')), ipaddr ]),
			E('div', { 'class': 'nm-field' }, [ E('label', {}, _('IPv4 子网掩码')), netmask ]),
			E('div', { 'class': 'nm-field' }, [ E('label', {}, _('IPv4 网关')), gateway ]),
			E('div', { 'class': 'nm-field' }, [ E('label', {}, _('DNS 服务器')), dns ]),
			E('div', { 'class': 'nm-field inline' }, [
				E('label', { 'class': 'nm-check' }, [ dhcp, _('启用 DHCPv4 服务器') ])
			])
		];

		var localNote = E('p', { 'class': 'nm-hint' }, _('本机终止已关闭：该 VLAN 只做二层透传，本机不建立 br-lan.%s 接口，也不分配地址。').format(v.vlan || '<ID>'));

		var view = E('div', { 'class': 'nm-vlan-row' }, [
			E('div', { 'class': 'nm-vlan-head' }, [
				titleEl,
				isMgmt ? E('span', { 'class': 'nm-tag' }, _('管理')) : '',
				isMgmt ? '' : removeBtn
			]),
			E('div', { 'class': 'nm-vlan-grid' }, [
				E('div', { 'class': 'nm-field' }, [ E('label', {}, _('VLAN ID')), vlanId ]),
				E('div', { 'class': 'nm-field' }, [ E('label', {}, _('接口名（UCI 名称）')), iface ]),
				E('div', { 'class': 'nm-field inline' }, [
					E('label', { 'class': 'nm-check', 'title': isMgmt ? _('VLAN 1 承载管理地址，必须本机终止') : '' },
						[ local, _('本机终止（分配地址）') ])
				]),
				E('div', { 'class': 'nm-field inline' }, [
					E('label', { 'class': 'nm-check' }, [ trunk, _('经 Mesh 回程透传（bat0 加入本 VLAN）') ])
				])
			]),
			E('div', { 'class': 'nm-vlan-grid' }, addrFields),
			localNote,
			portCells.length
				? E('div', { 'class': 'nm-ports' }, portCells.map(function(c) { return c.view; }))
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
			local: local,
			trunk: trunk,
			ports: portCells,
			isMgmt: isMgmt,
			addrFields: addrFields,
			localNote: localNote,
			// ports this VLAN owned when the page was rendered; needed to
			// work out which ones stop being VLAN members altogether
			initPorts: untagged.concat(tagged),
			removed: false,
			view: view
		};

		function syncLocal() {
			var on = local.checked;
			addrFields.forEach(function(f) { f.classList.toggle('hidden', !on); });
			localNote.classList.toggle('hidden', on);
		}
		local.addEventListener('change', syncLocal);
		syncLocal();

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
				self.refreshVlanOwnership();
			});
		}

		vlanId.addEventListener('input', function() {
			titleEl.textContent = _('VLAN %s').format(vlanId.value || '—');
			iface.placeholder = 'lan' + (vlanId.value || '');
			self.refreshVlanOwnership();
		});

		portCells.forEach(function(c) { syncPortCell(c); });

		return row;
	},

	/* Set one port's role in one row, mirroring the Switch view's rule that a
	 * port can be untagged in exactly one VLAN: picking U moves it out of the
	 * other rows' U instead of letting the two disagree and produce a config
	 * the official page would refuse to render. */
	setPortRole: function(cells, cell, role) {
		if (cell.select.value === role) return;
		cell.select.value = role;

		if (role === 'u') {
			(this.vlanRows || []).forEach(function(r) {
				if (r.removed) return;
				r.ports.forEach(function(c) {
					if (c !== cell && c.port === cell.port && c.select.value === 'u') {
						c.select.value = '';
						syncPortCell(c);
					}
				});
			});
		}
		syncPortCell(cell);
		this.refreshVlanOwnership();
	},

	// Map port -> VLAN ids that use it untagged. A port in more than one entry
	// is exactly what checkUnsupportedConfig() rejects on the Switch view.
	untaggedOwners: function() {
		var out = {};
		(this.vlanRows || []).forEach(function(r) {
			if (r.removed) return;
			var id = (r.vlan.value || '').trim();
			r.ports.forEach(function(c) {
				if (c.select.value !== 'u') return;
				out[c.port] = out[c.port] || [];
				out[c.port].push(id || '—');
			});
		});
		return out;
	},

	// Reflect the U/T conflicts in the UI: rows holding a doubly-untagged port
	// are outlined, so the problem is visible before the apply is attempted.
	// The outline is only a supplementary cue - it carries a title with the
	// port names too, because a state conveyed by colour alone is not
	// perceivable to everyone (WCAG 2.2 SC 1.4.1).
	refreshVlanOwnership: function() {
		var owners = this.untaggedOwners();
		var conflicts = {};
		Object.keys(owners).forEach(function(p) {
			if (owners[p].length > 1) owners[p].forEach(function(id) { conflicts[id] = 1; });
		});
		var detail = {};
		Object.keys(owners).forEach(function(p) {
			if (owners[p].length > 1) owners[p].forEach(function(id) {
				detail[id] = (detail[id] ? detail[id] + '、' : '') + p;
			});
		});
		(this.vlanRows || []).forEach(function(r) {
			var id = (r.vlan.value || '').trim();
			var bad = !r.removed && !!conflicts[id];
			r.view.classList.toggle('conflict', bad);
			if (bad)
				r.view.setAttribute('title', _('端口 %s 在多个 VLAN 中被设为 U，同一端口只能有一个 untagged 网段。').format(detail[id]));
			else
				r.view.removeAttribute('title');
		});
	},

	collectVlans: function() {
		return (this.vlanRows || []).map(function(r) {
			var untagged = [], tagged = [];
			r.ports.forEach(function(c) {
				if (c.select.value === 'u') untagged.push(c.port);
				else if (c.select.value === 't') tagged.push(c.port);
			});
			var local = r.local ? r.local.checked : true;
			return {
				section: r.section || '',
				vlan: (r.vlan.value || '').trim(),
				iface: (r.iface.value || '').trim(),
				local: local ? 1 : 0,
				ipaddr: local ? (r.ipaddr.value || '').trim() : '',
				netmask: local ? (r.netmask.value || '').trim() : '',
				gateway: local ? (r.gateway.value || '').trim() : '',
				dns: local ? (r.dns.value || '').trim() : '',
				untagged: untagged.join(' '),
				tagged: tagged.join(' '),
				dhcp: (local && r.dhcp.checked) ? 1 : 0,
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

		// A port that is untagged on two VLANs at once is legal 802.1Q but has
		// no unambiguous PVID: netifd picks one and the Switch view refuses to
		// display the bridge until it is resolved. Refuse it here too rather
		// than writing a config the other page calls unsupported.
		var owners = this.untaggedOwners();
		var clash = Object.keys(owners).filter(function(p) { return owners[p].length > 1; });
		if (clash.length) {
			return [ _('端口 %s 在多个 VLAN 中被设为 U（untagged）：同一端口只能有一个 untagged 网段，请把多余的改为 T 或“不加入”。')
				.format(clash.map(function(p) { return p + '（VLAN ' + owners[p].join('、') + '）'; }).join('、')) ];
		}

		// Without local termination netifd builds no br-lan.<ID>, so the
		// interface this page would create has no device to sit on.
		var orphan = vlans.filter(function(v) { return !v.remove && !v.local; });
		if (orphan.length) {
			return [ _('VLAN %s 关闭了本机终止，但本页仍会为该网段生成接口；netifd 不会建立 br-lan.<ID>，该接口将无法工作。请勾选「本机终止」，或改用网络 → 接口页自行管理这些网段。')
				.format(orphan.map(function(v) { return v.vlan; }).join('、')) ];
		}

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

		return callApplyVlans(JSON.stringify(vlans), 'custom').then(function(res) {
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

	// After VLANs change the set of networks changes too, so pull a fresh
	// status and rebuild the VLAN list (and the coverage rows) in place
	// instead of re-rendering the whole page.
	refreshNetworkOptions: function() {
		var self = this;
		return callGetStatus().then(function(res) {
			self.status = res || {};
			self.networks = (res && res.networks) || [];
			self.vlans = (res && res.vlans) || [];
			self.bridgePorts = (res && res.bridge && res.bridge.ports) || [];
			self.apConfigs = ((res && res.mesh) || {}).ap_configs || [];
			self.renderCoverageRows();

			// the bridge may have flipped between flat and segmented, so the
			// mode shown has to come back from the device as well
			var bridge = (res && res.bridge) || {};
			self.vlanMode = (bridge.mode === 'filtered' && self.vlans.length) ? 'custom' : 'flat';
			if (self.vlanBox) {
				self.vlanBox.innerHTML = '';
				self.vlanBox.appendChild(self.buildVlanList(self.vlans, self.bridgePorts));
			}
			self.updateVlanMode();
			self.renderVlanBanners(self.status);
			self.updateCoverageAlert();
		}).catch(function() {});
	},

	// `blocked` is the reason this link cannot be used, not a flag: the card
	// has to say *why* it is unavailable, otherwise a greyed-out option reads
	// as a broken page rather than as a missing dependency.
	backhaulCard: function(value, title, desc, active, blocked) {
		var self = this;
		var input = E('input', { 'type': 'radio', 'name': 'nm-backhaul', 'value': value });
		input.checked = !!active;
		input.disabled = !!blocked;
		var card = E('label', {
			'class': 'nm-choice' + (active ? ' active' : '') + (blocked ? ' disabled' : ''),
			'title': blocked || ''
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
		this.meshRadioInput.disabled = !useWireless || !!this.wirelessBlocked;
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

		// The coverage switch is the same option on every role, but it means
		// opposite things: the node that owns the profile hands it out, the
		// one joining the fabric takes it in. The label is what tells the two
		// apart, so it follows the role.
		if (this.apSyncLabel) {
			this.apSyncLabel.textContent = role === 'slave'
				? _('接受主机各 radio 的无线配置（取消则保留各 radio 当前 AP 设置）')
				: _('下发各 radio 的无线配置（取消则保留各 radio 当前 AP 设置）');
		}

		this.updateCoverageAlert();
	},

	updateCoverage: function() {
		this.updateMeshState();
	},

	// A radio counts as "in use" when it still carries an enabled AP: a radio
	// left with no AP has nothing to distribute and must not be reported as a
	// coverage problem.
	radioActive: function(config) {
		return (config.aps || []).some(function(ap) {
			return ap.enabled && ap.ssid;
		});
	},

	// Advisory only. Nothing here can be fixed from this page any more - the
	// channels and the SSIDs live on 网络 → 无线 - so a finding must never
	// block an apply, or the operator would be stuck on a page that refuses
	// to do anything about a problem it will not let them correct.
	coverageProblems: function() {
		var problems = [];
		var seen = {};

		(this.apConfigs || []).filter(this.radioActive).forEach(function(c) {
			var ch = c.channel;
			if (!ch || ch === 'auto') return;
			// only radios inside the same band can actually collide
			var k = (c.band || '') + ':' + ch;
			if (seen[k]) {
				var band = bandLabel(c.band);
				problems.push(_('%s 频段有多个 radio 使用同一频道 %s，会互相干扰，请到「网络 → 无线」错开')
					.format(band ? band.replace(' radio', '') : _('同一'), ch));
			}
			seen[k] = 1;
		});

		return problems;
	},

	updateCoverageAlert: function() {
		if (!this.coverageAlert) return;
		var problems = this.coverageProblems();

		this.coverageAlert.innerHTML = '';
		this.coverageAlert.classList.toggle('hidden', !problems.length);
		if (!problems.length) return;

		this.coverageAlert.appendChild(E('strong', {}, _('无线覆盖提醒')));
		this.coverageAlert.appendChild(E('div', {}, problems.join('；') + '。'));
		this.coverageAlert.appendChild(E('div', {}, _('本页只负责把各 radio 的配置参与下发与频道规划，不会改写这些值。')));
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

	// The channel plan is the node's own current channels: this page has no
	// per-radio channel dropdown any more, it re-affirms what the device runs
	// so a later "生成子节点配置" can spread the pool across nodes. An empty
	// htmode means "leave the radio's width alone" on the device side.
	collectChannels: function() {
		return (this.apConfigs || []).map(function(config) {
			return {
				radio: config.radio,
				channel: config.channel || 'auto',
				htmode: config.htmode || ''
			};
		});
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
				? (role === 'slave'
					? _('无线覆盖：接受主机各 radio 的无线配置，并按本节点的频道规划写入（%s）。').format(this.channelLines().join('；'))
					: _('无线覆盖：本机各 radio 的无线配置作为全网统一覆盖下发，并按本节点的频道规划写入（%s）。').format(this.channelLines().join('；')))
				: _('无线覆盖：不下发，各 radio 保留当前 AP 设置与频道。')),
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
			'0', /* unified: each radio keeps its own profile */
			'',
			'sae-mixed',
			'',
			syncAp === false ? '0' : (this.apSyncInput.checked ? '1' : '0'),
			// No per-SSID payload any more: the wireless profile is the
			// node's own config, which the generated child bundle carries
			// verbatim. An empty list is accepted by the backend and means
			// "nothing to rewrite", not "the request is broken".
			'[]',
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
			// An apply can flip the bridge between flat and segmented and
			// change what each radio advertises, so the sections that read
			// that state have to come along, not just the status pills.
			return this.refreshNetworkOptions();
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
