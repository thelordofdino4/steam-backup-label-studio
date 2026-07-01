import {
  getArtworkFrameCanvasMaterialTextureKey,
  type ArtworkFrameCanvasMaterialTextureDescriptor,
} from './artworkFrameMaterialPlan.ts'
import {
  measureArtworkFrameMaterialPerformance,
  type ArtworkFrameMaterialPerformanceRecorder,
} from './artworkFrameMaterialPerformance.ts'
import {
  buildArtworkFrameCorrosionField,
  type ArtworkFrameCorrosionField,
  type ArtworkFrameCorrosionFieldRequest,
} from './artworkFrameCorrosionField.ts'
import {
  buildArtworkFrameCorrosionDerivedMaps,
  type ArtworkFrameCorrosionDerivedMaps,
} from './artworkFrameCorrosionMaps.ts'
import {
  activateArtworkFrameSteelDefectActiveBodyMaps,
  createArtworkFrameSteelDefectPlacementSet,
  populateArtworkFrameSteelDefectPhysicalContributionMaps,
  rasterizeArtworkFrameSteelDefectStablePlacementMaps,
} from './artworkFrameSteelDefects.ts'
import {
  createArtworkFrameMaterialShadingCoordinateContext,
  shadeArtworkFrameCanvasMaterialImageData,
  type ArtworkFrameCanvasMaterialShadingPayload,
} from './artworkFrameMaterialShading.ts'
import {
  buildArtworkFrameSteelFinishDerivedMaps,
  buildArtworkFrameSteelFinishField,
  buildArtworkFrameSteelFinishNormalInputs,
  getArtworkFrameSteelFinishFieldRequestKey,
  type ArtworkFrameSteelFinishDerivedMaps,
  type ArtworkFrameSteelFinishField,
  type ArtworkFrameSteelFinishFieldRequest,
  type ArtworkFrameSteelFinishNormalInputs,
} from './artworkFrameSteelFinish.ts'

export type ArtworkFrameMaterialCanvasSource =
  | HTMLCanvasElement
  | OffscreenCanvas

export type RenderedArtworkFrameMaterialCanvasTexture = {
  cacheKey: string
  canvas: ArtworkFrameMaterialCanvasSource
  corrosionMaps: ArtworkFrameCorrosionDerivedMaps | null
  descriptor: ArtworkFrameCanvasMaterialTextureDescriptor
  height: number
  imageData: ImageData
  imageSource: ArtworkFrameMaterialCanvasSource
  scale: number
  steelFinishMaps?: ArtworkFrameSteelFinishDerivedMaps | null
  steelFinishNormalInputs?: ArtworkFrameSteelFinishNormalInputs | null
  width: number
}

export type ArtworkFrameMaterialCanvasTextureCache = Map<
  string,
  RenderedArtworkFrameMaterialCanvasTexture
>

export type ArtworkFrameMaterialCanvasMaterialCache = {
  corrosionDerivedMaps: Map<string, ArtworkFrameCorrosionDerivedMaps>
  corrosionFields: Map<string, ArtworkFrameCorrosionField>
  finalShadedPixels: Map<string, ImageData>
  steelFinishDerivedMaps: Map<string, ArtworkFrameSteelFinishDerivedMaps>
  steelFinishFields: Map<string, ArtworkFrameSteelFinishField>
  steelFinishNormalInputs: Map<string, ArtworkFrameSteelFinishNormalInputs>
}

export type ArtworkFrameMaterialCanvasFactory = (
  width: number,
  height: number,
) => ArtworkFrameMaterialCanvasSource

export type ArtworkFrameMaterialPathFactory = (pathData: string) => Path2D

export type ArtworkFrameMaterialCanvasRenderOptions = {
  cache?: ArtworkFrameMaterialCanvasTextureCache
  createCanvas?: ArtworkFrameMaterialCanvasFactory
  createPath?: ArtworkFrameMaterialPathFactory
  materialCache?: ArtworkFrameMaterialCanvasMaterialCache
  performance?: ArtworkFrameMaterialPerformanceRecorder | null
}

