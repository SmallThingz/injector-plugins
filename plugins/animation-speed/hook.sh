#!/system/bin/sh
set -eu
umask 077
. "${INJECTOR_PLUGIN_DIR:?}/settings-state.sh"

scale() {
    case "$1" in
        0) printf 0;; 25) printf 0.25;; 50) printf 0.5;;
        75) printf 0.75;; 100) printf 1;; 125) printf 1.25;;
        150) printf 1.5;; 175) printf 1.75;; 200) printf 2;;
        *) fail 'Animation duration must be 0 to 200 percent in steps of 25.';;
    esac
}
validate_inputs() {
    case "${INJECTOR_INPUT_reapply_on_boot:-true}" in true|false) ;; *) fail 'Invalid restart option'; return 1;; esac
    window=$(scale "${INJECTOR_INPUT_window_percent:-100}") || return 1
    transition=$(scale "${INJECTOR_INPUT_transition_percent:-100}") || return 1
    animator=$(scale "${INJECTOR_INPUT_animator_percent:-100}") || return 1
    targets="$window $transition $animator"
}
settings_control "${INJECTOR_EVENT:?}" global \
    'window_animation_scale transition_animation_scale animator_duration_scale' ''
