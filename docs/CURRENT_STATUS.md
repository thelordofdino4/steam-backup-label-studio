# Current Project Status

Last refreshed: 2026-06-01.

Steam Backup Label Studio is **post-indev for the disc-label editor**. The disc-label editor is the first alpha-capable product surface.

The current working interface is the **disc-label editor**. The app is now a Steam backup disc-label editor with a real-disc-art workflow, not just an early placeholder prototype. Jewel case, DVD/Amaray, and Blu-ray case editors remain planned future interfaces, with the jewel case editor next in #126.

## Current Sidebar Flow

The intended main sidebar flow is:

Project File → Export Options → Game → Template → Artwork → Branding → Text → Guide Legend

The sections are currently independently collapsible sidebar panels. Do not reorder this flow during docs-only or unrelated feature work.

Guide Legend remains a sidebar section today. Issue #124 tracks the likely future move into a collapsible, open-by-default panel inside the live preview, positioned bottom-right.

## Core Workflow Status

The current disc-label workflow has many working systems:

- Create, save, load, reset, and export project files from Project File.
- Configure optional exported guide marks from Export Options.
- Search Steam for a real game and import game metadata.
- Import Steam store artwork, Steam library artwork, Steam screenshots, and local Steam screenshots where available.
- Discover web artwork candidates from Steam/official-site sources when useful metadata exists.
- Apply imported, discovered, local Steam screenshot, or uploaded local artwork as the disc background.
- Manage imported artwork and background tuning from the Artwork panel.
- Show/hide, drag, resize, fit, and reset background artwork.
- Choose a standard printable disc template or custom dimensions.
- Use physical center hole, inner print boundary, outer print boundary, and safe-zone geometry.
- Use and customize a real default Steam-style banner lockup at the top or bottom of the disc, or hide it.
- Edit project-owned metadata fields for imported or manual projects.
- Use rating/legal metadata candidate assistance from Steam sources.
- Use Steam title/logo artwork when available, restore that Steam default, or upload custom title/logo artwork.
- Add additional artwork elements with local, imported Steam artwork, or local Steam screenshot sources.
- Add optional developer/publisher logos and additional developer/publisher/studio-style logo marks.
- Add optional rating badges with built-in generic or custom-image rendering.
- Add optional media format marks, operating-system marks, and technical/audio/codec marks.
- Infer operating-system marks from Steam platform metadata where reliable while leaving SteamOS manual.
- Enable optional disc text elements for title, subtitle, disc number, backup date, Steam App ID, developer, publisher, install notes, custom note, and copyright/legal text.
- Use metadata-bound text values with manual overrides.
- Use straight text width controls, layout presets, visual-element avoidance, style presets, backplates/borders, preview, export, and save/load support.
- Use stable centered curved copyright/legal text with arc length, angle, inset, scale, side, wrapping, preview, export, and save/load support.
- Use a bundled generic disc-number badge mode.
- Use export preflight to review output dimensions and warnings before PNG export.
- Export a clean 300 DPI PNG based on the selected physical disc geometry.
- Receive status feedback through the preview toast feed.

## Scope Reminder

The app is not close to full product completion yet. The completed alpha-capable surface is one planned interface: the disc-label editor.

Issue #69 is closed because the disc artwork editor now satisfies that feature boundary: a normal user can create, edit, save, reload, and export a print-ready disc label without needing GIMP, Krita, Photoshop, or another editor for ordinary backup-label work. This does not mean Steam Backup Label Studio as a whole is complete.

Future planned interfaces still need to become functional:

- Jewel case insert editor.
- DVD/Amaray case cover editor.
- Blu-ray case cover editor.

Guided Start, case editors, the future `.sbls` package/container format, direct printer support, official asset packs, automatic rating lookup, visual regression automation, and broad Rust refactors are not disc-editor alpha blockers unless a specific issue shows they are needed for one of the finish-line items.

Architecture guardrails remain mandatory for the next phase. Jewel case work should not add new logic to unrelated structures or make preview/export parity depend on hidden coupling. See `docs/ARCHITECTURE_GUARDRAILS.md`.

The case insert editor boundary is documented in `docs/CASE_INSERT_EDITOR_ARCHITECTURE.md`. Jewel case is the first template inside the Case Insert Editor, not a Disc Editor template, and saved project type should remain separate from concrete template/case variant choices.

## Disc Editor Alpha Status

Issue #69 is closed as the parent finish line for disc-editor alpha.

The structural real-disc-art elements are now mostly represented:

- Background artwork.
- Dedicated game title/logo artwork.
- Rating/game-info marks.
- Developer, publisher, and additional logo marks.
- Legal/text systems.
- Steam banner/system branding.
- Technical/audio/codec marks.
- Media-format and operating-system marks.
- Additional artwork elements.

Remaining disc-editor work is polish, validation, and future expansion:

