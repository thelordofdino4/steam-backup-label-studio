import { useLayoutEffect, useRef, useState } from 'react'
import type {
  DiscGuidedRestoreItem,
} from '../../guidedPresets/discGuidedRestoreItems'
import type { DiscGuidedSlotId } from '../../guidedPresets/discGuidedSlots'
import {
  DISC_ROLE_PRESETS,
  getDiscRolePreset,
} from '../../layout/discRolePresets'
import { EditorPanel } from '../editor/EditorPanel'

export type DiscLayoutPresetsPanelProps = {
  guidedRestoreItems: readonly DiscGuidedRestoreItem[]
  onApplyPreset: (presetId: string) => boolean
  onRestoreAllGuidedSlots: () => void
  onRestoreGuidedSlot: (slotId: DiscGuidedSlotId) => void
}

export function DiscLayoutPresetsPanel({
  guidedRestoreItems,
  onApplyPreset,
  onRestoreAllGuidedSlots,
  onRestoreGuidedSlot,
}: DiscLayoutPresetsPanelProps) {
  const [selectedPresetId, setSelectedPresetId] = useState('')
  const presetSelectRef = useRef<HTMLSelectElement | null>(null)
  const restoreButtonRefs = useRef(
    new Map<DiscGuidedSlotId, HTMLButtonElement>(),
  )
  const pendingRestoreFocusRef = useRef<readonly DiscGuidedSlotId[] | null>(null)
  const selectedPreset = getDiscRolePreset(selectedPresetId)

  useLayoutEffect(() => {
    const pendingSlotIds = pendingRestoreFocusRef.current

    if (!pendingSlotIds) return

    pendingRestoreFocusRef.current = null
    const nextRestoreButton = pendingSlotIds
      .map((slotId) => restoreButtonRefs.current.get(slotId))
      .find((button) => Boolean(button))

    ;(nextRestoreButton ?? presetSelectRef.current)
      ?.focus({ preventScroll: true })
  }, [guidedRestoreItems])

  function handleApplyPreset() {
    if (!selectedPreset || !onApplyPreset(selectedPreset.id)) {
      return
    }

    setSelectedPresetId('')
  }

  function handleRestoreItem(item: DiscGuidedRestoreItem) {
    const currentIndex = guidedRestoreItems.findIndex(
      ({ slotId }) => slotId === item.slotId,
    )
    const nextSlotIds = guidedRestoreItems
      .slice(currentIndex + 1)
      .map(({ slotId }) => slotId)
    const previousSlotIds = guidedRestoreItems
      .slice(0, currentIndex)
      .reverse()
      .map(({ slotId }) => slotId)

    pendingRestoreFocusRef.current = [...nextSlotIds, ...previousSlotIds]
    onRestoreGuidedSlot(item.slotId)
  }

  function handleRestoreAll() {
    pendingRestoreFocusRef.current = []
    onRestoreAllGuidedSlots()
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
      {guidedRestoreItems.length > 0 ? (
        <section
          className="disc-guided-restore-section"
          aria-labelledby="disc-guided-restore-heading"
        >
          <h3 id="disc-guided-restore-heading">Removed layout items</h3>
          <div className="disc-guided-restore-list">
            {guidedRestoreItems.map((item) => (
              <div className="disc-guided-restore-row" key={item.slotId}>
                <span>{item.label}</span>
                <button
                  ref={(element) => {
                    if (element) {
                      restoreButtonRefs.current.set(item.slotId, element)
                    } else {
                      restoreButtonRefs.current.delete(item.slotId)
                    }
                  }}
                  className="disc-guided-restore-button"
                  type="button"
                  aria-label={`Restore ${item.label} to layout`}
                  onClick={() => handleRestoreItem(item)}
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
          <button
            className="secondary-button"
            data-smoke-id="disc-guided-restore-all"
            type="button"
            aria-label="Restore all layout items"
            onClick={handleRestoreAll}
          >
            Restore all
          </button>
        </section>
      ) : null}
    </EditorPanel>
  )
}
