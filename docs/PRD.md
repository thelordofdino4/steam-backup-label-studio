# Product Requirements Document

Last refreshed: 2026-06-08.

## Product Summary

Steam Backup Label Studio is a cross-platform desktop application for creating standardized, print-ready labels and case artwork for personal Steam game backup discs and physical archive media.

The current app is a Steam backup **disc-label editor**. It lets users choose a real disc template, import Steam metadata and artwork where available, use local or custom assets, arrange real-disc-art elements visually, save projects, review export preflight information, and export print-accurate PNG files.

The disc-label editor is the first alpha-capable surface. The jewel case insert editor is the active next surface tracked by #126, with structured tray/spine layouts tracked by #149. DVD/Amaray and Blu-ray case editors remain future planned surfaces.

## Current Product Status

Steam Backup Label Studio is **post-indev for the disc-label editor**.

The stable alpha-capable implementation focuses on the disc-label path. It can search Steam, import real metadata and artwork, use imported/discovered/local artwork as a disc background, drag and resize artwork, preserve physical disc geometry, save/load projects, and export clean 300 DPI PNG files.

The current disc-label editor also supports Steam-style banner placement, title/logo artwork, additional artwork elements, optional straight and curved disc text, metadata-bound text defaults, developer/publisher/additional logo marks, rating badges, media marks, operating-system marks, technical/audio/codec marks, project-owned metadata, rating/legal candidate assistance, New Project reset behavior, export preflight, and toast status feedback.

This makes the disc-label workflow the first alpha-capable product surface. Issue #69 is closed as the parent alpha finish-line tracker.

The current working disc-label editor should not be mistaken for the whole planned product. The jewel case insert editor is active but not yet alpha-complete. Existing systems should be extended, migrated carefully, and preserved unless a specific replacement path is planned and reviewed.

## Product Philosophy

Steam Backup Label Studio is a workflow accelerator, not a replacement for GIMP, Photoshop, Krita, or a general-purpose image editor.

The app exists to remove tedious manual work from creating personal Steam backup labels: searching for game assets, finding templates, aligning disc geometry, resizing images, adding repeated branding/marks, adding common label text, and preparing print-ready output.

The ideal basic workflow should take five minutes or less: choose a template, search for a game, select imported artwork, make small placement and text adjustments, save the project, and export a printable label.

The app should support manual overrides for users who want control, but its default behavior should favor speed, consistency, and reduced setup time.

The app should avoid unnecessary hand-holding in blank projects. Users should be allowed to upload one image and export if that is all they need. Guidance should appear through Guided Start or export-time summaries/warnings, not through a permanent project-health checklist.

Guided Start should wait until the editor systems are stable. It is closer to a last step before beta than a blocker for the disc editor or jewel case editor to move forward.

## Current Sidebar Flow

The intended main sidebar flow is:

Project File → Export Options → Game → Template → Artwork → Branding → Text → Guide Legend

The sections are currently independently collapsible sidebar panels. The flow should not be reordered during unrelated work.

Guide Legend remains in the sidebar today. The likely future improvement is to move it into the live preview as a bottom-right, collapsible, open-by-default panel. That work is tracked by #124 and is not part of docs-only freshness work.

## Core User Workflow

1. Create or load a project from Project File.
2. Configure exported guide marks in Export Options if needed.
3. Search for a Steam game or enter details manually in Game.
4. Review and edit metadata, including rating/legal candidate suggestions where useful.
5. Choose a standard disc template or custom dimensions in Template.
6. Choose background art in Artwork from Steam, web candidates, local Steam screenshots, or local upload.
7. Add game title/logo artwork and optional additional artwork in Artwork.
8. Configure Steam banner branding, logo marks, rating badge, media mark, operating-system marks, and technical marks in Branding.
9. Enable and style optional disc text in Text.
10. Use the live preview for placement and guide feedback.
11. Save the project.
12. Review export preflight information.
13. Export a print-ready PNG.

Guided Start remains a future workflow that should be added after the editor feature set is stable.

## Disc Editor Alpha Status

Issue #69 defined the disc-editor finish line and is now closed. The alpha boundary applies only to the disc artwork editor, not case editors and not the whole product.

The disc editor should support common real-world disc artwork structures:

- Background artwork.
- Dedicated title/logo art.
- Age rating mark.
- Developer logo.
- Publisher logo.
- Additional company/studio/distributor logos.
- Media format mark such as CD-ROM, DVD, Blu-ray, or generic disc format.
- Operating-system/platform mark.
- Sound-system, codec, middleware, or technology mark.
- Optional additional artwork or short callout content.
- Copyright/legal text, straight or curved around the edge.
- Text layouts that can account for nearby logos, badges, title art, marks, and other visual elements.

