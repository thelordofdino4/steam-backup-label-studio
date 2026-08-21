import type {
  CaseInsertImageSlotGroupKey,
  CaseInsertTemplatePaneId,
} from '../../caseInsert/templateSurfaces'
import {
  CASE_INSERT_PERCENT_LAYOUT_RANGES,
  type CaseInsertLayoutSliderRanges,
} from '../../layout/caseInsertElementSafeZone'
import {
  getCaseInsertArtworkViewportLayoutSliderRanges,
} from '../../caseInsert/artworkViewportPlacement'
import {
  createJewelCasePreviewLayout,
} from '../../layout/caseInsertPreviewLayout'
import {
  getJewelCaseBackBackgroundLayoutSliderRanges,
  getJewelCaseBackImageSlotLayoutSliderRanges,
} from '../../layout/jewelCaseBackLayout'
import {
  getJewelCaseFrontBackgroundLayoutSliderRanges,
  getJewelCaseFrontImageSlotLayoutSliderRanges,
} from '../../layout/jewelCaseFrontLayout'
import type {
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertLayout,
} from '../../project/projectTypes'
import type {
  CaseInsertImageSlotPlacementField,
} from './CaseInsertImageSlotPlacementControls'
import type {
  CaseInsertTitleArtworkPlacementField,
} from './CaseInsertTitleArtworkControls'

const BACKGROUND_PLACEMENT_FIELDS: CaseInsertImageSlotPlacementField[] = [
  { field: 'scale', label: 'Scale', min: 0.01, max: 4, step: 0.01 },
  { field: 'x', label: 'X', min: -100, max: 100, step: 0.1 },
  { field: 'y', label: 'Y', min: -100, max: 100, step: 0.1 },
]

export const TEMPLATE_OVERLAY_PLACEMENT_FIELDS: CaseInsertImageSlotPlacementField[] = [
  { field: 'scale', label: 'Scale', min: 0.25, max: 2.5, step: 0.01 },
  { field: 'x', label: 'X', min: 0, max: 100, step: 0.1 },
  { field: 'y', label: 'Y', min: 0, max: 100, step: 0.1 },
]

const TEMPLATE_TITLE_ARTWORK_PLACEMENT_FIELDS:
CaseInsertTitleArtworkPlacementField[] = [
  { field: 'scale', label: 'Scale', min: 0.35, max: 5, step: 0.01 },
  { field: 'x', label: 'X', min: 0, max: 100, step: 0.1 },
  { field: 'y', label: 'Y', min: 0, max: 100, step: 0.1 },
]

function applyLayoutSliderRanges<
  T extends {
    field: keyof ProjectCaseInsertLayout
    max: number
    min: number
  },
>(fields: T[], ranges: CaseInsertLayoutSliderRanges): T[] {
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

export function getTemplatePrimaryImagePlacementFields(
  paneId: CaseInsertTemplatePaneId,
  slotKey: 'background' | 'titleArtwork',
  slot: ProjectCaseInsertImageSlot,
) {
  const layout = getTemplatePreviewLayout(paneId)
  const fields = slotKey === 'background'
    ? BACKGROUND_PLACEMENT_FIELDS
    : TEMPLATE_TITLE_ARTWORK_PLACEMENT_FIELDS
  const ranges = paneId === 'cover'
    ? slotKey === 'background'
      ? getJewelCaseFrontBackgroundLayoutSliderRanges(slot, layout)
      : getJewelCaseFrontImageSlotLayoutSliderRanges(
          slot,
          layout,
          'titleArtwork',
        )
    : slotKey === 'background'
      ? getJewelCaseBackBackgroundLayoutSliderRanges(slot, layout)
      : getJewelCaseBackImageSlotLayoutSliderRanges(slot, layout, 'logo')

  return applyLayoutSliderRanges(fields, ranges)
}

export function getTemplateGroupedImagePlacementFields(
  paneId: CaseInsertTemplatePaneId,
  slotKey: CaseInsertImageSlotGroupKey,
  slot: ProjectCaseInsertImageSlot,
) {
  const layout = getTemplatePreviewLayout(paneId)
  const viewportRanges = slotKey === 'artworkSlots' &&
      slot.reservedArtworkViewport != null
    ? getCaseInsertArtworkViewportLayoutSliderRanges({
        owner: paneId === 'cover' ? 'cover' : 'tray',
        slot,
        layout,
      }) ?? CASE_INSERT_PERCENT_LAYOUT_RANGES
    : null

  const ranges = viewportRanges ?? (paneId === 'cover'
    ? getJewelCaseFrontImageSlotLayoutSliderRanges(
        slot,
        layout,
        slotKey === 'artworkSlots'
          ? 'calloutArtwork'
          : slotKey === 'logoSlots' ? 'logo' : 'mark',
      )
    : getJewelCaseBackImageSlotLayoutSliderRanges(
        slot,
        layout,
        slotKey === 'artworkSlots'
          ? 'artwork'
          : slotKey === 'markSlots' ? 'mark' : 'logo',
      ))

  return applyLayoutSliderRanges(TEMPLATE_OVERLAY_PLACEMENT_FIELDS, ranges)
}
