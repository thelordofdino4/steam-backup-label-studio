import assert from 'node:assert/strict'
import test from 'node:test'
import { prepareNativeTerminationInteraction } from './nativeTerminationInteraction.ts'

test('interaction leases reject overlap and stale restoration cannot unlock a later handoff', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'document')
  const root = { inert: false }
  Object.defineProperty(globalThis, 'document', {
    configurable: true, value: { getElementById: () => root, querySelector: () => null },
  })
  try {
    const first = prepareNativeTerminationInteraction()
    assert.equal(root.inert, true)
    assert.throws(prepareNativeTerminationInteraction, /already owns/)
    first()
    assert.equal(root.inert, false)
    const second = prepareNativeTerminationInteraction()
    first()
    assert.equal(root.inert, true)
    second()
    assert.equal(root.inert, false)
    root.inert = true
    const retained = prepareNativeTerminationInteraction()
    retained()
    assert.equal(root.inert, true)
  } finally {
    if (original) Object.defineProperty(globalThis, 'document', original)
    else Reflect.deleteProperty(globalThis, 'document')
  }
})
