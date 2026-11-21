import fcntl
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest


PACKAGE = Path(__file__).resolve().parent
GOVERNORS = 'walt conservative powersave performance schedutil'
# Read-only amethyst policy data on OS3.0.303.0.WOPINXM.
POLICIES = {
    'policy0': ('0 1 2 3', 595200, 1804800, 1804800,
                '441600 595200 787200 902400 1017600 1113600 1228800 1344000 1497600 1593600 1708800 1804800'),
    'policy4': ('4 5 6', 633600, 2073600, 2400000,
                '480000 633600 787200 940800 1056000 1190400 1286400 1401600 1497600 1612800 1708800 1824000 1920000 2016000 2073600 2208000 2400000'),
    'policy7': ('7', 633600, 1900800, 2496000,
                '480000 633600 787200 960000 1094400 1209600 1324800 1459200 1651200 1766400 1900800 2208000 2304000 2496000'),
}


class CpuControl(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root = Path(tmp.name)
        self.state = self.root / 'state'
        self.bin = self.root / 'bin'
        self.sysfs = self.root / 'cpufreq'
        for directory in (self.state, self.bin, self.sysfs):
            directory.mkdir()
        self.boot_id = 'cbaabcca-0000-4000-9000-123456789012'
        self.boot = self.root / 'boot_id'
        self.boot.write_text(self.boot_id + '\n')
        self.journal = self.state / ('cpu-' + self.boot_id)
        self.active = self.journal / 'active'
        for policy, (cpus, low, maximum, hardware, table) in POLICIES.items():
            (self.sysfs / policy).mkdir()
            for node, value in dict(related_cpus=cpus, scaling_min_freq=low,
                                    scaling_max_freq=maximum, cpuinfo_max_freq=hardware,
                                    scaling_available_frequencies=table, scaling_governor='walt',
                                    scaling_available_governors=GOVERNORS).items():
                self.put(policy, node, value)
        self.hook = self.root / 'hook.sh'
        source = (PACKAGE / 'hook.sh').read_text()
        # Relocate only kernel mount paths in the test copy. No fixture switches in the package.
        for source_path, fixture in [('/sys/devices/system/cpu/cpufreq', self.sysfs),
                                     ('/proc/sys/kernel/random/boot_id', self.boot)]:
            self.assertEqual(source.count(source_path), 1)
            source = source.replace(source_path, '"' + str(fixture) + '"')
        self.hook.write_text(source)
        self.mock('id', 'echo "${MOCK_UID:-0}"')
        self.env = dict(PATH=f'{self.bin}:/usr/bin:/bin', PLUGIN_STATE_DIR=str(self.state),
                        SYSFS=str(self.sysfs), JOURNAL=str(self.journal))

    def put(self, policy, node, value):
        (self.sysfs / policy / node).write_text(str(value) + '\n')

    def value(self, policy, node):
        return (self.sysfs / policy / node).read_text().strip()

    def mock(self, name, body):
        path = self.bin / name
        path.write_text('#!/bin/sh\n' + body + '\n')
        path.chmod(0o700)

    def call(self, event, ok=True, **inputs):
        env = dict(self.env, INJECTOR_EVENT=event)
        env.update({'INJECTOR_INPUT_' + key: str(value) for key, value in inputs.items()})
        result = subprocess.run(['sh', self.hook], env=env, capture_output=True, text=True, timeout=10)
        log = result.stdout + result.stderr
        self.assertEqual(ok, result.returncode == 0, log)
        return log

    def test_manifest_and_defaults(self):
        manifest = json.loads((PACKAGE / 'plugin.json').read_text())
        self.assertEqual(manifest['backend'], 'root')
        self.assertEqual(manifest['runtime'], 'shell')
        self.assertEqual(set(manifest['hooks'].values()), {'hook.sh'})
        self.assertEqual(set(manifest['hooks']), {'enable', 'disable', 'run'})
        self.assertEqual(manifest['ui']['layout'], 'accordion')
        self.assertNotIn('headline', manifest['ui']['presentation'])
        self.assertNotIn('triggers', manifest)
        groups = {group['id'] for group in manifest['ui']['groups']}
        self.assertEqual(groups, set(POLICIES))
        inputs = {item['id']: item for item in manifest['ui']['inputs']}
        self.assertEqual(set(inputs), {'policy0_max_khz', *(f'{p}_governor' for p in groups)})
        self.assertEqual(inputs['policy0_max_khz']['group'], 'policy0')
        ceiling_options = inputs['policy0_max_khz']['options']
        self.assertEqual(ceiling_options, [
            {'value': 'system', 'label': 'System setting'},
            {'value': '1228800', 'label': '1228.8 MHz'},
            {'value': '1344000', 'label': '1344 MHz'},
            {'value': '1497600', 'label': '1497.6 MHz'},
            {'value': '1593600', 'label': '1593.6 MHz'},
            {'value': '1708800', 'label': '1708.8 MHz'},
        ])
        for policy in groups:
            governor = inputs[policy + '_governor']
            self.assertEqual(governor['group'], policy)
            self.assertEqual([choice['value'] for choice in governor['options']], ['system', *GOVERNORS.split()])
        for item in inputs.values():
            self.assertIn('INJECTOR_INPUT_' + item['id'], self.hook.read_text())
            self.assertEqual((item['type'], item['default']), ('choice', 'system'))

        defaults = {identifier: item['default'] for identifier, item in inputs.items()}
        for policy in ('policy4', 'policy7'):
            (self.sysfs / policy / 'scaling_max_freq').chmod(0o444)
        self.call('enable', **defaults)
        self.assertEqual(self.active.read_text(), '')

        self.put('policy0', 'scaling_min_freq', 1344000)
        self.call('run', ok=False, **(defaults | {'policy0_max_khz': '1228800'}))
        self.assertEqual(self.active.read_text(), '')
        self.assertEqual(self.value('policy0', 'scaling_max_freq'), '1804800')

        self.put('policy0', 'scaling_min_freq', 1228800)
        for option in ceiling_options[1:]:
            ceiling = option['value']
            self.call('run', **(defaults | {'policy0_max_khz': ceiling}))
            self.assertEqual(self.active.read_text(), f'policy0 scaling_max_freq 1804800 {ceiling}\n')
            self.assertEqual(self.value('policy0', 'scaling_max_freq'), ceiling)

        self.call('disable')
        for policy, (_, _, ceiling, _, _) in POLICIES.items():
            self.assertEqual(self.value(policy, 'scaling_max_freq'), str(ceiling))
            self.assertEqual(self.value(policy, 'scaling_governor'), 'walt')
        self.assertEqual(self.active.read_text(), '')

    def test_apply_edit_repeat_restore(self):
        settings = dict(policy4_governor='schedutil', policy4_percent=90, policy7_percent=90)
        self.call('enable', **settings)
        self.assertEqual(self.value('policy4', 'scaling_governor'), 'schedutil')
        self.assertEqual(self.value('policy4', 'scaling_max_freq'), '1824000')
        self.assertEqual(self.value('policy7', 'scaling_max_freq'), '1651200')
        saved = self.active.read_text()
        self.call('enable', **settings)
        self.assertEqual(self.active.read_text(), saved)
        self.call('run', policy4_percent=75)
        self.assertEqual(self.value('policy4', 'scaling_max_freq'), '1497600')
        self.assertEqual(self.value('policy4', 'scaling_governor'), 'walt')
        self.assertEqual(self.value('policy7', 'scaling_max_freq'), '1900800')
        self.call('disable')
        self.call('disable')
        self.assertEqual(self.value('policy4', 'scaling_max_freq'), '2073600')
        self.assertEqual(self.active.read_text(), '')

    def test_rejects_unsupported_requests_before_any_write(self):
        for governor in ('missing', '', '../walt', 'walt\nperformance'):
            self.call('run', ok=False, policy0_governor='powersave', policy7_governor=governor)
        for pct in (0, 1, 101, -1, '010', '5x'):
            self.call('run', ok=False, policy0_governor='powersave', policy7_percent=pct)
        self.put('policy7', 'scaling_available_governors', 'walt other')
        self.call('enable', ok=False, policy0_governor='powersave', policy7_governor='schedutil')
        self.put('policy7', 'related_cpus', '6 7')
        self.call('enable', ok=False, policy0_governor='powersave', policy7_governor='other')
        self.assertEqual(self.value('policy0', 'scaling_governor'), 'walt')
        self.assertEqual(self.active.read_text(), '')

    def test_missing_table_only_blocks_frequency_control(self):
        (self.sysfs / 'policy7/scaling_available_frequencies').unlink()
        self.call('enable', ok=False, policy7_percent=90)
        self.call('enable', policy7_governor='powersave')
        self.call('disable')

    def test_native_ceiling_uses_exact_driver_step_and_restores_original(self):
        self.call('enable', policy4_max_khz=1824000)
        self.assertEqual(self.value('policy4', 'scaling_max_freq'), '1824000')
        self.call('run', policy4_max_khz=1920000)
        self.assertEqual(self.value('policy4', 'scaling_max_freq'), '1920000')
        self.call('run', policy4_max_khz='system')
        self.assertEqual(self.value('policy4', 'scaling_max_freq'), '2073600')
        self.assertEqual(self.active.read_text(), '')

    def test_probe_filters_frequencies_by_live_limits_without_creating_state(self):
        self.put('policy0', 'scaling_max_freq', 1344000)
        self.put('policy4', 'scaling_min_freq', 1708800)
        self.put('policy7', 'related_cpus', '6 7')
        self.mock('cat', """if [ "$1" = "$SYSFS/policy4/scaling_min_freq" ]; then
            if [ -e "$SYSFS/minimum-read" ]; then
                echo 1920000
                exit
            fi
            : > "$SYSFS/minimum-read"
        fi
        exec /bin/cat "$@" """)
        snapshot = json.loads(self.call('probe'))
        self.assertEqual(snapshot['version'], 1)
        self.assertEqual([p['id'] for p in snapshot['policies']], ['policy0', 'policy4'])
        policy0, policy4 = snapshot['policies']
        self.assertEqual(policy0['maxKHz'],
                         [595200, 787200, 902400, 1017600, 1113600, 1228800, 1344000])
        self.assertEqual(policy0['minKHz'], 595200)
        self.assertEqual(policy0['currentMaxKHz'], 1344000)
        self.assertEqual(policy0['governors'], GOVERNORS.split())
        self.assertEqual(policy4['maxKHz'], [1920000, 2016000, 2073600])
        self.assertEqual(list(self.state.iterdir()), [])

    def test_probe_reads_original_ceiling_and_hides_choices_on_conflict(self):
        self.call('enable', policy4_max_khz=1824000, policy4_governor='powersave')
        saved = self.active.read_bytes()
        policy4 = json.loads(self.call('probe'))['policies'][1]
        self.assertEqual(policy4['currentMaxKHz'], 1824000)
        self.assertEqual(policy4['maxKHz'][-1], 2073600)
        self.put('policy4', 'scaling_max_freq', 1708800)
        self.put('policy4', 'scaling_governor', 'conservative')
        policy4 = json.loads(self.call('probe'))['policies'][1]
        self.assertEqual(policy4['currentMaxKHz'], 1708800)
        self.assertEqual(policy4['maxKHz'], [])
        self.assertEqual(policy4['governors'], [])
        self.assertEqual(self.active.read_bytes(), saved)
        self.assertEqual(self.value('policy4', 'scaling_governor'), 'conservative')
        self.assertEqual(self.value('policy4', 'scaling_max_freq'), '1708800')

    def test_probe_disables_unreadable_or_read_only_controls_independently(self):
        (self.sysfs / 'policy4/scaling_max_freq').chmod(0o444)
        (self.sysfs / 'policy7/scaling_min_freq').unlink()
        (self.sysfs / 'policy7/scaling_governor').chmod(0o444)
        self.put('policy0', 'scaling_available_frequencies', '633600 invalid')
        policy0, policy4, policy7 = json.loads(self.call('probe'))['policies']
        self.assertEqual(policy0['maxKHz'], [])
        self.assertEqual(policy4['maxKHz'], [])
        self.assertEqual(policy4['governors'], GOVERNORS.split())
        self.assertEqual(policy7['governors'], [])
        self.assertIsNone(policy7['minKHz'])
        self.assertIsNone(policy7['currentMaxKHz'])
        (self.journal / 'pending').mkdir(parents=True)
        self.assertIn('recovery is pending', self.call('probe', ok=False))
        self.assertTrue((self.journal / 'pending').is_dir())
        self.assertFalse((self.journal / 'lock').exists())

    def test_native_ceiling_rejects_unlisted_steps_and_live_bounds(self):
        for ceiling in ('1800000', '2208000', '1804.8', '01824000'):
            with self.subTest(ceiling=ceiling):
                self.call('enable', ok=False, policy0_governor='powersave', policy4_max_khz=ceiling)
        self.put('policy4', 'scaling_min_freq', 1708800)
        log = self.call('enable', ok=False, policy4_max_khz=1612800)
        self.assertIn('1708800 kHz', log)
        self.assertEqual(self.value('policy0', 'scaling_governor'), 'walt')
        self.assertEqual(self.value('policy4', 'scaling_max_freq'), '2073600')
        self.assertEqual(self.active.read_text(), '')

    def test_read_only_attribute_blocks_entire_apply(self):
        (self.sysfs / 'policy4/scaling_max_freq').chmod(0o444)
        log = self.call('enable', ok=False, policy0_governor='powersave', policy4_percent=90)
        self.assertIn('read-only', log)
        self.assertEqual(self.value('policy0', 'scaling_governor'), 'walt')
        self.assertEqual(self.value('policy4', 'scaling_max_freq'), '2073600')
        self.assertEqual(self.active.read_text(), '')

    def test_default_settings_report_unsupported_device(self):
        for policy, cpus in [('policy0', '0 1'), ('policy4', '4 5'), ('policy7', '6 7')]:
            self.put(policy, 'related_cpus', cpus)
        self.assertIn('No usable CPU frequency controls', self.call('enable', ok=False))
        self.assertEqual(self.active.read_text(), '')

    def test_policy_minimum_rise_after_plan_rolls_back_earlier_write(self):
        self.mock('cat', """if [ "$1" = "$SYSFS/policy4/scaling_max_freq" ] &&
                [ -f "$JOURNAL/pending/attempt.1" ]; then
            echo 1920000 > "$SYSFS/policy4/scaling_min_freq"
        fi
        exec /bin/cat "$@" """)
        self.call('enable', ok=False, policy0_governor='powersave', policy4_max_khz=1824000)
        self.assertEqual(self.value('policy0', 'scaling_governor'), 'walt')
        self.assertEqual(self.value('policy4', 'scaling_max_freq'), '2073600')
        self.assertEqual(self.value('policy4', 'scaling_min_freq'), '1920000')
        self.assertEqual(self.active.read_text(), '')

    def test_frequency_step_disappearing_after_plan_blocks_write(self):
        self.mock('cat', """if [ "$1" = "$SYSFS/policy4/scaling_max_freq" ] &&
                [ -f "$JOURNAL/pending/attempt.1" ]; then
            echo '633600 1612800 2073600' > "$SYSFS/policy4/scaling_available_frequencies"
        fi
        exec /bin/cat "$@" """)
        self.call('enable', ok=False, policy0_governor='powersave', policy4_max_khz=1824000)
        self.assertEqual(self.value('policy0', 'scaling_governor'), 'walt')
        self.assertEqual(self.value('policy4', 'scaling_max_freq'), '2073600')
        self.assertEqual(self.active.read_text(), '')

    def test_uses_live_min_and_unsorted_driver_table(self):
        self.put('policy7', 'scaling_available_frequencies', '2208000 1497600 633600 1600000')
        self.call('enable', policy7_percent=90)
        self.assertEqual(self.value('policy7', 'scaling_max_freq'), '1600000')
        self.put('policy7', 'scaling_min_freq', '1497600')
        self.call('run', ok=False, policy7_percent=70)
        self.assertEqual(self.value('policy7', 'scaling_max_freq'), '1600000')
        self.call('disable')
        self.assertEqual(self.value('policy7', 'scaling_max_freq'), '1900800')

    def test_external_cap_blocks_reapply_and_survives_disable(self):
        settings = dict(policy0_governor='performance', policy7_percent=90)
        self.call('run', **settings)
        self.put('policy7', 'scaling_max_freq', 1209600)
        self.call('run', ok=False, **settings)
        self.assertIn('Preserved external', self.call('disable'))
        self.assertEqual(self.value('policy7', 'scaling_max_freq'), '1209600')
        self.assertEqual(self.value('policy0', 'scaling_governor'), 'walt')
        self.assertEqual(self.active.read_text(), '')

    def test_root_required_and_concurrent_execution(self):
        self.env['MOCK_UID'] = '2000'
        self.call('enable', ok=False, policy0_governor='performance')
        self.assertEqual(list(self.state.iterdir()), [])
        del self.env['MOCK_UID']
        self.journal.mkdir()
        with (self.journal / 'lock').open('w') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            self.call('enable', ok=False, policy0_governor='performance')
        self.assertFalse(self.active.exists())

    def interrupt_readback(self, action):
        self.mock('cat', '''if [ "$1" = "$SYSFS/policy7/scaling_governor" ] &&
                [ -f "$JOURNAL/pending/attempt.2" ] &&
                [ "$(/bin/cat "$1")" = powersave ] && [ ! -e "$JOURNAL/injected" ]; then
            touch "$JOURNAL/injected"
            ''' + action + '''
        fi
        exec /bin/cat "$@"''')

    def test_rollback_failed_reconfiguration_preserves_prior_enable(self):
        self.call('enable', policy0_governor='schedutil')
        saved = self.active.read_text()
        self.interrupt_readback('exit 1')
        self.call('run', ok=False, policy0_governor='performance', policy7_governor='powersave')
        self.assertEqual(self.value('policy0', 'scaling_governor'), 'schedutil')
        self.assertEqual(self.value('policy7', 'scaling_governor'), 'walt')
        self.assertEqual(self.active.read_text(), saved)
        self.call('disable')
        self.assertEqual(self.value('policy0', 'scaling_governor'), 'walt')

    def test_death_between_writes_and_commit_recovers_using_journal(self):
        self.interrupt_readback('kill -KILL "$PPID"')
        self.call('enable', ok=False, policy0_governor='performance', policy7_governor='powersave')
        self.assertTrue((self.journal / 'pending/next').is_file())
        # A different controller intervened while Injector was dead.
        self.put('policy0', 'scaling_governor', 'conservative')
        self.call('disable')
        self.assertEqual(self.value('policy7', 'scaling_governor'), 'walt')
        self.assertEqual(self.value('policy0', 'scaling_governor'), 'conservative')
        self.assertFalse((self.journal / 'pending').exists())

    def test_external_cap_change_after_snapshot(self):
        self.mock('cat', '''if [ "$1" = "$SYSFS/policy7/scaling_max_freq" ] &&
                [ -e "$JOURNAL/pending/attempt.1" ] && [ ! -e "$JOURNAL/pending/attempt.2" ]; then
            echo 1209600 > "$1"
        fi
        exec /bin/cat "$@"''')
        self.call('enable', ok=False, policy0_governor='performance', policy7_percent=90)
        self.assertEqual(self.value('policy0', 'scaling_governor'), 'walt')
        self.assertEqual(self.value('policy7', 'scaling_max_freq'), '1209600')
        self.assertEqual(self.active.read_text(), '')

    def test_disable_rechecks_restored_fields_before_committing(self):
        self.call('enable', policy4_percent=90, policy7_percent=90)
        saved = self.active.read_text()
        self.mock('cat', """if [ "$1" = "$SYSFS/policy7/scaling_max_freq" ] &&
                [ -f "$JOURNAL/pending/attempt.2" ] &&
                [ "$(/bin/cat "$1")" = 1900800 ] && [ ! -e "$JOURNAL/injected" ]; then
            echo 1401600 > "$SYSFS/policy4/scaling_max_freq"
            touch "$JOURNAL/injected"
        fi
        exec /bin/cat "$@" """)
        log = self.call('disable', ok=False)
        self.assertIn('policy4/scaling_max_freq changed during apply.', log)
        self.assertEqual(self.value('policy4', 'scaling_max_freq'), '1401600')
        self.assertEqual(self.value('policy7', 'scaling_max_freq'), '1651200')
        self.assertEqual(self.active.read_text(), saved)
        self.assertIn('Preserved external policy4/scaling_max_freq', self.call('disable'))
        self.assertEqual(self.value('policy4', 'scaling_max_freq'), '1401600')
        self.assertEqual(self.value('policy7', 'scaling_max_freq'), '1900800')
        self.assertEqual(self.active.read_text(), '')

    def test_failed_rollback_retries_on_next_hook(self):
        self.interrupt_readback('echo powersave > "$SYSFS/policy7/scaling_available_governors"; exit 1')
        self.call('enable', ok=False, policy0_governor='performance', policy7_governor='powersave')
        self.assertEqual(self.value('policy0', 'scaling_governor'), 'walt')
        self.assertEqual(self.value('policy7', 'scaling_governor'), 'powersave')
        self.assertTrue((self.journal / 'pending/attempt.2').exists())
        self.put('policy7', 'scaling_available_governors', GOVERNORS)
        self.call('disable')
        self.assertEqual(self.value('policy7', 'scaling_governor'), 'walt')
        self.assertFalse((self.journal / 'pending').exists())

    def test_previous_boot_values_are_session_local(self):
        self.call('enable', policy7_percent=90)
        self.boot.write_text('cbaabcca-0000-4000-9000-000000000001\n')
        self.call('disable')
        self.assertEqual(self.value('policy7', 'scaling_max_freq'), '1651200')


if __name__ == '__main__':
    unittest.main(verbosity=2)
