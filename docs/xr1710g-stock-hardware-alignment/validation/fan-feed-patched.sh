#!/bin/sh /etc/rc.common
START=99
USE_PROCD=1

# Dynamically find NCT7802 fan controller hwmon device
find_nct7802() {
	for hwmon in /sys/class/hwmon/hwmon*; do
		if [ -f "$hwmon/name" ] && [ "$(cat "$hwmon/name" 2>/dev/null)" = "nct7802" ]; then
			echo "$hwmon"
			return
		fi
	done
	return 1
}

HWMON=

fan_write() {
	printf '%s\n' "$2" > "$HWMON/$1"
}

fan_failsafe() {
	fan_write pwm1_enable 1
	fan_write pwm1 255
	logger -t fan "Invalid fan configuration or hwmon write failed; requested full speed"
	return 1
}

valid_uint() {
	case "$1" in ''|*[!0-9]*|0[0-9]*) return 1;; esac
	[ "${#1}" -le 3 ] && [ "$1" -le "$2" ]
}

apply_curve() {
	local preset="$1" temp pwm prev_temp=-1 prev_pwm=-1 i
	case "$preset" in quiet|balanced|performance|custom) ;; *) return 1;; esac
	# Validate the complete curve before changing any table entry.
	for i in 1 2 3 4 5; do
		temp=$(uci -q get "fan.${preset}.point${i}_temp")
		valid_uint "$temp" 127 && [ "$temp" -gt "$prev_temp" ] || return 1
		prev_temp=$temp
		if [ "$i" -lt 5 ]; then
			pwm=$(uci -q get "fan.${preset}.point${i}_pwm")
			valid_uint "$pwm" 255 && [ "$pwm" -ge "$prev_pwm" ] || return 1
			prev_pwm=$pwm
		fi
	done
	for i in 1 2 3 4 5; do
		temp=$(uci -q get "fan.${preset}.point${i}_temp")
		fan_write "pwm1_auto_point${i}_temp" "$((temp * 1000))" || return 1
		if [ "$i" -lt 5 ]; then
			pwm=$(uci -q get "fan.${preset}.point${i}_pwm")
			fan_write "pwm1_auto_point${i}_pwm" "$pwm" || return 1
		fi
	done
}

apply_settings() {
	local mode preset manual_pwm
	HWMON=$(find_nct7802) || {
		logger -t fan "NCT7802 not found; no hwmon fallback used"
		return 1
	}
	mode=$(uci -q get fan.settings.mode)
	preset=$(uci -q get fan.settings.curve_preset)
	manual_pwm=$(uci -q get fan.settings.manual_pwm)

	fan_write pwm1_enable 1 && fan_write pwm1 255 || { fan_failsafe; return 1; }
	case "$mode" in
		manual)
			valid_uint "$manual_pwm" 255 && fan_write pwm1 "$manual_pwm" || { fan_failsafe; return 1; }
			;;
		auto)
			apply_curve "$preset" && fan_write pwm1_enable 2 || { fan_failsafe; return 1; }
			;;
		*) fan_failsafe; return 1;;
	esac
}

start_service() {
	apply_settings
}

reload_service() {
	apply_settings
}

service_triggers() {
	procd_add_reload_trigger "fan"
}
