import {
  discBackgroundAssetsExactlyEqual, isDiscBackgroundAsset, legacyDiscBackgroundAsset,
  readDiscBackgroundAsset, reuseDiscBackgroundAsset, type DiscBackgroundAsset,
} from '../image/discBackgroundAsset.ts'
import type { EditorProjectType } from '../editor/editorTypes.ts'
import { validateNormalizedDiscProjectRemainder, validateNormalizedProjectSchema } from '../project/projectSchema.ts'
import { resolveSavedProjectType } from '../project/projectRouting.ts'
import type {
  SavedCaseInsertProject,
  SavedDiscProject,
  SavedProject,
} from '../project/projectTypes.ts'

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

export type NormalizedCaseInsertProject = DeepReadonly<
  Omit<SavedCaseInsertProject, 'caseInsertLayoutPreset'>
>

export type NormalizedPersistableProject =
  | DeepReadonly<SavedDiscProject>
  | NormalizedCaseInsertProject

declare const canonicalProjectComparisonBrand: unique symbol

/** For committed Disc state, matching projections require exact snapshot equality. */
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

export type CapturedSavedDiscProject = DeepReadonly<SavedDiscProject>
export type CapturedSavedDiscBackground = CapturedSavedDiscProject['background']
export type CommittedDiscBackground =
  Omit<CapturedSavedDiscBackground, 'imageDataUrl'> & Readonly<{ asset: DiscBackgroundAsset }>
export type CommittedDiscProject =
  Omit<CapturedSavedDiscProject, 'background'> & Readonly<{ background: CommittedDiscBackground }>
export type CapturedLifecycleProject = CommittedDiscProject | NormalizedCaseInsertProject

// An identity for the already validated unmigrated fields, shared by successive
// background-only revisions. Weak keys give it the lifetime of pinned snapshots.
type DiscRemainderIdentity = { comparison?: string }
const discRemainders = new WeakMap<object, DiscRemainderIdentity>()

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

function removeCaseInsertPresetPersistence(project: JsonObject): JsonObject {
  if (project.projectType !== 'caseInsert') return project
  const content = cloneRecord(project)
  delete content.caseInsertLayoutPreset
  return content
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

/** Cold, scoped comparison for accepted compound mirror values. The candidate
 * may still contain omitted optional properties in its presentation shape. */
export function normalizedProjectValueMatches(candidate: unknown, captured: unknown): boolean {
  const a = toJsonValue(candidate, 'candidate')
  const b = toJsonValue(captured, 'captured')
  if (a === OMIT_VALUE || b === OMIT_VALUE) return a === b
  return sameJsonValue(a, b)
}

function createComparisonProjection(
  project: NormalizedPersistableProject | CapturedLifecycleProject,
  kind: EditorProjectType,
): JsonObject {
  const projection = cloneRecord(project as unknown as JsonObject)

  delete projection.savedAt

  if (isCommittedDiscProject(project)) {
    const { asset, ...background } = project.background
    // This internal comparison hint only rejects unequal lengths. It is
    // representation-neutral so equivalent reference and compatibility
    // sources match, and exact snapshot equality always checks the source.
    const assetEncodedLength = readDiscBackgroundAsset(asset)?.length ?? null
    projection.background = sortedFrozen({ ...background, assetEncodedLength }) as unknown as JsonValue
  }

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
  const clone = removeCaseInsertPresetPersistence(cloneProjectJson(project))
  validateNormalizedProjectSchema(clone)
  const captured = deepFreezeJson(
    clone,
  ) as unknown as NormalizedPersistableProject
  capturedProjectSnapshots.add(captured as object)
  return captured
}

export function isCommittedDiscProject(value: unknown): value is CommittedDiscProject {
  return typeof value === 'object' && value !== null && discRemainders.has(value)
}

function sortedFrozen<T extends object>(value: T): Readonly<T> {
  const ordered = Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0))
  return Object.freeze({ ...ordered, ...value })
}

/** Only already captured lifecycle records bypass saved JSON ingress. */
export function captureLifecycleProjectSnapshot(
  value: unknown,
  stagedAsset?: DiscBackgroundAsset,
): CapturedLifecycleProject {
  if (isCommittedDiscProject(value)) {
    if (stagedAsset !== undefined) throw new TypeError('A committed Disc project cannot be restaged.')
    return value
  }
  const saved = captureNormalizedProjectSnapshot(value as SavedProject)
  if (!isCapturedSavedDiscProject(saved)) return saved
  const { imageDataUrl, ...background } = saved.background
  if (stagedAsset !== undefined &&
      (!isDiscBackgroundAsset(stagedAsset) || readDiscBackgroundAsset(stagedAsset) !== imageDataUrl)) {
    throw new TypeError('Staged Disc background no longer matches the saved projection.')
  }
  const committed = Object.freeze({
    ...saved,
    background: sortedFrozen({ ...background, asset: stagedAsset ?? legacyDiscBackgroundAsset(imageDataUrl) }),
  })
  discRemainders.set(committed, {})
  return committed
}

