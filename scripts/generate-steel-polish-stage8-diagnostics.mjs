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
import {
  buildMetalArtworkFrameMaterialPlan,
  getArtworkFrameCanvasMaterialTextureKey,
  resolveArtworkFrameCanvasMaterialPreviewTexturePixelRatio,
} from '../src/render/artworkFrameMaterialPlan.ts'
import {
  renderArtworkFrameCanvasMaterialTexture,
} from '../src/render/artworkFrameMaterialCanvas.ts'
import {
  createArtworkFrameMaterialShadingCoordinateContext,
  shadeArtworkFrameCanvasMaterialImageData,
} from '../src/render/artworkFrameMaterialShading.ts'
import {
  ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS,
  createArtworkFrameSteelEmptyDefectDecalMaps,
} from '../src/render/artworkFrameSteelDefects.ts'
import {
  buildArtworkFrameSteelFinishDerivedMaps,
  buildArtworkFrameSteelFinishField,
  buildArtworkFrameSteelFinishNormalInputs,
} from '../src/render/artworkFrameSteelFinish.ts'

const ARTIFACT_DIR = path.join(
  process.cwd(),
  'artifacts',
  'steel-polish-stage8',
)
const CHECKPOINTS = [0, 10, 25, 30, 50, 75, 85, 100]
const LOW_MID_CHECKPOINTS = [0, 10, 25, 30, 50]
const NORMALIZED_PREVIEW_BOUNDS = { height: 56.25, width: 100, x: 0, y: 0 }
const DISPLAY_SIZE = { height: 360, width: 640 }
const EXPORT_BOUNDS = { height: 360, width: 640, x: 0, y: 0 }
const LIGHT_VECTOR = createArtworkFrameMaterialHemisphereLightVector({
  x: -0.35,
  y: 0.28,
})
const PANEL_GUTTER = 14
const PANEL_HEIGHT = 124
const PANEL_WIDTH = 220
const SHEET_MARGIN = 22

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function clampByte(value) {
  return clampNumber(Math.round(value), 0, 255)
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

function createMaterialImageData(width, height) {
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

function createDeterministicMaterialCanvas() {
  let canvasElement = null
  let latestImageData = null
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
    }),
    fill: () => {},
    fillRect: () => {},
    getImageData: (_x, _y, width, height) => {
      if (
        latestImageData &&
        latestImageData.width === width &&
        latestImageData.height === height
      ) {
        return cloneImageData(latestImageData)
      }

      return createMaterialImageData(width, height)
    },
    putImageData: (imageData) => {
      latestImageData = cloneImageData(imageData)
    },
    restore: () => {},
    save: () => {},
    scale: () => {},
    stroke: () => {},
    translate: () => {},
  }
  const createCanvas = (width, height) => {
    canvasElement = {
      getContext: (contextId) => contextId === '2d' ? context : null,
      height,
      width,
    }

    return canvasElement
  }

  return {
    createCanvas,
    getCanvas: () => canvasElement,
  }
}

function createDiagnosticFrame({ metalPolish, metalTarnish = 0 }) {
  return {
    color: '#ffffff',
    enabled: true,
    jaggedness: 50,
    lumpiness: 50,
    metalBevelWidth: 64,
    metalBrushAngle: 0,
    metalDepth: 72,
    metalLightAngle: 0,
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

function buildDiagnosticPlan({
  bounds,
  materialSeedKey,
  metalPolish,
  metalTarnish = 0,
  texturePixelRatio,
}) {
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
    lightVector: LIGHT_VECTOR,
    materialSeed: {
      algorithm: 'sha256-image-v1',
      key: materialSeedKey,
      seed32: 0x8d071e55,
    },
    pathData,
    strokeWidth,
    ...(texturePixelRatio ? { texturePixelRatio } : {}),
  })

  if (!plan.canvasTexture?.steelFinishFieldRequest) {
    throw new Error('Expected a canvas steel finish descriptor.')
  }

  return plan
}

