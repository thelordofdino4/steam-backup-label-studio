import assert from 'node:assert/strict'
import test from 'node:test'
import {
  estimateCaseInsertTextFit,
  getCaseInsertBackTextBlockReadabilityRole,
  getCaseInsertBackTextBlockRole,
  getCaseInsertTextReadabilityWarnings,
  type CaseInsertTextLayout,
} from './textReadability.ts'

function createLayout(
  overrides: Partial<CaseInsertTextLayout> = {},
): CaseInsertTextLayout {
  return {
    bounds: {
      x: 0,
      y: 0,
      width: 640,
      height: 180,
    },
    fontSizePx: 20,
    lineHeightPx: 24,
    ...overrides,
  }
}

test('case insert readability allows comfortable print text', () => {
  const warnings = getCaseInsertTextReadabilityWarnings({
    label: 'Description',
    text: 'A compact back-cover description with room to breathe.',
    layout: createLayout(),
    role: 'description',
  })

  assert.deepEqual(warnings, [])
})

test('case insert readability warns for print text below role threshold', () => {
  const warnings = getCaseInsertTextReadabilityWarnings({
    label: 'Left spine title',
    text: 'Very Small Title',
    layout: createLayout({
      bounds: { x: 0, y: 0, width: 420, height: 48 },
      fontSizePx: 10,
      lineHeightPx: 11,
    }),
    role: 'spine',
  })

  assert.ok(warnings.some((warning) =>
    /Left spine title uses 10px spine title text/.test(warning)))
})

test('case insert readability warns when text overflows its box', () => {
  const longDescription = Array.from(
    { length: 18 },
    (_, index) => `Overflow sentence ${index + 1} with enough words to wrap.`,
  ).join(' ')
  const warnings = getCaseInsertTextReadabilityWarnings({
    label: 'Description',
    text: longDescription,
    layout: createLayout({
      bounds: { x: 0, y: 0, width: 260, height: 70 },
      fontSizePx: 18,
      lineHeightPx: 22,
    }),
    role: 'description',
  })

  assert.ok(warnings.some((warning) =>
    /Description may overflow its text box/.test(warning)))
})

test('case insert readability warns when text nearly fills its box', () => {
  const layout = createLayout({
    bounds: { x: 0, y: 0, width: 260, height: 144 },
    fontSizePx: 20,
    lineHeightPx: 24,
  })
  const fit = estimateCaseInsertTextFit('one\ntwo\nthree\nfour\nfive', layout)
  const warnings = getCaseInsertTextReadabilityWarnings({
    label: 'Feature bullets',
    text: 'one\ntwo\nthree\nfour\nfive',
    layout,
    role: 'features',
  })

  assert.equal(fit.maxLines, 5)
  assert.equal(fit.requiredLines, 5)
  assert.ok(warnings.includes(
    'Feature bullets nearly fills its text box and may look crowded in print.',
  ))
})

test('case insert back text ids map to layout and readability roles', () => {
  assert.equal(
    getCaseInsertBackTextBlockRole({ id: 'tray-description' }),
    'description',
  )
  assert.equal(
    getCaseInsertBackTextBlockRole({ id: 'tray-minimum-requirements' }),
    'minimumRequirements',
  )
  assert.equal(
    getCaseInsertBackTextBlockRole({ id: 'tray-recommended-requirements' }),
    'recommendedRequirements',
  )
  assert.equal(
    getCaseInsertBackTextBlockRole({ id: 'tray-legal-text' }),
    'legalText',
  )
  assert.equal(
    getCaseInsertBackTextBlockReadabilityRole('minimumRequirements'),
    'requirements',
  )
  assert.equal(
    getCaseInsertBackTextBlockReadabilityRole('recommendedRequirements'),
    'requirements',
  )
  assert.equal(getCaseInsertBackTextBlockReadabilityRole('legalText'), 'legal')
})
