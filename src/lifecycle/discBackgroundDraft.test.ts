import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDiscBackgroundDraftController,
  type DiscBackgroundDraftTransform,
} from './discBackgroundDraft.ts'

const identity = { sessionId: 'disc', revision: 7 }
const value = (x: number, y: number, scale = 2) => ({ scale, offset: { x, y } })
const original = value(2, -4)

function forbidden() { throw new Error('unexpected publication') }

test('a draft projects only transient offset, then submits final transform once', () => {
  const controller = createDiscBackgroundDraftController()
  const ticket = controller.begin(identity, original)!
  assert.equal(controller.update(ticket, identity, value(10, 7)), 'updated')
  const final = value(-12.5, 3, 2.5)
  assert.equal(controller.update(ticket, identity, final), 'updated')
  final.offset.x = 99
  final.scale = 7
  assert.deepEqual(controller.getEffectiveTransform(identity, original), value(-12.5, 3, 2.5))
  const published: DiscBackgroundDraftTransform[] = []
  const answer = Object.freeze({ status: 'committed' })
  const result = controller.finish(ticket, identity, (input) => {
    published.push(input)
    assert.equal(controller.getEffectiveTransform(identity, original), original)
    assert.deepEqual(controller.finish(ticket, identity, forbidden), { status: 'inactive' })
    return answer
  })
  assert.deepEqual(result, { status: 'submitted', result: answer })
  assert.deepEqual(published, [{ ...identity, ...value(-12.5, 3, 2.5) }])
  assert.ok(Object.isFrozen(published[0]) && Object.isFrozen(published[0].offset))
})

test('an unchanged draft, including movement back to the original, does not submit', () => {
  const controller = createDiscBackgroundDraftController()
  const mutableOrigin = value(2, -4)
  const ticket = controller.begin(identity, mutableOrigin)!
  mutableOrigin.offset.x = 100
  mutableOrigin.scale = 3
  assert.equal(controller.update(ticket, identity, original), 'no-op')
  assert.equal(controller.update(ticket, identity, value(2, -4, 3)), 'updated')
  assert.equal(controller.update(ticket, identity, original), 'updated')
  assert.deepEqual(controller.finish(ticket, identity, forbidden), { status: 'no-op' })
  assert.equal(controller.cancel(ticket), false)
})

test('session/revision mismatches retire a draft permanently', () => {
  const controller = createDiscBackgroundDraftController()
  const nextRevision = { ...identity, revision: 8 }
  const otherSession = { ...identity, sessionId: 'other-disc' }
  let ticket = controller.begin(identity, original)!
  assert.equal(controller.update(ticket, nextRevision, value(1, 1)), 'stale')
  assert.deepEqual(controller.finish(ticket, identity, forbidden), { status: 'inactive' })

  ticket = controller.begin(identity, original)!
  assert.deepEqual(controller.finish(ticket, otherSession, forbidden), { status: 'stale' })

  ticket = controller.begin(identity, original)!
  controller.update(ticket, identity, value(1, 1))
  const currentOffset = value(-1, -1)
  assert.equal(controller.getEffectiveTransform(null, currentOffset), currentOffset)
  // A stale read can be speculative; only committed invalidation retires it.
  assert.deepEqual(controller.getEffectiveTransform(identity, original), value(1, 1))
  assert.equal(controller.retireStale(identity), false)
  assert.equal(controller.retireStale(null), true)
  assert.deepEqual(controller.finish(ticket, identity, forbidden), { status: 'inactive' })
})

test('an old ticket cannot affect its replacement; cancellation retires the current draft', () => {
  const controller = createDiscBackgroundDraftController()
  const first = controller.begin(identity, original)!
  assert.equal(controller.getActiveTicket(), first)
  const second = controller.begin(identity, original)!
  assert.equal(controller.getActiveTicket(), second)
  assert.equal(controller.cancel(first), false)
  assert.equal(controller.update(first, null, value(1, 1)), 'inactive')
  assert.deepEqual(controller.finish(first, null, forbidden), { status: 'inactive' })
  assert.equal(controller.update(second, identity, value(1, 1)), 'updated')
  assert.equal(controller.cancel(), true)
  assert.equal(controller.getActiveTicket(), undefined)
  assert.deepEqual(controller.finish(second, identity, forbidden), { status: 'inactive' })
})

test('invalid geometry cannot publish; failed publisher never permits duplicate submission', () => {
  const controller = createDiscBackgroundDraftController()
  assert.equal(controller.begin({ ...identity, revision: -1 }, original), null)
  assert.equal(controller.begin(identity, value(Infinity, 0)), null)
  const ticket = controller.begin(identity, original)!
  assert.equal(controller.update(ticket, identity, value(0, NaN)), 'invalid')
  assert.equal(controller.update(ticket, identity, value(0, 0, Infinity)), 'invalid')
  assert.equal(controller.update(ticket, identity, value(0, 0, 0)), 'invalid')
  assert.deepEqual(controller.getEffectiveTransform(identity, original), original)
  controller.update(ticket, identity, value(1, 1))
  const error = new Error('publisher failed')
  assert.throws(() => controller.finish(ticket, identity, () => { throw error }),
    e => e === error)
  assert.deepEqual(controller.finish(ticket, identity, forbidden), { status: 'inactive' })

  const retry = controller.begin(identity, original)!
  controller.update(retry, identity, value(1, 1))
  const rejected = { status: 'stale' }
  assert.deepEqual(controller.finish(retry, identity, () => rejected),
    { status: 'submitted', result: rejected })
  assert.deepEqual(controller.finish(retry, identity, forbidden), { status: 'inactive' })
})