type ArtworkFrameMaterialCanvasRenderingContext =
  | CanvasRenderingContext2D
  | OffscreenCanvasRenderingContext2D

export type ArtworkFrameMaterialCanvasShadingResolver = (
  payload: ArtworkFrameCanvasMaterialShadingPayload,
) => ImageData | Promise<ImageData>

type PreparedArtworkFrameCanvasMaterialTexture = {
  cacheKey: string
  canvas: ArtworkFrameMaterialCanvasSource
  context: ArtworkFrameMaterialCanvasRenderingContext
  corrosionMaps: ArtworkFrameCorrosionDerivedMaps | null
  framePath: Path2D
  height: number
  originalAlpha: number
  scale: number
  sourceImageData: ImageData
  steelFinishMaps: ArtworkFrameSteelFinishDerivedMaps | null
  steelFinishNormalInputs: ArtworkFrameSteelFinishNormalInputs | null
  width: number
}

type RectLike = {
  height: number
  width: number
  x: number
  y: number
}

function formatCacheNumber(value: number) {
  return Number.isFinite(value) ? value.toFixed(3) : '0.000'
}

function getCorrosionStageUnitsKey(
  stageUnits: ArtworkFrameCorrosionFieldRequest['stageUnits'],
) {
  return [
    `clean:${formatCacheNumber(stageUnits.clean)}`,
    `seed:${formatCacheNumber(stageUnits.seed)}`,
    `young:${formatCacheNumber(stageUnits.young)}`,
    `patch:${formatCacheNumber(stageUnits.patch)}`,
    `scale:${formatCacheNumber(stageUnits.scale)}`,
    `flake:${formatCacheNumber(stageUnits.flake)}`,
    `advanced:${formatCacheNumber(stageUnits.advanced)}`,
  ].join(',')
}

function areRectsEqual(a: RectLike, b: RectLike) {
  return a.x === b.x &&
    a.y === b.y &&
    a.width === b.width &&
    a.height === b.height
}

function isCorrosionFieldCompatible(
  field: ArtworkFrameCorrosionField,
  request: ArtworkFrameCorrosionFieldRequest,
) {
  return field.fieldSize.width === request.fieldSize.width &&
    field.fieldSize.height === request.fieldSize.height &&
    field.strokeWidth === request.strokeWidth &&
    field.tarnishUnit === request.tarnishUnit &&
    areRectsEqual(field.bounds, request.bounds) &&
    areRectsEqual(field.samplingBounds, request.samplingBounds)
}

function isSteelFinishFieldCompatible(
  field: ArtworkFrameSteelFinishField,
  request: ArtworkFrameSteelFinishFieldRequest,
) {
  return field.fieldSize.width === request.fieldSize.width &&
    field.fieldSize.height === request.fieldSize.height &&
    field.brushAngleDegrees === request.brushAngleDegrees &&
    field.strokeWidth === request.strokeWidth &&
    areRectsEqual(field.bounds, request.bounds) &&
    areRectsEqual(field.samplingBounds, request.samplingBounds)
}

function cloneImageData(imageData: ImageData): ImageData {
  return {
    colorSpace: imageData.colorSpace,
    data: new Uint8ClampedArray(imageData.data),
    height: imageData.height,
    width: imageData.width,
  } as ImageData
}

function withCorrosionFieldRequest(
  field: ArtworkFrameCorrosionField,
  request: ArtworkFrameCorrosionFieldRequest,
): ArtworkFrameCorrosionField {
  return {
    ...request,
    fields: field.fields,
  }
}

function withSteelFinishFieldRequest(
  field: ArtworkFrameSteelFinishField,
  request: ArtworkFrameSteelFinishFieldRequest,
): ArtworkFrameSteelFinishField {
  return {
    ...request,
    fields: field.fields,
  }
}

