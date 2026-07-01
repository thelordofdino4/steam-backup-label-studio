import { createMetalArtworkFramePathData, getArtworkFrameStrokeWidth } from '../src/render/artworkFrame.ts'
import { renderArtworkFrameCanvasMaterialTexture } from '../src/render/artworkFrameMaterialCanvas.ts'
import { buildMetalArtworkFrameMaterialPlan } from '../src/render/artworkFrameMaterialPlan.ts'
import { createArtworkFrameMaterialPerformanceCollector } from '../src/render/artworkFrameMaterialPerformance.ts'

function createMaterialTestImageData(width, height) {
  const data = new Uint8ClampedArray(width * height * 4)

  for (let index = 0; index < width * height; index += 1) {
    const x = index % width
    const y = Math.floor(index / width)
    const dataIndex = index * 4

    data[dataIndex] = 116 + Math.round((x / Math.max(1, width - 1)) * 42)
    data[dataIndex + 1] = 124 + Math.round((y / Math.max(1, height - 1)) * 34)
    data[dataIndex + 2] = 128 +
      Math.round(((x + y) / Math.max(1, width + height - 2)) * 24)
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
    colorSpace: imageData.colorSpace,
    data: new Uint8ClampedArray(imageData.data),
    height: imageData.height,
    width: imageData.width,
  }
}

function createDiagnosticMaterialCanvas() {
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
    createLinearGradient: () => ({ addColorStop: () => {} }),
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

      return createMaterialTestImageData(width, height)
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

  return {
    createCanvas: (width, height) => ({
      getContext: (contextId) => contextId === '2d' ? context : null,
      height,
      width,
    }),
  }
}

const frame = {
  color: '#ffffff',
  enabled: true,
  jaggedness: 50,
  lumpiness: 50,
  metalBevelWidth: 64,
  metalBrushAngle: 12,
  metalDepth: 72,
  metalLightAngle: 0,
  metalPattern: 'none',
  metalPatternScale: 90,
  metalPatternStrength: 55,
  metalPolish: 42,
  metalProfile: 'flat',
  metalTarnish: 80,
  metalType: 'steel',
  roughnessOffset: 0,
  shape: 'rectangle',
  style: 'metal',
  width: 8,
}
const bounds = { x: 12, y: 20, width: 240, height: 160 }
const materialSeed = {
  algorithm: 'sha256-image-v1',
  key: 'sha256-image-v1:diagnostic-material-timing',
  seed32: 0xd1a65057,
}
const strokeWidth = getArtworkFrameStrokeWidth(
  frame,
  bounds.width,
  bounds.height,
)
const pathData = createMetalArtworkFramePathData(frame, bounds, strokeWidth)
const performance = createArtworkFrameMaterialPerformanceCollector()
const plan = buildMetalArtworkFrameMaterialPlan({
  bounds,
  clipPathData: pathData,
  frame,
  materialSeed,
  pathData,
  performance,
  strokeWidth,
})

if (!plan.canvasTexture) {
  throw new Error('Expected a canvas material texture descriptor.')
}

const canvas = createDiagnosticMaterialCanvas()
const rendered = renderArtworkFrameCanvasMaterialTexture(plan.canvasTexture, {
  createCanvas: canvas.createCanvas,
  createPath: (sourcePath) => ({ sourcePath }),
  performance,
})

console.log(JSON.stringify({
  cacheKey: rendered.cacheKey,
  textureSize: {
    height: rendered.height,
    scale: rendered.scale,
    width: rendered.width,
  },
  timings: performance.getSummary(),
}, null, 2))
