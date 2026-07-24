import assert from 'node:assert/strict'
import test from 'node:test'
import { createDefaultDiscTextLayout } from './index.ts'
import {
  buildStraightTextLineContent,
  buildStraightTextMarkup,
  buildTextStyleAttribute,
} from './svgTextMarkup.ts'
import { getResolvedDiscTextRenderStyle } from './styles.ts'
import {
  DISC_TEXT_STRAIGHT_STROKE_COLOR,
  DISC_TEXT_STRAIGHT_STROKE_WIDTH,
} from './straightTextPaintGeometry.ts'

function measureTextAsCharacters(text: string) {
  return Array.from(text).length
}

test('disc SVG text style helper preserves stroke and shadow filter semantics', () => {
  const style = getResolvedDiscTextRenderStyle('title', {
    title: {
      contrast: 'strokeShadow',
    },
  })

  const withShadow = buildTextStyleAttribute(
    style,
    'shadow-id',
    3,
    700,
    DISC_TEXT_STRAIGHT_STROKE_WIDTH,
  )
  const withoutShadow = buildTextStyleAttribute(
    style,
    'shadow-id',
    3,
    700,
    DISC_TEXT_STRAIGHT_STROKE_WIDTH,
    undefined,
    { includeShadowFilter: false },
  )

  assert.match(withShadow, /filter:url\(#shadow-id\)/)
  assert.ok(withShadow.includes(`stroke:${DISC_TEXT_STRAIGHT_STROKE_COLOR}`))
  assert.ok(
    withShadow.includes(`stroke-width:${DISC_TEXT_STRAIGHT_STROKE_WIDTH}px`),
  )
  assert.doesNotMatch(withoutShadow, /filter:url/)
  assert.ok(withoutShadow.includes(`stroke:${DISC_TEXT_STRAIGHT_STROKE_COLOR}`))
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

test('straight SVG run markup emits only the effective conflicting style values', () => {
  const content = buildStraightTextLineContent(
    [{
      bold: true,
      font: 'italic 700 96px Arial',
      fontSizePt: 12,
      fontSizePx: 96,
      fontStyle: 'normal',
      fontWeight: 400,
      italic: true,
      resolvedFontSize: 96,
      text: 'I',
      width: 52.8,
    }],
    'I',
  )

  assert.match(content, /font-weight:700/)
  assert.match(content, /font-style:italic/)
  assert.match(content, /font-size:96px/)
  assert.doesNotMatch(content, /font-weight:400|font-style:normal|font-size:12/)
})

test('straight SVG runs can override an italic parent with explicit normal style', () => {
  const content = buildStraightTextLineContent(
    [{
      font: '400 3px Arial',
      fontStyle: 'normal',
      text: 'Normal',
      width: 6,
    }],
    'Normal',
  )

  assert.equal(content, '<tspan style="font-style:normal">Normal</tspan>')
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
