# CSS Style Ownership
> Status: Conditional CSS ownership reference.
> Purpose: Style file ownership and CSS boundary guidance.
> Read when: CSS organization, style moves, or design-system cleanup.
> Authoritative source: This document for style ownership; SDD/source for behavior.
> Last reviewed against commit: `6feb262bed2abd36b1371e5c0674013018132d16`.


Last refreshed: 2026-07-04.

Issue #46 tracks CSS organization after the sidebar and preview component
extractions. The current cleanup keeps UI appearance intentional unchanged by
preserving the previous `App.css` cascade order and moving selector groups into
same-directory stylesheet owners.

## Import Order

`src/styles/App.css` is an ordered stylesheet manifest. Keep imports in this
order unless a visual/cascade review proves a move is safe:

1. `app-base.css` - global box sizing, app shell, sidebar base controls, shared buttons, form fields, hints, and template metrics.
2. `app-home.css` - main-menu/home screen layout and cards.
3. `app-preview-shell.css` - preview workspace, disc preview container, and case insert preview container.
4. `app-contextual-text-ribbon.css` - ordered manifest for the app-shell contextual text ribbon split under `src/styles/contextual-text-ribbon/`.
5. `app-case-insert.css` - case insert preview surfaces, guides, front layers,
   control/status cards, vertical-sidebar gutter reservation, and the scoped
   nested-control containment chain.
6. `app-disc-surface.css` - disc background layer, disc guide overlays, center hole, Steam banner, and selected lockup card.
7. `app-responsive.css` - the existing max-width 860px app/home/preview responsive overrides.
8. `app-panels.css` - collapsible panels, panel toggle icon, and Guide Legend swatches.
9. `app-preview-feedback.css` - preview pane label and preview toast stack.
10. `app-artwork.css` - current artwork import section spacing.
11. `app-editor-controls.css` - neutral shared editor control shells,
    text-control cards, stable label/flexible-range/fixed-number row geometry,
    range/style grids, source rows, status cards, and reset/action group
    primitives used by both editors.
12. `app-disc-text.css` - disc text preview layers and disc-number badge layer/styles that are specific to the disc editor.
13. `app-sidebar-features.css` - shared optional-feature cards, contained Case
    surface tabs, background source layout controls, framing-error wrapping,
    and mark-selection helpers.
14. `app-image-candidates.css` - image candidate modal and preview picker styles.
15. `app-metadata-controls.css` - metadata rows, repeated visual cards, logo upload/status cards, logo discovery, and metadata assistance.
16. `app-disc-visual-layers.css` - disc title/additional artwork, logo, rating, media, platform, and technical mark preview layers.

`app-contextual-text-ribbon.css` is itself an ordered manifest. Its current
imports are:

1. `contextual-text-ribbon/shell.css`
2. `contextual-text-ribbon/tabs.css`
3. `contextual-text-ribbon/rows-and-cards.css`
4. `contextual-text-ribbon/dense-text-controls.css`
5. `contextual-text-ribbon/artistic-controls.css`
6. `contextual-text-ribbon/utility-controls.css`
7. `contextual-text-ribbon/artistic-feature-controls.css`
8. `contextual-text-ribbon/preset-controls.css`
9. `contextual-text-ribbon/common-controls-and-html-source.css`
10. `contextual-text-ribbon/responsive-overflow.css`

Keep that sub-order unless a contextual-ribbon visual pass proves a cascade move
is safe. The split files own ribbon presentation only; renderer, text layout,
save/load, export, and target-specific control behavior remain in TypeScript
owners documented by the SDD and text editor contract.

`src/styles/layoutFix.css` remains separate and is still imported from both
`src/main.tsx` and `src/app/App.tsx`. The later `App.tsx` import intentionally
keeps its viewport/layout `!important` overrides after `App.css`. Do not merge
or delete that duplicate import without a visual pass that confirms desktop and
mobile layout behavior is unchanged.

## Stale CSS Removed

The following selectors were removed after a literal source scan and targeted
component inspection confirmed they are no longer emitted by current components:

- `artwork-asset-button`
- `artwork-asset-thumbnail`
- `artwork-asset-thumbnail-placeholder`
- `artwork-asset-copy`
- `artwork-import-heading`
- `local-steam-screenshot-section`
- `local-steam-screenshot-results`

Case insert guide and region role selectors may not appear as full literals in
source because they are generated from guide/region data. Keep them unless the
case insert preview component stops generating those classes.

The current shared-control cleanup also removed stale or migrated CSS ownership
for these old control selector names:

- `selected-lockup-card`
- `disc-text-layout-grid`
- `disc-text-style-grid`
- `disc-text-control-group`
- `disc-text-action-group`
- `disc-text-optional-checkboxes`
- `disc-text-source-row`
- `disc-text-source-button`
- `disc-text-nested-checkbox`
- `disc-text-control-list`
- `disc-text-control`
- `disc-text-enable-row`
- `disc-text-control-body`
- `disc-text-input`
- `disc-text-reset-button`
- `metadata-details`
- `case-insert-control-card`
- `case-insert-file-input`

## Case Nested-Control Geometry

The Case sidebar remains the only vertical overflow owner and reserves a stable
scrollbar gutter. `app-case-insert.css` owns the scoped shrink chain from each
Case workflow section through nested feature panels, repeated artwork cards,
source controls, framing/border controls, status, logos, and marks. Widths
include padding and borders, and flex/grid descendants that carry ordinary
content must allow shrinking inside the panel content box. Do not replace that
contract with broad clipping or a second nested vertical scrollbar.

`app-sidebar-features.css` owns the actual Case surface tablist geometry. Its
three supported surface columns share available width and wrap understandable
labels inside the list. Screenshot slots remain repeated stable-ID collapsible
cards rather than a second tablist.

`EditorRangeField` and `app-editor-controls.css` own stable range-row sizing.
The label column is stable, the native range track is flexible and shrinkable,
and the number input has one fixed character-capacity width derived from its
min/max/step domain plus spinner space. Live X/Y/Scale/focal/Zoom values must
not participate in width calculation. Structural tests can verify these source
contracts; computed containment, focus-ring clearance, and scrollbar-lane
behavior still require native Tauri verification.

## Manual Smoke Checklist

After CSS-only organization changes, use `npm run tauri dev` manually and check:

- Desktop editor layout: sidebar remains fixed-width and scrollable; preview remains centered and clipped correctly.
- Mobile/narrow layout: preview stacks above the sidebar, and panels remain readable.
- Collapsible panels: open/closed states, toggle icon orientation, nested metadata panels, and Guide Legend swatches.
- Disc preview: background drag cursor, guide overlays, center hole, Steam banner, title/additional artwork, logos, rating badge, media/platform/technical marks, and disc text layer stacking.
- Case insert preview: front/back/spine surfaces, region fills, guide lines, front image layers, text blocks, and control/status cards.
- Image candidate picker: modal positioning, preview grid, carousel animation, selection state, and reduced-motion behavior.
- Preview feedback: pane label and toast stack position, truncation, fade animation, and pointer passthrough.
- Contextual text ribbon: fixed header reservation, tabs, rows, dense Text
  controls, Artistic/Utilities/Preset/HTML tabs, horizontal overflow, and toast
  offset below the active ribbon.
