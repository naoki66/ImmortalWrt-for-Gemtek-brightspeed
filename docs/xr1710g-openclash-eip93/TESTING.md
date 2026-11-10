# Reproduction and acceptance

Use the documented main/feed revisions and a private build directory. Apply
feed patches through scripts/apply-feed-patches.sh. Select the optional package,
disable the generic EIP93 module, run make defconfig, and verify that the correct
Airoha EIP93, AF_ALG and GCM kernel modules and the packaged Mihomo are selected.
Build the firmware or packages normally. Verify the resulting symlink, scripts,
core identity and driver in the actual image; do not infer image contents from
source alone. This isolated review composition needs a fresh complete build.

After package prepare, use the same Go toolchain to generate tools/eip93 overlay.
Run the upstream overlay's AES-GCM tests on AN7581 and software cipher regression
tests. Check AES-128/192/256, boundary records, bad tags, in-place buffers,
concurrency, unsupported DT/CPU gates, unavailable driver and socket fallback.

Historical runtime evidence is summarized in README, not claimed as a test of
this newly isolated composition. No installation or service restart is performed
by preparing/publishing this PR.

For actual traffic, hold the same working node, client, payload and cipher fixed.
Measure at least three alternating auto/off transfers. Record payload hashes,
receiver throughput and CPU plus /proc/interrupts 1fb70000.crypto before/after.
Avoid unrelated EIP93 jobs during measurements. A successful payload transfer,
eligible cipher/record path and IRQ growth against a zero-growth off control
are needed; a startup activation log alone is insufficient. Never publish node
passwords, subscription URLs, API tokens or full private configs as test evidence.

Check policy propagation, default protected core update and explicit override;
confirm subscription/rule update scripts remain unchanged. With the integration
package absent, normal upstream OpenClash startup/update behavior must remain.

Rollback source: on the matching clean branch use exported rollback.patch after
git apply --check, or revert these commits in reverse order. Feed working trees
are separate repositories: reverse only this series' three feed patches there,
then restore/rebuild the stock package. Source rollback does not uninstall live
packages. For device rollback, stop OpenClash, back up its current config/core,
restore stock OpenClash/Mihomo packages and the intended core path, then remove
the optional integration package. Preserve user subscriptions/rules. No router
flash, reboot or deletion of a user's core is part of this submission.
