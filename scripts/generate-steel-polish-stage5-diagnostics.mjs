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
import {
  buildArtworkFrameMaterialHeightSelfShadowMap,
} from '../src/render/artworkFrameMaterialSelfShadow.ts'
import { buildMetalArtworkFrameMaterialPlan } from '../src/render/artworkFrameMaterialPlan.ts'
import {
  createArtworkFrameMaterialShadingCoordinateContext,
} from '../src/render/artworkFrameMaterialShading.ts'
import {
  ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS,
  ARTWORK_FRAME_STEEL_DEFECT_KINDS,
  activateArtworkFrameSteelDefectActiveBodyMaps,
  createArtworkFrameSteelDefectPlacementSet,
  populateArtworkFrameSteelDefectPhysicalContributionMaps,
  rasterizeArtworkFrameSteelDefectStablePlacementMaps,
} from '../src/render/artworkFrameSteelDefects.ts'
import {
  buildArtworkFrameSteelFinishDerivedMaps,
  buildArtworkFrameSteelFinishField,
  buildArtworkFrameSteelFinishNormalInputs,
  shadeArtworkFrameSteelFinishImageData,
} from '../src/render/artworkFrameSteelFinish.ts'

const ARTIFACT_DIR = path.join(
  process.cwd(),
  'artifacts',
  'steel-polish-stage5',
)
const CHECKPOINTS = [0, 10, 25, 30, 50, 75, 100]
const DEFAULT_BOUNDS = { height: 96, width: 128, x: 0, y: 0 }
const MAP_HEIGHT = 214
const MAP_WIDTH = 300
const PANEL_GUTTER = 18
const PANEL_HEIGHT = 214
const PANEL_WIDTH = 300
const SHEET_MARGIN = 24
const KIND_COLORS = {
  burrNick: [230, 224, 172],
  dent: [164, 206, 255],
  gouge: [255, 136, 88],
  pit: [200, 175, 255],
  scratch: [226, 241, 255],
  scuff: [184, 232, 175],
}
const LIGHT_POSITIONS = [
  { label: 'center', position: { x: 0, y: 0 } },
  { label: 'bottom-left', position: { x: -1, y: -1 } },
  { label: 'bottom-right', position: { x: 1, y: -1 } },
  { label: 'top-left', position: { x: -1, y: 1 } },
  { label: 'top-right', position: { x: 1, y: 1 } },
]

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value))
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
    const x = index % width
    const y = Math.floor(index / width)
    const dataIndex = index * 4

    data[dataIndex] = 116 + Math.round((x / Math.max(1, width - 1)) * 42)
    data[dataIndex + 1] = 124 + Math.round((y / Math.max(1, height - 1)) * 34)
    data[dataIndex + 2] = 128 + Math.round(
      ((x + y) / Math.max(1, width + height - 2)) * 24,
    )
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

function isInsideDefaultFrameRing(x, y) {
  const inLeft = x >= 0 && x <= 0.18 && y >= 0 && y <= 1
  const inRight = x >= 0.82 && x <= 1 && y >= 0 && y <= 1
  const inTop = x >= 0.18 && x <= 0.82 && y >= 0 && y <= 0.18
  const inBottom = x >= 0.18 && x <= 0.82 && y >= 0.82 && y <= 1

  return inLeft || inRight || inTop || inBottom
}

function createDefaultFrameRingMask(width, height) {
  const mask = new Float32Array(width * height)

  for (let y = 0; y < height; y += 1) {
    const normalizedY = (y + 0.5) / height

    for (let x = 0; x < width; x += 1) {
      const normalizedX = (x + 0.5) / width
      mask[y * width + x] = isInsideDefaultFrameRing(normalizedX, normalizedY)
        ? 1
        : 0
    }
  }

  return mask
}

function getBrushDirection(angleDegrees) {
  const radians = (angleDegrees * Math.PI) / 180

  return {
    angleDegrees,
    tangentX: Math.cos(radians),
    tangentY: Math.sin(radians),
  }
}

function createDiagnosticFrame({ metalPolish = 30 } = {}) {
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
    metalTarnish: 0,
    metalType: 'steel',
    roughnessOffset: 0,
    shape: 'rectangle',
    style: 'metal',
    width: 8,
  }
}

