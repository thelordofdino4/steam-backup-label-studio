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

## Isolated image-policy integration (2026-11-15 UTC)

Initial automated Rust workspace run failed before compilation: Cargo could not create this isolated worktree's src-tauri/target directory (Windows access denied, os error 5). No test executed and this is not an application failure. Requesting tool-approved normal execution is the supported next step; no security setting change or alternate write path is used. Outcome remains pending.


Restricted Node aggregate: guided browser harness timed out before interaction. Independent Vite diagnostic reproduced EPERM renaming logs/image-policy-cache-diagnostic/deps_temp_60034e54 to deps; default cache likewise retained only deps_temp directories. The partial aggregate was stopped through its own execution session after three timeouts. This does not establish an app regression. Requesting approved normal execution for aggregate retry, using the verified Playwright cache; no production configuration changes. Outcome pending.

Final isolated integration outcome: approved normal execution passed all 2446 Node tests (zero failed/cancelled/skipped/todo) and the final Rust workspace passed 329 tests (84 app + 245 codec; zero failed/ignored). The temporary ignored fixture exporter was removed before that final Rust run. Focused import/capture/save/load checks passed 67/67; build, lint, dependency cycles (956 source files), discovery (3/3), and diff-check passed. Capacity final receipt 5206a266 was integrated as a docs-only delta; merging remote main 937bcc7 added ancestry only and no tree changes. Existing equivalent blank-Disc regression and import were retained once. These are automated source checks only; this worker did not launch Tauri, interact with native UI, change the primary checkout, publish, or close issues.

Native-test fixtures were materialized directly from the existing Rust conformance catalog in the isolated workspace. PNG/JPEG/GIF/BMP (1x1) and WebP (2x2) passed the codec importer. One-byte-truncated variants of each family and SVG bytes declared as PNG returned asset-type-invalid; lossless JPEG and 32-bit BMP returned their respective unsupported-profile errors. User SVG is rejected before adoption. The original full-branding legacy fixture was copied for separate compatibility/conversion-warning testing. Tiny catalog fixtures establish format acceptance and exact-byte test inputs, not print-quality or native rendering acceptance. Actual upload feedback, replacement preservation, disabled-state retention, WebView IPC, Save/Open/export, Steam/web/local source flows, and native visual behavior remain the next gate.

## Partial native image-policy receipt (2026-11-15 UTC)

On primary `9c061231a8f9580f6aca286227ec894b3f4c9240`, the native tester exercised five real Windows file pickers: PNG for the background, JPEG for game-title/logo artwork, WebP for Additional Artwork 1, GIF for the developer logo, and BMP for the publisher logo. All five imports were accepted and the visible preview updated. Replacing the existing JPEG with `unsupported-lossless.jpeg` was rejected; the original image, enabled state, and placement visibly remained intact.

The tester then disabled the JPEG title artwork, saved all five raster assets to the disposable `five-formats-baseline.sbls` under `Temp/sbls-358-native-evidence-20261115`, and reopened it successfully. The preview was retained and the JPEG remained hidden. Independent inspection confirmed the five exact image payloads, their MIME types, dimensions, and owners, including the disabled JPEG. This is a partial native interaction receipt, not completion of issue #358.

Observed navigation routes were Background Image > Local file; Game Title > Show game logo; Company Logos > the respective developer or publisher enable checkbox; and Additional Artwork > enable > Add artwork element > Local file. For each observed native picker, Alt+N, Ctrl+A, the exact fixture path, and Return selected the file. On the initial picker transition, the accessibility tree was unavailable while the modal opened; a fresh screenshot confirmed the actual dialog, and the tester did not repeat the opening click. Accessibility observations sometimes lagged behind the visible result, so screenshots were used to observe completion instead of repeating input. Sidebar scrolling worked, but large requested scroll amounts advanced bounded portions; the tester observed progress before continuing.

No new action failure requiring a retry and no source correction were reported in this partial run. At this initial checkpoint, rejection cases, Case coverage, legacy conversion, source flows, and PNG export remained open; the subsequent partial receipts below record their later results. The native session remains under the coordinating tester's control; this documentation update did not operate or restart it.

### Partial native image-policy progress: Disc rejection, export, and legacy Open

The native tester completed eight additional rejected Disc background replacements: truncated PNG, JPEG, WebP, GIF, and BMP; SVG bytes spoofed as PNG; unsupported 32-bit BMP; and a user SVG. Each rejection retained the previously accepted PNG, its provenance and enabled state, placement values 1 / 0 / 0, and the visible preview. Together with the earlier unsupported-lossless JPEG replacement, these are nine observed rejected replacement cases. Full rejection guidance was available under Project File; transient toast text was sometimes truncated and differed by error category. No retry or new navigation failure was reported.

Save Project on the existing disposable package wrote in place without opening a destination dialog. Independent comparison confirmed that the rejection-final package is byte-identical to the original baseline, including its timestamp. Inspection of the earlier baseline confirmed a 13,000-byte package containing exactly the five original image payloads with their expected MIME types, dimensions, and owners, including the disabled JPEG. The unchanged package is 13,000 bytes with SHA-256 `b9d86d7a93bcd71dd9d07a7c1317320ecf775cb71fe187af82549390f7527cb7`.

Native PNG export produced a 1423 x 1423 RGBA file of 143,454 bytes with valid PNG CRCs. The exported image showed the expected four visible imported assets and the Steam built-in, with the disabled JPEG absent. The UI reported 300 DPI, but the PNG contained no pHYs metadata; no embedded physical-resolution metadata claim is made.

