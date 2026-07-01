import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { deflateSync } from 'node:zlib'
import {
  createMetalArtworkFramePathData,
  getArtworkFrameStrokeWidth,
} from '../src/render/artworkFrame.ts'
import {
  buildArtworkFrameCorrosionField,
} from '../src/render/artworkFrameCorrosionField.ts'
import {
  buildArtworkFrameCorrosionDerivedMaps,
  shadeArtworkFrameCorrosionImageData,
} from '../src/render/artworkFrameCorrosionMaps.ts'
import {
  createArtworkFrameMaterialHemisphereLightVector,
} from '../src/render/artworkFrameMaterialLighting.ts'
import { buildMetalArtworkFrameMaterialPlan } from '../src/render/artworkFrameMaterialPlan.ts'
import {
  createArtworkFrameMaterialShadingCoordinateContext,
} from '../src/render/artworkFrameMaterialShading.ts'
import {
  ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS,
  ARTWORK_FRAME_STEEL_DEFECT_KINDS,
  ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS,
  activateArtworkFrameSteelDefectActiveBodyMaps,
  createArtworkFrameSteelDefectPlacementSet,
  populateArtworkFrameSteelDefectPhysicalContributionMaps,
  rasterizeArtworkFrameSteelDefectStablePlacementMaps,
} from '../src/render/artworkFrameSteelDefects.ts'
import {
  buildArtworkFrameSteelFinishDerivedMaps,
  buildArtworkFrameSteelFinishField,
  buildArtworkFrameSteelFinishNormalInputs,
  buildArtworkFrameSteelSubstrateDerivedMaps,
  buildArtworkFrameSteelSubstrateField,
  shadeArtworkFrameSteelFinishImageData,
} from '../src/render/artworkFrameSteelFinish.ts'

const ARTIFACT_DIR = path.join(
  process.cwd(),
  'artifacts',
  'steel-polish-stage6-5',
  'composition-verification',
)
const CHECKPOINTS = [0, 10, 25, 30, 50]
const DEFAULT_BOUNDS = { height: 96, width: 128, x: 0, y: 0 }
const DIAGONAL_HALF_RADIUS = Math.SQRT1_2 * 0.5
const DIAGONAL_EDGE_RADIUS = Math.SQRT1_2
const LIGHT_POSITIONS = [
  { label: 'overhead', position: { x: 0, y: 0 } },
  {
    label: '45-degree',
    position: { x: DIAGONAL_HALF_RADIUS, y: -DIAGONAL_HALF_RADIUS },
  },
  {
    label: 'grazing',
    position: { x: DIAGONAL_EDGE_RADIUS, y: -DIAGONAL_EDGE_RADIUS },
  },
]
const KIND_COLORS = {
  burrNick: [230, 224, 172],
  dent: [164, 206, 255],
  gouge: [255, 136, 88],
  pit: [200, 175, 255],
  scratch: [226, 241, 255],
  scuff: [184, 232, 175],
}
const PANEL_GUTTER = 18
const PANEL_HEIGHT = 214
const PANEL_WIDTH = 300
const SHEET_MARGIN = 24

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function createImage(width, height, color = [7, 10, 12, 255]) {
  const data = new Uint8Array(width * height * 4)

  for (let index = 0; index < width * height; index += 1) {
    const dataIndex = index * 4

    data[dataIndex] = color[0]
    data[dataIndex + 1] = color[1]
    data[dataIndex + 2] = color[2]
    data[dataIndex + 3] = color[3]
  }

  return { data, height, width }
}

function createImageData(width, height) {
  const data = new Uint8ClampedArray(width * height * 4)

  for (let index = 0; index < width * height; index += 1) {
    const dataIndex = index * 4

    data[dataIndex] = 122
    data[dataIndex + 1] = 128
    data[dataIndex + 2] = 132
    data[dataIndex + 3] = 255
  }

  return {
    colorSpace: 'srgb',
    data,
    height,
    width,
  }
}

function cloneImageData(imageData) {
  return {
    colorSpace: imageData.colorSpace ?? 'srgb',
    data: new Uint8ClampedArray(imageData.data),
    height: imageData.height,
    width: imageData.width,
  }
}

function createSheet(columns, rows) {
  return createImage(
    SHEET_MARGIN * 2 + columns * PANEL_WIDTH + (columns - 1) * PANEL_GUTTER,
    SHEET_MARGIN * 2 + rows * PANEL_HEIGHT + (rows - 1) * PANEL_GUTTER,
  )
}

function getPanelOrigin(column, row) {
  return {
    x: SHEET_MARGIN + column * (PANEL_WIDTH + PANEL_GUTTER),
    y: SHEET_MARGIN + row * (PANEL_HEIGHT + PANEL_GUTTER),
  }
}

function setPixel(image, x, y, color) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) {
    return
  }

  const index = (Math.floor(y) * image.width + Math.floor(x)) * 4
  const alpha = clampNumber((color[3] ?? 255) / 255, 0, 1)
  const inverse = 1 - alpha

  image.data[index] = Math.round(
    (color[0] ?? 0) * alpha + image.data[index] * inverse,
  )
  image.data[index + 1] = Math.round(
    (color[1] ?? 0) * alpha + image.data[index + 1] * inverse,
  )
  image.data[index + 2] = Math.round(
    (color[2] ?? 0) * alpha + image.data[index + 2] * inverse,
  )
  image.data[index + 3] = 255
}

function fillRect(image, x, y, width, height, color) {
  for (let py = y; py < y + height; py += 1) {
    for (let px = x; px < x + width; px += 1) {
      setPixel(image, px, py, color)
    }
  }
}

function drawPanelBorder(sheet, origin, accentColor) {
  fillRect(sheet, origin.x - 1, origin.y - 1, PANEL_WIDTH + 2, 1, [
    83,
    97,
    106,
    255,
  ])
  fillRect(sheet, origin.x - 1, origin.y + PANEL_HEIGHT, PANEL_WIDTH + 2, 1, [
    83,
    97,
    106,
    255,
  ])
  fillRect(sheet, origin.x - 1, origin.y - 1, 1, PANEL_HEIGHT + 2, [
    83,
    97,
    106,
    255,
  ])
  fillRect(sheet, origin.x + PANEL_WIDTH, origin.y - 1, 1, PANEL_HEIGHT + 2, [
    83,
    97,
    106,
    255,
  ])
  fillRect(sheet, origin.x, origin.y, PANEL_WIDTH, 5, accentColor)
}