function getDisplayTexturePixelRatio() {
  return resolveArtworkFrameCanvasMaterialPreviewTexturePixelRatio({
    devicePixelRatio: 1,
    displaySize: DISPLAY_SIZE,
    logicalSize: NORMALIZED_PREVIEW_BOUNDS,
    qualityMode: 'full',
  })
}

function renderDescriptor(canvasTexture) {
  const canvas = createDeterministicMaterialCanvas()

  return renderArtworkFrameCanvasMaterialTexture(canvasTexture, {
    createCanvas: canvas.createCanvas,
    createPath: (pathData) => ({ pathData }),
  })
}

function buildDisplayPackage(metalPolish) {
  const plan = buildDiagnosticPlan({
    bounds: NORMALIZED_PREVIEW_BOUNDS,
    materialSeedKey: 'stage8-display-preview-diagnostic-image-a',
    metalPolish,
    texturePixelRatio: getDisplayTexturePixelRatio(),
  })
  const rendered = renderDescriptor(plan.canvasTexture)
  const field = buildArtworkFrameSteelFinishField(
    plan.canvasTexture.steelFinishFieldRequest,
  )
  const emptyDefectDecalMaps = createArtworkFrameSteelEmptyDefectDecalMaps({
    frameMask: field.fields.frameMask,
    heightPixels: field.fieldSize.height,
    widthPixels: field.fieldSize.width,
  })
  const decalsDisabledMaps = buildArtworkFrameSteelFinishDerivedMaps(field, {
    defectDecalMaps: emptyDefectDecalMaps,
  })
  const decalsDisabledNormals =
    buildArtworkFrameSteelFinishNormalInputs(decalsDisabledMaps)
  const decalsDisabledImageData = shadeArtworkFrameCanvasMaterialImageData({
    coordinates: createArtworkFrameMaterialShadingCoordinateContext(
      plan.canvasTexture,
    ),
    corrosionMaps: null,
    imageData: createMaterialImageData(
      decalsDisabledMaps.widthPixels,
      decalsDisabledMaps.heightPixels,
    ),
    lighting: plan.canvasTexture.lighting,
    metalBrushAngle: plan.canvasTexture.steelFinishFieldRequest
      .brushAngleDegrees,
    steelFinishMaps: decalsDisabledMaps,
    steelFinishNormalInputs: decalsDisabledNormals,
  })

  return {
    decalsDisabledImageData,
    decalsDisabledMaps,
    field,
    metalPolish,
    plan,
    rendered,
  }
}

function getFrameMask(maps) {
  const frameMask = new Float32Array(maps.widthPixels * maps.heightPixels)

  for (let index = 0; index < frameMask.length; index += 1) {
    frameMask[index] = (maps.steelMetalness[index] ?? 0) > 0 ? 1 : 0
  }

  return frameMask
}

function getImageDataLuminance(imageData, index) {
  const dataIndex = index * 4

  return (imageData.data[dataIndex] ?? 0) * 0.2126 +
    (imageData.data[dataIndex + 1] ?? 0) * 0.7152 +
    (imageData.data[dataIndex + 2] ?? 0) * 0.0722
}

function getIsolatedPositivePeakMask(
  values,
  mask,
  width,
  height,
  { contrastThreshold, valueThreshold },
) {
  const peaks = new Uint8Array(values.length)
  let isolatedPeakCount = 0
  let maxContrast = 0
  let maxValue = 0

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x

      if ((mask[index] ?? 0) <= 0) {
        continue
      }

      const value = values[index] ?? 0

      if (value < valueThreshold) {
        continue
      }

      let neighborCount = 0
      let neighborSum = 0

      maxValue = Math.max(maxValue, value)

      for (let yOffset = -1; yOffset <= 1; yOffset += 1) {
        for (let xOffset = -1; xOffset <= 1; xOffset += 1) {
          if (xOffset === 0 && yOffset === 0) {
            continue
          }

          const neighborIndex = (y + yOffset) * width + x + xOffset

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
        peaks[index] = 1
        isolatedPeakCount += 1
      }
    }
  }

  return {
    isolatedPeakCount,
    maxContrast,
    maxValue,
    peaks,
  }
}

