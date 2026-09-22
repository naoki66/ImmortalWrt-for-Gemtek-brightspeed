'use strict';
'require baseclass';
'require view.airoha.ds-tokens as tokens';

/* ---------------------------------------------------------------------------
 * Shared UI kit for the merged Airoha views.
 *
 * Both view/airoha_npu/status.js and view/airoha_flowsense/status.js build
 * their DOM through this module so the two tabs share one component look and
 * one set of builders instead of each shipping its own stylesheet, its own
 * dark-mode detector and its own hand-rolled markup (the pre-merge views each
 * carried ~90 duplicated CSS lines, a runtime `isDarkMode()` probe and inline
 * style attributes).
 *
 * The kit is intentionally text-free: every user-visible string is passed in by
 * the caller, so all translatable msgids stay owned by the two view files and
 * the gettext catalogue keeps a single, predictable source of truth.
 *
 * Layout follows the design reference: a `.airoha-page` token scope, an
 * auto-fit grid (so dropping the WiFi gauges on a radio-less board leaves no
 * gaps), one 720px breakpoint and data attributes (`data-on`, `data-blocked`)
 * instead of `:has()` selectors, which older LuCI browsers do not support.
 * ------------------------------------------------------------------------- */

var STYLE_ID = 'airoha-ds-css';

/* Band metadata shared by both tabs. `varName` points at the matching `--ai-*`
 * token so SVG/gauges can paint themselves with `var(--ai-band-*)`. */
var BANDS = [
	{ name: '2.4G', full: '2.4 GHz', varName: '--ai-band-24', maxMbps: 688 },
	{ name: '5G',   full: '5 GHz',   varName: '--ai-band-5',  maxMbps: 5765 },
	{ name: '6G',   full: '6 GHz',   varName: '--ai-band-6',  maxMbps: 11529 }
];

/* The `.ai-*` component stylesheet (section C of the design reference). Page
 * tokens come from ds-tokens.js and are prepended by ensureCss(). */
