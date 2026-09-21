'use strict';
'require baseclass';

/* ---------------------------------------------------------------------------
 * Shared design tokens for the merged Airoha views (SoC/NPU tab + FlowSense tab).
 *
 * This module mirrors package/luci-app-mesh-conf/.../view/meshconf/ds-tokens.js
 * on purpose: pages that ship in the same product read as one design language,
 * so the same token names, the same em-based scale and the same theme-variable
 * mapping are reused here instead of inventing a second vocabulary.
 *
 * `tokens` is the body of the `.airoha-page{ ... }` rule: the surfaces, borders
 * and text labels map onto the LuCI theme variables instead of being hardcoded,
 * so the theme keeps ownership of its light/dark palette. On top of the
 * mesh-conf set this file adds two entries the dashboard needs:
 *   --ds-border-strong  a heavier border for the outer compass ring / toggles
 *   --ds-primary-text   a text-safe primary colour for the selected tab label
 * and the `--ai-*` dashboard accents (NPU/CPU/load + the three WiFi bands),
 * which the gauges paint with. They live on the token layer so a single
 * dark-mode re-tune keeps every gauge in step.
 *
 * `dark` re-tunes the semantic accents and the `--ai-*` accents for a dark
 * background: themes that ship a dark mode set :root[data-darkmode="true"],
 * and the tints get a higher alpha there, since a .08 wash is invisible on a
 * dark surface.
 *
 * Sizes are em-based, never px: the LuCI theme sets the base font size, and
 * only a relative scale keeps the page in step with it.
 *
 * Both view/airoha_npu/status.js and view/airoha_flowsense/status.js consume
 * this through view/airoha/ui.js; keeping the values in one place is what stops
 * the two tabs from drifting apart.
 * ------------------------------------------------------------------------- */
return baseclass.extend({
	tokens: '--ds-surface:var(--background-color-high,#fff);--ds-surface-sunken:var(--background-color-medium,#f6f8fa);--ds-border:var(--border-color-low,#d8dee4);--ds-border-strong:var(--border-color-medium,#b8c0c8);--ds-text:var(--text-color-high,#1f2328);--ds-text-muted:var(--text-color-low,#5c6773);--ds-primary:var(--primary-color-high,#0969da);--ds-primary-text:var(--primary-color-high,#0969da);--ds-ok:#1a7f37;--ds-ok-tint:rgba(26,127,55,.08);--ds-ok-line:rgba(26,127,55,.35);--ds-warn:#bc4c00;--ds-warn-tint:rgba(188,76,0,.08);--ds-warn-line:rgba(188,76,0,.35);--ds-error:#cf222e;--ds-error-tint:rgba(207,34,46,.08);--ds-error-line:rgba(207,34,46,.40);--ds-info:#0969da;--ds-info-tint:rgba(9,105,218,.08);--ds-info-line:rgba(9,105,218,.35);--ds-focus-ring:rgba(9,105,218,.32);--ai-npu:#0e7490;--ai-cpu:#c2410c;--ai-load:#a16207;--ai-band-24:#b45309;--ai-band-5:#1d4ed8;--ai-band-6:#7c3aed;--ds-mono:ui-monospace,SFMono-Regular,Consolas,"Liberation Mono",Menlo,monospace;--ds-r-sm:4px;--ds-r-md:6px;--ds-r-lg:8px;--ds-r-pill:999px;--ds-sp-1:.25em;--ds-sp-2:.5em;--ds-sp-3:.75em;--ds-sp-4:1em;--ds-sp-5:1.5em;--ds-fs-xs:.8em;--ds-fs-sm:.88em;--ds-fs-base:1em;--ds-fs-lg:1.1em;--ds-fs-xl:1.35em;--ds-fs-2xl:1.6em;--ds-shadow-1:0 1px 2px rgba(16,24,40,.04)',

	dark: ':root[data-darkmode="true"] .airoha-page{--ds-ok:#4ac26b;--ds-ok-tint:rgba(74,194,107,.18);--ds-ok-line:rgba(74,194,107,.45);--ds-warn:#e3934a;--ds-warn-tint:rgba(227,147,74,.18);--ds-warn-line:rgba(227,147,74,.45);--ds-error:#f47067;--ds-error-tint:rgba(244,112,103,.18);--ds-error-line:rgba(244,112,103,.5);--ds-info:#4d9cf6;--ds-info-tint:rgba(77,156,246,.18);--ds-info-line:rgba(77,156,246,.45);--ds-focus-ring:rgba(77,156,246,.45);--ds-primary-text:#4d9cf6;--ai-npu:#22d3ee;--ai-cpu:#fb923c;--ai-load:#fde047;--ai-band-24:#fbbf24;--ai-band-5:#60a5fa;--ai-band-6:#c4b5fd;--ds-shadow-1:none}'
});