function getSubtlePixelLiftMetrics(imageData, maps) {
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
      const redDelta = (imageData.data[dataIndex] ?? 0) -
        neighborRedSum / neighborCount
      const greenDelta = (imageData.data[dataIndex + 1] ?? 0) -
        neighborGreenSum / neighborCount
      const blueDelta = (imageData.data[dataIndex + 2] ?? 0) -
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

function drawImageDataPanel(sheet, column, row, imageData, maps, accentColor) {
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
      const sourceIndex = sourceY * imageData.width + sourceX
      const dataIndex = sourceIndex * 4
      const mask = maps ? maps.steelMetalness[sourceIndex] ?? 0 : 1

      setPixel(
        sheet,
        origin.x + x,
        origin.y + y,
        mask <= 0 || (imageData.data[dataIndex + 3] ?? 0) <= 0
          ? [5, 8, 10, 255]
          : [
              imageData.data[dataIndex] ?? 0,
              imageData.data[dataIndex + 1] ?? 0,
              imageData.data[dataIndex + 2] ?? 0,
              255,
            ],
      )
    }
  }

  drawPanelBorder(sheet, origin, accentColor)
}

function drawMapPanel({
  accentColor,
  colorAt,
  column,
  height,
  mask,
  row,
  sheet,
  width,
}) {
  const origin = getPanelOrigin(column, row)

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

      setPixel(
        sheet,
        origin.x + x,
        origin.y + y,
        (mask[sourceIndex] ?? 0) <= 0
          ? [5, 8, 10, 255]
          : colorAt(sourceIndex),
      )
    }
  }

  drawPanelBorder(sheet, origin, accentColor)
}

function substrateAlbedoColor(substrateMaps, index) {
  const albedoIndex = index * 3

  return [
    clampByte((substrateMaps.steelSubstrateAlbedo[albedoIndex] ?? 0) * 255),
    clampByte(
      (substrateMaps.steelSubstrateAlbedo[albedoIndex + 1] ?? 0) * 255,
    ),
    clampByte(
      (substrateMaps.steelSubstrateAlbedo[albedoIndex + 2] ?? 0) * 255,
    ),
    255,
  ]
}

function grayscaleDiagnosticColor(value, scale) {
  const channel = clampByte(value * scale)

  return [channel, channel, channel, 255]
}

function peakGuardColor(value, scale, isPeak) {
  if (isPeak) {
    return [255, 42, 42, 255]
  }

  const channel = clampByte(value * scale)

  return [channel, channel, channel, 255]
}

function pitPhysicalColor(defectDecalMaps, index) {
  const pit = defectDecalMaps.physicalContributions.pit
  const value = Math.max(
    ...ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS.map(
      (channel) => pit[channel][index] ?? 0,
    ),
  )

  return [clampByte(value * 255), clampByte(value * 120), 24, 255]
}

function pitBodyColor(defectDecalMaps, index) {
  const pit = defectDecalMaps.activeBodies.pit
  const value = Math.max(
    pit.presenceMask[index] ?? 0,
    pit.bodyMask[index] ?? 0,
    pit.coreMask[index] ?? 0,
    pit.edgeMask[index] ?? 0,
  )

  return [120, clampByte(value * 210), clampByte(value * 255), 255]
}

function visiblePitColor(maps, index) {
  const value = Math.max(
    maps.visiblePitAmbientOcclusionMask[index] ?? 0,
    maps.visiblePitDepthMask[index] ?? 0,
    maps.visiblePitShadowMask[index] ?? 0,
  )

  return [clampByte(value * 255), 88, clampByte(value * 220), 255]
}

