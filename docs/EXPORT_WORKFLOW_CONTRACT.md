# Export Workflow Contract

> Status: Draft target-state normative contract.
> Purpose: Define one shared PNG export command, its state and ownership boundaries, preflight and dialog order, immutable snapshot, adapters, results, feedback, focus, concurrency, and destination-write safety.
> Read when: Export controls, preflight, PNG rendering/writing, exported guides, export feedback, export dialogs, export shortcuts, or Disc/Case export adapters are designed or changed.
> Authoritative source: This document for target application-level PNG export execution semantics; current source and focused tests for as-built behavior until this contract is implemented.
> Evidence baseline: the original audit at `f750a5c4b8721e6de4912a9be5ef26a05cddab5e`, merged issue #302 ordering in PR #332 at `98f6153b8386fa0b91dadbf86d1769337a6ac8b9`, and the shared-command source checkpoint reviewed 2026-07-31.

Implementation checkpoint, 2026-07-30: the existing Disc and Case Insert PNG
orchestrators now run preflight before destination selection. Clean preflight
opens no confirmation; one or more existing advisory warnings open exactly one
confirmation using the established copy and options; warning decline opens no
destination chooser. After preflight permits export, destination cancellation
still terminates before rendering or writing. Disc preview measurement remains
deferred until rendering is about to start. This checkpoint does not implement
the target immutable normalized request, typed diagnostics/blockers/results,
central command/busy/feedback ownership, safe destination replacement, or File
menu connection defined by the remainder of this contract.

## 1. Status, purpose, authority, and related documents

This is a **draft target-state normative contract**. Requirements labeled as
target invariants are not claims that a command registry, immutable export
request, typed diagnostics, global feedback host, export busy owner, or safe
destination commit already exists.

The authority boundary is:

| Concern | Focused authority |
| --- | --- |
| Application-level export execution, configuration versus execution, preflight severity and order, warning consent, destination selection, request consistency, typed outcomes, export busy ownership, feedback/focus, and Disc/Case adapters | This contract |
| Shared command definition/dispatch vocabulary, application session, path/baseline/dirty rules, result taxonomy, global feedback boundary, and general dialog/shortcut precedence | [`APPLICATION_COMMAND_AND_PROJECT_LIFECYCLE_CONTRACT.md`](APPLICATION_COMMAND_AND_PROJECT_LIFECYCLE_CONTRACT.md) |
| Semantic control classification, presentation-adapter rules, editor navigation, typed destinations, and focus-routing results | [`EDITOR_NAVIGATION_AND_CONTROL_OWNERSHIP.md`](EDITOR_NAVIGATION_AND_CONTROL_OWNERSHIP.md) |
| Serialized export-setting fields and migration/compatibility rules | [`PROJECT_FILE_SPEC.md`](PROJECT_FILE_SPEC.md) |
| As-built architecture, preview/export parity, and validation guardrails | [`SOFTWARE_DESIGN_DOCUMENT.md`](SOFTWARE_DESIGN_DOCUMENT.md) |
| Exact canvas composition, layer order, rasterization, PNG encoding, and native platform mechanisms | Current source, [`DISC_EDITOR_LAYER_ORDER.md`](DISC_EDITOR_LAYER_ORDER.md), [`CASE_INSERT_EDITOR_LAYER_ORDER.md`](CASE_INSERT_EDITOR_LAYER_ORDER.md), and focused implementation work, subject to this contract |
| Physical template data vocabulary and current calculations | [`TEMPLATE_SPEC.md`](TEMPLATE_SPEC.md) and current template/domain source |
| Disc template choice, custom-dimension validation, committed-geometry planning/apply, and recovery | [`DISC_TEMPLATE_AND_PHYSICAL_GEOMETRY_WORKFLOW_CONTRACT.md`](DISC_TEMPLATE_AND_PHYSICAL_GEOMETRY_WORKFLOW_CONTRACT.md) |
| Product scope | [`PRD.md`](PRD.md) |
| Game workflow | [`GAME_SEARCH_IMPORT_AND_METADATA_WORKFLOW_CONTRACT.md`](GAME_SEARCH_IMPORT_AND_METADATA_WORKFLOW_CONTRACT.md) |
| Disc Layout Preset selection/planning/application/configuration | [`DISC_LAYOUT_PRESET_WORKFLOW_CONTRACT.md`](DISC_LAYOUT_PRESET_WORKFLOW_CONTRACT.md); export consumes committed owner state and never applies or reinterprets a preset |
| Guided workflows and final application-menu presentation | Separate focused contracts or issue-scoped work |

Current facts defer to source and focused tests if a dated description differs.
Serialized shapes defer to the project-file specification. Agent safety and
validation rules remain governed by [`../AGENTS.md`](../AGENTS.md).

## 2. Claim classifications and terminology

Every behavioral statement in this document belongs to one of these classes:

| Claim class | Meaning |
| --- | --- |
| **Current fact** | Verified at the evidence baseline in source, tests, or current serialized schema. |
| **Target invariant** | Required behavior for future implementation; not proof that the current app behaves this way. |
| **Future extension** | Deliberately deferred behavior that must not be inferred as part of the target implementation. |

Terms used here:

- **Export configuration**: serialized project values that intentionally affect
  future PNG pixels, currently exported-guide settings.
- **Export execution**: one invocation of `export.png` from dispatch through its
  terminal result.
- **Physical output**: one printable PNG canvas. Disc has one label output;
  current jewel Case Insert has Cover Sheet and Tray Card outputs.
- **Physical target**: the resolved project kind and physical output for one
  invocation.
- **Export request/snapshot**: the immutable, normalized, operation-owned input
  consumed by preflight, confirmation copy, rendering, encoding, and writing.
- **Diagnostic**: a typed preflight finding with stable identity and severity.
- **Blocker**: a diagnostic proving that a valid, truthful supported output
  cannot be produced.
- **Warning**: an actionable non-blocking diagnostic requiring informed user
  consent.
- **Commit**: the destination-write boundary after which a complete PNG is
  durably reported as written. It is not a project-session or saved-baseline
  commit.
- **Presentation adapter**: a button, future menu item, shortcut, command-palette
  item, or Home affordance that dispatches semantic behavior without owning it.

## 3. Evidence-backed current-state baseline

