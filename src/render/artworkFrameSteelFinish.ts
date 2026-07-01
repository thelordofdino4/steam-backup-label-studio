import type {
  AdditionalArtworkFrame,
  AdditionalArtworkMetalType,
} from '../project/projectTypes.ts'
import {
  getMetalArtworkFrameEdgeInsets,
  type ArtworkFrameRect,
} from './artworkFrame.ts'
import {
  ARTWORK_FRAME_STEEL_DEFECT_KINDS,
  type ArtworkFrameSteelDefectDecalMapSet,
  type ArtworkFrameSteelDefectKind,
  type ArtworkFrameSteelDefectPhysicalContributionChannel,
} from './artworkFrameSteelDefects.ts'
import {
  resolveArtworkFrameMaterialLightVector,
  type ArtworkFrameMaterialLightVector,
} from './artworkFrameMaterialLighting.ts'
import {
  getArtworkFrameMaterialMacroLightingFactors,
  getArtworkFrameMaterialMacroLightingPositionFromMaterialPoint,
} from './artworkFrameMaterialMacroLighting.ts'
import {
  measureArtworkFrameMaterialPerformance,
  type ArtworkFrameMaterialPerformanceRecorder,
} from './artworkFrameMaterialPerformance.ts'
import {
  buildArtworkFrameMaterialHeightSelfShadowMap,
  getArtworkFrameMaterialHeightSelfShadowMacroMultiplier,
} from './artworkFrameMaterialSelfShadow.ts'
import type { ArtworkFrameMaterialSeed } from './artworkFrameMaterialSeed.ts'
import type { ArtworkFrameMaterialShadingCoordinateContext } from './artworkFrameMaterialShading.ts'

type ArtworkFrameSteelFinishFrameGeometrySettings = Pick<
  AdditionalArtworkFrame,
  | 'metalType'
  | 'shape'
  | 'style'
>

type ArtworkFrameSteelFinishFrameResponseSettings = Pick<
  AdditionalArtworkFrame,
  | 'metalBrushAngle'
  | 'metalPolish'
  | 'metalTarnish'
>

type ArtworkFrameSteelFinishFrameInput =
  ArtworkFrameSteelFinishFrameGeometrySettings &
  ArtworkFrameSteelFinishFrameResponseSettings

export type ArtworkFrameSteelFinishFieldSize = {
  height: number
  width: number
}

type ArtworkFrameSteelFinishTextureSizeInput = {
  height: number
  width: number
}

export type ArtworkFrameSteelPolishStageUnits = {
  brushedBaseline: number
  fineSatin: number
  nearMirror: number
  roughDamaged: number
  scuffedLow: number
  semiBright: number
}

export const ARTWORK_FRAME_STEEL_POLISH_STAGE_KEYS = [
  'roughDamaged',
  'scuffedLow',
  'brushedBaseline',
  'fineSatin',
  'semiBright',
  'nearMirror',
] as const

export type ArtworkFrameSteelPolishStageKey =
  typeof ARTWORK_FRAME_STEEL_POLISH_STAGE_KEYS[number]

export const ARTWORK_FRAME_STEEL_FINISH_FIELD_CHANNELS = [
  'abrasionDirectionX',
  'abrasionDirectionY',
  'machiningGrooveField',
  'scratchCandidateField',
  'gougeCandidateField',
  'dentPocketField',
  'pitPocketField',
  'scuffCrossScratchField',
  'cloudAbrasionField',
  'buffingReflectionField',
  'protectionVisibilityField',
  'frameMask',
] as const

export type ArtworkFrameSteelFinishFieldChannel =
  typeof ARTWORK_FRAME_STEEL_FINISH_FIELD_CHANNELS[number]

export type ArtworkFrameSteelFinishScalarFields = {
  abrasionDirectionX: Float32Array
  abrasionDirectionY: Float32Array
  buffingReflectionField: Float32Array
  cloudAbrasionField: Float32Array
  dentPocketField: Float32Array
  frameMask: Float32Array
  gougeCandidateField: Float32Array
  machiningGrooveField: Float32Array
  pitPocketField: Float32Array
  protectionVisibilityField: Float32Array
  scuffCrossScratchField: Float32Array
  scratchCandidateField: Float32Array
}

export const ARTWORK_FRAME_STEEL_SUBSTRATE_FIELD_CHANNELS = [
  'substrateLayDirectionX',
  'substrateLayDirectionY',
  'substrateMicroStrandMask',
  'substrateGrainContinuity',
  'substratePlateHaze',
  'substrateInclusionNoise',
  'substrateReflectionVeil',
  'substrateRoughnessVariation',
  'substrateHeightVariation',
  'substrateAnisotropyAspect',
] as const

export type ArtworkFrameSteelSubstrateFieldChannel =
  typeof ARTWORK_FRAME_STEEL_SUBSTRATE_FIELD_CHANNELS[number]

export type ArtworkFrameSteelSubstrateScalarFields = {
  [Channel in ArtworkFrameSteelSubstrateFieldChannel]: Float32Array
}

export type ArtworkFrameSteelSubstrateField = {
  fields: ArtworkFrameSteelSubstrateScalarFields
  heightPixels: number
  widthPixels: number
}

export const ARTWORK_FRAME_STEEL_SUBSTRATE_DERIVED_SCALAR_MAP_CHANNELS = [
  'steelSubstrateLayDirectionX',
  'steelSubstrateLayDirectionY',
  'steelSubstrateMicroStrandMask',
  'steelSubstrateGrainContinuity',
  'steelSubstratePlateHaze',
  'steelSubstrateInclusionNoise',
  'steelSubstrateReflectionVeil',
  'steelSubstrateHeight',
  'steelSubstrateAmbientOcclusion',
  'steelSubstrateRoughness',
  'steelSubstrateGloss',
  'steelSubstrateAnisotropy',
  'steelSubstrateAnisotropyDirectionX',
  'steelSubstrateAnisotropyDirectionY',
  'steelSubstrateAlongRoughness',
  'steelSubstrateCrossRoughness',
  'steelSubstrateNormalStrength',
] as const

export type ArtworkFrameSteelSubstrateDerivedScalarMapChannel =
  typeof ARTWORK_FRAME_STEEL_SUBSTRATE_DERIVED_SCALAR_MAP_CHANNELS[number]

export const ARTWORK_FRAME_STEEL_SUBSTRATE_DERIVED_MAP_CHANNELS = [
  'steelSubstrateAlbedo',
  ...ARTWORK_FRAME_STEEL_SUBSTRATE_DERIVED_SCALAR_MAP_CHANNELS,
] as const

export type ArtworkFrameSteelSubstrateDerivedMapChannel =
  typeof ARTWORK_FRAME_STEEL_SUBSTRATE_DERIVED_MAP_CHANNELS[number]

export type ArtworkFrameSteelSubstrateDerivedMaps = {
  [Channel in ArtworkFrameSteelSubstrateDerivedScalarMapChannel]: Float32Array
} & {
  heightPixels: number
  steelSubstrateAlbedo: Float32Array
  widthPixels: number
}

export type ArtworkFrameSteelSubstrateNormalInputs = {
  heightPixels: number
  normalStrength: number
  normalX: Float32Array
  normalY: Float32Array
  normalZ: Float32Array
  substrateAnisotropy: Float32Array
  substrateAnisotropyDirectionX: Float32Array
  substrateAnisotropyDirectionY: Float32Array
  substrateHeight: Float32Array
  widthPixels: number
}

export type ArtworkFrameSteelSubstrateCompositionInputs = {
  defectDecalMaps?: ArtworkFrameSteelDefectDecalMapSet | null
  substrateMaps?: ArtworkFrameSteelSubstrateDerivedMaps | null
  substrateNormalInputs?: ArtworkFrameSteelSubstrateNormalInputs | null
}

export type ArtworkFrameSteelHighPolishSubstrateResponse = {
  aoStrength: number
  anisotropyStrength: number
  gloss: number
  grainVisibility: number
  hairlineVisibilityAllowance: number
  heightStrength: number
  luma: number
  normalStrength: number
  reflectionVeilStrength: number
  roughness: number
}

export type CreateArtworkFrameSteelEmptySubstrateMapsInput = {
  heightPixels: number
  widthPixels: number
}

export const ARTWORK_FRAME_STEEL_FINISH_DERIVED_MAP_CHANNELS = [
  'steelAlbedo',
  'steelHeight',
  'steelAmbientOcclusion',
  'steelRoughness',
  'steelGloss',
  'steelMetalness',
  'steelAnisotropy',
  'steelAnisotropyDirectionX',
  'steelAnisotropyDirectionY',
  'machiningGrooveMask',
  'machiningRidgeMask',
  'brushedGrainMask',
  'abrasionCloudMask',
  'scratchTroughMask',
  'scratchRimLightMask',
  'scratchRimShadowMask',
  'gougeTroughMask',
  'dentPocketMask',
  'pitPocketMask',
  'visibleBurrRidgeMask',
  'visibleDefectShadowMask',
  'visibleDentAmbientOcclusionMask',
  'visibleDentDepthMask',
  'visibleDentShadowMask',
  'visibleGougeAmbientOcclusionMask',
  'visibleGougeDepthMask',
  'visibleGougeShadowMask',
  'visiblePitAmbientOcclusionMask',
  'visiblePitDepthMask',
  'visiblePitShadowMask',
  'visibleScratchAmbientOcclusionMask',
  'visibleScratchDepthMask',
  'visibleScratchRimLightMask',
  'visibleScratchRimShadowMask',
  'visibleScratchShadowMask',
  'burrRidgeMask',
  'scuffCrossScratchTroughMask',
  'scuffCrossScratchRimLightMask',
  'scuffCrossScratchRimShadowMask',
  'polishedReflectionMask',
  'polishedHazeMask',
] as const

export type ArtworkFrameSteelFinishDerivedMapChannel =
  typeof ARTWORK_FRAME_STEEL_FINISH_DERIVED_MAP_CHANNELS[number]

export type ArtworkFrameSteelFinishDerivedMaps = {
  abrasionCloudMask: Float32Array
  brushedGrainMask: Float32Array
  burrRidgeMask: Float32Array
  dentPocketMask: Float32Array
  defectDecalMaps?: ArtworkFrameSteelDefectDecalMapSet | null
  gougeTroughMask: Float32Array
  heightPixels: number
  machiningGrooveMask: Float32Array
  machiningRidgeMask: Float32Array
  pitPocketMask: Float32Array
  polishedHazeMask: Float32Array
  polishedReflectionMask: Float32Array
  polishUnit: number
  scuffCrossScratchRimLightMask: Float32Array
  scuffCrossScratchRimShadowMask: Float32Array
  scuffCrossScratchTroughMask: Float32Array
  scratchRimLightMask: Float32Array
  scratchRimShadowMask: Float32Array
  scratchTroughMask: Float32Array
  stageUnits: ArtworkFrameSteelPolishStageUnits
  steelAlbedo: Float32Array
  steelAmbientOcclusion: Float32Array
  steelAnisotropy: Float32Array
  steelAnisotropyDirectionX: Float32Array
  steelAnisotropyDirectionY: Float32Array
  steelGloss: Float32Array
  steelHeight: Float32Array
  steelMetalness: Float32Array
  steelRoughness: Float32Array
  substrateMaps?: ArtworkFrameSteelSubstrateDerivedMaps | null
  visibleBurrRidgeMask: Float32Array
  visibleDefectShadowMask: Float32Array
  visibleDentAmbientOcclusionMask: Float32Array
  visibleDentDepthMask: Float32Array
  visibleDentShadowMask: Float32Array
  visibleGougeAmbientOcclusionMask: Float32Array
  visibleGougeDepthMask: Float32Array
  visibleGougeShadowMask: Float32Array
  visiblePitAmbientOcclusionMask: Float32Array
  visiblePitDepthMask: Float32Array
  visiblePitShadowMask: Float32Array
  visibleScratchAmbientOcclusionMask: Float32Array
  visibleScratchDepthMask: Float32Array
  visibleScratchRimLightMask: Float32Array
  visibleScratchRimShadowMask: Float32Array
  visibleScratchShadowMask: Float32Array
  widthPixels: number
}

export type ArtworkFrameSteelFinishNormalInputs = {
  heightPixels: number
  normalX: Float32Array
  normalY: Float32Array
  normalZ: Float32Array
  normalStrength: number
  steelAnisotropy: Float32Array
  steelAnisotropyDirectionX: Float32Array
  steelAnisotropyDirectionY: Float32Array
  steelHeight: Float32Array
  widthPixels: number
}

export type ArtworkFrameSteelFinishShadingInputs = {
  coordinates: ArtworkFrameMaterialShadingCoordinateContext
  lightVector: ArtworkFrameMaterialLightVector
  metalBrushAngle: number
  normalInputs: ArtworkFrameSteelFinishNormalInputs
  performance?: ArtworkFrameMaterialPerformanceRecorder | null
  steelFinishMaps: ArtworkFrameSteelFinishDerivedMaps
}

export type ArtworkFrameSteelFinishFieldRequest = {
  bounds: ArtworkFrameRect
  brushAngleDegrees: number
  fieldSize: ArtworkFrameSteelFinishFieldSize
  geometryInputs: ArtworkFrameSteelFinishFrameGeometrySettings
  geometrySeed: number
  geometrySeedKey: string
  materialSeed: ArtworkFrameMaterialSeed | null
  polishUnit: number
  responseInputs: ArtworkFrameSteelFinishFrameResponseSettings
  samplingBounds: ArtworkFrameRect
  stageUnits: ArtworkFrameSteelPolishStageUnits
  strokeWidth: number
  substrateGeometrySeed: number
  substrateGeometrySeedKey: string
  tarnishUnit: number
}

export type ArtworkFrameSteelFinishField = ArtworkFrameSteelFinishFieldRequest & {
  fields: ArtworkFrameSteelFinishScalarFields
}

export type BuildArtworkFrameSteelFinishDerivedMapsOptions = {
  defectDecalMaps?: ArtworkFrameSteelDefectDecalMapSet | null
}

const STEEL_FINISH_GEOMETRY_VERSION = 'steel-finish-field-v1'
const STEEL_FINISH_CANONICAL_COORDINATES = 'canonical-frame-space-v1'
const STEEL_FINISH_GEOMETRY_STABLE_HASH_GRID = 4096
const STEEL_FINISH_NORMAL_STRENGTH = 0.72
const STEEL_FINISH_REFLECTION_MASK_OUTPUT_SCALE = 0.12
const STEEL_FINISH_HAZE_MASK_OUTPUT_SCALE = 0.12
const STEEL_SUBSTRATE_GEOMETRY_VERSION = 'steel-substrate-geometry-v1'
const STEEL_SUBSTRATE_CANONICAL_COORDINATES = 'canonical-frame-ring-space-v1'
const STEEL_SUBSTRATE_CANONICAL_RING_ANCHORS =
  'flat-rectangle-inner-outer-ring-v1'

function resolveArtworkFrameSteelSubstrateMapSize({
  heightPixels,
  widthPixels,
}: CreateArtworkFrameSteelEmptySubstrateMapsInput) {
  return {
    heightPixels: Math.max(1, Math.round(heightPixels)),
    widthPixels: Math.max(1, Math.round(widthPixels)),
  }
}

function createFloat32ChannelMaps<Channel extends string>(
  channels: readonly Channel[],
  length: number,
): Record<Channel, Float32Array> {
  return Object.fromEntries(
    channels.map((channel) => [
      channel,
      new Float32Array(length),
    ]),
  ) as Record<Channel, Float32Array>
}

export function createArtworkFrameSteelEmptySubstrateField(
  input: CreateArtworkFrameSteelEmptySubstrateMapsInput,
): ArtworkFrameSteelSubstrateField {
  const { heightPixels, widthPixels } =
    resolveArtworkFrameSteelSubstrateMapSize(input)

  return {
    fields: createFloat32ChannelMaps(
      ARTWORK_FRAME_STEEL_SUBSTRATE_FIELD_CHANNELS,
      widthPixels * heightPixels,
    ),
    heightPixels,
    widthPixels,
  }
}

export function createArtworkFrameSteelEmptySubstrateDerivedMaps(
  input: CreateArtworkFrameSteelEmptySubstrateMapsInput,
): ArtworkFrameSteelSubstrateDerivedMaps {
  const { heightPixels, widthPixels } =
    resolveArtworkFrameSteelSubstrateMapSize(input)
  const length = widthPixels * heightPixels

  return {
    ...createFloat32ChannelMaps(
      ARTWORK_FRAME_STEEL_SUBSTRATE_DERIVED_SCALAR_MAP_CHANNELS,
      length,
    ),
    heightPixels,
    steelSubstrateAlbedo: new Float32Array(length * 3),
    widthPixels,
  }
}

export function createArtworkFrameSteelEmptySubstrateNormalInputs(
  input: CreateArtworkFrameSteelEmptySubstrateMapsInput,
): ArtworkFrameSteelSubstrateNormalInputs {
  const { heightPixels, widthPixels } =
    resolveArtworkFrameSteelSubstrateMapSize(input)
  const length = widthPixels * heightPixels
  const normalZ = new Float32Array(length)

  normalZ.fill(1)

  return {
    heightPixels,
    normalStrength: 0,
    normalX: new Float32Array(length),
    normalY: new Float32Array(length),
    normalZ,
    substrateAnisotropy: new Float32Array(length),
    substrateAnisotropyDirectionX: new Float32Array(length),
    substrateAnisotropyDirectionY: new Float32Array(length),
    substrateHeight: new Float32Array(length),
    widthPixels,
  }
}

export function isSteelFinishArtworkFrameMetalType(
  metalType: AdditionalArtworkMetalType,
) {
  return metalType === 'steel' || metalType === 'blackIron'
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function getSteelDefectPhysicalContributionValue(
  defectDecalMaps: ArtworkFrameSteelDefectDecalMapSet | null | undefined,
  kind: ArtworkFrameSteelDefectKind,
  channel: ArtworkFrameSteelDefectPhysicalContributionChannel,
  index: number,
) {
  const value = defectDecalMaps?.physicalContributions[kind]?.[channel]?.[index]

  if (!Number.isFinite(value)) {
    return 0
  }

  return clampNumber(value ?? 0, 0, 1)
}

function getSteelDefectPhysicalContributionSum(
  defectDecalMaps: ArtworkFrameSteelDefectDecalMapSet | null | undefined,
  channel: ArtworkFrameSteelDefectPhysicalContributionChannel,
  index: number,
  weights: Partial<Record<ArtworkFrameSteelDefectKind, number>> = {},
) {
  let sum = 0

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    sum += getSteelDefectPhysicalContributionValue(
      defectDecalMaps,
      kind,
      channel,
      index,
    ) * (weights[kind] ?? 1)
  }

  return clampNumber(sum, 0, 1)
}

