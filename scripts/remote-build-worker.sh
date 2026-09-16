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
config_seed="${CONFIG_SEED:-1710.config}"

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
	echo "REMOTE_BUILD_CONFIG_SEED=$config_seed"

	if [[ ! -f "$config_seed" ]]; then
		echo "config seed not found: $config_seed" >&2
		exit 2
	fi

	if [[ "$refresh_feeds" == "1" ]]; then
		./scripts/feeds update -a
		./scripts/feeds install -a
	fi

	FEED_PATCHES_STRICT=1 bash scripts/apply-feed-patches.sh

	bash scripts/fix-stale-golang-host.sh

	cp "$config_seed" .config
	bash scripts/set-build-version.sh .config
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

set +e
run_build 2>&1 | tee "$log_file"
build_status=${PIPESTATUS[0]}
set -e

if (( build_status != 0 )); then
	bash scripts/summarize-build-errors.sh "$log_file" || true
	echo "REMOTE_BUILD_STATUS=failed"
	echo "REMOTE_BUILD_LOG=$log_file"
	exit "$build_status"
fi

echo "REMOTE_BUILD_STATUS=success"
echo "REMOTE_BUILD_LOG=$log_file"
