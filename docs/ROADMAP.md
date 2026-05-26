# Roadmap

## Current State

Steam Backup Label Studio is in **pre-alpha**.

The core **disc-label** workflow is working: Steam search/import, store/library/screenshot artwork import, local artwork import, local Steam screenshot discovery, background drag/resize, physical disc geometry, custom dimensions, save/load, New Project reset, 300 DPI PNG export, optional guide export, collapsible editor panels, labeled live preview, stacked preview toast notifications, Steam-style banner lockup placement and controls, project-owned metadata, developer/publisher logo assets, rating badge support, optional straight disc text, and stable centered curved copyright/legal text.

This does not mean the whole planned product is close to complete. The current working interface is the disc-label editor. Jewel case, DVD/Amaray, and Blu-ray case editors remain future planned interfaces.

The emergency editor-foundation refactor tracked in issue #36 is complete and closed. High-risk editor foundations have been extracted from `App.tsx`, build/lint are clean, and local smoke testing has passed. Remaining cleanup is tracked separately in issues #44-#49 so feature work can continue without keeping the emergency refactor open.

The next stretch of work is focused on getting the **disc artwork editor alone** to alpha quality. This is not whole-app alpha. The disc editor is alpha-ready when a normal user can create, edit, save, reload, and export a print-ready disc label without needing GIMP, Krita, Photoshop, or another editor for ordinary backup-label work.

Issue #69 is the current finish-line definition for that boundary. The current editor should be preserved and evolved in place: Steam/manual metadata, background artwork, geometry, safe-zone guides, banner controls, developer/publisher logos, rating badges, media/platform mark work, disc text, New Project, save/load, export, preview, sidebar panels, and toast notifications are working launchpad systems, not a reason to restart from zero.

The disc editor is not yet alpha-complete because it still needs real-world disc-art composition features: dedicated title/logo art, additional artwork/logo elements, multiple marks beyond the fixed developer/publisher slots, file-backed generic built-in assets instead of generated placeholders, text behavior that can respect visual element boundaries, safe-zone enforcement, layer-order parity, expanded export preflight, metadata-to-rendered-text behavior, and toast wording/icon polish.

See `MILESTONES.md` for the broader milestone and feature backlog. See `REFACTOR_STATUS.md` for the issue #36 completion summary and follow-up cleanup notes.

## Phase 0: Planning Foundation — Complete

Goal: Make the repository understandable and ready for implementation.

Completed:

- Add README.
- Add PRD.
- Add roadmap.
- Add starter GitHub issues.
- Add current status document.
- Add milestone and feature backlog document.

Still useful later:

- Add dedicated template notes once template support expands beyond disc labels.
- Add dedicated project file notes once the project format stabilizes.

## Phase 1: Project Scaffold — Complete

Goal: Create a basic desktop app that launches on Windows and Linux.

Completed:

- Scaffold Tauri + React + TypeScript app.
- Set app name to Steam Backup Label Studio.
- Add basic app shell.
- Confirm the app runs locally.
- Add CI build workflow.
- Update GitHub Actions for Node 24 compatibility.

## Phase 2: Blank Disc Preview — Complete

Goal: Render the first disc label template.

Completed:

- Add standard printable disc template data.
- Draw outer disc boundary.
- Draw physical center hole.
- Draw inner print boundary.
- Draw outer print boundary.
- Draw safe zone guide.
- Draw non-printable hub region.
- Scale preview to fit the editor window.
- Set minimum desktop window size to prevent unusable layouts.

## Phase 3: Basic Editor — Partially Complete

Goal: Add the first editable design layers.

Completed:

