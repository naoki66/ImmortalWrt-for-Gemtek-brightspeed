#!/usr/bin/env bash
#
# Keep the source-package links under package/feeds/ pointing at the feed this
# repository intends to build from, before the package metadata is scanned.
#
# feeds/packages and feeds/helloworld ship source packages with the same names
# (xray-core, v2ray-core, mosdns, chinadns-ng, hysteria, naiveproxy,
# shadowsocks-rust, ...). The helloworld copies are the maintained variants --
# xray-core there is the only one carrying the AN7581 EIP93 AES-GCM overlay --
# but ./scripts/feeds install -a walks the feeds in feeds.conf.default order and
# keeps the first provider it sees, so the packages copy wins and the helloworld
# one never reaches the image.
#
# ./scripts/feeds install installs a source package as a symlink
# package/feeds/<feed>/<package> -> ../../../feeds/<feed>/<package>. This
# script links every source package of each preferred feed and deletes the links
# of the other providers with the same name. That is also what makes the feeds
# script keep the preferred provider on later runs: its install command starts
# with get_installed(), which runs `make prepare-tmpinfo` and reads
# tmp/.packageinfo to learn what is already installed. include/feed-patches.mk
# hooks this script in front of that scan, so the preferred links are in place
# before the install loop decides.
#
# Linking a package does not build it; only the configuration selects packages,
# exactly like `./scripts/feeds install -a` does for a whole feed.
#
# Idempotent. A missing preferred feed is skipped with a warning rather than
# failing: on a fresh checkout this runs before ./scripts/feeds update -a has
# fetched the feeds. Set FEED_PATCHES_STRICT=1 (CI and
# scripts/remote-build-worker.sh do) to turn that into a failure.

set -Eeuo pipefail

# Resolve the repository root from this script's own location, like
# scripts/apply-feed-patches.sh: everything below is relative to it.
cd "$(cd "$(dirname "$0")" && pwd)/.." || exit 1

# Feeds whose source packages must win over the same-named packages of every
# other feed.
preferred_feeds=(
	helloworld
)

# Packages that a preferred feed also ships but that must keep the other
# provider. upx is a build helper rather than one of the patched proxy packages,
# and the helloworld copy is a newer upstream release whose source tarball is
# not vendored in dl/; the packages copy is the host upx the builds already use.
excluded=(
	upx
)

removed=0
selected=0
kept=0
absent=0
excluded_count=0

for feed in "${preferred_feeds[@]}"; do
	feed_dir="feeds/$feed"

	if [[ ! -d "$feed_dir" ]]; then
		echo "Feed provider skipped, '$feed_dir' is not present" >&2
		echo "  -> run './scripts/feeds update -a' first" >&2
		if [[ "${FEED_PATCHES_STRICT:-0}" == "1" ]]; then
			exit 1
		fi
		absent=$((absent + 1))
		continue
	fi

	# A directory with a Makefile is a source package of the feed.
	for makefile in "$feed_dir"/*/Makefile; do
		[[ -f "$makefile" ]] || continue

		pkg="${makefile%/Makefile}"
		pkg="${pkg##*/}"

		if [[ " ${excluded[*]} " == *" $pkg "* ]]; then
			excluded_count=$((excluded_count + 1))
			continue
		fi

		src_path="$feed_dir/$pkg"
		want="../../../$src_path"
		dest="package/feeds/$feed/$pkg"

		# Drop every other feed's link for this package: with two source
		# packages of the same name in the tree, the metadata scan sees both
		# and whichever one feeds install -a happens to keep next time wins.
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
done

echo "Feed providers: $selected selected, $removed removed, $kept already correct, $excluded_count excluded, $absent skipped (feed absent)."
