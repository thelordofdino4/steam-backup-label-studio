# Guided Preset Slot Model
> Status: Design contract for #283 and implementation contract for #289.
> Purpose: Define the Disc guided preset slot identity, lifecycle, binding, and architecture boundaries for parent issue #281.
> Read when: Working on guided Disc presets, slot resolution, edit-mode placeholders, role-focus navigation, guided persistence, or safe content suggestions.
> Authoritative source: Current source for implemented behavior; `PACKAGING_ROLE_MODEL.md` for semantic roles; `ROLE_BASED_PRESET_MODEL.md` for layout presets; `PROJECT_FILE_SPEC.md` for saved-project schema; `SOFTWARE_DESIGN_DOCUMENT.md` for architecture contracts.

## Implementation Status

Pure Disc slot definitions and lifecycle resolution are implemented in
`src/guidedPresets/discGuidedSlots.ts`. Skip and suggestion inputs remain
transient. Pure typed Disc role-focus requests, runtime validation, and reducer
state are implemented in `src/editor/editorRoleFocus.ts`. Focus-target IDs are
semantic navigation identifiers, not DOM IDs or smoke-test IDs, and navigation
state is transient and is not serialized.

Pure guided-layout identity and placeholder geometry are implemented separately
in `src/guidedPresets/discGuidedLayouts.ts`. The existing
`classic-top-title` role preset maps to
`disc:guided-layout:classic-top-title`. Its ordered pure layout now defines
Game Title, Background Image, Rating Badge, Media Format Mark, Operating System
Marks, Developer Logo, Publisher Logo, and Copyright / Legal Text. Sidebar
roles remain organizational groupings and are not guided slots. Every slot
declares normalized visual and action geometry, a
background/foreground layer, semantic setup kind, and safe population
capability. The pure projector returns `unfilled` and `suggested` slots and
suppresses `filled` and `skipped` slots independently. Layout presets continue
to place real feature-owner state; guided definitions contain no content, DOM,
renderer, export, persistence, or role-focus request data.

A successful `classic-top-title` layout preset application activates the
guided layout as transient editor state. The Disc editor now renders all eight
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
target. Neither uses a broad role summary target. Their production control
registrations remain the next chunk. Choice popovers render at z-index `30`,
support Escape dismissal with focus return, and close when their slot leaves
the projected list. Buttons rely on native Enter and Space activation and do
not drag, resize, select preview content, or activate the text ribbon.

Every setup action sends a typed #287 `focus` request with `role-start` scroll
alignment. The resolved direct or fallback target receives focus first with
native scrolling prevented; the registered owning role summary is then the
final start-aligned scroll anchor. It never enables a feature, mutates owner
content, accepts a suggestion, reruns import, or stores completion state.
Suggested placeholders retain the same setup route and an explicit suggested
description. Skip, native full-workflow validation, and export smoke remain
later #289 work. Issue #289 remains open and is not ready for a PR.

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
  controlled Developer / publisher logos panel. Developer upload falls back
  only to developer enable, and publisher upload falls back only to publisher
  enable. Navigation never enables, imports, or mutates either logo asset.
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

The original 19 #287 Disc role-focus targets have production registration. The
three exact Media/OS targets added for #289 are typed and parser-valid but do
not have production control registration yet. The
Classic Top Title guided action layer is the first production caller: it sends
the nine exact setup actions for eight slots through the typed controller
without direct DOM lookup or feature mutation. Native eight-slot workflow and
exported PNG smoke remain pending. Guided
persistence and auto-fill remain future #281 work. Navigation state is
transient and non-persistent, and Case Front, Case Back, and Spine remain
outside the Disc-only provider.

## 1. Purpose And Scope

Guided slots describe content that a guided preset expects at a particular
place in a layout. A slot can ask for a Game Title, Background Image, Rating
Badge, Media Format Mark, Operating System Marks, Developer Logo, Publisher
Logo, Legal Text, Additional Artwork, or Additional Text without
becoming a second copy of that content.

A slot definition is domain guidance, not rendered project content. Existing
feature owners remain the source of truth for images, text, marks, enablement,
layout, editing, save/load, preview, and export. An unfilled slot does not create
or enable a feature object merely because the slot exists.

