# Text Editor Smoke Automation
> Status: Conditional automation guide.
> Purpose: Native Tauri text-editor smoke pilot plus diagnostic-only browser automation notes.
> Read when: Before Any App/native smoke, browser diagnostics, or text-editor smoke/capture script updates.
> Authoritative source: This document for automation process; TEXT_EDITOR_CONTRACT.md for behavior.
> Last reviewed against commit: `f1dd4b9280b90d8b125e1ce1f404ad29c231c1f3`.


This guide documents the required native Tauri smoke route and the remaining
browser-only diagnostic routes for contextual text-editor work. Read it before
using Any App / Computer Use, browser automation, or smoke/capture scripts
against the preview editor.

## Runtime Source Of Truth

User-visible runtime smoke targets the native Tauri application window opened
from the primary checkout:

```powershell
cd "$env:USERPROFILE\steam-backup-label-studio"
npm run tauri dev
```

The visible native Tauri window is the source of truth. A standalone Vite page,
Brave, Chrome, Edge, Playwright against localhost, or any other browser window
cannot approve or reject user-visible UI behavior.

Important distinction:

- `npm run tauri dev` may start Vite internally as a development dependency.
- Smoke must interact with the native Tauri window, not the localhost page.
- Identify the app by the process spawned from this checkout or by the exact
  executable path, never only by the window title.
- Explicitly reject browser processes whose tab title contains the app name.
- If Any App / Computer Use cannot operate the native Tauri window, report the
  native smoke as blocked instead of falling back to browser diagnostics.

## Command

Run:

```powershell
npm run smoke:text-editor
```

The command runs `scripts/native-tauri-smoke-required.mjs`. It intentionally
prints the native-smoke instructions and exits nonzero because Any App /
Computer Use is a Codex runtime capability, not a repository-owned npm
automation API.

Do not wire `npm run smoke:text-editor` to Playwright, Vite, Brave, Chrome, or
Edge. Required runtime smoke is the Any App route against the Tauri window
opened by `npm run tauri dev`.

## Native Any App Pilot

Use this pilot when the user has explicitly authorized Codex to perform native
runtime smoke.

1. Start the runtime from the primary checkout:

   ```powershell
   cd "$env:USERPROFILE\steam-backup-label-studio"
   npm run tauri dev
   ```

2. Record:
   - branch
   - HEAD SHA
   - command used
   - native app PID
   - exact executable path
   - outer window dimensions
   - measured client dimensions when available

3. Identify the native app by one of these sources:
   - the process tree spawned by the `npm run tauri dev` command from this repo
   - the exact Tauri executable path under this checkout

4. Reject window matches from:
   - Brave
   - Chrome
   - Edge
   - Firefox
   - any other browser process

   A browser tab title containing `Steam Backup Label Studio` is not evidence
   that the native app was selected.

5. Bring the Tauri window to the foreground and ensure no Codex, terminal,
   browser, or other window covers the tested area before screenshots.

6. Use Any App / Computer Use for interactions and screenshots. Use one native
   session and at most one retry after a tool or bridge failure. If the retry
   fails, stop and report `Tauri Any App blocked` with the exact bridge/tooling
   error.

7. Label results explicitly as one of:
   - `Tauri Any App verified`
   - `Tauri Any App blocked`
   - `manual verification required`

### Window Size Procedure

Required client/content areas:

- `900x650`
- `1000x720`
- `1920x1009`

When exact client sizing cannot be automated reliably:

- use the closest verified native size
- record actual outer and client dimensions
- do not claim that the requested size was tested
- leave exact-size approval for manual verification

Do not assume outer window dimensions equal client dimensions.

### Screenshot Procedure

- Capture the native Tauri window, not a browser frontend.
- Prefer screenshots from the exact app PID/process path.
- Never match a window solely by the title `Steam Backup Label Studio`.
- Record whether screenshots are native Tauri Any App screenshots or manual
  verification screenshots.

### Verified Native Routes

Keep this section current when a native pilot route succeeds.

- Disc editor: Any App successfully targeted the exact Tauri process-backed
  window
  `process:C:\Users\John Paul Keller\steam-backup-label-studio\src-tauri\target\debug\app.exe`
  and captured the native disc editor window. Browser windows were explicitly
  excluded even when Brave exposed a matching tab title.
