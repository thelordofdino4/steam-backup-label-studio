import { createProjectImageAssetProvenance } from '../project/projectAssetStatus.ts'
import {
  shouldRenderOptionalVisualFeature,
  setOptionalVisualFeatureEnabled,
} from '../editor/optionalVisualFeature.ts'
import type {
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertTitleArtworkDefaultAsset,
  ProjectJewelCaseState,
} from '../project/projectTypes.ts'
import type {
  SteamArtworkAsset,
  SteamImportedGame,
} from '../steam/steamApi.ts'
import {
  getSteamTitleArtworkAssetCandidates,
} from '../steam/steamTitleArtworkImport.ts'
import type { CaseInsertImageSlotImageInput } from './types.ts'
import {
  clearCaseInsertImageSlotImage,
  setCaseInsertImageSlotImage,
} from './imageSlotTransitions.ts'
import {
  createSteamArtworkCaseInsertImageSlotImage,
} from './imageSlotSourceImport.ts'
import {
  CASE_INSERT_DEFAULT_IMPORTED_SPINE_TITLE_ARTWORK_LAYOUT,
} from './defaultImportLayouts.ts'
import { imageSizesWithContentBoundsMatch } from '../image/imageContentBounds.ts'

export type CaseInsertTitleArtworkImportStatus =
  | 'seeded'
  | 'unavailable'
  | 'failed'

export type CaseInsertTitleArtworkImportSeed =
  | {
      image: CaseInsertImageSlotImageInput
      status: 'seeded'
      statusMessage: string
      steamArtworkAsset: SteamArtworkAsset
    }
  | {
      status: 'unavailable' | 'failed'
      statusMessage: string
    }

type CaseInsertTitleArtworkImportSeedOptions = {
  createSteamArtworkImage?: (
    asset: SteamArtworkAsset,
  ) => Promise<CaseInsertImageSlotImageInput>
}

export const CASE_INSERT_GAME_LOGO_EMPTY_HINT =
  'No game logo image is selected yet. Importing a Steam game can seed Steam title/logo artwork automatically, or upload a custom image here.'

export const CASE_INSERT_CUSTOM_GAME_LOGO_SOURCE_LABEL =
  'Custom game logo artwork'

function isSameCaseInsertTitleArtworkDefaultImage(
  slot: ProjectCaseInsertImageSlot,
  defaultSteamLogo: ProjectCaseInsertTitleArtworkDefaultAsset,
) {
  return slot.imageDataUrl === defaultSteamLogo.imageDataUrl &&
    imageSizesWithContentBoundsMatch(slot.imageSize, defaultSteamLogo.imageSize)
}

function createSteamTitleArtworkImageSource(
  steamArtworkAsset: SteamArtworkAsset,
) {
  return createProjectImageAssetProvenance({
    source: 'steam-artwork',
    sourceId: steamArtworkAsset.id,
    sourceLabel: steamArtworkAsset.label,
    sourceUrl: steamArtworkAsset.url,
  })
}

function createCaseInsertTitleArtworkDefaultSteamLogo(
  image: CaseInsertImageSlotImageInput,
  steamArtworkAsset: SteamArtworkAsset,
): ProjectCaseInsertTitleArtworkDefaultAsset {
  return {
    steamArtworkAssetId: steamArtworkAsset.id,
    sourceLabel: steamArtworkAsset.label,
    sourceUrl: steamArtworkAsset.url,
    imageDataUrl: image.imageDataUrl,
    imageSize: image.imageSize,
  }
}

function isCustomCaseInsertTitleArtwork(slot: ProjectCaseInsertImageSlot) {
  return Boolean(slot.imageDataUrl && slot.imageSource?.source !== 'steam-artwork')
}

export function canUseCaseInsertTitleArtwork(
  slot: ProjectCaseInsertImageSlot,
) {
  return Boolean(slot.imageDataUrl)
}

export function shouldRenderCaseInsertTitleArtwork(
  slot: ProjectCaseInsertImageSlot,
) {
  return shouldRenderOptionalVisualFeature(
    slot,
    canUseCaseInsertTitleArtwork(slot),
  )
}

export function getCaseInsertTitleArtworkDefaultSteamLogo(
  slot: ProjectCaseInsertImageSlot,
) {
  return slot.defaultSteamLogo
}

export function canRestoreCaseInsertTitleArtworkDefaultSteamLogo(
  slot: ProjectCaseInsertImageSlot,
) {
  const defaultSteamLogo = getCaseInsertTitleArtworkDefaultSteamLogo(slot)

  if (!defaultSteamLogo) {
    return false
  }

  return !isSameCaseInsertTitleArtworkDefaultImage(slot, defaultSteamLogo) ||
    slot.imageSource?.source !== 'steam-artwork' ||
    slot.imageSource?.sourceId !== defaultSteamLogo.steamArtworkAssetId
}

export function setCaseInsertTitleArtworkSteamImage(
  slot: ProjectCaseInsertImageSlot,
  image: CaseInsertImageSlotImageInput,
  steamArtworkAsset: SteamArtworkAsset,
  options: { rememberAsDefault?: boolean } = {},
): ProjectCaseInsertImageSlot {
  const nextSlot = setCaseInsertImageSlotImage(slot, {
    ...image,
    imageSource: createSteamTitleArtworkImageSource(steamArtworkAsset),
  })

  return {
    ...nextSlot,
    defaultSteamLogo: options.rememberAsDefault
      ? createCaseInsertTitleArtworkDefaultSteamLogo(image, steamArtworkAsset)
      : slot.defaultSteamLogo,
  }
}

