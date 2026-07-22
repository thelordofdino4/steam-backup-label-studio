import {
  isBuiltInDiscPresetId,
  isUserDiscPresetId,
  type DiscPresetDefinitionV1,
  type DiscPresetId,
} from './discPresetDefinition.ts'
import {
  CLASSIC_TOP_TITLE_DISC_PRESET,
  CLASSIC_TOP_TITLE_DISC_PRESET_ID,
} from './builtins/classicTopTitleDiscPreset.ts'

export const DISC_PRESET_COMPATIBILITY_ALIASES = Object.freeze({
  'classic-top-title': CLASSIC_TOP_TITLE_DISC_PRESET_ID,
  'disc:guided-layout:classic-top-title': CLASSIC_TOP_TITLE_DISC_PRESET_ID,
} as const)

export type DiscPresetCompatibilityAlias =
  keyof typeof DISC_PRESET_COMPATIBILITY_ALIASES

export type DiscPresetSummary = Readonly<{
  id: DiscPresetId
  revision: number
  name: string
  surface: 'disc'
  source: 'builtin' | 'user'
}>

export interface DiscPresetRegistry {
  get(id: string, revision?: number): DiscPresetDefinitionV1 | null
  list(): readonly DiscPresetSummary[]
}

export type DiscPresetRegistryCreateErrorCode =
  | 'invalid-builtin-id'
  | 'invalid-user-id'
  | 'duplicate-id-revision'
  | 'user-builtin-collision'

export type DiscPresetRegistryCreateResult =
  | Readonly<{ ok: true; registry: DiscPresetRegistry }>
  | Readonly<{
      ok: false
      error: Readonly<{
        code: DiscPresetRegistryCreateErrorCode
        id: string
        revision: number
      }>
    }>

type DiscPresetRegistryInput = Readonly<{
  builtins?: readonly DiscPresetDefinitionV1[]
  users?: readonly DiscPresetDefinitionV1[]
}>

type RegisteredDefinition = Readonly<{
  definition: DiscPresetDefinitionV1
  source: DiscPresetSummary['source']
  order: number
}>

function failure(
  code: DiscPresetRegistryCreateErrorCode,
  definition: DiscPresetDefinitionV1,
): DiscPresetRegistryCreateResult {
  return Object.freeze({
    ok: false,
    error: Object.freeze({
      code,
      id: definition.id,
      revision: definition.revision,
    }),
  })
}

export function resolveDiscPresetCompatibilityId(id: string): string {
  return DISC_PRESET_COMPATIBILITY_ALIASES[
    id as DiscPresetCompatibilityAlias
  ] ?? id
}

export function createDiscPresetRegistry(
  input: DiscPresetRegistryInput = {},
): DiscPresetRegistryCreateResult {
  const builtins = input.builtins ?? [CLASSIC_TOP_TITLE_DISC_PRESET]
  const users = input.users ?? []
  const registrations: RegisteredDefinition[] = []
  const keys = new Set<string>()

  for (const definition of builtins) {
    if (!isBuiltInDiscPresetId(definition.id)) {
      return failure('invalid-builtin-id', definition)
    }
    const key = `${definition.id}@${definition.revision}`
    if (keys.has(key)) return failure('duplicate-id-revision', definition)
    keys.add(key)
    registrations.push(Object.freeze({
      definition,
      source: 'builtin',
      order: registrations.length,
    }))
  }

  for (const definition of users) {
    if (isBuiltInDiscPresetId(definition.id)) {
      return failure('user-builtin-collision', definition)
    }
    if (!isUserDiscPresetId(definition.id)) {
      return failure('invalid-user-id', definition)
    }
    const key = `${definition.id}@${definition.revision}`
    if (keys.has(key)) return failure('duplicate-id-revision', definition)
    keys.add(key)
    registrations.push(Object.freeze({
      definition,
      source: 'user',
      order: registrations.length,
    }))
  }

  const frozenRegistrations = Object.freeze(registrations)
  const latestById = new Map<string, RegisteredDefinition>()

  for (const registration of frozenRegistrations) {
    const current = latestById.get(registration.definition.id)
    if (!current || registration.definition.revision > current.definition.revision) {
      latestById.set(registration.definition.id, registration)
    }
  }

  const latestRegistrations = [...latestById.values()].sort((first, second) => {
    if (first.source !== second.source) return first.source === 'builtin' ? -1 : 1
    if (first.source === 'builtin') return first.order - second.order
    return first.definition.name.localeCompare(second.definition.name) ||
      first.definition.id.localeCompare(second.definition.id)
  })
  const summaries = Object.freeze(latestRegistrations.map((registration) =>
    Object.freeze({
      id: registration.definition.id,
      revision: registration.definition.revision,
      name: registration.definition.name,
      surface: registration.definition.surface,
      source: registration.source,
    })))

  const registry: DiscPresetRegistry = Object.freeze({
    get(id: string, revision?: number) {
      const canonicalId = resolveDiscPresetCompatibilityId(id)
      if (revision === undefined) {
        return latestById.get(canonicalId)?.definition ?? null
      }
      return frozenRegistrations.find((registration) =>
        registration.definition.id === canonicalId &&
        registration.definition.revision === revision)?.definition ?? null
    },
    list() {
      return summaries
    },
  })

  return Object.freeze({ ok: true, registry })
}

const defaultRegistryResult = createDiscPresetRegistry()

if (!defaultRegistryResult.ok) {
  throw new Error('The built-in Disc preset registry is invalid.')
}

export const DISC_PRESET_REGISTRY = defaultRegistryResult.registry
