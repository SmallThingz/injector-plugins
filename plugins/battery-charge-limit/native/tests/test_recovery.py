"""Host fixtures for Battery backend selection and restoration ownership."""
import os
from pathlib import Path
import select
import subprocess
from tempfile import TemporaryDirectory
import unittest

FIRMWARE = "Redmi/amethyst_in/amethyst:16/BP2A.250605.031.A3/OS3.0.303.0.WOPINXM:user/release-keys"
SESSION = "59abe231-7d1a-49d6-b090-127589b56712"
LAUNCH = "cc4ab22c-3755-4e3a-ade2-128d7fb41df2"
BATTERY = "platform/soc/soc:qcom,pmic_glink/soc:qcom,pmic_glink:qcom,battery_charger/power_supply/battery"


class RecoveryTest(unittest.TestCase):
    def setUp(self):
        fixture = TemporaryDirectory()
        self.addCleanup(fixture.cleanup)
        root = Path(fixture.name)
        self.binary = os.environ["INJECTOR_CHARGE_TEST_BIN"]
        self.state = root / "state"
        self.state.mkdir()
        self.battery = root / "sys/devices" / BATTERY
        self.battery.mkdir(parents=True)
        (self.battery / "type").write_text("Battery\n")
        self.capacity = self.battery / "capacity"
        self.capacity.write_text("80\n")
        self.link = root / "sys/class/power_supply/battery"
        self.link.parent.mkdir(parents=True)
        self.link.symlink_to(self.battery)
        self.suspend = root / "sys/class/qcom-battery/input_suspend"
        self.suspend.parent.mkdir()
        self.suspend.write_text("0\n")
        self.fingerprint = root / "fingerprint"
        self.fingerprint.write_text(FIRMWARE + "\n")
        self.journal = self.state / "input-suspend-state"
        self.restored = self.state / "input-suspend-restored"
        self.environment = dict(os.environ,
            CHARGE_TEST_ROOT=str(root),
            PLUGIN_STATE_DIR=str(self.state),
            INJECTOR_EVENT="monitor",
            INJECTOR_SESSION_ID=SESSION,
            INJECTOR_SESSION_PROTOCOL="stdin-lease-v1",
            INJECTOR_SESSION_LEASE_SECONDS="15")

    def frame(self, monitor, text):
        self.assertTrue(select.select([monitor.stdout], [], [], 3)[0], text)
        self.assertEqual(monitor.stdout.readline(), (text + "\n").encode())

    def start(self):
        monitor = subprocess.Popen([self.binary], env=self.environment, bufsize=0,
                                   stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                   stderr=subprocess.PIPE)
        self.addCleanup(self.close, monitor)
        monitor.stdin.write(f"HEARTBEAT {SESSION} 1\n".encode())
        self.frame(monitor, f"READY {SESSION}")
        self.frame(monitor, f"ACK {SESSION} 1")
        return monitor

    @staticmethod
    def close(monitor):
        if monitor.poll() is None:
            monitor.kill()
        monitor.wait(timeout=3)
        for stream in (monitor.stdin, monitor.stdout, monitor.stderr):
            stream.close()

    def stop(self, monitor):
        output, log = monitor.communicate(f"STOP {SESSION}\n".encode(), timeout=3)
        return monitor.returncode, output, log

    def disable(self):
        return subprocess.run([self.binary], env=dict(self.environment, INJECTOR_EVENT="disable"),
                              stdin=subprocess.DEVNULL, capture_output=True, timeout=3)

    def thresholds(self, start, stop):
        paths = tuple(self.battery / f"charge_control_{edge}_threshold" for edge in ("start", "end"))
        for path, value in zip(paths, (start, stop)):
            path.write_text(f"{value}\n")
        return paths

    @staticmethod
    def identity(path):
        metadata = path.stat()
        return f"{metadata.st_dev}:{metadata.st_ino}"

    def replace_attribute(self):
        self.suspend.rename(self.suspend.with_name("retired"))
        self.suspend.write_text("1\n")

    def assert_restored(self, code, output, log):
        self.assertEqual(code, 0, log)
        self.assertEqual(output, f"RESTORED {SESSION}\n".encode())

    def assert_preserved(self, before):
        self.assertEqual(self.suspend.read_text(), "1\n")
        self.assertEqual(self.journal.read_bytes(), before)
        self.assertFalse(self.restored.exists())

    def test_amethyst_with_both_backends_uses_observed_profile(self):
        nodes = self.thresholds(0, 0)
        monitor = self.start()
        self.assertEqual([p.read_text() for p in nodes], ["0\n", "0\n"])
        self.assertEqual(self.suspend.read_text(), "1\n")
        self.assertFalse((self.state / "native-threshold-state").exists())
        self.assert_restored(*self.stop(monitor))
        self.assertEqual(self.suspend.read_text(), "0\n")

    def test_other_firmware_keeps_standard_adapter(self):
        self.fingerprint.write_text("Example/other/device:16/test:user/release-keys\n")
        nodes = self.thresholds(40, 95)
        monitor = self.start()
        self.assertEqual([p.read_text() for p in nodes], ["75\n", "80\n"])
        self.assertEqual(self.suspend.read_text(), "0\n")
        self.assert_restored(*self.stop(monitor))
        self.assertEqual([p.read_text() for p in nodes], ["40\n", "95\n"])

    def test_amethyst_recovers_existing_standard_receipt_in_place(self):
        start, stop = self.thresholds(75, 80)
        journal = self.state / "native-threshold-state"
        marker = self.state / "native-threshold-owner"
        boot = Path("/proc/sys/kernel/random/boot_id").read_text().strip()
        evidence = "\n".join((
            "2", FIRMWARE, boot, str(self.battery), self.identity(self.battery),
            self.identity(start), self.identity(stop), SESSION, "- 0", LAUNCH,
            "40 95", "75 80", "-", "",
        ))
        marker.write_text(LAUNCH)
        journal.write_text(evidence)

        blocked = subprocess.run([self.binary], env=self.environment,
                                 input=b"", capture_output=True, timeout=3)
        self.assertNotEqual(blocked.returncode, 0, blocked.stdout)
        self.assertEqual(journal.read_text(), evidence)
        self.assertFalse(self.journal.exists())
        self.assertEqual(self.suspend.read_text(), "0\n")

        restored = self.disable()
        self.assert_restored(restored.returncode, restored.stdout, restored.stderr)
        self.assertFalse(journal.exists())
        self.assertEqual([p.read_text() for p in (start, stop)], ["40\n", "95\n"])
        self.assertEqual(self.suspend.read_text(), "0\n")

    def test_amethyst_rejects_unowned_suspend_baseline_without_switching(self):
        nodes = self.thresholds(0, 0)
        self.suspend.write_text("1\n")
        blocked = subprocess.run([self.binary], env=self.environment,
                                 input=b"", capture_output=True, timeout=3)
        self.assertNotEqual(blocked.returncode, 0, blocked.stdout)
        self.assertEqual(blocked.stdout, b"")
        self.assertFalse(self.journal.exists())
        self.assertFalse((self.state / "native-threshold-state").exists())
        self.assertEqual([p.read_text() for p in nodes], ["0\n", "0\n"])
        self.assertEqual(self.suspend.read_text(), "1\n")

    def test_stop_preserves_receipt_after_battery_rebinding(self):
        monitor = self.start()
        before = self.journal.read_bytes()
        self.link.unlink()
        code, output, _ = self.stop(monitor)
        self.assertNotEqual(code, 0)
        self.assertEqual(output, b"")
        self.assert_preserved(before)

    def test_stop_never_writes_a_replacement_at_the_same_path(self):
        monitor = self.start()
        before = self.journal.read_bytes()
        self.replace_attribute()
        code, output, _ = self.stop(monitor)
        self.assertNotEqual(code, 0)
        self.assertEqual(output, b"")
        self.assert_preserved(before)

    def test_cold_disable_refuses_same_session_while_owner_is_live(self):
        monitor = self.start()
        before = self.journal.read_bytes()
        live = self.disable()
        self.assertNotEqual(live.returncode, 0, live.stdout)
        self.assertEqual(live.stdout, b"")
        self.assert_preserved(before)
        monitor.stdin.write(f"HEARTBEAT {SESSION} 2\n".encode())
        self.frame(monitor, f"ACK {SESSION} 2")

        monitor.kill()
        monitor.wait(timeout=3)
        for _ in range(2):
            cold = self.disable()
            self.assert_restored(cold.returncode, cold.stdout, cold.stderr)
        self.assertEqual(self.suspend.read_text(), "0\n")
        self.assertFalse(self.journal.exists())

    def test_live_config_updates_both_range_endpoints_without_restoring(self):
        monitor = self.start()
        pid = monitor.pid
        owner = self.state / "input-suspend-owner"
        owner_inode = self.identity(owner)
        os.utime(self.suspend, ns=(1_000_000_000, 1_000_000_000))
        previous_write = self.suspend.stat().st_mtime_ns

        monitor.stdin.write(f"CONFIG {SESSION} 1 resume_percent=78 stop_percent=85\n".encode())
        self.frame(monitor, f"CONFIGURED {SESSION} 1")
        # Capacity 80 is inside the new range. No transient write can retain
        # the fixture timestamp, even if the original bit is written back.
        self.assertEqual(self.suspend.read_text(), "1\n")
        self.assertEqual(self.suspend.stat().st_mtime_ns, previous_write)

        for sequence, capacity, expected in ((2, 78, 0), (3, 84, 0), (4, 85, 1)):
            self.capacity.write_text(f"{capacity}\n")
            monitor.stdin.write(f"HEARTBEAT {SESSION} {sequence}\n".encode())
            self.frame(monitor, f"ACK {SESSION} {sequence}")
            self.assertIsNone(monitor.poll())
            self.assertEqual(monitor.pid, pid)
            self.assertEqual(self.identity(owner), owner_inode)
            self.assertEqual(self.suspend.read_text(), f"{expected}\n")
            self.assertFalse(self.restored.exists())

        self.assert_restored(*self.stop(monitor))
        self.assertEqual(self.suspend.read_text(), "0\n")

    def test_cold_disable_preserves_a_replaced_binding(self):
        monitor = self.start()
        before = self.journal.read_bytes()
        monitor.kill()
        monitor.wait(timeout=3)
        self.replace_attribute()
        result = self.disable()
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertEqual(result.stdout, b"")
        self.assert_preserved(before)

    def test_stop_preserves_receipt_after_external_value_change(self):
        monitor = self.start()
        before = self.journal.read_bytes()
        self.suspend.write_text("0\n")
        code, output, _ = self.stop(monitor)
        self.assertNotEqual(code, 0)
        self.assertEqual(output, b"")
        self.assertEqual(self.suspend.read_text(), "0\n")
        self.assertEqual(self.journal.read_bytes(), before)
        self.assertFalse(self.restored.exists())


if __name__ == "__main__":
    unittest.main()
