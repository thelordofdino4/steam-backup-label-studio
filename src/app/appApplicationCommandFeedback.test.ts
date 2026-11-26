import assert from 'node:assert/strict'
import test from 'node:test'
import {
  publishApplicationCommandFeedback,
  selectApplicationCommandFeedback,
} from './appApplicationCommandFeedback.ts'

test('feedback projection covers Home Open cancellation, failures, declines, and busy state', () => {
  assert.deepEqual(selectApplicationCommandFeedback({
    disposition: 'executed',
    commandId: 'project.open',
    result: { status: 'cancelled', reason: 'file-dialog-dismissed' },
  }), {
    kind: 'warning',
    message: 'Load cancelled.',
    deduplicationKey: 'project.open:cancelled:file-dialog-dismissed',
  })
  assert.deepEqual(selectApplicationCommandFeedback({
    disposition: 'executed',
    commandId: 'project.open',
    result: { status: 'declined', reason: 'replacement-not-authorized' },
  }), {
    kind: 'warning',
    message: 'Open Project cancelled. The current project was kept.',
    deduplicationKey: 'project.open:declined:replacement-not-authorized',
  })
  assert.deepEqual(selectApplicationCommandFeedback({
    disposition: 'executed',
    commandId: 'project.open',
    result: {
      status: 'failure',
      error: {
        code: 'project.open-invalid',
        userMessage: 'The selected project is invalid.',
        recoverable: true,
      },
    },
  }), {
    kind: 'error',
    message: 'The selected project is invalid.',
    deduplicationKey: 'project.open:failure:project.open-invalid',
  })
  assert.deepEqual(selectApplicationCommandFeedback({
    disposition: 'not-executed',
    reason: 'busy',
    commandId: 'project.save',
  }), {
    kind: 'warning',
    message: 'Save is already in progress.',
    deduplicationKey: 'project.save:not-executed:busy',
  })
})

test('explicit owner feedback and deduplication keys pass through unchanged', () => {
  const intent = {
    kind: 'success' as const,
    message: 'Loaded exact project.',
    deduplicationKey: 'project.open:session-8',
  }
  assert.equal(selectApplicationCommandFeedback({
    disposition: 'executed',
    commandId: 'project.open',
    result: { status: 'success', value: undefined, feedback: intent },
  }), intent)
})

test('one feedback owner mirrors Home status only when shared publication succeeds', () => {
  const announcements: unknown[][] = []
  const homeMessages: string[] = []
  const result = {
    disposition: 'executed' as const,
    commandId: 'project.save' as const,
    result: {
      status: 'success' as const,
      value: undefined,
      feedback: {
        kind: 'success' as const,
        message: 'Project saved.',
        deduplicationKey: 'project.save:session-1:2',
      },
    },
  }

  const published = publishApplicationCommandFeedback(result, {
    announceStatus(...args) {
      announcements.push(args)
      return true
    },
    setHomeStatusMessage(message) {
      homeMessages.push(message)
    },
  })
  assert.equal(published?.message, 'Project saved.')
  assert.deepEqual(announcements, [[
    'Project saved.',
    { kind: 'success', deduplicationKey: 'project.save:session-1:2' },
  ]])
  assert.deepEqual(homeMessages, ['Project saved.'])

  const duplicate = publishApplicationCommandFeedback(result, {
    announceStatus: () => false,
    setHomeStatusMessage(message) {
      homeMessages.push(message)
    },
  })
  assert.equal(duplicate, null)
  assert.deepEqual(homeMessages, ['Project saved.'])
})

test('Case Apply success uses one toast-only publication and clears superseded Home feedback', () => {
  const announcements: unknown[][] = []
  const homeMessages: string[] = ['Preset failed.']
  const dispatch = {
    disposition: 'executed' as const,
    commandId: 'case.layoutPreset.apply' as const,
    result: {
      status: 'success' as const,
      value: undefined,
      feedback: {
        kind: 'success' as const,
        message: 'Case layout preset applied.',
        deduplicationKey: 'case.layoutPreset.apply:case-one:1',
      },
    },
  }
  assert.equal(publishApplicationCommandFeedback(dispatch, {
    announceStatus(...args) {
      announcements.push(args)
      return true
    },
    setHomeStatusMessage: (message) => { homeMessages.push(message) },
  }), dispatch.result.feedback)
  assert.deepEqual(announcements, [[
    'Case layout preset applied.',
    {
      kind: 'success',
      deduplicationKey: 'case.layoutPreset.apply:case-one:1',
      toastOnly: true,
    },
  ]])
  assert.deepEqual(homeMessages, ['Preset failed.', ''])
  assert.equal(publishApplicationCommandFeedback(dispatch, {
    announceStatus: () => false,
    setHomeStatusMessage: () => assert.fail('Rejected publication cannot clear status.'),
  }), null)
})

test('Case Apply cancellation, warnings, and failures keep persistent feedback', () => {
  const results = [
    { status: 'cancelled' as const, reason: 'cancelled' },
    {
      status: 'failure' as const,
      error: {
        code: 'case.layoutPreset.apply.failed',
        userMessage: 'Preset failed.',
        recoverable: true,
      },
    },
    {
      status: 'success' as const,
      value: undefined,
      feedback: { kind: 'warning' as const, message: 'Review this warning.' },
    },
  ]
  for (const result of results) {
    const announcements: unknown[][] = []
    const homeMessages: string[] = []
    const feedback = publishApplicationCommandFeedback({
      disposition: 'executed',
      commandId: 'case.layoutPreset.apply',
      result,
    }, {
      announceStatus(...args) {
        announcements.push(args)
        return true
      },
      setHomeStatusMessage: (message) => { homeMessages.push(message) },
    })
    assert.ok(feedback)
    assert.deepEqual(announcements, [[feedback.message, {
      kind: feedback.kind,
      deduplicationKey: feedback.deduplicationKey,
    }]])
    assert.deepEqual(homeMessages, [feedback.message])
  }
})
