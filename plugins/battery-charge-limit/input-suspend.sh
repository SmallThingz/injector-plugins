# The observed Xiaomi/QCOM build exposes a binary suspend switch. Handle it separately
# from percentage thresholds and keep its own foreground session journal.
suspend_firmware='Redmi/amethyst_in/amethyst:16/BP2A.250605.031.A3/OS3.0.303.0.WOPINXM:user/release-keys'

read_suspend() (
    [ -f "$suspend_node" ] && [ ! -L "$suspend_node" ] || exit 1
    [ "$(readlink -f "$suspend_node")" = "$controller" ] || exit 1
    value=$(cat "$suspend_node") || exit 1
    case "$value" in 0|1) printf '%s\n' "$value" ;; *) exit 1 ;; esac
)

save_suspend_state() {
    printf '%s\n' 1 "$firmware" "$boot" "$battery" "$controller" "$session" \
        "$confirmed" "$pending" "$session_launch" > "$suspend_journal.new" &&
        mv -f "$suspend_journal.new" "$suspend_journal"
}

load_suspend_state() {
    [ -f "$suspend_journal" ] && [ ! -L "$suspend_journal" ] ||
        fail 'Invalid input-suspend journal.'
    {
        IFS= read -r version && IFS= read -r saved_firmware && IFS= read -r saved_boot &&
            IFS= read -r saved_battery && IFS= read -r saved_controller && IFS= read -r session &&
            IFS= read -r confirmed && IFS= read -r pending ||
            fail 'Input-suspend journal is incomplete.'
        IFS= read -r session_launch || session_launch=
    } < "$suspend_journal" || fail 'Input-suspend journal is incomplete.'
    [ "$version/$saved_firmware/$saved_boot" = "1/$firmware/$boot" ] &&
        [ "$saved_battery" = "$battery" ] && [ "$saved_controller" = "$controller" ] ||
        fail 'The firmware, boot or charging controller changed. Saved state was retained.'
    case "$session" in
        ''|*[!0-9]*) valid_session_id "$session" || fail 'Invalid charging monitor identity.' ;;
    esac
    [ -z "$session_launch" ] || valid_session_id "$session_launch" || fail 'Invalid charging monitor launch.'
    case "$confirmed/$pending" in 0/-|1/-|0/1|1/0) ;; *) fail 'Invalid input-suspend write receipt.' ;; esac
}

suspend_conflict() {
    printf '%s\n' "$*" >&2
    exit 3
}

check_suspend() {
    live=$(read_suspend) || suspend_conflict 'Cannot read the same input-suspend controller. Saved state was retained.'
    if [ "$live" != "$confirmed" ]; then
        if [ "$pending" != - ]; then
            suspend_conflict 'An input-suspend write has an unknown outcome. Saved state was retained.'
        fi
        suspend_conflict 'Input suspend changed externally. Saved state was retained.'
    fi
}

clear_suspend_pending() {
    pending=-
    save_suspend_state || fail 'Cannot save input-suspend receipt.'
}

write_suspend() {
    printf '%s\n' "$2" > "$1"
}

change_suspend() {
    target=$1
    check_suspend
    [ "$target" != "$confirmed" ] || return 0
    pending=$target
    save_suspend_state || fail 'Cannot record input-suspend write intent.'
    check_suspend
    if ! owner_writable "$suspend_node"; then
        clear_suspend_pending
        fail 'Input suspend became read-only.'
    fi
    if [ "$operation" = tick ] && ! lease_current; then
        clear_suspend_pending
        exit 4
    fi
    written=false
    if write_suspend "$suspend_node" "$target"; then written=true; fi
    live=$(read_suspend) || suspend_conflict 'Cannot verify input suspend. Saved state was retained.'
    if [ "$written" = true ] && [ "$live" = "$target" ]; then
        confirmed=$target
        clear_suspend_pending
        printf 'Input suspend readback: %s.\n' "$confirmed"
    elif [ "$live" = "$confirmed" ]; then
        clear_suspend_pending
        fail 'The driver rejected the input-suspend change.'
    else
        suspend_conflict 'Input-suspend write has an unknown outcome. Saved state was retained.'
    fi
}

