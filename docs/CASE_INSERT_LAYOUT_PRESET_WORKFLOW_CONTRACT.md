# Case Insert Layout Preset Workflow Contract

> Status: Draft target-state normative contract with implemented pure definition/catalog/compatibility, assignment-resolution, first-time Apply planning/transition, detached applied-configuration/customization detection, Reapply planning/transition, Detach planning/transition, content-complete transition evidence, atomic application-adoption, passive lifecycle application-unit, pure lifecycle-owned adoption commit, and lifecycle-store installation checkpoints.
> Purpose: Define the presentation-neutral Case Insert Layout Preset Select, Plan, Review, Apply, Reapply, and Detach workflow across Front Cover, complete Tray Card, Back Panel, and explicit left/right spine regions.
> Read when: Designing or implementing Case preset definitions, catalogs, planning, owner adapters, application scopes, persistence, Game/import composition, future Case workflow presentation, or Case preset acceptance.
> Authoritative source: This contract for target Case preset workflow semantics; current implementation facts defer to source and tests; physical geometry defers to the Case template and layout owners; serialized fields defer to `PROJECT_FILE_SPEC.md`.
> Last reviewed against synchronized `origin/main` at `fcde6d9fef8efa25719761b538eda0ad2bca2ed6` plus the focused lifecycle-store installation checkpoint documented below.

Last refreshed: 2026-08-04.

## 1. Status, scope, and authority

**TARGET REQUIREMENT —** This is a **draft target-state normative contract**.
It defines behavior that the complete Case Insert Layout Preset implementation
must satisfy.

**CURRENT FACT —** The pure v1 definition parser, canonical catalog boundary,
concrete-region/coordinate-basis registry, compatibility evaluator, stable
assignment resolver, immutable first-time Apply planner, deterministic review
identity, pure atomic first-time Apply transition, authoritative detached
applied-configuration domain, exact customization detector, pure Reapply
planner/transition, and pure Detach planner/transition now exist under
`src/presets/`, with the lifecycle-detached normalized snapshot adapter under
`src/caseInsert/`. The planner consumes only one successful exact resolver
result, converts declared normalized regions into deterministic typed
`layout-x`, `layout-y`, `layout-scale`, and `layout-width` proposals supported
by current owner fields, and records preservation, skips, warnings, blockers,
material-consent requirements, commit preconditions, and a deterministic field
footprint. The transition consumes only that deeply frozen plan plus exact
review, material-consent, source, and unattached assertions; preflights every
stable target/current value; and returns either one detached normalized Case
aggregate plus an immutable uninstalled configuration candidate or a typed
failure containing neither. It never reruns resolution/planning or mutates a
live Case project. A successful transition candidate can now be validated into
one content-identified, deeply immutable, detached/uninstalled configuration;
the detector compares only its exact owned-field addresses and last-applied
values against a later normalized Case aggregate. The Reapply planner validates
that configuration/report/current-context chain, resolves only one directly
supplied same-ID exact definition revision, requires explicit overwrite or
preserve policy for each retained customized field, and returns a deterministic
review plan with aggregate writes, footprint evolution, warnings, consent
requirements, exact preconditions, and a non-authoritative next-configuration
projection. The Reapply transition consumes only that exact deeply frozen plan,
the named authoritative configuration/report, one exact review acceptance,
every exact material-consent acceptance, and the still-current normalized Case
aggregate/context. It revalidates the full compare-and-swap chain before any
detached output construction, applies only declared layout writes through exact
stable addresses, and returns either one deeply immutable aggregate plus one
validated authoritative detached/uninstalled next configuration or a typed
failure containing neither. The Detach planner consumes one validated
authoritative configuration plus one exact still-current normalized
aggregate/snapshot/session/revision/template context. It directly validates
every configuration-owned stable address and exact current value, then emits
one deeply immutable, deterministic review plan containing the complete release
footprint, an exact preservation fact for every current value, one
configuration-level ownership-release warning, future compare-and-swap
preconditions, review/plan identities, and a non-authoritative projection of no
remaining applied-preset ownership. Clean and customized values have identical
preservation semantics. The Detach transition treats that exact deeply frozen
plan as a strict compare-and-swap artifact, independently validates the named
authoritative configuration, recomputes plan/review/acceptance/transition
identities, requires the exact reviewed warning and empty material-consent set,
then rechecks session, revision, template, snapshot, every stable target,
enablement, and current value before constructing output. Success returns a
detached deeply immutable aggregate with identical semantics plus authoritative
pure release evidence; the complete ownership footprint is released with zero
aggregate writes and no next applied configuration. A failure returns neither.
Neither planner nor transition consults a selected definition, catalog,
resolver, compatibility evaluator, customization detector, or Reapply policy.
No starter definition, workflow presentation, menu item, or persistence schema
exists. A pure application
attachment model now distinguishes one canonical authoritative absence from one
complete validated attached Case configuration and pairs that wrapper with one
exact Case assignment snapshot as a single pure atomic state unit. It also
defines legal Apply/Reapply/Detach attachment edges, request/receipt types,
deterministic receipt-identity inputs, and a strict inert-evidence
audit boundary. Each assignment snapshot and Apply/Reapply/Detach plan now binds
one deterministic identity for the complete normalized Case aggregate. Each
successful transition carries detached source/result aggregates, their exact
content identities, canonical source/successor configuration endpoints,
operation/context/plan/review/consent lineage, one operation-discriminated
transition identity, one whole-success identity, and explicit
`applicationAdoptionStatus: not-adopted`. Operation-specific public validators
recompute and validate the entire bundle before returning opaque branded inert
evidence. A separate pure application-adoption transition now revalidates that
evidence and one exact current application snapshot, performs the complete
compare-and-swap check, and returns one coherent successor snapshot plus one
operation-discriminated adoption receipt or a typed failure containing neither.
It performs no lifecycle/store commit, schema change, persistence, catalog
installation, UI work, or runtime side effect.

**CURRENT FACT —** `ProjectSession` now has a discriminated Case-only
`caseInsertPresetApplication` companion owned by
`src/lifecycle/caseInsertPresetSessionApplication.ts`. The complete Case
aggregate remains solely in `ProjectSession.project.caseInsert`; the companion
stores only canonical attachment, a distinct application revision, exact
assignment/context identity, and the deterministic application-state identity.
New and Open Case sessions initialize canonical authoritative `unattached`
state at application revision zero. Strict capture and projection reconstruct
the complete pure application snapshot from authoritative project content and
the companion, so no shadow aggregate or independently writable
aggregate/attachment pair exists. This passive representation by itself adds no
adoption commit, store action, UI, persistence, schema, catalog, or runtime
workflow.

**CURRENT FACT —** The source adoption owner can now audit one versioned,
operation-discriminated validated-success bundle containing the exact current
application snapshot, opaque `not-adopted` evidence, and its exact reconstructed
Apply, Reapply, or Detach adoption result. The pure lifecycle-owned
`src/lifecycle/caseInsertPresetSessionApplicationCommit.ts` boundary consumes
that complete source bundle plus one exact source Case `ProjectSession`, not
loose aggregate, attachment, revision, or receipt fields. It prepares one
content-addressed full source/successor authorization envelope and performs an
exact full-session compare-and-swap against a separately supplied current
session. Success returns one complete successor session together with the
existing adoption receipt; failure returns neither. The boundary does not
dispatch to the lifecycle store or connect persistence, schema, UI, catalog,
workflow, busy scopes, feedback, history, or runtime behavior.

**CURRENT FACT —**
`src/lifecycle/caseInsertPresetSessionApplicationCommand.ts` now owns the
bounded store-installation bridge for the exact
`case.layoutPreset.apply`, `case.layoutPreset.reapply`, and
`case.layoutPreset.detach` operation IDs. Each command accepts only the pure
commit boundary's complete authorization snapshot, acquires one exclusive
`project.mutation` scope through the existing dispatcher/busy coordinator, and
runs the pure full-session compare-and-swap inside one lifecycle-store
generation-CAS transition. Success installs the returned complete successor
`ProjectSession` once and returns the existing adoption receipt through the
shared typed command-result/feedback model. The final transition rechecks the
complete current Case session, including session ID, content revision,
application revision, project, attachment, baseline, path, format, display
identity, and route. Stale, replayed, wrong-operation, malformed, busy, no-op,
or store failures leave the authoritative state unchanged, and dispatcher
cleanup releases the exclusion scope after success or failure. The bridge does
not rerun planning, Apply/Reapply/Detach transitions, adoption, catalog lookup,
or editor mutation. No production catalog, workflow UI, App/editor invocation,
persistence, schema, preview, or export connection is added.

**TARGET REQUIREMENT —** This contract owns the Case-specific form of the
shared preset protocol: stable identity and catalog consumption, compatibility,
Select, immutable Plan, Review, atomic Apply/Reapply/Detach, explicit Case
region and scope semantics, customization, recovery, typed outcomes, and
coordination with current Case owners.

**TARGET REQUIREMENT —** Authority is divided as follows.

| Claim class | Concern | Authority |
| --- | --- | --- |
| TARGET REQUIREMENT | Case preset workflow, concrete design regions, coordinate bases, assignment identity, affected scope, multi-region atomicity, Case customization, and Case preset outcomes | This contract |
| TARGET REQUIREMENT | Shared Disc/Case lifecycle, session ID, revision, canonical dirty state, result envelope, feedback, busy arbitration, and future history boundary | [`APPLICATION_COMMAND_AND_PROJECT_LIFECYCLE_CONTRACT.md`](APPLICATION_COMMAND_AND_PROJECT_LIFECYCLE_CONTRACT.md) |
| TARGET REQUIREMENT | Disc preset workflow and Disc-specific circular geometry/owner adapters | [`DISC_LAYOUT_PRESET_WORKFLOW_CONTRACT.md`](DISC_LAYOUT_PRESET_WORKFLOW_CONTRACT.md) |
| TARGET REQUIREMENT | Packaging roles and current role-to-object taxonomy | [`PACKAGING_ROLE_MODEL.md`](PACKAGING_ROLE_MODEL.md) |
| TARGET REQUIREMENT | Neutral role/preset vocabulary and the implemented Disc-first generic foundation | [`ROLE_BASED_PRESET_MODEL.md`](ROLE_BASED_PRESET_MODEL.md) and current source |
| TARGET REQUIREMENT | Jewel Case physical surfaces, regions, safe regions, folds, preview/export geometry, and renderer ownership | [`TEMPLATE_SPEC.md`](TEMPLATE_SPEC.md), [`SOFTWARE_DESIGN_DOCUMENT.md`](SOFTWARE_DESIGN_DOCUMENT.md), and focused Case source owners |
| TARGET REQUIREMENT | Saved fields, schema versions, validation, normalization, migrations, and compatibility | [`PROJECT_FILE_SPEC.md`](PROJECT_FILE_SPEC.md) |
| TARGET REQUIREMENT | Game search/import planning and accepted atomic composition | [`GAME_SEARCH_IMPORT_AND_METADATA_WORKFLOW_CONTRACT.md`](GAME_SEARCH_IMPORT_AND_METADATA_WORKFLOW_CONTRACT.md) |
| TARGET REQUIREMENT | Guided slot identity, omission/completion, and placeholder behavior | [`GUIDED_PRESET_SLOT_MODEL.md`](GUIDED_PRESET_SLOT_MODEL.md) and issue #281 |
| TARGET REQUIREMENT | Application-menu presentation, workflow-host routing, and active-editor launcher pairing | [`APPLICATION_MENU_BAR_CONTRACT.md`](APPLICATION_MENU_BAR_CONTRACT.md) and [`EDITOR_NAVIGATION_AND_CONTROL_OWNERSHIP.md`](EDITOR_NAVIGATION_AND_CONTROL_OWNERSHIP.md) |
| TARGET REQUIREMENT | Case preview/export layer order | [`CASE_INSERT_EDITOR_LAYER_ORDER.md`](CASE_INSERT_EDITOR_LAYER_ORDER.md) |

**TARGET REQUIREMENT —** A more specific owner wins only within its concern.
This contract may coordinate owner updates, but it may not redefine an image
slot's payload, a text owner's rich-text semantics, a mark family's identity,
template geometry, layer order, save/load normalization, or export rendering.

**CURRENT FACT —** Issue #168 remains the broad layout-preset/product parent,
and issue #149 remains the owner of unfinished structured imported Tray/Spine
composition. Neither issue is completed by this documentation contract.

## 2. Terminology and semantic model

**TARGET REQUIREMENT —** Every substantive claim in this document uses one of
these classes.

| Claim class | Meaning |
| --- | --- |
| CURRENT FACT | Verified in source, focused tests, authoritative current-state documentation, or reviewed issue/PR evidence at the named baseline. |
| TARGET REQUIREMENT | Normative behavior a conforming future implementation must satisfy. |
| FUTURE EXTENSION | Permitted later capability outside the first conforming implementation. |
| OPEN QUESTION | A deliberately deferred decision whose owner is named; implementation convenience cannot resolve it silently. |

**TARGET REQUIREMENT —** The workflow uses three distinct Case surface levels.

| Claim class | Level | Exact vocabulary | Meaning |
| --- | --- | --- | --- |
| CURRENT FACT / TARGET REQUIREMENT | Physical export surface | Front Cover / Cover Sheet; complete Tray Card | The two physical PNG surfaces. The complete Tray Card contains the center back panel and both spine strips. Spine is not a standalone PNG. |
| TARGET REQUIREMENT | User-facing workflow section | `front`, `back`, `spine` | Human-facing review and scope grouping. A section is not a durable assignment identity. |
| TARGET REQUIREMENT | Concrete design region | `front-cover`, `tray-card`, `back-panel`, `left-spine`, `right-spine` | Exact preset assignment and plan targets. Every accepted assignment uses one of these identities. |

**TARGET REQUIREMENT —** The remaining semantic vocabulary is exact.

