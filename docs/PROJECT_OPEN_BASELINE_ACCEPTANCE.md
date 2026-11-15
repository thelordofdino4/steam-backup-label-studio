# Project Open baseline acceptance

> Status: Focused #308 source repair; native acceptance blocked before project load.
> Baseline: main `5a899b88e0c4137c6b15839ca0a4cc0e2bbb32c1`.
> Authority: `APPLICATION_COMMAND_AND_PROJECT_LIFECYCLE_CONTRACT.md` owns session semantics; `PROJECT_FILE_SPEC.md` owns restoration policy.

## Bounded defect and repair

[Issue #308 evidence](https://github.com/thelordofdino4/steam-backup-label-studio/issues/308#issuecomment-6889060855)
identified a legacy full-branding Disc that became dirty at revision 1 during
its first editor synchronization without an edit. The parsed snapshot preceded
restoration defaults, embedded-logo provenance, the snapshot owner's background
note, and safe-zone clamping of the PC mark from `(24, 82)` to
`(24.122868755624978, 81.84877691615388)`. Failed conversion Save did not cause
that initial transition.

`appProjectLoad.ts` now captures the accepted Disc snapshot after restoration
and final preset reconstruction/fallback. It uses `createProjectSnapshot`, the
same persistence projection as editor capture, retaining the source `savedAt`
timestamp. The existing lifecycle Open owner atomically installs that prepared
aggregate and its clean baseline. The first canonically equal editor capture
is a revision, state, and publication no-op. A real edit still becomes dirty.

This is shared Disc staging for both legacy JSON and hydrated package input.
The Case staging owner is unchanged. Restoration/clamping policy, asset bytes,
schema, dirty comparison, replacement guard, Save failure behavior, and native
I/O are unchanged. No design fields are excluded from dirty comparison and no
post-Open effect clears dirty state. Close/Quit, history, crash recovery, broader
lifecycle work, and banner-provenance policy are outside this repair.

## Automated acceptance

`src/app/appProjectOpenBaseline.test.ts` runs the production runtime, Open
staging, aggregate applier, normal workspace snapshot, synchronization, shared
guard, and Save owners. Native I/O and React setter ports are supplied by the
test. This is stronger than candidate-to-candidate equality, but does not mount
React or establish native visual acceptance.

The 15 regressions cover:

- All five tracked legacy fixtures, including full branding, minimal schema
  migration, custom geometry, disabled defaults, and background-only content.
- Canonical baseline equality, revision zero, repeated synchronization with
  no state/publication changes, source timestamp, path, and format preservation.
- Full-branding embedded assets/provenance and existing PC safe-zone clamping.
- Hydrated package Disc input and a Case Back/Tray control.
- Successful guided reconstruction and a browser-measurement failure after
  restoration that deactivates guidance before baseline capture.
- A genuine title edit that advances once, preserves the clean baseline, and
  still activates the replacement guard.
- Failed and cancelled legacy conversion from both clean and edited sessions,
  preserving exact state, identity, path, format, baseline, content, and dirty
  status. The failed write port models the native invalid-image rejection;
  it does not prove filesystem atomicity.
- A later invalid Open preserving both the session and applied editor state.

The first run on unchanged production source failed 12 of 13 tests; the Case
control passed. Final guided cases were then added. An initial post-fix test
used the wrong provenance property name; correcting that test gave 15/15.
The broader package staging test initially matched valid
`titleArtwork.steamArtworkAssetId` against a substring prohibition on package
`assetId`. Its assertion now checks exact JSON metadata keys rather than
rejecting a valid restored design field.

### Automated and primary integration receipt, 2026-11-15 UTC

Reviewed source candidate `bbd19e6c053b3574cc65ddd52fc08430564e2e0d` passed:

- New aggregate baseline regressions: 15/15.
- Focused lifecycle suites: 241/241.
- Full discovered Node suite: 2,609/2,609, with zero failures, cancellations,
  skips, or todos.
- Locked Rust workspace: 329 tests, comprising 84 application and 245 codec
  tests, with zero failures or ignored tests.
- Build, lint, dependency cycles (958 files), discovery (3/3), and diff check.

An independent review reported no blocking findings and separately passed 94
focused tests. The candidate was merged locally into the primary checkout as
`51ad8df83c483e8a874b1619c8f87982714c74f7`, preserving prior primary
`55d8beaf044fef03f14b197d1653a2e00471cb98` and its local Case work as an ancestor.
The primary was clean and synchronized to the fix, and its ignored `dist/`
output was rebuilt. Integrated primary validation passed 2,692/2,692 Node tests
with zero failures, cancellations, skips, or todos, plus build, lint, dependency
cycles (972 files), discovery (3/3), and diff check.

Rust was not rerun in primary. Both checked-in `src-tauri` trees are exactly
`d08155290b458acc5984cde54856be87c93a58cb`; the isolated 329-test result covers
unchanged Rust source/configuration rather than representing a second run.

Validation commands were `node --test --experimental-strip-types` with the
focused suites, `npm run test:node`, `npm run test:rust`, `npm run build`,
`npm run lint`, `npm run check:cycles`, `npm run test:discovery`, and
`git diff --check`. The Node suites used the verified existing Playwright cache
and tool-approved normal execution for the documented restricted Vite cache
error. Initial restricted dependency installation failed with Windows EPERM;
approved locked offline installation succeeded. No security setting changed.
The build's existing large-chunk warning was non-fatal.

Logs remain in the isolated worktree's ignored `logs/` folder, including
`308-baseline-red.log`, `308-baseline-first-fix.log`, `308-baseline-green.log`,
`308-focused.log`, `308-focused-final.log`, `308-node-full.log`,
`308-node-final.log`, `308-rust-full.log`, and the `308-primary-*` and final
build/lint/cycles/discovery logs. Failed diagnostic records are retained.

## Native Windows attempt and blocker, 2026-11-15 UTC

The native tester launched `npm run tauri dev -- --no-watch` from primary
`51ad8df8`, using the existing #358 Cargo target. Vite and Cargo started
successfully, and the exact executable-backed native window displayed Home.
One Home Load Project action eventually displayed the owned Windows Open
dialog. Immediate observations had lagged; no initiating click was repeated.

One documented filename-entry batch returned without tool errors, but repeated
read-only observations showed the filename empty, Search Box focus in AX, and
no loaded project. The visible filename caret and reported focus disagreed.
The previously successful binding and key syntax were checked with the prior
tester, but no evidence-supported correction was established. Navigation
stopped before loading any project. The exact chronological evidence is retained
unchanged in `SOFTWARE_NAVIGATION.md`.

This is a native input-routing/observation blocker of unknown cause, not a
demonstrated application regression or a lifecycle pass. No project Open,
Save/conversion, edit, replacement guard, Home/Resume, or export acceptance was
completed. No output package or PNG was created. No browser fallback, repeated
input, security bypass, or restart after the blocker was used. The native app
and its Open dialog were left open for investigation or user handoff. A failed
CIM metadata read was not retried and supports no process-state conclusion.

The four original inputs and their disposable copies retained the recorded
SHA-256 values, verified again when preparing this receipt:

- Full-branding legacy: `bfb46f90992a3b5805c7e2d97653b941a6e6c601893385d1a3d31cb3da5c4693`.
- Minimal legacy: `00a2eb591d2851063b8d201fa451b9b98efd4b0258ba5db784a3e33d8dc7d040`.
- Disc package: `b9d86d7a93bcd71dd9d07a7c1317320ecf775cb71fe187af82549390f7527cb7`.
- Case package: `e8248d41c3fdc954e88c9a4c1aea5db32e80626c981042cffa24aa0a8c350869`.

The native receipt, launch log, and source manifest are in
`Temp/sbls-308-native-evidence-20261115` under the user's Windows profile.
Screenshots were observed through the native tool, not saved as image files.

Issue #308 is not closed. The source candidate and local primary integration
are validated as described above, but native lifecycle acceptance remains
blocked. Branch publication and the remote-main merge remain explicitly held
pending the owner's response to the named-branch publication request. No branch
push, PR creation, or remote merge is claimed by this receipt.

## Remaining native acceptance

From the synchronized primary checkout, Open a disposable copy of the legacy
full-branding fixture, confirm clean Home/Resume and prompt-free clean
replacement, then make a real edit and confirm the guard. Verify cancelled and
invalid-image conversion failures retain the displayed design and correct
clean/dirty status without writing the legacy source. Repeat a representative
minimal migration, valid package, and Case control. Record actual native
observations separately; automated results do not close the broader #308 issue.
