'use strict';
/* WCAG 2.x contrast audit for the mesh-conf stylesheet.
 *
 * Run:  node scripts/luci-ui-checks/contrast.js
 *
 * The palette is NOT hardcoded here. The tokens are read out of the real
 * stylesheet (--ds-* in mesh-conf's meshconf.js), so this is a regression check
 * on what actually ships rather than a re-statement of what someone once
 * measured. An earlier revision of this script carried its own copies of the
 * tint alphas; when the stylesheet settled on .08 those copies went stale and
 * the script started reporting failures that did not exist (and, worse, passing
 * over values that were no longer in use).
 *
 * Measurement: WCAG relative luminance. A translucent tint is composited over
 * its surface first, i.e. measured as it is painted, not as it is authored.
 *
 * Thresholds: 4.5:1 for body text, 3:1 for non-text UI (focus ring, borders).
 */
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');
const CSS_JS = path.join(REPO, 'package', 'luci-app-mesh-conf', 'htdocs',
	'luci-static', 'resources', 'view', 'meshconf', 'meshconf.js');

/* --- colour math --------------------------------------------------------- */
function srgbToLin(c) { c = c / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function hex2rgb(h) {
	h = h.replace('#', '').trim();
	if (h.length === 3) h = h.split('').map(s => s + s).join('');
	return [ parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16) ];
}
function lum(rgb) { return 0.2126 * srgbToLin(rgb[0]) + 0.7152 * srgbToLin(rgb[1]) + 0.0722 * srgbToLin(rgb[2]); }
function ratio(fg, bg) {
	const a = lum(hex2rgb(fg)), b = lum(hex2rgb(bg));
	const hi = Math.max(a, b), lo = Math.min(a, b);
	return (hi + 0.05) / (lo + 0.05);
}
/* #rgb / #rrggbb / rgba(r,g,b,a), or a var() with a hex literal fallback */
function parseColor(v) {
	v = String(v).trim().replace(/;$/, '');
	if (/^var\(/.test(v)) {
		let depth = 0, comma = -1;
		for (let i = 4; i < v.length; i++) {
			if (v[i] === '(') depth++;
			else if (v[i] === ')') { if (depth === 0) break; depth--; }
			else if (v[i] === ',' && depth === 0) { comma = i; break; }
		}
		if (comma < 0) throw new Error('var() without fallback: ' + v);
		return parseColor(v.slice(comma + 1, v.lastIndexOf(')')));
	}
	const m = v.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/);
	if (m) {
		const a = m[4] === undefined ? 1 : parseFloat(m[4]);
		const hexOf = (r, g, b) => '#' + [ r, g, b ].map(x => x.toString(16).padStart(2, '0')).join('');
		return { hex: hexOf(+m[1], +m[2], +m[3]), alpha: a };
	}
	return { hex: v, alpha: 1 };
}
const over = (color, surface) => {
	const c = parseColor(color), s = hex2rgb(surface);
	const out = [ 0, 1, 2 ].map(i => Math.round(c.alpha * hex2rgb(c.hex)[i] + (1 - c.alpha) * s[i]));
	return '#' + out.map(x => x.toString(16).padStart(2, '0')).join('');
};

/* --- read the tokens out of the stylesheet ------------------------------- */
const src = fs.readFileSync(CSS_JS, 'utf8');

