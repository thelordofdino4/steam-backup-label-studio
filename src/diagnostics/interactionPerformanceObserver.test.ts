import assert from 'node:assert/strict'
import test from 'node:test'
import { createInteractionPerformanceObserver, isInteractionTimingEnabled, observeInteraction } from './interactionPerformanceObserver.ts'
const kind = 'disc-title-artwork-scale' as const

test('exact dev opt-in gate', () => {
  for (const dev of [true, false]) for (const flag of [undefined, false, true, 1, 'true', '0', '1'])
    assert.equal(isInteractionTimingEnabled(dev, flag), dev && flag === '1')
})
test('only first exact identity commit completes; no project values escape', () => {
  let time = 0
  const o = createInteractionPerformanceObserver(() => time)
  const identity = { image: 'secret asset', content: 'secret text' }
  o.expect(o.begin(kind), identity, true); time = 10
  o.commit(kind, identity, true); time = 50; o.commit(kind, identity, true)
  assert.deepEqual(o.snapshot().samples, [{sequence:1,kind,outcome:'preview-commit',elapsedMs:10}])
  assert.ok(!JSON.stringify(o.snapshot()).includes('secret'))
})
test('semantic no-op, hidden, mismatch and expired observations are excluded', () => {
  let time = 0
  const o = createInteractionPerformanceObserver(() => time)
  const identity = {}
  o.expect(o.begin(kind), identity, false)
  o.expect(o.begin(kind), identity, true); o.commit(kind, identity, false)
  o.expect(o.begin(kind), identity, true); o.commit(kind, {}, true); o.commit(kind, identity, true)
  o.expect(o.begin(kind), identity, true); time = 5001; o.commit(kind, identity, true)
  assert.deepEqual(o.snapshot().samples.map(x=>x.outcome), ['no-op','hidden','unmatched-commit','expired'])
  assert.ok(o.snapshot().samples.every(x=>x.elapsedMs===null))
})
test('batch supersedes old event and stale ticket cannot bind to newer result', () => {
  const o = createInteractionPerformanceObserver(() => 1)
  const old = o.begin(kind), next = o.begin(kind), identity = {}
  o.expect(old, identity, true); o.commit(kind, identity, true)
  o.expect(next, identity, true); o.commit(kind, identity, true)
  assert.deepEqual(o.snapshot().samples.map(x=>x.outcome), ['superseded','unmatched-commit'])
})
test('unmount discards all lanes, old objects cannot be resurrected', () => {
  const o = createInteractionPerformanceObserver(() => 1), identity = {}
  o.expect(o.begin(kind), identity, true)
  o.expect(o.begin('disc-custom-note-plain'), {}, true)
  o.unmount(); o.commit(kind, identity, true)
  assert.equal(o.snapshot().pending,0)
  assert.deepEqual(o.snapshot().samples.map(x=>x.outcome), ['preview-unmounted','preview-unmounted'])
})
test('clock faults and backwards clocks cannot throw or emit invalid times', () => {
  let time = 5
  const o = createInteractionPerformanceObserver(() => { if (time === -1) throw Error('private'); return time })
  const identity = {}
  o.expect(o.begin(kind),identity,true);time=4;o.commit(kind,identity,true)
  time=NaN;assert.equal(o.begin(kind),undefined)
  time=-1;assert.equal(o.begin(kind),undefined)
  assert.equal(o.snapshot().invalid,3)
  assert.deepEqual(o.snapshot().samples,[])
  assert.equal(observeInteraction(()=>{throw Error('injected')}),undefined)
})
test('bounded storage with immutable snapshots; missing commit stays explicit', () => {
  const o = createInteractionPerformanceObserver(() => 1)
  for(let i=0;i<300;i++)o.expect(o.begin(kind),{},false)
  const snapshot=o.snapshot()
  assert.equal(snapshot.samples.length,256);assert.equal(snapshot.dropped,44)
  assert.ok(Object.isFrozen(snapshot.samples));assert.ok(Object.isFrozen(snapshot.samples[0]))
  o.begin(kind);assert.equal(o.snapshot().pending,1);assert.equal(snapshot.pending,0)
})
