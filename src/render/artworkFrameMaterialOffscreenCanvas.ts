import {
  detectArtworkFrameMaterialCanvasCapabilities,
  type ArtworkFrameMaterialCanvasCapabilityScope,
} from './artworkFrameMaterialCanvasCapabilities.ts'
import {
  renderArtworkFrameCanvasMaterialTextureAsync,
  renderArtworkFrameCanvasMaterialTexture,
  type ArtworkFrameMaterialCanvasFactory,
  type ArtworkFrameMaterialCanvasRenderOptions,
  type ArtworkFrameMaterialCanvasSource,
  type RenderedArtworkFrameMaterialCanvasTexture,
} from './artworkFrameMaterialCanvas.ts'
import type { ArtworkFrameCanvasMaterialTextureDescriptor } from './artworkFrameMaterialPlan.ts'
import { shadeArtworkFrameCanvasMaterialImageData } from './artworkFrameMaterialShading.ts'
import {
  shadeArtworkFrameCanvasMaterialImageDataInWorker,
  type ArtworkFrameMaterialShadingWorkerFactory,
} from './artworkFrameMaterialShadingWorkerClient.ts'

type OffscreenCanvasConstructor = new (
  width: number,
  height: number,
) => ArtworkFrameMaterialCanvasSource

export type ArtworkFrameMaterialOffscreenCanvasRenderOptions =
  ArtworkFrameMaterialCanvasRenderOptions & {
    capabilityScope?: ArtworkFrameMaterialCanvasCapabilityScope
  }

export type ArtworkFrameMaterialWorkerShadingRenderOptions =
  ArtworkFrameMaterialOffscreenCanvasRenderOptions & {
    createWorker?: ArtworkFrameMaterialShadingWorkerFactory
  }

function getOffscreenCanvasConstructor(
  scope: ArtworkFrameMaterialCanvasCapabilityScope,
) {
  const value = scope.OffscreenCanvas

  return typeof value === 'function'
    ? value as OffscreenCanvasConstructor
    : null
}

function createOffscreenCanvasFactory(
  scope: ArtworkFrameMaterialCanvasCapabilityScope,
): ArtworkFrameMaterialCanvasFactory | null {
  const OffscreenCanvasConstructor = getOffscreenCanvasConstructor(scope)

  if (!OffscreenCanvasConstructor) {
    return null
  }

  return (width, height) => new OffscreenCanvasConstructor(width, height)
}

function getSharedRendererOptions(
  options: ArtworkFrameMaterialOffscreenCanvasRenderOptions,
): ArtworkFrameMaterialCanvasRenderOptions {
  return {
    cache: options.cache,
    createCanvas: options.createCanvas,
    createPath: options.createPath,
    materialCache: options.materialCache,
    performance: options.performance,
  }
}

function renderWithMainThreadFallback(
  texture: ArtworkFrameCanvasMaterialTextureDescriptor,
  options: ArtworkFrameMaterialOffscreenCanvasRenderOptions,
) {
  return renderArtworkFrameCanvasMaterialTexture(
    texture,
    getSharedRendererOptions(options),
  )
}

export function renderArtworkFrameCanvasMaterialTextureWithOffscreenAdapter(
  texture: ArtworkFrameCanvasMaterialTextureDescriptor,
  options: ArtworkFrameMaterialOffscreenCanvasRenderOptions = {},
): RenderedArtworkFrameMaterialCanvasTexture {
  const capabilityScope = options.capabilityScope ?? globalThis
  const capabilities = detectArtworkFrameMaterialCanvasCapabilities(
    capabilityScope,
  )
  const offscreenCanvasFactory = capabilities.offscreenCanvas2d
    ? createOffscreenCanvasFactory(capabilityScope)
    : null

  if (!offscreenCanvasFactory) {
    return renderWithMainThreadFallback(texture, options)
  }

  try {
    return renderArtworkFrameCanvasMaterialTexture(texture, {
      ...getSharedRendererOptions(options),
      createCanvas: offscreenCanvasFactory,
    })
  } catch {
    return renderWithMainThreadFallback(texture, options)
  }
}

export async function renderArtworkFrameCanvasMaterialTextureWithWorkerShading(
  texture: ArtworkFrameCanvasMaterialTextureDescriptor,
  options: ArtworkFrameMaterialWorkerShadingRenderOptions = {},
): Promise<RenderedArtworkFrameMaterialCanvasTexture> {
  const capabilityScope = options.capabilityScope ?? globalThis
  const capabilities = detectArtworkFrameMaterialCanvasCapabilities(
    capabilityScope,
  )
  const offscreenCanvasFactory = capabilities.offscreenCanvas2d
    ? createOffscreenCanvasFactory(capabilityScope)
    : null
  const renderOptions = {
    ...getSharedRendererOptions(options),
    createCanvas: offscreenCanvasFactory ?? options.createCanvas,
  }
  const shadeMaterialImageData = capabilities.canUseWorkerOffscreenCanvas2d
    ? async (payload: Parameters<
      typeof shadeArtworkFrameCanvasMaterialImageData
    >[0]) => {
      try {
        return await shadeArtworkFrameCanvasMaterialImageDataInWorker(
          payload,
          options.createWorker,
        )
      } catch {
        return shadeArtworkFrameCanvasMaterialImageData(payload)
      }
    }
    : shadeArtworkFrameCanvasMaterialImageData

  try {
    return await renderArtworkFrameCanvasMaterialTextureAsync(
      texture,
      renderOptions,
      shadeMaterialImageData,
    )
  } catch (error) {
    if (!offscreenCanvasFactory) {
      throw error
    }

    return await renderArtworkFrameCanvasMaterialTextureAsync(
      texture,
      getSharedRendererOptions(options),
      shadeMaterialImageData,
    )
  }
}
