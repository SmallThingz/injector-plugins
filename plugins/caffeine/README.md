# Caffeine candidate 0.1.0

This package uses Injector's native Android screen-awake capability: its payload is the manifest plus acquire/release JSON declarations. Android service implementation remains in Injector; there is no Rust worker or shell wrapper to package for this Android-owned capability.

The manifest and both declarations are copied byte-for-byte from Injector `2849d9d`. Presets are 30 minutes, 1 hour, 5 hours and Unlimited, with Turn off, Pause and Restart screen-off policies. Runtime/recovery qualification is tied to the installed Injector app, not proved by these three JSON files. This packaging lane made no device checks.

Run `python3 package-native.py caffeine NEW.zip` from the repository root. See [candidate provenance](../../native-candidates.json) and [candidate notes](../../NATIVE-CANDIDATES.md). No catalog promotion or release has occurred.