function drawTextureSizeComparison(packages, descriptorPackages) {
  const sheet = createSheet(3, 1)

  drawImageDataPanel(
    sheet,
    0,
    0,
    descriptorPackages.normalized.rendered.imageData,
    descriptorPackages.normalized.rendered.steelFinishMaps,
    [96, 140, 190, 255],
  )
  drawImageDataPanel(
    sheet,
    1,
    0,
    descriptorPackages.display.rendered.imageData,
    descriptorPackages.display.rendered.steelFinishMaps,
    [120, 190, 150, 255],
  )
  drawImageDataPanel(
    sheet,
    2,
    0,
    descriptorPackages.exported.rendered.imageData,
    descriptorPackages.exported.rendered.steelFinishMaps,
    [210, 165, 96, 255],
  )

  return writePng(
    path.join(ARTIFACT_DIR, 'texture-size-comparison.png'),
    sheet,
  )
}

function drawSubstrateOnlySheet(packages) {
  const sheet = createSheet(4, 2)

  for (const [index, packageData] of packages.entries()) {
    const substrateMaps = packageData.rendered.steelFinishMaps.substrateMaps
    const mask = getFrameMask(packageData.rendered.steelFinishMaps)

    drawMapPanel({
      accentColor: [110, 160, 220, 255],
      colorAt: (sourceIndex) => substrateAlbedoColor(substrateMaps, sourceIndex),
      column: index % 4,
      height: substrateMaps.heightPixels,
      mask,
      row: Math.floor(index / 4),
      sheet,
      width: substrateMaps.widthPixels,
    })
  }

  return writePng(
    path.join(ARTIFACT_DIR, 'substrate-only-contact-sheet.png'),
    sheet,
  )
}

function drawFinalShadedSteelSheet(packages) {
  const sheet = createSheet(4, 2)

  for (const [index, packageData] of packages.entries()) {
    drawImageDataPanel(
      sheet,
      index % 4,
      Math.floor(index / 4),
      packageData.rendered.imageData,
      packageData.rendered.steelFinishMaps,
      [182, 200, 210, 255],
    )
  }

  return writePng(
    path.join(ARTIFACT_DIR, 'final-shaded-steel-contact-sheet.png'),
    sheet,
  )
}

function drawDecalComparisonSheet(packages) {
  const sheet = createSheet(2, CHECKPOINTS.length)

  for (const [row, packageData] of packages.entries()) {
    drawImageDataPanel(
      sheet,
      0,
      row,
      packageData.decalsDisabledImageData,
      packageData.decalsDisabledMaps,
      [112, 170, 210, 255],
    )
    drawImageDataPanel(
      sheet,
      1,
      row,
      packageData.rendered.imageData,
      packageData.rendered.steelFinishMaps,
      [210, 150, 100, 255],
    )
  }

  return writePng(
    path.join(ARTIFACT_DIR, 'decals-disabled-enabled-contact-sheet.png'),
    sheet,
  )
}

