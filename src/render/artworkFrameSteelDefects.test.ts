import { existsSync, readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createMetalArtworkFramePathData,
  getArtworkFrameStrokeWidth,
} from './artworkFrame.ts'
import {
  buildMetalArtworkFrameMaterialPlan,
  getArtworkFrameCanvasMaterialTextureKey,
} from './artworkFrameMaterialPlan.ts'
import {
  getArtworkFrameCanvasMaterialSteelFinishDerivedMapsCacheKey,
} from './artworkFrameMaterialCanvas.ts'
import {
  createArtworkFrameMaterialShadingCoordinateContext,
} from './artworkFrameMaterialShading.ts'
import {
  createArtworkFrameMaterialWorkerShadingRequest,
} from './artworkFrameMaterialShadingWorkerClient.ts'
import {
  ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS,
  ARTWORK_FRAME_STEEL_DEFECT_KINDS,
  ARTWORK_FRAME_STEEL_DEFECT_LEGACY_TRANSITION_CHANNELS,
  ARTWORK_FRAME_STEEL_DEFECT_MAP_ROLE_NAMES,
  ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS,
  ARTWORK_FRAME_STEEL_DEFECT_STAGE_FAMILIES,
  ARTWORK_FRAME_STEEL_DEFECT_STABLE_PLACEMENT_CHANNELS,
  activateArtworkFrameSteelDefectActiveBodyMaps,
  createArtworkFrameSteelDefectPlacementSet,
  createArtworkFrameSteelEmptyDefectDecalMaps,
  createArtworkFrameSteelDefectKindRecord,
  getArtworkFrameSteelDefectActiveBodyResponse,
  getArtworkFrameSteelDefectLowPolishResponseScalars,
  getArtworkFrameSteelDefectPhysicalContributionResponse,
  getArtworkFrameSteelDefectPlacementGeometrySeedKey,
  isArtworkFrameSteelDefectLegacyTransitionChannel,
  populateArtworkFrameSteelDefectPhysicalContributionMaps,
  rasterizeArtworkFrameSteelDefectStablePlacementMaps,
  type ArtworkFrameSteelDefectDecalMapSet,
  type ArtworkFrameSteelDefectKind,
  type ArtworkFrameSteelDefectLowPolishResponseScalars,
  type ArtworkFrameSteelDefectPlacement,
  type ArtworkFrameSteelDefectStageFamily,
} from './artworkFrameSteelDefects.ts'
import {
  ARTWORK_FRAME_STEEL_SUBSTRATE_DERIVED_MAP_CHANNELS,
  ARTWORK_FRAME_STEEL_SUBSTRATE_FIELD_CHANNELS,
  buildArtworkFrameSteelFinishDerivedMaps,
  buildArtworkFrameSteelFinishField,
  buildArtworkFrameSteelFinishNormalInputs,
  createArtworkFrameSteelEmptySubstrateDerivedMaps,
  createArtworkFrameSteelEmptySubstrateField,
  createArtworkFrameSteelEmptySubstrateNormalInputs,
  getArtworkFrameSteelFinishSelfShadowReceiver,
  type ArtworkFrameSteelFinishDerivedMaps,
  type ArtworkFrameSteelSubstrateCompositionInputs,
} from './artworkFrameSteelFinish.ts'

const STAGE4_DIAGNOSTIC_MANIFEST_URL = new URL(
  '../../artifacts/steel-polish-stage4/stage4-diagnostic-package-manifest.json',
  import.meta.url,
)
const STAGE4_EXPECTED_DIAGNOSTIC_FILES = [
  'polish-checkpoint-active-body-contact-sheet.png',
  'presence-mask-by-kind-contact-sheet.png',
  'body-mask-by-kind-contact-sheet.png',
  'core-mask-by-kind-contact-sheet.png',
  'edge-mask-by-kind-contact-sheet.png',
  'inactive-zero-guard-contact-sheet.png',
  'same-seed-light-active-body-stability-contact-sheet.png',
  'same-seed-tarnish-active-body-stability-contact-sheet.png',
  'image-seed-active-body-comparison-contact-sheet.png',
] as const
const STAGE5_DIAGNOSTIC_MANIFEST_URL = new URL(
  '../../artifacts/steel-polish-stage5/stage5-diagnostic-package-manifest.json',
  import.meta.url,
)
const STAGE5_EXPECTED_DIAGNOSTIC_FILES = [
  'polish-checkpoint-active-body-contact-sheet.png',
  'polish-checkpoint-physical-contribution-contact-sheet.png',
  'final-shaded-polish-checkpoint-contact-sheet.png',
  'same-seed-light-final-shaded-contact-sheet.png',
  'same-seed-light-physical-stability-contact-sheet.png',
  'same-seed-tarnish-final-shaded-contact-sheet.png',
  'same-seed-tarnish-physical-stability-contact-sheet.png',
  'scratch-physical-contribution-contact-sheet.png',
  'gouge-physical-contribution-contact-sheet.png',
  'dent-physical-contribution-contact-sheet.png',
  'pit-physical-contribution-contact-sheet.png',
  'scuff-physical-contribution-contact-sheet.png',
  'burrNick-physical-contribution-contact-sheet.png',
  'roughness-gloss-response-by-kind-contact-sheet.png',
  'inactive-zero-guard-contact-sheet.png',
  'frame-ring-clipping-guard-contact-sheet.png',
] as const
const STAGE6_BEFORE_DIAGNOSTIC_MANIFEST_URL = new URL(
  '../../artifacts/steel-polish-stage6/before/stage6-before-diagnostic-package-manifest.json',
  import.meta.url,
)
const STAGE6_BEFORE_EXPECTED_DIAGNOSTIC_FILES = [
  'active-body-polish-light-contact-sheet.png',
  'physical-contribution-polish-light-contact-sheet.png',
  'final-shaded-polish-light-contact-sheet.png',
  'inactive-zero-guard-contact-sheet.png',
  'frame-ring-clipping-guard-contact-sheet.png',
] as const
const STAGE6_AFTER_DIAGNOSTIC_MANIFEST_URL = new URL(
  '../../artifacts/steel-polish-stage6/after/stage6-after-diagnostic-package-manifest.json',
  import.meta.url,
)
const STAGE6_AFTER_EXPECTED_DIAGNOSTIC_FILES = [
  'before-after-final-shaded-contact-sheet.png',
  'active-body-polish-light-contact-sheet.png',
  'physical-contribution-polish-light-contact-sheet.png',
  'final-shaded-polish-light-contact-sheet.png',
  'polish0-active-physical-final-light-contact-sheet.png',
  'low-polish-ramp-final-light-contact-sheet.png',
  'polish0-10-25-final-light-comparison-contact-sheet.png',
  'polish10-25-30-50-final-light-comparison-contact-sheet.png',
  'polish25-30-50-final-light-comparison-contact-sheet.png',
  'inactive-zero-guard-contact-sheet.png',
  'frame-ring-clipping-guard-contact-sheet.png',
  'light-stability-contact-sheet.png',
  'tarnish-stability-contact-sheet.png',
] as const
const STAGE6_5_SUBSTRATE_DIAGNOSTIC_MANIFEST_URL = new URL(
  '../../artifacts/steel-polish-stage6-5/stage6-5-substrate-diagnostic-package-manifest.json',
  import.meta.url,
)
const STAGE6_5_SUBSTRATE_EXPECTED_DIAGNOSTIC_FILES = [
  'substrate-albedo-contact-sheet.png',
  'substrate-height-contact-sheet.png',
  'substrate-ao-contact-sheet.png',
  'substrate-speckle-guard-contact-sheet.png',
  'substrate-roughness-contact-sheet.png',
  'substrate-gloss-contact-sheet.png',
  'substrate-anisotropy-contact-sheet.png',
  'substrate-normals-contact-sheet.png',
  'substrate-only-shaded-steel-contact-sheet.png',
  'active-pit-decal-diagnostic-contact-sheet.png',
] as const

function createChannelMaps<Channel extends string>(
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

function createTestSteelCanvasTextureDescriptor() {
  const frame = {
    color: '#ffffff',
    enabled: true,
    jaggedness: 50,
    lumpiness: 50,
    metalBevelWidth: 64,
    metalBrushAngle: 12,
    metalDepth: 72,
    metalLightAngle: 315,
    metalPattern: 'none',
    metalPatternScale: 90,
    metalPatternStrength: 55,
    metalPolish: 50,
    metalProfile: 'flat',
    metalTarnish: 0,
    metalType: 'steel',
    roughnessOffset: 0,
    shape: 'rectangle',
    style: 'metal',
    width: 8,
  } as const
  const bounds = { height: 96, width: 128, x: 0, y: 0 }
  const strokeWidth = getArtworkFrameStrokeWidth(
    frame,
    bounds.width,
    bounds.height,
  )
  const pathData = createMetalArtworkFramePathData(
    frame,
    bounds,
    strokeWidth,
  )
  const plan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    pathData,
    strokeWidth,
  })

  assert.equal(plan.backend, 'canvas-texture')
  assert.ok(plan.canvasTexture)

  return plan.canvasTexture
}

function createTestImageData(width: number, height: number): ImageData {
  return {
    colorSpace: 'srgb',
    data: new Uint8ClampedArray(width * height * 4),
    height,
    width,
  } as ImageData
}

function buildTestSteelFinishMapsWithDefectDecals() {
  const descriptor = createTestSteelCanvasTextureDescriptor()

  assert.ok(descriptor.steelFinishFieldRequest)

  const field = buildArtworkFrameSteelFinishField(
    descriptor.steelFinishFieldRequest,
  )
  const defectDecalMaps = createArtworkFrameSteelEmptyDefectDecalMaps({
    frameMask: field.fields.frameMask,
    heightPixels: field.fieldSize.height,
    widthPixels: field.fieldSize.width,
  })

  defectDecalMaps.stablePlacement.scratch.candidateMask[0] = 1
  defectDecalMaps.stablePlacement.scratch.depthLimit[0] = 0.75
  defectDecalMaps.activeBodies.gouge.presenceMask[1] = 0.5
  defectDecalMaps.activeBodies.gouge.bodyMask[1] = 0.45
  defectDecalMaps.physicalContributions.dent.height[2] = -0.35
  defectDecalMaps.physicalContributions.dent.ambientOcclusion[2] = 0.4
  defectDecalMaps.physicalContributions.pit.selfShadowReceiver[3] = 0.6
  defectDecalMaps.physicalContributions.scuff.albedoResponse[4] = 0.2

  const steelFinishMaps = buildArtworkFrameSteelFinishDerivedMaps(field, {
    defectDecalMaps,
  })

  return {
    descriptor,
    steelFinishMaps,
  }
}

function createWorkerRequestForSteelFinishMaps(
  steelFinishMaps: ArtworkFrameSteelFinishDerivedMaps,
) {
  const descriptor = createTestSteelCanvasTextureDescriptor()

  return createArtworkFrameMaterialWorkerShadingRequest(
    {
      coordinates: createArtworkFrameMaterialShadingCoordinateContext(descriptor),
      corrosionMaps: null,
      imageData: createTestImageData(
        steelFinishMaps.widthPixels,
        steelFinishMaps.heightPixels,
      ),
      lighting: {
        lightVector: { x: 0, y: 0, z: 1 },
      },
      metalBrushAngle:
        descriptor.steelFinishFieldRequest?.brushAngleDegrees ?? 0,
      steelFinishMaps,
      steelFinishNormalInputs:
        buildArtworkFrameSteelFinishNormalInputs(steelFinishMaps),
    },
    'steel-defect-decal-worker-shape',
  )
}

function createTestSteelDefectPlacementInput() {
  return {
    brushDirection: {
      angleDegrees: 12,
      tangentX: 0.9781476007338057,
      tangentY: 0.20791169081775931,
    },
    frameRingCoordinates: {
      coordinateSpace: 'canonical-frame-ring-v1',
      frameShape: 'rectangle',
      frameStyle: 'metal',
      ringKey: 'flat-rectangle-inner-outer-ring-v1',
    },
    geometrySeedKey: 'steel-finish-field-v1|material-seed:test-a',
    materialIdentity: {
      metalType: 'steel',
    },
  } as const
}

function createDefaultFrameRingMask(widthPixels: number, heightPixels: number) {
  const mask = new Float32Array(widthPixels * heightPixels)

  for (let y = 0; y < heightPixels; y += 1) {
    const normalizedY = (y + 0.5) / heightPixels

    for (let x = 0; x < widthPixels; x += 1) {
      const normalizedX = (x + 0.5) / widthPixels

      mask[y * widthPixels + x] = isInsideDefaultFrameRing(
        normalizedX,
        normalizedY,
      )
        ? 1
        : 0
    }
  }

  return mask
}

function countNonZeroValues(values: Float32Array) {
  return values.reduce((count, value) => count + (value !== 0 ? 1 : 0), 0)
}

function sumAbsoluteDifference(first: Float32Array, second: Float32Array) {
  assert.equal(first.length, second.length)

  return first.reduce(
    (sum, value, index) => sum + Math.abs(value - second[index]),
    0,
  )
}

function sumStablePlacementMapDifference(
  first: ArtworkFrameSteelDefectDecalMapSet,
  second: ArtworkFrameSteelDefectDecalMapSet,
) {
  let totalDifference = 0

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    for (const channel of ARTWORK_FRAME_STEEL_DEFECT_STABLE_PLACEMENT_CHANNELS) {
      totalDifference += sumAbsoluteDifference(
        first.stablePlacement[kind][channel],
        second.stablePlacement[kind][channel],
      )
    }
  }

  return totalDifference
}

function cloneSteelDefectDecalMaps(
  source: ArtworkFrameSteelDefectDecalMapSet,
) {
  const clone = createArtworkFrameSteelEmptyDefectDecalMaps({
    heightPixels: source.heightPixels,
    widthPixels: source.widthPixels,
  })

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    for (const channel of ARTWORK_FRAME_STEEL_DEFECT_STABLE_PLACEMENT_CHANNELS) {
      clone.stablePlacement[kind][channel].set(
        source.stablePlacement[kind][channel],
      )
    }

    for (const channel of ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS) {
      clone.activeBodies[kind][channel].set(source.activeBodies[kind][channel])
    }

    for (
      const channel of ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS
    ) {
      clone.physicalContributions[kind][channel].set(
        source.physicalContributions[kind][channel],
      )
    }
  }

  return clone
}

function sumActiveBodyMapValues(
  maps: ArtworkFrameSteelDefectDecalMapSet,
  kind: ArtworkFrameSteelDefectKind,
) {
  return ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS.reduce(
    (sum, channel) =>
      sum +
      maps.activeBodies[kind][channel].reduce(
        (channelSum, value) => channelSum + value,
        0,
      ),
    0,
  )
}

function sumActiveBodyMapDifference(
  first: ArtworkFrameSteelDefectDecalMapSet,
  second: ArtworkFrameSteelDefectDecalMapSet,
) {
  let totalDifference = 0

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    for (const channel of ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS) {
      totalDifference += sumAbsoluteDifference(
        first.activeBodies[kind][channel],
        second.activeBodies[kind][channel],
      )
    }
  }

  return totalDifference
}

function sumPhysicalContributionMapValues(
  maps: ArtworkFrameSteelDefectDecalMapSet,
  kind: ArtworkFrameSteelDefectKind,
) {
  return ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS.reduce(
    (sum, channel) =>
      sum +
      maps.physicalContributions[kind][channel].reduce(
        (channelSum, value) => channelSum + value,
        0,
      ),
    0,
  )
}

function sumActiveBodyChannelValues(
  maps: ArtworkFrameSteelDefectDecalMapSet,
  kind: ArtworkFrameSteelDefectKind,
  channel: typeof ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS[number],
) {
  return maps.activeBodies[kind][channel].reduce(
    (sum, value) => sum + value,
    0,
  )
}

function createActivatedTestStablePlacementMaps(metalPolish: number) {
  const maps = createTestStablePlacementMaps()

  activateArtworkFrameSteelDefectActiveBodyMaps({
    defectDecalMaps: maps,
    metalPolish,
  })

  return maps
}

function assertActiveBodyKindSet(
  maps: ArtworkFrameSteelDefectDecalMapSet,
  expectedActiveKinds: readonly ArtworkFrameSteelDefectKind[],
  message: string,
) {
  const expected = new Set(expectedActiveKinds)

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    const isActive = sumActiveBodyMapValues(maps, kind) > 0

    assert.equal(isActive, expected.has(kind), `${message}: ${kind}`)

    if (!expected.has(kind)) {
      for (const channel of ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS) {
        assert.equal(
          countNonZeroValues(maps.activeBodies[kind][channel]),
          0,
          `${message}: inactive ${kind}.${channel} should be exactly zero`,
        )
      }
    }
  }
}

function assertPhysicalContributionMapsAreZero(
  maps: ArtworkFrameSteelDefectDecalMapSet,
) {
  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    for (
      const channel of ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS
    ) {
      assert.equal(
        countNonZeroValues(maps.physicalContributions[kind][channel]),
        0,
        `${kind}.${channel} should remain physically inert`,
      )
    }
  }
}

function assertActiveBodyMapsAreClippedToFrameRing(
  maps: ArtworkFrameSteelDefectDecalMapSet,
  frameMask: Float32Array,
) {
  assert.equal(frameMask.length, maps.widthPixels * maps.heightPixels)

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    for (const channel of ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS) {
      const values = maps.activeBodies[kind][channel]

      for (let index = 0; index < values.length; index += 1) {
        if (frameMask[index] > 0) {
          continue
        }

        assert.equal(
          values[index],
          0,
          `${kind}.${channel} should be zero outside the active frame ring`,
        )
      }
    }
  }
}

function assertPhysicalContributionMapsAreClippedToFrameRing(
  maps: ArtworkFrameSteelDefectDecalMapSet,
  frameMask: Float32Array,
) {
  assert.equal(frameMask.length, maps.widthPixels * maps.heightPixels)

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    for (
      const channel of ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS
    ) {
      const values = maps.physicalContributions[kind][channel]

      for (let index = 0; index < values.length; index += 1) {
        if (frameMask[index] > 0) {
          continue
        }

        assert.equal(
          values[index],
          0,
          `${kind}.${channel} should be zero outside the active frame ring`,
        )
      }
    }
  }
}

