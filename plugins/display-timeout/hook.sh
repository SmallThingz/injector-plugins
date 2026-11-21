#!/system/bin/sh
set -eu
umask 077
. "${INJECTOR_PLUGIN_DIR:?}/settings-state.sh"

validate_inputs() {
    case "${INJECTOR_INPUT_reapply_on_boot:-true}" in true|false) ;; *) fail 'Invalid restart option'; return 1;; esac
    seconds=${INJECTOR_INPUT_timeout_seconds:-60}
    case "$seconds" in 15|30|60|120|300|600|1800) ;; *) fail 'Choose one of the listed screen timeouts.'; return 1;; esac
    targets=$((seconds * 1000))
}
settings_control "${INJECTOR_EVENT:?}" system 'screen_off_timeout' ''
