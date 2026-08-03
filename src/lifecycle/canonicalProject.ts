import type { EditorProjectType } from '../editor/editorTypes.ts'
import { validateSavedProjectSchema } from '../project/projectSchema.ts'
import { resolveSavedProjectType } from '../project/projectRouting.ts'
import type { SavedProject } from '../project/projectTypes.ts'

type JsonPrimitive = boolean | number | string | null
type JsonValue = JsonPrimitive | readonly JsonValue[] | JsonObject
interface JsonObject {
  readonly [key: string]: JsonValue
}

export type DeepReadonly<T> =
  T extends JsonPrimitive ? T
    : T extends readonly (infer Item)[] ? readonly DeepReadonly<Item>[]
      : T extends object ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
        : T

export type NormalizedPersistableProject = DeepReadonly<SavedProject>

declare const canonicalProjectComparisonBrand: unique symbol

export type CanonicalProjectComparisonValue = string & {
  readonly [canonicalProjectComparisonBrand]: true
}

const OMIT_VALUE = Symbol('omit-json-value')
const PROJECT_JSON_MAX_DEPTH = 256
const capturedProjectSnapshots = new WeakSet<object>()
const canonicalComparisonValues = new WeakMap<
  object,
  CanonicalProjectComparisonValue
>()

const FORBIDDEN_ROOT_PROJECT_KEYS = new Set([
  'caseInsertPresetApplication',
  'applicationRevision',
  'applicationStateIdentity',
  'snapshotIdentity',
  'attachmentIdentity',
  'applicationAdoptionReceipt',
  'applicationAdoptionStatus',
  'adoptionIdentity',
])

