# Text Editor Contract
> Status: Authoritative text-editor subsystem contract.
> Purpose: Expected text editor behavior, renderer ownership, parity, and regression gates.
> Read when: Text-editor behavior, formatting, selection, source editing, contextual controls, or smoke work.
> Authoritative source: This document for text-editor behavior; SDD for global architecture.
> Last reviewed against commit: `8393cb9a8d89f56e80af62df01cc32fb0a63015a`.


Last refreshed: 2026-06-21.

This contract freezes the expected behavior of the preview-mounted text editor
before more text editor feature work continues. It exists because recent text
editor changes repeatedly regressed spaces, caret placement, wrapping,
preview/final parity, disc text rendering, and case insert panel structure.

Issue context: #184 is the feature umbrella for the redesigned add/select text
workflow. This document is the stabilization gate for that work. New text
editor features should not start until the current behavior is observable,
tested, and the remaining divergences are recorded.

## Core UX Contract

- The Text panel is an add/select entry point, not the primary editing surface.
- Selecting editable text in the preview activates the stable contextual text
  ribbon in the app shell.
- The contextual ribbon occupies a reserved top-right app-shell region above
  the preview. The Live Preview heading remains on the left side of that header
  area.
- The preview header has two regions: a bounded Live Preview label column on
  the left and a contextual ribbon column on the right.
- The ribbon is attached to the top-right edge of the preview workspace. It is
  not a detached floating card, and its left edge must not cross into the Live
  Preview label column.
- The ribbon may use the full available right-hand header column. Preview
  padding must not create dead blank space above or to the right of the ribbon.
- The preview begins below the complete header/ribbon region and must never
  encroach into, underlap, or be clipped by the reserved ribbon slot.
- The reserved slot remains present when no text target is active, but the
  ribbon contents disappear.
- Row 1 of the ribbon contains the five contextual tabs with compact
  single-line labels: `Presets`, `Text`, `Artistic`, `Utilities`, and `HTML`.
- Row 2 contains the active tab's controls rendered as native ribbon toolbar
  groups. Production code must not reuse portal-slot content or
  `.inline-preview-text-control-grid` presentation from the old full menu
  inside the ribbon.
- The reserved slot uses a fixed compact app-shell height sized for the tab
  row, two fixed control rows, a horizontal overflow lane, and the documented
  bottom clearance. Controls must not wrap downward in a way that pushes the
  editable surface lower. Active control rows use fixed row heights; horizontal
  sizes may adapt, condense, or switch to compact icon/dropdown-only
  affordances. When the complete semantic-card set still exceeds the available
  width, the fixed control area may expose horizontal scrolling at whole-card
  columns.
- The ribbon must not introduce vertical scrolling as the overflow solution.
  Horizontal overflow must use a dedicated lane below the fixed rows; it must
  not cover the bottom row, change fixed row heights, push the preview, or
  reflow controls into a third row.
- Native ribbon controls are arranged as semantic boxes packed in
  column-first order. A column has one shared width: if any box above or below
  another box in the same column requires more usable width, every box in that
  column expands to match the larger box. Do not shrink the larger box to match
  smaller siblings. This rule changes horizontal sizing only; row heights stay
  constant, and toggling enabled/disabled state must not change the column
  width.
- Column-first packing fills the current column from top to bottom before
  opening the next column. If a one-row semantic box leaves usable fixed-row
  space below it, the next one-row box must occupy that lower slot; it must not
  jump to the next column. A two-row/tall box may start a new column only when
  it cannot fit in the remaining row space. This rule replaces looser
  interpretations that balance boxes across columns or fill the top row first.
- Dense semantic boxes with several independent controls must use an internal
  hierarchy before any label hiding, icon-only fallback, or horizontal
  compression. Primary fields and dropdowns should stack in a field column;
  secondary command buttons, toggles, or steppers should occupy a companion
  command column. Do not render dense groups such as Text > Font or Text >
  Paragraph as one long row. Feature boxes with enablement state, such as
  Artistic > Background and Border, may use the separate header-checkbox plus
  mounted-dependent-field pattern instead, but they must still preserve stable
  internal geometry.
- Text-tab dense-box rationale: the Text tab owns the highest-frequency
  typography commands and must remain usable inside the fixed two-control-row
  ribbon without creating a third row or pushing the preview down. Field
  columns keep selectable/editable values readable; companion command columns
  keep compact actions close to the values they affect. This is why Text >
  Font and Text > Paragraph are not allowed to degrade into a single long row,
  nor into unrelated buttons spread across spare ribbon space.
