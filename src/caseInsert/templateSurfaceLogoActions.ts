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
  updateProjectCaseInsertTemplate,
} from './templateSurfaceTransitions.ts'
import type {
  CaseInsertTemplatePaneId,
} from './templateSurfaces.ts'
import type {
  CaseInsertImageSlotImageInput,
} from './types.ts'

export function setCaseInsertTemplatePrimaryLogoSlotEnabled(
  state: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  logoKey: LogoAssetKey,
  enabled: boolean,
): ProjectJewelCaseState {
  return updateProjectCaseInsertTemplate(state, paneId, (templateState) =>
    setCaseInsertPrimaryLogoSlotEnabled(
      templateState,
      paneId,
      logoKey,
      enabled,
    ),
  )
}

export function setCaseInsertTemplatePrimaryLogoSlotImage(
  state: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  logoKey: LogoAssetKey,
  image: CaseInsertImageSlotImageInput,
): ProjectJewelCaseState {
  return updateProjectCaseInsertTemplate(state, paneId, (templateState) =>
    setCaseInsertPrimaryLogoSlotImage(templateState, paneId, logoKey, image),
  )
}

export function updateCaseInsertTemplatePrimaryLogoSlotLayoutValue(
  state: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  logoKey: LogoAssetKey,
  field: keyof ProjectCaseInsertLayout,
  value: number,
): ProjectJewelCaseState {
  return updateProjectCaseInsertTemplate(state, paneId, (templateState) =>
    updateCaseInsertPrimaryLogoSlotLayoutField(
      templateState,
      paneId,
      logoKey,
      field,
      value,
    ),
  )
}

export function resetCaseInsertTemplatePrimaryLogoSlotDefaultLayout(
  state: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  logoKey: LogoAssetKey,
): ProjectJewelCaseState {
  return updateProjectCaseInsertTemplate(state, paneId, (templateState) =>
    resetCaseInsertPrimaryLogoSlotLayout(templateState, paneId, logoKey),
  )
}

export function clearCaseInsertTemplatePrimaryLogoSlotImage(
  state: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  logoKey: LogoAssetKey,
): ProjectJewelCaseState {
  return updateProjectCaseInsertTemplate(state, paneId, (templateState) =>
    clearCaseInsertPrimaryLogoSlotImage(templateState, paneId, logoKey),
  )
}

export function addCaseInsertTemplateAdditionalLogoSlot(
  state: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  logoKey: LogoAssetKey,
): ProjectJewelCaseState {
  return updateProjectCaseInsertTemplate(state, paneId, (templateState) =>
    addCaseInsertAdditionalLogoSlot(templateState, paneId, logoKey),
  )
}
