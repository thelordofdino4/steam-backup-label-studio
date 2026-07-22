# Guided Preset Slot Model
> Status: Implemented Disc domain, persistence, passive guidance, setup menus, and typed navigation contract for issues #283, #287, #289, and #292.
> Purpose: Define the Disc guided preset slot identity, lifecycle, binding, and architecture boundaries for parent issue #281.
> Read when: Working on guided Disc presets, slot resolution, edit-mode placeholders, role-focus navigation, guided persistence, or safe content suggestions.
> Authoritative source: Current source for implemented behavior; `PACKAGING_ROLE_MODEL.md` for semantic roles; `ROLE_BASED_PRESET_MODEL.md` for layout presets; `PROJECT_FILE_SPEC.md` for saved-project schema; `SOFTWARE_DESIGN_DOCUMENT.md` for architecture contracts.

## Implementation Status

Pure Disc slot definitions and lifecycle resolution are implemented in
`src/guidedPresets/discGuidedSlots.ts`. The versioned workflow and pure omission
transitions are implemented in `discGuidedWorkflow.ts`. Schema `0.2.0` persists
the active guided layout ID/version and canonical omitted slot IDs through
`src/project/projectGuidedWorkflow.ts`; suggestions, focus, menu state, and the
generic resolved preset definition remain transient. Pure typed Disc role-focus
requests, runtime validation, and reducer state are implemented in
`src/editor/editorRoleFocus.ts`. Focus-target IDs are semantic navigation
identifiers, not DOM IDs or smoke-test IDs, and navigation state is not
serialized.

Pure guided-layout compatibility identity and placeholder projection remain in
`src/guidedPresets/discGuidedLayouts.ts`, but Classic geometry now derives from
the generic serializable definition in
`src/presets/builtins/classicTopTitleDiscPreset.ts`. The existing
`classic-top-title` role-preset ID and
`disc:guided-layout:classic-top-title` guided ID resolve through centralized
compatibility aliases to `builtin:disc-preset:classic-top-title`. The canonical
definition's ordered slots define
Game Title, Background Image, Rating Badge, Media Format Mark, Operating System
Marks, Developer Logo, Publisher Logo, and Copyright / Legal Text. Sidebar
roles remain organizational groupings and are not guided slots. Every slot
supplies normalized content and action geometry plus a
background/foreground layer, semantic setup kind, and safe population
capability. The pure projector returns `unfilled` and `suggested` slots and
suppresses `filled` and `omitted` slots independently. Layout presets continue
to place real feature-owner state; guided definitions contain no content, DOM,
renderer, export, persistence, or role-focus request data.

The generic definition also carries allowlisted serializable placement intent.
Issue #293 now provides pure nominal-to-resolved template contracts, structured
resolution/application warnings, a trusted semantic adapter registry, and an
immutable application-plan builder. Concrete planning adapters now cover title
artwork/text, Background, Rating, Media Format Mark, primary Developer and
Publisher Logos, Operating System Marks, and copyright text. Every Classic
placement target therefore has a concrete generic adapter. They consume focused
owner-layout slices, emit placement-only updates, and can seed dormant disabled
fixed owners without enabling or populating them. The OS adapter consumes the
resolved region and reuses `placeGroupedPlatformMarks` for canonical ordering,
implicit built-in materialization, safe centered grouping, and preferred-scale
reduction. It preserves mark selection, enablement, source, theme, custom
assets, and inference metadata.

Classic production application now routes through
`appRegisteredDiscPresetApplication.ts`. The legacy menu ID resolves to the
canonical built-in definition, template resolution and the complete production
adapter registry build one immutable typed update plan, and the existing owner
application boundary dispatches each touched family once. Classic coordinates
no longer live in `discRolePresets.ts`; the other two built-in presets retain
their legacy plans.

Guidance geometry and real Classic owner placement therefore derive from the
same canonical definition. Disabled fixed owners receive dormant layout without
being enabled, and the Classic path applies adapter-safe resolved placement
directly instead of broadly reclamping unrelated text, technical marks, or
repeated logos. Copyright uses injected measurement plus canonical straight-text
render geometry to fit the resolved region without truncation. Normal blank,
disabled, short, and realistic Legal cases are fully applied; only a genuinely
impossible fit remains partial and marks that slot unsupported. The OS adapter
positions only marks already selected, enabled, and renderable. After
application, one transient canonical preset ID/revision and latest resolved
definition remain shared by guidance and targeted placement. OS eligibility
changes re-resolve only the OS target. Legal enablement, canonical content, and
measurement-relevant style changes re-resolve only the Legal target. The two
slot refinements coexist, and no other slot is reapplied.

Guidance projects the active resolved definition rather than independently
looking up nominal geometry. Unfilled or suggested slots use its final resolved
content/action regions in runtime slot order; unsupported slots are hidden.
Consequently the Legal placeholder center matches the fitted owner center,
filled Legal suppresses guidance, and clearing valid Legal content restores the
placeholder at the active resolved region. Missing active resolved geometry
fails closed instead of inventing a fallback. Lifecycle-reachable native routes
have passed the current #289 checkpoint; registered targets hidden behind
filled-slot lifecycle states remain covered by mounted controller tests.
Guided omission state remains project-specific and must never be copied into a
reusable preset definition. No custom preset library, Save as Preset workflow,
or custom preset UI exists yet.

A successful `classic-top-title` layout preset application activates the
persisted guided workflow and a separate transient active resolved definition.
The Disc editor now renders all eight
projected slots with the existing blue dashed pulse/glow language. Background
guidance uses a dedicated z-index `0` annulus-masked layer, while the seven
exact foreground slots use a z-index `6` masked layer.
The foreground layer remains below real Disc text at z-index `7`; the broad
Background Image visual remains below foreground owners and uses its smaller
action geometry only to position the label. Reduced-motion mode keeps static
blue guidance while disabling the shared pulse animation.

