import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDefaultDiscTextLayout,
  type DiscTextKey,
  type DiscTextLayout,
} from '../../discText/index.ts'
import {
  createDefaultDiscTextStyle,
  DISC_TEXT_STYLE_PRESETS,
} from '../../discText/styles.ts'
import { getDefaultDiscTextPointSize } from '../../discText/pointSize.ts'
import {
  createContextualTextPresetOptions,
} from '../../text/contextualTextControlViewModel.ts'
import {
  createCurvedDiscTextEditorControls,
  createDiscInlineTextEditorControls,
  type CurvedDiscTextEditorControlParams,
  type DiscInlineTextEditorControlParams,
} from './discInlineTextEditorControls.ts'

function createControls(
  overrides: Partial<DiscInlineTextEditorControlParams> = {},
) {
  const calls: string[] = []
  const key: DiscTextKey = overrides.key ?? 'title'
  const layout = overrides.layout ?? {
    ...createDefaultDiscTextLayout('top')[key],
    scale: 1.05,
    fontSizePt: getDefaultDiscTextPointSize(key, 1.05),
    width: 62,
  }
  const style = overrides.style ?? {
    ...createDefaultDiscTextStyle(key),
    backgroundEnabled: true,
    backgroundColor: '#111111',
    backgroundOpacity: 0.5,
    backgroundPadding: 1.2,
    borderEnabled: true,
    borderColor: '#eeeeee',
    borderRadius: 0.75,
  }

  const controls = createDiscInlineTextEditorControls({
    isHtmlSourceEnabled: false,
    key,
    layout,
    onApplyDiscTextStylePreset: (_key, presetId) => {
      calls.push(`style-preset:${presetId}`)
    },
    onDiscTextAlignmentChange: (_key, alignment) => {
      calls.push(`align:${alignment}`)
    },
    onDiscTextContentModeChange: (_key, contentMode) => {
      calls.push(`content-mode:${contentMode}`)
    },
    onDiscTextEnabledChange: (_key, enabled) => {
      calls.push(`enabled:${enabled}`)
    },
    onDiscTextLayoutChange: (_key, field, value) => {
      calls.push(`layout:${field}:${value}`)
    },
    onDiscTextStyleChange: (_key, field, value) => {
      calls.push(`style:${field}:${String(value)}`)
    },
    onDiscTextVisualAvoidanceChange: (_key, avoidVisualElements) => {
      calls.push(`avoid:${avoidVisualElements}`)
    },
    onResetDiscTextLayout: () => {
      calls.push('reset-layout')
    },
    onResetDiscTextStyle: () => {
      calls.push('reset-style')
    },
    onSelectedDiscTextKeyChange: (selectedKey) => {
      calls.push(`selected:${String(selectedKey)}`)
    },
    style,
    ...overrides,
  })

  return { calls, controls, layout, style }
}

function createCurvedControls(
  overrides: Partial<CurvedDiscTextEditorControlParams> = {},
) {
  const calls: string[] = []
  const key: DiscTextKey = overrides.key ?? 'copyright'
  const layout = overrides.layout ?? {
    ...createDefaultDiscTextLayout('top').copyright,
    arcDegrees: 180,
    arcSide: 'bottom' as const,
    fontSizePt: 9,
    mode: 'curved' as const,
    scale: 1,
    x: 0,
    y: 4,
  }
  const style = overrides.style ?? createDefaultDiscTextStyle(key)
  const noop = () => undefined

  const controls = createCurvedDiscTextEditorControls({
    isHtmlSourceEnabled: false,
    key,
    layout,
    onApplyDiscTextStylePreset: (_key, presetId) => {
      calls.push(`style-preset:${presetId}`)
    },
    onDiscTextAlignmentChange: (_key, alignment) => {
      calls.push(`align:${alignment}`)
    },
    onDiscTextArcSideChange: (_key, arcSide) => {
      calls.push(`arc-side:${arcSide}`)
    },
    onDiscTextContentModeChange: (_key, contentMode) => {
      calls.push(`content-mode:${contentMode}`)
    },
    onDiscTextEnabledChange: (_key, enabled) => {
      calls.push(`enabled:${enabled}`)
    },
    onDiscTextLayoutChange: (_key, field, value) => {
      calls.push(`layout:${field}:${value}`)
    },
    onDiscTextRichTextCommand: noop,
    onDiscTextStyleChange: (_key, field, value) => {
      calls.push(`style:${field}:${String(value)}`)
    },
    onResetDiscTextLayout: () => {
      calls.push('reset-layout')
    },
    onResetDiscTextStyle: () => {
      calls.push('reset-style')
    },
    onSelectedDiscTextKeyChange: (selectedKey) => {
      calls.push(`selected:${String(selectedKey)}`)
    },
    style,
    ...overrides,
  })

  return { calls, controls, layout, style }
}

