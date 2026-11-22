"""Run cpu-control's contract tests with the native executable as the hook."""
import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("shell_cases", HERE.parent / "test_hooks.py")
cases = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cases)


class NativeCpuControl(cases.CpuControl):
    @classmethod
    def setUpClass(cls):
        build = tempfile.TemporaryDirectory()
        cls.addClassCleanup(build.cleanup)
        dst = Path(build.name)
        source = (HERE / "src/main.rs").read_text()

        def replace(old, new):
            nonlocal source
            assert source.count(old) == 1, old
            source = source.replace(old, new)

        replace('Path::new("/sys/devices/system/cpu/cpufreq")',
                'Path::new(&env::var("SYSFS").unwrap()).to_owned()')
        replace("transaction::apply(root,", "transaction::apply(&root,")
        replace("probe(root, &state)", "probe(&root, &state)")
        replace('Path::new("/proc/sys/kernel/random/boot_id")', 'Path::new(&env::var("BOOT").unwrap())')
        replace('unsafe { getuid() }', 'env::var("MOCK_UID").unwrap_or_default().parse::<u32>().unwrap_or(0)')
        # Route only a test's explicit mock cat through its read fault injector.
        # The production artifact has no fixture override or child process.
        replace('let text = read_raw(path)?;', '''
            let mock = std::path::PathBuf::from(env::var_os("MOCK_CAT").unwrap());
            if mock.exists() && path.starts_with(env::var_os("SYSFS").unwrap()) {
                let result = std::process::Command::new(mock).arg(path).output()?;
                if !result.status.success() {return Err(io::Error::other("Injected read failure."))}
                return Ok(String::from_utf8(result.stdout).unwrap().trim_end_matches('\\n').into())
            }
            let text = read_raw(path)?;''')
        (dst/"main.rs").write_text(source)
        (dst/"transaction.rs").write_bytes((HERE/"src/transaction.rs").read_bytes())
        cls.binary = dst/"cpu-control-native"
        subprocess.run(["rustc", "--edition=2021", dst/"main.rs", "-o", cls.binary], check=True)

    def call(self, event, ok=True, **inputs):
        env = dict(self.env, INJECTOR_EVENT=event, MOCK_CAT=str(self.bin/"cat"), BOOT=str(self.boot))
        env.update({f"INJECTOR_INPUT_{k}": str(v) for k, v in inputs.items()})
        result = subprocess.run([self.binary], env=env, capture_output=True, text=True, timeout=10)
        log = result.stdout + result.stderr
        self.assertEqual(ok, result.returncode == 0, log)
        return log

    def test_governor_only_restore_preserves_independent_limit_changes(self):
        governor = self.sysfs / "policy0/scaling_governor"

        def other_attributes():
            return {path: (path.read_bytes(), path.stat().st_mtime_ns)
                    for path in self.sysfs.glob("*/*") if path != governor}

        for cap, minimum in [(1344000, 1612800), (1804800, 633600)]:
            before = other_attributes()
            self.call("enable", policy0_governor="schedutil")
            self.assertEqual(self.active.read_text(), "policy0 scaling_governor walt schedutil\n")
            self.assertEqual(other_attributes(), before)
            self.put("policy0", "scaling_max_freq", cap)
            self.put("policy4", "scaling_min_freq", minimum)
            drift = other_attributes()
            self.call("disable")
            self.assertEqual(governor.read_text(), "walt\n")
            self.assertEqual(self.active.read_bytes(), b"")
            self.assertEqual(other_attributes(), drift)

    def handoff(self, first, second):
        first("enable", policy0_governor="schedutil")
        self.interrupt_readback('kill -KILL "$PPID"')
        first("run", ok=False, policy0_governor="performance", policy7_governor="powersave")
        self.assertTrue((self.journal / "pending/attempt.2").is_file())
        self.put("policy7", "related_cpus", "6 7")
        second("disable", ok=False)
        self.assertTrue((self.journal / "pending/attempt.2").is_file())
        self.assertFalse((self.journal / "pending/attempt.1").exists())
        self.assertEqual(self.value("policy0", "scaling_governor"), "schedutil")
        self.put("policy7", "related_cpus", "7")
        second("disable")
        self.assertEqual(self.active.read_bytes(), b"")
        self.assertFalse((self.journal / "pending").exists())
        for policy in ("policy0", "policy7"):
            self.assertEqual(self.value(policy, "scaling_governor"), "walt")

    def test_native_recovers_shell_journal(self):
        self.handoff(super().call, self.call)

    def test_shell_recovers_native_journal(self):
        self.handoff(self.call, super().call)


if __name__ == "__main__":
    unittest.main(verbosity=2)
