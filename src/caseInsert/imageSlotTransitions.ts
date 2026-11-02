import {
  createEmbeddedProjectImageAssetProvenance,
  normalizeProjectImageAssetProvenance,
} from '../project/projectAssetStatus.ts'
import {
  clearEditorImageAssetSourceContent,
  setEditorImageAssetSourceContent,
} from '../editor/imageAssetTransitions.ts'
import { setOptionalVisualFeatureEnabled } from '../editor/optionalVisualFeature.ts'
import { getJewelCaseImageRegionHeightFitScale } from '../layout/jewelCaseLayout.ts'
import {
  DEFAULT_ADDITIONAL_ARTWORK_FRAME,
  type AdditionalArtworkFrameField,
} from '../project/additionalArtworkFrame.ts'
import type {
  ProjectCaseInsertImageFit,
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertLayout,
} from '../project/projectTypes.ts'
import type {
  CaseInsertImageSlotImageInput,
  CaseInsertLayoutField,
  CaseInsertLayoutPoint,
} from './types.ts'

export function setCaseInsertImageSlotEnabled(
  slot: ProjectCaseInsertImageSlot,
  enabled: boolean,
): ProjectCaseInsertImageSlot {
  return setOptionalVisualFeatureEnabled(slot, enabled)
}

export function setCaseInsertImageSlotImage(
  slot: ProjectCaseInsertImageSlot,
  image: CaseInsertImageSlotImageInput,
): ProjectCaseInsertImageSlot {
  return {
    ...setCaseInsertImageSlotSource(slot, image),
    enabled: true,
  }
}

/** Replaces only source-owned image content on an existing stable slot. */
export function setCaseInsertImageSlotSource(
  slot: ProjectCaseInsertImageSlot,
  image: CaseInsertImageSlotImageInput,
): ProjectCaseInsertImageSlot {
  return setEditorImageAssetSourceContent(slot, {
    imageDataUrl: image.imageDataUrl,
    imageSize: image.imageSize,
    imageSource: normalizeProjectImageAssetProvenance(
      image.imageSource,
      createEmbeddedProjectImageAssetProvenance(slot.label),
    ),
  })
}

export function clearCaseInsertImageSlotImage(
  slot: ProjectCaseInsertImageSlot,
): ProjectCaseInsertImageSlot {
  return {
    ...clearCaseInsertImageSlotSource(slot),
    enabled: false,
  }
}

/** Clears only source-owned image content from an existing stable slot. */
export function clearCaseInsertImageSlotSource(
  slot: ProjectCaseInsertImageSlot,
): ProjectCaseInsertImageSlot {
  return clearEditorImageAssetSourceContent(slot)
}

export function updateCaseInsertImageSlotFit(
  slot: ProjectCaseInsertImageSlot,
  fit: ProjectCaseInsertImageFit,
): ProjectCaseInsertImageSlot {
  return {
    ...slot,
    fit,
  }
}

export function updateCaseInsertImageSlotLayout(
  slot: ProjectCaseInsertImageSlot,
  layout: ProjectCaseInsertLayout,
): ProjectCaseInsertImageSlot {
  if (
    slot.layout.x === layout.x &&
    slot.layout.y === layout.y &&
    slot.layout.scale === layout.scale &&
    slot.layout.rotation === layout.rotation &&
    slot.layout.fontSizePt === layout.fontSizePt &&
    slot.layout.width === layout.width
  ) {
    return slot
  }

  return {
    ...slot,
    layout,
  }
}

export function updateCaseInsertImageSlotLayoutField(
  slot: ProjectCaseInsertImageSlot,
  field: CaseInsertLayoutField,
  value: number,
): ProjectCaseInsertImageSlot {
  if (slot.layout[field] === value) return slot

  return updateCaseInsertImageSlotLayout(slot, {
    ...slot.layout,
    [field]: value,
  })
}

export function updateCaseInsertImageSlotLayoutPosition(
  slot: ProjectCaseInsertImageSlot,
  point: CaseInsertLayoutPoint,
): ProjectCaseInsertImageSlot {
  if (slot.layout.x === point.x && slot.layout.y === point.y) return slot

  return updateCaseInsertImageSlotLayout(slot, {
    ...slot.layout,
    x: point.x,
    y: point.y,
  })
}

export function updateCaseInsertImageSlotFrameField(
  slot: ProjectCaseInsertImageSlot,
  field: AdditionalArtworkFrameField,
  value: boolean | number | string,
): ProjectCaseInsertImageSlot {
  return {
    ...slot,
    frame: {
      ...slot.frame,
      [field]: value,
    },
  }
}

export function resetCaseInsertImageSlotFrame(
  slot: ProjectCaseInsertImageSlot,
): ProjectCaseInsertImageSlot {
  return {
    ...slot,
    frame: DEFAULT_ADDITIONAL_ARTWORK_FRAME,
  }
}

export function fitCaseInsertImageSlotToRegionHeight(
  slot: ProjectCaseInsertImageSlot,
  region: { width: number; height: number },
): ProjectCaseInsertImageSlot {
  const scale = getJewelCaseImageRegionHeightFitScale({
    imageSize: slot.imageSize,
    region,
    fit: 'cover',
  })

  if (scale === null) {
    return slot
  }

  return {
    ...slot,
    fit: 'cover',
    layout: {
      ...slot.layout,
      scale,
      x: 0,
      y: 0,
    },
  }
}