test('disc contextual controls use shared preset options and labels', () => {
  const { controls, layout, style } = createControls()

  assert.equal(controls.presets?.style?.label, 'Style preset')
  assert.deepEqual(
    controls.presets?.style?.options,
    createContextualTextPresetOptions(DISC_TEXT_STYLE_PRESETS),
  )
  assert.equal(controls.presets?.style?.value, 'custom')
  assert.equal(controls.presets?.layout?.label, 'Layout preset')
  assert.equal(controls.presets?.layout?.value, 'title-top')
  assert.equal(
    controls.presets?.layout?.options.some(
      (option) => option.value === 'top-arc',
    ),
    false,
  )
  assert.equal(controls.text?.fontFamily?.label, 'Font')
  assert.equal(controls.text?.size?.label, 'Font size (pt)')
  assert.equal(controls.text?.size?.value, layout.fontSizePt)
  assert.equal(controls.text?.size?.step, 0.25)
  assert.equal(controls.text?.alignment?.label, 'Align')
  assert.equal(controls.text?.alignment?.value, layout.align)
  assert.equal(controls.text?.bold?.label, 'Bold')
  assert.equal(controls.text?.italic?.label, 'Italic')
  assert.equal(controls.text?.underline?.label, 'Underline')
  assert.equal(controls.text?.bulletedList?.label, 'Bulleted List')
  assert.equal(controls.text?.unsupported, undefined)
  assert.equal(controls.art?.color?.label, 'Color')
  assert.equal(controls.art?.contrast?.label, 'Contrast')
  assert.equal(controls.art?.backgroundEnabled?.label, 'Background')
  assert.equal(controls.art?.backgroundColor?.value, '#111111')
  assert.equal(controls.art?.backgroundOpacity?.value, 0.5)
  assert.equal(controls.art?.backgroundPadding?.value, 1.2)
  assert.equal(controls.art?.borderEnabled?.checked, true)
  assert.equal(controls.art?.borderColor?.value, '#eeeeee')
  assert.equal(controls.art?.borderRadius?.value, 0.75)
  assert.equal(
    controls.utilities?.respectVisualElements?.label,
    'Respect visual elements',
  )
  assert.equal(controls.utilities?.width?.label, 'Wrap width')
  assert.equal(controls.utilities?.x?.label, 'X')
  assert.equal(controls.utilities?.y?.label, 'Y')
  assert.equal(controls.html?.source?.label, 'HTML source')
  assert.equal(Object.hasOwn(controls.utilities ?? {}, 'htmlSource'), false)
  assert.equal(Object.hasOwn(controls.utilities ?? {}, 'mode'), false)
  assert.equal(Object.hasOwn(controls.utilities ?? {}, 'arcSide'), false)
  assert.equal(Object.hasOwn(controls.utilities ?? {}, 'arcDegrees'), false)
  assert.equal(controls.deleteAction?.ariaLabel, 'Delete Game title')
  assert.equal(style.backgroundEnabled, true)
})

