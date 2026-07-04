import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDefaultDiscTextLayout,
  type DiscTextKey,
} from '../../discText/index.ts'
import { createDefaultDiscTextStyle } from '../../discText/styles.ts'
import {
  createCurvedDiscTextEditorControls,
  type CurvedDiscTextEditorControlParams,
} from './discInlineTextEditorControls.ts'

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
