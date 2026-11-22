"""Compare the production probe paths on ordinary temporary files (Linux host)."""
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile

HERE = Path(__file__).resolve().parent
with tempfile.TemporaryDirectory() as tmp:
    base = Path(tmp)
    cpu = base / "cpufreq"
    boot = base / "boot"
    boot.write_text("abcd\n")
    state = base / "cpu-abcd"
    state.mkdir()
    env = dict(os.environ, INJECTOR_EVENT="probe", PLUGIN_STATE_DIR=tmp)
    shell = (HERE.parent / "cpu-control/hook.sh").read_text()
    rust = (HERE / "src/main.rs").read_text()
    for old, new in [("/sys/devices/system/cpu/cpufreq", cpu),
                     ("/proc/sys/kernel/random/boot_id", boot)]:
        assert old in shell and old in rust
        shell = shell.replace(old, str(new))
        rust = rust.replace(old, str(new))
    # Substitute only the identity check for unprivileged fixture testing.
    shell = shell.replace('$(id -u)', '0')
    rust = rust.replace('unsafe { getuid() }', '0')
    (base / "hook").write_text(shell)
    (base / "probe.rs").write_text(rust)
    (base / "transaction.rs").write_bytes((HERE / "src/transaction.rs").read_bytes())
    subprocess.run(["rustc", "--edition=2021", base/"probe.rs", "-o", base/"probe"], check=True)
    for policy, members in [(0,"0 1 2 3"), (4,"4 5 6"), (7,"7")]:
        directory = cpu / f"policy{policy}"
        directory.mkdir(parents=True)
        for key, value in dict(related_cpus=members, scaling_governor="schedutil",
                scaling_available_governors="system schedutil performance schedutil",
                scaling_min_freq="100", scaling_max_freq="300", cpuinfo_max_freq="400",
                scaling_available_frequencies="400 300 200 200 100").items():
            (directory/key).write_text(value+"\n")

    def compare(trace=False):
        results = []
        for label, command in [("shell", ["sh", str(base/"hook")]), ("native", [str(base/"probe")])]:
            if trace:
                log = base / label
                command = ["strace", "-f", "-qq", "-e", "trace=execve", "-o", str(log), *command]
            result = subprocess.run(command, env=env, capture_output=True)
            results.append((result.returncode, result.stdout, result.stderr))
            if trace:
                count = len(re.findall(r'execve\(.*= 0$', log.read_text(), re.M))
                print(label, count, "successful execve calls")
        assert results[0] == results[1], results
        return json.loads(results[0][1]) if results[0][0] == 0 else None

    initial = compare(trace=True)
    assert len(initial["policies"]) == 3
    assert initial["policies"][0]["maxKHz"] == [300, 200, 100]
    active = state / "active"
    active.write_text("policy0 scaling_max_freq 400 300\n")
    assert compare()["policies"][0]["maxKHz"][0] == 400
    active.write_text("policy0 scaling_max_freq 400 200\n")
    assert compare()["policies"][0]["maxKHz"] == []
    active.write_text("policy0 scaling_governor performance performance\n")
    assert compare()["policies"][0]["governors"] == []
    active.write_text("bad journal\n")
    assert compare() is None
    active.write_text("policy0 scaling_max_freq 400 300\n\n")
    assert compare() is None
    active.unlink()
    (state/"pending").mkdir()
    assert compare() is None
    (state/"pending").rmdir()
    (cpu/"policy0/scaling_available_frequencies").write_text("300 bad")
    (cpu/"policy4/scaling_governor").chmod(0o444)
    (cpu/"policy7/related_cpus").write_text("6 7")
    last = compare()["policies"]
    assert len(last) == 2 and last[0]["maxKHz"] == [] and last[1]["governors"] == []
