# Disc Editor Layer Order
> Status: Conditional disc layer-order reference.
> Purpose: Disc preview/export layer order policy.
> Read when: Disc renderer, export, or layer-order work.
> Authoritative source: This document for disc layer order; SDD for global parity.
> Last reviewed against commit: `408bd68f2a13998a54e14c72930628993c5cdcfb`.


Last refreshed: 2026-05-31.

This document records the intended visual stacking order for the current disc-label editor.

The source of truth for code is `src/editor/layerOrder.ts`. Preview rendering and PNG export should consult that shared policy when adding or moving visual layers.

## Shared Preview And Export Order

The current shared user-visible order is:

1. Background artwork.
2. Additional artwork.
3. Steam Backup banner.
4. Game title/logo artwork.
5. Developer, publisher, and additional logos.
6. Rating badge.
7. Media format mark.
8. Operating-system marks.
9. Technical/audio/codec marks.
10. Disc text, including disc-number badge mode.

These layers should appear in the same relative order in the live preview and PNG export. When a new user-visible visual system is added, add it to `src/editor/layerOrder.ts` first and then wire preview/export rendering through that policy.

## Full Layer Policy

`src/editor/layerOrder.ts` currently includes these layer IDs:

1. `disc-base-fill`
2. `background-artwork`
3. `additional-artwork`
4. `steam-banner`
5. `title-artwork`
6. `logo-assets`
7. `rating-badge`
8. `media-mark`
9. `platform-marks`
10. `technical-marks`
11. `disc-text`
12. `editor-guide-overlay`
13. `export-outline`
14. `physical-center-hole-cutout`
15. `export-guides`

Preview uses the user-visible layers plus `editor-guide-overlay`. PNG export draws clipped content layers first, then export-only post-clip layers.

## Export-Only Layers

PNG export has a few extra operations that do not map directly to ordinary preview JSX layers:

1. Disc base fill is drawn before background artwork inside the clipped disc face.
2. Export outer outline is drawn after clipped disc content.
3. Physical center hole cutout is applied after the outer outline step.
4. Optional exported guides are drawn last so proof exports clearly show geometry marks.

## Preview-Only Layers

The editor guide overlay is preview-only and should stay above editable artwork and text so the safe zone, printable area, and physical center hole remain visible while editing.

The preview toast stack and sidebar/preview chrome are not disc-art layers and must not be exported.

## Rules For Future Features

- Do not rely on incidental JSX order or canvas draw order for new layers.
- Add new user-visible visual layers to `src/editor/layerOrder.ts` before rendering them.
- Update this document when `src/editor/layerOrder.ts` changes.
- Preserve preview/export parity unless an intentional difference is documented here.
- Keep editor-only helpers, such as preview guides and toast UI, separate from exported artwork unless the user explicitly enables an export guide option.
- Do not treat this as a full arbitrary layer manager. It is the fixed baseline order for the current alpha-path editor.
