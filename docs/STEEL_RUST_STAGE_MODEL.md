# Steel Rust Stage Model
> Status: Implementation planning contract.
> Purpose: Define a staged, physically motivated rust model for steel and black-iron artwork frame aging.
> Read when: Implementing or reviewing steel/black-iron `metalTarnish` behavior, rust maps, frame material aging, preview/export parity, or rust-related tests.
> Authoritative source: This file for steel/black-iron rust staging intent; `docs/ARTWORK_FRAME_MATERIAL_CONTRACT.md` for the broader frame-material contract; `docs/SOFTWARE_DESIGN_DOCUMENT.md` for preview/export architecture.

This document is intentionally narrow. It describes how rust should progress on
steel and black iron. It does not define copper patina, brass/bronze aging,
chrome dulling, gold aging, or any other material's tarnish model.

The goal is to replace "painted-on rust squiggles" with an art system where the
same corrosion state drives albedo, height, normal response, ambient occlusion,
roughness, gloss suppression, exposed-metal masks, flake edges, and lighting
response.

## Research Basis

Useful corrosion facts for the renderer:

- Rust is iron corrosion in the presence of oxygen and water or moisture. It is
  not a generic synonym for all metal aging.
- Rust products are a changing mix of iron oxides and oxyhydroxides, including
  phases such as lepidocrocite, goethite, hematite, magnetite, and, in chloride
  environments, akaganeite.
- Corrosion begins locally. A direct observation study on AISI 1045 carbon steel
  describes pitting corrosion stages of induction, propagation, and saturation,
  with pit nucleation, roughened basins, pit growth, and corrosion product
  deposits happening unevenly across the surface.
- Corrosion produces both negative height changes, such as pits and roughened
  retreats, and positive height changes, such as deposited corrosion products.
- Chloride and electrolytes accelerate pitting and rust-product buildup. In art
  terms, salt/dirty exposure should look less even and more clustered than a
  gentle uniform darkening.
- Rust is porous, brittle, and non-protective on ordinary steel. It can crack,
  flake, expose fresh metal, and allow corrosion to continue underneath.
- Mature rust scale is visually multi-scale: broad patches establish coverage,
  but the surface read comes from fine granular corrosion product, small dark
  cavities, micro-pore rim catches, matte roughness, and local raised deposits.
  A procedural renderer should therefore add dense small maps over broad rust
  bodies rather than only increasing the opacity of large color regions.
- Rust-product precipitation and volume growth can produce pressure. For the
  frame renderer, advanced rust should therefore be raised, cracked, shadowed,
  and undercut rather than only darker.

References used for this planning model:

- Guo et al., "Direct observation of pitting corrosion evolutions on carbon steel
  surfaces at the nano-to-micro-scales", Scientific Reports, 2018:
  https://www.nature.com/articles/s41598-018-26340-5
- Korec et al., "Phase-field chemo-mechanical modelling of corrosion-induced
  cracking in reinforced concrete subjected to non-uniform chloride-induced
  corrosion", arXiv, 2023:
  https://arxiv.org/abs/2312.06209
- Rust chemistry overview, including water/oxygen dependence, porous flaky rust,
  electrochemical reactions, and expansion behavior:
  https://en.wikipedia.org/wiki/Rust

## Core Renderer Rule

Rust is a generated material state, not a decorative overlay.

For steel and black iron, `metalTarnish` should feed a corrosion field. That
field then derives maps:

- Albedo: orange, red-brown, dark brown, black oxide, grey exposed steel.
- Height/displacement: pits subtract height; rust deposits and scale add height;
  flake lips are locally raised.
- Normal response: raised deposits, pit rims, cracks, and peeling edges need
  directional highlight and shadow response from the material light vector.
- Ambient occlusion: pits, undercut flake edges, patch contacts, and scale cracks
  need dark contact shading.
- Roughness/gloss: rust is high roughness and low gloss; exposed steel islands
  may retain metal highlights.
- Coverage masks: rust should grow from seeds and defects into patches, not fade
  in as one uniform tint.