var COMPONENT_CSS = [
	'.airoha-page{max-width:1120px;margin:0 auto;color:var(--ds-text);line-height:1.5}',
	'.airoha-page :focus-visible{outline:2px solid var(--ds-primary);outline-offset:1px}',

	'.ai-pagehead h2{margin:0;font-size:var(--ds-fs-2xl);line-height:1.3;font-weight:650;color:var(--ds-text)}',
	'.ai-lede{margin:var(--ds-sp-1) 0 0;color:var(--ds-text-muted);font-size:var(--ds-fs-sm)}',
	'.ai-toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:var(--ds-sp-2);margin:var(--ds-sp-3) 0}',
	'.ai-toolbar .ai-spacer{flex:1}',
	'.ai-updated{color:var(--ds-text-muted);font-size:var(--ds-fs-sm)}',

	'.ai-section{margin:0 0 var(--ds-sp-5);padding:var(--ds-sp-4) var(--ds-sp-4) var(--ds-sp-3);border:1px solid var(--ds-border);border-radius:var(--ds-r-lg);background:var(--ds-surface);box-shadow:var(--ds-shadow-1)}',
	'.ai-section-head{display:flex;flex-wrap:wrap;align-items:center;gap:var(--ds-sp-2);margin:0 0 var(--ds-sp-3);padding:0 0 var(--ds-sp-2);border-bottom:1px solid var(--ds-border)}',
	'.ai-section-head h3{margin:0;font-size:var(--ds-fs-lg);font-weight:650;color:var(--ds-text)}',
	'.ai-section-head .ai-spacer{flex:1}',
	'.ai-subhead{margin:var(--ds-sp-4) 0 var(--ds-sp-2);font-size:var(--ds-fs-base);font-weight:650}',
	'.ai-subhead:first-of-type{margin-top:0}',
	'.ai-hint{margin:0 0 var(--ds-sp-2);color:var(--ds-text-muted);font-size:var(--ds-fs-xs)}',

	'.ai-grid{display:grid;gap:var(--ds-sp-2)}',
	'.ai-grid--tiles{grid-template-columns:repeat(auto-fit,minmax(11.5em,1fr))}',
	'.ai-grid--2{grid-template-columns:repeat(auto-fit,minmax(20em,1fr))}',
	'.ai-grid--3{grid-template-columns:repeat(auto-fit,minmax(15em,1fr))}',
	'.ai-grid--4{grid-template-columns:repeat(auto-fit,minmax(12em,1fr))}',
	'.ai-grid--pse{grid-template-columns:repeat(auto-fit,minmax(7.5em,1fr))}',
	'.ai-grid--bands{grid-template-columns:repeat(auto-fit,minmax(7.5em,1fr))}',
	'.ai-spanall{grid-column:1/-1}',

	'.ai-tile{display:flex;flex-direction:column;justify-content:center;min-height:5.6em;min-width:0;padding:var(--ds-sp-2) var(--ds-sp-3);border:1px solid var(--ds-border);border-left:3px solid var(--ai-accent,var(--ds-border));border-radius:var(--ds-r-md);background:var(--ds-surface)}',
	'.ai-tile-title{font-size:var(--ds-fs-xs);font-weight:650;color:var(--ds-text-muted);margin-bottom:var(--ds-sp-1)}',
	'.ai-tile-value{font-family:var(--ds-mono);font-variant-numeric:tabular-nums;font-size:var(--ds-fs-xl);font-weight:700;line-height:1.15;color:var(--ai-accent,var(--ds-text))}',
	'.ai-tile-value .u{font-size:.7em;font-weight:600;color:var(--ds-text-muted);margin-left:.25em}',
	'.ai-tile-sub{margin-top:var(--ds-sp-1);font-size:var(--ds-fs-xs);color:var(--ds-text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',

	'.ai-card{min-width:0;padding:var(--ds-sp-3);border:1px solid var(--ds-border);border-left:3px solid var(--ai-accent,var(--ds-border));border-radius:var(--ds-r-md);background:var(--ds-surface)}',
	'.ai-card-title{display:flex;align-items:baseline;justify-content:space-between;gap:var(--ds-sp-2);margin:0 0 var(--ds-sp-2)}',
	'.ai-card-name{font-size:var(--ds-fs-base);font-weight:650;color:var(--ai-accent,var(--ds-text))}',
	'.ai-card-tag{font-size:var(--ds-fs-xs);color:var(--ds-text-muted);font-family:var(--ds-mono);text-align:right}',
	'.ai-card-body{font-size:var(--ds-fs-sm)}',
	'.ai-row{display:flex;align-items:center;justify-content:space-between;gap:var(--ds-sp-2)}',
	'.ai-row+.ai-row{margin-top:var(--ds-sp-1)}',
	'.ai-muted{color:var(--ds-text-muted)}',
	'.ai-num{font-family:var(--ds-mono);font-variant-numeric:tabular-nums;text-align:right}',
	'.ai-err{color:var(--ds-error);font-weight:650}',

	'.ai-kv{display:grid;grid-template-columns:repeat(auto-fit,minmax(13em,1fr));gap:1px;background:var(--ds-border);border:1px solid var(--ds-border);border-radius:var(--ds-r-md);overflow:hidden}',
	'.ai-kv-item{display:flex;align-items:baseline;justify-content:space-between;gap:var(--ds-sp-2);padding:var(--ds-sp-2) var(--ds-sp-3);background:var(--ds-surface-sunken);font-size:var(--ds-fs-sm);min-width:0}',
	'.ai-kv-k{color:var(--ds-text-muted);white-space:nowrap}',
	'.ai-kv-v{font-family:var(--ds-mono);font-variant-numeric:tabular-nums;font-weight:650;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',

	'.ai-pill{display:inline-flex;align-items:center;gap:var(--ds-sp-2);min-height:20px;padding:0 var(--ds-sp-2);border:1px solid var(--ds-border);border-radius:var(--ds-r-pill);background:var(--ds-surface-sunken);font-size:var(--ds-fs-xs);font-weight:650;color:var(--ds-text-muted);white-space:nowrap}',
	'.ai-pill .dot{width:6px;height:6px;border-radius:50%;background:currentColor;flex:0 0 auto}',
	'.ai-pill--ok{color:var(--ds-ok);border-color:var(--ds-ok-line);background:var(--ds-ok-tint)}',
	'.ai-pill--warn{color:var(--ds-warn);border-color:var(--ds-warn-line);background:var(--ds-warn-tint)}',
	'.ai-pill--error{color:var(--ds-error);border-color:var(--ds-error-line);background:var(--ds-error-tint)}',
	'.ai-pill--info{color:var(--ds-info);border-color:var(--ds-info-line);background:var(--ds-info-tint)}',
	'.ai-badge{display:inline-flex;align-items:center;min-height:18px;padding:0 var(--ds-sp-2);border-radius:var(--ds-r-sm);background:var(--ds-surface-sunken);color:var(--ds-text-muted);font-family:var(--ds-mono);font-size:var(--ds-fs-xs);font-weight:650}',
	'.ai-badge--bnd{background:var(--ds-info-tint);color:var(--ai-npu);border:1px solid var(--ds-info-line)}',
	'.ai-badge--unb{background:var(--ds-warn-tint);color:var(--ds-warn);border:1px solid var(--ds-warn-line)}',
	'.ai-badge--v6{background:rgba(124,58,237,.10);color:var(--ai-band-6);border:1px solid rgba(124,58,237,.32)}',

	'.ai-banner{display:flex;align-items:flex-start;gap:var(--ds-sp-2);margin:0 0 var(--ds-sp-2);padding:var(--ds-sp-2) var(--ds-sp-3);border:1px solid var(--ds-warn-line);border-left:3px solid var(--ds-warn);border-radius:var(--ds-r-md);background:var(--ds-warn-tint);color:var(--ds-warn);font-size:var(--ds-fs-sm)}',
	'.ai-banner--error{border-color:var(--ds-error-line);border-left-color:var(--ds-error);background:var(--ds-error-tint);color:var(--ds-error)}',
	'.ai-banner--info{border-color:var(--ds-info-line);border-left-color:var(--ds-info);background:var(--ds-info-tint);color:var(--ds-info)}',
	'.ai-banner-title{font-weight:650}',
	'.ai-banner-msg{color:var(--ds-text-muted);font-size:var(--ds-fs-xs);margin-top:2px}',
	'.ai-banner-kind{font-family:var(--ds-mono);font-size:var(--ds-fs-xs);font-weight:700;flex:0 0 auto}',

	'.ai-empty{display:flex;align-items:center;justify-content:center;min-height:5.5em;padding:var(--ds-sp-4);border:1px dashed var(--ds-border);border-radius:var(--ds-r-md);color:var(--ds-text-muted);font-size:var(--ds-fs-sm);text-align:center}',
	'.ai-error-state{border-style:solid;border-color:var(--ds-error-line);background:var(--ds-error-tint);color:var(--ds-error)}',
	'.ai-skeleton{height:1em;border-radius:var(--ds-r-sm);background:linear-gradient(90deg,var(--ds-surface-sunken) 25%,var(--ds-border) 45%,var(--ds-surface-sunken) 65%);background-size:300% 100%;animation:ai-shimmer 1.4s linear infinite}',
	'@keyframes ai-shimmer{0%{background-position:120% 0}100%{background-position:-20% 0}}',

	'.ai-bar{margin:var(--ds-sp-1) 0 0}',
	'.ai-bar-head{display:flex;align-items:baseline;justify-content:space-between;gap:var(--ds-sp-2);font-size:var(--ds-fs-xs);color:var(--ds-text-muted)}',
	'.ai-bar-track{position:relative;height:.5em;margin-top:var(--ds-sp-1);border-radius:var(--ds-r-sm);background:var(--ds-surface-sunken);border:1px solid var(--ds-border);overflow:hidden}',
	'.ai-bar-fill{height:100%;border-radius:var(--ds-r-sm);background:var(--ai-accent,var(--ds-primary));transition:width .4s}',
	'.ai-bar--tall .ai-bar-track{height:1.8em}',
	'.ai-bar-label{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:var(--ds-mono);font-weight:700;font-size:var(--ds-fs-sm);color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.6)}',

	'.ai-gauge-row{display:grid;justify-content:center;gap:var(--ds-sp-3);grid-template-columns:repeat(auto-fit,minmax(13.5em,22em))}',
	'.ai-gauge{min-width:0;display:flex;flex-direction:column;align-items:center}',
	'.ai-gauge svg{width:100%;max-width:22em;display:block}',
	'.ai-gauge-cap{margin-top:var(--ds-sp-1);font-size:var(--ds-fs-xs);color:var(--ds-text-muted);text-align:center;line-height:1.5}',
	'.ai-gauge-cap b{color:var(--ds-text);font-family:var(--ds-mono)}',
	'.g-lbl{font-size:11px;font-weight:700}',
	'.g-cap{font-size:10px;font-weight:700}',
	'.g-num{font-size:24px;font-weight:700}',
	'.g-med{font-size:13px;font-weight:700}',
	'.g-sm{font-size:9px;font-weight:600}',
	'.g-sub{font-size:10px;font-weight:600}',

	'.ai-switch-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:var(--ds-sp-3);min-height:3.4em;padding:var(--ds-sp-2) var(--ds-sp-3);border:1px solid var(--ds-border);border-left:3px solid var(--ds-ok);border-radius:var(--ds-r-md);background:var(--ds-surface)}',
	'.ai-switch-row[data-on="false"]{border-left-color:var(--ds-border-strong)}',
	'.ai-switch-row[data-blocked="true"]{border-left-color:var(--ds-warn);background:var(--ds-warn-tint)}',
	'.ai-switch-name{display:flex;flex-wrap:wrap;align-items:center;gap:var(--ds-sp-2);min-width:0;font-size:var(--ds-fs-sm);font-weight:600}',
	'.ai-switch-note{color:var(--ds-text-muted);font-size:var(--ds-fs-xs);font-weight:400}',
	'.ai-switch-ctl{display:flex;align-items:center;gap:var(--ds-sp-3)}',
	'.ai-toggle{position:relative;display:inline-flex;width:44px;height:26px;flex:0 0 auto;cursor:pointer}',
	'.ai-toggle input{position:absolute;width:1px;height:1px;opacity:0;margin:0}',
	'.ai-toggle .track{position:absolute;inset:0;border:1px solid var(--ds-border-strong);border-radius:var(--ds-r-pill);background:var(--ds-surface-sunken);transition:background .2s,border-color .2s}',
	'.ai-toggle .track:before{content:"";position:absolute;width:20px;height:20px;left:2px;top:2px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(15,23,42,.24);transition:transform .2s}',
	'.ai-toggle input:checked+.track{background:var(--ds-ok);border-color:var(--ds-ok)}',
	'.ai-toggle input:checked+.track:before{transform:translateX(18px)}',
	'.ai-toggle input:disabled+.track{opacity:.5}',
	'.ai-toggle input:focus-visible+.track{box-shadow:0 0 0 3px var(--ds-focus-ring)}',

	'.ai-btn{appearance:none;display:inline-flex;align-items:center;justify-content:center;gap:var(--ds-sp-1);min-height:26px;padding:0 var(--ds-sp-3);border:1px solid var(--ds-border-strong);border-radius:var(--ds-r-sm);background:var(--ds-surface-sunken);color:var(--ds-text);font:inherit;font-size:var(--ds-fs-sm);font-weight:600;cursor:pointer}',
	'.ai-btn--primary{background:var(--ds-primary);border-color:var(--ds-primary);color:#fff}',
	'.ai-btn--active{background:var(--ds-warn);border-color:var(--ds-warn);color:#fff}',

	'.ai-form{display:flex;flex-wrap:wrap;align-items:center;gap:var(--ds-sp-4)}',
	'.ai-field{display:flex;align-items:center;gap:var(--ds-sp-2);min-width:12em;flex:1}',
	'.ai-field-label{font-size:var(--ds-fs-sm);font-weight:500;color:var(--ds-text-muted);white-space:nowrap}',
	'.ai-field select{flex:1;min-width:0}',

	'.ai-table-wrap{overflow:auto;border:1px solid var(--ds-border);border-radius:var(--ds-r-md);max-height:24em}',
	'.ai-table{width:100%;border-collapse:collapse;font-size:var(--ds-fs-sm)}',
	'.ai-table th{position:sticky;top:0;z-index:1;background:var(--ds-surface-sunken);color:var(--ds-text-muted);font-weight:650;text-align:left;white-space:nowrap;padding:var(--ds-sp-2) var(--ds-sp-2);border-bottom:1px solid var(--ds-border)}',
	'.ai-table td{padding:var(--ds-sp-1) var(--ds-sp-2);border-bottom:1px solid var(--ds-border);vertical-align:top;overflow-wrap:anywhere;word-break:break-word}',
	'.ai-table tr:last-child td{border-bottom:0}',
	'.ai-table .ai-num,.ai-table th.ai-num{text-align:right}',
	'.ai-table--mono td{font-family:var(--ds-mono);font-variant-numeric:tabular-nums;font-size:var(--ds-fs-xs)}',
	'.ai-table tbody tr:hover{background:var(--ds-surface-sunken)}',

	'.ai-details{border:1px solid var(--ds-border);border-radius:var(--ds-r-md);background:var(--ds-surface-sunken);padding:0 var(--ds-sp-3);margin-top:var(--ds-sp-3)}',
	'.ai-details>summary{cursor:pointer;padding:var(--ds-sp-2) 0;font-size:var(--ds-fs-sm);font-weight:650}',
	'.ai-details[open]{padding-bottom:var(--ds-sp-3)}',

	'.ai-console{border:1px solid var(--ds-border);border-left:3px solid var(--ai-npu);border-radius:var(--ds-r-md);background:var(--ds-surface);overflow:hidden}',
	'.ai-console-bar{display:flex;align-items:center;gap:var(--ds-sp-2);padding:var(--ds-sp-2) var(--ds-sp-3);background:var(--ds-surface-sunken);border-bottom:1px solid var(--ds-border)}',
	'.ai-console-bar .ai-spacer{flex:1}',
	'.ai-console-title{font-size:var(--ds-fs-sm);font-weight:650}',
	'.ai-console-body{padding:var(--ds-sp-3)}',
	'.ai-dot{width:7px;height:7px;border-radius:50%;background:var(--ai-npu);flex:0 0 auto;box-shadow:0 0 0 3px var(--ds-info-tint)}',
	'.ai-dot--live{animation:ai-pulse 1.6s ease-in-out infinite}',
	'@keyframes ai-pulse{0%,100%{opacity:.35}50%{opacity:1}}',

	'.ai-wifi-only[hidden]{display:none}',
	'.airoha-page[data-wifi="false"] .ai-wifi-only{display:none}',

	'@media (prefers-reduced-motion:reduce){.ai-skeleton,.ai-dot--live,.ai-bar-fill{animation:none;transition:none}}',
	'@media (max-width:720px){.ai-table--stack thead{display:none}.ai-table--stack,.ai-table--stack tbody,.ai-table--stack tr,.ai-table--stack td{display:block;width:100%}.ai-table--stack tr{padding:var(--ds-sp-2) 0;border-bottom:1px solid var(--ds-border)}.ai-table--stack td{border:0;padding:0}.ai-table--stack td:before{display:block;content:attr(data-label);color:var(--ds-text-muted);font-size:var(--ds-fs-xs);font-weight:650}.ai-kv,.ai-switch-row{grid-template-columns:1fr}}'
].join('\n');