| Term | Meaning |
| --- | --- |
| Preset reference | Canonical preset ID plus one positive exact definition revision. |
| Selection | Session-only candidate reference chosen for inspection; it has no project effect. |
| Assignment | One explicit binding from a preset slot and semantic role to a concrete region, owner, stable object, coordinate basis, and reviewed actions. |
| Coordinate basis | The template region or owner-derived canonical region against which normalized content/action coordinates are interpreted. |
| Affected scope | One explicit requested region, one user section resolved to concrete regions, or every region declared by the preset. |
| Plan | Immutable, session/revision/template/configuration-bound proposal containing every affected assignment, action, warning, blocker, and after-state input. |
| Apply | Atomic first accepted commit of a fresh reviewed plan. |
| Attached | Assignment remains associated with its exact preset reference and agrees with the last accepted preset-owned values. |
| Customized | An attached assignment's preset-owned values no longer agree with its accepted applied values because of later owner edits. |
| Reapply | Fresh Plan and Review of the same canonical preset ID at one explicitly selected exact revision, with explicit scope and per-field customization policy/overwrite consent. |
| Detach | Atomic removal of preset association for an explicit scope while preserving all current owner content and geometry. |
| Mirrored editing | Current Case editor policy that fans an editing action to both spine-side owners; it is not a role, section, concrete region, assignment, or side identity. |
| Project/content revision | Existing `ProjectSession.revision`; advances only under the established canonical persisted-project content rule and participates in Save/replacement authorization. |
| Case preset application revision | Distinct deterministic counter owned by the Case application unit; advances exactly once when that unit's semantic application snapshot changes and is excluded from dirty comparison and persistence. |
| Case preset application unit | One Case-only lifecycle representation whose authoritative aggregate is `ProjectSession.project.caseInsert` and whose companion binds canonical attachment, application revision, assignment/context identity, and application-state identity without duplicating aggregate state. |

**TARGET REQUIREMENT —** The shared workflow is:

```text
Catalog -> Select -> Compatibility -> Plan -> Review
                                          |       |
                                          |       +-> Cancel / decline (no mutation)
                                          v
                                  Apply / Reapply / Detach
                                          |
                                 one atomic Case commit
```

**TARGET REQUIREMENT —** Catalog browsing, Select, compatibility evaluation,
planning, review, navigation, focus, and cancellation are non-mutating. Only an
accepted fresh Apply, Reapply, or Detach may commit canonical project content or
preset configuration.

## 3. Verified current-state behavior

**CURRENT FACT —** Case project state is normalized as
`ProjectJewelCaseState` with `templateType`, `templates.cover`,
`templates.tray`, `spine.left`, `spine.right`, the persisted `spine.mirrored`
editing setting, and export settings. Cover/Tray and each spine side already
have distinct image, text, logo, and mark owner state.

**CURRENT FACT —** The current Jewel Case template exposes two physical
surfaces: `front` at 1414 × 1414 export pixels and `back` at 1780 × 1390 export
pixels at the current 300-DPI contract. The `back` surface contains a 1630-pixel
center `backPanel` and two 75-pixel spine regions.

**CURRENT FACT —** Current geometry defines `front`, `frontSafe`, `back`,
`backSafe`, `backPanel`, `backPanelSafe`, `leftSpine`, `leftSpineSafe`,
`rightSpine`, and `rightSpineSafe`, plus trim/bleed/fold guides. Preview and PNG
export consume the same template-derived region geometry through focused
layout/render adapters.

**CURRENT FACT —** `caseInsert.templates.tray.background` is fitted to the
complete `back` surface. Other Tray content uses Back-specific helpers whose
safe placement is based on `backPanelSafe`. Spine content is drawn separately
inside explicit left/right regions on that same physical Tray output.

**CURRENT FACT —** Cover/Tray mutations are owned by focused template-surface
transitions and `useCaseInsertTemplateEditor`; spine mutations are owned by
focused spine transitions and `useJewelCaseSpineEditor`. Mirrored spine editing
currently resolves an invoked side to both side owners, while preserving
side-prefixed IDs and distinct left/right state.

**CURRENT FACT —** Repeated Case artwork, logo, and mark arrays contain stable
string `id` values. Current transitions update/remove by ID, while creation uses
owner-specific stable prefixes. Labels and array positions are presentation
data, not sufficient durable identity.

**CURRENT FACT —** The current Disc editor has a local Layout Presets selector,
an Apply button, generic Disc definition/registry/resolution/application
modules, and transient active-preset behavior. The target Disc
Select/Plan/Review/Apply/Reapply/Detach contract is not fully implemented.

**CURRENT FACT —** Case Insert now has a pure coordinated definition format,
strict parser, empty user-ready catalog, canonical exact-revision and
alias-boundary resolution, a pure compatibility evaluator, and pure stable
assignment resolution against one detached normalized Case snapshot. The
resolver expands explicit scopes into concrete regions, binds fixed synthetic
and repeated stable object identities, and distinguishes resolved, disabled,
missing optional, missing required, ambiguous, stale, incompatible, invalid,
and unsupported states. The first-time Apply planner consumes that exact frozen
output without catalog or owner lookup. It emits deeply immutable deterministic
field actions, preservation decisions, optional-target skips, required-target
blockers, disabled-target warnings, aggregate and field no-op state,
multi-region consent, exact stale/identity preconditions, and a future
customization footprint. Unsupported action-region or text-fitting work fails
closed; #181 remains unresolved.

**CURRENT FACT —** The pure first-time Apply transition validates the reviewed
plan's format, operation, action/footprint/provenance coherence, exact
content-bound review identity, every stable material-consent requirement,
snapshot/template/preset/scope preconditions, target presence/ambiguity,
enablement, and current semantic field values before producing output. It
executes only `layout-x`, `layout-y`, `layout-scale`, and `layout-width` through
exact owner/object/field addresses, preserves all untargeted and disabled
payload data, and returns complete deeply frozen source/result aggregates plus
an uninstalled configuration candidate. Its canonical source endpoint is
authoritative absence; its canonical successor endpoint is the promoted exact
configuration. Semantic no-op Apply can still return the candidate. A public
strict validator recomputes both aggregate identities, configuration and
endpoint identities, operation/context/lineage evidence, transition identity,
and whole-success identity before returning an opaque validated result. That
first-time boundary contains no starter definitions, installed
configuration attachment, workflow presentation, menu launcher, Reapply, or
Detach behavior.

**CURRENT FACT —** One full normalized Case aggregate identity now covers
`templateType`, complete Cover/Tray/left/right Spine owner state, mirrored-edit
policy, export settings, stable object IDs, enablement, payload bytes and
provenance, text/style/layout values, and semantic array membership/order.
Record property order does not affect the identity; semantic array order does.
The validator rejects partial, non-normalized, malformed, cyclic, foreign-kind,
and forged aggregate evidence and returns a detached deeply frozen aggregate.
Stable assignment lookup remains ID-based and independent of array position,
while the enclosing aggregate identity still truthfully records array order.

**CURRENT FACT —** The identity authorities are deliberately distinct.

| Identity | Proves | Does not prove by itself |
| --- | --- | --- |
| Assignment snapshot/context identity | Session ID, application-snapshot revision (the existing pure type spells this `projectRevision`), template identity, and the named aggregate-content identity at capture time | Persisted-content revision, configuration attachment, transition execution, or adoption |
| Aggregate-content identity | Exact complete normalized `ProjectJewelCaseState` semantics | Session/revision context, configuration ownership, or operation lineage |
| Configuration identity | Exact detached/uninstalled applied-configuration contents and owned-field footprint | Current application attachment or exact aggregate contents |
| Transition identity | One operation's exact context, aggregate/configuration endpoints, and plan/review/consent lineage | Runtime adoption against a still-current application snapshot |
| Whole-success identity | Exact supported success version plus operation, transition, source/result aggregate identities, source/successor endpoints, configuration/release identities, lineage, and explicit non-adoption as one coherent bundle | That the application has adopted the bundle |

**CURRENT FACT —**
`src/presets/caseInsertPresetAppliedConfiguration.ts` consumes only a complete
successful `applied` or `applied-semantic-no-op` transition output. It validates
candidate/aggregate coherence, stable addresses, supported fields, exact
provenance, evidence identity uniqueness, and canonical ordering before
returning one detached, deeply frozen authoritative domain value with a
deterministic content-derived identity. This promotion is validation only; it
does not install or persist the configuration.

**CURRENT FACT —** The same module implements pure customization detection from
that configuration plus a current normalized Case aggregate and explicit
session/revision/template context. It performs direct stable-address lookup
through the shared Case snapshot-address owner, compares only `layout-x`,
`layout-y`, `layout-scale`, and `layout-width` records in the configuration's
owned footprint using exact owner semantics, and returns a deterministic deeply
frozen clean/customized report. Current content and application revisions may
advance; session,
project-kind, and template continuity remain guarded. Missing, ambiguous,
unsupported, invalid, and incompatible states are failures rather than
customization. The detector does not consult a catalog, resolver, planner,
geometry helper, renderer, persistence owner, or UI.

**CURRENT FACT —** `src/presets/caseInsertPresetReapplyPlanning.ts` consumes one
validated authoritative configuration, one still-current validated
clean/customized report, one exact normalized current aggregate/snapshot and
session/revision/template context, one directly supplied canonical definition
of the same preset ID at an exact revision, and explicit policy records for
every retained customized field. It reuses the shared direct-definition
compatibility/resolution boundary and shared resolved-layout proposal owner; it
does not invoke the first-time Apply planner, rerun customization detection, or
consult the production catalog. It classifies retained clean, customized
overwrite, customized preserve, new, retired, moved, and provenance-changed
addresses; overwrite is material-consent-gated, while preserve plans no write,
keeps ownership and prior last-applied value, and remains customized. Its
deeply frozen output contains exact stable-address actions, preservation facts,
warnings, material-consent requirements, exhaustive current preconditions,
footprint dispositions, and a deterministic review identity. The projected
configuration is explicitly non-authoritative and uninstalled. The planner
does not accept review/consent or execute, install, persist, render, or mutate.

**CURRENT FACT —** Assignment definitions explicitly classify target presence
as `required` or `optional`. This is a resolution fact only: it does not choose
`skip`, `warn`, `block`, `create`, enablement, replacement, or consent policy.
Repeated-object absence remains a compatibility warning so the resolver can
report the exact typed missing state; unsupported owners, regions, coordinate
bases, project kinds, templates, and scopes remain incompatible.

### Current-versus-target matrix

| Claim class | Concern | Current Case behavior | Required target behavior |
| --- | --- | --- | --- |
| CURRENT FACT / TARGET REQUIREMENT | Preset entry | None | Reveal/focus a Case-specific rich workflow; launcher does not mutate |
| CURRENT FACT / TARGET REQUIREMENT | Surface model | Two physical outputs, Front/Back/Spine editor grouping, and four owner containers coexist | Preserve all three levels and bind every assignment to a concrete region |
| CURRENT FACT / TARGET REQUIREMENT | Coordinates | Current owners use explicit template regions and safe bounds | Every normalized preset region declares its compatible coordinate basis |
| CURRENT FACT / TARGET REQUIREMENT | Resolution | Pure scope expansion and exact owner/object binding exist against one lifecycle-detached normalized Case snapshot | Continue treating this resolver output as the sole target/current-state binding authority |
| CURRENT FACT / TARGET REQUIREMENT | Planning | Pure first-time Apply, same-ID Reapply, and complete-footprint Detach planning exist. Detach directly validates one authoritative configuration and current snapshot/context, emits deterministic release/preservation/warning/precondition/review evidence, plans no aggregate write, and returns only a non-authoritative no-ownership projection; unsupported fitting fails closed | Preserve the separate planner authorities and add no hidden mutation or target fallback |
| CURRENT FACT / TARGET REQUIREMENT | Application | Pure reviewed first-time Apply, Reapply, and Detach transitions completely preflight exact plan/configuration/review/consent/context/address/value evidence and return coherent detached immutable outputs or neither. A source-owned validated-success bundle binds one exact current application snapshot, opaque inert evidence, and its reconstructed operation-discriminated adoption success. The pure lifecycle commit adapter derives one complete source/successor session envelope and performs exact full-session compare-and-swap, returning the successor and existing receipt together or neither. The application command/store bridge now installs that complete authorized successor once under `project.mutation`, with final full-session and store-generation CAS | Apply attaches the promoted configuration, Reapply replaces it, and Detach installs canonical authoritative absence; Detach release evidence authorizes release but is never stored as successor attachment state. Runtime workflow orchestration must eventually produce the authorization without duplicating these owners |
| CURRENT FACT / TARGET REQUIREMENT | Mirroring | Editing actions may fan out according to `spine.mirrored` | Preset plans remain explicit per side and fan out only when review says so |
| CURRENT FACT / TARGET REQUIREMENT | Persistence | Owner values save; no Case preset association saves | Continue saving owner values; future association requires explicit schema work |
| CURRENT FACT / TARGET REQUIREMENT | Recovery | Normalization restores explicit owner values | Restore values first; never infer or silently reapply a preset from coordinates |

## 4. Preset identity, catalog, and compatibility

**TARGET REQUIREMENT —** A Case preset uses a stable canonical ID namespace and
positive exact revision. The first definition format must reserve distinct
built-in and future user identities, for example
`builtin:case-preset:<slug>` and `user:case-preset:<uuid>`, without reusing a
Disc preset ID or treating a label as identity.

**TARGET REQUIREMENT —** Format version and definition revision are separate.
Format version governs parser shape; revision identifies one exact immutable
definition. A newer revision is never silently substituted for an exact saved
or reviewed reference.

**TARGET REQUIREMENT —** Aliases are accepted only at catalog/import
boundaries, resolve once to a canonical ID, and never appear in a plan,
assignment, applied configuration, diagnostic identity, or saved reference.

**TARGET REQUIREMENT —** Definitions are immutable, declarative,
JSON-compatible data. They contain no React components, callbacks, setters,
owner object paths, DOM references, template pixels, executable adapters,
network locations, project content, or native handles.

### Concrete-region and coordinate-basis registry

