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
  buildArtworkFrameMaterialHeightSelfShadowMap,
} from '../src/render/artworkFrameMaterialSelfShadow.ts'
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

const ARTIFACT_PHASE = process.argv[2] ?? 'before'
const ARTIFACT_DIR = path.join(
  process.cwd(),
  'artifacts',
  'steel-polish-stage7',
  ARTIFACT_PHASE,
)
const DEFAULT_CHECKPOINTS = [50, 65, 75, 85, 100]
const requestedCheckpoints = (process.argv[3] ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter((value) => value.length > 0)
  .map((value) => Number(value))
  .filter((value) => Number.isFinite(value))
const CHECKPOINTS = requestedCheckpoints.length > 0
  ? requestedCheckpoints
  : DEFAULT_CHECKPOINTS
const RUST_COMPOSITION_POLISH_CHECKPOINTS = [50, 75, 85, 100]
const RUST_COMPOSITION_TARNISH_CHECKPOINTS = [0, 45, 80, 100]
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
  { label: 'bottom-left', position: { x: -1, y: -1 } },
  { label: 'bottom-right', position: { x: 1, y: -1 } },
  { label: 'top-left', position: { x: -1, y: 1 } },
  { label: 'top-right', position: { x: 1, y: 1 } },
]
const KIND_COLORS = {
  burrNick: [230, 224, 172],
  dent: [164, 206, 255],
  gouge: [255, 136, 88],
  pit: [200, 175, 255],
  scratch: [226, 241, 255],
  scuff: [184, 232, 175],
}
const PANEL_GUTTER = 14
const PANEL_HEIGHT = 164
const PANEL_WIDTH = 228
const SHEET_MARGIN = 22

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

function getBrushDirection(angleDegrees) {
  const radians = angleDegrees * Math.PI / 180

  return {
    angleDegrees,
    tangentX: Math.cos(radians),
    tangentY: Math.sin(radians),
  }
}

function createPlanPackage({
  lightPosition = { x: 0, y: 0 },
  materialSeedKey = 'stage7-before-diagnostic-image-a',
  materialSeed32 = 0x7197a7b5,
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
  frame,
  lightVector,
  steelFinishMaps,
  texture,
}) {
  const normalInputs = buildArtworkFrameSteelFinishNormalInputs(steelFinishMaps)
  const imageData = shadeArtworkFrameSteelFinishImageData(
    createImageData(steelFinishMaps.widthPixels, steelFinishMaps.heightPixels),
    {
      coordinates: createArtworkFrameMaterialShadingCoordinateContext(texture),
      lightVector,
      metalBrushAngle: frame.metalBrushAngle,
      normalInputs,
      steelFinishMaps,
    },
  )

  return {
    imageData,
    normalInputs,
    steelFinishMaps,
  }
}

