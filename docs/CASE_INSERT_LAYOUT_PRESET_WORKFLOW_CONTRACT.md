# Case Insert Layout Preset Workflow Contract

> Status: Draft target-state normative contract with implemented pure definition/catalog/compatibility, assignment-resolution, first-time Apply planning/transition, detached applied-configuration/customization detection, and Reapply planning/transition checkpoints.
> Purpose: Define the presentation-neutral Case Insert Layout Preset Select, Plan, Review, Apply, Reapply, and Detach workflow across Front Cover, complete Tray Card, Back Panel, and explicit left/right spine regions.
> Read when: Designing or implementing Case preset definitions, catalogs, planning, owner adapters, application scopes, persistence, Game/import composition, future Case workflow presentation, or Case preset acceptance.
> Authoritative source: This contract for target Case preset workflow semantics; current implementation facts defer to source and tests; physical geometry defers to the Case template and layout owners; serialized fields defer to `PROJECT_FILE_SPEC.md`.
> Last reviewed against commit: `9d0b5ce043518f10187511b6e2404fca6a6e77ea` plus the current unstaged pure atomic Reapply-transition slice.

Last refreshed: 2026-08-01.

## 1. Status, scope, and authority

**TARGET REQUIREMENT —** This is a **draft target-state normative contract**.
It defines behavior that the complete Case Insert Layout Preset implementation
must satisfy.

**CURRENT FACT —** The pure v1 definition parser, canonical catalog boundary,
concrete-region/coordinate-basis registry, compatibility evaluator, stable
assignment resolver, immutable first-time Apply planner, deterministic review
identity, pure atomic first-time Apply transition, authoritative detached
applied-configuration domain, exact customization detector, pure Reapply
planner, and pure atomic Reapply transition now exist under
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
failure containing neither. No starter definition, installed attachment,
Detach policy or transition, workflow
presentation, menu item, or persistence schema exists.

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
payload data, and returns a deeply frozen detached aggregate and uninstalled
configuration candidate. Semantic no-op Apply can still return the candidate.
There are no starter definitions, installed configuration attachment, workflow
presentation, menu launcher, Reapply, or Detach behavior.

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
frozen clean/customized report. Current project revision may advance; session,
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
| CURRENT FACT / TARGET REQUIREMENT | Planning | Pure first-time Apply and same-ID Reapply planning emit deterministic direct layout-field actions, preservation decisions, skips, warnings, blockers, material-consent requirements, preconditions, and field footprints; Reapply also validates report freshness, explicit customized-field policies, and new/retired/moved ownership effects; unsupported fitting fails closed | Add Detach planning without duplicating target, field, or ownership-release semantics |
| CURRENT FACT / TARGET REQUIREMENT | Application | Pure reviewed first-time Apply and Reapply transitions completely preflight exact review/consent/context/address/value evidence and return coherent detached immutable aggregate/configuration outputs or neither; canonical configurations remain explicitly uninstalled and detect exact owned-field divergence; no runtime commit exists | Add Detach execution, then install an accepted operation's aggregate/configuration once through the future lifecycle boundary |
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
- session ID, base project revision, Case project kind, template identity, and
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

**TARGET REQUIREMENT —** The eventual runtime commit replaces the Case
aggregate/configuration once through the lifecycle project-mutation boundary.
Calling individual React setters or owner callbacks in a fallible sequence is
prohibited.

**TARGET REQUIREMENT —** Multi-region Apply/Reapply/Detach is all-or-nothing.
There is no partial success status that leaves Front changed while Back or a
spine failed. A blocker or commit failure leaves every Case owner,
configuration, project revision, dirty state, navigation state, and history
boundary unchanged.

**TARGET REQUIREMENT —** A material change increments project revision exactly
once and forms one future history transaction. A semantic no-op increments
revision zero times and adds no history entry.

**TARGET REQUIREMENT —** Apply/Reapply/Detach preserve the active session ID,
current path, persistence format, clean baseline, project kind, and route.
Dirty state is re-derived from the committed canonical project against the
unchanged baseline.

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
   all current owner values.
