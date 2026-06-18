import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDefaultDiscTextLayout,
  createDefaultDiscTextValues,
  DEFAULT_DISC_TEXT_SETTINGS,
} from './index.ts'
import { buildDiscTextSvgLayer } from './svgLayer.ts'

function measureTextAsCharacters(text: string) {
  return Array.from(text).length
}

function getFirstArcPathLength(svg: string) {
  const match = svg.match(
    /<path[^>]*d="M ([\d.-]+) ([\d.-]+) A ([\d.-]+) [\d.-]+ 0 [01] [01] ([\d.-]+) ([\d.-]+)/,
  )

  assert.ok(match, 'Expected SVG to contain an arc path')

  const [, startXRaw, startYRaw, radiusRaw, endXRaw, endYRaw] = match
  const startX = Number(startXRaw)
  const startY = Number(startYRaw)
  const radius = Number(radiusRaw)
  const endX = Number(endXRaw)
  const endY = Number(endYRaw)
  const startAngle = Math.atan2(startY - 50, startX - 50)
  const endAngle = Math.atan2(endY - 50, endX - 50)
  let angleWidth = Math.abs((endAngle - startAngle) * (180 / Math.PI))

  if (angleWidth > 180) {
    angleWidth = 360 - angleWidth
  }

  return radius * ((angleWidth * Math.PI) / 180)
}

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
  assert.match(svg, /font-weight:950/)
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

  assert.match(svg, /<tspan style="font-weight:800">bold<\/tspan>/)
  assert.match(svg, /<tspan style="font-style:italic">italic<\/tspan>/)
  assert.match(svg, /<tspan style="fill:#ff0000">red<\/tspan>/)
  assert.doesNotMatch(svg, /alert\(1\)/)
  assert.doesNotMatch(svg, /<script>/i)
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

test('curved disc copyright text remains SVG textPath based', () => {
  const settings = {
    ...DEFAULT_DISC_TEXT_SETTINGS,
    copyright: true,
  }
  const values = {
    ...createDefaultDiscTextValues(),
    copyright: 'Copyright 2026 Archive Copy',
  }
  const layoutSettings = createDefaultDiscTextLayout('none')
  const svg = buildDiscTextSvgLayer({
    settings,
    values,
    layoutSettings: {
      ...layoutSettings,
      copyright: {
        ...layoutSettings.copyright,
        mode: 'curved',
      },
    },
    title: 'Portal 2',
    placement: 'none',
    safeZoneRadiusPercent: 44,
    measureText: measureTextAsCharacters,
    width: 100,
    height: 100,
    hiddenTextKeys: ['copyright'],
  })

  assert.match(svg, /<textPath\b/)
  assert.match(svg, /data-disc-text-key="copyright"/)
  assert.doesNotMatch(svg, /<textarea\b/i)
  assert.doesNotMatch(svg, /<foreignObject\b/i)
  assert.doesNotMatch(svg, /disc-text-editable-preview/)
})

test('curved disc copyright ignores HTML sources and remains textPath', () => {
  const settings = {
    ...DEFAULT_DISC_TEXT_SETTINGS,
    copyright: true,
  }
  const values = {
    ...createDefaultDiscTextValues(),
    copyright: 'Plain legal text',
  }
  const layoutSettings = createDefaultDiscTextLayout('none')
  const svg = buildDiscTextSvgLayer({
    settings,
    values,
    htmlSources: {
      copyright: '<p><strong>HTML legal text</strong></p>',
    },
    layoutSettings: {
      ...layoutSettings,
      copyright: {
        ...layoutSettings.copyright,
        mode: 'curved',
      },
    },
    title: 'Portal 2',
    placement: 'none',
    safeZoneRadiusPercent: 44,
    measureText: measureTextAsCharacters,
    width: 100,
    height: 100,
  })

  assert.match(svg, /<textPath\b/)
  assert.match(svg, />Plain legal text<\/textPath>/)
  assert.doesNotMatch(svg, /HTML legal text/)
  assert.doesNotMatch(svg, /<tspan\b/)
})

test('disc SVG renderer applies emphasis to curved copyright textPath', () => {
  const settings = {
    ...DEFAULT_DISC_TEXT_SETTINGS,
    copyright: true,
  }
  const values = {
    ...createDefaultDiscTextValues(),
    copyright: 'Copyright 2026 Archive Copy',
  }
  const layoutSettings = createDefaultDiscTextLayout('none')
  const svg = buildDiscTextSvgLayer({
    settings,
    values,
    styles: {
      copyright: {
        bold: true,
        italic: true,
        underline: true,
      },
    },
    layoutSettings: {
      ...layoutSettings,
      copyright: {
        ...layoutSettings.copyright,
        mode: 'curved',
      },
    },
    title: 'Portal 2',
    placement: 'none',
    safeZoneRadiusPercent: 44,
    measureText: measureTextAsCharacters,
    width: 100,
    height: 100,
  })

  assert.match(svg, /<textPath\b/)
  assert.match(svg, /font-style:italic/)
  assert.match(svg, /text-decoration:underline/)
  assert.doesNotMatch(svg, /<textarea\b/i)
  assert.doesNotMatch(svg, /<foreignObject\b/i)
})

test('curved disc copyright textPath keeps the final word visible within paint-safe path geometry', () => {
  const text = 'Copyright 2026 Archive Copy'
  const settings = {
    ...DEFAULT_DISC_TEXT_SETTINGS,
    copyright: true,
  }
  const values = {
    ...createDefaultDiscTextValues(),
    copyright: text,
  }
  const layoutSettings = createDefaultDiscTextLayout('none')
  const svg = buildDiscTextSvgLayer({
    settings,
    values,
    layoutSettings: {
      ...layoutSettings,
      copyright: {
        ...layoutSettings.copyright,
        mode: 'curved',
      },
    },
    title: 'Portal 2',
    placement: 'none',
    safeZoneRadiusPercent: 44,
    measureText: measureTextAsCharacters,
    width: 100,
    height: 100,
  })
  const textPath = svg.match(/<textPath\b[^>]*>(.*?)<\/textPath>/s)?.[1]
  const pathLength = getFirstArcPathLength(svg)

  assert.equal(textPath, text)
  assert.notEqual(textPath, 'Copyright 2026 Archive')
  assert.ok(
    pathLength > measureTextAsCharacters(text) + 1,
    `Expected curved text path ${pathLength} to include paint slack beyond text length ${measureTextAsCharacters(text)}`,
  )
})
