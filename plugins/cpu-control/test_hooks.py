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
        groups = {group['id'] for group in manifest['ui']['groups']}
        self.assertEqual(groups, set(POLICIES))
        inputs = manifest['ui']['inputs']
        self.assertEqual(len(inputs), len(groups) * 2)
        for item in inputs:
            self.assertIn(item['group'], groups)
            self.assertIn('INJECTOR_INPUT_' + item['id'], self.hook.read_text())
            if item['type'] == 'choice':
                self.assertEqual(item['default'], 'system')
                self.assertEqual({o['value'] for o in item['options']}, {'system', *GOVERNORS.split()})
            else:
                self.assertEqual((item['type'], item['default'], item['max']), ('slider', 100, 100))
                _, low, maximum, _, table = POLICIES[item['group']]
                first = min(f for f in map(int, table.split()) if f >= low)
                self.assertEqual(item['min'], (100 * first + maximum - 1) // maximum)
        self.call('enable')
        self.assertEqual(self.active.read_text(), '')
        self.call('disable')

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