function getBrushDirection(angleDegrees) {
  const radians = angleDegrees * Math.PI / 180

  return {
    angleDegrees,
    tangentX: Math.cos(radians),
    tangentY: Math.sin(radians),
  }
}

function createDiagnosticFrame({
  metalPolish = 50,
  metalTarnish = 0,
} = {}) {
  return {
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
  }
}

function createPlanPackage({
  lightPosition = { x: 0, y: 0 },
  materialSeedKey = 'stage6-5-composition-diagnostic-image-a',
  materialSeed32 = 0x5c6d7e8f,
  metalPolish = 50,
  metalTarnish = 0,
} = {}) {
  const frame = createDiagnosticFrame({ metalPolish, metalTarnish })
  const lightVector = createArtworkFrameMaterialHemisphereLightVector(
    lightPosition,
  )
  const strokeWidth = getArtworkFrameStrokeWidth(
    frame,
    DEFAULT_BOUNDS.width,
    DEFAULT_BOUNDS.height,
  )
  const pathData = createMetalArtworkFramePathData(
    frame,
    DEFAULT_BOUNDS,
    strokeWidth,
  )
  const plan = buildMetalArtworkFrameMaterialPlan({
    bounds: DEFAULT_BOUNDS,
    clipPathData: pathData,
    frame,
    lightVector,
    materialSeed: {
      algorithm: 'sha256-image-v1',
      key: materialSeedKey,
      seed32: materialSeed32,
    },
    pathData,
    strokeWidth,
  })

  if (!plan.canvasTexture?.steelFinishFieldRequest) {
    throw new Error('Expected a steel finish field request for diagnostics.')
  }

  return {
    frame,
    lightVector,
    plan,
    texture: plan.canvasTexture,
  }
}

function createDefectDecalMapsForSteelField(field, metalPolish) {
  const placementSet = createArtworkFrameSteelDefectPlacementSet({
    brushDirection: getBrushDirection(field.brushAngleDegrees),
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
  const maps = rasterizeArtworkFrameSteelDefectStablePlacementMaps({
    frameMask: field.fields.frameMask,
    heightPixels: field.fieldSize.height,
    placementSet,
    widthPixels: field.fieldSize.width,
  })

  activateArtworkFrameSteelDefectActiveBodyMaps({
    defectDecalMaps: maps,
    frameMask: field.fields.frameMask,
    metalPolish,
  })
  populateArtworkFrameSteelDefectPhysicalContributionMaps({
    defectDecalMaps: maps,
    frameMask: field.fields.frameMask,
    metalPolish,
  })

  return maps
}

function shadeSteelPackage({
  defectDecalMaps,
  frame,
  lightVector,
  steelFinishMaps,
  texture,
}) {
  const normalInputs = buildArtworkFrameSteelFinishNormalInputs(steelFinishMaps)
  const baseImageData = createImageData(
    steelFinishMaps.widthPixels,
    steelFinishMaps.heightPixels,
  )
  const steelImageData = shadeArtworkFrameSteelFinishImageData(
    cloneImageData(baseImageData),
    {
      coordinates: createArtworkFrameMaterialShadingCoordinateContext(texture),
      lightVector,
      metalBrushAngle: frame.metalBrushAngle,
      normalInputs,
      steelFinishMaps,
    },
  )

  return {
    defectDecalMaps,
    imageData: steelImageData,
    normalInputs,
    steelFinishMaps,
  }
}

function createCompositionPackage({
  lightPosition = { x: 0, y: 0 },
  metalPolish = 50,
  metalTarnish = 0,
} = {}) {
  const { frame, lightVector, texture } = createPlanPackage({
    lightPosition,
    metalPolish,
    metalTarnish,
  })
  const steelField = buildArtworkFrameSteelFinishField(
    texture.steelFinishFieldRequest,
  )
  const substrateField = buildArtworkFrameSteelSubstrateField(steelField)
  const substrateMaps = buildArtworkFrameSteelSubstrateDerivedMaps(
    steelField,
    substrateField,
  )
  const defectDecalMaps = createDefectDecalMapsForSteelField(
    steelField,
    metalPolish,
  )
  const mapsWithoutDecals = buildArtworkFrameSteelFinishDerivedMaps(steelField)
  const mapsWithDecals = buildArtworkFrameSteelFinishDerivedMaps(
    steelField,
    { defectDecalMaps },
  )
  const noDecalSteel = shadeSteelPackage({
    defectDecalMaps: null,
    frame,
    lightVector,
    steelFinishMaps: mapsWithoutDecals,
    texture,
  })
  const decalSteel = shadeSteelPackage({
    defectDecalMaps,
    frame,
    lightVector,
    steelFinishMaps: mapsWithDecals,
    texture,
  })
  const substrateOnlyImageData = shadeSubstrateOnly({
    frameMask: steelField.fields.frameMask,
    lightVector,
    maps: substrateMaps,
  })
  let corrosionMaps = null
  let finalImageData = decalSteel.imageData

  if (texture.corrosionFieldRequest) {
    corrosionMaps = buildArtworkFrameCorrosionDerivedMaps(
      buildArtworkFrameCorrosionField(texture.corrosionFieldRequest),
    )
    finalImageData = shadeArtworkFrameCorrosionImageData(
      cloneImageData(decalSteel.imageData),
      corrosionMaps,
      {
        coordinates: createArtworkFrameMaterialShadingCoordinateContext(texture),
        lightVector,
        steelFinishMaps: mapsWithDecals,
      },
    )
  }

  return {
    corrosionMaps,
    decalSteel,
    defectDecalMaps,
    finalImageData,
    frameMask: steelField.fields.frameMask,
    height: steelField.fieldSize.height,
    label: `${metalPolish}% polish, ${metalTarnish}% tarnish`,
    lightVector,
    mapsWithDecals,
    mapsWithoutDecals,
    metalPolish,
    metalTarnish,
    noDecalSteel,
    steelField,
    substrateField,
    substrateMaps,
    substrateOnlyImageData,
    texture,
    width: steelField.fieldSize.width,
  }
}

function shadeSubstrateOnly({ frameMask, lightVector, maps }) {
  const image = createImageData(maps.widthPixels, maps.heightPixels)
  const lightX = lightVector.x
  const lightY = -lightVector.y
  const lightZ = lightVector.z

  for (let index = 0; index < maps.widthPixels * maps.heightPixels; index += 1) {
    const mask = frameMask[index] ?? 0
    const dataIndex = index * 4

    if (mask <= 0) {
      image.data[dataIndex + 3] = 0
      continue
    }

    const roughness = maps.steelSubstrateRoughness[index] ?? 0
    const gloss = maps.steelSubstrateGloss[index] ?? 0
    const ao = maps.steelSubstrateAmbientOcclusion[index] ?? 0
    const height = maps.steelSubstrateHeight[index] ?? 0
    const layX = maps.steelSubstrateAnisotropyDirectionX[index] ?? 1
    const layY = maps.steelSubstrateAnisotropyDirectionY[index] ?? 0
    const layLength = Math.hypot(layX, layY) || 1
    const tangentX = layX / layLength
    const tangentY = layY / layLength
    const anisotropy = maps.steelSubstrateAnisotropy[index] ?? 0
    const grain = maps.steelSubstrateMicroStrandMask[index] ?? 0
    const veil = maps.steelSubstrateReflectionVeil[index] ?? 0
    const tangentLight = clampNumber(
      lightX * tangentX + lightY * tangentY,
      -1,
      1,
    )
    const acrossLight = clampNumber(
      lightX * -tangentY + lightY * tangentX,
      -1,
      1,
    )
    const overhead = clampNumber(lightZ, 0, 1)
    const directional = clampNumber(Math.hypot(lightX, lightY), 0, 1)
    const brushedBand = Math.pow(1 - Math.abs(acrossLight), 1.25) *
      anisotropy *
      directional
    const diffuse = 0.58 + overhead * 0.24 + brushedBand * 0.22 -
      ao * 0.48 -
      roughness * 0.08
    const coherent = Math.pow(
      clampNumber(overhead * 0.54 + brushedBand * 0.46, 0, 1),
      5.2,
    ) * gloss * 0.42
    const grainShade = (grain - 0.52) * (0.05 + anisotropy * 0.1) +
      (veil - 0.5) * 0.12 * brushedBand -
      Math.max(0, -tangentLight) * roughness * 0.06 * directional
    const heightHint = height * 1.3
    const shade = clampNumber(
      diffuse + coherent + grainShade + heightHint,
      0.12,
      1.24,
    )

    image.data[dataIndex] = clampByte(
      (maps.steelSubstrateAlbedo[dataIndex] ?? 0) * 255 * shade,
    )
    image.data[dataIndex + 1] = clampByte(
      (maps.steelSubstrateAlbedo[dataIndex + 1] ?? 0) * 255 * shade,
    )
    image.data[dataIndex + 2] = clampByte(
      (maps.steelSubstrateAlbedo[dataIndex + 2] ?? 0) * 255 * shade,
    )
    image.data[dataIndex + 3] = 255
  }

  return image
}

function getAnyActiveBody(defectDecalMaps, index) {
  let value = 0

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    for (const channel of ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS) {
      value = Math.max(value, defectDecalMaps.activeBodies[kind][channel][index] ?? 0)
    }
  }

  return value
}

function getAnyPhysicalContribution(defectDecalMaps, index) {
  let value = 0

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    for (const channel of ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS) {
      value = Math.max(
        value,
        Math.abs(defectDecalMaps.physicalContributions[kind][channel][index] ?? 0),
      )
    }
  }

  return value
}

