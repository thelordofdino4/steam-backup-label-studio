import {
  CURVED_COPYRIGHT_LAYOUT_X_MAX,
  CURVED_COPYRIGHT_LAYOUT_X_MIN,
  CURVED_COPYRIGHT_LAYOUT_Y_MAX,
  CURVED_COPYRIGHT_LAYOUT_Y_MIN,
  DISC_TEXT_WIDTH_MAX,
  DISC_TEXT_WIDTH_MIN,
  getDiscTextContent,
  getDiscTextLabel,
  isCurvedCopyrightDiscTextLayout,
  type DiscTextAlignment,
  type DiscTextArcSide,
  type DiscTextKey,
  type DiscTextMode,
} from '../../discText/index'
import {
  DISC_TEXT_CONTRAST_OPTIONS,
  DISC_TEXT_FONT_OPTIONS,
  DISC_TEXT_STYLE_PRESETS,
  type DiscTextContrastMode,
  type DiscTextFontFamily,
} from '../../discText/styles'
import {
  DISC_NUMBER_BADGE_SET_OPTIONS,
  type DiscNumberArtworkMode,
  type DiscNumberBadgeSet,
} from '../../discText/discNumberArtwork'
import { getStraightDiscTextLayoutSliderRanges } from '../../layout/discElementSafeZone'
import {
  getDiscTextLayoutPresetsForKey,
  type DiscTextLayoutPreset,
} from '../../layout/presets'
import {
  getDiscTextInputState,
  isMetadataBoundDiscTextKey,
} from '../../project/metadataDiscText'
import { EditorRangeField } from '../editor/EditorRangeField'
import type { TextPanelProps } from './textPanelTypes'

type DiscTextControlProps = TextPanelProps & {
  textKey: DiscTextKey
  applyDiscTextPreset: (key: DiscTextKey, preset: DiscTextLayoutPreset) => void
}

