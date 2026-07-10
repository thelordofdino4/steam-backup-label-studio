# Guided Preset Slot Model
> Status: Design contract for GitHub issue #283.
> Purpose: Define the Disc guided preset slot identity, lifecycle, binding, and architecture boundaries for parent issue #281.
> Read when: Working on guided Disc presets, slot resolution, edit-mode placeholders, role-focus navigation, guided persistence, or safe content suggestions.
> Authoritative source: Current source for implemented behavior; `PACKAGING_ROLE_MODEL.md` for semantic roles; `ROLE_BASED_PRESET_MODEL.md` for layout presets; `PROJECT_FILE_SPEC.md` for saved-project schema; `SOFTWARE_DESIGN_DOCUMENT.md` for architecture contracts.

## Implementation Status

Pure Disc slot definitions and lifecycle resolution are implemented in
`src/guidedPresets/discGuidedSlots.ts`. Skip and suggestion inputs remain
transient. Geometry, React UI, placeholder rendering, navigation, persistence,
and auto-fill remain deferred.

## 1. Purpose And Scope

Guided slots describe content that a guided preset expects at a particular
place in a layout. A slot can ask for a Game Title, Background Image, Rating,
Company Logo, Legal Text, Additional Artwork, or Additional Text without
becoming a second copy of that content.

A slot definition is domain guidance, not rendered project content. Existing
feature owners remain the source of truth for images, text, marks, enablement,
layout, editing, save/load, preview, and export. An unfilled slot does not create
or enable a feature object merely because the slot exists.

This contract is Disc Label only. It defines identity, vocabulary, accepted
content, binding and validity rules, lifecycle derivation, and architecture
boundaries for #281. The pure source definitions and lifecycle resolver are now
implemented; React UI, preview placeholders, role-focus navigation,
persistence, and auto-fill remain deferred. Case Front, Case Back, and Spine
guided presets remain deferred until the Disc contract is proven.

## 2. Identity Namespaces

Guided preset work crosses several identity namespaces. They must remain
distinct even when labels or fragments happen to match.

| Identity | Purpose | Example or rule |
| --- | --- | --- |
| Guided preset ID | Identifies a complete guided layout definition and its slot set. | Future domain ID; separate from the current #270 layout preset IDs. |
| Guided slot ID | Stable identity for one expected content position in a guided preset. | `disc:guided:game-title:primary` |
| Semantic role ID | Identifies the packaging job served by a slot. | `game-title`, `background-artwork`, `legal-info` |
| Feature-owner binding ID | Identifies the existing owner or concrete repeated object that can satisfy the slot. | Disc title artwork, Disc text `title`, additional-artwork element ID |
| Preview-editable ID | Identifies a real rendered feature for hover, selection, and editing overlays. | Existing IDs such as `disc:title-artwork` |
| DOM ID | Supports document structure, accessibility, or element lookup inside a presentation implementation. | Must not be the guided slot ID by default. |
| Smoke ID | Supports stable test and native-smoke targeting. | Must be derived through a dedicated helper later. |

Domain slot IDs must not double as DOM IDs, preview-editable IDs, or smoke IDs.
Presentation and smoke identifiers should be derived through dedicated helpers
when those implementations are added. Slot IDs must remain stable across label
and copy changes.

Repeatable feature bindings must use the persisted object ID already owned by
the feature. Array positions are ordering details and are forbidden as durable
binding identity.

Initial Disc guided slot IDs:

- `disc:guided:game-title:primary`
- `disc:guided:background-image:primary`
- `disc:guided:rating:primary`
- `disc:guided:company-logo:primary`
- `disc:guided:legal-text:copyright`
- `disc:guided:additional-artwork:primary`
- `disc:guided:additional-text:custom-note`

## 3. Proposed Vocabulary

The following snippets introduced the vocabulary now implemented by the pure
Disc guided-slot source model.

```ts
type GuidedSlotLifecycle =
  | 'unfilled'
  | 'suggested'
  | 'filled'
  | 'skipped'

type GuidedContentKind =
  | 'image'
  | 'text'
  | 'domain-mark'
```

A conceptual slot definition contains:

- a stable slot ID;
- target surface;
- semantic role;
- accepted content kinds;
- an optional preferred content kind;
- ordered candidate feature-owner bindings;
- optional and skippable status;
- auto-fill eligibility policy;
- explicit placeholder geometry; and
- a typed role-focus destination.

A conceptual slot resolution contains:

- the derived lifecycle;
- the concrete feature-owner target when filled;
- a transient suggestion when one is available; and
- explicit skip intent when that intent is supported.