test('straight disc border controls stay available without background fill', () => {
  const { controls, style } = createControls({
    style: {
      ...createDefaultDiscTextStyle('title'),
      backgroundEnabled: false,
      borderEnabled: true,
      borderColor: '#eeeeee',
      borderRadius: 0.75,
    },
  })

  assert.equal(controls.art?.backgroundEnabled?.checked, false)
  assert.equal(controls.art?.backgroundColor?.value, style.backgroundColor)
  assert.equal(controls.art?.backgroundOpacity?.value, style.backgroundOpacity)
  assert.equal(controls.art?.backgroundPadding?.value, style.backgroundPadding)
  assert.equal(controls.art?.borderEnabled?.label, 'Border')
  assert.equal(controls.art?.borderEnabled?.checked, true)
  assert.equal(controls.art?.borderEnabled?.disabled, undefined)
  assert.equal(controls.art?.borderColor?.value, '#eeeeee')
  assert.equal(controls.art?.borderRadius?.value, 0.75)
})

test('disc contextual controls expose metadata source status when provided', () => {
  const { controls } = createControls({
    metadataSource: {
      label: 'Game metadata',
      status: 'manual',
      statusLabel: 'Manual override',
      actionLabel: 'Use Game metadata value',
      onAction: () => undefined,
    },
  })

  assert.equal(controls.utilities?.metadataSource?.label, 'Game metadata')
  assert.equal(controls.utilities?.metadataSource?.status, 'manual')
  assert.equal(
    controls.utilities?.metadataSource?.actionLabel,
    'Use Game metadata value',
  )
})

test('curved disc artistic controls omit unsupported background and border groups', () => {
  const key: DiscTextKey = 'copyright'
  const layout = {
    ...createDefaultDiscTextLayout('top').copyright,
    arcDegrees: 180,
    arcSide: 'bottom' as const,
    fontSizePt: 9,
    mode: 'curved' as const,
    scale: 1,
    x: 0,
    y: 4,
  }
  const style = {
    ...createDefaultDiscTextStyle(key),
    backgroundEnabled: true,
    borderEnabled: true,
  }
  const noop = () => undefined
  const controls = createCurvedDiscTextEditorControls({
    isHtmlSourceEnabled: false,
    key,
    layout,
    onApplyDiscTextStylePreset: noop,
    onDiscTextAlignmentChange: noop,
    onDiscTextArcSideChange: noop,
    onDiscTextEnabledChange: noop,
    onDiscTextLayoutChange: noop,
    onDiscTextStyleChange: noop,
    onDiscTextContentModeChange: noop,
    onDiscTextRichTextCommand: noop,
    onResetDiscTextLayout: noop,
    onResetDiscTextStyle: noop,
    onSelectedDiscTextKeyChange: noop,
    style,
  })

  assert.equal(controls.art?.color?.label, 'Color')
  assert.equal(controls.art?.contrast?.label, 'Contrast')
  assert.equal(controls.art?.backgroundEnabled, undefined)
  assert.equal(controls.art?.backgroundColor, undefined)
  assert.equal(controls.art?.backgroundOpacity, undefined)
  assert.equal(controls.art?.backgroundPadding, undefined)
  assert.equal(controls.art?.borderEnabled, undefined)
  assert.equal(controls.art?.borderColor, undefined)
  assert.equal(controls.art?.borderRadius, undefined)
})

test('curved arc side control is only exposed when the Steam banner is hidden', () => {
  const hiddenBanner = createCurvedControls({
    canChangeArcSide: true,
  })
  const visibleBanner = createCurvedControls({
    canChangeArcSide: false,
  })

  assert.equal(hiddenBanner.controls.utilities?.arcSide?.label, 'Arc side')
  hiddenBanner.controls.utilities?.arcSide?.onChange('top')
  assert.deepEqual(hiddenBanner.calls, ['arc-side:top'])

  assert.equal(visibleBanner.controls.utilities?.lineSpacing?.label, 'Line spacing')
  assert.equal(visibleBanner.controls.utilities?.arcDegrees?.label, 'Arc')
  assert.equal(
    Object.hasOwn(visibleBanner.controls.utilities ?? {}, 'arcSide'),
    false,
  )
  assert.deepEqual(visibleBanner.calls, [])
})

