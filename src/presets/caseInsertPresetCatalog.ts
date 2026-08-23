import {
  isBuiltInCaseInsertPresetId,
  isCaseInsertPresetId,
  isUserCaseInsertPresetId,
  parseCaseInsertPresetDefinition,
  type CaseInsertPresetDefinition,
  type CaseInsertPresetDefinitionParseErrorCode,
  type CaseInsertPresetId,
} from './caseInsertPresetDefinition.ts'
import {
  JEWEL_CASE_ESSENTIALS_CASE_PRESET,
} from './builtins/jewelCaseEssentialsCasePreset.ts'
import {
  JEWEL_CASE_ESSENTIALS_CASE_PRESET_V2,
} from './builtins/jewelCaseEssentialsCasePresetV2.ts'

export type CaseInsertPresetCatalogSource = 'builtin' | 'user'

export type CaseInsertPresetCatalogAlias = Readonly<{
  alias: string
  canonicalId: CaseInsertPresetId
}>

export type CaseInsertPresetSummary = Readonly<{
  id: CaseInsertPresetId
  revision: number
  name: string
  surface: 'case-insert'
  source: CaseInsertPresetCatalogSource
}>

export type CaseInsertPresetReference = Readonly<{
  id: string
  revision?: number
}>

export type ResolvedCaseInsertPresetReference = Readonly<{
  canonicalReference: Readonly<{
    id: CaseInsertPresetId
    revision: number
  }>
  definition: CaseInsertPresetDefinition
  source: CaseInsertPresetCatalogSource
  matchedAlias: string | null
}>

export type CaseInsertPresetReferenceResolution =
  | Readonly<{
      ok: true
      value: ResolvedCaseInsertPresetReference
    }>
  | Readonly<{
      ok: false
      error: Readonly<{
        code: 'invalid-reference' | 'unknown-id' | 'unknown-revision'
        id: string
        revision: number | null
      }>
    }>

export interface CaseInsertPresetCatalog {
  getExact(
    id: CaseInsertPresetId,
    revision: number,
  ): CaseInsertPresetDefinition | null
  getLatest(id: CaseInsertPresetId): CaseInsertPresetDefinition | null
  resolve(
    reference: CaseInsertPresetReference,
  ): CaseInsertPresetReferenceResolution
  list(): readonly CaseInsertPresetSummary[]
}

export type CaseInsertPresetCatalogCreateErrorCode =
  | 'invalid-definition'
  | 'invalid-builtin-id'
  | 'invalid-user-id'
  | 'duplicate-id-revision'
  | 'user-builtin-collision'
  | 'invalid-alias'
  | 'duplicate-alias'
  | 'alias-canonical-collision'
  | 'unknown-alias-target'

export type CaseInsertPresetCatalogCreateResult =
  | Readonly<{ ok: true; catalog: CaseInsertPresetCatalog }>
  | Readonly<{
      ok: false
      error: Readonly<{
        code: CaseInsertPresetCatalogCreateErrorCode
        id: string
        revision: number | null
        definitionError?: Readonly<{
          code: CaseInsertPresetDefinitionParseErrorCode
          path: string
        }>
      }>
    }>

export type CaseInsertPresetCatalogInput = Readonly<{
  builtins?: readonly unknown[]
  users?: readonly unknown[]
  aliases?: readonly Readonly<{
    alias: string
    canonicalId: string
  }>[]
}>

type RegisteredCaseInsertPreset = Readonly<{
  definition: CaseInsertPresetDefinition
  source: CaseInsertPresetCatalogSource
  order: number
}>

const ALIAS_PATTERN = /^[a-z][a-z0-9]*(?:(?:-|:|\.)[a-z0-9]+)*$/
const MAX_ALIAS_LENGTH = 160

function createFailure(
  code: CaseInsertPresetCatalogCreateErrorCode,
  id: string,
  revision: number | null,
  definitionError?: Readonly<{
    code: CaseInsertPresetDefinitionParseErrorCode
    path: string
  }>,
): CaseInsertPresetCatalogCreateResult {
  return Object.freeze({
    ok: false,
    error: Object.freeze({
      code,
      id,
      revision,
      ...(definitionError ? { definitionError } : {}),
    }),
  })
}

function createResolutionFailure(
  code: 'invalid-reference' | 'unknown-id' | 'unknown-revision',
  id: string,
  revision: number | null,
): CaseInsertPresetReferenceResolution {
  return Object.freeze({
    ok: false,
    error: Object.freeze({ code, id, revision }),
  })
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value > 0
}

function isValidAlias(value: unknown): value is string {
  return typeof value === 'string' &&
    value.length <= MAX_ALIAS_LENGTH &&
    ALIAS_PATTERN.test(value)
}

