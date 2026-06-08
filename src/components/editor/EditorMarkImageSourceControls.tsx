import type { ChangeEvent, ReactNode } from 'react'
import {
  getMarkImageSourceStatus,
  type MarkImageSize,
  type MarkImageSource,
} from '../../editor/markImageSource'

export type EditorMarkImageSourceControlsProps = {
  builtInHint: string
  builtInOptionLabel?: string
  children?: ReactNode
  clearCustomLabel: string
  customActiveLabel: string
  customImageDataUrl: string | null
  customImageLabel: string
  customImageSize: MarkImageSize | null
  customOptionLabel?: string
  emptyCustomHint: string
  formatSize?: (size: MarkImageSize | null) => string
  idPrefix?: string
  onClearCustomImage?: () => void
  onSourceChange: (source: MarkImageSource) => void
  onUpload: (
    event: ChangeEvent<HTMLInputElement>,
  ) => unknown | Promise<unknown>
  source: MarkImageSource
  sourceDetails?: ReactNode
  sourceLabel: string
  sourceSelectId: string
  uploadButtonLabel: string
  uploadId: string
}

export function EditorMarkImageSourceControls({
  builtInHint,
  builtInOptionLabel = 'Built-in generic',
  children,
  clearCustomLabel,
  customActiveLabel,
  customImageDataUrl,
  customImageLabel,
  customImageSize,
  customOptionLabel = 'Custom image',
  emptyCustomHint,
  formatSize = () => '',
  idPrefix,
  onClearCustomImage,
  onSourceChange,
  onUpload,
  source,
  sourceDetails,
  sourceLabel,
  sourceSelectId,
  uploadButtonLabel,
  uploadId,
}: EditorMarkImageSourceControlsProps) {
  const fieldId = (id: string) => idPrefix ? `${idPrefix}-${id}` : id
  const sourceStatus = getMarkImageSourceStatus({
    source,
    customImageDataUrl,
    customImageSize,
  })

  return (
    <>
      <label
        className="field-label spacing-top"
        htmlFor={fieldId(sourceSelectId)}
      >
        {sourceLabel}
      </label>
      <select
        id={fieldId(sourceSelectId)}
        value={source}
        onChange={(event) =>
          onSourceChange(event.target.value as MarkImageSource)}
      >
        <option value="placeholder">{builtInOptionLabel}</option>
        <option value="custom">{customOptionLabel}</option>
      </select>

      {sourceDetails}

      {sourceStatus.isCustomSource ? (
        <>
          <span className="field-label spacing-top">{customImageLabel}</span>
          <label
            className="secondary-button logo-upload-button"
            htmlFor={fieldId(uploadId)}
          >
            {uploadButtonLabel}
          </label>
          <input
            id={fieldId(uploadId)}
            className="logo-file-input"
            type="file"
            accept="image/*"
            onChange={(event) => void onUpload(event)}
          />

          {sourceStatus.hasCustomImage ? (
            <div className="selected-lockup-card logo-asset-status-card">
              <img
                className="logo-asset-preview"
                src={customImageDataUrl ?? ''}
                alt=""
                draggable={false}
              />
              <span>{customActiveLabel}{formatSize(customImageSize)}</span>
            </div>
          ) : (
            <p className="hint">{emptyCustomHint}</p>
          )}
        </>
      ) : (
        <p className="hint">{builtInHint}</p>
      )}

      {children}

      {sourceStatus.hasCustomImage && onClearCustomImage ? (
        <button
          className="secondary-button"
          type="button"
          onClick={onClearCustomImage}
        >
          {clearCustomLabel}
        </button>
      ) : null}
    </>
  )
}
