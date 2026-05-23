# Roadmap

## Current State

Steam Backup Label Studio is in **pre-alpha**.

The core **disc-label** workflow is working: Steam search/import, artwork import, background drag/resize, physical disc geometry, custom dimensions, save/load, 300 DPI PNG export, optional guide export, collapsible editor panels, labeled live preview, and stacked preview toast notifications.

This does not mean the whole planned product is close to complete. The current working interface is the disc-label editor. Jewel case, DVD/Amaray, and Blu-ray case editors remain future planned interfaces.

The next stretch of work is focused on finishing the disc-label pre-alpha path, then preparing shared foundations for the other template interfaces.

See `MILESTONES.md` for the broader milestone and feature backlog.

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
- Add placeholder Steam Backup branding placement.
- Organize editor controls into independently collapsible panels.
- Move imported Steam artwork selection into the Artwork panel.
- Add labeled live preview.
- Add top-right stacked preview toast notifications.

Remaining:

- Replace the placeholder Steam Backup text badge with a real graphic/logo layer.
- Add a New Project / Reset Project action.
- Add a clearer layer model.
- Allow selecting layers.
- Allow dragging/resizing additional layer types beyond the background.
- Add basic layer properties panel.
- Add optional text elements such as copyright, backup date, disc number, and Steam App ID.

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

Future improvements:

- Replace the current JSON project file with a more robust package format if embedded artwork becomes too large.
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
- Apply imported artwork as disc background.
- Preserve imported metadata through save/load.
- Move imported artwork choices from the visible Game workflow into the Artwork panel.

Remaining:

- Add clearer manual metadata override fields.
- Improve artwork picker presentation with thumbnails, asset type, and dimensions.
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
- Update planning documents.

Current targets:

- Replace placeholder Steam Backup branding with a real logo layer.
- Add New Project / Reset Project.
- Add export summary/preflight behavior.

Deferred alpha cleanup:

- Remove duplicate hidden UI markup created during conservative pre-alpha changes.
- Polish preview toast action icons.
- Refactor large JSX panels into cleaner components when appropriate.

## Phase 8: Case Template Foundation — Upcoming

Goal: Prepare the code and UI for interfaces beyond the disc label editor.

Planned work:

- Add a template type selector.
- Define shared template model for disc, jewel case, DVD/Amaray, and Blu-ray layouts.
- Define shared region model for printable area, bleed, safe zones, spine, front, back, and named placement regions.
- Build shared project asset library.
- Build shared metadata model.
- Keep unavailable template interfaces clearly marked as incomplete until they can export usable files.

## Phase 9: Alpha Release — Upcoming

Goal: Package the first testable build with honest limitations.

Tasks:

- Build Windows package.
- Build Linux package.
- Add known issues list.
- Create first alpha release.
- Include clear limitations and legal/disclaimer notes.
- State which template interfaces are functional.

## Future Phases

- Guided Start and Blank Project opening screen.
- Jewel case templates.
- DVD/Amaray case templates.
- Blu-ray case templates.
- Screenshots and back-cover layouts.
- Rating badges.
- Developer and publisher logo placement.
- CDN/DVD/logo marks.
- Copyright block placement and generator.
- Spine text generator.
- Curved disc text.
- Multi-disc / Backup Set projects.
- Print calibration sheet.
- Direct printer support.
