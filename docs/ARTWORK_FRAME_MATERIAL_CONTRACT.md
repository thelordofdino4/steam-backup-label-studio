# Artwork Frame Material Contract
> Status: Reset contract after failed issue #165 branch.
> Purpose: Preserve what was learned from the failed procedural metal-frame
> attempt and define the guardrails for a clean restart.
> Read when: Working on artwork-frame materials, steel/metal frame rendering,
> preview/export parity, material texture generation, or future issue #165 work.
> Authoritative source: This contract for the failed-branch postmortem and
> restart rules; `docs/SOFTWARE_DESIGN_DOCUMENT.md` for preview/export/editor
> architecture.

## Current Status

The canvas/PBR-style artwork-frame material implementation attempted on
`codex/issue-165-metal-frame` is considered failed and is not active in `main`.
The failed dirty state was preserved before excision on:

- Backup branch: `origin/codex/failed-metal-frame-stage8-backup-20260701`
- Backup commit: `3c58a5d8`

Do not merge that backup branch as-is. Treat it as an archive for references,
diagnostic images, and lessons learned only. Any future implementation must
restart from the clean `main` architecture with small audited steps.

## Failure Ledger

The failed branch attempted too much before creating the right ownership
boundaries. The following failures must be treated as requirements for the
restart:

- **Dirty branch size escaped review.** Renderer code, preview integration,
  export integration, tests, diagnostics, artifacts, and UI changes accumulated
  together, making the branch difficult to review, validate, or safely unwind.
- **Artwork-frame ownership was not refactored first.** Material planning,
  preview rendering, export rendering, editor controls, diagnostic generation,
  and runtime performance concerns were changed together instead of being split
  into clear owners.
- **Legacy and new render paths competed.** The work repeatedly exposed old
  vector/SVG/base-fill behavior, canvas material rendering, and profile/depth
  rendering fighting for the same frame surface.
- **Flat and raised profiles were not separated.** Raised bevel remained broken,
  but the flat profile also showed live preview failures. Future work must use
  flat as the baseline until profile rendering is repaired independently.
- **Preview/export parity was not proven in the real app.** Tests and generated
  contact sheets did not guarantee that native preview and PNG export consumed
  the same effective material texture, descriptor, seed, light, and quality
  path.
- **Native live testing came too late.** Browser diagnostics and generated
  artifacts were useful but did not catch that the live Tauri preview still
  showed mostly flat grey steel and stray pixels.
- **Performance regressed.** Live menu and slider interaction became too slow.
  The likely class of failure was expensive synchronous material generation and
  image serialization on the preview/update path.
- **Sidebar layout regressed.** The expanded metal-frame controls no longer fit
  reliably in the sidebar, making controls hard to reach or read.
- **Geometry was repeatedly coupled to response controls.** Tarnish, polish,
  brush angle, width, and light all caused or risked causing procedural features
  to shift. The restart must separate stable geometry from visual response.
- **Rust/tarnish progression regressed repeatedly.** Tarnish had invisible
  ranges, non-smooth stage transitions, preview/export mismatch, outside-edge
  rendering gaps, and patch/splotch/sticker reads.
- **Rust flakes and shadows were difficult to validate.** Lifted flake maps,
  height, AO, roughness, and light-only shading were valuable concepts, but
  geometry stability and native visual acceptance were not proven as a complete
  system.
- **Steel scratches and defects read as smudges.** Several attempts produced
  broad translucent marks, graffiti-like strokes, or brush effects instead of
  physically anchored incisions, dents, pits, and scuffs.
- **Defect shadows outlived defects.** Old-stage height/AO/shadow layers leaked
  into later polish stages. Future defects must be owned by active physical
  decals: if a defect body is absent, its height, AO, rim, shadow, roughness,
  gloss, albedo, normal, and self-shadow contribution must be exactly absent.
- **Substrate and damage were mixed.** Base steel texture acquired dot/speckle
  and pit-like artifacts that belonged to active defect decals, not the clean
  steel substrate.
- **High-polish goals were not fully live.** The intended 50/75/85/100 polish
  progression existed in diagnostics, but it was not visibly delivered in the
  native app.

## Restart Contract

Future artwork-frame material work must start with architecture and validation,
not visual tuning.

Required order:

1. Audit the existing clean `main` artwork-frame owners before code changes.
2. Define the smallest contract slice and tests before implementation.
3. Refactor ownership boundaries before adding material complexity.
4. Prove preview/export descriptor parity at the source level.
5. Prove live native Tauri preview behavior for user-visible rendering changes.
6. Only then tune material appearance.

The restart must keep these boundaries:

- **Geometry inputs:** stable material seed, material identity, frame shape/style,
  and canonical frame coordinates.
- **Geometry exclusions:** polish, tarnish, light, preview size, export size,
  interaction quality, texture dimensions, and transient UI state.
- **Response inputs:** polish, tarnish, brush direction, material type, and
  selected profile may change intensity, visibility, roughness, gloss, height
  scale, color response, and shading, but must not reroll stable placement.
