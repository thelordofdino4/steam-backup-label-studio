# Steel Polish Stage Model
> Status: Implementation planning contract.
> Purpose: Define a staged, physically motivated polish and finish model for steel and black-iron artwork frame surfaces.
> Read when: Implementing or reviewing steel/black-iron `metalPolish` behavior, brushed grain, scratch/dent/pit maps, roughness/gloss response, canvas material textures, preview/export parity, or polish-stage tests.
> Authoritative source: This file for steel/black-iron polish staging intent; `docs/ARTWORK_FRAME_MATERIAL_CONTRACT.md` for the broader frame-material contract; `docs/SOFTWARE_DESIGN_DOCUMENT.md` for preview/export architecture.

This document is intentionally narrow. It describes how the steel finish should
progress from rough unpolished metal to near-mirror polished metal. It does not
define rust progression; steel and black-iron rust remains governed by
`docs/STEEL_RUST_STAGE_MODEL.md`.

The implemented steel and black-iron polish path is a canvas material system
where the same finish state drives albedo, height, normal response, ambient
occlusion, roughness, gloss, anisotropic direction, defect depth, reflection
bands, and lighting response. The old vector steel polish approximation has
been removed and must not be restored as a competing fallback for
canvas-supported metal frames.

## Current Research Basis

Existing repository research already established these visual requirements:

- Low polish means rough damaged steel: deeper machining lines, populated
  scratches, gouges, dents, rough cloudy abrasion, stronger AO, stronger height
  offsets, lower gloss, and dirtier reflectance. It should stay in the family
  of dull grey metal rather than becoming a black crater texture.
- 50% polish is the required brushed-steel anchor: dense directional grain,
  uneven micro-lines, interrupted strands, soft anisotropic light bands,
  restrained scratches, subtle micro-pitting, and medium stainless-grey value.
- High polish suppresses scratch, dent, and pit depth, lowers roughness,
  tightens the gloss response, raises broad coherent reflection, and moves the
  surface toward bright stainless and near-mirror polish instead of isolated
  bright strokes.
- `metalBrushAngle` is the user-owned lay direction. `metalPolish` must not
  rotate it implicitly.
- The material light vector is a lighting input. It may change highlight and
  shadow response, but must not move finish geometry.
- The active steel/black-iron polish implementation uses the same canvas-map
  discipline as rust. Unsupported descriptors or renderer failures must not
  draw a second vector steel material pass.

## Current Baseline Audit

The 2026-06-28 baseline audit captured the current renderer before the polish
replacement pass. The artifact package lives under
`artifacts/steel-baseline-audit/` and includes a flat-steel contact sheet plus
numeric metrics for polish 0, 25, 50, 75, and 100 under overhead, 45-degree,
and grazing light.

The audit established these replacement targets:

- Current 0% polish is too black and cratered. The next implementation should
  keep the low end dull and damaged, but pitting must read as shallow
  steel wear rather than moon-surface craters.
- Current pit population is effectively constant through the polish range. The
  stable pit candidates may remain anchored, but visible pit depth, AO, size,
  and population must reduce with polish response.
- Current overhead brightness is not a usable polish continuum: the audit
  recorded 50% as darker than 25%. The 50% brushed anchor must not dip below
  the scuffed-low range in frame-level clean-steel brightness.
- Current high polish has low roughness and high gloss numerically, but it
  still needs stronger lit-side energy and coherent reflection so it reads as
  polished stainless or near-mirror steel rather than pale flat grey.
- Light direction is a final-shading input only. Strengthening high-polish
  highlights and shadows must not move finish fields, defect masks, rust maps,
  or material seeds.

## External Research Basis

Useful finish and rendering facts for the renderer:

- Mechanical grinding and polishing remove metal with abrasives. The resulting
  surface keeps directional marks whose visibility depends on grit, pressure,
  contact time, feed rate, and wet/dry process, not only one "polish" value.
- Brushing modifies the surface with fine abrasive or fabric media and produces
  a dull-polished unidirectional texture rather than a mirror surface.
