import {
  createDefaultCaseInsertImageSlot,
  createDefaultJewelCaseSpineArtworkSlot,
  createDefaultJewelCaseSpineMarkSlot,
} from './defaults.ts'
import {
  CASE_INSERT_DEFAULT_IMPORTED_SPINE_TITLE_ARTWORK_LAYOUT,
} from './defaultImportLayouts.ts'
import {
  withCaseInsertAdditionalLogoImageSource,
} from './brandingLogoSlots.ts'
import { createCaseInsertPngExportLayout } from './exportLayout.ts'
import {
  fitCaseInsertImageSlotToRegionHeight,
  setCaseInsertImageSlotEnabled,
  updateCaseInsertImageSlotFit,
  updateCaseInsertImageSlotLayoutField,
} from './imageSlotTransitions.ts'
import {
  getJewelCaseSteamBannerOpenArtworkRegion,
} from '../layout/jewelCaseSteamBannerLayout.ts'
import type {
  CaseInsertImageSlotImageInput,
  JewelCaseSpineSide,
} from './types.ts'
import type {
  JewelCaseSpineImageSlotGroupKey,
  JewelCaseSpineImageSlotKey,
} from './jewelCaseTransitions.ts'
import type {
  ProjectCaseInsertImageFit,
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertLayout,
  ProjectJewelCaseState,
} from '../project/projectTypes.ts'
import {
  getNextRepeatedArtworkSlotNumber,
} from '../editor/repeatedArtwork.ts'
import {
  getCaseInsertMarkLayerKind,
} from './brandingSlotSources.ts'
import {
  getJewelCaseSpineMarkDefaultLayout,
} from './defaultBrandingLayouts.ts'
import {
  restoreCaseInsertTitleArtworkDefaultSteamLogo,
} from './titleArtwork.ts'
import {
  updateProjectJewelCaseSpineSides,
} from './jewelCaseTransitions.ts'

export const defaultSpineImageSlotLayouts: Record<
  JewelCaseSpineSide,
  Record<JewelCaseSpineImageSlotKey, ProjectCaseInsertLayout>
> = {
  left: {
    background: { scale: 1, x: 0, y: 0, rotation: 0 },
    titleArtwork: CASE_INSERT_DEFAULT_IMPORTED_SPINE_TITLE_ARTWORK_LAYOUT,
  },
  right: {
    background: { scale: 1, x: 0, y: 0, rotation: 0 },
    titleArtwork: CASE_INSERT_DEFAULT_IMPORTED_SPINE_TITLE_ARTWORK_LAYOUT,
  },
}

const defaultSpineGroupedImageSlotLayouts: Record<
  JewelCaseSpineSide,
  Record<JewelCaseSpineImageSlotGroupKey, ProjectCaseInsertLayout>
> = {
  left: {
    artworkSlots: { scale: 1, x: 50, y: 72, rotation: 0 },
    logoSlots: { scale: 1, x: 50, y: 84, rotation: 0 },
    markSlots: { scale: 1, x: 50, y: 82, rotation: 0 },
  },
  right: {
    artworkSlots: { scale: 1, x: 50, y: 72, rotation: 0 },
    logoSlots: { scale: 1, x: 50, y: 84, rotation: 0 },
    markSlots: { scale: 1, x: 50, y: 82, rotation: 0 },
  },
}

export function getSpineLogoSlotIdPrefix(side: JewelCaseSpineSide) {
  return `${side}-spine-logo`
}

export function getSpineBackgroundFitRegion(
  caseInsert: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
) {
  const layout = createCaseInsertPngExportLayout(caseInsert, 'tray')

  return getJewelCaseSteamBannerOpenArtworkRegion(
    caseInsert.spine[side].steamBanner,
    { kind: 'spine', side },
    layout,
  )
}

export function setJewelCaseSpineImageSlotEnabled(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  slotKey: JewelCaseSpineImageSlotKey,
  enabled: boolean,
): ProjectJewelCaseState {
  return updateProjectJewelCaseSpineSides(
    state,
    side,
    (spineSide) => ({
      ...spineSide,
      [slotKey]: setCaseInsertImageSlotEnabled(spineSide[slotKey], enabled),
    }),
  )
}

export function updateJewelCaseSpineImageSlotFit(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  slotKey: JewelCaseSpineImageSlotKey,
  fit: ProjectCaseInsertImageFit,
): ProjectJewelCaseState {
  return updateProjectJewelCaseSpineSides(
    state,
    side,
    (spineSide) => ({
      ...spineSide,
      [slotKey]: updateCaseInsertImageSlotFit(spineSide[slotKey], fit),
    }),
  )
}

export function updateJewelCaseSpineImageSlotLayoutValue(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  slotKey: JewelCaseSpineImageSlotKey,
  field: keyof ProjectCaseInsertLayout,
  value: number,
): ProjectJewelCaseState {
  return updateProjectJewelCaseSpineSides(
    state,
    side,
    (spineSide) => ({
      ...spineSide,
      [slotKey]: updateCaseInsertImageSlotLayoutField(
        spineSide[slotKey],
        field,
        value,
      ),
    }),
  )
}

export function resetJewelCaseSpineImageSlotDefaultLayout(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  slotKey: JewelCaseSpineImageSlotKey,
): ProjectJewelCaseState {
  return updateProjectJewelCaseSpineSides(
    state,
    side,
    (spineSide, targetSide) => ({
      ...spineSide,
      [slotKey]: {
        ...spineSide[slotKey],
        layout: defaultSpineImageSlotLayouts[targetSide][slotKey],
      },
    }),
  )
}

