import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'
import {
  buildArtworkFrameCorrosionField,
  createArtworkFrameCorrosionFieldRequest,
  summarizeArtworkFrameCorrosionScalarField,
} from '../../src/render/artworkFrameCorrosionField.ts'
import {
  buildArtworkFrameCorrosionDerivedMaps,
  shadeArtworkFrameCorrosionImageData,
} from '../../src/render/artworkFrameCorrosionMaps.ts'
import { getArtworkFrameStrokeWidth } from '../../src/render/artworkFrame.ts'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const packageDir = join(
  repoRoot,
  'artifacts',
  'seed-uncoupling-visual-verification',
  'package-2026-06-27',
)
const panelsDir = join(packageDir, 'panels')
const sheetsDir = join(packageDir, 'sheets')

mkdirSync(panelsDir, { recursive: true })
mkdirSync(sheetsDir, { recursive: true })

const FRAME_WIDTH = 320
const FRAME_HEIGHT = 220
const MAP_STRIP_HEIGHT = 38
const PANEL_WIDTH = FRAME_WIDTH
const PANEL_HEIGHT = FRAME_HEIGHT + 8 + MAP_STRIP_HEIGHT
const SHEET_PADDING = 22
const SHEET_GAP = 18
const SVG_LABEL_HEIGHT = 58

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function smoothStep(min, max, value) {
  if (min === max) {
    return value >= max ? 1 : 0
  }

  const unit = clamp((value - min) / (max - min), 0, 1)
  return unit * unit * (3 - 2 * unit)
}

function interpolate(a, b, t) {
  return a + (b - a) * t
}

function hashUnit(seed, x, y = 0) {
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

function valueNoise2d(seed, x, y, frequency) {
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

function createImageSeed(payload) {
  const digest = createHash('sha256').update(payload).digest()
  const digestHex = digest.toString('hex')

  return {
    algorithm: 'sha256-image-v1',
    key: `sha256-image-v1:${digestHex}`,
    seed32: digest.readUInt32BE(0),
  }
}

function createBaseFrame(overrides = {}) {
  return {
    enabled: true,
    color: '#ffffff',
    width: 15,
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
    metalPolish: 50,
    metalTarnish: 80,
    metalPatternScale: 90,
    metalPatternStrength: 55,
    ...overrides,
  }
}

function hashFloatArray(array) {
  return createHash('sha256')
    .update(Buffer.from(array.buffer, array.byteOffset, array.byteLength))
    .digest('hex')
}

function hashByteArray(array) {
  return createHash('sha256').update(Buffer.from(array)).digest('hex')
}

function hashScalarFields(fields, includeStageCoverage) {
  const hash = createHash('sha256')
  const names = [
    'cellularPitCenters',
    'corrosionPotential',
    'defectExposure',
    'edgeExposure',
    'frameMask',
    'moistureBasins',
    'protectedMetalIslands',
  ]

  if (includeStageCoverage) {
    names.push('stageCoverage')
  }

  for (const name of names) {
    hash.update(name)
    const field = fields[name]
    hash.update(Buffer.from(field.buffer, field.byteOffset, field.byteLength))
  }

  return hash.digest('hex')
}

function hashDerivedMaps(maps) {
  const hash = createHash('sha256')
  const names = [
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
  ]

  for (const name of names) {
    const field = maps[name]
    hash.update(name)
    hash.update(Buffer.from(field.buffer, field.byteOffset, field.byteLength))
  }

  return hash.digest('hex')
}

function createBaseSteelImageData(field, maps) {
  const width = field.fieldSize.width
  const height = field.fieldSize.height
  const data = new Uint8ClampedArray(width * height * 4)
  const frame = field.frame
  const polishUnit = clamp(frame.metalPolish / 100, 0, 1)
  const roughUnit = 1 - smoothStep(0.16, 0.92, polishUnit)
  const brushAngle = frame.metalBrushAngle * Math.PI / 180
  const lightAngle = frame.metalLightAngle * Math.PI / 180
  const lightX = Math.cos(lightAngle)
  const lightY = Math.sin(lightAngle)

  for (let y = 0; y < height; y += 1) {
    const yUnit = height <= 1 ? 0 : y / (height - 1)

    for (let x = 0; x < width; x += 1) {
      const index = y * width + x
      const dataIndex = index * 4
      const mask = field.fields.frameMask[index] ?? 0

      if (mask <= 0) {
        data[dataIndex] = 0
        data[dataIndex + 1] = 0
        data[dataIndex + 2] = 0
        data[dataIndex + 3] = 0
        continue
      }

      const xUnit = width <= 1 ? 0 : x / (width - 1)
      const along = xUnit * Math.cos(brushAngle) + yUnit * Math.sin(brushAngle)
      const across = -xUnit * Math.sin(brushAngle) + yUnit * Math.cos(brushAngle)
      const fine = valueNoise2d(field.geometrySeed + 7001, along, across, 92)
      const broad = valueNoise2d(field.geometrySeed + 7103, xUnit, yUnit, 5.5)
      const grain = Math.sin(along * 660 + fine * 8) *
        (7 + roughUnit * 8 - polishUnit * 3)
      const scuff = (fine - 0.5) * roughUnit * 34
      const brushedBand = (broad - 0.5) * (16 + roughUnit * 10)
      const highlightAxis = xUnit * lightX + yUnit * lightY
      const polishHighlight =
        Math.pow(Math.max(0, Math.cos((highlightAxis - across * 0.18) * 6.4)), 7) *
        polishUnit *
        50
      const edgeLift = (field.fields.edgeExposure[index] ?? 0) * 15
      const exposedChip = smoothStep(0.72, 0.94, maps.metalExposure[index] ?? 1) *
        smoothStep(0.03, 0.2, (maps.flakeMask[index] ?? 0) +
          (maps.crackMask[index] ?? 0) * 0.45)
      const value = clamp(
        103 +
          polishUnit * 43 +
          grain +
          scuff +
          brushedBand +
          polishHighlight +
          edgeLift +
          exposedChip * 36,
        38,
        235,
      )

      data[dataIndex] = clamp(Math.round(value * 0.94), 0, 255)
      data[dataIndex + 1] = clamp(Math.round(value * 1.0), 0, 255)
      data[dataIndex + 2] = clamp(Math.round(value * 1.05), 0, 255)
      data[dataIndex + 3] = 255
    }
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
    colorSpace: imageData.colorSpace,
    data: new Uint8ClampedArray(imageData.data),
    height: imageData.height,
    width: imageData.width,
  }
}

function compositePixel(target, index, red, green, blue, alpha) {
  const inverseAlpha = 1 - alpha

  target[index] = Math.round(red * alpha + target[index] * inverseAlpha)
  target[index + 1] = Math.round(green * alpha + target[index + 1] * inverseAlpha)
  target[index + 2] = Math.round(blue * alpha + target[index + 2] * inverseAlpha)
  target[index + 3] = 255
}

function createChecker(width, height) {
  const data = new Uint8ClampedArray(width * height * 4)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4
      const check = (Math.floor(x / 12) + Math.floor(y / 12)) % 2
      const value = check ? 222 : 242

      data[index] = value
      data[index + 1] = value
      data[index + 2] = value
      data[index + 3] = 255
    }
  }

  return data
}