function getTestActivationResponse(
  kind: ArtworkFrameSteelDefectKind,
  stageFamily: ArtworkFrameSteelDefectStageFamily,
  metalPolish: number,
) {
  return getArtworkFrameSteelDefectActiveBodyResponse({
    depthLimit: 0.62,
    edgeRoughness: 0.48,
    kind,
    metalPolish,
    sizeClass: 0.42,
    stageFamily,
  })
}

function assertActivationResponseActive(
  response: ReturnType<typeof getArtworkFrameSteelDefectActiveBodyResponse>,
  message: string,
) {
  assert.equal(response.presence > 0, true, `${message}: presence`)
  assert.equal(response.bodyStrength > 0, true, `${message}: body`)
  assert.equal(response.coreStrength > 0, true, `${message}: core`)
  assert.equal(response.edgeStrength > 0, true, `${message}: edge`)
}

function assertActivationResponseInactive(
  response: ReturnType<typeof getArtworkFrameSteelDefectActiveBodyResponse>,
  message: string,
) {
  assert.equal(response.presence, 0, `${message}: presence`)
  assert.equal(response.bodyStrength, 0, `${message}: body`)
  assert.equal(response.coreStrength, 0, `${message}: core`)
  assert.equal(response.edgeStrength, 0, `${message}: edge`)
}

function sumActivationPresence(
  kind: ArtworkFrameSteelDefectKind,
  metalPolish: number,
  stageFamilies = ARTWORK_FRAME_STEEL_DEFECT_STAGE_FAMILIES,
) {
  return stageFamilies.reduce(
    (sum, stageFamily) =>
      sum + getTestActivationResponse(kind, stageFamily, metalPolish).presence,
    0,
  )
}

type SteelDefectPhysicalContributionInput = Parameters<
  typeof getArtworkFrameSteelDefectPhysicalContributionResponse
>[0]
type SteelDefectLowPolishResponseInput = Parameters<
  typeof getArtworkFrameSteelDefectLowPolishResponseScalars
>[0]

function createTestActiveBodySample(
  overrides: Partial<SteelDefectPhysicalContributionInput['activeBody']> = {},
) {
  return {
    bodyMask: 0.72,
    coreMask: 0.54,
    edgeMask: 0.36,
    presenceMask: 0.82,
    ...overrides,
  }
}

function assertPhysicalContributionResponseExactZero(
  response: ReturnType<typeof getArtworkFrameSteelDefectPhysicalContributionResponse>,
  message: string,
) {
  for (const [channel, value] of Object.entries(response)) {
    assert.equal(value, 0, `${message}: ${channel} should be exactly zero`)
  }
}

function assertPhysicalContributionResponseBounded(
  response: ReturnType<typeof getArtworkFrameSteelDefectPhysicalContributionResponse>,
  message: string,
) {
  for (const [channel, value] of Object.entries(response)) {
    assert.equal(Number.isFinite(value), true, `${message}: ${channel} finite`)
    assert.equal(value >= 0, true, `${message}: ${channel} lower bound`)
    assert.equal(value <= 1, true, `${message}: ${channel} upper bound`)
  }
}

function assertLowPolishResponseScalarsExactZero(
  response: ArtworkFrameSteelDefectLowPolishResponseScalars,
  message: string,
) {
  for (const [channel, value] of Object.entries(response)) {
    assert.equal(value, 0, `${message}: ${channel} should be exactly zero`)
  }
}

function assertLowPolishResponseScalarsBounded(
  response: ArtworkFrameSteelDefectLowPolishResponseScalars,
  message: string,
) {
  for (const [channel, value] of Object.entries(response)) {
    assert.equal(Number.isFinite(value), true, `${message}: ${channel} finite`)
    assert.equal(value >= 0, true, `${message}: ${channel} lower bound`)
    assert.equal(value <= 1, true, `${message}: ${channel} upper bound`)
  }
}

function getTestPhysicalContributionResponse(
  kind: ArtworkFrameSteelDefectKind,
  overrides: Partial<SteelDefectPhysicalContributionInput> = {},
) {
  return getArtworkFrameSteelDefectPhysicalContributionResponse({
    activeBody: createTestActiveBodySample(),
    depthLimit: 0.68,
    edgeRoughness: 0.62,
    kind,
    metalPolish: 10,
    sizeClass: 0.48,
    stageFamily: 'roughDamage',
    ...overrides,
  })
}

function getTestLowPolishResponseScalars(
  kind: ArtworkFrameSteelDefectKind,
  overrides: Partial<SteelDefectLowPolishResponseInput> = {},
) {
  return getArtworkFrameSteelDefectLowPolishResponseScalars({
    activeBody: createTestActiveBodySample(),
    kind,
    metalPolish: 10,
    stageFamily: 'roughDamage',
    ...overrides,
  })
}

function createTestStablePlacementMaps(seedKey = 'test-a') {
  const placementSet = createArtworkFrameSteelDefectPlacementSet({
    ...createTestSteelDefectPlacementInput(),
    geometrySeedKey: `steel-finish-field-v1|material-seed:${seedKey}`,
  })
  const frameMask = createDefaultFrameRingMask(128, 96)

  return rasterizeArtworkFrameSteelDefectStablePlacementMaps({
    frameMask,
    heightPixels: 96,
    placementSet,
    widthPixels: 128,
  })
}

function createPlacementRegressionCase({
  bounds = { height: 96, width: 128, x: 0, y: 0 },
  lightVector = { x: 0, y: 0, z: 1 },
  materialSeedKey = 'stage-3-image-a',
  materialSeed32 = 0xabcdef01,
  metalPolish = 50,
  metalTarnish = 0,
}: {
  bounds?: { height: number; width: number; x: number; y: number }
  lightVector?: { x: number; y: number; z: number }
  materialSeed32?: number
  materialSeedKey?: string
  metalPolish?: number
  metalTarnish?: number
} = {}) {
  const frame = {
    color: '#ffffff',
    enabled: true,
    jaggedness: 50,
    lumpiness: 50,
    metalBevelWidth: 64,
    metalBrushAngle: 12,
    metalDepth: 72,
    metalLightAngle: 315,
    metalPattern: 'none',
    metalPatternScale: 90,
    metalPatternStrength: 55,
    metalPolish,
    metalProfile: 'flat',
    metalTarnish,
    metalType: 'steel',
    roughnessOffset: 0,
    shape: 'rectangle',
    style: 'metal',
    width: 8,
  } as const
  const strokeWidth = getArtworkFrameStrokeWidth(
    frame,
    bounds.width,
    bounds.height,
  )
  const pathData = createMetalArtworkFramePathData(
    frame,
    bounds,
    strokeWidth,
  )
  const materialSeed = {
    algorithm: 'sha256-image-v1' as const,
    key: materialSeedKey,
    seed32: materialSeed32,
  }
  const plan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    lightVector,
    materialSeed,
    pathData,
    strokeWidth,
  })

  assert.ok(plan.canvasTexture?.steelFinishFieldRequest)

  const placementSet = createArtworkFrameSteelDefectPlacementSet({
    ...createTestSteelDefectPlacementInput(),
    geometrySeedKey:
      plan.canvasTexture.steelFinishFieldRequest.geometrySeedKey,
  })
  const frameMask = createDefaultFrameRingMask(128, 96)
  const stableMaps = rasterizeArtworkFrameSteelDefectStablePlacementMaps({
    frameMask,
    heightPixels: 96,
    placementSet,
    widthPixels: 128,
  })

  return {
    frameMask,
    placementSet,
    stableMaps,
  }
}

function createActivatedPlacementRegressionCase({
  activationPolish,
  ...options
}: Parameters<typeof createPlacementRegressionCase>[0] & {
  activationPolish?: number
} = {}) {
  const regressionCase = createPlacementRegressionCase(options)

  activateArtworkFrameSteelDefectActiveBodyMaps({
    defectDecalMaps: regressionCase.stableMaps,
    frameMask: regressionCase.frameMask,
    metalPolish: activationPolish ?? options?.metalPolish ?? 50,
  })

  return regressionCase
}

function getPlacementIdentity(
  placementSet: ReturnType<typeof createArtworkFrameSteelDefectPlacementSet>,
) {
  return placementSet.placements.map((placement) => ({
    centerX: placement.centerX,
    centerY: placement.centerY,
    edgeRoughness: placement.edgeRoughness,
    id: placement.id,
    internalBreakup: placement.internalBreakup,
    kind: placement.kind,
    length: placement.length,
    maxDepth: placement.maxDepth,
    microScratchCount: placement.microScratchCount,
    secondaryTangentX: placement.secondaryTangentX,
    secondaryTangentY: placement.secondaryTangentY,
    seed: placement.seed,
    stageFamily: placement.stageFamily,
    tangentX: placement.tangentX,
    tangentY: placement.tangentY,
    taper: placement.taper,
    waviness: placement.waviness,
    width: placement.width,
  }))
}

function assertPlacementSetsEqual(
  first: ReturnType<typeof createArtworkFrameSteelDefectPlacementSet>,
  second: ReturnType<typeof createArtworkFrameSteelDefectPlacementSet>,
) {
  assert.equal(second.generatorVersion, first.generatorVersion)
  assert.equal(second.geometrySeedKey, first.geometrySeedKey)
  assert.equal(second.randomStreamSeed32, first.randomStreamSeed32)
  assert.deepEqual(getPlacementIdentity(second), getPlacementIdentity(first))
}

function assertStablePlacementMapsEqual(
  first: ArtworkFrameSteelDefectDecalMapSet,
  second: ArtworkFrameSteelDefectDecalMapSet,
) {
  assert.equal(second.widthPixels, first.widthPixels)
  assert.equal(second.heightPixels, first.heightPixels)

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    for (const channel of ARTWORK_FRAME_STEEL_DEFECT_STABLE_PLACEMENT_CHANNELS) {
      assert.deepEqual(
        second.stablePlacement[kind][channel],
        first.stablePlacement[kind][channel],
        `${kind}.${channel} should stay anchored`,
      )
    }
  }
}

function assertActiveBodyMapsEqual(
  first: ArtworkFrameSteelDefectDecalMapSet,
  second: ArtworkFrameSteelDefectDecalMapSet,
) {
  assert.equal(second.widthPixels, first.widthPixels)
  assert.equal(second.heightPixels, first.heightPixels)

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    for (const channel of ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS) {
      assert.deepEqual(
        second.activeBodies[kind][channel],
        first.activeBodies[kind][channel],
        `${kind}.${channel} active body map should stay anchored`,
      )
    }
  }
}

function assertStablePlacementMapsHaveCandidates(
  maps: ArtworkFrameSteelDefectDecalMapSet,
) {
  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    assert.equal(
      countNonZeroValues(maps.stablePlacement[kind].candidateMask) > 0,
      true,
      `${kind}.candidateMask should contain stable candidates`,
    )
  }
}

function assertActiveAndPhysicalContributionMapsAreZero(
  maps: ArtworkFrameSteelDefectDecalMapSet,
) {
  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    for (const channel of ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS) {
      assert.equal(
        countNonZeroValues(maps.activeBodies[kind][channel]),
        0,
        `${kind}.${channel} should remain inactive`,
      )
    }

    for (
      const channel of ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS
    ) {
      assert.equal(
        countNonZeroValues(maps.physicalContributions[kind][channel]),
        0,
        `${kind}.${channel} should remain physically inert`,
      )
    }
  }
}

function assertStablePlacementMapsAreClippedToFrameRing(
  maps: ArtworkFrameSteelDefectDecalMapSet,
  frameMask: Float32Array,
) {
  assert.equal(frameMask.length, maps.widthPixels * maps.heightPixels)

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    for (const channel of ARTWORK_FRAME_STEEL_DEFECT_STABLE_PLACEMENT_CHANNELS) {
      const values = maps.stablePlacement[kind][channel]

      for (let index = 0; index < values.length; index += 1) {
        if (frameMask[index] > 0) {
          continue
        }

        assert.equal(
          values[index],
          0,
          `${kind}.${channel} should be zero outside the frame ring`,
        )
      }
    }
  }
}

test('steel defect decal groundwork separates defect kinds and map roles', () => {
  assert.deepEqual(
    ARTWORK_FRAME_STEEL_DEFECT_KINDS,
    [
      'scratch',
      'gouge',
      'dent',
      'pit',
      'scuff',
      'burrNick',
    ],
  )

  const allRoleChannels = [
    ...ARTWORK_FRAME_STEEL_DEFECT_STABLE_PLACEMENT_CHANNELS,
    ...ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS,
    ...ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS,
  ]

  assert.equal(new Set(ARTWORK_FRAME_STEEL_DEFECT_KINDS).size, 6)
  assert.equal(new Set(allRoleChannels).size, allRoleChannels.length)
  assert.equal(
    ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS.includes(
      'selfShadowReceiver',
    ),
    true,
  )

  const record = createArtworkFrameSteelDefectKindRecord((kind) => kind)

  assert.equal(record.scratch, 'scratch')
  assert.equal(record.gouge, 'gouge')
  assert.equal(record.dent, 'dent')
  assert.equal(record.pit, 'pit')
  assert.equal(record.scuff, 'scuff')
  assert.equal(record.burrNick, 'burrNick')
})

test('steel defect decal role names exclude legacy transition mask names', () => {
  assert.deepEqual(
    new Set(Object.values(ARTWORK_FRAME_STEEL_DEFECT_MAP_ROLE_NAMES)),
    new Set([
      'stablePlacementCandidateMaps',
      'activeDecalBodyMaps',
      'activePhysicalContributionMaps',
    ]),
  )
  assert.equal(
    ARTWORK_FRAME_STEEL_DEFECT_LEGACY_TRANSITION_CHANNELS.includes(
      'scratchTroughMask',
    ),
    true,
  )
  assert.equal(
    ARTWORK_FRAME_STEEL_DEFECT_LEGACY_TRANSITION_CHANNELS.includes(
      'gougeTroughMask',
    ),
    true,
  )
  assert.equal(
    ARTWORK_FRAME_STEEL_DEFECT_LEGACY_TRANSITION_CHANNELS.includes(
      'dentPocketMask',
    ),
    true,
  )
  assert.equal(
    ARTWORK_FRAME_STEEL_DEFECT_LEGACY_TRANSITION_CHANNELS.includes(
      'pitPocketMask',
    ),
    true,
  )

  for (const channel of [
    ...ARTWORK_FRAME_STEEL_DEFECT_STABLE_PLACEMENT_CHANNELS,
    ...ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS,
    ...ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS,
  ]) {
    assert.equal(
      isArtworkFrameSteelDefectLegacyTransitionChannel(channel),
      false,
    )
    assert.equal(/(?:Trough|Pocket)Mask$/.test(channel), false)
  }

  for (const channel of ARTWORK_FRAME_STEEL_DEFECT_LEGACY_TRANSITION_CHANNELS) {
    assert.equal(isArtworkFrameSteelDefectLegacyTransitionChannel(channel), true)
  }
})

test(
  'stage 4 diagnostic manifest lists expected active body assets',
  { skip: !existsSync(STAGE4_DIAGNOSTIC_MANIFEST_URL) },
  () => {
    const manifest = JSON.parse(
      readFileSync(STAGE4_DIAGNOSTIC_MANIFEST_URL, 'utf8'),
    ) as {
      files: Array<{ fileName: string }>
      note: string[]
    }
    const fileNames = new Set(manifest.files.map((file) => file.fileName))
    const noteText = manifest.note.join(' ')

    for (const fileName of STAGE4_EXPECTED_DIAGNOSTIC_FILES) {
      assert.equal(fileNames.has(fileName), true, `${fileName} should be listed`)
    }
    assert.equal(noteText.includes('false-color active decal body maps'), true)
    assert.equal(noteText.includes('not final shaded steel'), true)
    assert.equal(noteText.includes('Physical contribution channels'), true)
  },
)

test(
  'stage 5 diagnostic manifest lists expected physical contribution assets',
  { skip: !existsSync(STAGE5_DIAGNOSTIC_MANIFEST_URL) },
  () => {
    const manifest = JSON.parse(
      readFileSync(STAGE5_DIAGNOSTIC_MANIFEST_URL, 'utf8'),
    ) as {
      files: Array<{ fileName: string }>
      note: string[]
    }
    const fileNames = new Set(manifest.files.map((file) => file.fileName))
    const noteText = manifest.note.join(' ')

    for (const fileName of STAGE5_EXPECTED_DIAGNOSTIC_FILES) {
      assert.equal(fileNames.has(fileName), true, `${fileName} should be listed`)
    }
    assert.equal(noteText.includes('false-color active body maps'), true)
    assert.equal(noteText.includes('active physical contribution maps'), true)
    assert.equal(noteText.includes('final shaded steel diagnostics'), true)
    assert.equal(
      noteText.includes('do not claim native Tauri visual acceptance'),
      true,
    )
  },
)

test(
  'stage 6 before diagnostic manifest lists expected baseline assets',
  { skip: !existsSync(STAGE6_BEFORE_DIAGNOSTIC_MANIFEST_URL) },
  () => {
    const manifest = JSON.parse(
      readFileSync(STAGE6_BEFORE_DIAGNOSTIC_MANIFEST_URL, 'utf8'),
    ) as {
      files: Array<{ fileName: string }>
      note: string[]
    }
    const fileNames = new Set(manifest.files.map((file) => file.fileName))
    const noteText = manifest.note.join(' ')

    for (const fileName of STAGE6_BEFORE_EXPECTED_DIAGNOSTIC_FILES) {
      assert.equal(fileNames.has(fileName), true, `${fileName} should be listed`)
    }
    assert.equal(noteText.includes('existing Stage 5 renderer state'), true)
    assert.equal(noteText.includes('Active body maps gate defect presence'), true)
    assert.equal(noteText.includes('physical contribution maps own'), true)
    assert.equal(
      noteText.includes('do not claim native Tauri visual acceptance'),
      true,
    )
  },
)

