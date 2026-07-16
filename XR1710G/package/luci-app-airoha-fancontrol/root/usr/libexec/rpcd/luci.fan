#!/bin/sh

# W1700K Fan Control RPC backend for LuCI

# Dynamically find NCT7802 fan controller hwmon device
find_nct7802() {
	for hwmon in /sys/class/hwmon/hwmon*; do
		if [ -f "$hwmon/name" ] && [ "$(cat "$hwmon/name" 2>/dev/null)" = "nct7802" ]; then
			echo "$hwmon"
			return
		fi
	done
	echo "/sys/class/hwmon/hwmon5"  # fallback
}

# Dynamically find mt7996 WiFi hwmon devices
find_mt7996_hwmon() {
	local band="$1"  # 0, 1, or 2
	for hwmon in /sys/class/hwmon/hwmon*; do
		if [ -f "$hwmon/name" ]; then
			local name=$(cat "$hwmon/name" 2>/dev/null)
			case "$name" in
				mt7996_phy0."$band"|mt7996_phy0_"$band")
					echo "$hwmon"
					return
					;;
			esac
		fi
	done
	echo ""
}

# Dynamically find PHY hwmon devices (mt7530 DSA)
find_phy_hwmon() {
	local suffix="$1"  # :05 or :08
	for hwmon in /sys/class/hwmon/hwmon*; do
		if [ -f "$hwmon/name" ]; then
			local name=$(cat "$hwmon/name" 2>/dev/null)
			case "$name" in
				*"$suffix")
					echo "$hwmon"
					return
					;;
			esac
		fi
	done
	echo ""
}

HWMON=$(find_nct7802)

read_temp() {
	local file="$1"
	local temp=0
	if [ -f "$file" ]; then
		temp=$(cat "$file" 2>/dev/null || echo 0)
		# Convert from milli-celsius to celsius
		temp=$((temp / 1000))
	fi
	echo "$temp"
}

read_value() {
	local file="$1"
	if [ -f "$file" ]; then
		cat "$file" 2>/dev/null || echo 0
	else
		echo 0
	fi
}

get_status() {
	local temp_cpu temp_board temp_phy1 temp_phy2
	local fan_rpm fan_pwm fan_mode fan_percentage

	# Read CPU temperature from thermal zone (AN7581 SoC die temp)
	temp_cpu=$(read_temp "/sys/class/thermal/thermal_zone0/temp")

	# Read temperatures from NCT7802 fan controller (hwmon5)
	# temp1 = board local (used by hardware fan curve), temp2 = external (disconnected), temp4 = external
	temp_board=$(read_temp "${HWMON}/temp1_input")

	# Read PHY temperatures from mt7530 DSA switch sensors (dynamic lookup)
	local phy1_hwmon=$(find_phy_hwmon ":05")
	local phy2_hwmon=$(find_phy_hwmon ":08")
	temp_phy1=$([ -n "$phy1_hwmon" ] && read_temp "$phy1_hwmon/temp1_input" || echo 0)
	temp_phy2=$([ -n "$phy2_hwmon" ] && read_temp "$phy2_hwmon/temp1_input" || echo 0)

	# Read fan status
	fan_rpm=$(read_value "${HWMON}/fan1_input")
	fan_pwm=$(read_value "${HWMON}/pwm1")
	fan_mode=$(read_value "${HWMON}/pwm1_enable")

	# Calculate percentage (0-255 -> 0-100)
	fan_percentage=$((fan_pwm * 100 / 255))

	# Get WiFi temperatures from mt7996 hwmon devices (dynamic lookup)
	local wifi_24g=0 wifi_5g=0 wifi_6g=0
	local wifi_24g_hwmon=$(find_mt7996_hwmon 0)
	local wifi_5g_hwmon=$(find_mt7996_hwmon 1)
	local wifi_6g_hwmon=$(find_mt7996_hwmon 2)

	[ -n "$wifi_24g_hwmon" ] && wifi_24g=$(read_temp "$wifi_24g_hwmon/temp1_input")
	[ -n "$wifi_5g_hwmon" ] && wifi_5g=$(read_temp "$wifi_5g_hwmon/temp1_input")
	[ -n "$wifi_6g_hwmon" ] && wifi_6g=$(read_temp "$wifi_6g_hwmon/temp1_input")

	# Get current UCI settings
	local uci_mode=$(uci -q get fan.settings.mode || echo "auto")
	local uci_preset=$(uci -q get fan.settings.curve_preset || echo "balanced")
	local uci_manual_pwm=$(uci -q get fan.settings.manual_pwm || echo "127")

	# Mode description
	local mode_desc="Unknown"
	case "$fan_mode" in
		0) mode_desc="Full Speed" ;;
		1) mode_desc="Manual" ;;
		2) mode_desc="Automatic" ;;
		3) mode_desc="Auto (Closed Loop)" ;;
	esac

	printf '{"temp_cpu":%d,"temp_board":%d,"temp_phy1":%d,"temp_phy2":%d,"wifi_24g":%d,"wifi_5g":%d,"wifi_6g":%d,"fan_rpm":%d,"fan_pwm":%d,"fan_percentage":%d,"fan_mode":%d,"fan_mode_desc":"%s","uci_mode":"%s","uci_preset":"%s","uci_manual_pwm":%d}' \
		"$temp_cpu" "$temp_board" "$temp_phy1" "$temp_phy2" \
		"$wifi_24g" "$wifi_5g" "$wifi_6g" \
		"$fan_rpm" "$fan_pwm" "$fan_percentage" \
		"$fan_mode" "$mode_desc" \
		"$uci_mode" "$uci_preset" "$uci_manual_pwm"
}

