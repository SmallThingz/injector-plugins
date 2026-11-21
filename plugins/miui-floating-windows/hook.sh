#!/system/bin/sh
set -eu
umask 077
fail() { printf '%s\n' "$*" >&2; exit 1; }
[ "$(id -u)" = 0 ] || fail 'Root required.'
[ "$(getprop sys.boot_completed)" = 1 ] || fail 'Boot incomplete.'
[ "$(getprop ro.product.device)" = amethyst ] &&
[ "$(getprop ro.product.build.fingerprint)" = Xiaomi/amethyst/miproduct:16/BP2A.250605.031.A3/OS3.0.303.0.WOPINXM:user/release-keys ] &&
[ "$(getprop ro.build.version.incremental)" = OS3.0.303.0.WOPINXM ] &&
[ "$(getprop ro.build.version.sdk)" = 36 ] &&
[ "$(getprop ro.product.cpu.abi)" = arm64-v8a ] || fail 'Unsupported firmware or ABI.'
case "$INJECTOR_EVENT" in enable|run|disable) ;; *) fail 'Unsupported hook event.' ;; esac
limit=${INJECTOR_INPUT_limit-3}
if [ "$INJECTOR_EVENT" != disable ]; then
  case "$limit" in ''|0*|*[!0-9]*) fail 'Invalid limit.' ;; esac
  [ "${#limit}" -le 3 ] && [ "$limit" -ge 3 ] && [ "$limit" -le 256 ] || fail 'Invalid limit.'
fi
cd "$PLUGIN_STATE_DIR"
exec 9>lock
flock -n 9 9>&9 || fail 'Lifecycle lock unavailable or busy.'
boot=$(cat /proc/sys/kernel/random/boot_id)
[ -n "$boot" ] || fail 'Boot identity unavailable.'
owned() {
  [ -f "$run/owner" ] && read -r pid ticks extra < "$run/owner" || return 1
  case "$pid" in ''|0*|*[!0-9]*) return 1 ;; esac
  case "$ticks" in ''|*[!0-9]*) return 1 ;; esac
  [ -z "$extra" ] || return 1
  line=$(cat "/proc/$pid/stat" 2>/dev/null) || return 1
  set -- ${line##*) }
  [ "$#" -ge 20 ] && [ "$1" != Z ] || return 1
  shift 19
  [ "$1" = "$ticks" ]
}
receipt() { grep -Fxq "$1" "$run/log" 2>/dev/null; }
finished() { receipt MIUI_DISPOSED_DETACHED || receipt MIUI_NO_AGENT; }
diagnostic() { tail -c 1024 "$run/log" >&2 || :; }
if [ -e current ]; then
  name=$(cat current)
  case "$name" in run.*) ;; *) fail 'Invalid session marker.' ;; esac
  case "${name#run.}" in ''|*[!A-Za-z0-9]*) fail 'Invalid session identifier.' ;; esac
  run="$PLUGIN_STATE_DIR/$name"
  [ -s "$run/boot" ] || fail 'Session metadata incomplete.'
  if [ "$(cat "$run/boot")" != "$boot" ]; then
    rm current
  else
    if owned; then
      if [ "$INJECTOR_EVENT" != disable ] && [ "$(cat "$run/limit")" = "$limit" ] &&
          [ ! -e "$run/stop" ] && receipt MIUI_READY && ! receipt MIUI_SESSION_LOST && ! finished; then
        echo "Cap $limit already active (agent receipt)."; exit 0
      fi
      # This unique directory is watched only by its original injector. No PID signal.
      : > "$run/stop"
      i=0
      while owned && [ "$i" -lt 16 ]; do sleep 1; i=$((i + 1)); done
    fi
    if owned || ! finished; then diagnostic; fail 'Prior session outcome unknown. Ownership marker retained.'; fi
    rm current
  fi
fi
if [ "$INJECTOR_EVENT" = disable ]; then echo 'No outstanding owned override.'; exit 0; fi
server=$(pidof system_server) || fail 'Window manager unavailable.'
case "$server" in ''|0*|*[!0-9]*) fail 'Expected one system_server.' ;; esac
(cd "$INJECTOR_PLUGIN_DIR" && sha256sum -c payload.sha256 && chmod 700 frida-inject) || fail 'Payload verification failed.'
run=$(mktemp -d "$PLUGIN_STATE_DIR/run.XXXXXXXX")
printf '%s\n' "$boot" > "$run/boot"
printf '%s\n' "$limit" > "$run/limit"
printf '%s\n' "${run##*/}" > current.new
mv current.new current
nohup sh "$INJECTOR_PLUGIN_DIR/worker.sh" "$run" "$limit" "$server" 9>&- </dev/null >"$run/log" 2>&1 &
i=0
while [ "$i" -lt 25 ]; do
  if receipt MIUI_READY && owned && ! receipt MIUI_SESSION_LOST && ! finished; then echo "Agent acknowledged cap $limit."; exit 0; fi
  if finished || { [ -e "$run/owner" ] && ! owned; }; then diagnostic; fail 'Startup failed. See session receipt.'; fi
  sleep 1; i=$((i + 1))
done
: > "$run/stop"
diagnostic
fail 'Startup unconfirmed. Graceful stop requested for this session.'
