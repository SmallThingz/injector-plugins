import json
import os
from pathlib import Path
from contextlib import contextmanager
from select import select
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

mv() {
    command mv "$@" || return 1
    if [ -n "${rejected_end-}" ]; then
        printf '70\n' > "$rejected_end"
        unset rejected_end
    fi
}

write_threshold() {
    printf '%s %s\n' "${1##*/}" "$2" >> "$TEST_WRITES"
    case "${TEST_DRIVER:-}" in
        reject-start)
            if [ "${1##*/}" = charge_control_start_threshold ]; then return 1; fi
            ;;
        reject-end-then-external-change)
            rejected_end=$1
            return 1
            ;;
        reject-end-zero)
            if [ "${1##*/}" = charge_control_end_threshold ] && [ "$2" = 0 ]; then return 1; fi
            ;;
        start-becomes-read-only)
            if [ "${1##*/}/$2" = charge_control_end_threshold/80 ]; then
                chmod 444 "${1%/*}/charge_control_start_threshold"
            fi
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
        if resume is None:
            del env['INJECTOR_INPUT_resume_percent']
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
        self.assertEqual(manifest['session'], dict(protocol='stdin-lease-v1', hook='hook.sh'))
        self.assertNotIn('triggers', manifest)
        self.assertTrue(all((PLUGIN / hook).is_file() for hook in manifest['hooks'].values()))
        controls = manifest['ui']['inputs']
        self.assertEqual([(c['id'], c['label'], c['default']) for c in controls], [
            ('stop_percent', 'Stop at or above', 80),
            ('resume_percent', 'Resume at or below', 75),
        ])
        self.assertTrue(all(c['type'] == 'slider' and c['group'] == 'charging' for c in controls))
        self.assertEqual(manifest['ui']['layout'], 'accordion')
        self.assertEqual(manifest['ui']['ranges'], [
            dict(id='charge_window', label='Charge window', lower='resume_percent',
                 upper='stop_percent', unit='%', minGap=1),
        ])
        self.assertEqual(manifest['ui']['groups'], [
            dict(id='charging', label=manifest['ui']['ranges'][0]['label']),
        ])
        self.assertEqual([(c['min'], c['max'], c['step']) for c in controls], [(0, 100, 1)] * 2)

    def test_zero_baseline_is_restored_and_repeated_enable_does_not_write(self):
        self.assertIn('Native charge control found', self.hook('run'))
        self.assertFalse(self.journal.exists())
        self.wrote()
        output = self.hook('enable', driver='ordered')
        self.assertIn('stop threshold: 80%', output)
        self.assertIn('start threshold: 75%', output)
        self.assertIn('Charging enforcement is unverified.', output)
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
        self.assertIn('only a stop threshold', self.hook('enable', code=1))
        self.wrote()
        self.assertIn('device manages when charging resumes', self.hook('enable', resume=None))
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
        self.assertIn('fixes the charge start threshold at 60%', self.hook('enable', code=1))
        self.hook('enable', stop=60, resume=60, code=1)
        self.wrote()
        self.assertIn('60% (read-only)', self.hook('enable', resume=60))
        self.values(60, 80)
        self.hook('disable')
        self.values(60, 100)
        self.wrote(('end', 80), ('end', 100))

    def test_attribute_becoming_read_only_rolls_back_the_verified_stop(self):
        self.hook('enable', driver='start-becomes-read-only', code=1)
        self.values(0, 0)
        self.wrote(('end', 80), ('end', 0))
        self.assertFalse(self.journal.exists())

    def test_invalid_inputs_never_create_changes(self):
        for stop, resume in ((75, 75), (80, 81), ('080', 75), (101, 75), (80, ''), (80, -1)):
            with self.subTest(stop=stop, resume=resume):
                self.hook('enable', stop=stop, resume=resume, code=1)
                self.assertFalse(self.journal.exists())
        self.values(0, 0)
        self.wrote()

    def test_accepts_charge_window_below_old_ui_limits(self):
        self.hook('enable', stop=40, resume=20, driver='ordered')
        self.values(20, 40)
        self.wrote(('end', 40), ('start', 20))
        self.hook('disable', driver='ordered')
        self.values(0, 0)

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

    def test_rejected_apply_rechecks_noop_rollback_before_discarding_journal(self):
        output = self.hook('enable', driver='reject-end-then-external-change', code=1)
        self.assertIn('The thresholds changed externally', output)
        self.values(0, 70)
        self.wrote(('end', 80))
        self.assertTrue(self.journal.exists())
        self.assertIn('The thresholds changed externally', self.hook('disable', code=1))
        self.wrote()
        self.end.write_text('0\n')
        self.hook('disable')
        self.wrote()
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


