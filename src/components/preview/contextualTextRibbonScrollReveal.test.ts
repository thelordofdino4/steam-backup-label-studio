import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getContextualTextRibbonScrollRevealDelta,
} from './contextualTextRibbonScrollReveal.ts'

test('contextual text ribbon reveal waits until a control is fully hidden', () => {
  const rowRect = { left: 100, right: 500 }

  assert.equal(
    getContextualTextRibbonScrollRevealDelta({
      itemRect: { left: 501, right: 700 },
      rowRect,
    }),
    204,
  )
  assert.equal(
    getContextualTextRibbonScrollRevealDelta({
      itemRect: { left: -100, right: 80 },
      rowRect,
    }),
    -204,
  )
  assert.equal(
    getContextualTextRibbonScrollRevealDelta({
      itemRect: { left: 499, right: 620 },
      rowRect,
    }),
    124,
  )
  assert.equal(
    getContextualTextRibbonScrollRevealDelta({
      itemRect: { left: 498.5, right: 620 },
      rowRect,
    }),
    0,
  )
  assert.equal(
    getContextualTextRibbonScrollRevealDelta({
      itemRect: { left: 120, right: 300 },
      rowRect,
    }),
    0,
  )
})
