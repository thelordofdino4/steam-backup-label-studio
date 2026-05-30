import {
  getTechnicalMarkBoundsPercent,
  getTechnicalMarkPlaceholderBoundsPercent,
  type RenderBoundsPercent,
} from './discGeometry.ts'
import { getTechnicalMarkPlaceholderImageUrl } from './discPlaceholderAssets.ts'
import {
  getProjectTechnicalMarkAsset,
  getTechnicalMarkLabel,
} from './project/projectTechnicalMarks.ts'
import type {
  ProjectTechnicalMarkAsset,
  ProjectTechnicalMarks,
  TechnicalMarkLayout,
  TechnicalMarkValue,
} from './project/projectTypes.ts'

export type TechnicalMarkRenderModel = {
  value: TechnicalMarkValue
  asset: ProjectTechnicalMarkAsset
  imageDataUrl: string
  isPlaceholderImage: boolean
  label: string
  alt: string
  layout: TechnicalMarkLayout
  unscaledBounds: RenderBoundsPercent
  scaledBounds: RenderBoundsPercent
}

function hasCustomImage(
  source: 'placeholder' | 'custom',
  imageDataUrl: string | null,
): imageDataUrl is string {
  return source === 'custom' && Boolean(imageDataUrl)
}

export function createTechnicalMarkRenderModels(
  technicalMarks: ProjectTechnicalMarks,
): TechnicalMarkRenderModel[] {
  return technicalMarks.values.flatMap((value) => {
    const asset = getProjectTechnicalMarkAsset(technicalMarks, value)

    if (!asset.layout.enabled) {
      return []
    }

    const defaultLabel = getTechnicalMarkLabel(value)
    const label = asset.label.trim() ? asset.label : defaultLabel
    const customImageDataUrl = asset.customImageDataUrl
    const isCustomImage = hasCustomImage(asset.source, customImageDataUrl)
    const getBounds = (scale: number) =>
      isCustomImage && asset.customImageSize
        ? getTechnicalMarkBoundsPercent(asset.customImageSize, scale)
        : getTechnicalMarkPlaceholderBoundsPercent(scale)

    return [{
      value,
      asset,
      imageDataUrl: isCustomImage
        ? customImageDataUrl
        : getTechnicalMarkPlaceholderImageUrl(value),
      isPlaceholderImage: !isCustomImage,
      label,
      alt: isCustomImage ? label : `${label} generic technical mark`,
      layout: asset.layout,
      unscaledBounds: getBounds(1),
      scaledBounds: getBounds(asset.layout.scale),
    }]
  })
}
