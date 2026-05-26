# Product Requirements Document

## Product Summary

Steam Backup Label Studio is a cross-platform desktop application for creating standardized, print-ready labels and case artwork for personal Steam game backup discs and physical archive media.

The app allows users to choose a physical template, import game metadata and artwork from Steam where available, customize imported fields, arrange artwork, branding, and label text visually, and export print-accurate files for discs, jewel cases, Amaray/DVD cases, and Blu-ray cases.

## Current Product Status

Steam Backup Label Studio is currently in **pre-alpha**.

The current implementation focuses on the disc-label path. It can search Steam, import real metadata and artwork, use imported or local artwork as a disc background, drag and resize artwork, preserve physical disc geometry, save/load projects, and export clean 300 DPI PNG files.

The current disc-label editor also supports Steam-style banner placement, optional straight disc text elements, stable centered curved copyright/legal text, developer/publisher logo support, rating badge support, media/platform mark work, project-owned metadata, New Project reset behavior, and toast status feedback. This makes the disc-label workflow much more complete than the early prototype, but it is not yet alpha-complete.

The current working disc-label editor should not be mistaken for the whole planned product. Jewel case, DVD/Amaray, and Blu-ray case editors remain future planned interfaces.

The next major milestone is getting the disc artwork editor alone to alpha quality. That milestone is reached when a normal user can create, edit, save, reload, and export a print-ready disc label without needing GIMP, Krita, Photoshop, or another editor for ordinary backup-label work. This does not mean the full app is alpha.

The current editor is a launchpad, not disposable prototype rubble. Existing systems should be extended, migrated carefully, and preserved unless a specific replacement path is planned and reviewed.

## Product Philosophy

Steam Backup Label Studio is a workflow accelerator, not a replacement for GIMP, Photoshop, Krita, or a general-purpose image editor.

The app exists to remove the tedious manual work from creating personal Steam backup labels: searching for game assets, finding templates, aligning disc geometry, resizing images by hand, adding repeated branding, adding common label text, and preparing print-ready output.

The ideal basic workflow should take five minutes or less: choose a template, search for a game, select imported artwork, make small placement and text adjustments, save the project, and export a printable label.

The app should support manual overrides for users who want control, but its default behavior should favor speed, consistency, and reduced setup time.

The app should avoid unnecessary hand-holding in blank projects. Users should be allowed to upload one image and export if that is all they need. Guidance should appear through Guided Start or export-time summaries/warnings, not through a permanent project-health checklist.

Guided Start should wait until the editor systems are stable. It is closer to a last step before beta than a blocker for the disc editor to leave indev/pre-alpha.

## Disc Editor Alpha Boundary

Issue #69 defines the disc-editor finish line. The alpha boundary applies only to the disc artwork editor, not case editors and not the whole product.

The disc editor should support common real-world disc artwork structures:

- Background artwork.
- Dedicated title/logo art, not only plain title text.
- Age rating mark.
- Developer logo.
- Publisher logo.
- Additional company/studio/distributor logos.
- Media format mark such as CD-ROM, DVD, Blu-ray, or generic disc format.
- Region/video-system marker such as a generic NTSC/PAL-style badge where appropriate.
- Sound-system or technology/middleware-style mark such as a generic audio badge.
- Platform/store/network mark such as a generic online-service/store badge.
- Optional quote or short callout text.
- Copyright/legal text, straight or curved around the edge.
- Text layouts that can account for nearby logos, badges, title art, and other visual elements.

The project should not bundle official trademarked assets unless licensing is clearly safe. Built-in user-facing assets should be original generic files checked into the repo or user-provided custom images.

Generated placeholder boxes are acceptable during indev implementation. They are not acceptable as the final alpha-complete representation for user-facing developer logo fallback, publisher logo fallback, rating badge fallback, media format mark fallback, platform mark fallback, future optical/media/platform/archive marks, toast icons/symbols, or demos meant to represent real user-facing states. Built-in generic marks, badges, logos, and icons should eventually resolve to actual files, likely under `src/assets/` or a dedicated asset folder.

Critical disc-editor alpha priorities:

- Dedicated title/logo art support.
- General additional artwork/logo element support.
- Multiple logo/mark support beyond fixed developer/publisher slots.
- Real file-backed built-in assets replacing generated placeholders.
- Text behavior that can avoid or respect visual element boundaries.
- Toast wording and icon replacement.
- Layer ordering and preview/export parity.
- Export preflight expansion around the more complete element model.
- Metadata-to-rendered-text behavior.
- Missing/disabled dependency clarity near the affected controls.

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

1. Create a new project.
2. Choose a physical template type.
3. Choose Steam Backup logo placement.
4. Search for a Steam game or enter details manually.
5. Review imported metadata and artwork.
6. Choose background art, logos, screenshots, and optional badges.
7. Enable optional disc text such as title, disc number, backup date, Steam App ID, custom notes, and copyright/legal text.
8. Edit the layout in a live canvas/editor area.
9. Save the project.
10. Review export summary/preflight information if needed.
11. Export a print-ready file.

