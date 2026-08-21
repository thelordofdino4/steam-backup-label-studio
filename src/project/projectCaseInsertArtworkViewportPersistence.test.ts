import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_PERCENT_MIN,
  CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_ZOOM_MAX,
  normalizeProjectCaseInsertReservedArtworkViewport,
  type CaseInsertReservedArtworkViewportOwner,
} from '../caseInsert/artworkViewportState.ts'
import {
  createDefaultCaseInsertImageSlot,
} from '../caseInsert/defaults.ts'
import {
  normalizeProjectJewelCaseState,
} from '../caseInsert/normalization.ts'
import {
  createCaseInsertProjectSnapshot,
  restoreCaseInsertProjectStateFromContents,
} from './caseInsertProjectAdapters.ts'
import type {
  ProjectCaseInsertReservedArtworkViewport,
  ProjectJewelCaseState,
} from './projectTypes.ts'

const BASIS_BY_OWNER = Object.freeze({
  cover: 'frontSafe',
  tray: 'backPanelSafe',
  leftSpine: 'leftSpineSafe',
  rightSpine: 'rightSpineSafe',
} as const)

function viewport(
  owner: CaseInsertReservedArtworkViewportOwner = 'tray',
): ProjectCaseInsertReservedArtworkViewport {
  return {
    kind: 'sbls/case-insert-artwork-viewport',
    formatVersion: 1,
    templateId: 'jewelCase',
    templateRevision: null,
    coordinateBasis: BASIS_BY_OWNER[owner],
    widthPercent: 26,
    heightPercent: 16,
    focalPosition: { xPercent: 44, yPercent: 56 },
    zoom: 1.25,
  }
}

function artworkSlot(
  id: string,
  owner: CaseInsertReservedArtworkViewportOwner,
) {
  return {
    ...createDefaultCaseInsertImageSlot(id, id, { enabled: true }),
    imageDataUrl: 'data:image/png;base64,YXJ0d29yaw==',
    imageSource: {
      source: 'embedded' as const,
      sourceId: null,
      sourceLabel: 'Viewport artwork',
      sourceUrl: null,
    },
    imageSize: { width: 1600, height: 900 },
    reservedArtworkViewport: viewport(owner),
  }
}

function caseStateWithViewports(): ProjectJewelCaseState {
  const project = createCaseInsertProjectSnapshot({
    manualGameTitle: 'Viewport Persistence',
  })
  const caseInsert = structuredClone(project.caseInsert)
  caseInsert.templates.cover.artworkSlots = [
    artworkSlot('cover-artwork-1', 'cover'),
  ]
  caseInsert.templates.tray.artworkSlots = [
    artworkSlot('tray-artwork-1', 'tray'),
  ]
  caseInsert.spine.left.artworkSlots = [
    artworkSlot('spine-left-artwork-1', 'leftSpine'),
  ]
  caseInsert.spine.right.artworkSlots = [
    artworkSlot('spine-right-artwork-1', 'rightSpine'),
  ]
  return caseInsert
}

test('new image slots use canonical omission for viewport absence', () => {
  const slot = createDefaultCaseInsertImageSlot('artwork-1', 'Artwork 1')

  assert.equal(Object.hasOwn(slot, 'reservedArtworkViewport'), false)
  assert.equal(slot.reservedArtworkViewport, undefined)
})