- Dense group command columns must remain visually associated with their field
  column. Use the same vertical divider language as the box title/function
  separator between the field column and companion buttons, and place the
  buttons adjacent to that divider. Buttons must not drift to the far edge of
  unused ribbon/card space.
- Comparable stacked input/select boxes inside the same semantic group must
  share the same visual field dimensions. Their shared target field width is
  derived from the widest reasonable enterable or selectable value in that
  group, not from the currently selected value. For example, Text > Font must
  size its font-family and point-size fields from the longest supported normal
  font label plus the point-size field contract. Very long future labels may
  be capped with ellipsis or an icon-only fallback only after this matched
  field width has reached the group's documented maximum useful width. Matched
  stacked fields must not expand just because the card has extra horizontal
  slack unless a group-specific contract says that field is intentionally
  flexible.
- Dense semantic boxes that contain matched stacked fields are content-fitted.
  The outer bordered box ends after the last contained control plus its normal
  padding, separator, and border. If a contained field legitimately expands
  because the matched-width contract requires a wider selectable or enterable
  value, the owning box and any stacked sibling in the same column expand to
  that new content-derived width up to the group's maximum useful width. Extra
  ribbon/header space must not stretch dense boxes such as Text > Font or Text
  > Paragraph after their contained controls have reached their target widths.
  This keeps the border visually attached to the controls instead of creating
  dead interior space. Extra app-shell width belongs to groups that can use it
  meaningfully, or to whole-group overflow, not to stretching dense text boxes
  after their fields and command clusters have reached usable dimensions.
- Compact select fields in dense groups follow the same target-width rule even
  when they do not have a paired field. For example, Text > Paragraph alignment
  sizes from the widest supported alignment label plus the dropdown affordance,
  not from the available card width.
- The Presets tab uses three semantic groups: `Style`, `Layout`, and `Reset`.
  `Style` and `Layout` are one-row dropdown cards stacked in the same column
  when both are available, and the column width must reserve the full bordered
  card contents: title, divider, padding, dropdown field, and chevron. The
  group title is the visible purpose label; the inner select label remains
  available for accessibility but must not appear as redundant visible text
  such as `Style Style preset` or `Layout Layout preset`.
- Presets reset exception: the reset action is the only Presets control that
  may render outside a labeled semantic card. It should be a standalone button
  visibly labeled `Reset`, without an additional `Reset` group title to its
  left or any secondary visible target label to its right. `Style` and
  `Layout` must continue to follow the normal semantic-card contract.
- Composite value/dropdown controls, such as `Font size (pt)`, must visually
  behave as one native ribbon dropdown field. The external unit label for the
  point-size field is `POINTS`, and it sits outside the bordered field on the
  left. Inside the field, the editable/current value sits to the left and the
  chevron sits to the right. The chevron must not be rendered as a separate
  bordered button or nested box.
- Text > Font uses `STYLES` as the visible row label for the font-family
  dropdown and `POINTS` as the visible row label for the point-size dropdown.
  Both labels live in the same stacked label column so the two dropdown fields
  stay aligned. These compact labels are intentionally visible: icon-only or
  unlabeled controls were too ambiguous, while full form labels consumed too
  much width for the fixed-height ribbon.
- Text > Font uses an underlined `FORMAT` heading above the BIU buttons. The
  B/I/U buttons are centered inside that format section rather than stretched
  across the available card width. `FORMAT` explains that the buttons are one
  command cluster, not three separate value fields.
- Text > Paragraph uses `ALIGN` as the visible label beside the alignment
  dropdown. Its list command section uses `LIST` above the bulleted-list
  button, and the `LIST` label/button stack is centered in the available area
  between the command divider and the right edge of the Paragraph box. This
  centering must come from the command column's available space, not from a
  hardcoded pixel offset. The right-side command column is the extensible owner
  of paragraph actions; future list, indent, or related paragraph commands
  should join that column instead of requiring new one-off spacing rules.
