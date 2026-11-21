#!/system/bin/sh
# Bounded phone diagnostics. Only read the current hardware state.
my_read() {
  for n in "$@"; do
    [ -e "$d/$n" ] || continue
    mode=$(stat -c %a "$d/$n" 2>/dev/null) || mode=?
    value=$(head -c 384 "$d/$n" 2>/dev/null) || value=unreadable
    printf '%s %s mode=%s %s\n' "${d##*/}" "$n" "$mode" "$value"
  done
}
printf 'uid=%s firmware=%s boot=%s\n' "$(id -u)" "$(getprop ro.build.fingerprint)" "$(cat /proc/sys/kernel/random/boot_id)"
i=0
for d in /sys/class/power_supply/*; do
  [ -d "$d" ] || continue
  i=$((i+1)); [ "$i" -le 12 ] || break
  printf 'supply %s -> %s\n' "${d##*/}" "$(readlink -f "$d")"
  my_read type online
  [ "$(cat "$d/type" 2>/dev/null)" = Battery ] || continue
  my_read status capacity current_now charge_control_start_threshold charge_control_end_threshold
  my_read charge_behaviour charging_enabled battery_charging_enabled input_suspend
done
i=0
for d in /sys/devices/system/cpu/cpufreq/policy[0-9]*; do
  [ -d "$d" ] || continue
  i=$((i+1)); [ "$i" -le 16 ] || break
  my_read related_cpus scaling_min_freq scaling_max_freq cpuinfo_min_freq cpuinfo_max_freq scaling_available_frequencies scaling_governor scaling_available_governors
  my_read scaling_min_freq scaling_max_freq
done
