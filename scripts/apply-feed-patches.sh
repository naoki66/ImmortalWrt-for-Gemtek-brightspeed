#!/usr/bin/env bash
#
# Apply the feed patches kept under patches/feeds/.
#
# Layout: patches/feeds/<feed>/<path inside the feed>/NNN-name.patch
# e.g.    patches/feeds/luci/modules/luci-mod-network/htdocs/luci-static/
#             resources/tools/100-skip-wireless-bridge-members.patch
#
# The directory mirroring the patched file is only a filing convention; the
# actual target paths live inside the patch and are relative to the feed's
# repository root, which is why every patch is applied with
# `git -C feeds/<feed> apply`.
#
# Idempotent: a patch that is already applied is reported and skipped, so this
# is safe to run on top of a warm feed checkout. Run from the repository root,
# after `./scripts/feeds update -a` / `install -a`.
#
# The patch is fed to git on stdin rather than by path: `git -C <feed> apply`
# resolves a path argument relative to the feed directory, and building an
# absolute one from $PWD is not portable ($PWD is an MSYS path under Git Bash
# on Windows, which the native git.exe cannot open).

set -Eeuo pipefail

if [[ ! -d patches/feeds ]]; then
	echo "No patches/feeds directory, nothing to apply."
	exit 0
fi

applied=0
skipped=0

while IFS= read -r -d '' patch_file; do
	feed_path="${patch_file#patches/feeds/}"
	feed_name="${feed_path%%/*}"
	feed_dir="feeds/$feed_name"

	if [[ ! -d "$feed_dir" ]]; then
		echo "feed directory not found for patch: $patch_file" >&2
		exit 1
	fi

	if git -C "$feed_dir" apply --check < "$patch_file" 2>/dev/null; then
		echo "Applying feed patch: $patch_file"
		git -C "$feed_dir" apply < "$patch_file"
		applied=$((applied + 1))
	elif git -C "$feed_dir" apply --reverse --check < "$patch_file" 2>/dev/null; then
		echo "Feed patch already applied: $patch_file"
		skipped=$((skipped + 1))
	else
		echo "Feed patch does not apply cleanly: $patch_file" >&2
		echo "The feed moved on; rebase the patch before building." >&2
		exit 1
	fi
done < <(find patches/feeds -type f -name '*.patch' -print0 | sort -z)

echo "Feed patches: $applied applied, $skipped already present."