test('strict viewport normalization accepts only exact owner-compatible state', () => {
  for (const owner of [
    'cover',
    'tray',
    'leftSpine',
    'rightSpine',
  ] as const) {
    assert.deepEqual(
      normalizeProjectCaseInsertReservedArtworkViewport(
        viewport(owner),
        owner,
      ),
      viewport(owner),
    )
  }

  assert.equal(
    normalizeProjectCaseInsertReservedArtworkViewport(viewport('tray'), 'cover'),
    null,
  )
  assert.equal(
    normalizeProjectCaseInsertReservedArtworkViewport(
      { ...viewport(), unexpected: true },
      'tray',
    ),
    null,
  )
  assert.equal(
    normalizeProjectCaseInsertReservedArtworkViewport(
      { ...viewport(), widthPercent: 0 },
      'tray',
    ),
    null,
  )
  assert.equal(
    normalizeProjectCaseInsertReservedArtworkViewport(
      { ...viewport(), focalPosition: { xPercent: -1, yPercent: 50 } },
      'tray',
    ),
    null,
  )
  assert.equal(
    normalizeProjectCaseInsertReservedArtworkViewport(
      { ...viewport(), zoom: Number.POSITIVE_INFINITY },
      'tray',
    ),
    null,
  )
  assert.deepEqual(
    normalizeProjectCaseInsertReservedArtworkViewport(
      {
        ...viewport(),
        widthPercent: CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_PERCENT_MIN,
        zoom: CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_ZOOM_MAX,
      },
      'tray',
    ),
    {
      ...viewport(),
      widthPercent: CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_PERCENT_MIN,
      zoom: CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_ZOOM_MAX,
    },
  )
  assert.equal(
    normalizeProjectCaseInsertReservedArtworkViewport(
      {
        ...viewport(),
        widthPercent:
          CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_PERCENT_MIN / 10,
      },
      'tray',
    ),
    null,
  )
  assert.equal(
    normalizeProjectCaseInsertReservedArtworkViewport(
      { ...viewport(), zoom: CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_ZOOM_MAX + 1 },
      'tray',
    ),
    null,
  )
  assert.equal(
    normalizeProjectCaseInsertReservedArtworkViewport(null, 'tray'),
    null,
  )

  const accessor = { ...viewport() }
  Object.defineProperty(accessor, 'zoom', {
    enumerable: true,
    get: () => 1,
  })
  assert.equal(
    normalizeProjectCaseInsertReservedArtworkViewport(accessor, 'tray'),
    null,
  )
})

test('all four ordinary artwork owner families preserve viewport state', () => {
  const project = createCaseInsertProjectSnapshot({
    manualGameTitle: 'Viewport Round Trip',
    caseInsert: caseStateWithViewports(),
    savedAt: '2026-08-21T12:00:00.000Z',
  })
  const restored = restoreCaseInsertProjectStateFromContents(
    JSON.stringify(project),
  ).caseInsert

  assert.deepEqual(
    restored.templates.cover.artworkSlots[0]?.reservedArtworkViewport,
    viewport('cover'),
  )
  assert.deepEqual(
    restored.templates.tray.artworkSlots[0]?.reservedArtworkViewport,
    viewport('tray'),
  )
  assert.deepEqual(
    restored.spine.left.artworkSlots[0]?.reservedArtworkViewport,
    viewport('leftSpine'),
  )
  assert.deepEqual(
    restored.spine.right.artworkSlots[0]?.reservedArtworkViewport,
    viewport('rightSpine'),
  )
  assert.equal(
    restored.templates.tray.artworkSlots[0]?.imageDataUrl,
    'data:image/png;base64,YXJ0d29yaw==',
  )
  assert.equal(
    restored.templates.tray.artworkSlots[0]?.imageSource?.sourceLabel,
    'Viewport artwork',
  )
})

test('unsupported slot families and mismatched artwork bases normalize to omission', () => {
  const source = caseStateWithViewports()
  source.templates.cover.background.reservedArtworkViewport = viewport('cover')
  source.templates.cover.titleArtwork.reservedArtworkViewport = viewport('cover')
  source.templates.cover.logoSlots = [artworkSlot('cover-logo-1', 'cover')]
  source.templates.cover.markSlots = [artworkSlot('cover-mark-1', 'cover')]
  source.templates.cover.artworkSlots[0]!.reservedArtworkViewport =
    viewport('tray')
  source.spine.left.artworkSlots[0]!.reservedArtworkViewport =
    viewport('rightSpine')

  const normalized = normalizeProjectJewelCaseState(source)

  for (const slot of [
    normalized.templates.cover.background,
    normalized.templates.cover.titleArtwork,
    normalized.templates.cover.logoSlots[0],
    normalized.templates.cover.markSlots[0],
    normalized.templates.cover.artworkSlots[0],
    normalized.spine.left.artworkSlots[0],
  ]) {
    assert.ok(slot)
    assert.equal(Object.hasOwn(slot, 'reservedArtworkViewport'), false)
    assert.equal(slot.reservedArtworkViewport, undefined)
  }
})

test('persisted viewport state contains only source-independent owner fields', () => {
  const serialized = JSON.stringify(viewport())

  for (const forbidden of [
    'presetId',
    'assignmentId',
    'plan',
    'warning',
    'consent',
    'sourceRect',
    'imageDataUrl',
    'catalog',
  ]) {
    assert.equal(serialized.includes(forbidden), false)
  }
})