test(
  'stage 6 after diagnostic manifest lists expected regression assets',
  { skip: !existsSync(STAGE6_AFTER_DIAGNOSTIC_MANIFEST_URL) },
  () => {
    const manifest = JSON.parse(
      readFileSync(STAGE6_AFTER_DIAGNOSTIC_MANIFEST_URL, 'utf8'),
    ) as {
      files: Array<{ fileName: string }>
      note: string[]
    }
    const fileNames = new Set(manifest.files.map((file) => file.fileName))
    const noteText = manifest.note.join(' ')

    for (const fileName of STAGE6_AFTER_EXPECTED_DIAGNOSTIC_FILES) {
      assert.equal(fileNames.has(fileName), true, `${fileName} should be listed`)
    }
    assert.equal(noteText.includes('Stage 6 after-state'), true)
    assert.equal(noteText.includes('active decal physical contribution maps'), true)
    assert.equal(noteText.includes('Inactive-zero guards'), true)
    assert.equal(noteText.includes('Light and tarnish stability'), true)
    assert.equal(
      noteText.includes('do not claim native Tauri visual acceptance'),
      true,
    )
  },
)

test(
  'stage 6.5 substrate diagnostic manifest lists expected substrate assets',
  { skip: !existsSync(STAGE6_5_SUBSTRATE_DIAGNOSTIC_MANIFEST_URL) },
  () => {
    const manifest = JSON.parse(
      readFileSync(STAGE6_5_SUBSTRATE_DIAGNOSTIC_MANIFEST_URL, 'utf8'),
    ) as {
      files: Array<{ fileName: string }>
      lightPositions: string[]
      note: string[]
    }
    const fileNames = new Set(manifest.files.map((file) => file.fileName))
    const noteText = manifest.note.join(' ')

    for (const fileName of STAGE6_5_SUBSTRATE_EXPECTED_DIAGNOSTIC_FILES) {
      assert.equal(fileNames.has(fileName), true, `${fileName} should be listed`)
    }
    assert.deepEqual(manifest.lightPositions, [
      'overhead',
      '45-degree',
      'grazing',
    ])
    assert.equal(noteText.includes('substrate-only visual package'), true)
    assert.equal(noteText.includes('active decals and sets tarnish to 0'), true)
    assert.equal(noteText.includes('does not change production rendering'), true)
    assert.equal(
      noteText.includes('do not claim native Tauri visual acceptance'),
      true,
    )
  },
)

test('steel defect decal maps can keep stable placement separate from inactive physical contribution', () => {
  const mapLength = 4
  const stablePlacement = createArtworkFrameSteelDefectKindRecord((kind) => {
    const maps = createChannelMaps(
      ARTWORK_FRAME_STEEL_DEFECT_STABLE_PLACEMENT_CHANNELS,
      mapLength,
    )

    if (kind === 'scratch') {
      maps.candidateMask[0] = 1
      maps.depthLimit[0] = 0.75
    }

    return maps
  })
  const activeBodies = createArtworkFrameSteelDefectKindRecord(() =>
    createChannelMaps(
      ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS,
      mapLength,
    )
  )
  const physicalContributions = createArtworkFrameSteelDefectKindRecord(() =>
    createChannelMaps(
      ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS,
      mapLength,
    )
  )
  const maps: ArtworkFrameSteelDefectDecalMapSet = {
    activeBodies,
    heightPixels: 2,
    physicalContributions,
    stablePlacement,
    widthPixels: 2,
  }

  assert.equal(maps.stablePlacement.scratch.candidateMask[0], 1)
  assert.equal(maps.stablePlacement.scratch.depthLimit[0], 0.75)
  assert.notEqual(
    maps.stablePlacement.scratch.candidateMask,
    maps.activeBodies.scratch.presenceMask,
  )
  assert.notEqual(
    maps.stablePlacement.scratch.candidateMask,
    maps.physicalContributions.scratch.height,
  )
  assert.equal(maps.activeBodies.scratch.presenceMask[0], 0)
  assert.equal(maps.activeBodies.scratch.bodyMask[0], 0)
  assert.equal(maps.physicalContributions.scratch.albedoResponse[0], 0)
  assert.equal(maps.physicalContributions.scratch.height[0], 0)
  assert.equal(maps.physicalContributions.scratch.ambientOcclusion[0], 0)
  assert.equal(maps.physicalContributions.scratch.rimLight[0], 0)
  assert.equal(maps.physicalContributions.scratch.rimShadow[0], 0)
  assert.equal(maps.physicalContributions.scratch.roughnessResponse[0], 0)
  assert.equal(maps.physicalContributions.scratch.glossResponse[0], 0)
  assert.equal(maps.physicalContributions.scratch.selfShadowReceiver[0], 0)
})

test('steel defect activation helper follows polish checkpoint intent', () => {
  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    assertActivationResponseActive(
      getTestActivationResponse(kind, 'roughDamage', 0),
      `${kind} rough damage should be active at 0% polish`,
    )
  }

  assertActivationResponseActive(
    getTestActivationResponse('dent', 'roughDamage', 10),
    'dents can remain at 10% polish',
  )
  assert.equal(
    getTestActivationResponse('gouge', 'roughDamage', 10).presence <
      getTestActivationResponse('gouge', 'roughDamage', 0).presence,
    true,
    'gouges should reduce from 0% to 10% polish',
  )
  assertActivationResponseActive(
    getTestActivationResponse('scratch', 'lowPolishScuff', 10),
    'low-polish scratches should carry damage at 10% polish',
  )
  assertActivationResponseActive(
    getTestActivationResponse('scuff', 'lowPolishScuff', 10),
    'low-polish scuffs should carry damage at 10% polish',
  )

  assertActivationResponseActive(
    getTestActivationResponse('scratch', 'lowPolishScuff', 25),
    'medium scratches should remain at 25% polish',
  )
  assertActivationResponseActive(
    getTestActivationResponse('scratch', 'brushedHairline', 25),
    'scratch clusters should overlap into the brushed transition at 25%',
  )
  assert.equal(
    getTestActivationResponse('dent', 'roughDamage', 25).presence < 0.16,
    true,
    'dents should be rare by 25% polish',
  )
  assertActivationResponseInactive(
    getTestActivationResponse('gouge', 'roughDamage', 25),
    'rough gouges should be inactive by 25% polish',
  )

  assertActivationResponseActive(
    getTestActivationResponse('scratch', 'lowPolishScuff', 30),
    'superficial scratch clusters should remain at 30% polish',
  )
  assertActivationResponseActive(
    getTestActivationResponse('scratch', 'brushedHairline', 30),
    'brushed hairline scratches should be active at 30% polish',
  )
  assertActivationResponseInactive(
    getTestActivationResponse('dent', 'roughDamage', 30),
    'rough dents should be inactive at 30% polish',
  )
  assertActivationResponseInactive(
    getTestActivationResponse('burrNick', 'brushedHairline', 30),
    'burrs and nicks should be inactive at 30% polish',
  )

  assertActivationResponseActive(
    getTestActivationResponse('scratch', 'brushedHairline', 50),
    'brushed baseline should retain hairline scratch bodies',
  )
  assert.equal(
    getTestActivationResponse('pit', 'brushedHairline', 50).bodyStrength <
      getTestActivationResponse('scratch', 'brushedHairline', 50).bodyStrength *
        0.14,
    true,
    '50% micropits may exist but must stay visually restrained',
  )
  assertActivationResponseInactive(
    getTestActivationResponse('dent', 'lowPolishScuff', 50),
    'dents should be inactive at 50% polish',
  )
  assertActivationResponseInactive(
    getTestActivationResponse('scuff', 'lowPolishScuff', 50),
    'low-polish scuffs should be inactive at 50% polish',
  )

  assertActivationResponseActive(
    getTestActivationResponse('scratch', 'satinResidual', 75),
    '75% polish should keep only faint residual hairline scratches',
  )
  assertActivationResponseActive(
    getTestActivationResponse('scratch', 'satinResidual', 85),
    '85% polish should keep only fading satin hairlines',
  )
  assertActivationResponseActive(
    getTestActivationResponse('scratch', 'polishedMicro', 92),
    '92% polish should hand off to polished micro hairlines',
  )
  assertActivationResponseActive(
    getTestActivationResponse('scratch', 'polishedMicro', 100),
    '100% polish may retain only ultra-faint polished micro hairlines',
  )
  assert.equal(
    getTestActivationResponse('scratch', 'polishedMicro', 100).presence < 0.05,
    true,
    '100% polished micro hairline presence should stay ultra-faint',
  )
  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS.filter(
    (candidate) => candidate !== 'scratch',
  )) {
    for (const metalPolish of [75, 85, 92, 100] as const) {
      for (const stageFamily of ARTWORK_FRAME_STEEL_DEFECT_STAGE_FAMILIES) {
        assertActivationResponseInactive(
          getTestActivationResponse(kind, stageFamily, metalPolish),
          `${kind}.${stageFamily} should be inactive at ${metalPolish}% polish`,
        )
      }
    }
  }

  for (const stageFamily of ARTWORK_FRAME_STEEL_DEFECT_STAGE_FAMILIES.filter(
    (candidate) => candidate !== 'polishedMicro',
  )) {
    assertActivationResponseInactive(
      getTestActivationResponse('scratch', stageFamily, 100),
      `scratch.${stageFamily} should be inactive at 100% polish`,
    )
  }
})

test('steel defect activation helper outputs stay bounded and deterministic', () => {
  for (const metalPolish of [-20, 0, 10, 25, 30, 50, 75, 100, 120]) {
    for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
      for (const stageFamily of ARTWORK_FRAME_STEEL_DEFECT_STAGE_FAMILIES) {
        const first = getArtworkFrameSteelDefectActiveBodyResponse({
          depthLimit: 1.8,
          edgeRoughness: -0.4,
          kind,
          metalPolish,
          sizeClass: 0.62,
          stageFamily,
        })
        const second = getArtworkFrameSteelDefectActiveBodyResponse({
          depthLimit: 1.8,
          edgeRoughness: -0.4,
          kind,
          metalPolish,
          sizeClass: 0.62,
          stageFamily,
        })

        assert.deepEqual(second, first)

        for (const value of Object.values(first)) {
          assert.equal(Number.isFinite(value), true)
          assert.equal(value >= 0, true)
          assert.equal(value <= 1, true)
        }
      }
    }
  }
})

test('steel defect physical contribution policy maps active bodies by defect kind', () => {
  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    const response = getTestPhysicalContributionResponse(kind)

    assertPhysicalContributionResponseBounded(response, kind)
    assert.equal(response.height > 0, true, `${kind}.height`)
    assert.equal(response.ambientOcclusion > 0, true, `${kind}.ao`)
    assert.equal(response.normalStrength > 0, true, `${kind}.normal`)
    assert.equal(response.rimLight > 0, true, `${kind}.rimLight`)
    assert.equal(response.rimShadow > 0, true, `${kind}.rimShadow`)
    assert.equal(response.roughnessResponse > 0, true, `${kind}.roughness`)
    assert.equal(response.glossResponse > 0, true, `${kind}.gloss`)
    assert.equal(response.albedoResponse > 0, true, `${kind}.albedo`)
    assert.equal(
      response.selfShadowReceiver > 0,
      true,
      `${kind}.selfShadow`,
    )
  }

  assert.equal(
    getTestPhysicalContributionResponse('gouge', {
      metalPolish: 0,
      stageFamily: 'roughDamage',
    }).height >
      getTestPhysicalContributionResponse('scratch', {
        metalPolish: 0,
        stageFamily: 'roughDamage',
      }).height,
    true,
    '0% rough gouges should carry stronger relief than rough scratches',
  )
  assert.equal(
    getTestPhysicalContributionResponse('scuff').roughnessResponse >
      getTestPhysicalContributionResponse('scratch').roughnessResponse,
    true,
    'scuffs should primarily increase roughness',
  )
  assert.equal(
    getTestPhysicalContributionResponse('pit').ambientOcclusion >
      getTestPhysicalContributionResponse('scuff').ambientOcclusion,
    true,
    'pit contributions should emphasize cavity AO more than scuffs',
  )
})

test('steel defect physical contribution policy returns exact zero for inactive bodies', () => {
  const inactiveBodySamples = [
    {},
    createTestActiveBodySample({ presenceMask: 0 }),
    createTestActiveBodySample({
      bodyMask: 0,
      coreMask: 0,
      edgeMask: 0,
      presenceMask: 0.8,
    }),
  ]

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    for (const activeBody of inactiveBodySamples) {
      assertPhysicalContributionResponseExactZero(
        getTestPhysicalContributionResponse(kind, { activeBody }),
        `${kind} inactive body`,
      )
    }

    if (kind === 'scratch') {
      continue
    }

    for (const metalPolish of [75, 85, 92, 100] as const) {
      assertPhysicalContributionResponseExactZero(
        getTestPhysicalContributionResponse(kind, {
          activeBody: createTestActiveBodySample(),
          metalPolish,
        }),
        `${kind} ${metalPolish}% high-polish gate`,
      )
    }
  }

  const polishedMicroScratch =
    getTestPhysicalContributionResponse('scratch', {
      activeBody: createTestActiveBodySample(),
      metalPolish: 100,
      stageFamily: 'polishedMicro',
    })

  assert.equal(polishedMicroScratch.height > 0, true)
  assert.equal(polishedMicroScratch.height < 0.0008, true)
  assert.equal(polishedMicroScratch.ambientOcclusion < 0.0009, true)
  assert.equal(polishedMicroScratch.normalStrength < 0.001, true)
  assert.equal(polishedMicroScratch.selfShadowReceiver, 0)
})

test('steel defect physical contribution policy outputs stay bounded and deterministic', () => {
  for (const metalPolish of [-20, 0, 10, 25, 30, 50, 75, 100, 120]) {
    for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
      for (const stageFamily of ARTWORK_FRAME_STEEL_DEFECT_STAGE_FAMILIES) {
        const input = {
          activeBody: createTestActiveBodySample({
            bodyMask: 1.7,
            coreMask: Number.NaN,
            edgeMask: -0.4,
            presenceMask: 1.2,
          }),
          depthLimit: 1.6,
          edgeRoughness: -0.2,
          kind,
          metalPolish,
          sizeClass: 2.1,
          stageFamily,
        } satisfies SteelDefectPhysicalContributionInput
        const first =
          getArtworkFrameSteelDefectPhysicalContributionResponse(input)
        const second =
          getArtworkFrameSteelDefectPhysicalContributionResponse(input)

        assert.deepEqual(second, first)
        assertPhysicalContributionResponseBounded(
          first,
          `${kind}.${stageFamily}.${metalPolish}`,
        )
      }
    }
  }
})

test('steel defect physical contribution policy tunes polish 0 rough damage without crater pits', () => {
  const scratch = getTestPhysicalContributionResponse('scratch', {
    metalPolish: 0,
    stageFamily: 'roughDamage',
  })
  const gouge = getTestPhysicalContributionResponse('gouge', {
    metalPolish: 0,
    stageFamily: 'roughDamage',
  })
  const dent = getTestPhysicalContributionResponse('dent', {
    metalPolish: 0,
    stageFamily: 'roughDamage',
  })
  const pit = getTestPhysicalContributionResponse('pit', {
    metalPolish: 0,
    stageFamily: 'roughDamage',
  })
  const scuff = getTestPhysicalContributionResponse('scuff', {
    metalPolish: 0,
    stageFamily: 'roughDamage',
  })

  assert.equal(
    pit.height < scratch.height,
    true,
    '0% pit relief should stay below sharp scratch relief',
  )
  assert.equal(
    pit.height < gouge.height,
    true,
    '0% pit relief should stay below localized gouge relief',
  )
  assert.equal(
    dent.height < gouge.height,
    true,
    '0% dents should stay shallower than gouges',
  )
  assert.equal(
    pit.ambientOcclusion > 0,
    true,
    '0% pits still need local AO despite restrained height',
  )
  assert.equal(
    pit.rimShadow < scratch.rimShadow,
    true,
    '0% pit rim shadow should stay below scratch rim shadow',
  )
  assert.equal(
    pit.selfShadowReceiver < gouge.selfShadowReceiver,
    true,
    '0% pits should not dominate rough-stage self-shadow',
  )
  assert.equal(
    scratch.rimLight > 0 && scratch.rimShadow > 0,
    true,
    '0% scratches should retain coupled rim response',
  )
  assert.equal(
    scuff.roughnessResponse > scuff.height,
    true,
    '0% scuffs should read as rough abrasion, not raised smudges',
  )
})

test('steel defect physical contribution policy tunes polish 10 scuffed sheet metal overlap', () => {
  const scratch10 = getTestPhysicalContributionResponse('scratch', {
    metalPolish: 10,
    stageFamily: 'lowPolishScuff',
  })
  const scuff10 = getTestPhysicalContributionResponse('scuff', {
    metalPolish: 10,
    stageFamily: 'lowPolishScuff',
  })
  const gouge0 = getTestPhysicalContributionResponse('gouge', {
    metalPolish: 0,
    stageFamily: 'roughDamage',
  })
  const gouge10 = getTestPhysicalContributionResponse('gouge', {
    metalPolish: 10,
    stageFamily: 'roughDamage',
  })
  const dent0 = getTestPhysicalContributionResponse('dent', {
    metalPolish: 0,
    stageFamily: 'roughDamage',
  })
  const dent10 = getTestPhysicalContributionResponse('dent', {
    metalPolish: 10,
    stageFamily: 'roughDamage',
  })
  const pit0 = getTestPhysicalContributionResponse('pit', {
    metalPolish: 0,
    stageFamily: 'roughDamage',
  })
  const pit10 = getTestPhysicalContributionResponse('pit', {
    metalPolish: 10,
    stageFamily: 'roughDamage',
  })

  assert.equal(
    scratch10.height > gouge10.height,
    true,
    '10% scratches should carry more incised relief than reduced gouges',
  )
  assert.equal(
    scuff10.roughnessResponse > scuff10.height,
    true,
    '10% scuffs should read as cloudy abrasion rather than raised smears',
  )
  assert.equal(
    scuff10.rimLight < scratch10.rimLight,
    true,
    '10% scuffs should not produce stronger catch-light than sharp scratches',
  )
  assert.equal(
    gouge10.height < gouge0.height * 0.62,
    true,
    '10% gouge relief should be clearly reduced from 0%',
  )
  assert.equal(
    dent10.height < dent0.height * 0.76,
    true,
    '10% dents may remain but should be calmer than 0%',
  )
  assert.equal(
    pit10.height < pit0.height * 0.68,
    true,
    '10% pits should be smaller/subtler than 0% pits',
  )
  assert.equal(
    pit10.selfShadowReceiver < pit0.selfShadowReceiver * 0.62,
    true,
    '10% pits should not retain rough-stage crater self-shadow',
  )
})

