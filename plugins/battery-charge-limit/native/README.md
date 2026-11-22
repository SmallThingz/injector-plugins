# Battery native worker

On the exact amethyst OS3.0.303.0.WOPINXM fingerprint, the retained standard-threshold probe exposed both nodes and read back the unchanged 0/0 pair after requesting an 80% stop (Injector Battery receipt 27). A fresh session on that firmware selects Qualcomm input suspend and verifies the bound controller and unsuspended baseline before taking ownership. Other firmware can use standard thresholds if the controller qualifies. Recovery uses the recorded adapter. A rejected or uncertain write stays with that adapter and its journal.

The Qualcomm owner marker binds the launch to the battery and input-suspend device and inode identities. The active and restored receipt formats are unchanged. The native worker requires the marker and exact live binding for cold recovery. If older evidence lacks those identities, the worker leaves it intact. Resolve active state with its original installation before replacing the worker. After a binding or readback conflict, keep the journal for inspection.

CONFIG accepts the manifest's `resume_percent` and `stop_percent` together and applies them inside the existing lease. CONFIGURED confirms that the worker accepted the window and verified any requested control change. RESTORED requires the original control value on the owned binding. Physical charging behavior requires separate powered-device qualification.

Use an executable host RAM-backed target directory for the offline Cargo build. Run `INJECTOR_CHARGE_TEST_BIN=/path/to/target/debug/native-charge python3 -B tests/test_recovery.py -v` from this directory. The host tests use temporary fixture files and a control pipe.