- The Utilities tab uses native semantic cards for the available utility
  responsibilities. `Position` is a two-row card with X/Y controls stacked as
  a matched field set. `Layout` is a two-row card with measurement controls
  and closely related layout toggles kept in the same internal box. The fully
  visible `Respect visual elements` checkbox belongs with `Wrap width`; it
  must not be split away behind the divider used for unrelated mode/arc
  options. The `Wrap width` label must remain fully readable at minimum and
  default sizes; whole-card horizontal scrolling is preferred over truncating
  those utility labels. Utilities range sliders use the same ribbon slider
  compression contract as Artistic range sliders: the normal track minimum is
  72px with a 48px numeric field, and the compact track minimum is 58px with a
  42px numeric field. Utility range tracks share a 96px useful maximum so X/Y
  position sliders and `Wrap width` remain visually matched even when their
  semantic cards have different available widths. Utilities layout reset uses
  the Presets reset visual language: a standalone `Reset` command button
  without an extra `Reset` card title or a secondary `Layout` label, except it
  spans the same two-row height as the Layout card. HTML source does not live
  in Utilities; it is owned by the dedicated `HTML` tab. Do not add
  unsupported or empty Utilities cards merely to satisfy a group name. A
  range-only `Layout` card uses a compact content width so its right border
  sits near the rightmost visible control; only layouts with additional
  mode/arc option columns may use the wider Layout profile.
- Composite value/dropdown fields must share the same visual metrics as nearby
  native dropdowns: border-box height, top and bottom border rows, border
  radius, background, font sizing, focus treatment, and chevron asset. The
  chevron must use the same effective right inset as ordinary ribbon selects.
  If a custom overlay is needed to preserve typing, presets, or native popup
  behavior, the overlay must not paint a second value, create a second border,
  or change the field's measured box.
- Composite dropdown verification must be pixel-based in native Tauri whenever
  visual parity is in question. At minimum, compare the composite field against
  a neighboring native select and record: field top border row, field bottom
  border row, right border x-coordinate, rightmost visible chevron pixel, and
  the gap between that chevron pixel and the right border. The top/bottom rows
  and chevron-to-border gap must match the native select within the same
  captured client area before the control is considered visually aligned.
- Ribbon position and size are based only on the app-shell container
  dimensions. They must never depend on selected-text bounds, safe zones, arcs,
  preview geometry, center holes, or collision scoring.
- Toast notifications normally keep their existing top-right placement. When
  the contextual ribbon is active, the toast stack must move below the reserved
  ribbon region with a small gap and must never overlap ribbon tabs or controls.
- The toast offset must be derived from the actual reserved ribbon slot height,
  preferably through shared app-shell layout state or a CSS variable such as a
  contextual ribbon height/offset. It must not be a hardcoded magic number and
  must not depend on text bounds, selected module, disc geometry, or preview
  geometry.
- Toast animation, appearance, and disappearance must not resize or move the
  preview.
- The preview workspace consumes the remaining viewport and scales the preview
  canvas down when necessary, including at default and minimum Tauri window
  sizes.
- There is no separate normal-mode "Text value" field replacing the preview.
- The visible text itself remains on the canvas and is editable directly in the
  preview.
- The editable text has a dotted boundary around the actual visible text bounds.
- Empty selected text has a small visible minimum dotted box.
- The text body is for typing and selecting text.
- Text-body dragging selects text. It must never move the text object.
- An approximately 8px selection-edge grab region moves the text object
  immediately. It uses pointer capture and a grab/grabbing cursor.
- A visible Move button remains available as an accessible movement fallback.
- Delete/trash removes the text object instead of relying on a "show" checkbox.
- HTML source is the supported source-editing mode where a text module can
  safely parse sanitized markup into the shared rich-text run model and render
  the parsed result through its final visible renderer.
- Legacy Markdown source fields remain readable only as a backward-compatible
  project migration path. New saves should persist canonical sanitized HTML,
  not Markdown.
- HTML source mode may show raw source in the editor, but normal edit/final
  preview must remain WYSIWYG and must not introduce a second visible text
  renderer.

## Layout Contract

- Edit mode and final mode must use the same measured layout result or an
  explicitly shared equivalent.
- Case insert rectangular text stores canonical typographic `fontSizePt`
  values. Renderers convert points to export pixels with the template export
  DPI (`fontSizePt * dpi / 72`) and then scale those pixels for preview.
- The case insert `Font size (pt)` control replaces approximate text scale
  sliders for cover, tray, left spine, and right spine.
- Disc text also stores canonical `fontSizePt` values, but the conversion is
  disc-owned in `src/discText/pointSize.ts` because straight SVG/tspan and
  curved SVG/textPath layouts use disc template geometry. Legacy disc `scale`
  values are migrated into apparent-equivalent point sizes while scale remains
  available for any remaining geometry responsibilities.
