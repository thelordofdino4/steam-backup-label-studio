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
- The preview begins below the complete header/ribbon region and must never
  encroach into, underlap, or be clipped by the reserved ribbon slot.
- The reserved slot remains present when no text target is active, but the
  ribbon contents disappear.
- Row 1 of the ribbon contains the four contextual tabs. Row 2 contains the
  active tab's controls. At narrower widths, controls may wrap into a third
  row.
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
- The ribbon responds to its reserved header/container width and height only.
  Surface-specific geometry may affect preview affordances and text layout, but
  it must not move, resize, dock, or flip the ribbon.
- The old full-menu collision, docking, portal, and selected-text-anchored
  positioning system is temporary compatibility code during migration. It must
  be deleted after the ribbon fully owns contextual controls.
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
| Straight disc text | Style/layout presets, font family, Font size (pt), BIU, underline, color, contrast, alignment, line/wrap controls, HTML source where supported, reset style/layout, Done, Delete where supported | SVG/tspan renderer, direct typing adapter, caret, range selection, bounds, edge-grab movement, Move fallback | Enable/add, metadata/default source, straight/curved setup where needed |
| Curved disc text | Whole-object or supported range-safe controls for font family, Font size (pt), BIU, underline, color, contrast, alignment, line spacing, arc side/span/inset/position, presets, reset style/layout, Done, Delete where supported | SVG/textPath renderer, path-aware caret, path-aware selection, arc-aware outline/bounds, direct typing adapter, edge-grab movement, Move fallback | Enable/add, metadata/default source, straight/curved mode selection |

### Responsive Ribbon States

| State | Container behavior | Control behavior |
| --- | --- | --- |
| Wide | Tabs fit in one row; active controls fit in one or two balanced groups. | Full labels, normal spacing, normal sliders/inputs. |
| Compact | Tabs may remain one row or become two-by-two if needed. | Controls reflow into fewer columns with shorter labels and smaller gaps. |
| Narrow | Tabs may use two-by-two layout or horizontal scrolling only as a last resort. | Labels stack above controls, fields use available width, and controls may wrap into a third row. |

### Migration Sequence

1. Add the reserved app-shell ribbon slot above the preview while leaving the
   inactive slot empty.
2. Move tab rendering into the ribbon without changing target adapters or
   renderer ownership.
3. Move active-tab controls into the ribbon by consuming the existing
   contextual control registry and adapter contracts.
4. Keep preview affordances on the selected text and add the selection-edge
   movement region.
5. Confirm every target surface activates the ribbon and preserves WYSIWYG
   parity.
6. Remove migrated duplicate sidebar controls only where setup/source/type
   ownership is not required.
7. Delete the old floating menu, portal, docking, center-dock, emergency
   placement, selected-text collision, and menu-size feedback code after no
   target uses it.

### Legacy-Code Deletion Map

Delete or retire these responsibilities after the ribbon migration is complete:

- Selected-text-anchored tab/menu placement and collision scoring.
- Preview-bound menu flipping, clamping, emergency detached placement, and
  center/side docking helpers.
- Portal roots and outside-click containment code that exist only for floating
  contextual menus.
- Responsive shell sizing feedback used by the floating placement solver.
- Tests that only prove the floating menu avoids safe zones, center holes, or
  selected-text bounds.

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
- Row 1 contains the four contextual tabs; row 2 contains the active tab's
  controls; narrow widths may wrap controls into row 3 without overlap.
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
- HTML source, selection-scoped formatting, and list editing remain unsupported
  for curved disc text unless they can be mapped safely onto textPath without a
  rectangular visible editor.

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
