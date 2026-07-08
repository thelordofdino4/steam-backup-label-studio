# Issue #271 Role-Based Editor Navigation Shell
> Status: Implementation design note.
> Purpose: Scope the docs-first implementation approach for GitHub issue #271.
> Read when: Working on the role-based editor navigation shell or follow-up UI-overhaul chunks.
> Authoritative source: `AGENTS.md` for agent workflow, `docs/SOFTWARE_DESIGN_DOCUMENT.md` for architecture contracts, and current source for exact ownership.

## Summary

Issue #271 should add a UI navigation shell and routing adapter for the editor overhaul. It should make the active editor and case-insert surface clear and provide a visible path for role-based sections, while leaving existing editor controls, persisted project state, renderers, export paths, and save/load behavior unchanged.

Correction after the first implementation pass: Disc Label, Case Insert, Front, Back, and Spine are not one flat peer list. The intended hierarchy is:

1. Workspace/editor level: Disc Label and Case Insert.
2. Case Insert surface level: Front, Back, and Spine.
3. Selected editor/surface role level: Game Title, Background Image, logos, legal info, screenshots, system requirements, additional artwork, and additional text where applicable.

Disc Label must not show Case Front, Case Back, or Spine as peer buttons inside the disc editor. Spine is part of the case-insert workflow.

The key implementation decision is that #271 introduces shell-local navigation concepts, not a new persisted project surface model:

| Navigation level | User-facing item | Current implementation route |
| --- | --- |
| Workspace/editor | Disc Label | `activeWorkspace = 'disc'` |
| Workspace/editor | Case Insert | `activeWorkspace = 'caseInsert'` |
| Case Insert surface | Front | case pane `cover` |
| Case Insert surface | Back | case pane `tray` |
| Case Insert surface | Spine | case pane `tray`, plus shell-local active surface state |

The Spine mapping is intentionally an adapter. Current jewel-case spine content is available through the tray-card case pane, so #271 should not invent a persisted `spine` project route or save-file value.

## Current Ownership

- Top-level workspace routing and cross-feature orchestration are owned by `src/app/App.tsx`.
- Current workspace values are `home | disc | caseInsert`.
- Disc sidebar/navigation is hardcoded in `App.tsx` and renders `ProjectPanel`, `ExportOptionsPanel`, `TemplatePanel`, `GamePanel`, setup/program panels such as `Steam Branding`, role panels, and remaining legacy panels such as `TextPanel`.
- Case editor shell/sidebar composition is owned by `src/components/caseInsert/CaseInsertEditorShell.tsx`.
- Case sidebar workflow modeling is owned by `src/caseInsert/sidebarWorkflow.ts`.
- Case surface/pane modeling is owned by `src/caseInsert/templateSurfaces.ts`.
- Current case panes are `cover | tray`; tray owns spine availability.
- Shared collapsible panel rendering is owned by `src/components/editor/EditorPanel.tsx`.
- The contextual text ribbon host is preview-header owned, not sidebar-navigation owned. `PreviewHeader` hosts it, and `DiscPreview` / `CaseInsertPreview` activate it based on selected text state.

## Design Decision: Correct Hierarchy, Not Schema

#271 should not add object-role state, project schema fields, migrations, or new saved surface identifiers. The existing saved project model already distinguishes disc projects from case insert projects, and case insert projects already persist their current editor pane where needed.

Adding persisted role or surface state now would get ahead of #267, #269, and the later migration work. It would also create pressure to wire preview, export, restore, and normalization paths before this issue needs them. The safer boundary is:

- Workspace/editor selection remains app-level. The disc editor should not display case-surface tabs.
- Case Insert owns its own Front, Back, and Spine tabs and routes them to existing case panes.
- The shell may own transient UI selection such as "Spine" when both Back and Spine share the current `tray` pane.
- Existing project save/load/export code continues to consume the same runtime state it consumes today.
- Renderers remain visual sources of truth and are not changed for #271.

## Proposed Code Shape

The neutral model lives under `src/editor/editorNavigationShell.ts`. That model defines:

- workspace/editor IDs such as `disc-label` and `case-insert`;
- case-insert surface IDs such as `front`, `back`, and `spine`;
- role-section scaffolding per surface;
- route adapters from case-insert surface tabs to current case panes;
- helper mapping from existing case panes back to the default case surface.

The presentational components live under `src/components/editor/EditorNavigationShell.tsx`. They render:

- role-section placeholder panels that use the same top-level sidebar panel shell as `Project File`, `Export Options`, `Game`, `Template`, `Artwork`, `Branding`, and `Text`; and
- a case-insert-owned Front/Back/Spine tablist.

They do not own domain decisions, layout math, import behavior, rendering behavior, export behavior, or project normalization.

`App.tsx` should only wire existing orchestration:

- keep owning the current `activeWorkspace`;
- keep owning the current `activeCaseInsertTemplatePane`;
- translate case-insert tab changes into the existing pane setter;
- keep Spine as transient shell state while routing through the tray pane;
- continue delegating feature controls to their current panel owners.

If the shell wiring grows beyond simple translation, extract it into a focused app/editor helper or hook instead of adding another large decision block to `App.tsx`.

## Role Section Scaffolding

#271 may show role sections as scaffolding so later issues have a clear migration target. The role sections should not imply the controls have already moved.

The corrected implementation must not render role sections as a flat button list, peer navigation tiles, fake tabs, or a boxed group of nested placeholders. Role sections are intended to become normal top-level sidebar panels, using the same `EditorPanel` workflow shell as `Project File`, `Export Options`, `Game`, `Template`, `Artwork`, `Branding`, and `Text`.

Role panels should be siblings of the current sidebar panels. They must not be placed inside one wrapper box whose only job is to contain role sections, and they must not use one-off panel classes or custom lookalike markup instead of the shared top-level panel component contract. The sidebar source should map role-section items directly into the sidebar stack as individual panel siblings rather than rendering one shared role-panel group component.

Role panels are ordered by rough average visual size and importance on the
printed surface. Background Image comes before title/logo identity, logo and
info groups come after the major identity elements, text-heavy and optional
elements come later, and legacy migration panels remain last while they still
hold real controls.

Role sections:

- Disc Label: Background Image, Game Title, Game Info Logos, Company Logos, Legal Text, Additional Artwork, Additional Text.
- Front: Background Image, Game Title, Game Info Logos, Company Logos, Legal Info, Additional Artwork, Additional Text.
- Back: Background Image, Game Title, Screenshots, Game Info Logos, Company Logos, Game Description Text, Feature Bullets / Callouts, System Requirements, Legal Info, Additional Artwork, Additional Text.
- Spine: Background Image, Vertical Game Logo or Game Title, Steam Logo / Steam Backup Branding, Company Logo, Optional Media Format Type, Legal Info, Additional Artwork, Additional Text.

This corrected pass does not include a Layout Preset placeholder. Preset model and preset application work remains outside #271.

For #271, these sections can be passive top-level sidebar panel placeholders only where that is very small and clearly non-disruptive. They should be rendered through the same default `EditorPanel` workflow path as existing sidebar panels, with any placeholder copy using existing sidebar content styles such as `hint`. They should not contain migrated controls, fake action buttons, layout presets, custom panel styling, or a new control-routing model. The mature disc controls should remain reachable through their existing panels until #272 moves them deliberately, and case-insert control migration remains #274.

During the #272 disc migration, the disc sidebar should order panels as top-level siblings in this sequence:

1. Program/setup controls first: Project File, Export Options, Template, Game, and Steam Branding where visible.
2. Primary packaging/artwork role panels next, sorted roughly by average visual size on the disc: Background Image, Game Title, Game Info Logos, Company Logos, and Legal Text.
3. Flexible optional role panels after the primary hierarchy: Additional Artwork and Additional Text.
4. Remaining legacy panels last: Text, plus any surface-specific legacy panel that still owns unmigrated controls.

The remaining legacy panels should stay functional while their controls are still there, but their visible panel headers should say "Migrating Soon" so users understand those controls are temporary homes. Do not mark Project File, Export Options, Template, Game, or Steam Branding as legacy migration panels.

Role migration coverage rule: once real controls for a packaging role are
migrated, that role must be migrated across every applicable surface. A
disc-only migration is incomplete unless the role only exists on Disc Label.
For Company Logos, coverage means Disc Label Company Logos, Case Front/Cover
Company Logos, Case Back/Tray Company Logos, and Spine Company Logo. The
migration should continue to reuse each surface's existing control owners and
state/action adapters, and must not change save/load schema, preview renderers,
export renderers, or layout math.