test('steel defect physical contribution policy tunes polish 25 medium scratch scuff overlap', () => {
  const scratch10 = getTestPhysicalContributionResponse('scratch', {
    metalPolish: 10,
    stageFamily: 'lowPolishScuff',
  })
  const scratch25 = getTestPhysicalContributionResponse('scratch', {
    metalPolish: 25,
    stageFamily: 'lowPolishScuff',
  })
  const scuff25 = getTestPhysicalContributionResponse('scuff', {
    metalPolish: 25,
    stageFamily: 'lowPolishScuff',
  })
  const gouge25 = getTestPhysicalContributionResponse('gouge', {
    metalPolish: 25,
    stageFamily: 'roughDamage',
  })
  const dent25 = getTestPhysicalContributionResponse('dent', {
    metalPolish: 25,
    stageFamily: 'lowPolishScuff',
  })
  const pit25 = getTestPhysicalContributionResponse('pit', {
    metalPolish: 25,
    stageFamily: 'lowPolishScuff',
  })

  assert.equal(
    scratch25.height < scratch10.height * 0.65,
    true,
    '25% scratches should be thinner than the 10% low-polish overlap',
  )
  assert.equal(
    scratch25.rimShadow < scratch10.rimShadow * 0.65,
    true,
    '25% scratches should not inherit heavy 10% shadow response',
  )
  assert.equal(
    scuff25.roughnessResponse > scuff25.height * 8,
    true,
    '25% scuffs should primarily read as abrasion texture, not deep relief',
  )
  assert.equal(
    gouge25.height < scratch25.height * 0.55,
    true,
    '25% gouges should be mostly absent relative to medium scratches',
  )
  assert.equal(
    dent25.height < scratch25.height * 0.5,
    true,
    '25% dents should be rare and shallow relative to scratches',
  )
  assert.equal(
    pit25.height < scuff25.height * 0.5,
    true,
    '25% pits should stay small and non-dominant',
  )
  assert.equal(
    pit25.selfShadowReceiver < scratch25.selfShadowReceiver * 0.25,
    true,
    '25% pits should not retain heavy crater self-shadow',
  )
})

test('steel defect physical contribution policy tunes polish 30 brushed handoff', () => {
  const scratch25 = getTestPhysicalContributionResponse('scratch', {
    metalPolish: 25,
    stageFamily: 'lowPolishScuff',
  })
  const scratch30 = getTestPhysicalContributionResponse('scratch', {
    metalPolish: 30,
    stageFamily: 'brushedHairline',
  })
  const scratch50 = getTestPhysicalContributionResponse('scratch', {
    metalPolish: 50,
    stageFamily: 'brushedHairline',
  })
  const scuff30 = getTestPhysicalContributionResponse('scuff', {
    metalPolish: 30,
    stageFamily: 'lowPolishScuff',
  })
  const gouge30 = getTestPhysicalContributionResponse('gouge', {
    metalPolish: 30,
    stageFamily: 'roughDamage',
  })
  const dent30 = getTestPhysicalContributionResponse('dent', {
    metalPolish: 30,
    stageFamily: 'roughDamage',
  })
  const pit30 = getTestPhysicalContributionResponse('pit', {
    metalPolish: 30,
    stageFamily: 'lowPolishScuff',
  })
  const burr30 = getTestPhysicalContributionResponse('burrNick', {
    metalPolish: 30,
    stageFamily: 'roughDamage',
  })

  assert.equal(
    scratch30.height > 0 && scratch30.rimLight > 0,
    true,
    '30% should preserve occasional fine hairline cut response',
  )
  assert.equal(
    scratch30.height < scratch25.height * 0.35,
    true,
    '30% scratch relief should be superficial compared with 25% scratches',
  )
  assert.equal(
    scratch30.height < scratch50.height,
    true,
    '30% should remain a transition into the 50% brushed baseline',
  )
  assert.equal(
    scuff30.roughnessResponse > scuff30.height * 20,
    true,
    '30% scuffs should read as fine abrasion texture, not physical gouges',
  )
  assert.equal(
    gouge30.height < scratch30.height * 0.25,
    true,
    '30% gouges should be mostly absent relative to hairline scratches',
  )
  assert.equal(
    dent30.height < scratch30.height * 0.25,
    true,
    '30% dents should be mostly absent relative to hairline scratches',
  )
  assert.equal(
    pit30.selfShadowReceiver < scratch30.selfShadowReceiver * 0.15,
    true,
    '30% pits should not retain old rough-stage self-shadow',
  )
  assert.equal(
    burr30.selfShadowReceiver < scratch30.selfShadowReceiver * 0.3,
    true,
    '30% burr/nick shadow should not survive as rough-stage damage',
  )
})

test('steel defect low polish response helper follows Stage 6 checkpoint intent', () => {
  const roughGouge0 = getTestLowPolishResponseScalars('gouge', {
    metalPolish: 0,
    stageFamily: 'roughDamage',
  })
  const roughGouge10 = getTestLowPolishResponseScalars('gouge', {
    metalPolish: 10,
    stageFamily: 'roughDamage',
  })
  const roughGouge25 = getTestLowPolishResponseScalars('gouge', {
    metalPolish: 25,
    stageFamily: 'roughDamage',
  })
  const roughGouge30 = getTestLowPolishResponseScalars('gouge', {
    metalPolish: 30,
    stageFamily: 'roughDamage',
  })
  const roughGouge50 = getTestLowPolishResponseScalars('gouge', {
    metalPolish: 50,
    stageFamily: 'roughDamage',
  })

  assert.equal(
    roughGouge0.heightScale > roughGouge10.heightScale,
    true,
    '0% rough gouge relief should be strongest',
  )
  assert.equal(
    roughGouge10.heightScale > roughGouge25.heightScale,
    true,
    '10% rough gouge relief should still exceed 25%',
  )
  assertLowPolishResponseScalarsExactZero(
    roughGouge30,
    '30% rough gouge response',
  )
  assertLowPolishResponseScalarsExactZero(
    roughGouge50,
    '50% rough gouge response',
  )

  const scuff10 = getTestLowPolishResponseScalars('scuff', {
    metalPolish: 10,
    stageFamily: 'lowPolishScuff',
  })
  const scuff25 = getTestLowPolishResponseScalars('scuff', {
    metalPolish: 25,
    stageFamily: 'lowPolishScuff',
  })
  const scuff30 = getTestLowPolishResponseScalars('scuff', {
    metalPolish: 30,
    stageFamily: 'lowPolishScuff',
  })
  const scuff50 = getTestLowPolishResponseScalars('scuff', {
    metalPolish: 50,
    stageFamily: 'lowPolishScuff',
  })

  assert.equal(
    scuff10.roughnessResponseScale > scuff10.heightScale,
    true,
    '10% scuff response should emphasize rough cloudy abrasion over relief',
  )
  assert.equal(
    scuff25.roughnessResponseScale > 0,
    true,
    '25% scuffed response should remain active',
  )
  assert.equal(
    scuff30.roughnessResponseScale > 0,
    true,
    '30% scuffed response should preserve the superficial transition',
  )
  assertLowPolishResponseScalarsExactZero(
    scuff50,
    '50% low-polish scuff response',
  )

  const pit25 = getTestLowPolishResponseScalars('pit', {
    metalPolish: 25,
    stageFamily: 'lowPolishScuff',
  })
  const scratch25 = getTestLowPolishResponseScalars('scratch', {
    metalPolish: 25,
    stageFamily: 'lowPolishScuff',
  })
  const brushedHairline50 = getTestLowPolishResponseScalars('scratch', {
    metalPolish: 50,
    stageFamily: 'brushedHairline',
  })

  assert.equal(
    pit25.heightScale < scratch25.heightScale,
    true,
    '25% pit relief should stay restrained relative to scratches',
  )
  assert.equal(
    brushedHairline50.heightScale > 0,
    true,
    '50% guard may keep restrained brushed hairline response',
  )
  assert.equal(
    brushedHairline50.heightScale < scratch25.heightScale,
    true,
    '50% brushed hairline relief must stay below 25% scratch damage',
  )
})

test('steel defect low polish response helper returns exact zero for inactive bodies', () => {
  const inactiveBodySamples = [
    {},
    createTestActiveBodySample({ presenceMask: 0 }),
    createTestActiveBodySample({
      bodyMask: 0,
      coreMask: 0,
      edgeMask: 0,
      presenceMask: 0.8,
    }),
  ]

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    for (const activeBody of inactiveBodySamples) {
      assertLowPolishResponseScalarsExactZero(
        getTestLowPolishResponseScalars(kind, { activeBody }),
        `${kind} inactive low-polish response`,
      )
    }
  }
})

test('steel defect low polish response helper is bounded deterministic and independent of non-polish inputs', () => {
  for (const metalPolish of [-20, 0, 10, 25, 30, 50, 75, 100, 120]) {
    for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
      for (const stageFamily of ARTWORK_FRAME_STEEL_DEFECT_STAGE_FAMILIES) {
        const input = {
          activeBody: createTestActiveBodySample({
            bodyMask: 1.6,
            coreMask: Number.NaN,
            edgeMask: -0.25,
            presenceMask: 1.4,
          }),
          kind,
          metalPolish,
          stageFamily,
        } satisfies SteelDefectLowPolishResponseInput
        const first = getArtworkFrameSteelDefectLowPolishResponseScalars(input)
        const second = getArtworkFrameSteelDefectLowPolishResponseScalars(input)

        assert.deepEqual(second, first)
        assertLowPolishResponseScalarsBounded(
          first,
          `${kind}.${stageFamily}.${metalPolish}`,
        )
      }
    }
  }
})

test('steel defect low polish response helper keeps 50 percent as a brushed-baseline guard', () => {
  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    assertLowPolishResponseScalarsExactZero(
      getTestLowPolishResponseScalars(kind, {
        metalPolish: 50,
        stageFamily: 'roughDamage',
      }),
      `${kind} rough damage at 50%`,
    )
  }

  for (const kind of ['gouge', 'dent', 'scuff', 'burrNick'] as const) {
    assertLowPolishResponseScalarsExactZero(
      getTestLowPolishResponseScalars(kind, {
        metalPolish: 50,
        stageFamily: 'lowPolishScuff',
      }),
      `${kind} low-polish damage at 50%`,
    )
  }
})

test('steel defect activation helper has smooth overlap without hard stage gaps', () => {
  for (const metalPolish of [24, 25, 26, 29, 30, 31]) {
    assert.equal(
      sumActivationPresence('scratch', metalPolish) > 0,
      true,
      `scratch activation should not gap around ${metalPolish}% polish`,
    )
    assert.equal(
      sumActivationPresence('scratch', metalPolish) +
        sumActivationPresence('scuff', metalPolish) >
        0,
      true,
      `scratch/scuff activation should carry low-polish transition at ${metalPolish}%`,
    )
  }

  for (const metalPolish of [50, 58, 70, 75]) {
    assert.equal(
      sumActivationPresence('scratch', metalPolish, [
        'brushedHairline',
        'satinResidual',
      ]) > 0,
      true,
      `scratch residual activation should not gap around ${metalPolish}% polish`,
    )
  }
})

test('steel defect active body rasterization activates expected checkpoint families only', () => {
  const checkpoints = [
    {
      activeKinds: ARTWORK_FRAME_STEEL_DEFECT_KINDS,
      label: '0% rough damaged',
      polish: 0,
    },
    {
      activeKinds: ARTWORK_FRAME_STEEL_DEFECT_KINDS,
      label: '10% low polish damage',
      polish: 10,
    },
    {
      activeKinds: ['scratch', 'dent', 'pit', 'scuff'],
      label: '25% medium scratches with rare dents',
      polish: 25,
    },
    {
      activeKinds: ['scratch', 'pit', 'scuff'],
      label: '30% superficial scratch clusters',
      polish: 30,
    },
    {
      activeKinds: ['scratch'],
      label: '50% brushed baseline',
      polish: 50,
    },
    {
      activeKinds: ['scratch'],
      label: '75% residual hairlines',
      polish: 75,
    },
    {
      activeKinds: ['scratch'],
      label: '85% semi-bright hairlines',
      polish: 85,
    },
    {
      activeKinds: ['scratch'],
      label: '92% polished micro hairlines',
      polish: 92,
    },
    {
      activeKinds: ['scratch'],
      label: '100% ultra-faint polished micro hairlines',
      polish: 100,
    },
  ] as const

  for (const checkpoint of checkpoints) {
    const maps = createTestStablePlacementMaps()

    activateArtworkFrameSteelDefectActiveBodyMaps({
      defectDecalMaps: maps,
      metalPolish: checkpoint.polish,
    })

    assertActiveBodyKindSet(
      maps,
      checkpoint.activeKinds,
      checkpoint.label,
    )
    assertPhysicalContributionMapsAreZero(maps)
  }
})

test('stage 4 checkpoint active body populations match polish intent', () => {
  const polish0 = createActivatedTestStablePlacementMaps(0)
  const polish10 = createActivatedTestStablePlacementMaps(10)
  const polish25 = createActivatedTestStablePlacementMaps(25)
  const polish30 = createActivatedTestStablePlacementMaps(30)
  const polish50 = createActivatedTestStablePlacementMaps(50)
  const polish75 = createActivatedTestStablePlacementMaps(75)
  const polish85 = createActivatedTestStablePlacementMaps(85)
  const polish92 = createActivatedTestStablePlacementMaps(92)
  const polish100 = createActivatedTestStablePlacementMaps(100)

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    assert.equal(
      sumActiveBodyMapValues(polish0, kind) > 0,
      true,
      `0% polish should activate ${kind}`,
    )
  }

  assert.equal(
    sumActiveBodyMapValues(polish10, 'scratch') > 0,
    true,
    '10% polish should keep scratches active',
  )
  assert.equal(
    sumActiveBodyMapValues(polish10, 'scuff') > 0,
    true,
    '10% polish should keep scuffs active',
  )
  assert.equal(
    sumActiveBodyMapValues(polish10, 'dent') > 0,
    true,
    '10% polish may keep dents active',
  )
  assert.equal(
    sumActiveBodyMapValues(polish10, 'gouge') <
      sumActiveBodyMapValues(polish0, 'gouge'),
    true,
    '10% polish should reduce gouges relative to 0%',
  )

  assert.equal(
    sumActiveBodyMapValues(polish25, 'scratch') > 0,
    true,
    '25% polish should keep medium scratches and scratch clusters active',
  )
  assert.equal(
    sumActiveBodyMapValues(polish25, 'dent') <
      sumActiveBodyMapValues(polish25, 'scratch') * 0.22,
    true,
    '25% polish should leave dents rare or near-zero',
  )
  assert.equal(
    sumActiveBodyMapValues(polish25, 'gouge'),
    0,
    '25% polish should make gouges inactive',
  )

  assert.equal(
    sumActiveBodyMapValues(polish30, 'scratch') > 0,
    true,
    '30% polish should keep light scratch cluster bodies active',
  )
  for (const heavyKind of ['gouge', 'dent', 'burrNick'] as const) {
    assert.equal(
      sumActiveBodyMapValues(polish30, heavyKind),
      0,
      `30% polish should remove heavy ${heavyKind} damage bodies`,
    )
  }

  assert.equal(
    sumActiveBodyMapValues(polish50, 'scratch') > 0,
    true,
    '50% polish should keep brushed hairline scratch bodies active',
  )
  for (const absentKind of ['gouge', 'dent', 'scuff', 'burrNick'] as const) {
    assert.equal(
      sumActiveBodyMapValues(polish50, absentKind),
      0,
      `50% polish should not keep ${absentKind} body population`,
    )
  }
  assert.equal(
    sumActiveBodyChannelValues(polish50, 'pit', 'bodyMask') <
      sumActiveBodyChannelValues(polish50, 'scratch', 'bodyMask') * 0.04,
    true,
    '50% polish micropit body population should stay below obvious visibility',
  )

  assert.equal(
    sumActiveBodyMapValues(polish75, 'scratch') > 0,
    true,
    '75% polish should keep faint residual hairline bodies',
  )
  for (const [metalPolish, maps] of [
    [75, polish75],
    [85, polish85],
    [92, polish92],
    [100, polish100],
  ] as const) {
    assert.equal(
      sumActiveBodyMapValues(maps, 'scratch') > 0,
      true,
      `${metalPolish}% polish should keep only scratch/hairline bodies`,
    )

    for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS.filter(
      (candidate) => candidate !== 'scratch',
    )) {
      assert.equal(
        sumActiveBodyMapValues(maps, kind),
        0,
        `${metalPolish}% polish should remove non-hairline ${kind} bodies`,
      )
    }
  }

  assertStablePlacementMapsHaveCandidates(polish100)
  assert.equal(
    sumActiveBodyMapValues(polish100, 'scratch') <
      sumActiveBodyMapValues(polish75, 'scratch') * 0.35,
    true,
    '100% polish should keep only ultra-faint scratch/hairline bodies',
  )
})

test('steel defect active body rasterization preserves stable placement maps', () => {
  const maps = createTestStablePlacementMaps()
  const before = cloneSteelDefectDecalMaps(maps)

  activateArtworkFrameSteelDefectActiveBodyMaps({
    defectDecalMaps: maps,
    metalPolish: 30,
  })

  assertStablePlacementMapsEqual(before, maps)
  assertPhysicalContributionMapsAreZero(maps)
})

test('steel defect active body rasterization resets inactive families to exact zero', () => {
  const maps = createTestStablePlacementMaps()

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    for (const channel of ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS) {
      maps.activeBodies[kind][channel].fill(0.5)
    }
  }

  activateArtworkFrameSteelDefectActiveBodyMaps({
    defectDecalMaps: maps,
    metalPolish: 100,
  })

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    for (const channel of ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS) {
      if (kind === 'scratch') {
        assert.equal(
          maps.activeBodies[kind][channel].some((value) => value === 0.5),
          false,
          `${kind}.${channel} should be recomputed instead of retaining stale data`,
        )
        continue
      }

      assert.equal(
        countNonZeroValues(maps.activeBodies[kind][channel]),
        0,
        `${kind}.${channel} should be reset to zero when inactive`,
      )
    }
  }
  assertPhysicalContributionMapsAreZero(maps)
})

