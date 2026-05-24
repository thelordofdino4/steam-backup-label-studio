# Current Project Status

Steam Backup Label Studio is currently in **pre-alpha**.

## Core Workflow Status

The current working interface is the **disc-label editor**.

The core disc-label workflow is working:

- Launch the Tauri desktop app.
- Search Steam for a real game.
- Import game metadata.
- Import available Steam artwork.
- Import Steam library capsule and hero artwork when available.
- Import Steam screenshot artwork and local Steam screenshots when available.
- Apply imported or local artwork as the disc background.
- Manage imported Steam artwork from the Artwork panel.
- Drag and resize the background artwork.
- Choose a standard printable disc template or custom dimensions.
- Use physical center hole, inner print boundary, outer print boundary, and safe-zone geometry.
- Use a real default Steam-style banner lockup at the top or bottom of the disc, or hide it.
- Enable optional disc text elements for title, disc number, backup date, Steam App ID, custom note, and copyright/legal text.
- Drag, scale, offset, and align straight text elements.
- Use stable centered curved copyright/legal text with arc length, angle, inset, scale, side, and wrapping controls.
- Save and reload project files.
- Export a clean 300 DPI PNG.
- Optionally export guide marks.
- Receive status feedback through the preview toast feed.

## Scope Reminder

The app is not close to full product completion yet. The current progress is focused on one of the planned interfaces: the disc-label editor.

Future planned interfaces still need to become functional:

- Jewel case insert editor.
- DVD/Amaray case cover editor.
- Blu-ray case cover editor.

Much of the current work should become reusable foundation for those interfaces, but shared foundation is not the same as finished template editors.

## Refactor Status

The emergency editor-foundation refactor tracked in issue #36 is **mostly complete but not ready to close yet**.

Completed high-risk refactor work includes:

- Shared disc text types/utilities consolidated outside `App.tsx`.
- Shared byte/base64 utility added for Steam and local artwork paths.
- Project file schema types and project JSON normalization landing point moved into `src/project/`.
- Tauri frontend file wrappers added in `src/tauri/fileSystem.ts`.
- PNG export rendering moved into `src/export/` modules.
- Toast ID generation cleaned up so lint has a clean baseline.
- `ProjectPanel`, `ExportOptionsPanel`, `TemplatePanel`, and `GuideLegendPanel` extracted as sidebar components.

Current validation:

- `npm run build` passes.
- `npm run lint` passes.
- Local app smoke testing has passed after pulling the current refactor work.

Remaining before closing issue #36:

- Extract the remaining sidebar panels: Game, Artwork, Branding, and Text.
- Extract the preview area into focused components.
- Decide whether hook extraction belongs in issue #36 or a follow-up cleanup.
- Decide whether CSS cleanup and Rust command-module cleanup belong in issue #36 or follow-up issues.

See `REFACTOR_STATUS.md` for the detailed closeout checklist.

## Recently Completed

- Physical disc geometry system.
- Custom disc dimensions with validation.
- Export pixel dimensions based on physical disc size at 300 DPI.
- Better Steam artwork scaling.
- Fixed preview layout so the disc remains visible while editing.
- Minimum desktop window size to prevent unusable layouts.
- Independently collapsible editor panels.
- Stale prototype UI cleanup.
- Meaningful Guide Legend.
- Custom crowbar panel toggle icon.
- Imported Steam artwork moved into the Artwork panel for the user-facing workflow.
- Steam library artwork discovery.
- Steam screenshot and local Steam screenshot discovery.
- Labeled preview pane.
- Top-right stacked preview toast notifications.
- Default Steam banner lockup image support.
- Steam banner export alignment matching the current mockup baseline.
- Optional disc text elements for title, disc number, backup date, Steam App ID, custom note, and copyright/legal text.
- Straight text drag, scale, offset, alignment, preview, export, and save/load support.
- Stable centered curved copyright/legal text with arc, angle, inset, scale, side, wrapping, preview, export, and save/load support.
- Straight copyright mode fixed to use normal straight-text positioning instead of curved inset positioning.
- Disc text helper logic extracted from `App.tsx` into a dedicated `src/discText.ts` module with no behavior changes.
- Disc geometry and export-guide selection helpers extracted from `App.tsx` into focused modules (`src/discGeometry.ts`, `src/exportGuides.ts`) as part of controlled editor-foundation refactoring.
- Project file schema helpers, Tauri file wrappers, PNG export rendering, and initial sidebar panels extracted from `App.tsx` as part of issue #36.
- GitHub Actions updated for Node 24 compatibility.
- Planning docs refreshed with milestone and backlog details.

## Active / Open Work

- Finish issue #36 refactor closeout.
- Add curved copyright text alignment modes without regressing stable centered curved text.
- Add adjustable straight text box widths.
- Add adjustable banner lockup scale and offset controls.
- Add user-facing banner color controls.
- Add New Project / Reset Project.
- Add export-time summary/preflight behavior.
- Add manual metadata fields and richer metadata overrides.
- Improve artwork picker presentation with thumbnails, asset type, origin, and dimensions.

## Deferred Alpha Cleanup

- Replace temporary toast text/symbol icons with polished action icons.
- Remove duplicate hidden UI markup created during conservative pre-alpha changes.
- Review panel indentation and structure.
- Complete component extraction for remaining sidebar and preview UI.
- Clean up duplicate CSS overrides once component boundaries settle.

## Current Known Limitations

- Only the disc-label editor is functional.
- Case templates are not implemented yet.
- Full layer management is not implemented yet.
- Manual metadata override fields are still limited.
- Curved copyright text is currently stable only in centered mode; left/right curved alignment is tracked separately.
- Straight text boxes have stable fixed widths, but user-adjustable box widths are not implemented yet.
- Banner colors exist as internal/default values, but user-facing color controls are not implemented yet.
- Banner lockup position/scale has a correct default baseline, but user-facing lockup adjustment controls are not implemented yet.
- Some duplicate hidden markup remains intentionally deferred until alpha cleanup.
- The app has not yet been packaged into an alpha release.

## Next Recommended Work Order

1. Finish issue #36 by extracting the remaining sidebar panels and preview UI components.
2. Add curved copyright alignment modes or explicitly keep centered curved text as the pre-alpha baseline.
3. Add adjustable straight text box widths.
4. Add adjustable banner lockup controls.
5. Add user-facing banner color controls.
6. Add New Project / Reset Project.
7. Add export summary/preflight warnings.
8. Add manual metadata fields and richer metadata overrides.
9. Improve artwork picker presentation.
10. Begin template-system abstraction for future case editors.
11. Prepare known issues and package the first alpha build when the disc-label path is stable enough.

See `MILESTONES.md` for the broader milestone and feature backlog.
