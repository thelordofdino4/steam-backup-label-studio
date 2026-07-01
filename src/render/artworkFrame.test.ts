import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createScaledImageContentShapePathData,
  createMetalArtworkFramePathData,
  createTexturedArtworkFramePathData,
  getArtworkFrameStrokeWidth,
  getArtworkFrameTexturePatternSize,
  getArtworkFrameTextureUrl,
  getMetalArtworkFrameEdgeInsets,
  isMetalArtworkFrame,
  isTexturedArtworkFrame,
} from './artworkFrame.ts'
import {
  ARTWORK_FRAME_CANVAS_MATERIAL_INTERACTION_MAX_TEXTURE_DIMENSION,
  ARTWORK_FRAME_CANVAS_MATERIAL_MAX_TEXTURE_DIMENSION,
  ARTWORK_FRAME_CANVAS_MATERIAL_PIXEL_RATIO,
  buildMetalArtworkFrameMaterialPlan,
  canUseCanvasArtworkFrameMaterialTexture,
  getArtworkFrameCanvasMaterialTextureKey,
  resolveArtworkFrameCanvasMaterialPreviewTexturePixelRatio,
  resolveArtworkFrameCanvasMaterialTextureBounds,
  resolveArtworkFrameCanvasMaterialTextureSize,
} from './artworkFrameMaterialPlan.ts'
import {
  createArtworkFrameMaterialLightDragScheduler,
} from './artworkFrameMaterialInteractionQuality.ts'
import {
  ARTWORK_FRAME_MATERIAL_OVERHEAD_SUN_POSITION,
  clampArtworkFrameMaterialLightEditorSunPosition,
  getCaseInsertArtworkFrameMaterialLightEditorTarget,
  getDiscArtworkFrameMaterialLightEditorTarget,
  getArtworkFrameMaterialLightEditorPillarShadow,
  getArtworkFrameMaterialLightEditorStateFromPointer,
  getArtworkFrameMaterialLightEditorStateFromSunPosition,
  getArtworkFrameMaterialLightEditorSunPoint,
  getArtworkFrameMaterialLightEditorSunPositionFromPointer,
  isSelectedArtworkFrameCanvasLitMaterial,
  resetArtworkFrameMaterialLightEditorToOverhead,
} from './artworkFrameMaterialLightEditor.ts'
import {
  ARTWORK_FRAME_MATERIAL_OVERHEAD_LIGHT_VECTOR,
  createArtworkFrameMaterialHemisphereLightVector,
  getArtworkFrameMaterialHemisphereLightEditorPosition,
  getArtworkFrameMaterialLightVectorKey,
} from './artworkFrameMaterialLighting.ts'
import {
  createArtworkFrameMaterialPerformanceCollector,
  measureArtworkFrameMaterialPerformance,
} from './artworkFrameMaterialPerformance.ts'
import {
  buildArtworkFrameMaterialHeightSelfShadowMap,
  getArtworkFrameMaterialHeightSelfShadow,
  getArtworkFrameMaterialHeightSelfShadowMacroMultiplier,
} from './artworkFrameMaterialSelfShadow.ts'
import {
  createArtworkFrameMaterialShadingCoordinateContext,
  shadeArtworkFrameCanvasMaterialImageData,
} from './artworkFrameMaterialShading.ts'
import {
  createArtworkFrameMaterialWorkerShadingRequest,
  type ArtworkFrameMaterialShadingWorkerLike,
  type ArtworkFrameMaterialWorkerShadingRequest,
} from './artworkFrameMaterialShadingWorkerClient.ts'
import {
  createArtworkFrameMaterialCanvasMaterialCache,
  getArtworkFrameCanvasMaterialCorrosionDerivedMapsCacheKey,
  getArtworkFrameCanvasMaterialCorrosionGeometryCacheKey,
  getArtworkFrameCanvasMaterialShadedPixelsCacheKey,
  getArtworkFrameCanvasMaterialSteelFinishDerivedMapsCacheKey,
  getArtworkFrameCanvasMaterialSteelFinishGeometryCacheKey,
  getArtworkFrameCanvasMaterialSteelFinishNormalInputsCacheKey,
  getArtworkFrameCanvasMaterialSteelSubstrateGeometryCacheKey,
  renderArtworkFrameCanvasMaterialTextureAsync,
  renderArtworkFrameCanvasMaterialTexture,
} from './artworkFrameMaterialCanvas.ts'
import {
  renderArtworkFrameCanvasMaterialTextureWithOffscreenAdapter,
  renderArtworkFrameCanvasMaterialTextureWithWorkerShading,
} from './artworkFrameMaterialOffscreenCanvas.ts'
import {
  buildArtworkFrameCorrosionField,
  createArtworkFrameCorrosionFieldRequest,
  getArtworkFrameCorrosionSampleCoordinates,
  summarizeArtworkFrameCorrosionScalarField,
  type ArtworkFrameCorrosionScalarFields,
} from './artworkFrameCorrosionField.ts'
import {
  buildArtworkFrameCorrosionDerivedMaps,
  shadeArtworkFrameCorrosionImageData,
  type ArtworkFrameCorrosionDerivedMaps,
} from './artworkFrameCorrosionMaps.ts'
import {
  ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS,
  ARTWORK_FRAME_STEEL_DEFECT_KINDS,
  activateArtworkFrameSteelDefectActiveBodyMaps,
  ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS,
  ARTWORK_FRAME_STEEL_DEFECT_STABLE_PLACEMENT_CHANNELS,
  createArtworkFrameSteelDefectPlacementSet,
  createArtworkFrameSteelEmptyDefectDecalMaps,
  populateArtworkFrameSteelDefectPhysicalContributionMaps,
  rasterizeArtworkFrameSteelDefectStablePlacementMaps,
  type ArtworkFrameSteelDefectDecalMapSet,
  type ArtworkFrameSteelDefectKind,
  type ArtworkFrameSteelDefectPhysicalContributionChannel,
} from './artworkFrameSteelDefects.ts'
import {
  ARTWORK_FRAME_STEEL_FINISH_DERIVED_MAP_CHANNELS,
  ARTWORK_FRAME_STEEL_FINISH_FIELD_CHANNELS,
  ARTWORK_FRAME_STEEL_POLISH_STAGE_KEYS,
  ARTWORK_FRAME_STEEL_SUBSTRATE_DERIVED_MAP_CHANNELS,
  ARTWORK_FRAME_STEEL_SUBSTRATE_FIELD_CHANNELS,
  buildArtworkFrameSteelSubstrateDerivedMaps,
  buildArtworkFrameSteelFinishDerivedMaps,
  buildArtworkFrameSteelFinishField,
  buildArtworkFrameSteelFinishNormalInputs,
  buildArtworkFrameSteelSubstrateField,
  createArtworkFrameSteelEmptySubstrateDerivedMaps,
  createArtworkFrameSteelFinishFieldRequest,
  getArtworkFrameSteelFinishSelfShadowReceiver,
  getArtworkFrameSteelHighPolishSubstrateResponse,
  getArtworkFrameSteelPolishStageUnits,
  getArtworkFrameSteelPolishUnit,
  type ArtworkFrameSteelFinishDerivedMaps,
  type ArtworkFrameSteelFinishNormalInputs,
  type ArtworkFrameSteelFinishScalarFields,
  type ArtworkFrameSteelSubstrateDerivedMaps,
  type ArtworkFrameSteelSubstrateField,
} from './artworkFrameSteelFinish.ts'

function getPathNumbers(path: string) {
  return path.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? []
}

function getPathPoints(path: string) {
  const tokens = path.match(/[MLZmlz]|-?\d+(?:\.\d+)?/g) ?? []
  const points: Array<{ x: number; y: number }> = []

  for (let index = 0; index < tokens.length; index += 1) {
    const command = tokens[index].toUpperCase()

    if (command !== 'M' && command !== 'L') {
      continue
    }

    const x = Number(tokens[index + 1])
    const y = Number(tokens[index + 2])

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      break
    }

    points.push({ x, y })
    index += 2
  }

  return points
}

function getPathExtents(path: string) {
  const points = getPathPoints(path)
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)

  return {
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
    minX: Math.min(...xs),
    minY: Math.min(...ys),
  }
}

function clampTestNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function assertVectorNear(
  actual: { x: number; y: number; z: number },
  expected: { x: number; y: number; z: number },
  epsilon = 0.000001,
) {
  assert.equal(Math.abs(actual.x - expected.x) < epsilon, true)
  assert.equal(Math.abs(actual.y - expected.y) < epsilon, true)
  assert.equal(Math.abs(actual.z - expected.z) < epsilon, true)
}

function assertEditorPositionNear(
  actual: { x: number; y: number },
  expected: { x: number; y: number },
  epsilon = 0.000001,
) {
  assert.equal(Math.abs(actual.x - expected.x) < epsilon, true)
  assert.equal(Math.abs(actual.y - expected.y) < epsilon, true)
}

function assertUnitVector(vector: { x: number; y: number; z: number }) {
  assert.equal(
    Math.abs(Math.hypot(vector.x, vector.y, vector.z) - 1) < 0.000001,
    true,
  )
}

function splitPathPoints(path: string) {
  return path
    .split(/Z\s*/i)
    .map((subpath) => getPathPoints(subpath))
    .filter((points) => points.length > 0)
}

function assertFloatFieldsEqual(a: Float32Array, b: Float32Array) {
  assert.equal(a.length, b.length)

  for (let index = 0; index < a.length; index += 1) {
    assert.equal(a[index], b[index])
  }
}

function countDifferentFloatValues(a: Float32Array, b: Float32Array) {
  assert.equal(a.length, b.length)

  let differences = 0

  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) {
      differences += 1
    }
  }

  return differences
}

function assertCommonMaskedFloatFieldsEqual(
  a: Float32Array,
  b: Float32Array,
  aMask: Float32Array,
  bMask: Float32Array,
) {
  assert.equal(a.length, b.length)
  assert.equal(a.length, aMask.length)
  assert.equal(b.length, bMask.length)

  let checkedValues = 0

  for (let index = 0; index < a.length; index += 1) {
    if ((aMask[index] ?? 0) <= 0 || (bMask[index] ?? 0) <= 0) {
      continue
    }

    checkedValues += 1
    assert.equal(a[index], b[index])
  }

  assert.equal(checkedValues > 0, true)
}

function getAlignedCorrosionFieldValue(
  request: {
    fieldSize: { height: number; width: number }
  },
  values: Float32Array,
  xUnit: number,
  yUnit: number,
) {
  const x = Math.round(xUnit * (request.fieldSize.width - 1))
  const y = Math.round(yUnit * (request.fieldSize.height - 1))

  return values[y * request.fieldSize.width + x] ?? 0
}

function getMaterialCoordinateFieldValue(
  request: {
    bounds: { height: number; width: number; x: number; y: number }
    fieldSize: { height: number; width: number }
    samplingBounds: { height: number; width: number; x: number; y: number }
  },
  values: Float32Array,
  xUnit: number,
  yUnit: number,
) {
  const sampleX = request.bounds.x + request.bounds.width * xUnit
  const sampleY = request.bounds.y + request.bounds.height * yUnit
  const pixelX = Math.round(
    ((sampleX - request.samplingBounds.x) /
      Math.max(1, request.samplingBounds.width)) *
      (request.fieldSize.width - 1),
  )
  const pixelY = Math.round(
    ((sampleY - request.samplingBounds.y) /
      Math.max(1, request.samplingBounds.height)) *
      (request.fieldSize.height - 1),
  )

  if (
    pixelX < 0 ||
    pixelX >= request.fieldSize.width ||
    pixelY < 0 ||
    pixelY >= request.fieldSize.height
  ) {
    return 0
  }

  return values[pixelY * request.fieldSize.width + pixelX] ?? 0
}

function getMaterialCoordinateCorrosionFieldValue(
  request: {
    bounds: { height: number; width: number; x: number; y: number }
    fieldSize: { height: number; width: number }
    samplingBounds: { height: number; width: number; x: number; y: number }
  },
  values: Float32Array,
  xUnit: number,
  yUnit: number,
) {
  return getMaterialCoordinateFieldValue(request, values, xUnit, yUnit)
}

function assertMaterialCoordinateCorrosionFieldValuesEqual(
  aRequest: {
    bounds: { height: number; width: number; x: number; y: number }
    fieldSize: { height: number; width: number }
    samplingBounds: { height: number; width: number; x: number; y: number }
  },
  bRequest: {
    bounds: { height: number; width: number; x: number; y: number }
    fieldSize: { height: number; width: number }
    samplingBounds: { height: number; width: number; x: number; y: number }
  },
  aValues: Float32Array,
  bValues: Float32Array,
  points: Array<{ x: number; y: number }>,
) {
  for (const point of points) {
    assert.equal(
      getMaterialCoordinateCorrosionFieldValue(
        aRequest,
        aValues,
        point.x,
        point.y,
      ),
      getMaterialCoordinateCorrosionFieldValue(
        bRequest,
        bValues,
        point.x,
        point.y,
      ),
    )
  }
}

function assertAlignedCorrosionFieldValuesEqual(
  aRequest: { fieldSize: { height: number; width: number } },
  bRequest: { fieldSize: { height: number; width: number } },
  aValues: Float32Array,
  bValues: Float32Array,
  points: Array<{ x: number; y: number }>,
) {
  for (const point of points) {
    assert.equal(
      getAlignedCorrosionFieldValue(aRequest, aValues, point.x, point.y),
      getAlignedCorrosionFieldValue(bRequest, bValues, point.x, point.y),
    )
  }
}

function assertCorrosionPlacementFieldsEqual(
  a: ArtworkFrameCorrosionScalarFields,
  b: ArtworkFrameCorrosionScalarFields,
) {
  for (const fieldName of [
    'cellularPitCenters',
    'corrosionPotential',
    'defectExposure',
    'edgeExposure',
    'frameMask',
    'moistureBasins',
    'protectedMetalIslands',
  ] as const) {
    assertFloatFieldsEqual(a[fieldName], b[fieldName])
  }
}

function assertCorrosionGeometryFieldsEqual(
  a: ArtworkFrameCorrosionScalarFields,
  b: ArtworkFrameCorrosionScalarFields,
) {
  assertCorrosionPlacementFieldsEqual(a, b)
  assertFloatFieldsEqual(a.stageCoverage, b.stageCoverage)
}

function assertCorrosionDerivedMapsEqual(
  a: ArtworkFrameCorrosionDerivedMaps,
  b: ArtworkFrameCorrosionDerivedMaps,
) {
  assert.equal(a.widthPixels, b.widthPixels)
  assert.equal(a.heightPixels, b.heightPixels)

  for (const fieldName of [
    'albedo',
    'ambientOcclusion',
    'crackMask',
    'flakeBodyMask',
    'flakeCastShadow',
    'flakeCurlX',
    'flakeCurlY',
    'flakeLiftHeight',
    'flakeLipMask',
    'flakeMask',
    'flakeRootMask',
    'flakeUndercutAO',
    'height',
    'metalExposure',
    'normalX',
    'normalY',
    'normalZ',
    'poreMask',
    'roughness',
  ] as const) {
    assertFloatFieldsEqual(a[fieldName], b[fieldName])
  }
}

function assertCorrosionGeometryMapsEqual(
  a: ArtworkFrameCorrosionDerivedMaps,
  b: ArtworkFrameCorrosionDerivedMaps,
) {
  assert.equal(a.widthPixels, b.widthPixels)
  assert.equal(a.heightPixels, b.heightPixels)

  for (const fieldName of [
    'albedo',
    'crackMask',
    'flakeBodyMask',
    'flakeCastShadow',
    'flakeCurlX',
    'flakeCurlY',
    'flakeLiftHeight',
    'flakeLipMask',
    'flakeMask',
    'flakeRootMask',
    'flakeUndercutAO',
    'height',
    'normalX',
    'normalY',
    'normalZ',
    'poreMask',
  ] as const) {
    assertFloatFieldsEqual(a[fieldName], b[fieldName])
  }
}

function assertSteelFinishScalarFieldsEqual(
  a: ArtworkFrameSteelFinishScalarFields,
  b: ArtworkFrameSteelFinishScalarFields,
) {
  for (const fieldName of ARTWORK_FRAME_STEEL_FINISH_FIELD_CHANNELS) {
    assertFloatFieldsEqual(a[fieldName], b[fieldName])
  }
}

function countDifferentSteelFinishScalarValues(
  a: ArtworkFrameSteelFinishScalarFields,
  b: ArtworkFrameSteelFinishScalarFields,
) {
  return ARTWORK_FRAME_STEEL_FINISH_FIELD_CHANNELS.reduce(
    (sum, fieldName) => sum + countDifferentFloatValues(
      a[fieldName],
      b[fieldName],
    ),
    0,
  )
}

function assertSteelSubstrateFieldsEqual(
  a: ArtworkFrameSteelSubstrateField,
  b: ArtworkFrameSteelSubstrateField,
) {
  assert.equal(a.widthPixels, b.widthPixels)
  assert.equal(a.heightPixels, b.heightPixels)

  for (const fieldName of ARTWORK_FRAME_STEEL_SUBSTRATE_FIELD_CHANNELS) {
    assertFloatFieldsEqual(a.fields[fieldName], b.fields[fieldName])
  }
}

function countDifferentSteelSubstrateValues(
  a: ArtworkFrameSteelSubstrateField,
  b: ArtworkFrameSteelSubstrateField,
) {
  assert.equal(a.widthPixels, b.widthPixels)
  assert.equal(a.heightPixels, b.heightPixels)

  return ARTWORK_FRAME_STEEL_SUBSTRATE_FIELD_CHANNELS.reduce(
    (sum, fieldName) => sum + countDifferentFloatValues(
      a.fields[fieldName],
      b.fields[fieldName],
    ),
    0,
  )
}

function assertSteelSubstrateDerivedMapsEqual(
  a: ArtworkFrameSteelSubstrateDerivedMaps,
  b: ArtworkFrameSteelSubstrateDerivedMaps,
) {
  assert.equal(a.widthPixels, b.widthPixels)
  assert.equal(a.heightPixels, b.heightPixels)

  for (const fieldName of ARTWORK_FRAME_STEEL_SUBSTRATE_DERIVED_MAP_CHANNELS) {
    assertFloatFieldsEqual(a[fieldName], b[fieldName])
  }
}

function assertSteelSubstratePlacementMapsEqual(
  a: ArtworkFrameSteelSubstrateDerivedMaps,
  b: ArtworkFrameSteelSubstrateDerivedMaps,
) {
  for (const fieldName of [
    'steelSubstrateLayDirectionX',
    'steelSubstrateLayDirectionY',
    'steelSubstrateMicroStrandMask',
    'steelSubstrateGrainContinuity',
    'steelSubstratePlateHaze',
    'steelSubstrateInclusionNoise',
    'steelSubstrateReflectionVeil',
    'steelSubstrateAnisotropyDirectionX',
    'steelSubstrateAnisotropyDirectionY',
  ] as const) {
    assertFloatFieldsEqual(a[fieldName], b[fieldName])
  }
}

function getMeanFloatValue(values: Float32Array) {
  if (values.length === 0) {
    return 0
  }

  let sum = 0

  for (const value of values) {
    sum += value
  }

  return sum / values.length
}

function getMeanAbsoluteFloatValue(values: Float32Array) {
  if (values.length === 0) {
    return 0
  }

  let sum = 0

  for (const value of values) {
    sum += Math.abs(value)
  }

  return sum / values.length
}

function summarizeIsolatedPositiveScalarPeaks(
  values: Float32Array,
  mask: Float32Array,
  widthPixels: number,
  heightPixels: number,
  {
    contrastThreshold,
    valueThreshold,
  }: {
    contrastThreshold: number
    valueThreshold: number
  },
) {
  let checkedPeakCount = 0
  let isolatedPeakCount = 0
  let maxContrast = 0
  let maxValue = 0

  for (let y = 1; y < heightPixels - 1; y += 1) {
    for (let x = 1; x < widthPixels - 1; x += 1) {
      const index = y * widthPixels + x

      if ((mask[index] ?? 0) <= 0) {
        continue
      }

      const value = values[index] ?? 0

      if (value < valueThreshold) {
        continue
      }

      let neighborCount = 0
      let neighborSum = 0

      checkedPeakCount += 1
      maxValue = Math.max(maxValue, value)

      for (let yOffset = -1; yOffset <= 1; yOffset += 1) {
        for (let xOffset = -1; xOffset <= 1; xOffset += 1) {
          if (xOffset === 0 && yOffset === 0) {
            continue
          }

          const neighborIndex =
            (y + yOffset) * widthPixels + x + xOffset

          if ((mask[neighborIndex] ?? 0) <= 0) {
            continue
          }

          neighborCount += 1
          neighborSum += values[neighborIndex] ?? 0
        }
      }

      if (neighborCount === 0) {
        continue
      }

      const contrast = value - neighborSum / neighborCount

      maxContrast = Math.max(maxContrast, contrast)

      if (contrast >= contrastThreshold) {
        isolatedPeakCount += 1
      }
    }
  }

  return {
    checkedPeakCount,
    isolatedPeakCount,
    maxContrast,
    maxValue,
  }
}

function summarizeScalarLocalContrast(
  values: Float32Array,
  mask: Float32Array,
  widthPixels: number,
  heightPixels: number,
) {
  let positiveContrastCount = 0
  let positiveContrastSum = 0
  let maxPositiveContrast = 0

  for (let y = 1; y < heightPixels - 1; y += 1) {
    for (let x = 1; x < widthPixels - 1; x += 1) {
      const index = y * widthPixels + x

      if ((mask[index] ?? 0) <= 0) {
        continue
      }

      let neighborCount = 0
      let neighborSum = 0

      for (let yOffset = -1; yOffset <= 1; yOffset += 1) {
        for (let xOffset = -1; xOffset <= 1; xOffset += 1) {
          if (xOffset === 0 && yOffset === 0) {
            continue
          }

          const neighborIndex =
            (y + yOffset) * widthPixels + x + xOffset

          if ((mask[neighborIndex] ?? 0) <= 0) {
            continue
          }

          neighborCount += 1
          neighborSum += values[neighborIndex] ?? 0
        }
      }

      if (neighborCount === 0) {
        continue
      }

      const contrast = (values[index] ?? 0) - neighborSum / neighborCount

      if (contrast <= 0) {
        continue
      }

      positiveContrastCount += 1
      positiveContrastSum += contrast
      maxPositiveContrast = Math.max(maxPositiveContrast, contrast)
    }
  }

  return {
    maxPositiveContrast,
    meanPositiveContrast: positiveContrastCount === 0
      ? 0
      : positiveContrastSum / positiveContrastCount,
    positiveContrastCount,
  }
}

function countNonZeroValues(values: Float32Array) {
  let count = 0

  for (const value of values) {
    if (value !== 0) {
      count += 1
    }
  }

  return count
}

function assertSteelFinishDerivedMapsEqual(
  a: ArtworkFrameSteelFinishDerivedMaps,
  b: ArtworkFrameSteelFinishDerivedMaps,
) {
  assert.equal(a.widthPixels, b.widthPixels)
  assert.equal(a.heightPixels, b.heightPixels)
  assert.equal(a.polishUnit, b.polishUnit)
  assert.deepEqual(a.stageUnits, b.stageUnits)

  for (const fieldName of ARTWORK_FRAME_STEEL_FINISH_DERIVED_MAP_CHANNELS) {
    assertFloatFieldsEqual(a[fieldName], b[fieldName])
  }
}

function assertSteelDefectDecalMapsEqual(
  a: ArtworkFrameSteelDefectDecalMapSet,
  b: ArtworkFrameSteelDefectDecalMapSet,
) {
  assert.equal(a.widthPixels, b.widthPixels)
  assert.equal(a.heightPixels, b.heightPixels)

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    for (const channel of ARTWORK_FRAME_STEEL_DEFECT_STABLE_PLACEMENT_CHANNELS) {
      assertFloatFieldsEqual(
        a.stablePlacement[kind][channel],
        b.stablePlacement[kind][channel],
      )
    }

    for (const channel of ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS) {
      assertFloatFieldsEqual(
        a.activeBodies[kind][channel],
        b.activeBodies[kind][channel],
      )
    }

    for (const channel of ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS) {
      assertFloatFieldsEqual(
        a.physicalContributions[kind][channel],
        b.physicalContributions[kind][channel],
      )
    }
  }
}

function assertSteelFinishPlacementMasksEqual(
  a: ArtworkFrameSteelFinishDerivedMaps,
  b: ArtworkFrameSteelFinishDerivedMaps,
) {
  for (const fieldName of [
    'machiningGrooveMask',
    'machiningRidgeMask',
    'brushedGrainMask',
    'abrasionCloudMask',
    'scratchTroughMask',
    'gougeTroughMask',
    'dentPocketMask',
    'pitPocketMask',
    'scuffCrossScratchTroughMask',
    'polishedReflectionMask',
    'polishedHazeMask',
  ] as const) {
    assertFloatFieldsEqual(a[fieldName], b[fieldName])
  }
}

function createActiveSteelDefectDecalMapsForFinishField(
  field: ReturnType<typeof buildArtworkFrameSteelFinishField>,
  metalPolish = field.polishUnit * 100,
): ArtworkFrameSteelDefectDecalMapSet {
  const brushRadians = (field.brushAngleDegrees * Math.PI) / 180
  const placementSet = createArtworkFrameSteelDefectPlacementSet({
    brushDirection: {
      angleDegrees: field.brushAngleDegrees,
      tangentX: Math.cos(brushRadians),
      tangentY: Math.sin(brushRadians),
    },
    frameRingCoordinates: {
      coordinateSpace: 'canonical-frame-ring-v1',
      frameShape: field.geometryInputs.shape,
      frameStyle: field.geometryInputs.style,
      ringKey: 'flat-rectangle-inner-outer-ring-v1',
    },
    geometrySeedKey: field.geometrySeedKey,
    materialIdentity: {
      metalType: field.geometryInputs.metalType,
    },
  })
  const defectDecalMaps = rasterizeArtworkFrameSteelDefectStablePlacementMaps({
    frameMask: field.fields.frameMask,
    heightPixels: field.fieldSize.height,
    placementSet,
    widthPixels: field.fieldSize.width,
  })

  activateArtworkFrameSteelDefectActiveBodyMaps({
    defectDecalMaps,
    frameMask: field.fields.frameMask,
    metalPolish,
  })
  populateArtworkFrameSteelDefectPhysicalContributionMaps({
    defectDecalMaps,
    frameMask: field.fields.frameMask,
    metalPolish,
  })

  return defectDecalMaps
}

function buildArtworkFrameSteelFinishDerivedMapsWithActiveDefects(
  field: ReturnType<typeof buildArtworkFrameSteelFinishField>,
  metalPolish = field.polishUnit * 100,
): ArtworkFrameSteelFinishDerivedMaps {
  return buildArtworkFrameSteelFinishDerivedMaps(field, {
    defectDecalMaps: createActiveSteelDefectDecalMapsForFinishField(
      field,
      metalPolish,
    ),
  })
}

function sumSteelDefectPhysicalContributionValues(
  maps: ArtworkFrameSteelDefectDecalMapSet,
  kind: ArtworkFrameSteelDefectKind,
  channel: ArtworkFrameSteelDefectPhysicalContributionChannel,
) {
  return maps.physicalContributions[kind][channel].reduce(
    (sum, value) => sum + value,
    0,
  )
}

function sumSteelDefectAllPhysicalContributionValues(
  maps: ArtworkFrameSteelDefectDecalMapSet,
  kind: ArtworkFrameSteelDefectKind,
) {
  return ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS.reduce(
    (sum, channel) =>
      sum + sumSteelDefectPhysicalContributionValues(maps, kind, channel),
    0,
  )
}

function sumSteelDefectActiveBodyValues(
  maps: ArtworkFrameSteelDefectDecalMapSet,
  kind: ArtworkFrameSteelDefectKind,
) {
  return ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS.reduce(
    (sum, channel) =>
      sum + maps.activeBodies[kind][channel].reduce(
        (channelSum, value) => channelSum + value,
        0,
      ),
    0,
  )
}

function sumSteelDefectStablePlacementCandidateValues(
  maps: ArtworkFrameSteelDefectDecalMapSet,
  kind: ArtworkFrameSteelDefectKind,
) {
  return maps.stablePlacement[kind].candidateMask.reduce(
    (sum, value) => sum + value,
    0,
  )
}

type SteelDefectVisibleCavityKind = 'dent' | 'gouge' | 'pit' | 'scratch'

function getSteelFinishVisibleDefectDepthMap(
  maps: ArtworkFrameSteelFinishDerivedMaps,
  kind: SteelDefectVisibleCavityKind,
) {
  switch (kind) {
    case 'dent':
      return maps.visibleDentDepthMask
    case 'gouge':
      return maps.visibleGougeDepthMask
    case 'pit':
      return maps.visiblePitDepthMask
    case 'scratch':
      return maps.visibleScratchDepthMask
  }
}

function getSteelFinishVisibleDefectAmbientOcclusionMap(
  maps: ArtworkFrameSteelFinishDerivedMaps,
  kind: SteelDefectVisibleCavityKind,
) {
  switch (kind) {
    case 'dent':
      return maps.visibleDentAmbientOcclusionMask
    case 'gouge':
      return maps.visibleGougeAmbientOcclusionMask
    case 'pit':
      return maps.visiblePitAmbientOcclusionMask
    case 'scratch':
      return maps.visibleScratchAmbientOcclusionMask
  }
}

function getSteelFinishDefectDecalMaps(
  maps: ArtworkFrameSteelFinishDerivedMaps,
) {
  assert.ok(maps.defectDecalMaps)

  return maps.defectDecalMaps
}

function assertSteelFinishNormalInputsEqual(
  a: ArtworkFrameSteelFinishNormalInputs,
  b: ArtworkFrameSteelFinishNormalInputs,
) {
  assert.equal(a.widthPixels, b.widthPixels)
  assert.equal(a.heightPixels, b.heightPixels)
  assert.equal(a.normalStrength, b.normalStrength)
  assertFloatFieldsEqual(a.steelHeight, b.steelHeight)
  assertFloatFieldsEqual(a.steelAnisotropy, b.steelAnisotropy)
  assertFloatFieldsEqual(a.steelAnisotropyDirectionX, b.steelAnisotropyDirectionX)
  assertFloatFieldsEqual(a.steelAnisotropyDirectionY, b.steelAnisotropyDirectionY)
  assertFloatFieldsEqual(a.normalX, b.normalX)
  assertFloatFieldsEqual(a.normalY, b.normalY)
  assertFloatFieldsEqual(a.normalZ, b.normalZ)
}

function summarizeSteelFinishNormalInputs(
  inputs: ArtworkFrameSteelFinishNormalInputs,
) {
  let activeCount = 0
  let maxLengthError = 0
  let maxTilt = 0
  let meanTilt = 0
  let minNormalZ = 1

  for (let index = 0; index < inputs.widthPixels * inputs.heightPixels; index += 1) {
    const normalX = inputs.normalX[index] ?? 0
    const normalY = inputs.normalY[index] ?? 0
    const normalZ = inputs.normalZ[index] ?? 0

    if (normalX === 0 && normalY === 0 && normalZ === 0) {
      continue
    }

    const length = Math.hypot(normalX, normalY, normalZ)
    const tilt = Math.hypot(normalX, normalY)

    activeCount += 1
    maxLengthError = Math.max(maxLengthError, Math.abs(length - 1))
    maxTilt = Math.max(maxTilt, tilt)
    meanTilt += tilt
    minNormalZ = Math.min(minNormalZ, normalZ)
  }

  return {
    activeCount,
    maxLengthError,
    maxTilt,
    meanTilt: meanTilt / Math.max(1, activeCount),
    minNormalZ,
  }
}

function summarizeSteelFinishSurfaceResponse(
  maps: ArtworkFrameSteelFinishDerivedMaps,
) {
  let activeCount = 0
  let ambientOcclusionSum = 0
  let albedoSum = 0
  let glossSum = 0
  let heightEnergySum = 0
  let roughnessSum = 0

  for (let index = 0; index < maps.widthPixels * maps.heightPixels; index += 1) {
    if ((maps.steelMetalness[index] ?? 0) <= 0) {
      continue
    }

    activeCount += 1
    ambientOcclusionSum += maps.steelAmbientOcclusion[index] ?? 0
    const albedoIndex = index * 3
    albedoSum += (
      (maps.steelAlbedo[albedoIndex] ?? 0) +
      (maps.steelAlbedo[albedoIndex + 1] ?? 0) +
      (maps.steelAlbedo[albedoIndex + 2] ?? 0)
    ) / 3
    glossSum += maps.steelGloss[index] ?? 0
    heightEnergySum += Math.abs(maps.steelHeight[index] ?? 0)
    roughnessSum += maps.steelRoughness[index] ?? 0
  }

  return {
    activeCount,
    albedoMean: albedoSum / Math.max(1, activeCount),
    ambientOcclusionMean: ambientOcclusionSum / Math.max(1, activeCount),
    glossMean: glossSum / Math.max(1, activeCount),
    heightEnergyMean: heightEnergySum / Math.max(1, activeCount),
    roughnessMean: roughnessSum / Math.max(1, activeCount),
  }
}

function summarizeMaskedSteelScalar(
  values: Float32Array,
  mask: Float32Array,
) {
  let activeCount = 0
  let maxAbs = 0
  let sum = 0
  let sumAbs = 0

  for (let index = 0; index < values.length; index += 1) {
    if ((mask[index] ?? 0) <= 0) {
      continue
    }

    const value = values[index] ?? 0

    activeCount += 1
    sum += value
    sumAbs += Math.abs(value)
    maxAbs = Math.max(maxAbs, Math.abs(value))
  }

  return {
    activeCount,
    maxAbs,
    mean: sum / Math.max(1, activeCount),
    meanAbs: sumAbs / Math.max(1, activeCount),
  }
}

function summarizeMaskedSteelScalarDelta(
  a: Float32Array,
  b: Float32Array,
  mask: Float32Array,
) {
  assert.equal(a.length, b.length)
  assert.equal(a.length, mask.length)

  let activeCount = 0
  let maxAbs = 0
  let sumAbs = 0

  for (let index = 0; index < a.length; index += 1) {
    if ((mask[index] ?? 0) <= 0) {
      continue
    }

    const delta = Math.abs((a[index] ?? 0) - (b[index] ?? 0))

    activeCount += 1
    sumAbs += delta
    maxAbs = Math.max(maxAbs, delta)
  }

  return {
    activeCount,
    maxAbs,
    meanAbs: sumAbs / Math.max(1, activeCount),
  }
}

function summarizeMaskedSteelAlbedoLuma(
  values: Float32Array,
  mask: Float32Array,
) {
  assert.equal(values.length, mask.length * 3)

  let activeCount = 0
  let max = 0
  let min = Number.POSITIVE_INFINITY
  let sum = 0

  for (let index = 0; index < mask.length; index += 1) {
    if ((mask[index] ?? 0) <= 0) {
      continue
    }

    const albedoIndex = index * 3
    const luma = (
      (values[albedoIndex] ?? 0) +
      (values[albedoIndex + 1] ?? 0) +
      (values[albedoIndex + 2] ?? 0)
    ) / 3

    activeCount += 1
    max = Math.max(max, luma)
    min = Math.min(min, luma)
    sum += luma
  }

  return {
    activeCount,
    max,
    mean: sum / Math.max(1, activeCount),
    min: activeCount > 0 ? min : 0,
  }
}

function summarizeMaskedSteelAlbedoLumaDelta(
  a: Float32Array,
  b: Float32Array,
  mask: Float32Array,
) {
  assert.equal(a.length, b.length)
  assert.equal(a.length, mask.length * 3)

  let activeCount = 0
  let maxAbs = 0
  let sumAbs = 0

  for (let index = 0; index < mask.length; index += 1) {
    if ((mask[index] ?? 0) <= 0) {
      continue
    }

    const albedoIndex = index * 3
    const aLuma = (
      (a[albedoIndex] ?? 0) +
      (a[albedoIndex + 1] ?? 0) +
      (a[albedoIndex + 2] ?? 0)
    ) / 3
    const bLuma = (
      (b[albedoIndex] ?? 0) +
      (b[albedoIndex + 1] ?? 0) +
      (b[albedoIndex + 2] ?? 0)
    ) / 3
    const delta = Math.abs(aLuma - bLuma)

    activeCount += 1
    sumAbs += delta
    maxAbs = Math.max(maxAbs, delta)
  }

  return {
    activeCount,
    maxAbs,
    meanAbs: sumAbs / Math.max(1, activeCount),
  }
}

function createStage7SubstrateOwnershipPackage(
  metalPolish: number,
  {
    metalTarnish = 0,
  }: {
    metalTarnish?: number
  } = {},
) {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'flat',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 0,
    metalBrushAngle: 12,
    metalPolish,
    metalTarnish,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 12, y: 20, width: 240, height: 160 }
  const request = createArtworkFrameSteelFinishFieldRequest({
    bounds,
    frame,
    materialSeed: {
      algorithm: 'sha256-image-v1',
      key: 'sha256-image-v1:stage-7-substrate-ownership-guards',
      seed32: 0x577a6e7,
    },
    samplingBounds: bounds,
    strokeWidth: 24,
    textureSize: { height: 64, width: 96 },
  })

  assert.ok(request)

  const field = buildArtworkFrameSteelFinishField(request)
  const substrateField = buildArtworkFrameSteelSubstrateField(field)
  const substrateMaps = buildArtworkFrameSteelSubstrateDerivedMaps(
    field,
    substrateField,
  )
  const cleanSteelMaps = buildArtworkFrameSteelFinishDerivedMaps(field)
  const normalInputs = buildArtworkFrameSteelFinishNormalInputs(cleanSteelMaps)

  return {
    cleanSteelMaps,
    field,
    normalInputs,
    substrateField,
    substrateMaps,
  }
}

function summarizeSteelFinishScalarGradient(
  field: Float32Array,
  width: number,
  height: number,
) {
  let count = 0
  let maxGradient = 0
  let sum = 0

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x
      const value = field[index] ?? 0

      if (x + 1 < width) {
        const gradient = Math.abs(value - (field[index + 1] ?? 0))

        count += 1
        sum += gradient
        maxGradient = Math.max(maxGradient, gradient)
      }

      if (y + 1 < height) {
        const gradient = Math.abs(value - (field[index + width] ?? 0))

        count += 1
        sum += gradient
        maxGradient = Math.max(maxGradient, gradient)
      }
    }
  }

  return {
    maxGradient,
    meanGradient: sum / Math.max(1, count),
  }
}

function getImageDataLuminance(imageData: ImageData, index: number) {
  const dataIndex = index * 4

  return (imageData.data[dataIndex] ?? 0) * 0.2126 +
    (imageData.data[dataIndex + 1] ?? 0) * 0.7152 +
    (imageData.data[dataIndex + 2] ?? 0) * 0.0722
}

function countIsolatedBrightSteelPixels(
  imageData: ImageData,
  maps: ArtworkFrameSteelFinishDerivedMaps,
) {
  let activeCount = 0
  let isolatedBrightCount = 0
  let maxLocalDelta = 0

  for (let y = 1; y < imageData.height - 1; y += 1) {
    for (let x = 1; x < imageData.width - 1; x += 1) {
      const index = y * imageData.width + x

      if ((maps.steelMetalness[index] ?? 0) <= 0) {
        continue
      }

      const luminance = getImageDataLuminance(imageData, index)
      const neighborMean = (
        getImageDataLuminance(imageData, index - 1) +
        getImageDataLuminance(imageData, index + 1) +
        getImageDataLuminance(imageData, index - imageData.width) +
        getImageDataLuminance(imageData, index + imageData.width)
      ) * 0.25
      const localDelta = luminance - neighborMean

      activeCount += 1
      maxLocalDelta = Math.max(maxLocalDelta, localDelta)

      if (luminance > 218 && localDelta > 34) {
        isolatedBrightCount += 1
      }
    }
  }

  return {
    activeCount,
    isolatedBrightCount,
    isolatedBrightShare: isolatedBrightCount / Math.max(1, activeCount),
    maxLocalDelta,
  }
}

function countIsolatedSubtleSteelPixelLift(
  imageData: ImageData,
  maps: ArtworkFrameSteelFinishDerivedMaps,
) {
  let checkedCount = 0
  let isolatedLiftCount = 0
  let maxChannelDelta = 0
  let maxLocalLumaDelta = 0

  for (let y = 1; y < imageData.height - 1; y += 1) {
    for (let x = 1; x < imageData.width - 1; x += 1) {
      const index = y * imageData.width + x

      if ((maps.steelMetalness[index] ?? 0) <= 0) {
        continue
      }

      let neighborCount = 0
      let neighborLumaSum = 0
      let neighborRedSum = 0
      let neighborGreenSum = 0
      let neighborBlueSum = 0
      let neighborMaxLuma = 0

      for (let yOffset = -1; yOffset <= 1; yOffset += 1) {
        for (let xOffset = -1; xOffset <= 1; xOffset += 1) {
          if (xOffset === 0 && yOffset === 0) {
            continue
          }

          const neighborIndex =
            (y + yOffset) * imageData.width + x + xOffset

          if ((maps.steelMetalness[neighborIndex] ?? 0) <= 0) {
            neighborCount = 0
            break
          }

          const neighborDataIndex = neighborIndex * 4
          const neighborLuma = getImageDataLuminance(imageData, neighborIndex)

          neighborCount += 1
          neighborLumaSum += neighborLuma
          neighborRedSum += imageData.data[neighborDataIndex] ?? 0
          neighborGreenSum += imageData.data[neighborDataIndex + 1] ?? 0
          neighborBlueSum += imageData.data[neighborDataIndex + 2] ?? 0
          neighborMaxLuma = Math.max(neighborMaxLuma, neighborLuma)
        }

        if (neighborCount === 0) {
          break
        }
      }

      if (neighborCount !== 8) {
        continue
      }

      const dataIndex = index * 4
      const luminance = getImageDataLuminance(imageData, index)
      const localLumaDelta = luminance - neighborLumaSum / neighborCount
      const redDelta =
        (imageData.data[dataIndex] ?? 0) - neighborRedSum / neighborCount
      const greenDelta =
        (imageData.data[dataIndex + 1] ?? 0) -
          neighborGreenSum / neighborCount
      const blueDelta =
        (imageData.data[dataIndex + 2] ?? 0) -
          neighborBlueSum / neighborCount
      const channelDelta = Math.max(redDelta, greenDelta, blueDelta)

      checkedCount += 1
      maxLocalLumaDelta = Math.max(maxLocalLumaDelta, localLumaDelta)
      maxChannelDelta = Math.max(maxChannelDelta, channelDelta)

      if (
        localLumaDelta >= 6.5 &&
        channelDelta >= 7 &&
        luminance - neighborMaxLuma >= 2.5
      ) {
        isolatedLiftCount += 1
      }
    }
  }

  return {
    checkedCount,
    isolatedLiftCount,
    maxChannelDelta,
    maxLocalLumaDelta,
  }
}

function summarizeCorrodedPolishedSteelResponse(rendered: {
  corrosionMaps: ArtworkFrameCorrosionDerivedMaps | null
  imageData: ImageData
  steelFinishMaps?: ArtworkFrameSteelFinishDerivedMaps | null
}) {
  assert.ok(rendered.corrosionMaps)
  assert.ok(rendered.steelFinishMaps)

  let brightCount = 0
  let corrosionCount = 0
  let corrosionRoughnessSum = 0
  let lumaSum = 0
  let steelRoughnessSum = 0

  for (
    let index = 0;
    index < rendered.imageData.width * rendered.imageData.height;
    index += 1
  ) {
    if ((rendered.imageData.data[index * 4 + 3] ?? 0) <= 0) {
      continue
    }

    const corrosionPresence = clampTestNumber(
      (1 - (rendered.corrosionMaps.metalExposure[index] ?? 1)) +
        (rendered.corrosionMaps.poreMask[index] ?? 0) * 0.5 +
        (rendered.corrosionMaps.flakeMask[index] ?? 0) * 0.45 +
        (rendered.corrosionMaps.ambientOcclusion[index] ?? 0) * 0.5,
      0,
      1,
    )

    if (corrosionPresence <= 0.45) {
      continue
    }

    const luminance = getImageDataLuminance(rendered.imageData, index)

    corrosionCount += 1
    corrosionRoughnessSum += rendered.corrosionMaps.roughness[index] ?? 0
    steelRoughnessSum += rendered.steelFinishMaps.steelRoughness[index] ?? 0
    lumaSum += luminance

    if (luminance > 200) {
      brightCount += 1
    }
  }

  return {
    brightShare: brightCount / Math.max(1, corrosionCount),
    corrosionCount,
    corrosionRoughnessMean: corrosionRoughnessSum /
      Math.max(1, corrosionCount),
    lumaMean: lumaSum / Math.max(1, corrosionCount),
    steelRoughnessMean: steelRoughnessSum / Math.max(1, corrosionCount),
  }
}

function summarizeExposedCorrosionChipResponse(rendered: {
  corrosionMaps: ArtworkFrameCorrosionDerivedMaps | null
  imageData: ImageData
}) {
  assert.ok(rendered.corrosionMaps)

  let chipCount = 0
  let chipLumaSum = 0
  let chipRoughnessSum = 0
  let rustScaleCount = 0
  let rustScaleLumaSum = 0
  let rustScaleRoughnessSum = 0

  for (
    let index = 0;
    index < rendered.imageData.width * rendered.imageData.height;
    index += 1
  ) {
    const metalExposure = rendered.corrosionMaps.metalExposure[index] ?? 0
    const flakeRelief = Math.max(
      rendered.corrosionMaps.flakeMask[index] ?? 0,
      rendered.corrosionMaps.flakeLipMask[index] ?? 0,
      rendered.corrosionMaps.crackMask[index] ?? 0,
      rendered.corrosionMaps.flakeUndercutAO[index] ?? 0,
      Math.max(0, (rendered.corrosionMaps.height[index] ?? 0.5) - 0.5),
    )
    const luma = getImageDataLuminance(rendered.imageData, index)
    const roughness = rendered.corrosionMaps.roughness[index] ?? 0

    if (metalExposure > 0.64 && flakeRelief > 0.05) {
      chipCount += 1
      chipLumaSum += luma
      chipRoughnessSum += roughness
    } else if (metalExposure < 0.42 && flakeRelief > 0.08) {
      rustScaleCount += 1
      rustScaleLumaSum += luma
      rustScaleRoughnessSum += roughness
    }
  }

  return {
    chipCount,
    chipLumaMean: chipLumaSum / Math.max(1, chipCount),
    chipRoughnessMean: chipRoughnessSum / Math.max(1, chipCount),
    rustScaleCount,
    rustScaleLumaMean: rustScaleLumaSum / Math.max(1, rustScaleCount),
    rustScaleRoughnessMean:
      rustScaleRoughnessSum / Math.max(1, rustScaleCount),
  }
}

function summarizeCorrosionLightResponseByMaterial(
  renderedA: {
    corrosionMaps: ArtworkFrameCorrosionDerivedMaps | null
    imageData: ImageData
  },
  renderedB: { imageData: ImageData },
) {
  assert.ok(renderedA.corrosionMaps)

  let chipCount = 0
  let chipDeltaSum = 0
  let rustScaleCount = 0
  let rustScaleDeltaSum = 0

  for (
    let index = 0;
    index < renderedA.imageData.width * renderedA.imageData.height;
    index += 1
  ) {
    const metalExposure = renderedA.corrosionMaps.metalExposure[index] ?? 0
    const flakeRelief = Math.max(
      renderedA.corrosionMaps.flakeMask[index] ?? 0,
      renderedA.corrosionMaps.flakeLipMask[index] ?? 0,
      renderedA.corrosionMaps.crackMask[index] ?? 0,
      renderedA.corrosionMaps.flakeUndercutAO[index] ?? 0,
      Math.max(0, (renderedA.corrosionMaps.height[index] ?? 0.5) - 0.5),
    )
    const rustPresence = clampTestNumber(
      (1 - metalExposure) +
        (renderedA.corrosionMaps.ambientOcclusion[index] ?? 0) * 0.35 +
        (renderedA.corrosionMaps.poreMask[index] ?? 0) * 0.28 +
        flakeRelief * 0.35,
      0,
      1,
    )
    const delta = Math.abs(
      getImageDataLuminance(renderedA.imageData, index) -
        getImageDataLuminance(renderedB.imageData, index),
    )

    if (metalExposure > 0.64 && flakeRelief > 0.05) {
      chipCount += 1
      chipDeltaSum += delta
    } else if (metalExposure < 0.42 && rustPresence > 0.58) {
      rustScaleCount += 1
      rustScaleDeltaSum += delta
    }
  }

  return {
    chipCount,
    chipMeanDelta: chipDeltaSum / Math.max(1, chipCount),
    rustScaleCount,
    rustScaleMeanDelta: rustScaleDeltaSum / Math.max(1, rustScaleCount),
  }
}

function summarizeStage7RustCompositionResponse(rendered: {
  corrosionMaps: ArtworkFrameCorrosionDerivedMaps | null
  imageData: ImageData
  steelFinishMaps?: ArtworkFrameSteelFinishDerivedMaps | null
}) {
  assert.ok(rendered.corrosionMaps)
  assert.ok(rendered.steelFinishMaps)

  let chipCount = 0
  let chipLumaSum = 0
  let chipRoughnessSum = 0
  let chipSteelGlossSum = 0
  let rustScaleCount = 0
  let rustScaleLumaSum = 0
  let rustScaleRoughnessSum = 0
  let rustScaleSteelGlossSum = 0

  for (
    let index = 0;
    index < rendered.imageData.width * rendered.imageData.height;
    index += 1
  ) {
    if ((rendered.imageData.data[index * 4 + 3] ?? 0) <= 0) {
      continue
    }

    const metalExposure = rendered.corrosionMaps.metalExposure[index] ?? 1
    const flakeRelief = Math.max(
      rendered.corrosionMaps.flakeMask[index] ?? 0,
      rendered.corrosionMaps.flakeLipMask[index] ?? 0,
      rendered.corrosionMaps.crackMask[index] ?? 0,
      rendered.corrosionMaps.flakeUndercutAO[index] ?? 0,
      Math.max(0, (rendered.corrosionMaps.height[index] ?? 0.5) - 0.5),
    )
    const rustPresence = clampTestNumber(
      (1 - metalExposure) +
        (rendered.corrosionMaps.ambientOcclusion[index] ?? 0) * 0.35 +
        (rendered.corrosionMaps.poreMask[index] ?? 0) * 0.28 +
        flakeRelief * 0.35,
      0,
      1,
    )
    const luma = getImageDataLuminance(rendered.imageData, index)
    const roughness = rendered.corrosionMaps.roughness[index] ?? 0
    const steelGloss = rendered.steelFinishMaps.steelGloss[index] ?? 0

    if (metalExposure > 0.64 && flakeRelief > 0.05) {
      chipCount += 1
      chipLumaSum += luma
      chipRoughnessSum += roughness
      chipSteelGlossSum += steelGloss
    } else if (metalExposure < 0.42 && rustPresence > 0.58) {
      rustScaleCount += 1
      rustScaleLumaSum += luma
      rustScaleRoughnessSum += roughness
      rustScaleSteelGlossSum += steelGloss
    }
  }

  return {
    chipCount,
    chipLumaMean: chipLumaSum / Math.max(1, chipCount),
    chipRoughnessMean: chipRoughnessSum / Math.max(1, chipCount),
    chipSteelGlossMean: chipSteelGlossSum / Math.max(1, chipCount),
    rustScaleCount,
    rustScaleLumaMean: rustScaleLumaSum / Math.max(1, rustScaleCount),
    rustScaleRoughnessMean:
      rustScaleRoughnessSum / Math.max(1, rustScaleCount),
    rustScaleSteelGlossMean:
      rustScaleSteelGlossSum / Math.max(1, rustScaleCount),
  }
}

function countSteelDefectPhysicalContributionValues(
  maps: ArtworkFrameSteelFinishDerivedMaps,
  kind: Exclude<ArtworkFrameSteelDefectKind, 'scratch'>,
) {
  return ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS.reduce(
    (sum, channel) =>
      sum + countNonZeroValues(
        maps.defectDecalMaps?.physicalContributions[kind][channel] ??
          new Float32Array(0),
      ),
    0,
  )
}

function summarizeSteelFinishAnisotropyDirectionDegrees(
  maps: ArtworkFrameSteelFinishDerivedMaps,
) {
  let weightSum = 0
  let xSum = 0
  let ySum = 0

  for (let index = 0; index < maps.widthPixels * maps.heightPixels; index += 1) {
    const weight = maps.steelAnisotropy[index] ?? 0

    if (weight <= 0) {
      continue
    }

    xSum += (maps.steelAnisotropyDirectionX[index] ?? 0) * weight
    ySum += (maps.steelAnisotropyDirectionY[index] ?? 0) * weight
    weightSum += weight
  }

  return weightSum > 0 ? Math.atan2(ySum, xSum) * 180 / Math.PI : 0
}

function getAngleDifferenceDegrees(a: number, b: number) {
  let difference = Math.abs(a - b) % 360

  if (difference > 180) {
    difference = 360 - difference
  }

  return difference
}

function summarizeSteelFinishDefectCoupling(
  maps: ArtworkFrameSteelFinishDerivedMaps,
  mask: Float32Array,
  threshold: number,
) {
  let activeAoSum = 0
  let activeCount = 0
  let activeHeightSum = 0
  let quietAoSum = 0
  let quietCount = 0
  let quietHeightSum = 0

  for (let index = 0; index < mask.length; index += 1) {
    const maskValue = mask[index] ?? 0
    const height = maps.steelHeight[index] ?? 0
    const ao = maps.steelAmbientOcclusion[index] ?? 0

    if (maskValue >= threshold) {
      activeCount += 1
      activeHeightSum += height
      activeAoSum += ao
    } else if (maskValue <= threshold * 0.12) {
      quietCount += 1
      quietHeightSum += height
      quietAoSum += ao
    }
  }

  return {
    activeAoMean: activeAoSum / Math.max(1, activeCount),
    activeCount,
    activeHeightMean: activeHeightSum / Math.max(1, activeCount),
    quietAoMean: quietAoSum / Math.max(1, quietCount),
    quietHeightMean: quietHeightSum / Math.max(1, quietCount),
  }
}

function summarizeSteelFinishDepthResponse(
  maps: ArtworkFrameSteelFinishDerivedMaps,
  mask: Float32Array,
  threshold: number,
) {
  let aoSum = 0
  let count = 0
  let maxNegativeHeight = 0
  let negativeHeightSum = 0

  for (let index = 0; index < mask.length; index += 1) {
    if ((mask[index] ?? 0) < threshold) {
      continue
    }

    count += 1
    aoSum += maps.steelAmbientOcclusion[index] ?? 0
    const negativeHeight = Math.max(0, -(maps.steelHeight[index] ?? 0))

    maxNegativeHeight = Math.max(maxNegativeHeight, negativeHeight)
    negativeHeightSum += negativeHeight
  }

  return {
    aoMean: aoSum / Math.max(1, count),
    count,
    maxNegativeHeight,
    negativeHeightMean: negativeHeightSum / Math.max(1, count),
  }
}

function summarizeSteelFinishScratchOnlyPhysicalResponse(
  maps: ArtworkFrameSteelFinishDerivedMaps,
  selfShadowMap: Float32Array,
) {
  let count = 0
  let maxNegativeHeight = 0
  let maxSelfShadow = 0
  let maxVisibleDepth = 0
  let negativeHeightSum = 0
  let selfShadowSum = 0
  let visibleDepthSum = 0
  let visibleShadowSum = 0

  for (let index = 0; index < maps.scratchTroughMask.length; index += 1) {
    if ((maps.scratchTroughMask[index] ?? 0) < 0.32) {
      continue
    }

    if (
      (maps.machiningGrooveMask[index] ?? 0) > 0.08 ||
      (maps.gougeTroughMask[index] ?? 0) > 0.08 ||
      (maps.dentPocketMask[index] ?? 0) > 0.08 ||
      (maps.pitPocketMask[index] ?? 0) > 0.08 ||
      (maps.scuffCrossScratchTroughMask[index] ?? 0) > 0.04
    ) {
      continue
    }

    const negativeHeight = Math.max(0, -(maps.steelHeight[index] ?? 0))
    const visibleDepth = maps.visibleScratchDepthMask[index] ?? 0
    const selfShadow = selfShadowMap[index] ?? 0

    count += 1
    maxNegativeHeight = Math.max(maxNegativeHeight, negativeHeight)
    maxSelfShadow = Math.max(maxSelfShadow, selfShadow)
    maxVisibleDepth = Math.max(maxVisibleDepth, visibleDepth)
    negativeHeightSum += negativeHeight
    selfShadowSum += selfShadow
    visibleDepthSum += visibleDepth
    visibleShadowSum += maps.visibleScratchShadowMask[index] ?? 0
  }

  return {
    count,
    maxNegativeHeight,
    maxSelfShadow,
    maxVisibleDepth,
    negativeHeightMean: negativeHeightSum / Math.max(1, count),
    selfShadowMean: selfShadowSum / Math.max(1, count),
    visibleDepthMean: visibleDepthSum / Math.max(1, count),
    visibleShadowMean: visibleShadowSum / Math.max(1, count),
  }
}

function summarizeSteelFinishMaskedScalarResponse(
  values: Float32Array,
  mask: Float32Array,
  threshold: number,
) {
  let count = 0
  let max = 0
  let sum = 0

  for (let index = 0; index < mask.length; index += 1) {
    if ((mask[index] ?? 0) < threshold) {
      continue
    }

    const value = values[index] ?? 0

    count += 1
    max = Math.max(max, value)
    sum += value
  }

  return {
    count,
    max,
    mean: sum / Math.max(1, count),
  }
}

function createTestCorrosionImageData(
  width: number,
  height: number,
  frameMask: Float32Array,
) {
  const data = new Uint8ClampedArray(width * height * 4)

  for (let index = 0; index < width * height; index += 1) {
    const x = index % width
    const y = Math.floor(index / width)
    const mask = frameMask[index] ?? 0
    const dataIndex = index * 4

    data[dataIndex] = 135 + Math.round((x / Math.max(1, width - 1)) * 48)
    data[dataIndex + 1] = 142 + Math.round((y / Math.max(1, height - 1)) * 36)
    data[dataIndex + 2] = 145
    data[dataIndex + 3] = mask > 0 ? 255 : 0
  }

  return {
    colorSpace: 'srgb',
    data,
    height,
    width,
  } as unknown as ImageData
}

function cloneImageData(imageData: ImageData) {
  return {
    colorSpace: imageData.colorSpace,
    data: new Uint8ClampedArray(imageData.data),
    height: imageData.height,
    width: imageData.width,
  } as unknown as ImageData
}

function countDifferentBytes(a: Uint8ClampedArray, b: Uint8ClampedArray) {
  let differences = 0

  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) {
      differences += 1
    }
  }

  return differences
}

function assertByteFieldsEqual(a: Uint8ClampedArray, b: Uint8ClampedArray) {
  assert.equal(a.length, b.length)

  for (let index = 0; index < a.length; index += 1) {
    assert.equal(a[index], b[index])
  }
}

function assertImageDataEqual(a: ImageData, b: ImageData) {
  assert.equal(a.width, b.width)
  assert.equal(a.height, b.height)
  assertByteFieldsEqual(a.data, b.data)
}

function summarizeCorrosionNormalMaps(
  fields: ArtworkFrameCorrosionScalarFields,
  maps: ArtworkFrameCorrosionDerivedMaps,
) {
  let framePixelCount = 0
  let maxLengthError = 0
  let maxTilt = 0
  let minNormalZ = 1
  let tiltedPixelCount = 0

  for (let index = 0; index < maps.widthPixels * maps.heightPixels; index += 1) {
    if ((fields.frameMask[index] ?? 0) <= 0) {
      continue
    }

    const normalX = maps.normalX[index] ?? 0
    const normalY = maps.normalY[index] ?? 0
    const normalZ = maps.normalZ[index] ?? 1
    const length = Math.hypot(normalX, normalY, normalZ)
    const tilt = Math.hypot(normalX, normalY)

    framePixelCount += 1
    maxLengthError = Math.max(maxLengthError, Math.abs(length - 1))
    maxTilt = Math.max(maxTilt, tilt)
    minNormalZ = Math.min(minNormalZ, normalZ)

    if (tilt > 0.035) {
      tiltedPixelCount += 1
    }
  }

  return {
    maxLengthError,
    maxTilt,
    minNormalZ,
    tiltedShare: tiltedPixelCount / Math.max(1, framePixelCount),
  }
}

function summarizeFlakeLightingDelta(
  fields: ArtworkFrameCorrosionScalarFields,
  maps: ArtworkFrameCorrosionDerivedMaps,
  beforeImageData: ImageData,
  afterImageData: ImageData,
) {
  let flakePixelCount = 0
  let flakeDeltaSum = 0
  let flakeSignificantPixelCount = 0
  let lipPixelCount = 0
  let lipDeltaSum = 0

  for (let index = 0; index < maps.widthPixels * maps.heightPixels; index += 1) {
    if ((fields.frameMask[index] ?? 0) <= 0) {
      continue
    }

    const flake = maps.flakeMask[index] ?? 0
    const lip = maps.flakeLipMask[index] ?? 0
    const undercut = maps.flakeUndercutAO[index] ?? 0
    const isFlakePixel = flake > 0.035 || lip > 0.02 || undercut > 0.02

    if (!isFlakePixel) {
      continue
    }

    const dataIndex = index * 4
    const delta =
      Math.abs(
        (afterImageData.data[dataIndex] ?? 0) -
          (beforeImageData.data[dataIndex] ?? 0),
      ) +
      Math.abs(
        (afterImageData.data[dataIndex + 1] ?? 0) -
          (beforeImageData.data[dataIndex + 1] ?? 0),
      ) +
      Math.abs(
        (afterImageData.data[dataIndex + 2] ?? 0) -
          (beforeImageData.data[dataIndex + 2] ?? 0),
      )

    flakePixelCount += 1
    flakeDeltaSum += delta

    if (delta >= 12) {
      flakeSignificantPixelCount += 1
    }

    if (lip > 0.025) {
      lipPixelCount += 1
      lipDeltaSum += delta
    }
  }

  return {
    flakeMeanDelta: flakeDeltaSum / Math.max(1, flakePixelCount),
    flakeSignificantShare:
      flakeSignificantPixelCount / Math.max(1, flakePixelCount),
    lipMeanDelta: lipDeltaSum / Math.max(1, lipPixelCount),
  }
}

function summarizeFlakeRoughnessRoles(
  fields: ArtworkFrameCorrosionScalarFields,
  maps: ArtworkFrameCorrosionDerivedMaps,
) {
  let exposedChipRoughnessSum = 0
  let exposedChipSum = 0
  let rustScaleRoughnessSum = 0
  let rustScaleSum = 0

  for (let index = 0; index < maps.widthPixels * maps.heightPixels; index += 1) {
    if ((fields.frameMask[index] ?? 0) <= 0) {
      continue
    }

    const crack = maps.crackMask[index] ?? 0
    const flake = maps.flakeMask[index] ?? 0
    const lip = maps.flakeLipMask[index] ?? 0
    const metal = maps.metalExposure[index] ?? 0
    const roughness = maps.roughness[index] ?? 0
    const chipWeight = Math.max(
      0,
      Math.min(1, (metal - 0.7) / 0.24),
    ) * Math.max(0, Math.min(1, (flake + crack * 0.42 - 0.018) / 0.12))
    const rustWeight = Math.max(
      0,
      Math.min(1, (flake + lip * 0.4 - 0.04) / 0.28),
    ) * Math.max(0, Math.min(1, (0.52 - metal) / 0.52))

    exposedChipRoughnessSum += roughness * chipWeight
    exposedChipSum += chipWeight
    rustScaleRoughnessSum += roughness * rustWeight
    rustScaleSum += rustWeight
  }

  return {
    exposedChipRoughnessMean:
      exposedChipRoughnessSum / Math.max(1, exposedChipSum),
    exposedChipWeight: exposedChipSum,
    rustScaleRoughnessMean:
      rustScaleRoughnessSum / Math.max(1, rustScaleSum),
    rustScaleWeight: rustScaleSum,
  }
}

function summarizeCorrosionImageDelta(
  fields: ArtworkFrameCorrosionScalarFields,
  beforeImageData: ImageData,
  afterImageData: ImageData,
) {
  let changedEightPixelCount = 0
  let changedSixteenPixelCount = 0
  let framePixelCount = 0
  let meanDelta = 0
  let warmGainPixelCount = 0

  for (let index = 0; index < fields.frameMask.length; index += 1) {
    if ((fields.frameMask[index] ?? 0) <= 0) {
      continue
    }

    const dataIndex = index * 4
    const delta =
      Math.abs(
        (afterImageData.data[dataIndex] ?? 0) -
          (beforeImageData.data[dataIndex] ?? 0),
      ) +
      Math.abs(
        (afterImageData.data[dataIndex + 1] ?? 0) -
          (beforeImageData.data[dataIndex + 1] ?? 0),
      ) +
      Math.abs(
        (afterImageData.data[dataIndex + 2] ?? 0) -
          (beforeImageData.data[dataIndex + 2] ?? 0),
      )
    const beforeWarmth = (beforeImageData.data[dataIndex] ?? 0) -
      (beforeImageData.data[dataIndex + 2] ?? 0)
    const afterWarmth = (afterImageData.data[dataIndex] ?? 0) -
      (afterImageData.data[dataIndex + 2] ?? 0)

    framePixelCount += 1
    meanDelta += delta

    if (delta >= 8) {
      changedEightPixelCount += 1
    }

    if (delta >= 16) {
      changedSixteenPixelCount += 1
    }

    if (
      afterWarmth - beforeWarmth >= 6 &&
      (afterImageData.data[dataIndex] ?? 0) >
        (afterImageData.data[dataIndex + 2] ?? 0)
    ) {
      warmGainPixelCount += 1
    }
  }

  return {
    changedEightShare: changedEightPixelCount / Math.max(1, framePixelCount),
    changedSixteenShare:
      changedSixteenPixelCount / Math.max(1, framePixelCount),
    meanDelta: meanDelta / Math.max(1, framePixelCount),
    warmGainShare: warmGainPixelCount / Math.max(1, framePixelCount),
  }
}

function getCorrosionSeedActivation(
  maps: ArtworkFrameCorrosionDerivedMaps,
  index: number,
) {
  return Math.max(0, 1 - (maps.metalExposure[index] ?? 1)) +
    (maps.ambientOcclusion[index] ?? 0) * 0.7 +
    (maps.poreMask[index] ?? 0) * 0.45
}

function getCorrosionFeatureActivation(
  maps: ArtworkFrameCorrosionDerivedMaps,
  index: number,
) {
  return getCorrosionSeedActivation(maps, index) +
    Math.max(0, (maps.height[index] ?? 0.5) - 0.5) * 1.2
}

function summarizeVisibleWarmSeedPixels(
  fields: ArtworkFrameCorrosionScalarFields,
  maps: ArtworkFrameCorrosionDerivedMaps,
  baseImageData: ImageData,
  shadedImageData: ImageData,
) {
  let framePixelCount = 0
  let maxWarmShift = 0
  let seedPixelCount = 0
  let seedWarmShiftSum = 0
  let visibleWarmPixelCount = 0

  for (let index = 0; index < maps.widthPixels * maps.heightPixels; index += 1) {
    if ((fields.frameMask[index] ?? 0) <= 0) {
      continue
    }

    framePixelCount += 1

    if (getCorrosionSeedActivation(maps, index) <= 0.035) {
      continue
    }

    const dataIndex = index * 4
    const baseWarmth = (baseImageData.data[dataIndex] ?? 0) -
      (baseImageData.data[dataIndex + 2] ?? 0)
    const shadedWarmth = (shadedImageData.data[dataIndex] ?? 0) -
      (shadedImageData.data[dataIndex + 2] ?? 0)
    const warmShift = shadedWarmth - baseWarmth

    seedPixelCount += 1
    seedWarmShiftSum += warmShift
    maxWarmShift = Math.max(maxWarmShift, warmShift)

    if (
      warmShift >= 8 &&
      (shadedImageData.data[dataIndex] ?? 0) >
        (shadedImageData.data[dataIndex + 2] ?? 0)
    ) {
      visibleWarmPixelCount += 1
    }
  }

  return {
    maxWarmShift,
    meanSeedWarmShift: seedWarmShiftSum / Math.max(1, seedPixelCount),
    seedShare: seedPixelCount / Math.max(1, framePixelCount),
    visibleSeedShare: visibleWarmPixelCount / Math.max(1, seedPixelCount),
    visibleWarmShare: visibleWarmPixelCount / Math.max(1, framePixelCount),
  }
}

function getLargestConnectedActivation(
  activations: Float32Array,
  width: number,
  height: number,
  threshold: number,
) {
  const seen = new Uint8Array(activations.length)
  let largest = 0

  for (let start = 0; start < activations.length; start += 1) {
    if (seen[start] || (activations[start] ?? 0) <= threshold) {
      continue
    }

    const stack = [start]
    let count = 0

    seen[start] = 1

    while (stack.length > 0) {
      const current = stack.pop()!
      const x = current % width
      const y = Math.floor(current / width)
      const neighbors = [
        x > 0 ? current - 1 : -1,
        x < width - 1 ? current + 1 : -1,
        y > 0 ? current - width : -1,
        y < height - 1 ? current + width : -1,
      ]

      count += 1

      for (const next of neighbors) {
        if (
          next >= 0 &&
          !seen[next] &&
          (activations[next] ?? 0) > threshold
        ) {
          seen[next] = 1
          stack.push(next)
        }
      }
    }

    largest = Math.max(largest, count)
  }

  return largest
}

function summarizeCorrosionFeaturePopulation(
  fields: ArtworkFrameCorrosionScalarFields,
  maps: ArtworkFrameCorrosionDerivedMaps,
) {
  const activations = new Float32Array(maps.widthPixels * maps.heightPixels)
  let framePixelCount = 0
  let activePixelCount = 0
  let ambientOcclusionSum = 0
  let heightLiftSum = 0
  let metalExposureSum = 0
  let roughnessSum = 0
  let max = 0
  const threshold = 0.04

  for (let index = 0; index < activations.length; index += 1) {
    if ((fields.frameMask[index] ?? 0) <= 0) {
      continue
    }

    const activation = getCorrosionFeatureActivation(maps, index)

    activations[index] = activation
    framePixelCount += 1
    max = Math.max(max, activation)

    if (activation > threshold) {
      activePixelCount += 1
    }

    ambientOcclusionSum += maps.ambientOcclusion[index] ?? 0
    heightLiftSum += Math.max(0, (maps.height[index] ?? 0.5) - 0.5)
    metalExposureSum += maps.metalExposure[index] ?? 0
    roughnessSum += maps.roughness[index] ?? 0
  }

  return {
    activeShare: activePixelCount / Math.max(1, framePixelCount),
    ambientOcclusionMean: ambientOcclusionSum / Math.max(1, framePixelCount),
    heightLiftMean: heightLiftSum / Math.max(1, framePixelCount),
    largestComponent: getLargestConnectedActivation(
      activations,
      maps.widthPixels,
      maps.heightPixels,
      threshold,
    ),
    max,
    metalExposureMean: metalExposureSum / Math.max(1, framePixelCount),
    roughnessMean: roughnessSum / Math.max(1, framePixelCount),
  }
}

function summarizeCorrosionHandoffPersistence(
  fields: ArtworkFrameCorrosionScalarFields,
  fromMaps: ArtworkFrameCorrosionDerivedMaps,
  toMaps: ArtworkFrameCorrosionDerivedMaps,
) {
  let activeStartPixelCount = 0
  let keptPixelCount = 0
  let nonDegradedPixelCount = 0
  let severeRegressionPixelCount = 0
  let startActivationSum = 0
  let endActivationSum = 0
  const threshold = 0.04

  for (
    let index = 0;
    index < fromMaps.widthPixels * fromMaps.heightPixels;
    index += 1
  ) {
    if ((fields.frameMask[index] ?? 0) <= 0) {
      continue
    }

    const startActivation = getCorrosionFeatureActivation(fromMaps, index)

    if (startActivation <= threshold) {
      continue
    }

    const endActivation = getCorrosionFeatureActivation(toMaps, index)

    activeStartPixelCount += 1
    startActivationSum += startActivation
    endActivationSum += endActivation

    if (endActivation > threshold) {
      keptPixelCount += 1
    }

    if (endActivation >= startActivation * 0.92) {
      nonDegradedPixelCount += 1
    }

    if (endActivation < startActivation * 0.55) {
      severeRegressionPixelCount += 1
    }
  }

  return {
    activeStartPixelCount,
    keptShare: keptPixelCount / Math.max(1, activeStartPixelCount),
    meanEndActivation:
      endActivationSum / Math.max(1, activeStartPixelCount),
    meanStartActivation:
      startActivationSum / Math.max(1, activeStartPixelCount),
    nonDegradedShare:
      nonDegradedPixelCount / Math.max(1, activeStartPixelCount),
    severeRegressionShare:
      severeRegressionPixelCount / Math.max(1, activeStartPixelCount),
  }
}

function getCorrosionRustBlend(maps: ArtworkFrameCorrosionDerivedMaps, index: number) {
  return Math.min(
    0.94,
    Math.max(
      0,
      (1 - (maps.metalExposure[index] ?? 1)) * 0.82 +
        (maps.ambientOcclusion[index] ?? 0) * 0.08 +
        (maps.poreMask[index] ?? 0) * 0.05,
    ),
  )
}

function summarizePatchBasinCoupling(
  fields: ArtworkFrameCorrosionScalarFields,
  maps: ArtworkFrameCorrosionDerivedMaps,
) {
  let heightPixelCount = 0
  let coupledHeightPixelCount = 0
  let patchPixelCount = 0
  let pinholePixelCount = 0
  let pinholeMetalExposureSum = 0
  let nonPinholeMetalExposureSum = 0
  let nonPinholePatchPixelCount = 0

  for (let index = 0; index < maps.widthPixels * maps.heightPixels; index += 1) {
    if ((fields.frameMask[index] ?? 0) <= 0) {
      continue
    }

    const heightLift = Math.max(0, (maps.height[index] ?? 0.5) - 0.5)
    const ambientOcclusion = maps.ambientOcclusion[index] ?? 0
    const rustBlend = getCorrosionRustBlend(maps, index)
    const metalExposure = maps.metalExposure[index] ?? 0
    const isHeightPatch = heightLift > 0.03 && metalExposure < 0.84
    const isPatchPixel = heightLift > 0.02 && rustBlend > 0.1

    if (isHeightPatch) {
      heightPixelCount += 1

      if (ambientOcclusion > 0.02 && rustBlend > 0.12) {
        coupledHeightPixelCount += 1
      }
    }

    if (isPatchPixel) {
      patchPixelCount += 1

      if (metalExposure > 0.72) {
        pinholePixelCount += 1
        pinholeMetalExposureSum += metalExposure
      } else {
        nonPinholePatchPixelCount += 1
        nonPinholeMetalExposureSum += metalExposure
      }
    }
  }

  return {
    coupledHeightShare:
      coupledHeightPixelCount / Math.max(1, heightPixelCount),
    nonPinholeMetalExposureMean:
      nonPinholeMetalExposureSum / Math.max(1, nonPinholePatchPixelCount),
    patchPixelCount,
    pinholeMetalExposureMean:
      pinholeMetalExposureSum / Math.max(1, pinholePixelCount),
    pinholeShare: pinholePixelCount / Math.max(1, patchPixelCount),
  }
}

function summarizeScaleSurface(
  fields: ArtworkFrameCorrosionScalarFields,
  maps: ArtworkFrameCorrosionDerivedMaps,
) {
  let framePixelCount = 0
  let ambientOcclusionSum = 0
  let albedoLuminanceSum = 0
  let crackSum = 0
  let flakeSum = 0
  let heightLiftSum = 0
  let highMetalPixelCount = 0
  let highMetalRoughnessSum = 0
  let lowMetalPixelCount = 0
  let lowMetalRoughnessSum = 0
  let metalExposureSum = 0
  let poreSum = 0
  let roughnessSum = 0

  for (let index = 0; index < maps.widthPixels * maps.heightPixels; index += 1) {
    if ((fields.frameMask[index] ?? 0) <= 0) {
      continue
    }

    const rgbIndex = index * 3
    const metalExposure = maps.metalExposure[index] ?? 0
    const roughness = maps.roughness[index] ?? 0

    framePixelCount += 1
    ambientOcclusionSum += maps.ambientOcclusion[index] ?? 0
    albedoLuminanceSum +=
      (maps.albedo[rgbIndex] ?? 0) * 0.2126 +
      (maps.albedo[rgbIndex + 1] ?? 0) * 0.7152 +
      (maps.albedo[rgbIndex + 2] ?? 0) * 0.0722
    crackSum += maps.crackMask[index] ?? 0
    flakeSum += maps.flakeMask[index] ?? 0
    heightLiftSum += Math.max(0, (maps.height[index] ?? 0.5) - 0.5)
    metalExposureSum += metalExposure
    poreSum += maps.poreMask[index] ?? 0
    roughnessSum += roughness

    if (metalExposure > 0.72) {
      highMetalPixelCount += 1
      highMetalRoughnessSum += roughness
    } else if (metalExposure < 0.35) {
      lowMetalPixelCount += 1
      lowMetalRoughnessSum += roughness
    }
  }

  return {
    albedoLuminanceMean:
      albedoLuminanceSum / Math.max(1, framePixelCount),
    ambientOcclusionMean:
      ambientOcclusionSum / Math.max(1, framePixelCount),
    crackMean: crackSum / Math.max(1, framePixelCount),
    flakeMean: flakeSum / Math.max(1, framePixelCount),
    heightLiftMean: heightLiftSum / Math.max(1, framePixelCount),
    highMetalRoughnessMean:
      highMetalRoughnessSum / Math.max(1, highMetalPixelCount),
    highMetalShare: highMetalPixelCount / Math.max(1, framePixelCount),
    lowMetalRoughnessMean:
      lowMetalRoughnessSum / Math.max(1, lowMetalPixelCount),
    lowMetalShare: lowMetalPixelCount / Math.max(1, framePixelCount),
    metalExposureMean: metalExposureSum / Math.max(1, framePixelCount),
    poreMean: poreSum / Math.max(1, framePixelCount),
    roughnessMean: roughnessSum / Math.max(1, framePixelCount),
  }
}

function summarizeFlakeGeometry(
  fields: ArtworkFrameCorrosionScalarFields,
  maps: ArtworkFrameCorrosionDerivedMaps,
) {
  let flakeHeightPixelCount = 0
  let freshChipPixelCount = 0
  let framePixelCount = 0
  let maxCrack = 0
  let maxFlake = 0
  let maxFlakeMetalExposure = 0
  let undercutShadowPixelCount = 0

  for (let index = 0; index < maps.widthPixels * maps.heightPixels; index += 1) {
    if ((fields.frameMask[index] ?? 0) <= 0) {
      continue
    }

    const ambientOcclusion = maps.ambientOcclusion[index] ?? 0
    const crack = maps.crackMask[index] ?? 0
    const flake = maps.flakeMask[index] ?? 0
    const heightLift = Math.max(0, (maps.height[index] ?? 0.5) - 0.5)
    const metalExposure = maps.metalExposure[index] ?? 0

    framePixelCount += 1
    maxCrack = Math.max(maxCrack, crack)
    maxFlake = Math.max(maxFlake, flake)

    if (flake > 0.01) {
      maxFlakeMetalExposure = Math.max(maxFlakeMetalExposure, metalExposure)
    }

    if (flake > 0.035 && heightLift > 0.12) {
      flakeHeightPixelCount += 1
    }

    if (flake > 0.035 && ambientOcclusion > 0.12) {
      undercutShadowPixelCount += 1
    }

    if (metalExposure > 0.72 && (flake > 0.015 || crack > 0.06)) {
      freshChipPixelCount += 1
    }
  }

  return {
    flakeHeightShare: flakeHeightPixelCount / Math.max(1, framePixelCount),
    freshChipShare: freshChipPixelCount / Math.max(1, framePixelCount),
    maxCrack,
    maxFlake,
    maxFlakeMetalExposure,
    undercutShadowShare:
      undercutShadowPixelCount / Math.max(1, framePixelCount),
  }
}

function summarizeLiftedFlakeDerivedMaps(
  fields: ArtworkFrameCorrosionScalarFields,
  maps: ArtworkFrameCorrosionDerivedMaps,
) {
  let bodySum = 0
  let castShadowSum = 0
  let chipHeightSum = 0
  let chipPixelCount = 0
  let bodyAmbientOcclusionSum = 0
  let bodyCoreSum = 0
  let bodyHeightSum = 0
  let bodyLiftHeightSum = 0
  let curlMagnitudeSum = 0
  let framePixelCount = 0
  let lipAmbientOcclusionSum = 0
  let lipHeightSum = 0
  let lipLiftHeightSum = 0
  let liftHeightSum = 0
  let lipSum = 0
  let maxCurlMagnitude = 0
  let rootSum = 0
  let undercutAmbientOcclusionSum = 0
  let undercutHeightSum = 0
  let undercutSum = 0

  for (let index = 0; index < maps.widthPixels * maps.heightPixels; index += 1) {
    if ((fields.frameMask[index] ?? 0) <= 0) {
      continue
    }

    const ambientOcclusion = maps.ambientOcclusion[index] ?? 0
    const body = maps.flakeBodyMask[index] ?? 0
    const curlMagnitude = Math.hypot(
      maps.flakeCurlX[index] ?? 0,
      maps.flakeCurlY[index] ?? 0,
    )
    const height = maps.height[index] ?? 0.5
    const liftHeight = maps.flakeLiftHeight[index] ?? 0
    const lip = maps.flakeLipMask[index] ?? 0
    const metalExposure = maps.metalExposure[index] ?? 0
    const undercut = maps.flakeUndercutAO[index] ?? 0

    framePixelCount += 1
    bodySum += body
    castShadowSum += maps.flakeCastShadow[index] ?? 0
    curlMagnitudeSum += curlMagnitude
    liftHeightSum += liftHeight
    lipSum += lip
    maxCurlMagnitude = Math.max(maxCurlMagnitude, curlMagnitude)
    rootSum += maps.flakeRootMask[index] ?? 0
    undercutSum += undercut

    if (body > 0.02 && lip <= 0.02 && undercut <= 0.02) {
      bodyCoreSum += body
      bodyAmbientOcclusionSum += ambientOcclusion * body
      bodyHeightSum += height * body
      bodyLiftHeightSum += liftHeight * body
    }

    if (lip > 0.02) {
      lipAmbientOcclusionSum += ambientOcclusion * lip
      lipHeightSum += height * lip
      lipLiftHeightSum += liftHeight * lip
    }

    if (undercut > 0.02) {
      undercutAmbientOcclusionSum += ambientOcclusion * undercut
      undercutHeightSum += height * undercut
    }

    if (metalExposure > 0.72 && (maps.flakeMask[index] ?? 0) > 0.015) {
      chipHeightSum += height
      chipPixelCount += 1
    }
  }

  return {
    bodyAmbientOcclusionMean:
      bodyAmbientOcclusionSum / Math.max(1, bodyCoreSum),
    bodyHeightMean: bodyHeightSum / Math.max(1, bodyCoreSum),
    bodyLiftHeightMean: bodyLiftHeightSum / Math.max(1, bodyCoreSum),
    bodyMean: bodySum / Math.max(1, framePixelCount),
    castShadowMean: castShadowSum / Math.max(1, framePixelCount),
    chipHeightMean: chipHeightSum / Math.max(1, chipPixelCount),
    chipShare: chipPixelCount / Math.max(1, framePixelCount),
    curlMagnitudeMean: curlMagnitudeSum / Math.max(1, framePixelCount),
    liftHeightMean: liftHeightSum / Math.max(1, framePixelCount),
    lipAmbientOcclusionMean:
      lipAmbientOcclusionSum / Math.max(1, lipSum),
    lipHeightMean: lipHeightSum / Math.max(1, lipSum),
    lipLiftHeightMean: lipLiftHeightSum / Math.max(1, lipSum),
    lipMean: lipSum / Math.max(1, framePixelCount),
    maxCurlMagnitude,
    rootMean: rootSum / Math.max(1, framePixelCount),
    undercutAmbientOcclusionMean:
      undercutAmbientOcclusionSum / Math.max(1, undercutSum),
    undercutHeightMean: undercutHeightSum / Math.max(1, undercutSum),
    undercutMean: undercutSum / Math.max(1, framePixelCount),
  }
}

function assertLiftedFlakeHeightMapsClippedToFrame(
  fields: ArtworkFrameCorrosionScalarFields,
  maps: ArtworkFrameCorrosionDerivedMaps,
) {
  const pixelCount = maps.widthPixels * maps.heightPixels

  for (let index = 0; index < pixelCount; index += 1) {
    if ((fields.frameMask[index] ?? 0) > 0) {
      continue
    }

    assert.equal(maps.ambientOcclusion[index] ?? 0, 0)
    assert.equal(maps.flakeBodyMask[index] ?? 0, 0)
    assert.equal(maps.flakeCastShadow[index] ?? 0, 0)
    assert.equal(maps.flakeLiftHeight[index] ?? 0, 0)
    assert.equal(maps.flakeLipMask[index] ?? 0, 0)
    assert.equal(maps.flakeMask[index] ?? 0, 0)
    assert.equal(maps.flakeRootMask[index] ?? 0, 0)
    assert.equal(maps.flakeUndercutAO[index] ?? 0, 0)
    assert.equal(maps.height[index] ?? 0.5, 0.5)
    assert.equal(maps.normalX[index] ?? 0, 0)
    assert.equal(maps.normalY[index] ?? 0, 0)
    assert.equal(maps.normalZ[index] ?? 1, 1)
  }
}

function summarizeAdvancedScaleSurface(
  fields: ArtworkFrameCorrosionScalarFields,
  maps: ArtworkFrameCorrosionDerivedMaps,
) {
  let albedoLuminanceSum = 0
  let albedoLuminanceSquaredSum = 0
  let cavityPixelCount = 0
  let flakeReliefPixelCount = 0
  let framePixelCount = 0
  let matteRustPixelCount = 0
  let residualChipPixelCount = 0
  let rustPixelCount = 0

  for (let index = 0; index < maps.widthPixels * maps.heightPixels; index += 1) {
    if ((fields.frameMask[index] ?? 0) <= 0) {
      continue
    }

    const rgbIndex = index * 3
    const ambientOcclusion = maps.ambientOcclusion[index] ?? 0
    const crack = maps.crackMask[index] ?? 0
    const flake = maps.flakeMask[index] ?? 0
    const heightLift = Math.max(0, (maps.height[index] ?? 0.5) - 0.5)
    const metalExposure = maps.metalExposure[index] ?? 0
    const pore = maps.poreMask[index] ?? 0
    const roughness = maps.roughness[index] ?? 0
    const albedoLuminance =
      (maps.albedo[rgbIndex] ?? 0) * 0.2126 +
      (maps.albedo[rgbIndex + 1] ?? 0) * 0.7152 +
      (maps.albedo[rgbIndex + 2] ?? 0) * 0.0722

    framePixelCount += 1
    albedoLuminanceSum += albedoLuminance
    albedoLuminanceSquaredSum += albedoLuminance * albedoLuminance

    if (metalExposure < 0.35) {
      rustPixelCount += 1

      if (roughness > 0.92) {
        matteRustPixelCount += 1
      }
    }

    if (pore > 0.36 && ambientOcclusion > 0.28) {
      cavityPixelCount += 1
    }

    if (flake > 0.16 && heightLift > 0.18 && ambientOcclusion > 0.16) {
      flakeReliefPixelCount += 1
    }

    if (
      metalExposure > 0.58 &&
      metalExposure < 0.98 &&
      (pore > 0.12 || flake > 0.12 || crack > 0.08 || heightLift > 0.1)
    ) {
      residualChipPixelCount += 1
    }
  }

  const albedoLuminanceMean =
    albedoLuminanceSum / Math.max(1, framePixelCount)

  return {
    albedoLuminanceVariance:
      albedoLuminanceSquaredSum / Math.max(1, framePixelCount) -
      albedoLuminanceMean * albedoLuminanceMean,
    cavityShare: cavityPixelCount / Math.max(1, framePixelCount),
    flakeReliefShare: flakeReliefPixelCount / Math.max(1, framePixelCount),
    matteRustShare: matteRustPixelCount / Math.max(1, rustPixelCount),
    residualChipShare: residualChipPixelCount / Math.max(1, framePixelCount),
    rustShare: rustPixelCount / Math.max(1, framePixelCount),
  }
}

function summarizeSeedActivationByExposure(
  fields: ArtworkFrameCorrosionScalarFields,
  maps: ArtworkFrameCorrosionDerivedMaps,
) {
  const activations = new Float32Array(maps.widthPixels * maps.heightPixels)
  let framePixelCount = 0
  let activePixelCount = 0
  let highExposureSum = 0
  let highExposureCount = 0
  let lowExposureSum = 0
  let lowExposureCount = 0
  let seedRoughnessSum = 0
  let seedRoughnessCount = 0
  let quietRoughnessSum = 0
  let quietRoughnessCount = 0
  let seedMetalExposureSum = 0
  let quietMetalExposureSum = 0
  let max = 0
  const threshold = 0.035

  for (let index = 0; index < activations.length; index += 1) {
    if ((fields.frameMask[index] ?? 0) <= 0) {
      continue
    }

    const activation = getCorrosionSeedActivation(maps, index)
    const exposure = Math.max(
      fields.edgeExposure[index] ?? 0,
      fields.defectExposure[index] ?? 0,
      fields.cellularPitCenters[index] ?? 0,
    )

    activations[index] = activation
    framePixelCount += 1
    max = Math.max(max, activation)

    if (activation > threshold) {
      activePixelCount += 1
      seedRoughnessSum += maps.roughness[index] ?? 0
      seedMetalExposureSum += maps.metalExposure[index] ?? 0
      seedRoughnessCount += 1
    } else if (activation < 0.005) {
      quietRoughnessSum += maps.roughness[index] ?? 0
      quietMetalExposureSum += maps.metalExposure[index] ?? 0
      quietRoughnessCount += 1
    }

    if (exposure > 0.6) {
      highExposureSum += activation
      highExposureCount += 1
    } else if (exposure < 0.2) {
      lowExposureSum += activation
      lowExposureCount += 1
    }
  }

  return {
    activeShare: activePixelCount / Math.max(1, framePixelCount),
    quietMetalExposureMean: quietMetalExposureSum / Math.max(1, quietRoughnessCount),
    quietRoughnessMean: quietRoughnessSum / Math.max(1, quietRoughnessCount),
    highExposureMean: highExposureSum / Math.max(1, highExposureCount),
    largestComponent: getLargestConnectedActivation(
      activations,
      maps.widthPixels,
      maps.heightPixels,
      threshold,
    ),
    lowExposureMean: lowExposureSum / Math.max(1, lowExposureCount),
    max,
    seedMetalExposureMean: seedMetalExposureSum / Math.max(1, seedRoughnessCount),
    seedRoughnessMean: seedRoughnessSum / Math.max(1, seedRoughnessCount),
  }
}

type RecordedCanvasOperation = {
  args: unknown[]
  name: string
}

function createRecordingMaterialCanvas() {
  const operations: RecordedCanvasOperation[] = []
  let canvasElement: HTMLCanvasElement | null = null
  const record = (name: string, ...args: unknown[]) => {
    operations.push({ args, name })
  }
  const context = {
    filter: 'none',
    fillStyle: '#000000',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    lineCap: 'butt',
    lineJoin: 'miter',
    lineWidth: 1,
    strokeStyle: '#000000',
    clearRect: (...args: unknown[]) => record('clearRect', ...args),
    clip: (...args: unknown[]) => record('clip', ...args),
    createLinearGradient: (...args: unknown[]) => {
      record('createLinearGradient', ...args)
      return {
        addColorStop: (...stopArgs: unknown[]) => {
          record('addColorStop', ...stopArgs)
        },
      } as unknown as CanvasGradient
    },
    fill: (...args: unknown[]) => record('fill', ...args),
    fillRect: (...args: unknown[]) => record('fillRect', ...args),
    getImageData: (x: number, y: number, width: number, height: number) => {
      record('getImageData', x, y, width, height)
      return {
        colorSpace: 'srgb',
        data: new Uint8ClampedArray(width * height * 4),
        height,
        width,
      } as unknown as ImageData
    },
    putImageData: (...args: unknown[]) => record('putImageData', ...args),
    restore: () => record('restore'),
    save: () => record('save'),
    scale: (...args: unknown[]) => record('scale', ...args),
    stroke: (...args: unknown[]) => record('stroke', ...args),
    translate: (...args: unknown[]) => record('translate', ...args),
  } as unknown as CanvasRenderingContext2D
  const createCanvas = (width: number, height: number) => {
    canvasElement = {
      getContext: (contextId: string) =>
        contextId === '2d' ? context : null,
      height,
      width,
    } as unknown as HTMLCanvasElement

    return canvasElement
  }

  return {
    context,
    createCanvas,
    getCanvas: () => canvasElement,
    operations,
  }
}

function createMaterialTestImageData(width: number, height: number) {
  const data = new Uint8ClampedArray(width * height * 4)

  for (let index = 0; index < width * height; index += 1) {
    const x = index % width
    const y = Math.floor(index / width)
    const dataIndex = index * 4

    data[dataIndex] = 116 + Math.round((x / Math.max(1, width - 1)) * 42)
    data[dataIndex + 1] = 124 + Math.round((y / Math.max(1, height - 1)) * 34)
    data[dataIndex + 2] = 128 + Math.round(((x + y) /
      Math.max(1, width + height - 2)) * 24)
    data[dataIndex + 3] = 255
  }

  return {
    colorSpace: 'srgb',
    data,
    height,
    width,
  } as unknown as ImageData
}

function createDeterministicMaterialCanvas() {
  let canvasElement: HTMLCanvasElement | null = null
  let latestImageData: ImageData | null = null
  const context = {
    filter: 'none',
    fillStyle: '#000000',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    lineCap: 'butt',
    lineJoin: 'miter',
    lineWidth: 1,
    strokeStyle: '#000000',
    clearRect: () => {},
    clip: () => {},
    createLinearGradient: () => ({
      addColorStop: () => {},
    }) as unknown as CanvasGradient,
    fill: () => {},
    fillRect: () => {},
    getImageData: (_x: number, _y: number, width: number, height: number) => {
      if (
        latestImageData &&
        latestImageData.width === width &&
        latestImageData.height === height
      ) {
        return cloneImageData(latestImageData)
      }

      return createMaterialTestImageData(width, height)
    },
    putImageData: (imageData: ImageData) => {
      latestImageData = cloneImageData(imageData)
    },
    restore: () => {},
    save: () => {},
    scale: () => {},
    stroke: () => {},
    translate: () => {},
  } as unknown as CanvasRenderingContext2D
  const createCanvas = (width: number, height: number) => {
    canvasElement = {
      getContext: (contextId: string) =>
        contextId === '2d' ? context : null,
      height,
      width,
    } as unknown as HTMLCanvasElement

    return canvasElement
  }

  return {
    createCanvas,
    getCanvas: () => canvasElement,
  }
}

type ShadedFrameSideRegionName = 'bottom' | 'left' | 'right' | 'top'

type ShadedFrameCornerRegionName =
  | 'bottomLeft'
  | 'bottomRight'
  | 'topLeft'
  | 'topRight'

type ShadedFrameRegionName =
  | 'all'
  | ShadedFrameCornerRegionName
  | ShadedFrameSideRegionName

type ShadedFrameRegionAverage = {
  count: number
  luminanceMean: number
}

type ShadedFrameRegionDiagnostics = {
  horizontalDelta: number
  maxDirectionalDelta: number
  regions: Record<ShadedFrameRegionName, ShadedFrameRegionAverage>
  topLeftBottomRightDelta: number
  topRightBottomLeftDelta: number
  verticalDelta: number
}

const SHADED_FRAME_REGION_NAMES: ShadedFrameRegionName[] = [
  'all',
  'left',
  'right',
  'top',
  'bottom',
  'topLeft',
  'topRight',
  'bottomLeft',
  'bottomRight',
]

function getShadedFrameSideRegionName({
  height,
  width,
  x,
  y,
}: {
  height: number
  width: number
  x: number
  y: number
}): ShadedFrameSideRegionName {
  const xUnit = ((x + 0.5) / Math.max(1, width)) * 2 - 1
  const yUnit = ((y + 0.5) / Math.max(1, height)) * 2 - 1

  if (Math.abs(xUnit) >= Math.abs(yUnit)) {
    return xUnit < 0 ? 'left' : 'right'
  }

  return yUnit < 0 ? 'top' : 'bottom'
}

function getShadedFrameCornerRegionName({
  height,
  width,
  x,
  y,
}: {
  height: number
  width: number
  x: number
  y: number
}): ShadedFrameCornerRegionName {
  const xUnit = ((x + 0.5) / Math.max(1, width)) * 2 - 1
  const yUnit = ((y + 0.5) / Math.max(1, height)) * 2 - 1

  if (yUnit < 0) {
    return xUnit < 0 ? 'topLeft' : 'topRight'
  }

  return xUnit < 0 ? 'bottomLeft' : 'bottomRight'
}

function summarizeShadedFrameRegions(rendered: {
  imageData: ImageData
  steelFinishMaps?: ArtworkFrameSteelFinishDerivedMaps | null
}): ShadedFrameRegionDiagnostics {
  assert.ok(rendered.steelFinishMaps)
  assert.equal(rendered.imageData.width, rendered.steelFinishMaps.widthPixels)
  assert.equal(rendered.imageData.height, rendered.steelFinishMaps.heightPixels)

  const regionSums = Object.fromEntries(
    SHADED_FRAME_REGION_NAMES.map((regionName) => [
      regionName,
      { count: 0, luminanceSum: 0 },
    ]),
  ) as Record<ShadedFrameRegionName, { count: number; luminanceSum: number }>
  const { imageData, steelFinishMaps } = rendered

  for (let y = 0; y < imageData.height; y += 1) {
    for (let x = 0; x < imageData.width; x += 1) {
      const index = y * imageData.width + x

      if (
        (steelFinishMaps.steelMetalness[index] ?? 0) <= 0 ||
        (imageData.data[index * 4 + 3] ?? 0) <= 0
      ) {
        continue
      }

      const sideRegionName = getShadedFrameSideRegionName({
        height: imageData.height,
        width: imageData.width,
        x,
        y,
      })
      const cornerRegionName = getShadedFrameCornerRegionName({
        height: imageData.height,
        width: imageData.width,
        x,
        y,
      })
      const luminance = getImageDataLuminance(imageData, index)

      regionSums.all.count += 1
      regionSums.all.luminanceSum += luminance
      regionSums[sideRegionName].count += 1
      regionSums[sideRegionName].luminanceSum += luminance
      regionSums[cornerRegionName].count += 1
      regionSums[cornerRegionName].luminanceSum += luminance
    }
  }

  const regions = Object.fromEntries(
    SHADED_FRAME_REGION_NAMES.map((regionName) => {
      const region = regionSums[regionName]

      return [
        regionName,
        {
          count: region.count,
          luminanceMean: region.luminanceSum / Math.max(1, region.count),
        },
      ]
    }),
  ) as Record<ShadedFrameRegionName, ShadedFrameRegionAverage>
  const horizontalDelta = Math.abs(
    regions.left.luminanceMean - regions.right.luminanceMean,
  )
  const verticalDelta = Math.abs(
    regions.top.luminanceMean - regions.bottom.luminanceMean,
  )
  const topLeftBottomRightDelta = Math.abs(
    regions.topLeft.luminanceMean - regions.bottomRight.luminanceMean,
  )
  const topRightBottomLeftDelta = Math.abs(
    regions.topRight.luminanceMean - regions.bottomLeft.luminanceMean,
  )

  return {
    horizontalDelta,
    maxDirectionalDelta: Math.max(
      horizontalDelta,
      topLeftBottomRightDelta,
      topRightBottomLeftDelta,
      verticalDelta,
    ),
    regions,
    topLeftBottomRightDelta,
    topRightBottomLeftDelta,
    verticalDelta,
  }
}

function renderFlatSteelShadingDiagnostic({
  lightPosition,
  polish = 50,
  tarnish = 0,
}: {
  lightPosition: { x: number; y: number }
  polish?: number
  tarnish?: number
}) {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'flat',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 0,
    metalBrushAngle: 0,
    metalPolish: polish,
    metalTarnish: tarnish,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 0, y: 0, width: 240, height: 160 }
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:shaded-frame-region-diagnostic',
    seed32: 0x51debeef,
  } as const
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const pathData = createMetalArtworkFramePathData(frame, bounds, stroke)
  const plan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    lightVector: createArtworkFrameMaterialHemisphereLightVector(lightPosition),
    materialSeed,
    pathData,
    strokeWidth: stroke,
  })

  assert.ok(plan.canvasTexture)

  const canvas = createDeterministicMaterialCanvas()
  const rendered = renderArtworkFrameCanvasMaterialTexture(plan.canvasTexture, {
    createCanvas: canvas.createCanvas,
    createPath: (path) => ({ path } as unknown as Path2D),
  })
  const diagnostics = summarizeShadedFrameRegions(rendered)

  return {
    diagnostics,
    rendered,
  }
}

function renderFlatSteelDisplayResolutionPreviewDiagnostic({
  polish,
  tarnish = 0,
}: {
  polish: number
  tarnish?: number
}) {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'flat',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 0,
    metalBrushAngle: 0,
    metalPolish: polish,
    metalTarnish: tarnish,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 0, y: 0, width: 100, height: 56.25 }
  const displaySize = { width: 640, height: 360 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const pathData = createMetalArtworkFramePathData(frame, bounds, stroke)
  const texturePixelRatio =
    resolveArtworkFrameCanvasMaterialPreviewTexturePixelRatio({
      devicePixelRatio: 1,
      displaySize,
      logicalSize: bounds,
      qualityMode: 'full',
    })
  const plan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    lightVector: createArtworkFrameMaterialHemisphereLightVector({
      x: -0.35,
      y: 0.28,
    }),
    materialSeed: {
      algorithm: 'sha256-image-v1',
      key: 'sha256-image-v1:stage-8-live-preview-no-dot-guard',
      seed32: 0x8d071e55,
    },
    pathData,
    strokeWidth: stroke,
    texturePixelRatio,
  })

  assert.ok(plan.canvasTexture)
  assert.equal(
    plan.canvasTexture.textureSize.scale > ARTWORK_FRAME_CANVAS_MATERIAL_PIXEL_RATIO,
    true,
  )

  const canvas = createDeterministicMaterialCanvas()
  const rendered = renderArtworkFrameCanvasMaterialTexture(plan.canvasTexture, {
    createCanvas: canvas.createCanvas,
    createPath: (path) => ({ path } as unknown as Path2D),
  })

  return {
    plan,
    rendered,
    texturePixelRatio,
  }
}

const MATERIAL_LIGHT_POSITION_REGRESSION_CASES = [
  { label: 'center', lightPosition: { x: 0, y: 0 } },
  { label: 'bottom-left', lightPosition: { x: -1, y: -1 } },
  { label: 'bottom-right', lightPosition: { x: 1, y: -1 } },
  { label: 'top-left', lightPosition: { x: -1, y: 1 } },
  { label: 'top-right', lightPosition: { x: 1, y: 1 } },
] as const

function createDeterministicOffscreenMaterialCanvasScope({
  throwAfterDetection = false,
}: {
  throwAfterDetection?: boolean
} = {}) {
  let canvasElement: OffscreenCanvas | null = null
  let latestImageData: ImageData | null = null
  const context = {
    filter: 'none',
    fillStyle: '#000000',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    lineCap: 'butt',
    lineJoin: 'miter',
    lineWidth: 1,
    strokeStyle: '#000000',
    clearRect: () => {},
    clip: () => {},
    createLinearGradient: () => ({
      addColorStop: () => {},
    }) as unknown as CanvasGradient,
    fill: () => {},
    fillRect: () => {},
    getImageData: (_x: number, _y: number, width: number, height: number) => {
      if (
        latestImageData &&
        latestImageData.width === width &&
        latestImageData.height === height
      ) {
        return cloneImageData(latestImageData)
      }

      return createMaterialTestImageData(width, height)
    },
    putImageData: (imageData: ImageData) => {
      latestImageData = cloneImageData(imageData)
    },
    restore: () => {},
    save: () => {},
    scale: () => {},
    stroke: () => {},
    translate: () => {},
  } as unknown as OffscreenCanvasRenderingContext2D
  class DeterministicOffscreenCanvas {
    readonly height: number
    readonly width: number

    constructor(width: number, height: number) {
      if (throwAfterDetection && (width !== 1 || height !== 1)) {
        throw new Error('OffscreenCanvas render allocation failed')
      }

      this.height = height
      this.width = width
      canvasElement = this as unknown as OffscreenCanvas
    }

    getContext(contextId: string) {
      return contextId === '2d' ? context : null
    }
  }

  return {
    getCanvas: () => canvasElement,
    scope: {
      OffscreenCanvas: DeterministicOffscreenCanvas,
    },
  }
}

function createWorkerShadingCapabilityScope() {
  return {
    ...createDeterministicOffscreenMaterialCanvasScope().scope,
    Worker: class MockWorkerCapability {},
  }
}

function createMockMaterialShadingWorkerFactory(
  capturedRequests: ArtworkFrameMaterialWorkerShadingRequest[] = [],
) {
  return () => {
    const worker: ArtworkFrameMaterialShadingWorkerLike = {
      onerror: null,
      onmessage: null,
      postMessage: (message) => {
        capturedRequests.push(message)
        queueMicrotask(() => {
          try {
            const imageData = shadeArtworkFrameCanvasMaterialImageData(message)

            worker.onmessage?.({
              data: {
                id: message.id,
                imageData,
              },
            })
          } catch (error) {
            worker.onmessage?.({
              data: {
                error: error instanceof Error ? error.message : String(error),
                id: message.id,
              },
            })
          }
        })
      },
      terminate: () => {},
    }

    return worker
  }
}

function getPointBounds(points: Array<{ x: number; y: number }>) {
  return {
    minX: Math.min(...points.map((point) => point.x)),
    maxX: Math.max(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)),
    maxY: Math.max(...points.map((point) => point.y)),
  }
}

function getTurnAngle(
  previous: { x: number; y: number },
  current: { x: number; y: number },
  next: { x: number; y: number },
) {
  const previousVector = {
    x: current.x - previous.x,
    y: current.y - previous.y,
  }
  const nextVector = {
    x: next.x - current.x,
    y: next.y - current.y,
  }
  const previousLength = Math.hypot(previousVector.x, previousVector.y)
  const nextLength = Math.hypot(nextVector.x, nextVector.y)

  if (previousLength === 0 || nextLength === 0) {
    return 0
  }

  const dot =
    (previousVector.x * nextVector.x + previousVector.y * nextVector.y) /
    (previousLength * nextLength)

  return Math.acos(Math.max(-1, Math.min(1, dot)))
}

function countSharpTurns(
  points: Array<{ x: number; y: number }>,
  thresholdRadians: number,
) {
  return points.reduce((count, point, index) => {
    const previous = points[(index - 1 + points.length) % points.length]
    const next = points[(index + 1) % points.length]

    return previous && next &&
        getTurnAngle(previous, point, next) > thresholdRadians
      ? count + 1
      : count
  }, 0)
}

function pointsAreNearlyEqual(
  left: { x: number; y: number },
  right: { x: number; y: number },
) {
  return Math.abs(left.x - right.x) < 0.000001 &&
    Math.abs(left.y - right.y) < 0.000001
}

function getCrossProduct(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
}

function hasProperSegmentIntersection(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
  d: { x: number; y: number },
) {
  if (
    pointsAreNearlyEqual(a, b) ||
    pointsAreNearlyEqual(c, d) ||
    pointsAreNearlyEqual(a, c) ||
    pointsAreNearlyEqual(a, d) ||
    pointsAreNearlyEqual(b, c) ||
    pointsAreNearlyEqual(b, d)
  ) {
    return false
  }

  const abToC = getCrossProduct(a, b, c)
  const abToD = getCrossProduct(a, b, d)
  const cdToA = getCrossProduct(c, d, a)
  const cdToB = getCrossProduct(c, d, b)

  return abToC * abToD < -0.000001 && cdToA * cdToB < -0.000001
}

function countProperSegmentIntersections(
  points: Array<{ x: number; y: number }>,
) {
  let intersections = 0

  for (let leftIndex = 0; leftIndex < points.length; leftIndex += 1) {
    const leftStart = points[leftIndex]!
    const leftEnd = points[(leftIndex + 1) % points.length]!

    for (
      let rightIndex = leftIndex + 1;
      rightIndex < points.length;
      rightIndex += 1
    ) {
      const isAdjacent =
        rightIndex === leftIndex ||
        rightIndex === (leftIndex + 1) % points.length ||
        leftIndex === (rightIndex + 1) % points.length ||
        (leftIndex === 0 && rightIndex === points.length - 1)

      if (isAdjacent) {
        continue
      }

      const rightStart = points[rightIndex]!
      const rightEnd = points[(rightIndex + 1) % points.length]!

      if (
        hasProperSegmentIntersection(
          leftStart,
          leftEnd,
          rightStart,
          rightEnd,
        )
      ) {
        intersections += 1
      }
    }
  }

  return intersections
}

test('rocky artwork frame geometry scales from the target bounds', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 6,
    shape: 'rectangle',
    style: 'rocky',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
  } as const
  const smallBounds = { x: 0, y: 0, width: 100, height: 56 }
  const largeBounds = { x: 0, y: 0, width: 180, height: 100 }
  const smallStroke = getArtworkFrameStrokeWidth(
    frame,
    smallBounds.width,
    smallBounds.height,
  )
  const largeStroke = getArtworkFrameStrokeWidth(
    frame,
    largeBounds.width,
    largeBounds.height,
  )
  const smallPath = createTexturedArtworkFramePathData(
    frame,
    smallBounds,
    smallStroke,
  )
  const largePath = createTexturedArtworkFramePathData(
    frame,
    largeBounds,
    largeStroke,
  )
  const smallValues = getPathNumbers(smallPath)
  const largeValues = getPathNumbers(largePath)
  const smallCirclePath = createTexturedArtworkFramePathData(
    { ...frame, shape: 'circle' },
    smallBounds,
    smallStroke,
  )
  const [rectangleOuter, rectangleInner] = splitPathPoints(smallPath)
  const [circleOuter, circleInner] = splitPathPoints(smallCirclePath)
  const rectangleOuterBounds = getPointBounds(rectangleOuter ?? [])
  const rectangleInnerBounds = getPointBounds(rectangleInner ?? [])
  const circleOuterBounds = getPointBounds(circleOuter ?? [])
  const circleInnerBounds = getPointBounds(circleInner ?? [])

  assert.equal(isTexturedArtworkFrame(frame), true)
  assert.match(getArtworkFrameTextureUrl(frame) ?? '', /rocky-frame-texture\.png/)
  assert.equal(smallStroke, 3.36)
  assert.equal(largeStroke, 6)
  assert.notEqual(smallPath, largePath)
  assert.equal(smallPath.match(/M/g)?.length, 2)
  assert.equal(Math.min(...smallValues) <= -smallStroke / 2, true)
  assert.equal(Math.max(...smallValues) >= smallBounds.width + smallStroke / 2, true)
  assert.equal(Math.min(...largeValues) <= -largeStroke / 2, true)
  assert.equal(Math.max(...largeValues) >= largeBounds.width + largeStroke / 2, true)
  assert.equal(rectangleOuterBounds.minX < 0, true)
  assert.equal(rectangleOuterBounds.maxX > smallBounds.width, true)
  assert.equal(rectangleOuterBounds.minY < 0, true)
  assert.equal(rectangleOuterBounds.maxY > smallBounds.height, true)
  assert.equal(rectangleInnerBounds.minX > 0, true)
  assert.equal(rectangleInnerBounds.maxX < smallBounds.width, true)
  assert.equal(rectangleInnerBounds.minY > 0, true)
  assert.equal(rectangleInnerBounds.maxY < smallBounds.height, true)
  assert.equal(smallCirclePath.match(/M/g)?.length, 2)
  assert.doesNotMatch(smallCirclePath, / A /)
  assert.equal(circleOuterBounds.minX < 0, true)
  assert.equal(circleOuterBounds.maxX > smallBounds.width, true)
  assert.equal(circleOuterBounds.minY < 0, true)
  assert.equal(circleOuterBounds.maxY > smallBounds.height, true)
  assert.equal(circleInnerBounds.minX > 0, true)
  assert.equal(circleInnerBounds.maxX < smallBounds.width, true)
  assert.equal(circleInnerBounds.minY > 0, true)
  assert.equal(circleInnerBounds.maxY < smallBounds.height, true)
  assert.equal(getArtworkFrameTexturePatternSize(smallBounds, smallStroke) >= 12, true)
})

test('rocky artwork frame controls affect procedural edge shape', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 6,
    shape: 'circle',
    style: 'rocky',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
  } as const
  const bounds = { x: 0, y: 0, width: 100, height: 56 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const smoothPath = createTexturedArtworkFramePathData(
    { ...frame, lumpiness: 0, jaggedness: 0 },
    bounds,
    stroke,
  )
  const lumpyPath = createTexturedArtworkFramePathData(
    { ...frame, lumpiness: 100, jaggedness: 0 },
    bounds,
    stroke,
  )
  const jaggedPath = createTexturedArtworkFramePathData(
    { ...frame, lumpiness: 0, jaggedness: 100 },
    bounds,
    stroke,
  )
  const shiftedPath = createTexturedArtworkFramePathData(
    { ...frame, roughnessOffset: 35 },
    bounds,
    stroke,
  )
  const [smoothOuter, smoothInner] = splitPathPoints(smoothPath)
  const [lumpyOuter, lumpyInner] = splitPathPoints(lumpyPath)
  const [jaggedOuter, jaggedInner] = splitPathPoints(jaggedPath)
  const [shiftedOuter, shiftedInner] = splitPathPoints(shiftedPath)
  const lumpyOuterBounds = getPointBounds(lumpyOuter ?? [])
  const lumpyInnerBounds = getPointBounds(lumpyInner ?? [])
  const jaggedOuterBounds = getPointBounds(jaggedOuter ?? [])
  const jaggedInnerBounds = getPointBounds(jaggedInner ?? [])
  const shiftedOuterBounds = getPointBounds(shiftedOuter ?? [])
  const shiftedInnerBounds = getPointBounds(shiftedInner ?? [])

  assert.notEqual(smoothPath, lumpyPath)
  assert.notEqual(smoothPath, jaggedPath)
  assert.notEqual(createTexturedArtworkFramePathData(frame, bounds, stroke), shiftedPath)
  assert.equal(jaggedOuter!.length > smoothOuter!.length, true)
  assert.equal(jaggedInner!.length > smoothInner!.length, true)
  assert.equal(lumpyOuterBounds.minX < 0, true)
  assert.equal(lumpyOuterBounds.maxX > bounds.width, true)
  assert.equal(lumpyInnerBounds.minX > 0, true)
  assert.equal(lumpyInnerBounds.maxX < bounds.width, true)
  assert.equal(jaggedOuterBounds.minY < 0, true)
  assert.equal(jaggedOuterBounds.maxY > bounds.height, true)
  assert.equal(jaggedInnerBounds.minY > 0, true)
  assert.equal(jaggedInnerBounds.maxY < bounds.height, true)
  assert.equal(shiftedOuterBounds.minX < 0, true)
  assert.equal(shiftedOuterBounds.maxX > bounds.width, true)
  assert.equal(shiftedInnerBounds.minX > 0, true)
  assert.equal(shiftedInnerBounds.maxX < bounds.width, true)
})

test('rocky rectangle frame corners do not close with diagonal inner triangles', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'rocky',
    lumpiness: 100,
    jaggedness: 100,
    roughnessOffset: 13,
  } as const
  const bounds = { x: 0, y: 0, width: 100, height: 56 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const path = createTexturedArtworkFramePathData(frame, bounds, stroke)
  const [, inner] = splitPathPoints(path)
  const firstInnerPoint = inner![0]!
  const lastInnerPoint = inner![inner!.length - 1]!

  assert.equal(path.match(/M/g)?.length, 2)
  assert.equal(
    Math.abs(firstInnerPoint.y - lastInnerPoint.y) < 0.01 ||
      Math.abs(firstInnerPoint.x - lastInnerPoint.x) < 0.01,
    true,
  )
})

test('rocky rectangle frame rough inner edges do not self-intersect', () => {
  const boundsCases = [
    { width: 100, height: 56 },
    { width: 100, height: 66.667 },
    { width: 100, height: 100 },
    { width: 100, height: 30 },
  ]
  const roughnessOffsets = [0, 5, 13, 21, 35, 75, 100]

  for (const bounds of boundsCases) {
    for (const roughnessOffset of roughnessOffsets) {
      const frame = {
        enabled: true,
        color: '#ffffff',
        width: 8,
        shape: 'rectangle',
        style: 'rocky',
        lumpiness: 100,
        jaggedness: 100,
        roughnessOffset,
      } as const
      const stroke = getArtworkFrameStrokeWidth(
        frame,
        bounds.width,
        bounds.height,
      )
      const [outer, inner] = splitPathPoints(
        createTexturedArtworkFramePathData(
          frame,
          { x: 0, y: 0, ...bounds },
          stroke,
        ),
      )
      const label =
        `${bounds.width}x${bounds.height} offset ${roughnessOffset}`

      assert.equal(countProperSegmentIntersections(outer ?? []), 0, label)
      assert.equal(countProperSegmentIntersections(inner ?? []), 0, label)
    }
  }
})

test('rocky lumpiness creates broad lobes while jaggedness creates sharp teeth', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'circle',
    style: 'rocky',
    lumpiness: 0,
    jaggedness: 0,
    roughnessOffset: 0,
  } as const
  const bounds = { x: 0, y: 0, width: 100, height: 56 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const lumpyPath = createTexturedArtworkFramePathData(
    { ...frame, lumpiness: 100 },
    bounds,
    stroke,
  )
  const jaggedPath = createTexturedArtworkFramePathData(
    { ...frame, jaggedness: 100 },
    bounds,
    stroke,
  )
  const [lumpyOuter] = splitPathPoints(lumpyPath)
  const [jaggedOuter] = splitPathPoints(jaggedPath)
  const lumpySharpTurns = countSharpTurns(lumpyOuter ?? [], 0.45)
  const jaggedSharpTurns = countSharpTurns(jaggedOuter ?? [], 0.45)

  assert.equal(lumpyOuter!.length < jaggedOuter!.length, true)
  assert.equal(jaggedSharpTurns >= lumpySharpTurns * 4, true)
})

test('traced image content shape paths scale to artwork bounds', () => {
  const path = createScaledImageContentShapePathData(
    {
      width: 4,
      height: 2,
      path: 'M0 0 L4 0 L3 2 L0 2 Z',
    },
    { x: 10, y: 20, width: 80, height: 40 },
  )

  assert.equal(path, 'M 10 20 L 90 20 L 70 60 L 10 60 Z')
})

test('metal artwork frame geometry scales from the target bounds', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 7,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'gold',
    metalProfile: 'double',
    metalPattern: 'rivets',
    metalDepth: 84,
    metalBevelWidth: 40,
    metalLightAngle: 225,
    metalPolish: 80,
    metalTarnish: 20,
    metalPatternScale: 120,
    metalPatternStrength: 70,
  } as const
  const smallBounds = { x: 0, y: 0, width: 100, height: 56 }
  const largeBounds = { x: 0, y: 0, width: 180, height: 100 }
  const smallStroke = getArtworkFrameStrokeWidth(
    frame,
    smallBounds.width,
    smallBounds.height,
  )
  const largeStroke = getArtworkFrameStrokeWidth(
    frame,
    largeBounds.width,
    largeBounds.height,
  )
  const smallPath = createMetalArtworkFramePathData(
    frame,
    smallBounds,
    smallStroke,
  )
  const largePath = createMetalArtworkFramePathData(
    frame,
    largeBounds,
    largeStroke,
  )
  const smallValues = getPathNumbers(smallPath)
  const largeValues = getPathNumbers(largePath)
  const circlePath = createMetalArtworkFramePathData(
    { ...frame, shape: 'circle' },
    smallBounds,
    smallStroke,
  )
  assert.equal(isMetalArtworkFrame(frame), true)
  assert.equal(isTexturedArtworkFrame(frame), false)
  assert.equal(getArtworkFrameTextureUrl(frame), null)
  assert.equal(smallStroke, 3.9200000000000004)
  assert.equal(Math.abs(largeStroke - 7) < 0.000001, true)
  assert.notEqual(smallPath, largePath)
  assert.equal(smallPath.match(/M/g)?.length, 2)
  assert.equal(circlePath.match(/ A /g)?.length, 4)
  assert.equal(Math.min(...smallValues) < 0, true)
  assert.equal(Math.max(...smallValues) > smallBounds.width, true)
  assert.equal(Math.min(...largeValues) < 0, true)
  assert.equal(Math.max(...largeValues) > largeBounds.width, true)
})

test('metal material plans expose canvas texture descriptors without deleted vector material fields', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'brushed',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 58,
    metalTarnish: 24,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 0, y: 0, width: 240, height: 160 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const pathData = createMetalArtworkFramePathData(frame, bounds, stroke)
  const textureBounds = resolveArtworkFrameCanvasMaterialTextureBounds(
    bounds,
    'fill',
    stroke,
  )
  const plan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    pathData,
    strokeWidth: stroke,
  })
  const cappedTextureSize = resolveArtworkFrameCanvasMaterialTextureSize({
    width: 4096,
    height: 1024,
  })

  assert.equal(plan.backend, 'canvas-texture')
  assert.equal(
    canUseCanvasArtworkFrameMaterialTexture({ clipPathData: pathData, frame }),
    true,
  )
  assert.equal(
    canUseCanvasArtworkFrameMaterialTexture({ clipPathData: null, frame }),
    false,
  )
  assert.ok(plan.canvasTexture)
  assert.equal(plan.canvasTexture.materialSeed, null)
  assert.equal(plan.canvasTexture.corrosionFieldRequest?.materialSeed, null)
  assert.deepEqual(plan.canvasTexture.bounds, textureBounds)
  assert.equal(plan.canvasTexture.bounds.x < bounds.x, true)
  assert.equal(plan.canvasTexture.bounds.y < bounds.y, true)
  assert.equal(
    plan.canvasTexture.bounds.width > bounds.width,
    true,
  )
  assert.equal(
    plan.canvasTexture.bounds.height > bounds.height,
    true,
  )
  assert.equal(
    plan.canvasTexture.textureSize.width,
    Math.round(textureBounds.width * plan.canvasTexture.textureSize.scale),
  )
  assert.equal(
    plan.canvasTexture.textureSize.height,
    Math.round(textureBounds.height * plan.canvasTexture.textureSize.scale),
  )
  assert.equal(
    getPathExtents(pathData).minX >= plan.canvasTexture.bounds.x,
    true,
  )
  assert.equal(
    getPathExtents(pathData).maxX <=
      plan.canvasTexture.bounds.x + plan.canvasTexture.bounds.width,
    true,
  )
  assert.equal(
    cappedTextureSize.width,
    ARTWORK_FRAME_CANVAS_MATERIAL_MAX_TEXTURE_DIMENSION,
  )
  assert.equal(cappedTextureSize.height < cappedTextureSize.width, true)
  assert.equal(
    'surfaceLayers' in plan.canvasTexture,
    false,
  )
  assert.equal(
    getArtworkFrameCanvasMaterialTextureKey(plan.canvasTexture),
    getArtworkFrameCanvasMaterialTextureKey(plan.canvasTexture),
  )
})

test('metal material plans reveal normalized preview viewBox undersampling', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'flat',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 0,
    metalPolish: 50,
    metalTarnish: 0,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const normalizedPreviewBounds = {
    x: 0,
    y: 0,
    width: 100,
    height: 56.25,
  }
  const stroke = getArtworkFrameStrokeWidth(
    frame,
    normalizedPreviewBounds.width,
    normalizedPreviewBounds.height,
  )
  const pathData = createMetalArtworkFramePathData(
    frame,
    normalizedPreviewBounds,
    stroke,
  )
  const plan = buildMetalArtworkFrameMaterialPlan({
    bounds: normalizedPreviewBounds,
    clipPathData: pathData,
    frame,
    pathData,
    strokeWidth: stroke,
  })

  assert.ok(plan.canvasTexture)
  assert.equal(plan.canvasTexture.textureSize.scale, 2)
  assert.equal(
    plan.canvasTexture.textureSize.width <= 240,
    true,
  )
  assert.equal(
    plan.canvasTexture.textureSize.height <= 160,
    true,
  )
})

test('metal material preview texture sizing helper requests display resolution without rerolling geometry', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'flat',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 18,
    metalPolish: 50,
    metalTarnish: 35,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:stage-8-live-preview-sizing',
    seed32: 0x518e0008,
  } as const
  const lightVector = createArtworkFrameMaterialHemisphereLightVector({
    x: -0.35,
    y: 0.28,
  })
  const normalizedPreviewBounds = {
    x: 0,
    y: 0,
    width: 100,
    height: 56.25,
  }
  const displayPixelWidth = 860
  const displayPixelHeight = 484
  const stroke = getArtworkFrameStrokeWidth(
    frame,
    normalizedPreviewBounds.width,
    normalizedPreviewBounds.height,
  )
  const pathData = createMetalArtworkFramePathData(
    frame,
    normalizedPreviewBounds,
    stroke,
  )
  const basePlan = buildMetalArtworkFrameMaterialPlan({
    bounds: normalizedPreviewBounds,
    clipPathData: pathData,
    frame,
    lightVector,
    materialSeed,
    pathData,
    strokeWidth: stroke,
  })
  const displayTexturePixelRatio =
    resolveArtworkFrameCanvasMaterialPreviewTexturePixelRatio({
      devicePixelRatio: 1,
      displaySize: {
        width: displayPixelWidth,
        height: displayPixelHeight,
      },
      logicalSize: normalizedPreviewBounds,
      qualityMode: 'full',
    })
  const smallDisplayTexturePixelRatio =
    resolveArtworkFrameCanvasMaterialPreviewTexturePixelRatio({
      devicePixelRatio: 1,
      displaySize: {
        width: 64,
        height: 36,
      },
      logicalSize: normalizedPreviewBounds,
      qualityMode: 'full',
    })
  const repeatedDisplayTexturePixelRatio =
    resolveArtworkFrameCanvasMaterialPreviewTexturePixelRatio({
      devicePixelRatio: 1,
      displaySize: {
        width: displayPixelWidth,
        height: displayPixelHeight,
      },
      logicalSize: normalizedPreviewBounds,
      qualityMode: 'full',
    })
  const interactionDisplayTexturePixelRatio =
    resolveArtworkFrameCanvasMaterialPreviewTexturePixelRatio({
      devicePixelRatio: 1,
      displaySize: {
        width: displayPixelWidth,
        height: displayPixelHeight,
      },
      logicalSize: normalizedPreviewBounds,
      qualityMode: 'interaction-preview',
    })
  const displayTextureSize = resolveArtworkFrameCanvasMaterialTextureSize(
    basePlan.canvasTexture?.bounds ?? normalizedPreviewBounds,
    ARTWORK_FRAME_CANVAS_MATERIAL_MAX_TEXTURE_DIMENSION,
    displayTexturePixelRatio,
  )
  const smallDisplayTextureSize = resolveArtworkFrameCanvasMaterialTextureSize(
    basePlan.canvasTexture?.bounds ?? normalizedPreviewBounds,
    ARTWORK_FRAME_CANVAS_MATERIAL_MAX_TEXTURE_DIMENSION,
    smallDisplayTexturePixelRatio,
  )
  const interactionDisplayTextureSize =
    resolveArtworkFrameCanvasMaterialTextureSize(
      basePlan.canvasTexture?.bounds ?? normalizedPreviewBounds,
      ARTWORK_FRAME_CANVAS_MATERIAL_INTERACTION_MAX_TEXTURE_DIMENSION,
      interactionDisplayTexturePixelRatio,
    )
  const repeatedPlan = buildMetalArtworkFrameMaterialPlan({
    bounds: normalizedPreviewBounds,
    clipPathData: pathData,
    frame,
    lightVector,
    materialSeed,
    pathData,
    strokeWidth: stroke,
  })
  const displayResolutionPlan = buildMetalArtworkFrameMaterialPlan({
    bounds: normalizedPreviewBounds,
    clipPathData: pathData,
    frame,
    lightVector,
    materialSeed,
    pathData,
    strokeWidth: stroke,
    texturePixelRatio: displayTexturePixelRatio,
  })
  const dragPreviewPlan = buildMetalArtworkFrameMaterialPlan({
    bounds: normalizedPreviewBounds,
    clipPathData: pathData,
    frame,
    lightVector,
    materialSeed,
    pathData,
    qualityMode: 'interaction-preview',
    strokeWidth: stroke,
    texturePixelRatio: displayTexturePixelRatio,
  })

  assert.ok(basePlan.canvasTexture?.steelFinishFieldRequest)
  assert.ok(basePlan.canvasTexture.corrosionFieldRequest)
  assert.ok(repeatedPlan.canvasTexture?.steelFinishFieldRequest)
  assert.ok(repeatedPlan.canvasTexture.corrosionFieldRequest)
  assert.ok(displayResolutionPlan.canvasTexture?.steelFinishFieldRequest)
  assert.ok(displayResolutionPlan.canvasTexture.corrosionFieldRequest)
  assert.ok(dragPreviewPlan.canvasTexture?.steelFinishFieldRequest)
  assert.ok(dragPreviewPlan.canvasTexture.corrosionFieldRequest)
  assert.equal(basePlan.canvasTexture.materialSeed?.key, materialSeed.key)
  assert.equal(
    displayResolutionPlan.canvasTexture.materialSeed?.key,
    materialSeed.key,
  )
  assert.deepEqual(
    repeatedPlan.canvasTexture.lighting.lightVector,
    basePlan.canvasTexture.lighting.lightVector,
  )
  assert.deepEqual(
    displayResolutionPlan.canvasTexture.lighting.lightVector,
    basePlan.canvasTexture.lighting.lightVector,
  )
  assert.equal(
    repeatedPlan.canvasTexture.steelFinishFieldRequest.geometrySeedKey,
    basePlan.canvasTexture.steelFinishFieldRequest.geometrySeedKey,
  )
  assert.equal(
    displayResolutionPlan.canvasTexture.steelFinishFieldRequest.geometrySeedKey,
    basePlan.canvasTexture.steelFinishFieldRequest.geometrySeedKey,
  )
  assert.equal(
    repeatedPlan.canvasTexture.corrosionFieldRequest.geometrySeedKey,
    basePlan.canvasTexture.corrosionFieldRequest.geometrySeedKey,
  )
  assert.equal(
    displayResolutionPlan.canvasTexture.corrosionFieldRequest.geometrySeedKey,
    basePlan.canvasTexture.corrosionFieldRequest.geometrySeedKey,
  )
  assert.equal(
    repeatedPlan.canvasTexture.steelFinishFieldRequest.brushAngleDegrees,
    basePlan.canvasTexture.steelFinishFieldRequest.brushAngleDegrees,
  )
  assert.equal(
    displayResolutionPlan.canvasTexture.steelFinishFieldRequest
      .brushAngleDegrees,
    basePlan.canvasTexture.steelFinishFieldRequest.brushAngleDegrees,
  )
  assert.equal(
    Math.max(
      dragPreviewPlan.canvasTexture.textureSize.width,
      dragPreviewPlan.canvasTexture.textureSize.height,
    ) <= ARTWORK_FRAME_CANVAS_MATERIAL_INTERACTION_MAX_TEXTURE_DIMENSION,
    true,
  )
  assert.deepEqual(
    dragPreviewPlan.canvasTexture.textureSize,
    interactionDisplayTextureSize,
  )
  assert.equal(repeatedDisplayTexturePixelRatio, displayTexturePixelRatio)
  assert.equal(
    displayTextureSize.width >= displayPixelWidth,
    true,
  )
  assert.deepEqual(
    displayResolutionPlan.canvasTexture.textureSize,
    displayTextureSize,
  )
  assert.equal(
    displayResolutionPlan.canvasTexture.textureSize.width >
      basePlan.canvasTexture.textureSize.width * 3,
    true,
  )
  assert.equal(
    smallDisplayTexturePixelRatio,
    ARTWORK_FRAME_CANVAS_MATERIAL_PIXEL_RATIO,
  )
  assert.deepEqual(
    smallDisplayTextureSize,
    basePlan.canvasTexture.textureSize,
  )
  assert.notEqual(
    getArtworkFrameCanvasMaterialTextureKey(displayResolutionPlan.canvasTexture),
    getArtworkFrameCanvasMaterialTextureKey(basePlan.canvasTexture),
  )
})

test('metal canvas material descriptors can carry optional material seeds', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 58,
    metalTarnish: 24,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 0, y: 0, width: 240, height: 160 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const pathData = createMetalArtworkFramePathData(frame, bounds, stroke)
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:abc123',
    seed32: 0x1234abcd,
  } as const
  const unseededPlan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    pathData,
    strokeWidth: stroke,
  })
  const seededPlan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    materialSeed,
    pathData,
    strokeWidth: stroke,
  })

  assert.ok(unseededPlan.canvasTexture)
  assert.ok(seededPlan.canvasTexture)
  assert.equal(unseededPlan.canvasTexture.materialSeed, null)
  assert.deepEqual(seededPlan.canvasTexture.materialSeed, materialSeed)
  assert.equal(unseededPlan.canvasTexture.corrosionFieldRequest?.materialSeed, null)
  assert.deepEqual(
    seededPlan.canvasTexture.corrosionFieldRequest?.materialSeed,
    materialSeed,
  )
  assert.notEqual(
    seededPlan.canvasTexture.corrosionFieldRequest?.geometrySeed,
    unseededPlan.canvasTexture.corrosionFieldRequest?.geometrySeed,
  )
  assert.notEqual(
    seededPlan.canvasTexture.corrosionFieldRequest?.geometrySeedKey,
    unseededPlan.canvasTexture.corrosionFieldRequest?.geometrySeedKey,
  )
  assert.equal(
    seededPlan.canvasTexture.corrosionFieldRequest?.geometrySeedKey.includes(
      materialSeed.key,
    ),
    true,
  )
  assert.notEqual(
    getArtworkFrameCanvasMaterialTextureKey(seededPlan.canvasTexture),
    getArtworkFrameCanvasMaterialTextureKey(unseededPlan.canvasTexture),
  )
})

test('metal canvas material descriptors carry matching default light vectors', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 58,
    metalTarnish: 24,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 0, y: 0, width: 240, height: 160 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const pathData = createMetalArtworkFramePathData(frame, bounds, stroke)
  const previewPlan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    pathData,
    strokeWidth: stroke,
  })
  const exportPlan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    pathData,
    strokeWidth: stroke,
  })

  assert.ok(previewPlan.canvasTexture)
  assert.ok(exportPlan.canvasTexture)

  const lightVector = previewPlan.canvasTexture.lighting.lightVector
  const expectedLightVector = ARTWORK_FRAME_MATERIAL_OVERHEAD_LIGHT_VECTOR
  const expectedEditorPosition =
    getArtworkFrameMaterialHemisphereLightEditorPosition(expectedLightVector)

  assert.deepEqual(lightVector, expectedLightVector)
  assert.equal(expectedLightVector.z, 1)
  assert.deepEqual(expectedEditorPosition, { x: 0, y: 0 })
  assert.equal(
    Math.abs(
      Math.hypot(
        lightVector?.x ?? 0,
        lightVector?.y ?? 0,
        lightVector?.z ?? 0,
      ) - 1,
    ) < 0.000001,
    true,
  )
  assert.deepEqual(
    previewPlan.canvasTexture.lighting,
    exportPlan.canvasTexture.lighting,
  )
  assert.equal(
    getArtworkFrameCanvasMaterialTextureKey(previewPlan.canvasTexture).includes(
      getArtworkFrameMaterialLightVectorKey(lightVector),
    ),
    true,
  )
})

test('metal canvas material descriptors can share transient explicit light vectors', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'flat',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 58,
    metalTarnish: 24,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 0, y: 0, width: 240, height: 160 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const pathData = createMetalArtworkFramePathData(frame, bounds, stroke)
  const explicitLightVector = createArtworkFrameMaterialHemisphereLightVector({
    x: 0.35,
    y: 0.2,
  })
  const previewPlan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    lightVector: explicitLightVector,
    pathData,
    strokeWidth: stroke,
  })
  const exportPlan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    lightVector: explicitLightVector,
    pathData,
    strokeWidth: stroke,
  })

  assert.ok(previewPlan.canvasTexture)
  assert.ok(exportPlan.canvasTexture)
  assert.notDeepEqual(
    previewPlan.canvasTexture.lighting.lightVector,
    ARTWORK_FRAME_MATERIAL_OVERHEAD_LIGHT_VECTOR,
  )
  assert.deepEqual(
    previewPlan.canvasTexture.lighting.lightVector,
    explicitLightVector,
  )
  assert.deepEqual(
    previewPlan.canvasTexture.lighting,
    exportPlan.canvasTexture.lighting,
  )
})

test('hemisphere light helper maps center halfway and edge positions', () => {
  const center = createArtworkFrameMaterialHemisphereLightVector({ x: 0, y: 0 })
  const halfway = createArtworkFrameMaterialHemisphereLightVector({
    x: 0.5,
    y: 0,
  })
  const edge = createArtworkFrameMaterialHemisphereLightVector({ x: 1, y: 0 })

  assertVectorNear(center, { x: 0, y: 0, z: 1 })
  assertVectorNear(halfway, {
    x: Math.SQRT1_2,
    y: 0,
    z: Math.SQRT1_2,
  })
  assertVectorNear(edge, { x: 1, y: 0, z: 0 })
  assertUnitVector(center)
  assertUnitVector(halfway)
  assertUnitVector(edge)
})

test('hemisphere light helper clamps outside positions and preserves direction', () => {
  const right = createArtworkFrameMaterialHemisphereLightVector({ x: 2, y: 0 })
  const down = createArtworkFrameMaterialHemisphereLightVector({ x: 0, y: -3 })
  const diagonal = createArtworkFrameMaterialHemisphereLightVector({
    x: 2,
    y: 2,
  })

  assertVectorNear(right, { x: 1, y: 0, z: 0 })
  assertVectorNear(down, { x: 0, y: -1, z: 0 })
  assertVectorNear(diagonal, {
    x: Math.SQRT1_2,
    y: Math.SQRT1_2,
    z: 0,
  })
  assertUnitVector(right)
  assertUnitVector(down)
  assertUnitVector(diagonal)
})

test('hemisphere light helper preserves angle quadrants and supports inverse mapping', () => {
  const up = createArtworkFrameMaterialHemisphereLightVector({ x: 0, y: 1 })
  const left = createArtworkFrameMaterialHemisphereLightVector({ x: -1, y: 0 })
  const down = createArtworkFrameMaterialHemisphereLightVector({ x: 0, y: -1 })
  const quadrant = createArtworkFrameMaterialHemisphereLightVector({
    x: -0.5,
    y: 0.5,
  })

  assertVectorNear(up, { x: 0, y: 1, z: 0 })
  assertVectorNear(left, { x: -1, y: 0, z: 0 })
  assertVectorNear(down, { x: 0, y: -1, z: 0 })
  assert.equal(quadrant.x < 0, true)
  assert.equal(quadrant.y > 0, true)
  assert.equal(quadrant.z > 0, true)
  assertUnitVector(quadrant)
  assertEditorPositionNear(
    getArtworkFrameMaterialHemisphereLightEditorPosition({ x: 0, y: 0, z: 1 }),
    { x: 0, y: 0 },
  )
  assertEditorPositionNear(
    getArtworkFrameMaterialHemisphereLightEditorPosition(quadrant),
    { x: -0.5, y: 0.5 },
  )
  assertEditorPositionNear(
    getArtworkFrameMaterialHemisphereLightEditorPosition(
      createArtworkFrameMaterialHemisphereLightVector({ x: 2, y: 0 }),
    ),
    { x: 1, y: 0 },
  )
})

test('artwork frame light editor eligibility requires an enabled canvas metal frame', () => {
  const frame = {
    enabled: true,
    style: 'metal',
  } as const
  const clipPathData = 'M 0 0 L 10 0 L 10 10 L 0 10 Z'

  assert.equal(
    isSelectedArtworkFrameCanvasLitMaterial({ clipPathData, frame }),
    true,
  )
  assert.equal(
    isSelectedArtworkFrameCanvasLitMaterial({
      clipPathData,
      frame: { ...frame, enabled: false },
    }),
    false,
  )
  assert.equal(
    isSelectedArtworkFrameCanvasLitMaterial({
      clipPathData,
      frame: { ...frame, style: 'rocky' },
    }),
    false,
  )
  assert.equal(
    isSelectedArtworkFrameCanvasLitMaterial({
      clipPathData: null,
      frame,
    }),
    false,
  )
  assert.equal(
    isSelectedArtworkFrameCanvasLitMaterial({
      clipPathData,
      frame: null,
    }),
    false,
  )
})

test('artwork frame light editor converts pointer positions to normalized sun positions', () => {
  const bounds = { x: 10, y: 20, width: 200, height: 100 }

  assertEditorPositionNear(
    getArtworkFrameMaterialLightEditorSunPositionFromPointer({
      bounds,
      pointer: { x: 110, y: 70 },
    }),
    { x: 0, y: 0 },
  )
  assertEditorPositionNear(
    getArtworkFrameMaterialLightEditorSunPositionFromPointer({
      bounds,
      pointer: { x: 160, y: 70 },
    }),
    { x: 1, y: 0 },
  )
  assertEditorPositionNear(
    getArtworkFrameMaterialLightEditorSunPositionFromPointer({
      bounds,
      pointer: { x: 110, y: 45 },
    }),
    { x: 0, y: 0.5 },
  )
  assertEditorPositionNear(
    getArtworkFrameMaterialLightEditorSunPositionFromPointer({
      bounds,
      pointer: { x: 185, y: -5 },
    }),
    { x: Math.SQRT1_2, y: Math.SQRT1_2 },
  )
})

test('artwork frame light editor converts normalized sun positions to local points', () => {
  const bounds = { x: 10, y: 20, width: 200, height: 100 }

  assertEditorPositionNear(
    getArtworkFrameMaterialLightEditorSunPoint({
      bounds,
      sunPosition: { x: 0, y: 0 },
    }),
    { x: 110, y: 70 },
  )
  assertEditorPositionNear(
    getArtworkFrameMaterialLightEditorSunPoint({
      bounds,
      sunPosition: { x: 1, y: 0 },
    }),
    { x: 160, y: 70 },
  )
  assertEditorPositionNear(
    getArtworkFrameMaterialLightEditorSunPoint({
      bounds,
      sunPosition: { x: 0, y: 0.5 },
    }),
    { x: 110, y: 45 },
  )
  assertEditorPositionNear(
    getArtworkFrameMaterialLightEditorSunPoint({
      bounds,
      sunPosition: { x: 2, y: 0 },
    }),
    { x: 160, y: 70 },
  )
})

test('artwork frame light editor pillar shadow marks the handle-side shadow', () => {
  const overhead = getArtworkFrameMaterialLightEditorPillarShadow({
    x: 0,
    y: 0,
  })
  const cases = [
    {
      label: 'bottom-left handle',
      sunPosition: { x: -1, y: -1 },
      expectedDirection: { x: -Math.SQRT1_2, y: -Math.SQRT1_2 },
    },
    {
      label: 'bottom-right handle',
      sunPosition: { x: 1, y: -1 },
      expectedDirection: { x: Math.SQRT1_2, y: -Math.SQRT1_2 },
    },
    {
      label: 'top-left handle',
      sunPosition: { x: -1, y: 1 },
      expectedDirection: { x: -Math.SQRT1_2, y: Math.SQRT1_2 },
    },
    {
      label: 'top-right handle',
      sunPosition: { x: 1, y: 1 },
      expectedDirection: { x: Math.SQRT1_2, y: Math.SQRT1_2 },
    },
  ] as const

  assert.equal(overhead.visible, false)
  assert.equal(overhead.opacity, 0)
  for (const { expectedDirection, label, sunPosition } of cases) {
    const shadow = getArtworkFrameMaterialLightEditorPillarShadow(sunPosition)

    assert.equal(shadow.visible, true, `${label} should show a shadow`)
    assertEditorPositionNear(
      {
        x: shadow.directionX,
        y: shadow.directionY,
      },
      expectedDirection,
    )
    assert.equal(shadow.length > 0.8, true)
    assert.equal(shadow.opacity > 0.5, true)
  }
})

test('artwork frame light editor pillar shadow scales with sun distance', () => {
  const softShadow = getArtworkFrameMaterialLightEditorPillarShadow({
    x: 0.25,
    y: 0,
  })
  const edgeShadow = getArtworkFrameMaterialLightEditorPillarShadow({
    x: 1,
    y: 0,
  })

  assert.equal(softShadow.visible, true)
  assert.equal(edgeShadow.visible, true)
  assert.equal(edgeShadow.strength > softShadow.strength, true)
  assert.equal(edgeShadow.length > softShadow.length, true)
  assert.equal(edgeShadow.opacity > softShadow.opacity, true)
  assertEditorPositionNear(
    { x: softShadow.directionX, y: softShadow.directionY },
    { x: 1, y: 0 },
  )
})

test('artwork frame light editor clamps sun positions and returns light vectors', () => {
  const bounds = { x: 10, y: 20, width: 200, height: 100 }
  const center = getArtworkFrameMaterialLightEditorStateFromPointer({
    bounds,
    pointer: { x: 110, y: 70 },
  })
  const halfwayUp = getArtworkFrameMaterialLightEditorStateFromPointer({
    bounds,
    pointer: { x: 110, y: 45 },
  })
  const clamped = getArtworkFrameMaterialLightEditorStateFromSunPosition({
    x: 3,
    y: 4,
  })

  assertEditorPositionNear(center.sunPosition, { x: 0, y: 0 })
  assertVectorNear(center.lightVector, { x: 0, y: 0, z: 1 })
  assertEditorPositionNear(halfwayUp.sunPosition, { x: 0, y: 0.5 })
  assertVectorNear(halfwayUp.lightVector, {
    x: 0,
    y: Math.SQRT1_2,
    z: Math.SQRT1_2,
  })
  assertEditorPositionNear(
    clampArtworkFrameMaterialLightEditorSunPosition({ x: 3, y: 4 }),
    { x: 0.6, y: 0.8 },
  )
  assertEditorPositionNear(clamped.sunPosition, { x: 0.6, y: 0.8 })
  assertUnitVector(clamped.lightVector)
})

test('artwork frame light editor reset returns overhead light state', () => {
  const reset = resetArtworkFrameMaterialLightEditorToOverhead()

  assert.deepEqual(
    ARTWORK_FRAME_MATERIAL_OVERHEAD_SUN_POSITION,
    { x: 0, y: 0 },
  )
  assertEditorPositionNear(reset.sunPosition, { x: 0, y: 0 })
  assertVectorNear(reset.lightVector, { x: 0, y: 0, z: 1 })
})

function createLightEditorTestFrame(overrides = {}) {
  return {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'flat',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 58,
    metalTarnish: 24,
    metalPatternScale: 50,
    metalPatternStrength: 50,
    ...overrides,
  }
}

function createLightEditorTestSlot(overrides = {}) {
  return {
    id: 'slot-a',
    label: 'Slot A',
    enabled: true,
    imageDataUrl: 'data:image/png;base64,a',
    imageSize: { width: 64, height: 64 },
    defaultSteamLogo: null,
    fit: 'contain',
    layout: {
      alignX: 'center',
      alignY: 'center',
      scale: 1,
      x: 50,
      y: 50,
    },
    frame: createLightEditorTestFrame(),
    ...overrides,
  }
}

test('disc artwork frame light editor target appears only for selected canvas-lit artwork', () => {
  const element = {
    id: 'hero',
    label: 'Hero art',
    source: 'custom',
    sourceId: null,
    sourceLabel: 'Hero',
    imageDataUrl: 'data:image/png;base64,a',
    imageSize: { width: 64, height: 64 },
    layout: {
      enabled: true,
      scale: 1,
      x: 50,
      y: 50,
    },
    frame: createLightEditorTestFrame(),
  }
  const projectAdditionalArtwork = {
    enabled: true,
    elements: [element],
  }
  const selectedElement = {
    id: 'disc:additional-artwork:hero',
    kind: 'artwork',
    label: 'Hero additional artwork',
  }

  assert.deepEqual(
    getDiscArtworkFrameMaterialLightEditorTarget(
      projectAdditionalArtwork,
      selectedElement,
    ),
    {
      editableId: selectedElement.id,
      frame: element.frame,
      label: element.label,
    },
  )
  assert.equal(
    getDiscArtworkFrameMaterialLightEditorTarget(
      { ...projectAdditionalArtwork, enabled: false },
      selectedElement,
    ),
    null,
  )
  assert.equal(
    getDiscArtworkFrameMaterialLightEditorTarget(
      projectAdditionalArtwork,
      { ...selectedElement, kind: 'logo' },
    ),
    null,
  )
  assert.equal(
    getDiscArtworkFrameMaterialLightEditorTarget(
      {
        ...projectAdditionalArtwork,
        elements: [{
          ...element,
          frame: createLightEditorTestFrame({ style: 'solid' }),
        }],
      },
      selectedElement,
    ),
    null,
  )
  assert.equal(
    getDiscArtworkFrameMaterialLightEditorTarget(
      {
        ...projectAdditionalArtwork,
        elements: [{ ...element, imageDataUrl: null }],
      },
      selectedElement,
    ),
    null,
  )
})

test('case artwork frame light editor target resolves template and spine canvas-lit frames', () => {
  const coverSlot = createLightEditorTestSlot({
    id: 'cover-art',
    label: 'Cover art',
  })
  const spineSlot = createLightEditorTestSlot({
    id: 'spine-art',
    label: 'Spine art',
  })
  const caseInsert = {
    templates: {
      cover: {
        artworkSlots: [coverSlot],
      },
      tray: {
        artworkSlots: [],
      },
    },
    spine: {
      left: {
        additionalArtworkEnabled: true,
        artworkSlots: [spineSlot],
      },
      right: {
        additionalArtworkEnabled: false,
        artworkSlots: [createLightEditorTestSlot({
          id: 'disabled-spine-art',
          label: 'Disabled spine art',
        })],
      },
    },
  }

  assert.deepEqual(
    getCaseInsertArtworkFrameMaterialLightEditorTarget(
      caseInsert,
      'cover',
      {
        id: 'case:cover:artworkSlots:cover-art',
        kind: 'artwork',
        label: 'Cover art',
      },
    ),
    {
      editableId: 'case:cover:artworkSlots:cover-art',
      frame: coverSlot.frame,
      label: coverSlot.label,
    },
  )
  assert.deepEqual(
    getCaseInsertArtworkFrameMaterialLightEditorTarget(
      caseInsert,
      'cover',
      {
        id: 'case:spine:left:artworkSlots:spine-art',
        kind: 'artwork',
        label: 'Spine art',
      },
    ),
    {
      editableId: 'case:spine:left:artworkSlots:spine-art',
      frame: spineSlot.frame,
      label: spineSlot.label,
    },
  )
  assert.equal(
    getCaseInsertArtworkFrameMaterialLightEditorTarget(
      caseInsert,
      'tray',
      {
        id: 'case:cover:artworkSlots:cover-art',
        kind: 'artwork',
        label: 'Cover art',
      },
    ),
    null,
  )
  assert.equal(
    getCaseInsertArtworkFrameMaterialLightEditorTarget(
      caseInsert,
      'cover',
      {
        id: 'case:spine:right:artworkSlots:disabled-spine-art',
        kind: 'artwork',
        label: 'Disabled spine art',
      },
    ),
    null,
  )
})

test('canvas material descriptors use the overhead light vector by default', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 58,
    metalTarnish: 24,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 0, y: 0, width: 96, height: 64 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const pathData = createMetalArtworkFramePathData(frame, bounds, stroke)
  const plan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    pathData,
    strokeWidth: stroke,
  })

  assert.ok(plan.canvasTexture)

  const descriptor = plan.canvasTexture
  const recordingCanvas = createRecordingMaterialCanvas()
  const rendered = renderArtworkFrameCanvasMaterialTexture(descriptor, {
    createCanvas: recordingCanvas.createCanvas,
    createPath: (path) => ({ path } as unknown as Path2D),
  })

  assert.equal('lightSource' in descriptor.lighting, false)
  assert.equal('metalLightAngle' in descriptor.lighting, false)
  assert.deepEqual(
    descriptor.lighting.lightVector,
    ARTWORK_FRAME_MATERIAL_OVERHEAD_LIGHT_VECTOR,
  )
  assert.equal(
    getArtworkFrameCanvasMaterialTextureKey(descriptor).includes(
      getArtworkFrameMaterialLightVectorKey(
        ARTWORK_FRAME_MATERIAL_OVERHEAD_LIGHT_VECTOR,
      ),
    ),
    true,
  )
  assert.equal(rendered.descriptor, descriptor)
  assert.equal(rendered.width, descriptor.textureSize.width)
  assert.equal(rendered.height, descriptor.textureSize.height)
})

test('material light vectors are excluded from steel and corrosion geometry seeds', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 58,
    metalTarnish: 84,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 0, y: 0, width: 240, height: 160 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const pathData = createMetalArtworkFramePathData(frame, bounds, stroke)
  const build = (lightVector?: { x: number; y: number; z: number }) =>
    buildMetalArtworkFrameMaterialPlan({
      bounds,
      clipPathData: pathData,
      frame,
      lightVector,
      pathData,
      strokeWidth: stroke,
    })
  const baseline = build()
  const movedLight = build(createArtworkFrameMaterialHemisphereLightVector({
    x: -0.35,
    y: 0.62,
  }))

  assert.ok(baseline.canvasTexture?.steelFinishFieldRequest)
  assert.ok(movedLight.canvasTexture?.steelFinishFieldRequest)
  assert.ok(baseline.canvasTexture.corrosionFieldRequest)
  assert.ok(movedLight.canvasTexture.corrosionFieldRequest)
  assert.notDeepEqual(
    baseline.canvasTexture.lighting.lightVector,
    movedLight.canvasTexture.lighting.lightVector,
  )
  assert.equal(
    baseline.canvasTexture.steelFinishFieldRequest.geometrySeedKey,
    movedLight.canvasTexture.steelFinishFieldRequest.geometrySeedKey,
  )
  assert.equal(
    baseline.canvasTexture.corrosionFieldRequest.geometrySeedKey,
    movedLight.canvasTexture.corrosionFieldRequest.geometrySeedKey,
  )

  for (const geometrySeedKey of [
    baseline.canvasTexture.steelFinishFieldRequest.geometrySeedKey,
    baseline.canvasTexture.corrosionFieldRequest.geometrySeedKey,
  ]) {
    assert.equal(
      geometrySeedKey.includes(
        getArtworkFrameMaterialLightVectorKey(
          baseline.canvasTexture.lighting.lightVector,
        ),
      ),
      false,
    )
    assert.equal(
      geometrySeedKey.includes(
        getArtworkFrameMaterialLightVectorKey(
          movedLight.canvasTexture.lighting.lightVector,
        ),
      ),
      false,
    )
    assert.equal(geometrySeedKey.includes('angle-compat'), false)
    assert.equal(geometrySeedKey.includes('metalLightAngle'), false)
  }
})

test('canvas material final-pixel cache keys distinguish light vectors', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 58,
    metalTarnish: 84,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 0, y: 0, width: 240, height: 160 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const pathData = createMetalArtworkFramePathData(frame, bounds, stroke)
  const plan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    pathData,
    strokeWidth: stroke,
  })

  assert.ok(plan.canvasTexture)

  const baselineKey = getArtworkFrameCanvasMaterialTextureKey(plan.canvasTexture)
  const movedVector = createArtworkFrameMaterialHemisphereLightVector({
    x: -0.35,
    y: 0.62,
  })
  const changedVectorDescriptor = {
    ...plan.canvasTexture,
    lighting: {
      ...plan.canvasTexture.lighting,
      lightVector: movedVector,
    },
  }

  assert.equal(
    changedVectorDescriptor.steelFinishFieldRequest?.geometrySeedKey,
    plan.canvasTexture.steelFinishFieldRequest?.geometrySeedKey,
  )
  assert.equal(
    changedVectorDescriptor.corrosionFieldRequest?.geometrySeedKey,
    plan.canvasTexture.corrosionFieldRequest?.geometrySeedKey,
  )
  assert.notEqual(
    getArtworkFrameCanvasMaterialTextureKey(changedVectorDescriptor),
    baselineKey,
  )
  assert.notEqual(
    getArtworkFrameCanvasMaterialShadedPixelsCacheKey(
      changedVectorDescriptor,
    ),
    getArtworkFrameCanvasMaterialShadedPixelsCacheKey(plan.canvasTexture),
  )
})

test('preview and export canvas material shading contexts match equivalent descriptors', async () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'flat',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 0,
    metalBrushAngle: 18,
    metalPolish: 50,
    metalTarnish: 80,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 8, y: 12, width: 220, height: 148 }
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:shading-coordinate-context',
    seed32: 0x31ade711,
  } as const
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const pathData = createMetalArtworkFramePathData(frame, bounds, stroke)
  const previewPlan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    materialSeed,
    pathData,
    strokeWidth: stroke,
  })
  const exportPlan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    materialSeed,
    pathData,
    strokeWidth: stroke,
  })

  assert.ok(previewPlan.canvasTexture)
  assert.ok(exportPlan.canvasTexture)
  assert.deepEqual(previewPlan.canvasTexture, exportPlan.canvasTexture)

  const previewContext = createArtworkFrameMaterialShadingCoordinateContext(
    previewPlan.canvasTexture,
  )
  const exportContext = createArtworkFrameMaterialShadingCoordinateContext(
    exportPlan.canvasTexture,
  )

  assert.deepEqual(previewContext, exportContext)
  assert.deepEqual(previewContext.frameBounds, bounds)
  assert.deepEqual(
    previewContext.samplingBounds,
    previewPlan.canvasTexture.steelFinishFieldRequest?.samplingBounds,
  )
  assert.deepEqual(
    previewContext.textureBounds,
    previewPlan.canvasTexture.bounds,
  )
  assert.deepEqual(
    previewContext.textureSize,
    previewPlan.canvasTexture.textureSize,
  )
  assert.deepEqual(previewContext.frameCenter, {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  })
  assert.equal(previewContext.frameAspectRatio, bounds.width / bounds.height)

  const capturedPayloads:
    Parameters<typeof shadeArtworkFrameCanvasMaterialImageData>[0][] = []
  const renderWithCapturedPayload = async (
    texture: NonNullable<typeof previewPlan.canvasTexture>,
  ) => {
    const canvas = createDeterministicMaterialCanvas()

    return await renderArtworkFrameCanvasMaterialTextureAsync(
      texture,
      {
        createCanvas: canvas.createCanvas,
        createPath: (path) => ({ path } as unknown as Path2D),
      },
      (payload) => {
        capturedPayloads.push(payload)
        return shadeArtworkFrameCanvasMaterialImageData(payload)
      },
    )
  }

  await renderWithCapturedPayload(previewPlan.canvasTexture)
  await renderWithCapturedPayload(exportPlan.canvasTexture)

  assert.equal(capturedPayloads.length, 2)
  assert.deepEqual(capturedPayloads[0].coordinates, previewContext)
  assert.deepEqual(capturedPayloads[1].coordinates, exportContext)

  const workerRequest = createArtworkFrameMaterialWorkerShadingRequest(
    capturedPayloads[0],
    'coordinate-context-worker-clone',
  ).request

  assert.deepEqual(workerRequest.coordinates, capturedPayloads[0].coordinates)
  assert.notEqual(workerRequest.coordinates, capturedPayloads[0].coordinates)
  assert.notEqual(
    workerRequest.coordinates.frameBounds,
    capturedPayloads[0].coordinates.frameBounds,
  )
})

test('diagnostic flat steel overhead shading has low directional region bias', () => {
  const { diagnostics } = renderFlatSteelShadingDiagnostic({
    lightPosition: { x: 0, y: 0 },
  })

  for (const regionName of SHADED_FRAME_REGION_NAMES) {
    assert.equal(
      diagnostics.regions[regionName].count > 0,
      true,
      `${regionName} should have sampled frame pixels`,
    )
  }

  assert.equal(diagnostics.horizontalDelta < 8, true)
  assert.equal(diagnostics.verticalDelta < 8, true)
  assert.equal(
    diagnostics.maxDirectionalDelta <
      diagnostics.regions.all.luminanceMean * 0.09,
    true,
  )
})

test('diagnostic flat steel polish brightness anchors 50 percent as brushed baseline', () => {
  const luma = new Map<number, number>()

  for (const polish of [0, 10, 25, 30, 50, 75, 100]) {
    luma.set(
      polish,
      renderFlatSteelShadingDiagnostic({
        lightPosition: { x: 0, y: 0 },
        polish,
      }).diagnostics.regions.all.luminanceMean,
    )
  }

  const lowPolishRamp = [0, 10, 25, 30, 50]

  for (let index = 1; index < lowPolishRamp.length; index += 1) {
    const previous = lowPolishRamp[index - 1]!
    const current = lowPolishRamp[index]!

    assert.equal(
      luma.get(current)! > luma.get(previous)!,
      true,
      `Expected steel baseline luma to rise from ${previous}% (${luma.get(previous)}) to ${current}% (${luma.get(current)}).`,
    )
    assert.equal(
      luma.get(current)! - luma.get(previous)! < 34,
      true,
      `Expected steel baseline luma to avoid a phase jump from ${previous}% (${luma.get(previous)}) to ${current}% (${luma.get(current)}).`,
    )
  }

  assert.equal(
    luma.get(50)! > luma.get(0)! + 40,
    true,
    `Expected 50% brushed baseline (${luma.get(50)}) to be meaningfully lighter than 0% rough steel (${luma.get(0)}).`,
  )
  assert.equal(
    luma.get(75)! > luma.get(50)! + 4,
    true,
    `Expected 75% satin steel (${luma.get(75)}) to stay lighter than 50% brushed steel (${luma.get(50)}).`,
  )
  assert.equal(
    luma.get(100)! > luma.get(75)! + 12,
    true,
    `Expected 100% mirror polish (${luma.get(100)}) to stay much lighter than 75% satin steel (${luma.get(75)}).`,
  )
})

test('diagnostic flat steel corner light follows audited macro-light direction', () => {
  const cases: Array<{
    label: string
    lightPosition: { x: number; y: number }
    litRegion: ShadedFrameCornerRegionName
    shadowRegion: ShadedFrameCornerRegionName
  }> = [
    {
      label: 'bottom-left handle',
      lightPosition: { x: -1, y: -1 },
      litRegion: 'topRight',
      shadowRegion: 'bottomLeft',
    },
    {
      label: 'bottom-right handle',
      lightPosition: { x: 1, y: -1 },
      litRegion: 'topLeft',
      shadowRegion: 'bottomRight',
    },
    {
      label: 'top-left handle',
      lightPosition: { x: -1, y: 1 },
      litRegion: 'bottomRight',
      shadowRegion: 'topLeft',
    },
    {
      label: 'top-right handle',
      lightPosition: { x: 1, y: 1 },
      litRegion: 'bottomLeft',
      shadowRegion: 'topRight',
    },
  ]

  for (const {
    label,
    lightPosition,
    litRegion,
    shadowRegion,
  } of cases) {
    const { diagnostics } = renderFlatSteelShadingDiagnostic({
      lightPosition,
      polish: 50,
      tarnish: 0,
    })

    assert.equal(
      diagnostics.regions[litRegion].luminanceMean >
        diagnostics.regions[shadowRegion].luminanceMean,
      true,
      `${label} should brighten ${litRegion} more than ${shadowRegion}`,
    )
  }
})

test('diagnostic flat steel side light scales region bias across polish stages', () => {
  for (const polish of [0, 50, 75, 85, 100]) {
    const overhead = renderFlatSteelShadingDiagnostic({
      lightPosition: { x: 0, y: 0 },
      polish,
    }).diagnostics
    const angledRight = renderFlatSteelShadingDiagnostic({
      lightPosition: { x: 0.5, y: 0 },
      polish,
    }).diagnostics
    const grazingRight = renderFlatSteelShadingDiagnostic({
      lightPosition: { x: 1, y: 0 },
      polish,
    }).diagnostics

    assert.equal(
      grazingRight.regions.left.luminanceMean >
        grazingRight.regions.right.luminanceMean,
      true,
      `polish ${polish} should lift the side opposite the handle`,
    )
    assert.equal(
      angledRight.regions.left.luminanceMean >
        angledRight.regions.right.luminanceMean,
      true,
      `polish ${polish} should lift the 45-degree side opposite the handle`,
    )
    assert.equal(
      angledRight.regions.right.luminanceMean >
        grazingRight.regions.right.luminanceMean + 4,
      true,
      `polish ${polish} should deepen handle-side contact darkening at grazing`,
    )
    assert.equal(
      angledRight.horizontalDelta > (polish === 0 ? 8 : 5),
      true,
      `polish ${polish} should show 45-degree side bias`,
    )
    if (polish === 0) {
      assert.equal(
        angledRight.horizontalDelta > grazingRight.horizontalDelta + 2,
        true,
        'rough steel should trade grazing lift for stronger shadowing',
      )
    } else {
      assert.equal(
        grazingRight.horizontalDelta > angledRight.horizontalDelta + 1,
        true,
        `polish ${polish} should strengthen from 45-degree to grazing`,
      )
    }
    assert.equal(
      grazingRight.horizontalDelta >
        Math.max(grazingRight.verticalDelta * 1.15, polish === 0 ? 6 : 7),
      true,
      `polish ${polish} should be a directional side response`,
    )
    assert.equal(
      Math.max(
        angledRight.horizontalDelta,
        grazingRight.horizontalDelta,
      ) > overhead.maxDirectionalDelta + (polish === 100 ? 2 : 5),
      true,
      `polish ${polish} should not read as uniform full-surface darkening`,
    )
  }
})

test('diagnostic high-polish steel full-radius light creates broad corner bias without moving maps', () => {
  const diagonalHalfRadius = Math.SQRT1_2 * 0.5
  const cases: Array<{
    label: string
    fullRadiusPosition: { x: number; y: number }
    halfRadiusPosition: { x: number; y: number }
    litRegion: ShadedFrameCornerRegionName
    shadowRegion: ShadedFrameCornerRegionName
  }> = [
    {
      fullRadiusPosition: { x: -1, y: -1 },
      halfRadiusPosition: { x: -diagonalHalfRadius, y: -diagonalHalfRadius },
      label: 'bottom-left handle',
      litRegion: 'topRight',
      shadowRegion: 'bottomLeft',
    },
    {
      fullRadiusPosition: { x: 1, y: -1 },
      halfRadiusPosition: { x: diagonalHalfRadius, y: -diagonalHalfRadius },
      label: 'bottom-right handle',
      litRegion: 'topLeft',
      shadowRegion: 'bottomRight',
    },
    {
      fullRadiusPosition: { x: -1, y: 1 },
      halfRadiusPosition: { x: -diagonalHalfRadius, y: diagonalHalfRadius },
      label: 'top-left handle',
      litRegion: 'bottomRight',
      shadowRegion: 'topLeft',
    },
    {
      fullRadiusPosition: { x: 1, y: 1 },
      halfRadiusPosition: { x: diagonalHalfRadius, y: diagonalHalfRadius },
      label: 'top-right handle',
      litRegion: 'bottomLeft',
      shadowRegion: 'topRight',
    },
  ]

  for (const polish of [75, 85, 100]) {
    const overhead = renderFlatSteelShadingDiagnostic({
      lightPosition: { x: 0, y: 0 },
      polish,
      tarnish: 0,
    })

    assert.ok(overhead.rendered.steelFinishMaps)
    assert.ok(overhead.rendered.steelFinishNormalInputs)

    for (const {
      fullRadiusPosition,
      halfRadiusPosition,
      label,
      litRegion,
      shadowRegion,
    } of cases) {
      const angled = renderFlatSteelShadingDiagnostic({
        lightPosition: halfRadiusPosition,
        polish,
        tarnish: 0,
      })
      const grazing = renderFlatSteelShadingDiagnostic({
        lightPosition: fullRadiusPosition,
        polish,
        tarnish: 0,
      })

      assert.ok(angled.rendered.steelFinishMaps)
      assert.ok(grazing.rendered.steelFinishMaps)
      assert.ok(angled.rendered.steelFinishNormalInputs)
      assert.ok(grazing.rendered.steelFinishNormalInputs)
      assertSteelFinishDerivedMapsEqual(
        overhead.rendered.steelFinishMaps,
        angled.rendered.steelFinishMaps,
      )
      assertSteelFinishDerivedMapsEqual(
        overhead.rendered.steelFinishMaps,
        grazing.rendered.steelFinishMaps,
      )
      assertSteelFinishNormalInputsEqual(
        overhead.rendered.steelFinishNormalInputs,
        angled.rendered.steelFinishNormalInputs,
      )
      assertSteelFinishNormalInputsEqual(
        overhead.rendered.steelFinishNormalInputs,
        grazing.rendered.steelFinishNormalInputs,
      )

      const overheadDelta = Math.abs(
        overhead.diagnostics.regions[litRegion].luminanceMean -
          overhead.diagnostics.regions[shadowRegion].luminanceMean,
      )
      const angledDelta =
        angled.diagnostics.regions[litRegion].luminanceMean -
        angled.diagnostics.regions[shadowRegion].luminanceMean
      const grazingDelta =
        grazing.diagnostics.regions[litRegion].luminanceMean -
        grazing.diagnostics.regions[shadowRegion].luminanceMean

      assert.equal(
        angledDelta > 0,
        true,
        `${label} at ${polish}% polish should brighten ${litRegion} more than ${shadowRegion} at 45 degrees`,
      )
      assert.equal(
        grazingDelta > 0,
        true,
        `${label} at ${polish}% polish should brighten ${litRegion} more than ${shadowRegion} at full radius`,
      )
      assert.equal(
        angledDelta > overheadDelta + 0.5,
        true,
        `${label} at ${polish}% polish should produce more corner bias at 45 degrees than overhead; overhead ${overheadDelta}, angled ${angledDelta}`,
      )
      assert.equal(
        grazingDelta > angledDelta + 1,
        true,
        `${label} at ${polish}% polish should make grazing stronger than 45 degrees; angled ${angledDelta}, grazing ${grazingDelta}`,
      )
      assert.equal(
        countDifferentBytes(
          overhead.rendered.imageData.data,
          grazing.rendered.imageData.data,
        ) > 120,
        true,
        `${label} at ${polish}% polish should change final shaded pixels`,
      )
    }
  }
})

test('diagnostic tarnished steel side light creates broad corrosion response without moving maps', () => {
  const overhead = renderFlatSteelShadingDiagnostic({
    lightPosition: { x: 0, y: 0 },
    polish: 50,
    tarnish: 80,
  })
  const angledRight = renderFlatSteelShadingDiagnostic({
    lightPosition: { x: 0.5, y: 0 },
    polish: 50,
    tarnish: 80,
  })
  const grazingRight = renderFlatSteelShadingDiagnostic({
    lightPosition: { x: 1, y: 0 },
    polish: 50,
    tarnish: 80,
  })

  assert.ok(overhead.rendered.corrosionMaps)
  assert.ok(angledRight.rendered.corrosionMaps)
  assert.ok(grazingRight.rendered.corrosionMaps)
  assertCorrosionDerivedMapsEqual(
    overhead.rendered.corrosionMaps,
    angledRight.rendered.corrosionMaps,
  )
  assertCorrosionDerivedMapsEqual(
    overhead.rendered.corrosionMaps,
    grazingRight.rendered.corrosionMaps,
  )
  assert.equal(
    countDifferentBytes(
      overhead.rendered.imageData.data,
      angledRight.rendered.imageData.data,
    ) > 1000,
    true,
  )
  assert.equal(
    countDifferentBytes(
      angledRight.rendered.imageData.data,
      grazingRight.rendered.imageData.data,
    ) > 1000,
    true,
  )
  assert.equal(
    angledRight.diagnostics.regions.left.luminanceMean >
      angledRight.diagnostics.regions.right.luminanceMean,
    true,
    '45-degree tarnished steel should lift the side opposite the handle',
  )
  assert.equal(
    grazingRight.diagnostics.regions.left.luminanceMean >
      grazingRight.diagnostics.regions.right.luminanceMean,
    true,
    'grazing tarnished steel should lift the side opposite the handle',
  )
  assert.equal(
    grazingRight.diagnostics.horizontalDelta >
      overhead.diagnostics.maxDirectionalDelta + 5,
    true,
    'tarnished steel should show broader side bias under grazing light',
  )
  assert.equal(
    grazingRight.diagnostics.horizontalDelta >
      grazingRight.diagnostics.verticalDelta * 1.15,
    true,
    'tarnished steel side light should be directional rather than uniform',
  )
  assert.equal(
    angledRight.diagnostics.regions.right.luminanceMean >
      grazingRight.diagnostics.regions.right.luminanceMean + 4,
    true,
    'grazing tarnished steel should deepen handle-side corrosion darkening',
  )
})

test('canvas material phase cache keys keep light out of geometry and map caches', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'flat',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 0,
    metalBrushAngle: 18,
    metalPolish: 58,
    metalTarnish: 80,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 4, y: 6, width: 240, height: 160 }
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:phase-cache-light-separation',
    seed32: 0x471bc0de,
  } as const
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const pathData = createMetalArtworkFramePathData(frame, bounds, stroke)
  const plan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    materialSeed,
    pathData,
    strokeWidth: stroke,
  })

  assert.ok(plan.canvasTexture?.steelFinishFieldRequest)
  assert.ok(plan.canvasTexture.corrosionFieldRequest)

  const movedLightVector = createArtworkFrameMaterialHemisphereLightVector({
    x: -0.35,
    y: 0.62,
  })
  const movedLightDescriptor = {
    ...plan.canvasTexture,
    lighting: {
      ...plan.canvasTexture.lighting,
      lightVector: movedLightVector,
      metalLightAngle: 135,
    },
  }

  assert.ok(movedLightDescriptor.steelFinishFieldRequest)
  assert.ok(movedLightDescriptor.corrosionFieldRequest)

  const baselineSteelGeometryKey =
    getArtworkFrameCanvasMaterialSteelFinishGeometryCacheKey(
      plan.canvasTexture.steelFinishFieldRequest,
    )
  const baselineSteelMapsKey =
    getArtworkFrameCanvasMaterialSteelFinishDerivedMapsCacheKey(
      plan.canvasTexture.steelFinishFieldRequest,
    )
  const baselineSteelNormalKey =
    getArtworkFrameCanvasMaterialSteelFinishNormalInputsCacheKey(
      plan.canvasTexture.steelFinishFieldRequest,
    )
  const baselineCorrosionGeometryKey =
    getArtworkFrameCanvasMaterialCorrosionGeometryCacheKey(
      plan.canvasTexture.corrosionFieldRequest,
    )
  const baselineCorrosionMapsKey =
    getArtworkFrameCanvasMaterialCorrosionDerivedMapsCacheKey(
      plan.canvasTexture.corrosionFieldRequest,
    )
  const movedLightKey = getArtworkFrameMaterialLightVectorKey(movedLightVector)

  assert.equal(
    baselineSteelGeometryKey,
    getArtworkFrameCanvasMaterialSteelFinishGeometryCacheKey(
      movedLightDescriptor.steelFinishFieldRequest,
    ),
  )
  assert.equal(
    baselineSteelMapsKey,
    getArtworkFrameCanvasMaterialSteelFinishDerivedMapsCacheKey(
      movedLightDescriptor.steelFinishFieldRequest,
    ),
  )
  assert.equal(
    baselineSteelNormalKey,
    getArtworkFrameCanvasMaterialSteelFinishNormalInputsCacheKey(
      movedLightDescriptor.steelFinishFieldRequest,
    ),
  )
  assert.equal(
    baselineCorrosionGeometryKey,
    getArtworkFrameCanvasMaterialCorrosionGeometryCacheKey(
      movedLightDescriptor.corrosionFieldRequest,
    ),
  )
  assert.equal(
    baselineCorrosionMapsKey,
    getArtworkFrameCanvasMaterialCorrosionDerivedMapsCacheKey(
      movedLightDescriptor.corrosionFieldRequest,
    ),
  )

  for (const stableKey of [
    baselineSteelGeometryKey,
    baselineSteelMapsKey,
    baselineSteelNormalKey,
    baselineCorrosionGeometryKey,
    baselineCorrosionMapsKey,
  ]) {
    assert.equal(stableKey.includes(movedLightKey), false)
    assert.equal(stableKey.includes('light-source'), false)
    assert.equal(stableKey.includes('angle-compat'), false)
  }

  assert.notEqual(
    getArtworkFrameCanvasMaterialShadedPixelsCacheKey(plan.canvasTexture),
    getArtworkFrameCanvasMaterialShadedPixelsCacheKey(movedLightDescriptor),
  )
})

test('canvas material phase cache reuses stable maps while reshading light changes', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'flat',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 0,
    metalBrushAngle: 18,
    metalPolish: 50,
    metalTarnish: 80,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 4, y: 6, width: 240, height: 160 }
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:phase-cache-reuse',
    seed32: 0x17a2c413,
  } as const
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const pathData = createMetalArtworkFramePathData(frame, bounds, stroke)
  const plan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    materialSeed,
    pathData,
    strokeWidth: stroke,
  })
  const materialCache = createArtworkFrameMaterialCanvasMaterialCache()
  const render = (lightVector: { x: number; y: number; z: number }) => {
    assert.ok(plan.canvasTexture)

    const canvas = createDeterministicMaterialCanvas()

    return renderArtworkFrameCanvasMaterialTexture(
      {
        ...plan.canvasTexture,
        lighting: {
          ...plan.canvasTexture.lighting,
          lightVector,
          metalLightAngle: 0,
        },
      },
      {
        createCanvas: canvas.createCanvas,
        createPath: (path) => ({ path } as unknown as Path2D),
        materialCache,
      },
    )
  }
  const overhead = render(createArtworkFrameMaterialHemisphereLightVector({
    x: 0,
    y: 0,
  }))
  const grazing = render(createArtworkFrameMaterialHemisphereLightVector({
    x: 1,
    y: 0,
  }))

  assert.ok(overhead.steelFinishMaps)
  assert.ok(grazing.steelFinishMaps)
  assert.ok(overhead.steelFinishNormalInputs)
  assert.ok(grazing.steelFinishNormalInputs)
  assert.ok(overhead.corrosionMaps)
  assert.ok(grazing.corrosionMaps)
  assert.equal(materialCache.steelFinishFields.size, 1)
  assert.equal(materialCache.steelFinishDerivedMaps.size, 1)
  assert.equal(materialCache.steelFinishNormalInputs.size, 1)
  assert.equal(materialCache.corrosionFields.size, 1)
  assert.equal(materialCache.corrosionDerivedMaps.size, 1)
  assert.equal(materialCache.finalShadedPixels.size, 2)
  assertSteelFinishDerivedMapsEqual(
    overhead.steelFinishMaps,
    grazing.steelFinishMaps,
  )
  assertSteelFinishNormalInputsEqual(
    overhead.steelFinishNormalInputs,
    grazing.steelFinishNormalInputs,
  )
  assertCorrosionDerivedMapsEqual(overhead.corrosionMaps, grazing.corrosionMaps)
  assert.equal(
    countDifferentBytes(overhead.imageData.data, grazing.imageData.data) > 1000,
    true,
  )
})

test('preview and export share canvas material phase cache maps and pixels', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'flat',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 45,
    metalBrushAngle: 18,
    metalPolish: 50,
    metalTarnish: 80,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 8, y: 12, width: 220, height: 148 }
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:phase-cache-preview-export',
    seed32: 0x28465c31,
  } as const
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const pathData = createMetalArtworkFramePathData(frame, bounds, stroke)
  const previewPlan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    materialSeed,
    pathData,
    strokeWidth: stroke,
  })
  const exportPlan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    materialSeed,
    pathData,
    strokeWidth: stroke,
  })
  const materialCache = createArtworkFrameMaterialCanvasMaterialCache()

  assert.ok(previewPlan.canvasTexture)
  assert.ok(exportPlan.canvasTexture)
  assert.deepEqual(previewPlan.canvasTexture, exportPlan.canvasTexture)

  const previewCanvas = createDeterministicMaterialCanvas()
  const renderedPreview = renderArtworkFrameCanvasMaterialTexture(
    previewPlan.canvasTexture,
    {
      createCanvas: previewCanvas.createCanvas,
      createPath: (path) => ({ path } as unknown as Path2D),
      materialCache,
    },
  )
  const exportCanvas = createDeterministicMaterialCanvas()
  const renderedExport = renderArtworkFrameCanvasMaterialTexture(
    exportPlan.canvasTexture,
    {
      createCanvas: exportCanvas.createCanvas,
      createPath: (path) => ({ path } as unknown as Path2D),
      materialCache,
    },
  )

  assert.ok(renderedPreview.steelFinishMaps)
  assert.ok(renderedExport.steelFinishMaps)
  assert.ok(renderedPreview.steelFinishNormalInputs)
  assert.ok(renderedExport.steelFinishNormalInputs)
  assert.ok(renderedPreview.corrosionMaps)
  assert.ok(renderedExport.corrosionMaps)
  assert.equal(materialCache.steelFinishFields.size, 1)
  assert.equal(materialCache.steelFinishDerivedMaps.size, 1)
  assert.equal(materialCache.steelFinishNormalInputs.size, 1)
  assert.equal(materialCache.corrosionFields.size, 1)
  assert.equal(materialCache.corrosionDerivedMaps.size, 1)
  assert.equal(materialCache.finalShadedPixels.size, 1)
  assertSteelFinishDerivedMapsEqual(
    renderedPreview.steelFinishMaps,
    renderedExport.steelFinishMaps,
  )
  assertSteelFinishNormalInputsEqual(
    renderedPreview.steelFinishNormalInputs,
    renderedExport.steelFinishNormalInputs,
  )
  assertCorrosionDerivedMapsEqual(
    renderedPreview.corrosionMaps,
    renderedExport.corrosionMaps,
  )
  assertImageDataEqual(renderedPreview.imageData, renderedExport.imageData)
})

test('canvas material interaction quality caps preview textures without reseeding maps', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'flat',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 45,
    metalBrushAngle: 18,
    metalPolish: 50,
    metalTarnish: 80,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 8, y: 12, width: 320, height: 220 }
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:interaction-quality-preview',
    seed32: 0x19c45a77,
  } as const
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const pathData = createMetalArtworkFramePathData(frame, bounds, stroke)
  const fullPlan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    materialSeed,
    pathData,
    strokeWidth: stroke,
  })
  const dragPlan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    materialSeed,
    pathData,
    qualityMode: 'interaction-preview',
    strokeWidth: stroke,
  })

  assert.ok(fullPlan.canvasTexture?.steelFinishFieldRequest)
  assert.ok(fullPlan.canvasTexture.corrosionFieldRequest)
  assert.ok(dragPlan.canvasTexture?.steelFinishFieldRequest)
  assert.ok(dragPlan.canvasTexture.corrosionFieldRequest)
  assert.equal(fullPlan.canvasTexture.qualityMode, 'full')
  assert.equal(dragPlan.canvasTexture.qualityMode, 'interaction-preview')
  assert.equal(
    Math.max(
      dragPlan.canvasTexture.textureSize.width,
      dragPlan.canvasTexture.textureSize.height,
    ) <= ARTWORK_FRAME_CANVAS_MATERIAL_INTERACTION_MAX_TEXTURE_DIMENSION,
    true,
  )
  assert.equal(
    fullPlan.canvasTexture.textureSize.width >
      dragPlan.canvasTexture.textureSize.width,
    true,
  )
  assert.equal(
    fullPlan.canvasTexture.steelFinishFieldRequest.geometrySeedKey,
    dragPlan.canvasTexture.steelFinishFieldRequest.geometrySeedKey,
  )
  assert.equal(
    fullPlan.canvasTexture.corrosionFieldRequest.geometrySeedKey,
    dragPlan.canvasTexture.corrosionFieldRequest.geometrySeedKey,
  )
  assert.notEqual(
    getArtworkFrameCanvasMaterialTextureKey(fullPlan.canvasTexture),
    getArtworkFrameCanvasMaterialTextureKey(dragPlan.canvasTexture),
  )
  assert.notEqual(
    getArtworkFrameCanvasMaterialSteelFinishDerivedMapsCacheKey(
      fullPlan.canvasTexture.steelFinishFieldRequest,
    ),
    getArtworkFrameCanvasMaterialSteelFinishDerivedMapsCacheKey(
      dragPlan.canvasTexture.steelFinishFieldRequest,
    ),
  )
  assert.notEqual(
    getArtworkFrameCanvasMaterialCorrosionDerivedMapsCacheKey(
      fullPlan.canvasTexture.corrosionFieldRequest,
    ),
    getArtworkFrameCanvasMaterialCorrosionDerivedMapsCacheKey(
      dragPlan.canvasTexture.corrosionFieldRequest,
    ),
  )

  const materialCache = createArtworkFrameMaterialCanvasMaterialCache()
  const dragCanvas = createDeterministicMaterialCanvas()
  const renderedDrag = renderArtworkFrameCanvasMaterialTexture(
    dragPlan.canvasTexture,
    {
      createCanvas: dragCanvas.createCanvas,
      createPath: (path) => ({ path } as unknown as Path2D),
      materialCache,
    },
  )
  const fullCanvas = createDeterministicMaterialCanvas()
  const renderedFull = renderArtworkFrameCanvasMaterialTexture(
    fullPlan.canvasTexture,
    {
      createCanvas: fullCanvas.createCanvas,
      createPath: (path) => ({ path } as unknown as Path2D),
      materialCache,
    },
  )

  assert.equal(renderedDrag.width, dragPlan.canvasTexture.textureSize.width)
  assert.equal(renderedFull.width, fullPlan.canvasTexture.textureSize.width)
  assert.equal(materialCache.steelFinishDerivedMaps.size, 2)
  assert.equal(materialCache.steelFinishNormalInputs.size, 2)
  assert.equal(materialCache.corrosionDerivedMaps.size, 2)
  assert.equal(materialCache.finalShadedPixels.size, 2)
})

test('export material planning stays full quality unless interaction mode is requested', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'blackIron',
    metalProfile: 'flat',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 45,
    metalBrushAngle: 18,
    metalPolish: 50,
    metalTarnish: 80,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 8, y: 12, width: 320, height: 220 }
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:interaction-quality-export',
    seed32: 0x3c0ffee1,
  } as const
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const pathData = createMetalArtworkFramePathData(frame, bounds, stroke)
  const fullPreviewPlan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    materialSeed,
    pathData,
    strokeWidth: stroke,
  })
  const exportPlan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    materialSeed,
    pathData,
    strokeWidth: stroke,
  })
  const dragPreviewPlan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    materialSeed,
    pathData,
    qualityMode: 'interaction-preview',
    strokeWidth: stroke,
  })

  assert.ok(fullPreviewPlan.canvasTexture)
  assert.ok(exportPlan.canvasTexture)
  assert.ok(dragPreviewPlan.canvasTexture)
  assert.deepEqual(exportPlan.canvasTexture, fullPreviewPlan.canvasTexture)
  assert.equal(exportPlan.canvasTexture.qualityMode, 'full')
  assert.equal(dragPreviewPlan.canvasTexture.qualityMode, 'interaction-preview')
  assert.notEqual(
    getArtworkFrameCanvasMaterialTextureKey(exportPlan.canvasTexture),
    getArtworkFrameCanvasMaterialTextureKey(dragPreviewPlan.canvasTexture),
  )
  assert.equal(
    exportPlan.canvasTexture.textureSize.width >
      dragPreviewPlan.canvasTexture.textureSize.width,
    true,
  )
})

test('light drag scheduler coalesces updates until animation frame or pointerup flush', () => {
  const renderedValues: number[] = []
  const cancelledHandles: number[] = []
  let nextHandle = 1
  let queuedFrame: (() => void) | null = null
  const scheduler = createArtworkFrameMaterialLightDragScheduler(
    (value: number) => {
      renderedValues.push(value)
    },
    {
      cancelAnimationFrame: (handle) => {
        cancelledHandles.push(handle)
      },
      requestAnimationFrame: (callback) => {
        queuedFrame = callback
        const handle = nextHandle
        nextHandle += 1
        return handle
      },
    },
  )

  scheduler.schedule(10)
  scheduler.schedule(20)
  scheduler.schedule(30)

  assert.deepEqual(renderedValues, [])
  if (!queuedFrame) {
    throw new Error('Expected light drag scheduler to queue an animation frame.')
  }

  queuedFrame()

  assert.deepEqual(renderedValues, [30])

  scheduler.schedule(40)
  scheduler.flush()

  assert.deepEqual(renderedValues, [30, 40])
  assert.deepEqual(cancelledHandles, [2])

  scheduler.schedule(50)
  scheduler.cancel()
  scheduler.flush()

  assert.deepEqual(renderedValues, [30, 40])
})

test('offscreen canvas material adapter matches main-thread renderer output', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'flat',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 45,
    metalBrushAngle: 18,
    metalPolish: 50,
    metalTarnish: 80,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 8, y: 12, width: 220, height: 148 }
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:offscreen-adapter-equivalence',
    seed32: 0x410ff512,
  } as const
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const pathData = createMetalArtworkFramePathData(frame, bounds, stroke)
  const plan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    materialSeed,
    pathData,
    strokeWidth: stroke,
  })

  assert.ok(plan.canvasTexture)

  const mainThreadCanvas = createDeterministicMaterialCanvas()
  const mainThreadRendered = renderArtworkFrameCanvasMaterialTexture(
    plan.canvasTexture,
    {
      createCanvas: mainThreadCanvas.createCanvas,
      createPath: (path) => ({ path } as unknown as Path2D),
    },
  )
  const offscreenCanvas = createDeterministicOffscreenMaterialCanvasScope()
  const offscreenRendered =
    renderArtworkFrameCanvasMaterialTextureWithOffscreenAdapter(
      plan.canvasTexture,
      {
        capabilityScope: offscreenCanvas.scope,
        createCanvas: () => {
          throw new Error('offscreen adapter should not use fallback canvas')
        },
        createPath: (path) => ({ path } as unknown as Path2D),
      },
    )

  assert.equal(offscreenRendered.canvas, offscreenCanvas.getCanvas())
  assert.ok(mainThreadRendered.steelFinishMaps)
  assert.ok(offscreenRendered.steelFinishMaps)
  assert.ok(mainThreadRendered.steelFinishNormalInputs)
  assert.ok(offscreenRendered.steelFinishNormalInputs)
  assert.ok(mainThreadRendered.corrosionMaps)
  assert.ok(offscreenRendered.corrosionMaps)
  assertSteelFinishDerivedMapsEqual(
    mainThreadRendered.steelFinishMaps,
    offscreenRendered.steelFinishMaps,
  )
  assertSteelFinishNormalInputsEqual(
    mainThreadRendered.steelFinishNormalInputs,
    offscreenRendered.steelFinishNormalInputs,
  )
  assertCorrosionDerivedMapsEqual(
    mainThreadRendered.corrosionMaps,
    offscreenRendered.corrosionMaps,
  )
  assertImageDataEqual(mainThreadRendered.imageData, offscreenRendered.imageData)
})

test('offscreen canvas material adapter falls back to main-thread renderer', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'flat',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 45,
    metalBrushAngle: 18,
    metalPolish: 50,
    metalTarnish: 80,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 8, y: 12, width: 220, height: 148 }
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:offscreen-adapter-fallback',
    seed32: 0x17bf311a,
  } as const
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const pathData = createMetalArtworkFramePathData(frame, bounds, stroke)
  const plan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    materialSeed,
    pathData,
    strokeWidth: stroke,
  })

  assert.ok(plan.canvasTexture)

  const directCanvas = createDeterministicMaterialCanvas()
  const directRendered = renderArtworkFrameCanvasMaterialTexture(
    plan.canvasTexture,
    {
      createCanvas: directCanvas.createCanvas,
      createPath: (path) => ({ path } as unknown as Path2D),
    },
  )
  const unavailableFallbackCanvas = createDeterministicMaterialCanvas()
  const unavailableFallback =
    renderArtworkFrameCanvasMaterialTextureWithOffscreenAdapter(
      plan.canvasTexture,
      {
        capabilityScope: {},
        createCanvas: unavailableFallbackCanvas.createCanvas,
        createPath: (path) => ({ path } as unknown as Path2D),
      },
    )
  const failingOffscreenScope = createDeterministicOffscreenMaterialCanvasScope({
    throwAfterDetection: true,
  })
  const failedOffscreenFallbackCanvas = createDeterministicMaterialCanvas()
  const failedOffscreenFallback =
    renderArtworkFrameCanvasMaterialTextureWithOffscreenAdapter(
      plan.canvasTexture,
      {
        capabilityScope: failingOffscreenScope.scope,
        createCanvas: failedOffscreenFallbackCanvas.createCanvas,
        createPath: (path) => ({ path } as unknown as Path2D),
      },
    )

  assert.equal(unavailableFallback.canvas, unavailableFallbackCanvas.getCanvas())
  assert.equal(
    failedOffscreenFallback.canvas,
    failedOffscreenFallbackCanvas.getCanvas(),
  )
  assertImageDataEqual(directRendered.imageData, unavailableFallback.imageData)
  assertImageDataEqual(directRendered.imageData, failedOffscreenFallback.imageData)
})

test('preview and export share offscreen canvas material adapter descriptors', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'blackIron',
    metalProfile: 'flat',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 45,
    metalBrushAngle: 18,
    metalPolish: 50,
    metalTarnish: 80,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 8, y: 12, width: 220, height: 148 }
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:offscreen-preview-export',
    seed32: 0xa411c7e2,
  } as const
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const pathData = createMetalArtworkFramePathData(frame, bounds, stroke)
  const previewPlan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    materialSeed,
    pathData,
    strokeWidth: stroke,
  })
  const exportPlan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    materialSeed,
    pathData,
    strokeWidth: stroke,
  })
  const materialCache = createArtworkFrameMaterialCanvasMaterialCache()

  assert.ok(previewPlan.canvasTexture)
  assert.ok(exportPlan.canvasTexture)
  assert.deepEqual(previewPlan.canvasTexture, exportPlan.canvasTexture)

  const previewOffscreen = createDeterministicOffscreenMaterialCanvasScope()
  const previewRendered =
    renderArtworkFrameCanvasMaterialTextureWithOffscreenAdapter(
      previewPlan.canvasTexture,
      {
        capabilityScope: previewOffscreen.scope,
        createPath: (path) => ({ path } as unknown as Path2D),
        materialCache,
      },
    )
  const exportOffscreen = createDeterministicOffscreenMaterialCanvasScope()
  const exportRendered =
    renderArtworkFrameCanvasMaterialTextureWithOffscreenAdapter(
      exportPlan.canvasTexture,
      {
        capabilityScope: exportOffscreen.scope,
        createPath: (path) => ({ path } as unknown as Path2D),
        materialCache,
      },
    )

  assert.equal(previewRendered.cacheKey, exportRendered.cacheKey)
  assert.ok(previewRendered.steelFinishMaps)
  assert.ok(exportRendered.steelFinishMaps)
  assert.ok(previewRendered.steelFinishNormalInputs)
  assert.ok(exportRendered.steelFinishNormalInputs)
  assert.ok(previewRendered.corrosionMaps)
  assert.ok(exportRendered.corrosionMaps)
  assert.equal(materialCache.steelFinishFields.size, 1)
  assert.equal(materialCache.steelFinishDerivedMaps.size, 1)
  assert.equal(materialCache.steelFinishNormalInputs.size, 1)
  assert.equal(materialCache.corrosionFields.size, 1)
  assert.equal(materialCache.corrosionDerivedMaps.size, 1)
  assert.equal(materialCache.finalShadedPixels.size, 1)
  assertSteelFinishDerivedMapsEqual(
    previewRendered.steelFinishMaps,
    exportRendered.steelFinishMaps,
  )
  assertSteelFinishNormalInputsEqual(
    previewRendered.steelFinishNormalInputs,
    exportRendered.steelFinishNormalInputs,
  )
  assertCorrosionDerivedMapsEqual(
    previewRendered.corrosionMaps,
    exportRendered.corrosionMaps,
  )
  assertImageDataEqual(previewRendered.imageData, exportRendered.imageData)
})

test('worker material shading input maps stay identical across light changes', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'flat',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 0,
    metalBrushAngle: 18,
    metalPolish: 50,
    metalTarnish: 80,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 8, y: 12, width: 220, height: 148 }
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:worker-shading-stable-maps',
    seed32: 0x4158ad17,
  } as const
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const pathData = createMetalArtworkFramePathData(frame, bounds, stroke)
  const plan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    materialSeed,
    pathData,
    strokeWidth: stroke,
  })

  assert.ok(plan.canvasTexture)

  const canvas = createDeterministicMaterialCanvas()
  const rendered = renderArtworkFrameCanvasMaterialTexture(plan.canvasTexture, {
    createCanvas: canvas.createCanvas,
    createPath: (path) => ({ path } as unknown as Path2D),
  })

  assert.ok(rendered.steelFinishMaps)
  assert.ok(rendered.steelFinishNormalInputs)
  assert.ok(rendered.corrosionMaps)
  assert.ok(plan.canvasTexture)

  const basePayload = {
    coordinates: createArtworkFrameMaterialShadingCoordinateContext(
      plan.canvasTexture,
    ),
    corrosionMaps: rendered.corrosionMaps,
    imageData: createMaterialTestImageData(rendered.width, rendered.height),
    metalBrushAngle: frame.metalBrushAngle,
    steelFinishMaps: rendered.steelFinishMaps,
    steelFinishNormalInputs: rendered.steelFinishNormalInputs,
  }
  const overhead = createArtworkFrameMaterialWorkerShadingRequest({
    ...basePayload,
    lighting: {
      lightVector: createArtworkFrameMaterialHemisphereLightVector({
        x: 0,
        y: 0,
      }),
      metalLightAngle: 0,
    },
  }, 'overhead').request
  const grazing = createArtworkFrameMaterialWorkerShadingRequest({
    ...basePayload,
    lighting: {
      lightVector: createArtworkFrameMaterialHemisphereLightVector({
        x: 1,
        y: 0,
      }),
      metalLightAngle: 0,
    },
  }, 'grazing').request

  assert.ok(overhead.steelFinishMaps)
  assert.ok(grazing.steelFinishMaps)
  assert.ok(overhead.steelFinishNormalInputs)
  assert.ok(grazing.steelFinishNormalInputs)
  assert.ok(overhead.corrosionMaps)
  assert.ok(grazing.corrosionMaps)
  assertSteelFinishDerivedMapsEqual(
    overhead.steelFinishMaps,
    grazing.steelFinishMaps,
  )
  assertSteelFinishNormalInputsEqual(
    overhead.steelFinishNormalInputs,
    grazing.steelFinishNormalInputs,
  )
  assertCorrosionDerivedMapsEqual(overhead.corrosionMaps, grazing.corrosionMaps)
  assertImageDataEqual(overhead.imageData, grazing.imageData)
  assert.deepEqual(overhead.coordinates, grazing.coordinates)
  assert.notDeepEqual(overhead.lighting.lightVector, grazing.lighting.lightVector)
  assert.notEqual(
    overhead.steelFinishMaps.steelHeight.buffer,
    rendered.steelFinishMaps.steelHeight.buffer,
  )
  assert.equal(rendered.steelFinishMaps.steelHeight.byteLength > 0, true)
})

test('worker material shading output changes with light while maps stay fixed', async () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'flat',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 0,
    metalBrushAngle: 18,
    metalPolish: 50,
    metalTarnish: 80,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 8, y: 12, width: 220, height: 148 }
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:worker-shading-light-response',
    seed32: 0x89a477c1,
  } as const
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const pathData = createMetalArtworkFramePathData(frame, bounds, stroke)
  const plan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    materialSeed,
    pathData,
    strokeWidth: stroke,
  })
  const capturedRequests: ArtworkFrameMaterialWorkerShadingRequest[] = []
  const render = async (lightVector: { x: number; y: number; z: number }) => {
    assert.ok(plan.canvasTexture)

    return await renderArtworkFrameCanvasMaterialTextureWithWorkerShading(
      {
        ...plan.canvasTexture,
        lighting: {
          ...plan.canvasTexture.lighting,
          lightVector,
          metalLightAngle: 0,
        },
      },
      {
        capabilityScope: createWorkerShadingCapabilityScope(),
        createPath: (path) => ({ path } as unknown as Path2D),
        createWorker: createMockMaterialShadingWorkerFactory(capturedRequests),
      },
    )
  }
  const overhead = await render(createArtworkFrameMaterialHemisphereLightVector({
    x: 0,
    y: 0,
  }))
  const grazing = await render(createArtworkFrameMaterialHemisphereLightVector({
    x: 1,
    y: 0,
  }))

  assert.ok(overhead.steelFinishMaps)
  assert.ok(grazing.steelFinishMaps)
  assert.ok(overhead.steelFinishNormalInputs)
  assert.ok(grazing.steelFinishNormalInputs)
  assert.ok(overhead.corrosionMaps)
  assert.ok(grazing.corrosionMaps)
  assert.equal(capturedRequests.length, 2)
  assert.ok(capturedRequests[0].steelFinishMaps)
  assert.ok(capturedRequests[1].steelFinishMaps)
  assert.ok(capturedRequests[0].steelFinishNormalInputs)
  assert.ok(capturedRequests[1].steelFinishNormalInputs)
  assert.ok(capturedRequests[0].corrosionMaps)
  assert.ok(capturedRequests[1].corrosionMaps)
  assertSteelFinishDerivedMapsEqual(
    capturedRequests[0].steelFinishMaps,
    capturedRequests[1].steelFinishMaps,
  )
  assertSteelFinishNormalInputsEqual(
    capturedRequests[0].steelFinishNormalInputs,
    capturedRequests[1].steelFinishNormalInputs,
  )
  assertCorrosionDerivedMapsEqual(
    capturedRequests[0].corrosionMaps,
    capturedRequests[1].corrosionMaps,
  )
  assert.deepEqual(
    capturedRequests[0].coordinates,
    capturedRequests[1].coordinates,
  )
  assert.deepEqual(
    capturedRequests[0].coordinates,
    createArtworkFrameMaterialShadingCoordinateContext(plan.canvasTexture),
  )
  assertSteelFinishDerivedMapsEqual(
    overhead.steelFinishMaps,
    grazing.steelFinishMaps,
  )
  assertSteelFinishNormalInputsEqual(
    overhead.steelFinishNormalInputs,
    grazing.steelFinishNormalInputs,
  )
  assertCorrosionDerivedMapsEqual(overhead.corrosionMaps, grazing.corrosionMaps)
  assert.equal(
    countDifferentBytes(overhead.imageData.data, grazing.imageData.data) > 1000,
    true,
  )
})

test('worker material shading falls back when worker or offscreen support is unavailable', async () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'flat',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 0,
    metalBrushAngle: 18,
    metalPolish: 50,
    metalTarnish: 80,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 8, y: 12, width: 220, height: 148 }
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:worker-shading-fallback',
    seed32: 0xa19b11f0,
  } as const
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const pathData = createMetalArtworkFramePathData(frame, bounds, stroke)
  const plan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    materialSeed,
    pathData,
    strokeWidth: stroke,
  })

  assert.ok(plan.canvasTexture)

  const directCanvas = createDeterministicMaterialCanvas()
  const direct = renderArtworkFrameCanvasMaterialTexture(plan.canvasTexture, {
    createCanvas: directCanvas.createCanvas,
    createPath: (path) => ({ path } as unknown as Path2D),
  })
  const unavailableCanvas = createDeterministicMaterialCanvas()
  const unavailable =
    await renderArtworkFrameCanvasMaterialTextureWithWorkerShading(
      plan.canvasTexture,
      {
        capabilityScope: {},
        createCanvas: unavailableCanvas.createCanvas,
        createPath: (path) => ({ path } as unknown as Path2D),
      },
    )
  const failingWorkerCanvas = createDeterministicMaterialCanvas()
  const failingWorker =
    await renderArtworkFrameCanvasMaterialTextureWithWorkerShading(
      plan.canvasTexture,
      {
        capabilityScope: createWorkerShadingCapabilityScope(),
        createCanvas: failingWorkerCanvas.createCanvas,
        createPath: (path) => ({ path } as unknown as Path2D),
        createWorker: () => ({
          postMessage: () => {
            throw new Error('worker unavailable')
          },
          terminate: () => {},
        }),
      },
    )

  assert.equal(unavailable.canvas, unavailableCanvas.getCanvas())
  assertImageDataEqual(direct.imageData, unavailable.imageData)
  assertImageDataEqual(direct.imageData, failingWorker.imageData)
})

test('preview and export share worker material shading descriptors maps and pixels', async () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'blackIron',
    metalProfile: 'flat',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 0,
    metalBrushAngle: 18,
    metalPolish: 50,
    metalTarnish: 80,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 8, y: 12, width: 220, height: 148 }
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:worker-preview-export',
    seed32: 0xf10ccc51,
  } as const
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const pathData = createMetalArtworkFramePathData(frame, bounds, stroke)
  const previewPlan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    materialSeed,
    pathData,
    strokeWidth: stroke,
  })
  const exportPlan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    materialSeed,
    pathData,
    strokeWidth: stroke,
  })
  const materialCache = createArtworkFrameMaterialCanvasMaterialCache()
  const capturedRequests: ArtworkFrameMaterialWorkerShadingRequest[] = []

  assert.ok(previewPlan.canvasTexture)
  assert.ok(exportPlan.canvasTexture)
  assert.deepEqual(previewPlan.canvasTexture, exportPlan.canvasTexture)

  const preview = await renderArtworkFrameCanvasMaterialTextureWithWorkerShading(
    previewPlan.canvasTexture,
    {
      capabilityScope: createWorkerShadingCapabilityScope(),
      createPath: (path) => ({ path } as unknown as Path2D),
      createWorker: createMockMaterialShadingWorkerFactory(capturedRequests),
      materialCache,
    },
  )
  const exported = await renderArtworkFrameCanvasMaterialTextureWithWorkerShading(
    exportPlan.canvasTexture,
    {
      capabilityScope: createWorkerShadingCapabilityScope(),
      createPath: (path) => ({ path } as unknown as Path2D),
      createWorker: createMockMaterialShadingWorkerFactory(capturedRequests),
      materialCache,
    },
  )

  assert.equal(preview.cacheKey, exported.cacheKey)
  assert.equal(capturedRequests.length, 1)
  assert.ok(preview.steelFinishMaps)
  assert.ok(exported.steelFinishMaps)
  assert.ok(preview.steelFinishNormalInputs)
  assert.ok(exported.steelFinishNormalInputs)
  assert.ok(preview.corrosionMaps)
  assert.ok(exported.corrosionMaps)
  assertSteelFinishDerivedMapsEqual(
    preview.steelFinishMaps,
    exported.steelFinishMaps,
  )
  if (
    preview.steelFinishMaps.defectDecalMaps ||
    exported.steelFinishMaps.defectDecalMaps
  ) {
    assert.ok(preview.steelFinishMaps.defectDecalMaps)
    assert.ok(exported.steelFinishMaps.defectDecalMaps)
    assertSteelDefectDecalMapsEqual(
      preview.steelFinishMaps.defectDecalMaps,
      exported.steelFinishMaps.defectDecalMaps,
    )
  }
  assertSteelFinishNormalInputsEqual(
    preview.steelFinishNormalInputs,
    exported.steelFinishNormalInputs,
  )
  assertCorrosionDerivedMapsEqual(preview.corrosionMaps, exported.corrosionMaps)
  assertImageDataEqual(preview.imageData, exported.imageData)
})

test('material performance helper records opt-in timings only', () => {
  let clockValue = 10
  let clockCalls = 0
  const clock = () => {
    clockCalls += 1
    clockValue += 2.5
    return clockValue
  }

  assert.equal(
    measureArtworkFrameMaterialPerformance(
      null,
      'steel-finish-field',
      () => 'quiet',
      clock,
    ),
    'quiet',
  )
  assert.equal(clockCalls, 0)

  const collector = createArtworkFrameMaterialPerformanceCollector()
  const result = measureArtworkFrameMaterialPerformance(
    collector,
    'steel-finish-field',
    () => 'measured',
    clock,
  )

  assert.equal(result, 'measured')
  assert.equal(collector.entries.length, 1)
  assert.equal(collector.entries[0].phase, 'steel-finish-field')
  assert.equal(collector.entries[0].durationMs, 2.5)

  measureArtworkFrameMaterialPerformance(
    collector,
    'steel-finish-field',
    () => undefined,
    clock,
  )

  const [summary] = collector.getSummary()

  assert.equal(summary?.phase, 'steel-finish-field')
  assert.equal(summary?.count, 2)
  assert.equal(summary?.totalMs, 5)
  assert.equal(summary?.maxMs, 2.5)
})

test('canvas material diagnostics can report renderer phase timings', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'flat',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 0,
    metalBrushAngle: 12,
    metalPolish: 42,
    metalTarnish: 80,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 12, y: 20, width: 240, height: 160 }
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:material-performance-diagnostics',
    seed32: 0xf1471095,
  } as const
  const stroke = getArtworkFrameStrokeWidth(
    frame,
    bounds.width,
    bounds.height,
  )
  const pathData = createMetalArtworkFramePathData(frame, bounds, stroke)
  const collector = createArtworkFrameMaterialPerformanceCollector()
  const plan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    materialSeed,
    pathData,
    performance: collector,
    strokeWidth: stroke,
  })

  assert.ok(plan.canvasTexture)

  const canvas = createDeterministicMaterialCanvas()
  const rendered = renderArtworkFrameCanvasMaterialTexture(plan.canvasTexture, {
    createCanvas: canvas.createCanvas,
    createPath: (path) => ({ path } as unknown as Path2D),
    performance: collector,
  })
  const summary = collector.getSummary()
  const phaseCounts = new Map(summary.map((entry) => [entry.phase, entry.count]))

  assert.ok(rendered.steelFinishMaps)
  assert.ok(rendered.corrosionMaps)
  for (const phase of [
    'descriptor-material-plan',
    'steel-finish-field',
    'steel-derived-maps',
    'corrosion-field',
    'corrosion-derived-maps',
    'normal-generation',
    'final-shading',
    'self-shadow-pass',
    'image-canvas-output-conversion',
  ] as const) {
    assert.equal((phaseCounts.get(phase) ?? 0) > 0, true, phase)
  }

  assert.equal((phaseCounts.get('normal-generation') ?? 0) >= 2, true)
  assert.equal((phaseCounts.get('final-shading') ?? 0) >= 2, true)
  assert.equal((phaseCounts.get('self-shadow-pass') ?? 0) >= 2, true)
  assert.equal(
    summary.every((entry) => entry.totalMs >= 0 && entry.maxMs >= 0),
    true,
  )
})

test('height-map self shadow scales with grazing and respects frame masks', () => {
  const widthPixels = 7
  const heightPixels = 5
  const heightMap = new Float32Array(widthPixels * heightPixels)
  const maskMap = new Float32Array(widthPixels * heightPixels)

  heightMap.fill(0.1)
  maskMap.fill(1)
  heightMap[2 * widthPixels + 1] = 0.14
  heightMap[2 * widthPixels + 0] = 0.12

  const overhead = getArtworkFrameMaterialHeightSelfShadow({
    heightMap,
    heightPixels,
    lightVector: createArtworkFrameMaterialHemisphereLightVector({
      x: 0,
      y: 0,
    }),
    maskMap,
    widthPixels,
    x: 2,
    y: 2,
  })
  const angled = getArtworkFrameMaterialHeightSelfShadow({
    heightMap,
    heightPixels,
    lightVector: createArtworkFrameMaterialHemisphereLightVector({
      x: 0.5,
      y: 0,
    }),
    maskMap,
    widthPixels,
    x: 2,
    y: 2,
  })
  const grazing = getArtworkFrameMaterialHeightSelfShadow({
    heightMap,
    heightPixels,
    lightVector: createArtworkFrameMaterialHemisphereLightVector({
      x: 1,
      y: 0,
    }),
    maskMap,
    widthPixels,
    x: 2,
    y: 2,
  })

  assert.equal(overhead, 0)
  assert.equal(angled > 0.02, true)
  assert.equal(grazing > angled, true)
  assert.equal(
    getArtworkFrameMaterialHeightSelfShadow({
      heightMap,
      heightPixels,
      lightVector: createArtworkFrameMaterialHemisphereLightVector({
        x: -1,
        y: 0,
      }),
      maskMap,
      widthPixels,
      x: 2,
      y: 2,
    }),
    0,
  )

  maskMap[2 * widthPixels + 2] = 0
  assert.equal(
    getArtworkFrameMaterialHeightSelfShadow({
      heightMap,
      heightPixels,
      lightVector: createArtworkFrameMaterialHemisphereLightVector({
        x: 1,
        y: 0,
      }),
      maskMap,
      widthPixels,
      x: 2,
      y: 2,
    }),
    0,
  )

  maskMap[2 * widthPixels + 2] = 1
  maskMap[2 * widthPixels + 1] = 0
  maskMap[2 * widthPixels + 0] = 0
  assert.equal(
    getArtworkFrameMaterialHeightSelfShadow({
      heightMap,
      heightPixels,
      lightVector: createArtworkFrameMaterialHemisphereLightVector({
        x: 1,
        y: 0,
      }),
      maskMap,
      widthPixels,
      x: 2,
      y: 2,
    }),
    0,
  )
})

test('height-map self shadow samples from lit side for corner handles', () => {
  const widthPixels = 5
  const heightPixels = 5
  const center = { x: 2, y: 2 }
  const cases = [
    {
      label: 'bottom-left handle',
      lightPosition: { x: -1, y: -1 },
      litSideOccluder: { x: 3, y: 1 },
      shadowSideOccluder: { x: 1, y: 3 },
    },
    {
      label: 'bottom-right handle',
      lightPosition: { x: 1, y: -1 },
      litSideOccluder: { x: 1, y: 1 },
      shadowSideOccluder: { x: 3, y: 3 },
    },
    {
      label: 'top-left handle',
      lightPosition: { x: -1, y: 1 },
      litSideOccluder: { x: 3, y: 3 },
      shadowSideOccluder: { x: 1, y: 1 },
    },
    {
      label: 'top-right handle',
      lightPosition: { x: 1, y: 1 },
      litSideOccluder: { x: 1, y: 3 },
      shadowSideOccluder: { x: 3, y: 1 },
    },
  ] as const

  for (const {
    label,
    lightPosition,
    litSideOccluder,
    shadowSideOccluder,
  } of cases) {
    const heightMap = new Float32Array(widthPixels * heightPixels)
    const maskMap = new Float32Array(widthPixels * heightPixels)

    heightMap.fill(0.1)
    maskMap.fill(1)
    heightMap[litSideOccluder.y * widthPixels + litSideOccluder.x] = 0.16

    const litSideShadow = getArtworkFrameMaterialHeightSelfShadow({
      heightMap,
      heightPixels,
      lightVector: createArtworkFrameMaterialHemisphereLightVector(
        lightPosition,
      ),
      maskMap,
      widthPixels,
      ...center,
    })

    heightMap[litSideOccluder.y * widthPixels + litSideOccluder.x] = 0.1
    heightMap[shadowSideOccluder.y * widthPixels + shadowSideOccluder.x] = 0.16

    assert.equal(
      litSideShadow > 0.02,
      true,
      `${label} should sample occluders from the lit side`,
    )
    assert.equal(
      getArtworkFrameMaterialHeightSelfShadow({
        heightMap,
        heightPixels,
        lightVector: createArtworkFrameMaterialHemisphereLightVector(
          lightPosition,
        ),
        maskMap,
        widthPixels,
        ...center,
      }),
      0,
      `${label} should not sample occluders from the shadow side`,
    )
  }
})

test('height-map self shadow macro multiplier keeps overhead neutral and strengthens far-side grazing', () => {
  const overhead = getArtworkFrameMaterialHeightSelfShadowMacroMultiplier({
    farShadowRamp: 0,
    grazingStrength: 0,
  })
  const nearGrazing = getArtworkFrameMaterialHeightSelfShadowMacroMultiplier({
    farShadowRamp: 0,
    grazingStrength: 1,
  })
  const angledFarSide = getArtworkFrameMaterialHeightSelfShadowMacroMultiplier({
    farShadowRamp: 0.72,
    grazingStrength: 0.72,
  })
  const grazingFarSide = getArtworkFrameMaterialHeightSelfShadowMacroMultiplier({
    farShadowRamp: 1,
    grazingStrength: 1,
  })
  const clamped = getArtworkFrameMaterialHeightSelfShadowMacroMultiplier({
    farShadowRamp: 4,
    grazingStrength: 4,
  })

  assert.equal(overhead, 1)
  assert.equal(nearGrazing, 1)
  assert.equal(grazingFarSide > angledFarSide, true)
  assert.equal(clamped, grazingFarSide)
  assert.equal(grazingFarSide <= 1.36, true)
})

test('canvas steel finish shading uses light vectors without moving geometry', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'flat',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 0,
    metalBrushAngle: 0,
    metalPolish: 50,
    metalTarnish: 0,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 12, y: 20, width: 240, height: 160 }
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:steel-light-vector-shading',
    seed32: 0x51471526,
  } as const
  const overheadLight = createArtworkFrameMaterialHemisphereLightVector({
    x: 0,
    y: 0,
  })
  const angledLight = createArtworkFrameMaterialHemisphereLightVector({
    x: 0.5,
    y: 0,
  })
  const grazingLight = createArtworkFrameMaterialHemisphereLightVector({
    x: 1,
    y: 0,
  })
  const render = (
    metalBrushAngle: number,
    lightVector: { x: number; y: number; z: number },
  ) => {
    const nextFrame = { ...frame, metalBrushAngle }
    const stroke = getArtworkFrameStrokeWidth(
      nextFrame,
      bounds.width,
      bounds.height,
    )
    const pathData = createMetalArtworkFramePathData(
      nextFrame,
      bounds,
      stroke,
    )
    const plan = buildMetalArtworkFrameMaterialPlan({
      bounds,
      clipPathData: pathData,
      frame: nextFrame,
      materialSeed,
      pathData,
      strokeWidth: stroke,
    })

    assert.ok(plan.canvasTexture?.steelFinishFieldRequest)

    const canvas = createDeterministicMaterialCanvas()

    return renderArtworkFrameCanvasMaterialTexture(
      {
        ...plan.canvasTexture,
        corrosionFieldRequest: null,
        lighting: {
          ...plan.canvasTexture.lighting,
          lightVector,
          metalLightAngle: 0,
        },
      },
      {
        createCanvas: canvas.createCanvas,
        createPath: (path) => ({ path } as unknown as Path2D),
      },
    )
  }
  const overhead = render(0, overheadLight)
  const repeatedOverhead = render(0, overheadLight)
  const angled = render(0, angledLight)
  const grazing = render(0, grazingLight)
  const rotatedBrush = render(45, overheadLight)

  assert.ok(overhead.steelFinishMaps)
  assert.ok(repeatedOverhead.steelFinishMaps)
  assert.ok(angled.steelFinishMaps)
  assert.ok(grazing.steelFinishMaps)
  assert.ok(rotatedBrush.steelFinishMaps)
  assert.ok(overhead.steelFinishNormalInputs)
  assert.ok(angled.steelFinishNormalInputs)
  assert.ok(grazing.steelFinishNormalInputs)

  assertSteelFinishDerivedMapsEqual(
    overhead.steelFinishMaps,
    repeatedOverhead.steelFinishMaps,
  )
  assertSteelFinishDerivedMapsEqual(
    overhead.steelFinishMaps,
    angled.steelFinishMaps,
  )
  assertSteelFinishDerivedMapsEqual(
    overhead.steelFinishMaps,
    grazing.steelFinishMaps,
  )
  assertSteelFinishNormalInputsEqual(
    overhead.steelFinishNormalInputs,
    angled.steelFinishNormalInputs,
  )
  assertSteelFinishNormalInputsEqual(
    overhead.steelFinishNormalInputs,
    grazing.steelFinishNormalInputs,
  )
  assert.equal(
    countDifferentBytes(
      overhead.imageData.data,
      repeatedOverhead.imageData.data,
    ),
    0,
  )
  assert.equal(
    countDifferentBytes(overhead.imageData.data, angled.imageData.data) > 1000,
    true,
  )
  assert.equal(
    countDifferentBytes(angled.imageData.data, grazing.imageData.data) > 1000,
    true,
  )
  let outsidePixelCount = 0
  let outsideAlphaBleedCount = 0

  for (
    let index = 0;
    index < overhead.steelFinishMaps.widthPixels * overhead.steelFinishMaps.heightPixels;
    index += 1
  ) {
    if ((overhead.steelFinishMaps.steelMetalness[index] ?? 0) > 0) {
      continue
    }

    outsidePixelCount += 1

    if ((grazing.imageData.data[index * 4 + 3] ?? 0) !== 0) {
      outsideAlphaBleedCount += 1
    }
  }

  assert.equal(outsidePixelCount > 0, true)
  assert.equal(outsideAlphaBleedCount, 0)
  assert.equal(
    countDifferentFloatValues(
      overhead.steelFinishMaps.brushedGrainMask,
      rotatedBrush.steelFinishMaps.brushedGrainMask,
    ) > 300,
    true,
  )
  assert.equal(
    getAngleDifferenceDegrees(
      summarizeSteelFinishAnisotropyDirectionDegrees(overhead.steelFinishMaps),
      summarizeSteelFinishAnisotropyDirectionDegrees(
        rotatedBrush.steelFinishMaps,
      ),
    ) > 38,
    true,
  )
  assert.equal(
    getAngleDifferenceDegrees(
      summarizeSteelFinishAnisotropyDirectionDegrees(overhead.steelFinishMaps),
      summarizeSteelFinishAnisotropyDirectionDegrees(
        rotatedBrush.steelFinishMaps,
      ),
    ) < 52,
    true,
  )
})

test('canvas steel finish maps and normals stay fixed across corner light positions', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'flat',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 0,
    metalBrushAngle: 0,
    metalPolish: 50,
    metalTarnish: 0,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 12, y: 20, width: 240, height: 160 }
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:steel-corner-light-map-stability',
    seed32: 0x55ee1a11,
  } as const
  const renders = MATERIAL_LIGHT_POSITION_REGRESSION_CASES.map(
    ({ label, lightPosition }) => {
      const lightVector =
        createArtworkFrameMaterialHemisphereLightVector(lightPosition)
      const stroke = getArtworkFrameStrokeWidth(
        frame,
        bounds.width,
        bounds.height,
      )
      const pathData = createMetalArtworkFramePathData(frame, bounds, stroke)
      const plan = buildMetalArtworkFrameMaterialPlan({
        bounds,
        clipPathData: pathData,
        frame,
        lightVector,
        materialSeed,
        pathData,
        strokeWidth: stroke,
      })

      assert.ok(plan.canvasTexture?.steelFinishFieldRequest)

      const steelFinishField = buildArtworkFrameSteelFinishField(
        plan.canvasTexture.steelFinishFieldRequest,
      )
      const canvas = createDeterministicMaterialCanvas()
      const rendered = renderArtworkFrameCanvasMaterialTexture(
        {
          ...plan.canvasTexture,
          corrosionFieldRequest: null,
        },
        {
          createCanvas: canvas.createCanvas,
          createPath: (path) => ({ path } as unknown as Path2D),
        },
      )

      assert.ok(rendered.steelFinishMaps)
      assert.ok(rendered.steelFinishNormalInputs)

      return {
        field: steelFinishField,
        label,
        rendered,
      }
    },
  )
  const center = renders[0]!

  for (const current of renders) {
    assert.ok(current.rendered.steelFinishMaps)
    assert.ok(current.rendered.steelFinishNormalInputs)
    assertSteelFinishScalarFieldsEqual(center.field.fields, current.field.fields)
    assertSteelFinishDerivedMapsEqual(
      center.rendered.steelFinishMaps,
      current.rendered.steelFinishMaps,
    )
    assertSteelFinishNormalInputsEqual(
      center.rendered.steelFinishNormalInputs,
      current.rendered.steelFinishNormalInputs,
    )

    if (current.label === 'center') {
      continue
    }

    assert.equal(
      countDifferentBytes(
        center.rendered.imageData.data,
        current.rendered.imageData.data,
      ) > 1000,
      true,
      `${current.label} light should alter only final shaded steel pixels`,
    )
  }
})

test('canvas corrosion shading uses light vectors without moving rust maps', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'flat',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 0,
    metalBrushAngle: 0,
    metalPolish: 42,
    metalTarnish: 84,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 12, y: 20, width: 240, height: 160 }
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:corrosion-light-vector-shading',
    seed32: 0x761c4b9f,
  } as const
  const overheadLight = createArtworkFrameMaterialHemisphereLightVector({
    x: 0,
    y: 0,
  })
  const angledLight = createArtworkFrameMaterialHemisphereLightVector({
    x: 0.5,
    y: 0,
  })
  const grazingLight = createArtworkFrameMaterialHemisphereLightVector({
    x: 1,
    y: 0,
  })
  const render = (lightVector: { x: number; y: number; z: number }) => {
    const stroke = getArtworkFrameStrokeWidth(
      frame,
      bounds.width,
      bounds.height,
    )
    const pathData = createMetalArtworkFramePathData(frame, bounds, stroke)
    const plan = buildMetalArtworkFrameMaterialPlan({
      bounds,
      clipPathData: pathData,
      frame,
      materialSeed,
      pathData,
      strokeWidth: stroke,
    })

    assert.ok(plan.canvasTexture?.corrosionFieldRequest)

    const canvas = createDeterministicMaterialCanvas()

    return renderArtworkFrameCanvasMaterialTexture(
      {
        ...plan.canvasTexture,
        lighting: {
          ...plan.canvasTexture.lighting,
          lightVector,
          metalLightAngle: 0,
        },
      },
      {
        createCanvas: canvas.createCanvas,
        createPath: (path) => ({ path } as unknown as Path2D),
      },
    )
  }
  const overhead = render(overheadLight)
  const repeatedOverhead = render(overheadLight)
  const angled = render(angledLight)
  const grazing = render(grazingLight)

  assert.ok(overhead.corrosionMaps)
  assert.ok(repeatedOverhead.corrosionMaps)
  assert.ok(angled.corrosionMaps)
  assert.ok(grazing.corrosionMaps)
  assert.ok(overhead.descriptor.corrosionFieldRequest)
  assert.ok(angled.descriptor.corrosionFieldRequest)
  assert.ok(grazing.descriptor.corrosionFieldRequest)

  const overheadField = buildArtworkFrameCorrosionField(
    overhead.descriptor.corrosionFieldRequest,
  )
  const angledField = buildArtworkFrameCorrosionField(
    angled.descriptor.corrosionFieldRequest,
  )
  const grazingField = buildArtworkFrameCorrosionField(
    grazing.descriptor.corrosionFieldRequest,
  )
  const baseImageData = createTestCorrosionImageData(
    overhead.corrosionMaps.widthPixels,
    overhead.corrosionMaps.heightPixels,
    overheadField.fields.frameMask,
  )
  const overheadCorrosionOnly = shadeArtworkFrameCorrosionImageData(
    cloneImageData(baseImageData),
    overhead.corrosionMaps,
    { lightVector: overheadLight },
  )
  const angledCorrosionOnly = shadeArtworkFrameCorrosionImageData(
    cloneImageData(baseImageData),
    overhead.corrosionMaps,
    { lightVector: angledLight },
  )
  const grazingCorrosionOnly = shadeArtworkFrameCorrosionImageData(
    cloneImageData(baseImageData),
    overhead.corrosionMaps,
    { lightVector: grazingLight },
  )
  const flakeRoughness = summarizeFlakeRoughnessRoles(
    overheadField.fields,
    overhead.corrosionMaps,
  )

  assertCorrosionGeometryFieldsEqual(overheadField.fields, angledField.fields)
  assertCorrosionGeometryFieldsEqual(overheadField.fields, grazingField.fields)
  assertCorrosionDerivedMapsEqual(
    overhead.corrosionMaps,
    repeatedOverhead.corrosionMaps,
  )
  assertCorrosionDerivedMapsEqual(overhead.corrosionMaps, angled.corrosionMaps)
  assertCorrosionDerivedMapsEqual(overhead.corrosionMaps, grazing.corrosionMaps)
  assertCorrosionGeometryMapsEqual(overhead.corrosionMaps, angled.corrosionMaps)
  assertCorrosionGeometryMapsEqual(overhead.corrosionMaps, grazing.corrosionMaps)
  assert.equal(
    countDifferentBytes(
      overhead.imageData.data,
      repeatedOverhead.imageData.data,
    ),
    0,
  )
  assert.equal(
    countDifferentBytes(overhead.imageData.data, angled.imageData.data) > 1000,
    true,
  )
  assert.equal(
    countDifferentBytes(angled.imageData.data, grazing.imageData.data) > 1000,
    true,
  )
  assert.equal(
    countDifferentBytes(
      overheadCorrosionOnly.data,
      angledCorrosionOnly.data,
    ) > 40,
    true,
  )
  assert.equal(
    countDifferentBytes(
      angledCorrosionOnly.data,
      grazingCorrosionOnly.data,
    ) > 40,
    true,
  )
  let outsidePixelCount = 0
  let outsideBleedCount = 0

  for (
    let index = 0;
    index < overheadField.fields.frameMask.length;
    index += 1
  ) {
    if ((overheadField.fields.frameMask[index] ?? 0) > 0) {
      continue
    }

    outsidePixelCount += 1

    for (let channel = 0; channel < 4; channel += 1) {
      const dataIndex = index * 4 + channel

      if (
        (grazingCorrosionOnly.data[dataIndex] ?? 0) !==
          (baseImageData.data[dataIndex] ?? 0)
      ) {
        outsideBleedCount += 1
      }
    }
  }

  assert.equal(outsidePixelCount > 0, true)
  assert.equal(outsideBleedCount, 0)
  assert.equal(flakeRoughness.rustScaleWeight > 120, true)
  assert.equal(flakeRoughness.exposedChipWeight > 0.35, true)
  assert.equal(flakeRoughness.rustScaleRoughnessMean > 0.9, true)
  assert.equal(
    flakeRoughness.exposedChipRoughnessMean <
      flakeRoughness.rustScaleRoughnessMean * 0.62,
    true,
  )
})

test('canvas corrosion maps and flakes stay fixed across corner light positions', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'flat',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 0,
    metalBrushAngle: 0,
    metalPolish: 42,
    metalTarnish: 84,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 12, y: 20, width: 240, height: 160 }
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:corrosion-corner-light-map-stability',
    seed32: 0xf1a4e5d2,
  } as const
  const renders = MATERIAL_LIGHT_POSITION_REGRESSION_CASES.map(
    ({ label, lightPosition }) => {
      const lightVector =
        createArtworkFrameMaterialHemisphereLightVector(lightPosition)
      const stroke = getArtworkFrameStrokeWidth(
        frame,
        bounds.width,
        bounds.height,
      )
      const pathData = createMetalArtworkFramePathData(frame, bounds, stroke)
      const plan = buildMetalArtworkFrameMaterialPlan({
        bounds,
        clipPathData: pathData,
        frame,
        lightVector,
        materialSeed,
        pathData,
        strokeWidth: stroke,
      })

      assert.ok(plan.canvasTexture?.corrosionFieldRequest)

      const corrosionField = buildArtworkFrameCorrosionField(
        plan.canvasTexture.corrosionFieldRequest,
      )
      const canvas = createDeterministicMaterialCanvas()
      const rendered = renderArtworkFrameCanvasMaterialTexture(
        plan.canvasTexture,
        {
          createCanvas: canvas.createCanvas,
          createPath: (path) => ({ path } as unknown as Path2D),
        },
      )

      assert.ok(rendered.corrosionMaps)

      return {
        field: corrosionField,
        label,
        rendered,
      }
    },
  )
  const center = renders[0]!

  assert.ok(center.rendered.corrosionMaps)
  assert.equal(
    summarizeArtworkFrameCorrosionScalarField(
      center.rendered.corrosionMaps.flakeMask,
    ).max > 0.1,
    true,
  )

  for (const current of renders) {
    assert.ok(current.rendered.corrosionMaps)
    assertCorrosionGeometryFieldsEqual(
      center.field.fields,
      current.field.fields,
    )
    assertCorrosionDerivedMapsEqual(
      center.rendered.corrosionMaps,
      current.rendered.corrosionMaps,
    )
    for (const flakeMapName of [
      'flakeMask',
      'flakeBodyMask',
      'flakeLipMask',
      'flakeRootMask',
      'flakeUndercutAO',
      'flakeLiftHeight',
      'flakeCurlX',
      'flakeCurlY',
      'flakeCastShadow',
    ] as const) {
      assertFloatFieldsEqual(
        center.rendered.corrosionMaps[flakeMapName],
        current.rendered.corrosionMaps[flakeMapName],
      )
    }

    if (current.label === 'center') {
      continue
    }

    assert.equal(
      countDifferentBytes(
        center.rendered.imageData.data,
        current.rendered.imageData.data,
      ) > 1000,
      true,
      `${current.label} light should alter only final shaded corrosion pixels`,
    )
  }
})

test('preview and export canvas material descriptors carry matching image seed keys', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 58,
    metalTarnish: 80,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 0, y: 0, width: 240, height: 160 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const pathData = createMetalArtworkFramePathData(frame, bounds, stroke)
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:preview-export-seed',
    seed32: 0x8c9d7e6f,
  } as const
  const previewPlan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    materialSeed,
    pathData,
    strokeWidth: stroke,
  })
  const exportPlan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    materialSeed,
    pathData,
    strokeWidth: stroke,
  })

  assert.ok(previewPlan.canvasTexture)
  assert.ok(exportPlan.canvasTexture)
  assert.deepEqual(previewPlan.canvasTexture.materialSeed, materialSeed)
  assert.deepEqual(exportPlan.canvasTexture.materialSeed, materialSeed)
  assert.equal(
    previewPlan.canvasTexture.materialSeed?.key,
    exportPlan.canvasTexture.materialSeed?.key,
  )
  assert.equal(
    previewPlan.canvasTexture.corrosionFieldRequest?.materialSeed?.key,
    materialSeed.key,
  )
  assert.equal(
    previewPlan.canvasTexture.corrosionFieldRequest?.materialSeed?.key,
    exportPlan.canvasTexture.corrosionFieldRequest?.materialSeed?.key,
  )
  assert.equal(
    getArtworkFrameCanvasMaterialTextureKey(previewPlan.canvasTexture),
    getArtworkFrameCanvasMaterialTextureKey(exportPlan.canvasTexture),
  )

  const previewRequest = previewPlan.canvasTexture.corrosionFieldRequest
  const exportRequest = exportPlan.canvasTexture.corrosionFieldRequest

  assert.ok(previewRequest)
  assert.ok(exportRequest)

  const previewField = buildArtworkFrameCorrosionField(previewRequest)
  const exportField = buildArtworkFrameCorrosionField(exportRequest)
  const previewMaps = buildArtworkFrameCorrosionDerivedMaps(previewField)
  const exportMaps = buildArtworkFrameCorrosionDerivedMaps(exportField)

  assertCorrosionGeometryFieldsEqual(previewField.fields, exportField.fields)
  assertCorrosionDerivedMapsEqual(previewMaps, exportMaps)
})

test('fallback canvas material descriptors remain deterministic without image seed', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 58,
    metalTarnish: 80,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 0, y: 0, width: 240, height: 160 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const pathData = createMetalArtworkFramePathData(frame, bounds, stroke)
  const firstPlan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    pathData,
    strokeWidth: stroke,
  })
  const secondPlan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    pathData,
    strokeWidth: stroke,
  })

  assert.ok(firstPlan.canvasTexture)
  assert.ok(secondPlan.canvasTexture)
  assert.equal(firstPlan.canvasTexture.materialSeed, null)
  assert.equal(secondPlan.canvasTexture.materialSeed, null)
  assert.equal(firstPlan.canvasTexture.corrosionFieldRequest?.materialSeed, null)
  assert.equal(secondPlan.canvasTexture.corrosionFieldRequest?.materialSeed, null)
  assert.equal(
    firstPlan.canvasTexture.corrosionFieldRequest?.geometrySeed,
    secondPlan.canvasTexture.corrosionFieldRequest?.geometrySeed,
  )
  assert.equal(
    firstPlan.canvasTexture.corrosionFieldRequest?.geometrySeedKey,
    secondPlan.canvasTexture.corrosionFieldRequest?.geometrySeedKey,
  )
  assert.equal(
    getArtworkFrameCanvasMaterialTextureKey(firstPlan.canvasTexture),
    getArtworkFrameCanvasMaterialTextureKey(secondPlan.canvasTexture),
  )
})

test('canvas steel polish descriptors carry finish field requests for steel', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 58,
    metalTarnish: 24,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 0, y: 0, width: 240, height: 160 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const pathData = createMetalArtworkFramePathData(frame, bounds, stroke)
  const plan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    pathData,
    strokeWidth: stroke,
  })

  assert.ok(plan.canvasTexture)
  assert.ok(plan.canvasTexture.steelFinishFieldRequest)
  assert.equal(
    plan.canvasTexture.steelFinishFieldRequest.geometryInputs.metalType,
    'steel',
  )
  assert.deepEqual(
    ARTWORK_FRAME_STEEL_POLISH_STAGE_KEYS,
    [
      'roughDamaged',
      'scuffedLow',
      'brushedBaseline',
      'fineSatin',
      'semiBright',
      'nearMirror',
    ],
  )
  assert.equal(
    ARTWORK_FRAME_STEEL_FINISH_FIELD_CHANNELS.includes(
      'machiningGrooveField',
    ),
    true,
  )
  assert.equal(
    ARTWORK_FRAME_STEEL_FINISH_DERIVED_MAP_CHANNELS.includes('steelHeight'),
    true,
  )
  assert.equal(
    ARTWORK_FRAME_STEEL_FINISH_DERIVED_MAP_CHANNELS.includes(
      'polishedReflectionMask',
    ),
    true,
  )
})

test('canvas steel polish stage helper clamps slider values into smooth overlapping units', () => {
  const stageUnitSum = (metalPolish: number) => {
    const units = getArtworkFrameSteelPolishStageUnits(metalPolish)

    return ARTWORK_FRAME_STEEL_POLISH_STAGE_KEYS.reduce(
      (sum, stage) => sum + units[stage],
      0,
    )
  }
  const assertUnitRange = (metalPolish: number) => {
    const units = getArtworkFrameSteelPolishStageUnits(metalPolish)

    assert.equal(getArtworkFrameSteelPolishUnit(metalPolish) >= 0, true)
    assert.equal(getArtworkFrameSteelPolishUnit(metalPolish) <= 1, true)

    for (const stage of ARTWORK_FRAME_STEEL_POLISH_STAGE_KEYS) {
      assert.equal(units[stage] >= 0, true, `${stage} below zero`)
      assert.equal(units[stage] <= 1, true, `${stage} above one`)
    }

    assert.equal(stageUnitSum(metalPolish) > 0.99, true)
  }

  for (const metalPolish of [-20, 0, 10, 12, 28, 30, 50, 58, 72, 76, 88, 92, 100, 140]) {
    assertUnitRange(metalPolish)
  }

  assert.equal(getArtworkFrameSteelPolishUnit(-20), 0)
  assert.equal(getArtworkFrameSteelPolishUnit(140), 1)
  assert.equal(
    getArtworkFrameSteelPolishStageUnits(0).roughDamaged,
    1,
  )
  assert.equal(
    getArtworkFrameSteelPolishStageUnits(100).nearMirror,
    1,
  )
})

test('canvas steel polish stage helper overlaps every adjacent stage pair', () => {
  const overlapChecks = [
    {
      left: 'roughDamaged',
      points: [10, 11, 12],
      right: 'scuffedLow',
    },
    {
      left: 'scuffedLow',
      points: [28, 29, 30],
      right: 'brushedBaseline',
    },
    {
      left: 'brushedBaseline',
      points: [54, 56, 58],
      right: 'fineSatin',
    },
    {
      left: 'fineSatin',
      points: [72, 74, 76],
      right: 'semiBright',
    },
    {
      left: 'semiBright',
      points: [88, 90, 92],
      right: 'nearMirror',
    },
  ] as const

  for (const { left, points, right } of overlapChecks) {
    for (const metalPolish of points) {
      const units = getArtworkFrameSteelPolishStageUnits(metalPolish)

      assert.equal(
        units[left] > 0 && units[right] > 0,
        true,
        `${left}/${right} should overlap at ${metalPolish}% polish`,
      )
    }
  }
})

test('canvas steel polish stage helper changes total response smoothly', () => {
  const getTotalResponse = (metalPolish: number) => {
    const units = getArtworkFrameSteelPolishStageUnits(metalPolish)

    return ARTWORK_FRAME_STEEL_POLISH_STAGE_KEYS.reduce(
      (sum, stage) => sum + units[stage],
      0,
    )
  }
  let previousTotal = getTotalResponse(0)
  let maxTotalDelta = 0

  for (let metalPolish = 1; metalPolish <= 100; metalPolish += 1) {
    const total = getTotalResponse(metalPolish)

    maxTotalDelta = Math.max(maxTotalDelta, Math.abs(total - previousTotal))
    previousTotal = total
  }

  assert.equal(maxTotalDelta < 0.36, true)
  assert.equal(getTotalResponse(10) > getTotalResponse(0), true)
  assert.equal(getTotalResponse(12) < getTotalResponse(11), true)
  assert.equal(getTotalResponse(28) > getTotalResponse(26), true)
  assert.equal(getTotalResponse(30) < getTotalResponse(29), true)
  assert.equal(getTotalResponse(72) > getTotalResponse(70), true)
  assert.equal(getTotalResponse(76) < getTotalResponse(75), true)
  assert.equal(getTotalResponse(88) > getTotalResponse(86), true)
  assert.equal(getTotalResponse(92) < getTotalResponse(91), true)
})

test('canvas steel polish groundwork descriptors can carry stable finish requests', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 58,
    metalTarnish: 24,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:steel-finish-seed',
    seed32: 0x3d2c1b0a,
  } as const
  const bounds = { x: 0, y: 0, width: 240, height: 160 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const pathData = createMetalArtworkFramePathData(frame, bounds, stroke)
  const plan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    materialSeed,
    pathData,
    strokeWidth: stroke,
  })

  assert.ok(plan.canvasTexture)

  const finishRequest = createArtworkFrameSteelFinishFieldRequest({
    bounds,
    frame,
    materialSeed,
    samplingBounds: plan.canvasTexture.bounds,
    strokeWidth: stroke,
    textureSize: plan.canvasTexture.textureSize,
  })
  const changedPolishRequest = createArtworkFrameSteelFinishFieldRequest({
    bounds,
    frame: { ...frame, metalPolish: 4 },
    materialSeed,
    samplingBounds: plan.canvasTexture.bounds,
    strokeWidth: stroke,
    textureSize: plan.canvasTexture.textureSize,
  })
  const changedTarnishRequest = createArtworkFrameSteelFinishFieldRequest({
    bounds,
    frame: { ...frame, metalTarnish: 84 },
    materialSeed,
    samplingBounds: plan.canvasTexture.bounds,
    strokeWidth: stroke,
    textureSize: plan.canvasTexture.textureSize,
  })
  const rotatedLightRequest = createArtworkFrameSteelFinishFieldRequest({
    bounds,
    frame: { ...frame, metalLightAngle: 45 },
    materialSeed,
    samplingBounds: plan.canvasTexture.bounds,
    strokeWidth: stroke,
    textureSize: plan.canvasTexture.textureSize,
  })
  const rotatedBrushRequest = createArtworkFrameSteelFinishFieldRequest({
    bounds,
    frame: { ...frame, metalBrushAngle: 82 },
    materialSeed,
    samplingBounds: plan.canvasTexture.bounds,
    strokeWidth: stroke,
    textureSize: plan.canvasTexture.textureSize,
  })

  assert.ok(finishRequest)
  assert.ok(changedPolishRequest)
  assert.ok(changedTarnishRequest)
  assert.ok(rotatedLightRequest)
  assert.ok(rotatedBrushRequest)
  assert.equal(finishRequest.geometrySeedKey.includes(materialSeed.key), true)
  assert.equal(
    finishRequest.stageUnits.brushedBaseline > 0 ||
      finishRequest.stageUnits.fineSatin > 0,
    true,
  )
  assert.equal(
    finishRequest.geometrySeedKey,
    changedPolishRequest.geometrySeedKey,
  )
  assert.equal(
    finishRequest.geometrySeedKey,
    changedTarnishRequest.geometrySeedKey,
  )
  assert.equal(
    finishRequest.geometrySeedKey,
    rotatedLightRequest.geometrySeedKey,
  )
  assert.equal(
    finishRequest.geometrySeedKey,
    rotatedBrushRequest.geometrySeedKey,
  )
  assert.notDeepEqual(
    finishRequest.stageUnits,
    changedPolishRequest.stageUnits,
  )
  assert.ok(plan.canvasTexture.steelFinishFieldRequest)

  const baselineKey = getArtworkFrameCanvasMaterialTextureKey(
    plan.canvasTexture,
  )
  const noFinishTexture = {
    ...plan.canvasTexture,
    steelFinishFieldRequest: null,
  }

  assert.equal(
    plan.canvasTexture.steelFinishFieldRequest.geometrySeedKey,
    finishRequest.geometrySeedKey,
  )
  assert.notEqual(
    getArtworkFrameCanvasMaterialTextureKey(noFinishTexture),
    baselineKey,
  )
})

test('canvas steel finish geometry seed excludes visual response and raster inputs', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 58,
    metalTarnish: 24,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:stable-finish-geometry',
    seed32: 0x0f1e2d3c,
  } as const
  const differentMaterialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:different-stable-finish-geometry',
    seed32: 0x1f2e3d4c,
  } as const
  const bounds = { x: 0, y: 0, width: 240, height: 160 }
  const samplingBounds = { x: -16, y: -14, width: 272, height: 188 }
  const textureSize = { width: 544, height: 376 }
  const strokeWidth = 16
  const getRequest = ({
    requestBounds = bounds,
    requestFrame = frame,
    requestMaterialSeed = materialSeed,
    requestSamplingBounds = samplingBounds,
    requestTextureSize = textureSize,
  }: {
    requestBounds?: typeof bounds
    requestFrame?: typeof frame
    requestMaterialSeed?: typeof materialSeed | typeof differentMaterialSeed
    requestSamplingBounds?: typeof samplingBounds
    requestTextureSize?: typeof textureSize
  } = {}) => {
    const request = createArtworkFrameSteelFinishFieldRequest({
      bounds: requestBounds,
      frame: requestFrame,
      materialSeed: requestMaterialSeed,
      samplingBounds: requestSamplingBounds,
      strokeWidth,
      textureSize: requestTextureSize,
    })

    assert.ok(request)

    return request
  }
  const baseline = getRequest()
  const repeated = getRequest()
  const changedPolish = getRequest({
    requestFrame: { ...frame, metalPolish: 4 },
  })
  const changedTarnish = getRequest({
    requestFrame: { ...frame, metalTarnish: 92 },
  })
  const changedLight = getRequest({
    requestFrame: { ...frame, metalLightAngle: 45 },
  })
  const changedBrush = getRequest({
    requestFrame: { ...frame, metalBrushAngle: 82 },
  })
  const changedBounds = getRequest({
    requestBounds: { x: 48, y: 36, width: 420, height: 260 },
  })
  const changedSamplingBounds = getRequest({
    requestSamplingBounds: { x: -80, y: -60, width: 760, height: 540 },
  })
  const changedTextureSize = getRequest({
    requestTextureSize: { width: 1536, height: 1024 },
  })
  const changedMaterialSeed = getRequest({
    requestMaterialSeed: differentMaterialSeed,
  })

  assert.equal(baseline.geometrySeedKey, repeated.geometrySeedKey)
  assert.equal(baseline.geometrySeed, repeated.geometrySeed)
  assert.equal(baseline.geometrySeedKey.includes(materialSeed.key), true)
  assert.equal(
    baseline.geometrySeedKey,
    changedPolish.geometrySeedKey,
  )
  assert.equal(
    baseline.geometrySeedKey,
    changedTarnish.geometrySeedKey,
  )
  assert.equal(
    baseline.geometrySeedKey,
    changedLight.geometrySeedKey,
  )
  assert.equal(
    baseline.geometrySeedKey,
    changedBrush.geometrySeedKey,
  )
  assert.equal(
    baseline.geometrySeedKey,
    changedBounds.geometrySeedKey,
  )
  assert.equal(
    baseline.geometrySeedKey,
    changedSamplingBounds.geometrySeedKey,
  )
  assert.equal(
    baseline.geometrySeedKey,
    changedTextureSize.geometrySeedKey,
  )
  assert.equal(baseline.geometrySeed, changedTextureSize.geometrySeed)
  assert.notEqual(
    baseline.geometrySeedKey,
    changedMaterialSeed.geometrySeedKey,
  )
  assert.notEqual(baseline.geometrySeed, changedMaterialSeed.geometrySeed)
  assert.equal(changedPolish.polishUnit, 0.04)
  assert.equal(changedTarnish.tarnishUnit, 0.92)
  assert.equal(changedLight.geometrySeedKey.includes('45'), false)
  assert.equal(changedTextureSize.fieldSize.width, 1536)
  assert.equal(changedTextureSize.fieldSize.height, 1024)
})

test('canvas steel substrate geometry seed and cache exclude response raster and light inputs', () => {
  type TestSteelFrame =
    Parameters<typeof createArtworkFrameSteelFinishFieldRequest>[0]['frame']
  const frame: TestSteelFrame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 58,
    metalTarnish: 24,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  }
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:stable-substrate-geometry',
    seed32: 0x10293847,
  } as const
  const differentMaterialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:different-stable-substrate-geometry',
    seed32: 0x56473829,
  } as const
  const bounds = { x: 0, y: 0, width: 240, height: 160 }
  const samplingBounds = { x: -16, y: -14, width: 272, height: 188 }
  const textureSize = { width: 544, height: 376 }
  const strokeWidth = 16
  const getRequest = ({
    requestBounds = bounds,
    requestFrame = frame,
    requestMaterialSeed = materialSeed,
    requestSamplingBounds = samplingBounds,
    requestTextureSize = textureSize,
  }: {
    requestBounds?: typeof bounds
    requestFrame?: TestSteelFrame
    requestMaterialSeed?: typeof materialSeed | typeof differentMaterialSeed
    requestSamplingBounds?: typeof samplingBounds
    requestTextureSize?: typeof textureSize
  } = {}) => {
    const request = createArtworkFrameSteelFinishFieldRequest({
      bounds: requestBounds,
      frame: requestFrame,
      materialSeed: requestMaterialSeed,
      samplingBounds: requestSamplingBounds,
      strokeWidth,
      textureSize: requestTextureSize,
    })

    assert.ok(request)

    return request
  }
  const baseline = getRequest()
  const repeated = getRequest()
  const changedPolish = getRequest({
    requestFrame: { ...frame, metalPolish: 4 },
  })
  const changedTarnish = getRequest({
    requestFrame: { ...frame, metalTarnish: 92 },
  })
  const changedLegacyLightAngle = getRequest({
    requestFrame: { ...frame, metalLightAngle: 45 },
  })
  const changedBrush = getRequest({
    requestFrame: { ...frame, metalBrushAngle: 82 },
  })
  const changedBounds = getRequest({
    requestBounds: { x: 48, y: 36, width: 420, height: 260 },
  })
  const changedSamplingBounds = getRequest({
    requestSamplingBounds: { x: -80, y: -60, width: 760, height: 540 },
  })
  const changedTextureSize = getRequest({
    requestTextureSize: { width: 1536, height: 1024 },
  })
  const changedMaterialSeed = getRequest({
    requestMaterialSeed: differentMaterialSeed,
  })
  const changedMetalIdentity = getRequest({
    requestFrame: { ...frame, metalType: 'blackIron' },
  })
  const changedShape = getRequest({
    requestFrame: { ...frame, shape: 'ellipse' },
  })
  const baselineSubstrateCacheKey =
    getArtworkFrameCanvasMaterialSteelSubstrateGeometryCacheKey(baseline)

  assert.equal(baseline.substrateGeometrySeedKey, repeated.substrateGeometrySeedKey)
  assert.equal(baseline.substrateGeometrySeed, repeated.substrateGeometrySeed)
  assert.equal(
    baseline.substrateGeometrySeedKey.includes(materialSeed.key),
    true,
  )

  for (const current of [
    changedPolish,
    changedTarnish,
    changedLegacyLightAngle,
    changedBrush,
    changedBounds,
    changedSamplingBounds,
    changedTextureSize,
  ]) {
    assert.equal(
      baseline.substrateGeometrySeedKey,
      current.substrateGeometrySeedKey,
    )
    assert.equal(baseline.substrateGeometrySeed, current.substrateGeometrySeed)
    assert.equal(
      baselineSubstrateCacheKey,
      getArtworkFrameCanvasMaterialSteelSubstrateGeometryCacheKey(current),
    )
  }

  assert.notEqual(
    baseline.substrateGeometrySeedKey,
    changedMaterialSeed.substrateGeometrySeedKey,
  )
  assert.notEqual(
    baseline.substrateGeometrySeed,
    changedMaterialSeed.substrateGeometrySeed,
  )
  assert.notEqual(
    baselineSubstrateCacheKey,
    getArtworkFrameCanvasMaterialSteelSubstrateGeometryCacheKey(
      changedMaterialSeed,
    ),
  )
  assert.notEqual(
    baseline.substrateGeometrySeedKey,
    changedMetalIdentity.substrateGeometrySeedKey,
  )
  assert.notEqual(
    baseline.substrateGeometrySeedKey,
    changedShape.substrateGeometrySeedKey,
  )
  assert.equal(changedPolish.polishUnit, 0.04)
  assert.equal(changedTarnish.tarnishUnit, 0.92)
  assert.equal(changedBrush.brushAngleDegrees, 82)
  assert.equal(changedTextureSize.fieldSize.width, 1536)
  assert.equal(changedTextureSize.fieldSize.height, 1024)

  const pathData = createMetalArtworkFramePathData(frame, bounds, strokeWidth)
  const overheadPlan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    lightVector: ARTWORK_FRAME_MATERIAL_OVERHEAD_LIGHT_VECTOR,
    materialSeed,
    pathData,
    strokeWidth,
  })
  const sideLightPlan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    lightVector: createArtworkFrameMaterialHemisphereLightVector({
      x: -0.85,
      y: 0.85,
    }),
    materialSeed,
    pathData,
    strokeWidth,
  })

  assert.ok(overheadPlan.canvasTexture?.steelFinishFieldRequest)
  assert.ok(sideLightPlan.canvasTexture?.steelFinishFieldRequest)
  assert.equal(
    overheadPlan.canvasTexture.steelFinishFieldRequest.substrateGeometrySeedKey,
    sideLightPlan.canvasTexture.steelFinishFieldRequest.substrateGeometrySeedKey,
  )
  assert.equal(
    getArtworkFrameCanvasMaterialSteelSubstrateGeometryCacheKey(
      overheadPlan.canvasTexture.steelFinishFieldRequest,
    ),
    getArtworkFrameCanvasMaterialSteelSubstrateGeometryCacheKey(
      sideLightPlan.canvasTexture.steelFinishFieldRequest,
    ),
  )
})

test('canvas steel substrate field geometry is stable across polish tarnish and light', () => {
  type TestSteelFrame =
    Parameters<typeof createArtworkFrameSteelFinishFieldRequest>[0]['frame']
  const frame: TestSteelFrame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 50,
    metalTarnish: 24,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  }
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:stable-substrate-field',
    seed32: 0x6d4c2b18,
  } as const
  const bounds = { x: 0, y: 0, width: 240, height: 160 }
  const samplingBounds = { x: 0, y: 0, width: 240, height: 160 }
  const textureSize = { width: 96, height: 64 }
  const strokeWidth = 24
  const buildField = (requestFrame: TestSteelFrame) => {
    const request = createArtworkFrameSteelFinishFieldRequest({
      bounds,
      frame: requestFrame,
      materialSeed,
      samplingBounds,
      strokeWidth,
      textureSize,
    })

    assert.ok(request)

    return buildArtworkFrameSteelSubstrateField(request)
  }
  const polish0 = buildField({ ...frame, metalPolish: 0 })
  const polish10 = buildField({ ...frame, metalPolish: 10 })
  const polish25 = buildField({ ...frame, metalPolish: 25 })
  const polish30 = buildField({ ...frame, metalPolish: 30 })
  const polish50 = buildField({ ...frame, metalPolish: 50 })
  const tarnish0 = buildField({ ...frame, metalTarnish: 0 })
  const tarnish100 = buildField({ ...frame, metalTarnish: 100 })
  const light45 = buildField({ ...frame, metalLightAngle: 45 })
  const light180 = buildField({ ...frame, metalLightAngle: 180 })

  assertSteelSubstrateFieldsEqual(polish50, polish0)
  assertSteelSubstrateFieldsEqual(polish50, polish10)
  assertSteelSubstrateFieldsEqual(polish50, polish25)
  assertSteelSubstrateFieldsEqual(polish50, polish30)
  assertSteelSubstrateFieldsEqual(polish50, tarnish0)
  assertSteelSubstrateFieldsEqual(polish50, tarnish100)
  assertSteelSubstrateFieldsEqual(polish50, light45)
  assertSteelSubstrateFieldsEqual(polish50, light180)
})

test('canvas steel substrate field changes with material seed and stays clipped to the frame ring', () => {
  type TestSteelFrame =
    Parameters<typeof createArtworkFrameSteelFinishFieldRequest>[0]['frame']
  const frame: TestSteelFrame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 50,
    metalTarnish: 24,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  }
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:substrate-field-seed-a',
    seed32: 0x7d5a3210,
  } as const
  const differentMaterialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:substrate-field-seed-b',
    seed32: 0x123a5c7d,
  } as const
  const bounds = { x: 0, y: 0, width: 240, height: 160 }
  const samplingBounds = { x: 0, y: 0, width: 240, height: 160 }
  const textureSize = { width: 96, height: 64 }
  const strokeWidth = 24
  const buildRequest = (
    requestMaterialSeed: typeof materialSeed | typeof differentMaterialSeed,
  ) => {
    const request = createArtworkFrameSteelFinishFieldRequest({
      bounds,
      frame,
      materialSeed: requestMaterialSeed,
      samplingBounds,
      strokeWidth,
      textureSize,
    })

    assert.ok(request)

    return request
  }
  const request = buildRequest(materialSeed)
  const substrateField = buildArtworkFrameSteelSubstrateField(request)
  const changedSeedField = buildArtworkFrameSteelSubstrateField(
    buildRequest(differentMaterialSeed),
  )
  const finishField = buildArtworkFrameSteelFinishField(request)
  const microStrandSummary = summarizeArtworkFrameCorrosionScalarField(
    substrateField.fields.substrateMicroStrandMask,
  )
  const continuitySummary = summarizeArtworkFrameCorrosionScalarField(
    substrateField.fields.substrateGrainContinuity,
  )
  const hazeSummary = summarizeArtworkFrameCorrosionScalarField(
    substrateField.fields.substratePlateHaze,
  )
  const inclusionSummary = summarizeArtworkFrameCorrosionScalarField(
    substrateField.fields.substrateInclusionNoise,
  )
  const reflectionSummary = summarizeArtworkFrameCorrosionScalarField(
    substrateField.fields.substrateReflectionVeil,
  )
  const roughnessSummary = summarizeArtworkFrameCorrosionScalarField(
    substrateField.fields.substrateRoughnessVariation,
  )
  const heightSummary = summarizeArtworkFrameCorrosionScalarField(
    substrateField.fields.substrateHeightVariation,
  )
  const anisotropyAspectSummary = summarizeArtworkFrameCorrosionScalarField(
    substrateField.fields.substrateAnisotropyAspect,
  )
  let framePixelCount = 0
  let directionMagnitudeError = 0

  assert.equal(
    ARTWORK_FRAME_STEEL_SUBSTRATE_FIELD_CHANNELS.some((channel) =>
      /scratch|gouge|dent|pit|scuff|burr/i.test(channel)
    ),
    false,
  )
  assert.equal(
    countDifferentSteelSubstrateValues(substrateField, changedSeedField) > 500,
    true,
  )
  assert.equal(substrateField.widthPixels, textureSize.width)
  assert.equal(substrateField.heightPixels, textureSize.height)
  assert.equal(microStrandSummary.max > 0.05, true)
  assert.equal(continuitySummary.mean > 0.05, true)
  assert.equal(hazeSummary.mean > 0.05, true)
  assert.equal(inclusionSummary.max > 0.05, true)
  assert.equal(reflectionSummary.mean > 0.05, true)
  assert.equal(roughnessSummary.mean > 0.05, true)
  assert.equal(heightSummary.max > heightSummary.min, true)
  assert.equal(anisotropyAspectSummary.mean > 0.05, true)

  for (let index = 0; index < finishField.fields.frameMask.length; index += 1) {
    if ((finishField.fields.frameMask[index] ?? 0) <= 0) {
      for (const channel of ARTWORK_FRAME_STEEL_SUBSTRATE_FIELD_CHANNELS) {
        assert.equal(substrateField.fields[channel][index], 0)
      }

      continue
    }

    framePixelCount += 1
    directionMagnitudeError = Math.max(
      directionMagnitudeError,
      Math.abs(
        Math.hypot(
          substrateField.fields.substrateLayDirectionX[index] ?? 0,
          substrateField.fields.substrateLayDirectionY[index] ?? 0,
        ) - 1,
      ),
    )
  }

  assert.equal(framePixelCount > 0, true)
  assert.equal(directionMagnitudeError < 0.000001, true)
})

test('canvas steel substrate derived maps exist for steel blackIron and no-op unsupported metals', () => {
  type TestSteelFrame =
    Parameters<typeof createArtworkFrameSteelFinishFieldRequest>[0]['frame']
  const frame: TestSteelFrame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 50,
    metalTarnish: 24,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  }
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:substrate-derived-map-existence',
    seed32: 0x43218765,
  } as const
  const bounds = { x: 0, y: 0, width: 240, height: 160 }
  const samplingBounds = { x: 0, y: 0, width: 240, height: 160 }
  const textureSize = { width: 96, height: 64 }
  const strokeWidth = 24
  const buildMaps = (requestFrame: TestSteelFrame) => {
    const request = createArtworkFrameSteelFinishFieldRequest({
      bounds,
      frame: requestFrame,
      materialSeed,
      samplingBounds,
      strokeWidth,
      textureSize,
    })

    assert.ok(request)

    const field = buildArtworkFrameSteelFinishField(request)

    return {
      field,
      maps: buildArtworkFrameSteelSubstrateDerivedMaps(field),
    }
  }

  for (const metalType of ['steel', 'blackIron'] as const) {
    const { field, maps } = buildMaps({ ...frame, metalType })
    let framePixelCount = 0

    assert.equal(maps.widthPixels, textureSize.width)
    assert.equal(maps.heightPixels, textureSize.height)
    assert.equal(maps.steelSubstrateAlbedo.length, textureSize.width *
      textureSize.height * 3)

    for (const channel of ARTWORK_FRAME_STEEL_SUBSTRATE_DERIVED_MAP_CHANNELS) {
      assert.equal(
        maps[channel].length,
        channel === 'steelSubstrateAlbedo'
          ? textureSize.width * textureSize.height * 3
          : textureSize.width * textureSize.height,
      )
    }

    assert.equal(
      summarizeArtworkFrameCorrosionScalarField(
        maps.steelSubstrateMicroStrandMask,
      ).max > 0.05,
      true,
    )
    assert.equal(
      summarizeArtworkFrameCorrosionScalarField(
        maps.steelSubstrateRoughness,
      ).mean > 0.05,
      true,
    )
    assert.equal(
      summarizeArtworkFrameCorrosionScalarField(maps.steelSubstrateGloss).mean >
        0.01,
      true,
    )
    assert.equal(
      summarizeArtworkFrameCorrosionScalarField(
        maps.steelSubstrateNormalStrength,
      ).mean > 0.01,
      true,
    )

    for (let index = 0; index < field.fields.frameMask.length; index += 1) {
      if ((field.fields.frameMask[index] ?? 0) <= 0) {
        for (const channel of ARTWORK_FRAME_STEEL_SUBSTRATE_DERIVED_MAP_CHANNELS) {
          if (channel === 'steelSubstrateAlbedo') {
            assert.equal(maps.steelSubstrateAlbedo[index * 3], 0)
            assert.equal(maps.steelSubstrateAlbedo[index * 3 + 1], 0)
            assert.equal(maps.steelSubstrateAlbedo[index * 3 + 2], 0)
          } else {
            assert.equal(maps[channel][index], 0)
          }
        }

        continue
      }

      framePixelCount += 1
    }

    assert.equal(framePixelCount > 0, true)
  }

  const unsupportedRequest = createArtworkFrameSteelFinishFieldRequest({
    bounds,
    frame: { ...frame, metalType: 'gold' },
    materialSeed,
    samplingBounds,
    strokeWidth,
    textureSize,
  })
  const unsupportedMaps = createArtworkFrameSteelEmptySubstrateDerivedMaps({
    heightPixels: textureSize.height,
    widthPixels: textureSize.width,
  })

  assert.equal(
    ARTWORK_FRAME_STEEL_SUBSTRATE_DERIVED_MAP_CHANNELS.some((channel) =>
      /scratch|gouge|dent|pit|scuff|burr|trough|pocket|visible/i.test(channel)
    ),
    false,
  )
  assert.equal(unsupportedRequest, null)
  for (const channel of ARTWORK_FRAME_STEEL_SUBSTRATE_DERIVED_MAP_CHANNELS) {
    assert.equal(countNonZeroValues(unsupportedMaps[channel]), 0)
  }
})

test('canvas steel substrate derived maps keep placement fixed while polish changes response', () => {
  type TestSteelFrame =
    Parameters<typeof createArtworkFrameSteelFinishFieldRequest>[0]['frame']
  const frame: TestSteelFrame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 50,
    metalTarnish: 24,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  }
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:substrate-derived-map-response',
    seed32: 0x73625140,
  } as const
  const bounds = { x: 0, y: 0, width: 240, height: 160 }
  const samplingBounds = { x: 0, y: 0, width: 240, height: 160 }
  const textureSize = { width: 96, height: 64 }
  const strokeWidth = 24
  const buildMaps = (requestFrame: TestSteelFrame) => {
    const request = createArtworkFrameSteelFinishFieldRequest({
      bounds,
      frame: requestFrame,
      materialSeed,
      samplingBounds,
      strokeWidth,
      textureSize,
    })

    assert.ok(request)

    const field = buildArtworkFrameSteelFinishField(request)

    return buildArtworkFrameSteelSubstrateDerivedMaps(field)
  }
  const polishMaps = [0, 10, 25, 30, 50, 75, 100].map((metalPolish) => ({
    albedoMean: getMeanFloatValue(
      buildMaps({ ...frame, metalPolish }).steelSubstrateAlbedo,
    ),
    ambientOcclusionMean: getMeanFloatValue(
      buildMaps({ ...frame, metalPolish }).steelSubstrateAmbientOcclusion,
    ),
    glossMean: getMeanFloatValue(
      buildMaps({ ...frame, metalPolish }).steelSubstrateGloss,
    ),
    heightMean: getMeanAbsoluteFloatValue(
      buildMaps({ ...frame, metalPolish }).steelSubstrateHeight,
    ),
    maps: buildMaps({ ...frame, metalPolish }),
    normalStrengthMean: getMeanFloatValue(
      buildMaps({ ...frame, metalPolish }).steelSubstrateNormalStrength,
    ),
    roughnessMean: getMeanFloatValue(
      buildMaps({ ...frame, metalPolish }).steelSubstrateRoughness,
    ),
  }))
  const baseline = polishMaps[0]!.maps
  const light45 = buildMaps({ ...frame, metalLightAngle: 45 })
  const light180 = buildMaps({ ...frame, metalLightAngle: 180 })

  for (const current of polishMaps.slice(1)) {
    assertSteelSubstratePlacementMapsEqual(baseline, current.maps)
  }

  assertSteelSubstrateDerivedMapsEqual(polishMaps[4]!.maps, light45)
  assertSteelSubstrateDerivedMapsEqual(polishMaps[4]!.maps, light180)

  for (let index = 1; index < polishMaps.length; index += 1) {
    const previous = polishMaps[index - 1]!
    const current = polishMaps[index]!

    assert.equal(current.albedoMean >= previous.albedoMean, true)
    assert.equal(current.glossMean >= previous.glossMean, true)
    assert.equal(current.roughnessMean <= previous.roughnessMean, true)
    assert.equal(
      current.ambientOcclusionMean <= previous.ambientOcclusionMean,
      true,
    )
    assert.equal(current.heightMean <= previous.heightMean, true)
    assert.equal(
      current.normalStrengthMean <= previous.normalStrengthMean,
      true,
    )
  }

  assert.equal(
    polishMaps[0]!.roughnessMean > polishMaps[polishMaps.length - 1]!.roughnessMean,
    true,
  )
  assert.equal(
    polishMaps[polishMaps.length - 1]!.glossMean > polishMaps[0]!.glossMean,
    true,
  )
  assert.equal(
    polishMaps[polishMaps.length - 1]!.albedoMean > polishMaps[0]!.albedoMean,
    true,
  )
})

test('canvas steel substrate maps do not own isolated pore-like speckles', () => {
  type TestSteelFrame =
    Parameters<typeof createArtworkFrameSteelFinishFieldRequest>[0]['frame']
  const frame: TestSteelFrame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 50,
    metalTarnish: 0,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  }
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:substrate-speckle-guard',
    seed32: 0x51a7716d,
  } as const
  const request = createArtworkFrameSteelFinishFieldRequest({
    bounds: { x: 0, y: 0, width: 240, height: 160 },
    frame,
    materialSeed,
    samplingBounds: { x: 0, y: 0, width: 240, height: 160 },
    strokeWidth: 24,
    textureSize: { width: 96, height: 64 },
  })

  assert.ok(request)

  const field = buildArtworkFrameSteelFinishField(request)
  const substrateMaps = buildArtworkFrameSteelSubstrateDerivedMaps(field)
  const inclusionPeaks = summarizeIsolatedPositiveScalarPeaks(
    substrateMaps.steelSubstrateInclusionNoise,
    field.fields.frameMask,
    substrateMaps.widthPixels,
    substrateMaps.heightPixels,
    {
      contrastThreshold: 0.05,
      valueThreshold: 0.05,
    },
  )
  const aoPeaks = summarizeIsolatedPositiveScalarPeaks(
    substrateMaps.steelSubstrateAmbientOcclusion,
    field.fields.frameMask,
    substrateMaps.widthPixels,
    substrateMaps.heightPixels,
    {
      contrastThreshold: 0.004,
      valueThreshold: 0.008,
    },
  )
  const heightContrast = summarizeScalarLocalContrast(
    substrateMaps.steelSubstrateHeight,
    field.fields.frameMask,
    substrateMaps.widthPixels,
    substrateMaps.heightPixels,
  )
  const normalStrengthPeaks = summarizeIsolatedPositiveScalarPeaks(
    substrateMaps.steelSubstrateNormalStrength,
    field.fields.frameMask,
    substrateMaps.widthPixels,
    substrateMaps.heightPixels,
    {
      contrastThreshold: 0.005,
      valueThreshold: 0.01,
    },
  )

  assert.equal(
    inclusionPeaks.isolatedPeakCount <= 3,
    true,
    `substrate inclusion noise should not own dot-like features; found ${inclusionPeaks.isolatedPeakCount}`,
  )
  assert.equal(
    aoPeaks.isolatedPeakCount <= 12,
    true,
    `substrate AO should not contain isolated speckle peaks; found ${aoPeaks.isolatedPeakCount}`,
  )
  assert.equal(
    heightContrast.maxPositiveContrast <= 0.003,
    true,
    `substrate height should not contain isolated pit-like relief; max contrast ${heightContrast.maxPositiveContrast}`,
  )
  assert.equal(
    normalStrengthPeaks.isolatedPeakCount <= 12,
    true,
    `substrate normal strength should not inherit dot-like relief; found ${normalStrengthPeaks.isolatedPeakCount}`,
  )

  const inactiveDefectDecalMaps = createArtworkFrameSteelEmptyDefectDecalMaps({
    frameMask: field.fields.frameMask,
    heightPixels: field.fieldSize.height,
    widthPixels: field.fieldSize.width,
  })
  const substrateOnlyFinishMaps = buildArtworkFrameSteelFinishDerivedMaps(
    field,
    {
      defectDecalMaps: inactiveDefectDecalMaps,
    },
  )

  assert.equal(
    countNonZeroValues(substrateOnlyFinishMaps.visiblePitDepthMask),
    0,
    'substrate-only steel must not create pit-like height when pit decals are inactive',
  )
  assert.equal(
    countNonZeroValues(substrateOnlyFinishMaps.visiblePitAmbientOcclusionMask),
    0,
    'substrate-only steel must not create pit-like AO when pit decals are inactive',
  )
  assert.equal(
    countNonZeroValues(substrateOnlyFinishMaps.visiblePitShadowMask),
    0,
    'substrate-only steel must not create pit-like shadows when pit decals are inactive',
  )
  assert.equal(
    countNonZeroValues(
      substrateOnlyFinishMaps.defectDecalMaps?.activeBodies.pit.bodyMask ??
        new Float32Array(),
    ),
    0,
    'substrate-only steel must keep pit active bodies absent',
  )

  for (
    const channel of ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS
  ) {
    assert.equal(
      countNonZeroValues(
        substrateOnlyFinishMaps.defectDecalMaps?.physicalContributions.pit[
          channel
        ] ?? new Float32Array(),
      ),
      0,
      `substrate-only steel must keep pit ${channel} absent`,
    )
  }
})

test('canvas steel clean substrate composition does not reintroduce legacy dot relief', () => {
  for (const metalPolish of [0, 10, 25, 30, 50] as const) {
    const { cleanSteelMaps } =
      createStage7SubstrateOwnershipPackage(metalPolish)
    const frameMask = new Float32Array(
      cleanSteelMaps.widthPixels * cleanSteelMaps.heightPixels,
    )

    for (let index = 0; index < frameMask.length; index += 1) {
      frameMask[index] = (cleanSteelMaps.steelMetalness[index] ?? 0) > 0
        ? 1
        : 0
    }

    const aoPeaks = summarizeIsolatedPositiveScalarPeaks(
      cleanSteelMaps.steelAmbientOcclusion,
      frameMask,
      cleanSteelMaps.widthPixels,
      cleanSteelMaps.heightPixels,
      {
        contrastThreshold: 0.007,
        valueThreshold: 0.01,
      },
    )
    const heightDepressions = new Float32Array(cleanSteelMaps.steelHeight.length)

    for (let index = 0; index < heightDepressions.length; index += 1) {
      heightDepressions[index] = Math.max(
        0,
        -(cleanSteelMaps.steelHeight[index] ?? 0),
      )
    }

    const heightDepressionPeaks = summarizeIsolatedPositiveScalarPeaks(
      heightDepressions,
      frameMask,
      cleanSteelMaps.widthPixels,
      cleanSteelMaps.heightPixels,
      {
        contrastThreshold: 0.0035,
        valueThreshold: 0.004,
      },
    )
    const machiningDotPeaks = summarizeIsolatedPositiveScalarPeaks(
      cleanSteelMaps.machiningGrooveMask,
      frameMask,
      cleanSteelMaps.widthPixels,
      cleanSteelMaps.heightPixels,
      {
        contrastThreshold: 0.42,
        valueThreshold: 0.44,
      },
    )

    assert.equal(
      aoPeaks.isolatedPeakCount <= 18,
      true,
      `${metalPolish}% clean substrate AO should not contain isolated dot relief; found ${aoPeaks.isolatedPeakCount}`,
    )
    assert.equal(
      heightDepressionPeaks.isolatedPeakCount <= 18,
      true,
      `${metalPolish}% clean substrate height should not contain isolated pit-like dot relief; found ${heightDepressionPeaks.isolatedPeakCount}`,
    )
    assert.equal(
      machiningDotPeaks.isolatedPeakCount <= 8,
      true,
      `${metalPolish}% clean substrate machining mask should be strand-like rather than pixel-dot-like; found ${machiningDotPeaks.isolatedPeakCount}`,
    )

    for (
      const lowPolishDamageMap of [
        cleanSteelMaps.visibleBurrRidgeMask,
        cleanSteelMaps.visibleDentDepthMask,
        cleanSteelMaps.visibleDentShadowMask,
        cleanSteelMaps.visibleGougeDepthMask,
        cleanSteelMaps.visibleGougeShadowMask,
        cleanSteelMaps.visiblePitDepthMask,
        cleanSteelMaps.visiblePitShadowMask,
      ]
    ) {
      assert.equal(
        countNonZeroValues(lowPolishDamageMap),
        0,
        `${metalPolish}% clean substrate should not contain active low-polish damage maps`,
      )
    }
  }
})

test('canvas steel display-resolution preview substrate maps stay free of isolated dot speckles', () => {
  for (const polish of [0, 10, 25, 30, 50] as const) {
    const { rendered } = renderFlatSteelDisplayResolutionPreviewDiagnostic({
      polish,
    })

    assert.ok(rendered.steelFinishMaps)
    assert.ok(rendered.steelFinishMaps.substrateMaps)

    const substrateMaps = rendered.steelFinishMaps.substrateMaps
    const frameMask = new Float32Array(
      rendered.steelFinishMaps.widthPixels *
        rendered.steelFinishMaps.heightPixels,
    )

    for (let index = 0; index < frameMask.length; index += 1) {
      frameMask[index] =
        (rendered.steelFinishMaps.steelMetalness[index] ?? 0) > 0 ? 1 : 0
    }

    const activePixelCount = summarizeMaskedSteelScalar(
      substrateMaps.steelSubstrateAmbientOcclusion,
      frameMask,
    ).activeCount
    const aoPeaks = summarizeIsolatedPositiveScalarPeaks(
      substrateMaps.steelSubstrateAmbientOcclusion,
      frameMask,
      substrateMaps.widthPixels,
      substrateMaps.heightPixels,
      {
        contrastThreshold: 0.004,
        valueThreshold: 0.008,
      },
    )
    const heightDepressions = new Float32Array(
      substrateMaps.steelSubstrateHeight.length,
    )

    for (let index = 0; index < heightDepressions.length; index += 1) {
      heightDepressions[index] = Math.max(
        0,
        -(substrateMaps.steelSubstrateHeight[index] ?? 0),
      )
    }

    const heightDepressionPeaks = summarizeIsolatedPositiveScalarPeaks(
      heightDepressions,
      frameMask,
      substrateMaps.widthPixels,
      substrateMaps.heightPixels,
      {
        contrastThreshold: 0.0035,
        valueThreshold: 0.004,
      },
    )
    const normalStrengthPeaks = summarizeIsolatedPositiveScalarPeaks(
      substrateMaps.steelSubstrateNormalStrength,
      frameMask,
      substrateMaps.widthPixels,
      substrateMaps.heightPixels,
      {
        contrastThreshold: 0.005,
        valueThreshold: 0.01,
      },
    )

    assert.equal(
      aoPeaks.isolatedPeakCount / Math.max(1, activePixelCount) <= 0.0004,
      true,
      `${polish}% display-preview substrate AO should not contain isolated speckle populations; found ${aoPeaks.isolatedPeakCount}`,
    )
    assert.equal(
      heightDepressionPeaks.isolatedPeakCount /
        Math.max(1, activePixelCount) <= 0.0004,
      true,
      `${polish}% display-preview substrate height should not contain isolated pit-like dot relief; found ${heightDepressionPeaks.isolatedPeakCount}`,
    )
    assert.equal(
      normalStrengthPeaks.isolatedPeakCount /
        Math.max(1, activePixelCount) <= 0.0004,
      true,
      `${polish}% display-preview substrate normals should not inherit dot-like relief; found ${normalStrengthPeaks.isolatedPeakCount}`,
    )
  }
})

test('canvas steel display-resolution preview keeps 50 percent baseline free of isolated lifted pixels', () => {
  const { rendered } = renderFlatSteelDisplayResolutionPreviewDiagnostic({
    polish: 50,
  })

  assert.ok(rendered.steelFinishMaps)

  const lift = countIsolatedSubtleSteelPixelLift(
    rendered.imageData,
    rendered.steelFinishMaps,
  )

  assert.equal(
    lift.isolatedLiftCount / Math.max(1, lift.checkedCount) <= 0.00004,
    true,
    `50% display-preview steel should not contain isolated lifted pixels near the #949ea5-on-#8b969d artifact class; found ${lift.isolatedLiftCount}, max local luma delta ${lift.maxLocalLumaDelta}, max channel delta ${lift.maxChannelDelta}`,
  )
})

test('canvas steel display-resolution preview pit-like material comes only from active pit decals', () => {
  for (const polish of [0, 10, 25, 30, 50] as const) {
    const { rendered } = renderFlatSteelDisplayResolutionPreviewDiagnostic({
      polish,
    })

    assert.ok(rendered.steelFinishMaps)
    assert.ok(rendered.steelFinishMaps.defectDecalMaps)

    const { defectDecalMaps, visiblePitAmbientOcclusionMask, visiblePitDepthMask, visiblePitShadowMask } =
      rendered.steelFinishMaps
    let inactivePitPhysicalPixels = 0
    let activePitPixels = 0

    for (
      let index = 0;
      index < rendered.steelFinishMaps.widthPixels *
        rendered.steelFinishMaps.heightPixels;
      index += 1
    ) {
      const activePitPresence = Math.max(
        defectDecalMaps.activeBodies.pit.presenceMask[index] ?? 0,
        defectDecalMaps.activeBodies.pit.bodyMask[index] ?? 0,
        defectDecalMaps.activeBodies.pit.coreMask[index] ?? 0,
        defectDecalMaps.activeBodies.pit.edgeMask[index] ?? 0,
      )
      const physicalPitPresence = Math.max(
        defectDecalMaps.physicalContributions.pit.height[index] ?? 0,
        defectDecalMaps.physicalContributions.pit.ambientOcclusion[index] ??
          0,
        defectDecalMaps.physicalContributions.pit.rimLight[index] ?? 0,
        defectDecalMaps.physicalContributions.pit.rimShadow[index] ?? 0,
        defectDecalMaps.physicalContributions.pit.roughnessResponse[index] ??
          0,
        defectDecalMaps.physicalContributions.pit.glossResponse[index] ?? 0,
        defectDecalMaps.physicalContributions.pit.albedoResponse[index] ?? 0,
        defectDecalMaps.physicalContributions.pit.selfShadowReceiver[index] ??
          0,
      )
      const visiblePitPresence = Math.max(
        visiblePitAmbientOcclusionMask[index] ?? 0,
        visiblePitDepthMask[index] ?? 0,
        visiblePitShadowMask[index] ?? 0,
      )

      if (activePitPresence > 0) {
        activePitPixels += 1
        continue
      }

      if (physicalPitPresence > 0 || visiblePitPresence > 0) {
        inactivePitPhysicalPixels += 1
      }
    }

    assert.equal(
      inactivePitPhysicalPixels,
      0,
      `${polish}% display-preview pit-like material must be exact-zero outside active pit decals`,
    )
    assert.equal(
      activePitPixels === 0 ||
        summarizeMaskedSteelScalar(
          defectDecalMaps.physicalContributions.pit.height,
          defectDecalMaps.activeBodies.pit.bodyMask,
        ).maxAbs > 0,
      true,
      `${polish}% active pit decals should own pit height when pit bodies are active`,
    )
  }
})

test('canvas steel pit material is owned by active pit decal physical maps', () => {
  type TestSteelFrame =
    Parameters<typeof createArtworkFrameSteelFinishFieldRequest>[0]['frame']
  const frame: TestSteelFrame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 0,
    metalTarnish: 0,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  }
  const request = createArtworkFrameSteelFinishFieldRequest({
    bounds: { x: 0, y: 0, width: 240, height: 160 },
    frame,
    materialSeed: {
      algorithm: 'sha256-image-v1',
      key: 'sha256-image-v1:active-pit-decal-ownership',
      seed32: 0x8a7115ee,
    },
    samplingBounds: { x: 0, y: 0, width: 240, height: 160 },
    strokeWidth: 24,
    textureSize: { width: 96, height: 64 },
  })

  assert.ok(request)

  const field = buildArtworkFrameSteelFinishField(request)
  const pitIndex = field.fields.frameMask.findIndex((value) => value > 0)

  assert.equal(pitIndex >= 0, true)

  const createPitCandidateOnlyMaps = () => {
    const defectDecalMaps = createArtworkFrameSteelEmptyDefectDecalMaps({
      frameMask: field.fields.frameMask,
      heightPixels: field.fieldSize.height,
      widthPixels: field.fieldSize.width,
    })

    defectDecalMaps.stablePlacement.pit.candidateMask[pitIndex] = 1
    defectDecalMaps.stablePlacement.pit.centerlineMask[pitIndex] = 0.92
    defectDecalMaps.stablePlacement.pit.tangentX[pitIndex] = 0.2
    defectDecalMaps.stablePlacement.pit.tangentY[pitIndex] = 0.8
    defectDecalMaps.stablePlacement.pit.sizeClass[pitIndex] = 0.18
    defectDecalMaps.stablePlacement.pit.depthLimit[pitIndex] = 0.74
    defectDecalMaps.stablePlacement.pit.edgeRoughness[pitIndex] = 0.66
    defectDecalMaps.stablePlacement.pit.stageAffinity[pitIndex] = 0.1

    return defectDecalMaps
  }
  const emptyDefectDecalMaps = createArtworkFrameSteelEmptyDefectDecalMaps({
    frameMask: field.fields.frameMask,
    heightPixels: field.fieldSize.height,
    widthPixels: field.fieldSize.width,
  })
  const inactivePitDefectDecalMaps = createPitCandidateOnlyMaps()
  const emptyPitMaps = buildArtworkFrameSteelFinishDerivedMaps(field, {
    defectDecalMaps: emptyDefectDecalMaps,
  })
  const inactivePitMaps = buildArtworkFrameSteelFinishDerivedMaps(field, {
    defectDecalMaps: inactivePitDefectDecalMaps,
  })

  assert.equal(
    countNonZeroValues(
      inactivePitMaps.defectDecalMaps?.stablePlacement.pit.candidateMask ??
        new Float32Array(),
    ) > 0,
    true,
    'stable pit placement candidates may exist in composed steel maps',
  )
  assertSteelFinishDerivedMapsEqual(inactivePitMaps, emptyPitMaps)
  assert.equal(countNonZeroValues(inactivePitMaps.visiblePitDepthMask), 0)
  assert.equal(
    countNonZeroValues(inactivePitMaps.visiblePitAmbientOcclusionMask),
    0,
  )
  assert.equal(countNonZeroValues(inactivePitMaps.visiblePitShadowMask), 0)

  for (
    const channel of ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS
  ) {
    assert.equal(
      countNonZeroValues(
        inactivePitMaps.defectDecalMaps?.physicalContributions.pit[channel] ??
          new Float32Array(),
      ),
      0,
      `inactive pit ${channel} must not affect composed steel maps`,
    )
  }

  const activePitDefectDecalMaps = createPitCandidateOnlyMaps()

  activePitDefectDecalMaps.activeBodies.pit.presenceMask[pitIndex] = 1
  activePitDefectDecalMaps.activeBodies.pit.bodyMask[pitIndex] = 1
  activePitDefectDecalMaps.activeBodies.pit.coreMask[pitIndex] = 1
  activePitDefectDecalMaps.activeBodies.pit.edgeMask[pitIndex] = 0.72
  populateArtworkFrameSteelDefectPhysicalContributionMaps({
    defectDecalMaps: activePitDefectDecalMaps,
    frameMask: field.fields.frameMask,
    metalPolish: 0,
  })

  const activePitMaps = buildArtworkFrameSteelFinishDerivedMaps(field, {
    defectDecalMaps: activePitDefectDecalMaps,
  })

  for (
    const channel of ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS
  ) {
    assert.equal(
      countNonZeroValues(
        activePitMaps.defectDecalMaps?.physicalContributions.pit[channel] ??
          new Float32Array(),
      ) > 0,
      true,
      `active pit ${channel} should be populated before it can affect steel`,
    )
  }
  assert.equal(countNonZeroValues(activePitMaps.visiblePitDepthMask) > 0, true)
  assert.equal(
    countNonZeroValues(activePitMaps.visiblePitAmbientOcclusionMask) > 0,
    true,
  )
  assert.equal(countNonZeroValues(activePitMaps.visiblePitShadowMask) > 0, true)
  assert.equal(
    countDifferentFloatValues(activePitMaps.steelHeight, inactivePitMaps.steelHeight) >
      0,
    true,
    'active pit physical height should be the source of pit-like steelHeight changes',
  )
  assert.equal(
    countDifferentFloatValues(
      activePitMaps.steelAmbientOcclusion,
      inactivePitMaps.steelAmbientOcclusion,
    ) > 0,
    true,
    'active pit physical AO should be the source of pit-like steel AO changes',
  )
})

test('canvas steel substrate maps drive clean-steel base response from 0 to 50 polish', () => {
  type TestSteelFrame =
    Parameters<typeof createArtworkFrameSteelFinishFieldRequest>[0]['frame']
  const frame: TestSteelFrame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 50,
    metalTarnish: 0,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  }
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:substrate-final-base-response',
    seed32: 0x19283746,
  } as const
  const bounds = { x: 0, y: 0, width: 240, height: 160 }
  const samplingBounds = { x: 0, y: 0, width: 240, height: 160 }
  const textureSize = { width: 96, height: 64 }
  const strokeWidth = 24
  const buildMetrics = (metalPolish: number) => {
    const request = createArtworkFrameSteelFinishFieldRequest({
      bounds,
      frame: { ...frame, metalPolish },
      materialSeed,
      samplingBounds,
      strokeWidth,
      textureSize,
    })

    assert.ok(request)

    const field = buildArtworkFrameSteelFinishField(request)
    const maps = buildArtworkFrameSteelFinishDerivedMaps(field)
    const normals = buildArtworkFrameSteelFinishNormalInputs(maps)
    let lumaSum = 0
    let roughnessSum = 0
    let glossSum = 0
    let heightSum = 0
    let normalTiltSum = 0
    let count = 0

    for (let index = 0; index < field.fields.frameMask.length; index += 1) {
      if ((field.fields.frameMask[index] ?? 0) <= 0) {
        continue
      }

      const albedoIndex = index * 3
      const red = maps.steelAlbedo[albedoIndex] ?? 0
      const green = maps.steelAlbedo[albedoIndex + 1] ?? 0
      const blue = maps.steelAlbedo[albedoIndex + 2] ?? 0

      lumaSum += red * 0.2126 + green * 0.7152 + blue * 0.0722
      roughnessSum += maps.steelRoughness[index] ?? 0
      glossSum += maps.steelGloss[index] ?? 0
      heightSum += Math.abs(maps.steelHeight[index] ?? 0)
      normalTiltSum += Math.hypot(
        normals.normalX[index] ?? 0,
        normals.normalY[index] ?? 0,
      )
      count += 1
    }

    assert.equal(count > 0, true)

    return {
      field,
      glossMean: glossSum / count,
      heightMean: heightSum / count,
      lumaMean: lumaSum / count,
      maps,
      normalTiltMean: normalTiltSum / count,
      roughnessMean: roughnessSum / count,
    }
  }
  const checkpoints = [0, 10, 25, 30, 50] as const
  const metrics = checkpoints.map((metalPolish) => ({
    metalPolish,
    ...buildMetrics(metalPolish),
  }))

  for (let index = 1; index < metrics.length; index += 1) {
    const previous = metrics[index - 1]!
    const current = metrics[index]!

    assert.equal(
      current.lumaMean >= previous.lumaMean - 0.006,
      true,
      `Expected clean-steel luma not to dip from ${previous.metalPolish}% (${previous.lumaMean}) to ${current.metalPolish}% (${current.lumaMean}).`,
    )
    assert.equal(
      current.roughnessMean <= previous.roughnessMean + 0.008,
      true,
      `Expected clean-steel roughness not to rise from ${previous.metalPolish}% (${previous.roughnessMean}) to ${current.metalPolish}% (${current.roughnessMean}).`,
    )
    assert.equal(
      current.glossMean >= previous.glossMean - 0.006,
      true,
      `Expected clean-steel gloss not to fall from ${previous.metalPolish}% (${previous.glossMean}) to ${current.metalPolish}% (${current.glossMean}).`,
    )
    assert.equal(
      current.heightMean <= previous.heightMean + 0.0015,
      true,
      `Expected clean-steel height variation not to rise from ${previous.metalPolish}% (${previous.heightMean}) to ${current.metalPolish}% (${current.heightMean}).`,
    )
    assert.equal(
      current.normalTiltMean <= previous.normalTiltMean + 0.0015,
      true,
      `Expected clean-steel normal variation not to rise from ${previous.metalPolish}% (${previous.normalTiltMean}) to ${current.metalPolish}% (${current.normalTiltMean}).`,
    )
  }

  assert.equal(metrics[4]!.lumaMean > metrics[0]!.lumaMean, true)
  assert.equal(metrics[0]!.roughnessMean > metrics[4]!.roughnessMean, true)
  assert.equal(metrics[4]!.glossMean > metrics[0]!.glossMean, true)
  assert.equal(metrics[4]!.heightMean > 0.0005, true)
  assert.equal(metrics[4]!.normalTiltMean > 0.00001, true)

  const defectDecalMaps = createActiveSteelDefectDecalMapsForFinishField(
    metrics[2]!.field,
    25,
  )
  const activeBodySnapshots = new Map<string, Float32Array>()
  const physicalContributionSnapshots = new Map<string, Float32Array>()

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    for (const channel of ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS) {
      activeBodySnapshots.set(
        `${kind}:${channel}`,
        new Float32Array(defectDecalMaps.activeBodies[kind][channel]),
      )
    }

    for (
      const channel of ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS
    ) {
      physicalContributionSnapshots.set(
        `${kind}:${channel}`,
        new Float32Array(defectDecalMaps.physicalContributions[kind][channel]),
      )
    }
  }

  buildArtworkFrameSteelFinishDerivedMaps(metrics[2]!.field, {
    defectDecalMaps,
  })

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    for (const channel of ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS) {
      assertFloatFieldsEqual(
        defectDecalMaps.activeBodies[kind][channel],
        activeBodySnapshots.get(`${kind}:${channel}`)!,
      )
    }

    for (
      const channel of ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS
    ) {
      assertFloatFieldsEqual(
        defectDecalMaps.physicalContributions[kind][channel],
        physicalContributionSnapshots.get(`${kind}:${channel}`)!,
      )
    }
  }
})

test('canvas steel anisotropic substrate shading changes light response without moving maps', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'flat',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 0,
    metalBrushAngle: 18,
    metalPolish: 50,
    metalTarnish: 0,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 12, y: 20, width: 240, height: 160 }
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:anisotropic-substrate-shading',
    seed32: 0x465a7c91,
  } as const
  const render = (
    metalPolish: number,
    lightPosition: { x: number; y: number },
  ) => {
    const nextFrame = { ...frame, metalPolish }
    const stroke = getArtworkFrameStrokeWidth(
      nextFrame,
      bounds.width,
      bounds.height,
    )
    const pathData = createMetalArtworkFramePathData(
      nextFrame,
      bounds,
      stroke,
    )
    const plan = buildMetalArtworkFrameMaterialPlan({
      bounds,
      clipPathData: pathData,
      frame: nextFrame,
      materialSeed,
      pathData,
      strokeWidth: stroke,
    })

    assert.ok(plan.canvasTexture?.steelFinishFieldRequest)

    const canvas = createDeterministicMaterialCanvas()

    return renderArtworkFrameCanvasMaterialTexture(
      {
        ...plan.canvasTexture,
        corrosionFieldRequest: null,
        lighting: {
          lightVector: createArtworkFrameMaterialHemisphereLightVector(
            lightPosition,
          ),
        },
      },
      {
        createCanvas: canvas.createCanvas,
        createPath: (path) => ({ path } as unknown as Path2D),
      },
    )
  }

  for (const metalPolish of [0, 10, 25, 30, 50]) {
    const overhead = render(metalPolish, { x: 0, y: 0 })
    const halfSide = render(metalPolish, { x: 0.5, y: -0.5 })
    const grazing = render(metalPolish, { x: 1, y: -1 })

    assert.ok(overhead.steelFinishMaps)
    assert.ok(halfSide.steelFinishMaps)
    assert.ok(grazing.steelFinishMaps)
    assert.ok(overhead.steelFinishNormalInputs)
    assert.ok(halfSide.steelFinishNormalInputs)
    assert.ok(grazing.steelFinishNormalInputs)
    assertSteelFinishDerivedMapsEqual(
      overhead.steelFinishMaps,
      halfSide.steelFinishMaps,
    )
    assertSteelFinishDerivedMapsEqual(
      overhead.steelFinishMaps,
      grazing.steelFinishMaps,
    )
    assertSteelFinishNormalInputsEqual(
      overhead.steelFinishNormalInputs,
      halfSide.steelFinishNormalInputs,
    )
    assertSteelFinishNormalInputsEqual(
      overhead.steelFinishNormalInputs,
      grazing.steelFinishNormalInputs,
    )
    assertFloatFieldsEqual(
      overhead.steelFinishMaps.steelRoughness,
      grazing.steelFinishMaps.steelRoughness,
    )
    assertFloatFieldsEqual(
      overhead.steelFinishMaps.steelGloss,
      grazing.steelFinishMaps.steelGloss,
    )
    assertFloatFieldsEqual(
      overhead.steelFinishMaps.steelAnisotropyDirectionX,
      grazing.steelFinishMaps.steelAnisotropyDirectionX,
    )
    assertFloatFieldsEqual(
      overhead.steelFinishMaps.steelAnisotropyDirectionY,
      grazing.steelFinishMaps.steelAnisotropyDirectionY,
    )
    assert.equal(
      countDifferentBytes(overhead.imageData.data, halfSide.imageData.data) >
        180,
      true,
      `${metalPolish}% half-side light should alter final shaded pixels.`,
    )
    assert.equal(
      countDifferentBytes(overhead.imageData.data, grazing.imageData.data) >
        180,
      true,
      `${metalPolish}% grazing light should alter final shaded pixels.`,
    )
  }
})

test('canvas steel finish field geometry is stable across polish tarnish and light', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 50,
    metalTarnish: 24,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:stable-finish-field',
    seed32: 0xabcdef12,
  } as const
  const bounds = { x: 0, y: 0, width: 240, height: 160 }
  const samplingBounds = { x: 0, y: 0, width: 240, height: 160 }
  const textureSize = { width: 96, height: 64 }
  const strokeWidth = 24
  const buildField = (requestFrame: typeof frame) => {
    const request = createArtworkFrameSteelFinishFieldRequest({
      bounds,
      frame: requestFrame,
      materialSeed,
      samplingBounds,
      strokeWidth,
      textureSize,
    })

    assert.ok(request)

    return buildArtworkFrameSteelFinishField(request)
  }
  const polish0 = buildField({ ...frame, metalPolish: 0 })
  const polish50 = buildField({ ...frame, metalPolish: 50 })
  const polish100 = buildField({ ...frame, metalPolish: 100 })
  const tarnish0 = buildField({ ...frame, metalTarnish: 0 })
  const tarnish100 = buildField({ ...frame, metalTarnish: 100 })
  const light45 = buildField({ ...frame, metalLightAngle: 45 })
  const light180 = buildField({ ...frame, metalLightAngle: 180 })

  assertSteelFinishScalarFieldsEqual(polish50.fields, polish0.fields)
  assertSteelFinishScalarFieldsEqual(polish50.fields, polish100.fields)
  assertSteelFinishScalarFieldsEqual(polish50.fields, tarnish0.fields)
  assertSteelFinishScalarFieldsEqual(polish50.fields, tarnish100.fields)
  assertSteelFinishScalarFieldsEqual(polish50.fields, light45.fields)
  assertSteelFinishScalarFieldsEqual(polish50.fields, light180.fields)
  assert.notDeepEqual(polish0.stageUnits, polish50.stageUnits)
  assert.notDeepEqual(polish50.stageUnits, polish100.stageUnits)
  assert.notEqual(tarnish0.tarnishUnit, tarnish100.tarnishUnit)
})

test('canvas steel finish field generator creates clipped stable seeded fields', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 50,
    metalTarnish: 24,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:steel-finish-field-a',
    seed32: 0x13579bdf,
  } as const
  const differentMaterialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:steel-finish-field-b',
    seed32: 0x2468ace0,
  } as const
  const bounds = { x: 0, y: 0, width: 240, height: 160 }
  const samplingBounds = { x: 0, y: 0, width: 240, height: 160 }
  const textureSize = { width: 96, height: 64 }
  const strokeWidth = 24
  const buildField = (
    requestMaterialSeed: typeof materialSeed | typeof differentMaterialSeed,
  ) => {
    const request = createArtworkFrameSteelFinishFieldRequest({
      bounds,
      frame,
      materialSeed: requestMaterialSeed,
      samplingBounds,
      strokeWidth,
      textureSize,
    })

    assert.ok(request)

    return buildArtworkFrameSteelFinishField(request)
  }
  const first = buildField(materialSeed)
  const repeated = buildField(materialSeed)
  const differentSeed = buildField(differentMaterialSeed)
  const frameMaskSummary = summarizeArtworkFrameCorrosionScalarField(
    first.fields.frameMask,
  )
  const machiningSummary = summarizeArtworkFrameCorrosionScalarField(
    first.fields.machiningGrooveField,
  )
  const scratchSummary = summarizeArtworkFrameCorrosionScalarField(
    first.fields.scratchCandidateField,
  )
  const gougeSummary = summarizeArtworkFrameCorrosionScalarField(
    first.fields.gougeCandidateField,
  )
  const dentSummary = summarizeArtworkFrameCorrosionScalarField(
    first.fields.dentPocketField,
  )
  const pitSummary = summarizeArtworkFrameCorrosionScalarField(
    first.fields.pitPocketField,
  )
  const cloudSummary = summarizeArtworkFrameCorrosionScalarField(
    first.fields.cloudAbrasionField,
  )
  const reflectionSummary = summarizeArtworkFrameCorrosionScalarField(
    first.fields.buffingReflectionField,
  )
  const protectionSummary = summarizeArtworkFrameCorrosionScalarField(
    first.fields.protectionVisibilityField,
  )

  assertSteelFinishScalarFieldsEqual(first.fields, repeated.fields)
  assert.equal(
    countDifferentSteelFinishScalarValues(
      first.fields,
      differentSeed.fields,
    ) > 500,
    true,
  )
  assert.equal(frameMaskSummary.mean > 0.2, true)
  assert.equal(machiningSummary.max > 0.1, true)
  assert.equal(scratchSummary.max > 0.05, true)
  assert.equal(gougeSummary.max > 0.02, true)
  assert.equal(dentSummary.max > 0.02, true)
  assert.equal(pitSummary.max > 0.05, true)
  assert.equal(cloudSummary.mean > 0.05, true)
  assert.equal(reflectionSummary.mean > 0.05, true)
  assert.equal(protectionSummary.mean > 0.03, true)

  for (let index = 0; index < first.fields.frameMask.length; index += 1) {
    if ((first.fields.frameMask[index] ?? 0) > 0) {
      continue
    }

    for (const fieldName of ARTWORK_FRAME_STEEL_FINISH_FIELD_CHANNELS) {
      assert.equal(first.fields[fieldName][index], 0)
    }
  }
})

test('canvas steel finish maps exist for steel and blackIron descriptors', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 58,
    metalTarnish: 24,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 12, y: 20, width: 240, height: 160 }
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:steel-finish-maps',
    seed32: 0x1a2b3c4d,
  } as const

  for (const metalType of ['steel', 'blackIron'] as const) {
    const materialFrame = { ...frame, metalType }
    const stroke = getArtworkFrameStrokeWidth(
      materialFrame,
      bounds.width,
      bounds.height,
    )
    const pathData = createMetalArtworkFramePathData(
      materialFrame,
      bounds,
      stroke,
    )
    const plan = buildMetalArtworkFrameMaterialPlan({
      bounds,
      clipPathData: pathData,
      frame: materialFrame,
      materialSeed,
      pathData,
      strokeWidth: stroke,
    })
    const recordingCanvas = createRecordingMaterialCanvas()

    assert.ok(plan.canvasTexture)
    assert.ok(plan.canvasTexture.steelFinishFieldRequest)

    const rendered = renderArtworkFrameCanvasMaterialTexture(
      plan.canvasTexture,
      {
        createCanvas: recordingCanvas.createCanvas,
        createPath: (path) => ({ path } as unknown as Path2D),
      },
    )
    const maps = rendered.steelFinishMaps

    assert.ok(maps)
    assert.equal(maps.widthPixels, plan.canvasTexture.textureSize.width)
    assert.equal(maps.heightPixels, plan.canvasTexture.textureSize.height)
    assert.equal(
      maps.steelAlbedo.length,
      plan.canvasTexture.textureSize.width *
        plan.canvasTexture.textureSize.height *
        3,
    )
    assert.equal(
      summarizeArtworkFrameCorrosionScalarField(maps.steelMetalness).mean > 0.1,
      true,
    )
    assert.equal(
      summarizeArtworkFrameCorrosionScalarField(maps.machiningGrooveMask).max >
        0.05,
      true,
    )
    assert.equal(
      summarizeArtworkFrameCorrosionScalarField(maps.steelRoughness).max > 0.1,
      true,
    )
    assert.equal(
      summarizeArtworkFrameCorrosionScalarField(maps.steelGloss).max > 0.02,
      true,
    )
  }
})

test('canvas steel finish mask covers the expanded outer metal ring', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 12,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'flat',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 58,
    metalTarnish: 24,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 0, y: 0, width: 128, height: 96 }
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:steel-finish-expanded-outer-ring',
    seed32: 0x51ee1f00,
  } as const

  for (const shape of ['rectangle', 'circle'] as const) {
    const materialFrame = { ...frame, shape }
    const stroke = getArtworkFrameStrokeWidth(
      materialFrame,
      bounds.width,
      bounds.height,
    )
    const pathData = createMetalArtworkFramePathData(
      materialFrame,
      bounds,
      stroke,
    )
    const plan = buildMetalArtworkFrameMaterialPlan({
      bounds,
      clipPathData: pathData,
      frame: materialFrame,
      materialSeed,
      pathData,
      strokeWidth: stroke,
    })

    assert.ok(plan.canvasTexture?.steelFinishFieldRequest)

    const request = plan.canvasTexture.steelFinishFieldRequest
    const field = buildArtworkFrameSteelFinishField(request)
    const maps = buildArtworkFrameSteelFinishDerivedMaps(field)
    const { innerInset, outerInset } = getMetalArtworkFrameEdgeInsets(stroke)
    const outerLeftUnit = outerInset / bounds.width
    const innerLeftUnit = innerInset / bounds.width
    const outerBandX = outerLeftUnit * 0.5
    const innerBandX = innerLeftUnit * 0.5
    const openingX = innerLeftUnit * 1.35
    const outsideX = outerLeftUnit * 1.35
    const sampleY = 0.5

    assert.equal(
      getMaterialCoordinateFieldValue(
        request,
        field.fields.frameMask,
        outerBandX,
        sampleY,
      ),
      1,
      `${shape} outer band frame mask`,
    )
    assert.equal(
      getMaterialCoordinateFieldValue(
        request,
        field.fields.frameMask,
        innerBandX,
        sampleY,
      ),
      1,
      `${shape} inner band frame mask`,
    )
    assert.equal(
      getMaterialCoordinateFieldValue(
        request,
        maps.steelMetalness,
        outerBandX,
        sampleY,
      ) > 0,
      true,
      `${shape} outer band steel metalness`,
    )
    assert.equal(
      getMaterialCoordinateFieldValue(
        request,
        maps.steelMetalness,
        innerBandX,
        sampleY,
      ) > 0,
      true,
      `${shape} inner band steel metalness`,
    )
    assert.equal(
      getMaterialCoordinateFieldValue(
        request,
        field.fields.frameMask,
        openingX,
        sampleY,
      ),
      0,
      `${shape} artwork opening stays empty`,
    )
    assert.equal(
      getMaterialCoordinateFieldValue(
        request,
        field.fields.frameMask,
        outsideX,
        sampleY,
      ),
      0,
      `${shape} beyond outer edge stays empty`,
    )
  }
})

test('canvas steel finish derived maps are stable across light angle changes', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 58,
    metalTarnish: 24,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:light-stable-finish-maps',
    seed32: 0x33445566,
  } as const
  const bounds = { x: 0, y: 0, width: 240, height: 160 }
  const samplingBounds = { x: 0, y: 0, width: 240, height: 160 }
  const textureSize = { width: 96, height: 64 }
  const strokeWidth = 24
  const buildMaps = (metalLightAngle: number) => {
    const request = createArtworkFrameSteelFinishFieldRequest({
      bounds,
      frame: { ...frame, metalLightAngle },
      materialSeed,
      samplingBounds,
      strokeWidth,
      textureSize,
    })

    assert.ok(request)

    return buildArtworkFrameSteelFinishDerivedMaps(
      buildArtworkFrameSteelFinishField(request),
    )
  }

  assertSteelFinishDerivedMapsEqual(buildMaps(315), buildMaps(45))
  assertSteelFinishDerivedMapsEqual(buildMaps(315), buildMaps(180))
})

test('canvas steel finish polish changes response maps without moving placement masks', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 50,
    metalTarnish: 24,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:polish-response-finish-maps',
    seed32: 0x8899aabb,
  } as const
  const bounds = { x: 0, y: 0, width: 240, height: 160 }
  const samplingBounds = { x: 0, y: 0, width: 240, height: 160 }
  const textureSize = { width: 96, height: 64 }
  const strokeWidth = 24
  const buildMaps = (metalPolish: number) => {
    const request = createArtworkFrameSteelFinishFieldRequest({
      bounds,
      frame: { ...frame, metalPolish },
      materialSeed,
      samplingBounds,
      strokeWidth,
      textureSize,
    })

    assert.ok(request)

    return buildArtworkFrameSteelFinishDerivedMaps(
      buildArtworkFrameSteelFinishField(request),
    )
  }
  const rough = buildMaps(0)
  const brushed = buildMaps(50)
  const polished = buildMaps(100)

  assertSteelFinishPlacementMasksEqual(rough, brushed)
  assertSteelFinishPlacementMasksEqual(brushed, polished)
  assert.equal(
    countDifferentFloatValues(rough.steelRoughness, brushed.steelRoughness) >
      100,
    true,
  )
  assert.equal(
    countDifferentFloatValues(brushed.steelGloss, polished.steelGloss) > 100,
    true,
  )
  assert.equal(
    countDifferentFloatValues(rough.steelHeight, polished.steelHeight) > 100,
    true,
  )
  assert.equal(
    summarizeArtworkFrameCorrosionScalarField(rough.steelRoughness).mean >
      summarizeArtworkFrameCorrosionScalarField(polished.steelRoughness).mean,
    true,
  )
  assert.equal(
    summarizeArtworkFrameCorrosionScalarField(polished.steelGloss).mean >
      summarizeArtworkFrameCorrosionScalarField(rough.steelGloss).mean,
    true,
  )
})

test('canvas steel finish defect masks drive coupled height and ambient occlusion', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 0,
    metalTarnish: 24,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:defect-coupled-finish-maps',
    seed32: 0x55667788,
  } as const
  const bounds = { x: 0, y: 0, width: 240, height: 160 }
  const samplingBounds = { x: 0, y: 0, width: 240, height: 160 }
  const textureSize = { width: 96, height: 64 }
  const strokeWidth = 24
  const request = createArtworkFrameSteelFinishFieldRequest({
    bounds,
    frame,
    materialSeed,
    samplingBounds,
    strokeWidth,
    textureSize,
  })

  assert.ok(request)

  const field = buildArtworkFrameSteelFinishField(request)
  const maps = buildArtworkFrameSteelFinishDerivedMapsWithActiveDefects(
    field,
    frame.metalPolish,
  )
  const defectDecalMaps = getSteelFinishDefectDecalMaps(maps)
  const machiningSummary = summarizeSteelFinishDefectCoupling(
    maps,
    maps.machiningGrooveMask,
    0.2,
  )
  const checks: Array<{
    kind: SteelDefectVisibleCavityKind
    name: string
  }> = [
    {
      kind: 'scratch',
      name: 'scratch troughs',
    },
    {
      kind: 'gouge',
      name: 'gouge troughs',
    },
    {
      kind: 'dent',
      name: 'dent pockets',
    },
    {
      kind: 'pit',
      name: 'pit pockets',
    },
  ]

  assert.equal(machiningSummary.activeCount > 8, true, 'machining grooves')
  assert.equal(
    machiningSummary.activeHeightMean <
      machiningSummary.quietHeightMean - 0.02,
    true,
    'machining grooves',
  )
  assert.equal(
    machiningSummary.activeAoMean > machiningSummary.quietAoMean + 0.015,
    true,
    'machining grooves',
  )

  for (const { kind, name } of checks) {
    const physicalHeight =
      defectDecalMaps.physicalContributions[kind].height
    const physicalAo =
      defectDecalMaps.physicalContributions[kind].ambientOcclusion
    const summary = summarizeSteelFinishDefectCoupling(
      maps,
      physicalHeight,
      0.001,
    )
    const visibleDepth = summarizeSteelFinishMaskedScalarResponse(
      getSteelFinishVisibleDefectDepthMap(maps, kind),
      physicalHeight,
      0.001,
    )
    const visibleAo = summarizeSteelFinishMaskedScalarResponse(
      getSteelFinishVisibleDefectAmbientOcclusionMap(maps, kind),
      physicalAo,
      0.001,
    )

    assert.equal(summary.activeCount > 8, true, name)
    assert.equal(
      summary.activeHeightMean < summary.quietHeightMean - 0.02,
      true,
      name,
    )
    assert.equal(
      summary.activeAoMean > summary.quietAoMean + 0.015,
      true,
      name,
    )
    assert.equal(visibleDepth.count > 8, true, name)
    assert.equal(visibleDepth.max > 0.001, true, name)
    assert.equal(visibleAo.count > 8, true, name)
    assert.equal(visibleAo.max > 0.001, true, name)
  }

  assert.equal(
    summarizeArtworkFrameCorrosionScalarField(maps.burrRidgeMask).max > 0.05,
    true,
  )
})

test('canvas steel finish low polish deepens defect height and AO without moving masks', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 50,
    metalTarnish: 24,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:defect-depth-finish-maps',
    seed32: 0xaabbccdd,
  } as const
  const bounds = { x: 0, y: 0, width: 240, height: 160 }
  const samplingBounds = { x: 0, y: 0, width: 240, height: 160 }
  const textureSize = { width: 96, height: 64 }
  const strokeWidth = 24
  const buildMaps = (metalPolish: number) => {
    const request = createArtworkFrameSteelFinishFieldRequest({
      bounds,
      frame: { ...frame, metalPolish },
      materialSeed,
      samplingBounds,
      strokeWidth,
      textureSize,
    })

    assert.ok(request)

    return buildArtworkFrameSteelFinishDerivedMapsWithActiveDefects(
      buildArtworkFrameSteelFinishField(request),
      metalPolish,
    )
  }
  const lowPolish = buildMaps(0)
  const highPolish = buildMaps(100)
  const lowDefectDecalMaps = getSteelFinishDefectDecalMaps(lowPolish)
  const highDefectDecalMaps = getSteelFinishDefectDecalMaps(highPolish)
  const checks: Array<{
    kind: SteelDefectVisibleCavityKind
    name: string
  }> = [
    {
      kind: 'scratch',
      name: 'scratch troughs',
    },
    {
      kind: 'gouge',
      name: 'gouge troughs',
    },
    {
      kind: 'dent',
      name: 'dent pockets',
    },
    {
      kind: 'pit',
      name: 'pit pockets',
    },
  ]

  assertSteelFinishPlacementMasksEqual(lowPolish, highPolish)

  for (const { kind, name } of checks) {
    const lowHeight =
      lowDefectDecalMaps.physicalContributions[kind].height
    const highHeight =
      highDefectDecalMaps.physicalContributions[kind].height
    const lowAo =
      lowDefectDecalMaps.physicalContributions[kind].ambientOcclusion
    const highAo =
      highDefectDecalMaps.physicalContributions[kind].ambientOcclusion

    const lowSummary = summarizeSteelFinishDepthResponse(
      lowPolish,
      lowHeight,
      0.001,
    )
    const highSummary = summarizeSteelFinishDepthResponse(
      highPolish,
      lowHeight,
      0.001,
    )

    assert.equal(lowSummary.count > 0, true, name)
    assert.equal(
      sumSteelDefectPhysicalContributionValues(
        lowDefectDecalMaps,
        kind,
        'height',
      ) > 0,
      true,
      name,
    )
    assert.equal(
      sumSteelDefectPhysicalContributionValues(
        lowDefectDecalMaps,
        kind,
        'ambientOcclusion',
      ) > 0,
      true,
      name,
    )
    if (kind === 'scratch') {
      assert.equal(
        sumSteelDefectPhysicalContributionValues(
          highDefectDecalMaps,
          kind,
          'height',
        ) <
          sumSteelDefectPhysicalContributionValues(
            lowDefectDecalMaps,
            kind,
            'height',
          ) * 0.002,
        true,
        `${name} should be ultra-faint at 100% polish`,
      )
      assert.equal(
        sumSteelDefectPhysicalContributionValues(
          highDefectDecalMaps,
          kind,
          'ambientOcclusion',
        ) <
          sumSteelDefectPhysicalContributionValues(
            lowDefectDecalMaps,
            kind,
            'ambientOcclusion',
          ) * 0.002,
        true,
        `${name} AO should be ultra-faint at 100% polish`,
      )
    } else {
      assert.equal(
        sumSteelDefectPhysicalContributionValues(
          highDefectDecalMaps,
          kind,
          'height',
        ),
        0,
        name,
      )
      assert.equal(
        sumSteelDefectPhysicalContributionValues(
          highDefectDecalMaps,
          kind,
          'ambientOcclusion',
        ),
        0,
        name,
      )
      assertFloatFieldsEqual(highHeight, highAo)
      assert.equal(
        summarizeArtworkFrameCorrosionScalarField(highHeight).max,
        0,
        name,
      )
      assert.equal(
        summarizeArtworkFrameCorrosionScalarField(highAo).max,
        0,
        name,
      )
    }
    assert.equal(
      lowSummary.negativeHeightMean > highSummary.negativeHeightMean,
      true,
      name,
    )
    assert.equal(
      lowSummary.aoMean > highSummary.aoMean,
      true,
      name,
    )
    assert.equal(
      summarizeArtworkFrameCorrosionScalarField(lowHeight).max >
        summarizeArtworkFrameCorrosionScalarField(highHeight).max,
      true,
      name,
    )
    assert.equal(
      summarizeArtworkFrameCorrosionScalarField(lowAo).max >
        summarizeArtworkFrameCorrosionScalarField(highAo).max,
      true,
      name,
    )
  }
})

test('canvas steel finish visible pit shadows follow physical pit response without moving pit placement', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 50,
    metalTarnish: 0,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:visible-pit-shadow-response',
    seed32: 0x13579bdf,
  } as const
  const bounds = { x: 0, y: 0, width: 240, height: 160 }
  const samplingBounds = { x: 0, y: 0, width: 240, height: 160 }
  const textureSize = { width: 96, height: 64 }
  const strokeWidth = 24
  const buildMaps = (metalPolish: number) => {
    const request = createArtworkFrameSteelFinishFieldRequest({
      bounds,
      frame: { ...frame, metalPolish },
      materialSeed,
      samplingBounds,
      strokeWidth,
      textureSize,
    })

    assert.ok(request)

    return buildArtworkFrameSteelFinishDerivedMapsWithActiveDefects(
      buildArtworkFrameSteelFinishField(request),
      metalPolish,
    )
  }
  const rough = buildMaps(0)
  const brushed = buildMaps(50)
  const mirror = buildMaps(100)
  const roughDefectDecalMaps = getSteelFinishDefectDecalMaps(rough)
  const brushedDefectDecalMaps = getSteelFinishDefectDecalMaps(brushed)
  const mirrorDefectDecalMaps = getSteelFinishDefectDecalMaps(mirror)

  assertFloatFieldsEqual(rough.pitPocketMask, brushed.pitPocketMask)
  assertFloatFieldsEqual(rough.pitPocketMask, mirror.pitPocketMask)
  assertFloatFieldsEqual(
    roughDefectDecalMaps.stablePlacement.pit.candidateMask,
    brushedDefectDecalMaps.stablePlacement.pit.candidateMask,
  )
  assertFloatFieldsEqual(
    roughDefectDecalMaps.stablePlacement.pit.candidateMask,
    mirrorDefectDecalMaps.stablePlacement.pit.candidateMask,
  )
  for (const channel of ARTWORK_FRAME_STEEL_DEFECT_STABLE_PLACEMENT_CHANNELS) {
    assertFloatFieldsEqual(
      roughDefectDecalMaps.stablePlacement.pit[channel],
      brushedDefectDecalMaps.stablePlacement.pit[channel],
    )
    assertFloatFieldsEqual(
      roughDefectDecalMaps.stablePlacement.pit[channel],
      mirrorDefectDecalMaps.stablePlacement.pit[channel],
    )
  }
  assert.equal(
    sumSteelDefectActiveBodyValues(roughDefectDecalMaps, 'pit') >
      sumSteelDefectActiveBodyValues(brushedDefectDecalMaps, 'pit'),
    true,
    'polish should reduce active pit decals without moving placement',
  )
  assert.equal(
    sumSteelDefectActiveBodyValues(brushedDefectDecalMaps, 'pit') >=
      sumSteelDefectActiveBodyValues(mirrorDefectDecalMaps, 'pit'),
    true,
    'mirror polish should not regain active pit decals',
  )
  for (const channel of ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS) {
    assert.equal(
      sumSteelDefectPhysicalContributionValues(
        roughDefectDecalMaps,
        'pit',
        channel,
      ) > 0,
      true,
      `rough pit ${channel} should come from active decal bodies`,
    )
    assert.equal(
      sumSteelDefectPhysicalContributionValues(
        mirrorDefectDecalMaps,
        'pit',
        channel,
      ),
      0,
      `mirror pit ${channel} should be absent when pit decals are inactive`,
    )
  }

  const roughPitCandidates = summarizeArtworkFrameCorrosionScalarField(
    rough.pitPocketMask,
  )
  const roughVisibleDepth = summarizeSteelFinishMaskedScalarResponse(
    rough.visiblePitDepthMask,
    roughDefectDecalMaps.physicalContributions.pit.height,
    0.001,
  )
  const brushedVisibleDepth = summarizeSteelFinishMaskedScalarResponse(
    brushed.visiblePitDepthMask,
    roughDefectDecalMaps.physicalContributions.pit.height,
    0.001,
  )
  const mirrorVisibleDepth = summarizeSteelFinishMaskedScalarResponse(
    mirror.visiblePitDepthMask,
    roughDefectDecalMaps.physicalContributions.pit.height,
    0.001,
  )
  const roughVisibleAo = summarizeSteelFinishMaskedScalarResponse(
    rough.visiblePitAmbientOcclusionMask,
    roughDefectDecalMaps.physicalContributions.pit.ambientOcclusion,
    0.001,
  )
  const mirrorVisibleAo = summarizeSteelFinishMaskedScalarResponse(
    mirror.visiblePitAmbientOcclusionMask,
    roughDefectDecalMaps.physicalContributions.pit.ambientOcclusion,
    0.001,
  )
  const roughVisibleShadow = summarizeSteelFinishMaskedScalarResponse(
    rough.visiblePitShadowMask,
    roughDefectDecalMaps.physicalContributions.pit.ambientOcclusion,
    0.001,
  )
  const brushedVisibleShadow = summarizeSteelFinishMaskedScalarResponse(
    brushed.visiblePitShadowMask,
    roughDefectDecalMaps.physicalContributions.pit.ambientOcclusion,
    0.001,
  )
  const mirrorVisibleShadow = summarizeSteelFinishMaskedScalarResponse(
    mirror.visiblePitShadowMask,
    roughDefectDecalMaps.physicalContributions.pit.ambientOcclusion,
    0.001,
  )
  const roughVisibleBurr = summarizeSteelFinishMaskedScalarResponse(
    rough.visibleBurrRidgeMask,
    roughDefectDecalMaps.physicalContributions.burrNick.height,
    0.001,
  )
  const mirrorVisibleBurr = summarizeSteelFinishMaskedScalarResponse(
    mirror.visibleBurrRidgeMask,
    roughDefectDecalMaps.physicalContributions.burrNick.height,
    0.001,
  )

  assert.equal(roughPitCandidates.max > 0.55, true)
  assert.equal(roughVisibleDepth.count > 0, true)
  assert.equal(
    sumSteelDefectPhysicalContributionValues(
      roughDefectDecalMaps,
      'pit',
      'height',
    ) > 0,
    true,
  )
  assert.equal(
    sumSteelDefectPhysicalContributionValues(
      mirrorDefectDecalMaps,
      'pit',
      'height',
    ),
    0,
  )
  assert.equal(
    roughVisibleDepth.mean > brushedVisibleDepth.mean * 4,
    true,
  )
  assert.equal(
    brushedVisibleDepth.mean >= mirrorVisibleDepth.mean,
    true,
  )
  assert.equal(
    roughVisibleAo.mean > mirrorVisibleAo.mean * 8,
    true,
  )
  assert.equal(
    roughVisibleShadow.mean > brushedVisibleShadow.mean * 4,
    true,
  )
  assert.equal(
    brushedVisibleShadow.mean >= mirrorVisibleShadow.mean,
    true,
  )
  assert.equal(mirrorVisibleDepth.max < 0.006, true)
  assert.equal(mirrorVisibleAo.max < 0.006, true)
  assert.equal(mirrorVisibleShadow.max < 0.012, true)
  assert.equal(
    roughVisibleBurr.mean > mirrorVisibleBurr.mean * 4,
    true,
  )
})

test('canvas steel finish visible defect shadows do not bleed from previous polish stages', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 50,
    metalTarnish: 0,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:visible-defect-shadow-stage-anchors',
    seed32: 0x1234abcd,
  } as const
  const bounds = { x: 0, y: 0, width: 240, height: 160 }
  const samplingBounds = { x: 0, y: 0, width: 240, height: 160 }
  const textureSize = { width: 96, height: 64 }
  const strokeWidth = 24
  const buildMaps = (metalPolish: number) => {
    const request = createArtworkFrameSteelFinishFieldRequest({
      bounds,
      frame: { ...frame, metalPolish },
      materialSeed,
      samplingBounds,
      strokeWidth,
      textureSize,
    })

    assert.ok(request)

    return buildArtworkFrameSteelFinishDerivedMapsWithActiveDefects(
      buildArtworkFrameSteelFinishField(request),
      metalPolish,
    )
  }
  const polish25 = buildMaps(25)
  const polish50 = buildMaps(50)
  const polish75 = buildMaps(75)
  const polish100 = buildMaps(100)
  const defect25 = getSteelFinishDefectDecalMaps(polish25)
  const defect50 = getSteelFinishDefectDecalMaps(polish50)
  const defect75 = getSteelFinishDefectDecalMaps(polish75)
  const defect100 = getSteelFinishDefectDecalMaps(polish100)

  for (const maps of [polish50, polish75, polish100]) {
    assertFloatFieldsEqual(polish25.scratchTroughMask, maps.scratchTroughMask)
    assertFloatFieldsEqual(polish25.gougeTroughMask, maps.gougeTroughMask)
    assertFloatFieldsEqual(polish25.dentPocketMask, maps.dentPocketMask)
    assertFloatFieldsEqual(polish25.pitPocketMask, maps.pitPocketMask)
  }
  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    for (const channel of ARTWORK_FRAME_STEEL_DEFECT_STABLE_PLACEMENT_CHANNELS) {
      assertFloatFieldsEqual(
        defect25.stablePlacement[kind][channel],
        defect50.stablePlacement[kind][channel],
      )
      assertFloatFieldsEqual(
        defect25.stablePlacement[kind][channel],
        defect75.stablePlacement[kind][channel],
      )
      assertFloatFieldsEqual(
        defect25.stablePlacement[kind][channel],
        defect100.stablePlacement[kind][channel],
      )
    }
  }
  assert.equal(
    summarizeArtworkFrameCorrosionScalarField(polish100.scratchTroughMask).max >
      0.9,
    true,
  )
  assert.equal(
    sumSteelDefectPhysicalContributionValues(defect100, 'scratch', 'height') <
      sumSteelDefectPhysicalContributionValues(defect75, 'scratch', 'height') *
        0.12,
    true,
  )
  assert.equal(
    sumSteelDefectPhysicalContributionValues(defect100, 'gouge', 'height'),
    0,
  )
  assert.equal(
    sumSteelDefectPhysicalContributionValues(defect100, 'dent', 'height'),
    0,
  )
  assert.equal(
    sumSteelDefectPhysicalContributionValues(defect100, 'pit', 'height'),
    0,
  )
  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    for (const channel of ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS) {
      if (kind === 'scratch') {
        assert.equal(
          sumSteelDefectActiveBodyValues(defect100, 'scratch') > 0,
          true,
          '100% should retain only ultra-faint scratch/hairline active bodies',
        )
        continue
      }

      assert.equal(
        defect100.activeBodies[kind][channel].some((value) => value !== 0),
        false,
        `${kind}.${channel}`,
      )
    }

    for (const channel of ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS) {
      if (kind === 'scratch' && channel !== 'selfShadowReceiver') {
        assert.equal(
          sumSteelDefectPhysicalContributionValues(defect100, kind, channel) <
            sumSteelDefectPhysicalContributionValues(defect75, kind, channel) *
              0.12,
          true,
          `${kind}.${channel} should be ultra-faint at 100% polish`,
        )
        continue
      }

      assert.equal(
        sumSteelDefectPhysicalContributionValues(defect100, kind, channel),
        0,
        `${kind}.${channel}`,
      )
    }
  }

  const shadow25 = summarizeArtworkFrameCorrosionScalarField(
    polish25.visibleDefectShadowMask,
  )
  const shadow50 = summarizeArtworkFrameCorrosionScalarField(
    polish50.visibleDefectShadowMask,
  )
  const shadow75 = summarizeArtworkFrameCorrosionScalarField(
    polish75.visibleDefectShadowMask,
  )
  const shadow100 = summarizeArtworkFrameCorrosionScalarField(
    polish100.visibleDefectShadowMask,
  )

  assert.equal(shadow25.mean > shadow50.mean * 2, true)
  assert.equal(shadow50.mean > shadow75.mean * 8, true)
  assert.equal(shadow75.mean > shadow100.mean * 1.2, true)
  assert.equal(shadow75.max < 0.06, true)
  assert.equal(shadow100.max < 0.04, true)

  const mirrorScratchShadow = summarizeSteelFinishMaskedScalarResponse(
    polish100.visibleScratchShadowMask,
    defect25.physicalContributions.scratch.height,
    0.001,
  )
  const mirrorGougeShadow = summarizeSteelFinishMaskedScalarResponse(
    polish100.visibleGougeShadowMask,
    defect25.physicalContributions.gouge.height,
    0.001,
  )
  const mirrorDentShadow = summarizeSteelFinishMaskedScalarResponse(
    polish100.visibleDentShadowMask,
    defect25.physicalContributions.dent.height,
    0.001,
  )
  const mirrorPitShadow = summarizeSteelFinishMaskedScalarResponse(
    polish100.visiblePitShadowMask,
    defect25.physicalContributions.pit.height,
    0.001,
  )
  const mirrorRimShadow = summarizeSteelFinishMaskedScalarResponse(
    polish100.visibleScratchRimShadowMask,
    defect25.physicalContributions.scratch.height,
    0.001,
  )
  const buildSelfShadowMap = (maps: ArtworkFrameSteelFinishDerivedMaps) =>
    buildArtworkFrameMaterialHeightSelfShadowMap({
      heightMap: maps.steelHeight,
      heightPixels: maps.heightPixels,
      lightVector: createArtworkFrameMaterialHemisphereLightVector({
        x: 1,
        y: 0,
      }),
      maskMap: maps.steelMetalness,
      strength: 1,
      widthPixels: maps.widthPixels,
    })
  const scratchPhysical25 = summarizeSteelFinishScratchOnlyPhysicalResponse(
    polish25,
    buildSelfShadowMap(polish25),
  )
  const scratchPhysical50 = summarizeSteelFinishScratchOnlyPhysicalResponse(
    polish50,
    buildSelfShadowMap(polish50),
  )
  const scratchPhysical100 = summarizeSteelFinishScratchOnlyPhysicalResponse(
    polish100,
    buildSelfShadowMap(polish100),
  )

  assert.equal(mirrorScratchShadow.count > 0, true)
  assert.equal(mirrorScratchShadow.max < 0.05, true)
  assert.equal(mirrorGougeShadow.max < 0.035, true)
  assert.equal(mirrorDentShadow.max < 0.025, true)
  assert.equal(mirrorPitShadow.max < 0.004, true)
  assert.equal(mirrorRimShadow.max < 0.03, true)
  assert.equal(
    sumSteelDefectPhysicalContributionValues(defect25, 'scratch', 'height') >
      sumSteelDefectPhysicalContributionValues(defect50, 'scratch', 'height'),
    true,
  )
  assert.equal(
    sumSteelDefectPhysicalContributionValues(defect50, 'scratch', 'height') >
      sumSteelDefectPhysicalContributionValues(defect75, 'scratch', 'height'),
    true,
  )
  assert.equal(
    sumSteelDefectPhysicalContributionValues(defect75, 'scratch', 'height') >
      sumSteelDefectPhysicalContributionValues(defect100, 'scratch', 'height'),
    true,
  )
  let receiverProbeIndex = -1

  for (let index = 0; index < polish100.steelMetalness.length; index += 1) {
    if (
      (polish100.steelMetalness[index] ?? 0) > 0 &&
      (polish100.machiningGrooveMask[index] ?? 0) < 0.005
    ) {
      receiverProbeIndex = index
      break
    }
  }

  assert.equal(receiverProbeIndex >= 0, true)

  const receiverBeforeLegacyMasks =
    getArtworkFrameSteelFinishSelfShadowReceiver(
      polish100,
      receiverProbeIndex,
    )

  polish100.steelAmbientOcclusion[receiverProbeIndex] = 1
  polish100.visibleDefectShadowMask[receiverProbeIndex] = 1
  polish100.visibleScratchShadowMask[receiverProbeIndex] = 1
  polish100.visibleBurrRidgeMask[receiverProbeIndex] = 1
  polish100.scuffCrossScratchRimShadowMask[receiverProbeIndex] = 1

  assert.equal(
    getArtworkFrameSteelFinishSelfShadowReceiver(
      polish100,
      receiverProbeIndex,
    ),
    receiverBeforeLegacyMasks,
    'legacy AO/damage/scuff masks must not create defect self-shadow receiver',
  )

  defect100.physicalContributions.scratch.selfShadowReceiver[
    receiverProbeIndex
  ] = 0.42

  assert.equal(
    getArtworkFrameSteelFinishSelfShadowReceiver(
      polish100,
      receiverProbeIndex,
    ) > receiverBeforeLegacyMasks + 0.3,
    true,
    'active physical selfShadowReceiver should own defect self-shadow reception',
  )
  assert.equal(scratchPhysical25.count > 0, true)
  assert.equal(
    scratchPhysical25.visibleDepthMean > scratchPhysical100.visibleDepthMean,
    true,
  )
  assert.equal(
    scratchPhysical50.visibleDepthMean >= scratchPhysical100.visibleDepthMean,
    true,
  )
  assert.equal(
    scratchPhysical25.negativeHeightMean > scratchPhysical100.negativeHeightMean,
    true,
  )
  assert.equal(scratchPhysical100.maxVisibleDepth, 0)
  assert.equal(scratchPhysical100.visibleShadowMean, 0)
})

test('canvas steel finish stage 6 checkpoints keep placement stable and light final-shading-only', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'flat',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 0,
    metalBrushAngle: 12,
    metalPolish: 30,
    metalTarnish: 0,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 12, y: 20, width: 240, height: 160 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const pathData = createMetalArtworkFramePathData(frame, bounds, stroke)
  const buildRendered = (
    metalPolish: number,
    lightPosition: { x: number; y: number },
    metalTarnish = 0,
  ) => {
    const plan = buildMetalArtworkFrameMaterialPlan({
      bounds,
      clipPathData: pathData,
      frame: { ...frame, metalPolish, metalTarnish },
      lightVector: createArtworkFrameMaterialHemisphereLightVector(lightPosition),
      materialSeed: {
        algorithm: 'sha256-image-v1',
        key: 'sha256-image-v1:stage-6-regression-stability',
        seed32: 0x6a5e600d,
      },
      pathData,
      strokeWidth: stroke,
    })

    assert.ok(plan.canvasTexture)

    const canvas = createDeterministicMaterialCanvas()

    return renderArtworkFrameCanvasMaterialTexture(
      {
        ...plan.canvasTexture,
        corrosionFieldRequest: null,
      },
      {
        createCanvas: canvas.createCanvas,
        createPath: (path) => ({ path } as unknown as Path2D),
      },
    )
  }
  const polishCheckpoints = [0, 10, 25, 30, 50] as const
  const overheadByPolish = polishCheckpoints.map((metalPolish) => ({
    metalPolish,
    rendered: buildRendered(metalPolish, { x: 0, y: 0 }),
  }))
  const baselineDefects = getSteelFinishDefectDecalMaps(
    overheadByPolish[0]!.rendered.steelFinishMaps!,
  )

  for (const { metalPolish, rendered } of overheadByPolish) {
    assert.ok(rendered.steelFinishMaps)
    assert.ok(rendered.steelFinishNormalInputs)

    const grazing = buildRendered(metalPolish, {
      x: Math.SQRT1_2,
      y: Math.SQRT1_2,
    })

    assert.ok(grazing.steelFinishMaps)
    assert.ok(grazing.steelFinishNormalInputs)
    assertSteelFinishDerivedMapsEqual(
      rendered.steelFinishMaps,
      grazing.steelFinishMaps,
    )
    assertSteelFinishNormalInputsEqual(
      rendered.steelFinishNormalInputs,
      grazing.steelFinishNormalInputs,
    )
    assertSteelDefectDecalMapsEqual(
      getSteelFinishDefectDecalMaps(rendered.steelFinishMaps),
      getSteelFinishDefectDecalMaps(grazing.steelFinishMaps),
    )
    assert.equal(
      countDifferentBytes(rendered.imageData.data, grazing.imageData.data) >
        120,
      true,
      `${metalPolish}% light should alter final shaded pixels only`,
    )
  }

  for (const { rendered } of overheadByPolish.slice(1)) {
    const defects = getSteelFinishDefectDecalMaps(rendered.steelFinishMaps!)

    for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
      for (const channel of ARTWORK_FRAME_STEEL_DEFECT_STABLE_PLACEMENT_CHANNELS) {
        assertFloatFieldsEqual(
          baselineDefects.stablePlacement[kind][channel],
          defects.stablePlacement[kind][channel],
        )
      }
    }
  }

  const polish30 = overheadByPolish.find(
    (entry) => entry.metalPolish === 30,
  )!.rendered
  const polish50 = overheadByPolish.find(
    (entry) => entry.metalPolish === 50,
  )!.rendered
  const tarnishShifted = buildRendered(30, { x: 0, y: 0 }, 100)

  assert.ok(polish30.steelFinishMaps)
  assert.ok(polish50.steelFinishMaps)
  assert.ok(tarnishShifted.steelFinishMaps)

  const polish30Defects = getSteelFinishDefectDecalMaps(
    polish30.steelFinishMaps,
  )
  const polish50Defects = getSteelFinishDefectDecalMaps(
    polish50.steelFinishMaps,
  )
  const tarnishShiftedDefects = getSteelFinishDefectDecalMaps(
    tarnishShifted.steelFinishMaps,
  )

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    for (const channel of ARTWORK_FRAME_STEEL_DEFECT_STABLE_PLACEMENT_CHANNELS) {
      assertFloatFieldsEqual(
        polish30Defects.stablePlacement[kind][channel],
        tarnishShiftedDefects.stablePlacement[kind][channel],
      )
    }
    for (const channel of ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS) {
      assertFloatFieldsEqual(
        polish30Defects.activeBodies[kind][channel],
        tarnishShiftedDefects.activeBodies[kind][channel],
      )
    }
    for (const channel of ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS) {
      assertFloatFieldsEqual(
        polish30Defects.physicalContributions[kind][channel],
        tarnishShiftedDefects.physicalContributions[kind][channel],
      )
    }
  }

  for (
    const lowPolishKind of [
      'burrNick',
      'dent',
      'gouge',
      'pit',
      'scuff',
    ] as const
  ) {
    assert.equal(
      sumSteelDefectActiveBodyValues(polish50Defects, lowPolishKind),
      0,
      `50% should not retain old low-polish ${lowPolishKind} bodies`,
    )
    assert.equal(
      sumSteelDefectAllPhysicalContributionValues(
        polish50Defects,
        lowPolishKind,
      ),
      0,
      `50% should not retain old low-polish ${lowPolishKind} material response`,
    )
  }
  assert.equal(
    summarizeArtworkFrameCorrosionScalarField(
      polish50.steelFinishMaps.visibleGougeShadowMask,
    ).max,
    0,
  )
  assert.equal(
    summarizeArtworkFrameCorrosionScalarField(
      polish50.steelFinishMaps.visibleDentShadowMask,
    ).max,
    0,
  )
  assert.equal(
    summarizeArtworkFrameCorrosionScalarField(
      polish50.steelFinishMaps.scuffCrossScratchRimShadowMask,
    ).max,
    0,
  )
  assert.equal(
    summarizeArtworkFrameCorrosionScalarField(
      polish50.steelFinishMaps.visibleBurrRidgeMask,
    ).max,
    0,
  )
})

test('canvas steel finish height and AO stay clipped to the frame ring', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 0,
    metalTarnish: 24,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:clipped-defect-finish-maps',
    seed32: 0x99aabbcc,
  } as const
  const bounds = { x: 0, y: 0, width: 240, height: 160 }
  const samplingBounds = { x: 0, y: 0, width: 240, height: 160 }
  const textureSize = { width: 96, height: 64 }
  const strokeWidth = 24
  const request = createArtworkFrameSteelFinishFieldRequest({
    bounds,
    frame,
    materialSeed,
    samplingBounds,
    strokeWidth,
    textureSize,
  })

  assert.ok(request)

  const field = buildArtworkFrameSteelFinishField(request)
  const maps = buildArtworkFrameSteelFinishDerivedMaps(field)
  const selfShadowMap = buildArtworkFrameMaterialHeightSelfShadowMap({
    heightMap: maps.steelHeight,
    heightPixels: maps.heightPixels,
    lightVector: createArtworkFrameMaterialHemisphereLightVector({
      x: 1,
      y: 0,
    }),
    maskMap: maps.steelMetalness,
    strength: 1,
    widthPixels: maps.widthPixels,
  })

  for (let index = 0; index < field.fields.frameMask.length; index += 1) {
    if ((field.fields.frameMask[index] ?? 0) > 0) {
      continue
    }

    assert.equal(maps.steelHeight[index], 0)
    assert.equal(maps.steelAmbientOcclusion[index], 0)
    assert.equal(maps.scratchTroughMask[index], 0)
    assert.equal(maps.gougeTroughMask[index], 0)
    assert.equal(maps.dentPocketMask[index], 0)
    assert.equal(maps.pitPocketMask[index], 0)
    assert.equal(maps.burrRidgeMask[index], 0)
    assert.equal(selfShadowMap[index], 0)
  }
})

test('canvas steel finish normals derive from height and stay stable across light angle', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 0,
    metalTarnish: 24,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:normal-light-stable-finish-maps',
    seed32: 0x12345678,
  } as const
  const bounds = { x: 0, y: 0, width: 240, height: 160 }
  const samplingBounds = { x: 0, y: 0, width: 240, height: 160 }
  const textureSize = { width: 96, height: 64 }
  const strokeWidth = 24
  const build = (metalLightAngle: number) => {
    const request = createArtworkFrameSteelFinishFieldRequest({
      bounds,
      frame: { ...frame, metalLightAngle },
      materialSeed,
      samplingBounds,
      strokeWidth,
      textureSize,
    })

    assert.ok(request)

    const maps = buildArtworkFrameSteelFinishDerivedMapsWithActiveDefects(
      buildArtworkFrameSteelFinishField(request),
      frame.metalPolish,
    )

    return {
      maps,
      normals: buildArtworkFrameSteelFinishNormalInputs(maps),
    }
  }
  const baseline = build(315)
  const rotated = build(45)

  assertSteelFinishDerivedMapsEqual(baseline.maps, rotated.maps)
  assertSteelFinishNormalInputsEqual(baseline.normals, rotated.normals)

  const summary = summarizeSteelFinishNormalInputs(baseline.normals)

  assert.equal(summary.activeCount > 0, true)
  assert.equal(summary.meanTilt > 0.01, true)
  assert.equal(summary.maxTilt < 0.72, true)
  assert.equal(summary.maxLengthError < 0.000001, true)
  assert.equal(summary.minNormalZ > 0.69, true)
})

test('canvas steel finish low polish produces stronger normal variation than high polish', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 50,
    metalTarnish: 24,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:normal-polish-response-finish-maps',
    seed32: 0x87654321,
  } as const
  const bounds = { x: 0, y: 0, width: 240, height: 160 }
  const samplingBounds = { x: 0, y: 0, width: 240, height: 160 }
  const textureSize = { width: 96, height: 64 }
  const strokeWidth = 24
  const buildNormals = (metalPolish: number) => {
    const request = createArtworkFrameSteelFinishFieldRequest({
      bounds,
      frame: { ...frame, metalPolish },
      materialSeed,
      samplingBounds,
      strokeWidth,
      textureSize,
    })

    assert.ok(request)

    return buildArtworkFrameSteelFinishNormalInputs(
      buildArtworkFrameSteelFinishDerivedMaps(
        buildArtworkFrameSteelFinishField(request),
      ),
    )
  }
  const lowPolish = buildNormals(0)
  const highPolish = buildNormals(100)
  const lowSummary = summarizeSteelFinishNormalInputs(lowPolish)
  const highSummary = summarizeSteelFinishNormalInputs(highPolish)

  assertFloatFieldsEqual(lowPolish.steelAnisotropyDirectionX, highPolish.steelAnisotropyDirectionX)
  assertFloatFieldsEqual(lowPolish.steelAnisotropyDirectionY, highPolish.steelAnisotropyDirectionY)
  assert.equal(lowSummary.meanTilt > highSummary.meanTilt * 1.6, true)
  assert.equal(lowSummary.maxTilt > highSummary.maxTilt, true)
  assert.equal(lowSummary.maxTilt < 0.72, true)
  assert.equal(highSummary.maxLengthError < 0.000001, true)
  assert.equal(lowSummary.maxLengthError < 0.000001, true)
})

test('canvas steel finish normals have no data outside the frame ring', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 0,
    metalTarnish: 24,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:normal-clipped-finish-maps',
    seed32: 0x10203040,
  } as const
  const bounds = { x: 0, y: 0, width: 240, height: 160 }
  const samplingBounds = { x: 0, y: 0, width: 240, height: 160 }
  const textureSize = { width: 96, height: 64 }
  const strokeWidth = 24
  const request = createArtworkFrameSteelFinishFieldRequest({
    bounds,
    frame,
    materialSeed,
    samplingBounds,
    strokeWidth,
    textureSize,
  })

  assert.ok(request)

  const field = buildArtworkFrameSteelFinishField(request)
  const maps = buildArtworkFrameSteelFinishDerivedMaps(field)
  const normals = buildArtworkFrameSteelFinishNormalInputs(maps)

  for (let index = 0; index < field.fields.frameMask.length; index += 1) {
    if ((field.fields.frameMask[index] ?? 0) > 0) {
      continue
    }

    assert.equal(normals.normalX[index], 0)
    assert.equal(normals.normalY[index], 0)
    assert.equal(normals.normalZ[index], 0)
  }
})

test('canvas steel finish stage 0 maps rough damaged steel stronger than brushed and polished stages', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 50,
    metalTarnish: 0,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:stage-0-rough-damaged-finish-maps',
    seed32: 0x91a2b3c4,
  } as const
  const bounds = { x: 0, y: 0, width: 240, height: 160 }
  const samplingBounds = { x: 0, y: 0, width: 240, height: 160 }
  const textureSize = { width: 96, height: 64 }
  const strokeWidth = 24
  const buildMaps = (metalPolish: number) => {
    const request = createArtworkFrameSteelFinishFieldRequest({
      bounds,
      frame: { ...frame, metalPolish },
      materialSeed,
      samplingBounds,
      strokeWidth,
      textureSize,
    })

    assert.ok(request)

    return buildArtworkFrameSteelFinishDerivedMaps(
      buildArtworkFrameSteelFinishField(request),
    )
  }
  const stage0 = buildMaps(0)
  const stage2 = buildMaps(50)
  const stage5 = buildMaps(100)
  const stage0Summary = summarizeSteelFinishSurfaceResponse(stage0)
  const stage2Summary = summarizeSteelFinishSurfaceResponse(stage2)
  const stage5Summary = summarizeSteelFinishSurfaceResponse(stage5)

  assert.equal(stage0.stageUnits.roughDamaged, 1)
  assert.equal(stage2.stageUnits.brushedBaseline > 0.95, true)
  assert.equal(stage5.stageUnits.nearMirror, 1)
  assert.equal(stage0Summary.activeCount > 0, true)
  assert.equal(
    stage0Summary.heightEnergyMean > stage2Summary.heightEnergyMean * 1.35,
    true,
  )
  assert.equal(
    stage0Summary.heightEnergyMean > stage5Summary.heightEnergyMean * 1.8,
    true,
  )
  assert.equal(
    stage0Summary.ambientOcclusionMean >
      stage2Summary.ambientOcclusionMean * 1.55,
    true,
  )
  assert.equal(
    stage0Summary.ambientOcclusionMean >
      stage5Summary.ambientOcclusionMean * 2,
    true,
  )
  assert.equal(
    stage0Summary.roughnessMean > stage2Summary.roughnessMean,
    true,
  )
  assert.equal(
    stage0Summary.roughnessMean > stage5Summary.roughnessMean,
    true,
  )
  assert.equal(stage0Summary.glossMean < stage2Summary.glossMean, true)
  assert.equal(stage0Summary.glossMean < stage5Summary.glossMean, true)
})

test('canvas steel finish stage 0 shading changes with light while damage placement stays stable', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 0,
    metalBrushAngle: 12,
    metalPolish: 0,
    metalTarnish: 0,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 12, y: 20, width: 240, height: 160 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const pathData = createMetalArtworkFramePathData(frame, bounds, stroke)
  const plan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    materialSeed: {
      algorithm: 'sha256-image-v1',
      key: 'sha256-image-v1:stage-0-light-shading-finish-maps',
      seed32: 0x39485766,
    },
    pathData,
    strokeWidth: stroke,
  })

  assert.ok(plan.canvasTexture?.steelFinishFieldRequest)

  const baseTexture = {
    ...plan.canvasTexture,
    corrosionFieldRequest: null,
  }
  const frontLightCanvas = createDeterministicMaterialCanvas()
  const backLightCanvas = createDeterministicMaterialCanvas()
  const frontLight = renderArtworkFrameCanvasMaterialTexture(
    {
      ...baseTexture,
      lighting: {
        lightVector: createArtworkFrameMaterialHemisphereLightVector({
          x: 0,
          y: 0,
        }),
      },
    },
    {
      createCanvas: frontLightCanvas.createCanvas,
      createPath: (path) => ({ path } as unknown as Path2D),
    },
  )
  const backLight = renderArtworkFrameCanvasMaterialTexture(
    {
      ...baseTexture,
      lighting: {
        lightVector: createArtworkFrameMaterialHemisphereLightVector({
          x: -1,
          y: 0,
        }),
      },
    },
    {
      createCanvas: backLightCanvas.createCanvas,
      createPath: (path) => ({ path } as unknown as Path2D),
    },
  )

  assert.ok(frontLight.steelFinishMaps)
  assert.ok(backLight.steelFinishMaps)
  assert.ok(frontLight.steelFinishNormalInputs)
  assert.ok(backLight.steelFinishNormalInputs)
  assertSteelFinishDerivedMapsEqual(
    frontLight.steelFinishMaps,
    backLight.steelFinishMaps,
  )
  assertSteelFinishNormalInputsEqual(
    frontLight.steelFinishNormalInputs,
    backLight.steelFinishNormalInputs,
  )
  assert.equal(
    countDifferentBytes(frontLight.imageData.data, backLight.imageData.data) >
      120,
    true,
  )
})

test('canvas steel finish stage 1 maps pale scuffed steel distinct from rough and brushed stages', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 22,
    metalTarnish: 0,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:stage-1-scuffed-low-finish-maps',
    seed32: 0x61b7c8d9,
  } as const
  const bounds = { x: 0, y: 0, width: 240, height: 160 }
  const samplingBounds = { x: 0, y: 0, width: 240, height: 160 }
  const textureSize = { width: 96, height: 64 }
  const strokeWidth = 24
  const buildMaps = (metalPolish: number) => {
    const request = createArtworkFrameSteelFinishFieldRequest({
      bounds,
      frame: { ...frame, metalPolish },
      materialSeed,
      samplingBounds,
      strokeWidth,
      textureSize,
    })

    assert.ok(request)

    return buildArtworkFrameSteelFinishDerivedMapsWithActiveDefects(
      buildArtworkFrameSteelFinishField(request),
      metalPolish,
    )
  }
  const rough = buildMaps(0)
  const scuffed = buildMaps(22)
  const brushed = buildMaps(50)
  const scuffedDefectDecalMaps = getSteelFinishDefectDecalMaps(scuffed)
  const roughSummary = summarizeSteelFinishSurfaceResponse(rough)
  const scuffedSummary = summarizeSteelFinishSurfaceResponse(scuffed)
  const brushedSummary = summarizeSteelFinishSurfaceResponse(brushed)
  const scuffHeightSummary = summarizeSteelFinishMaskedScalarResponse(
    scuffed.visibleDefectShadowMask,
    scuffedDefectDecalMaps.physicalContributions.scuff.height,
    0.001,
  )
  const scuffAoSummary = summarizeSteelFinishMaskedScalarResponse(
    scuffed.steelAmbientOcclusion,
    scuffedDefectDecalMaps.physicalContributions.scuff.ambientOcclusion,
    0.001,
  )

  assert.equal(scuffed.stageUnits.scuffedLow, 1)
  assert.equal(scuffedSummary.activeCount > 0, true)
  assert.equal(scuffedSummary.albedoMean > roughSummary.albedoMean + 0.05, true)
  assert.equal(brushedSummary.albedoMean > scuffedSummary.albedoMean, true)
  assert.equal(
    Math.abs(scuffedSummary.heightEnergyMean -
      roughSummary.heightEnergyMean) > 0.0005,
    true,
  )
  assert.equal(
    Math.abs(scuffedSummary.heightEnergyMean -
      brushedSummary.heightEnergyMean) > 0.0005,
    true,
  )
  assert.equal(
    Math.abs(scuffedSummary.ambientOcclusionMean -
      roughSummary.ambientOcclusionMean) > 0.0005,
    true,
  )
  assert.equal(
    Math.abs(scuffedSummary.ambientOcclusionMean -
      brushedSummary.ambientOcclusionMean) > 0.0005,
    true,
  )
  assert.equal(scuffedSummary.glossMean > roughSummary.glossMean, true)
  assert.equal(scuffedSummary.glossMean < brushedSummary.glossMean, true)
  assert.equal(scuffedSummary.roughnessMean > brushedSummary.roughnessMean, true)
  assert.equal(scuffHeightSummary.count > 6, true)
  assert.equal(
    sumSteelDefectPhysicalContributionValues(
      scuffedDefectDecalMaps,
      'scuff',
      'height',
    ) > 0,
    true,
  )
  assert.equal(
    scuffAoSummary.max > 0,
    true,
  )
  assert.equal(
    summarizeArtworkFrameCorrosionScalarField(
      scuffed.scuffCrossScratchRimLightMask,
    ).max > 0.05,
    true,
  )
  assert.equal(
    summarizeArtworkFrameCorrosionScalarField(
      scuffed.scuffCrossScratchRimShadowMask,
    ).max > 0.05,
    true,
  )
})

test('canvas steel finish stage 1 cross scratch geometry is anchored across light angle', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 0,
    metalBrushAngle: 12,
    metalPolish: 22,
    metalTarnish: 0,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:stage-1-light-stable-scuff-maps',
    seed32: 0x20406080,
  } as const
  const bounds = { x: 0, y: 0, width: 240, height: 160 }
  const samplingBounds = { x: 0, y: 0, width: 240, height: 160 }
  const textureSize = { width: 96, height: 64 }
  const strokeWidth = 24
  const build = (metalLightAngle: number) => {
    const request = createArtworkFrameSteelFinishFieldRequest({
      bounds,
      frame: { ...frame, metalLightAngle },
      materialSeed,
      samplingBounds,
      strokeWidth,
      textureSize,
    })

    assert.ok(request)

    const maps = buildArtworkFrameSteelFinishDerivedMapsWithActiveDefects(
      buildArtworkFrameSteelFinishField(request),
      frame.metalPolish,
    )

    return {
      maps,
      normals: buildArtworkFrameSteelFinishNormalInputs(maps),
    }
  }
  const frontLight = build(0)
  const sideLight = build(90)

  assertSteelFinishDerivedMapsEqual(frontLight.maps, sideLight.maps)
  assertSteelFinishNormalInputsEqual(frontLight.normals, sideLight.normals)
  assert.equal(
    summarizeArtworkFrameCorrosionScalarField(
      frontLight.maps.scuffCrossScratchTroughMask,
    ).mean > 0.001,
    true,
  )
})

test('canvas steel finish stage 1 polish progresses smoothly from 12 to 28 percent', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 12,
    metalTarnish: 0,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:stage-1-smooth-polish-progression',
    seed32: 0x77aa5511,
  } as const
  const bounds = { x: 0, y: 0, width: 240, height: 160 }
  const samplingBounds = { x: 0, y: 0, width: 240, height: 160 }
  const textureSize = { width: 96, height: 64 }
  const strokeWidth = 24
  const buildSummary = (metalPolish: number) => {
    const request = createArtworkFrameSteelFinishFieldRequest({
      bounds,
      frame: { ...frame, metalPolish },
      materialSeed,
      samplingBounds,
      strokeWidth,
      textureSize,
    })

    assert.ok(request)

    const maps = buildArtworkFrameSteelFinishDerivedMaps(
      buildArtworkFrameSteelFinishField(request),
    )
    const summary = summarizeSteelFinishSurfaceResponse(maps)

    return {
      maps,
      summary,
    }
  }
  const samples = [12, 15, 18, 22, 25, 28].map(buildSummary)

  for (const sample of samples) {
    assert.equal(sample.maps.stageUnits.scuffedLow > 0, true)
    assert.equal(
      summarizeArtworkFrameCorrosionScalarField(
        sample.maps.scuffCrossScratchTroughMask,
      ).max > 0.1,
      true,
    )
  }

  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1]!
    const current = samples[index]!
    const delta =
      Math.abs(current.summary.albedoMean - previous.summary.albedoMean) +
      Math.abs(current.summary.glossMean - previous.summary.glossMean) +
      Math.abs(current.summary.heightEnergyMean -
        previous.summary.heightEnergyMean) +
      Math.abs(current.summary.ambientOcclusionMean -
        previous.summary.ambientOcclusionMean)

    assert.equal(delta > 0.0005, true)
    assert.equal(delta < 0.12, true)
  }

  assert.equal(
    samples.at(-1)!.summary.albedoMean > samples[0]!.summary.albedoMean,
    true,
  )
  assert.equal(
    samples.at(-1)!.summary.heightEnergyMean <
      samples[0]!.summary.heightEnergyMean,
    true,
  )
})

test('canvas steel finish stage 1 shading changes with light while cross scratches stay fixed', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 0,
    metalBrushAngle: 12,
    metalPolish: 22,
    metalTarnish: 0,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 12, y: 20, width: 240, height: 160 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const pathData = createMetalArtworkFramePathData(frame, bounds, stroke)
  const plan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    materialSeed: {
      algorithm: 'sha256-image-v1',
      key: 'sha256-image-v1:stage-1-light-shading-finish-maps',
      seed32: 0x31415926,
    },
    pathData,
    strokeWidth: stroke,
  })

  assert.ok(plan.canvasTexture?.steelFinishFieldRequest)

  const baseTexture = {
    ...plan.canvasTexture,
    corrosionFieldRequest: null,
  }
  const frontLightCanvas = createDeterministicMaterialCanvas()
  const backLightCanvas = createDeterministicMaterialCanvas()
  const frontLight = renderArtworkFrameCanvasMaterialTexture(
    {
      ...baseTexture,
      lighting: {
        lightVector: createArtworkFrameMaterialHemisphereLightVector({
          x: 0,
          y: 0,
        }),
      },
    },
    {
      createCanvas: frontLightCanvas.createCanvas,
      createPath: (path) => ({ path } as unknown as Path2D),
    },
  )
  const backLight = renderArtworkFrameCanvasMaterialTexture(
    {
      ...baseTexture,
      lighting: {
        lightVector: createArtworkFrameMaterialHemisphereLightVector({
          x: -1,
          y: 0,
        }),
      },
    },
    {
      createCanvas: backLightCanvas.createCanvas,
      createPath: (path) => ({ path } as unknown as Path2D),
    },
  )

  assert.ok(frontLight.steelFinishMaps)
  assert.ok(backLight.steelFinishMaps)
  assertSteelFinishDerivedMapsEqual(
    frontLight.steelFinishMaps,
    backLight.steelFinishMaps,
  )
  assert.equal(
    countDifferentBytes(frontLight.imageData.data, backLight.imageData.data) >
      120,
    true,
  )
})

test('canvas steel finish stage 2 brush angle controls grain lay without moving defects', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 0,
    metalPolish: 50,
    metalTarnish: 0,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:stage-2-brush-angle-finish-maps',
    seed32: 0x82736455,
  } as const
  const bounds = { x: 0, y: 0, width: 240, height: 160 }
  const samplingBounds = { x: 0, y: 0, width: 240, height: 160 }
  const textureSize = { width: 96, height: 64 }
  const strokeWidth = 24
  const buildMaps = (metalBrushAngle: number) => {
    const request = createArtworkFrameSteelFinishFieldRequest({
      bounds,
      frame: { ...frame, metalBrushAngle },
      materialSeed,
      samplingBounds,
      strokeWidth,
      textureSize,
    })

    assert.ok(request)

    return buildArtworkFrameSteelFinishDerivedMaps(
      buildArtworkFrameSteelFinishField(request),
    )
  }
  const horizontal = buildMaps(0)
  const diagonal = buildMaps(45)
  const horizontalAngle = summarizeSteelFinishAnisotropyDirectionDegrees(
    horizontal,
  )
  const diagonalAngle = summarizeSteelFinishAnisotropyDirectionDegrees(diagonal)

  assert.equal(horizontal.stageUnits.brushedBaseline, 1)
  assert.equal(diagonal.stageUnits.brushedBaseline, 1)
  assert.equal(
    getAngleDifferenceDegrees(horizontalAngle, diagonalAngle) > 38,
    true,
  )
  assert.equal(
    getAngleDifferenceDegrees(horizontalAngle, diagonalAngle) < 52,
    true,
  )
  assert.equal(
    countDifferentFloatValues(horizontal.brushedGrainMask, diagonal.brushedGrainMask) >
      300,
    true,
  )
  assertFloatFieldsEqual(horizontal.scratchTroughMask, diagonal.scratchTroughMask)
  assertFloatFieldsEqual(horizontal.gougeTroughMask, diagonal.gougeTroughMask)
  assertFloatFieldsEqual(horizontal.dentPocketMask, diagonal.dentPocketMask)
  assertFloatFieldsEqual(horizontal.pitPocketMask, diagonal.pitPocketMask)
  assertFloatFieldsEqual(
    horizontal.scuffCrossScratchTroughMask,
    diagonal.scuffCrossScratchTroughMask,
  )
})

test('canvas steel finish stage 2 light changes shading without moving grain geometry', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 0,
    metalBrushAngle: 34,
    metalPolish: 50,
    metalTarnish: 0,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 12, y: 20, width: 240, height: 160 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const pathData = createMetalArtworkFramePathData(frame, bounds, stroke)
  const plan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    materialSeed: {
      algorithm: 'sha256-image-v1',
      key: 'sha256-image-v1:stage-2-light-shading-finish-maps',
      seed32: 0x2468ace0,
    },
    pathData,
    strokeWidth: stroke,
  })

  assert.ok(plan.canvasTexture?.steelFinishFieldRequest)

  const baseTexture = {
    ...plan.canvasTexture,
    corrosionFieldRequest: null,
  }
  const frontLightCanvas = createDeterministicMaterialCanvas()
  const sideLightCanvas = createDeterministicMaterialCanvas()
  const frontLight = renderArtworkFrameCanvasMaterialTexture(
    {
      ...baseTexture,
      lighting: {
        lightVector: createArtworkFrameMaterialHemisphereLightVector({
          x: 0,
          y: 0,
        }),
      },
    },
    {
      createCanvas: frontLightCanvas.createCanvas,
      createPath: (path) => ({ path } as unknown as Path2D),
    },
  )
  const sideLight = renderArtworkFrameCanvasMaterialTexture(
    {
      ...baseTexture,
      lighting: {
        lightVector: createArtworkFrameMaterialHemisphereLightVector({
          x: -1,
          y: 0,
        }),
      },
    },
    {
      createCanvas: sideLightCanvas.createCanvas,
      createPath: (path) => ({ path } as unknown as Path2D),
    },
  )

  assert.ok(frontLight.steelFinishMaps)
  assert.ok(sideLight.steelFinishMaps)
  assert.ok(frontLight.steelFinishNormalInputs)
  assert.ok(sideLight.steelFinishNormalInputs)
  assertSteelFinishDerivedMapsEqual(
    frontLight.steelFinishMaps,
    sideLight.steelFinishMaps,
  )
  assertSteelFinishNormalInputsEqual(
    frontLight.steelFinishNormalInputs,
    sideLight.steelFinishNormalInputs,
  )
  assert.equal(
    countDifferentBytes(frontLight.imageData.data, sideLight.imageData.data) >
      120,
    true,
  )
})

test('canvas steel finish stage 2 polish progresses smoothly through brushed baseline', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 22,
    metalPolish: 50,
    metalTarnish: 0,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:stage-2-smooth-polish-progression',
    seed32: 0xbadf00d1,
  } as const
  const bounds = { x: 0, y: 0, width: 240, height: 160 }
  const samplingBounds = { x: 0, y: 0, width: 240, height: 160 }
  const textureSize = { width: 96, height: 64 }
  const strokeWidth = 24
  const buildSummary = (metalPolish: number) => {
    const request = createArtworkFrameSteelFinishFieldRequest({
      bounds,
      frame: { ...frame, metalPolish },
      materialSeed,
      samplingBounds,
      strokeWidth,
      textureSize,
    })

    assert.ok(request)

    const maps = buildArtworkFrameSteelFinishDerivedMaps(
      buildArtworkFrameSteelFinishField(request),
    )

    return {
      maps,
      summary: summarizeSteelFinishSurfaceResponse(maps),
    }
  }
  const samples = [30, 45, 50, 58].map(buildSummary)

  for (const sample of samples) {
    assert.equal(sample.maps.stageUnits.brushedBaseline > 0, true)
    assert.equal(
      summarizeArtworkFrameCorrosionScalarField(sample.maps.brushedGrainMask).max >
        0.1,
      true,
    )
    assert.equal(
      summarizeArtworkFrameCorrosionScalarField(sample.maps.steelAnisotropy).mean >
        0.01,
      true,
    )
  }

  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1]!
    const current = samples[index]!
    const delta =
      Math.abs(current.summary.albedoMean - previous.summary.albedoMean) +
      Math.abs(current.summary.glossMean - previous.summary.glossMean) +
      Math.abs(current.summary.heightEnergyMean -
        previous.summary.heightEnergyMean) +
      Math.abs(current.summary.ambientOcclusionMean -
        previous.summary.ambientOcclusionMean)

    assert.equal(delta > 0.0005, true)
    assert.equal(delta < 0.28, true)
  }

  assert.equal(
    samples[1]!.summary.glossMean >= samples[0]!.summary.glossMean,
    true,
  )
  assert.equal(
    Math.max(...samples.map((sample) => sample.summary.heightEnergyMean)) -
      Math.min(...samples.map((sample) => sample.summary.heightEnergyMean)) <
      0.12,
    true,
  )
})

test('canvas steel finish stage 3 fine satin softens brushed steel without moving defects', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 22,
    metalPolish: 65,
    metalTarnish: 0,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:stage-3-fine-satin-softens-brushed',
    seed32: 0x13572468,
  } as const
  const bounds = { x: 0, y: 0, width: 240, height: 160 }
  const samplingBounds = { x: 0, y: 0, width: 240, height: 160 }
  const textureSize = { width: 96, height: 64 }
  const strokeWidth = 24
  const buildSummary = (metalPolish: number) => {
    const request = createArtworkFrameSteelFinishFieldRequest({
      bounds,
      frame: { ...frame, metalPolish },
      materialSeed,
      samplingBounds,
      strokeWidth,
      textureSize,
    })

    assert.ok(request)

    const maps = buildArtworkFrameSteelFinishDerivedMapsWithActiveDefects(
      buildArtworkFrameSteelFinishField(request),
      metalPolish,
    )
    const defectDecalMaps = getSteelFinishDefectDecalMaps(maps)
    const scratchHeight =
      defectDecalMaps.physicalContributions.scratch.height
    const pitAo =
      defectDecalMaps.physicalContributions.pit.ambientOcclusion

    return {
      maps,
      scratchDepth: summarizeSteelFinishDepthResponse(
        maps,
        scratchHeight,
        0.001,
      ),
      scratchVisibleDepth: summarizeSteelFinishMaskedScalarResponse(
        maps.visibleScratchDepthMask,
        scratchHeight,
        0.001,
      ),
      summary: summarizeSteelFinishSurfaceResponse(maps),
      visiblePitAo: summarizeSteelFinishMaskedScalarResponse(
        maps.visiblePitAmbientOcclusionMask,
        pitAo,
        0.001,
      ),
    }
  }
  const brushed = buildSummary(50)
  const satinStart = buildSummary(58)
  const satinMid = buildSummary(65)
  const satinLate = buildSummary(70)
  const stage4Overlap = buildSummary(76)

  assert.equal(satinMid.maps.stageUnits.fineSatin, 1)
  assert.equal(satinLate.maps.stageUnits.fineSatin, 1)
  assert.equal(stage4Overlap.maps.stageUnits.semiBright > 0, true)
  assertSteelFinishPlacementMasksEqual(brushed.maps, satinMid.maps)
  assertSteelFinishPlacementMasksEqual(satinMid.maps, satinLate.maps)
  assertFloatFieldsEqual(
    satinMid.maps.brushedGrainMask,
    stage4Overlap.maps.brushedGrainMask,
  )
  assertFloatFieldsEqual(
    satinMid.maps.scratchTroughMask,
    stage4Overlap.maps.scratchTroughMask,
  )
  assertFloatFieldsEqual(
    satinMid.maps.gougeTroughMask,
    stage4Overlap.maps.gougeTroughMask,
  )
  assertFloatFieldsEqual(
    satinMid.maps.dentPocketMask,
    stage4Overlap.maps.dentPocketMask,
  )
  assertFloatFieldsEqual(
    satinMid.maps.pitPocketMask,
    stage4Overlap.maps.pitPocketMask,
  )
  assert.equal(
    satinMid.summary.roughnessMean < brushed.summary.roughnessMean,
    true,
  )
  assert.equal(
    satinLate.summary.roughnessMean < satinStart.summary.roughnessMean,
    true,
  )
  assert.equal(satinMid.summary.glossMean > brushed.summary.glossMean, true)
  assert.equal(satinLate.summary.glossMean > satinMid.summary.glossMean, true)
  assert.equal(satinLate.summary.glossMean < 0.72, true)
  assert.equal(
    satinMid.scratchVisibleDepth.mean < brushed.scratchVisibleDepth.mean,
    true,
  )
  assert.equal(
    satinMid.summary.ambientOcclusionMean <
      brushed.summary.ambientOcclusionMean,
    true,
  )
  assert.equal(
    satinMid.scratchDepth.negativeHeightMean <
      brushed.scratchDepth.negativeHeightMean,
    true,
  )
  assert.equal(
    satinMid.visiblePitAo.mean <= brushed.visiblePitAo.mean,
    true,
  )
  assert.equal(satinMid.summary.heightEnergyMean > 0.02, true)
  assert.equal(satinMid.summary.roughnessMean > 0.35, true)
})

test('canvas steel finish stage 3 light changes satin shading without moving geometry', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 0,
    metalBrushAngle: 22,
    metalPolish: 70,
    metalTarnish: 0,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 12, y: 20, width: 240, height: 160 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const pathData = createMetalArtworkFramePathData(frame, bounds, stroke)
  const plan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    materialSeed: {
      algorithm: 'sha256-image-v1',
      key: 'sha256-image-v1:stage-3-light-shading-finish-maps',
      seed32: 0xeca86420,
    },
    pathData,
    strokeWidth: stroke,
  })

  assert.ok(plan.canvasTexture?.steelFinishFieldRequest)

  const baseTexture = {
    ...plan.canvasTexture,
    corrosionFieldRequest: null,
  }
  const frontLightCanvas = createDeterministicMaterialCanvas()
  const sideLightCanvas = createDeterministicMaterialCanvas()
  const frontLight = renderArtworkFrameCanvasMaterialTexture(
    {
      ...baseTexture,
      lighting: {
        lightVector: createArtworkFrameMaterialHemisphereLightVector({
          x: 0,
          y: 0,
        }),
      },
    },
    {
      createCanvas: frontLightCanvas.createCanvas,
      createPath: (path) => ({ path } as unknown as Path2D),
    },
  )
  const sideLight = renderArtworkFrameCanvasMaterialTexture(
    {
      ...baseTexture,
      lighting: {
        lightVector: createArtworkFrameMaterialHemisphereLightVector({
          x: -1,
          y: 0,
        }),
      },
    },
    {
      createCanvas: sideLightCanvas.createCanvas,
      createPath: (path) => ({ path } as unknown as Path2D),
    },
  )

  assert.ok(frontLight.steelFinishMaps)
  assert.ok(sideLight.steelFinishMaps)
  assert.ok(frontLight.steelFinishNormalInputs)
  assert.ok(sideLight.steelFinishNormalInputs)
  assertSteelFinishDerivedMapsEqual(
    frontLight.steelFinishMaps,
    sideLight.steelFinishMaps,
  )
  assertSteelFinishNormalInputsEqual(
    frontLight.steelFinishNormalInputs,
    sideLight.steelFinishNormalInputs,
  )
  assert.equal(
    countDifferentBytes(frontLight.imageData.data, sideLight.imageData.data) >
      120,
    true,
  )
})

test('canvas steel finish stage 4 semi-bright creates broad smooth reflection maps', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 22,
    metalPolish: 85,
    metalTarnish: 0,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:stage-4-semi-bright-smooth-reflection',
    seed32: 0x2468ace1,
  } as const
  const bounds = { x: 0, y: 0, width: 240, height: 160 }
  const samplingBounds = { x: 0, y: 0, width: 240, height: 160 }
  const textureSize = { width: 96, height: 64 }
  const strokeWidth = 24
  const buildSummary = (metalPolish: number) => {
    const request = createArtworkFrameSteelFinishFieldRequest({
      bounds,
      frame: { ...frame, metalPolish },
      materialSeed,
      samplingBounds,
      strokeWidth,
      textureSize,
    })

    assert.ok(request)

    const maps = buildArtworkFrameSteelFinishDerivedMaps(
      buildArtworkFrameSteelFinishField(request),
    )

    return {
      maps,
      reflectionGradient: summarizeSteelFinishScalarGradient(
        maps.polishedReflectionMask,
        maps.widthPixels,
        maps.heightPixels,
      ),
      grainGradient: summarizeSteelFinishScalarGradient(
        maps.brushedGrainMask,
        maps.widthPixels,
        maps.heightPixels,
      ),
      hazeGradient: summarizeSteelFinishScalarGradient(
        maps.polishedHazeMask,
        maps.widthPixels,
        maps.heightPixels,
      ),
      summary: summarizeSteelFinishSurfaceResponse(maps),
    }
  }
  const satinLate = buildSummary(70)
  const semiBrightStart = buildSummary(72)
  const semiBrightMid = buildSummary(85)
  const stage5Overlap = buildSummary(92)

  assert.equal(semiBrightStart.maps.stageUnits.semiBright > 0, true)
  assert.equal(semiBrightMid.maps.stageUnits.semiBright, 1)
  assert.equal(stage5Overlap.maps.stageUnits.nearMirror > 0, true)
  assertFloatFieldsEqual(
    satinLate.maps.scratchTroughMask,
    semiBrightMid.maps.scratchTroughMask,
  )
  assertFloatFieldsEqual(
    satinLate.maps.gougeTroughMask,
    semiBrightMid.maps.gougeTroughMask,
  )
  assertFloatFieldsEqual(
    satinLate.maps.dentPocketMask,
    semiBrightMid.maps.dentPocketMask,
  )
  assertFloatFieldsEqual(
    satinLate.maps.pitPocketMask,
    semiBrightMid.maps.pitPocketMask,
  )
  assert.equal(
    semiBrightMid.summary.roughnessMean < satinLate.summary.roughnessMean,
    true,
  )
  assert.equal(
    semiBrightMid.summary.glossMean > satinLate.summary.glossMean,
    true,
  )
  assert.equal(semiBrightMid.summary.roughnessMean < 0.35, true)
  assert.equal(semiBrightMid.summary.glossMean < 0.9, true)
  assert.equal(
    semiBrightMid.reflectionGradient.meanGradient <
      semiBrightMid.grainGradient.meanGradient,
    true,
  )
  assert.equal(
    semiBrightMid.hazeGradient.meanGradient <
      semiBrightMid.grainGradient.meanGradient * 0.82,
    true,
  )
  assert.equal(
    stage5Overlap.summary.heightEnergyMean <
      satinLate.summary.heightEnergyMean * 1.42,
    true,
  )
})

test('canvas steel finish polished stages avoid isolated bright stroke artifacts', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 24,
    metalPolish: 85,
    metalTarnish: 0,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 12, y: 20, width: 240, height: 160 }
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:stage-4-bright-stroke-artifact-check',
    seed32: 0x31415926,
  } as const

  for (const metalPolish of [72, 80, 85, 88, 92, 96, 100]) {
    const nextFrame = { ...frame, metalPolish }
    const stroke = getArtworkFrameStrokeWidth(
      nextFrame,
      bounds.width,
      bounds.height,
    )
    const pathData = createMetalArtworkFramePathData(nextFrame, bounds, stroke)
    const plan = buildMetalArtworkFrameMaterialPlan({
      bounds,
      clipPathData: pathData,
      frame: nextFrame,
      materialSeed,
      pathData,
      strokeWidth: stroke,
    })

    assert.ok(plan.canvasTexture?.steelFinishFieldRequest)

    const canvas = createDeterministicMaterialCanvas()
    const rendered = renderArtworkFrameCanvasMaterialTexture(
      {
        ...plan.canvasTexture,
        corrosionFieldRequest: null,
      },
      {
        createCanvas: canvas.createCanvas,
        createPath: (path) => ({ path } as unknown as Path2D),
      },
    )

    assert.ok(rendered.steelFinishMaps)

    const isolated = countIsolatedBrightSteelPixels(
      rendered.imageData,
      rendered.steelFinishMaps,
    )

    assert.equal(isolated.isolatedBrightCount <= 3, true)
    assert.equal(isolated.isolatedBrightShare < 0.001, true)
    assert.equal(isolated.maxLocalDelta < 28, true)
  }
})

test('canvas steel finish stage 4 keeps rust matte over polished steel', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 24,
    metalPolish: 85,
    metalTarnish: 80,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 12, y: 20, width: 240, height: 160 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const pathData = createMetalArtworkFramePathData(frame, bounds, stroke)
  const plan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    materialSeed: {
      algorithm: 'sha256-image-v1',
      key: 'sha256-image-v1:stage-4-rust-matte-over-polished-steel',
      seed32: 0xf00d2027,
    },
    pathData,
    strokeWidth: stroke,
  })
  const canvas = createDeterministicMaterialCanvas()
  const rendered = renderArtworkFrameCanvasMaterialTexture(
    {
      ...plan.canvasTexture,
    },
    {
      createCanvas: canvas.createCanvas,
      createPath: (path) => ({ path } as unknown as Path2D),
    },
  )

  const matte = summarizeCorrodedPolishedSteelResponse(rendered)

  assert.equal(matte.corrosionCount > 100, true)
  assert.equal(
    matte.corrosionRoughnessMean > matte.steelRoughnessMean + 0.14,
    true,
  )
  assert.equal(matte.brightShare < 0.02, true)
  assert.equal(matte.lumaMean < 120, true)
})

test('canvas steel finish stage 5 near-mirror lowers roughness while keeping ultra-subtle height', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 96,
    metalTarnish: 0,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:stage-5-near-mirror-polish',
    seed32: 0x5ee15e05,
  } as const
  const bounds = { x: 12, y: 20, width: 240, height: 160 }
  const samplingBounds = { x: 12, y: 20, width: 240, height: 160 }
  const textureSize = { width: 96, height: 64 }
  const strokeWidth = 24
  const buildSummary = (metalPolish: number) => {
    const request = createArtworkFrameSteelFinishFieldRequest({
      bounds,
      frame: { ...frame, metalPolish },
      materialSeed,
      samplingBounds,
      strokeWidth,
      textureSize,
    })

    assert.ok(request)

    const maps = buildArtworkFrameSteelFinishDerivedMaps(
      buildArtworkFrameSteelFinishField(request),
    )

    return {
      maps,
      scratchDepth: summarizeSteelFinishDepthResponse(
        maps,
        maps.scratchTroughMask,
        0.22,
      ),
      scratchShadow: summarizeSteelFinishMaskedScalarResponse(
        maps.visibleScratchShadowMask,
        maps.scratchTroughMask,
        0.22,
      ),
      summary: summarizeSteelFinishSurfaceResponse(maps),
    }
  }
  const polish88 = buildSummary(88)
  const polish92 = buildSummary(92)
  const polish96 = buildSummary(96)
  const polish100 = buildSummary(100)

  assert.equal(polish88.maps.stageUnits.nearMirror > 0, true)
  assert.equal(polish100.maps.stageUnits.nearMirror, 1)
  assertFloatFieldsEqual(
    polish88.maps.scratchTroughMask,
    polish100.maps.scratchTroughMask,
  )
  assertFloatFieldsEqual(
    polish88.maps.gougeTroughMask,
    polish100.maps.gougeTroughMask,
  )
  assertFloatFieldsEqual(
    polish88.maps.dentPocketMask,
    polish100.maps.dentPocketMask,
  )
  assertFloatFieldsEqual(
    polish88.maps.pitPocketMask,
    polish100.maps.pitPocketMask,
  )
  assert.equal(
    polish100.summary.roughnessMean < polish96.summary.roughnessMean,
    true,
  )
  assert.equal(
    polish96.summary.roughnessMean < polish92.summary.roughnessMean,
    true,
  )
  assert.equal(
    polish100.summary.roughnessMean < polish88.summary.roughnessMean,
    true,
  )
  assert.equal(
    polish100.summary.glossMean > polish96.summary.glossMean,
    true,
  )
  assert.equal(
    polish96.summary.glossMean > polish92.summary.glossMean,
    true,
  )
  assert.equal(
    polish100.summary.heightEnergyMean > 0.00002,
    true,
  )
  assert.equal(
    polish100.summary.heightEnergyMean <
      polish88.summary.heightEnergyMean * 0.45,
    true,
  )
  assert.equal(polish100.scratchDepth.count > 8, true)
  assert.equal(polish100.scratchDepth.negativeHeightMean > 0.00002, true)
  assert.equal(
    polish100.scratchDepth.negativeHeightMean <
      polish88.scratchDepth.negativeHeightMean * 0.4,
    true,
  )
  assert.equal(polish100.scratchDepth.maxNegativeHeight < 0.0025, true)
  assert.equal(polish100.scratchDepth.aoMean < 0.000002, true)
  assert.equal(polish100.scratchShadow.count > 8, true)
  assert.equal(polish100.scratchShadow.mean < 0.000001, true)
  assert.equal(polish100.scratchShadow.max < 0.000001, true)
})

test('canvas steel finish stage 7 high-polish substrate response helper progresses smoothly', () => {
  const checkpoints = [50, 65, 75, 85, 92, 100] as const
  const upwardKeys: Array<
    keyof ReturnType<typeof getArtworkFrameSteelHighPolishSubstrateResponse>
  > = ['luma', 'gloss', 'reflectionVeilStrength']
  const downwardKeys: Array<
    keyof ReturnType<typeof getArtworkFrameSteelHighPolishSubstrateResponse>
  > = ['aoStrength', 'heightStrength', 'normalStrength', 'roughness']
  const boundedKeys: Array<
    keyof ReturnType<typeof getArtworkFrameSteelHighPolishSubstrateResponse>
  > = [
    'aoStrength',
    'anisotropyStrength',
    'gloss',
    'grainVisibility',
    'hairlineVisibilityAllowance',
    'heightStrength',
    'luma',
    'normalStrength',
    'reflectionVeilStrength',
    'roughness',
  ]
  const responses = checkpoints.map((polish) => ({
    polish,
    response: getArtworkFrameSteelHighPolishSubstrateResponse(polish),
  }))

  for (const { polish, response } of responses) {
    for (const key of boundedKeys) {
      assert.equal(
        response[key] >= 0 && response[key] <= 1,
        true,
        `${polish}% ${key} should be bounded, got ${response[key]}`,
      )
    }
  }

  for (let index = 1; index < responses.length; index += 1) {
    const previous = responses[index - 1]
    const current = responses[index]

    for (const key of upwardKeys) {
      assert.equal(
        current.response[key] >= previous.response[key],
        true,
        `${key} should not fall between ${previous.polish}% and ${current.polish}%`,
      )
    }

    for (const key of downwardKeys) {
      assert.equal(
        current.response[key] <= previous.response[key],
        true,
        `${key} should not rise between ${previous.polish}% and ${current.polish}%`,
      )
    }
  }

  const rawBrushed = getArtworkFrameSteelHighPolishSubstrateResponse(50)
  const satin = getArtworkFrameSteelHighPolishSubstrateResponse(75)
  const semiBright = getArtworkFrameSteelHighPolishSubstrateResponse(85)
  const nearMirror = getArtworkFrameSteelHighPolishSubstrateResponse(100)

  assert.equal(rawBrushed.grainVisibility > 0.9, true)
  assert.equal(rawBrushed.roughness > rawBrushed.gloss, true)
  assert.equal(satin.roughness < rawBrushed.roughness, true)
  assert.equal(satin.gloss > rawBrushed.gloss, true)
  assert.equal(
    semiBright.reflectionVeilStrength > satin.reflectionVeilStrength,
    true,
  )
  assert.equal(nearMirror.gloss > 0.9, true)
  assert.equal(nearMirror.roughness < 0.1, true)
  assert.equal(nearMirror.hairlineVisibilityAllowance < 0.04, true)
})

test('canvas steel finish stage 7 high-polish substrate response helper clamps and avoids hard gaps', () => {
  assert.deepEqual(
    getArtworkFrameSteelHighPolishSubstrateResponse(-10),
    getArtworkFrameSteelHighPolishSubstrateResponse(50),
  )
  assert.deepEqual(
    getArtworkFrameSteelHighPolishSubstrateResponse(120),
    getArtworkFrameSteelHighPolishSubstrateResponse(100),
  )

  const keys: Array<
    keyof ReturnType<typeof getArtworkFrameSteelHighPolishSubstrateResponse>
  > = [
    'aoStrength',
    'anisotropyStrength',
    'gloss',
    'grainVisibility',
    'hairlineVisibilityAllowance',
    'heightStrength',
    'luma',
    'normalStrength',
    'reflectionVeilStrength',
    'roughness',
  ]
  let previous = getArtworkFrameSteelHighPolishSubstrateResponse(50)

  for (let metalPolish = 51; metalPolish <= 100; metalPolish += 1) {
    const current =
      getArtworkFrameSteelHighPolishSubstrateResponse(metalPolish)

    assert.deepEqual(
      current,
      getArtworkFrameSteelHighPolishSubstrateResponse(metalPolish),
    )

    for (const key of keys) {
      const delta = Math.abs(current[key] - previous[key])

      assert.equal(
        delta < 0.04,
        true,
        `${key} should change smoothly near ${metalPolish}%, got ${delta}`,
      )
    }

    previous = current
  }
})

test('canvas steel finish stage 7 high-polish substrate response maps progress without moving placement', () => {
  const checkpoints = [50, 65, 75, 85, 92, 100] as const
  const samples = checkpoints.map((metalPolish) => {
    const { field, substrateMaps } =
      createStage7SubstrateOwnershipPackage(metalPolish)

    return {
      ambientOcclusion: summarizeMaskedSteelScalar(
        substrateMaps.steelSubstrateAmbientOcclusion,
        field.fields.frameMask,
      ),
      gloss: summarizeMaskedSteelScalar(
        substrateMaps.steelSubstrateGloss,
        field.fields.frameMask,
      ),
      height: summarizeMaskedSteelScalar(
        substrateMaps.steelSubstrateHeight,
        field.fields.frameMask,
      ),
      luma: summarizeMaskedSteelAlbedoLuma(
        substrateMaps.steelSubstrateAlbedo,
        field.fields.frameMask,
      ),
      metalPolish,
      normalStrength: summarizeMaskedSteelScalar(
        substrateMaps.steelSubstrateNormalStrength,
        field.fields.frameMask,
      ),
      roughness: summarizeMaskedSteelScalar(
        substrateMaps.steelSubstrateRoughness,
        field.fields.frameMask,
      ),
      substrateMaps,
    }
  })
  const baseline = samples[0]!

  for (const current of samples.slice(1)) {
    assertSteelSubstratePlacementMapsEqual(
      baseline.substrateMaps,
      current.substrateMaps,
    )
  }

  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1]!
    const current = samples[index]!

    assert.equal(
      current.luma.mean >= previous.luma.mean - 0.002,
      true,
      `substrate luma should not fall from ${previous.metalPolish}% to ${current.metalPolish}%`,
    )
    assert.equal(
      current.gloss.mean >= previous.gloss.mean - 0.002,
      true,
      `substrate gloss should not fall from ${previous.metalPolish}% to ${current.metalPolish}%`,
    )
    assert.equal(
      current.roughness.mean <= previous.roughness.mean + 0.002,
      true,
      `substrate roughness should not rise from ${previous.metalPolish}% to ${current.metalPolish}%`,
    )
    assert.equal(
      current.height.meanAbs <= previous.height.meanAbs + 0.00025,
      true,
      `substrate height should not rise from ${previous.metalPolish}% to ${current.metalPolish}%`,
    )
    assert.equal(
      current.ambientOcclusion.mean <=
        previous.ambientOcclusion.mean + 0.0008,
      true,
      `substrate AO should not rise from ${previous.metalPolish}% to ${current.metalPolish}%`,
    )
    assert.equal(
      current.normalStrength.mean <= previous.normalStrength.mean + 0.002,
      true,
      `substrate normal strength should not rise from ${previous.metalPolish}% to ${current.metalPolish}%`,
    )
  }

  const nearMirror = samples[samples.length - 1]!

  assert.equal(nearMirror.height.meanAbs > 0.00002, true)
  assert.equal(nearMirror.ambientOcclusion.maxAbs > 0.000001, true)
  assert.equal(nearMirror.normalStrength.mean > 0.001, true)
  assert.equal(nearMirror.roughness.mean < baseline.roughness.mean, true)
  assert.equal(nearMirror.gloss.mean > baseline.gloss.mean, true)
  assert.equal(nearMirror.luma.mean > baseline.luma.mean, true)
})

test('canvas steel finish stage 7 anchors 50 percent as raw brushed steel without low-polish damage', () => {
  const overhead = (polish: number) =>
    renderFlatSteelShadingDiagnostic({
      lightPosition: { x: 0, y: 0 },
      polish,
      tarnish: 0,
    })
  const polish30 = overhead(30)
  const polish50 = overhead(50)
  const polish75 = overhead(75)
  const polish85 = overhead(85)
  const polish100 = overhead(100)

  assert.ok(polish50.rendered.steelFinishMaps)

  const summary50 = summarizeSteelFinishSurfaceResponse(
    polish50.rendered.steelFinishMaps,
  )
  const summary75 = summarizeSteelFinishSurfaceResponse(
    polish75.rendered.steelFinishMaps!,
  )
  const summary85 = summarizeSteelFinishSurfaceResponse(
    polish85.rendered.steelFinishMaps!,
  )
  const summary100 = summarizeSteelFinishSurfaceResponse(
    polish100.rendered.steelFinishMaps!,
  )

  assert.equal(
    polish50.diagnostics.regions.all.luminanceMean >
      polish30.diagnostics.regions.all.luminanceMean,
    true,
  )
  assert.equal(
    polish50.diagnostics.regions.all.luminanceMean <
      polish75.diagnostics.regions.all.luminanceMean,
    true,
  )
  assert.equal(summary50.roughnessMean > summary75.roughnessMean, true)
  assert.equal(summary50.roughnessMean > summary85.roughnessMean, true)
  assert.equal(summary50.roughnessMean > summary100.roughnessMean, true)
  assert.equal(summary50.glossMean < summary75.glossMean, true)
  assert.equal(summary50.glossMean < summary85.glossMean, true)
  assert.equal(summary50.glossMean < summary100.glossMean, true)

  const defects = getSteelFinishDefectDecalMaps(
    polish50.rendered.steelFinishMaps,
  )

  for (
    const lowPolishKind of [
      'burrNick',
      'dent',
      'gouge',
      'pit',
      'scuff',
    ] as const
  ) {
    assert.equal(
      sumSteelDefectAllPhysicalContributionValues(defects, lowPolishKind),
      0,
      `50% should not retain visible ${lowPolishKind} physical damage`,
    )
  }
  assert.equal(
    summarizeArtworkFrameCorrosionScalarField(
      polish50.rendered.steelFinishMaps.visiblePitShadowMask,
    ).max,
    0,
  )
  assert.equal(
    summarizeArtworkFrameCorrosionScalarField(
      polish50.rendered.steelFinishMaps.visiblePitAmbientOcclusionMask,
    ).max,
    0,
  )
  assert.equal(
    summarizeArtworkFrameCorrosionScalarField(
      polish50.rendered.steelFinishMaps.visiblePitDepthMask,
    ).max,
    0,
  )
  const isolatedPixelLift = countIsolatedSubtleSteelPixelLift(
    polish50.rendered.imageData,
    polish50.rendered.steelFinishMaps,
  )

  assert.equal(
    isolatedPixelLift.isolatedLiftCount <= 4,
    true,
    `50% brushed baseline should not contain isolated bright/cool stray pixels; found ${isolatedPixelLift.isolatedLiftCount}`,
  )
  assert.equal(
    isolatedPixelLift.maxLocalLumaDelta < 8,
    true,
    `50% brushed baseline should avoid one-pixel luma lifts like stray pixels; max local delta ${isolatedPixelLift.maxLocalLumaDelta}`,
  )
})

test('canvas steel finish stage 7 anchors 75 percent as satin brushed steel without low-polish damage', () => {
  const render = (
    polish: number,
    lightPosition: { x: number; y: number } = { x: 0, y: 0 },
  ) =>
    renderFlatSteelShadingDiagnostic({
      lightPosition,
      polish,
      tarnish: 0,
    })
  const polish50 = render(50)
  const polish75 = render(75)
  const polish85 = render(85)
  const polish100 = render(100)
  const grazing75 = render(75, {
    x: Math.SQRT1_2,
    y: -Math.SQRT1_2,
  })

  assert.ok(polish50.rendered.steelFinishMaps)
  assert.ok(polish75.rendered.steelFinishMaps)
  assert.ok(grazing75.rendered.steelFinishMaps)
  assert.ok(polish75.rendered.steelFinishNormalInputs)
  assert.ok(grazing75.rendered.steelFinishNormalInputs)

  const summary50 = summarizeSteelFinishSurfaceResponse(
    polish50.rendered.steelFinishMaps,
  )
  const summary75 = summarizeSteelFinishSurfaceResponse(
    polish75.rendered.steelFinishMaps,
  )
  const summary85 = summarizeSteelFinishSurfaceResponse(
    polish85.rendered.steelFinishMaps!,
  )
  const summary100 = summarizeSteelFinishSurfaceResponse(
    polish100.rendered.steelFinishMaps!,
  )

  assert.equal(
    polish75.diagnostics.regions.all.luminanceMean >
      polish50.diagnostics.regions.all.luminanceMean,
    true,
  )
  assert.equal(summary75.roughnessMean < summary50.roughnessMean, true)
  assert.equal(summary75.glossMean > summary50.glossMean, true)
  assert.equal(summary75.glossMean < summary85.glossMean, true)
  assert.equal(summary75.glossMean < summary100.glossMean, true)
  assert.equal(summary75.heightEnergyMean > 0.0005, true)

  const defects50 = getSteelFinishDefectDecalMaps(
    polish50.rendered.steelFinishMaps,
  )
  const defects75 = getSteelFinishDefectDecalMaps(
    polish75.rendered.steelFinishMaps,
  )
  const scratch50 = sumSteelDefectAllPhysicalContributionValues(
    defects50,
    'scratch',
  )
  const scratch75 = sumSteelDefectAllPhysicalContributionValues(
    defects75,
    'scratch',
  )

  assert.equal(scratch75 > 0, true)
  assert.equal(scratch75 < scratch50 * 0.65, true)

  for (
    const lowPolishKind of [
      'burrNick',
      'dent',
      'gouge',
      'pit',
      'scuff',
    ] as const
  ) {
    assert.equal(
      sumSteelDefectAllPhysicalContributionValues(defects75, lowPolishKind),
      0,
      `75% should not retain visible ${lowPolishKind} physical damage`,
    )
  }
  for (
    const legacyMask of [
      polish75.rendered.steelFinishMaps.visibleBurrRidgeMask,
      polish75.rendered.steelFinishMaps.visibleDentDepthMask,
      polish75.rendered.steelFinishMaps.visibleDentShadowMask,
      polish75.rendered.steelFinishMaps.visibleGougeDepthMask,
      polish75.rendered.steelFinishMaps.visibleGougeShadowMask,
      polish75.rendered.steelFinishMaps.visiblePitDepthMask,
      polish75.rendered.steelFinishMaps.visiblePitShadowMask,
      polish75.rendered.steelFinishMaps.scuffCrossScratchRimShadowMask,
    ]
  ) {
    assert.equal(
      summarizeArtworkFrameCorrosionScalarField(legacyMask).max,
      0,
    )
  }
  assertSteelFinishDerivedMapsEqual(
    polish75.rendered.steelFinishMaps,
    grazing75.rendered.steelFinishMaps,
  )
  assertSteelFinishNormalInputsEqual(
    polish75.rendered.steelFinishNormalInputs,
    grazing75.rendered.steelFinishNormalInputs,
  )
  assert.equal(
    countDifferentBytes(
      polish75.rendered.imageData.data,
      grazing75.rendered.imageData.data,
    ) > 120,
    true,
  )
})

test('canvas steel finish stage 7 anchors 85 percent as semi-bright polished steel without low-polish damage', () => {
  const render = (
    polish: number,
    lightPosition: { x: number; y: number } = { x: 0, y: 0 },
    tarnish = 0,
  ) =>
    renderFlatSteelShadingDiagnostic({
      lightPosition,
      polish,
      tarnish,
    })
  const polish75 = render(75)
  const polish85 = render(85)
  const polish100 = render(100)
  const grazing85 = render(85, {
    x: Math.SQRT1_2,
    y: -Math.SQRT1_2,
  })
  const tarnished85 = render(85, { x: 0, y: 0 }, 80)

  assert.ok(polish75.rendered.steelFinishMaps)
  assert.ok(polish85.rendered.steelFinishMaps)
  assert.ok(polish100.rendered.steelFinishMaps)
  assert.ok(grazing85.rendered.steelFinishMaps)
  assert.ok(polish85.rendered.steelFinishNormalInputs)
  assert.ok(grazing85.rendered.steelFinishNormalInputs)

  const summary75 = summarizeSteelFinishSurfaceResponse(
    polish75.rendered.steelFinishMaps,
  )
  const summary85 = summarizeSteelFinishSurfaceResponse(
    polish85.rendered.steelFinishMaps,
  )
  const summary100 = summarizeSteelFinishSurfaceResponse(
    polish100.rendered.steelFinishMaps,
  )
  const reflectionGradient = summarizeSteelFinishScalarGradient(
    polish85.rendered.steelFinishMaps.polishedReflectionMask,
    polish85.rendered.steelFinishMaps.widthPixels,
    polish85.rendered.steelFinishMaps.heightPixels,
  )
  const grainGradient = summarizeSteelFinishScalarGradient(
    polish85.rendered.steelFinishMaps.brushedGrainMask,
    polish85.rendered.steelFinishMaps.widthPixels,
    polish85.rendered.steelFinishMaps.heightPixels,
  )
  const isolated = countIsolatedBrightSteelPixels(
    polish85.rendered.imageData,
    polish85.rendered.steelFinishMaps,
  )

  assert.equal(summary85.glossMean > summary75.glossMean, true)
  assert.equal(summary85.roughnessMean < summary75.roughnessMean, true)
  assert.equal(summary85.glossMean < summary100.glossMean, true)
  assert.equal(summary85.roughnessMean > summary100.roughnessMean, true)
  assert.equal(
    reflectionGradient.meanGradient < grainGradient.meanGradient * 0.9,
    true,
  )
  assert.equal(isolated.isolatedBrightCount <= 3, true)
  assert.equal(isolated.isolatedBrightShare < 0.001, true)
  assert.equal(isolated.maxLocalDelta < 28, true)

  const defects75 = getSteelFinishDefectDecalMaps(
    polish75.rendered.steelFinishMaps,
  )
  const defects85 = getSteelFinishDefectDecalMaps(
    polish85.rendered.steelFinishMaps,
  )
  const scratch75 = sumSteelDefectAllPhysicalContributionValues(
    defects75,
    'scratch',
  )
  const scratch85 = sumSteelDefectAllPhysicalContributionValues(
    defects85,
    'scratch',
  )

  assert.equal(scratch85 < scratch75 * 0.5, true)

  for (
    const lowPolishKind of [
      'burrNick',
      'dent',
      'gouge',
      'pit',
      'scuff',
    ] as const
  ) {
    assert.equal(
      sumSteelDefectAllPhysicalContributionValues(defects85, lowPolishKind),
      0,
      `85% should not retain visible ${lowPolishKind} physical damage`,
    )
  }
  for (
    const legacyMask of [
      polish85.rendered.steelFinishMaps.visibleBurrRidgeMask,
      polish85.rendered.steelFinishMaps.visibleDentDepthMask,
      polish85.rendered.steelFinishMaps.visibleDentShadowMask,
      polish85.rendered.steelFinishMaps.visibleGougeDepthMask,
      polish85.rendered.steelFinishMaps.visibleGougeShadowMask,
      polish85.rendered.steelFinishMaps.visiblePitDepthMask,
      polish85.rendered.steelFinishMaps.visiblePitShadowMask,
      polish85.rendered.steelFinishMaps.scuffCrossScratchRimShadowMask,
    ]
  ) {
    assert.equal(
      summarizeArtworkFrameCorrosionScalarField(legacyMask).max,
      0,
    )
  }

  assertSteelFinishDerivedMapsEqual(
    polish85.rendered.steelFinishMaps,
    grazing85.rendered.steelFinishMaps,
  )
  assertSteelFinishNormalInputsEqual(
    polish85.rendered.steelFinishNormalInputs,
    grazing85.rendered.steelFinishNormalInputs,
  )
  assert.equal(
    countDifferentBytes(
      polish85.rendered.imageData.data,
      grazing85.rendered.imageData.data,
    ) > 120,
    true,
  )

  const matte = summarizeCorrodedPolishedSteelResponse(tarnished85.rendered)

  assert.equal(matte.corrosionCount > 100, true)
  assert.equal(
    matte.corrosionRoughnessMean > matte.steelRoughnessMean + 0.14,
    true,
  )
  assert.equal(matte.brightShare < 0.02, true)
})

test('canvas steel finish stage 7 anchors 100 percent as near-mirror polished steel without damage ghosts', () => {
  const render = (
    polish: number,
    lightPosition: { x: number; y: number } = { x: 0, y: 0 },
  ) =>
    renderFlatSteelShadingDiagnostic({
      lightPosition,
      polish,
      tarnish: 0,
    })
  const polish75 = render(75)
  const polish85 = render(85)
  const polish100 = render(100)
  const grazing100 = render(100, {
    x: Math.SQRT1_2,
    y: -Math.SQRT1_2,
  })

  assert.ok(polish75.rendered.steelFinishMaps)
  assert.ok(polish85.rendered.steelFinishMaps)
  assert.ok(polish100.rendered.steelFinishMaps)
  assert.ok(grazing100.rendered.steelFinishMaps)
  assert.ok(polish100.rendered.steelFinishNormalInputs)
  assert.ok(grazing100.rendered.steelFinishNormalInputs)

  const summary75 = summarizeSteelFinishSurfaceResponse(
    polish75.rendered.steelFinishMaps,
  )
  const summary85 = summarizeSteelFinishSurfaceResponse(
    polish85.rendered.steelFinishMaps,
  )
  const summary100 = summarizeSteelFinishSurfaceResponse(
    polish100.rendered.steelFinishMaps,
  )
  const normal85 = summarizeSteelFinishNormalInputs(
    polish85.rendered.steelFinishNormalInputs!,
  )
  const normal100 = summarizeSteelFinishNormalInputs(
    polish100.rendered.steelFinishNormalInputs,
  )
  const reflectionGradient = summarizeSteelFinishScalarGradient(
    polish100.rendered.steelFinishMaps.polishedReflectionMask,
    polish100.rendered.steelFinishMaps.widthPixels,
    polish100.rendered.steelFinishMaps.heightPixels,
  )
  const grainGradient = summarizeSteelFinishScalarGradient(
    polish100.rendered.steelFinishMaps.brushedGrainMask,
    polish100.rendered.steelFinishMaps.widthPixels,
    polish100.rendered.steelFinishMaps.heightPixels,
  )
  const isolated = countIsolatedBrightSteelPixels(
    polish100.rendered.imageData,
    polish100.rendered.steelFinishMaps,
  )

  assert.equal(summary100.glossMean > summary85.glossMean, true)
  assert.equal(summary100.glossMean > summary75.glossMean, true)
  assert.equal(summary100.roughnessMean < summary85.roughnessMean, true)
  assert.equal(summary100.roughnessMean < summary75.roughnessMean, true)
  assert.equal(summary100.heightEnergyMean > 0.00002, true)
  assert.equal(
    summary100.heightEnergyMean < summary85.heightEnergyMean * 0.45,
    true,
  )
  assert.equal(normal100.meanTilt > 0.00005, true)
  assert.equal(normal100.meanTilt < normal85.meanTilt * 0.5, true)
  assert.equal(
    reflectionGradient.meanGradient < grainGradient.meanGradient * 0.75,
    true,
  )
  assert.equal(isolated.isolatedBrightCount <= 3, true)
  assert.equal(isolated.isolatedBrightShare < 0.001, true)
  assert.equal(isolated.maxLocalDelta < 28, true)

  const defects85 = getSteelFinishDefectDecalMaps(
    polish85.rendered.steelFinishMaps,
  )
  const defects100 = getSteelFinishDefectDecalMaps(
    polish100.rendered.steelFinishMaps,
  )
  const scratch85 = sumSteelDefectAllPhysicalContributionValues(
    defects85,
    'scratch',
  )
  const scratch100 = sumSteelDefectAllPhysicalContributionValues(
    defects100,
    'scratch',
  )

  assert.equal(scratch100 <= scratch85 * 0.12, true)

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    const expectedMaximum = kind === 'scratch' ? scratch85 * 0.12 : 0

    assert.equal(
      sumSteelDefectAllPhysicalContributionValues(defects100, kind) <=
        expectedMaximum,
      true,
      `100% should not retain meaningful ${kind} physical damage`,
    )
    assert.equal(
      sumSteelDefectPhysicalContributionValues(
        defects100,
        kind,
        'selfShadowReceiver',
      ),
      0,
      `100% inactive ${kind} self-shadow receiver should be zero`,
    )
  }
  for (
    const legacyMask of [
      polish100.rendered.steelFinishMaps.visibleBurrRidgeMask,
      polish100.rendered.steelFinishMaps.visibleDentDepthMask,
      polish100.rendered.steelFinishMaps.visibleDentShadowMask,
      polish100.rendered.steelFinishMaps.visibleGougeDepthMask,
      polish100.rendered.steelFinishMaps.visibleGougeShadowMask,
      polish100.rendered.steelFinishMaps.visiblePitDepthMask,
      polish100.rendered.steelFinishMaps.visiblePitShadowMask,
    ]
  ) {
    assert.equal(
      summarizeArtworkFrameCorrosionScalarField(legacyMask).max,
      0,
    )
  }

  assertSteelFinishDerivedMapsEqual(
    polish100.rendered.steelFinishMaps,
    grazing100.rendered.steelFinishMaps,
  )
  assertSteelFinishNormalInputsEqual(
    polish100.rendered.steelFinishNormalInputs,
    grazing100.rendered.steelFinishNormalInputs,
  )
  assert.equal(
    countDifferentBytes(
      polish100.rendered.imageData.data,
      grazing100.rendered.imageData.data,
    ) > 120,
    true,
  )
})

test('canvas steel finish stage 7 high-polish damage survival gates keep only hairlines', () => {
  const render = (
    polish: number,
    lightPosition: { x: number; y: number } = { x: 0, y: 0 },
  ) =>
    renderFlatSteelShadingDiagnostic({
      lightPosition,
      polish,
      tarnish: 0,
    })
  const checkpoints = [75, 85, 92, 100] as const
  const renderedByPolish = checkpoints.map((polish) => ({
    grazing: render(polish, {
      x: Math.SQRT1_2,
      y: -Math.SQRT1_2,
    }),
    overhead: render(polish),
    polish,
  }))
  const scratch75 = sumSteelDefectAllPhysicalContributionValues(
    getSteelFinishDefectDecalMaps(
      renderedByPolish.find(({ polish }) => polish === 75)!.overhead.rendered
        .steelFinishMaps!,
    ),
    'scratch',
  )

  for (const { grazing, overhead, polish } of renderedByPolish) {
    assert.ok(overhead.rendered.steelFinishMaps)
    assert.ok(grazing.rendered.steelFinishMaps)
    assert.ok(overhead.rendered.steelFinishNormalInputs)
    assert.ok(grazing.rendered.steelFinishNormalInputs)

    const maps = overhead.rendered.steelFinishMaps
    const defects = getSteelFinishDefectDecalMaps(maps)
    const scratchPhysical = sumSteelDefectAllPhysicalContributionValues(
      defects,
      'scratch',
    )

    assert.equal(
      sumSteelDefectStablePlacementCandidateValues(defects, 'scratch') > 0,
      true,
      `${polish}% should retain stable scratch placement candidates`,
    )
    assert.equal(
      sumSteelDefectActiveBodyValues(defects, 'scratch') > 0,
      true,
      `${polish}% should retain only scratch/hairline active bodies`,
    )
    assert.equal(
      scratchPhysical > 0,
      true,
      `${polish}% should retain only scratch/hairline physical response`,
    )
    assert.equal(
      scratchPhysical <= scratch75,
      true,
      `${polish}% scratch/hairline response should not exceed the 75% satin endpoint`,
    )
    assert.equal(
      sumSteelDefectPhysicalContributionValues(
        defects,
        'scratch',
        'selfShadowReceiver',
      ),
      0,
      `${polish}% scratch/hairlines should not receive defect self-shadow`,
    )

    for (
      const inactiveKind of [
        'burrNick',
        'dent',
        'gouge',
        'pit',
        'scuff',
      ] as const
    ) {
      assert.equal(
        sumSteelDefectStablePlacementCandidateValues(defects, inactiveKind) > 0,
        true,
        `${polish}% may retain stable ${inactiveKind} placement candidates`,
      )
      assert.equal(
        sumSteelDefectActiveBodyValues(defects, inactiveKind),
        0,
        `${polish}% ${inactiveKind} active bodies should be exact-zero`,
      )
      assert.equal(
        sumSteelDefectAllPhysicalContributionValues(defects, inactiveKind),
        0,
        `${polish}% ${inactiveKind} physical contributions should be exact-zero`,
      )
      assert.equal(
        sumSteelDefectPhysicalContributionValues(
          defects,
          inactiveKind,
          'selfShadowReceiver',
        ),
        0,
        `${polish}% inactive ${inactiveKind} self-shadow receiver should be exact-zero`,
      )
    }

    for (
      const legacyMask of [
        maps.visibleBurrRidgeMask,
        maps.visibleDentAmbientOcclusionMask,
        maps.visibleDentDepthMask,
        maps.visibleDentShadowMask,
        maps.visibleGougeAmbientOcclusionMask,
        maps.visibleGougeDepthMask,
        maps.visibleGougeShadowMask,
        maps.visiblePitAmbientOcclusionMask,
        maps.visiblePitDepthMask,
        maps.visiblePitShadowMask,
      ]
    ) {
      assert.equal(
        summarizeArtworkFrameCorrosionScalarField(legacyMask).max,
        0,
        `${polish}% inactive non-scratch legacy physical masks should be zero`,
      )
    }

    assertSteelFinishDerivedMapsEqual(
      overhead.rendered.steelFinishMaps,
      grazing.rendered.steelFinishMaps,
    )
    assertSteelFinishNormalInputsEqual(
      overhead.rendered.steelFinishNormalInputs,
      grazing.rendered.steelFinishNormalInputs,
    )
    assert.equal(
      countDifferentBytes(
        overhead.rendered.imageData.data,
        grazing.rendered.imageData.data,
      ) > 120,
      true,
      `${polish}% light should alter final shaded pixels only`,
    )
  }

  const scratch100 = sumSteelDefectAllPhysicalContributionValues(
    getSteelFinishDefectDecalMaps(
      renderedByPolish.find(({ polish }) => polish === 100)!.overhead.rendered
        .steelFinishMaps!,
    ),
    'scratch',
  )

  assert.equal(
    scratch100 < scratch75 * 0.12,
    true,
    '100% scratch/hairline physical response should be ultra-faint',
  )
})

test('canvas steel finish exposes substrate maps across polish 0 to 100 for diagnostics', () => {
  for (const metalPolish of [0, 10, 25, 30, 50, 75, 85, 100]) {
    const { cleanSteelMaps, field, substrateMaps } =
      createStage7SubstrateOwnershipPackage(metalPolish)
    const returnedSubstrateMaps = cleanSteelMaps.substrateMaps

    assert.ok(
      returnedSubstrateMaps,
      `${metalPolish}% composed steel maps should expose substrate diagnostics`,
    )
    assertSteelSubstrateDerivedMapsEqual(returnedSubstrateMaps, substrateMaps)

    const heightSummary = summarizeMaskedSteelScalar(
      returnedSubstrateMaps.steelSubstrateHeight,
      field.fields.frameMask,
    )
    const roughnessSummary = summarizeMaskedSteelScalar(
      returnedSubstrateMaps.steelSubstrateRoughness,
      field.fields.frameMask,
    )
    const glossSummary = summarizeMaskedSteelScalar(
      returnedSubstrateMaps.steelSubstrateGloss,
      field.fields.frameMask,
    )
    const anisotropySummary = summarizeMaskedSteelScalar(
      returnedSubstrateMaps.steelSubstrateAnisotropy,
      field.fields.frameMask,
    )
    const microStrandSummary = summarizeMaskedSteelScalar(
      returnedSubstrateMaps.steelSubstrateMicroStrandMask,
      field.fields.frameMask,
    )
    const reflectionSummary = summarizeMaskedSteelScalar(
      returnedSubstrateMaps.steelSubstrateReflectionVeil,
      field.fields.frameMask,
    )

    assert.equal(
      heightSummary.meanAbs > (metalPolish === 100 ? 0.00002 : 0.00008),
      true,
      `${metalPolish}% substrate height should remain subtle and nonzero`,
    )
    assert.equal(
      roughnessSummary.mean > (metalPolish === 100 ? 0.04 : 0.075),
      true,
      `${metalPolish}% substrate roughness should remain populated`,
    )
    assert.equal(
      glossSummary.mean >= 0 && glossSummary.mean <= 1,
      true,
      `${metalPolish}% substrate gloss should remain bounded`,
    )
    assert.equal(
      anisotropySummary.mean > 0.35,
      true,
      `${metalPolish}% substrate anisotropy should remain populated`,
    )
    assert.equal(
      microStrandSummary.maxAbs > 0.2,
      true,
      `${metalPolish}% substrate micro-strand placement should remain visible in maps`,
    )
    assert.equal(
      reflectionSummary.mean > 0.1,
      true,
      `${metalPolish}% substrate reflection veil should remain populated`,
    )
  }
})

test('canvas steel finish exposed substrate diagnostics do not affect clean steel shading', () => {
  for (const metalPolish of [0, 10, 25, 30, 50, 75, 85, 100]) {
    const { cleanSteelMaps, normalInputs } =
      createStage7SubstrateOwnershipPackage(metalPolish)

    assert.ok(cleanSteelMaps.substrateMaps)

    const mapsWithoutDiagnostics = {
      ...cleanSteelMaps,
      substrateMaps: null,
    }
    const coordinates = {
      frameAspectRatio: 240 / 160,
      frameBounds: { x: 12, y: 20, width: 240, height: 160 },
      frameCenter: { x: 132, y: 100 },
      materialPixelSize: {
        x: 240 / cleanSteelMaps.widthPixels,
        y: 160 / cleanSteelMaps.heightPixels,
      },
      samplingBounds: { x: 12, y: 20, width: 240, height: 160 },
      textureBounds: { x: 12, y: 20, width: 240, height: 160 },
      textureSize: {
        height: cleanSteelMaps.heightPixels,
        scale: 1,
        width: cleanSteelMaps.widthPixels,
      },
    }
    const shade = (steelFinishMaps: typeof cleanSteelMaps) =>
      shadeArtworkFrameCanvasMaterialImageData({
        coordinates,
        corrosionMaps: null,
        imageData: createMaterialTestImageData(
          cleanSteelMaps.widthPixels,
          cleanSteelMaps.heightPixels,
        ),
        lighting: {
          lightVector: createArtworkFrameMaterialHemisphereLightVector({
            x: Math.SQRT1_2,
            y: -Math.SQRT1_2,
          }),
        },
        metalBrushAngle: 12,
        steelFinishMaps,
        steelFinishNormalInputs: normalInputs,
      })

    assertImageDataEqual(
      shade(cleanSteelMaps),
      shade(mapsWithoutDiagnostics),
    )
  }
})

test('canvas steel finish stage 7 high-polish clean maps stay substrate-owned after the 6.5 handoff', () => {
  for (const metalPolish of [75, 85, 100]) {
    const { cleanSteelMaps, field, substrateMaps } =
      createStage7SubstrateOwnershipPackage(metalPolish)
    const heightDelta = summarizeMaskedSteelScalarDelta(
      cleanSteelMaps.steelHeight,
      substrateMaps.steelSubstrateHeight,
      field.fields.frameMask,
    )
    const substrateHeight = summarizeMaskedSteelScalar(
      substrateMaps.steelSubstrateHeight,
      field.fields.frameMask,
    )
    const cleanHeight = summarizeMaskedSteelScalar(
      cleanSteelMaps.steelHeight,
      field.fields.frameMask,
    )
    const albedoDelta = summarizeMaskedSteelAlbedoLumaDelta(
      cleanSteelMaps.steelAlbedo,
      substrateMaps.steelSubstrateAlbedo,
      field.fields.frameMask,
    )
    const roughnessDelta = summarizeMaskedSteelScalarDelta(
      cleanSteelMaps.steelRoughness,
      substrateMaps.steelSubstrateRoughness,
      field.fields.frameMask,
    )
    const glossDelta = summarizeMaskedSteelScalarDelta(
      cleanSteelMaps.steelGloss,
      substrateMaps.steelSubstrateGloss,
      field.fields.frameMask,
    )
    const anisotropyDelta = summarizeMaskedSteelScalarDelta(
      cleanSteelMaps.steelAnisotropy,
      substrateMaps.steelSubstrateAnisotropy,
      field.fields.frameMask,
    )

    assert.equal(
      albedoDelta.meanAbs < 0.025,
      true,
      `${metalPolish}% clean albedo should remain close to substrate albedo; got ${albedoDelta.meanAbs}`,
    )
    assert.equal(
      roughnessDelta.meanAbs < 0.025,
      true,
      `${metalPolish}% clean roughness should remain close to substrate roughness; got ${roughnessDelta.meanAbs}`,
    )
    assert.equal(
      glossDelta.meanAbs < 0.025,
      true,
      `${metalPolish}% clean gloss should remain close to substrate gloss; got ${glossDelta.meanAbs}`,
    )
    assert.equal(
      anisotropyDelta.meanAbs < 0.08,
      true,
      `${metalPolish}% clean anisotropy should remain close to substrate anisotropy; got ${anisotropyDelta.meanAbs}`,
    )
    assert.equal(
      heightDelta.meanAbs < 0.006,
      true,
      `${metalPolish}% clean height should remain substrate-owned; got ${heightDelta.meanAbs}`,
    )
    assert.equal(
      cleanHeight.meanAbs <= substrateHeight.meanAbs * 8,
      true,
      `${metalPolish}% clean height should not be dominated by legacy relief; clean ${cleanHeight.meanAbs}, substrate ${substrateHeight.meanAbs}`,
    )
  }
})

test('canvas steel finish returned substrate placement maps stay anchored across polish and tarnish', () => {
  const baseline = createStage7SubstrateOwnershipPackage(50)

  assert.ok(baseline.cleanSteelMaps.substrateMaps)

  for (const metalPolish of [0, 10, 25, 30, 75, 85, 100]) {
    const current = createStage7SubstrateOwnershipPackage(metalPolish)

    assert.ok(current.cleanSteelMaps.substrateMaps)
    assertSteelSubstrateFieldsEqual(
      baseline.substrateField,
      current.substrateField,
    )
    assertSteelSubstratePlacementMapsEqual(
      baseline.cleanSteelMaps.substrateMaps,
      current.cleanSteelMaps.substrateMaps,
    )
  }

  const tarnished = createStage7SubstrateOwnershipPackage(50, {
    metalTarnish: 80,
  })

  assert.ok(tarnished.cleanSteelMaps.substrateMaps)
  assertSteelSubstrateFieldsEqual(
    baseline.substrateField,
    tarnished.substrateField,
  )
  assertSteelSubstratePlacementMapsEqual(
    baseline.cleanSteelMaps.substrateMaps,
    tarnished.cleanSteelMaps.substrateMaps,
  )
})

test('canvas steel finish stage 7 light changes final shading only', () => {
  for (const polish of [30, 50, 85]) {
    const overhead = renderFlatSteelShadingDiagnostic({
      lightPosition: { x: 0, y: 0 },
      polish,
      tarnish: 0,
    }).rendered
    const grazing = renderFlatSteelShadingDiagnostic({
      lightPosition: { x: Math.SQRT1_2, y: -Math.SQRT1_2 },
      polish,
      tarnish: 0,
    }).rendered

    assert.ok(overhead.steelFinishMaps)
    assert.ok(grazing.steelFinishMaps)
    assert.ok(overhead.steelFinishMaps.substrateMaps)
    assert.ok(grazing.steelFinishMaps.substrateMaps)
    assert.ok(overhead.steelFinishNormalInputs)
    assert.ok(grazing.steelFinishNormalInputs)

    assertSteelSubstrateDerivedMapsEqual(
      overhead.steelFinishMaps.substrateMaps,
      grazing.steelFinishMaps.substrateMaps,
    )
    assertSteelFinishDerivedMapsEqual(
      overhead.steelFinishMaps,
      grazing.steelFinishMaps,
    )
    assertSteelFinishNormalInputsEqual(
      overhead.steelFinishNormalInputs,
      grazing.steelFinishNormalInputs,
    )
    assert.equal(
      countDifferentBytes(overhead.imageData.data, grazing.imageData.data) >
        120,
      true,
      `${polish}% final pixels should change with light while maps stay fixed`,
    )
  }
})

test('canvas steel finish stage 5 changes shading with light without moving maps', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 96,
    metalTarnish: 0,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:stage-5-light-only-shading',
    seed32: 0x5157a6e5,
  } as const
  const bounds = { x: 12, y: 20, width: 240, height: 160 }
  const renderWithLight = (lightVector: { x: number; y: number; z: number }) => {
    const angleFrame = frame
    const stroke = getArtworkFrameStrokeWidth(
      angleFrame,
      bounds.width,
      bounds.height,
    )
    const pathData = createMetalArtworkFramePathData(
      angleFrame,
      bounds,
      stroke,
    )
    const plan = buildMetalArtworkFrameMaterialPlan({
      bounds,
      clipPathData: pathData,
      frame: angleFrame,
      materialSeed,
      pathData,
      strokeWidth: stroke,
    })

    assert.ok(plan.canvasTexture?.steelFinishFieldRequest)

    const canvas = createDeterministicMaterialCanvas()

    return renderArtworkFrameCanvasMaterialTexture(
      {
        ...plan.canvasTexture,
        corrosionFieldRequest: null,
        lighting: {
          lightVector,
        },
      },
      {
        createCanvas: canvas.createCanvas,
        createPath: (path) => ({ path } as unknown as Path2D),
      },
    )
  }
  const lowAngle = renderWithLight(
    createArtworkFrameMaterialHemisphereLightVector({ x: 0, y: 0 }),
  )
  const highAngle = renderWithLight(
    createArtworkFrameMaterialHemisphereLightVector({ x: -1, y: 0 }),
  )

  assert.ok(lowAngle.steelFinishMaps)
  assert.ok(highAngle.steelFinishMaps)
  assert.ok(lowAngle.steelFinishNormalInputs)
  assert.ok(highAngle.steelFinishNormalInputs)
  assertSteelFinishDerivedMapsEqual(
    lowAngle.steelFinishMaps,
    highAngle.steelFinishMaps,
  )
  assertSteelFinishNormalInputsEqual(
    lowAngle.steelFinishNormalInputs,
    highAngle.steelFinishNormalInputs,
  )
  assert.equal(
    countDifferentBytes(lowAngle.imageData.data, highAngle.imageData.data) >
      120,
    true,
  )
})

test('canvas steel finish stage 5 rust composition overrides clean polish', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 24,
    metalPolish: 100,
    metalTarnish: 80,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 12, y: 20, width: 240, height: 160 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const pathData = createMetalArtworkFramePathData(frame, bounds, stroke)
  const plan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    materialSeed: {
      algorithm: 'sha256-image-v1',
      key: 'sha256-image-v1:stage-5-rust-over-near-mirror',
      seed32: 0x20280515,
    },
    pathData,
    strokeWidth: stroke,
  })
  const canvas = createDeterministicMaterialCanvas()
  const rendered = renderArtworkFrameCanvasMaterialTexture(
    {
      ...plan.canvasTexture,
    },
    {
      createCanvas: canvas.createCanvas,
      createPath: (path) => ({ path } as unknown as Path2D),
    },
  )

  const matte = summarizeCorrodedPolishedSteelResponse(rendered)
  const chips = summarizeExposedCorrosionChipResponse(rendered)

  assert.equal(matte.corrosionCount > 100, true)
  assert.equal(
    matte.corrosionRoughnessMean > matte.steelRoughnessMean + 0.2,
    true,
  )
  assert.equal(matte.brightShare < 0.02, true)
  assert.equal(chips.chipCount > 8, true)
  assert.equal(chips.rustScaleCount > 40, true)
  assert.equal(
    chips.rustScaleRoughnessMean > chips.chipRoughnessMean,
    true,
  )
  assert.equal(chips.chipLumaMean > chips.rustScaleLumaMean, true)
})

test('canvas steel finish composes under corrosion without moving map geometry', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 18,
    metalPolish: 100,
    metalTarnish: 80,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 12, y: 20, width: 240, height: 160 }
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:steel-corrosion-composition',
    seed32: 0xc0470517,
  } as const
  const renderAt = (
    metalPolish: number,
    metalTarnish: number,
    lightVector: { x: number; y: number; z: number } =
      ARTWORK_FRAME_MATERIAL_OVERHEAD_LIGHT_VECTOR,
  ) => {
    const nextFrame = {
      ...frame,
      metalPolish,
      metalTarnish,
    }
    const stroke = getArtworkFrameStrokeWidth(
      nextFrame,
      bounds.width,
      bounds.height,
    )
    const pathData = createMetalArtworkFramePathData(
      nextFrame,
      bounds,
      stroke,
    )
    const plan = buildMetalArtworkFrameMaterialPlan({
      bounds,
      clipPathData: pathData,
      frame: nextFrame,
      materialSeed,
      pathData,
      strokeWidth: stroke,
    })

    assert.ok(plan.canvasTexture?.steelFinishFieldRequest)
    assert.ok(plan.canvasTexture.corrosionFieldRequest)

    const canvas = createDeterministicMaterialCanvas()

    return renderArtworkFrameCanvasMaterialTexture(
      {
        ...plan.canvasTexture,
        lighting: {
          lightVector,
        },
      },
      {
        createCanvas: canvas.createCanvas,
        createPath: (path) => ({ path } as unknown as Path2D),
      },
    )
  }
  const rustedRough = renderAt(0, 80)
  const rustedBrushed = renderAt(50, 80)
  const rustedPolished = renderAt(100, 80)

  assert.ok(rustedRough.corrosionMaps)
  assert.ok(rustedBrushed.corrosionMaps)
  assert.ok(rustedPolished.corrosionMaps)
  assertCorrosionGeometryMapsEqual(
    rustedRough.corrosionMaps,
    rustedBrushed.corrosionMaps,
  )
  assertCorrosionGeometryMapsEqual(
    rustedRough.corrosionMaps,
    rustedPolished.corrosionMaps,
  )

  const steelRequest0 = createArtworkFrameSteelFinishFieldRequest({
    bounds,
    frame: { ...frame, metalPolish: 50, metalTarnish: 0 },
    materialSeed,
    samplingBounds: bounds,
    strokeWidth: 24,
    textureSize: { height: 64, width: 96 },
  })
  const steelRequest45 = createArtworkFrameSteelFinishFieldRequest({
    bounds,
    frame: { ...frame, metalPolish: 50, metalTarnish: 45 },
    materialSeed,
    samplingBounds: bounds,
    strokeWidth: 24,
    textureSize: { height: 64, width: 96 },
  })
  const steelRequest80 = createArtworkFrameSteelFinishFieldRequest({
    bounds,
    frame: { ...frame, metalPolish: 50, metalTarnish: 80 },
    materialSeed,
    samplingBounds: bounds,
    strokeWidth: 24,
    textureSize: { height: 64, width: 96 },
  })

  assert.ok(steelRequest0)
  assert.ok(steelRequest45)
  assert.ok(steelRequest80)
  assertSteelFinishScalarFieldsEqual(
    buildArtworkFrameSteelFinishField(steelRequest0).fields,
    buildArtworkFrameSteelFinishField(steelRequest45).fields,
  )
  assertSteelFinishScalarFieldsEqual(
    buildArtworkFrameSteelFinishField(steelRequest0).fields,
    buildArtworkFrameSteelFinishField(steelRequest80).fields,
  )

  const matte = summarizeCorrodedPolishedSteelResponse(rustedPolished)
  const chips = summarizeExposedCorrosionChipResponse(rustedPolished)
  const polishedLight0 = renderAt(
    100,
    80,
    createArtworkFrameMaterialHemisphereLightVector({ x: 0, y: 0 }),
  )
  const polishedLight90 = renderAt(
    100,
    80,
    createArtworkFrameMaterialHemisphereLightVector({ x: 1, y: 0 }),
  )
  const materialLightResponse = summarizeCorrosionLightResponseByMaterial(
    polishedLight0,
    polishedLight90,
  )

  assert.equal(chips.chipCount > 8, true)
  assert.equal(chips.rustScaleCount > 40, true)
  assert.equal(
    chips.rustScaleRoughnessMean > chips.chipRoughnessMean,
    true,
  )
  assert.equal(
    matte.corrosionRoughnessMean > matte.steelRoughnessMean + 0.2,
    true,
  )
  assert.equal(matte.brightShare < 0.02, true)
  assert.equal(materialLightResponse.chipCount > 8, true)
  assert.equal(materialLightResponse.rustScaleCount > 40, true)
  assert.equal(
    materialLightResponse.chipMeanDelta >
      materialLightResponse.rustScaleMeanDelta * 1.15,
    true,
  )
})

test('canvas steel stage 7 rust composition overrides high-polish response without moving geometry', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'flat',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 0,
    metalBrushAngle: 12,
    metalPolish: 50,
    metalTarnish: 0,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 8, y: 12, width: 180, height: 120 }
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:stage-7-rust-polish-composition-matrix',
    seed32: 0x57a7c057,
  } as const
  const lightVector = createArtworkFrameMaterialHemisphereLightVector({
    x: Math.SQRT1_2,
    y: -Math.SQRT1_2,
  })
  const renderAt = (metalPolish: number, metalTarnish: number) => {
    const nextFrame = {
      ...frame,
      metalPolish,
      metalTarnish,
    }
    const stroke = getArtworkFrameStrokeWidth(
      nextFrame,
      bounds.width,
      bounds.height,
    )
    const pathData = createMetalArtworkFramePathData(
      nextFrame,
      bounds,
      stroke,
    )
    const plan = buildMetalArtworkFrameMaterialPlan({
      bounds,
      clipPathData: pathData,
      frame: nextFrame,
      lightVector,
      materialSeed,
      pathData,
      strokeWidth: stroke,
    })

    assert.equal(plan.backend, 'canvas-texture')
    assert.ok(plan.canvasTexture?.steelFinishFieldRequest)
    assert.ok(plan.canvasTexture.corrosionFieldRequest)

    const canvas = createDeterministicMaterialCanvas()

    return renderArtworkFrameCanvasMaterialTexture(plan.canvasTexture, {
      createCanvas: canvas.createCanvas,
      createPath: (path) => ({ path } as unknown as Path2D),
    })
  }
  const renderedByKey = new Map<string, ReturnType<typeof renderAt>>()
  const getRendered = (metalPolish: number, metalTarnish: number) => {
    const key = `${metalPolish}:${metalTarnish}`
    const cached = renderedByKey.get(key)

    if (cached) {
      return cached
    }

    const rendered = renderAt(metalPolish, metalTarnish)

    renderedByKey.set(key, rendered)

    return rendered
  }

  for (const metalTarnish of [0, 45, 80, 100]) {
    const baseline = getRendered(50, metalTarnish)

    assert.ok(baseline.corrosionMaps)

    for (const metalPolish of [75, 85, 100]) {
      const current = getRendered(metalPolish, metalTarnish)

      assert.ok(current.corrosionMaps)
      assert.ok(current.steelFinishMaps)
      assertCorrosionGeometryMapsEqual(
        baseline.corrosionMaps,
        current.corrosionMaps,
      )
    }
  }

  for (const metalPolish of [50, 75, 85, 100]) {
    const clean = getRendered(metalPolish, 0)

    assert.ok(clean.corrosionMaps)
    assert.equal(
      summarizeArtworkFrameCorrosionScalarField(
        clean.corrosionMaps.ambientOcclusion,
      ).max < 0.001,
      true,
      `${metalPolish}% clean steel should have no rust AO`,
    )

    for (const metalTarnish of [45, 80, 100]) {
      const rusted = getRendered(metalPolish, metalTarnish)
      const matte = summarizeCorrodedPolishedSteelResponse(rusted)
      const requiredRoughnessGap = metalPolish === 50 ? 0.08 : 0.12

      assert.equal(
        matte.corrosionCount > 80,
        true,
        `${metalPolish}% polish, ${metalTarnish}% tarnish should produce rusted pixels`,
      )
      assert.equal(
        matte.corrosionRoughnessMean >
          matte.steelRoughnessMean + requiredRoughnessGap,
        true,
        `${metalPolish}% polish, ${metalTarnish}% tarnish should make rust rougher than steel by ${requiredRoughnessGap}; rust ${matte.corrosionRoughnessMean}, steel ${matte.steelRoughnessMean}`,
      )
      assert.equal(
        matte.brightShare < 0.04,
        true,
        `${metalPolish}% polish, ${metalTarnish}% tarnish should suppress polished bright rust patches`,
      )
    }
  }

  const chipGlossByPolish = new Map<number, number>()

  for (const metalPolish of [50, 75, 85, 100]) {
    const flaking = getRendered(metalPolish, 80)
    const advanced = getRendered(metalPolish, 100)
    const flakingResponse = summarizeStage7RustCompositionResponse(flaking)
    const advancedResponse = summarizeStage7RustCompositionResponse(advanced)

    assert.equal(
      flakingResponse.chipCount > 8,
      true,
      `${metalPolish}% polish should preserve exposed chips at 80% tarnish`,
    )
    assert.equal(
      flakingResponse.rustScaleCount > 40,
      true,
      `${metalPolish}% polish should preserve rust scale at 80% tarnish`,
    )
    assert.equal(
      flakingResponse.rustScaleRoughnessMean >
        flakingResponse.chipRoughnessMean + 0.05,
      true,
      `${metalPolish}% polish should keep exposed chips less rough than rust scale`,
    )
    assert.equal(
      flakingResponse.chipLumaMean > flakingResponse.rustScaleLumaMean,
      true,
      `${metalPolish}% polish should let exposed steel chips recover light response`,
    )
    assert.equal(
      advancedResponse.rustScaleRoughnessMean > 0.9,
      true,
      `${metalPolish}% polish should keep 100% tarnish rust scale matte`,
    )

    chipGlossByPolish.set(
      metalPolish,
      flakingResponse.chipSteelGlossMean,
    )

    if (metalPolish >= 75) {
      assert.ok(flaking.steelFinishMaps?.defectDecalMaps)

      for (const kind of [
        'burrNick',
        'dent',
        'gouge',
        'pit',
        'scuff',
      ] as const) {
        for (const channel of ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS) {
          assert.equal(
            countNonZeroValues(
              flaking.steelFinishMaps.defectDecalMaps.activeBodies[kind][
                channel
              ],
            ),
            0,
            `${metalPolish}% polish ${kind}.${channel} must stay inactive under rust`,
          )
        }
        assert.equal(
          countSteelDefectPhysicalContributionValues(
            flaking.steelFinishMaps,
            kind,
          ),
          0,
          `${metalPolish}% polish ${kind} physical contributions must stay inactive under rust`,
        )
      }
    }
  }

  assert.equal(
    chipGlossByPolish.get(75)! > chipGlossByPolish.get(50)!,
    true,
    '75% exposed chips should recover a higher-polish steel gloss response than 50%',
  )
  assert.equal(
    chipGlossByPolish.get(85)! >= chipGlossByPolish.get(75)!,
    true,
    '85% exposed chips should recover current-stage polish gloss response',
  )
  assert.equal(
    chipGlossByPolish.get(100)! >= chipGlossByPolish.get(85)!,
    true,
    '100% exposed chips should recover near-mirror polish gloss response',
  )
})

test('canvas steel finish software shading spans polish stages without moving geometry', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 0,
    metalBrushAngle: 18,
    metalPolish: 50,
    metalTarnish: 0,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 12, y: 20, width: 240, height: 160 }
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:software-shading-all-polish-stages',
    seed32: 0x517ee155,
  } as const
  const renderStage = (
    metalPolish: number,
    lightVector: { x: number; y: number; z: number },
  ) => {
    const stageFrame = { ...frame, metalPolish }
    const stroke = getArtworkFrameStrokeWidth(
      stageFrame,
      bounds.width,
      bounds.height,
    )
    const pathData = createMetalArtworkFramePathData(
      stageFrame,
      bounds,
      stroke,
    )
    const plan = buildMetalArtworkFrameMaterialPlan({
      bounds,
      clipPathData: pathData,
      frame: stageFrame,
      materialSeed,
      pathData,
      strokeWidth: stroke,
    })

    assert.ok(plan.canvasTexture?.steelFinishFieldRequest)

    const canvas = createDeterministicMaterialCanvas()

    return renderArtworkFrameCanvasMaterialTexture(
      {
        ...plan.canvasTexture,
        corrosionFieldRequest: null,
        lighting: { lightVector },
      },
      {
        createCanvas: canvas.createCanvas,
        createPath: (path) => ({ path } as unknown as Path2D),
      },
    )
  }
  const summaries = new Map<number, ReturnType<
    typeof summarizeSteelFinishSurfaceResponse
  >>()

  for (const metalPolish of [0, 30, 50, 70, 85, 100]) {
    const light0 = renderStage(
      metalPolish,
      createArtworkFrameMaterialHemisphereLightVector({ x: 0, y: 0 }),
    )
    const light90 = renderStage(
      metalPolish,
      createArtworkFrameMaterialHemisphereLightVector({ x: 1, y: 0 }),
    )
    const light180 = renderStage(
      metalPolish,
      createArtworkFrameMaterialHemisphereLightVector({ x: -1, y: 0 }),
    )

    assert.ok(light0.steelFinishMaps)
    assert.ok(light90.steelFinishMaps)
    assert.ok(light180.steelFinishMaps)
    assert.ok(light0.steelFinishNormalInputs)
    assert.ok(light90.steelFinishNormalInputs)
    assert.ok(light180.steelFinishNormalInputs)
    assertSteelFinishDerivedMapsEqual(
      light0.steelFinishMaps,
      light90.steelFinishMaps,
    )
    assertSteelFinishDerivedMapsEqual(
      light0.steelFinishMaps,
      light180.steelFinishMaps,
    )
    assertSteelFinishNormalInputsEqual(
      light0.steelFinishNormalInputs,
      light90.steelFinishNormalInputs,
    )
    assertSteelFinishNormalInputsEqual(
      light0.steelFinishNormalInputs,
      light180.steelFinishNormalInputs,
    )
    assert.equal(
      countDifferentBytes(light0.imageData.data, light90.imageData.data) >
        4000,
      true,
    )
    assert.equal(
      countDifferentBytes(light0.imageData.data, light180.imageData.data) >
        4000,
      true,
    )

    summaries.set(
      metalPolish,
      summarizeSteelFinishSurfaceResponse(light0.steelFinishMaps),
    )
  }

  const rough = (metalPolish: number) =>
    summaries.get(metalPolish)!.roughnessMean
  const gloss = (metalPolish: number) =>
    summaries.get(metalPolish)!.glossMean

  assert.equal(rough(0) > rough(30), true)
  assert.equal(rough(30) > rough(50), true)
  assert.equal(rough(50) > rough(70), true)
  assert.equal(rough(70) > rough(85), true)
  assert.equal(rough(85) > rough(100), true)
  assert.equal(gloss(0) < gloss(30), true)
  assert.equal(gloss(30) < gloss(50), true)
  assert.equal(gloss(50) < gloss(70), true)
  assert.equal(gloss(70) < gloss(85), true)
  assert.equal(gloss(85) < gloss(100), true)
})

test('canvas material rasterizer accepts descriptors without steel finish maps', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'copper',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 58,
    metalTarnish: 24,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 12, y: 20, width: 240, height: 160 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const pathData = createMetalArtworkFramePathData(frame, bounds, stroke)
  const plan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    pathData,
    strokeWidth: stroke,
  })
  const recordingCanvas = createRecordingMaterialCanvas()

  assert.ok(plan.canvasTexture)
  assert.equal(plan.canvasTexture.steelFinishFieldRequest, null)

  const rendered = renderArtworkFrameCanvasMaterialTexture(
    plan.canvasTexture,
    {
      createCanvas: recordingCanvas.createCanvas,
      createPath: (path) => ({ path } as unknown as Path2D),
    },
  )

  assert.equal(rendered.descriptor, plan.canvasTexture)
  assert.equal(rendered.steelFinishMaps ?? null, null)
  assert.equal(rendered.corrosionMaps, null)
})

test('image-derived material seed is the corrosion geometry source of truth', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 22,
    metalPolish: 34,
    metalTarnish: 80,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  type SeedSourceFrame = Omit<
    typeof frame,
    'metalLightAngle' | 'metalPolish' | 'metalTarnish'
  > & {
    metalLightAngle: number
    metalPolish: number
    metalTarnish: number
  }
  type SeedSourceMaterialSeed = {
    algorithm: 'sha256-image-v1'
    key: string
    seed32: number
  }
  const bounds = { x: 0, y: 0, width: 128, height: 96 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const fieldSize = { height: 32, scale: 1, width: 48 }
  const imageSeed: SeedSourceMaterialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:seed-source-a',
    seed32: 0x11111111,
  }
  const sameImageSeed: SeedSourceMaterialSeed = {
    ...imageSeed,
  }
  const differentImageSeed: SeedSourceMaterialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:seed-source-b',
    seed32: 0x22222222,
  }
  const buildSeededField = (
    frameOverrides: Partial<SeedSourceFrame> = {},
    materialSeed: SeedSourceMaterialSeed = imageSeed,
  ) => {
    const request = createArtworkFrameCorrosionFieldRequest({
      bounds,
      frame: { ...frame, ...frameOverrides },
      materialSeed,
      strokeWidth: stroke,
      textureSize: fieldSize,
    })

    assert.ok(request)

    const field = buildArtworkFrameCorrosionField(request)

    return {
      field,
      maps: buildArtworkFrameCorrosionDerivedMaps(field),
      request,
    }
  }

  const first = buildSeededField()
  const repeated = buildSeededField({}, sameImageSeed)
  const differentSeed = buildSeededField({}, differentImageSeed)
  const roughPolish = buildSeededField({ metalPolish: 0 })
  const polished = buildSeededField({ metalPolish: 100 })
  const sparseTarnish = buildSeededField({ metalTarnish: 18 })
  const advancedTarnish = buildSeededField({ metalTarnish: 88 })
  const legacyAngleInput = buildSeededField({ metalLightAngle: 45 })

  assert.equal(first.request.geometrySeed, repeated.request.geometrySeed)
  assert.equal(first.request.geometrySeedKey, repeated.request.geometrySeedKey)
  assertCorrosionGeometryFieldsEqual(first.field.fields, repeated.field.fields)
  assertCorrosionDerivedMapsEqual(first.maps, repeated.maps)

  assert.notEqual(first.request.geometrySeed, differentSeed.request.geometrySeed)
  assert.notEqual(
    first.request.geometrySeedKey,
    differentSeed.request.geometrySeedKey,
  )
  assert.equal(
    countDifferentFloatValues(
      first.field.fields.moistureBasins,
      differentSeed.field.fields.moistureBasins,
    ) > 100,
    true,
  )
  assert.equal(
    countDifferentFloatValues(
      first.field.fields.cellularPitCenters,
      differentSeed.field.fields.cellularPitCenters,
    ) > 100,
    true,
  )
  assert.equal(
    countDifferentFloatValues(
      first.field.fields.stageCoverage,
      differentSeed.field.fields.stageCoverage,
    ) > 20,
    true,
  )

  assert.equal(first.request.geometrySeed, roughPolish.request.geometrySeed)
  assert.equal(first.request.geometrySeed, polished.request.geometrySeed)
  assertCorrosionGeometryFieldsEqual(first.field.fields, roughPolish.field.fields)
  assertCorrosionGeometryFieldsEqual(first.field.fields, polished.field.fields)

  assert.equal(sparseTarnish.request.geometrySeed, first.request.geometrySeed)
  assert.equal(advancedTarnish.request.geometrySeed, first.request.geometrySeed)
  assertCorrosionPlacementFieldsEqual(
    sparseTarnish.field.fields,
    advancedTarnish.field.fields,
  )
  assert.equal(
    countDifferentFloatValues(
      sparseTarnish.field.fields.stageCoverage,
      advancedTarnish.field.fields.stageCoverage,
    ) > 100,
    true,
  )
  assert.equal(
    summarizeArtworkFrameCorrosionScalarField(
      advancedTarnish.field.fields.stageCoverage,
    ).mean >
      summarizeArtworkFrameCorrosionScalarField(
        sparseTarnish.field.fields.stageCoverage,
      ).mean * 2,
    true,
  )

  assert.equal(legacyAngleInput.request.geometrySeed, first.request.geometrySeed)
  assertCorrosionGeometryFieldsEqual(
    first.field.fields,
    legacyAngleInput.field.fields,
  )
  assertCorrosionDerivedMapsEqual(first.maps, legacyAngleInput.maps)

  const baseImageData = createTestCorrosionImageData(
    first.maps.widthPixels,
    first.maps.heightPixels,
    first.field.fields.frameMask,
  )
  const shaded = shadeArtworkFrameCorrosionImageData(
    cloneImageData(baseImageData),
    first.maps,
    {
      lightVector: createArtworkFrameMaterialHemisphereLightVector({
        x: 0,
        y: 0,
      }),
    },
  )
  const rotatedShaded = shadeArtworkFrameCorrosionImageData(
    cloneImageData(baseImageData),
    legacyAngleInput.maps,
    {
      lightVector: createArtworkFrameMaterialHemisphereLightVector({
        x: 1,
        y: 0,
      }),
    },
  )

  assert.equal(countDifferentBytes(shaded.data, rotatedShaded.data) > 20, true)
})

test('image-seeded corrosion placement is independent from frame width and brush angle', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 22,
    metalPolish: 50,
    metalTarnish: 80,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 0, y: 0, width: 128, height: 96 }
  const textureSize = { height: 32, scale: 1, width: 48 }
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:width-brush-independent',
    seed32: 0xabcdef01,
  } as const
  type WidthBrushFrame = Omit<typeof frame, 'metalBrushAngle' | 'width'> & {
    metalBrushAngle: number
    width: number
  }
  const buildSeededField = (
    frameOverrides: Partial<WidthBrushFrame> = {},
    strokeWidthOverride?: number,
  ) => {
    const materialFrame = { ...frame, ...frameOverrides }
    const strokeWidth = strokeWidthOverride ??
      getArtworkFrameStrokeWidth(materialFrame, bounds.width, bounds.height)
    const request = createArtworkFrameCorrosionFieldRequest({
      bounds,
      frame: materialFrame,
      materialSeed,
      strokeWidth,
      textureSize,
    })

    assert.ok(request)

    const field = buildArtworkFrameCorrosionField(request)

    return {
      field,
      maps: buildArtworkFrameCorrosionDerivedMaps(field),
      request,
      strokeWidth,
    }
  }

  const base = buildSeededField()
  const changedBrush = buildSeededField({ metalBrushAngle: 74 })
  const changedWidthSameStroke = buildSeededField(
    { width: 18 },
    base.strokeWidth,
  )
  const changedWidth = buildSeededField({ width: 18 })

  assert.equal(base.request.geometrySeedKey, changedBrush.request.geometrySeedKey)
  assert.equal(base.request.geometrySeedKey, changedWidth.request.geometrySeedKey)
  assert.equal(base.request.geometrySeed, changedBrush.request.geometrySeed)
  assert.equal(base.request.geometrySeed, changedWidth.request.geometrySeed)

  assertCorrosionGeometryFieldsEqual(base.field.fields, changedBrush.field.fields)
  assertCorrosionDerivedMapsEqual(base.maps, changedBrush.maps)
  assertCorrosionGeometryFieldsEqual(
    base.field.fields,
    changedWidthSameStroke.field.fields,
  )
  assertCorrosionDerivedMapsEqual(base.maps, changedWidthSameStroke.maps)

  for (const fieldName of [
    'cellularPitCenters',
    'corrosionPotential',
    'defectExposure',
    'edgeExposure',
    'moistureBasins',
    'protectedMetalIslands',
    'stageCoverage',
  ] as const) {
    assertCommonMaskedFloatFieldsEqual(
      base.field.fields[fieldName],
      changedWidth.field.fields[fieldName],
      base.field.fields.frameMask,
      changedWidth.field.fields.frameMask,
    )
  }

  for (const fieldName of [
    'ambientOcclusion',
    'crackMask',
    'flakeMask',
    'flakeBodyMask',
    'flakeLipMask',
    'flakeRootMask',
    'flakeUndercutAO',
    'flakeLiftHeight',
    'height',
    'metalExposure',
    'poreMask',
    'roughness',
  ] as const) {
    assertCommonMaskedFloatFieldsEqual(
      base.maps[fieldName],
      changedWidth.maps[fieldName],
      base.field.fields.frameMask,
      changedWidth.field.fields.frameMask,
    )
  }
})

test('corrosion map hashes stay anchored when texture resolution changes', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 22,
    metalPolish: 36,
    metalTarnish: 80,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 0, y: 0, width: 100, height: 100 }
  const strokeWidth = getArtworkFrameStrokeWidth(
    frame,
    bounds.width,
    bounds.height,
  )
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:texture-resolution-independent',
    seed32: 0x10203040,
  } as const
  const buildField = (textureSize: { height: number; width: number }) => {
    const request = createArtworkFrameCorrosionFieldRequest({
      bounds,
      frame,
      materialSeed,
      strokeWidth,
      textureSize,
    })

    assert.ok(request)

    const field = buildArtworkFrameCorrosionField(request)

    return {
      field,
      maps: buildArtworkFrameCorrosionDerivedMaps(field),
      request,
    }
  }
  const coarse = buildField({ height: 51, width: 51 })
  const fine = buildField({ height: 101, width: 101 })
  const alignedRingPoints = [
    { x: 0.04, y: 0.5 },
    { x: 0.5, y: 0.04 },
    { x: 0.96, y: 0.5 },
    { x: 0.5, y: 0.96 },
  ]

  assert.equal(coarse.request.geometrySeedKey, fine.request.geometrySeedKey)
  assert.equal(coarse.request.geometrySeed, fine.request.geometrySeed)

  for (const point of alignedRingPoints) {
    const coarsePixel = {
      x: Math.round(point.x * (coarse.request.fieldSize.width - 1)),
      y: Math.round(point.y * (coarse.request.fieldSize.height - 1)),
    }
    const finePixel = {
      x: Math.round(point.x * (fine.request.fieldSize.width - 1)),
      y: Math.round(point.y * (fine.request.fieldSize.height - 1)),
    }
    const coarseCoordinates = getArtworkFrameCorrosionSampleCoordinates(
      coarse.request,
      coarsePixel.x,
      coarsePixel.y,
    )
    const fineCoordinates = getArtworkFrameCorrosionSampleCoordinates(
      fine.request,
      finePixel.x,
      finePixel.y,
    )

    assert.equal(coarseCoordinates.hashX, fineCoordinates.hashX)
    assert.equal(coarseCoordinates.hashY, fineCoordinates.hashY)
    assert.equal(coarseCoordinates.xUnit, fineCoordinates.xUnit)
    assert.equal(coarseCoordinates.yUnit, fineCoordinates.yUnit)
  }

  for (const fieldName of [
    'cellularPitCenters',
    'corrosionPotential',
    'defectExposure',
    'edgeExposure',
    'frameMask',
    'moistureBasins',
    'protectedMetalIslands',
    'stageCoverage',
  ] as const) {
    assertAlignedCorrosionFieldValuesEqual(
      coarse.request,
      fine.request,
      coarse.field.fields[fieldName],
      fine.field.fields[fieldName],
      alignedRingPoints,
    )
  }

  for (const fieldName of [
    'ambientOcclusion',
    'crackMask',
    'flakeBodyMask',
    'flakeCastShadow',
    'flakeCurlX',
    'flakeCurlY',
    'flakeLiftHeight',
    'flakeLipMask',
    'flakeMask',
    'flakeRootMask',
    'flakeUndercutAO',
    'height',
    'metalExposure',
    'poreMask',
    'roughness',
  ] as const) {
    assertAlignedCorrosionFieldValuesEqual(
      coarse.request,
      fine.request,
      coarse.maps[fieldName],
      fine.maps[fieldName],
      alignedRingPoints,
    )
  }
})

test('canvas corrosion descriptor keeps width out of geometry placement', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 22,
    metalPolish: 36,
    metalTarnish: 80,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 0, y: 0, width: 128, height: 96 }
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:plan-width-independent',
    seed32: 0xabcdef01,
  } as const
  type WidthFrame = Omit<typeof frame, 'width'> & { width: number }
  const buildPlan = (materialFrame: WidthFrame) => {
    const strokeWidth = getArtworkFrameStrokeWidth(
      materialFrame,
      bounds.width,
      bounds.height,
    )
    const pathData = createMetalArtworkFramePathData(
      materialFrame,
      bounds,
      strokeWidth,
    )
    const plan = buildMetalArtworkFrameMaterialPlan({
      bounds,
      clipPathData: pathData,
      frame: materialFrame,
      materialSeed,
      pathData,
      strokeWidth,
    })

    assert.ok(plan.canvasTexture)
    assert.ok(plan.canvasTexture.corrosionFieldRequest)

    return plan.canvasTexture
  }
  const narrow = buildPlan(frame)
  const wide = buildPlan({ ...frame, width: 18 })

  assert.notDeepEqual(narrow.bounds, wide.bounds)
  assert.notDeepEqual(narrow.textureSize, wide.textureSize)
  assert.deepEqual(narrow.corrosionFieldRequest?.bounds, bounds)
  assert.deepEqual(wide.corrosionFieldRequest?.bounds, bounds)
  assert.notDeepEqual(
    narrow.corrosionFieldRequest?.samplingBounds,
    wide.corrosionFieldRequest?.samplingBounds,
  )
  assert.equal(
    narrow.corrosionFieldRequest?.geometrySeedKey,
    wide.corrosionFieldRequest?.geometrySeedKey,
  )
  assert.equal(
    narrow.corrosionFieldRequest?.geometrySeed,
    wide.corrosionFieldRequest?.geometrySeed,
  )
})

test('preview and export corrosion geometry stays anchored across scaled render bounds', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 22,
    metalPolish: 36,
    metalTarnish: 80,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:preview-export-scaled-bounds',
    seed32: 0x1a2b3c4d,
  } as const
  const previewBounds = { x: 0, y: 0, width: 100, height: 80 }
  const exportBounds = { x: 0, y: 0, width: 200, height: 160 }
  const previewStroke = getArtworkFrameStrokeWidth(
    frame,
    previewBounds.width,
    previewBounds.height,
  )
  const exportStroke = getArtworkFrameStrokeWidth(
    frame,
    exportBounds.width,
    exportBounds.height,
  )
  const previewRequest = createArtworkFrameCorrosionFieldRequest({
    bounds: previewBounds,
    frame,
    materialSeed,
    strokeWidth: previewStroke,
    textureSize: { height: 81, width: 101 },
  })
  const exportRequest = createArtworkFrameCorrosionFieldRequest({
    bounds: exportBounds,
    frame,
    materialSeed,
    strokeWidth: exportStroke,
    textureSize: { height: 161, width: 201 },
  })

  assert.ok(previewRequest)
  assert.ok(exportRequest)

  const previewField = buildArtworkFrameCorrosionField(previewRequest)
  const exportField = buildArtworkFrameCorrosionField(exportRequest)
  const previewMaps = buildArtworkFrameCorrosionDerivedMaps(previewField)
  const exportMaps = buildArtworkFrameCorrosionDerivedMaps(exportField)
  const alignedRingPoints = [
    { x: 0.05, y: 0.5 },
    { x: 0.5, y: 0.05 },
    { x: 0.95, y: 0.5 },
    { x: 0.5, y: 0.95 },
  ]

  assert.equal(previewRequest.geometrySeedKey, exportRequest.geometrySeedKey)
  assert.equal(previewRequest.geometrySeed, exportRequest.geometrySeed)

  for (const fieldName of [
    'cellularPitCenters',
    'corrosionPotential',
    'defectExposure',
    'edgeExposure',
    'frameMask',
    'moistureBasins',
    'protectedMetalIslands',
    'stageCoverage',
  ] as const) {
    assertMaterialCoordinateCorrosionFieldValuesEqual(
      previewRequest,
      exportRequest,
      previewField.fields[fieldName],
      exportField.fields[fieldName],
      alignedRingPoints,
    )
  }

  for (const fieldName of [
    'ambientOcclusion',
    'crackMask',
    'flakeBodyMask',
    'flakeCastShadow',
    'flakeCurlX',
    'flakeCurlY',
    'flakeLiftHeight',
    'flakeLipMask',
    'flakeMask',
    'flakeRootMask',
    'flakeUndercutAO',
    'height',
    'metalExposure',
    'poreMask',
    'roughness',
  ] as const) {
    assertMaterialCoordinateCorrosionFieldValuesEqual(
      previewRequest,
      exportRequest,
      previewMaps[fieldName],
      exportMaps[fieldName],
      alignedRingPoints,
    )
  }

  const previewPath = createMetalArtworkFramePathData(
    frame,
    previewBounds,
    previewStroke,
  )
  const exportPath = createMetalArtworkFramePathData(
    frame,
    exportBounds,
    exportStroke,
  )
  const previewPlan = buildMetalArtworkFrameMaterialPlan({
    bounds: previewBounds,
    clipPathData: previewPath,
    frame,
    materialSeed,
    pathData: previewPath,
    strokeWidth: previewStroke,
  })
  const exportPlan = buildMetalArtworkFrameMaterialPlan({
    bounds: exportBounds,
    clipPathData: exportPath,
    frame,
    materialSeed,
    pathData: exportPath,
    strokeWidth: exportStroke,
  })

  assert.ok(previewPlan.canvasTexture?.corrosionFieldRequest)
  assert.ok(exportPlan.canvasTexture?.corrosionFieldRequest)
  assert.equal(
    previewPlan.canvasTexture.corrosionFieldRequest.geometrySeedKey,
    exportPlan.canvasTexture.corrosionFieldRequest.geometrySeedKey,
  )
  assert.notEqual(
    getArtworkFrameCanvasMaterialTextureKey(previewPlan.canvasTexture),
    getArtworkFrameCanvasMaterialTextureKey(exportPlan.canvasTexture),
  )
})

test('metal canvas material texture keys include clip lighting and map inputs', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 58,
    metalTarnish: 24,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 0, y: 0, width: 240, height: 160 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const pathData = createMetalArtworkFramePathData(frame, bounds, stroke)
  const plan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    pathData,
    strokeWidth: stroke,
  })

  assert.ok(plan.canvasTexture)

  const baselineKey = getArtworkFrameCanvasMaterialTextureKey(plan.canvasTexture)
  const changedClipPathKey = getArtworkFrameCanvasMaterialTextureKey({
    ...plan.canvasTexture,
    clipPathData: `${plan.canvasTexture.clipPathData} M 0 0 L 1 0`,
  })
  const changedLightingKey = getArtworkFrameCanvasMaterialTextureKey({
    ...plan.canvasTexture,
    lighting: {
      lightVector: createArtworkFrameMaterialHemisphereLightVector({
        x: 1,
        y: 0,
      }),
    },
  })

  assert.notEqual(changedClipPathKey, baselineKey)
  assert.notEqual(changedLightingKey, baselineKey)
})

test('metal canvas material rasterizer clips and caches shared descriptors', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 58,
    metalTarnish: 24,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 12, y: 20, width: 240, height: 160 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const pathData = createMetalArtworkFramePathData(frame, bounds, stroke)
  const previewPlan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    pathData,
    strokeWidth: stroke,
  })
  const exportPlan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    pathData,
    strokeWidth: stroke,
  })
  const recordingCanvas = createRecordingMaterialCanvas()
  const cache = new Map()

  assert.ok(previewPlan.canvasTexture)
  assert.ok(exportPlan.canvasTexture)
  assert.equal(previewPlan.backend, 'canvas-texture')
  assert.equal(exportPlan.backend, 'canvas-texture')
  assert.deepEqual(
    previewPlan.canvasTexture.bounds,
    resolveArtworkFrameCanvasMaterialTextureBounds(bounds, 'fill', stroke),
  )
  assert.equal(
    getArtworkFrameCanvasMaterialTextureKey(previewPlan.canvasTexture),
    getArtworkFrameCanvasMaterialTextureKey(exportPlan.canvasTexture),
  )

  const rendered = renderArtworkFrameCanvasMaterialTexture(
    previewPlan.canvasTexture,
    {
      cache,
      createCanvas: recordingCanvas.createCanvas,
      createPath: (path) => ({ path } as unknown as Path2D),
    },
  )
  const cached = renderArtworkFrameCanvasMaterialTexture(
    exportPlan.canvasTexture,
    {
      cache,
      createCanvas: () => {
        throw new Error('cache hit should not allocate another canvas')
      },
      createPath: (path) => ({ path } as unknown as Path2D),
    },
  )

  assert.equal(rendered, cached)
  assert.equal(rendered.canvas, recordingCanvas.getCanvas())
  assert.equal(rendered.imageSource, rendered.canvas)
  assert.equal(rendered.width, previewPlan.canvasTexture.textureSize.width)
  assert.equal(rendered.height, previewPlan.canvasTexture.textureSize.height)
  assert.equal(rendered.imageData.width, rendered.width)
  assert.equal(rendered.imageData.height, rendered.height)
  assert.ok(rendered.corrosionMaps)
  assert.deepEqual(
    recordingCanvas.operations.find((operation) => operation.name === 'scale')
      ?.args,
    [
      previewPlan.canvasTexture.textureSize.scale,
      previewPlan.canvasTexture.textureSize.scale,
    ],
  )
  assert.deepEqual(
    recordingCanvas.operations.find((operation) =>
      operation.name === 'translate')?.args,
    [
      -previewPlan.canvasTexture.bounds.x,
      -previewPlan.canvasTexture.bounds.y,
    ],
  )
  assert.equal(
    recordingCanvas.operations.some((operation) =>
      operation.name === 'clip' && operation.args[1] === 'evenodd'),
    true,
  )
  assert.equal(
    recordingCanvas.operations.some((operation) =>
      operation.name === 'createLinearGradient'),
    false,
  )
  assert.equal(
    recordingCanvas.operations.some((operation) => operation.name === 'stroke'),
    false,
  )
  assert.equal(
    recordingCanvas.operations.some((operation) => operation.name === 'fill'),
    true,
  )
  assert.equal(
    recordingCanvas.operations.some((operation) =>
      operation.name === 'putImageData'),
    true,
  )
})

test('preview and export share explicit light-vector canvas descriptors maps and shaded pixels', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 9,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'brushed',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 34,
    metalTarnish: 80,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 8, y: 12, width: 220, height: 148 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const fillPathData = createMetalArtworkFramePathData(frame, bounds, stroke)
  const strokePathData = 'M 18 20 L 218 20 L 218 150 L 18 150 Z'
  const renderCases = [
    {
      clipMode: 'fill' as const,
      pathData: fillPathData,
    },
    {
      clipMode: 'stroke' as const,
      pathData: strokePathData,
    },
  ]
  const explicitLightVector = createArtworkFrameMaterialHemisphereLightVector({
    x: -0.42,
    y: 0.36,
  })
  const movedLightVector = createArtworkFrameMaterialHemisphereLightVector({
    x: 0.58,
    y: -0.24,
  })

  for (const metalType of ['steel', 'blackIron'] as const) {
    for (const renderCase of renderCases) {
      const materialFrame = { ...frame, metalType }
      const materialSeed = {
        algorithm: 'sha256-image-v1',
        key: `sha256-image-v1:${metalType}-${renderCase.clipMode}`,
        seed32: metalType === 'steel' ? 0x10101010 : 0x20202020,
      } as const
      const previewPlan = buildMetalArtworkFrameMaterialPlan({
        bounds,
        clipMode: renderCase.clipMode,
        clipPathData: renderCase.pathData,
        frame: materialFrame,
        lightVector: explicitLightVector,
        materialSeed,
        pathData: renderCase.pathData,
        strokeWidth: stroke,
      })
      const exportPlan = buildMetalArtworkFrameMaterialPlan({
        bounds,
        clipMode: renderCase.clipMode,
        clipPathData: renderCase.pathData,
        frame: materialFrame,
        lightVector: explicitLightVector,
        materialSeed,
        pathData: renderCase.pathData,
        strokeWidth: stroke,
      })
      const changedPolishPlan = buildMetalArtworkFrameMaterialPlan({
        bounds,
        clipMode: renderCase.clipMode,
        clipPathData: renderCase.pathData,
        frame: { ...materialFrame, metalPolish: 92 },
        lightVector: explicitLightVector,
        materialSeed,
        pathData: renderCase.pathData,
        strokeWidth: stroke,
      })
      const changedTarnishPlan = buildMetalArtworkFrameMaterialPlan({
        bounds,
        clipMode: renderCase.clipMode,
        clipPathData: renderCase.pathData,
        frame: { ...materialFrame, metalTarnish: 88 },
        lightVector: explicitLightVector,
        materialSeed,
        pathData: renderCase.pathData,
        strokeWidth: stroke,
      })
      const rotatedLightPlan = buildMetalArtworkFrameMaterialPlan({
        bounds,
        clipMode: renderCase.clipMode,
        clipPathData: renderCase.pathData,
        frame: materialFrame,
        lightVector: movedLightVector,
        materialSeed,
        pathData: renderCase.pathData,
        strokeWidth: stroke,
      })
      const changedBrushPlan = buildMetalArtworkFrameMaterialPlan({
        bounds,
        clipMode: renderCase.clipMode,
        clipPathData: renderCase.pathData,
        frame: { ...materialFrame, metalBrushAngle: 72 },
        lightVector: explicitLightVector,
        materialSeed,
        pathData: renderCase.pathData,
        strokeWidth: stroke,
      })

      assert.equal(previewPlan.backend, 'canvas-texture')
      assert.equal(exportPlan.backend, 'canvas-texture')
      assert.ok(previewPlan.canvasTexture)
      assert.ok(exportPlan.canvasTexture)
      assert.ok(changedPolishPlan.canvasTexture)
      assert.ok(changedTarnishPlan.canvasTexture)
      assert.ok(rotatedLightPlan.canvasTexture)
      assert.ok(changedBrushPlan.canvasTexture)
      assert.deepEqual(previewPlan.canvasTexture, exportPlan.canvasTexture)
      assert.equal(previewPlan.canvasTexture.qualityMode, 'full')
      assert.equal(exportPlan.canvasTexture.qualityMode, 'full')
      assert.deepEqual(
        createArtworkFrameMaterialShadingCoordinateContext(
          previewPlan.canvasTexture,
        ),
        createArtworkFrameMaterialShadingCoordinateContext(
          exportPlan.canvasTexture,
        ),
      )
      assert.deepEqual(
        previewPlan.canvasTexture.lighting.lightVector,
        explicitLightVector,
      )
      assert.deepEqual(
        exportPlan.canvasTexture.lighting.lightVector,
        explicitLightVector,
      )
      assert.notDeepEqual(
        previewPlan.canvasTexture.lighting.lightVector,
        ARTWORK_FRAME_MATERIAL_OVERHEAD_LIGHT_VECTOR,
      )
      assert.equal(previewPlan.canvasTexture.materialSeed?.key, materialSeed.key)
      assert.equal(exportPlan.canvasTexture.materialSeed?.key, materialSeed.key)
      assert.equal(
        previewPlan.canvasTexture.steelFinishFieldRequest?.materialSeed?.key,
        materialSeed.key,
      )
      assert.equal(
        previewPlan.canvasTexture.steelFinishFieldRequest?.materialSeed?.key,
        exportPlan.canvasTexture.steelFinishFieldRequest?.materialSeed?.key,
      )
      assert.equal(
        previewPlan.canvasTexture.corrosionFieldRequest?.materialSeed?.key,
        materialSeed.key,
      )
      assert.equal(
        rotatedLightPlan.canvasTexture.corrosionFieldRequest?.materialSeed?.key,
        materialSeed.key,
      )
      assert.equal(
        previewPlan.canvasTexture.corrosionFieldRequest?.geometrySeedKey,
        exportPlan.canvasTexture.corrosionFieldRequest?.geometrySeedKey,
      )
      assert.equal(
        previewPlan.canvasTexture.corrosionFieldRequest?.geometrySeedKey,
        changedPolishPlan.canvasTexture.corrosionFieldRequest?.geometrySeedKey,
      )
      assert.equal(
        previewPlan.canvasTexture.corrosionFieldRequest?.geometrySeedKey,
        changedTarnishPlan.canvasTexture.corrosionFieldRequest?.geometrySeedKey,
      )
      assert.equal(
        previewPlan.canvasTexture.corrosionFieldRequest?.geometrySeedKey,
        rotatedLightPlan.canvasTexture.corrosionFieldRequest?.geometrySeedKey,
      )
      assert.equal(
        previewPlan.canvasTexture.corrosionFieldRequest?.geometrySeedKey,
        changedBrushPlan.canvasTexture.corrosionFieldRequest?.geometrySeedKey,
      )
      assert.equal(
        previewPlan.canvasTexture.steelFinishFieldRequest?.geometrySeedKey,
        exportPlan.canvasTexture.steelFinishFieldRequest?.geometrySeedKey,
      )
      assert.equal(
        previewPlan.canvasTexture.steelFinishFieldRequest?.geometrySeedKey,
        changedPolishPlan.canvasTexture.steelFinishFieldRequest?.geometrySeedKey,
      )
      assert.equal(
        previewPlan.canvasTexture.steelFinishFieldRequest?.geometrySeedKey,
        changedTarnishPlan.canvasTexture.steelFinishFieldRequest?.geometrySeedKey,
      )
      assert.equal(
        previewPlan.canvasTexture.steelFinishFieldRequest?.geometrySeedKey,
        rotatedLightPlan.canvasTexture.steelFinishFieldRequest?.geometrySeedKey,
      )
      assert.equal(
        previewPlan.canvasTexture.steelFinishFieldRequest?.geometrySeedKey,
        changedBrushPlan.canvasTexture.steelFinishFieldRequest?.geometrySeedKey,
      )

      const previewKey = getArtworkFrameCanvasMaterialTextureKey(
        previewPlan.canvasTexture,
      )
      const exportKey = getArtworkFrameCanvasMaterialTextureKey(
        exportPlan.canvasTexture,
      )

      assert.equal(previewKey, exportKey)
      assert.equal(
        previewKey,
        getArtworkFrameCanvasMaterialTextureKey(previewPlan.canvasTexture),
      )
      assert.notEqual(
        previewKey,
        getArtworkFrameCanvasMaterialTextureKey(
          changedPolishPlan.canvasTexture,
        ),
      )
      assert.notEqual(
        previewKey,
        getArtworkFrameCanvasMaterialTextureKey(
          changedTarnishPlan.canvasTexture,
        ),
      )
      assert.notEqual(
        previewKey,
        getArtworkFrameCanvasMaterialTextureKey(
          rotatedLightPlan.canvasTexture,
        ),
      )
      assert.notEqual(
        previewKey,
        getArtworkFrameCanvasMaterialTextureKey(
          changedBrushPlan.canvasTexture,
        ),
      )

      const cache = new Map()
      const previewCanvas = createDeterministicMaterialCanvas()
      const renderedPreview = renderArtworkFrameCanvasMaterialTexture(
        previewPlan.canvasTexture,
        {
          cache,
          createCanvas: previewCanvas.createCanvas,
          createPath: (path) => ({ path } as unknown as Path2D),
        },
      )
      const cachedExport = renderArtworkFrameCanvasMaterialTexture(
        exportPlan.canvasTexture,
        {
          cache,
          createCanvas: () => {
            throw new Error('matching export descriptor should hit cache')
          },
          createPath: (path) => ({ path } as unknown as Path2D),
        },
      )
      const exportCanvas = createDeterministicMaterialCanvas()
      const renderedExport = renderArtworkFrameCanvasMaterialTexture(
        exportPlan.canvasTexture,
        {
          createCanvas: exportCanvas.createCanvas,
          createPath: (path) => ({ path } as unknown as Path2D),
        },
      )
      const baseImageData = createMaterialTestImageData(
        renderedPreview.width,
        renderedPreview.height,
      )

      assert.equal(cachedExport, renderedPreview)
      assert.ok(renderedPreview.corrosionMaps)
      assert.ok(renderedExport.corrosionMaps)
      assert.ok(renderedPreview.steelFinishMaps)
      assert.ok(renderedExport.steelFinishMaps)
      assert.ok(renderedPreview.steelFinishNormalInputs)
      assert.ok(renderedExport.steelFinishNormalInputs)
      assertSteelFinishDerivedMapsEqual(
        renderedPreview.steelFinishMaps,
        renderedExport.steelFinishMaps,
      )
      assertSteelFinishNormalInputsEqual(
        renderedPreview.steelFinishNormalInputs,
        renderedExport.steelFinishNormalInputs,
      )
      assertCorrosionDerivedMapsEqual(
        renderedPreview.corrosionMaps,
        renderedExport.corrosionMaps,
      )
      assertImageDataEqual(renderedPreview.imageData, renderedExport.imageData)
      assert.equal(
        countDifferentBytes(
          renderedPreview.imageData.data,
          baseImageData.data,
        ) > 100,
        true,
      )
      assert.equal(
        summarizeArtworkFrameCorrosionScalarField(
          renderedPreview.corrosionMaps.flakeMask,
        ).max > 0.1,
        true,
      )
      assert.equal(
        summarizeArtworkFrameCorrosionScalarField(
          renderedPreview.corrosionMaps.flakeLiftHeight,
        ).max > 0.1,
        true,
      )
      assert.equal(
        summarizeArtworkFrameCorrosionScalarField(
          renderedPreview.corrosionMaps.ambientOcclusion,
        ).max > 0.1,
        true,
      )
      assert.equal(
        summarizeArtworkFrameCorrosionScalarField(
          renderedPreview.corrosionMaps.roughness,
        ).max > 0.8,
        true,
      )
      assert.equal(
        summarizeArtworkFrameCorrosionScalarField(
          renderedPreview.corrosionMaps.normalZ,
        ).min < 0.98,
        true,
      )
    }
  }
})

test('preview and export share corrected macro-light corner descriptors maps and shaded pixels', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 9,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'flat',
    metalPattern: 'brushed',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 0,
    metalBrushAngle: 12,
    metalPolish: 50,
    metalTarnish: 80,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 8, y: 12, width: 180, height: 120 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const pathData = createMetalArtworkFramePathData(frame, bounds, stroke)
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:preview-export-corner-macro-light',
    seed32: 0xc04e4265,
  } as const
  const renderedCases = MATERIAL_LIGHT_POSITION_REGRESSION_CASES
    .filter(({ label }) => label !== 'center')
    .map(({ label, lightPosition }) => {
      const lightVector =
        createArtworkFrameMaterialHemisphereLightVector(lightPosition)
      const previewPlan = buildMetalArtworkFrameMaterialPlan({
        bounds,
        clipPathData: pathData,
        frame,
        lightVector,
        materialSeed,
        pathData,
        strokeWidth: stroke,
      })
      const exportPlan = buildMetalArtworkFrameMaterialPlan({
        bounds,
        clipPathData: pathData,
        frame,
        lightVector,
        materialSeed,
        pathData,
        strokeWidth: stroke,
      })

      assert.equal(previewPlan.backend, 'canvas-texture')
      assert.equal(exportPlan.backend, 'canvas-texture')
      assert.ok(previewPlan.canvasTexture)
      assert.ok(exportPlan.canvasTexture)
      assert.deepEqual(previewPlan.canvasTexture, exportPlan.canvasTexture)
      assert.equal(previewPlan.canvasTexture.qualityMode, 'full')
      assert.equal(exportPlan.canvasTexture.qualityMode, 'full')
      assert.equal(previewPlan.canvasTexture.materialSeed?.key, materialSeed.key)
      assert.equal(exportPlan.canvasTexture.materialSeed?.key, materialSeed.key)
      assert.deepEqual(
        previewPlan.canvasTexture.lighting.lightVector,
        lightVector,
      )
      assert.deepEqual(
        exportPlan.canvasTexture.lighting.lightVector,
        lightVector,
      )
      assert.deepEqual(
        createArtworkFrameMaterialShadingCoordinateContext(
          previewPlan.canvasTexture,
        ),
        createArtworkFrameMaterialShadingCoordinateContext(
          exportPlan.canvasTexture,
        ),
      )

      const previewCanvas = createDeterministicMaterialCanvas()
      const renderedPreview = renderArtworkFrameCanvasMaterialTexture(
        previewPlan.canvasTexture,
        {
          createCanvas: previewCanvas.createCanvas,
          createPath: (path) => ({ path } as unknown as Path2D),
        },
      )
      const exportCanvas = createDeterministicMaterialCanvas()
      const renderedExport = renderArtworkFrameCanvasMaterialTexture(
        exportPlan.canvasTexture,
        {
          createCanvas: exportCanvas.createCanvas,
          createPath: (path) => ({ path } as unknown as Path2D),
        },
      )

      assert.ok(renderedPreview.steelFinishMaps)
      assert.ok(renderedExport.steelFinishMaps)
      assert.ok(renderedPreview.steelFinishNormalInputs)
      assert.ok(renderedExport.steelFinishNormalInputs)
      assert.ok(renderedPreview.corrosionMaps)
      assert.ok(renderedExport.corrosionMaps)
      assertSteelFinishDerivedMapsEqual(
        renderedPreview.steelFinishMaps,
        renderedExport.steelFinishMaps,
      )
      assertSteelFinishNormalInputsEqual(
        renderedPreview.steelFinishNormalInputs,
        renderedExport.steelFinishNormalInputs,
      )
      assertCorrosionDerivedMapsEqual(
        renderedPreview.corrosionMaps,
        renderedExport.corrosionMaps,
      )
      assertImageDataEqual(renderedPreview.imageData, renderedExport.imageData)

      return {
        label,
        renderedPreview,
      }
    })
  const baseline = renderedCases[0]!

  assert.equal(renderedCases.length, 4)

  for (const current of renderedCases.slice(1)) {
    assert.ok(baseline.renderedPreview.steelFinishMaps)
    assert.ok(current.renderedPreview.steelFinishMaps)
    assert.ok(baseline.renderedPreview.steelFinishNormalInputs)
    assert.ok(current.renderedPreview.steelFinishNormalInputs)
    assert.ok(baseline.renderedPreview.corrosionMaps)
    assert.ok(current.renderedPreview.corrosionMaps)
    assertSteelFinishDerivedMapsEqual(
      baseline.renderedPreview.steelFinishMaps,
      current.renderedPreview.steelFinishMaps,
    )
    assertSteelFinishNormalInputsEqual(
      baseline.renderedPreview.steelFinishNormalInputs,
      current.renderedPreview.steelFinishNormalInputs,
    )
    assertCorrosionDerivedMapsEqual(
      baseline.renderedPreview.corrosionMaps,
      current.renderedPreview.corrosionMaps,
    )
    assert.equal(
      countDifferentBytes(
        baseline.renderedPreview.imageData.data,
        current.renderedPreview.imageData.data,
      ) > 1000,
      true,
      `${current.label} should change final pixels without moving maps`,
    )
  }
})

test('preview and export share stage 7 rust-over-polish composition maps and pixels', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 9,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'flat',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 0,
    metalBrushAngle: 12,
    metalPolish: 100,
    metalTarnish: 100,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 8, y: 12, width: 180, height: 120 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const pathData = createMetalArtworkFramePathData(frame, bounds, stroke)
  const lightVector = createArtworkFrameMaterialHemisphereLightVector({
    x: Math.SQRT1_2,
    y: -Math.SQRT1_2,
  })
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:preview-export-stage-7-rust-composition',
    seed32: 0x57a7c0de,
  } as const
  const previewPlan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    lightVector,
    materialSeed,
    pathData,
    strokeWidth: stroke,
  })
  const exportPlan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    lightVector,
    materialSeed,
    pathData,
    strokeWidth: stroke,
  })

  assert.equal(previewPlan.backend, 'canvas-texture')
  assert.equal(exportPlan.backend, 'canvas-texture')
  assert.ok(previewPlan.canvasTexture)
  assert.ok(exportPlan.canvasTexture)
  assert.deepEqual(previewPlan.canvasTexture, exportPlan.canvasTexture)

  const previewCanvas = createDeterministicMaterialCanvas()
  const renderedPreview = renderArtworkFrameCanvasMaterialTexture(
    previewPlan.canvasTexture,
    {
      createCanvas: previewCanvas.createCanvas,
      createPath: (path) => ({ path } as unknown as Path2D),
    },
  )
  const exportCanvas = createDeterministicMaterialCanvas()
  const renderedExport = renderArtworkFrameCanvasMaterialTexture(
    exportPlan.canvasTexture,
    {
      createCanvas: exportCanvas.createCanvas,
      createPath: (path) => ({ path } as unknown as Path2D),
    },
  )

  assert.ok(renderedPreview.steelFinishMaps)
  assert.ok(renderedExport.steelFinishMaps)
  assert.ok(renderedPreview.steelFinishNormalInputs)
  assert.ok(renderedExport.steelFinishNormalInputs)
  assert.ok(renderedPreview.corrosionMaps)
  assert.ok(renderedExport.corrosionMaps)
  assertSteelFinishDerivedMapsEqual(
    renderedPreview.steelFinishMaps,
    renderedExport.steelFinishMaps,
  )
  assertSteelFinishNormalInputsEqual(
    renderedPreview.steelFinishNormalInputs,
    renderedExport.steelFinishNormalInputs,
  )
  assertCorrosionDerivedMapsEqual(
    renderedPreview.corrosionMaps,
    renderedExport.corrosionMaps,
  )
  assertImageDataEqual(renderedPreview.imageData, renderedExport.imageData)

  const matte = summarizeCorrodedPolishedSteelResponse(renderedPreview)
  const chips = summarizeStage7RustCompositionResponse(renderedPreview)

  assert.equal(matte.corrosionCount > 80, true)
  assert.equal(matte.brightShare < 0.04, true)
  assert.equal(chips.rustScaleRoughnessMean > 0.9, true)
  assert.equal(
    chips.rustScaleRoughnessMean > chips.chipRoughnessMean + 0.05,
    true,
  )
})

test('traced metal frames use stroke-masked canvas material descriptors', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 50,
    metalTarnish: 100,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 0, y: 0, width: 240, height: 160 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const tracedPathData = 'M 4 4 L 236 4 L 236 156 L 4 156 Z'
  const fillPlan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: createMetalArtworkFramePathData(frame, bounds, stroke),
    frame,
    pathData: createMetalArtworkFramePathData(frame, bounds, stroke),
    strokeWidth: stroke,
  })
  const strokePlan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipMode: 'stroke',
    clipPathData: tracedPathData,
    frame,
    pathData: tracedPathData,
    strokeWidth: stroke,
  })
  const recordingCanvas = createRecordingMaterialCanvas()

  assert.equal(strokePlan.backend, 'canvas-texture')
  assert.ok(fillPlan.canvasTexture)
  assert.ok(strokePlan.canvasTexture)
  assert.equal(strokePlan.canvasTexture.clipMode, 'stroke')
  assert.equal(strokePlan.canvasTexture.clipStroke?.lineWidth, stroke)
  assert.deepEqual(strokePlan.canvasTexture.bounds, {
    x: -stroke / 2,
    y: -stroke / 2,
    width: bounds.width + stroke,
    height: bounds.height + stroke,
  })
  assert.notEqual(
    getArtworkFrameCanvasMaterialTextureKey(fillPlan.canvasTexture),
    getArtworkFrameCanvasMaterialTextureKey(strokePlan.canvasTexture),
  )

  renderArtworkFrameCanvasMaterialTexture(strokePlan.canvasTexture, {
    createCanvas: recordingCanvas.createCanvas,
    createPath: (path) => ({ path } as unknown as Path2D),
  })

  const putImageDataIndex = recordingCanvas.operations.findIndex(
    (operation) => operation.name === 'putImageData',
  )

  assert.equal(
    recordingCanvas.operations.some((operation) =>
      operation.name === 'fillRect'),
    true,
  )
  assert.equal(
    recordingCanvas.operations.some((operation) =>
      operation.name === 'clip'),
    false,
  )
  assert.deepEqual(
    recordingCanvas.operations.find((operation) =>
      operation.name === 'translate')?.args,
    [stroke / 2, stroke / 2],
  )
  assert.equal(putImageDataIndex >= 0, true)
  assert.equal(
    recordingCanvas.operations.slice(putImageDataIndex + 1).some((
      operation,
    ) => operation.name === 'stroke'),
    true,
  )
})

test('steel corrosion field is deterministic and independent from light angle', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 48,
    metalTarnish: 64,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 0, y: 0, width: 128, height: 96 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const fieldSize = { height: 32, scale: 1, width: 48 }
  const request = createArtworkFrameCorrosionFieldRequest({
    bounds,
    frame,
    strokeWidth: stroke,
    textureSize: fieldSize,
  })
  const rotatedLightRequest = createArtworkFrameCorrosionFieldRequest({
    bounds,
    frame: { ...frame, metalLightAngle: 42 },
    strokeWidth: stroke,
    textureSize: fieldSize,
  })

  assert.ok(request)
  assert.ok(rotatedLightRequest)
  assert.equal(request.geometrySeedKey, rotatedLightRequest.geometrySeedKey)
  assert.equal(request.geometrySeed, rotatedLightRequest.geometrySeed)

  const field = buildArtworkFrameCorrosionField(request)
  const rotatedLightField = buildArtworkFrameCorrosionField(rotatedLightRequest)
  const edgeSummary = summarizeArtworkFrameCorrosionScalarField(
    field.fields.edgeExposure,
  )
  const pitSummary = summarizeArtworkFrameCorrosionScalarField(
    field.fields.cellularPitCenters,
  )
  const coverageSummary = summarizeArtworkFrameCorrosionScalarField(
    field.fields.stageCoverage,
  )
  const maskSummary = summarizeArtworkFrameCorrosionScalarField(
    field.fields.frameMask,
  )

  assertCorrosionGeometryFieldsEqual(field.fields, rotatedLightField.fields)
  assert.equal(edgeSummary.max > 0.65, true)
  assert.equal(pitSummary.max > 0.8, true)
  assert.equal(coverageSummary.mean > 0.02, true)
  assert.equal(maskSummary.mean > 0.05 && maskSummary.mean < 0.8, true)
})

test('corrosion field tarnish changes stage coverage without reseeding geometry', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'blackIron',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 22,
    metalPolish: 36,
    metalTarnish: 18,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 0, y: 0, width: 128, height: 96 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const fieldSize = { height: 32, scale: 1, width: 48 }
  const earlyRequest = createArtworkFrameCorrosionFieldRequest({
    bounds,
    frame,
    strokeWidth: stroke,
    textureSize: fieldSize,
  })
  const advancedRequest = createArtworkFrameCorrosionFieldRequest({
    bounds,
    frame: { ...frame, metalTarnish: 92 },
    strokeWidth: stroke,
    textureSize: fieldSize,
  })

  assert.ok(earlyRequest)
  assert.ok(advancedRequest)
  assert.equal(earlyRequest.geometrySeedKey, advancedRequest.geometrySeedKey)
  assert.equal(earlyRequest.geometrySeed, advancedRequest.geometrySeed)

  const earlyField = buildArtworkFrameCorrosionField(earlyRequest)
  const advancedField = buildArtworkFrameCorrosionField(advancedRequest)

  for (const fieldName of [
    'cellularPitCenters',
    'corrosionPotential',
    'defectExposure',
    'edgeExposure',
    'frameMask',
    'moistureBasins',
    'protectedMetalIslands',
  ] as const) {
    assertFloatFieldsEqual(
      earlyField.fields[fieldName],
      advancedField.fields[fieldName],
    )
  }

  assert.equal(
    summarizeArtworkFrameCorrosionScalarField(
      advancedField.fields.stageCoverage,
    ).mean >
      summarizeArtworkFrameCorrosionScalarField(
        earlyField.fields.stageCoverage,
      ).mean * 2.5,
    true,
  )
  assert.equal(earlyRequest.stageUnits.seed > 0, true)
  assert.equal(advancedRequest.stageUnits.flake > 0, true)
  assert.equal(advancedRequest.stageUnits.advanced > 0, true)
})

test('corrosion field placement stays stable while polish changes response maps', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 22,
    metalPolish: 0,
    metalTarnish: 64,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 0, y: 0, width: 128, height: 96 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const fieldSize = { height: 32, scale: 1, width: 48 }
  const roughRequest = createArtworkFrameCorrosionFieldRequest({
    bounds,
    frame,
    strokeWidth: stroke,
    textureSize: fieldSize,
  })
  const midRequest = createArtworkFrameCorrosionFieldRequest({
    bounds,
    frame: { ...frame, metalPolish: 50 },
    strokeWidth: stroke,
    textureSize: fieldSize,
  })
  const polishedRequest = createArtworkFrameCorrosionFieldRequest({
    bounds,
    frame: { ...frame, metalPolish: 100 },
    strokeWidth: stroke,
    textureSize: fieldSize,
  })

  assert.ok(roughRequest)
  assert.ok(midRequest)
  assert.ok(polishedRequest)
  assert.equal(roughRequest.geometrySeedKey, midRequest.geometrySeedKey)
  assert.equal(roughRequest.geometrySeedKey, polishedRequest.geometrySeedKey)
  assert.equal(roughRequest.geometrySeed, midRequest.geometrySeed)
  assert.equal(roughRequest.geometrySeed, polishedRequest.geometrySeed)

  const roughField = buildArtworkFrameCorrosionField(roughRequest)
  const midField = buildArtworkFrameCorrosionField(midRequest)
  const polishedField = buildArtworkFrameCorrosionField(polishedRequest)

  assertCorrosionGeometryFieldsEqual(roughField.fields, midField.fields)
  assertCorrosionGeometryFieldsEqual(roughField.fields, polishedField.fields)

  const roughMaps = buildArtworkFrameCorrosionDerivedMaps(roughField)
  const midMaps = buildArtworkFrameCorrosionDerivedMaps(midField)
  const polishedMaps = buildArtworkFrameCorrosionDerivedMaps(polishedField)
  const roughRoughness = summarizeArtworkFrameCorrosionScalarField(
    roughMaps.roughness,
  )
  const midRoughness = summarizeArtworkFrameCorrosionScalarField(
    midMaps.roughness,
  )
  const polishedRoughness = summarizeArtworkFrameCorrosionScalarField(
    polishedMaps.roughness,
  )
  const roughBaseImageData = createTestCorrosionImageData(
    roughMaps.widthPixels,
    roughMaps.heightPixels,
    roughField.fields.frameMask,
  )
  const polishedBaseImageData = cloneImageData(roughBaseImageData)
  const roughShaded = shadeArtworkFrameCorrosionImageData(
    roughBaseImageData,
    roughMaps,
    {
      lightVector: createArtworkFrameMaterialHemisphereLightVector({
        x: Math.SQRT1_2,
        y: -Math.SQRT1_2,
      }),
    },
  )
  const polishedShaded = shadeArtworkFrameCorrosionImageData(
    polishedBaseImageData,
    polishedMaps,
    {
      lightVector: createArtworkFrameMaterialHemisphereLightVector({
        x: Math.SQRT1_2,
        y: -Math.SQRT1_2,
      }),
    },
  )

  assert.notEqual(roughRoughness.mean, midRoughness.mean)
  assert.notEqual(midRoughness.mean, polishedRoughness.mean)
  assert.equal(
    countDifferentBytes(roughShaded.data, polishedShaded.data) > 100,
    true,
  )
})

test('corrosion stage thresholds cover the preview and export tarnish checkpoints', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 45,
    metalTarnish: 0,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 0, y: 0, width: 128, height: 96 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const fieldSize = { height: 32, scale: 1, width: 48 }
  const getStages = (metalTarnish: number) => {
    const request = createArtworkFrameCorrosionFieldRequest({
      bounds,
      frame: { ...frame, metalTarnish },
      strokeWidth: stroke,
      textureSize: fieldSize,
    })

    assert.ok(request)

    return request.stageUnits
  }

  const clean = getStages(0)
  const sparseSeeds = getStages(15)
  const youngClusters = getStages(30)
  const patchBasins = getStages(45)
  const raisedScale = getStages(65)
  const liftedScale = getStages(80)
  const broadScale = getStages(100)

  assert.equal(clean.clean, 1)
  assert.equal(clean.seed, 0)
  assert.equal(clean.young, 0)
  assert.equal(clean.patch, 0)
  assert.equal(sparseSeeds.seed > 0.55 && sparseSeeds.seed < 0.62, true)
  assert.equal(sparseSeeds.young, 0)
  assert.equal(youngClusters.seed, 1)
  assert.equal(youngClusters.young > 0.6 && youngClusters.young < 0.7, true)
  assert.equal(youngClusters.patch, 0)
  assert.equal(patchBasins.patch > 0.45 && patchBasins.patch < 0.65, true)
  assert.equal(patchBasins.scale, 0)
  assert.equal(raisedScale.scale > 0.7, true)
  assert.equal(raisedScale.flake, 0)
  assert.equal(liftedScale.flake > 0.5 && liftedScale.flake < 0.6, true)
  assert.equal(liftedScale.advanced, 0)
  assert.equal(broadScale.scale, 1)
  assert.equal(broadScale.flake, 1)
  assert.equal(broadScale.advanced, 1)
})

test('corrosion stage units overlap smoothly without tarnish phase gaps', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 45,
    metalTarnish: 0,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 0, y: 0, width: 128, height: 96 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const fieldSize = { height: 32, scale: 1, width: 48 }
  const getStages = (metalTarnish: number) => {
    const request = createArtworkFrameCorrosionFieldRequest({
      bounds,
      frame: { ...frame, metalTarnish },
      strokeWidth: stroke,
      textureSize: fieldSize,
    })

    assert.ok(request)

    return request.stageUnits
  }
  const overlaps = [
    { left: 'clean', right: 'seed', tarnish: 8 },
    { left: 'seed', right: 'young', tarnish: 19 },
    { left: 'young', right: 'patch', tarnish: 33 },
    { left: 'patch', right: 'scale', tarnish: 50 },
    { left: 'scale', right: 'flake', tarnish: 72 },
    { left: 'flake', right: 'advanced', tarnish: 87 },
  ] as const

  for (const overlap of overlaps) {
    const stages = getStages(overlap.tarnish)

    assert.equal(stages[overlap.left] > 0, true)
    assert.equal(stages[overlap.right] > 0, true)
  }

  let previous = getStages(0)

  for (let metalTarnish = 1; metalTarnish <= 100; metalTarnish += 1) {
    const current = getStages(metalTarnish)

    for (const stageName of [
      'advanced',
      'flake',
      'patch',
      'scale',
      'seed',
      'young',
    ] as const) {
      assert.equal(current[stageName] >= previous[stageName] - 0.000001, true)
      assert.equal(current[stageName] - previous[stageName] < 0.18, true)
    }

    assert.equal(previous.clean - current.clean < 0.32, true)
    previous = current
  }

  for (let metalTarnish = 12; metalTarnish <= 22; metalTarnish += 1) {
    assert.equal(
      getStages(metalTarnish).seed > getStages(metalTarnish - 1).seed,
      true,
    )
  }
})

test('derived rust maps expose material roles and stay clipped to the frame ring', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 9,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 32,
    metalTarnish: 100,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 0, y: 0, width: 128, height: 96 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const fieldSize = { height: 48, scale: 1, width: 64 }
  const request = createArtworkFrameCorrosionFieldRequest({
    bounds,
    frame,
    strokeWidth: stroke,
    textureSize: fieldSize,
  })

  assert.ok(request)

  const field = buildArtworkFrameCorrosionField(request)
  const maps = buildArtworkFrameCorrosionDerivedMaps(field)
  const pixelCount = maps.widthPixels * maps.heightPixels
  const centerIndex =
    Math.floor(maps.heightPixels / 2) * maps.widthPixels +
    Math.floor(maps.widthPixels / 2)
  const topCenterIndex = Math.floor(maps.widthPixels / 2)
  let framePixelCount = 0
  let outsidePixelCount = 0
  let outsideBleedCount = 0
  let activeRustPixelCount = 0

  assert.equal(maps.albedo.length, pixelCount * 3)
  for (const map of [
    maps.ambientOcclusion,
    maps.crackMask,
    maps.flakeBodyMask,
    maps.flakeCastShadow,
    maps.flakeCurlX,
    maps.flakeCurlY,
    maps.flakeLiftHeight,
    maps.flakeLipMask,
    maps.flakeMask,
    maps.flakeRootMask,
    maps.flakeUndercutAO,
    maps.height,
    maps.metalExposure,
    maps.normalX,
    maps.normalY,
    maps.normalZ,
    maps.poreMask,
    maps.roughness,
  ]) {
    assert.equal(map.length, pixelCount)
  }
  assert.equal(field.fields.frameMask[centerIndex], 0)
  assert.equal(field.fields.frameMask[topCenterIndex], 1)

  for (let index = 0; index < pixelCount; index += 1) {
    const rgbIndex = index * 3

    if ((field.fields.frameMask[index] ?? 0) > 0) {
      framePixelCount += 1

      if (
        (1 - (maps.metalExposure[index] ?? 1)) +
          (maps.ambientOcclusion[index] ?? 0) +
          (maps.poreMask[index] ?? 0) +
          (maps.crackMask[index] ?? 0) +
          (maps.flakeMask[index] ?? 0) > 0.25
      ) {
        activeRustPixelCount += 1
      }

      continue
    }

    outsidePixelCount += 1

    if (
      (maps.albedo[rgbIndex] ?? 0) !== 0 ||
      (maps.albedo[rgbIndex + 1] ?? 0) !== 0 ||
      (maps.albedo[rgbIndex + 2] ?? 0) !== 0 ||
      (maps.ambientOcclusion[index] ?? 0) !== 0 ||
      (maps.crackMask[index] ?? 0) !== 0 ||
      (maps.flakeBodyMask[index] ?? 0) !== 0 ||
      (maps.flakeCastShadow[index] ?? 0) !== 0 ||
      (maps.flakeCurlX[index] ?? 0) !== 0 ||
      (maps.flakeCurlY[index] ?? 0) !== 0 ||
      (maps.flakeLiftHeight[index] ?? 0) !== 0 ||
      (maps.flakeLipMask[index] ?? 0) !== 0 ||
      (maps.flakeMask[index] ?? 0) !== 0 ||
      (maps.flakeRootMask[index] ?? 0) !== 0 ||
      (maps.flakeUndercutAO[index] ?? 0) !== 0 ||
      (maps.height[index] ?? 0.5) !== 0.5 ||
      (maps.metalExposure[index] ?? 0) !== 0 ||
      (maps.normalX[index] ?? 0) !== 0 ||
      (maps.normalY[index] ?? 0) !== 0 ||
      (maps.normalZ[index] ?? 1) !== 1 ||
      (maps.poreMask[index] ?? 0) !== 0 ||
      (maps.roughness[index] ?? 0) !== 0
    ) {
      outsideBleedCount += 1
    }
  }

  assert.equal(framePixelCount > 0, true)
  assert.equal(outsidePixelCount > framePixelCount, true)
  assert.equal(activeRustPixelCount > framePixelCount * 0.45, true)
  assert.equal(outsideBleedCount, 0)
})

test('corrosion mask covers the expanded outer metal ring', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 12,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'flat',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 32,
    metalTarnish: 100,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 0, y: 0, width: 128, height: 96 }
  const materialSeed = {
    algorithm: 'sha256-image-v1',
    key: 'sha256-image-v1:corrosion-expanded-outer-ring',
    seed32: 0xc0110510,
  } as const

  for (const shape of ['rectangle', 'circle'] as const) {
    const materialFrame = { ...frame, shape }
    const stroke = getArtworkFrameStrokeWidth(
      materialFrame,
      bounds.width,
      bounds.height,
    )
    const pathData = createMetalArtworkFramePathData(
      materialFrame,
      bounds,
      stroke,
    )
    const plan = buildMetalArtworkFrameMaterialPlan({
      bounds,
      clipPathData: pathData,
      frame: materialFrame,
      materialSeed,
      pathData,
      strokeWidth: stroke,
    })

    assert.ok(plan.canvasTexture?.corrosionFieldRequest)

    const request = plan.canvasTexture.corrosionFieldRequest
    const field = buildArtworkFrameCorrosionField(request)
    const maps = buildArtworkFrameCorrosionDerivedMaps(field)
    const { innerInset, outerInset } = getMetalArtworkFrameEdgeInsets(stroke)
    const outerLeftUnit = outerInset / bounds.width
    const innerLeftUnit = innerInset / bounds.width
    const outerBandX = outerLeftUnit * 0.5
    const innerBandX = innerLeftUnit * 0.5
    const openingX = innerLeftUnit * 1.35
    const outsideX = outerLeftUnit * 1.35
    const sampleY = 0.5

    assert.equal(
      getMaterialCoordinateFieldValue(
        request,
        field.fields.frameMask,
        outerBandX,
        sampleY,
      ),
      1,
      `${shape} outer band corrosion frame mask`,
    )
    assert.equal(
      getMaterialCoordinateFieldValue(
        request,
        field.fields.frameMask,
        innerBandX,
        sampleY,
      ),
      1,
      `${shape} inner band corrosion frame mask`,
    )
    assert.equal(
      getMaterialCoordinateFieldValue(
        request,
        maps.metalExposure,
        outerBandX,
        sampleY,
      ) >= 0,
      true,
      `${shape} outer band corrosion maps are addressable`,
    )
    assert.equal(
      getMaterialCoordinateFieldValue(
        request,
        field.fields.frameMask,
        openingX,
        sampleY,
      ),
      0,
      `${shape} artwork opening stays empty`,
    )
    assert.equal(
      getMaterialCoordinateFieldValue(
        request,
        field.fields.frameMask,
        outsideX,
        sampleY,
      ),
      0,
      `${shape} beyond outer edge stays empty`,
    )
  }
})

test('lifted flake derived maps are available only across the flake stage', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 36,
    metalTarnish: 0,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 0, y: 0, width: 128, height: 96 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const fieldSize = { height: 64, scale: 1, width: 96 }
  const getMaps = (
    metalTarnish: number,
    metalLightAngle = frame.metalLightAngle,
    metalType: 'blackIron' | 'steel' = 'steel',
  ) => {
    const request = createArtworkFrameCorrosionFieldRequest({
      bounds,
      frame: { ...frame, metalLightAngle, metalTarnish, metalType },
      strokeWidth: stroke,
      textureSize: fieldSize,
    })

    assert.ok(request)

    const field = buildArtworkFrameCorrosionField(request)

    return {
      field,
      maps: buildArtworkFrameCorrosionDerivedMaps(field),
      request,
    }
  }
  const preFlake = getMaps(65)
  const flakeStart = getMaps(72)
  const flakeMid = getMaps(80)
  const flakePeak = getMaps(88)
  const advanced = getMaps(100)
  const preSummary = summarizeLiftedFlakeDerivedMaps(
    preFlake.field.fields,
    preFlake.maps,
  )
  const startSummary = summarizeLiftedFlakeDerivedMaps(
    flakeStart.field.fields,
    flakeStart.maps,
  )
  const midSummary = summarizeLiftedFlakeDerivedMaps(
    flakeMid.field.fields,
    flakeMid.maps,
  )
  const peakSummary = summarizeLiftedFlakeDerivedMaps(
    flakePeak.field.fields,
    flakePeak.maps,
  )
  const advancedSummary = summarizeLiftedFlakeDerivedMaps(
    advanced.field.fields,
    advanced.maps,
  )
  const pixelCount = fieldSize.width * fieldSize.height

  for (const maps of [
    preFlake.maps,
    flakeStart.maps,
    flakeMid.maps,
    flakePeak.maps,
    advanced.maps,
  ]) {
    for (const map of [
      maps.flakeBodyMask,
      maps.flakeCastShadow,
      maps.flakeCurlX,
      maps.flakeCurlY,
      maps.flakeLiftHeight,
      maps.flakeLipMask,
      maps.flakeRootMask,
      maps.flakeUndercutAO,
    ]) {
      assert.equal(map.length, pixelCount)
    }
  }

  assert.equal(preFlake.request.stageUnits.flake, 0)
  assert.equal(
    flakeStart.request.stageUnits.flake > 0 &&
      flakeStart.request.stageUnits.flake < 0.05,
    true,
  )
  assert.equal(flakeMid.request.stageUnits.flake > 0.5, true)
  assert.equal(flakePeak.request.stageUnits.flake > 0.98, true)
  assert.equal(preSummary.bodyMean < 0.000001, true)
  assert.equal(preSummary.lipMean < 0.000001, true)
  assert.equal(preSummary.rootMean < 0.000001, true)
  assert.equal(preSummary.undercutMean < 0.000001, true)
  assert.equal(preSummary.liftHeightMean < 0.000001, true)
  assert.equal(preSummary.castShadowMean < 0.000001, true)
  assert.equal(preSummary.curlMagnitudeMean < 0.000001, true)
  assert.equal(startSummary.lipMean < midSummary.lipMean, true)
  assert.equal(midSummary.bodyMean > 0.075, true)
  assert.equal(midSummary.lipMean > 0.01, true)
  assert.equal(midSummary.rootMean > 0.002, true)
  assert.equal(midSummary.undercutMean > 0.006, true)
  assert.equal(midSummary.liftHeightMean > 0.03, true)
  assert.equal(midSummary.castShadowMean > 0.005, true)
  assert.equal(midSummary.curlMagnitudeMean > 0.002, true)
  assert.equal(midSummary.maxCurlMagnitude > 0.1, true)
  assert.equal(peakSummary.lipMean >= midSummary.lipMean, true)
  assert.equal(advancedSummary.castShadowMean >= midSummary.castShadowMean, true)

  for (const metalType of ['steel', 'blackIron'] as const) {
    const early = getMaps(72, frame.metalLightAngle, metalType)
    const mid = getMaps(88, frame.metalLightAngle, metalType)
    const heavy = getMaps(100, frame.metalLightAngle, metalType)
    const rotated = getMaps(88, 45, metalType)
    const earlyFlakes = summarizeLiftedFlakeDerivedMaps(
      early.field.fields,
      early.maps,
    )
    const midFlakes = summarizeLiftedFlakeDerivedMaps(
      mid.field.fields,
      mid.maps,
    )
    const heavyFlakes = summarizeLiftedFlakeDerivedMaps(
      heavy.field.fields,
      heavy.maps,
    )

    assertLiftedFlakeHeightMapsClippedToFrame(mid.field.fields, mid.maps)
    assertLiftedFlakeHeightMapsClippedToFrame(
      rotated.field.fields,
      rotated.maps,
    )
    assertLiftedFlakeHeightMapsClippedToFrame(heavy.field.fields, heavy.maps)
    assertCorrosionDerivedMapsEqual(mid.maps, rotated.maps)
    assert.equal(earlyFlakes.bodyMean > 0, true)
    assert.equal(midFlakes.bodyMean > earlyFlakes.bodyMean * 20, true)
    assert.equal(heavyFlakes.bodyMean > midFlakes.bodyMean * 1.2, true)
    assert.equal(midFlakes.lipMean > earlyFlakes.lipMean * 20, true)
    assert.equal(heavyFlakes.lipMean > midFlakes.lipMean * 1.25, true)
    assert.equal(midFlakes.rootMean > earlyFlakes.rootMean * 18, true)
    assert.equal(heavyFlakes.rootMean > midFlakes.rootMean * 1.2, true)
    assert.equal(midFlakes.liftHeightMean > earlyFlakes.liftHeightMean * 25, true)
    assert.equal(heavyFlakes.liftHeightMean > midFlakes.liftHeightMean * 1.2, true)
    assert.equal(midFlakes.castShadowMean > earlyFlakes.castShadowMean * 20, true)
    assert.equal(
      midFlakes.lipHeightMean > midFlakes.bodyHeightMean,
      true,
    )
    assert.equal(
      heavyFlakes.lipHeightMean > heavyFlakes.bodyHeightMean,
      true,
    )
    assert.equal(
      midFlakes.lipLiftHeightMean > midFlakes.bodyLiftHeightMean * 2.4,
      true,
    )
    assert.equal(
      heavyFlakes.lipLiftHeightMean > heavyFlakes.bodyLiftHeightMean * 2,
      true,
    )
    assert.equal(
      midFlakes.undercutAmbientOcclusionMean >
        midFlakes.bodyAmbientOcclusionMean + 0.03,
      true,
    )
    assert.equal(midFlakes.chipShare > 0, true)
    assert.equal(
      midFlakes.chipHeightMean < midFlakes.lipHeightMean,
      true,
    )
    assert.equal(
      heavyFlakes.castShadowMean > midFlakes.castShadowMean * 0.95,
      true,
    )
  }
})

test('early steel oxidation seeds stay sparse and anchored to damage geometry', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 45,
    metalTarnish: 18,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 0, y: 0, width: 128, height: 96 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const fieldSize = { height: 64, scale: 1, width: 96 }

  for (const metalType of ['steel', 'blackIron'] as const) {
    const materialFrame = { ...frame, metalType }
    const request = createArtworkFrameCorrosionFieldRequest({
      bounds,
      frame: materialFrame,
      strokeWidth: stroke,
      textureSize: fieldSize,
    })
    const rotatedLightRequest = createArtworkFrameCorrosionFieldRequest({
      bounds,
      frame: { ...materialFrame, metalLightAngle: 45 },
      strokeWidth: stroke,
      textureSize: fieldSize,
    })

    assert.ok(request)
    assert.ok(rotatedLightRequest)
    assert.equal(request.stageUnits.seed > 0, true)
    assert.equal(request.stageUnits.young, 0)
    assert.equal(request.geometrySeed, rotatedLightRequest.geometrySeed)

    const field = buildArtworkFrameCorrosionField(request)
    const rotatedLightField = buildArtworkFrameCorrosionField(rotatedLightRequest)
    const maps = buildArtworkFrameCorrosionDerivedMaps(field)
    const rotatedLightMaps = buildArtworkFrameCorrosionDerivedMaps(
      rotatedLightField,
    )
    const summary = summarizeSeedActivationByExposure(field.fields, maps)

    assertCorrosionDerivedMapsEqual(maps, rotatedLightMaps)
    assert.equal(summary.activeShare > 0.004, true)
    assert.equal(
      summary.activeShare < (metalType === 'blackIron' ? 0.16 : 0.12),
      true,
    )
    assert.equal(
      summary.largestComponent <= (metalType === 'blackIron' ? 16 : 8),
      true,
    )
    assert.equal(summary.max > 0.045, true)
    assert.equal(
      summary.highExposureMean > summary.lowExposureMean * 1.1,
      true,
    )
    assert.equal(
      summary.seedRoughnessMean > summary.quietRoughnessMean,
      true,
    )
    assert.equal(
      summary.seedMetalExposureMean < summary.quietMetalExposureMean,
      true,
    )
    assert.equal(
      summarizeArtworkFrameCorrosionScalarField(maps.crackMask).max,
      0,
    )
    assert.equal(
      summarizeArtworkFrameCorrosionScalarField(maps.flakeMask).max,
      0,
    )
  }
})

test('sparse steel oxidation renders visibly before clustered young rust', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 45,
    metalTarnish: 15,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 0, y: 0, width: 128, height: 96 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const fieldSize = { height: 64, scale: 1, width: 96 }
  const getVisibleSeedSummary = (metalTarnish: number) => {
    const materialFrame = { ...frame, metalTarnish }
    const request = createArtworkFrameCorrosionFieldRequest({
      bounds,
      frame: materialFrame,
      strokeWidth: stroke,
      textureSize: fieldSize,
    })

    assert.ok(request)
    assert.equal(request.stageUnits.seed > 0, true)
    assert.equal(request.stageUnits.young, 0)

    const field = buildArtworkFrameCorrosionField(request)
    const maps = buildArtworkFrameCorrosionDerivedMaps(field)
    const baseImageData = createTestCorrosionImageData(
      maps.widthPixels,
      maps.heightPixels,
      field.fields.frameMask,
    )
    const shadedImageData = shadeArtworkFrameCorrosionImageData(
      cloneImageData(baseImageData),
      maps,
      {
        lightVector: createArtworkFrameMaterialHemisphereLightVector({
          x: Math.SQRT1_2,
          y: -Math.SQRT1_2,
        }),
      },
    )

    return summarizeVisibleWarmSeedPixels(
      field.fields,
      maps,
      baseImageData,
      shadedImageData,
    )
  }
  const firstVisible = getVisibleSeedSummary(8)
  const emerging = getVisibleSeedSummary(10)
  const sparse = getVisibleSeedSummary(15)

  assert.equal(firstVisible.seedShare > 0.04, true)
  assert.equal(firstVisible.visibleWarmShare > 0.025, true)
  assert.equal(firstVisible.visibleWarmShare < 0.07, true)
  assert.equal(emerging.visibleWarmShare >= firstVisible.visibleWarmShare, true)
  assert.equal(emerging.maxWarmShift > firstVisible.maxWarmShift, true)
  assert.equal(sparse.seedShare > 0.04, true)
  assert.equal(sparse.seedShare < 0.11, true)
  assert.equal(sparse.visibleWarmShare > 0.03, true)
  assert.equal(sparse.visibleWarmShare < 0.08, true)
  assert.equal(sparse.visibleSeedShare > 0.65, true)
  assert.equal(sparse.maxWarmShift > 32, true)
  assert.equal(sparse.meanSeedWarmShift > 18, true)
})

test('seed to young rust handoff preserves tarnish sites from 11 to 22 percent', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 45,
    metalTarnish: 11,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 0, y: 0, width: 128, height: 96 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const fieldSize = { height: 64, scale: 1, width: 96 }
  type HandoffTestFrame = Omit<typeof frame, 'metalTarnish' | 'metalType'> & {
    metalTarnish: number
    metalType: 'blackIron' | 'steel'
  }
  const buildStage = (
    materialFrame: HandoffTestFrame,
    metalTarnish: number,
  ) => {
    const request = createArtworkFrameCorrosionFieldRequest({
      bounds,
      frame: { ...materialFrame, metalTarnish },
      strokeWidth: stroke,
      textureSize: fieldSize,
    })

    assert.ok(request)

    const field = buildArtworkFrameCorrosionField(request)
    const maps = buildArtworkFrameCorrosionDerivedMaps(field)

    return {
      field,
      maps,
      request,
      summary: summarizeCorrosionFeaturePopulation(field.fields, maps),
    }
  }

  for (const metalType of ['steel', 'blackIron'] as const) {
    const materialFrame = { ...frame, metalType }
    const stages = Array.from({ length: 12 }, (_, index) =>
      buildStage(materialFrame, index + 11))

    assert.equal(stages[0]!.request.stageUnits.young, 0)
    assert.equal(stages[11]!.request.stageUnits.seed, 1)
    assert.equal(stages[11]!.request.stageUnits.young > 0, true)

    for (let index = 1; index < stages.length; index += 1) {
      const previous = stages[index - 1]!
      const current = stages[index]!

      assert.equal(
        current.summary.activeShare >= previous.summary.activeShare - 0.000001,
        true,
      )
      assert.equal(
        current.summary.heightLiftMean >=
          previous.summary.heightLiftMean - 0.000001,
        true,
      )
      assert.equal(
        current.summary.metalExposureMean <=
          previous.summary.metalExposureMean + 0.0005,
        true,
      )
    }

    for (const [fromIndex, toIndex] of [
      [0, 3],
      [0, 11],
      [7, 11],
      [9, 11],
    ] as const) {
      const fromStage = stages[fromIndex]!
      const toStage = stages[toIndex]!
      const persistence = summarizeCorrosionHandoffPersistence(
        fromStage.field.fields,
        fromStage.maps,
        toStage.maps,
      )

      assert.equal(persistence.activeStartPixelCount > 0, true)
      assert.equal(persistence.keptShare > 0.98, true)
      assert.equal(
        persistence.nonDegradedShare > (fromIndex >= 9 ? 0.8 : 0.98),
        true,
      )
      assert.equal(persistence.severeRegressionShare < 0.02, true)
      assert.equal(
        persistence.meanEndActivation >=
          persistence.meanStartActivation * 0.995,
        true,
      )
    }
  }
})

test('young steel rust visibly changes across the 20 to 28 percent tarnish band', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 45,
    metalTarnish: 20,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 0, y: 0, width: 128, height: 96 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const fieldSize = { height: 64, scale: 1, width: 96 }
  const buildStage = (metalTarnish: number) => {
    const materialFrame = { ...frame, metalTarnish }
    const request = createArtworkFrameCorrosionFieldRequest({
      bounds,
      frame: materialFrame,
      strokeWidth: stroke,
      textureSize: fieldSize,
    })

    assert.ok(request)

    const field = buildArtworkFrameCorrosionField(request)
    const maps = buildArtworkFrameCorrosionDerivedMaps(field)
    const baseImageData = createTestCorrosionImageData(
      maps.widthPixels,
      maps.heightPixels,
      field.fields.frameMask,
    )
    const shadedImageData = shadeArtworkFrameCorrosionImageData(
      cloneImageData(baseImageData),
      maps,
      {
        lightVector: createArtworkFrameMaterialHemisphereLightVector({
          x: Math.SQRT1_2,
          y: -Math.SQRT1_2,
        }),
      },
    )

    return {
      field,
      maps,
      request,
      shadedImageData,
      summary: summarizeCorrosionFeaturePopulation(field.fields, maps),
    }
  }
  const twenty = buildStage(20)
  const twentyFour = buildStage(24)
  const twentyEight = buildStage(28)
  const midDelta = summarizeCorrosionImageDelta(
    twenty.field.fields,
    twenty.shadedImageData,
    twentyFour.shadedImageData,
  )
  const lateDelta = summarizeCorrosionImageDelta(
    twenty.field.fields,
    twenty.shadedImageData,
    twentyEight.shadedImageData,
  )

  assert.equal(twenty.request.stageUnits.seed > 0.9, true)
  assert.equal(twenty.request.stageUnits.patch, 0)
  assert.equal(twentyEight.request.stageUnits.patch, 0)
  assert.equal(
    twentyFour.summary.activeShare > twenty.summary.activeShare * 1.2,
    true,
  )
  assert.equal(
    twentyEight.summary.activeShare > twenty.summary.activeShare * 1.75,
    true,
  )
  assert.equal(midDelta.changedEightShare > 0.015, true)
  assert.equal(midDelta.changedSixteenShare > 0.015, true)
  assert.equal(midDelta.meanDelta > 0.9, true)
  assert.equal(
    lateDelta.changedEightShare > midDelta.changedEightShare * 2.2,
    true,
  )
  assert.equal(lateDelta.changedSixteenShare > 0.02, true)
  assert.equal(lateDelta.meanDelta > 5.5, true)
  assert.equal(lateDelta.warmGainShare > 0.01, true)
})

test('late young steel rust coalesces visibly across the 31 to 38 percent band', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 45,
    metalTarnish: 31,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 0, y: 0, width: 128, height: 96 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const fieldSize = { height: 64, scale: 1, width: 96 }
  const buildStage = (metalTarnish: number) => {
    const materialFrame = { ...frame, metalTarnish }
    const request = createArtworkFrameCorrosionFieldRequest({
      bounds,
      frame: materialFrame,
      strokeWidth: stroke,
      textureSize: fieldSize,
    })

    assert.ok(request)

    const field = buildArtworkFrameCorrosionField(request)
    const maps = buildArtworkFrameCorrosionDerivedMaps(field)
    const baseImageData = createTestCorrosionImageData(
      maps.widthPixels,
      maps.heightPixels,
      field.fields.frameMask,
    )
    const shadedImageData = shadeArtworkFrameCorrosionImageData(
      cloneImageData(baseImageData),
      maps,
      {
        lightVector: createArtworkFrameMaterialHemisphereLightVector({
          x: Math.SQRT1_2,
          y: -Math.SQRT1_2,
        }),
      },
    )

    return {
      field,
      maps,
      request,
      shadedImageData,
      summary: summarizeCorrosionFeaturePopulation(field.fields, maps),
    }
  }
  const thirtyOne = buildStage(31)
  const thirtyFour = buildStage(34)
  const thirtyEight = buildStage(38)
  const midDelta = summarizeCorrosionImageDelta(
    thirtyOne.field.fields,
    thirtyOne.shadedImageData,
    thirtyFour.shadedImageData,
  )
  const lateDelta = summarizeCorrosionImageDelta(
    thirtyOne.field.fields,
    thirtyFour.shadedImageData,
    thirtyEight.shadedImageData,
  )
  const fullDelta = summarizeCorrosionImageDelta(
    thirtyOne.field.fields,
    thirtyOne.shadedImageData,
    thirtyEight.shadedImageData,
  )

  assert.equal(thirtyOne.request.stageUnits.scale, 0)
  assert.equal(thirtyEight.request.stageUnits.scale, 0)
  assert.equal(
    thirtyFour.summary.activeShare > thirtyOne.summary.activeShare * 1.08,
    true,
  )
  assert.equal(
    thirtyEight.summary.activeShare > thirtyFour.summary.activeShare * 1.18,
    true,
  )
  assert.equal(thirtyEight.summary.ambientOcclusionMean >
    thirtyOne.summary.ambientOcclusionMean * 2.45, true)
  assert.equal(midDelta.changedEightShare > 0.04, true)
  assert.equal(midDelta.meanDelta > 2.4, true)
  assert.equal(lateDelta.changedSixteenShare > 0.08, true)
  assert.equal(lateDelta.meanDelta > 8, true)
  assert.equal(fullDelta.changedSixteenShare > 0.12, true)
  assert.equal(fullDelta.warmGainShare > 0.06, true)
})

test('young rust grows clustered physical features before patch coverage', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 45,
    metalTarnish: 22,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 0, y: 0, width: 128, height: 96 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const fieldSize = { height: 64, scale: 1, width: 96 }
  type YoungRustTestFrame = Omit<
    typeof frame,
    'metalTarnish' | 'metalType'
  > & {
    metalTarnish: number
    metalType: 'blackIron' | 'steel'
  }
  const buildSummary = (
    materialFrame: YoungRustTestFrame,
    metalTarnish: number,
  ) => {
    const request = createArtworkFrameCorrosionFieldRequest({
      bounds,
      frame: { ...materialFrame, metalTarnish },
      strokeWidth: stroke,
      textureSize: fieldSize,
    })

    assert.ok(request)

    const field = buildArtworkFrameCorrosionField(request)
    const maps = buildArtworkFrameCorrosionDerivedMaps(field)

    return {
      field,
      maps,
      request,
      summary: summarizeCorrosionFeaturePopulation(field.fields, maps),
    }
  }

  for (const metalType of ['steel', 'blackIron'] as const) {
    const materialFrame = { ...frame, metalType }
    const seed = buildSummary(materialFrame, 22)
    const young = buildSummary(materialFrame, 30)
    const lateYoung = buildSummary(materialFrame, 38)
    const rotatedLightRequest = createArtworkFrameCorrosionFieldRequest({
      bounds,
      frame: { ...materialFrame, metalLightAngle: 45, metalTarnish: 30 },
      strokeWidth: stroke,
      textureSize: fieldSize,
    })

    assert.ok(rotatedLightRequest)
    assert.equal(seed.request.stageUnits.seed, 1)
    assert.equal(seed.request.stageUnits.patch, 0)
    assert.equal(young.request.stageUnits.patch, 0)
    assert.equal(lateYoung.request.stageUnits.young, 1)
    assert.equal(rotatedLightRequest.geometrySeed, young.request.geometrySeed)

    const rotatedLightField = buildArtworkFrameCorrosionField(
      rotatedLightRequest,
    )
    const rotatedLightMaps = buildArtworkFrameCorrosionDerivedMaps(
      rotatedLightField,
    )

    assertCorrosionDerivedMapsEqual(young.maps, rotatedLightMaps)
    assert.equal(
      young.summary.activeShare > seed.summary.activeShare * 1.55,
      true,
    )
    assert.equal(
      lateYoung.summary.activeShare > young.summary.activeShare * 1.08,
      true,
    )
    assert.equal(
      young.summary.largestComponent > seed.summary.largestComponent,
      true,
    )
    assert.equal(
      lateYoung.summary.largestComponent > young.summary.largestComponent,
      true,
    )
    assert.equal(
      young.summary.heightLiftMean > seed.summary.heightLiftMean * 2,
      true,
    )
    assert.equal(
      lateYoung.summary.heightLiftMean > young.summary.heightLiftMean * 1.6,
      true,
    )
    assert.equal(
      young.summary.roughnessMean > seed.summary.roughnessMean + 0.004,
      true,
    )
    assert.equal(
      lateYoung.summary.ambientOcclusionMean >
        seed.summary.ambientOcclusionMean * 1.3,
      true,
    )
    assert.equal(
      lateYoung.summary.metalExposureMean < seed.summary.metalExposureMean * 0.985,
      true,
    )
    assert.equal(
      summarizeArtworkFrameCorrosionScalarField(young.maps.crackMask).max,
      0,
    )
    assert.equal(
      summarizeArtworkFrameCorrosionScalarField(young.maps.flakeMask).max,
      0,
    )
  }
})

test('patch rust basins coalesce shared albedo ambient occlusion and height maps', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 45,
    metalTarnish: 45,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 0, y: 0, width: 128, height: 96 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const fieldSize = { height: 64, scale: 1, width: 96 }
  type PatchRustTestFrame = Omit<
    typeof frame,
    'metalTarnish' | 'metalType'
  > & {
    metalTarnish: number
    metalType: 'blackIron' | 'steel'
  }
  const buildSummary = (
    materialFrame: PatchRustTestFrame,
    metalTarnish: number,
  ) => {
    const request = createArtworkFrameCorrosionFieldRequest({
      bounds,
      frame: { ...materialFrame, metalTarnish },
      strokeWidth: stroke,
      textureSize: fieldSize,
    })

    assert.ok(request)

    const field = buildArtworkFrameCorrosionField(request)
    const maps = buildArtworkFrameCorrosionDerivedMaps(field)

    return {
      coupling: summarizePatchBasinCoupling(field.fields, maps),
      field,
      maps,
      request,
      summary: summarizeCorrosionFeaturePopulation(field.fields, maps),
    }
  }

  for (const metalType of ['steel', 'blackIron'] as const) {
    const materialFrame = { ...frame, metalType }
    const young = buildSummary(materialFrame, 34)
    const patch = buildSummary(materialFrame, 45)
    const latePatch = buildSummary(materialFrame, 50)
    const rotatedLightRequest = createArtworkFrameCorrosionFieldRequest({
      bounds,
      frame: { ...materialFrame, metalLightAngle: 45, metalTarnish: 45 },
      strokeWidth: stroke,
      textureSize: fieldSize,
    })

    assert.ok(rotatedLightRequest)
    assert.equal(patch.request.stageUnits.patch > 0, true)
    assert.equal(patch.request.stageUnits.scale, 0)
    assert.equal(rotatedLightRequest.geometrySeed, patch.request.geometrySeed)

    const rotatedLightField = buildArtworkFrameCorrosionField(
      rotatedLightRequest,
    )
    const rotatedLightMaps = buildArtworkFrameCorrosionDerivedMaps(
      rotatedLightField,
    )

    assertCorrosionDerivedMapsEqual(patch.maps, rotatedLightMaps)
    assert.equal(
      patch.coupling.patchPixelCount > young.coupling.patchPixelCount * 1.08,
      true,
    )
    assert.equal(
      patch.summary.heightLiftMean > young.summary.heightLiftMean * 1.7,
      true,
    )
    assert.equal(
      patch.summary.ambientOcclusionMean >
        young.summary.ambientOcclusionMean * 1.1,
      true,
    )
    assert.equal(
      latePatch.coupling.patchPixelCount >
        patch.coupling.patchPixelCount * 1.12,
      true,
    )
    assert.equal(
      latePatch.summary.heightLiftMean > patch.summary.heightLiftMean * 1.55,
      true,
    )
    assert.equal(
      latePatch.summary.ambientOcclusionMean >
        patch.summary.ambientOcclusionMean * 1.44,
      true,
    )
    assert.equal(patch.coupling.coupledHeightShare > 0.35, true)
    assert.equal(latePatch.coupling.coupledHeightShare > 0.5, true)
    assert.equal(patch.coupling.patchPixelCount > 0, true)
    assert.equal(patch.coupling.pinholeShare > 0.18, true)
    assert.equal(patch.coupling.pinholeShare < 0.72, true)
    assert.equal(
      patch.coupling.pinholeMetalExposureMean >
        patch.coupling.nonPinholeMetalExposureMean + 0.16,
      true,
    )
    assert.equal(
      summarizeArtworkFrameCorrosionScalarField(patch.maps.crackMask).max,
      0,
    )
    assert.equal(
      summarizeArtworkFrameCorrosionScalarField(patch.maps.flakeMask).max,
      0,
    )
  }
})

test('mature rust scale becomes raised porous matte crust with exposed metal islands', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 36,
    metalTarnish: 65,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 0, y: 0, width: 128, height: 96 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const fieldSize = { height: 64, scale: 1, width: 96 }
  type ScaleRustTestFrame = Omit<
    typeof frame,
    'metalTarnish' | 'metalType'
  > & {
    metalTarnish: number
    metalType: 'blackIron' | 'steel'
  }
  const buildSummary = (
    materialFrame: ScaleRustTestFrame,
    metalTarnish: number,
  ) => {
    const request = createArtworkFrameCorrosionFieldRequest({
      bounds,
      frame: { ...materialFrame, metalTarnish },
      strokeWidth: stroke,
      textureSize: fieldSize,
    })

    assert.ok(request)

    const field = buildArtworkFrameCorrosionField(request)
    const maps = buildArtworkFrameCorrosionDerivedMaps(field)

    return {
      field,
      maps,
      request,
      summary: summarizeScaleSurface(field.fields, maps),
    }
  }

  for (const metalType of ['steel', 'blackIron'] as const) {
    const materialFrame = { ...frame, metalType }
    const patch = buildSummary(materialFrame, 50)
    const scale = buildSummary(materialFrame, 65)
    const lateScale = buildSummary(materialFrame, 72)
    const rotatedLightRequest = createArtworkFrameCorrosionFieldRequest({
      bounds,
      frame: { ...materialFrame, metalLightAngle: 45, metalTarnish: 65 },
      strokeWidth: stroke,
      textureSize: fieldSize,
    })

    assert.ok(rotatedLightRequest)
    assert.equal(scale.request.stageUnits.scale > 0.7, true)
    assert.equal(scale.request.stageUnits.flake, 0)
    assert.equal(rotatedLightRequest.geometrySeed, scale.request.geometrySeed)

    const rotatedLightField = buildArtworkFrameCorrosionField(
      rotatedLightRequest,
    )
    const rotatedLightMaps = buildArtworkFrameCorrosionDerivedMaps(
      rotatedLightField,
    )

    assertCorrosionDerivedMapsEqual(scale.maps, rotatedLightMaps)
    assert.equal(
      scale.summary.heightLiftMean > patch.summary.heightLiftMean * 1.9,
      true,
    )
    assert.equal(
      scale.summary.ambientOcclusionMean >
        patch.summary.ambientOcclusionMean * 1.8,
      true,
    )
    assert.equal(scale.summary.poreMean > patch.summary.poreMean * 3.6, true)
    assert.equal(
      scale.summary.roughnessMean > patch.summary.roughnessMean + 0.2,
      true,
    )
    assert.equal(
      scale.summary.albedoLuminanceMean <
        patch.summary.albedoLuminanceMean - 0.005,
      true,
    )
    assert.equal(
      scale.summary.metalExposureMean <
        patch.summary.metalExposureMean * 0.72,
      true,
    )
    assert.equal(
      scale.summary.highMetalShare < patch.summary.highMetalShare * 0.68,
      true,
    )
    assert.equal(scale.summary.highMetalShare > 0.08, true)
    assert.equal(
      scale.summary.lowMetalShare > patch.summary.lowMetalShare * 2.1,
      true,
    )
    assert.equal(scale.summary.crackMean > 0.004, true)
    assert.equal(scale.summary.flakeMean < 0.001, true)
    assert.equal(
      summarizeArtworkFrameCorrosionScalarField(scale.maps.crackMask).max >
        0.18,
      true,
    )
    assert.equal(
      summarizeArtworkFrameCorrosionScalarField(scale.maps.poreMask).max >
        0.95,
      true,
    )
    assert.equal(scale.summary.lowMetalRoughnessMean > 0.9, true)
    assert.equal(scale.summary.highMetalRoughnessMean < 0.5, true)
    assert.equal(
      lateScale.summary.roughnessMean > scale.summary.roughnessMean + 0.08,
      true,
    )
    assert.equal(
      lateScale.summary.metalExposureMean <
        scale.summary.metalExposureMean * 0.7,
      true,
    )
    assert.equal(
      lateScale.summary.crackMean > scale.summary.crackMean * 1.8,
      true,
    )
  }
})

test('flaking rust scale adds lifted lips cracks shadows and fresh steel chips', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 36,
    metalTarnish: 84,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 0, y: 0, width: 128, height: 96 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const fieldSize = { height: 64, scale: 1, width: 96 }
  type FlakingRustTestFrame = Omit<
    typeof frame,
    'metalTarnish' | 'metalType'
  > & {
    metalTarnish: number
    metalType: 'blackIron' | 'steel'
  }
  const buildSummary = (
    materialFrame: FlakingRustTestFrame,
    metalTarnish: number,
  ) => {
    const request = createArtworkFrameCorrosionFieldRequest({
      bounds,
      frame: { ...materialFrame, metalTarnish },
      strokeWidth: stroke,
      textureSize: fieldSize,
    })

    assert.ok(request)

    const field = buildArtworkFrameCorrosionField(request)
    const maps = buildArtworkFrameCorrosionDerivedMaps(field)

    return {
      field,
      flakeGeometry: summarizeFlakeGeometry(field.fields, maps),
      maps,
      request,
      summary: summarizeScaleSurface(field.fields, maps),
    }
  }

  for (const metalType of ['steel', 'blackIron'] as const) {
    const materialFrame = { ...frame, metalType }
    const scale = buildSummary(materialFrame, 72)
    const flaking = buildSummary(materialFrame, 84)
    const rotatedLightRequest = createArtworkFrameCorrosionFieldRequest({
      bounds,
      frame: { ...materialFrame, metalLightAngle: 45, metalTarnish: 84 },
      strokeWidth: stroke,
      textureSize: fieldSize,
    })

    assert.ok(rotatedLightRequest)
    assert.equal(
      scale.request.stageUnits.flake > 0 &&
        scale.request.stageUnits.flake < 0.05,
      true,
    )
    assert.equal(flaking.request.stageUnits.flake > 0.8, true)
    assert.equal(flaking.request.stageUnits.advanced, 0)
    assert.equal(rotatedLightRequest.geometrySeed, flaking.request.geometrySeed)

    const rotatedLightField = buildArtworkFrameCorrosionField(
      rotatedLightRequest,
    )
    const rotatedLightMaps = buildArtworkFrameCorrosionDerivedMaps(
      rotatedLightField,
    )
    const baseImageData = createTestCorrosionImageData(
      flaking.maps.widthPixels,
      flaking.maps.heightPixels,
      flaking.field.fields.frameMask,
    )
    const overheadLight = createArtworkFrameMaterialHemisphereLightVector({
      x: 0,
      y: 0,
    })
    const rotatedEdgeLight = createArtworkFrameMaterialHemisphereLightVector({
      x: Math.SQRT1_2,
      y: Math.SQRT1_2,
    })
    const shaded = shadeArtworkFrameCorrosionImageData(
      cloneImageData(baseImageData),
      flaking.maps,
      {
        lightVector: overheadLight,
      },
    )
    const rotatedShaded = shadeArtworkFrameCorrosionImageData(
      cloneImageData(baseImageData),
      rotatedLightMaps,
      {
        lightVector: rotatedEdgeLight,
      },
    )
    const flakeLightingDelta = summarizeFlakeLightingDelta(
      flaking.field.fields,
      flaking.maps,
      shaded,
      rotatedShaded,
    )
    const flakeRoughness = summarizeFlakeRoughnessRoles(
      flaking.field.fields,
      flaking.maps,
    )

    assertCorrosionDerivedMapsEqual(flaking.maps, rotatedLightMaps)
    assert.equal(flakeLightingDelta.flakeMeanDelta > 12, true)
    assert.equal(flakeLightingDelta.flakeSignificantShare > 0.42, true)
    assert.equal(
      flakeLightingDelta.lipMeanDelta >
        flakeLightingDelta.flakeMeanDelta * 1.35,
      true,
    )
    assert.equal(flakeRoughness.rustScaleWeight > 120, true)
    assert.equal(flakeRoughness.exposedChipWeight > 0.35, true)
    assert.equal(flakeRoughness.rustScaleRoughnessMean > 0.9, true)
    assert.equal(
      flakeRoughness.exposedChipRoughnessMean <
        flakeRoughness.rustScaleRoughnessMean * 0.62,
      true,
    )
    assert.equal(flaking.summary.flakeMean > 0.018, true)
    assert.equal(scale.summary.flakeMean > 0, true)
    assert.equal(
      scale.summary.flakeMean < flaking.summary.flakeMean * 0.06,
      true,
    )
    assert.equal(
      flaking.summary.crackMean > scale.summary.crackMean * 1.45,
      true,
    )
    assert.equal(
      flaking.flakeGeometry.maxCrack > scale.flakeGeometry.maxCrack * 1.1,
      true,
    )
    assert.equal(flaking.flakeGeometry.maxFlake > 0.35, true)
    assert.equal(flaking.flakeGeometry.flakeHeightShare > 0.1, true)
    assert.equal(flaking.flakeGeometry.undercutShadowShare > 0.1, true)
    assert.equal(flaking.flakeGeometry.freshChipShare > 0.0008, true)
    assert.equal(flaking.flakeGeometry.freshChipShare < 0.02, true)
    assert.equal(
      flaking.flakeGeometry.freshChipShare <
        flaking.flakeGeometry.flakeHeightShare * 0.08,
      true,
    )
    assert.equal(flaking.flakeGeometry.maxFlakeMetalExposure > 0.75, true)
    assert.equal(
      scale.summary.albedoLuminanceMean -
        flaking.summary.albedoLuminanceMean < 0.055,
      true,
    )
    assert.equal(
      flaking.summary.heightLiftMean > scale.summary.heightLiftMean * 0.7,
      true,
    )
    assert.equal(
      flaking.flakeGeometry.flakeHeightShare >
        scale.flakeGeometry.flakeHeightShare * 30,
      true,
    )
    assert.equal(
      flaking.summary.ambientOcclusionMean >
        scale.summary.ambientOcclusionMean * 0.995,
      true,
    )
    assert.equal(countDifferentBytes(shaded.data, rotatedShaded.data) > 40, true)
  }
})

test('advanced rust scale is broad matte porous and heterogeneous', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 36,
    metalTarnish: 100,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 0, y: 0, width: 128, height: 96 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const fieldSize = { height: 64, scale: 1, width: 96 }
  type AdvancedRustTestFrame = Omit<
    typeof frame,
    'metalTarnish' | 'metalType'
  > & {
    metalTarnish: number
    metalType: 'blackIron' | 'steel'
  }
  const buildSummary = (
    materialFrame: AdvancedRustTestFrame,
    metalTarnish: number,
  ) => {
    const request = createArtworkFrameCorrosionFieldRequest({
      bounds,
      frame: { ...materialFrame, metalTarnish },
      strokeWidth: stroke,
      textureSize: fieldSize,
    })

    assert.ok(request)

    const field = buildArtworkFrameCorrosionField(request)
    const maps = buildArtworkFrameCorrosionDerivedMaps(field)

    return {
      advancedScale: summarizeAdvancedScaleSurface(field.fields, maps),
      field,
      maps,
      request,
      scale: summarizeScaleSurface(field.fields, maps),
    }
  }

  for (const metalType of ['steel', 'blackIron'] as const) {
    const materialFrame = { ...frame, metalType }
    const flaking = buildSummary(materialFrame, 84)
    const advanced = buildSummary(materialFrame, 100)
    const rotatedLightRequest = createArtworkFrameCorrosionFieldRequest({
      bounds,
      frame: { ...materialFrame, metalLightAngle: 45, metalTarnish: 100 },
      strokeWidth: stroke,
      textureSize: fieldSize,
    })

    assert.ok(rotatedLightRequest)
    assert.equal(flaking.request.stageUnits.advanced, 0)
    assert.equal(advanced.request.stageUnits.advanced, 1)
    assert.equal(rotatedLightRequest.geometrySeed, advanced.request.geometrySeed)

    const rotatedLightField = buildArtworkFrameCorrosionField(
      rotatedLightRequest,
    )
    const rotatedLightMaps = buildArtworkFrameCorrosionDerivedMaps(
      rotatedLightField,
    )
    const baseImageData = createTestCorrosionImageData(
      advanced.maps.widthPixels,
      advanced.maps.heightPixels,
      advanced.field.fields.frameMask,
    )
    const shaded = shadeArtworkFrameCorrosionImageData(
      cloneImageData(baseImageData),
      advanced.maps,
      {
        lightVector: createArtworkFrameMaterialHemisphereLightVector({
          x: 0,
          y: 0,
        }),
      },
    )
    const rotatedShaded = shadeArtworkFrameCorrosionImageData(
      cloneImageData(baseImageData),
      rotatedLightMaps,
      {
        lightVector: createArtworkFrameMaterialHemisphereLightVector({
          x: Math.SQRT1_2,
          y: Math.SQRT1_2,
        }),
      },
    )

    assertCorrosionDerivedMapsEqual(advanced.maps, rotatedLightMaps)
    assert.equal(advanced.advancedScale.rustShare > 0.72, true)
    assert.equal(advanced.advancedScale.matteRustShare > 0.78, true)
    assert.equal(advanced.advancedScale.cavityShare > 0.2, true)
    assert.equal(advanced.advancedScale.flakeReliefShare > 0.05, true)
    assert.equal(
      advanced.advancedScale.residualChipShare >
        (metalType === 'blackIron' ? 0.004 : 0.015),
      true,
    )
    assert.equal(advanced.advancedScale.residualChipShare < 0.22, true)
    assert.equal(
      advanced.advancedScale.albedoLuminanceVariance > 0.00008,
      true,
    )
    assert.equal(advanced.scale.poreMean > flaking.scale.poreMean * 1.22, true)
    assert.equal(
      advanced.scale.ambientOcclusionMean >
        flaking.scale.ambientOcclusionMean * 1.12,
      true,
    )
    assert.equal(
      advanced.scale.heightLiftMean > flaking.scale.heightLiftMean * 1.08,
      true,
    )
    assert.equal(advanced.scale.roughnessMean > 0.92, true)
    assert.equal(
      advanced.scale.metalExposureMean < flaking.scale.metalExposureMean * 0.76,
      true,
    )
    assert.equal(
      advanced.scale.poreMean > advanced.scale.crackMean * 1.18,
      true,
    )
    assert.equal(countDifferentBytes(shaded.data, rotatedShaded.data) > 40, true)
  }
})

test('derived rust maps are stable while light angle only changes shading', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 36,
    metalTarnish: 86,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 0, y: 0, width: 128, height: 96 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const fieldSize = { height: 32, scale: 1, width: 48 }
  const request = createArtworkFrameCorrosionFieldRequest({
    bounds,
    frame,
    strokeWidth: stroke,
    textureSize: fieldSize,
  })
  const rotatedLightRequest = createArtworkFrameCorrosionFieldRequest({
    bounds,
    frame: { ...frame, metalLightAngle: 45 },
    strokeWidth: stroke,
    textureSize: fieldSize,
  })

  assert.ok(request)
  assert.ok(rotatedLightRequest)

  const field = buildArtworkFrameCorrosionField(request)
  const rotatedLightField = buildArtworkFrameCorrosionField(rotatedLightRequest)
  const maps = buildArtworkFrameCorrosionDerivedMaps(field)
  const rotatedLightMaps = buildArtworkFrameCorrosionDerivedMaps(rotatedLightField)
  const normalSummary = summarizeCorrosionNormalMaps(field.fields, maps)
  const baseImageData = createTestCorrosionImageData(
    maps.widthPixels,
    maps.heightPixels,
    field.fields.frameMask,
  )
  const shaded = shadeArtworkFrameCorrosionImageData(
    cloneImageData(baseImageData),
    maps,
    {
      lightVector: createArtworkFrameMaterialHemisphereLightVector({
        x: 0,
        y: 0,
      }),
    },
  )
  const rotatedLightShaded = shadeArtworkFrameCorrosionImageData(
    cloneImageData(baseImageData),
    rotatedLightMaps,
    {
      lightVector: createArtworkFrameMaterialHemisphereLightVector({
        x: Math.SQRT1_2,
        y: Math.SQRT1_2,
      }),
    },
  )

  assertCorrosionDerivedMapsEqual(maps, rotatedLightMaps)
  for (const fieldName of [
    'flakeCurlX',
    'flakeCurlY',
    'height',
    'normalX',
    'normalY',
    'normalZ',
  ] as const) {
    assertFloatFieldsEqual(maps[fieldName], rotatedLightMaps[fieldName])
  }
  assert.equal(
    summarizeArtworkFrameCorrosionScalarField(maps.ambientOcclusion).max > 0.1,
    true,
  )
  assert.equal(
    summarizeArtworkFrameCorrosionScalarField(maps.height).max >
      summarizeArtworkFrameCorrosionScalarField(maps.height).min,
    true,
  )
  assert.equal(
    summarizeArtworkFrameCorrosionScalarField(maps.roughness).mean > 0.08,
    true,
  )
  assert.equal(
    summarizeArtworkFrameCorrosionScalarField(maps.metalExposure).max > 0.1,
    true,
  )
  assert.equal(
    summarizeArtworkFrameCorrosionScalarField(maps.poreMask).max > 0.05,
    true,
  )
  assert.equal(
    summarizeArtworkFrameCorrosionScalarField(maps.crackMask).max > 0.02,
    true,
  )
  assert.equal(
    summarizeArtworkFrameCorrosionScalarField(maps.flakeMask).max > 0.02,
    true,
  )
  assert.equal(normalSummary.tiltedShare > 0.08, true)
  assert.equal(normalSummary.maxTilt > 0.12, true)
  assert.equal(normalSummary.maxTilt < 0.94, true)
  assert.equal(normalSummary.minNormalZ > 0.36, true)
  assert.equal(normalSummary.maxLengthError < 0.000001, true)
  assert.equal(
    countDifferentBytes(shaded.data, rotatedLightShaded.data) > 20,
    true,
  )
})

test('canvas material descriptor carries corrosion field request for rusting metals only', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 72,
    metalBevelWidth: 64,
    metalLightAngle: 315,
    metalBrushAngle: 12,
    metalPolish: 48,
    metalTarnish: 64,
    metalPatternScale: 90,
    metalPatternStrength: 55,
  } as const
  const bounds = { x: 0, y: 0, width: 128, height: 96 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const pathData = createMetalArtworkFramePathData(frame, bounds, stroke)
  const steelPlan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    pathData,
    strokeWidth: stroke,
  })
  const rotatedLightPlan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    lightVector: createArtworkFrameMaterialHemisphereLightVector({
      x: Math.SQRT1_2,
      y: Math.SQRT1_2,
    }),
    pathData,
    strokeWidth: stroke,
  })
  const changedPolishPlan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame: { ...frame, metalPolish: 12 },
    pathData,
    strokeWidth: stroke,
  })
  const changedTarnishPlan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame: { ...frame, metalTarnish: 92 },
    pathData,
    strokeWidth: stroke,
  })
  const copperPlan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame: { ...frame, metalType: 'copper' },
    pathData,
    strokeWidth: stroke,
  })

  assert.ok(steelPlan.canvasTexture?.corrosionFieldRequest)
  assert.ok(rotatedLightPlan.canvasTexture?.corrosionFieldRequest)
  assert.ok(changedPolishPlan.canvasTexture?.corrosionFieldRequest)
  assert.ok(changedTarnishPlan.canvasTexture?.corrosionFieldRequest)
  assert.equal(
    steelPlan.canvasTexture.corrosionFieldRequest.geometrySeedKey,
    rotatedLightPlan.canvasTexture.corrosionFieldRequest.geometrySeedKey,
  )
  assert.equal(
    steelPlan.canvasTexture.corrosionFieldRequest.geometrySeedKey,
    changedPolishPlan.canvasTexture.corrosionFieldRequest.geometrySeedKey,
  )
  assert.equal(
    steelPlan.canvasTexture.corrosionFieldRequest.geometrySeedKey,
    changedTarnishPlan.canvasTexture.corrosionFieldRequest.geometrySeedKey,
  )
  const baselineCacheKey = getArtworkFrameCanvasMaterialTextureKey(
    steelPlan.canvasTexture,
  )

  assert.notEqual(
    baselineCacheKey,
    getArtworkFrameCanvasMaterialTextureKey(rotatedLightPlan.canvasTexture),
  )
  assert.notEqual(
    baselineCacheKey,
    getArtworkFrameCanvasMaterialTextureKey(changedPolishPlan.canvasTexture),
  )
  assert.notEqual(
    baselineCacheKey,
    getArtworkFrameCanvasMaterialTextureKey(changedTarnishPlan.canvasTexture),
  )
  assert.equal(copperPlan.canvasTexture?.corrosionFieldRequest, null)
})

test('steel tarnish slider changes final canvas material pixels', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'metal',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
    metalType: 'steel',
    metalProfile: 'raised',
    metalPattern: 'none',
    metalDepth: 70,
    metalBevelWidth: 55,
    metalLightAngle: 315,
    metalBrushAngle: 0,
    metalPolish: 50,
    metalTarnish: 0,
    metalPatternScale: 100,
    metalPatternStrength: 45,
  } as const
  const bounds = { x: 0, y: 0, width: 100, height: 56 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const pathData = createMetalArtworkFramePathData(frame, bounds, stroke)
  const renderTarnish = (metalTarnish: number) => {
    const materialFrame = { ...frame, metalTarnish }
    const plan = buildMetalArtworkFrameMaterialPlan({
      bounds,
      clipPathData: pathData,
      frame: materialFrame,
      pathData,
      strokeWidth: stroke,
    })
    assert.equal(plan.backend, 'canvas-texture')
    assert.ok(plan.canvasTexture)

    const canvas = createDeterministicMaterialCanvas()

    return renderArtworkFrameCanvasMaterialTexture(plan.canvasTexture, {
      createCanvas: canvas.createCanvas,
      createPath: (path) => ({ path } as unknown as Path2D),
    })
  }
  const clean = renderTarnish(0)
  const mid = renderTarnish(50)
  const heavy = renderTarnish(100)

  assert.ok(clean.corrosionMaps)
  assert.ok(mid.corrosionMaps)
  assert.ok(heavy.corrosionMaps)
  assert.equal(
    countDifferentBytes(clean.imageData.data, mid.imageData.data) > 1000,
    true,
  )
  assert.equal(
    countDifferentBytes(mid.imageData.data, heavy.imageData.data) > 1000,
    true,
  )
  assert.equal(
    summarizeArtworkFrameCorrosionScalarField(
      heavy.corrosionMaps.ambientOcclusion,
    ).mean >
      summarizeArtworkFrameCorrosionScalarField(
        clean.corrosionMaps.ambientOcclusion,
      ).mean + 0.18,
    true,
  )
  assert.equal(
    summarizeArtworkFrameCorrosionScalarField(
      heavy.corrosionMaps.metalExposure,
    ).mean <
      summarizeArtworkFrameCorrosionScalarField(
        clean.corrosionMaps.metalExposure,
      ).mean - 0.2,
    true,
  )
})

test('solid artwork frames keep the non-textured path', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 2,
    shape: 'circle',
    style: 'solid',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
  } as const

  assert.equal(isTexturedArtworkFrame(frame), false)
  assert.equal(getArtworkFrameTextureUrl(frame), null)
})
