# Current Project Status

Steam Backup Label Studio is currently in **pre-alpha**.

## Core Workflow Status

The current working interface is the **disc-label editor**.

The core disc-label workflow is working:

- Launch the Tauri desktop app.
- Search Steam for a real game.
- Import game metadata.
- Import available Steam artwork.
- Apply imported or local artwork as the disc background.
- Manage imported Steam artwork from the Artwork panel.
- Drag and resize the background artwork.
- Choose a standard printable disc template or custom dimensions.
- Use physical center hole, inner print boundary, outer print boundary, and safe-zone geometry.
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
- Labeled preview pane.
- Top-right stacked preview toast notifications.
- GitHub Actions updated for Node 24 compatibility.
- Planning docs refreshed with milestone and backlog details.

## Active / Open Work

- Replace the temporary Steam Backup text badge with a real graphic/logo layer.
- Add New Project / Reset Project.
- Add export-time summary/preflight behavior.
- Add manual metadata fields and basic text elements.
- Improve artwork picker presentation with thumbnails, asset type, and dimensions.

## Deferred Alpha Cleanup

- Replace temporary toast text/symbol icons with polished action icons.
- Remove duplicate hidden UI markup created during conservative pre-alpha changes.
- Refactor large JSX panels into cleaner components.
- Review panel indentation and structure.

## Current Known Limitations

- The Steam Backup logo is still a generated text placeholder.
- Full layer management is not implemented yet.
- Manual metadata override fields are still limited.
- Case templates are not implemented yet.
- Some duplicate hidden markup remains intentionally deferred until alpha cleanup.
- The app has not yet been packaged into an alpha release.

## Next Recommended Work Order

1. Replace the temporary Steam Backup badge with a real logo layer.
2. Add New Project / Reset Project.
3. Add export summary/preflight warnings.
4. Add manual metadata fields and basic text elements.
5. Begin template-system abstraction for future case editors.
6. Prepare known issues and package the first alpha build.

See `MILESTONES.md` for the broader milestone and feature backlog.
