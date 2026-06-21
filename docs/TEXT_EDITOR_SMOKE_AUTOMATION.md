# Text Editor Smoke Automation
> Status: Conditional automation guide.
> Purpose: Committed browser smoke route and limits for contextual text-editor automation.
> Read when: Before browser automation against the text editor or smoke harness changes.
> Authoritative source: This document for automation process; TEXT_EDITOR_CONTRACT.md for behavior.
> Last reviewed against commit: `f1dd4b9280b90d8b125e1ce1f404ad29c231c1f3`.


This guide documents the committed browser smoke path for the contextual text
editor. Read it before using browser automation against the preview editor.

## Command

Run:

```powershell
npm run smoke:text-editor
```

The command runs `scripts/text-editor-smoke.mjs`.

Default runtime behavior:

- Uses Vite at `http://127.0.0.1:5177/`.
- Reuses that URL if it already serves this app.
- Starts a local Vite process only when the URL is not serving the app.
- Stops only the Vite process it started.
- Uses `TEXT_EDITOR_SMOKE_PORT` to override the port.
- Uses `TEXT_EDITOR_SMOKE_BROWSER` or `PLAYWRIGHT_CHROMIUM_EXECUTABLE` when set.
- Otherwise prefers installed Chrome, then Edge, then Playwright Chromium.
- Writes failure screenshots outside the repo by default:
  `%TEMP%\steam-backup-label-studio-text-editor-smoke`.
- Uses `TEXT_EDITOR_SMOKE_ARTIFACT_DIR` to override the failure screenshot folder.

Last verified source baseline when this guide was introduced:
`563f0fde238bdbad100125ef61d3c9c607729460`.

## Startup State

The smoke harness starts from a fresh web app load, not a native Tauri window.
It creates deterministic blank projects through the app's own home-screen entry
points:

- `home-new-case-insert`
- `home-new-disc`

It does not open project files, invoke native save/load dialogs, choose PNG
destinations, or use Tauri APIs.

## Stable Selectors

The harness uses `data-smoke-id` hooks. These hooks are intentionally inert and
must not carry product behavior.

Primary entry selectors:

- `home-new-case-insert`
- `home-new-disc`
- `case-insert-editor`
- `case-insert-sidebar`
- `case-template-pane-select`
- `case-preview-cover`
- `case-preview-tray`
- `disc-preview`

Case text target selectors:

- `case-sidebar-text-block-{paneId}-{textBlockId}`
- `case-sidebar-edit-text-block-{paneId}-{textBlockId}`
- `case-sidebar-text-list-{paneId}-{textListId}`
- `case-sidebar-edit-text-list-{paneId}-{textListId}`
- `case-text-block-{paneId}-{textBlockId}`
- `case-text-list-{paneId}-{textListId}`
- `case-sidebar-spine-title-{left|right}`
- `case-sidebar-edit-spine-title-{left|right}`
- `case-spine-title-{left|right}`
- `case-spine-mirror-toggle`

Disc text selectors:

- `disc-sidebar-text-{discTextKey}`
- `disc-sidebar-mode-{discTextKey}`
- `disc-text-layer-image`
- `disc-text-layer-hit-target`
- `disc-inline-text-{discTextKey}`

Inline editor selectors:

- `inline-text-tabs`
- `inline-text-tab-presets`
- `inline-text-tab-text`
- `inline-text-tab-art`
- `inline-text-tab-utilities`
- `inline-text-menu`
- `inline-text-move-handle`
- `inline-text-input`
- `inline-text-done`
- `inline-text-delete`
- `inline-text-html-source`
- `inline-text-toggle-bold`
- `inline-text-toggle-italic`
- `inline-text-toggle-underline`
- `inline-text-toggle-bulleted-list`
- `inline-text-color-color`
- `inline-text-checkbox-html-source`
- `inline-text-number-x`
- `inline-text-number-y`
- `inline-text-number-font-size-pt`
- `inline-text-number-options-font-size-pt`
- `inline-text-number-options-list-font-size-pt`
- `inline-text-number-option-font-size-pt-{pointSize}`
- `inline-text-number-step-up-font-size-pt`
- `inline-text-number-step-down-font-size-pt`

## Fixture Setup

The case fixture is created from `New Case Insert`.

The harness enables and edits:

- Cover `cover-title-text`
- Tray `tray-title-text`
- Left spine title
- Right spine title

The disc fixture is created from `New Disc`.

The harness enables and edits:

- Straight disc `title`
- Curved disc `copyright`

Curved copyright is explicitly set to `curved` mode through the existing sidebar
mode selector before opening its contextual shell and asserting SVG/textPath
behavior.

## Covered Workflows

The committed smoke command verifies:

- Cover inline editor opens from preview text.
- Space key creates visible spaces while editing and after Done.
- Ctrl+A selects all visible cover text.
- LMB drag creates a non-collapsed visible cover selection.
- Selected-range Bold, Italic, Underline, and Color update canonical HTML.
- The contextual case-insert `Font size (pt)` control supports uninterrupted
  typing, a temporary empty draft, Enter commit, repeated preset popup opens,
  wheel stepping, Arrow Up repeat, and press-and-hold stepper repeat.
- The shared contextual ribbon shell is screenshot-checked at representative
  wide, compact, and narrow widths for ordinary text controls and the Utilities
  HTML source panel. The check verifies tab reflow, visible actions, usable hit
  targets, and no overlapping child controls. Floating-shell scroll checks still
  apply to non-ribbon surfaces.
- Selected-range case-insert `Font size (pt)` applies canonical
  `font-size:Npt` HTML only to the highlighted characters.
