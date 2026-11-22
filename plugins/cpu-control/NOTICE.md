# cpu-control source notice

Sources and manifest originate in SmallThingz/Injector commit `2849d9d99f5c4b901fe209adeaacb8ec248ab21d`.
Exact source mapping and retained worker provenance are in `../../native-candidates.json`.
The adjacent native/ directory contains the unmodified Rust build inputs.

The Rust worker has no third-party Cargo dependencies. It links Android libc.so and libdl.so.
