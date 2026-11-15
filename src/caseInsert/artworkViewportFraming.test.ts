import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createApplicationLifecycleCompositionRoot,
} from '../lifecycle/applicationLifecycleCompositionRoot.ts'
import {
  createLoadedProjectSession,
  isProjectSessionDirty,
} from '../lifecycle/projectSession.ts'
import {
  createJewelCasePreviewLayout,
} from '../layout/caseInsertPreviewLayout.ts'
import { DEFAULT_ADDITIONAL_ARTWORK_FRAME } from '../project/additionalArtworkFrame.ts'
import {
  createBlankJewelCaseSavedProject,
} from '../project/caseInsertProjectAdapters.ts'
import {
  createEmbeddedProjectImageAssetProvenance,
} from '../project/projectAssetStatus.ts'
import type {
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertReservedArtworkViewport,
  ProjectJewelCaseState,
} from '../project/projectTypes.ts'
import {
  resolveCaseInsertArtworkViewportRenderArtifact,
} from './artworkViewportRenderArtifact.ts'
import {
  clearCaseInsertImageSlotImage,
  setCaseInsertImageSlotImage,
} from './imageSlotTransitions.ts'
import {
  CASE_INSERT_ARTWORK_FRAMING_FITS,
  CASE_INSERT_ARTWORK_ZOOM_SLIDER_MAX,
  getCaseInsertArtworkFramingViewModel,
  transitionCaseInsertArtworkFraming,
  transitionJewelCaseSpineArtworkFraming,
} from './artworkViewportFraming.ts'
import type {
  CaseInsertReservedArtworkViewportOwner,
} from './artworkViewportState.ts'

const BASIS_BY_OWNER = Object.freeze({
  cover: 'frontSafe',
  tray: 'backPanelSafe',
  leftSpine: 'leftSpineSafe',
  rightSpine: 'rightSpineSafe',
} as const)

function viewport(
  owner: CaseInsertReservedArtworkViewportOwner,
): ProjectCaseInsertReservedArtworkViewport {
  return {
    kind: 'sbls/case-insert-artwork-viewport',
    formatVersion: 1,
    templateId: 'jewelCase',
    templateRevision: null,
    coordinateBasis: BASIS_BY_OWNER[owner],
    widthPercent: 26,
    heightPercent: 16,
    focalPosition: { xPercent: 43, yPercent: 57 },
    zoom: 1.4,
  }
}

function artworkSlot(
  id: string,
  owner: CaseInsertReservedArtworkViewportOwner,
  fit: ProjectCaseInsertImageSlot['fit'] = 'crop',
): ProjectCaseInsertImageSlot {
  return {
    id,
    label: `Label for ${id}`,
    enabled: true,
    imageDataUrl: 'data:image/png;base64,AA==',
    imageSource: createEmbeddedProjectImageAssetProvenance('Framing test'),
    imageSize: { width: 1600, height: 900 },
    defaultSteamLogo: null,
    fit,
    layout: { scale: 0.82, x: 47, y: 61, rotation: 13 },
    frame: {
      ...DEFAULT_ADDITIONAL_ARTWORK_FRAME,
      enabled: true,
      color: '#123456',
    },
    reservedArtworkViewport: viewport(owner),
  }
}

function projectWithOwnerSlots(): ProjectJewelCaseState {
  const project = createBlankJewelCaseSavedProject('Framing').caseInsert
  project.templates.cover.artworkSlots = [
    artworkSlot('cover-artwork-1', 'cover'),
  ]
  project.templates.tray.artworkSlots = [
    artworkSlot('tray-artwork-other', 'tray'),
    artworkSlot('tray-artwork-1', 'tray'),
  ]
  project.spine.left.artworkSlots = [
    artworkSlot('left-spine-artwork-1', 'leftSpine'),
  ]
  project.spine.right.artworkSlots = [
    artworkSlot('right-spine-artwork-1', 'rightSpine'),
  ]
  return project
}

