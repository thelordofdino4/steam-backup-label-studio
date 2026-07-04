import type {
  ProjectJewelCaseState,
} from '../project/projectTypes.ts'
import {
  resetCaseInsertSteamBannerColors,
  resetCaseInsertSteamBannerLockupImage,
  resetCaseInsertSteamBannerLockupLayout,
  setCaseInsertSteamBannerEnabled,
  setCaseInsertSteamBannerUseTextFallback,
  setCustomCaseInsertSteamBannerLockupImage,
  updateCaseInsertSteamBannerColor,
  updateCaseInsertSteamBannerFallbackText,
  updateCaseInsertSteamBannerLockupLayoutField,
  updateCaseInsertTemplateSteamBanner,
  type CaseInsertSteamBannerColorField,
  type CaseInsertSteamBannerLayoutField,
} from './steamBanner.ts'
import type {
  CaseInsertTemplatePaneId,
} from './templateSurfaces.ts'
import type {
  CaseInsertImageSlotImageInput,
} from './types.ts'

export function setCaseInsertTemplateSteamBannerEnabled(
  state: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  enabled: boolean,
): ProjectJewelCaseState {
  return updateCaseInsertTemplateSteamBanner(state, paneId, (banner) =>
    setCaseInsertSteamBannerEnabled(banner, enabled),
  )
}

export function setCustomCaseInsertTemplateSteamBannerLockupImage(
  state: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  image: CaseInsertImageSlotImageInput,
): ProjectJewelCaseState {
  return updateCaseInsertTemplateSteamBanner(state, paneId, (banner) =>
    setCustomCaseInsertSteamBannerLockupImage(banner, image, 'cover'),
  )
}

export function resetCaseInsertTemplateSteamBannerLockupImage(
  state: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
): ProjectJewelCaseState {
  return updateCaseInsertTemplateSteamBanner(state, paneId, (banner) =>
    resetCaseInsertSteamBannerLockupImage(banner, 'cover'),
  )
}

export function updateCaseInsertTemplateSteamBannerLockupLayoutValue(
  state: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  field: CaseInsertSteamBannerLayoutField,
  value: number,
): ProjectJewelCaseState {
  return updateCaseInsertTemplateSteamBanner(state, paneId, (banner) =>
    updateCaseInsertSteamBannerLockupLayoutField(banner, field, value),
  )
}

export function resetCaseInsertTemplateSteamBannerLockupDefaultLayout(
  state: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
): ProjectJewelCaseState {
  return updateCaseInsertTemplateSteamBanner(state, paneId, (banner) =>
    resetCaseInsertSteamBannerLockupLayout(banner, 'cover'),
  )
}

export function setCaseInsertTemplateSteamBannerUseTextFallback(
  state: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  useTextFallback: boolean,
): ProjectJewelCaseState {
  return updateCaseInsertTemplateSteamBanner(state, paneId, (banner) =>
    setCaseInsertSteamBannerUseTextFallback(banner, useTextFallback),
  )
}

export function updateCaseInsertTemplateSteamBannerFallbackText(
  state: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  fallbackText: string,
): ProjectJewelCaseState {
  return updateCaseInsertTemplateSteamBanner(state, paneId, (banner) =>
    updateCaseInsertSteamBannerFallbackText(banner, fallbackText),
  )
}

export function updateCaseInsertTemplateSteamBannerColor(
  state: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  field: CaseInsertSteamBannerColorField,
  value: string,
): ProjectJewelCaseState {
  return updateCaseInsertTemplateSteamBanner(state, paneId, (banner) =>
    updateCaseInsertSteamBannerColor(banner, field, value),
  )
}

export function resetCaseInsertTemplateSteamBannerColors(
  state: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
): ProjectJewelCaseState {
  return updateCaseInsertTemplateSteamBanner(
    state,
    paneId,
    resetCaseInsertSteamBannerColors,
  )
}
