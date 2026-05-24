import type { ExportGuideKey, ExportGuideSelection } from '../../exportGuides'

export type ExportOptionsPanelProps = {
  exportGuides: ExportGuideSelection
  handleExportGuideToggle: (guideKey: ExportGuideKey, checked: boolean) => void
}

export function ExportOptionsPanel({
  exportGuides,
  handleExportGuideToggle,
}: ExportOptionsPanelProps) {
  return (
    <details className="panel collapsible-panel" open>
      <summary className="panel-summary">Export Options</summary>
      <div className="panel-content">
        <p className="hint">
          Clean export is the default. Check only the guide marks you want included.
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
