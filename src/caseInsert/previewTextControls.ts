import type {
  ProjectCaseInsertLayout,
  ProjectCaseInsertTextAlign,
  ProjectJewelCaseState,
  ProjectMetadata,
} from '../project/projectTypes.ts'
import {
  getJewelCaseSpineSideScopedId,
  updateProjectJewelCaseSpineSides,
} from './jewelCaseTransitions.ts'
import type { CaseInsertPreviewTextTarget } from './previewTextSelection.ts'
import {
  updateCaseInsertTemplateTextBlock,
  updateCaseInsertTemplateTextList,
} from './templateSurfaceTransitions.ts'
import {
  applyCaseInsertTextBlockStylePreset,
  applyCaseInsertTextBlockPresetLayout,
  applyCaseInsertTextListPresetLayout,
  applyCaseInsertTextListStylePreset,
  resetCaseInsertTextBlockStyle,
  resetCaseInsertTextListStyle,
  setCaseInsertTextBlockAvoidVisualElements,
  setCaseInsertTextBlockEnabled,
  setCaseInsertTextListAvoidVisualElements,
  setCaseInsertTextListEnabled,
  updateCaseInsertTextBlockValue,
  updateCaseInsertTextBlockLayoutField,
  updateCaseInsertTextBlockContentMode,
  updateCaseInsertTextBlockStyleField,
  updateCaseInsertTextListContentMode,
  updateCaseInsertTextListStyleField,
} from './textTransitions.ts'
import {
  getCaseInsertPreviewTextEditValue,
  getCaseInsertPreviewTextListEditValue,
} from './previewTextEditing.ts'
import type {
  CaseInsertTextStyleField,
  CaseInsertTextStyleValue,
} from './textStyles.ts'
import {
  type TextContentMode,
} from '../text/htmlText.ts'
import {
  type PlainTextSelectionRange,
  type RichTextListKeyboardCommand,
} from '../text/richTextCommands.ts'
import {
  applyRichTextCommandToTextBlock,
  applyRichTextCommandToTextList,
  applyRichTextKeyboardCommandToTextBlock,
  applyRichTextKeyboardCommandToTextList,
  getRichTextCommandStateForTextBlock,
  getRichTextCommandStateForTextList,
  type CaseInsertPreviewRichTextCommand,
  type CaseInsertPreviewRichTextState,
} from './previewTextRichText.ts'

type CaseInsertLayoutField = keyof ProjectCaseInsertLayout
export type {
  CaseInsertPreviewRichTextCommand,
  CaseInsertPreviewRichTextState,
} from './previewTextRichText.ts'

function updateSpinePreviewTextBlock(
  caseInsert: ProjectJewelCaseState,
  target: Extract<CaseInsertPreviewTextTarget, { scope: 'spineTextBlock' }>,
  updater: (
    textBlock: ProjectJewelCaseState['spine']['left']['textBlocks'][number],
  ) => ProjectJewelCaseState['spine']['left']['textBlocks'][number],
) {
  return updateProjectJewelCaseSpineSides(
    caseInsert,
    target.side,
    (spineSide, side) => {
      const targetTextBlockId = getJewelCaseSpineSideScopedId(
        side,
        target.textBlockId,
      )

      return {
        ...spineSide,
        textBlocks: spineSide.textBlocks.map((textBlock) =>
          textBlock.id === targetTextBlockId
            ? updater(textBlock)
            : textBlock),
      }
    },
  )
}

type CaseInsertPreviewTextBlockTarget = Extract<
  CaseInsertPreviewTextTarget,
  { scope: 'templateTextBlock' | 'spineTitle' | 'spineTextBlock' }
>

type CaseInsertPreviewTextBlock =
  ProjectJewelCaseState['templates']['cover']['textBlocks'][number]

function updateCaseInsertPreviewTextBlockTarget(
  caseInsert: ProjectJewelCaseState,
  target: CaseInsertPreviewTextBlockTarget,
  updater: (textBlock: CaseInsertPreviewTextBlock) => CaseInsertPreviewTextBlock,
) {
  switch (target.scope) {
    case 'templateTextBlock':
      return updateCaseInsertTemplateTextBlock(
        caseInsert,
        target.paneId,
        target.textBlockId,
        updater,
      )
    case 'spineTitle':
      return updateProjectJewelCaseSpineSides(
        caseInsert,
        target.side,
        (spineSide) => ({
          ...spineSide,
          title: updater(spineSide.title),
        }),
      )
    case 'spineTextBlock':
      return updateSpinePreviewTextBlock(caseInsert, target, updater)
  }
}

