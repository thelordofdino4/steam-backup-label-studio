import type { ReactNode } from 'react'
import { TrashIcon } from './PanelIcons'

type RepeatedVisualElementCardProps = {
  title: string
  label: string
  labelInputId: string
  enabled: boolean
  enableLabel: string
  summary: string
  deleteLabel?: string
  onEnabledChange: (enabled: boolean) => void
  onLabelChange: (label: string) => void
  onDelete?: () => void
  children: ReactNode
}

export function RepeatedVisualElementCard({
  title,
  label,
  labelInputId,
  enabled,
  enableLabel,
  summary,
  deleteLabel,
  onEnabledChange,
  onLabelChange,
  onDelete,
  children,
}: RepeatedVisualElementCardProps) {
  const displayLabel = label.trim() || title

  return (
    <details className="repeated-visual-card metadata-details collapsible-panel spacing-top" open>
      <summary className="panel-summary repeated-visual-card-summary">
        <span className="repeated-visual-card-title">{displayLabel}</span>
        <span className="repeated-visual-card-meta">{summary}</span>
      </summary>
      <div className="panel-content repeated-visual-card-content">
        <div className="repeated-visual-card-toolbar">
          <label className="field-label">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => onEnabledChange(event.target.checked)}
            />
            {enableLabel}
          </label>
          {onDelete && deleteLabel ? (
            <button
              className="icon-button danger-icon-button"
              type="button"
              aria-label={deleteLabel}
              title={deleteLabel}
              onClick={onDelete}
            >
              <TrashIcon />
            </button>
          ) : null}
        </div>

        {enabled ? (
          <>
            <label className="field-label spacing-top" htmlFor={labelInputId}>
              Card label
            </label>
            <input
              id={labelInputId}
              className="repeated-visual-card-label-input"
              type="text"
              value={label}
              placeholder={title}
              onChange={(event) => onLabelChange(event.target.value)}
            />
            {children}
          </>
        ) : null}
      </div>
    </details>
  )
}