Current implemented derived channels are `albedo`, `height`,
`ambientOcclusion`, `roughness`, `metalExposure`, `poreMask`, `crackMask`,
`flakeMask`, `flakeBodyMask`, `flakeLipMask`, `flakeRootMask`,
`flakeUndercutAO`, `flakeLiftHeight`, `flakeCurlX`, `flakeCurlY`,
`flakeCastShadow`, and software normals `normalX`, `normalY`, and `normalZ`.
The older SVG rust layer stack is removed/deprecated for steel and black iron;
active rust rendering for those metals is the canvas corrosion field plus these
derived maps.

The corrosion geometry must be material-anchored. Changing the material light
vector may change highlights, shadows, and visibility of normals, but must not
move, rotate, or reseed rust spots, pits, cracks, flakes, or exposed-metal
islands.

For image-backed additional artwork, the material anchor is the transient
`ArtworkFrameMaterialSeed` carried by the canvas material descriptor. The
preferred seed algorithm is `sha256-image-v1`, generated from the source image
payload with Web Crypto SHA-256. The seed provides a stable `key` and `seed32`
for procedural corrosion placement. If Web Crypto is unavailable for an image
payload, the helper may produce `fallback-v1`; that fallback is still
deterministic for the payload bytes and length and must be treated as the same
single seed source by preview and export. If no material seed is available, the
field request uses the existing deterministic frame-derived seed inputs so
non-image and vector-fallback paths remain stable.

## Corrosion Field

Each frame should have a stable corrosion field generated from deterministic
seeds. The field should combine:

- Edge exposure: inner and outer frame edges, bevel ridges, and corners corrode
  earlier because coatings and polish are mechanically weaker there.
- Defect exposure: scratches, gouges, pits, dents, machining grooves, and
  rougher low-polish zones become rust nucleation sites.
- Moisture pockets: soft clustered noise creates basins where rust accumulates
  into patches rather than evenly covering the ring.
- Directional memory: brushed steel grain can still guide early moisture and
  dirt streaking, but mature rust should break away from perfect grain lines.
- Shielded islands: areas protected by polish, raised bevel geometry, or
  stochastic masks remain visible metal longer.

Implementation should derive all stage maps from this same field so stages feel
like one surface evolving over time.

The current geometry seed key is intentionally narrow. It may include the
material seed key when present, frame style, metal identity, frame shape, a
fixed polish-independent anchor, pattern identity/scale/strength, and a fixed
bounds-independent reference anchor. These are placement and
coordinate-stability inputs. Actual preview/export bounds width and height,
texture field dimensions, expanded sampling bounds, `frame.width`, derived
`strokeWidth`, and `metalBrushAngle` are excluded so preview/export scale,
border thickness, raster texture size, and brush-direction edits do not reseed
or rotate rust placement.

The current geometry seed key must not include `metalPolish`, `metalTarnish`,
the material light vector, any legacy scalar-angle input, `metalBrushAngle`,
`frame.width`, derived `strokeWidth`, actual preview/export bounds width and
height, texture field dimensions, or expanded sampling bounds:

- `metalPolish` is a response input. It can change roughness, gloss, apparent
  damage intensity, exposed steel reflectance, and final shaded pixels, but it
  must not move edge exposure, defect exposure, moisture basins, cellular pit
  centers, protected metal islands, corrosion potential, or stage placement.
- `metalTarnish` is a stage input. It can change `stageUnits`,
  `stageCoverage`, rust population, and material-map intensity, but it must not
  reseed the underlying exposure, basin, pit, protection, or potential fields.
- The material light vector is a shading input. It can change the final
  lighting pass, including flake rim highlights, undercut shadows, and
  exposed-chip sparkle, but it must not change scalar fields, derived maps,
  normals, or geometry seed inputs.
- `metalBrushAngle` is a steel-finish response input. It can change brushed
  grain and finish artifacts outside the corrosion field, but it must not move
  corrosion sites, pits, scale, chips, cracks, or flake placement.
- `frame.width` and derived `strokeWidth` are clipping/visibility inputs for
  the current frame ring. They may reveal or hide parts of the stable corrosion
  field as the border thickness changes, but corrosion values in pixels that
  remain inside the frame must stay anchored.
