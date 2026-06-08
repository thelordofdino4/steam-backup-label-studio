# Editor Code Unification Prompt Plan

Last refreshed: 2026-06-08.

This document is a working prompt list for reducing duplicated code between the
disc editor and the case insert editor without flattening them into one
overgrown editor.

The large-scale goal is to touch every shared editor system and decide what can
be made a neutral source of truth:

- panel and sub-panel UI
- optional feature enable/disable behavior
- sliders, range fields, presets, reset and clear controls
- artwork and image source controls
- branding, logo, badge, media mark, platform mark, and technical mark controls
- text controls, style controls, layout controls, and visual avoidance
- preview and PNG export render artifacts
- save/load defaults, normalization, and migrations
- export preflight warnings
- drag and pointer interaction
- CSS ownership and shared visual styling
- tests, fixtures, and manual smoke checklists

Once a feature is genuinely used by both editors, it should stop carrying an
editor-specific name such as `disc`, `label`, `caseInsert`, `jewelCase`, or
`spine` in the shared owner. Editor-specific adapters may keep editor-specific
names. Features that only make sense in one editor, such as curved disc text,
disc hub geometry, disc-number artwork, or rotated jewel case spine layout, may
retain editor-specific ownership and naming.

## Required Rules For Every Prompt

Every prompt below should begin with:

```text
Read AGENTS.md and the related guardrail docs before starting. Review open
GitHub issues before changing code, especially #44, #46, #48, #56, #126, and
#149 if they overlap this work.

This is a unification/refactor task, not a redesign task. Preserve current disc
editor behavior and current case insert behavior unless a behavior difference is
explicitly called out as a bug.

Do not add feature logic to App.tsx or broad presentation components. Keep
domain math, state transitions, upload/import interpretation, project
normalization, preview/export render decisions, and preflight rules in focused
owners.

Use small, reviewable changes. If the task reveals a larger migration, stop and
create or propose follow-up issues rather than hiding broad refactors in one
patch.

Run npm run test, npm run lint, npm run build, and npm run check:cycles after
code changes. Do not run npm run tauri dev unless explicitly asked. Ask the user
to manually verify runtime UI, drag, upload, save/load, preview, and export
behavior.
```

## Canonical Work Order

Work the unification passes in this order unless the user explicitly changes
the priority or a live regression needs an emergency fix. Do not pull work from
later stages into earlier stages just because the same file is open.

1. Create the no-code unification map.
2. Unify shared panel shells and primitive controls.
3. Establish the shared optional visual feature contract.
4. Unify image source UI, upload, status, clear, and restore behavior.
5. Unify repeated artwork element behavior.
6. Unify branding mark behavior for rating, media, platform, and technical
   marks.
7. Unify logo asset controls for developer, publisher, and additional logos.
8. Unify Steam banner controls while keeping editor/template layout adapters
   separate.
9. Unify straight text source, style, width, preset, and avoidance behavior.
10. Unify drag target contracts and pointer plumbing.
11. Unify preview/export render models and shared drawing helpers.
12. Unify preflight warning builders.
13. Unify project defaults, normalization, and schema contracts, coordinating
    with #48 before persisted field names or migration behavior change.
14. Clean shared CSS only after the shared component boundaries exist,
    coordinating with #46.
15. Continue shared hook/state-transition cleanup and layer-order/surface
    capability cleanup only after the earlier behavior contracts are stable.
16. Perform naming migration and dead alias cleanup only after the shared owner
    is real and consumed by both editors.
17. Add the shared contract test suite.
18. Work structured tray/spine layouts separately under #149 after shared
    controls are stable.
19. Perform the final audit and documentation update.

The ordering is intentional. Panels and primitive controls reduce presentation
duplication first. Source and visual-feature contracts then prevent the artwork,
branding, and text passes from recreating editor-specific behavior. Project
normalization, CSS, and naming migration come late because doing them too early
creates churn before the shared source of truth is proven.