function getOwnerSlot(
  project: ProjectJewelCaseState,
  owner: CaseInsertReservedArtworkViewportOwner,
  slotId: string,
) {
  const slots = owner === 'cover' || owner === 'tray'
    ? project.templates[owner].artworkSlots
    : project.spine[owner === 'leftSpine' ? 'left' : 'right'].artworkSlots
  const slot = slots.find(({ id }) => id === slotId)
  assert.ok(slot)
  return slot
}

function resolveTray(slot: ProjectCaseInsertImageSlot) {
  const result = resolveCaseInsertArtworkViewportRenderArtifact({
    owner: 'tray',
    slot,
    layout: createJewelCasePreviewLayout('jewelCase', 'back'),
  })
  assert.equal(result.status, 'resolved')
  if (result.status !== 'resolved') throw new Error('Expected resolved artifact')
  return result.artifact
}

test('framing view model exposes exact fits and only operative crop controls', () => {
  assert.deepEqual(CASE_INSERT_ARTWORK_FRAMING_FITS, [
    'contain',
    'cover',
    'crop',
  ])
  assert.equal(CASE_INSERT_ARTWORK_ZOOM_SLIDER_MAX, 10)

  for (const owner of [
    'cover',
    'tray',
    'leftSpine',
    'rightSpine',
  ] as const) {
    const crop = getCaseInsertArtworkFramingViewModel(
      artworkSlot(`${owner}-artwork-1`, owner),
      owner,
    )
    assert.ok(crop)
    assert.equal(crop.showFocalPosition, true)
    assert.equal(crop.showZoom, true)

    for (const fit of ['contain', 'cover'] as const) {
      const model = getCaseInsertArtworkFramingViewModel(
        artworkSlot(`${owner}-${fit}`, owner, fit),
        owner,
      )
      assert.ok(model)
      assert.equal(model.showFocalPosition, false)
      assert.equal(model.showZoom, false)
      assert.deepEqual(model, {
        fit,
        focalXPercent: 43,
        focalYPercent: 57,
        zoom: 1.4,
        showFocalPosition: false,
        showZoom: false,
      })
    }
  }

  const restoredHighZoom = artworkSlot('high-zoom', 'tray')
  restoredHighZoom.reservedArtworkViewport!.zoom = 1000
  assert.equal(
    getCaseInsertArtworkFramingViewModel(restoredHighZoom, 'tray')?.zoom,
    1000,
  )
})

test('absent, malformed, owner-incompatible, and legacy-fit slots expose no framing model', () => {
  const absent = artworkSlot('absent', 'tray')
  delete absent.reservedArtworkViewport
  const malformed = artworkSlot('malformed', 'tray')
  ;(malformed as unknown as { reservedArtworkViewport: unknown })
    .reservedArtworkViewport = { zoom: 1 }

  assert.equal(getCaseInsertArtworkFramingViewModel(absent, 'tray'), null)
  assert.equal(getCaseInsertArtworkFramingViewModel(malformed, 'tray'), null)
  assert.equal(
    getCaseInsertArtworkFramingViewModel(
      artworkSlot('wrong-owner', 'cover'),
      'tray',
    ),
    null,
  )
  assert.equal(
    getCaseInsertArtworkFramingViewModel(
      artworkSlot('legacy-scale', 'tray', 'scale'),
      'tray',
    ),
    null,
  )
})

