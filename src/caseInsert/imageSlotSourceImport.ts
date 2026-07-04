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
import { importRemoteLogoCandidateAsset } from '../steam/steamLogoCandidateImport.ts'
import { createProjectImageAssetProvenance } from '../project/projectAssetStatus.ts'
import type { ProjectImageAssetProvenance } from '../project/projectTypes.ts'
import {
  createImportedImageAssetFromDataUrl,
  isImageFile,
  readImportedImageAssetFromFile,
  type ImportedImageAsset,
} from '../utils/importedImageAsset.ts'
import type { CaseInsertImageSlotImageInput } from './types.ts'
import { normalizeCaseInsertLabel } from './labelText.ts'

export type CaseInsertImageSlotUploadFileEvent = {
  target: {
    files?: FileList | null
    value: string
  }
}

export type CaseInsertImageSlotUploadFileResult = {
  file: File
  statusLabel: string
}

type CaseInsertImageSlotImportedSourceResult = {
  image: CaseInsertImageSlotImageInput
  successStatus: string
}

export function getCaseInsertImageSlotUploadFile({
  announceStatus,
  event,
  label,
}: {
  announceStatus: (message: string) => void
  event: CaseInsertImageSlotUploadFileEvent
  label: string
}): CaseInsertImageSlotUploadFileResult | null {
  const file = event.target.files?.[0]
  event.target.value = ''

  if (!file) {
    return null
  }

  const statusLabel = normalizeCaseInsertLabel(label)

  if (!isImageFile(file)) {
    announceStatus(`Choose an image file for the ${statusLabel}.`)
    return null
  }

  return {
    file,
    statusLabel,
  }
}

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

export async function loadUploadedCaseInsertImageSlotImage({
  announceStatus,
  createImage = createUploadedCaseInsertImageSlotImage,
  uploadFile,
}: {
  announceStatus: (message: string) => void
  createImage?: (
    file: File,
    fallbackLabel: string,
  ) => Promise<CaseInsertImageSlotImageInput>
  uploadFile: CaseInsertImageSlotUploadFileResult
}): Promise<CaseInsertImageSlotImageInput | null> {
  try {
    return await createImage(uploadFile.file, uploadFile.statusLabel)
  } catch {
    announceStatus(`The ${uploadFile.statusLabel} image could not be read.`)
    return null
  }
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

export async function loadSteamArtworkCaseInsertImageSlotImage({
  announceStatus,
  asset,
  createImage = createSteamArtworkCaseInsertImageSlotImage,
  label,
}: {
  announceStatus: (message: string) => void
  asset: SteamArtworkAsset
  createImage?: (
    asset: SteamArtworkAsset,
  ) => Promise<CaseInsertImageSlotImageInput>
  label: string
}): Promise<CaseInsertImageSlotImportedSourceResult | null> {
  const statusLabel = normalizeCaseInsertLabel(label)
  announceStatus(`Downloading ${asset.label} for ${statusLabel}...`)

  try {
    return {
      image: await createImage(asset),
      successStatus: `Using ${asset.label} as the ${statusLabel}.`,
    }
  } catch (error) {
    announceStatus(`Steam artwork import failed for ${statusLabel}: ${String(error)}`)
    return null
  }
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

export async function loadLocalSteamScreenshotCaseInsertImageSlotImage({
  announceStatus,
  asset,
  createImage = createLocalSteamScreenshotCaseInsertImageSlotImage,
  label,
}: {
  announceStatus: (message: string) => void
  asset: LocalSteamScreenshotAsset
  createImage?: (
    asset: LocalSteamScreenshotAsset,
  ) => Promise<CaseInsertImageSlotImageInput>
  label: string
}): Promise<CaseInsertImageSlotImportedSourceResult | null> {
  const statusLabel = normalizeCaseInsertLabel(label)
  announceStatus(`Loading ${asset.label} for ${statusLabel}...`)

  try {
    return {
      image: await createImage(asset),
      successStatus: `Using ${asset.label} as the ${statusLabel}.`,
    }
  } catch (error) {
    announceStatus(`Local screenshot import failed for ${statusLabel}: ${String(error)}`)
    return null
  }
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

export async function loadWebArtworkCaseInsertImageSlotImage({
  announceStatus,
  candidate,
  createImage = createWebArtworkCaseInsertImageSlotImage,
  label,
}: {
  announceStatus: (message: string) => void
  candidate: RemoteLogoCandidate
  createImage?: (
    candidate: RemoteLogoCandidate,
  ) => Promise<CaseInsertImageSlotImageInput>
  label: string
}): Promise<CaseInsertImageSlotImportedSourceResult | null> {
  const statusLabel = normalizeCaseInsertLabel(label)
  announceStatus(`Downloading ${candidate.label} for ${statusLabel}...`)

  try {
    return {
      image: await createImage(candidate),
      successStatus: `Using ${candidate.label} as the ${statusLabel}.`,
    }
  } catch (error) {
    announceStatus(`Web artwork import failed for ${statusLabel}: ${String(error)}`)
    return null
  }
}

export async function createLogoCandidateCaseInsertImageSlotImage(
  candidate: RemoteLogoCandidate,
): Promise<CaseInsertImageSlotImageInput> {
  const { importedImage, imageSource } =
    await importRemoteLogoCandidateAsset(candidate)

  return createCaseInsertImageSlotImageFromImportedAsset(
    importedImage,
    imageSource,
  )
}