- Add background image layer.
- Allow dragging background artwork.
- Allow resizing background artwork.
- Add reset behavior for background image placement.
- Add Steam-style banner branding placement with a real default lockup asset.
- Add adjustable banner lockup scale and offset controls.
- Add user-facing banner color controls.
- Organize editor controls into independently collapsible panels.
- Move imported Steam artwork selection into the Artwork panel.
- Add labeled live preview.
- Add top-right stacked preview toast notifications.
- Add optional straight disc text elements: title, disc number, backup date, Steam App ID, custom note, and copyright/legal text.
- Add stable centered curved copyright/legal text with arc length, angle, inset, scale, side, and wrapping controls.
- Preserve text settings through save/load and PNG export.
- Add developer/publisher logo assets with alignment presets.
- Add rating badge support with placeholders and custom image replacement.
- Add a New Project / Reset Project action.

Remaining:

- Add dedicated title/logo art support.
- Add general artwork/logo element insertion with upload/source, show/hide, placement, scale, save/load, and export.
- Support multiple logos/marks beyond the fixed developer/publisher slots.
- Replace generated user-facing placeholder boxes with real checked-in generic asset files.
- Add text behavior that can optionally respect nearby visual element boundaries while always respecting the disc safe-zone boundary.
- Add curved copyright alignment modes only if they do not regress the stable centered curved text behavior; otherwise formally keep centered-only curved text as the alpha-supported baseline.
- Add adjustable straight text box widths.
- Constrain movable elements to safe-zone geometry.
- Add a clearer layer model.
- Allow selecting layers.
- Allow dragging/resizing additional layer types beyond the background and current text/banner/logo/badge controls.
- Add basic layer properties panel if needed for the alpha element model.

## Phase 4: Project Save and Load — Complete for Current Disc-Label MVP

Goal: Make work persistent.

Completed:

- Save project to local file.
- Load project from local file.
- Restore template choice.
- Restore custom dimensions.
- Restore game metadata.
- Restore embedded background artwork.
- Restore background scale and offset.
- Restore Steam Backup logo placement.
- Restore export guide settings.
- Restore banner lockup settings currently supported by the editor.
- Restore optional disc text settings, values, layout, and curved copyright settings.
- Restore project-owned metadata, logo assets, rating badge settings, and New Project defaults.
- Move project schema/type definitions into `src/project/` as part of issue #36.
- Add a project JSON normalization landing point for future migrations.

Future improvements:

- Current saved projects are plain JSON, commonly named like `.sbls.json`.
- A future `.sbls` package/container format may replace or complement JSON if embedded artwork becomes too large or portability becomes a blocker.
- Do not imply `.sbls` package support exists today.
- Do not treat the future package format as a disc-editor alpha blocker unless a specific save/load limitation appears.
- Document project schema once it stabilizes.
- Add migration handling for future project schema versions.

## Phase 5: Export — Complete for Current Disc-Label MVP

Goal: Produce a usable print file.

Completed:

- Export 300 DPI PNG.
- Preserve physical template dimensions.
- Scale export pixel size from selected/custom physical disc dimensions.
- Cut out the physical center hole.
- Hide editor-only guides by default.
- Add optional guide export controls.
- Support guide export for center hole, outer edge, printable area, and safe zone.
- Export the Steam-style banner lockup.
- Export optional straight text elements.
- Export stable centered curved copyright/legal text.
- Move PNG export rendering into focused `src/export/` modules as part of issue #36.

Future improvements:

- Add export-time summary/preflight.
- Add richer export presets.
- Add print calibration output.
- Add direct printer support later.

## Phase 6: Steam Import — Complete for Current Disc-Label MVP

Goal: Bring in basic Steam metadata and artwork.

Completed:

- Add game search UI.
- Search real Steam results.
- Import title and basic metadata.
- Import artwork options when available.
- Import Steam store artwork.
- Import Steam library capsule and hero artwork when available.
- Import Steam screenshots and local Steam screenshots when available.
- Apply imported artwork as disc background.
- Preserve imported metadata through save/load.
- Populate editable project-owned metadata from imported Steam values where available.
- Move imported artwork choices from the visible Game workflow into the Artwork panel.
- Consolidate shared byte/base64 helper usage for Steam and local artwork paths.

Remaining:

