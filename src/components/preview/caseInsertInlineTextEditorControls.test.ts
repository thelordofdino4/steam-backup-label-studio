import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDefaultCaseInsertTextStyle,
} from '../../caseInsert/textStyles.ts'
import {
  getCaseInsertTextBlockLayoutPresets,
  getCaseInsertTextListLayoutPresets,
} from '../../caseInsert/textLayout.ts'
import type {
  CaseInsertPreviewTextTarget,
} from '../../caseInsert/previewTextSelection.ts'
import type {
  ProjectCaseInsertLayout,
} from '../../project/projectTypes.ts'
import {
  createCaseInsertInlineTextEditorControls,
  createCaseInsertInlineTextMetadataSourceControl,
  type CaseInsertPreviewTextControlHandlers,
} from './caseInsertInlineTextEditorControls.ts'
import { createDefaultProjectMetadata } from '../../project/projectMetadata.ts'

test('case insert contextual controls expose migrated text block properties', () => {
  const calls: string[] = []
  const target: CaseInsertPreviewTextTarget = {
    scope: 'templateTextBlock',
    paneId: 'cover',
    textBlockId: 'cover-title-text',
  }
  const layout: ProjectCaseInsertLayout = {
    scale: 1.12,
    fontSizePt: 28,
    width: 72,
    x: 35,
    y: 42,
    rotation: 0,
  }
  const style = {
    ...createDefaultCaseInsertTextStyle('title'),
    bold: true,
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
      calls.push(`style-preset:${presetId}`)
    },
    onApplyLayoutPreset: (_target, presetId) => {
      calls.push(`layout-preset:${presetId}`)
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
    onContentModeChange: (_target, contentMode) => {
      calls.push(`content-mode:${contentMode}`)
    },
  }

  const controls = createCaseInsertInlineTextEditorControls({
    align: 'center',
    avoidVisualElements: true,
    handlers,
    label: 'Title',
    layout,
    layoutPresets: getCaseInsertTextBlockLayoutPresets('cover', {
      id: target.textBlockId,
      label: 'Title',
      enabled: true,
      value: 'Title',
      source: 'manual',
      align: 'center',
      avoidVisualElements: true,
      layout,
      style,
    }),
    style,
    target,
    onDeleteComplete: () => calls.push('delete-complete'),
    onResetLayout: () => handlers.onResetLayout(target),
  })

  assert.equal(controls.presets?.style?.label, 'Style preset')
  assert.equal(controls.presets?.layout?.label, 'Layout preset')
  assert.equal(controls.presets?.style?.value, 'custom')
  assert.equal(controls.presets?.layout?.value, 'custom')
  assert.ok(
    controls.presets?.style?.options.some((option) => option.value === 'metallic'),
  )
  assert.ok(
    controls.presets?.layout?.options.some(
      (option) => option.value === 'cover-top-center',
    ),
  )
  assert.equal(
    controls.presets?.layout?.options.some(
      (option) => option.value === 'spine-centered',
    ),
    false,
  )
  controls.presets?.onReset?.()
  controls.presets?.style?.onChange('metallic')
  controls.presets?.layout?.onChange('cover-top-center')
  assert.equal(controls.text?.fontFamily?.value, style.fontFamily)
  assert.equal(controls.text?.size?.label, 'Font size (pt)')
  assert.equal(controls.text?.size?.value, layout.fontSizePt)
  assert.ok(controls.text?.size?.options.includes(24))
  assert.equal(controls.text?.alignment?.value, 'center')
  assert.equal(controls.text?.bold?.pressed, true)
  assert.equal(controls.text?.italic?.pressed, false)
  assert.equal(controls.text?.underline?.pressed, false)
  assert.equal(controls.text?.bulletedList?.label, 'Bulleted List')
  assert.equal(controls.text?.unsupported, undefined)
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
  assert.equal(controls.html?.source?.label, 'HTML source')
  assert.equal(controls.html?.source?.checked, false)
  assert.equal(Object.hasOwn(controls.utilities ?? {}, 'htmlSource'), false)
  assert.equal(Object.hasOwn(controls.utilities ?? {}, 'markdown'), false)
  assert.equal(controls.deleteAction?.label, 'Delete')
  assert.equal(controls.deleteAction?.ariaLabel, 'Delete Title')

  controls.text?.alignment?.onChange('right')
  controls.text?.bold?.onChange(false)
  controls.text?.italic?.onChange(true)
  controls.text?.underline?.onChange(true)
  controls.text?.size?.onChange(24)
  controls.art?.backgroundPadding?.onChange(1.8)
  controls.utilities?.width?.onChange(64)
  controls.html?.source?.onChange(true)
  controls.utilities?.resetLayout?.()
  controls.deleteAction?.onDelete()

  assert.deepEqual(calls, [
    'reset-style',
    'style-preset:metallic',
    'layout-preset:cover-top-center',
    'align:right',
    'style:bold:false',
    'style:italic:true',
    'style:underline:true',
    'layout:fontSizePt:24',
    'style:backgroundPadding:1.8',
    'layout:width:64',
    'content-mode:html',
    'reset-layout',
    'enabled:false',
    'delete-complete',
  ])
})