8. Add owner-derived placement/fitting/clamp/reflow services and content-loss
   policy, including #181 integration only when its own decisions are ready.
9. Add one lifecycle-owned atomic Case aggregate/configuration commit with
   revision, dirty, busy, no-op, stale, cleanup, and future history boundaries.
10. Approve and implement applied-configuration schema/migration through
   `PROJECT_FILE_SPEC.md`, including exact-version recovery and Detach.
11. Add accessible Case workflow presentation and typed navigation IDs; then
   integrate the active-editor Tools pair without starting operations from menu
   activation.
12. Integrate reviewed Game/#149 composition and any separately contracted Case
   Guided consumer.
13. Run focused source/integration/save-load/preview-export/accessibility tests
    and real native Tauri acceptance before claiming the workflow implemented.

**TARGET REQUIREMENT —** The smallest safe next implementation slice is pure
Detach planning. It must define exact ownership release while preserving every
current aggregate value and must remain distinct from Reapply preservation and
selected-revision retirement. If source truth keeps planning and execution as
separate checkpoints, Detach transition follows only after its plan/review
contract is complete. Persistence, schema migration, UI, installation, and
runtime commit remain separate later slices.

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

**CURRENT FACT —** Read-only review at this checkpoint confirmed PR #343 merged
the pure Reapply-planning checkpoint into `main` at
`9d0b5ce043518f10187511b6e2404fca6a6e77ea` and found no open pull request or
newer focused Case Reapply-transition owner. Issues #168,
#149, #181, and
#305 remain open. No issue or pull request was created, edited, closed, labeled,
commented on, or otherwise mutated.

### Non-goals

**TARGET REQUIREMENT —** This contract and the implemented pure foundation do
not implement or change:

- React, Rust, manifests, dependencies, Tauri, runtime, or generated artifacts;
- starter Case definitions, runtime Apply/Reapply application/commit engine,
  installed configuration attachment, Detach planning/execution, UI,
  or workflow-host connection;
- Case Template, menu descriptors/routing, current Disc items, sidebar panels,
  current Case surface selection, or final visual design;
