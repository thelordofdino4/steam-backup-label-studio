# Milestones and Feature Backlog

This document tracks larger feature ideas and milestone boundaries so the project does not confuse a working disc-label path with the whole planned product.

## Planning Principle

Steam Backup Label Studio should stay focused on speed, consistency, and print-ready output.

The app should avoid becoming a full image editor. Advanced control is useful, but the default path should remain fast enough that a user can make a basic backup disc label in five minutes or less.

The app also should not force a rigid checklist on users who want a blank project. Guided help belongs in the future Guided Start workflow or in export-time warnings, not as a permanent project-health panel.

## Milestone: Disc Label Pre-Alpha Complete

Goal: Make the current disc-label editor path coherent enough for early testing.

Core work:

- Keep Steam search/import working.
- Keep imported Steam artwork, Steam library artwork, Steam screenshots, local Steam screenshots, and local artwork usable as disc backgrounds.
- Keep physical disc geometry and custom dimensions working.
- Keep save/load/export working.
- Use a real default Steam-style banner lockup instead of a generated placeholder text badge.
- Keep optional straight disc text working for game title, disc number, backup date, Steam App ID, custom note, and copyright/legal text.
- Keep stable centered curved copyright/legal text working with arc, angle, inset, scale, side, and wrapping controls.
- Add a New Project or Reset Project action.
- Add export-time summary/preflight behavior instead of a standing project-health checklist.
- Keep the app honest that only the disc-label interface is functional at this stage.

Useful polish:

- Template preview cards for disc label templates.
- Cleaner artwork picker presentation with asset type, origin, thumbnails, and dimensions.
- Manual metadata override fields.
- Curved copyright alignment modes.
- Adjustable straight text box widths.
- Adjustable banner lockup controls.
- User-facing banner color controls.

## Milestone: Case Template Foundation

Goal: Prepare the code and UI for interfaces beyond the disc label editor.

Planned interfaces:

- Disc label editor.
- Jewel case insert editor.
- DVD/Amaray case cover editor.
- Blu-ray case cover editor.

Shared foundation:

- Template type selector at the top level.
- Shared template model for physical dimensions, safe zones, bleed/printable areas, named regions, and export dimensions.
- Shared project asset library for Steam artwork, screenshots, logos, ratings, and local uploads.
- Shared metadata model used by disc labels and case layouts.
- Shared export pattern for all template types.

Important note:

Only the disc-label interface needs to be functional first. The other template types should not be presented as complete until their editors can actually export usable files.

## Milestone: Guided Start and Blank Project

Goal: Add an opening screen that supports both fast blank work and guided setup.

Blank Project:

- Opens the editor directly with default settings.
- Does not require the user to select a game or complete a checklist.
- Supports simple use cases such as uploading one image and exporting.

Guided Start:

- Asks what game the user is backing up.
- Asks what template type the user wants: disc, jewel case, DVD/Amaray, or Blu-ray.
- Asks what disc or case dimensions/template they are using.
- Asks what artwork/background they want.
- Asks whether to use Steam Backup branding, optical media marks, rating badges, developer/publisher logos, and copyright text.
- Sends the user into the editor with the selected setup already prepared.

## Milestone: Alpha UI Polish

Goal: Make the app feel intentional enough for a first alpha package.

Planned work:

- Polish preview toast action icons.
- Clean duplicate hidden UI markup and panel structure.
- Improve panel indentation and component organization.
- Add sample project/demo mode.
- Add recent projects if practical.
- Add a first-run explanation of the app's purpose.
- Add layout presets for common disc-label styles.
- Add theme/style presets such as industrial orange, clean black archive, monochrome printable, and other Steam Archive Identity styles.

## Milestone: Beta Reliability

Goal: Make saved projects, exports, and print behavior trustworthy.

Planned work:

- Project schema migration support.
- Export validation warnings.
- Export preview/summary before writing files.
- Export presets such as clean PNG, PNG with guides, print proof, transparent PNG, and possible PDF export later.
- Print calibration sheet.
- Known media profiles for common printable disc types and case sizes.
- Safe-zone severity indicators: advisory, close to edge, likely unsafe.

Preflight guidance should be informational and should not block export unless something is truly invalid.

## Milestone: First Public Release

Goal: Package a clear, usable version with honest limitations.

Planned work:

- Windows package.
- Linux package.
- Clear install instructions.
- Known issues list.
- License decision.
- Contributor notes.
- Legal/disclaimer notes.
- Release notes explaining supported template types.

## Feature Backlog

### Workflow

- New Project / Reset Project.
- Recent Projects.
- Guided Start.
- Blank Project.
- Sample project/demo mode.
- Backup Set project type for multi-disc games.
- Disc number and multi-disc labeling.

### Templates

- Template type selector.
- Disc template preview cards.
- Jewel case insert template.
- DVD/Amaray case cover template.
- Blu-ray case cover template.
- Known media profiles.
- Print calibration sheet.

### Artwork and Assets

- Shared project asset library.
- Artwork thumbnails with type, origin, and dimensions.
- Steam library artwork handling.
- Steam screenshot and local Steam screenshot handling.
- Developer logo placement.
- Publisher logo placement.
- Rating badge support.
- Optical media/logo marks.
- Screenshot selection for case backs.
- Replaceable Steam Backup logo asset.
- User-adjustable banner lockup controls.
- User-facing banner color controls.

### Metadata and Text

- Manual metadata override fields.
- Copyright block generator.
- Backup date field.
- Steam App ID field.
- Disc number field.
- Install notes.
- Curved copyright alignment modes.
- Adjustable straight text box widths.
- Spine text generator for case templates.
- Minimum/recommended requirements fields for case backs.

### Layout and Editing

- Layout presets.
- Steam Archive Identity style presets.
- Real layer model.
- Layer selection.
- Layer dragging/resizing beyond background image and current text/banner controls.
- Layer hide/lock/reorder behavior.
- Safe-zone severity indicators.

### Export and Print

- Export summary/preflight.
- Export validation warnings.
- Export presets.
- PNG with guides.
- Clean PNG.
- Transparent PNG.
- Print proof.
- Possible PDF export later.
- Direct printer support later.

## Explicit Non-Goal

A permanent project-health/status checklist panel is not currently planned. It risks feeling too hand-holdy and may conflict with the Blank Project workflow. Export-time summaries and warnings are preferred because they help only when the user is about to produce output.