function createPhysicalContributionPackage({
  bounds = DEFAULT_BOUNDS,
  lightPosition = { x: 0, y: 0 },
  materialSeedKey = 'stage5-diagnostic-image-a',
  materialSeed32 = 0x7a8b9cad,
  metalPolish = 30,
  metalTarnish = 0,
} = {}) {
  const frame = {
    ...createDiagnosticFrame({ metalPolish }),
    metalTarnish,
  }
  const strokeWidth = getArtworkFrameStrokeWidth(
    frame,
    bounds.width,
    bounds.height,
  )
  const pathData = createMetalArtworkFramePathData(frame, bounds, strokeWidth)
  const plan = buildMetalArtworkFrameMaterialPlan({
    bounds,
    clipPathData: pathData,
    frame,
    lightVector: createArtworkFrameMaterialHemisphereLightVector(lightPosition),
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

  const placementSet = createArtworkFrameSteelDefectPlacementSet({
    brushDirection: getBrushDirection(frame.metalBrushAngle),
    frameRingCoordinates: {
      coordinateSpace: 'canonical-frame-ring-v1',
      frameShape: frame.shape,
      frameStyle: frame.style,
      ringKey: 'flat-rectangle-inner-outer-ring-v1',
    },
    geometrySeedKey: plan.canvasTexture.steelFinishFieldRequest.geometrySeedKey,
    materialIdentity: {
      metalType: frame.metalType,
    },
  })
  const frameMask = createDefaultFrameRingMask(MAP_WIDTH, MAP_HEIGHT)
  const maps = rasterizeArtworkFrameSteelDefectStablePlacementMaps({
    frameMask,
    heightPixels: MAP_HEIGHT,
    placementSet,
    widthPixels: MAP_WIDTH,
  })

  activateArtworkFrameSteelDefectActiveBodyMaps({
    defectDecalMaps: maps,
    frameMask,
    metalPolish,
  })
  populateArtworkFrameSteelDefectPhysicalContributionMaps({
    defectDecalMaps: maps,
    frameMask,
    metalPolish,
  })

  return { frameMask, maps }
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

function createFinalShadedPackage({
  bounds = DEFAULT_BOUNDS,
  lightPosition = { x: 0, y: 0 },
  materialSeedKey = 'stage5-diagnostic-image-a',
  materialSeed32 = 0x7a8b9cad,
  metalPolish = 50,
  metalTarnish = 0,
} = {}) {
  const frame = {
    ...createDiagnosticFrame({ metalPolish }),
    metalTarnish,
  }
  const lightVector = createArtworkFrameMaterialHemisphereLightVector(
    lightPosition,
  )
  const strokeWidth = getArtworkFrameStrokeWidth(
    frame,
    bounds.width,
    bounds.height,
  )
  const pathData = createMetalArtworkFramePathData(frame, bounds, strokeWidth)
  const plan = buildMetalArtworkFrameMaterialPlan({
    bounds,
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
    throw new Error('Expected a steel finish field request for shaded diagnostics.')
  }

  const texture = plan.canvasTexture
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
  const normalInputs = buildArtworkFrameSteelFinishNormalInputs(steelFinishMaps)
  const selfShadowMap = buildArtworkFrameMaterialHeightSelfShadowMap({
    heightMap: normalInputs.steelHeight,
    heightPixels: normalInputs.heightPixels,
    lightVector,
    maskMap: steelFinishMaps.steelMetalness,
    strength: 1,
    widthPixels: normalInputs.widthPixels,
  })
  const coordinates = createArtworkFrameMaterialShadingCoordinateContext(texture)
  const baseImageData = createImageData(
    steelFinishMaps.widthPixels,
    steelFinishMaps.heightPixels,
  )
  const steelImageData = shadeArtworkFrameSteelFinishImageData(
    cloneImageData(baseImageData),
    {
      coordinates,
      lightVector,
      metalBrushAngle: frame.metalBrushAngle,
      normalInputs,
      steelFinishMaps,
    },
  )
  let corrosionMaps = null
  let imageData = steelImageData

  if (texture.corrosionFieldRequest) {
    corrosionMaps = buildArtworkFrameCorrosionDerivedMaps(
      buildArtworkFrameCorrosionField(texture.corrosionFieldRequest),
    )
    imageData = shadeArtworkFrameCorrosionImageData(
      steelImageData,
      corrosionMaps,
      {
        coordinates,
        lightVector,
        steelFinishMaps,
      },
    )
  }

  return {
    corrosionMaps,
    defectDecalMaps,
    imageData,
    lightVector,
    selfShadowMap,
    steelFinishMaps,
    texture,
  }
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

function getPhysicalCombined(maps, index, kinds) {
  const channels = [
    'height',
    'ambientOcclusion',
    'rimLight',
    'rimShadow',
    'selfShadowReceiver',
    'roughnessResponse',
    'glossResponse',
  ]
  let maxKind = kinds[0]
  let maxValue = 0

  for (const kind of kinds) {
    let kindValue = 0

    for (const channel of channels) {
      kindValue = Math.max(
        kindValue,
        maps.physicalContributions[kind][channel][index] ?? 0,
      )
    }

    if (kindValue > maxValue) {
      maxKind = kind
      maxValue = kindValue
    }
  }

  return { kind: maxKind, value: maxValue }
}

function colorFromKind(kind, value, fallback = [18, 24, 28, 255]) {
  if (value <= 0) {
    return fallback
  }

  const color = KIND_COLORS[kind] ?? [255, 255, 255]
  const intensity = clampNumber(value, 0, 1)

  return [
    Math.round(color[0] * intensity),
    Math.round(color[1] * intensity),
    Math.round(color[2] * intensity),
    255,
  ]
}

function getZeroGuardValue(maps, index) {
  let value = 0

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    for (const channel of [
      'height',
      'ambientOcclusion',
      'rimLight',
      'rimShadow',
      'selfShadowReceiver',
      'roughnessResponse',
      'glossResponse',
      'albedoResponse',
      'normalStrength',
    ]) {
      value = Math.max(
        value,
        Math.abs(maps.physicalContributions[kind][channel][index] ?? 0),
      )
    }
  }

  return value
}

function getPanelColor(options, sourceIndex) {
  const { channel, kinds, maps, mode } = options

  if (mode === 'active') {
    const active = getMaxForKinds(
      maps,
      'activeBodies',
      channel ?? 'bodyMask',
      sourceIndex,
      kinds,
    )

    return colorFromKind(active.kind, active.value)
  }

  if (mode === 'combinedPhysical') {
    const physical = getPhysicalCombined(maps, sourceIndex, kinds)

    return colorFromKind(physical.kind, physical.value)
  }

  if (mode === 'physical') {
    const physical = getMaxForKinds(
      maps,
      'physicalContributions',
      channel ?? 'height',
      sourceIndex,
      kinds,
    )

    return colorFromKind(physical.kind, physical.value)
  }

  if (mode === 'zeroGuard') {
    return getZeroGuardValue(maps, sourceIndex) > 0
      ? [255, 40, 40, 255]
      : [5, 8, 10, 255]
  }

  return [18, 24, 28, 255]
}

function drawPanelBorder(sheet, origin, accentColor) {
  fillRect(sheet, origin.x - 1, origin.y - 1, PANEL_WIDTH + 2, 1, [83, 97, 106, 255])
  fillRect(sheet, origin.x - 1, origin.y + PANEL_HEIGHT, PANEL_WIDTH + 2, 1, [83, 97, 106, 255])
  fillRect(sheet, origin.x - 1, origin.y - 1, 1, PANEL_HEIGHT + 2, [83, 97, 106, 255])
  fillRect(sheet, origin.x + PANEL_WIDTH, origin.y - 1, 1, PANEL_HEIGHT + 2, [83, 97, 106, 255])
  fillRect(sheet, origin.x, origin.y, PANEL_WIDTH, 5, accentColor)
}

function drawMapPanel(sheet, column, row, options) {
  const origin = getPanelOrigin(column, row)
  const accentColor = options.accentColor ?? [86, 154, 202, 255]

  for (let y = 0; y < PANEL_HEIGHT; y += 1) {
    const sourceY = clampNumber(
      Math.floor((y / PANEL_HEIGHT) * MAP_HEIGHT),
      0,
      MAP_HEIGHT - 1,
    )

    for (let x = 0; x < PANEL_WIDTH; x += 1) {
      const sourceX = clampNumber(
        Math.floor((x / PANEL_WIDTH) * MAP_WIDTH),
        0,
        MAP_WIDTH - 1,
      )
      const sourceIndex = sourceY * MAP_WIDTH + sourceX

      if ((options.frameMask[sourceIndex] ?? 0) <= 0) {
        setPixel(sheet, origin.x + x, origin.y + y, [5, 8, 10, 255])
        continue
      }

      setPixel(
        sheet,
        origin.x + x,
        origin.y + y,
        getPanelColor(options, sourceIndex),
      )
    }
  }

  drawPanelBorder(sheet, origin, accentColor)
}

function drawImageDataPanel(sheet, column, row, packageData, accentColor) {
  const origin = getPanelOrigin(column, row)
  const { imageData } = packageData

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

function getAnyActiveBody(maps, index) {
  let value = 0

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    for (const channel of ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS) {
      value = Math.max(value, maps.activeBodies[kind][channel][index] ?? 0)
    }
  }

  return value
}

function getAnyPhysicalContribution(maps, index) {
  let value = 0

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    for (const channel of [
      'height',
      'ambientOcclusion',
      'rimLight',
      'rimShadow',
      'selfShadowReceiver',
      'roughnessResponse',
      'glossResponse',
      'albedoResponse',
      'normalStrength',
    ]) {
      value = Math.max(
        value,
        Math.abs(maps.physicalContributions[kind][channel][index] ?? 0),
      )
    }
  }

  return value
}

function getRustPresence(packageData, index) {
  const maps = packageData.corrosionMaps

  if (!maps) {
    return 0
  }

  return clampNumber(
    (maps.poreMask[index] ?? 0) * 0.4 +
      (maps.crackMask[index] ?? 0) * 0.35 +
      (maps.flakeMask[index] ?? 0) * 0.35 +
      (maps.flakeLipMask[index] ?? 0) * 0.35 +
      (maps.ambientOcclusion[index] ?? 0) * 0.4,
    0,
    1,
  )
}

function getClipGuardValue(packageData, mode, sourceIndex) {
  if (mode === 'active') {
    return getAnyActiveBody(packageData.defectDecalMaps, sourceIndex)
  }

  if (mode === 'physical') {
    return getAnyPhysicalContribution(packageData.defectDecalMaps, sourceIndex)
  }

  if (mode === 'selfShadow') {
    return packageData.selfShadowMap[sourceIndex] ?? 0
  }

  if (mode === 'rust') {
    return getRustPresence(packageData, sourceIndex)
  }

  if (mode === 'finalAlpha') {
    return ((packageData.imageData.data[sourceIndex * 4 + 3] ?? 0) / 255)
  }

  return packageData.steelFinishMaps.steelMetalness[sourceIndex] ?? 0
}

function drawClipGuardPanel(sheet, column, row, packageData, mode, accentColor) {
  const origin = getPanelOrigin(column, row)
  const width = packageData.steelFinishMaps.widthPixels
  const height = packageData.steelFinishMaps.heightPixels

  for (let y = 0; y < PANEL_HEIGHT; y += 1) {
    const sourceY = clampNumber(
      Math.floor((y / PANEL_HEIGHT) * height),
      0,
      height - 1,
    )

    for (let x = 0; x < PANEL_WIDTH; x += 1) {
      const sourceX = clampNumber(
        Math.floor((x / PANEL_WIDTH) * width),
        0,
        width - 1,
      )
      const sourceIndex = sourceY * width + sourceX
      const frameMask = packageData.steelFinishMaps.steelMetalness[sourceIndex] ?? 0
      const value = getClipGuardValue(packageData, mode, sourceIndex)

      if (frameMask <= 0 && value > 0.000001) {
        setPixel(sheet, origin.x + x, origin.y + y, [255, 32, 32, 255])
        continue
      }

      if (frameMask > 0 && value > 0.000001) {
        setPixel(
          sheet,
          origin.x + x,
          origin.y + y,
          mode === 'selfShadow'
            ? [160, 110, 255, 255]
            : [80, 150, 120, 255],
        )
        continue
      }

      setPixel(
        sheet,
        origin.x + x,
        origin.y + y,
        frameMask > 0 ? [26, 34, 38, 255] : [5, 8, 10, 255],
      )
    }
  }

  drawPanelBorder(sheet, origin, accentColor)
}

function panel(packageData, mode, channel, kinds, accentColor) {
  return {
    accentColor,
    channel,
    frameMask: packageData.frameMask,
    kinds,
    maps: packageData.maps,
    mode,
  }
}

function drawContactSheet({ fileName, panels }) {
  const columns = Math.min(4, Math.max(1, panels.length))
  const rows = Math.ceil(panels.length / columns)
  const sheet = createSheet(columns, rows)

  for (const [index, panelData] of panels.entries()) {
    drawMapPanel(
      sheet,
      index % columns,
      Math.floor(index / columns),
      panelData,
    )
  }

  return writePng(path.join(ARTIFACT_DIR, fileName), sheet)
}

function drawShadedContactSheet({ fileName, packages }) {
  const columns = Math.min(4, Math.max(1, packages.length))
  const rows = Math.ceil(packages.length / columns)
  const sheet = createSheet(columns, rows)

  for (const [index, packageData] of packages.entries()) {
    drawImageDataPanel(
      sheet,
      index % columns,
      Math.floor(index / columns),
      packageData,
      [182, 200, 210, 255],
    )
  }

  return writePng(path.join(ARTIFACT_DIR, fileName), sheet)
}

function drawClippingContactSheet({ fileName, panels }) {
  const columns = Math.min(4, Math.max(1, panels.length))
  const rows = Math.ceil(panels.length / columns)
  const sheet = createSheet(columns, rows)

  for (const [index, panelData] of panels.entries()) {
    drawClipGuardPanel(
      sheet,
      index % columns,
      Math.floor(index / columns),
      panelData.packageData,
      panelData.mode,
      panelData.accentColor,
    )
  }

  return writePng(path.join(ARTIFACT_DIR, fileName), sheet)
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
    raw[rawOffset] = 0
    Buffer.from(
      image.data.buffer,
      y * image.width * 4,
      image.width * 4,
    ).copy(raw, rawOffset + 1)
  }

  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ])

  await writeFile(filePath, png)
}

