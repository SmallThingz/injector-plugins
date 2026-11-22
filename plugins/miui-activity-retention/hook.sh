#!/system/bin/sh
set -eu
umask 077
case "$INJECTOR_EVENT" in
    enable|disable|configure|inspect-state|inspect-recovery|inspect-update|inspect-inventory|run|boot|interval) ;;
    *) exit 2 ;;
esac
[ "$(id -u)" = 0 ]
cd "$INJECTOR_PLUGIN_DIR"
sha256sum -c payload.sha256 >/dev/null
echo '1380dce81839fc8a6f72449c79a3a5837bd18049bed3e2fcb67f70ae8938d9cf  /system/framework/framework.jar' | sha256sum -c - >/dev/null
cd "$PLUGIN_STATE_DIR"
# The active 0.1 hook uses this same lock and state directory.
if [ "$INJECTOR_EVENT" = inspect-state ] || [ "$INJECTOR_EVENT" = inspect-recovery ] ||
    { [ "$INJECTOR_EVENT" = inspect-update ] && [ "${INJECTOR_RECOVERY_HANDOFF-}" = 1 ]; }; then
    [ -f activity-retention.lock ] && [ ! -L activity-retention.lock ] || {
        echo "Missing or invalid activity-retention lock" >&2
        exit 1
    }
    exec 9<activity-retention.lock
    flock -n 9 9>&9
    CLASSPATH="$INJECTOR_PLUGIN_DIR/activity-lists.jar" \
        exec /system/bin/app_process /system/bin ActivityLists "$INJECTOR_EVENT" "$PLUGIN_STATE_DIR" "${INJECTOR_UPDATE_ID-}" 9<&9
fi
exec 9>>activity-retention.lock
flock -n 9 9>&9
work=$(mktemp -d "$PLUGIN_STATE_DIR/retention.XXXXXXXX")
dex=$work/activity-lists.jar
trap 'rm -f "$dex"; rmdir "$work"' EXIT
cp "$INJECTOR_PLUGIN_DIR/activity-lists.jar" "$dex"
chmod 400 "$dex"
case "$INJECTOR_EVENT" in
    enable|disable|configure|run|boot|interval) echo "MIUI stage: starting worker ($INJECTOR_EVENT)" >&2 ;;
esac
CLASSPATH="$dex" /system/bin/app_process /system/bin ActivityLists "$INJECTOR_EVENT" "$PLUGIN_STATE_DIR" "${INJECTOR_UPDATE_ID-}" 9>&9
