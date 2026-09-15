'use strict';
/* Mini CSS cascade evaluator, scoped to the one question that matters here:
 * which `outline` declaration wins for a keyboard-focused control?
 *
 * The upstream stylesheet suppresses outlines with :focus selectors of varying
 * specificity, and a patch that adds a lower-specificity :focus-visible rule
 * applies perfectly cleanly while doing nothing at all. So we simulate it:
 * build the rule list, compute specificity, match against a small element tree,
 * and report the winner - plus whether it was decided by specificity or by
 * source order.
 *
 * Scope: descendant combinators only (no `>`, `+`, `~`); @media is skipped.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

/* What to read. This check asserts that the PATCH gives keyboard users a ring,
 * so it has to read the patched stylesheet - which is not a file in the repo.
 * make-css-patch.js builds it in a throwaway git repo and diffs it from there:
 *
 *   <tmp>/luci-ui-checks/feedsim/<REL>
 *
 * Run make-css-patch.js first (it is the step that produces the CSS this
 * asserts against), then run this with no argument and it picks that file up.
 * Passing snapshot/switch-vlan.css instead is the PRE-PATCH baseline - the
 * keyboard rows are supposed to fail there; that is the point of the fix. */
const REL = 'modules/luci-mod-network/htdocs/luci-static/resources/view/network/switch-vlan.css';
const PATCHED = path.join(os.tmpdir(), 'luci-ui-checks', 'feedsim', REL);
const PRISTINE = path.join(__dirname, 'snapshot', 'switch-vlan.css');

const file = path.resolve(process.argv[2] || PATCHED);
if (!fs.existsSync(file)) {
	console.error('no such stylesheet: %s', file);
	console.error('run `node scripts/luci-ui-checks/make-css-patch.js` first - it writes the');
	console.error('patched stylesheet this check reads (%s).', PATCHED);
	process.exit(2);
}
if (file === PRISTINE)
	console.log('NOTE  reading the pristine pre-patch snapshot: the KEYBOARD rows are the\n' +
		'      "before" baseline and are EXPECTED to fail. Drop the argument to assert\n' +
		'      the patch instead.\n');

let css = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