async function writeManifest(files) {
  await writeFile(
    path.join(ARTIFACT_DIR, 'stage5-diagnostic-package-manifest.json'),
    JSON.stringify({
      files,
      generatedAt: new Date().toISOString(),
      note: [
        'Diagnostic Stage 5 visual package.',
        'Panels include false-color active body maps, active physical contribution maps, final shaded steel diagnostics, stability checks, inactive-zero guards, and frame-ring clipping guards.',
        'Final shaded steel panels are generated from Stage 5 active decal physical contribution maps, not legacy transition masks.',
        'Red pixels in guard sheets indicate detected bleed outside the frame ring; dark outside-frame regions indicate no bleed.',
        'These generated assets do not claim native Tauri visual acceptance.',
      ],
    }, null, 2),
  )
}

await mkdir(ARTIFACT_DIR, { recursive: true })

const checkpointPackages = Object.fromEntries(
  CHECKPOINTS.map((polish) => [
    polish,
    createPhysicalContributionPackage({ metalPolish: polish }),
  ]),
)
const active0 = checkpointPackages[0]
const finalPolishPackages = CHECKPOINTS.map((polish) =>
  createFinalShadedPackage({
    metalPolish: polish,
    metalTarnish: 0,
  }),
)
const lightPhysicalPackages = LIGHT_POSITIONS.map(({ position }) =>
  createPhysicalContributionPackage({
    lightPosition: position,
    metalPolish: 50,
    metalTarnish: 0,
  }),
)
const lightFinalPackages = LIGHT_POSITIONS.map(({ position }) =>
  createFinalShadedPackage({
    lightPosition: position,
    metalPolish: 50,
    metalTarnish: 0,
  }),
)
const tarnishPhysicalPackages = [0, 50, 100].map((metalTarnish) =>
  createPhysicalContributionPackage({
    metalPolish: 50,
    metalTarnish,
  }),
)
const tarnishFinalPackages = [0, 50, 100].map((metalTarnish) =>
  createFinalShadedPackage({
    metalPolish: 50,
    metalTarnish,
  }),
)
const clippingClean = createFinalShadedPackage({
  lightPosition: { x: 1, y: -1 },
  metalPolish: 0,
  metalTarnish: 0,
})
const clippingRusted = createFinalShadedPackage({
  lightPosition: { x: 1, y: -1 },
  metalPolish: 50,
  metalTarnish: 100,
})
const files = [
  {
    fileName: 'polish-checkpoint-active-body-contact-sheet.png',
    panels: CHECKPOINTS.map((polish) => `${polish}% active bodyMask`),
  },
  {
    fileName: 'polish-checkpoint-physical-contribution-contact-sheet.png',
    panels: CHECKPOINTS.map(
      (polish) => `${polish}% combined physical contribution`,
    ),
  },
  {
    fileName: 'final-shaded-polish-checkpoint-contact-sheet.png',
    panels: CHECKPOINTS.map((polish) => `${polish}% final shaded steel`),
  },
  {
    fileName: 'same-seed-light-final-shaded-contact-sheet.png',
    panels: LIGHT_POSITIONS.map(({ label }) => `${label} light final shaded steel`),
  },
  {
    fileName: 'same-seed-light-physical-stability-contact-sheet.png',
    panels: LIGHT_POSITIONS.map(({ label }) => `${label} light physical maps`),
  },
  {
    fileName: 'same-seed-tarnish-final-shaded-contact-sheet.png',
    panels: [
      'tarnish 0 final shaded steel',
      'tarnish 50 final shaded steel',
      'tarnish 100 final shaded steel',
    ],
  },
  {
    fileName: 'same-seed-tarnish-physical-stability-contact-sheet.png',
    panels: [
      'tarnish 0 physical maps',
      'tarnish 50 physical maps',
      'tarnish 100 physical maps',
    ],
  },
  ...ARTWORK_FRAME_STEEL_DEFECT_KINDS.map((kind) => ({
    fileName: `${kind}-physical-contribution-contact-sheet.png`,
    panels: [
      `${kind} presenceMask`,
      `${kind} bodyMask`,
      `${kind} coreMask`,
      `${kind} edgeMask`,
      `${kind} height`,
      `${kind} ambientOcclusion`,
      `${kind} rimLight`,
      `${kind} rimShadow`,
      `${kind} selfShadowReceiver`,
      `${kind} roughnessResponse`,
      `${kind} glossResponse`,
    ],
  })),
  {
    fileName: 'roughness-gloss-response-by-kind-contact-sheet.png',
    panels: ARTWORK_FRAME_STEEL_DEFECT_KINDS.flatMap((kind) => [
      `${kind} roughnessResponse`,
      `${kind} glossResponse`,
    ]),
  },
  {
    fileName: 'inactive-zero-guard-contact-sheet.png',
    panels: [
      '100% active body zero guard',
      '100% physical contribution zero guard',
      '0% active body reference',
      '0% physical contribution reference',
    ],
  },
  {
    fileName: 'frame-ring-clipping-guard-contact-sheet.png',
    panels: [
      'clean active decal bleed guard',
      'clean physical contribution bleed guard',
      'clean self-shadow bleed guard',
      'clean final alpha bleed guard',
      'rusted corrosion bleed guard',
      'rusted final alpha bleed guard',
    ],
  },
]

