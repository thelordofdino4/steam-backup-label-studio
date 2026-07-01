import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { deflateSync } from 'node:zlib'
import {
  createMetalArtworkFramePathData,
  getArtworkFrameStrokeWidth,
} from '../src/render/artworkFrame.ts'
import {
  createArtworkFrameMaterialHemisphereLightVector,
} from '../src/render/artworkFrameMaterialLighting.ts'
import { buildMetalArtworkFrameMaterialPlan } from '../src/render/artworkFrameMaterialPlan.ts'
import {
  buildArtworkFrameSteelFinishField,
  buildArtworkFrameSteelSubstrateDerivedMaps,
  buildArtworkFrameSteelSubstrateField,
} from '../src/render/artworkFrameSteelFinish.ts'
import {
  ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS,
  activateArtworkFrameSteelDefectActiveBodyMaps,
  createArtworkFrameSteelDefectPlacementSet,
  populateArtworkFrameSteelDefectPhysicalContributionMaps,
  rasterizeArtworkFrameSteelDefectStablePlacementMaps,
} from '../src/render/artworkFrameSteelDefects.ts'

const ARTIFACT_DIR = path.join(
  process.cwd(),
  'artifacts',
  'steel-polish-stage6-5',
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
const PANEL_GUTTER = 18
const PANEL_HEIGHT = 214
const PANEL_WIDTH = 300
const SHEET_MARGIN = 24

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

function createDiagnosticFrame(metalPolish) {
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

function getBrushDirection(angleDegrees) {
  const radians = angleDegrees * Math.PI / 180

  return {
    angleDegrees,
    tangentX: Math.cos(radians),
    tangentY: Math.sin(radians),
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

function createSubstratePackage({ lightPosition, metalPolish }) {
  const frame = createDiagnosticFrame(metalPolish)
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
      key: 'stage6-5-substrate-diagnostic-image-a',
      seed32: 0x6a5b4c3d,
    },
    pathData,
    strokeWidth,
  })

  if (!plan.canvasTexture?.steelFinishFieldRequest) {
    throw new Error('Expected a steel finish field request for diagnostics.')
  }

  const steelField = buildArtworkFrameSteelFinishField(
    plan.canvasTexture.steelFinishFieldRequest,
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
  const normals = buildSubstrateNormalDiagnostics(
    substrateMaps,
    steelField.fields.frameMask,
  )
  const shaded = shadeSubstrateOnly({
    frameMask: steelField.fields.frameMask,
    lightVector,
    maps: substrateMaps,
    normals,
  })

  return {
    defectDecalMaps,
    frameMask: steelField.fields.frameMask,
    height: substrateMaps.heightPixels,
    label: `${metalPolish}% ${getLightLabel(lightPosition)}`,
    lightVector,
    maps: substrateMaps,
    metalPolish,
    normals,
    shaded,
    width: substrateMaps.widthPixels,
  }
}

function getLightLabel(position) {
  const match = LIGHT_POSITIONS.find(
    (entry) => entry.position.x === position.x && entry.position.y === position.y,
  )

  return match?.label ?? 'custom'
}

function buildSubstrateNormalDiagnostics(maps, frameMask) {
  const length = maps.widthPixels * maps.heightPixels
  const normalX = new Float32Array(length)
  const normalY = new Float32Array(length)
  const normalZ = new Float32Array(length)
  const height = maps.steelSubstrateHeight
  const width = maps.widthPixels
  const heightPixels = maps.heightPixels

  for (let y = 0; y < heightPixels; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x
      const mask = frameMask[index] ?? 0

      if (mask <= 0) {
        continue
      }

      const left = height[y * width + Math.max(0, x - 1)] ?? 0
      const right = height[y * width + Math.min(width - 1, x + 1)] ?? 0
      const up = height[Math.max(0, y - 1) * width + x] ?? 0
      const down = height[Math.min(heightPixels - 1, y + 1) * width + x] ?? 0
      const strength = maps.steelSubstrateNormalStrength[index] ?? 0
      const dx = (right - left) * 34 * strength
      const dy = (down - up) * 34 * strength
      const nx = -dx
      const ny = -dy
      const nz = 1
      const lengthValue = Math.hypot(nx, ny, nz) || 1

      normalX[index] = nx / lengthValue
      normalY[index] = ny / lengthValue
      normalZ[index] = nz / lengthValue
    }
  }

  return { normalX, normalY, normalZ }
}

function shadeSubstrateOnly({ frameMask, lightVector, maps, normals }) {
  const image = createImage(maps.widthPixels, maps.heightPixels)
  const lightX = lightVector.x
  const lightY = -lightVector.y
  const lightZ = lightVector.z

  for (let index = 0; index < maps.widthPixels * maps.heightPixels; index += 1) {
    const mask = frameMask[index] ?? 0

    if (mask <= 0) {
      continue
    }

    const dataIndex = index * 4
    const normalLight = clampNumber(
      (normals.normalX[index] ?? 0) * lightX +
        (normals.normalY[index] ?? 0) * lightY +
        (normals.normalZ[index] ?? 1) * lightZ,
      0,
      1,
    )
    const roughness = maps.steelSubstrateRoughness[index] ?? 0
    const gloss = maps.steelSubstrateGloss[index] ?? 0
    const ao = maps.steelSubstrateAmbientOcclusion[index] ?? 0
    const anisotropy = maps.steelSubstrateAnisotropy[index] ?? 0
    const tangentX = maps.steelSubstrateAnisotropyDirectionX[index] ?? 0
    const tangentY = maps.steelSubstrateAnisotropyDirectionY[index] ?? 0
    const tangentLength = Math.hypot(tangentX, tangentY) || 1
    const unitTangentX = tangentX / tangentLength
    const unitTangentY = tangentY / tangentLength
    const tangentLight = clampNumber(
      lightX * unitTangentX + lightY * unitTangentY,
      -1,
      1,
    )
    const acrossTangentLight = clampNumber(
      lightX * -unitTangentY + lightY * unitTangentX,
      -1,
      1,
    )
    const anisotropic = getDiagnosticAnisotropicSubstrateShade({
      acrossTangentLight,
      anisotropy,
      gloss,
      grain: maps.steelSubstrateMicroStrandMask[index] ?? 0,
      haze: maps.steelSubstratePlateHaze[index] ?? 0,
      lightVector,
      normalLight,
      reflectionVeil: maps.steelSubstrateReflectionVeil[index] ?? 0,
      roughness,
      tangentLight,
    })
    const diffuse = 0.28 + normalLight * (0.56 - roughness * 0.18)
    const highlight = Math.pow(normalLight, 8 + roughness * 20) *
      gloss *
      (0.18 + anisotropy * 0.18)
    const shade = clampNumber(
      diffuse +
        anisotropic.diffuseBand +
        highlight +
        anisotropic.coherentHighlight -
        anisotropic.shadow -
        ao * 0.48,
      0,
      1.18,
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

function getDiagnosticAnisotropicSubstrateShade({
  acrossTangentLight,
  anisotropy,
  gloss,
  grain,
  haze,
  lightVector,
  normalLight,
  reflectionVeil,
  roughness,
  tangentLight,
}) {
  const alongRoughness = clampNumber(
    roughness * (1 - anisotropy * 0.22),
    0.018,
    1,
  )
  const crossRoughness = clampNumber(
    roughness * (1 + anisotropy * 0.32),
    0.018,
    1,
  )
  const aspect = clampNumber((crossRoughness - alongRoughness) * 1.65, 0, 1)
  const directional = clampNumber(Math.hypot(lightVector.x, lightVector.y), 0, 1)
  const broadness = clampNumber(aspect * 0.7 + (1 - roughness) * 0.3, 0, 1)
  const lobe = Math.pow(
    clampNumber(1 - Math.abs(acrossTangentLight), 0, 1),
    interpolate(2.6, 1.05, broadness),
  ) * clampNumber(1 - Math.abs(tangentLight) * 0.28, 0, 1) *
    anisotropy *
    directional
  const source = clampNumber(
    normalLight * interpolate(0.58, 0.42, broadness) +
      lobe * interpolate(0.42, 0.62, broadness),
    0,
    1,
  )
  const coherentHighlight = Math.pow(source, interpolate(9.5, 4.6, broadness)) *
    gloss *
    (1 - roughness * 0.34) *
    (0.18 + anisotropy * 0.28)
  const diffuseBand = (
    (reflectionVeil - 0.5) * interpolate(0.12, 0.22, broadness) +
    (haze - 0.5) * interpolate(0.025, 0.055, broadness) +
    (grain - 0.52) * interpolate(0.035, 0.02, broadness)
  ) * lobe * (1 - roughness * 0.18)
  const shadow = Math.max(0, -acrossTangentLight) *
    lobe *
    roughness *
    interpolate(0.035, 0.018, broadness)

  return {
    coherentHighlight,
    diffuseBand,
    shadow,
  }
}

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)))
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
  return clampNumber((value - range.min) / Math.max(0.000001, range.max - range.min), 0, 1)
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

function grayscaleColor(value) {
  const byte = clampByte(value * 255)

  return [byte, byte, byte, 255]
}

function albedoColor(packageData, sourceIndex) {
  const dataIndex = sourceIndex * 3

  return [
    clampByte((packageData.maps.steelSubstrateAlbedo[dataIndex] ?? 0) * 255),
    clampByte((packageData.maps.steelSubstrateAlbedo[dataIndex + 1] ?? 0) * 255),
    clampByte((packageData.maps.steelSubstrateAlbedo[dataIndex + 2] ?? 0) * 255),
    255,
  ]
}

function anisotropyColor(packageData, sourceIndex) {
  const x = packageData.maps.steelSubstrateAnisotropyDirectionX[sourceIndex] ?? 0
  const y = packageData.maps.steelSubstrateAnisotropyDirectionY[sourceIndex] ?? 0
  const aspect = packageData.maps.steelSubstrateAnisotropy[sourceIndex] ?? 0
  const angle = Math.atan2(y, x)
  const hue = (angle + Math.PI) / (Math.PI * 2)
  const [r, g, b] = hsvToRgb(hue, 0.72, 0.24 + aspect * 0.76)

  return [r, g, b, 255]
}

function normalColor(packageData, sourceIndex) {
  return [
    clampByte(((packageData.normals.normalX[sourceIndex] ?? 0) * 0.5 + 0.5) * 255),
    clampByte(((packageData.normals.normalY[sourceIndex] ?? 0) * 0.5 + 0.5) * 255),
    clampByte(((packageData.normals.normalZ[sourceIndex] ?? 1) * 0.5 + 0.5) * 255),
    255,
  ]
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
  const { frameMask, height, maps, width } = packageData

  if ((frameMask[sourceIndex] ?? 0) <= 0) {
    return 0
  }

  const ao = maps.steelSubstrateAmbientOcclusion[sourceIndex] ?? 0
  const heightValue = maps.steelSubstrateHeight[sourceIndex] ?? 0
  const normalStrength = maps.steelSubstrateNormalStrength[sourceIndex] ?? 0
  const aoMean = getLocalNeighborMean(
    maps.steelSubstrateAmbientOcclusion,
    frameMask,
    width,
    height,
    sourceIndex,
  )
  const heightMean = getLocalNeighborMean(
    maps.steelSubstrateHeight,
    frameMask,
    width,
    height,
    sourceIndex,
  )
  const normalMean = getLocalNeighborMean(
    maps.steelSubstrateNormalStrength,
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

function speckleGuardColor(packageData, sourceIndex) {
  const score = getSubstrateSpeckleScore(packageData, sourceIndex)

  if (score <= 0.000001) {
    return [4, 8, 10, 255]
  }

  return [
    clampByte(22 + score * 233),
    clampByte(78 + score * 152),
    clampByte(118 - score * 68),
    255,
  ]
}

function getPitPhysicalContribution(packageData, sourceIndex) {
  let value = 0

  for (const channel of ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS) {
    value = Math.max(
      value,
      Math.abs(
        packageData.defectDecalMaps.physicalContributions.pit[channel][
          sourceIndex
        ] ?? 0,
      ),
    )
  }

  return value
}

function activePitDecalColor(packageData, sourceIndex) {
  const stable = packageData.defectDecalMaps.stablePlacement.pit.candidateMask[
    sourceIndex
  ] ?? 0
  const active = Math.max(
    packageData.defectDecalMaps.activeBodies.pit.presenceMask[sourceIndex] ?? 0,
    packageData.defectDecalMaps.activeBodies.pit.bodyMask[sourceIndex] ?? 0,
    packageData.defectDecalMaps.activeBodies.pit.coreMask[sourceIndex] ?? 0,
    packageData.defectDecalMaps.activeBodies.pit.edgeMask[sourceIndex] ?? 0,
  )
  const physical = getPitPhysicalContribution(packageData, sourceIndex)

  if (physical > 0) {
    const value = clampNumber(physical, 0, 1)

    return [
      clampByte(92 + value * 163),
      clampByte(50 + value * 172),
      clampByte(10 + value * 86),
      255,
    ]
  }

  if (active > 0) {
    const value = clampNumber(active, 0, 1)

    return [
      clampByte(42 + value * 158),
      clampByte(34 + value * 110),
      clampByte(92 + value * 163),
      255,
    ]
  }

  if (stable > 0) {
    const value = clampNumber(stable, 0, 1)

    return [
      clampByte(8 + value * 42),
      clampByte(24 + value * 56),
      clampByte(54 + value * 96),
      255,
    ]
  }

  return [4, 8, 10, 255]
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
    r = x
    b = c
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

function drawPanel(sheet, column, row, packageData, colorAt) {
  const origin = getPanelOrigin(column, row)

  fillRect(sheet, origin.x, origin.y, PANEL_WIDTH, PANEL_HEIGHT, [
    13,
    17,
    20,
    255,
  ])

  for (let py = 0; py < PANEL_HEIGHT; py += 1) {
    const sourceY = Math.floor((py / PANEL_HEIGHT) * packageData.height)

    for (let px = 0; px < PANEL_WIDTH; px += 1) {
      const sourceX = Math.floor((px / PANEL_WIDTH) * packageData.width)
      const sourceIndex = sourceY * packageData.width + sourceX

      if ((packageData.frameMask[sourceIndex] ?? 0) <= 0) {
        continue
      }

      setPixel(
        sheet,
        origin.x + px,
        origin.y + py,
        colorAt(packageData, sourceIndex),
      )
    }
  }
}

function drawImagePanel(sheet, column, row, packageData) {
  drawPanel(sheet, column, row, packageData, (current, sourceIndex) => {
    const dataIndex = sourceIndex * 4

    return [
      current.shaded.data[dataIndex] ?? 0,
      current.shaded.data[dataIndex + 1] ?? 0,
      current.shaded.data[dataIndex + 2] ?? 0,
      255,
    ]
  })
}

function drawGridContactSheet({ colorAt, fileName, packages }) {
  const sheet = createSheet(LIGHT_POSITIONS.length, CHECKPOINTS.length)

  for (const [index, packageData] of packages.entries()) {
    drawPanel(
      sheet,
      index % LIGHT_POSITIONS.length,
      Math.floor(index / LIGHT_POSITIONS.length),
      packageData,
      colorAt,
    )
  }

  return writePng(path.join(ARTIFACT_DIR, fileName), sheet)
}

function drawShadedContactSheet({ fileName, packages }) {
  const sheet = createSheet(LIGHT_POSITIONS.length, CHECKPOINTS.length)

  for (const [index, packageData] of packages.entries()) {
    drawImagePanel(
      sheet,
      index % LIGHT_POSITIONS.length,
      Math.floor(index / LIGHT_POSITIONS.length),
      packageData,
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

async function writeManifest(files) {
  await writeFile(
    path.join(ARTIFACT_DIR, 'stage6-5-substrate-diagnostic-package-manifest.json'),
    JSON.stringify({
      checkpoints: CHECKPOINTS,
      files,
      generatedAt: new Date().toISOString(),
      lightPositions: LIGHT_POSITIONS.map(({ label }) => label),
      note: [
        'Diagnostic Stage 6.5 substrate-only visual package.',
        'Panels cover polish 0, 10, 25, 30, and 50 across overhead, 45-degree, and grazing light positions.',
        'False-color sheets show substrate maps only: albedo, height, AO, roughness, gloss, anisotropy direction/aspect, and diagnostic normals.',
        'Substrate AO and speckle guard sheets are diagnostic false-color views; AO is normalized or locally exaggerated to make regressions visible, not to represent final color.',
        'The substrate speckle guard uses fixed local AO/height/normal contrast thresholds so dots cannot be hidden by changing only the visualization range.',
        'The active pit decal sheet separates stable pit candidates, active pit bodies, and physical pit response from substrate maps.',
        'Substrate-only shaded steel disables active decals and sets tarnish to 0; it is diagnostic-only and does not change production rendering.',
        'These generated assets do not store copyrighted reference images and do not claim native Tauri visual acceptance.',
      ],
    }, null, 2),
  )
}

function createPanelLabels(labelPrefix) {
  return CHECKPOINTS.flatMap((polish) =>
    LIGHT_POSITIONS.map(({ label }) => `${polish}% ${label} ${labelPrefix}`),
  )
}

await mkdir(ARTIFACT_DIR, { recursive: true })

const substratePackages = CHECKPOINTS.flatMap((metalPolish) =>
  LIGHT_POSITIONS.map(({ position }) =>
    createSubstratePackage({
      lightPosition: position,
      metalPolish,
    }),
  ),
)
const heightRange = getScalarRange(
  substratePackages,
  (packageData) => packageData.maps.steelSubstrateHeight,
)
const aoRange = getScalarRange(
  substratePackages,
  (packageData) => packageData.maps.steelSubstrateAmbientOcclusion,
)
const roughnessRange = getScalarRange(
  substratePackages,
  (packageData) => packageData.maps.steelSubstrateRoughness,
)
const glossRange = getScalarRange(
  substratePackages,
  (packageData) => packageData.maps.steelSubstrateGloss,
)
const files = [
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
    fileName: 'substrate-speckle-guard-contact-sheet.png',
    panels: createPanelLabels(
      'fixed-threshold substrate speckle guard; hot pixels mean local AO/height/normal dot contrast',
    ),
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
    fileName: 'substrate-anisotropy-contact-sheet.png',
    panels: createPanelLabels('false-color anisotropy direction/aspect'),
  },
  {
    fileName: 'substrate-normals-contact-sheet.png',
    panels: createPanelLabels('diagnostic substrate normals'),
  },
  {
    fileName: 'substrate-only-shaded-steel-contact-sheet.png',
    panels: createPanelLabels('substrate-only shaded steel'),
  },
  {
    fileName: 'active-pit-decal-diagnostic-contact-sheet.png',
    panels: createPanelLabels(
      'active pit decal ownership; blue stable candidates, purple active bodies, amber physical response',
    ),
  },
]

await drawGridContactSheet({
  colorAt: albedoColor,
  fileName: files[0].fileName,
  packages: substratePackages,
})
await drawGridContactSheet({
  colorAt: (packageData, sourceIndex) =>
    heightColor(packageData.maps.steelSubstrateHeight[sourceIndex] ?? 0, heightRange),
  fileName: files[1].fileName,
  packages: substratePackages,
})
await drawGridContactSheet({
  colorAt: (packageData, sourceIndex) =>
    grayscaleColor(
      normalizeRange(
        packageData.maps.steelSubstrateAmbientOcclusion[sourceIndex] ?? 0,
        aoRange,
      ),
    ),
  fileName: files[2].fileName,
  packages: substratePackages,
})
await drawGridContactSheet({
  colorAt: speckleGuardColor,
  fileName: files[3].fileName,
  packages: substratePackages,
})
await drawGridContactSheet({
  colorAt: (packageData, sourceIndex) =>
    grayscaleColor(
      normalizeRange(
        packageData.maps.steelSubstrateRoughness[sourceIndex] ?? 0,
        roughnessRange,
      ),
    ),
  fileName: files[4].fileName,
  packages: substratePackages,
})
await drawGridContactSheet({
  colorAt: (packageData, sourceIndex) =>
    grayscaleColor(
      normalizeRange(
        packageData.maps.steelSubstrateGloss[sourceIndex] ?? 0,
        glossRange,
      ),
    ),
  fileName: files[5].fileName,
  packages: substratePackages,
})
await drawGridContactSheet({
  colorAt: anisotropyColor,
  fileName: files[6].fileName,
  packages: substratePackages,
})
await drawGridContactSheet({
  colorAt: normalColor,
  fileName: files[7].fileName,
  packages: substratePackages,
})
await drawShadedContactSheet({
  fileName: files[8].fileName,
  packages: substratePackages,
})
await drawGridContactSheet({
  colorAt: activePitDecalColor,
  fileName: files[9].fileName,
  packages: substratePackages,
})
await writeManifest(files)

console.log(`Wrote Stage 6.5 substrate diagnostics to ${ARTIFACT_DIR}`)
