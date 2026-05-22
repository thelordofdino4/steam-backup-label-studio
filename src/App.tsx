import { invoke } from '@tauri-apps/api/core'
import { open, save } from '@tauri-apps/plugin-dialog'
import { useRef, useState, type ChangeEvent, type PointerEvent } from 'react'
import { discTemplates, discTemplateOptions, type DiscTemplateId } from './templates/discTemplates'
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

type SavedProject = {
  schemaVersion: '0.1.0'
  title: string
  savedAt: string
  template: {
    type: 'disc'
    variant: DiscTemplateId
  }
  steamBackupLogo: {
    placement: SteamLogoPlacement
  }
  background: {
    scale: number
    offset: BackgroundOffset
    imageDataUrl: string | null
    note: string
  }
}

const EXPORT_DPI = 300
const MM_PER_INCH = 25.4

function getGuideInsetPercent(outerDiameterMm: number, guideDiameterMm: number) {
  return ((outerDiameterMm - guideDiameterMm) / 2 / outerDiameterMm) * 100
}

function mmToPixels(mm: number) {
  return Math.round((mm / MM_PER_INCH) * EXPORT_DPI)
}

function canvasToPngBytes(canvas: HTMLCanvasElement) {
  return new Promise<number[]>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Could not create PNG blob.'))
        return
      }

      blob
        .arrayBuffer()
        .then((buffer) => resolve(Array.from(new Uint8Array(buffer))))
        .catch(reject)
    }, 'image/png')
  })
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()

    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not load background image for export.'))

    image.src = source
  })
}

