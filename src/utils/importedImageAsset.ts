import { ImageImportError } from '../image/imageImportFailure.ts'
import type { BackgroundImageSize } from '../project/projectTypes.ts'
import { loadImage } from '../export/canvasImage.ts'
import { createImageSizeWithDetectedContentBounds } from '../image/imageContentBounds.ts'
import { readImageFileAsDataUrl } from './imageFile.ts'
import { validateImportedImageDataUrl } from '../tauri/importedImageValidation.ts'

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
  dependencies = { validate: validateImportedImageDataUrl, load: loadImage, inspect: createImageSizeWithDetectedContentBounds },
): Promise<ImportedImageAsset> {
  const acceptedDataUrl = await dependencies.validate(imageDataUrl)
  let image: HTMLImageElement
  try { image = await dependencies.load(acceptedDataUrl, fileName ?? 'imported image') }
  catch (cause) { throw new ImageImportError('image.decode-failed', cause) }
  let imageSize: BackgroundImageSize
  try { imageSize = dependencies.inspect(image) }
  catch (cause) { throw new ImageImportError('image.inspect-failed', cause) }

  return {
    imageDataUrl: acceptedDataUrl,
    imageSize,
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
