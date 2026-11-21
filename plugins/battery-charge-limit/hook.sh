#!/system/bin/sh
set -eu
umask 077
export LC_ALL=C

. "${INJECTOR_PLUGIN_DIR:?}/thresholds.sh"
. "$INJECTOR_PLUGIN_DIR/session.sh"
. "$INJECTOR_PLUGIN_DIR/input-suspend.sh"
[ "$(id -u)" = 0 ] || fail 'Root is required.'
firmware=$(getprop ro.build.fingerprint)
state_dir=${PLUGIN_STATE_DIR:?}
event=${INJECTOR_EVENT:?}
case "$event" in enable|run|disable|monitor) ;; *) fail 'Unsupported hook event.' ;; esac
supply_class=/sys/class/power_supply
devices_root=/sys/devices

if [ "$event" = disable ] && [ "${INJECTOR_SESSION_ID+x}${INJECTOR_SESSION_PROTOCOL+x}${INJECTOR_SESSION_LEASE_SECONDS+x}" ]; then
    read_session_contract
    event=recover
fi

native_session_operation() (
    [ "$(id -u)" = 0 ] || fail 'Root is no longer available. Saved state was retained.'
    charge_limit "$1" "$supply_class" "$devices_root" "$state_dir" "$firmware" "$monitor_session" "$lease_launch"
)

dispatch_charge_hook() {
    if [ "$event" = monitor ] && [ "$firmware" != "$suspend_firmware" ] &&
        [ ! -e "$state_dir/input-suspend-state" ] && [ ! -L "$state_dir/input-suspend-state" ]; then
        run_charge_session native_session_operation
    elif [ -e "$state_dir/threshold-state" ] || [ -L "$state_dir/threshold-state" ]; then
        [ ! -e "$state_dir/input-suspend-state" ] && [ ! -L "$state_dir/input-suspend-state" ] ||
            fail 'Both charging adapters have saved state. Restore ownership before applying changes.'
        charge_limit "$event" "$supply_class" "$devices_root" "$state_dir" "$firmware" "${monitor_session:-}"
    elif [ "$firmware" = "$suspend_firmware" ] || [ "$event" = monitor ] ||
        [ -e "$state_dir/input-suspend-state" ] || [ -L "$state_dir/input-suspend-state" ]; then
        suspend_charge_limit "$event" "$supply_class" "$devices_root" /sys/class/qcom-battery \
            "$state_dir" "$firmware" /proc/sys/kernel/random/boot_id
    else
        charge_limit "$event" "$supply_class" "$devices_root" "$state_dir" "$firmware" "${monitor_session:-}"
    fi
}

if [ "$event" = recover ]; then
    dispatch_charge_hook >&2
    printf 'RESTORED %s\n' "$monitor_session"
else
    dispatch_charge_hook
fi