test('fit, focal, and zoom transitions resolve stable IDs and explicit owners', () => {
  const source = projectWithOwnerSlots()
  const otherTraySlot = source.templates.tray.artworkSlots[0]
  const owners = [
    ['cover', 'cover-artwork-1'],
    ['tray', 'tray-artwork-1'],
    ['leftSpine', 'left-spine-artwork-1'],
    ['rightSpine', 'right-spine-artwork-1'],
  ] as const

  for (const [owner, slotId] of owners) {
    const fit = transitionCaseInsertArtworkFraming(
      source,
      owner,
      slotId,
      { field: 'fit', value: 'contain' },
    )
    assert.equal(fit.ok, true)
    if (!fit.ok) continue
    const focalX = transitionCaseInsertArtworkFraming(
      fit.project,
      owner,
      slotId,
      { field: 'focal-x', value: 0 },
    )
    assert.equal(focalX.ok, true)
    if (!focalX.ok) continue
    const focalY = transitionCaseInsertArtworkFraming(
      focalX.project,
      owner,
      slotId,
      { field: 'focal-y', value: 100 },
    )
    assert.equal(focalY.ok, true)
    if (!focalY.ok) continue
    const zoom = transitionCaseInsertArtworkFraming(
      focalY.project,
      owner,
      slotId,
      { field: 'zoom', value: 1000 },
    )
    assert.equal(zoom.ok, true)
    if (!zoom.ok) continue

    const slot = getOwnerSlot(zoom.project, owner, slotId)
    assert.equal(slot.fit, 'contain')
    assert.deepEqual(slot.reservedArtworkViewport?.focalPosition, {
      xPercent: 0,
      yPercent: 100,
    })
    assert.equal(slot.reservedArtworkViewport?.zoom, 1000)
    assert.equal(slot.imageDataUrl, 'data:image/png;base64,AA==')
    assert.equal(slot.label, `Label for ${slotId}`)
    assert.equal(slot.layout.rotation, 13)
    assert.equal(slot.frame.color, '#123456')
  }

  assert.equal(source.templates.tray.artworkSlots[0], otherTraySlot)
})

test('mode switching preserves dormant focal and zoom values and no-op identity', () => {
  const source = projectWithOwnerSlots()
  const contain = transitionCaseInsertArtworkFraming(
    source,
    'tray',
    'tray-artwork-1',
    { field: 'fit', value: 'contain' },
  )
  assert.equal(contain.ok, true)
  if (!contain.ok) return
  const cover = transitionCaseInsertArtworkFraming(
    contain.project,
    'tray',
    'tray-artwork-1',
    { field: 'fit', value: 'cover' },
  )
  assert.equal(cover.ok, true)
  if (!cover.ok) return
  const crop = transitionCaseInsertArtworkFraming(
    cover.project,
    'tray',
    'tray-artwork-1',
    { field: 'fit', value: 'crop' },
  )
  assert.equal(crop.ok, true)
  if (!crop.ok) return
  const slot = getOwnerSlot(crop.project, 'tray', 'tray-artwork-1')

  assert.deepEqual(slot.reservedArtworkViewport?.focalPosition, {
    xPercent: 43,
    yPercent: 57,
  })
  assert.equal(slot.reservedArtworkViewport?.zoom, 1.4)
  const noOp = transitionCaseInsertArtworkFraming(
    crop.project,
    'tray',
    'tray-artwork-1',
    { field: 'fit', value: 'crop' },
  )
  assert.deepEqual(noOp, { ok: true, status: 'no-op', project: crop.project })
  assert.equal(noOp.project, crop.project)
})

test('source-empty framing remains deferred without enabling or populating the slot', () => {
  const source = projectWithOwnerSlots()
  const empty = source.templates.tray.artworkSlots[1]!
  empty.enabled = false
  empty.imageDataUrl = null
  empty.imageSource = null
  empty.imageSize = null
  const beforeViewport = structuredClone(empty.reservedArtworkViewport)
  const result = transitionCaseInsertArtworkFraming(
    source,
    'tray',
    empty.id,
    { field: 'fit', value: 'contain' },
  )
  assert.equal(result.ok, true)
  if (!result.ok) return
  const updated = getOwnerSlot(result.project, 'tray', empty.id)

  assert.equal(updated.enabled, false)
  assert.equal(updated.imageDataUrl, null)
  assert.equal(updated.imageSource, null)
  assert.equal(updated.imageSize, null)
  assert.deepEqual(updated.reservedArtworkViewport, beforeViewport)
  assert.equal(updated.fit, 'contain')
})