function createCombinedPanel(imageData, field, maps) {
  const data = createChecker(PANEL_WIDTH, PANEL_HEIGHT)

  for (let y = 0; y < FRAME_HEIGHT; y += 1) {
    for (let x = 0; x < FRAME_WIDTH; x += 1) {
      const sourceIndex = (y * FRAME_WIDTH + x) * 4
      const targetIndex = sourceIndex
      const alpha = (imageData.data[sourceIndex + 3] ?? 0) / 255

      if (alpha <= 0) {
        continue
      }

      compositePixel(
        data,
        targetIndex,
        imageData.data[sourceIndex] ?? 0,
        imageData.data[sourceIndex + 1] ?? 0,
        imageData.data[sourceIndex + 2] ?? 0,
        alpha,
      )
    }
  }

  const stripTop = FRAME_HEIGHT + 8

  for (let y = 0; y < MAP_STRIP_HEIGHT; y += 1) {
    const sourceY = Math.round((y / Math.max(1, MAP_STRIP_HEIGHT - 1)) *
      (FRAME_HEIGHT - 1))

    for (let x = 0; x < FRAME_WIDTH; x += 1) {
      const sourceIndex = sourceY * FRAME_WIDTH + x
      const targetIndex = ((stripTop + y) * PANEL_WIDTH + x) * 4
      const mask = field.fields.frameMask[sourceIndex] ?? 0
      const coverage = field.fields.stageCoverage[sourceIndex] ?? 0
      const potential = field.fields.corrosionPotential[sourceIndex] ?? 0
      const pores = maps.poreMask[sourceIndex] ?? 0
      const flakes = maps.flakeMask[sourceIndex] ?? 0

      if (mask <= 0) {
        data[targetIndex] = 244
        data[targetIndex + 1] = 244
        data[targetIndex + 2] = 244
        data[targetIndex + 3] = 255
        continue
      }

      const heat = clamp(coverage * 0.72 + potential * 0.2 + pores * 0.08, 0, 1)

      data[targetIndex] = Math.round(44 + heat * 210)
      data[targetIndex + 1] = Math.round(52 + heat * 94 + flakes * 34)
      data[targetIndex + 2] = Math.round(62 - heat * 28)
      data[targetIndex + 3] = 255
    }
  }

  for (let x = 0; x < PANEL_WIDTH; x += 1) {
    const dividerIndex = ((FRAME_HEIGHT + 3) * PANEL_WIDTH + x) * 4

    data[dividerIndex] = 70
    data[dividerIndex + 1] = 80
    data[dividerIndex + 2] = 88
    data[dividerIndex + 3] = 255
  }

  return {
    data,
    height: PANEL_HEIGHT,
    width: PANEL_WIDTH,
  }
}