The complete current route is implemented by the shared application-command
root, `appPngExportCommand.ts`, `appPngExportInputs.ts`, `appPngExport.ts`, the
two preflight builders, the two canvas exporters, `canvasImage.ts`, the native
menu ingress, the Tauri dialog plugin, and `write_binary_file`.

| Current fact | Evidence and consequence |
| --- | --- |
| Disc Project File and Case Project File each expose an `Export PNG` button; Home exposes no export activation. | `ProjectPanel.tsx`, `CaseInsertEditorShell.tsx`, and `HomeScreen.tsx`. Both buttons project the central capability and dispatch `export.png`; the native File `Export PNG…` item resolves the same command from its authoritative descriptor. |
| `handleExportPng` only dispatches `export.png`; the registered command owner resolves Disc Label, Case Cover Sheet, or complete Case Tray Card and captures the matching adapter input once. | `App.tsx`, `appPngExportCommand.ts`. Current combined Case Spine navigation resolves to the complete Tray Card, never a spine-only PNG. |
| Both routes execute **preflight -> optional warning confirmation -> destination chooser -> render/encode -> direct write -> status**. | `appPngExport.ts` and `appPngExport.test.ts`. A clean summary skips confirmation; warning decline and destination cancellation both occur before render/write. |
| Confirmation is conditional on the existing `hasWarnings` result. | Clean preflight proceeds directly to destination selection. Any current advisory warnings produce exactly one aggregated confirmation before the destination chooser. |
| Current warning confirmation uses title `Export PNG preflight`, kind `warning`, OK label `Export PNG`, Cancel label `Cancel`, and a message ending `Continue with export?`. | Warning summaries append one `Warnings:` list. Clean summaries open no information dialog, and there is still no blocker presentation. |
| Preflight returns `{ message, hasWarnings, warnings: string[] }`. | `exportPreflight.ts` and `caseInsertExportPreflight.ts`. There are no typed diagnostic IDs, severities, blockers, targets, or focus destinations. |
| All implemented findings are advisory strings. | Even inconsistent custom Disc dimensions, missing images/content, blank Case regions, unresolved text boxes, layout clamps, low-resolution/fit risks, exported guides, and safe-edge/readability risks only set `hasWarnings`. |
| Disc preflight and render receive separate object shapes. | `appPngExportInputs.ts` and its orchestration test deliberately preserve distinct manual/resolved title inputs. They are not one normalized request identity. |
| Disc preview width is read after permitted preflight and destination selection, immediately before rendering. | `App.tsx` calls `discPreviewRef.current?.getBoundingClientRect().width`; `exportPng.ts` uses it to scale background offsets. It is not read after preflight failure, warning decline, or destination cancellation/failure. This live DOM measurement remains a current presentation-geometry coupling and prevents a complete invocation-time immutable snapshot. Preview zoom/pan themselves are not passed. |
| Case target is the coarse active pane: `cover` or `tray`. | `getCaseInsertTemplatePaneConfig` maps Cover Sheet to front and Tray Card to back; Tray rendering includes both spine strips. Current Front/Back/combined-Spine navigation maps to those two panes, not four PNGs. |
| Disc render is one circular output; Case render is one rectangular active-pane output. | `exportPng.ts`, `exportCaseInsertPng.ts`, `templateSurfaces.ts`, and `TEMPLATE_SPEC.md`. |
| Disc guide output reads four booleans; Case guide output reads selected guide IDs. | `drawExportGuides.ts` and `drawCaseInsertGuides.ts`. Both draw selected exported guides after normal content. |
| Preview guides are separate from exported-guide selection. | `DiscGuideOverlay.tsx` always uses template geometry; `CaseInsertGuideOverlay.tsx` renders the active layout's guides. Neither reads exported-guide configuration. |
| Guide Legend is preview-local and starts collapsed in both editors. | `DiscPreview.tsx` and `CaseInsertPreview.tsx` initialize local `isGuideLegendOpen` to `false`. Its static/derived content is not passed to either exporter. |
| Disc guide booleans and Case `guideIds` are serialized. Case `export.surfaces` is also serialized but is not consulted by the current execution/render path. | `projectTypes.ts`, project snapshot/restore adapters, Case normalization/defaults, and parity tests. Repository search finds no current export decision reading `caseInsert.export.surfaces`. |
| Export returns the shared typed command result. | Success, destination cancellation, warning decline, and stage-specific failures carry stable result kinds/codes plus the existing user-facing copy. The Disc and Case workflow adapters publish no status themselves. |
| Feedback is application-owned and published once. | Button and native-menu dispatch outcomes pass through `appApplicationCommandFeedback.ts`; accepted messages use the shared toast owner, deduplication keys, and Home live-status mirror. |
| One central export capability and the shared busy coordinator arbitrate execution. | Home/no-session/unresolved/missing-adapter states are disabled. `export.execution` plus focused warning, destination, and write child scopes prevent duplicate dialogs/renders/writes and conflict with lifecycle transitions/navigation. |
| Rendering and PNG encoding complete in memory before native writing begins. | Both exporters await `canvasToPngBytes`; `canvasImage.ts` creates a Blob, ArrayBuffer, and `number[]` before invoking Rust. Render/encode failure therefore occurs before the current write call. |
| Native PNG writing is a direct `std::fs::write(path, bytes)`. | `src-tauri/src/commands/files.rs`. An existing file can be truncated before a later write failure; no same-directory temporary file, flush policy, atomic replace, rollback, or Windows replacement guarantee exists. |
| Export execution does not call project save/snapshot adapters or update lifecycle path, baseline, format, revision, or dirty state. | The export route only assesses the current editor inputs, chooses a PNG destination after permitted preflight, renders, writes, and announces status. |

The issue #302 checkpoint corrects the original Phase 2 ordering and
unconditional-confirmation findings. Live Disc preview width remains an export
input even though zoom, pan, selection, focus, ribbon/sidebar state, toasts,
and Guide Legend state are not.

## 4. Export scope, semantic owners, and application-command boundary

**Target invariant:** `export.png` is one domain workflow registered in the
shared application-command system. It is an application command in dispatch
terms, but it is not a project lifecycle command and it does not own project
session transitions. The lifecycle contract supplies the descriptor/result
vocabulary, session access, busy arbitration, and feedback boundary; this
contract owns the export sequence.

### Current and target control/semantic ownership