For Game Info Logos, coverage means Disc Label Game Info Logos, Case
Front/Cover Game Info Logos, and Case Back/Tray Game Info Logos. The Spine
equivalent is intentionally narrower for now: Optional Media Format Type owns
only the existing spine media-format mark controls. Spine rating badges,
operating-system marks, and technical marks remain in the Spine Branding legacy
migration panel until a later role can receive them without broadening #272.

Steam Branding is a setup/program panel, not part of the artwork role
hierarchy. It should sit below Game and above the role panels only on surfaces
that already had visible Steam banner controls. Current coverage is:

- Disc Label: Steam Branding is visible and owns the disc Steam banner controls.
- Case Front/Cover: Steam Branding is visible and owns the cover Steam banner controls.
- Case Back/Tray: Steam Branding is not visible in this pass because tray Steam banner state existed but was not previously user-visible.
- Spine: Steam Branding is visible and owns the existing spine Steam branding controls.

Hidden tray Steam banner state should not become user-visible without a
separate product decision.

For the Game Title / Game Logo artwork migration, coverage means Disc Label,
Case Front/Cover, Case Back/Tray, and Spine. This pass moves only existing
visual title/logo artwork controls into the Game Title role panels:
Disc Label `projectTitleArtwork`, template `titleArtwork` for cover and tray,
and spine left/right `titleArtwork`. Plain title text, metadata title fields,
spine title text, and other title text fields remain in their existing
Game/Text owners. This is UI organization only, not a schema, renderer, export,
save/load, text-editor behavior, or persisted-surface change.

For the Legal Info / Legal Text migration, coverage means the existing visible
copyright/legal text rows on Disc Label, Case Front/Cover, Case Back/Tray, and
Spine. This pass moves only those existing rows into Legal role panels:
Disc `copyright`, template `cover-copyright-text` and `tray-copyright-text`,
and spine copyright text rows for the current mirrored or left/right spine
mode. The Game panel's `Copyright / legal text` metadata textarea remains in
the Game setup panel for a later metadata/source migration. Title text,
subtitle text, game description, feature bullets or callouts, system
requirements, install notes, custom note, disc number, backup date, App ID,
developer/publisher text, and other non-legal text rows remain in their current
legacy Text or setup owners until their own role migration passes.

For the Back/Tray text role migration, coverage is intentionally Back/Tray-only
because the current default case insert model exposes these rows only on the
tray card. This pass moves `tray-description` into Game Description Text,
`tray-feature-bullets` into Feature Bullets / Callouts, and
`tray-minimum-requirements` plus `tray-recommended-requirements` into System
Requirements. Disc Label, Case Front/Cover, and Spine do not currently have
equivalent description, feature-list, or system-requirements controls to move.
The remaining tray text rows, including title, subtitle, disc number, backup
date, Steam App ID, developer/publisher text, install notes, and custom note,
stay in the legacy Tray Card Text panel until later text-role migrations.

For the Back/Tray Screenshots migration, coverage is intentionally
Back/Tray-only because the current role exists only on the tray card. The
Screenshots role maps to the existing `caseInsert.templates.tray.artworkSlots`
array and `caseInsert.templates.tray.additionalArtworkEnabled` flag. No new
`screenshotSlots` schema, persisted pane, renderer, export layer, or save/load
path is introduced. Disc Label, Case Front/Cover, and Spine may use local Steam
screenshots as generic image sources, but their non-screenshot artwork slot
controls remain in their existing homes for this pass.

For the case-side Background Image migration, coverage means the existing
Case Front/Cover `background`, Case Back/Tray `background`, and Spine
left/right `background` image-slot controls. Disc Label Background Image was
already migrated. This pass only moves the existing sidebar controls into the
role panels; it does not add a schema field, persisted spine pane, renderer,
export path, or layout rule. Cover/Spine Additional Artwork / `artworkSlots`
controls are handled by the later Additional Artwork migration below.

The user-facing role name is Background Image. Existing implementation IDs,
schema fields, and state keys may still use `background`, `background-artwork`,
`spine-background-artwork`, or artwork terminology for compatibility. Renaming
those internals is out of scope for this terminology cleanup and would be a
separate schema or routing decision only if later proven necessary.

For the Case Front/Cover and Spine Additional Artwork migration, coverage means
the existing Case Front/Cover `additionalArtworkEnabled` plus `artworkSlots`
controls, and the existing Spine left/right `additionalArtworkEnabled` plus
`artworkSlots` controls. This pass only moves those sidebar controls into the
Additional Artwork role panels. Back/Tray Additional Artwork remains
intentionally absent because the existing tray `artworkSlots` controls are
owned by the Screenshots role. This is UI organization only, not a schema,
renderer, export, save/load, or persisted-surface change.

