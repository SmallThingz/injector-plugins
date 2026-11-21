#!/system/bin/sh
set -eu
umask 077
run=$1
limit=$2
server=$3
cd "$INJECTOR_PLUGIN_DIR"
# exec preserves this identity. Publish it before the injector can reach Android.
statline=$(cat /proc/$$/stat)
set -- ${statline##*) }
[ "$#" -ge 20 ] || exit 1
shift 19
start=$1
case "$start" in ''|*[!0-9]*) exit 1;; esac
printf '%s %s\n' "$$" "$start" > "$run/owner.new"
mv "$run/owner.new" "$run/owner"
export MIUI_STOP_FILE="$run/stop"
exec ./frida-inject --pid "$server" --runtime qjs --script ./agent.js --parameters "{\"limit\":$limit}"