/* ── Escaping / formatting helpers ─────────────────────────────────────────
 * SVG gauges are built as strings (they must be parsed as markup, not text)
 * so any interpolated user/board value goes through esc(). */

function esc(s) {
	return String(s == null ? '' : s).replace(/[&<>"]/g, function(c) {
		return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
	});
}

function nf(n) {
	return (n === undefined || n === null || isNaN(n)) ? '—' : Number(n).toLocaleString('en-US');
}

function fmtK(n) {
	n = Number(n) || 0;
	if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
	if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
	return String(n);
}

function fmtFreq(khz) {
	return (!khz) ? 'N/A' : Math.round(khz / 1000) + ' MHz';
}

function fmtGiB(b) {
	var v = Number(b) || 0, g = v / 1073741824;
	return g >= 1 ? g.toFixed(1) + ' GiB' : (v / 1048576).toFixed(0) + ' MiB';
}

function fmtUptime(s) {
	s = Number(s) || 0;
	var d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
	return (d ? d + 'd ' : '') + (d || h ? h + 'h ' : '') + m + 'm';
}

function fmtMbps(v) {
	v = Number(v) || 0;
	return v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2);
}

function fmtPct(v, d) {
	return (Number(v) || 0).toFixed(d === undefined ? 1 : d) + '%';
}

