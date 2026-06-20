import assert from 'node:assert/strict'
import test from 'node:test'
import type { DiscTextLayout } from './index.ts'
import type { DiscTextAvoidanceRegion } from './avoidance.ts'
import {
  getStraightDiscTextRenderLayout,
  type StraightDiscTextLineLayout,
  type StraightDiscTextRenderLayout,
} from './renderLayout.ts'
import {
  discTextPointSizeToExportPx,
  discTextPointSizeToSvgPercent,
  getDefaultDiscTextPointSize,
} from './pointSize.ts'
import { discTemplates } from '../templates/discTemplates.ts'

function measureText(text: string) {
  return Array.from(text).length
}

function createLayout(layout: Partial<DiscTextLayout> = {}): DiscTextLayout {
  return {
    x: 0,
    y: 50,
    width: 60,
    scale: 1,
    fontSizePt: getDefaultDiscTextPointSize('customNote'),
    align: 'center',
    mode: 'straight',
    arcDegrees: 210,
    arcSide: 'bottom',
    avoidVisualElements: false,
    ...layout,
  }
}

test('disc text point sizes convert through the selected disc export dpi', () => {
  const template = discTemplates.stickyLabelDisc
  const pointSizePt = 12
  const exportPx = discTextPointSizeToExportPx(pointSizePt, template)
  const svgPercent = discTextPointSizeToSvgPercent(pointSizePt, template)

  assert.equal(Math.round(exportPx * 100) / 100, 50)
  assert.equal(
    Math.round(svgPercent * 10000) / 10000,
    Math.round((50 / ((117 / 25.4) * 300)) * 100 * 10000) / 10000,
  )
})

test('straight disc render layout uses canonical point size values', () => {
  const renderLayout = getStraightDiscTextRenderLayout(
    'title',
    'Portal 2',
    createLayout({
      fontSizePt: 24,
      scale: 0.2,
    }),
    measureText,
    undefined,
    { template: discTemplates.standardPrintableDisc },
  )

  assert.equal(
    Math.round(renderLayout.fontSize * 1000) / 1000,
    Math.round(discTextPointSizeToSvgPercent(24, discTemplates.standardPrintableDisc) * 1000) / 1000,
  )
})

function getLineBounds(
  line: StraightDiscTextLineLayout,
  renderLayout: StraightDiscTextRenderLayout,
) {
  const lineWidth = measureText(line.text)

  if (renderLayout.textAnchor === 'start') {
    return {
      left: line.x,
      right: line.x + lineWidth,
    }
  }

  if (renderLayout.textAnchor === 'end') {
    return {
      left: line.x - lineWidth,
      right: line.x,
    }
  }

  return {
    left: line.x - lineWidth / 2,
    right: line.x + lineWidth / 2,
  }
}

function lineOverlapsRegionVertically(
  line: StraightDiscTextLineLayout,
  renderLayout: StraightDiscTextRenderLayout,
  region: DiscTextAvoidanceRegion,
) {
  return (
    line.y + renderLayout.lineHeight / 2 >= region.top &&
    line.y - renderLayout.lineHeight / 2 <= region.bottom
  )
}

test('straight disc text ignores avoidance regions until the layout opts in', () => {
  const text = 'alpha beta gamma delta epsilon zeta'
  const region: DiscTextAvoidanceRegion = {
    id: 'rating-badge',
    label: 'Rating badge',
    left: 44,
    right: 56,
    top: 47,
    bottom: 53,
  }
  const renderLayout = getStraightDiscTextRenderLayout(
    'customNote',
    text,
    createLayout(),
    measureText,
    undefined,
    { avoidanceRegions: [region] },
  )

  assert.equal(renderLayout.lines.length, 1)
  assert.equal(renderLayout.lines[0]?.x, 50)
})

test('straight disc text wraps into line segments that avoid occupied rectangles', () => {
  const text = 'alpha beta gamma delta epsilon zeta'
  const region: DiscTextAvoidanceRegion = {
    id: 'rating-badge',
    label: 'Rating badge',
    left: 44,
    right: 56,
    top: 47,
    bottom: 53,
  }
  const renderLayout = getStraightDiscTextRenderLayout(
    'customNote',
    text,
    createLayout({ avoidVisualElements: true }),
    measureText,
    undefined,
    { avoidanceRegions: [region] },
  )

  assert.equal(renderLayout.lines.length, 2)

  for (const line of renderLayout.lines) {
    if (!lineOverlapsRegionVertically(line, renderLayout, region)) {
      continue
    }

    const bounds = getLineBounds(line, renderLayout)

    assert.ok(
      bounds.right <= region.left || bounds.left >= region.right,
      `Expected ${line.text} bounds ${JSON.stringify(bounds)} to avoid ${JSON.stringify(region)}`,
    )
  }
})

test('avoidance wrapping can use extra lines instead of truncating one-line text', () => {
  const text = 'Developer: alpha beta gamma delta epsilon'
  const region: DiscTextAvoidanceRegion = {
    id: 'logo-developer',
    label: 'Developer logo',
    left: 44,
    right: 56,
    top: 47,
    bottom: 53,
  }
  const renderLayout = getStraightDiscTextRenderLayout(
    'developer',
    text,
    createLayout({ avoidVisualElements: true }),
    measureText,
    undefined,
    { avoidanceRegions: [region] },
  )

  assert.ok(renderLayout.lines.length > 1)
  assert.equal(renderLayout.lines.map((line) => line.text).join(' '), text)
})

test('straight disc text wraps beyond the style default line count', () => {
  const text = [
    'alpha',
    'beta',
    'gamma',
    'delta',
    'epsilon',
    'zeta',
    'eta',
    'theta',
  ].join(' ')
  const renderLayout = getStraightDiscTextRenderLayout(
    'title',
    text,
    createLayout({ width: 12 }),
    measureText,
  )

  assert.ok(renderLayout.lines.length > 2)
  assert.equal(renderLayout.lines.map((line) => line.text).join(' '), text)
})

test('straight disc text preserves explicit typed newlines', () => {
  const renderLayout = getStraightDiscTextRenderLayout(
    'customNote',
    'alpha beta\ngamma\n\nomega',
    createLayout({ width: 60 }),
    measureText,
  )

  assert.deepEqual(
    renderLayout.lines.map((line) => line.text),
    ['alpha beta', 'gamma', '', 'omega'],
  )
})

test('straight disc text preserves typed whitespace for live editing', () => {
  const renderLayout = getStraightDiscTextRenderLayout(
    'customNote',
    'hello  world ',
    createLayout({ width: 60 }),
    measureText,
  )

  assert.deepEqual(
    renderLayout.lines.map((line) => line.text),
    ['hello  world '],
  )
})
