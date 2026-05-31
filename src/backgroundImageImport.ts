import {
  createSelectedBackgroundImageState,
  type BackgroundImageState,
} from './backgroundImage'
import { readLocalImageAsDataUrl, type LocalSteamScreenshotAsset } from './local/localArtwork'
import { downloadSteamArtworkAsDataUrl, type SteamArtworkAsset } from './steam/steamApi'
import {
  createImportedImageAssetFromDataUrl,
} from './utils/importedImageAsset'
import { readImageFileAsDataUrl } from './utils/imageFile'
import { createProjectImageAssetProvenance } from './project/projectAssetStatus'
import type { ProjectImageAssetProvenance } from './project/projectTypes'

export class BackgroundImageReadError extends Error {
  constructor() {
    super('Background image could not be read.')
  }
}

export class BackgroundImageLoadError extends Error {
  constructor() {
    super('Background image could not be loaded.')
  }
}

export type BackgroundImageImportResult = {
  background: BackgroundImageState
  imageSource: ProjectImageAssetProvenance
  selectedArtworkId: string | null
  statusMessage: string
}

export async function createBackgroundImageImportFromDataUrl(
  imageDataUrl: string,
  statusMessage: string,
  imageSource: ProjectImageAssetProvenance,
  selectedArtworkId: string | null = null,
): Promise<BackgroundImageImportResult> {
  const importedImage = await createImportedImageAssetFromDataUrl(imageDataUrl)

  return {
    background: createSelectedBackgroundImageState(
      importedImage.imageDataUrl,
      importedImage.imageSize,
    ),
    imageSource,
    selectedArtworkId,
    statusMessage,
  }
}

export async function createUploadedBackgroundImageImport(
  file: File,
): Promise<BackgroundImageImportResult> {
  let imageDataUrl: string

  try {
    imageDataUrl = await readImageFileAsDataUrl(file)
  } catch {
    throw new BackgroundImageReadError()
  }

  try {
    return await createBackgroundImageImportFromDataUrl(
      imageDataUrl,
      'Background image loaded and will be embedded when saved.',
      createProjectImageAssetProvenance({
        source: 'uploaded',
        sourceLabel: file.name,
      }),
    )
  } catch {
    throw new BackgroundImageLoadError()
  }
}


export async function createSteamArtworkBackgroundImport(
  asset: SteamArtworkAsset,
): Promise<BackgroundImageImportResult> {
  return createBackgroundImageImportFromDataUrl(
    await downloadSteamArtworkAsDataUrl(asset.url),
    `Using ${asset.label} as the disc background.`,
    createProjectImageAssetProvenance({
      source: 'steam-artwork',
      sourceId: asset.id,
      sourceLabel: asset.label,
      sourceUrl: asset.url,
    }),
    asset.id,
  )
}

export async function createLocalSteamScreenshotBackgroundImport(
  asset: LocalSteamScreenshotAsset,
): Promise<BackgroundImageImportResult> {
  return createBackgroundImageImportFromDataUrl(
    await readLocalImageAsDataUrl(asset.path),
    `Using ${asset.label} as the disc background.`,
    createProjectImageAssetProvenance({
      source: 'local-steam-screenshot',
      sourceId: asset.id,
      sourceLabel: asset.label,
    }),
    asset.id,
  )
}
