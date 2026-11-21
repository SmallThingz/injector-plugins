#!/system/bin/sh
set -eu
umask 077
export LC_ALL=C
cpufreq=/sys/devices/system/cpu/cpufreq
boot_file=/proc/sys/kernel/random/boot_id

fail() { echo "$*" >&2; exit 1; }
[ "$(id -u)" = 0 ] || fail 'CPU frequency control requires authorized root.'
case ${INJECTOR_EVENT:?} in enable|run|disable|probe) ;; *) fail 'Unknown hook event.' ;; esac
boot=$(cat "$boot_file")
case $boot in ''|*[!0-9a-f-]*) fail 'Cannot identify this boot.' ;; esac
state=${PLUGIN_STATE_DIR:?}/cpu-$boot
active=$state/active
stage=$state/stage
pending=$state/pending

frequency() {
    case $1 in ''|0*|*[!0-9]*) return 1 ;; esac
    [ "${#1}" -le 9 ]
}

same_policy() {
    local dir=$1 cpus
    case ${dir##*/} in
        policy0) cpus='0 1 2 3' ;;
        policy4) cpus='4 5 6' ;;
        policy7) cpus='7' ;;
        *) return 1 ;;
    esac
    [ "$(awk '{$1=$1; print}' "$dir/related_cpus" 2>/dev/null)" = "$cpus" ]
}

writable_attribute() {
    local mode
    [ -f "$1" ] && [ ! -L "$1" ] && [ -w "$1" ] || return 1
    mode=$(stat -c %a "$1") || return 1
    # Root can pass test -w for a read-only sysfs attribute.
    case $mode in *[2367][0-7][0-7]) return 0 ;; esac
    return 1
}

read_frequency_table() {
    awk -v low="$2" -v high="$3" -v format="$4" '
        {for (i=1;i<=NF;i++) {
            if ($i !~ /^[1-9][0-9]*$/ || length($i)>9) exit 1
            f=$i+0
            if (f<low || f>high) continue
            if (format=="choices" && !seen[f]++) {printf "%s%s", separator, $i; separator=","}
            if (f>best) best=f
        }} END {if (format=="ceiling") {if (!best) exit 1; printf "%.0f", best}}' "$1/scaling_available_frequencies"
}

valid_target() {
    local dir=$1 node=$2 target=$3 low high
    case $node in
        scaling_governor)
            awk -v wanted="$target" '{for (i=1;i<=NF;i++) if ($i==wanted) found=1} END {exit !found}' "$dir/scaling_available_governors" ;;
        scaling_max_freq)
            low=$(cat "$dir/scaling_min_freq") && high=$(cat "$dir/cpuinfo_max_freq") &&
                frequency "$low" && frequency "$high" && frequency "$target" &&
                [ "$target" -ge "$low" ] && [ "$target" -le "$high" ] ;;
        *) return 1 ;;
    esac
}

has_supported_policy() {
    local policy dir current low
    for policy in policy0 policy4 policy7; do
        dir=$cpufreq/$policy
        same_policy "$dir" || continue
        if writable_attribute "$dir/scaling_governor" &&
            current=$(cat "$dir/scaling_governor") &&
            valid_target "$dir" scaling_governor "$current"; then
            return 0
        fi
        if writable_attribute "$dir/scaling_max_freq" &&
            current=$(cat "$dir/scaling_max_freq") && low=$(cat "$dir/scaling_min_freq") &&
            frequency "$low" && valid_target "$dir" scaling_max_freq "$current" &&
            read_frequency_table "$dir" "$low" "$current" ceiling >/dev/null 2>&1; then
            return 0
        fi
    done
    return 1
}

validate_active() {
    # Each row is policy, attribute, original value, last confirmed value.
    awk 'NF!=4 || $1 !~ /^policy(0|4|7)$/ || seen[$1,$2]++ {exit 1}
         $2=="scaling_max_freq" && $3 ~ /^[1-9][0-9]*$/ && $4 ~ /^[1-9][0-9]*$/ {next}
         $2=="scaling_governor" && $3 ~ /^[a-zA-Z0-9_-]+$/ && $4 ~ /^[a-zA-Z0-9_-]+$/ {next}
         {exit 1}' "$active" || fail 'Invalid CPU frequency restore journal.'
}

