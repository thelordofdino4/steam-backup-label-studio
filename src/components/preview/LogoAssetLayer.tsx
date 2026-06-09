import { useMemo, type PointerEvent } from 'react'
import { getLogoAssetBoundsPercent } from '../../disc/geometry'
import {
  createLogoAssetRenderItems,
  getLogoAssetRenderDataUrl,
  getLogoAssetRenderSize,
  type LogoAssetKey,
  type LogoAssetRenderItem,
} from '../../project/projectLogoAssets'
import type { BackgroundImageSize, LogoAssetLayout, ProjectLogoAssets } from '../../project/projectTypes'
import { ContentBoundedImage } from './ContentBoundedImage'

export type LogoAssetLayerProps = {
  projectLogoAssets: ProjectLogoAssets
  handleLogoAssetPointerDown: (
    event: PointerEvent<Element>,
    logoKey: LogoAssetKey,
    additionalLogoId?: string,
  ) => void
  handleLogoAssetPointerMove: (event: PointerEvent<Element>) => void
  handleLogoAssetPointerUp: (event: PointerEvent<Element>) => void
}

function LogoAssetPreview({
  imageDataUrl,
  imageSize,
  layout,
  label,
  logoKey,
  additionalLogoId,
  handleLogoAssetPointerDown,
  handleLogoAssetPointerMove,
  handleLogoAssetPointerUp,
}: LogoAssetRenderItem & {
  handleLogoAssetPointerDown: (
    event: PointerEvent<Element>,
    logoKey: LogoAssetKey,
    additionalLogoId?: string,
  ) => void
  handleLogoAssetPointerMove: (event: PointerEvent<Element>) => void
  handleLogoAssetPointerUp: (event: PointerEvent<Element>) => void
  imageDataUrl: string | null
  imageSize: BackgroundImageSize | null
  layout: LogoAssetLayout
}) {
  const renderImageDataUrl = getLogoAssetRenderDataUrl(logoKey, imageDataUrl)
  const renderImageSize = getLogoAssetRenderSize(imageSize)
  const unscaledBounds = getLogoAssetBoundsPercent(renderImageSize, 1)

  return (
    <ContentBoundedImage
      className="disc-logo-asset"
      src={renderImageDataUrl}
      alt={`${label} logo`}
      imageSize={renderImageSize}
      draggable={false}
      onPointerDown={(event) => handleLogoAssetPointerDown(event, logoKey, additionalLogoId)}
      onPointerMove={handleLogoAssetPointerMove}
      onPointerUp={handleLogoAssetPointerUp}
      onPointerCancel={handleLogoAssetPointerUp}
      style={{
        left: `${layout.x}%`,
        top: `${layout.y}%`,
        width: `${unscaledBounds.halfWidth * 2}%`,
        height: `${unscaledBounds.halfHeight * 2}%`,
        maxHeight: 'none',
        transform: `translate(-50%, -50%) scale(${layout.scale})`,
      }}
    />
  )
}

export function LogoAssetLayer({
  projectLogoAssets,
  handleLogoAssetPointerDown,
  handleLogoAssetPointerMove,
  handleLogoAssetPointerUp,
}: LogoAssetLayerProps) {
  const logoAssetRenderItems = useMemo(
    () => createLogoAssetRenderItems(projectLogoAssets),
    [projectLogoAssets],
  )

  return (
    <div className="disc-logo-asset-layer" aria-label="Developer and publisher logo layer">
      {logoAssetRenderItems.map((logoAsset) => (
        <LogoAssetPreview
          key={logoAsset.additionalLogoId ?? logoAsset.logoKey}
          {...logoAsset}
          handleLogoAssetPointerDown={handleLogoAssetPointerDown}
          handleLogoAssetPointerMove={handleLogoAssetPointerMove}
          handleLogoAssetPointerUp={handleLogoAssetPointerUp}
        />
      ))}
    </div>
  )
}
