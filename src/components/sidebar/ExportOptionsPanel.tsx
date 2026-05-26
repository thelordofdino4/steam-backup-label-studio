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
    <details className="panel collapsible-panel" open>
      <summary className="panel-summary">Export Options</summary>
      <div className="panel-content">
        <p className="hint">
          Clean export is the default. Guide marks are optional print/checking aids and will be drawn into the exported PNG when enabled.
        </p>
        <p className="hint">
          {enabledGuideCount > 0
            ? `${enabledGuideCount} guide ${enabledGuideCount === 1 ? 'mark is' : 'marks are'} enabled for the next export.`
            : 'No guide marks are enabled, so the next PNG export will contain only the disc artwork.'}
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
