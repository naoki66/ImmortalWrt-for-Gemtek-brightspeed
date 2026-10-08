#!/usr/bin/env bash

set -Eeuo pipefail

usage() {
	cat >&2 <<'EOF'
usage: check-firmware-artifacts.sh --config <file> --directory <target-dir>
EOF
	exit 2
}

config_file=""
target_dir=""

while (( $# > 0 )); do
	case "$1" in
		--config)
			(( $# >= 2 )) || usage
			config_file="$2"
			shift 2
			;;
		--directory)
			(( $# >= 2 )) || usage
			target_dir="$2"
			shift 2
			;;
		*)
			usage
			;;
	esac
done

[[ -f "$config_file" && -d "$target_dir" ]] || usage

devices=()
while IFS= read -r symbol; do
	symbol="${symbol%=y}"
	devices+=("${symbol##*_DEVICE_}")
done < <(
	grep -E '^CONFIG_(TARGET_airoha_an7581_DEVICE|TARGET_DEVICE_airoha_an7581_DEVICE)_gemtek_(xr1710g(-ubi)?|xg2010g(-2g)?-ubi)=y$' \
		"$config_file" || true
)

(( ${#devices[@]} > 0 )) || {
	echo "no supported Gemtek firmware profile is selected in $config_file" >&2
	exit 1
}

failed=0
for device in "${devices[@]}"; do
	image="$(find "$target_dir" -maxdepth 1 -type f \
		-name "*-${device}-squashfs-sysupgrade.itb" -size +0c -print -quit)"
	if [[ -z "$image" ]]; then
		echo "missing sysupgrade ITB for selected device $device in $target_dir" >&2
		failed=1
	else
		echo "Firmware artifact verified: $image"
	fi
done

(( failed == 0 )) || exit 1
