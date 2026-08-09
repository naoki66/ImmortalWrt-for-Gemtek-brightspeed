#!/usr/bin/env bash

set -Eeuo pipefail

if (( $# != 6 )); then
	echo "usage: $0 <repo> <snapshot-ref> <upload|kernel|world> <jobs> <refresh-feeds:0|1> <log-file>" >&2
	exit 2
fi

repo="$1"
snapshot_ref="$2"
mode="$3"
jobs="$4"
refresh_feeds="$5"
log_file="$6"

case "$mode" in
	upload|kernel|world) ;;
	*)
		echo "unsupported remote-build mode: $mode" >&2
		exit 2
		;;
esac

cd "$repo"
lock_file="$(git rev-parse --git-path codex-remote-build.lock)"
exec 9>"$lock_file"
if ! flock -n 9; then
	echo "another remote build is already using $repo" >&2
	exit 75
fi

blocking_change=0
while IFS= read -r -d '' entry; do
	status="${entry:0:2}"
	path="${entry:3}"

	case "$path" in
		.config|.config.old)
			continue
			;;
	esac

	# Some repository blobs violate their eol attributes. Treat them as clean
	# only when their raw bytes and executable bit exactly match the index.
	if [[ "$status" == " M" && -f "$path" ]]; then
		index_entry="$(git ls-files --stage -- "$path")"
		read -r index_mode index_hash _ <<< "$index_entry"
		work_hash="$(git hash-object --no-filters -- "$path")"
		if [[ "$work_hash" == "$index_hash" ]]; then
			if [[ "$index_mode" == "100644" && ! -x "$path" ]]; then
				continue
			fi
			if [[ "$index_mode" == "100755" && -x "$path" ]]; then
				continue
			fi
		fi
	fi

	printf 'remote checkout has a blocking change: %q\n' "$entry" >&2
	blocking_change=1
done < <(git -c core.quotePath=false status --porcelain=v1 -z --untracked-files=normal)

if (( blocking_change != 0 )); then
	echo "save or remove the remote-only changes, then run remote-build again" >&2
	exit 3
fi

git checkout --detach --force "$snapshot_ref"
git update-ref -d "$snapshot_ref"

if [[ "$mode" == "upload" ]]; then
	echo "REMOTE_BUILD_STATUS=uploaded"
	echo "REMOTE_BUILD_COMMIT=$(git rev-parse HEAD)"
	exit 0
fi

bash scripts/remote-build-worker.sh "$mode" "$jobs" "$refresh_feeds" "$log_file"
