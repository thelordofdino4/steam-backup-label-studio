import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { deflateSync } from 'node:zlib'
import {
  createMetalArtworkFramePathData,
  getArtworkFrameStrokeWidth,
} from '../src/render/artworkFrame.ts'
import { buildMetalArtworkFrameMaterialPlan } from '../src/render/artworkFrameMaterialPlan.ts'
import {
  ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS,
  ARTWORK_FRAME_STEEL_DEFECT_KINDS,
  ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS,
  createArtworkFrameSteelDefectPlacementSet,
  rasterizeArtworkFrameSteelDefectStablePlacementMaps,
} from '../src/render/artworkFrameSteelDefects.ts'

const ARTIFACT_DIR = path.join(
  process.cwd(),
  'artifacts',
  'steel-polish-stage3',
)
const PANEL_WIDTH = 300
const PANEL_HEIGHT = 214
const SHEET_MARGIN = 24
const PANEL_GUTTER = 18
const MAP_WIDTH = 300
const MAP_HEIGHT = 214
const DEFAULT_BOUNDS = { x: 0, y: 0, width: 128, height: 96 }
const KIND_COLORS = {
  burrNick: [230, 224, 172],
  dent: [164, 206, 255],
  gouge: [255, 136, 88],
  pit: [200, 175, 255],
  scratch: [226, 241, 255],
  scuff: [184, 232, 175],
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function interpolate(a, b, t) {
  return a + (b - a) * t
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

function setPixel(image, x, y, color) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) {
    return
  }

  const index = (Math.floor(y) * image.width + Math.floor(x)) * 4
  const alpha = clampNumber((color[3] ?? 255) / 255, 0, 1)
  const inverse = 1 - alpha

  image.data[index] = Math.round((color[0] ?? 0) * alpha + image.data[index] * inverse)
  image.data[index + 1] = Math.round((color[1] ?? 0) * alpha + image.data[index + 1] * inverse)
  image.data[index + 2] = Math.round((color[2] ?? 0) * alpha + image.data[index + 2] * inverse)
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
  const radians = angleDegrees * Math.PI / 180

  return {
    angleDegrees,
    tangentX: Math.cos(radians),
    tangentY: Math.sin(radians),
  }
}