function App() {
  const [selectedDiscTemplateId, setSelectedDiscTemplateId] =
    useState<DiscTemplateId>('standardPrintableDisc')
  const [steamLogoPlacement, setSteamLogoPlacement] =
    useState<SteamLogoPlacement>('top')
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null)
  const [backgroundScale, setBackgroundScale] = useState(1)
  const [backgroundOffset, setBackgroundOffset] = useState<BackgroundOffset>({
    x: 0,
    y: 0,
  })
  const [projectStatus, setProjectStatus] = useState(
    'No project file saved yet.',
  )

  const dragStateRef = useRef<DragState | null>(null)
  const discPreviewRef = useRef<HTMLDivElement | null>(null)
  const selectedDiscTemplate = discTemplates[selectedDiscTemplateId]

  const printableInsetPercent = getGuideInsetPercent(
    selectedDiscTemplate.outerDiameterMm,
    selectedDiscTemplate.printableDiameterMm,
  )
  const safeInsetPercent = getGuideInsetPercent(
    selectedDiscTemplate.outerDiameterMm,
    selectedDiscTemplate.safeDiameterMm,
  )
  const centerHolePercent =
    (selectedDiscTemplate.innerHoleDiameterMm / selectedDiscTemplate.outerDiameterMm) * 100

  function createProjectSnapshot(): SavedProject {
    return {
      schemaVersion: '0.1.0',
      title: 'Untitled Steam Backup Label',
      savedAt: new Date().toISOString(),
      template: {
        type: 'disc',
        variant: selectedDiscTemplateId,
      },
      steamBackupLogo: {
        placement: steamLogoPlacement,
      },
      background: {
        scale: backgroundScale,
        offset: backgroundOffset,
        imageDataUrl: backgroundImageUrl,
        note:
          'MVP save state embeds the background image as a data URL. A more efficient .sbls package format can replace this later.',
      },
    }
  }

  async function handleSaveProject() {
    try {
      const path = await save({
        defaultPath: 'steam-backup-label.sbls.json',
        filters: [
          {
            name: 'Steam Backup Label Studio Project',
            extensions: ['json'],
          },
        ],
      })

      if (!path) {
        setProjectStatus('Save cancelled.')
        return
      }

      const project = createProjectSnapshot()
      await invoke('write_project_file', {
        path,
        contents: JSON.stringify(project, null, 2),
      })

      setProjectStatus(`Saved project to ${path}`)
    } catch (error) {
      setProjectStatus(`Save failed: ${String(error)}`)
    }
  }

  async function handleLoadProject() {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'Steam Backup Label Studio Project',
            extensions: ['json'],
          },
        ],
      })

      if (!selected || Array.isArray(selected)) {
        setProjectStatus('Load cancelled.')
        return
      }

      const contents = await invoke<string>('read_project_file', {
        path: selected,
      })
      const project = JSON.parse(contents) as SavedProject
      const savedTemplateId = project.template.variant

      setSelectedDiscTemplateId(
        savedTemplateId in discTemplates ? savedTemplateId : 'standardPrintableDisc',
      )
      setSteamLogoPlacement(project.steamBackupLogo.placement)
      setBackgroundScale(project.background.scale)
      setBackgroundOffset(project.background.offset)
      setBackgroundImageUrl(project.background.imageDataUrl)

      setProjectStatus(
        project.background.imageDataUrl
          ? 'Loaded project layout and embedded background image.'
          : 'Loaded project layout. No embedded background image was found.',
      )
    } catch (error) {
      setProjectStatus(`Load failed: ${String(error)}`)
    }
  }

  async function handleExportPng() {
    try {
      const path = await save({
        defaultPath: 'steam-backup-label.png',
        filters: [
          {
            name: 'PNG Image',
            extensions: ['png'],
          },
        ],
      })

      if (!path) {
        setProjectStatus('Export cancelled.')
        return
      }

      const exportSize = mmToPixels(selectedDiscTemplate.outerDiameterMm)
      const canvas = document.createElement('canvas')
      canvas.width = exportSize
      canvas.height = exportSize

      const context = canvas.getContext('2d')

      if (!context) {
        throw new Error('Could not create PNG export canvas.')
      }

      const center = exportSize / 2
      const outerRadius = exportSize / 2
      const centerHoleRadius =
        (selectedDiscTemplate.innerHoleDiameterMm /
          selectedDiscTemplate.outerDiameterMm) *
        outerRadius

      context.clearRect(0, 0, exportSize, exportSize)

      context.save()
      context.beginPath()
      context.arc(center, center, outerRadius, 0, Math.PI * 2)
      context.clip()

      context.fillStyle = '#e5e7eb'
      context.fillRect(0, 0, exportSize, exportSize)

      if (backgroundImageUrl) {
        const image = await loadImage(backgroundImageUrl)
        const previewSize =
          discPreviewRef.current?.getBoundingClientRect().width ?? exportSize
        const offsetScale = exportSize / previewSize
        const coverScale = Math.max(
          exportSize / image.width,
          exportSize / image.height,
        )
        const drawScale = coverScale * backgroundScale
        const drawWidth = image.width * drawScale
        const drawHeight = image.height * drawScale
        const drawX =
          center - drawWidth / 2 + backgroundOffset.x * offsetScale
        const drawY =
          center - drawHeight / 2 + backgroundOffset.y * offsetScale

        context.drawImage(image, drawX, drawY, drawWidth, drawHeight)
      }

      if (steamLogoPlacement !== 'none') {
        const logoWidth = exportSize * 0.34
        const logoHeight = exportSize * 0.065
        const logoX = center - logoWidth / 2
        const logoY =
          steamLogoPlacement === 'top'
            ? exportSize * 0.12
            : exportSize * 0.815
        const logoRadius = logoHeight / 2

        context.fillStyle = 'rgba(15, 23, 42, 0.92)'
        context.strokeStyle = 'rgba(17, 24, 39, 0.85)'
        context.lineWidth = Math.max(4, exportSize * 0.004)

        context.beginPath()
        context.roundRect(logoX, logoY, logoWidth, logoHeight, logoRadius)
        context.fill()
        context.stroke()

        context.fillStyle = '#f9fafb'
        context.font = `bold ${Math.round(exportSize * 0.028)}px Arial`
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.fillText('Steam Backup', center, logoY + logoHeight / 2)
      }

      context.restore()

      context.save()
      context.globalCompositeOperation = 'destination-out'
      context.beginPath()
      context.arc(center, center, centerHoleRadius, 0, Math.PI * 2)
      context.fill()
      context.restore()

      const pngBytes = await canvasToPngBytes(canvas)

      await invoke('write_binary_file', {
        path,
        bytes: pngBytes,
      })

      setProjectStatus(
        `Exported ${exportSize} × ${exportSize}px PNG at ${EXPORT_DPI} DPI.`,
      )
    } catch (error) {
      setProjectStatus(`Export failed: ${String(error)}`)
    }
  }

  function handleBackgroundUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      const imageDataUrl = reader.result

      if (typeof imageDataUrl !== 'string') {
        setProjectStatus('Background image could not be loaded.')
        return
      }

      setBackgroundImageUrl(imageDataUrl)
      setBackgroundScale(1)
      setBackgroundOffset({ x: 0, y: 0 })
      setProjectStatus('Background image loaded and will be embedded when saved.')
    }

    reader.onerror = () => {
      setProjectStatus('Background image could not be read.')
    }

    reader.readAsDataURL(file)
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
        <p className="muted">Issue #7: 300 DPI PNG export</p>

        <section className="panel">
          <h2>Project File</h2>
          <div className="button-row">
            <button className="secondary-button" type="button" onClick={handleSaveProject}>
              Save Project
            </button>
            <button className="secondary-button" type="button" onClick={handleLoadProject}>
              Load Project
            </button>
            <button className="secondary-button" type="button" onClick={handleExportPng}>
              Export PNG
            </button>
          </div>
          <p className="hint">{projectStatus}</p>
        </section>

        <section className="panel">
          <h2>Template</h2>
          <label className="field-label" htmlFor="disc-template">
            Disc type
          </label>
          <select
            id="disc-template"
            value={selectedDiscTemplateId}
            onChange={(event) =>
              setSelectedDiscTemplateId(event.target.value as DiscTemplateId)
            }
          >
            {discTemplateOptions.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>

          <dl className="template-metrics">
            <div>
              <dt>Outer diameter</dt>
              <dd>{selectedDiscTemplate.outerDiameterMm} mm</dd>
            </div>
            <div>
              <dt>Center hole</dt>
              <dd>{selectedDiscTemplate.innerHoleDiameterMm} mm</dd>
            </div>
            <div>
              <dt>Printable area</dt>
              <dd>{selectedDiscTemplate.printableDiameterMm} mm</dd>
            </div>
            <div>
              <dt>Safe zone</dt>
              <dd>{selectedDiscTemplate.safeDiameterMm} mm</dd>
            </div>
          </dl>
          <p className="hint">
            Preset dimensions are used for guide geometry and should be verified before final print/export.
          </p>
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
            <li>Printable area</li>
            <li>Center hole</li>
            <li>Safe zone</li>
            <li>Steam Backup logo zone</li>
            <li>Background image layer</li>
          </ul>
        </section>
      </aside>

      <section className="preview-area">
        <div
          ref={discPreviewRef}
          className="disc-preview"
          aria-label="Blank standard printable disc preview"
        >
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

          <div
            className="printable-zone"
            style={{ inset: `${printableInsetPercent}%` }}
          />
          <div className="safe-zone" style={{ inset: `${safeInsetPercent}%` }} />
          <div
            className="center-hole"
            style={{ width: `${centerHolePercent}%` }}
          />
        </div>
      </section>
    </main>
  )
}

export default App
