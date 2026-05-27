import {
  CURVED_COPYRIGHT_LAYOUT_X_MAX,
  CURVED_COPYRIGHT_LAYOUT_X_MIN,
  CURVED_COPYRIGHT_LAYOUT_Y_MAX,
  CURVED_COPYRIGHT_LAYOUT_Y_MIN,
  DISC_TEXT_KEYS,
  DISC_TEXT_WIDTH_MAX,
  DISC_TEXT_WIDTH_MIN,
  getDiscTextLabel,
  getDiscTextInputValue,
  isCurvedCopyrightDiscTextLayout,
  type DiscTextAlignment,
  type DiscTextArcSide,
  type DiscTextKey,
  type DiscTextLayoutSettings,
  type DiscTextMode,
  type DiscTextSettings,
  type DiscTextValues,
  type SteamLogoPlacement,
} from '../../discText'
import { getDiscTextLayoutPresetsForKey, type DiscTextLayoutPreset } from '../../layoutPresets'

export type TextPanelProps = {
  discTextSettings: DiscTextSettings
  discTextLayout: DiscTextLayoutSettings
  discTextValues: DiscTextValues
  manualGameTitle: string
  handleDiscTextToggle: (key: DiscTextKey, checked: boolean) => void
  handleDiscTextContentChange: (key: DiscTextKey, value: string) => void
  handleDiscTextLayoutChange: (
    key: DiscTextKey,
    field: 'x' | 'y' | 'width' | 'scale' | 'arcDegrees',
    value: number,
  ) => void
  handleDiscTextAlignmentChange: (key: DiscTextKey, align: DiscTextAlignment) => void
  handleDiscTextModeChange: (key: DiscTextKey, mode: DiscTextMode) => void
  handleDiscTextArcSideChange: (key: DiscTextKey, arcSide: DiscTextArcSide) => void
  handleResetDiscTextLayout: (key: DiscTextKey) => void
  steamLogoPlacement: SteamLogoPlacement
}

