import type { LogoAssetLayout } from '../../project/projectTypes'

export type LogoAssetLayerProps = {
  developerLogoDataUrl: string | null
  developerLogoLayout: LogoAssetLayout
  publisherLogoDataUrl: string | null
  publisherLogoLayout: LogoAssetLayout
}

function LogoAssetPreview({
  imageDataUrl,
  layout,
  label,
}: {
  imageDataUrl: string | null
  layout: LogoAssetLayout
  label: string
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
}: LogoAssetLayerProps) {
  return (
    <div className="disc-logo-asset-layer" aria-label="Developer and publisher logo layer">
      <LogoAssetPreview
        imageDataUrl={developerLogoDataUrl}
        layout={developerLogoLayout}
        label="Developer"
      />
      <LogoAssetPreview
        imageDataUrl={publisherLogoDataUrl}
        layout={publisherLogoLayout}
        label="Publisher"
      />
    </div>
  )
}
