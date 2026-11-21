import json
import os
from pathlib import Path
import subprocess
import tempfile
import time
import unittest


PLUGIN = Path(__file__).resolve().parent

# Keep the production hook's paths fixed. The harness supplies a fake sysfs and
# driver to the same adapter function the hook calls.
HARNESS = r'''
set -eu
umask 077
. "$1"

write_threshold() {
    printf '%s %s\n' "${1##*/}" "$2" >> "$TEST_WRITES"
    case "${TEST_DRIVER:-}" in
        reject-start)
            if [ "${1##*/}" = charge_control_start_threshold ]; then return 1; fi
            ;;
        reject-end-zero)
            if [ "${1##*/}" = charge_control_end_threshold ] && [ "$2" = 0 ]; then return 1; fi
            ;;
        clamp)
            printf '79\n' > "$1"
            return 0
            ;;
        fail-after-write)
            printf '%s\n' "$2" > "$1"
            return 1
            ;;
        interrupted)
            printf '%s\n' "$2" > "$1"
            exit 91
            ;;
        interrupted-before-write)
            exit 92
            ;;
        pause)
            : > "$TEST_PAUSED"
            while [ ! -f "$TEST_RELEASE" ]; do sleep 0.02; done
            ;;
        ordered)
            case "${1##*/}" in
                charge_control_end_threshold)
                    [ "$2" -ge "$(cat "${1%/*}/charge_control_start_threshold")" ] || return 1
                    ;;
                charge_control_start_threshold)
                    [ "$2" -le "$(cat "${1%/*}/charge_control_end_threshold")" ] || return 1
                    ;;
            esac
            ;;
    esac
    printf '%s\n' "$2" > "$1"
}

shift
charge_limit "$@"
'''


