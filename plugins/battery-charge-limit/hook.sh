#!/system/bin/sh
set -eu
umask 077

. "${INJECTOR_PLUGIN_DIR:?}/thresholds.sh"
[ "$(id -u)" = 0 ] || fail 'Root is required.'
charge_limit "$INJECTOR_EVENT" /sys/class/power_supply /sys/devices \
    "${PLUGIN_STATE_DIR:?}" "$(getprop ro.build.fingerprint)"
