# Manual Smoke Checklists
> Status: Conditional manual runtime checklist.
> Purpose: Manual checks for visual/editor behaviors that need runtime confidence.
> Read when: Planning or reporting manual/Tauri verification.
> Authoritative source: Feature contracts and SDD for behavior; this file for manual check coverage.
> Last reviewed against commit: `408bd68f2a13998a54e14c72930628993c5cdcfb`.


Last refreshed: 2026-06-16.

These checklists are for native runtime verification after visual/editor
changes. They do not replace `npm run check:cycles`, lint, tests, or build, and
agents should not run `npm run tauri dev` unless the user explicitly asks.
When explicitly authorized, Codex may use Any App / Computer Use against the
native Tauri window opened by `npm run tauri dev`; browser diagnostics do not
count as manual/runtime approval.

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
4. Launch the app for the native runtime pass:

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

### Artwork Frame Material Changes

Use this subsection for artwork-frame material, steel/metal frame, or issue
`#165` restart work. Read `docs/ARTWORK_FRAME_MATERIAL_CONTRACT.md` before
running or reporting these checks.

- Confirm the checkout is the primary checkout and that stale Vite, Tauri,
  native `app.exe`, or built/static `dist/` output is not serving an older
  branch.
- Use the flat frame profile as the baseline material test until raised/profile
  rendering is separately repaired and accepted.
- Verify the selected frame surface visibly changes in the native Tauri preview
  when material settings change; do not rely on generated contact sheets alone.
- Verify PNG export uses the same intended material appearance as the preview
  for the same project state.
- Verify preview/export parity with at least one normal preview size and one
  large displayed preview size when texture resolution or material descriptors
  are touched.
- Move material sliders and menu controls through representative values and
  confirm the sidebar remains usable and responsive.
- Confirm all enabled material controls fit, remain readable, and remain
  reachable in the sidebar at normal desktop width and a narrower window.
- Confirm material geometry does not move when changing light, polish, tarnish,
  brush angle, frame width, preview zoom, preview size, or export size unless
  that movement is an intentional documented feature.
- Confirm disabled or inactive defect/rust/material features do not leave
  shadows, AO, height, dots, strokes, or other ghost artifacts behind.
- Record whether native Tauri preview, PNG export, performance/interaction,
  sidebar fit, and generated diagnostics were each checked. Do not collapse
  those into one "visual test passed" statement.

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
- Preview viewport controls sit on the right edge of the preview workspace,
  vertically centered, with the compact two-column rail layout: zoom in/out,
  full-width `Fit`, full-width up, left/right, and full-width down.
- The rail defaults to 48px wide with 24px buttons and may grow continuously up
  to 96px wide with 48px buttons only when the larger controls fit vertically,
  consume unused horizontal gutter, and do not reduce the fitted preview scale.
  Rail growth must not resize or move the fitted design surface. The rail has
  no scrollbar and exposes the current zoom only through accessible labels or
  tooltips, not visible chrome.
- The actual disc/case design surface keeps only a 4px breathing gap from the
  preview workspace and reserves the right-side control rail width plus that
  same 4px gap; old fixed preview caps must not leave a larger artificial
  gutter beside the nested panel or pan/zoom rail.
- Design Check and Guide Legend buttons sit on the bottom-right edge of the
  preview workspace. The visible design surface stays above the fixed closed
  button rail, and opening either panel must not resize or move the preview
  surface.
- Ctrl+mouse wheel zooms around the cursor, middle-mouse drag pans, and
  Space+left-drag pans without changing saved project coordinates.
- `Fit` returns the surface to the available preview space and clears pan.
  Opening or closing Design Check or Guide Legend must not change the current
  fit, zoom, pan, or surface size.
- Dragging editable objects while zoomed or panned still updates the same
  design coordinates, and hover/selection outlines track the transformed
  preview.
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

## Text Editor Stabilization

Use this section after preview-mounted text editor changes. Record which surface
was checked: cover sheet, tray card, left spine, right spine, straight disc
text, and curved disc text.

- Selecting visible text opens the compact contextual editor near that text.
- Selected text is the positioning anchor for the tabs, editable text, move
  handle, and context menu.
- Tabs appear directly above the selected text.
- Editable text remains on the canvas and is typed into directly from the
  preview.
- The context menu appears below the selected text by default.
- The context menu repositions upward before hitting the bottom of the active
  preview window.
- The context menu clamps inside the active preview window horizontally and
  vertically.
- Contextual editor positioning is relative to the preview window, not the
  page, sidebar, or document body.
- The editor reads as a compact contextual toolbar, not a relocated sidebar
  panel.
- Right spine tabs, menu, editable boundary, and move handle stay inside the
  active preview window.
- The dotted editor boundary hugs the visible text bounds, not the full
  safe-zone or reserved layout width.
