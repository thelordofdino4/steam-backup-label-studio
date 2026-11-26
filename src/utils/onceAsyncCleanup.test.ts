import assert from 'node:assert/strict'
import test from 'node:test'
import { onceAsyncCleanup } from './onceAsyncCleanup.ts'

test('cleanup revokes authority synchronously and publishes completion before callbacks re-enter', async () => {
  let calls = 0, revoked = false
  let nested: Promise<void> | undefined
  const dispose = onceAsyncCleanup(() => { calls++; revoked = true; nested = dispose() })
  const completion = dispose()
  assert.equal(revoked, true)
  assert.equal(nested, completion)
  assert.equal(dispose(), completion)
  await completion
  assert.equal(calls, 1)
})

for (const asyncFailure of [false, true]) test(`failed cleanup remains failed and does not repeat (${asyncFailure})`, async () => {
  let calls = 0
  const error = Error('cleanup failure')
  const dispose = onceAsyncCleanup(() => {
    calls++
    if (asyncFailure) return Promise.reject(error)
    throw error
  })
  const completion = dispose()
  await assert.rejects(completion, cause => cause === error)
  assert.equal(dispose(), completion)
  await assert.rejects(dispose(), cause => cause === error)
  assert.equal(calls, 1)
})
