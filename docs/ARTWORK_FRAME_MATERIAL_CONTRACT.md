# Artwork Frame Material Contract
> Status: Initial feature contract.
> Purpose: Track the procedural artwork-frame material system, starting with steel.
> Read when: Working on additional artwork frames, metal frame profiles, preview/export frame parity, or frame material rendering.
> Authoritative source: This file for artwork-frame material intent; source and focused tests for exact current implementation; SDD for preview/export parity.

This contract covers the procedural material behavior for additional artwork
frames. It starts with issue #165 and the steel metal frame. The goal is to
avoid a flat "colored border with bevel lines" result and move toward material
surfaces that show depth, machining, grain, scratches, roughness, gloss, and
occlusion while preserving preview/export parity.

## Scope

The current material system applies to additional artwork frames shared by the
disc editor and case insert artwork slots.

In scope:

- Metal frame style state and normalization.
- Steel material rendering.
- Canvas material preview rendering inside the existing SVG overlay.
- Canvas PNG export rendering.
- Save/load compatibility for existing frame state.
- Focused tests that make material-layer regressions visible.

Out of scope for this first contract pass:

- Bitmap PBR asset packs.
- User-imported normal, height, ambient occlusion, roughness, or gloss maps.
- Per-material UI controls beyond the existing metal controls.
- Full material parity for every non-steel metal.
- Replacing the current React/SVG preview or canvas export architecture in one
  step.

## Visual Contract

Steel must not render as a single smooth solid fill. A steel frame should show
micro-surface evidence even when the user selects `Pattern: None`.

The steel material must include:

- Directional grain: dense micro-scale anisotropic marks that follow a stable
  material machining direction, with irregular spacing, varied strand widths,
  subtle waviness, interrupted starts/stops, and occasional same-direction
  overlaps or intersections.
- Fine scratches and gouges: short deterministic height features and rough-end
  longer cut marks with ambient occlusion, lit rims, and shadow rims. Low polish
  must increase actual scratch and gouge path population and normal offsets, not
  only layer opacity. Scratch normal highlight and shadow response should vary
  along anchored scratch fragments so light catches some portions of a scratch
  more strongly than others without moving the scratch geometry. Scratches must
  not be represented as single-thickness centerline strokes alone; the scratch
  AO/height mask should use closed tapered trough geometry, with rim highlight
  and rim shadow paths generated on opposite physical edges. Scratch troughs
  should stay hairline-thin, hard-edged, and unblurred so they read as
  incisions, not broad semi-transparent brush smudges. Gouges may be wider and
  sparser than scratches, but they still need filled cut geometry, hard edges,
  and paired rim lighting instead of blurred brush-stroke AO.
- Machining bands: broader low-opacity height features that make the surface
  feel milled or brushed.
- Cloudy abrasion: low-polish steel should include broad, soft, frame-band
  roughness patches that darken and lighten the substrate before fine scratches
  are applied. These patches represent rough worn metal and uneven reflectance,
  not painted scratch marks. They must remain mottled, broken, and bounded
  enough that they do not read as a few long rounded translucent brush strokes.
- Scuffed low-polish cross-scratches: the pale worn-sheet stage between rough
  and brushed steel should add sparse, long, hard-edged hairline incisions that
  cross the main grain direction. They must be filled trough geometry with
  separate light-catching rim response, not blurred or rounded brush marks.
  This layer is stage-gated around low polish and should not appear at the
  fully rough, brushed, satin, or mirror-polished endpoints.
- Roughness/pitting/dents: small irregular ambient-occlusion features and
  faceted impact pockets whose visibility and population increase as polish
  decreases or tarnish increases. Pits should be dense micro-scale jagged
  cavities with dark centers and crisp rim catches, not round dots or soft
  smudges. Pit AO, rim highlight, and rim shadow layers must share one fixed
  pocket geometry; rim layers may use fixed perimeter segments with
  light-modulated opacity, but must not be translated copies of the closed
  pocket mask. Low-polish dents must use filled hard-edged pocket masks and
  paired rim highlight/rim shadow offsets so depressions read as depth rather
  than blurred translucent brush marks.
- Gloss streaks: light-catching roughness/gloss-map features whose visibility
  increases with polish.
- Light/dark catch bands: sparse, low-opacity grain bands that create uneven
  grey and black reflectance areas across the brushed surface without reading
  as large drawn lines.
- Anisotropic lighting response: broad light and shadow bands should be soft,
  blurred, low-frequency gradient-like washes, not visible stroke clusters.
  Grain-scale specular/shadow response maps may add fine shimmer, but should
  remain subordinate to the diffuse bands. Both band families should follow the
  stable steel grain direction while changing intensity from the active
  material light vector.
