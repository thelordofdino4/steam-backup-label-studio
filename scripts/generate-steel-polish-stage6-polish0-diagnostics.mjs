import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { deflateSync, inflateSync } from 'node:zlib'
import {
  createMetalArtworkFramePathData,
  getArtworkFrameStrokeWidth,
} from '../src/render/artworkFrame.ts'
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
  getArtworkFrameSteelFinishSelfShadowReceiver,
  shadeArtworkFrameSteelFinishImageData,
} from '../src/render/artworkFrameSteelFinish.ts'

const ARTIFACT_DIR = path.join(
  process.cwd(),
  'artifacts',
  'steel-polish-stage6',
  'after',
)
const BEFORE_ARTIFACT_DIR = path.join(
  process.cwd(),
  'artifacts',
  'steel-polish-stage6',
  'before',
)
const LOW_POLISH_CHECKPOINTS = [0, 10, 25, 30, 50]
const POLISH10_COMPARISON_CHECKPOINTS = [0, 10, 25]
const POLISH25_COMPARISON_CHECKPOINTS = [10, 25, 30, 50]
const POLISH30_COMPARISON_CHECKPOINTS = [25, 30, 50]
const TARNISH_STABILITY_CHECKPOINTS = [0, 50, 100]
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
    const xUnit = x / Math.max(1, width - 1)
    const yUnit = y / Math.max(1, height - 1)

    data[dataIndex] = 118 + Math.round(xUnit * 36)
    data[dataIndex + 1] = 123 + Math.round(yUnit * 32)
    data[dataIndex + 2] = 128 + Math.round(((xUnit + yUnit) / 2) * 28)
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

function getBrushDirection(angleDegrees) {
  const radians = (angleDegrees * Math.PI) / 180

  return {
    angleDegrees,
    tangentX: Math.cos(radians),
    tangentY: Math.sin(radians),
  }
}

function createDiagnosticFrame(metalPolish = 0, metalTarnish = 0) {
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

function createPolishPackage(lightPosition, metalPolish = 0, metalTarnish = 0) {
  const frame = createDiagnosticFrame(metalPolish, metalTarnish)
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
      key: 'stage6-polish0-diagnostic-image-a',
      seed32: 0x3f6a9d21,
    },
    pathData,
    strokeWidth,
  })

  if (!plan.canvasTexture?.steelFinishFieldRequest) {
    throw new Error('Expected a steel finish field request for diagnostics.')
  }

  const texture = plan.canvasTexture
  const steelField = buildArtworkFrameSteelFinishField(
    texture.steelFinishFieldRequest,
  )
  const placementSet = createArtworkFrameSteelDefectPlacementSet({
    brushDirection: getBrushDirection(steelField.brushAngleDegrees),
    frameRingCoordinates: {
      coordinateSpace: 'canonical-frame-ring-v1',
      frameShape: steelField.geometryInputs.shape,
      frameStyle: steelField.geometryInputs.style,
      ringKey: 'flat-rectangle-inner-outer-ring-v1',
    },
    geometrySeedKey: steelField.geometrySeedKey,
    materialIdentity: {
      metalType: steelField.geometryInputs.metalType,
    },
  })
  const defectDecalMaps = rasterizeArtworkFrameSteelDefectStablePlacementMaps({
    frameMask: steelField.fields.frameMask,
    heightPixels: steelField.fieldSize.height,
    placementSet,
    widthPixels: steelField.fieldSize.width,
  })

  activateArtworkFrameSteelDefectActiveBodyMaps({
    defectDecalMaps,
    frameMask: steelField.fields.frameMask,
    metalPolish,
  })
  populateArtworkFrameSteelDefectPhysicalContributionMaps({
    defectDecalMaps,
    frameMask: steelField.fields.frameMask,
    metalPolish,
  })

  const steelFinishMaps = buildArtworkFrameSteelFinishDerivedMaps(
    steelField,
    { defectDecalMaps },
  )
  const normalInputs = buildArtworkFrameSteelFinishNormalInputs(steelFinishMaps)
  const heightSelfShadowMap = buildArtworkFrameMaterialHeightSelfShadowMap({
    heightMap: normalInputs.steelHeight,
    heightPixels: normalInputs.heightPixels,
    lightVector,
    maskMap: steelFinishMaps.steelMetalness,
    maxSteps: 4,
    strength: 0.32,
    widthPixels: normalInputs.widthPixels,
  })
  const coordinates = createArtworkFrameMaterialShadingCoordinateContext(texture)
  const imageData = shadeArtworkFrameSteelFinishImageData(
    cloneImageData(createImageData(
      steelFinishMaps.widthPixels,
      steelFinishMaps.heightPixels,
    )),
    {
      coordinates,
      lightVector,
      metalBrushAngle: frame.metalBrushAngle,
      normalInputs,
      steelFinishMaps,
    },
  )

  return {
    defectDecalMaps,
    heightSelfShadowMap,
    imageData,
    metalPolish,
    metalTarnish,
    steelFinishMaps,
  }
}