export function setCustomCaseInsertTitleArtworkImage(
  slot: ProjectCaseInsertImageSlot,
  image: CaseInsertImageSlotImageInput,
): ProjectCaseInsertImageSlot {
  return {
    ...setCaseInsertImageSlotImage(slot, image),
    defaultSteamLogo: slot.defaultSteamLogo,
  }
}

export function clearCaseInsertTitleArtworkDefaultSteamLogo(
  slot: ProjectCaseInsertImageSlot,
): ProjectCaseInsertImageSlot {
  return {
    ...slot,
    defaultSteamLogo: null,
  }
}

export function clearCaseInsertTitleArtworkImage(
  slot: ProjectCaseInsertImageSlot,
): ProjectCaseInsertImageSlot {
  return clearCaseInsertImageSlotImage(slot)
}

export function restoreCaseInsertTitleArtworkDefaultSteamLogo(
  slot: ProjectCaseInsertImageSlot,
): ProjectCaseInsertImageSlot {
  const defaultSteamLogo = getCaseInsertTitleArtworkDefaultSteamLogo(slot)

  if (!defaultSteamLogo) {
    return slot
  }

  return {
    ...setOptionalVisualFeatureEnabled(slot, true),
    imageDataUrl: defaultSteamLogo.imageDataUrl,
    imageSize: defaultSteamLogo.imageSize,
    imageSource: createProjectImageAssetProvenance({
      source: 'steam-artwork',
      sourceId: defaultSteamLogo.steamArtworkAssetId,
      sourceLabel: defaultSteamLogo.sourceLabel,
      sourceUrl: defaultSteamLogo.sourceUrl,
    }),
    defaultSteamLogo,
  }
}

export async function createSteamCaseInsertTitleArtworkSeed(
  importedGame: SteamImportedGame,
  options: CaseInsertTitleArtworkImportSeedOptions = {},
): Promise<CaseInsertTitleArtworkImportSeed> {
  const steamLogoAssets = getSteamTitleArtworkAssetCandidates(importedGame)

  if (steamLogoAssets.length === 0) {
    return {
      status: 'unavailable',
      statusMessage:
        'No Steam title/logo artwork was found. Custom case insert game logo upload remains available.',
    }
  }

  const createSteamArtworkImage =
    options.createSteamArtworkImage ?? createSteamArtworkCaseInsertImageSlotImage

  for (const steamLogoAsset of steamLogoAssets) {
    try {
      return {
        image: await createSteamArtworkImage(steamLogoAsset),
        status: 'seeded',
        statusMessage: `Using ${steamLogoAsset.label} as the case insert game logo.`,
        steamArtworkAsset: steamLogoAsset,
      }
    } catch {
      // Try the next Steam logo candidate before declaring the import failed.
    }
  }

  return {
    status: 'failed',
    statusMessage:
      'Steam title/logo artwork could not be downloaded. Custom case insert game logo upload remains available.',
  }
}

export function applySteamCaseInsertTitleArtworkSeedToSlot(
  slot: ProjectCaseInsertImageSlot,
  seed: CaseInsertTitleArtworkImportSeed,
): ProjectCaseInsertImageSlot {
  if (seed.status === 'seeded') {
    return setCaseInsertTitleArtworkSteamImage(
      slot,
      seed.image,
      seed.steamArtworkAsset,
      { rememberAsDefault: true },
    )
  }

  const slotWithoutDefault = clearCaseInsertTitleArtworkDefaultSteamLogo(slot)

  return isCustomCaseInsertTitleArtwork(slotWithoutDefault)
    ? slotWithoutDefault
    : clearCaseInsertTitleArtworkImage(slotWithoutDefault)
}

export function applySteamCaseInsertTitleArtworkSeedToProject(
  caseInsert: ProjectJewelCaseState,
  seed: CaseInsertTitleArtworkImportSeed,
): ProjectJewelCaseState {
  const applySeed = (slot: ProjectCaseInsertImageSlot) =>
    applySteamCaseInsertTitleArtworkSeedToSlot(slot, seed)
  const applySpineSeed = (slot: ProjectCaseInsertImageSlot) => {
    const seededSlot = applySeed(slot)

    return seed.status === 'seeded'
      ? {
          ...seededSlot,
          layout: {
            ...seededSlot.layout,
            ...CASE_INSERT_DEFAULT_IMPORTED_SPINE_TITLE_ARTWORK_LAYOUT,
          },
        }
      : seededSlot
  }
  const hideSpineTitleForImportedLogo = seed.status === 'seeded'

  return {
    ...caseInsert,
    templates: {
      ...caseInsert.templates,
      cover: {
        ...caseInsert.templates.cover,
        titleArtwork: applySeed(caseInsert.templates.cover.titleArtwork),
      },
      tray: {
        ...caseInsert.templates.tray,
        titleArtwork: applySeed(caseInsert.templates.tray.titleArtwork),
      },
    },
    spine: {
      left: {
        ...caseInsert.spine.left,
        titleArtwork: applySpineSeed(caseInsert.spine.left.titleArtwork),
        title: hideSpineTitleForImportedLogo
          ? { ...caseInsert.spine.left.title, enabled: false }
          : caseInsert.spine.left.title,
      },
      right: {
        ...caseInsert.spine.right,
        titleArtwork: applySpineSeed(caseInsert.spine.right.titleArtwork),
        title: hideSpineTitleForImportedLogo
          ? { ...caseInsert.spine.right.title, enabled: false }
          : caseInsert.spine.right.title,
      },
    },
  }
}