- Ambient/contact occlusion: depth and profile response must be clipped to the
  metal frame ring so the molding/depth controls cannot draw a halo outside the
  border or into the artwork opening. Occlusion belongs to the material texture
  and frame surface, not to a second vector shadow pass.
- Material-specific tarnish: `metalTarnish` is an aging/corrosion/patina
  control, not a universal darkness or rust slider. Steel and black iron should
  show orange/brown rust progression; copper should move from dark oxide toward
  blue-green patina; brass and bronze should form muted brown/green patina;
  chrome should dull and pit rather than rust; gold should remain mostly
  resistant with only subtle grime or aged sheen. The slider should stage the
  surface from early oxidation speckles to patches, darker older deposits,
  flake shadows, exposed-metal islands, and peeling edges where that behavior is
  appropriate for the selected material.
- Rust micro-surface: steel and black-iron rust must include fine granular
  crust, clustered micro-pores, dark cavity AO, and rim-light/rim-shadow response
  derived from stable corrosion geometry. Heavy rust should not read as a few
  broad color splotches painted over steel; it needs porous matte texture,
  dark pits, tiny raised deposits, and light-reactive edges.
- Advanced rust composition: closed patch, scale, and full-coverage maps are
  only diffuse underpaint/height fields at high tarnish. The visible top texture
  must come from dense open particulate strokes, micro-pores, exposed chips, and
  flake relief. High tarnish must suppress contour-like patch edges and crack
  outlines that make corrosion look like stacked translucent stickers.

The steel and black-iron rust progression is specified in
`docs/STEEL_RUST_STAGE_MODEL.md`. Rust-specific staging must be implemented
against that document rather than as a generic tint overlay or a recolored
version of other metals' tarnish behavior.

The steel and black-iron polish progression is specified in
`docs/STEEL_POLISH_STAGE_MODEL.md`. Steel and black-iron polish now use the
same canvas-map discipline as rust: stable finish fields, derived
albedo/height/AO/roughness/gloss/anisotropy maps, finite-difference normals,
and light-only software shading. The old vector steel polish/material layer
source is removed and must not be reintroduced for canvas-supported metal
frames.

The active material light vector controls the implemented lit/shadow response
for normal-map-style surface features and the broad frame-space macro lighting
field described below. The light vector must not rotate steel grain,
scratch, gouge, dent, pit, machining, roughness, or gloss paths. The
`metalBrushAngle` value is the user-owned material direction control for steel
grain and brushed pattern strokes. Polish must not rotate those paths
implicitly. Scratch, gouge, dent, and pit rim offsets are material-anchored so
physical damage does not slide around when lighting changes; lighting may
modulate their opacity.
Scratch rim response may use stable per-fragment response bands whose opacity
changes with the light vector, provided the fragment paths and rim offsets
remain anchored to the material.
Pit rim response must keep the same perimeter segment paths as lighting
changes; light may change which segments read brighter or darker, but it must
not move the pocket floor, rim highlight, or rim shadow relative to one another.

### Hemisphere Light Editor And Light-Vector Shading

Canvas-lit artwork frame materials use a center-out light source editor in the
preview when an eligible frame is selected. The editor draws a circular guide
centered on the artwork being edited, a sun handle at the current light
position, a tether while the handle is dragged or away from center, and an
editor-only pillar-shadow guide that casts from the center opposite the sun
position. Centered overhead light shows no pillar shadow. A bottom-right sun
casts the guide shadow toward top-left, and vice versa. Dragging the handle
updates a transient light override for that selected editable element. The
override and pillar-shadow guide are not saved as project JSON and are not
exported.

The editor maps a normalized 2D sun position to a normalized 3D light vector.
The center of the circle produces overhead light: `{ x: 0, y: 0, z: 1 }`.
Halfway from center to the radius produces a 45-degree inclination from
overhead. The radius edge produces a 90-degree grazing light with `z` near 0.
Positions outside the radius are clamped, and angular position around the circle
maps to the horizontal light direction. The inverse helper maps a renderer light
vector back to the editor sun position for UI initialization.

#### Intended Material Direction Contract (Pending Fix)

Audit note: the implemented light-vector and macro-lighting infrastructure
exists, but the current visual direction mapping has not yet been accepted. The
following direction contract is intended behavior for the material macro
response and must be proven by tests and native visual verification before it is
reported as implemented visual acceptance.

The dragged sun handle defines a light control vector. Center sun means overhead
neutral light with no broad directional bias. When the handle is off center, the
material macro response should treat the handle side as the broad shadow side
and the opposite side as the broad lit side:

- Bottom-left handle: brightest broad response at the top-right, strongest broad
  shadow at the bottom-left.