- Stainless steel finish guidance distinguishes ground, brushed/dull-polished,
  satin-polished, and bright-polished finishes. Typical roughness values from
  BSSA put brushed/dull-polished around `Ra 0.2-1.5 micrometers`,
  satin-polished below `Ra 0.5 micrometers`, and bright-polished below
  `Ra 0.1 micrometers`.
- A high-quality mirror or bright polish still depends on the underlying steel.
  Existing pits, inclusions, or coarse preparation can remain visible after
  polishing or buffing.
- Surface roughness is not captured by one number alone. Area parameters such as
  `Sa`, texture direction (`Std`), auto-correlation/aspect ratio (`Sal`/`Str`),
  and RMS slope (`Sdq`) correspond well to renderer map channels: height
  amplitude, lay direction, feature spacing/aspect, and normal strength.
- Microfacet BRDF research models reflectance through a distribution of tiny
  surface normals plus masking/shadowing. For this app's software canvas
  renderer, that supports deriving normals from stable height maps and using
  roughness/anisotropy to shape broad highlights rather than painting highlight
  strokes.
- Anisotropic BRDF models use separate roughness widths along principal tangent
  directions. For brushed steel, the tangent should come from `metalBrushAngle`
  plus stable local waviness, not from the light position.
- Scratch-rendering research treats visible scratches as spatially resolved
  line-segment microstructure whose appearance changes with light and viewing
  conditions. The practical takeaway is that scratches need stable geometry,
  trough height, rim normals, AO, and roughness changes; they should not be
  soft translucent paint strokes.

References used for this planning model:

- British Stainless Steel Association, "Specifying mechanically polished,
  brushed and buffed stainless steel finishes and their applications":
  https://bssa.org.uk/bssa_articles/specifying-mechanically-polished-brushed-and-buffed-stainless-steel-finishes-and-their-applications/
- KEYENCE, "Sa (Arithmetical Mean Height) | Area Roughness Parameters":
  https://www.keyence.com/ss/products/microscope/roughness/surface/parameters.jsp
- KEYENCE, "Std* (Texture Direction) | Area Roughness Parameters":
  https://www.keyence.com/ss/products/microscope/roughness/surface/std-texture-direction.jsp
- KEYENCE, "Sal (Auto-Correlation Length) / Str (Texture aspect ratio)":
  https://www.keyence.com/ss/products/microscope/roughness/surface/sal-auto-correlation-length.jsp
- KEYENCE, "Sdq (Root Mean Square Gradient) | Area Roughness Parameters":
  https://www.keyence.com/ss/products/microscope/roughness/surface/sdq-root-mean-square-gradient.jsp
- Bruce Walter, "Notes on the Ward BRDF", Cornell Program of Computer
  Graphics, 2005:
  https://www.graphics.cornell.edu/~bjw/wardnotes.pdf
- Heitz, "Understanding the Masking-Shadowing Function in Microfacet-Based
  BRDFs", Journal of Computer Graphics Techniques, 2014:
  https://jcgt.org/published/0003/02/03/paper.pdf
- Werner et al., "Scratch iridescence: Wave-optical rendering of diffractive
  surface structure", arXiv, 2017:
  https://arxiv.org/abs/1705.06086

## Core Renderer Rule

Polish is a generated finish state, not an opacity curve over vector scratches.

For steel and black iron, `metalPolish` feeds a stable finish field. That field
then derives maps:

- Albedo: cold grey steel, darker dirty rough valleys, pale worn abrasion,
  medium stainless-grey brushed tonal striations at the 50% anchor, and bright
  blurred reflected bands at high polish.
- Height/displacement: machining grooves, scratch troughs, gouges, dents,
  shallow micro-pits, raised burrs, buffed-down plateaus, and subtle polished
  waviness. Pit height must be restrained enough that steel does not read as a
  crater field.
- Normal response: all lit rims, shadow rims, broad slope bands, and polished
  highlight gradients derive from height gradients plus anisotropic
  tangent data.
- Ambient occlusion: scratch troughs, gouges, dent floors, pits, scuffed
  cross-scratches, and machining valleys get local darkness from shared
  geometry.