## Naming Policy

Use this policy in every unification pass:

- Shared source-of-truth modules should use neutral names such as `editor`,
  `visual`, `asset`, `mark`, `text`, `layout`, `template`, `preflight`, or
  `project`.
- Editor adapters may use editor-specific names such as `disc`, `caseInsert`,
  `jewelCase`, `spine`, `front`, `tray`, or `surface`.
- Do not rename an editor-specific function to a neutral name unless it is
  actually shared by both editors.
- Do not force circular disc behavior into rectangular case insert behavior.
- Do not force rotated spine behavior into normal cover/tray/disc behavior.
- Legacy saved-project aliases may remain in normalization adapters, but new
  UI labels, defaults, render layer labels, and tests should use current shared
  vocabulary.

## Editor Panel Hierarchy Contract

Shared panel code must support both editor hierarchies. The shared shell can be
neutral, but the hierarchy it renders must remain editor-specific.

Disc labeler hierarchy:

- Top-level workflow panels remain:
  Project File -> Export Options -> Game -> Template -> Artwork -> Branding ->
  Text -> Guide Legend.
- Artwork, Branding, and Text are direct top-level workflow panels in the disc
  editor.

Case insert hierarchy:

- Top-level workflow panels begin with:
  Project File -> Export Options -> Game -> Template.
- Artwork, Branding, and Text are not direct top-level siblings in the same way
  they are in the disc editor. They are wrapped inside surface-labeled panels.
- Cover Sheet should expose its own Artwork, Branding, and Text sections inside
  the Cover Sheet surface panel.
- Tray Card should expose its own Artwork, Branding, and Text sections inside
  the Tray Card surface panel.
- Spine should expose side-specific panels first, such as Left Spine and Right
  Spine, followed by that side's Artwork, Branding, and Text sections.
- Shared panel components may render these shells, but they must not decide
  which surfaces or spine sides exist. Surface capability and template structure
  belong in case insert adapters.

## Prompt 00: Create The Unification Map

```text
Perform a no-code audit of both editors and create a unification map.

Scope:
- Inventory disc editor and case insert editor owners for panels, controls,
  hooks, state transitions, project defaults, normalization, preview layers,
  export drawing, drag interactions, preflight, tests, and CSS.
- Identify every duplicated concept and classify it as:
  1. shared source-of-truth candidate,
  2. editor-specific adapter candidate,
  3. intentionally editor-specific behavior,
  4. legacy compatibility only.
- For each shared candidate, name the current best source implementation and
  explain what would need to move or be renamed.
- For each intentionally editor-specific behavior, explain why it should stay
  separate.

Output:
- A markdown report with a table of candidates.
- A recommended issue sequence.
- No code changes.
```

## Prompt 01: Shared Panel And Nested Panel Shells

```text
Unify the reusable panel and nested panel UI shells used by both editors.

Scope:
- Audit disc sidebar panels and case insert panels for collapsible panels,
  nested feature panels, card styling, enabled-state body visibility, headings,
  action rows, empty states, and help text patterns.
- Preserve both editor hierarchy contracts:
  - disc Artwork, Branding, and Text are direct workflow panels
  - case insert Artwork, Branding, and Text live inside surface-labeled panels
  - case insert spine controls live inside Left Spine and Right Spine panels
    before exposing Artwork, Branding, and Text
- Extract or rename only presentation-level shells that do not own feature
  decisions.
- Replace duplicated panel wrappers in both editors with the shared shell.
- Preserve the current disc main sidebar order:
  Project File -> Export Options -> Game -> Template -> Artwork -> Branding ->
  Text -> Guide Legend.

Constraints:
- The shared panel shell must not know whether it is rendering disc or case
  insert.
- Shared panel shells must support nested insert hierarchy without flattening
  surface or spine-side panels into disc-style top-level panels.
- Do not move feature-specific source selection, layout math, or state
  transitions into the shared panel component.
- Preserve disabled-feature behavior: show only the top-level checkbox when
  disabled, hide dependent controls, do not destroy state.

Validation:
- Add or update panel hierarchy tests where practical.
- Ask the user to manually verify panel open/closed behavior and nested spacing
  in both editors.
```