- Bottom-right handle: brightest broad response at the top-left, strongest broad
  shadow at the bottom-right.
- Top-left handle: brightest broad response at the bottom-right, strongest broad
  shadow at the top-left.
- Top-right handle: brightest broad response at the bottom-left, strongest broad
  shadow at the top-right.

This intended material-shadow contract is separate from the editor-only
pillar-shadow guide. The guide can help expose direction mistakes, but it is not
the material source of truth and must not be cited as material visual
acceptance. In all cases, light direction affects final shading only: geometry,
seeds, fields, height maps, normals, AO, roughness, gloss, metal exposure,
flakes, pores, cracks, grain, scratches, pits, dents, and rust coverage remain
stable.

The legacy `metalLightAngle` slider and scalar-angle renderer path are removed.
Older project JSON may still contain `metalLightAngle`; normalization tolerates
that field but drops it from active frame state. When no transient light-editor
override exists, the descriptor uses overhead light
`{ x: 0, y: 0, z: 1 }`. When a light-editor override is active, preview and PNG
export receive the same renderer-facing light vector from the shared override
map.

The light vector is a shading input only. It may change diffuse response,
anisotropic bands, rim highlights, contact shadows, height-map self-shadow
response, flake lip darkening, exposed-chip highlights, and other final shaded
pixels. It must not change steel finish fields, corrosion fields, derived maps,
height, normals, AO, roughness, gloss, metal exposure, flake maps, pore masks,
crack masks, geometry seed inputs, or material seed inputs.

### Frame-Space Macro Lighting

The canvas material renderer implements a frame-space macro light field to
avoid uniform full-surface darkening on flat steel. Micro-normal lighting still
responds to scratches, pits, grain, flakes, pores, and height-map details, but
the macro field adds broad illumination from the material light vector and the
per-pixel position relative to the artwork/frame center.

`src/render/artworkFrameMaterialMacroLighting.ts` returns bounded
`macroDiffuse`, `macroShadow`, `nearLightRamp`, `farShadowRamp`, and
`grazingStrength` factors. Overhead light returns neutral broad lighting with
no left/right/top/bottom bias. A 45-degree off-center light creates a moderate
near-side lift and far-side shadow. A grazing edge light strengthens the
directional split and contact-shadow response.

The macro field is a final-shading response only. It must not change steel
finish fields, corrosion fields, derived maps, height, normals, AO, roughness,
gloss, metal exposure, flake maps, pore masks, crack masks, geometry seed
inputs, material seed inputs, or saved project schema. Preview and export
consume the same macro-light shading context and final shaded pixels for
equivalent canvas descriptors.

Height-map self-shadowing is implemented as a conservative software contact
shadow pass over stable height maps. Overhead light produces minimal directional
shadowing, 45-degree light produces moderate contact shadows, and grazing light
can produce longer directional darkening. The self-shadow pass reads height,
mask, the light vector, and macro `farShadowRamp`/`grazingStrength` factors; it
does not modify height maps or move flakes, scratches, pits, rust, or grain.
Shadow output is clipped by the same frame coverage used by the material
texture.

OffscreenCanvas support is implemented as an optional renderer adapter, not a
separate material model. Capability detection records OffscreenCanvas, Worker,
ImageBitmap, and main-thread Canvas 2D availability. The OffscreenCanvas adapter
uses the shared canvas material renderer with an OffscreenCanvas factory when
available and falls back to the main-thread Canvas 2D renderer if unavailable or
if rendering fails. The worker-shading adapter sends precomputed map buffers and
the light vector to the shared shading worker when supported, then falls back to
the synchronous software shading pass on worker failure. Preview/export call
sites must continue to use the same descriptor boundary and may only adopt these
adapters through the shared renderer path after parity tests pass.

Cache boundaries are split by role: descriptor/material-plan construction,
steel finish fields, steel derived maps, corrosion fields, corrosion derived
maps, normal inputs, final light-shaded pixels, self-shadow work, and canvas
output conversion. Geometry cache keys must exclude the light vector and any
legacy scalar-angle input; shaded-pixel cache keys include final-pixel inputs
such as lighting, polish response, tarnish stage, clip data, texture size, and
map versions. Interaction-preview quality caps texture size during active light
drag, while full-quality preview/export descriptors keep deterministic output.

WebGL remains a pivot criterion, not an active renderer. A WebGL path should be
considered only if measured Canvas 2D plus OffscreenCanvas performance remains
insufficient after the shared adapter is wired and cache boundaries are
validated. Any WebGL pivot must be a small material-shading backend that
consumes the same stable procedural maps as textures, preserves preview/export
parity, keeps Canvas 2D fallback available until parity is proven, and avoids a
separate preview-only, export-only, or 3D-scene material implementation.

