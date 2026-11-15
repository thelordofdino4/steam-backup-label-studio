# Project replacement acceptance

> Status: Focused reconciliation and acceptance plan for #303.
> Reviewed baseline: main `eff9c026de39cac891759f7dd5182b9209ef8323`.
> Authority: `APPLICATION_COMMAND_AND_PROJECT_LIFECYCLE_CONTRACT.md` owns lifecycle semantics; this document records the bounded issue criteria and evidence limits.
> Native acceptance: pending. This test/documentation change does not establish native acceptance or close #303/#308.

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
These are source/diagnostic results; no native UI was operated for this change.

## Native Windows acceptance matrix

Read `SOFTWARE_NAVIGATION.md` before testing and every navigation batch. Use the
authorized native Tauri app from the primary checkout and disposable fixtures
with fresh output paths. Never replace existing user projects. Record actual
source/primary commits and outcomes; browser checks cannot satisfy this matrix.

| Surface/state | Required observation |
| --- | --- |
| Initial Home | New Disc/New Case/valid Load need no guard. Picker cancellation and invalid files leave Home with accurate feedback. |
| Clean Disc and Case | Same-kind New, cross-kind New, and valid Load replace without a guard. Establish and verify a clean source rather than assuming every legacy Open is clean. |
| Dirty Disc and Case | Same-kind New, cross-kind New, and valid Load each show one normal prompt. Cancel/Escape retains the visible project, route, and controls. Discard installs the selected target once. |
| Guard Save | Successful Save completes before replacement. Save As cancellation and an observed failed write retain the original project and abort replacement. Verify output/source preservation independently where possible. |
| Return Home/Resume | No abandonment prompt. Dirty and clean projects remain resumable, including exact Case Front/Back/Spine routes and current content. |
| Home with retained work | Dirty New/Load is guarded; Cancel keeps the Resume card and project. Clean replacement requires no guard. |
| Invalid/cancelled Load | No guard or partial editor reset on either editor or retained Home. |
| Dialog/reentrancy | Initial focus, Tab/Shift+Tab containment, Escape and focus restoration, repeated activation, and no overlapping dialogs. |
| Feedback ingress | Check sidebar and native-menu cancellation/failed guard Save. Terminal feedback must survive modal updates and remain readable after return to Home. |
| Preservation | Representative save/reopen and PNG export retain current artwork, disabled state, text, and geometry. No new rendering/schema behavior is introduced by these tests. |

This matrix does not certify every platform, packaged build, screen reader,
physical print, or the broader Case editor finish line. Record a blocker or
explicitly tracked successor for any unfulfilled criterion before closure.

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