export function createArtworkFrameMaterialCanvasMaterialCache():
  ArtworkFrameMaterialCanvasMaterialCache {
  return {
    corrosionDerivedMaps: new Map(),
    corrosionFields: new Map(),
    finalShadedPixels: new Map(),
    steelFinishDerivedMaps: new Map(),
    steelFinishFields: new Map(),
    steelFinishNormalInputs: new Map(),
  }
}

export function getArtworkFrameCanvasMaterialCorrosionGeometryCacheKey(
  request: ArtworkFrameCorrosionFieldRequest,
) {
  return [
    'corrosion-geometry-field-cache-v1',
    request.geometrySeedKey,
    request.geometrySeed.toString(36),
    `tarnish:${formatCacheNumber(request.tarnishUnit)}`,
    getCorrosionStageUnitsKey(request.stageUnits),
  ].join('|')
}

export function getArtworkFrameCanvasMaterialCorrosionDerivedMapsCacheKey(
  request: ArtworkFrameCorrosionFieldRequest,
) {
  return [
    'corrosion-derived-maps-cache-v2',
    getArtworkFrameCanvasMaterialCorrosionGeometryCacheKey(request),
    `field:${request.fieldSize.width}x${request.fieldSize.height}`,
    `stroke:${formatCacheNumber(request.strokeWidth)}`,
    `bounds:${formatCacheNumber(request.bounds.x)}:${formatCacheNumber(request.bounds.y)}:${formatCacheNumber(request.bounds.width)}:${formatCacheNumber(request.bounds.height)}`,
    `sample:${formatCacheNumber(request.samplingBounds.x)}:${formatCacheNumber(request.samplingBounds.y)}:${formatCacheNumber(request.samplingBounds.width)}:${formatCacheNumber(request.samplingBounds.height)}`,
  ].join('|')
}

export function getArtworkFrameCanvasMaterialSteelFinishGeometryCacheKey(
  request: ArtworkFrameSteelFinishFieldRequest,
) {
  return [
    'steel-finish-geometry-field-cache-v1',
    request.geometrySeedKey,
    request.geometrySeed.toString(36),
    `brush:${formatCacheNumber(request.brushAngleDegrees)}`,
  ].join('|')
}

export function getArtworkFrameCanvasMaterialSteelSubstrateGeometryCacheKey(
  request: ArtworkFrameSteelFinishFieldRequest,
) {
  return [
    'steel-substrate-geometry-field-cache-v1',
    request.substrateGeometrySeedKey,
    request.substrateGeometrySeed.toString(36),
  ].join('|')
}

export function getArtworkFrameCanvasMaterialSteelFinishDerivedMapsCacheKey(
  request: ArtworkFrameSteelFinishFieldRequest,
) {
  return [
    'steel-finish-derived-maps-cache-v1',
    getArtworkFrameSteelFinishFieldRequestKey(request),
  ].join('|')
}

export function getArtworkFrameCanvasMaterialSteelFinishNormalInputsCacheKey(
  request: ArtworkFrameSteelFinishFieldRequest,
) {
  return [
    'steel-finish-normal-inputs-cache-v1',
    getArtworkFrameCanvasMaterialSteelFinishDerivedMapsCacheKey(request),
  ].join('|')
}

export function getArtworkFrameCanvasMaterialShadedPixelsCacheKey(
  texture: ArtworkFrameCanvasMaterialTextureDescriptor,
) {
  return [
    'final-light-shaded-pixels-cache-v1',
    getArtworkFrameCanvasMaterialTextureKey(texture),
  ].join('|')
}

function createDefaultCanvas(width: number, height: number) {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height)
  }

  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    return canvas
  }

  throw new Error('No canvas implementation is available for frame material rendering.')
}

function getCanvas2dContext(
  canvas: ArtworkFrameMaterialCanvasSource,
): ArtworkFrameMaterialCanvasRenderingContext {
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Could not create a 2D context for frame material rendering.')
  }

  return context
}

function createDefaultPath(pathData: string) {
  if (typeof Path2D === 'undefined') {
    throw new Error('Path2D is required for frame material canvas rendering.')
  }

  return new Path2D(pathData)
}

