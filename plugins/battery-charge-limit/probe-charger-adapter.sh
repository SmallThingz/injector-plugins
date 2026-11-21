#!/system/bin/sh
# Read only. Run through the existing authorized device shell.
read_attrs() {
    [ -d "$1" ] || return 0
    dir=$1
    shift
    for attr in "$@"; do
        node="$dir/$attr"
        [ -f "$node" ] || continue
        mode=$(stat -c %a "$node" 2>/dev/null) || mode=unavailable
        value=$(head -c 96 "$node" 2>/dev/null) || value=unreadable
        printf '%s mode=%s value=%s\n' "$node" "$mode" "$value"
    done
}

printf 'firmware=%s\n' "$(getprop ro.build.fingerprint)"
battery=/sys/class/power_supply/battery
resolved=$(readlink -f "$battery" 2>/dev/null) || resolved=
printf 'battery=%s\n' "$resolved"
read_attrs "$battery" type status capacity current_now charge_control_start_threshold charge_control_end_threshold
for dir in "$battery" /sys/class/power_supply/usb /sys/class/power_supply/wireless /sys/class/qcom-battery; do
    read_attrs "$dir" present online charge_behaviour charging_enabled battery_charging_enabled
    read_attrs "$dir" charge_enabled charging_enable charge_enable input_suspend
done
case "$resolved" in
    /sys/devices/*/power_supply/battery)
        read_attrs "${resolved%/power_supply/battery}" force_charger_suspend
        ;;
esac

if command -v timeout >/dev/null 2>&1; then
    micharge=vendor.xiaomi.hardware.micharge.IMiCharge/default
    if registration=$(timeout 3 service check "$micharge" 2>&1); then
        printf '%s\n' "$registration"
        if [ "$registration" = "Service $micharge: found" ]; then
            # Confirmed in this firmware's IMiCharge.getInputSuspendState().
            printf '%s\n' 'MiCharge input-suspend getter (AIDL):'
            timeout 3 service call "$micharge" 17 2>&1
        elif command -v lshal >/dev/null 2>&1; then
            timeout 3 lshal 2>/dev/null | awk '/vendor[.]xiaomi[.]hardware[.]micharge/{print; if (++n==2) exit}'
        fi
    else
        printf '%s\n' "$registration"
    fi
fi
