import {
  getDiscTextLabel,
  type DiscTextKey,
  type DiscTextMode,
} from '../../discText/index'
import {
  DISC_NUMBER_BADGE_SET_OPTIONS,
  type DiscNumberArtworkMode,
  type DiscNumberBadgeSet,
} from '../../discText/discNumberArtwork'
import {
  getDiscTextSidebarTargetCapability,
  shouldShowDiscTextSidebarControl,
} from '../../discText/sidebarControlPolicy'
import {
  getDiscTextInputState,
  isMetadataBoundDiscTextKey,
} from '../../project/metadataDiscText'
import type { ContextualTextControlId } from '../../text/contextualTextControlViewModel'
import type { TextPanelProps } from './textPanelTypes'

type DiscTextControlProps = TextPanelProps & {
  textKey: DiscTextKey
}

export function DiscTextControl({
  textKey: key,
  discTextSettings,
  discTextLayout,
  projectDiscNumberArtwork,
  discTextValues,
  selectedDiscTextKey,
  discTextValueSources,
  metadataBoundDiscTextValues,
  discTextTitleValue,
  resolvedDiscTextTitle,
  handleDiscTextToggle,
  handleDiscTextPreviewEditStart,
  handleUseMetadataDiscTextValue,
  handleDiscTextModeChange,
  handleDiscNumberArtworkModeChange,
  handleDiscNumberArtworkBadgeSetChange,
}: DiscTextControlProps) {
  const layout = discTextLayout[key]
  const isTextEnabled = discTextSettings[key]
  const isCopyright = key === 'copyright'
  const isSelectedForPreview = selectedDiscTextKey === key
  const sidebarTarget = getDiscTextSidebarTargetCapability(key, layout)
  const shouldShowSidebarControl = (controlId: ContextualTextControlId) =>
    shouldShowDiscTextSidebarControl({ controlId, key, layout })
  const showModeControl = isCopyright && shouldShowSidebarControl('mode')
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
    <div className="editor-text-control" data-smoke-id={`disc-sidebar-text-${key}`}>
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

              {showModeControl && (
                <div className="editor-style-grid">
                  <label>
                    <span>Mode</span>
                    <select
                      data-smoke-id={`disc-sidebar-mode-${key}`}
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

          {sidebarTarget.supportsContextualEditor ? (
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
        </div>
      )}
    </div>
  )
}
