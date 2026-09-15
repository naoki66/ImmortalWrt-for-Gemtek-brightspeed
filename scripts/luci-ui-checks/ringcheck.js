'use strict';
/* Measure the focus indicator stack used by the VLAN pages.
 *
 * The focus affordance is layered, and the layers are NOT equivalent:
 *   - the 3px soft halo (--ds-focus-ring) is a *supplementary* cue;
 *   - the 1px border turning --ds-primary, and the 2px :focus-visible outline,
 *     are the indicators that actually carry WCAG 2.2 SC 2.4.11.
 * Both are measured; the halo is allowed to read as a wash, but the border and
 * the outline must clear 3:1 against the surface they sit on.
 */

function srgbToLin(c) { c = c / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function hex2rgb(h) {
	h = h.replace('#', '');
	if (h.length === 3) h = h.split('').map(s => s + s).join('');
	return [ parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16) ];
}
function lum(rgb) { return 0.2126 * srgbToLin(rgb[0]) + 0.7152 * srgbToLin(rgb[1]) + 0.0722 * srgbToLin(rgb[2]); }
function ratio(fg, bg) {
	const a = lum(hex2rgb(fg)), b = lum(hex2rgb(bg));
	const hi = Math.max(a, b), lo = Math.min(a, b);
	return (hi + 0.05) / (lo + 0.05);
}
function over(rgba, surfaceHex) {
	const m = String(rgba).match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/);
	if (!m) return rgba;
	const a = m[4] === undefined ? 1 : parseFloat(m[4]);
	const s = hex2rgb(surfaceHex);
	const out = [ 0, 1, 2 ].map(i => Math.round(a * +m[i + 1] + (1 - a) * s[i]));
	return '#' + out.map(v => v.toString(16).padStart(2, '0')).join('');
}

const LIGHT = '#ffffff', LIGHT_SUNKEN = '#f6f8fa', DARK = '#1e1f22';
const rows = [];
function add(kind, label, fg, bg, min) { rows.push([ kind, label, fg, bg, min ]); }

const RING_LIGHT = 'rgba(9,105,218,.32)';
const RING_DARK = 'rgba(77,156,246,.45)';

/* supplementary halo */
add('halo',    'light halo on surface', over(RING_LIGHT, LIGHT), LIGHT, 1.0);
add('halo',    'light halo on sunken',  over(RING_LIGHT, LIGHT_SUNKEN), LIGHT_SUNKEN, 1.0);
add('halo',    'dark  halo on surface', over(RING_DARK, DARK), DARK, 1.0);
/* indicators that must clear 3:1 */
add('border',  'light border #0969da', '#0969da', LIGHT, 3.0);
add('border',  'dark  border #4d9cf6', '#4d9cf6', DARK, 3.0);
add('outline', 'light outline = border', '#0969da', LIGHT, 3.0);
add('outline', 'dark  outline = border', '#4d9cf6', DARK, 3.0);

let fails = 0;
for (const [ kind, label, fg, bg, min ] of rows) {
	const r = ratio(fg, bg);
	const ok = r >= min;
	if (!ok && kind !== 'halo') fails++;
	console.log('%s %s %s %s on %s = %s:1 (need %s)',
		(ok ? 'PASS' : 'weak').padEnd(4), kind.padEnd(7), label.padEnd(24),
		fg.padEnd(17), bg.padEnd(8), r.toFixed(2), min.toFixed(1));
}
console.log('\nindicator rows below 3:1: %d', fails);

/* Recorded so the rejection can be re-justified later: the previous revision
 * reused --ds-info-tint (alpha .08) as the 3px focus ring. A ring painted at
 * that alpha is nearly invisible, which is why a dedicated token exists. */
console.log('\n-- rejected candidate: the .08 info tint used as a focus ring --');
const rejected = over('rgba(9,105,218,.08)', LIGHT);
const rRejected = ratio(rejected, LIGHT);
console.log('info tint as halo   %s on %s = %s:1  (a 3px indicator would need 3.0) -> rejected',
	rejected, LIGHT, rRejected.toFixed(2));
const rDedicated = ratio(over(RING_LIGHT, LIGHT), LIGHT);
console.log('dedicated token     %s on %s = %s:1  (%sx the .08 wash)',
	over(RING_LIGHT, LIGHT), LIGHT, rDedicated.toFixed(2),
	(rDedicated / rRejected).toFixed(2));
if (rRejected >= 3.0) { console.log('FAIL  the rejected value would have passed; re-check the rationale'); process.exit(1); }