Definitions describe what a preset expects. Resolutions describe how the
current editor state satisfies that expectation. Neither owns feature content.

## 4. First Disc Slot Catalog

### Game Title

| Property | Contract |
| --- | --- |
| Slot ID | `disc:guided:game-title:primary` |
| Semantic role | `game-title` |
| Accepted kinds | `image`, `text` |
| Preferred kind | `image` |
| Candidate bindings | Disc title artwork, then Disc title text |
| Optional/skippable | Expected and skippable |
| Safe suggestion | Imported Steam title/logo artwork; meaningful imported title text as fallback |
| Safe auto-fill | Imported Steam title/logo artwork when the existing import path has already accepted it |
| Sidebar role | Game Title |
| Export | Existing title artwork or Disc text export predicate after binding |
| Movement | Existing title artwork or Disc text behavior after binding only |

Renderable title artwork has priority. If artwork cannot render, enabled and
meaningful title text can satisfy the slot. Default placeholder copy such as
`Untitled` is not meaningful completion. A guided workflow must never
automatically enable both title artwork and title text.

### Background Image

| Property | Contract |
| --- | --- |
| Slot ID | `disc:guided:background-image:primary` |
| Semantic role | `background-artwork` |
| Accepted kinds | `image` |
| Preferred kind | `image` |
| Candidate binding | Background image owner |
| Optional/skippable | Expected and skippable |
| Safe suggestion | None by default |
| Safe auto-fill | None by default |
| Sidebar role | Background Image |
| Export | Existing enabled effective-background export path after binding |
| Movement | Existing background drag and scale behavior after binding only |

The background owner must be enabled and expose a real effective image. An
enabled owner with no effective image remains unfilled. Default or invented
artwork must not count as filled.

### Rating

| Property | Contract |
| --- | --- |
| Slot ID | `disc:guided:rating:primary` |
| Semantic role | `game-info-logos` |
| Accepted kinds | `domain-mark`, `image` |
| Preferred kind | `domain-mark` |
| Candidate binding | Primary rating badge |
| Optional/skippable | Optional and skippable |
| Safe suggestion | Accepted rating metadata or an already configured supported badge source |
| Safe auto-fill | Existing accepted rating metadata under the current import policy |
| Sidebar role | Game Info Logos |
| Export | Existing rating-badge export predicate after binding |
| Movement | Existing rating-badge drag/layout behavior after binding only |

Validity uses the existing `shouldRenderRatingBadge` domain rule.
Metadata-backed generated badges can be valid without a custom image.
`ratingSystem: none` is not filled, and guided resolution must not invent
missing rating content.

### Company Logo

| Property | Contract |
| --- | --- |
| Slot ID | `disc:guided:company-logo:primary` |
| Semantic role | `company-logos` |
| Accepted kinds | `image` |
| Preferred kind | `image` |
| Candidate bindings | Developer logo, then publisher logo, then future repeated company-logo object IDs |
| Optional/skippable | Optional and skippable |
| Safe suggestion | Existing developer or publisher assets; remote candidates before import |
| Safe auto-fill | An existing enabled real asset; remote candidates require import first |
| Sidebar role | Company Logos |
| Export | Existing logo export predicate after binding |
| Movement | Existing logo drag/layout behavior after binding only |

Initial resolution priority is developer logo, then publisher logo. A valid
binding is enabled and has a real image asset. Empty or generic placeholders do
not count. Whether developer and publisher should become separate guided slots
is an open product decision.

### Legal Text

| Property | Contract |
| --- | --- |
| Slot ID | `disc:guided:legal-text:copyright` |
| Semantic role | `legal-info` |
| Accepted kinds | `text` |
| Preferred kind | `text` |
| Candidate binding | Disc copyright text row |
| Optional/skippable | Optional and skippable |
| Safe suggestion | Accepted or generated legal metadata marked for review where appropriate |
| Safe auto-fill | Existing accepted legal metadata under the current import policy |
| Sidebar role | Legal Text |
| Export | Existing Disc copyright-text export predicate after binding |
| Movement | Existing straight or curved Disc text behavior after binding only |

The copyright row must be enabled and its resolved content must be nonblank.
Metadata stored in a textarea does not make the visual slot filled if the
visual row is disabled. The existing Disc text owner remains responsible for
straight or curved rendering.

### Additional Artwork

| Property | Contract |
| --- | --- |
| Slot ID | `disc:guided:additional-artwork:primary` |
| Semantic role | `additional-artwork` |
| Accepted kinds | `image` |
| Preferred kind | `image` |
| Candidate binding | Concrete additional-artwork element ID |
| Optional/skippable | Optional and skippable |
| Safe suggestion | None by default |
| Safe auto-fill | None by default |
| Sidebar role | Additional Artwork |
| Export | Existing repeated artwork predicate after binding |
| Movement | Existing repeated artwork drag/layout behavior after binding only |

