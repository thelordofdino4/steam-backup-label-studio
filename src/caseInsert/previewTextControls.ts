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
import type { TextContentMode } from '../text/htmlText.ts'

type CaseInsertLayoutField = keyof ProjectCaseInsertLayout

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

export function setCaseInsertPreviewTextTargetEnabled(
  caseInsert: ProjectJewelCaseState,
  target: CaseInsertPreviewTextTarget,
  enabled: boolean,
) {
  switch (target.scope) {
    case 'templateTextBlock':
      return updateCaseInsertTemplateTextBlock(
        caseInsert,
        target.paneId,
        target.textBlockId,
        (textBlock) => setCaseInsertTextBlockEnabled(textBlock, enabled),
      )
    case 'templateTextList':
      return updateCaseInsertTemplateTextList(
        caseInsert,
        target.paneId,
        target.textListId,
        (textList) => setCaseInsertTextListEnabled(textList, enabled),
      )
    case 'spineTitle':
      return updateProjectJewelCaseSpineSides(
        caseInsert,
        target.side,
        (spineSide) => ({
          ...spineSide,
          title: setCaseInsertTextBlockEnabled(spineSide.title, enabled),
        }),
      )
    case 'spineTextBlock':
      return updateSpinePreviewTextBlock(
        caseInsert,
        target,
        (textBlock) => setCaseInsertTextBlockEnabled(textBlock, enabled),
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
    case 'templateTextBlock':
      return updateCaseInsertTemplateTextBlock(
        caseInsert,
        target.paneId,
        target.textBlockId,
        (textBlock) =>
          updateCaseInsertTextBlockStyleField(textBlock, field, value),
      )
    case 'templateTextList':
      return updateCaseInsertTemplateTextList(
        caseInsert,
        target.paneId,
        target.textListId,
        (textList) =>
          updateCaseInsertTextListStyleField(textList, field, value),
      )
    case 'spineTitle':
      return updateProjectJewelCaseSpineSides(
        caseInsert,
        target.side,
        (spineSide) => ({
          ...spineSide,
          title: updateCaseInsertTextBlockStyleField(
            spineSide.title,
            field,
            value,
          ),
        }),
      )
    case 'spineTextBlock':
      return updateSpinePreviewTextBlock(
        caseInsert,
        target,
        (textBlock) =>
          updateCaseInsertTextBlockStyleField(textBlock, field, value),
      )
  }
}

export function updateCaseInsertPreviewTextTargetContentMode(
  caseInsert: ProjectJewelCaseState,
  target: CaseInsertPreviewTextTarget,
  contentMode: TextContentMode,
  metadata?: ProjectMetadata,
) {
  switch (target.scope) {
    case 'templateTextBlock':
      return updateCaseInsertTemplateTextBlock(
        caseInsert,
        target.paneId,
        target.textBlockId,
        (textBlock) =>
          updateCaseInsertTextBlockContentMode(
            textBlock,
            contentMode,
            getCaseInsertPreviewTextEditValue(textBlock, metadata),
          ),
      )
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
    case 'spineTitle':
      return updateProjectJewelCaseSpineSides(
        caseInsert,
        target.side,
        (spineSide) => ({
          ...spineSide,
          title: updateCaseInsertTextBlockContentMode(
            spineSide.title,
            contentMode,
            getCaseInsertPreviewTextEditValue(spineSide.title, metadata),
          ),
        }),
      )
    case 'spineTextBlock':
      return updateSpinePreviewTextBlock(
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
    case 'templateTextBlock':
      return updateCaseInsertTemplateTextBlock(
        caseInsert,
        target.paneId,
        target.textBlockId,
        (textBlock) =>
          applyCaseInsertTextBlockStylePreset(textBlock, presetId),
      )
    case 'templateTextList':
      return updateCaseInsertTemplateTextList(
        caseInsert,
        target.paneId,
        target.textListId,
        (textList) =>
          applyCaseInsertTextListStylePreset(textList, presetId),
      )
    case 'spineTitle':
      return updateProjectJewelCaseSpineSides(
        caseInsert,
        target.side,
        (spineSide) => ({
          ...spineSide,
          title: applyCaseInsertTextBlockStylePreset(
            spineSide.title,
            presetId,
          ),
        }),
      )
    case 'spineTextBlock':
      return updateSpinePreviewTextBlock(
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
    case 'templateTextBlock':
      return updateCaseInsertTemplateTextBlock(
        caseInsert,
        target.paneId,
        target.textBlockId,
        (textBlock) =>
          applyCaseInsertTextBlockPresetLayout(
            target.paneId,
            textBlock,
            presetId,
          ),
      )
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
    case 'spineTitle':
      return updateProjectJewelCaseSpineSides(
        caseInsert,
        target.side,
        (spineSide) => ({
          ...spineSide,
          title: applyCaseInsertTextBlockPresetLayout(
            'spine',
            spineSide.title,
            presetId,
          ),
        }),
      )
    case 'spineTextBlock':
      return updateSpinePreviewTextBlock(
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
    case 'templateTextBlock':
      return updateCaseInsertTemplateTextBlock(
        caseInsert,
        target.paneId,
        target.textBlockId,
        resetCaseInsertTextBlockStyle,
      )
    case 'templateTextList':
      return updateCaseInsertTemplateTextList(
        caseInsert,
        target.paneId,
        target.textListId,
        resetCaseInsertTextListStyle,
      )
    case 'spineTitle':
      return updateProjectJewelCaseSpineSides(
        caseInsert,
        target.side,
        (spineSide) => ({
          ...spineSide,
          title: resetCaseInsertTextBlockStyle(spineSide.title),
        }),
      )
    case 'spineTextBlock':
      return updateSpinePreviewTextBlock(
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
    case 'templateTextBlock':
      return updateCaseInsertTemplateTextBlock(
        caseInsert,
        target.paneId,
        target.textBlockId,
        (textBlock) =>
          updateCaseInsertTextBlockLayoutField(textBlock, field, value),
      )
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
    case 'spineTitle':
      return updateProjectJewelCaseSpineSides(
        caseInsert,
        target.side,
        (spineSide) => ({
          ...spineSide,
          title: updateCaseInsertTextBlockLayoutField(
            spineSide.title,
            field,
            value,
          ),
        }),
      )
    case 'spineTextBlock':
      return updateSpinePreviewTextBlock(
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
    case 'templateTextBlock':
      return updateCaseInsertTemplateTextBlock(
        caseInsert,
        target.paneId,
        target.textBlockId,
        (textBlock) => ({ ...textBlock, align }),
      )
    case 'spineTitle':
      return updateProjectJewelCaseSpineSides(
        caseInsert,
        target.side,
        (spineSide) => ({
          ...spineSide,
          title: { ...spineSide.title, align },
        }),
      )
    case 'spineTextBlock':
      return updateSpinePreviewTextBlock(
        caseInsert,
        target,
        (textBlock) => ({ ...textBlock, align }),
      )
    case 'templateTextList':
      return caseInsert
  }
}

export function updateCaseInsertPreviewTextTargetAvoidVisualElements(
  caseInsert: ProjectJewelCaseState,
  target: CaseInsertPreviewTextTarget,
  avoidVisualElements: boolean,
) {
  switch (target.scope) {
    case 'templateTextBlock':
      return updateCaseInsertTemplateTextBlock(
        caseInsert,
        target.paneId,
        target.textBlockId,
        (textBlock) => setCaseInsertTextBlockAvoidVisualElements(
          textBlock,
          avoidVisualElements,
        ),
      )
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
    case 'spineTitle':
      return updateProjectJewelCaseSpineSides(
        caseInsert,
        target.side,
        (spineSide) => ({
          ...spineSide,
          title: setCaseInsertTextBlockAvoidVisualElements(
            spineSide.title,
            avoidVisualElements,
          ),
        }),
      )
    case 'spineTextBlock':
      return updateSpinePreviewTextBlock(
        caseInsert,
        target,
        (textBlock) => setCaseInsertTextBlockAvoidVisualElements(
          textBlock,
          avoidVisualElements,
        ),
      )
  }
}