function fillMaterialCoverageMask(
  context: ArtworkFrameMaterialCanvasRenderingContext,
  texture: ArtworkFrameCanvasMaterialTextureDescriptor,
  framePath: Path2D,
) {
  if (texture.clipMode === 'stroke') {
    context.fillRect(
      texture.bounds.x,
      texture.bounds.y,
      texture.bounds.width,
      texture.bounds.height,
    )
    return
  }

  context.fill(framePath, 'evenodd')
}

function applyStrokeClipMask(
  context: ArtworkFrameMaterialCanvasRenderingContext,
  texture: ArtworkFrameCanvasMaterialTextureDescriptor,
  framePath: Path2D,
  originalAlpha: number,
) {
  if (texture.clipMode !== 'stroke' || !texture.clipStroke) {
    return
  }

  context.save()
  context.globalAlpha = originalAlpha
  context.globalCompositeOperation = 'destination-in'
  context.filter = 'none'
  context.lineCap = texture.clipStroke.lineCap
  context.lineJoin = texture.clipStroke.lineJoin
  context.lineWidth = texture.clipStroke.lineWidth
  context.strokeStyle = 'rgb(0, 0, 0)'
  context.stroke(framePath)
  context.restore()
}

function buildCorrosionField(
  request: ArtworkFrameCorrosionFieldRequest,
  materialCache: ArtworkFrameMaterialCanvasMaterialCache | null | undefined,
  performance: ArtworkFrameMaterialPerformanceRecorder | null | undefined,
) {
  const cacheKey = getArtworkFrameCanvasMaterialCorrosionGeometryCacheKey(
    request,
  )
  const cached = materialCache?.corrosionFields.get(cacheKey)

  if (cached && isCorrosionFieldCompatible(cached, request)) {
    return withCorrosionFieldRequest(cached, request)
  }

  const corrosionField = measureArtworkFrameMaterialPerformance(
    performance,
    'corrosion-field',
    () => buildArtworkFrameCorrosionField(request),
  )

  materialCache?.corrosionFields.set(cacheKey, corrosionField)

  return corrosionField
}

function buildCorrosionMaps(
  texture: ArtworkFrameCanvasMaterialTextureDescriptor,
  materialCache: ArtworkFrameMaterialCanvasMaterialCache | null | undefined,
  performance: ArtworkFrameMaterialPerformanceRecorder | null | undefined,
) {
  if (!texture.corrosionFieldRequest) {
    return null
  }

  const cacheKey = getArtworkFrameCanvasMaterialCorrosionDerivedMapsCacheKey(
    texture.corrosionFieldRequest,
  )
  const cached = materialCache?.corrosionDerivedMaps.get(cacheKey)

  if (cached) {
    return cached
  }

  const corrosionField = buildCorrosionField(
    texture.corrosionFieldRequest,
    materialCache,
    performance,
  )
  const corrosionMaps = buildArtworkFrameCorrosionDerivedMaps(corrosionField, {
    performance,
  })

  materialCache?.corrosionDerivedMaps.set(cacheKey, corrosionMaps)

  return corrosionMaps
}

function buildSteelFinishField(
  request: ArtworkFrameSteelFinishFieldRequest,
  materialCache: ArtworkFrameMaterialCanvasMaterialCache | null | undefined,
  performance: ArtworkFrameMaterialPerformanceRecorder | null | undefined,
) {
  const cacheKey = getArtworkFrameCanvasMaterialSteelFinishGeometryCacheKey(
    request,
  )
  const cached = materialCache?.steelFinishFields.get(cacheKey)

  if (cached && isSteelFinishFieldCompatible(cached, request)) {
    return withSteelFinishFieldRequest(cached, request)
  }

  const steelFinishField = measureArtworkFrameMaterialPerformance(
    performance,
    'steel-finish-field',
    () => buildArtworkFrameSteelFinishField(request),
  )

  materialCache?.steelFinishFields.set(cacheKey, steelFinishField)

  return steelFinishField
}