Opening the copied legacy full-branding fixture succeeded with a visible conversion warning and rendered Steam, ESRB, DVD, PC, and operating-system built-ins. Save As to the fresh `legacy-conversion-should-not-exist.sbls` destination failed with: "This image is invalid or its contents do not match its format. Re-export it as PNG and try again." The visible preview and session were retained, the destination file was absent, and the original fixture SHA-256 remained `BFB46F90992A3B5805C7E2D97653B941A6E6C601893385D1A3D31CB3DA5C4693`. Internal path and baseline invariants were not directly observed in this native test.

This receipt remains explicitly partial. Later Case, transparency, Steam, and web results are recorded below. The later local-screenshot result is recorded below; independent comparison of the latest Disc in-place save is complete. This documentation update did not operate the native session, change source code, commit, or publish anything.

### Native screenshot capture interruption (2026-11-15 UTC)

After entering Portal in Case Game > Steam search and submitting Search Steam, the AX observation returned the query but screenshot capture reported `no monitor found for window`. No UI input was repeated. Fresh inventory still listed the authorized app.exe window 3870860, and a read-only rebind exposed actual Portal search results, including App ID 400. Therefore the search executed; this is a capture/monitor-association failure, not evidence of a failed search or an application regression. The underlying reason the monitor association was unavailable is unknown.

The supported Computer Use recovery is fresh app/window selection followed by one screenshot capture retry. Inventory and rebind are complete. Before renewed input, reread this entry and attempt that single read-only capture. If it still fails, stop UI work and report the blocker without restarting or closing the app. Capture-retry outcome: pending.

Capture-retry outcome: the single fresh-bound screenshot succeeded and showed the Case editor, Portal query, and retained transparent artwork. No search or other input was repeated, no app restart occurred, and the underlying transient cause remains unknown. Renewed navigation can use this fresh screenshot and subsequent observations.

### Partial native image-policy progress: Case transparency and source flows

The Case editor accepted a transparent 100 x 100 PNG whose detected content bounds were x=30, y=40, width=40, and height=20. A rejected truncated replacement retained the accepted state. Disabling the cover artwork, saving, and reopening preserved its hidden state; re-enabling it rendered the same 2:1 magenta rectangle. The frozen `case-disabled-verified.sbls` is 3,177,300 bytes with SHA-256 `e8248d41c3fdc954e88c9a4c1aea5db32e80626c981042cffa24aa0a8c350869`. Inspection confirmed the exact transparent PNG and three original BMP backgrounds, with scale 0.25 and offsets 0 / 0 retained.

Native Steam search and import for Portal, App ID 400, succeeded, including automatic title/logo artwork and adoption of an imported Steam background. The web artwork finder returned six candidates, and the Official Open Graph JPEG was adopted. The source-flow package was saved and reopened successfully. It is 3,616,762 bytes with SHA-256 `586e87ba2a234d68ec71255ec32b06e686c7c3717852b9be16cd87314cb59249`. Inspection confirmed the cover JPEG at 1200 x 627 and 298,920 bytes, the Steam title PNG at 640 x 209 and 52,719 bytes bound to all four Case surfaces, and the three original BMP backgrounds.

Portal had no local screenshots available. Existing local assets for App ID 1086940 were located through read-only inspection and subsequently exercised through the native local-screenshot route, as recorded below. This remains a partial native receipt rather than a claim that every source or interaction has been accepted.

### Legacy dirty-prompt classification

Independent diagnosis reproduced the legacy dirty prompt on pre-#358 source `5206a266`, whose relevant tree matches main `937bcc7`. The normalized Open baseline starts clean, but synchronizing the restored aggregate makes revision 1 dirty without any Save operation. Observed differences include defaults, provenance, note values, and a PC-mark position clamp from 24 / 82 to approximately 24.1228687556 / 81.8487769162. This is a pre-existing restore/baseline mismatch owned by lifecycle issue #308, not a demonstrated #358 regression. The replacement guard must not be suppressed to hide it. No source correction was made for this diagnosis.

### Native image-policy matrix: local screenshot completion

The native local-screenshot route found three existing Baldur's Gate 3 screenshots for App ID 1086940. Selecting `20240111015731_1.jpg` visibly adopted the screenshot with embedded Local Steam Screenshot provenance and no local path. Saving and reopening `case-image-policy-test.sbls` retained the Baldur's Gate 3 logo and screenshot. Final independent inspection passed for the frozen local-source package, with the exact selected JPEG, expected bindings, CRCs, and manifest verified.

The planned bounded native matrix is now complete across the five raster families, rejected replacements, disabled-state preservation, Case transparency/content bounds, legacy compatibility and failed conversion, Disc PNG export, Steam import, web candidate adoption, and local-screenshot adoption. This is representative Windows native acceptance, not exhaustive owner/platform/profile coverage. Library-cache adoption was not separately native-tested; its shared importer and source tests do not constitute a separate native acceptance claim. Animated frame selection, physical print calibration, and broader process-memory limits remain outside this run. The legacy restore/baseline mismatch remains separately tracked under #308. Final artifact inspection passed as recorded below. Independent review found no additional mandatory native gate and recommends #358 closure subject to successful CI for the exact published head and merge.
The frozen `case-local-source-verified.sbls` is 5,983,643 bytes with SHA-256 `3e2e48064abc64721c04f022895774430ec314327ff9eeadacd5a840116da576`. Its embedded local JPEG is exactly the selected source: 2,519,263 bytes, 3840 x 2119, SHA-256 `f79dca91a77e8195c1734dcc15486ed39709d67c3b46afcb31196457ef6510c3`. Inspection confirmed Baldur's Gate 3 App ID 1086940 provenance without filesystem paths, unchanged BMP backgrounds on the other three surfaces, and Baldur's Gate 3 PNG artwork in the current and remembered title bindings on all four Case surfaces. CRC and manifest checks passed. These results complete the planned bounded native matrix; the separately stated library-cache, animation, platform, print, and memory limitations remain unchanged.