This contract is Disc Label only. It defines identity, vocabulary, accepted
content, binding and validity rules, lifecycle derivation, and architecture
boundaries for #281. The pure source definitions and lifecycle resolver are now
implemented, along with the Disc role-focus foundation, complete pure Classic
Top Title eight-slot layout, generalized placeholder projection, split visual
layers, and accessible setup navigation. Persistence, Skip, suggestion
acceptance, and auto-fill remain deferred. Case Front, Case Back, and Spine
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

The background owner must be enabled, contain a nonempty image URL, have loaded
positive image dimensions, and pass the canonical active-image-content check.
URL-only, unloaded, empty, default, or invented artwork remains unfilled. This
readiness is transient resolver input and adds no project schema field.

### Rating Badge

| Property | Contract |
| --- | --- |
| Slot ID | `disc:guided:rating-badge:primary` |
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

### Media Format Mark

| Property | Contract |
| --- | --- |
| Slot ID | `disc:guided:media-format-mark:primary` |
| Semantic role | `game-info-logos` |
| Accepted kinds | `domain-mark`, `image` |
| Preferred kind | `domain-mark` |
| Candidate bindings | Canonical media-mark owner |
| Optional/skippable | Optional and skippable |
| Safe suggestion | Existing configured media-mark state |
| Safe auto-fill | None; the preset never chooses a format |
| Sidebar role | Game Info Logos |
| Export | Existing media-mark export predicate after binding |
| Movement | Existing media-mark drag/layout behavior after binding only |

Media Format Mark is independent from Rating Badge and Operating System Marks.
It is filled only when the canonical enabled/renderable owner predicate passes.

### Operating System Marks

| Property | Contract |
| --- | --- |
| Slot ID | `disc:guided:operating-system-marks:group` |
| Semantic role | `game-info-logos` |
| Accepted kinds | `domain-mark`, `image` |
| Preferred kind | `domain-mark` |
| Candidate binding | Selected enabled values from the platform-mark owner |
| Optional/skippable | Optional and skippable |
| Safe suggestion | Existing configured operating-system marks |
| Safe auto-fill | None; the preset never selects or enables marks |
| Sidebar role | Game Info Logos |
| Export | Existing platform-mark export predicates after binding |
| Movement | Deterministic grouped placement after binding |

PC, Windows, Linux, SteamOS, and macOS remain simultaneous peer values. There
is no invented primary OS mark. At least one selected, enabled, renderable mark
fills this exact slot.

### Developer Logo

| Property | Contract |
| --- | --- |
| Slot ID | `disc:guided:developer-logo:primary` |
| Semantic role | `company-logos` |
| Accepted/preferred kind | `image` |
| Candidate binding | Primary developer logo only |
| Optional/skippable | Optional and skippable |
| Sidebar role | Company Logos |

Publisher state never fills Developer Logo.

### Publisher Logo

| Property | Contract |
| --- | --- |
| Slot ID | `disc:guided:publisher-logo:primary` |
| Semantic role | `company-logos` |
| Accepted/preferred kind | `image` |
| Candidate binding | Primary publisher logo only |
| Optional/skippable | Optional and skippable |
| Sidebar role | Company Logos |

Developer state never fills Publisher Logo.

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

### Classic Top Title Layout

Classic Top Title requires eight exact expected-content slots. Game Info Logos
and Company Logos remain sidebar role groupings only.

