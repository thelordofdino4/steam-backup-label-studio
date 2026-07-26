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

function toJsonValue(
  value: unknown,
  path: string,
  arrayItem = false,
): JsonValue | typeof OMIT_VALUE {
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

  if (Array.isArray(value)) {
    return value.map((item, index) => {
      const normalized = toJsonValue(item, `${path}[${index}]`, true)
      return normalized === OMIT_VALUE ? null : normalized
    })
  }

  if (typeof value !== 'object') {
    throw new TypeError(`${path} must contain only JSON-compatible values.`)
  }

  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${path} must contain only plain JSON records.`)
  }

  const record = value as Record<string, unknown>
  const normalizedRecord: Record<string, JsonValue> = {}

  for (const key of Object.keys(record).sort()) {
    const normalized = toJsonValue(record[key], `${path}.${key}`)
    if (normalized !== OMIT_VALUE) normalizedRecord[key] = normalized
  }

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
  validateSavedProjectSchema(project)
  const clone = cloneProjectJson(project)
  validateSavedProjectSchema(clone)
  return deepFreezeJson(clone) as unknown as NormalizedPersistableProject
}

export function getNormalizedProjectKind(
  project: NormalizedPersistableProject,
): EditorProjectType {
  return resolveSavedProjectType(project)
}

export function createCanonicalProjectComparisonValue(
  project: NormalizedPersistableProject,
): CanonicalProjectComparisonValue {
  const projection = createComparisonProjection(
    project,
    getNormalizedProjectKind(project),
  )

  return JSON.stringify(projection) as CanonicalProjectComparisonValue
}