## Prompt 02: Shared Field, Slider, Preset, And Action Controls

```text
Unify primitive controls that are visually and behaviorally identical across
both editors.

Scope:
- Audit RangeField, checkbox rows, select fields, layout preset controls,
  source preset controls, reset buttons, clear buttons, delete buttons, add
  buttons, and grouped action rows.
- Create neutral shared controls for primitives that are identical.
- Keep editor-specific slider ranges and layout meanings in adapters or
  view-model helpers.
- Replace duplicated primitive controls in disc and case insert panels.

Constraints:
- Shared controls receive labels, values, ranges, disabled state, and handlers.
  They must not decide what `x`, `y`, `width`, `cross`, `length`, `rotation`,
  or `scale` means.
- Disc-only ranges such as curved text arc/inset stay disc-specific.
- Spine-specific ranges such as cross/length/orientation stay spine-specific,
  but may reuse the neutral RangeField primitive.

Validation:
- Unit test range/view-model helpers where they are extracted.
- Manual smoke: confirm sliders update preview in both editors.
```

## Prompt 03: Shared Optional Visual Feature Contract

```text
Create a shared optional visual feature contract and migrate both editors to it
where behavior is equivalent.

Scope:
- Audit show/enable checkboxes, dependent-control visibility, disabled-state
  preservation, preview omission, export omission, reset/clear behavior, and
  save/load preservation for artwork, branding, marks, and text.
- Extract neutral helpers/types for optional feature visibility and enabled
  state where both editors already behave the same.
- Keep editor-specific adapters for features with different geometry or slots.

Constraints:
- Do not introduce hidden "use built-in art" toggles or target-only concepts
  when the shared visible checkbox should be the source of truth.
- Disabling a feature must preserve selected source, uploaded asset, layout,
  style, and saved state.
- Disabled features must not render in preview or PNG export.

Validation:
- Add contract tests for enable, disable, re-enable, preview omission, export
  omission, and save/load restoration.
```

## Prompt 04: Shared Image Source And Upload System

```text
Unify image source picker, upload, provenance, active-source status, clear, and
restore behavior across both editors.

Scope:
- Audit background artwork, title/logo artwork, additional artwork, logo marks,
  rating badges, media marks, platform marks, technical marks, Steam banner
  lockups, and case insert equivalents.
- Extract neutral source picker UI and source-status helpers where the behavior
  is shared.
- Reuse existing asset provenance/status helpers wherever possible.
- Keep source catalogs and target-slot adapters editor-specific where necessary.

Constraints:
- Shared image source controls must not decide which Steam asset, web candidate,
  local screenshot, built-in generic asset, or custom upload belongs to a
  target. That belongs in source catalog/domain helpers.
- Preserve custom uploads, built-in generic fallback, restore-default behavior,
  and source labels through save/load.

Validation:
- Add tests for source switching, custom upload, clear, restore default, and
  save/load preservation for at least one disc target and one case target.
- Manual smoke: upload and switch sources in both editors.
```

## Prompt 05: Shared Artwork Element Model

```text
Unify repeated artwork element behavior across disc additional artwork and case
insert additional artwork where the behavior is equivalent.

Scope:
- Audit add/remove/rename, slot labels, source selection, upload, frame/border
  controls, enable/disable, drag, sliders, reset/clear, preview, export,
  preflight, and save/load.
- Extract neutral repeated artwork helpers/components for behavior that is
  shared.
- Rename shared concepts away from editor-specific terms.
- Keep disc-specific or case-specific layout adapters separate.

Constraints:
- New additional artwork elements should use shared numbering and labeling,
  such as "Artwork 1", not template-specific screenshot defaults unless a
  structured layout feature explicitly creates screenshots.
- Do not break structured tray/spine layout work tracked by #149.

Validation:
- Add tests for adding artwork, labels, frame settings, global visibility,
  preview/export visibility, and save/load in both editors.
```

