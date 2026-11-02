# Steam Backup Label Studio
> Status: Authoritative overview.
> Purpose: Product summary, current feature surface, and top-level repository orientation.
> Read when: Always, before repository work.
> Authoritative source: Product/scope details defer to docs/PRD.md; architecture details defer to docs/SOFTWARE_DESIGN_DOCUMENT.md.
> Current-state corrections reviewed against `923f7b7fcbfa6569439e26ba049c265816a1db65` on 2026-11-02; no new native acceptance is claimed.


A desktop app for designing Steam backup disc labels and jewel case inserts for personal Steam backup media. Windows is the exercised native development target; broader platform goals and acceptance are separate below.

## Project Goal

Steam Backup Label Studio helps users create consistent, good-looking labels and case inserts for personal Steam game backup media.

The current app is a Steam backup disc-label editor with an active jewel case insert editor surface. It can import Steam metadata and artwork where available, combine that with local/user-provided assets, preserve real disc and case geometry, save projects, and export print-ready PNG files. The disc editor is alpha-capable; the jewel case editor remains active but not alpha-complete.

## Project Philosophy

Steam Backup Label Studio is not intended to replace GIMP, Photoshop, Krita, or a full image editor.

The goal is to eliminate the most repetitive parts of making personal Steam backup labels: searching for game artwork, hunting for templates, lining up disc geometry, resizing images by hand, adding repeated branding, adding common label text, and repeating the same setup work for every game.

A user who wants a basic backup disc label should be able to choose a template, search for a game, select artwork, make small placement adjustments, add optional label text/marks, save, and export a printable result in five minutes or less.

Blank-project workflows must remain supported. A user should be able to upload one image and export without being forced through a checklist. Guided help belongs in a future Guided Start flow or in export-time summaries and warnings.

## Current Status

The **disc-label editor** is now past the indev finish line and is the first alpha-capable surface. A normal user can create, edit, save, reload, and export a print-ready disc label without needing another editor for ordinary backup-label work.

The broader product is still early because the jewel case editor is active but not alpha-complete, and DVD/Amaray and Blu-ray case editors are not implemented yet. The next major milestone remains the **jewel case editor** finish line tracked by #126.

Issue #69 is closed as the disc-editor alpha finish-line tracker. The large-file refactor tracker (#266) is also closed after merge commit `6feb262bed2abd36b1371e5c0674013018132d16`. Ongoing polish and future expansion remain tracked separately, including historical mark catalog expansion (#125), the closed schema/migration baseline (#48), the closed project-packaging decision (#56) now specified by `docs/PROJECT_PACKAGE_FORMAT_CONTRACT.md`, and architecture cleanup (#44, #46, #47).

Do not treat historical "recent validation" notes in older docs as proof that native/Tauri manual smoke has happened for the current checkout. For this docs pass, no `npm run tauri dev` verification is claimed.

## Current Editor Navigation

At source baseline `923f7b7f`, Disc setup panels are Project File → Export Options → Template → Game → Steam Branding → Disc Layout Presets, followed by packaging-role panels. Case has surface tabs, Project File → Export Options → Template → Case Layout Presets → Game, dedicated Steam branding, and surface-specific role panels. Tools launchers reveal/focus existing workflow owners through a shared host; sidebar presentations remain available when their workflow is not hosted there.

Guide Legend is already a preview-local, collapsible app-shell panel in both editors; #124 is closed. It is not saved design content or exported artwork. Earlier sidebar-order descriptions in historical notes and agent instructions are not the current component inventory. This documentation correction does not reorder controls or relax the instruction against unrelated UI changes. See the [current behavior map](docs/README.md#current-behavior-at-the-reconciled-baseline) for source owners.

## Current Disc-Label Workflow

The core disc-label workflow is working:

1. Launch the Tauri desktop app.
2. Create, save, load, reset, and export project files from Project File.
3. Configure exported guide marks in Export Options.
4. Search Steam and import real game metadata.
5. Edit project-owned metadata, including title, subtitle, Steam App ID, developer, publisher, release date, backup date, disc numbers, install notes, legal text, and rating fields.
6. Use Steam store artwork, Steam library artwork, Steam screenshots, local Steam screenshots, web artwork candidates, or local upload as the disc background where available.
7. Choose a physical disc template or custom dimensions.
8. Add title/logo artwork from current Steam title/logo assets when available or a custom upload.
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
- Role-panel ownership of imported artwork selection, local screenshots, web artwork candidates, game title/logo artwork, and additional artwork elements.
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
- Disc-number graphic badge mode using a built-in starter badge.
- Production Open recognizes content rather than extensions and opens both ZIP-compatible `.sbls` v1 packages and legacy plain `.json`/`.sbls.json` imports. Production Save and Save As write `.sbls` v1 packages only.
- Export preflight summary and warnings for guide marks, missing backgrounds, unusual custom dimensions, enabled-but-unavailable visuals, and print/readability risks.
- Preview Design Check separates notification-worthy design omissions from lower-risk print-quality notes, so the badge count is reserved for issues such as missing required artwork, marks, logos, titles, or text.
- Shared layer-order policy in `src/editor/layerOrder.ts` and documentation in `docs/DISC_EDITOR_LAYER_ORDER.md`.
- File-backed built-in assets route through `src/assets/assetManifest.ts`; official replacements live in domain folders under `src/assets/`, while true placeholder-named fallbacks remain under `src/assets/placeholders/`.

