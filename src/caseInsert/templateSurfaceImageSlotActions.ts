import {
  withCaseInsertAdditionalLogoImageSource,
} from './brandingLogoSlots.ts'
import {
  getCaseInsertMarkLayerKind,
} from './brandingSlotSources.ts'
import {
  getCaseInsertTemplateMarkDefaultLayout,
} from './defaultBrandingLayouts.ts'
import { createCaseInsertPngExportLayout } from './exportLayout.ts'
import {
  clearCaseInsertImageSlotImage,
  fitCaseInsertImageSlotToRegionHeight,
  setCaseInsertImageSlotEnabled,
  updateCaseInsertImageSlotFit,
  updateCaseInsertImageSlotLayoutField,
} from './imageSlotTransitions.ts'
import type {
  CaseInsertImageSlotImageInput,
} from './types.ts'
import {
  getCaseInsertImageSlotGroupConfig,
  type CaseInsertPrimaryImageSlotKey,
  updateCaseInsertTemplateImageSlot,
} from './templateSurfaceTransitions.ts'
import type {
  CaseInsertImageSlotGroupKey,
  CaseInsertTemplatePaneId,
} from './templateSurfaces.ts'
import {
  restoreCaseInsertTitleArtworkDefaultSteamLogo,
} from './titleArtwork.ts'
import {
  getJewelCaseSteamBannerOpenArtworkRegion,
} from '../layout/jewelCaseSteamBannerLayout.ts'
import type {
  ProjectCaseInsertImageFit,
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertLayout,
  ProjectJewelCaseState,
} from '../project/projectTypes.ts'

export const defaultCaseInsertTemplatePrimarySlotLayouts: Record<
  CaseInsertTemplatePaneId,
  Record<CaseInsertPrimaryImageSlotKey, ProjectCaseInsertLayout>
> = {
  cover: {
    background: { scale: 1, x: 0, y: 0, rotation: 0 },
    titleArtwork: { scale: 1, x: 50, y: 24, rotation: 0 },
  },
  tray: {
    background: { scale: 1, x: 0, y: 0, rotation: 0 },
    titleArtwork: { scale: 1, x: 50, y: 24, rotation: 0 },
  },
}

export function getCaseInsertTemplateGroupDefaultLayout(
  paneId: CaseInsertTemplatePaneId,
  slotKey: CaseInsertImageSlotGroupKey,
): ProjectCaseInsertLayout {
  return {
    scale: 1,
    x: 0,
    y: 0,
    rotation: 0,
    ...getCaseInsertImageSlotGroupConfig(paneId, slotKey).defaultLayout,
  }
}

export function getCaseInsertTemplateGroupedImageSlotResetLayout(
  paneId: CaseInsertTemplatePaneId,
  slotKey: CaseInsertImageSlotGroupKey,
  slot: ProjectCaseInsertImageSlot,
): ProjectCaseInsertLayout {
  const sourceId = slot.imageSource?.sourceId

  return slotKey === 'markSlots' && sourceId?.startsWith('case-')
    ? getCaseInsertTemplateMarkDefaultLayout(
        paneId,
        getCaseInsertMarkLayerKind(sourceId),
      )
    : getCaseInsertTemplateGroupDefaultLayout(paneId, slotKey)
}

export function getCaseInsertTemplatePrimaryImageSlotFitRegion(
  caseInsert: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  slotKey: CaseInsertPrimaryImageSlotKey,
) {
  if (slotKey !== 'background') {
    return null
  }

  const layout = createCaseInsertPngExportLayout(caseInsert, paneId)

  if (paneId === 'cover') {
    return getJewelCaseSteamBannerOpenArtworkRegion(
      caseInsert.templates.cover.steamBanner,
      { kind: 'cover' },
      layout,
    )
  }

  return layout.regions.find(({ regionId }) => regionId === 'back')?.bounds ??
    null
}

export function setCaseInsertTemplatePrimaryImageSlotEnabled(
  state: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  slotKey: CaseInsertPrimaryImageSlotKey,
  enabled: boolean,
): ProjectJewelCaseState {
  return updateCaseInsertTemplateImageSlot(
    state,
    paneId,
    slotKey,
    (slot) => setCaseInsertImageSlotEnabled(slot, enabled),
  )
}

export function updateCaseInsertTemplatePrimaryImageSlotFit(
  state: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  slotKey: CaseInsertPrimaryImageSlotKey,
  fit: ProjectCaseInsertImageFit,
): ProjectJewelCaseState {
  return updateCaseInsertTemplateImageSlot(
    state,
    paneId,
    slotKey,
    (slot) => updateCaseInsertImageSlotFit(slot, fit),
  )
}

export function updateCaseInsertTemplatePrimaryImageSlotLayoutValue(
  state: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  slotKey: CaseInsertPrimaryImageSlotKey,
  field: keyof ProjectCaseInsertLayout,
  value: number,
): ProjectJewelCaseState {
  return updateCaseInsertTemplateImageSlot(
    state,
    paneId,
    slotKey,
    (slot) => updateCaseInsertImageSlotLayoutField(slot, field, value),
  )
}

export function resetCaseInsertTemplatePrimaryImageSlotDefaultLayout(
  state: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  slotKey: CaseInsertPrimaryImageSlotKey,
): ProjectJewelCaseState {
  return updateCaseInsertTemplateImageSlot(
    state,
    paneId,
    slotKey,
    (slot) => ({
      ...slot,
      layout: defaultCaseInsertTemplatePrimarySlotLayouts[paneId][slotKey],
    }),
  )
}

export function restoreCaseInsertTemplateTitleArtworkDefault(
  state: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
): ProjectJewelCaseState {
  return updateCaseInsertTemplateImageSlot(
    state,
    paneId,
    'titleArtwork',
    restoreCaseInsertTitleArtworkDefaultSteamLogo,
  )
}

export function fitCaseInsertTemplatePrimaryImageSlotToRegionHeight(
  state: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  slotKey: CaseInsertPrimaryImageSlotKey,
): ProjectJewelCaseState {
  const region = getCaseInsertTemplatePrimaryImageSlotFitRegion(
    state,
    paneId,
    slotKey,
  )

  return region
    ? updateCaseInsertTemplateImageSlot(
        state,
        paneId,
        slotKey,
        (slot) => fitCaseInsertImageSlotToRegionHeight(slot, region),
      )
    : state
}

export function clearCaseInsertTemplatePrimaryImageSlot(
  state: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  slotKey: CaseInsertPrimaryImageSlotKey,
): ProjectJewelCaseState {
  return updateCaseInsertTemplateImageSlot(
    state,
    paneId,
    slotKey,
    clearCaseInsertImageSlotImage,
  )
}

function preserveCaseInsertTemplateMarkSource(
  slotKey: CaseInsertImageSlotGroupKey,
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

export function preserveCaseInsertTemplateGroupedSlotSource(
  slotKey: CaseInsertImageSlotGroupKey,
  slot: ProjectCaseInsertImageSlot,
  image: CaseInsertImageSlotImageInput,
): CaseInsertImageSlotImageInput {
  if (slotKey === 'logoSlots') {
    return withCaseInsertAdditionalLogoImageSource(slot, image)
  }

  return preserveCaseInsertTemplateMarkSource(slotKey, slot, image)
}
