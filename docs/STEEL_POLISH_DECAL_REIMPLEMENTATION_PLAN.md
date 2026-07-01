# Steel Polish Decal Reimplementation Plan
> Status: Temporary working plan.
> Purpose: Guide the photorealistic steel polish reimplementation using stage-owned physical defect decals.
> Read when: Working on the next steel/black-iron polish replacement stages, especially scratch, dent, gouge, pit, scuff, height, AO, normal, and shadow behavior.
> Deletion rule: Delete this document after Stage 10 is implemented, validated, and folded into `docs/STEEL_POLISH_STAGE_MODEL.md` and `docs/ARTWORK_FRAME_MATERIAL_CONTRACT.md`.

This document is a working implementation plan, not an implemented behavior
contract. It exists because the current steel polish renderer still has a
recurring failure mode: old-stage defect shadows can remain visible after the
visible defect should be gone. The next replacement pass must make that
impossible by changing the ownership model.

## Core Rule

Steel damage must be represented as stage-owned physical defect decals.

Each defect decal owns all of its material contributions:

- presence
- body/shape mask
- albedo effect
- height/depth
- ambient occlusion
- normal input
- rim highlight
- rim shadow
- roughness/gloss response
- self-shadow receiver contribution

If `defectPresent === false` for the current polish stage, every channel for
that decal is zero. A non-present scratch, gouge, dent, pit, scuff, or chip may
not contribute color, height, AO, normals, rim response, shadow, roughness, or
self-shadow.

Stable candidate placement may still exist internally for deterministic
seeding, but raw candidates must not directly render or cast shadows. They only
become physical material by activating a decal for the current stage.

## Why This Is Needed

The previous field-based approach let stable candidate masks feed separate
height, AO, rim, and shadow paths. Suppressing the visible layer was not enough,
because another path could still consume the raw candidate field and create a
ghost shadow. That made 30%, 50%, 75%, and 100% polish capable of showing
previous-stage damage.

The decal model prevents this by tying all physical consequences to one active
decal instance. If the decal is absent, there is no shadow left to leak.

## Stage 1: Audit Current Steel Defect Ownership

Implementation:

- Audit `src/render/artworkFrameSteelFinish.ts`.
- Identify every scratch, gouge, dent, pit, scuff, machining, burr, rim, AO,
  height, normal, roughness, gloss, and shadow input.
- Mark each input as either stable placement, active physical feature, or final
  shading response.
- Find every place raw candidate fields directly feed height, AO, normals,
  shadow, self-shadow, albedo, roughness, or gloss.

Safeguards:

- Do not change rendered output.
- Do not change saved project schema.
- Do not reintroduce legacy vector/SVG steel layers.
- Keep preview/export parity intact.

Testing:

- No new tests required in this audit step.
- Produce a short audit note listing raw-candidate-to-shadow leak paths.

### Stage 1 Audit Findings

Stage 1 has been completed as an audit-only pass. No renderer code should be
changed by this stage.

Current source owner:

- `src/render/artworkFrameSteelFinish.ts` owns steel/black-iron finish field
  generation, derived finish maps, normal derivation, self-shadow setup, and
  final steel shading.
- `src/render/artworkFrameMaterialSelfShadow.ts` owns generic height-map
  self-shadow sampling.
- `src/render/artworkFrameMaterialShadingWorkerClient.ts` serializes the steel
  finish map channels for worker/offscreen shading.
- `src/render/artworkFrame.test.ts` currently contains the steel polish,
  stability, preview/export, and shadow regression tests.

Current stable candidate fields:

- `machiningGrooveField`
- `scratchCandidateField`
- `gougeCandidateField`
- `dentPocketField`
- `pitPocketField`
- `scuffCrossScratchField`
- `cloudAbrasionField`
- `buffingReflectionField`
- `protectionVisibilityField`

Current derived maps that look physical but still behave like candidate masks:

- `scratchTroughMask`
- `scratchRimLightMask`
- `scratchRimShadowMask`
- `gougeTroughMask`
- `dentPocketMask`
- `pitPocketMask`
- `burrRidgeMask`
- `scuffCrossScratchTroughMask`
- `scuffCrossScratchRimLightMask`
- `scuffCrossScratchRimShadowMask`

Important naming problem:

- Existing tests intentionally assert that `scratchTroughMask`,
  `gougeTroughMask`, `dentPocketMask`, and `pitPocketMask` stay identical
  across polish values. That made sense when they were treated as stable
  placement masks, but the names read like active physical trough/pocket maps.
- The decal replacement must split this into explicit stable candidate/decal
  placement channels and explicit active physical decal channels. Do not keep
  using a `TroughMask` or `PocketMask` name for a map that is allowed to be
  present when the physical defect is absent.

Current active-ish physical response maps:

- `visibleScratchDepthMask`
- `visibleScratchAmbientOcclusionMask`
- `visibleScratchRimLightMask`
- `visibleScratchRimShadowMask`
- `visibleScratchShadowMask`
- `visibleGougeDepthMask`
- `visibleGougeAmbientOcclusionMask`
- `visibleGougeShadowMask`
- `visibleDentDepthMask`
- `visibleDentAmbientOcclusionMask`
- `visibleDentShadowMask`
- `visiblePitDepthMask`
- `visiblePitAmbientOcclusionMask`
- `visiblePitShadowMask`
- `visibleBurrRidgeMask`
- `visibleDefectShadowMask`

Remaining ownership gaps:

- There is still no decal `present` concept. Every scratch/gouge/dent/pit/scuff
  starts from a scalar candidate field and is only suppressed by polish-response
  multipliers.
- Suppression can make a physical response tiny, but it does not express
  "this decal family is absent at this stage." That means future changes can
  accidentally re-amplify old candidate shadows.
- Scuffed cross-scratches are especially risky: `scuffCrossScratchTroughMask`,
  `scuffCrossScratchRimLightMask`, and `scuffCrossScratchRimShadowMask` still
  feed stage-specific shading and self-shadow receiver logic directly from
  scuff masks rather than from a decal presence contract.
- Machining and brushed grain are also physical surface features, but they are
  different from damage decals. They need a separate non-damage ownership path
  so "remove old damage decals" does not remove legitimate brushed grain.
- `steelHeight` now mostly consumes visible depth maps for scratches, gouges,
  dents, and pits, but it still mixes several feature families in one scalar
  height map. The self-shadow pass can only see final height, so Stage 5 needs
  an explicit local active-relief/self-shadow receiver map derived from active
  decals and machining features.
- `steelAmbientOcclusion`, `steelRoughness`, `steelGloss`, `steelAlbedo`, and
  final shading all derive from blended feature scalars. The replacement must
  make each decal family own its contribution before composition.

Current test gaps:

- Current tests compare stable scalar fields and visible response maps, but do
  not yet prove "inactive decal means zero albedo/height/AO/rim/shadow/
  roughness/gloss/self-shadow contribution" because inactive decals do not
  exist as a typed concept.
- Several tests currently prove placement masks remain stable across polish.
  Those tests should move to stable decal placement/candidate channels after
  Stage 2-4. Active physical decal maps should be allowed, and required, to go
  to zero when the stage deactivates that decal family.

Stage updates from this audit:

- Stage 2 must introduce explicit naming for stable decal placement versus
  active physical decal maps before any visual work.
- Stage 3 must generate decal instances or decal placement channels, not just
  another set of ambiguous scalar fields.
- Stage 4 must create the active/inactive stage gate before Stage 5 rewires
  height, AO, normals, and shadow consumers.
- Stage 5 must update tests that currently treat physical-looking masks as
  stable placement masks.

## Stage 2: Add Typed Steel Defect Decal Groundwork

Implementation:

- Add typed concepts for steel defect decals:
  - scratch
  - gouge
  - dent
  - pit
  - scuff
  - machining nick or burr where useful
- Add explicit separation between:
  - stable decal placement/candidate data
  - active stage-gated decal body maps
  - active physical contribution maps
- Each active decal type should expose owned channels for presence, body,
  height, AO, rim light, rim shadow, roughness/gloss response, albedo response,
  and self-shadow receiver response.
- Reserve legacy map names such as `scratchTroughMask`, `gougeTroughMask`,
  `dentPocketMask`, and `pitPocketMask` as compatibility/transition channels
  only. Do not use those names for new active physical maps unless their values
  really go to zero when the physical decal is inactive.
- Keep output unchanged except for no-op plumbing.

Safeguards:

- Do not remove existing finish maps yet.
- Do not rename public map channels in the same step unless all worker,
  preview/export, and tests are updated together.
- Do not seed decals from polish, tarnish, light, preview bounds, export
  bounds, or texture size.
- Do not make inactive decals render any channel.
- Keep vector fallback removed for canvas-supported steel/blackIron materials.

Testing:

- Add type/descriptor tests proving decal containers can exist.
- Add tests proving descriptors still work without decal data.
- Add no-op tests proving new active decal maps default to zero when no stage
  activation has been wired.