saved_values() {
    [ -f "$active" ] || return 0
    awk -v p="$1" -v n="$2" '$1==p && $2==n {print $3, $4}' "$active"
}

probe_governors() {
    local dir=$1 current saved original
    writable_attribute "$dir/scaling_governor" &&
        current=$(cat "$dir/scaling_governor") &&
        saved=$(saved_values "${dir##*/}" scaling_governor) || return 1
    case $current in ''|*[!a-zA-Z0-9_-]*) return 1 ;; esac
    original=$current
    if [ -n "$saved" ]; then
        [ "$current" = "${saved#* }" ] || return 1
        original=${saved% *}
    fi
    valid_target "$dir" scaling_governor "$original" && valid_target "$dir" scaling_governor "$current" ||
        return 1
    awk '{for (i=1;i<=NF;i++) {
        if ($i !~ /^[a-zA-Z0-9_-]+$/) exit 1
        if ($i!="system" && !seen[$i]++) {printf "%s\"%s\"", separator, $i; separator=","}
    }}' "$dir/scaling_available_governors"
}

probe_frequency_fields() {
    local dir=$1 low current hardware saved original second_low second_max high choices=
    low=$(cat "$dir/scaling_min_freq") && current=$(cat "$dir/scaling_max_freq") &&
        hardware=$(cat "$dir/cpuinfo_max_freq") &&
        saved=$(saved_values "${dir##*/}" scaling_max_freq) &&
        second_low=$(cat "$dir/scaling_min_freq") && second_max=$(cat "$dir/scaling_max_freq") ||
        return 1
    frequency "$low" && frequency "$current" && frequency "$hardware" && frequency "$second_low" &&
        [ "$current" = "$second_max" ] || return 1
    [ "$second_low" -le "$low" ] || low=$second_low
    original=$current
    if [ -n "$saved" ]; then
        original=${saved% *}
        if [ "$current" != "${saved#* }" ]; then original=; fi
    fi
    if frequency "$original" && [ "$current" -ge "$low" ] && [ "$current" -le "$hardware" ] &&
        writable_attribute "$dir/scaling_max_freq"; then
        high=$original
        [ "$hardware" -ge "$high" ] || high=$hardware
        choices=$(read_frequency_table "$dir" "$low" "$high" choices) || choices=
    fi
    printf '"maxKHz":[%s],"minKHz":%s,"currentMaxKHz":%s' "$choices" "$low" "$current"
}

probe_cpu() {
    local policy dir governors frequencies separator=
    [ ! -e "$pending" ] || fail 'CPU frequency recovery is pending.'
    if [ -e "$active" ]; then
        [ -f "$active" ] && [ ! -L "$active" ] || fail 'Invalid CPU frequency restore journal.'
        validate_active
    fi
    printf '{"version":1,"policies":['
    for policy in policy0 policy4 policy7; do
        dir=$cpufreq/$policy
        same_policy "$dir" || continue
        governors=$(probe_governors "$dir" 2>/dev/null) || governors=
        frequencies=$(probe_frequency_fields "$dir" 2>/dev/null) ||
            frequencies='"maxKHz":[],"minKHz":null,"currentMaxKHz":null'
        printf '%s{"id":"%s","governors":[%s],%s}' "$separator" "$policy" "$governors" "$frequencies"
        separator=,
    done
    printf ']}\n'
}

if [ "$INJECTOR_EVENT" = probe ]; then
    probe_cpu
    exit 0
fi

write_value() {
    local dir=$1 node=$2 expected=$3 target=$4 listed=${5:-} attempt=${6:-} step
    same_policy "$dir" && [ "$(cat "$dir/$node")" = "$expected" ] &&
        writable_attribute "$dir/$node" || return 1
    if [ "$listed" = listed ]; then
        step=$(read_frequency_table "$dir" "$target" "$target" ceiling) && [ "$step" = "$target" ] || return 1
    fi
    valid_target "$dir" "$node" "$target" || return 1
    # Record intent only after the pre-write checks pass.
    [ -z "$attempt" ] || : > "$attempt" || return 1
    printf '%s\n' "$target" > "$dir/$node" &&
        [ "$(cat "$dir/$node")" = "$target" ] &&
        valid_target "$dir" "$node" "$target"
}