- Roughness/gloss: rough steel is high roughness and low gloss; brushed steel
  has anisotropic roughness; polished steel has lower roughness, tighter gloss,
  and broad coherent reflection veils.
- Anisotropy: brushed and satin stages need a stable material tangent from
  `metalBrushAngle`, varied by a low-amplitude stable waviness map.
- Defect masks: scratches, gouges, dents, pits, scuffs, and machining grooves
  must be stable candidate features whose visibility, depth, AO, apparent size,
  and response change with polish stage, not separate random rolls per polish
  value. Placement stability does not mean constant visible pit population.

The material light vector is applied only during final software shading. It may
change diffuse value, broad anisotropic bands, rim highlights, rim shadows, and
gloss, but it must not alter finish fields, defect masks, height, normals, AO,
roughness, gloss, anisotropy direction, or cache-key geometry inputs.

`metalBrushAngle` may change the lay direction of grain, machining, and
anisotropic shading because it is the user-owned material direction. It must not
reseed random defect placement. Scratches, pits, gouges, and dents that are not
defined as brush-grain features remain anchored when brush angle changes.

`metalTarnish` is a separate corrosion/aging stage input. Rust may cover or
matte the steel finish, but it must not change the underlying steel finish seed.
The final material composition should render clean steel finish first, then let
corrosion maps override albedo, height, AO, roughness, and metal exposure where
rust exists.

## Finish Field

`src/render/artworkFrameSteelFinish.ts` owns the stable steel finish field,
stage units, derived finish maps, finite-difference normals, and software
shading pass. Each canvas-supported steel/black-iron frame has a stable steel
finish field generated from deterministic seeds. The field combines:

- Abrasion direction field: the main material lay from `metalBrushAngle` plus
  stable local waviness and short direction discontinuities.
- Machining groove field: parallel and semi-parallel micro-troughs with uneven
  spacing, varied width, interrupted starts/stops, and occasional same-direction
  overlaps.
- Scratch/gouge field: hard-edged trough candidates, wider gouge candidates,
  torn burr segments, and paired rim candidates.
- Dent/pit field: small irregular negative-height pockets, faceted dents, dark
  pit floors, and crisp rim-catch segments.
- Cloud abrasion field: broad low-frequency mottled roughness that affects
  albedo, height, and roughness without reading as a soft brush stroke.
- Buffing/reflection field: broad low-frequency reflection veils and vertical or
  tangent-aligned tonal bands that become visible at high polish.
- Protection/visibility field: stable masks that let polish stage suppress
  defect depth or reveal cleaner plateaus without relocating defects.

The finish geometry seed includes the material seed key when present,
metal identity, frame style/shape, canonical material coordinates, and fixed
reference anchors needed for coordinate stability. It excludes `metalPolish`,
`metalTarnish`, the material light vector, any legacy scalar-angle input, actual
preview/export bounds, texture dimensions, and expanded sampling bounds.
`metalBrushAngle` may be used as a direction response input, but not as a
random seed that rerolls feature placement.

## Derived Map Channels

The canvas polish renderer exposes typed channels analogous to the rust maps:

- `steelAlbedo`
- `steelHeight`
- `steelAmbientOcclusion`
- `steelRoughness`
- `steelGloss`
- `steelMetalness`
- `steelAnisotropy`
- `steelAnisotropyDirectionX`
- `steelAnisotropyDirectionY`
- `machiningGrooveMask`
- `machiningRidgeMask`
- `brushedGrainMask`
- `abrasionCloudMask`
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
- `polishedReflectionMask`
- `polishedHazeMask`

Normals are derived from `steelHeight` with finite differences in
`buildArtworkFrameSteelFinishNormalInputs()`. The corrosion renderer keeps its
own rust height and normal pass, then composes over steel while receiving
`steelFinishMaps` so exposed chips can recover localized clean-steel response.

## Slider Stage Bands

`metalPolish` is normalized as `p = 0..1`. These bands are implementation
targets, not hard visual snapping points. Transitions should blend smoothly, and
neighboring bands should overlap by at least `0.02` so the slider never has dead
zones or sudden feature pops.

