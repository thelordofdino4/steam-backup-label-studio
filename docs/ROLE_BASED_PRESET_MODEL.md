# Role-Based Preset Model
> Status: Current architecture and extension contract for GitHub issues #269, #270, #289, #292, and #293.
> Purpose: Define the implemented generic Disc preset/application model, its guided-workflow boundary, and future role-based extensions.
> Read when: Working on role-based layout presets, Disc preset application, guided preset behavior, preset save/load design, or preset application behavior.
> Authoritative source: Current source for implemented behavior; `PACKAGING_ROLE_MODEL.md` for semantic roles; `PROJECT_FILE_SPEC.md` for saved-project schema; `SOFTWARE_DESIGN_DOCUMENT.md` for architecture contracts.
> Last reviewed against commit: `c2bfaeed02915ee2b757cdd4a9a560b5305b6436`.

This document began as the design output for #269 and now records both that
contract and the implemented Disc-first foundation delivered through #270,
#292, and #293. It does not introduce broader role/preset persistence, change
renderers or export behavior, or move existing controls.

## 1. Purpose And Scope

Role-based layout presets should apply coordinated placement, sizing, defaults,
and enablement behavior to semantic packaging roles instead of storing only raw
coordinates from one project.

The implemented first target is the named Classic Top Title preset for the Disc
Label surface. Case Front, Case Back, and Spine remain in the conceptual model
so the contract does not paint future design into a disc-only corner, but their
preset implementation should wait for the case/spine work called out below.

This document covers:

- preset identity and naming;
- supported target surfaces;
- role placement, sizing, layer, and fit/default data;
- text defaults for fixed text roles;
- repeatable role behavior;
- enablement and disabled-state preservation;
- manual fine-tuning, reapply, and reset expectations;
- save/load normalization expectations;
- disc-first implementation guidance for #270.

This document does not cover:

- a marketplace or arbitrary user-authored preset editor;
- renderer or export-layer changes;
- broader saved role/preset identity beyond schema `0.2.0`'s focused guided
  layout identity/version and omission metadata;
- case/spine preset implementation;
- UI control placement or visible panel migration.

## 2. Relationship To Packaging Role Model

`PACKAGING_ROLE_MODEL.md` defines the semantic packaging roles and current
object-role mapping. This document defines how future presets should target
those roles.

The current role IDs in `src/editor/editorNavigationShell.ts` are UI shell IDs.
They are useful evidence for current navigation and labels, but they are not
persisted preset-domain IDs yet. A future preset implementation should either
promote stable role IDs intentionally or introduce a separate preset-domain role
ID set with explicit adapters back to current feature owners.

The role model remains descriptive until implementation. Existing source owners
continue to own the actual state, preview, export, save/load, reset, clear,
upload, import, and drag behavior.

## 3. Current Implementation Baseline

### Generic Disc Preset Definition Foundation

Issue #289 introduces a generic, JSON-compatible Disc preset-definition domain
under `src/presets/`. `discPresetDefinition.ts` owns the strict V1 contract,
validation, normalization, semantic placement-target allowlists, and immutable
trusted result. `discPresetRegistry.ts` owns pure built-in/user-ready lookup,
summaries, ordering, revision selection, and compatibility aliases. Neither
module reads files or browser storage, mutates project state, or depends on
React, renderers, export, Case Insert, or project-schema code.

Preset definitions use stable identities. Built-ins use
`builtin:disc-preset:<slug>` and future user definitions reserve
`user:disc-preset:<uuid>`. `formatVersion` versions the serialized V1 contract;
`revision` versions one preset definition. These values are independent from
project schema versions, application versions, and guided slot IDs.

Classic Top Title is the first built-in definition at
`src/presets/builtins/classicTopTitleDiscPreset.ts`. Its eight ordered semantic
slots own content regions, optional action regions, visual layers, and
serializable placement intents. The existing `classic-top-title` menu ID and
`disc:guided-layout:classic-top-title` guided ID are compatibility aliases for
the canonical `builtin:disc-preset:classic-top-title` identity. Alias lookup is
centralized; aliases do not own geometry or independent slot catalogs.

Issue #293 provides the pure runtime application foundation and its focused
production compatibility route. `discPresetResolution.ts` distinguishes the
validated nominal definition from one transient resolved definition for the
active Disc template. Resolution retains nominal and resolved content/action
regions, preserves slot order, checks template compatibility and safe-annulus
intersection, and reports structured adjusted, unsupported, incompatible, or
invalid-template warnings. Template resolution does not inspect owner content;
content-aware adapters may subsequently refine only their matching resolved
slot through a validated slot patch.

