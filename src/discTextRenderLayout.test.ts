import assert from 'node:assert/strict'
import test from 'node:test'
import type { DiscTextLayout } from './discText.ts'
import type { DiscTextAvoidanceRegion } from './discTextAvoidance.ts'
import {
  getStraightDiscTextRenderLayout,
  type StraightDiscTextLineLayout,
  type StraightDiscTextRenderLayout,
} from './discTextRenderLayout.ts'

function measureText(text: string) {
  return Array.from(text).length
}

function createLayout(layout: Partial<DiscTextLayout> = {}): DiscTextLayout {
  return {
    x: 0,
    y: 50,
    width: 60,
    scale: 1,
    align: 'center',
    mode: 'straight',
    arcDegrees: 210,
    arcSide: 'bottom',
    avoidVisualElements: false,
    ...layout,
  }
}

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