- Case insert `Wrap width` is a maximum line-wrapping constraint. It must not
  become the visible collision hull or add invisible padding around the object.
- The edit box must hug the actual visible text bounds, not the full safe-zone
  or reserved layout width.
- Text grows horizontally with content until the allowed safe-zone boundary.
- Once rendered text bounds reach the allowed boundary, text wraps.
- Height grows with wrapped lines, including line 2 and beyond.
- Exiting edit mode must not jump, shrink, relocate, or change wrapping.
- Safe-zone compliance is based on rendered text bounds/pixels, similar to
  image collision behavior, not a giant invisible text box.
- Save/load and export must preserve the same rendered result.
- Safe HTML source, parsed rich-text runs, live preview, saved project data, and
  export output must preserve the same supported formatting.
- Selection-scoped font sizing is represented as `fontSizePt` on shared
  rich-text runs. Object-level `fontSizePt` remains the ambient size for
  unstyled text and collapsed-selection whole-object sizing; legacy
  `fontSizePx` run values remain readable for older HTML but new canonical
  source should emit `font-size:Npt`.

## Contextual Ribbon Placement Contract

- The contextual text controls live in a stable app-shell ribbon, not in a
  floating menu attached to the selected text.
- The ribbon is shared by cover, tray, left spine, right spine, straight disc,
  and curved disc text targets.
- The ribbon host receives active text controls through a neutral registration
  bridge from the selected preview editor. That bridge is for app-shell
  placement only; it is not a portal back to preview-anchored full-menu
  markup.
- The ribbon responds to its reserved header/container width and height only.
  Surface-specific geometry may affect preview affordances and text layout, but
  it must not move, resize, dock, or flip the ribbon.
- The old full-menu collision, docking, portal, and selected-text-anchored
  positioning system has been removed. Do not reintroduce it for migrated text
  surfaces.
- The preview still owns target-local affordances: caret, selection, dotted or
  path-aware outlines, direct typing, edge-grab movement affordance, Move
  fallback target where applicable, and Delete affordance where applicable.
- Intentional setup, source, and type controls remain sidebar-owned. Examples
  include add/enable entry points, metadata/default source selection, and
  straight/curved mode selection where the surface still needs a pre-selection
  setup choice.

### Module And Control Ownership Matrix

| Surface | Ribbon-owned editing controls | Preview-owned affordances | Sidebar-owned setup/source controls |
| --- | --- | --- | --- |
| Cover text | Style presets, layout presets, font family, Font size (pt), BIU, underline, color, contrast, background, border, alignment, wrap width, position, utilities, reset style/layout, Done, Delete where supported | Direct typing, caret, range selection, dotted bounds, edge-grab movement, Move fallback | Add/select entry points, metadata/default setup without contextual equivalent |
| Tray text | Same as cover text, using tray-safe geometry and wrapping semantics | Same as cover text | Same as cover text |
| Left spine text | Same contextual text controls that the spine target supports | Rotated caret/selection, rotated bounds, edge-grab movement, Move fallback | Add/select entry points, spine orientation or structural setup where still sidebar-owned |
| Right spine text | Same as left spine text | Same as left spine text | Same as left spine text |
| Straight disc text | Style presets, layout presets, font family, Font size (pt), BIU, underline, color, contrast, alignment, line/wrap controls, HTML source, reset style/layout, Done, Delete where supported | SVG/tspan renderer, direct typing adapter, caret, range selection, bounds, edge-grab movement, Move fallback | Enable/add, metadata/default source, straight/curved setup where needed |
| Curved disc text | Font family, Font size (pt), BIU, underline, color, contrast, alignment, line spacing, arc side/span/inset/position, presets, safe inline HTML source, reset style/layout, Done, Delete where supported | SVG/textPath renderer, path-aware caret, path-aware selection, arc-aware outline/bounds, direct typing adapter, edge-grab movement, Move fallback | Enable/add, metadata/default source, straight/curved mode selection |

### Responsive Ribbon States

| State | Container behavior | Control behavior |
| --- | --- | --- |
| Wide | Tabs fit in one row; active controls use the full available right-hand header column when useful. | Full labels, normal spacing, normal sliders/inputs. |
| Compact | Tabs remain single-line where possible; active controls stay in fixed-height semantic-card rows. | Controls condense horizontally, use shorter labels, and may switch unreadable select values to button-only dropdown affordances with accessible labels. |
| Narrow | Tabs and controls preserve the fixed ribbon height and do not add a third control row or vertical scrollbar. | Controls keep usable hit targets, equalized column widths, compact/icon-only affordances where text labels would become unreadable, and horizontal scrolling only when whole-card columns still exceed the available width. |