- Case insert editor: still requires a current native Any App pilot.
- Ribbon tab checks: native screenshot capture succeeded for the active disc
  editor ribbon state; full tab-by-tab native checks still require manual or
  future Any App pilot coverage.
- Window-size checks: current Any App route recorded native outer screenshot
  dimensions. Exact `window.innerWidth` / `window.innerHeight` client sizing was
  not available through the native bridge and remains manual verification unless
  a reliable route is documented later.

### Known Any App Bridge Failures

- If Any App captures Brave/Chrome/Edge because a browser tab title contains
  the app name, refine the target to the exact Tauri process path and retry
  once.
- If Any App cannot determine the current browser URL after a browser window
  was accidentally targeted, stop browser targeting and retry once against the
  exact Tauri process path only.
- If the retry still fails, report the native bridge blocker. Do not switch to
  Vite/Playwright as a fallback.

### Manual-Only Native Dialog Checks

Native Save/Open/Export destination dialogs may remain manual if Any App cannot
operate them reliably. Document them as manual checks. Do not substitute browser
behavior for native dialogs.

## Browser Diagnostics

Browser diagnostics are still useful for DOM assertions, selector checks, and
fast regression triage. They are not runtime acceptance.

Run:

```powershell
npm run diagnose:text-editor:browser
```

The command runs `scripts/text-editor-smoke.mjs` and prints:

```text
Browser diagnostic only; not Tauri visual verification.
```

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

## Diagnostic Ribbon Capture

Run:

```powershell
npm run capture:ribbon:browser
```

The command runs `scripts/capture-ribbon.mjs`. It is browser diagnostic
evidence only, not Tauri visual verification. It prints:

```text
Browser diagnostic only; not Tauri visual verification.
```

Default runtime behavior:

- Uses Vite at `http://127.0.0.1:5178/`.
- Reuses that URL if it already serves this app.
- Starts a local Vite process only when the URL is not serving the app.
- Stops only the Vite process it started.
- Uses `RIBBON_CAPTURE_PORT` to override the port.
- Uses `RIBBON_CAPTURE_BROWSER`, `TEXT_EDITOR_SMOKE_BROWSER`, or
  `PLAYWRIGHT_CHROMIUM_EXECUTABLE` when set.
- Otherwise prefers installed Chrome, then Edge, then Playwright Chromium.
- Writes artifacts outside the repo by default:
  `%TEMP%\steam-backup-label-studio-ribbon-capture`.
- Uses `RIBBON_CAPTURE_ARTIFACT_DIR` to override the artifact folder.

The capture route creates deterministic fixture states for:

- Case insert cover title text.
- Straight disc title text.
- Curved disc copyright text.

It captures every contextual ribbon tab for each target:

- `Presets`
- `Text`
- `Artistic`
- `Utilities`
- `HTML`

It captures the required client/content areas:

- `900x650`
- `1000x720`
- `1920x1009`

Each screenshot is a full browser viewport capture. The command intentionally
does not use ribbon crops for acceptance evidence.

Generated artifacts:

- `ribbon-capture-browser-<surface>-<size>-<tab>.png`
- `ribbon-capture-manifest.json`
- `ribbon-capture-contact-sheet.html`

Each manifest entry records:

- Git branch and commit SHA.
- Capture method, currently `browser` for repository-owned captures.
- Requested and actual `window.innerWidth` / `window.innerHeight`.
- `window.outerWidth` / `window.outerHeight` where Chromium exposes them.
- `devicePixelRatio`.
- Screenshot pixel dimensions.
- Editor module, selected text target, and active ribbon tab.
- Timestamp.
- PNG validation results and DOM validation results.

Self-validation fails the command when:

- Requested and actual client dimensions differ.
- The PNG cannot be decoded.
- The screenshot is fully transparent, nearly all black, or visually empty.
- A full-window capture does not match the actual client size.
- The app root, contextual ribbon, preview viewport, or preview surface is
  absent.
- Visible ribbon controls overlap.
- The ribbon, preview surface, or preview viewport lies outside the captured
  client area.

Browser captures must stay labeled as browser captures. They are useful for
layout evidence and regression triage, but they are not native Tauri visual
approval. Do not cite them as approval for PR #263 or any user-visible ribbon
layout.