Built-in/default app assets are valid first-party artwork and must not generate warnings merely because they are built in.

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

Remaining work is polish, validation, and future expansion rather than an indev blocker. Historical technology mark families (#125), remaining schema/package limits, and additional runtime smoke continue as focused follow-up work. Guide Legend relocation (#124) is implemented and closed.

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
- Continue the active jewel case editor toward alpha completion; see #126 and the product/architecture boundaries in `docs/PRD.md` and `docs/SOFTWARE_DESIGN_DOCUMENT.md`. The older local issue mirror is archived at `docs/archive/JEWEL_CASE_EDITOR_ISSUE_DRAFT.md`.
- Keep built-in asset routing centralized, keep official replacements in domain folders under `src/assets/`, and keep true placeholder-named fallbacks under `src/assets/placeholders/`.
- Preserve the implemented preview-local Guide Legend; #124 is closed. New placement changes require their own scoped work.
- Add or update fixture coverage for title artwork, additional artwork, technical marks, metadata-bound text, export preflight, and future case layouts so manual preview/export checks match the current feature set.
- Continue architecture cleanup tracked by open issues such as #44, #46, and #47 only where it supports alpha work; #48 is the closed schema-validation/migration baseline, and future schema work follows `docs/PROJECT_FILE_SPEC.md`.
- Use `docs/PROJECT_PACKAGE_FORMAT_CONTRACT.md` as the package authority; closed issue #56 remains the historical ZIP-container decision record. Codec, bounded native recognition/read/decode, shared immutable staging, session format identity, authoritative current-project and exact route synchronization, package Open/Save/Save As, the shared dirty-aware New/Open replacement guard, Home Return/Resume, and shared command feedback are source-connected. Close/termination guarding and native Tauri workflow acceptance remain future work.
- Defer Guided Start (#17), DVD/Amaray and Blu-ray case editors, direct printer support, official asset packs, automatic rating lookup, full arbitrary layer management, and broad refactors unless they become necessary for a focused alpha blocker.

## Platform Targets And Acceptance

Windows and Linux are product targets. Windows native development and focused historical smoke have been exercised; neither those runs nor a frontend build establish packaged release acceptance for this checkout. Linux native menus/input/packaging remain tracked by #333, macOS by #334, and release/support acceptance by #376/#382. Steam Deck desktop mode, macOS, Flatpak, and AppImage remain possible future targets or distribution formats, not supported-release promises.

The existing CI builds the frontend on Ubuntu and runs Rust/native checks on Windows. See [CI](.github/workflows/ci.yml) and the [validation inventory](docs/TEST_ORACLE_INVENTORY.md).

## Tech Stack

- Tauri for the desktop shell.
- React for the user interface.
- TypeScript for safer app code.
- Rust through Tauri for native desktop features.

The original plan included Konva/React Konva for the visual editor. The current disc editor uses native React preview layers and canvas export logic. A richer layer/canvas system may still be added later if the editor grows beyond the current focused workflow.

## Documentation

Start with `docs/README.md`. It maps active, conditional, historical, and merged documentation and explains which document wins when older notes conflict with current guidance.

The most common active references are:

- `docs/SOFTWARE_DESIGN_DOCUMENT.md` - authoritative architecture contracts.
- `docs/PRD.md` - product requirements and scope.
- `docs/PROJECT_FILE_SPEC.md` - current saved-project format notes.
- `docs/REPO_ARCHITECTURE_INVENTORY.md` - as-built source ownership map.
- `docs/TEXT_EDITOR_CONTRACT.md` - protected contract and regression gate for preview-mounted text editing.
- `docs/ARTWORK_FRAME_MATERIAL_CONTRACT.md` - failed material-branch postmortem and restart guardrails for artwork-frame material rendering.
- `docs/TEXT_EDITOR_SMOKE_AUTOMATION.md` - native Tauri text-editor smoke pilot guide and diagnostic browser route notes.

## Disclaimer

Steam Backup Label Studio is an unofficial personal backup labeling tool. It is not affiliated with Valve Corporation or Steam. Game artwork, logos, ratings, and trademarks belong to their respective owners. Users are responsible for ensuring they have the right to use imported or uploaded assets.

## License

The repository includes an [MIT license text](LICENSE). The application Cargo manifest still has an empty license field; release metadata and attribution reconciliation remain tracked by #381/#376. Vendored codec notices are separate and retained under [vendor/LICENSES](src-tauri/crates/sbls-package-codec/vendor/LICENSES/). This documentation correction does not change any license or release policy.