`metalPolish` is a finish continuum with 50% as the required visual anchor:
raw brushed steel. Low values move away from that anchor toward dull, damaged
grey steel with deeper machining, populated scratches, gouges, dents, restrained
micro-pitting, higher roughness, stronger normal-map-style offsets, and diffuse
shadowing. High values move from the brushed anchor toward bright polished
stainless steel and finally a near-mirror finish with suppressed damage depth,
lower roughness, broader coherent reflection veils, and stronger light-vector
gloss response. The current renderer baseline audit found that the existing
implementation does not yet satisfy this continuum: 0% reads too black and
cratered, 50% is darker than 25%, pit coverage remains effectively unchanged
through the polish range, and high-polish lighting still dims too much instead
of producing enough lit-side energy. The next polish replacement work must fix
those gaps without moving stable defect or corrosion placement.

At 100% polish, individual scratch/gloss strokes must not cut through smooth
diffuse or specular gradients as isolated bright lines; remaining gloss detail
should be softened into a sheen. Existing `metalTarnish` and `metalDepth`
continue to control aging and relief. `metalBrushAngle` stores the
user-selected grain direction; the first pass does not add separate saved
fields for steel scratch, pit, roughness, or gloss maps.

The steel polish continuum is reference-driven:

- 0% polish: dull damaged grey steel with low shine, deeper scratches, dents,
  gouges, machining valleys, cloudy roughness, stronger AO, and restrained
  shallow micro-pitting. It should be the darkest clean-steel endpoint, but it
  must not collapse into black crater texture or moon-surface pitting.
- Rough/low polish: pale scuffed sheet metal with low contrast cloudy abrasion,
  sparse cross-scratches, faint vertical/horizontal grain, and small exposed
  pits rather than broad smudges. This stage should get a diffuse pale worn
  steel lift distinct from the dark rough endpoint; low-polish scuff is not
  simply rough damage with higher opacity.
- 50% polish: the source-of-truth raw brushed steel baseline, with medium
  stainless-grey value, dense fine directional grain, uneven spacing,
  interrupted strands, soft anisotropic light bands, restrained scratches, and
  only subtle micro-pits. The brushed direction is a stable material machining
  angle from `metalBrushAngle`, not a polish or lighting effect; changing the
  material light vector may change band response and intensity, but not rotate
  the grain paths.
- Satin/high polish: fewer visible cuts, lower roughness, faint continuous
  grain, and broad diffuse light/shadow gradients that keep the user-selected
  material direction while growing brighter and more reflective than the 50%
  anchor.
- 100% polish: bright stainless or near-mirror steel with only very fine
  residual grain and softened coherent highlights; visible damage is heavily
  suppressed. The mirror end should include broad, blurred, low-frequency
  reflection veils with faint vertical tonal bands, not isolated bright strokes
  crossing an otherwise smooth gradient.

Polish response should not be implemented as unrelated brightness islands per
stage. In frame-level clean-steel averages, roughness should generally decrease,
gloss and coherent reflection should generally increase, and the surface should
not get darker at the brushed 50% anchor than it was at the scuffed 25% region.
Small local exceptions are allowed where stable defects, rust, or exposed chips
physically justify them, but the stage progression must not visibly oscillate
between unrelated bright and dark phases.

Low-polish pitting should be generated where the frame surface actually exists.
Because preview/export layers are clipped to the frame ring, rough pitting and
chips must include frame-band-biased path generation so visible metal gets
populated instead of relying only on full-artwork scatter that is mostly clipped
away.

`metalTarnish` remains one saved slider, but its render interpretation is
selected by `metalType`. Tarnish must change artifact population, colors, sizes,
and layer roles over the slider range rather than fading in one flat overlay.
Rust-specific colors and flaking are valid for steel and black iron only; other
metals use their own patina, oxide, pitting, grime, or resistance behavior.

## Implementation Contract

The shared render domain owns material decisions:

- `src/render/artworkFrame.ts` generates frame path geometry, edge insets, and
  non-metal/basic frame geometry.
- `src/render/artworkFrameMaterialSeed.ts` owns browser/Tauri-safe material
  seed creation for image-backed additional artwork. It produces
  `ArtworkFrameMaterialSeed` values with `algorithm`, `key`, and `seed32`
  fields.
- `src/render/artworkFrameMaterialPlan.ts` owns the boundary between frame
  geometry and canvas-rendered material textures. It exposes one metal material
  plan with a canvas texture descriptor, optional material seed, capped texture
  dimensions, and a stable cache key.
