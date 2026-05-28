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

The next major milestone is not whole-app alpha. It is getting the **disc artwork editor alone** to alpha quality: a normal user should be able to create, edit, save, reload, and export a print-ready disc label without needing GIMP, Krita, Photoshop, or another editor for ordinary backup-label work.

The core disc-label workflow is working:

1. Launch the Tauri desktop app.
2. Search Steam and import real game metadata.
3. Select imported Steam artwork from the Artwork panel or upload local artwork.
4. Use Steam store artwork, Steam library artwork, Steam screenshots, local Steam screenshots, or local image upload as a disc background where available.
5. Drag, resize, and reset the disc background image.
6. Choose a physical disc template or custom dimensions.
7. Place the Steam-style banner lockup at the top or bottom, or hide it.
8. Edit project-owned metadata, including title, subtitle, Steam App ID, developer, publisher, release date, backup date, disc numbers, install notes, copyright/legal text, and rating fields.
9. Enable and edit optional disc text: game title, disc number, backup date, Steam App ID, custom note, and copyright/legal text.
10. Adjust text position, scale, and straight-text alignment; use stable centered curved copyright text with arc, angle, inset, scale, side, and wrapping controls.
11. Adjust Steam banner placement, color, lockup image, scale, and offsets.
12. Add optional developer/publisher logos with alignment presets, and optional rating badges with placeholder or custom-image rendering.
13. Toggle optional export guide marks.
14. Save, reload, reset, and export project files.
15. Export a clean 300 DPI PNG.

Recent pre-alpha work added physical disc geometry, custom dimensions, independently collapsible editor panels, fixed preview layout behavior, minimum desktop window sizing, better image scaling for Steam artwork, a labeled preview pane, stacked preview toast notifications, Steam library/local screenshot artwork discovery, a real default Steam banner lockup image with user controls, adjustable disc text elements, stable centered curved copyright text, project-owned metadata, developer/publisher logo assets, rating badges, and New Project reset behavior.

The emergency editor-foundation refactor tracked in issue #36 is complete and closed. High-risk editor foundations have moved out of `App.tsx`, including project file helpers, shared utilities, PNG export rendering, status toast state, sidebar panels, and preview components. Build and lint are currently clean, and local smoke testing has passed. Follow-up cleanup work is tracked separately in issues #44-#49.

The app is usable for early disc-label testing, but the disc editor is not yet alpha-complete and the larger multi-template product is still in planning and foundation work. The current editor is not disposable prototype rubble: Steam/manual metadata, artwork import, disc geometry, save/load, export, banner controls, logo/badge support, text controls, preview panels, and toast feedback should be preserved and evolved through small migrations unless a specific replacement path is planned and reviewed.

## Disc Editor Alpha Boundary

Issue #69 defines the current finish line for the disc editor. The disc editor becomes alpha-ready when it can represent the common visual structure of real game discs using project-owned generic assets or user-provided custom images:

- Background artwork.
- Dedicated title/logo art, not only plain title text.
- Age rating marks.
- Developer, publisher, and additional company/studio/distributor logos.
- Media format marks such as CD-ROM, DVD, Blu-ray, or generic disc-format badges.
- Region/video-system style markers such as generic NTSC/PAL-style badges where appropriate.
- Sound-system or technology/middleware-style marks.
- Platform/store/network marks such as a generic online-service/store badge.
- Optional quote or short callout text.
- Copyright/legal text, straight or curved around the edge.
- Text layouts that can account for nearby logos, badges, title art, and other visual elements.

The project should not bundle official trademarked assets unless licensing is clearly safe. Built-in marks, badges, and logos should come from real checked-in generic asset files, likely under `src/assets/` or a dedicated asset folder, while custom user images remain supported. Generated CSS/canvas placeholder boxes are acceptable during indev implementation, but the disc editor should not be considered alpha-complete while final user-facing visual systems still depend on generated placeholders.