test('steel defect active body rasterization clips to the provided frame mask', () => {
  const maps = createTestStablePlacementMaps()
  const before = cloneSteelDefectDecalMaps(maps)
  const frameMask = createDefaultFrameRingMask(maps.widthPixels, maps.heightPixels)

  for (let y = 0; y < maps.heightPixels; y += 1) {
    for (let x = 0; x < Math.floor(maps.widthPixels / 2); x += 1) {
      frameMask[y * maps.widthPixels + x] = 0
    }
  }

  activateArtworkFrameSteelDefectActiveBodyMaps({
    defectDecalMaps: maps,
    frameMask,
    metalPolish: 0,
  })

  assertStablePlacementMapsEqual(before, maps)
  assertActiveBodyMapsAreClippedToFrameRing(maps, frameMask)
  assertPhysicalContributionMapsAreZero(maps)
})

test('steel defect physical contribution population writes from active bodies only', () => {
  const maps = createActivatedTestStablePlacementMaps(0)
  const before = cloneSteelDefectDecalMaps(maps)

  populateArtworkFrameSteelDefectPhysicalContributionMaps({
    defectDecalMaps: maps,
    metalPolish: 0,
  })

  assertStablePlacementMapsEqual(before, maps)
  assertActiveBodyMapsEqual(before, maps)

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    assert.equal(
      sumPhysicalContributionMapValues(maps, kind) > 0,
      true,
      `${kind} should generate active physical contributions`,
    )

    for (
      const channel of ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS
    ) {
      assert.equal(
        countNonZeroValues(maps.physicalContributions[kind][channel]) > 0,
        true,
        `${kind}.${channel} should have active contribution data`,
      )
    }
  }
})

test('steel defect physical contribution population ignores raw stable candidates without active bodies', () => {
  const maps = createTestStablePlacementMaps()
  const before = cloneSteelDefectDecalMaps(maps)

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    for (
      const channel of ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS
    ) {
      maps.physicalContributions[kind][channel].fill(0.6)
    }
  }

  populateArtworkFrameSteelDefectPhysicalContributionMaps({
    defectDecalMaps: maps,
    metalPolish: 0,
  })

  assertStablePlacementMapsEqual(before, maps)
  assertActiveBodyMapsEqual(before, maps)
  assertPhysicalContributionMapsAreZero(maps)
})

test('steel defect physical contribution population does not require stable candidate masks', () => {
  const maps = createArtworkFrameSteelEmptyDefectDecalMaps({
    heightPixels: 2,
    widthPixels: 3,
  })
  const index = 2

  maps.stablePlacement.scratch.candidateMask[index] = 0
  maps.stablePlacement.scratch.depthLimit[index] = 0.72
  maps.stablePlacement.scratch.edgeRoughness[index] = 0.58
  maps.stablePlacement.scratch.sizeClass[index] = 0.44
  maps.stablePlacement.scratch.stageAffinity[index] = 0
  maps.activeBodies.scratch.presenceMask[index] = 0.82
  maps.activeBodies.scratch.bodyMask[index] = 0.76
  maps.activeBodies.scratch.coreMask[index] = 0.62
  maps.activeBodies.scratch.edgeMask[index] = 0.38

  populateArtworkFrameSteelDefectPhysicalContributionMaps({
    defectDecalMaps: maps,
    metalPolish: 0,
  })

  assert.equal(
    maps.physicalContributions.scratch.height[index] > 0,
    true,
    'active scratch body should generate physical relief without candidateMask',
  )
  assert.equal(
    maps.physicalContributions.scratch.selfShadowReceiver[index] > 0,
    true,
    'active scratch body should generate self-shadow receiver without candidateMask',
  )
})

test('steel defect physical contribution population clips to the provided frame mask', () => {
  const maps = createArtworkFrameSteelEmptyDefectDecalMaps({
    heightPixels: 4,
    widthPixels: 6,
  })
  const frameMask = new Float32Array(maps.widthPixels * maps.heightPixels)

  for (let y = 0; y < maps.heightPixels; y += 1) {
    for (let x = 0; x < maps.widthPixels; x += 1) {
      const index = y * maps.widthPixels + x
      frameMask[index] = x >= Math.floor(maps.widthPixels / 2) ? 1 : 0
    }
  }

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    for (const channel of ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS) {
      maps.activeBodies[kind][channel].fill(0.72)
    }
  }

  populateArtworkFrameSteelDefectPhysicalContributionMaps({
    defectDecalMaps: maps,
    frameMask,
    metalPolish: 0,
  })

  assertPhysicalContributionMapsAreClippedToFrameRing(maps, frameMask)

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    assert.equal(
      sumPhysicalContributionMapValues(maps, kind) > 0,
      true,
      `${kind} should still contribute inside the frame mask`,
    )
  }
})

test('stage 6 checkpoint decal ownership keeps placement stable and physical response active-only', () => {
  const checkpoints = [0, 10, 25, 30, 50] as const
  const checkpointMaps = checkpoints.map((metalPolish) => {
    const maps = createTestStablePlacementMaps()

    activateArtworkFrameSteelDefectActiveBodyMaps({
      defectDecalMaps: maps,
      metalPolish,
    })
    populateArtworkFrameSteelDefectPhysicalContributionMaps({
      defectDecalMaps: maps,
      metalPolish,
    })

    return {
      maps,
      metalPolish,
    }
  })
  const baseline = checkpointMaps[0]!.maps

  for (const { maps, metalPolish } of checkpointMaps) {
    assertStablePlacementMapsEqual(baseline, maps)
    assertStablePlacementMapsHaveCandidates(maps)

    for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
      const activeSum = sumActiveBodyMapValues(maps, kind)
      const physicalSum = sumPhysicalContributionMapValues(maps, kind)

      assert.equal(
        activeSum === 0,
        physicalSum === 0,
        `${metalPolish}% ${kind} physical maps must follow active body presence`,
      )

      if (activeSum > 0) {
        assert.equal(
          physicalSum > 0,
          true,
          `${metalPolish}% ${kind} active bodies should own nonzero material response`,
        )
        continue
      }

      for (const channel of ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS) {
        assert.equal(
          countNonZeroValues(maps.activeBodies[kind][channel]),
          0,
          `${metalPolish}% inactive ${kind}.${channel} should be exact zero`,
        )
      }

      for (const channel of ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS) {
        assert.equal(
          countNonZeroValues(maps.physicalContributions[kind][channel]),
          0,
          `${metalPolish}% inactive ${kind}.${channel} physical response should be exact zero`,
        )
      }
    }
  }

  const polish50 = checkpointMaps.find(
    (checkpoint) => checkpoint.metalPolish === 50,
  )!.maps

  for (const lowPolishKind of ['gouge', 'dent', 'scuff', 'burrNick'] as const) {
    assert.equal(
      sumActiveBodyMapValues(polish50, lowPolishKind),
      0,
      `50% should not retain old low-polish ${lowPolishKind} bodies`,
    )
    assert.equal(
      sumPhysicalContributionMapValues(polish50, lowPolishKind),
      0,
      `50% should not retain old low-polish ${lowPolishKind} material response`,
    )
  }

  assert.equal(
    sumPhysicalContributionMapValues(polish50, 'pit') <
      sumPhysicalContributionMapValues(polish50, 'scratch') * 0.12,
    true,
    '50% micropit response should remain below obvious low-polish damage response',
  )
})

test('stage 7 high-polish survival gates leave only scratch hairline physical decals', () => {
  const checkpoints = [75, 85, 92, 100] as const
  const checkpointMaps = checkpoints.map((metalPolish) => {
    const maps = createTestStablePlacementMaps()

    activateArtworkFrameSteelDefectActiveBodyMaps({
      defectDecalMaps: maps,
      metalPolish,
    })
    populateArtworkFrameSteelDefectPhysicalContributionMaps({
      defectDecalMaps: maps,
      metalPolish,
    })

    return {
      maps,
      metalPolish,
    }
  })
  const baseline = checkpointMaps[0]!.maps
  const scratch75 = sumPhysicalContributionMapValues(baseline, 'scratch')

  for (const { maps, metalPolish } of checkpointMaps) {
    assertStablePlacementMapsHaveCandidates(maps)
    assertStablePlacementMapsEqual(baseline, maps)
    assert.equal(
      sumActiveBodyMapValues(maps, 'scratch') > 0,
      true,
      `${metalPolish}% should keep scratch/hairline active bodies`,
    )
    assert.equal(
      sumPhysicalContributionMapValues(maps, 'scratch') > 0,
      true,
      `${metalPolish}% should keep scratch/hairline physical response`,
    )
    assert.equal(
      sumPhysicalContributionMapValues(maps, 'scratch') <= scratch75,
      true,
      `${metalPolish}% scratch/hairline response should not exceed the 75% satin endpoint`,
    )
    assert.equal(
      sumPhysicalContributionMapValues(maps, 'scratch') > 0,
      sumActiveBodyMapValues(maps, 'scratch') > 0,
      `${metalPolish}% scratch physical response must follow active body presence`,
    )
    assert.equal(
      countNonZeroValues(
        maps.physicalContributions.scratch.selfShadowReceiver,
      ),
      0,
      `${metalPolish}% scratch hairlines should not cast defect self-shadow`,
    )

    for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS.filter(
      (candidate) => candidate !== 'scratch',
    )) {
      assert.equal(
        sumActiveBodyMapValues(maps, kind),
        0,
        `${metalPolish}% ${kind} active bodies should be exact-zero`,
      )
      assert.equal(
        sumPhysicalContributionMapValues(maps, kind),
        0,
        `${metalPolish}% ${kind} physical contributions should be exact-zero`,
      )

      for (const channel of ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS) {
        assert.equal(
          countNonZeroValues(maps.activeBodies[kind][channel]),
          0,
          `${metalPolish}% inactive ${kind}.${channel} should be exact-zero`,
        )
      }

      for (
        const channel of ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS
      ) {
        assert.equal(
          countNonZeroValues(maps.physicalContributions[kind][channel]),
          0,
          `${metalPolish}% inactive ${kind}.${channel} physical response should be exact-zero`,
        )
      }
    }
  }

  const scratch100 = sumPhysicalContributionMapValues(
    checkpointMaps.find(({ metalPolish }) => metalPolish === 100)!.maps,
    'scratch',
  )

  assert.equal(
    scratch100 < scratch75 * 0.12,
    true,
    '100% scratch/hairline physical response should be ultra-faint',
  )
})

test('empty steel defect decal maps default every active channel to zero', () => {
  const maps = createArtworkFrameSteelEmptyDefectDecalMaps({
    frameMask: new Float32Array([1, 1, 0, 0, 1, 1]),
    heightPixels: 2,
    widthPixels: 3,
  })

  assert.equal(maps.widthPixels, 3)
  assert.equal(maps.heightPixels, 2)

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    for (const channel of ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS) {
      assert.equal(maps.activeBodies[kind][channel].length, 6)
      assert.equal(maps.activeBodies[kind][channel].some((value) => value !== 0), false)
    }

    for (const channel of ARTWORK_FRAME_STEEL_DEFECT_STABLE_PLACEMENT_CHANNELS) {
      assert.equal(maps.stablePlacement[kind][channel].length, 6)
      assert.equal(maps.stablePlacement[kind][channel].some((value) => value !== 0), false)
    }
  }
})

test('empty steel defect decal maps give absent families no physical contribution', () => {
  const maps = createArtworkFrameSteelEmptyDefectDecalMaps({
    frameMask: new Float32Array(8),
    heightPixels: 2,
    widthPixels: 4,
  })

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    for (
      const channel of ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS
    ) {
      const values = maps.physicalContributions[kind][channel]

      assert.equal(values.length, 8)
      assert.equal(values.some((value) => value !== 0), false)
    }
  }
})

test('inactive steel defect decals have no active body or physical contribution even with placement candidates', () => {
  const inactiveKinds = [
    'scratch',
    'gouge',
    'dent',
    'pit',
    'scuff',
  ] as const satisfies readonly ArtworkFrameSteelDefectKind[]
  const maps = createArtworkFrameSteelEmptyDefectDecalMaps({
    frameMask: new Float32Array([1, 1, 1, 1, 1, 1]),
    heightPixels: 2,
    widthPixels: 3,
  })

  for (const [kindIndex, kind] of inactiveKinds.entries()) {
    maps.stablePlacement[kind].candidateMask[kindIndex] = 1
    maps.stablePlacement[kind].centerlineMask[kindIndex] = 0.8
    maps.stablePlacement[kind].depthLimit[kindIndex] = 0.6
    maps.stablePlacement[kind].edgeRoughness[kindIndex] = 0.4
  }

  for (const kind of inactiveKinds) {
    assert.equal(
      maps.stablePlacement[kind].candidateMask.some((value) => value > 0),
      true,
    )

    for (const channel of ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS) {
      assert.equal(
        maps.activeBodies[kind][channel].some((value) => value !== 0),
        false,
        `${kind}.${channel} should stay inactive`,
      )
    }

    assert.equal(
      maps.physicalContributions[kind].height.some((value) => value !== 0),
      false,
      `${kind}.height should contribute nothing while inactive`,
    )
    assert.equal(
      maps.physicalContributions[kind].ambientOcclusion.some(
        (value) => value !== 0,
      ),
      false,
      `${kind}.ambientOcclusion should contribute nothing while inactive`,
    )
    assert.equal(
      maps.physicalContributions[kind].rimLight.some((value) => value !== 0),
      false,
      `${kind}.rimLight should contribute nothing while inactive`,
    )
    assert.equal(
      maps.physicalContributions[kind].rimShadow.some((value) => value !== 0),
      false,
      `${kind}.rimShadow should contribute nothing while inactive`,
    )
    assert.equal(
      maps.physicalContributions[kind].roughnessResponse.some(
        (value) => value !== 0,
      ),
      false,
      `${kind}.roughnessResponse should contribute nothing while inactive`,
    )
    assert.equal(
      maps.physicalContributions[kind].glossResponse.some(
        (value) => value !== 0,
      ),
      false,
      `${kind}.glossResponse should contribute nothing while inactive`,
    )
    assert.equal(
      maps.physicalContributions[kind].albedoResponse.some(
        (value) => value !== 0,
      ),
      false,
      `${kind}.albedoResponse should contribute nothing while inactive`,
    )
    assert.equal(
      maps.physicalContributions[kind].selfShadowReceiver.some(
        (value) => value !== 0,
      ),
      false,
      `${kind}.selfShadowReceiver should contribute nothing while inactive`,
    )
    assert.equal(
      maps.physicalContributions[kind].normalStrength.some(
        (value) => value !== 0,
      ),
      false,
      `${kind}.normalStrength should contribute nothing while inactive`,
    )
  }
})

test('inactive pit decals keep stable candidates from becoming physical material', () => {
  const frameMask = new Float32Array([1, 1, 1, 1, 1, 1])
  const maps = createArtworkFrameSteelEmptyDefectDecalMaps({
    frameMask,
    heightPixels: 2,
    widthPixels: 3,
  })
  const pitIndex = 2

  maps.stablePlacement.pit.candidateMask[pitIndex] = 1
  maps.stablePlacement.pit.centerlineMask[pitIndex] = 0.9
  maps.stablePlacement.pit.tangentX[pitIndex] = 0.3
  maps.stablePlacement.pit.tangentY[pitIndex] = 0.7
  maps.stablePlacement.pit.sizeClass[pitIndex] = 0.22
  maps.stablePlacement.pit.depthLimit[pitIndex] = 0.64
  maps.stablePlacement.pit.edgeRoughness[pitIndex] = 0.58
  maps.stablePlacement.pit.stageAffinity[pitIndex] = 0.15

  const stablePitPlacementBefore = {
    candidateMask: new Float32Array(maps.stablePlacement.pit.candidateMask),
    centerlineMask: new Float32Array(maps.stablePlacement.pit.centerlineMask),
    tangentX: new Float32Array(maps.stablePlacement.pit.tangentX),
    tangentY: new Float32Array(maps.stablePlacement.pit.tangentY),
    sizeClass: new Float32Array(maps.stablePlacement.pit.sizeClass),
    depthLimit: new Float32Array(maps.stablePlacement.pit.depthLimit),
    edgeRoughness: new Float32Array(maps.stablePlacement.pit.edgeRoughness),
    stageAffinity: new Float32Array(maps.stablePlacement.pit.stageAffinity),
  }

  populateArtworkFrameSteelDefectPhysicalContributionMaps({
    defectDecalMaps: maps,
    frameMask,
    metalPolish: 50,
  })

  assert.equal(
    countNonZeroValues(maps.stablePlacement.pit.candidateMask) > 0,
    true,
    'stable pit placement candidates may exist without active pit decals',
  )

  for (const channel of ARTWORK_FRAME_STEEL_DEFECT_STABLE_PLACEMENT_CHANNELS) {
    assert.deepEqual(
      maps.stablePlacement.pit[channel],
      stablePitPlacementBefore[channel],
      `pit.${channel} should not be mutated by physical contribution population`,
    )
  }

  for (const channel of ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS) {
    assert.equal(
      countNonZeroValues(maps.activeBodies.pit[channel]),
      0,
      `inactive pit.${channel} must remain zero`,
    )
  }

  for (
    const channel of ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS
  ) {
    assert.equal(
      countNonZeroValues(maps.physicalContributions.pit[channel]),
      0,
      `inactive pit.${channel} must not produce physical material`,
    )
  }
})