export function getArtworkFrameSteelFinishSelfShadowReceiver(
  steelFinishMaps: ArtworkFrameSteelFinishDerivedMaps,
  index: number,
) {
  const mask = (steelFinishMaps.steelMetalness[index] ?? 0) > 0 ? 1 : 0

  if (mask <= 0) {
    return 0
  }

  const defectSelfShadowReceiver = getSteelDefectPhysicalContributionSum(
    steelFinishMaps.defectDecalMaps,
    'selfShadowReceiver',
    index,
  )
  const machining = steelFinishMaps.machiningGrooveMask[index] ?? 0
  const roughness = steelFinishMaps.steelRoughness[index] ?? 0
  const machiningSelfShadowReceiver = machining * clampNumber(
    machining * 0.22 + roughness * 0.18,
    0,
    0.72,
  )
  const roughMicroSelfShadowReceiver =
    steelFinishMaps.stageUnits.roughDamaged *
    Math.max(0, -(steelFinishMaps.steelHeight[index] ?? 0)) *
    clampNumber(roughness * 0.92, 0, 0.72)

  return clampNumber(
    defectSelfShadowReceiver +
      machiningSelfShadowReceiver +
      roughMicroSelfShadowReceiver,
    0,
    1,
  )
}

function smoothStep(min: number, max: number, value: number) {
  if (min === max) {
    return value >= max ? 1 : 0
  }

  const unit = clampNumber((value - min) / (max - min), 0, 1)
  return unit * unit * (3 - 2 * unit)
}

function interpolate(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function getSteelFinishPolishResponseCurve(polishUnit: number) {
  const unit = clampNumber(polishUnit, 0, 1)
  const repairProgress = smoothStep(0.02, 1, unit)
  const earlyRepairProgress = smoothStep(0, 0.58, unit)
  const glossProgress = Math.pow(unit, 1.04)
  const roughnessProgress = Math.pow(unit, 1.08)
  const damageProgress = Math.pow(repairProgress, 0.76)
  const pocketProgress = Math.pow(repairProgress, 0.62)
  const darkDefectProgress = smoothStep(0.1, 0.58, unit)
  const polishedDefectProgress = smoothStep(0.58, 1, unit)
  const defectShadowResponse = interpolate(
    interpolate(1, 0.16, darkDefectProgress),
    0.04,
    polishedDefectProgress,
  )

  return {
    albedoLift: interpolate(-0.045, 0.145, Math.pow(unit, 1.08)),
    cloudRoughness: interpolate(0.16, 0.035, repairProgress),
    damageRoughness: interpolate(0.18, 0.035, repairProgress),
    damageVisibility: interpolate(1, 0.14, damageProgress),
    defectAo: interpolate(1, 0.16, damageProgress),
    defectDepth: interpolate(1, 0.17, damageProgress),
    defectShadowResponse,
    defectResponse: interpolate(1, 0.12, damageProgress),
    glossBase: interpolate(0.07, 0.91, glossProgress),
    glossCloudDamping: interpolate(0.26, 0.055, repairProgress),
    glossDamageDamping: interpolate(0.55, 0.12, repairProgress),
    grainDepth: interpolate(1, 0.16, Math.pow(repairProgress, 0.88)),
    pocketAo: interpolate(1, 0.1, pocketProgress),
    pocketDepth: interpolate(1, 0.09, pocketProgress),
    roughnessBase: interpolate(0.87, 0.12, roughnessProgress),
    roughnessFloor: interpolate(0.52, 0.045, Math.pow(unit, 1.12)),
    visiblePitResponse: interpolate(1, 0.1, Math.pow(earlyRepairProgress, 0.72)),
  }
}

const STEEL_HIGH_POLISH_SUBSTRATE_RESPONSE_ANCHORS: ReadonlyArray<
  ArtworkFrameSteelHighPolishSubstrateResponse & { polish: number }
> = [
  {
    aoStrength: 0.78,
    anisotropyStrength: 0.88,
    gloss: 0.42,
    grainVisibility: 1,
    hairlineVisibilityAllowance: 0.42,
    heightStrength: 0.72,
    luma: 0.54,
    normalStrength: 0.58,
    polish: 50,
    reflectionVeilStrength: 0.22,
    roughness: 0.58,
  },
  {
    aoStrength: 0.34,
    anisotropyStrength: 0.74,
    gloss: 0.7,
    grainVisibility: 0.58,
    hairlineVisibilityAllowance: 0.24,
    heightStrength: 0.32,
    luma: 0.67,
    normalStrength: 0.3,
    polish: 75,
    reflectionVeilStrength: 0.52,
    roughness: 0.31,
  },
  {
    aoStrength: 0.18,
    anisotropyStrength: 0.58,
    gloss: 0.84,
    grainVisibility: 0.32,
    hairlineVisibilityAllowance: 0.11,
    heightStrength: 0.16,
    luma: 0.75,
    normalStrength: 0.16,
    polish: 85,
    reflectionVeilStrength: 0.78,
    roughness: 0.18,
  },
  {
    aoStrength: 0.018,
    anisotropyStrength: 0.36,
    gloss: 0.96,
    grainVisibility: 0.07,
    hairlineVisibilityAllowance: 0.025,
    heightStrength: 0.045,
    luma: 0.86,
    normalStrength: 0.075,
    polish: 100,
    reflectionVeilStrength: 0.98,
    roughness: 0.075,
  },
]

export function getArtworkFrameSteelHighPolishSubstrateResponse(
  metalPolish: number,
): ArtworkFrameSteelHighPolishSubstrateResponse {
  const polish = clampNumber(metalPolish, 50, 100)
  let lower = STEEL_HIGH_POLISH_SUBSTRATE_RESPONSE_ANCHORS[0]
  let upper = STEEL_HIGH_POLISH_SUBSTRATE_RESPONSE_ANCHORS[
    STEEL_HIGH_POLISH_SUBSTRATE_RESPONSE_ANCHORS.length - 1
  ]

  for (
    let index = 1;
    index < STEEL_HIGH_POLISH_SUBSTRATE_RESPONSE_ANCHORS.length;
    index += 1
  ) {
    upper = STEEL_HIGH_POLISH_SUBSTRATE_RESPONSE_ANCHORS[index]

    if (polish <= upper.polish) {
      lower = STEEL_HIGH_POLISH_SUBSTRATE_RESPONSE_ANCHORS[index - 1]
      break
    }
  }

  const t = smoothStep(lower.polish, upper.polish, polish)

  return {
    aoStrength: interpolate(lower.aoStrength, upper.aoStrength, t),
    anisotropyStrength: interpolate(
      lower.anisotropyStrength,
      upper.anisotropyStrength,
      t,
    ),
    gloss: interpolate(lower.gloss, upper.gloss, t),
    grainVisibility: interpolate(
      lower.grainVisibility,
      upper.grainVisibility,
      t,
    ),
    hairlineVisibilityAllowance: interpolate(
      lower.hairlineVisibilityAllowance,
      upper.hairlineVisibilityAllowance,
      t,
    ),
    heightStrength: interpolate(lower.heightStrength, upper.heightStrength, t),
    luma: interpolate(lower.luma, upper.luma, t),
    normalStrength: interpolate(lower.normalStrength, upper.normalStrength, t),
    reflectionVeilStrength: interpolate(
      lower.reflectionVeilStrength,
      upper.reflectionVeilStrength,
      t,
    ),
    roughness: interpolate(lower.roughness, upper.roughness, t),
  }
}

function resolveSteelFinishLightVector({
  lightVector,
}: {
  lightVector: ArtworkFrameMaterialLightVector
}) {
  const fallback = resolveArtworkFrameMaterialLightVector(null)
  const source = resolveArtworkFrameMaterialLightVector(lightVector)
  const x = Number.isFinite(source.x) ? source.x : fallback.x
  const y = Number.isFinite(source.y) ? source.y : fallback.y
  const z = Number.isFinite(source.z) ? source.z : fallback.z
  const length = Math.hypot(x, y, z)

  if (length <= 0.000001) {
    return fallback
  }

  return {
    x: x / length,
    y: y / length,
    z: z / length,
  }
}

function hashString(value: string) {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

function hashUnit(seed: number, x: number, y = 0) {
  let hash = seed >>> 0
  hash ^= Math.imul(x + 0x9e3779b9, 0x85ebca6b)
  hash ^= Math.imul(y + 0xc2b2ae35, 0x27d4eb2f)
  hash ^= hash >>> 15
  hash = Math.imul(hash, 0x2c1b3c6d)
  hash ^= hash >>> 12
  hash = Math.imul(hash, 0x297a2d39)
  hash ^= hash >>> 15

  return (hash >>> 0) / 4294967295
}

function valueNoise2d(seed: number, x: number, y: number, frequency: number) {
  const scaledX = x * frequency
  const scaledY = y * frequency
  const ix = Math.floor(scaledX)
  const iy = Math.floor(scaledY)
  const fx = scaledX - ix
  const fy = scaledY - iy
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)
  const a = hashUnit(seed, ix, iy)
  const b = hashUnit(seed, ix + 1, iy)
  const c = hashUnit(seed, ix, iy + 1)
  const d = hashUnit(seed, ix + 1, iy + 1)

  return interpolate(interpolate(a, b, ux), interpolate(c, d, ux), uy)
}

function fractalNoise2d(seed: number, x: number, y: number) {
  const low = valueNoise2d(seed, x, y, 2.4)
  const mid = valueNoise2d(seed + 101, x, y, 6.8)
  const high = valueNoise2d(seed + 211, x, y, 18.5)

  return low * 0.5 + mid * 0.32 + high * 0.18
}

function cellularCenterField(seed: number, x: number, y: number, cells: number) {
  const scaledX = x * cells
  const scaledY = y * cells
  const cellX = Math.floor(scaledX)
  const cellY = Math.floor(scaledY)
  let nearestDistance = Number.POSITIVE_INFINITY

  for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      const nextCellX = cellX + offsetX
      const nextCellY = cellY + offsetY
      const pointX = nextCellX + 0.16 +
        hashUnit(seed, nextCellX, nextCellY) * 0.68
      const pointY = nextCellY + 0.16 +
        hashUnit(seed + 73, nextCellX, nextCellY) * 0.68
      const distance = Math.hypot(scaledX - pointX, scaledY - pointY)

      nearestDistance = Math.min(nearestDistance, distance)
    }
  }

  return 1 - smoothStep(0.015, 0.46, nearestDistance)
}

function formatMaterialKeyNumber(value: number) {
  return Number.isFinite(value) ? value.toFixed(3) : '0.000'
}

export function getArtworkFrameSteelPolishUnit(metalPolish: number) {
  return clampNumber(metalPolish / 100, 0, 1)
}

export function getArtworkFrameSteelPolishStageUnits(
  metalPolish: number,
): ArtworkFrameSteelPolishStageUnits {
  const unit = getArtworkFrameSteelPolishUnit(metalPolish)

  return {
    roughDamaged: 1 - smoothStep(0.10, 0.14, unit),
    scuffedLow: smoothStep(0.08, 0.12, unit) *
      (1 - smoothStep(0.28, 0.32, unit)),
    brushedBaseline: smoothStep(0.26, 0.30, unit) *
      (1 - smoothStep(0.56, 0.60, unit)),
    fineSatin: smoothStep(0.52, 0.56, unit) *
      (1 - smoothStep(0.74, 0.78, unit)),
    semiBright: smoothStep(0.70, 0.74, unit) *
      (1 - smoothStep(0.90, 0.94, unit)),
    nearMirror: smoothStep(0.86, 0.90, unit),
  }
}

function createSteelFinishGeometrySeedKey({
  frame,
  materialSeed,
}: {
  frame: ArtworkFrameSteelFinishFrameGeometrySettings
  materialSeed: ArtworkFrameMaterialSeed | null
}) {
  return [
    STEEL_FINISH_GEOMETRY_VERSION,
    materialSeed ? `material-seed:${materialSeed.key}` : 'material-seed:fallback-v1',
    `metal:${frame.metalType}`,
    `style:${frame.style}`,
    `shape:${frame.shape}`,
    STEEL_FINISH_CANONICAL_COORDINATES,
  ].join('|')
}

export function createArtworkFrameSteelSubstrateGeometrySeedKey({
  frame,
  materialSeed,
}: {
  frame: ArtworkFrameSteelFinishFrameGeometrySettings
  materialSeed: ArtworkFrameMaterialSeed | null
}) {
  return [
    STEEL_SUBSTRATE_GEOMETRY_VERSION,
    materialSeed ? `material-seed:${materialSeed.key}` : 'material-seed:fallback-v1',
    `metal:${frame.metalType}`,
    `style:${frame.style}`,
    `shape:${frame.shape}`,
    STEEL_SUBSTRATE_CANONICAL_COORDINATES,
    STEEL_SUBSTRATE_CANONICAL_RING_ANCHORS,
  ].join('|')
}

export function createArtworkFrameSteelSubstrateGeometrySeed({
  frame,
  materialSeed,
}: {
  frame: ArtworkFrameSteelFinishFrameGeometrySettings
  materialSeed: ArtworkFrameMaterialSeed | null
}) {
  return hashString(createArtworkFrameSteelSubstrateGeometrySeedKey({
    frame,
    materialSeed,
  }))
}

export function createArtworkFrameSteelFinishFieldRequest({
  bounds,
  frame,
  materialSeed = null,
  samplingBounds,
  strokeWidth,
  textureSize,
}: {
  bounds: ArtworkFrameRect
  frame: ArtworkFrameSteelFinishFrameInput
  materialSeed?: ArtworkFrameMaterialSeed | null
  samplingBounds: ArtworkFrameRect
  strokeWidth: number
  textureSize: ArtworkFrameSteelFinishTextureSizeInput
}): ArtworkFrameSteelFinishFieldRequest | null {
  if (
    frame.style !== 'metal' ||
    !isSteelFinishArtworkFrameMetalType(frame.metalType)
  ) {
    return null
  }

  const polishUnit = getArtworkFrameSteelPolishUnit(frame.metalPolish)
  const tarnishUnit = clampNumber(frame.metalTarnish / 100, 0, 1)
  const geometryInputs = {
    metalType: frame.metalType,
    shape: frame.shape,
    style: frame.style,
  }
  const geometrySeedKey = createSteelFinishGeometrySeedKey({
    frame: geometryInputs,
    materialSeed,
  })
  const substrateGeometrySeedKey =
    createArtworkFrameSteelSubstrateGeometrySeedKey({
      frame: geometryInputs,
      materialSeed,
    })

  return {
    bounds,
    brushAngleDegrees: frame.metalBrushAngle,
    fieldSize: {
      height: Math.max(1, Math.round(textureSize.height)),
      width: Math.max(1, Math.round(textureSize.width)),
    },
    geometryInputs,
    geometrySeed: hashString(geometrySeedKey),
    geometrySeedKey,
    materialSeed,
    polishUnit,
    responseInputs: {
      metalBrushAngle: frame.metalBrushAngle,
      metalPolish: frame.metalPolish,
      metalTarnish: frame.metalTarnish,
    },
    samplingBounds,
    stageUnits: getArtworkFrameSteelPolishStageUnits(frame.metalPolish),
    strokeWidth,
    substrateGeometrySeed: hashString(substrateGeometrySeedKey),
    substrateGeometrySeedKey,
    tarnishUnit,
  }
}

export function getArtworkFrameSteelFinishFieldRequestKey(
  request: ArtworkFrameSteelFinishFieldRequest,
) {
  const stageKey = ARTWORK_FRAME_STEEL_POLISH_STAGE_KEYS.map((stage) =>
    `${stage}:${formatMaterialKeyNumber(request.stageUnits[stage])}`
  ).join(',')

  return [
    request.geometrySeedKey,
    request.geometrySeed.toString(36),
    formatMaterialKeyNumber(request.polishUnit),
    formatMaterialKeyNumber(request.tarnishUnit),
    formatMaterialKeyNumber(request.brushAngleDegrees),
    request.fieldSize.width,
    request.fieldSize.height,
    formatMaterialKeyNumber(request.strokeWidth),
    stageKey,
  ].join('|')
}

export function getArtworkFrameSteelFinishSampleCoordinates(
  request: Pick<
    ArtworkFrameSteelFinishFieldRequest,
    'bounds' | 'fieldSize' | 'samplingBounds'
  >,
  x: number,
  y: number,
) {
  const sampleXUnit = request.fieldSize.width <= 1
    ? 0
    : x / (request.fieldSize.width - 1)
  const sampleYUnit = request.fieldSize.height <= 1
    ? 0
    : y / (request.fieldSize.height - 1)
  const sampleX = request.samplingBounds.x +
    request.samplingBounds.width * sampleXUnit
  const sampleY = request.samplingBounds.y +
    request.samplingBounds.height * sampleYUnit
  const xUnit = (sampleX - request.bounds.x) /
    Math.max(1, request.bounds.width)
  const yUnit = (sampleY - request.bounds.y) /
    Math.max(1, request.bounds.height)

  return {
    hashX: Math.round(xUnit * STEEL_FINISH_GEOMETRY_STABLE_HASH_GRID),
    hashY: Math.round(yUnit * STEEL_FINISH_GEOMETRY_STABLE_HASH_GRID),
    sampleX,
    sampleY,
    xUnit,
    yUnit,
  }
}

function getRectangleRingMask(
  request: ArtworkFrameSteelFinishFieldRequest,
  xUnit: number,
  yUnit: number,
) {
  const { innerInset, outerInset } = getMetalArtworkFrameEdgeInsets(
    request.strokeWidth,
  )
  const outerInsetX = outerInset / Math.max(1, request.bounds.width)
  const outerInsetY = outerInset / Math.max(1, request.bounds.height)
  const innerInsetX = innerInset / Math.max(1, request.bounds.width)
  const innerInsetY = innerInset / Math.max(1, request.bounds.height)
  const isInsideOuter =
    xUnit >= outerInsetX &&
    xUnit <= 1 - outerInsetX &&
    yUnit >= outerInsetY &&
    yUnit <= 1 - outerInsetY
  const isInsideOpening =
    xUnit > innerInsetX &&
    xUnit < 1 - innerInsetX &&
    yUnit > innerInsetY &&
    yUnit < 1 - innerInsetY

  return isInsideOuter && !isInsideOpening
    ? 1
    : 0
}

function getCircleRingMask(
  request: ArtworkFrameSteelFinishFieldRequest,
  xUnit: number,
  yUnit: number,
) {
  const { innerInset, outerInset } = getMetalArtworkFrameEdgeInsets(
    request.strokeWidth,
  )
  const outerRadiusX = Math.max(
    0.001,
    0.5 - outerInset / Math.max(1, request.bounds.width),
  )
  const outerRadiusY = Math.max(
    0.001,
    0.5 - outerInset / Math.max(1, request.bounds.height),
  )
  const innerRadiusX = Math.max(
    0,
    0.5 - innerInset / Math.max(1, request.bounds.width),
  )
  const innerRadiusY = Math.max(
    0,
    0.5 - innerInset / Math.max(1, request.bounds.height),
  )
  const centeredX = xUnit - 0.5
  const centeredY = yUnit - 0.5
  const outerMetric =
    (centeredX * centeredX) / (outerRadiusX * outerRadiusX) +
    (centeredY * centeredY) / (outerRadiusY * outerRadiusY)
  const innerMetric = innerRadiusX > 0 && innerRadiusY > 0
    ? (centeredX * centeredX) / (innerRadiusX * innerRadiusX) +
      (centeredY * centeredY) / (innerRadiusY * innerRadiusY)
    : Number.POSITIVE_INFINITY

  return outerMetric <= 1 && innerMetric >= 1 ? 1 : 0
}

