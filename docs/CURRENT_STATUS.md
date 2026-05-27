# Current Project Status

Steam Backup Label Studio is currently in **pre-alpha**.

## Core Workflow Status

The current working interface is the **disc-label editor**.

The core disc-label workflow has many working foundations:

- Launch the Tauri desktop app.
- Search Steam for a real game.
- Import game metadata.
- Import available Steam artwork.
- Import Steam library capsule and hero artwork when available.
- Import Steam screenshot artwork and local Steam screenshots when available.
- Apply imported or local artwork as the disc background.
- Manage imported Steam artwork from the Artwork panel.
- Drag and resize the background artwork.
- Choose a standard printable disc template or custom dimensions.
- Use physical center hole, inner print boundary, outer print boundary, and safe-zone geometry.
- Use a real default Steam-style banner lockup at the top or bottom of the disc, or hide it.
- Adjust Steam banner colors, lockup image, scale, and offsets.
- Edit project-owned metadata fields for imported or manual projects.
- Add optional developer and publisher logos with alignment presets.
- Add optional rating badges with placeholder rendering or custom image replacement.
- Enable optional disc text elements for title, disc number, backup date, Steam App ID, custom note, and copyright/legal text.
- Use stable centered curved copyright/legal text with arc length, angle, inset, scale, side, and wrapping controls.
- Save and reload project files.
- Reset to a new project.
- Export a clean 300 DPI PNG.
- Optionally export guide marks.
- Receive status feedback through the preview toast feed.

Recent parity/refactor work exposed regressions in text bounds, drag behavior, manual controls, and platform/media mark behavior. Treat the disc-label editor as a strong working foundation, but do not assume every listed interaction is currently regression-free until the emergency architecture issues are resolved and revalidated.

## Scope Reminder

The app is not close to full product completion yet. The current progress is focused on one of the planned interfaces: the disc-label editor.

The next major milestone is the **disc artwork editor alone** reaching alpha quality. Per issue #69, that means a normal user can create, edit, save, reload, and export a print-ready disc label without needing GIMP, Krita, Photoshop, or another editor for ordinary backup-label work. This does not mean Steam Backup Label Studio as a whole is alpha.

Future planned interfaces still need to become functional:

- Jewel case insert editor.
- DVD/Amaray case cover editor.
- Blu-ray case cover editor.

Much of the current work should become reusable foundation for those interfaces, but shared foundation is not the same as finished template editors.

Guided Start, case editors, the future `.sbls` package/container format, direct printer support, official asset packs, automatic rating lookup, visual regression automation, and broad Rust refactors are not disc-editor alpha blockers unless a specific issue shows they are needed for one of the finish-line items.

Architecture guardrails are now alpha-boundary blockers. The editor cannot reach the end of indev if new logic continues to be added to unrelated structures or if preview/export parity depends on hidden coupling. See `docs/ARCHITECTURE_GUARDRAILS.md`.

## Disc Editor Alpha Boundary

The disc editor is not yet alpha-complete. It still needs to support the visual structures that common real-world game discs use:

- Dedicated title/logo art, not only rendered title text.
- Age rating mark.
- Developer logo.
- Publisher logo.
- Additional company, studio, distributor, middleware, sound-system, platform, store, network, and media-format marks.
- Region/video-system style markers such as generic NTSC/PAL-style badges where appropriate.
- Optional quote or short callout text.
- Copyright/legal text, straight or curved around the edge.
- Text layouts that can account for nearby title art, logos, badges, and marks.

The app should not bundle official trademarked assets unless licensing is clearly safe. Built-in user-facing generic marks, badges, logos, toast icons, and demo visuals should come from real checked-in asset files, likely under `src/assets/` or a dedicated asset folder. Generated CSS/canvas placeholder boxes are acceptable during indev implementation, but they block disc-editor alpha if they remain the final user-facing representation.

The current editor systems are a launchpad, not rubble. Steam/manual metadata import and editing, background artwork import/placement/scaling, disc templates and geometry, safe-zone guides, Steam banner controls, developer/publisher logos, rating badges, media/platform mark work, disc text controls, New Project, save/load, export, preview, sidebar panels, and the toast notification foundation should be preserved and evolved through careful migrations.

