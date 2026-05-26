# Milestones and Feature Backlog

This document tracks larger feature ideas and milestone boundaries so the project does not confuse a working disc-label path with the whole planned product.

## Planning Principle

Steam Backup Label Studio should stay focused on speed, consistency, and print-ready output.

The app should avoid becoming a full image editor. Advanced control is useful, but the default path should remain fast enough that a user can make a basic backup disc label in five minutes or less.

The app also should not force a rigid checklist on users who want a blank project. Guided help belongs in the future Guided Start workflow or in export-time warnings, not as a permanent project-health panel.

Current planning should treat issue #69 as the finish-line definition for the disc artwork editor. The app remains pre-alpha overall. The next major milestone is getting the disc editor alone to alpha quality, not making the whole multi-template product alpha.

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

## Milestone: Disc Editor Alpha Complete

Goal: Make the disc artwork editor good enough that a normal user can create, edit, save, reload, and export a print-ready disc label without needing GIMP, Krita, Photoshop, or another editor for ordinary backup-label work.

This milestone applies only to the disc artwork editor. It does not include jewel case, DVD/Amaray, or Blu-ray case editors, and it does not mean the full app is alpha.

Preservation rule:

- Treat the current editor systems as working launchpad infrastructure.
- Preserve and evolve Steam/manual metadata import and editing.
- Preserve and evolve background artwork import, placement, scaling, save/load, and export.
- Preserve and evolve disc templates, custom dimensions, physical geometry, safe-zone guides, and export dimensions.
- Preserve and evolve Steam banner placement, colors, lockup image, layout, save/load, and export.
- Preserve and evolve developer logo, publisher logo, rating badge, media/platform mark, and disc text systems.
- Preserve and evolve New Project, save/load, export, preview, sidebar panel structure, and the toast notification foundation.
- Prefer small migrations toward a flexible visual-element model over a total rewrite.

Real-world disc artwork baseline:

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

Critical alpha blockers:

- Dedicated title/logo art support.
- General additional artwork/logo element support.
- Multiple logo/mark support beyond fixed developer/publisher slots.
- Real file-backed built-in generic assets replacing generated placeholders.
- Text behavior that can respect or avoid visual element boundaries.
- Safe-zone compliance for text and movable visual elements.
- Toast wording and icon replacement.
- Layer ordering and preview/export parity.
- Export preflight expansion around the more complete element model.
- Metadata-to-rendered-text behavior.
- Missing/disabled dependency clarity near the relevant controls.

Placeholder policy:

- Generated placeholder boxes are acceptable during indev implementation.
- The disc editor is not alpha-complete while final user-facing visual systems still rely on generated CSS/canvas placeholder boxes.
- Built-in generic marks, badges, logos, toast icons, and user-facing demo visuals should come from real checked-in files, likely under `src/assets/` or a dedicated asset folder.
- User-provided custom images should remain supported.
- Official trademarked assets should not be bundled unless licensing is clearly safe.
- Test fixtures may use obvious placeholders when documented as fixtures, but production/editor UI should move toward file-backed assets.

Text-boundary policy:

- Text should always respect the disc safe-zone boundary.
- If text approaches the safe-zone edge, the editor should preserve safe-zone compliance through practical behavior such as clamping, wrapping, adaptive widths, warnings, or shaped text boxes.
- Respecting nearby logos, title art, badges, marks, and other image elements should be user-controllable.
- Users should be able to intentionally overlap art elements for a specific design.
- Ordinary legal/copyright and metadata text should not blindly collide with major enabled visuals.

Toast readiness:

- Preserve the toast notification system and its placement, stacking, and status-feedback behavior.
- Review toast wording so it reads as clear user-facing language, not debug or developer text.
- Replace temporary toast symbols/placeholders with real icons or a consistent final visual system.

High-priority issue order:

- #69 finish-line definition.
- #68 metadata-to-rendered-text behavior.
- #60 layer ordering and preview/export consistency.
- #63 export preflight expansion.
- #66 missing/disabled dependency clarity.
- #61 layout presets if placement remains too fiddly.
- #33 curved copyright decision: implement safely or formally keep centered-only curved text.
- Add or use an issue for title/logo art support.
- Add or use an issue for additional generic visual/logo elements.
- Add or use an issue for real file-backed built-in generic assets.
- #49 / #21 toast icon and wording polish, possibly consolidated or clarified.

Not blockers for disc-editor alpha:

- Guided Start / wizard.
- Case editors.
- Full `.sbls` package format.
- Visual regression automation.
- Broad App.tsx/CSS/Rust refactors unless they directly support alpha blockers.
- Official asset/logo packs.
- IGDB or automatic rating lookup.
- Direct printer support.
- Full arbitrary layer manager.

## Milestone: Case Template Foundation

Goal: Prepare the code and UI for interfaces beyond the disc label editor.

This milestone should follow the disc editor becoming stable enough to serve as a trustworthy foundation. Case editors should not be presented as complete until their own editors can export usable files.

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

Guided Start is deferred until the editor feature set is stable. Building it before the disc editor alpha surface is feature-complete would encode assumptions that may change and cause avoidable rework. Guided Start is closer to a last step before beta than a requirement for the disc editor to leave indev/pre-alpha.

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

- Polish preview toast wording and action icons as part of disc-editor alpha readiness.
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
- Dedicated title/logo art element.
- Developer logo placement.
- Publisher logo placement.
- Multiple additional company/studio/distributor logo elements.
- Rating badge support.
- Optical media/logo marks.
- Media format marks.
- Region/video-system style marks.
- Sound-system or technology/middleware-style marks.
- Platform/store/network marks.
- Real file-backed built-in generic marks, badges, logos, and toast icons.
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
- Text behavior that can optionally respect nearby visual element boundaries.
- Safe-zone compliance that text cannot casually violate.
- Metadata-to-rendered-text mapping and manual override behavior.
- Spine text generator for case templates.
- Minimum/recommended requirements fields for case backs.

### Layout and Editing

- Layout presets.
- Steam Archive Identity style presets.
- Flexible visual-element model.
- Full arbitrary layer manager later.
- Layer selection.
- Layer dragging/resizing beyond background image and current text/banner/logo/badge controls.
- Layer hide/lock/reorder behavior.
- Preview/export layer ordering parity.
- Safe-zone severity indicators.

### Export and Print

- Export summary/preflight.
- Export validation warnings.
- Preflight warnings for text collisions, missing enabled assets, placeholder-backed visuals, and unsafe placement.
- Export presets.
- PNG with guides.
- Clean PNG.
- Transparent PNG.
- Print proof.
- Possible PDF export later.
- Direct printer support later.

## Explicit Non-Goal

A permanent project-health/status checklist panel is not currently planned. It risks feeling too hand-holdy and may conflict with the Blank Project workflow. Export-time summaries and warnings are preferred because they help only when the user is about to produce output.
