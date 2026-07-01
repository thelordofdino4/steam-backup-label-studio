export const ARTWORK_FRAME_STEEL_DEFECT_KINDS = [
  'scratch',
  'gouge',
  'dent',
  'pit',
  'scuff',
  'burrNick',
] as const

export type ArtworkFrameSteelDefectKind =
  typeof ARTWORK_FRAME_STEEL_DEFECT_KINDS[number]

export type ArtworkFrameSteelDefectKindRecord<T> = {
  [Kind in ArtworkFrameSteelDefectKind]: T
}

export const ARTWORK_FRAME_STEEL_DEFECT_STAGE_FAMILIES = [
  'roughDamage',
  'lowPolishScuff',
  'brushedHairline',
  'satinResidual',
  'polishedMicro',
] as const

export type ArtworkFrameSteelDefectStageFamily =
  typeof ARTWORK_FRAME_STEEL_DEFECT_STAGE_FAMILIES[number]

export const ARTWORK_FRAME_STEEL_DEFECT_MAP_ROLE_NAMES = {
  activeDecalBodies: 'activeDecalBodyMaps',
  activePhysicalContributions: 'activePhysicalContributionMaps',
  stablePlacementCandidates: 'stablePlacementCandidateMaps',
} as const

export type ArtworkFrameSteelDefectMapRole =
  typeof ARTWORK_FRAME_STEEL_DEFECT_MAP_ROLE_NAMES[
    keyof typeof ARTWORK_FRAME_STEEL_DEFECT_MAP_ROLE_NAMES
  ]

export const ARTWORK_FRAME_STEEL_DEFECT_STABLE_PLACEMENT_CHANNELS = [
  'candidateMask',
  'centerlineMask',
  'tangentX',
  'tangentY',
  'sizeClass',
  'depthLimit',
  'edgeRoughness',
  'stageAffinity',
] as const

export type ArtworkFrameSteelDefectStablePlacementChannel =
  typeof ARTWORK_FRAME_STEEL_DEFECT_STABLE_PLACEMENT_CHANNELS[number]

export const ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS = [
  'presenceMask',
  'bodyMask',
  'coreMask',
  'edgeMask',
] as const

export type ArtworkFrameSteelDefectActiveBodyChannel =
  typeof ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS[number]

export const ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS = [
  'albedoResponse',
  'height',
  'ambientOcclusion',
  'normalStrength',
  'rimLight',
  'rimShadow',
  'roughnessResponse',
  'glossResponse',
  'selfShadowReceiver',
] as const

export type ArtworkFrameSteelDefectPhysicalContributionChannel =
  typeof ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS[number]

// Current renderer channels with names like Trough/Pocket remain transition
// fields only. New decal maps use placement/body/contribution naming instead.
export const ARTWORK_FRAME_STEEL_DEFECT_LEGACY_TRANSITION_CHANNELS = [
  'scratchTroughMask',
  'scratchRimLightMask',
  'scratchRimShadowMask',
  'gougeTroughMask',
  'dentPocketMask',
  'pitPocketMask',
  'burrRidgeMask',
  'scuffCrossScratchTroughMask',
  'scuffCrossScratchRimLightMask',
  'scuffCrossScratchRimShadowMask',
] as const

export type ArtworkFrameSteelDefectLegacyTransitionChannel =
  typeof ARTWORK_FRAME_STEEL_DEFECT_LEGACY_TRANSITION_CHANNELS[number]

export type ArtworkFrameSteelDefectStablePlacementCandidateMaps = {
  [Channel in ArtworkFrameSteelDefectStablePlacementChannel]: Float32Array
}

export type ArtworkFrameSteelDefectActiveDecalBodyMaps = {
  [Channel in ArtworkFrameSteelDefectActiveBodyChannel]: Float32Array
}

export type ArtworkFrameSteelDefectActivePhysicalContributionMaps = {
  [Channel in ArtworkFrameSteelDefectPhysicalContributionChannel]: Float32Array
}

export type ArtworkFrameSteelDefectActiveBodyResponse = {
  bodyStrength: number
  coreStrength: number
  edgeStrength: number
  presence: number
}

export type ArtworkFrameSteelDefectActiveBodySample = {
  bodyMask?: number
  coreMask?: number
  edgeMask?: number
  presenceMask?: number
}

export type ArtworkFrameSteelDefectPhysicalContributionResponse = {
  albedoResponse: number
  ambientOcclusion: number
  glossResponse: number
  height: number
  normalStrength: number
  rimLight: number
  rimShadow: number
  roughnessResponse: number
  selfShadowReceiver: number
}

export type ArtworkFrameSteelDefectLowPolishResponseScalars = {
  albedoResponseScale: number
  ambientOcclusionScale: number
  glossResponseScale: number
  heightScale: number
  normalStrengthScale: number
  rimLightScale: number
  rimShadowScale: number
  roughnessResponseScale: number
  selfShadowReceiverScale: number
}

export type GetArtworkFrameSteelDefectActiveBodyResponseInput = {
  depthLimit?: number
  edgeRoughness?: number
  kind: ArtworkFrameSteelDefectKind
  metalPolish: number
  sizeClass?: number
  stageFamily: ArtworkFrameSteelDefectStageFamily
}

export type GetArtworkFrameSteelDefectPhysicalContributionResponseInput = {
  activeBody: ArtworkFrameSteelDefectActiveBodySample
  depthLimit?: number
  edgeRoughness?: number
  kind: ArtworkFrameSteelDefectKind
  metalPolish: number
  sizeClass?: number
  stageFamily?: ArtworkFrameSteelDefectStageFamily
}

export type GetArtworkFrameSteelDefectLowPolishResponseScalarsInput = {
  activeBody: ArtworkFrameSteelDefectActiveBodySample
  kind: ArtworkFrameSteelDefectKind
  metalPolish: number
  stageFamily?: ArtworkFrameSteelDefectStageFamily
}

export type ArtworkFrameSteelDefectPlacement = {
  centerX: number
  centerY: number
  edgeRoughness: number
  id: string
  internalBreakup?: number
  kind: ArtworkFrameSteelDefectKind
  length: number
  maxDepth: number
  microScratchCount?: number
  secondaryTangentX?: number
  secondaryTangentY?: number
  seed: number
  stageFamily: ArtworkFrameSteelDefectStageFamily
  tangentX: number
  tangentY: number
  taper: number
  waviness: number
  width: number
}

export type ArtworkFrameSteelDefectPlacementRingBand = {
  maxX: number
  maxY: number
  minX: number
  minY: number
  weight?: number
}

export type ArtworkFrameSteelDefectPlacementFrameRingCoordinates = {
  coordinateSpace: 'canonical-frame-ring-v1' | string
  frameShape: string
  frameStyle: string
  normalizedRingBands?: readonly ArtworkFrameSteelDefectPlacementRingBand[]
  ringKey: string
}

export type ArtworkFrameSteelDefectPlacementMaterialIdentity = {
  metalType: string
}

export type ArtworkFrameSteelDefectPlacementBrushDirection = {
  angleDegrees: number
  tangentX: number
  tangentY: number
}

export type CreateArtworkFrameSteelDefectPlacementSetInput = {
  brushDirection?: ArtworkFrameSteelDefectPlacementBrushDirection | null
  frameRingCoordinates: ArtworkFrameSteelDefectPlacementFrameRingCoordinates
  geometrySeedKey: string
  materialIdentity: ArtworkFrameSteelDefectPlacementMaterialIdentity
}

export type ArtworkFrameSteelDefectPlacementSet = {
  generatorVersion: 'steel-defect-placement-v1'
  geometrySeedKey: string
  placements: readonly ArtworkFrameSteelDefectPlacement[]
  randomStreamSeed32: number
}

export type ArtworkFrameSteelDefectDecalMapSize = {
  heightPixels: number
  widthPixels: number
}

export type CreateArtworkFrameSteelEmptyDefectDecalMapsInput =
  ArtworkFrameSteelDefectDecalMapSize & {
    frameMask?: Float32Array | null
  }

export type RasterizeArtworkFrameSteelDefectStablePlacementMapsInput =
  CreateArtworkFrameSteelEmptyDefectDecalMapsInput & {
    placementSet: ArtworkFrameSteelDefectPlacementSet
  }

export type ActivateArtworkFrameSteelDefectActiveBodyMapsInput = {
  defectDecalMaps: ArtworkFrameSteelDefectDecalMapSet
  frameMask?: Float32Array | null
  metalPolish: number
}

export type PopulateArtworkFrameSteelDefectPhysicalContributionMapsInput = {
  defectDecalMaps: ArtworkFrameSteelDefectDecalMapSet
  frameMask?: Float32Array | null
  metalPolish: number
}

export type ArtworkFrameSteelDefectDecalMapSet = {
  activeBodies: ArtworkFrameSteelDefectKindRecord<
    ArtworkFrameSteelDefectActiveDecalBodyMaps
  >
  heightPixels: number
  physicalContributions: ArtworkFrameSteelDefectKindRecord<
    ArtworkFrameSteelDefectActivePhysicalContributionMaps
  >
  stablePlacement: ArtworkFrameSteelDefectKindRecord<
    ArtworkFrameSteelDefectStablePlacementCandidateMaps
  >
  widthPixels: number
}

export function createArtworkFrameSteelDefectKindRecord<T>(
  createValue: (kind: ArtworkFrameSteelDefectKind) => T,
): ArtworkFrameSteelDefectKindRecord<T> {
  return Object.fromEntries(
    ARTWORK_FRAME_STEEL_DEFECT_KINDS.map((kind) => [
      kind,
      createValue(kind),
    ]),
  ) as ArtworkFrameSteelDefectKindRecord<T>
}

export function isArtworkFrameSteelDefectLegacyTransitionChannel(
  channel: string,
): channel is ArtworkFrameSteelDefectLegacyTransitionChannel {
  return (
    ARTWORK_FRAME_STEEL_DEFECT_LEGACY_TRANSITION_CHANNELS as readonly string[]
  ).includes(channel)
}