function clampPct(v) {
	v = Number(v) || 0;
	return Math.max(0, Math.min(100, v));
}

/* ── Component builders (return DOM nodes; children may be strings/nodes) ── */

function tile(o) {
	o = o || {};
	var attrs = { 'class': 'ai-tile', 'style': '--ai-accent:' + (o.accent || 'var(--ds-border)') };
	if (o.id) attrs.id = o.id;
	return E('div', attrs, [
		E('div', { 'class': 'ai-tile-title' }, o.title),
		E('div', { 'class': 'ai-tile-value' }, [
			o.value,
			o.unit ? E('span', { 'class': 'u' }, o.unit) : null
		]),
		E('div', { 'class': 'ai-tile-sub', 'title': o.sub }, o.sub)
	]);
}

function section(o) {
	o = o || {};
	var attrs = { 'class': 'ai-section' };
	if (o.id) attrs.id = o.id;
	if (o.wifiOnly) attrs['data-wifi-only'] = '1';
	return E('section', attrs, [
		E('div', { 'class': 'ai-section-head' }, [
			E('h3', {}, o.title),
			o.count ? E('span', { 'class': 'ai-badge', 'id': o.countId || null }, o.count) : null,
			E('span', { 'class': 'ai-spacer' }),
			o.actions || null
		]),
		o.hint ? E('p', { 'class': 'ai-hint' }, o.hint) : null,
		o.body || null
	]);
}

