import type {
  BackgroundImageSize,
  ImageContentBounds,
  ImageContentShape,
} from '../project/projectTypes.ts'
import {
  findImageDataContentShape,
  getImageContentShape,
  normalizeStoredImageContentShape,
} from './imageContentShape.ts'

export const IMAGE_CONTENT_ALPHA_THRESHOLD = 4

export const EMPTY_IMAGE_CONTENT_BOUNDS: ImageContentBounds = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
}

type LoadedImageSize = {
  naturalWidth?: number
  naturalHeight?: number
  width?: number
  height?: number
}

function normalizePixelNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : fallback
}

function hasPositiveSize<T extends Pick<BackgroundImageSize, 'width' | 'height'>>(
  size: T | null | undefined,
): size is T {
  return Boolean(size && size.width > 0 && size.height > 0)
}

function isFullImageContentBounds(
  bounds: ImageContentBounds,
  imageSize: Pick<BackgroundImageSize, 'width' | 'height'>,
) {
  return (
    bounds.x === 0 &&
    bounds.y === 0 &&
    bounds.width === imageSize.width &&
    bounds.height === imageSize.height
  )
}

export function getLoadedImageSize(image: LoadedImageSize): BackgroundImageSize {
  return {
    width: normalizePixelNumber(image.naturalWidth || image.width, 1),
    height: normalizePixelNumber(image.naturalHeight || image.height, 1),
  }
}

export function isEmptyImageContentBounds(bounds: ImageContentBounds | null | undefined) {
  return Boolean(bounds && (bounds.width <= 0 || bounds.height <= 0))
}

export function normalizeImageContentBounds(
  value: unknown,
  imageSize?: Pick<BackgroundImageSize, 'width' | 'height'> | null,
): ImageContentBounds | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const record = value as Record<string, unknown>
  const imageWidth = normalizePixelNumber(imageSize?.width)
  const imageHeight = normalizePixelNumber(imageSize?.height)
  const x = normalizePixelNumber(record.x)
  const y = normalizePixelNumber(record.y)
  const width = normalizePixelNumber(record.width)
  const height = normalizePixelNumber(record.height)

  if (width === 0 || height === 0) {
    return { ...EMPTY_IMAGE_CONTENT_BOUNDS }
  }

  if (imageWidth <= 0 || imageHeight <= 0) {
    return { x, y, width, height }
  }

  const boundedX = Math.min(x, imageWidth)
  const boundedY = Math.min(y, imageHeight)
  const boundedWidth = Math.min(width, Math.max(0, imageWidth - boundedX))
  const boundedHeight = Math.min(height, Math.max(0, imageHeight - boundedY))

  return boundedWidth > 0 && boundedHeight > 0
    ? {
        x: boundedX,
        y: boundedY,
        width: boundedWidth,
        height: boundedHeight,
      }
    : { ...EMPTY_IMAGE_CONTENT_BOUNDS }
}

export function normalizeStoredImageContentBounds(
  value: unknown,
  imageSize: Pick<BackgroundImageSize, 'width' | 'height'>,
) {
  const bounds = normalizeImageContentBounds(value, imageSize)

  if (!bounds) {
    return null
  }

  return isFullImageContentBounds(bounds, imageSize) ? null : bounds
}

function imageContentBoundsMatch(
  left: ImageContentBounds | null,
  right: ImageContentBounds | null,
) {
  return left?.x === right?.x &&
    left?.y === right?.y &&
    left?.width === right?.width &&
    left?.height === right?.height
}

function imageContentShapeMatch(
  left: ImageContentShape | null,
  right: ImageContentShape | null,
) {
  return left?.width === right?.width &&
    left?.height === right?.height &&
    left?.path === right?.path &&
    left?.fillRule === right?.fillRule &&
    left?.safetyOutset === right?.safetyOutset
}

export function imageSizesWithContentBoundsMatch(
  left: BackgroundImageSize | null | undefined,
  right: BackgroundImageSize | null | undefined,
) {
  if (!left || !right) {
    return left == null && right == null
  }

  return left.width === right.width &&
    left.height === right.height &&
    imageContentBoundsMatch(
      normalizeStoredImageContentBounds(left.contentBounds, left),
      normalizeStoredImageContentBounds(right.contentBounds, right),
    ) &&
    imageContentShapeMatch(
      getImageContentShape(left),
      getImageContentShape(right),
    )
}

export function getImageContentBounds(
  imageSize: BackgroundImageSize | null | undefined,
) {
  return imageSize
    ? normalizeStoredImageContentBounds(imageSize.contentBounds, imageSize)
    : null
}

export function hasActiveImageContent(
  imageSize: BackgroundImageSize | null | undefined,
) {
  const bounds = getImageContentBounds(imageSize)

  return !bounds || !isEmptyImageContentBounds(bounds)
}