- **Light inputs:** light affects final shading only. It must not move maps,
  height fields, defects, rust, grain, flakes, or seeds.
- **Preview/export parity:** preview and PNG export must consume the same
  renderer-domain descriptor and shared material renderer. Display-resolution
  preview sizing may affect preview texture resolution, but must not alter
  geometry seeds.
- **Performance:** expensive material generation must not run synchronously on
  every live slider/menu input without an interaction-quality, cached, deferred,
  or worker-backed boundary.
- **UI fit:** adding material controls must include sidebar reachability checks.

## Lessons For The Restart

The failed branch produced useful research, but the next attempt must treat
those lessons as process constraints:

- **Material rendering is architecture work first.** Do not begin with
  photorealistic rust, polish, lighting, or texture goals. First establish the
  owners for material planning, map generation, preview consumption, export
  consumption, editor controls, diagnostics, caching, and runtime performance.
- **A visual diagnostic is not a live-app verdict.** Contact sheets,
  generated images, browser screenshots, and unit tests can explain behavior,
  but they cannot prove native preview acceptance. Native Tauri verification is
  required before reporting a user-visible material fix as accepted.
- **Source parity is not enough.** A shared renderer function does not prove
  that preview and export use equivalent descriptors, texture scale, quality
  mode, seed inputs, or light values. Parity must be tested at the descriptor,
  map, shaded-pixel, and native-output levels.
- **Performance boundaries must exist before heavy maps.** If a material needs
  high-resolution procedural fields, normal maps, self-shadowing, or software
  shading, the first implementation must define cache boundaries and
  interaction-quality behavior. Sliders and menus must stay usable while the
  visual result updates.
- **UI fit is part of the feature.** A material system that adds controls must
  prove those controls remain readable and reachable in the sidebar at normal
  desktop and narrow widths.
- **Generated artifacts must not swamp review.** Diagnostic output should be
  intentionally scoped, ignored unless deliberately promoted, and summarized by
  manifests or screenshots. Do not let artifacts balloon a feature branch.
- **Legacy removal must be explicit.** When replacing a rendering owner, remove
  or disable the old owner in the same reviewed slice. Do not leave old fills,
  vector layers, canvas layers, or fallback paths competing for the same
  surface.
- **One visual system per branch slice.** Rust staging, polish staging, light
  editors, performance workers, profile geometry, sidebar controls, and export
  parity are separate concerns. Combining them should be treated as a planning
  failure unless a prior refactor made the combined change trivial.

## Restart Branch Discipline

Future issue #165 work must use small branches that can be reviewed and merged
independently. Each branch should have one primary purpose, such as:

- ownership audit and refactor only;
- descriptor/parity groundwork only;
- live preview texture sizing only;
- sidebar control fit only;
- performance/cache boundary only;
- one material-map family only;
- one visual tuning checkpoint only.

Every branch summary must state whether generated diagnostics were produced,
where they live, whether native Tauri verification was performed, and what was
intentionally left out.

## Steel Material Restart Targets

These are visual goals, not implemented behavior in `main`:

- `0%` polish: dull rough damaged grey steel with real defect depth, not moon
  craters, paint strokes, or random dots.
- `10%` polish: dark worn low-polish sheet metal with bounded scuff abrasion and
  reduced heavy damage.
- `25%` polish: medium scratches and scuffs with emerging sheen; dents and pits
  rare and subtle.
- `30%` polish: fine directional grain becoming dominant; mostly superficial
  scratches.
- `50%` polish: raw brushed steel baseline, darker than satin, dense fine
  directional grain, broad soft highlight, no visible pits/dents/gouges.
- `75%` polish: light satin/brushed steel, low contrast grain, no visible damage
  except possibly ultra-faint hairlines.
- `85%` polish: semi-bright polished/brushed steel with coherent broad
  reflection bands and fine grain.
- `100%` polish: near-mirror polished steel with broad smooth reflection bands
  and hairlines so faint they are barely visible.

## Required Tests Before Future Merge

Any future implementation must include focused tests for:

- Stable geometry across polish, tarnish, light, brush angle, width, preview
  size, export size, and interaction quality.
- Preview/export descriptor parity and rendered-pixel parity for equivalent
  full-quality descriptors.
- Active decal exact-zero behavior for inactive defects.
- Rust/tarnish stage continuity with no dead slider ranges.
- No rust, defect, substrate, shadow, or texture bleed outside the frame ring or
  into artwork.
- Sidebar control fit/reachability for the enabled metal-frame control set.
- Interaction performance boundaries for live slider/menu updates.
- Native Tauri visual smoke for flat steel before claiming acceptance.

## Merge Gate

Do not merge a future material-rendering branch unless the final review summary
separates:

- Source validation.
- Generated diagnostic assets.
- Native Tauri preview verification.
- PNG export verification.
- Performance measurement.
- Known remaining gaps.

If native Tauri verification is not performed, the branch may still be useful,
but it must not claim visual acceptance.
