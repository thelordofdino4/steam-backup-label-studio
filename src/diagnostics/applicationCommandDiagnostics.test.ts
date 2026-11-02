import assert from 'node:assert/strict'
import test from 'node:test'
import { commandFailed, commandSucceeded } from '../lifecycle/applicationCommandTypes.ts'
import { createProjectPackageCommandFailure } from '../tauri/packageProjectFile.ts'
import { createApplicationCommandDiagnostics } from './applicationCommandDiagnostics.ts'

const operation = { commandId: 'project.open', operationId: 'application-command-1' } as const

test('diagnostics keep only allowlisted result metadata and bounded monotonic elapsed time', () => {
  let time = 10
  const diagnostics = createApplicationCommandDiagnostics({ now: () => time })
  const finish = diagnostics.observeExecution(operation)!
  time = 25.4
  assert.equal(diagnostics.snapshot().records[0].status, 'running')
  assert.equal(diagnostics.snapshot().records[0].elapsedMs, 15)
  const native = createProjectPackageCommandFailure('project.package.asset-type-invalid', 'asset-validation')
  finish(commandFailed({ code: native.code, userMessage: 'secret-user-copy', diagnosticMessage: 'secret-path', cause: native, recoverable: true }, { kind: 'error', message: 'secret-feedback' }))
  assert.deepEqual(diagnostics.snapshot().records[0], {
    sequence: 1, commandId: 'project.open', operationId: 'application-command-1',
    status: 'failure', failureCode: native.code, stage: 'asset-validation', elapsedMs: 15, elapsedCapped: false,
  })
  time = 100
  assert.equal(diagnostics.snapshot().records[0].elapsedMs, 15)
  assert.doesNotMatch(diagnostics.toJson(), /secret|recoverable|cause|message/i)
})

test('unknown codes, operation IDs, success payloads and malformed statuses cannot become report content', () => {
  const diagnostics = createApplicationCommandDiagnostics({ now: () => 0 })
  diagnostics.observeExecution({ ...operation, operationId: 'private-user-id' })!(commandFailed({
    code: 'private-code', userMessage: 'private-copy', recoverable: false,
    diagnosticMessage: 'private-diagnostic', cause: { stage: 'private-stage', bytes: [1, 2, 3] },
  }))
  diagnostics.observeExecution(operation)!(commandSucceeded({ filename: 'private-file', bytes: [1, 2, 3] }))
  diagnostics.observeExecution(operation)!({ status: 'private-status' } as never)
  const records = diagnostics.snapshot().records
  assert.equal(records[0].failureCode, 'unclassified')
  assert.equal(records[0].operationId, undefined)
  assert.equal(records[0].stage, undefined)
  assert.equal(records[1].status, 'success')
  assert.equal(records[2].failureCode, 'unclassified')
  assert.doesNotMatch(diagnostics.toJson(), /private|filename|bytes/)
})

test('eviction, late completion, clear and disposal keep storage bounded without reviving records', () => {
  const diagnostics = createApplicationCommandDiagnostics({ capacity: 2, now: () => 0 })
  const first = diagnostics.observeExecution(operation)!
  const second = diagnostics.observeExecution(operation)!
  diagnostics.observeExecution(operation)
  first(commandSucceeded(undefined))
  assert.equal(diagnostics.snapshot().evicted, 1)
  assert.deepEqual(diagnostics.snapshot().records.map(record => record.sequence), [2, 3])
  second({ status: 'cancelled', reason: 'file-dialog-dismissed' })
  second(commandSucceeded(undefined))
  assert.equal(diagnostics.snapshot().records[0].status, 'cancelled')
  assert.ok(Object.isFrozen(diagnostics.snapshot().records[0]))
  diagnostics.clear()
  second(commandSucceeded(undefined))
  assert.deepEqual(diagnostics.snapshot().records, [])
  const late = diagnostics.observeExecution(operation)!
  diagnostics.dispose()
  late(commandSucceeded(undefined))
  assert.equal(diagnostics.observeExecution(operation), undefined)
  assert.deepEqual(diagnostics.snapshot().records, [])
  for (const capacity of [0, 201, 1.5, Infinity, NaN]) assert.throws(() => createApplicationCommandDiagnostics({ capacity }), RangeError)
})

test('clock failures and backwards readings do not affect outcomes; long pending durations are capped', () => {
  let time = 10
  const diagnostics = createApplicationCommandDiagnostics({ now: () => { if (time === -1) throw new Error('private-clock'); return time } })
  const finish = diagnostics.observeExecution(operation)!
  time = 5
  assert.equal(diagnostics.snapshot().records[0].elapsedMs, 0)
  time = -1
  assert.equal(diagnostics.snapshot().records[0].elapsedMs, 0)
  time = 100_000_000
  assert.equal(diagnostics.snapshot().records[0].elapsedMs, 86_400_000)
  assert.equal(diagnostics.snapshot().records[0].elapsedCapped, true)
  finish({ status: 'declined', reason: 'replacement-not-authorized' })
  assert.equal(diagnostics.snapshot().records[0].status, 'declined')
})


test('startup and diagnostic events share the command budget and cannot revive after eviction, clear or disposal', () => {
  let time = 0
  const diagnostics = createApplicationCommandDiagnostics({ capacity: 2, now: () => time })
  const startup = diagnostics.observeMenuStartup()!
  startup.stage('native-install')
  time = 12
  assert.equal(diagnostics.snapshot().records[0].elapsedMs, 12)
  diagnostics.observeExecution(operation)
  diagnostics.recordMenuDiagnostic({ code: 'application-menu.invocation-rejected', detail: 'private-query' })
  startup.complete('started')
  assert.equal(diagnostics.snapshot().evicted, 1)
  assert.deepEqual(diagnostics.snapshot().records.map(record => record.sequence), [2, 3])
  const cleared = diagnostics.observeMenuStartup()!
  diagnostics.clear()
  cleared.stage('native-platform')
  cleared.complete('failed')
  assert.deepEqual(diagnostics.snapshot().records, [])
  const late = diagnostics.observeMenuStartup()!
  diagnostics.dispose()
  late.stage('native-install')
  late.complete('started')
  diagnostics.recordMenuDiagnostic({ code: 'application-menu.dispose-failed' })
  assert.equal(diagnostics.observeMenuStartup(), undefined)
  assert.deepEqual(diagnostics.snapshot().records, [])
})

test('menu reports omit arbitrary diagnostic values and retain only exact stages and terminal startup status', () => {
  const diagnostics = createApplicationCommandDiagnostics({ now: () => 0 })
  const startup = diagnostics.observeMenuStartup()!
  startup.stage('private-stage' as never)
  startup.complete('private-result' as never)
  startup.stage('native-platform')
  startup.complete('started')
  diagnostics.recordMenuDiagnostic({ code: 'private-code', stage: 'private-stage', detail: 'private-detail', bytes: 'private-bytes' } as never)
  diagnostics.recordMenuDiagnostic({ code: 'application-menu.projection-failed', stage: 'projection-native-apply', detail: 'private-path' })
  const report = diagnostics.snapshot()
  assert.equal(report.version, 4)
  assert.equal(report.records[0].status, 'failed')
  assert.equal(report.records[0].stage, 'unclassified')
  assert.equal(report.records[1].diagnosticCode, 'application-menu.unclassified')
  assert.equal(report.records[1].stage, undefined)
  assert.equal(report.records[2].stage, 'projection-native-apply')
  assert.doesNotMatch(diagnostics.toJson(), /private|bytes|detail/)
  assert.ok(Object.isFrozen(report.records[2]))
})
