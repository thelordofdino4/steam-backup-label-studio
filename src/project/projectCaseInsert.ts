export {
  DEFAULT_CASE_INSERT_PROJECT_TITLE,
  createDefaultCaseInsertImageSlot,
  createDefaultCaseInsertTemplateStates,
  createDefaultCaseInsertTextBlock,
  createDefaultCaseInsertTextList,
  createDefaultJewelCaseSpineMarkSlot,
  createDefaultProjectJewelCaseState,
} from '../caseInsert/defaults.ts'
export {
  clearCaseInsertImageSlotImage,
  fitCaseInsertImageSlotToRegionHeight,
  resetCaseInsertImageSlotFrame,
  setCaseInsertImageSlotEnabled,
  setCaseInsertImageSlotImage,
  updateCaseInsertImageSlotFit,
  updateCaseInsertImageSlotFrameField,
  updateCaseInsertImageSlotLayout,
  updateCaseInsertImageSlotLayoutField,
  updateCaseInsertImageSlotLayoutPosition,
} from '../caseInsert/imageSlotTransitions.ts'
export {
  addCaseInsertTemplateImageSlot,
  createCaseInsertTemplateImageSlot,
  getCaseInsertImageSlotGroupConfig,
  removeCaseInsertTemplateImageSlot,
  renameCaseInsertTemplateImageSlot,
  setCaseInsertTemplateAdditionalArtworkEnabled,
  updateCaseInsertTemplateImageSlot,
  updateCaseInsertTemplateImageSlotInGroup,
  updateCaseInsertTemplateTextBlock,
  updateCaseInsertTemplateTextList,
  updateProjectCaseInsertTemplate,
} from '../caseInsert/templateSurfaceTransitions.ts'
export {
  addJewelCaseSpineImageSlot,
  removeJewelCaseSpineImageSlot,
  renameJewelCaseSpineImageSlot,
  setJewelCaseSpineAdditionalArtworkEnabled,
  updateJewelCaseSpineImageSlot,
  updateJewelCaseSpineImageSlotInGroup,
  updateJewelCaseSpineTitle,
  updateProjectJewelCaseSpineSide,
} from '../caseInsert/jewelCaseTransitions.ts'
export type {
  JewelCaseSpineImageSlotGroupKey,
  JewelCaseSpineImageSlotKey,
} from '../caseInsert/jewelCaseTransitions.ts'
export {
  normalizeProjectJewelCaseState,
} from '../caseInsert/normalization.ts'
export {
  createDefaultCaseInsertSteamBanner,
  normalizeCaseInsertSteamBanner,
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
  updateJewelCaseSpineSteamBanner,
} from '../caseInsert/steamBanner.ts'
export type {
  CaseInsertSteamBannerColorField,
  CaseInsertSteamBannerLayoutField,
  CaseInsertSteamBannerTargetKind,
} from '../caseInsert/steamBanner.ts'
export {
  addCaseInsertTextListItem,
  removeCaseInsertTextListItem,
  setCaseInsertTextBlockEnabled,
  setCaseInsertTextListEnabled,
  setCaseInsertTextListItems,
  updateCaseInsertTextBlockLayout,
  updateCaseInsertTextBlockLayoutField,
  updateCaseInsertTextBlockValue,
  updateCaseInsertTextListItem,
} from '../caseInsert/textTransitions.ts'
export {
  setProjectJewelCaseExportGuideIds,
  setProjectJewelCaseExportSurfaces,
} from '../caseInsert/exportSettings.ts'
export type {
  CaseInsertImageSlotImageInput,
  CaseInsertLayoutField,
  CaseInsertLayoutPoint,
  CreateCaseInsertProjectSnapshotParams,
  JewelCaseSpineSide,
  ProjectCaseInsertImageSlotInput,
  ProjectCaseInsertLayoutInput,
  ProjectCaseInsertSurfaceStateInput,
  ProjectCaseInsertTextBlockInput,
  ProjectCaseInsertTextListInput,
  ProjectJewelCaseExportSettingsInput,
  ProjectJewelCaseSpineSideStateInput,
  ProjectJewelCaseSpineStateInput,
  ProjectJewelCaseStateInput,
  RestoredCaseInsertProjectState,
  RestoredCaseInsertTemplateState,
} from '../caseInsert/types.ts'
export {
  createBlankJewelCaseSavedProject,
  createCaseInsertProjectSnapshot,
  normalizeSavedCaseInsertProject,
  restoreCaseInsertProjectState,
  restoreCaseInsertProjectStateFromContents,
} from './caseInsertProjectAdapters.ts'