test('case insert border group remains identifiable while background is off', () => {
  const target: CaseInsertPreviewTextTarget = {
    scope: 'templateTextBlock',
    paneId: 'cover',
    textBlockId: 'cover-title-text',
  }
  const layout: ProjectCaseInsertLayout = {
    scale: 1,
    fontSizePt: 18,
    width: 70,
    x: 50,
    y: 50,
    rotation: 0,
  }
  const style = {
    ...createDefaultCaseInsertTextStyle('title'),
    backgroundEnabled: false,
    borderEnabled: true,
  }
  const noop = () => undefined
  const controls = createCaseInsertInlineTextEditorControls({
    align: 'center',
    avoidVisualElements: true,
    handlers: {
      onAlignChange: noop,
      onApplyLayoutPreset: noop,
      onApplyStylePreset: noop,
      onAvoidVisualElementsChange: noop,
      onContentModeChange: noop,
      onEnabledChange: noop,
      onLayoutChange: noop,
      onResetLayout: noop,
      onResetStyle: noop,
      onStyleChange: noop,
    },
    label: 'Title',
    layout,
    layoutPresets: [],
    onDeleteComplete: noop,
    onResetLayout: noop,
    style,
    target,
  })

  assert.equal(controls.art?.backgroundEnabled?.checked, false)
  assert.equal(controls.art?.borderEnabled?.label, 'Border')
  assert.equal(controls.art?.borderEnabled?.checked, true)
  assert.equal(controls.art?.borderEnabled?.disabled, true)
  assert.equal(
    controls.art?.borderEnabled?.disabledReason,
    'Enable Background before editing the border.',
  )
  assert.equal(controls.art?.backgroundColor?.value, style.backgroundColor)
  assert.equal(controls.art?.backgroundOpacity?.value, style.backgroundOpacity)
  assert.equal(controls.art?.backgroundPadding?.value, style.backgroundPadding)
  assert.equal(controls.art?.borderColor?.value, style.borderColor)
  assert.equal(controls.art?.borderRadius?.value, style.borderRadius)
})

