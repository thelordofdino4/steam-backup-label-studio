import assert from 'node:assert/strict'
import test from 'node:test'

import type {
  ApplicationCommandDispatchResult,
  ApplicationCommandId,
} from '../lifecycle/applicationCommandTypes.ts'
import {
  APPLICATION_MENU_DESCRIPTOR_REGISTRY,
} from './applicationMenuRegistry.ts'
import {
  dispatchApplicationMenuLifecycleCommand,
  resolveApplicationMenuLifecycleCommand,
} from './applicationMenuLifecycleRouting.ts'
import type {
  ApplicationMenuDescriptorRegistry,
  ApplicationMenuItemId,
} from './applicationMenuTypes.ts'

const expectedMappings = Object.freeze([
  ['menu.file.new-disc', 'project.new-disc'],
  ['menu.file.new-case', 'project.new-case'],
  ['menu.file.open', 'project.open'],
  ['menu.file.save', 'project.save'],
  ['menu.file.save-as', 'project.save-as'],
  ['menu.file.return-home', 'workspace.return-home'],
  ['menu.file.resume-project', 'project.resume'],
] as const satisfies readonly (readonly [ApplicationMenuItemId, ApplicationCommandId])[])

test('descriptor semantic targets resolve the seven connected File lifecycle commands', () => {
  assert.deepEqual(
    expectedMappings.map(([itemId]) =>
      resolveApplicationMenuLifecycleCommand(itemId)),
    expectedMappings.map(([itemId, commandId]) => ({
      status: 'resolved',
      itemId,
      commandId,
    })),
  )
})

test('routing rejects excluded, non-File, unknown, and reserved presentation IDs', () => {
  const rejected = [
    ['menu.file.export-png', 'wrong-routing-owner'],
    ['menu.file.close-project', 'lifecycle-command-not-connected'],
    ['menu.file.close-window', 'lifecycle-command-not-connected'],
    ['menu.file.quit', 'lifecycle-command-not-connected'],
    ['menu.edit.cut', 'non-file-item'],
    ['menu.tools.game', 'non-file-item'],
    ['menu.window.minimize', 'non-file-item'],
    ['menu.help.about', 'non-file-item'],
    ['menu.help.report-issue', 'reserved-item'],
    ['menu.file.unknown', 'unknown-item'],
  ] as const

  for (const [itemId, reason] of rejected) {
    assert.deepEqual(resolveApplicationMenuLifecycleCommand(itemId), {
      status: 'rejected',
      reason,
    })
  }
})

test('routing rejects malformed descriptor ownership and semantic targets', () => {
  const source = APPLICATION_MENU_DESCRIPTOR_REGISTRY.items.find(
    (item) => item.id === 'menu.file.open',
  )!
  const registry = (item: object) => ({
    ...APPLICATION_MENU_DESCRIPTOR_REGISTRY,
    items: [{ ...source, ...item }],
  }) as unknown as ApplicationMenuDescriptorRegistry

  assert.deepEqual(resolveApplicationMenuLifecycleCommand(
    'menu.file.open',
    registry({ eventRoutingOwner: 'native-window-adapter' }),
  ), { status: 'rejected', reason: 'wrong-routing-owner' })
  assert.deepEqual(resolveApplicationMenuLifecycleCommand(
    'menu.file.open',
    registry({ semanticTarget: { kind: 'native-window' } }),
  ), { status: 'rejected', reason: 'non-lifecycle-target' })
  assert.deepEqual(resolveApplicationMenuLifecycleCommand(
    'menu.file.open',
    registry({
      semanticTarget: {
        kind: 'lifecycle-command',
        commandId: 'project.not-real',
      },
    }),
  ), { status: 'rejected', reason: 'unknown-lifecycle-command' })
})

test('resolved menu lifecycle input dispatches through the supplied root exactly once', async () => {
  const commandIds: string[] = []
  const dispatchResult = Object.freeze({
    disposition: 'not-executed',
    reason: 'disabled',
    commandId: 'project.save',
  } as const satisfies ApplicationCommandDispatchResult<void>)

  const result = await dispatchApplicationMenuLifecycleCommand(
    'menu.file.save',
    {
      async dispatch(commandId: string) {
        commandIds.push(commandId)
        return dispatchResult
      },
    },
  )

  assert.deepEqual(commandIds, ['project.save'])
  assert.deepEqual(result, {
    status: 'dispatched',
    itemId: 'menu.file.save',
    commandId: 'project.save',
    dispatch: dispatchResult,
  })

  await dispatchApplicationMenuLifecycleCommand(
    'menu.file.export-png',
    {
      async dispatch(commandId: string) {
        commandIds.push(commandId)
        return dispatchResult
      },
    },
  )
  assert.deepEqual(commandIds, ['project.save'])
})