function getSteelFinishRingMask(
  request: ArtworkFrameSteelFinishFieldRequest,
  xUnit: number,
  yUnit: number,
) {
  return request.geometryInputs.shape === 'circle'
    ? getCircleRingMask(request, xUnit, yUnit)
    : getRectangleRingMask(request, xUnit, yUnit)
}

function getDirectionalLineCandidate(
  seed: number,
  xUnit: number,
  yUnit: number,
  angleRadians: number,
  frequency: number,
  width: number,
) {
  const along = xUnit * Math.cos(angleRadians) + yUnit * Math.sin(angleRadians)
  const across = -xUnit * Math.sin(angleRadians) + yUnit * Math.cos(angleRadians)
  const jitter = valueNoise2d(seed, along * 0.9, across * 1.7, 5.5) * 0.38
  const centerDistance = Math.abs((across * frequency + jitter) % 1 - 0.5)
  const strand = 1 - smoothStep(width, width * 3.8, centerDistance)
  const breakup = smoothStep(
    0.2,
    0.82,
    valueNoise2d(seed + 47, along, across, 23),
  )

  return clampNumber(strand * (0.42 + breakup * 0.58), 0, 1)
}

export function buildArtworkFrameSteelFinishField(
  request: ArtworkFrameSteelFinishFieldRequest,
): ArtworkFrameSteelFinishField {
  const length = request.fieldSize.width * request.fieldSize.height
  const abrasionDirectionX = new Float32Array(length)
  const abrasionDirectionY = new Float32Array(length)
  const machiningGrooveField = new Float32Array(length)
  const scratchCandidateField = new Float32Array(length)
  const gougeCandidateField = new Float32Array(length)
  const dentPocketField = new Float32Array(length)
  const pitPocketField = new Float32Array(length)
  const scuffCrossScratchField = new Float32Array(length)
  const cloudAbrasionField = new Float32Array(length)
  const buffingReflectionField = new Float32Array(length)
  const protectionVisibilityField = new Float32Array(length)
  const frameMask = new Float32Array(length)
  const seed = request.geometrySeed
  const brushAngle = request.brushAngleDegrees * Math.PI / 180

  for (let y = 0; y < request.fieldSize.height; y += 1) {
    for (let x = 0; x < request.fieldSize.width; x += 1) {
      const { xUnit, yUnit } = getArtworkFrameSteelFinishSampleCoordinates(
        request,
        x,
        y,
      )
      const index = y * request.fieldSize.width + x
      const mask = getSteelFinishRingMask(request, xUnit, yUnit)
      const waviness = fractalNoise2d(seed + 101, xUnit * 1.2, yUnit * 1.2) -
        0.5
      const localWaviness = waviness * 0.22
      const directionAngle = brushAngle + localWaviness
      const alongBrush = xUnit * Math.cos(directionAngle) +
        yUnit * Math.sin(directionAngle)
      const acrossBrush = -xUnit * Math.sin(directionAngle) +
        yUnit * Math.cos(directionAngle)
      const machiningBands = getDirectionalLineCandidate(
        seed + 211,
        xUnit,
        yUnit,
        directionAngle,
        76,
        0.018,
      )
      const fineGrooves = getDirectionalLineCandidate(
        seed + 307,
        xUnit + waviness * 0.012,
        yUnit,
        directionAngle + waviness * 0.08,
        142,
        0.008,
      )
      const scratchPrimary = getDirectionalLineCandidate(
        seed + 401,
        xUnit,
        yUnit,
        -0.16,
        24,
        0.011,
      )
      const scratchCross = getDirectionalLineCandidate(
        seed + 503,
        xUnit,
        yUnit,
        1.34,
        19,
        0.009,
      )
      const scuffCrossScratch = getDirectionalLineCandidate(
        seed + 523,
        xUnit,
        yUnit,
        1.43 + waviness * 0.05,
        18,
        0.0105,
      )
      const scuffCrossScratchBreakup = smoothStep(
        0.38,
        0.84,
        valueNoise2d(seed + 541, xUnit * 0.88, yUnit * 1.12, 17),
      )
      const scratchPopulation = smoothStep(
        0.44,
        0.92,
        fractalNoise2d(seed + 607, xUnit * 1.7, yUnit * 1.7),
      )
      const gougeLines = getDirectionalLineCandidate(
        seed + 701,
        xUnit,
        yUnit,
        -0.44,
        9,
        0.018,
      )
      const gougePopulation = smoothStep(
        0.66,
        0.96,
        valueNoise2d(seed + 809, xUnit, yUnit, 11),
      )
      const dents = cellularCenterField(seed + 907, xUnit, yUnit, 18)
      const dentBreakup = smoothStep(
        0.45,
        0.9,
        valueNoise2d(seed + 1009, xUnit, yUnit, 34),
      )
      const pits = Math.max(
        cellularCenterField(seed + 1103, xUnit, yUnit, 34) * 0.76,
        cellularCenterField(seed + 1201, xUnit, yUnit, 58) * 0.38,
      )
      const cloud = smoothStep(
        0.28,
        0.88,
        fractalNoise2d(seed + 1301, xUnit * 0.82, yUnit * 0.82),
      )
      const reflectionBands = clampNumber(
        (1 - smoothStep(
          0.18,
          0.48,
          Math.abs((alongBrush * 3.8 +
            valueNoise2d(seed + 1409, alongBrush, acrossBrush, 3) * 0.36) % 1 -
            0.5),
        )) * 0.6 +
          valueNoise2d(seed + 1511, alongBrush, acrossBrush, 4.4) * 0.4,
        0,
        1,
      )
      const protection = smoothStep(
        0.5,
        0.86,
        fractalNoise2d(seed + 1601, xUnit * 0.92, yUnit * 0.92),
      )

      frameMask[index] = mask
      abrasionDirectionX[index] = mask > 0 ? Math.cos(localWaviness) : 0
      abrasionDirectionY[index] = mask > 0 ? Math.sin(localWaviness) : 0
      machiningGrooveField[index] = clampNumber(
        machiningBands * 0.72 + fineGrooves * 0.38,
        0,
        1,
      ) * mask
      scratchCandidateField[index] = clampNumber(
        Math.max(scratchPrimary, scratchCross * 0.72) * scratchPopulation,
        0,
        1,
      ) * mask
      gougeCandidateField[index] = clampNumber(
        gougeLines * gougePopulation,
        0,
        1,
      ) * mask
      dentPocketField[index] = clampNumber(dents * dentBreakup, 0, 1) * mask
      pitPocketField[index] = clampNumber(pits, 0, 1) * mask
      scuffCrossScratchField[index] = clampNumber(
        scuffCrossScratch * scuffCrossScratchBreakup,
        0,
        1,
      ) * mask
      cloudAbrasionField[index] = cloud * mask
      buffingReflectionField[index] = reflectionBands * mask
      protectionVisibilityField[index] = protection * mask
    }
  }

  return {
    ...request,
    fields: {
      abrasionDirectionX,
      abrasionDirectionY,
      buffingReflectionField,
      cloudAbrasionField,
      dentPocketField,
      frameMask,
      gougeCandidateField,
      machiningGrooveField,
      pitPocketField,
      protectionVisibilityField,
      scuffCrossScratchField,
      scratchCandidateField,
    },
  }
}

export function buildArtworkFrameSteelSubstrateField(
  request: ArtworkFrameSteelFinishFieldRequest,
): ArtworkFrameSteelSubstrateField {
  const length = request.fieldSize.width * request.fieldSize.height
  const fields = createFloat32ChannelMaps(
    ARTWORK_FRAME_STEEL_SUBSTRATE_FIELD_CHANNELS,
    length,
  )
  const seed = request.substrateGeometrySeed
  const brushAngle = request.brushAngleDegrees * Math.PI / 180

  for (let y = 0; y < request.fieldSize.height; y += 1) {
    for (let x = 0; x < request.fieldSize.width; x += 1) {
      const { xUnit, yUnit } = getArtworkFrameSteelFinishSampleCoordinates(
        request,
        x,
        y,
      )
      const index = y * request.fieldSize.width + x
      const mask = getSteelFinishRingMask(request, xUnit, yUnit)

      if (mask <= 0) {
        continue
      }

      const broadWarp = fractalNoise2d(seed + 41, xUnit * 1.05, yUnit * 1.05) -
        0.5
      const localWaviness = (
        valueNoise2d(seed + 73, xUnit * 1.3, yUnit * 1.3, 8.5) - 0.5
      ) * 0.18 + broadWarp * 0.12
      const directionAngle = brushAngle + localWaviness
      const directionX = Math.cos(directionAngle)
      const directionY = Math.sin(directionAngle)
      const along = xUnit * directionX + yUnit * directionY
      const across = -xUnit * directionY + yUnit * directionX
      const spacingWarp = (
        valueNoise2d(seed + 109, along * 0.35, across * 1.7, 6.5) - 0.5
      ) * 0.018 + broadWarp * 0.006
      const strandPrimary = getDirectionalLineCandidate(
        seed + 149,
        xUnit + spacingWarp * directionY,
        yUnit - spacingWarp * directionX,
        directionAngle,
        240,
        0.0048,
      )
      const strandSecondary = getDirectionalLineCandidate(
        seed + 191,
        xUnit - spacingWarp * 0.6 * directionY,
        yUnit + spacingWarp * 0.6 * directionX,
        directionAngle + localWaviness * 0.24,
        390,
        0.0026,
      )
      const strandBreaks = smoothStep(
        0.18,
        0.76,
        valueNoise2d(seed + 227, along * 1.4, across * 0.38, 28),
      )
      const microStrands = clampNumber(
        (strandPrimary * 0.7 + strandSecondary * 0.45) *
          (0.42 + strandBreaks * 0.58),
        0,
        1,
      )
      const strandGaps = smoothStep(
        0.24,
        0.82,
        valueNoise2d(seed + 271, along * 0.7, across * 0.6, 13),
      )
      const continuity = clampNumber(
        (0.26 + strandBreaks * 0.5 + strandGaps * 0.24) *
          (1 - Math.max(0, broadWarp) * 0.18),
        0,
        1,
      )
      const plateHaze = clampNumber(
        fractalNoise2d(seed + 313, xUnit * 0.55, yUnit * 0.55) * 0.64 +
          valueNoise2d(seed + 337, xUnit, yUnit, 2.2) * 0.36,
        0,
        1,
      )
      const broadInclusionDrift = (
        valueNoise2d(seed + 373, xUnit * 0.64, yUnit * 0.64, 3.2) -
        0.5
      ) * 0.08
      const inclusionNoise = clampNumber(
        fractalNoise2d(
          seed + 397,
          xUnit * 0.48 + broadInclusionDrift,
          yUnit * 0.48 - broadInclusionDrift,
        ) * 0.58 +
          valueNoise2d(seed + 421, xUnit * 0.5, yUnit * 0.5, 4.1) * 0.42,
        0,
        1,
      )
      const reflectionVeil = clampNumber(
        (1 - smoothStep(
          0.18,
          0.58,
          Math.abs(
            (
              along * 1.18 +
              valueNoise2d(seed + 467, along * 0.26, across * 0.18, 1.7) *
                0.18
            ) % 1 - 0.5,
          ),
        )) * 0.74 +
          valueNoise2d(seed + 491, xUnit * 0.32, yUnit * 0.32, 1.6) * 0.26,
        0,
        1,
      )
      const roughnessVariation = clampNumber(
        microStrands * 0.38 +
          (1 - continuity) * 0.22 +
          plateHaze * 0.32 +
          Math.abs(broadWarp) * 0.18,
        0,
        1,
      )
      const heightVariation = clampNumber(
        microStrands * 0.08 +
          plateHaze * 0.3 +
          (continuity - 0.5) * 0.14 +
          Math.abs(broadWarp) * 0.06 +
          0.24,
        0,
        1,
      )
      const anisotropyAspect = clampNumber(
        0.42 +
          continuity * 0.28 +
          microStrands * 0.18 +
          reflectionVeil * 0.1 -
          plateHaze * 0.04,
        0,
        1,
      )

      fields.substrateLayDirectionX[index] = directionX
      fields.substrateLayDirectionY[index] = directionY
      fields.substrateMicroStrandMask[index] = microStrands
      fields.substrateGrainContinuity[index] = continuity
      fields.substratePlateHaze[index] = plateHaze
      fields.substrateInclusionNoise[index] = inclusionNoise
      fields.substrateReflectionVeil[index] = reflectionVeil
      fields.substrateRoughnessVariation[index] = roughnessVariation
      fields.substrateHeightVariation[index] = heightVariation
      fields.substrateAnisotropyAspect[index] = anisotropyAspect
    }
  }

  return {
    fields,
    heightPixels: request.fieldSize.height,
    widthPixels: request.fieldSize.width,
  }
}

