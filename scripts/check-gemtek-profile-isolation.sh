#!/usr/bin/env bash

set -Eeuo pipefail

usage() {
	cat >&2 <<'EOF'
usage: check-gemtek-profile-isolation.sh --config <file> [--kernel-config <file>] [--manifest <file> ...]
EOF
	exit 2
}

config_file=""
kernel_config=""
manifests=()

while (( $# > 0 )); do
	case "$1" in
		--config)
			(( $# >= 2 )) || usage
			config_file="$2"
			shift 2
			;;
		--kernel-config)
			(( $# >= 2 )) || usage
			kernel_config="$2"
			shift 2
			;;
		--manifest)
			(( $# >= 2 )) || usage
			manifests+=("$2")
			shift 2
			;;
		*)
			usage
			;;
	esac
done

[[ -n "$config_file" && -f "$config_file" ]] || usage
[[ -z "$kernel_config" || -f "$kernel_config" ]] || {
	echo "kernel config not found: $kernel_config" >&2
	exit 1
}
for manifest in "${manifests[@]}"; do
	[[ -f "$manifest" ]] || {
		echo "manifest not found: $manifest" >&2
		exit 1
	}
done

if grep -Eq '^CONFIG_(TARGET_airoha_an7581_DEVICE|TARGET_DEVICE_airoha_an7581_DEVICE)_gemtek_xr1710g(-ubi)?=y$' "$config_file"; then
	profile="xr1710g"
	forbidden_packages='(airoha-pon(firmware|manager)|airoha-ponctl|airoha-pond|luci-app-(pon|onu)|kmod-airoha-(xpon-en757x|pon-plugins|pon-dataplane|xpon-igmp|gpon-igmp|en7572|xpon|tod|en7581-pcm-spi))'
	forbidden_build_config=""
	required_packages=(
		airoha-an7581-mt7996-board
		airoha-en7581-mt7996-npu-firmware
		kmod-mt7996-firmware
		kmod-mt7996e
	)
	manifest_required_packages=("${required_packages[@]}")
	forbidden_kernel='CONFIG_(AIROHA_PON_COMPAT|PTP_1588_CLOCK_AIROHA_TOD)=(y|m)'
	required_kernel='CONFIG_NET_AIROHA_NPU=y'
elif grep -Eq '^CONFIG_(TARGET_airoha_an7581_DEVICE|TARGET_DEVICE_airoha_an7581_DEVICE)_gemtek_xg2010g(-2g)?-ubi=y$' "$config_file"; then
	profile="xg2010g"
	forbidden_packages='(airoha-an7581-mt7996-board|airoha-en7581-mt7996-npu-firmware|hostapd.*|iw|iw-full|iwinfo|kmod-(mac80211.*|mt76.*|mt7996.*)|ucode-mod-nl80211|wireless-regdb|wpad.*)'
	forbidden_build_config='CONFIG_TARGET_ROOTFS_INITRAMFS=y'
	required_packages=(
		kmod-nf-conntrack-bridge
		kmod-nft-bridge
		kmod-airoha-en7572
		kmod-airoha-xpon
		airoha-ponctl
		airoha-pond
		luci-app-onu
		kmod-airoha-en7581-pcm-spi
	)
	manifest_required_packages=("${required_packages[@]}" kmod-airoha-tod)
	forbidden_kernel='CONFIG_MT(76|7996).*=(y|m)'
	required_kernel='CONFIG_PTP_1588_CLOCK_AIROHA_TOD=m'
else
	echo "unsupported Gemtek profile in $config_file" >&2
	exit 1
fi

failed=0

if grep -En "^CONFIG_(PACKAGE|DEFAULT)_${forbidden_packages}=y$" "$config_file"; then
	echo "$profile config selects forbidden packages" >&2
	failed=1
fi

for package in "${required_packages[@]}"; do
	if ! grep -Fqx "CONFIG_PACKAGE_${package}=y" "$config_file"; then
		echo "$profile config is missing required package: $package" >&2
		failed=1
	fi
done

if [[ -n "$forbidden_build_config" ]] && grep -Fqx "$forbidden_build_config" "$config_file"; then
	echo "$profile config enables initramfs and can overwrite the normal kernel used by the size-limited FIT image" >&2
	failed=1
fi

if [[ -n "$kernel_config" ]]; then
	if grep -En "^${forbidden_kernel}$" "$kernel_config"; then
		echo "$profile kernel enables a forbidden subsystem" >&2
		failed=1
	fi

	while IFS= read -r required; do
		[[ -n "$required" ]] || continue
		if ! grep -Eq "^${required}$" "$kernel_config"; then
			echo "$profile kernel is missing required symbol: $required" >&2
			failed=1
		fi
	done < <(tr '|' '\n' <<<"$required_kernel")
fi

for manifest in "${manifests[@]}"; do
	if grep -En "^${forbidden_packages}([[:space:]]|$)" "$manifest"; then
		echo "$profile manifest contains forbidden packages: $manifest" >&2
		failed=1
	fi

	for package in "${manifest_required_packages[@]}"; do
		if ! grep -Eq "^${package}([[:space:]]|$)" "$manifest"; then
			echo "$profile manifest is missing required package $package: $manifest" >&2
			failed=1
		fi
	done
done

(( failed == 0 )) || exit 1
echo "Gemtek profile isolation check passed: $profile"
