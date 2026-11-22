#!/system/bin/sh
set -eu
umask 077
case "$INJECTOR_EVENT" in enable|disable) ;; *) exit 2;; esac
[ "$(id -u)" = 0 ]
if [ "$INJECTOR_EVENT" = enable ]; then [ "$(am get-current-user)" = 0 ]; fi
cd "$INJECTOR_PLUGIN_DIR"
sha256sum -c payload.sha256 >/dev/null
echo '1380dce81839fc8a6f72449c79a3a5837bd18049bed3e2fcb67f70ae8938d9cf  /system/framework/framework.jar' | sha256sum -c - >/dev/null
cd "$PLUGIN_STATE_DIR"
exec 9>activity-retention.lock
flock -n 9 9>&9
work=$(mktemp -d "$PLUGIN_STATE_DIR/retention.XXXXXXXX")
dex=$work/activity-lists.jar
trap 'rm -f "$dex"; rmdir "$work"' EXIT
cp "$INJECTOR_PLUGIN_DIR/activity-lists.jar" "$dex"
chmod 400 "$dex"
CLASSPATH="$dex" timeout -k 2 40 /system/bin/app_process /system/bin ActivityLists "$INJECTOR_EVENT" "$PLUGIN_STATE_DIR" "${INJECTOR_INPUT_activities-}"