Text-boundary behavior is a real completion blocker. Text must always respect the disc safe-zone boundary, even if that requires clamping, wrapping, adaptive widths, warnings, or shaped text boxes. Respecting nearby logos/images/marks should be user-controllable so users can intentionally overlay art elements, but ordinary legal/copyright and metadata text should not blindly collide with major enabled visuals.

Toast notifications are part of alpha readiness. The current toast foundation should remain, but wording needs a user-facing review, temporary symbols/placeholders should be replaced with real icons or a consistent final visual system, and placement/stacking/status behavior should not be casually broken.

Current project files are plain JSON, commonly named like `.sbls.json`. The future `.sbls` package/container format is not implemented yet and should not block disc-editor alpha by default.

## Architecture Guardrails

New development must follow `docs/ARCHITECTURE_GUARDRAILS.md`.

The short version:

- New logic must not be crammed into existing unrelated structures.
- New responsibilities need focused `.ts` or `.tsx` modules.
- `App.tsx` should move toward orchestration, not feature ownership.
- Preview/export visual layers should use shared artifacts wherever feasible.
- Layout, clamping, upload/import, drag interaction, rendering, export, and persistence logic should have clear owners.
- A passing visual fixture is validation evidence, not proof that the architecture is safe.

## Refactor Status

The older emergency editor-foundation refactor tracked in issue #36 extracted several major responsibilities from `App.tsx`, but recent regressions show that deeper architecture guardrails are now required.

Completed high-risk refactor work includes:

- Shared disc text types/utilities consolidated outside `App.tsx`.
- Shared byte/base64 utility added for Steam and local artwork paths.
- Project file schema types and project JSON normalization landing point moved into `src/project/`.
- Tauri frontend file wrappers added in `src/tauri/fileSystem.ts`.
- PNG export rendering moved into `src/export/` modules.
- Toast ID generation cleaned up so lint has a clean baseline.
- Status toast state and helpers extracted into `src/hooks/useStatusToasts.ts`.
- Sidebar panels extracted as presentational components.
- Preview UI extracted into focused preview components.

Current validation:

- `npm run build` has passed in recent work.
- `npm run lint` has passed in recent work.
- Local smoke tests exposed regressions now tracked under emergency architecture/refactor issues.

See `REFACTOR_STATUS.md` and `ARCHITECTURE_GUARDRAILS.md` for details.

## Recently Completed

- Physical disc geometry system.
- Custom disc dimensions with validation.
- Export pixel dimensions based on physical disc size at 300 DPI.
- Better Steam artwork scaling.
- Fixed preview layout so the disc remains visible while editing.
- Minimum desktop window size to prevent unusable layouts.
- Independently collapsible editor panels.
- Stale prototype UI cleanup.
- Meaningful Guide Legend.
- Custom crowbar panel toggle icon.
- Imported Steam artwork moved into the Artwork panel for the user-facing workflow.
- Steam library artwork discovery.
- Steam screenshot and local Steam screenshot discovery.
- Labeled preview pane.
- Top-right stacked preview toast notifications.
- Default Steam banner lockup image support.
- Steam banner export alignment matching the current mockup baseline.
- User-facing Steam banner color, lockup image, scale, and offset controls.
- Project-owned editable metadata fields.
- Developer and publisher logo assets with alignment presets, preview, export, and save/load support.
- Rating badge support with ESRB/PEGI/custom placeholders, custom image replacement, preview, export, and save/load support.
- New Project reset behavior.
- Optional disc text elements for title, disc number, backup date, Steam App ID, custom note, and copyright/legal text.
- Straight copyright mode fixed to use normal straight-text positioning instead of curved inset positioning.
- Disc text helper logic extracted from `App.tsx` into a dedicated `src/discText.ts` module with no behavior changes.
- Disc geometry and export-guide selection helpers extracted from `App.tsx` into focused modules (`src/discGeometry.ts`, `src/exportGuides.ts`) as part of controlled editor-foundation refactoring.
- Project file schema helpers, Tauri file wrappers, PNG export rendering, status toast state, sidebar panels, and preview UI extracted from `App.tsx` as part of issue #36.
- GitHub Actions updated for Node 24 compatibility.
- Planning documents refreshed with milestone and backlog details.

## Active / Open Work

