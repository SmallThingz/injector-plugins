#!/usr/bin/env bash
# Exercise the wrapper up to flock, using host-only caller/firmware fixtures.
set -euo pipefail
plugin=$(cd "$(dirname "$0")/.." && pwd)
work=${1:?scratch directory required}
mkdir -p "$work/bin" "$work/state"
work=$(cd "$work" && pwd)
cat > "$work/bin/id" <<'MOCK'
#!/bin/sh
echo 0
MOCK
cat > "$work/bin/sha256sum" <<'MOCK'
#!/bin/sh
if [ "$2" = "-" ]; then cat >/dev/null; else exec "$REAL_SHA" "$@"; fi
MOCK
cat > "$work/bin/flock" <<'MOCK'
#!/bin/sh
echo reached > "$PLUGIN_STATE_DIR/flock-called"
exit 1
MOCK
chmod +x "$work/bin/"*
REAL_SHA=$(command -v sha256sum)
export REAL_SHA
export INJECTOR_PLUGIN_DIR="$plugin" PLUGIN_STATE_DIR="$work/state"
export PATH="$work/bin:$PATH"
check() {
    local expected=$1
    rm -f "$PLUGIN_STATE_DIR/flock-called"
    if sh "$plugin/hook.sh"; then echo 'Unexpected hook success' >&2; exit 1; fi
    if [[ -e "$PLUGIN_STATE_DIR/flock-called" ]]; then actual=open; else actual=rejected; fi
    [[ "$actual" = "$expected" ]] || { echo "Lock expected $expected, got $actual" >&2; exit 1; }
}
cd "$PLUGIN_STATE_DIR"
export INJECTOR_EVENT=inspect-recovery
mkdir activity-retention.lock
check rejected
rmdir activity-retention.lock
mkfifo activity-retention.lock
# Keep both ends open so a broken wrapper reaches the sentinel instead of hanging.
exec 8<>activity-retention.lock
check rejected
exec 8>&-
rm activity-retention.lock
touch regular
ln -s regular activity-retention.lock
check rejected
rm activity-retention.lock
check rejected
mv regular activity-retention.lock
check open
echo "Inspection lock admission checks passed"

# Use the real host flock and inspect the descriptor from a separate worker process.
rm "$work/bin/flock"
cat > "$work/bin/worker" <<'WORKER'
#!/usr/bin/env python3
import fcntl
import os
from pathlib import Path

lock = Path(os.environ["PLUGIN_STATE_DIR"]) / "activity-retention.lock"
assert os.path.samestat(os.fstat(9), lock.stat())
with lock.open("rb") as contender:
    try:
        fcntl.flock(contender, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        pass
    else:
        raise AssertionError("worker did not hold the controller lock")
WORKER
chmod +x "$work/bin/worker"
sed 's@/system/bin/app_process@worker@g' "$plugin/hook.sh" > "$work/check-worker.sh"
for INJECTOR_EVENT in enable inspect-recovery; do
    sh "$work/check-worker.sh"
    flock -n activity-retention.lock true
done
echo "Worker inherited FD9 and released its lock on exit"
