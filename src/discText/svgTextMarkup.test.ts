import assert from 'node:assert/strict'
import test from 'node:test'
import { createDefaultDiscTextLayout } from './index.ts'
import {
  buildStraightTextLineContent,
  buildStraightTextMarkup,
  buildTextStyleAttribute,
} from './svgTextMarkup.ts'
import { getResolvedDiscTextRenderStyle } from './styles.ts'

function measureTextAsCharacters(text: string) {
  return Array.from(text).length
}

test('disc SVG text style helper preserves stroke and shadow filter semantics', () => {
  const style = getResolvedDiscTextRenderStyle('title', {
    title: {
      contrast: 'strokeShadow',
    },
  })

  const withShadow = buildTextStyleAttribute(style, 'shadow-id', 3, 700, 0.28)
  const withoutShadow = buildTextStyleAttribute(
    style,
    'shadow-id',
    3,
    700,
    0.28,
    undefined,
    { includeShadowFilter: false },
  )

  assert.match(withShadow, /filter:url\(#shadow-id\)/)
  assert.match(withShadow, /stroke:rgba\(0, 0, 0, 0\.58\)/)
  assert.match(withShadow, /stroke-width:0\.28px/)
  assert.doesNotMatch(withoutShadow, /filter:url/)
  assert.match(withoutShadow, /stroke:rgba\(0, 0, 0, 0\.58\)/)
})

test('straight SVG line content escapes rich text runs inside tspans', () => {
  const content = buildStraightTextLineContent(
    [
      {
        bold: true,
        font: '700 3px Arial',
        text: '<Bold>',
        width: 6,
      },
    ],
    '<fallback>',
  )

  assert.equal(content, '<tspan style="font-weight:700">&lt;Bold&gt;</tspan>')
})

test('straight SVG markup can hide selected glyphs while preserving paint boxes', () => {
  const layout = createDefaultDiscTextLayout('none').title
  const markup = buildStraightTextMarkup(
    'title',
    'Hidden selected title',
    layout,
    measureTextAsCharacters,
    'shadow-id',
    {
      title: {
        backgroundEnabled: true,
        borderEnabled: true,
      },
    },
    [],
    true,
  )

  assert.match(markup, /class="disc-text-render-box"/)
  assert.doesNotMatch(markup, /class="disc-text-render-text"/)
  assert.doesNotMatch(markup, /Hidden selected title/)
})
