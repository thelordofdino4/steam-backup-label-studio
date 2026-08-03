export type CaseInsertPresetPlainValue =
  | null
  | boolean
  | number
  | string
  | CaseInsertPresetPlainValue[]
  | CaseInsertPresetPlainRecord

export type CaseInsertPresetPlainRecord = {
  [key: string]: CaseInsertPresetPlainValue
}

export type CaseInsertPresetPlainCloneResult =
  | Readonly<{
      ok: true
      value: CaseInsertPresetPlainValue
      deeplyFrozen: boolean
    }>
  | Readonly<{ ok: false; code: string }>

const CASE_INSERT_PRESET_PLAIN_INPUT_MAX_DEPTH = 256

export function cloneCaseInsertPresetPlainInput(
  value: unknown,
): CaseInsertPresetPlainCloneResult {
  const visited = new WeakSet<object>()

  function clone(
    current: unknown,
    depth = 0,
  ): CaseInsertPresetPlainCloneResult {
    if (depth > CASE_INSERT_PRESET_PLAIN_INPUT_MAX_DEPTH) {
      return { ok: false, code: 'maximum-depth-exceeded' }
    }
    if (current === null || typeof current === 'string' ||
        typeof current === 'boolean') {
      return { ok: true, value: current, deeplyFrozen: true }
    }
    if (typeof current === 'number') {
      return Number.isFinite(current)
        ? { ok: true, value: current, deeplyFrozen: true }
        : { ok: false, code: 'non-finite-number' }
    }
    if (typeof current !== 'object') {
      return { ok: false, code: 'non-plain-value' }
    }
    if (visited.has(current)) {
      return { ok: false, code: 'cyclic-or-aliased-input' }
    }
    visited.add(current)

    let prototype: object | null
    let descriptors: PropertyDescriptorMap
    let keys: (string | symbol)[]
    let isArray: boolean
    let deeplyFrozen: boolean
    try {
      prototype = Object.getPrototypeOf(current) as object | null
      descriptors = Object.getOwnPropertyDescriptors(current)
      keys = Reflect.ownKeys(descriptors)
      isArray = Array.isArray(current)
      deeplyFrozen = Object.isFrozen(current)
    } catch {
      return { ok: false, code: 'input-introspection-failed' }
    }

    if (isArray) {
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
      const arrayLength = lengthDescriptor.value as number
      if (keys.length !== arrayLength + 1) {
        return { ok: false, code: 'array-shape-invalid' }
      }
      const result: CaseInsertPresetPlainValue[] = []
      let childrenFrozen = true
      for (let index = 0; index < arrayLength; index += 1) {
        const descriptor = descriptors[String(index)]
        if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) {
          return { ok: false, code: 'sparse-or-accessor-array' }
        }
        const child = clone(descriptor.value, depth + 1)
        if (!child.ok) return child
        result.push(child.value)
        childrenFrozen = childrenFrozen && child.deeplyFrozen
      }
      return {
        ok: true,
        value: result,
        deeplyFrozen: deeplyFrozen && childrenFrozen,
      }
    }

    if (prototype !== Object.prototype && prototype !== null) {
      return { ok: false, code: 'record-prototype-unsupported' }
    }
    if (keys.some((key) => typeof key !== 'string')) {
      return { ok: false, code: 'symbol-key-unsupported' }
    }
    const result: CaseInsertPresetPlainRecord = {}
    let childrenFrozen = true
    for (const key of keys as string[]) {
      const descriptor = descriptors[key]
      if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) {
        return { ok: false, code: 'record-accessor-unsupported' }
      }
      const child = clone(descriptor.value, depth + 1)
      if (!child.ok) return child
      Object.defineProperty(result, key, {
        value: child.value,
        enumerable: true,
        configurable: true,
        writable: true,
      })
      childrenFrozen = childrenFrozen && child.deeplyFrozen
    }
    return {
      ok: true,
      value: result,
      deeplyFrozen: deeplyFrozen && childrenFrozen,
    }
  }

  return clone(value)
}

export function deepFreezeCaseInsertPresetValue<T>(
  value: T,
  seen = new WeakSet<object>(),
): T {
  if (value === null || typeof value !== 'object') return value
  if (seen.has(value)) return value
  seen.add(value)
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreezeCaseInsertPresetValue(child, seen)
  }
  return Object.freeze(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function sameCaseInsertPresetValue(
  left: unknown,
  right: unknown,
): boolean {
  if (left === right) return true
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => sameCaseInsertPresetValue(value, right[index]))
  }
  if (!isRecord(left) || !isRecord(right)) return false
  const leftKeys = Object.keys(left).sort()
  const rightKeys = Object.keys(right).sort()
  return leftKeys.length === rightKeys.length && leftKeys.every((key, index) =>
    key === rightKeys[index] &&
    sameCaseInsertPresetValue(left[key], right[key]))
}

export function hasExactCaseInsertPresetKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
) {
  const actual = Object.keys(value).sort()
  const canonicalExpected = [...expected].sort()
  return actual.length === canonicalExpected.length &&
    actual.every((key, index) => key === canonicalExpected[index])
}
