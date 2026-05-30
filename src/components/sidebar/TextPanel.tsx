import {
  CURVED_COPYRIGHT_LAYOUT_X_MAX,
  CURVED_COPYRIGHT_LAYOUT_X_MIN,
  CURVED_COPYRIGHT_LAYOUT_Y_MAX,
  CURVED_COPYRIGHT_LAYOUT_Y_MIN,
  DISC_TEXT_KEYS,
  DISC_TEXT_WIDTH_MAX,
  DISC_TEXT_WIDTH_MIN,
  getDiscTextLabel,
  getDiscTextContent,
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
import {
  DISC_TEXT_CONTRAST_OPTIONS,
  DISC_TEXT_FONT_OPTIONS,
  DISC_TEXT_STYLE_PRESETS,
  type DiscTextContrastMode,
  type DiscTextFontFamily,
  type DiscTextStyleField,
  type DiscTextStyleSettings,
  type DiscTextStyleValue,
} from '../../discTextStyles'
import {
  DISC_NUMBER_BADGE_SET_OPTIONS,
  type DiscNumberArtworkMode,
  type DiscNumberBadgeSet,
} from '../../discNumberArtwork'
import { getStraightDiscTextLayoutSliderRanges } from '../../layout/discElementSafeZone'
import { getDiscTextLayoutPresetsForKey, type DiscTextLayoutPreset } from '../../layoutPresets'
import {
  getDiscTextInputState,
  isMetadataBoundDiscTextKey,
  type DiscTextValueSources,
  type MetadataBoundDiscTextKey,
} from '../../project/metadataDiscText'
import type { DiscTemplate } from '../../types/template'
import type { ProjectDiscNumberArtwork } from '../../project/projectTypes'

export type TextPanelProps = {
  discTextSettings: DiscTextSettings
  discTextLayout: DiscTextLayoutSettings
  discTextStyles: DiscTextStyleSettings
  projectDiscNumberArtwork: ProjectDiscNumberArtwork
  discTextValues: DiscTextValues
  discTextValueSources: DiscTextValueSources
  metadataBoundDiscTextValues: DiscTextValues
  discTextTitleValue: string
  resolvedDiscTextTitle: string
  selectedDiscTemplate: DiscTemplate
  handleDiscTextToggle: (key: DiscTextKey, checked: boolean) => void
  handleDiscTextContentChange: (key: DiscTextKey, value: string) => void
  handleUseMetadataDiscTextValue: (key: MetadataBoundDiscTextKey) => void
  handleDiscTextLayoutChange: (
    key: DiscTextKey,
    field: 'x' | 'y' | 'width' | 'scale' | 'arcDegrees',
    value: number,
  ) => void
  handleDiscTextAlignmentChange: (key: DiscTextKey, align: DiscTextAlignment) => void
  handleDiscTextModeChange: (key: DiscTextKey, mode: DiscTextMode) => void
  handleDiscTextArcSideChange: (key: DiscTextKey, arcSide: DiscTextArcSide) => void
  handleDiscTextVisualAvoidanceChange: (
    key: DiscTextKey,
    avoidVisualElements: boolean,
  ) => void
  handleResetDiscTextLayout: (key: DiscTextKey) => void
  handleDiscTextStyleChange: (
    key: DiscTextKey,
    field: DiscTextStyleField,
    value: DiscTextStyleValue,
  ) => void
  handleApplyDiscTextStylePreset: (key: DiscTextKey, presetId: string) => void
  handleDiscNumberArtworkModeChange: (mode: DiscNumberArtworkMode) => void
  handleDiscNumberArtworkBadgeSetChange: (badgeSet: DiscNumberBadgeSet) => void
  handleResetDiscTextStyle: (key: DiscTextKey) => void
  steamLogoPlacement: SteamLogoPlacement
}

export function TextPanel({
  discTextSettings,
  discTextLayout,
  discTextStyles,
  projectDiscNumberArtwork,
  discTextValues,
  discTextValueSources,
  metadataBoundDiscTextValues,
  discTextTitleValue,
  resolvedDiscTextTitle,
  selectedDiscTemplate,
  handleDiscTextToggle,
  handleDiscTextContentChange,
  handleUseMetadataDiscTextValue,
  handleDiscTextLayoutChange,
  handleDiscTextAlignmentChange,
  handleDiscTextModeChange,
  handleDiscTextArcSideChange,
  handleDiscTextVisualAvoidanceChange,
  handleResetDiscTextLayout,
  handleDiscTextStyleChange,
  handleApplyDiscTextStylePreset,
  handleDiscNumberArtworkModeChange,
  handleDiscNumberArtworkBadgeSetChange,
  handleResetDiscTextStyle,
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
    <details className="panel collapsible-panel">
      <summary className="panel-summary">Text</summary>
      <div className="panel-content">
        <p className="hint">
          Enable text elements, type manual overrides, and adjust their preset position and scale.
        </p>
        <p className="hint">
          Metadata-backed text shows the Game metadata/default as placeholder text until edited here. Clearing the override returns to the placeholder value.
        </p>

        <div className="disc-text-control-list">
          {DISC_TEXT_KEYS.map((key) => {
            const layout = discTextLayout[key]
            const textStyle = discTextStyles[key]
            const isTextEnabled = discTextSettings[key]
            const isCopyright = key === 'copyright'
            const isCurvedCopyright = isCurvedCopyrightDiscTextLayout(key, layout)
            const presets = getDiscTextLayoutPresetsForKey(key)
            const inputState = getDiscTextInputState(
              key,
              discTextValues,
              metadataBoundDiscTextValues,
              discTextValueSources,
              discTextTitleValue,
              resolvedDiscTextTitle,
            )
            const renderedText = getDiscTextContent(
              key,
              metadataBoundDiscTextValues,
              resolvedDiscTextTitle,
            )
            const straightSliderRanges = getStraightDiscTextLayoutSliderRanges(
              key,
              renderedText,
              layout,
              selectedDiscTemplate,
            )

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
                      value={inputState.value}
                      placeholder={inputState.placeholder}
                      onChange={(event) => handleDiscTextContentChange(key, event.target.value)}
                    />
                    {inputState.isMetadataBacked && (
                      <div className="disc-text-source-row">
                        <span>
                          {inputState.isManualOverride
                            ? 'Manual override'
                            : 'Using Game metadata/default'}
                        </span>
                        {inputState.isManualOverride && (
                          <button
                            className="secondary-button disc-text-source-button"
                            type="button"
                            onClick={() => {
                              if (isMetadataBoundDiscTextKey(key)) {
                                handleUseMetadataDiscTextValue(key)
                              }
                            }}
                          >
                            Use Game metadata value
                          </button>
                        )}
                      </div>
                    )}

                    {key === 'discNumber' && (
                      <div className="disc-number-artwork-controls">
                        <label className="field-label" htmlFor="disc-number-artwork-mode">
                          Display
                        </label>
                        <select
                          id="disc-number-artwork-mode"
                          value={projectDiscNumberArtwork.mode}
                          onChange={(event) =>
                            handleDiscNumberArtworkModeChange(
                              event.target.value as DiscNumberArtworkMode,
                            )}
                        >
                          <option value="text">Plain text</option>
                          <option value="badge">Graphic badge</option>
                        </select>

                        {projectDiscNumberArtwork.mode === 'badge' ? (
                          <>
                            <label className="field-label spacing-top" htmlFor="disc-number-badge-set">
                              Badge set
                            </label>
                            <select
                              id="disc-number-badge-set"
                              value={projectDiscNumberArtwork.badgeSet}
                              onChange={(event) =>
                                handleDiscNumberArtworkBadgeSetChange(
                                  event.target.value as DiscNumberBadgeSet,
                                )}
                            >
                              {DISC_NUMBER_BADGE_SET_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                            <p className="hint">
                              Uses the current disc number value and placement with a bundled generic badge.
                            </p>
                          </>
                        ) : null}
                      </div>
                    )}

                    <div className="disc-text-style-grid" aria-label={`${getDiscTextLabel(key)} style controls`}>
                      <label>
                        <span>Style preset</span>
                        <select
                          defaultValue=""
                          onChange={(event) => {
                            if (event.target.value) {
                              handleApplyDiscTextStylePreset(key, event.target.value)
                            }
                            event.currentTarget.value = ''
                          }}
                        >
                          <option value="">Choose preset...</option>
                          {DISC_TEXT_STYLE_PRESETS.map((preset) => (
                            <option key={preset.id} value={preset.id}>{preset.label}</option>
                          ))}
                        </select>
                      </label>

                      <label>
                        <span>Font</span>
                        <select
                          value={textStyle.fontFamily}
                          onChange={(event) =>
                            handleDiscTextStyleChange(
                              key,
                              'fontFamily',
                              event.target.value as DiscTextFontFamily,
                            )
                          }
                        >
                          {DISC_TEXT_FONT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </label>

                      <label>
                        <span>Color</span>
                        <input
                          type="color"
                          value={textStyle.color}
                          onChange={(event) =>
                            handleDiscTextStyleChange(key, 'color', event.target.value)
                          }
                        />
                      </label>

                      <label>
                        <span>Contrast</span>
                        <select
                          value={textStyle.contrast}
                          onChange={(event) =>
                            handleDiscTextStyleChange(
                              key,
                              'contrast',
                              event.target.value as DiscTextContrastMode,
                            )
                          }
                        >
                          {DISC_TEXT_CONTRAST_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </label>
                    </div>

                    {!isCurvedCopyright && (
                      <div className="disc-text-box-style">
                        <label className="checkbox-row">
                          <input
                            type="checkbox"
                            checked={textStyle.backgroundEnabled}
                            onChange={(event) =>
                              handleDiscTextStyleChange(
                                key,
                                'backgroundEnabled',
                                event.target.checked,
                              )
                            }
                          />
                          <span>Block background</span>
                        </label>

                        {textStyle.backgroundEnabled && (
                          <div className="disc-text-style-grid">
                            <label>
                              <span>Fill</span>
                              <input
                                type="color"
                                value={textStyle.backgroundColor}
                                onChange={(event) =>
                                  handleDiscTextStyleChange(
                                    key,
                                    'backgroundColor',
                                    event.target.value,
                                  )
                                }
                              />
                            </label>

                            <label>
                              <span>Opacity</span>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={textStyle.backgroundOpacity}
                                onChange={(event) =>
                                  handleDiscTextStyleChange(
                                    key,
                                    'backgroundOpacity',
                                    Number(event.target.value),
                                  )
                                }
                              />
                            </label>

                            <label>
                              <span>Padding</span>
                              <input
                                type="range"
                                min="0"
                                max="4"
                                step="0.1"
                                value={textStyle.backgroundPadding}
                                onChange={(event) =>
                                  handleDiscTextStyleChange(
                                    key,
                                    'backgroundPadding',
                                    Number(event.target.value),
                                  )
                                }
                              />
                            </label>

                            <label className="disc-text-style-checkbox">
                              <span>Border</span>
                              <input
                                type="checkbox"
                                checked={textStyle.borderEnabled}
                                onChange={(event) =>
                                  handleDiscTextStyleChange(
                                    key,
                                    'borderEnabled',
                                    event.target.checked,
                                  )
                                }
                              />
                            </label>

                            {textStyle.borderEnabled && (
                              <>
                                <label>
                                  <span>Line</span>
                                  <input
                                    type="color"
                                    value={textStyle.borderColor}
                                    onChange={(event) =>
                                      handleDiscTextStyleChange(
                                        key,
                                        'borderColor',
                                        event.target.value,
                                      )
                                    }
                                  />
                                </label>

                                <label>
                                  <span>Radius</span>
                                  <input
                                    type="range"
                                    min="0"
                                    max="4"
                                    step="0.1"
                                    value={textStyle.borderRadius}
                                    onChange={(event) =>
                                      handleDiscTextStyleChange(
                                        key,
                                        'borderRadius',
                                        Number(event.target.value),
                                      )
                                    }
                                  />
                                </label>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}

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

                    {!isCurvedCopyright && (
                      <label className="checkbox-row spacing-top">
                        <input
                          type="checkbox"
                          checked={layout.avoidVisualElements}
                          onChange={(event) =>
                            handleDiscTextVisualAvoidanceChange(
                              key,
                              event.target.checked,
                            )
                          }
                        />
                        <span>Respect visual elements</span>
                      </label>
                    )}

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
                          min={isCurvedCopyright ? CURVED_COPYRIGHT_LAYOUT_X_MIN : straightSliderRanges.x.min}
                          max={isCurvedCopyright ? CURVED_COPYRIGHT_LAYOUT_X_MAX : straightSliderRanges.x.max}
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
                          min={isCurvedCopyright ? CURVED_COPYRIGHT_LAYOUT_Y_MIN : straightSliderRanges.y.min}
                          max={isCurvedCopyright ? CURVED_COPYRIGHT_LAYOUT_Y_MAX : straightSliderRanges.y.max}
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

                    <button
                      className="secondary-button disc-text-reset-button"
                      type="button"
                      onClick={() => handleResetDiscTextStyle(key)}
                    >
                      Reset {getDiscTextLabel(key).toLowerCase()} style
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