function getCaseInsertPreviewTextBlockTarget(
  caseInsert: ProjectJewelCaseState,
  target: CaseInsertPreviewTextBlockTarget,
): CaseInsertPreviewTextBlock | undefined {
  switch (target.scope) {
    case 'templateTextBlock':
      return caseInsert.templates[target.paneId].textBlocks.find(
        (candidate) => candidate.id === target.textBlockId,
      )
    case 'spineTitle':
      return caseInsert.spine[target.side].title
    case 'spineTextBlock': {
      const targetTextBlockId = getJewelCaseSpineSideScopedId(
        target.side,
        target.textBlockId,
      )

      return caseInsert.spine[target.side].textBlocks.find(
        (candidate) => candidate.id === targetTextBlockId,
      )
    }
  }
}

export function setCaseInsertPreviewTextTargetEnabled(
  caseInsert: ProjectJewelCaseState,
  target: CaseInsertPreviewTextTarget,
  enabled: boolean,
) {
  switch (target.scope) {
    case 'templateTextList':
      return updateCaseInsertTemplateTextList(
        caseInsert,
        target.paneId,
        target.textListId,
        (textList) => setCaseInsertTextListEnabled(textList, enabled),
      )
    case 'templateTextBlock':
    case 'spineTitle':
    case 'spineTextBlock':
      return updateCaseInsertPreviewTextBlockTarget(
        caseInsert,
        target,
        (textBlock) => setCaseInsertTextBlockEnabled(textBlock, enabled),
      )
  }
}

export function restoreCaseInsertPreviewTextTargetMetadataValue(
  caseInsert: ProjectJewelCaseState,
  target: CaseInsertPreviewTextTarget,
) {
  switch (target.scope) {
    case 'templateTextList':
      return caseInsert
    case 'templateTextBlock':
    case 'spineTitle':
    case 'spineTextBlock':
      return updateCaseInsertPreviewTextBlockTarget(
        caseInsert,
        target,
        (textBlock) => updateCaseInsertTextBlockValue(
          textBlock,
          '',
          'metadata',
        ),
      )
  }
}

export function updateCaseInsertPreviewTextTargetStyleField(
  caseInsert: ProjectJewelCaseState,
  target: CaseInsertPreviewTextTarget,
  field: CaseInsertTextStyleField,
  value: CaseInsertTextStyleValue,
) {
  switch (target.scope) {
    case 'templateTextList':
      return updateCaseInsertTemplateTextList(
        caseInsert,
        target.paneId,
        target.textListId,
        (textList) =>
          updateCaseInsertTextListStyleField(textList, field, value),
      )
    case 'templateTextBlock':
    case 'spineTitle':
    case 'spineTextBlock':
      return updateCaseInsertPreviewTextBlockTarget(
        caseInsert,
        target,
        (textBlock) =>
          updateCaseInsertTextBlockStyleField(textBlock, field, value),
      )
  }
}

export function updateCaseInsertPreviewTextTargetRichTextCommand(
  caseInsert: ProjectJewelCaseState,
  target: CaseInsertPreviewTextTarget,
  command: CaseInsertPreviewRichTextCommand,
  selection: PlainTextSelectionRange | undefined,
  value: boolean | number | string,
  metadata?: ProjectMetadata,
) {
  let nextSelection: PlainTextSelectionRange | undefined

  switch (target.scope) {
    case 'templateTextList':
      return {
        caseInsert: updateCaseInsertTemplateTextList(
          caseInsert,
          target.paneId,
          target.textListId,
          (textList) => {
            const result = applyRichTextCommandToTextList(
              textList,
              command,
              selection,
              value,
            )
            nextSelection = result.selection
            return result.textList
          },
        ),
        selection: nextSelection,
      }
    case 'templateTextBlock':
    case 'spineTitle':
    case 'spineTextBlock':
      return {
        caseInsert: updateCaseInsertPreviewTextBlockTarget(
          caseInsert,
          target,
          (textBlock) => {
            const result = applyRichTextCommandToTextBlock(
              textBlock,
              command,
              selection,
              value,
              metadata,
            )
            nextSelection = result.selection
            return result.textBlock
          },
        ),
        selection: nextSelection,
      }
  }
}