function makeCrcTable() {
  const table = new Uint32Array(256)

  for (let index = 0; index < table.length; index += 1) {
    let value = index

    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    }

    table[index] = value >>> 0
  }

  return table
}

const CRC_TABLE = makeCrcTable()

function crc32(buffer) {
  let crc = 0xffffffff

  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }

  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type, payload) {
  const typeBuffer = Buffer.from(type, 'ascii')
  const length = Buffer.alloc(4)
  const crc = Buffer.alloc(4)
  const body = Buffer.concat([typeBuffer, payload])

  length.writeUInt32BE(payload.length, 0)
  crc.writeUInt32BE(crc32(body), 0)

  return Buffer.concat([length, body, crc])
}

function encodePng({ data, width, height }) {
  const signature = Buffer.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
  ])
  const ihdr = Buffer.alloc(13)

  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const raw = Buffer.alloc((width * 4 + 1) * height)

  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1)

    raw[rowStart] = 0
    Buffer.from(data.buffer, data.byteOffset + y * width * 4, width * 4)
      .copy(raw, rowStart + 1)
  }

  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

function writePng(filePath, image) {
  writeFileSync(filePath, encodePng(image))
}

function renderPanel({ frame, label, materialSeed, slug }) {
  const bounds = { x: 0, y: 0, width: FRAME_WIDTH, height: FRAME_HEIGHT }
  const strokeWidth = getArtworkFrameStrokeWidth(
    frame,
    bounds.width,
    bounds.height,
  )
  const request = createArtworkFrameCorrosionFieldRequest({
    bounds,
    frame,
    materialSeed,
    strokeWidth,
    textureSize: { height: FRAME_HEIGHT, width: FRAME_WIDTH },
  })

  if (!request) {
    throw new Error(`Could not build corrosion request for ${label}`)
  }

  const field = buildArtworkFrameCorrosionField(request)
  const maps = buildArtworkFrameCorrosionDerivedMaps(field)
  const baseImageData = createBaseSteelImageData(field, maps)
  const shadedImageData = shadeArtworkFrameCorrosionImageData(
    cloneImageData(baseImageData),
    maps,
    { metalLightAngle: frame.metalLightAngle },
  )
  const panel = createCombinedPanel(shadedImageData, field, maps)
  const panelPath = join(panelsDir, `${slug}.png`)

  writePng(panelPath, panel)

  let outsideAlphaPixels = 0
  let outsideRustPixels = 0
  let framePixels = 0

  for (let index = 0; index < field.fields.frameMask.length; index += 1) {
    const mask = field.fields.frameMask[index] ?? 0
    const alpha = shadedImageData.data[index * 4 + 3] ?? 0
    const rustPresence = (field.fields.stageCoverage[index] ?? 0) +
      (maps.ambientOcclusion[index] ?? 0) +
      (maps.poreMask[index] ?? 0) +
      (maps.flakeMask[index] ?? 0) +
      (maps.crackMask[index] ?? 0) +
      (maps.flakeUndercutAO[index] ?? 0)

    if (mask > 0) {
      framePixels += 1
    } else {
      if (alpha > 0) {
        outsideAlphaPixels += 1
      }

      if (rustPresence > 0.001) {
        outsideRustPixels += 1
      }
    }
  }

  return {
    coverageHash: hashFloatArray(field.fields.stageCoverage),
    coverageMean: summarizeArtworkFrameCorrosionScalarField(
      field.fields.stageCoverage,
    ).mean,
    derivedMapsHash: hashDerivedMaps(maps),
    framePixels,
    geometryHash: hashScalarFields(field.fields, false),
    imageHash: hashByteArray(shadedImageData.data),
    label,
    materialSeedKey: materialSeed.key,
    outsideAlphaPixels,
    outsideRustPixels,
    panel,
    panelPath,
    requestGeometrySeedKey: request.geometrySeedKey,
    scalarHash: hashScalarFields(field.fields, true),
    slug,
  }
}

