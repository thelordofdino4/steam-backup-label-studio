import assert from 'node:assert/strict'
import test from 'node:test'
import { createDefaultDiscTextLayout } from './index.ts'
import { getStraightDiscTextRenderLayout } from './renderLayout.ts'
import {
  DISC_TEXT_RENDER_STYLES,
  DISC_TEXT_STYLE_PRESETS,
  applyDiscTextStylePreset,
  createDefaultDiscTextStyles,
  normalizeDiscTextStyles,
  resetDiscTextStyle,
  updateDiscTextStyleField,
} from './styles.ts'

const measureText = (text: string, font: string) => {
  const fontSizeMatch = font.match(/(\d+(?:\.\d+)?)px/)
  const fontSize = fontSizeMatch ? Number(fontSizeMatch[1]) : 1
  const widthMultiplier = font.includes('Georgia') ? 0.62 : 0.58

  return Array.from(text).length * fontSize * widthMultiplier
}

test('creates disc text style defaults that preserve the existing render baseline', () => {
  const styles = createDefaultDiscTextStyles()

  assert.equal(styles.title.fontFamily, 'arial')
  assert.equal(styles.title.color, DISC_TEXT_RENDER_STYLES.title.color)
  assert.equal(styles.title.bold, true)
  assert.equal(styles.title.italic, false)
  assert.equal(styles.title.underline, false)
  assert.equal(styles.title.contrast, 'strokeShadow')
  assert.equal(styles.title.backgroundEnabled, false)
  assert.equal(styles.title.borderEnabled, false)
  assert.equal(styles.copyright.color, DISC_TEXT_RENDER_STYLES.copyright.color)
})

test('normalizes missing and invalid saved disc text styles safely', () => {
  const styles = normalizeDiscTextStyles({
    title: {
      fontFamily: 'papyrus' as never,
      color: 'red',
      bold: true,
      italic: 'yes' as never,
      underline: true,
      contrast: 'glow' as never,
      backgroundEnabled: true,
      backgroundColor: '#ABCDEF',
      backgroundOpacity: 2,
      backgroundPadding: -1,
      borderEnabled: true,
      borderColor: '#123456',
      borderRadius: 9,
    },
  })

  assert.equal(styles.title.fontFamily, 'arial')
  assert.equal(styles.title.color, DISC_TEXT_RENDER_STYLES.title.color)
  assert.equal(styles.title.bold, true)
  assert.equal(styles.title.italic, false)
  assert.equal(styles.title.underline, true)
  assert.equal(styles.title.contrast, 'strokeShadow')
  assert.equal(styles.title.backgroundEnabled, true)
  assert.equal(styles.title.backgroundColor, '#abcdef')
  assert.equal(styles.title.backgroundOpacity, 1)
  assert.equal(styles.title.backgroundPadding, 0)
  assert.equal(styles.title.borderEnabled, true)
  assert.equal(styles.title.borderColor, '#123456')
  assert.equal(styles.title.borderRadius, 4)
  assert.equal(styles.subtitle.backgroundEnabled, false)
})

test('updates and resets a single disc text style without touching other text elements', () => {
  const defaultStyles = createDefaultDiscTextStyles()
  const updatedStyles = updateDiscTextStyleField(
    defaultStyles,
    'title',
    'color',
    '#224466',
  )
  const resetStyles = resetDiscTextStyle(updatedStyles, 'title')

  assert.equal(updatedStyles.title.color, '#224466')
  assert.equal(updatedStyles.subtitle.color, defaultStyles.subtitle.color)
  assert.equal(resetStyles.title.color, defaultStyles.title.color)
})

test('title bold toggles between supported visible font weights', () => {
  const layout = createDefaultDiscTextLayout('top').title
  const defaultStyles = createDefaultDiscTextStyles()
  const normalStyles = updateDiscTextStyleField(
    defaultStyles,
    'title',
    'bold',
    false,
  )
  const defaultRenderLayout = getStraightDiscTextRenderLayout(
    'title',
    'Styled title',
    layout,
    measureText,
    defaultStyles,
  )
  const normalRenderLayout = getStraightDiscTextRenderLayout(
    'title',
    'Styled title',
    layout,
    measureText,
    normalStyles,
  )

  assert.equal(DISC_TEXT_RENDER_STYLES.title.fontWeight, 800)
  assert.equal(defaultRenderLayout.fontWeight, 900)
  assert.equal(normalRenderLayout.fontWeight, 800)
})

