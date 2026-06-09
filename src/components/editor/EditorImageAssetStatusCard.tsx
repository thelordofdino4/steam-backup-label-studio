import { getProjectImageAssetStatus } from '../../project/projectAssetStatus'
import type {
  BackgroundImageSize,
  ProjectImageAssetProvenance,
} from '../../project/projectTypes'

export type EditorImageAssetStatusCardProps = {
  cardClassName?: string
  emptyHint: string
  fallbackImageDataUrl?: string | null
  fallbackImageSize?: BackgroundImageSize | null
  fallbackImageSource?: ProjectImageAssetProvenance | null
  fallbackLabel: string
  formatSize?: (size: BackgroundImageSize | null) => string
  imageDataUrl: string | null
  imageSize: BackgroundImageSize | null
  imageSource?: ProjectImageAssetProvenance | null
  previewClassName?: string
  statusText?: 'source-label' | 'summary'
}

export function EditorImageAssetStatusCard({
  cardClassName = '',
  emptyHint,
  fallbackImageDataUrl = null,
  fallbackImageSize = null,
  fallbackImageSource = null,
  fallbackLabel,
  formatSize = () => '',
  imageDataUrl,
  imageSize,
  imageSource = null,
  previewClassName = '',
  statusText = 'summary',
}: EditorImageAssetStatusCardProps) {
  const effectiveImageDataUrl = imageDataUrl ?? fallbackImageDataUrl
  const effectiveImageSize = imageDataUrl ? imageSize : fallbackImageSize
  const effectiveImageSource = imageDataUrl ? imageSource : fallbackImageSource

  if (!effectiveImageDataUrl) {
    return <p className="hint">{emptyHint}</p>
  }

  const status = getProjectImageAssetStatus({
    imageDataUrl: effectiveImageDataUrl,
    provenance: effectiveImageSource,
    fallbackLabel,
  })
  const label = statusText === 'source-label'
    ? status.sourceLabel
    : status.summary

  return (
    <div
      className={`editor-asset-status-card logo-asset-status-card ${cardClassName}`.trim()}
    >
      <img
        className={`logo-asset-preview ${previewClassName}`.trim()}
        src={effectiveImageDataUrl}
        alt=""
        draggable={false}
      />
      <span>{label}{formatSize(effectiveImageSize)}</span>
    </div>
  )
}
