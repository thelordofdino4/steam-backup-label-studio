import type {
  ProjectCaseInsertReservedArtworkViewport,
  ProjectCaseInsertReservedArtworkViewportCoordinateBasis,
} from '../project/projectTypes.ts'

export const CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_KIND =
  'sbls/case-insert-artwork-viewport' as const
export const CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_FORMAT_VERSION = 1 as const
export const CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_PERCENT_MIN = 0.01
export const CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_PERCENT_MAX = 100
export const CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_ZOOM_MIN = 1
export const CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_ZOOM_MAX = 1000

const COORDINATE_BASES = new Set<string>([
  'front',
  'frontSafe',
  'backPanel',
  'backPanelSafe',
  'leftSpine',
  'leftSpineSafe',
  'rightSpine',
  'rightSpineSafe',
])

export type CaseInsertReservedArtworkViewportOwner =
  | 'cover'
  | 'tray'
  | 'leftSpine'
  | 'rightSpine'

const OWNER_COORDINATE_BASES = Object.freeze({
  cover: Object.freeze(['front', 'frontSafe'] as const),
  tray: Object.freeze(['backPanel', 'backPanelSafe'] as const),
  leftSpine: Object.freeze(['leftSpine', 'leftSpineSafe'] as const),
  rightSpine: Object.freeze(['rightSpine', 'rightSpineSafe'] as const),
})

type DataRecord = Readonly<Record<string, unknown>>

function exactDataRecord(
  value: unknown,
  expectedKeys: readonly string[],
): DataRecord | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null
  }

  try {
    const prototype = Object.getPrototypeOf(value) as object | null
    const descriptors = Object.getOwnPropertyDescriptors(value)
    const keys = Reflect.ownKeys(descriptors)
    const expected = [...expectedKeys].sort()
    const actual = keys.filter((key): key is string => typeof key === 'string')
      .sort()

    if ((prototype !== Object.prototype && prototype !== null) ||
        keys.some((key) => typeof key !== 'string') ||
        actual.length !== expected.length ||
        actual.some((key, index) => key !== expected[index])) {
      return null
    }

    const result: Record<string, unknown> = {}
    for (const key of expected) {
      const descriptor = descriptors[key]
      if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) {
        return null
      }
      result[key] = descriptor.value
    }
    return result
  } catch {
    return null
  }
}

function isFiniteWithin(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return typeof value === 'number' && Number.isFinite(value) &&
    value >= minimum && value <= maximum
}

function isCoordinateBasis(
  value: unknown,
): value is ProjectCaseInsertReservedArtworkViewportCoordinateBasis {
  return typeof value === 'string' && COORDINATE_BASES.has(value)
}

function isCoordinateBasisForOwner(
  value: ProjectCaseInsertReservedArtworkViewportCoordinateBasis,
  owner: CaseInsertReservedArtworkViewportOwner,
) {
  return (OWNER_COORDINATE_BASES[owner] as readonly string[]).includes(value)
}

/**
 * Canonical persistence-boundary normalization for one reserved artwork
 * viewport. Absence and every malformed or unsupported value become null.
 */
export function normalizeProjectCaseInsertReservedArtworkViewport(
  value: unknown,
  owner: CaseInsertReservedArtworkViewportOwner,
): ProjectCaseInsertReservedArtworkViewport | null {
  const record = exactDataRecord(value, [
    'kind',
    'formatVersion',
    'templateId',
    'templateRevision',
    'coordinateBasis',
    'widthPercent',
    'heightPercent',
    'focalPosition',
    'zoom',
  ])
  if (!record ||
      record.kind !== CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_KIND ||
      record.formatVersion !==
        CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_FORMAT_VERSION ||
      record.templateId !== 'jewelCase' ||
      record.templateRevision !== null ||
      !isCoordinateBasis(record.coordinateBasis) ||
      !isCoordinateBasisForOwner(record.coordinateBasis, owner) ||
      !isFiniteWithin(
        record.widthPercent,
        CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_PERCENT_MIN,
        CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_PERCENT_MAX,
      ) ||
      !isFiniteWithin(
        record.heightPercent,
        CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_PERCENT_MIN,
        CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_PERCENT_MAX,
      ) ||
      !isFiniteWithin(
        record.zoom,
        CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_ZOOM_MIN,
        CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_ZOOM_MAX,
      )) {
    return null
  }

  const focalPosition = exactDataRecord(
    record.focalPosition,
    ['xPercent', 'yPercent'],
  )
  if (!focalPosition ||
      !isFiniteWithin(focalPosition.xPercent, 0, 100) ||
      !isFiniteWithin(focalPosition.yPercent, 0, 100)) {
    return null
  }

  return {
    kind: CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_KIND,
    formatVersion: CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_FORMAT_VERSION,
    templateId: 'jewelCase',
    templateRevision: null,
    coordinateBasis: record.coordinateBasis,
    widthPercent: record.widthPercent,
    heightPercent: record.heightPercent,
    focalPosition: {
      xPercent: focalPosition.xPercent,
      yPercent: focalPosition.yPercent,
    },
    zoom: record.zoom,
  }
}
