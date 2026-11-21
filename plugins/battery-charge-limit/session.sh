valid_session_id() {
    [ "${#1}" = 36 ] &&
        printf '%s\n' "$1" | grep -Eq '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
}

read_lease_clock() {
    IFS=' ' read -r uptime idle < /proc/uptime || fail 'The charging session clock is unavailable.'
    seconds=${uptime%.*}
    fraction=${uptime#*.}
    case "$seconds" in ''|*[!0-9]*) fail 'Invalid charging session clock.' ;; esac
    case "$fraction" in [0-9][0-9]) ;; *) fail 'Invalid charging session clock.' ;; esac
    clock_origin=${clock_origin:-$seconds}
    now=$(((seconds - clock_origin) * 100 + 1$fraction - 100))
    [ "$now" -ge "${last_clock:-0}" ] || fail 'The charging session clock changed.'
    last_clock=$now
}

lease_current() {
    read_lease_clock
    [ "$now" -lt "$lease_until" ]
}

read_session_frame() {
    frame=
    newline='
'
    while lease_current; do
        wait_cs=$((lease_until - now))
        [ "$wait_cs" -le 100 ] || wait_cs=100
        read_until=$((now + wait_cs))
        case "$wait_cs" in
            100) wait_seconds=1 ;;
            [0-9]) wait_seconds=0.0$wait_cs ;;
            *) wait_seconds=0.$wait_cs ;;
        esac
        # mksh can return the same status for EOF and a timeout. Compare the
        # short read's deadline against kernel uptime before polling again.
        if IFS= read -r -N 1 -t "$wait_seconds" byte; then
            case "$byte" in
                "$newline") return 0 ;;
                [0-9A-Za-z]|' '|-)
                    [ "${#frame}" -lt 63 ] || fail 'Charging session frame is too long.'
                    frame=$frame$byte
                    ;;
                *) fail 'Invalid charging session frame.' ;;
            esac
        else
            status=$?
            read_lease_clock
            [ "$status" = 1 ] || [ "$status" -gt 128 ] || fail 'Cannot read the charging session pipe.'
            if [ "$now" -lt "$((read_until - 1))" ] && [ "$status" -le 128 ]; then return 1; fi
        fi
    done
    return 1
}

finish_charge_session() {
    result=$?
    trap - EXIT
    if [ "$result" != 3 ]; then
        cleanup=abort-start
        if [ "$started" = true ]; then cleanup=cleanup; fi
        if "$session_adapter" "$cleanup" >&2; then
            printf 'RESTORED %s\n' "$monitor_session" >&7 || result=1
        else
            cleanup_result=$?
            { [ "$cleanup" = abort-start ] && [ "$cleanup_result" = 5 ]; } || result=$cleanup_result
        fi
    fi
    exit "$result"
}

read_session_contract() {
    monitor_session=${INJECTOR_SESSION_ID:-}
    [ "${INJECTOR_SESSION_PROTOCOL:-}" = stdin-lease-v1 ] &&
        [ "${INJECTOR_SESSION_LEASE_SECONDS:-}" = 15 ] && valid_session_id "$monitor_session" ||
        fail 'Invalid charging session contract.'
}

run_charge_session() {
    session_adapter=$1
    read_session_contract
    [ -p "/proc/$$/fd/0" ] || fail 'Charging session requires a live control pipe.'
    exec 7>&1 || fail 'Cannot open the charging session output.'
    IFS= read -r lease_launch < /proc/sys/kernel/random/uuid &&
        valid_session_id "$lease_launch" || fail 'Cannot identify this charging session launch.'
    read_lease_clock
    lease_until=$((now + 1500))
    started=false
    ready=false
    sequence=1
    trap finish_charge_session EXIT
    trap 'exit 1' HUP INT TERM
    trap '' PIPE
    if "$session_adapter" start >&2; then
        started=true
    else
        return "$?"
    fi
    while read_session_frame; do
        case "$frame" in
            "STOP $monitor_session") return 0 ;;
            "HEARTBEAT $monitor_session $sequence") ;;
            *) fail 'Unexpected charging session frame.' ;;
        esac
        lease_current || return 0
        lease_until=$((now + 1500))
        if "$session_adapter" tick >&2; then
            lease_current || return 0
        else
            tick_result=$?
            [ "$tick_result" != 4 ] || return 0
            return "$tick_result"
        fi
        if [ "$ready" = false ]; then
            printf 'READY %s\n' "$monitor_session" >&7
            ready=true
        fi
        printf 'ACK %s %s\n' "$monitor_session" "$sequence" >&7
        [ "$sequence" -lt 2147483647 ] || return 0
        sequence=$((sequence + 1))
    done
    if ! lease_current; then printf '%s\n' 'Charging session lease expired.' >&2; fi
}
