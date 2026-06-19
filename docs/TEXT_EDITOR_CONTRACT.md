# Text Editor Contract

Last refreshed: 2026-06-16.

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
- Selecting text in the preview opens a compact contextual editor near the
  selected text.
- The selected text is the positioning anchor for the whole contextual editor.
- Tabs appear directly above the selected text.
- The context menu appears below the selected text by default.
- The menu repositions upward before it would hit the bottom of the active
  preview window.
- The menu clamps inside the active preview window horizontally and vertically.
- Contextual editor positioning is relative to the active preview window, not
  the page, sidebar, or document body.
- The editor must feel like a compact contextual toolbar attached to the
  selected text, not like the sidebar controls were relocated onto the canvas.
- There is no separate normal-mode "Text value" field replacing the preview.
- The visible text itself remains on the canvas and is editable directly in the
  preview.
- The editable text has a dotted boundary around the actual visible text bounds.
- Empty selected text has a small visible minimum dotted box.
- The text body is for typing and selecting text.
- A separate visible move handle is used for dragging.
- Drag uses pointer capture and a grab/grabbing cursor.
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

## Contextual Editor Positioning Contract

- The selected text box is the only anchor for tabs, editable text, move
  handle, and the context menu.
- Tabs sit directly above the selected text boundary, following that boundary as
  text moves, wraps, or changes size.
- Editable text stays in the design surface; editing must not replace the
  selected text with a detached form field in the middle of the preview.
- The context menu opens below the selected text when there is enough room.
- Before the menu would collide with the active preview window bottom edge, it
  flips above or otherwise moves upward while staying associated with the
  selected text.
- The menu must clamp to the active preview window on every side. It must not
  clip into the page edge, sidebar, body viewport, or an inactive preview area.
- Cover sheet, tray card, left spine, right spine, and straight disc text should
  all use the same positioning contract, with target-specific geometry only
  where the surface requires it.
- Right spine menu clipping was reported runtime-verified in PR `#186`; keep it
  as a required smoke scenario whenever contextual editor positioning changes.

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
- Disc preview and export preserve the current SVG/textPath renderer behavior.
- Straight disc HTML source must render through safe SVG text/tspan output in
  preview and export.
- Any future hidden/native input adapter for curved text must keep SVG as the
  visible source of truth.

## Current Implementation Notes

As of PR `#186`, cover sheet, tray card, left spine, right spine, and straight
disc inline editing use adapter input/selection paths so the final preview
renderer remains the visible glyph renderer during edit. The adapter may own
keyboard input, caret placement, selection affordances, dotted boundaries, and
menu positioning, but it must not become a second visible text renderer.

Curved disc copyright/legal text remains the intentional exception: it stays
SVG/textPath based and must not open the rectangular inline editor unless a
future ADR defines a curved-text adapter that preserves SVG as the visible
source of truth.

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
- Curved disc text: remains SVG/textPath and does not regress.
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
- Disc straight text measured layout:
  `src/discText/renderLayout.ts`.
- Disc SVG/textPath renderer:
  `src/discText/svgLayer.ts` and `src/components/preview/DiscTextLayer.tsx`.
- Disc straight-text inline adapter:
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