function getMaxForKinds(maps, family, channel, index) {
  let maxKind = ARTWORK_FRAME_STEEL_DEFECT_KINDS[0]
  let maxValue = 0

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    const value = maps[family][kind][channel][index] ?? 0

    if (value > maxValue) {
      maxKind = kind
      maxValue = value
    }
  }

  return { kind: maxKind, value: maxValue }
}

function getCombinedPhysicalKind(maps, index) {
  let maxKind = ARTWORK_FRAME_STEEL_DEFECT_KINDS[0]
  let maxValue = 0

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    let value = 0

    for (const channel of ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS) {
      value = Math.max(
        value,
        Math.abs(maps.physicalContributions[kind][channel][index] ?? 0),
      )
    }

    if (value > maxValue) {
      maxKind = kind
      maxValue = value
    }
  }

  return { kind: maxKind, value: maxValue }
}

function colorFromKind(kind, value) {
  if (value <= 0) {
    return [5, 8, 10, 255]
  }

  const color = KIND_COLORS[kind] ?? [255, 255, 255]
  const intensity = clampNumber(value, 0, 1)

  return [
    clampByte(color[0] * intensity),
    clampByte(color[1] * intensity),
    clampByte(color[2] * intensity),
    255,
  ]
}

function getRustPresence(packageData, index) {
  const maps = packageData.corrosionMaps

  if (!maps) {
    return 0
  }

  return clampNumber(
    (maps.poreMask[index] ?? 0) * 0.35 +
      (maps.crackMask[index] ?? 0) * 0.28 +
      (maps.flakeMask[index] ?? 0) * 0.35 +
      (maps.flakeLipMask[index] ?? 0) * 0.35 +
      (maps.ambientOcclusion[index] ?? 0) * 0.32,
    0,
    1,
  )
}

function getLocalNeighborMean(values, frameMask, width, height, sourceIndex) {
  const sourceX = sourceIndex % width
  const sourceY = Math.floor(sourceIndex / width)
  let count = 0
  let sum = 0

  for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      if (offsetX === 0 && offsetY === 0) {
        continue
      }

      const x = sourceX + offsetX
      const y = sourceY + offsetY

      if (x < 0 || y < 0 || x >= width || y >= height) {
        continue
      }

      const index = y * width + x

      if ((frameMask[index] ?? 0) <= 0) {
        continue
      }

      count += 1
      sum += values[index] ?? 0
    }
  }

  return count > 0 ? sum / count : values[sourceIndex] ?? 0
}

function getSubstrateSpeckleScore(packageData, sourceIndex) {
  if ((packageData.frameMask[sourceIndex] ?? 0) <= 0) {
    return 0
  }

  const { frameMask, height, substrateMaps, width } = packageData
  const ao = substrateMaps.steelSubstrateAmbientOcclusion[sourceIndex] ?? 0
  const heightValue = substrateMaps.steelSubstrateHeight[sourceIndex] ?? 0
  const normalStrength =
    substrateMaps.steelSubstrateNormalStrength[sourceIndex] ?? 0
  const aoMean = getLocalNeighborMean(
    substrateMaps.steelSubstrateAmbientOcclusion,
    frameMask,
    width,
    height,
    sourceIndex,
  )
  const heightMean = getLocalNeighborMean(
    substrateMaps.steelSubstrateHeight,
    frameMask,
    width,
    height,
    sourceIndex,
  )
  const normalMean = getLocalNeighborMean(
    substrateMaps.steelSubstrateNormalStrength,
    frameMask,
    width,
    height,
    sourceIndex,
  )
  const aoSpike = Math.max(0, ao - aoMean - 0.0025) * 95
  const heightSpike = Math.max(0, Math.abs(heightValue - heightMean) - 0.0015) *
    145
  const normalSpike = Math.max(0, normalStrength - normalMean - 0.0035) * 45

  return clampNumber(Math.max(aoSpike, heightSpike, normalSpike), 0, 1)
}