export function isCapturedSavedDiscProject(value: NormalizedPersistableProject): value is CapturedSavedDiscProject {
  return value.template.type === 'disc'
}

export function materializeDiscProject(project: CommittedDiscProject): SavedDiscProject {
  if (!isCommittedDiscProject(project)) throw new TypeError('A committed Disc snapshot is required.')
  const { asset, ...background } = project.background
  const projected = Object.freeze({
    ...project,
    background: sortedFrozen({ ...background, imageDataUrl: readDiscBackgroundAsset(asset) }),
  })
  // The older writer API declares mutable arrays although it only reads them.
  return projected as unknown as SavedDiscProject
}

/** Resolve only from the revision selected at export capture. The immutable
 * input retains its exact source through rendering, even if the editor advances. */
export function captureDiscBackgroundExportInput(background: CommittedDiscBackground) {
  const enabled = background.enabled ?? true
  return Object.freeze({
    backgroundImageUrl: enabled ? readDiscBackgroundAsset(background.asset) : null,
    backgroundImageSize: enabled ? background.imageSize ?? null : null,
    backgroundScale: background.scale,
    backgroundOffset: background.offset,
  })
}

export function getNormalizedProjectKind(
  project: NormalizedPersistableProject | CapturedLifecycleProject,
): EditorProjectType {
  return resolveSavedProjectType(project)
}

export function createCanonicalProjectComparisonValue(
  project: NormalizedPersistableProject | CapturedLifecycleProject,
): CanonicalProjectComparisonValue {
  const cached = canonicalComparisonValues.get(project as object)
  if (cached !== undefined) return cached
  const projection = createComparisonProjection(
    project,
    getNormalizedProjectKind(project),
  )
  const comparison = JSON.stringify(projection) as CanonicalProjectComparisonValue
  if (capturedProjectSnapshots.has(project as object) || isCommittedDiscProject(project)) {
    canonicalComparisonValues.set(project as object, comparison)
  }
  return comparison
}

/** Exact structural equality for already normalized immutable project data. */
export function normalizedProjectSnapshotsAreExactlyEqual(
  first: NormalizedPersistableProject | CapturedLifecycleProject,
  second: NormalizedPersistableProject | CapturedLifecycleProject,
): boolean {
  if (first === second) return true
  if (isCommittedDiscProject(first) && isCommittedDiscProject(second)) {
    if (!committedDiscBackgroundsAreExactlyEqual(first.background, second.background)) return false
    const restA = { ...first, background: null }
    const restB = { ...second, background: null }
    return sameJsonValue(restA as unknown as JsonValue, restB as unknown as JsonValue)
  }
  if (isCommittedDiscProject(first) || isCommittedDiscProject(second)) return false
  return sameJsonValue(first as unknown as JsonValue, second as unknown as JsonValue)
}

/** Compare exact semantic content without encoding artwork just to compare it. */
export function projectContentsAreSemanticallyEqual(
  first: CapturedLifecycleProject,
  second: CapturedLifecycleProject,
): boolean {
  if (first === second) return true
  if (!isCommittedDiscProject(first) || !isCommittedDiscProject(second)) {
    if (isCommittedDiscProject(first) || isCommittedDiscProject(second)) return false
    // Case history retains multiple committed projects. A structural check
    // prevents a cached JSON copy of their unchanged encoded artworks.
    const kind = getNormalizedProjectKind(first)
    if (kind !== getNormalizedProjectKind(second)) return false
    return sameJsonValue(createComparisonProjection(first, kind), createComparisonProjection(second, kind))
  }
  if (!committedDiscBackgroundsAreExactlyEqual(first.background, second.background)) return false
  const a = discRemainders.get(first)!
  const b = discRemainders.get(second)!
  if (a === b) return true

  function compareRemainder(project: CommittedDiscProject, identity: DiscRemainderIdentity) {
    if (identity.comparison !== undefined) return identity.comparison
    const projection = cloneRecord(project as unknown as JsonObject)
    delete projection.savedAt
    delete projection.background
    return identity.comparison = JSON.stringify(projection)
  }
  return compareRemainder(first, a) === compareRemainder(second, b)
}