# Moving next over active commits the entire transaction. While next exists,
# active still describes the preceding successful run, even after process death.
recover() {
    local idx policy node before target listed current failed=0
    [ -d "$pending" ] || return 0
    if [ -f "$pending/next" ]; then
        while read -r idx policy node before target listed; do
            [ -f "$pending/attempt.$idx" ] || continue
            if ! same_policy "$cpufreq/$policy"; then
                echo "Cannot restore $policy/$node after CPU membership changed." >&2
                failed=1
                continue
            fi
            current=$(cat "$cpufreq/$policy/$node") || { failed=1; continue; }
            if [ "$current" = "$target" ]; then
                if ! write_value "$cpufreq/$policy" "$node" "$target" "$before"; then
                    echo "Could not roll back $policy/$node. Retry the hook." >&2
                    failed=1
                    continue
                fi
            elif [ "$current" != "$before" ]; then
                echo "Preserved changed $policy/$node ($current) during rollback." >&2
            fi
            rm "$pending/attempt.$idx" || return 1
        done < "$pending/reverse"
        [ "$failed" = 0 ] || return 1
    fi
    # Keep a complete journal discoverable until all recovery work is finished.
    mv "$pending" "$stage/retired" || return 1
    rm -rf "$stage/retired"
}

mkdir -p "$state"
exec 9>"$state/lock"
flock -n 9 9>&9 || fail 'Another CPU frequency operation is in progress.'
mkdir -p "$stage"
rm -rf "$stage/retired"
recover || fail 'CPU control recovery is incomplete.'
rm -rf "$stage"
mkdir -p "$stage/new"
[ -f "$active" ] || : > "$active"
: > "$stage/new/next"
: > "$stage/new/plan"
: > "$stage/new/verify"

validate_active

plan_field() {
    local policy=$1 node=$2 choice=$3 dir=$cpufreq/$1
    local saved original applied current wanted low high upper listed=-
    saved=$(saved_values "$policy" "$node")
    if [ "$INJECTOR_EVENT" = disable ]; then choice=system; fi
    if [ "$choice" = system ] && [ -z "$saved" ]; then return; fi
    same_policy "$dir" || fail "$policy is unavailable or has unsupported CPU membership."
    current=$(cat "$dir/$node") || fail "Cannot read $policy/$node."
    case $node in
        scaling_max_freq) frequency "$current" || fail "Invalid $policy maximum frequency." ;;
        scaling_governor) case $current in ''|*[!a-zA-Z0-9_-]*) fail "Invalid $policy governor." ;; esac ;;
    esac
    original=$current
    if [ -n "$saved" ]; then
        original=${saved% *}
        applied=${saved#* }
        if [ "$current" != "$applied" ]; then
            [ "$choice" = system ] || fail "$policy/$node changed to $current externally. Disable to release its saved setting."
            echo "Preserved external $policy/$node ($current)."
            return
        fi
    fi
    case $choice in
        system) wanted=$original ;;
        khz:*|pct:*)
            low=$(cat "$dir/scaling_min_freq") && high=$(cat "$dir/cpuinfo_max_freq") ||
                fail "Cannot read $policy frequency limits."
            frequency "$low" && frequency "$high" && frequency "$original" ||
                fail "Invalid $policy frequency limits."
            [ -r "$dir/scaling_available_frequencies" ] ||
                fail "$policy does not expose a readable frequency table."
            [ "$high" -le "$original" ] || high=$original
            if [ "${choice%%:*}" = khz ]; then
                wanted=${choice#*:}
                [ "$wanted" -ge "$low" ] && [ "$wanted" -le "$high" ] ||
                    fail "$policy ceiling $wanted kHz does not fit the live minimum of $low kHz and ceiling of $high kHz."
                upper=$(read_frequency_table "$dir" "$wanted" "$wanted" ceiling) && [ "$upper" = "$wanted" ] ||
                    fail "$policy does not list $wanted kHz."
            else
                upper=$((original * ${choice#*:} / 100))
                [ "$upper" -le "$high" ] || upper=$high
                wanted=$(read_frequency_table "$dir" "$low" "$upper" ceiling) ||
                    fail "No listed $policy frequency fits ${choice#*:}% of $original kHz at or above $low kHz."
            fi
            listed=listed
            ;;
        *) wanted=$choice ;;
    esac
    valid_target "$dir" "$node" "$wanted" || fail "$policy/$node does not currently support $wanted."
    if [ "$current" != "$wanted" ]; then
        valid_target "$dir" "$node" "$current" || fail "Cannot safely restore $policy/$node to $current."
        writable_attribute "$dir/$node" || fail "$policy/$node is read-only or inaccessible."
        printf '%s %s %s %s %s\n' "$policy" "$node" "$current" "$wanted" "$listed" >> "$stage/new/plan"
    fi
    if [ "$wanted" != "$original" ]; then
        printf '%s %s %s %s\n' "$policy" "$node" "$original" "$wanted" >> "$stage/new/next"
    fi
    printf '%s %s %s\n' "$policy" "$node" "$wanted" >> "$stage/new/verify"
    case $node in
        scaling_max_freq) echo "$policy maximum frequency requested: $wanted kHz" ;;
        scaling_governor) echo "$policy governor requested: $wanted" ;;
    esac
}

