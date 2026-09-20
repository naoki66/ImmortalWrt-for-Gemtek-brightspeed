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

if grep -qx 'CONFIG_TARGET_airoha_an7581_DEVICE_gemtek_xr1710g-ubi=y' "$config_file"; then
	profile="xr1710g"
	forbidden_packages='(airoha-pon-firmware|airoha-pon-manager|kmod-airoha-(xpon-en757x|pon-plugins|pon-dataplane|xpon-igmp|gpon-igmp|tod))'
	required_packages=(
		airoha-an7581-mt7996-board
		airoha-en7581-mt7996-npu-firmware
		kmod-mt7996-firmware
		kmod-mt7996e
	)
	forbidden_kernel='CONFIG_(AIROHA_PON_COMPAT|PTP_1588_CLOCK_AIROHA_TOD)=(y|m)'
	required_kernel='CONFIG_NET_AIROHA_NPU=y'
elif grep -qx 'CONFIG_TARGET_airoha_an7581_DEVICE_gemtek_xg2010g-ubi=y' "$config_file"; then
	profile="xg2010g"
	forbidden_packages='(airoha-an7581-mt7996-board|airoha-en7581-mt7996-npu-firmware|hostapd.*|iw|iw-full|iwinfo|kmod-(mac80211.*|mt76.*|mt7996.*)|ucode-mod-nl80211|wireless-regdb|wpad.*)'
	required_packages=(
		airoha-pon-firmware
		airoha-pon-manager
		kmod-airoha-xpon-en757x
		kmod-airoha-pon-plugins
		kmod-airoha-pon-dataplane
		kmod-airoha-xpon-igmp
		kmod-airoha-gpon-igmp
		kmod-airoha-tod
	)
	forbidden_kernel='CONFIG_MT(76|7996).*=(y|m)'
	required_kernel='CONFIG_AIROHA_PON_COMPAT=y|CONFIG_PTP_1588_CLOCK_AIROHA_TOD=m'
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

	for package in "${required_packages[@]}"; do
		if ! grep -Eq "^${package}([[:space:]]|$)" "$manifest"; then
			echo "$profile manifest is missing required package $package: $manifest" >&2
			failed=1
		fi
	done
done

(( failed == 0 )) || exit 1
echo "Gemtek profile isolation check passed: $profile"