## Diagnostic Browser Startup State

The browser diagnostic harness starts from a fresh web app load, not a native
Tauri window.
It creates deterministic blank projects through the app's own home-screen entry
points:

- `home-new-case-insert`
- `home-new-disc`

It does not open project files, invoke native save/load dialogs, choose PNG
destinations, use Tauri APIs, or establish runtime visual acceptance.

## Stable Selectors

The harness uses `data-smoke-id` hooks. These hooks are intentionally inert and
must not carry product behavior.

Primary entry selectors:

- `home-new-case-insert`
- `home-new-disc`
- `case-insert-editor`
- `case-insert-sidebar`
- `preview-viewport`
- `preview-viewport-stage`
- `preview-viewport-controls`
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
- `inline-text-tab-html`
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

## Browser-Diagnostic Covered Workflows

The browser diagnostic command checks:

- Shared preview viewport source/model coverage verifies Fit, zoom in/out,
  four-direction panning, compact adaptive right-edge rail placement, surface
  breathing room, removal of legacy preview caps that create artificial side
  gutters, and transformed overlay/drag math. The approved rail has no visible
  100%/percentage control and grows continuously from 48px to 96px wide only
  when the larger size can be absorbed by residual unused gutter without
  reducing fitted preview scale or moving the fitted design surface. The rail
  normally collapses to a slim right-edge hover/focus handle and opens the full
  controls on hover or keyboard focus; this presentation must not resize, refit,
  or move the preview stage. Browser smoke should reuse
  `preview-viewport`, `preview-viewport-stage`, and
  `preview-viewport-controls` if deterministic zoom/pan routes are added.
- Cover inline editor opens from preview text.
- Space key creates visible spaces while editing and after Done.
- Ctrl+A selects all visible cover text.
- LMB drag creates a non-collapsed visible cover selection.
- Selected-range Bold, Italic, Underline, and Color update canonical HTML.
- The contextual case-insert `Font size (pt)` control supports uninterrupted
  typing, a temporary empty draft, Enter commit, repeated preset popup opens,
  wheel stepping, Arrow Up repeat, and press-and-hold stepper repeat.
- The shared contextual ribbon shell is screenshot-checked at representative
  wide, compact, and narrow widths for ordinary text controls and the dedicated
  HTML source tab. The check verifies tab reflow, visible actions, usable hit
  targets, and no overlapping child controls. The harness also saves
  tab-by-tab browser diagnostic ribbon screenshots for case cover text,
  straight disc text, and curved disc copyright text at the required client
  areas `1000x720`, `900x650`, and `1920x1009`. These screenshots are
  diagnostic-only and do not approve the native Tauri layout.
- The ribbon DOM is expected to use native ribbon rows/groups/buttons. It must
  not mount old portal-slot full-menu content or
  `.inline-preview-text-control-grid` presentation inside the app-shell ribbon.
  The visible tab labels are checked as single-line `Presets`, `Text`,
  `Artistic`, `Utilities`, and `HTML`.
- The attached preview-header ribbon layout is checked at client/content
  areas of 1000x720, 900x650, and 1920x1009. The check verifies the Live Preview
  label column boundary, flush use of the preview app-shell top-right corner,
  compact reserved header height, preview fit, preview stability across
  activation, and active-ribbon toast offset below the measured header/ribbon
  bottom.
- Selected-range case-insert `Font size (pt)` applies canonical
  `font-size:Npt` HTML only to the highlighted characters.
- Bulleted List converts selected multiline text to canonical `<ul><li>`.
- Enter inside a bullet creates the next bullet item.
- Shift+Enter inside a bullet creates a soft break.
- HTML source editing uses the dedicated `HTML` ribbon tab and updates the cover
  preview live.
- Done and reopen preserve canonical HTML source.
- Cover case text activates the stable app-shell ribbon instead of the old
  floating full tabs/menu, and the ribbon remains stable when selected text
  moves or Wrap width is edited.
- Narrow contextual ribbon overflow exposes controls at whole group boundaries:
  hidden clipped fragments must not leave tiny unusable slivers, and focusing
  or editing `inline-text-number-wrap-width` must scroll the full Wrap width
  group into view while Done/Delete remain accessible.
