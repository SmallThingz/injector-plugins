"""Linux pipe and fake-sysfs tests; never run the Android executable on a device."""
import os
from pathlib import Path
import select
import shutil
import signal
import subprocess
import time
import tempfile
import unittest

HERE = Path(__file__).resolve().parent
BIN = HERE / 'target/debug/native-charge'
SHELL = HERE.parent
FW = 'Redmi/amethyst_in/amethyst:16/BP2A.250605.031.A3/OS3.0.303.0.WOPINXM:user/release-keys'
SESSION = '59abe231-7d1a-49d6-b090-127589b56712'
REL = 'platform/soc/soc:qcom,pmic_glink/soc:qcom,pmic_glink:qcom,battery_charger/power_supply/battery'
# Source the unmodified adapter. Redirect just discovery roots and root identity.
REFERENCE = """
set -eu
id() { printf '0\\n'; }
. "$INJECTOR_PLUGIN_DIR/thresholds.sh"
. "$INJECTOR_PLUGIN_DIR/session.sh"
. "$INJECTOR_PLUGIN_DIR/input-suspend.sh"
firmware=$suspend_firmware
event=$INJECTOR_EVENT
if [ "$event" = disable ]; then read_session_contract; event=recover; fi
suspend_charge_limit "$event" "$CHARGE_TEST_ROOT/sys/class/power_supply" "$CHARGE_TEST_ROOT/sys/devices" \
 "$CHARGE_TEST_ROOT/sys/class/qcom-battery" "$PLUGIN_STATE_DIR" "$firmware" /proc/sys/kernel/random/boot_id
if [ "$event" = recover ]; then printf 'RESTORED %s\\n' "$monitor_session"; fi
"""

