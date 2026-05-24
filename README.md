# Steam Backup Label Studio

A cross-platform desktop app for designing print-ready Steam backup disc labels and, eventually, case artwork for personal Steam backup media.

## Project Goal

Steam Backup Label Studio helps users create consistent, good-looking labels and case inserts for personal Steam game backup media.

The app lets users choose a physical disc template, import Steam game metadata and artwork where available, manually adjust artwork and label elements, save projects, and export print-ready image files.

## Project Philosophy

Steam Backup Label Studio is not intended to replace GIMP, Photoshop, Krita, or a full image editor.

The goal is to eliminate the most manual parts of making personal Steam backup labels: searching for game artwork, hunting for templates, lining up disc geometry, resizing images by hand, adding repeated branding, adding common label text, and repeating the same setup work for every game.

A user who wants a basic backup disc label should be able to choose a template, search for a game, select artwork, make small placement adjustments, add optional label text, and export a printable result in five minutes or less.

The app should support blank-project workflows. A user should be able to upload a single image and export without being forced through a checklist. Guided help belongs in Guided Start or export-time summaries and warnings.

## Current Status

Steam Backup Label Studio is currently in **pre-alpha**.

The current working interface is the **disc-label editor**. The broader planned product also includes future jewel case, DVD/Amaray, and Blu-ray case editors.

The core disc-label workflow is working:

1. Launch the Tauri desktop app.
2. Search Steam and import real game metadata.
3. Select imported Steam artwork from the Artwork panel or upload local artwork.
4. Use Steam store artwork, Steam library artwork, Steam screenshots, local Steam screenshots, or local image upload as a disc background where available.
5. Drag, resize, and reset the disc background image.
6. Choose a physical disc template or custom dimensions.
7. Place the Steam-style banner lockup at the top or bottom, or hide it.
8. Enable and edit optional disc text: game title, disc number, backup date, Steam App ID, custom note, and copyright/legal text.
9. Adjust text position, scale, and straight-text alignment; use stable centered curved copyright text with arc, angle, inset, scale, side, and wrapping controls.
10. Toggle optional export guide marks.
11. Save and reload project files.
12. Export a clean 300 DPI PNG.

Recent pre-alpha work added physical disc geometry, custom dimensions, independently collapsible editor panels, fixed preview layout behavior, minimum desktop window sizing, better image scaling for Steam artwork, a labeled preview pane, stacked preview toast notifications, Steam library/local screenshot artwork discovery, a real default Steam banner lockup image, adjustable disc text elements, and stable centered curved copyright text.

The app is usable for early disc-label testing, but the larger multi-template product is still in planning and foundation work.

## Current Features

- Tauri + React + TypeScript desktop app shell.
- Standard printable disc template support.
- Custom disc dimensions with validation.
- Physical center hole, inner print boundary, outer print boundary, and safe-zone geometry.
- Live disc preview.
- Local background image upload.
- Steam search and metadata import.
- Steam store artwork import.
- Steam library capsule and hero artwork import.
- Steam screenshot and local Steam screenshot discovery where available.
- Imported Steam artwork selection from the Artwork panel.
- Background drag and scale controls.
- Steam-style banner lockup with top, bottom, and hidden placement options.
- Optional disc text elements for title, disc number, backup date, Steam App ID, custom note, and copyright/legal text.
- Straight text dragging, scaling, offsets, alignment, preview, export, and save/load persistence.
- Stable centered curved copyright/legal text with arc length, angle, inset, scale, side, wrapping, preview, export, and save/load persistence.
- Save/load project files with embedded artwork and layout settings.
- 300 DPI PNG export based on real physical disc dimensions.
- Optional exported guide marks.
- Collapsible editor panels that can be opened in any combination.
- Labeled live preview with top-right stacked toast notifications.
- Fixed minimum desktop window size to prevent unusable layouts.

## Near-Term Work

- Add curved copyright text alignment modes without regressing the stable centered curved text behavior.
- Add adjustable straight text box widths.
- Add adjustable banner lockup scale and offset controls.
- Add user-facing banner color controls.
- Add New Project / Reset Project.
- Add export-time summary/preflight behavior.
- Add manual metadata fields and richer metadata overrides.
- Improve artwork picker presentation with thumbnails, asset type, origin, and dimensions.
- Begin shared template-system planning for future case editors.

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
- `MILESTONES.md` — milestone boundaries and feature backlog.

## Disclaimer

Steam Backup Label Studio is an unofficial personal backup labeling tool. It is not affiliated with Valve Corporation or Steam. Game artwork, logos, ratings, and trademarks belong to their respective owners. Users are responsible for ensuring they have the right to use imported or uploaded assets.

## License

License not chosen yet.
