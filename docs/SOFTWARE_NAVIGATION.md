# SBLS Software Navigation

> Read before starting any SBLS testing and before every navigation/interaction attempt, including retries. Updated 2026-11-15 UTC. Subordinate to AGENTS.md, user authorization, and platform safety.

## Required procedure

1. Read this document from the tested checkout before each planned action or deterministic action batch. Inspect fresh native state and identify the authorized app.exe/window and control. Never reuse stale indices or coordinates.
2. Use documented computer-use APIs only. Observe the result before choosing another action; a successful tool return is not acceptance. AX may lag: inspect the screenshot/current tree rather than repeating input.
3. On failure, stop navigation. Discover and document the failed action, target, exact error/state, evidence-supported cause, uncertainty, correction, and outcome here. Reread the updated entry before a materially changed supported retry. If cause/correction remains unsupported, investigate read-only or report the blocker. No guessing or blind repetition.
4. This replaces the fixed retry count, not permission denials, security boundaries, tool restrictions, or user stops. Check uncertain outcomes first. Do not inject UI state/input through shell, hidden JavaScript or OS messages; do not disable guards.
5. Use disposable projects/new filenames. Native Tauri is acceptance; browser localhost pages are diagnostic only. Announce controlled restarts/closing before stopping the visible app.

## Verified navigation routes

- Bind the native window by observed exact executable path, never title alone. Fresh screenshot before coordinate actions; AX-only reads clear coordinate mapping. Multiple regions require their screenshotId.
- Screenshot clicks: Home > New Disc, Template, Project File. Collapsing Project File exposes Template. Reobserve positions after transitions.
- Disc type: click the closed combo, then Home/End and Return selects first/last observed option. End then Tab on the focused closed combo also selects Custom and focuses Outer diameter. Avoid popup pointer clicks.
- Fields: Tab/Shift+Tab traverse the five dimensions; Ctrl+A then type replaces text; BackSpace clears. Observe focus/value/error. No spinner or arrow-step acceptance claimed.
- Save/PNG destination: observe native Save As first; Alt+N, Ctrl+A, full new filename, Return. Project File > Export PNG opens preflight; Return accepts the observed focused Export PNG button. Inspect destination dialog before entry.
- Resize: Alt+Space opens Windows system menu. Observe enabled Size. s, Right, repeated Left, Return shrinks width; s, Down, repeated Up, Return shrinks height. Verified screenshot extents 1002x750 -> 902x750 -> 902x700. These are screenshot dimensions, not measured client/DPI values.
- Close: Alt+F4, then verify native inventory no longer contains SBLS. Verified successful; runner exited 0.

## Failure evidence and corrections