function speckleGuardColor(value) {
  if (value <= 0.000001) {
    return [4, 8, 10, 255]
  }

  return [
    clampByte(22 + value * 233),
    clampByte(78 + value * 152),
    clampByte(118 - value * 68),
    255,
  ]
}

function getPitActiveBody(packageData, index) {
  return Math.max(
    packageData.defectDecalMaps.activeBodies.pit.presenceMask[index] ?? 0,
    packageData.defectDecalMaps.activeBodies.pit.bodyMask[index] ?? 0,
    packageData.defectDecalMaps.activeBodies.pit.coreMask[index] ?? 0,
    packageData.defectDecalMaps.activeBodies.pit.edgeMask[index] ?? 0,
  )
}

function getPitPhysicalContribution(packageData, index) {
  let value = 0

  for (const channel of ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS) {
    value = Math.max(
      value,
      Math.abs(
        packageData.defectDecalMaps.physicalContributions.pit[channel][
          index
        ] ?? 0,
      ),
    )
  }

  return value
}

function pitPhysicalColor(value) {
  if (value <= 0.000001) {
    return [5, 8, 10, 255]
  }

  const unit = clampNumber(value, 0, 1)

  return [
    clampByte(92 + unit * 163),
    clampByte(50 + unit * 172),
    clampByte(10 + unit * 86),
    255,
  ]
}

function getOutsideLeakMax(mask, values) {
  let max = 0
  const length = Math.min(mask.length, values.length)

  for (let index = 0; index < length; index += 1) {
    if ((mask[index] ?? 0) > 0) {
      continue
    }

    max = Math.max(max, Math.abs(values[index] ?? 0))
  }

  return max
}

function maxAbsDiff(a, b) {
  let max = 0
  const length = Math.min(a.length, b.length)

  for (let index = 0; index < length; index += 1) {
    max = Math.max(max, Math.abs((a[index] ?? 0) - (b[index] ?? 0)))
  }

  return max
}

function maxImageRgbDiff(a, b) {
  let max = 0
  const length = Math.min(a.data.length, b.data.length)

  for (let index = 0; index < length; index += 4) {
    max = Math.max(
      max,
      Math.abs((a.data[index] ?? 0) - (b.data[index] ?? 0)),
      Math.abs((a.data[index + 1] ?? 0) - (b.data[index + 1] ?? 0)),
      Math.abs((a.data[index + 2] ?? 0) - (b.data[index + 2] ?? 0)),
    )
  }

  return max
}

function getSubstrateMapDiffMax(a, b) {
  return Math.max(
    maxAbsDiff(a.substrateMaps.steelSubstrateHeight, b.substrateMaps.steelSubstrateHeight),
    maxAbsDiff(a.substrateMaps.steelSubstrateAmbientOcclusion, b.substrateMaps.steelSubstrateAmbientOcclusion),
    maxAbsDiff(a.substrateMaps.steelSubstrateRoughness, b.substrateMaps.steelSubstrateRoughness),
    maxAbsDiff(a.substrateMaps.steelSubstrateGloss, b.substrateMaps.steelSubstrateGloss),
    maxAbsDiff(a.substrateMaps.steelSubstrateAnisotropy, b.substrateMaps.steelSubstrateAnisotropy),
  )
}

function getDecalMapDiffMax(a, b) {
  let max = 0

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    for (const channel of ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS) {
      max = Math.max(
        max,
        maxAbsDiff(
          a.defectDecalMaps.activeBodies[kind][channel],
          b.defectDecalMaps.activeBodies[kind][channel],
        ),
      )
    }

    for (const channel of ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS) {
      max = Math.max(
        max,
        maxAbsDiff(
          a.defectDecalMaps.physicalContributions[kind][channel],
          b.defectDecalMaps.physicalContributions[kind][channel],
        ),
      )
    }
  }

  return max
}

function getPolish50LegacyDamageMetrics(packageData) {
  const metrics = {}

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    let max = 0
    let sum = 0
    const length = packageData.width * packageData.height

    for (let index = 0; index < length; index += 1) {
      for (const channel of ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS) {
        const value = Math.abs(
          packageData.defectDecalMaps.physicalContributions[kind][channel][index] ?? 0,
        )

        max = Math.max(max, value)
        sum += value
      }
    }

    metrics[kind] = {
      max,
      sum,
    }
  }

  return metrics
}

function drawImageDataPanel(sheet, column, row, imageData, accentColor) {
  const origin = getPanelOrigin(column, row)

  for (let y = 0; y < PANEL_HEIGHT; y += 1) {
    const sourceY = clampNumber(
      Math.floor((y / PANEL_HEIGHT) * imageData.height),
      0,
      imageData.height - 1,
    )

    for (let x = 0; x < PANEL_WIDTH; x += 1) {
      const sourceX = clampNumber(
        Math.floor((x / PANEL_WIDTH) * imageData.width),
        0,
        imageData.width - 1,
      )
      const sourceIndex = (sourceY * imageData.width + sourceX) * 4
      const alpha = imageData.data[sourceIndex + 3] ?? 0

      setPixel(
        sheet,
        origin.x + x,
        origin.y + y,
        alpha <= 0
          ? [5, 8, 10, 255]
          : [
              imageData.data[sourceIndex] ?? 0,
              imageData.data[sourceIndex + 1] ?? 0,
              imageData.data[sourceIndex + 2] ?? 0,
              255,
            ],
      )
    }
  }

  drawPanelBorder(sheet, origin, accentColor)
}