## Prompt 06A: Shared Branding Mark System

```text
Unify branding mark behavior across disc and case insert where features are
equivalent.

Scope:
- Audit rating badges, media marks, operating-system marks, and technical
  marks in both editors.
- Identify shared source behavior, custom upload behavior, built-in generic
  fallback behavior, layout controls, add/remove behavior, preview, export,
  preflight, and save/load.
- Extract neutral mark/badge components and domain helpers where both editors
  use the same contract.
- Keep target adapters for disc geometry, cover/tray rectangular geometry, and
  spine geometry.

Constraints:
- Do not collapse all mark families into one vague helper if their product
  behavior differs.
- Do not bundle official third-party logo assets unless licensing is clearly
  safe.
- Keep #125 catalog expansion separate from this structural unification unless
  the user explicitly combines them.

Validation:
- Contract tests for built-in vs custom image, enable/disable preservation,
  additional technical mark add/remove, preview/export, and save/load.
- Manual smoke for rating, media, platform, and technical marks in disc, cover,
  tray, and spine.
```

## Prompt 06B: Shared Logo Asset Controls

```text
Unify developer, publisher, and additional logo asset behavior across disc and
case insert where features are equivalent.

Scope:
- Audit developer logo, publisher logo, and additional logo controls in both
  editors.
- Identify shared candidate discovery, source switching, upload, clear,
  alignment presets, add/remove/rename behavior, layout controls, preview,
  export, preflight, and save/load.
- Extract neutral logo asset controls and domain helpers where both editors use
  the same contract.
- Keep target adapters for disc geometry, cover/tray rectangular geometry, and
  spine geometry.

Constraints:
- Do not mix company logo behavior into rating/media/platform/technical mark
  behavior when their product rules differ.
- Do not bundle official third-party logo assets unless licensing is clearly
  safe.
- Keep case insert surface and spine slot mapping in case insert adapters.

Validation:
- Contract tests for candidate/custom source switching, enable/disable
  preservation, additional logo add/remove, preview/export, and save/load.
- Manual smoke for developer, publisher, and additional logos in disc, cover,
  tray, and spine.
```

## Prompt 06C: Shared Steam Banner Controls

```text
Unify Steam banner controls where behavior is equivalent while preserving
editor/template-specific layout.

Scope:
- Audit disc Steam banner controls and case insert Steam banner controls.
- Identify shared color controls, gradient controls, fallback text controls,
  lockup image upload, reset colors, reset layout, preview, export, preflight,
  and save/load.
- Extract neutral Steam banner controls/domain helpers where both editors use
  the same contract.
- Keep disc, cover sheet, tray card, left spine, and right spine layout math in
  adapters.

Constraints:
- Shared Steam banner code must not know circular disc geometry, rectangular
  cover/tray dimensions, or rotated spine coordinates.
- Preserve each template's existing default Steam banner geometry and controls.
- Do not add unfinished Steam Backup branding options to targets that do not
  render/export them.

Validation:
- Tests for color reset, lockup source switching, enabled-state preservation,
  preview/export participation, and save/load.
- Manual smoke for disc banner, cover banner, and both tray-card spine banners.
```

## Prompt 07: Shared Text Source, Style, And Layout Controls

