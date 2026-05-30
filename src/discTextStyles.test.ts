import assert from 'node:assert/strict'
import test from 'node:test'
import { createDefaultDiscTextLayout } from './discText.ts'
import { getStraightDiscTextRenderLayout } from './discTextRenderLayout.ts'
import {
  DISC_TEXT_RENDER_STYLES,
  applyDiscTextStylePreset,
  createDefaultDiscTextStyles,
  normalizeDiscTextStyles,
  resetDiscTextStyle,
  updateDiscTextStyleField,
} from './discTextStyles.ts'

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

test('applies editable text style presets through the existing style model', () => {
  const defaultStyles = createDefaultDiscTextStyles()
  const presetStyles = applyDiscTextStylePreset(defaultStyles, 'title', 'futuristic')
  const unchangedStyles = applyDiscTextStylePreset(presetStyles, 'title', 'unknown')

  assert.equal(presetStyles.title.fontFamily, 'system')
  assert.equal(presetStyles.title.color, '#7dd3fc')
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

  assert.equal(editedStyles.title.color, '#ffffff')
})

test('applies font, color, contrast, and box style to the shared straight text render model', () => {
  const styles = normalizeDiscTextStyles({
    title: {
      fontFamily: 'georgia',
      color: '#224466',
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
  assert.equal(renderLayout.style.contrast, 'shadow')
  assert.equal(renderLayout.style.backgroundEnabled, true)
  assert.equal(renderLayout.style.backgroundOpacity, 0.45)
  assert.match(renderLayout.font, /Georgia/)
  assert.match(renderLayout.fontFamily, /Georgia/)
})
