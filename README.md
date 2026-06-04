# Steam Backup Label Studio

A cross-platform desktop app for designing print-ready Steam backup disc labels and, later, case artwork for personal Steam backup media.

## Project Goal

Steam Backup Label Studio helps users create consistent, good-looking labels and case inserts for personal Steam game backup media.

The current app is a Steam backup disc-label editor. It can import Steam metadata and artwork where available, combine that with local/user-provided assets, preserve real disc geometry, save projects, and export print-ready PNG files.

## Project Philosophy

Steam Backup Label Studio is not intended to replace GIMP, Photoshop, Krita, or a full image editor.

The goal is to eliminate the most repetitive parts of making personal Steam backup labels: searching for game artwork, hunting for templates, lining up disc geometry, resizing images by hand, adding repeated branding, adding common label text, and repeating the same setup work for every game.

A user who wants a basic backup disc label should be able to choose a template, search for a game, select artwork, make small placement adjustments, add optional label text/marks, save, and export a printable result in five minutes or less.

Blank-project workflows must remain supported. A user should be able to upload one image and export without being forced through a checklist. Guided help belongs in a future Guided Start flow or in export-time summaries and warnings.

## Current Status

The **disc-label editor** is now past the indev finish line and is the first alpha-capable surface. A normal user can create, edit, save, reload, and export a print-ready disc label without needing another editor for ordinary backup-label work.

The broader product is still early because jewel case, DVD/Amaray, and Blu-ray case editors are not implemented yet. The next major milestone is the **jewel case editor** tracked by #126.

Issue #69 is closed as the disc-editor alpha finish-line tracker. Ongoing polish and future expansion remain tracked separately, including Guide Legend relocation (#124), historical mark catalog expansion (#125), schema/migration work (#48), project packaging decisions (#56), and architecture cleanup (#44, #46, #47).

Do not treat historical "recent validation" notes in older docs as proof that native/Tauri manual smoke has happened for the current checkout. For this docs pass, no `npm run tauri dev` verification is claimed.

## Current Sidebar Flow

The intended main sidebar flow is:

Project File → Export Options → Game → Template → Artwork → Branding → Text → Guide Legend

The sidebar sections are currently implemented as independently collapsible panels. Do not reorder them during documentation or unrelated feature work.

Guide Legend is still in the sidebar today. The likely future improvement is to move it into the live preview as a bottom-right, collapsible, open-by-default panel; that is tracked separately by #124 and should not be bundled into unrelated docs or feature work.

## Current Disc-Label Workflow

The core disc-label workflow is working:

1. Launch the Tauri desktop app.
2. Create, save, load, reset, and export project files from Project File.
3. Configure exported guide marks in Export Options.
4. Search Steam and import real game metadata.
5. Edit project-owned metadata, including title, subtitle, Steam App ID, developer, publisher, release date, backup date, disc numbers, install notes, legal text, and rating fields.
6. Use Steam store artwork, Steam library artwork, Steam screenshots, local Steam screenshots, web artwork candidates, or local upload as the disc background where available.
7. Choose a physical disc template or custom dimensions.
8. Add title/logo artwork from Steam CDN logo assets when available or a custom upload.
9. Add additional artwork elements from local upload, imported Steam artwork, or local Steam screenshots where available.
10. Place the Steam-style banner lockup at the top or bottom, customize it, or hide it.
11. Add developer, publisher, and additional logo marks with upload, candidate discovery, layout, preview, export, and save/load support.
12. Add rating badges, media-format marks, operating-system marks, and technical/audio/codec marks with built-in generic or custom image sources.
13. Enable and style optional disc text, including title, subtitle, disc number, backup date, Steam App ID, developer, publisher, install notes, custom note, and copyright/legal text.
14. Use metadata-bound text defaults, manual overrides, style presets, optional text backplates/borders, straight text widths, layout presets, and centered curved legal text.
15. Use export preflight to review output dimensions and warnings before PNG export.
16. Export a clean 300 DPI PNG, optionally with guide marks.

