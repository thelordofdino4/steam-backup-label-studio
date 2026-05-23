# Steam Backup Label Studio

A cross-platform desktop app for designing print-ready Steam backup disc labels and, eventually, case artwork for personal Steam backup media.

## Project Goal

Steam Backup Label Studio helps users create consistent, good-looking labels and case inserts for personal Steam game backup media.

The app lets users choose a physical disc template, import Steam game metadata and artwork where available, manually adjust artwork placement, save projects, and export print-ready image files.

## Project Philosophy

Steam Backup Label Studio is not intended to replace GIMP, Photoshop, Krita, or a full image editor.

The goal is to eliminate the most manual parts of making personal Steam backup labels: searching for game artwork, hunting for templates, lining up disc geometry, resizing images by hand, and repeating the same setup work for every game.

A user who wants a basic backup disc label should be able to choose a template, search for a game, select artwork, make small placement adjustments, and export a printable result in five minutes or less.

## Current Status

Steam Backup Label Studio is currently in **pre-alpha**.

The core disc-label workflow is working:

1. Launch the Tauri desktop app.
2. Search Steam and import real game metadata.
3. Select imported Steam artwork or upload local artwork.
4. Drag, resize, and reset the disc background image.
5. Choose a physical disc template or custom dimensions.
6. Toggle optional export guide marks.
7. Save and reload project files.
8. Export a clean 300 DPI PNG.

Recent pre-alpha work added physical disc geometry, custom dimensions, independently collapsible editor panels, fixed preview layout behavior, minimum desktop window sizing, and better image scaling for Steam artwork.

The app is usable for early testing, but the UI and workflow are still being cleaned up.

## Current Features

- Tauri + React + TypeScript desktop app shell.
- Standard printable disc template support.
- Custom disc dimensions with validation.
- Physical center hole, inner print boundary, outer print boundary, and safe-zone geometry.
- Live disc preview.
- Local background image upload.
- Steam search and metadata import.
- Steam artwork import.
- Background drag and scale controls.
- Save/load project files with embedded artwork.
- 300 DPI PNG export based on real physical disc dimensions.
- Optional exported guide marks.
- Collapsible editor panels that can be opened in any combination.
- Fixed minimum desktop window size to prevent unusable layouts.

## Near-Term Work

- Replace the temporary Steam Backup text badge with a real graphic/logo layer.
- Move imported artwork management out of the Game panel and into the Artwork panel.
- Remove vestigial prototype UI elements, including the mock search fallback.
- Improve the Guide Legend so it explains actual guide behavior.
- Add a preview-pane title and TF2-style stacked toast notification feed.
- Improve panel collapse/restore icon styling.
- Prepare the app for a first alpha package.

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

The original plan included Konva/React Konva for the visual editor. The current pre-alpha uses native React and canvas export logic. A richer layer/canvas system may still be added later if the editor grows beyond the current focused workflow.

## Documentation

See the `docs/` folder for:

- `PRD.md` — product requirements and product direction.
- `ROADMAP.md` — completed phases, current pre-alpha work, and future roadmap.
- `CURRENT_STATUS.md` — concise implementation status and next issues.

## Disclaimer

Steam Backup Label Studio is an unofficial personal backup labeling tool. It is not affiliated with Valve Corporation or Steam. Game artwork, logos, ratings, and trademarks belong to their respective owners. Users are responsible for ensuring they have the right to use imported or uploaded assets.

## License

License not chosen yet.