- Empty selected text still shows a small visible dotted box.
- Typing `hello hello` shows both words while editing and after clicking Done.
- Long text grows horizontally until the safe-zone boundary, then wraps.
- Multiline text grows vertically after line 2 and beyond.
- Space, multiple spaces, leading spaces, trailing spaces, and pasted multiline
  text remain visible while editing and after Done.
- Entering and exiting edit mode does not swap in a visibly different text
  renderer, change wrapping, shift position, lose styling, or reveal duplicate
  text.
- The blue caret blinks at the actual insertion point and does not follow a
  hidden or duplicate text surface.
- Selecting text reflects the currently visible preview text.
- Ctrl+A selects the visible text in adapter-backed insert and straight-disc
  editing paths.
- LMB-drag selection works on visible text in adapter-backed insert and
  straight-disc editing paths.
- The move handle is separate from text selection and uses grab/grabbing cursor
  behavior.
- Default metadata text can be deleted while editing and does not repopulate
  until the user blurs/exits while it is still empty.
- The dedicated `HTML` ribbon tab exposes HTML source for cover, tray, left
  spine, right spine, straight disc, and curved disc copyright/legal text; it
  does not expose a separate Markdown mode.
- HTML source mode shows canonical sanitized HTML for the current text, and
  leaving source mode updates the final visible renderer.
- Inline HTML color spans render in preview, survive save/load, and appear in
  exported PNG output where that surface supports the style.
- Older projects with plain text or legacy Markdown source fields load safely
  and preserve visible text and supported bold/italic/bullet meaning.
- Straight disc text shows all words, preserves spaces, keeps SVG
  fill/stroke/shadow visible, and does not shift, grow, shrink, or reveal
  duplicate layers while editing.
- Curved disc text stays SVG/textPath based and is not edited through a visible
  rectangular textarea.
- Cover, tray, and spine feature panels remain bundled and recognizable.

## Save Load Export

- Save Project writes a valid `.sbls.json` file for the active editor type.
- Load Project restores disc projects into the disc editor and case insert
  projects into the case insert editor.
- Loaded projects preserve Steam metadata, manual metadata, template choice,
  background artwork, title artwork, additional artwork, branding marks, text,
  export guide settings, and disabled optional feature state.
- Sparse or older fixture projects still normalize without fatal errors.
- Disc export preflight lists output dimensions, guide state, missing assets,
  enabled-but-unavailable visuals, and print-risk warnings accurately. Built-in
  app assets should not warn merely because they are built in.
- Clean disc PNG export omits editor-only guides and preserves the physical
  center-hole cutout.
- Guide-enabled disc PNG export draws selected guide marks last.
- Exported PNG layer order and relative placement match the live preview.
- Case insert export preflight lists output dimensions, guide state, missing
  artwork, template-specific warnings, and print-risk warnings accurately.
  Built-in app assets should not warn merely because they are built in.
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
- Tray Card background, description/features, additional artwork, requirements,
  legal text, logos, rating badges, media marks, platform marks, and technical
  marks update preview/export and preserve disabled state.
- Tray Card templates with spines clearly identify whether a nested control
  affects the cover area or spine area.
- Spine title, spine background, developer/publisher logos, standard branding
  marks, and spine-specific placement controls update only the spine area and
  remain independent of cover-area controls.
- Save/load preserves case insert template choice, shared Steam metadata,
  surface-specific artwork/branding/text settings, export guide settings, and
  disabled optional feature state.

## Shared Ownership / Unification Smoke

Use this after editor unification or shared-control changes. It should be run
in addition to the editor-specific sections above, not instead of them.

- Confirm disc Artwork, Branding, and Text remain direct top-level workflow
  panels.
- Confirm case insert Artwork, Branding, and Text remain nested inside the
  correct Cover Sheet, Tray Card, Left Spine, or Right Spine surface panels.
- Confirm shared panel shells open/close without collapsing unrelated sibling
  panels in either editor.
- Confirm disabling and re-enabling shared optional visuals hides dependent
  controls, omits preview/export rendering while disabled, and restores prior
  source/layout state after re-enable.
- Confirm shared image-source controls can switch between available imported,
  web, local screenshot, built-in/default, and custom upload sources where each
  source is supported.
- Confirm repeated artwork uses "Artwork N" labels when a user adds a new
  element, and does not recreate legacy screenshot defaults unless a structured
  layout feature explicitly does that.
- Confirm shared logo, badge, media, platform, technical, and Steam banner
  controls still use target-specific layout adapters for disc, cover/tray, and
  spine.
- Confirm preview visibility, PNG export visibility, preflight warnings,
  save/load restoration, sliders, and drag still agree for at least one shared
  visual feature in the disc editor and one equivalent shared visual feature in
  the case insert editor.
