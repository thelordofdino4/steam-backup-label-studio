# Current Project Status

Steam Backup Label Studio is currently in **pre-alpha**.

## Core Workflow Status

The core disc-label workflow is working:

- Launch the Tauri desktop app.
- Search Steam for a real game.
- Import game metadata.
- Import available Steam artwork.
- Apply imported or local artwork as the disc background.
- Drag and resize the background artwork.
- Choose a standard printable disc template or custom dimensions.
- Use physical center hole, inner print boundary, outer print boundary, and safe-zone geometry.
- Save and reload project files.
- Export a clean 300 DPI PNG.
- Optionally export guide marks.

## Recently Completed

- Physical disc geometry system.
- Custom disc dimensions with validation.
- Export pixel dimensions based on physical disc size at 300 DPI.
- Better Steam artwork scaling.
- Fixed preview layout so the disc remains visible while editing.
- Minimum desktop window size to prevent unusable layouts.
- Independently collapsible editor panels.

## Active / Open Work

- Replace the temporary Steam Backup text badge with a real graphic/logo layer.
- Move imported artwork management from the Game panel into the Artwork panel.
- Clean up stale prototype UI elements.
- Remove the mock search fallback.
- Improve the Guide Legend.
- Add a labeled preview pane.
- Add a top-right TF2-style stacked toast notification feed with semi-transparent event icons.
- Improve panel collapse/restore icon styling.

## Current Known Limitations

- The Steam Backup logo is still a generated text placeholder.
- Artwork choices currently appear in the Game panel instead of the Artwork panel.
- The Guide Legend is not yet visually meaningful.
- Full layer management is not implemented yet.
- Manual metadata override fields are still limited.
- Case templates are not implemented yet.
- The app has not yet been packaged into an alpha release.

## Next Recommended Work Order

1. Finish the cleanup issue for stale prototype UI elements.
2. Move imported artwork selection into the Artwork panel.
3. Add the preview title and notification feed.
4. Replace the temporary Steam Backup badge with a real logo layer.
5. Add manual metadata fields and text elements.
6. Prepare known issues and package the first alpha build.