export function createCaseInsertPresetCatalog(
  input: CaseInsertPresetCatalogInput = {},
): CaseInsertPresetCatalogCreateResult {
  const registrations: RegisteredCaseInsertPreset[] = []
  const registrationKeys = new Set<string>()
  const canonicalIds = new Set<CaseInsertPresetId>()

  const register = (
    rawDefinition: unknown,
    source: CaseInsertPresetCatalogSource,
  ): CaseInsertPresetCatalogCreateResult | null => {
    const parsed = parseCaseInsertPresetDefinition(rawDefinition)
    if (!parsed.ok) {
      return createFailure(
        'invalid-definition',
        '',
        null,
        parsed.error,
      )
    }

    const definition = parsed.value
    if (source === 'builtin' && !isBuiltInCaseInsertPresetId(definition.id)) {
      return createFailure(
        'invalid-builtin-id',
        definition.id,
        definition.revision,
      )
    }
    if (source === 'user' && isBuiltInCaseInsertPresetId(definition.id)) {
      return createFailure(
        'user-builtin-collision',
        definition.id,
        definition.revision,
      )
    }
    if (source === 'user' && !isUserCaseInsertPresetId(definition.id)) {
      return createFailure(
        'invalid-user-id',
        definition.id,
        definition.revision,
      )
    }

    const key = `${definition.id}\u0000${definition.revision}`
    if (registrationKeys.has(key)) {
      return createFailure(
        'duplicate-id-revision',
        definition.id,
        definition.revision,
      )
    }

    registrationKeys.add(key)
    canonicalIds.add(definition.id)
    registrations.push(Object.freeze({
      definition,
      source,
      order: registrations.length,
    }))
    return null
  }

  for (const rawDefinition of input.builtins ?? []) {
    const error = register(rawDefinition, 'builtin')
    if (error) return error
  }
  for (const rawDefinition of input.users ?? []) {
    const error = register(rawDefinition, 'user')
    if (error) return error
  }

  const aliases = new Map<string, CaseInsertPresetId>()
  for (const aliasInput of input.aliases ?? []) {
    const alias = aliasInput.alias
    const canonicalId = aliasInput.canonicalId
    if (!isValidAlias(alias) || !isCaseInsertPresetId(canonicalId)) {
      return createFailure('invalid-alias', String(alias), null)
    }
    if (canonicalIds.has(alias as CaseInsertPresetId)) {
      return createFailure('alias-canonical-collision', alias, null)
    }
    if (aliases.has(alias)) {
      return createFailure('duplicate-alias', alias, null)
    }
    if (!canonicalIds.has(canonicalId)) {
      return createFailure('unknown-alias-target', alias, null)
    }
    aliases.set(alias, canonicalId)
  }

  const frozenRegistrations = Object.freeze(registrations)
  const byKey = new Map<string, RegisteredCaseInsertPreset>()
  const latestById = new Map<CaseInsertPresetId, RegisteredCaseInsertPreset>()

  for (const registration of frozenRegistrations) {
    const { definition } = registration
    byKey.set(`${definition.id}\u0000${definition.revision}`, registration)
    const current = latestById.get(definition.id)
    if (!current || definition.revision > current.definition.revision) {
      latestById.set(definition.id, registration)
    }
  }

  const summaries = Object.freeze([...latestById.values()]
    .sort((left, right) => {
      if (left.source !== right.source) return left.source === 'builtin' ? -1 : 1
      if (left.source === 'builtin') return left.order - right.order
      return left.definition.name.localeCompare(right.definition.name) ||
        left.definition.id.localeCompare(right.definition.id)
    })
    .map(({ definition, source }) => Object.freeze({
      id: definition.id,
      revision: definition.revision,
      name: definition.name,
      surface: definition.surface,
      source,
    })))

  const catalog: CaseInsertPresetCatalog = Object.freeze({
    getExact(id: CaseInsertPresetId, revision: number) {
      if (!isCaseInsertPresetId(id) || !isPositiveSafeInteger(revision)) {
        return null
      }
      return byKey.get(`${id}\u0000${revision}`)?.definition ?? null
    },
    getLatest(id: CaseInsertPresetId) {
      if (!isCaseInsertPresetId(id)) return null
      return latestById.get(id)?.definition ?? null
    },
    resolve(reference: CaseInsertPresetReference) {
      if (typeof reference !== 'object' || reference === null ||
          typeof reference.id !== 'string' ||
          (reference.revision !== undefined &&
            !isPositiveSafeInteger(reference.revision))) {
        return createResolutionFailure(
          'invalid-reference',
          typeof reference?.id === 'string' ? reference.id : '',
          typeof reference?.revision === 'number' ? reference.revision : null,
        )
      }

      const matchedAlias = aliases.has(reference.id) ? reference.id : null
      const canonicalId = aliases.get(reference.id) ??
        (isCaseInsertPresetId(reference.id) ? reference.id : null)
      if (!canonicalId) {
        return createResolutionFailure(
          'unknown-id',
          reference.id,
          reference.revision ?? null,
        )
      }

      const registration = reference.revision === undefined
        ? latestById.get(canonicalId)
        : byKey.get(`${canonicalId}\u0000${reference.revision}`)
      if (!registration) {
        return createResolutionFailure(
          reference.revision === undefined ? 'unknown-id' : 'unknown-revision',
          canonicalId,
          reference.revision ?? null,
        )
      }

      return Object.freeze({
        ok: true,
        value: Object.freeze({
          canonicalReference: Object.freeze({
            id: registration.definition.id,
            revision: registration.definition.revision,
          }),
          definition: registration.definition,
          source: registration.source,
          matchedAlias,
        }),
      })
    },
    list() {
      return summaries
    },
  })

  return Object.freeze({ ok: true, catalog })
}

const defaultCatalogResult = createCaseInsertPresetCatalog({
  builtins: [
    JEWEL_CASE_ESSENTIALS_CASE_PRESET,
    JEWEL_CASE_ESSENTIALS_CASE_PRESET_V2,
  ],
})

if (!defaultCatalogResult.ok) {
  throw new Error('The production Case Insert preset catalog is invalid.')
}

export const CASE_INSERT_PRESET_CATALOG = defaultCatalogResult.catalog