### Migration Status

The stable app-shell ribbon is the production contextual control host for
cover, tray, spine, straight-disc, and curved-disc text. The old floating
tabs/menu, selected-text collision solver, center/side docking, detached
emergency placement, and placement-size feedback paths have been removed from
production editor code.

### Removed Legacy Responsibilities

The following responsibilities are intentionally not part of the active text
editor architecture:

- Selected-text-anchored tab/menu placement and collision scoring.
- Preview-bound menu flipping, clamping, emergency detached placement, and
  center/side docking helpers.
- Portal roots and outside-click containment code that exist only for floating
  contextual menus.
- Responsive shell sizing feedback used by the floating placement solver.
- Smoke routes and tests that only prove the floating menu avoids safe zones,
  center holes, or selected-text bounds.

Keep these responsibilities:

- Text target adapters and the contextual control registry.
- Hidden/native input adapters.
- Caret, selection, outline, direct typing, edge-grab movement, Move fallback,
  and Delete affordances.
- Renderer, layout, save/load, and export ownership.

### Acceptance Criteria

- The ribbon appears only when editable text is selected, while its app-shell
  slot remains reserved when inactive.
- The Live Preview heading remains visible on the left, and the preview begins
  below the full header/ribbon region.
- Row 1 contains the five contextual tabs; the active tab's controls occupy the
  fixed control-row area without adding a third row or moving the preview.
- Horizontal overflow uses a lane below the fixed control rows and must not
  cover, clip, or reduce the usable height of the bottom row.
- Stacked semantic boxes in the same ribbon column share the widest box width
  in that column.
- Semantic boxes fill any available lower fixed-row slot in the current column
  before a later box can start the next column.
- Toasts keep their existing placement when the ribbon is inactive, move below
  the measured ribbon slot while active, and return to their original placement
  when the ribbon deactivates.
- Toasts never overlap ribbon tabs or controls at default Tauri window size,
  narrow widths, or wide widths.
- Ribbon size/position does not change when selected text moves, wraps, changes
  point size, changes arc geometry, touches a safe zone, or crosses the disc
  center hole.
- Cover, tray, left spine, right spine, straight disc, and curved disc targets
  all activate the same ribbon host.
- Text-body drag selects text; the selection-edge grab region and Move fallback
  move the object immediately.
- Existing sidebar setup/source/type controls remain available and are not
  duplicated by migrated editing controls.
- Preview, save/load, and export parity remain unchanged.

## Input And Caret Contract

- Space inserts a real visible space.
- Multiple spaces are preserved.
- Leading and trailing spaces are preserved during editing.
- Newlines are preserved.
- Pasted multiline text is preserved.
- Canvas shortcuts and preview key handlers must not intercept normal text input
  while editing.
- The caret is blue, blinking, and located at the actual insertion point.
- Selection reflects the text currently visible in the preview.
- There must be no ghost text, duplicate visible renderer, invisible text layer,
  or hidden text surface that the caret follows.

## Disc Compatibility Contract

- Curved disc text remains SVG/textPath based.
- Curved disc text must not be forced into a visible rectangular textarea.
- Straight disc text may share input infrastructure only through an adapter path
  that keeps the SVG/final preview renderer visible and correct.
- Curved disc text may use the shared contextual shell only through a
  curved-disc adapter: the rendered SVG/textPath text is the direct editing
  surface, a hidden/native input may adapt keyboard/clipboard/IME behavior, and
  no rectangular on-canvas input is mounted over the curved text.
- Disc preview and export preserve the current SVG/textPath renderer behavior.
- Straight disc HTML source must render through safe SVG text/tspan output in
  preview and export.
- Curved disc HTML source must render safe inline formatting through the
  existing SVG/textPath and tspan path. Supported inline formatting includes
  font family, Font size (pt), BIU, underline, text color, and safe line breaks.
  Structures that cannot be represented faithfully on curved textPath, such as
  bulleted-list markup, must report validation clearly, preserve safe visible
  text where appropriate, and never execute raw HTML.

## Current Implementation Notes