| Slot | Label | Visual geometry `(cx, cy, w, h)` | Action geometry | Layer | Setup kind | Population capability |
| --- | --- | --- | --- | --- | --- | --- |
| `disc:guided:game-title:primary` | Game Title | `50, 19.5, 62, 16` | same | foreground | `game-title-choice` | existing Steam import |
| `disc:guided:background-image:primary` | Background Image | `50, 50, 92, 92` | `50, 34, 34, 8` | background | `background` | none |
| `disc:guided:rating-badge:primary` | Rating Badge | `79, 62, 20, 14` | same | foreground | `rating-badge` | accepted metadata |
| `disc:guided:media-format-mark:primary` | Media Format Mark | `80, 76, 22, 9` | same | foreground | `media-format-mark` | existing owner only |
| `disc:guided:operating-system-marks:group` | Operating System Marks | `50, 73, 28, 10` | same | foreground | `operating-system-marks` | existing owner only |
| `disc:guided:developer-logo:primary` | Developer Logo | `21, 62, 26, 9` | same | foreground | `developer-logo` | existing owner only |
| `disc:guided:publisher-logo:primary` | Publisher Logo | `21, 74, 26, 9` | same | foreground | `publisher-logo` | existing owner only |
| `disc:guided:legal-text:copyright` | Copyright / Legal Text | `50, 89, 64, 8` | same | foreground | `legal-text` | accepted metadata |

The broad Background visual rectangle intentionally contains all foreground
regions, while its smaller action anchor avoids overloading the whole Disc as
an interaction target. Foreground rectangles do not overlap. Geometry is
normalized Disc space and contains no viewport pixels.

Applying the Classic layout no longer auto-enables Media Format Mark. Rating,
Media, OS marks, Developer Logo, Publisher Logo, and Copyright remain disabled
when disabled. Existing enabled/renderable owners are repositioned without
changing content, source, theme, selected values, custom assets, or inference.
Operating-system marks use deterministic grouped placement inside their exact
region and receive only returned `x`, `y`, and `scale` updates.

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

The pure projector and current Disc affordance layers implement this visibility
contract. Each projected unfilled or suggested slot produces one visual and one
native action region. When owner state resolves the slot as filled, both leave
the projection without a separate completion flag; clearing valid owner
content allows the guidance to return.

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
preferred, with Disc title text as fallback. Developer Logo and Publisher Logo
are separate single-owner slots; neither may be satisfied by the other owner.
Rating Badge, Media Format Mark, and Operating System Marks are likewise three
independent slots despite sharing the Game Info Logos sidebar role.

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
- Background guidance belongs behind foreground slots and real owner content.
- Foreground guidance must remain behind any real owner content that still
  renders while the semantic slot is incomplete.
- It never enters export layer lists, export inputs, or PNG drawing helpers.
- It uses explicit preset geometry because an empty slot has no rendered DOM owner to measure.
- It must reuse the blue dashed selected-element pulse/glow language for #289.
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
this as `guidance-behind-real-content`. Filled and skipped slots suppress only
their own projected placeholder, while suggested slots stay visible with an
explicit secondary label. Guided activation clears on new/replaced projects and
workspace exit; activation and placeholder state never enter save/load, render,
or export paths.