| Stage | Polish Range | Physical Meaning | Visual Read |
| --- | --- | --- | --- |
| 0. Rough damaged steel | 0.00-0.12 | Coarse ground, unrefined, worn, or damaged metal with strong height variation. | Dull darker grey steel, deeper machining valleys, scratches, gouges, dents, restrained shallow micro-pits, cloudy roughness, low gloss; not black crater texture. |
| 1. Scuffed low polish | 0.10-0.30 | Coarse damage begins to be abraded down, but defects remain visible. | Worn sheet-metal lift, cross-scratches, cloudy abrasion, shallower dents and pits, reduced blackness, still rough and matte. |
| 2. Brushed baseline | 0.28-0.58 | Directional abrasive finish with clear lay and moderate reflectance; 50% is the visual anchor. | Raw brushed stainless-grey steel, dense hairline grain, uneven spacing, interrupted strands, anisotropic bands, restrained scratches, subtle micro-pits, stable brush direction. |
| 3. Fine satin polish | 0.54-0.76 | Finer abrasive stages reduce defect depth and smooth the lay. | Finer continuous grain, fewer visible troughs, lower AO, softer roughness, broader diffuse highlight bands. |
| 4. Semi-bright polish | 0.72-0.92 | Buffed or bright-polished surface with remaining faint preparation marks. | Brighter steel, low roughness, subdued hairline scratches, broad blurred reflection veils, coherent gloss, no isolated bright strokes. |
| 5. Near-mirror polish | 0.88-1.00 | Very smooth bright polish with residual microstructure only. | Bright stainless or near-mirror steel, faint micro-grain, subtle haze, broad reflected bands, minimal damage visibility, strongest clean metal light response. |

Stage units are computed from overlapping ramps, not from exclusive
thresholds. A feature should either fade by changing depth/roughness/normal
strength over stable geometry, or be hidden by a stable visibility mask. It
should not disappear because a new random field replaced it.

Stage response must also avoid visible brightness oscillation. Frame-level
clean-steel averages should move from dull darker grey at low polish toward
brighter reflective steel at high polish. The 50% brushed baseline is allowed
to be less glossy than 75-100%, but it should not be darker than the 25%
scuffed-low region. Roughness should generally decrease and gloss/coherent
reflection should generally increase from 0 to 100, except where rust or
physically coupled defect response intentionally overrides a local pixel.

## Stage Requirements

### Stage 0: Rough Damaged Steel

Required maps:

- Deep `machiningGrooveMask` and `machiningRidgeMask`.
- High-amplitude `steelHeight` with negative pits and gouges.
- Populated `dentPocketMask` and `gougeTroughMask`, plus restrained
  `pitPocketMask` micro-cavities.
- Strong `steelAmbientOcclusion` in troughs, dents, and pits.
- High `steelRoughness`, low `steelGloss`, and broken albedo variation.

Acceptance:

- The surface reads like rough metal with physical depth, not a darkened brushed
  texture.
- Damage coverage is high, but scratches and pits are still crisp and
  hard-edged rather than broad smudges.
- Pits must not dominate the visible surface as large circular or cratered
  black pockets. Low-polish damage should read as scratched, dented steel.

### Stage 1: Scuffed Low Polish

Required maps:

- `abrasionCloudMask` with pale worn-metal albedo lift.
- Sparse cross-grain scratch troughs with shared AO/height/rim geometry.
- Reduced but still visible pits, dents, and gouges.
- Low-to-moderate gloss suppression over broad scuffed zones.

Acceptance:

- The stage is visually distinct from Stage 0: less black and less deeply torn,
  but still rougher than brushed steel.
- The cloudy abrasion is mottled and bounded, not a few long transparent brush
  marks.

### Stage 2: Brushed Baseline

Required maps:

- Dense `brushedGrainMask` and fine `machiningGrooveMask` aligned to the stable
  brush direction.
- Uneven spacing, varied strand width, interrupted starts/stops, and subtle
  waviness.
- Moderate scratches and small pits whose geometry remains stable.
- Anisotropic shadow and highlight bands that follow the lay.

Acceptance:

- The material reads as brushed steel at normal preview size.
- At 50% polish this stage is the visual baseline for clean steel, not a
  transitional dip between brighter neighboring stages.
