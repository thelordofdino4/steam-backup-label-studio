import {
  createDefaultProjectLogoAssets,
} from '../project/projectLogoAssets.ts'
import {
  createDefaultProjectMediaMark,
} from '../project/projectMediaMark.ts'
import {
  createDefaultProjectMetadata,
} from '../project/projectMetadata.ts'
import {
  createDefaultProjectPlatformMarks,
} from '../project/projectPlatformMarks.ts'
import {
  createDefaultProjectRatingBadge,
} from '../project/projectRatingBadge.ts'
import {
  createDefaultProjectTechnicalMarks,
  getProjectTechnicalMarkAsset,
} from '../project/projectTechnicalMarks.ts'
import { createProjectImageAssetProvenance } from '../project/projectAssetStatus.ts'
import type {
  ProjectCaseInsertImageSlot,
  ProjectTechnicalMarkAsset,
  TechnicalMarkValue,
} from '../project/projectTypes.ts'
import { discTemplates } from '../templates/discTemplates.ts'
import type {
  CaseInsertBrandingSourceCatalog,
} from './brandingSlotSources.ts'
import {
  createDefaultCaseInsertImageSlot,
} from './defaults.ts'

export const selectedDiscTemplate = discTemplates.standardPrintableDisc

export function createBrandingSources(
  overrides: Partial<CaseInsertBrandingSourceCatalog> = {},
): CaseInsertBrandingSourceCatalog {
  return {
    projectMetadata: createDefaultProjectMetadata(),
    projectLogoAssets: createDefaultProjectLogoAssets(),
    projectRatingBadge: createDefaultProjectRatingBadge(selectedDiscTemplate),
    projectMediaMark: createDefaultProjectMediaMark(selectedDiscTemplate),
    projectPlatformMarks: createDefaultProjectPlatformMarks(),
    projectTechnicalMarks: createDefaultProjectTechnicalMarks(),
    ...overrides,
  }
}

export function createMarkSlot(
  sourceId: string,
  enabled = true,
): ProjectCaseInsertImageSlot {
  return {
    ...createDefaultCaseInsertImageSlot(sourceId, sourceId, { enabled }),
    imageDataUrl: 'data:image/png;base64,test-mark',
    imageSize: { width: 64, height: 64 },
    imageSource: createProjectImageAssetProvenance({
      source: 'placeholder',
      sourceId,
      sourceLabel: sourceId,
    }),
  }
}

export function createAdditionalTechnicalAsset(
  value: TechnicalMarkValue,
  id: string,
): ProjectTechnicalMarkAsset {
  const asset = getProjectTechnicalMarkAsset(
    createDefaultProjectTechnicalMarks(),
    value,
    selectedDiscTemplate,
  )

  return {
    ...asset,
    id,
    label: id,
    layout: {
      ...asset.layout,
      enabled: false,
    },
  }
}