### Stage 2 Implemented Groundwork

Stage 2 has added the typed/no-op steel defect decal groundwork. This is
infrastructure only. It does not change final rendered pixels, does not fix the
old shadow leakage yet, and does not make any new steel damage visible.

Implemented module:

- `src/render/artworkFrameSteelDefects.ts`

Implemented defect kinds:

- `scratch`
- `gouge`
- `dent`
- `pit`
- `scuff`
- `burrNick`

Implemented stable placement container:

- `stablePlacement`
- Role name: `stablePlacementCandidateMaps`
- Channels:
  - `candidateMask`
  - `centerlineMask`
  - `tangentX`
  - `tangentY`
  - `sizeClass`
  - `depthLimit`
  - `edgeRoughness`
  - `stageAffinity`

These channels are placement/candidate data only. They may exist even when a
stage has not activated a physical decal. They must not be treated as rendered
damage, shadow, AO, height, or roughness/gloss contribution.

Implemented active body map container:

- `activeBodies`
- Role name: `activeDecalBodyMaps`
- Channels:
  - `presenceMask`
  - `bodyMask`
  - `coreMask`
  - `edgeMask`

These channels are reserved for Stage 3-4 activation/rasterization work. In the
current Stage 2 groundwork, the empty helper initializes every active body map
to zero.

Implemented active physical contribution container:

- `physicalContributions`
- Role name: `activePhysicalContributionMaps`
- Channels:
  - `albedoResponse`
  - `height`
  - `ambientOcclusion`
  - `normalStrength`
  - `rimLight`
  - `rimShadow`
  - `roughnessResponse`
  - `glossResponse`
  - `selfShadowReceiver`

The Stage 2 zero-contribution rule is explicit: if a decal family is inactive,
all active body channels and all physical contribution channels remain zero.
Stable placement candidates alone are not allowed to contribute color, height,
AO, normals, rim response, roughness/gloss, or self-shadow.

Implemented no-op plumbing:

- `ArtworkFrameSteelFinishDerivedMaps` can optionally carry
  `defectDecalMaps`.
- The derived steel finish map builder can accept the optional container and
  attach it without consuming it.
- Worker/offscreen shading request serialization can deep-clone the optional
  decal containers and transfer their nested `Float32Array` buffers.
- Existing descriptors and derived maps still work without `defectDecalMaps`.

Transition names remain intentionally separated:

- Existing renderer fields such as `scratchTroughMask`, `gougeTroughMask`,
  `dentPocketMask`, and `pitPocketMask` are still transition/compatibility
  concepts.
- New active physical decal channels do not use `TroughMask` or `PocketMask`
  naming, because those names made inactive candidate data look like physical
  rendered damage.

Implemented tests:

- Defect kind and map role separation.
- Legacy transition channel identification.
- Stable placement can be nonzero while active body and physical contribution
  channels remain zero.
- Empty decal containers initialize every active channel to zero.
- Absent decal families have zero height, AO, rim, roughness/gloss, albedo, and
  self-shadow contribution.
- Steel finish maps can exist with or without optional decal containers.
- Existing canvas material descriptors still build without decal data.
- Optional decal containers do not affect existing descriptor cache keys.
- Worker/offscreen serialization clones optional decal containers
  deterministically.
- Preview/export worker request map shapes match when decal containers are
  present.

Intentionally still unwired until Stage 3-5:

- No stable decal instances are generated yet.
- No polish-stage activation model exists yet.
- No active decal body maps are rasterized from placements yet.
- No final steel height, AO, normals, rim response, roughness, gloss, albedo, or
  self-shadow path consumes the new decal containers yet.
- No visual behavior has changed.
- The old shadow leakage problem is not claimed fixed by Stage 2.

## Stage 3: Generate Stable Defect Decal Instances

Implementation:

- Generate deterministic decal instances from the steel finish geometry seed.
- Each decal instance should have stable position, orientation, shape profile,
  size class, roughness class, stage family, and maximum physical depth.
- Prefer instance-like data or clearly named placement maps over ambiguous
  final-looking masks. A scratch decal should know its id/seed, centerline,
  length, width, taper, edge roughness, tangent, and maximum depth before it is
  rasterized into active maps.
- Dents and pits should carry shape/depth classes that distinguish shallow
  brushed-stage micro-defects from rough-stage impact damage.
- Keep this as placement only; do not connect to final rendering yet.

Safeguards:

- Decal placement seed must exclude `metalPolish`, `metalTarnish`, light
  vector, texture size, and preview/export raster bounds.
- `metalBrushAngle` may influence directional interpretation only; it must not
  reroll random placement.
- Decals must not bleed outside the frame ring.

Testing:

- Same seed/frame produces identical decal instances.
- Different material/image seeds produce different decal placement.
- Changing polish/tarnish/light does not change decal placement.
- Changing texture size or preview/export bounds does not change placement.
- Brush-angle changes may rotate directional machining/grain decals only if the
  random instance identity and non-brush damage decal coordinates remain
  anchored.

### Stage 3 Reference Notes

This Stage 3 reference pass is documentation-only. It does not change rendered
pixels, does not add saved project fields, does not activate decal maps, and
does not claim that old shadow leakage is fixed. The reference links below are
for visual study only; no copyrighted/reference image assets are stored in the
repository by this stage.

Reference sources reviewed:

- British Stainless Steel Association, "Specifying mechanically polished,
  brushed and buffed stainless steel finishes and their applications":
  https://bssa.org.uk/bssa_articles/specifying-mechanically-polished-brushed-and-buffed-stainless-steel-finishes-and-their-applications/
- Wikipedia, "Brushed metal":
  https://en.wikipedia.org/wiki/Brushed_metal
- Steel Warehouse, "Mechanical Defects":
  https://www.steelwarehouse.com/mechanical-defects/
- CadNav, "Scratch on the surface of the metal Texture ID5948":
  https://www.cadnav.com/textures/5948.html
- Unsplash search collection, "Scratched metal":
  https://unsplash.com/s/photos/scratched-metal
- Wikipedia, "Pitting corrosion":
  https://en.wikipedia.org/wiki/Pitting_corrosion
- Wikipedia, "Micro pitting":
  https://en.wikipedia.org/wiki/Micro_pitting
- Wikipedia, "Burr (edge)":
  https://en.wikipedia.org/wiki/Burr_%28edge%29
- Werner et al., "Scratch iridescence: Wave-optical rendering of diffractive
  surface structure":
  https://arxiv.org/abs/1705.06086
- Bergmann et al., "The MVTec 3D-AD Dataset for Unsupervised 3D Anomaly
  Detection and Localization":
  https://arxiv.org/abs/2112.09045
- Ruzavina et al., "SteelBlastQC: Shot-blasted Steel Surface Dataset with
  Interpretable Detection of Surface Defects":
  https://arxiv.org/abs/2504.20510
- Zhao et al., "SteelDefectX: A Coarse-to-Fine Vision-Language Dataset and
  Benchmark for Generalizable Steel Surface Defect Detection":
  https://arxiv.org/abs/2603.21824

Photorealistic placement observations:

- Brushed baseline damage should sit on top of a fine, mostly unidirectional
  lay. Reference guidance describes brushed or dull-polished steel as a
  unidirectional, not very reflective finish. Stage 3 placements should
  therefore use the brush direction as a visual field, but should not make every
  defect perfectly parallel or equally spaced.
- Real scratch fields are not soft strokes. They are line-segment-like
  incisions with varied length, taper, interruption, depth, and angle. Some
  scratches intersect; many stay close to the material lay; a smaller number
  cross the grain from handling or tool contact.
- Steel-industry gouge references describe friction gouges as displaced metal
  rolled back into the surface. Placement should reserve wider, torn, clustered
  candidates for gouges instead of representing them as thick transparent
  scratch lines.
- Dents should be shallow irregular deformation pockets. Their placement should
  read as impact/compression sites with asymmetry and local edge variation, not
  as circular holes.
- Pits for the polish model should generally be micro-scale or shallow
  irregular candidates. Pitting references are useful for shape language, but
  Stage 3 must avoid broad crater fields; micro-pitting references point toward
  tiny dull/frosted patches and small cavities rather than large moon-like
  bowls.
- Scuffs should be bounded abrasion regions made from many fine, broken
  micro-scratches and cloudy roughness candidates. They should not be single
  soft oval smudges or one translucent brush pass.
- Burrs and nicks are raised or torn edge artifacts from cutting, machining,
  impact, or deformation. Placement should favor frame edges, corners, and
  high-contact regions, with short broken raised/torn candidates rather than
  long smooth lines.
- Modern steel-defect datasets emphasize that useful defect labels include
  shape, size, depth, position, and contrast. Stage 3 placements should store
  these attributes explicitly so later stages can activate physical contribution
  channels without reinterpreting raw candidate fields.

Per-defect Stage 3 placement targets:

- `scratch`: thin incised line candidates with centerline, tangent, length,
  width class, taper, edge roughness, and maximum depth. Vary spacing and
  angle; avoid same-width squiggles.