- Bulleted List converts selected multiline text to canonical `<ul><li>`.
- Enter inside a bullet creates the next bullet item.
- Shift+Enter inside a bullet creates a soft break.
- HTML source editing updates the cover preview live.
- Done and reopen preserve canonical HTML source.
- Cover case text activates the stable app-shell ribbon instead of the old
  floating full tabs/menu, and the ribbon remains stable when selected text
  moves or Wrap width is edited.
- The local contextual Move handle begins dragging on the first pointer movement
  without waiting for long-hold activation, keeps the handle in a grabbing
  state while active, and does not move text on a simple click with no movement.
- The committed Move-handle drag route covers cover and straight disc text in
  the browser smoke harness; tray and both spines are checked for ribbon
  activation and local preview affordance availability.
- Top-edge, bottom-edge, and oversized cover text keep controls accessible in
  the stable ribbon instead of invoking old case floating-menu placement.
- Tray, left spine, and right spine open inline editors through the ribbon.
- Left and right rotated spine text support forward and reverse LMB drag
  selection along the visible rotated text direction, and interior drags must
  anchor at the pointer instead of jumping to a text-box edge.
- Tray title text is screenshot-checked at 6pt, default size, and 72pt so
  visible paint does not touch the left or right element edges.
- Straight disc text opens inline editing while the SVG image renderer remains visible.
- Curved disc copyright text opens the contextual shell without mounting a
  rectangular canvas textarea, hides unsupported placeholder controls, keeps the
  renderer-derived selection host inside the preview without arc-window sizing,
  and checks that tabs and menu do not meaningfully overlap the curved text for
  both top and bottom arc placement.
- Straight disc `Font size (pt)` uses the shared point-size combobox and keeps
  the SVG preview/export font-size model in sync.
- Straight disc text that occupies the central workspace uses a stable side dock
  instead of treating the center hole as a preview-consuming obstacle or entering
  emergency detached placement.
- Outer-ring straight and curved disc text use deterministic compact
  center-docked contextual controls by default; the dock keeps tabs, menu, and
  Move available inside the central disc workspace with menu scrolling instead
  of extending over the text. Straight text remains fixed through point-size and
  tab changes. Curved copyright checks rendered SVG text/underline paint
  rectangles instead of the broad editor host box, and the center dock remains
  fixed through arc side, arc span, inset, and line-spacing edits.
- Straight disc HTML source updates the SVG renderer before Done.
- Straight disc selected-range color uses the native color input `input` and
  `change` paths, updates only the highlighted range, and writes canonical
  `<span style="color:...">` HTML.
- Curved copyright opens the contextual shell from the rendered SVG/textPath
  text, accepts direct keyboard editing through the hidden input adapter,
  updates the SVG/textPath preview live, supports LMB drag selection and Ctrl+A,
  renders path-aware curved caret and selection overlays instead of rectangular
  editor bands, does not expose a contextual menu Text Value field, and does not
  mount a rectangular on-canvas textarea.
- Curved caret mutation parity is checked by clicking a measured SVG character
  boundary and verifying Backspace removes the character before the visible
  caret while Delete removes the character after it.
- Curved rendered-boundary parity is checked against the main visible SVG
  textPath, including multiple character boundaries and a larger 72pt text case
  farther along the arc, so hit-testing, caret placement, and keyboard mutation
  use the same rendered glyph boundary model.
- Curved selection visual boundaries are checked by dragging exact rendered
  insertion boundaries for single-character, whole-word, forward/reverse,
  top/bottom arc, 6pt, default, and 72pt cases. The selection overlay must use
  butt-capped arc paths whose endpoints match the selected boundaries instead
  of round caps that visually include neighboring characters.
- Curved copyright placement includes a Warframe/App ID 230410-style legal text
  fixture at 15.02pt and samples multiple animation frames while editing and
  committing that point size. The route fails if placement mode, responsive
  mode, menu width, or menu height oscillates.

## Expected Outcomes

A passing run prints one `PASS` line for each workflow and exits with code `0`.

A failing run:

- Prints a `FAIL` line with the failed workflow.
- Saves a screenshot for that failed workflow.
- Exits with code `1`.

Treat a failure as a triage signal. It may be:

- a product regression,
- a selector contract change,
- a fixture setup change,
- a missing local browser,
- or a runtime startup problem.

Do not report a smoke automation failure as an app regression until the failure
has supporting evidence from the screenshot, DOM state, or a manual/runtime
reproduction.

## Limitations

The smoke command does not automate:

- Tauri desktop windows.
- Native Save/Open dialogs.
- PNG destination dialogs.
- Full save/load persistence.
- Full PNG export parity.
- Native OS font installation differences.
- Native pointer behavior differences in the Tauri desktop window.

For menu anchoring, the committed harness covers both the contextual editor's
Y control and a deterministic Move-handle drag route.

## Manual Follow-Ups

Use Tauri/manual runtime checks for:

- Move-handle dragging on cover, tray, spines, and straight disc text in the
  Tauri desktop window, including normal and emergency contextual placements.
- Save/load using native file dialogs.
- PNG export output inspection.
- Desktop window focus, native shortcuts, and platform-specific behavior.
- Any bug that only appears in `npm run tauri dev`.

## Updating This Pilot

When a new browser workflow succeeds and is useful beyond one investigation:

1. Add or reuse stable `data-smoke-id` selectors.
2. Encode the workflow in `scripts/text-editor-smoke.mjs`.
3. Document the entry path, fixture state, assertions, and limitations here.
4. Run `npm run smoke:text-editor`.
5. Include the result in the final validation report.

For ad-hoc browser automation that is not yet encoded, use one browser session
and at most one retry for a failed action. If selectors or browser tools keep
failing, stop and report the automation failure instead of continuing to poke at
the DOM.
