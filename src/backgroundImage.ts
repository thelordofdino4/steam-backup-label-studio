import type { BackgroundImageSize, BackgroundOffset } from './project/projectTypes'

export const DEFAULT_BACKGROUND_SCALE = 1

export type BackgroundImageState = {
  imageUrl: string | null
  imageSize: BackgroundImageSize | null
  scale: number
  offset: BackgroundOffset
}

export function createDefaultBackgroundOffset(): BackgroundOffset {
  return { x: 0, y: 0 }
}

export function createEmptyBackgroundImageState(): BackgroundImageState {
  return {
    imageUrl: null,
    imageSize: null,
    scale: DEFAULT_BACKGROUND_SCALE,
    offset: createDefaultBackgroundOffset(),
  }
}

export function createSelectedBackgroundImageState(
  imageUrl: string,
  imageSize: BackgroundImageSize,
): BackgroundImageState {
  return {
    imageUrl,
    imageSize,
    scale: DEFAULT_BACKGROUND_SCALE,
    offset: createDefaultBackgroundOffset(),
  }
}

export function updateBackgroundScale(value: number) {
  return value
}

export function getBackgroundPreviewSize(
  imageSize: BackgroundImageSize | null,
) {
  if (!imageSize || imageSize.width <= 0 || imageSize.height <= 0) {
    return {
      width: '100%',
      height: '100%',
    }
  }

  const aspectRatio = imageSize.width / imageSize.height

  if (aspectRatio >= 1) {
    return {
      width: `${aspectRatio * 100}%`,
      height: '100%',
    }
  }

  return {
    width: '100%',
    height: `${(1 / aspectRatio) * 100}%`,
  }
}
