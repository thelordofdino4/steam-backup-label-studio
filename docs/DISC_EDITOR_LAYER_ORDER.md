# Disc Editor Layer Order

This document records the intended visual stacking order for the current disc-label editor.

The source of truth for code is `src/layerOrder.ts`. Preview rendering and PNG export should consult that shared policy when adding or moving visual layers.

## Shared preview and export order

1. Background artwork.
2. Steam Backup banner.
3. Developer and publisher logos.
4. Rating badge.
5. Media format mark.
6. Platform marks.
7. Disc text.

These layers should appear in the same relative order in the live preview and PNG export. When new visual systems are added, such as title/logo art or additional custom marks, add them to `src/layerOrder.ts` first and then wire preview/export rendering through that policy.

## Export-only layers

PNG export has a few extra operations that do not map directly to ordinary preview JSX layers:

1. Disc base fill is drawn before background artwork inside the clipped disc face.
2. Export outer outline is drawn after clipped disc content.
3. Physical center hole cutout is applied after the outer outline step.
4. Optional exported guides are drawn last so proof exports clearly show geometry marks.

## Preview-only layers

The editor guide overlay is preview-only and should stay above editable artwork and text so the safe zone, printable area, and physical center hole remain visible while editing.

## Rules for future features

- Do not rely on incidental JSX order or canvas draw order for new layers.
- Add new user-visible visual layers to `src/layerOrder.ts` before rendering them.
- Preserve preview/export parity unless an intentional difference is documented here.
- Keep editor-only helpers, such as preview guides and toast UI, separate from exported artwork unless the user explicitly enables an export guide option.
- Do not treat this as a full arbitrary layer manager. It is the fixed baseline order for the current alpha-path editor.
