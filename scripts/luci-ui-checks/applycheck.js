'use strict';
/* Prove every patch under patches/feeds/ applies to an *unpatched* checkout of
 * the file it targets, in the exact way scripts/apply-feed-patches.sh does it:
 * `git -C <feed root> apply < patch`, with paths relative to the feed root.
 *
 * Run:  node scripts/luci-ui-checks/applycheck.js
 *
 * Patches whose target file has no local snapshot are reported as SKIP, not
 * FAIL: this tree does not carry copies of every feed file a patch may touch
 * (msd_lite / vlmcsd init scripts, for instance), and pretending a missing
 * snapshot is a broken patch would make the exit code useless. The build
 * applies those patches for real against the fetched feeds.
 *
 * Exit code is 0 only when every patch that *can* be simulated applies.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const REPO = path.resolve(__dirname, '..', '..');
const PATCHROOT = path.join(REPO, 'patches', 'feeds');
const SIM = path.join(os.tmpdir(), 'luci-ui-checks', 'applysim');
const SNAP = path.join(__dirname, 'snapshot');

/* Feed file -> pristine copy downloaded from the feed remote. */
const PRISTINE = {
	'modules/luci-mod-network/htdocs/luci-static/resources/tools/bridgevlan.js': path.join(SNAP, 'bridgevlan.js'),
	'modules/luci-mod-network/htdocs/luci-static/resources/view/network/switch-vlan.js': path.join(SNAP, 'switch-vlan.js'),
	'modules/luci-mod-network/htdocs/luci-static/resources/view/network/switch-vlan.css': path.join(SNAP, 'switch-vlan.css')
};

function walk(dir) {
	const out = [];
	for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
		const p = path.join(dir, e.name);
		if (e.isDirectory()) out.push(...walk(p));
		else if (e.name.endsWith('.patch')) out.push(p);
	}
	return out;
}

if (!fs.existsSync(PATCHROOT)) { console.log('no patches/feeds directory'); process.exit(0); }

/* Feed root for this checkout: simulate feeds/luci. */
const feedRoot = path.join(SIM, 'feeds', 'luci');
fs.rmSync(SIM, { recursive: true, force: true });

const git = (...a) => execFileSync('git', a, { cwd: feedRoot, encoding: 'utf8', stdio: [ 'ignore', 'pipe', 'pipe' ] });

const patches = walk(PATCHROOT).sort();
if (!patches.length) { console.log('no patches found'); process.exit(0); }

/* Lay down the pristine files the patches touch, then git-init the feed root. */
for (const rel of Object.keys(PRISTINE)) {
	const dst = path.join(feedRoot, rel);
	fs.mkdirSync(path.dirname(dst), { recursive: true });
	fs.copyFileSync(PRISTINE[rel], dst);
}
git('init', '-q');
git('config', 'core.autocrlf', 'false');
git('config', 'user.email', 't@local');
git('config', 'user.name', 't');
git('add', '-A');
git('commit', '-q', '-m', 'pristine');

/* Which feed files does a patch touch? Read the diff headers. */
function targets(patchPath) {
	const files = [];
	for (const line of fs.readFileSync(patchPath, 'utf8').split('\n')) {
		const m = line.match(/^\+\+\+ b\/(.+)$/);
		if (m) files.push(m[1].trim());
	}
	return files;
}

let fail = 0, skip = 0, ok = 0;
for (const p of patches) {
	const rel = path.relative(PATCHROOT, p).split(path.sep).join('/');
	const label = rel.replace(/^luci\//, '');
	const files = targets(p);
	const missing = files.filter(f => !(f in PRISTINE));

	if (missing.length) {
		skip++;
		console.log('SKIP  %s\n      no local snapshot for: %s', label, missing.join(', '));
		continue;
	}

	/* git apply reads the patch from stdin, exactly as the build script does. */
	const check = spawnSync('git', [ '-C', feedRoot, 'apply', '--check' ], { input: fs.readFileSync(p) });
	if (check.status !== 0) {
		fail++;
		console.log('FAIL  %s\n      %s', label, (check.stderr || '').toString().trim().split('\n').join('\n      '));
		continue;
	}
	const apply = spawnSync('git', [ '-C', feedRoot, 'apply' ], { input: fs.readFileSync(p) });
	if (apply.status !== 0) {
		fail++;
		console.log('FAIL  %s (apply)\n      %s', label, (apply.stderr || '').toString().trim());
		continue;
	}
	git('add', '-A');
	git('commit', '-q', '-m', label);
	ok++;
	console.log('OK    %s', label);
}

console.log('\n%d applied, %d skipped (no snapshot), %d failed.', ok, skip, fail);
process.exit(fail ? 1 : 0);
