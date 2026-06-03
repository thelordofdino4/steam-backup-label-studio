# Milestones and Feature Backlog

Last refreshed: 2026-06-01.

This document tracks larger feature ideas and milestone boundaries so the project does not confuse a working disc-label path with the whole planned product.

## Planning Principle

Steam Backup Label Studio should stay focused on speed, consistency, and print-ready output.

The app should avoid becoming a full image editor. Advanced control is useful, but the default path should remain fast enough that a user can make a basic backup disc label in five minutes or less.

The app should not force a rigid checklist on users who want a blank project. Guided help belongs in the future Guided Start workflow or in export-time warnings, not as a permanent project-health panel.

Issue #69 is closed as the parent finish-line definition for the disc artwork editor. The disc-label editor is now the first alpha-capable surface, while the whole multi-template product remains incomplete. The next major milestone is the jewel case editor tracked by #126.

## Milestone: Disc Label Pre-Alpha Complete

Goal: Make the current disc-label editor path coherent enough for early testing.

Core work now in place:

- Steam search/import.
- Imported Steam artwork, Steam library artwork, Steam screenshots, local Steam screenshots, web artwork candidates, and local artwork as disc backgrounds.
- Physical disc geometry and custom dimensions.
- Save/load/export.
- Real default Steam-style banner lockup and controls.
- Optional straight disc text, metadata-bound text, styled text, text layout presets, width controls, and stable centered curved copyright/legal text.
- New Project / Reset Project.
- Export preflight and optional guide export.
- Title/logo artwork.
- Additional artwork elements.
- Developer/publisher/additional logo marks.
- Rating badges.
- Media marks.
- Operating-system marks.
- Technical/audio/codec marks.
- Layer-order policy and preview/export parity guardrails.
- Honest status that only the disc-label interface is functional at this stage.

Useful remaining polish:

- Keep centralized, replaceable built-in generic visuals organized.
- Move Guide Legend to the live preview only under #124.
- Expand manual fixture coverage for newer systems.
- Keep optional visual UI hierarchy consistent.

## Milestone: Disc Editor Alpha Complete

Goal: Make the disc artwork editor good enough that a normal user can create, edit, save, reload, and export a print-ready disc label without needing GIMP, Krita, Photoshop, or another editor for ordinary backup-label work.

This milestone applies only to the disc artwork editor. It does not include jewel case, DVD/Amaray, or Blu-ray case editors, and it does not mean the full app is alpha.

Preservation rule:

- Treat the current editor systems as working launchpad infrastructure.
- Preserve and evolve Steam/manual metadata import and editing.
- Preserve and evolve background artwork import, placement, scaling, save/load, and export.
- Preserve and evolve title/logo artwork and additional artwork systems.
- Preserve and evolve disc templates, custom dimensions, physical geometry, safe-zone guides, and export dimensions.
- Preserve and evolve Steam banner placement, colors, lockup image/text fallback, layout, save/load, and export.
- Preserve and evolve developer logo, publisher logo, additional logo, rating badge, media mark, operating-system mark, technical mark, disc-number artwork, and disc text systems.
- Preserve and evolve New Project, save/load, export preflight, export, preview, sidebar panel structure, and toast notification foundation.
- Prefer small migrations toward clearer ownership over total rewrites.

Real-world disc artwork baseline:

- Background artwork.
- Dedicated title/logo art.
- Age rating mark.
- Developer logo.
- Publisher logo.
- Additional company/studio/distributor logos.
- Media format mark such as CD-ROM, DVD, Blu-ray, or generic disc format.
- Operating-system/platform mark such as PC, Windows, Linux, SteamOS, or macOS.
- Sound-system, codec, middleware, or technology mark.
- Optional additional artwork or short callout content.
- Copyright/legal text, straight or curved around the edge.
- Text layouts that can account for nearby logos, badges, title art, and other visual elements.

Those categories now have an implementation path. Remaining disc-label work is polish, validation, packaging, and future expansion rather than an indev blocker.

