# Prioritized UI/UX Improvements

Audit date: 2026-07-24

## Evidence-judge method

A separate evidence judge reviewed the seven independent audit reports, merged duplicate symptoms, compared claims against source/contracts/issues, and scored each canonical finding from 1–5 on nine dimensions. Higher is better in every column; for implementation and regression risk, 5 means lower risk / safer scope.

- **U — User impact:** Consequence when the problem occurs.
- **F — Frequency:** How often users are likely to encounter it.
- **E — Evidence strength:** Directness and agreement of source/runtime/issue evidence.
- **C — Root-cause clarity:** How precisely one owner and causal path are identified.
- **I — Implementation safety:** 5 is a small, bounded change; 1 is broad/high-risk.
- **R — Regression safety:** 5 is unlikely to disturb working contracts; 1 crosses many parity surfaces.
- **A — Architecture fit:** How cleanly the correction fits an existing owner.
- **T — Testability:** Strength of focused automated and native verification options.
- **Δ — Symptom reduction:** How many meaningful symptoms the root correction removes without becoming over-broad.

| Priority | Finding | Severity | U | F | E | C | I | R | A | T | Δ | Total | Decision |
| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | A11Y-01 | MAJOR | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 5 | **44** | **Local prototype exists; not published/accepted; native pending** |
| 2 | LIFE-01 | MAJOR | 5 | 3 | 5 | 5 | 4 | 4 | 5 | 5 | 5 | **41** | **Local prototype exists; not published/accepted; native pending** |
| 3 | A11Y-03 | MODERATE | 3 | 3 | 5 | 5 | 5 | 5 | 5 | 5 | 3 | 39 | **Local prototype exists; not published/accepted; native pending** |
| 4 | FEEDBACK-01 | MODERATE | 3 | 3 | 5 | 5 | 4 | 4 | 5 | 5 | 4 | 38 | **Local prototype exists; not published/accepted; native pending** |
| 5 | SIDEBAR-01 | MODERATE | 2 | 4 | 5 | 5 | 5 | 4 | 5 | 5 | 3 | 38 | **Local prototype exists; not published/accepted; native pending** |
| 6 | EXPORT-01 | MODERATE | 3 | 3 | 5 | 5 | 4 | 4 | 5 | 5 | 3 | 37 | **Local prototype exists; not published/accepted; native pending** |
| 7 | NAV-01 | MODERATE | 4 | 4 | 5 | 5 | 3 | 3 | 4 | 4 | 4 | 36 | Issue #306; native-backed follow-up |
| 8 | TEMPLATE-02 | MODERATE | 3 | 2 | 5 | 5 | 4 | 4 | 5 | 5 | 3 | 36 | Issue #307; interaction decision |
| 9 | SEARCH-01 | MODERATE | 3 | 2 | 5 | 5 | 4 | 4 | 5 | 5 | 3 | 36 | **Local prototype exists; not published/accepted; native pending** |
| 10 | COPY-01 | MINOR | 2 | 2 | 5 | 5 | 5 | 5 | 4 | 5 | 2 | 35 | Small follow-up |
| 11 | SESSION-01 | MAJOR | 4 | 4 | 5 | 4 | 1 | 2 | 4 | 3 | 5 | 32 | Issue #308; design track |
| 12 | A11Y-02 | MODERATE | 4 | 2 | 4 | 4 | 3 | 3 | 4 | 3 | 4 | 31 | Issue #309; native-backed follow-up |
| 13 | IMPORT-01 | MODERATE | 3 | 3 | 4 | 4 | 3 | 3 | 4 | 4 | 3 | 31 | Issue #310; behavior decision |
| 14 | STORAGE-01 | MAJOR | 5 | 1 | 5 | 5 | 2 | 2 | 4 | 3 | 4 | 31 | Issue #312; reliability track |
| 15 | GUIDANCE-01 | MODERATE | 2 | 3 | 4 | 3 | 4 | 4 | 4 | 4 | 3 | 31 | Coordinate with #281 |
| 16 | TEMPLATE-01 | MODERATE | 4 | 3 | 4 | 4 | 2 | 2 | 3 | 4 | 4 | 30 | Issue #311; recovery design |
| 17 | PICKER-01 | MINOR | 2 | 1 | 4 | 4 | 4 | 4 | 4 | 4 | 2 | 29 | Later bounded fix |
| 18 | RECOVERY-01 | MAJOR | 4 | 3 | 3 | 3 | 1 | 2 | 2 | 2 | 4 | 24 | Reject as over-broad now |
| 19 | LAYOUT-01 | OBSERVATION | 3 | 3 | 2 | 2 | 2 | 2 | 3 | 2 | 3 | 22 | Reject pending native evidence |