- Emergency rendering architecture and parity refactor (#82).
- Straight text safe-zone regression (#83).
- Drag interaction regression (#84).
- Media/platform mark controls regression.
- Add dedicated title/logo art support.
- Add general additional artwork/logo elements and multiple logo/mark support beyond fixed developer/publisher slots.
- Replace generated user-facing placeholders with real file-backed generic assets.
- Add text behavior that can optionally respect visual element boundaries while always enforcing safe-zone compliance.
- Polish toast wording and replace temporary toast symbols/icons.
- Clarify metadata-to-rendered-text behavior.
- Add curved copyright text alignment modes only if they do not regress stable centered curved text; otherwise formally keep centered-only curved text as the alpha-supported behavior.
- Add adjustable straight text box widths and layout presets if placement remains too fiddly.
- Constrain movable visual elements to safe-zone geometry.
- Expand export-time summary/preflight behavior for new logo/rating/mark/text/layout risks.
- Track asset provenance and replacement behavior for imported and uploaded visual assets.
- Document/enforce preview/export layer ordering.
- Improve artwork picker presentation with thumbnails, asset type, origin, and dimensions.

## Deferred Alpha Cleanup

- Remove duplicate hidden UI markup created during conservative pre-alpha changes.
- Review panel indentation and structure.
- Clean up duplicate CSS overrides once component boundaries settle.
- Add project fixtures and preview/export comparison workflow for regression testing when the alpha element model is stable enough.
- Continue post-refactor cleanup tracked in issues #44-#49 where it supports feature work or alpha blockers.

## Current Known Limitations

- Only the disc-label editor is functional.
- The app is pre-alpha overall, and the disc editor is not yet alpha-complete.
- Case templates are not implemented yet.
- Full layer management is not implemented yet.
- Dedicated title/logo art and arbitrary additional visual/logo elements are not implemented yet.
- Built-in user-facing placeholder visuals are not all file-backed generic assets yet.
- Project metadata fields are editable, but asset provenance and schema validation/migration remain limited.
- Metadata-to-rendered-text behavior is not fully defined yet.
- Curved copyright text is currently stable only in centered mode; left/right curved alignment is tracked separately.
- Straight text boxes and safe-zone behavior are under active regression review.
- Text does not yet understand or warn about occupied regions from logos, badges, title art, marks, and other major visual elements.
- Movable visual element drag/manual controls are under active regression review.
- Some duplicate hidden markup remains intentionally deferred until alpha cleanup.
- Project files are currently plain JSON, often named like `.sbls.json`; the future `.sbls` package/container format is not implemented.
- The app has not yet been packaged into an alpha release, and a future package release should clearly state that only the disc editor is the first alpha surface when ready.

## Next Recommended Work Order

1. Stabilize the architecture guardrails and emergency parity/refactor work (#82).
2. Fix straight text safe-zone behavior (#83) after ownership boundaries are clear.
3. Fix drag and media/platform control regressions (#84 and related issue) after ownership boundaries are clear.
4. Use issue #69 as the finish-line definition for disc-editor alpha.
5. Clarify metadata-to-rendered-text behavior (#68).
6. Document and enforce disc editor layer ordering across preview and PNG export (#60 / #82).
7. Expand export summary/preflight warnings for logos, marks, text collisions, guide marks, backgrounds, custom dimensions, and missing assets (#63).
8. Explain missing/disabled visual dependencies locally near controls (#66).
9. Add dedicated title/logo art support.
10. Add general additional artwork/logo elements and multiple logo/mark support beyond fixed developer/publisher slots.
11. Replace generated user-facing placeholders with real file-backed generic assets.
12. Add text behavior that can avoid or respect visual element boundaries, with safe-zone compliance always enforced.
13. Polish toast wording and replace temporary toast symbols/icons (#49 / #21).
14. Add layout presets if manual placement remains too fiddly (#61).
15. Decide curved copyright alignment: implement safely or formally keep centered-only curved text (#33).
16. Improve artwork picker presentation.
17. Continue post-refactor cleanup from issues #44-#49 only where it supports feature work or alpha blockers.
18. Prepare known issues and package the first disc-editor alpha build when the disc-label path is stable enough.

See `MILESTONES.md` for the broader milestone and feature backlog.
