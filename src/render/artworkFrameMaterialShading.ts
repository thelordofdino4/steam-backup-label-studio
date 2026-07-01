import {
  shadeArtworkFrameCorrosionImageData,
  type ArtworkFrameCorrosionDerivedMaps,
} from './artworkFrameCorrosionMaps.ts'
import type { ArtworkFrameCanvasMaterialTextureDescriptor } from './artworkFrameMaterialPlan.ts'
import {
  shadeArtworkFrameSteelFinishImageData,
  type ArtworkFrameSteelFinishDerivedMaps,
  type ArtworkFrameSteelFinishNormalInputs,
} from './artworkFrameSteelFinish.ts'
import type { ArtworkFrameMaterialLightVector } from './artworkFrameMaterialLighting.ts'
import type { ArtworkFrameMaterialPerformanceRecorder } from './artworkFrameMaterialPerformance.ts'

export type ArtworkFrameMaterialShadingRect = {
  height: number
  width: number
  x: number
  y: number
}

export type ArtworkFrameMaterialShadingCoordinateContext = {
  frameAspectRatio: number
  frameBounds: ArtworkFrameMaterialShadingRect
  frameCenter: {
    x: number
    y: number
  }
  materialPixelSize: {
    x: number
    y: number
  }
  samplingBounds: ArtworkFrameMaterialShadingRect
  textureBounds: ArtworkFrameMaterialShadingRect
  textureSize: {
    height: number
    scale: number
    width: number
  }
}

export type ArtworkFrameCanvasMaterialShadingPayload = {
  coordinates: ArtworkFrameMaterialShadingCoordinateContext
  corrosionMaps: ArtworkFrameCorrosionDerivedMaps | null
  imageData: ImageData
  lighting: {
    lightVector: ArtworkFrameMaterialLightVector
  }
  metalBrushAngle: number
  performance?: ArtworkFrameMaterialPerformanceRecorder | null
  steelFinishMaps: ArtworkFrameSteelFinishDerivedMaps | null
  steelFinishNormalInputs: ArtworkFrameSteelFinishNormalInputs | null
}

function cloneShadingRect(
  rect: ArtworkFrameMaterialShadingRect,
): ArtworkFrameMaterialShadingRect {
  return {
    height: rect.height,
    width: rect.width,
    x: rect.x,
    y: rect.y,
  }
}

function getPositiveDimension(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 1
}

export function createArtworkFrameMaterialShadingCoordinateContext(
  texture: ArtworkFrameCanvasMaterialTextureDescriptor,
): ArtworkFrameMaterialShadingCoordinateContext {
  const frameBounds = cloneShadingRect(
    texture.steelFinishFieldRequest?.bounds ??
      texture.corrosionFieldRequest?.bounds ??
      texture.bounds,
  )
  const samplingBounds = cloneShadingRect(
    texture.steelFinishFieldRequest?.samplingBounds ??
      texture.corrosionFieldRequest?.samplingBounds ??
      texture.bounds,
  )
  const textureBounds = cloneShadingRect(texture.bounds)
  const textureWidth = getPositiveDimension(texture.textureSize.width)
  const textureHeight = getPositiveDimension(texture.textureSize.height)
  const frameWidth = getPositiveDimension(frameBounds.width)
  const frameHeight = getPositiveDimension(frameBounds.height)

  return {
    frameAspectRatio: frameWidth / frameHeight,
    frameBounds,
    frameCenter: {
      x: frameBounds.x + frameBounds.width / 2,
      y: frameBounds.y + frameBounds.height / 2,
    },
    materialPixelSize: {
      x: samplingBounds.width / textureWidth,
      y: samplingBounds.height / textureHeight,
    },
    samplingBounds,
    textureBounds,
    textureSize: {
      height: texture.textureSize.height,
      scale: texture.textureSize.scale,
      width: texture.textureSize.width,
    },
  }
}

export function shadeArtworkFrameCanvasMaterialImageData({
  coordinates,
  corrosionMaps,
  imageData,
  lighting,
  metalBrushAngle,
  performance,
  steelFinishMaps,
  steelFinishNormalInputs,
}: ArtworkFrameCanvasMaterialShadingPayload) {
  const steelImageData = steelFinishMaps && steelFinishNormalInputs
    ? shadeArtworkFrameSteelFinishImageData(imageData, {
        coordinates,
        lightVector: lighting.lightVector,
        metalBrushAngle,
        normalInputs: steelFinishNormalInputs,
        performance,
        steelFinishMaps,
      })
    : imageData

  return corrosionMaps
    ? shadeArtworkFrameCorrosionImageData(steelImageData, corrosionMaps, {
        coordinates,
        lightVector: lighting.lightVector,
        performance,
        steelFinishMaps,
      })
    : steelImageData
}
