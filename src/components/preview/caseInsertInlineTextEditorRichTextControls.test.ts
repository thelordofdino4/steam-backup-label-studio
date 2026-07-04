import assert from 'node:assert/strict'
import test from 'node:test'
import { createDefaultCaseInsertTextStyle } from '../../caseInsert/textStyles.ts'
import type { CaseInsertPreviewTextTarget } from '../../caseInsert/previewTextSelection.ts'
import type { ProjectCaseInsertLayout } from '../../project/projectTypes.ts'
import {
  createCaseInsertInlineTextEditorControls,
  type CaseInsertPreviewTextControlHandlers,
} from './caseInsertInlineTextEditorControls.ts'

test('case insert bulleted list control routes selection command through handlers', () => {
  const routedCalls: string[] = []
  const target: CaseInsertPreviewTextTarget = {
    scope: 'templateTextBlock',
    paneId: 'cover',
    textBlockId: 'cover-title-text',
  }
  const layout: ProjectCaseInsertLayout = {
    scale: 1,
    fontSizePt: 18,
    width: 80,
    x: 50,
    y: 50,
    rotation: 0,
  }
  const style = createDefaultCaseInsertTextStyle('title')
  const handlers: CaseInsertPreviewTextControlHandlers = {
    onEnabledChange: () => {},
    onStyleChange: () => {},
    onApplyStylePreset: () => {},
    onApplyLayoutPreset: () => {},
    onResetStyle: () => {},
    onResetLayout: () => {},
    onLayoutChange: () => {},
    onAlignChange: () => {},
    onAvoidVisualElementsChange: () => {},
    onContentModeChange: () => {},
    getRichTextCommandState: (_target, command, selection) => {
      routedCalls.push(
        `state:${command}:${selection.start}-${selection.end}`,
      )
      return command === 'bulletedList' ? 'mixed' : 'inactive'
    },
    onRichTextCommand: (_target, command, selection, value) => {
      routedCalls.push(
        `command:${command}:${String(value)}:${selection?.start}-${selection?.end}`,
      )
    },
  }
  const controls = createCaseInsertInlineTextEditorControls({
    align: 'left',
    avoidVisualElements: false,
    handlers,
    label: 'Title',
    layout,
    style,
    target,
  })
  const selection = { start: 0, end: 12 }

  assert.equal(
    controls.text?.bulletedList?.getSelectionState?.(selection),
    'mixed',
  )
  controls.text?.bulletedList?.onChange(true, selection)

  assert.deepEqual(routedCalls, [
    'state:bulletedList:0-12',
    'command:bulletedList:true:0-12',
  ])
})

test('case insert point-size control routes selected ranges through rich text command', () => {
  const routedCalls: string[] = []
  const target: CaseInsertPreviewTextTarget = {
    scope: 'templateTextBlock',
    paneId: 'cover',
    textBlockId: 'cover-title-text',
  }
  const layout: ProjectCaseInsertLayout = {
    scale: 1,
    fontSizePt: 18,
    width: 80,
    x: 50,
    y: 50,
    rotation: 0,
  }
  const style = createDefaultCaseInsertTextStyle('title')
  const handlers: CaseInsertPreviewTextControlHandlers = {
    onEnabledChange: () => {},
    onStyleChange: () => {},
    onApplyStylePreset: () => {},
    onApplyLayoutPreset: () => {},
    onResetStyle: () => {},
    onResetLayout: () => {},
    onLayoutChange: (_target, field, value) => {
      routedCalls.push(`layout:${field}:${value}`)
    },
    onAlignChange: () => {},
    onAvoidVisualElementsChange: () => {},
    onContentModeChange: () => {},
    getRichTextCommandState: (_target, command, selection) => {
      routedCalls.push(`state:${command}:${selection.start}-${selection.end}`)
      return command === 'fontSizePt'
        ? { state: 'mixed', value: 24 }
        : 'inactive'
    },
    onRichTextCommand: (_target, command, selection, value) => {
      routedCalls.push(
        `command:${command}:${String(value)}:${selection?.start}-${selection?.end}`,
      )
    },
  }
  const controls = createCaseInsertInlineTextEditorControls({
    align: 'left',
    avoidVisualElements: false,
    handlers,
    label: 'Title',
    layout,
    style,
    target,
  })
  const selection = { start: 0, end: 8 }

  assert.deepEqual(
    controls.text?.size && 'getSelectionValue' in controls.text.size
      ? controls.text.size.getSelectionValue?.(selection)
      : undefined,
    { state: 'mixed', value: 24 },
  )
  controls.text?.size?.onChange(36, selection)
  controls.text?.size?.onChange(20, { start: 4, end: 4 })

  assert.deepEqual(routedCalls, [
    'state:fontSizePt:0-8',
    'command:fontSizePt:36:0-8',
    'layout:fontSizePt:20',
  ])
})