export function getImageContentSize(
  imageSize: BackgroundImageSize | null | undefined,
): BackgroundImageSize | null {
  if (!hasPositiveSize(imageSize)) {
    return null
  }

  const bounds = getImageContentBounds(imageSize)

  if (!bounds) {
    return {
      width: imageSize.width,
      height: imageSize.height,
    }
  }

  return isEmptyImageContentBounds(bounds)
    ? null
    : {
        width: bounds.width,
        height: bounds.height,
      }
}

export function getImageContentSourceRect(
  imageSize: BackgroundImageSize | null | undefined,
  fallbackSize?: Pick<BackgroundImageSize, 'width' | 'height'> | null,
): ImageContentBounds | null {
  const sourceSize = hasPositiveSize(imageSize)
    ? imageSize
    : fallbackSize

  if (!hasPositiveSize(sourceSize)) {
    return null
  }

  const bounds = imageSize ? getImageContentBounds(imageSize) : null

  if (!bounds) {
    return {
      x: 0,
      y: 0,
      width: sourceSize.width,
      height: sourceSize.height,
    }
  }

  return isEmptyImageContentBounds(bounds) ? null : bounds
}

export function findImageDataContentBounds(
  imageData: Pick<ImageData, 'data' | 'width' | 'height'>,
  alphaThreshold = IMAGE_CONTENT_ALPHA_THRESHOLD,
): ImageContentBounds | null {
  const width = normalizePixelNumber(imageData.width)
  const height = normalizePixelNumber(imageData.height)

  if (width <= 0 || height <= 0) {
    return null
  }

  const data = imageData.data
  const threshold = normalizePixelNumber(alphaThreshold)
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alphaIndex = (y * width + x) * 4 + 3

      if ((data[alphaIndex] ?? 0) <= threshold) {
        continue
      }

      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }

  return maxX >= minX && maxY >= minY
    ? {
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
      }
    : null
}

export function withDetectedImageContentBounds(
  imageSize: BackgroundImageSize,
  bounds: ImageContentBounds | null,
): BackgroundImageSize {
  const contentBounds = bounds
    ? normalizeStoredImageContentBounds(bounds, imageSize)
    : { ...EMPTY_IMAGE_CONTENT_BOUNDS }

  return contentBounds
    ? {
        ...imageSize,
        contentBounds,
      }
    : {
        width: imageSize.width,
      height: imageSize.height,
    }
}

export function withDetectedImageContentMetadata(
  imageSize: BackgroundImageSize,
  bounds: ImageContentBounds | null,
  shape: ImageContentShape | null,
): BackgroundImageSize {
  const contentBounds = bounds
    ? normalizeStoredImageContentBounds(bounds, imageSize)
    : { ...EMPTY_IMAGE_CONTENT_BOUNDS }
  const contentSize = contentBounds &&
    !isEmptyImageContentBounds(contentBounds)
    ? contentBounds
    : imageSize
  const contentShape = shape
    ? normalizeStoredImageContentShape(shape, contentSize)
    : null

  return {
    width: imageSize.width,
    height: imageSize.height,
    ...(contentBounds ? { contentBounds } : {}),
    ...(contentShape ? { contentShape } : {}),
  }
}

export function getImageContentBoundsFromLoadedImage(
  image: CanvasImageSource & LoadedImageSize,
  alphaThreshold = IMAGE_CONTENT_ALPHA_THRESHOLD,
) {
  const imageSize = getLoadedImageSize(image)
  const canvas = document.createElement('canvas')
  canvas.width = imageSize.width
  canvas.height = imageSize.height

  const context = canvas.getContext('2d')

  if (!context) {
    return null
  }

  context.drawImage(image, 0, 0, imageSize.width, imageSize.height)

  return findImageDataContentBounds(
    context.getImageData(0, 0, imageSize.width, imageSize.height),
    alphaThreshold,
  )
}

export function createImageSizeWithDetectedContentBounds(
  image: CanvasImageSource & LoadedImageSize,
  alphaThreshold = IMAGE_CONTENT_ALPHA_THRESHOLD,
): BackgroundImageSize {
  const imageSize = getLoadedImageSize(image)

  try {
    const canvas = document.createElement('canvas')
    canvas.width = imageSize.width
    canvas.height = imageSize.height

    const context = canvas.getContext('2d')

    if (!context) {
      return imageSize
    }

    context.drawImage(image, 0, 0, imageSize.width, imageSize.height)

    const imageData = context.getImageData(0, 0, imageSize.width, imageSize.height)
    const bounds = findImageDataContentBounds(imageData, alphaThreshold)

    return withDetectedImageContentMetadata(
      imageSize,
      bounds,
      findImageDataContentShape(imageData, bounds, { alphaThreshold }),
    )
  } catch {
    return imageSize
  }
}