- `gouge`: wider torn candidates with broken edge roughness, displaced-material
  hints, shorter clustered spans, and higher maximum depth than scratches.
- `dent`: shallow irregular pocket candidates with asymmetric footprint,
  compression center, softer perimeter class, and restrained maximum depth.
- `pit`: tiny jagged micro-cavity candidates, often clustered sparsely, with
  small footprint and depth classes. Large circular pit candidates are a visual
  regression.
- `scuff`: bounded abrasion-cloud candidates that internally reference many
  fine linelets. Store the region footprint separately from the internal
  micro-scratch direction so the final result cannot become a soft painted
  smudge.
- `burrNick`: edge/corner-biased short torn or raised candidates with strong
  edge roughness and localized footprint.

Diagnostic asset requirement for Stage 3 implementation:

- Every placement generator step must generate previewable diagnostic assets
  under `artifacts/steel-polish-stage3/`.
- Diagnostics should include contact sheets for each defect family and combined
  placement maps.
- Diagnostic assets must visualize candidate placement only. They must not be
  mistaken for final shaded steel and must not be used as texture sources.
- The diagnostic package should compare same seed across polish/light changes
  and different seeds across otherwise matching frame settings.

Visual anti-goals:

- Moon craters or large circular pit bowls.
- Broad transparent brush smudges.
- Random squiggles.
- Sticker-like outlines around defect regions.
- Repeated stamp patterns or evenly tiled defects.
- Equal-width/equal-distance scratches.
- Candidate fields that look physical but can remain visible after the active
  decal is absent.
- Any preview/export-only diagnostic path that bypasses shared placement data.

### Stage 3 Diagnostic Visual Package

Stage 3 now has a previewable diagnostic package under
`artifacts/steel-polish-stage3/`. These files are diagnostic placement assets
only. They visualize stable placement candidates, stable placement map channels,
and stability comparisons. They are not final shaded steel, are not texture
sources, do not activate decal bodies, do not add physical material
contributions, and do not claim native Tauri visual acceptance.

Generator:

- `scripts/generate-steel-polish-stage3-diagnostics.mjs`

Generated contact sheets:

- `scratch-placement-contact-sheet.png`
- `gouge-burr-placement-contact-sheet.png`
- `dent-pit-placement-contact-sheet.png`
- `scuff-placement-contact-sheet.png`
- `all-placement-map-contact-sheet.png`
- `same-seed-polish-stability-contact-sheet.png`
- `same-seed-tarnish-stability-contact-sheet.png`
- `same-seed-light-stability-contact-sheet.png`
- `image-seed-comparison-contact-sheet.png`

Generated package manifest:

- `stage3-diagnostic-package-manifest.json`

Diagnostic package expectations:

- Scratch placement panels should show sharp, thin, tapered candidates rather
  than smudges.
- Gouge, burr, and nick panels should favor sharper torn or edge-biased
  candidates rather than repeated soft marks.
- Dent and pit panels should keep dents shallow/irregular and pits tiny, not
  moon-crater-like.
- Scuff panels should read as bounded micro-abrasion clusters with internal
  directional structure, not broad brush strokes.
- Stability sheets should show unchanged placement across polish, tarnish, and
  light response inputs; their difference panels should remain dark.
- Image/material seed comparison should show a different stable placement
  pattern for a different image-derived seed.

## Stage 4: Implement Polish Stage Activation

Stage 4 is implemented as active-body map groundwork only. It still does not
change final rendered pixels, does not populate material contribution maps, and
does not claim that old shadow leakage is fixed. It creates the active/inactive
stage gate that Stage 5 must use when physical height, AO, rim, roughness/gloss,
and self-shadow behavior are rewired.

Implemented source:

- `src/render/artworkFrameSteelDefects.ts`
- `src/render/artworkFrameSteelDefects.test.ts`
- `scripts/generate-steel-polish-stage4-diagnostics.mjs`
- `artifacts/steel-polish-stage4/stage4-diagnostic-package-manifest.json`

Implemented activation policy:

- `getArtworkFrameSteelDefectActiveBodyResponse()` converts `metalPolish`,
  defect kind, placement `stageFamily`, and stable size/depth traits into
  scalar active-body responses.
- The helper returns:
  - `presence`
  - `bodyStrength`
  - `coreStrength`
  - `edgeStrength`
- The helper is deterministic and bounded. It does not use light, tarnish,
  preview bounds, export bounds, or texture size.
- The policy uses the working checkpoints `0`, `10`, `25`, `30`, `50`, `75`,
  and `100` percent polish.

Implemented checkpoint behavior:

- `0%`: scratches, gouges, dents, pits, scuffs, and burrs/nicks are active.
- `10%`: scratches and scuffs remain active, dents are allowed, and gouges are
  reduced relative to `0%`.
- `25%`: medium scratches and scratch clusters remain active, dents are rare or
  near-zero, and gouges are inactive.
- `30%`: light scratch-cluster bodies remain; heavy gouge, dent, and burr/nick
  bodies are inactive.
- `50%`: brushed baseline keeps hairline scratch bodies; gouges, dents, scuffs,
  and burrs/nicks are inactive, and micropit body population remains below the
  obvious-visibility threshold used by the tests.
- `75%`: only faint residual scratch bodies remain active.
- `100%`: all meaningful active body maps are exactly zero while stable
  placement candidates can remain populated.

Implemented active body map roles:

- `presenceMask`: stage-owned decal existence at the active body level.
- `bodyMask`: active decal footprint.
- `coreMask`: tight active centerline, pocket center, or body core.
- `edgeMask`: active edge/perimeter breakup.

Implemented separation rule:

- Stable placement candidate maps remain the source of anchored candidate
  geometry.
- Active body maps are the only Stage 4 maps that change with polish.
- Changing polish changes active body maps, not stable placement maps.
- Changing tarnish, light vector, preview bounds, or export bounds does not
  change stable placement maps or active body maps.
- Different image/material seeds change stable placement and therefore active
  body maps.

Inactive exact-zero rule:

- If a decal family is inactive at a polish stage, every active body channel for
  that family is exactly zero.
- At `100%` polish, stable placement candidates may remain nonzero, but every
  active body channel is exactly zero.
- Physical contribution maps remain exactly zero in Stage 4.

Physical contribution status:

- Stage 4 intentionally does not populate:
  - `albedoResponse`
  - `height`
  - `ambientOcclusion`
  - `normalStrength`
  - `rimLight`
  - `rimShadow`
  - `roughnessResponse`
  - `glossResponse`
  - `selfShadowReceiver`
- No final renderer, shader, normal, AO, self-shadow, roughness/gloss, or export
  behavior consumes the new active body maps yet.

Diagnostic package:

- Stage 4 generated previewable false-color diagnostic masks under
  `artifacts/steel-polish-stage4/`.
- These assets are not final shaded steel and do not claim native visual
  acceptance.
- Generated files:
  - `polish-checkpoint-active-body-contact-sheet.png`
  - `presence-mask-by-kind-contact-sheet.png`
  - `body-mask-by-kind-contact-sheet.png`
  - `core-mask-by-kind-contact-sheet.png`
  - `edge-mask-by-kind-contact-sheet.png`
  - `inactive-zero-guard-contact-sheet.png`
  - `same-seed-light-active-body-stability-contact-sheet.png`
  - `same-seed-tarnish-active-body-stability-contact-sheet.png`
  - `image-seed-active-body-comparison-contact-sheet.png`
  - `stage4-diagnostic-package-manifest.json`

Implemented tests:

- Activation helper tests cover checkpoint behavior, bounded outputs, exact-zero
  inactive responses, and smooth overlap without hard gaps.
- Active body rasterization tests prove active family behavior at checkpoints,
  stable placement immutability, exact-zero inactive reset, physical
  contribution zero guarantees, and frame-mask clipping.
- Stability regression tests compare actual `Float32Array` map data and prove
  same seed/frame/polish is deterministic, polish changes only active body maps,
  tarnish and light do not change active body maps, preview/export bounds do not
  reroll active maps, and different image/material seeds produce different
  active maps.
- Diagnostic manifest tests prove the expected Stage 4 asset paths are listed
  and labeled as false-color diagnostic masks, not final shaded steel.

## Stage 5: Replace Defect Height/AO/Shadow With Decal Channels

Stage 5 is implemented for the decal-owned physical contribution path. It does
not claim final photorealistic steel acceptance and it does not claim native
Tauri verification. It does confirm, through renderer tests and generated
diagnostic sheets, that defect physical material now comes from active decal
physical contribution maps rather than legacy transition masks.

Implemented source:

- `src/render/artworkFrameSteelDefects.ts`
- `src/render/artworkFrameSteelFinish.ts`
- `src/render/artworkFrameMaterialSelfShadow.ts`
- `src/render/artworkFrame.test.ts`
- `src/render/artworkFrameSteelDefects.test.ts`
- `scripts/generate-steel-polish-stage5-diagnostics.mjs`
- `artifacts/steel-polish-stage5/stage5-diagnostic-package-manifest.json`

