import assert from 'node:assert/strict'
import test from 'node:test'
import { createApplicationMenuDiagnosticReporter } from './applicationMenuDiagnostics.ts'

test('default menu logs allowlisted codes and stages without raw errors or unknown strings', context => {
  const calls: unknown[][] = []
  context.mock.method(console, 'error', (...args: unknown[]) => { calls.push(args) })
  const report = createApplicationMenuDiagnosticReporter<{ code: string, stage?: string, detail?: string }>()
  report({ code: 'application-menu.start-failed', stage: 'native-platform', detail: 'private-error-path' })
  report({ code: 'private-code', stage: 'private-stage', detail: 'private-query-token' })
  assert.deepEqual(calls, [
    ['application-menu.start-failed', 'native-platform'],
    ['application-menu.unclassified', ''],
  ])
  assert.doesNotMatch(JSON.stringify(calls), /private/)
})
