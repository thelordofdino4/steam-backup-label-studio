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
  activateArtworkFrameSteelDefectActiveBodyMaps,
  createArtworkFrameSteelDefectPlacementSet,
  rasterizeArtworkFrameSteelDefectStablePlacementMaps,
} from '../src/render/artworkFrameSteelDefects.ts'

const ARTIFACT_DIR = path.join(
  process.cwd(),
  'artifacts',
  'steel-polish-stage4',
)
const PANEL_WIDTH = 300
const PANEL_HEIGHT = 214
const SHEET_MARGIN = 24
const PANEL_GUTTER = 18
const MAP_WIDTH = 300
const MAP_HEIGHT = 214
const DEFAULT_BOUNDS = { x: 0, y: 0, width: 128, height: 96 }
const CHECKPOINTS = [0, 10, 25, 30, 50, 75, 100]
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

function createDiagnosticFrame({
  metalBrushAngle = 12,
  metalPolish = 30,
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

function createActiveBodyPackage({
  activationPolish,
  bounds = DEFAULT_BOUNDS,
  lightVector = { x: 0, y: 0, z: 1 },
  materialSeedKey = 'stage4-diagnostic-image-a',
  materialSeed32 = 0x6a7b8c9d,
  metalPolish = activationPolish ?? 30,
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

  activateArtworkFrameSteelDefectActiveBodyMaps({
    defectDecalMaps: maps,
    frameMask,
    metalPolish: activationPolish ?? frame.metalPolish,
  })

  return {
    frameMask,
    maps,
    placementSet,
  }
}

function getActiveKindsMax(maps, channel, index, kinds) {
  let maxValue = 0
  let maxKind = kinds[0]

  for (const kind of kinds) {
    const value = maps.activeBodies[kind][channel][index] ?? 0

    if (value > maxValue) {
      maxValue = value
      maxKind = kind
    }
  }

  return { kind: maxKind, value: maxValue }
}

function getStableCandidateMax(maps, index, kinds) {
  let maxValue = 0
  let maxKind = kinds[0]

  for (const kind of kinds) {
    const value = maps.stablePlacement[kind].candidateMask[index] ?? 0

    if (value > maxValue) {
      maxValue = value
      maxKind = kind
    }
  }

  return { kind: maxKind, value: maxValue }
}

function getPhysicalContributionGuardValue(maps, index) {
  let value = 0

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
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

function getInactiveZeroGuardValue(maps, index) {
  let value = getPhysicalContributionGuardValue(maps, index)

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    for (const channel of ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS) {
      value = Math.max(
        value,
        Math.abs(maps.activeBodies[kind][channel][index] ?? 0),
      )
    }
  }

  return value
}

function getPanelColor({ channel, diffMaps, kinds, maps, mode }, sourceIndex) {
  if (mode === 'physicalZeroGuard') {
    return getPhysicalContributionGuardValue(maps, sourceIndex) > 0
      ? [255, 40, 40, 255]
      : [5, 8, 10, 255]
  }

  if (mode === 'inactiveZeroGuard') {
    return getInactiveZeroGuardValue(maps, sourceIndex) > 0
      ? [255, 40, 40, 255]
      : [5, 8, 10, 255]
  }

  if (mode === 'stableCandidate') {
    const candidate = getStableCandidateMax(maps, sourceIndex, kinds)

    if (candidate.value <= 0) {
      return [15, 22, 26, 255]
    }

    const kindColor = KIND_COLORS[candidate.kind] ?? [255, 255, 255]
    const intensity = clampNumber(candidate.value, 0, 1)

    return [
      Math.round(kindColor[0] * intensity),
      Math.round(kindColor[1] * intensity),
      Math.round(kindColor[2] * intensity),
      255,
    ]
  }

  const activeChannel = channel ?? 'bodyMask'

  if (mode === 'difference') {
    if (!diffMaps) {
      return [5, 8, 10, 255]
    }

    const before = getActiveKindsMax(
      maps,
      activeChannel,
      sourceIndex,
      kinds,
    ).value
    const after = getActiveKindsMax(
      diffMaps,
      activeChannel,
      sourceIndex,
      kinds,
    ).value
    const diff = clampNumber(Math.abs(before - after) * 2.5, 0, 1)

    return [Math.round(diff * 255), Math.round(diff * 80), 24, 255]
  }

  const active = getActiveKindsMax(maps, activeChannel, sourceIndex, kinds)

  if (active.value <= 0) {
    return [15, 22, 26, 255]
  }

  const kindColor = KIND_COLORS[active.kind] ?? [255, 255, 255]
  const intensity = clampNumber(active.value, 0, 1)

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

function panel(packageData, mode, channel, kinds, accentColor, diffMaps = null) {
  return {
    accentColor,
    channel,
    diffMaps,
    frameMask: packageData.frameMask,
    kinds,
    maps: packageData.maps,
    mode,
  }
}

async function writeManifest(files) {
  await writeFile(
    path.join(ARTIFACT_DIR, 'stage4-diagnostic-package-manifest.json'),
    JSON.stringify({
      files,
      generatedAt: new Date().toISOString(),
      note: [
        'Diagnostic active body mask assets only.',
        'Panels visualize false-color active decal body maps for Stage 4.',
        'These assets are not final shaded steel and do not claim native visual acceptance.',
        'Stable placement candidates may remain populated while inactive active-body masks are exactly zero.',
        'Physical contribution channels are expected to remain zero in every panel.',
      ],
    }, null, 2),
  )
}

await mkdir(ARTIFACT_DIR, { recursive: true })

const checkpointPackages = Object.fromEntries(
  CHECKPOINTS.map((polish) => [
    polish,
    createActiveBodyPackage({ activationPolish: polish, metalPolish: polish }),
  ]),
)
const active30 = createActiveBodyPackage({ activationPolish: 30, metalPolish: 30 })
const lightCenter = createActiveBodyPackage({
  activationPolish: 30,
  lightVector: { x: 0, y: 0, z: 1 },
  metalPolish: 30,
})
const lightBottomLeft = createActiveBodyPackage({
  activationPolish: 30,
  lightVector: { x: -0.70710678, y: -0.70710678, z: 0.000001 },
  metalPolish: 30,
})
const lightTopRight = createActiveBodyPackage({
  activationPolish: 30,
  lightVector: { x: 0.70710678, y: 0.70710678, z: 0.000001 },
  metalPolish: 30,
})
const tarnish0 = createActiveBodyPackage({
  activationPolish: 30,
  metalPolish: 30,
  metalTarnish: 0,
})
const tarnish50 = createActiveBodyPackage({
  activationPolish: 30,
  metalPolish: 30,
  metalTarnish: 50,
})
const tarnish100 = createActiveBodyPackage({
  activationPolish: 30,
  metalPolish: 30,
  metalTarnish: 100,
})
const imageSeedA = createActiveBodyPackage({
  activationPolish: 30,
  materialSeed32: 0x6a7b8c9d,
  materialSeedKey: 'stage4-diagnostic-image-a',
  metalPolish: 30,
})
const imageSeedB = createActiveBodyPackage({
  activationPolish: 30,
  materialSeed32: 0x20394857,
  materialSeedKey: 'stage4-diagnostic-image-b',
  metalPolish: 30,
})
const files = [
  {
    fileName: 'polish-checkpoint-active-body-contact-sheet.png',
    panels: CHECKPOINTS.map((polish) => `${polish}% bodyMask`),
  },
  {
    fileName: 'presence-mask-by-kind-contact-sheet.png',
    panels: ARTWORK_FRAME_STEEL_DEFECT_KINDS.map(
      (kind) => `${kind} presenceMask at 30%`,
    ),
  },
  {
    fileName: 'body-mask-by-kind-contact-sheet.png',
    panels: ARTWORK_FRAME_STEEL_DEFECT_KINDS.map(
      (kind) => `${kind} bodyMask at 30%`,
    ),
  },
  {
    fileName: 'core-mask-by-kind-contact-sheet.png',
    panels: ARTWORK_FRAME_STEEL_DEFECT_KINDS.map(
      (kind) => `${kind} coreMask at 30%`,
    ),
  },
  {
    fileName: 'edge-mask-by-kind-contact-sheet.png',
    panels: ARTWORK_FRAME_STEEL_DEFECT_KINDS.map(
      (kind) => `${kind} edgeMask at 30%`,
    ),
  },
  {
    fileName: 'inactive-zero-guard-contact-sheet.png',
    panels: [
      '100% stable placement candidates',
      '100% inactive active-body zero guard',
      '30% active body reference',
      '30% physical contribution zero guard',
    ],
  },
  {
    fileName: 'same-seed-light-active-body-stability-contact-sheet.png',
    panels: [
      'center light bodyMask',
      'bottom-left light bodyMask',
      'top-right light bodyMask',
      'center vs top-right bodyMask difference',
    ],
  },
  {
    fileName: 'same-seed-tarnish-active-body-stability-contact-sheet.png',
    panels: [
      'tarnish 0 bodyMask',
      'tarnish 50 bodyMask',
      'tarnish 100 bodyMask',
      'tarnish 0 vs 100 bodyMask difference',
    ],
  },
  {
    fileName: 'image-seed-active-body-comparison-contact-sheet.png',
    panels: [
      'image seed A bodyMask',
      'image seed B bodyMask',
      'A vs B bodyMask difference',
      'image seed A presenceMask',
      'image seed B presenceMask',
      'A stable candidates',
      'B stable candidates',
      'physical contribution zero guard',
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
for (const channel of ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS) {
  await drawContactSheet({
    fileName: `${channel.replace('Mask', '').toLowerCase()}-mask-by-kind-contact-sheet.png`,
    panels: ARTWORK_FRAME_STEEL_DEFECT_KINDS.map((kind) =>
      panel(active30, 'active', channel, [kind], KIND_COLORS[kind] ?? [255, 255, 255, 255]),
    ),
  })
}
await drawContactSheet({
  fileName: 'inactive-zero-guard-contact-sheet.png',
  panels: [
    panel(
      checkpointPackages[100],
      'stableCandidate',
      'bodyMask',
      ARTWORK_FRAME_STEEL_DEFECT_KINDS,
      [86, 154, 202, 255],
    ),
    panel(
      checkpointPackages[100],
      'inactiveZeroGuard',
      'bodyMask',
      ARTWORK_FRAME_STEEL_DEFECT_KINDS,
      [230, 80, 80, 255],
    ),
    panel(
      active30,
      'active',
      'bodyMask',
      ARTWORK_FRAME_STEEL_DEFECT_KINDS,
      [86, 154, 202, 255],
    ),
    panel(
      active30,
      'physicalZeroGuard',
      'bodyMask',
      ARTWORK_FRAME_STEEL_DEFECT_KINDS,
      [230, 80, 80, 255],
    ),
  ],
})
await drawContactSheet({
  fileName: 'same-seed-light-active-body-stability-contact-sheet.png',
  panels: [
    panel(lightCenter, 'active', 'bodyMask', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [210, 210, 120, 255]),
    panel(lightBottomLeft, 'active', 'bodyMask', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [120, 170, 230, 255]),
    panel(lightTopRight, 'active', 'bodyMask', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [230, 170, 120, 255]),
    panel(lightCenter, 'difference', 'bodyMask', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [240, 80, 48, 255], lightTopRight.maps),
  ],
})
await drawContactSheet({
  fileName: 'same-seed-tarnish-active-body-stability-contact-sheet.png',
  panels: [
    panel(tarnish0, 'active', 'bodyMask', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [95, 150, 210, 255]),
    panel(tarnish50, 'active', 'bodyMask', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [180, 150, 95, 255]),
    panel(tarnish100, 'active', 'bodyMask', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [210, 95, 65, 255]),
    panel(tarnish0, 'difference', 'bodyMask', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [240, 80, 48, 255], tarnish100.maps),
  ],
})
await drawContactSheet({
  fileName: 'image-seed-active-body-comparison-contact-sheet.png',
  panels: [
    panel(imageSeedA, 'active', 'bodyMask', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [86, 154, 202, 255]),
    panel(imageSeedB, 'active', 'bodyMask', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [215, 136, 86, 255]),
    panel(imageSeedA, 'difference', 'bodyMask', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [240, 80, 48, 255], imageSeedB.maps),
    panel(imageSeedA, 'active', 'presenceMask', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [86, 154, 202, 255]),
    panel(imageSeedB, 'active', 'presenceMask', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [215, 136, 86, 255]),
    panel(imageSeedA, 'stableCandidate', 'bodyMask', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [86, 154, 202, 255]),
    panel(imageSeedB, 'stableCandidate', 'bodyMask', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [215, 136, 86, 255]),
    panel(imageSeedA, 'physicalZeroGuard', 'bodyMask', ARTWORK_FRAME_STEEL_DEFECT_KINDS, [230, 80, 80, 255]),
  ],
})
await writeManifest(files)

for (const { fileName } of files) {
  console.log(path.join(ARTIFACT_DIR, fileName))
}