```text
Unify text controls that are shared by disc and case insert editors while
preserving editor-specific text features.

Scope:
- Audit metadata-bound values, manual overrides, text inputs, style presets,
  font/color/background/border controls, width, layout presets, scale, x/y,
  reset style, reset layout, visual-element avoidance, preview, export, preflight,
  and save/load.
- Extract neutral text source, text style, text layout, and text avoidance
  controls/helpers where both editors now share behavior.
- Keep curved disc text, disc-number artwork, and spine rotated text adapters
  editor-specific.
- Rename shared text helpers away from `discText` or `caseInsertText` only when
  they are truly shared.

Constraints:
- The shared text layer should not know about circular disc geometry or rotated
  spine coordinate systems.
- Geometry-specific text layout should be supplied by adapters.
- Preserve legacy saved projects with missing width/style/preset fields.

Validation:
- Tests for metadata/manual source behavior, width, presets, style reset,
  layout reset, visual avoidance, preview/export parity, and save/load in both
  editors.
```

## Prompt 08: Shared Drag And Pointer Interaction Infrastructure

```text
Unify drag/pointer interaction infrastructure for movable visual elements while
keeping geometry-specific clamp math in adapters.

Scope:
- Audit drag behavior for background, title/logo artwork, additional artwork,
  logos, rating badges, media marks, platform marks, technical marks, text, and
  case insert equivalents.
- Extract neutral pointer event plumbing, hit-target registration, drag session
  lifecycle, and update dispatch where possible.
- Keep disc safe-zone/hub clamp math, rectangular surface clamp math, and spine
  rotated coordinate math in focused layout/domain helpers.

Constraints:
- Shared drag code must not know editor geometry.
- Do not break slider/manual positioning while adding shared drag plumbing.
- Preview hit targets may be separate from visual render artifacts, but that
  separation must be explicit.

Validation:
- Tests for drag delta adapters where practical.
- Manual smoke: drag each major movable element in both editors.
```

## Prompt 09: Shared Preview Render Artifact Boundary

```text
Unify preview render artifacts where both editors display the same kind of
visual feature.

Scope:
- Audit preview layers for backgrounds, title/logo artwork, additional artwork,
  Steam banner, logos, badges, marks, text, guides, and warnings.
- Identify visual artifacts that can be represented by a neutral render model.
- Create or rename neutral render model helpers where preview and export can
  consume the same artifact.
- Keep DOM/CSS rendering separate only where canvas export cannot reasonably
  share the same primitive, and document the difference.

Constraints:
- Do not move editor-specific coordinate systems into shared renderers.
- Do not let CSS become hidden business logic.
- Preserve layer order labels and preview/export parity.

Validation:
- Tests for render model creation and layer visibility.
- Manual smoke: preview visual order and visibility in both editors.
```

## Prompt 10: Shared PNG Export Drawing Boundary

```text
Unify PNG export drawing paths where both editors export the same visual
feature.

Scope:
- Audit export drawing for backgrounds, image slots, Steam banner, logo marks,
  rating badges, media marks, platform marks, technical marks, text, and guides.
- Extract neutral canvas drawing helpers for shared visual artifacts.
- Keep disc mask/hub/circular geometry and case insert rectangular/spine
  geometry in editor-specific export adapters.
- Ensure preview and export consume the same layout/render artifacts whenever
  practical.

Constraints:
- Shared export helpers should draw neutral artifacts; they should not select
  which artifacts exist.
- Export must not silently omit enabled preview-visible elements.

Validation:
- Unit tests for export bounds and artifact drawing where existing patterns
  allow it.
- Manual smoke: compare preview and PNG export for disc, cover sheet, tray card,
  and spines.
```

## Prompt 11: Shared Save, Load, Defaults, And Normalization Contracts

```text
Unify project defaults and normalization behavior where disc and case insert
features share the same saved concept.

Scope:
- Audit project types, defaults, sparse restore, legacy normalization, asset
  provenance, layout/style defaults, enable/disable persistence, and source
  labels.
- Extract neutral saved-feature helpers only where the saved data concept is
  shared.
- Keep editor project adapters separate for disc projects and case insert
  projects.
- Identify schema/migration follow-up needed for #48.

Constraints:
- Existing saved projects must continue to load.
- Legacy aliases may normalize to current shared shapes but should not leak
  into new UI or export labels.
- Do not implement the future `.sbls` package format unless explicitly scoped
  with #56.

Validation:
- Add sparse restore and round-trip tests for shared features in both project
  types.
```

