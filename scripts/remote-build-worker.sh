#!/usr/bin/env bash

set -Eeuo pipefail

if (( $# != 4 )); then
	echo "usage: $0 <kernel|world> <jobs> <refresh-feeds:0|1> <log-file>" >&2
	exit 2
fi

mode="$1"
jobs="$2"
refresh_feeds="$3"
log_file="$4"

case "$mode" in
	kernel|world) ;;
	*)
		echo "unsupported build mode: $mode" >&2
		exit 2
		;;
esac

if [[ ! "$jobs" =~ ^[1-9][0-9]*$ ]]; then
	echo "jobs must be a positive integer" >&2
	exit 2
fi

if [[ "$refresh_feeds" != "0" && "$refresh_feeds" != "1" ]]; then
	echo "refresh-feeds must be 0 or 1" >&2
	exit 2
fi

mkdir -p "$(dirname "$log_file")"

run_build() {
	echo "REMOTE_BUILD_MODE=$mode"
	echo "REMOTE_BUILD_COMMIT=$(git rev-parse HEAD)"
	echo "REMOTE_BUILD_STARTED=$(date --iso-8601=seconds)"
	echo "REMOTE_BUILD_JOBS=$jobs"

if [[ "$refresh_feeds" == "1" ]]; then
		./scripts/feeds update -a
		./scripts/feeds install -a
	fi

apply_feed_patches() {
	local patch_file feed_path feed_name feed_dir

	[[ -d patches/feeds ]] || return 0

	while IFS= read -r -d '' patch_file; do
		feed_path="${patch_file#patches/feeds/}"
		feed_name="${feed_path%%/*}"
		feed_dir="feeds/$feed_name"
		patch_path="$PWD/$patch_file"

		if [[ ! -d "$feed_dir" ]]; then
			echo "feed directory not found for patch: $patch_file" >&2
			return 1
		fi

		if git -C "$feed_dir" apply --check "$patch_path" 2>/dev/null; then
			echo "Applying feed patch: $patch_file"
			git -C "$feed_dir" apply "$patch_path"
		elif git -C "$feed_dir" apply --reverse --check "$patch_path" 2>/dev/null; then
			echo "Feed patch already applied: $patch_file"
		else
			echo "Feed patch does not apply cleanly: $patch_file" >&2
			return 1
		fi
	done < <(find patches/feeds -type f -name '*.patch' -print0 | sort -z)
}

apply_feed_patches

	cp config.seed .config
	make defconfig

	case "$mode" in
		kernel)
			make target/linux/clean
			make -j"$jobs" target/linux/compile V=s
			;;
		world)
			if [[ -d bin/targets/airoha/an7581 ]]; then
				find bin/targets/airoha/an7581 -mindepth 1 -delete
			fi
			make download -j"$jobs"
			make -j"$jobs" world
			;;
	esac

	echo "REMOTE_BUILD_FINISHED=$(date --iso-8601=seconds)"
	if [[ "$mode" == "world" && -d bin/targets/airoha/an7581 ]]; then
		find bin/targets/airoha/an7581 -maxdepth 1 -type f -printf 'ARTIFACT=%p\n'
	fi
}

run_build 2>&1 | tee "$log_file"
echo "REMOTE_BUILD_STATUS=success"
echo "REMOTE_BUILD_LOG=$log_file"
