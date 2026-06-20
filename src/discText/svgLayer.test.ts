import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDefaultDiscTextLayout,
  createDefaultDiscTextValues,
  DEFAULT_DISC_TEXT_SETTINGS,
} from './index.ts'
import {
  buildDiscTextSvgLayer,
  getCurvedDiscTextPaintBoxes,
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

function getStyleForClass(svg: string, className: string) {
  const escapedClass = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = svg.match(
    new RegExp(`class="${escapedClass}"[\\s\\S]*?style="([^"]+)"`),
  )

  assert.ok(match, `Expected SVG to contain ${className}`)
  return match[1]
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

test('disc SVG renderer applies emphasis to curved copyright without native textPath underline', () => {
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
        color: '#f97316',
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
  assert.match(svg, /font-weight:700/)
  assert.match(svg, /class="disc-text-curved-underline"/)
  assert.match(svg, /stroke:#f97316/)
  assert.match(svg, /stroke-opacity:1/)
  assert.match(svg, /opacity:1/)
  assert.doesNotMatch(svg, /disc-text-render-text[^>]*text-decoration:underline/)
  assert.doesNotMatch(svg, /<textarea\b/i)
  assert.doesNotMatch(svg, /<foreignObject\b/i)
})

test('curved underline uses resolved text color and full opacity for Warframe legal text', () => {
  const settings = {
    ...DEFAULT_DISC_TEXT_SETTINGS,
    copyright: true,
  }
  const values = {
    ...createDefaultDiscTextValues(),
    copyright:
      'WARFRAME (C) 2026 Digital Extremes Ltd. All rights reserved. Steam backup archival copy.',
  }
  const layoutSettings = createDefaultDiscTextLayout('none')
  const svg = buildDiscTextSvgLayer({
    settings,
    values,
    styles: {
      copyright: {
        color: '#ffffff',
        underline: true,
      },
    },
    layoutSettings: {
      ...layoutSettings,
      copyright: {
        ...layoutSettings.copyright,
        arcDegrees: 82,
        arcSide: 'bottom',
        mode: 'curved',
      },
    },
    title: 'Warframe',
    placement: 'top',
    safeZoneRadiusPercent: 44,
    measureText: measureTextAsCharacters,
    width: 100,
    height: 100,
  })
  const underlinePaths =
    svg.match(/class="disc-text-curved-underline"[\s\S]*?style="([^"]+)"/g) ?? []

  assert.ok(underlinePaths.length >= 1)
  assert.match(svg, /<textPath\b/)
  assert.match(svg, /stroke:#ffffff/)
  assert.match(svg, /stroke-opacity:1/)
  assert.match(svg, /opacity:1/)
  assert.match(svg, /id="disc-text-layer-curved-shadow-only"/)
  assert.doesNotMatch(svg, /text-decoration:underline/)
  for (const path of underlinePaths) {
    assert.match(path, /\bA\b/)
    assert.doesNotMatch(path, /\b[HV]\b/)
  }
})

test('curved underline paints above shadow-only copies instead of through the shadow filter', () => {
  const settings = {
    ...DEFAULT_DISC_TEXT_SETTINGS,
    copyright: true,
  }
  const values = {
    ...createDefaultDiscTextValues(),
    copyright:
      'WARFRAME (C) 2026 Digital Extremes Ltd. All rights reserved. Steam backup archival copy.',
  }
  const layoutSettings = createDefaultDiscTextLayout('none')
  const svg = buildDiscTextSvgLayer({
    settings,
    values,
    styles: {
      copyright: {
        color: '#38bdf8',
        contrast: 'strokeShadow',
        underline: true,
      },
    },
    layoutSettings: {
      ...layoutSettings,
      copyright: {
        ...layoutSettings.copyright,
        arcDegrees: 82,
        arcSide: 'bottom',
        mode: 'curved',
      },
    },
    title: 'Warframe',
    placement: 'top',
    safeZoneRadiusPercent: 44,
    measureText: measureTextAsCharacters,
    width: 100,
    height: 100,
  })

  const shadowFilterIndex = svg.indexOf('id="disc-text-layer-curved-shadow-only"')
  const shadowUnderlineIndex = svg.indexOf('class="disc-text-curved-underline-shadow"')
  const shadowTextIndex = svg.indexOf('class="disc-text-render-text disc-text-curved-shadow"')
  const underlineIndex = svg.indexOf('class="disc-text-curved-underline"')
  const textIndex = svg.indexOf('class="disc-text-render-text"')
  const visibleUnderlineStyle = getStyleForClass(svg, 'disc-text-curved-underline')
  const shadowUnderlineStyle = getStyleForClass(svg, 'disc-text-curved-underline-shadow')

  assert.ok(shadowFilterIndex > -1, 'expected a curved shadow-only filter')
  assert.ok(shadowUnderlineIndex > -1, 'expected an underline shadow copy')
  assert.ok(shadowTextIndex > -1, 'expected a text shadow copy')
  assert.ok(underlineIndex > -1, 'expected the visible underline path')
  assert.ok(textIndex > -1, 'expected the visible curved text')
  assert.ok(shadowUnderlineIndex < underlineIndex, 'underline shadow must paint before visible underline')
  assert.ok(shadowTextIndex < underlineIndex, 'text shadow must paint before visible underline')
  assert.ok(underlineIndex < textIndex, 'visible underline should paint before visible text')
  assert.match(shadowUnderlineStyle, /filter:url\(#disc-text-layer-curved-shadow-only\)/)
  assert.doesNotMatch(visibleUnderlineStyle, /filter:url/)
  assert.match(visibleUnderlineStyle, /stroke:#38bdf8/)
  assert.match(visibleUnderlineStyle, /stroke-opacity:1/)
  assert.match(visibleUnderlineStyle, /opacity:1/)
  assert.doesNotMatch(svg, /<feMergeNode in="SourceGraphic"\s*\/>/)
  assert.match(svg, /<feMergeNode in="curved-shadow-strong"\s*\/>/)
  assert.match(svg, /<feMergeNode in="curved-shadow-tight"\s*\/>/)
})

test('curved underline follows top and bottom wrapped line arcs without stray horizontal segments', () => {
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
  const createSvg = (arcSide: 'top' | 'bottom') =>
    buildDiscTextSvgLayer({
      settings,
      values,
      styles: {
        copyright: {
          underline: true,
        },
      },
      layoutSettings: {
        ...layoutSettings,
        copyright: {
          ...layoutSettings.copyright,
          arcDegrees: 74,
          arcSide,
          mode: 'curved',
        },
      },
      title: 'Portal 2',
      placement: arcSide === 'top' ? 'bottom' : 'top',
      safeZoneRadiusPercent: 44,
      measureText: measureTextAsCharacters,
      width: 100,
      height: 100,
    })

  for (const svg of [createSvg('top'), createSvg('bottom')]) {
    const underlinePaths =
      svg.match(/class="disc-text-curved-underline"[\s\S]*?d="([^"]+)"/g) ?? []

    assert.ok(
      underlinePaths.length >= 2,
      'expected one underline arc per wrapped curved line',
    )
    assert.doesNotMatch(svg, /text-decoration:underline/)
    for (const path of underlinePaths) {
      assert.match(path, /\bA\b/)
      assert.doesNotMatch(path, /\b[HV]\b/)
    }
  }
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

test('curved disc paint boxes track top and bottom rendered arc text instead of the full arc window', () => {
  const layoutSettings = createDefaultDiscTextLayout('none')
  const topBoxes = getCurvedDiscTextPaintBoxes({
    key: 'copyright',
    layout: {
      ...layoutSettings.copyright,
      arcDegrees: 210,
      arcSide: 'top',
      mode: 'curved',
    },
    measureText: measureTextAsCharacters,
    placement: 'none',
    safeZoneRadiusPercent: 44,
    text: 'Short legal text',
  })
  const bottomBoxes = getCurvedDiscTextPaintBoxes({
    key: 'copyright',
    layout: {
      ...layoutSettings.copyright,
      arcDegrees: 210,
      arcSide: 'bottom',
      mode: 'curved',
    },
    measureText: measureTextAsCharacters,
    placement: 'none',
    safeZoneRadiusPercent: 44,
    text: 'Short legal text',
  })

  assert.ok(topBoxes.length > 0)
  assert.ok(bottomBoxes.length > 0)
  assert.ok(Math.max(...topBoxes.map((box) => box.bottom)) < 50)
  assert.ok(Math.min(...bottomBoxes.map((box) => box.top)) > 50)
  assert.ok(
    Math.max(...topBoxes.map((box) => box.right)) -
      Math.min(...topBoxes.map((box) => box.left)) <
      75,
  )
})

test('curved disc paint boxes include wrapped multiline underline stroke and shadow slack', () => {
  const layoutSettings = createDefaultDiscTextLayout('none')
  const plainBoxes = getCurvedDiscTextPaintBoxes({
    key: 'copyright',
    layout: {
      ...layoutSettings.copyright,
      arcDegrees: 74,
      arcSide: 'bottom',
      mode: 'curved',
    },
    measureText: measureTextAsCharacters,
    placement: 'none',
    safeZoneRadiusPercent: 44,
    text:
      'Copyright 2026 Archive Copy Wrapped Legal Text Preservation Notice For Multiple Lines',
  })
  const styledBoxes = getCurvedDiscTextPaintBoxes({
    key: 'copyright',
    layout: {
      ...layoutSettings.copyright,
      arcDegrees: 74,
      arcSide: 'bottom',
      mode: 'curved',
    },
    measureText: measureTextAsCharacters,
    placement: 'none',
    safeZoneRadiusPercent: 44,
    styles: {
      copyright: {
        contrast: 'strokeShadow',
        underline: true,
      },
    },
    text:
      'Copyright 2026 Archive Copy Wrapped Legal Text Preservation Notice For Multiple Lines',
  })
  const plainBottom = Math.max(...plainBoxes.map((box) => box.bottom))
  const styledBottom = Math.max(...styledBoxes.map((box) => box.bottom))

  assert.ok(styledBoxes.length >= 2)
  assert.ok(styledBottom > plainBottom)
})