| Claim class | Concrete region ID | Physical output | User section | Permitted current geometry bases | Current owner container |
| --- | --- | --- | --- | --- | --- |
| TARGET REQUIREMENT | `front-cover` | Front Cover | Front | `front`, `frontSafe`, or an explicitly owner-derived Front region | `caseInsert.templates.cover` |
| TARGET REQUIREMENT | `tray-card` | Complete Tray Card | Back | `back`, `backSafe`, or an explicitly owner-derived full-Tray region | `caseInsert.templates.tray` |
| TARGET REQUIREMENT | `back-panel` | Complete Tray Card | Back | `backPanel`, `backPanelSafe`, or an explicitly owner-derived Back Panel region | `caseInsert.templates.tray` |
| TARGET REQUIREMENT | `left-spine` | Complete Tray Card | Spine | `leftSpine`, `leftSpineSafe`, or an explicitly owner-derived Left Spine region | `caseInsert.spine.left` |
| TARGET REQUIREMENT | `right-spine` | Complete Tray Card | Spine | `rightSpine`, `rightSpineSafe`, or an explicitly owner-derived Right Spine region | `caseInsert.spine.right` |

**TARGET REQUIREMENT —** `tray-card` is reserved for content intentionally
spanning the complete physical Tray Card, such as the current Tray background.
`back-panel` excludes both spine strips. `back` and `backPanel` are never
synonyms.

**TARGET REQUIREMENT —** Compatibility evaluation is pure and checks at least:
preset format/revision availability, Case project kind, supported physical
template identity/version, every declared concrete region and coordinate
basis, every role/slot/owner adapter, stable object availability, required
content capabilities, declared fitting/loss policies, and supported application
scope.

**TARGET REQUIREMENT —** Compatibility produces `compatible`,
`compatible-with-warnings`, or `incompatible` plus stable reasons. It must not
change the selected Case template, create content, enable features, normalize
the live project, or update owner state to make a preset fit.

**TARGET REQUIREMENT —** A definition is rejected if it infers section from X/Y
coordinates, uses visible labels or array positions as identity, treats `spine`
as a stored assignment target, gives Back content a full-Tray basis without an
explicit `tray-card` assignment, or requests a coordinate basis incompatible
with its concrete region.

## 5. Workflow entry and semantic operations

**TARGET REQUIREMENT —** The Case workflow reserves these exact
presentation-neutral operation IDs:

- `case.layoutPreset.select`
- `case.layoutPreset.plan`
- `case.layoutPreset.apply`
- `case.layoutPreset.reapply`
- `case.layoutPreset.detach`

**TARGET REQUIREMENT —** The future navigation vocabulary is reserved as
`workflow.case-layout-presets`, `area.layout-presets.case`,
`owner.case-layout-presets`, and
`control.case-layout-presets.selector`. Navigation to that destination only
reveals/focuses the workflow.

### Operation registry

| Claim class | Operation ID | Principal input | Mutability | Busy scope | Required result values |
| --- | --- | --- | --- | --- | --- |
| TARGET REQUIREMENT | `case.layoutPreset.select` | Candidate canonical preset reference | None | Owner-local selection | `selected`, `cancelled`, `unavailable`, `failure` |
| TARGET REQUIREMENT | `case.layoutPreset.plan` | Exact selected reference, session ID, base revision, template identity, explicit requested scope, current applied configuration, immutable owner snapshot | None | Replaceable `case.layoutPreset.plan` | `planned`, `no-op`, `blocked`, `stale`, `cancelled`, `failure` |
| TARGET REQUIREMENT | `case.layoutPreset.apply` | Fresh accepted Apply plan | One atomic Case/configuration commit | Exclusive `project.mutation` plus preset capability | `applied`, `no-op`, `declined`, `stale`, `conflict`, `failure` |
| TARGET REQUIREMENT | `case.layoutPreset.reapply` | Fresh accepted Reapply plan for exact current reference/scope plus customization consent | One atomic Case/configuration commit | Same exclusive scope | `reapplied`, `no-op`, `declined`, `stale`, `conflict`, `failure` |
| TARGET REQUIREMENT | `case.layoutPreset.detach` | Fresh accepted Detach plan and exact assignment/configuration scope | One atomic association-only commit | Same exclusive scope | `detached`, `no-op`, `declined`, `stale`, `conflict`, `failure` |

**TARGET REQUIREMENT —** Every adapter—future menu, sidebar compatibility
control, Game review, Guided consumer, preview affordance, or shortcut—dispatches
these owners. No adapter may copy catalog lookup, compatibility, planning,
scope resolution, mutation, fitting, feedback, or focus rules.

**TARGET REQUIREMENT —** Opening the workflow, selecting a preset, or focusing
Apply must not start Plan, Apply, Reapply, or Detach implicitly.

## 6. Selection, planning, and review

**TARGET REQUIREMENT —** Selection is session-only and non-dirty. It stores an
exact candidate reference and may survive ordinary workflow focus changes in
the same retained session, but it is cleared or revalidated when the session,
catalog, project kind, or exact definition availability changes.

**TARGET REQUIREMENT —** Every Plan request carries an explicit requested
scope. Scope resolution is deterministic.

| Claim class | Requested scope | Required concrete resolution | Mutation isolation |
| --- | --- | --- | --- |
| TARGET REQUIREMENT | One region | Exactly one of `front-cover`, `tray-card`, `back-panel`, `left-spine`, `right-spine` | Only assignments in that region may change |
| TARGET REQUIREMENT | Front section | Declared `front-cover` assignments | No Tray/Back/Spine owner changes |
| TARGET REQUIREMENT | Back section | Declared `back-panel` and explicitly declared `tray-card` assignments | No Front or spine-side owner changes; a `tray-card` visual may span the physical spine strips without mutating spine owners |
| TARGET REQUIREMENT | Spine section | Declared `left-spine` and/or `right-spine` assignments resolved explicitly before review | No Front or Tray-owner changes |
| TARGET REQUIREMENT | Complete preset | Every concrete region declared by that exact definition/revision | All affected owners plan first and commit together |

**TARGET REQUIREMENT —** A user-facing section is only a scope request. The
immutable plan records the resolved concrete region set and the assignment set;
commit never re-resolves from current UI tab, mirror mode, labels, or array
order.

**TARGET REQUIREMENT —** A Plan contains at least:

- deterministic plan-format/version and operation identity, exact preset
  ID/revision, and catalog provenance; wall-clock or random identity must not
  make semantically equivalent pure plans differ;
- session ID, base application-snapshot revision (the pure field remains named
  `projectRevision`), Case project kind, template identity, and
  current applied-configuration identity;
- requested scope and sorted resolved concrete-region IDs;
- immutable before-state identity, exact field-level proposed values, and
  sufficient preconditions/footprint for the later pure atomic transition to
  construct one complete proposed next Case aggregate;
- every assignment identity, role/slot/object target, coordinate basis,
  placement/fitting action, response policy, and affected owner fields;
- content-preservation classification and explicit enable/create/replace/
  delete/crop/loss actions;
- customization and detachment effects, including side-specific overwrite
  consent requirements;
- warnings, blockers, skips, no-ops, diagnostics, focus targets, and cleanup
  ownership; and
- one deterministic proposal boundary that requires no DOM, network, picker,
  measurement discovery, or component-local state during the later transition
  or commit.

**TARGET REQUIREMENT —** Planning snapshots all affected owners before
constructing any update. A complete-preset or multi-region plan fails or warns
before Review if any required assignment cannot resolve. It never mutates one
region while still discovering whether another can be planned.

### Review requirements

| Claim class | Review concern | Required disclosure |
| --- | --- | --- |
| TARGET REQUIREMENT | Scope | Requested section/region and exact concrete regions that will change |
| TARGET REQUIREMENT | Physical effect | Front output versus complete Tray output, including any explicit full-Tray background span |
| TARGET REQUIREMENT | Owners | Exact semantic role, stable slot/object identity, and current owner container |
| TARGET REQUIREMENT | Geometry | Coordinate basis, before/after placement, fit/clamp/reflow, and clipping implications |
| TARGET REQUIREMENT | Content | Preserved content and every explicit enable/create/replace/delete/crop/loss action |
| TARGET REQUIREMENT | Spines | Independent left/right impacts and whether both sides were intentionally selected |
| TARGET REQUIREMENT | Customization | Every customized assignment that Reapply would overwrite |
| TARGET REQUIREMENT | Problems | Skips, warnings, blockers, unsupported assignments, and recovery options |

**TARGET REQUIREMENT —** Review acceptance is tied to the exact immutable plan.
Changing the project, session, template, definition availability, accepted
scope, action selection, or material/loss consent invalidates acceptance and
requires a fresh plan.

## 7. Atomic application and session effects

**TARGET REQUIREMENT —** Apply and Reapply validate the exact session ID,
current revision, project kind, template identity, preset reference, plan
identity, scope, and current configuration immediately before commit.

**CURRENT FACT —** The implemented pure atomic first-time Apply transition
consumes one reviewed, consent-complete, still-current immutable plan and
produces one complete normalized detached `ProjectJewelCaseState` plus one
deeply immutable, explicitly uninstalled applied-configuration candidate. It
preflights all actions before returning either output and returns neither on a
typed failure. It does not install the candidate or touch lifecycle state.

**CURRENT FACT —** The pure Detach planner is report-free and definition-free.
It validates the source configuration's deterministic identity and complete
canonical footprint, current session/revision/template and exact normalized
snapshot, every direct stable target, enablement fact, and exact semantic value
before returning any actionable output. Every source-owned address appears once
as both a complete-ownership release and an exact-current-value preservation;
there are no aggregate actions, retained/new claims, replacement revision,
overwrite/preserve policy, successor configuration, review acceptance, or
consent acceptance. A blocker returns a typed failure with no partial plan or
projection. The plan's projected ownership absence remains non-authoritative;
only a separately reviewed successful pure Detach transition produces
authoritative configuration-release evidence.

**CURRENT FACT —** The pure Detach transition consumes only that exact deeply
frozen plan, the named authoritative source configuration, one exact plan-bound
review acceptance, the exact declared material-consent acceptance set (empty in
v1), and the still-current normalized Case aggregate/snapshot/context. It
recomputes structural and deterministic plan, review, acceptance, configuration,
and transition identities; validates the complete source/release/preservation/
precondition footprint; and directly rechecks every stable address, exact value,
and enablement fact. All validation completes before any aggregate, release
result, or transition identity is constructed. It never reruns planning,
customization detection, compatibility evaluation, assignment resolution,
catalog lookup, Apply, Reapply, or an aggregate writer. Success returns one
deeply immutable detached aggregate that preserves caller ordering and every
semantic value exactly, together with authoritative pure release evidence that
classifies meaningful complete ownership release and aggregate semantic
no-write. It returns no next configuration and explicitly records that
application/store adoption has not occurred. Any blocker returns a typed failure
containing neither output.

**CURRENT FACT —**
`src/presets/caseInsertPresetConfigurationAdoptionModel.ts` now owns the pure
application attachment vocabulary. `unattached` is one canonical frozen value;
`attached` contains exactly one complete configuration accepted by the existing
configuration validator and a deterministic attachment identity. Release
evidence, aggregate values, null, undefined, empty objects, multiple
configurations, tombstones, and caller-authored status strings are not
attachment state. The wrapper leaves the nested configuration's established
`attachmentStatus: detached-uninstalled` unchanged: that field describes the
configuration artifact's lifecycle-detached origin and identity, not whether a
later application session has attached the wrapper.

**CURRENT FACT —** The same model defines one immutable application snapshot
whose exact `CaseInsertPresetAssignmentSnapshot` carries normalized Case
aggregate plus session/revision/template context and whose attachment wrapper
travels beside it. A successful adoption result has only one successor
snapshot field, and its operation-discriminated result/receipt types require
Apply/attached, Reapply/replaced, or Detach/released-to-absence edges; they cannot
expose separate aggregate/configuration successes or pair a Detach success with
an attached successor. The success variants require a private coherence proof,
so no caller can structurally assemble an adopted success. A pure
attachment-edge classifier rejects replay, missing, different-source, and
tombstone edges. The model module is not a store, reducer, project record,
history entry, persisted schema, or transition executor.

**CURRENT FACT —** The transition-evidence antecedent is now complete. All
three operations expose content-complete, operation-discriminated success
evidence accepted only by their owning strict whole-success validator.

| Operation | Exact source endpoint | Exact successor endpoint | Complete aggregate evidence | Inert audit result |
| --- | --- | --- | --- | --- |
| Apply | Canonical authoritative absence | One exact promoted Apply configuration | Full source and result normalized Case aggregates and content identities; operation/context/plan/review/consent lineage; transition and whole-success identities | `validated-inert-evidence` with opaque Apply evidence and `applicationAdoptionStatus: not-adopted` |
| Reapply | One exact authoritative source configuration | One exact validated successor configuration | Full source and result normalized Case aggregates and content identities; prior configuration transition, operation/context/plan/review/consent lineage; transition and whole-success identities | `validated-inert-evidence` with opaque Reapply evidence and `applicationAdoptionStatus: not-adopted` |
| Detach | One exact authoritative source configuration | Canonical authoritative absence | Full source and unchanged-semantic result normalized Case aggregates with the same content identity; exact release identity; operation/context/plan/review/consent lineage; transition and whole-success identities | `validated-inert-evidence` with opaque Detach evidence and `applicationAdoptionStatus: not-adopted` |

**CURRENT FACT —** The aggregate identity uses deterministic typed encoding plus
a pure synchronous SHA-256 digest. Record property ordering is canonicalized;
semantic arrays preserve their order. The unchanged v1 encoding is planned and
emitted incrementally into a fixed-buffer SHA-256 owner, so aggregate identity
does not materialize a complete encoded string, UTF-8 copy, or padded-message
copy. The SHA and UTF-8 chunk buffers stay bounded independently of large
scalar-string payload length; the deterministic encoding plan still scales
with the aggregate's structural node count. No identity uses generic JSON
serialization, randomness, timestamps, rounding, process state, object
identity, Web Crypto, Node crypto, React, DOM, Tauri, filesystem, or runtime
services.
Strict validators reject wrong operation/version/status, partial or malformed
aggregates, cyclic/hostile input, forged identities, endpoint substitution,
configuration substitution, lineage substitution, and mixed authentic fields
from different successes. Legacy success shapes remain recognized only to fail
closed as `aggregate-evidence-insufficient`.

