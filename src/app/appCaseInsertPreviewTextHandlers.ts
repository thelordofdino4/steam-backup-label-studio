import type { Dispatch, SetStateAction } from 'react'
import {
  finalizeCaseInsertPreviewTextDraft,
  updateCaseInsertPreviewTextDraftValue,
} from '../caseInsert/previewTextEditing.ts'
import type {
  CaseInsertPreviewTextTarget,
} from '../caseInsert/previewTextSelection.ts'
import {
  applyCaseInsertPreviewTextTargetLayoutPreset,
  applyCaseInsertPreviewTextTargetStylePreset,
  resetCaseInsertPreviewTextTargetStyle,
  restoreCaseInsertPreviewTextTargetMetadataValue,
  setCaseInsertPreviewTextTargetEnabled,
  updateCaseInsertPreviewTextTargetAlign,
  updateCaseInsertPreviewTextTargetAvoidVisualElements,
  updateCaseInsertPreviewTextTargetContentMode,
  getCaseInsertPreviewTextTargetRichTextCommandState,
  updateCaseInsertPreviewTextTargetRichTextCommand,
  updateCaseInsertPreviewTextTargetRichTextKeyboardCommand,
  updateCaseInsertPreviewTextTargetLayoutField,
  updateCaseInsertPreviewTextTargetStyleField,
} from '../caseInsert/previewTextControls.ts'
import type {
  CaseInsertTextStyleField,
  CaseInsertTextStyleValue,
} from '../caseInsert/textStyles.ts'
import type {
  ProjectCaseInsertLayout,
  ProjectCaseInsertTextAlign,
  ProjectJewelCaseState,
  ProjectMetadata,
} from '../project/projectTypes.ts'
import type { TextContentMode } from '../text/htmlText.ts'

type TextSelectionRange = { end: number; start: number }
type TemplateTextBlockTarget = Extract<
  CaseInsertPreviewTextTarget,
  { scope: 'templateTextBlock' }
>
type SpineTitleTarget = Extract<
  CaseInsertPreviewTextTarget,
  { scope: 'spineTitle' }
>

type SetProjectJewelCase = Dispatch<SetStateAction<ProjectJewelCaseState>>

export type CreateCaseInsertPreviewTextHandlersParams = {
  projectJewelCase: ProjectJewelCaseState
  projectMetadata: ProjectMetadata
  setProjectJewelCase: SetProjectJewelCase
  setSelectedCaseInsertTextTarget: (
    target: CaseInsertPreviewTextTarget | null,
  ) => void
  resetSpineTitleLayout: (side: SpineTitleTarget['side']) => void
  resetTemplateTextBlockLayout: (
    paneId: TemplateTextBlockTarget['paneId'],
    textBlockId: TemplateTextBlockTarget['textBlockId'],
  ) => void
}

