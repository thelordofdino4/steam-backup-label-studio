# Manual Smoke Checklists

Last refreshed: 2026-06-06.

These checklists are for human verification after visual/editor changes. They
do not replace `npm run check:cycles`, lint, tests, or build, and agents should
not run `npm run tauri dev` unless the user explicitly asks.

Use the checklists that match the changed surface. Record the commit SHA, dirty
state, command set, tester, date, and any skipped sections in run notes.

## Preparation

1. Confirm the checkout being tested:
   - `git status --short`
   - `git branch --show-current`
   - `git rev-parse HEAD`
   - `git fetch origin`
   - `git rev-parse origin/main`
2. Check for stale Vite, Tauri, or other dev-server processes tied to this
   repository before judging runtime behavior.
3. Run the required non-interactive validation for the change scope.
4. Launch the app manually only for the runtime pass:

```powershell
npm run tauri dev
```

## Editor Shell

- Main menu opens and the Blank Disc/New Disc path enters the disc editor.
- New Case Insert enters the case insert editor without hiding or damaging the
  disc editor path.
- The disc sidebar order remains Project File -> Export Options -> Game ->
  Template -> Artwork -> Branding -> Text -> Guide Legend.
- Panels open and close independently, and panel toggle icons match state.
- Preview pane remains visible on desktop-sized windows and stacks cleanly on
  narrow windows.
- Status toasts appear in the preview pane, stack without blocking editing, and
  clear after normal interactions.
- New Project/New Disc reset paths keep default geometry, default metadata,
  disabled optional features, and project status messages sane.

## Artwork Flow

- Steam search and import still populate title, metadata, artwork candidates,
  screenshots, and title/logo candidates where available.
- Imported Steam artwork selection updates the disc background and preserves
  scale/offset controls.
- Local upload sets the disc background, shows image status, supports drag,
  scale, fit/reset controls, and persists through save/load.
- Local Steam screenshots and web artwork candidates, when available, can be
  selected without changing unrelated metadata.
- Background artwork show/enable hides the rendered background when disabled and
  restores the prior image/layout when re-enabled.
- Game title/logo artwork supports Steam default, custom upload, drag, scale,
  reset/clear, preview, export, and save/load.
- Additional artwork supports add/delete, local/Steam/local-screenshot sources,
  labels, frames where available, drag, scale, reset/clear, preview, export,
  disabled-state preservation, and save/load.

## Branding Flow

- Steam Backup banner supports top, bottom, and hidden placement, and hidden
  placement does not export the banner.
- Banner color controls, lockup image, text fallback, scale/offset, reset, and
  save/load behavior still work.
- Developer, publisher, and additional logos support upload/candidate sources,
  alignment presets, drag, scale, reset/clear/delete, preview, export, and
  save/load.
- Rating badge enable/disable, board/value controls, generic/custom artwork,
  supplemental USK behavior, layout presets, drag/scale, preview/export, and
  save/load still match.
- Media marks, operating-system marks, and technical marks enable/disable,
  source/style controls, custom images, layout presets, drag/scale, preview,
  export, and save/load independently.
- Disabled optional branding features hide dependent controls, do not render in
  preview or PNG export, and restore prior state when re-enabled.

## Preview And Interaction

- Disc guides, center hole, printable bounds, safe zone, and exported guide
  toggles remain visually coherent.
- Preview layer order matches `docs/DISC_EDITOR_LAYER_ORDER.md`.
- Drag handles or direct dragging work for background, title artwork,
  additional artwork, logos, rating badge, media marks, platform marks,
  technical marks, and straight disc text.
- Slider/manual controls update the same positions seen in direct dragging.
- Safe-zone clamping keeps constrained elements inside the intended disc bounds.
- Disc text metadata-bound placeholders, manual overrides, width controls,
  alignment, style presets, backplates/borders, visual avoidance, and curved
  legal text preview/export behavior still match.
- No text, button label, or panel content overlaps incoherently at normal
  desktop and narrow widths.

## Save Load Export

- Save Project writes a valid `.sbls.json` file for the active editor type.
- Load Project restores disc projects into the disc editor and case insert
  projects into the case insert editor.
- Loaded projects preserve Steam metadata, manual metadata, template choice,
  background artwork, title artwork, additional artwork, branding marks, text,
  export guide settings, and disabled optional feature state.
- Sparse or older fixture projects still normalize without fatal errors.
- Disc export preflight lists output dimensions, guide state, missing/generic
  assets, and enabled-but-unavailable visual warnings accurately.
- Clean disc PNG export omits editor-only guides and preserves the physical
  center-hole cutout.
- Guide-enabled disc PNG export draws selected guide marks last.
- Exported PNG layer order and relative placement match the live preview.
- Case insert export preflight lists output dimensions, guide state, missing
  artwork, generic placeholders, and template-specific warnings accurately.
- Clean case insert PNG export omits editor-only guides, uses a pure white paper
  background when no image is selected, and contains no preview-page chrome.
- Guide-enabled case insert PNG export draws selected trim, safe-zone, and spine
  guides last, with spine guide options shown only for templates that have a
  spine.
- Exported case insert dimensions, layer order, and relative placement match the
  selected print template and live preview.

## Case Insert Flow

- New Case Insert opens the jewel case editor with Cover Sheet and Tray Card
  template options and guide legend information.
- Loading a case insert project routes to the case insert workspace.
- The case project status, Main Menu, New Case Insert, New Disc, Save Project,
  Load Project, and Export PNG buttons remain available.
- Case insert panels preserve the disc editor's nested panel behavior where
  shared Artwork, Branding, Text, and export controls are used.
- Cover Sheet background, title artwork, artwork slots, logo slots, and mark
  slots can be enabled/disabled without losing remembered image/layout state.
- Cover Sheet image slots support uploaded images, Steam artwork, and local Steam
  screenshots through the shared case image-source controls when sources are
  available.
- Cover Sheet image fit, scale, X/Y position, rotation, placement presets,
  reset, and clear controls update the preview.
- Cover Sheet callout text supports enable/disable, value, alignment, scale, X/Y
  position, rotation, and reset behavior.
- Cover Sheet preview shows rectangular trim/safe/guide geometry without using
  disc circular safe-zone rules.
- Tray Card background, description/features, additional artwork, requirements, legal
  text, logos, rating badges, media marks, platform marks, technical marks, and
  Steam Backup branding controls update preview/export and preserve disabled
  state.
- Tray Card templates with spines clearly identify whether a nested control
  affects the cover area or spine area.
- Spine title, spine background, spine Steam Backup branding, spine logo, and
  spine-specific placement controls update only the spine area and remain
  independent of cover-area controls.
- Save/load preserves case insert template choice, shared Steam metadata,
  surface-specific artwork/branding/text settings, export guide settings, and
  disabled optional feature state.
