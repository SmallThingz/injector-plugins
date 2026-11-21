# MIUI floating windows: experimental candidate

**The experimental override fails on the tested firmware.** On `amethyst` running HyperOS `OS3.0.303.0.WOPINXM`, Enable failed at remote `mmap` (`MAP_FAILED`), reported `MIUI_NO_AGENT`, and exited 1. No floating-window override was applied. Disable reported no outstanding owned override and exited 0. The attach diagnostic leaves the underlying errno undetermined.

The app renders a 3–256 limit slider with a default of 3. Enable attempts to start an owned session, Run attempts to apply a saved limit, and Disable requests acknowledged disposal and detach. No automatic boot trigger is enabled.

The candidate is restricted to Redmi Note 14 Pro+ `amethyst`, Android 16/API36, HyperOS `OS3.0.303.0.WOPINXM`, and the exact product fingerprint in `hook.sh`. It requires an already-authorized root backend. It raises only the ordinary two-window method result and preserves other stock window-mode rules.

The included Frida source patch removes automatic SELinux policy loading, enforcement changes, file-label changes, nested root acquisition and permission-denial fallbacks. Existing platform permissions still apply. A denied attach fails instead of weakening policy. See `PROVENANCE.md` for the bounded source audit and limitations.

## Rebuild

1. Clone `https://github.com/frida/frida` recursively at `a93582c832d74de1eaa0ec59994365f6981368db` (17.27.4).
2. Apply `policy-neutral.patch` inside its `subprojects/frida-core` checkout.
3. Set `FRIDA_SOURCE` to the top-level Frida checkout and `ANDROID_NDK_ROOT` to NDK r29, then run `sh build-injector.sh` on the host.
4. From the catalog repository root, run `python3 package-catalog.py build --frida-inject /path/to/frida-inject`. It requires an exact match for both payload hashes in `payload.sha256`. The catalog build reuses the pinned binary and does not assume a fresh native compile will be byte-identical.

`agent-source` contains the JavaScript source and locked bridge dependency. Its normal Bun build reproduced the included `agent.js` byte for byte. `licenses` preserves upstream notices.

## Qualification

Seven host lifecycle tests and four agent policy tests passed. To repeat the package checks, unpack the ZIP into a temporary directory and run `INJECTOR_TEST_PACKAGE=/path/to/unpacked python3 test_hooks.py`. These use a fake injector and do not prove Android attachment. The shell wrapper uses built-ins for process-stat parsing, avoiding an Android awk dependency.

On-device qualification still requires a successful attach, three simultaneously visible native floating windows, persistence after the hook returns, slider-change behavior, and restoration after Disable. The default repository catalog includes this package as experimental. The app's bundled starter catalog is separate.
