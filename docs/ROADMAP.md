# Roadmap

Last refreshed: 2026-05-31.

## Current State

Steam Backup Label Studio is in **pre-alpha**.

The current working interface is the **disc-label editor**. It is now a Steam backup disc-label editor with a real-disc-art workflow: Steam/manual metadata, Steam and local artwork sources, real disc geometry, background editing, title/logo artwork, additional artwork, Steam banner branding, developer/publisher/additional logos, rating badges, media marks, operating-system marks, technical marks, optional text systems, export preflight, save/load, and 300 DPI PNG export.

This does not mean the whole planned product is close to complete. Jewel case, DVD/Amaray, and Blu-ray case editors remain future planned interfaces.

The next stretch of work remains focused on getting the **disc artwork editor alone** to alpha quality. This is not whole-app alpha. Issue #69 remains the parent finish-line definition for that boundary.

The current editor should be preserved and evolved in place. Steam/manual metadata, artwork import, title artwork, additional artwork, background placement, geometry, safe-zone guides, banner controls, logo/badge/mark systems, disc text, export preflight, New Project, save/load, export, preview, sidebar panels, and toast notifications are working launchpad systems.

Do not claim current native/Tauri manual smoke unless it has actually been run for the current checkout. This documentation update does not include `npm run tauri dev`.

## Current Sidebar Flow

The intended main sidebar flow is:

Project File → Export Options → Game → Template → Artwork → Branding → Text → Guide Legend

Guide Legend remains a sidebar section for now. Issue #124 tracks moving it to a collapsible, open-by-default bottom-right panel inside the live preview. Export Options should not move as part of that future issue.

## Issue Tracker Context

Open issues most relevant to this roadmap:

- #69 - parent real-disc-art alpha finish line.
- #124 - move Guide Legend into the live preview.
- #125 - add historical technology mark catalog and missing mark families.
- #56 - decide embedded asset strategy and future `.sbls` package format.
- #48 - add project schema validation and migration support.
- #47 - review Rust Tauri command module organization.
- #46 - organize CSS after component extraction.
- #44 - extract remaining editor state into focused hooks.
- #17 - design future Guided Start / Blank Project opening screen.

Recently completed issue work that should not be described as missing:

- #33, #59, #60, #61, #62, #63, #65, #66, #68, #82-#85, #95, #96, #97, #98, #99, and #123.

## Phase 0: Planning Foundation - Complete

Goal: Make the repository understandable and ready for implementation.

Completed:

- Add README.
- Add PRD.
- Add roadmap.
- Add starter GitHub issues.
- Add current status document.
- Add milestone and feature backlog document.
- Add architecture guardrails, layer-order docs, metadata-bound text docs, project-file notes, and visual regression workflow docs.

Still useful later:

- Add dedicated template notes once template support expands beyond disc labels.
- Add dedicated project format notes once the project format stabilizes beyond plain JSON.

## Phase 1: Project Scaffold - Complete

Goal: Create a basic desktop app that launches on Windows and Linux.

Completed:

- Scaffold Tauri + React + TypeScript app.
- Set app name to Steam Backup Label Studio.
- Add basic app shell.
- Confirm the app runs locally during earlier setup work.
- Add CI build workflow.
- Update GitHub Actions for Node 24 compatibility.

## Phase 2: Blank Disc Preview - Complete

Goal: Render the first disc label template.

Completed:

- Add standard printable disc template data.
- Draw outer disc boundary.
- Draw physical center hole.
- Draw inner print boundary.
- Draw outer print boundary.
- Draw safe-zone guide.
- Draw non-printable hub region.
- Scale preview to fit the editor window.
- Set minimum desktop window size to prevent unusable layouts.

## Phase 3: Basic Disc Editor - Mostly Complete For Current Alpha Path

Goal: Add the first editable disc design layers and controls.

Completed:

- Background image layer with upload, drag, scale, fit, reset, show/hide, save/load, and export.
- Steam-style banner branding with placement, colors, custom/default lockup image, scale, offsets, save/load, and export.
- Imported Steam artwork selection moved into the Artwork panel.
- Web artwork candidate discovery and preview picker.
- Game title/logo artwork from Steam logo assets or custom upload.
- Additional artwork elements with local, Steam artwork, and local Steam screenshot sources.
- Developer/publisher logo assets, additional logo marks, candidate discovery, alignment presets, drag/manual positioning, upload/custom image, reset/clear/delete, save/load, preview, and export.
- Rating badge support with metadata, layout presets, generic/custom images, drag/manual positioning, upload/custom image, reset/clear, save/load, preview, and export.
- Media format marks.
- Operating-system marks with reliable Steam appdetails inference where available.
- Technical/audio/codec/middleware/technology marks.
- Optional straight disc text, metadata-bound text, style presets, layout presets, widths, visual avoidance, and centered curved copyright/legal text.
- Disc-number graphic badge mode.
- Independently collapsible sidebar sections.
- Labeled live preview and stacked preview toast notifications.

Remaining:

- Keep built-in/default/generic visual assets organized and routed through `src/discPlaceholderAssets.ts`.
- Keep the optional-feature hierarchy and disabled-state preservation consistent across future visual systems.
- Improve fixture/manual smoke coverage for newer systems.
- Continue architecture cleanup where it directly supports alpha risk reduction.

## Phase 4: Project Save and Load - Complete For Current Disc-Label MVP

Goal: Make work persistent.

Completed:

- Save project to a local plain JSON file, commonly named `.sbls.json`.
- Load project from a local JSON file.
- Restore template choice and custom dimensions.
- Restore selected Steam game metadata and project-owned metadata.
- Restore embedded background artwork and layout settings.
- Restore Steam banner settings.
- Restore title artwork, additional artwork, logo assets, rating badge, media/platform/technical marks, disc-number artwork, and disc text state where supported by the current schema.
- Restore export guide settings.
- Normalize sparse/legacy project data through `src/project/`.

Future improvements:

- The future `.sbls` package/container format may replace or complement JSON if embedded artwork size, portability, or migration behavior becomes a blocker.
- Do not imply package support exists today.
- Do not treat the future package format as a disc-editor alpha blocker unless a specific save/load limitation appears.
- Add schema validation and migration support (#48).

## Phase 5: Export - Complete For Current Disc-Label MVP

Goal: Produce a usable print file.

Completed:

- Export 300 DPI PNG.
- Preserve physical template dimensions.
- Scale export pixel size from selected/custom physical disc dimensions.
- Cut out the physical center hole.
- Hide editor-only guides by default.
- Add optional guide export controls.
- Export background, additional artwork, Steam banner, title artwork, logos, rating badge, media mark, operating-system marks, technical marks, disc text, and optional guide marks.
- Centralize layer order through `src/layerOrder.ts`.
- Add export preflight summary and warnings.

Future improvements:

- Add richer export presets.
- Add print calibration output.
- Add direct printer support later.

## Phase 6: Steam Import - Complete For Current Disc-Label MVP

Goal: Bring in useful Steam metadata and artwork.

Completed:

- Add game search UI.
- Search real Steam results.
- Import title and basic metadata.
- Import store artwork, library capsule/hero artwork, screenshots, and logo artwork where available.
- Import Steam screenshots and local Steam screenshots when available.
- Seed title/logo artwork from Steam logo assets when available.
- Infer operating-system marks from reliable Steam appdetails platform flags.
- Load rating/legal candidates from Steam sources and allow manual application.
- Populate editable project-owned metadata from imported values where available.
- Preserve imported metadata through save/load.

Remaining:

- Keep improving candidate confidence/copy without pretending automatic rating lookup is complete.
- Build a shared project asset library only when it is needed for case editors or packaging work.

## Phase 7: Real-Disc-Art Alpha Polish - In Progress

Goal: Make the disc-label editor intentional enough for a first alpha package.

Completed:

- Remove stale prototype UI elements.
- Improve Guide Legend content.
- Replace default collapse/expand glyph with a custom panel toggle.
- Add labeled preview pane and toast feed.
- Add real default Steam banner lockup image support.
- Add user-facing banner controls.
- Add metadata-bound text, style/layout controls, and export parity work.
- Add title artwork, additional artwork, multiple logos, media/platform/technical marks, and export preflight.
- Establish architecture guardrails and layer-order policy.

Current targets:

- Fill missing technical mark families tracked by #125.
- Keep #124 scoped as a separate UI relocation issue.
- Add/update fixture coverage for newer real-disc-art systems.
- Keep optional visual hierarchy consistent.
- Continue architecture cleanup and schema migration work where it reduces alpha risk.
- Prepare known issues and packaging only after non-interactive validation and manual runtime smoke are honestly complete.

## Phase 8: Case Template Foundation - Deferred Until Disc Editor Alpha

Goal: Prepare the code and UI for interfaces beyond the disc label editor.

Planned work:

- Add a template type selector.
- Define shared template model for disc, jewel case, DVD/Amaray, and Blu-ray layouts.
- Define shared region model for printable area, bleed, safe zones, spine, front, back, and named placement regions.
- Build shared project asset library.
- Build shared metadata model.
- Keep unavailable template interfaces clearly marked as incomplete until they can export usable files.

## Phase 9: Disc Editor Alpha Release - Upcoming

Goal: Package the first testable build with honest limitations, with the disc editor as the first alpha surface. This must not imply the whole app is alpha or that jewel/DVD/Blu-ray case editors are ready.

Tasks:

- Finish remaining #69-linked alpha work.
- Build Windows package.
- Build Linux package.
- Add known issues list.
- Create first disc-editor alpha release.
- Include clear limitations and legal/disclaimer notes.
- State which template interfaces are functional.
- Record validation honestly, including whether native/Tauri manual smoke was performed.

## Future Phases

- Guided Start and Blank Project opening screen (#17).
- Jewel case templates.
- DVD/Amaray case templates.
- Blu-ray case templates.
- Screenshots and back-cover layouts.
- Copyright block placement and generator.
- Spine text generator.
- Advanced multi-disc / Backup Set projects.
- Print calibration sheet.
- Direct printer support.