- project schema, migrations, package format, Save, Open, dirty state, history,
  or lifecycle behavior;
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
| CURRENT FACT | `src/presets/caseInsertPresetApplyReviewIdentity.ts`, `caseInsertPresetApplyTransition.ts`, and `caseInsertPresetApplyTransition.test.ts` | Deterministic content-bound review and consent identities; pure aggregate-atomic first-time Apply through exact stable addresses; exhaustive supported layout-field writes; complete preflight, preservation, semantic no-op, immutable detached output, and uninstalled configuration candidate without resolver/planner/runtime/persistence access |
| CURRENT FACT | `src/presets/caseInsertPresetAppliedConfiguration.ts` and `caseInsertPresetAppliedConfiguration.test.ts` | Fail-closed promotion of a complete successful transition output into one authoritative detached configuration; deterministic configuration/report identities; direct exact-address clean/customized comparison; preserved coalesced provenance; distinct missing/ambiguous/invalid/incompatible states; this module itself owns no installation, persistence, Reapply, Detach, catalog, resolver, planner, renderer, or runtime access |
| CURRENT FACT | `src/presets/caseInsertPresetReapplyPlanning.ts` and `caseInsertPresetReapplyPlanning.test.ts` | Pure same-canonical-ID exact-revision Reapply planning from one validated configuration/report/current snapshot chain; direct supplied-definition resolution without production catalog lookup; explicit overwrite/preserve policy; retained/new/retired/moved footprint classification; deterministic exact writes, warnings, consent requirements, preconditions, review identity, and non-authoritative projection; no execution, installation, persistence, Detach, UI, renderer, store, or runtime access |
| CURRENT FACT | `src/presets/caseInsertPresetReapplyIdentity.ts`, `caseInsertPresetAggregateFieldTransition.ts`, `caseInsertPresetReapplyTransition.ts`, and `caseInsertPresetReapplyTransition.test.ts` | Canonical order-independent plan/review/requirement/acceptance/transition identities; one shared exhaustive immutable exact-address layout writer used by first Apply and Reapply; strict Reapply compare-and-swap preflight; exact review and consent-set validation; overwrite/preserve/new/retired/moved semantics; deterministic aggregate/configuration pair or neither; authoritative detached/uninstalled domain configuration v2 accepted by later detection and planning; no planner/detector/resolver/catalog/geometry/renderer/installation/persistence/schema/UI/store/runtime execution |
| CURRENT FACT | `src/project/projectTypes.ts`, `src/caseInsert/defaults.ts`, `src/caseInsert/normalization.ts`, `src/project/caseInsertProjectAdapters.ts`, `src/caseInsert/presetAssignmentSnapshot.ts`, `src/project/projectSchema.ts` | Case owner containers, stable object IDs, defaults, normalization, lifecycle-detached assignment snapshot, exact fixed/repeated binding adapters, snapshot/restore, and current no-preset schema |
| CURRENT FACT | `src/templates/caseInsertTemplates.ts`, `src/layout/jewelCaseLayout.ts`, `jewelCaseFrontLayout.ts`, `jewelCaseBackLayout.ts`, `jewelCaseSpineLayout.ts` | Two physical surfaces, explicit regions/safe bases, Back Panel versus complete Tray, deterministic owner geometry |
| CURRENT FACT | `src/caseInsert/templateSurfaceTransitions.ts`, `src/caseInsert/jewelCaseTransitions.ts`, `src/hooks/useCaseInsertTemplateEditor.ts`, `src/hooks/useJewelCaseSpineEditor.ts` | Focused Cover/Tray and side-specific/mirrored editing transitions |
| CURRENT FACT | `src/components/preview/CaseInsertTemplatePreviewLayers.tsx`, `CaseInsertSpinePreviewLayer.tsx`, `CaseInsertPreview.tsx`, `src/export/caseInsertTemplateExportLayers.ts`, `exportCaseInsertPng.ts` | Preview/export owner separation, one complete Tray composition, and no standalone Spine PNG |
| CURRENT FACT | `src/caseInsert/brandingMarkTargetSources.ts`, `brandingMarkSlots.ts`, `brandingLogoSlots.ts`, `src/editor/repeatedArtwork.ts` | Branding family projection and repeated object identity |
| CURRENT FACT | Other `src/presets/` Disc definition/registry/resolution/application/fitting/targeted modules and focused tests | Disc-first reusable evidence; Case runtime application, attachment, and Detach remain separate and unimplemented |
| CURRENT FACT | `src/editor/editorNavigationRouter.ts`, `src/applicationMenu/applicationMenuRegistry.ts`, `src/components/editor/ApplicationWorkflowHost.tsx` | Current four Tools workflows and absence of Case Template/Layout Preset identities |
| TARGET REQUIREMENT | [`DISC_LAYOUT_PRESET_WORKFLOW_CONTRACT.md`](DISC_LAYOUT_PRESET_WORKFLOW_CONTRACT.md), [`PACKAGING_ROLE_MODEL.md`](PACKAGING_ROLE_MODEL.md), [`ROLE_BASED_PRESET_MODEL.md`](ROLE_BASED_PRESET_MODEL.md) | Shared workflow invariants, roles, preservation, and application vocabulary |
| TARGET REQUIREMENT | [`PROJECT_FILE_SPEC.md`](PROJECT_FILE_SPEC.md), [`GAME_SEARCH_IMPORT_AND_METADATA_WORKFLOW_CONTRACT.md`](GAME_SEARCH_IMPORT_AND_METADATA_WORKFLOW_CONTRACT.md), [`GUIDED_PRESET_SLOT_MODEL.md`](GUIDED_PRESET_SLOT_MODEL.md) | Persistence, composed Game apply, and Guided boundaries |
| CURRENT FACT | Issues #168, #149, #181, #281/#305 and merged PRs #336/#340/#341/#342/#343, reviewed read-only on 2026-08-01 | Scope, open dependencies, shared workflow-host/planner/transition/configuration baselines, and absence of a newer exact Reapply-transition owner |
