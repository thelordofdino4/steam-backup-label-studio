import type { PointerEvent } from 'react'
import { getLogoAssetBoundsPercent } from '../../discGeometry'
import { getLogoAssetRenderDataUrl, getLogoAssetRenderSize } from '../../project/projectLogoAssets'
import type { BackgroundImageSize, LogoAssetLayout } from '../../project/projectTypes'

export type LogoAssetLayerProps = {
  developerLogoDataUrl: string | null
  developerLogoSize: BackgroundImageSize | null
  developerLogoLayout: LogoAssetLayout
  publisherLogoDataUrl: string | null
  publisherLogoSize: BackgroundImageSize | null
  publisherLogoLayout: LogoAssetLayout
  handleLogoAssetPointerDown: (
    event: PointerEvent<Element>,
    logoKey: 'developer' | 'publisher',
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
  handleLogoAssetPointerDown,
  handleLogoAssetPointerMove,
  handleLogoAssetPointerUp,
}: {
  imageDataUrl: string | null
  imageSize: BackgroundImageSize | null
  layout: LogoAssetLayout
  label: string
  logoKey: 'developer' | 'publisher'
  handleLogoAssetPointerDown: (
    event: PointerEvent<Element>,
    logoKey: 'developer' | 'publisher',
  ) => void
  handleLogoAssetPointerMove: (event: PointerEvent<Element>) => void
  handleLogoAssetPointerUp: (event: PointerEvent<Element>) => void
}) {
  if (!layout.enabled) {
    return null
  }

  const renderImageDataUrl = getLogoAssetRenderDataUrl(logoKey, imageDataUrl)
  const renderImageSize = getLogoAssetRenderSize(imageSize)
  const unscaledBounds = getLogoAssetBoundsPercent(renderImageSize, 1)

  return (
    <img
      className="disc-logo-asset"
      src={renderImageDataUrl}
      alt={`${label} logo`}
      draggable={false}
      onPointerDown={(event) => handleLogoAssetPointerDown(event, logoKey)}
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
  developerLogoDataUrl,
  developerLogoSize,
  developerLogoLayout,
  publisherLogoDataUrl,
  publisherLogoSize,
  publisherLogoLayout,
  handleLogoAssetPointerDown,
  handleLogoAssetPointerMove,
  handleLogoAssetPointerUp,
}: LogoAssetLayerProps) {
  return (
    <div className="disc-logo-asset-layer" aria-label="Developer and publisher logo layer">
      <LogoAssetPreview
        imageDataUrl={developerLogoDataUrl}
        imageSize={developerLogoSize}
        layout={developerLogoLayout}
        label="Developer"
        logoKey="developer"
        handleLogoAssetPointerDown={handleLogoAssetPointerDown}
        handleLogoAssetPointerMove={handleLogoAssetPointerMove}
        handleLogoAssetPointerUp={handleLogoAssetPointerUp}
      />
      <LogoAssetPreview
        imageDataUrl={publisherLogoDataUrl}
        imageSize={publisherLogoSize}
        layout={publisherLogoLayout}
        label="Publisher"
        logoKey="publisher"
        handleLogoAssetPointerDown={handleLogoAssetPointerDown}
        handleLogoAssetPointerMove={handleLogoAssetPointerMove}
        handleLogoAssetPointerUp={handleLogoAssetPointerUp}
      />
    </div>
  )
}
