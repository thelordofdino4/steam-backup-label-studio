import { useState } from 'react'
import './App.css'

type SteamLogoPlacement = 'top' | 'bottom' | 'none'

function App() {
  const [steamLogoPlacement, setSteamLogoPlacement] =
    useState<SteamLogoPlacement>('top')

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <h1>Steam Backup Label Studio</h1>
        <p className="muted">Issue #4: Steam Backup logo placement</p>

        <section className="panel">
          <h2>Template</h2>
          <p>Standard printable disc</p>
        </section>

        <section className="panel">
          <h2>Steam Backup Logo</h2>
          <label className="field-label" htmlFor="steam-logo-placement">
            Placement
          </label>
          <select
            id="steam-logo-placement"
            value={steamLogoPlacement}
            onChange={(event) =>
              setSteamLogoPlacement(event.target.value as SteamLogoPlacement)
            }
          >
            <option value="top">Top center</option>
            <option value="bottom">Bottom center</option>
            <option value="none">None</option>
          </select>
        </section>

        <section className="panel">
          <h2>Guides</h2>
          <ul>
            <li>Outer disc edge</li>
            <li>Center hole</li>
            <li>Safe zone</li>
            <li>Steam Backup logo zone</li>
          </ul>
        </section>
      </aside>

      <section className="preview-area">
        <div className="disc-preview" aria-label="Blank standard printable disc preview">
          {steamLogoPlacement !== 'none' && (
            <div className={`steam-backup-logo ${steamLogoPlacement}`}>
              <span>Steam Backup</span>
            </div>
          )}

          <div className="safe-zone" />
          <div className="center-hole" />
        </div>
      </section>
    </main>
  )
}

export default App