function drawNoDotGuardSheet(packages, metrics) {
  const sheet = createSheet(3, LOW_MID_CHECKPOINTS.length)

  for (const [row, packageData] of packages.entries()) {
    const maps = packageData.rendered.steelFinishMaps
    const substrateMaps = maps.substrateMaps
    const mask = getFrameMask(maps)
    const heightDepressions = new Float32Array(
      substrateMaps.steelSubstrateHeight.length,
    )

    for (let index = 0; index < heightDepressions.length; index += 1) {
      heightDepressions[index] = Math.max(
        0,
        -(substrateMaps.steelSubstrateHeight[index] ?? 0),
      )
    }

    const aoPeaks = getIsolatedPositivePeakMask(
      substrateMaps.steelSubstrateAmbientOcclusion,
      mask,
      substrateMaps.widthPixels,
      substrateMaps.heightPixels,
      { contrastThreshold: 0.004, valueThreshold: 0.008 },
    )
    const heightPeaks = getIsolatedPositivePeakMask(
      heightDepressions,
      mask,
      substrateMaps.widthPixels,
      substrateMaps.heightPixels,
      { contrastThreshold: 0.0035, valueThreshold: 0.004 },
    )
    const normalPeaks = getIsolatedPositivePeakMask(
      substrateMaps.steelSubstrateNormalStrength,
      mask,
      substrateMaps.widthPixels,
      substrateMaps.heightPixels,
      { contrastThreshold: 0.005, valueThreshold: 0.01 },
    )

    metrics[`${packageData.metalPolish}%`] = {
      aoIsolatedPeaks: aoPeaks.isolatedPeakCount,
      heightIsolatedPeaks: heightPeaks.isolatedPeakCount,
      normalStrengthIsolatedPeaks: normalPeaks.isolatedPeakCount,
      subtleLift: getSubtlePixelLiftMetrics(
        packageData.rendered.imageData,
        maps,
      ),
    }

    drawMapPanel({
      accentColor: [190, 120, 100, 255],
      colorAt: (sourceIndex) => peakGuardColor(
        substrateMaps.steelSubstrateAmbientOcclusion[sourceIndex] ?? 0,
        2200,
        aoPeaks.peaks[sourceIndex] === 1,
      ),
      column: 0,
      height: substrateMaps.heightPixels,
      mask,
      row,
      sheet,
      width: substrateMaps.widthPixels,
    })
    drawMapPanel({
      accentColor: [190, 150, 100, 255],
      colorAt: (sourceIndex) => peakGuardColor(
        heightDepressions[sourceIndex] ?? 0,
        3200,
        heightPeaks.peaks[sourceIndex] === 1,
      ),
      column: 1,
      height: substrateMaps.heightPixels,
      mask,
      row,
      sheet,
      width: substrateMaps.widthPixels,
    })
    drawMapPanel({
      accentColor: [150, 120, 220, 255],
      colorAt: (sourceIndex) => peakGuardColor(
        substrateMaps.steelSubstrateNormalStrength[sourceIndex] ?? 0,
        760,
        normalPeaks.peaks[sourceIndex] === 1,
      ),
      column: 2,
      height: substrateMaps.heightPixels,
      mask,
      row,
      sheet,
      width: substrateMaps.widthPixels,
    })
  }

  return writePng(
    path.join(ARTIFACT_DIR, 'no-dot-guard-contact-sheet.png'),
    sheet,
  )
}

function drawPitOwnershipSheet(packages) {
  const sheet = createSheet(3, LOW_MID_CHECKPOINTS.length)

  for (const [row, packageData] of packages.entries()) {
    const maps = packageData.rendered.steelFinishMaps
    const mask = getFrameMask(maps)

    drawMapPanel({
      accentColor: [82, 168, 210, 255],
      colorAt: (sourceIndex) =>
        pitBodyColor(maps.defectDecalMaps, sourceIndex),
      column: 0,
      height: maps.heightPixels,
      mask,
      row,
      sheet,
      width: maps.widthPixels,
    })
    drawMapPanel({
      accentColor: [220, 124, 74, 255],
      colorAt: (sourceIndex) =>
        pitPhysicalColor(maps.defectDecalMaps, sourceIndex),
      column: 1,
      height: maps.heightPixels,
      mask,
      row,
      sheet,
      width: maps.widthPixels,
    })
    drawMapPanel({
      accentColor: [180, 118, 210, 255],
      colorAt: (sourceIndex) => visiblePitColor(maps, sourceIndex),
      column: 2,
      height: maps.heightPixels,
      mask,
      row,
      sheet,
      width: maps.widthPixels,
    })
  }

  return writePng(
    path.join(ARTIFACT_DIR, 'active-pit-ownership-contact-sheet.png'),
    sheet,
  )
}