suspend_operation() (
    operation=$1
    verified_receipt=false
    [ "$(id -u)" = 0 ] || fail 'Root is no longer available. Saved state was retained.'
    exec 9>> "$state_dir/threshold-lock" || fail 'Cannot open the charge limit lock.'
    flock -n 9 9>&9 || fail 'Charge limit lock unavailable or busy.'
    [ ! -e "$state_dir/threshold-state" ] && [ ! -L "$state_dir/threshold-state" ] ||
        fail 'A native threshold session must be restored first.'

    if [ "$operation" = start ]; then
        [ ! -e "$suspend_journal" ] && [ ! -L "$suspend_journal" ] ||
            fail 'Disable must resolve the existing input-suspend session.'
        [ "$(read_suspend)" = 0 ] || fail 'Input suspend is already active or unavailable.'
        owner_writable "$suspend_node" || fail 'Input suspend is read-only.'
        session=$monitor_session
        session_launch=$lease_launch
        confirmed=0
        pending=-
        save_suspend_state || fail 'Cannot save the input-suspend baseline.'
        exit 0
    fi
    if [ ! -e "$suspend_journal" ] && [ ! -L "$suspend_journal" ]; then
        case "$operation" in
            disable) exit 0 ;;
            abort-start) exit 5 ;;
            recover)
                suspend_journal="$suspend_restored"
                [ -f "$suspend_journal" ] && [ ! -L "$suspend_journal" ] ||
                    suspend_conflict 'No matching input-suspend restoration evidence.'
                verified_receipt=true
                ;;
            *) suspend_conflict 'The input-suspend session journal disappeared.' ;;
        esac
    fi
    load_suspend_state
    if [ "$operation" = abort-start ]; then
        [ "$session/$session_launch" = "$monitor_session/$lease_launch" ] || exit 5
        operation=cleanup
    fi
    if [ "$operation" != disable ] && [ "$session" != "$monitor_session" ]; then
        suspend_conflict 'Input-suspend session ownership changed.'
    fi
    case "$operation" in
        tick|cleanup)
            [ "$session_launch" = "$lease_launch" ] || suspend_conflict 'Input-suspend launch ownership changed.'
            ;;
    esac
    check_suspend
    if [ "$verified_receipt" = true ]; then
        [ "$confirmed/$pending" = 0/- ] || suspend_conflict 'Invalid input-suspend restoration evidence.'
        exit 0
    fi
    [ "$pending" = - ] || clear_suspend_pending
    case "$operation" in
        tick)
            [ "$(readlink -f "$supply_class/battery")" = "$battery" ] ||
                suspend_conflict 'The battery controller changed. Saved state was retained.'
            capacity=$(read_threshold "$battery/capacity") || fail 'Cannot read battery capacity.'
            if [ "$capacity" -ge "$stop" ]; then
                change_suspend 1
            elif [ "$capacity" -le "$resume" ]; then
                change_suspend 0
            fi
            ;;
        disable|cleanup|recover)
            change_suspend 0
            check_suspend
            mv -f "$suspend_journal" "$suspend_restored" ||
                fail 'Input suspend is restored, but the restoration receipt could not be saved.'
            printf '%s\n' 'Original input-suspend state restored.'
            ;;
    esac
)

monitor_input_suspend() {
    resume=${INJECTOR_INPUT_resume_percent-75}
    stop=${INJECTOR_INPUT_stop_percent-80}
    is_percent "$resume" && is_percent "$stop" && [ "$resume" -lt "$stop" ] ||
        fail 'Choose a resume threshold below the stop threshold.'
    printf '%s\n' 'Charging enforcement is unverified.' >&2
    run_charge_session suspend_operation
}

suspend_charge_limit() {
    event=$1
    supply_class=$2
    devices_root=$3
    qcom_class=$4
    state_dir=$5
    firmware=$6
    suspend_journal="$state_dir/input-suspend-state"
    suspend_restored="$state_dir/input-suspend-restored"
    if [ "$event" = disable ] && [ ! -e "$suspend_journal" ] && [ ! -L "$suspend_journal" ]; then
        printf '%s\n' 'No saved charge limit to restore.'
        return 0
    fi
    [ "$firmware" = "$suspend_firmware" ] || fail 'This firmware is outside the verified Xiaomi/QCOM charging profile.'
    if [ "$event" = enable ] || [ "$event" = run ]; then
        fail "This firmware needs Injector's supervised charging monitor. Native charge thresholds were rejected on this build."
    fi
    boot=$(cat "$7") || fail 'Cannot identify this boot.'
    case "$boot" in ''|*[!0-9a-f-]*) fail 'Cannot identify this boot.' ;; esac
    battery=$(readlink -f "$supply_class/battery") || fail 'Cannot resolve battery capacity.'
    expected="$devices_root/platform/soc/soc:qcom,pmic_glink/soc:qcom,pmic_glink:qcom,battery_charger/power_supply/battery"
    [ "$battery" = "$expected" ] && [ "$(cat "$battery/type")" = Battery ] ||
        fail 'The Xiaomi/QCOM battery controller is unavailable.'
    suspend_node="$qcom_class/input_suspend"
    controller=$(readlink -f "$suspend_node") || fail 'Cannot resolve input suspend.'
    case "$controller" in "$suspend_node"|"$devices_root"/*/input_suspend) ;; *) fail 'Unexpected input-suspend controller.' ;; esac
    case "$event" in
        monitor) monitor_input_suspend ;;
        disable|recover) suspend_operation "$event" ;;
        *) fail 'Unsupported charge limit hook event.' ;;
    esac
}

# This hook runs from Injector's private root-staged installation directory.
exec_qcom_monitor() {
    worker="$INJECTOR_PLUGIN_DIR/native-charge"
    [ -f "$worker" ] && [ ! -L "$worker" ] || fail 'Missing native charging monitor.'
    if [ ! -x "$worker" ]; then
        chmod 700 "$worker" || fail 'Cannot prepare native charging monitor.'
    fi
    exec "$worker"
}
