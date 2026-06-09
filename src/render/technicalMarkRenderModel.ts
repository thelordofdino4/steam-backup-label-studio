import {
  getTechnicalMarkBoundsPercent,
  getTechnicalMarkPlaceholderBoundsPercent,
} from '../disc/geometry.ts'
import {
  getTechnicalMarkPlaceholderImageSize,
  getTechnicalMarkPlaceholderImageUrl,
} from '../assets/assetManifest.ts'
import {
  isOptionalVisualFeatureEnabled,
} from '../editor/optionalVisualFeature.ts'
import {
  resolveMarkImageSource,
} from '../editor/markImageSource.ts'
import {
  getAllProjectTechnicalMarkAssetEntries,
  getTechnicalMarkLabel,
} from '../project/projectTechnicalMarks.ts'
import type {
  ProjectTechnicalMarkAsset,
  ProjectTechnicalMarks,
  TechnicalMarkLayout,
  TechnicalMarkValue,
} from '../project/projectTypes.ts'
import {
  createPercentPositionedImageRenderArtifact,
  type PercentPositionedImageRenderArtifact,
} from './imageRenderArtifact.ts'

export type TechnicalMarkRenderModel = PercentPositionedImageRenderArtifact<
  TechnicalMarkLayout,
  {
  key: string
  value: TechnicalMarkValue
  assetId: string | null
  asset: ProjectTechnicalMarkAsset
  }
>

export function createTechnicalMarkRenderModels(
  technicalMarks: ProjectTechnicalMarks,
): TechnicalMarkRenderModel[] {
  return getAllProjectTechnicalMarkAssetEntries(technicalMarks).flatMap((entry) => {
    const { value, asset, assetId } = entry

    if (!isOptionalVisualFeatureEnabled(asset.layout)) {
      return []
    }

    const defaultLabel = getTechnicalMarkLabel(value)
    const label = asset.label.trim() ? asset.label : defaultLabel
    const resolvedImage = resolveMarkImageSource({
      source: asset.source,
      customImageDataUrl: asset.customImageDataUrl,
      customImageSize: asset.customImageSize,
      builtInImageDataUrl: getTechnicalMarkPlaceholderImageUrl(value),
      builtInImageSize: getTechnicalMarkPlaceholderImageSize(value),
    })
    const getBounds = (scale: number) =>
      resolvedImage.imageSize
        ? getTechnicalMarkBoundsPercent(resolvedImage.imageSize, scale)
        : getTechnicalMarkPlaceholderBoundsPercent(scale)

    const model = createPercentPositionedImageRenderArtifact({
      key: assetId ?? value,
      value,
      assetId,
      asset,
      imageDataUrl: resolvedImage.imageDataUrl,
      imageSize: resolvedImage.imageSize,
      isPlaceholderImage: resolvedImage.isBuiltInFallback,
      label,
      alt: resolvedImage.isCustomImage ? label : `${label} generic technical mark`,
      layout: asset.layout,
      unscaledBounds: getBounds(1),
      scaledBounds: getBounds(asset.layout.scale),
    })

    return model ? [model] : []
  })
}
