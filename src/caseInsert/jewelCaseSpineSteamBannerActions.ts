import type {
  ProjectCaseInsertSteamBanner,
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
  type CaseInsertSteamBannerColorField,
  type CaseInsertSteamBannerLayoutField,
} from './steamBanner.ts'
import {
  updateProjectJewelCaseSpineSides,
} from './jewelCaseTransitions.ts'
import type {
  CaseInsertImageSlotImageInput,
} from './types.ts'
import type {
  JewelCaseSpineSide,
} from './types.ts'

function updateJewelCaseSpineSteamBanner(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  updater: (
    banner: ProjectCaseInsertSteamBanner,
  ) => ProjectCaseInsertSteamBanner,
): ProjectJewelCaseState {
  return updateProjectJewelCaseSpineSides(state, side, (spineSide) => ({
    ...spineSide,
    steamBanner: updater(spineSide.steamBanner),
  }))
}

export function setJewelCaseSpineSteamBannerEnabled(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  enabled: boolean,
): ProjectJewelCaseState {
  return updateJewelCaseSpineSteamBanner(state, side, (banner) =>
    setCaseInsertSteamBannerEnabled(banner, enabled),
  )
}

export function setCustomJewelCaseSpineSteamBannerLockupImage(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  image: CaseInsertImageSlotImageInput,
): ProjectJewelCaseState {
  return updateJewelCaseSpineSteamBanner(state, side, (banner) =>
    setCustomCaseInsertSteamBannerLockupImage(banner, image, 'spine'),
  )
}

export function resetJewelCaseSpineSteamBannerLockupImage(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
): ProjectJewelCaseState {
  return updateJewelCaseSpineSteamBanner(state, side, (banner) =>
    resetCaseInsertSteamBannerLockupImage(banner, 'spine'),
  )
}

export function updateJewelCaseSpineSteamBannerLockupLayoutValue(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  field: CaseInsertSteamBannerLayoutField,
  value: number,
): ProjectJewelCaseState {
  return updateJewelCaseSpineSteamBanner(state, side, (banner) =>
    updateCaseInsertSteamBannerLockupLayoutField(banner, field, value),
  )
}

export function resetJewelCaseSpineSteamBannerLockupDefaultLayout(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
): ProjectJewelCaseState {
  return updateJewelCaseSpineSteamBanner(state, side, (banner) =>
    resetCaseInsertSteamBannerLockupLayout(banner, 'spine'),
  )
}

export function setJewelCaseSpineSteamBannerUseTextFallback(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  useTextFallback: boolean,
): ProjectJewelCaseState {
  return updateJewelCaseSpineSteamBanner(state, side, (banner) =>
    setCaseInsertSteamBannerUseTextFallback(banner, useTextFallback),
  )
}

export function updateJewelCaseSpineSteamBannerFallbackText(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  fallbackText: string,
): ProjectJewelCaseState {
  return updateJewelCaseSpineSteamBanner(state, side, (banner) =>
    updateCaseInsertSteamBannerFallbackText(banner, fallbackText),
  )
}

export function updateJewelCaseSpineSteamBannerColor(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  field: CaseInsertSteamBannerColorField,
  value: string,
): ProjectJewelCaseState {
  return updateJewelCaseSpineSteamBanner(state, side, (banner) =>
    updateCaseInsertSteamBannerColor(banner, field, value),
  )
}

export function resetJewelCaseSpineSteamBannerColors(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
): ProjectJewelCaseState {
  return updateJewelCaseSpineSteamBanner(
    state,
    side,
    resetCaseInsertSteamBannerColors,
  )
}
