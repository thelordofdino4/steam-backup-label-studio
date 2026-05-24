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
- GitHub Actions updated for Node 24 compatibility.
- Planning docs refreshed with milestone and backlog details.

## Active / Open Work

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
- Refactor large JSX panels into cleaner components.
- Review panel indentation and structure.

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

1. Add curved copyright alignment modes or explicitly keep centered curved text as the pre-alpha baseline.
2. Add adjustable straight text box widths.
3. Add adjustable banner lockup controls.
4. Add user-facing banner color controls.
5. Add New Project / Reset Project.
6. Add export summary/preflight warnings.
7. Add manual metadata fields and richer metadata overrides.
8. Improve artwork picker presentation.
9. Begin template-system abstraction for future case editors.
10. Prepare known issues and package the first alpha build when the disc-label path is stable enough.

See `MILESTONES.md` for the broader milestone and feature backlog.