function drawMapPanel(sheet, column, row, packageData, mode, accentColor) {
  const origin = getPanelOrigin(column, row)

  for (let y = 0; y < PANEL_HEIGHT; y += 1) {
    const sourceY = clampNumber(
      Math.floor((y / PANEL_HEIGHT) * packageData.height),
      0,
      packageData.height - 1,
    )

    for (let x = 0; x < PANEL_WIDTH; x += 1) {
      const sourceX = clampNumber(
        Math.floor((x / PANEL_WIDTH) * packageData.width),
        0,
        packageData.width - 1,
      )
      const sourceIndex = sourceY * packageData.width + sourceX

      if ((packageData.frameMask[sourceIndex] ?? 0) <= 0) {
        setPixel(sheet, origin.x + x, origin.y + y, [5, 8, 10, 255])
        continue
      }

      if (mode === 'activeBody') {
        const active = getMaxForKinds(
          packageData.defectDecalMaps,
          'activeBodies',
          'bodyMask',
          sourceIndex,
        )

        setPixel(
          sheet,
          origin.x + x,
          origin.y + y,
          colorFromKind(active.kind, active.value),
        )
        continue
      }

      const physical = getCombinedPhysicalKind(
        packageData.defectDecalMaps,
        sourceIndex,
      )

      setPixel(
        sheet,
        origin.x + x,
        origin.y + y,
        colorFromKind(physical.kind, physical.value),
      )
    }
  }

  drawPanelBorder(sheet, origin, accentColor)
}

function diffColor(value, scale = 1) {
  const unit = clampNumber(value * scale, 0, 1)

  if (unit <= 0.000001) {
    return [5, 8, 10, 255]
  }

  return [
    clampByte(40 + unit * 215),
    clampByte(80 + unit * 70),
    clampByte(140 - unit * 100),
    255,
  ]
}

function drawDiffPanel(sheet, column, row, basePackage, comparePackage, mode) {
  const origin = getPanelOrigin(column, row)
  const baseImageData = basePackage.finalImageData ?? basePackage.imageData
  const compareImageData = comparePackage.finalImageData ?? comparePackage.imageData

  for (let y = 0; y < PANEL_HEIGHT; y += 1) {
    const sourceY = clampNumber(
      Math.floor((y / PANEL_HEIGHT) * basePackage.height),
      0,
      basePackage.height - 1,
    )

    for (let x = 0; x < PANEL_WIDTH; x += 1) {
      const sourceX = clampNumber(
        Math.floor((x / PANEL_WIDTH) * basePackage.width),
        0,
        basePackage.width - 1,
      )
      const sourceIndex = sourceY * basePackage.width + sourceX
      let value = 0

      if (mode === 'substrate') {
        value = Math.max(
          Math.abs(
            (basePackage.substrateMaps.steelSubstrateHeight[sourceIndex] ?? 0) -
              (comparePackage.substrateMaps.steelSubstrateHeight[sourceIndex] ?? 0),
          ),
          Math.abs(
            (basePackage.substrateMaps.steelSubstrateRoughness[sourceIndex] ?? 0) -
              (comparePackage.substrateMaps.steelSubstrateRoughness[sourceIndex] ?? 0),
          ),
          Math.abs(
            (basePackage.substrateMaps.steelSubstrateGloss[sourceIndex] ?? 0) -
              (comparePackage.substrateMaps.steelSubstrateGloss[sourceIndex] ?? 0),
          ),
        )
      } else if (mode === 'decal') {
        value = Math.max(
          Math.abs(getAnyActiveBody(basePackage.defectDecalMaps, sourceIndex) -
            getAnyActiveBody(comparePackage.defectDecalMaps, sourceIndex)),
          Math.abs(getAnyPhysicalContribution(basePackage.defectDecalMaps, sourceIndex) -
            getAnyPhysicalContribution(comparePackage.defectDecalMaps, sourceIndex)),
        )
      } else {
        const dataIndex = sourceIndex * 4

        value = (
          Math.abs(
            (baseImageData.data[dataIndex] ?? 0) -
              (compareImageData.data[dataIndex] ?? 0),
          ) +
          Math.abs(
            (baseImageData.data[dataIndex + 1] ?? 0) -
              (compareImageData.data[dataIndex + 1] ?? 0),
          ) +
          Math.abs(
            (baseImageData.data[dataIndex + 2] ?? 0) -
              (compareImageData.data[dataIndex + 2] ?? 0),
          )
        ) / 765
      }

      setPixel(sheet, origin.x + x, origin.y + y, diffColor(value, 4))
    }
  }

  drawPanelBorder(sheet, origin, [220, 140, 88, 255])
}

function drawClipGuardPanel(sheet, column, row, packageData, mode) {
  const origin = getPanelOrigin(column, row)

  for (let y = 0; y < PANEL_HEIGHT; y += 1) {
    const sourceY = clampNumber(
      Math.floor((y / PANEL_HEIGHT) * packageData.height),
      0,
      packageData.height - 1,
    )

    for (let x = 0; x < PANEL_WIDTH; x += 1) {
      const sourceX = clampNumber(
        Math.floor((x / PANEL_WIDTH) * packageData.width),
        0,
        packageData.width - 1,
      )
      const sourceIndex = sourceY * packageData.width + sourceX
      const frameMask = packageData.frameMask[sourceIndex] ?? 0
      let value = 0

      if (mode === 'substrate') {
        value = Math.max(
          Math.abs(packageData.substrateMaps.steelSubstrateHeight[sourceIndex] ?? 0),
          packageData.substrateMaps.steelSubstrateAmbientOcclusion[sourceIndex] ?? 0,
          packageData.substrateMaps.steelSubstrateRoughness[sourceIndex] ?? 0,
          packageData.substrateMaps.steelSubstrateGloss[sourceIndex] ?? 0,
        )
      } else if (mode === 'activeBody') {
        value = getAnyActiveBody(packageData.defectDecalMaps, sourceIndex)
      } else if (mode === 'physical') {
        value = getAnyPhysicalContribution(packageData.defectDecalMaps, sourceIndex)
      } else if (mode === 'rust') {
        value = getRustPresence(packageData, sourceIndex)
      } else {
        value = (packageData.finalImageData.data[sourceIndex * 4 + 3] ?? 0) / 255
      }

      if (frameMask <= 0 && value > 0.000001) {
        setPixel(sheet, origin.x + x, origin.y + y, [255, 32, 32, 255])
      } else if (frameMask > 0 && value > 0.000001) {
        setPixel(sheet, origin.x + x, origin.y + y, [82, 150, 120, 255])
      } else {
        setPixel(
          sheet,
          origin.x + x,
          origin.y + y,
          frameMask > 0 ? [26, 34, 38, 255] : [5, 8, 10, 255],
        )
      }
    }
  }

  drawPanelBorder(sheet, origin, [86, 154, 202, 255])
}

