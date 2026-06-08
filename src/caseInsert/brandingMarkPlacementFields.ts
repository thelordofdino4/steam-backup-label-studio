import type { CaseInsertTemplatePaneId } from './templateSurfaces.ts'
import type { JewelCaseSpineSide } from './types.ts'
import {
  createJewelCasePreviewLayout,
} from '../layout/caseInsertPreviewLayout.ts'
import type {
  CaseInsertLayoutSliderRanges,
} from '../layout/caseInsertElementSafeZone.ts'
import {
  getJewelCaseBackImageSlotLayoutSliderRanges,
} from '../layout/jewelCaseBackLayout.ts'
import {
  getJewelCaseFrontImageSlotLayoutSliderRanges,
} from '../layout/jewelCaseFrontLayout.ts'
import {
  getJewelCaseSpineImageSlotLayoutSliderRanges,
} from '../layout/jewelCaseSpineLayout.ts'
import type {
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertLayout,
} from '../project/projectTypes.ts'

export type CaseInsertMarkPlacementField = {
  field: keyof ProjectCaseInsertLayout
  label: string
  min: number
  max: number
  step: number
}

const TEMPLATE_MARK_PLACEMENT_FIELDS: CaseInsertMarkPlacementField[] = [
  { field: 'scale', label: 'Scale', min: 0.25, max: 2.5, step: 0.01 },
  { field: 'x', label: 'X position', min: 0, max: 100, step: 0.1 },
  { field: 'y', label: 'Y position', min: 0, max: 100, step: 0.1 },
]

const SPINE_MARK_PLACEMENT_FIELDS: CaseInsertMarkPlacementField[] = [
  { field: 'scale', label: 'Scale', min: 0.35, max: 2, step: 0.01 },
  { field: 'x', label: 'Cross position', min: 0, max: 100, step: 0.1 },
  { field: 'y', label: 'Length position', min: 0, max: 100, step: 0.1 },
  { field: 'rotation', label: 'Rotation', min: -180, max: 180, step: 1 },
]

function applyLayoutSliderRanges(
  fields: CaseInsertMarkPlacementField[],
  ranges: CaseInsertLayoutSliderRanges,
) {
  return fields.map((field) => {
    if (field.field !== 'x' && field.field !== 'y') {
      return field
    }

    return {
      ...field,
      min: ranges[field.field].min,
      max: ranges[field.field].max,
    }
  })
}

function getTemplatePreviewLayout(paneId: CaseInsertTemplatePaneId) {
  return createJewelCasePreviewLayout(
    'jewelCase',
    paneId === 'cover' ? 'front' : 'back',
  )
}

export function getCaseInsertTemplateMarkPlacementFields(
  paneId: CaseInsertTemplatePaneId,
  slot: ProjectCaseInsertImageSlot,
) {
  const layout = getTemplatePreviewLayout(paneId)
  const ranges = paneId === 'cover'
    ? getJewelCaseFrontImageSlotLayoutSliderRanges(slot, layout, 'mark')
    : getJewelCaseBackImageSlotLayoutSliderRanges(slot, layout, 'mark')

  return applyLayoutSliderRanges(TEMPLATE_MARK_PLACEMENT_FIELDS, ranges)
}

export function getCaseInsertSpineMarkPlacementFields(
  side: JewelCaseSpineSide,
  slot: ProjectCaseInsertImageSlot,
) {
  const layout = createJewelCasePreviewLayout('jewelCase', 'back')
  const ranges = getJewelCaseSpineImageSlotLayoutSliderRanges(
    side,
    slot,
    layout,
    'mark',
  )

  return applyLayoutSliderRanges(SPINE_MARK_PLACEMENT_FIELDS, ranges)
}