Implemented ownership model:

- Stable placement maps remain deterministic candidate geometry only.
- Stable placement maps can stay populated when a defect is inactive.
- Stable placement maps do not directly shade steel, do not directly subtract
  height, do not directly add AO, and do not directly create rim response,
  roughness/gloss changes, albedo response, or self-shadow receiver behavior.
- Active body maps are the only source that can turn a stable defect candidate
  into physical defect material.
- Physical contribution maps are populated from active body maps only.
- Physical contribution maps own the defect contribution channels:
  - `height`
  - `ambientOcclusion`
  - `rimLight`
  - `rimShadow`
  - `roughnessResponse`
  - `glossResponse`
  - `albedoResponse`
  - `normalStrength`
  - `selfShadowReceiver`
- `buildArtworkFrameMaterialHeightSelfShadowMap()` remains a generic
  height-map sampler. Steel controls where that sampled shadow can visibly land
  by using the decal-owned `selfShadowReceiver` contribution for defect damage.
- Machining/brushed baseline surface behavior remains separate from damage
  decal ownership.

Implemented inactive exact-zero rule:

- If a defect decal family is inactive, every active body channel is exactly
  zero.
- If active body channels are zero, every physical contribution channel for that
  defect family is exactly zero.
- Inactive decals contribute no albedo, height, AO, rim light, rim shadow,
  roughness response, gloss response, normal strength, or self-shadow receiver.
- At `100%` polish, stable placement candidates may remain populated, but
  active body and physical contribution maps for meaningful damage are exactly
  zero.

Deprecated legacy physical-material sources:

- `scratchTroughMask`
- `gougeTroughMask`
- `dentPocketMask`
- `pitPocketMask`
- `scuffCrossScratchTroughMask`
- `scratchRimLightMask`
- `scratchRimShadowMask`
- `scuffCrossScratchRimLightMask`
- `scuffCrossScratchRimShadowMask`
- `burrRidgeMask` when interpreted as defect damage

These legacy/transition maps may still exist as compatibility or placement
diagnostic data while later stages are implemented. They must not be treated as
active physical defect material. Tests now assert that legacy scratch, gouge,
dent, pit, scuff, and burr/nick masks cannot create visible physical effects
when active decal physical contributions are absent.

Implemented renderer composition:

- `steelHeight` consumes active decal physical `height` contributions for
  defect damage.
- `steelAmbientOcclusion` consumes active decal physical `ambientOcclusion`
  contributions for defect damage.
- Visible defect rim/shadow response is surfaced from active physical
  `rimLight`, `rimShadow`, and `selfShadowReceiver` contributions.
- Defect-driven roughness, gloss suppression, and albedo darkening are driven
  by active physical `roughnessResponse`, `glossResponse`, and
  `albedoResponse`.
- Defect self-shadow receiver ownership is centralized in
  `getArtworkFrameSteelFinishSelfShadowReceiver()`. Legacy AO, visible damage,
  scuff rim, and burr ridge proxy fields must not create defect self-shadow
  receiver behavior.
- Height and self-shadow sampling stay clipped to the frame ring.

Implemented tests:

- Steel defect tests prove active body maps drive physical contribution maps,
  inactive active bodies produce exact-zero physical contributions, physical
  contributions clip to the frame mask, and worker/offscreen serialization
  preserves stable placement, active bodies, and physical contribution arrays.
- Renderer tests compare actual map arrays, not cache keys only. They prove
  polish changes activation/intensity while stable placement stays anchored;
  tarnish and light do not move steel defect placement; active physical maps
  drive steel height, AO, rim/shadow, roughness/gloss, albedo response, and
  self-shadow receiver behavior; and equivalent preview/export descriptors
  produce matching maps and pixels.
- Stage 5 renderer tests and the generated diagnostic sheets confirm old-stage
  defect physical-shadow leakage is blocked at the shared renderer/diagnostic
  level. This is not the same as native Tauri visual acceptance.

Diagnostic package:

- Stage 5 generated previewable diagnostic assets under
  `artifacts/steel-polish-stage5/`.
- These assets include false-color active body maps, active physical
  contribution maps, final shaded steel diagnostics, light/tarnish stability
  panels, inactive-zero guards, and frame-ring clipping guards.
- Red pixels in guard sheets indicate detected bleed outside the frame ring;
  dark outside-frame regions indicate no bleed.
- Generated files:
  - `polish-checkpoint-active-body-contact-sheet.png`
  - `polish-checkpoint-physical-contribution-contact-sheet.png`
  - `final-shaded-polish-checkpoint-contact-sheet.png`
  - `same-seed-light-final-shaded-contact-sheet.png`
  - `same-seed-light-physical-stability-contact-sheet.png`
  - `same-seed-tarnish-final-shaded-contact-sheet.png`
  - `same-seed-tarnish-physical-stability-contact-sheet.png`
  - `scratch-physical-contribution-contact-sheet.png`
  - `gouge-physical-contribution-contact-sheet.png`
  - `dent-physical-contribution-contact-sheet.png`
  - `pit-physical-contribution-contact-sheet.png`
  - `scuff-physical-contribution-contact-sheet.png`
  - `burrNick-physical-contribution-contact-sheet.png`
  - `roughness-gloss-response-by-kind-contact-sheet.png`
  - `inactive-zero-guard-contact-sheet.png`
  - `frame-ring-clipping-guard-contact-sheet.png`
  - `stage5-diagnostic-package-manifest.json`

Validation status:

- Focused steel defect tests passed.
- Focused renderer tests passed.
- `npm run lint` passed.
- Native Tauri visual verification was not performed.
- No durable contract docs were updated in this stage.

Remaining work for later stages:

- Stage 6 has begun the artistic low-polish rebuild on top of the
  decal-owned physical contribution system. It has source/test/diagnostic
  coverage for the `0-30%` range, but it does not claim final photorealistic
  visual acceptance.
- Stage 6.5 rebuilt the clean steel substrate under damage decals and removed
  substrate-owned pit/dot material response.
- Stage 7 rebuilt the `50-100%` clean steel substrate and high-polish behavior
  in the temporary canvas path. Its source tests and generated diagnostics are
  documented below, but native Tauri visual acceptance was not performed.
- Stage 8 should be scoped from visual review of the Stage 7 diagnostics and
  live app feedback, not from the older satin/semi-bright/mirror plan.
- Stage 9 still needs any rust-over-decal-steel composition follow-up that
  remains after Stage 7 visual review.
- Stage 10 still needs full preview/export parity hardening and native Tauri
  verification before this temporary plan can be deleted and durable contract
  docs can be updated.

## Stage 6: Rebuild Stage 0-1 Damage

Stage 6 is the low-polish artistic rebuild on top of the Stage 5 decal-owned
physical contribution system. This stage is scoped to the `0-30%` low-polish
transition, with `50%` used only as a brushed-baseline guard. The user supplied
watermarked/copyrighted reference images for visual calibration in chat; those
images are not stored in the repository. The notes below capture the intended
visual traits only.

Current Stage 5 audit baseline:

- Stable placement maps are already deterministic candidate geometry only.
- Active body maps are already the gate that turns stable candidates into
  stage-owned physical decals.
- Physical contribution maps already own defect height, AO, rim light, rim
  shadow, roughness/gloss response, albedo response, normal strength, and
  self-shadow receiver.
- `src/render/artworkFrameSteelFinish.ts` already consumes active physical maps
  for defect-caused steel height/AO/material response and keeps legacy
  scratch/gouge/dent/pit/scuff/burr masks out of active physical ownership.
- `getArtworkFrameSteelFinishSelfShadowReceiver()` already centralizes defect
  self-shadow receiver ownership so inactive legacy masks cannot receive defect
  self-shadow.
- The Stage 5 diagnostic package under `artifacts/steel-polish-stage5/`
  provides the before-state reference for Stage 6 tuning.

Stage 6 reference calibration:

- `0%`: dull rough damaged grey steel. The surface should show dense
  micro-roughness, sharp incised scratches, shallow irregular dents, tiny jagged
  pits, localized gouges/burrs, and strong coupled AO/height response. It must
  not read as black crater texture, moon-surface pitting, or painted dark
  strokes.
- `10%`: dark worn low-polish sheet metal. Scuffed/cloudy abrasion should carry
  the read, with scratches and scuff clusters doing most visible work. Gouges
  should be reduced, dents may remain but are calmer than `0%`, and pits should
  be smaller/subtler. Ignore rust or paint-flake color language from references
  unless `metalTarnish` is active.
- `25%`: medium scratched and scuffed steel with emerging sheen. Damage should
  be thinner and sharper than `10%`; dents should be rare and shallow, gouges
  mostly absent, and pits small enough that they do not dominate. The surface
  should begin to catch light like worked steel rather than rough damaged
  plate.
