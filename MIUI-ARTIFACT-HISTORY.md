# MIUI artifact history checks

This document records the distinction between two historical preparation steps. Current candidate qualification belongs in `CANDIDATE-RELEASE.md`; these checks do not replace it or qualify newer controller changes.

Commit `72ff6bd0a57b8b0cccee7feb0e63a431d4a0cdba` retains a frozen 24,305-byte `packages/miui-activity-retention.zip`, SHA-256 `6d0f981b8f2bba972145662a35d8e4ffa5ce3ca3c363ffee0543baab85c31e31`. The `miui-candidate-build.json` at that same commit describes that archive and its earlier integration source. The history test reads both from that exact commit, so a future candidate does not rewrite the meaning of this receipt.

The accordion source at that commit separately produces a 24,396-byte presentation candidate, SHA-256 `4dc6a56c1b605cc2a61a1a402189c04c694cd32f42aa25d81d2af9f18850faa4`. The parent-owned `.tmp/miui-accordion/miui-activity-retention.zip` and adjacent `artifact.json` identify this candidate. Its controller members are unchanged; its manifest adds the accordion and patch description. Neither historical artifact proves device behavior or publication.

`python3 -B test_package_miui.py -v` checks current-source packaging and the separate frozen archive against its own provenance. It does not require them to be identical. To additionally verify an existing presentation-only candidate and its adjacent receipt, select it explicitly:

```sh
MIUI_CURRENT_CANDIDATE=/absolute/path/to/.tmp/miui-accordion/miui-activity-retention.zip \
  python3 -B test_package_miui.py -v
```

The optional check compares the selected ZIP with current source, checks its own commit/hash/size receipt, and verifies unchanged controller members against the frozen archive. A later controller candidate needs its own qualification and receipt; it is not this presentation-only check. All tests call the existing catalog packager; they add no packaging implementation and write no archive, receipt, tag or release record.