function getMaxForKinds(maps, mapFamily, channel, index) {
  let maxKind = ARTWORK_FRAME_STEEL_DEFECT_KINDS[0]
  let maxValue = 0

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    const value = maps[mapFamily][kind][channel][index] ?? 0

    if (value > maxValue) {
      maxKind = kind
      maxValue = value
    }
  }

  return { kind: maxKind, value: maxValue }
}

function getPhysicalCombined(maps, index) {
  let maxKind = ARTWORK_FRAME_STEEL_DEFECT_KINDS[0]
  let maxValue = 0

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    let kindValue = 0

    for (const channel of ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS) {
      kindValue = Math.max(
        kindValue,
        Math.abs(maps.physicalContributions[kind][channel][index] ?? 0),
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

function drawPanelBorder(sheet, origin, accentColor) {
  fillRect(sheet, origin.x - 1, origin.y - 1, PANEL_WIDTH + 2, 1, [83, 97, 106, 255])
  fillRect(sheet, origin.x - 1, origin.y + PANEL_HEIGHT, PANEL_WIDTH + 2, 1, [83, 97, 106, 255])
  fillRect(sheet, origin.x - 1, origin.y - 1, 1, PANEL_HEIGHT + 2, [83, 97, 106, 255])
  fillRect(sheet, origin.x + PANEL_WIDTH, origin.y - 1, 1, PANEL_HEIGHT + 2, [83, 97, 106, 255])
  fillRect(sheet, origin.x, origin.y, PANEL_WIDTH, 5, accentColor)
}

function drawMapPanel(sheet, column, row, packageData, mode, accentColor) {
  const origin = getPanelOrigin(column, row)
  const { defectDecalMaps, steelFinishMaps } = packageData

  for (let y = 0; y < PANEL_HEIGHT; y += 1) {
    const sourceY = clampNumber(
      Math.floor((y / PANEL_HEIGHT) * steelFinishMaps.heightPixels),
      0,
      steelFinishMaps.heightPixels - 1,
    )

    for (let x = 0; x < PANEL_WIDTH; x += 1) {
      const sourceX = clampNumber(
        Math.floor((x / PANEL_WIDTH) * steelFinishMaps.widthPixels),
        0,
        steelFinishMaps.widthPixels - 1,
      )
      const sourceIndex = sourceY * steelFinishMaps.widthPixels + sourceX

      if ((steelFinishMaps.steelMetalness[sourceIndex] ?? 0) <= 0) {
        setPixel(sheet, origin.x + x, origin.y + y, [5, 8, 10, 255])
        continue
      }

      const response = mode === 'active'
        ? getMaxForKinds(
          defectDecalMaps,
          'activeBodies',
          'bodyMask',
          sourceIndex,
        )
        : getPhysicalCombined(defectDecalMaps, sourceIndex)

      setPixel(
        sheet,
        origin.x + x,
        origin.y + y,
        colorFromKind(response.kind, response.value),
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

function drawZeroGuardPanel(sheet, column, row, options) {
  const origin = getPanelOrigin(column, row)
  const { kinds, mode, packageData } = options
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

      if ((packageData.steelFinishMaps.steelMetalness[sourceIndex] ?? 0) <= 0) {
        setPixel(sheet, origin.x + x, origin.y + y, [5, 8, 10, 255])
        continue
      }

      const value = mode === 'active'
        ? getAnyActiveBody(packageData.defectDecalMaps, sourceIndex, kinds)
        : getAnyPhysicalContribution(
          packageData.defectDecalMaps,
          sourceIndex,
          kinds,
        )

      setPixel(
        sheet,
        origin.x + x,
        origin.y + y,
        value > 0.000001 ? [255, 40, 40, 255] : [24, 34, 38, 255],
      )
    }
  }

  drawPanelBorder(sheet, origin, options.accentColor ?? [230, 80, 80, 255])
}

function getClipGuardValue(packageData, mode, sourceIndex) {
  if (mode === 'active') {
    return getAnyActiveBody(packageData.defectDecalMaps, sourceIndex)
  }

  if (mode === 'physical') {
    return getAnyPhysicalContribution(packageData.defectDecalMaps, sourceIndex)
  }

  if (mode === 'selfShadow') {
    return (
      (packageData.heightSelfShadowMap[sourceIndex] ?? 0) *
      getArtworkFrameSteelFinishSelfShadowReceiver(
        packageData.steelFinishMaps,
        sourceIndex,
      )
    )
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

async function drawZeroGuardContactSheet({ fileName, panels }) {
  const sheet = createSheet(panels.length, 1)

  for (const [index, panelData] of panels.entries()) {
    drawZeroGuardPanel(sheet, index, 0, panelData)
  }

  await writePng(path.join(ARTIFACT_DIR, fileName), sheet)
}

async function drawClippingContactSheet({ fileName, panels }) {
  const sheet = createSheet(panels.length, 1)

  for (const [index, panelData] of panels.entries()) {
    drawClipGuardPanel(
      sheet,
      index,
      0,
      panelData.packageData,
      panelData.mode,
      panelData.accentColor,
    )
  }

  await writePng(path.join(ARTIFACT_DIR, fileName), sheet)
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

async function readGeneratedPng(filePath) {
  const buffer = await readFile(filePath)
  let offset = 8
  let width = 0
  let height = 0
  const idatChunks = []

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.toString('ascii', offset + 4, offset + 8)
    const data = buffer.subarray(offset + 8, offset + 8 + length)

    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
    }

    if (type === 'IDAT') {
      idatChunks.push(data)
    }

    offset += 12 + length
  }

  const inflated = inflateSync(Buffer.concat(idatChunks))
  const scanlineLength = width * 4 + 1
  const image = createImage(width, height)

  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * scanlineLength
    const filter = inflated[rowOffset]

    if (filter !== 0) {
      throw new Error(`Unsupported diagnostic PNG filter: ${filter}`)
    }

    inflated.copy(
      Buffer.from(image.data.buffer),
      y * width * 4,
      rowOffset + 1,
      rowOffset + 1 + width * 4,
    )
  }

  return image
}

function drawImageAt(target, source, originX, originY) {
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const sourceIndex = (y * source.width + x) * 4

      setPixel(target, originX + x, originY + y, [
        source.data[sourceIndex] ?? 0,
        source.data[sourceIndex + 1] ?? 0,
        source.data[sourceIndex + 2] ?? 0,
        source.data[sourceIndex + 3] ?? 255,
      ])
    }
  }
}

async function writeBeforeAfterComparison(afterFilePath) {
  const beforeFilePath = path.join(
    BEFORE_ARTIFACT_DIR,
    'final-shaded-polish-light-contact-sheet.png',
  )

  try {
    const before = await readGeneratedPng(beforeFilePath)
    const after = await readGeneratedPng(afterFilePath)
    const combined = createImage(
      Math.max(before.width, after.width),
      before.height + PANEL_GUTTER + after.height,
    )

    drawImageAt(combined, before, 0, 0)
    drawImageAt(combined, after, 0, before.height + PANEL_GUTTER)
    await writePng(
      path.join(ARTIFACT_DIR, 'before-after-final-shaded-contact-sheet.png'),
      combined,
    )
  } catch {
    const after = await readGeneratedPng(afterFilePath)

    await writePng(
      path.join(ARTIFACT_DIR, 'before-after-final-shaded-contact-sheet.png'),
      after,
    )
  }
}

async function writeManifest() {
  await writeFile(
    path.join(ARTIFACT_DIR, 'stage6-after-diagnostic-package-manifest.json'),
    JSON.stringify({
      files: [
        {
          fileName: 'before-after-final-shaded-contact-sheet.png',
          panels: [
            'top: previously generated Stage 6 before final shaded sheet',
            'bottom: current Stage 6 after final shaded sheet',
          ],
        },
        {
          fileName: 'active-body-polish-light-contact-sheet.png',
          panels: LOW_POLISH_CHECKPOINTS.flatMap((polish) =>
            LIGHT_POSITIONS.map(({ label }) =>
              `${polish}% ${label} active body map`
            )
          ),
        },
        {
          fileName: 'physical-contribution-polish-light-contact-sheet.png',
          panels: LOW_POLISH_CHECKPOINTS.flatMap((polish) =>
            LIGHT_POSITIONS.map(({ label }) =>
              `${polish}% ${label} physical contribution map`
            )
          ),
        },
        {
          fileName: 'final-shaded-polish-light-contact-sheet.png',
          panels: LOW_POLISH_CHECKPOINTS.flatMap((polish) =>
            LIGHT_POSITIONS.map(({ label }) =>
              `${polish}% ${label} final shaded steel`
            )
          ),
        },
        {
          fileName: 'polish0-active-physical-final-light-contact-sheet.png',
          panels: LIGHT_POSITIONS.flatMap(({ label }) => [
            `${label} active body map`,
            `${label} physical contribution map`,
            `${label} final shaded steel`,
          ]),
        },
        {
          fileName: 'low-polish-ramp-final-light-contact-sheet.png',
          panels: LOW_POLISH_CHECKPOINTS.flatMap((polish) =>
            LIGHT_POSITIONS.map(({ label }) =>
              `${polish}% ${label} final shaded steel`
            )
          ),
        },
        {
          fileName: 'polish0-10-25-final-light-comparison-contact-sheet.png',
          panels: POLISH10_COMPARISON_CHECKPOINTS.flatMap((polish) =>
            LIGHT_POSITIONS.map(({ label }) =>
              `${polish}% ${label} final shaded steel`
            )
          ),
        },
        {
          fileName: 'polish10-25-30-50-final-light-comparison-contact-sheet.png',
          panels: POLISH25_COMPARISON_CHECKPOINTS.flatMap((polish) =>
            LIGHT_POSITIONS.map(({ label }) =>
              `${polish}% ${label} final shaded steel`
            )
          ),
        },
        {
          fileName: 'polish25-30-50-final-light-comparison-contact-sheet.png',
          panels: POLISH30_COMPARISON_CHECKPOINTS.flatMap((polish) =>
            LIGHT_POSITIONS.map(({ label }) =>
              `${polish}% ${label} final shaded steel`
            )
          ),
        },
        {
          fileName: 'inactive-zero-guard-contact-sheet.png',
          panels: [
            '50% old low-polish families active body exact-zero guard',
            '50% old low-polish families physical contribution exact-zero guard',
            '100% all-family active body exact-zero guard',
            '100% all-family physical contribution exact-zero guard',
          ],
        },
        {
          fileName: 'frame-ring-clipping-guard-contact-sheet.png',
          panels: [
            'active decal bleed guard',
            'physical contribution bleed guard',
            'self-shadow receiver bleed guard',
          ],
        },
        {
          fileName: 'light-stability-contact-sheet.png',
          panels: LIGHT_POSITIONS.flatMap(({ label }) => [
            `30% ${label} active body map`,
            `30% ${label} physical contribution map`,
            `30% ${label} final shaded steel`,
          ]),
        },
        {
          fileName: 'tarnish-stability-contact-sheet.png',
          panels: TARNISH_STABILITY_CHECKPOINTS.flatMap((tarnish) => [
            `30% polish ${tarnish}% tarnish active body map`,
            `30% polish ${tarnish}% tarnish physical contribution map`,
            `30% polish ${tarnish}% tarnish final clean-steel shading`,
          ]),
        },
      ],
      generatedAt: new Date().toISOString(),
      note: [
        'Diagnostic Stage 6 after-state visual package.',
        'Panels use active decal physical contribution maps and existing steel finish maps.',
        'Rows are active body maps, physical contribution maps, and final shaded steel; columns are overhead, 45-degree, and grazing light.',
        'The low-polish ramp sheet shows final shaded steel for polish 0, 10, 25, 30, and 50 across the same light positions.',
        'The 0/10/25 comparison sheet isolates the polish 10 overlap tune against rough damaged and medium scuffed checkpoints.',
        'The 10/25/30/50 comparison sheet isolates the polish 25 overlap tune against the low-polish and brushed-baseline guards.',
        'The 25/30/50 comparison sheet isolates the polish 30 handoff into the brushed baseline.',
        'Inactive-zero guards turn red if old low-polish damage families contribute at 50% or if any family contributes at 100%.',
        'Light and tarnish stability sheets visualize that placement and physical maps stay anchored while final shading is the only light-dependent response.',
        'The before/after sheet uses the existing Stage 6 before artifact when present and the current after render.',
        'These generated assets do not claim native Tauri visual acceptance.',
      ],
    }, null, 2),
  )
}

await mkdir(ARTIFACT_DIR, { recursive: true })

const packages = LIGHT_POSITIONS.map(({ position }) =>
  createPolishPackage(position, 0),
)
const sheet = createSheet(LIGHT_POSITIONS.length, 3)

for (const [index, packageData] of packages.entries()) {
  drawMapPanel(sheet, index, 0, packageData, 'active', [86, 154, 202, 255])
  drawMapPanel(sheet, index, 1, packageData, 'physical', [190, 120, 92, 255])
  drawImageDataPanel(sheet, index, 2, packageData, [182, 200, 210, 255])
}

const contactSheetPath = path.join(
  ARTIFACT_DIR,
  'polish0-active-physical-final-light-contact-sheet.png',
)

await writePng(contactSheetPath, sheet)

const rampPackages = LOW_POLISH_CHECKPOINTS.flatMap((metalPolish) =>
  LIGHT_POSITIONS.map(({ position }) =>
    createPolishPackage(position, metalPolish)
  ),
)
const activeBodySheet = createSheet(
  LIGHT_POSITIONS.length,
  LOW_POLISH_CHECKPOINTS.length,
)
const physicalContributionSheet = createSheet(
  LIGHT_POSITIONS.length,
  LOW_POLISH_CHECKPOINTS.length,
)
const rampSheet = createSheet(LIGHT_POSITIONS.length, LOW_POLISH_CHECKPOINTS.length)

for (const [index, packageData] of rampPackages.entries()) {
  drawMapPanel(
    activeBodySheet,
    index % LIGHT_POSITIONS.length,
    Math.floor(index / LIGHT_POSITIONS.length),
    packageData,
    'active',
    [86, 154, 202, 255],
  )
  drawMapPanel(
    physicalContributionSheet,
    index % LIGHT_POSITIONS.length,
    Math.floor(index / LIGHT_POSITIONS.length),
    packageData,
    'physical',
    [190, 120, 92, 255],
  )
  drawImageDataPanel(
    rampSheet,
    index % LIGHT_POSITIONS.length,
    Math.floor(index / LIGHT_POSITIONS.length),
    packageData,
    [182, 200, 210, 255],
  )
}

const activeBodyContactSheetPath = path.join(
  ARTIFACT_DIR,
  'active-body-polish-light-contact-sheet.png',
)
const physicalContributionContactSheetPath = path.join(
  ARTIFACT_DIR,
  'physical-contribution-polish-light-contact-sheet.png',
)
const finalShadedContactSheetPath = path.join(
  ARTIFACT_DIR,
  'final-shaded-polish-light-contact-sheet.png',
)
const rampContactSheetPath = path.join(
  ARTIFACT_DIR,
  'low-polish-ramp-final-light-contact-sheet.png',
)

await writePng(activeBodyContactSheetPath, activeBodySheet)
await writePng(physicalContributionContactSheetPath, physicalContributionSheet)
await writePng(finalShadedContactSheetPath, rampSheet)
await writePng(rampContactSheetPath, rampSheet)

const polish10ComparisonPackages = POLISH10_COMPARISON_CHECKPOINTS.flatMap(
  (metalPolish) =>
    LIGHT_POSITIONS.map(({ position }) =>
      createPolishPackage(position, metalPolish)
    ),
)
const polish10ComparisonSheet = createSheet(
  LIGHT_POSITIONS.length,
  POLISH10_COMPARISON_CHECKPOINTS.length,
)

for (const [index, packageData] of polish10ComparisonPackages.entries()) {
  drawImageDataPanel(
    polish10ComparisonSheet,
    index % LIGHT_POSITIONS.length,
    Math.floor(index / LIGHT_POSITIONS.length),
    packageData,
    [176, 184, 170, 255],
  )
}

const polish10ComparisonContactSheetPath = path.join(
  ARTIFACT_DIR,
  'polish0-10-25-final-light-comparison-contact-sheet.png',
)

await writePng(polish10ComparisonContactSheetPath, polish10ComparisonSheet)

const polish25ComparisonPackages = POLISH25_COMPARISON_CHECKPOINTS.flatMap(
  (metalPolish) =>
    LIGHT_POSITIONS.map(({ position }) =>
      createPolishPackage(position, metalPolish)
    ),
)
const polish25ComparisonSheet = createSheet(
  LIGHT_POSITIONS.length,
  POLISH25_COMPARISON_CHECKPOINTS.length,
)

for (const [index, packageData] of polish25ComparisonPackages.entries()) {
  drawImageDataPanel(
    polish25ComparisonSheet,
    index % LIGHT_POSITIONS.length,
    Math.floor(index / LIGHT_POSITIONS.length),
    packageData,
    [170, 196, 184, 255],
  )
}

const polish25ComparisonContactSheetPath = path.join(
  ARTIFACT_DIR,
  'polish10-25-30-50-final-light-comparison-contact-sheet.png',
)

await writePng(polish25ComparisonContactSheetPath, polish25ComparisonSheet)

const polish30ComparisonPackages = POLISH30_COMPARISON_CHECKPOINTS.flatMap(
  (metalPolish) =>
    LIGHT_POSITIONS.map(({ position }) =>
      createPolishPackage(position, metalPolish)
    ),
)
const polish30ComparisonSheet = createSheet(
  LIGHT_POSITIONS.length,
  POLISH30_COMPARISON_CHECKPOINTS.length,
)

for (const [index, packageData] of polish30ComparisonPackages.entries()) {
  drawImageDataPanel(
    polish30ComparisonSheet,
    index % LIGHT_POSITIONS.length,
    Math.floor(index / LIGHT_POSITIONS.length),
    packageData,
    [172, 196, 214, 255],
  )
}

const polish30ComparisonContactSheetPath = path.join(
  ARTIFACT_DIR,
  'polish25-30-50-final-light-comparison-contact-sheet.png',
)

await writePng(polish30ComparisonContactSheetPath, polish30ComparisonSheet)

const polish50GuardPackage = createPolishPackage({ x: 0, y: 0 }, 50)
const polish100GuardPackage = createPolishPackage({ x: 0, y: 0 }, 100)
const clippingPackage = createPolishPackage(
  LIGHT_POSITIONS[2].position,
  0,
)
const oldLowPolishFamilies = ['gouge', 'dent', 'scuff', 'burrNick']

await drawZeroGuardContactSheet({
  fileName: 'inactive-zero-guard-contact-sheet.png',
  panels: [
    {
      accentColor: [230, 80, 80, 255],
      kinds: oldLowPolishFamilies,
      mode: 'active',
      packageData: polish50GuardPackage,
    },
    {
      accentColor: [230, 80, 80, 255],
      kinds: oldLowPolishFamilies,
      mode: 'physical',
      packageData: polish50GuardPackage,
    },
    {
      accentColor: [230, 80, 80, 255],
      kinds: ARTWORK_FRAME_STEEL_DEFECT_KINDS,
      mode: 'active',
      packageData: polish100GuardPackage,
    },
    {
      accentColor: [230, 80, 80, 255],
      kinds: ARTWORK_FRAME_STEEL_DEFECT_KINDS,
      mode: 'physical',
      packageData: polish100GuardPackage,
    },
  ],
})
await drawClippingContactSheet({
  fileName: 'frame-ring-clipping-guard-contact-sheet.png',
  panels: [
    {
      accentColor: [86, 154, 202, 255],
      mode: 'active',
      packageData: clippingPackage,
    },
    {
      accentColor: [190, 120, 92, 255],
      mode: 'physical',
      packageData: clippingPackage,
    },
    {
      accentColor: [160, 110, 255, 255],
      mode: 'selfShadow',
      packageData: clippingPackage,
    },
  ],
})

const lightStabilityPackages = LIGHT_POSITIONS.map(({ position }) =>
  createPolishPackage(position, 30),
)
const lightStabilitySheet = createSheet(LIGHT_POSITIONS.length, 3)

for (const [index, packageData] of lightStabilityPackages.entries()) {
  drawMapPanel(
    lightStabilitySheet,
    index,
    0,
    packageData,
    'active',
    [86, 154, 202, 255],
  )
  drawMapPanel(
    lightStabilitySheet,
    index,
    1,
    packageData,
    'physical',
    [190, 120, 92, 255],
  )
  drawImageDataPanel(
    lightStabilitySheet,
    index,
    2,
    packageData,
    [182, 200, 210, 255],
  )
}

const lightStabilityContactSheetPath = path.join(
  ARTIFACT_DIR,
  'light-stability-contact-sheet.png',
)

await writePng(lightStabilityContactSheetPath, lightStabilitySheet)

const tarnishStabilityPackages = TARNISH_STABILITY_CHECKPOINTS.map((tarnish) =>
  createPolishPackage({ x: 0, y: 0 }, 30, tarnish),
)
const tarnishStabilitySheet = createSheet(
  TARNISH_STABILITY_CHECKPOINTS.length,
  3,
)

for (const [index, packageData] of tarnishStabilityPackages.entries()) {
  drawMapPanel(
    tarnishStabilitySheet,
    index,
    0,
    packageData,
    'active',
    [86, 154, 202, 255],
  )
  drawMapPanel(
    tarnishStabilitySheet,
    index,
    1,
    packageData,
    'physical',
    [190, 120, 92, 255],
  )
  drawImageDataPanel(
    tarnishStabilitySheet,
    index,
    2,
    packageData,
    [182, 200, 210, 255],
  )
}

const tarnishStabilityContactSheetPath = path.join(
  ARTIFACT_DIR,
  'tarnish-stability-contact-sheet.png',
)

await writePng(tarnishStabilityContactSheetPath, tarnishStabilitySheet)
await writeBeforeAfterComparison(finalShadedContactSheetPath)
await writeManifest()

console.log(activeBodyContactSheetPath)
console.log(physicalContributionContactSheetPath)
console.log(finalShadedContactSheetPath)
console.log(contactSheetPath)
console.log(rampContactSheetPath)
console.log(polish10ComparisonContactSheetPath)
console.log(polish25ComparisonContactSheetPath)
console.log(polish30ComparisonContactSheetPath)
console.log(path.join(ARTIFACT_DIR, 'inactive-zero-guard-contact-sheet.png'))
console.log(path.join(ARTIFACT_DIR, 'frame-ring-clipping-guard-contact-sheet.png'))
console.log(lightStabilityContactSheetPath)
console.log(tarnishStabilityContactSheetPath)
console.log(path.join(ARTIFACT_DIR, 'before-after-final-shaded-contact-sheet.png'))
console.log(
  path.join(ARTIFACT_DIR, 'stage6-after-diagnostic-package-manifest.json'),
)