- Pit and dent visibility is restrained; micro-pits may exist, but broad dark
  crater coverage is a regression.
- Changing the material light vector changes band intensity and rim response
  without rotating or translating grain paths.

### Stage 3: Fine Satin Polish

Required maps:

- Fine continuous grain with lower height amplitude.
- Reduced scratch/gouge/dent depth over stable masks.
- Lower roughness and broader softer lighting gradients.
- Weak polished haze beginning to appear.

Acceptance:

- The surface feels smoother than brushed steel without becoming plastic-flat.
- Defects become shallower or less visible, but their remaining coordinates stay
  anchored.

### Stage 4: Semi-Bright Polish

Required maps:

- `polishedReflectionMask` and `polishedHazeMask` with broad low-frequency
  veils.
- Very low-amplitude residual micro-grain.
- Sparse hairline scratches with subtle AO and normal response.
- Low `steelRoughness`, increased `steelGloss`, and coherent specular bands.

Acceptance:

- Smooth gradients are not interrupted by random bright straight strokes.
- The surface reflects light in broad bands but still reads as steel rather
  than chrome or flat grey plastic.

### Stage 5: Near-Mirror Polish

Required maps:

- Minimal residual height with very fine grain and tiny defects only.
- Broad coherent reflection veils and subtle vertical or tangent-aligned tonal
  bands.
- Very low roughness and high clean-metal gloss, except where rust or exposed
  damage overrides it.

Acceptance:

- The endpoint is smooth, reflective, and metallic.
- The endpoint is the brightest clean-steel polish endpoint and should react
  strongly to the lit side of the light vector.
- Any remaining scratches are fine, sharp, and physically shaded. They must not
  appear as isolated bright strokes drawn over a smooth gradient.

## Lighting Model

Steel finish light behavior should follow the finish stage:

- Rough stages use stronger normal response from height, darker AO, and diffuse
  value variation; gloss should be weak and broken.
- Brushed stages use anisotropic response: highlights stretch along the lay and
  dark/light bands depend on tangent alignment.
- Satin stages broaden and soften the same anisotropic response.
- Polished stages use low roughness and broad coherent reflection bands, with
  small defect highlights limited to physically exposed rims. High-polish steel
  should gain lit-side energy and coherent reflection from the material light
  vector rather than only lowering the entire surface value under side or
  grazing light.
- Rust, if present, overrides steel gloss with matte corrosion roughness except
  on exposed steel chips or scraped ridges.

The lighting pass should use stable inputs:

- `steelHeight` for finite-difference normals.
- `steelAmbientOcclusion` for contact darkness.
- `steelRoughness` and `steelGloss` for lobe width and intensity.
- `steelAnisotropyDirectionX/Y` for brushed tangent response.
- Defect rim masks only as anchored response masks.

The material light vector must not seed, rotate, or translate any map.

### Hemisphere Light Editor For Steel

The implemented preview light editor exposes a sun handle inside a circular
control centered on the artwork being edited when a canvas-lit artwork frame is
selected. Centered sun position means overhead light. Radial distance maps to
inclination from 0 to 90 degrees: center is overhead, half radius is 45 degrees,
and the edge is grazing light. Angular position maps to horizontal light
direction. Positions outside the radius are clamped before the renderer-facing
light vector is created.

#### Intended Steel Macro Direction Contract (Pending Fix)

Audit note: this is the intended steel macro-light direction contract, not a
claim of accepted current visual behavior. The existing renderer must be updated
and tested against this convention before native visual acceptance is reported.

Dragging the sun defines a light control vector. Center sun means overhead
neutral light with no broad directional bias. For steel macro lighting, the
handle side is the broad shadow side and the opposite side is the broad lit
side:

- Bottom-left handle: brightest broad steel response at the top-right,
  strongest broad steel shadow at the bottom-left.
- Bottom-right handle: brightest broad steel response at the top-left,
  strongest broad steel shadow at the bottom-right.
- Top-left handle: brightest broad steel response at the bottom-right,
  strongest broad steel shadow at the top-left.