- `src/render/artworkFrameMaterialLighting.ts` owns material light-vector types,
  the overhead default, hemisphere light-vector mapping, inverse
  editor-position mapping, and deterministic light cache keys.
- `src/render/artworkFrameMaterialMacroLighting.ts` owns frame-space macro
  lighting factors. It converts the descriptor light vector plus normalized
  material position into broad diffuse, shadow, near-side, far-side, and grazing
  response terms without reading material seeds or geometry maps.
- `src/render/artworkFrameMaterialShading.ts` owns the shared final-shading
  payload for steel and rust composition, including the preview/export shading
  coordinate context used by macro lighting.
- `src/render/artworkFrameMaterialLightEditor.ts` owns light-editor target
  eligibility, pointer-to-sun-position conversion, clamping, reset-to-overhead
  domain state, transient light override lookup, and editor-only pillar-shadow
  direction math.
- `src/components/preview/ArtworkFrameMaterialLightEditorOverlay.tsx` owns the
  visible preview light editor affordance: circular guide, sun handle, tether,
  pillar-shadow guide, pointer capture, interaction-preview quality during drag,
  and full-quality update on pointer release.
- `src/render/artworkFrameSteelFinish.ts` owns deterministic steel and
  black-iron polish fields, stage units, derived finish maps, finite-difference
  normals from `steelHeight`, and the steel finish software shading pass.
  `metalPolish` changes response maps and final pixels over stable placement
  masks; it does not reseed scratches, pits, dents, gouges, machining marks,
  abrasion clouds, or reflection masks.
- `src/render/artworkFrameCorrosionField.ts` owns deterministic rust/corrosion
  scalar fields for steel and black iron ring frames. The field request is
  derived from the single-source material seed, material/frame geometry, and
  existing frame controls, while the generated scalar maps provide edge
  exposure, defect exposure, moisture basins, cellular pit centers, protected
  metal islands, corrosion potential, and tarnish-driven stage coverage.
- `src/render/artworkFrameCorrosionMaps.ts` derives rust material maps from the
  corrosion field: albedo, height, ambient occlusion, roughness, metal exposure,
  pore masks, crack masks, and flake masks. These maps are material-anchored and
  do not read the material light vector.
- `src/render/artworkFrameMaterialCanvas.ts` rasterizes the material descriptor
  into final canvas texture pixels. For steel and black iron, it builds the
  steel finish field and maps, shades clean steel first, then builds the
  corrosion field, derives rust maps, composes rust over steel, computes normals
  from height gradients, and applies the descriptor light vector only during
  software lighting passes.
- `src/render/artworkFrameMaterialSelfShadow.ts` owns the conservative
  height-map self-shadow helper used by steel and rust shading.
- `src/render/artworkFrameMaterialCanvasCapabilities.ts` owns
  OffscreenCanvas/Worker/ImageBitmap/main-thread Canvas 2D capability detection.
- `src/render/artworkFrameMaterialOffscreenCanvas.ts`,
  `src/render/artworkFrameMaterialShadingWorkerClient.ts`, and
  `src/render/artworkFrameMaterialShadingWorker.ts` own optional OffscreenCanvas
  and worker-shading adapters over the shared material renderer.
- Preview components and export helpers consume shared render-domain data.
- Presentation components must not decide what "steel" means.
- Canvas export must not invent a separate steel texture model.

Steel material source data is represented as deterministic procedural map
layers, not imported bitmap assets. The active steel and black-iron
`canvas-texture` path rasterizes those maps into a canvas texture clipped by the
frame geometry. Preview and export both consume the same material plan and
canvas descriptor. There is no vector material fallback for steel/black-iron
canvas materials: no SVG material strokes, no SVG steel artifact layers, no
generic aging overlays, and no preview/export branch that draws a second metal
surface outside the canvas texture.

Current steel canvas polish derived map channels are specified in
`docs/STEEL_POLISH_STAGE_MODEL.md`. They include steel albedo, height, ambient
occlusion, roughness, gloss, metalness, anisotropy, anisotropy direction,
machining groove/ridge masks, brushed grain, abrasion clouds, scratch and
gouge troughs, dent and pit pockets, burr ridges, scuffed cross-scratch trough
and rim masks, polished reflection masks, and polished haze masks. These are
not saved project fields. They are generated from existing frame controls and
material seed data.

Steel and black-iron rust is no longer emitted as vector `rust-*` surface
layers. The previous SVG rust layer stack was removed so the canvas corrosion
renderer is the only rust source for these materials. Current steel/black-iron
canvas corrosion derived map channels:

