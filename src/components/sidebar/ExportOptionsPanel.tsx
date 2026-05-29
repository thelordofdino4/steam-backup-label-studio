import type { ExportGuideKey, ExportGuideSelection } from '../../exportGuides'

export type ExportOptionsPanelProps = {
  exportGuides: ExportGuideSelection
  handleExportGuideToggle: (guideKey: ExportGuideKey, checked: boolean) => void
}

export function ExportOptionsPanel({
  exportGuides,
  handleExportGuideToggle,
}: ExportOptionsPanelProps) {
  const enabledGuideCount = Object.values(exportGuides).filter(Boolean).length

  return (
    <details className="panel collapsible-panel">
      <summary className="panel-summary">Export Options</summary>
      <div className="panel-content">
        <p className="hint">
          Checked guide marks are drawn into the exported PNG to help verify the disc cut, printable area, and safe zone.
        </p>
        <p className="hint">
          {enabledGuideCount > 0
            ? `${enabledGuideCount} guide ${enabledGuideCount === 1 ? 'mark will' : 'marks will'} be included in the next export.`
            : 'Check any guide to include it in the next PNG export.'}
        </p>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={exportGuides.centerHole}
            onChange={(event) => handleExportGuideToggle('centerHole', event.target.checked)}
          />
          <span>Physical center hole guide</span>
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={exportGuides.outerEdge}
            onChange={(event) => handleExportGuideToggle('outerEdge', event.target.checked)}
          />
          <span>Outer cut/edge guide</span>
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={exportGuides.printableArea}
            onChange={(event) => handleExportGuideToggle('printableArea', event.target.checked)}
          />
          <span>Printable area guides</span>
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={exportGuides.safeZone}
            onChange={(event) => handleExportGuideToggle('safeZone', event.target.checked)}
          />
          <span>Safe zone guide</span>
        </label>
      </div>
    </details>
  )
}
