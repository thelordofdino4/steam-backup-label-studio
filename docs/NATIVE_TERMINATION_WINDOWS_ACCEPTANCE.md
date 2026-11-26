# Native Close/Quit Windows acceptance, 2026-11-15

Status: source validation and bounded Windows native acceptance passed. Publication,
remote CI and the remaining issue-level acceptance work are pending. This record
does not close [#360](https://github.com/thelordofdino4/steam-backup-label-studio/issues/360).

## Exact source boundaries

- Main-only source candidate: `2928463f0b9da7ffd4f2528653346118b9308bdf`, based on
  `fc1cd4dd52f99645163726d859fd784a10c28db7`. Independent source review approved it.
  Its immutable-head checks passed 2,819 Node tests in 370 files, 338 Rust tests
  (93 application and 245 codec), build, lint, cycles and discovery.
- Tested primary integration: `5088fa23b8d39e5ab094052576c6028e7bc1a688`, preserving
  the existing local Case work from `893e0ee9`. Independent integration review
  approved it. Its checks passed 2,991 Node tests in 380 files, 338 Rust tests,
  build, lint, cycles and discovery. The 24-case real React/Case fixture proves
  painted/unpainted finish, stale authorization, admission, recovery, queued
  branding and Save R/newer R+1 behavior under controlled scheduling.
- The Rust subtree is identical in both source candidates. The primary adds the
  existing Case finish-before-plan/completion adapters; it is not a publishable
  replacement for the main-only branch. No unrelated Case code is included in
  that branch. Native observations below apply to primary `5088fa23`, not to a
  separately launched main-only runtime or to a packaged release.
- Primary was fast-forwarded and rebuilt before the native pass. All 47 generated
  assets match the isolated tested build. All original tracked files remain,
  all 98 tracked image/font assets are preserved, and the seven earlier fixture
  files retained their hashes. Documentation-only successors retain this tested
  application source; their documentation commits are not additional native runs.

## Observed native behavior

The real Windows Tauri development app was launched six times from primary using
`npm run tauri dev -- --no-watch`. Each deliberate close/relaunch was announced.
Fresh native window inventory and process checks confirmed six actual exits,
separately from command or IPC acknowledgements. Disposable input copies and new
output folders protected the user's source assets.

| Observation | Verified result |
| --- | --- |
| No-project Home, titlebar X | Closed without a false preservation warning. |
| Dirty new Disc, repeated X | One visible Save/Discard/Cancel guard; Cancel retained the preview. |
| Dirty Disc retained on Home, Ctrl+Q | Guard opened; Save As dismissal cancelled Quit and retained the unsaved Resume card and Disc. Repeated Ctrl+Q during the picker opened no extra visible guard/window. |
| Pathless Disc, Alt+F4 then Save | Wrote a new package and actually closed. Its byte-identical reopening copy restored the Disc. |
| Clean loaded Disc, File > Close Window | Closed without a guard. |
| Case framing, Ctrl+W then Cancel | Kept Crop, horizontal focus 18, vertical focus 50, zoom 1 and preview; the saved baseline hash stayed unchanged. |
| Case framing, Ctrl+Q then Save | Wrote the adopted path without another Save As picker and actually closed. Reopening restored the final framing and image. |
| Clean reopened Case, File > Quit | Closed without a guard. |
| Dirty unsupported-image legacy Disc, Quit then Save | Reported the expected image-invalid failure, kept the edited preview open and created no output. |
| Fresh Quit after that failed Save, then Discard | Prompted again for still-dirty work and actually exited after Discard. |

These observations cover representative entrances and branches, not every
entrance/state combination or internal permit count. Completed Case gesture
persistence was observed; a held-pointer race was not.

## Saved-package inspection

The final Case package has SHA-256
`24dd8b651e5f4ddc9cf64f9566b889debbef82894554ff700258912bdee77618`.
Read-only comparison with its preserved source found exactly four changed JSON
leaves:

- `caseInsert.templates.tray.artworkSlots[0].fit`: `contain` to `crop`.
- Its `reservedArtworkViewport.focalPosition.xPercent`: 82 to 18.
- `caseInsertLayoutPreset.applicationRevision`: 12 to 14, alongside those two edits.
- `savedAt`: the new save timestamp.

All four embedded assets are byte-identical to source. Asset metadata and all 13
bindings are unchanged. ZIP CRCs, the project payload hash/length and every asset
hash/length validate. No other project value changed.

The Disc output has SHA-256
`b49ae094dcd6115752831e81977cccd189cf3534546deba4b2708fb9c8c14bcb`.
It is a valid schema 0.4.0 `standardPrintableDisc` package with no embedded assets
or bindings. Its ZIP CRC and project hash/length validate. Native reopening is
recorded separately above. The deliberate failure destination contains no files.

## Evidence and environment limits

The frozen local evidence set is `sbls-360-native-evidence-20261115` in the Windows
temporary directory. It contains the native receipt, six launch logs, initial
fixture manifest, final artifact manifest and the unchanged Case baseline.

- `native-acceptance-receipt.md` SHA-256:
  `0d6fbe85c6e89789b216497b4081878854f86bb299c746e137d97eafc93bee0c`.
- `final-artifact-manifest.json` SHA-256:
  `87c8e447117dc0c792f37bc1898cb0a26f81f392d8559960bdfcfc800830b7de`.
- Separate implementation evidence set `sbls-360-evidence-20261115` contains
  `primary-5088fa23-receipt.json`, exact-head check logs and
  `native-package-inspection.json`. The latter's SHA-256 is
  `d8353c903518e3ca272df81e52b08af8c4235b3c0b70ed2925856c1f5198ef02`.

All seven earlier original fixtures and four new source copies remained unchanged.
Reopening copies match their saved outputs. All three disposable fixture folders
under `src-tauri` stay untracked and must be excluded from commits.

Post-close unusable-window/capture observations were resolved by read-only native
inventory, not repeated input. A transient screenshot-only monitor error after
Case selection did not invalidate the separately observed successful selection.
Each development runner emitted its own CIM access-unavailable cleanup error
after the app had already exited. Only the owned runner was interrupted then;
graceful runner exit is not claimed. Nonfatal hard-link and close-time IPC/menu
or Chromium cleanup warnings remain in the logs without an inferred root cause.
At completion there was no SBLS window, app/node process or port 5173 listener.

## Readiness versus issue closure

The bounded main-only implementation is source-reviewed and locally validated,
with representative Windows acceptance on the preserved primary integration.
It is ready for a publication decision and subsequent exact-head remote CI/PR
review. Nothing in this record authorizes publication or substitutes local review
for GitHub approval. Keep #360 open when publishing this bounded change.

Remaining acceptance work must be retained explicitly:

- Busy/modal source ownership is tested, and a native Save As overlap was
  observed. Active Open/export overlap was not separately exercised natively.
- Native timing did not establish live import completion, post-guard edits,
  held painted/unpainted gestures, Save R/newer R+1 or reentrant cleanup. Those
  have deterministic automated evidence, not a native timing claim.
- Native rejection/uncertain-outcome fault injection was not performed. The
  source and Rust tests cover fail-closed behavior, not real transport loss.
- Dirty Case Discard, a separate retained-Home Case termination branch and all
  entrance/state combinations were not exercised. No new PNG, accessibility,
  DPI, performance, physical-print or Windows packaged-release pass is claimed.
- Linux [#333](https://github.com/thelordofdino4/steam-backup-label-studio/issues/333)
  and macOS [#334](https://github.com/thelordofdino4/steam-backup-label-studio/issues/334)
  remain open. Their current bodies still describe Close/Quit as disabled or
  out of scope; the new owner must be explicitly reconciled with those platform
  acceptance plans before claiming the cross-platform coordination criterion.
  No issue bodies or comments were changed in this work.

The nine current #360 criteria therefore have source evidence and representative
Windows coverage for clean/dirty/Cancel/failure/Save and duplicate-prompt behavior,
but the broader busy/modal and platform acceptance claims are not complete.
The next decision should separate merging this bounded source change from
declaring the whole issue complete.