/* strip comments */
css = css.replace(/\/\*[\s\S]*?\*\//g, '');

/* remove @media / @supports blocks wholesale (brace-matched) */
function stripAtRules(s) {
	let out = '', i = 0;
	while (i < s.length) {
		const at = s.indexOf('@', i);
		if (at < 0) { out += s.slice(i); break; }
		out += s.slice(i, at);
		const brace = s.indexOf('{', at);
		if (brace < 0) { out += s.slice(at); break; }
		let depth = 0, j = brace;
		for (; j < s.length; j++) {
			if (s[j] === '{') depth++;
			else if (s[j] === '}' && --depth === 0) break;
		}
		i = j + 1;
	}
	return out;
}
const flat = stripAtRules(css);

/* rule list */
const rules = [];
const re = /([^{}]+)\{([^{}]*)\}/g;
let m;
while ((m = re.exec(flat))) {
	const body = m[2].trim();
	if (!body) continue;
	const decls = {};
	for (const d of body.split(';')) {
		const k = d.indexOf(':');
		if (k < 0) continue;
		decls[d.slice(0, k).trim().toLowerCase()] = d.slice(k + 1).trim();
	}
	for (const sel of m[1].split(',')) {
		const s = sel.trim();
		if (s) rules.push({ sel: s, decls, order: rules.length });
	}
}

/* Tokeniser for a single compound selector. Attribute selectors MUST be
 * handled: the upstream rule we are racing is input[type="text"]:focus, and an
 * earlier version of this checker dropped `[...]` on the floor - which silently
 * excluded the very rule that decides the tie and produced a green result that
 * proved nothing. */
function tokenise(compound) {
	const out = [];
	let i = 0;
	const s = compound;
	while (i < s.length) {
		const c = s[i];
		if (c === '#') {
			let j = i + 1; while (j < s.length && /[\w-]/.test(s[j])) j++;
			out.push({ t: 'id', v: s.slice(i + 1, j) }); i = j;
		} else if (c === '.') {
			let j = i + 1; while (j < s.length && /[\w-]/.test(s[j])) j++;
			out.push({ t: 'cls', v: s.slice(i + 1, j) }); i = j;
		} else if (c === ':') {
			let j = i + 1; while (j < s.length && /[\w-]/.test(s[j])) j++;
			const name = s.slice(i + 1, j);
			let arg = null;
			if (s[j] === '(') {
				const end = s.indexOf(')', j);
				arg = s.slice(j + 1, end); j = end + 1;
			}
			out.push({ t: 'pseudo', v: name, arg }); i = j;
		} else if (c === '[') {
			const end = s.indexOf(']', i);
			const inner = s.slice(i + 1, end);
			const eq = inner.search(/[~^|$*]?=/);
			if (eq < 0) out.push({ t: 'attr', v: inner.trim(), op: null, val: null });
			else {
				const op = inner.slice(eq, inner.indexOf('=', eq) + 1);
				out.push({
					t: 'attr', v: inner.slice(0, eq).trim(), op,
					val: inner.slice(inner.indexOf('=', eq) + 1).trim().replace(/^["']|["']$/g, '')
				});
			}
			i = end + 1;
		} else if (/[A-Za-z_*]/.test(c)) {
			let j = i; while (j < s.length && /[\w-]/.test(s[j])) j++;
			out.push({ t: 'type', v: s.slice(i, j) }); i = j;
		} else i++;
	}
	return out;
}

function specificity(sel) {
	let ids = 0, cls = 0, type = 0;
	for (const part of sel.trim().split(/\s+/))
		for (const tk of tokenise(part)) {
			if (tk.t === 'id') ids++;
			else if (tk.t === 'cls' || tk.t === 'attr') cls++;
			else if (tk.t === 'pseudo') cls++;
			else if (tk.t === 'type' && tk.v !== '*') type++;
		}
	return [ ids, cls, type ];
}
const speq = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
const spgt = (a, b) => (a[0] - b[0]) || (a[1] - b[1]) || (a[2] - b[2]);

/* element = { tag, id, cls:[], attrs:{}, states:Set } */
function compoundMatches(el, compound, states) {
	for (const tk of tokenise(compound)) {
		if (tk.t === 'id') { if (el.id !== tk.v) return false; }
		else if (tk.t === 'cls') { if (!el.cls.includes(tk.v)) return false; }
		else if (tk.t === 'attr') {
			const has = Object.prototype.hasOwnProperty.call(el.attrs || {}, tk.v);
			if (tk.op === null) { if (!has) return false; }
			else {
				const actual = String((el.attrs || {})[tk.v]);
				if (tk.op === '=') { if (actual !== tk.val) return false; }
				else if (tk.op === '~=') { if (!actual.split(/\s+/).includes(tk.val)) return false; }
				else if (tk.op === '^=') { if (!actual.startsWith(tk.val)) return false; }
				else if (tk.op === '$=') { if (!actual.endsWith(tk.val)) return false; }
				else if (tk.op === '*=') { if (!actual.includes(tk.val)) return false; }
				else return false;
			}
		}
		else if (tk.t === 'pseudo') {
			if (!states.has(tk.v)) return false;
		}
		else if (tk.t === 'type') { if (tk.v !== '*' && el.tag !== tk.v) return false; }
	}
	return true;
}

/* ancestors = array of ancestor elements, nearest last */
function selectorMatches(el, ancestors, sel, states) {
	const compounds = sel.trim().split(/\s+/);
	if (!compoundMatches(el, compounds[compounds.length - 1], states)) return false;
	let idx = ancestors.length - 1;
	for (let c = compounds.length - 2; c >= 0; c--) {
		let found = false;
		while (idx >= 0) {
			if (compoundMatches(ancestors[idx], compounds[c], new Set())) { found = true; idx--; break; }
			idx--;
		}
		if (!found) return false;
	}
	return true;
}

const view = { tag: 'div', id: 'switch-vlan-view', cls: [], attrs: {}, states: new Set() };
const ancestors = [ { tag: 'body', id: '', cls: [], attrs: {}, states: new Set() }, view ];

const cases = [
	{ name: 'port label input (in tile)  ', tag: 'input', id: '', cls: [ 'svc-port-label' ], attrs: { type: 'text' } },
	{ name: 'VLAN label input (in table) ', tag: 'input', id: '', cls: [ 'svc-vlan-label' ], attrs: { type: 'text' } },
	{ name: 'VLAN id input (number)      ', tag: 'input', id: '', cls: [ 'svc-vlan-id-input' ], attrs: { type: 'number' } },
	{ name: 'port tile (div, role=button)', tag: 'div', id: '', cls: [ 'svc-port-tile' ], attrs: { role: 'button' } },
	{ name: 'select cell button          ', tag: 'button', id: '', cls: [ 'cbi-button', 'svc-vlan-btn-untagged' ], attrs: {} }
];

let fails = 0;
for (const c of cases) {
	for (const keyboard of [ true, false ]) {
		const states = new Set([ 'focus' ]);
		if (keyboard) states.add('focus-visible');
		const el = { tag: c.tag, id: c.id, cls: c.cls, attrs: c.attrs, states };

		const hits = rules.filter(r => r.decls.outline && selectorMatches(el, ancestors, r.sel, states));
		if (!hits.length) { console.log('%s  %s  -> no outline declaration matched', c.name, keyboard ? 'KEYBOARD' : 'mouse   '); continue; }
		let winner = hits[0];
		for (const h of hits.slice(1)) {
			const sp = spgt(specificity(h.sel), specificity(winner.sel));
			if (sp > 0 || (sp === 0 && h.order > winner.order)) winner = h;
		}
		const sp = specificity(winner.sel);
		const tied = hits.filter(h => h.sel !== winner.sel && speq(specificity(h.sel), sp));
		const how = tied.length
			? 'won by SOURCE ORDER over [' + tied.map(t => t.sel).join(' | ') + ']'
			: 'won by specificity (' + sp.join(',') + ')';
		const wantRing = keyboard;
		const gotRing = winner.decls.outline !== 'none';
		const ok = wantRing === gotRing;
		if (!ok) fails++;
		console.log('%s %s %s  outline: %s  [%s]',
			ok ? 'PASS' : 'FAIL', c.name, keyboard ? 'KEYBOARD' : 'mouse   ',
			winner.decls.outline, how);
	}
}

console.log('\ncascade assertions failed: %d', fails);
process.exit(fails ? 1 : 0);
