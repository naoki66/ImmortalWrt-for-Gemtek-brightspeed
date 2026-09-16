#!/usr/bin/env bash

# 写入固件版本/文件名相关配置项到 .config
#
# 文件名规则（include/image.mk）：
#   IMG_PREFIX = DIST + [VERSION_NUMBER] + [VERSION_CODE] + [EXTRA_IMAGE_NAME] + BOARD-SUBTARGET
# 三段的开关分别是 CONFIG_VERSION_FILENAMES / CONFIG_VERSION_CODE_FILENAMES / CONFIG_EXTRA_IMAGE_NAME，
# 默认只启用 VERSION_NUMBER，保证固件名短且可定位。
#
# 可用环境变量覆盖：
#   VERSION_DIST            发行版名（默认 "ImmortalWrt naoki66"）
#   BUILD_TZ                日期时区（默认 Asia/Shanghai）
#   BUILD_DATE / BUILD_TIME 构建日期 YYYYMMDD（默认取当前时间）
#   REPO_COMMIT / UPSTREAM_COMMIT / BUILD_ID  手动指定 commit / 构建号
#   COMMIT_LEN              commit 缩写长度（默认 8）
#   VERSION_NUMBER / VERSION_CODE / EXTRA_IMAGE_NAME  手动指定各段
#   VERSION_FILENAMES       是否把版本号放进文件名（默认 y）
#   VERSION_CODE_FILENAMES  是否把 revision 放进文件名（默认 空 = 不放）

set -euo pipefail

config_file="${1:-.config}"
version_dist="${VERSION_DIST:-ImmortalWrt naoki66}"
build_tz="${BUILD_TZ:-Asia/Shanghai}"
commit_len="${COMMIT_LEN:-8}"
version_filenames="${VERSION_FILENAMES:-y}"
version_code_filenames="${VERSION_CODE_FILENAMES:-}"

if [[ ! -f "$config_file" ]]; then
	echo "config file not found: $config_file" >&2
	exit 1
fi

is_true() {
	case "${1:-}" in
		1|y|Y|yes|YES|true|TRUE|on|ON) return 0 ;;
		*) return 1 ;;
	esac
}

# 复刻 include/version.mk 的 sanitize：转小写，空格与下划线转连字符
sanitize() {
	printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | tr ' _' '--'
}

config_get_string() {
	sed -n -e "s/^$1=\"\(.*\)\"$/\1/p" "$config_file" | head -n 1
}

build_date="${BUILD_DATE:-}"
if [[ -z "$build_date" && -n "${BUILD_TIME:-}" ]]; then
	build_date="${BUILD_TIME%%-*}"
fi
if [[ -z "$build_date" ]]; then
	build_date="$(TZ="$build_tz" date +'%Y%m%d')"
fi

repo_commit="${REPO_COMMIT:-}"
if [[ -z "$repo_commit" ]]; then
	repo_commit="$(git rev-parse --short="$commit_len" HEAD 2>/dev/null || true)"
fi
repo_commit="${repo_commit:-unknown}"

upstream_commit="${UPSTREAM_COMMIT:-}"
if [[ -z "$upstream_commit" ]] && git rev-parse --verify upstream/master >/dev/null 2>&1; then
	upstream_base="$(git merge-base HEAD upstream/master 2>/dev/null || true)"
	if [[ -n "$upstream_base" ]]; then
		upstream_commit="$(git rev-parse --short="$commit_len" "$upstream_base" 2>/dev/null || true)"
	fi
fi
upstream_commit="${upstream_commit:-unknown}"

# 完整构建号只落在 VERSION_CODE（进 /etc/openwrt_release、image info，不进文件名）
build_id="${BUILD_ID:-${build_date}-${repo_commit}-${upstream_commit}}"
# 文件名里只保留 “日期-本机 commit”
version_number="${VERSION_NUMBER:-${build_date}-${repo_commit}}"
version_code="${VERSION_CODE:-${build_id}}"
extra_image_name="${EXTRA_IMAGE_NAME:-}"

if is_true "$version_filenames"; then
	cfg_version_filenames='CONFIG_VERSION_FILENAMES=y'
else
	cfg_version_filenames='# CONFIG_VERSION_FILENAMES is not set'
fi

if is_true "$version_code_filenames"; then
	cfg_version_code_filenames='CONFIG_VERSION_CODE_FILENAMES=y'
else
	cfg_version_code_filenames='# CONFIG_VERSION_CODE_FILENAMES is not set'
fi

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
	-e '/^CONFIG_VERSION_FILENAMES=/d' \
	-e '/^# CONFIG_VERSION_FILENAMES is not set$/d' \
	-e '/^CONFIG_VERSION_CODE_FILENAMES=/d' \
	-e '/^# CONFIG_VERSION_CODE_FILENAMES is not set$/d' \
	"$config_file" > "$tmp_file"

cat >> "$tmp_file" <<EOF
CONFIG_IMAGEOPT=y
CONFIG_EXTRA_IMAGE_NAME="$(escape_config_string "$extra_image_name")"
CONFIG_VERSIONOPT=y
CONFIG_VERSION_DIST="$(escape_config_string "$version_dist")"
CONFIG_VERSION_NUMBER="$(escape_config_string "$version_number")"
CONFIG_VERSION_CODE="$(escape_config_string "$version_code")"
$cfg_version_filenames
$cfg_version_code_filenames
EOF

mv "$tmp_file" "$config_file"
trap - EXIT

img_prefix="$(sanitize "$version_dist")"
if is_true "$version_filenames"; then
	img_prefix="${img_prefix}-$(sanitize "$version_number")"
fi
if is_true "$version_code_filenames"; then
	img_prefix="${img_prefix}-$(sanitize "$version_code")"
fi
if [[ -n "$extra_image_name" ]]; then
	img_prefix="${img_prefix}-$(sanitize "$extra_image_name")"
fi
board="$(config_get_string CONFIG_TARGET_BOARD)"
subtarget="$(config_get_string CONFIG_TARGET_SUBTARGET)"
if [[ -n "$board" ]]; then
	img_prefix="${img_prefix}-${board}"
fi
if [[ -n "$subtarget" ]]; then
	img_prefix="${img_prefix}-${subtarget}"
fi

echo "Configured firmware version: ${version_dist} ${version_number}"
echo "Configured firmware revision: ${version_code}"
echo "Configured image name prefix: ${img_prefix}"
