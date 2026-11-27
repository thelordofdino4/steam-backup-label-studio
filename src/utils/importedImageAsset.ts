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

export type ImportedImagePreparationStage = 'validate' | 'decode'

export function isImageFile(file: File) {
  return file.type.startsWith('image/')
}

export async function createImportedImageAssetFromDataUrl(
  imageDataUrl: string,
  fileName?: string,
  dependencies = { validate: validateImportedImageDataUrl, load: loadImage, inspect: createImageSizeWithDetectedContentBounds },
  onStage?: (stage: ImportedImagePreparationStage) => void,
): Promise<ImportedImageAsset> {
  onStage?.('validate')
  const acceptedDataUrl = await dependencies.validate(imageDataUrl)
  onStage?.('decode')
  const image = await dependencies.load(acceptedDataUrl, fileName ?? 'imported image')

  return {
    imageDataUrl: acceptedDataUrl,
    imageSize: dependencies.inspect(image),
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