- `albedo`
- `height`
- `ambientOcclusion`
- `roughness`
- `metalExposure`
- `poreMask`
- `crackMask`
- `flakeMask`
- `flakeBodyMask`
- `flakeLipMask`
- `flakeRootMask`
- `flakeUndercutAO`
- `flakeLiftHeight`
- `flakeCurlX`
- `flakeCurlY`
- `flakeCastShadow`

Lifted flake channels have specific roles:

- `flakeBodyMask` is the stable irregular rust-scale plate body. It drives the
  broad raised body of the flake and must not be generated from
  lighting input.
- `flakeLipMask` is the thin lifted edge of a plate. It drives stronger positive
  height, directional rim highlight, back-facing darkening, and local roughness
  response. It must not become a uniform outline around every rust patch.
- `flakeRootMask` is the attached side of the plate. It keeps part of the scale
  visually anchored to the rust body instead of making every flake float.
- `flakeUndercutAO` is the dark contact cavity under lifted scale. It contributes
  to ambient occlusion, local height setback, and directional contact shadow.
- `flakeLiftHeight` records positive relief from raised bodies, attached roots,
  and especially lifted lips. It is geometry data, not a color overlay.
- `flakeCurlX` and `flakeCurlY` are stable curl-bias inputs derived from flake
  geometry. Lighting may read them, but may not change them.
- `flakeCastShadow` is a stable shadow input for lifted scale and undercuts. It
  is consumed by software shading rather than rendered as a separate SVG rust
  layer.

The canvas corrosion renderer derives normals from the `height` channel with a
finite-difference software pass. `normalX`, `normalY`, and `normalZ` therefore
follow stable height, pore, crack, pit, and flake geometry. Optional curl bias is
also derived from stable flake maps. The material light vector is applied only
in final shading, where it can change diffuse value, lip rim highlights,
back-facing lip darkening, contact shadows, exposed-chip sparkle, and other
light response. Changing the light vector must not change flake bodies, lips,
roots, undercuts, height, normals, AO, roughness, metal exposure, pore masks,
crack masks, or cache-key geometry inputs.

Rust roughness and gloss rules:

- Rust scale is high roughness and low gloss. It should produce matte diffuse
  shifts and subdued rim catches, not polished metallic streaks.
- `roughness` must stay high on rust scale, pore fields, cracks, undercuts, and
  lifted lips.
- Metallic highlights are allowed only where `metalExposure` identifies exposed
  steel chips, scraped ridges, or residual steel flecks. Those areas may have
  lower roughness and small metal highlights.
- Broad tarnish changes must not be implemented as opacity-only darkening.
  Albedo, height, AO, roughness, metal exposure, pore/crack masks, and flake
  maps need to stay coupled so the same rust structure drives color, depth, and
  lighting.

Exposed steel chips are part of the rust material state. They are generated as
irregular cut-through or worn regions from stable corrosion geometry, not as
straight eraser lines through rust. They should expose grey steel albedo,
restore localized metallic response, reduce roughness only inside the chip or
ridge, and remain clipped to the frame ring.

The old generic vector metal-aging layer source is removed. Steel and
black-iron tarnish use the canvas corrosion field plus derived map channels so
rust progression is tested through map geometry and final shaded pixels.
Non-rusting metals may later receive their own canvas material maps, but they
must not be implemented by restoring the deleted vector aging overlay stack.

### Canvas Material Transition

The accepted transition path is hybrid SVG geometry plus canvas material
textures:

- SVG keeps frame geometry, ring clipping, outlines, hit target behavior, and
  project coordinate ownership.
- Canvas material textures are the transport for procedural steel finish maps,
  steel and black-iron rust maps, roughness/gloss response, and final per-pixel
  software shading where `canvas-texture` is supported. The renderer may use a
  temporary coverage mask for clipping, but the old base palette/gradient paint
  substrate is removed and must not contribute visible color.
- The material plan is the only boundary preview/export should use for metal
  material rendering. Canvas-supported metal frames must render through the
  canvas texture descriptor, not through parallel SVG/canvas vector material
  passes.
- The canvas texture descriptor is not saved project state and must not create
  new user-visible controls by itself. It is derived from existing frame fields.
- For steel and black iron, the canvas texture descriptor carries lightweight
  steel-finish and corrosion-field requests. The heavy scalar and derived maps
  are generated only when the canvas material renderer needs them.
- Corrosion placement has a single seed source of truth. When an image-backed
  additional artwork payload is available, preview/export should use the same
  `ArtworkFrameMaterialSeed`. The preferred seed algorithm is
  `sha256-image-v1`, generated from the image data through Web Crypto SHA-256.
  Its `key` anchors corrosion placement and its `seed32` is a compact numeric
  seed for deterministic procedural fields.
