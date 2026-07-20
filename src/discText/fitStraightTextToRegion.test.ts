import assert from 'node:assert/strict'
import test from 'node:test'

import { parseHtmlText } from '../text/htmlText.ts'
import { discTemplates } from '../templates/discTemplates.ts'
import {
  fitStraightDiscTextToRegion,
} from './fitStraightTextToRegion.ts'
import { createDefaultDiscTextLayout } from './index.ts'
import {
  getStraightDiscTextRenderLayout,
  getStraightDiscTextVisualBounds,
  type StraightDiscTextVisualBounds,
} from './renderLayout.ts'
import { createDefaultDiscTextStyles } from './styles.ts'

const NORMALIZED_CENTER_TOLERANCE = 0.001
const template = discTemplates.standardPrintableDisc
const currentLayout = createDefaultDiscTextLayout(
  'top',
  template,
).copyright
const styles = createDefaultDiscTextStyles()
const region = Object.freeze({
  centerXPercent: 50,
  centerYPercent: 85,
  widthPercent: 46,
  heightPercent: 8,
})
const measureText = (text: string, font: string) => {
  const fontSize = Number(font.match(/(\d+(?:\.\d+)?)px/)?.[1] ?? 1)
  return Array.from(text).length * fontSize * 0.55
}

function fit(content: string, richText?: ReturnType<typeof parseHtmlText>) {
  return fitStraightDiscTextToRegion({
    key: 'copyright',
    content,
    currentLayout,
    measureText,
    region,
    richText,
    styles,
    template,
  })
}

function expectBoundsCenterToMatchRegion(
  bounds: StraightDiscTextVisualBounds,
) {
  assert.ok(
    Math.abs(bounds.centerX - region.centerXPercent) <=
      NORMALIZED_CENTER_TOLERANCE,
    `Expected visual center X ${bounds.centerX} to match ` +
      `${region.centerXPercent} within ${NORMALIZED_CENTER_TOLERANCE}`,
  )
  assert.ok(
    Math.abs(bounds.centerY - region.centerYPercent) <=
      NORMALIZED_CENTER_TOLERANCE,
    `Expected visual center Y ${bounds.centerY} to match ` +
      `${region.centerYPercent} within ${NORMALIZED_CENTER_TOLERANCE}`,
  )

  const regionLeft = region.centerXPercent - region.widthPercent / 2
  const regionRight = region.centerXPercent + region.widthPercent / 2
  const regionTop = region.centerYPercent - region.heightPercent / 2
  const regionBottom = region.centerYPercent + region.heightPercent / 2

  assert.ok(
    bounds.centerX - bounds.halfWidth >=
      regionLeft - NORMALIZED_CENTER_TOLERANCE,
  )
  assert.ok(
    bounds.centerX + bounds.halfWidth <=
      regionRight + NORMALIZED_CENTER_TOLERANCE,
  )
  assert.ok(
    bounds.centerY - bounds.halfHeight >=
      regionTop - NORMALIZED_CENTER_TOLERANCE,
  )
  assert.ok(
    bounds.centerY + bounds.halfHeight <=
      regionBottom + NORMALIZED_CENTER_TOLERANCE,
  )
}

function fitAndExpectVisualBoundsParity(
  content: string,
  richText?: ReturnType<typeof parseHtmlText>,
) {
  const result = fit(content, richText)

  assert.equal(result.status, 'fitted')
  if (result.status !== 'fitted') {
    assert.fail('Expected Legal content to fit')
  }

  const renderLayout = getStraightDiscTextRenderLayout(
    'copyright',
    content,
    result.layout,
    measureText,
    styles,
    richText ? { richText, template } : { template },
  )
  const bounds = getStraightDiscTextVisualBounds(
    renderLayout,
    measureText,
  )

  expectBoundsCenterToMatchRegion(bounds)
  return result
}

test('blank Legal content receives dormant centered 7pt placement', () => {
  const result = fit('')

  assert.equal(result.status, 'fitted')
  if (result.status !== 'fitted') return
  assert.equal(result.layout.x, 0)
  assert.equal(result.layout.y, 85)
  assert.equal(result.layout.width, 46)
  assert.equal(result.layout.fontSizePt, 7)
  assert.equal(result.layout.align, 'center')
  assert.equal(result.layout.mode, 'straight')
  assert.equal(result.layout.avoidVisualElements, false)
  assert.deepEqual(result.warnings, [])
})

test('short and realistic Legal content fit without truncation', () => {
  const short = fitAndExpectVisualBoundsParity(
    'Copyright 2026 Example Studios.',
  )
  const realistic = fitAndExpectVisualBoundsParity(
    'Copyright 2026 Example Studios. Published by Example Publishing. ' +
    'Steam and the Steam logo are trademarks of Valve Corporation. ' +
    'All other trademarks are property of their respective owners.',
  )

  assert.equal(short.layout.fontSizePt, 7)
  assert.ok(
    realistic.layout.fontSizePt >= 3 &&
      realistic.layout.fontSizePt <= 7,
  )
})

test('dense Legal content reports deterministic adjustment warnings', () => {
  const result = fitAndExpectVisualBoundsParity(
    Array.from(
      { length: 12 },
      (_, index) => `Clause ${index + 1}: reserved legal terms`,
    ).join(' '),
  )

  assert.ok(result.layout.fontSizePt < 7)
  assert.ok(result.warnings.includes('text-fit-adjusted'))
})

test('line breaks and rich run measurement participate in fitting', () => {
  const richText = parseHtmlText(
    '<strong>Copyright 2026 Example Studios.</strong><br>' +
    '<em>Published by Example Publishing.</em><br>' +
    '<span style="font-family: Georgia">All rights reserved.</span>',
  )
  const result = fitAndExpectVisualBoundsParity(
    richText.plainText,
    richText,
  )

  assert.ok(result.layout.fontSizePt <= 7)
})

test('content that cannot fit at 3pt is reported without truncation', () => {
  const result = fit(
    Array.from({ length: 24 }, (_, index) => `Legal line ${index + 1}`)
      .join('\n'),
  )

  assert.equal(result.status, 'impossible')
  assert.deepEqual(result.warnings, ['text-fit-impossible'])
})
