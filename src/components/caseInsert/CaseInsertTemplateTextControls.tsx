import type { CaseInsertTemplatePaneId } from '../../caseInsert/templateSurfaces'
import {
  shouldShowCaseInsertTextSidebarControl,
} from '../../caseInsert/sidebarControlPolicy'
import {
  getCaseInsertTextBlockPriority,
  isCaseInsertAdditionalTextBlock,
  isCaseInsertBackRoleTextBlock,
  isCaseInsertFeatureBulletsTextList,
  isCaseInsertLegalTextBlock,
} from '../../caseInsert/textContent'
import {
  getCaseInsertTextBlockLayoutPresets,
  getCaseInsertTextListLayoutPresets,
} from '../../caseInsert/textLayout'
import type { CaseInsertTemplateEditorActions } from '../../hooks/useCaseInsertTemplateEditor'
import type {
  ProjectCaseInsertTextBlock,
  ProjectCaseInsertTextList,
} from '../../project/projectTypes'
import type {
  CaseInsertPreviewTextTarget,
} from '../../caseInsert/previewTextSelection'
import { PlusIcon } from '../sidebar/PanelIcons'
import type {
  CaseInsertTemplateControlsProps,
} from './CaseInsertTemplateControls.types'

function getTextBlockControlPriority(textBlock: ProjectCaseInsertTextBlock) {
  return getCaseInsertTextBlockPriority(textBlock)
}

function sortTextBlocksForControls(textBlocks: ProjectCaseInsertTextBlock[]) {
  return [...textBlocks].sort(
    (left, right) =>
      getTextBlockControlPriority(left) - getTextBlockControlPriority(right),
  )
}

type CaseInsertTemplateTextControlsProps = CaseInsertTemplateControlsProps & {
  includeTextLists?: boolean
  textBlockFilter?: (textBlock: ProjectCaseInsertTextBlock) => boolean
  textListFilter?: (textList: ProjectCaseInsertTextList) => boolean
}

