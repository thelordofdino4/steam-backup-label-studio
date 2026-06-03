import type { ProjectJewelCaseState } from '../project/projectTypes.ts'
import type {
  JewelCaseGuideId,
  JewelCaseSurfaceId,
} from '../templates/caseInsertTemplates.ts'
import {
  normalizeCaseInsertSurfaceIds,
  normalizeJewelCaseGuideIds,
} from './normalization.ts'

export function setProjectJewelCaseExportSurfaces(
  state: ProjectJewelCaseState,
  surfaces: JewelCaseSurfaceId[],
): ProjectJewelCaseState {
  return {
    ...state,
    export: {
      ...state.export,
      surfaces: normalizeCaseInsertSurfaceIds(surfaces),
    },
  }
}

export function setProjectJewelCaseExportGuideIds(
  state: ProjectJewelCaseState,
  guideIds: JewelCaseGuideId[],
): ProjectJewelCaseState {
  return {
    ...state,
    export: {
      ...state.export,
      guideIds: normalizeJewelCaseGuideIds(guideIds),
    },
  }
}