test('case insert metadata source control reflects manual, metadata, and unavailable states', () => {
  const projectMetadata = {
    ...createDefaultProjectMetadata(),
    title: 'Portal 2',
  }
  const textBlock = {
    id: 'cover-title-text',
    label: 'Title',
    enabled: true,
    value: 'Manual title',
    source: 'manual' as const,
    align: 'center' as const,
    avoidVisualElements: false,
    layout: {
      scale: 1,
      fontSizePt: 24,
      width: 80,
      x: 50,
      y: 30,
      rotation: 0,
    },
    style: createDefaultCaseInsertTextStyle('title'),
  }
  let restored = false

  const manual = createCaseInsertInlineTextMetadataSourceControl({
    textBlock,
    projectMetadata,
    onUseMetadataValue: () => {
      restored = true
    },
  })

  assert.equal(manual?.label, 'Game metadata')
  assert.equal(manual?.status, 'manual')
  assert.equal(manual?.statusLabel, 'Manual override')
  assert.equal(manual?.actionLabel, 'Use Game metadata value')
  manual?.onAction?.()
  assert.equal(restored, true)

  const metadata = createCaseInsertInlineTextMetadataSourceControl({
    textBlock: { ...textBlock, source: 'metadata', value: '' },
    projectMetadata,
  })
  assert.equal(metadata?.status, 'metadata')
  assert.equal(metadata?.statusLabel, 'Using Game metadata/default')
  assert.equal(metadata?.onAction, undefined)

  const unavailable = createCaseInsertInlineTextMetadataSourceControl({
    textBlock: { ...textBlock, source: 'metadata', value: '' },
    projectMetadata: { ...projectMetadata, title: '' },
  })
  assert.equal(unavailable?.status, 'unavailable')
  assert.equal(unavailable?.statusLabel, 'Metadata unavailable')
})

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

