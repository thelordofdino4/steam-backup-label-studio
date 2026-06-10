import type { SupportedCaseInsertTemplateType } from '../editor/editorTypes.ts'
import {
  getCaseInsertTemplate,
  type JewelCaseGuideId,
} from '../templates/caseInsertTemplates.ts'
import {
  caseInsertTemplatePaneHasSpine,
  type CaseInsertTemplatePaneId,
} from './templateSurfaces.ts'

export type CaseInsertExportGuideOption = {
  id: string
  label: string
  guideIds: readonly JewelCaseGuideId[]
}

type CaseInsertExportGuideOptionDefinition = CaseInsertExportGuideOption & {
  requiresSpine?: boolean
}

const CASE_INSERT_EXPORT_GUIDE_OPTION_DEFINITIONS: Record<
  CaseInsertTemplatePaneId,
  CaseInsertExportGuideOptionDefinition[]
> = {
  cover: [
    {
      id: 'cover-trim',
      label: 'Show trim bounds',
      guideIds: ['frontTrimBounds'],
    },
    {
      id: 'cover-safe',
      label: 'Show safe zone',
      guideIds: ['frontSafeBounds'],
    },
  ],
  tray: [
    {
      id: 'tray-trim',
      label: 'Show trim bounds',
      guideIds: ['backTrimBounds', 'backPanelBounds'],
    },
    {
      id: 'tray-safe',
      label: 'Show tray safe zone',
      guideIds: ['backPanelSafeBounds'],
    },
    {
      id: 'tray-spine-bounds',
      label: 'Show spine bounds',
      guideIds: ['leftSpineBounds', 'rightSpineBounds'],
      requiresSpine: true,
    },
    {
      id: 'tray-spine-safe',
      label: 'Show spine safe zones',
      guideIds: ['leftSpineSafeBounds', 'rightSpineSafeBounds'],
      requiresSpine: true,
    },
  ],
}

export function getCaseInsertExportGuideOptions(
  templateType: SupportedCaseInsertTemplateType,
  paneId: CaseInsertTemplatePaneId,
): CaseInsertExportGuideOption[] {
  const template = getCaseInsertTemplate(templateType)
  const templateGuideIds = new Set(
    template.guides.map(({ id }) => id as JewelCaseGuideId),
  )
  const paneHasSpine = caseInsertTemplatePaneHasSpine(paneId)

  return CASE_INSERT_EXPORT_GUIDE_OPTION_DEFINITIONS[paneId]
    .filter((option) => !option.requiresSpine || paneHasSpine)
    .map((option) => ({
      id: option.id,
      label: option.label,
      guideIds: option.guideIds.filter((guideId) =>
        templateGuideIds.has(guideId)),
    }))
    .filter((option) => option.guideIds.length > 0)
}

export function isCaseInsertExportGuideOptionSelected(
  option: CaseInsertExportGuideOption,
  selectedGuideIds: ReadonlySet<JewelCaseGuideId>,
) {
  return option.guideIds.every((guideId) => selectedGuideIds.has(guideId))
}

export function countSelectedCaseInsertExportGuideOptions(
  options: readonly CaseInsertExportGuideOption[],
  selectedGuideIds: readonly JewelCaseGuideId[],
) {
  const selectedGuideIdSet = new Set(selectedGuideIds)

  return options.filter((option) =>
    isCaseInsertExportGuideOptionSelected(option, selectedGuideIdSet)).length
}