function pill(text, kind) {
	return E('span', { 'class': 'ai-pill' + (kind ? ' ai-pill--' + kind : '') }, [
		E('span', { 'class': 'dot' }),
		text
	]);
}

function badge(text, kind) {
	return E('span', { 'class': 'ai-badge' + (kind ? ' ai-badge--' + kind : '') }, text);
}

function banner(kind, title, msg) {
	return E('div', { 'class': 'ai-banner' + (kind ? ' ai-banner--' + kind : '') }, [
		E('span', { 'class': 'ai-banner-kind' }, kind === 'error' ? '!!' : kind === 'info' ? 'i' : '!'),
		E('div', {}, [
			E('div', { 'class': 'ai-banner-title' }, title),
			E('div', { 'class': 'ai-banner-msg' }, msg)
		])
	]);
}

function bar(o) {
	o = o || {};
	var pct = clampPct(o.pct);
	var head = (o.title || o.right)
		? E('div', { 'class': 'ai-bar-head' }, [
			E('span', {}, o.title),
			E('span', { 'class': 'ai-num' }, o.right)
		])
		: null;
	var fillAttrs = { 'class': 'ai-bar-fill', 'style': 'width:' + pct.toFixed(1) + '%' };
	if (o.fillId) fillAttrs.id = o.fillId;
	var track = E('div', {
		'class': 'ai-bar-track', 'role': 'progressbar', 'aria-valuemin': '0',
		'aria-valuemax': '100', 'aria-valuenow': String(Math.round(pct)), 'aria-label': o.title || ''
	}, [
		E('div', fillAttrs),
		o.label ? E('span', { 'class': 'ai-bar-label', 'id': o.labelId || null }, o.label) : null
	]);
	var attrs = { 'class': 'ai-bar' + (o.tall ? ' ai-bar--tall' : ''), 'style': '--ai-accent:' + (o.accent || 'var(--ds-primary)') };
	if (o.id) attrs.id = o.id;
	return E('div', attrs, [ head, track ]);
}

