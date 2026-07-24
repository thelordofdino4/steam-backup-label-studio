import type { SteamLogoPlacement } from '../discText/index.ts'
import { clampTitleArtworkLayoutToSafeZone } from '../layout/discElementSafeZone.ts'
import {
  clearTitleArtworkDefaultSteamLogo,
  clearTitleArtworkImage,
  setTitleArtworkImage,
  setTitleArtworkLayout,
} from '../project/projectTitleArtwork.ts'
import type { ProjectTitleArtwork } from '../project/projectTypes.ts'
import type { DiscTemplate } from '../types/template.ts'
import {
  createImportedImageAssetFromDataUrl,
  type ImportedImageAsset,
} from '../utils/importedImageAsset.ts'
import {
  downloadSteamArtworkAsDataUrl,
  type SteamArtworkAsset,
  type SteamImportedGame,
} from './steamApi.ts'
import { getSteamTitleArtworkAssetPriority } from './steamArtworkAssets.ts'

export type SteamTitleArtworkImportStatus =
  | 'seeded'
  | 'unavailable'
  | 'failed'

export type SteamTitleArtworkImportResult = {
  placementRefitRequired: boolean
  titleArtwork: ProjectTitleArtwork
  status: SteamTitleArtworkImportStatus
  statusMessage: string
}

type SteamTitleArtworkImportOptions = {
  downloadArtworkAsDataUrl?: (url: string) => Promise<string>
  createImportedImageAsset?: (imageDataUrl: string) => Promise<ImportedImageAsset>
}

function clearSteamTitleArtworkWhilePreservingDormantScale(
  titleArtwork: ProjectTitleArtwork,
  selectedDiscTemplate: DiscTemplate,
  steamLogoPlacement: SteamLogoPlacement,
) {
  const clearedTitleArtwork = clearTitleArtworkImage(
    titleArtwork,
    selectedDiscTemplate,
    steamLogoPlacement,
  )

  return setTitleArtworkLayout(clearedTitleArtwork, {
    ...clearedTitleArtwork.layout,
    scale: titleArtwork.layout.scale,
  })
}

export function findSteamTitleArtworkAsset(
  importedGame: SteamImportedGame,
): SteamArtworkAsset | null {
  return getSteamTitleArtworkAssetCandidates(importedGame)[0] ?? null
}

export function getSteamTitleArtworkAssetCandidates(
  importedGame: SteamImportedGame,
): SteamArtworkAsset[] {
  return importedGame.artwork
    .filter((asset) => asset.kind === 'logo')
    .toSorted(
      (a, b) =>
        getSteamTitleArtworkAssetPriority(a) -
        getSteamTitleArtworkAssetPriority(b),
    )
}

export async function createSteamTitleArtworkImport(
  importedGame: SteamImportedGame,
  currentTitleArtwork: ProjectTitleArtwork,
  selectedDiscTemplate: DiscTemplate,
  steamLogoPlacement: SteamLogoPlacement,
  options: SteamTitleArtworkImportOptions = {},
): Promise<SteamTitleArtworkImportResult> {
  const steamLogoAsset = findSteamTitleArtworkAsset(importedGame)

  if (!steamLogoAsset) {
    const titleArtworkWithoutDefault =
      clearTitleArtworkDefaultSteamLogo(currentTitleArtwork)

    return {
      titleArtwork:
        currentTitleArtwork.source === 'custom'
          ? titleArtworkWithoutDefault
          : clearSteamTitleArtworkWhilePreservingDormantScale(
              titleArtworkWithoutDefault,
              selectedDiscTemplate,
              steamLogoPlacement,
            ),
      placementRefitRequired: currentTitleArtwork.source !== 'custom',
      status: 'unavailable',
      statusMessage:
        'No Steam title/logo artwork was found. Rendered title text and custom game logo upload remain available.',
    }
  }

  const downloadArtworkAsDataUrl =
    options.downloadArtworkAsDataUrl ?? downloadSteamArtworkAsDataUrl
  const createImportedImageAsset =
    options.createImportedImageAsset ?? createImportedImageAssetFromDataUrl

  try {
    const importedImage = await createImportedImageAsset(
      await downloadArtworkAsDataUrl(steamLogoAsset.url),
    )
    const nextTitleArtwork = setTitleArtworkImage(
      currentTitleArtwork,
      importedImage,
      steamLogoAsset,
      selectedDiscTemplate,
      steamLogoPlacement,
      { rememberAsDefault: true },
    )
    const nextLayout = clampTitleArtworkLayoutToSafeZone(
      nextTitleArtwork.layout,
      selectedDiscTemplate,
      nextTitleArtwork.imageSize,
    )

    return {
      titleArtwork: setTitleArtworkLayout(nextTitleArtwork, nextLayout),
      placementRefitRequired: true,
      status: 'seeded',
      statusMessage: `Using ${steamLogoAsset.label} as the disc title artwork.`,
    }
  } catch {
    const titleArtworkWithoutDefault =
      clearTitleArtworkDefaultSteamLogo(currentTitleArtwork)

    return {
      titleArtwork:
        currentTitleArtwork.source === 'custom'
          ? titleArtworkWithoutDefault
          : clearSteamTitleArtworkWhilePreservingDormantScale(
              titleArtworkWithoutDefault,
              selectedDiscTemplate,
              steamLogoPlacement,
            ),
      placementRefitRequired: currentTitleArtwork.source !== 'custom',
      status: 'failed',
      statusMessage:
        'Steam title/logo artwork could not be downloaded. Rendered title text and custom game logo upload remain available.',
    }
  }
}
