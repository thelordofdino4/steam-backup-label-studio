import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDefaultDiscTextLayout,
  createDefaultDiscTextValues,
  DEFAULT_DISC_TEXT_SETTINGS,
} from './index.ts'
import { buildDiscTextSvgLayer } from './svgLayer.ts'
import {
  DISC_TEXT_STRAIGHT_SHADOW_STRONG,
  DISC_TEXT_STRAIGHT_SHADOW_TIGHT,
} from './straightTextPaintGeometry.ts'

function measureTextAsCharacters(text: string) {
  return Array.from(text).length
}

test('disc SVG renderer uses the canonical straight shadow geometry', () => {
  const svg = buildDiscTextSvgLayer({
    settings: DEFAULT_DISC_TEXT_SETTINGS,
    values: createDefaultDiscTextValues(),
    layoutSettings: createDefaultDiscTextLayout('none'),
    title: 'Portal 2',
    placement: 'none',
    safeZoneRadiusPercent: 44,
    measureText: measureTextAsCharacters,
    width: 100,
    height: 100,
  })

  assert.ok(svg.includes(
    `<feGaussianBlur in="SourceAlpha" ` +
    `stdDeviation="${DISC_TEXT_STRAIGHT_SHADOW_STRONG.standardDeviation}" ` +
    'result="straight-shadow-blur-strong"',
  ))
  assert.ok(svg.includes(
    `<feOffset in="straight-shadow-blur-strong" ` +
    `dx="${DISC_TEXT_STRAIGHT_SHADOW_STRONG.offsetX}" ` +
    `dy="${DISC_TEXT_STRAIGHT_SHADOW_STRONG.offsetY}"`,
  ))
  assert.ok(svg.includes(
    `<feGaussianBlur in="SourceAlpha" ` +
    `stdDeviation="${DISC_TEXT_STRAIGHT_SHADOW_TIGHT.standardDeviation}" ` +
    'result="straight-shadow-blur-tight"',
  ))
  assert.ok(svg.includes(
    `<feOffset in="straight-shadow-blur-tight" ` +
    `dx="${DISC_TEXT_STRAIGHT_SHADOW_TIGHT.offsetX}" ` +
    `dy="${DISC_TEXT_STRAIGHT_SHADOW_TIGHT.offsetY}"`,
  ))
  assert.match(
    svg,
    /<feMerge>[\s\S]*<feMergeNode in="straight-shadow-strong" \/>[\s\S]*<feMergeNode in="straight-shadow-tight" \/>[\s\S]*<feMergeNode in="SourceGraphic" \/>[\s\S]*<\/feMerge>/,
  )
  assert.doesNotMatch(svg, /<feDropShadow/)
})

test('disc SVG renderer preserves straight text spaces for preview and export parity', () => {
  const settings = {
    ...DEFAULT_DISC_TEXT_SETTINGS,
    customNote: true,
  }
  const values = {
    ...createDefaultDiscTextValues(),
    customNote: ' hello  world ',
  }
  const svg = buildDiscTextSvgLayer({
    settings,
    values,
    layoutSettings: createDefaultDiscTextLayout('none'),
    title: 'Portal 2',
    placement: 'none',
    safeZoneRadiusPercent: 44,
    measureText: measureTextAsCharacters,
    width: 100,
    height: 100,
  })

  assert.match(svg, /xml:space="preserve"/)
  assert.ok(svg.includes('> hello  world </text>'))
})

test('disc SVG renderer applies emphasis to straight text without duplicate renderers', () => {
  const settings = {
    ...DEFAULT_DISC_TEXT_SETTINGS,
    title: true,
  }
  const svg = buildDiscTextSvgLayer({
    settings,
    values: createDefaultDiscTextValues(),
    styles: {
      title: {
        bold: true,
        italic: true,
        underline: true,
      },
    },
    layoutSettings: createDefaultDiscTextLayout('none'),
    title: 'Emphasized title',
    placement: 'none',
    safeZoneRadiusPercent: 44,
    measureText: measureTextAsCharacters,
    width: 100,
    height: 100,
  })

  assert.match(svg, /font-style:italic/)
  assert.match(svg, /font-weight:700/)
  assert.match(svg, /text-decoration:underline/)
  assert.match(svg, />Emphasized title<\/text>/)
  assert.doesNotMatch(svg, /<textarea\b/i)
  assert.doesNotMatch(svg, /<foreignObject\b/i)
})