export function DiscTextControl({
  textKey: key,
  applyDiscTextPreset,
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
}: DiscTextControlProps) {
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
  const controlLabel = getDiscTextLabel(key)

  return (
    <div className="editor-text-control">
      <label className="checkbox-row editor-text-enable-row">
        <input
          type="checkbox"
          checked={isTextEnabled}
          onChange={(event) => handleDiscTextToggle(key, event.target.checked)}
        />
        <span>{controlLabel}</span>
      </label>

      {!isTextEnabled ? null : (
        <div className="editor-text-control-body">
          {!isCurvedCopyright && (
            <div
              className="editor-control-group editor-optional-checkboxes"
              aria-label={`${controlLabel} optional controls`}
            >
              <label className="checkbox-row">
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
                <label className="checkbox-row editor-nested-checkbox">
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
                  <span>Border</span>
                </label>
              )}
            </div>
          )}

          {inputState.isMetadataBacked && (
            <div
              className="editor-control-group"
              aria-label={`${controlLabel} source controls`}
            >
              <div className="editor-source-row">
                <span>
                  {inputState.isManualOverride
                    ? 'Manual override'
                    : 'Using Game metadata/default'}
                </span>
                {inputState.isManualOverride && (
                  <button
                    className="secondary-button editor-source-button"
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
            </div>
          )}

          <div
            className="editor-control-group"
            aria-label={`${controlLabel} type and style controls`}
          >
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
                      Uses the current disc number value and placement with the built-in badge.
                    </p>
                  </>
                ) : null}
              </div>
            )}

            <div className="editor-style-grid">
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

              {!isCurvedCopyright && textStyle.backgroundEnabled && (
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
              )}

              {!isCurvedCopyright && textStyle.backgroundEnabled && textStyle.borderEnabled && (
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
              )}
            </div>
          </div>

          <div
            className="editor-control-group"
            aria-label={`${controlLabel} text controls`}
          >
            <label className="field-label" htmlFor={`disc-text-value-${key}`}>
              Text value
            </label>
            <input
              id={`disc-text-value-${key}`}
              className="editor-text-input"
              type="text"
              value={inputState.value}
              placeholder={inputState.placeholder}
              onChange={(event) => handleDiscTextContentChange(key, event.target.value)}
            />
          </div>

          <div
            className="editor-control-group"
            aria-label={`${controlLabel} placement controls`}
          >
            <div className="editor-control-grid">
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
          </div>

          <div
            className="editor-control-group"
            aria-label={`${controlLabel} fine tuning controls`}
          >
            <div className="editor-control-grid">
              <EditorRangeField
                id={`disc-text-${key}-scale`}
                label="Scale"
                min={0.5}
                max={1.8}
                step={0.01}
                value={layout.scale}
                onChange={(value) =>
                  handleDiscTextLayoutChange(key, 'scale', value)}
              />

              {!isCurvedCopyright && (
                <EditorRangeField
                  id={`disc-text-${key}-width`}
                  label="Width"
                  min={DISC_TEXT_WIDTH_MIN}
                  max={DISC_TEXT_WIDTH_MAX}
                  step={1}
                  value={layout.width}
                  onChange={(value) =>
                    handleDiscTextLayoutChange(key, 'width', value)}
                />
              )}

              <EditorRangeField
                id={`disc-text-${key}-x`}
                label={isCurvedCopyright ? 'Angle' : 'X'}
                min={isCurvedCopyright ? CURVED_COPYRIGHT_LAYOUT_X_MIN : straightSliderRanges.x.min}
                max={isCurvedCopyright ? CURVED_COPYRIGHT_LAYOUT_X_MAX : straightSliderRanges.x.max}
                step={0.1}
                value={layout.x}
                onChange={(value) =>
                  handleDiscTextLayoutChange(key, 'x', value)}
              />

              <EditorRangeField
                id={`disc-text-${key}-y`}
                label={isCurvedCopyright ? 'Inset' : 'Y'}
                min={isCurvedCopyright ? CURVED_COPYRIGHT_LAYOUT_Y_MIN : straightSliderRanges.y.min}
                max={isCurvedCopyright ? CURVED_COPYRIGHT_LAYOUT_Y_MAX : straightSliderRanges.y.max}
                step={0.1}
                value={layout.y}
                onChange={(value) =>
                  handleDiscTextLayoutChange(key, 'y', value)}
              />

              {isCurvedCopyright && (
                <EditorRangeField
                  id={`disc-text-${key}-arc`}
                  label="Arc"
                  min={80}
                  max={320}
                  step={1}
                  value={layout.arcDegrees}
                  onChange={(value) =>
                    handleDiscTextLayoutChange(key, 'arcDegrees', value)}
                />
              )}

              {!isCurvedCopyright && textStyle.backgroundEnabled && (
                <>
                  <EditorRangeField
                    id={`disc-text-${key}-background-opacity`}
                    label="Opacity"
                    min={0}
                    max={1}
                    step={0.05}
                    value={textStyle.backgroundOpacity}
                    onChange={(value) =>
                      handleDiscTextStyleChange(key, 'backgroundOpacity', value)}
                  />

                  <EditorRangeField
                    id={`disc-text-${key}-background-padding`}
                    label="Padding"
                    min={0}
                    max={4}
                    step={0.1}
                    value={textStyle.backgroundPadding}
                    onChange={(value) =>
                      handleDiscTextStyleChange(key, 'backgroundPadding', value)}
                  />
                </>
              )}

              {!isCurvedCopyright && textStyle.backgroundEnabled && textStyle.borderEnabled && (
                <EditorRangeField
                  id={`disc-text-${key}-border-radius`}
                  label="Radius"
                  min={0}
                  max={4}
                  step={0.1}
                  value={textStyle.borderRadius}
                  onChange={(value) =>
                    handleDiscTextStyleChange(key, 'borderRadius', value)}
                />
              )}
            </div>
          </div>

          <div
            className="editor-control-group editor-action-group"
            aria-label={`${controlLabel} reset actions`}
          >
            <button
              className="secondary-button editor-text-reset-button"
              type="button"
              onClick={() => handleResetDiscTextLayout(key)}
            >
              Reset {controlLabel.toLowerCase()} layout
            </button>

            <button
              className="secondary-button editor-text-reset-button"
              type="button"
              onClick={() => handleResetDiscTextStyle(key)}
            >
              Reset {controlLabel.toLowerCase()} style
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
