#!/usr/bin/env bash
#
# Keep the source-package links under package/feeds/ pointing at the feed this
# repository intends to build from, before the package metadata is scanned.
#
# feeds/packages and feeds/helloworld both provide a source package named
# xray-core. ./scripts/feeds install -a walks the feeds in feeds.conf.default
# order and keeps the first provider it sees -- packages -- so the helloworld
# build, the only one carrying the AN7581 EIP93 overlay, never reaches the
# image even though luci-app-passwall's INCLUDE_Xray selects xray-core.
#
# ./scripts/feeds install installs a source package as a symlink
# package/feeds/<feed>/<package> -> ../../../feeds/<feed>/<package>. This
# script deletes the links of the non-preferred providers and recreates the
# preferred one. That is also what makes the feeds script keep the preferred
# provider on later runs: its install command starts with get_installed(),
# which runs `make prepare-tmpinfo` and reads tmp/.packageinfo to learn what is
# already installed. include/feed-patches.mk hooks this script in front of that
# scan, so the preferred link is in place before the install loop decides.
#
# Idempotent. A missing preferred feed is skipped with a warning rather than
# failing: on a fresh checkout this runs before ./scripts/feeds update -a has
# fetched the feeds. Set FEED_PATCHES_STRICT=1 (CI and
# scripts/remote-build-worker.sh do) to turn that into a failure.

set -Eeuo pipefail

# Resolve the repository root from this script's own location, like
# scripts/apply-feed-patches.sh: everything below is relative to it.
cd "$(cd "$(dirname "$0")" && pwd)/.." || exit 1

# <feed>:<package> pairs that must be provided by the named feed.
preferred=(
	helloworld:xray-core
)

removed=0
selected=0
kept=0
absent=0

for entry in "${preferred[@]}"; do
	feed="${entry%%:*}"
	pkg="${entry#*:}"
	src_path="feeds/$feed/$pkg"

	if [[ ! -f "$src_path/Makefile" ]]; then
		echo "Feed provider skipped, '$src_path' is not present" >&2
		echo "  -> run './scripts/feeds update -a' first" >&2
		if [[ "${FEED_PATCHES_STRICT:-0}" == "1" ]]; then
			exit 1
		fi
		absent=$((absent + 1))
		continue
	fi

	want="../../../$src_path"
	dest="package/feeds/$feed/$pkg"

	# Drop every other feed's link for this package: with two source packages
	# of the same name in the tree, the metadata scan sees both and whichever
	# one feeds install -a happens to keep next time wins.
	for link in package/feeds/*/"$pkg"; do
		[[ -e "$link" || -L "$link" ]] || continue
		[[ "$link" == "$dest" ]] && continue
		if [[ ! -L "$link" ]]; then
			echo "Refusing to remove '$link': it is not a feed symlink" >&2
			exit 1
		fi
		rm -f "$link"
		echo "Removed feed provider link: $link"
		removed=$((removed + 1))
	done

	if [[ -L "$dest" && "$(readlink "$dest")" == "$want" ]]; then
		kept=$((kept + 1))
		continue
	fi

	if [[ -e "$dest" && ! -L "$dest" ]]; then
		echo "Refusing to replace '$dest': it is not a symlink" >&2
		exit 1
	fi

	mkdir -p "package/feeds/$feed"
	ln -sfn "$want" "$dest"
	echo "Selected feed provider: $dest -> $want"
	selected=$((selected + 1))
done

echo "Feed providers: $selected selected, $removed removed, $kept already correct, $absent skipped (feed absent)."