- Top-right handle: brightest broad steel response at the bottom-left,
  strongest broad steel shadow at the top-right.

This response belongs only to final shading. It must not move or reseed steel
finish fields, derived maps, height, finite-difference normals, AO, roughness,
gloss, anisotropy direction maps, scratch/gouge/dent/pit masks, machining
marks, abrasion clouds, reflection masks, geometry seed keys, or material seed
inputs.

Steel shading consumes the resulting normalized 3D light vector only in the
final shading pass. It may change diffuse value, anisotropic brushed bands,
satin and polished highlight width, defect rim highlights, defect shadows,
height-map self-shadow response, and clean-metal gloss response. It must not
change the stable finish field, steel derived maps, height, finite-difference
normals, AO, roughness, gloss, anisotropy direction maps, defect masks, geometry
seed keys, or material seed inputs.

### Frame-Space Macro Lighting For Steel

Flat steel uses an implemented frame-space macro light field during final
software shading so light-editor movement produces broad illumination instead
of uniform full-surface darkening. The field is derived from the material light
vector and the current pixel position relative to the artwork/frame center.
Centered overhead light remains broadly neutral. A 45-degree off-center light
lifts the near side and darkens the far side. A grazing edge light increases
directional falloff and local contact-shadow response.

The macro field combines with the existing normal-map response rather than
replacing it. Macro lighting owns broad illumination; `steelHeight`,
finite-difference normals, AO, roughness, gloss, anisotropy directions, and
defect rim masks continue to own micro-surface response. The macro field must
not reseed or move finish fields, scratch/gouge/dent/pit masks, machining
marks, abrasion clouds, reflection masks, height, normals, AO, roughness, gloss,
anisotropy maps, geometry seed keys, material seed inputs, or saved project
schema.

The legacy `metalLightAngle` slider and scalar-angle renderer path are removed.
Older project JSON may still contain that field; normalization tolerates it but
drops it from active frame state. When no transient light-editor override is
active, steel and black-iron canvas materials use the overhead light vector
`{ x: 0, y: 0, z: 1 }`. When a transient override is active, preview and PNG
export pass the same override light vector through the shared material
descriptor; the override is not persisted as project state.

Height-map self-shadowing for steel reads `steelHeight`, the frame/metalness
mask, the light vector, and macro `farShadowRamp`/`grazingStrength` factors.
Overhead light produces minimal directional contact shadowing, 45-degree light
produces moderate shadowing, and grazing light can produce longer directional
darkening. The pass never changes `steelHeight`, normal inputs, defect masks,
or finish geometry.

For performance, stable steel finish fields, derived maps, and normal inputs
are cacheable separately from final light-shaded pixels. Light changes should
reuse cached maps where descriptor inputs allow it and rerun only final shading
and self-shadow work. The OffscreenCanvas and worker-shading adapters are
optional acceleration paths over the same descriptor and shared shading
function, with main-thread Canvas 2D fallback on unsupported capability or
adapter failure. WebGL remains a later pivot criterion only if measured Canvas
2D plus OffscreenCanvas performance is still insufficient; any WebGL path must
shade these same steel maps as textures and must not become a separate steel
material model.

## Implemented Pipeline

The canvas polish model runs in this order:

1. Material planning: `src/render/artworkFrameMaterialPlan.ts` builds one shared
   canvas texture descriptor for preview and PNG export when
   `materialPlan.backend === 'canvas-texture'`.
2. Stable finish field: `src/render/artworkFrameSteelFinish.ts` generates
   canonical abrasion, machining, defect, cloud, and reflection fields from
   material/frame seed inputs, excluding `metalPolish`, `metalTarnish`, and
   the material light vector or any legacy scalar-angle input.
3. Stage-unit model: overlapping polish stage units blend without hard gaps.
4. Derived maps: steel albedo, height, AO, roughness, gloss, metalness,
   anisotropy, tangent direction, and defect masks are derived from the stable
   field. `metalPolish` changes map response/intensity, not placement masks.
5. Normal pass: normals are derived from `steelHeight` and remain stable across
   light-angle changes.
