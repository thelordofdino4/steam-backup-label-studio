import type { DeepReadonly } from '../lifecycle/canonicalProject.ts'
import {
  encodeCaseInsertPresetDeterministicIdentity,
} from '../presets/caseInsertPresetReapplyIdentity.ts'
import {
  createCaseInsertPresetIdentityDigest,
} from '../presets/caseInsertPresetIdentityDigest.ts'
import type { ProjectJewelCaseState } from '../project/projectTypes.ts'
import { normalizeProjectJewelCaseState } from './normalization.ts'

export const CASE_INSERT_PRESET_AGGREGATE_CONTENT_IDENTITY_PREFIX =
  'case:preset-aggregate-content:v1:' as const

export type CaseInsertPresetAggregateContentIdentity =
  `${typeof CASE_INSERT_PRESET_AGGREGATE_CONTENT_IDENTITY_PREFIX}${string}`

export type CaseInsertPresetAggregateContentValidationFailure = Readonly<{
  ok: false
  status:
    | 'invalid-aggregate-snapshot'
    | 'unsupported-aggregate-snapshot-version'
  code: string
}>

export type CaseInsertPresetAggregateContentValidationResult =
  | Readonly<{
      ok: true
      status: 'validated'
      aggregate: DeepReadonly<ProjectJewelCaseState>
      aggregateContentIdentity: CaseInsertPresetAggregateContentIdentity
    }>
  | CaseInsertPresetAggregateContentValidationFailure

type PlainValue = null | boolean | number | string | PlainValue[] | PlainRecord
type PlainRecord = { [key: string]: PlainValue }

type PlainCloneResult =
  | Readonly<{ ok: true; value: PlainValue }>
  | Readonly<{ ok: false; code: string }>

function clonePlainInput(value: unknown): PlainCloneResult {
  const ancestors = new WeakSet<object>()

  function clone(current: unknown): PlainCloneResult {
    if (current === null || typeof current === 'string' ||
        typeof current === 'boolean') {
      return { ok: true, value: current }
    }
    if (typeof current === 'number') {
      return Number.isFinite(current)
        ? { ok: true, value: current }
        : { ok: false, code: 'non-finite-number' }
    }
    if (typeof current !== 'object') {
      return { ok: false, code: 'non-plain-value' }
    }
    if (ancestors.has(current)) {
      return { ok: false, code: 'cyclic-input' }
    }
    ancestors.add(current)

    let prototype: object | null
    let descriptors: PropertyDescriptorMap
    let keys: (string | symbol)[]
    try {
      prototype = Object.getPrototypeOf(current) as object | null
      descriptors = Object.getOwnPropertyDescriptors(current)
      keys = Reflect.ownKeys(current)
    } catch {
      return { ok: false, code: 'input-introspection-failed' }
    }

    if (Array.isArray(current)) {
      if (prototype !== Array.prototype ||
          keys.some((key) => typeof key !== 'string' ||
            (key !== 'length' && !/^(0|[1-9][0-9]*)$/.test(key)))) {
        return { ok: false, code: 'array-shape-invalid' }
      }
      const lengthDescriptor = descriptors.length
      if (!lengthDescriptor || !('value' in lengthDescriptor) ||
          !Number.isSafeInteger(lengthDescriptor.value) ||
          lengthDescriptor.value < 0) {
        return { ok: false, code: 'array-length-invalid' }
      }
      const result: PlainValue[] = []
      for (let index = 0; index < lengthDescriptor.value; index += 1) {
        const descriptor = descriptors[String(index)]
        if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) {
          return { ok: false, code: 'sparse-or-accessor-array' }
        }
        const child = clone(descriptor.value)
        if (!child.ok) return child
        result.push(child.value)
      }
      ancestors.delete(current)
      return { ok: true, value: result }
    }

    if (prototype !== Object.prototype && prototype !== null) {
      return { ok: false, code: 'record-prototype-unsupported' }
    }
    if (keys.some((key) => typeof key !== 'string')) {
      return { ok: false, code: 'symbol-key-unsupported' }
    }
    const result: PlainRecord = {}
    for (const key of keys as string[]) {
      const descriptor = descriptors[key]
      if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) {
        return { ok: false, code: 'record-accessor-unsupported' }
      }
      const child = clone(descriptor.value)
      if (!child.ok) return child
      result[key] = child.value
    }
    ancestors.delete(current)
    return { ok: true, value: result }
  }

  return clone(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function sameValue(left: unknown, right: unknown): boolean {
  if (left === right) return true
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => sameValue(value, right[index]))
  }
  if (!isRecord(left) || !isRecord(right)) return false
  const leftKeys = Object.keys(left).sort()
  const rightKeys = Object.keys(right).sort()
  return leftKeys.length === rightKeys.length && leftKeys.every((key, index) =>
    key === rightKeys[index] && sameValue(left[key], right[key]))
}

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== 'object') return value
  if (seen.has(value)) return value
  seen.add(value)
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child, seen)
  }
  return Object.freeze(value)
}

function failure(code: string): CaseInsertPresetAggregateContentValidationFailure {
  return Object.freeze({
    ok: false,
    status: 'invalid-aggregate-snapshot',
    code,
  })
}

export function validateCaseInsertPresetAggregateContent(
  value: unknown,
): CaseInsertPresetAggregateContentValidationResult {
  const cloned = clonePlainInput(value)
  if (!cloned.ok || !isRecord(cloned.value)) {
    return failure(cloned.ok ? 'aggregate-root-invalid' : cloned.code)
  }

  let normalized: ProjectJewelCaseState
  try {
    normalized = normalizeProjectJewelCaseState(cloned.value)
  } catch {
    return failure('aggregate-normalization-failed')
  }
  if (!sameValue(cloned.value, normalized)) {
    return failure('aggregate-not-complete-normalized-case-state')
  }

  let aggregateContentIdentity: CaseInsertPresetAggregateContentIdentity
  try {
    aggregateContentIdentity =
      `${CASE_INSERT_PRESET_AGGREGATE_CONTENT_IDENTITY_PREFIX}${
        createCaseInsertPresetIdentityDigest(
          encodeCaseInsertPresetDeterministicIdentity(normalized),
        )
      }`
  } catch {
    return failure('aggregate-identity-unavailable')
  }

  return deepFreeze({
    ok: true,
    status: 'validated' as const,
    aggregate: normalized,
    aggregateContentIdentity,
  })
}

export function isCaseInsertPresetAggregateContentIdentity(
  value: unknown,
): value is CaseInsertPresetAggregateContentIdentity {
  return typeof value === 'string' && value.startsWith(
    CASE_INSERT_PRESET_AGGREGATE_CONTENT_IDENTITY_PREFIX,
  ) && value.length > CASE_INSERT_PRESET_AGGREGATE_CONTENT_IDENTITY_PREFIX.length
}
