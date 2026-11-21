fail() {
    printf '%s\n' "$*" >&2
    exit 1
}

is_percent() {
    case "$1" in
        [0-9]|[1-9][0-9]|100) return 0 ;;
        *) return 1 ;;
    esac
}

read_threshold() (
    [ -f "$1" ] && [ ! -L "$1" ] || exit 1
    value=$(cat "$1") || exit 1
    is_percent "$value" || exit 1
    printf '%s\n' "$value"
)

owner_writable() (
    # Root's access check can succeed even when a sysfs attribute has no store method.
    mode=$(stat -c %a "$1") || exit 1
    case "$mode" in *[2367][0-7][0-7]) exit 0 ;; esac
    exit 1
)

discover_controller() {
    supply=
    for entry in "$supply_class"/*; do
        [ -d "$entry" ] || continue
        [ "$(cat "$entry/type" 2>/dev/null)" = Battery ] || continue
        [ -e "$entry/charge_control_end_threshold" ] || [ -L "$entry/charge_control_end_threshold" ] || continue
        resolved=$(readlink -f "$entry") || fail 'Cannot resolve the battery controller.'
        case "$resolved" in
            "$devices_root"/*) ;;
            *) fail 'Battery controller is outside the expected sysfs device tree.' ;;
        esac
        [ -z "$supply" ] || [ "$supply" = "$resolved" ] || fail 'Multiple batteries expose a charge stop threshold.'
        supply=$resolved
    done
    [ -n "$supply" ] || fail 'No battery exposes a native charge stop threshold.'

    end_node="$supply/charge_control_end_threshold"
    start_node="$supply/charge_control_start_threshold"
    [ -f "$end_node" ] && [ ! -L "$end_node" ] && owner_writable "$end_node" ||
        fail 'The native charge stop threshold is not writable.'
    layout=end
    if [ -e "$start_node" ] || [ -L "$start_node" ]; then
        [ -f "$start_node" ] && [ ! -L "$start_node" ] || fail 'Invalid native charge start threshold.'
        layout=fixed
        if owner_writable "$start_node"; then
            layout=paired
        fi
    fi
}

read_pair() {
    actual_end=$(read_threshold "$end_node") || return 1
    actual_start=-
    if [ "$layout" != end ]; then
        actual_start=$(read_threshold "$start_node") || return 1
    fi
}

validate_pair() {
    is_percent "$2" || return 1
    if [ "$layout" = end ]; then
        [ "$1" = - ]
    else
        is_percent "$1" && [ "$1" -le "$2" ]
    fi
}

save_state() {
    # Replace one complete journal record before attempting each sysfs write.
    printf '%s\n' 1 "$firmware" "$supply" "$layout" "$phase" \
        "$original_start" "$original_end" "$confirmed_start" "$confirmed_end" \
        "$pending_node" "$pending_value" > "$journal.new" && mv -f "$journal.new" "$journal"
}

load_state() {
    {
        IFS= read -r version && IFS= read -r saved_firmware && IFS= read -r saved_supply &&
            IFS= read -r saved_layout && IFS= read -r phase && IFS= read -r original_start &&
            IFS= read -r original_end && IFS= read -r confirmed_start && IFS= read -r confirmed_end &&
            IFS= read -r pending_node && IFS= read -r pending_value
    } < "$journal" || fail 'Charge limit state is incomplete. Saved state was retained.'
    [ "$version" = 1 ] && [ "$saved_firmware" = "$firmware" ] && [ "$saved_supply" = "$supply" ] &&
        [ "$saved_layout" = "$layout" ] || fail 'The firmware or charge controller changed. Saved state was retained.'
    case "$phase" in preparing|active|stopping) ;; *) fail 'Invalid charge limit state.' ;; esac
    validate_pair "$original_start" "$original_end" && validate_pair "$confirmed_start" "$confirmed_end" ||
        fail 'Invalid thresholds in charge limit state.'
    if [ "$layout" = fixed ] && [ "$original_start" != "$confirmed_start" ]; then
        fail 'Invalid fixed start threshold in charge limit state.'
    fi
    case "$pending_node" in
        -) [ "$pending_value" = - ] || fail 'Invalid charge limit write receipt.' ;;
        end) validate_pair "$confirmed_start" "$pending_value" || fail 'Invalid pending stop threshold.' ;;
        start) [ "$layout" = paired ] && validate_pair "$pending_value" "$confirmed_end" || fail 'Invalid pending start threshold.' ;;
        *) fail 'Invalid charge limit write receipt.' ;;
    esac
}

matches_confirmed() {
    [ "$actual_start" = "$confirmed_start" ] && [ "$actual_end" = "$confirmed_end" ]
}

report_conflict() {
    printf 'Last verified start/stop: %s/%s. Current start/stop: %s/%s.\n' \
        "$confirmed_start" "$confirmed_end" "$actual_start" "$actual_end" >&2
    if [ "$pending_node" != - ]; then
        fail 'A previous threshold write has an unknown outcome. Saved state was retained.'
    fi
    fail 'The thresholds changed externally. Saved state was retained.'
}

check_confirmed() {
    read_pair || fail 'Cannot read the native thresholds. Saved state was retained.'
    matches_confirmed || report_conflict
}

clear_pending() {
    pending_node=-
    pending_value=-
    save_state || fail 'Unable to save the charge limit receipt.'
}

write_threshold() {
    printf '%s\n' "$2" > "$1"
}

change_threshold() {
    field=$1
    requested=$2
    next_start=$confirmed_start
    next_end=$confirmed_end
    case "$field" in
        start) node=$start_node; next_start=$requested ;;
        end) node=$end_node; next_end=$requested ;;
    esac
    [ "$next_start/$next_end" != "$confirmed_start/$confirmed_end" ] || return 0
    check_confirmed
    pending_node=$field
    pending_value=$requested
    save_state || fail 'Unable to record the intended threshold write.'
    # A concurrent writer after the first read must not be overwritten knowingly.
    if ! read_pair; then
        clear_pending
        fail 'Cannot read the native thresholds. Saved state was retained.'
    fi
    if ! matches_confirmed; then
        clear_pending
        report_conflict
    fi
    written=false
    if write_threshold "$node" "$requested"; then
        written=true
    fi
    read_pair || fail 'Threshold write readback is unavailable. Saved state was retained.'
    if [ "$written" = true ] && [ "$actual_start/$actual_end" = "$next_start/$next_end" ]; then
        confirmed_start=$next_start
        confirmed_end=$next_end
        clear_pending
        return 0
    fi
    if matches_confirmed; then
        clear_pending
        printf 'The driver left the %s threshold unchanged after a %s%% request.\n' "$field" "$requested" >&2
        return 1
    fi
    printf 'Requested %s=%s. Readback start/stop: %s/%s.\n' "$field" "$requested" "$actual_start" "$actual_end" >&2
    fail 'The threshold write could not be verified. Saved state was retained.'
}

transition() {
    target_start=$1
    target_end=$2
    # Lower the start threshold first when the new stop would cross the current start.
    if [ "$layout" = paired ] && [ "$target_end" -le "$confirmed_start" ]; then
        change_threshold start "$target_start" && change_threshold end "$target_end"
    else
        change_threshold end "$target_end" || return 1
        if [ "$layout" = paired ]; then
            change_threshold start "$target_start"
        fi
    fi
}

describe_thresholds() {
    printf 'Native charge stop threshold: %s%%.\n' "$confirmed_end"
    case "$layout" in
        paired) printf 'Native charge start threshold: %s%%.\n' "$confirmed_start" ;;
        fixed) printf 'Device charge start threshold: %s%% (read-only).\n' "$confirmed_start" ;;
        end) printf '%s\n' 'The device manages when charging resumes.' ;;
    esac
}

charge_limit() {
    event=$1
    supply_class=$2
    devices_root=$3
    state_dir=$4
    firmware=$5
    journal="$state_dir/threshold-state"
    case "$event" in enable|run|disable) ;; *) fail 'Unsupported hook event.' ;; esac
    exec 9> "$state_dir/threshold-lock" || fail 'Cannot open the charge limit lock.'
    flock -n 9 9>&9 || fail 'Charge limit lock unavailable or busy.'
    if [ "$event" = disable ] && [ ! -e "$journal" ]; then
        printf '%s\n' 'No saved charge limit to restore.'
        return 0
    fi
    [ -n "$firmware" ] || fail 'The firmware identity is unavailable.'
    discover_controller

    if [ -e "$journal" ]; then
        load_state
        if [ "$event" = disable ] && [ "$phase" != stopping ]; then
            phase=stopping
            save_state || fail 'Unable to record the restore operation.'
        fi
        # A pending write may be retried only if the entire last verified pair is still present.
        check_confirmed
        if [ "$pending_node" != - ]; then
            clear_pending
        fi
    else
        read_pair && validate_pair "$actual_start" "$actual_end" || fail 'The battery reports invalid native thresholds.'
        original_start=$actual_start
        original_end=$actual_end
        confirmed_start=$actual_start
        confirmed_end=$actual_end
        phase=preparing
        pending_node=-
        pending_value=-
        if [ "$event" = run ]; then
            printf '%s\n' 'Native charge control found. Enable to apply your settings.'
            describe_thresholds
            return 0
        fi
    fi

    if [ "$event" = disable ]; then
        transition "$original_start" "$original_end" || fail 'The driver rejected a saved threshold. Saved state was retained.'
        check_confirmed
        rm "$journal" || fail 'Original thresholds are verified, but the saved state could not be removed.'
        printf 'Original native thresholds restored.\n'
        describe_thresholds
        return 0
    fi

    [ "$phase" != stopping ] || fail 'Disable must finish restoring the previous thresholds first.'
    if [ "$event" = run ] && [ "$phase" != active ]; then
        fail 'Enable or Disable must resolve the incomplete setup first.'
    fi
    stop=${INJECTOR_INPUT_stop_percent-80}
    is_percent "$stop" && [ "$stop" -ge 50 ] || fail 'Stop must be a whole number from 50 to 100.'
    resume=$confirmed_start
    case "$layout" in
        paired)
            resume=${INJECTOR_INPUT_resume_percent-75}
            is_percent "$resume" && [ "$resume" -ge 45 ] && [ "$resume" -le 99 ] ||
                fail 'Resume must be a whole number from 45 to 99.'
            [ "$resume" -lt "$stop" ] || fail 'Choose a resume threshold below the stop threshold.'
            ;;
        fixed)
            [ "$resume" -lt "$stop" ] || fail "Choose a stop threshold above the device's fixed start threshold."
            ;;
    esac

    before_start=$confirmed_start
    before_end=$confirmed_end
    before_phase=$phase
    save_state || fail 'Unable to save the previous thresholds.'
    if ! transition "$resume" "$stop"; then
        transition "$before_start" "$before_end" || fail 'Unable to roll back the rejected change. Saved state was retained.'
        if [ "$before_phase" = preparing ] && [ "$confirmed_start/$confirmed_end" = "$original_start/$original_end" ]; then
            rm "$journal" || fail 'Original thresholds are verified, but the saved state could not be removed.'
        fi
        fail 'The requested thresholds were rejected. The previous thresholds are verified.'
    fi
    check_confirmed
    phase=active
    save_state || fail 'Thresholds were verified, but the active receipt could not be saved.'
    describe_thresholds
}