function composeSheetPng(panels, slug, columns) {
  const rows = Math.ceil(panels.length / columns)
  const width = SHEET_PADDING * 2 + columns * PANEL_WIDTH +
    (columns - 1) * SHEET_GAP
  const height = SHEET_PADDING * 2 + rows * PANEL_HEIGHT +
    (rows - 1) * SHEET_GAP
  const data = createChecker(width, height)

  for (let panelIndex = 0; panelIndex < panels.length; panelIndex += 1) {
    const panel = panels[panelIndex].panel
    const column = panelIndex % columns
    const row = Math.floor(panelIndex / columns)
    const offsetX = SHEET_PADDING + column * (PANEL_WIDTH + SHEET_GAP)
    const offsetY = SHEET_PADDING + row * (PANEL_HEIGHT + SHEET_GAP)

    for (let y = 0; y < PANEL_HEIGHT; y += 1) {
      for (let x = 0; x < PANEL_WIDTH; x += 1) {
        const sourceIndex = (y * PANEL_WIDTH + x) * 4
        const targetIndex = ((offsetY + y) * width + offsetX + x) * 4

        data[targetIndex] = panel.data[sourceIndex] ?? 0
        data[targetIndex + 1] = panel.data[sourceIndex + 1] ?? 0
        data[targetIndex + 2] = panel.data[sourceIndex + 2] ?? 0
        data[targetIndex + 3] = 255
      }
    }
  }

  const sheetPath = join(sheetsDir, `${slug}.png`)

  writePng(sheetPath, { data, height, width })

  return sheetPath
}

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function writeSvgSheet({ acceptance, columns, description, panels, slug, title }) {
  const rows = Math.ceil(panels.length / columns)
  const width = SHEET_PADDING * 2 + columns * PANEL_WIDTH +
    (columns - 1) * SHEET_GAP
  const height = SHEET_PADDING * 2 + rows * (PANEL_HEIGHT + SVG_LABEL_HEIGHT) +
    (rows - 1) * SHEET_GAP + 92
  const acceptanceText = acceptance.join(' | ')
  const body = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    '<style>',
    'text{font-family:Arial,Helvetica,sans-serif;fill:#172028}',
    '.title{font-size:22px;font-weight:700}',
    '.desc{font-size:13px;fill:#42505c}',
    '.label{font-size:13px;font-weight:700}',
    '.meta{font-size:11px;fill:#596673}',
    '.card{fill:#f8fafb;stroke:#c8d0d7;stroke-width:1}',
    '</style>',
    `<rect width="100%" height="100%" fill="#eef2f4"/>`,
    `<text x="${SHEET_PADDING}" y="30" class="title">${escapeXml(title)}</text>`,
    `<text x="${SHEET_PADDING}" y="52" class="desc">${escapeXml(description)}</text>`,
    `<text x="${SHEET_PADDING}" y="72" class="meta">${escapeXml(acceptanceText)}</text>`,
  ]

  for (let panelIndex = 0; panelIndex < panels.length; panelIndex += 1) {
    const panel = panels[panelIndex]
    const column = panelIndex % columns
    const row = Math.floor(panelIndex / columns)
    const x = SHEET_PADDING + column * (PANEL_WIDTH + SHEET_GAP)
    const y = 98 + row * (PANEL_HEIGHT + SVG_LABEL_HEIGHT + SHEET_GAP)
    const base64 = encodePng(panel.panel).toString('base64')

    body.push(
      `<rect class="card" x="${x - 8}" y="${y - 28}" width="${PANEL_WIDTH + 16}" height="${PANEL_HEIGHT + SVG_LABEL_HEIGHT - 4}" rx="6"/>`,
      `<text x="${x}" y="${y - 10}" class="label">${escapeXml(panel.label)}</text>`,
      `<image x="${x}" y="${y}" width="${PANEL_WIDTH}" height="${PANEL_HEIGHT}" href="data:image/png;base64,${base64}"/>`,
      `<text x="${x}" y="${y + PANEL_HEIGHT + 18}" class="meta">coverage mean ${panel.coverageMean.toFixed(4)} | geometry ${panel.geometryHash.slice(0, 10)} | image ${panel.imageHash.slice(0, 10)}</text>`,
    )
  }

  body.push('</svg>')

  const sheetPath = join(sheetsDir, `${slug}.svg`)

  writeFileSync(sheetPath, body.join('\n'))

  return sheetPath
}