export function createCaseInsertPreviewTextHandlers({
  projectJewelCase,
  projectMetadata,
  setProjectJewelCase,
  setSelectedCaseInsertTextTarget,
  resetSpineTitleLayout,
  resetTemplateTextBlockLayout,
}: CreateCaseInsertPreviewTextHandlersParams) {
  function handleCaseInsertPreviewTextValueChange(
    target: CaseInsertPreviewTextTarget,
    value: string,
    options?: { sourceMode?: boolean },
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      updateCaseInsertPreviewTextDraftValue(
        currentCaseInsert,
        target,
        value,
        options,
      ))
  }

  function handleCaseInsertPreviewTextEditComplete(
    target: CaseInsertPreviewTextTarget,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      finalizeCaseInsertPreviewTextDraft(
        currentCaseInsert,
        target,
        projectMetadata,
      ))
    setSelectedCaseInsertTextTarget(null)
  }

  function handleCaseInsertPreviewTextEnabledChange(
    target: CaseInsertPreviewTextTarget,
    enabled: boolean,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      setCaseInsertPreviewTextTargetEnabled(
        currentCaseInsert,
        target,
        enabled,
      ))
    if (!enabled) {
      setSelectedCaseInsertTextTarget(null)
    }
  }

  function handleCaseInsertPreviewTextStyleChange(
    target: CaseInsertPreviewTextTarget,
    field: CaseInsertTextStyleField,
    value: CaseInsertTextStyleValue,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      updateCaseInsertPreviewTextTargetStyleField(
        currentCaseInsert,
        target,
        field,
        value,
      ))
  }

  function handleCaseInsertPreviewTextRichTextCommand(
    target: CaseInsertPreviewTextTarget,
    command: 'bold' | 'italic' | 'underline' | 'color' | 'bulletedList' | 'fontSizePt',
    selection: TextSelectionRange | undefined,
    value: boolean | number | string,
  ) {
    const result =
      updateCaseInsertPreviewTextTargetRichTextCommand(
        projectJewelCase,
        target,
        command,
        selection,
        value,
        projectMetadata,
      )

    setProjectJewelCase(result.caseInsert)
    return result.selection
  }

  function handleCaseInsertPreviewTextRichTextKeyboardCommand(
    target: CaseInsertPreviewTextTarget,
    command: 'enter' | 'shiftEnter' | 'backspace',
    selection: TextSelectionRange,
  ) {
    const result =
      updateCaseInsertPreviewTextTargetRichTextKeyboardCommand(
        projectJewelCase,
        target,
        command,
        selection,
        projectMetadata,
      )

    setProjectJewelCase(result.caseInsert)
    return result.selection ?? null
  }

  function getCaseInsertPreviewTextRichTextCommandState(
    target: CaseInsertPreviewTextTarget,
    command: 'bold' | 'italic' | 'underline' | 'color' | 'bulletedList' | 'fontSizePt',
    selection: TextSelectionRange,
  ) {
    return getCaseInsertPreviewTextTargetRichTextCommandState(
      projectJewelCase,
      target,
      command,
      selection,
      projectMetadata,
    )
  }

  function handleCaseInsertPreviewTextApplyStylePreset(
    target: CaseInsertPreviewTextTarget,
    presetId: string,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      applyCaseInsertPreviewTextTargetStylePreset(
        currentCaseInsert,
        target,
        presetId,
      ))
  }

  function handleCaseInsertPreviewTextApplyLayoutPreset(
    target: CaseInsertPreviewTextTarget,
    presetId: string,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      applyCaseInsertPreviewTextTargetLayoutPreset(
        currentCaseInsert,
        target,
        presetId,
      ))
  }

  function handleCaseInsertPreviewTextResetStyle(
    target: CaseInsertPreviewTextTarget,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      resetCaseInsertPreviewTextTargetStyle(currentCaseInsert, target))
  }

  function handleCaseInsertPreviewTextLayoutChange(
    target: CaseInsertPreviewTextTarget,
    field: keyof ProjectCaseInsertLayout,
    value: number,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      updateCaseInsertPreviewTextTargetLayoutField(
        currentCaseInsert,
        target,
        field,
        value,
      ))
  }

  function handleCaseInsertPreviewTextResetLayout(
    target: CaseInsertPreviewTextTarget,
  ) {
    if (target.scope === 'spineTitle') {
      resetSpineTitleLayout(target.side)
      return
    }

    if (target.scope !== 'templateTextBlock') {
      return
    }

    resetTemplateTextBlockLayout(target.paneId, target.textBlockId)
  }

  function handleCaseInsertPreviewTextAlignChange(
    target: CaseInsertPreviewTextTarget,
    align: ProjectCaseInsertTextAlign,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      updateCaseInsertPreviewTextTargetAlign(currentCaseInsert, target, align))
  }

  function handleCaseInsertPreviewTextAvoidVisualElementsChange(
    target: CaseInsertPreviewTextTarget,
    avoidVisualElements: boolean,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      updateCaseInsertPreviewTextTargetAvoidVisualElements(
        currentCaseInsert,
        target,
        avoidVisualElements,
      ))
  }

  function handleCaseInsertPreviewTextContentModeChange(
    target: CaseInsertPreviewTextTarget,
    contentMode: TextContentMode,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      updateCaseInsertPreviewTextTargetContentMode(
        currentCaseInsert,
        target,
        contentMode,
        projectMetadata,
      ))
  }

  function handleCaseInsertPreviewTextUseMetadataValue(
    target: CaseInsertPreviewTextTarget,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      restoreCaseInsertPreviewTextTargetMetadataValue(
        currentCaseInsert,
        target,
      ))
  }

  return {
    getCaseInsertPreviewTextRichTextCommandState,
    handleCaseInsertPreviewTextAlignChange,
    handleCaseInsertPreviewTextApplyLayoutPreset,
    handleCaseInsertPreviewTextApplyStylePreset,
    handleCaseInsertPreviewTextAvoidVisualElementsChange,
    handleCaseInsertPreviewTextContentModeChange,
    handleCaseInsertPreviewTextEditComplete,
    handleCaseInsertPreviewTextEnabledChange,
    handleCaseInsertPreviewTextLayoutChange,
    handleCaseInsertPreviewTextResetLayout,
    handleCaseInsertPreviewTextResetStyle,
    handleCaseInsertPreviewTextRichTextCommand,
    handleCaseInsertPreviewTextRichTextKeyboardCommand,
    handleCaseInsertPreviewTextStyleChange,
    handleCaseInsertPreviewTextUseMetadataValue,
    handleCaseInsertPreviewTextValueChange,
  }
}
