import type { ProjectJewelCaseState } from '../project/projectTypes.ts'
import {
  createJewelCasePreviewLayout,
} from '../layout/caseInsertPreviewLayout.ts'
import {
  getCaseInsertTemplatePaneConfig,
  type CaseInsertTemplatePaneId,
} from './templateSurfaces.ts'

export function createCaseInsertPngExportLayout(
  caseInsert: ProjectJewelCaseState,
  activeTemplatePane: CaseInsertTemplatePaneId,
  options: {
    dpi?: number
  } = {},
) {
  const paneConfig = getCaseInsertTemplatePaneConfig(activeTemplatePane)

  return createJewelCasePreviewLayout(
    caseInsert.templateType,
    paneConfig.surfaceId,
    { dpi: options.dpi },
  )
}