function toJsonValue(
  value: unknown,
  path: string,
  arrayItem = false,
  ancestors = new WeakSet<object>(),
  depth = 0,
): JsonValue | typeof OMIT_VALUE {
  if (depth > PROJECT_JSON_MAX_DEPTH) {
    throw new TypeError(`${path} exceeds the maximum project nesting depth.`)
  }
  if (value === undefined) {
    return arrayItem ? null : OMIT_VALUE
  }

  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return value
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError(`${path} must be a finite JSON number.`)
    }
    return value
  }

  if (typeof value !== 'object') {
    throw new TypeError(`${path} must contain only JSON-compatible values.`)
  }
  if (ancestors.has(value)) {
    throw new TypeError(`${path} must not contain cycles.`)
  }
  ancestors.add(value)

  let prototype: object | null
  let descriptors: PropertyDescriptorMap
  let keys: (string | symbol)[]
  let isArray: boolean
  try {
    prototype = Object.getPrototypeOf(value) as object | null
    descriptors = Object.getOwnPropertyDescriptors(value)
    keys = Reflect.ownKeys(descriptors)
    isArray = Array.isArray(value)
  } catch {
    throw new TypeError(`${path} could not be safely inspected.`)
  }

  if (isArray) {
    if (prototype !== Array.prototype ||
        keys.some((key) => typeof key !== 'string' ||
          (key !== 'length' && !/^(0|[1-9][0-9]*)$/.test(key)))) {
      throw new TypeError(`${path} must be a plain dense JSON array.`)
    }
    const lengthDescriptor = descriptors.length
    if (!lengthDescriptor || !('value' in lengthDescriptor) ||
        !Number.isSafeInteger(lengthDescriptor.value) ||
        lengthDescriptor.value < 0 || keys.length !== lengthDescriptor.value + 1) {
      throw new TypeError(`${path} must be a plain dense JSON array.`)
    }
    const normalizedArray: JsonValue[] = []
    for (let index = 0; index < lengthDescriptor.value; index += 1) {
      const descriptor = descriptors[String(index)]
      if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) {
        throw new TypeError(`${path} must not contain sparse or accessor items.`)
      }
      const normalized = toJsonValue(
        descriptor.value,
        `${path}[${index}]`,
        true,
        ancestors,
        depth + 1,
      )
      normalizedArray.push(normalized === OMIT_VALUE ? null : normalized)
    }
    ancestors.delete(value)
    return normalizedArray
  }

  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${path} must contain only plain JSON records.`)
  }
  if (keys.some((key) => typeof key !== 'string')) {
    throw new TypeError(`${path} must not contain symbol keys.`)
  }

  const normalizedRecord: Record<string, JsonValue> = {}
  for (const key of (keys as string[]).sort()) {
    if (path === 'project' && FORBIDDEN_ROOT_PROJECT_KEYS.has(key)) {
      throw new TypeError(`${path}.${key} is not persisted project content.`)
    }
    const descriptor = descriptors[key]
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) {
      throw new TypeError(`${path}.${key} must be an enumerable data property.`)
    }
    const normalized = toJsonValue(
      descriptor.value,
      `${path}.${key}`,
      false,
      ancestors,
      depth + 1,
    )
    if (normalized !== OMIT_VALUE) {
      Object.defineProperty(normalizedRecord, key, {
        value: normalized,
        enumerable: true,
        configurable: true,
        writable: true,
      })
    }
  }

  ancestors.delete(value)
  return normalizedRecord
}

function deepFreezeJson(value: JsonValue): JsonValue {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) {
    return value
  }

  if (Array.isArray(value)) {
    for (const item of value) deepFreezeJson(item)
  } else {
    for (const item of Object.values(value)) deepFreezeJson(item)
  }

  return Object.freeze(value)
}

function cloneProjectJson(project: SavedProject): JsonObject {
  const value = toJsonValue(project, 'project')

  if (value === OMIT_VALUE || Array.isArray(value) || value === null) {
    throw new TypeError('project must be a JSON object.')
  }

  return value as JsonObject
}

function cloneRecord(record: JsonObject): Record<string, JsonValue> {
  return Object.fromEntries(Object.entries(record))
}

function isJsonObject(value: JsonValue): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function sameJsonValue(first: JsonValue, second: JsonValue): boolean {
  if (first === second) return true
  if (Array.isArray(first) || Array.isArray(second)) {
    return Array.isArray(first) && Array.isArray(second) &&
      first.length === second.length &&
      first.every((value, index) => sameJsonValue(value, second[index]!))
  }
  if (!isJsonObject(first) || !isJsonObject(second)) return false
  const firstKeys = Object.keys(first).sort()
  const secondKeys = Object.keys(second).sort()
  return firstKeys.length === secondKeys.length &&
    firstKeys.every((key, index) => key === secondKeys[index] &&
      sameJsonValue(first[key]!, second[key]!))
}

function createComparisonProjection(
  project: NormalizedPersistableProject,
  kind: EditorProjectType,
): JsonObject {
  const projection = cloneRecord(project as unknown as JsonObject)

  delete projection.savedAt

  if (kind === 'caseInsert') {
    const editor = projection.editor

    if (editor && isJsonObject(editor)) {
      const projectedEditor = cloneRecord(editor)
      delete projectedEditor.activeCaseInsertTemplatePane
      projection.editor = projectedEditor
    }
  }

  return projection
}

/**
 * Captures an immutable, validated project snapshot. Callers remain responsible
 * for producing the complete snapshot through the existing Disc or Case owner.
 */
export function captureNormalizedProjectSnapshot(
  project: SavedProject,
): NormalizedPersistableProject {
  if (typeof project === 'object' && project !== null &&
      capturedProjectSnapshots.has(project)) {
    return project as unknown as NormalizedPersistableProject
  }
  const clone = cloneProjectJson(project)
  validateSavedProjectSchema(clone)
  const captured = deepFreezeJson(
    clone,
  ) as unknown as NormalizedPersistableProject
  capturedProjectSnapshots.add(captured as object)
  return captured
}

export function getNormalizedProjectKind(
  project: NormalizedPersistableProject,
): EditorProjectType {
  return resolveSavedProjectType(project)
}

export function createCanonicalProjectComparisonValue(
  project: NormalizedPersistableProject,
): CanonicalProjectComparisonValue {
  const cached = canonicalComparisonValues.get(project as object)
  if (cached !== undefined) return cached
  const projection = createComparisonProjection(
    project,
    getNormalizedProjectKind(project),
  )
  const comparison = JSON.stringify(projection) as CanonicalProjectComparisonValue
  if (capturedProjectSnapshots.has(project as object)) {
    canonicalComparisonValues.set(project as object, comparison)
  }
  return comparison
}

/** Exact structural equality for already normalized immutable project data. */
export function normalizedProjectSnapshotsAreExactlyEqual(
  first: NormalizedPersistableProject,
  second: NormalizedPersistableProject,
): boolean {
  return first === second || sameJsonValue(
    first as unknown as JsonValue,
    second as unknown as JsonValue,
  )
}