| Surface/control | Current owner/class | Target semantic owner | Adapter responsibility | Must not own |
| --- | --- | --- | --- | --- |
| Disc `Export PNG` | Presentation adapter over the shared command | `owner.export.workflow`, command `export.png` | Dispatch exact command ID and present central capability | Renderer choice, preflight, dialogs, busy state, or feedback |
| Case `Export PNG` | Presentation adapter over the same shared command | `owner.export.workflow`, command `export.png` | Same | Pane-to-renderer branching or a Case-only workflow copy |
| Future Home export affordance | None | Same command, only if retained target resolves truthfully | Dispatch or show central disabled reason | Guess a target from a label or stale route |
| Native File menu/accelerator | Native item click is connected as `menu.file.export-png`; Ctrl/Cmd+E remains descriptor-owned. Because the pinned WebView2/Wry native path does not deliver Windows Ctrl+E, the bounded Windows WebView adapter forwards it only while the latest projection enables this same item. | Same command | Resolve the descriptor and dispatch through the committed application-command ingress; preserve earlier keyboard/modal owners and cross-source deduplication; do not add a private export shortcut callback | Eligibility, target resolution, confirmation, destination, or results |
| Disc Export Options | `useDiscExportGuides` plus `ExportOptionsPanel`; project configuration | `owner.export.disc-guides` | Submit typed guide-setting intents | Execute export or own command predicates |
| Case Export Options | Case export state plus `exportGuideOptions.ts`; project configuration | `owner.export.case-guides` | Submit typed guide-setting intents | Execute export or create surface-local duplicates |
| Guide Legend | Preview-local informational overlay | `owner.preview-guide-legend` | Explain preview guide vocabulary | Configure pixels or execute export |
| Preview guide overlays | Preview renderer adapters | Disc/Case preview guide domains | Render editing aids | Read exported-guide settings as implicit permission |
| Result/status presentation | Shared application feedback boundary | Shared application feedback boundary | Project one returned result once | Reinterpret thrown strings independently per surface |

Export configuration navigation reuses `area.export`, the matching guide owner,
and the exact control IDs in the ownership reference. Focusing
`owner.export.workflow` / `control.export.run` is navigation only; a completed
focus route never means an export ran.

The command exports only the active project's **current physical output as
PNG**. Batch export, export-all, other formats, printing, and sharing are future
extensions and must use separate reviewed commands rather than widening
`export.png` implicitly.

## 5. Export configuration, session state, and ephemeral UI classification

Export configuration mutates the project only through established project/domain
owners. Executing export never mutates project content.

| State/value | Current storage/use | Target class | Serialized authority | Dirty effect under lifecycle contract | Export-pixel effect |
| --- | --- | --- | --- | --- | --- |
| Disc `centerHole`, `outerEdge`, `printableArea`, `safeZone` booleans | React state; saved as `SavedDiscProject.export.guides` | Serialized project configuration | Project-file spec | A changed canonical value may make the session dirty | Each captured `true` value enables its supported output guide |
| Legacy Disc `guideMode` | Optional compatibility field accepted by restore | Serialized compatibility input | Project-file spec/migration | Only its canonical normalized guide selection matters | Indirect through normalized four-boolean selection |
| Case `export.guideIds` | Case project state; saved/restored/normalized | Serialized project configuration | Project-file spec | A changed canonical list may make the session dirty | Captured IDs select supported Case guides |
| Case `export.surfaces` (`front`, `back`) | Serialized and normalized; not read by current export execution | Serialized project configuration with no current execution owner | Project-file spec | A changed canonical value may make the session dirty even though current pixels do not change | None at the evidence baseline; future use/deprecation needs schema/product decision |
| Case `editor.activeCaseInsertTemplatePane` | Currently saved as `cover`/`tray` compatibility state and restored | Current serialized compatibility; target session navigation | Project-file spec owns compatibility/migration; ownership contract owns target | Target canonical dirty comparison excludes navigation | Resolves the current physical output; it is not guide configuration |
| Full Case Front/Back/left/right-spine destination | Runtime navigation; current route retains only combined `spine` at coarse level | Session-only retained navigation | Ownership/lifecycle contracts | No | Resolves to Cover or Tray physical output; side focus does not create a separate PNG |
| Disc/Case preview guide overlays | Derived from active template/layout | Derived preview state | None | No | Never, unless an explicit exported-guide setting is captured separately |
| Guide Legend content and collapsed/expanded state | Derived content plus preview-local `useState(false)` | Derived/ephemeral UI | None | No | Never |
| Preview zoom/pan, hover, selection, focus, text caret, ribbon/sidebar/panel state | UI/runtime state | Ephemeral UI | None | No | Never; current Disc preview-width coupling must be removed or normalized as section 8 requires |
| Preflight diagnostics | Recomputed string summary | Target derived operation state | None | No | No direct pixel effect |
| Confirmation/native dialog state, selected destination, busy scopes, feedback | Per invocation/UI | Ephemeral operation state | None | No | Destination affects only where bytes are committed |
| Rendered canvas and encoded PNG bytes | Per invocation | Ephemeral operation artifacts | None | No | They are the output, never project content |

Invoking, confirming, declining, cancelling, rendering, encoding, or writing
`export.png` must not adopt a project path, replace the clean baseline, alter the
project revision, make the project clean, or create an Undo/Redo content
transaction. A successful PNG path is not the project's `.sbls.json` path.

## 6. Command identity, capabilities, and presentation adapters

The shared descriptor vocabulary from the lifecycle contract is reused exactly.
No export-only registry or parallel dispatch/result framework is permitted.

### `export.png` descriptor

| Field | Normative value |
| --- | --- |
| Stable command ID | `export.png` |
| Semantic operation | Export the active supported session's resolved current physical output as one PNG |
| Central capability | Active session exists; project kind is supported; current physical target resolves; required adapter is registered; no conflicting export/lifecycle busy scope is owned |
| Capability reason codes | `export.no-active-session`, `export.unsupported-project-kind`, `export.target-unresolvable`, `export.adapter-unavailable`, `export.busy`, `export.lifecycle-conflict` |
| Repeat policy | `reject-while-busy` |
| Busy ownership | Root `export.execution`; child scopes as defined in section 12; conflict with `lifecycle.transition` |
| Presentation input | Initiator identity and optional typed focus-return destination only; no renderer choice, project-kind branch, copied project state, or destination path |
| Operation input | One internally resolved immutable `ExportPngRequest` from section 8 |
| Successful effect | Commit one complete PNG to the invocation's selected destination, return typed success, publish feedback once |
| Project/session effects | None: no content, project path, baseline, dirty, revision, Undo/Redo, or physical-target mutation |
| Outcomes | Shared `success`, `cancelled`, `declined`, or `failure`; outer dispatch may be `not-executed` for unknown/disabled/busy |