test('stable steel defect placement maps rasterize expected candidate channels', () => {
  const maps = createTestStablePlacementMaps()

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    const stablePlacement = maps.stablePlacement[kind]

    assert.equal(
      countNonZeroValues(stablePlacement.candidateMask) > 0,
      true,
      `${kind}.candidateMask should contain stable candidates`,
    )
    assert.equal(
      countNonZeroValues(stablePlacement.centerlineMask) > 0,
      true,
      `${kind}.centerlineMask should contain stable candidate centers`,
    )
    assert.equal(
      countNonZeroValues(stablePlacement.tangentX) > 0 ||
        countNonZeroValues(stablePlacement.tangentY) > 0,
      true,
      `${kind}.tangentX/Y should record placement direction`,
    )
    assert.equal(
      countNonZeroValues(stablePlacement.sizeClass) > 0,
      true,
      `${kind}.sizeClass should record candidate size`,
    )
    assert.equal(
      countNonZeroValues(stablePlacement.depthLimit) > 0,
      true,
      `${kind}.depthLimit should record candidate depth ceiling`,
    )
    assert.equal(
      countNonZeroValues(stablePlacement.edgeRoughness) > 0,
      true,
      `${kind}.edgeRoughness should record candidate edge breakup`,
    )
    assert.equal(
      countNonZeroValues(stablePlacement.stageAffinity) > 0,
      true,
      `${kind}.stageAffinity should record placement stage family`,
    )
  }
})

test('rasterized stable steel defect placement maps leave active and physical channels zero', () => {
  const maps = createTestStablePlacementMaps()

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    assert.equal(
      countNonZeroValues(maps.stablePlacement[kind].candidateMask) > 0,
      true,
      `${kind}.candidateMask should prove the stable map was rasterized`,
    )

    for (const channel of ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS) {
      assert.equal(
        countNonZeroValues(maps.activeBodies[kind][channel]),
        0,
        `${kind}.${channel} must remain inactive`,
      )
    }

    for (
      const channel of ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS
    ) {
      assert.equal(
        countNonZeroValues(maps.physicalContributions[kind][channel]),
        0,
        `${kind}.${channel} must not become a physical contribution yet`,
      )
    }
  }
})

test('rasterized stable steel defect placement maps are deterministic for the same seed and frame', () => {
  const first = createTestStablePlacementMaps()
  const second = createTestStablePlacementMaps()

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    for (const channel of ARTWORK_FRAME_STEEL_DEFECT_STABLE_PLACEMENT_CHANNELS) {
      assert.deepEqual(
        second.stablePlacement[kind][channel],
        first.stablePlacement[kind][channel],
        `${kind}.${channel} should be stable for same seed/frame`,
      )
    }
  }
})

test('rasterized stable steel defect placement maps differ for different seeds', () => {
  const first = createTestStablePlacementMaps('test-a')
  const second = createTestStablePlacementMaps('test-b')
  let totalDifference = 0

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    totalDifference += sumAbsoluteDifference(
      first.stablePlacement[kind].candidateMask,
      second.stablePlacement[kind].candidateMask,
    )
  }

  assert.equal(totalDifference > 10, true)
})

test('stage 3 same seed and frame produce identical decal placements and stable maps', () => {
  const first = createPlacementRegressionCase()
  const second = createPlacementRegressionCase()

  assertPlacementSetsEqual(first.placementSet, second.placementSet)
  assertStablePlacementMapsEqual(first.stableMaps, second.stableMaps)
  assertStablePlacementMapsHaveCandidates(first.stableMaps)
  assertActiveAndPhysicalContributionMapsAreZero(first.stableMaps)
})

test('stage 3 different image material seeds produce different placements and stable maps', () => {
  const first = createPlacementRegressionCase({
    materialSeed32: 0x11111111,
    materialSeedKey: 'stage-3-image-a',
  })
  const second = createPlacementRegressionCase({
    materialSeed32: 0x22222222,
    materialSeedKey: 'stage-3-image-b',
  })

  assert.notDeepEqual(
    getPlacementIdentity(second.placementSet),
    getPlacementIdentity(first.placementSet),
  )
  assert.equal(
    sumStablePlacementMapDifference(first.stableMaps, second.stableMaps) > 10,
    true,
  )
})

test('stage 3 placement and stable maps ignore metalPolish response changes', () => {
  const baseline = createPlacementRegressionCase({ metalPolish: 0 })
  const midPolish = createPlacementRegressionCase({ metalPolish: 50 })
  const highPolish = createPlacementRegressionCase({ metalPolish: 100 })

  assertPlacementSetsEqual(baseline.placementSet, midPolish.placementSet)
  assertPlacementSetsEqual(baseline.placementSet, highPolish.placementSet)
  assertStablePlacementMapsEqual(baseline.stableMaps, midPolish.stableMaps)
  assertStablePlacementMapsEqual(baseline.stableMaps, highPolish.stableMaps)
})

test('stage 3 placement and stable maps ignore metalTarnish response changes', () => {
  const baseline = createPlacementRegressionCase({ metalTarnish: 0 })
  const earlyTarnish = createPlacementRegressionCase({ metalTarnish: 22 })
  const heavyTarnish = createPlacementRegressionCase({ metalTarnish: 100 })

  assertPlacementSetsEqual(baseline.placementSet, earlyTarnish.placementSet)
  assertPlacementSetsEqual(baseline.placementSet, heavyTarnish.placementSet)
  assertStablePlacementMapsEqual(baseline.stableMaps, earlyTarnish.stableMaps)
  assertStablePlacementMapsEqual(baseline.stableMaps, heavyTarnish.stableMaps)
})

test('stage 3 placement and stable maps ignore light vector changes', () => {
  const baseline = createPlacementRegressionCase({
    lightVector: { x: 0, y: 0, z: 1 },
  })
  const bottomLeft = createPlacementRegressionCase({
    lightVector: { x: -0.70710678, y: -0.70710678, z: 0.000001 },
  })
  const topRight = createPlacementRegressionCase({
    lightVector: { x: 0.70710678, y: 0.70710678, z: 0.000001 },
  })

  assertPlacementSetsEqual(baseline.placementSet, bottomLeft.placementSet)
  assertPlacementSetsEqual(baseline.placementSet, topRight.placementSet)
  assertStablePlacementMapsEqual(baseline.stableMaps, bottomLeft.stableMaps)
  assertStablePlacementMapsEqual(baseline.stableMaps, topRight.stableMaps)
})

test('stage 3 preview and export bounds do not reroll placement identity', () => {
  const preview = createPlacementRegressionCase({
    bounds: { height: 96, width: 128, x: 0, y: 0 },
  })
  const exportSized = createPlacementRegressionCase({
    bounds: { height: 384, width: 512, x: 24, y: 48 },
  })

  assertPlacementSetsEqual(preview.placementSet, exportSized.placementSet)
  assertStablePlacementMapsEqual(preview.stableMaps, exportSized.stableMaps)
})

test('stage 3 stable maps are clipped and inactive maps stay zero', () => {
  const { frameMask, stableMaps } = createPlacementRegressionCase()

  assertStablePlacementMapsHaveCandidates(stableMaps)
  assertStablePlacementMapsAreClippedToFrameRing(stableMaps, frameMask)
  assertActiveAndPhysicalContributionMapsAreZero(stableMaps)
})

test('stage 4 same seed frame and polish produce identical active body maps', () => {
  const first = createActivatedPlacementRegressionCase({ metalPolish: 30 })
  const second = createActivatedPlacementRegressionCase({ metalPolish: 30 })

  assertPlacementSetsEqual(first.placementSet, second.placementSet)
  assertStablePlacementMapsEqual(first.stableMaps, second.stableMaps)
  assertActiveBodyMapsEqual(first.stableMaps, second.stableMaps)
  assertPhysicalContributionMapsAreZero(first.stableMaps)
  assertPhysicalContributionMapsAreZero(second.stableMaps)
})

test('stage 4 metalPolish changes only active body maps', () => {
  const rough = createActivatedPlacementRegressionCase({ metalPolish: 0 })
  const brushed = createActivatedPlacementRegressionCase({ metalPolish: 50 })
  const mirror = createActivatedPlacementRegressionCase({ metalPolish: 100 })

  assertPlacementSetsEqual(rough.placementSet, brushed.placementSet)
  assertPlacementSetsEqual(rough.placementSet, mirror.placementSet)
  assertStablePlacementMapsEqual(rough.stableMaps, brushed.stableMaps)
  assertStablePlacementMapsEqual(rough.stableMaps, mirror.stableMaps)
  assert.equal(
    sumActiveBodyMapDifference(rough.stableMaps, brushed.stableMaps) > 10,
    true,
  )
  assert.equal(
    sumActiveBodyMapDifference(brushed.stableMaps, mirror.stableMaps) > 10,
    true,
  )
  assertPhysicalContributionMapsAreZero(rough.stableMaps)
  assertPhysicalContributionMapsAreZero(brushed.stableMaps)
  assertPhysicalContributionMapsAreZero(mirror.stableMaps)
})

test('stage 4 metalTarnish does not change active body maps', () => {
  const baseline = createActivatedPlacementRegressionCase({
    activationPolish: 30,
    metalPolish: 30,
    metalTarnish: 0,
  })
  const earlyTarnish = createActivatedPlacementRegressionCase({
    activationPolish: 30,
    metalPolish: 30,
    metalTarnish: 22,
  })
  const heavyTarnish = createActivatedPlacementRegressionCase({
    activationPolish: 30,
    metalPolish: 30,
    metalTarnish: 100,
  })

  assertPlacementSetsEqual(baseline.placementSet, earlyTarnish.placementSet)
  assertPlacementSetsEqual(baseline.placementSet, heavyTarnish.placementSet)
  assertStablePlacementMapsEqual(baseline.stableMaps, earlyTarnish.stableMaps)
  assertStablePlacementMapsEqual(baseline.stableMaps, heavyTarnish.stableMaps)
  assertActiveBodyMapsEqual(baseline.stableMaps, earlyTarnish.stableMaps)
  assertActiveBodyMapsEqual(baseline.stableMaps, heavyTarnish.stableMaps)
  assertPhysicalContributionMapsAreZero(baseline.stableMaps)
  assertPhysicalContributionMapsAreZero(earlyTarnish.stableMaps)
  assertPhysicalContributionMapsAreZero(heavyTarnish.stableMaps)
})

test('stage 4 light vector does not change active body maps', () => {
  const baseline = createActivatedPlacementRegressionCase({
    activationPolish: 30,
    lightVector: { x: 0, y: 0, z: 1 },
    metalPolish: 30,
  })
  const bottomLeft = createActivatedPlacementRegressionCase({
    activationPolish: 30,
    lightVector: { x: -0.70710678, y: -0.70710678, z: 0.000001 },
    metalPolish: 30,
  })
  const topRight = createActivatedPlacementRegressionCase({
    activationPolish: 30,
    lightVector: { x: 0.70710678, y: 0.70710678, z: 0.000001 },
    metalPolish: 30,
  })

  assertPlacementSetsEqual(baseline.placementSet, bottomLeft.placementSet)
  assertPlacementSetsEqual(baseline.placementSet, topRight.placementSet)
  assertStablePlacementMapsEqual(baseline.stableMaps, bottomLeft.stableMaps)
  assertStablePlacementMapsEqual(baseline.stableMaps, topRight.stableMaps)
  assertActiveBodyMapsEqual(baseline.stableMaps, bottomLeft.stableMaps)
  assertActiveBodyMapsEqual(baseline.stableMaps, topRight.stableMaps)
  assertPhysicalContributionMapsAreZero(baseline.stableMaps)
  assertPhysicalContributionMapsAreZero(bottomLeft.stableMaps)
  assertPhysicalContributionMapsAreZero(topRight.stableMaps)
})

test('stage 4 preview and export bounds do not reroll active body maps', () => {
  const preview = createActivatedPlacementRegressionCase({
    activationPolish: 30,
    bounds: { height: 96, width: 128, x: 0, y: 0 },
    metalPolish: 30,
  })
  const exportSized = createActivatedPlacementRegressionCase({
    activationPolish: 30,
    bounds: { height: 384, width: 512, x: 24, y: 48 },
    metalPolish: 30,
  })

  assertPlacementSetsEqual(preview.placementSet, exportSized.placementSet)
  assertStablePlacementMapsEqual(preview.stableMaps, exportSized.stableMaps)
  assertActiveBodyMapsEqual(preview.stableMaps, exportSized.stableMaps)
  assertPhysicalContributionMapsAreZero(preview.stableMaps)
  assertPhysicalContributionMapsAreZero(exportSized.stableMaps)
})

test('stage 4 different image material seeds change active body maps', () => {
  const first = createActivatedPlacementRegressionCase({
    activationPolish: 30,
    materialSeed32: 0x11111111,
    materialSeedKey: 'stage-4-image-a',
    metalPolish: 30,
  })
  const second = createActivatedPlacementRegressionCase({
    activationPolish: 30,
    materialSeed32: 0x22222222,
    materialSeedKey: 'stage-4-image-b',
    metalPolish: 30,
  })

  assert.notDeepEqual(
    getPlacementIdentity(second.placementSet),
    getPlacementIdentity(first.placementSet),
  )
  assert.equal(
    sumStablePlacementMapDifference(first.stableMaps, second.stableMaps) > 10,
    true,
  )
  assert.equal(
    sumActiveBodyMapDifference(first.stableMaps, second.stableMaps) > 10,
    true,
  )
  assertPhysicalContributionMapsAreZero(first.stableMaps)
  assertPhysicalContributionMapsAreZero(second.stableMaps)
})

function getScratchPlacementIdentity(
  placementSet: ReturnType<typeof createArtworkFrameSteelDefectPlacementSet>,
) {
  return placementSet.placements
    .filter((placement) => placement.kind === 'scratch')
    .map((placement) => ({
      centerX: placement.centerX,
      centerY: placement.centerY,
      edgeRoughness: placement.edgeRoughness,
      id: placement.id,
      kind: placement.kind,
      length: placement.length,
      maxDepth: placement.maxDepth,
      seed: placement.seed,
      stageFamily: placement.stageFamily,
      taper: placement.taper,
      waviness: placement.waviness,
      width: placement.width,
    }))
}

function getPlacementsByKind(
  placementSet: ReturnType<typeof createArtworkFrameSteelDefectPlacementSet>,
  kind: ArtworkFrameSteelDefectKind,
) {
  return placementSet.placements.filter((placement) => placement.kind === kind)
}

function isInsideDefaultFrameRing(centerX: number, centerY: number) {
  const inLeft = centerX >= 0 && centerX <= 0.18 && centerY >= 0 && centerY <= 1
  const inRight = centerX >= 0.82 && centerX <= 1 && centerY >= 0 && centerY <= 1
  const inTop = centerX >= 0.18 && centerX <= 0.82 && centerY >= 0 && centerY <= 0.18
  const inBottom = centerX >= 0.18 && centerX <= 0.82 && centerY >= 0.82 && centerY <= 1

  return inLeft || inRight || inTop || inBottom
}

function getAverage(
  placements: readonly ArtworkFrameSteelDefectPlacement[],
  key: 'length' | 'maxDepth' | 'width',
) {
  return placements.reduce((sum, placement) => sum + placement[key], 0) /
    placements.length
}

test('steel defect placement generator returns deterministic scratch gouge dent pit scuff and burr placements', () => {
  const input = createTestSteelDefectPlacementInput()
  const first = createArtworkFrameSteelDefectPlacementSet(input)
  const second = createArtworkFrameSteelDefectPlacementSet(input)

  assert.deepEqual(second, first)
  assert.equal(first.generatorVersion, 'steel-defect-placement-v1')
  assert.equal(
    first.geometrySeedKey,
    getArtworkFrameSteelDefectPlacementGeometrySeedKey(input),
  )
  assert.equal(first.placements.length > 0, true)
  assert.equal(
    getPlacementsByKind(first, 'scratch').length > 0,
    true,
  )
  assert.equal(
    getPlacementsByKind(first, 'gouge').length > 0,
    true,
  )
  assert.equal(
    getPlacementsByKind(first, 'dent').length > 0,
    true,
  )
  assert.equal(
    getPlacementsByKind(first, 'pit').length > 0,
    true,
  )
  assert.equal(
    getPlacementsByKind(first, 'scuff').length > 0,
    true,
  )
  assert.equal(
    getPlacementsByKind(first, 'burrNick').length > 0,
    true,
  )
  assert.equal(Number.isInteger(first.randomStreamSeed32), true)
})

test('steel defect placement generator exposes different stream metadata for different seeds', () => {
  const first = createArtworkFrameSteelDefectPlacementSet(
    createTestSteelDefectPlacementInput(),
  )
  const second = createArtworkFrameSteelDefectPlacementSet({
    ...createTestSteelDefectPlacementInput(),
    geometrySeedKey: 'steel-finish-field-v1|material-seed:test-b',
  })

  assert.notEqual(second.geometrySeedKey, first.geometrySeedKey)
  assert.notEqual(second.randomStreamSeed32, first.randomStreamSeed32)
  assert.notDeepEqual(second.placements, first.placements)
})

test('steel defect placement generator excludes polish tarnish and light response from placement seed', () => {
  const createFromVisualResponse = (response: {
    lightVector: { x: number; y: number; z: number }
    metalPolish: number
    metalTarnish: number
  }) => {
    void response

    return createArtworkFrameSteelDefectPlacementSet(
      createTestSteelDefectPlacementInput(),
    )
  }
  const baseline = createFromVisualResponse({
    lightVector: { x: 0, y: 0, z: 1 },
    metalPolish: 0,
    metalTarnish: 0,
  })

  assert.deepEqual(
    createFromVisualResponse({
      lightVector: { x: 0.65, y: -0.65, z: 0.39 },
      metalPolish: 100,
      metalTarnish: 80,
    }),
    baseline,
  )
})

test('steel scratch placements are thin varied tapered and mostly brush aligned', () => {
  const input = createTestSteelDefectPlacementInput()
  const placementSet = createArtworkFrameSteelDefectPlacementSet(input)
  const scratchPlacements = getPlacementsByKind(placementSet, 'scratch')
  const lengths = new Set(
    scratchPlacements.map((placement) => placement.length.toFixed(4)),
  )
  const widths = new Set(
    scratchPlacements.map((placement) => placement.width.toFixed(4)),
  )
  const brush = input.brushDirection
  const alignedCount = scratchPlacements.filter((placement) =>
    Math.abs(
      placement.tangentX * brush.tangentX + placement.tangentY * brush.tangentY,
    ) > 0.9
  ).length
  const crossGrainCount = scratchPlacements.filter((placement) =>
    Math.abs(
      placement.tangentX * brush.tangentX + placement.tangentY * brush.tangentY,
    ) < 0.82
  ).length

  assert.equal(scratchPlacements.length > 0, true)
  assert.equal(lengths.size > 12, true)
  assert.equal(widths.size > 8, true)
  assert.equal(
    scratchPlacements.every((placement) =>
      placement.width > 0 && placement.width <= 0.012
    ),
    true,
  )
  assert.equal(
    scratchPlacements.every((placement) =>
      placement.taper >= 0.42 && placement.taper <= 0.96
    ),
    true,
  )
  assert.equal(
    scratchPlacements.every((placement) =>
      placement.waviness >= 0.0015 && placement.waviness <= 0.014
    ),
    true,
  )
  assert.equal(alignedCount > scratchPlacements.length * 0.65, true)
  assert.equal(crossGrainCount > 0, true)
  assert.equal(
    scratchPlacements.some((placement) =>
      placement.stageFamily === 'brushedHairline' ||
      placement.stageFamily === 'polishedMicro'
    ),
    true,
  )
})

