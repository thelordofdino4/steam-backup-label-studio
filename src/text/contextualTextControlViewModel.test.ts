import assert from 'node:assert/strict'
import test from 'node:test'
import { CASE_INSERT_TEXT_STYLE_PRESETS } from '../caseInsert/textStyles.ts'
import { DISC_TEXT_STYLE_PRESETS } from '../discText/styles.ts'
import {
  CONTEXTUAL_TEXT_ALIGNMENT_OPTIONS,
  CONTEXTUAL_TEXT_CONTROL_GROUPS,
  CONTEXTUAL_TEXT_CONTROL_LABELS,
  CONTEXTUAL_TEXT_CUSTOM_OPTION,
  CONTEXTUAL_TEXT_CUSTOM_PRESET_VALUE,
  createContextualTextPresetOptions,
  contextualTextNumericValuesMatch,
  findMatchingContextualTextPreset,
  findMatchingContextualTextStylePreset,
  getContextualTextTargetCapability,
  hasContextualTextControlEquivalent,
  isContextualTextControlSupportedForTarget,
  isContextualTextCustomPreset,
} from './contextualTextControlViewModel.ts'

test('shared contextual preset options match case and disc where capabilities overlap', () => {
  assert.deepEqual(
    createContextualTextPresetOptions(CASE_INSERT_TEXT_STYLE_PRESETS),
    createContextualTextPresetOptions(DISC_TEXT_STYLE_PRESETS),
  )
  assert.deepEqual(
    createContextualTextPresetOptions([{ id: 'default', label: 'Default' }]),
    [CONTEXTUAL_TEXT_CUSTOM_OPTION, { label: 'Default', value: 'default' }],
  )
})

test('shared custom option behavior and preset matching stay stable', () => {
  const stylePresets = [
    {
      id: 'bold',
      label: 'Bold',
      style: { bold: true },
    },
  ] as const
  const style = {
    bold: true,
    color: '#ffffff',
  }

  assert.equal(CONTEXTUAL_TEXT_CUSTOM_PRESET_VALUE, 'custom')
  assert.equal(isContextualTextCustomPreset('custom'), true)
  assert.equal(isContextualTextCustomPreset('bold'), false)
  assert.equal(
    findMatchingContextualTextStylePreset(style, stylePresets)?.id,
    'bold',
  )
  assert.equal(
    findMatchingContextualTextStylePreset(
      { ...style, bold: false },
      stylePresets,
    ),
    undefined,
  )
})

test('shared layout matching uses the same numeric tolerance helper', () => {
  const presets = [
    { id: 'near', label: 'Near', layout: { x: 10 } },
    { id: 'far', label: 'Far', layout: { x: 20 } },
  ] as const
  const match = findMatchingContextualTextPreset(presets, (preset) =>
    contextualTextNumericValuesMatch(preset.layout.x, 10.0005),
  )

  assert.equal(match?.id, 'near')
  assert.equal(contextualTextNumericValuesMatch(10, 10.002), false)
})

test('shared groups, labels, and alignment options preserve contextual UI wording', () => {
  assert.deepEqual(CONTEXTUAL_TEXT_CONTROL_GROUPS, [
    { id: 'presets', label: 'Style Presets' },
    { id: 'text', label: 'Text Controls' },
    { id: 'art', label: 'Artistic Elements' },
    { id: 'utilities', label: 'Utilities' },
  ])
  assert.deepEqual(CONTEXTUAL_TEXT_ALIGNMENT_OPTIONS, [
    { value: 'left', label: 'Left' },
    { value: 'center', label: 'Center' },
    { value: 'right', label: 'Right' },
  ])
  assert.equal(CONTEXTUAL_TEXT_CONTROL_LABELS.stylePreset, 'Style preset')
  assert.equal(CONTEXTUAL_TEXT_CONTROL_LABELS.layoutPreset, 'Layout preset')
  assert.equal(CONTEXTUAL_TEXT_CONTROL_LABELS.htmlSource, 'HTML source')
})

test('target capabilities omit unsupported controls and document curved exception', () => {
  const caseInsert = getContextualTextTargetCapability(
    'caseInsertRectangularText',
  )
  const straightDisc = getContextualTextTargetCapability('straightDiscText')
  const curvedCopyright = getContextualTextTargetCapability(
    'curvedDiscCopyrightText',
  )

  assert.equal(caseInsert.supportsContextualEditor, true)
  assert.equal(straightDisc.supportsContextualEditor, true)
  assert.equal(curvedCopyright.supportsContextualEditor, false)
  assert.match(curvedCopyright.sidebarException ?? '', /SVG\/textPath/)
  assert.deepEqual(curvedCopyright.contextualControlIds, [])
  assert.equal(
    isContextualTextControlSupportedForTarget(
      'caseInsertRectangularText',
      'arcDegrees',
    ),
    false,
  )
  assert.equal(
    isContextualTextControlSupportedForTarget('straightDiscText', 'mode'),
    false,
  )
  assert.equal(hasContextualTextControlEquivalent('arcDegrees'), false)
  assert.equal(caseInsert.targetSpecificControlIds.includes('x'), true)
  assert.equal(straightDisc.targetSpecificControlIds.includes('width'), true)
  assert.equal(Object.hasOwn(caseInsert, 'sidebarMigrationComplete'), false)
  assert.equal(Object.hasOwn(straightDisc, 'sidebarMigrationComplete'), false)
})
