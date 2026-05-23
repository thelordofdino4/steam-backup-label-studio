# Product Requirements Document

## Product Summary

Steam Backup Label Studio is a cross-platform desktop application for creating standardized, print-ready labels and case artwork for personal Steam game backup discs and physical archive media.

The app allows users to choose a physical template, import game metadata and artwork from Steam where available, customize imported fields, arrange artwork and logos visually, and export print-accurate files for discs, jewel cases, Amaray/DVD cases, and Blu-ray cases.

## Current Product Status

Steam Backup Label Studio is currently in **pre-alpha**.

The current implementation focuses on the disc-label path. It can search Steam, import real metadata and artwork, use imported or local artwork as a disc background, drag and resize artwork, preserve physical disc geometry, save/load projects, and export clean 300 DPI PNG files.

The current app is usable for early testing, but it is still missing several intended product features such as real logo layers, full layer management, richer metadata overrides, case templates, and alpha packaging.

The current working disc-label editor should not be mistaken for the whole planned product. Jewel case, DVD/Amaray, and Blu-ray case editors remain future planned interfaces.

## Product Philosophy

Steam Backup Label Studio is a workflow accelerator, not a replacement for GIMP, Photoshop, Krita, or a general-purpose image editor.

The app exists to remove the tedious manual work from creating personal Steam backup labels: searching for game assets, finding templates, aligning disc geometry, resizing images by hand, adding repeated branding, and preparing print-ready output.

The ideal basic workflow should take five minutes or less: choose a template, search for a game, select imported artwork, make small placement adjustments, save the project, and export a printable label.

The app should support manual overrides for users who want control, but its default behavior should favor speed, consistency, and reduced setup time.

The app should avoid unnecessary hand-holding in blank projects. Users should be allowed to upload one image and export if that is all they need. Guidance should appear through Guided Start or export-time summaries/warnings, not through a permanent project-health checklist.

## Target Platforms

Initial supported platforms:

- Windows
- Linux

Possible future platforms:

- macOS
- Steam Deck desktop mode
- Flatpak
- AppImage

## Core User Workflow

1. Create a new project or start from Guided Start.
2. Choose a physical template type.
3. Choose Steam Backup logo placement.
4. Search for a Steam game or enter details manually.
5. Review imported metadata and artwork.
6. Choose background art, logos, screenshots, and optional badges.
7. Edit the layout in a live canvas/editor area.
8. Save the project.
9. Review export summary/preflight information if needed.
10. Export a print-ready file.

## Template Types

Initial functional template:

- Disc label

Future templates:

- Jewel case insert
- Amaray/DVD case cover
- Blu-ray case cover

## Disc Template Requirements

Disc templates should support:

- Outer disc boundary
- Physical center hole mask
- Inner print boundary
- Outer print boundary
- Printable region
- Safe zone
- Optional guide export
- Optional Steam Backup logo placement
- Custom user dimensions with validation

Disc variants to support over time:

- Standard printable disc
- Sticky label disc
- LightScribe disc
- Custom dimensions

## Multi-Template Foundation

The app should eventually use a shared template system that can support all planned interfaces.

Shared template concepts should include:

- Physical dimensions
- Export dimensions
- Printable regions
- Safe zones
- Bleed regions where relevant
- Named regions such as front, back, spine, disc face, hub, or logo zones
- Template-specific guide overlays

The UI should clearly distinguish available template editors from future planned template editors. Planned templates should not be presented as fully supported until they can export usable files.

## Steam Backup Branding

The user can choose:

- Steam Backup logo at top
- Steam Backup logo at bottom
- No Steam Backup logo

The current implementation uses a temporary generated text badge. The intended implementation is a real editable logo layer that the user can move, resize, hide, lock, or replace.

## Steam Import

The app should attempt to search for a game on Steam and import available metadata and assets.

Potential imported fields:

- Game title
- Steam App ID
- Developer
- Publisher
- Release date
- Short description
- Long description
- Genres
- Categories/features
- Header artwork
- Capsule artwork
- Background/hero artwork
- Logo artwork
- Screenshots
- System requirements when available

Current implementation supports real Steam search, basic metadata import, artwork import, and save/load persistence for imported metadata.