The masked SVG guidance remains visual-only and pointer-inert. A separate
z-index `9` HTML action layer now renders one native button from each visible
slot's action geometry. Game Title is the only Image/Text chooser. Background,
Rating, Developer Logo, Publisher Logo, and Copyright / Legal Text route to
their existing exact controls. Media Format Mark now requests its exact format
selector target, and Operating System Marks requests its grouped feature-enable
target. Neither uses a broad role summary target. Both also declare a distinct
typed nested-section alignment target registered from the owning Game Info
panel. Choice popovers render at z-index `30`,
support Escape dismissal with focus return, and close when their slot leaves
the projected list. Buttons rely on native Enter and Space activation and do
not drag, resize, select preview content, or activate the text ribbon.

Every setup action sends a typed #287 `focus` request. Five actions use
`role-start`; Media Format Mark, Operating System Marks, Developer Logo, and
Publisher Logo use `section-start`. For those nested routes, navigation opens
the role and required section,
start-aligns the separately registered section ref, focuses the resolved exact
control or fallback with native scrolling prevented, and reasserts section
alignment after focus. Mere nearest-edge visibility is insufficient for a
section-start route: the nested section remains at the top while keyboard focus
remains on its actionable control. It never enables a feature, mutates owner
content, accepts a suggestion, reruns import, or stores completion state.
Suggested placeholders retain the same setup route and an explicit suggested
description.

Guided-action reachability and semantic focus-target registration are separate
contracts. A guided action is dispatchable only while its unfilled or suggested
placeholder is projected. A semantic target may remain registered after owner
state fills the slot and removes that placeholder, so another workflow or a
direct controller request can still focus the normal sidebar control. The
presence of that registration does not make the now-unmounted guide a native
route. Lifecycle-reachable native navigation has been validated. Persistent
completion is not implemented and is tracked by #295; aspect-preserving
contain-fit is not implemented and is tracked by #296. Reconstructing the
transient canonical preset reference and resolved definition after loading
persisted guided workflow metadata is also deferred to #295. Issue #289 remains
open.

Implemented role-focus infrastructure includes:

- optional controlled open state plus direct details and summary refs on
  `EditorPanel`, while callers outside the controlled Disc role shell remain
  backward-compatible;
- a transient controller/provider with monotonic request generation, explicit
  ancestor callbacks, direct target registration, semantic fallback chains,
  and one-time request consumption;
- provider-controlled top-level Disc semantic role panels with independent
  manual multi-panel expansion and role-summary fallback; and
- Game Title registration for artwork enable, artwork upload, and title-text
  fallback. The upload target falls back to artwork enable only while its real
  upload control is unmounted; and
- Background Image registration for the always-mounted enable checkbox and
  Local file upload input. Upload focus explicitly opens the nested Local file
  panel and remains available while Background Image is disabled. It does not
  enable the feature or fall back to the enable checkbox; and
- Legal Info and Additional Text registration for the copyright and custom-note
  row enable checkboxes. These fixed-row targets do not select preview text or
  activate the contextual ribbon; and
- Rating registration for the enable, system, current value, and source-mode
  controls. System, value, and source use an explicit enable-control fallback
  while Rating is disabled. Navigation opens the nested Rating panel but never
  enables or mutates Rating; and
- Company Logos registration for distinct primary developer and publisher
  enable checkboxes and enabled-only upload inputs. Both paths open the shared
  controlled Developer / publisher logos panel and register distinct Developer
  and Publisher card refs. Developer upload falls back only to developer
  enable, and publisher upload falls back only to publisher enable. Both direct
  and fallback controls retain their matching section identity. Navigation
  never enables, imports, or mutates either logo asset.
- Additional Artwork semantic vocabulary for global enable, Add Artwork,
  per-item enable, and per-item upload. Item destinations require the stable
  persisted `elementId`; and
- composite controller registration and fallback identity keyed by semantic
  target plus exact element ID. Repeated items coexist without overwriting one
  another, fallback chains are cycle-safe, and fixed targets retain their
  existing behavior; and
- Additional Artwork global-enable and Add Artwork registration. Add Artwork is
  a stable collection-level button outside every repeatable item card and falls
  back to global enable while the feature body is unmounted. Navigation focuses
  these controls without toggling the feature or creating an item; and
- Additional Artwork per-item enable and Local file upload registration keyed
  by each element's exact persisted `elementId`. Multiple items register
  independently. Upload follows only the exact-item chain `upload(item) ->
  item-enable(item) -> add -> global enable`, and navigation opens the exact
  item card and, for an available upload, its Local file panel without mutating
  project state.

All 19 declared #287 Disc role-focus targets have production registration. The
Disc guided-preview action layer dispatches the exact setup requests used by
Classic Top Title, while mounted integration coverage validates every current
route and disabled-owner fallback. Auto-fill and native Tauri acceptance remain
future #281 work. Navigation and open-menu state are transient and
non-persistent; Case Front, Case Back, and Spine remain outside the Disc-only
provider.

## 1. Purpose And Scope

Guided slots describe content that a guided preset expects at a particular
place in a layout. The Classic Top Title contract asks for Game Title,
Background Image, Rating Badge, Media Format Mark, Operating System Marks,
Developer Logo, Publisher Logo, and Legal Text without becoming a second copy
of that content. Additional Artwork and Additional Text remain defined for
future guided layouts.

A slot definition is domain guidance, not rendered project content. Existing
feature owners remain the source of truth for images, text, marks, enablement,
layout, editing, save/load, preview, and export. An unfilled slot does not create
or enable a feature object merely because the slot exists.

