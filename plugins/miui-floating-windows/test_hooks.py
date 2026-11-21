import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

PACKAGE = Path(os.environ.get('INJECTOR_TEST_PACKAGE', str(Path(__file__).resolve().parent)))


class Hooks(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root = Path(tmp.name)
        self.state = self.root / 'state'
        self.state.mkdir()
        self.plugin = self.root / 'plugin'
        self.plugin.mkdir()
        for name in ('worker.sh', 'hook.sh'):
            shutil.copy(PACKAGE / name, self.plugin)
        self.bin = self.root / 'bin'
        self.bin.mkdir()
        self.env = dict(os.environ, INJECTOR_PLUGIN_DIR=str(self.plugin),
                        PLUGIN_STATE_DIR=str(self.state), PATH=f'{self.bin}:{os.environ["PATH"]}')
        self.script(self.bin / 'id', 'echo "${MOCK_UID:-0}"')
        self.script(self.bin / 'getprop', '''case "$1" in
          sys.boot_completed) echo "${MOCK_BOOT:-1}";; ro.product.device) echo amethyst;;
          ro.product.build.fingerprint) echo "${MOCK_FP:-Xiaomi/amethyst/miproduct:16/BP2A.250605.031.A3/OS3.0.303.0.WOPINXM:user/release-keys}";;
          ro.product.cpu.abi) echo arm64-v8a;; ro.build.version.sdk) echo 36;;
          ro.build.version.incremental) echo "${MOCK_VERSION:-OS3.0.303.0.WOPINXM}";; esac''')
        self.script(self.bin / 'pidof', 'echo 123')
        self.script(self.bin / 'sleep', 'exec /bin/sleep 0.05')
        self.script(self.plugin / 'frida-inject', '''
          case "$*" in *'--pid 123 --runtime qjs --script ./agent.js --parameters {"limit":'*) ;; *) exit 9;; esac
          case "${MOCK_MODE:-normal}" in denied) echo MIUI_NO_AGENT; echo 'attach denied' >&2; exit 4;;
          slow) :;; *) echo MIUI_READY;; esac
          for i in $(seq 1 300); do
            if [ -e "$MIUI_STOP_FILE" ]; then
              [ "${MOCK_MODE:-normal}" = uncertain ] || echo MIUI_DISPOSED_DETACHED
              exit 0
            fi
            /bin/sleep 0.02
          done''')
        (self.plugin / 'agent.js').write_text('// mock\n')
        (self.plugin / 'payload.sha256').write_text(''.join(
            f'{hashlib.sha256((self.plugin / name).read_bytes()).hexdigest()}  {name}\n'
            for name in ('agent.js', 'frida-inject')))

    @staticmethod
    def script(path, body):
        path.write_text('#!/bin/sh\n' + body + '\n')
        path.chmod(0o700)

    def hook(self, event, success=True, **env):
        result = subprocess.run(['sh', self.plugin / 'hook.sh'], capture_output=True,
                                env=dict(self.env, INJECTOR_EVENT=event, **env), text=True, timeout=6)
        self.assertEqual(result.returncode == 0, success, result.stdout + result.stderr)
        return result.stdout + result.stderr

    def active(self):
        return self.state / (self.state / 'current').read_text().strip()

    def test_enable_configure_disable(self):
        self.hook('enable'); old = self.active()
        self.assertEqual((old / 'limit').read_text().strip(), '3')
        self.hook('run'); self.assertEqual(old, self.active())
        self.hook('run', INJECTOR_INPUT_limit='256'); new = self.active()
        self.assertNotEqual(old, new)
        self.assertIn('MIUI_DISPOSED_DETACHED', (old / 'log').read_text())
        self.assertEqual((new / 'limit').read_text().strip(), '256')
        self.hook('disable'); self.hook('disable')
        self.assertFalse((self.state / 'current').exists())

    def test_denial(self):
        self.assertIn('attach denied', self.hook('enable', False, MOCK_MODE='denied'))
        self.hook('disable')

    def test_stale_pid(self):
        self.hook('enable'); session = self.active(); owner = session / 'owner'
        original = owner.read_text(); owner.write_text(f'{os.getpid()} 1\n')
        self.assertIn('unknown', self.hook('disable', False))
        self.assertFalse((session / 'stop').exists())
        owner.write_text(original); self.hook('disable')

    def test_missing_disposal(self):
        self.hook('enable', MOCK_MODE='uncertain'); old = self.active()
        self.assertIn('unknown', self.hook('run', False, INJECTOR_INPUT_limit='4'))
        self.assertEqual(self.active(), old)

    def test_startup_timeout(self):
        self.assertIn('unconfirmed', self.hook('enable', False, MOCK_MODE='slow'))
        self.assertTrue((self.active() / 'stop').exists()); self.hook('disable')

    def test_lock_and_guards(self):
        import fcntl
        with (self.state / 'lock').open('w') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX); self.hook('run', False)
        for env in ({'MOCK_UID': '2000'}, {'MOCK_BOOT': '0'}, {'MOCK_VERSION': 'other'}, {'MOCK_FP': 'other'},
                    {'INJECTOR_INPUT_limit': '257'}, {'INJECTOR_INPUT_limit': '03'}):
            self.hook('run', False, **env)
        self.assertFalse((self.state / 'current').exists())

    def test_package(self):
        m = json.loads((PACKAGE / 'plugin.json').read_text()); slider, = m['ui']['inputs']
        self.assertEqual((m['backend'], slider['min'], slider['max'], slider['default']), ('root', 3, 256, 3))
        subprocess.run(['sha256sum', '-c', 'payload.sha256'], cwd=PACKAGE, check=True)


if __name__ == '__main__':
    unittest.main(verbosity=2)
