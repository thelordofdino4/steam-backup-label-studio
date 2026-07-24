import assert from 'node:assert/strict'
import test from 'node:test'
import { createDefaultDiscTextLayout } from './index.ts'
import { getStraightDiscTextRenderLayout } from './renderLayout.ts'
import {
  DISC_TEXT_FONT_OPTIONS,
  DISC_TEXT_RENDER_STYLES,
  DISC_TEXT_STYLE_PRESETS,
  applyDiscTextStylePreset,
  areDiscTitlePresetFitStylesEquivalent,
  areDiscTextStylesMeasurementEquivalent,
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
  assert.equal(styles.title.bold, false)
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

test('measurement-style equivalence ignores visual-only fields', () => {
  const baseline = createDefaultDiscTextStyles().title
  const visualOnlyChange = {
    ...baseline,
    backgroundColor: '#ffffff',
    color: '#000000',
    underline: !baseline.underline,
  }

  assert.equal(
    areDiscTextStylesMeasurementEquivalent(baseline, visualOnlyChange),
    true,
  )

  for (const measurementChange of [
    { ...baseline, bold: !baseline.bold },
    { ...baseline, fontFamily: 'georgia' as const },
    { ...baseline, italic: !baseline.italic },
  ]) {
    assert.equal(
      areDiscTextStylesMeasurementEquivalent(baseline, measurementChange),
      false,
    )
  }
})

test('Title preset-fit style equivalence tracks paint and rendered box geometry', () => {
  const baseline = createDefaultDiscTextStyles().title
  const hiddenPadding = { ...baseline, backgroundPadding: 4 }
  const background = {
    ...hiddenPadding,
    backgroundEnabled: true,
  }

  assert.equal(
    areDiscTitlePresetFitStylesEquivalent(baseline, hiddenPadding),
    true,
  )
  assert.equal(
    areDiscTitlePresetFitStylesEquivalent(
      baseline,
      { ...baseline, contrast: 'none' },
    ),
    false,
  )
  assert.equal(
    areDiscTitlePresetFitStylesEquivalent(hiddenPadding, background),
    false,
  )
  assert.equal(
    areDiscTitlePresetFitStylesEquivalent(
      background,
      { ...background, backgroundPadding: 3 },
    ),
    false,
  )
  assert.equal(
    areDiscTitlePresetFitStylesEquivalent(
      background,
      { ...background, borderEnabled: true },
    ),
    false,
  )
  assert.equal(
    areDiscTitlePresetFitStylesEquivalent(
      { ...background, borderEnabled: true },
      { ...background, backgroundEnabled: false, borderEnabled: true },
    ),
    true,
  )
})

test('title bold toggles between supported visible font weights', () => {
  const layout = createDefaultDiscTextLayout('top').title
  const defaultStyles = createDefaultDiscTextStyles()
  const boldStyles = updateDiscTextStyleField(
    defaultStyles,
    'title',
    'bold',
    true,
  )
  const normalStyles = updateDiscTextStyleField(
    defaultStyles,
    'title',
    'bold',
    false,
  )
  const boldRenderLayout = getStraightDiscTextRenderLayout(
    'title',
    'Styled title',
    layout,
    measureText,
    boldStyles,
  )
  const normalRenderLayout = getStraightDiscTextRenderLayout(
    'title',
    'Styled title',
    layout,
    measureText,
    normalStyles,
  )

  assert.equal(DISC_TEXT_RENDER_STYLES.title.fontWeight, 800)
  assert.equal(defaultStyles.title.bold, false)
  assert.equal(boldRenderLayout.fontWeight, 700)
  assert.equal(normalRenderLayout.fontWeight, 400)
  assert.ok(
    boldRenderLayout.fontWeight - normalRenderLayout.fontWeight >= 300,
    'bold and normal title weights should map to visibly distinct font faces',
  )
})

test('normalizes missing title bold as the new regular default while preserving explicit bold', () => {
  const missingBoldStyles = normalizeDiscTextStyles({
    title: {
      fontFamily: 'arial',
      color: '#ffffff',
      contrast: 'strokeShadow',
    },
  })
  const explicitBoldStyles = normalizeDiscTextStyles({
    title: {
      fontFamily: 'arial',
      color: '#ffffff',
      bold: true,
      contrast: 'strokeShadow',
    },
  })

  assert.equal(missingBoldStyles.title.bold, false)
  assert.equal(explicitBoldStyles.title.bold, true)
})

test('supported disc font families use regular 400 and bold 700 render weights', () => {
  const layout = createDefaultDiscTextLayout('top').title

  for (const option of DISC_TEXT_FONT_OPTIONS) {
    const normalStyles = normalizeDiscTextStyles({
      title: {
        fontFamily: option.value,
        color: '#ffffff',
        bold: false,
        contrast: 'strokeShadow',
      },
    })
    const boldStyles = normalizeDiscTextStyles({
      title: {
        fontFamily: option.value,
        color: '#ffffff',
        bold: true,
        contrast: 'strokeShadow',
      },
    })
    const normalRenderLayout = getStraightDiscTextRenderLayout(
      'title',
      'Styled title',
      layout,
      measureText,
      normalStyles,
    )
    const boldRenderLayout = getStraightDiscTextRenderLayout(
      'title',
      'Styled title',
      layout,
      measureText,
      boldStyles,
    )

    assert.equal(normalRenderLayout.fontWeight, 400)
    assert.equal(boldRenderLayout.fontWeight, 700)
    assert.match(normalRenderLayout.font, /^400 /)
    assert.match(boldRenderLayout.font, /^700 /)
  }
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
  assert.equal(renderLayout.fontWeight, 700)
  assert.equal(renderLayout.fontStyle, 'italic')
  assert.equal(renderLayout.style.bold, true)
  assert.equal(renderLayout.style.italic, true)
  assert.equal(renderLayout.style.underline, true)
  assert.equal(renderLayout.style.contrast, 'shadow')
  assert.equal(renderLayout.style.backgroundEnabled, true)
  assert.equal(renderLayout.style.backgroundOpacity, 0.45)
  assert.match(renderLayout.font, /^italic 700 .*Georgia/)
  assert.match(renderLayout.fontFamily, /Georgia/)
})