test('invalid, missing, and incompatible framing changes are typed immutable failures', () => {
  const source = projectWithOwnerSlots()
  const missing = transitionCaseInsertArtworkFraming(
    source,
    'tray',
    'unknown-id',
    { field: 'zoom', value: 2 },
  )
  const wrongOwner = transitionCaseInsertArtworkFraming(
    source,
    'cover',
    'tray-artwork-1',
    { field: 'zoom', value: 2 },
  )
  const legacy = structuredClone(source)
  delete legacy.templates.tray.artworkSlots[1]!.reservedArtworkViewport
  const unavailable = transitionCaseInsertArtworkFraming(
    legacy,
    'tray',
    'tray-artwork-1',
    { field: 'fit', value: 'crop' },
  )

  assert.deepEqual(missing, {
    ok: false,
    status: 'not-found',
    code: 'slot-not-found',
    project: source,
  })
  assert.deepEqual(wrongOwner, {
    ok: false,
    status: 'not-found',
    code: 'slot-not-found',
    project: source,
  })
  assert.deepEqual(unavailable, {
    ok: false,
    status: 'incompatible',
    code: 'viewport-unavailable',
    project: legacy,
  })

  for (const value of [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    -1,
    1001,
  ]) {
    const invalid = transitionCaseInsertArtworkFraming(
      source,
      'tray',
      'tray-artwork-1',
      { field: 'zoom', value },
    )
    assert.equal(invalid.ok, false)
    assert.equal(invalid.status, 'invalid')
    assert.equal(invalid.project, source)
  }
  const invalidFit = transitionCaseInsertArtworkFraming(
    source,
    'tray',
    'tray-artwork-1',
    { field: 'fit', value: 'scale' } as never,
  )
  assert.equal(invalidFit.ok, false)
  assert.equal(invalidFit.status, 'invalid')
  assert.equal(invalidFit.project, source)
  for (const field of ['focal-x', 'focal-y'] as const) {
    for (const value of [-0.01, 100.01, Number.NaN]) {
      const invalid = transitionCaseInsertArtworkFraming(
        source,
        'tray',
        'tray-artwork-1',
        { field, value },
      )
      assert.equal(invalid.ok, false)
      assert.equal(invalid.project, source)
    }
  }
})

test('Spine framing follows mirrored editing atomically with side-scoped stable IDs', () => {
  const source = projectWithOwnerSlots()
  const mirrored = transitionJewelCaseSpineArtworkFraming(
    source,
    'left',
    'left-spine-artwork-1',
    { field: 'zoom', value: 2 },
  )
  assert.equal(mirrored.ok, true)
  if (!mirrored.ok) return
  assert.equal(
    getOwnerSlot(
      mirrored.project,
      'leftSpine',
      'left-spine-artwork-1',
    ).reservedArtworkViewport?.zoom,
    2,
  )
  assert.equal(
    getOwnerSlot(
      mirrored.project,
      'rightSpine',
      'right-spine-artwork-1',
    ).reservedArtworkViewport?.zoom,
    2,
  )

  const oneSided = structuredClone(source)
  oneSided.spine.mirrored = false
  const leftOnly = transitionJewelCaseSpineArtworkFraming(
    oneSided,
    'left',
    'left-spine-artwork-1',
    { field: 'focal-y', value: 12 },
  )
  assert.equal(leftOnly.ok, true)
  if (!leftOnly.ok) return
  assert.equal(
    getOwnerSlot(
      leftOnly.project,
      'leftSpine',
      'left-spine-artwork-1',
    ).reservedArtworkViewport?.focalPosition.yPercent,
    12,
  )
  assert.equal(
    getOwnerSlot(
      leftOnly.project,
      'rightSpine',
      'right-spine-artwork-1',
    ).reservedArtworkViewport?.focalPosition.yPercent,
    57,
  )

  const incompleteMirror = structuredClone(source)
  incompleteMirror.spine.right.artworkSlots = []
  const rejected = transitionJewelCaseSpineArtworkFraming(
    incompleteMirror,
    'left',
    'left-spine-artwork-1',
    { field: 'fit', value: 'contain' },
  )
  assert.equal(rejected.ok, false)
  assert.equal(rejected.project, incompleteMirror)
  assert.equal(
    incompleteMirror.spine.left.artworkSlots[0]?.fit,
    'crop',
  )
})

