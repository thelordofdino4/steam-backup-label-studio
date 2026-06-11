import { useId, type CSSProperties } from 'react'
import { ChevronIcon, GuideLegendIcon } from '../sidebar/PanelIcons'

type PreviewGuideLegendItem = {
  description: string
  swatchClassName: string
  title: string
}

const DISC_GUIDE_LEGEND_ITEMS: PreviewGuideLegendItem[] = [
  {
    swatchClassName: 'guide-swatch-outer',
    title: 'Outer cut edge',
    description: 'The physical outside edge of the disc.',
  },
  {
    swatchClassName: 'guide-swatch-print',
    title: 'Printable area',
    description: 'The usable printed region between the inner and outer print boundaries.',
  },
  {
    swatchClassName: 'guide-swatch-hub',
    title: 'No-print hub',
    description: 'The striped center region between the physical hole and printable boundary.',
  },
  {
    swatchClassName: 'guide-swatch-hole',
    title: 'Physical center hole',
    description: 'The actual cut-out center hole that is blanked during export.',
  },
  {
    swatchClassName: 'guide-swatch-safe',
    title: 'Safe zone',
    description: 'An advisory boundary for keeping important text and logos away from edge drift.',
  },
]

const CASE_INSERT_GUIDE_LEGEND_ITEMS: PreviewGuideLegendItem[] = [
  {
    swatchClassName: 'case-guide-swatch-trim',
    title: 'Trim',
    description: 'Final cut boundary.',
  },
  {
    swatchClassName: 'case-guide-swatch-safe',
    title: 'Safe Area',
    description: 'Keep important content inside this line.',
  },
  {
    swatchClassName: 'case-guide-swatch-spine',
    title: 'Spine Fold',
    description: 'Tray-card fold lines for the two spine strips.',
  },
]

function PreviewGuideLegendPanel({
  closedSize,
  isOpen,
  items,
  label,
  onOpenChange,
}: {
  closedSize: number
  isOpen: boolean
  items: PreviewGuideLegendItem[]
  label: string
  onOpenChange: (isOpen: boolean) => void
}) {
  const contentId = useId()
  const style = {
    '--preview-guide-legend-closed-size': `${closedSize}px`,
  } as CSSProperties

  return (
    <aside
      className={[
        'preview-guide-legend-panel',
        isOpen ? 'is-open' : 'is-closed',
      ].join(' ')}
      style={style}
      aria-label={label}
    >
      <div className="preview-guide-legend-header">
        <h2>Guide Legend</h2>
        <button
          className="icon-button preview-guide-legend-toggle"
          type="button"
          aria-controls={contentId}
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Collapse guide legend' : 'Expand guide legend'}
          title={isOpen ? 'Collapse guide legend' : 'Expand guide legend'}
          onClick={() => onOpenChange(!isOpen)}
        >
          {isOpen ? <ChevronIcon /> : <GuideLegendIcon />}
        </button>
      </div>

      <div
        id={contentId}
        className="preview-guide-legend-body"
        hidden={!isOpen}
      >
        <div className="guide-legend" aria-label={label}>
          {items.map((item) => (
            <div className="guide-legend-item" key={item.title}>
              <span
                className={`guide-swatch ${item.swatchClassName}`}
                aria-hidden="true"
              />
              <div>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}

type GuideLegendPreviewPanelProps = {
  closedSize: number
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
}

export function DiscGuideLegendPreviewPanel({
  closedSize,
  isOpen,
  onOpenChange,
}: GuideLegendPreviewPanelProps) {
  return (
    <PreviewGuideLegendPanel
      closedSize={closedSize}
      isOpen={isOpen}
      items={DISC_GUIDE_LEGEND_ITEMS}
      label="Disc guide legend"
      onOpenChange={onOpenChange}
    />
  )
}

export function CaseInsertGuideLegendPreviewPanel({
  closedSize,
  isOpen,
  onOpenChange,
}: GuideLegendPreviewPanelProps) {
  return (
    <PreviewGuideLegendPanel
      closedSize={closedSize}
      isOpen={isOpen}
      items={CASE_INSERT_GUIDE_LEGEND_ITEMS}
      label="Case insert guide legend"
      onOpenChange={onOpenChange}
    />
  )
}