await drawContactSheet({
  fileName: 'polish-checkpoint-active-body-contact-sheet.png',
  panels: CHECKPOINTS.map((polish) =>
    panel(
      checkpointPackages[polish],
      'active',
      'bodyMask',
      ARTWORK_FRAME_STEEL_DEFECT_KINDS,
      [86, 154, 202, 255],
    ),
  ),
})
await drawContactSheet({
  fileName: 'polish-checkpoint-physical-contribution-contact-sheet.png',
  panels: CHECKPOINTS.map((polish) =>
    panel(
      checkpointPackages[polish],
      'combinedPhysical',
      'height',
      ARTWORK_FRAME_STEEL_DEFECT_KINDS,
      [190, 120, 92, 255],
    ),
  ),
})
await drawShadedContactSheet({
  fileName: 'final-shaded-polish-checkpoint-contact-sheet.png',
  packages: finalPolishPackages,
})
await drawShadedContactSheet({
  fileName: 'same-seed-light-final-shaded-contact-sheet.png',
  packages: lightFinalPackages,
})
await drawContactSheet({
  fileName: 'same-seed-light-physical-stability-contact-sheet.png',
  panels: lightPhysicalPackages.map((packageData) =>
    panel(
      packageData,
      'combinedPhysical',
      'height',
      ARTWORK_FRAME_STEEL_DEFECT_KINDS,
      [190, 120, 92, 255],
    ),
  ),
})
await drawShadedContactSheet({
  fileName: 'same-seed-tarnish-final-shaded-contact-sheet.png',
  packages: tarnishFinalPackages,
})
await drawContactSheet({
  fileName: 'same-seed-tarnish-physical-stability-contact-sheet.png',
  panels: tarnishPhysicalPackages.map((packageData) =>
    panel(
      packageData,
      'combinedPhysical',
      'height',
      ARTWORK_FRAME_STEEL_DEFECT_KINDS,
      [190, 120, 92, 255],
    ),
  ),
})

