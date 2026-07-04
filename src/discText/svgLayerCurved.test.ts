import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDefaultDiscTextLayout,
  createDefaultDiscTextValues,
  DEFAULT_DISC_TEXT_SETTINGS,
} from './index.ts'
import {
  buildDiscTextSvgLayer,
} from './svgLayer.ts'
import { discTextPointSizeToSvgPercent } from './pointSize.ts'
import { discTemplates } from '../templates/discTemplates.ts'

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

function getCurvedCopyrightPaths(svg: string) {
  return [...svg.matchAll(/<path id="[^"]+-copyright-path-(\d+)" d="([^"]+)"/g)]
    .map((match) => ({ index: Number(match[1]), path: match[2] }))
    .sort((first, second) => first.index - second.index)
}

function getArcAngles(path: string) {
  const match = path.match(
    /M ([\d.-]+) ([\d.-]+) A [\d.-]+ [\d.-]+ 0 [01] [01] ([\d.-]+) ([\d.-]+)/,
  )

  assert.ok(match, `Expected arc path, got ${path}`)

  const [, startXRaw, startYRaw, endXRaw, endYRaw] = match
  const getAngle = (xRaw: string, yRaw: string) => {
    const angle = Math.atan2(Number(yRaw) - 50, Number(xRaw) - 50) *
      (180 / Math.PI)

    return Math.round((((angle % 360) + 360) % 360) * 1000) / 1000
  }

  return {
    end: getAngle(endXRaw, endYRaw),
    start: getAngle(startXRaw, startYRaw),
  }
}

test('disc SVG renderer applies point size to curved textPath output', () => {
  const layout = createDefaultDiscTextLayout(
    'none',
    discTemplates.standardPrintableDisc,
  )
  layout.copyright = {
    ...layout.copyright,
    fontSizePt: 9,
    mode: 'curved',
  }
  const svg = buildDiscTextSvgLayer({
    settings: {
      ...DEFAULT_DISC_TEXT_SETTINGS,
      copyright: true,
    },
    values: {
      ...createDefaultDiscTextValues(),
      copyright: 'Legal text on a curved path',
    },
    layoutSettings: layout,
    title: 'Portal 2',
    placement: 'none',
    safeZoneRadiusPercent: 44,
    measureText: measureTextAsCharacters,
    width: 100,
    height: 100,
    template: discTemplates.standardPrintableDisc,
  })
  const expectedFontSize = discTextPointSizeToSvgPercent(
    9,
    discTemplates.standardPrintableDisc,
  )

  assert.match(svg, /<textPath href=/)
  assert.match(
    svg,
    new RegExp(`font-size:${expectedFontSize}[^;]*px`),
  )
  assert.doesNotMatch(svg, /<foreignObject\b/i)
})

test('curved disc text uses point size for glyph size while scale stays geometry-only', () => {
  const settings = {
    ...DEFAULT_DISC_TEXT_SETTINGS,
    copyright: true,
  }
  const values = {
    ...createDefaultDiscTextValues(),
    copyright: 'Legal text on a curved path',
  }
  const layout = createDefaultDiscTextLayout(
    'none',
    discTemplates.standardPrintableDisc,
  )
  const createSvg = (scale: number) =>
    buildDiscTextSvgLayer({
      settings,
      values,
      layoutSettings: {
        ...layout,
        copyright: {
          ...layout.copyright,
          fontSizePt: 9,
          mode: 'curved',
          scale,
        },
      },
      title: 'Portal 2',
      placement: 'none',
      safeZoneRadiusPercent: 44,
      measureText: measureTextAsCharacters,
      width: 100,
      height: 100,
      template: discTemplates.standardPrintableDisc,
    })
  const smallSpacingSvg = createSvg(0.5)
  const largeSpacingSvg = createSvg(1.8)
  const fontSizePattern = /font-size:([^;]+)px/
  const smallFontSize = smallSpacingSvg.match(fontSizePattern)?.[1]
  const largeFontSize = largeSpacingSvg.match(fontSizePattern)?.[1]

  assert.equal(smallFontSize, largeFontSize)
  assert.equal(
    Number(smallFontSize),
    discTextPointSizeToSvgPercent(9, discTemplates.standardPrintableDisc),
  )
  assert.notEqual(
    smallSpacingSvg.match(/letter-spacing:([^;]+)px/)?.[1],
    largeSpacingSvg.match(/letter-spacing:([^;]+)px/)?.[1],
  )
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

test('curved disc copyright renders HTML rich runs through SVG textPath tspans', () => {
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
      copyright:
        '<p><span style="color:#ff0000;font-family:Georgia, serif;font-size:12pt">HTML</span> <strong><em>legal</em></strong> text</p>',
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
  assert.match(svg, /<tspan style="fill:#ff0000; font-family:Georgia, serif; font-size:[^"]+px">HTML<\/tspan>/)
  assert.match(svg, /<tspan style="font-weight:700; font-style:italic">legal<\/tspan>/)
  assert.match(svg, /> text<\/tspan>| text<\/textPath>/)
  assert.doesNotMatch(svg, /Plain legal text/)
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

test('curved multiline alignment is owned by arc geometry not textPath anchors', () => {
  const settings = {
    ...DEFAULT_DISC_TEXT_SETTINGS,
    copyright: true,
  }
  const values = {
    ...createDefaultDiscTextValues(),
    copyright:
      'Copyright 2026 Archive Copy Wrapped Legal Text Preservation Notice For Multiple Lines',
  }
  const layoutSettings = createDefaultDiscTextLayout('none')
  const createSvg = (align: 'left' | 'center' | 'right') =>
    buildDiscTextSvgLayer({
      settings,
      values,
      layoutSettings: {
        ...layoutSettings,
        copyright: {
          ...layoutSettings.copyright,
          align,
          arcDegrees: 74,
          arcSide: 'top',
          mode: 'curved',
        },
      },
      title: 'Portal 2',
      placement: 'bottom',
      safeZoneRadiusPercent: 44,
      measureText: measureTextAsCharacters,
      width: 100,
      height: 100,
    })
  const centerSvg = createSvg('center')
  const leftSvg = createSvg('left')
  const rightSvg = createSvg('right')
  const centerPaths = getCurvedCopyrightPaths(centerSvg)
  const leftPaths = getCurvedCopyrightPaths(leftSvg)
  const rightPaths = getCurvedCopyrightPaths(rightSvg)

  assert.ok(centerPaths.length >= 3)
  assert.equal(leftPaths.length, centerPaths.length)
  assert.equal(rightPaths.length, centerPaths.length)
  assert.doesNotMatch(leftSvg, /text-anchor="middle"|text-anchor="end"/)
  assert.doesNotMatch(centerSvg, /text-anchor="middle"|text-anchor="end"/)
  assert.doesNotMatch(rightSvg, /text-anchor="middle"|text-anchor="end"/)

  const centerFirst = getArcAngles(centerPaths[0].path)
  const leftFirst = getArcAngles(leftPaths[0].path)
  const rightFirst = getArcAngles(rightPaths[0].path)

  assert.deepEqual(leftFirst, centerFirst)
  assert.deepEqual(rightFirst, centerFirst)

  const centerSecond = getArcAngles(centerPaths[1].path)
  const leftSecond = getArcAngles(leftPaths[1].path)
  const rightSecond = getArcAngles(rightPaths[1].path)

  assert.notEqual(centerSecond.start, leftSecond.start)
  assert.equal(leftSecond.start, leftFirst.start)
  assert.equal(rightSecond.end, rightFirst.end)
})