function hashString(value: string) {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

function hashUnit(seed: number, salt: number) {
  let hash = seed >>> 0

  hash ^= Math.imul(salt + 0x9e3779b9, 0x85ebca6b)
  hash ^= hash >>> 15
  hash = Math.imul(hash, 0x2c1b3c6d)
  hash ^= hash >>> 12
  hash = Math.imul(hash, 0x297a2d39)
  hash ^= hash >>> 15

  return (hash >>> 0) / 4294967295
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function interpolate(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function normalizePolishUnit(metalPolish: number) {
  if (!Number.isFinite(metalPolish)) {
    return 0
  }

  return clampNumber(metalPolish, 0, 100) / 100
}

function smoothstep(edge0: number, edge1: number, value: number) {
  if (edge1 <= edge0) {
    return value >= edge1 ? 1 : 0
  }

  const unit = clampNumber((value - edge0) / (edge1 - edge0), 0, 1)

  return unit * unit * (3 - 2 * unit)
}

function smoothPulse(
  value: number,
  fadeInStart: number,
  fullStart: number,
  fullEnd: number,
  fadeOutEnd: number,
) {
  if (value < fadeInStart || value >= fadeOutEnd) {
    return 0
  }

  if (value < fullStart) {
    return smoothstep(fadeInStart, fullStart, value)
  }

  if (value <= fullEnd) {
    return 1
  }

  return 1 - smoothstep(fullEnd, fadeOutEnd, value)
}

const STEEL_DEFECT_HIGH_POLISH_SURVIVAL_START = 0.75

function isSteelDefectHighPolishSurvivor(
  kind: ArtworkFrameSteelDefectKind,
  stageFamily: ArtworkFrameSteelDefectStageFamily,
) {
  return kind === 'scratch' &&
    (stageFamily === 'satinResidual' || stageFamily === 'polishedMicro')
}

function getSteelDefectHighPolishPhysicalScale(
  kind: ArtworkFrameSteelDefectKind,
  stageFamily: ArtworkFrameSteelDefectStageFamily,
  polishUnit: number,
) {
  if (polishUnit < STEEL_DEFECT_HIGH_POLISH_SURVIVAL_START) {
    return 1
  }

  if (!isSteelDefectHighPolishSurvivor(kind, stageFamily)) {
    return 0
  }

  if (stageFamily === 'satinResidual') {
    return 1 - smoothstep(0.75, 0.92, polishUnit)
  }

  return interpolate(0.16, 0.045, smoothstep(0.88, 1, polishUnit))
}

function getSteelDefectActivationBase(
  kind: ArtworkFrameSteelDefectKind,
  stageFamily: ArtworkFrameSteelDefectStageFamily,
  polishUnit: number,
) {
  if (
    polishUnit >= STEEL_DEFECT_HIGH_POLISH_SURVIVAL_START &&
    !isSteelDefectHighPolishSurvivor(kind, stageFamily)
  ) {
    return 0
  }

  switch (kind) {
    case 'scratch':
      switch (stageFamily) {
        case 'roughDamage':
          return smoothPulse(polishUnit, 0, 0, 0.08, 0.3)
        case 'lowPolishScuff':
          return smoothPulse(polishUnit, 0, 0.06, 0.25, 0.45) * 0.9
        case 'brushedHairline':
          return smoothPulse(polishUnit, 0.24, 0.3, 0.58, 0.76) * 0.56
        case 'satinResidual':
          return smoothPulse(polishUnit, 0.56, 0.7, 0.8, 0.9) * 0.14
        case 'polishedMicro':
          return smoothPulse(polishUnit, 0.84, 0.94, 1, 1.000001) * 0.035
        default:
          return 0
      }
    case 'gouge':
      switch (stageFamily) {
        case 'roughDamage':
          return smoothPulse(polishUnit, 0, 0, 0, 0.22) * 0.85
        case 'lowPolishScuff':
          return smoothPulse(polishUnit, 0, 0.04, 0.1, 0.22) * 0.12
        case 'brushedHairline':
        case 'satinResidual':
        case 'polishedMicro':
        default:
          return 0
      }
    case 'dent':
      switch (stageFamily) {
        case 'roughDamage':
          return smoothPulse(polishUnit, 0, 0, 0.1, 0.3) * 0.78
        case 'lowPolishScuff':
          return smoothPulse(polishUnit, 0, 0.06, 0.12, 0.28) * 0.26
        case 'brushedHairline':
        case 'satinResidual':
        case 'polishedMicro':
        default:
          return 0
      }
    case 'pit':
      switch (stageFamily) {
        case 'roughDamage':
          return smoothPulse(polishUnit, 0, 0, 0.1, 0.3) * 0.55
        case 'lowPolishScuff':
          return smoothPulse(polishUnit, 0.06, 0.12, 0.28, 0.42) * 0.22
        case 'brushedHairline':
          return smoothPulse(polishUnit, 0.28, 0.36, 0.42, 0.5) * 0.035
        case 'satinResidual':
        case 'polishedMicro':
        default:
          return 0
      }
    case 'scuff':
      switch (stageFamily) {
        case 'roughDamage':
          return smoothPulse(polishUnit, 0, 0, 0.08, 0.25) * 0.52
        case 'lowPolishScuff':
          return smoothPulse(polishUnit, 0, 0.08, 0.3, 0.46) * 0.88
        case 'brushedHairline':
        case 'satinResidual':
        case 'polishedMicro':
        default:
          return 0
      }
    case 'burrNick':
      switch (stageFamily) {
        case 'roughDamage':
          return smoothPulse(polishUnit, 0, 0, 0.08, 0.23) * 0.78
        case 'lowPolishScuff':
          return smoothPulse(polishUnit, 0, 0.04, 0.14, 0.25) * 0.25
        case 'brushedHairline':
          return 0
        case 'satinResidual':
        case 'polishedMicro':
        default:
          return 0
      }
    default:
      return 0
  }
}

type SteelDefectPhysicalContributionProfile = {
  albedoResponse: number
  ambientOcclusion: number
  glossResponse: number
  height: number
  normalStrength: number
  rimLight: number
  rimShadow: number
  roughnessResponse: number
  selfShadowReceiver: number
}

const STEEL_DEFECT_PHYSICAL_CONTRIBUTION_PROFILES = {
  burrNick: {
    albedoResponse: 0.34,
    ambientOcclusion: 0.5,
    glossResponse: 0.5,
    height: 0.72,
    normalStrength: 0.68,
    rimLight: 0.86,
    rimShadow: 0.72,
    roughnessResponse: 0.62,
    selfShadowReceiver: 0.76,
  },
  dent: {
    albedoResponse: 0.28,
    ambientOcclusion: 0.72,
    glossResponse: 0.5,
    height: 0.62,
    normalStrength: 0.56,
    rimLight: 0.38,
    rimShadow: 0.72,
    roughnessResponse: 0.54,
    selfShadowReceiver: 0.72,
  },
  gouge: {
    albedoResponse: 0.38,
    ambientOcclusion: 0.8,
    glossResponse: 0.64,
    height: 0.92,
    normalStrength: 0.82,
    rimLight: 0.76,
    rimShadow: 0.88,
    roughnessResponse: 0.74,
    selfShadowReceiver: 0.88,
  },
  pit: {
    albedoResponse: 0.2,
    ambientOcclusion: 0.54,
    glossResponse: 0.46,
    height: 0.34,
    normalStrength: 0.34,
    rimLight: 0.2,
    rimShadow: 0.46,
    roughnessResponse: 0.54,
    selfShadowReceiver: 0.44,
  },
  scratch: {
    albedoResponse: 0.24,
    ambientOcclusion: 0.48,
    glossResponse: 0.42,
    height: 0.42,
    normalStrength: 0.46,
    rimLight: 0.56,
    rimShadow: 0.58,
    roughnessResponse: 0.42,
    selfShadowReceiver: 0.52,
  },
  scuff: {
    albedoResponse: 0.42,
    ambientOcclusion: 0.32,
    glossResponse: 0.46,
    height: 0.28,
    normalStrength: 0.34,
    rimLight: 0.24,
    rimShadow: 0.36,
    roughnessResponse: 0.76,
    selfShadowReceiver: 0.34,
  },
} as const satisfies ArtworkFrameSteelDefectKindRecord<
  SteelDefectPhysicalContributionProfile
>

const STEEL_DEFECT_PHYSICAL_STAGE_SCALES = {
  brushedHairline: 0.42,
  lowPolishScuff: 0.76,
  polishedMicro: 0.08,
  roughDamage: 1,
  satinResidual: 0.13,
} as const satisfies Record<ArtworkFrameSteelDefectStageFamily, number>

function getZeroSteelDefectPhysicalContributionResponse(): ArtworkFrameSteelDefectPhysicalContributionResponse {
  return {
    albedoResponse: 0,
    ambientOcclusion: 0,
    glossResponse: 0,
    height: 0,
    normalStrength: 0,
    rimLight: 0,
    rimShadow: 0,
    roughnessResponse: 0,
    selfShadowReceiver: 0,
  }
}

function clampSteelDefectActiveBodyValue(value: number | undefined) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return clampNumber(value ?? 0, 0, 1)
}

const ZERO_STEEL_DEFECT_LOW_POLISH_RESPONSE_SCALARS = {
  albedoResponseScale: 0,
  ambientOcclusionScale: 0,
  glossResponseScale: 0,
  heightScale: 0,
  normalStrengthScale: 0,
  rimLightScale: 0,
  rimShadowScale: 0,
  roughnessResponseScale: 0,
  selfShadowReceiverScale: 0,
} as const satisfies ArtworkFrameSteelDefectLowPolishResponseScalars

const STEEL_DEFECT_LOW_POLISH_RESPONSE_KEYFRAMES = [
  {
    albedoResponseScale: 0.92,
    ambientOcclusionScale: 1,
    glossResponseScale: 1,
    heightScale: 1,
    normalStrengthScale: 1,
    polish: 0,
    rimLightScale: 0.74,
    rimShadowScale: 1,
    roughnessResponseScale: 1,
    selfShadowReceiverScale: 1,
  },
  {
    albedoResponseScale: 0.82,
    ambientOcclusionScale: 0.88,
    glossResponseScale: 0.9,
    heightScale: 0.82,
    normalStrengthScale: 0.84,
    polish: 0.1,
    rimLightScale: 0.66,
    rimShadowScale: 0.84,
    roughnessResponseScale: 0.94,
    selfShadowReceiverScale: 0.86,
  },
  {
    albedoResponseScale: 0.56,
    ambientOcclusionScale: 0.58,
    glossResponseScale: 0.58,
    heightScale: 0.5,
    normalStrengthScale: 0.56,
    polish: 0.25,
    rimLightScale: 0.48,
    rimShadowScale: 0.54,
    roughnessResponseScale: 0.68,
    selfShadowReceiverScale: 0.48,
  },
  {
    albedoResponseScale: 0.34,
    ambientOcclusionScale: 0.36,
    glossResponseScale: 0.36,
    heightScale: 0.28,
    normalStrengthScale: 0.34,
    polish: 0.3,
    rimLightScale: 0.34,
    rimShadowScale: 0.32,
    roughnessResponseScale: 0.48,
    selfShadowReceiverScale: 0.26,
  },
  {
    albedoResponseScale: 0.08,
    ambientOcclusionScale: 0.08,
    glossResponseScale: 0.08,
    heightScale: 0.06,
    normalStrengthScale: 0.1,
    polish: 0.5,
    rimLightScale: 0.14,
    rimShadowScale: 0.06,
    roughnessResponseScale: 0.12,
    selfShadowReceiverScale: 0.04,
  },
] as const

const STEEL_DEFECT_LOW_POLISH_KIND_RESPONSE_SCALES = {
  burrNick: {
    albedoResponseScale: 0.92,
    ambientOcclusionScale: 0.9,
    glossResponseScale: 0.94,
    heightScale: 1,
    normalStrengthScale: 0.94,
    rimLightScale: 1.12,
    rimShadowScale: 0.92,
    roughnessResponseScale: 0.9,
    selfShadowReceiverScale: 0.88,
  },
  dent: {
    albedoResponseScale: 0.78,
    ambientOcclusionScale: 0.98,
    glossResponseScale: 0.9,
    heightScale: 0.82,
    normalStrengthScale: 0.78,
    rimLightScale: 0.62,
    rimShadowScale: 0.98,
    roughnessResponseScale: 0.84,
    selfShadowReceiverScale: 0.92,
  },
  gouge: {
    albedoResponseScale: 1,
    ambientOcclusionScale: 1.08,
    glossResponseScale: 1,
    heightScale: 1.08,
    normalStrengthScale: 1.06,
    rimLightScale: 0.96,
    rimShadowScale: 1.08,
    roughnessResponseScale: 1,
    selfShadowReceiverScale: 1.04,
  },
  pit: {
    albedoResponseScale: 0.7,
    ambientOcclusionScale: 0.68,
    glossResponseScale: 0.8,
    heightScale: 0.3,
    normalStrengthScale: 0.36,
    rimLightScale: 0.42,
    rimShadowScale: 0.46,
    roughnessResponseScale: 0.78,
    selfShadowReceiverScale: 0.36,
  },
  scratch: {
    albedoResponseScale: 0.9,
    ambientOcclusionScale: 0.82,
    glossResponseScale: 0.78,
    heightScale: 0.82,
    normalStrengthScale: 0.86,
    rimLightScale: 0.92,
    rimShadowScale: 0.86,
    roughnessResponseScale: 0.82,
    selfShadowReceiverScale: 0.76,
  },
  scuff: {
    albedoResponseScale: 1,
    ambientOcclusionScale: 0.56,
    glossResponseScale: 0.72,
    heightScale: 0.4,
    normalStrengthScale: 0.48,
    rimLightScale: 0.42,
    rimShadowScale: 0.44,
    roughnessResponseScale: 1.12,
    selfShadowReceiverScale: 0.38,
  },
} as const satisfies ArtworkFrameSteelDefectKindRecord<
  ArtworkFrameSteelDefectLowPolishResponseScalars
>

const STEEL_DEFECT_POLISH10_PHYSICAL_RESPONSE_SCALES = {
  burrNick: {
    albedoResponseScale: 0.6,
    ambientOcclusionScale: 0.62,
    glossResponseScale: 0.72,
    heightScale: 0.62,
    normalStrengthScale: 0.66,
    rimLightScale: 0.5,
    rimShadowScale: 0.5,
    roughnessResponseScale: 0.76,
    selfShadowReceiverScale: 0.44,
  },
  dent: {
    albedoResponseScale: 0.58,
    ambientOcclusionScale: 0.62,
    glossResponseScale: 0.72,
    heightScale: 0.56,
    normalStrengthScale: 0.56,
    rimLightScale: 0.28,
    rimShadowScale: 0.48,
    roughnessResponseScale: 0.74,
    selfShadowReceiverScale: 0.44,
  },
  gouge: {
    albedoResponseScale: 0.42,
    ambientOcclusionScale: 0.44,
    glossResponseScale: 0.7,
    heightScale: 0.28,
    normalStrengthScale: 0.32,
    rimLightScale: 0.28,
    rimShadowScale: 0.32,
    roughnessResponseScale: 0.72,
    selfShadowReceiverScale: 0.28,
  },
  pit: {
    albedoResponseScale: 0.34,
    ambientOcclusionScale: 0.35,
    glossResponseScale: 0.58,
    heightScale: 0.2,
    normalStrengthScale: 0.22,
    rimLightScale: 0.14,
    rimShadowScale: 0.18,
    roughnessResponseScale: 0.56,
    selfShadowReceiverScale: 0.14,
  },
  scratch: {
    albedoResponseScale: 0.78,
    ambientOcclusionScale: 0.86,
    glossResponseScale: 0.96,
    heightScale: 0.92,
    normalStrengthScale: 0.94,
    rimLightScale: 0.6,
    rimShadowScale: 0.72,
    roughnessResponseScale: 1.04,
    selfShadowReceiverScale: 0.68,
  },
  scuff: {
    albedoResponseScale: 0.62,
    ambientOcclusionScale: 0.58,
    glossResponseScale: 1.08,
    heightScale: 0.48,
    normalStrengthScale: 0.52,
    rimLightScale: 0.24,
    rimShadowScale: 0.34,
    roughnessResponseScale: 1.18,
    selfShadowReceiverScale: 0.3,
  },
} as const satisfies ArtworkFrameSteelDefectKindRecord<
  ArtworkFrameSteelDefectLowPolishResponseScalars
>

const STEEL_DEFECT_POLISH25_PHYSICAL_RESPONSE_SCALES = {
  burrNick: {
    albedoResponseScale: 0.26,
    ambientOcclusionScale: 0.22,
    glossResponseScale: 0.42,
    heightScale: 0.2,
    normalStrengthScale: 0.24,
    rimLightScale: 0.24,
    rimShadowScale: 0.18,
    roughnessResponseScale: 0.34,
    selfShadowReceiverScale: 0.14,
  },
  dent: {
    albedoResponseScale: 0.24,
    ambientOcclusionScale: 0.26,
    glossResponseScale: 0.36,
    heightScale: 0.16,
    normalStrengthScale: 0.2,
    rimLightScale: 0.12,
    rimShadowScale: 0.2,
    roughnessResponseScale: 0.34,
    selfShadowReceiverScale: 0.14,
  },
  gouge: {
    albedoResponseScale: 0.16,
    ambientOcclusionScale: 0.18,
    glossResponseScale: 0.28,
    heightScale: 0.08,
    normalStrengthScale: 0.1,
    rimLightScale: 0.08,
    rimShadowScale: 0.1,
    roughnessResponseScale: 0.22,
    selfShadowReceiverScale: 0.06,
  },
  pit: {
    albedoResponseScale: 0.2,
    ambientOcclusionScale: 0.24,
    glossResponseScale: 0.34,
    heightScale: 0.12,
    normalStrengthScale: 0.14,
    rimLightScale: 0.08,
    rimShadowScale: 0.14,
    roughnessResponseScale: 0.32,
    selfShadowReceiverScale: 0.08,
  },
  scratch: {
    albedoResponseScale: 0.58,
    ambientOcclusionScale: 0.62,
    glossResponseScale: 0.68,
    heightScale: 0.5,
    normalStrengthScale: 0.64,
    rimLightScale: 0.52,
    rimShadowScale: 0.44,
    roughnessResponseScale: 0.66,
    selfShadowReceiverScale: 0.34,
  },
  scuff: {
    albedoResponseScale: 0.52,
    ambientOcclusionScale: 0.42,
    glossResponseScale: 0.7,
    heightScale: 0.3,
    normalStrengthScale: 0.38,
    rimLightScale: 0.24,
    rimShadowScale: 0.24,
    roughnessResponseScale: 0.82,
    selfShadowReceiverScale: 0.18,
  },
} as const satisfies ArtworkFrameSteelDefectKindRecord<
  ArtworkFrameSteelDefectLowPolishResponseScalars
>

const STEEL_DEFECT_POLISH30_PHYSICAL_RESPONSE_SCALES = {
  burrNick: {
    albedoResponseScale: 0.1,
    ambientOcclusionScale: 0.08,
    glossResponseScale: 0.16,
    heightScale: 0.04,
    normalStrengthScale: 0.06,
    rimLightScale: 0.08,
    rimShadowScale: 0.04,
    roughnessResponseScale: 0.12,
    selfShadowReceiverScale: 0.02,
  },
  dent: {
    albedoResponseScale: 0.08,
    ambientOcclusionScale: 0.08,
    glossResponseScale: 0.12,
    heightScale: 0.035,
    normalStrengthScale: 0.05,
    rimLightScale: 0.04,
    rimShadowScale: 0.045,
    roughnessResponseScale: 0.1,
    selfShadowReceiverScale: 0.02,
  },
  gouge: {
    albedoResponseScale: 0.06,
    ambientOcclusionScale: 0.06,
    glossResponseScale: 0.1,
    heightScale: 0.025,
    normalStrengthScale: 0.035,
    rimLightScale: 0.035,
    rimShadowScale: 0.03,
    roughnessResponseScale: 0.08,
    selfShadowReceiverScale: 0.015,
  },
  pit: {
    albedoResponseScale: 0.08,
    ambientOcclusionScale: 0.1,
    glossResponseScale: 0.14,
    heightScale: 0.035,
    normalStrengthScale: 0.045,
    rimLightScale: 0.03,
    rimShadowScale: 0.04,
    roughnessResponseScale: 0.1,
    selfShadowReceiverScale: 0.02,
  },
  scratch: {
    albedoResponseScale: 0.34,
    ambientOcclusionScale: 0.38,
    glossResponseScale: 0.42,
    heightScale: 0.28,
    normalStrengthScale: 0.42,
    rimLightScale: 0.38,
    rimShadowScale: 0.26,
    roughnessResponseScale: 0.42,
    selfShadowReceiverScale: 0.16,
  },
  scuff: {
    albedoResponseScale: 0.24,
    ambientOcclusionScale: 0.22,
    glossResponseScale: 0.34,
    heightScale: 0.12,
    normalStrengthScale: 0.18,
    rimLightScale: 0.12,
    rimShadowScale: 0.12,
    roughnessResponseScale: 0.38,
    selfShadowReceiverScale: 0.06,
  },
} as const satisfies ArtworkFrameSteelDefectKindRecord<
  ArtworkFrameSteelDefectLowPolishResponseScalars
>

function interpolateSteelDefectLowPolishResponseScalars(
  a: ArtworkFrameSteelDefectLowPolishResponseScalars,
  b: ArtworkFrameSteelDefectLowPolishResponseScalars,
  t: number,
): ArtworkFrameSteelDefectLowPolishResponseScalars {
  return {
    albedoResponseScale: interpolate(a.albedoResponseScale, b.albedoResponseScale, t),
    ambientOcclusionScale: interpolate(
      a.ambientOcclusionScale,
      b.ambientOcclusionScale,
      t,
    ),
    glossResponseScale: interpolate(a.glossResponseScale, b.glossResponseScale, t),
    heightScale: interpolate(a.heightScale, b.heightScale, t),
    normalStrengthScale: interpolate(
      a.normalStrengthScale,
      b.normalStrengthScale,
      t,
    ),
    rimLightScale: interpolate(a.rimLightScale, b.rimLightScale, t),
    rimShadowScale: interpolate(a.rimShadowScale, b.rimShadowScale, t),
    roughnessResponseScale: interpolate(
      a.roughnessResponseScale,
      b.roughnessResponseScale,
      t,
    ),
    selfShadowReceiverScale: interpolate(
      a.selfShadowReceiverScale,
      b.selfShadowReceiverScale,
      t,
    ),
  }
}

function getSteelDefectLowPolishKeyframeScalars(
  polishUnit: number,
): ArtworkFrameSteelDefectLowPolishResponseScalars {
  const keyframes = STEEL_DEFECT_LOW_POLISH_RESPONSE_KEYFRAMES

  if (polishUnit <= keyframes[0].polish) {
    return keyframes[0]
  }

  for (let index = 1; index < keyframes.length; index += 1) {
    const previous = keyframes[index - 1]
    const next = keyframes[index]

    if (polishUnit <= next.polish) {
      return interpolateSteelDefectLowPolishResponseScalars(
        previous,
        next,
        smoothstep(previous.polish, next.polish, polishUnit),
      )
    }
  }

  return ZERO_STEEL_DEFECT_LOW_POLISH_RESPONSE_SCALARS
}

function getSteelDefectLowPolishStageFamilyEnvelope(
  stageFamily: ArtworkFrameSteelDefectStageFamily,
  polishUnit: number,
) {
  switch (stageFamily) {
    case 'roughDamage':
      return 1 - smoothstep(0.1, 0.3, polishUnit)
    case 'lowPolishScuff':
      return smoothPulse(polishUnit, 0, 0.08, 0.3, 0.5)
    case 'brushedHairline':
      return smoothPulse(polishUnit, 0.24, 0.3, 0.5, 0.58) * 0.42
    case 'polishedMicro':
    case 'satinResidual':
    default:
      return 0
  }
}

function getSteelDefectLowPolishKindEnvelope(
  kind: ArtworkFrameSteelDefectKind,
  polishUnit: number,
) {
  switch (kind) {
    case 'gouge':
      return 1 - smoothstep(0.08, 0.25, polishUnit)
    case 'dent':
      return 1 - smoothstep(0.12, 0.32, polishUnit)
    case 'burrNick':
      return 1 - smoothstep(0.1, 0.28, polishUnit)
    case 'pit':
      return interpolate(1, 0.34, smoothstep(0.08, 0.3, polishUnit)) *
        interpolate(1, 0.18, smoothstep(0.3, 0.5, polishUnit))
    case 'scratch':
      return interpolate(1, 0.54, smoothstep(0.25, 0.5, polishUnit))
    case 'scuff':
      return interpolate(0.84, 1, smoothPulse(polishUnit, 0, 0.08, 0.26, 0.42)) *
        (1 - smoothstep(0.32, 0.46, polishUnit))
    default:
      return 1
  }
}

export function getArtworkFrameSteelDefectLowPolishResponseScalars({
  activeBody,
  kind,
  metalPolish,
  stageFamily = 'roughDamage',
}: GetArtworkFrameSteelDefectLowPolishResponseScalarsInput): ArtworkFrameSteelDefectLowPolishResponseScalars {
  const presence = clampSteelDefectActiveBodyValue(activeBody.presenceMask)
  const body = Math.min(
    presence,
    clampSteelDefectActiveBodyValue(activeBody.bodyMask),
  )
  const core = Math.min(
    presence,
    clampSteelDefectActiveBodyValue(activeBody.coreMask),
  )
  const edge = Math.min(
    presence,
    clampSteelDefectActiveBodyValue(activeBody.edgeMask),
  )
  const bodyActivity = Math.max(body, core, edge)

  if (presence <= 0 || bodyActivity <= 0) {
    return ZERO_STEEL_DEFECT_LOW_POLISH_RESPONSE_SCALARS
  }

  const polishUnit = normalizePolishUnit(metalPolish)
  const stageEnvelope = getSteelDefectLowPolishStageFamilyEnvelope(
    stageFamily,
    polishUnit,
  )
  const kindEnvelope = getSteelDefectLowPolishKindEnvelope(kind, polishUnit)
  const envelope = clampNumber(
    stageEnvelope * kindEnvelope,
    0,
    1,
  )

  if (envelope <= 0) {
    return ZERO_STEEL_DEFECT_LOW_POLISH_RESPONSE_SCALARS
  }

  const keyframe = getSteelDefectLowPolishKeyframeScalars(polishUnit)
  const kindScale = STEEL_DEFECT_LOW_POLISH_KIND_RESPONSE_SCALES[kind]

  return {
    albedoResponseScale: clampNumber(
      keyframe.albedoResponseScale * kindScale.albedoResponseScale * envelope,
      0,
      1,
    ),
    ambientOcclusionScale: clampNumber(
      keyframe.ambientOcclusionScale *
        kindScale.ambientOcclusionScale *
        envelope,
      0,
      1,
    ),
    glossResponseScale: clampNumber(
      keyframe.glossResponseScale * kindScale.glossResponseScale * envelope,
      0,
      1,
    ),
    heightScale: clampNumber(
      keyframe.heightScale * kindScale.heightScale * envelope,
      0,
      1,
    ),
    normalStrengthScale: clampNumber(
      keyframe.normalStrengthScale * kindScale.normalStrengthScale * envelope,
      0,
      1,
    ),
    rimLightScale: clampNumber(
      keyframe.rimLightScale * kindScale.rimLightScale * envelope,
      0,
      1,
    ),
    rimShadowScale: clampNumber(
      keyframe.rimShadowScale * kindScale.rimShadowScale * envelope,
      0,
      1,
    ),
    roughnessResponseScale: clampNumber(
      keyframe.roughnessResponseScale *
        kindScale.roughnessResponseScale *
        envelope,
      0,
      1,
    ),
    selfShadowReceiverScale: clampNumber(
      keyframe.selfShadowReceiverScale *
        kindScale.selfShadowReceiverScale *
        envelope,
      0,
      1,
    ),
  }
}

export function getArtworkFrameSteelDefectPhysicalContributionResponse({
  activeBody,
  depthLimit = 0.5,
  edgeRoughness = 0.5,
  kind,
  metalPolish,
  sizeClass = 0.5,
  stageFamily = 'roughDamage',
}: GetArtworkFrameSteelDefectPhysicalContributionResponseInput): ArtworkFrameSteelDefectPhysicalContributionResponse {
  const polishUnit = normalizePolishUnit(metalPolish)
  const highPolishPhysicalScale = getSteelDefectHighPolishPhysicalScale(
    kind,
    stageFamily,
    polishUnit,
  )

  const presence = clampSteelDefectActiveBodyValue(activeBody.presenceMask)
  const body = Math.min(
    presence,
    clampSteelDefectActiveBodyValue(activeBody.bodyMask),
  )
  const core = Math.min(
    presence,
    clampSteelDefectActiveBodyValue(activeBody.coreMask),
  )
  const edge = Math.min(
    presence,
    clampSteelDefectActiveBodyValue(activeBody.edgeMask),
  )
  const bodyActivity = Math.max(body, core, edge)

  if (
    presence <= 0 ||
    bodyActivity <= 0 ||
    highPolishPhysicalScale <= 0
  ) {
    return getZeroSteelDefectPhysicalContributionResponse()
  }

  const boundedDepth = clampNumber(depthLimit, 0, 1)
  const boundedEdge = clampNumber(edgeRoughness, 0, 1)
  const boundedSize = clampNumber(sizeClass, 0, 1)
  const profile = STEEL_DEFECT_PHYSICAL_CONTRIBUTION_PROFILES[kind]
  const stageScale = STEEL_DEFECT_PHYSICAL_STAGE_SCALES[stageFamily]
  const polishSoftening = 1 - smoothstep(0.08, 1, polishUnit)
  const depthTrait = 0.35 + boundedDepth * 0.65
  const edgeTrait = 0.45 + boundedEdge * 0.55
  const sizeTrait = 0.72 + boundedSize * 0.28
  const reliefActivity = clampNumber(
    core * 0.54 + body * 0.34 + edge * 0.12,
    0,
    1,
  )
  const edgeActivity = clampNumber(edge * 0.62 + core * 0.24 + body * 0.14, 0, 1)
  const cavityActivity = clampNumber(core * 0.62 + body * 0.34, 0, 1)
  const finishScale = clampNumber(0.28 + polishSoftening * 0.72, 0, 1)
  const heightScale = clampNumber(
    stageScale * finishScale * depthTrait * sizeTrait,
    0,
    1,
  )
  const surfaceScale = clampNumber(
    stageScale * (0.4 + polishSoftening * 0.6) * edgeTrait,
    0,
    1,
  )
  const lowPolishScalars = getArtworkFrameSteelDefectLowPolishResponseScalars({
    activeBody: {
      bodyMask: body,
      coreMask: core,
      edgeMask: edge,
      presenceMask: presence,
    },
    kind,
    metalPolish,
    stageFamily,
  })
  const polish0TuningWeight = 1 - smoothstep(0.04, 0.12, polishUnit)
  const polish10TuningWeight = (
    stageFamily === 'roughDamage' || stageFamily === 'lowPolishScuff'
      ? smoothPulse(polishUnit, 0.055, 0.095, 0.145, 0.24)
      : 0
  )
  const polish10Scalars =
    STEEL_DEFECT_POLISH10_PHYSICAL_RESPONSE_SCALES[kind]
  const polish25TuningWeight = (
      stageFamily === 'roughDamage' ||
      stageFamily === 'lowPolishScuff' ||
      stageFamily === 'brushedHairline'
      ? smoothPulse(polishUnit, 0.21, 0.245, 0.285, 0.36)
      : 0
  )
  const polish25Scalars =
    STEEL_DEFECT_POLISH25_PHYSICAL_RESPONSE_SCALES[kind]
  const polish30TuningWeight = (
    stageFamily === 'roughDamage' ||
      stageFamily === 'lowPolishScuff' ||
      stageFamily === 'brushedHairline'
      ? smoothPulse(polishUnit, 0.27, 0.30, 0.34, 0.46)
      : 0
  )
  const polish30Scalars =
    STEEL_DEFECT_POLISH30_PHYSICAL_RESPONSE_SCALES[kind]
  const applyResponseScales = (
    value: number,
    polish0Scale: number,
    polish10Scale: number,
    polish25Scale: number,
    polish30Scale: number,
  ) => {
    const polish0Value =
      value * interpolate(1, polish0Scale, polish0TuningWeight)
    const polish10Value =
      polish0Value * interpolate(1, polish10Scale, polish10TuningWeight)
    const polish25Value =
      polish10Value * interpolate(1, polish25Scale, polish25TuningWeight)

    return clampNumber(
      polish25Value * interpolate(1, polish30Scale, polish30TuningWeight),
      0,
      1,
    )
  }

  return {
    albedoResponse: applyResponseScales(
      profile.albedoResponse *
        bodyActivity *
        surfaceScale *
        highPolishPhysicalScale,
      lowPolishScalars.albedoResponseScale,
      polish10Scalars.albedoResponseScale,
      polish25Scalars.albedoResponseScale,
      polish30Scalars.albedoResponseScale,
    ),
    ambientOcclusion: applyResponseScales(
      profile.ambientOcclusion *
        cavityActivity *
        heightScale *
        highPolishPhysicalScale,
      lowPolishScalars.ambientOcclusionScale,
      polish10Scalars.ambientOcclusionScale,
      polish25Scalars.ambientOcclusionScale,
      polish30Scalars.ambientOcclusionScale,
    ),
    glossResponse: applyResponseScales(
      profile.glossResponse *
        bodyActivity *
        surfaceScale *
        highPolishPhysicalScale,
      lowPolishScalars.glossResponseScale,
      polish10Scalars.glossResponseScale,
      polish25Scalars.glossResponseScale,
      polish30Scalars.glossResponseScale,
    ),
    height: applyResponseScales(
      profile.height *
        reliefActivity *
        heightScale *
        highPolishPhysicalScale,
      lowPolishScalars.heightScale,
      polish10Scalars.heightScale,
      polish25Scalars.heightScale,
      polish30Scalars.heightScale,
    ),
    normalStrength: applyResponseScales(
      profile.normalStrength *
        Math.max(reliefActivity, edgeActivity) *
        heightScale *
        highPolishPhysicalScale,
      lowPolishScalars.normalStrengthScale,
      polish10Scalars.normalStrengthScale,
      polish25Scalars.normalStrengthScale,
      polish30Scalars.normalStrengthScale,
    ),
    rimLight: applyResponseScales(
      profile.rimLight *
        edgeActivity *
        surfaceScale *
        highPolishPhysicalScale,
      lowPolishScalars.rimLightScale,
      polish10Scalars.rimLightScale,
      polish25Scalars.rimLightScale,
      polish30Scalars.rimLightScale,
    ),
    rimShadow: applyResponseScales(
      profile.rimShadow *
        Math.max(edgeActivity, cavityActivity) *
        heightScale *
        highPolishPhysicalScale,
      lowPolishScalars.rimShadowScale,
      polish10Scalars.rimShadowScale,
      polish25Scalars.rimShadowScale,
      polish30Scalars.rimShadowScale,
    ),
    roughnessResponse: applyResponseScales(
      profile.roughnessResponse *
        bodyActivity *
        surfaceScale *
        highPolishPhysicalScale,
      lowPolishScalars.roughnessResponseScale,
      polish10Scalars.roughnessResponseScale,
      polish25Scalars.roughnessResponseScale,
      polish30Scalars.roughnessResponseScale,
    ),
    selfShadowReceiver: applyResponseScales(
      polishUnit >= STEEL_DEFECT_HIGH_POLISH_SURVIVAL_START
        ? 0
        : profile.selfShadowReceiver *
          Math.max(cavityActivity, edgeActivity * 0.72) *
          heightScale,
      lowPolishScalars.selfShadowReceiverScale,
      polish10Scalars.selfShadowReceiverScale,
      polish25Scalars.selfShadowReceiverScale,
      polish30Scalars.selfShadowReceiverScale,
    ),
  }
}

export function getArtworkFrameSteelDefectActiveBodyResponse({
  depthLimit = 0.5,
  edgeRoughness = 0.5,
  kind,
  metalPolish,
  sizeClass = 0.5,
  stageFamily,
}: GetArtworkFrameSteelDefectActiveBodyResponseInput): ArtworkFrameSteelDefectActiveBodyResponse {
  const polishUnit = normalizePolishUnit(metalPolish)
  const activation = clampNumber(
    getSteelDefectActivationBase(kind, stageFamily, polishUnit),
    0,
    1,
  )

  if (activation <= 0) {
    return {
      bodyStrength: 0,
      coreStrength: 0,
      edgeStrength: 0,
      presence: 0,
    }
  }

  const boundedDepth = clampNumber(depthLimit, 0, 1)
  const boundedEdge = clampNumber(edgeRoughness, 0, 1)
  const boundedSize = clampNumber(sizeClass, 0, 1)
  const bodyScale = 0.7 + boundedSize * 0.15 + boundedDepth * 0.15
  const coreScale = 0.6 + boundedDepth * 0.35 + boundedSize * 0.05
  const edgeScale = 0.45 + boundedEdge * 0.4 + boundedSize * 0.1

  return {
    bodyStrength: clampNumber(activation * bodyScale, 0, 1),
    coreStrength: clampNumber(activation * coreScale, 0, 1),
    edgeStrength: clampNumber(activation * edgeScale, 0, 1),
    presence: activation,
  }
}

function normalizeVector(x: number, y: number) {
  const length = Math.hypot(x, y)

  if (length <= 0.000001) {
    return { x: 1, y: 0 }
  }

  return {
    x: x / length,
    y: y / length,
  }
}

function rotateVector(x: number, y: number, radians: number) {
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)

  return normalizeVector(
    x * cos - y * sin,
    x * sin + y * cos,
  )
}

export function getArtworkFrameSteelDefectPlacementGeometrySeedKey({
  frameRingCoordinates,
  geometrySeedKey,
  materialIdentity,
}: CreateArtworkFrameSteelDefectPlacementSetInput) {
  return [
    'steel-defect-placement-v1',
    `geometry:${geometrySeedKey}`,
    `metal:${materialIdentity.metalType}`,
    `style:${frameRingCoordinates.frameStyle}`,
    `shape:${frameRingCoordinates.frameShape}`,
    `ring:${frameRingCoordinates.ringKey}`,
    `coordinates:${frameRingCoordinates.coordinateSpace}`,
  ].join('|')
}

const DEFAULT_RECTANGLE_FRAME_RING_BANDS = [
  { maxX: 0.18, maxY: 1, minX: 0, minY: 0, weight: 1 },
  { maxX: 1, maxY: 1, minX: 0.82, minY: 0, weight: 1 },
  { maxX: 0.82, maxY: 0.18, minX: 0.18, minY: 0, weight: 1.12 },
  { maxX: 0.82, maxY: 1, minX: 0.18, minY: 0.82, weight: 1.12 },
] as const satisfies readonly ArtworkFrameSteelDefectPlacementRingBand[]

function getScratchPlacementCount({
  materialIdentity,
}: CreateArtworkFrameSteelDefectPlacementSetInput) {
  return materialIdentity.metalType === 'blackIron' ? 76 : 92
}

function getGougePlacementCount({
  materialIdentity,
}: CreateArtworkFrameSteelDefectPlacementSetInput) {
  return materialIdentity.metalType === 'blackIron' ? 24 : 18
}

function getBurrNickPlacementCount({
  materialIdentity,
}: CreateArtworkFrameSteelDefectPlacementSetInput) {
  return materialIdentity.metalType === 'blackIron' ? 38 : 30
}

function getDentPlacementCount({
  materialIdentity,
}: CreateArtworkFrameSteelDefectPlacementSetInput) {
  return materialIdentity.metalType === 'blackIron' ? 20 : 16
}

function getPitClusterCount({
  materialIdentity,
}: CreateArtworkFrameSteelDefectPlacementSetInput) {
  return materialIdentity.metalType === 'blackIron' ? 14 : 11
}

function getPitSingletonCount({
  materialIdentity,
}: CreateArtworkFrameSteelDefectPlacementSetInput) {
  return materialIdentity.metalType === 'blackIron' ? 16 : 12
}

function getScuffPlacementCount({
  materialIdentity,
}: CreateArtworkFrameSteelDefectPlacementSetInput) {
  return materialIdentity.metalType === 'blackIron' ? 22 : 18
}

function getPlacementRingBands({
  frameRingCoordinates,
}: CreateArtworkFrameSteelDefectPlacementSetInput) {
  if (frameRingCoordinates.normalizedRingBands?.length) {
    return frameRingCoordinates.normalizedRingBands
  }

  return DEFAULT_RECTANGLE_FRAME_RING_BANDS
}

function clampPointToBand(
  band: ArtworkFrameSteelDefectPlacementRingBand,
  x: number,
  y: number,
  inset: number,
) {
  const minX = clampNumber(band.minX + inset, 0, 1)
  const maxX = clampNumber(band.maxX - inset, minX, 1)
  const minY = clampNumber(band.minY + inset, 0, 1)
  const maxY = clampNumber(band.maxY - inset, minY, 1)

  return {
    x: clampNumber(x, minX, maxX),
    y: clampNumber(y, minY, maxY),
  }
}

function pickRingBand(
  bands: readonly ArtworkFrameSteelDefectPlacementRingBand[],
  unit: number,
) {
  const totalWeight = bands.reduce(
    (sum, band) => sum + Math.max(0.0001, band.weight ?? 1),
    0,
  )
  let threshold = unit * totalWeight

  for (const band of bands) {
    threshold -= Math.max(0.0001, band.weight ?? 1)

    if (threshold <= 0) {
      return band
    }
  }

  return bands[bands.length - 1] ?? DEFAULT_RECTANGLE_FRAME_RING_BANDS[0]
}

function getBandOrientation(band: ArtworkFrameSteelDefectPlacementRingBand) {
  return band.maxX - band.minX <= band.maxY - band.minY
    ? 'vertical'
    : 'horizontal'
}

function getBandInteriorPoint(
  band: ArtworkFrameSteelDefectPlacementRingBand,
  seed: number,
  inset: number,
  salt: number,
) {
  const minX = clampNumber(band.minX + inset, 0, 1)
  const maxX = clampNumber(band.maxX - inset, minX, 1)
  const minY = clampNumber(band.minY + inset, 0, 1)
  const maxY = clampNumber(band.maxY - inset, minY, 1)

  return {
    x: interpolate(minX, maxX, hashUnit(seed, salt)),
    y: interpolate(minY, maxY, hashUnit(seed, salt + 1)),
  }
}

function getBandInteriorPointWithExtents(
  band: ArtworkFrameSteelDefectPlacementRingBand,
  seed: number,
  xExtent: number,
  yExtent: number,
  salt: number,
) {
  const minX = clampNumber(band.minX + xExtent, 0, 1)
  const maxX = clampNumber(band.maxX - xExtent, minX, 1)
  const minY = clampNumber(band.minY + yExtent, 0, 1)
  const maxY = clampNumber(band.maxY - yExtent, minY, 1)

  return {
    x: interpolate(minX, maxX, hashUnit(seed, salt)),
    y: interpolate(minY, maxY, hashUnit(seed, salt + 1)),
  }
}

function getBandEdgeBiasedPoint(
  band: ArtworkFrameSteelDefectPlacementRingBand,
  seed: number,
  inset: number,
) {
  const minX = clampNumber(band.minX + inset, 0, 1)
  const maxX = clampNumber(band.maxX - inset, minX, 1)
  const minY = clampNumber(band.minY + inset, 0, 1)
  const maxY = clampNumber(band.maxY - inset, minY, 1)
  const orientation = getBandOrientation(band)
  const edgeSide = hashUnit(seed, 31) < 0.5 ? 0 : 1
  const edgeJitter = Math.pow(hashUnit(seed, 32), 2.8) * 0.028

  if (orientation === 'vertical') {
    const leftEdge = band.minX <= 0.001
    const x = leftEdge === (edgeSide === 0)
      ? minX + edgeJitter
      : maxX - edgeJitter

    return {
      x: clampNumber(x, minX, maxX),
      y: interpolate(minY, maxY, hashUnit(seed, 33)),
    }
  }

  const topEdge = band.minY <= 0.001
  const y = topEdge === (edgeSide === 0)
    ? minY + edgeJitter
    : maxY - edgeJitter

  return {
    x: interpolate(minX, maxX, hashUnit(seed, 34)),
    y: clampNumber(y, minY, maxY),
  }
}

function getBandEdgeTangent(
  band: ArtworkFrameSteelDefectPlacementRingBand,
  seed: number,
) {
  const base = getBandOrientation(band) === 'vertical'
    ? { x: 0, y: 1 }
    : { x: 1, y: 0 }
  const direction = hashUnit(seed, 35) < 0.5 ? -1 : 1
  const jitter = interpolate(-0.34, 0.34, hashUnit(seed, 36))

  return rotateVector(base.x * direction, base.y * direction, jitter)
}

function getBrushDirection(
  input: CreateArtworkFrameSteelDefectPlacementSetInput,
) {
  if (input.brushDirection) {
    return normalizeVector(
      input.brushDirection.tangentX,
      input.brushDirection.tangentY,
    )
  }

  return { x: 1, y: 0 }
}

function getScratchStageFamily(unit: number): ArtworkFrameSteelDefectStageFamily {
  if (unit < 0.2) {
    return 'roughDamage'
  }

  if (unit < 0.36) {
    return 'lowPolishScuff'
  }

  if (unit < 0.76) {
    return 'brushedHairline'
  }

  if (unit < 0.94) {
    return 'satinResidual'
  }

  return 'polishedMicro'
}

function getGougeStageFamily(unit: number): ArtworkFrameSteelDefectStageFamily {
  if (unit < 0.58) {
    return 'roughDamage'
  }

  if (unit < 0.84) {
    return 'lowPolishScuff'
  }

  return 'brushedHairline'
}

function getBurrNickStageFamily(
  unit: number,
): ArtworkFrameSteelDefectStageFamily {
  if (unit < 0.72) {
    return 'roughDamage'
  }

  if (unit < 0.92) {
    return 'lowPolishScuff'
  }

  return 'brushedHairline'
}

function getDentStageFamily(unit: number): ArtworkFrameSteelDefectStageFamily {
  if (unit < 0.56) {
    return 'roughDamage'
  }

  if (unit < 0.82) {
    return 'lowPolishScuff'
  }

  return 'brushedHairline'
}

function getPitStageFamily(unit: number): ArtworkFrameSteelDefectStageFamily {
  if (unit < 0.38) {
    return 'roughDamage'
  }

  if (unit < 0.72) {
    return 'lowPolishScuff'
  }

  if (unit < 0.96) {
    return 'brushedHairline'
  }

  return 'satinResidual'
}

function getScuffStageFamily(unit: number): ArtworkFrameSteelDefectStageFamily {
  if (unit < 0.18) {
    return 'roughDamage'
  }

  if (unit < 0.88) {
    return 'lowPolishScuff'
  }

  return 'brushedHairline'
}

function getScratchSizeProfile(
  stageFamily: ArtworkFrameSteelDefectStageFamily,
  lengthUnit: number,
  widthUnit: number,
) {
  switch (stageFamily) {
    case 'roughDamage':
      return {
        length: interpolate(0.055, 0.24, Math.pow(lengthUnit, 1.16)),
        maxDepth: interpolate(0.46, 0.82, widthUnit),
        width: interpolate(0.0048, 0.012, Math.pow(widthUnit, 1.35)),
      }
    case 'lowPolishScuff':
      return {
        length: interpolate(0.035, 0.17, lengthUnit),
        maxDepth: interpolate(0.24, 0.52, widthUnit),
        width: interpolate(0.0026, 0.0068, widthUnit),
      }
    case 'satinResidual':
      return {
        length: interpolate(0.032, 0.13, lengthUnit),
        maxDepth: interpolate(0.08, 0.2, widthUnit),
        width: interpolate(0.0012, 0.0038, widthUnit),
      }
    case 'polishedMicro':
      return {
        length: interpolate(0.018, 0.075, lengthUnit),
        maxDepth: interpolate(0.035, 0.095, widthUnit),
        width: interpolate(0.00065, 0.0018, widthUnit),
      }
    case 'brushedHairline':
    default:
      return {
        length: interpolate(0.04, 0.19, Math.pow(lengthUnit, 1.08)),
        maxDepth: interpolate(0.12, 0.34, widthUnit),
        width: interpolate(0.0014, 0.0044, widthUnit),
      }
  }
}

function createScratchPlacements(
  input: CreateArtworkFrameSteelDefectPlacementSetInput,
  randomStreamSeed32: number,
): ArtworkFrameSteelDefectPlacement[] {
  const placements: ArtworkFrameSteelDefectPlacement[] = []
  const bands = getPlacementRingBands(input)
  const brushDirection = getBrushDirection(input)
  const count = getScratchPlacementCount(input)

  for (let index = 0; index < count; index += 1) {
    const seed = hashString(`${randomStreamSeed32.toString(36)}|scratch:${index}`)
    const band = pickRingBand(bands, hashUnit(seed, 1))
    const stageFamily = getScratchStageFamily(hashUnit(seed, 2))
    const sizeProfile = getScratchSizeProfile(
      stageFamily,
      hashUnit(seed, 3),
      hashUnit(seed, 4),
    )
    const crossGrain = hashUnit(seed, 5) > 0.86
    const jitter = crossGrain
      ? interpolate(0.44, 1.42, hashUnit(seed, 6)) *
        (hashUnit(seed, 7) < 0.5 ? -1 : 1)
      : interpolate(-0.26, 0.26, hashUnit(seed, 8))
    const tangent = rotateVector(brushDirection.x, brushDirection.y, jitter)
    const inset = sizeProfile.length * 0.18
    const minX = clampNumber(band.minX + inset, 0, 1)
    const maxX = clampNumber(band.maxX - inset, minX, 1)
    const minY = clampNumber(band.minY + inset, 0, 1)
    const maxY = clampNumber(band.maxY - inset, minY, 1)
    const centerX = interpolate(minX, maxX, hashUnit(seed, 9))
    const centerY = interpolate(minY, maxY, hashUnit(seed, 10))

    placements.push({
      centerX,
      centerY,
      edgeRoughness: interpolate(0.12, 0.88, hashUnit(seed, 11)),
      id: `scratch:${index.toString(36)}:${seed.toString(36)}`,
      kind: 'scratch',
      length: sizeProfile.length,
      maxDepth: sizeProfile.maxDepth,
      seed,
      stageFamily,
      tangentX: tangent.x,
      tangentY: tangent.y,
      taper: interpolate(0.42, 0.96, hashUnit(seed, 12)),
      waviness: interpolate(0.0015, 0.014, hashUnit(seed, 13)),
      width: sizeProfile.width,
    })
  }

  return placements
}

function createGougePlacements(
  input: CreateArtworkFrameSteelDefectPlacementSetInput,
  randomStreamSeed32: number,
): ArtworkFrameSteelDefectPlacement[] {
  const placements: ArtworkFrameSteelDefectPlacement[] = []
  const bands = getPlacementRingBands(input)
  const brushDirection = getBrushDirection(input)
  const count = getGougePlacementCount(input)

  for (let index = 0; index < count; index += 1) {
    const seed = hashString(`${randomStreamSeed32.toString(36)}|gouge:${index}`)
    const band = pickRingBand(bands, hashUnit(seed, 41))
    const stageFamily = getGougeStageFamily(hashUnit(seed, 42))
    const length = interpolate(0.035, 0.155, Math.pow(hashUnit(seed, 43), 1.18))
    const width = interpolate(0.0065, 0.019, Math.pow(hashUnit(seed, 44), 1.1))
    const maxDepth = interpolate(0.58, 0.96, hashUnit(seed, 45))
    const jitter = interpolate(-0.72, 0.72, hashUnit(seed, 46))
    const tangent = rotateVector(brushDirection.x, brushDirection.y, jitter)
    const inset = length * 0.26
    const minX = clampNumber(band.minX + inset, 0, 1)
    const maxX = clampNumber(band.maxX - inset, minX, 1)
    const minY = clampNumber(band.minY + inset, 0, 1)
    const maxY = clampNumber(band.maxY - inset, minY, 1)

    placements.push({
      centerX: interpolate(minX, maxX, hashUnit(seed, 47)),
      centerY: interpolate(minY, maxY, hashUnit(seed, 48)),
      edgeRoughness: interpolate(0.66, 0.98, hashUnit(seed, 49)),
      id: `gouge:${index.toString(36)}:${seed.toString(36)}`,
      kind: 'gouge',
      length,
      maxDepth,
      seed,
      stageFamily,
      tangentX: tangent.x,
      tangentY: tangent.y,
      taper: interpolate(0.18, 0.62, hashUnit(seed, 50)),
      waviness: interpolate(0.002, 0.011, hashUnit(seed, 51)),
      width,
    })
  }

  return placements
}

function createDentPlacements(
  input: CreateArtworkFrameSteelDefectPlacementSetInput,
  randomStreamSeed32: number,
): ArtworkFrameSteelDefectPlacement[] {
  const placements: ArtworkFrameSteelDefectPlacement[] = []
  const bands = getPlacementRingBands(input)
  const count = getDentPlacementCount(input)

  for (let index = 0; index < count; index += 1) {
    const seed = hashString(`${randomStreamSeed32.toString(36)}|dent:${index}`)
    const band = pickRingBand(bands, hashUnit(seed, 71))
    const stageFamily = getDentStageFamily(hashUnit(seed, 72))
    const length = interpolate(0.021, 0.082, Math.pow(hashUnit(seed, 73), 1.22))
    const aspect = interpolate(0.36, 0.72, hashUnit(seed, 74))
    const width = Math.min(
      length * aspect,
      interpolate(0.012, 0.046, Math.pow(hashUnit(seed, 75), 1.16)),
    )
    const maxDepth = interpolate(0.09, 0.34, Math.pow(hashUnit(seed, 76), 1.18))
    const point = getBandInteriorPoint(
      band,
      seed,
      Math.max(length, width) * 0.32,
      77,
    )
    const angle = hashUnit(seed, 79) * Math.PI * 2
    const tangent = normalizeVector(Math.cos(angle), Math.sin(angle))

    placements.push({
      centerX: point.x,
      centerY: point.y,
      edgeRoughness: interpolate(0.34, 0.84, hashUnit(seed, 80)),
      id: `dent:${index.toString(36)}:${seed.toString(36)}`,
      kind: 'dent',
      length,
      maxDepth,
      seed,
      stageFamily,
      tangentX: tangent.x,
      tangentY: tangent.y,
      taper: interpolate(0.24, 0.68, hashUnit(seed, 81)),
      waviness: interpolate(0.003, 0.018, hashUnit(seed, 82)),
      width,
    })
  }

  return placements
}

function createPitPlacement(
  indexId: string,
  band: ArtworkFrameSteelDefectPlacementRingBand,
  centerX: number,
  centerY: number,
  seed: number,
): ArtworkFrameSteelDefectPlacement {
  const stageFamily = getPitStageFamily(hashUnit(seed, 91))
  const length = interpolate(0.0022, 0.0115, Math.pow(hashUnit(seed, 92), 1.9))
  const width = interpolate(
    0.0012,
    Math.min(0.0068, length * interpolate(0.46, 0.88, hashUnit(seed, 93))),
    hashUnit(seed, 94),
  )
  const point = clampPointToBand(band, centerX, centerY, 0.0045)
  const angle = hashUnit(seed, 95) * Math.PI * 2
  const tangent = normalizeVector(Math.cos(angle), Math.sin(angle))

  return {
    centerX: point.x,
    centerY: point.y,
    edgeRoughness: interpolate(0.56, 0.98, hashUnit(seed, 96)),
    id: `pit:${indexId}:${seed.toString(36)}`,
    kind: 'pit',
    length,
    maxDepth: interpolate(0.055, 0.265, Math.pow(hashUnit(seed, 97), 1.18)),
    seed,
    stageFamily,
    tangentX: tangent.x,
    tangentY: tangent.y,
    taper: interpolate(0.16, 0.58, hashUnit(seed, 98)),
    waviness: interpolate(0.0008, 0.0048, hashUnit(seed, 99)),
    width,
  }
}

function createPitPlacements(
  input: CreateArtworkFrameSteelDefectPlacementSetInput,
  randomStreamSeed32: number,
): ArtworkFrameSteelDefectPlacement[] {
  const placements: ArtworkFrameSteelDefectPlacement[] = []
  const bands = getPlacementRingBands(input)
  const clusterCount = getPitClusterCount(input)
  const singletonCount = getPitSingletonCount(input)

  for (let clusterIndex = 0; clusterIndex < clusterCount; clusterIndex += 1) {
    const clusterSeed = hashString(
      `${randomStreamSeed32.toString(36)}|pit-cluster:${clusterIndex}`,
    )
    const band = pickRingBand(bands, hashUnit(clusterSeed, 101))
    const anchor = getBandInteriorPoint(band, clusterSeed, 0.019, 102)
    const localCount = 3 + Math.floor(hashUnit(clusterSeed, 104) * 5)
    const spread = interpolate(
      0.007,
      0.036,
      Math.pow(hashUnit(clusterSeed, 105), 1.3),
    )
    const clusterAngle = hashUnit(clusterSeed, 106) * Math.PI * 2
    const clusterCos = Math.cos(clusterAngle)
    const clusterSin = Math.sin(clusterAngle)

    for (let localIndex = 0; localIndex < localCount; localIndex += 1) {
      const seed = hashString(
        `${clusterSeed.toString(36)}|pit:${localIndex}`,
      )
      const angle = hashUnit(seed, 107) * Math.PI * 2
      const distance = Math.pow(hashUnit(seed, 108), 1.55) * spread
      const localMajor = Math.cos(angle) * distance
      const localMinor =
        Math.sin(angle) *
        distance *
        interpolate(0.35, 0.82, hashUnit(clusterSeed, 109))
      const offsetX = localMajor * clusterCos - localMinor * clusterSin
      const offsetY = localMajor * clusterSin + localMinor * clusterCos

      placements.push(
        createPitPlacement(
          `${clusterIndex.toString(36)}-${localIndex.toString(36)}`,
          band,
          anchor.x + offsetX,
          anchor.y + offsetY,
          seed,
        ),
      )
    }
  }

  for (let index = 0; index < singletonCount; index += 1) {
    const seed = hashString(
      `${randomStreamSeed32.toString(36)}|pit-single:${index}`,
    )
    const band = pickRingBand(bands, hashUnit(seed, 111))
    const point = getBandInteriorPoint(band, seed, 0.006, 112)

    placements.push(
      createPitPlacement(
        `s-${index.toString(36)}`,
        band,
        point.x,
        point.y,
        seed,
      ),
    )
  }

  return placements
}

function createScuffPlacements(
  input: CreateArtworkFrameSteelDefectPlacementSetInput,
  randomStreamSeed32: number,
): ArtworkFrameSteelDefectPlacement[] {
  const placements: ArtworkFrameSteelDefectPlacement[] = []
  const bands = getPlacementRingBands(input)
  const brushDirection = getBrushDirection(input)
  const count = getScuffPlacementCount(input)

  for (let index = 0; index < count; index += 1) {
    const seed = hashString(`${randomStreamSeed32.toString(36)}|scuff:${index}`)
    const band = pickRingBand(bands, hashUnit(seed, 121))
    const stageFamily = getScuffStageFamily(hashUnit(seed, 122))
    const rawLength = interpolate(
      0.074,
      0.255,
      Math.pow(hashUnit(seed, 123), 1.08),
    )
    const widthRatio = interpolate(0.17, 0.38, hashUnit(seed, 124))
    const primaryJitter = interpolate(-0.52, 0.52, hashUnit(seed, 125))
    const tangent = rotateVector(
      brushDirection.x,
      brushDirection.y,
      primaryJitter,
    )
    const crossSkew =
      interpolate(0.18, 0.52, hashUnit(seed, 126)) *
      (hashUnit(seed, 127) < 0.5 ? -1 : 1)
    const secondaryTangent = rotateVector(tangent.x, tangent.y, crossSkew)
    const normal = { x: -tangent.y, y: tangent.x }
    const bandWidth = Math.max(0.001, band.maxX - band.minX)
    const bandHeight = Math.max(0.001, band.maxY - band.minY)
    const margin = 0.009
    const lengthLimitX = (bandWidth - margin * 2) /
      Math.max(0.001, Math.abs(tangent.x) + Math.abs(normal.x) * widthRatio)
    const lengthLimitY = (bandHeight - margin * 2) /
      Math.max(0.001, Math.abs(tangent.y) + Math.abs(normal.y) * widthRatio)
    const length = Math.max(
      0.038,
      Math.min(rawLength, lengthLimitX, lengthLimitY),
    )
    const width = length * widthRatio
    const xExtent =
      Math.abs(tangent.x) * length * 0.5 +
      Math.abs(normal.x) * width * 0.78 +
      margin
    const yExtent =
      Math.abs(tangent.y) * length * 0.5 +
      Math.abs(normal.y) * width * 0.78 +
      margin
    const point = getBandInteriorPointWithExtents(
      band,
      seed,
      xExtent,
      yExtent,
      128,
    )

    placements.push({
      centerX: point.x,
      centerY: point.y,
      edgeRoughness: interpolate(0.58, 0.96, hashUnit(seed, 130)),
      id: `scuff:${index.toString(36)}:${seed.toString(36)}`,
      internalBreakup: interpolate(0.44, 0.94, hashUnit(seed, 131)),
      kind: 'scuff',
      length,
      maxDepth: interpolate(0.075, 0.255, hashUnit(seed, 132)),
      microScratchCount: 18 + Math.floor(hashUnit(seed, 133) * 47),
      secondaryTangentX: secondaryTangent.x,
      secondaryTangentY: secondaryTangent.y,
      seed,
      stageFamily,
      tangentX: tangent.x,
      tangentY: tangent.y,
      taper: interpolate(0.16, 0.48, hashUnit(seed, 134)),
      waviness: interpolate(0.009, 0.035, hashUnit(seed, 135)),
      width,
    })
  }

  return placements
}

function createBurrNickPlacements(
  input: CreateArtworkFrameSteelDefectPlacementSetInput,
  randomStreamSeed32: number,
): ArtworkFrameSteelDefectPlacement[] {
  const placements: ArtworkFrameSteelDefectPlacement[] = []
  const bands = getPlacementRingBands(input)
  const count = getBurrNickPlacementCount(input)

  for (let index = 0; index < count; index += 1) {
    const seed = hashString(
      `${randomStreamSeed32.toString(36)}|burr-nick:${index}`,
    )
    const band = pickRingBand(bands, hashUnit(seed, 61))
    const stageFamily = getBurrNickStageFamily(hashUnit(seed, 62))
    const length = interpolate(0.012, 0.06, Math.pow(hashUnit(seed, 63), 1.35))
    const width = interpolate(0.004, 0.015, Math.pow(hashUnit(seed, 64), 1.2))
    const maxDepth = interpolate(0.42, 0.8, hashUnit(seed, 65))
    const tangent = getBandEdgeTangent(band, seed)
    const point = getBandEdgeBiasedPoint(band, seed, length * 0.2)

    placements.push({
      centerX: point.x,
      centerY: point.y,
      edgeRoughness: interpolate(0.72, 1, hashUnit(seed, 66)),
      id: `burrNick:${index.toString(36)}:${seed.toString(36)}`,
      kind: 'burrNick',
      length,
      maxDepth,
      seed,
      stageFamily,
      tangentX: tangent.x,
      tangentY: tangent.y,
      taper: interpolate(0.08, 0.42, hashUnit(seed, 67)),
      waviness: interpolate(0.001, 0.009, hashUnit(seed, 68)),
      width,
    })
  }

  return placements
}

export function createArtworkFrameSteelDefectPlacementSet(
  input: CreateArtworkFrameSteelDefectPlacementSetInput,
): ArtworkFrameSteelDefectPlacementSet {
  const placementGeometrySeedKey =
    getArtworkFrameSteelDefectPlacementGeometrySeedKey(input)
  const randomStreamSeed32 = hashString(placementGeometrySeedKey)

  return {
    generatorVersion: 'steel-defect-placement-v1',
    geometrySeedKey: placementGeometrySeedKey,
    placements: [
      ...createScratchPlacements(input, randomStreamSeed32),
      ...createGougePlacements(input, randomStreamSeed32),
      ...createDentPlacements(input, randomStreamSeed32),
      ...createPitPlacements(input, randomStreamSeed32),
      ...createScuffPlacements(input, randomStreamSeed32),
      ...createBurrNickPlacements(input, randomStreamSeed32),
    ],
    randomStreamSeed32,
  }
}

function getArtworkFrameSteelDefectStageAffinity(
  stageFamily: ArtworkFrameSteelDefectStageFamily,
) {
  switch (stageFamily) {
    case 'roughDamage':
      return 0.08
    case 'lowPolishScuff':
      return 0.24
    case 'brushedHairline':
      return 0.5
    case 'satinResidual':
      return 0.72
    case 'polishedMicro':
    default:
      return 0.94
  }
}

function getArtworkFrameSteelDefectStageFamilyFromAffinity(
  stageAffinity: number,
): ArtworkFrameSteelDefectStageFamily {
  let closestStageFamily: ArtworkFrameSteelDefectStageFamily = 'roughDamage'
  let closestDistance = Number.POSITIVE_INFINITY

  for (const stageFamily of ARTWORK_FRAME_STEEL_DEFECT_STAGE_FAMILIES) {
    const distance = Math.abs(
      stageAffinity - getArtworkFrameSteelDefectStageAffinity(stageFamily),
    )

    if (distance < closestDistance) {
      closestDistance = distance
      closestStageFamily = stageFamily
    }
  }

  return closestStageFamily
}

function getArtworkFrameSteelDefectSizeClass({
  length,
  width,
}: ArtworkFrameSteelDefectPlacement) {
  return clampNumber(Math.max(length, width) / 0.26, 0, 1)
}

function getArtworkFrameSteelDefectRasterWidthScale({
  kind,
}: ArtworkFrameSteelDefectPlacement) {
  switch (kind) {
    case 'pit':
      return 1.35
    case 'dent':
      return 1.12
    case 'scuff':
      return 1.5
    case 'burrNick':
      return 1.2
    case 'gouge':
      return 1.08
    case 'scratch':
    default:
      return 1
  }
}

function getArtworkFrameSteelDefectCandidateStrength(
  placement: ArtworkFrameSteelDefectPlacement,
  localX: number,
  localY: number,
  pixelScale: number,
) {
  const halfLength = Math.max(pixelScale * 0.9, placement.length * 0.5)
  const halfWidth = Math.max(
    pixelScale * 0.65,
    placement.width * getArtworkFrameSteelDefectRasterWidthScale(placement),
  )
  const alongRatio = Math.abs(localX) / halfLength

  if (alongRatio > 1.04) {
    return {
      candidate: 0,
      centerline: 0,
    }
  }

  const taperNarrowing =
    1 - clampNumber(Math.pow(alongRatio, 1.4) * placement.taper * 0.42, 0, 0.72)
  const wavinessOffset = Math.sin(localX * 80 + placement.seed * 0.00001) *
    placement.waviness *
    0.5
  const effectiveY = localY - wavinessOffset
  const widthAtPoint = Math.max(pixelScale * 0.55, halfWidth * taperNarrowing)
  const crossRatio = Math.abs(effectiveY) / widthAtPoint

  if (crossRatio > 1) {
    return {
      candidate: 0,
      centerline: 0,
    }
  }

  const brokenEdge =
    0.82 + 0.18 * Math.sin((localX + localY) * 97 + placement.seed * 0.00003)
  const edgeFalloff = Math.pow(1 - crossRatio, 0.45)
  const lengthFalloff = Math.pow(1 - Math.min(1, alongRatio), 0.22)
  const candidate = clampNumber(edgeFalloff * lengthFalloff * brokenEdge, 0, 1)
  const centerlineWidth = Math.max(pixelScale * 0.5, widthAtPoint * 0.18)
  const centerline =
    Math.abs(effectiveY) <= centerlineWidth
      ? clampNumber(1 - Math.abs(effectiveY) / centerlineWidth, 0, 1)
      : 0

  return {
    candidate,
    centerline,
  }
}

function writeArtworkFrameSteelDefectStablePlacementSample(
  maps: ArtworkFrameSteelDefectStablePlacementCandidateMaps,
  index: number,
  placement: ArtworkFrameSteelDefectPlacement,
  candidate: number,
  centerline: number,
) {
  if (candidate <= maps.candidateMask[index]) {
    maps.centerlineMask[index] = Math.max(
      maps.centerlineMask[index],
      centerline,
    )
    return
  }

  maps.candidateMask[index] = candidate
  maps.centerlineMask[index] = centerline
  maps.tangentX[index] = placement.tangentX
  maps.tangentY[index] = placement.tangentY
  maps.sizeClass[index] = getArtworkFrameSteelDefectSizeClass(placement)
  maps.depthLimit[index] = placement.maxDepth
  maps.edgeRoughness[index] = placement.edgeRoughness
  maps.stageAffinity[index] =
    getArtworkFrameSteelDefectStageAffinity(placement.stageFamily)
}

function rasterizeArtworkFrameSteelDefectPlacement(
  maps: ArtworkFrameSteelDefectStablePlacementCandidateMaps,
  placement: ArtworkFrameSteelDefectPlacement,
  widthPixels: number,
  heightPixels: number,
  frameMask?: Float32Array | null,
) {
  const halfExtent = Math.max(placement.length, placement.width) * 0.86
  const minX = clampNumber(
    Math.floor((placement.centerX - halfExtent) * widthPixels),
    0,
    widthPixels - 1,
  )
  const maxX = clampNumber(
    Math.ceil((placement.centerX + halfExtent) * widthPixels),
    minX,
    widthPixels - 1,
  )
  const minY = clampNumber(
    Math.floor((placement.centerY - halfExtent) * heightPixels),
    0,
    heightPixels - 1,
  )
  const maxY = clampNumber(
    Math.ceil((placement.centerY + halfExtent) * heightPixels),
    minY,
    heightPixels - 1,
  )
  const normalX = -placement.tangentY
  const normalY = placement.tangentX
  const pixelScale = 1 / Math.max(widthPixels, heightPixels)

  for (let y = minY; y <= maxY; y += 1) {
    const normalizedY = (y + 0.5) / heightPixels

    for (let x = minX; x <= maxX; x += 1) {
      const index = y * widthPixels + x

      if (frameMask && frameMask[index] <= 0) {
        continue
      }

      const normalizedX = (x + 0.5) / widthPixels
      const deltaX = normalizedX - placement.centerX
      const deltaY = normalizedY - placement.centerY
      const localX = deltaX * placement.tangentX + deltaY * placement.tangentY
      const localY = deltaX * normalX + deltaY * normalY
      const { candidate, centerline } =
        getArtworkFrameSteelDefectCandidateStrength(
          placement,
          localX,
          localY,
          pixelScale,
        )

      if (candidate > 0) {
        writeArtworkFrameSteelDefectStablePlacementSample(
          maps,
          index,
          placement,
          candidate,
          centerline,
        )
      }
    }
  }
}

function resolveArtworkFrameSteelDefectMapSize({
  frameMask = null,
  heightPixels,
  widthPixels,
}: CreateArtworkFrameSteelEmptyDefectDecalMapsInput) {
  const resolvedWidth = Math.max(1, Math.round(widthPixels))
  const resolvedHeight = Math.max(1, Math.round(heightPixels))
  const length = resolvedWidth * resolvedHeight

  if (frameMask && frameMask.length !== length) {
    throw new Error(
      `Steel defect frame mask length ${frameMask.length} does not match ` +
        `texture dimensions ${resolvedWidth}x${resolvedHeight}`,
    )
  }

  return {
    heightPixels: resolvedHeight,
    length,
    widthPixels: resolvedWidth,
  }
}

export function rasterizeArtworkFrameSteelDefectStablePlacementMaps(
  input: RasterizeArtworkFrameSteelDefectStablePlacementMapsInput,
): ArtworkFrameSteelDefectDecalMapSet {
  const maps = createArtworkFrameSteelEmptyDefectDecalMaps(input)

  for (const placement of input.placementSet.placements) {
    rasterizeArtworkFrameSteelDefectPlacement(
      maps.stablePlacement[placement.kind],
      placement,
      maps.widthPixels,
      maps.heightPixels,
      input.frameMask,
    )
  }

  return maps
}

function validateArtworkFrameSteelDefectActivationFrameMask(
  maps: ArtworkFrameSteelDefectDecalMapSet,
  frameMask?: Float32Array | null,
) {
  const length = maps.widthPixels * maps.heightPixels

  if (frameMask && frameMask.length !== length) {
    throw new Error(
      `Steel defect activation frame mask length ${frameMask.length} ` +
        `does not match texture dimensions ${maps.widthPixels}x${maps.heightPixels}`,
    )
  }
}

function clearArtworkFrameSteelDefectActiveBodyMaps(
  maps: ArtworkFrameSteelDefectDecalMapSet,
) {
  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    for (const channel of ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS) {
      maps.activeBodies[kind][channel].fill(0)
    }
  }
}

