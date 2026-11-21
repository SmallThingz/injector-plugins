# Run with /system/bin/sh -c <this script> battery-session-probe <session.sh contents>.
# The optional second positional argument selects a shell for host qualification.
# Child hooks use an in-memory adapter; only kernel uptime and UUID are read.
set -eu
export LC_ALL=C

[ "$#" -ge 1 ] && [ "$#" -le 2 ] || { printf '%s\n' 'Expected the frozen session.sh source argument.' >&2; exit 1; }
shell=${2:-/system/bin/sh}
nonce=59abe231-7d1a-49d6-b090-127589b56712
export INJECTOR_SESSION_ID=$nonce INJECTOR_SESSION_PROTOCOL=stdin-lease-v1 INJECTOR_SESSION_LEASE_SECONDS=15

worker=$1'
set -eu
expected_ticks=$1
ticks=0
fake_value=0

fail() {
    printf "%s\n" "$*" >&2
    exit 1
}

fake_adapter() {
    case "$1" in
        start) [ "$fake_value" = 0 ] ;;
        tick)
            ticks=$((ticks + 1))
            fake_value=1
            ;;
        cleanup)
            [ "$ticks" = "$expected_ticks" ] || fail "Unexpected fake adapter tick count."
            if [ "$ticks" != 0 ]; then
                [ "$fake_value" = 1 ] || fail "Fake adapter ownership changed."
            fi
            fake_value=0
            ;;
        abort-start) return 5 ;;
        *) fail "Unexpected fake adapter operation." ;;
    esac
}

run_charge_session fake_adapter
'

expect() {
    [ "$1" = "$2" ] || { printf 'Unexpected synthetic output for %s\n' "$3" >&2; exit 1; }
}

read_uptime_seconds() {
    IFS=' ' read -r uptime idle < /proc/uptime
    uptime_seconds=${uptime%.*}
}

restored="RESTORED $nonce"
ready=$(printf '%s\n' "READY $nonce" "ACK $nonce 1")
stop_first=$(printf 'STOP %s\n' "$nonce" | "$shell" -c "$worker" battery-session-worker 0)
expect "$stop_first" "$restored" 'STOP before first heartbeat'

read_uptime_seconds
before_eof=$uptime_seconds
eof=$(printf 'HEARTBEAT %s 1\n' "$nonce" | "$shell" -c "$worker" battery-session-worker 1)
read_uptime_seconds
[ "$((uptime_seconds - before_eof))" -lt 4 ] || { printf '%s\n' 'EOF did not return promptly.' >&2; exit 1; }
expect "$eof" "$(printf '%s\n' "$ready" "$restored")" 'heartbeat then EOF'

stop=$(
    {
        printf 'HEARTBEAT %s 1\n' "$nonce"
        sleep 2
        printf 'HEARTBEAT %s 2\nSTOP %s\n' "$nonce" "$nonce"
    } | "$shell" -c "$worker" battery-session-worker 2
)
expect "$stop" "$(printf '%s\n' "$ready" "ACK $nonce 2" "$restored")" 'heartbeat following an idle interval and STOP'

printf '%s\n' 'Battery session protocol probe passed: STOP before heartbeat, prompt EOF, idle read, second heartbeat and STOP.'
