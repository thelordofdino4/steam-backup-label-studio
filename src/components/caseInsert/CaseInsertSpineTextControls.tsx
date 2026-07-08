import type { JewelCaseSpineSide } from '../../caseInsert/types'
import {
  getCaseInsertTextBlockPriority,
  isCaseInsertAdditionalTextBlock,
  isCaseInsertLegalTextBlock,
} from '../../caseInsert/textContent'
import {
  getCaseInsertTextBlockLayoutPresets,
} from '../../caseInsert/textLayout'
import {
  shouldShowCaseInsertTextSidebarControl,
} from '../../caseInsert/sidebarControlPolicy'
import type { ProjectCaseInsertTextBlock } from '../../project/projectTypes'
import type { CaseInsertPreviewTextTarget } from '../../caseInsert/previewTextSelection'
import type { JewelCaseSpineEditorActions } from '../../hooks/useJewelCaseSpineEditor'
import {
  CaseInsertSpineControlSections,
} from './CaseInsertSpineControlSections'
import type {
  CaseInsertSpineControlsProps,
} from './CaseInsertSpineControls.types'

const TITLE_ORIENTATION_OPTIONS = [
  { value: -90, label: 'Read up' },
  { value: 90, label: 'Read down' },
] as const

function getTitleOrientationValue(textBlock: ProjectCaseInsertTextBlock) {
  return textBlock.layout.rotation === 90 ? 90 : -90
}

function sortSpineTextBlocksForControls(
  textBlocks: ProjectCaseInsertTextBlock[],
) {
  return [...textBlocks].sort(
    (left, right) =>
      getCaseInsertTextBlockPriority(left) - getCaseInsertTextBlockPriority(right),
  )
}

type CaseInsertSpineTextControlsProps = CaseInsertSpineControlsProps & {
  includeTitle?: boolean
  textBlockFilter?: (textBlock: ProjectCaseInsertTextBlock) => boolean
}

