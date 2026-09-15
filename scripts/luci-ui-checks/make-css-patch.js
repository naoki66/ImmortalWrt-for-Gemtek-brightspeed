'use strict';
/* Regenerate the Switch-view stylesheet patch:
 *
 *   patches/feeds/luci/modules/luci-mod-network/htdocs/luci-static/resources/
 *     view/network/102-align-switch-vlan-design-tokens.patch
 *
 * Run:  node scripts/luci-ui-checks/make-css-patch.js
 *
 * The patch is GENERATED, not hand-written: edits go in REPLACEMENTS / FOCUS
 * below and the patch file is rebuilt. Hand-editing the .patch instead will be
 * lost the next time this runs.
 *
 * How it works: a throwaway git repo is laid out so that its root IS the feed
 * root, so `git diff` produces paths relative to `feeds/luci` - exactly how
 * scripts/apply-feed-patches.sh feeds the patch to `git -C feeds/luci apply`.
 *
 * Every replacement is asserted to hit exactly once: a silent no-op here would
 * produce a patch that applies perfectly cleanly but changes nothing.
 *
 * Input: snapshot/switch-vlan.css - a pristine copy of the upstream file taken
 * from the luci feed. feeds/ is deliberately NOT required to be checked out,
 * because a freshly cloned tree has no feeds yet.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO = path.resolve(__dirname, '..', '..');
const REL = 'modules/luci-mod-network/htdocs/luci-static/resources/view/network/switch-vlan.css';
const SRC = path.join(__dirname, 'snapshot', 'switch-vlan.css');
const WORK = path.join(os.tmpdir(), 'luci-ui-checks', 'feedsim');
const DEST = path.join(WORK, REL);
const OUT = path.join(REPO, 'patches', 'feeds', 'luci', 'modules', 'luci-mod-network',
	'htdocs', 'luci-static', 'resources', 'view', 'network',
	'102-align-switch-vlan-design-tokens.patch');

const REPLACEMENTS = [
	/* 1. Contrast. Both of these were measured against their own tint and
	 *    failed WCAG 2.2 AA for small bold text (3.25:1 and 2.75:1). */
	{
		from: '\t/* Teal + amber-orange: distinguishable from grey port text */\n' +
			'\t--svc-vlan-untagged: #0d9488;\n' +
			'\t--svc-vlan-tagged: #d97706;\n',
		to: '\t/* Teal + amber-orange, dark enough to pass WCAG 2.2 AA as text on\n' +
			'\t * their own tint (4.86:1 and 7.09:1 against white). The lighter\n' +
			'\t * #0d9488 / #d97706 this view originally shipped measured only\n' +
			'\t * 3.25:1 and 2.75:1. Shared with the mesh-conf page - see\n' +
			'\t * docs/design-luci-vlan-ui.md for the measured table. */\n' +
			'\t--svc-vlan-untagged: #0f766e;\n' +
			'\t--svc-vlan-tagged: #92400e;\n'
	},
	/* 2. Port tile radius onto the shared 4/6/8px scale. */
	{
		from: '\tborder-radius: 4px;\n\tpadding: 0.5em 0.6em;\n',
		to: '\tborder-radius: 6px;\n\tpadding: 0.5em 0.6em;\n'
	},
	/* 3. Scoped input radius likewise (2px -> 4px). */
	{
		from: '\tborder: 1px solid var(--border-color-low, #ddd);\n\tborder-radius: 2px;\n',
		to: '\tborder: 1px solid var(--border-color-low, #ddd);\n\tborder-radius: 4px;\n'
	}
];

/* 4. Focus ring - appended at EOF, see the comment text for why. */
const FOCUS = [
	'',
	'/* Keyboard focus. Three upstream rule blocks suppress the outline on :focus',
	' * (specificity as (id, class, type)):',
	' *   #switch-vlan-view input[type="text"|"number"]:focus       (1, 2, 1)',
	' *   .svc-port-label:focus  /  .svc-vlan-label:focus,',
	' *   .svc-vlan-id-input:focus                                  (0, 2, 0)',
	' * The first is the dangerous one: a plain',
	' * "#switch-vlan-view input:focus-visible" is only (1, 1, 1) and therefore',
	' * LOSES to it, leaving keyboard users with no indicator at all',
	' * (WCAG 2.2 SC 2.4.7 / 2.4.11). The selectors below mirror those rules, so',
	' * the (1, 2, 1) pair ties and this block wins on source order - which is why',
	' * it must stay last in the file. Verified by scripts/luci-ui-checks/.',
	' * outline:none on plain :focus is kept on purpose - a mouse click should',
	' * show only the primary border. The ring returns for :focus-visible. */',
	'#switch-vlan-view input[type="text"]:focus-visible,',
	'#switch-vlan-view input[type="number"]:focus-visible,',
	'#switch-vlan-view .svc-port-label:focus-visible,',
	'#switch-vlan-view .svc-vlan-label:focus-visible,',
	'#switch-vlan-view .svc-vlan-id-input:focus-visible,',
	'#switch-vlan-view .cbi-button:focus-visible,',
	'#switch-vlan-view .svc-port-tile:focus-visible {',
	'\toutline: 2px solid var(--primary-color-high, #3c8dbc);',
	'\toutline-offset: 2px;',
	'}',
	'',
	'/* Inside a table cell an outward offset would be clipped, so it turns',
	' * inward there. Higher specificity than the block above, so order does not',
	' * matter for this pair. */',
	'#switch-vlan-view .svc-vlan-cell-select .cbi-button:focus-visible,',
	'#switch-vlan-view .svc-vlan-cell-assign .cbi-button:focus-visible {',
	'\toutline-offset: -2px;',
	'}',
	''
].join('\n');

const EOF_ANCHOR = '\t.svc-vlan-row > .svc-vlan-cell-empty {\n\t\tdisplay: none;\n\t}\n}\n';

fs.rmSync(WORK, { recursive: true, force: true });
fs.mkdirSync(path.dirname(DEST), { recursive: true });
fs.copyFileSync(SRC, DEST);

const git = (...a) => execFileSync('git', a, { cwd: WORK, encoding: 'utf8', stdio: [ 'ignore', 'pipe', 'pipe' ] });
git('init', '-q');
git('config', 'core.autocrlf', 'false');
git('config', 'user.email', 'patch@local');
git('config', 'user.name', 'patch');
git('add', REL);
git('commit', '-q', '-m', 'base');

let css = fs.readFileSync(DEST, 'utf8').replace(/\r\n/g, '\n');
for (const { from, to } of REPLACEMENTS) {
	const n = css.split(from).length - 1;
	if (n !== 1) throw new Error('expected exactly 1 match, got ' + n + ' for: ' + JSON.stringify(from.slice(0, 60)));
	css = css.replace(from, to);
}

if (css.split(EOF_ANCHOR).length - 1 !== 1) {
	throw new Error('EOF anchor not found exactly once; tail is: ' +
		JSON.stringify(css.slice(-160)));
}
css = css.replace(EOF_ANCHOR, EOF_ANCHOR + FOCUS);

fs.writeFileSync(DEST, css, 'utf8');

const diff = execFileSync('git', [ 'diff', '--no-color', '--', REL ], { cwd: WORK, encoding: 'utf8' });
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, diff.replace(/\r\n/g, '\n'), 'utf8');
console.log('wrote %s', path.relative(REPO, OUT).split(path.sep).join('/'));
console.log('      %d bytes, %d hunks', diff.length, (diff.match(/^@@/gm) || []).length);
