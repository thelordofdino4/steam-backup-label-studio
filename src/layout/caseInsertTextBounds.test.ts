import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clampReservedBoundsToVisualBounds,
} from './caseInsertTextBounds.ts'

test('case insert text bounds clamping moves reserved bounds by visual overflow', () => {
  assert.deepEqual(
    clampReservedBoundsToVisualBounds({
      reservedBounds: {
        x: 20,
        y: 30,
        width: 40,
        height: 20,
      },
      visualBounds: {
        x: 5,
        y: 25,
        width: 65,
        height: 30,
      },
      boundsLimit: {
        x: 10,
        y: 20,
        width: 50,
        height: 40,
      },
    }),
    {
      x: 17.5,
      y: 30,
      width: 40,
      height: 20,
    },
  )
})
