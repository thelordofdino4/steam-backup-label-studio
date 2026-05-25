import type { PointerEvent } from 'react'
import type { LogoAssetLayout } from '../../project/projectTypes'

export type LogoAssetLayerProps = {
  developerLogoDataUrl: string | null
  developerLogoLayout: LogoAssetLayout
  publisherLogoDataUrl: string | null
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
  layout,
  label,
  logoKey,
  handleLogoAssetPointerDown,
  handleLogoAssetPointerMove,
  handleLogoAssetPointerUp,
}: {
  imageDataUrl: string | null
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
  if (!imageDataUrl || !layout.enabled) {
    return null
  }

  return (
    <img
      className="disc-logo-asset"
      src={imageDataUrl}
      alt={`${label} logo`}
      draggable={false}
      onPointerDown={(event) => handleLogoAssetPointerDown(event, logoKey)}
      onPointerMove={handleLogoAssetPointerMove}
      onPointerUp={handleLogoAssetPointerUp}
      onPointerCancel={handleLogoAssetPointerUp}
      style={{
        left: `${layout.x}%`,
        top: `${layout.y}%`,
        transform: `translate(-50%, -50%) scale(${layout.scale})`,
      }}
    />
  )
}

export function LogoAssetLayer({
  developerLogoDataUrl,
  developerLogoLayout,
  publisherLogoDataUrl,
  publisherLogoLayout,
  handleLogoAssetPointerDown,
  handleLogoAssetPointerMove,
  handleLogoAssetPointerUp,
}: LogoAssetLayerProps) {
  return (
    <div className="disc-logo-asset-layer" aria-label="Developer and publisher logo layer">
      <LogoAssetPreview
        imageDataUrl={developerLogoDataUrl}
        layout={developerLogoLayout}
        label="Developer"
        logoKey="developer"
        handleLogoAssetPointerDown={handleLogoAssetPointerDown}
        handleLogoAssetPointerMove={handleLogoAssetPointerMove}
        handleLogoAssetPointerUp={handleLogoAssetPointerUp}
      />
      <LogoAssetPreview
        imageDataUrl={publisherLogoDataUrl}
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
