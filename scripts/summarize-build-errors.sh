#!/usr/bin/env bash

set -Eeuo pipefail

log_file="${1:-build.log}"

if [[ ! -f "$log_file" ]]; then
	echo "Build log not found: $log_file" >&2
	exit 1
fi

clean_log() {
	sed -E $'s/\x1B\\[[0-9;]*[[:alpha:]]//g; s/\r$//' "$log_file"
}

first_error_line="$(
	clean_log |
		awk '/(^|[[:space:]])(ERROR:|FAILED:|Error [0-9]+|错误 [0-9]+|fatal error:|undefined reference|No rule to make target|failed to build|recipe for target|go: .*requires go)|make\[[0-9]+\]: \*\*\*/ && !found { print NR; found = 1 }'
)"

echo "=== Build error summary ==="

if [[ -z "$first_error_line" ]]; then
	echo "No common error markers found in $log_file"
	echo "Last 80 log lines:"
	clean_log | tail -80
	exit 0
fi

echo "First matching error context around line $first_error_line:"
	start=$(( first_error_line > 25 ? first_error_line - 25 : 1 ))
	end=$(( first_error_line + 45 ))
	clean_log | sed -n "${start},${end}p"

echo
echo "Last matching error lines:"
clean_log |
	awk '/(^|[[:space:]])(ERROR:|FAILED:|Error [0-9]+|错误 [0-9]+|fatal error:|undefined reference|No rule to make target|failed to build|recipe for target|go: .*requires go)|make\[[0-9]+\]: \*\*\*/ { print NR ":" $0 }' |
	tail -20
