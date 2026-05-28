import type { BackgroundImageSize } from '../project/projectTypes'
import { loadImage } from '../export/canvasImage'
import { getNaturalImageSize, readImageFileAsDataUrl } from './imageFile'

export type ImportedImageAsset = {
  imageDataUrl: string
  imageSize: BackgroundImageSize
  fileName?: string
}

export function isImageFile(file: File) {
  return file.type.startsWith('image/')
}

export async function createImportedImageAssetFromDataUrl(
  imageDataUrl: string,
  fileName?: string,
): Promise<ImportedImageAsset> {
  const image = await loadImage(imageDataUrl)

  return {
    imageDataUrl,
    imageSize: getNaturalImageSize(image),
    fileName,
  }
}

export async function readImportedImageAssetFromFile(
  file: File,
): Promise<ImportedImageAsset> {
  return createImportedImageAssetFromDataUrl(
    await readImageFileAsDataUrl(file),
    file.name,
  )
}