function createSheet({ acceptance, columns, cases, description, slug, title }) {
  const panels = cases.map((testCase) => renderPanel(testCase))
  const pngPath = composeSheetPng(panels, slug, columns)
  const svgPath = writeSvgSheet({
    acceptance,
    columns,
    description,
    panels,
    slug,
    title,
  })

  return {
    acceptance,
    description,
    panels: panels.map(({ panel, ...panelInfo }) => panelInfo),
    pngPath,
    slug,
    svgPath,
    title,
  }
}

const imageSeedA = createImageSeed(
  'seed-uncoupling-visual-verification:image-a:steel-frame-artwork',
)
const imageSeedB = createImageSeed(
  'seed-uncoupling-visual-verification:image-b:alternate-artwork',
)

const sheets = []

sheets.push(createSheet({
  acceptance: [
    'Same image seed and tarnish',
    'Rust placement should stay anchored',
    'Finish, roughness, and highlight response may change',
  ],
  columns: 3,
  description: 'Same image seed, tarnish 80, polish values 0, 50, and 100.',
  slug: '01-polish-0-50-100-same-image',
  title: 'Polish Response Without Rust Reseeding',
  cases: [0, 50, 100].map((metalPolish) => ({
    frame: createBaseFrame({ metalLightAngle: 315, metalPolish, metalTarnish: 80 }),
    label: `polish ${metalPolish}`,
    materialSeed: imageSeedA,
    slug: `polish-${metalPolish}`,
  })),
}))

sheets.push(createSheet({
  acceptance: [
    'Same image seed and polish',
    'Coverage should grow over stable corrosion sites',
    'No large unrelated placement jump between tarnish stages',
  ],
  columns: 3,
  description: 'Same image seed, polish 50, tarnish values 15, 30, 45, 65, 80, and 100.',
  slug: '02-tarnish-15-30-45-65-80-100-same-image',
  title: 'Tarnish Stage Growth Over Stable Geometry',
  cases: [15, 30, 45, 65, 80, 100].map((metalTarnish) => ({
    frame: createBaseFrame({ metalLightAngle: 315, metalPolish: 50, metalTarnish }),
    label: `tarnish ${metalTarnish}`,
    materialSeed: imageSeedA,
    slug: `tarnish-${metalTarnish}`,
  })),
}))

sheets.push(createSheet({
  acceptance: [
    'Same image seed, polish, and tarnish',
    'Fields and maps should stay fixed',
    'Only final shading should change with light angle',
  ],
  columns: 3,
  description: 'Same image seed, polish 65, tarnish 88, light angles 0, 90, and 180.',
  slug: '03-light-0-90-180-same-image',
  title: 'Light Angle Shading Only',
  cases: [0, 90, 180].map((metalLightAngle) => ({
    frame: createBaseFrame({ metalLightAngle, metalPolish: 65, metalTarnish: 88 }),
    label: `light ${metalLightAngle} deg`,
    materialSeed: imageSeedA,
    slug: `light-${metalLightAngle}`,
  })),
}))

sheets.push(createSheet({
  acceptance: [
    'Same frame settings',
    'Different image seeds should produce different rust placement',
    'Frame clipping should still prevent bleed',
  ],
  columns: 2,
  description: 'Two different image-derived SHA-256 seeds at the same frame settings.',
  slug: '04-different-images-same-settings',
  title: 'Different Images Produce Different Placement',
  cases: [
    {
      frame: createBaseFrame({ metalLightAngle: 315, metalPolish: 50, metalTarnish: 80 }),
      label: 'image seed A',
      materialSeed: imageSeedA,
      slug: 'image-a',
    },
    {
      frame: createBaseFrame({ metalLightAngle: 315, metalPolish: 50, metalTarnish: 80 }),
      label: 'image seed B',
      materialSeed: imageSeedB,
      slug: 'image-b',
    },
  ],
}))

const polishSheet = sheets[0]
const tarnishSheet = sheets[1]
const lightSheet = sheets[2]
const imageSheet = sheets[3]

