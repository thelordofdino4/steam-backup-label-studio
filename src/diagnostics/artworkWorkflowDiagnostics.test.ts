import assert from 'node:assert/strict'
import test from 'node:test'
import { createApplicationCommandDiagnostics } from './applicationCommandDiagnostics.ts'
import { startArtworkWorkflow } from './artworkWorkflowDiagnostics.ts'
import { commandFailed } from '../lifecycle/applicationCommandTypes.ts'

test('artwork diagnostics distinguish read, validation, decode, download, and apply failures', () => {
  let now = 10
  const collector = createApplicationCommandDiagnostics({ now: () => now })
  for (const stage of ['read', 'validate', 'decode', 'download', 'apply'] as const) {
    const observation = startArtworkWorkflow(collector.observeArtworkWorkflow, 'artwork.import', now, stage)
    assert.equal(collector.snapshot().records.at(-1)?.stage, stage)
    now += 3
    observation.finish(true, 'failure')
    const receipt = collector.snapshot().records.at(-1)
    assert.equal(receipt?.stage, stage)
    assert.equal(receipt?.status, 'failure')
    assert.equal(receipt?.elapsedMs, 3)
  }
  assert.deepEqual(collector.snapshot().records.map(row => row.failureCode), [
    'image.read-failed', 'image.validation-failed', 'image.decode-failed', 'artwork.download-failed', 'image.apply-failed',
  ])
})

test('artwork diagnostics use the existing bounded report and ignore private or mismatched values', () => {
  const collector = createApplicationCommandDiagnostics({ capacity: 2 })
  const discarded = startArtworkWorkflow(collector.observeArtworkWorkflow, 'image.disc-background-import', 1, 'read')
  const malformed = collector.observeArtworkWorkflow({ workflowId: 'private-workflow', requestId: 'private-id' } as never)!
  malformed.stage('private-stage' as never)
  malformed.complete(commandFailed({
    code: 'private-code', userMessage: 'private text', recoverable: true,
    cause: { stage: 'private-stage', filename: 'private/image.png', bytes: 'private bytes' },
  }))
  const partial = startArtworkWorkflow(collector.observeArtworkWorkflow, 'artwork.discovery', 2, 'discover')
  partial.finish(true, 'partial')
  discarded.finish(true)
  partial.finish(true, 'failure')
  const report = collector.snapshot()
  assert.equal(report.evicted, 1)
  assert.equal(report.records[0].workflowId, 'unknown')
  assert.equal(report.records[0].requestId, undefined)
  assert.equal(report.records[0].stage, 'unclassified')
  assert.equal(report.records[0].failureCode, 'unclassified')
  assert.equal(report.records[1].status, 'success')
  assert.equal(report.records[1].partial, true)
  assert.doesNotMatch(collector.toJson(), /private/)
})

test('stale completions cancel and diagnostic exceptions cannot change caller control flow', () => {
  const collector = createApplicationCommandDiagnostics()
  const stale = startArtworkWorkflow(collector.observeArtworkWorkflow, 'artwork.discovery', 1, 'discover')
  stale.finish(false, 'failure')
  assert.equal(collector.snapshot().records[0].status, 'cancelled')
  assert.equal(collector.snapshot().records[0].failureCode, undefined)
  const observation = startArtworkWorkflow(() => ({
    stage() { throw new Error('not an app failure') },
    complete() { throw new Error('not an app failure') },
  }), 'image.disc-background-import', 1, 'read')
  assert.doesNotThrow(() => observation.stage('validate'))
  assert.doesNotThrow(() => observation.finish(true, 'failure'))
})