The HTML interaction layer uses each slot's normalized action geometry and is
separate from both visual SVGs and preview-editable registration. Native
buttons preserve model order for tab navigation. Game Title alone uses the
focused Image/Text setup popover. Background, Rating, Developer, Publisher,
and Copyright dispatch exact typed destinations directly. Media and OS now
dispatch their exact typed destinations and never route to a broad role
summary. Production registration remains intentionally deferred. Popover state
is transient, closes after
selection or Escape, and becomes
inactive immediately if its projected slot disappears. Setup navigation does
not accept suggested content automatically; it routes the user to the existing
owner control.

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
type EditorRoleFocusRequest = {
  requestId: number
  surfaceId: 'disc-label'
  behavior: 'reveal' | 'focus'
  destination: DiscRoleFocusDestination
  scrollAlignment?: 'nearest' | 'role-start'
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
| `focus` | Opens the requested top-level role, resolves the registered semantic target, invokes explicit ancestor callbacks in registration order, and focuses the target with scroll prevention. Omitted/`nearest` preserves target nearest/automatic scrolling. `role-start` skips target scrolling and finally start-aligns the original owning role summary, or its registered details fallback. If the target is unavailable, it follows explicit semantic fallbacks and then the role summary. The request is consumed once regardless of outcome and is never retried when controls later mount. |

All role-focus state is editor-session-only. It does not dirty the project,
create an undo entry, trigger autosave, or enter the saved-project schema.
Scroll alignment is part of the same transient request and is never serialized.
The role summary uses CSS `scroll-margin-block-start` backed by the shared 24px
sidebar content-inset token, so `scrollIntoView({ block: 'start' })` works with
the desktop sidebar scroll owner and narrow document scrolling without runtime
pixel arithmetic.

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
| `disc:media-format-mark:enable` | Semantic identity for the always-mounted Media Format Mark enable checkbox. It does not choose a format or enable the owner. Production registration is pending. |
| `disc:media-format-mark:format` | Semantic identity for the actual media-format selector. Its future production fallback is `disc:media-format-mark:enable` while the feature body is unavailable. Navigation never changes the selected format. Production registration and fallback wiring are pending. |
| `disc:operating-system-marks:enable` | Semantic identity for the always-mounted Show operating system marks checkbox. It does not select, enable, import, or identify any individual platform mark. Production registration is pending. |
| `disc:company-logo:developer-enable` | The primary developer-logo enable checkbox. It remains registered while Company Logos is mounted, opens the shared Developer / publisher logos panel, and does not toggle or mutate the logo. |
| `disc:company-logo:developer-upload` | The enabled-only primary developer-logo file input. It is registered only while the developer body is mounted and explicitly falls back only to `disc:company-logo:developer-enable` when unavailable. |
| `disc:company-logo:publisher-enable` | The primary publisher-logo enable checkbox. It remains registered while Company Logos is mounted, opens the shared Developer / publisher logos panel, and does not toggle or mutate the logo. |
| `disc:company-logo:publisher-upload` | The enabled-only primary publisher-logo file input. It is registered only while the publisher body is mounted and explicitly falls back only to `disc:company-logo:publisher-enable` when unavailable. |
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

The guided preview caller dispatches only these typed setup destinations:

- Game Title Image -> `disc:game-title:artwork-upload`
- Game Title Text -> `disc:game-title:text-fallback`
- Background Image -> `disc:background-image:local-upload`
- Rating Badge -> `disc:rating:enable`
- Developer Logo -> `disc:company-logo:developer-upload`
- Publisher Logo -> `disc:company-logo:publisher-upload`
- Copyright / Legal Text -> `disc:legal-text:copyright`
- Media Format Mark -> `disc:media-format-mark:format`
- Operating System Marks -> `disc:operating-system-marks:enable`

All nine setup actions use `role-start`; nearest remains the backward-compatible
default for omitted alignment and for existing non-guided navigation. Alignment
always uses the original destination role even when upload targets fall back to
their matching enable controls. Target focus remains intact because the
controller does not focus the summary merely to align it.

Existing target fallbacks remain authoritative. The caller does not query the
DOM, duplicate role-panel state, enable features, or invoke controls. Native
focus validation remains pending. Case Front, Case Back, and Spine remain
outside this Disc-only provider.

Media format's typed fallback contract is `format -> enable`; it is documented
but not registered in this pure-vocabulary chunk. Media enable and OS enable
need no semantic fallback. Owner identity is optional. When supplied, both
Media targets accept only `{ owner: 'mediaMark' }`, while OS enable accepts only
`{ owner: 'platformMarks', selection: 'enabled-values' }`. Payload-bearing or
cross-owner identities are rejected by the strict runtime parser.

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

- Exact skipped-state persistence design.
- Whether each safe suggestion auto-binds or requires confirmation.
- Repeatable-slot append versus reuse behavior.
- Guided preset and slot versioning.
- Future non-rectangular placeholder geometry and safe-zone representation.
- Whether disabled but otherwise valid payload shows an unfilled placeholder or a distinct inactive state.
- Whether `domain-mark` remains one content kind or splits into rating, media, platform, and technical kinds.
- How a primary repeated slot preserves its binding when repeated objects are reordered or removed.

## 15. Follow-Up Child Issues

1. Pure Disc slot definitions and resolution predicates.
2. Guided preset persistence/schema design.
3. Completed: split background/foreground visual layers and restore blue pulse
   styling while preserving real-content visibility.
4. Completed in source: add accessible setup choices and connect interactive
   placeholders to typed role-focus requests. Native end-to-end guided
   navigation validation remains pending.
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