test('steel scratch placement brush direction rotates tangent without rerolling identity', () => {
  const input = createTestSteelDefectPlacementInput()
  const baseline = createArtworkFrameSteelDefectPlacementSet(input)
  const rotated = createArtworkFrameSteelDefectPlacementSet({
    ...input,
    brushDirection: {
      angleDegrees: 75,
      tangentX: 0.25881904510252074,
      tangentY: 0.9659258262890683,
    },
  })
  const rotatedScratches = getPlacementsByKind(rotated, 'scratch')
  const baselineScratches = getPlacementsByKind(baseline, 'scratch')
  const changedTangents = rotatedScratches.filter((placement, index) => {
    const source = baselineScratches[index]

    return source && (
      Math.abs(source.tangentX - placement.tangentX) > 0.000001 ||
      Math.abs(source.tangentY - placement.tangentY) > 0.000001
    )
  }).length

  assert.equal(rotated.geometrySeedKey, baseline.geometrySeedKey)
  assert.equal(rotated.randomStreamSeed32, baseline.randomStreamSeed32)
  assert.deepEqual(
    getScratchPlacementIdentity(rotated),
    getScratchPlacementIdentity(baseline),
  )
  assert.equal(changedTangents > rotatedScratches.length * 0.9, true)
})

test('steel gouge placements are deeper rougher and less numerous than scratches', () => {
  const placementSet = createArtworkFrameSteelDefectPlacementSet(
    createTestSteelDefectPlacementInput(),
  )
  const scratches = getPlacementsByKind(placementSet, 'scratch')
  const gouges = getPlacementsByKind(placementSet, 'gouge')
  const averageScratchWidth = scratches.reduce(
    (sum, placement) => sum + placement.width,
    0,
  ) / scratches.length
  const averageGougeWidth = gouges.reduce(
    (sum, placement) => sum + placement.width,
    0,
  ) / gouges.length
  const averageScratchDepth = scratches.reduce(
    (sum, placement) => sum + placement.maxDepth,
    0,
  ) / scratches.length
  const averageGougeDepth = gouges.reduce(
    (sum, placement) => sum + placement.maxDepth,
    0,
  ) / gouges.length

  assert.equal(gouges.length > 0, true)
  assert.equal(gouges.length < scratches.length, true)
  assert.equal(averageGougeWidth > averageScratchWidth * 2, true)
  assert.equal(averageGougeDepth > averageScratchDepth, true)
  assert.equal(
    gouges.every((placement) =>
      placement.edgeRoughness >= 0.66 &&
      placement.taper >= 0.18 &&
      placement.taper <= 0.62
    ),
    true,
  )
})

test('steel dent placements are shallow irregular impact pockets rather than craters', () => {
  const placementSet = createArtworkFrameSteelDefectPlacementSet(
    createTestSteelDefectPlacementInput(),
  )
  const dents = getPlacementsByKind(placementSet, 'dent')
  const gouges = getPlacementsByKind(placementSet, 'gouge')
  const dentLengths = new Set(
    dents.map((placement) => placement.length.toFixed(4)),
  )
  const dentWidths = new Set(
    dents.map((placement) => placement.width.toFixed(4)),
  )
  const averageDentDepth = getAverage(dents, 'maxDepth')
  const averageGougeDepth = getAverage(gouges, 'maxDepth')

  assert.equal(dents.length > 0, true)
  assert.equal(dentLengths.size > 8, true)
  assert.equal(dentWidths.size > 6, true)
  assert.equal(averageDentDepth < averageGougeDepth * 0.55, true)
  assert.equal(
    dents.every((placement) =>
      placement.maxDepth >= 0.09 &&
      placement.maxDepth <= 0.34 &&
      placement.edgeRoughness >= 0.34 &&
      placement.edgeRoughness <= 0.84 &&
      placement.width <= placement.length * 0.72 &&
      placement.taper >= 0.24 &&
      placement.taper <= 0.68
    ),
    true,
  )
})

test('steel pit placements are tiny clustered jagged micro cavities', () => {
  const placementSet = createArtworkFrameSteelDefectPlacementSet(
    createTestSteelDefectPlacementInput(),
  )
  const pits = getPlacementsByKind(placementSet, 'pit')
  const pitLengths = new Set(
    pits.map((placement) => placement.length.toFixed(4)),
  )
  const pitWidths = new Set(
    pits.map((placement) => placement.width.toFixed(4)),
  )
  const clusteredCount = pits.filter((placement, index) => {
    const nearest = pits.reduce((minimumDistance, candidate, candidateIndex) => {
      if (candidateIndex === index) {
        return minimumDistance
      }

      return Math.min(
        minimumDistance,
        Math.hypot(
          candidate.centerX - placement.centerX,
          candidate.centerY - placement.centerY,
        ),
      )
    }, Number.POSITIVE_INFINITY)

    return nearest <= 0.045
  }).length

  assert.equal(pits.length >= 45, true)
  assert.equal(pitLengths.size > 8, true)
  assert.equal(pitWidths.size > 5, true)
  assert.equal(clusteredCount > pits.length * 0.58, true)
  assert.equal(
    pits.every((placement) =>
      placement.length <= 0.0115 &&
      placement.width <= 0.0068 &&
      placement.maxDepth <= 0.265 &&
      placement.edgeRoughness >= 0.56 &&
      placement.taper >= 0.16 &&
      placement.taper <= 0.58
    ),
    true,
  )
})

test('steel scuff placements are bounded abrasion regions with internal micro-scratch structure', () => {
  const input = createTestSteelDefectPlacementInput()
  const placementSet = createArtworkFrameSteelDefectPlacementSet(input)
  const scratches = getPlacementsByKind(placementSet, 'scratch')
  const scuffs = getPlacementsByKind(placementSet, 'scuff')
  const averageScratchWidth = getAverage(scratches, 'width')
  const averageScuffWidth = getAverage(scuffs, 'width')
  const lowPolishScuffCount = scuffs.filter((placement) =>
    placement.stageFamily === 'lowPolishScuff'
  ).length
  const directionalStructureCount = scuffs.filter((placement) => {
    const secondaryTangentX = placement.secondaryTangentX ?? placement.tangentX
    const secondaryTangentY = placement.secondaryTangentY ?? placement.tangentY
    const internalDot = Math.abs(
      placement.tangentX * secondaryTangentX +
        placement.tangentY * secondaryTangentY,
    )

    return internalDot > 0.86 && internalDot < 0.99
  }).length

  assert.equal(scuffs.length > 0, true)
  assert.equal(averageScuffWidth > averageScratchWidth * 8, true)
  assert.equal(lowPolishScuffCount >= scuffs.length * 0.5, true)
  assert.equal(directionalStructureCount > scuffs.length * 0.7, true)
  assert.equal(
    scuffs.every((placement) =>
      (placement.microScratchCount ?? 0) >= 18 &&
      (placement.microScratchCount ?? 0) <= 64 &&
      (placement.internalBreakup ?? 0) >= 0.44 &&
      placement.edgeRoughness >= 0.58 &&
      placement.width <= placement.length * 0.38 &&
      placement.taper <= 0.48 &&
      placement.maxDepth <= 0.255
    ),
    true,
  )
})

test('steel scuff placement stays stable across polish tarnish and light response changes', () => {
  const createFromVisualResponse = (response: {
    lightVector: { x: number; y: number; z: number }
    metalPolish: number
    metalTarnish: number
  }) => {
    void response

    return getPlacementsByKind(
      createArtworkFrameSteelDefectPlacementSet(
        createTestSteelDefectPlacementInput(),
      ),
      'scuff',
    )
  }
  const baseline = createFromVisualResponse({
    lightVector: { x: 0, y: 0, z: 1 },
    metalPolish: 0,
    metalTarnish: 0,
  })

  assert.deepEqual(
    createFromVisualResponse({
      lightVector: { x: -0.65, y: 0.65, z: 0.39 },
      metalPolish: 100,
      metalTarnish: 80,
    }),
    baseline,
  )
})

test('steel scuff placement footprints stay inside the frame ring', () => {
  const placementSet = createArtworkFrameSteelDefectPlacementSet(
    createTestSteelDefectPlacementInput(),
  )
  const scuffs = getPlacementsByKind(placementSet, 'scuff')

  assert.equal(scuffs.length > 0, true)
  for (const placement of scuffs) {
    const normalX = -placement.tangentY
    const normalY = placement.tangentX
    const sampledFootprint = [
      [placement.centerX, placement.centerY],
      [
        placement.centerX + placement.tangentX * placement.length * 0.5,
        placement.centerY + placement.tangentY * placement.length * 0.5,
      ],
      [
        placement.centerX - placement.tangentX * placement.length * 0.5,
        placement.centerY - placement.tangentY * placement.length * 0.5,
      ],
      [
        placement.centerX + normalX * placement.width * 0.78,
        placement.centerY + normalY * placement.width * 0.78,
      ],
      [
        placement.centerX - normalX * placement.width * 0.78,
        placement.centerY - normalY * placement.width * 0.78,
      ],
    ] as const

    assert.equal(
      sampledFootprint.every(([x, y]) =>
        x >= 0 &&
        x <= 1 &&
        y >= 0 &&
        y <= 1 &&
        isInsideDefaultFrameRing(x, y)
      ),
      true,
      `${placement.id} footprint should stay clipped to the frame ring`,
    )
  }
})

test('steel burr and nick placements favor frame edges as short broken candidates', () => {
  const placementSet = createArtworkFrameSteelDefectPlacementSet(
    createTestSteelDefectPlacementInput(),
  )
  const burrNicks = getPlacementsByKind(placementSet, 'burrNick')
  const edgeBiasedCount = burrNicks.filter((placement) => {
    const distanceToNearestFrameEdge = Math.min(
      placement.centerX,
      1 - placement.centerX,
      placement.centerY,
      1 - placement.centerY,
      Math.abs(placement.centerX - 0.18),
      Math.abs(placement.centerX - 0.82),
      Math.abs(placement.centerY - 0.18),
      Math.abs(placement.centerY - 0.82),
    )

    return distanceToNearestFrameEdge <= 0.055
  }).length

  assert.equal(burrNicks.length > 0, true)
  assert.equal(edgeBiasedCount > burrNicks.length * 0.55, true)
  assert.equal(
    burrNicks.every((placement) =>
      placement.length <= 0.06 &&
      placement.edgeRoughness >= 0.72 &&
      placement.taper <= 0.42
    ),
    true,
  )
})

test('steel gouge dent pit scuff burr and nick placements stay inside the frame ring', () => {
  const placementSet = createArtworkFrameSteelDefectPlacementSet(
    createTestSteelDefectPlacementInput(),
  )
  const targetKinds = new Set<ArtworkFrameSteelDefectKind>([
    'gouge',
    'dent',
    'pit',
    'scuff',
    'burrNick',
  ])
  const placements = placementSet.placements.filter((placement) =>
    targetKinds.has(placement.kind)
  )

  assert.equal(placements.length > 0, true)
  assert.equal(
    placements.every((placement) =>
      placement.centerX >= 0 &&
      placement.centerX <= 1 &&
      placement.centerY >= 0 &&
      placement.centerY <= 1 &&
      isInsideDefaultFrameRing(placement.centerX, placement.centerY)
    ),
    true,
  )
})

test('empty steel defect decal map helper resolves dimensions and validates frame mask length', () => {
  const rounded = createArtworkFrameSteelEmptyDefectDecalMaps({
    heightPixels: 2.2,
    widthPixels: 2.7,
  })

  assert.equal(rounded.widthPixels, 3)
  assert.equal(rounded.heightPixels, 2)
  assert.equal(rounded.activeBodies.scratch.presenceMask.length, 6)

  const clamped = createArtworkFrameSteelEmptyDefectDecalMaps({
    heightPixels: 0,
    widthPixels: 0,
  })

  assert.equal(clamped.widthPixels, 1)
  assert.equal(clamped.heightPixels, 1)
  assert.equal(clamped.physicalContributions.pit.height.length, 1)
  assert.throws(
    () =>
      createArtworkFrameSteelEmptyDefectDecalMaps({
        frameMask: new Float32Array(3),
        heightPixels: 2,
        widthPixels: 2,
      }),
    /frame mask length 3 does not match texture dimensions 2x2/,
  )
})

test('empty steel substrate map helpers expose stable no-op containers', () => {
  const substrateField = createArtworkFrameSteelEmptySubstrateField({
    heightPixels: 2.2,
    widthPixels: 2.7,
  })
  const substrateMaps = createArtworkFrameSteelEmptySubstrateDerivedMaps({
    heightPixels: 2.2,
    widthPixels: 2.7,
  })
  const substrateNormalInputs =
    createArtworkFrameSteelEmptySubstrateNormalInputs({
      heightPixels: 2.2,
      widthPixels: 2.7,
    })
  const length = 6

  assert.equal(substrateField.widthPixels, 3)
  assert.equal(substrateField.heightPixels, 2)
  assert.equal(substrateMaps.widthPixels, 3)
  assert.equal(substrateMaps.heightPixels, 2)
  assert.equal(substrateNormalInputs.widthPixels, 3)
  assert.equal(substrateNormalInputs.heightPixels, 2)

  for (const channel of ARTWORK_FRAME_STEEL_SUBSTRATE_FIELD_CHANNELS) {
    assert.equal(substrateField.fields[channel].length, length)
    assert.equal(countNonZeroValues(substrateField.fields[channel]), 0)
  }

  for (const channel of ARTWORK_FRAME_STEEL_SUBSTRATE_DERIVED_MAP_CHANNELS) {
    assert.equal(
      substrateMaps[channel].length,
      channel === 'steelSubstrateAlbedo' ? length * 3 : length,
    )
    assert.equal(countNonZeroValues(substrateMaps[channel]), 0)
  }

  assert.equal(substrateNormalInputs.normalStrength, 0)
  assert.equal(countNonZeroValues(substrateNormalInputs.normalX), 0)
  assert.equal(countNonZeroValues(substrateNormalInputs.normalY), 0)
  assert.equal(countNonZeroValues(substrateNormalInputs.substrateHeight), 0)
  assert.equal(countNonZeroValues(substrateNormalInputs.substrateAnisotropy), 0)
  assert.equal(
    countNonZeroValues(substrateNormalInputs.substrateAnisotropyDirectionX),
    0,
  )
  assert.equal(
    countNonZeroValues(substrateNormalInputs.substrateAnisotropyDirectionY),
    0,
  )
  assert.equal(countNonZeroValues(substrateNormalInputs.normalZ), length)
  assert.equal(
    substrateNormalInputs.normalZ.every((value) => value === 1),
    true,
  )
})

test('steel substrate composition containers can exist without renderer wiring', () => {
  const substrateMaps = createArtworkFrameSteelEmptySubstrateDerivedMaps({
    heightPixels: 4,
    widthPixels: 5,
  })
  const substrateNormalInputs =
    createArtworkFrameSteelEmptySubstrateNormalInputs({
      heightPixels: 4,
      widthPixels: 5,
    })
  const compositionInputs: ArtworkFrameSteelSubstrateCompositionInputs = {
    substrateMaps,
    substrateNormalInputs,
  }

  assert.equal(compositionInputs.substrateMaps, substrateMaps)
  assert.equal(compositionInputs.substrateNormalInputs, substrateNormalInputs)
  assert.equal(compositionInputs.defectDecalMaps, undefined)
})

test('existing steel finish descriptors build with derived substrate diagnostics', () => {
  const descriptor = createTestSteelCanvasTextureDescriptor()

  assert.ok(descriptor.steelFinishFieldRequest)

  const field = buildArtworkFrameSteelFinishField(
    descriptor.steelFinishFieldRequest,
  )
  const maps = buildArtworkFrameSteelFinishDerivedMaps(field)

  assert.equal('substrateMaps' in descriptor, false)
  assert.ok(maps.substrateMaps)
  assert.equal(maps.widthPixels, field.fieldSize.width)
  assert.equal(maps.heightPixels, field.fieldSize.height)
  assert.equal(maps.substrateMaps.widthPixels, field.fieldSize.width)
  assert.equal(maps.substrateMaps.heightPixels, field.fieldSize.height)
  assert.equal(
    getArtworkFrameCanvasMaterialTextureKey(descriptor).length > 0,
    true,
  )
})

test('steel finish maps can exist with and without optional defect decal containers', () => {
  const descriptor = createTestSteelCanvasTextureDescriptor()

  assert.ok(descriptor.steelFinishFieldRequest)

  const field = buildArtworkFrameSteelFinishField(
    descriptor.steelFinishFieldRequest,
  )
  const withoutDefects = buildArtworkFrameSteelFinishDerivedMaps(field)
  const defectDecalMaps = createArtworkFrameSteelEmptyDefectDecalMaps({
    frameMask: field.fields.frameMask,
    heightPixels: field.fieldSize.height,
    widthPixels: field.fieldSize.width,
  })
  const withDefects = buildArtworkFrameSteelFinishDerivedMaps(field, {
    defectDecalMaps,
  })

  assert.equal('defectDecalMaps' in withoutDefects, false)
  assert.equal(withDefects.defectDecalMaps, defectDecalMaps)
  assert.equal(withDefects.widthPixels, withoutDefects.widthPixels)
  assert.equal(withDefects.heightPixels, withoutDefects.heightPixels)
  assert.deepEqual(withDefects.stageUnits, withoutDefects.stageUnits)
  assert.notEqual(withDefects.steelHeight, withoutDefects.steelHeight)
  assert.deepEqual(withDefects.steelHeight, withoutDefects.steelHeight)
  assert.deepEqual(
    withDefects.steelAmbientOcclusion,
    withoutDefects.steelAmbientOcclusion,
  )
  assert.deepEqual(withDefects.steelRoughness, withoutDefects.steelRoughness)
  assert.deepEqual(withDefects.steelGloss, withoutDefects.steelGloss)
  assert.deepEqual(withDefects.steelAlbedo, withoutDefects.steelAlbedo)
})

