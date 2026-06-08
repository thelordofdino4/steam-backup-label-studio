import { getProjectImageAssetStatus } from '../../project/projectAssetStatus'
import type {
  BackgroundImageSize,
  ProjectImageAssetProvenance,
} from '../../project/projectTypes'

export type EditorImageAssetStatusCardProps = {
  cardClassName?: string
  emptyHint: string
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
  fallbackLabel,
  formatSize = () => '',
  imageDataUrl,
  imageSize,
  imageSource = null,
  previewClassName = '',
  statusText = 'summary',
}: EditorImageAssetStatusCardProps) {
  if (!imageDataUrl) {
    return <p className="hint">{emptyHint}</p>
  }

  const status = getProjectImageAssetStatus({
    imageDataUrl,
    provenance: imageSource,
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
        src={imageDataUrl}
        alt=""
        draggable={false}
      />
      <span>{label}{formatSize(imageSize)}</span>
    </div>
  )
}
