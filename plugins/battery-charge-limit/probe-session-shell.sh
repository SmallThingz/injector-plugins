# Append this to session.sh and execute the combined script with /system/bin/sh.
# This probe uses artificial stdin pipes and kernel uptime only.
set -eu
export LC_ALL=C

fail() {
    printf '%s\n' "$*" >&2
    exit 1
}

probe_nonce=59abe231-7d1a-49d6-b090-127589b56712

printf 'STOP %s\n' "$probe_nonce" | (
    read_lease_clock
    lease_until=$((now + 300))
    read_session_frame && [ "$frame" = "STOP $probe_nonce" ] ||
        fail 'STOP frame did not round-trip.'
    read_lease_clock
    before_eof=$now
    if read_session_frame; then fail 'EOF was accepted as a frame.'; fi
    [ "$((now - before_eof))" -lt 100 ] || fail 'EOF did not return promptly.'
)

{
    sleep 1
    printf 'HEARTBEAT %s 1\n' "$probe_nonce"
} | (
    read_lease_clock
    lease_until=$((now + 25))
    if read_session_frame; then fail 'A frame arrived before the silent lease expired.'; fi
    [ "$now" -ge "$lease_until" ] || fail 'A silent pipe was treated as EOF.'
    lease_until=$((now + 300))
    read_session_frame && [ "$frame" = "HEARTBEAT $probe_nonce 1" ] ||
        fail 'The pipe was unreadable after a timed read.'
)

printf '%s\n' 'Session shell probe passed: STOP, prompt EOF, silent timeout and subsequent heartbeat.'
