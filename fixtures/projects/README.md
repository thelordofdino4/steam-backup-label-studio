# Saved Project Fixtures

These `.sbls.json` files are safe placeholder/generic projects for manual regression checks and visual/export comparison work.

They intentionally avoid third-party game artwork. Some older fixtures still use generated placeholder SVG data URLs; newer built-in asset work uses file-backed assets routed through `src/discPlaceholderAssets.ts`, with official replacements under domain folders in `src/assets/` and true placeholder-named fallbacks under `src/assets/placeholders/`. The goal is to make save/load, preview, export, normalization, and layout checks repeatable without adding copyrighted assets to the repository.

## Fixtures

- `blank-project.sbls.json` — default blank disc-label project with optional visual elements disabled.
- `background-only.sbls.json` — generated placeholder background with no optional branding/text elements enabled.
- `full-branding.sbls.json` — representative Steam-import-like project with placeholder background, developer/publisher logos, rating badge, media mark, platform marks, text, and export guides enabled.
- `custom-dimensions.sbls.json` — custom disc geometry project with bottom banner placement and guide export enabled.
- `legacy-minimal-0.1.0.sbls.json` — intentionally sparse schema `0.1.0` project used to exercise loader normalization defaults.

These fixtures do not yet fully cover recently added title/logo artwork, additional artwork, technical marks, disc-number badge mode, or export preflight warnings. Use `docs/VISUAL_REGRESSION_WORKFLOW.md` for manual notes when those systems need to be checked, and add/update fixtures only in a fixture-scoped change.

## Suggested manual check flow

1. Launch the app with `npm run tauri dev`.
2. Load each fixture from this folder.
3. Confirm the project loads without errors.
4. Confirm the preview reflects the fixture intent.
5. Export a PNG with and without guide marks where relevant.
6. Confirm saved state survives a save/reload pass.

Use `docs/VISUAL_REGRESSION_WORKFLOW.md` for the full preview/export parity checklist, mismatch severity labels, known acceptable differences, and run record template.

These fixtures support closed issue #64 and the preview/export comparison workflow from closed issue #65.