function createDiagnosticFrame({
  metalBrushAngle = 12,
  metalPolish = 50,
  metalTarnish = 0,
} = {}) {
  return {
    color: '#ffffff',
    enabled: true,
    jaggedness: 50,
    lumpiness: 50,
    metalBevelWidth: 64,
    metalBrushAngle,
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

function createPlacementPackage({
  bounds = DEFAULT_BOUNDS,
  lightVector = { x: 0, y: 0, z: 1 },
  materialSeedKey = 'stage3-diagnostic-image-a',
  materialSeed32 = 0x5a6b7c8d,
  metalPolish = 50,
  metalTarnish = 0,
} = {}) {
  const frame = createDiagnosticFrame({ metalPolish, metalTarnish })
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

  return {
    frameMask,
    maps,
    placementSet,
  }
}

function getKindsMax(maps, channel, index, kinds = ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
  let maxValue = 0
  let maxKind = kinds[0]

  for (const kind of kinds) {
    const value = maps.stablePlacement[kind][channel][index] ?? 0

    if (value > maxValue) {
      maxValue = value
      maxKind = kind
    }
  }

  return { kind: maxKind, value: maxValue }
}

function getZeroGuardValue(maps, index) {
  let value = 0

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    for (const channel of ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS) {
      value = Math.max(value, Math.abs(maps.activeBodies[kind][channel][index] ?? 0))
    }

    for (
      const channel of ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS
    ) {
      value = Math.max(
        value,
        Math.abs(maps.physicalContributions[kind][channel][index] ?? 0),
      )
    }
  }

  return value
}

function colorFromRamp(value, ramp) {
  const unit = clampNumber(value, 0, 1)
  const scaled = unit * (ramp.length - 1)
  const index = Math.floor(scaled)
  const nextIndex = Math.min(ramp.length - 1, index + 1)
  const t = scaled - index

  return [
    Math.round(interpolate(ramp[index][0], ramp[nextIndex][0], t)),
    Math.round(interpolate(ramp[index][1], ramp[nextIndex][1], t)),
    Math.round(interpolate(ramp[index][2], ramp[nextIndex][2], t)),
    255,
  ]
}

function getPanelColor({ diffMaps, kinds, maps, mode }, sourceIndex) {
  const candidate = getKindsMax(maps, 'candidateMask', sourceIndex, kinds)
  const centerline = getKindsMax(maps, 'centerlineMask', sourceIndex, kinds)

  if (mode === 'zeroGuard') {
    const guard = getZeroGuardValue(maps, sourceIndex)

    return guard > 0
      ? [255, 40, 40, 255]
      : [5, 8, 10, 255]
  }

  if (mode === 'difference') {
    if (!diffMaps) {
      return [5, 8, 10, 255]
    }

    const before = getKindsMax(maps, 'candidateMask', sourceIndex, kinds).value
    const after = getKindsMax(
      diffMaps,
      'candidateMask',
      sourceIndex,
      kinds,
    ).value
    const diff = clampNumber(Math.abs(before - after) * 2.5, 0, 1)

    return [Math.round(diff * 255), Math.round(diff * 80), 24, 255]
  }

  if (candidate.value <= 0) {
    return [15, 22, 26, 255]
  }

  if (mode === 'centerline') {
    const base = candidate.value * 135
    const line = centerline.value

    return [
      Math.round(base + line * 48),
      Math.round(base + line * 118),
      Math.round(base + line * 150),
      255,
    ]
  }

  if (mode === 'tangent') {
    const stable = maps.stablePlacement[candidate.kind]
    const tangentX = stable.tangentX[sourceIndex] ?? 0
    const tangentY = stable.tangentY[sourceIndex] ?? 0
    const intensity = Math.max(0.2, candidate.value)

    return [
      Math.round((tangentX * 0.5 + 0.5) * 255 * intensity),
      Math.round((tangentY * 0.5 + 0.5) * 255 * intensity),
      Math.round(84 + 95 * intensity),
      255,
    ]
  }

  if (mode === 'sizeClass') {
    return colorFromRamp(
      getKindsMax(maps, 'sizeClass', sourceIndex, kinds).value,
      [
        [33, 20, 12],
        [124, 74, 34],
        [230, 174, 106],
      ],
    )
  }

  if (mode === 'depthLimit') {
    return colorFromRamp(
      getKindsMax(maps, 'depthLimit', sourceIndex, kinds).value,
      [
        [24, 14, 18],
        [125, 43, 42],
        [245, 139, 92],
      ],
    )
  }

  if (mode === 'edgeRoughness') {
    return colorFromRamp(
      getKindsMax(maps, 'edgeRoughness', sourceIndex, kinds).value,
      [
        [12, 31, 20],
        [82, 146, 70],
        [188, 242, 154],
      ],
    )
  }

  if (mode === 'stageAffinity') {
    return colorFromRamp(
      getKindsMax(maps, 'stageAffinity', sourceIndex, kinds).value,
      [
        [29, 18, 44],
        [86, 52, 124],
        [183, 133, 231],
      ],
    )
  }

  const kindColor = KIND_COLORS[candidate.kind] ?? [255, 255, 255]
  const line = centerline.value
  const intensity = clampNumber(candidate.value * 0.88 + line * 0.34, 0, 1)

  return [
    Math.round(kindColor[0] * intensity),
    Math.round(kindColor[1] * intensity),
    Math.round(kindColor[2] * intensity),
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
      const frameValue = options.frameMask[sourceIndex] ?? 0

      if (frameValue <= 0) {
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

function drawContactSheet({ fileName, panels }) {
  const columns = Math.min(4, Math.max(1, panels.length))
  const rows = Math.ceil(panels.length / columns)
  const sheet = createSheet(columns, rows)

  for (const [index, panel] of panels.entries()) {
    drawMapPanel(
      sheet,
      index % columns,
      Math.floor(index / columns),
      panel,
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

function panel(packageData, mode, kinds, accentColor, diffMaps = null) {
  return {
    accentColor,
    diffMaps,
    frameMask: packageData.frameMask,
    kinds,
    maps: packageData.maps,
    mode,
  }
}

async function writeManifest(files) {
  await writeFile(
    path.join(ARTIFACT_DIR, 'stage3-diagnostic-package-manifest.json'),
    JSON.stringify({
      files,
      generatedAt: new Date().toISOString(),
      note: [
        'Diagnostic placement assets only.',
        'Panels visualize stable placement candidates and map channels.',
        'Active body and physical contribution channels are expected to remain zero.',
        'These assets are not final shaded steel and do not claim native visual acceptance.',
      ],
    }, null, 2),
  )
}

await mkdir(ARTIFACT_DIR, { recursive: true })

const baseline = createPlacementPackage()
const polish0 = createPlacementPackage({ metalPolish: 0 })
const polish50 = createPlacementPackage({ metalPolish: 50 })
const polish100 = createPlacementPackage({ metalPolish: 100 })
const tarnish0 = createPlacementPackage({ metalTarnish: 0 })
const tarnish45 = createPlacementPackage({ metalTarnish: 45 })
const tarnish100 = createPlacementPackage({ metalTarnish: 100 })
const lightCenter = createPlacementPackage({ lightVector: { x: 0, y: 0, z: 1 } })
const lightBottomLeft = createPlacementPackage({
  lightVector: { x: -0.70710678, y: -0.70710678, z: 0.000001 },
})
const lightBottomRight = createPlacementPackage({
  lightVector: { x: 0.70710678, y: -0.70710678, z: 0.000001 },
})
const lightTopLeft = createPlacementPackage({
  lightVector: { x: -0.70710678, y: 0.70710678, z: 0.000001 },
})
const lightTopRight = createPlacementPackage({
  lightVector: { x: 0.70710678, y: 0.70710678, z: 0.000001 },
})
const imageSeedA = createPlacementPackage({
  materialSeed32: 0x5a6b7c8d,
  materialSeedKey: 'stage3-diagnostic-image-a',
})
const imageSeedB = createPlacementPackage({
  materialSeed32: 0x10293847,
  materialSeedKey: 'stage3-diagnostic-image-b',
})
const files = [
  {
    fileName: 'scratch-placement-contact-sheet.png',
    panels: [
      'scratch candidate',
      'scratch centerline',
      'scratch tangent',
      'scratch size class',
      'scratch depth limit',
      'scratch edge roughness',
      'scratch stage affinity',
      'active/physical zero guard',
    ],
  },
  {
    fileName: 'gouge-burr-placement-contact-sheet.png',
    panels: [
      'gouge candidate',
      'burr/nick candidate',
      'gouge+burr/nick centerline',
      'gouge+burr/nick tangent',
      'gouge+burr/nick depth limit',
      'gouge+burr/nick edge roughness',
      'gouge+burr/nick stage affinity',
      'active/physical zero guard',
    ],
  },
  {
    fileName: 'dent-pit-placement-contact-sheet.png',
    panels: [
      'dent candidate',
      'pit candidate',
      'dent+pit centerline',
      'dent+pit tangent',
      'dent+pit depth limit',
      'dent+pit size class',
      'dent+pit stage affinity',
      'active/physical zero guard',
    ],
  },
  {
    fileName: 'scuff-placement-contact-sheet.png',
    panels: [
      'scuff candidate',
      'scuff centerline',
      'scuff tangent',
      'scuff size class',
      'scuff depth limit',
      'scuff edge roughness',
      'scuff stage affinity',
      'active/physical zero guard',
    ],
  },
  {
    fileName: 'all-placement-map-contact-sheet.png',
    panels: [
      'all candidate',
      'all centerline',
      'all tangent',
      'all size class',
      'all depth limit',
      'all edge roughness',
      'all stage affinity',
      'active/physical zero guard',
      'scratch candidate',
      'gouge candidate',
      'dent candidate',
      'pit candidate',
      'scuff candidate',
      'burr/nick candidate',
    ],
  },
  {
    fileName: 'same-seed-polish-stability-contact-sheet.png',
    panels: [
      'polish 0 candidate',
      'polish 50 candidate',
      'polish 100 candidate',
      'polish 0 vs 100 candidate difference',
    ],
  },
  {
    fileName: 'same-seed-tarnish-stability-contact-sheet.png',
    panels: [
      'tarnish 0 candidate',
      'tarnish 45 candidate',
      'tarnish 100 candidate',
      'tarnish 0 vs 100 candidate difference',
    ],
  },
  {
    fileName: 'same-seed-light-stability-contact-sheet.png',
    panels: [
      'center light candidate',
      'bottom-left light candidate',
      'bottom-right light candidate',
      'top-left light candidate',
      'top-right light candidate',
      'center vs top-right candidate difference',
    ],
  },
  {
    fileName: 'image-seed-comparison-contact-sheet.png',
    panels: [
      'image seed A candidate',
      'image seed B candidate',
      'A vs B candidate difference',
      'image seed A tangent',
      'image seed B tangent',
      'A centerline',
      'B centerline',
      'active/physical zero guard',
    ],
  },
]

await drawContactSheet({
  fileName: 'scratch-placement-contact-sheet.png',
  panels: [
    panel(baseline, 'candidate', ['scratch'], [112, 170, 220, 255]),
    panel(baseline, 'centerline', ['scratch'], [112, 170, 220, 255]),
    panel(baseline, 'tangent', ['scratch'], [112, 170, 220, 255]),
    panel(baseline, 'sizeClass', ['scratch'], [112, 170, 220, 255]),
    panel(baseline, 'depthLimit', ['scratch'], [112, 170, 220, 255]),
    panel(baseline, 'edgeRoughness', ['scratch'], [112, 170, 220, 255]),
    panel(baseline, 'stageAffinity', ['scratch'], [112, 170, 220, 255]),
    panel(baseline, 'zeroGuard', ['scratch'], [112, 170, 220, 255]),
  ],
})
await drawContactSheet({
  fileName: 'gouge-burr-placement-contact-sheet.png',
  panels: [
    panel(baseline, 'candidate', ['gouge'], [230, 130, 92, 255]),
    panel(baseline, 'candidate', ['burrNick'], [230, 224, 172, 255]),
    panel(baseline, 'centerline', ['gouge', 'burrNick'], [230, 130, 92, 255]),
    panel(baseline, 'tangent', ['gouge', 'burrNick'], [230, 130, 92, 255]),
    panel(baseline, 'depthLimit', ['gouge', 'burrNick'], [230, 130, 92, 255]),
    panel(baseline, 'edgeRoughness', ['gouge', 'burrNick'], [230, 130, 92, 255]),
    panel(baseline, 'stageAffinity', ['gouge', 'burrNick'], [230, 130, 92, 255]),
    panel(baseline, 'zeroGuard', ['gouge', 'burrNick'], [230, 130, 92, 255]),
  ],
})
await drawContactSheet({
  fileName: 'dent-pit-placement-contact-sheet.png',
  panels: [
    panel(baseline, 'candidate', ['dent'], [164, 206, 255, 255]),
    panel(baseline, 'candidate', ['pit'], [200, 175, 255, 255]),
    panel(baseline, 'centerline', ['dent', 'pit'], [164, 206, 255, 255]),
    panel(baseline, 'tangent', ['dent', 'pit'], [164, 206, 255, 255]),
    panel(baseline, 'depthLimit', ['dent', 'pit'], [164, 206, 255, 255]),
    panel(baseline, 'sizeClass', ['dent', 'pit'], [164, 206, 255, 255]),
    panel(baseline, 'stageAffinity', ['dent', 'pit'], [164, 206, 255, 255]),
    panel(baseline, 'zeroGuard', ['dent', 'pit'], [164, 206, 255, 255]),
  ],
})
await drawContactSheet({
  fileName: 'scuff-placement-contact-sheet.png',
  panels: [
    panel(baseline, 'candidate', ['scuff'], [184, 232, 175, 255]),
    panel(baseline, 'centerline', ['scuff'], [184, 232, 175, 255]),
    panel(baseline, 'tangent', ['scuff'], [184, 232, 175, 255]),
    panel(baseline, 'sizeClass', ['scuff'], [184, 232, 175, 255]),
    panel(baseline, 'depthLimit', ['scuff'], [184, 232, 175, 255]),
    panel(baseline, 'edgeRoughness', ['scuff'], [184, 232, 175, 255]),
    panel(baseline, 'stageAffinity', ['scuff'], [184, 232, 175, 255]),
    panel(baseline, 'zeroGuard', ['scuff'], [184, 232, 175, 255]),
  ],
})
await drawContactSheet({
  fileName: 'all-placement-map-contact-sheet.png',
  panels: [
    panel(baseline, 'candidate', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [86, 154, 202, 255]),
    panel(baseline, 'centerline', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [86, 154, 202, 255]),
    panel(baseline, 'tangent', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [86, 154, 202, 255]),
    panel(baseline, 'sizeClass', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [86, 154, 202, 255]),
    panel(baseline, 'depthLimit', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [86, 154, 202, 255]),
    panel(baseline, 'edgeRoughness', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [86, 154, 202, 255]),
    panel(baseline, 'stageAffinity', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [86, 154, 202, 255]),
    panel(baseline, 'zeroGuard', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [86, 154, 202, 255]),
    panel(baseline, 'candidate', ['scratch'], [226, 241, 255, 255]),
    panel(baseline, 'candidate', ['gouge'], [255, 136, 88, 255]),
    panel(baseline, 'candidate', ['dent'], [164, 206, 255, 255]),
    panel(baseline, 'candidate', ['pit'], [200, 175, 255, 255]),
    panel(baseline, 'candidate', ['scuff'], [184, 232, 175, 255]),
    panel(baseline, 'candidate', ['burrNick'], [230, 224, 172, 255]),
  ],
})
await drawContactSheet({
  fileName: 'same-seed-polish-stability-contact-sheet.png',
  panels: [
    panel(polish0, 'candidate', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [95, 150, 210, 255]),
    panel(polish50, 'candidate', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [95, 190, 150, 255]),
    panel(polish100, 'candidate', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [220, 190, 95, 255]),
    panel(polish0, 'difference', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [240, 80, 48, 255], polish100.maps),
  ],
})
await drawContactSheet({
  fileName: 'same-seed-tarnish-stability-contact-sheet.png',
  panels: [
    panel(tarnish0, 'candidate', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [95, 150, 210, 255]),
    panel(tarnish45, 'candidate', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [180, 150, 95, 255]),
    panel(tarnish100, 'candidate', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [210, 95, 65, 255]),
    panel(tarnish0, 'difference', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [240, 80, 48, 255], tarnish100.maps),
  ],
})
await drawContactSheet({
  fileName: 'same-seed-light-stability-contact-sheet.png',
  panels: [
    panel(lightCenter, 'candidate', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [210, 210, 120, 255]),
    panel(lightBottomLeft, 'candidate', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [120, 170, 230, 255]),
    panel(lightBottomRight, 'candidate', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [120, 210, 170, 255]),
    panel(lightTopLeft, 'candidate', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [200, 150, 230, 255]),
    panel(lightTopRight, 'candidate', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [230, 170, 120, 255]),
    panel(lightCenter, 'difference', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [240, 80, 48, 255], lightTopRight.maps),
  ],
})
await drawContactSheet({
  fileName: 'image-seed-comparison-contact-sheet.png',
  panels: [
    panel(imageSeedA, 'candidate', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [86, 154, 202, 255]),
    panel(imageSeedB, 'candidate', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [215, 136, 86, 255]),
    panel(imageSeedA, 'difference', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [240, 80, 48, 255], imageSeedB.maps),
    panel(imageSeedA, 'tangent', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [86, 154, 202, 255]),
    panel(imageSeedB, 'tangent', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [215, 136, 86, 255]),
    panel(imageSeedA, 'centerline', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [86, 154, 202, 255]),
    panel(imageSeedB, 'centerline', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [215, 136, 86, 255]),
    panel(imageSeedA, 'zeroGuard', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [86, 154, 202, 255]),
  ],
})
await writeManifest(files)

for (const { fileName } of files) {
  console.log(path.join(ARTIFACT_DIR, fileName))
}
