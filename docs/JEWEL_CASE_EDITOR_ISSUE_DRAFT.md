# Draft Issue: Jewel Case Editor Alpha Finish Line

Draft date: 2026-06-01.

Promoted issue: https://github.com/thelordofdino4/steam-backup-label-studio/issues/126.

This file preserves the reviewed local planning draft used to create #126.

## Proposed Title

Jewel case editor: define case-front, case-back, and spine alpha finish line

## Parent Context

Disc editor alpha feature work is complete and #69 is closed. The next product surface is the jewel case label/editor path.

The goal is not to build a general-purpose image editor. The goal is to let a normal user create, edit, save, reload, and export a print-ready jewel case insert using the same Steam/manual metadata, artwork, asset, preview, and export philosophy that now works for the disc-label editor.

## Source-Of-Truth Design References

- Front cover guide: https://www.steamgamecovers.com/how-to-design-a-good-case-front-cover
- Back cover guide: https://www.steamgamecovers.com/how-to-design-a-good-case-back-cover
- Design mistakes guide: https://www.steamgamecovers.com/design-mistakes-and-how-to-avoid-them

These references should guide the product model, not become copied page text. The app should preserve the design structure they describe while adapting it to Steam backup jewel cases.

## Case Front Model

The front cover should support the common front-cover stack:

- Big background/promotional artwork as the dominant visual.
- Game title or title/logo artwork as the largest foreground identity element.
- Game info marks such as rating badge, media format mark, operating-system/platform mark, or technical mark.
- Company/brand logos such as developer, publisher, studio, distributor, or relevant brand marks.
- Optional short marketing message, edition note, quote, or "includes" callout.

Front-cover defaults should favor a readable, professional layout without requiring external image editing for ordinary use.

## Case Back Model

The back cover should support the common back-cover stack:

- Big background/promotional artwork or designed backdrop.
- Game description text.
- Feature bullets or short feature callouts.
- Optional additional artwork that can use screenshots, key art, or other
  user-selected imagery, added through the shared artwork slot behavior.
- Game info marks such as rating, media format, operating-system/platform, or technical marks.
- Company/technology logos.
- System requirements, including minimum and recommended requirements where available.
- Copyright/legal/attribution text block.

The editor should treat jewel case space as constrained. When content does not fit, defaults and preflight should prefer dropping, shortening, or warning about lower-priority content rather than shrinking text until it becomes unreadable.

## Spine Model

The jewel case spine should support:

- Game title or title/logo artwork, centered or otherwise placed along the spine.
- Developer/publisher logo support near one end.
- Standard branding marks where the selected spine has enough usable space.
- Spine-safe text behavior, including orientation and readable sizing.

The spine must be part of the printable/exported case layout rather than an unrelated afterthought.

## Template And Print Requirements

- Add a jewel case template type with real physical dimensions, safe zones, bleed/trim guides, front region, back region, and spine region.
- Preserve template dimensions. Users should resize/crop artwork, not resize or distort the template.
- Support custom dimensions later only if the template guardrails can keep output understandable.
- Export print-ready output at the existing quality bar, with clear dimensions and guide behavior.
- Preflight should warn about low-resolution images, distorted image fit, unreadable tiny text, missing required regions, guide export, and likely unsafe placement.

## Artwork And Asset Requirements

- Reuse Steam-imported artwork, Steam screenshots, local Steam screenshots, web candidates, and local uploads where they fit the case workflow.
- Support separate artwork choices for front background, back background,
  game-logo/title art, and optional additional artwork elements.
- Do not stretch images non-proportionally to fit a region. Prefer cover/contain/crop controls.
- Warn when an image is likely too low resolution for the chosen print region.
- Preserve custom uploads and asset provenance through save/load.

## Metadata And Text Requirements

- Reuse project metadata from the disc editor where appropriate.
- Add case-specific text fields for description, feature bullets, system requirements, marketing/callout text, and legal/attribution block.
- Imported Steam short descriptions, platform data, rating/legal candidates, screenshots, developer, publisher, release date, and app ID should be useful inputs but remain overrideable.
- Text should stay readable at print size. Preflight should flag text that is likely too small or visually crowded.

## UI Requirements

- Do not hide the current disc editor behind unfinished case tools.
- Introduce template/editor selection in a way that clearly shows which editor is active.
- Keep the blank-project path viable.
- Prefer focused tabs or panels for Front, Back, Spine, Artwork, Branding/Marks, Text, and Export once the case editor has enough surface area to need them.
- Optional visual features should follow the existing hierarchy: show/enable checkbox first, dependent controls hidden while disabled, and state preserved when disabled.

## Architecture Requirements

- Do not add jewel-case state, layout math, export drawing, or renderer logic to `App.tsx` as a dumping ground.
- Create focused case template, layout, project-state, preview, and export modules.
- Reuse existing asset, metadata, mark, rating, and logo domain helpers where they already own behavior.
- Keep preview/export parity explicit from the first implementation pass.
- Save/load must normalize sparse or older project data safely.

## Acceptance Criteria

- A user can create a jewel case project, choose or import front artwork, add title/logo art, marks, logos, and optional callout text, then save, reload, and export.
- A user can design a back cover with description, feature bullets, screenshots, system requirements, legal text, marks, logos, and background artwork.
- A user can configure spine title/logo behavior and export it as part of the full jewel case layout.
- The template dimensions remain print-safe; artwork fitting does not distort images.
- Export preflight catches major case-specific risks without blocking valid simple projects.
- Preview and exported PNG match closely enough for alpha.
- The disc-label editor remains working and is not regressed.
- `npm run lint` and `npm run build` pass after implementation.
- Manual `npm run tauri dev` smoke should verify front, back, spine, save/load, export, and basic interaction before closing the eventual implementation issue.

## Non-Goals For The First Jewel Case Alpha

- DVD/Amaray or Blu-ray case editors.
- Direct printer support.
- Official third-party asset/logo packs.
- A full arbitrary layer manager.
- Advanced photo editing, masking, painting, or filters.
- Automatic perfect cover design.
- Guided Start unless it becomes necessary after the case editor basics are stable.