`discPresetPlacementAdapters.ts` owns the trusted semantic target registry
contract. Adapters are application code, never parsed preset data. The immutable
registry rejects duplicate targets, reports missing coverage, and returns
adapters only by the allowlisted target vocabulary exported by
`discPresetDefinition.ts`. `discPresetApplication.ts` walks resolved slots and
placement intents in deterministic order, invokes compatible adapters, and
returns an immutable `applied`, `partial`, or `rejected` plan with structured
warnings. Semantic targets are not state paths, and the pure engine contains no
React, DOM, schema, renderer, export, Case Insert, storage, or network behavior.

Issue #293 adds concrete immutable placement adapters for title
artwork, title text, Background, primary Rating, primary Media Format Mark,
primary Developer and Publisher Logos, and copyright text. Focused read-only
owner slices expose only the existing layout and identity fields an adapter
needs. Typed updates contain only preset-owned layout fields, so dormant
disabled owners receive placement without enabling them or copying content,
source, theme, selected values, provenance, metadata, or repeated assets.

Point adapters map the resolved content-region center to owner `x`/`y` and
currently support deterministic positive fixed scale only. Disc text adapters
convert center-based preset X to the current center-relative text contract with
`text x = resolved center X - 50`; they seed straight mode, width, alignment,
and an explicitly owned point size. Copyright `fit: region` uses an injected
text-measurement service plus the canonical straight-text render layout and
visual-bounds helpers. It centers Legal content in the resolved region at a
preferred 7pt, reduces in deterministic 0.25pt steps to a 3pt minimum, checks
both the requested region and active template safe annulus, and never truncates
content. Blank or disabled Legal receives a dormant 7pt layout. Successful
fitting returns the exact owner geometry as a slot-local resolved content/action
patch; adjusted and minimum-size outcomes report structured warnings. A
genuinely impossible fit emits no false Legal owner update, marks only that
resolved slot unsupported, and leaves the overall application partial.
Production measurement is browser-canvas backed and injected at the app
boundary; the generic application engine and fitting helper have no browser
dependency. Background V1 supports only centered `cover` placement: it sets the
declared scale and canonical zero pixel offset while preserving the image and
source. Non-centered Background regions are unsupported rather than being
treated as arbitrary crop instructions.

The Operating System Marks adapter consumes the resolved slot content region,
a focused platform-mark state slice, and the active canonical Disc template.
It delegates ordering, implicit built-in materialization, preferred-scale
reduction, row balancing, safe-zone containment, center-hole avoidance, and
non-overlap to `placeGroupedPlatformMarks`. It emits one typed
`platform-mark-layout` update per eligible selected, enabled, renderable mark,
identified by stable `PlatformMarkValue`, and preserves selections, enablement,
sources, themes, custom assets, and inference metadata. Missing/unrenderable
assets, invalid layouts, invalid regions, and impossible placement use
structured warnings.

`discPresetTargetedApplication.ts` adds exact-target application for an active
canonical `{ id, revision }` reference. It performs exact registry lookup,
template resolution, unambiguous target-slot lookup, and one adapter invocation.
Missing presets/revisions, absent or ambiguous targets, unsupported slots,
missing adapters, and intent mismatches return structured no-update results.
Warnings and updates from unrelated slots are not processed.

`discPresetProductionAdapterRegistry.ts` is exhaustive for all nine Classic
placement targets. `appRegisteredDiscPresetApplication.ts` now provides the
React-free production compatibility boundary: the legacy
`classic-top-title` menu ID resolves through the central alias registry, the
canonical definition resolves for the active Disc template, and the generic
application planner emits typed updates from a focused immutable owner-state
snapshot. The wrapper translates those updates into normal feature-owner state
without changing enablement or content. `appDiscRolePresetApplication.ts`
dispatches each touched owner family once and does not run the legacy broad
post-application clamp path for Classic. The other two built-in Disc presets
remain on their existing legacy update plans.

Normal Classic application is now `applied`, including blank/disabled Legal and
short or realistic enabled Legal content. Only genuine fitting or other
placement failures keep the result `partial`; valid updates still apply and
guided workflow activation remains allowed. A successful or accepted partial
application records one transient canonical preset ID/revision together with
its latest resolved runtime definition in `useActiveDiscPreset`. Failed
application preserves the previous state, legacy preset application replaces it
with `null`, and the existing reset, workspace-exit, and project-load lifecycle
clears it. Neither the active identity nor resolved definition is persisted.

