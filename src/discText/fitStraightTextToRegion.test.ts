import assert from 'node:assert/strict'
import test from 'node:test'

import { parseHtmlText } from '../text/htmlText.ts'
import { discTemplates } from '../templates/discTemplates.ts'
import {
  fitStraightDiscTextToRegion,
} from './fitStraightTextToRegion.ts'
import { createDefaultDiscTextLayout } from './index.ts'
import { createDefaultDiscTextStyles } from './styles.ts'

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
  const short = fit('Copyright 2026 Example Studios.')
  const realistic = fit(
    'Copyright 2026 Example Studios. Published by Example Publishing. ' +
    'Steam and the Steam logo are trademarks of Valve Corporation. ' +
    'All other trademarks are property of their respective owners.',
  )

  assert.equal(short.status, 'fitted')
  assert.equal(
    short.status === 'fitted' ? short.layout.fontSizePt : null,
    7,
  )
  assert.equal(realistic.status, 'fitted')
  assert.ok(
    realistic.status === 'fitted' &&
      realistic.layout.fontSizePt >= 3 &&
      realistic.layout.fontSizePt <= 7,
  )
})

test('dense Legal content reports deterministic adjustment warnings', () => {
  const result = fit(
    Array.from(
      { length: 12 },
      (_, index) => `Clause ${index + 1}: reserved legal terms`,
    ).join(' '),
  )

  assert.equal(result.status, 'fitted')
  if (result.status !== 'fitted') return
  assert.ok(result.layout.fontSizePt < 7)
  assert.ok(result.warnings.includes('text-fit-adjusted'))
})

test('line breaks and rich run measurement participate in fitting', () => {
  const richText = parseHtmlText(
    '<strong>Copyright 2026 Example Studios.</strong><br>' +
    '<em>Published by Example Publishing.</em><br>' +
    '<span style="font-family: Georgia">All rights reserved.</span>',
  )
  const result = fit(richText.plainText, richText)

  assert.equal(result.status, 'fitted')
  assert.ok(result.status === 'fitted' && result.layout.fontSizePt <= 7)
})

test('content that cannot fit at 3pt is reported without truncation', () => {
  const result = fit(
    Array.from({ length: 24 }, (_, index) => `Legal line ${index + 1}`)
      .join('\n'),
  )

  assert.equal(result.status, 'impossible')
  assert.deepEqual(result.warnings, ['text-fit-impossible'])
})