function SpineTextLayoutPresetControl({
  id,
  presets,
  onApplyPreset,
}: {
  id: string
  presets: ReturnType<typeof getCaseInsertTextBlockLayoutPresets>
  onApplyPreset: (presetId: string) => void
}) {
  return (
    <label htmlFor={id}>
      <span>Layout preset</span>
      <select
        id={id}
        defaultValue=""
        onChange={(event) => {
          if (event.target.value) onApplyPreset(event.target.value)
          event.currentTarget.value = ''
        }}
      >
        <option value="">Choose preset...</option>
        {presets.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function CaseInsertSpineTitleTextControl({
  side,
  title,
  actions,
  onSelectedTextTargetChange,
}: {
  side: JewelCaseSpineSide
  title: ProjectCaseInsertTextBlock
  actions: JewelCaseSpineEditorActions
  onSelectedTextTargetChange: (
    target: CaseInsertPreviewTextTarget | null,
  ) => void
}) {
  const layoutPresets = shouldShowCaseInsertTextSidebarControl('layoutPreset')
    ? getCaseInsertTextBlockLayoutPresets('spine', title)
    : []

  return (
    <div
      className="editor-text-control"
      data-smoke-id={`case-sidebar-spine-title-${side}`}
    >
      <label className="checkbox-row editor-text-enable-row">
        <input
          type="checkbox"
          checked={title.enabled}
          onChange={(event) =>
            actions.handleSpineTitleEnabledChange(side, event.target.checked)}
        />
        <span>Game title</span>
      </label>

      {!title.enabled ? null : (
        <div className="editor-text-control-body">
          <div
            className="editor-control-group"
            aria-label={`${title.label} text controls`}
          >
            <p className="hint">
              Select this text in the preview to edit style and placement.
            </p>
            <button
              className="secondary-button"
              data-smoke-id={`case-sidebar-edit-spine-title-${side}`}
              type="button"
              onClick={() =>
                onSelectedTextTargetChange({
                  scope: 'spineTitle',
                  side,
                })}
            >
              Edit in preview
            </button>
          </div>

          <div
            className="editor-control-group"
            aria-label={`${title.label} placement controls`}
          >
            <div className="editor-control-grid">
              <label htmlFor={`${side}-spine-title-orientation`}>
                <span>Orientation</span>
                <select
                  id={`${side}-spine-title-orientation`}
                  value={getTitleOrientationValue(title)}
                  onChange={(event) =>
                    actions.handleSpineTitleOrientationChange(
                      side,
                      Number(event.target.value),
                    )}
                >
                  {TITLE_ORIENTATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              {layoutPresets.length > 0 ? (
                <SpineTextLayoutPresetControl
                  id={`${side}-spine-title-layout-preset`}
                  presets={layoutPresets}
                  onApplyPreset={(presetId) =>
                    actions.handleApplySpineTitleLayoutPreset(side, presetId)}
                />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SpineTextBlockControls({
  side,
  textBlock,
  actions,
  onSelectedTextTargetChange,
}: {
  side: JewelCaseSpineSide
  textBlock: ProjectCaseInsertTextBlock
  actions: JewelCaseSpineEditorActions
  onSelectedTextTargetChange: (
    target: CaseInsertPreviewTextTarget | null,
  ) => void
}) {
  const layoutPresets = shouldShowCaseInsertTextSidebarControl('layoutPreset')
    ? getCaseInsertTextBlockLayoutPresets('spine', textBlock)
    : []

  return (
    <div
      className="editor-text-control"
      data-smoke-id={`case-sidebar-spine-text-block-${side}-${textBlock.id}`}
    >
      <label className="checkbox-row editor-text-enable-row">
        <input
          type="checkbox"
          checked={textBlock.enabled}
          onChange={(event) =>
            actions.handleSpineTextBlockEnabledChange(
              side,
              textBlock.id,
              event.target.checked,
            )}
        />
        <span>{textBlock.label}</span>
      </label>

      {!textBlock.enabled ? null : (
        <div className="editor-text-control-body">
          <div
            className="editor-control-group"
            aria-label={`${textBlock.label} text controls`}
          >
            <p className="hint">
              Select this text in the preview to edit style and placement.
            </p>
            <button
              className="secondary-button"
              data-smoke-id={`case-sidebar-edit-spine-text-block-${side}-${textBlock.id}`}
              type="button"
              onClick={() =>
                onSelectedTextTargetChange({
                  scope: 'spineTextBlock',
                  side,
                  textBlockId: textBlock.id,
                })}
            >
              Edit in preview
            </button>
          </div>

          <div
            className="editor-control-group"
            aria-label={`${textBlock.label} placement controls`}
          >
            <div className="editor-control-grid">
              <label htmlFor={`${textBlock.id}-orientation`}>
                <span>Orientation</span>
                <select
                  id={`${textBlock.id}-orientation`}
                  value={getTitleOrientationValue(textBlock)}
                  onChange={(event) =>
                    actions.handleSpineTextBlockOrientationChange(
                      side,
                      textBlock.id,
                      Number(event.target.value),
                    )}
                >
                  {TITLE_ORIENTATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              {layoutPresets.length > 0 ? (
                <SpineTextLayoutPresetControl
                  id={`${textBlock.id}-layout-preset`}
                  presets={layoutPresets}
                  onApplyPreset={(presetId) =>
                    actions.handleApplySpineTextBlockLayoutPreset(
                      side,
                      textBlock.id,
                      presetId,
                    )}
                />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function CaseInsertSpineTextControls({
  spine,
  actions,
  onSelectedTextTargetChange,
  includeTitle = true,
  textBlockFilter = (textBlock) =>
    !isCaseInsertLegalTextBlock(textBlock) &&
    !isCaseInsertAdditionalTextBlock(textBlock),
}: CaseInsertSpineTextControlsProps) {
  return (
    <CaseInsertSpineControlSections
      spine={spine}
      renderControls={({ side }) => {
        const state = spine[side]

        return (
          <>
          {includeTitle ? (
            <CaseInsertSpineTitleTextControl
              side={side}
              title={state.title}
              actions={actions}
              onSelectedTextTargetChange={onSelectedTextTargetChange}
            />
          ) : null}
          {sortSpineTextBlocksForControls(
            state.textBlocks.filter(textBlockFilter),
          ).map((textBlock) => (
            <SpineTextBlockControls
              key={textBlock.id}
              side={side}
              textBlock={textBlock}
              actions={actions}
              onSelectedTextTargetChange={onSelectedTextTargetChange}
            />
          ))}
          </>
        )
      }}
    />
  )
}