export function buildArtworkFrameSteelSubstrateDerivedMaps(
  field: ArtworkFrameSteelFinishField,
  substrateField: ArtworkFrameSteelSubstrateField =
    buildArtworkFrameSteelSubstrateField(field),
): ArtworkFrameSteelSubstrateDerivedMaps {
  if (
    substrateField.widthPixels !== field.fieldSize.width ||
    substrateField.heightPixels !== field.fieldSize.height
  ) {
    throw new Error(
      `steel substrate field dimensions ${substrateField.widthPixels}x${substrateField.heightPixels} do not match finish field ${field.fieldSize.width}x${field.fieldSize.height}`,
    )
  }

  const maps = createArtworkFrameSteelEmptySubstrateDerivedMaps({
    heightPixels: field.fieldSize.height,
    widthPixels: field.fieldSize.width,
  })
  const length = field.fieldSize.width * field.fieldSize.height
  const polishUnit = clampNumber(field.polishUnit, 0, 1)
  const polishProgress = smoothStep(0, 1, polishUnit)
  const highPolishResponse =
    getArtworkFrameSteelHighPolishSubstrateResponse(polishUnit * 100)
  const highPolishBlend = smoothStep(0.62, 0.79, polishUnit)
  const highPolishGlossBlend = smoothStep(0.72, 0.84, polishUnit)
  const rawBrushedBaselineResponse = smoothStep(0.42, 0.5, polishUnit) *
    (1 - smoothStep(0.54, 0.66, polishUnit))
  const satinBrushedEndpointResponse = smoothStep(0.66, 0.75, polishUnit) *
    (1 - smoothStep(0.78, 0.86, polishUnit))
  const semiBrightEndpointResponse = smoothStep(0.78, 0.85, polishUnit) *
    (1 - smoothStep(0.88, 0.96, polishUnit))
  const nearMirrorEndpointResponse = smoothStep(0.88, 1, polishUnit)
  const darkMetal = field.geometryInputs.metalType === 'blackIron'
  const rawAlbedoBase = darkMetal
    ? interpolate(0.2, 0.34, Math.pow(polishProgress, 1.02))
    : interpolate(0.42, 0.74, Math.pow(polishProgress, 1.04))
  const roughSubstrateDullness =
    (1 - smoothStep(0, 0.26, polishUnit)) * (darkMetal ? 0.005 : 0.008)
  const highPolishAlbedoBase = darkMetal
    ? highPolishResponse.luma * 0.52
    : highPolishResponse.luma
  const albedoBase = clampNumber(
    interpolate(
      rawAlbedoBase - roughSubstrateDullness,
      highPolishAlbedoBase,
      highPolishBlend,
    ) - rawBrushedBaselineResponse * (darkMetal ? 0.014 : 0.034),
    0,
    1,
  )
  const legacyHeightScale = interpolate(
    0.055,
    0.006,
    Math.pow(polishProgress, 0.76),
  )
  const highPolishHeightScale =
    0.0048 + highPolishResponse.heightStrength * 0.0305
  const heightScale = interpolate(
    legacyHeightScale,
    highPolishHeightScale,
    highPolishBlend,
  )
  const legacyAmbientOcclusionScale = interpolate(
    0.16,
    0.018,
    Math.pow(polishProgress, 0.9),
  )
  const legacyHighPolishAmbientOcclusionScale = interpolate(
    1,
    0.08,
    smoothStep(0.72, 1, polishUnit),
  )
  const highPolishAmbientOcclusionScale =
    highPolishResponse.aoStrength * (darkMetal ? 0.085 : 0.1)
  const ambientOcclusionScale = interpolate(
    legacyAmbientOcclusionScale * legacyHighPolishAmbientOcclusionScale,
    highPolishAmbientOcclusionScale,
    highPolishBlend,
  )
  const legacyRoughnessBase = interpolate(
    darkMetal ? 0.94 : 0.9,
    darkMetal ? 0.2 : 0.12,
    Math.pow(polishProgress, 1.04),
  )
  const highPolishRoughnessBase = darkMetal
    ? clampNumber(highPolishResponse.roughness + 0.09, 0, 1)
    : clampNumber(highPolishResponse.roughness + 0.055, 0, 1)
  const roughnessBase = interpolate(
    legacyRoughnessBase,
    highPolishRoughnessBase,
    highPolishBlend,
  ) -
    semiBrightEndpointResponse * (darkMetal ? 0.004 : 0.012) -
    nearMirrorEndpointResponse * (darkMetal ? 0.004 : 0.01)
  const legacyRoughnessVariationScale = interpolate(
    0.22,
    0.045,
    Math.pow(polishProgress, 0.88),
  )
  const highPolishRoughnessVariationScale =
    0.006 + highPolishResponse.grainVisibility * 0.105
  const roughnessVariationScale = interpolate(
    legacyRoughnessVariationScale,
    highPolishRoughnessVariationScale,
    highPolishBlend,
  )
  const legacyGlossBase = interpolate(
    darkMetal ? 0.035 : 0.055,
    darkMetal ? 0.62 : 0.91,
    Math.pow(polishProgress, 1.55),
  )
  const highPolishGlossBase = darkMetal
    ? highPolishResponse.gloss * 0.72
    : highPolishResponse.gloss
  const glossBase = interpolate(
    legacyGlossBase,
    highPolishGlossBase,
    highPolishGlossBlend,
  )
  const legacyGlossVeilScale = interpolate(
    0.018,
    darkMetal ? 0.12 : 0.18,
    Math.pow(polishProgress, 1.5),
  )
  const highPolishGlossVeilScale =
    highPolishResponse.reflectionVeilStrength * (darkMetal ? 0.12 : 0.18) +
    (darkMetal ? 0.025 : 0.05)
  const glossVeilScale = interpolate(
    legacyGlossVeilScale,
    highPolishGlossVeilScale,
    highPolishGlossBlend,
  ) *
    (1 + semiBrightEndpointResponse * (darkMetal ? 0.06 : 0.14)) *
    (1 + nearMirrorEndpointResponse * (darkMetal ? 0.08 : 0.16))
  const legacyAnisotropyPolishResponse = smoothStep(0.18, 0.58, polishUnit) *
    (1 - smoothStep(0.88, 1, polishUnit) * 0.16)
  const anisotropyPolishResponse = interpolate(
    legacyAnisotropyPolishResponse,
    highPolishResponse.anisotropyStrength,
    highPolishBlend,
  )
  const legacyNormalBase = interpolate(
    0.58,
    0.08,
    Math.pow(polishProgress, 0.82),
  )
  const highPolishNormalBase = highPolishResponse.normalStrength * 0.52
  const normalBase = interpolate(
    legacyNormalBase,
    highPolishNormalBase,
    highPolishBlend,
  ) *
    (1 + rawBrushedBaselineResponse * 0.16) *
    (1 - satinBrushedEndpointResponse * 0.22) *
    (1 - semiBrightEndpointResponse * 0.12) *
    (1 - nearMirrorEndpointResponse * 0.55)
  const grainVisibility = interpolate(
    1,
    highPolishResponse.grainVisibility,
    highPolishBlend,
  ) *
    (1 - satinBrushedEndpointResponse * 0.18) *
    (1 + semiBrightEndpointResponse * 0.08) *
    (1 - nearMirrorEndpointResponse * 0.18)
  const rawBrushedStrandResponse = 1 + rawBrushedBaselineResponse * 0.38
  for (let index = 0; index < length; index += 1) {
    const mask = field.fields.frameMask[index] ?? 0

    if (mask <= 0) {
      continue
    }

    const layX = substrateField.fields.substrateLayDirectionX[index] ?? 0
    const layY = substrateField.fields.substrateLayDirectionY[index] ?? 0
    const microStrands =
      (substrateField.fields.substrateMicroStrandMask[index] ?? 0) * mask
    const continuity =
      (substrateField.fields.substrateGrainContinuity[index] ?? 0) * mask
    const plateHaze =
      (substrateField.fields.substratePlateHaze[index] ?? 0) * mask
    const inclusionNoise =
      (substrateField.fields.substrateInclusionNoise[index] ?? 0) * mask
    const reflectionVeil =
      (substrateField.fields.substrateReflectionVeil[index] ?? 0) * mask
    const roughnessVariation =
      (substrateField.fields.substrateRoughnessVariation[index] ?? 0) * mask
    const heightVariation =
      (substrateField.fields.substrateHeightVariation[index] ?? 0) * mask
    const anisotropyAspect =
      (substrateField.fields.substrateAnisotropyAspect[index] ?? 0) * mask
    let continuousNormalEnvelopeSum = 0
    let continuousNormalEnvelopeWeight = 0

    for (let yOffset = -2; yOffset <= 2; yOffset += 1) {
      for (let xOffset = -2; xOffset <= 2; xOffset += 1) {
        const neighborX = index % field.fieldSize.width + xOffset
        const neighborY = Math.floor(index / field.fieldSize.width) + yOffset

        if (
          neighborX < 0 ||
          neighborX >= field.fieldSize.width ||
          neighborY < 0 ||
          neighborY >= field.fieldSize.height
        ) {
          continue
        }

        const neighborIndex = neighborY * field.fieldSize.width + neighborX
        const neighborMask = field.fields.frameMask[neighborIndex] ?? 0

        if (neighborMask <= 0) {
          continue
        }

        const neighborPlateHaze =
          substrateField.fields.substratePlateHaze[neighborIndex] ?? 0
        const neighborContinuity =
          substrateField.fields.substrateGrainContinuity[neighborIndex] ?? 0
        const neighborRoughnessVariation =
          substrateField.fields.substrateRoughnessVariation[neighborIndex] ?? 0
        const neighborDistance = Math.hypot(xOffset, yOffset)
        const neighborWeight = neighborDistance === 0
          ? 1
          : neighborDistance <= Math.SQRT2
            ? 0.78
            : neighborDistance <= 2
              ? 0.52
              : 0.26
        const neighborEnvelope = clampNumber(
          0.32 +
            neighborPlateHaze * 0.2 +
            (1 - neighborContinuity) * 0.07 * grainVisibility +
            neighborRoughnessVariation * 0.06,
          0,
          1,
        )

        continuousNormalEnvelopeSum += neighborEnvelope * neighborWeight
        continuousNormalEnvelopeWeight += neighborWeight
      }
    }

    const continuousNormalEnvelope =
      continuousNormalEnvelopeSum / Math.max(1, continuousNormalEnvelopeWeight)
    const height = (
      (heightVariation - 0.5) * interpolate(0.52, 0.34, highPolishBlend) +
      (microStrands - 0.3) *
        0.06 *
        grainVisibility *
        rawBrushedStrandResponse +
      (plateHaze - 0.5) * 0.18 +
      (continuity - 0.5) * 0.08 * grainVisibility
    ) *
      heightScale *
      (1 - satinBrushedEndpointResponse * 0.16) *
      (1 - semiBrightEndpointResponse * 0.12) *
      (1 - nearMirrorEndpointResponse * 0.62) *
      mask
    const broadOcclusionTexture = clampNumber(
      (1 - continuity) * 0.16 +
        Math.max(0, plateHaze - 0.44) * 0.54,
      0,
      1,
    )
    const ambientOcclusion = clampNumber(
      (
        broadOcclusionTexture * 0.64 +
        clampNumber(
          -height / Math.max(0.0001, heightScale),
          0,
          1,
        ) * 0.08
      ) * ambientOcclusionScale * highPolishAmbientOcclusionScale,
      0,
      1,
    ) *
      (1 - satinBrushedEndpointResponse * 0.32) *
      (1 - semiBrightEndpointResponse * 0.18) *
      (1 - nearMirrorEndpointResponse * 0.42) *
      mask +
      nearMirrorEndpointResponse * (0.0000012 + plateHaze * 0.0000008) * mask
    const roughness = clampNumber(
      roughnessBase +
        roughnessVariation * roughnessVariationScale +
        (1 - continuity) * 0.035 * grainVisibility -
        reflectionVeil * glossVeilScale * 0.35 +
        rawBrushedBaselineResponse *
          (
            microStrands * 0.026 +
            (1 - continuity) * 0.018
          ) -
        satinBrushedEndpointResponse * 0.018,
      0,
      1,
    ) * mask
    const satinGlossDamping =
      smoothStep(0.58, 0.7, polishUnit) * (darkMetal ? 0.015 : 0.024)
    const semiBrightGlossDamping =
      smoothStep(0.76, 0.88, polishUnit) *
      interpolate(
        darkMetal ? 0.035 : 0.075,
        darkMetal ? 0.026 : 0.048,
        smoothStep(0.94, 1, polishUnit),
      )
    const gloss = clampNumber(
      glossBase +
        reflectionVeil * glossVeilScale +
        reflectionVeil * rawBrushedBaselineResponse * 0.025 +
        continuity * 0.025 * polishProgress * grainVisibility -
        roughnessVariation * 0.08 * (1 - polishProgress) -
        roughnessVariation * rawBrushedBaselineResponse * 0.012 -
        satinBrushedEndpointResponse * 0.042 -
        semiBrightEndpointResponse * 0.018 -
        nearMirrorEndpointResponse * 0.01 -
        ambientOcclusion * 0.2 -
        satinGlossDamping -
        semiBrightGlossDamping,
      0,
      1,
    ) * mask
    const anisotropy = clampNumber(
      interpolate(0.14, 0.2, highPolishBlend) +
        anisotropyPolishResponse * 0.44 +
        anisotropyAspect * 0.24 * grainVisibility +
        continuity * 0.12 * grainVisibility -
        satinBrushedEndpointResponse * 0.035,
      0,
      1,
    ) * mask
    const alongRoughness = clampNumber(
      roughness * (1 - anisotropy * 0.22),
      0,
      1,
    ) * mask
    const crossRoughness = clampNumber(
      roughness * (1 + anisotropy * 0.32),
      0,
      1,
    ) * mask
    const normalStrength = clampNumber(
      normalBase * continuousNormalEnvelope,
      0,
      1,
    ) * mask
    const luma = clampNumber(
      albedoBase +
        plateHaze * interpolate(0.025, 0.045, polishProgress) +
        reflectionVeil * interpolate(0.02, 0.11, polishProgress) -
        rawBrushedBaselineResponse *
          (
            roughnessVariation * 0.012 +
            (1 - continuity) * 0.01
          ) +
        reflectionVeil * rawBrushedBaselineResponse * 0.018 -
        satinBrushedEndpointResponse * 0.006 +
        reflectionVeil * satinBrushedEndpointResponse * 0.014 -
        semiBrightEndpointResponse * 0.004 +
        reflectionVeil * semiBrightEndpointResponse * 0.026 -
        roughnessVariation * nearMirrorEndpointResponse * 0.008 +
        reflectionVeil * nearMirrorEndpointResponse * 0.026 -
        roughnessVariation *
          interpolate(0.06, 0.018, polishProgress) *
          interpolate(1, 0.28, highPolishBlend) -
        ambientOcclusion * interpolate(0.7, 0.42, polishProgress),
      0,
      1,
    ) * mask
    const albedoIndex = index * 3

    maps.steelSubstrateLayDirectionX[index] = layX * mask
    maps.steelSubstrateLayDirectionY[index] = layY * mask
    maps.steelSubstrateMicroStrandMask[index] = microStrands
    maps.steelSubstrateGrainContinuity[index] = continuity
    maps.steelSubstratePlateHaze[index] = plateHaze
    maps.steelSubstrateInclusionNoise[index] = inclusionNoise
    maps.steelSubstrateReflectionVeil[index] = reflectionVeil
    maps.steelSubstrateHeight[index] = height
    maps.steelSubstrateAmbientOcclusion[index] = ambientOcclusion
    maps.steelSubstrateRoughness[index] = roughness
    maps.steelSubstrateGloss[index] = gloss
    maps.steelSubstrateAnisotropy[index] = anisotropy
    maps.steelSubstrateAnisotropyDirectionX[index] = layX * mask
    maps.steelSubstrateAnisotropyDirectionY[index] = layY * mask
    maps.steelSubstrateAlongRoughness[index] = alongRoughness
    maps.steelSubstrateCrossRoughness[index] = crossRoughness
    maps.steelSubstrateNormalStrength[index] = normalStrength
    maps.steelSubstrateAlbedo[albedoIndex] = luma * (darkMetal ? 0.9 : 0.92)
    maps.steelSubstrateAlbedo[albedoIndex + 1] =
      luma * (darkMetal ? 0.95 : 0.97)
    maps.steelSubstrateAlbedo[albedoIndex + 2] = luma
  }

  return maps
}

function sharpenFinishMask(value: number, low = 0.06, high = 0.46) {
  return smoothStep(low, high, value)
}

type ArtworkFrameSteelFinishRoughMicroDetail = {
  albedoMottle: number
  ambientOcclusion: number
  glossDamping: number
  heightCut: number
  roughnessLift: number
}

function getSteelFinishRoughMicroDetail({
  cloud,
  directionAngle,
  geometrySeed,
  machining,
  mask,
  polishUnit,
  xUnit,
  yUnit,
}: {
  cloud: number
  directionAngle: number
  geometrySeed: number
  machining: number
  mask: number
  polishUnit: number
  xUnit: number
  yUnit: number
}): ArtworkFrameSteelFinishRoughMicroDetail {
  const strength = (1 - smoothStep(0.04, 0.14, polishUnit)) * mask

  if (strength <= 0) {
    return {
      albedoMottle: 0,
      ambientOcclusion: 0,
      glossDamping: 0,
      heightCut: 0,
      roughnessLift: 0,
    }
  }

  const localDrift = valueNoise2d(
    geometrySeed + 1871,
    xUnit * 1.3,
    yUnit * 1.3,
    19,
  ) - 0.5
  const primaryHairline = getDirectionalLineCandidate(
    geometrySeed + 1901,
    xUnit + localDrift * 0.002,
    yUnit - localDrift * 0.002,
    directionAngle + localDrift * 0.08,
    344,
    0.0028,
  )
  const secondaryHairline = getDirectionalLineCandidate(
    geometrySeed + 1931,
    xUnit - localDrift * 0.004,
    yUnit + localDrift * 0.003,
    directionAngle + 0.18 + localDrift * 0.1,
    512,
    0.0018,
  )
  const brokenLineGate = smoothStep(
    0.36,
    0.86,
    valueNoise2d(geometrySeed + 1951, xUnit * 1.7, yUnit * 1.7, 67),
  )
  const microScratchTooth = clampNumber(
    (primaryHairline * 0.92 + secondaryHairline * 0.64) * brokenLineGate,
    0,
    1,
  )
  const grainA = valueNoise2d(geometrySeed + 1987, xUnit, yUnit, 128)
  const grainB = valueNoise2d(
    geometrySeed + 2011,
    xUnit + grainA * 0.01,
    yUnit - grainA * 0.008,
    214,
  )
  const granularTooth = clampNumber(
    (
      Math.abs(grainA - 0.5) * 1.22 +
      Math.abs(grainB - 0.5) * 0.92
    ) * (0.34 + cloud * 0.66),
    0,
    1,
  )
  const machiningTooth = clampNumber(
    machining * 0.46 + microScratchTooth * 0.34 + granularTooth * 0.22,
    0,
    1,
  )
  const detail = strength * clampNumber(
    granularTooth * 0.48 +
      microScratchTooth * 0.38 +
      machiningTooth * 0.18,
    0,
    1,
  )

  return {
    albedoMottle: (
      (grainB - 0.54) * 0.044 -
      microScratchTooth * 0.014
    ) * strength,
    ambientOcclusion: clampNumber(
      microScratchTooth * 0.052 +
        granularTooth * 0.038 +
        machiningTooth * 0.018,
      0,
      0.18,
    ) * strength,
    glossDamping: clampNumber(
      detail * 0.34,
      0,
      0.38,
    ),
    heightCut: clampNumber(
      microScratchTooth * 0.027 +
        granularTooth * 0.008 +
        machiningTooth * 0.004,
      0,
      0.038,
    ) * strength,
    roughnessLift: clampNumber(
      detail * 0.18 + granularTooth * strength * 0.035,
      0,
      0.22,
    ),
  }
}

