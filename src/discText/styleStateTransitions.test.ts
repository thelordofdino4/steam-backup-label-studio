import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clampStraightDiscTextLayoutToSafeZone,
} from '../layout/discElementSafeZone.ts'
import { discTemplates } from '../templates/discTemplates.ts'
import {
  createDefaultDiscTextLayout,
} from './index.ts'
import {
  createDefaultDiscTextStyles,
  resetDiscTextStyle,
  updateDiscTextStyleField,
} from './styles.ts'
import {
  applyDiscTextStylePresetTransition,
  resetDiscTextStyleTransition,
  updateDiscTextStyleFieldTransition,
} from './styleStateTransitions.ts'

const selectedDiscTemplate = discTemplates.standardPrintableDisc

test('disc text style field transition updates styles and clamps the target layout', () => {
  const currentLayout = {
    ...createDefaultDiscTextLayout('none'),
    title: {
      ...createDefaultDiscTextLayout('none').title,
      x: 96,
      y: 96,
    },
  }
  const currentStyles = createDefaultDiscTextStyles()
  const transition = updateDiscTextStyleFieldTransition({
    currentLayout,
    currentStyles,
    field: 'color',
    key: 'title',
    renderedContent: 'A very long title that needs the safe zone',
    selectedDiscTemplate,
    value: '#123456',
  })
  const expectedStyles = updateDiscTextStyleField(
    currentStyles,
    'title',
    'color',
    '#123456',
  )

  assert.deepEqual(transition.styles, expectedStyles)
  assert.deepEqual(
    transition.layout.title,
    clampStraightDiscTextLayoutToSafeZone(
      'title',
      currentLayout.title,
      selectedDiscTemplate,
      'A very long title that needs the safe zone',
      undefined,
      expectedStyles,
    ),
  )
  assert.equal(transition.layout.subtitle, currentLayout.subtitle)
})

test('disc text style reset transition restores default style before clamping', () => {
  const currentLayout = createDefaultDiscTextLayout('bottom')
  const currentStyles = updateDiscTextStyleField(
    createDefaultDiscTextStyles(),
    'customNote',
    'backgroundEnabled',
    true,
  )
  const transition = resetDiscTextStyleTransition({
    currentLayout,
    currentStyles,
    key: 'customNote',
    renderedContent: 'Manual note',
    selectedDiscTemplate,
  })
  const expectedStyles = resetDiscTextStyle(currentStyles, 'customNote')

  assert.deepEqual(transition.styles.customNote, expectedStyles.customNote)
  assert.deepEqual(
    transition.layout.customNote,
    clampStraightDiscTextLayoutToSafeZone(
      'customNote',
      currentLayout.customNote,
      selectedDiscTemplate,
      'Manual note',
      undefined,
      expectedStyles,
    ),
  )
})

test('disc text style preset transition keeps typography preset and layout clamp together', () => {
  const currentLayout = createDefaultDiscTextLayout('top')
  const currentStyles = createDefaultDiscTextStyles()
  const transition = applyDiscTextStylePresetTransition({
    currentLayout,
    currentStyles,
    key: 'developer',
    presetId: 'gritty',
    renderedContent: 'Developer: Valve',
    selectedDiscTemplate,
  })

  assert.equal(transition.styles.developer.fontFamily, 'courier')
  assert.equal(transition.styles.developer.color, '#fde68a')
  assert.equal(transition.styles.publisher.color, currentStyles.publisher.color)
  assert.deepEqual(
    transition.layout.developer,
    clampStraightDiscTextLayoutToSafeZone(
      'developer',
      currentLayout.developer,
      selectedDiscTemplate,
      'Developer: Valve',
      undefined,
      transition.styles,
    ),
  )
})
