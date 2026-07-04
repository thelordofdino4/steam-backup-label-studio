import type {
  LogoAssetKey,
} from '../project/projectLogoAssets.ts'
import type {
  ProjectCaseInsertLayout,
  ProjectJewelCaseState,
} from '../project/projectTypes.ts'
import {
  addCaseInsertAdditionalLogoSlot,
  clearCaseInsertPrimaryLogoSlotImage,
  resetCaseInsertPrimaryLogoSlotLayout,
  setCaseInsertPrimaryLogoSlotEnabled,
  setCaseInsertPrimaryLogoSlotImage,
  updateCaseInsertPrimaryLogoSlotLayoutField,
} from './brandingLogoSlots.ts'
import {
  updateProjectJewelCaseSpineSides,
} from './jewelCaseTransitions.ts'
import {
  getSpineLogoSlotIdPrefix,
} from './jewelCaseSpineImageSlotActions.ts'
import type {
  CaseInsertImageSlotImageInput,
  JewelCaseSpineSide,
} from './types.ts'

export function setJewelCaseSpinePrimaryLogoSlotEnabled(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  logoKey: LogoAssetKey,
  enabled: boolean,
): ProjectJewelCaseState {
  return updateProjectJewelCaseSpineSides(state, side, (spineSide, targetSide) =>
    setCaseInsertPrimaryLogoSlotEnabled(
      spineSide,
      'spine',
      logoKey,
      enabled,
      getSpineLogoSlotIdPrefix(targetSide),
    ),
  )
}

export function setJewelCaseSpinePrimaryLogoSlotImage(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  logoKey: LogoAssetKey,
  image: CaseInsertImageSlotImageInput,
): ProjectJewelCaseState {
  return updateProjectJewelCaseSpineSides(state, side, (spineSide, targetSide) =>
    setCaseInsertPrimaryLogoSlotImage(
      spineSide,
      'spine',
      logoKey,
      image,
      getSpineLogoSlotIdPrefix(targetSide),
    ),
  )
}

export function updateJewelCaseSpinePrimaryLogoSlotLayoutValue(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  logoKey: LogoAssetKey,
  field: keyof ProjectCaseInsertLayout,
  value: number,
): ProjectJewelCaseState {
  return updateProjectJewelCaseSpineSides(state, side, (spineSide, targetSide) =>
    updateCaseInsertPrimaryLogoSlotLayoutField(
      spineSide,
      'spine',
      logoKey,
      field,
      value,
      getSpineLogoSlotIdPrefix(targetSide),
    ),
  )
}

export function resetJewelCaseSpinePrimaryLogoSlotDefaultLayout(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  logoKey: LogoAssetKey,
): ProjectJewelCaseState {
  return updateProjectJewelCaseSpineSides(state, side, (spineSide, targetSide) =>
    resetCaseInsertPrimaryLogoSlotLayout(
      spineSide,
      'spine',
      logoKey,
      getSpineLogoSlotIdPrefix(targetSide),
    ),
  )
}

export function clearJewelCaseSpinePrimaryLogoSlotImage(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  logoKey: LogoAssetKey,
): ProjectJewelCaseState {
  return updateProjectJewelCaseSpineSides(state, side, (spineSide, targetSide) =>
    clearCaseInsertPrimaryLogoSlotImage(
      spineSide,
      'spine',
      logoKey,
      getSpineLogoSlotIdPrefix(targetSide),
    ),
  )
}

export function addJewelCaseSpineAdditionalLogoSlot(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  logoKey: LogoAssetKey,
): ProjectJewelCaseState {
  return updateProjectJewelCaseSpineSides(state, side, (spineSide, targetSide) =>
    addCaseInsertAdditionalLogoSlot(
      spineSide,
      'spine',
      logoKey,
      getSpineLogoSlotIdPrefix(targetSide),
    ),
  )
}
