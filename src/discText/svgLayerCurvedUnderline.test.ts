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

function getStyleForClass(svg: string, className: string) {
  const escapedClass = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = svg.match(
    new RegExp(`class="${escapedClass}"[\\s\\S]*?style="([^"]+)"`),
  )

  assert.ok(match, `Expected SVG to contain ${className}`)
  return match[1]
}

test('curved disc copyright underlines only selected rich-text runs', () => {
  const settings = {
    ...DEFAULT_DISC_TEXT_SETTINGS,
    copyright: true,
  }
  const values = {
    ...createDefaultDiscTextValues(),
    copyright: 'Alpha Beta Gamma',
  }
  const layoutSettings = createDefaultDiscTextLayout('none')
  const svg = buildDiscTextSvgLayer({
    settings,
    values,
    htmlSources: {
      copyright: '<p>Alpha <u>Beta</u> Gamma</p>',
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
  const underlinePaths =
    svg.match(/class="disc-text-curved-underline"[\s\S]*?d="([^"]+)"/g) ?? []

  assert.equal(underlinePaths.length, 1)
  assert.match(svg, /<tspan>Alpha <\/tspan>/)
  assert.match(svg, /<tspan>Beta<\/tspan>/)
  assert.match(svg, /<tspan> Gamma<\/tspan>/)
  assert.doesNotMatch(svg, /text-decoration:underline/)
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