export function restoreJewelCaseSpineTitleArtworkDefault(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
): ProjectJewelCaseState {
  return updateProjectJewelCaseSpineSides(
    state,
    side,
    (spineSide) => ({
      ...spineSide,
      titleArtwork: restoreCaseInsertTitleArtworkDefaultSteamLogo(
        spineSide.titleArtwork,
      ),
    }),
  )
}

export function fitJewelCaseSpineImageSlotToRegionHeight(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  slotKey: JewelCaseSpineImageSlotKey,
): ProjectJewelCaseState {
  if (slotKey !== 'background') {
    return state
  }

  return updateProjectJewelCaseSpineSides(
    state,
    side,
    (spineSide, targetSide) => {
      const region = getSpineBackgroundFitRegion(state, targetSide)

      return region
        ? {
            ...spineSide,
            background: fitCaseInsertImageSlotToRegionHeight(
              spineSide.background,
              region,
            ),
          }
        : spineSide
    },
  )
}

export function clearJewelCaseSpineImageSlotImage(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  slotKey: JewelCaseSpineImageSlotKey,
): ProjectJewelCaseState {
  return updateProjectJewelCaseSpineSides(
    state,
    side,
    (spineSide) => ({
      ...spineSide,
      [slotKey]: {
        ...spineSide[slotKey],
        imageDataUrl: null,
        imageSize: null,
        imageSource: null,
      },
    }),
  )
}

function getNextSpineArtworkSlotIndex(
  side: JewelCaseSpineSide,
  slots: ProjectCaseInsertImageSlot[],
) {
  return getNextRepeatedArtworkSlotNumber(
    slots,
    `${side}-spine-artwork`,
  )
}

function getNextSpineMarkSlotIndex(
  side: JewelCaseSpineSide,
  slots: ProjectCaseInsertImageSlot[],
) {
  const idPrefix = `${side}-spine-mark`
  let index = slots.length + 1

  while (slots.some(({ id }) => id === `${idPrefix}-${index}`)) {
    index += 1
  }

  return index
}

function getNextSpineLogoSlotIndex(
  side: JewelCaseSpineSide,
  slots: ProjectCaseInsertImageSlot[],
) {
  const idPrefix = getSpineLogoSlotIdPrefix(side)
  let index = slots.length + 1

  while (slots.some(({ id }) => id === `${idPrefix}-${index}`)) {
    index += 1
  }

  return index
}

function createDefaultJewelCaseSpineLogoSlot(
  side: JewelCaseSpineSide,
  index: number,
) {
  return createDefaultCaseInsertImageSlot(
    `${getSpineLogoSlotIdPrefix(side)}-${index}`,
    `Logo ${index}`,
    {
      fit: 'contain',
      layout: defaultSpineGroupedImageSlotLayouts[side].logoSlots,
    },
  )
}

export function createDefaultJewelCaseSpineGroupedImageSlot(
  side: JewelCaseSpineSide,
  slotKey: JewelCaseSpineImageSlotGroupKey,
  slots: ProjectCaseInsertImageSlot[],
) {
  if (slotKey === 'artworkSlots') {
    return createDefaultJewelCaseSpineArtworkSlot(
      side,
      getNextSpineArtworkSlotIndex(side, slots),
    )
  }

  if (slotKey === 'logoSlots') {
    return createDefaultJewelCaseSpineLogoSlot(
      side,
      getNextSpineLogoSlotIndex(side, slots),
    )
  }

  return createDefaultJewelCaseSpineMarkSlot(
    side,
    getNextSpineMarkSlotIndex(side, slots),
  )
}

export function getSpineGroupedImageSlotResetLayout(
  side: JewelCaseSpineSide,
  slotKey: JewelCaseSpineImageSlotGroupKey,
  slot: ProjectCaseInsertImageSlot,
) {
  const sourceId = slot.imageSource?.sourceId

  return slotKey === 'markSlots' && sourceId?.startsWith('case-')
    ? getJewelCaseSpineMarkDefaultLayout(getCaseInsertMarkLayerKind(sourceId))
    : defaultSpineGroupedImageSlotLayouts[side][slotKey]
}

function preserveSpineMarkSource(
  slotKey: JewelCaseSpineImageSlotGroupKey,
  slot: Pick<ProjectCaseInsertImageSlot, 'imageSource'>,
  image: CaseInsertImageSlotImageInput,
): CaseInsertImageSlotImageInput {
  if (slotKey !== 'markSlots' || !slot.imageSource?.sourceId?.startsWith('case-')) {
    return image
  }

  return {
    ...image,
    imageSource: {
      ...image.imageSource,
      sourceId: slot.imageSource.sourceId,
      sourceLabel: image.imageSource?.sourceLabel ?? slot.imageSource.sourceLabel,
    },
  }
}

export function preserveSpineGroupedSlotSource(
  slotKey: JewelCaseSpineImageSlotGroupKey,
  slot: ProjectCaseInsertImageSlot,
  image: CaseInsertImageSlotImageInput,
): CaseInsertImageSlotImageInput {
  if (slotKey === 'logoSlots') {
    return withCaseInsertAdditionalLogoImageSource(slot, image)
  }

  return preserveSpineMarkSource(slotKey, slot, image)
}