As of PR `#186`, cover sheet, tray card, left spine, right spine, and straight
disc inline editing use adapter input/selection paths so the final preview
renderer remains the visible glyph renderer during edit. The adapter may own
keyboard input, caret placement, selection affordances, dotted boundaries, and
menu positioning, but it must not become a second visible text renderer.

Curved disc copyright/legal text remains SVG/textPath based, but it now uses a
curved-safe contextual adapter for direct text editing and whole-object menu
controls. The sidebar owns only setup/source/type responsibilities for that
text. The contextual shell must not mount a rectangular on-canvas textarea over
the curved renderer; a hidden/native input may adapt keyboard, clipboard, IME,
selection, and undo behavior while SVG/textPath remains the visible source of
truth.

## Protected Existing Behavior

- Existing cover, tray, and spine grouped panels must remain bundled and
  recognizable.
- Steam import/search, save/load, PNG export, guides, design check, preflight,
  visual elements, drag, upload/custom image, reset, and clear behavior must
  keep working.
- Disc SVG/textPath preview/export behavior is launchpad infrastructure and must
  be preserved.
- User-created assets and unrelated dirty work must not be overwritten.

## Required Regression Coverage

The stabilization gate should cover these behaviors with source-level tests
where deterministic and manual/runtime smoke where the browser or Tauri runtime
is required:

- Cover default title: typing "hello hello" shows both words while editing and
  after exit.
- Cover long text: grows horizontally until the safe-zone boundary, then wraps.
- Cover multiline text: grows vertically after line 2 and beyond.
- Empty cover text: visible dotted editable box remains.
- Tray text: same behavior as cover.
- Left/right spine text: does not type backwards, delete characters, or jump
  after exit.
- Straight disc text: shows all words, preserves spaces, and wraps correctly.
- Straight disc text: keeps SVG fill/stroke/shadow visible during editing and
  does not shift, grow, shrink, or show duplicate text when entering/exiting
  edit mode.
- Curved disc text: remains SVG/textPath, activates the contextual ribbon for
  supported whole-object controls, and does not mount a rectangular on-canvas
  textarea.
- Spacebar: Space changes the live draft and visible preview.
- Multiple, trailing, and leading spaces are preserved in the live draft and
  final renderer.
- Default text deletion: deleted default text does not repopulate until blur
  while empty.
- Caret: blue, blinking, and located at the actual insertion point.
- Ghosting: no duplicate visible text under the editor.
- Selection: Ctrl+A and pointer-drag selection operate on the visible text for
  adapter-backed insert and straight-disc editing paths.
- Panels: cover/tray/spine feature groups remain bundled and recognizable.
- Toast/ribbon stacking: inactive ribbon preserves current toast placement;
  active ribbon offsets the toast stack below the measured reserved ribbon slot
  without moving the preview.

## Current Gate Owners

- Shared preview-mounted editor UI:
  `src/components/preview/InlinePreviewTextEditor.tsx`.
- Shared preview-mounted adapter contract and conformance assertions:
  `src/components/preview/inlinePreviewTextEditorContract.ts`.
- Case insert target selection and draft/final transitions:
  `src/caseInsert/previewTextSelection.ts` and
  `src/caseInsert/previewTextEditing.ts`.
- Case insert measured text layout:
  `src/layout/caseInsertTextVisualLayout.ts`.
- Case insert text point-size conversion and legacy scale migration:
  `src/caseInsert/textSizing.ts`.
- Disc straight text measured layout:
  `src/discText/renderLayout.ts`.
- Disc text point-size conversion and legacy scale migration:
  `src/discText/pointSize.ts`.
- Disc SVG/textPath renderer:
  `src/discText/svgLayer.ts` and `src/components/preview/DiscTextLayer.tsx`.
- Disc straight and curved contextual adapters:
  `src/components/preview/DiscInlineTextEditorLayer.tsx`.
- Editor affordance styling:
  `src/styles/app-editor-controls.css`.

## Validation Protocol

Required non-interactive validation:

- `npm run lint`
- `npm run test`
- `npm run check:cycles`
- `npm run build`

Runtime validation must be done from the primary checkout:

```powershell
cd "$env:USERPROFILE\steam-backup-label-studio"
```

Do not claim this contract is fully satisfied from helper/unit tests alone.
Final reports for user-visible text editor changes must say which source checks
passed, which runtime scenarios were actually verified, which scenarios still
need manual Tauri verification, and where insert rendering, disc rendering,
editor rendering, and final/export rendering currently diverge.