- Keep built-in asset routing centralized through `src/assets/assetManifest.ts`, official replacements in domain folders under `src/assets/`, true placeholder-named fallbacks under `src/assets/placeholders/`, and generated-only user-facing visuals out of the editor surface.
- Keep preview and PNG export layer order in sync through `src/editor/layerOrder.ts` and `docs/DISC_EDITOR_LAYER_ORDER.md`.
- Preserve optional visual state when disabled, hide dependent controls while disabled, and prevent disabled visuals from rendering/exporting.
- Keep text inside the safe zone and keep visual-element avoidance behavior honest.
- Keep drag, slider/manual positioning, upload/custom image, reset/clear, preview, export, and save/load behavior working for existing visual systems.
- Do manual native/Tauri smoke before claiming current live UI behavior is verified for a release package.

The project should not bundle official trademarked assets unless licensing is clearly safe. Built-in user-facing marks, badges, logos, toast icons, and demo visuals should come from real checked-in generic asset files. Custom user images remain supported.

## Current Open GitHub Context

Open issues reviewed for this audit:

- #124 - move Guide Legend into the live preview.
- #125 - add historical technology mark catalog and missing mark families.
- #126 - jewel case editor alpha finish line.
- #56 - decide embedded asset strategy and future `.sbls` package format.
- #48 - add project schema validation and migration support.
- #47 - review Rust Tauri command module organization.
- #46 - organize CSS after component extraction.
- #44 - extract remaining editor state into focused hooks.
- #17 - future Guided Start / Blank Project opening screen.

Closed issue work that older docs may still mention as active:

- #69 disc-editor alpha finish-line tracker.
- #33 curved copyright alignment decision.
- #59 project asset provenance/status/replacement behavior.
- #60 layer ordering policy.
- #61 rating/text layout presets.
- #62 template-derived default layouts.
- #63 export preflight warnings.
- #65 visual regression workflow documentation.
- #66 missing/disabled dependency clarity.
- #68 metadata-bound disc text.
- #82-#85 emergency rendering, text bounds, drag, and media/platform control regressions.
- #95 logo candidate discovery.
- #96 file-backed built-in generic assets baseline.
- #97 Steam title/logo artwork.
- #98 multiple developer/publisher logo marks.
- #99 technical/audio/codec marks.
- #123 built-in placeholder/generic visual centralization and de-placeholdering.

## Current Feature Status

Implemented for the current disc-label surface:

- Physical disc geometry system and custom dimensions.
- Preview/export layer-order policy.
- Project-owned metadata and metadata-bound text.
- Steam search/import and expanded Steam artwork import.
- Local Steam screenshot discovery.
- Web artwork and logo candidate discovery.
- Background artwork import, tuning, and save/load.
- Steam banner branding with configurable colors, image/text lockup, placement, scale, and offsets.
- Title/logo artwork support.
- Additional artwork elements.
- Developer, publisher, and additional logo support.
- Rating badge support.
- Media mark support.
- Operating-system mark support with Steam metadata inference where reliable.
- Technical/audio/codec mark support.
- Optional disc text, straight text styling, visual avoidance, and centered curved legal text.
- Disc-number badge mode.
- Export preflight.
- File-backed built-in asset baseline, with official replacements organized under domain folders and true placeholder-named fallbacks kept under `src/assets/placeholders/`.
- Manual visual regression workflow documentation and fixtures.

Still limited or intentionally incomplete:

- Only the disc-label editor is functional today.
- Case templates are not implemented yet.
- Full arbitrary layer management is not implemented yet.
- Missing historical technology mark families are still tracked by #125 as catalog/future-expansion work.
- Project files are currently plain JSON, often named `.sbls.json`; the future `.sbls` package/container format is not implemented.
- Project schema validation/migrations are still limited (#48).
- Existing fixtures do not yet cover every recently added real-disc-art system; title artwork, additional artwork, technical marks, metadata-bound text, and export preflight need better fixture/manual smoke coverage.
- Manual runtime smoke checklist coverage now lives in `docs/MANUAL_SMOKE_CHECKLISTS.md`; use it to record editor, artwork, branding, preview, save/load/export, and case insert checks.
- Manual native/Tauri smoke is still required before claiming current live editor behavior is verified for a release package.
- Guided Start remains deferred (#17).

## Optional Visual UI Rule

Optional visual features should follow this hierarchy:

1. Show/enable checkbox.
2. Subordinate optional checkboxes.
3. Source/type/value controls.
4. Text/value inputs.
5. Upload/custom asset controls.
6. Placement/alignment presets.
7. Sliders/fine-tuning controls.
8. Reset/clear actions.

When disabled, optional visual features should hide dependent controls, not render in preview or export, and preserve saved state for re-enable.

## Next Recommended Work Order

1. Use #69 as the closed baseline for the disc-editor alpha feature boundary.
2. Use #126 and `docs/JEWEL_CASE_EDITOR_ISSUE_DRAFT.md` as the jewel case editor alpha definition.
3. Keep the built-in asset tree organized and route new built-ins through `src/assets/assetManifest.ts` or a successor manifest if shared case assets require one.
4. Keep #124 and #125 as separate polish/future-expansion work.
5. Add or update fixture/manual smoke coverage for recently added disc systems and future case systems.
6. Continue #44, #46, #47, and #48 only where they support current implementation risk.
7. Keep #56 as the project packaging decision point.

See `docs/MILESTONES.md` for broader milestone and feature backlog context.