export function updateCaseInsertPreviewTextTargetRichTextKeyboardCommand(
  caseInsert: ProjectJewelCaseState,
  target: CaseInsertPreviewTextTarget,
  command: RichTextListKeyboardCommand,
  selection: PlainTextSelectionRange,
  metadata?: ProjectMetadata,
) {
  let nextSelection: PlainTextSelectionRange | undefined

  switch (target.scope) {
    case 'templateTextList':
      return {
        caseInsert: updateCaseInsertTemplateTextList(
          caseInsert,
          target.paneId,
          target.textListId,
          (textList) => {
            const result = applyRichTextKeyboardCommandToTextList(
              textList,
              command,
              selection,
            )
            nextSelection = result.selection
            return result.textList
          },
        ),
        selection: nextSelection,
      }
    case 'templateTextBlock':
    case 'spineTitle':
    case 'spineTextBlock':
      return {
        caseInsert: updateCaseInsertPreviewTextBlockTarget(
          caseInsert,
          target,
          (textBlock) => {
            const result = applyRichTextKeyboardCommandToTextBlock(
              textBlock,
              command,
              selection,
              metadata,
            )
            nextSelection = result.selection
            return result.textBlock
          },
        ),
        selection: nextSelection,
      }
  }
}

export function getCaseInsertPreviewTextTargetRichTextCommandState(
  caseInsert: ProjectJewelCaseState,
  target: CaseInsertPreviewTextTarget,
  command: CaseInsertPreviewRichTextCommand,
  selection: PlainTextSelectionRange | undefined,
  metadata?: ProjectMetadata,
): CaseInsertPreviewRichTextState {
  switch (target.scope) {
    case 'templateTextList':
      {
        const textList = caseInsert.templates[target.paneId].textLists.find(
          (candidate) => candidate.id === target.textListId,
        )
        return textList
          ? getRichTextCommandStateForTextList(textList, command, selection)
          : 'inactive'
      }
    case 'templateTextBlock':
    case 'spineTitle':
    case 'spineTextBlock':
      {
        const textBlock = getCaseInsertPreviewTextBlockTarget(caseInsert, target)

        return textBlock
          ? getRichTextCommandStateForTextBlock(
              textBlock,
              command,
              selection,
              metadata,
            )
          : 'inactive'
      }
  }
}

export function updateCaseInsertPreviewTextTargetContentMode(
  caseInsert: ProjectJewelCaseState,
  target: CaseInsertPreviewTextTarget,
  contentMode: TextContentMode,
  metadata?: ProjectMetadata,
) {
  switch (target.scope) {
    case 'templateTextList':
      return updateCaseInsertTemplateTextList(
        caseInsert,
        target.paneId,
        target.textListId,
        (textList) =>
          updateCaseInsertTextListContentMode(
            textList,
            contentMode,
            getCaseInsertPreviewTextListEditValue(textList),
          ),
      )
    case 'templateTextBlock':
    case 'spineTitle':
    case 'spineTextBlock':
      return updateCaseInsertPreviewTextBlockTarget(
        caseInsert,
        target,
        (textBlock) =>
          updateCaseInsertTextBlockContentMode(
            textBlock,
            contentMode,
            getCaseInsertPreviewTextEditValue(textBlock, metadata),
          ),
      )
  }
}

export function applyCaseInsertPreviewTextTargetStylePreset(
  caseInsert: ProjectJewelCaseState,
  target: CaseInsertPreviewTextTarget,
  presetId: string,
) {
  switch (target.scope) {
    case 'templateTextList':
      return updateCaseInsertTemplateTextList(
        caseInsert,
        target.paneId,
        target.textListId,
        (textList) =>
          applyCaseInsertTextListStylePreset(textList, presetId),
      )
    case 'templateTextBlock':
    case 'spineTitle':
    case 'spineTextBlock':
      return updateCaseInsertPreviewTextBlockTarget(
        caseInsert,
        target,
        (textBlock) => applyCaseInsertTextBlockStylePreset(textBlock, presetId),
      )
  }
}