The evidence judge originally scored LAYOUT-01 as a moderate candidate. Post-judge vocabulary normalization reclassifies it as `OBSERVATION` with `low` confidence because no native measurements support a user-facing defect; its numeric score is preserved for traceability. Normalized register counts are: `BLOCKER` 0, `MAJOR` 5, `MODERATE` 11, `MINOR` 2, `OBSERVATION` 1.

## Why A11Y-01 won

A11Y-01 had the highest score (44/45) because the failure is visible directly in one shared source owner, applies whenever either editor is mounted, interferes with a platform-standard activation key, and has a narrow correction that does not touch renderers, layout, persistence, export, or pan math. It also collapses two related symptoms—the keydown default suppression and interactive pointer-start capture—under one input-ownership policy.

The WAI-ARIA button guidance documents expected Space and Enter activation for buttons: [Button Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/). The WCAG keyboard understanding document supports keyboard operability: [Keyboard (No Exception)](https://www.w3.org/WAI/WCAG22/Understanding/keyboard-no-exception). Because Enter remains available in the observed implementation, the judge did **not** label this an automatic WCAG failure; it is an evidence-backed platform-convention and accessibility best-practice defect. Linked anchors are included in the yield policy only to avoid overriding browser/application behavior; links conventionally activate with Enter, not Space.

GitHub issue [#298](https://github.com/thelordofdino4/steam-backup-label-studio/issues/298) was created for the selected finding. It is adjacent to #167 and the completed accessibility work in #183 without duplicating those scopes.

## Why A11Y-03 was selected for iteration 2

A11Y-03 was the next unimplemented finding by numeric score (39). Its root cause was confined to the mapped native category-button template in `inlinePreviewTextEditorRibbon.tsx`: visual active state already came from authoritative `activeTab`, but assistive technology received no corresponding state. The local iteration-2 prototype binds `aria-pressed={activeTab === tab.id}` on that same template and names the exclusive category group. It deliberately retains native buttons and their existing focus/click behavior; it does not introduce tablist semantics, arrow-key navigation, roving focus, CSS changes, sizing work from #265, or text/render/export/persistence changes.

GitHub issue [#299](https://github.com/thelordofdino4/steam-backup-label-studio/issues/299) records the selected iteration-2 scope. A local prototype exists outside this publication; no implementation acceptance is claimed; native accessibility verification remains pending.

## Why FEEDBACK-01 was selected for iteration 3

FEEDBACK-01 tied SIDEBAR-01 as the next unimplemented numeric-score candidate (38), with the more direct launch-path impact and one existing orchestration owner. The failure was a data-flow gap: `runAppProjectLoad` already produced the correct cancellation/failure messages for editor status, but returned no result that `App` could route to Home. The local iteration-3 prototype returns a typed discriminated outcome with the unchanged message and relevant resolved route, then uses one pure origin-aware decision to update Home. Successful restore/apply behavior, editor announcements, dialogs, parsing, schemas, persistence, preview, and export are unchanged. The existing Home message receives `role="status"` so routed feedback has status semantics without introducing a second component-owned status policy.

GitHub issue [#300](https://github.com/thelordofdino4/steam-backup-label-studio/issues/300) records the selected iteration-3 scope. A local prototype exists outside this publication; no implementation acceptance is claimed; native visible-copy and screen-reader/live-region verification remains pending at the required viewport sizes.

## Why SIDEBAR-01 was selected for iteration 4

SIDEBAR-01 was the next unimplemented finding by priority order and tied FEEDBACK-01's numeric score (38). Its two dead ends came from the authoritative navigation inventory rather than missing renderer work: Back listed Additional Artwork even though its tray artwork slots are already owned by Screenshots, and Spine listed Steam Branding even though a dedicated setup panel already rendered the real controls. The local iteration-4 prototype removes only those inventory entries and the now-unused `steam-backup-branding` role ID member. It preserves every real panel, their order, the generic future-ticket fallback, Front/Spine Additional Artwork, and the dedicated Spine Steam Branding setup panel. An all-surface Case inventory invariant now prevents current visible roles from reaching the fallback.

GitHub issue [#301](https://github.com/thelordofdino4/steam-backup-label-studio/issues/301) records the selected iteration-4 scope. A local prototype exists outside this publication; no implementation acceptance is claimed; native sidebar continuity verification remains pending at the required viewport sizes.

## Why EXPORT-01 was selected for iteration 5

EXPORT-01 tied LIFE-01's then-current pre-design score as the next unimplemented numeric-score candidate (37) and fit one bounded change in the existing PNG-export orchestration owner. The local iteration-5 prototype reorders only observable dependency calls for both routes to build preflight → confirm → Save destination → render → write. Rejected preflight and post-approval Save cancellation retain their distinct existing status messages and stop before later work. Case pane/disc filename defaults, DPI, preflight content/options, renderer arguments, guides, write commands, and success/failure messages remain unchanged; disc preview measurement remains deferred until the render path after Save. No renderer, dialog implementation/content/lifecycle, atomic-write, or batch-export behavior changes.

GitHub issue [#302](https://github.com/thelordofdino4/steam-backup-label-studio/issues/302) records the selected iteration-5 scope. A local prototype exists outside this publication; no implementation acceptance is claimed; native dialog-order verification remains pending at the required viewport sizes. At the end of iteration 5, LIFE-01 remained the next `MAJOR` safety candidate and required its own issue/design review.

## Why LIFE-01 was selected for iteration 6

Issue/design review narrowed LIFE-01 from a broad lifecycle concern to one focused policy owner plus a two-phase Load boundary. That raises implementation safety, regression safety, architecture fit, and testability from 3/3/4/4 to 4/4/5/5, producing the revised score **41** (`U5 F3 E5 C5 I4 R4 A5 T5 Δ5`). The user impact and evidence stay unchanged: every active-editor New, Load, and Main Menu boundary can abandon or replace substantial work, and five independent audits agreed on the inconsistency. The new score moves LIFE-01 to priority 2 while preserving its original 37 score in the iteration-5 selection history.

GitHub issue [#303](https://github.com/thelordofdino4/steam-backup-label-studio/issues/303) records the selected iteration-6 scope and exact conservative copy. A local prototype exists outside this publication; no implementation acceptance is claimed; native dialog-order, copy, and retained-current-project verification remain pending at the required viewport sizes.

### Independent solution comparison for LIFE-01

#### A — Add direct guards to existing handlers

Add or correct confirmations in each current App New/Main Menu handler and inside the Load branches.

- **Usability benefit:** Moderate; the immediate missing warnings can be filled, but behavior can still drift between entry points.
- **Architecture correctness:** Low-to-medium; App and Load each retain lifecycle policy beside orchestration.
- **Implementation size:** Small; it is the shortest immediate source diff.
- **Regression risk:** Medium; scattered ordering and cancellation branches can create nested prompts or asymmetric mutation.
- **Responsiveness:** Neutral; it changes no layout, though multiple accidental dialogs would feel slow.
- **Accessibility:** Medium; native warnings are exposed, but consistent status feedback is not owned centrally.
- **Testability:** Medium; several branches and source-wiring assertions must be tested independently.
- **App consistency:** Medium; copy can be aligned initially but has no single owner.
- **Future maintenance burden:** High; every lifecycle entry point must remain synchronized by hand.

#### B — Add dirty state, Resume, and visible sessions

Track dirty/path/save state, retain resumable Disc and Case sessions, and expose them on Home so prompts can depend on proven unsaved work.

- **Usability benefit:** Very high long term; users gain evidence-backed dirty state, recovery, and continuity.
- **Architecture correctness:** Potentially high only after a separate session-state and persistence design.
- **Implementation size:** Very large; it spans persistence, window lifecycle, Home, and project identity.
- **Regression risk:** High; schema, save/load, recovery, and cross-editor behavior all change.
- **Responsiveness:** Medium risk; session discovery and a larger Home surface add loading and layout concerns.
- **Accessibility:** High scope; new session summaries, recovery controls, focus paths, and announcements need design and native review.
- **Testability:** Low within this iteration; lifecycle persistence and native recovery coverage exceed LIFE-01.
- **App consistency:** Potentially very high, but only after the broader SESSION-01 model is complete.
- **Future maintenance burden:** High; persistent sessions become a permanent cross-cutting subsystem.

#### C — Central policy plus two-phase Load

Add `appProjectTransitions.ts` as the active-workspace/intent prompt matrix and stable single-flight lifecycle coordinator. Home bypasses confirmation; active Disc/Case replacement or abandonment prompts exactly once. App supplies existing reset/cleanup operations. Load prepares a valid restored candidate, runs the injected policy gate, and calls the existing apply owner only after acceptance. Concurrent lifecycle attempts are rejected, not queued, before they can open a dialog or mutate state.

- **Usability benefit:** High; one truthful policy and explicit busy feedback cover close, same-type New, cross-type New, and Load without inventing session state.
- **Architecture correctness:** High; the focused owner holds prompt/admission policy while App and existing reset/restore/apply owners retain orchestration and mutation.
- **Implementation size:** Medium and bounded; one helper, thin public-handler wrappers, and a two-phase Load boundary are sufficient.
- **Regression risk:** Low-to-medium; established reset, cleanup, schema, renderer, preview, export, and Save behavior remain intact.
- **Responsiveness:** High; no new layout or progress UI is added, and busy actions fail immediately instead of queuing duplicate native/file work.
- **Accessibility:** High; warning semantics stay native, busy feedback uses normal status announcement, and Home mirrors it in its visible live region.
- **Testability:** High; pure matrix, deferred admission, retry, candidate → gate → apply, and no-mutation contracts are deterministic.
- **App consistency:** High; all four public lifecycle handlers enter the same coordinator and policy exactly once.
- **Future maintenance burden:** Low; one adjacent owner defines copy, admission, and busy feedback while internal operations stay reusable.

### Selected LIFE-01 synthesis and boundaries

Select C and retain A's reuse of existing reset, cleanup, and apply callbacks. The local prototype explores synchronous single-flight admission at each outer public lifecycle handler; a pending action rejects later attempts with `Another project action is still in progress. Wait for it to finish, then try again.`, performs no queued work, and releases in `finally`. This makes the first handler's captured active workspace safe without generation or cancellation machinery. Take none of B: there is no dirty marker, path/save-state inference, Resume surface, session summary, autosave, window-close guard, schema change, disabled/progress UI, or Home-layout change. Prompts conservatively describe the active project even immediately after Save. Main Menu acceptance abandons the project and returns Home; it does not imply memory retention. A declined valid Load returns `Load cancelled. Current project was kept.` while preserving the typed #300 Home feedback path; busy feedback also remains visible on Home.

## Why SEARCH-01 was selected for iteration 7

SEARCH-01 tied NAV-01 and TEMPLATE-02 at **36**. NAV-01 still needs native navigation evidence, while TEMPLATE-02 needs a product decision about numeric draft, blur, and error behavior. SEARCH-01 has direct async-flow evidence in the existing Steam-search hook and a bounded deterministic correction: one stable monotonic submission coordinator permits only the newest request to publish results, terminal status, or loading completion. Existing reset, Clear, and submitted-empty-query paths invalidate pending work; requests still finish normally. No `AbortController`, debounce, cache, pagination, Enter disabling, Steam-import concurrency, result presentation, or project behavior was added.

GitHub issue [#304](https://github.com/thelordofdino4/steam-backup-label-studio/issues/304) records the selected iteration-7 scope. This localized `MODERATE` async-ordering correction did not require competing architecture proposals. Its score and table rank remain unchanged for audit traceability. A local prototype exists outside this publication; no implementation acceptance is claimed; native pending-state clarity remains pending at the required viewport sizes.

### Structured external research record

| Source | Principle | Application | Classification | Product-fit rationale |
| --- | --- | --- | --- | --- |
| [WAI-ARIA Button Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/) | Native/custom **buttons** support Space and Enter activation. | A global viewport shortcut yields when a button or descendant owns Space. | recommended | Both editors use native buttons and custom menu/tab actions; yielding preserves established activation without changing focus order. |
| [WCAG 2.2 Understanding 2.1.3: Keyboard (No Exception)](https://www.w3.org/WAI/WCAG22/Understanding/keyboard-no-exception) | Functionality should remain keyboard operable without requiring specific timings for individual keystrokes. | It provides context for cautious global-key interception; Enter availability means this evidence alone does not establish nonconformance. | contextual | The correction improves keyboard convention while retaining the Space-pan workflow. |

## Independent solution proposals for A11Y-01

### A — Minimal focused input-policy correction

Keep the existing window listener and viewport pointer capture. Expand one viewport-owned predicate so Space yields to native interactive controls, linked anchors, summaries, browser-effective contenteditable targets, and the currently used interactive ARIA roles. Respect already-prevented/repeated keyboard events.

- **Benefit:** Directly fixes the observed failure on both editors with very little behavioral surface.
- **Risk:** Low; one owner changes and pan/zoom/layout remain untouched.
- **Architecture fit:** Strong; `PreviewViewport` already owns input arbitration.
- **Testability:** High with a pure target/event decision helper plus native smoke.

### B — Focus-owned viewport region

Make the preview a focusable interaction region and arm Space only while viewport focus or explicit pointer ownership is active. Add user-facing focus/shortcut semantics and related styling.

- **Benefit:** Stronger long-term scoping of keyboard shortcuts.
- **Risk:** Moderate; changes focus order, styling, and interactions with the text editor and guided controls.
- **Architecture fit:** Medium-high, but it adds a new focus contract that must be designed across both editors.
- **Testability:** Good, but reliable approval requires native focus and accessibility testing.

### C — General shortcut-owner framework

Introduce a reusable shortcut taxonomy/registry that decides ownership from focus, pointer-inside state, target/composed path, and registered commands.

- **Benefit:** Most extensible if many global shortcuts are planned.
- **Risk:** Moderate; abstraction and migration breadth exceed the single verified defect.
- **Architecture fit:** Potentially strong later, but premature now.
- **Testability:** High at the model layer but costly at integration boundaries.

## Selected synthesis and boundaries

The locally explored synthesis used Solution A with two narrowly justified safeguards from C; it is not included or accepted by this publication:

1. Honor `event.defaultPrevented`, so an earlier owner keeps the key.
2. Re-check the pointer-down target, so an armed primary-button pan cannot begin from an interactive descendant.

The helper stays adjacent to `PreviewViewport` for honest unit testing. The change does not introduce an app-wide shortcut framework, a focus/layout redesign, a new shortcut, or changes to pan math, pointer zoom, renderers, export, save/load, or persisted state. Existing middle-button behavior remains intact. Key-up and window blur share one disarm callback; unmount cleanup removes all listeners and clears the ref without scheduling a state update.

## Local prototype publication status

Local prototypes were prepared for A11Y-01, A11Y-03, FEEDBACK-01, SIDEBAR-01, EXPORT-01, LIFE-01, and SEARCH-01 under issues #298–#304. This findings-only publication includes no implementation branch or commit, makes no implementation acceptance claim, and records native validation as pending. Issue #305 is separate export-helper work, not an eighth UI iteration or twentieth finding; its implementation is also outside this publication.

## Source-audit status — evidence-backed diminishing returns

The evidence judge concluded that the static/source audit reached evidence-backed diminishing returns. This is not a claim of perfect UI behavior or implementation acceptance: native Tauri verification remains pending and was not run.

The register records seven local UI prototypes—A11Y-01, A11Y-03, FEEDBACK-01, SIDEBAR-01, EXPORT-01, LIFE-01, and SEARCH-01—but none of their implementation branches or commits are included. The remaining findings and publication dispositions are:

- **NAV-01:** tracked in [#306](https://github.com/thelordofdino4/steam-backup-label-studio/issues/306); native verification remains required. Related: #168, #126, and completed #271.
- **TEMPLATE-02:** tracked in [#307](https://github.com/thelordofdino4/steam-backup-label-studio/issues/307); interaction-policy decision and native verification remain required.
- **SESSION-01:** tracked in [#308](https://github.com/thelordofdino4/steam-backup-label-studio/issues/308); broad project-session design remains required.
- **A11Y-02:** tracked in [#309](https://github.com/thelordofdino4/steam-backup-label-studio/issues/309); focus-lifecycle design and native verification remain required.
- **IMPORT-01:** tracked in [#310](https://github.com/thelordofdino4/steam-backup-label-studio/issues/310); product-behavior decision remains required. Related: #149 and #181.
- **STORAGE-01:** tracked in [#312](https://github.com/thelordofdino4/steam-backup-label-studio/issues/312) as separate reliability work.
- **GUIDANCE-01:** reused #168 and #281; product decision plus native verification remain.
- **TEMPLATE-01:** tracked in [#311](https://github.com/thelordofdino4/steam-backup-label-studio/issues/311); state/recovery design remains required.
- **RECOVERY-01:** broad recovery architecture.
- **Documentation/process debt (merged observation):** internal maintenance, not another user-facing UI iteration.
- **COPY-01** and **PICKER-01:** lower-impact follow-ups.
- **LAYOUT-01:** insufficient native evidence.

Publication state: findings-only documentation; implementation branches and commits are not included.
