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

test('case insert contextual controls expose migrated text list properties', () => {
  const calls: string[] = []
  const target: CaseInsertPreviewTextTarget = {
    scope: 'templateTextList',
    paneId: 'tray',
    textListId: 'tray-feature-bullets',
  }
  const layout: ProjectCaseInsertLayout = {
    scale: 0.96,
    width: 38,
    x: 58,
    y: 62,
    rotation: 0,
  }
  const style = {
    ...createDefaultCaseInsertTextStyle('features'),
    backgroundEnabled: true,
    backgroundColor: '#202a36',
    backgroundOpacity: 0.45,
    backgroundPadding: 1,
    borderEnabled: true,
    borderColor: '#94a3b8',
    borderRadius: 0.5,
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
    avoidVisualElements: false,
    handlers,
    label: 'Feature bullets',
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
  assert.equal(controls.text?.alignment, undefined)
  assert.deepEqual(controls.text?.unsupported, ['Bold', 'Italic', 'Underline'])
  assert.equal(controls.art?.color?.value, style.color)
  assert.equal(controls.art?.contrast?.value, style.contrast)
  assert.equal(controls.art?.backgroundEnabled?.checked, true)
  assert.equal(controls.art?.backgroundColor?.value, '#202a36')
  assert.equal(controls.art?.backgroundOpacity?.value, 0.45)
  assert.equal(controls.art?.backgroundPadding?.value, 1)
  assert.equal(controls.art?.borderEnabled?.checked, true)
  assert.equal(controls.art?.borderColor?.value, '#94a3b8')
  assert.equal(controls.art?.borderRadius?.value, 0.5)
  assert.equal(controls.utilities?.respectVisualElements?.checked, false)
  assert.equal(controls.utilities?.width?.value, layout.width)
  assert.equal(controls.utilities?.x?.value, layout.x)
  assert.equal(controls.utilities?.y?.value, layout.y)
  assert.equal(typeof controls.utilities?.resetLayout, 'function')
  assert.equal(controls.utilities?.markdownPlanned, true)
  assert.equal(controls.deleteAction?.label, 'Hide Feature bullets')

  controls.art?.backgroundOpacity?.onChange(0.8)
  controls.utilities?.respectVisualElements?.onChange(true)
  controls.utilities?.x?.onChange(44)
  controls.utilities?.resetLayout?.()
  controls.deleteAction?.onDelete()

  assert.deepEqual(calls, [
    'reset-style',
    'preset:steam-archive',
    'style:backgroundOpacity:0.8',
    'avoid:true',
    'layout:x:44',
    'reset-layout',
    'enabled:false',
    'delete-complete',
  ])
})

test('case insert contextual controls expose migrated spine text properties', () => {
  const calls: string[] = []
  const target: CaseInsertPreviewTextTarget = {
    scope: 'spineTextBlock',
    side: 'right',
    textBlockId: 'right-spine-custom-note',
  }
  const layout: ProjectCaseInsertLayout = {
    scale: 1.08,
    width: 64,
    x: 12.5,
    y: 74.25,
    rotation: 90,
  }
  const style = {
    ...createDefaultCaseInsertTextStyle('spine'),
    backgroundEnabled: true,
    backgroundColor: '#0f172a',
    backgroundOpacity: 0.6,
    backgroundPadding: 0.8,
    borderEnabled: true,
    borderColor: '#38bdf8',
    borderRadius: 0.4,
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
    align: 'right',
    avoidVisualElements: false,
    handlers,
    label: 'Right spine note',
    layout,
    scaleMax: 1.8,
    scaleMin: 0.5,
    style,
    target,
    widthFallback: 90,
    xLabel: 'Cross',
    xMax: 18,
    xMin: -18,
    xStep: 0.1,
    yLabel: 'Length',
    yMax: 110,
    yMin: -10,
    yStep: 0.1,
    onDeleteComplete: () => calls.push('delete-complete'),
    onResetLayout: () => handlers.onResetLayout(target),
  })

  assert.ok(controls.presets?.options.length)
  controls.presets?.onReset?.()
  controls.presets?.onApply('steam-archive')
  assert.equal(controls.text?.fontFamily?.value, style.fontFamily)
  assert.equal(controls.text?.size?.min, 0.5)
  assert.equal(controls.text?.size?.max, 1.8)
  assert.equal(controls.text?.size?.value, layout.scale)
  assert.equal(controls.text?.alignment?.value, 'right')
  assert.deepEqual(controls.text?.unsupported, ['Bold', 'Italic', 'Underline'])
  assert.equal(controls.art?.color?.value, style.color)
  assert.equal(controls.art?.contrast?.value, style.contrast)
  assert.equal(controls.art?.backgroundEnabled?.checked, true)
  assert.equal(controls.art?.backgroundColor?.value, '#0f172a')
  assert.equal(controls.art?.backgroundOpacity?.value, 0.6)
  assert.equal(controls.art?.backgroundPadding?.value, 0.8)
  assert.equal(controls.art?.borderEnabled?.checked, true)
  assert.equal(controls.art?.borderColor?.value, '#38bdf8')
  assert.equal(controls.art?.borderRadius?.value, 0.4)
  assert.equal(controls.utilities?.respectVisualElements?.checked, false)
  assert.equal(controls.utilities?.width?.value, layout.width)
  assert.equal(controls.utilities?.x?.label, 'Cross')
  assert.equal(controls.utilities?.x?.min, -18)
  assert.equal(controls.utilities?.x?.max, 18)
  assert.equal(controls.utilities?.x?.step, 0.1)
  assert.equal(controls.utilities?.x?.value, layout.x)
  assert.equal(controls.utilities?.y?.label, 'Length')
  assert.equal(controls.utilities?.y?.min, -10)
  assert.equal(controls.utilities?.y?.max, 110)
  assert.equal(controls.utilities?.y?.step, 0.1)
  assert.equal(controls.utilities?.y?.value, layout.y)
  assert.equal(typeof controls.utilities?.resetLayout, 'function')
  assert.equal(controls.utilities?.markdownPlanned, true)
  assert.equal(controls.deleteAction?.label, 'Hide Right spine note')

  controls.text?.alignment?.onChange('center')
  controls.art?.borderRadius?.onChange(1.1)
  controls.utilities?.respectVisualElements?.onChange(true)
  controls.utilities?.x?.onChange(-4.5)
  controls.utilities?.y?.onChange(84)
  controls.utilities?.resetLayout?.()
  controls.deleteAction?.onDelete()

  assert.deepEqual(calls, [
    'reset-style',
    'preset:steam-archive',
    'align:center',
    'style:borderRadius:1.1',
    'avoid:true',
    'layout:x:-4.5',
    'layout:y:84',
    'reset-layout',
    'enabled:false',
    'delete-complete',
  ])
})