test('source replacement and removal preserve viewport framing and outer placement', () => {
  const slot = artworkSlot('tray-artwork-1', 'tray')
  const expectedViewport = structuredClone(slot.reservedArtworkViewport)
  const expectedLayout = structuredClone(slot.layout)
  const replacement = setCaseInsertImageSlotImage(slot, {
    imageDataUrl: 'data:image/png;base64,replacement',
    imageSize: { width: 1200, height: 900 },
    imageSource: createEmbeddedProjectImageAssetProvenance('Replacement'),
  })
  const cleared = clearCaseInsertImageSlotImage(replacement)

  assert.deepEqual(replacement.reservedArtworkViewport, expectedViewport)
  assert.deepEqual(cleared.reservedArtworkViewport, expectedViewport)
  assert.deepEqual(replacement.layout, expectedLayout)
  assert.deepEqual(cleared.layout, expectedLayout)
  assert.equal(replacement.fit, 'crop')
  assert.equal(cleared.fit, 'crop')
  assert.equal(cleared.imageDataUrl, null)
})

test('focal and zoom edits change source framing without changing outer geometry', () => {
  const source = projectWithOwnerSlots()
  const sourceSlot = getOwnerSlot(source, 'tray', 'tray-artwork-1')
  const before = resolveTray(sourceSlot)
  const focal = transitionCaseInsertArtworkFraming(
    source,
    'tray',
    'tray-artwork-1',
    { field: 'focal-x', value: 80 },
  )
  assert.equal(focal.ok, true)
  if (!focal.ok) return
  const zoom = transitionCaseInsertArtworkFraming(
    focal.project,
    'tray',
    'tray-artwork-1',
    { field: 'zoom', value: 2.5 },
  )
  assert.equal(zoom.ok, true)
  if (!zoom.ok) return
  const afterSlot = getOwnerSlot(zoom.project, 'tray', 'tray-artwork-1')
  const after = resolveTray(afterSlot)

  assert.deepEqual(after.outerRect, before.outerRect)
  assert.deepEqual(after.box, before.box)
  assert.notDeepEqual(after.visibleSourceRect, before.visibleSourceRect)

  const fourByThree = {
    ...afterSlot,
    imageSize: { width: 1200, height: 900 },
  }
  assert.deepEqual(resolveTray(fourByThree).outerRect, after.outerRect)
})

test('framing transitions participate in existing lifecycle dirty semantics', () => {
  const baseline = createBlankJewelCaseSavedProject('Framing lifecycle')
  baseline.caseInsert = projectWithOwnerSlots()
  const root = createApplicationLifecycleCompositionRoot({
    initialState: createLoadedProjectSession({
      sessionId: 'framing-lifecycle',
      project: baseline,
      currentPath: 'C:\\projects\\framing.sbls',
      persistenceFormat: 'sbls-package-v1',
    }),
  })
  const session = root.getLifecycleState().activeSession
  assert.equal(session?.kind, 'caseInsert')
  if (session?.kind !== 'caseInsert') return
  const before = root.getLifecycleState()
  const model = getCaseInsertArtworkFramingViewModel(
    session.project.caseInsert.templates.tray.artworkSlots[1]!,
    'tray',
  )
  assert.ok(model)
  assert.equal(root.getLifecycleState(), before)
  assert.equal(isProjectSessionDirty(session), false)

  const changed = transitionCaseInsertArtworkFraming(
    session.project.caseInsert,
    'tray',
    'tray-artwork-1',
    { field: 'zoom', value: 2 },
  )
  assert.equal(changed.ok, true)
  if (!changed.ok) return
  assert.equal(root.synchronizeCurrentProject({
    sessionId: session.id,
    kind: 'caseInsert',
    project: { ...session.project, caseInsert: changed.project },
  }), 'synchronized')
  const edited = root.getLifecycleState().activeSession
  assert.equal(edited?.revision, 1)
  assert.equal(edited && isProjectSessionDirty(edited), true)
  root.dispose()
})