Late Operating System Mark eligibility changes now use that active state to
re-resolve and apply only `operating-system-marks.enabled`. The platform-mark
owner composes the user-requested next state, targeted grouped placement, and
the final owner state before one state commit. Legal enablement, canonical
manual/metadata/rich content, and measurement-relevant style changes similarly
invoke only `legal.copyright` against the next authoritative Legal state. Each
targeted result replaces only its matching slot in the active resolved
definition, so OS grouping and Legal fitting refinements coexist. Guided
placeholder projection consumes that same active resolved definition and hides
unsupported slots instead of falling back to nominal geometry. Custom preset
storage, Save as Preset, editing, import/export UI, and repeatable placement
intents remain deferred.

Current role/navigation definitions live in:

- `src/editor/editorNavigationShell.ts`

Current disc layout/default helpers live primarily in:

- `src/layout/discTemplateLayoutDefaults.ts`
- `src/layout/presets.ts`

Current feature-local layout presets exist, but they are not coordinated
role-based packaging presets:

- `DISC_TEXT_LAYOUT_PRESETS` applies to individual disc text rows.
- `RATING_BADGE_LAYOUT_PRESETS` applies to rating-badge placement.
- Case insert text controls reuse/adapt text-layout presets for case text.

Current saved projects use schema version `0.2.0`. The schema persists only the
active guided layout ID/version plus independent canonical omitted/completed
slot IDs; it does not
persist generic preset identity, resolved geometry, a role-layout schema, or an
object-role model. `PROJECT_FILE_SPEC.md` remains authoritative, and broader
role or preset persistence must go through explicit schema and migration work.

Current optional-feature behavior is state-preserving. Helpers such as
`setOptionalVisualFeatureEnabled` and `setOptionalLayoutFeatureEnabled` toggle
only `enabled` while preserving payload and layout fields. Tests cover this
contract for optional visual helpers, title artwork, logo assets, rating
badges, platform marks, technical marks, additional artwork, and case insert
image/logo/mark slots.

## 4. Definitions

**Role-based layout preset**: A named design recipe that targets semantic
packaging roles, such as Game Title, Background Image, Company Logos, Legal
Info, and Additional Artwork, and applies coordinated defaults to their current
feature-owned state.

**Preset identity**: A stable identifier for a built-in named preset. Future
saved projects may store it for display or reapply behavior only after explicit
schema work.

**Preset label**: User-facing name for a preset. Labels may change more easily
than preset IDs and should not be used as saved identity.

**Target surface**: The packaging surface a preset applies to: Disc Label, Case
Front, Case Back, or Spine.

**Role target**: The semantic role addressed by a preset on a target surface.
For #270, role targets should be disc roles only.

**Preset slot**: A role sub-target used when a role is repeatable or has known
sub-parts, such as developer logo, publisher logo, additional logo 1, media
mark, platform mark, or additional artwork 1.

**Placement defaults**: Position data applied through current feature owners.
Disc visual roles generally use percent-ish `x`/`y` fields or background
`offset` fields, interpreted by existing render/export paths.

**Size defaults**: Scale, width, font size, arc, or fit values applied through
the current feature model for the target object.

**Layer defaults**: Desired design ordering. Current render/export layer order
remains authoritative; presets must not change renderer order unless a later
renderer-specific issue explicitly changes that contract.

**Fit/default contract**: Artwork-specific defaults such as contain, cover,
crop, focal offset, or source selection. Disc currently exposes different
fields per artwork family; a preset adapter must map only to fields the current
owner supports.

**Enablement defaults**: Whether applying the preset should turn a targeted role
or slot on. Enabling must not erase preserved disabled-state data.

**Manual fine-tuning**: User edits made after applying a preset, through drag,
sliders, manual numeric controls, text controls, upload/source controls, or
reset/clear actions.

**Reapply**: A future explicit action that applies the preset recipe again to
current state. Reapply should be separate from ordinary editing and loading.

**Reset**: Existing feature-level reset/default behavior. Resetting a feature
after applying a preset should remain feature-owned unless #270 intentionally
adds a preset-specific reset action.

## 5. Supported Target Surfaces

The model recognizes these target surfaces:

| Surface | Current navigation id | Preset implementation status |
| --- | --- | --- |
| Disc Label | `disc-label` | First implementation target for #270. |
| Case Front | `front` | Conceptual only for #269; defer implementation. |
| Case Back | `back` | Conceptual only for #269; defer implementation. |
| Spine | `spine` | Conceptual only for #269; defer implementation. |

Disc-first work should keep the shared types neutral enough for future adapters,
but it should not force case/spine preset behavior before the case surfaces have
settled.

## 6. Disc Role-To-State Mapping

For #270, presets should target the current Disc Label roles. The table below
uses current UI shell IDs for orientation, but those IDs are not automatically
the future persisted preset IDs.