- The local contextual Move handle begins dragging on the first pointer movement
  without waiting for long-hold activation, keeps the handle in a grabbing
  state while active, and does not move text on a simple click with no movement.
- The committed Move-handle drag route covers cover and straight disc text in
  the browser diagnostic harness; tray and both spines are checked for ribbon
  activation and local preview affordance availability.
- The committed selection-edge drag route covers cover, tray, left spine, right
  spine, straight disc, and curved copyright text. It verifies that edge/corner
  strips move text immediately while interior drags on cover, tray, both
  rotated spines, straight disc, and curved copyright text still create text
  selections instead of moving the object.
- Top-edge, bottom-edge, and oversized cover text keep controls accessible in
  the stable ribbon; no preview-anchored full menu is expected.
- Tray, left spine, and right spine open inline editors through the ribbon.
- Left and right rotated spine text support forward and reverse LMB drag
  selection along the visible rotated text direction, and interior drags must
  anchor at the pointer instead of jumping to a text-box edge.
- Tray title text is screenshot-checked at 6pt, default size, and 72pt so
  visible paint does not touch the left or right element edges.
- Straight disc text opens inline editing while the SVG image renderer remains visible.
- Curved disc copyright text opens the contextual shell without mounting a
  rectangular canvas textarea, hides unsupported placeholder controls, and keeps
  path-aware caret/selection overlays tied to the rendered SVG/textPath text.
- Straight disc `Font size (pt)` uses the shared point-size combobox and keeps
  the SVG preview/export font-size model in sync.
- Straight and curved disc text activate the stable app-shell ribbon instead of
  the removed floating full tabs/menu, center dock, or side dock. The smoke harness
  checks that tabs/menu are mounted in the ribbon, the Move handle remains a
  local preview affordance, and the ribbon remains stable while straight text
  moves or curved copyright point size/arc/inset/line-spacing controls change.
- Straight and curved disc HTML source use the dedicated `HTML` ribbon tab and
  update the SVG renderer before Done.
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
- Curved copyright ribbon stability includes a Warframe/App ID 230410-style
  legal text fixture at 15.02pt and samples multiple animation frames while
  editing and committing that point size. The route fails if the ribbon moves or
  resizes while text geometry changes.

## Browser-Diagnostic Expected Outcomes

A passing browser-diagnostic run prints one `PASS` line for each workflow and
exits with code `0`. This does not establish native visual acceptance.

A failing run:

- Prints a `FAIL` line with the failed workflow.
- Saves a screenshot for that failed workflow.
- Exits with code `1`.

Treat a browser-diagnostic failure as a triage signal. It may be:

- a product regression,
- a selector contract change,
- a fixture setup change,
- a missing local browser,
- or a runtime startup problem.

Do not report a smoke automation failure as an app regression until the failure
has supporting evidence from the screenshot, DOM state, or a manual/runtime
reproduction.

## Browser-Diagnostic Limitations

The browser diagnostic command does not automate:

- Tauri desktop windows.
- Native Save/Open dialogs.
- PNG destination dialogs.
- Full save/load persistence.
- Full PNG export parity.
- Native OS font installation differences.
- Native pointer behavior differences in the Tauri desktop window.

For menu anchoring, the committed harness covers both the contextual editor's
Y control and a deterministic Move-handle drag route.

## Native Follow-Ups

Use native Tauri Any App or manual runtime checks for:

- Move-handle and selection-edge dragging on cover, tray, spines, straight
  disc, and curved disc text in the Tauri desktop window.
- Save/load using native file dialogs.
- PNG export output inspection.
- Desktop window focus, native shortcuts, and platform-specific behavior.
- Any bug that only appears in `npm run tauri dev`.

## Updating Browser Diagnostics

When a new browser diagnostic workflow succeeds and is useful beyond one
investigation:

1. Add or reuse stable `data-smoke-id` selectors.
2. Encode the workflow in `scripts/text-editor-smoke.mjs`.
3. Document the entry path, fixture state, assertions, and limitations here.
4. Run `npm run diagnose:text-editor:browser`.
5. Include the result in the final validation report.

For ad-hoc browser automation that is not yet encoded, use one browser session
and at most one retry for a failed action. If selectors or browser tools keep
failing, stop and report the automation failure instead of continuing to poke at
the DOM.