6. Shading pass: `shadeArtworkFrameSteelFinishImageData()` applies the
   descriptor light vector, `metalBrushAngle`, roughness, gloss, anisotropy, AO,
   normals, frame-space macro lighting, and the height-map self-shadow pass only
   during software shading.
7. Rust composition: `src/render/artworkFrameMaterialCanvas.ts` shades clean
   steel first, then composes corrosion maps over it. Rust overrides steel
   albedo, height, AO, roughness, gloss, and metal exposure where corrosion is
   present; exposed steel chips recover localized steel finish response.
8. Preview/export parity: preview and PNG export consume the same canvas
   descriptor and shared renderer. No preview-only, export-only, or vector
   fallback steel material path is allowed.

## Preview And Export Parity

The polish model must preserve existing renderer contracts:

- Preview and export consume the same canvas material descriptor when the
  material plan selects `canvas-texture`.
- Equivalent descriptors produce matching steel finish fields, stage units,
  derived maps, normal inputs, and final shaded pixels.
- Texture dimensions and sampling bounds may change raster resolution, but they
  must sample continuous canonical material coordinates rather than rerolling
  fields.
- Polish maps must be clipped to the metal frame ring or stroke mask.
- Frame clipping remains owned by shared frame geometry, not by the polish
  shader.
- The canvas polish implementation must not create a preview-only,
  export-only, or vector fallback steel finish path.

## Test Expectations

Focused render tests should cover:

- Stage units overlap and progress smoothly at 0, 10, 12, 28, 30, 50, 58, 72,
  76, 88, 92, and 100 percent polish.
- Audit-informed polish continuity tests prove the 50% brushed baseline does not
  dip below the 25% scuffed-low region in frame-level clean-steel brightness.
- Audit-informed defect tests prove visible pit depth, AO, apparent size, and
  population reduce with polish response while stable pit candidates remain
  anchored.
- Pit-shape tests or diagnostics prove pitting stays shallow and micro-scale
  rather than reading as broad circular crater fields.
- Same image seed plus same frame produces identical finish fields and placement
  masks.
- Different image seeds produce different finish fields.
- Different `metalPolish` values preserve base placement fields while changing
  stage coverage, depth, roughness, gloss, and shaded pixels.
- Different `metalTarnish` values do not reseed steel finish fields.
- Different material light vectors preserve finish fields, derived maps, height,
  normals, AO, roughness, gloss, and anisotropy maps while changing final shaded
  pixels.
- Macro-light region diagnostics prove overhead light remains broadly neutral,
  side light creates a near/far luma split, and grazing light produces the
  strongest directional split without moving maps.
- Different `metalBrushAngle` values rotate brushed anisotropy/tangent response
  without rerolling random scratch, pit, dent, or gouge placement.
- Roughness generally decreases and gloss generally increases as polish rises,
  except where rust or exposed damage intentionally overrides the clean steel
  response.
- High-polish light diagnostics prove side and grazing light add coherent
  lit-side energy on polished steel instead of primarily dimming the whole
  surface.
- Low-polish scratches, dents, pits, and gouges have coupled height/AO/normal
  geometry and do not render as broad smudges.
- High-polish reflection veils remain broad and smooth, without isolated bright
  strokes cutting through gradients.
- Preview/export descriptors share material seeds and produce matching finish
  maps and final shaded pixels.
- Rust composition tests prove polish changes do not move corrosion geometry
  and tarnish changes do not move steel finish geometry.

Manual validation should generate contact sheets for a flat steel frame at
`metalPolish` values near 0, 15, 30, 50, 70, 85, and 100, with at least two
light-vector positions and one tarnished composition pass. Native Tauri preview/export
verification is required before claiming user-visible acceptance.

## Non-Goals

- Do not add new user controls during the first canvas polish pass.
- Do not replace the saved project schema unless existing frame fields become
  insufficient.
- Do not use bitmap steel textures as the source of truth unless preview/export
  parity is implemented at the same time.
- Do not make polish move rust placement, finish defect placement, or brush
  direction without user input.
- Do not hide weak finish design behind opacity-only scratches, soft smudges,
  random squiggles, or broad flat gradients.