## Prompt 12: Shared Export Preflight Framework

```text
Unify export preflight warning construction where disc and case insert warnings
share the same feature semantics.

Scope:
- Audit preflight warnings for guide export, missing backgrounds, low
  resolution, generic/bundled assets, enabled-but-unavailable visuals, text
  readability, unsafe placement, and export dimensions.
- Extract neutral warning builders for shared visual features.
- Keep disc-specific warnings and case-specific warnings in adapters.

Constraints:
- Preflight should describe real export risk, not internal implementation
  details.
- It should remain informational unless a value is truly invalid.
- Disabled visual features should not produce warnings.

Validation:
- Add tests proving equivalent shared warnings in both editors and distinct
  editor-specific warnings where appropriate.
```

## Prompt 13: Shared CSS And Visual Style Ownership

```text
Unify CSS ownership for shared controls and panels after the shared component
boundaries exist.

Scope:
- Audit CSS selectors used by both editors for panels, nested panels, forms,
  sliders, source controls, repeated element cards, action rows, and preview
  overlays.
- Move shared styling into neutral shared CSS files or component-owned classes.
- Keep editor-specific surface/layout styles in editor-specific CSS.
- Remove stale selectors from old renderer/control implementations.

Constraints:
- Do not change visual behavior intentionally unless the user approves.
- Do not let CSS encode layout math, feature state, layer order, or export-only
  behavior.
- Coordinate with #46.

Validation:
- Run CSS-focused manual smoke in both editors.
```

## Prompt 14: Shared Hook And State Transition Boundaries

```text
Unify hook and state-transition patterns where both editors mutate the same
feature concept.

Scope:
- Audit hooks and state transitions for artwork, branding, text, asset sources,
  drag updates, project metadata, save/load/export orchestration, and toasts.
- Extract neutral transition helpers for shared behavior.
- Keep editor adapters thin and explicit.
- Continue reducing App.tsx ownership in line with #44.

Constraints:
- Do not move unrelated state into one giant shared hook.
- Do not make shared hooks depend on disc geometry or case geometry.
- App.tsx should remain orchestration only.

Validation:
- Unit tests for transition helpers and hook adapter behavior where practical.
- Manual smoke for changed controls in both editors.
```

## Prompt 15: Shared Layer Order And Surface Capabilities

```text
Unify layer-order and surface-capability declarations where both editors need
the same visual feature categories.

Scope:
- Audit layer order docs and runtime layer order for disc and case insert.
- Identify shared feature categories such as background, artwork, banner, logos,
  rating, media, platform, technical, text, guides, and hit targets.
- Create neutral feature category names where both editors use the category.
- Keep editor-specific layer stacks and geometry-specific surface capabilities
  in adapters.

Constraints:
- Shared category names should not imply every editor supports every feature.
- Surface capability checks should decide what appears on a given template
  surface.

Validation:
- Tests for layer labels and disabled-feature omission.
- Manual preview/export layer-order smoke.
```

## Prompt 16: Naming Migration And Dead Alias Cleanup

```text
Perform a naming migration after shared ownership is real, not before.

Scope:
- Search for shared modules, components, hooks, and helpers that still use
  editor-specific names after they are consumed by both editors.
- Rename those shared owners to neutral names.
- Keep editor-specific adapters with editor-specific names.
- Remove dead aliases and obsolete wrappers once imports are migrated.
- Keep legacy project normalization aliases only where needed for compatibility.

Constraints:
- Do not rename a module just because it feels generic. Rename only when both
  editors actually use it as source-of-truth behavior.
- Run dependency cycle checks after every import migration.

Validation:
- npm run check:cycles must stay green.
- Tests must prove saved projects still load.
```