function buildSteelFinishMaps(
  texture: ArtworkFrameCanvasMaterialTextureDescriptor,
  materialCache: ArtworkFrameMaterialCanvasMaterialCache | null | undefined,
  performance: ArtworkFrameMaterialPerformanceRecorder | null | undefined,
) {
  if (!texture.steelFinishFieldRequest) {
    return null
  }

  const cacheKey = getArtworkFrameCanvasMaterialSteelFinishDerivedMapsCacheKey(
    texture.steelFinishFieldRequest,
  )
  const cached = materialCache?.steelFinishDerivedMaps.get(cacheKey)

  if (cached) {
    return cached
  }

  const steelFinishField = buildSteelFinishField(
    texture.steelFinishFieldRequest,
    materialCache,
    performance,
  )
  const brushRadians = (steelFinishField.brushAngleDegrees * Math.PI) / 180
  const placementSet = createArtworkFrameSteelDefectPlacementSet({
    brushDirection: {
      angleDegrees: steelFinishField.brushAngleDegrees,
      tangentX: Math.cos(brushRadians),
      tangentY: Math.sin(brushRadians),
    },
    frameRingCoordinates: {
      coordinateSpace: 'canonical-frame-ring-v1',
      frameShape: steelFinishField.geometryInputs.shape,
      frameStyle: steelFinishField.geometryInputs.style,
      ringKey: 'flat-rectangle-inner-outer-ring-v1',
    },
    geometrySeedKey: steelFinishField.geometrySeedKey,
    materialIdentity: {
      metalType: steelFinishField.geometryInputs.metalType,
    },
  })
  const defectDecalMaps = rasterizeArtworkFrameSteelDefectStablePlacementMaps({
    frameMask: steelFinishField.fields.frameMask,
    heightPixels: steelFinishField.fieldSize.height,
    placementSet,
    widthPixels: steelFinishField.fieldSize.width,
  })

  activateArtworkFrameSteelDefectActiveBodyMaps({
    defectDecalMaps,
    frameMask: steelFinishField.fields.frameMask,
    metalPolish: steelFinishField.polishUnit * 100,
  })
  populateArtworkFrameSteelDefectPhysicalContributionMaps({
    defectDecalMaps,
    frameMask: steelFinishField.fields.frameMask,
    metalPolish: steelFinishField.polishUnit * 100,
  })

  const steelFinishMaps = measureArtworkFrameMaterialPerformance(
    performance,
    'steel-derived-maps',
    () => buildArtworkFrameSteelFinishDerivedMaps(steelFinishField, {
      defectDecalMaps,
    }),
  )

  materialCache?.steelFinishDerivedMaps.set(cacheKey, steelFinishMaps)

  return steelFinishMaps
}

function buildSteelFinishNormalInputs(
  texture: ArtworkFrameCanvasMaterialTextureDescriptor,
  steelFinishMaps: ArtworkFrameSteelFinishDerivedMaps | null,
  materialCache: ArtworkFrameMaterialCanvasMaterialCache | null | undefined,
  performance: ArtworkFrameMaterialPerformanceRecorder | null | undefined,
) {
  if (!steelFinishMaps || !texture.steelFinishFieldRequest) {
    return null
  }

  const cacheKey = getArtworkFrameCanvasMaterialSteelFinishNormalInputsCacheKey(
    texture.steelFinishFieldRequest,
  )
  const cached = materialCache?.steelFinishNormalInputs.get(cacheKey)

  if (cached) {
    return cached
  }

  const normalInputs = measureArtworkFrameMaterialPerformance(
    performance,
    'normal-generation',
    () => buildArtworkFrameSteelFinishNormalInputs(steelFinishMaps),
  )

  materialCache?.steelFinishNormalInputs.set(cacheKey, normalInputs)

  return normalInputs
}

