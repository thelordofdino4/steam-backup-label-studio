import { useRef, useState, type ChangeEvent, type PointerEvent } from 'react'
import './App.css'

type SteamLogoPlacement = 'top' | 'bottom' | 'none'

type BackgroundOffset = {
  x: number
  y: number
}

type DragState = {
  pointerId: number
  startClientX: number
  startClientY: number
  startOffsetX: number
  startOffsetY: number
}

function App() {
  const [steamLogoPlacement, setSteamLogoPlacement] =
    useState<SteamLogoPlacement>('top')
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null)
  const [backgroundScale, setBackgroundScale] = useState(1)
  const [backgroundOffset, setBackgroundOffset] = useState<BackgroundOffset>({
    x: 0,
    y: 0,
  })

  const dragStateRef = useRef<DragState | null>(null)

  function handleBackgroundUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const imageUrl = URL.createObjectURL(file)
    setBackgroundImageUrl(imageUrl)
    setBackgroundScale(1)
    setBackgroundOffset({ x: 0, y: 0 })
  }

  function handleBackgroundPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!backgroundImageUrl) {
      return
    }

    event.currentTarget.setPointerCapture(event.pointerId)

    dragStateRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffsetX: backgroundOffset.x,
      startOffsetY: backgroundOffset.y,
    }
  }

  function handleBackgroundPointerMove(event: PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return
    }

    const deltaX = event.clientX - dragState.startClientX
    const deltaY = event.clientY - dragState.startClientY

    setBackgroundOffset({
      x: dragState.startOffsetX + deltaX,
      y: dragState.startOffsetY + deltaY,
    })
  }

  function handleBackgroundPointerUp(event: PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return
    }

    dragStateRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <h1>Steam Backup Label Studio</h1>
        <p className="muted">Issue #5: Background image layer</p>

        <section className="panel">
          <h2>Template</h2>
          <p>Standard printable disc</p>
        </section>

        <section className="panel">
          <h2>Background Image</h2>

          <label className="field-label" htmlFor="background-upload">
            Local image
          </label>
          <input
            id="background-upload"
            type="file"
            accept="image/*"
            onChange={handleBackgroundUpload}
          />

          <label className="field-label spacing-top" htmlFor="background-scale">
            Resize
          </label>
          <input
            id="background-scale"
            type="range"
            min="0.6"
            max="2"
            step="0.05"
            value={backgroundScale}
            disabled={!backgroundImageUrl}
            onChange={(event) => setBackgroundScale(Number(event.target.value))}
          />

          <button
            className="secondary-button"
            type="button"
            disabled={!backgroundImageUrl}
            onClick={() => {
              setBackgroundScale(1)
              setBackgroundOffset({ x: 0, y: 0 })
            }}
          >
            Reset background
          </button>

          <p className="hint">
            Upload an image, then drag it directly on the disc preview.
          </p>
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
            <li>Background image layer</li>
          </ul>
        </section>
      </aside>

      <section className="preview-area">
        <div className="disc-preview" aria-label="Blank standard printable disc preview">
          {backgroundImageUrl ? (
            <div
              className="background-image-layer"
              role="img"
              aria-label="Uploaded background image layer"
              onPointerDown={handleBackgroundPointerDown}
              onPointerMove={handleBackgroundPointerMove}
              onPointerUp={handleBackgroundPointerUp}
              onPointerCancel={handleBackgroundPointerUp}
            >
              <img
                src={backgroundImageUrl}
                alt=""
                draggable={false}
                style={{
                  transform: `translate(-50%, -50%) translate(${backgroundOffset.x}px, ${backgroundOffset.y}px) scale(${backgroundScale})`,
                }}
              />
            </div>
          ) : (
            <div className="empty-background-message">
              Upload a background image
            </div>
          )}

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