function kv(rows) {
	return E('div', { 'class': 'ai-kv' }, (rows || []).map(function(r) {
		var vAttrs = { 'class': 'ai-kv-v' };
		if (r[2]) vAttrs.style = 'color:' + r[2];
		return E('div', { 'class': 'ai-kv-item' }, [
			E('span', { 'class': 'ai-kv-k' }, r[0]),
			E('span', vAttrs, r[1])
		]);
	}));
}

function card(o) {
	o = o || {};
	var attrs = { 'class': 'ai-card', 'style': '--ai-accent:' + (o.accent || 'var(--ds-border)') };
	if (o.id) attrs.id = o.id;
	return E('div', attrs, [
		E('div', { 'class': 'ai-card-title' }, [
			E('span', { 'class': 'ai-card-name' }, o.name),
			o.tag ? E('span', { 'class': 'ai-card-tag' }, o.tag) : null
		]),
		E('div', { 'class': 'ai-card-body' }, o.body || null)
	]);
}

function row(k, v, cls) {
	return E('div', { 'class': 'ai-row' }, [
		E('span', { 'class': 'ai-muted' }, k),
		E('span', { 'class': 'ai-num' + (cls ? ' ' + cls : '') }, v)
	]);
}

function empty(text, isError) {
	return E('div', { 'class': 'ai-empty' + (isError ? ' ai-error-state' : '') }, text);
}

function details(title, body) {
	return E('details', { 'class': 'ai-details' }, [
		E('summary', {}, title),
		body
	]);
}