test('existing canvas material descriptors still build without steel defect decal data', () => {
  const descriptor = createTestSteelCanvasTextureDescriptor()

  assert.ok(descriptor.steelFinishFieldRequest)
  assert.equal('defectDecalMaps' in descriptor, false)
  assert.equal(
    getArtworkFrameCanvasMaterialTextureKey(descriptor).length > 0,
    true,
  )
})

test('optional steel defect decal containers do not affect existing descriptor cache keys', () => {
  const descriptor = createTestSteelCanvasTextureDescriptor()

  assert.ok(descriptor.steelFinishFieldRequest)

  const beforeKey =
    getArtworkFrameCanvasMaterialSteelFinishDerivedMapsCacheKey(
      descriptor.steelFinishFieldRequest,
    )
  const field = buildArtworkFrameSteelFinishField(
    descriptor.steelFinishFieldRequest,
  )
  const defectDecalMaps = createArtworkFrameSteelEmptyDefectDecalMaps({
    frameMask: field.fields.frameMask,
    heightPixels: field.fieldSize.height,
    widthPixels: field.fieldSize.width,
  })

  buildArtworkFrameSteelFinishDerivedMaps(field, { defectDecalMaps })

  assert.equal(
    getArtworkFrameCanvasMaterialSteelFinishDerivedMapsCacheKey(
      descriptor.steelFinishFieldRequest,
    ),
    beforeKey,
  )
  assert.equal(
    getArtworkFrameCanvasMaterialTextureKey(descriptor),
    getArtworkFrameCanvasMaterialTextureKey(descriptor),
  )
})

test('rasterized stable steel defect placement maps do not alter current finish maps or cache keys while unwired', () => {
  const descriptor = createTestSteelCanvasTextureDescriptor()

  assert.ok(descriptor.steelFinishFieldRequest)

  const beforeKey =
    getArtworkFrameCanvasMaterialSteelFinishDerivedMapsCacheKey(
      descriptor.steelFinishFieldRequest,
    )
  const field = buildArtworkFrameSteelFinishField(
    descriptor.steelFinishFieldRequest,
  )
  const withoutDefects = buildArtworkFrameSteelFinishDerivedMaps(field)
  const placementSet = createArtworkFrameSteelDefectPlacementSet(
    createTestSteelDefectPlacementInput(),
  )
  const defectDecalMaps =
    rasterizeArtworkFrameSteelDefectStablePlacementMaps({
      frameMask: field.fields.frameMask,
      heightPixels: field.fieldSize.height,
      placementSet,
      widthPixels: field.fieldSize.width,
    })
  const withDefects = buildArtworkFrameSteelFinishDerivedMaps(field, {
    defectDecalMaps,
  })

  assert.equal(
    countNonZeroValues(defectDecalMaps.stablePlacement.scratch.candidateMask) >
      0,
    true,
  )
  assert.deepEqual(withDefects.steelHeight, withoutDefects.steelHeight)
  assert.deepEqual(
    withDefects.steelAmbientOcclusion,
    withoutDefects.steelAmbientOcclusion,
  )
  assert.deepEqual(withDefects.steelRoughness, withoutDefects.steelRoughness)
  assert.deepEqual(withDefects.steelGloss, withoutDefects.steelGloss)
  assert.deepEqual(withDefects.steelAlbedo, withoutDefects.steelAlbedo)
  assert.equal(
    getArtworkFrameCanvasMaterialSteelFinishDerivedMapsCacheKey(
      descriptor.steelFinishFieldRequest,
    ),
    beforeKey,
  )
  assert.equal(
    getArtworkFrameCanvasMaterialTextureKey(descriptor),
    getArtworkFrameCanvasMaterialTextureKey(descriptor),
  )
})

test('steel finish ignores legacy stable placement masks without active physical contributions', () => {
  const descriptor = createTestSteelCanvasTextureDescriptor()

  assert.ok(descriptor.steelFinishFieldRequest)

  const field = buildArtworkFrameSteelFinishField(
    descriptor.steelFinishFieldRequest,
  )
  const maps = buildArtworkFrameSteelFinishDerivedMaps(field)

  assert.equal(
    countNonZeroValues(maps.scratchTroughMask) > 0,
    true,
    'legacy scratch placement should still be available as transition data',
  )
  assert.equal(
    countNonZeroValues(maps.pitPocketMask) > 0,
    true,
    'legacy pit placement should still be available as transition data',
  )
  assert.equal(
    countNonZeroValues(maps.visibleScratchDepthMask),
    0,
    'legacy scratch placement must not create active height',
  )
  assert.equal(
    countNonZeroValues(maps.visibleScratchAmbientOcclusionMask),
    0,
    'legacy scratch placement must not create active AO',
  )
  assert.equal(
    countNonZeroValues(maps.visiblePitDepthMask),
    0,
    'legacy pit placement must not create active height',
  )
  assert.equal(
    countNonZeroValues(maps.visiblePitAmbientOcclusionMask),
    0,
    'legacy pit placement must not create active AO',
  )
  assert.equal(
    countNonZeroValues(maps.scratchRimLightMask),
    0,
    'legacy scratch placement must not create active rim light',
  )
  assert.equal(
    countNonZeroValues(maps.scratchRimShadowMask),
    0,
    'legacy scratch placement must not create active rim shadow',
  )
  assert.equal(
    countNonZeroValues(maps.visibleScratchShadowMask),
    0,
    'legacy scratch placement must not create active shadow',
  )
  assert.equal(
    countNonZeroValues(maps.visibleDefectShadowMask),
    0,
    'legacy placements must not create active damage shadow',
  )
  assert.equal(
    countNonZeroValues(maps.visibleBurrRidgeMask),
    0,
    'legacy burr placement must not create active burr ridge',
  )
  assert.equal(
    countNonZeroValues(maps.scuffCrossScratchRimLightMask),
    0,
    'legacy scuff placement must not create active scuff rim light',
  )
  assert.equal(
    countNonZeroValues(maps.scuffCrossScratchRimShadowMask),
    0,
    'legacy scuff placement must not create active scuff rim shadow',
  )
})

test('steel finish consumes active decal physical contributions for material response', () => {
  const descriptor = createTestSteelCanvasTextureDescriptor()

  assert.ok(descriptor.steelFinishFieldRequest)

  const field = buildArtworkFrameSteelFinishField(
    descriptor.steelFinishFieldRequest,
  )
  const withoutDefects = buildArtworkFrameSteelFinishDerivedMaps(field)
  const defectDecalMaps = createArtworkFrameSteelEmptyDefectDecalMaps({
    frameMask: field.fields.frameMask,
    heightPixels: field.fieldSize.height,
    widthPixels: field.fieldSize.width,
  })
  const activeIndex = field.fields.frameMask.findIndex((value) => value > 0)

  assert.equal(activeIndex >= 0, true)

  defectDecalMaps.activeBodies.scratch.presenceMask[activeIndex] = 1
  defectDecalMaps.activeBodies.scratch.bodyMask[activeIndex] = 1
  defectDecalMaps.activeBodies.scratch.coreMask[activeIndex] = 1
  defectDecalMaps.activeBodies.scratch.edgeMask[activeIndex] = 0.65
  defectDecalMaps.physicalContributions.scratch.height[activeIndex] = 0.42
  defectDecalMaps.physicalContributions.scratch.ambientOcclusion[activeIndex] =
    0.36
  defectDecalMaps.physicalContributions.scratch.rimLight[activeIndex] = 0.24
  defectDecalMaps.physicalContributions.scratch.rimShadow[activeIndex] = 0.31
  defectDecalMaps.physicalContributions.scratch.roughnessResponse[activeIndex] =
    0.44
  defectDecalMaps.physicalContributions.scratch.glossResponse[activeIndex] =
    0.5
  defectDecalMaps.physicalContributions.scratch.albedoResponse[activeIndex] =
    0.28
  defectDecalMaps.physicalContributions.scratch.selfShadowReceiver[
    activeIndex
  ] = 0.37

  const withDefects = buildArtworkFrameSteelFinishDerivedMaps(field, {
    defectDecalMaps,
  })
  const albedoIndex = activeIndex * 3

  assert.deepEqual(withDefects.scratchTroughMask, withoutDefects.scratchTroughMask)
  assert.equal(
    withDefects.defectDecalMaps?.activeBodies.scratch.presenceMask[
      activeIndex
    ],
    1,
    'active body presence should remain the owner for visible scratch material',
  )
  assert.equal(
    withDefects.defectDecalMaps?.activeBodies.scratch.bodyMask[activeIndex],
    1,
    'active body footprint should remain the owner for visible scratch material',
  )
  assert.equal(
    Math.abs((withDefects.visibleScratchDepthMask[activeIndex] ?? 0) - 0.42) <
      0.0001,
    true,
    'active scratch physical height should be surfaced as visible depth',
  )
  assert.equal(
    Math.abs(
      (withDefects.visibleScratchAmbientOcclusionMask[activeIndex] ?? 0) -
        0.36,
    ) < 0.0001,
    true,
    'active scratch physical AO should be surfaced as visible AO',
  )
  assert.equal(
    withDefects.steelHeight[activeIndex] <
      withoutDefects.steelHeight[activeIndex] - 0.3,
    true,
    'active scratch physical height should subtract from steelHeight',
  )
  assert.equal(
    withDefects.steelAmbientOcclusion[activeIndex] >
      withoutDefects.steelAmbientOcclusion[activeIndex] + 0.3,
    true,
    'active scratch physical AO should add to steelAmbientOcclusion',
  )
  assert.equal(
    Math.abs((withDefects.visibleScratchRimLightMask[activeIndex] ?? 0) - 0.24) <
      0.0001,
    true,
    'active scratch rimLight should be surfaced as visible rim light',
  )
  assert.equal(
    Math.abs(
      (withDefects.visibleScratchRimShadowMask[activeIndex] ?? 0) - 0.31,
    ) < 0.0001,
    true,
    'active scratch rimShadow should be surfaced as visible rim shadow',
  )
  assert.equal(
    Math.abs((withDefects.visibleScratchShadowMask[activeIndex] ?? 0) - 0.31) <
      0.0001,
    true,
    'active scratch rimShadow should drive visible scratch shadow',
  )
  assert.equal(
    (withDefects.visibleDefectShadowMask[activeIndex] ?? 0) >
      (withoutDefects.visibleDefectShadowMask[activeIndex] ?? 0),
    true,
    'active physical response should drive visible defect shadow',
  )
  assert.equal(
    withDefects.steelRoughness[activeIndex] >
      withoutDefects.steelRoughness[activeIndex],
    true,
    'active roughnessResponse should increase steel roughness',
  )
  assert.equal(
    withDefects.steelGloss[activeIndex] <
      withoutDefects.steelGloss[activeIndex],
    true,
    'active glossResponse should suppress steel gloss',
  )
  assert.equal(
    (withDefects.steelAlbedo[albedoIndex] ?? 0) <
      (withoutDefects.steelAlbedo[albedoIndex] ?? 0),
    true,
    'active albedoResponse should darken local steel albedo',
  )
  assert.equal(
    Math.abs(
      getArtworkFrameSteelFinishSelfShadowReceiver(
        withDefects,
        activeIndex,
      ) -
        getArtworkFrameSteelFinishSelfShadowReceiver(
          withoutDefects,
          activeIndex,
        ) -
        0.37,
    ) < 0.0001,
    true,
    'active selfShadowReceiver should be the defect self-shadow owner',
  )

  withDefects.steelAmbientOcclusion[activeIndex] = 1
  withDefects.visibleDefectShadowMask[activeIndex] = 1
  withDefects.visibleScratchShadowMask[activeIndex] = 1
  withDefects.scuffCrossScratchRimShadowMask[activeIndex] = 1

  assert.equal(
    Math.abs(
      getArtworkFrameSteelFinishSelfShadowReceiver(
        withDefects,
        activeIndex,
      ) -
        getArtworkFrameSteelFinishSelfShadowReceiver(
          withoutDefects,
          activeIndex,
        ) -
        0.37,
    ) < 0.0001,
    true,
    'legacy visible masks must not add extra defect self-shadow receiver',
  )
})

test('steel defect decal containers serialize through worker shading requests deterministically', () => {
  const { steelFinishMaps } = buildTestSteelFinishMapsWithDefectDecals()
  const { request, transferables } =
    createWorkerRequestForSteelFinishMaps(steelFinishMaps)

  assert.ok(steelFinishMaps.defectDecalMaps)
  assert.ok(request.steelFinishMaps?.defectDecalMaps)

  const source = steelFinishMaps.defectDecalMaps
  const cloned = request.steelFinishMaps.defectDecalMaps

  assert.notEqual(cloned, source)
  assert.equal(cloned.widthPixels, source.widthPixels)
  assert.equal(cloned.heightPixels, source.heightPixels)
  assert.notEqual(
    cloned.stablePlacement.scratch.candidateMask,
    source.stablePlacement.scratch.candidateMask,
  )
  assert.notEqual(
    cloned.activeBodies.gouge.presenceMask,
    source.activeBodies.gouge.presenceMask,
  )
  assert.notEqual(
    cloned.physicalContributions.dent.height,
    source.physicalContributions.dent.height,
  )
  assert.deepEqual(
    cloned.stablePlacement.scratch.candidateMask,
    source.stablePlacement.scratch.candidateMask,
  )
  assert.deepEqual(
    cloned.stablePlacement.scratch.depthLimit,
    source.stablePlacement.scratch.depthLimit,
  )
  assert.deepEqual(
    cloned.activeBodies.gouge.presenceMask,
    source.activeBodies.gouge.presenceMask,
  )
  assert.deepEqual(
    cloned.activeBodies.gouge.bodyMask,
    source.activeBodies.gouge.bodyMask,
  )
  assert.deepEqual(
    cloned.physicalContributions.dent.height,
    source.physicalContributions.dent.height,
  )
  assert.deepEqual(
    cloned.physicalContributions.dent.ambientOcclusion,
    source.physicalContributions.dent.ambientOcclusion,
  )
  assert.deepEqual(
    cloned.physicalContributions.pit.selfShadowReceiver,
    source.physicalContributions.pit.selfShadowReceiver,
  )
  assert.deepEqual(
    cloned.physicalContributions.scuff.albedoResponse,
    source.physicalContributions.scuff.albedoResponse,
  )
  assert.equal(
    transferables.includes(
      cloned.stablePlacement.scratch.candidateMask.buffer as Transferable,
    ),
    true,
  )
  assert.equal(
    transferables.includes(
      cloned.physicalContributions.dent.height.buffer as Transferable,
    ),
    true,
  )
})

test('worker shading requests still serialize steel maps without defect decal containers', () => {
  const descriptor = createTestSteelCanvasTextureDescriptor()

  assert.ok(descriptor.steelFinishFieldRequest)

  const field = buildArtworkFrameSteelFinishField(
    descriptor.steelFinishFieldRequest,
  )
  const steelFinishMaps = buildArtworkFrameSteelFinishDerivedMaps(field)
  const { request } = createWorkerRequestForSteelFinishMaps(steelFinishMaps)

  assert.ok(request.steelFinishMaps)
  assert.equal('defectDecalMaps' in steelFinishMaps, false)
  assert.equal('defectDecalMaps' in request.steelFinishMaps, false)
})

test('preview and export worker request decal maps match when defect decals are present', () => {
  const { steelFinishMaps } = buildTestSteelFinishMapsWithDefectDecals()
  const preview = createWorkerRequestForSteelFinishMaps(steelFinishMaps).request
  const exported = createWorkerRequestForSteelFinishMaps(steelFinishMaps).request

  assert.ok(preview.steelFinishMaps?.defectDecalMaps)
  assert.ok(exported.steelFinishMaps?.defectDecalMaps)
  assert.equal(
    preview.steelFinishMaps.defectDecalMaps.widthPixels,
    exported.steelFinishMaps.defectDecalMaps.widthPixels,
  )
  assert.equal(
    preview.steelFinishMaps.defectDecalMaps.heightPixels,
    exported.steelFinishMaps.defectDecalMaps.heightPixels,
  )

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    for (const channel of ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS) {
      assert.equal(
        preview.steelFinishMaps.defectDecalMaps.activeBodies[kind][channel]
          .length,
        exported.steelFinishMaps.defectDecalMaps.activeBodies[kind][channel]
          .length,
      )
      assert.deepEqual(
        preview.steelFinishMaps.defectDecalMaps.activeBodies[kind][channel],
        exported.steelFinishMaps.defectDecalMaps.activeBodies[kind][channel],
      )
    }

    for (
      const channel of ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS
    ) {
      assert.equal(
        preview.steelFinishMaps.defectDecalMaps.physicalContributions[kind][
          channel
        ].length,
        exported.steelFinishMaps.defectDecalMaps.physicalContributions[kind][
          channel
        ].length,
      )
      assert.deepEqual(
        preview.steelFinishMaps.defectDecalMaps.physicalContributions[kind][
          channel
        ],
        exported.steelFinishMaps.defectDecalMaps.physicalContributions[kind][
          channel
        ],
      )
    }

    for (const channel of ARTWORK_FRAME_STEEL_DEFECT_STABLE_PLACEMENT_CHANNELS) {
      assert.equal(
        preview.steelFinishMaps.defectDecalMaps.stablePlacement[kind][channel]
          .length,
        exported.steelFinishMaps.defectDecalMaps.stablePlacement[kind][channel]
          .length,
      )
      assert.deepEqual(
        preview.steelFinishMaps.defectDecalMaps.stablePlacement[kind][channel],
        exported.steelFinishMaps.defectDecalMaps.stablePlacement[kind][channel],
      )
    }
  }
})