Follow-up expectations:

- Treat #69 as closed and preserve the working disc-editor baseline.
- Keep centralized, file-backed, replaceable built-in generic visuals and non-temporary user-facing terminology.
- Preserve preview/export parity through `src/editor/layerOrder.ts` and shared render artifacts where feasible.
- Preserve optional visual disabled-state behavior: hide dependent controls, do not render/export, keep saved state.
- Keep safe-zone compliance for text and movable visual elements.
- Ensure export preflight stays current as visual systems evolve.
- Add or update fixture/manual smoke coverage for title artwork, additional artwork, technical marks, metadata-bound text, and export preflight.
- Complete honest manual runtime smoke before claiming alpha readiness.

Placeholder/generic asset policy:

- Generated placeholder boxes are acceptable only as temporary implementation scaffolding.
- Built-in user-facing generic marks, badges, logos, toast icons, and demo visuals should come from real checked-in files. Official replacements should live in domain folders under `src/assets/`; true temporary fallback files that still include `placeholder` in the filename belong under `src/assets/placeholders/`.
- User-provided custom images should remain supported.
- Official trademarked assets should not be bundled unless licensing is clearly safe.
- Test fixtures may use obvious placeholders when documented as fixtures.

Text-boundary policy:

- Text should always respect the disc safe-zone boundary.
- If text approaches the safe-zone edge, the editor should preserve safe-zone compliance through practical behavior such as clamping, wrapping, adaptive widths, warnings, or shaped text boxes.
- Respecting nearby logos, title art, badges, marks, additional artwork, and other image elements should be user-controllable.
- Users should be able to intentionally overlap art elements for a specific design.
- Ordinary legal/copyright and metadata text should not blindly collide with major enabled visuals.

Toast readiness:

- Preserve the toast notification system and its placement, stacking, and status-feedback behavior.
- Keep wording user-facing.
- Keep icons/assets routed through the built-in asset manifest approach.

High-priority issue order:

- Jewel case editor alpha definition (#126), mirrored in `docs/JEWEL_CASE_EDITOR_ISSUE_DRAFT.md`.
- #125 missing technical mark families as future catalog expansion.
- Fixture/manual smoke follow-up for newer real-disc-art systems if no issue exists.
- #44, #46, #47, and #48 only where they support alpha or reduce active implementation risk.
- #56 only when project file packaging becomes necessary.
- #124 only when Guide Legend relocation is explicitly in scope.

Not blockers for disc-editor alpha:

- Guided Start / wizard (#17).
- Case editors.
- Full `.sbls` package format unless a concrete save/load limitation appears.
- Visual regression automation beyond the manual workflow.
- Broad App.tsx/CSS/Rust refactors unless they directly support alpha blockers.
- Official asset/logo packs.
- IGDB or automatic rating lookup.
- Direct printer support.
- Full arbitrary layer manager.

## Milestone: Jewel Case Editor Alpha

Goal: Make the jewel case editor good enough that a normal user can create, edit, save, reload, and export a print-ready jewel case insert without needing GIMP, Krita, Photoshop, or another editor for ordinary backup-case work.

This milestone follows the disc editor becoming stable enough to serve as a trustworthy foundation. Case editors should not be presented as complete until their own editors can export usable files.

Source-of-truth guides:

- Steam Game Covers front-cover guide: https://www.steamgamecovers.com/how-to-design-a-good-case-front-cover
- Steam Game Covers back-cover guide: https://www.steamgamecovers.com/how-to-design-a-good-case-back-cover
- Steam Game Covers design mistakes guide: https://www.steamgamecovers.com/design-mistakes-and-how-to-avoid-them

Jewel case editor baseline:

- Front cover with background artwork, title/logo artwork, game-info marks, company logos, and optional short callout text.
- Back cover with background artwork, description, feature bullets, screenshots, game-info marks, company/technology logos, system requirements, and legal/attribution text.
- Spine with title/logo behavior, optional Steam Backup/system branding, and optional company mark.
- Template geometry with front, back, spine, bleed/trim, safe zones, and export dimensions.
- Print-quality safeguards that preserve template dimensions, avoid distorted artwork, warn about low-resolution assets, and keep text readable.
- Save/load, preview/export parity, export preflight, and blank-project support.

Shared foundation:

- Template type selector at the top level.
- Shared template model for physical dimensions, safe zones, bleed/printable areas, named regions, and export dimensions.
- Shared project asset library for Steam artwork, screenshots, logos, ratings, and local uploads.
- Shared metadata model used by disc labels and case layouts.
- Shared export pattern for all template types.

Important note:

The disc-label interface is functional. The jewel case editor is next, and DVD/Amaray or Blu-ray template types should not be presented as complete until their editors can actually export usable files.

## Milestone: Guided Start and Blank Project

Goal: Add an opening screen that supports both fast blank work and guided setup.

Guided Start is deferred until the disc and case editor feature sets are stable. Building it before the next editor surface exists would encode assumptions that may change and cause avoidable rework. Guided Start is closer to a last step before beta than a requirement for the jewel case editor to start.

Blank Project:

- Opens the editor directly with default settings.
- Does not require the user to select a game or complete a checklist.
- Supports simple use cases such as uploading one image and exporting.

Guided Start:

- Asks what game the user is backing up.
- Asks what template type the user wants: disc, jewel case, DVD/Amaray, or Blu-ray.
- Asks what disc or case dimensions/template they are using.
- Asks what artwork/background they want.
- Asks whether to use Steam Backup branding, title/logo artwork, additional artwork, media marks, operating-system marks, technical marks, rating badges, developer/publisher logos, and copyright text.
- Sends the user into the editor with the selected setup already prepared.

## Milestone: Alpha UI Polish

Goal: Make the app feel intentional enough for a first alpha package.

Planned work:

- Keep built-in generic visual organization and terminology clean.
- Move Guide Legend into the live preview if #124 is selected for the alpha path.
- Clean duplicate hidden UI markup and panel structure where it remains.
- Improve panel indentation and component organization.
- Add sample project/demo mode only with safe placeholder/generic content.
- Add recent projects if practical.
- Add first-run explanation only if it does not disrupt blank-project speed.
- Add style presets where they support fast label creation.

## Milestone: Beta Reliability

Goal: Make saved projects, exports, and print behavior trustworthy.

Planned work:

- Project schema migration support.
- Expanded export validation warnings.
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

- Recent Projects.
- Guided Start.
- Blank Project opening screen.
- Sample project/demo mode.
- Backup Set project type for multi-disc games.
- Multi-disc labeling beyond the current disc-number fields/badge.

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
- Expanded artwork thumbnails with type, origin, dimensions, and provenance details.
- Additional fixture coverage for current visual systems.
- File-backed built-in generic marks, badges, logos, and toast icons routed through the centralized asset manifest.
- Screenshot selection for case backs.
- Replaceable Steam Backup logo asset behavior beyond the current banner lockup controls.

### Metadata and Text

- Copyright block generator.
- Richer requirements fields for case backs.
- Spine text generator for case templates.
- More advanced text collision handling if current visual avoidance is not enough.
- Clearer metadata-to-rendered-text presets if user testing shows confusion.

### Layout and Editing

- More layout presets.
- Steam Archive Identity style presets.
- Flexible visual-element model if fixed systems become limiting.
- Full arbitrary layer manager later.
- Layer selection.
- Layer hide/lock/reorder behavior if needed beyond fixed layer order.
- Safe-zone severity indicators.

### Export and Print

- Export presets.
- Transparent PNG.
- Print proof.
- Possible PDF export later.
- Direct printer support later.

## Explicit Non-Goal

A permanent project-health/status checklist panel is not currently planned. It risks feeling too hand-holdy and may conflict with the Blank Project workflow. Export-time summaries and warnings are preferred because they help only when the user is about to produce output.
