"""Run the packaged hook in a temporary staging tree with the host monitor ELF."""
from pathlib import Path
import shutil
import subprocess
import unittest

import test_monitor as native


class DispatcherTest(unittest.TestCase):
    def setUp(self):
        self.fixture = native.MonitorTest()
        self.fixture.setUp()
        self.addCleanup(self.fixture.doCleanups)
        self.package = self.fixture.root / 'package'
        self.package.mkdir()
        for name in ('hook.sh','session.sh','input-suspend.sh','thresholds.sh'):
            shutil.copyfile(native.SHELL / name, self.package / name)
        self.worker = self.package / 'native-charge'
        shutil.copyfile(native.BIN, self.worker)
        self.worker.chmod(0o600)
        self.fixture.env['INJECTOR_PLUGIN_DIR'] = str(self.package)
        # Substitute only absolute device paths for the shell cold recovery.
        hook = self.package / 'hook.sh'
        source = hook.read_text()
        for path in ('/sys/devices', '/sys/class'):
            source = source.replace(path, str(self.fixture.root) + path)
        hook.write_text(source)
        self.command = ['bash','-c',
                        'id() { echo 0; }; getprop() { echo "$TEST_FIRMWARE"; }; . "$1"',
                        'fixture', str(hook)]
        self.fixture.env['TEST_FIRMWARE'] = native.FW

    def test_dispatch_steady_exec_and_shell_recovery(self):
        f = self.fixture
        trace = f.root / 'trace'
        p = f.launch(['strace','-f','-e','trace=process','-o',str(trace), *self.command])
        f.heartbeat(p, 1)
        self.assertEqual(self.worker.stat().st_mode & 0o777, 0o700)
        before = trace.read_text()
        for seq in range(2, 22):
            f.heartbeat(p, seq)
        self.assertEqual(trace.read_text(), before)
        f.stop(p)
        self.assertEqual(before.count('execve("' + str(self.worker) + '"'), 1)
        print('Dispatch trace: one worker exec; zero process calls during 20 subsequent heartbeats.')
        # A hard kill must leave a shell-readable receipt for the ordinary
        # disable-with-session route. PID continuity proves the hook used exec.
        p = f.launch(self.command)
        f.heartbeat(p, 1)
        self.assertEqual(Path(f'/proc/{p.pid}/exe').resolve(), self.worker)
        p.kill()
        p.wait(timeout=3)
        self.worker.unlink()
        result = subprocess.run(self.command, env=dict(f.env, INJECTOR_EVENT='disable'),
                                capture_output=True, timeout=3)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout, f'RESTORED {native.SESSION}\n'.encode())
        self.assertEqual(f.node.read_text(), '0\n')

    def test_missing_worker_and_symlink_fail_without_state(self):
        self.worker.unlink()
        for symlink in (False, True):
            if symlink:
                self.worker.symlink_to(native.BIN)
            p = self.fixture.launch(self.command)
            self.assertNotEqual(p.wait(timeout=3), 0)
            self.assertEqual(p.stdout.read(), b'')
            self.assertFalse(self.fixture.journal.exists())

if __name__ == '__main__':
    unittest.main()