Those categories now have an implementation path. Remaining disc-editor work is quality polish and future expansion: missing historical mark families (#125), optional feature state consistency, preview/export parity maintenance, fixture/manual smoke coverage, and honest runtime validation.

The project should not bundle official trademarked assets unless licensing is clearly safe. Built-in user-facing assets should be original generic files checked into the repo or user-provided custom images.

## Target Platforms

Initial supported platforms:

- Windows
- Linux

Possible future platforms:

- macOS
- Steam Deck desktop mode
- Flatpak
- AppImage

## Template Types

Initial functional template:

- Disc label

Future or in-progress templates:

- Jewel case insert/front-back-spine editor
- Amaray/DVD case cover
- Blu-ray case cover

The UI should clearly distinguish available template editors from future planned template editors. Planned templates should not be presented as fully supported until they can export usable files.

## Jewel Case Editor Requirements

The next editor surface should follow the Steam Game Covers front-cover, back-cover, and design-mistakes guides listed in `docs/JEWEL_CASE_EDITOR_ISSUE_DRAFT.md`.

The jewel case front should support:

- Dominant background/promotional artwork.
- Game title or title/logo artwork.
- Game-info marks such as rating, media, platform, or technical marks.
- Developer, publisher, studio, distributor, or related company logos.
- Optional short callout, quote, edition note, or marketing message.

The jewel case back should support:

- Background/promotional artwork or designed backdrop.
- Game description.
- Feature bullets or short feature callouts.
- Optional additional artwork slots that can use screenshots, key art, or other
  user-selected imagery.
- Rating, media, platform, and technical marks where useful.
- Developer, publisher, company, and technology logos.
- Minimum and recommended system requirements.
- Copyright/legal/attribution text.

The jewel case spine should support:

- Game title or title/logo behavior.
- Developer/publisher logo support and standard branding marks.
- Additional logo slots where a spine layout has enough usable space.
- Readable spine text orientation and safe sizing.

The case editor should preserve template dimensions, avoid distorted image fitting, warn about low-resolution artwork and unreadable text, and prefer cropping or content reduction over shrinking everything until it becomes unusable.

## Disc Template Requirements

Disc templates should support:

- Outer disc boundary.
- Physical center hole mask.
- Inner print boundary.
- Outer print boundary.
- Printable region.
- Safe zone.
- Optional guide export.
- Optional Steam Backup logo placement.
- Custom user dimensions with validation.

## Steam Backup Branding

The user can choose:

- Steam Backup banner at top.
- Steam Backup banner at bottom.
- No Steam Backup banner.

The current implementation uses a real default Steam-style banner lockup image with a rendered banner strip. It supports user-facing placement, color, lockup image or text fallback, scale, and offset controls. The Steam banner remains separate from game title/logo artwork.

## Steam Import

The app should attempt to search for a game on Steam and import available metadata and assets.

Potential imported fields:

- Game title.
- Steam App ID.
- Developer.
- Publisher.
- Release date.
- Short description.
- Genres/categories where available.
- Store/header/capsule/background/logo artwork.
- Screenshots.
- Platform support metadata.
- Rating/legal candidate data where discoverable.

Current implementation supports real Steam search, basic metadata import, store artwork import, Steam library artwork import where available, Steam screenshot discovery, local Steam screenshot discovery, Steam title/logo artwork seeding, operating-system mark inference from reliable Steam appdetails data, and save/load persistence for imported metadata.

All imported fields should remain overrideable.

## Artwork and Asset Management

The Game panel focuses on game search, game import, and game metadata.

The Artwork panel is the current home for:

- Background source selection and tuning.
- Imported Steam artwork assets.
- Web artwork candidates.
- Steam library artwork assets.
- Steam screenshots.
- Local Steam screenshots.
- Local uploaded background artwork.
- Game title/logo artwork.
- Additional artwork elements.

The Branding panel is the current home for:

- Steam banner/system branding.
- Developer, publisher, and additional logo marks.
- Rating badges.
- Media marks.
- Operating-system marks.
- Technical/audio/codec marks.

The project should eventually use a shared asset library if imported or uploaded assets need to be reused across disc labels, case fronts, case backs, and spines.

## Optional Visual Elements

Optional visual features should expose only their top-level show/enable checkbox when disabled. Dependent controls should be hidden, disabled features should not render in preview or export, and disabling should preserve saved state.

Inside an enabled optional visual feature, use this hierarchy:

1. Show/enable checkbox.
2. Subordinate optional checkboxes.
3. Source/type/value controls.
4. Text/value inputs.
5. Upload/custom asset controls.
6. Placement/alignment presets.
7. Sliders/fine-tuning controls.
8. Reset/clear actions.

This applies especially to branding/artwork systems such as game title artwork, additional artwork, developer logo, publisher logo, rating badge, media mark, operating-system marks, technical marks, and future optional metadata text elements.

## Visual Editor Requirements

The editor should support the current focused disc-label workflows without becoming a full raster image editor.

Current visual editing includes:

- Background drag and scale.
- Title artwork drag and scale.
- Additional artwork drag and scale.
- Logo/badge/mark drag and scale.
- Text drag, scale, width, layout preset, and style controls.
- Custom image upload and clear/reset behavior for supported visuals.
- Preview/export parity through fixed layer order.

Later editor features may include:

- Rotate layers.
- Crop and fit images.
- Lock/hide/reorder layers if needed beyond the fixed alpha layer order.
- Snap to center/guides.
- Zoom and pan.

Painting tools, advanced filters, complex masking, and heavy photo manipulation are out of scope unless they directly support the backup-label workflow.

## Text and Label Element Requirements

The disc-label editor should support common label text without requiring users to use an external image editor for every label.

Current text support includes:

- Game title.
- Subtitle / edition.
- Disc number.
- Backup date.
- Steam App ID.
- Developer text.
- Publisher text.
- Install notes.
- Short custom note.
- Copyright/legal text.
- Metadata-bound defaults with manual overrides.
- Plain text and graphic disc-number badge modes.
- Straight text placement, width, scale, offsets, alignment, style presets, contrast, optional backplates/borders, and visual-element avoidance.
- Stable centered curved copyright/legal text with arc length, angle, inset, scale, side, and wrapping controls.
- Preview/export/save-load support for current text settings.

Known text follow-up work should be driven by concrete user confusion or layout gaps, not by stale assumptions that metadata binding or width controls do not exist.

Text should always respect the disc safe-zone boundary. Respecting nearby image/logo/mark boundaries should remain user-controllable so users can intentionally overlay art elements when a design calls for it.

## UI Requirements

The editor is organized into independently collapsible sidebar sections in the current intended flow.

The preview pane should remain visible while editing on supported desktop window sizes.

The preview pane should have a clear label and a top-right stacked toast notification feed for state changes such as save, load, import, artwork updates, template changes, export completion, and errors.

The toast system is part of disc-editor alpha readiness, not just optional polish. The foundation should be preserved, wording should stay user-facing, and built-in icon/generic asset behavior should stay routed through the centralized asset manifest.

After the editor systems are stable, the app should eventually include an opening screen with two main choices:

- Guided Start.
- Blank Project.

## Export and Preflight Requirements

Export should remain fast and non-blocking for normal use.

Current export behavior:

- 300 DPI PNG.
- Physical dimensions from the selected template/custom dimensions.
- Center hole cutout.
- Clean export by default.
- Optional exported guides.
- Export preflight summary before writing the PNG.

Export preflight currently covers output dimensions, DPI, selected template, center hole behavior, guide marks, background status, metadata status, Steam banner state, optional text state, custom dimension warnings, enabled-but-unavailable visuals, and print/readability risks.

Warnings should generally be informational and should not block export unless a value is truly invalid.

Built-in/default app artwork is a valid first-party output source. The app should not warn users, add export warnings, or show Design Check notification badges solely because artwork came from a built-in/default/generic app asset. Warnings should target actual missing content, invalid settings, unresolved export behavior, or concrete print/readability risks.

Preview Design Check notification badges should be reserved for design-rule failures such as missing required background artwork, title/logo treatment, game-info marks, company logos, legal text, back-cover description, screenshots/supporting art, system requirements, or spine identification. Lower-risk print-quality details such as low source resolution, safe-zone proximity, or larger export size should remain visible inside the open checklist as notes without changing the notification icon state.

Export should not silently omit enabled visible elements. Preview/export layer ordering should be documented and followed by both preview and PNG export.

## Project File Format

The current app saves plain JSON project files, commonly named `.sbls.json`.

Current saved projects embed image data URLs for the visual assets they need to reload, and they store provenance/status metadata where supported. Local path details should not be required after reload for embedded assets.

The future `.sbls` package/container format is not implemented yet. It remains future work for portability, asset bundling, and migration behavior, and it should not block disc-editor alpha unless a specific save/load limitation appears.

## Case-Specific Fields

For case templates, the app should support or plan for:

- Front cover.
- Spine.
- Back cover.
- Game description.
- Flavor text.
- Minimum requirements.
- Recommended requirements.
- Screenshots.
- Feature icons.
- Rating badges.
- Developer/publisher logos.
- Copyright block.
- Spine text generation.

## Current Disc-Label MVP Scope

The current MVP focuses on one complete path:

1. Open the app on Windows or Linux.
2. Create a new disc label project.
3. Choose a standard printable disc template or custom disc dimensions.
4. Search/import a Steam game or enter metadata manually.
5. Choose background artwork.
6. Add optional real-disc-art elements and text.
7. Adjust layout in the live preview.
8. Save and reopen the project.
9. Review export preflight.
10. Export a 300 DPI PNG.

## Out of Scope For Current Disc-Label MVP

- Jewel case support.
- DVD case support.
- Blu-ray case support.
- Multi-disc wizard.
- Guided Start / setup wizard.
- Full `.sbls` package/container format.
- Official asset/logo packs.
- IGDB or automatic rating lookup.
- Direct printer integration.
- Full arbitrary layer manager.
- Automated visual regression beyond the current manual workflow.
- Broad App.tsx/CSS/Rust refactors unless directly needed for an alpha blocker.
- Template marketplace.
- General-purpose image editing tools.
- Brush/paint tools.
- Advanced photo filters.
- Permanent project-health checklist panel.

## Legal / Usage Positioning

Steam Backup Label Studio should be positioned as a personal archival and backup labeling utility.

The app should not include built-in third-party game artwork. Game artwork should be imported from user-selected sources or fetched at runtime where appropriate. Users are responsible for ensuring they have rights to use imported or uploaded assets.
