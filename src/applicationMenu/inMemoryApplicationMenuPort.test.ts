import assert from 'node:assert/strict'
import test from 'node:test'
import { createApplicationMenuPlatformDescriptor } from './applicationMenuRegistry.ts'
import { InMemoryApplicationMenuProjectionPort } from './inMemoryApplicationMenuPort.ts'
import type {
  ApplicationMenuPlatformDescriptor,
  ApplicationMenuProjection,
} from './applicationMenuTypes.ts'

function createProjection(
  descriptor: ApplicationMenuPlatformDescriptor,
  windowLabel: string,
  generation: number,
): ApplicationMenuProjection {
  return {
    generation,
    platform: descriptor.platform,
    windowLabel,
    workspace: 'home',
    items: descriptor.items.map((item) => ({
      itemId: item.itemId,
      enabled: true,
      checked: false,
      visible: true,
    })),
  }
}

test('the in-memory port records immutable descriptors and never mutates supplied projections', () => {
  const descriptor = createApplicationMenuPlatformDescriptor('windows')
  const port = new InMemoryApplicationMenuProjectionPort(descriptor)
  const supplied = createProjection(descriptor, 'main', 1)
  const before = structuredClone(supplied)

  assert.deepEqual(port.applyProjection(supplied), {
    status: 'applied', windowLabel: 'main', generation: 1,
  })
  assert.deepEqual(supplied, before)
  assert.notEqual(port.platformDescriptor, descriptor)
  assert.ok(Object.isFrozen(port.platformDescriptor))
  assert.ok(Object.isFrozen(port.platformDescriptor.productMenus))

  const stored = port.getProjection('main')
  assert.ok(stored)
  assert.notEqual(stored, supplied)
  assert.ok(Object.isFrozen(stored))
  assert.ok(Object.isFrozen(stored.items))
  assert.ok(Object.isFrozen(stored.items[0]))
})

test('newer generations replace older ones while duplicate and stale updates are deterministic', () => {
  const descriptor = createApplicationMenuPlatformDescriptor('linux')
  const port = new InMemoryApplicationMenuProjectionPort(descriptor)
  assert.equal(port.applyProjection(createProjection(descriptor, 'main', 4)).status,
    'applied')
  assert.deepEqual(port.applyProjection(createProjection(descriptor, 'main', 4)), {
    status: 'ignored',
    windowLabel: 'main',
    generation: 4,
    reason: 'duplicate-generation',
  })
  assert.deepEqual(port.applyProjection(createProjection(descriptor, 'main', 3)), {
    status: 'ignored',
    windowLabel: 'main',
    generation: 3,
    reason: 'stale-generation',
  })
  assert.equal(port.getProjection('main')?.generation, 4)
  assert.equal(port.applyProjection(createProjection(descriptor, 'main', 5)).status,
    'applied')
  assert.equal(port.getProjection('main')?.generation, 5)
})

test('projection generations are isolated by window label', () => {
  const descriptor = createApplicationMenuPlatformDescriptor('macos')
  const port = new InMemoryApplicationMenuProjectionPort(descriptor)
  port.applyProjection(createProjection(descriptor, 'main', 8))
  port.applyProjection(createProjection(descriptor, 'secondary', 1))

  assert.deepEqual(port.listWindowLabels(), ['main', 'secondary'])
  assert.equal(port.getProjection('main')?.generation, 8)
  assert.equal(port.getProjection('secondary')?.generation, 1)
  assert.equal(port.getProjection('missing'), null)
})

test('the port rejects platform and item catalogs that do not match its descriptor', () => {
  const descriptor = createApplicationMenuPlatformDescriptor('windows')
  const port = new InMemoryApplicationMenuProjectionPort(descriptor)
  const wrongPlatform = {
    ...createProjection(descriptor, 'main', 1),
    platform: 'linux' as const,
  }
  assert.throws(() => port.applyProjection(wrongPlatform), /does not match port/)

  const missingItem = createProjection(descriptor, 'main', 1)
  assert.throws(() => port.applyProjection({
    ...missingItem,
    items: missingItem.items.slice(1),
  }), /do not match the platform descriptor/)
})