This contract is Disc Label only. It defines identity, vocabulary, accepted
content, binding and validity rules, lifecycle derivation, and architecture
boundaries for #281. Pure definitions, lifecycle resolution, versioned
workflow persistence, passive placeholders, exact setup menus, omission,
restoration, and typed role-focus dispatch are implemented. Auto-fill remains
deferred. Case Front, Case Back, and Spine guided presets remain
deferred until the Disc contract is proven.

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
- `disc:guided:rating-badge:primary`
- `disc:guided:media-format-mark:primary`
- `disc:guided:operating-system-marks:group`
- `disc:guided:developer-logo:primary`
- `disc:guided:publisher-logo:primary`
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
  | 'omitted'

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
- optional and omittable status;
- auto-fill eligibility policy;
- explicit placeholder geometry; and
- a typed role-focus destination.

A conceptual slot resolution contains:

- the derived lifecycle;
- the concrete feature-owner target when filled;
- a transient suggestion when one is available; and
- explicit omission intent when that intent is supported.

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
| Optional/omittable | Expected and omittable |
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
| Optional/omittable | Expected and omittable |
| Safe suggestion | None by default |
| Safe auto-fill | None by default |
| Sidebar role | Background Image |
| Export | Existing enabled effective-background export path after binding |
| Movement | Existing background drag and scale behavior after binding only |

The background owner must be enabled and expose a real effective image. An
enabled owner with no effective image remains unfilled. Default or invented
artwork must not count as filled.

### Rating Badge

| Property | Contract |
| --- | --- |
| Slot ID | `disc:guided:rating-badge:primary` |
| Semantic role | `game-info-logos` |
| Accepted kinds | `domain-mark`, `image` |
| Preferred kind | `domain-mark` |
| Candidate binding | Primary rating badge |
| Optional/omittable | Optional and omittable |
| Safe suggestion | Accepted rating metadata or an already configured supported badge source |
| Safe auto-fill | Existing accepted rating metadata under the current import policy |
| Sidebar role | Game Info Logos |
| Export | Existing rating-badge export predicate after binding |
| Movement | Existing rating-badge drag/layout behavior after binding only |

Validity uses the existing `shouldRenderRatingBadge` domain rule.
Metadata-backed generated badges can be valid without a custom image.
`ratingSystem: none` is not filled, and guided resolution must not invent
missing rating content.

### Media Format Mark

| Property | Contract |
| --- | --- |
| Slot ID | `disc:guided:media-format-mark:primary` |
| Semantic role | `game-info-logos` |
| Accepted kinds | `domain-mark`, `image` |
| Preferred kind | `domain-mark` |
| Candidate binding | Media format mark owner |
| Optional/omittable | Optional and omittable |
| Sidebar role | Game Info Logos |
| Export | Existing media-mark export predicate after binding |
| Movement | Existing media-mark drag/layout behavior after binding only |

### Operating System Marks

| Property | Contract |
| --- | --- |
| Slot ID | `disc:guided:operating-system-marks:group` |
| Semantic role | `game-info-logos` |
| Accepted kinds | `domain-mark`, `image` |
| Preferred kind | `domain-mark` |
| Candidate binding | Enabled platform-mark owner values as one grouped slot |
| Optional/omittable | Optional and omittable |
| Sidebar role | Game Info Logos |
| Export | Existing per-mark export predicates after binding |
| Movement | Existing grouped platform-mark layout behavior after binding only |

### Developer And Publisher Logos

When the first eligible mark is selected after preset application,
authoritative owner state becomes filled, targeted placement puts the real
group in the resolved preset region, and guidance disappears through normal
lifecycle derivation. Removing or disabling all eligible marks returns the
slot to unfilled guidance. Omission remains independent: an omitted OS slot
stays omitted while owner state changes, and omission never suppresses owner
rendering. Changing group membership may replace manual OS positions;
unrelated owner edits never do.

### Developer Logo

| Property | Contract |
| --- | --- |
| Slot ID | `disc:guided:developer-logo:primary` |
| Semantic role | `company-logos` |
| Accepted/preferred kind | `image` |
| Candidate binding | Primary developer logo only |
| Optional/omittable | Optional and omittable |
| Sidebar role | Company Logos |

Publisher state never fills Developer Logo.
Enabling the primary Developer Logo feature claims this slot immediately,
including while its feature-owned empty/default placement placeholder is shown
before an image is uploaded. Guided guidance must not overlap that owner visual.
Clearing an uploaded image while the feature remains enabled keeps the slot
claimed; disabling the feature restores guidance unless omission suppresses it.

### Publisher Logo

| Property | Contract |
| --- | --- |
| Slot ID | `disc:guided:publisher-logo:primary` |
| Semantic role | `company-logos` |
| Accepted/preferred kind | `image` |
| Candidate binding | Primary publisher logo only |
| Optional/omittable | Optional and omittable |
| Sidebar role | Company Logos |

Developer state never fills Publisher Logo.
Enabling the primary Publisher Logo feature claims this slot immediately,
including while its feature-owned empty/default placement placeholder is shown
before an image is uploaded. Guided guidance must not overlap that owner visual.
Clearing an uploaded image while the feature remains enabled keeps the slot
claimed; disabling the feature restores guidance unless omission suppresses it.

### Legal Text

| Property | Contract |
| --- | --- |
| Slot ID | `disc:guided:legal-text:copyright` |
| Semantic role | `legal-info` |
| Accepted kinds | `text` |
| Preferred kind | `text` |
| Candidate binding | Disc copyright text row |
| Optional/omittable | Optional and omittable |
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
| Optional/omittable | Optional and omittable |
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
| Optional/omittable | Optional and omittable |
| Safe suggestion | None by default |
| Safe auto-fill | None by default |
| Sidebar role | Additional Text |
| Export | Existing Disc custom-note export predicate after binding |
| Movement | Existing Disc text behavior after binding only |

The fixed `customNote` row must be enabled and its resolved content must be
nonblank. This first contract uses an existing fixed row; it does not introduce
an arbitrary repeatable text-layer model.

### Classic Top Title Layout

