import {
  APPLICATION_MENU_ITEM_IDS,
  type ApplicationMenuAccelerator,
  type ApplicationMenuInvocation,
  type ApplicationMenuItemId,
  type ApplicationMenuPlatform,
  type ApplicationMenuPlatformDescriptor,
  type ApplicationMenuPlatformEntry,
  type ApplicationMenuProjection,
} from './applicationMenuTypes.ts'

export const APPLICATION_MENU_NATIVE_EVENT = 'application-menu://invoked'

export const APPLICATION_MENU_NATIVE_COMMANDS = Object.freeze({
  platform: 'application_menu_platform',
  install: 'install_application_menu',
  applyProjection: 'apply_application_menu_projection',
  dispose: 'dispose_application_menu',
} as const)

export type NativeApplicationMenuEntry =
  | Readonly<{
      kind: 'item'
      itemId: ApplicationMenuItemId
      label: string
      accelerator: ApplicationMenuAccelerator | null
    }>
  | Readonly<{
      kind: 'separator'
    }>

export type NativeApplicationMenuSubmenu = Readonly<{
  id: string
  label: string
  entries: readonly NativeApplicationMenuEntry[]
}>

export type NativeApplicationMenuDescriptor = Readonly<{
  platform: ApplicationMenuPlatform
  productMenus: readonly NativeApplicationMenuSubmenu[]
  applicationMenuEntries: readonly NativeApplicationMenuEntry[]
  itemIds: readonly ApplicationMenuItemId[]
}>

export type NativeApplicationMenuInstallRequest = Readonly<{
  windowLabel: string
  bridgeInstanceId: string
  descriptor: NativeApplicationMenuDescriptor
}>

export type NativeApplicationMenuProjectionItem = Readonly<{
  itemId: ApplicationMenuItemId
  enabled: boolean
  checked: boolean
  label?: string
}>

export type NativeApplicationMenuProjection = Readonly<{
  generation: number
  platform: ApplicationMenuPlatform
  windowLabel: string
  items: readonly NativeApplicationMenuProjectionItem[]
}>

export type NativeApplicationMenuProjectionRequest = Readonly<{
  bridgeInstanceId: string
  projection: NativeApplicationMenuProjection
}>

export type NativeApplicationMenuDisposeRequest = Readonly<{
  windowLabel: string
  bridgeInstanceId: string
}>

export type NativeApplicationMenuInstallResult = Readonly<{
  status: 'installed' | 'already-installed'
  platform: ApplicationMenuPlatform
  windowLabel: string
  bridgeInstanceId: string
  itemCount: number
}>

export type NativeApplicationMenuProjectionResult =
  | Readonly<{
      status: 'applied'
      windowLabel: string
      generation: number
    }>
  | Readonly<{
      status: 'ignored'
      windowLabel: string
      generation: number
      reason: 'duplicate-generation' | 'stale-generation'
    }>

export type NativeApplicationMenuDisposeResult =
  | Readonly<{
      status: 'disposed'
      windowLabel: string
    }>
  | Readonly<{
      status: 'ignored'
      windowLabel: string
      reason: 'not-installed' | 'stale-bridge'
    }>

function transportEntry(
  entry: ApplicationMenuPlatformEntry,
): NativeApplicationMenuEntry {
  return entry.kind === 'separator'
    ? Object.freeze({ kind: 'separator' })
    : Object.freeze({
        kind: 'item',
        itemId: entry.itemId,
        label: entry.label,
        accelerator: entry.accelerator,
      })
}

export function createNativeApplicationMenuDescriptor(
  descriptor: ApplicationMenuPlatformDescriptor,
): NativeApplicationMenuDescriptor {
  return Object.freeze({
    platform: descriptor.platform,
    productMenus: Object.freeze(descriptor.productMenus.map((submenu) =>
      Object.freeze({
        id: submenu.id,
        label: submenu.label,
        entries: Object.freeze(submenu.entries.map(transportEntry)),
      }))),
    applicationMenuEntries: Object.freeze(
      descriptor.applicationMenuEntries.map(transportEntry),
    ),
    itemIds: Object.freeze(descriptor.items.map((item) => item.itemId)),
  })
}

