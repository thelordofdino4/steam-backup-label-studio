import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDefaultCaseInsertTextStyle,
} from '../../caseInsert/textStyles.ts'
import type {
  CaseInsertPreviewTextTarget,
} from '../../caseInsert/previewTextSelection.ts'
import type {
  ProjectCaseInsertLayout,
} from '../../project/projectTypes.ts'
import {
  createCaseInsertInlineTextEditorControls,
  type CaseInsertPreviewTextControlHandlers,
} from './caseInsertInlineTextEditorControls.ts'

test('case insert contextual controls expose migrated text block properties', () => {
  const calls: string[] = []
  const target: CaseInsertPreviewTextTarget = {
    scope: 'templateTextBlock',
    paneId: 'cover',
    textBlockId: 'cover-title-text',
  }
  const layout: ProjectCaseInsertLayout = {
    scale: 1.12,
    width: 72,
    x: 35,
    y: 42,
    rotation: 0,
  }
  const style = {
    ...createDefaultCaseInsertTextStyle('title'),
    backgroundEnabled: true,
    backgroundColor: '#111111',
    backgroundOpacity: 0.5,
    backgroundPadding: 1.2,
    borderEnabled: true,
    borderColor: '#eeeeee',
    borderRadius: 0.75,
  }
  const handlers: CaseInsertPreviewTextControlHandlers = {
    onEnabledChange: (_target, enabled) => {
      calls.push(`enabled:${enabled}`)
    },
    onStyleChange: (_target, field, value) => {
      calls.push(`style:${field}:${String(value)}`)
    },
    onApplyStylePreset: (_target, presetId) => {
      calls.push(`preset:${presetId}`)
    },
    onResetStyle: () => {
      calls.push('reset-style')
    },
    onResetLayout: () => {
      calls.push('reset-layout')
    },
    onLayoutChange: (_target, field, value) => {
      calls.push(`layout:${field}:${value}`)
    },
    onAlignChange: (_target, align) => {
      calls.push(`align:${align}`)
    },
    onAvoidVisualElementsChange: (_target, avoidVisualElements) => {
      calls.push(`avoid:${avoidVisualElements}`)
    },
  }

  const controls = createCaseInsertInlineTextEditorControls({
    align: 'center',
    avoidVisualElements: true,
    handlers,
    label: 'Title',
    layout,
    style,
    target,
    onDeleteComplete: () => calls.push('delete-complete'),
    onResetLayout: () => handlers.onResetLayout(target),
  })

  assert.ok(controls.presets?.options.length)
  controls.presets?.onReset?.()
  controls.presets?.onApply('steam-archive')
  assert.equal(controls.text?.fontFamily?.value, style.fontFamily)
  assert.equal(controls.text?.size?.value, layout.scale)
  assert.equal(controls.text?.alignment?.value, 'center')
  assert.deepEqual(controls.text?.unsupported, ['Bold', 'Italic', 'Underline'])
  assert.equal(controls.art?.color?.value, style.color)
  assert.equal(controls.art?.contrast?.value, style.contrast)
  assert.equal(controls.art?.backgroundEnabled?.checked, true)
  assert.equal(controls.art?.backgroundColor?.value, '#111111')
  assert.equal(controls.art?.backgroundOpacity?.value, 0.5)
  assert.equal(controls.art?.backgroundPadding?.value, 1.2)
  assert.equal(controls.art?.borderEnabled?.checked, true)
  assert.equal(controls.art?.borderColor?.value, '#eeeeee')
  assert.equal(controls.art?.borderRadius?.value, 0.75)
  assert.equal(controls.utilities?.respectVisualElements?.checked, true)
  assert.equal(controls.utilities?.width?.value, layout.width)
  assert.equal(controls.utilities?.x?.value, layout.x)
  assert.equal(controls.utilities?.y?.value, layout.y)
  assert.equal(typeof controls.utilities?.resetLayout, 'function')
  assert.equal(controls.utilities?.markdownPlanned, true)
  assert.equal(controls.deleteAction?.label, 'Hide Title')

  controls.text?.alignment?.onChange('right')
  controls.art?.backgroundPadding?.onChange(1.8)
  controls.utilities?.width?.onChange(64)
  controls.utilities?.resetLayout?.()
  controls.deleteAction?.onDelete()

  assert.deepEqual(calls, [
    'reset-style',
    'preset:steam-archive',
    'align:right',
    'style:backgroundPadding:1.8',
    'layout:width:64',
    'reset-layout',
    'enabled:false',
    'delete-complete',
  ])
})