**OPEN QUESTION —** Exact flat v1 SHA-256 remains synchronously linear in the
complete encoded aggregate. Bounded streaming removes complete encoded-string,
UTF-8, and padded-message temporary copies for large scalar strings, but the
encoding plan retains structural-node-scaled working memory and the digest does
not guarantee low-latency editor synchronization for projects containing large
embedded assets. A compositional identity, async worker, native/platform
digest, or lower live aggregate limit would require a separate contract
decision.

**CURRENT FACT —** The adoption evidence audit validates the operation-specific
whole success and returns only an opaque branded evidence union. It does not
return an application snapshot, successor attachment, adopted status, receipt,
executor, or callable authority. `applicationAdoptionStatus: not-adopted`
remains required at the transition root and inside its bound success evidence.

**CURRENT FACT —** The same source owner now exposes a second fail-closed audit
for one complete validated-adoption success bundle. The versioned union is
discriminated by `apply`, `reapply`, or `detach` and retains the exact current
application snapshot, opaque audited evidence, and adoption success. Audit
revalidates the current snapshot and evidence, reconstructs the canonical
expected adoption result, and requires the supplied success and receipt to
match it exactly. This source-owned bundle is the only adoption-success input
accepted by the lifecycle preparer; callers cannot substitute a loose receipt,
aggregate, attachment, configuration, revision, or raw operation evidence.

**CURRENT FACT / TARGET REQUIREMENT —** The pure adoption authority accepts
only these legal
attachment edges. Every session, revision, template, aggregate, configuration,
and evidence mismatch fails as a conflict with no successor state.

| Evidence | Required current attachment | Exact aggregate result | Successor attachment | Replay/out-of-order rule |
| --- | --- | --- | --- | --- |
| First Apply success | Canonical authoritative absence | Exact Apply transition result aggregate | Exact promoted Apply successor configuration, wrapped as attached | Any existing attachment or changed session/revision/template/aggregate is a conflict |
| Reapply success | Exact source configuration identity and contents named by the amended evidence | Exact Reapply transition result aggregate | Exact Reapply successor configuration, wrapped as attached | Missing/different attachment or changed session/revision/template/aggregate is a conflict |
| Detach success | Exact source configuration identity, contents, and footprint named by the amended release evidence | Exact unchanged-semantic Detach transition result aggregate | Canonical authoritative absence | Missing/different attachment or changed session/revision/template/aggregate is a conflict |

**CURRENT FACT / TARGET REQUIREMENT —** All three operations use strict
compare-and-swap
preconditions: one complete successful deeply immutable transition result of
the exact supported operation/version; transition-bound
`applicationAdoptionStatus: not-adopted`; exact project kind, session ID,
current application revision, template ID/revision, assignment/application snapshot
context, source aggregate identity, result aggregate identity, and current
attachment identity; valid configuration/release versions and identities; and
one whole-success bundle identity accepted by its owning validator. Apply also
requires attachment absence and exact promoted successor configuration.
Reapply also requires the complete exact source configuration still attached
and its exact successor configuration. Detach also requires the complete exact
source configuration and footprint still attached, release evidence naming that
configuration, an exact unchanged-semantic aggregate, and canonical absence as
the only successor attachment. A repeated result after any source fact changes
is a conflict, not silent idempotent success; out-of-order evidence cannot skip
an attachment edge.

**CURRENT FACT / TARGET REQUIREMENT —** The deeply immutable receipt records
the supported receipt format/version, operation, deterministic adoption
identity, consumed transition and whole-success identities, source/successor
application identities, source/result aggregate identities, source/successor
configuration and release identities, previous/successor attachment identities
or canonical absence, complete source/successor application context and
revision facts, exact aggregate-adoption
classification, and exactly one attachment action: `attached`, `replaced`, or
`released`. It records `applicationAdoptionStatus: adopted`, proves aggregate
and attachment were one coherent application-domain result with no partial
success, and records `persistence.status: not-persisted` plus explicit
non-integration of project schema, save/load, store, UI, catalog, and runtime.
It is not a configuration, release record, persisted project, store transaction,
save result, catalog installation, or UI confirmation. The private coherence
proof keeps the adopted success/receipt pair uninhabitable through structural
caller construction; the transition alone produces it after strict validation.

**CURRENT FACT —**
`src/presets/caseInsertPresetApplicationAdoptionTransition.ts` is that pure
atomic authority. It accepts one versioned exact operation request containing
one current immutable application snapshot and one opaque audited evidence
value, treats both as untrusted input, revalidates the owning whole-success
bundle, and checks exact project/session/revision/template, source/result
aggregate, source/successor attachment, configuration, release, and adoption
status facts. Apply attaches exactly its promoted configuration, Reapply
replaces the exact source with its distinct successor, and Detach preserves
aggregate semantics while returning canonical absence. Success increments the
application snapshot revision exactly once because every legal edge changes
attachment/configuration state; it preserves session, template, and project
kind. Replay, out-of-order evidence, substitution, aliases, accessors, hostile
prototypes, cycles, functions, and thenables fail with a deeply immutable typed
error that contains no successor, receipt, adoption identity, or actionable
transition structure. Inputs and inert evidence remain unchanged and
`not-adopted`.

**CURRENT FACT —** The passive lifecycle owner can project the exact current
pure `CaseInsertPresetApplicationSnapshot` from the Case session and can
represent an already-validated Apply, Reapply, or Detach successor snapshot
without installing it or advancing its revision. The existing pure snapshot
field `snapshot.identity.projectRevision` is populated from the lifecycle
companion's distinct `applicationRevision`; that compatibility spelling does
not make it the persisted-content `ProjectSession.revision`. Every supplied
aggregate, attachment, revision, assignment context, and application-state
identity is recomputed and checked as one unit before exposure.

**CURRENT FACT —**
`src/lifecycle/caseInsertPresetSessionApplicationCommit.ts` implements the pure
lifecycle-owned preparation and commit boundary. Preparation consumes one exact
source Case `ProjectSession` plus the source-owned validated-adoption success
bundle. It derives the complete successor project/session, preserves every
unaffected project field and all session metadata, and returns one versioned,
operation-discriminated, deterministic authorization envelope containing the
full detached source session, full detached successor session, complete bundle,
and envelope identity. The pure commit consumes only a separately supplied
current Case session and that complete envelope, re-audits the bundle and
successor, recomputes the envelope identity, and requires exact full-session
compare-and-swap equality. Session ID, project/content revision, application
revision, template and assignment context, aggregate, attachment/configuration,
application-state identity, all project content outside the Case aggregate,
path, persistence format, display identity, baseline, route, and remaining
session metadata are therefore stale-authority dimensions rather than partial
setters.

**CURRENT FACT —** Commit success returns exactly one complete successor
`ProjectSession` and the existing operation-discriminated adoption receipt
atomically; the lifecycle adapter does not mint a second receipt. A typed
failure returns neither session nor receipt. Apply, Reapply, and Detach remain
distinct at every bundle, envelope, result, and receipt boundary. Replay against
the already-produced successor is a typed failure, not idempotent success.

**CURRENT FACT —** New and loaded Case sessions begin with canonical
authoritative `unattached` state and application revision zero. Disc sessions
have no Case companion. When committed editor synchronization changes canonical
project content, the existing content revision advances once. For Case, the
companion preserves its exact attachment and advances its application revision
once only when the reconstructed application snapshot changes semantically.
Thus a Case aggregate edit advances both counters once, a canonical content
no-op advances neither, and a content change outside the Case aggregate leaves
the application revision unchanged. Customization-producing editor changes do
not implicitly detach the configuration.

**CURRENT FACT —** Lifecycle/session equality compares the complete Case
companion in addition to persisted content, baseline, route, and other session
metadata. Attachment-only or application-revision-only changes are therefore
observable and cannot collapse into a store no-op. Canonical dirty comparison,
clean baselines, Save capture, and project serialization continue to inspect
only normalized persisted project content. An attachment-only change does not
dirty a clean project.

**CURRENT FACT / TARGET REQUIREMENT —** The pure lifecycle commit adapter
constructs and authorizes the accepted Case aggregate together with either the
Apply/Reapply next configuration or canonical authoritative absence for Detach
as one successor session. Detach release evidence is consumed as authorization
and is not the successor attachment. The lifecycle command/store bridge now
installs only that complete returned session once through one
`project.mutation` operation and one lifecycle-store transition; calling
individual React setters or owner callbacks in a fallible sequence remains
prohibited. Runtime workflow orchestration that produces and dispatches the
authorization remains disconnected.

**TARGET REQUIREMENT —** Multi-region Apply/Reapply/Detach is all-or-nothing.
There is no partial success status that leaves Front changed while Back or a
spine failed. A blocker or commit failure leaves every Case owner,
configuration, project/content revision, application revision, dirty state,
navigation state, and history
boundary unchanged.

**CURRENT FACT / TARGET REQUIREMENT —** The pure adapter increments the existing
project/content revision exactly once when the Case aggregate changes and zero
times when aggregate semantics are unchanged. Separately, every accepted
Apply/Reapply/Detach carries the pure transition's exact one-step successor
application revision into the successor session without incrementing it again.
Aggregate-semantic no-op Apply/Reapply and aggregate-unchanged Detach therefore
leave project/content revision unchanged while remaining observable application
transitions because attachment and application revision change. There is no
exact application-domain no-op among the legal Apply/Reapply/Detach attachment
edges. The store command does not add history; a future history integration
must represent one content-changing adoption as one transaction.

**CURRENT FACT / TARGET REQUIREMENT —** The pure successor and implemented
store installation preserve the active session ID, current path, persistence
format, clean baseline, display identity, project kind, route, and all unrelated
project/session state. Dirty state remains derived from committed canonical
project content against the unchanged baseline and ignores the session-only
attachment, application revision, assignment/application identities, and
adoption receipt.

**TARGET REQUIREMENT —** Detach commits only association/configuration changes.
It preserves the exact current content, enabled payloads, sources, geometry,
fit/crop, styles, and left/right owner values.

**TARGET REQUIREMENT —** Save cannot observe a half-applied Case. Save either
captures the stable before-state, waits/rejects under shared busy arbitration,
or captures the complete after-state.

## 8. Role, slot, section, and content ownership

**TARGET REQUIREMENT —** Preset assignments do not require a redundant
`section` field on each Case project object. Existing containers remain the
physical ownership authority. Section and concrete-region identity belong to
the preset definition/plan and any future applied configuration.

### Assignment identity model

| Claim class | Identity part | Requirement |
| --- | --- | --- |
| TARGET REQUIREMENT | Preset | Exact canonical preset ID and positive revision |
| TARGET REQUIREMENT | Region | One exact concrete design-region ID |
| TARGET REQUIREMENT | Role | Stable semantic preset role ID, adapted explicitly to a current role/owner |
| TARGET REQUIREMENT | Slot | Stable preset slot ID unique within the exact definition/revision |
| TARGET REQUIREMENT | Owner | Closed trusted feature-owner identity, never a parsed project object path |
| TARGET REQUIREMENT | Object | Stable current object ID for repeated objects, or a canonical synthetic ID for fixed primary owners |
| TARGET REQUIREMENT | Target presence | Explicit `required` or `optional` existence classification; it does not authorize creation, enablement, warning policy, or mutation |
| TARGET REQUIREMENT | Coordinates | Explicit compatible template/owner-derived basis plus normalized content/action regions |
| TARGET REQUIREMENT | Actions | Allowlisted placement, fitting, enablement/material/loss, and event-scoped response policy |

**TARGET REQUIREMENT —** Repeated `artworkSlots`, `logoSlots`, and `markSlots`
bind by stable object `id`. They never bind by current index, visible label,
source URL, mark value alone, or incidental array order. Fixed primary owners
may use canonical synthetic identities such as `case:cover:background`,
`case:tray:title-artwork`, or `case:spine:left:background` without changing the
project object's schema.

### Front Cover role-to-owner matrix

| Claim class | Role | Concrete region | Current owner mapping | Preset boundary |
| --- | --- | --- | --- | --- |
| CURRENT FACT / TARGET REQUIREMENT | Game Title artwork and text fallback | `front-cover` | `caseInsert.templates.cover.titleArtwork`; `cover-title-text` | Treat artwork and text as distinct assignments under one reviewed role; preserve payload/source |
| CURRENT FACT / TARGET REQUIREMENT | Background Image | `front-cover` | `caseInsert.templates.cover.background` | Placement/fit only unless explicit reviewed content action |
| CURRENT FACT / TARGET REQUIREMENT | Game Info Logos | `front-cover` | `caseInsert.templates.cover.markSlots` plus branding source projection | Preserve rating/media/platform/technical family identity |
| CURRENT FACT / TARGET REQUIREMENT | Company Logos | `front-cover` | `caseInsert.templates.cover.logoSlots` | Bind each repeated logo by stable slot ID |
| CURRENT FACT / TARGET REQUIREMENT | Legal Info | `front-cover` | `cover-copyright-text` | Preserve text/source/rich content; place through text owner |
| CURRENT FACT / TARGET REQUIREMENT | Additional Artwork | `front-cover` | `additionalArtworkEnabled`; `artworkSlots` | Preserve user-created slots; target only explicit IDs |
| CURRENT FACT / TARGET REQUIREMENT | Additional Text | `front-cover` | Fixed Cover subtitle/disc/date/App/developer/publisher/install/custom-note text blocks | Each known row is a distinct owner object |
| CURRENT FACT / OPEN QUESTION | Front Steam branding | `front-cover` if later declared | `caseInsert.templates.cover.steamBanner` exists and currently defaults enabled | Preset classification must be explicitly approved; setup/output identity must not be inferred from the Spine role |

### Back Panel and complete Tray role-to-owner matrix

