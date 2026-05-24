export function GuideLegendPanel() {
  return (
    <details className="panel collapsible-panel">
      <summary className="panel-summary">Guide Legend</summary>
      <div className="panel-content">
        <div className="guide-legend" aria-label="Disc guide legend">
          <div className="guide-legend-item">
            <span className="guide-swatch guide-swatch-outer" aria-hidden="true" />
            <div>
              <strong>Outer cut edge</strong>
              <p>The physical outside edge of the disc.</p>
            </div>
          </div>
          <div className="guide-legend-item">
            <span className="guide-swatch guide-swatch-print" aria-hidden="true" />
            <div>
              <strong>Printable area</strong>
              <p>The usable printed region between the inner and outer print boundaries.</p>
            </div>
          </div>
          <div className="guide-legend-item">
            <span className="guide-swatch guide-swatch-hub" aria-hidden="true" />
            <div>
              <strong>No-print hub</strong>
              <p>The striped center region between the physical hole and printable boundary.</p>
            </div>
          </div>
          <div className="guide-legend-item">
            <span className="guide-swatch guide-swatch-hole" aria-hidden="true" />
            <div>
              <strong>Physical center hole</strong>
              <p>The actual cut-out center hole that is blanked during export.</p>
            </div>
          </div>
          <div className="guide-legend-item">
            <span className="guide-swatch guide-swatch-safe" aria-hidden="true" />
            <div>
              <strong>Safe zone</strong>
              <p>An advisory boundary for keeping important text and logos away from edge drift.</p>
            </div>
          </div>
        </div>
      </div>
    </details>
  )
}