## Prompt 17: Shared Contract Test Suite

```text
Create a shared editor feature contract test suite.

Scope:
- Define contract tests for optional feature enable/disable, source switching,
  custom upload, reset/clear, add/remove, layout sliders, drag adapters,
  preview visibility, export visibility, preflight warnings, and save/load.
- Run each contract against disc adapters and case insert adapters where the
  feature is shared.
- Leave editor-specific tests for curved disc text, disc hub geometry, spine
  rotated text, and template-specific export geometry.

Constraints:
- Tests should assert behavior, not implementation filenames.
- Do not force unsupported features onto a surface just to satisfy a shared
  test.

Validation:
- The shared contract test suite should make future parity regressions obvious
  before manual smoke.
```

## Prompt 18: Final Unification Audit And Documentation Update

```text
Perform a final no-surprises audit after the staged unification passes.

Scope:
- List what became shared source-of-truth code.
- List what remains editor-specific and why.
- List remaining duplicated code and whether it is intentional, temporary, or
  needs a follow-up issue.
- Update architecture guardrails, refactor status, project docs, and manual
  smoke checklists to reflect the new ownership model.
- Confirm open GitHub issues that should remain open or be created.

Constraints:
- Do not claim unification complete if known duplicated behavior remains
  unexplained.
- Do not close follow-up issues unless validation and manual smoke support it.

Validation:
- npm run test
- npm run lint
- npm run build
- npm run check:cycles
- User manual Tauri smoke for both editors
```

## Recommended Issue Sequence

Use this exact order unless a live bug or explicit user priority changes it.
Each issue should finish its validation and manual-verification request before
the next issue begins.

1. Prompt 00: Create The Unification Map.
2. Prompt 01: Shared Panel And Nested Panel Shells.
3. Prompt 02: Shared Field, Slider, Preset, And Action Controls.
4. Prompt 03: Shared Optional Visual Feature Contract.
5. Prompt 04: Shared Image Source And Upload System.
6. Prompt 05: Shared Artwork Element Model.
7. Prompt 06A: Shared Branding Mark System.
8. Prompt 06B: Shared Logo Asset Controls.
9. Prompt 06C: Shared Steam Banner Controls.
10. Prompt 07: Shared Text Source, Style, And Layout Controls.
11. Prompt 08: Shared Drag And Pointer Interaction Infrastructure.
12. Prompt 09: Shared Preview Render Artifact Boundary.
13. Prompt 10: Shared PNG Export Drawing Boundary.
14. Prompt 12: Shared Export Preflight Framework.
15. Prompt 11: Shared Save, Load, Defaults, And Normalization Contracts.
16. Prompt 13: Shared CSS And Visual Style Ownership.
17. Prompt 14: Shared Hook And State Transition Boundaries.
18. Prompt 15: Shared Layer Order And Surface Capabilities.
19. Prompt 16: Naming Migration And Dead Alias Cleanup.
20. Prompt 17: Shared Contract Test Suite.
21. Issue #149: Structured tray/spine layouts, only after shared controls and
    visual behavior contracts are stable.
22. Prompt 18: Final Unification Audit And Documentation Update.

The naming migration should happen late. Renaming too early creates churn
without proving that a module is genuinely shared.

Prompt 09 and Prompt 10 may be worked together only if the render artifact
boundary is small enough for one reviewable patch. If either pass starts
touching unrelated feature state, split preview and export into separate
issues.

## Stop Conditions

Stop and ask for review if any pass discovers:

- a shared module would need to know disc geometry and case geometry directly
- a shared component would need to own state transitions or source decisions
- a rename would break saved project compatibility without a migration plan
- preview and export cannot share a render artifact without changing behavior
- unification would hide an intentional product difference
- the patch starts touching unrelated future work such as Guided Start, direct
  printing, official asset packs, or `.sbls` package implementation
