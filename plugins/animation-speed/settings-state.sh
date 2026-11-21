# Reversible settings transactions. Kept identical in both standalone packages.
# Injector serializes hooks for an installation; never source journal contents.
fail() { printf '%s\n' "$*" >&2; return 1; }

read_setting() {
    listing=$(settings --user "$user" list "$namespace" 2>&1) || return 1
    printf '%s\n' "$listing" | awk -v key="$1" '
        length($0) && index($0, "=") == 0 { bad = 1 }
        index($0, key "=") == 1 { count++; value = "v:" substr($0, length(key) + 2) }
        END { if (bad || count > 1) exit 1; print count ? value : "a" }'
}

write_setting() {
    case "$2" in
        a) settings --user "$user" delete "$namespace" "$1" ;;
        v:*) settings --user "$user" put "$namespace" "$1" "${2#v:}" ;;
        *) return 1 ;;
    esac
}

# Readback is authoritative even when the command's acknowledgement is lost.
verified_write() {
    write_setting "$1" "$2" >/dev/null 2>&1 || :
    observed=$(read_setting "$1") || return 1
    [ "$observed" = "$2" ]
}

line() { sed -n "${1}p" "$journal"; }
record() {
    original=$(line "$((5 + ($1 - 1) * 3))") || return 1
    before=$(line "$((6 + ($1 - 1) * 3))") || return 1
    target=$(line "$((7 + ($1 - 1) * 3))") || return 1
}
replace_journal() { mv "$journal.tmp" "$journal"; }
header() { printf 'settings-v1\n%s\n%s\n%s\n' "$user" "$1" "$2"; }
intent() {
    awk -v n="$((7 + ($1 - 1) * 3))" -v value="$2" '
        NR == n { $0 = value } { print }
    ' "$journal" > "$journal.tmp" || return 1
    replace_journal
}
phase_to() {
    { header "$consent" "$1"; sed -n '5,$p' "$journal"; } > "$journal.tmp" || return 1
    replace_journal || return 1
    phase=$1
}
active_to() {
    {
        header "$1" active
        i=0
        for key in $keys; do
            i=$((i + 1))
            record "$i" || return 1
            if [ "$2" = target ]; then before=$target; fi
            printf '%s\n%s\n%s\n' "$original" "$before" "$before"
        done
    } > "$journal.tmp" || return 1
    replace_journal || return 1
    consent=$1
    phase=active
}

validate_journal() {
    # Fixed line count and tagged values preserve empty values, literal "null",
    # whitespace and absence separately, without interpreting saved shell text.
    awk -v n="$count" '
        NR == 1 && $0 != "settings-v1" { exit 1 }
        NR == 2 && $0 !~ /^(0|[1-9][0-9]*)$/ { exit 1 }
        NR == 3 && $0 !~ /^(yes|no)$/ { exit 1 }
        NR == 4 && $0 !~ /^(active|pending|rollback|disabling)$/ { exit 1 }
        NR > 4 && $0 != "a" && substr($0, 1, 2) != "v:" { exit 1 }
        END { if (NR != 4 + n * 3) exit 1 }
    ' "$journal" || { fail 'Saved recovery state is invalid; no settings changed.'; return 1; }
    user=$(line 2)
    consent=$(line 3)
    phase=$(line 4)
}

rollback() {
    phase_to rollback || return 1
    failed=0
    i=0
    for key in $keys; do
        i=$((i + 1))
        record "$i" || return 1
        current=$(read_setting "$key") || { failed=1; continue; }
        if [ "$current" = "$before" ]; then
            :
        elif [ "$current" = "$target" ]; then
            verified_write "$key" "$before" || failed=1
        else
            printf 'Preserved external change: %s; recovery state retained.\n' "$key" >&2
            failed=1
        fi
    done
    [ "$failed" = 0 ] || { fail 'Rollback incomplete. Retry or Disable to reconcile saved state.'; return 1; }
    active_to "$consent" before || return 1
    if [ "$consent" = no ]; then rm "$journal" || return 1; fi
    printf 'Previous transaction rolled back and verified.\n'
}

