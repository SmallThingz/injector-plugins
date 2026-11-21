#!/system/bin/sh
set -eu
umask 077
export LC_ALL=C
cpufreq=/sys/devices/system/cpu/cpufreq
boot_file=/proc/sys/kernel/random/boot_id

fail() { echo "$*" >&2; exit 1; }
[ "$(id -u)" = 0 ] || fail 'CPU frequency control requires authorized root.'
case ${INJECTOR_EVENT:?} in enable|run|disable) ;; *) fail 'Unknown hook event.' ;; esac
boot=$(cat "$boot_file")
case $boot in ''|*[!0-9a-f-]*) fail 'Cannot identify this boot.' ;; esac
state=${PLUGIN_STATE_DIR:?}/cpu-$boot
mkdir -p "$state"
exec 9>"$state/lock"
flock -n 9 9>&9 || fail 'Another CPU frequency operation is in progress.'
active=$state/active
stage=$state/stage
pending=$state/pending

frequency() {
    case $1 in ''|0*|*[!0-9]*) return 1 ;; esac
    [ "${#1}" -le 9 ]
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

write_value() {
    local dir=$1 node=$2 expected=$3 target=$4
    valid_target "$dir" "$node" "$target" &&
        [ "$(cat "$dir/$node")" = "$expected" ] &&
        printf '%s\n' "$target" > "$dir/$node" &&
        [ "$(cat "$dir/$node")" = "$target" ]
}

# Moving next over active commits the entire transaction. While next exists,
# active still describes the preceding successful run, even after process death.
recover() {
    local idx policy node before target current failed=0
    [ -d "$pending" ] || return 0
    if [ -f "$pending/next" ]; then
        while read -r idx policy node before target; do
            [ -f "$pending/attempt.$idx" ] || continue
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

mkdir -p "$stage"
rm -rf "$stage/retired"
recover || fail 'CPU control recovery is incomplete.'
rm -rf "$stage"
mkdir -p "$stage/new"
[ -f "$active" ] || : > "$active"
: > "$stage/new/next"
: > "$stage/new/plan"
: > "$stage/new/verify"

# Each active row is policy, attribute, original value, last confirmed value.
# Treat a broken journal as an error before interpreting any of its values.
awk 'NF!=4 || $1 !~ /^policy(0|4|7)$/ || seen[$1,$2]++ {exit 1}
     $2=="scaling_max_freq" && $3 ~ /^[1-9][0-9]*$/ && $4 ~ /^[1-9][0-9]*$/ {next}
     $2=="scaling_governor" && $3 ~ /^[a-zA-Z0-9_-]+$/ && $4 ~ /^[a-zA-Z0-9_-]+$/ {next}
     {exit 1}' "$active" || fail 'Invalid CPU frequency restore journal.'

plan_field() {
    local policy=$1 cpus=$2 node=$3 choice=$4 dir=$cpufreq/$1
    local saved original applied current wanted low high
    saved=$(awk -v p="$policy" -v n="$node" '$1==p && $2==n {print $3, $4}' "$active")
    if [ "$INJECTOR_EVENT" = disable ]; then choice=system; fi
    if [ "$choice" = system ] && [ -z "$saved" ]; then return; fi
    [ "$(awk '{$1=$1; print}' "$dir/related_cpus")" = "$cpus" ] || fail "CPU membership changed or $policy is unavailable."
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
        *) if [ "$node" = scaling_governor ]; then
               wanted=$choice
           else
               low=$(cat "$dir/scaling_min_freq") && high=$(cat "$dir/cpuinfo_max_freq") || fail "Cannot read $policy frequency limits."
               frequency "$low" && frequency "$high" || fail "Invalid $policy frequency limits."
               wanted=$(awk -v base="$original" -v pct="$choice" -v low="$low" -v high="$high" '
                   {for (i=1;i<=NF;i++) {
                       if ($i !~ /^[1-9][0-9]*$/) exit 1
                       f=$i+0; if (f>=low && f<=high && f*100<=base*pct && f>best) best=f
                   }} END {if (!best) exit 1; printf "%.0f", best}' "$dir/scaling_available_frequencies") ||
                   fail "No listed $policy frequency fits $choice% of $original kHz at or above $low kHz."
           fi ;;
    esac
    valid_target "$dir" "$node" "$wanted" || fail "$policy/$node does not currently support $wanted."
    if [ "$current" != "$wanted" ]; then
        valid_target "$dir" "$node" "$current" || fail "Cannot safely restore $policy/$node to $current."
        [ -w "$dir/$node" ] || fail "Cannot write $policy/$node."
        printf '%s %s %s %s\n' "$policy" "$node" "$current" "$wanted" >> "$stage/new/plan"
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
    local gov=$3 pct=$4
    if [ "$INJECTOR_EVENT" != disable ]; then
        case $gov in ''|*[!a-zA-Z0-9_-]*) fail 'Invalid governor.' ;; esac
        frequency "$pct" && [ "$pct" -le 100 ] || fail 'Frequency ceiling must be 1 to 100 percent.'
    fi
    [ "$pct" != 100 ] || pct=system
    plan_field "$1" "$2" scaling_max_freq "$pct"
    plan_field "$1" "$2" scaling_governor "$gov"
}
plan_policy policy0 '0 1 2 3' "${INJECTOR_INPUT_policy0_governor-system}" "${INJECTOR_INPUT_policy0_percent-100}"
plan_policy policy4 '4 5 6' "${INJECTOR_INPUT_policy4_governor-system}" "${INJECTOR_INPUT_policy4_percent-100}"
plan_policy policy7 '7' "${INJECTOR_INPUT_policy7_governor-system}" "${INJECTOR_INPUT_policy7_percent-100}"
awk '{row[NR]=$0} END {for (i=NR;i>0;i--) print i, row[i]}' "$stage/new/plan" > "$stage/new/reverse"
mv "$stage/new" "$pending"
trap 'recover || echo "Recovery journal retained for retry." >&2' EXIT
trap 'exit 1' HUP INT TERM
idx=0
while read -r policy node before target; do
    idx=$((idx+1))
    dir=$cpufreq/$policy
    [ "$(cat "$dir/$node")" = "$before" ] || fail "$policy/$node changed before apply."
    : > "$pending/attempt.$idx"
    write_value "$dir" "$node" "$before" "$target" || fail "Write or readback failed for $policy/$node."
done < "$pending/plan"
# Verify restored values too, since those fields will leave the active journal.
while read -r policy node target; do
    current=$(cat "$cpufreq/$policy/$node") || fail "Cannot verify $policy/$node."
    [ "$current" = "$target" ] || fail "$policy/$node changed during apply."
done < "$pending/verify"
mv "$pending/next" "$active"
echo 'CPU frequency settings confirmed.'