test('disc bulleted list control routes selection command through adapter', () => {
  const routedCalls: string[] = []
  const { controls } = createControls({
    getDiscTextRichTextCommandState: (_key, command, selection) => {
      routedCalls.push(
        `state:${command}:${selection.start}-${selection.end}`,
      )
      return command === 'bulletedList' ? 'active' : 'inactive'
    },
    onDiscTextRichTextCommand: (_key, command, selection, value) => {
      routedCalls.push(
        `command:${command}:${String(value)}:${selection?.start}-${selection?.end}`,
      )
    },
  })
  const selection = { start: 0, end: 0 }

  assert.equal(
    controls.text?.bulletedList?.getSelectionState?.(selection),
    'active',
  )
  controls.text?.bulletedList?.onChange(false, selection)

  assert.deepEqual(routedCalls, [
    'state:bulletedList:0-0',
    'command:bulletedList:false:0-0',
  ])
})

test('disc point-size control routes selected ranges through rich text command', () => {
  const routedCalls: string[] = []
  const { calls, controls } = createControls({
    getDiscTextRichTextCommandState: (_key, command, selection) => {
      routedCalls.push(`state:${command}:${selection.start}-${selection.end}`)
      return command === 'fontSizePt'
        ? { state: 'active', value: 32 }
        : 'inactive'
    },
    onDiscTextRichTextCommand: (_key, command, selection, value) => {
      routedCalls.push(
        `command:${command}:${String(value)}:${selection?.start}-${selection?.end}`,
      )
    },
  })
  const selection = { start: 0, end: 8 }

  assert.deepEqual(
    controls.text?.size && 'getSelectionValue' in controls.text.size
      ? controls.text.size.getSelectionValue?.(selection)
      : undefined,
    { state: 'active', value: 32 },
  )
  controls.text?.size?.onChange(40, selection)
  controls.text?.size?.onChange(18, { start: 4, end: 4 })

  assert.deepEqual(routedCalls, [
    'state:fontSizePt:0-8',
    'command:fontSizePt:40:0-8',
  ])
  assert.deepEqual(calls, ['layout:fontSizePt:18'])
})

test('disc color control routes selected ranges through rich text command', () => {
  const routedCalls: string[] = []
  const { calls, controls } = createControls({
    getDiscTextRichTextCommandState: (_key, command, selection) => {
      routedCalls.push(`state:${command}:${selection.start}-${selection.end}`)
      return command === 'color'
        ? { state: 'active', value: '#00ff00' }
        : 'inactive'
    },
    onDiscTextRichTextCommand: (_key, command, selection, value) => {
      routedCalls.push(
        `command:${command}:${String(value)}:${selection?.start}-${selection?.end}`,
      )
    },
  })
  const selection = { start: 5, end: 9 }

  assert.deepEqual(
    controls.art?.color?.getSelectionValue?.(selection),
    { state: 'active', value: '#00ff00' },
  )
  controls.art?.color?.onChange('#0000ff', selection)
  controls.art?.color?.onChange('#ff0000', { start: 4, end: 4 })

  assert.deepEqual(routedCalls, [
    'state:color:5-9',
    'command:color:#0000ff:5-9',
  ])
  assert.deepEqual(calls, ['style:color:#ff0000'])
})

test('disc custom option is inert and target-specific handlers stay in adapter', () => {
  const { calls, controls } = createControls()

  controls.presets?.onReset?.()
  controls.presets?.style?.onChange('custom')
  controls.presets?.layout?.onChange('custom')
  controls.presets?.style?.onChange('metallic')
  controls.presets?.layout?.onChange('title-top')
  controls.text?.alignment?.onChange('right')
  controls.text?.bold?.onChange(true)
  controls.text?.italic?.onChange(true)
  controls.text?.underline?.onChange(true)
  controls.art?.backgroundPadding?.onChange(2)
  controls.utilities?.respectVisualElements?.onChange(true)
  controls.html?.source?.onChange(true)
  controls.utilities?.width?.onChange(70)
  controls.utilities?.resetLayout?.()
  controls.deleteAction?.onDelete()

  assert.deepEqual(calls, [
    'reset-style',
    'style-preset:metallic',
    'layout:x:0',
    'layout:y:19.5',
    'layout:width:62',
    'align:center',
    'align:right',
    'style:bold:true',
    'style:italic:true',
    'style:underline:true',
    'style:backgroundPadding:2',
    'avoid:true',
    'content-mode:html',
    'layout:width:70',
    'reset-layout',
    'enabled:false',
    'selected:null',
  ])
})