function prepareArtworkFrameCanvasMaterialTexture(
  texture: ArtworkFrameCanvasMaterialTextureDescriptor,
  options: ArtworkFrameMaterialCanvasRenderOptions,
): PreparedArtworkFrameCanvasMaterialTexture {
  const cacheKey = getArtworkFrameCanvasMaterialTextureKey(texture)
  const width = texture.textureSize.width
  const height = texture.textureSize.height
  const scale = texture.textureSize.scale
  const {
    canvas,
    context,
    framePath,
    originalAlpha,
    sourceImageData,
  } = measureArtworkFrameMaterialPerformance(
    options.performance,
    'image-canvas-output-conversion',
    () => {
      const nextCanvas = (options.createCanvas ?? createDefaultCanvas)(
        width,
        height,
      )
      const nextContext = getCanvas2dContext(nextCanvas)
      const createPath = options.createPath ?? createDefaultPath
      const nextFramePath = createPath(texture.clipPathData)
      const nextOriginalAlpha = nextContext.globalAlpha

      nextContext.save()
      nextContext.clearRect(0, 0, width, height)
      nextContext.scale(scale, scale)
      nextContext.translate(-texture.bounds.x, -texture.bounds.y)

      if (texture.clipMode === 'fill') {
        nextContext.clip(nextFramePath, 'evenodd')
      }

      nextContext.globalAlpha = nextOriginalAlpha
      nextContext.fillStyle = 'rgb(0, 0, 0)'
      fillMaterialCoverageMask(nextContext, texture, nextFramePath)

      nextContext.globalAlpha = nextOriginalAlpha
      nextContext.globalCompositeOperation = 'source-over'
      nextContext.filter = 'none'

      return {
        canvas: nextCanvas,
        context: nextContext,
        framePath: nextFramePath,
        originalAlpha: nextOriginalAlpha,
        sourceImageData: nextContext.getImageData(0, 0, width, height),
      }
    },
  )
  const steelFinishMaps = buildSteelFinishMaps(
    texture,
    options.materialCache,
    options.performance,
  )
  const steelFinishNormalInputs = buildSteelFinishNormalInputs(
    texture,
    steelFinishMaps,
    options.materialCache,
    options.performance,
  )
  const corrosionMaps = buildCorrosionMaps(
    texture,
    options.materialCache,
    options.performance,
  )

  return {
    cacheKey,
    canvas,
    context,
    corrosionMaps,
    framePath,
    height,
    originalAlpha,
    scale,
    sourceImageData,
    steelFinishMaps,
    steelFinishNormalInputs,
    width,
  }
}

function createArtworkFrameCanvasMaterialShadingPayload(
  texture: ArtworkFrameCanvasMaterialTextureDescriptor,
  prepared: PreparedArtworkFrameCanvasMaterialTexture,
  performance: ArtworkFrameMaterialPerformanceRecorder | null | undefined,
): ArtworkFrameCanvasMaterialShadingPayload {
  return {
    coordinates: createArtworkFrameMaterialShadingCoordinateContext(texture),
    corrosionMaps: prepared.corrosionMaps,
    imageData: prepared.sourceImageData,
    lighting: texture.lighting,
    metalBrushAngle: texture.steelFinishFieldRequest?.brushAngleDegrees ?? 0,
    performance,
    steelFinishMaps: prepared.steelFinishMaps,
    steelFinishNormalInputs: prepared.steelFinishNormalInputs,
  }
}

function completeArtworkFrameCanvasMaterialTexture(
  texture: ArtworkFrameCanvasMaterialTextureDescriptor,
  options: ArtworkFrameMaterialCanvasRenderOptions,
  prepared: PreparedArtworkFrameCanvasMaterialTexture,
  shadedImageData: ImageData,
): RenderedArtworkFrameMaterialCanvasTexture {
  const imageData = measureArtworkFrameMaterialPerformance(
    options.performance,
    'image-canvas-output-conversion',
    () => {
      prepared.context.putImageData(shadedImageData, 0, 0)
      applyStrokeClipMask(
        prepared.context,
        texture,
        prepared.framePath,
        prepared.originalAlpha,
      )
      prepared.context.restore()

      return texture.clipMode === 'stroke'
        ? prepared.context.getImageData(0, 0, prepared.width, prepared.height)
        : shadedImageData
    },
  )

  return {
    cacheKey: prepared.cacheKey,
    canvas: prepared.canvas,
    corrosionMaps: prepared.corrosionMaps,
    descriptor: texture,
    height: prepared.height,
    imageData,
    imageSource: prepared.canvas,
    scale: prepared.scale,
    steelFinishMaps: prepared.steelFinishMaps,
    steelFinishNormalInputs: prepared.steelFinishNormalInputs,
    width: prepared.width,
  }
}