- Improve artwork picker presentation with thumbnails, asset type, origin, and dimensions.
- Build a shared project asset library for future template interfaces.

## Phase 7: Pre-Alpha Cleanup and UI Polish — In Progress

Goal: Make the working disc-label prototype feel like an intentional editor.

Completed:

- Remove stale prototype UI elements.
- Replace stale build/status text.
- Align package/app version metadata.
- Improve Guide Legend with meaningful explanations.
- Replace the default collapse/expand glyph with a custom crowbar element.
- Add a labeled preview pane.
- Add a TF2-style top-right stacked toast notification feed in the preview pane.
- Move imported artwork management into the Artwork panel.
- Add real default Steam banner lockup image support.
- Add user-facing Steam banner color, lockup image, scale, and offset controls.
- Add adjustable basic disc text and stable centered curved copyright/legal text.
- Add project-owned metadata, developer/publisher logo assets, logo alignment presets, rating badge support, and New Project reset behavior.
- Establish a clean `npm run build` and `npm run lint` baseline after initial refactor work.
- Extract sidebar panels into presentational components.
- Extract preview UI into focused components.
- Complete and close issue #36.
- Update planning documents.

Current targets:

- Use issue #69 as the finish-line definition for disc-editor alpha.
- Add dedicated title/logo art support.
- Add general additional artwork/logo element support.
- Support multiple logo/mark elements beyond the fixed developer/publisher slots.
- Replace generated user-facing placeholders with real file-backed generic assets.
- Add text behavior that can avoid or respect visual element boundaries, while disc safe-zone compliance is always enforced.
- Polish toast wording and replace temporary toast symbols/icons.
- Constrain movable visual elements to safe-zone geometry.
- Clarify metadata-to-rendered-text behavior.
- Document and enforce preview/export layer ordering.
- Expand export summary/preflight behavior for logos, marks, text collisions, guide marks, backgrounds, custom dimensions, missing assets, and enabled-but-unavailable dependencies.
- Add curved copyright alignment modes only if safe; otherwise explicitly keep centered curved text as the alpha baseline.
- Add adjustable straight text box widths and layout presets if manual placement remains too fiddly.
- Improve artwork picker presentation.

Deferred alpha cleanup:

- Remove duplicate hidden UI markup created during conservative pre-alpha changes.
- Clean duplicate CSS overrides once component boundaries settle.
- Continue post-refactor cleanup tracked in issues #44-#49, including hook extraction, helper extraction, CSS organization, Rust command organization, toast-symbol polish, and project schema validation/migrations.

## Phase 8: Case Template Foundation — Deferred Until Disc Editor Alpha

Goal: Prepare the code and UI for interfaces beyond the disc label editor.

Planned work:

- Add a template type selector.
- Define shared template model for disc, jewel case, DVD/Amaray, and Blu-ray layouts.
- Define shared region model for printable area, bleed, safe zones, spine, front, back, and named placement regions.
- Build shared project asset library.
- Build shared metadata model.
- Keep unavailable template interfaces clearly marked as incomplete until they can export usable files.

## Phase 9: Disc Editor Alpha Release — Upcoming

Goal: Package the first testable build with honest limitations, with the disc editor as the first alpha surface. This must not imply the whole app is alpha or that jewel/DVD/Blu-ray case editors are ready.

Tasks:

- Build Windows package.
- Build Linux package.
- Add known issues list.
- Create first disc-editor alpha release.
- Include clear limitations and legal/disclaimer notes.
- State which template interfaces are functional.

## Future Phases

- Guided Start and Blank Project opening screen. Guided Start should wait until the editor systems are stable; it is closer to a last step before beta than a blocker for disc-editor alpha.
- Jewel case templates.
- DVD/Amaray case templates.
- Blu-ray case templates.
- Screenshots and back-cover layouts.
- Optical media logo marks.
- Copyright block placement and generator.
- Spine text generator.
- Advanced curved disc text alignment.
- Multi-disc / Backup Set projects.
- Print calibration sheet.
- Direct printer support.