function drawCompositionSheet(packages) {
  const columns = 5
  const rows = packages.length
  const sheet = createSheet(columns, rows)

  for (const [row, packageData] of packages.entries()) {
    drawImageDataPanel(
      sheet,
      0,
      row,
      packageData.substrateOnlyImageData,
      [112, 160, 220, 255],
    )
    drawMapPanel(sheet, 1, row, packageData, 'activeBody', [86, 154, 202, 255])
    drawMapPanel(sheet, 2, row, packageData, 'physical', [190, 120, 92, 255])
    drawImageDataPanel(
      sheet,
      3,
      row,
      packageData.noDecalSteel.imageData,
      [164, 198, 170, 255],
    )
    drawImageDataPanel(
      sheet,
      4,
      row,
      packageData.decalSteel.imageData,
      [218, 196, 124, 255],
    )
  }

  return writePng(
    path.join(ARTIFACT_DIR, 'substrate-decal-composition-contact-sheet.png'),
    sheet,
  )
}

function drawDecalsDisabledEnabledSheet(
  packages,
  fileName = 'same-substrate-decals-disabled-enabled-contact-sheet.png',
) {
  const columns = 3
  const rows = packages.length
  const sheet = createSheet(columns, rows)

  for (const [row, packageData] of packages.entries()) {
    drawImageDataPanel(
      sheet,
      0,
      row,
      packageData.noDecalSteel.imageData,
      [164, 198, 170, 255],
    )
    drawImageDataPanel(
      sheet,
      1,
      row,
      packageData.decalSteel.imageData,
      [218, 196, 124, 255],
    )
    drawDiffPanel(sheet, 2, row, packageData.noDecalSteel, packageData.decalSteel, 'image')
  }

  return writePng(
    path.join(ARTIFACT_DIR, fileName),
    sheet,
  )
}

function drawComputedPanel(sheet, column, row, packageData, colorAt, accentColor) {
  const origin = getPanelOrigin(column, row)

  for (let y = 0; y < PANEL_HEIGHT; y += 1) {
    const sourceY = clampNumber(
      Math.floor((y / PANEL_HEIGHT) * packageData.height),
      0,
      packageData.height - 1,
    )

    for (let x = 0; x < PANEL_WIDTH; x += 1) {
      const sourceX = clampNumber(
        Math.floor((x / PANEL_WIDTH) * packageData.width),
        0,
        packageData.width - 1,
      )
      const sourceIndex = sourceY * packageData.width + sourceX

      if ((packageData.frameMask[sourceIndex] ?? 0) <= 0) {
        setPixel(sheet, origin.x + x, origin.y + y, [5, 8, 10, 255])
        continue
      }

      setPixel(sheet, origin.x + x, origin.y + y, colorAt(packageData, sourceIndex))
    }
  }

  drawPanelBorder(sheet, origin, accentColor)
}

function drawSubstrateSpeckleGuardSheet(packages) {
  const columns = 1
  const rows = packages.length
  const sheet = createSheet(columns, rows)

  for (const [row, packageData] of packages.entries()) {
    drawComputedPanel(
      sheet,
      0,
      row,
      packageData,
      (current, sourceIndex) =>
        speckleGuardColor(getSubstrateSpeckleScore(current, sourceIndex)),
      [220, 140, 88, 255],
    )
  }

  return writePng(
    path.join(ARTIFACT_DIR, 'substrate-speckle-guard-contact-sheet.png'),
    sheet,
  )
}

function drawActivePitDecalOwnershipSheet(packages) {
  const columns = 4
  const rows = packages.length
  const sheet = createSheet(columns, rows)

  for (const [row, packageData] of packages.entries()) {
    drawComputedPanel(
      sheet,
      0,
      row,
      packageData,
      (current, sourceIndex) =>
        speckleGuardColor(getSubstrateSpeckleScore(current, sourceIndex)),
      [220, 140, 88, 255],
    )
    drawComputedPanel(
      sheet,
      1,
      row,
      packageData,
      (current, sourceIndex) =>
        colorFromKind(
          'pit',
          current.defectDecalMaps.stablePlacement.pit.candidateMask[
            sourceIndex
          ] ?? 0,
        ),
      [80, 112, 160, 255],
    )
    drawComputedPanel(
      sheet,
      2,
      row,
      packageData,
      (current, sourceIndex) =>
        colorFromKind('pit', getPitActiveBody(current, sourceIndex)),
      [140, 108, 210, 255],
    )
    drawComputedPanel(
      sheet,
      3,
      row,
      packageData,
      (current, sourceIndex) =>
        pitPhysicalColor(getPitPhysicalContribution(current, sourceIndex)),
      [218, 170, 92, 255],
    )
  }

  return writePng(
    path.join(ARTIFACT_DIR, 'active-pit-decal-ownership-contact-sheet.png'),
    sheet,
  )
}

function drawTarnishStabilitySheet(cleanPackages, tarnishedPackages) {
  const columns = 4
  const rows = cleanPackages.length
  const sheet = createSheet(columns, rows)

  for (let row = 0; row < cleanPackages.length; row += 1) {
    const clean = cleanPackages[row]
    const tarnished = tarnishedPackages[row]

    drawDiffPanel(sheet, 0, row, clean, tarnished, 'substrate')
    drawDiffPanel(sheet, 1, row, clean, tarnished, 'decal')
    drawImageDataPanel(sheet, 2, row, clean.finalImageData, [164, 198, 170, 255])
    drawImageDataPanel(sheet, 3, row, tarnished.finalImageData, [198, 102, 48, 255])
  }

  return writePng(
    path.join(ARTIFACT_DIR, 'tarnish-stability-guard-contact-sheet.png'),
    sheet,
  )
}

function drawLightStabilitySheet(packages) {
  const columns = 5
  const rows = CHECKPOINTS.length
  const sheet = createSheet(columns, rows)

  for (let row = 0; row < CHECKPOINTS.length; row += 1) {
    const overhead = packages[row * LIGHT_POSITIONS.length]
    const diagonal = packages[row * LIGHT_POSITIONS.length + 1]
    const grazing = packages[row * LIGHT_POSITIONS.length + 2]

    drawImageDataPanel(sheet, 0, row, overhead.finalImageData, [182, 200, 210, 255])
    drawImageDataPanel(sheet, 1, row, diagonal.finalImageData, [182, 200, 210, 255])
    drawImageDataPanel(sheet, 2, row, grazing.finalImageData, [182, 200, 210, 255])
    drawDiffPanel(sheet, 3, row, overhead, grazing, 'substrate')
    drawDiffPanel(sheet, 4, row, overhead, grazing, 'decal')
  }

  return writePng(
    path.join(ARTIFACT_DIR, 'light-stability-guard-contact-sheet.png'),
    sheet,
  )
}