Classic Top Title requires eight exact expected-content slots. Their slot
order, labels, normalized content/action regions, layers, setup kinds, and
population capabilities are owned only by
`src/presets/builtins/classicTopTitleDiscPreset.ts`. The guided compatibility
registry projects that canonical definition and does not duplicate Classic
coordinates. This includes the corrected canonical Legal region and its
slot-local fitted resolution. Game Info Logos and Company Logos remain sidebar
role groupings only.

Applying the Classic layout no longer auto-enables Media Format Mark. Rating,
Media, OS marks, Developer Logo, Publisher Logo, and Copyright remain disabled
when disabled. Existing enabled/renderable owners are repositioned without
changing content, source, theme, selected values, custom assets, or inference.
Operating-system marks use deterministic grouped placement inside their exact
region and receive only returned `x`, `y`, and `scale` updates.
Copyright uses measured straight-text fitting inside its exact region and
receives only placement-owned layout fields. Guidance consumes the fitted
slot-local region/status from the active resolved definition.

## 5. Lifecycle Derivation And Precedence

Resolution uses this precedence:

1. Explicit omission intent, when supported, resolves to `omitted`.
2. Valid bound feature state resolves to `filled`.
3. A valid available suggestion resolves to `suggested`.
4. Otherwise the slot resolves to `unfilled`.

Disabled is not automatically omitted. Existing feature owners deliberately
preserve disabled payload, so a feature can contain saved data while its guided
slot remains unfilled because the feature is disabled or cannot render.

Clearing or disabling content can move a previously filled slot back to
unfilled or suggested. Omission intent suppresses guidance without deleting the
feature payload. Re-enabling a feature or accepting a suggestion must continue
through the existing owner instead of mutating duplicated slot content.

## 6. Lifecycle Transition Table

| State | Allowed next states | Edit-mode behavior | Drag/resize | Export | Owner behavior |
| --- | --- | --- | --- | --- | --- |
| `unfilled` | suggested, filled, omitted | Placeholder visible | No | No | Definition names candidates; no owner object is created by the placeholder. |
| `suggested` | unfilled, filled, omitted | Suggestion affordance visible | No | No | Candidate is transient and is not authoritative feature state. |
| `filled` | unfilled, suggested, omitted | Real feature suppresses the placeholder | Existing owner capabilities | Existing owner predicate | Manual edits remain normal project state. |
| `omitted` | unfilled, suggested, filled | Guidance is suppressed | No | No output merely from omission state | Existing feature payload is preserved and continues through normal rendering/export rules. |

Placeholder visibility in this table is implemented for Classic Top Title.

## 7. Derived, Transient, And Persisted State

### Static Definitions

Preset/domain data contains slot ID, role, accepted and preferred kinds,
candidate bindings, default geometry, and omittable status.

Serializable Disc layout presets remain nominal definitions. The pure
template-resolution stage produces a transient resolved preset with both
nominal and resolved content/action regions. Concrete owner adapters consume
resolved content regions during pure application planning and may refine only
their own slot. The active transient preset owner retains the latest resolved
definition after explicit or targeted application. Guided projection consumes
that definition directly and never infers runtime geometry from owner
coordinates.

### Derived State

Filled or unfilled status, valid-content availability, and a concrete owner
binding should normally be derived from existing feature-owner state. Derived
state should not be serialized merely for convenience.

### Transient State

The current suggestion, selected placeholder, open setup menu,
role-focus request, and hover/focus animation state can remain editor-session
state.

### Persisted Workflow State

Schema `0.2.0` persists active guided layout ID/version and explicit omission
intent as canonical stable slot IDs. The project adapter does not persist
derived lifecycle, owner content, labels, geometry, indexes, or UI state.

Repeatable-slot binding identity that cannot be re-derived safely and future
slot-specific overrides remain separate schema decisions.

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

The current visual layers use the registry's normalized `0..100` Disc
coordinates, are pointer-inert, and share an outer-Disc/canonical-center-hole
annulus mask. They mount only through the Disc editor's explicit
`editorAffordances` input. Foreground guidance renders behind real owner
content: untouched default title copy may remain semantically incomplete while
still rendering through the real Disc text owner, and the translucent blue
guidance cannot paint opaquely over it. Pure placeholder view models record
this as `guidance-behind-real-content`. Filled and omitted slots suppress only
their own projected placeholder, while suggested slots stay visible with an
explicit secondary label. Active layout identity/version and omission intent
enter save/load only through schema `0.2.0` workflow metadata; visual/action
state and the active resolved definition remain transient and never enter
render or export paths.

The HTML interaction layer uses each slot's normalized action geometry and is
separate from both visual SVGs and preview-editable registration. Native
buttons preserve model order for tab navigation. Game Title alone uses the
focused Image/Text setup popover. Background, Rating, Developer, Publisher,
and Copyright dispatch exact typed destinations directly. Media and OS now
dispatch their exact typed destinations and never route to a broad role
summary. Production registration stays with the existing feature-owner
adapters. Popover state is transient, closes after selection or Escape, and
becomes
inactive immediately if its projected slot disappears. Setup navigation does
not accept suggested content automatically; it routes the user to the existing
owner control.

- Every visible unfilled or suggested placeholder is one native button. Pointer,
  Enter, and Space open its setup menu without immediately navigating or
  accepting a suggestion.
- Only one setup menu is open. Escape closes it and returns focus to its
  placeholder when available.
- Setup actions close the menu and dispatch one typed role-focus request. Five
  reachable actions use `role-start`; Media, OS, Developer, and Publisher use
  their typed `section-start` routes.
- `Remove from layout` calls the pure omission transition with that exact slot
  ID. It changes only persisted workflow metadata; the reusable preset
  definition and feature owner remain unchanged.
- After omission, focus moves to the next visible slot in canonical order, then
  the previous visible slot, then the stable preview fallback. This uses
  registered refs and ordered view models rather than DOM queries.