function createStage7Package({
  lightPosition,
  metalPolish,
}) {
  const { frame, lightVector, texture } = createPlanPackage({
    lightPosition,
    metalPolish,
    metalTarnish: 0,
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
    frame,
    lightVector,
    steelFinishMaps: mapsWithoutDecals,
    texture,
  })
  const decalSteel = shadeSteelPackage({
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
  const selfShadowMap = buildArtworkFrameMaterialHeightSelfShadowMap({
    heightMap: decalSteel.normalInputs.steelHeight,
    heightPixels: decalSteel.normalInputs.heightPixels,
    lightVector,
    maskMap: mapsWithDecals.steelMetalness,
    strength: 1,
    widthPixels: decalSteel.normalInputs.widthPixels,
  })

  return {
    decalSteel,
    defectDecalMaps,
    frameMask: steelField.fields.frameMask,
    height: steelField.fieldSize.height,
    lightVector,
    mapsWithDecals,
    mapsWithoutDecals,
    metalPolish,
    noDecalSteel,
    selfShadowMap,
    steelField,
    substrateField,
    substrateMaps,
    substrateOnlyImageData,
    texture,
    width: steelField.fieldSize.width,
  }
}

function createRustCompositionPackage({
  metalPolish,
  metalTarnish,
}) {
  const { frame, lightVector, texture } = createPlanPackage({
    lightPosition: { x: DIAGONAL_EDGE_RADIUS, y: -DIAGONAL_EDGE_RADIUS },
    materialSeed32: 0x57a7c057,
    materialSeedKey: 'stage7-rust-composition-guard',
    metalPolish,
    metalTarnish,
  })
  const steelField = buildArtworkFrameSteelFinishField(
    texture.steelFinishFieldRequest,
  )
  const defectDecalMaps = createDefectDecalMapsForSteelField(
    steelField,
    metalPolish,
  )
  const steelFinishMaps = buildArtworkFrameSteelFinishDerivedMaps(
    steelField,
    { defectDecalMaps },
  )
  const steelImageData = shadeSteelPackage({
    frame,
    lightVector,
    steelFinishMaps,
    texture,
  }).imageData

  if (!texture.corrosionFieldRequest) {
    return {
      corrosionMaps: null,
      imageData: steelImageData,
      metalPolish,
      metalTarnish,
      steelFinishMaps,
    }
  }

  const corrosionField = buildArtworkFrameCorrosionField(
    texture.corrosionFieldRequest,
  )
  const corrosionMaps = buildArtworkFrameCorrosionDerivedMaps(
    corrosionField,
    {
      steelFinishMaps,
    },
  )
  const imageData = shadeArtworkFrameCorrosionImageData(
    cloneImageData(steelImageData),
    corrosionMaps,
    {
      coordinates: createArtworkFrameMaterialShadingCoordinateContext(texture),
      lightVector,
      steelFinishMaps,
    },
  )

  return {
    corrosionMaps,
    imageData,
    metalPolish,
    metalTarnish,
    steelFinishMaps,
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

function getScalarRange(packages, getValues) {
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY

  for (const packageData of packages) {
    const values = getValues(packageData)

    for (let index = 0; index < values.length; index += 1) {
      if ((packageData.frameMask[index] ?? 0) <= 0) {
        continue
      }

      min = Math.min(min, values[index] ?? 0)
      max = Math.max(max, values[index] ?? 0)
    }
  }

  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
    return { max: 1, min: 0 }
  }

  return { max, min }
}

function normalizeRange(value, range) {
  return clampNumber(
    (value - range.min) / Math.max(0.000001, range.max - range.min),
    0,
    1,
  )
}

function grayscaleColor(value) {
  const byte = clampByte(value * 255)

  return [byte, byte, byte, 255]
}

function heightColor(value, range) {
  const extent = Math.max(Math.abs(range.min), Math.abs(range.max), 0.000001)
  const unit = clampNumber(value / extent, -1, 1)

  if (unit < 0) {
    return [
      clampByte(42 + (1 + unit) * 54),
      clampByte(74 + (1 + unit) * 76),
      clampByte(148 + (1 + unit) * 76),
      255,
    ]
  }

  return [
    clampByte(124 + unit * 118),
    clampByte(110 + unit * 94),
    clampByte(82 + unit * 42),
    255,
  ]
}

function diffColor(value, boost = 16) {
  const unit = clampNumber(value * boost, 0, 1)

  if (unit <= 0.000001) {
    return [5, 8, 10, 255]
  }

  return [
    clampByte(35 + unit * 220),
    clampByte(70 + unit * 150),
    clampByte(120 - unit * 70),
    255,
  ]
}

function albedoColor(packageData, sourceIndex) {
  const dataIndex = sourceIndex * 3

  return [
    clampByte(
      (packageData.substrateMaps.steelSubstrateAlbedo[dataIndex] ?? 0) * 255,
    ),
    clampByte(
      (packageData.substrateMaps.steelSubstrateAlbedo[dataIndex + 1] ?? 0) *
        255,
    ),
    clampByte(
      (packageData.substrateMaps.steelSubstrateAlbedo[dataIndex + 2] ?? 0) *
        255,
    ),
    255,
  ]
}

function anisotropyNormalColor(packageData, sourceIndex) {
  const sourceX = sourceIndex % packageData.width
  const splitX = packageData.width * 0.5

  if (sourceX < splitX) {
    const x =
      packageData.substrateMaps.steelSubstrateAnisotropyDirectionX[sourceIndex] ??
      0
    const y =
      packageData.substrateMaps.steelSubstrateAnisotropyDirectionY[sourceIndex] ??
      0
    const aspect =
      packageData.substrateMaps.steelSubstrateAnisotropy[sourceIndex] ?? 0
    const angle = Math.atan2(y, x)
    const hue = (angle + Math.PI) / (Math.PI * 2)
    const [r, g, b] = hsvToRgb(hue, 0.72, 0.24 + aspect * 0.76)

    return [r, g, b, 255]
  }

  return [
    clampByte(
      ((packageData.decalSteel.normalInputs.normalX[sourceIndex] ?? 0) * 0.5 +
        0.5) *
        255,
    ),
    clampByte(
      ((packageData.decalSteel.normalInputs.normalY[sourceIndex] ?? 0) * 0.5 +
        0.5) *
        255,
    ),
    clampByte(
      ((packageData.decalSteel.normalInputs.normalZ[sourceIndex] ?? 1) * 0.5 +
        0.5) *
        255,
    ),
    255,
  ]
}

function hsvToRgb(h, s, v) {
  const c = v * s
  const x = c * (1 - Math.abs((h * 6) % 2 - 1))
  const m = v - c
  let r = 0
  let g = 0
  let b = 0

  if (h < 1 / 6) {
    r = c
    g = x
  } else if (h < 2 / 6) {
    r = x
    g = c
  } else if (h < 3 / 6) {
    g = c
    b = x
  } else if (h < 4 / 6) {
    g = x
    b = c
  } else if (h < 5 / 6) {
    r = c
    b = x
  } else {
    r = c
    b = x
  }

  return [
    clampByte((r + m) * 255),
    clampByte((g + m) * 255),
    clampByte((b + m) * 255),
  ]
}

function colorFromKind(kind, value, fallback = [5, 8, 10, 255]) {
  if (value <= 0) {
    return fallback
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

function getMaxForKinds(maps, mapFamily, channel, index, kinds) {
  let maxKind = kinds[0]
  let maxValue = 0

  for (const kind of kinds) {
    const value = maps[mapFamily][kind][channel][index] ?? 0

    if (value > maxValue) {
      maxKind = kind
      maxValue = value
    }
  }

  return { kind: maxKind, value: maxValue }
}

function getAnyActiveBody(maps, index, kinds = ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
  let value = 0

  for (const kind of kinds) {
    for (const channel of ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS) {
      value = Math.max(value, maps.activeBodies[kind][channel][index] ?? 0)
    }
  }

  return value
}

function getAnyPhysicalContribution(
  maps,
  index,
  kinds = ARTWORK_FRAME_STEEL_DEFECT_KINDS,
) {
  let value = 0

  for (const kind of kinds) {
    for (const channel of ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS) {
      value = Math.max(
        value,
        Math.abs(maps.physicalContributions[kind][channel][index] ?? 0),
      )
    }
  }

  return value
}

function getActiveBodyColor(packageData, sourceIndex) {
  const active = getMaxForKinds(
    packageData.defectDecalMaps,
    'activeBodies',
    'bodyMask',
    sourceIndex,
    ARTWORK_FRAME_STEEL_DEFECT_KINDS,
  )

  return colorFromKind(active.kind, active.value)
}

function getPhysicalContributionColor(packageData, sourceIndex) {
  let maxKind = ARTWORK_FRAME_STEEL_DEFECT_KINDS[0]
  let maxValue = 0

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    const value = getAnyPhysicalContribution(
      packageData.defectDecalMaps,
      sourceIndex,
      [kind],
    )

    if (value > maxValue) {
      maxKind = kind
      maxValue = value
    }
  }

  return colorFromKind(maxKind, maxValue)
}

function getHighPolishDamageSurvivalColor(packageData, sourceIndex) {
  const heavyKinds = ARTWORK_FRAME_STEEL_DEFECT_KINDS.filter(
    (kind) => kind !== 'scratch',
  )
  const scratch = getAnyPhysicalContribution(
    packageData.defectDecalMaps,
    sourceIndex,
    ['scratch'],
  )
  const heavy = getAnyPhysicalContribution(
    packageData.defectDecalMaps,
    sourceIndex,
    heavyKinds,
  )
  const active = getAnyActiveBody(
    packageData.defectDecalMaps,
    sourceIndex,
    ARTWORK_FRAME_STEEL_DEFECT_KINDS,
  )

  if (heavy > 0.000001) {
    const unit = clampNumber(heavy, 0, 1)

    return [
      clampByte(80 + unit * 175),
      clampByte(20 + unit * 40),
      clampByte(20 + unit * 30),
      255,
    ]
  }

  if (scratch > 0.000001) {
    const unit = clampNumber(scratch, 0, 1)

    return [
      clampByte(45 + unit * 180),
      clampByte(84 + unit * 156),
      clampByte(128 + unit * 127),
      255,
    ]
  }

  if (active > 0.000001) {
    const unit = clampNumber(active, 0, 1)

    return [
      clampByte(30 + unit * 80),
      clampByte(30 + unit * 70),
      clampByte(45 + unit * 135),
      255,
    ]
  }

  return [5, 8, 10, 255]
}

function getSubstrateMapDiffMax(base, compare) {
  let max = 0

  for (let index = 0; index < base.width * base.height; index += 1) {
    max = Math.max(
      max,
      Math.abs(
        (base.substrateMaps.steelSubstrateHeight[index] ?? 0) -
          (compare.substrateMaps.steelSubstrateHeight[index] ?? 0),
      ),
      Math.abs(
        (base.substrateMaps.steelSubstrateRoughness[index] ?? 0) -
          (compare.substrateMaps.steelSubstrateRoughness[index] ?? 0),
      ),
      Math.abs(
        (base.substrateMaps.steelSubstrateGloss[index] ?? 0) -
          (compare.substrateMaps.steelSubstrateGloss[index] ?? 0),
      ),
      Math.abs(
        (base.substrateMaps.steelSubstrateAnisotropy[index] ?? 0) -
          (compare.substrateMaps.steelSubstrateAnisotropy[index] ?? 0),
      ),
    )
  }

  return max
}

function getDecalMapDiffMax(base, compare) {
  let max = 0

  for (let index = 0; index < base.width * base.height; index += 1) {
    max = Math.max(
      max,
      Math.abs(
        getAnyActiveBody(base.defectDecalMaps, index) -
          getAnyActiveBody(compare.defectDecalMaps, index),
      ),
      Math.abs(
        getAnyPhysicalContribution(base.defectDecalMaps, index) -
          getAnyPhysicalContribution(compare.defectDecalMaps, index),
      ),
    )
  }

  return max
}

function maxImageRgbDiff(a, b) {
  let max = 0

  for (let index = 0; index < a.data.length; index += 4) {
    max = Math.max(
      max,
      Math.abs((a.data[index] ?? 0) - (b.data[index] ?? 0)) / 255,
      Math.abs((a.data[index + 1] ?? 0) - (b.data[index + 1] ?? 0)) / 255,
      Math.abs((a.data[index + 2] ?? 0) - (b.data[index + 2] ?? 0)) / 255,
    )
  }

  return max
}

function getOutsideLeakMax(frameMask, values) {
  let max = 0

  for (let index = 0; index < values.length; index += 1) {
    if ((frameMask[index] ?? 0) <= 0) {
      max = Math.max(max, Math.abs(values[index] ?? 0))
    }
  }

  return max
}

function getRingLeakMetrics(packageData) {
  const activeValues = new Float32Array(packageData.width * packageData.height)
  const physicalValues = new Float32Array(packageData.width * packageData.height)
  const finalAlphaValues = new Float32Array(packageData.width * packageData.height)
  const substrateValues = packageData.substrateMaps.steelSubstrateRoughness
  const noDecalAlphaValues = new Float32Array(packageData.width * packageData.height)

  for (let index = 0; index < activeValues.length; index += 1) {
    activeValues[index] = getAnyActiveBody(packageData.defectDecalMaps, index)
    physicalValues[index] = getAnyPhysicalContribution(
      packageData.defectDecalMaps,
      index,
    )
    finalAlphaValues[index] =
      (packageData.decalSteel.imageData.data[index * 4 + 3] ?? 0) / 255
    noDecalAlphaValues[index] =
      (packageData.noDecalSteel.imageData.data[index * 4 + 3] ?? 0) / 255
  }

  return {
    activeDecal: getOutsideLeakMax(packageData.frameMask, activeValues),
    decalsDisabledAlpha: getOutsideLeakMax(
      packageData.frameMask,
      noDecalAlphaValues,
    ),
    decalsEnabledAlpha: getOutsideLeakMax(
      packageData.frameMask,
      finalAlphaValues,
    ),
    physicalDecal: getOutsideLeakMax(packageData.frameMask, physicalValues),
    selfShadow: getOutsideLeakMax(packageData.frameMask, packageData.selfShadowMap),
    substrate: getOutsideLeakMax(packageData.frameMask, substrateValues),
  }
}

function getHighPolishDamageMetrics(packages) {
  const metrics = {}
  const heavyKinds = ARTWORK_FRAME_STEEL_DEFECT_KINDS.filter(
    (kind) => kind !== 'scratch',
  )

  for (const packageData of packages) {
    let scratchMax = 0
    let heavyMax = 0

    for (let index = 0; index < packageData.width * packageData.height; index += 1) {
      scratchMax = Math.max(
        scratchMax,
        getAnyPhysicalContribution(packageData.defectDecalMaps, index, [
          'scratch',
        ]),
      )
      heavyMax = Math.max(
        heavyMax,
        getAnyPhysicalContribution(
          packageData.defectDecalMaps,
          index,
          heavyKinds,
        ),
      )
    }

    metrics[`${packageData.metalPolish}%`] = {
      heavyNonScratchPhysicalMax: heavyMax,
      scratchPhysicalMax: scratchMax,
    }
  }

  return metrics
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

function drawMapContactSheet({ accentColor, colorAt, fileName, packages }) {
  const sheet = createSheet(LIGHT_POSITIONS.length, CHECKPOINTS.length)

  for (const [index, packageData] of packages.entries()) {
    drawComputedPanel(
      sheet,
      index % LIGHT_POSITIONS.length,
      Math.floor(index / LIGHT_POSITIONS.length),
      packageData,
      colorAt,
      accentColor,
    )
  }

  return writePng(path.join(ARTIFACT_DIR, fileName), sheet)
}

function drawImageContactSheet({ accentColor, fileName, getImageData, packages }) {
  const sheet = createSheet(LIGHT_POSITIONS.length, CHECKPOINTS.length)

  for (const [index, packageData] of packages.entries()) {
    drawImageDataPanel(
      sheet,
      index % LIGHT_POSITIONS.length,
      Math.floor(index / LIGHT_POSITIONS.length),
      getImageData(packageData),
      accentColor,
    )
  }

  return writePng(path.join(ARTIFACT_DIR, fileName), sheet)
}

function drawLightStabilitySheet(lightPackages) {
  const columns = LIGHT_POSITIONS.length + 2
  const rows = CHECKPOINTS.length
  const sheet = createSheet(columns, rows)

  for (let row = 0; row < CHECKPOINTS.length; row += 1) {
    const baseIndex = row * LIGHT_POSITIONS.length
    const overhead = lightPackages[baseIndex]
    const grazing = lightPackages[baseIndex + 2]

    for (let column = 0; column < LIGHT_POSITIONS.length; column += 1) {
      const packageData = lightPackages[baseIndex + column]

      drawImageDataPanel(
        sheet,
        column,
        row,
        packageData.decalSteel.imageData,
        [182, 200, 210, 255],
      )
    }

    drawDiffPanel(sheet, LIGHT_POSITIONS.length, row, overhead, grazing, 'substrate')
    drawDiffPanel(
      sheet,
      LIGHT_POSITIONS.length + 1,
      row,
      overhead,
      grazing,
      'decal',
    )
  }

  return writePng(
    path.join(ARTIFACT_DIR, 'light-stability-guard-contact-sheet.png'),
    sheet,
  )
}

function drawRustCompositionGuardSheet(rustCompositionPackages) {
  const columns = RUST_COMPOSITION_TARNISH_CHECKPOINTS.length
  const rows = RUST_COMPOSITION_POLISH_CHECKPOINTS.length
  const sheet = createSheet(columns, rows)

  for (const packageData of rustCompositionPackages) {
    const column = RUST_COMPOSITION_TARNISH_CHECKPOINTS.indexOf(
      packageData.metalTarnish,
    )
    const row = RUST_COMPOSITION_POLISH_CHECKPOINTS.indexOf(
      packageData.metalPolish,
    )

    drawImageDataPanel(
      sheet,
      column,
      row,
      packageData.imageData,
      [184, 128, 92, 255],
    )
  }

  return writePng(
    path.join(ARTIFACT_DIR, 'rust-composition-guard-contact-sheet.png'),
    sheet,
  )
}

function drawDiffPanel(sheet, column, row, base, compare, mode) {
  const origin = getPanelOrigin(column, row)

  for (let y = 0; y < PANEL_HEIGHT; y += 1) {
    const sourceY = clampNumber(
      Math.floor((y / PANEL_HEIGHT) * base.height),
      0,
      base.height - 1,
    )

    for (let x = 0; x < PANEL_WIDTH; x += 1) {
      const sourceX = clampNumber(
        Math.floor((x / PANEL_WIDTH) * base.width),
        0,
        base.width - 1,
      )
      const sourceIndex = sourceY * base.width + sourceX
      let value = 0

      if ((base.frameMask[sourceIndex] ?? 0) <= 0) {
        setPixel(sheet, origin.x + x, origin.y + y, [5, 8, 10, 255])
        continue
      }

      if (mode === 'substrate') {
        value = Math.max(
          Math.abs(
            (base.substrateMaps.steelSubstrateHeight[sourceIndex] ?? 0) -
              (compare.substrateMaps.steelSubstrateHeight[sourceIndex] ?? 0),
          ),
          Math.abs(
            (base.substrateMaps.steelSubstrateRoughness[sourceIndex] ?? 0) -
              (compare.substrateMaps.steelSubstrateRoughness[sourceIndex] ?? 0),
          ),
          Math.abs(
            (base.substrateMaps.steelSubstrateGloss[sourceIndex] ?? 0) -
              (compare.substrateMaps.steelSubstrateGloss[sourceIndex] ?? 0),
          ),
        )
      } else {
        value = Math.max(
          Math.abs(
            getAnyActiveBody(base.defectDecalMaps, sourceIndex) -
              getAnyActiveBody(compare.defectDecalMaps, sourceIndex),
          ),
          Math.abs(
            getAnyPhysicalContribution(base.defectDecalMaps, sourceIndex) -
              getAnyPhysicalContribution(compare.defectDecalMaps, sourceIndex),
          ),
        )
      }

      setPixel(sheet, origin.x + x, origin.y + y, diffColor(value, 32))
    }
  }

  drawPanelBorder(sheet, origin, [220, 140, 88, 255])
}

function drawClipGuardPanel(sheet, column, row, packageData, mode, accentColor) {
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
      } else if (mode === 'active') {
        value = getAnyActiveBody(packageData.defectDecalMaps, sourceIndex)
      } else if (mode === 'physical') {
        value = getAnyPhysicalContribution(packageData.defectDecalMaps, sourceIndex)
      } else if (mode === 'selfShadow') {
        value = packageData.selfShadowMap[sourceIndex] ?? 0
      } else if (mode === 'decalsDisabledAlpha') {
        value = (packageData.noDecalSteel.imageData.data[sourceIndex * 4 + 3] ?? 0) / 255
      } else {
        value = (packageData.decalSteel.imageData.data[sourceIndex * 4 + 3] ?? 0) / 255
      }

      if (frameMask <= 0 && value > 0.000001) {
        setPixel(sheet, origin.x + x, origin.y + y, [255, 32, 32, 255])
      } else if (frameMask > 0 && value > 0.000001) {
        setPixel(
          sheet,
          origin.x + x,
          origin.y + y,
          mode === 'selfShadow'
            ? [160, 110, 255, 255]
            : [80, 150, 120, 255],
        )
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

  drawPanelBorder(sheet, origin, accentColor)
}

function drawFrameRingClippingSheet(packages) {
  const columns = 6
  const rows = packages.length
  const sheet = createSheet(columns, rows)

  for (const [row, packageData] of packages.entries()) {
    drawClipGuardPanel(sheet, 0, row, packageData, 'substrate', [
      112,
      160,
      220,
      255,
    ])
    drawClipGuardPanel(sheet, 1, row, packageData, 'active', [
      86,
      154,
      202,
      255,
    ])
    drawClipGuardPanel(sheet, 2, row, packageData, 'physical', [
      190,
      120,
      92,
      255,
    ])
    drawClipGuardPanel(sheet, 3, row, packageData, 'selfShadow', [
      160,
      110,
      255,
      255,
    ])
    drawClipGuardPanel(sheet, 4, row, packageData, 'decalsDisabledAlpha', [
      164,
      198,
      170,
      255,
    ])
    drawClipGuardPanel(sheet, 5, row, packageData, 'decalsEnabledAlpha', [
      218,
      196,
      124,
      255,
    ])
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

function createPanelLabels(labelPrefix) {
  return CHECKPOINTS.flatMap((polish) =>
    LIGHT_POSITIONS.map(({ label }) => `${polish}% ${label} ${labelPrefix}`),
  )
}

async function writeManifest({
  files,
  highPolishDamageMetrics,
  lightMapDiffMax,
  lightShadedDiffMax,
  ringLeakMetrics,
}) {
  await writeFile(
    path.join(
      ARTIFACT_DIR,
      `stage7-${ARTIFACT_PHASE}-diagnostic-package-manifest.json`,
    ),
    JSON.stringify({
      acceptanceChecks: {
        highPolishDamageSurvival: highPolishDamageMetrics,
        lightChangesShadingOnly: {
          mapDiffMax: lightMapDiffMax,
          shadedRgbDiffMax: lightShadedDiffMax,
        },
        noBleedOutsideFrameRing: ringLeakMetrics,
      },
      checkpoints: CHECKPOINTS,
      files,
      generatedAt: new Date().toISOString(),
      lightPositions: LIGHT_POSITIONS.map(({ label }) => label),
      note: [
        `Stage 7 ${ARTIFACT_PHASE} diagnostics.`,
        'Flat steel only: metalType steel, metalProfile flat. Main high-polish sheets use tarnish 0.',
        'The rust composition guard sheet uses polish 50/75/85/100 crossed with tarnish 0/45/80/100 under grazing light.',
        'False-color panels are diagnostics, not final material color.',
        'Substrate albedo is RGB; substrate height, AO, roughness, gloss, anisotropy/normals, active bodies, physical contributions, damage survival, light stability, and clipping guards are false-color diagnostics.',
        'Substrate-only shaded steel uses substrate maps with decals and tarnish disabled for inspection.',
        'Decals-disabled/enabled final sheets use the shared steel finish map and shader path.',
        'High-polish damage survival colors red for non-scratch physical contribution, blue for scratch physical contribution, and dim purple for active body without physical contribution.',
        'Light stability guard shows final shaded steel for all light positions plus substrate/decal map diffs between overhead and grazing.',
        'Red pixels in clipping guards indicate detected bleed outside the frame ring.',
        'Generated diagnostics do not store reference images and do not claim native Tauri visual acceptance.',
      ],
    }, null, 2),
  )
}

await mkdir(ARTIFACT_DIR, { recursive: true })

const packages = CHECKPOINTS.flatMap((metalPolish) =>
  LIGHT_POSITIONS.map(({ position }) =>
    createStage7Package({
      lightPosition: position,
      metalPolish,
    }),
  ),
)
const grazingPackages = CHECKPOINTS.map((metalPolish) =>
  createStage7Package({
    lightPosition: { x: DIAGONAL_EDGE_RADIUS, y: -DIAGONAL_EDGE_RADIUS },
    metalPolish,
  }),
)
const rustCompositionPackages =
  RUST_COMPOSITION_POLISH_CHECKPOINTS.flatMap((metalPolish) =>
    RUST_COMPOSITION_TARNISH_CHECKPOINTS.map((metalTarnish) =>
      createRustCompositionPackage({
        metalPolish,
        metalTarnish,
      }),
    ),
  )
const heightRange = getScalarRange(
  packages,
  (packageData) => packageData.substrateMaps.steelSubstrateHeight,
)
const aoRange = getScalarRange(
  packages,
  (packageData) => packageData.substrateMaps.steelSubstrateAmbientOcclusion,
)
const roughnessRange = getScalarRange(
  packages,
  (packageData) => packageData.substrateMaps.steelSubstrateRoughness,
)
const glossRange = getScalarRange(
  packages,
  (packageData) => packageData.substrateMaps.steelSubstrateGloss,
)
const files = [
  {
    fileName: 'substrate-only-shaded-steel-contact-sheet.png',
    panels: createPanelLabels('substrate-only shaded steel'),
  },
  {
    fileName: 'final-shaded-decals-disabled-contact-sheet.png',
    panels: createPanelLabels('final shaded steel with decals disabled'),
  },
  {
    fileName: 'final-shaded-decals-enabled-contact-sheet.png',
    panels: createPanelLabels('final shaded steel with decals enabled'),
  },
  {
    fileName: 'substrate-albedo-contact-sheet.png',
    panels: createPanelLabels('substrate albedo'),
  },
  {
    fileName: 'substrate-height-contact-sheet.png',
    panels: createPanelLabels('false-color substrate height'),
  },
  {
    fileName: 'substrate-ao-contact-sheet.png',
    panels: createPanelLabels('normalized false-color substrate AO'),
  },
  {
    fileName: 'substrate-roughness-contact-sheet.png',
    panels: createPanelLabels('false-color substrate roughness'),
  },
  {
    fileName: 'substrate-gloss-contact-sheet.png',
    panels: createPanelLabels('false-color substrate gloss'),
  },
  {
    fileName: 'substrate-anisotropy-normals-contact-sheet.png',
    panels: createPanelLabels(
      'false-color substrate anisotropy left half, normals right half',
    ),
  },
  {
    fileName: 'active-decal-body-maps-contact-sheet.png',
    panels: createPanelLabels('false-color active decal body maps'),
  },
  {
    fileName: 'active-physical-contribution-maps-contact-sheet.png',
    panels: createPanelLabels('false-color active physical contribution maps'),
  },
  {
    fileName: 'high-polish-damage-survival-contact-sheet.png',
    panels: createPanelLabels(
      'false-color high-polish damage survival: red non-scratch, blue scratch',
    ),
  },
  {
    fileName: 'light-stability-guard-contact-sheet.png',
    panels: CHECKPOINTS.flatMap((polish) => [
      ...LIGHT_POSITIONS.map(({ label }) => `${polish}% ${label} final shaded`),
      `${polish}% overhead/grazing substrate map diff`,
      `${polish}% overhead/grazing active decal map diff`,
    ]),
  },
  {
    fileName: 'frame-ring-clipping-guard-contact-sheet.png',
    panels: CHECKPOINTS.flatMap((polish) => [
      `${polish}% substrate bleed guard`,
      `${polish}% active decal bleed guard`,
      `${polish}% physical decal bleed guard`,
      `${polish}% self-shadow bleed guard`,
      `${polish}% decals-disabled alpha bleed guard`,
      `${polish}% decals-enabled alpha bleed guard`,
    ]),
  },
  {
    fileName: 'rust-composition-guard-contact-sheet.png',
    panels: RUST_COMPOSITION_POLISH_CHECKPOINTS.flatMap((polish) =>
      RUST_COMPOSITION_TARNISH_CHECKPOINTS.map((tarnish) =>
        `${polish}% polish, ${tarnish}% tarnish final shaded composition`,
      ),
    ),
  },
]

await drawImageContactSheet({
  accentColor: [112, 160, 220, 255],
  fileName: 'substrate-only-shaded-steel-contact-sheet.png',
  getImageData: (packageData) => packageData.substrateOnlyImageData,
  packages,
})
await drawImageContactSheet({
  accentColor: [164, 198, 170, 255],
  fileName: 'final-shaded-decals-disabled-contact-sheet.png',
  getImageData: (packageData) => packageData.noDecalSteel.imageData,
  packages,
})
await drawImageContactSheet({
  accentColor: [218, 196, 124, 255],
  fileName: 'final-shaded-decals-enabled-contact-sheet.png',
  getImageData: (packageData) => packageData.decalSteel.imageData,
  packages,
})
await drawMapContactSheet({
  accentColor: [112, 160, 220, 255],
  colorAt: albedoColor,
  fileName: 'substrate-albedo-contact-sheet.png',
  packages,
})
await drawMapContactSheet({
  accentColor: [120, 150, 210, 255],
  colorAt: (packageData, sourceIndex) =>
    heightColor(
      packageData.substrateMaps.steelSubstrateHeight[sourceIndex] ?? 0,
      heightRange,
    ),
  fileName: 'substrate-height-contact-sheet.png',
  packages,
})
await drawMapContactSheet({
  accentColor: [160, 132, 220, 255],
  colorAt: (packageData, sourceIndex) =>
    grayscaleColor(
      normalizeRange(
        packageData.substrateMaps.steelSubstrateAmbientOcclusion[sourceIndex] ??
          0,
        aoRange,
      ),
    ),
  fileName: 'substrate-ao-contact-sheet.png',
  packages,
})
await drawMapContactSheet({
  accentColor: [190, 150, 96, 255],
  colorAt: (packageData, sourceIndex) =>
    grayscaleColor(
      normalizeRange(
        packageData.substrateMaps.steelSubstrateRoughness[sourceIndex] ?? 0,
        roughnessRange,
      ),
    ),
  fileName: 'substrate-roughness-contact-sheet.png',
  packages,
})
await drawMapContactSheet({
  accentColor: [218, 196, 124, 255],
  colorAt: (packageData, sourceIndex) =>
    grayscaleColor(
      normalizeRange(
        packageData.substrateMaps.steelSubstrateGloss[sourceIndex] ?? 0,
        glossRange,
      ),
    ),
  fileName: 'substrate-gloss-contact-sheet.png',
  packages,
})
await drawMapContactSheet({
  accentColor: [126, 188, 180, 255],
  colorAt: anisotropyNormalColor,
  fileName: 'substrate-anisotropy-normals-contact-sheet.png',
  packages,
})
await drawMapContactSheet({
  accentColor: [86, 154, 202, 255],
  colorAt: getActiveBodyColor,
  fileName: 'active-decal-body-maps-contact-sheet.png',
  packages,
})
await drawMapContactSheet({
  accentColor: [190, 120, 92, 255],
  colorAt: getPhysicalContributionColor,
  fileName: 'active-physical-contribution-maps-contact-sheet.png',
  packages,
})
await drawMapContactSheet({
  accentColor: [220, 140, 88, 255],
  colorAt: getHighPolishDamageSurvivalColor,
  fileName: 'high-polish-damage-survival-contact-sheet.png',
  packages,
})
await drawLightStabilitySheet(packages)
await drawFrameRingClippingSheet(grazingPackages)
await drawRustCompositionGuardSheet(rustCompositionPackages)

const lightMapDiffMax = Math.max(
  ...CHECKPOINTS.map((_, index) => {
    const base = packages[index * LIGHT_POSITIONS.length]
    const maxForCheckpoint = LIGHT_POSITIONS.map((__, lightIndex) => {
      const compare = packages[index * LIGHT_POSITIONS.length + lightIndex]

      return Math.max(
        getSubstrateMapDiffMax(base, compare),
        getDecalMapDiffMax(base, compare),
      )
    })

    return Math.max(...maxForCheckpoint)
  }),
)
const lightShadedDiffMax = Math.max(
  ...CHECKPOINTS.map((_, index) => {
    const base = packages[index * LIGHT_POSITIONS.length]
    const maxForCheckpoint = LIGHT_POSITIONS.map((__, lightIndex) => {
      const compare = packages[index * LIGHT_POSITIONS.length + lightIndex]

      return maxImageRgbDiff(
        base.decalSteel.imageData,
        compare.decalSteel.imageData,
      )
    })

    return Math.max(...maxForCheckpoint)
  }),
)
const highPolishDamageMetrics = getHighPolishDamageMetrics(grazingPackages)
const ringLeakMetrics = Object.fromEntries(
  grazingPackages.flatMap((packageData) => {
    const prefix = `${packageData.metalPolish}%`
    const metrics = getRingLeakMetrics(packageData)

    return Object.entries(metrics).map(([key, value]) => [`${prefix}:${key}`, value])
  }),
)

await writeManifest({
  files,
  highPolishDamageMetrics,
  lightMapDiffMax,
  lightShadedDiffMax,
  ringLeakMetrics,
})

for (const { fileName } of files) {
  console.log(path.join(ARTIFACT_DIR, fileName))
}