| Disc role | Current role id | Source-of-truth state | Layout fields | Enablement fields | Notes |
| --- | --- | --- | --- | --- | --- |
| Background Image | `background-artwork` | Disc background state from `useBackgroundArtwork` and project snapshot/restore helpers. | `scale`, `offset.x`, `offset.y`; image size/source data. | `background.enabled`. | Single primary artwork role. Presets may set fit/scale/offset, but should not erase selected image source. |
| Game Title | `game-title` | Title/logo artwork state plus disc text row `title`. | Title artwork `layout.x`, `layout.y`, `layout.scale`; text layout `x`, `y`, `width`, `scale`, `fontSizePt`, `align`, `mode`. | Title artwork `layout.enabled`; disc text setting `title.enabled`. | Presets need an explicit decision for artwork-vs-text fallback. They should not require a user to have imported title artwork. |
| Game Info Logos | `game-info-logos` | Rating badge, media mark, platform marks, technical marks. | Mark-specific `layout.x`, `layout.y`, `layout.scale`, plus related supplemental layouts. | Mostly `layout.enabled` per mark asset; platform/technical enabled values also depend on selected value arrays. | Multi-family role. Presets should target sub-slots such as rating badge, media mark, platform marks, and technical marks. |
| Company Logos | `company-logos` | `ProjectLogoAssets`, including developer, publisher, and additional logo assets. | Primary logo layouts and additional logo `layout.x`, `layout.y`, `layout.scale`. | Primary/additional logo `layout.enabled`. | Repeatable through additional logo arrays; presets should distinguish developer, publisher, and additional slots. |
| Legal Info | `legal-info` | Disc text row `copyright` and legal metadata source/default behavior. | Text layout `x`, `y`, `width`, `scale`, `fontSizePt`, `align`, `mode`, `arcDegrees`, `arcSide`. | Disc text setting `copyright.enabled`. | Fixed-row role. Presets may choose curved or straight layout while preserving text content/source. |
| Additional Artwork | `additional-artwork` | `ProjectAdditionalArtwork` and `elements[]`. | Global feature plus per-element `layout.x`, `layout.y`, `layout.scale`, frame fields. | Global `additionalArtwork.enabled`; per-element `layout.enabled`; frame `enabled`. | Repeatable bounded role. Presets should apply to existing elements or create/use only implementation-approved slots. |
| Additional Text | `additional-text` | Disc text rows other than title/legal: subtitle, disc number, backup date, App ID, developer, publisher, install notes, custom note. | Text layout `x`, `y`, `width`, `scale`, `fontSizePt`, `align`, `mode`, plus style fields where applicable. | Per-row disc text setting `enabled`. | Fixed known rows, not arbitrary user-authored text layers. |

Other current disc output, especially Steam-style banner branding, remains a
setup/branding system outside the current Disc Label role list. #270 should not
silently fold it into role presets unless the issue scope is expanded.

## 7. Placement, Sizing, And Layer Contract

Preset placement and sizing data should be declarative and role-oriented, then
translated by editor-specific adapters into current feature-owned state.

Disc placement/sizing should map to current fields:

- visual logos/artwork/marks: `layout.x`, `layout.y`, `layout.scale`;
- background artwork: `scale`, `offset.x`, `offset.y`;
- text rows: `x`, `y`, `width`, `scale`, `fontSizePt`, `align`, `mode`,
  `arcDegrees`, and `arcSide` as supported by the row;
- repeated artwork/extra logos: the same per-slot fields used by the existing
  feature owners.

Preset coordinates should remain template-aware. #270 should prefer existing
helpers in `src/layout/discTemplateLayoutDefaults.ts` where they express the
desired default, and add focused preset helpers only when the role preset needs
coordinated geometry beyond those feature defaults.

Layer/default data should document design intent, but renderer order remains
owned by current preview/export layers. A role preset must not introduce a
parallel layer ordering system that diverges from `DISC_EDITOR_LAYER_ORDER.md`
or current render/export behavior.

## 8. Artwork Fit/Default Contract

Artwork roles need fit/default semantics because different artwork families are
not interchangeable:

- Background Image may need cover/contain-like behavior, scale, and offset.
- Game Title artwork needs foreground placement and scale, with text fallback
  available when artwork is missing or disabled.
- Company Logos and Game Info Logos need scale/placement without destroying
  selected/custom image sources.
- Additional Artwork needs per-element scale/placement and optional frame
  preservation.

For #270, a preset should avoid inventing new crop or focal-point state unless
that state already exists in the target feature. If a design needs a future
field, document it as a schema/model gap and leave implementation for a focused
follow-up.

Applying an artwork preset should not replace user-selected images. It may set
layout, fit, and enablement fields for intended visible roles. Source changes
should require explicit implementation scope, because source ownership is
feature-specific and save/load-sensitive.

## 9. Text Defaults Contract