All imported fields should eventually be overrideable.

## Artwork and Asset Management

The Game panel should focus on game search, game import, and game metadata.

The Artwork panel should become the home for visual asset management, including:

- Imported Steam artwork assets
- Local uploaded artwork
- Background selection
- Developer logo assets
- Publisher logo assets
- CD/DVD/logo marks
- ESRB/PEGI/rating assets
- Other future visual elements

The project should eventually use a shared asset library so imported or uploaded assets can be reused across disc labels, case fronts, case backs, and spines.

## Visual Editor Requirements

The editor should eventually support:

- Drag layers
- Resize layers
- Rotate layers
- Crop and fit images
- Lock layers
- Hide layers
- Reorder layers
- Duplicate layers
- Delete layers
- Snap to center
- Snap to guides
- Toggle safe zone and print guides
- Toggle non-printable masks
- Zoom and pan

The editor should avoid becoming a full raster image editor. Features such as painting tools, advanced filters, complex masking, and heavy photo manipulation are out of scope unless they directly support the backup-label workflow.

## UI Requirements

The editor should be organized into independently collapsible panels. Users should be able to open any number of panels at once instead of being forced into a single active tab.

The preview pane should remain visible while editing on supported desktop window sizes.

The preview pane should have a clear label and should include a top-right stacked toast notification feed for state changes such as save, load, import, artwork updates, template changes, export completion, and errors.

The app should eventually include an opening screen with two main choices:

- Guided Start
- Blank Project

Guided Start should walk users through setup questions. Blank Project should open the editor directly without forcing a checklist or wizard.

## Export and Preflight Requirements

Export should remain fast and non-blocking for normal use.

The app should eventually show an export summary or preflight warning flow near export time. This should replace the idea of a permanent project-health checklist.

Possible export summary/preflight items:

- Output pixel dimensions
- DPI
- Selected template
- Center hole cutout behavior
- Whether guide marks are enabled
- Whether the design has no background image
- Whether important text/logos appear outside the safe zone
- Whether custom dimensions are unusual

Warnings should generally be informational and should not block export unless a value is truly invalid.

## Optional Elements

The user can add:

- Developer logo
- Publisher logo
- Rating badge
- Miscellaneous artwork
- Copyright text
- Disc number
- Backup date
- Steam App ID
- Install notes

## Case-Specific Future Fields

For case templates, the app should eventually support:

- Front cover
- Spine
- Back cover
- Game description
- Flavor text
- Minimum requirements
- Recommended requirements
- Screenshots
- Feature icons
- Rating badges
- Developer/publisher logos
- Copyright block
- Spine text generation

## MVP Scope

The current MVP focuses on one complete path:

1. Open the app on Windows or Linux.
2. Create a new disc label project.
3. Choose a standard printable disc template or custom disc dimensions.
4. Choose Steam Backup logo placement.
5. Add a game title and artwork manually or through Steam import.
6. Adjust the background in a live editor.
7. Save and reopen the project.
8. Export a 300 DPI PNG.

## Out of Scope for Current Disc-Label MVP

- Jewel case support
- DVD case support
- Blu-ray case support
- Curved text
- Multi-disc wizard
- Direct printer integration
- Template marketplace
- General-purpose image editing tools
- Brush/paint tools
- Advanced photo filters
- Permanent project-health checklist panel

## Long-Term Feature Ideas

See `MILESTONES.md` for the detailed milestone and feature backlog.

Long-term ideas include:

- New Project / Reset Project
- Recent Projects
- Template preview cards
- Template type selector
- Shared project asset library
- Manual metadata fields
- Layout presets
- Steam Archive Identity style presets
- Backup Set project type for multi-disc games
- Copyright block generator
- Spine text generator
- Print calibration sheet
- Project schema migration
- Export presets
- Known media profiles
- Safe-zone severity indicators

## Legal / Usage Positioning

Steam Backup Label Studio should be positioned as a personal archival and backup labeling utility.

The app should not include built-in third-party game artwork. Game artwork should be imported from user-selected sources or fetched at runtime where appropriate. Users are responsible for ensuring they have rights to use imported or uploaded assets.