function table(o) {
	o = o || {};
	var cols = o.cols || [];
	var rows = o.rows || [];
	var headRow = E('tr', {}, cols.map(function(c) {
		return E('th', { 'class': c.num ? 'ai-num' : null, 'scope': 'col' }, c.t);
	}));
	var bodyRows;
	if (rows.length) {
		bodyRows = rows.map(function(r) {
			return E('tr', {}, r.map(function(cell, i) {
				var attrs = {};
				if (cols[i] && cols[i].num) attrs['class'] = 'ai-num';
				if (o.stack && cols[i]) attrs['data-label'] = cols[i].t;
				return E('td', attrs, cell);
			}));
		});
	} else {
		bodyRows = [ E('tr', {}, [ E('td', { 'colspan': String(cols.length) }, empty(o.emptyText || '')) ]) ];
	}
	return E('div', { 'class': 'ai-table-wrap' }, [
		E('table', { 'class': 'ai-table' + (o.mono ? ' ai-table--mono' : '') + (o.stack ? ' ai-table--stack' : '') }, [
			E('thead', {}, headRow),
			E('tbody', {}, bodyRows)
		])
	]);
}

/* An offload switch row. Live state is driven by the caller via the returned
 * ids: `inputId` is the checkbox, `badgeId` is the state pill, `rowId` is the
 * row itself (its data-on / data-blocked attributes drive the accent). */
function switchState(o) {
	if (o.blocked) return { kind: 'warn', text: o.blockedLabel || '' };
	if (o.on) return { kind: 'ok', text: o.onLabel || '' };
	return { kind: '', text: o.offLabel || '' };
}

function switchRow(o) {
	o = o || {};
	var state = switchState(o);
	var name = E('div', { 'class': 'ai-switch-name' }, [
		E('span', {}, o.name),
		E('span', { 'class': 'ai-pill' + (state.kind ? ' ai-pill--' + state.kind : ''), 'id': o.badgeId }, [
			E('span', { 'class': 'dot' }),
			state.text
		]),
		o.note ? E('span', { 'class': 'ai-switch-note' }, o.note) : null
	]);
	var inputAttrs = {
		'id': o.inputId, 'type': 'checkbox', 'class': 'ai-toggle-input'
	};
	if (o.on) inputAttrs.checked = '';
	if (o.blocked && !o.on) inputAttrs.disabled = '';
	var input = E('input', inputAttrs);
	input.checked = !!o.on;
	input.disabled = !!(o.blocked && !o.on);
	input.setAttribute('data-blocked', o.blocked ? '1' : '0');
	if (typeof o.onChange === 'function')
		input.addEventListener('change', function(ev) { o.onChange(ev.target); });
	var ctl = E('div', { 'class': 'ai-switch-ctl' }, [
		E('label', { 'class': 'ai-toggle', 'title': o.title || '' }, [ input, E('span', { 'class': 'track' }) ])
	]);
	return E('div', { 'class': 'ai-switch-row', 'id': o.rowId || null, 'data-on': o.on ? 'true' : 'false', 'data-blocked': o.blocked ? 'true' : 'false' }, [ name, ctl ]);
}

/* Build a gauge wrapper: an `.ai-gauge` holding the SVG string plus a caption
 * built from an array of strings / DOM nodes. */
function gauge(svgHtml, cap, id) {
	var wrap = E('div', { 'class': 'ai-gauge' });
	if (id) wrap.id = id;
	wrap.innerHTML = svgHtml;
	var capEl = E('div', { 'class': 'ai-gauge-cap' });
	var parts = Array.isArray(cap) ? cap : (cap == null ? [] : [ cap ]);
	parts.forEach(function(part) {
		if (part == null) return;
		capEl.appendChild(typeof part === 'string' ? document.createTextNode(part) : part);
	});
	wrap.appendChild(capEl);
	return wrap;
}

/* ── Wireless presence (authoritative when the backend reports it) ──────────
 * Priority: backend `has_wifi` → live bands → `available === false` → fail open.
 * Fail-open matters: a single failed RPC must never make a radio-equipped
 * board look radio-less and silently drop its gauges. */
function hasWifiRadio(o) {
	o = o || {};
	if (typeof o.has_wifi === 'boolean') return o.has_wifi;
	if (Array.isArray(o.bands) && o.bands.length > 0) return true;
	if (o.available === false) return false;
	return true;
}