Text role presets should apply layout and presentation defaults while preserving
text content and metadata-source behavior unless a future issue explicitly
defines content defaults.

Disc text roles divide into:

- Game Title: fixed title row plus title/logo artwork fallback decisions.
- Legal Info: fixed copyright/legal row, currently often curved.
- Additional Text: fixed rows for subtitle, disc number, backup date, App ID,
  developer, publisher, install notes, and custom note.

For future case work, text roles also include Game Description Text, Feature
Bullets / Callouts, System Requirements, spine title, spine legal rows, and
surface-specific additional text rows.

Existing feature-local text layout presets are allowed inputs to a role preset,
but they are not role presets by themselves. A role preset coordinates multiple
semantic roles; a text layout preset changes one row or row family.

## 10. Repeatable Role Behavior

Repeatable roles need explicit slot targeting. The current repeatable or
multi-slot roles include:

- Company Logos: developer, publisher, and additional developer/publisher
  logos.
- Game Info Logos: rating badge, media mark, platform marks, technical marks,
  supplemental USK badge, and technical additional assets.
- Additional Artwork: bounded `elements[]`.
- Future Case Back Screenshots: semantic screenshot use of tray/back artwork
  slots.

For #270, repeatable-role rules should be conservative:

- Target known primary slots by semantic name where they exist.
- Target additional/repeated slots by stable preset slot index only when the
  current feature owner already supports that slot shape.
- Preserve extra user-created slots that the preset does not target.
- Do not delete or clear images, text, sources, or frame styling as part of
  applying a preset.
- Do not disable unrelated repeatable slots unless the preset model has an
  explicit, reviewed `disableUntargeted`-style behavior.

Open design decision: whether a preset may create missing repeated slots, reuse
the first existing empty slots, or only modify slots that already exist. For
disc-first #270, prefer the smallest rule that implements the starter presets
without surprising existing projects.

## 11. Enablement And Disabled-State Preservation

Applying a preset may enable intended visible roles. It must preserve disabled
state data even when it changes an `enabled` flag.

Required rules:

- Untargeted roles remain unchanged.
- Targeted roles may be enabled only when the preset explicitly says they are
  intended visible elements.
- Disabling a role as part of a preset should be avoided for #270 unless the
  behavior is explicit, documented, and tested.
- Toggling enablement must preserve payload, image source, custom uploads,
  selected values, layout, scale, frame settings, text content, and metadata
  source state.
- Disabled features must continue to hide dependent controls, omit preview
  rendering, and omit PNG export rendering.

This mirrors current optional visual feature behavior and the existing tests
around disabled-state preservation.

## 12. Application Contract

Preset application should be an explicit command that updates normal project
state through existing feature owners or focused domain helpers. It should not
create renderer-specific state, export-only state, or App-level layout logic.

Application rules:

- Resolve the target surface first.
- Resolve each preset role target to the current feature owner for that
  surface.
- Apply only fields declared by the preset and supported by the current owner.
- Keep role adapters editor-specific: disc, case front, case back, and spine
  can share neutral preset definitions, but state updates must respect each
  surface's actual state shape.
- Preserve preview/edit/export parity by changing the same state that current
  preview, export, and save/load paths already consume.
- Keep orchestration thin in `App.tsx`; substantive mapping, layout, and state
  transitions belong in focused modules or hooks.
- Treat unsupported role targets as no-ops with testable diagnostics or
  developer-visible validation, not as silent schema mutation.

A future implementation may use a shape like this as a conceptual guide:

```ts
type RoleBasedPreset = {
  id: string
  label: string
  targetSurface: 'disc-label' | 'front' | 'back' | 'spine'
  roleTargets: readonly RolePresetTarget[]
}
```

This is illustrative only. #269 does not add this type to source.

### Guided Layout Identity And Versioning

Guided layouts add project-specific workflow state beside the reusable generic
preset definition. Their stable compatibility identity is the pair of guided
layout ID and positive safe-integer version. The version is declared and is not
inferred from coordinates, slot order, or slot count. Classic Top Title begins
at version `1`; its compatibility ID resolves to the canonical
`builtin:disc-preset:classic-top-title` definition instead of owning another
copy of Classic geometry.

Reapplying the same guided ID/version preserves valid omission and completion
progress. Changing guided layout ID starts a new workflow, clears unrelated
progress, and seeds slots already satisfied by the new preset application's
authoritative next owner state. Moving to another supported version of the same
ID preserves omitted and completed semantic slot IDs that still exist and
discards removed or unknown IDs; newly introduced slots begin included and
incomplete. Unsupported IDs or versions fail safely. Schema `0.2.0` persists
this active identity plus independent canonical `omittedSlotIds` and
`completedSlotIds` under `editor.guidedLayout`; it does not persist preset
geometry, a resolved definition, owner state, labels, focus, or menu state.