function drawDescriptorComparisonSheet(descriptorPackages) {
  const sheet = createSheet(3, 1)

  for (
    const [column, packageData] of [
      descriptorPackages.normalized,
      descriptorPackages.display,
      descriptorPackages.exported,
    ].entries()
  ) {
    const maps = packageData.rendered.steelFinishMaps
    const mask = getFrameMask(maps)

    drawMapPanel({
      accentColor: column === 0
        ? [96, 140, 190, 255]
        : column === 1
          ? [120, 190, 150, 255]
          : [210, 165, 96, 255],
      colorAt: (sourceIndex) => grayscaleDiagnosticColor(
        maps.brushedGrainMask[sourceIndex] ?? 0,
        255,
      ),
      column,
      height: maps.heightPixels,
      mask,
      row: 0,
      sheet,
      width: maps.widthPixels,
    })
  }

  return writePng(
    path.join(ARTIFACT_DIR, 'preview-export-descriptor-comparison.png'),
    sheet,
  )
}

function drawFrameRingClippingGuardSheet(packages, metrics) {
  const sheet = createSheet(4, 2)

  for (const [index, packageData] of packages.entries()) {
    const maps = packageData.rendered.steelFinishMaps
    const mask = getFrameMask(maps)
    let leakCount = 0

    drawMapPanel({
      accentColor: [190, 220, 130, 255],
      colorAt: (sourceIndex) => {
        const inside = (mask[sourceIndex] ?? 0) > 0
        const substrateValue = Math.max(
          Math.abs(
            maps.substrateMaps.steelSubstrateHeight[sourceIndex] ?? 0,
          ),
          maps.substrateMaps.steelSubstrateAmbientOcclusion[sourceIndex] ?? 0,
          maps.substrateMaps.steelSubstrateRoughness[sourceIndex] ?? 0,
          maps.substrateMaps.steelSubstrateGloss[sourceIndex] ?? 0,
        )
        const finalAlpha =
          (packageData.rendered.imageData.data[sourceIndex * 4 + 3] ?? 0) /
          255
        const value = Math.max(substrateValue, finalAlpha)

        if (!inside && value > 0.000001) {
          leakCount += 1
          return [255, 28, 28, 255]
        }

        return inside ? [76, 136, 112, 255] : [5, 8, 10, 255]
      },
      column: index % 4,
      height: maps.heightPixels,
      mask: new Float32Array(mask.length).fill(1),
      row: Math.floor(index / 4),
      sheet,
      width: maps.widthPixels,
    })

    metrics[`${packageData.metalPolish}%`] = {
      leakCount,
    }
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

function getDescriptorSummary(packageData) {
  const descriptor = packageData.plan.canvasTexture

  return {
    cacheKey: getArtworkFrameCanvasMaterialTextureKey(descriptor),
    corrosionGeometrySeedKey:
      descriptor.corrosionFieldRequest?.geometrySeedKey ?? null,
    materialSeedKey: descriptor.materialSeed?.key ?? null,
    steelFinishGeometrySeedKey:
      descriptor.steelFinishFieldRequest?.geometrySeedKey ?? null,
    textureBounds: descriptor.bounds,
    textureSize: descriptor.textureSize,
  }
}

async function writeManifest({
  descriptorPackages,
  files,
  noDotMetrics,
  ringLeakMetrics,
}) {
  const descriptorComparison = {
    displayPreview: getDescriptorSummary(descriptorPackages.display),
    export: getDescriptorSummary(descriptorPackages.exported),
    normalizedPreview: getDescriptorSummary(descriptorPackages.normalized),
  }

  await writeFile(
    path.join(ARTIFACT_DIR, 'preview-export-descriptor-comparison.json'),
    JSON.stringify(descriptorComparison, null, 2),
  )
  await writeFile(
    path.join(ARTIFACT_DIR, 'stage8-diagnostic-package-manifest.json'),
    JSON.stringify(
      {
        checkpoints: CHECKPOINTS,
        descriptorComparison,
        displaySize: DISPLAY_SIZE,
        files: [
          ...files,
          'preview-export-descriptor-comparison.json',
          'stage8-diagnostic-package-manifest.json',
        ],
        fixedVisualizationRanges: {
          aoGuardScale: 'AO value * 2200, red = isolated peak',
          heightDepressionGuardScale:
            'negative substrate height * 3200, red = isolated peak',
          normalStrengthGuardScale:
            'substrate normal strength * 760, red = isolated peak',
          substrateAlbedo: 'raw substrate albedo RGB, no normalization',
        },
        generatedAt: new Date().toISOString(),
        noDotMetrics,
        normalizedPreviewBounds: NORMALIZED_PREVIEW_BOUNDS,
        note: [
          'Stage 8 diagnostics only. These generated sheets are not native Tauri visual acceptance.',
          'Flat steel, flat bezel, tarnish 0 unless otherwise implied by descriptor labels.',
          'No-dot guard panels use fixed thresholds and fixed color scales; red pixels mark isolated peak detections.',
          'Substrate-only panels show raw substrate albedo maps, while decals disabled/enabled panels show shaded steel.',
        ],
        ringLeakMetrics,
      },
      null,
      2,
    ),
  )
}

async function main() {
  await mkdir(ARTIFACT_DIR, { recursive: true })

  const packages = CHECKPOINTS.map((metalPolish) =>
    buildDisplayPackage(metalPolish),
  )
  const descriptorPackages = {
    display: packages.find(({ metalPolish }) => metalPolish === 50),
    exported: (() => {
      const plan = buildDiagnosticPlan({
        bounds: EXPORT_BOUNDS,
        materialSeedKey: 'stage8-display-preview-diagnostic-image-a',
        metalPolish: 50,
      })

      return {
        metalPolish: 50,
        plan,
        rendered: renderDescriptor(plan.canvasTexture),
      }
    })(),
    normalized: (() => {
      const plan = buildDiagnosticPlan({
        bounds: NORMALIZED_PREVIEW_BOUNDS,
        materialSeedKey: 'stage8-display-preview-diagnostic-image-a',
        metalPolish: 50,
      })

      return {
        metalPolish: 50,
        plan,
        rendered: renderDescriptor(plan.canvasTexture),
      }
    })(),
  }
  const noDotMetrics = {}
  const ringLeakMetrics = {}
  const files = [
    'texture-size-comparison.png',
    'substrate-only-contact-sheet.png',
    'decals-disabled-enabled-contact-sheet.png',
    'final-shaded-steel-contact-sheet.png',
    'no-dot-guard-contact-sheet.png',
    'active-pit-ownership-contact-sheet.png',
    'preview-export-descriptor-comparison.png',
    'frame-ring-clipping-guard-contact-sheet.png',
  ]

  await drawTextureSizeComparison(packages, descriptorPackages)
  await drawSubstrateOnlySheet(packages)
  await drawDecalComparisonSheet(packages)
  await drawFinalShadedSteelSheet(packages)
  await drawNoDotGuardSheet(
    packages.filter(({ metalPolish }) =>
      LOW_MID_CHECKPOINTS.includes(metalPolish),
    ),
    noDotMetrics,
  )
  await drawPitOwnershipSheet(
    packages.filter(({ metalPolish }) =>
      LOW_MID_CHECKPOINTS.includes(metalPolish),
    ),
  )
  await drawDescriptorComparisonSheet(descriptorPackages)
  await drawFrameRingClippingGuardSheet(packages, ringLeakMetrics)
  await writeManifest({
    descriptorPackages,
    files,
    noDotMetrics,
    ringLeakMetrics,
  })

  console.log(`Generated Stage 8 diagnostics in ${ARTIFACT_DIR}`)
}

await main()