/* ── Dark-mode probe ───────────────────────────────────────────────────────
 * Whether the dark re-tune is appended is decided at runtime rather than by a
 * CSS gate, because Argon (the default theme here) never sets
 * :root[data-darkmode="true"]. Mirrors the mesh-conf implementation
 * (view/meshconf/steering.js) verbatim so both packages agree on the verdict. */
function isDarkMode() {
	/* Probe order matters: the first element with an opaque background wins.
	 * - body carries the theme background in every LuCI theme.
	 * - .main-left is Argon's sidebar: var(--menu-bg-color) (#ffffff) when
	 *   light, #333333 when dark. It is the only other always-opaque surface
	 *   Argon has, and it matters because Argon inlines css/dark.css into a
	 *   <style> block (header.ut readfile()) instead of linking it, so the
	 *   stylesheet fallback below can never match Argon.
	 * - .main-content / #maincontent / .cbi-map are the bootstrap-era wrappers.
	 * header is deliberately NOT probed: Argon paints it with var(--primary)
	 * (#5e72e4, luminance ~121), which would read as dark in light mode. */
	var els = [document.body, document.querySelector('.main-left'), document.querySelector('.main-right'),
		document.querySelector('.main-content'), document.querySelector('#maincontent'), document.querySelector('.cbi-map')];
	for (var i = 0; i < els.length; i++) {
		if (!els[i]) continue;
		/* Parse rgb()/rgba() explicitly. Matching with /\d+/g splits the
		 * fractional alpha 0.6 into "0" and "6", so m[3] reads 0 and every
		 * semi-transparent background is mistaken for a fully transparent one
		 * and skipped - semi-transparent dark surfaces then fell through to the
		 * stylesheet fallback and were reported as light. */
		var bg = window.getComputedStyle(els[i]).backgroundColor;
		var m = bg.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?/i);
		if (m) {
			var a = m[4] === undefined ? 1 : parseFloat(m[4]);
			if (a < 0.1) continue;
			var lum = (parseFloat(m[1]) * 299 + parseFloat(m[2]) * 587 + parseFloat(m[3]) * 114) / 1000;
			return lum < 128;
		}
	}
	var sheets = document.querySelectorAll('link[href*="dark"], link[href*="glass"]');
	if (sheets.length > 0) return true;
	/* Last resort: follow the OS preference. This is exactly what Argon's
	 * default mode='normal' does - it wraps the inlined dark.css in
	 * @media (prefers-color-scheme: dark) - and it also covers any theme that
	 * leaves every probed surface transparent. */
	try {
		if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return true;
	} catch (e) {}
	return false;
}

/* ── Stylesheet injection ──────────────────────────────────────────────────
 * One shared <style> node per document, holding the page token scope, its
 * dark-mode re-tune and the component rules. The re-tune is gated by the
 * runtime isDarkMode() probe (see above), not by a CSS attribute selector, so
 * it applies on Argon too. ensureCss() is idempotent - the getElementById hit
 * below returns the existing node untouched - so a theme switch after the page
 * has loaded is NOT picked up until the page is reloaded. */
function ensureCss() {
	var el = document.getElementById(STYLE_ID);
	if (el) return el;
	el = document.createElement('style');
	el.id = STYLE_ID;
	el.textContent = '.airoha-page{' + tokens.tokens + ';line-height:1.5;color:var(--ds-text)}\n'
		+ (isDarkMode() ? tokens.dark + '\n' : '') + COMPONENT_CSS;
	document.head.appendChild(el);
	return el;
}

function bandColor(band) {
	var info = BANDS[band];
	return info ? 'var(' + info.varName + ')' : 'var(--ds-text-muted)';
}

return baseclass.extend({
	CSS: COMPONENT_CSS,
	BANDS: BANDS,
	ensureCss: ensureCss,
	isDarkMode: isDarkMode,
	hasWifiRadio: hasWifiRadio,
	bandColor: bandColor,
	esc: esc,
	nf: nf,
	fmtK: fmtK,
	fmtFreq: fmtFreq,
	fmtGiB: fmtGiB,
	fmtUptime: fmtUptime,
	fmtMbps: fmtMbps,
	fmtPct: fmtPct,
	clampPct: clampPct,
	tile: tile,
	section: section,
	pill: pill,
	badge: badge,
	banner: banner,
	bar: bar,
	kv: kv,
	card: card,
	row: row,
	empty: empty,
	details: details,
	table: table,
	switchRow: switchRow,
	gauge: gauge
});
