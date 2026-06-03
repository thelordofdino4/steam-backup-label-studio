export {
  DEFAULT_CASE_INSERT_PROJECT_TITLE,
  createDefaultCaseInsertImageSlot,
  createDefaultCaseInsertTextBlock,
  createDefaultCaseInsertTextList,
  createDefaultProjectJewelCaseState,
} from '../caseInsert/defaults.ts'
export {
  clearCaseInsertImageSlotImage,
  setCaseInsertImageSlotEnabled,
  setCaseInsertImageSlotImage,
  updateCaseInsertImageSlotFit,
  updateCaseInsertImageSlotLayout,
  updateCaseInsertImageSlotLayoutField,
  updateCaseInsertImageSlotLayoutPosition,
} from '../caseInsert/imageSlotTransitions.ts'
export {
  addJewelCaseBackScreenshotSlot,
  removeJewelCaseBackScreenshotSlot,
  updateJewelCaseBackScreenshotSlot,
  updateProjectJewelCaseBack,
  updateProjectJewelCaseFront,
  updateProjectJewelCaseSpineSide,
} from '../caseInsert/jewelCaseTransitions.ts'
export {
  normalizeProjectJewelCaseState,
} from '../caseInsert/normalization.ts'
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
  ProjectJewelCaseBackStateInput,
  ProjectJewelCaseExportSettingsInput,
  ProjectJewelCaseFrontStateInput,
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