For the Additional Text migration, coverage means Disc Label, Case Front/Cover,
Case Back/Tray, and Spine. This pass moves only existing visual text controls
for subtitle, disc number, backup date, Steam App ID, developer text, publisher
text, install notes, and custom note into Additional Text role panels. Disc
number badge/artwork mode moves with the disc number text control because it is
rendered inside the existing `DiscTextControl` and shares its value and
placement. Plain title text remains in legacy Text until a separate title-text
migration, Legal Info remains separate, Back/Tray description/features/system
requirements remain in their dedicated role panels, and GamePanel metadata
source fields plus metadata assistance remain in Game. This is UI organization
only, not a schema, renderer, export, save/load, text-editor behavior, or
persisted-surface change.

## Behavior Preservation

#271 should preserve:

- the blank-project path;
- current disc editor controls and current panel ownership;
- current case insert cover/tray/spine controls and current ownership;
- save/load project shape and restore behavior;
- PNG export behavior;
- preview/render/export layer paths;
- drag, slider/manual positioning, upload/custom image, reset/clear, and disabled-state preservation behavior;
- contextual text ribbon ownership in `PreviewHeader`, activated by `DiscPreview` and `CaseInsertPreview`.

The shell can make active editor/surface state visually clearer, but it should not hide the current disc editor behind incomplete case tooling or make a user pass through a new checklist to use the existing editor.

## Explicit Non-Goals

- Do not move disc controls into role sections.
- Do not implement layout presets.
- Do not add object-role schema or state.
- Do not change save/load schema.
- Do not change preview, render, or export paths.
- Do not reorganize case front, case back, or spine controls beyond safe shell representation.
- Do not place role-section panels inside a single wrapper box.
- Do not add one-off role-panel CSS or custom wrapper markup that mimics sidebar panels.
- Do not render all role panels through a shared grouped role-panel component; use only an individual role panel wrapper around the existing sidebar `EditorPanel` pattern if a wrapper is useful.
- Do not alter contextual ribbon ownership.
- Do not introduce a full arbitrary layer manager.
- Do not show Disc Label, Front, Back, and Spine as one flat in-editor peer button group.

## Follow-Up Boundaries

- #272 owns reorganizing mature disc editor controls into packaging role sections.
- #273 owns reusable role-section control primitives once real duplication and usage are proven.
- #274 owns applying the role hierarchy to case front, case back, and spine panels.
- #269 owns the role-based preset data model and application contract.
- #270 owns starter disc layout presets.
- #267 remains the broader taxonomy/object-role design source, especially for anything that would become saved state.
- #268 remains the parent UI hierarchy direction.

## Test Plan

If #271 only creates this design note, no source tests are required.

For the eventual implementation, add focused tests that prove the shell is an adapter:

- A pure model test for the workspace list, case-insert surface list, and user-facing labels.
- A pure model test for route mapping: Front to `cover`, Back to `tray`, and Spine to `tray` plus shell-local surface state.
- A test that role-section labels are present per surface but do not require migrated controls.
- A source-level guard that role-section placeholders render through the same top-level sidebar panel component path instead of a single wrapper box, button list, fake tabs, role-button grid, one-off styled lookalike, or shared grouped role-panel renderer.
- A source-level guard that the app workspace route model remains `home | disc | caseInsert`.
- A regression test or source contract that existing disc panels remain reachable until #272.
- Any new test files must be added to `scripts/test-file-list.mjs`.

Avoid broad App integration tests unless the wiring cannot be tested through a smaller model or component boundary.

## Validation Plan

For this docs-only note, no source validation is required unless docs tooling is added later.

For the eventual source implementation:

- Run `npm run test` for the added model/component tests.
- Run `npm run check:cycles` if new modules are added or imports are moved.
- Run `npm run lint`.
- Run `npm run build`.
- Ask for native Tauri runtime verification before claiming user-visible acceptance. The smoke should launch `npm run tauri dev` from the primary checkout and verify surface switching, minimum-size behavior, and reachability of existing disc and case controls.

Browser-only diagnostics can help during triage, but they cannot establish native visual acceptance for this user-facing navigation change.