- Menu state closes on setup, omission, Escape, placeholder disappearance,
  workflow revision, surface transition, load, clear, or unmount.

The current preview overlay geometry helpers can inform a later implementation,
but empty-slot geometry cannot depend on finding a real feature element in the
DOM. Source guards should keep the future guided overlay outside every export
layer and export-input path.

## 11. Role-Focus Navigation Contract

Typed role-focus requests, runtime validation, reducer state, and the transient
controller/provider are implemented. The controller generates the monotonic
request ID; callers provide the surface, behavior, semantic destination, and
optional owner target:

```ts
type EditorRoleFocusRequest = CommonRequest & (
  | {
      behavior: 'reveal' | 'focus'
      destination: DiscControlFocusDestination
      scrollAlignment?: 'nearest' | 'role-start'
    }
  | {
      behavior: 'focus'
      destination: DiscSectionStartRoleFocusDestination
      scrollAlignment: 'section-start'
    }
)

type CommonRequest = {
  requestId: number
  surfaceId: 'disc-label'
  ownerTarget?: EditorRoleFocusOwnerTarget
}
```

The Disc provider controls the seven top-level semantic role panels. Manual
opening and closing remains independent per panel; navigation does not impose
accordion behavior or close unrelated roles. Registered elements are reached
through direct refs or stable getters. Ancestors are opened only through
explicit callbacks, never DOM queries, synthetic clicks, timers, or retries.

Controller registration uses typed semantic identity rather than DOM identity:

```ts
type EditorRoleFocusTargetIdentity =
  | { focusTarget: DiscFixedRoleFocusTargetId }
  | {
      focusTarget:
        | 'disc:additional-artwork:item-enable'
        | 'disc:additional-artwork:upload'
      elementId: string
    }
```

Fixed callers may continue using their fixed semantic target string as a narrow
compatibility input. Repeatable targets cannot use a target string alone: they
must supply the composite identity. Internally, nested maps separate semantic
target and element ID, so punctuation in persisted IDs cannot collide and no
caller handles an encoded raw key.

### Behavior Semantics

| Behavior | Contract |
| --- | --- |
| `reveal` | Opens the requested top-level role and reveals its registered summary or panel. It does not resolve a nested target, invoke nested ancestor callbacks, or focus a nested element. Omitted/`nearest` keeps nearest/automatic reveal; `role-start` uses start/automatic role alignment. |
| `focus` | Opens the requested top-level role, resolves the registered semantic target, and invokes explicit ancestor callbacks in registration order. Omitted/`nearest` focuses the target with scroll prevention and uses nearest/automatic target scrolling. `role-start` focuses the exact target and then start-aligns the original owning role summary, or its registered details fallback. `section-start` is a separate discriminated request variant: it requires a compatible typed section target and exact control target, start-aligns the separately registered section, focuses the direct or semantic-fallback control with scroll prevention, and reasserts section start so focus-induced scrolling cannot leave the card at the viewport bottom. A missing section registration, missing direct/fallback control, or identical section/control element returns a structured processing outcome rather than silently degrading to role alignment. The request is consumed once regardless of outcome and is never retried when controls later mount. |

All role-focus state is editor-session-only. It does not dirty the project,
create an undo entry, trigger autosave, or enter the saved-project schema.
Scroll alignment is part of the same transient request and is never serialized.
Role summaries and nested sections use distinct named CSS
`scroll-margin-block-start` tokens backed by the shared 24px sidebar
content-inset. Duplicate semantic section registrations are rejected. A
section registration can be replaced only after its matching cleanup has run.
`scrollIntoView({ block: 'start' })` therefore works with the
desktop sidebar scroll owner and narrow document scrolling without runtime
pixel arithmetic or target-specific offsets.

### Existing Target Semantics

