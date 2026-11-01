import assert from 'node:assert/strict'
import test from 'node:test'
import { createNativeTerminationPort, NATIVE_TERMINATION_EVENT } from './nativeTermination.ts'

function harness() {
  let receive!: (payload: unknown) => void
  let unlistened = 0
  const calls: Array<{ command: string; args: Record<string, unknown> }> = []
  const requests: string[] = []
  const dependencies = {
    windowLabel: 'main', bridgeId: 'bridge',
    listenEvent: async (event: string, handler: (payload: unknown) => void) => {
      assert.equal(event, NATIVE_TERMINATION_EVENT)
      receive = handler
      return () => { unlistened++ }
    },
    invokeCommand: async (command: string, args: Record<string, unknown>) => {
      calls.push({ command, args })
      return { status: 'success' }
    },
  }
  const event = (overrides = {}) => receive({ bridgeId: 'bridge', windowLabel: 'main', sequence: 1, kind: 'close-window', ...overrides })
  return { dependencies, calls, requests, event, receive: (value: unknown) => receive(value), unlistened: () => unlistened }
}

test('bridge listens before install and validates identity, kind, bounded sequence and replay', async () => {
  const h = harness()
  const port = await createNativeTerminationPort((kind) => h.requests.push(kind), h.dependencies)
  for (const value of [null, [], 'quit', 0, { kind: 'quit' }]) h.receive(value)
  for (const invalid of [
    { bridgeId: 'old' }, { windowLabel: 'other' }, { kind: 'destroy' },
    { sequence: 0 }, { sequence: -1 }, { sequence: 1.5 },
    { sequence: Number.MAX_SAFE_INTEGER + 1 }, { sequence: Infinity },
  ]) h.event(invalid)
  assert.deepEqual(h.requests, [])
  h.event()
  h.event()
  h.event({ sequence: 2, kind: 'quit' })
  h.event({ sequence: 1 })
  assert.deepEqual(h.requests, ['close-window', 'quit'])
  await port.commit('quit')
  assert.deepEqual(h.calls, [
    { command: 'install_native_termination', args: { bridgeId: 'bridge' } },
    { command: 'commit_native_termination', args: { request: { bridgeId: 'bridge', kind: 'quit' } } },
  ])
  await port.dispose()
  await port.dispose()
  h.event({ sequence: 3 })
  assert.equal(h.requests.length, 2)
  assert.equal(h.unlistened(), 1)
  await assert.rejects(port.commit('close-window'), /disposed/)
  assert.equal(h.calls.filter((call) => call.command === 'dispose_native_termination').length, 1)
})

test('invalid window and bridge identities never install or listen', async () => {
  for (const invalid of [{ windowLabel: 'other' }, { bridgeId: '' }, { bridgeId: 'x'.repeat(129) }, { bridgeId: 'bad\0id' }]) {
    const h = harness()
    await assert.rejects(createNativeTerminationPort(() => {}, { ...h.dependencies, ...invalid }), /identity/)
    assert.deepEqual(h.calls, [])
  }
})

test('failed or malformed install removes the listener and cannot deliver requests', async () => {
  for (const failure of ['throw', 'malformed']) {
    const h = harness()
    await assert.rejects(createNativeTerminationPort(() => { throw new Error('must not deliver') }, {
      ...h.dependencies,
      invokeCommand: async () => {
        h.event()
        if (failure === 'throw') throw new Error('bridge failed')
        return { status: 'failure' }
      },
    }))
    assert.equal(h.unlistened(), 1)
    h.event({ sequence: 2 })
  }
})

test('native commit rejection and malformed acknowledgement propagate without silently succeeding', async () => {
  for (const response of [null, {}, { status: 'failure' }]) {
    const h = harness()
    const port = await createNativeTerminationPort(() => {}, {
      ...h.dependencies,
      invokeCommand: async (command, args) => command === 'commit_native_termination' ? response : h.dependencies.invokeCommand(command, args),
    })
    await assert.rejects(port.commit('close-window'), /response/)
    await port.dispose()
  }
})