| Claim class | Role | Concrete region | Current owner mapping | Preset boundary |
| --- | --- | --- | --- | --- |
| CURRENT FACT / TARGET REQUIREMENT | Back Background | `tray-card` | `caseInsert.templates.tray.background` fitted to complete `back` surface | Full-Tray span is intentional and must be disclosed; it is not Back Panel geometry |
| CURRENT FACT / TARGET REQUIREMENT | Optional Game Title artwork/text | `back-panel` | Tray `titleArtwork`; `tray-title-text` | Distinct reviewed assignments; preserve content/source |
| CURRENT FACT / TARGET REQUIREMENT | Game Description | `back-panel` | `tray-description` | Preserve chosen text and rich-text state; #181 fitting remains separate |
| CURRENT FACT / TARGET REQUIREMENT | Feature Bullets / Callouts | `back-panel` | `tray-feature-bullets` text list | Preserve item content/order unless an explicit content action is reviewed |
| CURRENT FACT / TARGET REQUIREMENT | Screenshots | `back-panel` | Tray `additionalArtworkEnabled`; Tray `artworkSlots` | Semantically Screenshots; bind by slot ID |
| CURRENT FACT / TARGET REQUIREMENT | Game Info Logos | `back-panel` | Tray `markSlots` plus branding source projection | Keep rating/media/platform/technical family identity explicit |
| CURRENT FACT / TARGET REQUIREMENT | Company Logos | `back-panel` | Tray `logoSlots` | Bind repeated logos by stable slot ID |
| CURRENT FACT / TARGET REQUIREMENT | Minimum Requirements | `back-panel` | `tray-minimum-requirements` | Dedicated text assignment |
| CURRENT FACT / TARGET REQUIREMENT | Recommended Requirements | `back-panel` | `tray-recommended-requirements` | Dedicated text assignment |
| CURRENT FACT / TARGET REQUIREMENT | Legal Info | `back-panel` | `tray-copyright-text` | Dedicated text assignment |
| CURRENT FACT / TARGET REQUIREMENT | Additional Text | `back-panel` | Fixed Tray subtitle/disc/date/App/developer/publisher/install/custom-note rows | Keep dedicated description/requirements/legal rows out of this family |
| CURRENT FACT | Generic Back Additional Artwork | None distinct | No separate current owner; Tray `artworkSlots` are Screenshots | Do not invent a second family, duplicate slots, or claim implementation |

### Left and right Spine role-to-owner matrix

| Claim class | Role | Concrete region | Current owner mapping per side | Preset boundary |
| --- | --- | --- | --- | --- |
| CURRENT FACT / OPEN QUESTION | Steam branding | `left-spine` or `right-spine` | Side `steamBanner` | Visible output exists, but setup-versus-role classification remains unresolved; no preset target until definition authority decides |
| CURRENT FACT / TARGET REQUIREMENT | Vertical Game Logo or Game Title | Side-specific | Side `titleArtwork`; side `title` | Separate artwork/text assignments; never erase side identity |
| CURRENT FACT / TARGET REQUIREMENT | Company Logo | Side-specific | Side `logoSlots` | Bind each slot by stable side-scoped ID |
| CURRENT FACT / TARGET REQUIREMENT | Optional Media Format Type | Side-specific | Media-family projection within side `markSlots` | Must remain separate from remaining Game Info Logos |
| CURRENT FACT / TARGET REQUIREMENT | Game Info Logos | Side-specific | Rating/platform/technical projections within side `markSlots` | Media format excluded; families remain explicit |
| CURRENT FACT / TARGET REQUIREMENT | Spine Background | Side-specific | Side `background` | Current background image owner; do not invent a separate color-only owner |
| CURRENT FACT / TARGET REQUIREMENT | Additional Text | Side-specific | Side fixed subtitle/disc/date/App/developer/publisher/install/custom-note text blocks | Distinct stable text-block IDs |
| CURRENT FACT / TARGET REQUIREMENT | Legal Info | Side-specific | Side copyright text block | Preserve content/source/style |

**TARGET REQUIREMENT —** No assignment crosses owner containers implicitly.
Visual overlap on the complete Tray output does not authorize a Back assignment
to mutate a spine owner or a spine assignment to mutate the Tray owner.

## 9. Content preservation and feature enablement

**TARGET REQUIREMENT —** Preservation is the default. A preset applies declared
layout/placement presentation to existing owner state; it is not permission to
replace content.

### Preservation and explicit-action matrix

| Claim class | Existing value/effect | Default | Only permitted change path |
| --- | --- | --- | --- |
| TARGET REQUIREMENT | Uploaded/imported image bytes and provenance | Preserve | Explicit reviewed replacement action with staged validated payload |
| TARGET REQUIREMENT | Text, rich-text source, metadata binding, manual override | Preserve | Explicit reviewed content/source action |
| TARGET REQUIREMENT | Selected branding mark and custom mark/logo image | Preserve | Explicit reviewed owner-specific replacement |
| TARGET REQUIREMENT | Disabled feature payload | Preserve in full | Explicit enable/disable action; disabling never clears payload |
| TARGET REQUIREMENT | Repeated user-created object | Preserve | Explicit stable-ID assignment; creation/deletion is separately reviewed |
| TARGET REQUIREMENT | Frame/material/style | Preserve | Explicit allowlisted action shown in Review |
| TARGET REQUIREMENT | Crop/fit/source choice | Preserve | Exact declared fitting/content action with loss disclosure |
| TARGET REQUIREMENT | Untargeted region/owner/field | Preserve | Cannot change in this operation |

**TARGET REQUIREMENT —** Enablement is independent from placement. A preset may
enable an intended populated role only when the definition declares enablement
and Review shows it. It may not enable blank content merely to make a layout
look complete, nor disable unrelated visible content to free space.

**TARGET REQUIREMENT —** Creation, replacement, deletion, cropping, lossy
fitting, or content reduction is never an incidental placement side effect.
Each requires an exact plan action, warning/consent where loss is possible, and
owner support. The first implementation should reject unsupported destructive
actions rather than approximate them.

**TARGET REQUIREMENT —** Blank projects remain valid. A missing role/object
resolves according to the definition's explicit `skip`, `warn`, `block`, or
reviewed `create` policy. A preset never invents copy, artwork, logos, marks,
requirements, or asymmetric spine content.

## 10. Deterministic placement, fitting, clamping, and reflow

**TARGET REQUIREMENT —** Normalized coordinates are interpreted only within an
assignment's explicit coordinate basis. The workflow converts that basis
through the current Case template/layout helpers; it never reads viewport,
DOM, zoom, device-pixel-ratio, browser window, or screenshot dimensions as
preset geometry.

**TARGET REQUIREMENT —** Placement planning reuses Case-owned visual bounds,
text measurement, safe-region, avoidance, transform, and image-fit helpers.
Preset code coordinates their results but does not duplicate their math.

**CURRENT FACT —** The implemented direct-layout v1 planner intentionally
supports only owner fields that can be derived without runtime/render
measurement. It converts the assignment's normalized `contentRegion` from its
declared template basis into the owner's canonical template basis. Foreground
image owners receive `layout-x`, `layout-y`, and an explicit `layout-scale`
equal to the smaller converted normalized dimension divided by 100; background
owners receive signed `layout-x`/`layout-y` offsets from the converted center
plus the same direct scale; text block/list owners receive `layout-x`,
`layout-y`, and `layout-width`. All other fields are preservation decisions. A
converted region outside the owner's canonical basis blocks rather than
clamping. Text height is review information only and emits the #181
fitting-deferred warning; any
`actionRegion` request returns a typed unsupported action because no fitting,
clamp, crop, reflow, or content-loss policy is yet declared by the Case v1
definition vocabulary.

| Claim class | Action | Exact meaning | Preservation/loss rule |
| --- | --- | --- | --- |
| TARGET REQUIREMENT | Contain | Scale complete content within declared region without clipping | Preserve aspect ratio; empty space is allowed |
| TARGET REQUIREMENT | Cover | Scale content to cover declared region | Preserve aspect ratio; clipping/crop risk must be declared |
| TARGET REQUIREMENT | Crop | Select a source subregion or crop offset | Explicit lossy action with reviewed bounds |
| TARGET REQUIREMENT | Scale | Apply an owner-supported scale without changing fit mode | Must remain within owner limits and safe arithmetic |
| TARGET REQUIREMENT | Text wrapping | Break existing text into lines under text-owner rules | Does not shorten or rewrite content |
| TARGET REQUIREMENT | Text fitting | Adjust supported font/layout values to satisfy declared bounds | Must report minimum/readability failure; not content reduction |
| TARGET REQUIREMENT | Safe-region clamp | Move/limit owner geometry into the declared compatible safe basis | Report material displacement; preserve region identity |
| TARGET REQUIREMENT | Avoidance/reflow | Recompute placement against current occupied regions through owner helpers | Deterministic, bounded, and included in plan |
| TARGET REQUIREMENT | Render clipping | Renderer clips paint to its existing physical/feature region | Not a substitute for successful fitting |
| TARGET REQUIREMENT | Content reduction | Shorten, omit, reword, or delete content | Separate explicit destructive/content action; unsupported by this contract's first implementation |

**TARGET REQUIREMENT —** Complete Tray and Back Panel fitting remain distinct.
A Back text/image assignment uses `backPanel`/`backPanelSafe` and cannot claim
spine-strip pixels. Only a `tray-card` assignment may intentionally use
`back`/`backSafe`.

**TARGET REQUIREMENT —** Left/right spine geometry resolves independently,
including rotations, transformed visual bounds, safe clamping, and asymmetric
content dimensions. A coordinated Spine scope may share a declarative recipe,
but planning emits two explicit side assignments and two owner-derived results.

**CURRENT FACT —** Current Case Back copy support includes short/medium/full
variants and density warnings in import-related owners, while current layout
helpers wrap and fit existing text within bounded Case geometry. Issue #181
still owns final copy-choice and fitting feedback. This contract does not
implement automatic shortening, rewording, generalized fit policy, or content
reduction.

**TARGET REQUIREMENT —** The same canonical planned owner values must drive
preview and export. A preset definition or transient resolved rectangle is not
a renderer input after commit.

## 11. Manual customization, reapplication, and detachment

**TARGET REQUIREMENT —** A preset is an editable starting point, not a
continuous solver. Ordinary drag, slider, text, source, fit, visibility, asset,
mark, or style owners remain authoritative after Apply.

**CURRENT FACT —** The authoritative detached applied configuration records the
accepted preset-owned field footprint, exact last-applied semantic value, stable
owner/binding/object/field address, full role/slot/assignment provenance,
coalesced provenance, reviewed plan/warnings/consents, template, and historical
source snapshot identity. Its deterministic identity is derived through the
same length-prefixed encoding convention as Apply review identity, without
generic serialization, randomness, or time.

**CURRENT FACT —** Customization is derived by comparing only that footprint
with current canonical owner state. `clean` means every owned field still equals
its last-applied value; `customized` means at least one exact value diverges.
Untargeted layout, text/rich-text, image/provenance, metadata, branding, style,
fit/crop, rotation, or enablement changes do not falsely mark the configuration
customized. A changed value restored exactly becomes clean again. Divergence
proves neither edit history nor user intent, removes no ownership, chooses no
overwrite policy, and never detaches automatically.

**CURRENT FACT —** Pure Reapply planning treats the detector report as a
revision-bound input, not a request to detect again. Any session, revision,
template, exact target, enablement, current semantic value, or snapshot change
after detection makes the report stale or incompatible. The selected exact
definition is supplied directly and must retain the configuration's canonical
preset ID; the production Case catalog remains empty. Retained customized
fields require exactly one content-bound `overwrite-with-selected-preset` or
`preserve-current-customization` policy. Overwrite remains review-visible and
consent-gated even when its numeric write is a semantic no-op. Preserve retains
the exact current value, existing ownership, historical provenance, and prior
last-applied value without a write or partial Detach. New addresses are explicit
claims, removed addresses retire without restoring/resetting current values,
and address movement remains retirement plus new claim rather than role-based
retargeting. Back Panel/complete Tray, left/right spine, repeated stable IDs,
and disabled payload identity remain exact; mirror mode has no planning effect.

**CURRENT FACT —** Pure Reapply execution treats that reviewed plan as a strict
compare-and-swap boundary. It recomputes canonical plan/review and requirement
identities, requires one exact plan-bound review acceptance and exact set
equality for all declared material-consent acceptances, then rechecks source
configuration/report, session, revision, template, every exact target,
enablement, and current semantic field value. It does not rerun planning,
customization detection, compatibility, assignment resolution, catalog lookup,
geometry, or rendering. Any mismatch returns one deeply immutable typed failure
with no aggregate or configuration output.

**CURRENT FACT —** Reapply execution supports only exact reviewed `layout-x`,
`layout-y`, `layout-scale`, and `layout-width` writes. Retained clean and accepted
overwrite records adopt the selected value and provenance; overwrite remains
consent-gated even when it needs no numeric write. Preserve performs no write,
retains current value, ownership, prior last-applied value, and historical
provenance, and remains detectable as customized. A new claim may change only
configuration ownership when its current value is already selected. Retirement
performs no write and removes only the footprint record; movement remains one
retirement plus one new claim. Success returns one deterministic domain
configuration version `2` that is authoritative, deeply immutable, detached,
explicitly uninstalled, and unpersisted. Aggregate semantic no-write still
produces a configuration transition; a complete semantic no-op is not reachable
in this v1 Reapply protocol because accepted transition evidence and provenance
are authoritative configuration effects.

**CURRENT FACT —** Pure Detach execution is distinct from both Reapply
preservation and Reapply retirement. It accepts no overwrite/preserve policy,
selected definition, replacement revision, or customization report. Clean and
customized fields receive the same ownership-release treatment: the exact
current value and all other aggregate content remain unchanged, prior
last-applied values are not restored, and no owner is disabled or removed.
Back Panel and complete Tray remain separate addresses; left and right Spine
remain independent; mirror mode has no execution effect; and repeated objects
resolve only by exact stable ID. The result is immutable transition evidence,
not an applied configuration, tombstone, installation record, persisted removal,
or claim that application state already adopted the release.

