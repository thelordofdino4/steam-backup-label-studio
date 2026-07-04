import assert from 'node:assert/strict'
import test from 'node:test'
import { createDefaultDiscTextLayout } from './index.ts'
import {
  getCurvedDiscTextPaintBoxes,
  getCurvedDiscTextPaintCollisionBoxes,
} from './svgLayer.ts'

function measureTextAsCharacters(text: string) {
  return Array.from(text).length
}

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

test('curved disc collision boxes keep outer arc paint as separate segments', () => {
  const layoutSettings = createDefaultDiscTextLayout('none')
  const broadBoxes = getCurvedDiscTextPaintBoxes({
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
  const collisionBoxes = getCurvedDiscTextPaintCollisionBoxes({
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
  const broadWidth = Math.max(...broadBoxes.map((box) => box.right)) -
    Math.min(...broadBoxes.map((box) => box.left))
  const widestSegment = Math.max(
    ...collisionBoxes.map((box) => box.right - box.left),
  )

  assert.ok(collisionBoxes.length > broadBoxes.length)
  assert.ok(widestSegment < broadWidth * 0.35)
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