function committedDiscBackgroundsAreExactlyEqual(
  first: CommittedDiscBackground,
  second: CommittedDiscBackground,
): boolean {
  if (first === second) return true
  if (Object.keys(first).length !== Object.keys(second).length ||
      !discBackgroundAssetsExactlyEqual(first.asset, second.asset)) return false
  return Object.entries(first).every(([key,value]) =>
    key === 'asset' || Object.hasOwn(second,key) &&
      sameJsonValue(value as JsonValue, Reflect.get(second,key) as JsonValue))
}

export function savedDiscBackgroundMatches(
  saved: CapturedSavedDiscBackground,
  committed: CommittedDiscBackground,
): boolean {
  const { imageDataUrl, ...rest } = saved
  return committedDiscBackgroundsAreExactlyEqual({ ...rest, asset: legacyDiscBackgroundAsset(imageDataUrl) }, committed)
}

/** The full compatibility input can carry the same background, not replace it. */
export function preserveCapturedDiscBackground(
  project: CommittedDiscProject,
  current: CommittedDiscProject,
): CommittedDiscProject {
  if (project.background === current.background) return project
  const remainder = discRemainders.get(project)
  if (!remainder || !discRemainders.has(current)) throw new TypeError('Committed Disc snapshots are required.')
  if (!committedDiscBackgroundsAreExactlyEqual(project.background, current.background)) {
    throw new TypeError('A legacy projection cannot change Disc background.')
  }
  const next = Object.freeze({ ...project, background: current.background })
  discRemainders.set(next, remainder)
  return next
}

/** Validate disjoint sibling data, then rejoin the already-captured owner.
 * Sorting root keys preserves the existing canonical saved projection order. */
export function captureDiscRemainderWithOwnedBackground(
  remainder: unknown,
  owned: CommittedDiscProject,
): CommittedDiscProject {
  if (!discRemainders.has(owned)) {
    throw new TypeError('A captured Disc project is required.')
  }
  if (typeof remainder === 'object' && remainder !== null &&
      Object.hasOwn(remainder, 'background')) {
    throw new TypeError('A Disc remainder cannot write Background.')
  }
  const normalized = toJsonValue(remainder, 'project')
  if (normalized === OMIT_VALUE || !isJsonObject(normalized)) {
    throw new TypeError('A Disc remainder must be a JSON object.')
  }
  validateNormalizedDiscProjectRemainder(normalized)
  deepFreezeJson(normalized)
  const ordered = Object.fromEntries(
    Object.entries({ ...normalized, background: owned.background })
      .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0),
  )
  const captured = Object.freeze({ ...ordered, ...normalized, background: owned.background })
  discRemainders.set(captured, {})
  return captured
}

/** Scoped fast path: geometry changes reuse the existing owned asset handle. */
export function replaceCapturedDiscBackground(
  project: CommittedDiscProject,
  background: CommittedDiscBackground,
): CommittedDiscProject {
  const remainder = discRemainders.get(project)
  if (!remainder) throw new TypeError('A captured Disc project is required.')
  const current = project.background
  const { x, y } = background.offset
  if (!Number.isFinite(background.scale) ||
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      (background.enabled !== undefined && typeof background.enabled !== 'boolean') ||
      !isDiscBackgroundAsset(background.asset)) {
    throw new TypeError('Invalid Disc background fields.')
  }
  function captureChangedMetadata<T>(candidate: T, previous: T, path: string): T {
    if (candidate === previous) return previous
    const normalized = toJsonValue(candidate ?? null, path) as JsonValue
    if (previous !== undefined && sameJsonValue(previous as JsonValue, normalized)) return previous
    return deepFreezeJson(normalized) as T
  }
  const imageSize = captureChangedMetadata(background.imageSize, current.imageSize, 'background.imageSize')
  const imageSource = captureChangedMetadata(background.imageSource, current.imageSource, 'background.imageSource')
  const updatedBackground: CommittedDiscBackground = {
    ...current,
    ...(background.enabled === undefined ? {} : { enabled: background.enabled }),
    scale: background.scale,
    offset: background.offset === current.offset ? current.offset :
      Object.freeze({ x, y }),
    asset: reuseDiscBackgroundAsset(background.asset, current.asset),
    ...(imageSource === undefined ? {} : { imageSource }),
    ...(imageSize === undefined ? {} : { imageSize }),
  }
  if (committedDiscBackgroundsAreExactlyEqual(current, updatedBackground)) return project
  // Keep the captured snapshot's canonical key order even when upgrading an
  // older input which lacked one of these optional fields.
  const nextBackground = sortedFrozen(updatedBackground)
  const next = Object.freeze({ ...project, background: nextBackground })
  discRemainders.set(next, remainder)
  return next
}