**CURRENT FACT —** `detached-uninstalled` remains part of the validated applied
configuration's deterministic contents. It is not an application attachment
status, Detach receipt, adopted-release flag, or tombstone. Attaching a
configuration later must wrap it unchanged; adopting Detach later must replace
the wrapper with canonical authoritative absence and must not store the release
result as configuration state.

**TARGET REQUIREMENT —** No reactive effect continuously resets customized
values. A definition may declare a narrow event-scoped response such as
refitting the same assignment after its semantic image bounds change, but the
event, fields, compatibility, and no-recursion policy must be explicit.

### Spine customization matrix

| Claim class | Event | Required status/result |
| --- | --- | --- |
| TARGET REQUIREMENT | Apply intentionally targets both sides | Plan contains independent left/right assignments and commits both atomically |
| TARGET REQUIREMENT | Mirrored editing changes both sides later | Evaluate each side against its own assignment; both may become customized independently |
| TARGET REQUIREMENT | Mirroring is off and one side changes | Only that side's affected assignment becomes customized |
| TARGET REQUIREMENT | Reapply Spine | Fresh plan lists left/right overwrites separately and requires consent for each customized side in scope |
| TARGET REQUIREMENT | One side lacks content/object | Report side-specific skip/warning/blocker; do not copy or invent opposite-side content |
| TARGET REQUIREMENT | Detach Spine | Remove selected left/right associations while preserving both sides' current values |

**TARGET REQUIREMENT —** Current `spine.mirrored` may influence an ordinary
editor action, but a preset operation ignores it as an implicit fan-out signal.
Both-side application occurs only because the requested scope and reviewed
assignments explicitly include `left-spine` and `right-spine`.

**TARGET REQUIREMENT —** Reapply uses the same Plan and Review protocol as
Apply while remaining a distinct operation. It uses the same canonical preset
ID and one explicitly selected exact revision, rechecks compatibility, validates
the still-current customization report, identifies retained/new/retired/moved
assignments, and overwrites only the explicitly reviewed fields and scope.

**TARGET REQUIREMENT —** Detach never reverts to defaults and never clears
content. After Detach, current owner values behave like ordinary manual state;
the detached association receives no later preset response.

## 12. Persistence and incompatible-preset recovery

**CURRENT FACT —** Schema `0.2.0` persists explicit Case owner values and the
current mirror/export/editor compatibility fields, but no generic Case preset
identity, assignment, applied status, or resolved preset geometry.

**CURRENT FACT —** The lifecycle `caseInsertPresetApplication` companion is
session-only. It is not projected into `SavedCaseInsertProject`, package data,
the clean baseline, or canonical dirty comparison. New and Open Case sessions
derive the complete aggregate from authoritative project content but initialize
canonical `unattached` state at application revision zero. Save followed by
Open therefore begins a new unattached session; no attachment is inferred from
configuration provenance, coordinates, owner values, or visual similarity.

**TARGET REQUIREMENT —** This documentation slice changes no schema. Any future
applied-configuration persistence requires an explicit
[`PROJECT_FILE_SPEC.md`](PROJECT_FILE_SPEC.md) version, validation,
normalization, and migration decision.

### Future semantic persistence requirement

| Claim class | Persist in future applied configuration | Do not persist |
| --- | --- | --- |
| TARGET REQUIREMENT | Exact canonical preset ID and revision | Complete preset definition |
| TARGET REQUIREMENT | Accepted requested scope and resolved concrete-region set | Current navigation tab or workflow section expansion |
| TARGET REQUIREMENT | Concrete region, role, slot, trusted owner, stable object, and coordinate-basis assignment identities | DOM nodes/selectors, labels, array positions, viewport or resolved preview pixels |
| TARGET REQUIREMENT | Attached/customized/detached status and preset-owned field footprint/accepted values | Transient selection, immutable review plan, busy/progress/focus state |
| TARGET REQUIREMENT | Accepted material/loss policies and enough template compatibility identity to derive recovery state | Copied template geometry or renderer output |

**TARGET REQUIREMENT —** This table describes a separately authorized future
serialized configuration. It does not redefine the current lifecycle wrapper:
canonical `unattached` is authoritative application absence, while a nested
configuration's `detached-uninstalled` remains artifact provenance only and is
never persisted as an attachment tombstone by this slice.

**TARGET REQUIREMENT —** Load restores and normalizes explicit owner values
first. It never infers an applied preset from coordinates, owner values,
mirroring, current navigation, or Game/Guided state, and it never reapplies a
definition during restore.

**TARGET REQUIREMENT —** Recovery derives one of `current`, `stale`,
`incompatible`, or `unavailable` from the saved exact reference, catalog,
template, assignments, and current owners. Unknown/removed definitions do not
block project loading or erase owner values.

| Claim class | Recovery state | Required behavior |
| --- | --- | --- |
| TARGET REQUIREMENT | `current` | Exact definition/revision and bindings remain available; association may be attached or customized |
| TARGET REQUIREMENT | `stale` | Exact saved revision is available but a newer revision exists; keep exact reference and offer separately reviewed migration |
| TARGET REQUIREMENT | `incompatible` | Exact definition exists but template/region/owner binding no longer conforms; preserve values and offer Detach or supported recovery |
| TARGET REQUIREMENT | `unavailable` | Exact definition/revision is absent; preserve values and allow Detach without catalog substitution |

**OPEN QUESTION —** The exact JSON property names, configuration location,
fingerprint representation, and migration defaults belong to future
`PROJECT_FILE_SPEC.md` work. The semantic requirement and no-inference rule are
not open.

## 13. Geometry, preview, save, and export boundaries

**TARGET REQUIREMENT —** Physical Case geometry remains owned by the template
registry and layout helpers. A preset cannot change `templateType`, surface
dimensions, region/fold geometry, safe margins, export DPI, or guide identity
to satisfy compatibility.

**TARGET REQUIREMENT —** The physical-output mapping is exact.

| Claim class | Preset region(s) | Preview owner | PNG output | Export rule |
| --- | --- | --- | --- | --- |
| TARGET REQUIREMENT | `front-cover` | Cover template preview layers | Front Cover / Cover Sheet PNG | Render committed Cover owners through existing layer order |
| TARGET REQUIREMENT | `tray-card`, `back-panel`, `left-spine`, `right-spine` | Tray template layers plus explicit spine preview layer | One complete Tray Card PNG | Compose committed Tray and both side owners into the existing complete back surface; no standalone Spine PNG |

**TARGET REQUIREMENT —** Preview, Save, and Export consume committed owner state,
not catalog definitions, applied plans, review choices, or synthetic preset
pixels. Future applied configuration may describe association/customization but
cannot become a second visual truth.

**CURRENT FACT —** Current Save projection reads only the normalized persisted
project. It excludes Case attachment, application revision,
assignment/application identities, and adoption evidence while preserving the
exact `project.caseInsert` aggregate.

**TARGET REQUIREMENT —** Current Case layer order, clipping, guide projection,
drag/selection, inline text editing, and export renderers are unchanged by this
contract. A later implementation must prove preview/export parity for every
affected owner and both physical outputs.

**TARGET REQUIREMENT —** Save/load compatibility is preserved because owner
values remain canonical. Preset selection and review are ephemeral. Future
configuration can be saved only after schema authorization and must not alter
package/container semantics.

## 14. Game import, metadata, and Guided integration

**TARGET REQUIREMENT —** Search, result selection, and metadata discovery never
select or apply a Case preset. Game import planning may propose an exact preset
reference or compose a reviewed Case preset plan, but the choice is explicit.

**TARGET REQUIREMENT —** A future accepted Game import plus preset application
must combine their immutable after-states and commit one complete Case project
atomically. Game must consume the Case preset planner/owner adapters; it may not
copy assignment, geometry, fitting, or setter order.

**TARGET REQUIREMENT —** A stale Game plan, stale preset plan, session/revision
conflict, or preset blocker prevents the complete composed commit. Partial
metadata, Tray, Front, or Spine mutation is forbidden.

**TARGET REQUIREMENT —** Issue #149 may consume Case preset assignments and
placement results for reviewed structured Tray/Spine import. It does not own
the preset catalog, canonical identity, compatibility, application protocol,
configuration, Reapply, or Detach.

**TARGET REQUIREMENT —** Guided slot/placeholder identity, progress,
completion, omission, and focus remain separate under #281 and
[`GUIDED_PRESET_SLOT_MODEL.md`](GUIDED_PRESET_SLOT_MODEL.md). This contract does
not add Case Guided slots, placeholders, auto-fill, completion, omission, or
persistence.

**FUTURE EXTENSION —** A later Case Guided workflow may consume exact Case
preset assignments after its own contract defines stable Case slot identity.
Navigation to an owner remains non-mutating and cannot stand in for Apply.

## 15. Disc/Case and presentation-adapter boundaries

**TARGET REQUIREMENT —** Disc and Case share the application-level protocol,
result envelope, lifecycle/busy primitives, catalog-interface shape, and
accessibility expectations. They do not share geometry assumptions, concrete
region identities, role adapters, or project mutations.

| Claim class | Concern | Shared | Editor-specific |
| --- | --- | --- | --- |
| TARGET REQUIREMENT | Workflow | Select → Plan → Review → Apply/Reapply/Detach | `disc.layoutPreset.*` versus `case.layoutPreset.*` registrations |
| TARGET REQUIREMENT | Identity/catalog | Stable canonical ID, exact revision, alias-at-boundary policy | Disc and Case namespaces, definition parsers, compatibility vocabularies |
| TARGET REQUIREMENT | Geometry | Pure deterministic helpers where genuinely neutral | Circular Disc regions versus rectangular Front/Tray/Back Panel/side regions |
| TARGET REQUIREMENT | Owners | Trusted adapters and atomic aggregate commit | Disc feature owners versus Case Cover/Tray/left/right owners |
| TARGET REQUIREMENT | Persistence | Exact reference/configuration semantics and no inference | Editor-specific assignment/configuration shape approved by project spec |
| TARGET REQUIREMENT | Presentation | Shared accessible workflow-host mechanics | Active editor's exact workflow, roles, scopes, copy, and focus target |

**TARGET REQUIREMENT —** The eventual active-editor presentation pairs are:

- Disc editor: Disc Template and Disc Layout Presets.
- Case editor: Case Template and Case Layout Presets.
- Only the active editor's pair is presented or enabled.

**TARGET REQUIREMENT —** `workflow.case-layout-presets`,
`area.layout-presets.case`, `owner.case-layout-presets`, and
`control.case-layout-presets.selector` are reserved for the future Case
workflow. The current Case Cover Sheet/Tray Card selector remains navigation
and must not be reinterpreted as Case Template or Case Layout Presets.

**TARGET REQUIREMENT —** A future menu item is a reveal/focus presentation
adapter only. It never selects, plans, applies, reapplies, detaches, enables a
role, switches the Case template, or changes the active surface. No menu
descriptor, workflow router, host presentation, sidebar, or current Disc item
is changed by this documentation slice.

**OPEN QUESTION —** Final labels, menu presentation IDs, Case Template owner,
scope-picker visual design, responsive review layout, and whether inactive
editor-specific items are hidden or visibly disabled belong to focused
presentation/Case Template implementation work. The active-editor pairing and
non-mutating launcher boundary are not open.

## 16. Busy scopes, typed outcomes, feedback, focus, and accessibility

**TARGET REQUIREMENT —** Catalog browsing and Select require no global project
lock. Plan is replaceable/cancellable. Apply, Reapply, and Detach acquire one
exclusive Case project-mutation scope covering the complete resolved region
set and conflict with Save snapshots, project replacement, another preset
mutation, and composed Game mutation according to lifecycle policy.

**TARGET REQUIREMENT —** Repeated activation while an operation owns its scope
starts no duplicate plan/commit and opens no duplicate modal/review surface.
All scopes and staged resources release deterministically in `finally` on
success, no-op, decline, cancellation, stale result, blocker, or failure.

**TARGET REQUIREMENT —** Operations reuse the lifecycle
`ApplicationCommandResult<T>` outer statuses `success`, `cancelled`,
`declined`, and `failure`. Case-specific result values/codes identify selected,
planned, applied, reapplied, detached, no-op, stale, conflict, blocked,
incompatible, unavailable, or failed details without inventing a second generic
result envelope.

### Outcome, feedback, and focus matrix

| Claim class | Outcome | Project/configuration effect | Feedback owner | Focus result |
| --- | --- | --- | --- | --- |
| TARGET REQUIREMENT | Selection/planning success | None | Workflow-local status; no global mutation success | Candidate/review heading without stealing unrelated focus |
| TARGET REQUIREMENT | Review decline/cancel | None | One neutral result | Restore invoker or stable workflow fallback |
| TARGET REQUIREMENT | Stale/conflict | None; discard invalid acceptance | One actionable recoverable message with session/revision/scope detail | First conflict summary/re-plan control |
| TARGET REQUIREMENT | Compatibility/content/fit blocker | None | Accessible blocker list and stable codes | First actionable blocker or review summary |
| TARGET REQUIREMENT | Atomic failure | None | One persistent actionable failure; no competing owner success | Review/retry control |
| TARGET REQUIREMENT | Apply/Reapply/Detach success | One atomic commit or semantic no-op | One exact shared summary | Preserve editor continuity or use an explicit typed destination |

**TARGET REQUIREMENT —** Review exposes programmatic group, region, side,
role/object, selection, warning, blocker, customization, and consent state.
Every action is keyboard reachable; visible headings and associated error/status
text provide screen-reader context.

**TARGET REQUIREMENT —** Opening the workflow focuses its heading or registered
selector after render. Closing restores the captured compatible invoker or a
declared Case-editor fallback. A modal review, if later chosen, follows the
shared modal focus lifecycle; final nonmodal/modal choice does not change the
operation contract.

**TARGET REQUIREMENT —** Feedback is emitted exactly once and remains globally
perceivable if the workflow is hidden or Home becomes visible. Navigation
success is not Apply success, and lower owner adapters do not publish competing
terminal toasts.

## 17. Acceptance criteria and implementation order

**TARGET REQUIREMENT —** A conforming implementation must satisfy all of these
criteria.

