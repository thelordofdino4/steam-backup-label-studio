import { useLayoutEffect, useRef, useState } from 'react'
import type {
  DiscGuidedProgressItem,
  DiscGuidedProgressItems,
} from '../../guidedPresets/discGuidedRestoreItems'
import type { DiscGuidedSlotId } from '../../guidedPresets/discGuidedSlots'
import {
  DISC_ROLE_PRESETS,
  getDiscRolePreset,
} from '../../layout/discRolePresets'
import { EditorPanel } from '../editor/EditorPanel'

export type DiscLayoutPresetsPanelProps = {
  guidedProgress: DiscGuidedProgressItems
  onApplyPreset: (presetId: string) => boolean
  onIncludeGuidedSlot: (slotId: DiscGuidedSlotId) => void
  onResetGuidedProgress: () => void
  onShowGuidedSlotAgain: (slotId: DiscGuidedSlotId) => void
}

type GuidedProgressActionKind = 'removed' | 'completed'

type GuidedProgressAction = Readonly<{
  key: string
  kind: GuidedProgressActionKind
  item: DiscGuidedProgressItem
}>

function getGuidedProgressActionKey(
  kind: GuidedProgressActionKind,
  slotId: DiscGuidedSlotId,
) {
  return `${kind}:${slotId}`
}

function createGuidedProgressActions(
  progress: DiscGuidedProgressItems,
): readonly GuidedProgressAction[] {
  return [
    ...progress.removedItems.map((item) => ({
      key: getGuidedProgressActionKey('removed', item.slotId),
      kind: 'removed' as const,
      item,
    })),
    ...progress.completedItems.map((item) => ({
      key: getGuidedProgressActionKey('completed', item.slotId),
      kind: 'completed' as const,
      item,
    })),
  ]
}