SUSPEND_DRIVER = r'''
id() { cat "$TEST_UID_FILE"; }
getprop() { printf '%s\n' "$TEST_FIRMWARE"; }

write_suspend() {
    printf '%s\n' "$2" >> "$TEST_WRITES"
    case "${TEST_DRIVER:-}" in
        reject) return 0 ;;
        fail-after-write) printf '%s\n' "$2" > "$1"; return 1 ;;
    esac
    printf '%s\n' "$2" > "$1"
}

mv() {
    command mv "$@" || return
    case "${TEST_DRIVER:-}/${3##*/}" in
        start-after-commit/input-suspend-state|start-after-commit/threshold-state)
            if [ ! -e "$TEST_START_FAILURE" ]; then
                : > "$TEST_START_FAILURE"
                return 1
            fi
            ;;
    esac
}
'''


class XiaomiInputSuspendTest(unittest.TestCase):
    FIRMWARE = 'Redmi/amethyst_in/amethyst:16/BP2A.250605.031.A3/OS3.0.303.0.WOPINXM:user/release-keys'
    SESSION = '59abe231-7d1a-49d6-b090-127589b56712'

    def setUp(self):
        work = PLUGIN.parents[1] / '.tmp'
        work.mkdir(exist_ok=True)
        temp = tempfile.TemporaryDirectory(prefix='input-suspend-test-', dir=work)
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        self.state = self.root / 'state'
        self.state.mkdir()
        supply = self.root / 'sys/class/power_supply'
        supply.mkdir(parents=True)
        devices = self.root / 'sys/devices'
        battery = devices / ('platform/soc/soc:qcom,pmic_glink/'
                             'soc:qcom,pmic_glink:qcom,battery_charger/power_supply/battery')
        battery.mkdir(parents=True)
        (supply / 'battery').symlink_to(battery)
        (battery / 'type').write_text('Battery\n')
        self.capacity = battery / 'capacity'
        self.capacity.write_text('80\n')
        self.start = battery / 'charge_control_start_threshold'
        self.end = battery / 'charge_control_end_threshold'
        self.start.write_text('0\n')
        self.end.write_text('0\n')
        self.online = supply / 'usb/online'
        self.online.parent.mkdir()
        self.online.write_text('0\n')
        qcom = self.root / 'sys/class/qcom-battery'
        qcom.mkdir()
        self.suspend = qcom / 'input_suspend'
        self.suspend.write_text('0\n')
        self.suspend.chmod(0o660)
        boot = self.root / 'boot_id'
        boot.write_text('cbaabcca-0000-4000-9000-123456789012\n')
        self.boot = boot
        package = self.root / 'package'
        package.mkdir()
        (package / 'thresholds.sh').write_bytes((PLUGIN / 'thresholds.sh').read_bytes())
        (package / 'session.sh').write_bytes((PLUGIN / 'session.sh').read_bytes())
        (package / 'input-suspend.sh').write_text((PLUGIN / 'input-suspend.sh').read_text() + SUSPEND_DRIVER)
        self.hook_file = package / 'hook.sh'
        source = (PLUGIN / 'hook.sh').read_text()
        for path, fixture in [('/sys/class/power_supply', supply), ('/sys/devices', devices),
                              ('/sys/class/qcom-battery', qcom), ('/proc/sys/kernel/random/boot_id', boot)]:
            source = source.replace(path, f'"{fixture}"')
        self.hook_file.write_text(source)
        self.journal = self.state / 'input-suspend-state'
        self.writes = self.root / 'writes'
        self.uid = self.root / 'uid'
        self.uid.write_text('0\n')
        self.monitor_log = self.root / 'monitor.log'
        self.env = dict(os.environ, INJECTOR_PLUGIN_DIR=str(package), PLUGIN_STATE_DIR=str(self.state),
                        TEST_FIRMWARE=self.FIRMWARE, TEST_WRITES=str(self.writes), TEST_UID_FILE=str(self.uid),
                        TEST_START_FAILURE=str(self.root / 'start-failure'))

    def hook(self, event, *, driver='', firmware=None, code=0):
        env = dict(self.env, INJECTOR_EVENT=event, TEST_DRIVER=driver, TEST_FIRMWARE=firmware or self.FIRMWARE)
        result = subprocess.run(['sh', self.hook_file], env=env, text=True, stdout=subprocess.PIPE,
                                stderr=subprocess.STDOUT, timeout=10)
        self.assertEqual(result.returncode, code, result.stdout)
        return result.stdout

    def recover(self, *, session=None, firmware=None, code=0):
        nonce = session or self.SESSION
        env = dict(self.env, INJECTOR_EVENT='disable', TEST_FIRMWARE=firmware or self.FIRMWARE,
                   INJECTOR_SESSION_ID=nonce, INJECTOR_SESSION_PROTOCOL='stdin-lease-v1',
                   INJECTOR_SESSION_LEASE_SECONDS='15')
        result = subprocess.run(['sh', self.hook_file], env=env, text=True, stdin=subprocess.DEVNULL,
                                capture_output=True, timeout=5)
        self.assertEqual(result.returncode, code, result.stderr)
        self.assertEqual(result.stdout, f'RESTORED {nonce}\n' if code == 0 else '', result.stderr)
        return result.stderr

    def wrote(self, *values):
        actual = self.writes.read_text().splitlines() if self.writes.exists() else []
        self.assertEqual(actual, list(values))
        self.writes.unlink(missing_ok=True)

    @contextmanager
    def monitor(self, *, driver='', firmware=None, **overrides):
        env = dict(self.env, INJECTOR_EVENT='monitor', TEST_DRIVER=driver,
                   TEST_FIRMWARE=firmware or self.FIRMWARE, INJECTOR_SESSION_ID=self.SESSION,
                   INJECTOR_SESSION_PROTOCOL='stdin-lease-v1', INJECTOR_SESSION_LEASE_SECONDS='15')
        env.update(overrides)
        shell = os.environ.get('CHARGE_TEST_SHELL', 'bash')
        with self.monitor_log.open('wb') as log, subprocess.Popen(
            [shell, self.hook_file], env=env, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
            stderr=log, bufsize=0,
        ) as process:
            try:
                yield process
            finally:
                if not process.stdin.closed:
                    process.stdin.close()
                process.wait(timeout=20)

    def send(self, process, frame):
        process.stdin.write((frame + '\n').encode())

    def frame(self, process, expected, timeout=5):
        readable, _, _ = select([process.stdout], [], [], timeout)
        self.assertTrue(readable, self.monitor_log.read_text())
        actual = process.stdout.readline().decode().rstrip('\n')
        self.assertEqual(actual, expected, self.monitor_log.read_text())

    def heartbeat(self, process, sequence):
        self.send(process, f'HEARTBEAT {self.SESSION} {sequence}')
        if sequence == 1:
            self.frame(process, f'READY {self.SESSION}')
        self.frame(process, f'ACK {self.SESSION} {sequence}')

    def stopped(self, process, *, code=0, timeout=5):
        self.frame(process, f'RESTORED {self.SESSION}', timeout=timeout)
        self.assertEqual(process.wait(timeout=5), code, self.monitor_log.read_text())
        self.assertEqual(process.stdout.read(), b'')

    def test_heartbeat_hysteresis_and_stop_ignore_online(self):
        with self.monitor() as process:
            self.heartbeat(process, 1)
            self.assertEqual(self.suspend.read_text(), '1\n')
            for sequence, level, expected in [(2, 77, '1'), (3, 75, '0'), (4, 77, '0'), (5, 80, '1')]:
                self.capacity.write_text(f'{level}\n')
                self.heartbeat(process, sequence)
                self.assertEqual(self.suspend.read_text().strip(), expected)
            self.send(process, f'STOP {self.SESSION}')
            self.stopped(process)
        self.assertIn('Charging enforcement is unverified', self.monitor_log.read_text())
        self.wrote('1', '0', '1', '0')
        self.assertFalse(self.journal.exists())
        self.assertEqual(self.suspend.read_text(), '0\n')
        self.assertEqual(self.online.read_text(), '0\n')
        self.assertEqual(self.start.read_text(), '0\n')
        self.assertEqual(self.end.read_text(), '0\n')

    def test_actual_eof_restores_immediately(self):
        with self.monitor() as process:
            self.heartbeat(process, 1)
            process.stdin.close()
            self.stopped(process)
        self.assertFalse(self.journal.exists())
        self.wrote('1', '0')
        self.recover()
        self.wrote()

    def test_lost_owner_recovery_needs_matching_evidence_and_current_baseline(self):
        self.assertIn('No matching', self.recover(code=3))
        with self.monitor() as process:
            self.send(process, f'STOP {self.SESSION}')
            self.stopped(process)
        self.assertIn('ownership changed', self.recover(session=self.SESSION[:-1] + '0', code=3))
        self.suspend.write_text('1\n')
        self.assertIn('changed externally', self.recover(code=3))
        self.assertEqual(self.suspend.read_text(), '1\n')
        self.wrote()

    def test_lost_owner_without_terminal_reader_can_recover_from_receipt(self):
        with self.monitor() as process:
            self.heartbeat(process, 1)
            process.stdout.close()
            process.stdin.close()
            self.assertNotEqual(process.wait(timeout=5), 0)
        self.assertFalse(self.journal.exists())
        self.recover()
        self.wrote('1', '0')

    def test_missing_heartbeat_expires_actual_monotonic_lease(self):
        with self.monitor() as process:
            self.heartbeat(process, 1)
            began = time.monotonic()
            self.stopped(process, timeout=20)
            self.assertGreaterEqual(time.monotonic() - began, 14.7)
            self.assertFalse(process.stdin.closed)
        self.assertIn('lease expired', self.monitor_log.read_text())
        self.assertFalse(self.journal.exists())
        self.wrote('1', '0')

    def test_stop_before_first_heartbeat_restores_without_mutation(self):
        with self.monitor() as process:
            self.send(process, f'STOP {self.SESSION}')
            self.stopped(process)
        self.wrote()
        self.assertFalse(self.journal.exists())

    def test_start_failure_after_journal_commit_reconciles_only_its_launch(self):
        for firmware in [self.FIRMWARE, 'other/device']:
            with self.subTest(firmware=firmware):
                Path(self.env['TEST_START_FAILURE']).unlink(missing_ok=True)
                with self.monitor(driver='start-after-commit', firmware=firmware) as process:
                    self.stopped(process, code=1)
                self.assertTrue(Path(self.env['TEST_START_FAILURE']).is_file())
                self.assertFalse(self.journal.exists())
                self.assertFalse((self.state / 'threshold-state').exists())
                self.assertEqual(self.suspend.read_text(), '0\n')
                self.assertEqual(self.end.read_text(), '0\n')
                self.recover(firmware=firmware)
                self.wrote()

    def test_failed_duplicate_launch_cannot_release_same_nonce_owner(self):
        with self.monitor() as owner:
            self.heartbeat(owner, 1)
            original = self.journal.read_bytes()
            with self.monitor() as duplicate:
                self.assertEqual(duplicate.wait(timeout=5), 1)
                self.assertEqual(duplicate.stdout.read(), b'')
            self.assertEqual(self.journal.read_bytes(), original)
            self.assertEqual(self.suspend.read_text(), '1\n')
            self.send(owner, f'STOP {self.SESSION}')
            self.stopped(owner)
        self.wrote('1', '0')

    def test_invalid_contract_and_stale_or_oversize_frame_never_renew(self):
        with self.monitor(INJECTOR_SESSION_LEASE_SECONDS='16') as process:
            self.assertEqual(process.wait(timeout=5), 1)
            self.assertEqual(process.stdout.read(), b'')
        self.wrote()
        for invalid in [f'HEARTBEAT {self.SESSION} 1', f'STOP {self.SESSION[:-1]}0', 'X' * 64]:
            with self.subTest(invalid=invalid), self.monitor() as process:
                self.heartbeat(process, 1)
                self.send(process, invalid)
                self.stopped(process, code=1)
                self.wrote('1', '0')

    def test_known_stub_does_not_apply_without_monitor_and_generic_fallback_works(self):
        self.assertIn('supervised charging monitor', self.hook('enable', code=1))
        self.assertIn('80%', self.hook('enable', firmware='other/device'))
        self.assertEqual(self.end.read_text(), '80\n')
        self.hook('disable', firmware='other/device')
        self.assertEqual(self.end.read_text(), '0\n')
        self.wrote()
        self.assertFalse(self.journal.exists())

    def test_generic_native_thresholds_apply_and_restore_through_session(self):
        native_journal = self.state / 'threshold-state'
        with self.monitor(firmware='other/device') as process:
            self.heartbeat(process, 1)
            self.assertEqual(native_journal.read_text().splitlines()[-2], self.SESSION)
            self.assertEqual(self.start.read_text(), '75\n')
            self.assertEqual(self.end.read_text(), '80\n')
            self.send(process, f'STOP {self.SESSION}')
            self.stopped(process)
        self.assertFalse(native_journal.exists())
        self.assertEqual(self.start.read_text(), '0\n')
        self.assertEqual(self.end.read_text(), '0\n')
        self.recover(firmware='other/device')
        self.end.write_text('90\n')
        self.assertIn('changed externally', self.recover(firmware='other/device', code=3))
        self.assertEqual(self.end.read_text(), '90\n')
        self.wrote()

    def test_read_only_or_preexisting_suspend_never_writes(self):
        self.suspend.chmod(0o440)
        with self.monitor() as process:
            self.assertEqual(process.wait(timeout=5), 1)
        self.assertIn('read-only', self.monitor_log.read_text())
        self.suspend.chmod(0o660)
        self.suspend.write_text('1\n')
        with self.monitor() as process:
            self.assertEqual(process.wait(timeout=5), 1)
        self.assertIn('already active', self.monitor_log.read_text())
        self.hook('disable')
        self.assertEqual(self.suspend.read_text(), '1\n')
        self.assertFalse(self.journal.exists())
        self.wrote()

    def test_rejected_write_leaves_baseline_and_removes_empty_session(self):
        with self.monitor(driver='reject') as process:
            self.send(process, f'HEARTBEAT {self.SESSION} 1')
            self.stopped(process, code=1)
        self.assertIn('driver rejected', self.monitor_log.read_text())
        self.assertEqual(self.suspend.read_text(), '0\n')
        self.assertFalse(self.journal.exists())
        self.wrote('1')

    def test_uncertain_or_external_write_keeps_journal_without_fallback(self):
        with self.monitor(driver='fail-after-write') as process:
            self.send(process, f'HEARTBEAT {self.SESSION} 1')
            self.assertEqual(process.wait(timeout=5), 3)
            self.assertEqual(process.stdout.read(), b'')
        self.assertIn('unknown outcome', self.monitor_log.read_text())
        self.assertEqual(self.journal.read_text().splitlines()[-3:-1], ['0', '1'])
        self.assertIn('unknown outcome', self.hook('disable', code=3))
        self.wrote('1')
        self.suspend.write_text('0\n')
        self.hook('disable')
        with self.monitor() as process:
            self.heartbeat(process, 1)
            self.suspend.write_text('0\n')
            self.send(process, f'HEARTBEAT {self.SESSION} 2')
            self.assertEqual(process.wait(timeout=5), 3)
            self.assertEqual(process.stdout.read(), b'')
        self.assertIn('changed externally', self.monitor_log.read_text())
        self.assertEqual(self.journal.read_text().splitlines()[-3:-1], ['1', '-'])
        self.assertIn('changed externally', self.hook('disable', code=3))
        self.wrote('1')
        self.assertEqual(self.end.read_text(), '0\n')

    def test_lost_root_retains_journal_for_explicit_disable(self):
        with self.monitor() as process:
            self.heartbeat(process, 1)
            self.uid.write_text('2000\n')
            self.send(process, f'HEARTBEAT {self.SESSION} 2')
            self.assertEqual(process.wait(timeout=5), 1)
            self.assertEqual(process.stdout.read(), b'')
        self.assertIn('Root is no longer available', self.monitor_log.read_text())
        self.assertEqual(self.suspend.read_text(), '1\n')
        self.assertTrue(self.journal.exists())
        self.uid.write_text('0\n')
        self.assertIn('ownership changed', self.recover(session=self.SESSION[:-1] + '0', code=3))
        self.assertEqual(self.suspend.read_text(), '1\n')
        self.recover()
        self.assertFalse(self.journal.exists())
        self.wrote('1', '0')

    def test_changed_boot_preserves_saved_session(self):
        with self.monitor() as process:
            self.heartbeat(process, 1)
            original = self.journal.read_bytes()
            self.boot.write_text('cbaabcca-0000-4000-9000-000000000001\n')
            self.assertIn('boot or charging controller changed', self.hook('disable', code=1))
            self.assertEqual(self.journal.read_bytes(), original)
            self.assertEqual(self.suspend.read_text(), '1\n')
            self.send(process, f'STOP {self.SESSION}')
            self.stopped(process)
        self.wrote('1', '0')

    def test_existing_native_journal_keeps_its_restore_path_on_amethyst(self):
        journal = self.state / 'threshold-state'
        journal.write_text('\n'.join(['1', self.FIRMWARE, str(self.capacity.parent), 'paired',
                                      'active', '0', '0', '75', '80', '-', '-']) + '\n')
        self.start.write_text('75\n')
        self.end.write_text('80\n')
        self.hook('disable')
        self.assertEqual(self.start.read_text(), '0\n')
        self.assertEqual(self.end.read_text(), '0\n')
        self.assertFalse(journal.exists())
        self.wrote()

    def test_disable_restores_and_monitor_does_not_apply_again(self):
        with self.monitor() as process:
            self.heartbeat(process, 1)
            self.hook('disable')
            self.send(process, f'HEARTBEAT {self.SESSION} 2')
            self.assertEqual(process.wait(timeout=5), 3)
            self.assertEqual(process.stdout.read(), b'')
        self.assertFalse(self.journal.exists())
        self.wrote('1', '0')


if __name__ == '__main__':
    unittest.main()