1. The five exact `case.layoutPreset.*` operations dispatch through one typed
   owner boundary and preserve Select → Plan → Review → commit ordering.
2. Canonical preset ID/revision and aliases obey section 4; exact-version
   recovery never silently selects latest.
3. Tests distinguish two physical PNG outputs, three user sections, and all
   five concrete regions.
4. Every assignment declares a compatible coordinate basis; Back Panel tests
   prove it cannot consume spine-strip space.
5. `tray-card` tests prove intentional full-Tray background placement remains
   distinct from `back-panel` content.
6. Repeated objects bind by stable ID, fixed owners use canonical synthetic
   identity, and labels/indices/DOM never determine an assignment.
7. Region, Front, Back, Spine, and complete-preset scopes resolve explicitly;
   untargeted owners remain reference-identical where practical and
   semantically unchanged.
8. Multi-region planning completes before mutation and one atomic commit
   changes the complete Case aggregate/configuration exactly once.
9. Left/right assignments remain explicit; current mirror mode alone cannot
   fan out a preset operation.
10. Preservation tests cover bytes, provenance, text/rich text, metadata/manual
    sources, marks, disabled payloads, repeated objects, frame/style, fit/crop,
    and untargeted content.
11. Contain, cover, crop, scale, wrapping, fitting, clamp, reflow, clipping, and
    content reduction are tested as distinct actions.
12. Manual edits do not trigger a continuous solver; customization, Reapply
    consent, side-specific overwrite, and Detach preservation are deterministic.
13. Stale session/revision/template/configuration/definition plans commit
    nothing and release scopes/resources.
14. Preview and PNG export consume identical committed owner geometry for
    Front and complete Tray, including both spines and existing layer order.
15. Save/load preserves current schema until approved migration work; future
    configuration restoration never infers or reapplies from coordinates.
16. Game composition is atomic; Search/discovery cannot apply; #149 and Guided
    boundaries remain intact.
17. Workflow/menu adapters navigate only, maintain keyboard/focus/screen-reader
    behavior, and publish terminal feedback once.
18. Disc preset behavior, Case template/surface navigation, project schema,
    runtime rendering, export pixels, lifecycle behavior, and user assets show
    no regression.

### Dependency-focused implementation order

**TARGET REQUIREMENT —** Implementation proceeds in this order.

1. Create the pure Case preset definition/parser, canonical identity/catalog,
   concrete-region and coordinate-basis validation foundation, with no UI or
   owner mutation.
2. Add pure template/owner compatibility and stable assignment-resolution
   registries, including repeated-ID and synthetic fixed-owner identity.
   **Implemented:** the resolver consumes one detached normalized Case snapshot,
   expands the accepted scope, rechecks compatibility, and returns immutable
   exact binding facts without planning or mutation.
3. Add complete immutable plan construction against the resolver output and
   the same normalized Case snapshot. **Implemented:** first-time Apply planning
   returns direct typed owner-field proposals, preservation/no-op/skip/warning/
   blocker/consent state, commit preconditions, and a deterministic field
   footprint without mutation or target re-resolution.
4. Add the pure atomic first-time Apply transition and trusted Front, Tray,
   Back Panel, left-spine, and right-spine owner adapters that consume one
   reviewed, consent-complete, still-current plan and return a new Case
   aggregate plus applied-configuration candidate without mutating inputs.
   **Implemented:** the transition validates the complete reviewed plan and all
   current preconditions, uses exact stable addresses without re-resolution,
   applies only supported layout fields to a detached draft, verifies the
   complete result, and returns a deeply frozen aggregate/candidate pair or no
   actionable output.
5. Establish the authoritative applied-configuration domain and pure
   customization-detection rules consumed later by Reapply and Detach, while
   keeping the candidate session-only and unpersisted. **Implemented:** a
   complete successful transition output validates into one content-identified,
   detached/uninstalled configuration, and direct exact-address detection
   reports clean versus value-diverged owned fields without resolver, planner,
   catalog, geometry, renderer, persistence, or runtime access.
6. Add the pure Reapply planner. It consumes one authoritative configuration,
   one still-current customization report, a newly selected exact canonical
   preset revision, and explicit overwrite/preservation policy without mutating
   the Case aggregate. **Implemented:** the planner validates the complete
   configuration/report/current snapshot chain, resolves only the supplied
   same-ID definition, reuses shared direct-layout proposal semantics, and
   returns one deterministic immutable reviewed-intent plan or a typed failure.
   It keeps clean/customized overwrite/customized preserve/new/retired/moved
   footprint effects distinct, binds exact policies and preconditions, declares
   warnings and consent requirements, and exposes only a non-authoritative
   projected configuration.
7. Add the separately reviewed pure Reapply transition. **Implemented:** exact
   plan/review/consent/configuration/report/context evidence is revalidated as a
   strict compare-and-swap boundary; complete preflight precedes immutable exact
   layout writes; and success returns one coherent detached aggregate plus a
   validated authoritative but uninstalled next configuration, while failure
   returns neither. Add a distinct pure Detach planner/transition that preserves
   all current owner values. **Implemented:** the Detach planner
   validates one authoritative configuration and exact current snapshot/context,
   directly preflights its complete stable-address footprint, and returns
   deterministic release/preservation/warning/precondition/review evidence plus
   a non-authoritative no-ownership projection. It executes no writes and emits
   no successor configuration. The atomic transition independently validates
   that exact reviewed intent and source configuration as one compare-and-swap
   boundary, performs complete target/value preflight before output construction,
   and returns either one unchanged-semantic aggregate plus validated release
   evidence or neither. It performs zero aggregate writes and returns no next
   applied configuration or adoption claim.
8. Define the pure configuration-attachment/application-adoption model.
   **Implemented:** canonical absence and exact-one attachment, the atomic
   snapshot boundary, legal attach/replace/release relationships, future
   request/receipt types, deterministic identity projection, strict hostile
   input validation, and fail-closed evidence-gap classification exist without
   an executor or integration.
9. Amend the transition evidence owners with content-complete source/result
   aggregate identities, exact configuration endpoints, one outer success
   bundle identity, and public whole-success validators. **Implemented:** the
   assignment snapshot carries a distinct full-aggregate content identity;
   Apply, Reapply, and Detach expose operation-discriminated transition and
   whole-success identities over exact aggregates/endpoints/context/lineage;
   strict validators reject substitution and mixed fragments; and the adoption
   model can return only opaque validated inert evidence that remains
   `not-adopted`.
10. Add owner-derived placement/fitting/clamp/reflow services and content-loss
   policy, including #181 integration only when its own decisions are ready.
11. Add one pure atomic application-adoption transition, amend the lifecycle
   model so a Case session can passively retain and validate one coherent
   aggregate/attachment application unit, add a source-owned validated-success
   bundle, then add one pure lifecycle-owned commit adapter before any store
   dispatch. **Implemented through the lifecycle-store boundary:** the versioned
   transition returns one detached successor application snapshot plus receipt;
   `ProjectSession` represents canonical absence or one exact attachment beside
   its sole authoritative Case aggregate; the source audit binds exact current
   application state, inert evidence, adoption success, and receipt; and the
   lifecycle preparer creates one full source/successor authorization envelope.
   Exact full-session compare-and-swap returns one complete successor session
   plus that existing receipt or neither. Content revision advances once only
   for aggregate change, the already-advanced application revision is not
   incremented again, and legal attachment edges have no exact application-domain
   no-op. The three operation IDs now install only that complete successor once
   through the existing dispatcher, `project.mutation` scope, lifecycle store,
   capability projection, typed result/feedback, and guaranteed cleanup.
   History, authorization-producing runtime workflow orchestration, and UI
   invocation remain unimplemented.
12. Approve and implement applied-configuration schema/migration through
   `PROJECT_FILE_SPEC.md`, including exact-version recovery and Detach.
13. Add accessible Case workflow presentation and typed navigation IDs; then
   integrate the active-editor Tools pair without starting operations from menu
   activation.
14. Integrate reviewed Game/#149 composition and any separately contracted Case
   Guided consumer.
15. Run focused source/integration/save-load/preview-export/accessibility tests
    and real native Tauri acceptance before claiming the workflow implemented.

**CURRENT FACT —** The bounded lifecycle store/command integration described by
the prior checkpoint is implemented. It consumes only the pure adapter's
complete authorization, installs the complete successor once, and does not
rerun planners, operation transitions, or adoption. It does not accept raw
evidence or loose fields, expose partial setters, mint a replacement receipt,
or increment either successor revision again.

**TARGET REQUIREMENT —** The smallest safe next implementation slice is the
explicit applied-configuration schema/migration and Save/Open recovery decision
owned by [`PROJECT_FILE_SPEC.md`](PROJECT_FILE_SPEC.md). It must preserve current
owner values, never infer attachment from coordinates or visual similarity,
and remain separate from workflow presentation, catalog population, visual
design, Game composition, and editor-owner application.

## 18. Issue mapping, non-goals, open questions, and evidence index

### Issue and authority matrix