- `30%`: fine directional grain becomes dominant. Remaining damage is mostly
  superficial scratch clusters and occasional fine hairline cuts. Pits, dents,
  and gouges should be mostly absent; this checkpoint should feel like the
  transition into brushed steel, not another rough-damage stage.

Stage 6 visual anti-goals:

- Moon craters or broad circular pit bowls.
- Broad transparent brush smudges.
- Rust/paint-flake color artifacts when tarnish is zero.
- Graffiti-like scratch fields or random squiggles.
- Old-stage dent, gouge, pit, scratch, scuff, or burr shadows visible after the
  active decal body has gone to zero.
- Whole-surface brightness changes as the main mechanism for the polish
  transition.

Implementation:

- Rebuild rough damaged and scuffed-low-polish steel from active decals.
- Stage 0 should read as dull damaged grey steel, not black crater texture.
- Stage 1 should read as scuffed sheet metal, not broad brush smudges.
- Tune physical contribution response and final steel shading only through the
  active decal physical maps and existing clean-steel finish maps.
- Keep the Stage 5 ownership model intact: stable placement does not directly
  shade, active body maps decide presence, and physical contribution maps decide
  material response.

Safeguards:

- Do not store the reference images in the repository.
- Do not update durable contract docs during Stage 6 unless implementation and
  tests make behavior durable enough to fold forward.
- Do not claim photorealistic final acceptance from generated diagnostics alone.
- Do not claim native Tauri verification unless it is actually performed.
- Pits must be shallow/jagged micro-cavities, not moon craters.
- Scratches must be incised hard-edged decals, not soft translucent strokes.
- Dents/gouges must have coupled height, AO, rim response, and roughness.
- Scuffed cross-scratches must be active only in the low-polish stage range;
  they cannot keep rim/shadow contribution once Stage 2 takes over.
- `50%` brushed baseline remains a guard; it must not inherit `0-30%`
  rough/scuffed defect shadows.

Testing:

- Generate contact sheets for polish 0/10/15/25/30 at overhead, 45-degree,
  and grazing light.
- Tests prove defects are active and coupled to height/AO/shadow.
- Tests prove stage 1 is not merely stage 0 with lower opacity.
- Tests prove stable placement stays anchored while active body and physical
  contribution maps change with polish.
- Tests prove inactive exact-zero remains true for every decal family.
- Tests prove `50%` does not carry old low-polish physical defect contribution
  maps.

### Stage 6 Implemented Low-Polish Response

Stage 6 has implemented the first low-polish response pass for `0%`, `10%`,
`25%`, and `30%` polish, with `50%` kept as the brushed-baseline guard. This
section documents implemented and tested behavior only. It does not claim that
the full polish reimplementation is complete, does not claim final
photorealistic acceptance, and does not claim native Tauri verification.

Implemented visual targets:

- `0%`: rough damaged grey steel. The implemented response emphasizes active
  rough-stage scratches, gouges, dents, pits, scuffs, and burrs/nicks with
  stronger height, AO, rim shadow, roughness, albedo darkening, normal strength,
  and self-shadow receiver response. Pit response is constrained to small
  jagged micro-cavity behavior rather than large crater bowls.
- `10%`: dark worn low-polish sheet metal. The implemented response reduces
  gouge intensity, calms dents and pits, keeps scratches and scuff clusters as
  the main damage carriers, and limits sharp catch-light behavior to active
  physical decal response.
- `25%`: medium scratched and scuffed steel with emerging sheen. The
  implemented response makes scratches and scuffs thinner and sharper than the
  `10%` checkpoint, makes dents rare/shallow, keeps gouges mostly inactive,
  and prevents pit response from becoming visually dominant.
- `30%`: handoff into brushed steel. The implemented response favors fine
  directional grain and superficial scratch clusters while keeping pits,
  dents, gouges, scuffs, and burrs/nicks mostly absent. This checkpoint is
  tested as a transition toward the `50%` brushed baseline rather than a
  separate rough-damage stage.

Implemented active physical contribution tuning:

- `src/render/artworkFrameSteelDefects.ts` owns the low-polish response policy
  and active physical contribution scaling for Stage 6.
- Active physical contribution maps remain the only defect-damage source for:
  - `height`
  - `ambientOcclusion`
  - `rimLight`
  - `rimShadow`
  - `roughnessResponse`
  - `glossResponse`
  - `albedoResponse`
  - `normalStrength`
  - `selfShadowReceiver`
- Stage 6 tuning adjusts response strength by active decal kind and polish
  checkpoint. It does not make stable placement maps render directly.
- Scuff and low-polish damage envelopes now fade out before the `50%` brushed
  baseline guard so old scuffed-stage physical response cannot carry into the
  baseline.

Stage 5 ownership preserved:

- Stable placement maps remain anchored candidate geometry.
- Active body maps remain the only way a stable candidate becomes a physical
  decal.
- Physical contribution maps remain derived from active body maps only.
- If active body channels are zero, every physical contribution channel for
  that defect family is exactly zero.
- `src/render/artworkFrameMaterialCanvas.ts` now builds the shared canvas steel
  finish path with the same active decal placement, activation, and physical
  contribution maps used by diagnostics and tests, preserving preview/export
  descriptor parity for canvas materials.
- `src/render/artworkFrameSteelFinish.ts` consumes active decal physical maps
  for defect material response and keeps legacy transition masks from acting as
  active physical damage when decals are inactive.

50% brushed-baseline guard:

- `50%` remains the guard for Stage 7, not a Stage 6 target.
- Stage 6 tests prove the low-polish families `gouge`, `dent`, `scuff`, and
  `burrNick` have exact-zero active body and physical contribution maps at the
  `50%` checkpoint.
- Stage 6 tests also keep pit physical contribution below the obvious
  low-polish visibility threshold at `50%`.
- Renderer tests prove legacy visible shadow/ridge paths do not carry old
  gouge, dent, scuff, or burr/nick physical response into `50%`.

Diagnostic package:

- Stage 6 before-state diagnostics remain under
  `artifacts/steel-polish-stage6/before/`.
- Stage 6 after-state diagnostics are generated under
  `artifacts/steel-polish-stage6/after/`.
- Generated after-state files:
  - `active-body-polish-light-contact-sheet.png`
  - `physical-contribution-polish-light-contact-sheet.png`
  - `final-shaded-polish-light-contact-sheet.png`
  - `polish0-active-physical-final-light-contact-sheet.png`
  - `low-polish-ramp-final-light-contact-sheet.png`
  - `polish0-10-25-final-light-comparison-contact-sheet.png`
  - `polish10-25-30-50-final-light-comparison-contact-sheet.png`
  - `polish25-30-50-final-light-comparison-contact-sheet.png`
  - `inactive-zero-guard-contact-sheet.png`
  - `frame-ring-clipping-guard-contact-sheet.png`
  - `light-stability-contact-sheet.png`
  - `tarnish-stability-contact-sheet.png`
  - `before-after-final-shaded-contact-sheet.png`
  - `stage6-after-diagnostic-package-manifest.json`
- These sheets are diagnostics and regression aids. They are not native Tauri
  visual acceptance and do not prove final photorealism.

Implemented Stage 6 tests:

- Steel defect tests prove stable placement stays anchored across polish
  `0/10/25/30/50`.
- Steel defect tests prove active body maps control defect presence and
  physical contribution maps control height, AO, rim response,
  roughness/gloss, albedo response, and self-shadow receiver response.
- Steel defect tests prove inactive decals are exact-zero.
- Renderer tests prove `50%` does not carry old low-polish physical
  contribution or legacy visible shadow/ridge response.
- Renderer tests prove light changes final shaded pixels only; steel finish
  maps, normals, defect placement, active bodies, and physical contributions
  remain stable across light changes.
- Renderer tests prove tarnish changes do not move steel defect placement,
  active bodies, or physical contribution maps for the same polish checkpoint.
- Validation commands used for this Stage 6 documentation/update pass:
  - `node --test --experimental-strip-types src\render\artworkFrameSteelDefects.test.ts`
  - `node --test --experimental-strip-types --test-name-pattern "stage 6 checkpoints" src\render\artworkFrame.test.ts`
  - `npm run lint`

Remaining Stage 6.5+ work:

- Stage 6.5 and Stage 7 are now implemented in the temporary canvas path.
  Stage 6.5 rebuilt the base substrate below damage decals; Stage 7 extended
  substrate ownership through `100%` polish and added high-polish damage
  survival gates.
- Stage 8 should be scoped from Stage 7 visual review. Do not assume the older
  plan to separately rebuild satin, semi-bright, and near-mirror polish still
  applies; those targets were implemented as part of Stage 7.
- Stage 9 should address only remaining rust-over-decal-steel composition gaps
  found after Stage 7 review. The current Stage 7 tests already cover rust
  composition guards over high polish.
- Stage 10 must complete preview/export parity hardening and native Tauri
  verification before this temporary plan is deleted and durable contract docs
  are updated.

## Stage 6.5: Rebuild Base Steel Substrate

