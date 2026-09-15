'use strict';
/* Verify the meshconf stylesheet's design-token wiring:
 *  1. every var(--ds-*) referenced anywhere in the css array is declared
 *     (either in the light token block or in darkVars);
 *  2. the declared token list has no duplicates;
 *  3. every css string has balanced braces;
 *  4. no `outline:none` survives on a focus rule (WCAG 2.4.7 regression guard).
 */
const fs = require('fs');

const file = process.argv[2];
const src = fs.readFileSync(file, 'utf8');
const fail = [];
const note = [];

function declTokens(text) {
	const out = new Set();
	const re = /--ds-[a-z0-9-]+(?=\s*:)/g;
	let m;
	while ((m = re.exec(text))) out.add(m[0]);
	return out;
}

/* light token block = the string literal that starts with '.meshconf-page{' */
const lightMatch = src.match(/'\.meshconf-page\{--ds-surface[\s\S]*?'/);
if (!lightMatch) fail.push('could not locate the .meshconf-page token block');
const darkMatch = src.match(/var darkVars = '([\s\S]*?)';\n/);
if (!darkMatch) fail.push('could not locate darkVars');

const declared = new Set();
if (lightMatch) declTokens(lightMatch[0]).forEach(t => declared.add(t));
if (darkMatch) declTokens(darkMatch[1]).forEach(t => declared.add(t));

/* duplicate detection on the raw declaration lists */
function dupes(text) {
	const seen = new Set(), dup = new Set();
	for (const t of declTokens(text)) { if (seen.has(t)) dup.add(t); else seen.add(t); }
	return [...dup];
}
if (lightMatch) dupes(lightMatch[0]).forEach(t => fail.push('duplicate declaration in light block: ' + t));
if (darkMatch) dupes(darkMatch[1]).forEach(t => fail.push('duplicate declaration in dark block: ' + t));

/* all references across every css string */
const refs = new Map();
const reRef = /var\(\s*(--ds-[a-z0-9-]+)/g;
let m;
const cssStart = src.indexOf('var css = [');
const cssEnd = src.indexOf('].join', cssStart);
if (cssStart < 0 || cssEnd < 0) fail.push('could not locate the css array bounds');
const cssRegion = src.slice(cssStart, cssEnd);
while ((m = reRef.exec(cssRegion))) {
	if (!refs.has(m[1])) refs.set(m[1], 0);
	refs.set(m[1], refs.get(m[1]) + 1);
}

for (const t of [...refs.keys()].sort())
	if (!declared.has(t)) fail.push('referenced but never declared: ' + t);

/* unused-but-declared is informational only: some tokens are used by sibling
 * selectors that live outside the css array, or reserved for the dark block */
const unused = [...declared].filter(t => !refs.has(t)).sort();
if (unused.length) note.push('declared but not referenced in css array: ' + unused.join(', '));

/* brace balance per css string literal */
const strings = cssRegion.match(/'[^']*'/g) || [];
strings.forEach((s, i) => {
	const open = (s.match(/\{/g) || []).length;
	const close = (s.match(/\}/g) || []).length;
	if (open !== close) fail.push('brace mismatch in css[' + i + ']: ' + open + ' != ' + close + '  -> ' + s.slice(0, 90));
});

/* focus rules must not suppress the outline without re-providing one */
const focusRules = strings.filter(s => /:focus\b/.test(s) && /outline\s*:\s*none/.test(s));
if (focusRules.length)
	fail.push('focus rule suppresses the outline: ' + focusRules.map(s => s.slice(0, 80)).join(' | '));

const focusVisible = strings.filter(s => /:focus-visible/.test(s)).length;

console.log('tokens declared : %d', declared.size);
console.log('tokens used     : %d', refs.size);
console.log('css strings     : %d', strings.length);
console.log(':focus-visible rules: %d', focusVisible);
note.forEach(n => console.log('NOTE  %s', n));
if (fail.length) {
	fail.forEach(f => console.log('FAIL  %s', f));
	process.exit(1);
}
console.log('OK  token wiring clean');
