# Display timeout

Adjusts only `system/screen_off_timeout`. Choices are 15 seconds, 30 seconds,
1 minute (the default), 2 minutes, 5 minutes, 10 minutes, and 30 minutes. The
Android user active at Enable is captured once; later Run, boot, and Disable
use that same numeric user ID even if the foreground user changes. Disable and
Enable again to select a different user. There is no keep-awake or never option.

Longer timeouts can use more battery. Device policy, app keep-screen-on flags,
and vendor behavior can change the effective screen-off time; the plugin only
verifies the requested settings value and does not bypass these controls. It
does not modify keyguard, lock timing, stay-awake, or secure settings. Avoid
enabling the source-only `screen-timeout` example alongside this plugin because
both manage the same key.

Install the private ZIP, review it, and explicitly Enable. Packages install
disabled. Configure and Save only changes the draft; Run applies it after a
successful Enable. Run before Enable does not change Android settings. Restart
reapplication is on by default, can be switched off in the After restart group,
and only runs for an enabled installation. The manifest declares boot and
waitForRoot; Injector waits for previously authorized root. These hooks do not
invoke su, acquire root, grant permissions, modify policy, or start a worker.
They use the existing root backend and Android's settings CLI only.

Disable compares each setting with its saved owned value before restoring the
exact original. An absent key is deleted; an empty string and a literal "null"
are restored as values. Settings changed externally are left alone, reported,
and relinquished when Disable completes. Unrelated settings are untouched.
Enable again starts a fresh ownership period.

A journal records the before value and intent before each write, then verifies
readback. A nonzero write receipt with matching readback counts as applied.
Failures roll back the current transaction to its pre-transaction values;
earlier successful configurations retain the first original. Interrupted work
is reconciled by reading values before retrying. An unattempted planned value
is never claimed as owned. If readback or rollback cannot be reconciled, state
is retained and the hook fails. Disable can restore the identifiable owned
values and preserve conflicting external values. Repeated Disable retries are
safe, including after Injector has already marked the installation disabled.
A later Run with no completed Enable only recovers an unfinished transaction;
it does not activate the plugin.

The journal is atomically replaced under the backend's persistent state
directory. Injector serializes hooks for each installation. Do not execute
hooks concurrently outside Injector. Atomic rename covers process interruption,
not a guarantee against storage failure or sudden power loss. Android's settings
CLI has no compare-and-set transaction: the checks cannot detect an external
writer choosing exactly the same value, or close the race between a read and
write. Settings with embedded newlines are outside the line-oriented CLI's
supported preservation model; malformed output fails closed where detectable.
A clamped or unexpected readback is treated as a conflict, never as proof of
ownership. Disable reports and preserves it.

The grouped controls and summary use Injector's existing declarative native
presentation. No app/UI source changes or extra permissions are required.
Physical Android execution and visual QA are pending parent review; the host
tests below exercise the real POSIX hooks against a fault-injected settings CLI,
not an Android emulator.

From the Injector repository root:

```sh
python3 plugins/display-timeout/test_hooks.py
python3 plugins/display-timeout/package.py
```

The deterministic package is
`.tmp/postboot-plugins/dist/display-timeout-0.1.zip`, with its SHA-256 beside it.
Its root contains only `plugin.json`, `hook.sh`, and `settings-state.sh`.
Tests, docs, and packaging scripts stay in source. The state helper and fault
suite are deliberately identical copies in both standalone packages; keep them
in sync. No catalog, tag, release, or published repository is updated.