test('disc copyright straight controls omit curved presets without changing curved exception ownership', () => {
  const layout: DiscTextLayout = {
    ...createDefaultDiscTextLayout('top').copyright,
    align: 'center',
    mode: 'straight',
    scale: 0.84,
    width: 74,
    x: 0,
    y: 86,
  }
  const { controls } = createControls({
    key: 'copyright',
    layout,
    style: createDefaultDiscTextStyle('copyright'),
  })

  assert.equal(
    controls.presets?.layout?.options.some(
      (option) => option.value === 'lower-legal-line',
    ),
    true,
  )
  assert.equal(
    controls.presets?.layout?.options.some(
      (option) => option.value === 'top-arc',
    ),
    false,
  )
  assert.equal(
    controls.presets?.layout?.options.some(
      (option) => option.value === 'bottom-arc',
    ),
    false,
  )
})

test('curved disc controls expose whole-object SVG textPath controls without menu text value', () => {
  const calls: string[] = []
  const routedCalls: string[] = []
  const key: DiscTextKey = 'copyright'
  const layout = {
    ...createDefaultDiscTextLayout('top').copyright,
    arcDegrees: 180,
    arcSide: 'bottom' as const,
    fontSizePt: 9,
    mode: 'curved' as const,
    scale: 1,
    x: 0,
    y: 4,
  }
  const style = createDefaultDiscTextStyle(key)
  const controls = createCurvedDiscTextEditorControls({
    isHtmlSourceEnabled: false,
    key,
    layout,
    onApplyDiscTextStylePreset: (_key, presetId) => {
      calls.push(`style-preset:${presetId}`)
    },
    onDiscTextAlignmentChange: (_key, alignment) => {
      calls.push(`align:${alignment}`)
    },
    onDiscTextArcSideChange: (_key, arcSide) => {
      calls.push(`arc-side:${arcSide}`)
    },
    onDiscTextEnabledChange: (_key, enabled) => {
      calls.push(`enabled:${enabled}`)
    },
    onDiscTextLayoutChange: (_key, field, value) => {
      calls.push(`layout:${field}:${value}`)
    },
    onDiscTextStyleChange: (_key, field, value) => {
      calls.push(`style:${field}:${String(value)}`)
    },
    onDiscTextContentModeChange: (_key, contentMode) => {
      calls.push(`content-mode:${contentMode}`)
    },
    getDiscTextRichTextCommandState: (_key, command, selection) => {
      routedCalls.push(`state:${command}:${selection.start}-${selection.end}`)
      if (command === 'fontFamily') {
        return { state: 'active', value: 'georgia' }
      }
      if (command === 'fontSizePt') {
        return { state: 'mixed', value: 12 }
      }
      if (command === 'color') {
        return { state: 'active', value: '#00ffaa' }
      }
      return command === 'bold' ? 'mixed' : 'inactive'
    },
    onDiscTextRichTextCommand: (_key, command, selection, value) => {
      routedCalls.push(
        `command:${command}:${String(value)}:${selection?.start}-${selection?.end}`,
      )
    },
    onResetDiscTextLayout: () => {
      calls.push('reset-layout')
    },
    onResetDiscTextStyle: () => {
      calls.push('reset-style')
    },
    onSelectedDiscTextKeyChange: (selectedKey) => {
      calls.push(`selected:${String(selectedKey)}`)
    },
    style,
  })

  assert.equal(controls.presets?.style?.label, 'Style preset')
  assert.equal(controls.presets?.layout?.label, 'Layout preset')
  assert.equal(
    controls.presets?.layout?.options.some(
      (option) => option.value === 'top-arc',
    ),
    true,
  )
  assert.equal(controls.text?.textValue, undefined)
  assert.equal(controls.text?.fontFamily?.label, 'Font')
  assert.equal(controls.text?.size?.label, 'Font size (pt)')
  assert.equal(controls.text?.size?.value, 9)
  assert.equal(controls.text?.size?.step, 0.25)
  assert.equal(controls.text?.bold?.label, 'Bold')
  assert.equal(controls.text?.italic?.label, 'Italic')
  assert.equal(controls.text?.underline?.label, 'Underline')
  assert.equal(controls.text?.unsupported, undefined)
  assert.deepEqual(
    controls.text?.fontFamily?.getSelectionValue?.({ start: 0, end: 9 }),
    { state: 'active', value: 'georgia' },
  )
  assert.deepEqual(
    controls.text?.size && 'getSelectionValue' in controls.text.size
      ? controls.text.size.getSelectionValue?.({ start: 0, end: 9 })
      : undefined,
    { state: 'mixed', value: 12 },
  )
  assert.equal(
    controls.text?.bold?.getSelectionState?.({ start: 0, end: 9 }),
    'mixed',
  )
  assert.deepEqual(
    controls.art?.color?.getSelectionValue?.({ start: 0, end: 9 }),
    { state: 'active', value: '#00ffaa' },
  )
  assert.equal(controls.art?.color?.label, 'Color')
  assert.equal(controls.art?.contrast?.label, 'Contrast')
  assert.equal(controls.utilities?.lineSpacing?.label, 'Line spacing')
  assert.equal(controls.utilities?.x?.label, 'Angle')
  assert.equal(controls.utilities?.y?.label, 'Inset')
  assert.equal(controls.utilities?.arcSide?.label, 'Arc side')
  assert.equal(controls.utilities?.arcDegrees?.label, 'Arc')
  assert.equal(Object.hasOwn(controls.utilities ?? {}, 'htmlSource'), false)
  assert.equal(controls.html?.source?.label, 'HTML source')
  assert.equal(Object.hasOwn(controls.text ?? {}, 'bulletedList'), false)

  controls.text?.fontFamily?.onChange('verdana', { start: 0, end: 9 })
  controls.text?.size?.onChange(14, { start: 0, end: 9 })
  controls.text?.bold?.onChange(true, { start: 0, end: 9 })
  controls.text?.italic?.onChange(true, { start: 0, end: 9 })
  controls.text?.underline?.onChange(true, { start: 0, end: 9 })
  controls.art?.color?.onChange('#ff00aa', { start: 0, end: 9 })
  controls.text?.bold?.onChange(true)
  controls.text?.italic?.onChange(true)
  controls.text?.underline?.onChange(true)
  controls.art?.color?.onChange('#ff00aa')
  controls.utilities?.lineSpacing?.onChange(1.2)
  controls.utilities?.x?.onChange(12)
  controls.utilities?.y?.onChange(6)
  controls.utilities?.arcSide?.onChange('top')
  controls.utilities?.arcDegrees?.onChange(220)
  controls.html?.source?.onChange(true)
  controls.utilities?.resetLayout?.()
  controls.presets?.onReset?.()
  controls.deleteAction?.onDelete()

  assert.deepEqual(calls, [
    'style:bold:true',
    'style:italic:true',
    'style:underline:true',
    'style:color:#ff00aa',
    'layout:scale:1.2',
    'layout:x:12',
    'layout:y:6',
    'arc-side:top',
    'layout:arcDegrees:220',
    'content-mode:html',
    'reset-layout',
    'reset-style',
    'enabled:false',
    'selected:null',
  ])
  assert.deepEqual(routedCalls, [
    'state:fontFamily:0-9',
    'state:fontSizePt:0-9',
    'state:bold:0-9',
    'state:color:0-9',
    'command:fontFamily:verdana:0-9',
    'command:fontSizePt:14:0-9',
    'command:bold:true:0-9',
    'command:italic:true:0-9',
    'command:underline:true:0-9',
    'command:color:#ff00aa:0-9',
  ])
})