function getCachedShadedPixels(
  texture: ArtworkFrameCanvasMaterialTextureDescriptor,
  options: ArtworkFrameMaterialCanvasRenderOptions,
) {
  return options.materialCache?.finalShadedPixels.get(
    getArtworkFrameCanvasMaterialShadedPixelsCacheKey(texture),
  )
}

function setCachedShadedPixels(
  texture: ArtworkFrameCanvasMaterialTextureDescriptor,
  options: ArtworkFrameMaterialCanvasRenderOptions,
  imageData: ImageData,
) {
  options.materialCache?.finalShadedPixels.set(
    getArtworkFrameCanvasMaterialShadedPixelsCacheKey(texture),
    cloneImageData(imageData),
  )
}

export function renderArtworkFrameCanvasMaterialTexture(
  texture: ArtworkFrameCanvasMaterialTextureDescriptor,
  options: ArtworkFrameMaterialCanvasRenderOptions = {},
): RenderedArtworkFrameMaterialCanvasTexture {
  const cacheKey = getArtworkFrameCanvasMaterialTextureKey(texture)
  const cached = options.cache?.get(cacheKey)

  if (cached) {
    return cached
  }

  const prepared = prepareArtworkFrameCanvasMaterialTexture(texture, options)
  const cachedShadedPixels = getCachedShadedPixels(texture, options)
  const shadedImageData = cachedShadedPixels
    ? cloneImageData(cachedShadedPixels)
    : (() => {
        const nextImageData = shadeArtworkFrameCanvasMaterialImageData(
          createArtworkFrameCanvasMaterialShadingPayload(
            texture,
            prepared,
            options.performance,
          ),
        )

        setCachedShadedPixels(texture, options, nextImageData)

        return nextImageData
      })()

  const rendered = completeArtworkFrameCanvasMaterialTexture(
    texture,
    options,
    prepared,
    shadedImageData,
  )

  options.cache?.set(cacheKey, rendered)

  return rendered
}

export async function renderArtworkFrameCanvasMaterialTextureAsync(
  texture: ArtworkFrameCanvasMaterialTextureDescriptor,
  options: ArtworkFrameMaterialCanvasRenderOptions = {},
  shadeMaterialImageData: ArtworkFrameMaterialCanvasShadingResolver =
    shadeArtworkFrameCanvasMaterialImageData,
): Promise<RenderedArtworkFrameMaterialCanvasTexture> {
  const cacheKey = getArtworkFrameCanvasMaterialTextureKey(texture)
  const cached = options.cache?.get(cacheKey)

  if (cached) {
    return cached
  }

  const prepared = prepareArtworkFrameCanvasMaterialTexture(texture, options)
  const cachedShadedPixels = getCachedShadedPixels(texture, options)
  const shadedImageData = cachedShadedPixels
    ? cloneImageData(cachedShadedPixels)
    : await Promise.resolve(shadeMaterialImageData(
        createArtworkFrameCanvasMaterialShadingPayload(
          texture,
          prepared,
          options.performance,
        ),
      )).then((nextImageData) => {
        setCachedShadedPixels(texture, options, nextImageData)

        return nextImageData
      })
  const rendered = completeArtworkFrameCanvasMaterialTexture(
    texture,
    options,
    prepared,
    shadedImageData,
  )

  options.cache?.set(cacheKey, rendered)

  return rendered
}
