import { useId, type CSSProperties } from 'react'
import type { DesignCheckSummary } from '../../export/designChecklist'
import { ChevronIcon, DesignCheckIcon } from '../sidebar/PanelIcons'

export type PreviewDesignCheckSummary = DesignCheckSummary

function getDesignCheckStatusText(summary: PreviewDesignCheckSummary) {
  if (!summary.hasWarnings) {
    return summary.notes.length
      ? 'No design warnings found; review notes below.'
      : 'No design warnings found.'
  }

  return `${summary.warnings.length} warning${summary.warnings.length === 1 ? '' : 's'} found.`
}

function getDesignCheckItemStatusText(status: PreviewDesignCheckSummary['items'][number]['status']) {
  if (status === 'warning') {
    return 'Review'
  }

  if (status === 'note') {
    return 'Note'
  }

  return 'OK'
}

export function PreviewDesignCheckPanel({
  closedOffset,
  closedSize,
  isOpen,
  label,
  onOpenChange,
  summary,
}: {
  closedOffset: number
  closedSize: number
  isOpen: boolean
  label: string
  onOpenChange: (isOpen: boolean) => void
  summary: PreviewDesignCheckSummary
}) {
  const contentId = useId()
  const style = {
    '--preview-design-check-closed-offset': `${closedOffset}px`,
    '--preview-guide-legend-closed-size': `${closedSize}px`,
  } as CSSProperties
  const notes = summary.notes

  return (
    <aside
      className={[
        'preview-guide-legend-panel',
        'preview-design-check-panel',
        isOpen ? 'is-open' : 'is-closed',
      ].join(' ')}
      style={style}
      aria-label={label}
    >
      <div className="preview-guide-legend-header">
        <h2>Design Check</h2>
        <button
          className={[
            'icon-button',
            'preview-guide-legend-toggle',
            'preview-design-check-toggle',
            summary.hasWarnings ? 'has-warnings' : 'is-clear',
          ].join(' ')}
          type="button"
          aria-controls={contentId}
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Collapse design check' : 'Expand design check'}
          title={isOpen ? 'Collapse design check' : 'Design Check'}
          onClick={() => onOpenChange(!isOpen)}
        >
          {isOpen ? <ChevronIcon /> : <DesignCheckIcon />}
          {!isOpen && summary.hasWarnings ? (
            <span className="preview-design-check-count" aria-hidden="true">
              {summary.warnings.length}
            </span>
          ) : null}
        </button>
      </div>

      <div
        id={contentId}
        className="preview-guide-legend-body"
        hidden={!isOpen}
      >
        <div className="preview-design-check" aria-label={label}>
          <p
            className={[
              'preview-design-check-status',
              summary.hasWarnings ? 'has-warnings' : 'is-clear',
            ].join(' ')}
          >
            {getDesignCheckStatusText(summary)}
          </p>
          {summary.items.length ? (
            <ul className="preview-design-check-items">
              {summary.items.map((item) => (
                <li
                  className={[
                    'preview-design-check-item',
                    `is-${item.status}`,
                  ].join(' ')}
                  key={item.id}
                >
                  <span
                    className="preview-design-check-item-status"
                    aria-hidden="true"
                  >
                    {getDesignCheckItemStatusText(item.status)}
                  </span>
                  <span className="preview-design-check-item-copy">
                    <strong>{item.label}</strong>
                    <span>{item.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          {notes.length ? (
            <div className="preview-design-check-extra">
              <h3>Notes</h3>
              <ul className="preview-design-check-list">
                {notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {!summary.items.length && !notes.length ? (
            <p className="preview-design-check-empty">
              Current visible design checks are clear for this preview.
            </p>
          ) : (
            null
          )}
        </div>
      </div>
    </aside>
  )
}