`canExecute` is authoritative and is re-run at dispatch. A disabled button is
only a projection of that result. After capability passes, the workflow—not the
initiating adapter—resolves project kind, target, and Disc/Case adapter.

Labels, icons, menu placement, platform roles, and keyboard shortcuts are not
defined here. Future buttons, menus, shortcuts, or command-palette entries must
dispatch `export.png` and receive equivalent capability, workflow, result,
feedback, and focus behavior. A future shortcut remains subject to #298 and the
shared modal/editable/preview/global precedence rules.

## 7. Physical target resolution and Disc/Case target model

Target resolution is a pure command/domain service over the active session and
retained semantic navigation. It must not inspect menu labels, DOM visibility,
CSS classes, stale focus, or a presentation-local target copy.

| Project/navigation identity | Physical export target | Truthful output identity |
| --- | --- | --- |
| Disc session / `surface.disc` | One normalized circular Disc label | `output.disc.label` / “Disc Label” |
| Case Front / compatibility pane `cover` | Complete Cover Sheet/front surface | `output.case.cover-sheet` / “Cover Sheet” |
| Case Back / compatibility pane `tray` | Complete Tray Card | `output.case.tray-card` / “Tray Card” |
| Case left spine destination | Complete Tray Card containing back panel plus both spine strips | `output.case.tray-card`; confirmation may note the initiating left-spine context but must not call it a left-spine PNG |
| Case right spine destination | Same complete Tray Card | `output.case.tray-card`; same rule |
| Current combined Case Spine navigation | Same complete Tray Card | `output.case.tray-card` |

Disc resolution includes its valid committed template and physical dimensions
from the geometry workflow's canonical after-state. Export consumes that state;
it does not select a template, apply a candidate, clamp/reflow owner layouts, or
repair geometry. Case
resolution uses the authoritative current semantic destination, adapting through
the current `cover`/`tray` pane model where necessary. Current jewel Case Insert
does not have four independent Front/Back/left/right PNG outputs.

The serialized Case `export.surfaces` list does not select the current target at
the evidence baseline. It must not silently override the current physical target
until a separate schema/product decision gives it execution semantics.

Return Home/Resume preserves the active session and retained destination under
the lifecycle contract. An Export adapter on Home is enabled only when the
retained session and intended physical target can still be resolved truthfully;
otherwise it projects `export.target-unresolvable`. An adapter may explicitly
supply a future reviewed target intent, but may not guess one.

Current suggested filenames are `steam-backup-label.png`,
`steam-backup-cover-sheet.png`, and `steam-backup-tray-card.png`. Target filename
metadata comes from the resolved request through one sanitizer/extension policy,
not from individual adapters.

## 8. Immutable export request and snapshot consistency

One accepted dispatch captures exactly one immutable request before preflight:

```ts
type ExportPngRequest = Readonly<{
  operationId: string
  sessionId: string
  projectKind: 'disc' | 'caseInsert'
  physicalTarget: ExportPhysicalTarget
  projectRevision: number
  canonicalChangeId: string
  normalizedRenderSnapshot: DiscExportSnapshot | CaseExportSnapshot
  exportConfiguration: DiscExportConfiguration | CaseExportConfiguration
  preflightInput: ExportPreflightInput
  suggestedFileName: string
  initiatedFrom?: EditorDestination
  focusReturn?: EditorDestination
}>
```

The exact implementation type may differ, but all listed semantics are
required. `canonicalChangeId` may be a hash or another stable operation-facing
identity; it is diagnostic/test identity, not a new serialized project field.

Target invariants:

1. Target resolution and normalization read live session state once.
2. Preflight, target copy, warning confirmation, filename, renderer, encoder,
   writer metadata, result, and logging all refer to the same request identity.
3. No stage re-reads mutable React/project owner state to alter that invocation.
4. Assets are captured as stable bytes/data or operation-owned immutable
   identities sufficient to prevent later edits or remote mutation from silently
   changing pixels. An asset load may still return a typed render failure.
5. Non-conflicting editing may continue while custom/native dialogs are open.
   Those edits update the live project and revision but are not included in the
   captured invocation and are never rolled back on export completion.
6. Export success, failure, cancellation, or decline does not change either the
   captured revision identity or the live project's baseline/dirty state.
7. If the architecture cannot yet capture complete normalized Disc and Case
   inputs, snapshot isolation is an implementation prerequisite—not an allowed
   weakening of the workflow.

The current Disc late `getPreviewSize()` call violates rule 3 and the current
separate Disc preflight/render shapes do not establish rule 2. Future work must
normalize background placement into presentation-independent design/export
coordinates or capture any transitional normalization input inside the request
before preflight. Zoom/pan and late DOM size may not determine output pixels.

## 9. Preflight inputs, diagnostics, severity, and purity

Preflight is a pure deterministic function of `ExportPngRequest`. It must not
mutate or repair project state, choose a path, open a dialog, load UI state,
render/encode/write a PNG, or publish feedback.

```ts
type ExportDiagnostic = Readonly<{
  id: string
  severity: 'blocker' | 'warning' | 'informational'
  userMessage: string
  physicalTarget: ExportPhysicalTarget
  ownerId?: EditorOwnerId
  destination?: EditorDestination
  details?: Readonly<Record<string, string | number | boolean>>
}>
```

Diagnostic IDs and destination relationships are stable testable domain values.
`details` is safe structured context, not an unfiltered exception. Messages may
evolve without changing identity.

### Severity and workflow consequence

| Severity | Meaning | Workflow consequence | Result/feedback |
| --- | --- | --- | --- |
| `blocker` | A valid, truthful supported PNG cannot be produced from the captured request | Stop before confirmation and destination selection | Shared `failure` with code `export.preflight-blocked`, structured diagnostics, recoverable user message, optional configuration destination |
| `warning` | PNG can be produced, but a known risk needs informed consent | Aggregate all actionable warnings into exactly one confirmation | Proceed continues; Do Not Export returns `declined` |
| `informational` | Useful non-decision context such as dimensions/DPI | Include in summary/result UI if useful; never open confirmation by itself | No terminal result and no consent requirement |

