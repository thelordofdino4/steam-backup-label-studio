import type {
  JewelCaseSpineImageSlotKey,
} from '../../caseInsert/jewelCaseTransitions'
import type { JewelCaseSpineSide } from '../../caseInsert/types'
import {
  createCaseInsertSpineGuideLayout,
} from '../../layout/caseInsertGuideLayout'
import type {
  CaseInsertLayoutSliderRanges,
} from '../../layout/caseInsertElementSafeZone'
import {
  createJewelCasePreviewLayout,
} from '../../layout/caseInsertPreviewLayout'
import {
  getJewelCaseSpineBackgroundLayoutSliderRanges,
  getJewelCaseSpineImageSlotLayoutSliderRanges,
  type JewelCaseSpineOverlayRole,
} from '../../layout/jewelCaseSpineLayout'
import type {
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertLayout,
  ProjectJewelCaseSpineState,
} from '../../project/projectTypes'
import type {
  CaseInsertImageSlotPlacementField,
} from './CaseInsertImageSlotPlacementControls'
import type {
  CaseInsertTitleArtworkPlacementField,
} from './CaseInsertTitleArtworkControls'

const SPINE_BACKGROUND_PLACEMENT_FIELDS: CaseInsertImageSlotPlacementField[] = [
  { field: 'scale', label: 'Scale', min: 0.01, max: 4, step: 0.01 },
  { field: 'x', label: 'X', min: -100, max: 100, step: 0.1 },
  { field: 'y', label: 'Y', min: -100, max: 100, step: 0.1 },
]

export const SPINE_OVERLAY_PLACEMENT_FIELDS: CaseInsertImageSlotPlacementField[] = [
  { field: 'scale', label: 'Scale', min: 0.35, max: 2, step: 0.01 },
  { field: 'x', label: 'Cross', min: 0, max: 100, step: 0.1 },
  { field: 'y', label: 'Length', min: 0, max: 100, step: 0.1 },
  { field: 'rotation', label: 'Rotation', min: -180, max: 180, step: 1 },
]

const SPINE_TITLE_ARTWORK_PLACEMENT_FIELDS:
CaseInsertTitleArtworkPlacementField[] = [
  { field: 'scale', label: 'Scale', min: 0.35, max: 5, step: 0.01 },
  { field: 'x', label: 'Cross', min: 0, max: 100, step: 0.1 },
  { field: 'y', label: 'Length', min: 0, max: 100, step: 0.1 },
  { field: 'rotation', label: 'Rotation', min: -180, max: 180, step: 1 },
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

function getSpinePreviewLayout(spine?: ProjectJewelCaseSpineState) {
  const layout = createJewelCasePreviewLayout('jewelCase', 'back')

  return spine ? createCaseInsertSpineGuideLayout(layout, spine) : layout
}

export function getSpineImageSlotPlacementFields(
  side: JewelCaseSpineSide,
  slot: ProjectCaseInsertImageSlot,
  role: JewelCaseSpineOverlayRole | 'background',
) {
  const layout = getSpinePreviewLayout()
  const fields = role === 'titleArtwork'
    ? SPINE_TITLE_ARTWORK_PLACEMENT_FIELDS
    : role === 'background'
      ? SPINE_BACKGROUND_PLACEMENT_FIELDS
      : SPINE_OVERLAY_PLACEMENT_FIELDS
  const ranges = role === 'background'
    ? getJewelCaseSpineBackgroundLayoutSliderRanges(side, slot, layout)
    : getJewelCaseSpineImageSlotLayoutSliderRanges(side, slot, layout, role)

  return applyLayoutSliderRanges(fields, ranges)
}

export function getSpinePrimaryImageSlotRole(
  slotKey: JewelCaseSpineImageSlotKey,
): JewelCaseSpineOverlayRole | 'background' {
  switch (slotKey) {
    case 'background':
      return 'background'
    case 'titleArtwork':
      return 'titleArtwork'
  }
}
