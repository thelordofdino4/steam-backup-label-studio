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
  assert.equal(controls.utilities?.respectVisualElements?.label, 'Respect visuals')
  assert.equal(controls.utilities?.width?.label, 'Wrap width')
  assert.equal(controls.utilities?.x?.label, 'X')
  assert.equal(controls.utilities?.y?.label, 'Y')
  assert.equal(controls.utilities?.htmlSource?.label, 'HTML source')
  assert.equal(Object.hasOwn(controls.utilities ?? {}, 'mode'), false)
  assert.equal(Object.hasOwn(controls.utilities ?? {}, 'arcSide'), false)
  assert.equal(Object.hasOwn(controls.utilities ?? {}, 'arcDegrees'), false)
  assert.equal(controls.deleteAction?.ariaLabel, 'Delete Game title')
  assert.equal(style.backgroundEnabled, true)
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
  controls.utilities?.htmlSource?.onChange(true)
  controls.utilities?.width?.onChange(70)
  controls.utilities?.resetLayout?.()
  controls.deleteAction?.onDelete()

  assert.deepEqual(calls, [
    'reset-style',
    'style-preset:metallic',
    'layout:x:0',
    'layout:y:19.5',
    'layout:width:62',
    'layout:scale:1.05',
    `layout:fontSizePt:${getDefaultDiscTextPointSize('title', 1.05)}`,
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

test('curved disc controls expose menu-owned SVG textPath editing controls', () => {
  const calls: string[] = []
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
    onDiscTextValueChange: (_key, value) => {
      calls.push(`text:${value}`)
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
    textValue: 'Copyright smoke',
  })

  assert.equal(controls.presets?.style?.label, 'Style preset')
  assert.equal(controls.presets?.layout?.label, 'Layout preset')
  assert.equal(
    controls.presets?.layout?.options.some(
      (option) => option.value === 'top-arc',
    ),
    true,
  )
  assert.equal(controls.text?.textValue?.label, 'Copyright/legal text')
  assert.equal(controls.text?.textValue?.value, 'Copyright smoke')
  assert.equal(controls.text?.fontFamily?.label, 'Font')
  assert.equal(controls.text?.size?.label, 'Font size (pt)')
  assert.equal(controls.text?.size?.value, 9)
  assert.equal(controls.text?.size?.step, 0.25)
  assert.equal(controls.text?.bold?.label, 'Bold')
  assert.equal(controls.text?.italic?.label, 'Italic')
  assert.equal(controls.text?.underline?.label, 'Underline')
  assert.equal(controls.text?.unsupported, undefined)
  assert.equal(controls.art?.color?.label, 'Color')
  assert.equal(controls.art?.contrast?.label, 'Contrast')
  assert.equal(controls.utilities?.lineSpacing?.label, 'Line spacing')
  assert.equal(controls.utilities?.x?.label, 'Angle')
  assert.equal(controls.utilities?.y?.label, 'Inset')
  assert.equal(controls.utilities?.arcSide?.label, 'Arc side')
  assert.equal(controls.utilities?.arcDegrees?.label, 'Arc')
  assert.equal(Object.hasOwn(controls.utilities ?? {}, 'htmlSource'), false)
  assert.equal(Object.hasOwn(controls.text ?? {}, 'bulletedList'), false)

  controls.text?.textValue?.onChange('Updated legal text')
  controls.text?.bold?.onChange(true)
  controls.text?.italic?.onChange(true)
  controls.text?.underline?.onChange(true)
  controls.art?.color?.onChange('#ff00aa')
  controls.utilities?.lineSpacing?.onChange(1.2)
  controls.utilities?.x?.onChange(12)
  controls.utilities?.y?.onChange(6)
  controls.utilities?.arcSide?.onChange('top')
  controls.utilities?.arcDegrees?.onChange(220)
  controls.utilities?.resetLayout?.()
  controls.presets?.onReset?.()
  controls.deleteAction?.onDelete()

  assert.deepEqual(calls, [
    'text:Updated legal text',
    'style:bold:true',
    'style:italic:true',
    'style:underline:true',
    'style:color:#ff00aa',
    'layout:scale:1.2',
    'layout:x:12',
    'layout:y:6',
    'arc-side:top',
    'layout:arcDegrees:220',
    'reset-layout',
    'reset-style',
    'enabled:false',
    'selected:null',
  ])
})
