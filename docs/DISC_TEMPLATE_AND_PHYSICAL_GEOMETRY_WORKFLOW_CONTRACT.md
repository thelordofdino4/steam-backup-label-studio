# Disc Template And Physical Geometry Workflow Contract
> Status: Draft target-state normative contract.
> Purpose: Define the authoritative target workflow for choosing Disc templates, drafting and validating custom physical dimensions, planning geometry-dependent layout changes, applying them atomically, and recovering the prior valid layout.
> Read when: Disc template selection, custom-dimension editing, physical geometry validation, template-switch layout preservation, Disc preview/export geometry, geometry-related dirty/history behavior, or issue #307/#311 work.
> Authoritative source: This document for target Disc template and physical-geometry workflow semantics; current source and the SDD remain authoritative for as-built behavior; `TEMPLATE_SPEC.md` and `PROJECT_FILE_SPEC.md` retain their data/schema authority.
> Last reviewed against commit: `f750a5c4b8721e6de4912a9be5ef26a05cddab5e`.

## 1. Status, Scope, And Authority

**TARGET REQUIREMENT —** This is a proposed **draft target-state normative
contract**. It specifies behavior future implementation must satisfy. It does
not claim that the draft model, immutable geometry plan, atomic multi-owner
commit, revision-scoped restore action, or history integration exists today.

**TARGET REQUIREMENT —** This contract owns the application-level workflow for:

- choosing a built-in or Custom Disc template candidate;
- editing raw custom-dimension drafts without mutating the project;
- parsing and validating physical geometry;
- retaining the last valid draft and the valid committed geometry;
- producing a complete immutable impact plan;
- reviewing, cancelling, applying, and recovering a Disc geometry change;
- coordinating geometry-dependent feature owners without taking over their
  calculations; and
- projecting geometry-specific typed outcomes, feedback, and focus behavior.

**TARGET REQUIREMENT —** Authority is divided as follows.

| Claim class | Concern | Authority |
| --- | --- | --- |
| **TARGET REQUIREMENT** | Disc template choice, custom-dimension draft/validation timing, immutable geometry plan, atomic geometry apply, and one-step geometry recovery | This contract |
| **TARGET REQUIREMENT** | One active project session, snapshot/baseline/path/revision/dirty state, shared command/result vocabulary, global feedback, and future history service | [`APPLICATION_COMMAND_AND_PROJECT_LIFECYCLE_CONTRACT.md`](APPLICATION_COMMAND_AND_PROJECT_LIFECYCLE_CONTRACT.md) |
| **TARGET REQUIREMENT** | Control classification, semantic owner/control IDs, destinations, presentation adapters, and focus navigation | [`EDITOR_NAVIGATION_AND_CONTROL_OWNERSHIP.md`](EDITOR_NAVIGATION_AND_CONTROL_OWNERSHIP.md) |
| **TARGET REQUIREMENT** | Export orchestration, preflight, immutable export request, output target, encoding, and destination write | [`EXPORT_WORKFLOW_CONTRACT.md`](EXPORT_WORKFLOW_CONTRACT.md) |
| **TARGET REQUIREMENT** | Game search/import/metadata behavior and Game-owned proposals | [`GAME_SEARCH_IMPORT_AND_METADATA_WORKFLOW_CONTRACT.md`](GAME_SEARCH_IMPORT_AND_METADATA_WORKFLOW_CONTRACT.md) |
| **TARGET REQUIREMENT** | Exact serialized fields, project validation, migration, normalization, and compatibility | [`PROJECT_FILE_SPEC.md`](PROJECT_FILE_SPEC.md) |
| **TARGET REQUIREMENT** | Persisted template vocabulary, built-in values, units, and exact template data shape | [`TEMPLATE_SPEC.md`](TEMPLATE_SPEC.md), `src/types/template.ts`, and `src/templates/discTemplates.ts` |
| **TARGET REQUIREMENT** | Disc calculations, bounds, transforms, safe-annulus policies, clamp/reflow math, preview geometry, and render math | Existing focused Disc geometry, layout-owner, preview, and export modules identified by the SDD |
| **TARGET REQUIREMENT** | Application-level Disc Layout Preset selection, compatibility, plan, atomic apply/reapply/detach, configuration, and customization | [`DISC_LAYOUT_PRESET_WORKFLOW_CONTRACT.md`](DISC_LAYOUT_PRESET_WORKFLOW_CONTRACT.md) |
| **TARGET REQUIREMENT** | Layout-preset definition/role vocabulary and Guided identity/progress | [`ROLE_BASED_PRESET_MODEL.md`](ROLE_BASED_PRESET_MODEL.md), [`GUIDED_PRESET_SLOT_MODEL.md`](GUIDED_PRESET_SLOT_MODEL.md), and their focused owners |
| **TARGET REQUIREMENT** | Case template types, Case physical surfaces, and Case navigation | Case template/surface owners, the ownership reference, and the project-file specification; not this contract |

**TARGET REQUIREMENT —** A more specific owner wins inside its concern. This
contract decides when a valid candidate may become committed Disc geometry and
how all impacts are coordinated. It must call Disc owners for calculations; it
must not clone their clamp math, renderer rules, source-selection rules, or
serialized representations into a geometry workflow module.

**TARGET REQUIREMENT —** This contract does not add project-file fields, define
a final menu or panel design, redefine Case behavior, make presets implicit, or
authorize export to repair invalid geometry.

## 2. Claim Classes And Terminology

**TARGET REQUIREMENT —** Every substantive statement in this document is one of
these classes.

| Claim class | Meaning |
| --- | --- |
| **CURRENT FACT** | Verified at the reviewed commit in source, focused tests, authoritative current-state documentation, or the named GitHub issue evidence. |
| **TARGET REQUIREMENT** | Normative behavior that future implementation must satisfy. |
| **FUTURE EXTENSION** | Permitted later behavior outside the required first implementation. |
| **OPEN QUESTION** | A decision deliberately left to the named authority and not safely resolvable by implementation convenience. |

**TARGET REQUIREMENT —** The semantic vocabulary is:

| Term | Meaning |
| --- | --- |
| **Committed geometry** | The valid template identity and physical dimensions in canonical project state. Preview, save, and export consume this geometry. |
| **Candidate** | A built-in template or custom physical geometry the user is considering. It is not project state. |
| **Raw draft** | The user's exact custom input strings, including temporarily empty or incomplete values. |
| **Parsed draft** | Numeric values produced from a raw draft without silently repairing invalid input. |
| **Last valid draft** | The most recent intrinsically valid custom candidate in the current session. It is not necessarily applicable to current owner content and is not automatically committed. |
| **Last valid committed geometry** | The current canonical geometry, which remains active until an atomic apply succeeds. |
| **Geometry plan** | A deeply immutable before/after transaction proposal containing all owner impacts, diagnostics, and freshness identity. |
| **Owner impact** | One feature owner's exact `preserve`, `clamp`, `reflow`, `invalidate-transient`, or `blocked` result for the candidate. |
| **Content** | User values, rich text, imported/uploaded assets, source/provenance choices, styles, visibility/enabled state, item identity, and item order. |
| **Placement** | Geometry-dependent layout fields such as coordinates, scale, size intent, wrap/arc geometry, or group bounds. |
| **Recovery token** | Session-only inverse transaction data for the immediately applied geometry change, valid only at its recorded revision. |

## 3. Evidence-Backed Current-State Baseline

**CURRENT FACT —** The reviewed implementation is safe enough to serve as the
source baseline, but it does not yet satisfy this target contract.