function drawFrameRingClippingSheet(packages) {
  const columns = 5
  const rows = packages.length
  const sheet = createSheet(columns, rows)

  for (const [row, packageData] of packages.entries()) {
    drawClipGuardPanel(sheet, 0, row, packageData, 'substrate')
    drawClipGuardPanel(sheet, 1, row, packageData, 'activeBody')
    drawClipGuardPanel(sheet, 2, row, packageData, 'physical')
    drawClipGuardPanel(sheet, 3, row, packageData, 'rust')
    drawClipGuardPanel(sheet, 4, row, packageData, 'finalAlpha')
  }

  return writePng(
    path.join(ARTIFACT_DIR, 'frame-ring-clipping-guard-contact-sheet.png'),
    sheet,
  )
}

function makeCrcTable() {
  const table = new Uint32Array(256)

  for (let index = 0; index < 256; index += 1) {
    let value = index

    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) !== 0
        ? 0xedb88320 ^ (value >>> 1)
        : value >>> 1
    }

    table[index] = value >>> 0
  }

  return table
}

const CRC_TABLE = makeCrcTable()

function crc32(buffer) {
  let value = 0xffffffff

  for (const byte of buffer) {
    value = CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8)
  }

  return (value ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii')
  const length = Buffer.alloc(4)
  const crc = Buffer.alloc(4)

  length.writeUInt32BE(data.length, 0)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0)

  return Buffer.concat([length, typeBuffer, data, crc])
}

async function writePng(filePath, image) {
  const header = Buffer.alloc(13)

  header.writeUInt32BE(image.width, 0)
  header.writeUInt32BE(image.height, 4)
  header[8] = 8
  header[9] = 6
  header[10] = 0
  header[11] = 0
  header[12] = 0

  const scanlineLength = image.width * 4 + 1
  const raw = Buffer.alloc(scanlineLength * image.height)

  for (let y = 0; y < image.height; y += 1) {
    const rawOffset = y * scanlineLength
    const rowStart = y * image.width * 4
    const rowEnd = rowStart + image.width * 4

    raw[rawOffset] = 0
    Buffer.from(image.data.subarray(rowStart, rowEnd)).copy(raw, rawOffset + 1)
  }

  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ])

  await writeFile(filePath, png)
}

async function writeManifest({
  files,
  lightMapDiffMax,
  lightShadedDiffMax,
  polish50LegacyDamageMetrics,
  ringLeakMetrics,
  tarnishDecalDiffMax,
  tarnishSubstrateDiffMax,
}) {
  await writeFile(
    path.join(
      ARTIFACT_DIR,
      'stage6-5-composition-diagnostic-package-manifest.json',
    ),
    JSON.stringify({
      acceptanceChecks: {
        lightChangesShadingOnly: {
          mapDiffMax: lightMapDiffMax,
          shadedRgbDiffMax: lightShadedDiffMax,
        },
        noBleedOutsideFrameRing: ringLeakMetrics,
        polish50LowStagePhysicalContributions: polish50LegacyDamageMetrics,
        tarnishDoesNotMovePlacement: {
          decalDiffMax: tarnishDecalDiffMax,
          substrateDiffMax: tarnishSubstrateDiffMax,
        },
      },
      checkpoints: CHECKPOINTS,
      files,
      generatedAt: new Date().toISOString(),
      lightPositions: LIGHT_POSITIONS.map(({ label }) => label),
      note: [
        'Stage 6.5 composition verification diagnostics.',
        'Panels are diagnostic-only and do not claim native Tauri acceptance.',
        'Substrate-only panels use substrate maps with active decals and tarnish disabled.',
        'Decals-disabled/enabled panels use the shared steel finish map and shader path.',
        'Substrate speckle guard panels are fixed-threshold local AO/height/normal contrast views; hot pixels mean dot-like substrate regression risk.',
        'Active pit decal ownership panels separate stable pit candidates, active pit bodies, and active pit physical response from substrate false-color maps.',
        'AO panels and guard panels are intentionally exaggerated diagnostics, not final material color.',
        'Tarnish and light guard panels compare map stability separately from final shaded pixels.',
        'Red pixels in clipping guards indicate detected bleed outside the frame ring.',
      ],
    }, null, 2),
  )
}

await mkdir(ARTIFACT_DIR, { recursive: true })

const compositionPackages = CHECKPOINTS.map((metalPolish) =>
  createCompositionPackage({
    lightPosition: { x: DIAGONAL_HALF_RADIUS, y: -DIAGONAL_HALF_RADIUS },
    metalPolish,
    metalTarnish: 0,
  }),
)
const tarnishCleanPackages = [0, 25, 50].map((metalPolish) =>
  createCompositionPackage({ metalPolish, metalTarnish: 0 }),
)
const tarnishRustedPackages = [0, 25, 50].map((metalPolish) =>
  createCompositionPackage({ metalPolish, metalTarnish: 100 }),
)
const lightPackages = CHECKPOINTS.flatMap((metalPolish) =>
  LIGHT_POSITIONS.map(({ position }) =>
    createCompositionPackage({
      lightPosition: position,
      metalPolish,
      metalTarnish: 0,
    }),
  ),
)
const clippingPackages = [
  createCompositionPackage({
    lightPosition: { x: DIAGONAL_EDGE_RADIUS, y: -DIAGONAL_EDGE_RADIUS },
    metalPolish: 0,
    metalTarnish: 0,
  }),
  createCompositionPackage({
    lightPosition: { x: DIAGONAL_EDGE_RADIUS, y: -DIAGONAL_EDGE_RADIUS },
    metalPolish: 50,
    metalTarnish: 100,
  }),
]