- When Web Crypto is unavailable for an image payload, the seed helper may
  return `fallback-v1`. This is still deterministic for the payload bytes and
  length, carries the same typed `ArtworkFrameMaterialSeed` shape, and must be
  passed through preview/export the same way. When no material seed is available
  at all, the corrosion field request falls back to the existing deterministic
  frame-derived seed inputs so non-image cases remain stable.
- Current corrosion geometry seed inputs are limited to the material seed key
  when present and canonical material/frame coordinate inputs needed for stable
  texture mapping: frame style, metal identity, frame shape, a fixed
  polish-independent anchor, pattern identity/scale/strength, and a fixed
  bounds-independent reference anchor. Actual preview/export bounds width and
  height, texture field dimensions, expanded sampling bounds, `frame.width`,
  derived `strokeWidth`, and `metalBrushAngle` are not corrosion seed inputs.
- Corrosion geometry seeds must exclude `metalPolish`, `metalTarnish`, the
  material light vector, any legacy scalar-angle input, `metalBrushAngle`,
  `frame.width`, and derived `strokeWidth`, actual preview/export bounds width
  and height, texture field dimensions, and expanded sampling bounds.
  Changing polish must not move corrosion placement masks. Changing tarnish
  must not reseed placement; it changes stage units, stage coverage, and
  visibility over the stable field. Changing the light vector must not change
  fields or derived maps; it changes final software shading only. Changing brush
  angle may rotate/render the steel finish, but not rust placement. Changing
  frame width may change the visible ring mask, but corrosion sites that remain
  inside the frame must stay anchored.
- Canvas corrosion maps must sample continuous canonical material coordinates
  derived from the unexpanded frame bounds. Texture size and sampling bounds may
  change which pixels are rasterized, but must resample the same procedural
  field instead of re-rolling per-pixel hashes.
- Non-geometry response inputs may still change final output and cache keys:
  `metalPolish` controls finish response, roughness/gloss behavior, damage
  intensity, and exposed steel response; `metalTarnish` controls rust stage
  coverage and material-map intensity; the descriptor light vector controls the
  lighting pass and final shaded pixels.
- Steel finish geometry seeds follow the same separation: `metalPolish` may
  change polish stage units, defect depth, roughness, gloss, anisotropy
  strength, and final shaded pixels, but it must not reroll base scratch,
  gouge, dent, pit, machining, abrasion cloud, or reflection-mask placement.
  The material light vector remains shading-only. `metalBrushAngle` may rotate
  the user-owned brushed lay and anisotropic tangent response, but must not
  reroll random defect placement.
- Derived rust maps must also remain independent from the material light vector.
  Software shading may change final pixels when the light vector changes by
  deriving normals from the height map and applying roughness, AO, metal
  exposure, pore, crack, and flake responses.
- Texture dimensions must be capped so large artwork cannot allocate an
  unbounded preview canvas. The descriptor records the capped size and cache
  key inputs.
- Performance cache boundaries must remain deterministic. Stable geometry and
  derived-map caches may be reused across light changes, while final shaded
  pixel caches must change when the renderer-facing light vector changes.
  `interaction-preview` descriptors are allowed during active light drag to cap
  preview texture dimensions; PNG export must use full-quality descriptors.
- Optional OffscreenCanvas and worker-shading adapters must call the shared
  material renderer and shared shading function. They must fall back to the
  main-thread Canvas 2D renderer on unsupported capability or adapter failure,
  and they must not introduce separate preview/export material behavior.
- Ring-based metal frames are the first supported canvas-texture target.
  Content-traced stroke frames may also use a canvas material texture when the
  material plan can build a stroke-clipped descriptor. Unsupported descriptors
  or renderer failures must not draw a competing vector metal material fallback.
- Preview and export must draw the canvas material texture from the same
  descriptor when the material plan selects `canvas-texture`. Focused tests must
  prove matching descriptors, deterministic cache keys, matching corrosion maps,
  matching material seed keys, and matching final shaded pixels for steel and
  black-iron flake stages.

## Preview And Export Parity

Preview and export must use the same source data for:

- Metal frame path geometry.
- Steel and black-iron canvas polish descriptors, including finish field
  requests, material seed, geometry seed key, texture size, clip mode, lighting,
  brush angle, stage units, derived maps, normal inputs, and final shaded
  pixels.
- Steel and black-iron canvas corrosion descriptors, including corrosion field
  requests, material seed, geometry seed key, texture size, clip mode, clip
  stroke settings, lighting, and path hashes.
- Flake-stage derived maps: body, lip, root, undercut AO, lift height, curl,
  cast shadow, height, normals, AO, roughness, metal exposure, pore masks, and
  crack masks.
