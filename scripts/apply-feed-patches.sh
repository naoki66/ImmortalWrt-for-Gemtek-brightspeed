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
# is safe to run on top of a warm feed checkout. Run it after
# `./scripts/feeds update -a` / `install -a`; include/feed-patches.mk hooks it
# into every make invocation, so a normal build does this automatically.
#
# A feed that has not been fetched yet is skipped with a warning rather than
# treated as an error, because the patched package is not in the tree either.
# Set FEED_PATCHES_STRICT=1 to turn that into a failure.
#
# The patch is fed to git on stdin rather than by path: `git -C <feed> apply`
# resolves a path argument relative to the feed directory, and building an
# absolute one from $PWD is not portable ($PWD is an MSYS path under Git Bash
# on Windows, which the native git.exe cannot open).

set -Eeuo pipefail

# Resolve the repository root from this script's own location: the build hook
# calls us by absolute path, and everything below (patches/feeds, feeds/<feed>)
# is relative to the repository root.
cd "$(cd "$(dirname "$0")" && pwd)/.." || exit 1

if [[ ! -d patches/feeds ]]; then
	echo "No patches/feeds directory, nothing to apply."
	exit 0
fi

applied=0
skipped=0
absent=0

while IFS= read -r -d '' patch_file; do
	feed_path="${patch_file#patches/feeds/}"
	feed_name="${feed_path%%/*}"
	feed_dir="feeds/$feed_name"

	# A feed that has not been fetched yet is not a build error: the patched
	# package is not in the tree either, so there is nothing to patch. This
	# happens on a fresh checkout, where this script (a prerequisite of
	# prepare-tmpinfo) runs before prepare-tmpinfo's own recipe creates feeds/.
	# Fail loudly only when CI asks for strictness, or when a feed that *is*
	# present refuses the patch -- that one means real breakage.
	if [[ ! -d "$feed_dir" ]]; then
		echo "Feed patch skipped, feed '$feed_name' is not present: $patch_file" >&2
		echo "  -> run './scripts/feeds update -a && ./scripts/feeds install -a' first" >&2
		if [[ "${FEED_PATCHES_STRICT:-0}" == "1" ]]; then
			exit 1
		fi
		absent=$((absent + 1))
		continue
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

echo "Feed patches: $applied applied, $skipped already present, $absent skipped (feed absent)."