export function TextPanel({
  discTextSettings,
  discTextLayout,
  discTextValues,
  manualGameTitle,
  handleDiscTextToggle,
  handleDiscTextContentChange,
  handleDiscTextLayoutChange,
  handleDiscTextAlignmentChange,
  handleDiscTextModeChange,
  handleDiscTextArcSideChange,
  handleResetDiscTextLayout,
  steamLogoPlacement,
}: TextPanelProps) {
  const applyDiscTextPreset = (key: DiscTextKey, preset: DiscTextLayoutPreset) => {
    if (typeof preset.layout.x === 'number') handleDiscTextLayoutChange(key, 'x', preset.layout.x)
    if (typeof preset.layout.y === 'number') handleDiscTextLayoutChange(key, 'y', preset.layout.y)
    if (typeof preset.layout.width === 'number') handleDiscTextLayoutChange(key, 'width', preset.layout.width)
    if (typeof preset.layout.scale === 'number') handleDiscTextLayoutChange(key, 'scale', preset.layout.scale)
    if (typeof preset.layout.arcDegrees === 'number') handleDiscTextLayoutChange(key, 'arcDegrees', preset.layout.arcDegrees)
    if (preset.layout.align) handleDiscTextAlignmentChange(key, preset.layout.align)
    if (preset.layout.mode) handleDiscTextModeChange(key, preset.layout.mode)
    if (preset.layout.arcSide) handleDiscTextArcSideChange(key, preset.layout.arcSide)
  }

  return (
    <details className="panel collapsible-panel" open>
      <summary className="panel-summary">Text</summary>
      <div className="panel-content">
        <p className="hint">
          Enable text elements, edit their fallback values, and adjust their preset position and scale.
        </p>
        <p className="hint">
          Metadata-backed text uses the matching Game metadata field first. The value below is used when that metadata field is blank, while the game title still follows the label title field.
        </p>

        <div className="disc-text-control-list">
          {DISC_TEXT_KEYS.map((key) => {
            const layout = discTextLayout[key]
            const isTextEnabled = discTextSettings[key]
            const isCopyright = key === 'copyright'
            const isCurvedCopyright = isCurvedCopyrightDiscTextLayout(key, layout)
            const presets = getDiscTextLayoutPresetsForKey(key)

            return (
              <div className="disc-text-control" key={key}>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={isTextEnabled}
                    onChange={(event) => handleDiscTextToggle(key, event.target.checked)}
                  />
                  <span>{getDiscTextLabel(key)}</span>
                </label>

                {!isTextEnabled ? null : (
                  <>
                    <label className="field-label spacing-top" htmlFor={`disc-text-value-${key}`}>
                      Text value
                    </label>
                    <input
                      id={`disc-text-value-${key}`}
                      className="disc-text-input"
                      type="text"
                      value={getDiscTextInputValue(key, discTextValues, manualGameTitle)}
                      onChange={(event) => handleDiscTextContentChange(key, event.target.value)}
                    />

                    <div className="disc-text-layout-grid" aria-label={`${getDiscTextLabel(key)} placement controls`}>
                      {isCopyright && (
                        <label>
                          <span>Mode</span>
                          <select
                            value={layout.mode}
                            onChange={(event) =>
                              handleDiscTextModeChange(
                                key,
                                event.target.value as DiscTextMode,
                              )
                            }
                          >
                            <option value="straight">Straight</option>
                            <option value="curved">Curved</option>
                          </select>
                        </label>
                      )}

                      <label>
                        <span>Align</span>
                        <select
                          value={layout.align}
                          onChange={(event) =>
                            handleDiscTextAlignmentChange(
                              key,
                              event.target.value as DiscTextAlignment,
                            )
                          }
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </label>

                      {isCurvedCopyright && (
                        <label>
                          <span>Side</span>
                          <select
                            aria-label="Arc side"
                            value={layout.arcSide}
                            disabled={steamLogoPlacement !== 'none'}
                            onChange={(event) =>
                              handleDiscTextArcSideChange(
                                key,
                                event.target.value as DiscTextArcSide,
                              )
                            }
                          >
                            <option value="top">Top arc</option>
                            <option value="bottom">Bottom arc</option>
                          </select>
                        </label>
                      )}
                    </div>

                    {presets.length > 0 && (
                      <label className="field-label spacing-top" htmlFor={`disc-text-preset-${key}`}>
                        <span>Layout preset</span>
                        <select
                          id={`disc-text-preset-${key}`}
                          defaultValue=""
                          onChange={(event) => {
                            const preset = presets.find((candidate) => candidate.id === event.target.value)
                            if (preset) applyDiscTextPreset(key, preset)
                            event.currentTarget.value = ''
                          }}
                        >
                          <option value="">Choose preset...</option>
                          {presets.map((preset) => (
                            <option key={preset.id} value={preset.id}>{preset.label}</option>
                          ))}
                        </select>
                      </label>
                    )}

                    <div className="disc-text-layout-grid" aria-label={`${getDiscTextLabel(key)} fine tuning controls`}>
                      <label>
                        <span>Scale</span>
                        <input
                          type="range"
                          min="0.5"
                          max="1.8"
                          step="0.01"
                          value={layout.scale}
                          onChange={(event) =>
                            handleDiscTextLayoutChange(key, 'scale', Number(event.target.value))
                          }
                        />
                      </label>

                      {!isCurvedCopyright && (
                        <label>
                          <span>Width</span>
                          <input
                            type="range"
                            min={DISC_TEXT_WIDTH_MIN}
                            max={DISC_TEXT_WIDTH_MAX}
                            step="1"
                            value={layout.width}
                            onChange={(event) =>
                              handleDiscTextLayoutChange(key, 'width', Number(event.target.value))
                            }
                          />
                        </label>
                      )}

                      <label>
                        <span>{isCurvedCopyright ? 'Angle' : 'X'}</span>
                        <input
                          type="range"
                          min={isCurvedCopyright ? CURVED_COPYRIGHT_LAYOUT_X_MIN : -20}
                          max={isCurvedCopyright ? CURVED_COPYRIGHT_LAYOUT_X_MAX : 20}
                          step="0.1"
                          value={layout.x}
                          onChange={(event) =>
                            handleDiscTextLayoutChange(key, 'x', Number(event.target.value))
                          }
                        />
                      </label>

                      <label>
                        <span>{isCurvedCopyright ? 'Inset' : 'Y'}</span>
                        <input
                          type="range"
                          min={isCurvedCopyright ? CURVED_COPYRIGHT_LAYOUT_Y_MIN : 8}
                          max={isCurvedCopyright ? CURVED_COPYRIGHT_LAYOUT_Y_MAX : 92}
                          step="0.1"
                          value={layout.y}
                          onChange={(event) =>
                            handleDiscTextLayoutChange(key, 'y', Number(event.target.value))
                          }
                        />
                      </label>

                      {isCurvedCopyright && (
                        <label>
                          <span>Arc</span>
                          <input
                            type="range"
                            min="80"
                            max="320"
                            step="1"
                            value={layout.arcDegrees}
                            onChange={(event) =>
                              handleDiscTextLayoutChange(
                                key,
                                'arcDegrees',
                                Number(event.target.value),
                              )
                            }
                          />
                        </label>
                      )}
                    </div>

                    <button
                      className="secondary-button disc-text-reset-button"
                      type="button"
                      onClick={() => handleResetDiscTextLayout(key)}
                    >
                      Reset {getDiscTextLabel(key).toLowerCase()} layout
                    </button>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </details>
  )
}
