# CSS Style Ownership

Last refreshed: 2026-06-03.

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
4. `app-case-insert.css` - case insert preview surfaces, guides, front layers, and case insert control/status cards.
5. `app-disc-surface.css` - disc background layer, disc guide overlays, center hole, Steam banner, and selected lockup card.
6. `app-responsive.css` - the existing max-width 860px app/home/preview responsive overrides.
7. `app-panels.css` - collapsible panels, panel toggle icon, and Guide Legend swatches.
8. `app-preview-feedback.css` - preview pane label and preview toast stack.
9. `app-artwork.css` - current artwork import section spacing.
10. `app-editor-controls.css` - neutral shared editor control shells, text-control cards, range/style grids, source rows, status cards, and reset/action group primitives used by both editors.
11. `app-disc-text.css` - disc text preview layers and disc-number badge layer/styles that are specific to the disc editor.
12. `app-sidebar-features.css` - shared optional-feature cards, background source layout controls, and mark-selection helpers.
13. `app-image-candidates.css` - image candidate modal and preview picker styles.
14. `app-metadata-controls.css` - metadata rows, repeated visual cards, logo upload/status cards, logo discovery, and metadata assistance.
15. `app-disc-visual-layers.css` - disc title/additional artwork, logo, rating, media, platform, and technical mark preview layers.

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

## Manual Smoke Checklist

After CSS-only organization changes, use `npm run tauri dev` manually and check:

- Desktop editor layout: sidebar remains fixed-width and scrollable; preview remains centered and clipped correctly.
- Mobile/narrow layout: preview stacks above the sidebar, and panels remain readable.
- Collapsible panels: open/closed states, toggle icon orientation, nested metadata panels, and Guide Legend swatches.
- Disc preview: background drag cursor, guide overlays, center hole, Steam banner, title/additional artwork, logos, rating badge, media/platform/technical marks, and disc text layer stacking.
- Case insert preview: front/back/spine surfaces, region fills, guide lines, front image layers, text blocks, and control/status cards.
- Image candidate picker: modal positioning, preview grid, carousel animation, selection state, and reduced-motion behavior.
- Preview feedback: pane label and toast stack position, truncation, fade animation, and pointer passthrough.
