import assert from 'node:assert/strict'
import test from 'node:test'
import { APPLICATION_STARTUP_FAILURES, createApplicationStartupAttempt, type ApplicationStartupStage } from './applicationStartup.ts'
import { createApplicationCommandDiagnostics } from '../diagnostics/applicationCommandDiagnostics.ts'
import { createApplicationLifecycleRuntime } from './applicationLifecycleRuntime.ts'

for (const stage of Object.keys(APPLICATION_STARTUP_FAILURES) as ApplicationStartupStage[]) {
  test(`startup ${stage} failure keeps its prerequisite and bounded elapsed time without raw cause`, () => {
    let time = 0
    const diagnostics = createApplicationCommandDiagnostics({ now: () => time })
    const startup = createApplicationStartupAttempt(diagnostics.observeApplicationStartup)
    startup.stage(stage)
    time = 30
    startup.fail(stage, Error('private-path'))
    const record = diagnostics.snapshot().records[0]
    assert.equal(record.status, 'failure')
    assert.equal(record.stage, stage)
    assert.equal(record.failureCode, `startup.${stage}-failed`)
    assert.equal(record.elapsedMs, 30)
    assert.doesNotMatch(diagnostics.toJson(), /private-path/)
  })
}

test('rendered means the first React commit, and a later render failure gets its own runtime record', () => {
  const diagnostics = createApplicationCommandDiagnostics()
  const startup = createApplicationStartupAttempt(diagnostics.observeApplicationStartup)
  startup.stage('react-render')
  startup.rendered()
  startup.rendered()
  startup.fail('react-render', 'private-cause')
  assert.deepEqual(diagnostics.snapshot().records.map(record => [record.event, record.status]), [['startup','success'],['runtime','failure']])
})

test('startup observer exceptions do not prevent construction or replace failures', () => {
  for (const observe of [() => { throw Error('observer') }, () => ({ stage() { throw Error('observer') }, complete() { throw Error('observer') } })]) {
    const startup = createApplicationStartupAttempt(observe)
    startup.stage('module-load')
    assert.equal(startup.getStage(), 'module-load')
    assert.doesNotThrow(() => startup.fail('module-load', Error('private')))
    assert.doesNotThrow(() => startup.reportRuntimeFailure('react-render', Error('private')))
  }
})

test('disposing a failed runtime preserves an externally owned startup collector for fallback capture', () => {
  const diagnostics = createApplicationCommandDiagnostics()
  const startup = createApplicationStartupAttempt(diagnostics.observeApplicationStartup)
  const runtime = createApplicationLifecycleRuntime({ diagnostics })
  runtime.dispose()
  startup.fail('react-render', 'private')
  assert.equal(diagnostics.snapshot().records[0].status, 'failure')
  diagnostics.dispose()
  assert.deepEqual(diagnostics.snapshot().records, [])
})
