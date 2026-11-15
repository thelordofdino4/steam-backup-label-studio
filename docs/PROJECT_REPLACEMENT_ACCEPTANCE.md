# Project replacement acceptance

> Status: Focused reconciliation and evidence receipt for #303.
> Reviewed baseline: main `eff9c026de39cac891759f7dd5182b9209ef8323`.
> Authority: `APPLICATION_COMMAND_AND_PROJECT_LIFECYCLE_CONTRACT.md` owns lifecycle semantics; this document records the bounded issue criteria and evidence limits.
> Native acceptance: bounded representative Windows coverage completed on primary `dd06e6f67a62a24ceb4aab1ac3e29a38c9de1fae`; exact coverage and limits are below. The #308 legacy baseline defect remains separate. This receipt does not itself close either issue.

## Reconciled scope

[Issue #303](https://github.com/thelordofdino4/steam-backup-label-studio/issues/303)
originally proposed unconditional prompts and abandonment on Main Menu. That
direction was superseded by the lifecycle contract and merged PRs
[#320](https://github.com/thelordofdino4/steam-backup-label-studio/pull/320)
(staged Open),
[#327](https://github.com/thelordofdino4/steam-backup-label-studio/pull/327)
(dirty-aware replacement), and
[#328](https://github.com/thelordofdino4/steam-backup-label-studio/pull/328)
(retained Home/Resume and shared feedback). The reconciliation in
[#356](https://github.com/thelordofdino4/steam-backup-label-studio/issues/356)
and the current [#355 checkpoint](https://github.com/thelordofdino4/steam-backup-label-studio/issues/355)
require acceptance of those owners, not reinstating the old policy.

The current requirements are:

1. Initial Home has no session. New Disc, New Case, and valid Open need no
   replacement prompt. A clean retained session also needs no replacement
   prompt.
2. A dirty Disc or Case session receives Save, Discard Changes, and Cancel for
   same-kind New, cross-kind New, and valid Open. The same rule applies when
   Home retains that session. One unchanged attempt produces one prompt;
   changed session/revision state may require a new decision.
3. Cancel/decline invokes no reset, editor apply, or workspace mutation and
   preserves the exact current session. On Home the Resume card remains.
4. Discard authorizes only the inspected session/revision. Stale permission
   cannot discard a newer edit. New/Open retain their final authorization/CAS
   checks.
5. Guard Save uses the production Save owner in the existing operation. It
   continues replacement only after successful persistence leaves the latest
   session clean. Save cancellation/failure aborts replacement. If R is saved
   while R+1 arrives, R becomes the baseline and R+1 remains current and dirty.
6. Open finishes picker/read/recognition/parse/migration/restore and candidate
   preparation before the guard; cancellation or invalid input never reaches
   the guard or any live apply. Successful adoption uses one complete candidate.
7. Main Menu/Return Home does not abandon work or prompt. Resume returns to the
   retained Disc or exact Case Front/Back/Spine route without read/restore,
   new identity, or baseline changes. Home New/Open is a replacement when a
   session remains retained, unlike initial Home.
8. Typed cancellation/failure and current-project-kept feedback remain visible
   on the originating Home/editor surface. Sidebar and native-menu ingress
   must preserve terminal feedback through dialog state changes.
9. Existing reset, schema, serialization, preview, and export owners remain
   unchanged. Close Project and native Close/Quit are not #303 implementation
   scope; native Close/Quit is tracked by #360.

## Automated evidence boundaries

`src/app/appProjectReplacementMatrix.test.ts` composes the production application
runtime, shared guard, New/Open/Save commands, Open staging, and New reset adapter.
It supplies native dialog/read/decode/write ports and an editor-apply recorder;
it does not mount React or call native dialogs/filesystems. The existing
`appProjectRestore.test.ts` separately exercises the full aggregate apply owner.

The new matrix covers both source kinds and both editor/retained-Home locations:

- Dirty New to both kinds, Cancel/Discard, no callback or session creation on
  decline, and exact retained Resume summary preservation.
- Clean New and clean/dirty Open to both kinds, legacy/package identity,
  staging-before-guard order, and single accepted application.
- Cancelled, invalid, and failed Open without a guard/apply or state change.
- Production nested Save for pathless, legacy, and eligible package sessions,
  including success, Save As dismissal, write failure, baseline adoption before
  replacement, legacy-source identity, and released busy scopes.
- Stale Discard re-evaluation and a real nested Save whose current content
  advances during writing, across all three replacement commands.
- Initial Home Open for both target kinds and recognized persistence formats.

Existing `appProjectNewCommand.test.ts`, `appProjectOpenCommand.test.ts`,
`appProjectReplacementGuard.test.ts`, and `applicationLifecycleRuntime.test.ts`
retain stale final-CAS, repeated-dispatch, and busy-scope oracles.
`appWorkspaceNavigationCommand.test.ts`, `appHomeResume.test.ts`, and
`projectSession.test.ts` cover retained clean/dirty/pathless sessions and exact
routes. `appApplicationCommandFeedback.test.ts` covers typed feedback projection.
The wiring and replacement-dialog source-text tests establish structural
contracts, not native focus, screen-reader, or dialog acceptance.

Run the focused lifecycle suites, full discovered Node and Rust workspace
suites, lint, build, cycle and discovery checks, and `git diff --check` against
the final candidate. Preserve any failed diagnostic logs and distinguish their
cause from a demonstrated application failure.

### Automated receipt, 2026-11-15

The isolated test/documentation candidate based on `eff9c026` passed:

- New replacement matrix: 148/148 tests.
- Focused lifecycle set including the matrix: 229/229 tests.
- Full discovered Node suite: 2,594/2,594, with no failures, cancellations,
  skips, or todos. The aggregate was repeated after the final callback-entry
  assertion was added.
- Locked Rust workspace: 329 tests (84 application and 245 codec), with no
  failures or ignored tests.
- Build, lint, dependency cycles (957 files), discovery (3/3), and diff check.

The first matrix authoring run had six assertion failures: it required baseline
object identity after a real content synchronization, although the lifecycle
store legitimately captures/clones its immutable state. The assertion now
checks complete baseline value equality. The original failed log remains
preserved; no production change was made for those failures.

The full suites used the approved normal execution route documented in
`SOFTWARE_NAVIGATION.md`, including the verified existing Playwright cache.
No security or application setting was changed. Logs in the isolated worktree's
ignored `logs/` directory include `303-matrix-initial.log`,
`303-matrix-final.log`, `303-focused-final.log`, `303-node-full.log`,
`303-rust-full.log`, `303-build.log`, `303-lint.log`, `303-cycles.log`, and
`303-discovery.log`. The build's existing large-chunk warning was non-fatal.
These are source/diagnostic results. Native verification is recorded separately
below and is not inferred from these automated checks.

### Primary integration receipt, 2026-11-15

Candidate `e74ab4a3770fcf8a230f06122f35c3756f6cf55d` was merged into the primary
Case branch at `95bc386cb176687238b4410e1ab9d43ff3379d89`, preserving prior primary
`dd06e6f67a62a24ceb4aab1ac3e29a38c9de1fae` as an ancestor. Only the four approved
test/documentation files changed. The uncommitted native focus-diagnostic
append in `SOFTWARE_NAVIGATION.md` remained byte-identical through that merge.

The integrated primary passed 2,677/2,677 discovered Node tests, with no failed,
cancelled, skipped, or todo tests, plus build, lint, dependency cycles (971
files), discovery (3/3), and diff check. Ignored `dist/` was rebuilt; the running
native development app was not restarted or operated during integration.

Rust was not rerun in primary. Its committed `src-tauri` tree is identical to
the 329-test isolated candidate. Physical comparison of all 90 tracked paths
found 76 byte-identical files and 14 differing only in CRLF/LF, with no other
differences. The previous 329-test result therefore covers unchanged Rust
source/configuration rather than representing a new primary Rust run. The
equivalence record and primary validation logs are retained with the isolated
logs as `303-primary-rust-equivalence.json` and `303-primary-*.log`.

The native/primary receipt updates following this integration change only
documentation; production source and test inputs remain unchanged.

## Native Windows acceptance, 2026-11-15

The authorized native tester completed representative Windows acceptance on
primary `dd06e6f67a62a24ceb4aab1ac3e29a38c9de1fae`. No #303 functional failure or
lost native-menu feedback was observed. Tests used the primary source and the
approved existing #358 Cargo target, launched with `npm run tauri dev -- --no-watch`.
The test/documentation integration at primary `95bc386cb176687238b4410e1ab9d43ff3379d89`
changed no production source. No additional restart is implied by that integration.

`SOFTWARE_NAVIGATION.md` was reread before native action batches. All projects
were disposable source copies or fresh outputs; existing user projects and
frozen #358 evidence were not overwritten. Native input and observations used
the exact process-backed Tauri window, with no browser fallback.

| Surface/state | Observed coverage |
| --- | --- |
| Initial Home | Separate controlled restarts verified New Disc and New Case without a guard. Cancelled/invalid Load stayed Home without Resume and showed feedback. Initial valid Load used a Case package without a guard. |
| Clean sessions | Disc and Case same-kind New, both cross-kind New directions, Case-to-Disc Open, and Disc-to-Case Open bypassed the guard. Cleanliness came from valid packages or successful native Save, not the legacy fixture. |
| Dirty sessions | Case same/cross-kind New, Disc cross-kind New and retained-Home same-kind New, and valid Open from both kinds produced one guard. Representative Cancel/Escape retained state/route; Discard installed the selected replacement once. |
| Guard Save | Successful Case Save created a package before entering Disc. Save As cancellation kept Case and aborted replacement. Deliberate invalid-image Save failure aborted New Case, retained the full-branding Disc, and showed persistent error feedback; the destination was absent. |
| Home/Resume | Return Home did not guard or discard. Disc, Case Front/Cover Sheet, Back/Tray Card, and Spine/Tray Card resumed their exact observed routes. Home cards showed the matching surface and clean/dirty status. |
| Retained Home | New/Open Cancel retained Resume; New Case Discard replaced once. Invalid Open was rejected before any guard; a subsequently valid staged Open guarded the dirty retained session. |
| Modal/reentrancy | Double New activation produced one modal. Tab reached Save and cycled through three buttons back to Save. Escape returned visible focus to New Disc. The documented initial-focus diagnostic used one Return to open Save As without writing. |
| Native File menu | Explicit File > Save cancellation and deliberate invalid-image failure retained the session and displayed toast plus persistent Project File feedback after Save As closed. No historical feedback patch was replayed. |
| Preservation | Saved Case and Disc package manifests/project JSON were inspected and source hashes remained unchanged. This is not a new native reopen/export pass; the earlier #358 preservation/export receipt remains separate. |

Native AX and immediate captures sometimes lagged; read-only observations, not
repeated input, established settled outcomes. Initial document focus in AX and
the absent pointer-focus ring were inconclusive. One Return activated Save and
opened Save As, resolving the initial-focus question without a production fix.
Explicit native File menu Save was used; the earlier unexplained Ctrl+Shift+S
result was not retried or accepted as passing. Case template selection used the
documented bound keyboard End/Return route, not popup-pointer retries.

Controlled, announced Alt+F4 closures exited normally. A post-close AX request
reported an unusable target/no process ID; native inventory and runner exit
results confirmed closure, and input was not retried. One restart log recorded
a controlled-to-uncontrolled React warning at 12:01:33 AM. That session included
legacy loading, but evidence does not isolate its triggering action or attribute
it to #303. No crash occurred; the other inspected restart logs were warning-free.

Local artifacts are in `Temp/sbls-303-native-evidence-20261115` under the user's
Windows profile: `native-receipt.md`, chronological `native-results.txt`, and
`native-restart-1.log` through `native-restart-3.log`. Screenshots were observed
in the native testing transcript; that folder does not claim saved screenshots.

- `case-saved-before-disc.sbls`: 29,184 bytes; Case project, schema `0.4.0`.
- `disc-clean-after-save.sbls`: 8,559 bytes; Disc project, schema `0.4.0`.
- `guard-failure-should-not-exist.sbls` and `menu-failure-should-not-exist.sbls`:
  both absent after the deliberate failures.
- The unchanged Case, Disc, and legacy source-copy SHA-256 values were,
  respectively, `e8248d41c3fdc954e88c9a4c1aea5db32e80626c981042cffa24aa0a8c350869`,
  `b9d86d7a93bcd71dd9d07a7c1317320ecf775cb71fe187af82549390f7527cb7`, and
  `bfb46f90992a3b5805c7e2d97653b941a6e6c601893385d1a3d31cb3da5c4693`.

The app was left open on a disposable blank Case cover. This evidence is bounded
representative Windows acceptance, not every source/action/outcome permutation,
shortcut, menu item, platform, packaged build, screen reader, physical print, or
the broader Case finish line. Initial valid Load used Case; later valid Open
flows exercised both kinds. The #308 legacy exception was used only for failure
testing, never as evidence of clean-session behavior.

## Separate #308 baseline defect

[Issue #308 comment 6889060855](https://github.com/thelordofdino4/steam-backup-label-studio/issues/308#issuecomment-6889060855)
records a pre-existing full-branding legacy Disc Open mismatch. Parsed Open
initially creates a clean baseline, but the later restored aggregate adds
defaults/provenance, changes the background note, and clamps a PC mark. Its
first synchronization becomes dirty without a user edit.

The matrix above proves guard behavior against supplied authoritative session
states; it does not prove that every restored React aggregate remains equal to
its Open baseline. In particular, its clean Open assertion precedes a mounted
React restore/synchronization cycle. Do not suppress guards, exclude design
fields from comparison, or claim #308 is fixed to make #303 pass. The clean
initial Open, subsequent real edit, and failed-conversion baseline/path
regressions belong with the focused Open baseline repair under #308. Any #303
acceptance case constrained by that defect must name the exception explicitly.