test('case insert contextual controls expose migrated text list properties', () => {
  const calls: string[] = []
  const target: CaseInsertPreviewTextTarget = {
    scope: 'templateTextList',
    paneId: 'tray',
    textListId: 'tray-feature-bullets',
  }
  const layout: ProjectCaseInsertLayout = {
    scale: 0.96,
    fontSizePt: 12,
    width: 38,
    x: 58,
    y: 62,
    rotation: 0,
  }
  const style = {
    ...createDefaultCaseInsertTextStyle('features'),
    italic: true,
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
      calls.push(`style-preset:${presetId}`)
    },
    onApplyLayoutPreset: (_target, presetId) => {
      calls.push(`layout-preset:${presetId}`)
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
    onContentModeChange: (_target, contentMode) => {
      calls.push(`content-mode:${contentMode}`)
    },
  }

  const controls = createCaseInsertInlineTextEditorControls({
    avoidVisualElements: false,
    handlers,
    label: 'Feature bullets',
    layout,
    layoutPresets: getCaseInsertTextListLayoutPresets('tray'),
    contentMode: 'html',
    style,
    target,
    onDeleteComplete: () => calls.push('delete-complete'),
    onResetLayout: () => handlers.onResetLayout(target),
  })

  assert.equal(controls.presets?.style?.label, 'Style preset')
  assert.equal(controls.presets?.layout?.label, 'Layout preset')
  assert.ok(
    controls.presets?.layout?.options.some(
      (option) => option.value === 'tray-center',
    ),
  )
  assert.equal(
    controls.presets?.layout?.options.some(
      (option) => option.value === 'cover-center',
    ),
    false,
  )
  controls.presets?.onReset?.()
  controls.presets?.style?.onChange('futuristic')
  controls.presets?.layout?.onChange('tray-center')
  assert.equal(controls.text?.fontFamily?.value, style.fontFamily)
  assert.equal(controls.text?.size?.label, 'Font size (pt)')
  assert.equal(controls.text?.size?.value, layout.fontSizePt)
  assert.equal(controls.text?.alignment, undefined)
  assert.equal(controls.text?.bold?.pressed, false)
  assert.equal(controls.text?.italic?.pressed, true)
  assert.equal(controls.text?.underline?.pressed, false)
  assert.equal(controls.text?.unsupported, undefined)
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
  assert.equal(controls.html?.source?.label, 'HTML source')
  assert.equal(controls.html?.source?.checked, true)
  assert.equal(Object.hasOwn(controls.utilities ?? {}, 'htmlSource'), false)
  assert.equal(Object.hasOwn(controls.utilities ?? {}, 'markdown'), false)
  assert.equal(controls.deleteAction?.label, 'Delete')
  assert.equal(controls.deleteAction?.ariaLabel, 'Delete Feature bullets')

  controls.art?.backgroundOpacity?.onChange(0.8)
  controls.text?.italic?.onChange(false)
  controls.text?.size?.onChange(14)
  controls.utilities?.respectVisualElements?.onChange(true)
  controls.html?.source?.onChange(false)
  controls.utilities?.x?.onChange(44)
  controls.utilities?.resetLayout?.()
  controls.deleteAction?.onDelete()

  assert.deepEqual(calls, [
    'reset-style',
    'style-preset:futuristic',
    'layout-preset:tray-center',
    'style:backgroundOpacity:0.8',
    'style:italic:false',
    'layout:fontSizePt:14',
    'avoid:true',
    'content-mode:plain',
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
    fontSizePt: 10,
    width: 64,
    x: 12.5,
    y: 74.25,
    rotation: 90,
  }
  const style = {
    ...createDefaultCaseInsertTextStyle('spine'),
    underline: true,
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
      calls.push(`style-preset:${presetId}`)
    },
    onApplyLayoutPreset: (_target, presetId) => {
      calls.push(`layout-preset:${presetId}`)
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
    onContentModeChange: (_target, contentMode) => {
      calls.push(`content-mode:${contentMode}`)
    },
  }

  const controls = createCaseInsertInlineTextEditorControls({
    align: 'right',
    avoidVisualElements: false,
    handlers,
    label: 'Right spine note',
    layout,
    layoutPresets: getCaseInsertTextBlockLayoutPresets('spine', {
      id: target.textBlockId,
      label: 'Right spine note',
      enabled: true,
      value: 'Right spine note',
      source: 'manual',
      align: 'right',
      avoidVisualElements: false,
      layout,
      style,
    }),
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

  assert.equal(controls.presets?.style?.label, 'Style preset')
  assert.equal(controls.presets?.layout?.label, 'Layout preset')
  assert.ok(
    controls.presets?.layout?.options.some(
      (option) => option.value === 'spine-centered',
    ),
  )
  assert.equal(
    controls.presets?.layout?.options.some(
      (option) => option.value === 'cover-top-center',
    ),
    false,
  )
  controls.presets?.onReset?.()
  controls.presets?.style?.onChange('horror')
  controls.presets?.layout?.onChange('spine-centered')
  assert.equal(controls.text?.fontFamily?.value, style.fontFamily)
  assert.equal(controls.text?.size?.min, 6)
  assert.equal(controls.text?.size?.max, 96)
  assert.equal(controls.text?.size?.value, layout.fontSizePt)
  assert.equal(controls.text?.alignment?.value, 'right')
  assert.equal(controls.text?.bold?.pressed, false)
  assert.equal(controls.text?.italic?.pressed, false)
  assert.equal(controls.text?.underline?.pressed, true)
  assert.equal(controls.text?.unsupported, undefined)
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
  assert.equal(controls.html?.source?.label, 'HTML source')
  assert.equal(controls.html?.source?.checked, false)
  assert.equal(Object.hasOwn(controls.utilities ?? {}, 'htmlSource'), false)
  assert.equal(Object.hasOwn(controls.utilities ?? {}, 'markdown'), false)
  assert.equal(controls.deleteAction?.label, 'Delete')
  assert.equal(controls.deleteAction?.ariaLabel, 'Delete Right spine note')

  controls.text?.alignment?.onChange('center')
  controls.text?.underline?.onChange(false)
  controls.text?.size?.onChange(11.5)
  controls.art?.borderRadius?.onChange(1.1)
  controls.utilities?.respectVisualElements?.onChange(true)
  controls.html?.source?.onChange(true)
  controls.utilities?.x?.onChange(-4.5)
  controls.utilities?.y?.onChange(84)
  controls.utilities?.resetLayout?.()
  controls.deleteAction?.onDelete()

  assert.deepEqual(calls, [
    'reset-style',
    'style-preset:horror',
    'layout-preset:spine-centered',
    'align:center',
    'style:underline:false',
    'layout:fontSizePt:11.5',
    'style:borderRadius:1.1',
    'avoid:true',
    'content-mode:html',
    'layout:x:-4.5',
    'layout:y:84',
    'reset-layout',
    'enabled:false',
    'delete-complete',
  ])
})
