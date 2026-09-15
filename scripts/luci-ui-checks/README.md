# luci-ui-checks

Maintainer checks that grew out of the two pages that used to edit the same
`bridge-vlan` model:

- `package/luci-app-mesh-conf/` (the mesh-conf page) — **rewritten**: it is a
  802.11s / wired-config-sync page now and has no VLAN editor any more.
- `luci-mod-network`'s Switch view, `view/network/switch-vlan.*` (upstream, patched
  from `patches/feeds/`)

Design rationale and the measured numbers live in
[`docs/design-luci-vlan-ui.md`](../../docs/design-luci-vlan-ui.md). This directory
holds the scripts that produced those numbers, so they can be re-run after a
change instead of being taken on trust.

Everything here is Node (no dependencies) and needs no `feeds/` checkout — the
upstream files the checks compare against are pinned in `snapshot/`.

## Run

From the repository root:

```sh
node scripts/luci-ui-checks/syncheck.js    package/luci-app-mesh-conf/htdocs/luci-static/resources/view/meshconf/meshconf.js
node scripts/luci-ui-checks/tokencheck.js  package/luci-app-mesh-conf/htdocs/luci-static/resources/view/meshconf/meshconf.js
node scripts/luci-ui-checks/portcheck.js
node scripts/luci-ui-checks/contrast.js
node scripts/luci-ui-checks/ringcheck.js
node scripts/luci-ui-checks/make-css-patch.js
node scripts/luci-ui-checks/applycheck.js
node scripts/luci-ui-checks/cascadecheck.js
```

All of them exit non-zero on failure.

`cascadecheck.js` reads the **patched** stylesheet, which is why
`make-css-patch.js` must run before it — it asserts that the patch gives keyboard
users a focus ring, and the patched CSS only ever exists in the throwaway
`feedsim` repo that `make-css-patch.js` builds. Point it at
`snapshot/switch-vlan.css` (or pass any path as the first argument) and it reads
the pre-patch baseline instead, where the keyboard rows are *supposed* to fail.

## What each one proves

| script | question it answers |
| --- | --- |
| `syncheck.js` | Does the LuCI view parse in the shape the browser loads it (`new Function` + `'use strict'`)? `node --check` cannot be used — view files are function bodies with `'require …'` pseudo-directives. Strict mode is what caught an illegal octal escape (`'\25B8'`) hiding in the CSS. |
| `tokencheck.js` | Are the design tokens wired up — no `var(--ds-*)` without a declaration, no duplicate declarations, balanced braces, and no `:focus` rule that suppresses `outline` without giving one back? |
| `portcheck.js` | Does the shell classifier `vlan_port_role()` agree with upstream `parsePortSpec()` on every port-spec spelling? Needs `bash` (auto-detected; override with `BASH=…`). **Exits 0 with `SKIP`** while the mesh-conf plugin defines no `vlan_port_role()`. |
| `contrast.js` | Do the palette pairs reach WCAG 2.2 AA, measured through alpha compositing (a translucent tint is measured as painted, not as authored)? Also holds the "before" values, so it doubles as the failing baseline. |
| `ringcheck.js` | Is the focus indicator stack sound — the soft halo is supplementary, and the border / outline that must clear 3:1 do? |
| `make-css-patch.js` | Regenerates the Switch-view feed patch and asserts each edit matched exactly once. |
| `applycheck.js` | Does every `patches/feeds/*` patch still apply to a pristine checkout, via `git -C <feed root> apply` reading stdin — the same call the build makes? |
| `cascadecheck.js` | **Which `outline` declaration actually wins** for a focused control, and whether it won on specificity or on source order. Reads the patched stylesheet, so `make-css-patch.js` runs first. |

## `cascadecheck.js` — why a whole script for one property

`patch 102` adds `:focus-visible` rules to a stylesheet that already contains three
`:focus { outline: none }` blocks. Getting the specificity wrong produces a patch
that applies perfectly cleanly and changes nothing for keyboard users — invisible
to `git apply`, to a linter, and to eyeballing the diff.

The check was written because the first attempt at it **lied**: the tokeniser
dropped `[...]`, so the deciding rule (`#switch-vlan-view input[type="text"]:focus`,
`(1,2,1)`) never entered the comparison and every row came back green. Attribute
selectors are now parsed and `[type=…]` matching is part of the model. If you edit
the matcher, verify it can still see that rule.

It reports the winner as either "won by specificity (a,b,c)" or
"won by SOURCE ORDER over […]" — the second is the load-bearing one for the
`(1,2,1)` tie, and is the reason the focus block must stay last in the file.

## `snapshot/`

Pristine upstream copies, kept so the checks run without a `feeds/` checkout:

| file | why |
| --- | --- |
| `switch-vlan.css` | Input to `make-css-patch.js`; also the "before" side of the cascade and contrast comparisons. |
| `bridgevlan.js` | The real `parsePortSpec()` / `formatPortSpec()` grammar that `portcheck.js` compares against. |
| `switch-vlan.js` | Element types for the cascade matrix (`.svc-port-label` and `.svc-vlan-label` are `<input type="text">`, `.svc-vlan-id-input` is `<input type="number">`) — that is what makes the upstream `input[type=…]` rule hit them. |

Refresh by re-downloading from the luci feed when you bump the feed; the patch
context lines depend on `switch-vlan.css`, so a rebase conflict there means this
snapshot is stale.

## Not covered

No router is involved, so netifd's actual behaviour with `local=0`, how the
segmented control renders under a given LuCI theme, and the end-to-end
apply → reload round trip all still need a device. Suggested order is at the end
of `docs/design-luci-vlan-ui.md`.
