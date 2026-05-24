import {
  DISC_TEXT_KEYS,
  getDiscTextLabel,
  type DiscTextAlignment,
  type DiscTextArcSide,
  type DiscTextKey,
  type DiscTextLayoutSettings,
  type DiscTextMode,
  type DiscTextSettings,
  type SteamLogoPlacement,
} from '../../discText'

export type TextPanelProps = {
  discTextSettings: DiscTextSettings
  discTextLayout: DiscTextLayoutSettings
  getDiscTextInputValue: (key: DiscTextKey) => string
  handleDiscTextToggle: (key: DiscTextKey, checked: boolean) => void
  handleDiscTextContentChange: (key: DiscTextKey, value: string) => void
  handleDiscTextLayoutChange: (
    key: DiscTextKey,
    field: 'x' | 'y' | 'scale' | 'arcDegrees',
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
  getDiscTextInputValue,
  handleDiscTextToggle,
  handleDiscTextContentChange,
  handleDiscTextLayoutChange,
  handleDiscTextAlignmentChange,
  handleDiscTextModeChange,
  handleDiscTextArcSideChange,
  handleResetDiscTextLayout,
  steamLogoPlacement,
}: TextPanelProps) {
  return (
    <details className="panel collapsible-panel" open>
      <summary className="panel-summary">Text</summary>
      <div className="panel-content">
      <p className="hint">
        Enable text elements, edit their values, and adjust their preset position and scale.
      </p>

      <div className="disc-text-control-list">
        {DISC_TEXT_KEYS.map((key) => {
          const layout = discTextLayout[key]

          return (
            <div className="disc-text-control" key={key}>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={discTextSettings[key]}
                  onChange={(event) => handleDiscTextToggle(key, event.target.checked)}
                />
                <span>{getDiscTextLabel(key)}</span>
              </label>

              <input
                className="disc-text-input"
                type="text"
                value={getDiscTextInputValue(key)}
                disabled={!discTextSettings[key]}
                onChange={(event) => handleDiscTextContentChange(key, event.target.value)}
              />

              <div className="disc-text-layout-grid" aria-label={`${getDiscTextLabel(key)} layout controls`}>
                <label>
                  <span>Scale</span>
                  <input
                    type="range"
                    min="0.5"
                    max="1.8"
                    step="0.01"
                    value={layout.scale}
                    disabled={!discTextSettings[key]}
                    onChange={(event) =>
                      handleDiscTextLayoutChange(key, 'scale', Number(event.target.value))
                    }
                  />
                </label>

                <label>
                  <span>{key === 'copyright' && layout.mode === 'curved' ? 'Angle' : 'X'}</span>
                  <input
                    type="range"
                    min={key === 'copyright' && layout.mode === 'curved' ? '-60' : '-20'}
                    max={key === 'copyright' && layout.mode === 'curved' ? '60' : '20'}
                    step="0.1"
                    value={layout.x}
                    disabled={!discTextSettings[key]}
                    onChange={(event) =>
                      handleDiscTextLayoutChange(key, 'x', Number(event.target.value))
                    }
                  />
                </label>

                <label>
                  <span>{key === 'copyright' && layout.mode === 'curved' ? 'Inset' : 'Y'}</span>
                  <input
                    type="range"
                    min={key === 'copyright' && layout.mode === 'curved' ? '-8' : '8'}
                    max={key === 'copyright' && layout.mode === 'curved' ? '20' : '92'}
                    step="0.1"
                    value={layout.y}
                    disabled={!discTextSettings[key]}
                    onChange={(event) =>
                      handleDiscTextLayoutChange(key, 'y', Number(event.target.value))
                    }
                  />
                </label>

                <label>
                  <span>Align</span>
                  <select
                    value={key === 'copyright' && layout.mode === 'curved' ? 'center' : layout.align}
                    disabled={!discTextSettings[key] || (key === 'copyright' && layout.mode === 'curved')}
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

                                    {key === 'copyright' && (
                  <>
                    <label>
                      <span>Mode</span>
                      <select
                        value={layout.mode}
                        disabled={!discTextSettings[key]}
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

                    {layout.mode === 'curved' && (
                      <>
                        <label>
                          <span>Arc</span>
                          <input
                            type="range"
                            min="80"
                            max="320"
                            step="1"
                            value={layout.arcDegrees}
                            disabled={!discTextSettings[key]}
                            onChange={(event) =>
                              handleDiscTextLayoutChange(
                                key,
                                'arcDegrees',
                                Number(event.target.value),
                              )
                            }
                          />
                        </label>

                        <label>
                          <span>Side</span>
                          <select
                            aria-label="Arc side"
                            value={layout.arcSide}
                            disabled={
                              !discTextSettings[key] || steamLogoPlacement !== 'none'
                            }
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
                      </>
                    )}
                  </>
                )}
              </div>

              <button
                className="secondary-button disc-text-reset-button"
                type="button"
                disabled={!discTextSettings[key]}
                onClick={() => handleResetDiscTextLayout(key)}
              >
                Reset {getDiscTextLabel(key).toLowerCase()} position
              </button>
            </div>
          )
        })}
      </div>
      </div>
    </details>
  )
}