function TextLayoutPresetControl({
  id,
  presets,
  onApplyPreset,
}: {
  id: string
  presets: ReturnType<typeof getCaseInsertTextBlockLayoutPresets>
  onApplyPreset: (presetId: string) => void
}) {
  return (
    <label>
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

function TextBlockControls({
  paneId,
  textBlock,
  actions,
  onSelectedTextTargetChange,
}: {
  paneId: CaseInsertTemplatePaneId
  textBlock: ProjectCaseInsertTextBlock
  actions: CaseInsertTemplateEditorActions
  onSelectedTextTargetChange: (
    target: CaseInsertPreviewTextTarget | null,
  ) => void
}) {
  const layoutPresets = shouldShowCaseInsertTextSidebarControl('layoutPreset')
    ? getCaseInsertTextBlockLayoutPresets(paneId, textBlock)
    : []

  return (
    <div
      className="editor-text-control"
      data-smoke-id={`case-sidebar-text-block-${paneId}-${textBlock.id}`}
    >
      <label className="checkbox-row editor-text-enable-row">
        <input
          type="checkbox"
          checked={textBlock.enabled}
          onChange={(event) =>
            actions.handleTextBlockEnabledChange(
              paneId,
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
              data-smoke-id={`case-sidebar-edit-text-block-${paneId}-${textBlock.id}`}
              type="button"
              onClick={() =>
                onSelectedTextTargetChange({
                  scope: 'templateTextBlock',
                  paneId,
                  textBlockId: textBlock.id,
                })}
            >
              Edit in preview
            </button>
          </div>

          {layoutPresets.length > 0 ? (
            <div
              className="editor-control-group"
              aria-label={`${textBlock.label} layout preset controls`}
            >
              <TextLayoutPresetControl
                id={`${textBlock.id}-placement`}
                presets={layoutPresets}
                onApplyPreset={(presetId) =>
                  actions.handleApplyTextBlockLayoutPreset(
                    paneId,
                    textBlock.id,
                    presetId,
                  )}
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

function TextListControls({
  paneId,
  textList,
  actions,
  onSelectedTextTargetChange,
}: {
  paneId: CaseInsertTemplatePaneId
  textList: ProjectCaseInsertTextList
  actions: CaseInsertTemplateEditorActions
  onSelectedTextTargetChange: (
    target: CaseInsertPreviewTextTarget | null,
  ) => void
}) {
  const layoutPresets = shouldShowCaseInsertTextSidebarControl('layoutPreset')
    ? getCaseInsertTextListLayoutPresets(paneId)
    : []

  return (
    <div
      className="editor-text-control"
      data-smoke-id={`case-sidebar-text-list-${paneId}-${textList.id}`}
    >
      <label className="checkbox-row editor-text-enable-row">
        <input
          type="checkbox"
          checked={textList.enabled}
          onChange={(event) =>
            actions.handleTextListEnabledChange(
              paneId,
              textList.id,
              event.target.checked,
            )}
        />
        <span>{textList.label}</span>
      </label>

      {!textList.enabled ? null : (
        <div className="editor-text-control-body">
          <div
            className="editor-control-group"
            aria-label={`${textList.label} text controls`}
          >
            <p className="hint">
              Select this list in the preview to edit style and placement.
            </p>
            {textList.items.length === 0 ? (
              <p className="hint">No list items yet.</p>
            ) : null}
            <button
              className="secondary-button"
              data-smoke-id={`case-sidebar-edit-text-list-${paneId}-${textList.id}`}
              type="button"
              disabled={textList.items.length === 0}
              onClick={() =>
                onSelectedTextTargetChange({
                  scope: 'templateTextList',
                  paneId,
                  textListId: textList.id,
                })}
            >
              Edit in preview
            </button>
            <button
              className="secondary-button icon-text-button spacing-top"
              type="button"
              onClick={() => actions.handleAddTextListItem(paneId, textList.id)}
            >
              <PlusIcon />
              <span>Add item</span>
            </button>
          </div>

          {layoutPresets.length > 0 ? (
            <div
              className="editor-control-group"
              aria-label={`${textList.label} layout preset controls`}
            >
              <TextLayoutPresetControl
                id={`${textList.id}-placement`}
                presets={layoutPresets}
                onApplyPreset={(presetId) =>
                  actions.handleApplyTextListLayoutPreset(
                    paneId,
                    textList.id,
                    presetId,
                  )}
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

export function CaseInsertTemplateTextControls({
  paneId,
  templateState,
  actions,
  onSelectedTextTargetChange,
  includeTextLists = true,
  textBlockFilter = (textBlock) =>
    !isCaseInsertLegalTextBlock(textBlock) &&
    !isCaseInsertBackRoleTextBlock(textBlock) &&
    !isCaseInsertAdditionalTextBlock(textBlock),
  textListFilter = (textList) => !isCaseInsertFeatureBulletsTextList(textList),
}: CaseInsertTemplateTextControlsProps) {
  const textBlocks = sortTextBlocksForControls(
    templateState.textBlocks.filter(textBlockFilter),
  )
  const leadingTextBlocks = paneId === 'tray'
    ? textBlocks.filter((textBlock) =>
        getTextBlockControlPriority(textBlock) <= 90)
    : textBlocks
  const trailingTextBlocks = paneId === 'tray'
    ? textBlocks.filter((textBlock) =>
        getTextBlockControlPriority(textBlock) > 90)
    : []

  return (
    <div className="editor-text-control-list">
      {leadingTextBlocks.map((textBlock) => (
        <TextBlockControls
          key={textBlock.id}
          paneId={paneId}
          textBlock={textBlock}
          actions={actions}
          onSelectedTextTargetChange={onSelectedTextTargetChange}
        />
      ))}
      {includeTextLists
        ? templateState.textLists.filter(textListFilter).map((textList) => (
          <TextListControls
            key={textList.id}
            paneId={paneId}
            textList={textList}
            actions={actions}
            onSelectedTextTargetChange={onSelectedTextTargetChange}
          />
        ))
        : null}
      {trailingTextBlocks.map((textBlock) => (
        <TextBlockControls
          key={textBlock.id}
          paneId={paneId}
          textBlock={textBlock}
          actions={actions}
          onSelectedTextTargetChange={onSelectedTextTargetChange}
        />
      ))}
    </div>
  )
}
