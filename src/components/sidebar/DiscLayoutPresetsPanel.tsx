import { useState } from 'react'
import {
  DISC_ROLE_PRESETS,
  getDiscRolePreset,
} from '../../layout/discRolePresets'
import { EditorPanel } from '../editor/EditorPanel'

export type DiscLayoutPresetsPanelProps = {
  onApplyPreset: (presetId: string) => boolean
}

export function DiscLayoutPresetsPanel({
  onApplyPreset,
}: DiscLayoutPresetsPanelProps) {
  const [selectedPresetId, setSelectedPresetId] = useState('')
  const selectedPreset = getDiscRolePreset(selectedPresetId)

  function handleApplyPreset() {
    if (!selectedPreset || !onApplyPreset(selectedPreset.id)) {
      return
    }

    setSelectedPresetId('')
  }

  return (
    <EditorPanel title="Layout Presets">
      <label className="field-label" htmlFor="disc-layout-preset">
        Preset
      </label>
      <select
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
    </EditorPanel>
  )
}