| Target ID | Meaning and current contract |
| --- | --- |
| `disc:background-image:enable` | The always-mounted Background Image feature enable checkbox. Implemented through a direct ref. Focusing it does not change feature state. |
| `disc:background-image:local-upload` | The real Local file input. Implemented through a direct ref with an explicit ancestor callback that opens the controlled Local file panel. It remains registered while Background Image is disabled, does not enable or otherwise mutate the feature, and has no enable-control fallback. |
| `disc:game-title:artwork-enable` | The always-mounted title-artwork enable checkbox. Implemented through a direct ref. |
| `disc:game-title:artwork-upload` | The real title-artwork file input. It is registered only while the optional artwork body is mounted and explicitly falls back to `disc:game-title:artwork-enable` while unavailable. Navigation does not enable title artwork. |
| `disc:game-title:text-fallback` | The always-mounted Disc title-text row enable checkbox. It does not select preview text or activate the contextual ribbon. Implemented through a direct ref. |
| `disc:rating:enable` | The always-mounted primary rating-badge enable checkbox inside the controlled Rating badge panel. Implemented through a direct ref with an explicit Rating-panel ancestor callback. Focusing it does not toggle Rating. |
| `disc:rating:system` | The enabled-only rating-system selector. Implemented through a direct ref and persistent semantic fallback to `disc:rating:enable` while disabled or unexpectedly unavailable. Navigation does not change the system. |
| `disc:rating:value` | The enabled-only current rating-value control. The semantic registration tracks the rendered select or custom-rating text input and refreshes safely when the concrete kind changes. It falls back to `disc:rating:enable` while unavailable and does not change the value. |
| `disc:rating:source` | The enabled-only rating source-mode selector, not the conditional custom-image upload input. Implemented through a direct ref with persistent fallback to `disc:rating:enable`; navigation does not change source or import an image. |
| `disc:media-format-mark:enable` | The always-mounted Media Format Mark enable checkbox inside the controlled Media format mark panel. Implemented through a direct ref with an explicit Media-panel ancestor callback. It does not choose a format or enable the owner. |
| `disc:media-format-mark:format` | The enabled-only actual media-format selector, not the source or upload controls. Implemented through a direct ref and persistent semantic fallback to `disc:media-format-mark:enable` while the feature body is unavailable. Navigation never changes the selected format. |
| `disc:operating-system-marks:enable` | The always-mounted grouped Show operating system marks checkbox inside the controlled Operating system marks panel. Implemented through a direct ref with an explicit panel ancestor callback. It does not select, enable, import, or identify any individual platform mark and does not invoke grouped placement. |
| `disc:company-logo:developer-enable` | The primary developer-logo enable checkbox. It remains registered while Company Logos is mounted, opens the shared Developer / publisher logos panel, and does not toggle or mutate the logo. Guided Developer routes separately align `disc:company-logo:developer-section`. |
| `disc:company-logo:developer-upload` | The enabled-only primary developer-logo file input. It is registered only while the developer body is mounted and explicitly falls back only to `disc:company-logo:developer-enable` when unavailable. Direct and fallback routes use the same Developer section target. |
| `disc:company-logo:publisher-enable` | The primary publisher-logo enable checkbox. It remains registered while Company Logos is mounted, opens the shared Developer / publisher logos panel, and does not toggle or mutate the logo. Guided Publisher routes separately align `disc:company-logo:publisher-section`. |
| `disc:company-logo:publisher-upload` | The enabled-only primary publisher-logo file input. It is registered only while the publisher body is mounted and explicitly falls back only to `disc:company-logo:publisher-enable` when unavailable. Direct and fallback routes use the same Publisher section target. |
| `disc:legal-text:copyright` | The copyright row's always-mounted enable checkbox. Implemented through a direct ref with no nested ancestor or semantic fallback. It does not select copyright text in the preview, activate the contextual ribbon, or focus a nonexistent sidebar text editor. |
| `disc:additional-artwork:enable` | The always-mounted global Additional Artwork feature-enable checkbox. It has no item identity and is registered through a direct ref. Focusing it does not toggle the feature. |
| `disc:additional-artwork:add` | The enabled-only global Add Artwork button. It is a collection-level action rendered before and outside every repeatable item card, has no `elementId`, and falls back to `disc:additional-artwork:enable` while unavailable. Navigation focuses it without activating it or creating an item. |
| `disc:additional-artwork:item-enable` | One existing element's enable checkbox. Its destination and registration identity require the same stable persisted `elementId`. Focusing it opens only that item's controlled card and does not toggle the item. When item controls are hidden globally, its exact-item fallback continues to Add Artwork and then global enable. |
| `disc:additional-artwork:upload` | One existing element's Local file input. Its destination and registration identity require the same stable persisted `elementId`. While the item is enabled, focusing it opens only that item's card and Local file panel. While the item is disabled, it falls back once to that same item's enable checkbox and is not replayed after enablement. |
| `disc:additional-text:custom-note` | The custom-note row's always-mounted enable checkbox. Implemented through a direct ref with no nested ancestor or semantic fallback. It does not select custom-note text in the preview, activate the contextual ribbon, or focus a nonexistent sidebar text field. |

Company Logos developer and publisher identities remain distinct. Developer
upload resolves only to developer enable, and publisher upload resolves only to
publisher enable; neither path may cross-fallback. These registrations cover
only the fixed primary controls. They do not target repeatable additional logos,
discover candidates, import assets, or mutate logo state. Repeatable additional
logos remain outside this target vocabulary.

Additional Artwork implements the exact fallback chain `upload(item) ->
item-enable(item) -> add -> global enable`. Each item hop retains the same
persisted `elementId`; cross-item fallback is rejected. Direct registration at
any step wins, traversal detects cycles, and unresolved focus uses the role
summary fallback. Reordering items does not alter identity or routing. Deleting
an item removes only that item's registrations and never substitutes another
item. Array indexes, first-item selection, candidate bindings such as
`first-renderable-existing`, DOM IDs, and encoded string keys are not valid
navigation identity.

The lifecycle-to-route inventory is exhaustive. Game Title contributes two
setup actions from one visible slot, so the eight slots expose nine reachable
actions.

| Slot/action | Owner condition for guide visibility | Reachable guided state | Guided action route | Registered fallback | Registered direct target | Native dispatch | Mounted/controller coverage |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Game Title / Image | Neither title artwork nor title text has valid bound content. Enabled artwork without an image remains unfilled. | Unfilled or suggested title slot | `game-title-image`; `role-start` | artwork enable | artwork upload | Required while chooser is visible | Direct upload and fallback |
| Game Title / Text | Same shared title condition. | Unfilled or suggested title slot | `game-title-text`; `role-start` | none | title-text fallback row | Required while chooser is visible | Fixed row |
| Background | No enabled renderable background image. | Unfilled or suggested background slot | `background-local-upload`; `role-start` | none | local upload | Required | Always-mounted upload |
| Rating | Badge is disabled or otherwise does not render. Normal UI enablement selects a valid system and claims the slot. | Disabled/unclaimed Rating guidance; an enabled `none` edge state can remain unclaimed | `rating-system`; `role-start` | Rating enable | Rating system | Required for the disabled fallback | Enabled system through typed controller request |
| Media Format | Media is disabled or has no renderable selected source. Normal built-in enablement claims the slot. | Disabled/unclaimed Media guidance | `media-format`; `section-start` | Media enable | format selector | Required for the disabled fallback | Enabled format through typed controller request |
| Operating System Marks | No selected enabled renderable operating-system mark exists. | Guidance remains reachable until one eligible mark claims the slot | `operating-system-marks-enable`; `section-start` | none | grouped enable | Required while unclaimed | Grouped enable and section alignment |
| Developer Logo | Primary Developer feature is disabled; enabled/no-image and enabled/image states both claim the slot. | Disabled primary Developer guidance | `developer-logo-upload`; `section-start` | Developer enable | Developer upload | Required for the disabled fallback | Enabled upload through typed controller request |
| Publisher Logo | Primary Publisher feature is disabled; enabled/no-image and enabled/image states both claim the slot. | Disabled primary Publisher guidance | `publisher-logo-upload`; `section-start` | Publisher enable | Publisher upload | Required for the disabled fallback | Enabled upload through typed controller request |
| Copyright / Legal Text | Copyright row is disabled or its resolved content is blank. | Unfilled or suggested Legal guidance | `legal-copyright`; `role-start` | none | copyright row | Required | Fixed row |