Guided Start remains a future workflow that should be added after the editor feature set is stable.

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

The current implementation uses a real default Steam-style banner lockup image and CSS-rendered banner strip. The default placement is treated as the current baseline. Future work should add user-facing lockup scale/offset controls, banner color controls, and eventually platform-specific branding options.

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

Current implementation supports real Steam search, basic metadata import, store artwork import, Steam library artwork import where available, Steam screenshot discovery, local Steam screenshot discovery, and save/load persistence for imported metadata.

All imported fields should eventually be overrideable.

## Artwork and Asset Management

The Game panel should focus on game search, game import, and game metadata.

The Artwork panel should become the home for visual asset management, including:

- Imported Steam artwork assets
- Steam library artwork assets
- Steam screenshots
- Local Steam screenshots
- Local uploaded artwork
- Background selection
- Developer logo assets
- Publisher logo assets
- Optical media/logo marks
- ESRB/PEGI/rating assets
- Other future visual elements

The project should eventually use a shared asset library so imported or uploaded assets can be reused across disc labels, case fronts, case backs, and spines.

For the disc-editor alpha boundary, artwork and asset management should also support dedicated title/logo art and additional user-added visual/logo/mark elements. These elements should support upload/source selection, show/hide, placement, scale, save/load, and export without replacing the current developer logo, publisher logo, rating badge, or media/platform mark systems abruptly.

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

## Text and Label Element Requirements

The disc-label editor should support common label text without requiring users to use an external image editor for every label.

Current text support includes:

- Game title
- Disc number
- Backup date
- Steam App ID
- Short custom note
- Copyright/legal text
- Straight text placement, scale, offsets, and alignment
- Stable centered curved copyright/legal text with arc length, angle, inset, scale, side, and wrapping controls
- Preview/export/save-load support for current text settings

Known text follow-up work includes:

- Curved text alignment modes beyond the current stable centered behavior
- Adjustable straight text box widths
- Richer manual metadata fields feeding text elements
- Possible copyright block generator
- Practical text behavior that can avoid or respect nearby title art, logos, badges, marks, and other visual elements
- Preflight warnings when text overlaps major enabled elements

Text should always respect the disc safe-zone boundary. If a text box approaches the safe-zone edge, the editor should preserve safe-zone compliance through practical behavior such as clamping, wrapping, adaptive widths, warnings, or shaped text boxes. Respecting nearby image/logo/mark boundaries should be a user-controllable option so users can intentionally overlay art elements when a design calls for it.

## UI Requirements

The editor should be organized into independently collapsible panels. Users should be able to open any number of panels at once instead of being forced into a single active tab.

The preview pane should remain visible while editing on supported desktop window sizes.

The preview pane should have a clear label and should include a top-right stacked toast notification feed for state changes such as save, load, import, artwork updates, template changes, export completion, and errors.

The toast system is part of disc-editor alpha readiness, not just optional polish. The foundation should be preserved, but wording should be reviewed as user-facing language, temporary symbols/placeholders should be replaced with real icons or a consistent final visual system, and placement, stacking, and status behavior should not be casually broken.

After the editor systems are stable, the app should eventually include an opening screen with two main choices:

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
- Whether text overlaps major enabled logos, marks, badges, title art, or other visual elements
- Whether enabled built-in marks, badges, logos, or toast visuals are still backed by generated placeholders instead of real assets
- Whether custom dimensions are unusual

Warnings should generally be informational and should not block export unless a value is truly invalid.

Export should not silently omit enabled visible elements. Preview/export layer ordering should be documented and followed by both preview and PNG export.

## Optional Elements

The user can add:

- Title/logo art
- Developer logo
- Publisher logo
- Additional company/studio/distributor logos
- Rating badge
- Media format mark
- Region/video-system style mark
- Sound-system or technology/middleware-style mark
- Platform/store/network mark
- Miscellaneous artwork
- Quote or short callout text
- Copyright text
- Disc number
- Backup date
- Steam App ID
- Install notes

The editor should grow toward a flexible visual-element model while preserving current fixed systems and save/load behavior during migration.

## Project File Format

The current app saves plain JSON project files, commonly named like `.sbls.json`.

The future `.sbls` package/container format is not implemented yet. It remains future work for portability, asset bundling, and migration behavior, and it should not block disc-editor alpha unless a specific save/load limitation appears.

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
7. Add optional basic disc text.
8. Save and reopen the project.
9. Export a 300 DPI PNG.

## Out of Scope for Current Disc-Label MVP

- Jewel case support
- DVD case support
- Blu-ray case support
- Advanced curved text alignment beyond the stable centered curved copyright implementation
- Multi-disc wizard
- Guided Start / setup wizard
- Full `.sbls` package/container format
- Official asset/logo packs
- IGDB or automatic rating lookup
- Direct printer integration
- Full arbitrary layer manager
- Visual regression automation
- Broad App.tsx/CSS/Rust refactors unless directly needed for an alpha blocker
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