const manifest = {
  generatedAt: new Date().toISOString(),
  generator: 'artifacts/seed-uncoupling-visual-verification/generate-contact-sheets.mjs',
  notes: [
    'Panels use the real corrosion field, derived maps, normal pass, and software shading.',
    'Each panel includes a shaded frame plus a bottom strip visualizing stage coverage and corrosion potential clipped to the frame mask.',
    'This package is diagnostic and does not claim native Tauri preview/export manual verification.',
  ],
  packageDir,
  seeds: {
    imageSeedA,
    imageSeedB,
  },
  acceptanceAudit: {
    differentImagesMovePlacement:
      imageSheet.panels[0].geometryHash !== imageSheet.panels[1].geometryHash &&
      imageSheet.panels[0].coverageHash !== imageSheet.panels[1].coverageHash,
    lightChangesFinalPixelsOnly:
      new Set(lightSheet.panels.map((panel) => panel.scalarHash)).size === 1 &&
      new Set(lightSheet.panels.map((panel) => panel.derivedMapsHash)).size === 1 &&
      new Set(lightSheet.panels.map((panel) => panel.imageHash)).size > 1,
    noRustOrAlphaBleed: sheets.every((sheet) =>
      sheet.panels.every((panel) =>
        panel.outsideAlphaPixels === 0 && panel.outsideRustPixels === 0
      )
    ),
    polishKeepsPlacementStable:
      new Set(polishSheet.panels.map((panel) => panel.scalarHash)).size === 1,
    tarnishKeepsGeometryStable:
      new Set(tarnishSheet.panels.map((panel) => panel.geometryHash)).size === 1,
    tarnishGrowsCoverage:
      tarnishSheet.panels.every((panel, index, panels) =>
        index === 0 || panel.coverageMean >= panels[index - 1].coverageMean
      ) &&
      tarnishSheet.panels[tarnishSheet.panels.length - 1].coverageMean >
        tarnishSheet.panels[0].coverageMean,
  },
  sheets: sheets.map(({ acceptance, description, panels, pngPath, slug, svgPath, title }) => ({
    acceptance,
    description,
    panels,
    pngPath,
    slug,
    svgPath,
    title,
  })),
}

const html = [
  '<!doctype html>',
  '<html lang="en">',
  '<head>',
  '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1">',
  '<title>Seed Uncoupling Visual Verification</title>',
  '<style>',
  'body{font-family:Arial,Helvetica,sans-serif;background:#eef2f4;color:#172028;margin:24px;line-height:1.45}',
  'h1{font-size:26px;margin:0 0 8px}',
  'h2{font-size:18px;margin:28px 0 8px}',
  '.audit{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;margin:18px 0}',
  '.pass{background:#f7fbf8;border:1px solid #a8d4b6;padding:10px;border-radius:6px}',
  '.fail{background:#fff7f7;border:1px solid #e0a8a8;padding:10px;border-radius:6px}',
  'img{max-width:100%;height:auto;border:1px solid #c8d0d7;background:#fff}',
  'code{background:#dde5ea;padding:2px 4px;border-radius:3px}',
  '</style>',
  '</head>',
  '<body>',
  '<h1>Seed Uncoupling Visual Verification</h1>',
  '<p>Generated contact sheets for image-derived corrosion seed behavior. PNG sheets are label-free raster companions; SVG sheets include labels and metrics.</p>',
  '<div class="audit">',
  ...Object.entries(manifest.acceptanceAudit).map(([key, value]) =>
    `<div class="${value ? 'pass' : 'fail'}"><strong>${escapeXml(key)}</strong><br>${value ? 'PASS' : 'FAIL'}</div>`
  ),
  '</div>',
  ...sheets.flatMap((sheet) => [
    `<h2>${escapeXml(sheet.title)}</h2>`,
    `<p>${escapeXml(sheet.description)}</p>`,
    `<p><code>${escapeXml(sheet.svgPath)}</code></p>`,
    `<img src="${escapeXml(`sheets/${sheet.slug}.svg`)}" alt="${escapeXml(sheet.title)}">`,
  ]),
  '</body>',
  '</html>',
]

writeFileSync(join(packageDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
writeFileSync(join(packageDir, 'index.html'), html.join('\n'))

console.log(JSON.stringify({
  acceptanceAudit: manifest.acceptanceAudit,
  index: join(packageDir, 'index.html'),
  manifest: join(packageDir, 'manifest.json'),
  packageDir,
  sheets: sheets.map((sheet) => ({
    pngPath: sheet.pngPath,
    slug: sheet.slug,
    svgPath: sheet.svgPath,
  })),
}, null, 2))