- Texture field dimensions and expanded sampling bounds are rasterization
  inputs. Canvas corrosion maps should sample continuous canonical material
  coordinates derived from the unexpanded frame bounds, so width or texture-size
  changes resample the same corrosion field rather than re-rolling per-pixel
  hashes.

## Slider Stage Bands

`metalTarnish` is normalized as `t = 0..1`. These bands are implementation
targets, not a requirement for hard visual snapping. Transitions should blend
smoothly, but the feature sets should appear in this order.

| Stage | Tarnish Range | Physical Meaning | Visual Read |
| --- | --- | --- | --- |
| 0. Clean steel | 0.00-0.08 | No meaningful corrosion. | Steel material only. No rust tint, flakes, oxide speckles, or rust AO. |
| 1. Oxidation seeds | 0.08-0.22 | Local electrochemical activation starts at defects and edges. | Tiny warm brown/orange specks in scratches, pits, bevel corners, and edge nicks. Very low coverage. Mostly metal remains. |
| 2. Young rust speckles | 0.22-0.38 | Pit propagation and roughened basins become visible. | Irregular orange/red-brown freckling, small clustered dots, shallow deposits, increased pit AO, reduced local gloss. Speckles vary in size and are not evenly spaced. |
| 3. Patch growth | 0.38-0.55 | Corrosion products accumulate and nearby seeds coalesce. | Mottled patches with fuzzy boundaries, orange rims, brown centers, pinholes of visible steel, and contact shadow at patch edges. Still many exposed metal paths. |
| 4. Mature scale | 0.55-0.72 | Older rust darkens and thickens into rough porous scale. | Raised rough islands, dark brown/black old oxide in recesses, brighter orange active rims, deeper pits, stronger AO, matte response, metal sheen limited to exposed islands. |
| 5. Flaking and undercutting | 0.72-0.88 | Rust scale cracks, lifts, and exposes fresh steel below. | Cracks, lifted flake lips, peeling-edge shadows, chipped exposed-metal islands, dark underlayers, and rough crust. Rust no longer follows clean grain. |
| 6. Advanced coverage | 0.88-1.00 | Most surface is rust scale with scattered exposed remnants. | Broad rusty coverage with porous granular texture, dark cavities, flaking sheets, tiny grey steel chips, almost no gloss except exposed-metal edges. Avoid flat orange fill. |

The implementation may use a low-strength incipient seed ramp before 0.08 to
avoid a hard pop at the boundary. That ramp must remain visually clean until
the Stage 1 range begins; the first visible warm oxidation seeds should be
present at 0.08 rather than delayed until later in the slider.

Stage 2 may also use a pre-ramp before 0.22 so the transition out of saturated
seed oxidation does not plateau. By 0.24, clustered young-rust features should
be visibly underway, and by 0.28 they should read as larger connected groups
with warmer albedo, stronger roughness, shallow height, and reduced metal
exposure. The late Stage 2 band may begin a weak pre-basin/coalescence ramp
around 0.30 so 0.31-0.38 visibly evolves into patch growth without formally
starting mature scale, flaking, or broad coverage.

## Photo Reference Set

These photo references are calibration targets only. They should not be copied
into the app, used as bitmap textures, or treated as one-to-one stage snapshots.
Use them to tune procedural coverage, color variation, height, ambient
occlusion, flake edge behavior, residual steel exposure, and gloss suppression.

Reference selection rules:

- Prefer bare steel, iron, corrosion coupons, or uncoated steel with mill scale.
- Exclude painted, powder-coated, enameled, or decorative stock-texture surfaces
  for this stage model unless a future pass explicitly studies coating failure.
- Use the visible image content, not the filename, as the deciding criterion.
- Prefer references where the stage trait is physically legible: speckles,
  pits, coalescing patches, raised scale, lifted lips, exposed steel, or porous
  crust.