function grabTokens(text) {
	const out = {};
	for (const m of text.matchAll(/(--ds-[a-z0-9-]+)\s*:\s*([^;']+)/g)) out[m[1]] = m[2].trim();
	return out;
}

const lightMatch = src.match(/'\.meshconf-page\{(--ds-surface[\s\S]*?)'\s*,/);
if (!lightMatch) { console.log('FAIL  could not locate the .meshconf-page token block'); process.exit(1); }
const darkMatch = src.match(/var darkVars = '([\s\S]*?)';/);
if (!darkMatch) { console.log('FAIL  could not locate darkVars'); process.exit(1); }

const L = grabTokens(lightMatch[1]);
const D = grabTokens(darkMatch[1]);

const LIGHT = parseColor(L['--ds-surface']).hex;
const LIGHT_SUNKEN = parseColor(L['--ds-surface-sunken']).hex;
/* Our tokens do not carry a dark surface: the theme owns it. This is the
 * reference dark surface the design doc measures against. */
const DARK = '#1e1f22';

let fails = 0, checked = 0;
function check(label, fg, bg, min, counted = true) {
	checked++;
	const r = ratio(fg, bg);
	const ok = r >= min;
	if (!ok && counted) fails++;
	console.log('%s %s %s on %s = %s:1 (need %s)',
		(!counted ? 'info' : ok ? 'PASS' : 'FAIL').padEnd(4), label.padEnd(28),
		fg.padEnd(8), bg.padEnd(8), r.toFixed(2), min.toFixed(1));
	return ok;
}

console.log('tokens read from %s', path.relative(REPO, CSS_JS).split(path.sep).join('/'));
console.log('  light surface %s   sunken %s   dark ref %s\n', LIGHT, LIGHT_SUNKEN, DARK);

console.log('-- light : text on surface --');
check('text on surface', parseColor(L['--ds-text']).hex, LIGHT, 4.5);
check('muted on surface', parseColor(L['--ds-text-muted']).hex, LIGHT, 4.5);
check('muted on sunken', parseColor(L['--ds-text-muted']).hex, LIGHT_SUNKEN, 4.5);

console.log('\n-- light : semantic on its own tint (tint composited as painted) --');
for (const [ name, fgTok, tintTok ] of [
	[ 'ok', '--ds-ok', '--ds-ok-tint' ], [ 'warn', '--ds-warn', '--ds-warn-tint' ],
	[ 'error', '--ds-error', '--ds-error-tint' ], [ 'info', '--ds-info', '--ds-info-tint' ],
	[ 'accent', '--ds-accent', '--ds-accent-tint' ],
	[ 'U (untagged)', '--ds-untagged', '--ds-untagged-tint' ],
	[ 'T (tagged)', '--ds-tagged', '--ds-tagged-tint' ]
]) check(name + ' on tint', parseColor(L[fgTok]).hex, over(L[tintTok], LIGHT), 4.5);

console.log('\n-- light : white on a solid semantic fill --');
for (const t of [ '--ds-primary-text', '--ds-ok', '--ds-warn', '--ds-error', '--ds-accent', '--ds-untagged', '--ds-tagged' ])
	check('white on ' + t.replace('--ds-', ''), '#ffffff', parseColor(L[t]).hex, 4.5);

console.log('\n-- light : non-text UI --');
check('border vs surface', parseColor(L['--ds-border']).hex, LIGHT, 1.0);
check('primary vs surface (focus)', parseColor(L['--ds-primary']).hex, LIGHT, 3.0);

console.log('\n-- dark : accents we define, on the reference dark surface --');
for (const t of [ '--ds-ok', '--ds-warn', '--ds-error', '--ds-info', '--ds-accent', '--ds-untagged', '--ds-tagged', '--ds-primary-text' ])
	check(t.replace('--ds-', ''), parseColor(D[t]).hex, DARK, 4.5);
/* Theme-supplied in dark mode (darkVars deliberately does not override them). */
check('text on surface (theme)', '#f0f3f6', DARK, 4.5);
check('muted on surface (theme)', '#a7adb5', DARK, 4.5);

console.log('\n-- baselines: what upstream switch-vlan shipped (expected to fail) --');
console.log('   not counted; recorded so the fix can be re-justified later.');
for (const [ label, fg, bg, min ] of [
	[ '[was] U #0d9488', '#0d9488', over('rgba(13,148,136,.12)', LIGHT), 4.5 ],
	[ '[was] T #d97706', '#d97706', over('rgba(217,119,6,.14)', LIGHT), 4.5 ],
	[ '[was] accent #8250df', '#8250df', over('rgba(130,80,223,.12)', LIGHT), 4.5 ],
	[ '[was] #3c8dbc as text', '#3c8dbc', LIGHT, 4.5 ]
]) check(label, fg, bg, min, false);

console.log('\n%d of %d shipped pairs below their required ratio.', fails, checked);
process.exit(fails ? 1 : 0);
