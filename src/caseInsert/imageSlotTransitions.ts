import {
  createEmbeddedProjectImageAssetProvenance,
  normalizeProjectImageAssetProvenance,
} from '../project/projectAssetStatus.ts'
import { getJewelCaseImageRegionHeightFitScale } from '../layout/jewelCaseLayout.ts'
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
  return {
    ...slot,
    enabled,
  }
}

export function setCaseInsertImageSlotImage(
  slot: ProjectCaseInsertImageSlot,
  image: CaseInsertImageSlotImageInput,
): ProjectCaseInsertImageSlot {
  return {
    ...slot,
    enabled: true,
    imageDataUrl: image.imageDataUrl,
    imageSize: image.imageSize,
    imageSource: normalizeProjectImageAssetProvenance(
      image.imageSource,
      createEmbeddedProjectImageAssetProvenance(slot.label),
    ),
  }
}

export function clearCaseInsertImageSlotImage(
  slot: ProjectCaseInsertImageSlot,
): ProjectCaseInsertImageSlot {
  return {
    ...slot,
    enabled: false,
    imageDataUrl: null,
    imageSource: null,
    imageSize: null,
  }
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
  return updateCaseInsertImageSlotLayout(slot, {
    ...slot.layout,
    [field]: value,
  })
}

export function updateCaseInsertImageSlotLayoutPosition(
  slot: ProjectCaseInsertImageSlot,
  point: CaseInsertLayoutPoint,
): ProjectCaseInsertImageSlot {
  return updateCaseInsertImageSlotLayout(slot, {
    ...slot.layout,
    x: point.x,
    y: point.y,
  })
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