- Missing tauri CLI: candidate dependencies incomplete; locked npm ci restored them. Offline attempt lacked cached package; normal restore succeeded.
- Blank initial launch: Vite EPERM renaming generated dependency cache. Runner deliberately stopped, not demonstrated crash. Approved escalated relaunch rendered Home. Underlying Windows permission mechanism unproven; do not assume future escalation permission.
- Indexed New Disc click after AX-only bind: "coordinate input geometry is unavailable". Tool docs say AX-only observation clears mapping. Fresh screenshot/visible-coordinate retry opened New Disc successfully.
- Custom popup click rejected: point (544,1350) over msedgewebview2.exe "Chrome Legacy Window", not target app.exe. Target check classified child popup outside bound window; coordinate translation contribution unknown. Keyboard selection in bound app succeeded without bypassing check. No direct popup-pointer retry.
- Right-edge drag: unchanged size, preview rail exposed, so native sizing was not engaged. Exact border hit-test/translation unknown. OS Size keyboard route above succeeded without guessing border coordinates.
- Save As: "A required project asset could not be captured safely"; no file created. Dialog navigation succeeded. Investigation identifies empty rating settings being treated as custom-image evidence by asset capture planner (#358); focused one-line correction excludes the empty settings object from hasAcceptedEvidence. Production blank-Disc regression failed before and passed after (7/7); build/lint/Rust checks passed. Vite logged page reload of src/package/projectPackageCapturePlan.ts at 21:39:45 local. Retrying Save on this corrected candidate is now evidence-supported; native Save Project created an 8920-byte package, Load Project reopened it successfully with 125.5/15/22/118/110. Saving with Outer diameter raw draft "-" also succeeded; reopening restored committed 125.5 and cleared its error.

## Historical acceptance on isolated #307 candidate bed8c8de

Passed raw empty/-/1./1e retention, inline errors/stable preview, 306 range error, Safe zone 119 errors on both conflicting fields without clamping, correction to 110, immediate Outer 125.5 preview update, keyboard traversal, Standard -> Custom recovery to 125.5/15/22/118/110. Valid and invalid-draft native PNG exports are byte-identical 1488x1488 (SHA256 FC2AF9A6867BBC4591C36808A5C390DE22588A47AA6BF3F9A1A4397324030705).

Narrow editor at 902x700 verified readable wrapped errors, intact preview, and Tab scrolling focused lower fields into reach. Screen reader, exact client/DPI, and physical print calibration are not verified. Primary app code was not changed; both fixes remain in the isolated candidate. These historical results do not validate later code. Detailed run record: native-recovery-20261107/manual-results-20261115.txt under the isolated test workspace.

- Native File menu displayed Ctrl+Shift+S, but Escape then that accelerator produced no dialog; window inventory confirmed none. Registry declares the accelerator, so exact event/focus cause is not established. Do not retry that shortcut. Use the previously verified explicit Project File > Save Project control instead, after fresh observation.

- Single-advisory fix verified natively with Safe zone 119 / printable 118: both field validation messages remain, exactly one advisory sentence appears at the bottom, no overlap at 902x700. Window left open on this disposable test case for review. No direct popup click or accelerator retry performed.
- Automated browser checks: initial missing executable came from redirected Playwright cache; explicit existing cache resolves launch. Later harness blank-page timeouts report Vite 504 Outdated Optimize Dep before Template interaction. The restricted cache-corrected run exited 1 with nine failures; the final approved run passed 2418/2418.

Final scoped checks: focused capture/geometry23/23, build, lint, cycles, discovery3/3, Rust318/318, git diff --check passed. Initial restricted browser aggregate was blocked: independent port/cache reproduced React dependency504 before Template. Final approved execution passed all 2418 Node tests.


Further diagnostic: Vite logging shows bundling succeeds, then Windows EPERM denies deps_temp_* -> deps rename; 504 is downstream. Explicit fixture entries did not fix it, ruling out discovery as sufficient correction. The approved execution result follows; no security settings changed.
Resolution update: approved isolated execution resolved the optimizer EPERM/504 without production Vite/config changes. A new assertion initially counted harness debug JSON as a duplicate advisory; scoping it to the actual Template panel corrected the test. All nine dimension integration tests now pass. Final full Node rerun passed 2418/2418, exit 0; earlier failure records remain historical evidence.
Test execution route: Vite8.0.14 cache rename failed under restricted runner. Use only a tool-approved execution context and the verified existing PLAYWRIGHT_BROWSERS_PATH=C:\Users\John Paul Keller\AppData\Local\ms-playwright. Approval is not implied for later runs. Do not blindly repeat timeouts, disable guards, or change application code to conceal this environment failure.

Final verification: full Node 2418/2418, dimension integration 9/9, focused capture/geometry 23/23, Rust 318/318, build, lint, cycles, discovery 3/3 and diff-check passed. Native save/reopen, last-valid draft serialization, narrow layout and single-bottom-advisory119 passed. No publication, commit, merge, issue closure or primary app-code update. Screen reader, exact client/DPI and physical print remain outside this acceptance.


## Primary integration receipt - 2026-11-15 UTC

The isolated-candidate and no-publication statements above describe the historical pre-integration run, not current repository state. Its failure evidence and restrictions remain applicable. PR #409 subsequently merged to main `4cd5c40d74d40e22f21089d56320bd35ea65d708`. The primary checkout, preserving local Case work, was verified clean at `521572258457c021c8afd4afe52af7a08b90fe87` before this documentation update.

- Primary generated `dist/` was rebuilt successfully, the old isolated native session exited normally, and the native application was restarted from the primary checkout. The native tester reported no new navigation failures.
- Native Load Project reopened `307-valid-fixed-20261115.sbls`. Committed dimensions were 125.5 / 15 / 22 / 118 / 110. Outer diameter draft `-` remained visible with its specific error and stable preview; correction to 125.5 succeeded.
- Four keyboard Tabs reached Safe zone. Entering 119 showed both relationship errors and exactly one advisory at the bottom. At screenshot dimensions 902x700, scrolling and wrapped errors remained readable. This repeats primary reopen and validation smoke only: no new primary Save or PNG export acceptance is claimed. Earlier save/export evidence belongs to the isolated run.
- Primary full Node suite passed 2501/2501, with zero failed, cancelled, skipped, or todo tests. Build, lint, cycle check (961 files), discovery (3/3), focused Case integration (7/7), and diff-check passed.
- The first primary suite passed 2500/2501: a source-inspection test expected LF while `src/app/App.tsx` had CRLF. The exact token was absent in raw text and present after newline normalization; this was not an application seam regression. The test-only `readSource` normalization was committed locally as `52157225`; focused and full suites then passed. No production source workaround was needed.
- Rust tests were not rerun for this receipt. All 83 tracked `src-tauri` paths matched the previously tested candidate: 67 were byte-identical, and 16 differed only by CRLF/LF. Cargo manifests and lockfile were byte-identical. Prior Rust 318/318 results therefore cover the unchanged Rust source/configuration, rather than representing a new primary Rust run.
- Passing full-suite log: `primary-node-portable-20261115.log` in the isolated test workspace. The detailed local manual-results record contains this receipt. Screen reader, exact client/DPI measurements, physical print calibration, and fresh primary save/export remain outside this repeated smoke.

## Capacity native navigation receipt (2026-11-15 UTC)

On primary `b739cce3`, the native tester successfully loaded both disposable
capacity legacy fixtures, saved each to a fresh `.sbls`, reopened each package,
and repeated Save. No navigation failure was reported. Native package inspection
confirmed one exact BMP asset and four bindings per project, preserved Disc
disabled artwork state and Case background owners, and unchanged original legacy
files. This extends the earlier primary smoke receipt with fresh Save/reopen
coverage. Detailed sizes, hashes, source checks, and measurement scope are recorded
in `PROJECT_PACKAGE_SAVE_CAPACITY.md`. This is Windows debug representative
coverage only. Representative process-tree memory sampling completed without
collection errors; results and limitations are in the capacity receipt. Broader
maximum-envelope and cross-platform format-contract gates remain open. The
required read-before-navigation and evidence-gated retry procedure remains in force.