Blockers include unsupported/unresolvable target state, invalid or
unrenderable normalized dimensions, missing required normalized render state,
or inability to form the complete request. Preflight must reuse authoritative
validation/normalization rules and typed configuration destinations where they
exist. It must not silently correct invalid values during export.

### Current implemented coverage and target gaps

| Adapter | Implemented current checks (all advisory strings) | Target gaps |
| --- | --- | --- |
| Disc | Selected template and physical/output summary; guide-export warning; missing background/blank fill; common-range and cross-field custom-dimension warnings; missing enabled title image; rating metadata/custom image; custom media/platform/technical images; branding/text summary | Typed identity/severity/target/destination; blockers; complete request validation; renderability and stable asset readiness; consistent preflight/render title and geometry inputs; additional artwork/logo visibility coverage where not already represented |
| Case | Active Cover/Tray dimensions and spine inclusion; guide-export warning; missing/blank visible content; background/image fit and source size; enabled missing slots; safe-edge/layout-clamp warnings; text empty/unresolved/readability/overflow; tray left/right-spine content/image/text risks; built-in asset origin exclusion | Typed identity/severity/target/destination; blockers; complete snapshot validation; stable asset readiness; explicit physical-target identity independent of UI; tests proving every supported owner and both physical outputs share the same snapshot |

Current invalid custom Disc relationships remain warnings because the present
template owner generally retains normalized values. Under target behavior,
truly invalid captured dimensions are blockers and may point to the typed Disc
Template configuration destination. The Disc geometry workflow contract owns
field draft/commit errors and template-switch recovery grounded in #307/#311.
Preflight detects and blocks; it does not repair or replace that workflow.

Design Check is a separate derived editor aid. Its diagnostics may reuse pure
domain checks, but opening or clearing Design Check is not preflight and cannot
authorize an export.

## 10. Normative workflow sequence and transition table

The target order is exactly:

`dispatch/capability -> acquire busy -> resolve target -> capture request -> preflight -> blocker stop OR one warning confirmation when needed -> destination -> render -> encode -> write/commit -> typed result/feedback/focus/release`

### Stage-by-stage transition contract

| Stage | Allowed next transition | Cancellation/failure result | Permitted side effects | Prohibited side effects |
| --- | --- | --- | --- | --- |
| 1. Dispatch `export.png` | Re-check central capability | Outer `not-executed/unknown-command`, `disabled`, or `busy` | Capability projection/log context | Dialog, project mutation, target guess, render, write, feedback duplication |
| 2. Acquire `export.execution` | Resolve target after all scopes are owned | Outer `not-executed/busy` if acquisition loses a race | Busy ownership only | Project mutation, dialog, render, write |
| 3. Resolve project kind/physical target | Capture request | `failure` with `export.unsupported-target` or `export.target-unresolvable` | Derived target identity | Destination dialog, renderer choice by adapter UI, project mutation |
| 4. Capture/normalize immutable request | Run adapter preflight | `failure` with `export.snapshot-failed` | Operation-owned immutable snapshot and revision identity | Baseline/path/dirty change, later live-state re-read |
| 5. Run complete pure preflight | Blocker terminal, warning decision, or clean path | Unexpected assessment error -> `failure` with `export.preflight-failed`; diagnostics with blockers -> `export.preflight-blocked` | Derived diagnostics only | Dialog/path/render/write/repair/feedback publication by preflight |
| 6. Handle blockers | Terminal result | `failure` with `export.preflight-blocked` | One global actionable failure projection after command returns | Confirmation, destination chooser, render, encode, write |
| 7. Aggregate actionable warnings | Open exactly one custom confirmation | Dialog technical failure -> `failure` with `export.confirmation-failed` | Modal UI and focus lifecycle | Multiple warning dialogs, destination chooser, generic second confirmation |
| 8. Resolve warning decision | Proceed to destination or terminal decline | Do Not Export/dismiss -> `declined` with `export-warning-not-authorized` | Typed decline; intentional neutral feedback only if policy requests it | Destination chooser, render, write, failure feedback |
| 9. Clean preflight | Proceed directly to destination | Not applicable | None | Confirmation of any kind |
| 10. Choose native destination | Render after a path is returned | Dismiss -> `cancelled/file-dialog-dismissed`; dialog failure -> `failure` with `export.destination-failed` | Native dialog; provisional invocation-scoped destination | Project path adoption, baseline/dirty change, render before selection |
| 11. Render captured request | Encode complete canvas | `failure` with `export.render-failed` | Operation-local canvas/assets | Live project read, editor chrome, destination success claim, write |
| 12. Encode PNG | Write/commit complete bytes | `failure` with `export.encode-failed` | Complete operation-local PNG bytes | Partial application write, success feedback |
| 13. Write and commit destination | Return success only after complete commit | `failure` with `export.write-failed` or `export.commit-failed` | Destination filesystem operation | Project path/baseline/dirty change, partial/invalid output knowingly replacing a valid file |
| 14. Return typed result | Project feedback/focus policy | Unexpected caught error -> `failure` with `export.unexpected` | One result, safe logging context, one feedback intent | Renderer/writer/presentation duplicate messages |
| 15. Restore focus and release scopes in `finally` | Terminal | Focus fallback may be reported but cannot rewrite the export result | Typed focus route; release every acquired scope exactly once | Stale DOM selector/ref dependency, leaked busy state |

No destination chooser may open before preflight and any required warning
decision complete. Rendering or encoding may not begin merely because a user
previously chose a path in another invocation.

## 11. Warning confirmation and destination-selection policy

Warning confirmation exists only to obtain consent for known non-blocking
diagnostics:

- A clean preflight opens no confirmation.
- One or more actionable warnings open one accessible aggregated confirmation.
- Copy identifies Disc Label, Cover Sheet, or Tray Card truthfully, lists all
  relevant warnings, and offers explicit **Proceed** and **Do Not Export** (or
  platform-equivalent Cancel) actions.
- Proceed opens the destination chooser. It does not open another generic
  “Are you sure?” dialog.
- Do Not Export and custom-dialog dismissal both return shared `declined` with
  reason `export-warning-not-authorized`. They change no project/filesystem
  state and open no destination chooser.
- The modal follows #309: useful initial focus, trapped Tab/Shift+Tab,
  Escape/close behavior, and opener restoration with a safe fallback.

Native overwrite confirmation belongs to the operating system/file dialog. It
is distinct from application warning consent and cannot be treated as
permission to ignore preflight.

