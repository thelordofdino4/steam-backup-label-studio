import assert from 'node:assert/strict'
import test from 'node:test'

import {
  APPLICATION_MENU_DESCRIPTOR_REGISTRY,
} from './applicationMenuRegistry.ts'
import { resolveApplicationMenuWorkflow } from './applicationMenuWorkflowRouting.ts'
import type {
  ApplicationMenuDescriptorRegistry,
} from './applicationMenuTypes.ts'

test('resolves every Tools item only through its authoritative descriptor', () => {
  const cases = [
    ['menu.tools.game', 'disc', 'workflow.game', 'control.game.query'],
    [
      'menu.tools.disc-template',
      'disc',
      'workflow.disc-template',
      'control.disc-template.selector',
    ],
    [
      'menu.tools.disc-layout-presets',
      'disc',
      'workflow.disc-layout-presets',
      'control.disc-layout-presets.selector',
    ],
    [
      'menu.tools.case-layout-presets',
      'case-cover',
      'workflow.case-layout-presets',
      'control.case-layout-presets.selector',
    ],
    [
      'menu.tools.export-options',
      'disc',
      'workflow.export-options',
      'control.export.disc.center-hole',
    ],
  ] as const

  for (const [itemId, target, workflowId, controlId] of cases) {
    const result = resolveApplicationMenuWorkflow(itemId, target)
    assert.equal(result.status, 'resolved')
    if (result.status !== 'resolved') continue
    assert.equal(result.intent.workflowId, workflowId)
    assert.equal(result.intent.destination.controlId, controlId)
    assert.equal(result.intent.behavior, 'focus')
  }
})

test('resolves equivalent combined Spine entries without inventing side state', () => {
  for (const [itemId, controlId] of [
    ['menu.tools.game', 'control.game.query'],
    ['menu.tools.export-options', 'control.export.case.tray-trim'],
    ['menu.tools.case-layout-presets', 'control.case-layout-presets.selector'],
  ] as const) {
    const result = resolveApplicationMenuWorkflow(itemId, 'case-spine')
    assert.equal(result.status, 'resolved')
    if (result.status === 'resolved') {
      assert.equal(result.intent.destination.controlId, controlId)
      assert.equal(result.intent.destination.workspaceId, 'workspace.case')
    }
  }
})

function registryWithItemPatch(
  itemId: string,
  patch: Record<string, unknown>,
): ApplicationMenuDescriptorRegistry {
  return {
    ...APPLICATION_MENU_DESCRIPTOR_REGISTRY,
    items: APPLICATION_MENU_DESCRIPTOR_REGISTRY.items.map((item) =>
      item.id === itemId ? { ...item, ...patch } : item),
  } as ApplicationMenuDescriptorRegistry
}

test('rejects malformed, unknown, non-Tools, wrong-owner, wrong-target, and non-first-release input', () => {
  assert.deepEqual(resolveApplicationMenuWorkflow(null, 'disc'), {
    status: 'rejected', reason: 'invalid-item-id',
  })
  assert.deepEqual(resolveApplicationMenuWorkflow(
    'menu.tools.not-real',
    'disc',
  ), { status: 'rejected', reason: 'unknown-item' })
  assert.deepEqual(resolveApplicationMenuWorkflow('menu.file.open', 'disc'), {
    status: 'rejected', reason: 'non-tools-item',
  })
  assert.equal(resolveApplicationMenuWorkflow(
    'menu.tools.game',
    'disc',
    registryWithItemPatch('menu.tools.game', {
      eventRoutingOwner: 'domain-command-dispatcher',
    }),
  ).status, 'rejected')
  assert.deepEqual(resolveApplicationMenuWorkflow(
    'menu.tools.game',
    null,
  ), { status: 'rejected', reason: 'destination-unavailable' })
  assert.equal(resolveApplicationMenuWorkflow(
    'menu.tools.game',
    'disc',
    registryWithItemPatch('menu.tools.game', { release: 'future' }),
  ).status, 'rejected')
  assert.equal(resolveApplicationMenuWorkflow(
    'menu.tools.game',
    'disc',
    registryWithItemPatch('menu.tools.game', {
      semanticTarget: { kind: 'native-window' },
    }),
  ).status, 'rejected')
})

test('routing owns no copied item-to-destination map or operation target', async () => {
  const source = await import('node:fs/promises').then(({ readFile }) =>
    readFile(new URL('./applicationMenuWorkflowRouting.ts', import.meta.url), 'utf8'))
  assert.doesNotMatch(source, /menu\.tools\.(game|disc-template|disc-layout-presets|case-layout-presets|export-options)/)
  assert.doesNotMatch(source, /export\.png|\.apply|\.search|\.import/)
})
