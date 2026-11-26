import assert from 'node:assert/strict'
import test from 'node:test'
import { beginLifecyclePerformanceSample, createLifecyclePerformanceObserver, isLifecycleTimingEnabled } from './lifecyclePerformanceObserver.ts'

test('bounded samples retain sanitized scalars, stable snapshots and one completion', () => {
  let clock = 0
  const observer = createLifecyclePerformanceObserver(() => clock++)
  const first = observer.begin('project.open', 0)!
  first('cancelled', 0)
  first('success', 9)
  const snapshot = observer.snapshot()
  assert.equal(snapshot.samples.length, 1)
  assert.deepEqual(snapshot.samples[0], { sequence: 1, boundary: 'project.open',
    outcome: 'cancelled', elapsedMs: 1, generationBefore: 0, generationAfter: 0 })
  for (let i = 0; i < 300; i++) observer.begin('project.save', 0)!('failure', 0)
  assert.equal(observer.snapshot().samples.length, 256)
  assert.equal(observer.snapshot().dropped, 45)
  assert.equal(snapshot.samples.length, 1)
  assert.ok(Object.isFrozen(snapshot.samples))
})

test('disabled and failing diagnostic paths do not propagate failures', () => {
  assert.equal(beginLifecyclePerformanceSample(undefined, 'project.open', 0), undefined)
  const throwing = createLifecyclePerformanceObserver(() => { throw Error('private path') })
  assert.equal(throwing.begin('project.open', 0), undefined)
  assert.deepEqual(throwing.snapshot().samples, [])
  assert.equal(throwing.snapshot().invalid, 1)
  const invalid = createLifecyclePerformanceObserver(() => Number.NaN)
  invalid.begin('project.open', 0)!('success', 1)
  assert.equal(invalid.snapshot().invalid, 1)
  const bad = { begin() { throw Error('bad observer') }, snapshot: invalid.snapshot }
  assert.equal(beginLifecyclePerformanceSample(bad, 'project.open', 0), undefined)
  const badFinish = { begin() { return () => { throw Error('bad finish') } }, snapshot: invalid.snapshot }
  assert.doesNotThrow(() => beginLifecyclePerformanceSample(badFinish, 'project.open', 0)!('failure', 0))
})


test('only explicit development flag enables collection', () => {
  for (const flag of [undefined, null, '', 'true', 1, true, '0']) {
    assert.equal(isLifecycleTimingEnabled(true, flag), false)
  }
  assert.equal(isLifecycleTimingEnabled(false, '1'), false)
  assert.equal(isLifecycleTimingEnabled(true, '1'), true)
})