Destination selection begins only after preflight passes and warning consent is
granted or unnecessary. Closing the native chooser returns
`cancelled/file-dialog-dismissed`, writes nothing through the application, and
does not produce failure feedback. The path remains provisional and scoped to
that invocation until commit succeeds; even success does not make it the
project path or reusable authority for later exports.

The request owns the centrally sanitized suggested filename and `.png`
extension. Exact sanitization and native path identity are implementation
decisions, but adapters may not apply divergent rules.

After custom or native dialog completion, focus routes to the initiating typed
destination when still compatible; otherwise it uses a stable truthful fallback
such as `area.export` / `owner.export.workflow`. It never assumes the originating
DOM element remains mounted, particularly when Return Home occurs during an
invocation.

## 12. Busy ownership, concurrency, reentrancy, and lifecycle arbitration

Export adds focused scopes to the lifecycle contract's shared vocabulary:

| Scope | Ownership and conflict rule |
| --- | --- |
| `export.execution` | Root operation scope for one `export.png`; exclusive with another export and with `lifecycle.transition` |
| `dialog.export-warning` | Child scope while the one application warning modal is active; no overlapping export/native project dialog |
| `dialog.export-destination` | Child scope while the native PNG destination chooser is active; one owner only |
| `persistence.export-write` | Child scope while PNG destination write/commit is active; no duplicate write for the operation |

The descriptor uses `reject-while-busy`. Repeated activation from the same or a
different adapter while `export.execution` is owned returns central
`not-executed/busy`; it opens no second confirmation/destination dialog, creates
no duplicate render/write, and emits no duplicate terminal feedback.

`export.execution` conflicts with `lifecycle.transition`, so New, Open, Save,
Save As, Close Project, Close Window, and Quit cannot replace/retire the session
or terminate the process while export owns resources. A lifecycle request may
be rejected as busy according to shared dispatch policy, but it cannot abandon
the operation. The exact presentation of a busy reason is not defined here.

`workspace.navigation` does not conflict after the immutable request exists.
Return Home/Resume may change visible presentation while the retained session
and export continue; that allowance depends on snapshot isolation and the
global feedback/focus boundaries. Ordinary project editing, including future
export-option changes, may continue when no modal policy forbids it. Such edits
affect the live revision and future exports only.

Success, cancellation, decline, preflight failure, render failure, encode
failure, destination/write/commit failure, and unexpected caught failure all
release every scope exactly once in `finally`. Busy state is ephemeral, never
serialized, never dirty, and never part of Undo/Redo.

## 13. Rendering, encoding, destination-write, and failure boundaries

Disc and Case renderers consume only their captured normalized snapshot. They
may share neutral render/domain helpers with preview, but preview pixels or DOM
layout are not automatically authoritative export pixels. Layer order and
geometry parity remain explicit contracts with focused tests.

Editor-only pixels are forbidden: preview overlays, preview zoom/pan, Guide
Legend, Design Check, focus/hover/selection outlines, drag handles, contextual
ribbon, sidebar, panel chrome, status/toasts, and modal UI. Exported proof guides
are the sole guide exception and require captured configuration.

The current frontend fully renders and encodes into memory before calling Rust.
This already prevents render/encode failure from beginning the direct native
write. It does **not** make overwrite safe: current `std::fs::write` can truncate
an existing destination before a later error.

Target destination safety invariant:

> An existing valid destination must not be knowingly replaced by a partial or
> invalid PNG. Success is reported only after the complete captured PNG is
> written/committed to the selected destination.

Implementation must determine and prove whether an export-specific
same-directory temporary-file/flush/replace primitive or another recoverable
mechanism is required. It must cover write, flush, replacement, collision,
cleanup, and failure injection. Windows same-volume replacement and overwrite
semantics require native verification; this contract does not invent atomicity
guarantees.

Issue #312 is scoped to **project-save** atomicity. A safe native primitive may
later be shared, but satisfying #312 does not automatically satisfy PNG export
destination safety, and PNG export must not adopt project baseline semantics.

Render, encode, and write remain distinguishable failure boundaries:

- renderer/canvas/asset failures -> `export.render-failed`;
- Blob/PNG conversion failures -> `export.encode-failed`;
- destination API/write failures before commit -> `export.write-failed`;
- final replacement/commit failures -> `export.commit-failed`;
- uncategorized boundary failures -> `export.unexpected`.

None may be reported as success or modify project path/baseline/dirty state.

## 14. Preview guides, exported guides, Guide Legend, and pixel exclusions

| Concept | Current source of truth | Persistence/dirty | Preview | PNG output |
| --- | --- | --- | --- | --- |
| Disc preview guides | Template-derived `guideOverlay` rendered by `DiscGuideOverlay` | Derived; non-dirty | Visible editor aid | Never implicitly |
| Disc exported guides | Four booleans in `SavedDiscProject.export.guides` | Serialized; canonical changes dirty | Not the preview-overlay visibility owner | Captured enabled center hole, outer edge, printable area, and safe zone draw last |
| Case preview guides | Active `CaseInsertPreviewLayout.guides` rendered by `CaseInsertGuideOverlay` | Derived; non-dirty | Layout guides render for editing | Never implicitly |
| Case exported guides | `ProjectJewelCaseState.export.guideIds`, selected through domain option groups | Serialized; canonical changes dirty | Does not toggle preview guide visibility | Captured supported IDs draw last |
| Guide Legend | `PreviewGuideLegendPanel` content plus local collapsed state | Derived/ephemeral; non-dirty | Preview-local, initially collapsed | Never |
| Design Check/preflight diagnostics | Pure/derived assessment helpers | Derived; non-dirty | May appear in editor/dialog feedback | Never pixels |

Disc exported-guide keys are `centerHole`, `outerEdge`, `printableArea`, and
`safeZone`. Current Case option groups are:

- Cover trim -> `frontTrimBounds`;
- Cover safe -> `frontSafeBounds`;
- Tray trim -> `backTrimBounds` plus `backPanelBounds`;
- Tray safe -> `backPanelSafeBounds`;
- Spine bounds -> `leftSpineBounds` plus `rightSpineBounds`;
- Spine safe -> `leftSpineSafeBounds` plus `rightSpineSafeBounds`.

Disc and Case adapters reuse their domain-owned geometry/style definitions; they
do not assume the domains share geometry. The current separation of preview
overlays from exported-guide settings is intentional. The current coverage gap
is not an implicit guide leak, but the absence of one shared typed diagnostic
and snapshot contract proving which captured guide values preflight summarized
and the renderer drew.