Text should always respect the disc safe-zone boundary. Respecting nearby logos, title art, badges, and other marks should be user-controllable so a user can intentionally overlay elements for a design, but ordinary legal/copyright and metadata text should not blindly collide with major enabled visuals. A practical alpha baseline can use reserved regions, layout presets, adjustable text boxes, adaptive widths, collision-aware warnings, or preflight warnings rather than perfect arbitrary text flow on day one.

Toast notifications are also part of the alpha-readiness work. The toast foundation should be preserved, including placement, stacking, and status-feedback behavior, but temporary symbols and debug-like wording should be replaced with real icons or a consistent final visual system and clear user-facing copy.

Current project files are plain JSON, commonly named like `.sbls.json`. A future `.sbls` package/container format is not implemented yet and should not block disc-editor alpha unless a specific save/load limitation appears.

Guided Start is deferred until the editor systems are stable. It is closer to a last step before beta than a requirement for the disc editor to leave indev/pre-alpha.

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
- Steam-style banner lockup with top, bottom, hidden placement, color, lockup image, scale, and offset controls.
- Editable project-owned metadata fields for imported or manual projects.
- Optional developer and publisher logo assets with alignment presets, drag positioning, scale controls, preview, export, and save/load persistence.
- Optional rating badge support with ESRB/PEGI/custom placeholders, custom image replacement, drag positioning, scale controls, preview, export, and save/load persistence.
- Optional disc text elements for title, disc number, backup date, Steam App ID, custom note, and copyright/legal text.
- Straight text dragging, scaling, offsets, alignment, preview, export, and save/load persistence.
- Stable centered curved copyright/legal text with arc length, angle, inset, scale, side, wrapping, preview, export, and save/load persistence.
- Save/load project files with embedded artwork and layout settings.
- New Project reset behavior.
- 300 DPI PNG export based on real physical disc dimensions.
- Optional exported guide marks.
- Collapsible editor panels that can be opened in any combination.
- Labeled live preview with top-right stacked toast notifications.
- Fixed minimum desktop window size to prevent unusable layouts.

## Near-Term Work

- Add dedicated title/logo art support.
- Add general additional artwork/logo elements and support multiple logos/marks beyond the fixed developer/publisher slots.
- Replace generated placeholder visuals with real file-backed generic assets.
- Add text behavior that can respect enabled visual element boundaries while always enforcing disc safe-zone compliance.
- Polish toast wording and replace temporary toast symbols/icons.
- Constrain movable visual elements to safe-zone geometry.
- Document and enforce disc editor layer ordering across preview and PNG export.
- Expand export-time summary/preflight behavior for logos, marks, text collisions, guide marks, backgrounds, and custom dimensions.
- Clarify metadata-to-rendered-text behavior.
- Add curved copyright text alignment modes only if they do not regress the stable centered curved text behavior; otherwise keep centered curved text as the supported alpha baseline.
- Add layout presets and adjustable straight text box widths if manual placement remains too fiddly.
- Decide longer-term project asset packaging/provenance behavior without treating the future `.sbls` package format as an alpha blocker by default.
- Improve artwork picker presentation with thumbnails, asset type, origin, and dimensions.
- Continue post-refactor cleanup tracked by issues #44-#49 where it supports upcoming feature work.
- Defer Guided Start, case editors, full package format work, broad refactors, visual regression automation, official asset packs, automatic rating lookup, direct printer support, and a full arbitrary layer manager until after the disc-editor alpha blockers are under control.

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
- `REFACTOR_STATUS.md` — completed issue #36 refactor summary and follow-up cleanup notes.
- `MILESTONES.md` — milestone boundaries and feature backlog.
- `VISUAL_REGRESSION_WORKFLOW.md` — manual preview/export comparison workflow for fixture-based visual checks.

## Disclaimer

Steam Backup Label Studio is an unofficial personal backup labeling tool. It is not affiliated with Valve Corporation or Steam. Game artwork, logos, ratings, and trademarks belong to their respective owners. Users are responsible for ensuring they have the right to use imported or uploaded assets.

## License

License not chosen yet.