for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
  const accent = KIND_COLORS[kind] ?? [255, 255, 255, 255]

  await drawContactSheet({
    fileName: `${kind}-physical-contribution-contact-sheet.png`,
    panels: [
      panel(active0, 'active', 'presenceMask', [kind], accent),
      panel(active0, 'active', 'bodyMask', [kind], accent),
      panel(active0, 'active', 'coreMask', [kind], accent),
      panel(active0, 'active', 'edgeMask', [kind], accent),
      panel(active0, 'physical', 'height', [kind], accent),
      panel(active0, 'physical', 'ambientOcclusion', [kind], accent),
      panel(active0, 'physical', 'rimLight', [kind], accent),
      panel(active0, 'physical', 'rimShadow', [kind], accent),
      panel(active0, 'physical', 'selfShadowReceiver', [kind], accent),
      panel(active0, 'physical', 'roughnessResponse', [kind], accent),
      panel(active0, 'physical', 'glossResponse', [kind], accent),
    ],
  })
}

await drawContactSheet({
  fileName: 'roughness-gloss-response-by-kind-contact-sheet.png',
  panels: ARTWORK_FRAME_STEEL_DEFECT_KINDS.flatMap((kind) => {
    const accent = KIND_COLORS[kind] ?? [255, 255, 255, 255]

    return [
      panel(active0, 'physical', 'roughnessResponse', [kind], accent),
      panel(active0, 'physical', 'glossResponse', [kind], accent),
    ]
  }),
})
await drawContactSheet({
  fileName: 'inactive-zero-guard-contact-sheet.png',
  panels: [
    panel(
      checkpointPackages[100],
      'active',
      'bodyMask',
      ARTWORK_FRAME_STEEL_DEFECT_KINDS,
      [86, 154, 202, 255],
    ),
    panel(
      checkpointPackages[100],
      'zeroGuard',
      'height',
      ARTWORK_FRAME_STEEL_DEFECT_KINDS,
      [230, 80, 80, 255],
    ),
    panel(
      checkpointPackages[0],
      'active',
      'bodyMask',
      ARTWORK_FRAME_STEEL_DEFECT_KINDS,
      [86, 154, 202, 255],
    ),
    panel(
      checkpointPackages[0],
      'combinedPhysical',
      'height',
      ARTWORK_FRAME_STEEL_DEFECT_KINDS,
      [190, 120, 92, 255],
    ),
  ],
})
await drawClippingContactSheet({
  fileName: 'frame-ring-clipping-guard-contact-sheet.png',
  panels: [
    {
      accentColor: [86, 154, 202, 255],
      mode: 'active',
      packageData: clippingClean,
    },
    {
      accentColor: [190, 120, 92, 255],
      mode: 'physical',
      packageData: clippingClean,
    },
    {
      accentColor: [160, 110, 255, 255],
      mode: 'selfShadow',
      packageData: clippingClean,
    },
    {
      accentColor: [182, 200, 210, 255],
      mode: 'finalAlpha',
      packageData: clippingClean,
    },
    {
      accentColor: [198, 102, 48, 255],
      mode: 'rust',
      packageData: clippingRusted,
    },
    {
      accentColor: [182, 200, 210, 255],
      mode: 'finalAlpha',
      packageData: clippingRusted,
    },
  ],
})
await writeManifest(files)

for (const { fileName } of files) {
  console.log(path.join(ARTIFACT_DIR, fileName))
}
