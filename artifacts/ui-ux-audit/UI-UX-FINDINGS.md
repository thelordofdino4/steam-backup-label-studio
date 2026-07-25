# Steam Backup Label Studio UI/UX Findings

Audit date: 2026-07-24

This register synthesizes seven independent static audits (novice use, workflow efficiency, visual hierarchy, interaction/accessibility, consistency, state/recovery, and architecture/regression) plus a separate evidence-judge pass. Duplicate symptoms are merged under one canonical ID. Evidence came from source, tests, repository contracts, and issue history. No native Tauri interaction or required 900×650 / 1000×720 / 1920×1009 viewport run was performed. Items that need visual or behavioral confirmation say so explicitly.

Severity values use exactly `BLOCKER`, `MAJOR`, `MODERATE`, `MINOR`, or `OBSERVATION`; confidence values use exactly `high`, `medium`, or `low`. **Implement now** records the audit decision at selection time. A locally prototyped item remains `No` and carries a separate publication status.

Publication state: findings-only documentation; implementation branches and commits are not included.

Baseline note: issue [#305](https://github.com/thelordofdino4/steam-backup-label-studio/issues/305) separately tracks uncropped export-helper precision. A local prototype exists, but it is not included or accepted by this findings-only publication. It is not a UI/UX finding or audit iteration; this register remains 19 findings and seven locally prototyped UI findings/issues #298–#304. Native acceptance has not occurred.

## A11Y-01 — Space-to-pan suppresses control activation

- **Unique ID:** A11Y-01
- **Editor / surface:** Shared `PreviewViewport`; Disc and Case Insert; window-level keyboard handling.
- **Workflow:** Keyboard-activate a focused button, disclosure summary, tab, or guided action with Space while an editor is mounted.
- **Current behavior (audit baseline):** The viewport's window `keydown` handler prevented the Space default for every non-repeating target except a narrow input/textarea/select/`contenteditable="true"` list, then armed primary-button panning. Native buttons, summaries, linked anchors, effective contenteditable variants, and current custom roles were not exempted. An armed pointer start could also begin on an interactive preview target, and window blur could leave Space pan armed.
- **Local prototype behavior (not published or accepted):** The shared viewport now yields Space to native/custom interactive targets and previously prevented events, rejects interactive armed-primary starts, disarms through one Space-key-up/window-blur callback, and clears the armed ref during listener cleanup without scheduling an unmount state update.
- **User problem:** Space can fail to activate an otherwise keyboard-focusable control and may convert a control interaction into viewport panning. The defect crosses both editors because they share the viewport.
- **Evidence:** `src/components/preview/PreviewViewport.tsx` source path and event ownership; shared Disc/Case usage; [WAI-ARIA Button Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/) documents expected Space/Enter activation. [WCAG 2.2 Keyboard Understanding](https://www.w3.org/WAI/WCAG22/Understanding/keyboard-no-exception) reinforces keyboard operability, but Enter remains available here, so this is classified as a platform-convention and accessibility best-practice break, not automatically a WCAG failure.
- **Affected user type:** Keyboard users, switch/assistive-technology users, and power users who pan with Space.
- **Likely frequency:** High whenever Space is used for activation; the handler is continuously mounted in both editors.
- **Severity:** MAJOR
- **Confidence:** high
- **Proposed outcome:** Interactive controls retain their native/custom Space behavior; Space plus primary drag still pans from noninteractive preview context; middle-button pan is unchanged.
- **Possible solution:** Centralize a viewport-local input policy that respects `defaultPrevented` and repeat state, recognizes native interactive descendants, browser-effective contenteditable, and roles `button`, `tab`, and `menuitem`, rejects armed primary-pointer starts from those targets, and shares key-up/blur disarming with unmount-safe cleanup. This was prototyped locally; the prototype is not included or accepted by this publication.
- **Architectural owner:** Preview viewport input arbitration.
- **Likely files:** `src/components/preview/PreviewViewport.tsx`; adjacent focused policy and tests.
- **Tests:** Pure policy tests for button, summary, linked anchor, input/select/textarea, effective contenteditable variants, relevant ARIA roles, prior prevention, repeat, noninteractive stage, interactive pointer rejection, and preserved middle-button behavior; a source-wiring contract covers shared key-up/blur disarming and unmount-safe cleanup. Native Space activation still requires Tauri verification.
- **Native verification required:** Yes — verify button/disclosure/tab/menu action with Space and Space+primary-drag pan in both editors.
- **Related issue:** [#298](https://github.com/thelordofdino4/steam-backup-label-studio/issues/298) (created and selected); adjacent #167 and closed #183.
- **Audit-time decision:** Selected as the first coherent improvement.
- **Implementation status:** Local prototype exists; not published or accepted; native validation pending.
- **Implement now:** No — a local prototype exists outside this publication.

### A11Y-01 external research record

| Source | Principle | Application to this product | Classification | Product-fit rationale |
| --- | --- | --- | --- | --- |
| [WAI-ARIA Authoring Practices: Button Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/) | Native/custom **buttons** support activation with both Space and Enter. | The viewport's global Space handler must yield when a button or button descendant owns the event. | recommended | The app contains native buttons and custom menu/tab actions across both editors; preserving their established activation avoids a shortcut conflict without changing focus order. |
| [WCAG 2.2 Understanding 2.1.3: Keyboard (No Exception)](https://www.w3.org/WAI/WCAG22/Understanding/keyboard-no-exception) | Functionality should remain keyboard operable without requiring specific timings for individual keystrokes. | It provides context for treating global shortcut interception cautiously. Because Enter remained available, this evidence does not by itself prove a conformance failure. | contextual | The bounded correction improves conventional keyboard operation while preserving the existing Space-pan workflow. |

Linked anchors are included in the yield policy to avoid overriding browser or application behavior; this audit does **not** claim that links normally activate with Space (their conventional activation key is Enter).

## LIFE-01 — Project-replacing actions are inconsistently guarded

- **Unique ID:** LIFE-01
- **Editor / surface:** Home, Disc Project File, Case Insert Project File, and cross-editor transitions.
- **Workflow:** Start New Disc, New Case Insert, Load, or switch editor with work in progress.
- **Current behavior (audit baseline):** Disc New asked before reset, while Case New actions and Load could replace state without the same guard. Disc-to-case and Main Menu copy said changes remained in memory even though no Resume path existed and replacement reset shared state.
- **Local prototype behavior (not published or accepted):** `appProjectTransitions` derives one policy from the current `activeWorkspace` and intent only. Initial Home New Disc, New Case Insert, and Load bypass confirmation. While Disc or Case Insert is active, Main Menu shows one truthful close/abandon warning, and same-type New, cross-type New, and a valid Load show one truthful replacement warning naming the active project. Decline runs no reset, cleanup, apply, or workspace callback; accepted Main Menu retains the established drag/preset cleanup before Home, and accepted New retains the established reset owners. Load now opens, reads, validates/routes, and restores a state-free candidate before the gate, then invokes the existing apply owner only after acceptance. A stable single-flight coordinator is acquired synchronously at each outer public lifecycle handler, so another New, Load, or Main Menu attempt is rejected rather than queued and runs no dialog/read/reset/apply/workspace work. It announces `Another project action is still in progress. Wait for it to finish, then try again.` through normal status feedback and also the visible Home status when Home is active; retry works after resolution or rejection. Picker cancellation, invalid contents, restore failure, and declined replacement never apply state; decline announces `Load cancelled. Current project was kept.` Existing #300 Home feedback routing is preserved. No dirty/session marker, Resume promise, disabled control, or progress UI was added.
- **User problem:** Users cannot predict which project actions preserve work and may lose unsaved changes after trusting misleading copy.
- **Evidence:** `src/app/appProjectTransitions.ts` active-workspace/intent prompt policy and synchronous single-flight coordinator; `src/app/App.tsx` exactly-once public New/Load/Main Menu admission plus existing reset/cleanup callbacks; `src/app/appProjectLoad.ts` candidate → gate → apply boundary; `src/app/appProjectTransitions.test.ts` full Home/editor transition matrix, deferred admission/retry/rejection, busy feedback, and App wiring; `src/app/appProjectLoad.test.ts` accepted/declined order, no-gate early exits, no-setter decline, deferred Load race, and #300 outcome contracts; merged agreement from consistency, novice, architecture, workflow, and recovery audits.
- **Affected user type:** All creators, especially novices and users alternating between Disc and Case Insert.
- **Likely frequency:** Medium; concentrated at new/load/switch boundaries.
- **Severity:** MAJOR
- **Confidence:** high
- **Proposed outcome:** Every destructive project replacement follows one truthful, consistent cancellation-safe policy.
- **Possible solution:** Centralize the active-workspace/intent warning matrix in a focused app policy, reuse existing reset/cleanup callbacks for accepted transitions, and make Load two phase so only an accepted restored candidate reaches the existing apply owner. This was prototyped locally in iteration 6, but is not included or accepted by this publication; it deliberately adds no dirty/session/Resume system.
- **Architectural owner:** App project transition policy and two-phase load orchestration.
- **Likely files:** `src/app/appProjectTransitions.ts`, `src/app/appProjectTransitions.test.ts`, `src/app/App.tsx`, `src/app/appProjectLoad.ts`, `src/app/appProjectLoad.test.ts`, `docs/PRD.md`, `docs/SOFTWARE_DESIGN_DOCUMENT.md`, `docs/REPO_ARCHITECTURE_INVENTORY.md`, `docs/MANUAL_SMOKE_CHECKLISTS.md`.
- **Tests:** Home direct paths; Disc/Case close, same-type New, cross-type New, and Load matrix; exact copy/options; accept/decline and exactly-once operation calls; stable coordinator and exactly-once entry by all four public handlers; deferred first action blocks later work; retry after resolution/rejection; Home busy feedback; deferred Load rejects New/Main Menu/second Load without a second picker, reset, apply, or workspace mutation; candidate-before-gate and apply-after-accept for both routes; picker/invalid/restore failure never gate; declined Load invokes no setter; #300 Home outcome/status behavior remains intact.
- **Native verification required:** Yes for native dialog order/copy and visibly retained current project at 900×650, 1000×720, and 1920×1009; no native run was performed.
- **Related issue:** [#303](https://github.com/thelordofdino4/steam-backup-label-studio/issues/303) (created and selected); closed #127/#128 and #126 are adjacent.
- **Audit-time decision:** Selected as the iteration-6 improvement after issue/design review.
- **Implementation status:** Local prototype exists; not published or accepted; native validation pending.
- **Implement now:** No — a local prototype exists outside this publication.

## FEEDBACK-01 — Home load feedback is routed to an invisible editor status

- **Unique ID:** FEEDBACK-01
- **Editor / surface:** Home screen and shared project loading.
- **Workflow:** Cancel or fail Load Project from Home.
- **Current behavior (audit baseline):** `appProjectLoad` announced cancellation/failure through the editor status/toast route, while Home rendered a separate `homeStatusMessage` that the audited flow did not set.
- **Local prototype behavior (not published or accepted):** `runAppProjectLoad` returns a typed `loaded` / `cancelled` / `failed` outcome carrying its existing announcement message and relevant route data. `App` captures whether the request began on Home, mirrors non-success messages to Home only for that origin, explicitly clears stale Home feedback after success, and leaves the existing editor announcement path unchanged. The existing Home message now has `role="status"`.
- **User problem:** A home-screen load can appear to do nothing, leaving cancellation versus failure ambiguous.
- **Evidence:** `src/app/appProjectLoad.ts` outcome and pure Home-status decision; `src/app/App.tsx` origin capture and routing; `src/components/home/HomeScreen.tsx` status semantics; `src/app/appProjectLoad.test.ts` outcome, no-apply, Home-routing, stale-success, integration-wiring, and live-region contracts.
- **Affected user type:** New and returning users loading a saved project from launch.
- **Likely frequency:** Medium.
- **Severity:** MODERATE
- **Confidence:** high
- **Proposed outcome:** Load cancellation and failure are visible on the surface where Load was initiated.
- **Possible solution:** Return status/route data from the existing load owner and derive a small origin-aware Home update in App orchestration, while preserving restore and editor-announcement effects. This was prototyped locally in iteration 3; the prototype is not included or accepted by this publication.
- **Architectural owner:** App load outcome and surface-status routing.
- **Likely files:** `src/app/appProjectLoad.ts`, `src/app/appProjectLoad.test.ts`, `src/app/App.tsx`, `src/components/home/HomeScreen.tsx`.
- **Tests:** Typed outcomes for cancellation, both successful routes, and failures before apply; resolved-route retention; Home-only non-success routing; successful stale-message clearing; App wiring; Home `role="status"` semantics.
- **Native verification required:** Yes for visible copy and screen-reader/live-region timing at 900×650, 1000×720, and 1920×1009; no native run was performed.
- **Related issue:** [#300](https://github.com/thelordofdino4/steam-backup-label-studio/issues/300) (created and selected).
- **Audit-time decision:** Selected as the iteration-3 improvement.
- **Implementation status:** Local prototype exists; not published or accepted; native validation pending.
- **Implement now:** No — a local prototype exists outside this publication.

## EXPORT-01 — Save destination is chosen before export preflight

- **Unique ID:** EXPORT-01
- **Editor / surface:** Disc and Case Insert PNG export.
- **Workflow:** Export a design that preflight will warn about or block.
- **Current behavior (audit baseline):** `appPngExport` opened the save dialog before running preflight; existing tests encoded that ordering.
- **Local prototype behavior (not published or accepted):** Both export routes now build and confirm their existing preflight before opening Save. A rejected preflight returns with the existing preflight-cancel status and never opens Save, renders, or writes. A cancelled Save after approval returns with the existing export-cancel status and never renders or writes. Successful exports retain the case pane/disc filename defaults, DPI, preflight options and content, renderer arguments, guide behavior, write commands, and success/failure messages. Disc preview measurement remains deferred until rendering, after preflight approval and destination selection.
- **User problem:** Users choose a filename/location before learning that export needs review, creating needless dialog churn and a confusing apparent start-stop flow.
- **Evidence:** `src/app/appPngExport.ts` preflight-first orchestration for both routes; `src/app/appPngExport.test.ts` rejection, post-preflight Save cancellation, successful route order, preserved inputs/defaults, and deferred disc preview-measurement contracts.
- **Affected user type:** All users exporting incomplete or warning-bearing designs.
- **Likely frequency:** Medium.
- **Severity:** MODERATE
- **Confidence:** high
- **Proposed outcome:** Design checks precede destination selection; only an approved export asks where to save.
- **Possible solution:** Reorder only the established orchestration to build preflight → confirm → Save destination → render → write, preserving all existing route inputs, output behavior, and messages. This was prototyped locally in iteration 5; the prototype is not included or accepted by this publication.
- **Architectural owner:** PNG export orchestration.
- **Likely files:** `src/app/appPngExport.ts`, `src/app/appPngExport.test.ts`.
- **Tests:** Both routes: rejected preflight never opens Save, renders, or writes; Save cancellation after accepted preflight never renders or writes; successful order is preflight → confirm → Save → render → write; case pane and disc filename defaults and renderer inputs remain stable; disc preview size is measured only when rendering proceeds.
- **Native verification required:** Yes for native dialog order at 900×650, 1000×720, and 1920×1009; no native run was performed.
- **Related issue:** [#302](https://github.com/thelordofdino4/steam-backup-label-studio/issues/302) (created and selected).
- **Audit-time decision:** Selected as the iteration-5 improvement.
- **Implementation status:** Local prototype exists; not published or accepted; native validation pending.
- **Implement now:** No — a local prototype exists outside this publication.

## NAV-01 — Case Front/Back navigation is hidden behind Template

- **Unique ID:** NAV-01
- **Editor / surface:** Case Insert navigation shell.
- **Workflow:** Move between front cover, back cover, and spine work.
- **Current behavior:** Cover exposes only Front so its tab list disappears; tray exposes Back/Spine. Crossing Front to Back requires opening the Template control even though route adapters already model all surfaces.
- **User problem:** The primary spatial workflow is undiscoverable and mislabeled as template configuration.
- **Evidence:** `src/editor/editorNavigationShell.ts`, `src/components/editor/EditorNavigationShell.tsx`, `src/components/caseInsert/CaseInsertEditorShell.tsx`, and navigation tests.
- **Affected user type:** All Case Insert users, especially first-time users.
- **Likely frequency:** High during case authoring.
- **Severity:** MODERATE
- **Confidence:** high
- **Proposed outcome:** Front, Back, and Spine are persistently discoverable navigation destinations where supported.
- **Possible solution:** Add an always-visible case surface navigator backed by existing pane/surface normalization, without duplicating persisted pane state.
- **Architectural owner:** Case navigation shell and template-surface adapter.
- **Likely files:** `src/editor/editorNavigationShell.ts`, `src/components/editor/EditorNavigationShell.tsx`, `src/components/caseInsert/CaseInsertEditorShell.tsx`, `src/app/App.tsx` orchestration only.
- **Tests:** Route/pane normalization, keyboard tab behavior, and stable active surface across Front/Back/Spine.
- **Native verification required:** Yes at the required 900×650, 1000×720, and 1920×1009 viewport sizes.
- **Related issue:** [#306](https://github.com/thelordofdino4/steam-backup-label-studio/issues/306) (created from this finding); #168 and #126 are related, and #271 is completed.
- **Implement now:** No; high-value visual follow-up.

## TEMPLATE-02 — Invalid custom disc dimensions fail silently

- **Unique ID:** TEMPLATE-02
- **Editor / surface:** Disc Template panel, Custom preset.
- **Workflow:** Enter an invalid or mutually inconsistent physical/print dimension.
- **Current behavior:** Normalization preserves the prior controlled value; the field snaps back without a field error or explanation.
- **User problem:** Users cannot tell whether input was rejected, rounded, or lost and cannot learn the valid relationship between dimensions.
- **Evidence:** `src/components/sidebar/TemplatePanel.tsx`, `src/hooks/useDiscTemplate.ts`, and `src/templates/discTemplateStateModel.ts` update path.
- **Affected user type:** Users creating custom label stock/templates.
- **Likely frequency:** Low-to-medium overall, high within custom-template use.
- **Severity:** MODERATE
- **Confidence:** high
- **Proposed outcome:** Invalid input remains understandable and correctable with specific inline guidance.
- **Possible solution:** Return structured validation from the domain model and render per-field errors while committing only valid normalized dimensions.
- **Architectural owner:** Disc template domain validation; panel only presents results.
- **Likely files:** `src/templates/discTemplateStateModel.ts`, `src/hooks/useDiscTemplate.ts`, `src/components/sidebar/TemplatePanel.tsx`.
- **Tests:** Boundary and cross-field errors, error clearing, unchanged persisted valid template, accessible error association.
- **Native verification required:** Yes for focus/error visibility and narrow layouts.
- **Related issue:** [#307](https://github.com/thelordofdino4/steam-backup-label-studio/issues/307) (created from this finding).
- **Implement now:** No.

## SEARCH-01 — Concurrent Steam searches can present stale results

- **Unique ID:** SEARCH-01
- **Editor / surface:** Game / Steam import panel.
- **Workflow:** Submit a second search before the first completes, including Enter submission.
- **Current behavior (audit baseline):** Requests had no latest-submission ownership; an older response could overwrite newer results, announce a stale failure, or clear loading while a newer Enter-submitted search remained pending. Reset and Clear could also be undone by an older completion.
- **Local prototype behavior (not published or accepted):** `useSteamImport` owns one stable monotonically increasing submission coordinator. Every submitted query supersedes older work, and only the newest submission may publish results, announce success/no-results/failure, or clear search loading. A submitted empty query invalidates pending work, clears loading, and retains `Enter a Steam game title or App ID to search.` The existing `resetSteamImportState` and `clearSteamSearchResults` owners now also invalidate pending work and clear loading, so stale completions cannot repopulate cleared state. Requests still finish normally; no `AbortController`, debounce, cache, pagination, Enter disabling, Steam-import concurrency change, or result-UI change was added.
- **User problem:** Users can select the wrong game while believing results belong to their latest query.
- **Evidence:** `src/hooks/useSteamImport.ts` owns the stable coordinator instance and reset/clear integration; `src/hooks/steamSearchSubmission.ts` owns monotonic identity and latest-only publication; `src/hooks/steamSearchSubmission.test.ts` covers deferred out-of-order completion, stale failure, pending loading, invalidation, and current outcomes; `src/components/sidebar/GamePanel.tsx` preserves the existing overlapping Enter path and result presentation.
- **Affected user type:** Users importing Steam metadata on slow or variable connections.
- **Likely frequency:** Low-to-medium, higher during rapid correction/retry.
- **Severity:** MODERATE
- **Confidence:** high
- **Proposed outcome:** Only the newest submitted query may publish results or terminal feedback and clear loading; explicit invalidation prevents stale repopulation.
- **Possible solution:** Give the Steam-search hook a stable monotonic submission coordinator, gate every completion effect on latest identity, and invalidate through existing empty/reset/clear owners. This was prototyped locally in iteration 7; the prototype is not included or accepted by this publication.
- **Architectural owner:** Steam-search submission state adjacent to the existing Steam import hook; Game panel remains presentational.
- **Likely files:** `src/hooks/useSteamImport.ts`, `src/hooks/steamSearchSubmission.ts`, `src/hooks/steamSearchSubmission.test.ts`, `scripts/test-file-list.mjs`.
- **Tests:** A/B out-of-order completion; stale failure ignored after B success; A completion while B remains pending leaves loading true; reset/clear/empty invalidation; current success/no-results/error; stable hook ownership and unchanged Steam-import integration.
- **Native verification required:** Race correctness is source-testable; native pending-state clarity remains pending at 900×650, 1000×720, and 1920×1009. No native run was performed.
- **Related issue:** [#304](https://github.com/thelordofdino4/steam-backup-label-studio/issues/304) (created and selected).
- **Audit-time decision:** Selected as the iteration-7 improvement after issue/design review.
- **Implementation status:** Local prototype exists; not published or accepted; native validation pending.
- **Implement now:** No — a local prototype exists outside this publication.

## A11Y-03 — Contextual ribbon categories expose active state only visually

- **Unique ID:** A11Y-03
- **Editor / surface:** Shared contextual text ribbon.
- **Workflow:** Determine or switch the active ribbon category with assistive technology.
- **Current behavior (audit baseline):** Category buttons received an `is-active` CSS class without an equivalent selected/pressed/tab semantic.
- **Local prototype behavior (not published or accepted):** Each existing native category button now binds `aria-pressed` directly to `activeTab === tab.id`; their container is a named `group`. Labels, order, focus behavior, click behavior, and layout are unchanged.
- **User problem:** Screen-reader users cannot reliably determine the current category.
- **Evidence:** `src/components/preview/inlinePreviewTextEditorRibbon.tsx` mapped category-button template and `src/components/preview/contextualTextRibbonTabs.test.ts` source contract.
- **Affected user type:** Screen-reader and keyboard users editing text.
- **Likely frequency:** Medium during text formatting.
- **Severity:** MODERATE
- **Confidence:** high
- **Proposed outcome:** Assistive technology can identify the active category while existing native-button interaction remains unchanged.
- **Possible solution:** Bind `aria-pressed` on the existing mapped native buttons to the authoritative `activeTab` equality and name their exclusive category group. This was prototyped locally in iteration 2, but is not included or accepted by this publication; no tablist or keyboard model was added.
- **Architectural owner:** Inline preview text editor ribbon category semantics.
- **Likely files:** `src/components/preview/inlinePreviewTextEditorRibbon.tsx`, `src/components/preview/contextualTextRibbonTabs.test.ts`.
- **Tests:** Focused source contract proving the single mapped button template binds every category's pressed state to `activeTab` and retains native-button rather than tablist semantics.
- **Native verification required:** Yes at 900×650, 1000×720, and 1920×1009 with platform accessibility inspection; no native run was performed.
- **Related issue:** [#299](https://github.com/thelordofdino4/steam-backup-label-studio/issues/299) (created and selected); closed #184 and #183 are adjacent.
- **Audit-time decision:** Selected as the iteration-2 improvement.
- **Implementation status:** Local prototype exists; not published or accepted; native validation pending.
- **Implement now:** No — a local prototype exists outside this publication.

## COPY-01 — Home capability copy contradicts the active product

- **Unique ID:** COPY-01
- **Editor / surface:** Home screen and Case Insert entry/status copy.
- **Workflow:** Choose Load, New Disc, or New Case Insert from launch.
- **Current behavior:** Home says loading supports Disc projects and Case Insert is a future foundation, while project loading routes Case files and the Case editor is active (though not alpha-complete).
- **User problem:** Users receive conflicting expectations about what can be loaded and whether Case Insert work is usable.
- **Evidence:** `src/components/home/HomeScreen.tsx`, `src/caseInsert/sidebarWorkflow.ts`, README/product contracts, and active load routing.
- **Affected user type:** First-time and returning users.
- **Likely frequency:** Every launch, though impact is mostly expectation-setting.
- **Severity:** MINOR
- **Confidence:** high
- **Proposed outcome:** One truthful capability vocabulary distinguishes active, alpha, and incomplete features.
- **Possible solution:** Centralize surface capability labels/status text and consume them on Home and editor entry points.
- **Architectural owner:** Product capability copy/view model.
- **Likely files:** `src/components/home/HomeScreen.tsx`, `src/caseInsert/sidebarWorkflow.ts`, related copy tests/docs.
- **Tests:** Exact status labels from one source and route-capability parity.
- **Native verification required:** No, unless copy wrapping changes layout.
- **Related issue:** #17, #126, and #149 are adjacent.
- **Implement now:** No.

## SESSION-01 — No durable project-session model

- **Unique ID:** SESSION-01
- **Editor / surface:** App-wide project lifecycle.
- **Workflow:** Save repeatedly, return to Main Menu, resume, or understand whether changes are dirty.
- **Current behavior:** Save always behaves as Save As; no current path/dirty flag/resume affordance exists; a transient status string also carries file-status messaging.
- **User problem:** Users cannot tell whether work is saved, cannot use conventional Save semantics, and cannot resume the in-memory project promised by transition copy.
- **Evidence:** `src/app/App.tsx`, `src/components/sidebar/ProjectPanel.tsx`, status hooks, and file command wiring.
- **Affected user type:** All repeat users and longer editing sessions.
- **Likely frequency:** High across meaningful sessions.
- **Severity:** MAJOR
- **Confidence:** high
- **Proposed outcome:** Explicit current project identity, dirty state, Save/Save As semantics, and a truthful resume/replacement lifecycle.
- **Possible solution:** Design a focused project-session domain model before changing UI; route transitions and persistence through it.
- **Architectural owner:** New app project-session domain plus thin orchestration.
- **Likely files:** Future focused session module, `src/app/App.tsx`, project panels, save/load helpers.
- **Tests:** Session state machine, path ownership, dirty transitions, save failure, resume, replacement cancellation, serialization parity.
- **Native verification required:** Yes; broad end-to-end lifecycle smoke.
- **Related issue:** [#308](https://github.com/thelordofdino4/steam-backup-label-studio/issues/308) (created from this finding); closed #127/#128 and open #126 are adjacent.
- **Implement now:** No; defer pending explicit product/architecture design.

## A11Y-02 — Image candidate modal lacks focus lifecycle

- **Unique ID:** A11Y-02
- **Editor / surface:** Shared artwork/logo image candidate picker.
- **Workflow:** Open, navigate, choose, or dismiss the modal with keyboard/assistive technology.
- **Current behavior:** The dialog declares `aria-modal` but source does not establish initial focus, contain focus, or restore focus to its trigger.
- **User problem:** Keyboard focus can remain behind the modal or become lost after close.
- **Evidence:** `src/components/sidebar/ImageCandidatePicker.tsx` dialog lifecycle.
- **Affected user type:** Keyboard, screen-reader, and switch users choosing Steam/web/local artwork.
- **Likely frequency:** Low-to-medium overall; repeated in artwork-heavy workflows.
- **Severity:** MODERATE
- **Confidence:** high
- **Proposed outcome:** Opening moves focus into the modal, Tab stays within it, Escape/close works, and focus returns to the opener.
- **Possible solution:** Add a reusable but picker-scoped focus lifecycle keyed to open/close and the trigger ref.
- **Architectural owner:** Image candidate picker modal lifecycle.
- **Likely files:** `src/components/sidebar/ImageCandidatePicker.tsx` and focused tests.
- **Tests:** Initial focus, forward/reverse wrap, Escape, close restoration, no stale trigger crash.
- **Native verification required:** Yes with real focus traversal.
- **Related issue:** [#309](https://github.com/thelordofdino4/steam-backup-label-studio/issues/309) (created from this finding); closed #183 is adjacent.
- **Implement now:** No.

## IMPORT-01 — Imported Case back text remains invisible

- **Unique ID:** IMPORT-01
- **Editor / surface:** Case Insert back-cover Steam import and text controls.
- **Workflow:** Import a Steam game into a fresh/default Case Insert project.
- **Current behavior:** Import populates back-cover copy while its visibility remains disabled, then announces success without explaining that the imported text is hidden.
- **User problem:** Users believe import failed or must hunt for an unrelated enable control.
- **Evidence:** `src/caseInsert/steamBackCoverImport.ts`, its tests, and Case text visibility defaults/wiring.
- **Affected user type:** Case Insert users relying on Steam metadata.
- **Likely frequency:** Medium in the Case workflow.
- **Severity:** MODERATE
- **Confidence:** high
- **Proposed outcome:** Import feedback accurately states what became visible, or imported content is deliberately enabled according to a documented rule.
- **Possible solution:** Prefer explicit “Imported; turn on Back Cover Text to show it” feedback unless product decides import should enable the feature while preserving prior user intent.
- **Architectural owner:** Case Steam import transition and feedback contract.
- **Likely files:** `src/caseInsert/steamBackCoverImport.ts`, import tests, Case text controls/status wiring.
- **Tests:** Fresh default, previously disabled user choice, already enabled state, repeated import.
- **Native verification required:** Yes for discoverability of the follow-up control.
- **Related issue:** [#310](https://github.com/thelordofdino4/steam-backup-label-studio/issues/310) (created from this finding); #149 and #181 are adjacent.
- **Implement now:** No pending behavior decision.

## TEMPLATE-01 — Disc template switching irreversibly clamps layout

- **Unique ID:** TEMPLATE-01
- **Editor / surface:** Disc Template and all positioned visual/text owners.
- **Workflow:** Switch from one template/geometry to another, then switch back.
- **Current behavior:** Template changes immediately clamp many placements to new bounds; returning to the prior template does not restore the former layout and there is no warning/undo.
- **User problem:** Exploratory template comparison can silently damage a carefully positioned design.
- **Evidence:** `src/hooks/useDiscTemplate.ts`, `src/templates/discTemplateStateModel.ts`, and downstream owner clamp transitions.
- **Affected user type:** Disc users comparing label stock or custom geometries.
- **Likely frequency:** Medium during setup; impact is high when it occurs late.
- **Severity:** MODERATE
- **Confidence:** high
- **Proposed outcome:** Users understand and can recover from template-induced layout changes.
- **Possible solution:** Evaluate a pre-change warning plus one-step restore, or template-keyed layout snapshots, before altering domain state.
- **Architectural owner:** Disc template transition domain and individual placement owners.
- **Likely files:** `src/hooks/useDiscTemplate.ts`, `src/templates/discTemplateStateModel.ts`, placement owner modules.
- **Tests:** Multi-owner clamping, cancellation, restore/snapshot round trip, save/load/export parity.
- **Native verification required:** Yes across representative layouts.
- **Related issue:** [#311](https://github.com/thelordofdino4/steam-backup-label-studio/issues/311) (created from this finding); #168 and #281 are adjacent.
- **Implement now:** No; high regression scope.

## STORAGE-01 — Project writes are not atomic

- **Unique ID:** STORAGE-01
- **Editor / surface:** Native project-file persistence.
- **Workflow:** Save a project during interruption, disk-full, or process failure.
- **Current behavior:** The Rust command writes directly to the destination with `std::fs::write`, allowing an interrupted overwrite to leave a truncated/corrupt file.
- **User problem:** A rare save failure can destroy the last usable copy of a project.
- **Evidence:** `src-tauri/src/commands/files.rs` direct-write implementation.
- **Affected user type:** Any user saving valuable projects; highest consequence for long sessions.
- **Likely frequency:** Low, but high impact.
- **Severity:** MAJOR
- **Confidence:** high
- **Proposed outcome:** A failed save leaves the previous file intact and reports failure.
- **Possible solution:** Write and sync a sibling temporary file, then atomically replace/rename with platform-aware cleanup and error handling.
- **Architectural owner:** Tauri file command/persistence boundary.
- **Likely files:** `src-tauri/src/commands/files.rs` and Rust tests.
- **Tests:** Successful replacement, write/sync/rename failure, cleanup, existing-file preservation, Windows replacement semantics.
- **Native verification required:** Yes for platform filesystem semantics; separate from a UI-only iteration.
- **Related issue:** [#312](https://github.com/thelordofdino4/steam-backup-label-studio/issues/312) (created from this finding).
- **Implement now:** No; separate reliability/security-sensitive change.

## SIDEBAR-01 — Case sidebar exposes ownerless placeholder roles

- **Unique ID:** SIDEBAR-01
- **Editor / surface:** Case Insert Back and Spine role navigation.
- **Workflow:** Open Additional Artwork on Back or duplicate Steam Branding on Spine.
- **Current behavior (audit baseline):** Navigation included roles with no implemented owner and fell back to literal “Controls move here in #272/#274.” copy; Spine also duplicated a Steam Branding concept already owned by its setup panel.
- **Local prototype behavior (not published or accepted):** Back no longer inventories unsupported Additional Artwork, and Spine no longer inventories Steam Branding as a role. The dedicated Spine Steam Branding setup panel remains wired before the role list; Front and Spine Additional Artwork remain inventoried and wired to their real controls. The now-unused `steam-backup-branding` role-section type member is removed after a repository-wide owner search found no runtime consumer. The generic ticket fallback is unchanged, while an explicit invariant proves no current Case role inventory can reach it.
- **User problem:** Production UI sends users into dead ends and exposes internal issue-tracking language.
- **Evidence:** `src/editor/editorNavigationShell.ts` corrected Back/Spine inventories and role ID union; `src/editor/editorNavigationShell.test.ts` domain inventory contracts; `src/components/editor/editorNavigationShellViewModel.test.ts` Back view-model contract; `src/components/caseInsert/CaseInsertEditorShell.test.ts` setup-panel, Additional Artwork ownership, and all-inventory owner invariant; `src/components/caseInsert/CaseInsertEditorShell.tsx` unchanged control routes.
- **Affected user type:** Case Insert users exploring available roles.
- **Likely frequency:** High because role items are persistently visible.
- **Severity:** MODERATE
- **Confidence:** high
- **Proposed outcome:** Every visible navigation role opens real controls; unavailable roles are omitted until owned.
- **Possible solution:** Remove only the two invalid inventory entries, remove the newly unused role ID type member, and enforce that every visible Case role maps to an existing owner while leaving the generic fallback and real setup/role panels intact. This was prototyped locally in iteration 4; the prototype is not included or accepted by this publication.
- **Architectural owner:** Editor navigation inventory and Case shell role ownership contract.
- **Likely files:** `src/editor/editorNavigationShell.ts`, `src/editor/editorNavigationShell.test.ts`, `src/components/editor/editorNavigationShellViewModel.test.ts`, `src/components/caseInsert/CaseInsertEditorShell.test.ts`.
- **Tests:** Back omits Additional Artwork; Spine omits the Steam Branding role; dedicated Spine Steam Branding remains wired; Front and Spine Additional Artwork remain wired; every current Case role inventory entry has a real owner and cannot reach the unchanged ticket fallback.
- **Native verification required:** Yes for sidebar continuity at 900×650, 1000×720, and 1920×1009; no native run was performed.
- **Related issue:** [#301](https://github.com/thelordofdino4/steam-backup-label-studio/issues/301) (created and selected); #126/#149 and closed #274 are adjacent.
- **Audit-time decision:** Selected as the iteration-4 improvement.
- **Implementation status:** Local prototype exists; not published or accepted; native validation pending.
- **Implement now:** No — a local prototype exists outside this publication.

## GUIDANCE-01 — Layout preset guidance and active state are hidden

- **Unique ID:** GUIDANCE-01
- **Editor / surface:** Disc Layout Presets panel and guided layout state.
- **Workflow:** Choose a preset and understand what it changes or which preset is active.
- **Current behavior:** Preset definitions contain descriptions and active guided-layout identity, but the panel omits that guidance and can clear the visible selection after application.
- **User problem:** Users cannot predict a preset's effect or confirm what currently structures the disc.
- **Evidence:** `src/components/sidebar/DiscLayoutPresetsPanel.tsx`, `src/guidedPresets/discGuidedLayouts.ts`, `src/guidedPresets/discGuidedWorkflow.ts`, and related tests.
- **Affected user type:** Novices and users starting from presets.
- **Likely frequency:** Medium.
- **Severity:** MODERATE
- **Confidence:** high
- **Proposed outcome:** Preset choices explain their scope and the active guided layout remains legible until materially diverged.
- **Possible solution:** Expose definition descriptions and derive active/modified presentation from the existing guided workflow model.
- **Architectural owner:** Preset/guided view model; panel remains presentational.
- **Likely files:** `src/components/sidebar/DiscLayoutPresetsPanel.tsx`, guided preset model modules/tests.
- **Tests:** Description rendering, active/modified state, manual divergence, reapply/reset behavior.
- **Native verification required:** Yes for density and wrapping.
- **Related issue:** #168 and #281.
- **Implement now:** No.

## PICKER-01 — Candidate picker closes after swallowed selection failures

- **Unique ID:** PICKER-01
- **Editor / surface:** Shared Steam/web/local artwork and logo candidate picker.
- **Workflow:** Choose a candidate whose import/apply step fails but resolves its promise.
- **Current behavior:** The picker closes after any fulfilled `onSelect`; several handlers catch/report failures without rejecting, so fulfillment does not prove selection succeeded.
- **User problem:** The picker disappears on failure, losing context and making retry harder.
- **Evidence:** `src/components/sidebar/ImageCandidatePicker.tsx` and selection callers in artwork/editor candidate controls.
- **Affected user type:** Users importing remote/local candidate artwork under transient failures.
- **Likely frequency:** Low.
- **Severity:** MINOR
- **Confidence:** high
- **Proposed outcome:** The picker closes only after a confirmed successful apply; failure stays actionable in context.
- **Possible solution:** Replace ambiguous promise fulfillment with an explicit success result or require callers to reject on failure, then centralize close/error behavior.
- **Architectural owner:** Shared candidate picker selection contract and caller adapters.
- **Likely files:** `src/components/sidebar/ImageCandidatePicker.tsx`, artwork/editor candidate controls, relevant hooks.
- **Tests:** Success closes, false/failure stays open, retry succeeds, stale async completion ignored.
- **Native verification required:** Helpful for focus/error experience.
- **Related issue:** #169 is adjacent.
- **Implement now:** No.

## RECOVERY-01 — Repeated visual deletion has no undo path

- **Unique ID:** RECOVERY-01
- **Editor / surface:** Shared repeated artwork/logo/text-list cards and feature transitions.
- **Workflow:** Remove an item accidentally.
- **Current behavior:** Delete actions apply immediately; no shared undo/history model exists.
- **User problem:** An accidental destructive edit can require manual reconstruction.
- **Evidence:** Static review of repeated-item cards and their domain transition calls; no verified single dominant accidental-delete path.
- **Affected user type:** Users managing dense multi-item designs.
- **Likely frequency:** Uncertain/medium.
- **Severity:** MAJOR
- **Confidence:** medium
- **Proposed outcome:** Material destructive edits are recoverable.
- **Possible solution:** First instrument/validate the highest-cost delete paths; avoid bolting isolated component undo onto domain state. A future coherent command/history model may be appropriate.
- **Architectural owner:** Future shared edit-history domain plus feature transition adapters.
- **Likely files:** Multiple feature state modules and shared cards; scope not yet bounded.
- **Tests:** Command inversion/history boundaries, save/load parity, drag coalescing, multi-owner restore.
- **Native verification required:** Yes before selection and after any design.
- **Related issue:** None exact.
- **Implement now:** No; rejected as disproportionately broad for current evidence.

## LAYOUT-01 — Sidebar density may exceed smaller native heights

- **Unique ID:** LAYOUT-01
- **Editor / surface:** Disc and Case sidebars across requested viewport heights.
- **Workflow:** Scan collapsed panels and reach lower roles at 720/650-ish heights.
- **Current behavior:** Static panel counts and approximate row sizing suggest the collapsed inventory can exceed viewport height, requiring substantial scrolling.
- **User problem:** Important lower sections may be hard to discover and navigation may feel heavy.
- **Evidence:** Static source/CSS count only; no native screenshot or measured scroll-distance evidence at the required 900×650, 1000×720, or 1920×1009 sizes.
- **Affected user type:** Laptop/smaller-window users.
- **Likely frequency:** Uncertain/medium.
- **Severity:** OBSERVATION
- **Confidence:** low
- **Proposed outcome:** Primary sections remain discoverable without breaking the established hierarchy.
- **Possible solution:** Measure first in native Tauri; then consider density, sticky navigation, or grouping based on observed bottlenecks rather than speculative CSS changes.
- **Architectural owner:** Editor navigation shell and sidebar CSS ownership.
- **Likely files:** `src/styles/app-panels.css`, editor navigation shell/view model, surface panels.
- **Tests:** Native viewport matrix, keyboard scroll/reveal, no hidden controls, existing role-focus alignment.
- **Native verification required:** Yes; prerequisite to implementation.
- **Related issue:** #46 and #168 are adjacent.
- **Implement now:** No; rejected pending native evidence.

## Merged, already tracked, and rejected observations

- Ribbon category sizing is already tracked by #265; it was not duplicated here.
- Directly clicking guided placeholders is already tracked by #281.
- Keyboard selection/navigation for preview elements is already tracked by #172, #174, #175, and #176.
- Case Insert overlap concerns are already tracked by #149.
- `docs/MANUAL_SMOKE_CHECKLISTS.md` still describes a removed floating text editor. This is documentation debt, not a separate user-facing runtime finding; update it in a dedicated docs pass against `docs/TEXT_EDITOR_CONTRACT.md`.
- Sidebar-order authority conflicts across `AGENTS.md`/`docs/PRD.md` and current source/README/#271. That is a governance/product decision; the audit does not reorder the UI from inference.
- Static-only claims about preview clipping, general contrast, general target size, and exact small-viewport layout were rejected without native evidence.
- Guided terminology, Cover/Tray naming, intentional disabled Background guidance, and existing Reset/Clear distinctions were not accepted as defects on the evidence reviewed.
