import type { BackgroundImageSize, ImageContentBounds } from '../project/projectTypes.ts'
import {
  getImageContentBounds,
  getImageContentSize,
  getImageContentSourceRect,
  getLoadedImageSize,
  hasActiveImageContent,
} from '../image/imageContentBounds.ts'

export type CanvasImageRect = {
  x: number
  y: number
  width: number
  height: number
}

export function canvasToPngBytes(canvas: HTMLCanvasElement) {
  return new Promise<number[]>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Could not create PNG blob.'))
        return
      }

      blob
        .arrayBuffer()
        .then((buffer) => resolve(Array.from(new Uint8Array(buffer))))
        .catch(reject)
    }, 'image/png')
  })
}

function formatImageLoadError(description: string) {
  return `Could not load ${description}.`
}

export function loadImage(source: string, description = 'image') {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()

    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(formatImageLoadError(description)))

    image.src = source
  })
}

export function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }

      reject(new Error('Could not convert image asset to a data URL.'))
    }

    reader.onerror = () => reject(new Error('Could not convert image asset to a data URL.'))
    reader.readAsDataURL(blob)
  })
}

export async function getCanvasSafeImageSource(
  source: string,
  description = 'image asset',
) {
  if (source.startsWith('data:')) {
    return source
  }

  let response: Response

  try {
    response = await fetch(source)
  } catch (error) {
    throw new Error(`Could not load ${description} for export: ${String(error)}`, {
      cause: error,
    })
  }

  if (!response.ok) {
    throw new Error(`Could not load ${description} for export: ${response.status}`)
  }

  return blobToDataUrl(await response.blob())
}

export async function loadCanvasSafeImage(source: string, description = 'image') {
  const canvasSafeSource = await getCanvasSafeImageSource(source, description)

  try {
    return await loadImage(canvasSafeSource, description)
  } catch (error) {
    if (canvasSafeSource !== source) {
      return loadImage(source, description)
    }

    throw error
  }
}

export function getCanvasImageContentSize(
  image: CanvasImageSource & {
    naturalWidth?: number
    naturalHeight?: number
    width?: number
    height?: number
  },
  imageSize?: BackgroundImageSize | null,
) {
  if (imageSize && !hasActiveImageContent(imageSize)) {
    return null
  }

  return getImageContentSize(imageSize) ?? getLoadedImageSize(image)
}

export function getCanvasImageContentSourceRect(
  image: CanvasImageSource & {
    naturalWidth?: number
    naturalHeight?: number
    width?: number
    height?: number
  },
  imageSize?: BackgroundImageSize | null,
): ImageContentBounds | null {
  if (imageSize && !hasActiveImageContent(imageSize)) {
    return null
  }

  const loadedSize = getLoadedImageSize(image)
  const sourceRect = getImageContentSourceRect(imageSize, loadedSize)

  if (
    !sourceRect ||
    !imageSize ||
    imageSize.width <= 0 ||
    imageSize.height <= 0
  ) {
    return sourceRect
  }

  const scaleX = loadedSize.width / imageSize.width
  const scaleY = loadedSize.height / imageSize.height

  return {
    x: sourceRect.x * scaleX,
    y: sourceRect.y * scaleY,
    width: sourceRect.width * scaleX,
    height: sourceRect.height * scaleY,
  }
}

export function drawImageContent(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource & {
    naturalWidth?: number
    naturalHeight?: number
    width?: number
    height?: number
  },
  imageSize: BackgroundImageSize | null | undefined,
  target: CanvasImageRect,
) {
  const sourceRect = getCanvasImageContentSourceRect(image, imageSize)

  if (!sourceRect) {
    return false
  }

  if (!getImageContentBounds(imageSize)) {
    context.drawImage(
      image,
      target.x,
      target.y,
      target.width,
      target.height,
    )

    return true
  }

  context.drawImage(
    image,
    sourceRect.x,
    sourceRect.y,
    sourceRect.width,
    sourceRect.height,
    target.x,
    target.y,
    target.width,
    target.height,
  )

  return true
}
