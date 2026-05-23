from pathlib import Path

path = Path("src/App.tsx")
text = path.read_text(encoding="utf-8")

replacements = [
    (
"""        <section className="panel">
          <h2>Project File</h2>""",
"""        <details className="panel collapsible-panel" open>
          <summary className="panel-summary">Project File</summary>
          <div className="panel-content">"""
    ),
    (
"""          <p className="hint">{projectStatus}</p>
        </section>""",
"""          <p className="hint">{projectStatus}</p>
          </div>
        </details>"""
    ),
    (
"""        <section className="panel">
          <h2>Export Options</h2>""",
"""        <details className="panel collapsible-panel" open>
          <summary className="panel-summary">Export Options</summary>
          <div className="panel-content">"""
    ),
    (
"""          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={exportGuides.safeZone}
              onChange={(event) => handleExportGuideToggle('safeZone', event.target.checked)}
            />
            <span>Safe zone guide</span>
          </label>
        </section>""",
"""          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={exportGuides.safeZone}
              onChange={(event) => handleExportGuideToggle('safeZone', event.target.checked)}
            />
            <span>Safe zone guide</span>
          </label>
          </div>
        </details>"""
    ),
    (
"""        <section className="panel">
          <h2>Game</h2>""",
"""        <details className="panel collapsible-panel" open>
          <summary className="panel-summary">Game</summary>
          <div className="panel-content">"""
    ),
    (
"""          )}
        </section>

        <section className="panel">
          <h2>Template</h2>""",
"""          )}
          </div>
        </details>

        <details className="panel collapsible-panel" open>
          <summary className="panel-summary">Template</summary>
          <div className="panel-content">"""
    ),
    (
"""          {selectedDiscTemplate.geometryNote && (
            <p className="hint">{selectedDiscTemplate.geometryNote}</p>
          )}
        </section>

        <section className="panel">
          <h2>Background Image</h2>""",
"""          {selectedDiscTemplate.geometryNote && (
            <p className="hint">{selectedDiscTemplate.geometryNote}</p>
          )}
          </div>
        </details>

        <details className="panel collapsible-panel" open>
          <summary className="panel-summary">Artwork</summary>
          <div className="panel-content">"""
    ),
    (
"""          <p className="hint">
            Upload an image, then drag it directly on the disc preview.
          </p>
        </section>

        <section className="panel">
          <h2>Steam Backup Logo</h2>""",
"""          <p className="hint">
            Upload an image, then drag it directly on the disc preview.
          </p>
          </div>
        </details>

        <details className="panel collapsible-panel" open>
          <summary className="panel-summary">Branding</summary>
          <div className="panel-content">"""
    ),
    (
"""            <option value="none">None</option>
          </select>
        </section>

        <section className="panel">
          <h2>Guides</h2>""",
"""            <option value="none">None</option>
          </select>
          </div>
        </details>

        <details className="panel collapsible-panel">
          <summary className="panel-summary">Guide Legend</summary>
          <div className="panel-content">"""
    ),
    (
"""            <li>Background image layer</li>
          </ul>
        </section>""",
"""            <li>Background image layer</li>
          </ul>
          </div>
        </details>"""
    ),
]

for old, new in replacements:
    if old not in text:
        raise SystemExit(f"Could not find expected block:\\n{old[:120]}...")
    text = text.replace(old, new, 1)

path.write_text(text, encoding="utf-8")