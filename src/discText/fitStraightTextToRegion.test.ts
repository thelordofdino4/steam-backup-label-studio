import assert from 'node:assert/strict'
import test from 'node:test'

import { parseHtmlText } from '../text/htmlText.ts'
import { discTemplates } from '../templates/discTemplates.ts'
import {
  fitStraightDiscTextToRegion,
} from './fitStraightTextToRegion.ts'
import { createDefaultDiscTextLayout } from './index.ts'
import { getDefaultDiscTextPointSize } from './pointSize.ts'
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
  expectedRegion = region,
) {
  assert.ok(
    Math.abs(bounds.centerX - expectedRegion.centerXPercent) <=
      NORMALIZED_CENTER_TOLERANCE,
    `Expected visual center X ${bounds.centerX} to match ` +
      `${expectedRegion.centerXPercent} within ${NORMALIZED_CENTER_TOLERANCE}`,
  )
  assert.ok(
    Math.abs(bounds.centerY - expectedRegion.centerYPercent) <=
      NORMALIZED_CENTER_TOLERANCE,
    `Expected visual center Y ${bounds.centerY} to match ` +
      `${expectedRegion.centerYPercent} within ${NORMALIZED_CENTER_TOLERANCE}`,
  )

  const regionLeft = expectedRegion.centerXPercent - expectedRegion.widthPercent / 2
  const regionRight = expectedRegion.centerXPercent + expectedRegion.widthPercent / 2
  const regionTop = expectedRegion.centerYPercent - expectedRegion.heightPercent / 2
  const regionBottom = expectedRegion.centerYPercent + expectedRegion.heightPercent / 2

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

test('Legal fitting remains independent of straight paint contrast', () => {
  const content =
    'Copyright 2026 Example Studios. Published by Example Publishing. ' +
    'All rights reserved.'
  const baseline = fit(content)
  const withoutPaintContrast = fitStraightDiscTextToRegion({
    key: 'copyright',
    content,
    currentLayout,
    measureText,
    region,
    styles: {
      ...styles,
      copyright: { ...styles.copyright, contrast: 'none' },
    },
    template,
  })

  assert.deepEqual(withoutPaintContrast, baseline)
})

test('resolved preset rectangle is authoritative when it overlaps the template inner hole', () => {
  const authoritativeRegion = Object.freeze({
    centerXPercent: 50,
    centerYPercent: 50,
    widthPercent: 24,
    heightPercent: 10,
  })
  const content = 'Rectangle-owned placement'
  const result = fitStraightDiscTextToRegion({
    key: 'copyright',
    includeRenderedBoxBounds: true,
    includeRenderedPaintBounds: true,
    content,
    currentLayout,
    measureText,
    region: authoritativeRegion,
    styles,
    template,
  })

  assert.equal(result.status, 'fitted')
  if (result.status !== 'fitted') return

  const bounds = getStraightDiscTextVisualBounds(
    getStraightDiscTextRenderLayout(
      'copyright',
      content,
      result.layout,
      measureText,
      styles,
      { template },
    ),
    measureText,
    { includeRenderedBox: true, includeRenderedPaint: true },
  )

  expectBoundsCenterToMatchRegion(bounds, authoritativeRegion)
})

const titleRegion = Object.freeze({
  centerXPercent: 50,
  centerYPercent: 19.5,
  widthPercent: 62,
  heightPercent: 16,
})
const titleLayout = createDefaultDiscTextLayout('top', template).title
const titlePreferredPointSize = getDefaultDiscTextPointSize(
  'title',
  1,
  template,
  'straight',
)

function fitTitle(
  content: string,
  richText?: ReturnType<typeof parseHtmlText>,
  titleStyle = styles.title,
) {
  return fitStraightDiscTextToRegion({
    key: 'title',
    includeRenderedBoxBounds: true,
    includeRenderedPaintBounds: true,
    content,
    currentLayout: titleLayout,
    measureText,
    minimumPointSize: 8,
    pointSizeStep: 0.25,
    preferredPointSize: titlePreferredPointSize,
    region: titleRegion,
    richText,
    styles: { ...styles, title: titleStyle },
    template,
  })
}

function getTitleFitBounds(
  content: string,
  result: Extract<ReturnType<typeof fitTitle>, { status: 'fitted' }>,
  richText?: ReturnType<typeof parseHtmlText>,
  titleStyle = styles.title,
) {
  return getStraightDiscTextVisualBounds(
    getStraightDiscTextRenderLayout(
      'title',
      content,
      result.layout,
      measureText,
      { ...styles, title: titleStyle },
      richText ? { richText, template } : { template },
    ),
    measureText,
    { includeRenderedBox: true, includeRenderedPaint: true },
  )
}

test('short Title text stays at its preferred size without border-seeking enlargement', () => {
  const content = 'Portal 2'
  const result = fitTitle(content)

  assert.equal(result.status, 'fitted')
  if (result.status !== 'fitted') return
  assert.equal(result.layout.fontSizePt, titlePreferredPointSize)
  assert.ok(result.layout.y < titleRegion.centerYPercent)
  const bounds = getTitleFitBounds(content, result)
  expectBoundsCenterToMatchRegion(bounds, titleRegion)
  assert.ok(bounds.halfWidth * 2 < titleRegion.widthPercent)
  assert.ok(bounds.halfHeight * 2 < titleRegion.heightPercent)
})

test('Title fitting contains the exact 31-glyph straight-stroke boundary repro', () => {
  const content = 'M'.repeat(31)
  const strokeStyle = { ...styles.title, contrast: 'stroke' as const }
  const measureStrokeRepro = (text: string, font: string) => {
    const fontSize = Number(font.match(/(\d+(?:\.\d+)?)px/)?.[1] ?? 1)
    return Array.from(text).length * fontSize * 0.554
  }
  const candidateLayout = {
    ...titleLayout,
    x: titleRegion.centerXPercent - 50,
    y: titleRegion.centerYPercent,
    width: titleRegion.widthPercent,
    fontSizePt: titlePreferredPointSize,
    align: 'center' as const,
    mode: 'straight' as const,
    avoidVisualElements: false,
  }
  const candidateRenderLayout = getStraightDiscTextRenderLayout(
    'title',
    content,
    candidateLayout,
    measureStrokeRepro,
    { ...styles, title: strokeStyle },
    { template },
  )
  const logicalBounds = getStraightDiscTextVisualBounds(
    candidateRenderLayout,
    measureStrokeRepro,
  )
  const paintedBounds = getStraightDiscTextVisualBounds(
    candidateRenderLayout,
    measureStrokeRepro,
    { includeRenderedPaint: true },
  )

  assert.ok(Math.abs(
    logicalBounds.centerX - logicalBounds.halfWidth - 19.0868,
  ) <= NORMALIZED_CENTER_TOLERANCE)
  assert.ok(Math.abs(
    logicalBounds.centerX + logicalBounds.halfWidth - 80.9132,
  ) <= NORMALIZED_CENTER_TOLERANCE)
  assert.ok(Math.abs(
    paintedBounds.centerX - paintedBounds.halfWidth - 18.9468,
  ) <= NORMALIZED_CENTER_TOLERANCE)
  assert.ok(Math.abs(
    paintedBounds.centerX + paintedBounds.halfWidth - 81.0532,
  ) <= NORMALIZED_CENTER_TOLERANCE)

  const result = fitStraightDiscTextToRegion({
    key: 'title',
    includeRenderedBoxBounds: true,
    includeRenderedPaintBounds: true,
    content,
    currentLayout: titleLayout,
    measureText: measureStrokeRepro,
    minimumPointSize: 8,
    pointSizeStep: 0.25,
    preferredPointSize: titlePreferredPointSize,
    region: titleRegion,
    styles: { ...styles, title: strokeStyle },
    template,
  })

  assert.equal(result.status, 'fitted')
  if (result.status !== 'fitted') return
  assert.ok(result.layout.width < titleRegion.widthPercent)
  const finalBounds = getStraightDiscTextVisualBounds(
    getStraightDiscTextRenderLayout(
      'title',
      content,
      result.layout,
      measureStrokeRepro,
      { ...styles, title: strokeStyle },
      { template },
    ),
    measureStrokeRepro,
    { includeRenderedBox: true, includeRenderedPaint: true },
  )
  expectBoundsCenterToMatchRegion(finalBounds, titleRegion)
})

test('long Title text shrinks deterministically in quarter-point steps', () => {
  const content =
    'The Unreasonably Elaborate Adventures of a Very Determined Archivist ' +
    'Through Time and Space'
  const first = fitTitle(content)
  const second = fitTitle(content)

  assert.deepEqual(first, second)
  assert.equal(first.status, 'fitted')
  if (first.status !== 'fitted') return
  assert.ok(first.layout.fontSizePt < titlePreferredPointSize)
  assert.ok(first.layout.fontSizePt >= 8)
  assert.ok(
    Math.abs(
      (titlePreferredPointSize - first.layout.fontSizePt) / 0.25 -
      Math.round(
        (titlePreferredPointSize - first.layout.fontSizePt) / 0.25,
      ),
    ) <= NORMALIZED_CENTER_TOLERANCE,
  )
  expectBoundsCenterToMatchRegion(
    getTitleFitBounds(content, first),
    titleRegion,
  )
})

test('Title line breaks and HTML-rich measurement remain centered and contained', () => {
  const richText = parseHtmlText(
    '<strong>A Long Game Title</strong><br>' +
    '<span style="font-family: Georgia"><em>Definitive Edition</em></span>',
  )
  const result = fitTitle(richText.plainText, richText)

  assert.equal(result.status, 'fitted')
  if (result.status !== 'fitted') return
  assert.ok(result.layout.fontSizePt <= titlePreferredPointSize)
  expectBoundsCenterToMatchRegion(
    getTitleFitBounds(richText.plainText, result, richText),
    titleRegion,
  )
})

test('nested 96px rich Title run is rejected by paint-precedence containment', () => {
  const richText = parseHtmlText(
    '<span style="font-size:12pt"><span style="font-size:96px">I</span></span>',
  )
  const candidateLayout = {
    ...titleLayout,
    x: titleRegion.centerXPercent - 50,
    y: titleRegion.centerYPercent,
    width: titleRegion.widthPercent,
    fontSizePt: titlePreferredPointSize,
    align: 'center' as const,
    mode: 'straight' as const,
    avoidVisualElements: false,
  }
  const candidateBounds = getStraightDiscTextVisualBounds(
    getStraightDiscTextRenderLayout(
      'title',
      richText.plainText,
      candidateLayout,
      measureText,
      styles,
      { richText, template },
    ),
    measureText,
  )
  const result = fitTitle(richText.plainText, richText)

  assert.ok(candidateBounds.halfHeight * 2 > titleRegion.heightPercent)
  assert.equal(result.status, 'impossible')
  assert.deepEqual(result.warnings, ['text-fit-impossible'])
})

test('Title fitting contains the rendered background padding and border stroke', () => {
  const content = 'M'.repeat(31)
  const decoratedStyle = {
    ...styles.title,
    backgroundEnabled: true,
    backgroundPadding: 0.75,
    borderEnabled: true,
  }
  const result = fitTitle(content, undefined, decoratedStyle)

  assert.equal(result.status, 'fitted')
  if (result.status !== 'fitted') return
  assert.equal(result.layout.fontSizePt, titlePreferredPointSize)
  assert.deepEqual(result.warnings, [])
  expectBoundsCenterToMatchRegion(
    getTitleFitBounds(content, result, undefined, decoratedStyle),
    titleRegion,
  )
})

test('impossible multiline Title text fails at the 8pt readability floor', () => {
  const content = Array.from(
    { length: 20 },
    (_, index) => `Unabridged title line ${index + 1}`,
  ).join('\n')
  const result = fitTitle(content)

  assert.equal(result.status, 'impossible')
  assert.deepEqual(result.warnings, ['text-fit-impossible'])
  assert.ok(content.endsWith('Unabridged title line 20'))
})