- Steel polish derived maps: albedo, height, ambient occlusion, roughness,
  gloss, metalness, anisotropy, anisotropy directions, machining, grain,
  abrasion, scratch, gouge, dent, pit, burr, scuffed cross-scratch, reflection,
  and haze masks.
- Final shaded pixels produced by `renderArtworkFrameCanvasMaterialTexture`
  when both preview and export receive an equivalent canvas descriptor.

Allowed differences are only the renderer backends:

- Canvas-material preview and PNG export both consume the rasterized image source
  from the shared canvas material renderer; preview embeds it as an SVG image and
  export draws it into the PNG canvas.
- For image-backed artwork, preview and export must receive the same
  `ArtworkFrameMaterialSeed` for the same source image and frame. There must be
  no preview-only or export-only corrosion seed path.

Preview-only SVG filters may support shadow blur only where the export path has
an equivalent canvas shadow pass. Preview-only turbulence, displacement, or
filter textures are not allowed as material source of truth unless an export
equivalent is implemented at the same time.

## Save And Load Contract

The steel surface artifact model currently has no dedicated persisted fields.
Existing frame fields remain the source of truth:

- `metalType`
- `metalProfile`
- `metalDepth`
- `metalBevelWidth`
- `metalBrushAngle`
- `metalPolish`
- `metalTarnish`
- `metalPattern`
- `metalPatternScale`
- `metalPatternStrength`

Image-derived material seeds are not saved as project fields. They are derived
from the current image payload when available and threaded through render plans
as transient descriptor data. Loading older projects must not require a stored
seed.

Loading older projects must continue to normalize missing metal fields to safe
defaults. Older project payloads may contain the removed `metalLightAngle`
field; normalization tolerates it but drops it from active frame state. The
transient light-editor override is not saved. Disabling a frame must preserve
all active frame state and omit the frame from preview and export.

## Validation Contract

Required non-interactive validation for material changes:

- Focused render tests for material layer generation.
- Macro-lighting tests proving overhead neutrality, bounded deterministic
  factors, left/right/top/bottom directionality, 45-degree versus grazing
  strength, and clamped positions.
- Steel polish canvas tests proving overlapping stage units, stable finish
  fields across polish/light/tarnish changes, brush-angle direction changes
  without defect reseeding, roughness/gloss progression, coupled
  height/AO/normal defect maps, smooth high-polish reflection veils, rust
  composition, and preview/export descriptor parity.
- Audit-informed steel polish tests proving the 50% brushed baseline does not
  become darker than the 25% scuffed-low region, visible pit depth/population
  reduces with polish response over stable candidates, pitting remains
  shallow/micro-scale rather than cratered, and high-polish side/grazing light
  adds coherent lit-side energy rather than primarily dimming the whole surface.
- Region-sampler renderer tests proving flat steel overhead has low directional
  bias, side/grazing light creates a measurable near/far luma delta across
  polish stages, tarnished steel has broad directional response, and the
  response does not come from moving maps.
- Seed source-of-truth tests proving the same image seed and same frame produce
  identical scalar fields, different image seeds move actual corrosion fields,
  polish changes keep placement masks stable, tarnish changes stage coverage
  without reseeding placement, light-vector changes keep fields/maps stable
  while changing shaded pixels, and preview/export descriptors produce matching
  corrosion maps from the same seed.
- Project save/load tests when persisted fields change.
- `npm run test`
- `npm run lint`
- `npm run build`

Required manual validation before claiming visual acceptance:

- Launch the native Tauri app from the primary checkout with `npm run tauri dev`.
- Inspect a flat steel frame in the visible editor preview while the raised
  bevel profile is under repair.
- Export PNG and compare the exported steel frame against the preview.
- Check at least one disc additional artwork frame and one case insert artwork
  slot when the change is intended to affect both surfaces.

Browser screenshots or source tests alone do not prove the steel material is
visually accepted.

## Known Gaps

- Steel is the first material with automatic micro-surface artifacts. Other
  metal types do not have the deleted base canvas palette/gradient substrate as
  an active canvas fallback.
- Content-shaped/traced frame strokes use stroke-clipped canvas material
  descriptors when the canvas renderer can be used; the deleted vector metal
  material renderer must not be restored as fallback.
- The active steel and black-iron `canvas-texture` path uses stable finish
  fields plus derived per-pixel
  albedo, height, AO, roughness, gloss, anisotropy, defect masks, normals, and
  light-only shading. Steel and black-iron rust use derived per-pixel canvas maps
  for albedo, height, normals, AO, roughness, metal exposure, pores, cracks, and
  flakes. This is still a software material renderer, not a full external PBR
  asset pipeline.
- The current UI exposes brush angle, but not separate steel scratch,
  roughness, pit, or gloss controls. Existing metal controls drive those maps.