### Implemented Generic Disc V1 Contract

The implemented Disc V1 definition refines this earlier sketch. A definition
contains only JSON-compatible identity, compatibility, ordered slots, normalized
content/action regions, visual layers, and allowlisted placement intents. The
runtime registry returns immutable definitions and small menu summaries. Project
workflow state, project omissions, feature-owner content, and future storage
library metadata remain separate domains.

V1 placement intents support point-centered fixed owners, straight Disc text,
background cover placement, and the enabled operating-system-mark group. V1
does not serialize callbacks, owner property paths, DOM identifiers, project
object IDs, curved text approximations, or unimplemented repeatable placement
kinds. Repeatable screenshots, Additional Artwork, and additional logos require
a later validated format/intent extension paired with real owner adapters.

The nominal definition is reusable serialized data. A resolved Disc preset is
transient template-specific data: it records the source preset ID/revision,
active template ID, nominal and resolved regions, per-slot resolution status,
placement intents, and structured warnings. Template-level resolution may clip
a region to normalized Disc bounds or reject/mark a region that cannot intersect
the safe annulus. A content-aware adapter may return one exact slot patch after
owner-specific fitting; the engine validates slot identity and merges at most
one patch per invocation without changing nominal geometry or slot order. No
resolved preset is saved to the project schema.

Application planning consumes a resolution result plus a trusted adapter
registry and focused semantic owner-state slices. Unsupported slots are skipped.
A missing adapter or intent mismatch produces a structured warning and a partial
plan while other valid placements continue. A rejected resolution produces no
updates. Concrete adapters now emit immutable discriminated layout updates for
title artwork, Rating, Media Format Mark, primary logos, Disc text, and
Background. Each variant contains only placement-owned fields; arbitrary object
patches, enablement changes, payload copies, and dynamic property paths are
forbidden. Classic now consumes this plan through the focused app-domain
compatibility wrapper. Disabled title artwork/text, Rating, Media, primary
Developer/Publisher Logos, and copyright receive dormant layout while remaining
disabled. Background content and enablement are likewise preserved. Only
already selected, enabled, renderable OS marks receive grouped layout updates.
The two non-Classic built-ins remain transitional legacy callers.

Successful or accepted-partial Classic application retains a transient
canonical preset ID/revision and latest template-resolved definition for
guidance plus targeted OS/Legal application. That state is deliberately not
serialized. Project load restores schema `0.2.0` guided workflow metadata and a
focused post-restore boundary maps its valid layout identity to the canonical
preset, resolves the restored template, performs content-aware Legal
refinement, and records the transient active preset state. The reconstruction
does not dispatch its planned owner updates, infer identity from coordinates,
or duplicate resolved geometry into the project file. It preserves targeted
late OS grouping and Legal refitting after load.

Persistent completed/claimed slot progress is recorded only by explicit owner
domain events and one-time activation seeding. It stays independent from live
owner-filled and omission state; clearing or disabling an owner does not
resurrect a completed guide. `Include again`, `Show guide again`, and `Reset
guided progress` affect only workflow presentation. Aspect-preserving
contain-fit is not implemented; #296 owns that placement-policy extension.
Current point-owner adapters therefore continue to support deterministic
positive fixed scales.

## 13. Manual Fine-Tuning And Reset Contract

A preset is a starting point, not a lock. After applying a preset, users must be
able to fine-tune layout through the same controls that work today.

Manual edits after preset application should:

- update normal feature-owned project state;
- remain visible in preview;
- export the same way they preview;
- save and load normally;
- not be overwritten unless the user explicitly reapplies a preset or chooses a
  reset action.

Operating System Marks are the deliberate grouped-slot exception. Selecting,
deselecting, enabling, or disabling a mark, or changing an asset/source/theme
in a way that can affect renderability or bounds, reflows every currently
eligible OS mark inside the active preset's resolved group region. This may
replace manual OS positions. It never moves another preset target, and ordinary
unrelated project edits do not trigger regrouping.

Legal text is the focused content-fit exception. Direct Legal `x`, `y`, width,
point-size, and other layout edits remain normal owner state and do not trigger
an immediate refit. While a compatible preset remains active, changing Legal
enablement, canonical resolved content, rich-text source, font family, bold, or
italic refits only `legal.copyright` and may replace its manual placement.
Style reset/preset actions also refit. Explicit full preset reapplication
restores the preset Legal center and fit. No effect watches owner coordinates,
and no unrelated text row is reapplied.

Reset behavior should remain feature-owned for #270. Existing actions such as
reset title artwork layout, reset rating badge layout, reset logo layout, reset
additional artwork element layout, and reset disc text layout should continue
to reset to their feature defaults unless #270 intentionally introduces a
preset-scoped reset command.

