# Animation speed

Adjusts only the global `window_animation_scale`, `transition_animation_scale`,
and `animator_duration_scale` settings. These affect Android globally, across
users. Each duration has a 0-200% slider in 25% steps; 100% (the default) is normal,
50% is faster, 200% is slower, and 0% turns that animation category off.

Boot reapplication accepts the last applied value or the captured original;
an unrelated value is a conflict and is preserved. This also allows a normal
reset to the original across a restart without replacing the saved baseline.

Install the private ZIP, review it, and explicitly Enable. Packages install
disabled. Configure and Save only changes the draft; Apply applies it after a
successful Enable. Apply before Enable does not change Android settings. Restart
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
A later Apply with no completed Enable only recovers an unfinished transaction;
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
The parent reports that actual device Apply and Disable restoration passed.
This does not qualify reboot reapplication or every conflict/recovery scenario.
The host tests below exercise the real POSIX hooks against a fault-injected
settings CLI, not an Android emulator. This packaging task runs no phone tests.

From the Injector repository root:

```sh
python3 plugins/animation-speed/test_hooks.py
python3 plugins/animation-speed/package.py
```

The deterministic package is
`.tmp/postboot-plugins/dist/animation-speed-0.1.zip`, with its SHA-256 beside it.
Its root contains only `plugin.json`, `hook.sh`, and `settings-state.sh`.
Tests, docs, and packaging scripts stay in source. The state helper and fault
suite are deliberately identical copies in both standalone packages; keep them
in sync. No catalog, tag, release, or published repository is updated.