A focus target may remain registered even when no currently visible guided
element can dispatch to it. Native guided-action acceptance covers only
lifecycle-reachable routes; mounted controller tests cover registered targets
that are unreachable through current guidance. Filled or omitted lifecycle
states are intentionally unreachable from the guide because the guide is not
projected. Runtime UI code must not duplicate these lifecycle predicates or use
DOM presence checks to manufacture route reachability.

No guided action uses `control-visible`; visibility alone is not an accepted
substitute for either declared top alignment. Nearest remains the
backward-compatible default for omitted alignment and existing non-guided
navigation. Role-start always uses the original destination role even when an
upload target falls back to its matching enable control. Section-start instead
uses its required nested-section target while the direct or fallback control
remains the keyboard-focus target. The discriminated request type prevents a
future section-start route from omitting its section identity, and the strict
runtime parser rejects malformed or cross-wired section/control pairs.

Existing target fallbacks remain authoritative. The caller does not query the
DOM, duplicate role-panel state, enable features, or invoke controls. Mounted
integration coverage now validates the production provider, controlled panels,
real refs, exact focus targets and fallbacks, role-start alignment, and final
Media/OS/Developer/Publisher section-start alignment. A table-driven registry
test keeps the nine reachable actions separate from the broader registered
target inventory, requires every semantic focus and section ID to exist in the
typed vocabulary, and verifies that each fallback keeps its matching section
identity. Mounted tests issue direct typed controller requests for enabled
Rating, Media, Developer, and Publisher targets; they do not mount or dispatch
an impossible guide. Case Front, Case Back, and Spine remain outside this
Disc-only provider.

Guided placeholders route to the most specific normal setup control. An enable
control is a fallback for a specific control hidden by a disabled optional
feature; it is not the direct route when that specific control is available.
For Rating Badge, guidance therefore requests `disc:rating:system`. Enabled
Rating claims the slot during the normal UI transition and removes its guide;
a separate direct typed controller request still focuses the registered system
selector without changing system or value. Disabled Rating guidance follows
the existing one-shot `system -> enable` fallback without enabling the badge or
replaying after later enablement.

Media format's registered fallback contract is `format -> enable`. The direct
format registration exists only while the selector is mounted; its persistent
fallback remains independent, consumes once while disabled, and does not replay
after enablement. Normal Media enablement claims the slot and removes the guide,
while the enabled format target remains available to direct controller
requests. Media enable and OS enable need no semantic fallback. Rating, Media,
OS, Developer, and Publisher registrations are independent and clean up without
removing one another. Focus requests open only the required controlled nested
panel, retain the exact control's focus, and top-align the declared Media, OS,
Developer, or Publisher nested section through `section-start`.
They never enable Media, select a format, enable or select an operating system,
or mutate project and selection state. Owner identity is optional. When
supplied, both Media targets accept only `{ owner: 'mediaMark' }`, while OS
enable accepts only `{ owner: 'platformMarks', selection: 'enabled-values' }`.
Payload-bearing or cross-owner identities are rejected by the strict runtime
parser. All eight Classic Top Title slots now have exact production setup
routes. Their lifecycle-reachable native navigation paths have been validated;
registered targets hidden behind filled-slot lifecycle states are covered by
mounted controller tests instead of impossible native guide dispatches.

## 12. Versioned Workflow Contract

A guided workflow is identified by layout ID plus a positive safe-integer
version. Classic Top Title starts at version `1`; version is explicit and is
never inferred from coordinates, geometry, or slot count. Its exact ordered
catalog contains the first eight IDs above. All eight are omittable.

The pure domain state is:

```ts
{
  activeLayout: { id, version } | null,
  omittedSlotIds: readonly DiscGuidedSlotId[]
}
```

Omitted IDs are deduplicated, restricted to the active version's slot catalog,
filtered by `omittable`, and stored in canonical layout order. Applying a
layout for the first time starts with no omissions. Reapplying the same ID and
version preserves valid omissions. Changing layout ID clears omissions. Moving
between supported versions of the same ID preserves IDs that still exist,
discards removed IDs, and leaves newly added slots visible.

Omit, restore one, restore all, and clear are pure transitions. Restore one and
restore all do not enable owners, populate content, or reapply geometry.
Unsupported layout IDs or versions are rejected during application and
normalize to inactive guidance when reading unknown workflow-shaped data.
Malformed and unknown fields never block restoration.

### Native Navigation Acceptance

1. Game Title opens its Image/Text chooser and routes each visible choice
   exactly, including direct artwork upload while artwork is enabled but still
   unfilled.
2. Background Image focuses its Local file control.
3. Disabled Rating Badge guidance focuses Rating enable through fallback,
   leaves Rating disabled, and does not replay.
4. Disabled Media Format Mark guidance focuses Media enable through fallback
   without changing the format.
5. Operating System Marks focuses the grouped enable checkbox without enabling
   or selecting a platform.
6. Disabled Developer Logo guidance focuses its matching enable fallback.
7. Disabled Publisher Logo guidance focuses its matching enable fallback.
8. Copyright / Legal Text focuses its exact fixed-row control.

For every visible item, verify click and representative native Enter/Space
activation, owning-role or declared nested-section alignment, one-shot
consumption, preserved unrelated panel state, and no preview-selection or
contextual-ribbon side effect. Enabled Rating system, Media format, Developer
upload, and Publisher upload are registered but guided-unreachable after their
normal owner transitions; native UI confirms those controls exist and remain
usable, while mounted controller tests own their routing acceptance.

