import assert from 'node:assert/strict'
import test from 'node:test'

import type {
  ApplicationMenuCommandIngressDependencies,
} from '../applicationMenu/applicationMenuRuntime.ts'
import {
  connectApplicationMenuCommandIngress,
} from './useApplicationMenuLifecycleIngress.ts'

test('menu lifecycle feedback uses the shared publisher and Home mirror', () => {
  let ingress: ApplicationMenuCommandIngressDependencies | null = null
  let disconnects = 0
  const announcements: Readonly<{
    message: string
    deduplicationKey?: string
  }>[] = []
  const homeMessages: string[] = []
  const activeKeys = new Set<string>()
  const disconnect = connectApplicationMenuCommandIngress({
    connectCommandIngress(dependencies) {
      ingress = dependencies
      return () => { disconnects += 1 }
    },
  }, {
    announceStatus(message, options) {
      const key = options?.deduplicationKey
      announcements.push({
        message,
        ...(key ? { deduplicationKey: key } : {}),
      })
      if (key && activeKeys.has(key)) return false
      if (key) activeKeys.add(key)
      return true
    },
    setHomeStatusMessage(message) {
      homeMessages.push(message)
    },
  })

  ingress!.publishFeedback({
    disposition: 'executed',
    commandId: 'project.open',
    result: { status: 'cancelled', reason: 'file-dialog-dismissed' },
  })
  ingress!.publishFeedback({
    disposition: 'executed',
    commandId: 'project.open',
    result: { status: 'cancelled', reason: 'file-dialog-dismissed' },
  })
  ingress!.publishFeedback({
    disposition: 'executed',
    commandId: 'project.save',
    result: { status: 'success', value: undefined },
  })

  assert.deepEqual(announcements, [
    {
      message: 'Load cancelled.',
      deduplicationKey: 'project.open:cancelled:file-dialog-dismissed',
    },
    {
      message: 'Load cancelled.',
      deduplicationKey: 'project.open:cancelled:file-dialog-dismissed',
    },
  ])
  assert.deepEqual(homeMessages, ['Load cancelled.'])
  disconnect()
  assert.equal(disconnects, 1)
})