Additional Artwork must be globally enabled, the bound element must exist and
be enabled, and that element must contain real image data. The binding uses the
element's persisted object ID, never its array index. A slot definition does
not create a missing artwork element.

### Additional Text

| Property | Contract |
| --- | --- |
| Slot ID | `disc:guided:additional-text:custom-note` |
| Semantic role | `additional-text` |
| Accepted kinds | `text` |
| Preferred kind | `text` |
| Candidate binding | Disc text `customNote` row |
| Optional/skippable | Optional and skippable |
| Safe suggestion | None by default |
| Safe auto-fill | None by default |
| Sidebar role | Additional Text |
| Export | Existing Disc custom-note export predicate after binding |
| Movement | Existing Disc text behavior after binding only |

The fixed `customNote` row must be enabled and its resolved content must be
nonblank. This first contract uses an existing fixed row; it does not introduce
an arbitrary repeatable text-layer model.

## 5. Lifecycle Derivation And Precedence

Resolution uses this precedence:

1. Explicit skip intent, when supported, resolves to `skipped`.
2. Valid bound feature state resolves to `filled`.
3. A valid available suggestion resolves to `suggested`.
4. Otherwise the slot resolves to `unfilled`.

Disabled is not automatically skipped. Existing feature owners deliberately
preserve disabled payload, so a feature can contain saved data while its guided
slot remains unfilled because the feature is disabled or cannot render.

Clearing or disabling content can move a previously filled slot back to
unfilled or suggested. Skip intent suppresses guidance without deleting the
feature payload. Re-enabling a feature or accepting a suggestion must continue
through the existing owner instead of mutating duplicated slot content.

## 6. Lifecycle Transition Table

| State | Allowed next states | Edit-mode behavior | Drag/resize | Export | Owner behavior |
| --- | --- | --- | --- | --- | --- |
| `unfilled` | suggested, filled, skipped | Placeholder visible | No | No | Definition names candidates; no owner object is created by the placeholder. |
| `suggested` | unfilled, filled, skipped | Suggestion affordance visible | No | No | Candidate is transient and is not authoritative feature state. |
| `filled` | unfilled, suggested, skipped | Real feature suppresses the placeholder | Existing owner capabilities | Existing owner predicate | Manual edits remain normal project state. |
| `skipped` | unfilled, suggested, filled | Placeholder hidden or subdued by a future UX decision | No | No output merely from skip state | Existing feature payload is preserved. |

Placeholder visibility in this table is a contract for future implementation,
not current UI behavior.

## 7. Derived, Transient, And Persisted State

### Static Definitions

Preset/domain data contains slot ID, role, accepted and preferred kinds,
candidate bindings, default geometry, and skippable status.

### Derived State

Filled or unfilled status, valid-content availability, and a concrete owner
binding should normally be derived from existing feature-owner state. Derived
state should not be serialized merely for convenience.

### Transient State

The current suggestion, selected placeholder, open image/text chooser,
role-focus request, and hover/focus animation state can remain editor-session
state.

### Future Persisted State

Explicit skip intent, guided preset ID/version, repeatable-slot binding identity
that cannot be re-derived safely, and slot-specific overrides not represented
by normal feature state may require project persistence.

None of these fields are added to schema `0.1.0` by this issue.

## 8. Binding Contract

- Slot state must never duplicate text, image, mark, layout, selected source, or enabled fields.
- Filled slots bind to existing feature-owner objects.
- Existing feature owners remain authoritative for validation, mutation, rendering, export, and persistence.
- Resolution helpers may inspect feature state but must not mutate it.
- Binding adapters should be Disc-specific and thin.
- Repeatable bindings require stable persisted object IDs.
- Array index is forbidden as durable identity.
- A slot definition does not create an owner object merely by existing.

The title slot is the first ordered multi-owner binding: title artwork is
preferred, with Disc title text as fallback. The company-logo slot similarly
uses an explicit developer-then-publisher priority until product decisions
split those slots or introduce repeated guided company-logo positions.

## 9. Auto-Fill And Suggestion Boundaries

Potentially safe sources are imported Steam title/logo artwork, accepted rating
metadata, already configured platform or media marks, existing developer or
publisher assets, and accepted/generated legal metadata.

Existing Steam import behavior remains authoritative. Guided slots observe the
resulting owner state instead of rerunning Steam import. Remote logo candidates
remain suggestions until imported into a feature owner. Background Image,
Additional Artwork, and Additional Text normally remain unfilled until the user
chooses content.