Preview/export parity is a project rule. User-visible visual layers should use the shared layer order and matching preview/export behavior unless an intentional difference is documented.

## Current Features

- Tauri + React + TypeScript desktop app shell.
- Standard printable disc template support and custom disc dimensions with validation.
- Physical center hole, inner print boundary, outer print boundary, and safe-zone geometry.
- Live disc preview with labeled pane and stacked status toasts.
- Project File controls for New Project, Save Project, Load Project, and Export PNG.
- Export Options controls for optional guide marks.
- Steam search, metadata import, Steam store artwork, Steam library capsule/hero artwork, Steam screenshots, and local Steam screenshot discovery where available.
- Web artwork candidate discovery from Steam/official-site sources when useful metadata exists.
- Local background upload, background show/hide, drag, scale, fit, reset, and save/load behavior.
- Artwork panel ownership of imported artwork selection, local screenshots, web artwork candidates, game title/logo artwork, and additional artwork elements.
- Steam title/logo artwork seeding from Steam logo assets when available, plus custom game-logo upload and restore-to-Steam-default behavior.
- Additional artwork elements with labels, show/hide, local/Steam/local-screenshot sources, optional frames, drag, scale/position controls, reset/clear/delete, preview, export, and save/load behavior.
- Steam-style banner lockup with top, bottom, hidden placement, color controls, custom/default lockup image, text fallback, scale, offsets, preview, export, and save/load behavior.
- Developer, publisher, and additional logo assets with candidate discovery, upload, alignment presets, drag, scale/position controls, reset/clear/delete, preview, export, and save/load behavior.
- Optional rating badge support with ESRB/PEGI/USK/custom metadata, built-in or custom images, layout presets, drag, scale/position controls, preview, export, and save/load behavior; PEGI labels can also enable a separate companion USK badge.
- Optional media format mark support for Blu-ray, DVD, DVD-ROM, CD-ROM, data disc, and install disc.
- Operating-system marks for PC, Windows, Linux, SteamOS, and macOS, including Steam metadata inference where reliable.
- Technical marks for audio, surround, codec, middleware, and technology categories.
- Project-owned metadata, rating/legal candidate assistance, and metadata-bound disc text behavior.
- Optional disc text elements for title, subtitle, disc number, backup date, Steam App ID, developer, publisher, install notes, custom note, and copyright/legal text.
- Straight text dragging, scale, width, alignment, layout presets, visual-element avoidance, style presets, contrast, background, border, preview, export, and save/load persistence.
- Stable centered curved copyright/legal text with arc length, angle, inset, scale, side, wrapping, preview, export, and save/load persistence.
- Disc-number graphic badge mode using a bundled generic starter badge.
- Plain JSON project files, commonly named `.sbls.json`, with embedded data URLs for current visual assets and provenance/status metadata where supported.
- Export preflight summary and warnings for guide marks, missing backgrounds, unusual custom dimensions, enabled-but-unavailable visuals, and generic/bundled assets.
- Shared layer-order policy in `src/editor/layerOrder.ts` and documentation in `docs/DISC_EDITOR_LAYER_ORDER.md`.
- File-backed built-in assets route through `src/assets/assetManifest.ts`; official replacements live in domain folders under `src/assets/`, while true placeholder-named fallbacks remain under `src/assets/placeholders/`.

## Disc Editor Alpha Status

Issue #69 defined the disc-editor finish line and is now closed. The disc editor is alpha-capable when evaluated as its own product surface: it can represent the common visual structure of real game discs using project-owned generic assets, Steam-provided assets where available, or user-provided custom images.

The structural disc-face elements are now mostly represented:

- Background artwork.
- Dedicated game title/logo artwork.
- Rating and game-info marks.
- Developer, publisher, and additional logo marks.
- Legal/text systems.
- Steam banner/system branding.
- Technical/audio/codec marks.
- Media-format and operating-system marks.
- Additional artwork elements.