function clearArtworkFrameSteelDefectPhysicalContributionMaps(
  maps: ArtworkFrameSteelDefectDecalMapSet,
) {
  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    for (
      const channel of ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS
    ) {
      maps.physicalContributions[kind][channel].fill(0)
    }
  }
}

export function activateArtworkFrameSteelDefectActiveBodyMaps({
  defectDecalMaps,
  frameMask = null,
  metalPolish,
}: ActivateArtworkFrameSteelDefectActiveBodyMapsInput): ArtworkFrameSteelDefectDecalMapSet {
  validateArtworkFrameSteelDefectActivationFrameMask(defectDecalMaps, frameMask)
  clearArtworkFrameSteelDefectActiveBodyMaps(defectDecalMaps)

  const length = defectDecalMaps.widthPixels * defectDecalMaps.heightPixels

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    const stablePlacement = defectDecalMaps.stablePlacement[kind]
    const activeBodies = defectDecalMaps.activeBodies[kind]

    for (let index = 0; index < length; index += 1) {
      if (frameMask && frameMask[index] <= 0) {
        continue
      }

      const candidate = clampNumber(stablePlacement.candidateMask[index], 0, 1)

      if (candidate <= 0) {
        continue
      }

      const stageFamily = getArtworkFrameSteelDefectStageFamilyFromAffinity(
        stablePlacement.stageAffinity[index],
      )
      const response = getArtworkFrameSteelDefectActiveBodyResponse({
        depthLimit: stablePlacement.depthLimit[index],
        edgeRoughness: stablePlacement.edgeRoughness[index],
        kind,
        metalPolish,
        sizeClass: stablePlacement.sizeClass[index],
        stageFamily,
      })

      if (response.presence <= 0) {
        continue
      }

      const centerline = Math.min(
        candidate,
        clampNumber(stablePlacement.centerlineMask[index], 0, 1),
      )
      const edgeBand = clampNumber(candidate - centerline * 0.7, 0, 1)

      activeBodies.presenceMask[index] = candidate * response.presence
      activeBodies.bodyMask[index] = candidate * response.bodyStrength
      activeBodies.coreMask[index] = centerline * response.coreStrength
      activeBodies.edgeMask[index] = edgeBand * response.edgeStrength
    }
  }

  return defectDecalMaps
}

