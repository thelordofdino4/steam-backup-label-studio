import {
  readLocalImageAsDataUrl,
  type LocalSteamScreenshotAsset,
} from '../local/localArtwork.ts'
import {
  downloadSteamArtworkAsDataUrl,
  type SteamArtworkAsset,
} from '../steam/steamApi.ts'
import {
  downloadRemoteLogoCandidateAsDataUrl,
  type RemoteLogoCandidate,
} from '../steam/steamLogoCandidates.ts'
import { createProjectImageAssetProvenance } from '../project/projectAssetStatus.ts'
import type { ProjectImageAssetProvenance } from '../project/projectTypes.ts'
import {
  createImportedImageAssetFromDataUrl,
  readImportedImageAssetFromFile,
  type ImportedImageAsset,
} from '../utils/importedImageAsset.ts'
import type { CaseInsertImageSlotImageInput } from './types.ts'

export function createCaseInsertImageSlotImageFromImportedAsset(
  importedImage: ImportedImageAsset,
  imageSource?: Partial<ProjectImageAssetProvenance> | null,
): CaseInsertImageSlotImageInput {
  return {
    imageDataUrl: importedImage.imageDataUrl,
    imageSize: importedImage.imageSize,
    imageSource,
  }
}

export async function createUploadedCaseInsertImageSlotImage(
  file: File,
  fallbackLabel: string,
): Promise<CaseInsertImageSlotImageInput> {
  const importedImage = await readImportedImageAssetFromFile(file)

  return createCaseInsertImageSlotImageFromImportedAsset(
    importedImage,
    createProjectImageAssetProvenance({
      source: 'uploaded',
      sourceLabel: importedImage.fileName ?? fallbackLabel,
    }),
  )
}

export async function createSteamArtworkCaseInsertImageSlotImage(
  asset: SteamArtworkAsset,
): Promise<CaseInsertImageSlotImageInput> {
  const importedImage = await createImportedImageAssetFromDataUrl(
    await downloadSteamArtworkAsDataUrl(asset.url),
  )

  return createCaseInsertImageSlotImageFromImportedAsset(
    importedImage,
    createProjectImageAssetProvenance({
      source: 'steam-artwork',
      sourceId: asset.id,
      sourceLabel: asset.label,
      sourceUrl: asset.url,
    }),
  )
}

export async function createLocalSteamScreenshotCaseInsertImageSlotImage(
  asset: LocalSteamScreenshotAsset,
): Promise<CaseInsertImageSlotImageInput> {
  const importedImage = await createImportedImageAssetFromDataUrl(
    await readLocalImageAsDataUrl(asset.path),
  )

  return createCaseInsertImageSlotImageFromImportedAsset(
    importedImage,
    createProjectImageAssetProvenance({
      source: 'local-steam-screenshot',
      sourceId: asset.id,
      sourceLabel: asset.label,
    }),
  )
}

export async function createWebArtworkCaseInsertImageSlotImage(
  candidate: RemoteLogoCandidate,
): Promise<CaseInsertImageSlotImageInput> {
  const importedImage = await createImportedImageAssetFromDataUrl(
    await downloadRemoteLogoCandidateAsDataUrl(candidate),
    candidate.label,
  )

  return createCaseInsertImageSlotImageFromImportedAsset(
    importedImage,
    createProjectImageAssetProvenance({
      source: 'web-artwork',
      sourceId: candidate.id,
      sourceLabel: candidate.label,
      sourceUrl: candidate.url,
    }),
  )
}
