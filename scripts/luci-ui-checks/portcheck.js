'use strict';
/* Cross-check the shell-side port-spec classifier against the real upstream
 * implementation.
 *
 * Run:  node scripts/luci-ui-checks/portcheck.js
 *
 * The shell function vlan_port_role() is extracted from the rpcd plugin, and
 * parsePortSpec() is extracted from the *actual* LuCI source file that the feed
 * ships (snapshot/bridgevlan.js - not a hand-written copy of it), then both are
 * run over the same spec list and the resulting roles compared.
 *
 * Why this matters: a drift here is exactly what makes the mesh-conf page
 * mis-read a VLAN written by the network / switch page. The original bug was
 * that vlan_ports_of() only recognised "*:u*" / "*:t*", so a bare "lan3" (which
 * the stock views write for untagged) looked like "not a member" and the next
 * apply silently deleted it. Pinning the classifier against upstream prevents
 * that class of regression.
 *
 * Requires bash. On Windows the bundled PortableGit bash is used when present;
 * override with the BASH environment variable.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO = path.resolve(__dirname, '..', '..');
const LUCI = path.join(__dirname, 'snapshot', 'bridgevlan.js');
const PLUGIN = path.join(REPO, 'package', 'luci-app-mesh-conf', 'root', 'usr', 'libexec', 'rpcd', 'luci.meshconf');
const TMP = path.join(os.tmpdir(), 'luci-ui-checks', 'portspec-fixture.sh');

function findBash() {
	if (process.env.BASH && fs.existsSync(process.env.BASH)) return process.env.BASH;
	const candidates = [
		path.join(process.env.USERPROFILE || '', '.workbuddy', 'binaries', 'PortableGit', 'versions', '1.2.0', 'bin', 'bash.exe'),
		'C:/Program Files/Git/bin/bash.exe',
		'/bin/bash',
		'/usr/bin/bash'
	];
	for (const c of candidates) if (c && fs.existsSync(c)) return c;
	return 'bash';
}

/* --- pull a balanced-brace function out of a source file ------------------ */
function extractFn(src, name) {
	/* JS spells it "function name(", POSIX shell spells it "name()" with the
	 * brace on the next line; accept either. */
	let start = src.indexOf('function ' + name + '(');
	if (start < 0) start = src.indexOf('\n' + name + '()');
	if (start < 0) throw new Error('function ' + name + ' not found');
	if (src[start] === '\n') start++;
	const brace = src.indexOf('{', start);
	const head = src.slice(start, brace);
	if (!/^\s*(function\s+)?[A-Za-z_][A-Za-z0-9_]*\s*\(/.test(head) || !head.includes(name))
		throw new Error('unexpected form for ' + name + ': ' + JSON.stringify(head));
	let depth = 0;
	for (let j = brace; j < src.length; j++) {
		if (src[j] === '{') depth++;
		else if (src[j] === '}') {
			depth--;
			if (depth === 0) return src.slice(start, j + 1);
		}
	}
	throw new Error('unbalanced braces in ' + name);
}

if (!fs.existsSync(LUCI)) { console.log('MISSING %s', LUCI); process.exit(1); }
if (!fs.existsSync(PLUGIN)) { console.log('MISSING %s', PLUGIN); process.exit(1); }

const luciSrc = fs.readFileSync(LUCI, 'utf8');
const parsePortSpec = new Function(extractFn(luciSrc, 'parsePortSpec') + '; return parsePortSpec;')();

const shSrc = fs.readFileSync(PLUGIN, 'utf8');

/* The mesh-conf page no longer edits bridge-vlan sections - it is a 802.11s /
 * wired-config-sync page now - so the classifier it used to ship is gone.
 * Report SKIP rather than a failure: a missing function is not a mismatch, and
 * a check that fails on purpose is a check nobody runs. Re-add this file's
 * body if a VLAN editor ever comes back. */
let roleFn;
try {
	roleFn = extractFn(shSrc, 'vlan_port_role');
} catch (e) {
	console.log('SKIP  %s defines no vlan_port_role()', path.basename(PLUGIN));
	console.log('      the mesh-conf page no longer edits bridge-vlan sections.');
	process.exit(0);
}

console.log('extracted from upstream luci (snapshot) : %d chars', extractFn(luciSrc, 'parsePortSpec').length);
console.log('extracted from plugin                  : %d chars\n', roleFn.length);

const SPECS = [
	'lan2', 'lan3', 'lan4',
	'lan2:u', 'lan3:u*', 'lan4:u',
	'lan2:t', 'lan3:t*', 'lan4:t',
	'lan2:*', 'lan3:ut', 'lan4:u*t', 'lan2:tu',
	'bat0:t', 'lan2:', 'lan2:x', 'lan2:uu'
];

const BASH = findBash();
fs.mkdirSync(path.dirname(TMP), { recursive: true });
fs.writeFileSync(TMP, roleFn + '\nfor s in "$@"; do printf "%s %s\\n" "$s" "$(vlan_port_role "$s")"; done\n');
const res = spawnSync(BASH, [ TMP, ...SPECS ], { encoding: 'utf8' });
if (res.error) throw res.error;
if (res.status !== 0) throw new Error('bash exited ' + res.status + ': ' + res.stderr);

const shOut = {};
for (const line of res.stdout.trim().split('\n')) {
	const [ spec, role ] = line.split(' ');
	shOut[spec] = role;
}

/* Map the upstream boolean triple onto the role alphabet the grid uses:
 * untagged -> u, tagged-only -> t, both -> b, neither -> n (also the answer
 * for a spec upstream cannot parse at all). */
function expected(spec) {
	const p = parsePortSpec(spec);
	if (!p) return 'n';
	if (p.untagged && p.tagged) return 'b';
	if (p.untagged) return 'u';
	if (p.tagged) return 't';
	return 'n';
}

let bad = 0;
console.log('%s %s %s', 'spec'.padEnd(10), 'luci'.padEnd(8), 'shell'.padEnd(8));
for (const s of SPECS) {
	const e = expected(s), a = shOut[s];
	const ok = e === a;
	if (!ok) bad++;
	console.log('%s %s %s %s', s.padEnd(10), e.padEnd(8), String(a).padEnd(8), ok ? 'ok' : '<== MISMATCH');
}
console.log('\n%d/%d specs agree with upstream parsePortSpec().', SPECS.length - bad, SPECS.length);
process.exit(bad ? 1 : 0);