The nine reachable actions now have mounted integration coverage through a focused
React composition of the production role-focus provider, controlled top-level and
nested panels, registration helpers, real focusable controls, and guided action
component. The suite covers visible-guide pointer/Enter/Space dispatch,
disabled fallbacks, direct typed requests to enabled semantic targets,
`document.activeElement`, published role-start ordering,
Media/OS/Developer/Publisher section-start geometry, focus-scroll correction,
repeated requests, non-accordion panel state, and feature-state isolation. The
four production section routes declare compatible typed section targets.
Automated source coverage also verifies resolved
Legal placeholder/owner parity, filled and cleared visibility, claimed
Rating/Media/Developer/Publisher suppression, unsupported-slot suppression,
and coexistence with targeted OS resolution. Persistent completion remains
unimplemented under #295, and aspect-preserving contain-fit remains
unimplemented under #296.

### Removed Layout Items UI

The active Disc `Layout Presets` workflow panel shows `Removed layout items`
only when a supported guided layout has at least one canonical omission. Rows
use the slot definition's semantic label in layout order and expose a native
`Restore` button. Raw IDs, role labels, indexes, and geometry are not shown.

Restoring one item removes only that stable slot ID from omission metadata.
Restoring all clears only the omission list and preserves active layout ID and
version. Neither action reapplies preset geometry, dispatches role focus, opens
a setup menu, or changes owner enablement, assets, text, marks, values, sources,
layout, preview selection, renderer inputs, or export behavior. Lifecycle is
derived again from current owner state: unfilled or suggested guidance returns,
while a valid filled owner remains visible without a placeholder.

After restoring one row, focus moves to the next canonical Restore button,
then the previous button, then the stable Preset selector. Restore all also
returns focus to the Preset selector. The section disappears after the final
omission is restored, leaving no hidden controls in the tab order.

Reapplying the same guided layout ID/version preserves omissions. Applying a
different layout clears cross-layout omission identity through the pure layout
transition. `Restore all` is the explicit reset for the active layout's default
slot catalog. A project/workflow reset clears active guidance; applying a layout
after that reset starts from its unchanged preset definition and default slot
catalog. In every case, persisted `omittedSlotIds` record only active-layout
customization and owner content remains untouched.

## 13. Persistence Boundary

Schema `0.2.0` stores the active workflow under optional
`editor.guidedLayout` as layout ID, version, and canonical omitted slot IDs.
Inactive guidance omits this structure. The project adapter uses the pure
workflow normalizer, so malformed metadata, unknown IDs, and unsupported future
versions deactivate guidance without blocking owner-state restoration.

The saved workflow does not contain the canonical preset ID/revision or a
template-resolved definition. Project load restores `editor.guidedLayout` but
clears that transient generic-preset state. Reconstructing it from the restored
guided identity after load is intentionally deferred to #295; no saved resolved
geometry is introduced as a workaround.

Filled content remains ordinary project state under existing feature owners.
Omission changes guidance only: owner enablement, content, geometry, preview,
render, and export remain independent. Setup-menu state, focus/navigation,
selection, panel expansion, hover/animation, labels, and geometry are transient
or definition-owned and are not serialized.

## 14. Architecture Invariants

- Existing feature owners remain the source of truth.
- No parallel asset, text, mark, enablement, or layout state is introduced.
- No second visual renderer is introduced.
- Placeholders never export.
- Unfilled and suggested placeholders never drag or resize.
- Guided domain logic must not become an `App.tsx` dumping ground.
- No Case Insert behavior changes in the Disc-first track.
- Guided persistence is limited to the schema `0.2.0` workflow metadata.
- Persistent completed/claimed slot IDs and their explicit reset UI are not yet
  implemented; #295 owns that extension.
- Aspect-preserving point-owner contain-fit is not yet implemented; #296 owns
  that placement-policy extension.
- No auto-fill implementation in this child issue.
- No arbitrary layer model is introduced.
- Preview, edit, save/load, and export parity remain intact for filled content.
- Blank projects remain valid and are not forced through a guided checklist.

## 15. Open Decisions

- Whether each safe suggestion auto-binds or requires confirmation.
- Repeatable-slot append versus reuse behavior.
- Whether disabled but otherwise valid payload shows an unfilled placeholder or a distinct inactive state.
- Whether `domain-mark` remains one content kind or splits into rating, media, platform, and technical kinds.
- How a primary repeated slot preserves its binding when repeated objects are reordered or removed.

## 16. Follow-Up Child Issues

1. Game Title image-first interaction and auto-fill.
2. Safe rating/logo/legal suggestions.
3. Filled-slot movement/export transition tests.
4. Native Tauri omit/save/load/restore/reset/export validation before #292
   closeout.
5. #295: persisted guided-slot completion and active-preset reconstruction after
   load.
6. #296: aspect-preserving contain-fit for replacement visuals.

Related issues and contracts:

- #281: guided layout preset parent track.
- #283: this Disc slot domain and lifecycle contract.
- #289: open Classic Top Title passive placeholder and guided setup track.
- #292: open guided-slot omission workflow and restore-surface track.
- #295: persistent guided-slot completion and post-load preset reconstruction.
- #296: aspect-preserving contain-fit placement.
- #267: packaging role taxonomy and object-role model.
- #269: role-based preset model and application contract.
- #270: completed Disc layout preset MVP.
- [`PACKAGING_ROLE_MODEL.md`](PACKAGING_ROLE_MODEL.md)
- [`ROLE_BASED_PRESET_MODEL.md`](ROLE_BASED_PRESET_MODEL.md)
- [`SOFTWARE_DESIGN_DOCUMENT.md`](SOFTWARE_DESIGN_DOCUMENT.md)
- [`PROJECT_FILE_SPEC.md`](PROJECT_FILE_SPEC.md)