Open design decision: whether a future project stores "last applied preset" and
"dirty since preset" metadata. That requires schema work and should not be
assumed for #270 unless explicitly included.

## 14. Save/Load Normalization Expectations

Current saved projects do not store generic role-preset identity or resolved
preset geometry. They store resulting feature-owned state plus the focused
guided workflow metadata under schema version `0.2.0`.

The implemented Disc preset application writes normal existing
layout/enablement fields. In the current model:

- the generic selected preset identity and resolved definition are not
  persisted;
- save/load persists the resulting role layout through existing project fields;
- schema `0.2.0` separately persists active guided layout identity/version and
  independent canonical `omittedSlotIds` and `completedSlotIds`;
- a missing completion array in an otherwise valid `0.2.0` project normalizes
  to empty, while `0.1.0 -> 0.2.0` invents no workflow or completion history;
- project load reconstructs transient generic preset state from the explicit
  guided layout mapping after restored template/owner state is available,
  without applying owner placement;
- completion is seeded from satisfied owners only when a new/different layout
  activates and is otherwise recorded only by semantic user events;
- aspect-preserving contain-fit remains unimplemented under #296.

Any future persistence of preset identity or role-layout metadata must:

- update `PROJECT_FILE_SPEC.md`;
- register schema/version/migration behavior in the project schema layer;
- tolerate migrated `0.1.0` projects with no guided workflow fields;
- tolerate unknown or removed preset IDs;
- never block loading a project just because a preset ID is missing;
- preserve user-provided assets, text, disabled state, selected sources,
  placement, scale, and export options where possible.

If preset identity is added later, it should be informational and useful for
explicit reapply or UI display. The saved feature-owned project state remains
the source of truth for preview, editing, export, and compatibility.

## 15. Grouped Platform-Mark Placement

Disc layout code exposes a pure grouped platform-mark placement capability for
presets that need to arrange existing operating-system marks inside one
normalized region. The helper uses `PlatformMarkValue` as stable identity and
the canonical platform-mark option order. Selected assets are materialized
through the existing project accessor, and built-in fallback artwork counts as
renderable only where the normal platform-mark owner also treats it as valid.

The helper positions only marks that are already selected, enabled, and
renderable. It never selects, enables, disables, imports, or substitutes a
mark. Returned immutable updates contain only identity, `x`, `y`, and `scale`,
so source, theme, custom images, inference metadata, and every unrelated field
remain owner state.

Placement uses normalized Disc coordinates, a stable gap, one centered row
when practical, and balanced rows when they preserve a larger common scale.
It reuses platform bounds and safe-zone clamping, keeps final bounds inside the
requested region, rejects pairwise overlap, and avoids the physical center
hole. A centered hub conflict tries the nearest downward placement before the
equivalent upward placement. Impossible regions return a typed no-op failure
instead of overlapping, moving outside the region, or mutating owner state.

Classic Top Title now adopts this capability for its Operating System Marks
slot at normalized region `50, 73, 28, 10`. The preset applies only returned
`x`, `y`, and `scale` values to already selected, enabled, renderable marks.
It never selects or enables marks. A typed no-op or impossible result preserves
the complete owner state unchanged.

The same grouping runs after later selection, per-mark enablement, custom asset
upload/removal, and source/theme changes while the exact compatible preset
revision remains active. It receives the already-computed next platform state,
uses the resolved region rather than copied Classic coordinates, and merges
only `x`, `y`, and `scale`. Direct x/y/scale edits and layout reset do not invoke
targeted placement, which prevents placement-update recursion. Explicit preset
reapplication still runs the full application engine.

## 15.1 Classic Top Title Exact Guided Contract

Classic Top Title exposes eight expected-content slots: Game Title, Background
Image, Rating Badge, Media Format Mark, Operating System Marks, Developer Logo,
Publisher Logo, and Copyright / Legal Text. Game Info Logos and Company Logos
remain sidebar groupings rather than guided slots.

Rating, Media, and OS validity resolve independently. Developer and Publisher
also resolve independently. The preset no longer auto-enables Media Format and
does not enable Rating, OS marks, either primary logo, or Copyright. Existing
enabled/renderable content is repositioned while text/assets, selected values,
sources, themes, custom images, and disabled state remain feature-owner data.
Legal's nominal `50, 85, 46, 8` region is measured against its canonical
manual, metadata, or rich content; the same final resolved region/status drives
its guided placeholder. No preset identity, resolved runtime definition,
guided lifecycle, or slot completion state is persisted.

## 16. Disc-First Implementation Guidance For #270

#270 should start with explicit named Disc Label presets.