class BatteryChargeLimitTest(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory(prefix='.test-', dir=PLUGIN)
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        self.power_supply = self.root / 'class/power_supply'
        self.devices = self.root / 'devices'
        self.state = self.root / 'state'
        self.power_supply.mkdir(parents=True)
        self.state.mkdir()
        self.battery = self.add_battery('battery', 0, 0)
        self.start = self.battery / 'charge_control_start_threshold'
        self.end = self.battery / 'charge_control_end_threshold'
        self.journal = self.state / 'threshold-state'
        self.writes = self.root / 'writes'
        self.paused = self.root / 'paused'
        self.release = self.root / 'release'

    def add_battery(self, name, start, end):
        battery = self.devices / f'platform/charger/power_supply/{name}'
        battery.mkdir(parents=True)
        (battery / 'type').write_text('Battery\n')
        (self.power_supply / name).symlink_to(battery)
        (battery / 'charge_control_end_threshold').write_text(f'{end}\n')
        if start is not None:
            (battery / 'charge_control_start_threshold').write_text(f'{start}\n')
        return battery

    def invocation(self, event, *, stop=80, resume=75, driver='', firmware='host/test'):
        cmd = ['sh', '-c', HARNESS, 'test-hook', str(PLUGIN / 'thresholds.sh'),
               event, str(self.power_supply), str(self.devices), str(self.state), firmware]
        env = dict(os.environ, INJECTOR_INPUT_stop_percent=str(stop),
                   INJECTOR_INPUT_resume_percent=str(resume), TEST_DRIVER=driver,
                   TEST_WRITES=str(self.writes), TEST_PAUSED=str(self.paused),
                   TEST_RELEASE=str(self.release))
        return cmd, env

    def hook(self, event, *, code=0, **kwargs):
        cmd, env = self.invocation(event, **kwargs)
        outcome = subprocess.run(cmd, env=env, stdout=subprocess.PIPE,
                                 stderr=subprocess.STDOUT, text=True, timeout=5)
        self.assertEqual(outcome.returncode, code, outcome.stdout)
        return outcome.stdout

    def wrote(self, *entries):
        expected = [f'charge_control_{field}_threshold {value}' for field, value in entries]
        actual = self.writes.read_text().splitlines() if self.writes.exists() else []
        self.assertEqual(actual, expected)
        self.writes.unlink(missing_ok=True)

    def values(self, start, end):
        if start is None:
            self.assertFalse(self.start.exists())
        else:
            self.assertEqual(self.start.read_text(), f'{start}\n')
        self.assertEqual(self.end.read_text(), f'{end}\n')

    def test_manifest_declares_grouped_native_controls(self):
        manifest = json.loads((PLUGIN / 'plugin.json').read_text())
        self.assertEqual(manifest['backend'], 'root')
        self.assertEqual(manifest['runtime'], 'shell')
        self.assertEqual(set(manifest['hooks']), {'enable', 'run', 'disable'})
        self.assertNotIn('triggers', manifest)
        self.assertTrue(all((PLUGIN / hook).is_file() for hook in manifest['hooks'].values()))
        controls = manifest['ui']['inputs']
        self.assertEqual([(c['id'], c['default']) for c in controls],
                         [('stop_percent', 80), ('resume_percent', 75)])
        self.assertTrue(all(c['type'] == 'slider' and c['group'] == 'charging' for c in controls))

    def test_zero_baseline_is_restored_and_repeated_enable_does_not_write(self):
        self.assertIn('Native charge control found', self.hook('run'))
        self.assertFalse(self.journal.exists())
        self.wrote()
        output = self.hook('enable', driver='ordered')
        self.assertIn('stop threshold: 80%', output)
        self.assertIn('start threshold: 75%', output)
        self.values(75, 80)
        self.wrote(('end', 80), ('start', 75))
        self.hook('enable', driver='ordered')
        self.wrote()
        self.hook('disable', stop='invalid', resume='invalid', driver='ordered')
        self.values(0, 0)
        self.wrote(('start', 0), ('end', 0))
        self.assertFalse(self.journal.exists())
        self.hook('disable')
        self.wrote()

    def test_setting_changes_keep_original_pair_and_move_in_safe_order(self):
        self.start.write_text('95\n')
        self.end.write_text('100\n')
        self.hook('enable', driver='ordered')
        self.wrote(('start', 75), ('end', 80))
        self.hook('run', stop=90, resume=85, driver='ordered')
        self.wrote(('end', 90), ('start', 85))
        self.hook('run', stop=70, resume=65, driver='ordered')
        self.wrote(('start', 65), ('end', 70))
        self.hook('disable', driver='ordered')
        self.wrote(('end', 100), ('start', 95))
        self.values(95, 100)

    def test_matching_original_pair_needs_no_write_in_either_direction(self):
        self.start.write_text('75\n')
        self.end.write_text('80\n')
        self.hook('enable')
        self.hook('disable')
        self.wrote()
        self.assertFalse(self.journal.exists())

    def test_end_only_changes_no_vendor_controls(self):
        self.start.unlink()
        suspended = self.battery / 'input_suspend'
        suspended.write_text('1\n')
        disabled = self.battery / 'charging_enabled'
        disabled.write_text('0\n')
        self.assertIn('device manages when charging resumes', self.hook('enable'))
        self.values(None, 80)
        self.hook('disable')
        self.values(None, 0)
        self.wrote(('end', 80), ('end', 0))
        self.assertEqual(suspended.read_text(), '1\n')
        self.assertEqual(disabled.read_text(), '0\n')

    def test_read_only_start_is_reported_and_preserved(self):
        self.start.write_text('60\n')
        self.end.write_text('100\n')
        self.start.chmod(0o444)
        self.hook('enable', stop=60, code=1)
        self.wrote()
        self.assertIn('60% (read-only)', self.hook('enable'))
        self.values(60, 80)
        self.hook('disable')
        self.values(60, 100)
        self.wrote(('end', 80), ('end', 100))

    def test_invalid_inputs_never_create_changes(self):
        for stop, resume in ((75, 75), (80, 81), ('080', 75), (101, 75), (80, ''), (49, 45)):
            with self.subTest(stop=stop, resume=resume):
                self.hook('enable', stop=stop, resume=resume, code=1)
                self.assertFalse(self.journal.exists())
        self.values(0, 0)
        self.wrote()

    def test_unsupported_controls_do_not_trigger_guessed_writes(self):
        self.end.unlink()
        (self.battery / 'charging_enabled').write_text('1\n')
        (self.battery / 'input_suspend').write_text('0\n')
        self.assertIn('No battery exposes a native charge stop threshold', self.hook('enable', code=1))
        self.wrote()
        self.assertFalse(self.journal.exists())

    def test_ambiguous_and_read_only_stop_controllers_are_refused(self):
        self.end.chmod(0o444)
        self.assertIn('not writable', self.hook('enable', code=1))
        self.end.chmod(0o644)
        self.add_battery('battery2', 0, 0)
        self.assertIn('Multiple batteries', self.hook('enable', code=1))
        self.values(0, 0)
        self.wrote()
        self.assertFalse(self.journal.exists())

    def test_external_change_blocks_reconfiguration_and_restore(self):
        self.hook('enable')
        self.wrote(('end', 80), ('start', 75))
        self.start.write_text('73\n')
        self.assertIn('changed externally', self.hook('run', stop=90, resume=85, code=1))
        self.assertIn('changed externally', self.hook('disable', code=1))
        self.values(73, 80)
        self.wrote()
        self.assertTrue(self.journal.exists())
        self.start.write_text('75\n')
        self.assertIn('Disable must finish', self.hook('run', code=1))
        self.hook('disable')
        self.wrote(('start', 0), ('end', 0))

    def test_changed_firmware_does_not_take_ownership_of_old_values(self):
        self.hook('enable')
        self.wrote(('end', 80), ('start', 75))
        self.assertIn('firmware or charge controller changed', self.hook('disable', code=1, firmware='other'))
        self.values(75, 80)
        self.assertTrue(self.journal.exists())
        self.wrote()

    def test_driver_rejection_rolls_back_only_confirmed_changes(self):
        self.assertIn('previous thresholds are verified', self.hook('enable', driver='reject-start', code=1))
        self.values(0, 0)
        self.wrote(('end', 80), ('start', 75), ('end', 0))
        self.assertFalse(self.journal.exists())

    def test_driver_rounding_or_failed_write_with_effect_retains_pending_receipt(self):
        for driver, readback in (('clamp', 79), ('fail-after-write', 80)):
            with self.subTest(driver=driver):
                self.assertIn('could not be verified', self.hook('enable', driver=driver, code=1))
                self.wrote(('end', 80))
                self.assertIn('unknown outcome', self.hook('disable', code=1))
                self.values(0, readback)
                self.wrote()
                self.assertEqual(self.journal.read_text().splitlines()[-2:], ['end', '80'])
                self.end.write_text('0\n')
                self.hook('disable')
                self.assertFalse(self.journal.exists())

    def test_interrupted_hook_after_sysfs_write_requires_confirmed_baseline(self):
        self.hook('enable', driver='interrupted', code=91)
        self.wrote(('end', 80))
        self.values(0, 80)
        self.assertIn('unknown outcome', self.hook('enable', code=1))
        self.assertIn('unknown outcome', self.hook('disable', code=1))
        self.wrote()
        self.assertTrue(self.journal.exists())

    def test_interrupted_hook_without_effect_can_be_retried(self):
        self.hook('enable', driver='interrupted-before-write', code=92)
        self.wrote(('end', 80))
        self.values(0, 0)
        self.assertTrue(self.journal.exists())
        self.hook('enable')
        self.wrote(('end', 80), ('start', 75))
        self.values(75, 80)
        self.hook('disable')
        self.values(0, 0)

    def test_restore_rejection_preserves_verified_partial_progress(self):
        self.hook('enable')
        self.wrote(('end', 80), ('start', 75))
        self.assertIn('rejected a saved threshold', self.hook('disable', driver='reject-end-zero', code=1))
        self.wrote(('start', 0), ('end', 0))
        self.values(0, 80)
        self.assertTrue(self.journal.exists())
        self.hook('disable')
        self.wrote(('end', 0))
        self.values(0, 0)
        self.assertFalse(self.journal.exists())

    def test_overlapping_hooks_use_one_owned_lifecycle_lock(self):
        cmd, env = self.invocation('enable', driver='pause')
        with subprocess.Popen(cmd, env=env, stdout=subprocess.PIPE,
                              stderr=subprocess.STDOUT, text=True) as owner:
            try:
                deadline = time.monotonic() + 4
                while not self.paused.exists() and owner.poll() is None and time.monotonic() < deadline:
                    time.sleep(0.02)
                self.assertTrue(self.paused.exists(), 'The fake driver did not enter the write.')
                self.assertIn('lock unavailable or busy', self.hook('disable', code=1))
                self.values(0, 0)
            finally:
                self.release.touch()
            output, _ = owner.communicate(timeout=5)
            self.assertEqual(owner.returncode, 0, output)
        self.wrote(('end', 80), ('start', 75))
        self.hook('disable')
        self.values(0, 0)


if __name__ == '__main__':
    unittest.main()