plan_policy() {
    local policy=$1 gov=$2 pct=$3 cap=$4 choice=system
    if [ "$INJECTOR_EVENT" != disable ]; then
        case $gov in ''|*[!a-zA-Z0-9_-]*) fail 'Invalid governor.' ;; esac
        case $cap in
            system) ;;
            legacy)
                frequency "$pct" && [ "$pct" -le 100 ] || fail 'Frequency ceiling must be 1 to 100 percent.'
                [ "$pct" = 100 ] || choice=pct:$pct
                ;;
            *)
                frequency "$cap" || fail "$policy ceiling must be a whole number in kHz."
                choice=khz:$cap
                ;;
        esac
    fi
    plan_field "$policy" scaling_max_freq "$choice"
    plan_field "$policy" scaling_governor "$gov"
}
plan_policy policy0 "${INJECTOR_INPUT_policy0_governor-system}" "${INJECTOR_INPUT_policy0_percent-100}" "${INJECTOR_INPUT_policy0_max_khz-legacy}"
plan_policy policy4 "${INJECTOR_INPUT_policy4_governor-system}" "${INJECTOR_INPUT_policy4_percent-100}" "${INJECTOR_INPUT_policy4_max_khz-legacy}"
plan_policy policy7 "${INJECTOR_INPUT_policy7_governor-system}" "${INJECTOR_INPUT_policy7_percent-100}" "${INJECTOR_INPUT_policy7_max_khz-legacy}"
if [ "$INJECTOR_EVENT" != disable ] && [ ! -s "$active" ] && [ ! -s "$stage/new/verify" ]; then
    has_supported_policy || fail 'No usable CPU frequency controls were found for the amethyst policy layout.'
    printf '%s\n' 'CPU policies are using system settings.'
    exit 0
fi
awk '{row[NR]=$0} END {for (i=NR;i>0;i--) print i, row[i]}' "$stage/new/plan" > "$stage/new/reverse"
mv "$stage/new" "$pending"
trap 'recover || echo "Recovery journal retained for retry." >&2' EXIT
trap 'exit 1' HUP INT TERM
idx=0
while read -r policy node before target listed; do
    idx=$((idx+1))
    dir=$cpufreq/$policy
    [ "$(cat "$dir/$node")" = "$before" ] || fail "$policy/$node changed before apply."
    write_value "$dir" "$node" "$before" "$target" "$listed" "$pending/attempt.$idx" ||
        fail "Write or readback failed for $policy/$node. Its live limits or support may have changed."
done < "$pending/plan"
# Verify restored values too, since those fields will leave the active journal.
while read -r policy node target; do
    current=$(cat "$cpufreq/$policy/$node") || fail "Cannot verify $policy/$node."
    [ "$current" = "$target" ] || fail "$policy/$node changed during apply."
done < "$pending/verify"
mv "$pending/next" "$active"
echo 'CPU frequency settings confirmed.'
