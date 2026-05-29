import type { SteamLogoPlacement } from '../discText.ts'
import { clampTitleArtworkLayoutToSafeZone } from '../layout/discElementSafeZone.ts'
import {
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

export type SteamTitleArtworkImportStatus =
  | 'seeded'
  | 'unavailable'
  | 'failed'

export type SteamTitleArtworkImportResult = {
  titleArtwork: ProjectTitleArtwork
  status: SteamTitleArtworkImportStatus
  statusMessage: string
}

type SteamTitleArtworkImportOptions = {
  downloadArtworkAsDataUrl?: (url: string) => Promise<string>
  createImportedImageAsset?: (imageDataUrl: string) => Promise<ImportedImageAsset>
}

function isPreferredSteamCdnLogoAsset(asset: SteamArtworkAsset) {
  return asset.id === 'cdn-logo' || asset.label.toLowerCase() === 'steam cdn logo'
}

export function findSteamTitleArtworkAsset(
  importedGame: SteamImportedGame,
): SteamArtworkAsset | null {
  const logoAssets = importedGame.artwork.filter((asset) => asset.kind === 'logo')

  return logoAssets.find(isPreferredSteamCdnLogoAsset) ?? logoAssets[0] ?? null
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
    return {
      titleArtwork:
        currentTitleArtwork.source === 'custom'
          ? currentTitleArtwork
          : clearTitleArtworkImage(
              currentTitleArtwork,
              selectedDiscTemplate,
              steamLogoPlacement,
            ),
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
    )
    const nextLayout = clampTitleArtworkLayoutToSafeZone(
      nextTitleArtwork.layout,
      selectedDiscTemplate,
      nextTitleArtwork.imageSize,
    )

    return {
      titleArtwork: setTitleArtworkLayout(nextTitleArtwork, nextLayout),
      status: 'seeded',
      statusMessage: `Using ${steamLogoAsset.label} as the disc title artwork.`,
    }
  } catch {
    return {
      titleArtwork:
        currentTitleArtwork.source === 'custom'
          ? currentTitleArtwork
          : clearTitleArtworkImage(
              currentTitleArtwork,
              selectedDiscTemplate,
              steamLogoPlacement,
            ),
      status: 'failed',
      statusMessage:
        'Steam title/logo artwork could not be downloaded. Rendered title text and custom game logo upload remain available.',
    }
  }
}