Remaining work is polish, validation, and future expansion rather than an indev blocker. Historical technology mark families (#125), Guide Legend relocation (#124), broader schema migration, packaging, and additional runtime smoke should continue as focused follow-up work.

Disabled optional visual features should hide dependent controls, should not render in preview or PNG export, and should preserve saved state so re-enabling restores previous selections, uploaded assets, layout, scale, source choices, and settings.

The expected optional visual control hierarchy is:

1. Show/enable checkbox.
2. Subordinate optional checkboxes.
3. Source/type/value controls.
4. Text/value inputs.
5. Upload/custom asset controls.
6. Placement/alignment presets.
7. Sliders/fine-tuning controls.
8. Reset/clear actions.

The project should not bundle official trademarked assets unless licensing is clearly safe. Built-in marks, badges, logos, and icons should be checked-in generic assets, while custom user images remain supported.

## Near-Term Work

- Treat #69 as the closed baseline for the disc-editor alpha finish line.
- Start the jewel case editor as the next major product surface; see #126 and `docs/JEWEL_CASE_EDITOR_ISSUE_DRAFT.md`.
- Keep built-in asset routing centralized, keep official replacements in domain folders under `src/assets/`, and keep true placeholder-named fallbacks under `src/assets/placeholders/`.
- Keep #124 separate: move Guide Legend into the live preview only when that issue is explicitly worked.
- Add or update fixture coverage for title artwork, additional artwork, technical marks, metadata-bound text, export preflight, and future case layouts so manual preview/export checks match the current feature set.
- Continue architecture cleanup tracked by open issues such as #44, #46, #47, and #48 only where it supports alpha work.
- Keep project asset packaging decisions in #56; the future `.sbls` package/container format is not implemented and should not block disc-editor alpha unless a concrete save/load limitation appears.
- Defer Guided Start (#17), DVD/Amaray and Blu-ray case editors, direct printer support, official asset packs, automatic rating lookup, full arbitrary layer management, and broad refactors unless they become necessary for a focused alpha blocker.

## Planned Platforms

Initial target platforms:

- Windows
- Linux

Possible future targets:

- Steam Deck desktop mode
- macOS
- Flatpak
- AppImage

## Tech Stack

- Tauri for the desktop shell.
- React for the user interface.
- TypeScript for safer app code.
- Rust through Tauri for native desktop features.

The original plan included Konva/React Konva for the visual editor. The current disc editor uses native React preview layers and canvas export logic. A richer layer/canvas system may still be added later if the editor grows beyond the current focused workflow.

## Documentation

See the `docs/` folder for:

- `CURRENT_STATUS.md` - concise implementation status and next issues.
- `PRD.md` - product requirements and product direction.
- `ROADMAP.md` - completed phases, current roadmap, and future work.
- `MILESTONES.md` - milestone boundaries and feature backlog.
- `JEWEL_CASE_EDITOR_ISSUE_DRAFT.md` - reviewed local planning mirror for jewel case editor issue #126.
- `ARCHITECTURE_GUARDRAILS.md` - hard implementation guardrails for future work.
- `REFACTOR_STATUS.md` - historical refactor status and remaining architecture risks.
- `PROJECT_FILE_SPEC.md` - current saved-project format notes.
- `DISC_EDITOR_LAYER_ORDER.md` - preview/export layer order source-of-truth notes.
- `CASE_INSERT_EDITOR_LAYER_ORDER.md` - jewel case preview/export layer order notes.
- `METADATA_DISC_TEXT_BINDING.md` - metadata-to-rendered-text binding behavior.
- `VISUAL_REGRESSION_WORKFLOW.md` - manual preview/export comparison workflow for fixture-based visual checks.
- `MANUAL_SMOKE_CHECKLISTS.md` - manual runtime smoke checklists for editor, artwork, branding, preview, save/load/export, and case insert flows.
- `CSS_STYLE_OWNERSHIP.md` - current stylesheet ownership, import order, and manual CSS smoke checklist.

## Disclaimer

Steam Backup Label Studio is an unofficial personal backup labeling tool. It is not affiliated with Valve Corporation or Steam. Game artwork, logos, ratings, and trademarks belong to their respective owners. Users are responsible for ensuring they have the right to use imported or uploaded assets.

## License

License not chosen yet.