const files = [
  {
    fileName: 'substrate-decal-composition-contact-sheet.png',
    panels: CHECKPOINTS.flatMap((polish) => [
      `${polish}% substrate-only steel`,
      `${polish}% active decal body maps`,
      `${polish}% active decal physical maps`,
      `${polish}% steel with decals disabled`,
      `${polish}% full composed steel with decals enabled`,
    ]),
  },
  {
    fileName: 'same-substrate-decals-disabled-enabled-contact-sheet.png',
    panels: CHECKPOINTS.flatMap((polish) => [
      `${polish}% decals disabled`,
      `${polish}% decals enabled`,
      `${polish}% disabled/enabled RGB diff`,
    ]),
  },
  {
    fileName: 'same-substrate-decals-disabled-enabled-light-contact-sheet.png',
    panels: CHECKPOINTS.flatMap((polish) =>
      LIGHT_POSITIONS.flatMap(({ label }) => [
        `${polish}% ${label} decals disabled`,
        `${polish}% ${label} decals enabled`,
        `${polish}% ${label} disabled/enabled RGB diff`,
      ]),
    ),
  },
  {
    fileName: 'substrate-speckle-guard-contact-sheet.png',
    panels: CHECKPOINTS.map(
      (polish) =>
        `${polish}% fixed-threshold substrate speckle guard; hot pixels mean local AO/height/normal dot contrast`,
    ),
  },
  {
    fileName: 'active-pit-decal-ownership-contact-sheet.png',
    panels: CHECKPOINTS.flatMap((polish) => [
      `${polish}% fixed-threshold substrate speckle guard`,
      `${polish}% stable pit candidates only`,
      `${polish}% active pit body maps`,
      `${polish}% active pit physical response`,
    ]),
  },
  {
    fileName: 'tarnish-stability-guard-contact-sheet.png',
    panels: [0, 25, 50].flatMap((polish) => [
      `${polish}% tarnish substrate map diff`,
      `${polish}% tarnish decal map diff`,
      `${polish}% tarnish disabled final`,
      `${polish}% tarnish 100 final`,
    ]),
  },
  {
    fileName: 'light-stability-guard-contact-sheet.png',
    panels: CHECKPOINTS.flatMap((polish) => [
      `${polish}% overhead final`,
      `${polish}% 45-degree final`,
      `${polish}% grazing final`,
      `${polish}% light substrate map diff`,
      `${polish}% light decal map diff`,
    ]),
  },
  {
    fileName: 'frame-ring-clipping-guard-contact-sheet.png',
    panels: [
      '0% substrate bleed guard',
      '0% active decal bleed guard',
      '0% physical decal bleed guard',
      '0% rust bleed guard',
      '0% final alpha bleed guard',
      '50% tarnish 100 substrate bleed guard',
      '50% tarnish 100 active decal bleed guard',
      '50% tarnish 100 physical decal bleed guard',
      '50% tarnish 100 rust bleed guard',
      '50% tarnish 100 final alpha bleed guard',
    ],
  },
]

await drawCompositionSheet(compositionPackages)
await drawDecalsDisabledEnabledSheet(compositionPackages)
await drawDecalsDisabledEnabledSheet(
  lightPackages,
  'same-substrate-decals-disabled-enabled-light-contact-sheet.png',
)
await drawSubstrateSpeckleGuardSheet(compositionPackages)
await drawActivePitDecalOwnershipSheet(compositionPackages)
await drawTarnishStabilitySheet(tarnishCleanPackages, tarnishRustedPackages)
await drawLightStabilitySheet(lightPackages)
await drawFrameRingClippingSheet(clippingPackages)

const lightMapDiffMax = Math.max(
  ...CHECKPOINTS.map((_, index) => {
    const base = lightPackages[index * LIGHT_POSITIONS.length]
    const grazing = lightPackages[index * LIGHT_POSITIONS.length + 2]

    return Math.max(getSubstrateMapDiffMax(base, grazing), getDecalMapDiffMax(base, grazing))
  }),
)
const lightShadedDiffMax = Math.max(
  ...CHECKPOINTS.map((_, index) =>
    maxImageRgbDiff(
      lightPackages[index * LIGHT_POSITIONS.length].finalImageData,
      lightPackages[index * LIGHT_POSITIONS.length + 2].finalImageData,
    )
  ),
)
const tarnishSubstrateDiffMax = Math.max(
  ...tarnishCleanPackages.map((packageData, index) =>
    getSubstrateMapDiffMax(packageData, tarnishRustedPackages[index])
  ),
)
const tarnishDecalDiffMax = Math.max(
  ...tarnishCleanPackages.map((packageData, index) =>
    getDecalMapDiffMax(packageData, tarnishRustedPackages[index])
  ),
)
const polish50LegacyDamageMetrics = getPolish50LegacyDamageMetrics(
  compositionPackages[compositionPackages.length - 1],
)
const ringLeakMetrics = Object.fromEntries(
  clippingPackages.flatMap((packageData) => {
    const prefix = `${packageData.metalPolish}-polish-${packageData.metalTarnish}-tarnish`
    const substrateValues = packageData.substrateMaps.steelSubstrateRoughness
    const activeValues = new Float32Array(packageData.width * packageData.height)
    const physicalValues = new Float32Array(packageData.width * packageData.height)
    const rustValues = new Float32Array(packageData.width * packageData.height)
    const alphaValues = new Float32Array(packageData.width * packageData.height)

    for (let index = 0; index < activeValues.length; index += 1) {
      activeValues[index] = getAnyActiveBody(packageData.defectDecalMaps, index)
      physicalValues[index] = getAnyPhysicalContribution(
        packageData.defectDecalMaps,
        index,
      )
      rustValues[index] = getRustPresence(packageData, index)
      alphaValues[index] = (packageData.finalImageData.data[index * 4 + 3] ?? 0) / 255
    }

    return [
      [`${prefix}:substrate`, getOutsideLeakMax(packageData.frameMask, substrateValues)],
      [`${prefix}:activeDecal`, getOutsideLeakMax(packageData.frameMask, activeValues)],
      [`${prefix}:physicalDecal`, getOutsideLeakMax(packageData.frameMask, physicalValues)],
      [`${prefix}:rust`, getOutsideLeakMax(packageData.frameMask, rustValues)],
      [`${prefix}:finalAlpha`, getOutsideLeakMax(packageData.frameMask, alphaValues)],
    ]
  }),
)

await writeManifest({
  files,
  lightMapDiffMax,
  lightShadedDiffMax,
  polish50LegacyDamageMetrics,
  ringLeakMetrics,
  tarnishDecalDiffMax,
  tarnishSubstrateDiffMax,
})

for (const { fileName } of files) {
  console.log(path.join(ARTIFACT_DIR, fileName))
}
