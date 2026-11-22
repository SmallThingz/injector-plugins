# Current 0.1.0 candidate

Battery and CPU workers were rebuilt from `d09e2a1` using Rust 1.99.1 and Android NDK 29.0.14206865 for arm64/API 28. Their exact source maps, worker hashes and archive members are recorded in `native-candidates.json`. Both link to Android libc and libdl; neither uses a shell launcher. Caffeine remains an app-owned Android capability with native JSON actions.

The new Battery build includes controller-binding checks, cold-owner exclusion and live CONFIG tests. The CPU build preserves unresolved rollback evidence. Host regressions and six native packaging checks passed. These builds have not yet been installed or physically qualified. Battery enforcement requires powered stop/resume observations; threshold readback alone is insufficient.

MIUI presentation now uses a Home accordion. Controller recovery fixes are still being integrated. Its previous physical failure and uncertain receipts remain unresolved; neither a changed manifest nor host tests establishes successful window behavior.

Only Battery, CPU, Caffeine and MIUI Floating Window Unlimiter are intended default products. Historical animation, display-timeout and Frida examples are excluded. Old commits, release tags and published assets are unchanged. The private candidate artifacts are not a default-catalog promotion. A future publication needs a fresh tag and exact commit/asset pins.

The installed legacy Battery shell lacks a configure hook. Replacing it with this native worker remains pending. The app's new explicit restart fallback is separate from Battery's preferred live CONFIG path.