class MonitorTest(unittest.TestCase):
    def setUp(self):
        t = tempfile.TemporaryDirectory()
        self.addCleanup(t.cleanup)
        self.root = Path(t.name)
        self.state = self.root / 'state'
        self.state.mkdir()
        battery = self.root / 'sys/devices' / REL
        battery.mkdir(parents=True)
        self.link = self.root / 'sys/class/power_supply/battery'
        self.link.parent.mkdir(parents=True)
        self.link.symlink_to(battery)
        (battery / 'type').write_text('Battery\n')
        self.cap = battery / 'capacity'
        self.cap.write_text('80\n')
        self.node = self.root / 'sys/class/qcom-battery/input_suspend'
        self.node.parent.mkdir(parents=True)
        self.node.write_text('0\n')
        (self.root / 'fingerprint').write_text(FW)
        self.env = dict(os.environ, CHARGE_TEST_ROOT=str(self.root), PLUGIN_STATE_DIR=str(self.state),
                        INJECTOR_EVENT='monitor', INJECTOR_SESSION_ID=SESSION,
                        INJECTOR_SESSION_LEASE_SECONDS='15', INJECTOR_SESSION_PROTOCOL='stdin-lease-v1',
                        INJECTOR_PLUGIN_DIR=str(SHELL))
        self.journal = self.state / 'input-suspend-state'
        self.receipt = self.state / 'input-suspend-restored'

    def launch(self, cmd=None):
        p = subprocess.Popen(cmd or [BIN], env=self.env, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                             stderr=subprocess.PIPE, bufsize=0)
        def close():
            if p.poll() is None:
                p.kill()
                p.wait(timeout=3)
            for stream in (p.stdout, p.stderr, p.stdin):
                stream.close()
        self.addCleanup(close)
        return p

    def frame(self, p, expected, timeout=4):
        self.assertTrue(select.select([p.stdout], [], [], timeout)[0], expected)
        self.assertEqual(p.stdout.readline(), (expected + '\n').encode())

    def heartbeat(self, p, seq):
        p.stdin.write(f'HEARTBEAT {SESSION} {seq}\n'.encode())
        if seq == 1:
            self.frame(p, f'READY {SESSION}')
        self.frame(p, f'ACK {SESSION} {seq}')

    def stop(self, p):
        p.stdin.write(f'STOP {SESSION}\n'.encode())
        self.frame(p, f'RESTORED {SESSION}')
        self.assertEqual(p.wait(timeout=2), 0)

    def recover(self):
        env = dict(self.env, INJECTOR_EVENT='disable')
        return subprocess.run(['bash','-c',REFERENCE], env=env, capture_output=True, timeout=3)

    def test_reference_parity(self):
        receipts = []
        for cmd in (['bash','-c',REFERENCE], [BIN]):
            p = self.launch(cmd)
            for seq, (capacity, expected) in enumerate([(80,1),(78,1),(75,0),(78,0),(80,1)], 1):
                self.cap.write_text(f'{capacity}\n')
                self.heartbeat(p, seq)
                self.assertEqual(self.node.read_text(), f'{expected}\n')
            self.stop(p)
            lines = self.receipt.read_text().splitlines()
            self.assertRegex(lines[8], r'^[a-f0-9-]{36}$')
            receipts.append(lines[:8])
            self.assertEqual(self.node.read_text(), '0\n')
            self.assertFalse(self.journal.exists())
        self.assertEqual(*receipts)

    def test_fragmented_and_coalesced(self):
        p = self.launch()
        p.stdin.write(b'HEART')
        p.stdin.write(f'BEAT {SESSION} 1\nHEARTBEAT {SESSION} 2\n'.encode())
        for frame in [f'READY {SESSION}', f'ACK {SESSION} 1', f'ACK {SESSION} 2']:
            self.frame(p, frame)
        self.stop(p)

    def test_partial_frame_expires(self):
        p = self.launch()
        self.heartbeat(p, 1)
        p.stdin.write(b'HEART')
        self.frame(p, f'RESTORED {SESSION}', 17)
        self.assertEqual(p.wait(timeout=2), 0)
        self.assertEqual(self.node.read_text(), '0\n')

    def test_signal_eof_and_invalid_frames(self):
        for end in (signal.SIGTERM, None, b'x'*64, b'bad\x00', f'HEARTBEAT {SESSION} 1\n'.encode()):
            with self.subTest(end=end):
                p = self.launch()
                self.heartbeat(p, 1)
                if end is None:
                    p.stdin.close()
                elif isinstance(end, bytes):
                    p.stdin.write(end)
                else:
                    p.send_signal(end)
                self.frame(p, f'RESTORED {SESSION}')
                self.assertEqual(p.wait(timeout=2), 0 if end is None else 1)
                self.assertEqual(self.node.read_text(), '0\n')

    def test_duplicate_launch(self):
        p = self.launch()
        self.heartbeat(p, 1)
        journal = self.journal.read_bytes()
        duplicate = self.launch()
        self.assertNotEqual(duplicate.wait(timeout=3), 0)
        self.assertEqual(duplicate.stdout.read(), b'')
        self.assertEqual(self.journal.read_bytes(), journal)
        self.stop(p)

    def test_killed_monitor_shell_recovery(self):
        p = self.launch()
        self.heartbeat(p, 1)
        p.kill()
        p.wait()
        for _ in range(2):
            result = self.recover()
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue(result.stdout.endswith(f'RESTORED {SESSION}\n'.encode()))
            self.assertEqual(self.node.read_text(), '0\n')

    def test_unknown_write_preserved(self):
        p = self.launch()
        self.heartbeat(p, 1)
        fields = self.journal.read_text().splitlines()
        fields[6:8] = ['0','1']  # Crash after attempted store, before confirmed readback
        evidence = '\n'.join(fields)+'\n'
        self.journal.write_text(evidence)
        p.stdin.write(f'HEARTBEAT {SESSION} 2\n'.encode())
        self.assertEqual(p.wait(timeout=3), 3)
        self.assertEqual(p.stdout.read(), b'')
        self.assertEqual(self.recover().returncode, 3)
        self.assertEqual(self.journal.read_text(), evidence)
        self.assertEqual(self.node.read_text(), '1\n')

    def paused_tick(self, point):
        self.env['CHARGE_TEST_PAUSE'] = point
        p = self.launch()
        p.stdin.write(f'HEARTBEAT {SESSION} 1\n'.encode())
        deadline = time.monotonic() + 3
        while time.monotonic() < deadline:
            pid, status = os.waitpid(p.pid, os.WUNTRACED | os.WNOHANG)
            if pid:
                self.assertTrue(os.WIFSTOPPED(status))
                return p
            time.sleep(.01)
        self.fail('Monitor did not reach write boundary')

    def test_expiry_after_pending_before_write(self):
        p = self.paused_tick('before-write')
        self.assertEqual(self.journal.read_text().splitlines()[6:8], ['0','1'])
        self.assertEqual(self.node.read_text(), '0\n')
        time.sleep(15.1)
        p.send_signal(signal.SIGCONT)
        self.frame(p, f'RESTORED {SESSION}')
        self.assertEqual(p.wait(timeout=2), 0)
        self.assertEqual(self.receipt.read_text().splitlines()[6:8], ['0','-'])

    def test_killed_between_write_and_readback(self):
        p = self.paused_tick('after-write')
        p.kill()
        p.wait()
        evidence = self.journal.read_bytes()
        self.assertEqual(self.node.read_text(), '1\n')
        self.assertEqual(p.stdout.read(), b'')
        self.assertEqual(self.recover().returncode, 3)
        self.assertEqual(self.journal.read_bytes(), evidence)
        self.assertFalse(self.receipt.exists())

    @unittest.skipUnless(shutil.which('strace'), 'requires strace')
    def test_no_descendant_exec(self):
        trace = self.root / 'exec.trace'
        p = self.launch(['strace','-f','-e','trace=process','-o',trace,BIN])
        for seq in range(1, 21):
            self.heartbeat(p, seq)
        self.stop(p)
        log = trace.read_text()
        self.assertEqual(log.count('execve('), 1)
        for call in ['clone(', 'clone3(', 'vfork(', 'fork(', 'execveat(']:
            self.assertNotIn(call, log)

if __name__ == '__main__':
    unittest.main()