| Claim class | Current behavior | Evidence and consequence |
| --- | --- | --- |
| **CURRENT FACT** | `TemplatePanel` binds five number inputs directly to committed custom-template numeric values. | `src/components/sidebar/TemplatePanel.tsx`; there is no raw-string draft, field diagnostic, Apply, Cancel, or Restore model. |
| **CURRENT FACT** | Choosing a template commits `selectedDiscTemplateId` immediately and then requests foreground clamps. | `src/hooks/useDiscTemplate.ts` and `src/templates/discTemplateStateModel.ts`. |
| **CURRENT FACT** | Editing a custom field normalizes on every change; when Custom is active, an accepted value commits immediately and requests clamps. | `updateCustomDiscTemplateDimension` and `normalizeCustomDiscTemplate`. |
| **CURRENT FACT (gap)** | Non-finite/non-positive input leaves prior state without specific inline explanation; out-of-range and cross-field values can be silently clamped into another value. | `discTemplateStateModel.ts`, `geometry.ts`, and issue [#307](https://github.com/thelordofdino4/steam-backup-label-studio/issues/307). |
| **CURRENT FACT (gap)** | The guardrail returns a generic blocking-element status, not field-specific or cross-field diagnostics. | `discTemplateGeometryGuardrail.ts` and `templateModel.test.ts`. |
| **CURRENT FACT (gap)** | One App-level callback invokes eight independent setter-based clamp paths in sequence: logos, title artwork, additional artwork, rating, media, platform, technical, and Disc text. | `clampForegroundElementLayoutsToTemplate` in `src/app/App.tsx`. The transition is not represented as one reviewable immutable owner plan. |
| **CURRENT FACT** | The clamp helpers preserve enclosing owner data and primarily replace geometry-dependent layouts; Disc text's switch clamp compares x/y changes. | Feature hooks and `src/layout/discElementSafeZone.ts`. |
| **CURRENT FACT (gap)** | The current geometry guardrail covers enabled straight text and selected enabled logo/mark families, but it is not a complete transaction plan for every visual owner. | `src/layout/discTemplateGeometryGuardrail.ts` and its tests. |
| **CURRENT FACT** | Background artwork and Steam banner state are not part of the template-switch clamp callback. Disc-number badge mode reuses the Disc-number text layout. | `App.tsx`, `useDiscTextState.ts`, and `discNumberArtwork.ts`. |
| **CURRENT FACT** | The transient active preset stores a template-resolved definition, but template change does not explicitly clear or re-resolve it. | `useActiveDiscPreset.ts`, `useDiscTemplate.ts`, and `App.tsx`. |
| **CURRENT FACT** | Save persists the selected template ID and persists custom dimensions only when Custom is selected; restore rebuilds/normalizes selected geometry and clamps feature layouts. | `createProjectSnapshot.ts`, `restoreProjectState.ts`, and project restore tests. |
| **CURRENT FACT** | Project-file validation is intentionally shallow around nested custom dimensions. | `projectSchema.ts` and the SDD's save/load known risks. |
| **CURRENT FACT** | Disc export computes content pixels from outer diameter at 300 DPI, clips to the outer circle, removes the physical center hole, and derives print/safe guides as ratios. | `geometry.ts`, `exportPng.ts`, `drawExportGuides.ts`, and `exportPreflight.ts`. |
| **CURRENT FACT** | The visible Disc preview uses committed template-derived guide ratios and the same owner state used by export, while its screen diameter is a zoomed representation rather than literal physical size. | `DiscPreview.tsx`, `DiscGuideOverlay.tsx`, and the SDD parity contract. |

**CURRENT FACT —** Focused tests establish normalization, deferred clamping when
Custom is not active, immediate clamp targeting when it is active, generic
guardrail rejection, guide ratios, export pixel sizing, owner safe-zone clamps,
project restore, and preset/template resolution. They do not establish the
target draft/plan/apply/recover transaction.

## 4. Physical Geometry Vocabulary And Intrinsic Invariants

**TARGET REQUIREMENT —** The exact template data vocabulary remains owned by
`TEMPLATE_SPEC.md` and source. The first workflow implementation edits only the
five physical values already exposed by the Disc Template controls.

| Claim class | Field | Physical meaning | Required V1 intrinsic relation |
| --- | --- | --- | --- |
| **CURRENT FACT** | `outerDiameterMm` | Physical outside edge and Disc content diameter | Finite; `20 <= value <= 305` under the current domain limit |
| **CURRENT FACT** | `physicalCenterHoleDiameterMm` | Actual blank/cut-out hole | Finite; `0 <= value <= outerDiameterMm - 1` |
| **CURRENT FACT** | `innerHoleDiameterMm` | Inner boundary of the printable annulus | Finite; `physicalCenterHoleDiameterMm <= value <= outerDiameterMm - 1` |
| **CURRENT FACT** | `printableDiameterMm` | Outer boundary of the printable annulus | Finite; `innerHoleDiameterMm <= value <= outerDiameterMm` |
| **CURRENT FACT** | `safeDiameterMm` | Advisory outer boundary for important foreground content | Finite; `innerHoleDiameterMm <= value <= printableDiameterMm` |

**TARGET REQUIREMENT —** Until the data authority intentionally changes these
relations, draft validation must report violations rather than feed them through
`normalizeCustomDiscTemplate` and present the normalized result as the user's
input. Silent coercion is allowed only for non-semantic display cleanup that
does not change the numeric value.

**TARGET REQUIREMENT —** `id`, `name`, `type`, `units`, optional bleed, zones,
guides, masks, and notes remain canonical template data. They are not made
user-editable merely because `SavedDiscProject.template.customDimensions`
currently stores a `DiscTemplate` object. A custom candidate is built through
the template/domain owner so identity and non-editable fields cannot drift.

**TARGET REQUIREMENT —** Validation occurs in this order:

1. raw-value presence and parseability;
2. finite-number and scalar-range validation;
3. complete cross-field ordering validation;
4. candidate construction through the template data owner;
5. owner-by-owner layout feasibility planning; and
6. preview/export consistency checks over the planned after-state.

**TARGET REQUIREMENT —** Intrinsic invalidity and project-content incompatibility
are different. A geometrically valid candidate may still produce a blocked plan
because an enabled owner cannot be placed safely without a prohibited content
change.

## 5. Target State Model And State Lifetimes

**TARGET REQUIREMENT —** The workflow maintains these conceptual states. Exact
implementation types may differ if all semantics remain explicit.

```ts
type DiscGeometryWorkflowState = Readonly<{
  candidateTemplateId: SelectedDiscTemplateId
  rawCustomDraft: Readonly<Record<DiscGeometryField, string>>
  parsedCustomDraft: Readonly<Partial<Record<DiscGeometryField, number>>>
  draftDiagnostics: readonly DiscGeometryDiagnostic[]
  lastValidDraft: DiscGeometryCandidate | null
  currentPlan: DiscGeometryPlan | null
  recovery: DiscGeometryRecoveryToken | null
}>
```

| Claim class | State | Lifetime | Persisted | Dirty |
| --- | --- | --- | --- | --- |
| **TARGET REQUIREMENT** | Committed template identity and custom dimensions | Canonical project | As defined by project-file spec | Derived against baseline |
| **TARGET REQUIREMENT** | Geometry-dependent owner layouts after apply | Canonical project | Through their existing owner fields | Derived against baseline |
| **TARGET REQUIREMENT** | Candidate choice, raw/parsed draft, diagnostics, last valid draft | Current editor session | No | No |
| **TARGET REQUIREMENT** | Immutable plan and review state | One plan attempt | No | No |
| **TARGET REQUIREMENT** | Recovery token | Current session and exact post-apply revision | No | No by itself |
| **TARGET REQUIREMENT** | Preview guides/output summary | Derived | No | No |
| **TARGET REQUIREMENT** | Active preset resolved definition | Transient preset owner | No | No |

**TARGET REQUIREMENT —** Raw draft strings must permit ordinary in-progress
editing states such as an empty field, a leading minus sign, or a trailing
decimal separator. Those states may be `incomplete` or `invalid`; neither may
mutate committed geometry or cause visible preview/export state to snap back.

**TARGET REQUIREMENT —** When Custom is opened, the draft initializes from the
most recent session-valid custom draft, otherwise from committed custom geometry,
otherwise from the template owner's canonical custom defaults. Merely opening,
choosing, correcting, or discarding a draft does not modify the project.

## 6. Exact Operation Registry And Ownership

**TARGET REQUIREMENT —** These stable semantic operations define the first
target workflow. Presentation controls call them; they do not reproduce their
logic.

| Claim class | Operation | Kind | Effect |
| --- | --- | --- | --- |
| **TARGET REQUIREMENT** | `disc.template.choose` | Session/domain | Select a built-in or Custom candidate and initialize/reveal its draft; never commit project geometry. |
| **TARGET REQUIREMENT** | `disc.geometry.draft.update` | Session/domain | Preserve the raw value, parse all fields, return field/cross-field diagnostics, and update `lastValidDraft` only when intrinsically valid. |
| **TARGET REQUIREMENT** | `disc.geometry.draft.discard` | Session/domain | Discard uncommitted edits and restore draft controls from the valid committed/session baseline. |
| **TARGET REQUIREMENT** | `disc.geometry.plan` | Pure or snapshot-bound domain workflow | Produce `no-change`, `ready`, or `blocked` from one canonical project revision and candidate. No project setter may run. |
| **TARGET REQUIREMENT** | `disc.geometry.apply` | Exclusive project mutation | Revalidate freshness and atomically commit exactly the ready plan's after-state. |
| **TARGET REQUIREMENT** | `disc.geometry.restore` | Exclusive project mutation | Apply the exact inverse of the immediately preceding geometry apply when its recovery token is still current. |

**TARGET REQUIREMENT —** `disc.geometry.apply` and `disc.geometry.restore` use the
lifecycle contract's application-command envelope, dispatch capability checks,
four outer outcomes, busy arbitration, global feedback, revision, dirty, and
history boundaries. Synchronous draft operations use focused domain results and
must not invent a second global result taxonomy.

**TARGET REQUIREMENT —** The ownership reference remains authoritative for
control IDs and destinations. The existing selector and five dimension-control
destinations remain stable. Any future Apply, Discard, review, or Restore control
must be registered there before implementation rather than using an arbitrary
DOM ID as semantic identity.

## 7. Draft Validation, Diagnostics, And Last-Valid Behavior

**TARGET REQUIREMENT —** Draft updates return a discriminated result that keeps
raw values and diagnostics first-class.

```ts
type DiscGeometryDraftResult =
  | { status: 'incomplete'; rawDraft: DiscGeometryRawDraft; diagnostics: readonly DiscGeometryDiagnostic[] }
  | { status: 'invalid'; rawDraft: DiscGeometryRawDraft; diagnostics: readonly DiscGeometryDiagnostic[] }
  | { status: 'valid'; rawDraft: DiscGeometryRawDraft; candidate: DiscGeometryCandidate }

type DiscGeometryDiagnostic = Readonly<{
  code: string
  field: DiscGeometryField
  relatedFields?: readonly DiscGeometryField[]
  message: string
  recovery: string
}>
```

**TARGET REQUIREMENT —** Stable diagnostic families include at least:

| Claim class | Condition | Diagnostic behavior | Recovery behavior |
| --- | --- | --- | --- |
| **TARGET REQUIREMENT** | Empty/partial raw value | Identify the exact field as incomplete | Keep raw text and focus; do not announce a failure toast per keystroke |
| **TARGET REQUIREMENT** | Non-numeric or non-finite value | Identify the exact field and required millimeter number | Keep raw text; correction clears that field's resolved diagnostic |
| **TARGET REQUIREMENT** | Scalar below/above allowed limit | Name the field and exact accepted range | Offer field-specific correction/reset; never silently clamp |
| **TARGET REQUIREMENT** | Center hole exceeds inner boundary | Associate the error with both fields and state the required ordering | User may correct either field; do not guess which one they intended |
| **TARGET REQUIREMENT** | Inner boundary exceeds printable/safe/outer bounds | Identify every related field needed to understand the conflict | Preserve all raw values while the user edits them into a valid combination |
| **TARGET REQUIREMENT** | Safe diameter exceeds printable diameter | Explain that safe is advisory but must remain inside the printable boundary | Keep committed geometry active |
| **TARGET REQUIREMENT** | Candidate is intrinsically valid but an owner cannot fit | Produce a plan blocker naming the semantic owner and reason | Retain the valid draft; allow correction, content adjustment outside the workflow, or discard |

**TARGET REQUIREMENT —** `lastValidDraft` advances only after all five fields
form an intrinsically valid candidate. Invalid edits never overwrite it. The
committed geometry remains the visual/export source of truth until Apply
succeeds, so the app always has a usable last-valid active state.

**TARGET REQUIREMENT —** A field-level Reset restores that field from the last
valid draft while preserving other raw fields. Discard restores the complete
draft and candidate choice from the committed/session baseline. Neither action
changes canonical project state.

**TARGET REQUIREMENT —** Blur may format a valid value for display, but blur
must not commit geometry. Enter may request `disc.geometry.plan` when the draft
is valid; it must not bypass review or atomic apply when owner impacts exist.

## 8. Normative Choose, Plan, Review, And Apply Sequence

**TARGET REQUIREMENT —** The target sequence is:

```text
choose candidate
  -> edit raw Custom draft when applicable
  -> parse + intrinsic validation
  -> retain valid candidate or show recoverable diagnostics
  -> capture project revision and ask every affected owner for an impact
  -> immutable no-change / blocked / ready plan
  -> review geometry and owner impacts
  -> cancel with project unchanged OR atomically apply exact after-state
  -> publish one result and expose revision-scoped Restore
```

| Claim class | Stage | Allowed next state | Canonical project effects | Failure/cancel behavior |
| --- | --- | --- | --- | --- |
| **TARGET REQUIREMENT** | Choose built-in | Candidate ready for planning | None | Return to committed choice |
| **TARGET REQUIREMENT** | Choose Custom | Draft visible | None | Discard restores baseline draft/choice |
| **TARGET REQUIREMENT** | Update draft | Incomplete, invalid, or valid | None | Keep exact raw input and committed preview |
| **TARGET REQUIREMENT** | Plan | `no-change`, `blocked`, or `ready` | None | Diagnostics remain actionable; no setters/dirty/revision |
| **TARGET REQUIREMENT** | Review ready plan | Apply or cancel | None | Cancel/dismiss returns lifecycle `cancelled`; project remains byte-for-byte equivalent |
| **TARGET REQUIREMENT** | Apply | Success or failure | One atomic canonical transition on success | Stale/block/failure commits nothing |
| **TARGET REQUIREMENT** | Restore | Success or unavailable/failure | One atomic inverse transition on success | Unavailable/stale token commits nothing |

**TARGET REQUIREMENT —** A plan with no geometry or owner-state difference
returns `no-change`, closes any transient review, creates no recovery token,
does not increment revision/history, and does not make the project dirty.

**TARGET REQUIREMENT —** A change that affects no movable owner still requires
an explicit Apply because it changes physical output dimensions. Review may be
compact, but candidate selection itself is never the commit gesture.

## 9. Immutable Geometry Plan Contract

**TARGET REQUIREMENT —** A ready plan contains all information needed to commit
without recomputing from later live state.

```ts
type DiscGeometryPlan = Readonly<{
  planId: string
  sessionId: string
  baseRevision: number
  baseCanonicalChangeId: string
  candidateSource: 'built-in' | 'custom'
  beforeTemplate: DiscTemplate
  afterTemplate: DiscTemplate
  outputSummary: DiscPhysicalOutputSummary
  ownerImpacts: readonly DiscGeometryOwnerImpact[]
  presetTransition: DiscPresetGeometryTransition
  warnings: readonly DiscGeometryDiagnostic[]
  blockers: readonly DiscGeometryDiagnostic[]
  beforeProjectSlice: Readonly<DiscGeometryTransactionSlice>
  afterProjectSlice: Readonly<DiscGeometryTransactionSlice>
}>
```

**TARGET REQUIREMENT —** The plan is deeply immutable and records:

- exact before/after template identity and all physical fields;
- Disc content pixel diameter at the current canonical export DPI;
- exact affected owner IDs and changed placement fields;
- every preserved content/source/enabled field needed to prove preservation;
- owner warnings and blockers in deterministic order;
- active preset/guided transient-resolution disposition;
- session, revision, and canonical-change freshness identity; and
- exact before/after transaction slices sufficient for commit and inverse
  recovery.

**TARGET REQUIREMENT —** Planning reads one canonical snapshot. Owner adapters
must be pure over that snapshot and the candidate. They return proposed owner
state; they do not call React setters, mutate refs, announce status, navigate,
open dialogs, write files, or update dirty/history.

**TARGET REQUIREMENT —** `disc.geometry.apply` rechecks session ID, revision,
canonical change identity, candidate identity, and required owner/asset
readiness immediately before commit. Any mismatch returns a recoverable
`disc-geometry.stale-plan` failure and offers regeneration; it never applies
part of an obsolete plan.

## 10. Atomic Application And Content-Preservation Invariants

**TARGET REQUIREMENT —** Apply is one project transaction. The template identity,
custom template when selected, every changed owner layout, and required transient
preset transition become visible together. There is no intermediate render in
which new physical geometry is paired with old unsafe placement or vice versa.

**TARGET REQUIREMENT —** The implementation may use a reducer, transaction
coordinator, or another focused commit boundary. It must not implement atomicity
as a sequence of unrelated feature setters in `App.tsx` with observable partial
states.

**TARGET REQUIREMENT —** Geometry changes preserve content. Unless the review
explicitly names a future separately authorized content operation, apply must
not:

- change enabled/disabled visibility;
- clear, replace, or reselect an uploaded/imported/built-in asset;
- change image provenance, source IDs, source labels, or custom-image choices;
- change text values, HTML/rich source, metadata/manual source, style, alignment,
  or Disc-number mode;
- add, remove, reorder, or rename additional assets/elements;
- change metadata, Steam selection, branding copy/colors, or export-guide
  configuration; or
- silently apply/reset a layout preset or Guided completion/omission state.

**TARGET REQUIREMENT —** If a valid candidate cannot accommodate an enabled
owner without a prohibited content change, the owner returns `blocked`. The
workflow must not disable, hide, shrink below the owner's allowed minimum,
discard content, or retain invalid active geometry as an escape hatch.

**TARGET REQUIREMENT —** Disabled owner state is preserved too. Dormant layouts,
assets, selections, and custom settings participate in deterministic planning
when needed for safe re-enablement, but disabling remains unchanged.

## 11. Complete Owner-Participation Matrix

**TARGET REQUIREMENT —** Planning must enumerate every applicable Disc owner,
including disabled and repeated items. “Not currently clamped” is an explicit
`preserve` impact, not permission to omit the owner from the plan.

| Claim class | Owner family | Required content behavior | Allowed geometry behavior | First-target disposition |
| --- | --- | --- | --- | --- |
| **TARGET REQUIREMENT** | Background artwork | Preserve enabled, asset, source, size, scale, and offset | Re-evaluate physical crop/coverage; change nothing unless a future reviewed owner policy authorizes it | `preserve` plus warning/blocker when owner policy requires |
| **TARGET REQUIREMENT** | Steam banner/lockup | Preserve placement, colors, lockup source/size/layout, fallback mode/text | Recompute derived render geometry only; no implicit side switch/reset | `preserve` |
| **TARGET REQUIREMENT** | Title/logo artwork | Preserve enabled/source/asset/size | Clamp owner placement with its authoritative visual bounds | `preserve` or `clamp`; `blocked` if impossible |
| **TARGET REQUIREMENT** | Additional artwork, every element and frame | Preserve collection identity/order, assets, sources, enabled state, frame settings | Clamp each owner layout independently and deterministically | `preserve` or `clamp`; `blocked` if impossible |
| **TARGET REQUIREMENT** | Developer/publisher and all additional logos | Preserve all assets, provenance, source choices, order, enabled state | Clamp every layout using each rendered asset's bounds | `preserve` or `clamp`; `blocked` if impossible |
| **TARGET REQUIREMENT** | Primary and supplemental rating badges | Preserve systems, values, sources, themes, images, enabled state | Clamp each rendered badge independently | `preserve` or `clamp`; `blocked` if impossible |
| **TARGET REQUIREMENT** | Media mark | Preserve value/source/theme/custom image/enabled state | Clamp authoritative rendered bounds | `preserve` or `clamp`; `blocked` if impossible |
| **TARGET REQUIREMENT** | Platform/operating-system marks | Preserve values, inference/source/theme/custom assets/order/enabled state | Clamp group and member layouts through owner policy | `preserve`, `clamp`, or owner-defined deterministic `reflow`; `blocked` if impossible |
| **TARGET REQUIREMENT** | Technical marks, including additional assets | Preserve values, sources, assets, order, enabled state | Clamp group/member layouts through owner policy | `preserve`, `clamp`, or owner-defined deterministic `reflow`; `blocked` if impossible |
| **TARGET REQUIREMENT** | Every Disc text key, straight or curved | Preserve enablement, value, source, HTML, style, alignment, arc side, avoidance policy | Clamp/reflow only through text-owner measurements and rules shared by preview/export | `preserve`, `clamp`, or explicitly reported `reflow`; `blocked` if impossible |
| **TARGET REQUIREMENT** | Disc-number badge artwork | Preserve mode and badge set | Use the Disc-number text layout owner and badge rendered bounds | Same impact as its shared Disc-number placement |
| **TARGET REQUIREMENT** | Preview/export guides and design check | Preserve explicit export-guide selection | Re-derive guide ratios and diagnostics from after-template | Derived; no canonical owner mutation |
| **TARGET REQUIREMENT** | Active preset/guided transient geometry | Preserve stable preset/guided identity and progress | Re-resolve or deactivate transient definition without applying preset placements | `invalidate-transient` followed by declared re-resolution result |

**TARGET REQUIREMENT —** New Disc visual owners must register a geometry-plan
adapter or an explicit geometry-independent declaration before they may ship.
An unclassified owner makes planning `blocked` with
`disc-geometry.owner-unavailable`; it is not silently skipped.

## 12. Deterministic Clamp And Reflow Protocol

**TARGET REQUIREMENT —** This workflow coordinates owner calculations but does
not own them. Each owner adapter receives the same committed snapshot, candidate
template, and stable render/measurement inputs and returns one immutable impact.

**TARGET REQUIREMENT —** Determinism requires:

1. a stable owner order from a registry, never incidental React setter order;
2. stable item order from canonical owner IDs, never DOM order;
3. the same content bounds/shape semantics used by visible preview and export;
4. one canonical percentage/mm conversion and rounding policy from Disc geometry;
5. no reads from mutable DOM position, transient hover/selection, or viewport
   zoom/pan;
6. no dependence on whether an optional control is currently visible; and
7. equal input snapshots producing structurally equal plans and diagnostics.

**TARGET REQUIREMENT —** A `clamp` may change only the placement fields its owner
declares. A `reflow` may change a geometry-dependent grouping/wrap/arc result
only when that behavior already belongs to the owner, is listed field-by-field
in review, and is consumed identically by preview, save/load, and export.
Neither disposition authorizes content rewriting.

**TARGET REQUIREMENT —** Owners first attempt exact preservation. If it remains
valid, the plan records `preserve`. Otherwise they compute the smallest allowed
deterministic adjustment. If multiple equally valid placements exist, the owner
uses a documented stable tie-breaker such as minimum displacement followed by
canonical axis/item order; it must not rely on random or iteration-dependent
choice.

**TARGET REQUIREMENT —** A safe zone remains advisory with respect to physical
PNG cropping: export is not cropped at `safeDiameterMm`. Individual foreground
owners may still use the safe annulus as their placement policy. The plan must
not conflate the physical outer edge, physical center cutout, printable annulus,
and owner safety boundary.

## 13. Recovery, Cancellation, And Switching Back

**TARGET REQUIREMENT —** Cancelling or dismissing plan review leaves candidate
drafts available but leaves the canonical project, revision, history, dirty
state, preview, and export snapshot unchanged. It returns the lifecycle
`cancelled` outcome, not a failure.

**TARGET REQUIREMENT —** Every changed successful apply creates one
session-only recovery token containing the exact inverse transaction and:

- the originating plan ID;
- the post-apply session ID, revision, and canonical change identity;
- the before/after templates and affected owner slices; and
- a user-facing description of what Restore will reverse.

**TARGET REQUIREMENT —** The success feedback exposes one clear Restore action.
`disc.geometry.restore` is available only while the active session and current
revision exactly match the token. Any later canonical project mutation,
project replacement, load, reset, workspace exit, or successful restore
invalidates it. Draft-only edits do not invalidate it.

**TARGET REQUIREMENT —** Restore applies the exact inverse snapshot; it does not
switch the template and then run today's clamps in reverse. A successful restore
is one new canonical revision/history transaction and recovers the exact prior
template and owner placements, including disabled state. It may make derived
dirty state clean when the recovered canonical snapshot equals the baseline.

**TARGET REQUIREMENT —** If the recovery token is stale or missing, return
recoverable `disc-geometry.restore-unavailable` without mutation and direct the
user to plan the desired template again. Do not overwrite intervening work.

**FUTURE EXTENSION —** A full lifecycle undo/redo service may subsume the
one-step Restore presentation. Template-keyed long-lived placement snapshots
may be considered later, but they require explicit persistence/lifetime and
merge rules. They are not part of the first target and must not become a
parallel authoritative placement store.

## 14. Lifecycle, Persistence, Dirty State, And History

**TARGET REQUIREMENT —** The lifecycle contract owns the canonical baseline,
revision, dirty derivation, command outcomes, feedback publication, and future
history service. This workflow supplies one canonical before/after change to it.

| Claim class | Outcome | Revision/history | Dirty/baseline | Persistence effect |
| --- | --- | --- | --- | --- |
| **TARGET REQUIREMENT** | Choose/draft/validate/plan/review | None | None | None |
| **TARGET REQUIREMENT** | Invalid/blocked/stale/failure/cancelled | None | None | None |
| **TARGET REQUIREMENT** | No-change plan/apply | None | None | None |
| **TARGET REQUIREMENT** | Successful changed apply | Exactly one revision and one history transaction | Dirty remains derived; baseline unchanged | Next Save snapshots committed template and owner state through existing schema |
| **TARGET REQUIREMENT** | Successful Restore | Exactly one new revision and one history transaction | Dirty recomputed; may become clean | Next Save snapshots restored canonical state |

**TARGET REQUIREMENT —** Project JSON stores only fields already owned by
`PROJECT_FILE_SPEC.md`: the committed selected template/custom dimensions and
the committed owner layouts/content. Raw drafts, diagnostics, plans, review
state, last-valid session draft, recovery token, transient resolved preset, and
history bookkeeping are not serialized by this contract.

**TARGET REQUIREMENT —** New constructs a valid default Disc project and Open
restores/normalizes a complete saved project through lifecycle/project-file
adapters. Those full-session replacement flows do not simulate interactive
template selection. Invalid saved-data policy remains with project schema and
normalization; Open must not present a partially activated invalid geometry.

**TARGET REQUIREMENT —** Save and Export may proceed only from valid committed
geometry. An invalid raw draft is not project invalidity and does not alter the
snapshot they capture. The UI must make clear that the draft is unapplied.

## 15. Preview, Export, And Physical-Output Parity

**TARGET REQUIREMENT —** Before Apply, the visible final preview and all export
operations continue to use committed geometry. A future candidate ghost/compare
view may exist only if clearly labeled non-final, excluded from export, and
unable to masquerade as the renderer source of truth.

**TARGET REQUIREMENT —** After Apply, preview and export observe the same atomic
after-state. Both must agree on:

| Claim class | Geometry concept | Preview behavior | Export behavior |
| --- | --- | --- | --- |
| **TARGET REQUIREMENT** | Outer diameter | Full displayed Disc represents the committed physical outer edge | Disc content pixels derive from committed outer millimeters and canonical DPI; export contract owns padding/outline details |
| **TARGET REQUIREMENT** | Physical center hole | Visible cutout/guide ratio derives from committed geometry | Exact center region is removed using the same committed ratio |
| **TARGET REQUIREMENT** | Inner printable boundary | Derived guide and owner-layout input | Guide/preflight input; not the physical center cutout |
| **TARGET REQUIREMENT** | Printable outer diameter | Derived guide and preflight input | Does not silently crop content unless a separately authoritative print policy says so |
| **TARGET REQUIREMENT** | Safe diameter | Advisory guide and owner safety input | Optional exported guide/preflight input; never implicit crop |
| **TARGET REQUIREMENT** | Owner after-layouts | Visible renderer consumes committed after-state | Export adapters consume the identical committed after-state |

**TARGET REQUIREMENT —** At the current 300 DPI, the domain conversion remains
`round((millimeters / 25.4) * 300)` unless the template/export authorities
jointly revise it. A geometry plan reports the physical content size; the
export contract remains authoritative for canvas outline padding, guide pixels,
encoding, destination, and write safety.

**TARGET REQUIREMENT —** Export consumes valid committed physical geometry from
its immutable project snapshot. Preflight may detect an impossible corrupted
state and block with a destination back to Disc Template, but export must not
normalize, clamp, reflow, switch, or repair geometry or owner layouts.

## 16. Game, Preset, Guided, Profile, And Case Boundaries

**TARGET REQUIREMENT —** Game import preserves the committed Disc template and
geometry by default. If a future Game plan explicitly proposes a template, it
must display that proposal separately and delegate candidate validation,
geometry planning, Apply, and recovery to this contract. Game cannot commit
geometry inside `game.import.apply` as an undisclosed side effect.

**TARGET REQUIREMENT —** Layout presets resolve for committed geometry and do
not own template choice. Their application-level workflow is owned by
[`DISC_LAYOUT_PRESET_WORKFLOW_CONTRACT.md`](DISC_LAYOUT_PRESET_WORKFLOW_CONTRACT.md).
A geometry plan does not silently apply, reapply, detach, or reset a preset. As
part of the atomic after-state, it invalidates the old template-resolved
transient definition and asks the preset/guided owner to:

- re-resolve the same exact supported identity for the new committed template
  without dispatching preset owner updates; or
- deactivate transient guidance safely when exact resolution is unavailable.

Persisted Guided identity, omitted slots, and completed slots remain unchanged
unless their own contract defines a separately explicit operation. Re-resolved
geometry affects future guidance/targeted placement only; the geometry plan's
committed owner after-state remains preview/export truth.

**TARGET REQUIREMENT —** A future Guided Start flow from issue
[#17](https://github.com/thelordofdino4/steam-backup-label-studio/issues/17)
may ask for a Disc template, but it must call this workflow before applying
Guided/preset steps. A future user style/profile from issue
[#180](https://github.com/thelordofdino4/steam-backup-label-studio/issues/180)
may contain a template preference, but applying it must present and authorize a
geometry plan rather than write template fields directly.

**TARGET REQUIREMENT —** This contract is Disc-only. It does not rename the
current Case “Template” navigation selector, change `cover`/`tray` compatibility,
define Front/Back/left/right spine routing, resize a jewel Case surface, or
authorize circular Disc clamps for rectangular Case content.

## 17. Busy Scopes, Typed Outcomes, Feedback, Focus, And Accessibility

**TARGET REQUIREMENT —** Draft parsing is synchronous and owns no global busy
state. Planning may use a replaceable `disc.geometry.plan` scope when stable
asset/text measurement is asynchronous. Canonical edits may continue during
planning, but they invalidate the plan. Apply and Restore acquire one exclusive
project-mutation scope and conflict with Save, Open, New, Game apply, another
geometry apply/restore, and Export snapshot capture.

**TARGET REQUIREMENT —** A losing activation returns the lifecycle dispatch
`not-executed/busy` result. No second dialog, owner-plan run, or feedback
publisher starts. Review uses at most one modal surface; if implemented as a
modal, it obeys the focus lifecycle owned by issue
[#309](https://github.com/thelordofdino4/steam-backup-label-studio/issues/309).

**TARGET REQUIREMENT —** Domain planning results are exactly `no-change`,
`ready`, or `blocked`. Executed Apply/Restore use the lifecycle
`success`/`cancelled`/`declined`/`failure` envelope. This workflow's stable
failure codes include:

- `disc-geometry.invalid-candidate`;
- `disc-geometry.plan-blocked`;
- `disc-geometry.stale-plan`;
- `disc-geometry.owner-unavailable`;
- `disc-geometry.commit-failed`; and
- `disc-geometry.restore-unavailable`.

**TARGET REQUIREMENT —** The semantic owner returns one feedback intent; the
application shell publishes it once. Field diagnostics remain inline. A ready
review announces a concise impact summary; success names the selected template,
the number of adjusted owners, physical output size, and Restore availability.
Failure names the actionable destination without exposing raw exceptions.
Issue [#300](https://github.com/thelordofdino4/steam-backup-label-studio/issues/300)
owns global Home feedback presentation rather than this domain.

**TARGET REQUIREMENT —** Accessibility and focus behavior includes:

- persistent visible labels and millimeter units for every field;
- `aria-invalid` only on fields with active errors;
- `aria-describedby` linking each field to its own error/help and linking
  cross-field errors to every involved field where platform semantics allow;
- an error summary on Plan/Apply attempts that focuses or links to the first
  invalid field in canonical field order;
- no loss of raw text, selection, or focus when validation fails;
- keyboard-operable Choose, Plan, Apply, Cancel/Discard, and Restore actions;
- Space/Enter activation consistent with issue
  [#298](https://github.com/thelordofdino4/steam-backup-label-studio/issues/298);
- review cancellation returning focus to the initiating selector/input;
- successful Apply returning focus to the Disc Template owner or explicitly
  requested destination and announcing the result; and
- Restore returning focus to its initiating action or Disc Template summary.

**TARGET REQUIREMENT —** Layout review must not communicate impact by color or
preview movement alone. It names old/new physical dimensions, every adjusted
owner, adjustment kind, blockers/warnings, and preserved-content guarantee in
text available to assistive technology.

## 18. Testable Invariants, Implementation Order, Issue Mapping, And Exclusions

### 18.1 Required Invariants

**TARGET REQUIREMENT —** Future implementation is not complete until focused
tests establish at least:

1. raw incomplete/invalid values never mutate committed geometry;
2. every scalar and cross-field diagnostic is specific, linked, and clears on
   correction;
3. last valid draft and committed geometry remain stable through invalid edits;
4. built-in and Custom choice do not commit before Apply;
5. equal snapshots and candidates produce equal plans and owner order;
6. every registered Disc visual owner returns an impact or blocks planning;
7. disabled state, assets, provenance, text, styles, values, and item order are
   preserved through Apply and Restore;
8. cancellation, blocked/no-change planning, stale plans, and technical failure
   cause no revision, dirty, history, or partial owner changes;
9. successful changed Apply and Restore each produce exactly one canonical
   revision/history transaction;
10. the recovery token cannot overwrite intervening work;
11. active preset/guided transient geometry is re-resolved or deactivated
    without preset reapplication;
12. preview/save/export consume the same committed after-state;
13. export blocks corrupted invalid committed geometry and never repairs it;
14. New/Open/Save/Return Home behavior remains owned by lifecycle/schema; and
15. no Disc workflow changes Case physical surfaces or navigation.

**TARGET REQUIREMENT —** Pure tests cover draft parsing, intrinsic validation,
plan determinism, owner impact ordering, stale detection, inverse recovery, and
dirty/revision effects. Adapter tests cover each owner and preset transition.
Project round-trip and export-input tests cover committed geometry only.
User-visible field errors, focus, review, preview, and recovery require native
Tauri/manual validation under `AGENTS.md`; browser-only diagnostics cannot prove
visual acceptance.

### 18.2 Recommended Implementation Order

**TARGET REQUIREMENT —** A safe implementation sequence is:

1. add pure draft/validation/result types beside the existing Disc template
   owner;
2. add a registry of pure geometry-plan owner adapters and completeness tests;
3. add immutable plan construction and stale-plan checks;
4. establish one focused atomic project transaction boundary and inverse token;
5. integrate lifecycle revision/dirty/history/feedback and preset re-resolution;
6. adapt Template controls and accessible review without moving semantic
   ownership into presentation;
7. harden project-load validation and export blocker consumption at their own
   authority boundaries; and
8. run focused source tests followed by explicitly authorized native runtime
   validation.

**TARGET REQUIREMENT —** Architecture-sensitive implementation must update
existing owners or add focused modules. It must not expand
`clampForegroundElementLayoutsToTemplate`, add more setter sequencing to
`App.tsx`, or create a second template/layout state tree.

### 18.3 Issue And Evidence Mapping

| Claim class | Issue | Relationship to this contract |
| --- | --- | --- |
| **CURRENT FACT** | [#307](https://github.com/thelordofdino4/steam-backup-label-studio/issues/307) | Principal owner for accessible, field-specific custom-dimension explanation, draft/commit timing, correction, and last-valid behavior. |
| **CURRENT FACT** | [#311](https://github.com/thelordofdino4/steam-backup-label-studio/issues/311) | Principal owner for warning/protection, deterministic geometry-switch adjustment, cancellation safety, and recovery. This contract selects explicit plan review plus revision-scoped exact inverse Restore for the first target. |
| **CURRENT FACT** | [#308](https://github.com/thelordofdino4/steam-backup-label-studio/issues/308) | Supplies the project-session, baseline, dirty, revision, command, feedback, and future history boundary. |
| **CURRENT FACT** | [#309](https://github.com/thelordofdino4/steam-backup-label-studio/issues/309) | Owns modal focus lifecycle when geometry review uses a modal. |
| **CURRENT FACT** | [#298](https://github.com/thelordofdino4/steam-backup-label-studio/issues/298) | Supplies keyboard activation expectations for interactive controls. |
| **CURRENT FACT** | [#300](https://github.com/thelordofdino4/steam-backup-label-studio/issues/300) | Owns global/Home feedback presentation. |
| **CURRENT FACT** | [#168](https://github.com/thelordofdino4/steam-backup-label-studio/issues/168) | Owns role-based preset application; presets remain explicit consumers of committed template geometry. |
| **CURRENT FACT** | [#281](https://github.com/thelordofdino4/steam-backup-label-studio/issues/281) | Owns Guided slot identity/resolution; geometry changes preserve progress and re-resolve transient definitions without reapplying placements. |
| **CURRENT FACT** | [#17](https://github.com/thelordofdino4/steam-backup-label-studio/issues/17) | Future Guided Start may invoke, but does not own, template selection/application. |
| **CURRENT FACT** | [#180](https://github.com/thelordofdino4/steam-backup-label-studio/issues/180) | Future user profiles may propose templates but must not bypass geometry planning/apply. |
| **CURRENT FACT** | [#302](https://github.com/thelordofdino4/steam-backup-label-studio/issues/302) | Export ordering remains separate and consumes committed geometry. |
| **CURRENT FACT** | [#305](https://github.com/thelordofdino4/steam-backup-label-studio/issues/305) | Exact uncropped image bounds remain an image-owner concern used by geometry adapters, not a reason to duplicate bounds logic here. |
| **CURRENT FACT** | [#312](https://github.com/thelordofdino4/steam-backup-label-studio/issues/312) | Atomic project-file save is separate from atomic in-memory geometry application. |

**CURRENT FACT —** A read-only search of all open issues on 2026-07-26 found no
newer focused Disc template/physical-geometry workflow owner superseding #307 or
#311. The issues above are dependencies or future consumers, not replacement
owners. Neither principal issue had additional comment decisions to import at
the evidence baseline.

### 18.4 Exclusions And Open Questions

**TARGET REQUIREMENT —** This documentation change does not implement source,
tests, schema migration, history, runtime UI, preview/export changes, or GitHub
issue mutations. It does not choose final panel styling, a menu location, or a
Case template workflow.

**OPEN QUESTION —** The template data authority must decide whether future
custom editing exposes `bleedDiameterMm`, manufacturer/calibration metadata, or
precision/quantization beyond the current numeric model. None is implied by the
five-field first target.

**OPEN QUESTION —** The lifecycle/history authority must decide when a general
Undo/Redo service replaces the dedicated Restore presentation. Until then, the
revision-scoped exact inverse in this contract is required for #311 recovery.

**FUTURE EXTENSION —** Manufacturer presets, template import/export,
calibration, label sheets, printer offsets, higher DPI, candidate ghost preview,
and long-lived template-keyed layout snapshots require separately reviewed data,
schema, and output contracts.