restore() {
    phase_to disabling || return 1
    failed=0
    i=0
    for key in $keys; do
        i=$((i + 1))
        record "$i" || return 1
        current=$(read_setting "$key") || { failed=1; continue; }
        if [ "$current" = "$original" ]; then
            :
        elif [ "$current" = "$before" ] || [ "$current" = "$target" ]; then
            verified_write "$key" "$original" || failed=1
        else
            printf 'Preserved external change: %s.\n' "$key"
        fi
    done
    [ "$failed" = 0 ] || { fail 'Restore incomplete; state retained. Retry Disable.'; return 1; }
    rm "$journal" || return 1
    printf 'Disable complete; owned values restored and verified.\n'
}

settings_control() {
    event=$1
    namespace=$2
    keys=$3
    targets=$4
    count=0
    for key in $keys; do count=$((count + 1)); done
    journal="${PLUGIN_STATE_DIR:?}/settings-state"
    trap 'rm -f "$journal.tmp"' EXIT
    case "$event" in enable|run|boot|disable) ;; *) fail 'Unsupported event'; return 1;; esac
    if [ "$event" = boot ] && [ "${INJECTOR_INPUT_reapply_on_boot:-true}" = false ]; then
        printf 'Reapply after restart is off.\n'
        return 0
    fi
    if [ -f "$journal" ]; then
        validate_journal || return 1
        if [ "$event" = disable ] || [ "$phase" = disabling ]; then
            restore || return 1
            [ "$event" = enable ] || return 0
        elif [ "$phase" = pending ] || [ "$phase" = rollback ]; then
            rollback || return 1
        fi
    fi
    if [ "$event" = disable ]; then
        printf 'Already disabled.\n'
        return 0
    fi
    if [ "$event" != enable ] && { [ ! -f "$journal" ] || [ "$consent" != yes ]; }; then
        printf 'Enable this plugin before applying settings.\n'
        return 0
    fi

    validate_inputs || return 1
    if [ ! -f "$journal" ]; then
        user=0
        if [ "$namespace" = system ]; then
            user=$(am get-current-user) || return 1
            case "$user" in ''|*[!0-9]*) fail 'Could not identify the current Android user'; return 1;; esac
        fi
        consent=no
        phase=active
        {
            header no active
            for key in $keys; do
                original=$(read_setting "$key") || return 1
                printf '%s\n%s\n%s\n' "$original" "$original" "$original"
            done
        } > "$journal.tmp" || return 1
        replace_journal || return 1
    fi

    # Save every before value before the first system write. Preflight all
    # keys first so a conflict does not partially apply a new configuration.
    {
        header "$consent" pending
        i=0
        for key in $keys; do
            i=$((i + 1))
            record "$i" || return 1
            current=$(read_setting "$key") || return 1
            if [ "$current" != "$before" ] && [ "$current" != "$original" ]; then
                fail "External change to $key; Disable to relinquish ownership before enabling again."
                return 1
            fi
            printf '%s\n%s\n%s\n' "$original" "$current" "$current"
        done
    } > "$journal.tmp" || return 1
    replace_journal || return 1

    failed=0
    i=0
    set -- $targets
    for key in $keys; do
        i=$((i + 1))
        record "$i" || return 1
        current=$(read_setting "$key") || { failed=1; break; }
        [ "$current" = "$before" ] || { failed=1; break; }
        target="v:$1"
        shift
        if [ "$current" != "$target" ]; then
            intent "$i" "$target" || return 1
            verified_write "$key" "$target" || { failed=1; break; }
        fi
    done
    # Recheck the entire set, including values that did not need a write.
    if [ "$failed" = 0 ]; then
        i=0
        for key in $keys; do
            i=$((i + 1))
            record "$i" || return 1
            current=$(read_setting "$key") || { failed=1; break; }
            [ "$current" = "$target" ] || { failed=1; break; }
        done
    fi
    if [ "$failed" != 0 ]; then
        rollback || return 1
        fail 'Apply failed; previous values restored. Retry Enable or Run.'
        return 1
    fi
    active_to yes target || return 1
    printf 'Settings applied and read back successfully.\n'
}