| Stage | Reference | What To Study |
| --- | --- | --- |
| 0. Clean steel | [Q-Lab clean corrosion coupon](https://www.q-lab.com/sites/default/files/styles/product_large_image/public/2024-05/02_Q-PANEL_CorrosionCoupon.png?itok=7OOya5aq) from [Q-Lab corrosion coupons](https://www.q-lab.com/corrosion/equipment-accessories/corrosion-mass-loss-coupons) | Visually inspected: clean silver steel coupon with no orange warmth or rust AO. Use for the non-rusted baseline and subtle steel value range. |
| 1. Oxidation seeds | [Q-Lab coupon progression](https://www.q-lab.com/sites/default/files/styles/product_large_image/public/2024-05/04_Q-PANEL_CorrosionCoupon_0.png?itok=xy3OMSOP), second coupon from left | Visually inspected: mostly exposed grey steel with sparse brown specks and small edge activations. Use for seed count, seed scale, and how much metal remains dominant. |
| 2. Young rust speckles | [Q-Lab coupon progression](https://www.q-lab.com/sites/default/files/styles/product_large_image/public/2024-05/04_Q-PANEL_CorrosionCoupon_0.png?itok=xy3OMSOP), second-to-third coupon transition | Visually inspected: uneven speckle density, varied dot sizes, early coalescing clusters, and reduced gloss around active corrosion. Use for speckles that add physical deposits instead of opacity. |
| 3. Patch growth | [Elcometer uncoated steel with rust under mill scale](https://www.elcometer.com/pub/media/ElcometerGuide/SurfacePrep/Mill-scale-can-often-be-produced-on-newly-rolled-steel.jpg) from [Assessing the Surface Condition](https://www.elcometer.com/en/assessing-the-surface-condition) | Visually inspected: irregular patch bodies, fuzzy rust/steel boundaries, exposed steel islands, orange active regions, darker pocketing, and scale lifted by rust growth. |
| 4. Mature scale | [Q-Lab severe corrosion coupon](https://www.q-lab.com/sites/default/files/styles/product_large_image/public/2024-03/21_Corrosion%20Coupon_Severe%20Corrosion.jpg?itok=ikCJUkdN) | Visually inspected: dark oxide pockets, pitted basins, raised rough scale, orange rims, and exposed steel islands. Use for rough matte scale while retaining isolated metal response. |
| 5. Flaking and undercutting | [Elcometer uncoated steel with rust under mill scale](https://www.elcometer.com/pub/media/ElcometerGuide/SurfacePrep/Mill-scale-can-often-be-produced-on-newly-rolled-steel.jpg) and [Flickr rust flake macro](https://www.flickr.com/photos/8716587@N08/2636208625) | Visually inspected: lifted lips, jagged flake boundaries, undercut shadows, dark gaps under scale, and sharper exposed-metal edges. Use for geometry and AO, not painted-peel behavior. |
| 6. Advanced coverage | [Q-Lab severe corrosion coupon](https://www.q-lab.com/sites/default/files/styles/product_large_image/public/2024-03/21_Corrosion%20Coupon_Severe%20Corrosion.jpg?itok=ikCJUkdN) and [LCS pitting corrosion test coupons](https://lcslaboratory.com/rate-of-pitting-corrosion/) | Visually inspected: broad rust coverage, heavy pitting, porous dark cavities, granular crust, and remaining grey steel islands. Use to avoid flat orange fill at maximum tarnish. |

## Stage Requirements

### Stage 0: Clean Steel

Required maps:

- Existing steel grain, polish, scratch, normal, roughness, and gloss maps only.
- No rust map should be generated above an invisible/no-op threshold.

Acceptance:

- A clean frame must not get warmer, darker, or more matte solely because rust
  support exists.

### Stage 1: Oxidation Seeds

Required maps:

- `rust-seed-oxidation-map`: tiny deterministic speckles at corrosion-field
  maxima, scratches, pits, and exposed edges.
- `rust-seed-pit-ao-map`: faint AO in active micro-pits.
- `rust-seed-roughness-map`: local gloss suppression around active points.

Visual constraints:

- Speckles should be sparse and uneven.
- Marks should be sub-grain to grain scale, not large brush strokes.
- Most marks should sit inside or near existing defects.

Acceptance:

- The frame reads as mostly steel with early oxidation, not already rusty.
- Turning the light should reveal or hide micro-pit rims without moving speckles.

### Stage 2: Young Rust Speckles

Required maps:

- `rust-young-speckle-albedo-map`: varied orange, red-brown, and dull yellow
  speckle clusters.
- `rust-young-deposit-height-map`: shallow raised deposit bumps.
- `rust-young-normal-highlight-map` and `rust-young-normal-shadow-map`: small
  rim response around raised deposits and pits.
- `rust-young-pit-ao-map`: darker pit centers where rust emerges.

Visual constraints:

- Dot sizes and spacing must vary. Some dots should cluster into early basins.
- Rust should favor defects and edges, but not trace every scratch like ink.
- Young rust is more saturated than old rust but has low surface gloss.

Acceptance:

- Coverage increases by adding new physical features and clusters, not only by
  increasing opacity of Stage 1 marks.

### Stage 3: Patch Growth

Required maps:

- `rust-patch-body-albedo-map`: mottled patch bodies.
- `rust-patch-edge-map`: warmer active rims around growing patches.
- `rust-patch-contact-ao-map`: shadow where deposits sit on steel.
- `rust-patch-height-map`: positive height for accumulated corrosion product.
- `rust-metal-pinhole-mask`: small holes where steel still shows through.

Visual constraints:

- Patches must have noisy, broken boundaries.
- Patches should contain internal color variation: orange active areas, brown
  middle areas, dark pocketing, and grey metal pinholes.
- Patch growth should feel cellular or basin-like, not a set of drawn curves.

Acceptance:

- At least three visual channels change together: albedo, height/normal, and AO.
- The same patch should cast/contact-shadow consistently in preview and export.

### Stage 4: Mature Scale

Required maps:

- `rust-dark-oxide-underlayer-map`: dark brown/black older oxide pockets.
- `rust-scale-height-map`: stronger raised crust height.
- `rust-scale-porosity-map`: granular holes and roughness variation.
- `rust-granular-crust-albedo-map`: dense tiny rust grains and oxidized
  deposits that break up broad patch bodies.
- `rust-granular-crust-shadow-map` and
  `rust-granular-crust-highlight-map`: matte granular relief that gives the
  scale local dark flecks and subdued light catches.
- `rust-micro-pore-ao-map`, `rust-micro-pore-rim-highlight-map`, and
  `rust-micro-pore-rim-shadow-map`: clustered cavity floors and fixed rim
  segments from one shared pore geometry.
- `rust-scale-crack-ao-map`: dark linework only where cracks cut through raised
  scale.
- `rust-exposed-metal-island-map`: metal still visible where rust has not spread
  or has worn away.

Visual constraints:

- Dark areas should sit in cavities, cracks, and old centers. They should not be
  a uniform dark veil over the whole border.
- Raised scale should break the original brushed steel continuity.
- Exposed metal islands should remain steel-colored and light-responsive.

Acceptance:

- The rusted surface reads rough and matte from any light-vector position.
- Metallic highlights survive only on exposed metal islands or scraped ridges.

### Stage 5: Flaking And Undercutting

Implemented derived channels:

- `flakeBodyMask`: irregular rust-scale plates. The body contributes positive
  height and matte crust coverage.
- `flakeLipMask`: thin lifted edges of the plates. Lips must have stronger
  height than ordinary flake bodies and must be narrow, broken, and irregular
  rather than contour-like sticker outlines.
- `flakeRootMask`: attached plate sides. Roots keep flakes physically tied to
  the rust body and reduce the impression that every plate floats.
- `flakeUndercutAO`: contact shadow and cavity darkness under raised scale. This
  channel contributes to AO, local height setback, and directional contact
  shadow.
- `flakeLiftHeight`: positive lifted-scale relief, especially at lips.
- `flakeCurlX` and `flakeCurlY`: stable curl-bias inputs used by lighting.
- `flakeCastShadow`: stable cast/contact-shadow input for lifted scale.
- `crackMask`: irregular cracking inside mature scale.
- `metalExposure`: fresh steel chips and torn exposed ridges where flakes cut
  through rust.

Visual constraints:

- Flakes should have thickness. A peel edge needs a highlight on one side and a
  contact shadow or undercut shadow on the other.
- Exposed steel islands should be irregular chips, scratches, or torn patches,
  not perfect circles.
- Cracks should branch, terminate, and vary in width.
- Flake bodies, lips, roots, undercuts, cast-shadow inputs, curl inputs, and
  exposed chips must come from stable corrosion geometry and must not be seeded
  from lighting input.

Acceptance:

- Stage 5 must be distinguishable from Stage 4 by geometry: lifted lips, shadow,
  exposed chips, and crack networks, not just darker color.
- Tests must prove flake lips have greater average height than flake bodies,
  undercuts have stronger AO, flake geometry is unchanged by the light vector,
  and final shaded pixels change when the light vector changes.

### Stage 6: Advanced Coverage

Implemented derived channels:

- `albedo`: broad rusty coverage with varied old/new rust color.
- `height`: coarse raised porous surface plus negative cavities and chip cuts.
- `ambientOcclusion`: cavities, crack interiors, undercuts, and flake contacts.
- `poreMask`: clustered pores and pits that keep heavy rust from becoming flat
  color.
- `crackMask`: broken scale cracks, faded enough to avoid contour-line stickers.
- `flakeMask`, `flakeBodyMask`, `flakeLipMask`, `flakeRootMask`,
  `flakeUndercutAO`, `flakeLiftHeight`, `flakeCurlX`, `flakeCurlY`, and
  `flakeCastShadow`: lifted scale relief that remains visible through advanced
  coverage.
- `metalExposure`: small grey steel flecks, worn ridges, scraped edges, and
  fresh chips.
- `roughness`: near-total gloss suppression on rust, with lower roughness only
  on exposed metal chips/ridges.

Visual constraints:

- Advanced rust should remain heterogeneous. It should not become one flat
  orange/brown mask.
- Broad areas can be covered, but they need pitting, porosity, flakes, dark
  cavities, and occasional exposed metal.
- Broad filled patch maps should read as soft underpaint only. The surface
  texture at this stage must be built from many tiny open crust grains,
  clustered micro-pores, chips, and flake relief rather than large outlined
  islands.
- Patch-edge and crack-contour maps should fade out as advanced coverage takes
  over, otherwise overlapping outlines read as transparent stickers instead of
  corroded material.
- The bevel profile must remain readable through height and shadow, even when
  mostly rusted.

Acceptance:

- The frame should read as heavily corroded metal with rust scale, not painted
  plastic.

## Lighting Model

Rust light behavior differs from polished or brushed steel:

- Rust has high roughness and low gloss. It should produce broad diffuse value
  changes, not crisp metallic streak highlights.
- Raised deposits need directional normal response. Their lit rim and shadow rim
  should follow the material light vector, while the deposit geometry stays
  fixed.
- Pits and cracks should deepen when lit from the opposite direction and soften
  when front-lit.
- Exposed steel islands and chips retain small metallic highlights and should
  contrast against matte rust.
- Flake lips need directional highlight on the raised edge, darker response when
  facing away from the light, and undercut/contact shadow beneath the lifted
  scale.

Light response should be generated from height/normal/roughness maps derived
from the corrosion field. The rust albedo mask itself should not rotate or shift.
The implemented normal pass derives `normalX`, `normalY`, and `normalZ` from
finite differences in `height`; flake curl bias comes from `flakeCurlX` and
`flakeCurlY`, which are stable geometry maps. The material light vector may only
affect the software shading pass. It must not alter corrosion fields, flake
body/lip/root/undercut maps, height, normals, roughness, AO, metal exposure,
crack masks, pore masks, cache-key geometry inputs, or seeded coverage.

`metalPolish` and `metalTarnish` must remain separated in the same way:
polish affects finish response over the stable geometry, while tarnish advances
stage coverage over the stable geometry. Neither control owns the image-derived
seed.

### Hemisphere Light Editor For Rust

The implemented preview light editor exposes a sun handle inside a circular
control centered on the artwork being edited when a canvas-lit artwork frame is
selected. Centered sun position means overhead light. Radial distance maps to
inclination from 0 to 90 degrees: center is overhead, half radius is 45 degrees,
and the edge is grazing light. Angular position maps to horizontal light
direction. Positions outside the radius are clamped before the renderer-facing
light vector is created.

#### Intended Rust Macro Direction Contract (Pending Fix)

Audit note: this is the intended rust macro-light direction contract, not a
claim of accepted current visual behavior. The existing renderer must be updated
and tested against this convention before native visual acceptance is reported.

Dragging the sun defines a light control vector. Center sun means overhead
neutral light with no broad directional bias. For rust composition, the handle
side is the broad shadow side and the opposite side is the broad lit side:

- Bottom-left handle: brightest broad rust response at the top-right,
  strongest broad rust shadow at the bottom-left.
- Bottom-right handle: brightest broad rust response at the top-left,
  strongest broad rust shadow at the bottom-right.
- Top-left handle: brightest broad rust response at the bottom-right,
  strongest broad rust shadow at the top-left.
- Top-right handle: brightest broad rust response at the bottom-left,
  strongest broad rust shadow at the top-right.

This response belongs only to final shading. It must not move or reseed
corrosion scalar fields, derived rust maps, height, normals, AO, roughness,
metal exposure, pore masks, crack masks, flake body/lip/root/undercut maps,
curl maps, cast-shadow inputs, geometry seed keys, material seed inputs, or
stage coverage.

Rust shading consumes the resulting normalized 3D light vector only in the
final shading pass. It may change raised-deposit lighting, pit and pore depth
response, flake lip rim highlights, back-facing lip darkening, directional
undercut/contact shadows, height-map self-shadow response, and exposed steel
chip highlights. It must not change corrosion scalar fields, derived rust maps,
height, normals, AO, roughness, metal exposure, pore masks, crack masks, flake
body/lip/root/undercut maps, curl maps, cast-shadow inputs, geometry seed keys,
or material seed inputs.

### Frame-Space Macro Lighting For Rust Composition

Rust composition uses the same implemented frame-space macro light field as
clean steel so tarnished steel has broad near-side and far-side lighting in
addition to local micro-normal response. The current pixel position relative to
the artwork/frame center and the material light vector produce bounded macro
diffuse, shadow, near-side, far-side, and grazing factors during final software
shading.

The rust macro response is final-shading-only. Overhead light leaves the broad
rust surface mostly neutral. A 45-degree off-center light creates near-side
diffuse lift and far-side darkening across rust scale, while existing
height/normal maps still drive pore, crack, flake lip, undercut, and exposed
chip response. Grazing light strengthens directional falloff, undercut
darkening, and contact-shadow response without changing any rust geometry.

The macro field must not alter corrosion scalar fields, derived rust maps,
height, normals, AO, roughness, metal exposure, pore masks, crack masks, flake
body/lip/root/undercut maps, curl maps, cast-shadow inputs, geometry seed keys,
material seed inputs, or saved project schema. Preview and export use the same
macro-light shading context for equivalent canvas descriptors.

The legacy `metalLightAngle` slider and scalar-angle renderer path are removed.
Older project JSON may still contain that field; normalization tolerates it but
drops it from active frame state. When no transient light-editor override is
active, steel and black-iron canvas corrosion uses the overhead light vector
`{ x: 0, y: 0, z: 1 }`. When a transient override is active, preview and PNG
export pass the same override light vector through the shared material
descriptor; the override is not persisted as project state.

Height-map self-shadowing for rust reads the stable rust height map, a rust
mask, the light vector, and macro `farShadowRamp`/`grazingStrength` factors.
Overhead light produces minimal directional contact shadowing, 45-degree light
produces moderate shadowing, and grazing light can produce longer directional
darkening around raised deposits, pits, cracks, flakes, and undercuts. The pass
never changes corrosion fields, derived maps, flake maps, height, normals, AO,
roughness, metal exposure, or seeded coverage.

For performance, corrosion fields, derived rust maps, and normal inputs are
cacheable separately from final light-shaded pixels. Light changes should reuse
cached maps where descriptor inputs allow it and rerun only final shading and
self-shadow work. The OffscreenCanvas and worker-shading adapters are optional
acceleration paths over the same descriptor and shared shading function, with
main-thread Canvas 2D fallback on unsupported capability or adapter failure.
WebGL remains a later pivot criterion only if measured Canvas 2D plus
OffscreenCanvas performance is still insufficient; any WebGL path must shade
these same rust maps as textures, preserve preview/export parity, and must not
become a separate rust implementation.

## Implementation Phasing

Implement stages individually in this order:

1. Stage 1 oxidation seeds: seeded speckles, pit AO, gloss suppression.
2. Stage 2 young rust: cluster growth, shallow deposit height, normal rims.
3. Stage 3 patch growth: mottled patches, warm rims, contact AO, pinholes.
4. Stage 4 mature scale: dark underlayer, porosity, thicker height, exposed
   metal islands.
5. Stage 5 flaking: lifted lips, undercut shadows, crack network, fresh steel.
6. Stage 6 advanced coverage: broad heterogeneous scale, residual steel chips,
   full matte roughness.

Each stage should add at least one new physical map or new derived behavior. Do
not implement a stage by only raising opacity on an earlier stage.

## Preview And Export Parity

The rust model must preserve existing renderer contracts:

- Preview and export consume the same canvas material descriptor when the
  material plan selects `canvas-texture`.
- Image-backed preview and export descriptors carry the same
  `ArtworkFrameMaterialSeed` for the same source image. The corrosion field
  request, geometry seed key, scalar fields, and derived maps must match for
  equivalent descriptors.
- Preview and export both call `renderArtworkFrameCanvasMaterialTexture` for
  steel and black-iron canvas corrosion. Preview embeds the returned image
  source in SVG; PNG export draws the returned image source onto the export
  canvas.
- Rust maps are clipped to the metal frame ring or stroke mask.
- Broad advanced scale and matte roughness are substrate/body maps. Lifted flake
  lips, crack shadows, fresh exposed steel, and residual steel chips must render
  above them so advanced rust does not become a flat wash over physical breaks.
- Raised rust, flake shadows, and contact AO must not bleed into artwork or
  outside the frame.
- Preview/export tests must prove matching descriptors, deterministic cache
  keys, matching material seed keys, matching scalar fields, matching derived
  flake maps, matching height/normal/AO/roughness maps, and matching final
  shaded pixels for equivalent steel/black-iron canvas descriptors.
- Deterministic seeds must produce stable results for the same image seed,
  project, and frame parameters. Different image seeds must change actual
  corrosion geometry fields, not only descriptor key strings.
- The deprecated SVG rust layer stack must not return as a preview-only,
  export-only, or fallback implementation. Steel/black-iron rust should not
  split into separate preview/export rust systems.

## Test Expectations

Focused render tests should cover:

- Steel/black iron generate rust-stage layers; copper/gold/chrome do not use the
  rust stage model.
- Same image seed plus the same frame produces identical corrosion scalar fields
  and derived maps.
- Different image seeds produce different scalar corrosion geometry, such as
  moisture basins, cellular pit centers, or stage coverage.
- Same image seed with different `metalPolish` values preserves placement masks
  while still allowing roughness or shaded pixels to change.
- Same image seed with different `metalTarnish` values preserves placement
  fields while changing stage coverage and rust population.
- Same image seed with different material light vectors preserves scalar fields
  and derived maps while changing final shaded pixels.
- Macro-light region diagnostics prove overhead light remains broadly neutral,
  side light creates a near/far luma split on tarnished steel, and the response
  does not move corrosion maps or flake maps.
- Preview/export descriptors use the same material seed and produce matching
  corrosion scalar fields and derived maps.
- Each stage threshold introduces the expected role family.
- Stage coverage grows by adding path count, patch size, height, AO, or exposed
  metal masks, not only by opacity.
- Light-vector changes alter normal/shadow intensity or offset direction, but
  rust geometry path coordinates stay stable.
- Stage 0 produces no visible rust roles.
- Stage 5 and Stage 6 include flake/shadow/exposed-metal behavior.
- Preview/export descriptors, flake maps, height, normals, AO, roughness,
  metal exposure, cache keys, and final shaded pixels remain shared for
  equivalent canvas descriptors.

Manual validation should inspect at least one flat steel frame at
`metalTarnish` values near 0, 15, 30, 45, 65, 80, and 100.

## Non-Goals

- Do not make all metals rust.
- Do not add new saved fields until the existing `metalTarnish` staging proves
  inadequate.
- Do not use bitmap rust textures as the source of truth unless export parity is
  implemented at the same time.
- Do not hide weak stage design behind random squiggles, linework, or broad
  opacity-only overlays.