export function createNativeApplicationMenuProjection(
  projection: ApplicationMenuProjection,
): NativeApplicationMenuProjection {
  return Object.freeze({
    generation: projection.generation,
    platform: projection.platform,
    windowLabel: projection.windowLabel,
    items: Object.freeze(projection.items.map((item) => Object.freeze({
      itemId: item.itemId,
      enabled: item.enabled,
      checked: item.checked,
      ...(item.label === undefined ? {} : { label: item.label }),
    }))),
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).toSorted()
  const sortedExpected = [...expected].toSorted()
  return actual.length === sortedExpected.length &&
    actual.every((key, index) => key === sortedExpected[index])
}

function isApplicationMenuPlatform(
  value: unknown,
): value is ApplicationMenuPlatform {
  return value === 'windows' || value === 'linux' || value === 'macos'
}

function isApplicationMenuItemId(
  value: unknown,
): value is ApplicationMenuItemId {
  return typeof value === 'string' && APPLICATION_MENU_ITEM_IDS.includes(
    value as ApplicationMenuItemId,
  )
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function isGeneration(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

export function parseApplicationMenuPlatform(
  value: unknown,
): ApplicationMenuPlatform {
  if (!isApplicationMenuPlatform(value)) {
    throw new Error('Native application-menu platform response is invalid.')
  }
  return value
}

export function parseNativeApplicationMenuInstallResult(
  value: unknown,
  expected: Readonly<{
    platform: ApplicationMenuPlatform
    windowLabel: string
    bridgeInstanceId: string
    itemCount: number
  }>,
): NativeApplicationMenuInstallResult {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      'status',
      'platform',
      'windowLabel',
      'bridgeInstanceId',
      'itemCount',
    ]) ||
    (value.status !== 'installed' && value.status !== 'already-installed') ||
    value.platform !== expected.platform ||
    value.windowLabel !== expected.windowLabel ||
    value.bridgeInstanceId !== expected.bridgeInstanceId ||
    value.itemCount !== expected.itemCount
  ) {
    throw new Error('Native application-menu install response is invalid.')
  }
  return value as NativeApplicationMenuInstallResult
}

export function parseNativeApplicationMenuProjectionResult(
  value: unknown,
  expectedWindowLabel: string,
  expectedGeneration: number,
): NativeApplicationMenuProjectionResult {
  if (!isRecord(value) || value.windowLabel !== expectedWindowLabel ||
    value.generation !== expectedGeneration) {
    throw new Error('Native application-menu projection response is invalid.')
  }
  if (
    hasExactKeys(value, ['status', 'windowLabel', 'generation']) &&
    value.status === 'applied'
  ) {
    return value as NativeApplicationMenuProjectionResult
  }
  if (
    hasExactKeys(value, ['status', 'windowLabel', 'generation', 'reason']) &&
    value.status === 'ignored' &&
    (value.reason === 'duplicate-generation' ||
      value.reason === 'stale-generation')
  ) {
    return value as NativeApplicationMenuProjectionResult
  }
  throw new Error('Native application-menu projection response is invalid.')
}

export function parseNativeApplicationMenuDisposeResult(
  value: unknown,
  expectedWindowLabel: string,
): NativeApplicationMenuDisposeResult {
  if (!isRecord(value) || value.windowLabel !== expectedWindowLabel) {
    throw new Error('Native application-menu dispose response is invalid.')
  }
  if (
    hasExactKeys(value, ['status', 'windowLabel']) &&
    value.status === 'disposed'
  ) {
    return value as NativeApplicationMenuDisposeResult
  }
  if (
    hasExactKeys(value, ['status', 'windowLabel', 'reason']) &&
    value.status === 'ignored' &&
    (value.reason === 'not-installed' || value.reason === 'stale-bridge')
  ) {
    return value as NativeApplicationMenuDisposeResult
  }
  throw new Error('Native application-menu dispose response is invalid.')
}

export function parseApplicationMenuInvocation(
  value: unknown,
  expected: Readonly<{
    bridgeInstanceId: string
    windowLabel: string
  }>,
): ApplicationMenuInvocation {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      'invocationId',
      'bridgeInstanceId',
      'itemId',
      'windowLabel',
      'projectionGeneration',
    ]) ||
    !isNonEmptyString(value.invocationId) ||
    value.bridgeInstanceId !== expected.bridgeInstanceId ||
    !isApplicationMenuItemId(value.itemId) ||
    value.windowLabel !== expected.windowLabel ||
    !isGeneration(value.projectionGeneration)
  ) {
    throw new Error('Native application-menu invocation is invalid.')
  }
  return Object.freeze({
    invocationId: value.invocationId,
    bridgeInstanceId: value.bridgeInstanceId,
    itemId: value.itemId,
    windowLabel: value.windowLabel,
    projectionGeneration: value.projectionGeneration,
  })
}
