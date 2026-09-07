#!/usr/bin/env bash

set -euo pipefail

config_file="${1:-.config}"
version_dist="${VERSION_DIST:-ImmortalWrt naoki66}"
build_tz="${BUILD_TZ:-Asia/Shanghai}"

if [[ ! -f "$config_file" ]]; then
	echo "config file not found: $config_file" >&2
	exit 1
fi

build_date="${BUILD_DATE:-}"
if [[ -z "$build_date" && -n "${BUILD_TIME:-}" ]]; then
	build_date="${BUILD_TIME%%-*}"
fi
if [[ -z "$build_date" ]]; then
	build_date="$(TZ="$build_tz" date +'%Y%m%d')"
fi

repo_commit="${REPO_COMMIT:-}"
if [[ -z "$repo_commit" ]]; then
	repo_commit="$(git rev-parse --short=10 HEAD 2>/dev/null || true)"
fi
repo_commit="${repo_commit:-unknown}"

upstream_commit="${UPSTREAM_COMMIT:-}"
if [[ -z "$upstream_commit" ]] && git rev-parse --verify upstream/master >/dev/null 2>&1; then
	upstream_base="$(git merge-base HEAD upstream/master 2>/dev/null || true)"
	if [[ -n "$upstream_base" ]]; then
		upstream_commit="$(git rev-parse --short=10 "$upstream_base" 2>/dev/null || true)"
	fi
fi
upstream_commit="${upstream_commit:-unknown}"

build_id="${BUILD_ID:-${build_date}-${repo_commit}-${upstream_commit}}"
version_number="${VERSION_NUMBER:-${build_id}}"
version_code="${VERSION_CODE:-${repo_commit}-${upstream_commit}}"
extra_image_name="${EXTRA_IMAGE_NAME:-${build_id}}"

escape_config_string() {
	printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

tmp_file="${config_file}.version.$$"
trap 'rm -f "$tmp_file"' EXIT

sed -e '/^CONFIG_IMAGEOPT=/d' \
	-e '/^# CONFIG_IMAGEOPT is not set$/d' \
	-e '/^CONFIG_EXTRA_IMAGE_NAME=/d' \
	-e '/^# CONFIG_EXTRA_IMAGE_NAME is not set$/d' \
	-e '/^CONFIG_VERSIONOPT=/d' \
	-e '/^# CONFIG_VERSIONOPT is not set$/d' \
	-e '/^CONFIG_VERSION_DIST=/d' \
	-e '/^# CONFIG_VERSION_DIST is not set$/d' \
	-e '/^CONFIG_VERSION_NUMBER=/d' \
	-e '/^# CONFIG_VERSION_NUMBER is not set$/d' \
	-e '/^CONFIG_VERSION_CODE=/d' \
	-e '/^# CONFIG_VERSION_CODE is not set$/d' \
	"$config_file" > "$tmp_file"

cat >> "$tmp_file" <<EOF
CONFIG_IMAGEOPT=y
CONFIG_EXTRA_IMAGE_NAME="$(escape_config_string "$extra_image_name")"
CONFIG_VERSIONOPT=y
CONFIG_VERSION_DIST="$(escape_config_string "$version_dist")"
CONFIG_VERSION_NUMBER="$(escape_config_string "$version_number")"
CONFIG_VERSION_CODE="$(escape_config_string "$version_code")"
EOF

mv "$tmp_file" "$config_file"
trap - EXIT

echo "Configured firmware version: ${version_dist} ${version_number}"
echo "Configured firmware revision: ${version_code}"
echo "Configured firmware image suffix: ${extra_image_name}"