Stage 6.5 is implemented as a temporary substrate-first pass. It does not
complete the full steel polish reimplementation, and it does not establish
native Tauri visual acceptance. Its purpose is to make the clean steel body
inspectable and testable below active damage decals so Stage 7 can rebuild the
`50%` brushed baseline from a clearer base metal layer.

Implemented source ownership:

- `src/render/artworkFrameSteelFinish.ts` owns the stable substrate field,
  derived substrate maps, substrate-to-final composition, finite-difference
  steel normals, and clean steel substrate shading response.
- `buildArtworkFrameSteelSubstrateField()` generates stable substrate field
  geometry from the steel finish field request and the substrate geometry seed.
- `buildArtworkFrameSteelSubstrateDerivedMaps()` derives substrate material
  response maps from the stable substrate field.
- `buildArtworkFrameSteelFinishDerivedMaps()` composes the named owners into
  public final steel maps:
  - substrate maps own base metal,
  - active defect decal physical contribution maps own stage damage,
  - final `steelAlbedo`, `steelHeight`, `steelAmbientOcclusion`,
    `steelRoughness`, `steelGloss`, `steelMetalness`, `steelAnisotropy`, and
    normal inputs remain the shared renderer-facing outputs.
- `src/render/artworkFrameMaterialCanvas.ts` remains the shared preview/export
  canvas material path. It wires active steel defect decal maps before final
  steel maps are derived, without adding a preview-only or export-only
  substrate renderer.

Implemented substrate field channels:

- `substrateLayDirectionX`
- `substrateLayDirectionY`
- `substrateMicroStrandMask`
- `substrateGrainContinuity`
- `substratePlateHaze`
- `substrateInclusionNoise`
- `substrateReflectionVeil`
- `substrateRoughnessVariation`
- `substrateHeightVariation`
- `substrateAnisotropyAspect`

Implemented derived substrate map channels:

- `steelSubstrateAlbedo`
- `steelSubstrateLayDirectionX`
- `steelSubstrateLayDirectionY`
- `steelSubstrateMicroStrandMask`
- `steelSubstrateGrainContinuity`
- `steelSubstratePlateHaze`
- `steelSubstrateInclusionNoise`
- `steelSubstrateReflectionVeil`
- `steelSubstrateHeight`
- `steelSubstrateAmbientOcclusion`
- `steelSubstrateRoughness`
- `steelSubstrateGloss`
- `steelSubstrateAnisotropy`
- `steelSubstrateAnisotropyDirectionX`
- `steelSubstrateAnisotropyDirectionY`
- `steelSubstrateAlongRoughness`
- `steelSubstrateCrossRoughness`
- `steelSubstrateNormalStrength`

Implemented ownership boundary:

- Stable substrate geometry is seeded from material/frame identity and remains
  independent from `metalPolish`, `metalTarnish`, light vector, preview bounds,
  export bounds, texture dimensions, and expanded sampling bounds.
- `metalBrushAngle` affects substrate lay direction interpretation without
  rerolling substrate random identity.
- `metalPolish` changes substrate response amplitude, roughness, gloss, height
  strength, albedo, and normal strength. It does not move substrate placement.
- Active decals remain the only owner of stage damage. Scratches, gouges,
  dents, pits, scuffs, burrs/nicks, and their height/AO/rim/shadow/
  roughness/gloss/albedo/self-shadow contribution must come from active
  decal physical contribution maps.
- Stable placement maps may remain populated when a polish stage deactivates a
  decal family, but inactive active body maps still produce exact-zero
  physical contribution.
- Legacy/transition masks such as `scratchTroughMask`, `gougeTroughMask`,
  `dentPocketMask`, `pitPocketMask`, and `scuffCrossScratchTroughMask` remain
  compatibility diagnostics only. They are not allowed to become active
  physical material owners.

Implemented dot-removal ownership update:

- `substrateInclusionNoise` remains available as a substrate field/diagnostic
  channel, but it no longer owns pit, pore, dot, crater, or speckle material
  response.
- Substrate maps now represent continuous base steel texture only: directional
  lay, micro-strand continuity, plate haze, broad reflection veil, roughness,
  gloss, shallow substrate height, AO, anisotropy, and normal response.
- Pit-like, pore-like, and damage-dot material effects belong to active defect
  decal `physicalContributions`, especially the `pit` decal family.
- Inactive decals still enforce the exact-zero rule. If an active decal body is
  absent for the current polish stage, its height, AO, rim light, rim shadow,
  roughness response, gloss response, albedo response, normal strength, and
  self-shadow receiver contribution must remain zero.
- Stable pit placement candidates may remain populated for deterministic
  placement, but they do not shade steel or cast shadows unless the pit decal is
  active and has populated physical contribution maps.
- The low-polish micro-pore/dot path outside active decals was neutralized so
  continuous substrate detail cannot become hidden pit relief through
  roughness, AO, height, normals, or albedo.

Implemented polish response for substrate review checkpoints:

- `0%` uses the substrate maps as dull rough grey steel with stronger height,
  roughness, mottle, AO, and normal response. Active decals still own resolved
  heavy damage on top.
- `10%` keeps the substrate dark and worn but reduces rough substrate strength
  relative to `0%`; active scratches and scuffs carry most resolved damage.
- `25%` moves the substrate toward a worked steel surface with emerging sheen,
  smaller substrate height response, lower roughness, and higher gloss.
- `30%` emphasizes directional steel character and hands toward the brushed
  range while keeping resolved low-polish damage owned by active decals.
- `50%` is a guard baseline for raw brushed steel. Tests verify clean steel
  luma generally rises from `0%` to `50%`, roughness generally falls, gloss
  generally rises, height/normal strength decrease without going flat, and
  low-polish physical decal contribution does not leak into inactive families.

Implemented anisotropic substrate shading:

- Clean steel shading now uses substrate anisotropy direction and
  along/cross-grain response through the final steel maps.
- The light vector changes final shaded pixels only; it does not change
  substrate fields, substrate derived maps, active decal maps, corrosion maps,
  or normal inputs.
- Brush angle changes the lay direction while preserving substrate identity.
- The substrate shading is intended to improve directional brushed/satin
  response without painted bright strokes. It is implemented and tested, but it
  has not been accepted as fully photorealistic by native Tauri review.

Generated diagnostics:

- `scripts/generate-steel-polish-stage6-5-substrate-diagnostics.mjs`
  generated substrate-only diagnostics under:
  `artifacts/steel-polish-stage6-5/`
- `scripts/generate-steel-polish-stage6-5-composition-diagnostics.mjs`
  generated substrate/decal composition diagnostics under:
  `artifacts/steel-polish-stage6-5/composition-verification/`
- Substrate-only diagnostics include contact sheets for:
  - substrate albedo,
  - substrate height,
  - substrate AO,
  - substrate roughness,
  - substrate gloss,
  - substrate anisotropy direction/aspect,
  - substrate normals,
  - substrate-only shaded steel,
  - fixed-threshold substrate speckle guard,
  - active pit decal ownership diagnostics.
- Composition diagnostics include:
  - `substrate-decal-composition-contact-sheet.png`,
  - `same-substrate-decals-disabled-enabled-contact-sheet.png`,
  - `same-substrate-decals-disabled-enabled-light-contact-sheet.png`,
  - `substrate-speckle-guard-contact-sheet.png`,
  - `active-pit-decal-ownership-contact-sheet.png`,
  - `tarnish-stability-guard-contact-sheet.png`,
  - `light-stability-guard-contact-sheet.png`,
  - `frame-ring-clipping-guard-contact-sheet.png`,
  - `stage6-5-composition-diagnostic-package-manifest.json`.
- The composition manifest records that light changes final shading while map
  diffs remain zero, tarnish does not move substrate/decal placement, and
  substrate/decal/rust/final-alpha bleed outside the frame ring is zero in the
  generated diagnostic cases.
- `scripts/generate-steel-polish-stage6-5-no-dot-verification.mjs` packages the
  no-dot visual verification assets under:
  `artifacts/steel-polish-stage6-5/no-dot-verification/`
- The no-dot package includes:
  - before/after substrate AO contact sheets,
  - before/after substrate height contact sheets,
  - before/after substrate normal contact sheets,
  - before/after substrate-only shaded steel contact sheets,
  - fixed-threshold substrate speckle guard diagnostics,
  - active pit decal ownership diagnostics,
  - substrate with decals disabled/enabled across overhead, 45-degree, and
    grazing light,
  - substrate/decal composition diagnostics,
  - frame-ring clipping guard,
  - `stage6-5-no-dot-verification-manifest.json`.
- These generated assets are diagnostics only. They do not store copyrighted
  reference images and do not establish native Tauri visual acceptance.

Tests and validation run for Stage 6.5 implementation:

- `node --experimental-strip-types scripts\generate-steel-polish-stage6-5-substrate-diagnostics.mjs`
- `node --experimental-strip-types scripts\generate-steel-polish-stage6-5-composition-diagnostics.mjs`
- `node --experimental-strip-types scripts\generate-steel-polish-stage6-5-no-dot-verification.mjs`
- `node --test --experimental-strip-types src\render\artworkFrameSteelDefects.test.ts`
- `node --test --experimental-strip-types src\render\artworkFrame.test.ts`
- `npm run lint`
- `npm run build`

Stage 6.5 safeguards that remain active:

- Do not use substrate maps to reintroduce old-stage scratch, dent, gouge,
  pit, scuff, or burr shadows.
- Do not let stable substrate texture replace active decal ownership.
- Do not move pits, pores, craters, damage dots, or speckle-like physical
  response back into substrate AO, height, normals, roughness, gloss, albedo,
  or self-shadow.
- Do not change stable placement or active body map ownership to tune the
  substrate.
- Do not seed substrate geometry from polish, tarnish, light, preview bounds,
  export bounds, texture dimensions, or expanded sampling bounds.
- Do not claim full polish reimplementation completion or photorealistic final
  acceptance from diagnostics alone.
- Do not update durable material contract docs until the remaining polish
  stages are implemented, tested, and reviewed.

Remaining Stage 8+ work:

- Stage 8 must be re-scoped after Stage 7 visual review. The previous
  satin/semi-bright/near-mirror rebuild plan moved into Stage 7 and should not
  be repeated unless review identifies a concrete visual gap.
- Stage 8 candidates include localized art tuning, better live-app visual
  inspection workflows, or any remaining photorealism gaps found in the
  generated Stage 7 contact sheets.
- Stage 9 should re-open rust-over-decal-steel composition only if review finds
  that rust or exposed chips still resurrect inactive steel defects, move steel
  geometry, or fail to suppress high-polish gloss.
- Stage 10 must harden preview/export parity, complete native Tauri visual
  verification, fold implemented behavior into the durable steel polish and
  material contracts, and delete this temporary plan.

## Stage 7: Rebuild 50-100 Clean Steel Substrate And High Polish

Status: implemented in the temporary canvas steel polish path. This section
documents the implemented and tested Stage 7 behavior only. It does not claim
full steel polish completion, native Tauri visual acceptance, or durable
contract completion.

Implemented reference targets:

- `50%`: raw brushed steel baseline. The composed clean steel is darker than
  satin/high polish, uses dense fine directional brushed grain, has a broad
  soft highlight, and does not carry visible pits, dents, gouges, scuffs,
  burrs, or old low-polish shadows. Hairline-like marks may read as brushed
  texture, not damage decals.
- `75%`: light satin/brushed steel. The substrate is lighter and smoother than
  `50%`, with finer lower-contrast grain and lower roughness. No physical
  damage survives except bounded scratch/hairline contribution.
- `85%`: semi-bright polished/brushed steel. The finish uses coherent broad
  reflection bands, higher gloss, and fine remaining grain. Any warm/cool
  reflected color is a lighting/reflection response only, not base albedo tint,
  paint, rust, or a new material stage.
- `100%`: near-mirror polished steel. The finish keeps broad smooth reflection
  bands, very low roughness, extremely low height/normal variation, and
  ultra-faint scratch/hairline contribution only. Pits, dents, gouges, scuffs,
  burrs, rough-stage shadows, and substrate dot/pore artifacts are absent.

Implemented ownership changes:

- `src/render/artworkFrameSteelFinish.ts` now keeps the Stage 6.5 clean steel
  substrate as the owner for clean steel base behavior through `100%` polish.
  The previous audited `cleanSubstrateBlend` fade-away gap was removed by
  making clean substrate ownership continuous through high polish.
- High-polish substrate response is controlled by a pure response helper for
  `50%`, `75%`, `85%`, and `100%`. It adjusts luma, height strength, AO
  strength, roughness, gloss, reflection veil strength, anisotropy, normal
  strength, and hairline visibility allowance without moving substrate
  placement.
- Clean substrate maps own base metal albedo, continuous grain height, broad
  AO, roughness, gloss, anisotropy, and broad reflection/haze. Active decal
  physical maps remain layered separately on top.
- The Stage 6.5 no-dot rule remains active: substrate maps are continuous base
  steel texture only. Pit-like dots, pores, and damage spots belong to active
  decal physical contributions, not `substrateInclusionNoise`, machining
  candidates, or reflection/haze maps.
- Public reflection and haze maps are stored as low-amplitude broad diagnostic
  masks, then normalized at the steel shading boundary. This keeps diagnostics
  from treating frame-edge clipping or busy texture as reflection detail while
  preserving broad reflection behavior during final shading.

High-polish damage survival policy:

- Above `75%`, only scratch/hairline decal physical contributions may survive.
- At `75%`, scratch/hairline physical contribution is low and bounded.
- At `85%`, scratch/hairline contribution is lower than at `75%`; gouge, dent,
  pit, scuff, and burr/nick active bodies and physical contributions are exact
  zero.
- At `100%`, scratch/hairline contribution is ultra-faint and bounded. All
  non-scratch damage families are exact zero, and inactive stable placement
  candidates do not shade or receive self-shadow.
- Stable placement may remain populated for deterministic continuity, but it
  does not create physical material unless the current polish stage activates a
  body and physical contribution map.

Implemented light and grazing behavior:

- Material light changes final high-polish shading only. It does not move
  substrate fields, substrate maps, active hairline maps, steel normals,
  corrosion maps, rust maps, or geometry/cache-key inputs.
- Full-radius/grazing light has explicit high-polish regression coverage. It
  strengthens broad lit-side and shadow-side response relative to overhead and
  45-degree light without simply dimming the whole surface.
- Micro-normal response remains available for fine grain and ultra-faint
  hairlines, while broad reflection bands stay broad and coherent.

Rust composition guard:

- Rust/tarnish composition over high polish is tested for polish `50%`, `75%`,
  `85%`, and `100%` with tarnish `0%`, `45%`, `80%`, and `100%`.
- Rusted regions suppress polished gloss and remain matte.
- Exposed steel chips may recover localized current-stage steel response, but
  rust does not resurrect inactive steel defects.
- Polish changes do not move corrosion geometry, and tarnish changes do not
  move steel substrate or decal placement.

Diagnostic assets generated:

- `artifacts/steel-polish-stage7/before/`
- `artifacts/steel-polish-stage7/final/`
- `artifacts/steel-polish-stage7/final/substrate-only-shaded-steel-contact-sheet.png`
- `artifacts/steel-polish-stage7/final/final-shaded-decals-disabled-contact-sheet.png`
- `artifacts/steel-polish-stage7/final/final-shaded-decals-enabled-contact-sheet.png`
- `artifacts/steel-polish-stage7/final/substrate-albedo-contact-sheet.png`
- `artifacts/steel-polish-stage7/final/substrate-height-contact-sheet.png`
- `artifacts/steel-polish-stage7/final/substrate-ao-contact-sheet.png`
- `artifacts/steel-polish-stage7/final/substrate-roughness-contact-sheet.png`
- `artifacts/steel-polish-stage7/final/substrate-gloss-contact-sheet.png`
- `artifacts/steel-polish-stage7/final/substrate-anisotropy-normals-contact-sheet.png`
- `artifacts/steel-polish-stage7/final/active-decal-body-maps-contact-sheet.png`
- `artifacts/steel-polish-stage7/final/active-physical-contribution-maps-contact-sheet.png`
- `artifacts/steel-polish-stage7/final/high-polish-damage-survival-contact-sheet.png`
- `artifacts/steel-polish-stage7/final/light-stability-guard-contact-sheet.png`
- `artifacts/steel-polish-stage7/final/frame-ring-clipping-guard-contact-sheet.png`
- `artifacts/steel-polish-stage7/final/rust-composition-guard-contact-sheet.png`
- `artifacts/steel-polish-stage7/final/stage7-final-diagnostic-package-manifest.json`
- `artifacts/steel-polish-stage6-5/no-dot-verification/` remains the
  diagnostic package proving the substrate dot/pit ownership guard after the
  Stage 6.5 no-dot correction.

Tests and validation run for Stage 7 implementation:

- `node --test --experimental-strip-types --test-name-pattern "steel finish (defect masks drive|stage 3 fine|stage 4 semi|stage 5 near|stage 7|clean substrate|substrate maps)" src/render/artworkFrame.test.ts`
- `node --test --experimental-strip-types src/render/artworkFrameSteelDefects.test.ts`
- `npm run lint`
- `npm run build`

Stage 7 source validation covers:

- Substrate ownership remains populated through high polish.
- High-polish clean maps are substrate-owned after the Stage 6.5 handoff.
- Substrate placement maps stay anchored across polish changes.
- Light changes final shading only.
- `50%` reads as the raw brushed baseline without low-polish physical damage.
- `75%` reads as satin/brushed steel with hairline-only damage survival.
- `85%` reads as semi-bright polished steel with broad reflection and no
  low-polish damage survival.