export function applyCaseInsertPreviewTextTargetLayoutPreset(
  caseInsert: ProjectJewelCaseState,
  target: CaseInsertPreviewTextTarget,
  presetId: string,
) {
  switch (target.scope) {
    case 'templateTextList':
      return updateCaseInsertTemplateTextList(
        caseInsert,
        target.paneId,
        target.textListId,
        (textList) =>
          applyCaseInsertTextListPresetLayout(
            target.paneId,
            textList,
            presetId,
          ),
      )
    case 'templateTextBlock':
      return updateCaseInsertPreviewTextBlockTarget(
        caseInsert,
        target,
        (textBlock) =>
          applyCaseInsertTextBlockPresetLayout(
            target.paneId,
            textBlock,
            presetId,
          ),
      )
    case 'spineTitle':
    case 'spineTextBlock':
      return updateCaseInsertPreviewTextBlockTarget(
        caseInsert,
        target,
        (textBlock) =>
          applyCaseInsertTextBlockPresetLayout('spine', textBlock, presetId),
      )
  }
}

export function resetCaseInsertPreviewTextTargetStyle(
  caseInsert: ProjectJewelCaseState,
  target: CaseInsertPreviewTextTarget,
) {
  switch (target.scope) {
    case 'templateTextList':
      return updateCaseInsertTemplateTextList(
        caseInsert,
        target.paneId,
        target.textListId,
        resetCaseInsertTextListStyle,
      )
    case 'templateTextBlock':
    case 'spineTitle':
    case 'spineTextBlock':
      return updateCaseInsertPreviewTextBlockTarget(
        caseInsert,
        target,
        resetCaseInsertTextBlockStyle,
      )
  }
}

export function updateCaseInsertPreviewTextTargetLayoutField(
  caseInsert: ProjectJewelCaseState,
  target: CaseInsertPreviewTextTarget,
  field: CaseInsertLayoutField,
  value: number,
) {
  switch (target.scope) {
    case 'templateTextList':
      return updateCaseInsertTemplateTextList(
        caseInsert,
        target.paneId,
        target.textListId,
        (textList) => ({
          ...textList,
          layout: {
            ...textList.layout,
            [field]: value,
          },
        }),
      )
    case 'templateTextBlock':
    case 'spineTitle':
    case 'spineTextBlock':
      return updateCaseInsertPreviewTextBlockTarget(
        caseInsert,
        target,
        (textBlock) =>
          updateCaseInsertTextBlockLayoutField(textBlock, field, value),
      )
  }
}

export function updateCaseInsertPreviewTextTargetAlign(
  caseInsert: ProjectJewelCaseState,
  target: CaseInsertPreviewTextTarget,
  align: ProjectCaseInsertTextAlign,
) {
  switch (target.scope) {
    case 'templateTextList':
      return caseInsert
    case 'templateTextBlock':
    case 'spineTitle':
    case 'spineTextBlock':
      return updateCaseInsertPreviewTextBlockTarget(
        caseInsert,
        target,
        (textBlock) => ({ ...textBlock, align }),
      )
  }
}

export function updateCaseInsertPreviewTextTargetAvoidVisualElements(
  caseInsert: ProjectJewelCaseState,
  target: CaseInsertPreviewTextTarget,
  avoidVisualElements: boolean,
) {
  switch (target.scope) {
    case 'templateTextList':
      return updateCaseInsertTemplateTextList(
        caseInsert,
        target.paneId,
        target.textListId,
        (textList) => setCaseInsertTextListAvoidVisualElements(
          textList,
          avoidVisualElements,
        ),
      )
    case 'templateTextBlock':
    case 'spineTitle':
    case 'spineTextBlock':
      return updateCaseInsertPreviewTextBlockTarget(
        caseInsert,
        target,
        (textBlock) => setCaseInsertTextBlockAvoidVisualElements(
          textBlock,
          avoidVisualElements,
        ),
      )
  }
}
