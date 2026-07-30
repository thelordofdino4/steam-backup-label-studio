import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { PreviewViewport } from '../preview/PreviewViewport'
import {
  ImageCandidatePreviewPicker,
  type ImageCandidatePickerItem,
} from '../sidebar/ImageCandidatePicker'
import '../../styles/app-preview-shell.css'
import '../../styles/app-image-candidates.css'

type PickerMode = 'success' | 'slow' | 'reject'

declare global {
  interface Window {
    __keyboardModalHarness?: {
      getApplyCount(): number
      setOpenerDisabled(disabled: boolean): void
      setPickerMode(mode: PickerMode): void
      setPickerVisible(visible: boolean): void
      setSelectedCandidate(selected: boolean): void
      setViewportVisible(visible: boolean): void
    }
  }
}

const pickerItems: readonly ImageCandidatePickerItem[] = [
  {
    id: 'first',
    title: 'First candidate',
    subtitle: 'First usable candidate',
    placeholderLabel: 'First',
  },
  {
    id: 'selected',
    title: 'Selected candidate',
    subtitle: 'Currently selected candidate',
    placeholderLabel: 'Selected',
    isSelected: true,
  },
]

export function KeyboardModalIntegrationHarness() {
  const [buttonActivations, setButtonActivations] = useState(0)
  const [customActivations, setCustomActivations] = useState(0)
  const [applyCount, setApplyCount] = useState(0)
  const [pickerMode, setPickerMode] = useState<PickerMode>('success')
  const [pickerVisible, setPickerVisible] = useState(true)
  const [openerDisabled, setOpenerDisabled] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState(true)
  const [viewportVisible, setViewportVisible] = useState(true)

  useEffect(() => {
    window.__keyboardModalHarness = {
      getApplyCount: () => applyCount,
      setOpenerDisabled,
      setPickerMode,
      setPickerVisible,
      setSelectedCandidate,
      setViewportVisible,
    }
    return () => {
      delete window.__keyboardModalHarness
    }
  }, [applyCount])

  const items = pickerItems.map((item) => ({
    ...item,
    isSelected: selectedCandidate && item.id === 'selected',
  }))

  async function selectCandidate() {
    setApplyCount((current) => current + 1)
    if (pickerMode === 'slow') {
      await new Promise((resolve) => window.setTimeout(resolve, 120))
    }
    if (pickerMode === 'reject') {
      throw new Error('integration rejection')
    }
  }

  return (
    <main style={{ display: 'grid', gap: 12, padding: 12 }}>
      {viewportVisible ? <div
        style={{
          width: 620,
          height: 420,
          position: 'relative',
          '--preview-viewport-stage-top-inset': '0px',
          '--preview-viewport-min-rail-width': '48px',
          '--preview-surface-window-gap': '4px',
          '--preview-bottom-control-rail-height': '0px',
          '--preview-viewport-rail-collapsed-width': '14px',
        } as React.CSSProperties}
      >
        <PreviewViewport label="integration preview">
          <div
            data-smoke-id="integration-preview-content"
            style={{
              position: 'relative',
              width: 420,
              height: 300,
              background: '#475569',
            }}
          >
            <div
              data-smoke-id="noninteractive-preview-origin"
              tabIndex={-1}
              style={{ width: 160, height: 120, background: '#94a3b8' }}
            >
              Preview content
            </div>
            <button
              data-smoke-id="interactive-preview-descendant"
              type="button"
              onClick={() => setButtonActivations((current) => current + 1)}
            >
              Preview button
            </button>
            <div
              data-smoke-id="default-prevented-space"
              tabIndex={-1}
              onKeyDown={(event) => {
                if (event.code === 'Space') event.preventDefault()
              }}
            >
              Prevented Space target
            </div>
          </div>
        </PreviewViewport>
      </div> : null}

      <div data-smoke-id="native-control-matrix">
        <button
          data-smoke-id="ordinary-button"
          type="button"
          onClick={() => setButtonActivations((current) => current + 1)}
        >
          Ordinary button
        </button>
        <a data-smoke-id="ordinary-link" href="#link-activated">Link</a>
        <details>
          <summary data-smoke-id="ordinary-summary">Summary</summary>
          Details
        </details>
        <input data-smoke-id="ordinary-input" defaultValue="text" />
        <textarea data-smoke-id="ordinary-textarea" defaultValue="text" />
        <select data-smoke-id="ordinary-select" defaultValue="one">
          <option value="one">One</option>
          <option value="two">Two</option>
        </select>
        <div
          data-smoke-id="direct-contenteditable"
          contentEditable
          suppressContentEditableWarning
        >
          Direct editable
        </div>
        <div contentEditable suppressContentEditableWarning>
          <span data-smoke-id="inherited-contenteditable">Inherited editable</span>
        </div>
        {(['tab', 'menu', 'menuitem', 'switch'] as const).map((role) => (
          <div
            key={role}
            data-smoke-id={`custom-role-${role}`}
            role={role}
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.code === 'Space') {
                event.preventDefault()
                setCustomActivations((current) => current + 1)
              }
            }}
          >
            {role}
          </div>
        ))}
      </div>

      <output data-smoke-id="button-activations">{buttonActivations}</output>
      <output data-smoke-id="custom-activations">{customActivations}</output>
      <output data-smoke-id="apply-count">{applyCount}</output>

      <div data-smoke-id="picker-host">
        <button data-smoke-id="picker-fallback" type="button">
          Picker fallback
        </button>
        {pickerVisible ? (
          <ImageCandidatePreviewPicker
            ariaLabel="Integration picker"
            title="Integration Image Candidates"
            items={items}
            disabled={openerDisabled}
            onSelect={selectCandidate}
          />
        ) : null}
      </div>
    </main>
  )
}

window.addEventListener('unhandledrejection', (event) => {
  if (
    event.reason instanceof Error &&
    event.reason.message === 'integration rejection'
  ) {
    event.preventDefault()
  }
})

createRoot(document.getElementById('root')!).render(
  <KeyboardModalIntegrationHarness />,
)
