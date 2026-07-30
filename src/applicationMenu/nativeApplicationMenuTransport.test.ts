import assert from 'node:assert/strict'
import test from 'node:test'

import { createApplicationMenuPlatformDescriptor } from './applicationMenuRegistry.ts'
import type { ApplicationMenuProjection } from './applicationMenuTypes.ts'
import {
  createNativeApplicationMenuDescriptor,
  createNativeApplicationMenuProjection,
  parseApplicationMenuInvocation,
  parseApplicationMenuPlatform,
  parseNativeApplicationMenuDisposeResult,
  parseNativeApplicationMenuInstallResult,
  parseNativeApplicationMenuProjectionResult,
} from './nativeApplicationMenuTransport.ts'

test('native descriptors preserve the exact TypeScript-owned platform hierarchy', () => {
  for (const platform of ['windows', 'linux', 'macos'] as const) {
    const source = createApplicationMenuPlatformDescriptor(platform)
    const native = createNativeApplicationMenuDescriptor(source)
    assert.equal(native.platform, platform)
    assert.deepEqual(
      native.productMenus.map(({ id, label }) => ({ id, label })),
      [
        { id: 'menu.file', label: 'File' },
        { id: 'menu.edit', label: 'Edit' },
        { id: 'menu.tools', label: 'Tools' },
        { id: 'menu.window', label: 'Window' },
        { id: 'menu.help', label: 'Help' },
      ],
    )
    assert.deepEqual(native.itemIds, source.items.map((item) => item.itemId))
    assert.equal(JSON.stringify(native).includes('semanticTarget'), false)
    assert.equal(JSON.stringify(native).includes('capability'), false)
    assert.equal(JSON.stringify(native).includes('menu.help.report-issue'), false)
  }

  const windows = createNativeApplicationMenuDescriptor(
    createApplicationMenuPlatformDescriptor('windows'),
  )
  const macos = createNativeApplicationMenuDescriptor(
    createApplicationMenuPlatformDescriptor('macos'),
  )
  assert.deepEqual(windows.applicationMenuEntries, [])
  assert.deepEqual(
    macos.applicationMenuEntries.flatMap((entry) =>
      entry.kind === 'item' ? [entry.itemId] : []),
    ['menu.help.about', 'menu.file.quit'],
  )
  assert.deepEqual(
    macos.productMenus.find((menu) => menu.id === 'menu.help')?.entries,
    [{
      kind: 'item',
      itemId: 'menu.help.documentation',
      label: 'Steam Backup Label Studio Help',
      accelerator: null,
    }],
  )
})

test('native projection transport preserves enabled checked and dynamic label state', () => {
  const source: ApplicationMenuProjection = {
    generation: 9,
    platform: 'windows',
    windowLabel: 'main',
    workspace: 'home',
    items: [{
      itemId: 'menu.window.toggle-maximize',
      enabled: true,
      checked: true,
      visible: true,
      label: 'Restore',
    }],
  }
  assert.deepEqual(createNativeApplicationMenuProjection(source), {
    generation: 9,
    platform: 'windows',
    windowLabel: 'main',
    items: [{
      itemId: 'menu.window.toggle-maximize',
      enabled: true,
      checked: true,
      label: 'Restore',
    }],
  })
})

test('native response parsers require exact identities and response shapes', () => {
  assert.equal(parseApplicationMenuPlatform('windows'), 'windows')
  assert.throws(() => parseApplicationMenuPlatform('win32'), /invalid/)

  const expected = {
    platform: 'windows' as const,
    windowLabel: 'main',
    bridgeInstanceId: 'bridge-1',
    itemCount: 26,
  }
  assert.deepEqual(parseNativeApplicationMenuInstallResult({
    status: 'installed',
    platform: 'windows',
    windowLabel: 'main',
    bridgeInstanceId: 'bridge-1',
    itemCount: 26,
  }, expected), {
    status: 'installed',
    platform: 'windows',
    windowLabel: 'main',
    bridgeInstanceId: 'bridge-1',
    itemCount: 26,
  })
  assert.throws(() => parseNativeApplicationMenuInstallResult({
    status: 'installed',
    platform: 'windows',
    windowLabel: 'main',
    bridgeInstanceId: 'bridge-1',
    itemCount: 26,
    unexpected: true,
  }, expected), /invalid/)

  assert.deepEqual(parseNativeApplicationMenuProjectionResult({
    status: 'applied', windowLabel: 'main', generation: 3,
  }, 'main', 3), {
    status: 'applied', windowLabel: 'main', generation: 3,
  })
  assert.deepEqual(parseNativeApplicationMenuProjectionResult({
    status: 'ignored',
    windowLabel: 'main',
    generation: 3,
    reason: 'duplicate-generation',
  }, 'main', 3), {
    status: 'ignored',
    windowLabel: 'main',
    generation: 3,
    reason: 'duplicate-generation',
  })
  assert.throws(() => parseNativeApplicationMenuProjectionResult({
    status: 'ignored', windowLabel: 'main', generation: 3, reason: 'wrong-window',
  }, 'main', 3), /invalid/)

  assert.deepEqual(parseNativeApplicationMenuDisposeResult({
    status: 'disposed', windowLabel: 'main',
  }, 'main'), {
    status: 'disposed', windowLabel: 'main',
  })
  assert.throws(() => parseNativeApplicationMenuDisposeResult({
    status: 'disposed', windowLabel: 'other',
  }, 'main'), /invalid/)
})

test('native invocation parsing rejects malformed, foreign, and unknown events', () => {
  const expected = { bridgeInstanceId: 'bridge-1', windowLabel: 'main' }
  const valid = {
    invocationId: 'menu-0001',
    bridgeInstanceId: 'bridge-1',
    itemId: 'menu.file.open',
    windowLabel: 'main',
    projectionGeneration: 7,
  }
  assert.deepEqual(parseApplicationMenuInvocation(valid, expected), valid)
  for (const invalid of [
    { ...valid, bridgeInstanceId: 'bridge-2' },
    { ...valid, windowLabel: 'other' },
    { ...valid, itemId: 'menu.file.unknown' },
    { ...valid, projectionGeneration: -1 },
    { ...valid, extra: true },
  ]) {
    assert.throws(() => parseApplicationMenuInvocation(invalid, expected), /invalid/)
  }
})