Auto-fill must never overwrite user-selected assets or text, invent missing
content, or enable mutually exclusive title representations together. Actual
auto-fill implementation remains outside this issue.

## 10. Preview Placeholder Contract

- A placeholder is edit-mode-only guidance.
- It is a separate affordance layer, not a renderer replacement.
- It appears after normal Disc editor preview layers.
- It never enters export layer lists, export inputs, or PNG drawing helpers.
- It uses explicit preset geometry because an empty slot has no rendered DOM owner to measure.
- It may reuse the selected-element outline and pulse visual language.
- Animated treatment must respect reduced-motion preferences.
- It is non-draggable and non-resizable until filled.
- Filling suppresses the placeholder and continues through the existing feature renderer.

The current preview overlay geometry helpers can inform a later implementation,
but empty-slot geometry cannot depend on finding a real feature element in the
DOM. Source guards should keep the future guided overlay outside every export
layer and export-input path.

## 11. Role-Focus Navigation Contract

The following is a future typed request concept, not implemented source:

```ts
type EditorRoleFocusRequest = {
  surfaceId: 'disc-label'
  roleId: DiscRolePresetRole
  target?: DiscGuidedOwnerBinding
  requestId: number
}
```

The navigation shell should own panel expansion and focus behavior. Guided
placeholder components should emit intent rather than query the DOM, synthesize
clicks, or duplicate role-panel state. Current role panels are uncontrolled
`<details>` elements, so controlled expansion, target registration, and focus
ownership require a focused follow-up design.

## 12. Persistence Boundary

Static guided definitions and lifecycle derived from current feature state need
no schema change. Filled content remains ordinary project state under existing
feature owners.

An unfinished guided project cannot reliably restore explicit skip intent
without persistence. Repeatable slot binding identity can also require
persistence when it cannot be derived safely from a concrete owner ID and the
guided preset definition.

Any persisted guided preset ID, version, skip intent, or binding metadata needs
a dedicated child issue, an explicit schema/version decision, normalization,
migration coverage, and an update to `PROJECT_FILE_SPEC.md`. Unknown or deleted
guided preset IDs must normalize safely and must never prevent a project from
loading.

## 13. Architecture Invariants

- Existing feature owners remain the source of truth.
- No parallel asset, text, mark, enablement, or layout state is introduced.
- No second visual renderer is introduced.
- Placeholders never export.
- Unfilled and suggested placeholders never drag or resize.
- Guided domain logic must not become an `App.tsx` dumping ground.
- No Case Insert behavior changes in the Disc-first track.
- No schema changes in this child issue.
- No auto-fill implementation in this child issue.
- No arbitrary layer model is introduced.
- Preview, edit, save/load, and export parity remain intact for filled content.
- Blank projects remain valid and are not forced through a guided checklist.

## 14. Open Decisions

- Whether developer and publisher become separate guided slots or remain one primary company-logo slot.
- Exact skipped-state persistence design.
- Whether each safe suggestion auto-binds or requires confirmation.
- Repeatable-slot append versus reuse behavior.
- Guided preset and slot versioning.
- Placeholder geometry coordinate format and safe-zone representation.
- How role-panel expansion and focus become controlled.
- Whether disabled but otherwise valid payload shows an unfilled placeholder or a distinct inactive state.
- Whether `domain-mark` remains one content kind or splits into rating, media, platform, and technical kinds.
- How a primary repeated slot preserves its binding when repeated objects are reordered or removed.

## 15. Follow-Up Child Issues

1. Pure Disc slot definitions and resolution predicates.
2. Guided preset persistence/schema design.
3. Edit-mode placeholder overlay.
4. Typed preview-to-sidebar focus navigation.
5. Game Title image-first interaction and auto-fill.
6. Safe rating/logo/legal suggestions.
7. Filled-slot movement/export transition tests.
8. Native Tauri validation.

Related issues and contracts:

- #281: guided layout preset parent track.
- #283: this Disc slot domain and lifecycle contract.
- #267: packaging role taxonomy and object-role model.
- #269: role-based preset model and application contract.
- #270: completed Disc layout preset MVP.
- [`PACKAGING_ROLE_MODEL.md`](PACKAGING_ROLE_MODEL.md)
- [`ROLE_BASED_PRESET_MODEL.md`](ROLE_BASED_PRESET_MODEL.md)
- [`SOFTWARE_DESIGN_DOCUMENT.md`](SOFTWARE_DESIGN_DOCUMENT.md)
- [`PROJECT_FILE_SPEC.md`](PROJECT_FILE_SPEC.md)

