# Saved Project Fixtures

These `.sbls.json` files are safe placeholder projects for manual regression checks and future visual/export comparison work.

They intentionally use generated placeholder SVG data URLs instead of third-party game artwork. The goal is to make save/load, preview, export, normalization, and layout checks repeatable without adding copyrighted assets to the repository.

## Fixtures

- `blank-project.sbls.json` — default blank disc-label project with optional visual elements disabled.
- `background-only.sbls.json` — generated placeholder background with no optional branding/text elements enabled.
- `full-branding.sbls.json` — representative Steam-import-like project with placeholder background, developer/publisher logos, rating badge, media mark, platform marks, text, and export guides enabled.
- `custom-dimensions.sbls.json` — custom disc geometry project with bottom banner placement and guide export enabled.
- `legacy-minimal-0.1.0.sbls.json` — intentionally sparse schema `0.1.0` project used to exercise loader normalization defaults.

## Suggested manual check flow

1. Launch the app with `npm run tauri dev`.
2. Load each fixture from this folder.
3. Confirm the project loads without errors.
4. Confirm the preview reflects the fixture intent.
5. Export a PNG with and without guide marks where relevant.
6. Confirm saved state survives a save/reload pass.

These fixtures support issue #64 and are intended to feed the future preview/export comparison workflow from issue #65.
