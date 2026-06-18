import {
  CURVED_COPYRIGHT_LAYOUT_X_MAX,
  CURVED_COPYRIGHT_LAYOUT_X_MIN,
  CURVED_COPYRIGHT_LAYOUT_Y_MAX,
  CURVED_COPYRIGHT_LAYOUT_Y_MIN,
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
  selectedDiscTextKey,
  discTextValueSources,
  metadataBoundDiscTextValues,
  discTextTitleValue,
  resolvedDiscTextTitle,
  handleDiscTextToggle,
  handleDiscTextPreviewEditStart,
  handleDiscTextContentChange,
  handleUseMetadataDiscTextValue,
  handleDiscTextLayoutChange,
  handleDiscTextAlignmentChange,
  handleDiscTextModeChange,
  handleDiscTextArcSideChange,
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
  const isSelectedForPreview = selectedDiscTextKey === key
  const shouldShowSidebarTextValue = isCurvedCopyright
  const presets = getDiscTextLayoutPresetsForKey(key)
  const inputState = getDiscTextInputState(
    key,
    discTextValues,
    metadataBoundDiscTextValues,
    discTextValueSources,
    discTextTitleValue,
    resolvedDiscTextTitle,
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

          {key === 'discNumber' || isCopyright ? (
            <div
              className="editor-control-group"
              aria-label={`${controlLabel} type controls`}
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

              {isCopyright && (
                <div className="editor-style-grid">
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
                </div>
              )}
            </div>
          ) : null}

          {!isCurvedCopyright ? (
            <div
              className="editor-control-group"
              aria-label={`${controlLabel} preview edit controls`}
            >
              <p className="hint">
                Select this text in the preview to edit style and placement.
              </p>
              <button
                className="secondary-button"
                type="button"
                aria-pressed={isSelectedForPreview}
                onClick={() => handleDiscTextPreviewEditStart(key)}
              >
                {isSelectedForPreview ? 'Editing in preview' : 'Edit in preview'}
              </button>
            </div>
          ) : null}

          {shouldShowSidebarTextValue ? (
            <div
              className="editor-control-group"
              aria-label={`${controlLabel} curved text controls`}
            >
              <label className="field-label" htmlFor={`disc-text-value-${key}`}>
                Curved text value
              </label>
              <input
                id={`disc-text-value-${key}`}
                className="editor-text-input"
                type="text"
                value={inputState.value}
                placeholder={inputState.placeholder}
                onChange={(event) => handleDiscTextContentChange(key, event.target.value)}
              />
              <p className="hint">
                Curved-text exception: this remains SVG/textPath based and uses this value field until curved inline editing is added.
              </p>
            </div>
          ) : null}

          {isCurvedCopyright ? (
            <>
              <div
                className="editor-control-group"
                aria-label={`${controlLabel} curved style controls`}
              >
                <div className="editor-style-grid">
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

                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={textStyle.bold}
                      onChange={(event) =>
                        handleDiscTextStyleChange(key, 'bold', event.target.checked)
                      }
                    />
                    <span>Bold</span>
                  </label>

                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={textStyle.italic}
                      onChange={(event) =>
                        handleDiscTextStyleChange(key, 'italic', event.target.checked)
                      }
                    />
                    <span>Italic</span>
                  </label>

                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={textStyle.underline}
                      onChange={(event) =>
                        handleDiscTextStyleChange(key, 'underline', event.target.checked)
                      }
                    />
                    <span>Underline</span>
                  </label>
                </div>
              </div>

              <div
                className="editor-control-group"
                aria-label={`${controlLabel} curved placement controls`}
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
                aria-label={`${controlLabel} curved fine tuning controls`}
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

                  <EditorRangeField
                    id={`disc-text-${key}-x`}
                    label="Angle"
                    min={CURVED_COPYRIGHT_LAYOUT_X_MIN}
                    max={CURVED_COPYRIGHT_LAYOUT_X_MAX}
                    step={0.1}
                    value={layout.x}
                    onChange={(value) =>
                      handleDiscTextLayoutChange(key, 'x', value)}
                  />

                  <EditorRangeField
                    id={`disc-text-${key}-y`}
                    label="Inset"
                    min={CURVED_COPYRIGHT_LAYOUT_Y_MIN}
                    max={CURVED_COPYRIGHT_LAYOUT_Y_MAX}
                    step={0.1}
                    value={layout.y}
                    onChange={(value) =>
                      handleDiscTextLayoutChange(key, 'y', value)}
                  />

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
                </div>
              </div>

              <div
                className="editor-control-group editor-action-group"
                aria-label={`${controlLabel} curved reset actions`}
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
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}