## 15. Disc and Case adapter contracts

The command selects an adapter after physical target resolution. Adapters do not
own dispatch, global busy state, native dialog order, feedback publication, or
project session mutation.

| Responsibility | Disc adapter | Case adapter |
| --- | --- | --- |
| Resolve target | Validate one Disc output plus normalized selected/custom template and dimensions | Resolve Cover Sheet or complete Tray Card from retained navigation/current compatibility pane; preserve spine-side initiating context without inventing a spine-only PNG |
| Build snapshot | Capture all normalized Disc render state, stable assets, design coordinates, four guide booleans, DPI, revision identity, and filename metadata | Capture complete active-pane Case state, shared metadata/branding sources, both spine owners for Tray, selected guide IDs, DPI, revision identity, and filename metadata |
| Preflight | Run Disc-specific geometry/content/guide/asset checks and return typed diagnostics | Run Cover/Tray-specific surface, slot, text, branding, guide, fit, readability, and spine checks and return typed diagnostics |
| Render | Render the complete circular label at physical export dimensions with clipping, outline, and center-hole cutout | Render the complete selected rectangular physical output at template dimensions; Tray includes back panel and both spine strips |
| Guides | Apply only captured Disc guide selection through Disc guide geometry | Apply only captured supported Case guide IDs through Case guide geometry |
| Pixel exclusions | Exclude DOM size, zoom/pan, selection, preview guides, legend, ribbon/sidebar, and toasts | Exclude navigation tabs, pane controls, selection, preview guides, legend, ribbon/sidebar, and toasts |
| Errors | Normalize target/snapshot/preflight/render/encode failures into shared codes; writer remains shared | Same; no adapter-local status messages |

Disc invalid custom dimensions may yield a preflight blocker and typed Disc
Template destination. The Disc geometry workflow contract retains ownership of
accessible field-level draft/commit validation and template-change recovery,
grounded in #307/#311. Export must not implement either policy or silently
repair values.

Case uses coarse persisted Cover/Tray compatibility and newer transient
Front/Back/Spine identity. The adapter must resolve from the authoritative
session/navigation model, not duplicate it. Final left/right-spine presentation,
Case pane-schema migration, and coordinated Case presets remain separate work.

## 16. Typed outcomes, global feedback, focus, and accessibility

The lifecycle contract's discriminated taxonomy is authoritative. The canonical
failure tag is `status: 'failure'` (the prose “failed outcome” refers to that
tag), not a parallel `failed` result.

```ts
type ExportPngSuccess = Readonly<{
  operationId: string
  sessionId: string
  projectRevision: number
  canonicalChangeId: string
  physicalTarget: ExportPhysicalTarget
  destination: string
  width: number
  height: number
  dpi: number
}>

type ExportPngResult = ApplicationCommandResult<ExportPngSuccess>
```

Outcome mapping:

| Outcome | Export meaning | Required payload/behavior |
| --- | --- | --- |
| `success` | Complete PNG commit succeeded | Resolved target, completed destination, operation/session/snapshot revision identity, dimensions, DPI |
| `cancelled` | Native destination chooser dismissed, or another dismissal classified by the shared taxonomy | Usually `file-dialog-dismissed`; no write and no failure feedback |
| `declined` | User did not authorize known warnings | `export-warning-not-authorized`; no destination chooser/write and no failure feedback |
| `failure` | Capability passed but a supported workflow stage could not complete | Stable code, safe user message, diagnostic/log context, recoverability, and structured preflight diagnostics where applicable |

Stable error-code families include:

- `export.unsupported-target`, `export.target-unresolvable`,
  `export.adapter-unavailable`;
- `export.snapshot-failed`;
- `export.preflight-failed`, `export.preflight-blocked`;
- `export.confirmation-failed`, `export.destination-failed`;
- `export.render-failed`, `export.encode-failed`;
- `export.write-failed`, `export.commit-failed`;
- `export.unexpected`.

The command returns one typed result. Preflight, renderer, encoder, native writer,
and presentation adapters must not publish their own competing terminal
messages.

Global feedback rules:

1. The application feedback boundary emits intentional feedback once.
2. Success identifies the physical output and destination meaningfully.
3. A blocker/failure is visible and programmatically announced from Home or
   either editor even when no preview toast stack is mounted.
4. Cancellation and decline are normal outcomes, not errors. Warning content is
   not repeated as a failure after decline.
5. Safe user copy and diagnostic logging remain separate; raw causes and native
   paths are not interpolated into UI without review.
6. Feedback never mutates project state or dirty status.

Custom confirmation follows shared modal focus rules. Native-dialog return uses
the typed focus router and supports an unmounted/disabled opener fallback. No
step depends on a selector, guessed label, coordinate, or stale element ref.
Future menu and shortcut adapters receive the same accessible outcome behavior.

## 17. Testable invariants and required future validation layers

Future implementation must make these invariants directly testable:

1. A blocker opens neither confirmation nor destination selection.
2. Warnings open exactly one aggregated confirmation.
3. A clean preflight skips confirmation.
4. Warning decline opens no destination chooser and writes nothing.
5. Destination cancellation writes nothing and returns `cancelled`.
6. Preflight always precedes warning confirmation and destination selection.
7. Render/encode/write starts only after destination selection.
8. Every stage consumes one immutable request identity.
9. Edits during an invocation do not alter that invocation's pixels and are not
   lost when it completes.
10. Success, failure, cancellation, and decline never change project path,
    baseline, revision, or dirty state.
11. Serialized export-option edits can change dirty state independently of
    executing export.
12. Disc and Case select the correct adapter and physical target.
13. Case Front maps to Cover; Back and either spine context map to the complete
    Tray Card, not separate Back/spine files.
14. Preview navigation, DOM size, zoom/pan, selection, focus, ribbon/sidebar,
    panels, Guide Legend, Design Check, and toasts cannot leak into pixels.
15. Guide Legend never affects output or dirty state.
16. Exported guides appear only when the captured configuration enables them.
17. Repeated activation cannot create overlapping dialogs, renders, or writes.
18. Every terminal/non-executed path releases busy ownership exactly once.
19. Feedback is emitted once through the application boundary and remains
    accessible after workspace navigation.
20. Render, encode, destination, write, and commit failures return stable typed
    failures.