test('disc SVG renderer maps straight HTML to safe tspans', () => {
  const settings = {
    ...DEFAULT_DISC_TEXT_SETTINGS,
    customNote: true,
  }
  const values = {
    ...createDefaultDiscTextValues(),
    customNote: 'fallback note',
  }
  const svg = buildDiscTextSvgLayer({
    settings,
    values,
    htmlSources: {
      customNote: '<p>Hello <strong>bold</strong> and <em>italic</em> <span style="color:#ff0000">red</span><script>alert(1)</script></p>',
    },
    layoutSettings: createDefaultDiscTextLayout('none'),
    title: 'Portal 2',
    placement: 'none',
    safeZoneRadiusPercent: 44,
    measureText: measureTextAsCharacters,
    width: 100,
    height: 100,
  })

  assert.match(svg, /<tspan style="font-weight:700">bold<\/tspan>/)
  assert.match(svg, /<tspan style="font-style:italic">italic<\/tspan>/)
  assert.match(svg, /<tspan style="fill:#ff0000">red<\/tspan>/)
  assert.doesNotMatch(svg, /alert\(1\)/)
  assert.doesNotMatch(svg, /<script>/i)
  assert.doesNotMatch(svg, /<foreignObject\b/i)
})

test('disc SVG renderer reflects changed straight HTML source drafts', () => {
  const settings = {
    ...DEFAULT_DISC_TEXT_SETTINGS,
    customNote: true,
  }
  const values = {
    ...createDefaultDiscTextValues(),
    customNote: 'fallback note',
  }
  const commonParams = {
    settings,
    values,
    layoutSettings: createDefaultDiscTextLayout('none'),
    title: 'Portal 2',
    placement: 'none' as const,
    safeZoneRadiusPercent: 44,
    measureText: measureTextAsCharacters,
    width: 100,
    height: 100,
  }
  const firstSvg = buildDiscTextSvgLayer({
    ...commonParams,
    htmlSources: {
      customNote: '<p><span style="color:#ff0000">Draft one</span></p>',
    },
  })
  const secondSvg = buildDiscTextSvgLayer({
    ...commonParams,
    htmlSources: {
      customNote:
        '<p><span style="color:#0000ff">Draft two</span><br><strong>Next line</strong></p>',
    },
  })

  assert.match(firstSvg, /fill:#ff0000/)
  assert.match(firstSvg, /Draft one/)
  assert.doesNotMatch(secondSvg, /Draft one/)
  assert.match(secondSvg, /fill:#0000ff/)
  assert.match(secondSvg, /Draft two/)
  assert.match(secondSvg, /font-weight:700/)
  assert.match(secondSvg, /Next line/)
})

test('disc SVG renderer maps straight HTML bullet lists to visible tspans', () => {
  const settings = {
    ...DEFAULT_DISC_TEXT_SETTINGS,
    customNote: true,
  }
  const values = {
    ...createDefaultDiscTextValues(),
    customNote: 'fallback note',
  }
  const svg = buildDiscTextSvgLayer({
    settings,
    values,
    htmlSources: {
      customNote:
        '<ul><li><strong>Alpha</strong></li><li><span style="color:#00ff00">Beta</span></li></ul>',
    },
    layoutSettings: createDefaultDiscTextLayout('none'),
    title: 'Portal 2',
    placement: 'none',
    safeZoneRadiusPercent: 44,
    measureText: measureTextAsCharacters,
    width: 100,
    height: 100,
  })

  assert.match(svg, /<tspan>• <\/tspan>/)
  assert.match(svg, /<tspan style="font-weight:700">Alpha<\/tspan>/)
  assert.match(svg, /<tspan style="fill:#00ff00">Beta<\/tspan>/)
  assert.doesNotMatch(svg, /<li>/i)
  assert.doesNotMatch(svg, /<foreignObject\b/i)
})

test('disc SVG renderer can hide selected straight text glyphs for inline editing', () => {
  const settings = {
    ...DEFAULT_DISC_TEXT_SETTINGS,
    title: true,
    customNote: true,
  }
  const values = {
    ...createDefaultDiscTextValues(),
    customNote: 'Visible note',
  }
  const svg = buildDiscTextSvgLayer({
    settings,
    values,
    layoutSettings: createDefaultDiscTextLayout('none'),
    title: 'Hidden title',
    placement: 'none',
    safeZoneRadiusPercent: 44,
    measureText: measureTextAsCharacters,
    width: 100,
    height: 100,
    hiddenTextKeys: ['title'],
  })

  assert.doesNotMatch(svg, />Hidden title<\/text>/)
  assert.match(svg, />Visible note<\/text>/)
  assert.match(svg, /data-disc-text-key="customNote"/)
})