get_curve() {
	local preset="$1"
	[ -z "$preset" ] && preset="balanced"

	local points="["
	local first=1

	for i in 1 2 3 4 5; do
		local temp=$(uci -q get fan.${preset}.point${i}_temp || echo 0)
		local pwm=$(uci -q get fan.${preset}.point${i}_pwm || echo 0)

		[ $first -eq 0 ] && points="${points},"
		first=0
		points="${points}{\"temp\":${temp},\"pwm\":${pwm}}"
	done
	points="${points}]"

	printf '{"preset":"%s","points":%s}' "$preset" "$points"
}

get_all_curves() {
	local curves="{"
	local first=1

	for preset in quiet balanced performance custom; do
		[ $first -eq 0 ] && curves="${curves},"
		first=0

		local points="["
		local pfirst=1
		for i in 1 2 3 4 5; do
			local temp=$(uci -q get fan.${preset}.point${i}_temp || echo 0)
			local pwm=$(uci -q get fan.${preset}.point${i}_pwm || echo 0)

			[ $pfirst -eq 0 ] && points="${points},"
			pfirst=0
			points="${points}{\"temp\":${temp},\"pwm\":${pwm}}"
		done
		points="${points}]"

		curves="${curves}\"${preset}\":${points}"
	done
	curves="${curves}}"

	echo "$curves"
}

set_mode() {
	local mode="$1"

	case "$mode" in
		manual|auto)
			uci set fan.settings.mode="$mode"
			uci commit fan
			/etc/init.d/fan reload
			echo '{"success":true}'
			;;
		*)
			echo '{"success":false,"error":"Invalid mode"}'
			;;
	esac
}

set_manual_pwm() {
	local pwm="$1"

	# Validate PWM range
	if [ "$pwm" -ge 0 ] && [ "$pwm" -le 255 ] 2>/dev/null; then
		uci set fan.settings.manual_pwm="$pwm"
		uci commit fan
		/etc/init.d/fan reload
		echo '{"success":true}'
	else
		echo '{"success":false,"error":"Invalid PWM value (0-255)"}'
	fi
}

set_preset() {
	local preset="$1"

	case "$preset" in
		quiet|balanced|performance|custom)
			uci set fan.settings.curve_preset="$preset"
			uci commit fan
			/etc/init.d/fan reload
			echo '{"success":true}'
			;;
		*)
			echo '{"success":false,"error":"Invalid preset"}'
			;;
	esac
}

set_custom_curve() {
	# Read JSON from stdin
	local json
	read json

	# Parse points using jsonfilter if available
	if command -v jsonfilter >/dev/null 2>&1; then
		for i in 1 2 3 4 5; do
			local idx=$((i - 1))
			local temp=$(echo "$json" | jsonfilter -e "@.points[${idx}].temp" 2>/dev/null)
			local pwm=$(echo "$json" | jsonfilter -e "@.points[${idx}].pwm" 2>/dev/null)

			if [ -n "$temp" ] && [ -n "$pwm" ]; then
				uci set fan.custom.point${i}_temp="$temp"
				uci set fan.custom.point${i}_pwm="$pwm"
			fi
		done
		uci set fan.settings.curve_preset="custom"
		uci commit fan
		/etc/init.d/fan reload
		echo '{"success":true}'
	else
		echo '{"success":false,"error":"jsonfilter not available"}'
	fi
}

case "$1" in
	list)
		echo '{"getStatus":{},"getCurve":{"preset":"str"},"getAllCurves":{},"setMode":{"mode":"str"},"setManualPwm":{"pwm":"int"},"setPreset":{"preset":"str"},"setCustomCurve":{"points":"array"}}'
		;;
	call)
		case "$2" in
			getStatus)
				get_status
				;;
			getCurve)
				# Parse preset from JSON input
				read input
				preset=$(echo "$input" | jsonfilter -e '@.preset' 2>/dev/null || echo "balanced")
				get_curve "$preset"
				;;
			getAllCurves)
				get_all_curves
				;;
			setMode)
				read input
				mode=$(echo "$input" | jsonfilter -e '@.mode' 2>/dev/null)
				set_mode "$mode"
				;;
			setManualPwm)
				read input
				pwm=$(echo "$input" | jsonfilter -e '@.pwm' 2>/dev/null)
				set_manual_pwm "$pwm"
				;;
			setPreset)
				read input
				preset=$(echo "$input" | jsonfilter -e '@.preset' 2>/dev/null)
				set_preset "$preset"
				;;
			setCustomCurve)
				set_custom_curve
				;;
			*)
				echo '{"error":"Invalid method"}'
				;;
		esac
		;;
esac