export function buildArtworkFrameSteelFinishDerivedMaps(
  field: ArtworkFrameSteelFinishField,
  options: BuildArtworkFrameSteelFinishDerivedMapsOptions = {},
): ArtworkFrameSteelFinishDerivedMaps {
  const length = field.fieldSize.width * field.fieldSize.height
  const steelAlbedo = new Float32Array(length * 3)
  const steelHeight = new Float32Array(length)
  const steelAmbientOcclusion = new Float32Array(length)
  const steelRoughness = new Float32Array(length)
  const steelGloss = new Float32Array(length)
  const steelMetalness = new Float32Array(length)
  const steelAnisotropy = new Float32Array(length)
  const steelAnisotropyDirectionX = new Float32Array(length)
  const steelAnisotropyDirectionY = new Float32Array(length)
  const machiningGrooveMask = new Float32Array(length)
  const machiningRidgeMask = new Float32Array(length)
  const brushedGrainMask = new Float32Array(length)
  const abrasionCloudMask = new Float32Array(length)
  const scratchTroughMask = new Float32Array(length)
  const scratchRimLightMask = new Float32Array(length)
  const scratchRimShadowMask = new Float32Array(length)
  const gougeTroughMask = new Float32Array(length)
  const dentPocketMask = new Float32Array(length)
  const pitPocketMask = new Float32Array(length)
  const visibleBurrRidgeMask = new Float32Array(length)
  const visibleDefectShadowMask = new Float32Array(length)
  const visibleDentAmbientOcclusionMask = new Float32Array(length)
  const visibleDentDepthMask = new Float32Array(length)
  const visibleDentShadowMask = new Float32Array(length)
  const visibleGougeAmbientOcclusionMask = new Float32Array(length)
  const visibleGougeDepthMask = new Float32Array(length)
  const visibleGougeShadowMask = new Float32Array(length)
  const visiblePitAmbientOcclusionMask = new Float32Array(length)
  const visiblePitDepthMask = new Float32Array(length)
  const visiblePitShadowMask = new Float32Array(length)
  const visibleScratchAmbientOcclusionMask = new Float32Array(length)
  const visibleScratchDepthMask = new Float32Array(length)
  const visibleScratchRimLightMask = new Float32Array(length)
  const visibleScratchRimShadowMask = new Float32Array(length)
  const visibleScratchShadowMask = new Float32Array(length)
  const burrRidgeMask = new Float32Array(length)
  const scuffCrossScratchTroughMask = new Float32Array(length)
  const scuffCrossScratchRimLightMask = new Float32Array(length)
  const scuffCrossScratchRimShadowMask = new Float32Array(length)
  const polishedReflectionMask = new Float32Array(length)
  const polishedHazeMask = new Float32Array(length)
  const {
    brushedBaseline,
    fineSatin,
    nearMirror,
    roughDamaged,
    scuffedLow,
    semiBright,
  } = field.stageUnits
  const scuffedProgressUnit = smoothStep(0.10, 0.30, field.polishUnit)
  const brushedProgressUnit = smoothStep(0.28, 0.58, field.polishUnit)
  const fineSatinProgressUnit = smoothStep(0.54, 0.76, field.polishUnit)
  const semiBrightProgressUnit = smoothStep(0.72, 0.92, field.polishUnit)
  const nearMirrorProgressUnit = smoothStep(0.88, 1, field.polishUnit)
  const semiBrightEndpointResponse = smoothStep(0.78, 0.85, field.polishUnit) *
    (1 - smoothStep(0.88, 0.96, field.polishUnit))
  const nearMirrorEndpointResponse = smoothStep(0.88, 1, field.polishUnit)
  const polishResponse = getSteelFinishPolishResponseCurve(field.polishUnit)
  const roughResponse = polishResponse.defectResponse
  const brushedResponse = clampNumber(
    brushedBaseline * interpolate(0.92, 1.06, brushedProgressUnit) *
      (1 - scuffedLow * 0.45) +
      fineSatin * interpolate(0.76, 0.52, fineSatinProgressUnit) +
      scuffedLow * interpolate(0.16, 0.36, scuffedProgressUnit),
    0,
    1,
  )
  const polishedResponse = clampNumber(
    fineSatin * interpolate(0.2, 0.36, fineSatinProgressUnit) +
      semiBright * interpolate(0.62, 0.84, semiBrightProgressUnit) +
      nearMirror * interpolate(0.88, 1, nearMirrorProgressUnit),
    0,
    1,
  )
  const brushAngle = field.brushAngleDegrees * Math.PI / 180
  const brushCos = Math.cos(brushAngle)
  const brushSin = Math.sin(brushAngle)
  const defectDecalMaps = options.defectDecalMaps ?? null
  const substrateMaps = buildArtworkFrameSteelSubstrateDerivedMaps(field)
  const cleanSubstrateBlend = 1
  const broadReflectionPhase = ((field.geometrySeed >>> 0) % 997) / 997

  for (let index = 0; index < length; index += 1) {
    const x = index % field.fieldSize.width
    const y = Math.floor(index / field.fieldSize.width)
    const xUnit = field.fieldSize.width <= 1
      ? 0
      : x / (field.fieldSize.width - 1)
    const yUnit = field.fieldSize.height <= 1
      ? 0
      : y / (field.fieldSize.height - 1)
    const mask = field.fields.frameMask[index] ?? 0
    const rawMachining = (field.fields.machiningGrooveField[index] ?? 0) * mask
    const rawScratch = (field.fields.scratchCandidateField[index] ?? 0) * mask
    const rawGouge = (field.fields.gougeCandidateField[index] ?? 0) * mask
    const rawDent = (field.fields.dentPocketField[index] ?? 0) * mask
    const rawPit = (field.fields.pitPocketField[index] ?? 0) * mask
    const rawScuffCrossScratch =
      (field.fields.scuffCrossScratchField[index] ?? 0) * mask
    const facet = valueNoise2d(
      field.geometrySeed + 1709,
      xUnit + rawDent * 0.025,
      yUnit - rawDent * 0.018,
      44,
    )
    const pitJaggedness = valueNoise2d(
      field.geometrySeed + 1811,
      xUnit + rawPit * 0.04,
      yUnit - rawPit * 0.035,
      78,
    )
    const machining = sharpenFinishMask(rawMachining, 0.05, 0.42)
    const scratch = sharpenFinishMask(rawScratch, 0.08, 0.36)
    const gouge = sharpenFinishMask(rawGouge, 0.05, 0.32)
    const dent = sharpenFinishMask(rawDent, 0.08, 0.44) *
      (0.78 + facet * 0.22) * mask
    const pit = sharpenFinishMask(rawPit, 0.08, 0.42) *
      (0.68 + pitJaggedness * 0.32) * mask
    const scuffCrossScratch = sharpenFinishMask(
      rawScuffCrossScratch,
      0.04,
      0.24,
    )
    const cloud = (field.fields.cloudAbrasionField[index] ?? 0) * mask
    const reflection = (field.fields.buffingReflectionField[index] ?? 0) * mask
    const protection = (field.fields.protectionVisibilityField[index] ?? 0) * mask
    const stableDirectionX = field.fields.abrasionDirectionX[index] ?? 0
    const stableDirectionY = field.fields.abrasionDirectionY[index] ?? 0
    const directionX = (stableDirectionX * brushCos -
      stableDirectionY * brushSin) * mask
    const directionY = (stableDirectionX * brushSin +
      stableDirectionY * brushCos) * mask
    const roughMicroDetail = getSteelFinishRoughMicroDetail({
      cloud,
      directionAngle: Math.atan2(directionY, directionX),
      geometrySeed: field.geometrySeed,
      machining,
      mask: mask * roughDamaged,
      polishUnit: field.polishUnit,
      xUnit,
      yUnit,
    })
    const scuffedProgress = smoothStep(0.10, 0.30, field.polishUnit)
    const scuffedRimRelief = 1 - scuffedLow *
      interpolate(0.22, 0.36, scuffedProgress)
    const earlyScuffReliefBridge = scuffedLow *
      smoothStep(0.1, 0.15, field.polishUnit) *
      (1 - smoothStep(0.24, 0.3, field.polishUnit))
    const boundedCloud = smoothStep(0.18, 0.52, cloud) *
      (1 - smoothStep(0.82, 0.98, cloud))
    const scuffedCloudWear = scuffedLow *
      interpolate(0.052, 0.028, scuffedProgress)
    const cloudWear = cloud * (0.2 + roughResponse * 0.38) +
      boundedCloud * scuffedCloudWear
    const fineSatinDefectSuppression = fineSatin *
      interpolate(0.24, 0.56, fineSatinProgressUnit)
    const fineSatinGrainSuppression = fineSatin *
      interpolate(0.08, 0.28, fineSatinProgressUnit)
    const semiBrightDefectSuppression = semiBright *
      interpolate(0.34, 0.66, semiBrightProgressUnit)
    const semiBrightGrainSuppression = semiBright *
      interpolate(0.28, 0.54, semiBrightProgressUnit)
    const nearMirrorDefectSuppression = nearMirror *
      interpolate(0.58, 0.84, nearMirrorProgressUnit)
    const nearMirrorGrainSuppression = nearMirror *
      interpolate(0.46, 0.72, nearMirrorProgressUnit)
    const defectDepthScale = clampNumber(
      (1 - fineSatinDefectSuppression - semiBrightDefectSuppression -
        nearMirrorDefectSuppression) * polishResponse.defectDepth,
      0.055,
      1,
    )
    const machiningDepthScale = clampNumber(
      (1 - fineSatinGrainSuppression - semiBrightGrainSuppression -
        nearMirrorGrainSuppression) * polishResponse.grainDepth,
      0.08,
      1,
    )
    const activeScratchRimLight =
      getSteelDefectPhysicalContributionValue(
        defectDecalMaps,
        'scratch',
        'rimLight',
        index,
      ) * mask
    const activeScratchRimShadow =
      getSteelDefectPhysicalContributionValue(
        defectDecalMaps,
        'scratch',
        'rimShadow',
        index,
      ) * mask
    const activeGougeRimShadow =
      getSteelDefectPhysicalContributionValue(
        defectDecalMaps,
        'gouge',
        'rimShadow',
        index,
      ) * mask
    const activeDentRimShadow =
      getSteelDefectPhysicalContributionValue(
        defectDecalMaps,
        'dent',
        'rimShadow',
        index,
      ) * mask
    const activePitRimShadow =
      getSteelDefectPhysicalContributionValue(
        defectDecalMaps,
        'pit',
        'rimShadow',
        index,
      ) * mask
    const activeScuffRimLight =
      getSteelDefectPhysicalContributionValue(
        defectDecalMaps,
        'scuff',
        'rimLight',
        index,
      ) * mask
    const activeScuffRimShadow =
      getSteelDefectPhysicalContributionValue(
        defectDecalMaps,
        'scuff',
        'rimShadow',
        index,
      ) * mask
    const activeBurrNickRimLight =
      getSteelDefectPhysicalContributionValue(
        defectDecalMaps,
        'burrNick',
        'rimLight',
        index,
      ) * mask
    const activeBurrNickRimShadow =
      getSteelDefectPhysicalContributionValue(
        defectDecalMaps,
        'burrNick',
        'rimShadow',
        index,
      ) * mask
    const visibleScratchDepth =
      getSteelDefectPhysicalContributionValue(
        defectDecalMaps,
        'scratch',
        'height',
        index,
      ) * mask
    const visibleGougeDepth =
      getSteelDefectPhysicalContributionValue(
        defectDecalMaps,
        'gouge',
        'height',
        index,
      ) * mask
    const visibleDentDepth =
      getSteelDefectPhysicalContributionValue(
        defectDecalMaps,
        'dent',
        'height',
        index,
      ) * mask
    const visiblePitDepth =
      getSteelDefectPhysicalContributionValue(
        defectDecalMaps,
        'pit',
        'height',
        index,
      ) * mask
    const visibleScuffDepth =
      getSteelDefectPhysicalContributionValue(
        defectDecalMaps,
        'scuff',
        'height',
        index,
      ) * mask
    const visibleBurrNickHeight =
      getSteelDefectPhysicalContributionValue(
        defectDecalMaps,
        'burrNick',
        'height',
        index,
      ) * mask
    const visibleScratchAo =
      getSteelDefectPhysicalContributionValue(
        defectDecalMaps,
        'scratch',
        'ambientOcclusion',
        index,
      ) * mask
    const visibleGougeAo =
      getSteelDefectPhysicalContributionValue(
        defectDecalMaps,
        'gouge',
        'ambientOcclusion',
        index,
      ) * mask
    const visibleDentAo =
      getSteelDefectPhysicalContributionValue(
        defectDecalMaps,
        'dent',
        'ambientOcclusion',
        index,
      ) * mask
    const visiblePitAo =
      getSteelDefectPhysicalContributionValue(
        defectDecalMaps,
        'pit',
        'ambientOcclusion',
        index,
      ) * mask
    const visibleScuffAo =
      getSteelDefectPhysicalContributionValue(
        defectDecalMaps,
        'scuff',
        'ambientOcclusion',
        index,
      ) * mask
    const visibleBurrNickAo =
      getSteelDefectPhysicalContributionValue(
        defectDecalMaps,
        'burrNick',
        'ambientOcclusion',
        index,
      ) * mask
    const activeRimShadow = clampNumber(
      activeBurrNickRimShadow * 0.72 +
        activeDentRimShadow * 0.72 +
        activeGougeRimShadow * 0.88 +
        activePitRimShadow * 0.68 +
        activeScratchRimShadow * 0.48 +
        activeScuffRimShadow * 0.52,
      0,
      1,
    ) * mask
    const activeRoughnessResponse =
      getSteelDefectPhysicalContributionSum(
        defectDecalMaps,
        'roughnessResponse',
        index,
      ) * mask
    const activeGlossResponse =
      getSteelDefectPhysicalContributionSum(
        defectDecalMaps,
        'glossResponse',
        index,
      ) * mask
    const activeAlbedoResponse =
      getSteelDefectPhysicalContributionSum(
        defectDecalMaps,
        'albedoResponse',
        index,
      ) * mask
    const activeSelfShadowReceiver =
      getSteelDefectPhysicalContributionSum(
        defectDecalMaps,
        'selfShadowReceiver',
        index,
      ) * mask
    const baselineRidgePlacement = machining * 0.26 * mask
    const machiningValley = machining * (0.1 +
      scuffedLow * interpolate(0.24, 0.16, scuffedProgress) +
      earlyScuffReliefBridge * 0.18 +
      brushedResponse * interpolate(0.2, 0.1, brushedProgressUnit) +
      roughResponse * 0.24) * machiningDepthScale
    const burrHeight = (
      baselineRidgePlacement * 0.08 * defectDepthScale * scuffedRimRelief +
      visibleBurrNickHeight
    ) * (0.24 + roughResponse * 0.76)
    const nearMirrorHeightSuppression = nearMirror *
      interpolate(0.85, 0.98, nearMirrorProgressUnit)
    const reflectionHeight = reflection *
      (polishedResponse * 0.08 * (1 - nearMirrorHeightSuppression) +
        fineSatin * interpolate(0.02, 0.045, fineSatinProgressUnit) +
        nearMirror * interpolate(0.0005, 0.0012, nearMirrorProgressUnit))
    const albedoBase = field.geometryInputs.metalType === 'blackIron'
      ? 0.28 + polishResponse.albedoLift * 0.35
      : 0.55 + polishResponse.albedoLift
    const scuffedLift = scuffedLow * cloud * 0.14
    const polishedLift = polishedResponse * reflection * 0.1
    const satinHazeLift = fineSatin * clampNumber(
      (field.fields.buffingReflectionField[index] ?? 0) * 0.5 + cloud * 0.14,
      0,
      1,
    ) * interpolate(0.025, 0.07, fineSatinProgressUnit)
    const semiBrightVeilLift = semiBright * clampNumber(
      reflection * 0.74 + cloud * 0.08 + protection * 0.14,
      0,
      1,
    ) * interpolate(0.055, 0.12, semiBrightProgressUnit)
    const nearMirrorVeilLift = nearMirror * clampNumber(
      reflection * 0.82 + cloud * 0.035 + protection * 0.2,
      0,
      1,
    ) * interpolate(0.08, 0.16, nearMirrorProgressUnit)
    const brushedLift = brushedBaseline * reflection *
      interpolate(0.025, 0.075, brushedProgressUnit)
    const sheetMetalLift = scuffedLow * boundedCloud *
      interpolate(0.035, 0.09, scuffedProgress)
    const albedoIndex = index * 3
    const substrateAlbedoLuma =
      (substrateMaps.steelSubstrateAlbedo[albedoIndex + 2] ?? 0) * mask
    const substrateMicroStrands =
      (substrateMaps.steelSubstrateMicroStrandMask[index] ?? 0) * mask
    const substrateGrainContinuity =
      (substrateMaps.steelSubstrateGrainContinuity[index] ?? 0) * mask
    const substrateFineGrainMask = clampNumber(
      substrateMicroStrands *
        (
          0.72 +
          substrateGrainContinuity * 0.36
        ),
      0,
      1,
    ) * mask
    const broadReflectionPosition = (
      xUnit * 0.06 +
      yUnit * 0.012 +
      broadReflectionPhase
    ) % 1
    const broadReflectionBand = Math.pow(
      0.5 +
        0.5 * Math.cos((broadReflectionPosition - 0.5) * Math.PI * 2),
      1.18,
    )
    const broadPolishedReflection = clampNumber(
      broadReflectionBand,
      0,
      1,
    ) * mask
    const lowPolishSubstrateProgress = smoothStep(0, 0.5, field.polishUnit)
    const satinSurfaceReliefBridge =
      smoothStep(0.54, 0.65, field.polishUnit) *
      (1 - smoothStep(0.7, 0.74, field.polishUnit))
    const substrateBaseHeight =
      (substrateMaps.steelSubstrateHeight[index] ?? 0) * interpolate(
        0.88,
        1.18,
        substrateMaps.steelSubstrateNormalStrength[index] ?? 0,
      )
    let substrateFineGrainNeighborhoodSum = 0
    let substrateFineGrainNeighborhoodWeight = 0
    let substrateContinuityNeighborhoodSum = 0

    for (let yOffset = -4; yOffset <= 4; yOffset += 1) {
      for (let xOffset = -4; xOffset <= 4; xOffset += 1) {
        const neighborX = x + xOffset
        const neighborY = y + yOffset

        if (
          neighborX < 0 ||
          neighborX >= field.fieldSize.width ||
          neighborY < 0 ||
          neighborY >= field.fieldSize.height
        ) {
          continue
        }

        const neighborIndex = neighborY * field.fieldSize.width + neighborX
        const neighborMask = field.fields.frameMask[neighborIndex] ?? 0

        if (neighborMask <= 0) {
          continue
        }

        const neighborMicroStrands =
          (substrateMaps.steelSubstrateMicroStrandMask[neighborIndex] ?? 0) *
          neighborMask
        const neighborContinuity =
          (substrateMaps.steelSubstrateGrainContinuity[neighborIndex] ?? 0) *
          neighborMask
        const neighborFineGrain = clampNumber(
          neighborMicroStrands * (0.72 + neighborContinuity * 0.36),
          0,
          1,
        ) * neighborMask
        const neighborDistance = Math.hypot(xOffset, yOffset)
        const neighborWeight = neighborDistance === 0
          ? 1.35
          : neighborDistance <= Math.SQRT2
            ? 1
            : neighborDistance <= 2.25
              ? 0.65
              : neighborDistance <= 3.25
                ? 0.35
                : 0.18

        substrateFineGrainNeighborhoodSum +=
          neighborFineGrain * neighborWeight
        substrateContinuityNeighborhoodSum +=
          neighborContinuity * neighborWeight
        substrateFineGrainNeighborhoodWeight += neighborWeight
      }
    }

    const substrateFineGrainNeighborhood =
      substrateFineGrainNeighborhoodSum /
      Math.max(1, substrateFineGrainNeighborhoodWeight)
    const substrateContinuityNeighborhood =
      substrateContinuityNeighborhoodSum /
      Math.max(1, substrateFineGrainNeighborhoodWeight)
    const substrateMachiningGrooveBase = clampNumber(
      substrateFineGrainNeighborhood * 0.88 + substrateFineGrainMask * 0.12,
      0,
      1,
    )
    const physicalMachiningVisibility =
      1 - smoothStep(0.72, 0.98, field.polishUnit) * 0.995
    const rawSubstrateMachiningGrooveMask = clampNumber(
      Math.pow(substrateMachiningGrooveBase, 0.6) * 0.95 +
        substrateMachiningGrooveBase * 0.12 +
        substrateContinuityNeighborhood * 0.05,
      0,
      1,
    ) * mask
    const substrateMachiningGrooveMask =
      rawSubstrateMachiningGrooveMask < 0.08
        ? 0
        : rawSubstrateMachiningGrooveMask
    const textureEdgeDistance = Math.min(
      xUnit,
      1 - xUnit,
      yUnit,
      1 - yUnit,
    )
    const substrateFaceReliefWeight = interpolate(
      0.78,
      1,
      smoothStep(0.02, 0.075, textureEdgeDistance),
    )
    const substrateMachiningPhysicalResponse = Math.min(
      (
        substrateFineGrainNeighborhood * 0.22 +
        substrateContinuityNeighborhood * 0.12
      ) * physicalMachiningVisibility,
      0.22 * physicalMachiningVisibility,
    ) * substrateFaceReliefWeight
    const continuousBrushedGrainMask = clampNumber(
      substrateFineGrainNeighborhood * 3 +
        substrateFineGrainMask *
          smoothStep(0.05, 0.14, substrateFineGrainNeighborhood) *
          0.1,
      0,
      1,
    ) * mask
    const substrateFineGrainRelief = substrateMachiningPhysicalResponse *
      interpolate(
        0.43,
        0.022,
        Math.pow(lowPolishSubstrateProgress, 0.72),
      ) *
      (1 - smoothStep(0.84, 1, field.polishUnit) * 0.32)
    const activeDefectRelief = clampNumber(
      visibleBurrNickHeight +
        visibleDentDepth +
        visibleGougeDepth +
        visiblePitDepth +
        visibleScratchDepth +
        visibleScuffDepth,
      0,
      1,
    )
    const satinSurfaceRelief = substrateBaseHeight *
      satinSurfaceReliefBridge *
      (1 - smoothStep(0.0001, 0.002, activeDefectRelief)) *
      23.4
    const nearMirrorHairlineRelief =
      nearMirrorEndpointResponse *
      (substrateFineGrainMask - substrateFineGrainNeighborhood) *
      0.0075 *
      mask
    const semiBrightHairlineRelief =
      semiBrightEndpointResponse *
      (substrateFineGrainMask - substrateFineGrainNeighborhood) *
      0.018 *
      mask
    const substrateHeight = (
      substrateBaseHeight +
      satinSurfaceRelief -
      substrateFineGrainRelief +
      nearMirrorHairlineRelief +
      semiBrightHairlineRelief
    ) * mask
    const substrateAmbientOcclusion = clampNumber(
        (substrateMaps.steelSubstrateAmbientOcclusion[index] ?? 0) *
        (1 - smoothStep(0.84, 1, field.polishUnit) * 0.96) +
        substrateMachiningPhysicalResponse *
          interpolate(
            0.31,
            0.0006,
            Math.pow(lowPolishSubstrateProgress, 0.7),
          ) *
          (1 - smoothStep(0.8, 1, field.polishUnit) * 0.995),
      0,
      1,
    ) * mask
    const substrateRoughness =
      (substrateMaps.steelSubstrateRoughness[index] ?? 0) * mask
    const substrateGloss =
      (substrateMaps.steelSubstrateGloss[index] ?? 0) * mask
    const substrateAnisotropy =
      (substrateMaps.steelSubstrateAnisotropy[index] ?? 0) * mask
    const substrateDirectionX =
      (substrateMaps.steelSubstrateAnisotropyDirectionX[index] ?? 0) * mask
    const substrateDirectionY =
      (substrateMaps.steelSubstrateAnisotropyDirectionY[index] ?? 0) * mask
    const legacySubstrateOwner = {
      albedoLift: albedoBase + scuffedLift + sheetMetalLift + brushedLift +
        satinHazeLift + semiBrightVeilLift + nearMirrorVeilLift +
        polishedLift + roughMicroDetail.albedoMottle -
        roughResponse * cloud * 0.035 + sheetMetalLift * 0.38,
      ambientOcclusion: machining *
          (0.04 + roughResponse * 0.16 +
            scuffedLow * interpolate(0.55, 0.42, scuffedProgress)) *
            machiningDepthScale +
        machining * earlyScuffReliefBridge * 0.27 *
          machiningDepthScale +
        roughMicroDetail.ambientOcclusion +
        baselineRidgePlacement * (0.02 + roughResponse * 0.06) *
          scuffedRimRelief,
      anisotropy: brushedResponse * 0.72 + fineSatin * 0.28 +
        semiBright * 0.14,
      directionX,
      directionY,
      glossBase: (polishResponse.glossBase +
        brushedResponse * 0.035 +
        polishedResponse * 0.07 +
        reflection * polishedResponse * 0.035 +
        protection * polishedResponse * 0.025) *
        (1 - cloudWear * polishResponse.glossCloudDamping) *
        (1 - roughMicroDetail.glossDamping),
      height: burrHeight - visibleBurrNickHeight *
        (0.24 + roughResponse * 0.76) -
        machiningValley + reflectionHeight - roughMicroDetail.heightCut,
      metalness: (field.geometryInputs.metalType === 'blackIron' ? 0.86 : 0.95) -
        cloudWear * 0.05,
      roughness: polishResponse.roughnessBase +
        cloudWear * polishResponse.cloudRoughness +
        machining * roughResponse * 0.025 -
        reflection * polishedResponse * 0.035 -
        protection * polishedResponse * 0.055 +
        roughMicroDetail.roughnessLift,
    }
    const substrateOwner = {
      albedoLift: interpolate(
        legacySubstrateOwner.albedoLift,
        substrateAlbedoLuma,
        cleanSubstrateBlend,
      ),
      ambientOcclusion: interpolate(
        legacySubstrateOwner.ambientOcclusion,
        substrateAmbientOcclusion,
        cleanSubstrateBlend,
      ),
      anisotropy: interpolate(
        legacySubstrateOwner.anisotropy,
        substrateAnisotropy,
        cleanSubstrateBlend,
      ),
      directionX: substrateDirectionX,
      directionY: substrateDirectionY,
      glossBase: interpolate(
        legacySubstrateOwner.glossBase,
        substrateGloss,
        cleanSubstrateBlend,
      ),
      height: interpolate(
        legacySubstrateOwner.height,
        substrateHeight,
        cleanSubstrateBlend,
      ),
      metalness: legacySubstrateOwner.metalness,
      roughness: interpolate(
        legacySubstrateOwner.roughness,
        substrateRoughness,
        cleanSubstrateBlend,
      ),
    }
    const activeDecalOwner = {
      albedoDarken:
        activeAlbedoResponse * interpolate(0.18, 0.08, field.polishUnit),
      ambientOcclusion: visibleScratchAo + visibleGougeAo + visibleDentAo +
        visiblePitAo + visibleScuffAo + visibleBurrNickAo,
      burrNickRidge: clampNumber(
        activeBurrNickRimLight + visibleBurrNickHeight * 0.4,
        0,
        1,
      ) * mask,
      glossMultiplier:
        1 - activeGlossResponse * polishResponse.glossDamageDamping,
      height: visibleBurrNickHeight * (0.24 + roughResponse * 0.76) -
        visibleScratchDepth - visibleGougeDepth - visibleDentDepth -
        visiblePitDepth - visibleScuffDepth,
      metalnessDarken: activeAlbedoResponse * 0.08,
      rimShadow: activeRimShadow,
      roughness: activeRoughnessResponse * polishResponse.damageRoughness,
      selfShadowReceiver: activeSelfShadowReceiver,
    }
    const composedAmbientOcclusion = clampNumber(
      substrateOwner.ambientOcclusion + activeDecalOwner.ambientOcclusion,
      0,
      1,
    ) * mask
    const nearMirrorComposedReliefScale = interpolate(
      1,
      0.52,
      nearMirror * nearMirrorProgressUnit,
    )
    const composedHeight =
      (substrateOwner.height + activeDecalOwner.height) *
      nearMirrorComposedReliefScale *
      mask
    const composedRoughness = clampNumber(
      substrateOwner.roughness + activeDecalOwner.roughness,
      polishResponse.roughnessFloor,
      1,
    ) * mask
    const composedGloss = clampNumber(
      substrateOwner.glossBase * activeDecalOwner.glossMultiplier,
      0,
      1,
    ) * mask
    const composedMetalness = clampNumber(
      substrateOwner.metalness - activeDecalOwner.metalnessDarken,
      0,
      1,
    ) * mask
    const composedAnisotropy = clampNumber(
      substrateOwner.anisotropy,
      0,
      1,
    ) * mask
    const composedAlbedo = clampNumber(
      substrateOwner.albedoLift -
        composedAmbientOcclusion * interpolate(0.2, 0.1, field.polishUnit) -
        activeDecalOwner.albedoDarken,
      0,
      1,
    ) * mask
    const finalSteelMaps = {
      albedo: composedAlbedo,
      ambientOcclusion: composedAmbientOcclusion,
      anisotropy: composedAnisotropy,
      directionX: substrateOwner.directionX,
      directionY: substrateOwner.directionY,
      gloss: composedGloss,
      height: composedHeight,
      metalness: composedMetalness,
      roughness: composedRoughness,
    }
    const legacyTransitionCompatibility = {
      dentPocketMask: dent,
      gougeTroughMask: gouge,
      pitPocketMask: pit,
      scratchTroughMask: scratch,
      scuffCrossScratchTroughMask: scuffCrossScratch,
    }
    const visiblePitShadow = activePitRimShadow
    const visibleScratchShadow = activeScratchRimShadow
    const visibleGougeShadow = activeGougeRimShadow
    const visibleDentShadow = activeDentRimShadow
    const visibleDefectShadow = clampNumber(
      activeDecalOwner.rimShadow + activeDecalOwner.selfShadowReceiver * 0.28,
      0,
      1,
    ) * mask

    machiningGrooveMask[index] = substrateMachiningGrooveMask
    machiningRidgeMask[index] = substrateMachiningGrooveMask *
      0.08
    brushedGrainMask[index] = clampNumber(
      continuousBrushedGrainMask +
        (substrateMaps.steelSubstrateReflectionVeil[index] ?? 0) * 0.025,
      0,
      1,
    ) * mask
    abrasionCloudMask[index] = cloud
    scratchTroughMask[index] = legacyTransitionCompatibility.scratchTroughMask
    scratchRimLightMask[index] = activeScratchRimLight
    scratchRimShadowMask[index] = activeScratchRimShadow
    gougeTroughMask[index] = legacyTransitionCompatibility.gougeTroughMask
    dentPocketMask[index] = legacyTransitionCompatibility.dentPocketMask
    pitPocketMask[index] = legacyTransitionCompatibility.pitPocketMask
    visibleBurrRidgeMask[index] = activeDecalOwner.burrNickRidge
    visibleDefectShadowMask[index] = visibleDefectShadow
    visibleDentAmbientOcclusionMask[index] = visibleDentAo
    visibleDentDepthMask[index] = visibleDentDepth
    visibleDentShadowMask[index] = visibleDentShadow
    visibleGougeAmbientOcclusionMask[index] = visibleGougeAo
    visibleGougeDepthMask[index] = visibleGougeDepth
    visibleGougeShadowMask[index] = visibleGougeShadow
    visiblePitAmbientOcclusionMask[index] = visiblePitAo
    visiblePitDepthMask[index] = visiblePitDepth
    visiblePitShadowMask[index] = visiblePitShadow
    visibleScratchAmbientOcclusionMask[index] = visibleScratchAo
    visibleScratchDepthMask[index] = visibleScratchDepth
    visibleScratchRimLightMask[index] = activeScratchRimLight
    visibleScratchRimShadowMask[index] = activeScratchRimShadow
    visibleScratchShadowMask[index] = visibleScratchShadow
    burrRidgeMask[index] = clampNumber(
      visibleBurrNickHeight + activeBurrNickRimLight,
      0,
      1,
    ) * mask
    scuffCrossScratchTroughMask[index] =
      legacyTransitionCompatibility.scuffCrossScratchTroughMask
    scuffCrossScratchRimLightMask[index] = activeScuffRimLight
    scuffCrossScratchRimShadowMask[index] = activeScuffRimShadow
    polishedReflectionMask[index] =
      broadPolishedReflection * STEEL_FINISH_REFLECTION_MASK_OUTPUT_SCALE
    polishedHazeMask[index] = clampNumber(
      broadPolishedReflection * 0.76 +
        reflection * 0.04 +
        cloud * 0.12 +
        protection * 0.12,
      0,
      1,
    ) * mask * STEEL_FINISH_HAZE_MASK_OUTPUT_SCALE
    steelHeight[index] = finalSteelMaps.height
    steelAmbientOcclusion[index] = finalSteelMaps.ambientOcclusion
    steelRoughness[index] = finalSteelMaps.roughness
    steelGloss[index] = finalSteelMaps.gloss
    steelMetalness[index] = finalSteelMaps.metalness
    steelAnisotropy[index] = finalSteelMaps.anisotropy
    steelAnisotropyDirectionX[index] = finalSteelMaps.directionX
    steelAnisotropyDirectionY[index] = finalSteelMaps.directionY

    steelAlbedo[albedoIndex] = finalSteelMaps.albedo * 0.9
    steelAlbedo[albedoIndex + 1] = finalSteelMaps.albedo * 0.96
    steelAlbedo[albedoIndex + 2] = finalSteelMaps.albedo
  }

  return {
    abrasionCloudMask,
    brushedGrainMask,
    burrRidgeMask,
    dentPocketMask,
    ...(options.defectDecalMaps
      ? { defectDecalMaps: options.defectDecalMaps }
      : {}),
    gougeTroughMask,
    heightPixels: field.fieldSize.height,
    machiningGrooveMask,
    machiningRidgeMask,
    pitPocketMask,
    polishedHazeMask,
    polishedReflectionMask,
    polishUnit: field.polishUnit,
    scuffCrossScratchRimLightMask,
    scuffCrossScratchRimShadowMask,
    scuffCrossScratchTroughMask,
    scratchRimLightMask,
    scratchRimShadowMask,
    scratchTroughMask,
    stageUnits: field.stageUnits,
    steelAlbedo,
    steelAmbientOcclusion,
    steelAnisotropy,
    steelAnisotropyDirectionX,
    steelAnisotropyDirectionY,
    steelGloss,
    steelHeight,
    steelMetalness,
    steelRoughness,
    substrateMaps,
    visibleBurrRidgeMask,
    visibleDefectShadowMask,
    visibleDentAmbientOcclusionMask,
    visibleDentDepthMask,
    visibleDentShadowMask,
    visibleGougeAmbientOcclusionMask,
    visibleGougeDepthMask,
    visibleGougeShadowMask,
    visiblePitAmbientOcclusionMask,
    visiblePitDepthMask,
    visiblePitShadowMask,
    visibleScratchAmbientOcclusionMask,
    visibleScratchDepthMask,
    visibleScratchRimLightMask,
    visibleScratchRimShadowMask,
    visibleScratchShadowMask,
    widthPixels: field.fieldSize.width,
  }
}