export function populateArtworkFrameSteelDefectPhysicalContributionMaps({
  defectDecalMaps,
  frameMask = null,
  metalPolish,
}: PopulateArtworkFrameSteelDefectPhysicalContributionMapsInput): ArtworkFrameSteelDefectDecalMapSet {
  validateArtworkFrameSteelDefectActivationFrameMask(defectDecalMaps, frameMask)
  clearArtworkFrameSteelDefectPhysicalContributionMaps(defectDecalMaps)

  const length = defectDecalMaps.widthPixels * defectDecalMaps.heightPixels

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    const stablePlacement = defectDecalMaps.stablePlacement[kind]
    const activeBodies = defectDecalMaps.activeBodies[kind]
    const physicalContributions = defectDecalMaps.physicalContributions[kind]

    for (let index = 0; index < length; index += 1) {
      if (frameMask && frameMask[index] <= 0) {
        continue
      }

      const response = getArtworkFrameSteelDefectPhysicalContributionResponse({
        activeBody: {
          bodyMask: activeBodies.bodyMask[index],
          coreMask: activeBodies.coreMask[index],
          edgeMask: activeBodies.edgeMask[index],
          presenceMask: activeBodies.presenceMask[index],
        },
        depthLimit: stablePlacement.depthLimit[index],
        edgeRoughness: stablePlacement.edgeRoughness[index],
        kind,
        metalPolish,
        sizeClass: stablePlacement.sizeClass[index],
        stageFamily: getArtworkFrameSteelDefectStageFamilyFromAffinity(
          stablePlacement.stageAffinity[index],
        ),
      })

      if (
        response.height <= 0 &&
        response.ambientOcclusion <= 0 &&
        response.rimLight <= 0 &&
        response.rimShadow <= 0 &&
        response.roughnessResponse <= 0 &&
        response.glossResponse <= 0 &&
        response.albedoResponse <= 0 &&
        response.selfShadowReceiver <= 0 &&
        response.normalStrength <= 0
      ) {
        continue
      }

      physicalContributions.height[index] = response.height
      physicalContributions.ambientOcclusion[index] =
        response.ambientOcclusion
      physicalContributions.rimLight[index] = response.rimLight
      physicalContributions.rimShadow[index] = response.rimShadow
      physicalContributions.roughnessResponse[index] =
        response.roughnessResponse
      physicalContributions.glossResponse[index] = response.glossResponse
      physicalContributions.albedoResponse[index] = response.albedoResponse
      physicalContributions.selfShadowReceiver[index] =
        response.selfShadowReceiver
      physicalContributions.normalStrength[index] = response.normalStrength
    }
  }

  return defectDecalMaps
}

function createArtworkFrameSteelZeroChannelMaps<Channel extends string>(
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

export function createArtworkFrameSteelEmptyDefectDecalMaps(
  input: CreateArtworkFrameSteelEmptyDefectDecalMapsInput,
): ArtworkFrameSteelDefectDecalMapSet {
  const { heightPixels, length, widthPixels } =
    resolveArtworkFrameSteelDefectMapSize(input)

  return {
    activeBodies: createArtworkFrameSteelDefectKindRecord(() =>
      createArtworkFrameSteelZeroChannelMaps(
        ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS,
        length,
      )
    ),
    heightPixels,
    physicalContributions: createArtworkFrameSteelDefectKindRecord(() =>
      createArtworkFrameSteelZeroChannelMaps(
        ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS,
        length,
      )
    ),
    stablePlacement: createArtworkFrameSteelDefectKindRecord(() =>
      createArtworkFrameSteelZeroChannelMaps(
        ARTWORK_FRAME_STEEL_DEFECT_STABLE_PLACEMENT_CHANNELS,
        length,
      )
    ),
    widthPixels,
  }
}