export function DiscLayoutPresetsPanel({
  guidedProgress,
  onApplyPreset,
  onIncludeGuidedSlot,
  onResetGuidedProgress,
  onShowGuidedSlotAgain,
}: DiscLayoutPresetsPanelProps) {
  const [selectedPresetId, setSelectedPresetId] = useState('')
  const presetSelectRef = useRef<HTMLSelectElement | null>(null)
  const progressButtonRefs = useRef(
    new Map<string, HTMLButtonElement>(),
  )
  const resetProgressButtonRef = useRef<HTMLButtonElement | null>(null)
  const pendingProgressFocusRef = useRef<readonly string[] | null>(null)
  const selectedPreset = getDiscRolePreset(selectedPresetId)
  const progressActions = createGuidedProgressActions(guidedProgress)
  const hasGuidedProgress = progressActions.length > 0

  useLayoutEffect(() => {
    const pendingActionKeys = pendingProgressFocusRef.current

    if (!pendingActionKeys) return

    pendingProgressFocusRef.current = null
    const nextProgressButton = pendingActionKeys
      .map((actionKey) => progressButtonRefs.current.get(actionKey))
      .find((button) => Boolean(button))

    ;(
      nextProgressButton ??
      resetProgressButtonRef.current ??
      presetSelectRef.current
    )
      ?.focus({ preventScroll: true })
  }, [guidedProgress])

  function handleApplyPreset() {
    if (!selectedPreset || !onApplyPreset(selectedPreset.id)) {
      return
    }

    setSelectedPresetId('')
  }

  function recordPendingProgressFocus(actionKey: string) {
    const currentIndex = progressActions.findIndex(
      (action) => action.key === actionKey,
    )
    const nextActionKeys = progressActions
      .slice(currentIndex + 1)
      .map(({ key }) => key)
    const previousActionKeys = progressActions
      .slice(0, currentIndex)
      .reverse()
      .map(({ key }) => key)

    pendingProgressFocusRef.current = [
      ...nextActionKeys,
      ...previousActionKeys,
    ]
  }

  function handleIncludeAgain(item: DiscGuidedProgressItem) {
    recordPendingProgressFocus(
      getGuidedProgressActionKey('removed', item.slotId),
    )
    onIncludeGuidedSlot(item.slotId)
  }

  function handleShowGuideAgain(item: DiscGuidedProgressItem) {
    recordPendingProgressFocus(
      getGuidedProgressActionKey('completed', item.slotId),
    )
    onShowGuidedSlotAgain(item.slotId)
  }

  function handleResetGuidedProgress() {
    pendingProgressFocusRef.current = []
    onResetGuidedProgress()
  }

  function registerProgressButton(
    actionKey: string,
    element: HTMLButtonElement | null,
  ) {
    if (element) {
      progressButtonRefs.current.set(actionKey, element)
    } else {
      progressButtonRefs.current.delete(actionKey)
    }
  }

  return (
    <EditorPanel title="Layout Presets">
      <label className="field-label" htmlFor="disc-layout-preset">
        Preset
      </label>
      <select
        ref={presetSelectRef}
        id="disc-layout-preset"
        data-smoke-id="disc-layout-preset-select"
        value={selectedPresetId}
        onChange={(event) => setSelectedPresetId(event.target.value)}
      >
        <option value="">Choose a preset</option>
        {DISC_ROLE_PRESETS.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.label}
          </option>
        ))}
      </select>
      <p className="hint">
        Presets are editable starting points. Applying one changes layout and
        visibility without replacing your artwork or text.
      </p>
      <button
        className="secondary-button"
        data-smoke-id="disc-layout-preset-apply"
        type="button"
        disabled={!selectedPreset}
        onClick={handleApplyPreset}
      >
        Apply preset
      </button>
      {hasGuidedProgress ? (
        <section
          className="disc-guided-progress-section"
          aria-labelledby="disc-guided-progress-heading"
        >
          <h3 id="disc-guided-progress-heading">Guided progress</h3>

          {guidedProgress.removedItems.length > 0 ? (
            <section
              className="disc-guided-progress-group"
              aria-labelledby="disc-guided-removed-heading"
            >
              <h4 id="disc-guided-removed-heading">Removed layout items</h4>
              <div className="disc-guided-progress-list">
                {guidedProgress.removedItems.map((item) => {
                  const actionKey = getGuidedProgressActionKey(
                    'removed',
                    item.slotId,
                  )

                  return (
                    <div className="disc-guided-progress-row" key={item.slotId}>
                      <span>{item.label}</span>
                      <button
                        ref={(element) => registerProgressButton(
                          actionKey,
                          element,
                        )}
                        className="disc-guided-progress-button"
                        type="button"
                        aria-label={`Include ${item.label} in the layout again`}
                        data-guided-progress-kind="removed"
                        data-guided-progress-slot-id={item.slotId}
                        onClick={() => handleIncludeAgain(item)}
                      >
                        Include again
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>
          ) : null}

          {guidedProgress.completedItems.length > 0 ? (
            <section
              className="disc-guided-progress-group"
              aria-labelledby="disc-guided-completed-heading"
            >
              <h4 id="disc-guided-completed-heading">Completed layout items</h4>
              <div className="disc-guided-progress-list">
                {guidedProgress.completedItems.map((item) => {
                  const actionKey = getGuidedProgressActionKey(
                    'completed',
                    item.slotId,
                  )

                  return (
                    <div className="disc-guided-progress-row" key={item.slotId}>
                      <span>{item.label}</span>
                      <button
                        ref={(element) => registerProgressButton(
                          actionKey,
                          element,
                        )}
                        className="disc-guided-progress-button"
                        type="button"
                        aria-label={`Show ${item.label} guide again`}
                        data-guided-progress-kind="completed"
                        data-guided-progress-slot-id={item.slotId}
                        onClick={() => handleShowGuideAgain(item)}
                      >
                        Show guide again
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>
          ) : null}

          <button
            ref={resetProgressButtonRef}
            className="secondary-button disc-guided-progress-reset"
            data-smoke-id="disc-guided-progress-reset"
            type="button"
            aria-label="Reset guided progress"
            onClick={handleResetGuidedProgress}
          >
            Reset guided progress
          </button>
        </section>
      ) : null}
    </EditorPanel>
  )
}