function getSteelFinishMapMask(
  maps: Pick<
    ArtworkFrameSteelFinishDerivedMaps,
    | 'steelAnisotropy'
    | 'steelGloss'
    | 'steelMetalness'
    | 'steelRoughness'
  >,
  index: number,
) {
  return (maps.steelMetalness[index] ?? 0) > 0 ||
    (maps.steelRoughness[index] ?? 0) > 0 ||
    (maps.steelGloss[index] ?? 0) > 0 ||
    (maps.steelAnisotropy[index] ?? 0) > 0
    ? 1
    : 0
}

function getSteelFinishMacroLightingPosition({
  coordinates,
  index,
  width,
}: {
  coordinates: ArtworkFrameMaterialShadingCoordinateContext
  index: number
  width: number
}) {
  const x = index % width
  const y = Math.floor(index / width)
  const materialX = coordinates.samplingBounds.x +
    (x + 0.5) * coordinates.materialPixelSize.x
  const materialY = coordinates.samplingBounds.y +
    (y + 0.5) * coordinates.materialPixelSize.y

  return getArtworkFrameMaterialMacroLightingPositionFromMaterialPoint({
    frameBounds: coordinates.frameBounds,
    frameCenter: coordinates.frameCenter,
    materialPoint: {
      x: materialX,
      y: materialY,
    },
  })
}

function applySteelFinishMacroDiffuse(
  diffuse: number,
  macroDiffuse: number,
  macroShadow: number,
) {
  return clampNumber(
    diffuse * macroDiffuse - macroShadow,
    0.06,
    1.18,
  )
}

function getSteelFinishAnisotropicSubstrateLighting({
  anisotropy,
  directionalLightStrength,
  gloss,
  grain,
  haze,
  normalLight,
  reflectionBand,
  roughness,
  tangentLight,
  acrossTangentLight,
}: {
  acrossTangentLight: number
  anisotropy: number
  directionalLightStrength: number
  gloss: number
  grain: number
  haze: number
  normalLight: number
  reflectionBand: number
  roughness: number
  tangentLight: number
}) {
  const clampedAnisotropy = clampNumber(anisotropy, 0, 1)
  const clampedRoughness = clampNumber(roughness, 0, 1)
  const alongRoughness = clampNumber(
    clampedRoughness * (1 - clampedAnisotropy * 0.22),
    0.018,
    1,
  )
  const crossRoughness = clampNumber(
    clampedRoughness * (1 + clampedAnisotropy * 0.32),
    0.018,
    1,
  )
  const anisotropyAspect = clampNumber(
    (crossRoughness - alongRoughness) * 1.65,
    0,
    1,
  )
  const crossAlignment = clampNumber(1 - Math.abs(acrossTangentLight), 0, 1)
  const alongContinuity = clampNumber(1 - Math.abs(tangentLight) * 0.28, 0, 1)
  const broadness = clampNumber(
    anisotropyAspect * 0.7 + (1 - clampedRoughness) * 0.3,
    0,
    1,
  )
  const lobe = Math.pow(
    crossAlignment,
    interpolate(2.6, 1.05, broadness),
  ) * alongContinuity * clampedAnisotropy * directionalLightStrength
  const coherentSource = clampNumber(
    normalLight * interpolate(0.58, 0.42, broadness) +
      lobe * interpolate(0.42, 0.62, broadness),
    0,
    1,
  )
  const coherentHighlight = Math.pow(
    coherentSource,
    interpolate(9.5, 4.6, broadness),
  ) * gloss * (1 - clampedRoughness * 0.34) *
    (0.65 + clampedAnisotropy * 0.52)
  const diffuseBand = (
    (reflectionBand - 0.5) * interpolate(18, 30, broadness) +
    (haze - 0.5) * interpolate(4, 9, broadness)
  ) * lobe * (1 - clampedRoughness * 0.18)
  const grainBand = (grain - 0.52) *
    lobe *
    interpolate(11, 5, broadness) *
    (1 - clampedRoughness * 0.16)
  const crossShadow = Math.max(0, -acrossTangentLight) *
    lobe *
    clampedRoughness *
    interpolate(7, 3, broadness)

  return {
    coherentHighlight,
    diffuseBand,
    grainBand,
    lobe,
    shadow: crossShadow,
  }
}

function getSteelFinishStageWeightedValue(
  stageUnits: ArtworkFrameSteelPolishStageUnits,
  values: ArtworkFrameSteelPolishStageUnits,
) {
  const totalWeight = Math.max(
    0.000001,
    stageUnits.roughDamaged +
      stageUnits.scuffedLow +
      stageUnits.brushedBaseline +
      stageUnits.fineSatin +
      stageUnits.semiBright +
      stageUnits.nearMirror,
  )

  return (
    stageUnits.roughDamaged * values.roughDamaged +
    stageUnits.scuffedLow * values.scuffedLow +
    stageUnits.brushedBaseline * values.brushedBaseline +
    stageUnits.fineSatin * values.fineSatin +
    stageUnits.semiBright * values.semiBright +
    stageUnits.nearMirror * values.nearMirror
  ) / totalWeight
}

export function buildArtworkFrameSteelFinishNormalInputs(
  maps: ArtworkFrameSteelFinishDerivedMaps,
  normalStrength = STEEL_FINISH_NORMAL_STRENGTH,
): ArtworkFrameSteelFinishNormalInputs {
  const width = maps.widthPixels
  const height = maps.heightPixels
  const length = width * height
  const normalX = new Float32Array(length)
  const normalY = new Float32Array(length)
  const normalZ = new Float32Array(length)
  const strength = clampNumber(normalStrength, 0, 1.5)
  const getHeight = (x: number, y: number, fallback: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) {
      return fallback
    }

    const index = y * width + x

    return getSteelFinishMapMask(maps, index) > 0
      ? maps.steelHeight[index] ?? fallback
      : fallback
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x

      if (getSteelFinishMapMask(maps, index) <= 0) {
        normalX[index] = 0
        normalY[index] = 0
        normalZ[index] = 0
        continue
      }

      const center = maps.steelHeight[index] ?? 0
      const left = getHeight(x - 1, y, center)
      const right = getHeight(x + 1, y, center)
      const up = getHeight(x, y - 1, center)
      const down = getHeight(x, y + 1, center)
      const gradientX = (right - left) * 0.5 * strength
      const gradientY = (down - up) * 0.5 * strength
      const xComponent = -gradientX
      const yComponent = -gradientY
      const zComponent = 1
      const normalLength = Math.hypot(xComponent, yComponent, zComponent) || 1

      normalX[index] = xComponent / normalLength
      normalY[index] = yComponent / normalLength
      normalZ[index] = zComponent / normalLength
    }
  }

  return {
    heightPixels: height,
    normalStrength: strength,
    normalX,
    normalY,
    normalZ,
    steelAnisotropy: maps.steelAnisotropy,
    steelAnisotropyDirectionX: maps.steelAnisotropyDirectionX,
    steelAnisotropyDirectionY: maps.steelAnisotropyDirectionY,
    steelHeight: maps.steelHeight,
    widthPixels: width,
  }
}

