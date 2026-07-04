import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assertProjectParityFixture,
} from './projectParityHarness.ts'

test('project parity harness reports exact missing and drifting fields', () => {
  assert.throws(
    () => assertProjectParityFixture({
      label: 'diagnostic',
      fields: [
        {
          path: 'missing.saved',
          values: {
            runtime: true,
            restored: true,
          },
        },
      ],
    }),
    /diagnostic\.missing\.saved.*saved/,
  )

  assert.throws(
    () => assertProjectParityFixture({
      label: 'diagnostic',
      fields: [
        {
          path: 'drifting.text',
          values: {
            runtime: 'HELLO',
            saved: 'HELLO',
            restored: 'GOODBYE',
            export: 'HELLO',
          },
        },
      ],
    }),
    /diagnostic\.drifting\.text.*restored differs from runtime/,
  )
})
