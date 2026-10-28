# SPDX-License-Identifier: GPL-2.0-only
#
# Repository-local build hook: apply the patches kept under patches/feeds/ to
# the feed checkouts before anything reads them.
#
# Hooked onto prepare-tmpinfo, deliberately not onto prereq or onto the
# include/prepare.mk mechanism OpenWrt already ships:
#
#   - prepare-tmpinfo is what actually scans package metadata
#     (include/scan.mk -> tmp/.packageinfo, tmp/.targetinfo), so the patches
#     must be in place before it runs. Applying them afterwards would leave the
#     scanned metadata and the package hashes describing unpatched sources.
#
#   - It carries a FORCE dependency, so it runs on every make invocation. That
#     is required here, because `./scripts/feeds update -a` resets the feed
#     checkouts and throws the patches away again. include/prepare.mk runs only
#     once -- when staging_dir/host/.prereq-build is first created -- so a feed
#     refresh would slip straight past it.
#
# The script is idempotent (an already-patched feed reports "already applied"
# and is skipped), so the steady-state cost is one `git apply --check` per
# patch file.
#
# A feed that has not been fetched yet is skipped with a warning, not an error:
# this target runs *before* prepare-tmpinfo's own recipe, which is what creates
# feeds/ in the first place, so on a fresh checkout the feed is legitimately
# absent and the patched package is not in the tree either. Failing here would
# break `make menuconfig` on a clean tree. The CI and remote-build-worker
# entry points, which always fetch feeds first, export FEED_PATCHES_STRICT=1 to
# get the opposite behaviour: a missing feed there means the feed layout moved
# and the patch would silently stop being applied.
#
# The same hook also normalizes the feed provider links under package/feeds/.
# feeds/packages and feeds/helloworld ship source packages with the same names
# (xray-core, v2ray-core, mosdns, ...), and ./scripts/feeds install -a keeps
# whichever feed comes first in feeds.conf.default -- packages -- dropping the
# helloworld builds that carry the AN7581 EIP93 overlay and the other local
# changes. scripts/select-feed-providers.sh removes the packages links and
# recreates the helloworld ones. It belongs here for the same
# reason as the patches, plus one of its own: `./scripts/feeds install` starts
# with get_installed(), which runs `make prepare-tmpinfo` to learn what is
# already installed, so the link has to be correct before that scan or the
# install loop re-creates the packages link first.
#
# Invoked through bash on purpose: the scripts are committed as 100644, like
# the other scripts/*.sh in this tree, so they carry no executable bit.

.PHONY: feed-patches feed-providers

feed-patches:
	@bash $(TOPDIR)/scripts/apply-feed-patches.sh

feed-providers:
	@bash $(TOPDIR)/scripts/select-feed-providers.sh

prepare-tmpinfo: feed-patches feed-providers