- `100%` reads as near-mirror polished steel without damage ghosts.
- High-polish damage survival gates keep only scratch/hairline contributions.
- Rust composition suppresses polished gloss over corroded regions and does not
  resurrect inactive steel defects.

Native Tauri verification:

- Not performed for Stage 7 in this documentation pass. Do not cite these
  diagnostics or tests as native desktop visual acceptance.

## Stage 8: Live Preview Integration And Texture Fidelity

Stage 8 is now scoped from live-app review after Stage 7. It is not an art-only
tuning pass. The immediate problem is that the Stage 1-7 renderer work exists in
source, but the live preview can still present it as flat grey blocks or stray
pixels because the preview path and diagnostic/export paths are not being
validated at the same effective material texture scale. The regression is not
limited to raised bevel: live review also reproduces the grey/stray-pixel issue
on the flat profile, so flat steel is the required baseline for Stage 8 fixes.

Issue context:

- GitHub issue `#165` remains the active tracker for procedural metallic artwork
  frames. No more specific open issue was found for this Stage 8 live-preview
  fidelity problem during the Stage 8 audit.

Stage 8 audit findings:

- The canvas material renderer is live in source. `src/render/
  artworkFrameMaterialCanvas.ts` builds steel finish maps, defect decal maps,
  corrosion maps, normals, and final shaded pixels through the shared canvas
  material renderer.
- PNG export uses the same renderer through `src/export/drawArtworkFrame.ts`,
  but it builds the material plan from real canvas/export bounds.
- Live preview uses `src/components/preview/ArtworkFrameOverlay.tsx`. For
  additional artwork and case image slots, it builds the material plan from the
  normalized SVG `viewBox`, commonly around `100` units wide, then relies on the
  default canvas material pixel ratio of `2`.
- That means a live preview material texture can be roughly `200px` wide before
  being stretched over a much larger on-screen frame. This can collapse fine
  steel grain, high-polish hairlines, and substrate variation into flat grey
  blocks or isolated enlarged pixels.
- Existing preview/export parity tests mostly build both preview and export
  descriptors from the same synthetic bounds. They prove renderer-domain parity,
  but they do not prove live preview uses enough display-resolution texture
  detail or that preview/export stay visually comparable when preview enters
  through normalized SVG coordinates and export enters through pixel bounds.
- Stage 6.5 substrate maps are generated and consumed for final pixels, but the
  returned `substrateMaps` diagnostic owner is currently attached only at
  `polish >= 72%`. This makes low/mid-polish substrate ownership harder to test
  and can hide regressions around the 0-50% baseline.
- `substrateInclusionNoise` still exists as a field and diagnostic channel, but
  the current audit does not show it driving final substrate AO or height. The
  visible `50%` stray pixels are more likely coming from live preview
  undersampling and/or public brushed-grain/final shading paths than from the
  old inclusion-noise dot source.
- Low-polish texture must still be guarded against dot-like pixel clusters.
  Continuous substrate texture is allowed; pit/dot/damage marks belong to
  active defect decal physical contribution maps only.
- Live menu interaction has regressed. Metal frame controls currently update
  renderer-driving state during slider input, and the preview path synchronously
  renders canvas material textures and converts them to data URLs. Stage 8 must
  measure and fix live responsiveness before adding more visual complexity.
- The sidebar no longer reliably fits the frame controls. The current sidebar
  width, padding, editor-control grid, range inputs, and compact action buttons
  need a layout pass so every enabled metal-frame control remains reachable.

Stage 8 target:

- Make the Stage 1-7 canvas steel renderer visibly live in app preview and PNG
  export.
- Use flat steel as the primary live-app verification profile until raised bevel
  receives a separate repair pass.
- Keep preview and export on the same shared renderer and descriptor contract.
- Preserve the Stage 5 active-decal ownership model and Stage 6.5 no-dot
  substrate rule.
- Preserve Stage 7 high-polish substrate ownership through `50-100%`.
- Remove live-preview undersampling as a source of flat grey blocks and enlarged
  stray pixels.
- Restore usable live interaction performance for frame controls.
- Restore sidebar control fit and reachability.

Stage 8 main issues to fix:

1. Live preview material texture resolution is derived from normalized SVG
   coordinates, not the actual displayed preview size.
2. Low/mid-polish substrate ownership is not sufficiently inspectable in the
   returned maps/tests because `substrateMaps` are exposed only at high polish.
3. Stray pixel and dot guards need to run against the live preview-scale
   material path, not only diagnostic/export-like renderer sizes.
4. Live slider/menu updates can trigger expensive synchronous material rendering
   and data URL generation on the UI path.
5. The sidebar control layout is too cramped for the expanded metal-frame
   controls and must be fixed without hiding enabled controls.

Safeguards:

- Do not reintroduce legacy vector/SVG steel fallback for canvas-supported steel
  or blackIron frames.
- Do not change saved project schema.
- Do not move substrate seeds, defect placement seeds, corrosion seeds, or active
  decal placement.
- Do not let preview-only sizing change export output.
- Do not hide substrate problems behind decals, albedo-only changes, or
  visualization ranges.
- Do not tune appearance before proving the live preview is receiving
  display-appropriate canvas texture resolution.
- Do not add more renderer work to live slider input until the preview render
  path has an interaction-quality or deferred-render boundary.
- Do not solve the sidebar fit problem by removing enabled controls or breaking
  the documented optional-feature control hierarchy.
- Do not claim native Tauri visual acceptance unless it is explicitly performed
  from the primary checkout.

Testing plan:

- Add failing/guard tests for live preview-scale material planning:
  normalized `viewBox` bounds must be able to request display-resolution canvas
  textures without changing geometry seeds.
- Add tests proving interaction-preview quality remains capped while final
  preview/export uses full-quality descriptors.
- Add tests proving preview display sizing changes texture resolution/cache keys
  only where final pixels require rerendering, and does not reroll substrate,
  defect, or corrosion geometry.
- Add tests exposing low/mid-polish `substrateMaps` for diagnostics without
  changing final rendered pixels.
- Add live-scale no-dot tests for `50%` brushed baseline and lower-polish
  checkpoints.
- Add performance diagnostics for live preview material rendering, data URL
  conversion, slider input, and full-quality preview commit.
- Add layout/visibility checks for the artwork-frame metal controls so enabled
  controls remain reachable in the sidebar.
- Add visual diagnostics comparing normalized-preview-sized descriptors against
  display-resolution preview descriptors.
- Run focused renderer tests, focused steel defect tests, `npm run lint`, and
  `npm run build`.

Native visual confirmation:

- Required before claiming the live-app issue is visually fixed.
- Use the primary checkout and flat steel.
- Verify polish `0`, `10`, `25`, `30`, `50`, `75`, `85`, and `100` in the native
  Tauri preview.
- Verify PNG export parity after the live preview path is fixed.

## Stage 9: Recompose Rust Over Decal-Based Steel

Implementation:

- Render clean decal-based steel first.
- Let corrosion override albedo, height, AO, roughness, gloss, and metal
  exposure where rust exists.
- Exposed chips may reveal only the current-stage steel response, not inactive
  old-stage decals.

Safeguards:

- Rust must not move steel decal geometry.
- Steel polish must not move rust geometry.
- Rust must not resurrect inactive steel defects.
- Exposed steel chips should be localized and stage-appropriate.

Testing:

- Tarnish 0/45/80 with polish 0/50/100.
- Tests prove rusted regions suppress clean steel gloss.
- Tests prove exposed chips reveal current-stage steel only.

## Stage 10: Preview/Export Parity And Native Verification

Implementation:

- Ensure preview and PNG export consume the same descriptor, seed, decal
  placement, active decal maps, steel finish maps, corrosion maps, light vector,
  macro lighting context, and full-quality shading path.
- Keep flat profile as the visual testing profile until raised bevel is fixed.

Safeguards:

- No preview-only decal implementation.
- No export-only decal implementation.
- No legacy vector/SVG steel layer.
- No saved project schema change unless separately planned.

Testing:

- Preview/export descriptors match.
- Preview/export final pixels match for equivalent descriptors.
- Same maps plus different light changes final shading only.
- Geometry maps remain stable across light changes.
- Run focused renderer tests, diagnostic contract tests, `npm run lint`,
  `npm run test`, and `npm run build`.

Visual confirmation:

- Native Tauri verification from the primary checkout.
- Flat steel only.
- Polish checkpoints: 0, 25, 30, 50, 75, 100.
- Acceptance:
  - 0% reads rough damaged steel.
  - 30% does not show old rough-stage shadows.
  - 50% reads raw brushed steel.
  - 75% reads satin/semi-polished with no previous-stage shadow bleed.
  - 100% reads bright near-mirror steel with only faint active micro-defects.
  - Grain, decals, rust, and flakes do not move when light changes.

After this stage passes, delete this temporary document and move the durable
implemented contract language into `docs/STEEL_POLISH_STAGE_MODEL.md` and
`docs/ARTWORK_FRAME_MATERIAL_CONTRACT.md`.
