import type { BackgroundImageSize } from '../project/projectTypes.ts'
import { loadImage } from '../export/canvasImage.ts'
import { createImageSizeWithDetectedContentBounds } from '../image/imageContentBounds.ts'
import { readImageFileAsDataUrl } from './imageFile.ts'

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
  const image = await loadImage(imageDataUrl, fileName ?? 'imported image')

  return {
    imageDataUrl,
    imageSize: createImageSizeWithDetectedContentBounds(image),
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