21. An existing valid destination is not knowingly replaced by partial/invalid
    output.
22. A future menu, shortcut, Home affordance, and editor button produce
    semantically equivalent `export.png` behavior when capability is equivalent.
23. Focus returns to a compatible semantic opener/fallback after custom/native
    dialogs without stale DOM dependencies.
24. Export never becomes Save or an Undo/Redo content transaction.

Required validation layers are separate:

| Layer | Required coverage |
| --- | --- |
| Pure unit/contract tests | Target resolution; snapshot construction/identity; diagnostic IDs/severity; clean/warning/blocker policy; filename metadata; state classification |
| Command integration tests | Exact stage order; all cancellations/decline/failures; busy race/repeat dispatch; lifecycle conflict; one feedback projection; focus result |
| Snapshot isolation tests | Live edits during warning/native dialogs; no preflight/render revision mixing; stable assets/config/target |
| Renderer/parity tests | Disc/Case dimensions, content/layer order, no chrome, guide inclusion/exclusion, both Case physical outputs, issue #305 exact-bound coverage |
| Project parity tests | Serialized guide settings survive snapshot/restore and reach export; execution never changes project baseline/dirty/path |
| Native dialog/write tests | Preflight-before-dialog order, cancellation, overwrite interaction, failure injection, cleanup, complete commit, no partial replacement |
| Accessibility/focus tests | Warning modal initial focus/trap/Escape/close/opener restore; native-return fallback; feedback live semantics; #298 key ownership |
| Native Windows/Tauri acceptance | Real Tauri dialogs, focus handoff, repeated activation, filesystem replacement semantics, locked/disk-full/collision cases, actual Disc/Case PNG inspection |

Unit/integration tests cannot prove native Windows replacement semantics, native
dialog focus behavior, or visual PNG acceptance. Browser-only evidence cannot
establish native Tauri acceptance. The merged issue #302 checkpoint and this
shared-command checkpoint add focused Disc/Case sequencing, capability, busy,
typed-result, menu-routing, and feedback coverage; native acceptance remains a
separate required result.

## 18. Issue/dependency mapping, exclusions, and unresolved questions

### Issue and dependency relationships

| Issue/dependency | Relationship to this contract |
| --- | --- |
| [#302](https://github.com/thelordofdino4/steam-backup-label-studio/issues/302) | Closed after PR #332 merged the required preflight-before-destination ordering. Clean preflight skips confirmation and warnings receive one decision. |
| [#300](https://github.com/thelordofdino4/steam-backup-label-studio/issues/300) | Current Home feedback gap and shared global-feedback dependency; export must not rely on a preview-only toast host. |
| [#305](https://github.com/thelordofdino4/steam-backup-label-studio/issues/305) | Focused canvas helper exact-uncropped-bounds regression. It is renderer/helper correctness, not workflow ordering or write safety. |
| [#306](https://github.com/thelordofdino4/steam-backup-label-studio/issues/306) | Case Front/Back/Spine navigation discoverability and authoritative route context; does not create four physical PNG outputs. |
| [#307](https://github.com/thelordofdino4/steam-backup-label-studio/issues/307) | Disc custom-dimension field validation/accessibility owner; export may block invalid captured state and route to it. |
| [#308](https://github.com/thelordofdino4/steam-backup-label-studio/issues/308) | Lifecycle/session/path/baseline/dirty authority implemented first as the lifecycle contract; export consumes those semantics and never acts as Save. |
| [#309](https://github.com/thelordofdino4/steam-backup-label-studio/issues/309) | Shared modal focus-lifecycle dependency. Its picker implementation is not itself the export dialog, but its focus contract applies. |
| [#311](https://github.com/thelordofdino4/steam-backup-label-studio/issues/311) | Disc template-switch recovery owner; export does not decide or implement recovery. |
| [#312](https://github.com/thelordofdino4/steam-backup-label-studio/issues/312) | Project-save atomicity only. It may yield reusable native primitives, but does not already cover PNG export destination safety. |
| Lifecycle contract | Owns shared command/result/busy/feedback/session vocabulary and conflicts; this document specializes `export.png`. |
| Ownership reference | Owns `area.export`, `owner.export.workflow`, guide owners/control IDs, physical destinations, and presentation-adapter rules. |
| Project-file spec | Owns current Disc/Case export fields, including compatibility and migration decisions. |

All required issue bodies and their comment feeds were reviewed at the evidence
baseline; these issues had no comments. A search of open issues found no newer
focused owner for export preflight, cancellation, exported guides, export
feedback, PNG write safety, or export concurrency. The adjacent #306 navigation
issue is mapped above rather than misclassified as an export implementation.

### Explicit exclusions

This contract does not implement or decide:

- additional source/runtime work beyond the bounded shared-command checkpoint;
- final File/Export menu hierarchy, visual placement, label, icon, platform role,
  or keyboard shortcut;
- new feedback UI or modal component implementation;
- native dialog queue-versus-reject mechanics beyond one-owner/no-overlap
  semantics;
- project Save/Save As atomic replacement details under #312;
- recent export destinations, recent projects, batch/export-all, additional
  formats, print, or share;
- autosave, recovery, multi-document editing, or application Undo/Redo;
- final Game, Disc Template presentation, Layout Preset, Guided Start, or Case
  preset policy;
- Case pane-schema migration, final spine presentation, or issue #305's code fix;
- native/browser acceptance.

### Focused unresolved implementation/platform questions

These questions do not weaken the mandatory command ID, ordering, snapshot,
severity, result, guide, feedback, focus, busy, dirty, or safety invariants:

1. Which native export-write mechanism provides recoverable replacement, which
   flush/sync guarantees are required, and how Windows overwrite/collision and
   same-volume constraints are tested.
2. Whether stable asset bytes are captured eagerly or through another proven
   immutable operation-owned asset reference.
3. How Disc background offsets are normalized so late preview DOM width is no
   longer an export input.
4. The complete stable diagnostic ID catalog and exact typed configuration
   destinations for every blocker/warning.
5. The central filename sanitizer, native path identity rules, and user-facing
   path redaction policy.
6. Whether serialized Case `export.surfaces` gains reviewed future semantics or
   is deprecated/migrated; it does not control current `export.png`.
7. Final Case left/right-spine presentation and pane migration, while both keep
   mapping to the current complete Tray Card physical output.
8. Exact feedback retention/presentation and the safe focus fallback hierarchy.