export function shadeArtworkFrameSteelFinishImageData(
  imageData: ImageData,
  inputs: ArtworkFrameSteelFinishShadingInputs,
) {
  const {
    coordinates,
    lightVector,
    normalInputs,
    performance,
    steelFinishMaps,
  } = inputs
  const roughDamagedStrength = clampNumber(
    steelFinishMaps.stageUnits.roughDamaged,
    0,
    1,
  )
  const scuffedLowStrength = clampNumber(
    steelFinishMaps.stageUnits.scuffedLow,
    0,
    1,
  )
  const brushedBaselineStrength = clampNumber(
    steelFinishMaps.stageUnits.brushedBaseline,
    0,
    1,
  )
  const fineSatinStrength = clampNumber(
    steelFinishMaps.stageUnits.fineSatin,
    0,
    1,
  )
  const semiBrightStrength = clampNumber(
    steelFinishMaps.stageUnits.semiBright,
    0,
    1,
  )
  const nearMirrorStrength = clampNumber(
    steelFinishMaps.stageUnits.nearMirror,
    0,
    1,
  )
  if (
    roughDamagedStrength <= 0 &&
    scuffedLowStrength <= 0 &&
    brushedBaselineStrength <= 0 &&
    fineSatinStrength <= 0 &&
    semiBrightStrength <= 0 &&
    nearMirrorStrength <= 0
  ) {
    return imageData
  }

  const resolvedLightVector = resolveSteelFinishLightVector({
    lightVector,
  })
  const normalizedLightX = resolvedLightVector.x
  const normalizedLightY = resolvedLightVector.y
  const normalizedLightZ = resolvedLightVector.z
  const horizontalLightStrength = Math.hypot(
    normalizedLightX,
    normalizedLightY,
  )
  const directionalLightStrength = smoothStep(
    0.08,
    0.78,
    horizontalLightStrength,
  )
  const macroLiftStrength = getSteelFinishStageWeightedValue(
    steelFinishMaps.stageUnits,
    {
      brushedBaseline: 0.58,
      fineSatin: 0.5,
      nearMirror: 0.98,
      roughDamaged: 0.2,
      scuffedLow: 0.3,
      semiBright: 0.82,
    },
  )
  const macroShadowStrength = getSteelFinishStageWeightedValue(
    steelFinishMaps.stageUnits,
    {
      brushedBaseline: 0.3,
      fineSatin: 0.28,
      nearMirror: 0.44,
      roughDamaged: 0.44,
      scuffedLow: 0.34,
      semiBright: 0.36,
    },
  )
  const macroDiffuseFloor = getSteelFinishStageWeightedValue(
    steelFinishMaps.stageUnits,
    {
      brushedBaseline: 0.86,
      fineSatin: 0.9,
      nearMirror: 0.82,
      roughDamaged: 0.82,
      scuffedLow: 0.86,
      semiBright: 0.84,
    },
  )
  const macroDiffuseCeiling = getSteelFinishStageWeightedValue(
    steelFinishMaps.stageUnits,
    {
      brushedBaseline: 1.14,
      fineSatin: 1.12,
      nearMirror: 1.32,
      roughDamaged: 1.05,
      scuffedLow: 1.08,
      semiBright: 1.25,
    },
  )
  const data = imageData.data
  const length = Math.min(
    steelFinishMaps.widthPixels * steelFinishMaps.heightPixels,
    normalInputs.widthPixels * normalInputs.heightPixels,
    imageData.width * imageData.height,
  )
  const heightSelfShadowMap = measureArtworkFrameMaterialPerformance(
    performance,
    'self-shadow-pass',
    () => buildArtworkFrameMaterialHeightSelfShadowMap({
      heightMap: normalInputs.steelHeight,
      heightPixels: normalInputs.heightPixels,
      lightVector: resolvedLightVector,
      maskMap: steelFinishMaps.steelMetalness,
      maxSteps: 4,
      strength: 0.32,
      widthPixels: normalInputs.widthPixels,
    }),
  )

  measureArtworkFrameMaterialPerformance(performance, 'final-shading', () => {
  for (let index = 0; index < length; index += 1) {
    const dataIndex = index * 4
    const alpha = data[dataIndex + 3] ?? 0

    if (alpha <= 0) {
      continue
    }

    const metalness = steelFinishMaps.steelMetalness[index] ?? 0
    const mask = metalness > 0 ? 1 : 0

    if (mask <= 0) {
      data[dataIndex + 3] = 0
      continue
    }

    const normalZ = normalInputs.normalZ[index] ?? 0

    if (normalZ <= 0) {
      data[dataIndex + 3] = 0
      continue
    }

    const normalX = normalInputs.normalX[index] ?? 0
    const normalY = normalInputs.normalY[index] ?? 0
    const anisotropy = steelFinishMaps.steelAnisotropy[index] ?? 0
    const anisotropyX = steelFinishMaps.steelAnisotropyDirectionX[index] ?? 0
    const anisotropyY = steelFinishMaps.steelAnisotropyDirectionY[index] ?? 0
    const anisotropyLength = Math.hypot(anisotropyX, anisotropyY) || 1
    const tangentX = anisotropyX / anisotropyLength
    const tangentY = anisotropyY / anisotropyLength
    const ao = steelFinishMaps.steelAmbientOcclusion[index] ?? 0
    const roughness = steelFinishMaps.steelRoughness[index] ?? 0
    const gloss = steelFinishMaps.steelGloss[index] ?? 0
    const cloud = steelFinishMaps.abrasionCloudMask[index] ?? 0
    const boundedCloud = smoothStep(0.18, 0.52, cloud) *
      (1 - smoothStep(0.82, 0.98, cloud))
    const machining = steelFinishMaps.machiningGrooveMask[index] ?? 0
    const scuffCrossRimLight =
      steelFinishMaps.scuffCrossScratchRimLightMask[index] ?? 0
    const scuffCrossRimShadow =
      steelFinishMaps.scuffCrossScratchRimShadowMask[index] ?? 0
    const grain = steelFinishMaps.brushedGrainMask[index] ?? 0
    const reflectionBand = clampNumber(
      (steelFinishMaps.polishedReflectionMask[index] ?? 0) /
        STEEL_FINISH_REFLECTION_MASK_OUTPUT_SCALE,
      0,
      1,
    )
    const haze = clampNumber(
      (steelFinishMaps.polishedHazeMask[index] ?? 0) /
        STEEL_FINISH_HAZE_MASK_OUTPUT_SCALE,
      0,
      1,
    )
    const visibleScratchShadow =
      steelFinishMaps.visibleScratchShadowMask[index] ?? 0
    const visibleGougeShadow =
      steelFinishMaps.visibleGougeShadowMask[index] ?? 0
    const visibleDentShadow =
      steelFinishMaps.visibleDentShadowMask[index] ?? 0
    const visiblePitShadow = steelFinishMaps.visiblePitShadowMask[index] ?? 0
    const visibleDefectShadow =
      steelFinishMaps.visibleDefectShadowMask[index] ?? 0
    const visibleScratchRimLight =
      steelFinishMaps.visibleScratchRimLightMask[index] ?? 0
    const visibleScratchRimShadow =
      steelFinishMaps.visibleScratchRimShadowMask[index] ?? 0
    const damage = visibleDefectShadow
    const visibleBurrRidge = steelFinishMaps.visibleBurrRidgeMask[index] ?? 0
    const rimCatch = clampNumber(
      visibleBurrRidge * 0.7 + visibleScratchRimLight * 0.18,
      0,
      1,
    )
    const normalLight = clampNumber(
      normalX * normalizedLightX +
        normalY * normalizedLightY +
        normalZ * normalizedLightZ,
      0,
      1,
    )
    const macroLighting = getArtworkFrameMaterialMacroLightingFactors({
      aspectRatio: coordinates.frameAspectRatio,
      lightVector: resolvedLightVector,
      position: getSteelFinishMacroLightingPosition({
        coordinates,
        index,
        width: imageData.width,
      }),
    })
    const macroDiffuse = clampNumber(
      1 + (macroLighting.macroDiffuse - 1) * macroLiftStrength,
      macroDiffuseFloor,
      macroDiffuseCeiling,
    )
    const macroShadow = macroLighting.macroShadow * macroShadowStrength
    const highPolishGrazingResponse = smoothStep(
      0.72,
      1,
      macroLighting.grazingStrength,
    )
    const highPolishLitSideEnergy = macroLighting.nearLightRamp *
      highPolishGrazingResponse *
      directionalLightStrength *
      gloss *
      (1 - roughness * 0.24)
    const highPolishShadowSideFalloff = macroLighting.farShadowRamp *
      highPolishGrazingResponse *
      directionalLightStrength *
      (0.48 + gloss * 0.52) *
      (1 - roughness * 0.16)
    const sideLight = clampNumber(
      normalX * normalizedLightX + normalY * normalizedLightY,
      -1,
      1,
    )
    const heightSelfShadow = heightSelfShadowMap[index] ?? 0
    const tangentLight = clampNumber(
      normalizedLightX * tangentX + normalizedLightY * tangentY,
      -1,
      1,
    )
    const acrossTangentLight = clampNumber(
      normalizedLightX * -tangentY + normalizedLightY * tangentX,
      -1,
      1,
    )
    const anisotropicSubstrateLighting =
      getSteelFinishAnisotropicSubstrateLighting({
        acrossTangentLight,
        anisotropy,
        directionalLightStrength,
        gloss,
        grain,
        haze,
        normalLight,
        reflectionBand,
        roughness,
        tangentLight,
      })
    const albedoIndex = index * 3
    const steelR = (steelFinishMaps.steelAlbedo[albedoIndex] ?? 0.45) * 255
    const steelG = (steelFinishMaps.steelAlbedo[albedoIndex + 1] ?? 0.48) * 255
    const steelB = (steelFinishMaps.steelAlbedo[albedoIndex + 2] ?? 0.5) * 255
    const diffuse = applySteelFinishMacroDiffuse(
      0.42 + normalLight * 0.46,
      macroDiffuse,
      macroShadow,
    )
    const cavityDarkness = clampNumber(
      ao * 0.66 +
        damage * 0.28 +
        machining * 0.1 +
        cloud * 0.14 +
        roughness * 0.08,
      0,
      0.9,
    )
    const cloudyValue = (cloud - 0.52) * 34 * roughDamagedStrength
    const weakSpecular = Math.pow(normalLight, 18) * gloss *
      (1 - roughness * 0.72) * 26
    const tornRim = Math.max(0, sideLight) * rimCatch *
      (1 - ao * 0.4) * 42
    const shadowRim = Math.max(0, -sideLight) * rimCatch * 26
    const roughDirectionalLift = macroLighting.nearLightRamp *
      directionalLightStrength * roughDamagedStrength * 24
    const roughDirectionalShadow = macroLighting.farShadowRamp *
      directionalLightStrength * roughDamagedStrength *
        (6 + macroLighting.grazingStrength * 22)
    const roughMidAngleShadowFill = macroLighting.farShadowRamp *
      (1 - macroLighting.grazingStrength) *
      directionalLightStrength *
      roughDamagedStrength *
      34
    const targetR = clampNumber(
      steelR * diffuse - cavityDarkness * 78 + cloudyValue +
        weakSpecular + anisotropicSubstrateLighting.coherentHighlight * 10 +
        anisotropicSubstrateLighting.diffuseBand * 0.18 +
        anisotropicSubstrateLighting.grainBand * 0.16 +
        tornRim - shadowRim - anisotropicSubstrateLighting.shadow * 0.16 +
        roughDirectionalLift - roughDirectionalShadow,
      32,
      206,
    ) + roughMidAngleShadowFill * 0.9
    const targetG = clampNumber(
      steelG * diffuse - cavityDarkness * 82 + cloudyValue * 0.96 +
        weakSpecular + anisotropicSubstrateLighting.coherentHighlight * 10 +
        anisotropicSubstrateLighting.diffuseBand * 0.18 +
        anisotropicSubstrateLighting.grainBand * 0.15 +
        tornRim * 0.96 - shadowRim - anisotropicSubstrateLighting.shadow * 0.16 +
        roughDirectionalLift * 0.98 - roughDirectionalShadow,
      36,
      212,
    ) + roughMidAngleShadowFill * 0.96
    const targetB = clampNumber(
      steelB * diffuse - cavityDarkness * 86 + cloudyValue * 0.9 +
        weakSpecular * 0.92 +
        anisotropicSubstrateLighting.coherentHighlight * 9 +
        anisotropicSubstrateLighting.diffuseBand * 0.16 +
        anisotropicSubstrateLighting.grainBand * 0.13 +
        tornRim * 0.88 - shadowRim - anisotropicSubstrateLighting.shadow * 0.14 +
        roughDirectionalLift * 0.92 - roughDirectionalShadow,
      42,
      218,
    ) + roughMidAngleShadowFill
    const response = roughDamagedStrength * mask

    let shadedR = interpolate(data[dataIndex] ?? 0, targetR, response)
    let shadedG = interpolate(data[dataIndex + 1] ?? 0, targetG, response)
    let shadedB = interpolate(data[dataIndex + 2] ?? 0, targetB, response)

    if (scuffedLowStrength > 0) {
      const scuffedProgress = smoothStep(0.10, 0.30, steelFinishMaps.polishUnit)
      const polish10Overlap = scuffedLowStrength *
        smoothStep(0.07, 0.10, steelFinishMaps.polishUnit) *
        (1 - smoothStep(0.16, 0.24, steelFinishMaps.polishUnit))
      const polish25Overlap = scuffedLowStrength *
        smoothStep(0.18, 0.235, steelFinishMaps.polishUnit) *
        (1 - smoothStep(0.30, 0.36, steelFinishMaps.polishUnit))
      const polish30Handoff = scuffedLowStrength *
        smoothStep(0.265, 0.30, steelFinishMaps.polishUnit)
      const scuffDiffuse = applySteelFinishMacroDiffuse(
        0.66 + normalLight * 0.2,
        macroDiffuse,
        macroShadow,
      )
      const sheetLift = scuffedLowStrength *
        (7 + boundedCloud * interpolate(5, 10, scuffedProgress)) *
        (1 - polish10Overlap * 0.12) *
        (1 - polish30Handoff * 0.16)
      const scuffCavity = clampNumber(
        ao * interpolate(28, 18, scuffedProgress) +
          damage * interpolate(14, 8, scuffedProgress) +
          scuffCrossRimShadow * interpolate(42, 30, scuffedProgress) +
          boundedCloud * (3 + polish10Overlap * 5.5) +
          cloud * polish10Overlap * 1.5 +
          polish25Overlap * (0.3 + boundedCloud * 0.4) -
          polish30Handoff * (1.4 + boundedCloud * 0.7),
        0,
        68,
      )
      const scuffRimHighlight = Math.max(0, sideLight) *
        scuffCrossRimLight * interpolate(38, 26, scuffedProgress) *
        (1 - polish10Overlap * 0.28) *
        (1 - polish30Handoff * 0.24)
      const scuffRimShadow = Math.max(0, -sideLight) *
        scuffCrossRimShadow * interpolate(26, 18, scuffedProgress) *
        (1 - polish10Overlap * 0.14) *
        (1 - polish30Handoff * 0.3)
      const softSheen = Math.pow(normalLight, interpolate(9, 15, scuffedProgress)) *
        gloss * (1 - roughness * 0.5) *
        interpolate(8, 16, scuffedProgress) *
        (1 - polish10Overlap * 0.3) *
        (1 + polish25Overlap * 0.16) +
        anisotropicSubstrateLighting.coherentHighlight *
          interpolate(5, 9, scuffedProgress)
      const scuffedSubstrateBand =
        anisotropicSubstrateLighting.diffuseBand *
          interpolate(0.12, 0.26, scuffedProgress) +
        anisotropicSubstrateLighting.grainBand *
          interpolate(0.08, 0.18, scuffedProgress) -
        anisotropicSubstrateLighting.shadow *
          interpolate(0.12, 0.2, scuffedProgress)
      const scuffedBase = interpolate(118, 134, scuffedProgress) +
        boundedCloud * interpolate(1.5, 4.5, scuffedProgress) -
        cloud * interpolate(2, 5, scuffedProgress) -
        boundedCloud * polish10Overlap * 2.4 +
        polish10Overlap * 2.2 -
        polish25Overlap * 2.2
      const scuffedTargetR = clampNumber(
        scuffedBase * 0.9 * scuffDiffuse +
          scuffedSubstrateBand * 0.9 +
          sheetLift -
          scuffCavity +
          scuffRimHighlight -
          scuffRimShadow +
          softSheen,
        34,
        220,
      )
      const scuffedTargetG = clampNumber(
        scuffedBase * 0.96 * scuffDiffuse +
          scuffedSubstrateBand * 0.96 +
          sheetLift * 0.98 -
          scuffCavity * 1.02 +
          scuffRimHighlight * 0.96 -
          scuffRimShadow +
          softSheen,
        38,
        224,
      )
      const scuffedTargetB = clampNumber(
        scuffedBase * scuffDiffuse +
          scuffedSubstrateBand +
          sheetLift * 0.92 -
          scuffCavity * 1.08 +
          scuffRimHighlight * 0.9 -
          scuffRimShadow +
          softSheen * 0.9,
        42,
        228,
      )
      const scuffResponse = (
        scuffedLowStrength * mask * (1 - polish30Handoff * 0.34)
      )

      shadedR = interpolate(shadedR, scuffedTargetR, scuffResponse)
      shadedG = interpolate(shadedG, scuffedTargetG, scuffResponse)
      shadedB = interpolate(shadedB, scuffedTargetB, scuffResponse)
    }

    if (brushedBaselineStrength > 0) {
      const brushedProgress = smoothStep(0.28, 0.58, steelFinishMaps.polishUnit)
      const polish30BrushedHandoff = brushedBaselineStrength *
        smoothStep(0.28, 0.30, steelFinishMaps.polishUnit) *
        (1 - smoothStep(0.42, 0.5, steelFinishMaps.polishUnit))
      const brushedResponse = brushedBaselineStrength *
        (1 - scuffedLowStrength * interpolate(
          0.36,
          0.26,
          polish30BrushedHandoff,
        ))
      const anisotropicStretch = anisotropicSubstrateLighting.lobe *
        interpolate(0.92, 1.16, brushedProgress)
      const broadBand =
        anisotropicSubstrateLighting.diffuseBand *
          interpolate(0.92, 1.12, brushedProgress) +
        (reflectionBand - 0.5) * interpolate(7, 4, brushedProgress)
      const grainContrast = (grain - 0.52) *
        interpolate(30, 22, brushedProgress) *
        (1 + polish30BrushedHandoff * 0.16) +
        anisotropicSubstrateLighting.grainBand *
          interpolate(0.82, 0.54, brushedProgress)
      const hairlineShadow = grain * ao * interpolate(22, 16, brushedProgress) *
        (1 + polish30BrushedHandoff * 0.08)
      const scratchShadow = clampNumber(
        visibleScratchShadow * 0.24 +
          visiblePitShadow * interpolate(0.1, 0.035, polish30BrushedHandoff),
        0,
        1,
      ) * interpolate(26, 18, brushedProgress)
      const rimResponse = Math.max(0, sideLight) *
        visibleScratchRimLight *
        interpolate(12, 8, brushedProgress)
      const rimShadow = Math.max(0, -sideLight) *
        visibleScratchRimShadow *
        interpolate(10, 7, brushedProgress)
      const softSpecular = Math.pow(
        clampNumber(
          normalLight * 0.62 + anisotropicStretch * 0.38,
          0,
          1,
        ),
        interpolate(7, 11, brushedProgress),
      ) * gloss * (1 - roughness * 0.42) *
        interpolate(18, 24, brushedProgress) +
        anisotropicSubstrateLighting.coherentHighlight *
          interpolate(26, 38, brushedProgress)
      const tangentShade = tangentLight * grain *
        interpolate(5, 3.2, brushedProgress) -
        anisotropicSubstrateLighting.shadow *
          interpolate(0.58, 0.38, brushedProgress)
      const brushedBase = 166 + interpolate(4, 14, brushedProgress)
      const brushedDiffuse = applySteelFinishMacroDiffuse(
        0.66 + normalLight * 0.28,
        macroDiffuse,
        macroShadow,
      )
      const brushedTargetR = clampNumber(
        brushedBase * 0.9 * brushedDiffuse +
          broadBand +
          grainContrast -
          hairlineShadow -
          scratchShadow +
          rimResponse -
          rimShadow +
          softSpecular +
          tangentShade,
        34,
        226,
      )
      const brushedTargetG = clampNumber(
        brushedBase * 0.96 * brushedDiffuse +
          broadBand * 0.98 +
          grainContrast * 0.96 -
          hairlineShadow * 1.02 -
          scratchShadow * 1.04 +
          rimResponse * 0.96 -
          rimShadow +
          softSpecular +
          tangentShade * 0.96,
        38,
        230,
      )
      const brushedTargetB = clampNumber(
        brushedBase * brushedDiffuse +
          broadBand * 0.94 +
          grainContrast * 0.92 -
          hairlineShadow * 1.08 -
          scratchShadow * 1.1 +
          rimResponse * 0.9 -
          rimShadow +
          softSpecular * 0.92 +
          tangentShade * 0.9,
        42,
        234,
      )

      shadedR = interpolate(shadedR, brushedTargetR, brushedResponse)
      shadedG = interpolate(shadedG, brushedTargetG, brushedResponse)
      shadedB = interpolate(shadedB, brushedTargetB, brushedResponse)
    }

    if (fineSatinStrength > 0) {
      const satinProgress = smoothStep(0.54, 0.76, steelFinishMaps.polishUnit)
      const satinResponse = fineSatinStrength *
        (0.76 + satinProgress * 0.14)
      const anisotropicStretch = Math.pow(
        1 - Math.abs(acrossTangentLight),
        interpolate(1.1, 1.45, satinProgress),
      ) * anisotropy * directionalLightStrength * 0.45 +
        anisotropicSubstrateLighting.lobe *
          interpolate(0.68, 0.48, satinProgress)
      const diffuseBand =
        anisotropicSubstrateLighting.diffuseBand *
          interpolate(0.54, 0.38, satinProgress) +
        (reflectionBand - 0.42) * interpolate(10, 8, satinProgress) +
        (haze - 0.5) * interpolate(8, 12, satinProgress)
      const grainVeil = (grain - 0.52) *
        interpolate(12, 6, satinProgress) +
        anisotropicSubstrateLighting.grainBand *
          interpolate(0.38, 0.22, satinProgress)
      const grainShadow = grain * ao * interpolate(14, 7, satinProgress)
      const satinDamageShadow = clampNumber(
        visibleScratchShadow * 0.18 +
          visibleGougeShadow * 0.28 +
          visibleDentShadow * 0.12 +
          visiblePitShadow * 0.18,
        0,
        1,
      ) * interpolate(18, 10, satinProgress)
      const rimResponse = Math.max(0, sideLight) *
        visibleScratchRimLight *
        interpolate(9, 5, satinProgress)
      const rimShadow = Math.max(0, -sideLight) *
        visibleScratchRimShadow *
        interpolate(8, 4, satinProgress)
      const broadSheen = Math.pow(
        clampNumber(
          normalLight * 0.5 + anisotropicStretch * 0.5,
          0,
          1,
        ),
        interpolate(4.5, 6.5, satinProgress),
      ) * gloss * (1 - roughness * 0.28) *
        interpolate(18, 28, satinProgress) +
        anisotropicSubstrateLighting.coherentHighlight *
          interpolate(18, 25, satinProgress)
      const softHaze = haze * gloss * interpolate(8, 14, satinProgress)
      const tangentShade = tangentLight * grain *
        interpolate(2.4, 1.3, satinProgress) -
        anisotropicSubstrateLighting.shadow *
          interpolate(0.28, 0.16, satinProgress)
      const satinDirectionalLift = highPolishLitSideEnergy *
        interpolate(9, 16, satinProgress)
      const satinDirectionalFalloff = highPolishShadowSideFalloff *
        interpolate(7, 13, satinProgress)
      const satinBase = interpolate(166, 176, satinProgress)
      const satinDiffuse = applySteelFinishMacroDiffuse(
        0.68 + normalLight * 0.22,
        macroDiffuse,
        macroShadow,
      )
      const satinTargetR = clampNumber(
        satinBase * 0.9 * satinDiffuse +
          diffuseBand +
          grainVeil -
          grainShadow -
          satinDamageShadow +
          rimResponse -
          rimShadow +
          broadSheen +
          softHaze +
          tangentShade +
          satinDirectionalLift -
          satinDirectionalFalloff,
        44,
        232,
      )
      const satinTargetG = clampNumber(
        satinBase * 0.96 * satinDiffuse +
          diffuseBand * 0.98 +
          grainVeil * 0.96 -
          grainShadow * 1.02 -
          satinDamageShadow * 1.03 +
          rimResponse * 0.96 -
          rimShadow +
          broadSheen +
          softHaze * 0.98 +
          tangentShade * 0.96 +
          satinDirectionalLift * 0.98 -
          satinDirectionalFalloff * 1.02,
        48,
        236,
      )
      const satinTargetB = clampNumber(
        satinBase * satinDiffuse +
          diffuseBand * 0.94 +
          grainVeil * 0.92 -
          grainShadow * 1.06 -
          satinDamageShadow * 1.08 +
          rimResponse * 0.9 -
          rimShadow +
          broadSheen * 0.94 +
          softHaze * 0.92 +
          tangentShade * 0.9 +
          satinDirectionalLift * 0.94 -
          satinDirectionalFalloff * 1.06,
        52,
        240,
      )

      shadedR = interpolate(shadedR, satinTargetR, satinResponse)
      shadedG = interpolate(shadedG, satinTargetG, satinResponse)
      shadedB = interpolate(shadedB, satinTargetB, satinResponse)
    }

    if (semiBrightStrength > 0) {
      const semiBrightProgress = smoothStep(
        0.72,
        0.92,
        steelFinishMaps.polishUnit,
      )
      const semiBrightEndpointResponse = smoothStep(
        0.78,
        0.85,
        steelFinishMaps.polishUnit,
      ) * (1 - smoothStep(0.9, 0.98, steelFinishMaps.polishUnit))
      const semiBrightResponse = semiBrightStrength *
        (0.8 + semiBrightProgress * 0.12)
      const anisotropicStretch = Math.pow(
        1 - Math.abs(acrossTangentLight),
        interpolate(0.74, 0.92, semiBrightProgress),
      ) * anisotropy * directionalLightStrength
      const broadReflection = (
        reflectionBand *
          interpolate(0.62, 0.78, semiBrightProgress) *
          (1 + semiBrightEndpointResponse * 0.12) +
        haze *
          interpolate(0.38, 0.54, semiBrightProgress) *
          (1 + semiBrightEndpointResponse * 0.2)
      ) / interpolate(1, 1.2, semiBrightProgress)
      const veil = (broadReflection - 0.42) *
        interpolate(34, 46, semiBrightProgress) *
        (1 + semiBrightEndpointResponse * 0.12)
      const coherentSheen = Math.pow(
        clampNumber(
          normalLight * interpolate(0.42, 0.36, semiBrightProgress) +
            anisotropicStretch * interpolate(0.58, 0.64, semiBrightProgress),
          0,
          1,
        ),
        interpolate(3.2, 4.4, semiBrightProgress),
      ) * gloss * (1 - roughness * 0.18) *
        interpolate(42, 58, semiBrightProgress) *
        (1 + semiBrightEndpointResponse * 0.12)
      const residualGrain = (grain - 0.5) *
        interpolate(7, 3.5, semiBrightProgress) *
        (1 - semiBrightEndpointResponse * 0.18)
      const residualScratchShadow = clampNumber(
        visibleScratchShadow * 0.08 +
          visibleGougeShadow * 0.1 +
          visibleDentShadow * 0.04 +
          visiblePitShadow * 0.08,
        0,
        1,
      ) * interpolate(7, 4, semiBrightProgress)
      const residualRim = Math.max(0, sideLight) *
        visibleScratchRimLight *
        interpolate(3.6, 2, semiBrightProgress)
      const broadHaze = haze * gloss * interpolate(13, 22, semiBrightProgress)
      const tangentShade = tangentLight * grain *
        interpolate(1.8, 0.8, semiBrightProgress)
      const semiBrightBase = interpolate(180, 190, semiBrightProgress)
      const reflectedWarmth = clampNumber(
        broadReflection - 0.52,
        0,
        1,
      ) * interpolate(5, 11, semiBrightProgress) * semiBrightEndpointResponse
      const reflectedCoolness = clampNumber(
        0.58 - broadReflection + haze * 0.18,
        0,
        1,
      ) * interpolate(3, 7, semiBrightProgress) * semiBrightEndpointResponse
      const semiBrightDiffuse = applySteelFinishMacroDiffuse(
        0.7 + normalLight * 0.18,
        macroDiffuse,
        macroShadow,
      )
      const semiBrightDirectionalLift = highPolishLitSideEnergy *
        interpolate(18, 32, semiBrightProgress) *
        (1 + semiBrightEndpointResponse * 0.16)
      const semiBrightDirectionalFalloff = highPolishShadowSideFalloff *
        interpolate(14, 25, semiBrightProgress) *
        (1 + semiBrightEndpointResponse * 0.18)
      const semiBrightTargetR = clampNumber(
        semiBrightBase * 0.9 * semiBrightDiffuse +
          veil +
          residualGrain -
          residualScratchShadow +
          residualRim +
          coherentSheen +
          broadHaze +
          tangentShade +
          reflectedWarmth -
          reflectedCoolness * 0.12 +
          semiBrightDirectionalLift -
          semiBrightDirectionalFalloff,
        52,
        238,
      )
      const semiBrightTargetG = clampNumber(
        semiBrightBase * 0.96 * semiBrightDiffuse +
          veil * 0.98 +
          residualGrain * 0.96 -
          residualScratchShadow * 1.02 +
          residualRim * 0.96 +
          coherentSheen +
          broadHaze * 0.98 +
          tangentShade * 0.96 +
          reflectedWarmth * 0.42 +
          reflectedCoolness * 0.18 +
          semiBrightDirectionalLift * 0.98 -
          semiBrightDirectionalFalloff * 1.02,
        56,
        242,
      )
      const semiBrightTargetB = clampNumber(
        semiBrightBase * semiBrightDiffuse +
          veil * 0.94 +
          residualGrain * 0.92 -
          residualScratchShadow * 1.08 +
          residualRim * 0.9 +
          coherentSheen * 0.94 +
          broadHaze * 0.92 +
          tangentShade * 0.9 -
          reflectedWarmth * 0.12 +
          reflectedCoolness +
          semiBrightDirectionalLift * 0.94 -
          semiBrightDirectionalFalloff * 1.06,
        60,
        246,
      )

      shadedR = interpolate(shadedR, semiBrightTargetR, semiBrightResponse)
      shadedG = interpolate(shadedG, semiBrightTargetG, semiBrightResponse)
      shadedB = interpolate(shadedB, semiBrightTargetB, semiBrightResponse)
    }

    if (nearMirrorStrength > 0) {
      const nearMirrorProgress = smoothStep(
        0.88,
        1,
        steelFinishMaps.polishUnit,
      )
      const nearMirrorEndpointResponse = smoothStep(
        0.92,
        1,
        steelFinishMaps.polishUnit,
      )
      const nearMirrorResponse = nearMirrorStrength *
        (0.84 + nearMirrorProgress * 0.14)
      const anisotropicStretch = Math.pow(
        1 - Math.abs(acrossTangentLight),
        interpolate(0.52, 0.68, nearMirrorProgress),
      ) * anisotropy * directionalLightStrength
      const coherentReflection = (
        reflectionBand *
          interpolate(0.66, 0.74, nearMirrorProgress) *
          (1 - nearMirrorEndpointResponse * 0.08) +
        haze *
          interpolate(0.48, 0.58, nearMirrorProgress) *
          (1 + nearMirrorEndpointResponse * 0.18)
      ) / interpolate(1.16, 1.34, nearMirrorProgress)
      const reflectionVeil = (coherentReflection - 0.38) *
        interpolate(46, 58, nearMirrorProgress) *
        (1 + nearMirrorEndpointResponse * 0.08)
      const specularSource = clampNumber(
        normalLight * interpolate(0.3, 0.26, nearMirrorProgress) +
          anisotropicStretch * interpolate(0.7, 0.74, nearMirrorProgress),
        0,
        1,
      )
      const broadSheen = Math.pow(
        specularSource,
        interpolate(4.8, 6.8, nearMirrorProgress),
      ) * gloss * (1 - roughness * 0.08) *
        interpolate(68, 86, nearMirrorProgress)
      const cleanGlint = Math.pow(
        specularSource,
        interpolate(14, 22, nearMirrorProgress),
      ) * gloss * (1 - roughness * 0.2) *
        interpolate(8, 14, nearMirrorProgress) *
        (1 - nearMirrorEndpointResponse * 0.68)
      const residualGrain = (grain - 0.5) *
        interpolate(2.6, 1.2, nearMirrorProgress) *
        (1 - nearMirrorEndpointResponse * 0.35)
      const residualDefect = clampNumber(
        visibleScratchShadow * 0.08 +
          visibleGougeShadow * 0.06 +
          visibleDentShadow * 0.025 +
          visiblePitShadow * 0.05,
        0,
        1,
      ) * (1 - nearMirrorEndpointResponse * 0.85)
      const residualScratchShadow = residualDefect *
        interpolate(3.4, 1.9, nearMirrorProgress)
      const residualRim = Math.max(0, sideLight) *
        visibleScratchRimLight *
        interpolate(0.8, 0.35, nearMirrorProgress) *
        (1 - nearMirrorEndpointResponse * 0.8)
      const rimShadow = Math.max(0, -sideLight) *
        visibleScratchRimShadow *
        interpolate(0.75, 0.32, nearMirrorProgress) *
        (1 - nearMirrorEndpointResponse * 0.8)
      const subtleHaze = haze * gloss *
        interpolate(20, 30, nearMirrorProgress) *
        (1 + nearMirrorEndpointResponse * 0.12)
      const tangentShade = tangentLight * grain *
        interpolate(0.7, 0.25, nearMirrorProgress) *
        (1 - nearMirrorEndpointResponse * 0.35)
      const mirrorBase = interpolate(188, 198, nearMirrorProgress)
      const mirrorDiffuse = applySteelFinishMacroDiffuse(
        0.7 + normalLight * 0.14,
        macroDiffuse,
        macroShadow,
      )
      const mirrorDirectionalLift = highPolishLitSideEnergy *
        interpolate(26, 46, nearMirrorProgress) *
        (1 + nearMirrorEndpointResponse * 0.22)
      const mirrorDirectionalFalloff = highPolishShadowSideFalloff *
        interpolate(18, 34, nearMirrorProgress) *
        (1 + nearMirrorEndpointResponse * 0.24)
      const mirrorTargetR = clampNumber(
        mirrorBase * 0.9 * mirrorDiffuse +
          reflectionVeil +
          residualGrain -
          residualScratchShadow +
          residualRim -
          rimShadow +
          broadSheen +
          cleanGlint +
          subtleHaze +
          tangentShade +
          mirrorDirectionalLift -
          mirrorDirectionalFalloff,
        58,
        246,
      )
      const mirrorTargetG = clampNumber(
        mirrorBase * 0.96 * mirrorDiffuse +
          reflectionVeil * 0.98 +
          residualGrain * 0.96 -
          residualScratchShadow * 1.02 +
          residualRim * 0.96 -
          rimShadow +
          broadSheen +
          cleanGlint +
          subtleHaze * 0.98 +
          tangentShade * 0.96 +
          mirrorDirectionalLift * 0.98 -
          mirrorDirectionalFalloff * 1.02,
        62,
        250,
      )
      const mirrorTargetB = clampNumber(
        mirrorBase * mirrorDiffuse +
          reflectionVeil * 0.94 +
          residualGrain * 0.9 -
          residualScratchShadow * 1.08 +
          residualRim * 0.9 -
          rimShadow +
          broadSheen * 0.94 +
          cleanGlint * 0.9 +
          subtleHaze * 0.9 +
          tangentShade * 0.9 +
          mirrorDirectionalLift * 0.94 -
          mirrorDirectionalFalloff * 1.06,
        66,
        252,
      )

      shadedR = interpolate(shadedR, mirrorTargetR, nearMirrorResponse)
      shadedG = interpolate(shadedG, mirrorTargetG, nearMirrorResponse)
      shadedB = interpolate(shadedB, mirrorTargetB, nearMirrorResponse)
    }

    const selfShadowMacroMultiplier =
      getArtworkFrameMaterialHeightSelfShadowMacroMultiplier({
        farShadowRamp: macroLighting.farShadowRamp,
        grazingStrength: macroLighting.grazingStrength,
      })
    const selfShadowReceiver = getArtworkFrameSteelFinishSelfShadowReceiver(
      steelFinishMaps,
      index,
    )
    const selfShadowDarkening = heightSelfShadow *
      selfShadowReceiver *
      selfShadowMacroMultiplier *
      (28 + roughness * 14 + damage * 10) *
      (1 - gloss * 0.18)

    shadedR = clampNumber(shadedR - selfShadowDarkening * 0.94, 0, 255)
    shadedG = clampNumber(shadedG - selfShadowDarkening * 0.98, 0, 255)
    shadedB = clampNumber(shadedB - selfShadowDarkening, 0, 255)

    data[dataIndex] = Math.round(shadedR)
    data[dataIndex + 1] = Math.round(shadedG)
    data[dataIndex + 2] = Math.round(shadedB)
  }
  })

  return imageData
}
