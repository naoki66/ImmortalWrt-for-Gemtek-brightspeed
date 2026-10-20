#!/usr/bin/env bash

# 写入固件版本 / 文件名 / 默认主机名相关配置项到 .config
#
# 本脚本只修改 .config，不生成也不改写源码树里的其它文件。
#
# 文件名规则（include/image.mk）：
#   IMG_PREFIX = DIST + [VERSION_NUMBER] + [VERSION_CODE] + [EXTRA_IMAGE_NAME] + BOARD-SUBTARGET
# 三段的开关分别是 CONFIG_VERSION_FILENAMES / CONFIG_VERSION_CODE_FILENAMES / CONFIG_EXTRA_IMAGE_NAME，
# 默认只启用 VERSION_NUMBER，保证固件名短且可定位。
#
# 设备型号（VERSION_DIST 后缀与默认主机名）识别顺序：
#   1. 环境变量 VERSION_DIST 整体覆盖；DEVICE_HOSTNAME 单独覆盖主机名；
#   2. CONFIG_TARGET_PROFILE（cp 种子 -> make defconfig 后该行仍在）；
#   3. 唯一的 CONFIG_TARGET_<board>_<subtarget>_DEVICE_<name>=y；
#      同时启用多个设备（multi-profile）时型号不明确，跳过推导；
#   4. 沿用 config 里现有 CONFIG_VERSION_DIST 的设备名后缀
#      （如 "ImmortalWrt naoki66 XG-040G-MD" -> "XG-040G-MD"），
#      保证种子 config 里手写的设备名不会被覆盖成默认的 "ImmortalWrt"。
# 归一化：先剥厂牌前缀（gemtek_/nokia_）与 -ubi 后缀，再查已知设备别名表
# known_device_model；查不到时退化为大写原样输出。新增设备只需在别名表加一行。
#
# 默认主机名（LuCI: 系统 -> 系统 -> 主机名）：
#   写入 CONFIG_TARGET_HOSTNAME，取简约化设备名
#   （XG2010G / XR1710G / XG-040G-MD / XG-040G-TF ...）。
#   该符号由 package/base-files/image-config.in 定义，package/base-files 安装时
#   据此改写 bin/config_generate，首次启动生成 /etc/config/system 即使用该值。
#   留空表示保持内置默认（ImmortalWrt）。
#
# 可用环境变量覆盖：
#   VERSION_DIST            发行版名（默认 "ImmortalWrt naoki66"，若识别到设备型号
#                           则追加，如 "ImmortalWrt naoki66 XG2010G"）
#   DEVICE_HOSTNAME         默认主机名（默认取识别到的设备型号，如 XR1710G）
#   BUILD_TZ                日期时区（默认 Asia/Shanghai）
#   BUILD_DATE / BUILD_TIME 构建日期 YYYYMMDD（默认取当前时间）
#   REPO_COMMIT / UPSTREAM_COMMIT / BUILD_ID  手动指定 commit / 构建号
#   COMMIT_LEN              commit 缩写长度（默认 8）
#   VERSION_NUMBER / VERSION_CODE / EXTRA_IMAGE_NAME  手动指定各段
#   VERSION_FILENAMES       是否把版本号放进文件名（默认 y）
#   VERSION_CODE_FILENAMES  是否把 revision 放进文件名（默认 空 = 不放）

set -euo pipefail

config_file="${1:-.config}"

# 已知设备别名表：profile 设备名（已剥厂牌前缀与 -ubi 后缀）-> 对外显示的设备型号。
# 例：gemtek_xg2010g-ubi -> XG2010G；nokia_xg-040g-md-ubi -> XG-040G-MD
known_device_model() {
	case "$1" in
		xg2010g)    printf 'XG2010G' ;;
		xg2010g-2g) printf 'XG2010G-2G' ;;
		xr1710g)    printf 'XR1710G' ;;
		xg-040g-md) printf 'XG-040G-MD' ;;
		xg-040g-tf) printf 'XG-040G-TF' ;;
		xg-040g-mf) printf 'XG-040G-MF' ;;
		*) return 1 ;;
	esac
}

# 归一化设备名：剥厂牌前缀（gemtek_/nokia_）与 -ubi 后缀，再查别名表；
# 别名表没有时退化为大写原样输出，兼容后续新增设备。
normalize_device_model() {
	local slug="$1"
	slug="${slug#gemtek_}"
	slug="${slug#nokia_}"
	slug="${slug%-ubi}"
	known_device_model "$slug" && return 0
	[ -n "$slug" ] || return 1
	printf '%s' "$slug" | tr '[:lower:]' '[:upper:]'
}

# 从 config 现有的 CONFIG_VERSION_DIST 提取设备名后缀：
# "ImmortalWrt naoki66 XG-040G-MD" -> "XG-040G-MD"；只有发行版名时返回失败。
detect_model_from_dist() {
	local dist rest
	dist="$(sed -n -e 's/^CONFIG_VERSION_DIST="\(.*\)"$/\1/p' "$config_file" | head -n 1)"
	[ -n "$dist" ] || return 1
	rest="${dist#ImmortalWrt}"
	rest="${rest# naoki66}"
	rest="${rest# }"
	[ -n "$rest" ] || return 1
	printf '%s' "$rest"
}

# 推导设备型号：先看 CONFIG_TARGET_PROFILE，没有再看唯一的 DEVICE_* 选择。
detect_device_model() {
	local profile devices device_count
	profile="$(sed -n -e 's/^CONFIG_TARGET_PROFILE="\(.*\)"$/\1/p' "$config_file" | head -n 1)"
	[ -n "$profile" ] || profile="$(sed -n -e 's/^CONFIG_TARGET_PROFILE=\(.*\)$/\1/p' "$config_file" | head -n 1)"
	if [[ "$profile" =~ DEVICE_([A-Za-z0-9_+-]+) ]]; then
		normalize_device_model "${BASH_REMATCH[1]}"
		return
	fi
	devices="$(sed -n -e 's/^CONFIG_TARGET_[A-Za-z0-9_]*_DEVICE_\([A-Za-z0-9_+-]*\)=y$/DEVICE_\1/p' "$config_file")"
	device_count="$(printf '%s\n' "$devices" | grep -c . || true)"
	# 多设备（multi-profile）构建时型号不明确，不猜
	[ "$device_count" = "1" ] || return 1
	[[ "$devices" =~ DEVICE_([A-Za-z0-9_+-]+) ]] || return 1
	normalize_device_model "${BASH_REMATCH[1]}"
}

device_model="$(detect_device_model || true)"
# profile 推导不到时，沿用 config 里已有的设备名后缀，防止被覆盖丢失
[ -n "$device_model" ] || device_model="$(detect_model_from_dist || true)"
version_dist="${VERSION_DIST:-ImmortalWrt naoki66${device_model:+ $device_model}}"
# 默认主机名沿用简约化设备名；空格/下划线转连字符，剔除非法字符（主机名只允许 ASCII）
hostname="${DEVICE_HOSTNAME:-$device_model}"
hostname="$(printf '%s' "$hostname" | tr ' _' '--' | tr -cd 'A-Za-z0-9.-')"
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
	-e '/^CONFIG_TARGET_HOSTNAME=/d' \
	-e '/^# CONFIG_TARGET_HOSTNAME is not set$/d' \
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
CONFIG_TARGET_HOSTNAME="$(escape_config_string "$hostname")"
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
echo "Configured default hostname: ${hostname:-(unchanged)}"
echo "Configured image name prefix: ${img_prefix}"
