import assert from 'node:assert/strict'
import test from 'node:test'
import { commandFailed, commandSucceeded } from '../lifecycle/applicationCommandTypes.ts'
import { createApplicationCommandDiagnostics } from '../diagnostics/applicationCommandDiagnostics.ts'
import { observeSteamWorkflowSafely, steamWorkflowError } from './steamWorkflowDiagnostics.ts'

test('Steam stages retain internal causes while projecting safe copy and exact diagnostic categories', () => {
  const cause = new Error('private-native-path-token')
  let time = 5
  const diagnostics = createApplicationCommandDiagnostics({ now: () => time })
  const observation = diagnostics.observeSteamWorkflow({ workflowId: 'steam.import', requestId: 1 })!
  observation.stage('prepare')
  time = 30
  assert.equal(diagnostics.snapshot().records[0].elapsedMs, 25)
  const failure = steamWorkflowError('steam.import', 'prepare', cause)
  assert.equal(failure.cause, cause)
  assert.equal(failure.code, 'steam.import-prepare-failed')
  assert.doesNotMatch(failure.userMessage, /private/)
  observation.complete(commandFailed(failure))
  assert.equal(diagnostics.snapshot().records[0].status, 'failure')
  assert.equal(diagnostics.snapshot().records[0].stage, 'prepare')
  assert.doesNotMatch(diagnostics.toJson(), /private|cause|message/)
})

test('Steam observations share bounds and discard unknown identities and late completions', () => {
  const diagnostics = createApplicationCommandDiagnostics({ capacity: 1, now: () => 0 })
  const old = diagnostics.observeSteamWorkflow({ workflowId: 'steam.search', requestId: 1 })!
  const malformed = diagnostics.observeSteamWorkflow({ workflowId: 'private-job', requestId: 'private-request' } as never)!
  old.complete(commandSucceeded(undefined))
  malformed.stage('private-stage' as never)
  malformed.complete(commandSucceeded({ bytes: 'private-bytes' }))
  assert.equal(diagnostics.snapshot().evicted, 1)
  assert.equal(diagnostics.snapshot().records[0].workflowId, 'unknown')
  assert.equal(diagnostics.snapshot().records[0].requestId, undefined)
  assert.equal(diagnostics.snapshot().records[0].stage, 'unclassified')
  assert.doesNotMatch(diagnostics.toJson(), /private/)
  diagnostics.clear()
  malformed.complete(commandSucceeded(undefined))
  assert.deepEqual(diagnostics.snapshot().records, [])
})

test('throwing Steam observers cannot affect their workflow result or stage execution', () => {
  const failure = () => { throw new Error('observer-failed') }
  for (const observer of [failure, () => ({ stage: failure, complete: failure })]) {
    const safe = observeSteamWorkflowSafely(observer, { workflowId: 'steam.import', requestId: 1 })
    assert.doesNotThrow(() => safe.stage('apply'))
    assert.doesNotThrow(() => safe.complete(commandSucceeded(undefined)))
  }
})