Recommended disc-first scope:

- define built-in preset identities and labels;
- target only Disc Label roles;
- update existing feature-owned disc state through focused helpers;
- use current layout defaults where appropriate;
- add focused unit tests for role-to-state application;
- prove disabled-state preservation for any preset that changes enablement;
- avoid save/load schema changes unless the issue scope explicitly changes.

Recommended initial role coverage:

- Background Image;
- Game Title;
- Game Info Logos;
- Company Logos;
- Legal Info;
- Additional Artwork, bounded to current `elements[]` behavior;
- Additional Text, bounded to fixed disc text rows.

Recommended exclusions for #270:

- case front/back/spine presets;
- marketplace/user-authored preset editing;
- arbitrary role/layer authoring;
- renderer/export changes;
- Steam Branding preset targeting unless explicitly added;
- new crop/focal-point schema;
- saved preset identity unless paired with schema/migration work.

Validation for #270 implementation should include source tests around preset
application, disabled-state preservation, save/load round trips when state
changes are persisted through existing project fields, preview/export parity
tests where practical, and manual Tauri verification for user-visible editor
behavior when UI is added.

## 17. Deferred Case/Spine Work

Case Front, Case Back, and Spine should wait for later work because their
object-role boundaries are still less settled than the Disc Label surface.

Deferred areas:

- Case Front presets for cover background, title, logos, legal info,
  additional artwork, and additional text.
- Case Back presets for screenshots, description, feature bullets/callouts,
  requirements, legal info, logos, and additional text.
- The distinction between Case Back Screenshots and generic Additional Artwork.
- Spine presets for title/logo, background, company logo, media format, game
  info logos, legal info, and extra text/artwork.
- Spine mirroring/editing setup. Mirroring is an editing mode, not a packaging
  role target, unless a future issue explicitly designs editing-mode presets.
- Steam Backup branding on Spine. Current taxonomy notes it as a visible spine
  role but also a setup/branding output; future work should decide whether it
  is a preset target.

## 18. Non-Goals And Invariants

Non-goals:

- Do not implement presets in #269.
- Do not add UI controls in #269.
- Do not implement preset marketplace or arbitrary user-authored presets.
- Do not change save/load schema in #269.
- Do not change renderers or export behavior in #269.
- Do not move existing controls in #269.
- Do not add layout logic dumping grounds to `App.tsx`.

Invariants:

- Existing project files must load safely.
- Existing blank-project workflows remain valid.
- Preview, edit, export, and save/load parity must be preserved.
- Optional visual features must hide dependent controls while disabled,
  preserve disabled-state data, and omit disabled visuals from preview/export.
- Feature owners remain responsible for their own state, reset/clear behavior,
  source switching, upload/import behavior, rendering, export, and project
  normalization.
- Setup/workflow controls such as Project File, Export Options, Template,
  metadata import, and surface editing modes remain outside packaging role
  presets unless a future issue explicitly changes that boundary.

## 19. Unknowns And Decisions Needed

Open decisions before or during #270:

- Whether preset-domain role IDs should match current UI shell IDs or use a
  separate stable ID namespace.
- Whether a preset can create missing repeated slots or only update slots that
  already exist.
- Whether a preset may disable untargeted visible roles, and how that would be
  surfaced to users.
- How to distinguish title artwork, title text fallback, and title text
  visibility in a preset.
- Whether Steam Branding belongs in disc role presets later.
- Whether "last applied preset" or "dirty since preset" should ever be stored.
- Where future persisted preset identity should live if schema work is approved.
- How future crop/focal-point data should be represented for artwork roles.
- How case back Screenshots and Additional Artwork should diverge in state and
  UI.
- How spine mirroring should interact with preset application if spine presets
  are added later.

## 20. Related Issues And Docs

Related issues:

- #168: parent layout preset and role-based editor hierarchy direction.
- #267: role hierarchy and object-role model.
- #269: this role-based preset model and application contract.
- #270: starter Disc Label layout presets.
- #271: role navigation shell design boundary.
- #272/#274: visible role-panel migration work and case/spine role-panel follow-up.
- #48: broader project schema validation/migration support.
- #126/#149: case insert finish-line and structured case/spine layout work.

Related documents:

- `PACKAGING_ROLE_MODEL.md`
- `GUIDED_PRESET_SLOT_MODEL.md`
- `ISSUE_271_ROLE_NAVIGATION_SHELL.md`
- `SOFTWARE_DESIGN_DOCUMENT.md`
- `PROJECT_FILE_SPEC.md`
- `REPO_ARCHITECTURE_INVENTORY.md`
- `DISC_EDITOR_LAYER_ORDER.md`
- `CASE_INSERT_EDITOR_LAYER_ORDER.md`