test('style preset catalog covers the issue themes with complete editable style values', () => {
  const presetIds = DISC_TEXT_STYLE_PRESETS.map((preset) => preset.id)
  const expectedStyleFields = [
    'backgroundColor',
    'backgroundEnabled',
    'backgroundOpacity',
    'backgroundPadding',
    'bold',
    'borderColor',
    'borderEnabled',
    'borderRadius',
    'color',
    'contrast',
    'fontFamily',
    'italic',
    'underline',
  ]

  assert.deepEqual(presetIds, ['metallic', 'futuristic', 'horror', 'gritty'])

  for (const preset of DISC_TEXT_STYLE_PRESETS) {
    assert.deepEqual(Object.keys(preset.style).sort(), expectedStyleFields)

    const normalized = normalizeDiscTextStyles({ title: preset.style })
    assert.deepEqual(normalized.title, preset.style)
  }
})

test('applies editable text style presets through the existing style model', () => {
  const defaultStyles = createDefaultDiscTextStyles()
  const presetStyles = applyDiscTextStylePreset(defaultStyles, 'title', 'futuristic')
  const unchangedStyles = applyDiscTextStylePreset(presetStyles, 'title', 'unknown')

  assert.equal(presetStyles.title.fontFamily, 'system')
  assert.equal(presetStyles.title.color, '#67e8f9')
  assert.equal(presetStyles.title.bold, false)
  assert.equal(presetStyles.title.italic, false)
  assert.equal(presetStyles.title.underline, false)
  assert.equal(presetStyles.title.backgroundEnabled, true)
  assert.equal(presetStyles.title.borderEnabled, true)
  assert.equal(presetStyles.subtitle.color, defaultStyles.subtitle.color)
  assert.deepEqual(unchangedStyles, presetStyles)

  const editedStyles = updateDiscTextStyleField(
    presetStyles,
    'title',
    'color',
    '#ffffff',
  )
  const emphasizedStyles = updateDiscTextStyleField(
    updateDiscTextStyleField(
      updateDiscTextStyleField(editedStyles, 'title', 'bold', true),
      'title',
      'italic',
      true,
    ),
    'title',
    'underline',
    true,
  )

  assert.equal(editedStyles.title.color, '#ffffff')
  assert.equal(emphasizedStyles.title.bold, true)
  assert.equal(emphasizedStyles.title.italic, true)
  assert.equal(emphasizedStyles.title.underline, true)

  const resetStyles = resetDiscTextStyle(editedStyles, 'title')

  assert.deepEqual(resetStyles.title, defaultStyles.title)
})

test('preset-applied styles feed the shared straight text render model', () => {
  const styles = applyDiscTextStylePreset(
    createDefaultDiscTextStyles(),
    'customNote',
    'gritty',
  )
  const layout = createDefaultDiscTextLayout('top').customNote
  const renderLayout = getStraightDiscTextRenderLayout(
    'customNote',
    'No disc left behind',
    layout,
    measureText,
    styles,
  )

  assert.equal(renderLayout.color, '#fde68a')
  assert.equal(renderLayout.style.fontFamily, 'courier')
  assert.equal(renderLayout.style.contrast, 'stroke')
  assert.equal(renderLayout.style.backgroundEnabled, true)
  assert.equal(renderLayout.style.borderEnabled, true)
  assert.equal(renderLayout.style.borderColor, '#a16207')
  assert.match(renderLayout.fontFamily, /Courier New/)
})

test('applies font, color, contrast, and box style to the shared straight text render model', () => {
  const styles = normalizeDiscTextStyles({
    title: {
      fontFamily: 'georgia',
      color: '#224466',
      bold: true,
      italic: true,
      underline: true,
      contrast: 'shadow',
      backgroundEnabled: true,
      backgroundColor: '#101820',
      backgroundOpacity: 0.45,
      backgroundPadding: 1.6,
    },
  })
  const layout = createDefaultDiscTextLayout('top').title
  const renderLayout = getStraightDiscTextRenderLayout(
    'title',
    'Styled title',
    layout,
    measureText,
    styles,
  )

  assert.equal(renderLayout.color, '#224466')
  assert.equal(renderLayout.fontWeight, 900)
  assert.equal(renderLayout.fontStyle, 'italic')
  assert.equal(renderLayout.style.bold, true)
  assert.equal(renderLayout.style.italic, true)
  assert.equal(renderLayout.style.underline, true)
  assert.equal(renderLayout.style.contrast, 'shadow')
  assert.equal(renderLayout.style.backgroundEnabled, true)
  assert.equal(renderLayout.style.backgroundOpacity, 0.45)
  assert.match(renderLayout.font, /^italic 900 .*Georgia/)
  assert.match(renderLayout.fontFamily, /Georgia/)
})