| Claim class | Issue/authority | Relationship |
| --- | --- | --- |
| CURRENT FACT / TARGET REQUIREMENT | [#168](https://github.com/thelordofdino4/steam-backup-label-studio/issues/168) (open) | Broad layout-preset and role-based editor parent; remains open for implementation, starter designs, UI, and product decisions |
| CURRENT FACT / TARGET REQUIREMENT | [#149](https://github.com/thelordofdino4/steam-backup-label-studio/issues/149) (open) | Remaining structured imported Tray/Spine composition; may consume this planner but does not own it |
| CURRENT FACT / TARGET REQUIREMENT | [#181](https://github.com/thelordofdino4/steam-backup-label-studio/issues/181) (open) | Case copy variant and fit-feedback decisions; no automatic shortening/rewording is implemented here |
| CURRENT FACT / TARGET REQUIREMENT | [#281](https://github.com/thelordofdino4/steam-backup-label-studio/issues/281) (open) | Guided workflow owner; this slice adds no Case Guided slots or progress |
| TARGET REQUIREMENT | Disc preset contract | Shared application protocol; Disc-specific geometry and owners remain separate |
| TARGET REQUIREMENT | Game workflow contract | Future immutable import composition and one atomic accepted commit |
| CURRENT FACT | PR #336 | Merged shared Tools workflow host and typed editor-navigation router; no Case preset destination or presentation was added |
| CURRENT FACT | PR #340 | Merged immutable first-time Apply planner and deterministic executable footprint; no runtime application or persistence was added |
| CURRENT FACT | PR #341 | Merged pure atomic first-time Apply transition and uninstalled configuration candidate; no runtime application or persistence was added |
| CURRENT FACT | PR #342 | Merged authoritative detached applied-configuration validation and exact customization detection at `9db27a2cff122b2afb53286aa3ca511bfd5cb18f`; no installation, persistence, Reapply execution, or runtime behavior was added |
| CURRENT FACT | PR #343 | Merged pure Reapply planning at `9d0b5ce043518f10187511b6e2404fca6a6e77ea`; no execution, installation, persistence, Detach, UI, or runtime behavior was added |
| CURRENT FACT | PR #344 | Merged pure atomic Reapply transition at `f662d81555fa16e36220c63854709b62fb46bd7a`; no Detach, installation, persistence, schema, UI, store, or runtime behavior was added |
| CURRENT FACT | PR #345 | Merged pure Detach planning at `13c0cbff4f7658a3f926b6a994973ce29082d55d`; no execution, installation/removal, persistence, schema, UI, store, or runtime behavior was added |
| CURRENT FACT | PR #346 | Merged pure Detach transition at `d9741e8525d4c312d92a0a30cca2b3b85774497c`; no application adoption, attachment removal, persistence, schema, UI, store, or runtime behavior was added |
| CURRENT FACT | PR #347 | Merged the pure configuration-attachment/application-adoption model at `ec9243ea1f42d97d9476bfe05160e933c746510f`; it defined canonical attachment state, one atomic future application snapshot, legal edges, receipt vocabulary, and the antecedent evidence gaps without an executor |
| CURRENT FACT | PR #348 | Merged the transition-evidence amendment at `54ee66a6d3051998bbadd19ea239ebe3b81beed7`; it added full normalized Case aggregate identities, complete Apply/Reapply/Detach endpoints, operation-discriminated transition and whole-success identities, strict whole-success validators, and opaque inert `not-adopted` evidence without adoption execution or integration |
| CURRENT FACT | PR #349 | Merged the pure atomic versioned adoption transition at `e9ae6f9d3002816aeb48f85281211f07b3b22996`, including complete CAS validation, detached coherent successor snapshot, deterministic operation-discriminated receipt, and no lifecycle/store commit, schema, persistence, UI, catalog, or runtime integration |
| CURRENT FACT | PR #350 | Merged the discriminated Case-only `ProjectSession` companion at `83623fcb43e303bf47b87014502251509bd19ce6`, including canonical unattached revision-zero New/Open initialization, strict capture/projection, split content/application revisions, whole-unit equality, and exact pure-successor representation without adoption commit or store/runtime integration |
| CURRENT FACT | Pure lifecycle-owned adoption-commit checkpoint | Adds the source-owned validated-success bundle, full source/successor authorization envelope, exact full-session compare-and-swap, aggregate-aware content revision, exact already-advanced application revision, and atomic existing-receipt return without store dispatch, persistence, schema, UI, catalog, workflow, busy scopes, feedback, history, or runtime integration |
| CURRENT FACT | Lifecycle-store installation checkpoint | Registers `case.layoutPreset.apply`, `case.layoutPreset.reapply`, and `case.layoutPreset.detach` in the existing application command root; installs one complete authorized successor through final full-session and lifecycle-generation CAS under `project.mutation`; preserves content-only dirty semantics; returns the existing receipt through typed command results/feedback; and adds no catalog, UI, App/editor invocation, schema, persistence, preview, or export connection |

**CURRENT FACT —** Read-only review at this checkpoint confirmed the prerequisite
work is merged into `main`, with synchronized `main`/`origin/main` at
`fcde6d9fef8efa25719761b538eda0ad2bca2ed6` before this focused branch. No open
pull request or newer exact lifecycle store-installation owner exists. Issues
#168, #149, #181, and #305 remain open. No issue or pull request was created,
edited, closed, labeled, commented on, or otherwise mutated.

### Non-goals

**TARGET REQUIREMENT —** This contract and the implemented pure foundation do
not implement or change:

- React, Rust, manifests, dependencies, Tauri, or generated artifacts;
- starter Case definitions, authorization-producing runtime workflow
  orchestration, App/editor invocation, UI, or workflow-host connection;
- Case Template, menu descriptors/routing, current Disc items, sidebar panels,
  current Case surface selection, or final visual design;
- project schema, migrations, package format, Save/Open projection, persisted
  dirty policy, history, or live lifecycle adoption behavior;
- Game search/import, #149 composition, #181 copy fitting, Guided slots,
  placeholders, progress, or auto-fill;
- template geometry, preview/export renderers, layer order, drag, selection,
  text editing, focus behavior, or exported pixels; or
- GitHub issues, pull requests, branches other than the task branch, releases,
  or issue state.

### Open questions

**OPEN QUESTION —** #168 or a focused starter-preset issue must define the
first populated Case preset catalog, user-facing names, exact role
participation, and whether any preset may create a missing repeated object.

**OPEN QUESTION —** Steam branding on Front and Spine must be classified as a
preset role or retained as setup-owned visible output before a Case definition
may target it.

**OPEN QUESTION —** #181 must settle copy-variant labels, fit thresholds,
warnings, and whether any explicit content-reduction operation is supported.

**OPEN QUESTION —** `PROJECT_FILE_SPEC.md` must settle the exact future applied
configuration JSON shape, fingerprints, compatibility metadata, and migration
defaults. No implementation may infer those fields meanwhile.

**OPEN QUESTION —** Final Case Template semantics, menu item IDs/labels,
inactive-editor visibility, scope-picker presentation, responsive review host,
and optional modal presentation require focused contracts/implementation.

### Evidence index

| Claim class | Evidence | Supports |
| --- | --- | --- |
| CURRENT FACT | `src/presets/caseInsertPresetDefinition.ts`, `caseInsertPresetCatalog.ts`, `caseInsertPresetCompatibility.ts`, `caseInsertPresetAssignmentResolution.ts`, and their focused tests | Pure canonical definition parsing, exact catalog identity/alias boundaries, five concrete regions, coordinate-basis validation, explicit target presence/scopes, immutable compatibility, deterministic scope expansion, and typed exact owner/object resolution without planning or mutation |
| CURRENT FACT | `src/presets/caseInsertPresetApplyPlanning.ts` and `caseInsertPresetApplyPlanning.test.ts` | Pure deeply immutable first-time Apply planning from exact resolver output; deterministic typed direct layout-field proposals, preservation, optional skips, required blockers, disabled/no-op/conflict/stale/unsupported distinctions, multi-region consent, later-commit preconditions, and field footprints without owner/project mutation |
| CURRENT FACT | `src/presets/caseInsertPresetApplyReviewIdentity.ts`, `caseInsertPresetApplyTransition.ts`, and `caseInsertPresetApplyTransition.test.ts` | Deterministic content-bound review and consent identities; pure aggregate-atomic first-time Apply through exact stable addresses; full source/result aggregates and identities; canonical source absence and exact successor configuration endpoint; strict operation/lineage/transition/whole-success validation; immutable detached output and explicit non-adoption without resolver/planner/runtime/persistence access |
| CURRENT FACT | `src/presets/caseInsertPresetAppliedConfiguration.ts` and `caseInsertPresetAppliedConfiguration.test.ts` | Fail-closed promotion of a complete successful transition output into one authoritative detached configuration; deterministic configuration/report identities; direct exact-address clean/customized comparison; preserved coalesced provenance; distinct missing/ambiguous/invalid/incompatible states; this module itself owns no installation, persistence, Reapply, Detach, catalog, resolver, planner, renderer, or runtime access |
| CURRENT FACT | `src/presets/caseInsertPresetReapplyPlanning.ts` and `caseInsertPresetReapplyPlanning.test.ts` | Pure same-canonical-ID exact-revision Reapply planning from one validated configuration/report/current snapshot chain; direct supplied-definition resolution without production catalog lookup; explicit overwrite/preserve policy; retained/new/retired/moved footprint classification; deterministic exact writes, warnings, consent requirements, preconditions, review identity, and non-authoritative projection; no execution, installation, persistence, Detach, UI, renderer, store, or runtime access |
| CURRENT FACT | `src/presets/caseInsertPresetReapplyIdentity.ts`, `caseInsertPresetAggregateFieldTransition.ts`, `caseInsertPresetReapplyTransition.ts`, and `caseInsertPresetReapplyTransition.test.ts` | Canonical order-independent plan/review/requirement/acceptance identities; one shared exhaustive immutable exact-address layout writer used by first Apply and Reapply; strict compare-and-swap preflight; exact source/result aggregates and authoritative source/successor configurations; operation/lineage/transition/whole-success validation; overwrite/preserve/new/retired/moved semantics; deterministic aggregate/configuration pair or neither; no planner/detector/resolver/catalog/geometry/renderer/installation/persistence/schema/UI/store/runtime execution |
| CURRENT FACT | `src/presets/caseInsertPresetDetachIdentity.ts`, `caseInsertPresetDetachPlanning.ts`, and `caseInsertPresetDetachPlanning.test.ts` | Pure configuration/report-independent Detach planning; strict authoritative-configuration and current-context validation; exact stable-address current-value and enablement preflight; complete ownership release with one exact preservation fact per field; deterministic warning/review/plan identities and future compare-and-swap preconditions; non-authoritative ownership-absence projection; zero aggregate writes and no next configuration; the planner itself performs no transition execution, installation/removal, persistence, schema, UI, store, or runtime work |
| CURRENT FACT | `src/presets/caseInsertPresetDetachTransition.ts` and `caseInsertPresetDetachTransition.test.ts` | Pure atomic Detach execution from one exact reviewed plan and independently validated authoritative configuration; exact source aggregate and unchanged-semantic result clone bound by the same complete aggregate identity; source configuration, release identity, canonical successor absence, lineage, transition, and whole-success validation; zero aggregate writes, no next configuration, and explicit non-adoption; no planner/detector/resolver/compatibility/catalog/writer/geometry/renderer/installation/persistence/schema/UI/store/runtime execution |
| CURRENT FACT | `src/caseInsert/presetAggregateIdentity.ts`, `src/presets/caseInsertPresetIdentityDigest.ts`, `caseInsertPresetAttachmentEndpoint.ts`, `caseInsertPresetTransitionSuccessIdentity.ts`, and focused tests | Pure content-complete normalized Case aggregate validation and byte-identical deterministic SHA-256 identity through bounded incremental encoding/hash buffers; canonical attachment endpoints; operation-discriminated transition evidence and whole-success identities; semantic array order and order-independent record encoding; no generic JSON identity, platform crypto, runtime, or mutation dependency |
| CURRENT FACT | `src/presets/caseInsertPresetConfigurationAdoptionModel.ts` and `caseInsertPresetConfigurationAdoptionModel.test.ts` | Canonical unattached/exact-one attached wrapper; deterministic attachment and application-state identities; one immutable aggregate/snapshot-plus-attachment application unit; legal Apply/Reapply/Detach relationship registry and pure fail-closed attachment-edge classifier; operation-discriminated result/receipt and identity vocabulary; hostile-input validation; strict conversion of authentic strengthened successes into opaque inert `not-adopted` evidence; and legacy incomplete evidence rejection. The model itself performs no adoption, integration, or runtime behavior |
| CURRENT FACT | `src/presets/caseInsertPresetApplicationAdoptionTransition.ts`, its focused test, and test fixture | Pure versioned atomic adoption from opaque audited evidence plus one exact current application snapshot; full operation/version/whole-success/context/aggregate/attachment/configuration/release CAS; deterministic attach/replace/release receipt; exact one-step revision; deeply immutable detached successor or typed inert failure; and a source-owned versioned operation-discriminated validated-success bundle that re-audits the current snapshot/evidence and reconstructs the exact success/receipt before lifecycle consumption. No planner/operation transition/detector/resolver/compatibility/catalog/writer/lifecycle/store/persistence/schema/UI/runtime dependency is added |
| CURRENT FACT | `src/lifecycle/caseInsertPresetSessionApplication.ts`, `src/lifecycle/projectSession.ts`, `src/lifecycle/applicationLifecycleStateStore.ts`, and focused tests | Case-only passive application companion with no aggregate copy; canonical unattached revision-zero New/Open initialization; strict hostile-input capture and deterministic pure-snapshot projection; preserved attachment and exact application-revision advancement during editor synchronization; explicit lifecycle equality without generic JSON identity; content-only dirty/baseline/Save semantics; exact Apply/Reapply/Detach successor representation, including unchanged-aggregate Detach; the representation owner itself performs no installation or dispatch |
| CURRENT FACT | `src/lifecycle/caseInsertPresetSessionApplicationCommit.ts` and `caseInsertPresetSessionApplicationCommit.test.ts` | Pure lifecycle-owned preparation and commit boundary from one exact Case source session plus one source-audited operation-discriminated adoption-success bundle; deterministic complete source/successor authorization envelope; exact full-session CAS; one content-revision advance only for aggregate change; preservation of exact one-step application revision and all unrelated project/session authorities; atomic return of the complete successor plus existing adoption receipt or neither; replay/staleness/hostile-input rejection; no store, persistence, schema, UI, catalog, renderer, workflow, busy, feedback, history, or runtime dependency |
| CURRENT FACT | `src/lifecycle/caseInsertPresetSessionApplicationCommand.ts`, `applicationLifecycleCompositionRoot.ts`, `applicationCommandTypes.ts`, `commandBusyScopes.ts`, and `caseInsertPresetSessionApplicationCommand.test.ts` | Existing-root registration and capability projection for the three exact operation IDs; one exclusive `project.mutation` scope; final pure full-session CAS inside one lifecycle-store generation-CAS transition; complete successor installation and existing-receipt return once; typed stale/busy/failure results and shared feedback; cleanup after success/failure; aggregate-plus-attachment and attachment-only atomicity; no planner/operation/adoption rerun, catalog, UI, App/editor invocation, schema, persistence, preview, or export connection |
| CURRENT FACT | `src/project/projectTypes.ts`, `src/caseInsert/defaults.ts`, `src/caseInsert/normalization.ts`, `src/project/caseInsertProjectAdapters.ts`, `src/caseInsert/presetAssignmentSnapshot.ts`, `src/project/projectSchema.ts` | Case owner containers, stable object IDs, defaults, normalization, lifecycle-detached assignment snapshot with distinct snapshot/context and full aggregate-content identities, exact fixed/repeated binding adapters, snapshot/restore, and current no-preset schema |
| CURRENT FACT | `src/templates/caseInsertTemplates.ts`, `src/layout/jewelCaseLayout.ts`, `jewelCaseFrontLayout.ts`, `jewelCaseBackLayout.ts`, `jewelCaseSpineLayout.ts` | Two physical surfaces, explicit regions/safe bases, Back Panel versus complete Tray, deterministic owner geometry |
| CURRENT FACT | `src/caseInsert/templateSurfaceTransitions.ts`, `src/caseInsert/jewelCaseTransitions.ts`, `src/hooks/useCaseInsertTemplateEditor.ts`, `src/hooks/useJewelCaseSpineEditor.ts` | Focused Cover/Tray and side-specific/mirrored editing transitions |
| CURRENT FACT | `src/components/preview/CaseInsertTemplatePreviewLayers.tsx`, `CaseInsertSpinePreviewLayer.tsx`, `CaseInsertPreview.tsx`, `src/export/caseInsertTemplateExportLayers.ts`, `exportCaseInsertPng.ts` | Preview/export owner separation, one complete Tray composition, and no standalone Spine PNG |
| CURRENT FACT | `src/caseInsert/brandingMarkTargetSources.ts`, `brandingMarkSlots.ts`, `brandingLogoSlots.ts`, `src/editor/repeatedArtwork.ts` | Branding family projection and repeated object identity |
| CURRENT FACT | Other `src/presets/` Disc definition/registry/resolution/application/fitting/targeted modules and focused tests | Disc-first reusable evidence; the pure Case lifecycle adapter itself remains store-free, while the focused lifecycle command installs its complete authorized successor; authorization-producing runtime Case workflow orchestration remains separate and unimplemented |
| CURRENT FACT | `src/editor/editorNavigationRouter.ts`, `src/applicationMenu/applicationMenuRegistry.ts`, `src/components/editor/ApplicationWorkflowHost.tsx` | Current four Tools workflows and absence of Case Template/Layout Preset identities |
| TARGET REQUIREMENT | [`DISC_LAYOUT_PRESET_WORKFLOW_CONTRACT.md`](DISC_LAYOUT_PRESET_WORKFLOW_CONTRACT.md), [`PACKAGING_ROLE_MODEL.md`](PACKAGING_ROLE_MODEL.md), [`ROLE_BASED_PRESET_MODEL.md`](ROLE_BASED_PRESET_MODEL.md) | Shared workflow invariants, roles, preservation, and application vocabulary |
| TARGET REQUIREMENT | [`PROJECT_FILE_SPEC.md`](PROJECT_FILE_SPEC.md), [`GAME_SEARCH_IMPORT_AND_METADATA_WORKFLOW_CONTRACT.md`](GAME_SEARCH_IMPORT_AND_METADATA_WORKFLOW_CONTRACT.md), [`GUIDED_PRESET_SLOT_MODEL.md`](GUIDED_PRESET_SLOT_MODEL.md) | Persistence, composed Game apply, and Guided boundaries |
| CURRENT FACT | Issues #168, #149, #181, #281/#305 and merged PRs #336/#340/#341/#342/#343/#344/#345/#346/#347/#348/#349/#350, reviewed read-only on 2026-08-04 | Scope, open dependencies, shared workflow-host/planner/transition/configuration/Detach/adoption/evidence/lifecycle baselines, and absence of a newer exact lifecycle store-installation owner |
