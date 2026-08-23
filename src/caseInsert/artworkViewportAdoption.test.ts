import assert from 'node:assert/strict'
import test from 'node:test'

import type { ProjectCaseInsertImageSlot } from '../project/projectTypes.ts'
import {
  CASE_INSERT_PRESET_ARTWORK_VIEWPORT_ACTION_FORMAT_VERSION,
  CASE_INSERT_PRESET_ARTWORK_VIEWPORT_ACTION_KIND,
  planCaseInsertPresetArtworkViewport,
} from '../presets/caseInsertPresetArtworkViewport.ts'
import {
  createDefaultCaseInsertImageSlot,
  createDefaultProjectJewelCaseState,
} from './defaults.ts'
import {
  adoptCaseInsertArtworkViewport,
  type CaseInsertArtworkViewportAdoptionResult,
  type CaseInsertArtworkViewportAdoptionTarget,
} from './artworkViewportAdoption.ts'
import {
  CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_PERCENT_MIN,
  CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_ZOOM_MAX,
} from './artworkViewportState.ts'
import {
  clearCaseInsertImageSlotImage,
  setCaseInsertImageSlotImage,
} from './imageSlotTransitions.ts'
import { removeJewelCaseSpineImageSlot } from './jewelCaseTransitions.ts'
import {
  removeCaseInsertTemplateImageSlot,
} from './templateSurfaceTransitions.ts'

type MutableRecord = Record<string, unknown>

const PRESET_ID = 'builtin:case-preset:viewport-adoption-tests'
const PRESET_REVISION = 1

const OWNER_CASES = [
  {
    ownerId: 'case.cover.artwork-slots',
    objectId: 'cover-artwork-1',
    region: 'front-cover',
    roleId: 'additional-artwork',
    coordinateBases: ['front', 'frontSafe'],
  },
  {
    ownerId: 'case.tray.artwork-slots',
    objectId: 'tray-artwork-1',
    region: 'back-panel',
    roleId: 'screenshots',
    coordinateBases: ['backPanel', 'backPanelSafe'],
  },
  {
    ownerId: 'case.spine.left.artwork-slots',
    objectId: 'left-spine-artwork-1',
    region: 'left-spine',
    roleId: 'additional-artwork',
    coordinateBases: ['leftSpine', 'leftSpineSafe'],
  },
  {
    ownerId: 'case.spine.right.artwork-slots',
    objectId: 'right-spine-artwork-1',
    region: 'right-spine',
    roleId: 'additional-artwork',
    coordinateBases: ['rightSpine', 'rightSpineSafe'],
  },
] as const

type OwnerCase = typeof OWNER_CASES[number]

function planningInput(
  owner: OwnerCase = OWNER_CASES[1],
  coordinateBasis: OwnerCase['coordinateBases'][number] =
    owner.coordinateBases[1],
  fitting: unknown = { mode: 'contain' },
  source: {
    assetIdentity: string
    provenanceIdentity: string | null
    width: number
    height: number
    contentBounds: null | { x: number; y: number; width: number; height: number }
  } | null = {
    assetIdentity: 'asset:sha256:viewport-adoption-test',
    provenanceIdentity: 'steam:app:100:screenshot:0',
    width: 1600,
    height: 900,
    contentBounds: null,
  },
) {
  const sideLike = owner.ownerId.replaceAll('.', '-')
  return {
    assignment: {
      presetId: PRESET_ID,
      presetRevision: PRESET_REVISION,
      slotId: `case:preset-slot:${sideLike}`,
      assignmentId: `case:preset-assignment:${sideLike}`,
      roleId: owner.roleId,
      region: owner.region,
      coordinateBasis,
      ownerId: owner.ownerId,
      object: { kind: 'repeated', id: owner.objectId },
    },
    template: {
      id: 'jewelCase',
      revision: null,
      presetCompatibility: {
        presetId: PRESET_ID,
        presetRevision: PRESET_REVISION,
        mode: 'specific-template',
        templateId: 'jewelCase',
      },
    },
    action: {
      kind: CASE_INSERT_PRESET_ARTWORK_VIEWPORT_ACTION_KIND,
      formatVersion: CASE_INSERT_PRESET_ARTWORK_VIEWPORT_ACTION_FORMAT_VERSION,
      viewport: {
        centerXPercent: 42,
        centerYPercent: 61,
        widthPercent: 24,
        heightPercent: 18,
      },
      fitting,
    },
    source,
    capabilities: {
      ownerId: owner.ownerId,
      object: { kind: 'repeated', id: owner.objectId },
      viewportGeometry: true,
      contain: true,
      cover: true,
      explicitCropFraming: true,
      focalOffset: true,
      zoom: true,
    },
  }
}

function targetFor(
  input: ReturnType<typeof planningInput>,
): CaseInsertArtworkViewportAdoptionTarget {
  return {
    templateId: 'jewelCase',
    templateRevision: null,
    presetId: PRESET_ID,
    presetRevision: PRESET_REVISION,
    slotId: input.assignment.slotId as `case:preset-slot:${string}`,
    assignmentId:
      input.assignment.assignmentId as `case:preset-assignment:${string}`,
    ownerId: input.assignment.ownerId,
    objectId: input.assignment.object.id,
    coordinateBasis: input.assignment.coordinateBasis,
  }
}

function slotFor(objectId: string): ProjectCaseInsertImageSlot {
  return {
    ...createDefaultCaseInsertImageSlot(objectId, 'Artwork 1', {
      enabled: true,
      fit: 'scale',
      layout: {
        scale: 1.75,
        fontSizePt: 17,
        width: 33,
        x: 7,
        y: 9,
        rotation: 13,
      },
    }),
    imageDataUrl: 'data:image/png;base64,YXJ0d29yaw==',
    imageSource: {
      source: 'steam-artwork',
      sourceId: 'steam:100:screenshot:0',
      sourceLabel: 'Original source',
      sourceUrl: 'https://example.invalid/source.png',
    },
    imageSize: { width: 1600, height: 900 },
    frame: {
      enabled: true,
      color: '#123456',
      width: 3,
      shape: 'circle',
      style: 'rocky',
      lumpiness: 27,
      jaggedness: 31,
      roughnessOffset: 8,
    },
  }
}

function evidenceFor(input: ReturnType<typeof planningInput>) {
  const result = planCaseInsertPresetArtworkViewport(input)
  assert.equal(result.ok, true)
  if (!result.ok) assert.fail(`Unexpected ${result.status} planning failure.`)
  return result
}

function assertAdopted(result: CaseInsertArtworkViewportAdoptionResult) {
  assert.equal(result.ok, true)
  if (!result.ok) assert.fail(`Unexpected ${result.status} adoption failure.`)
  return result.slot
}

function assertFailure(
  result: CaseInsertArtworkViewportAdoptionResult,
  status: 'invalid' | 'incompatible' | 'unsupported',
  code: string,
) {
  assert.equal(result.ok, false)
  if (result.ok) assert.fail('Expected adoption failure.')
  assert.equal(result.status, status)
  assert.equal(result.error.code, code)
  return result
}

function assertDeeplyFrozen(value: unknown, seen = new Set<unknown>()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return
  seen.add(value)
  assert.ok(Object.isFrozen(value))
  for (const child of Object.values(value)) assertDeeplyFrozen(child, seen)
}

test('adopts all four repeated artwork owner families across their allowed bases', () => {
  for (const owner of OWNER_CASES) {
    for (const coordinateBasis of owner.coordinateBases) {
      const input = planningInput(owner, coordinateBasis)
      const slot = slotFor(owner.objectId)
      const original = structuredClone(slot)
      const evidence = evidenceFor(input)
      const adopted = assertAdopted(adoptCaseInsertArtworkViewport({
        slot,
        target: targetFor(input),
        evidence,
      }))

      assert.deepEqual(slot, original)
      assert.notEqual(adopted, slot)
      assert.notEqual(adopted.imageSource, slot.imageSource)
      assert.notEqual(adopted.imageSize, slot.imageSize)
      assert.notEqual(adopted.frame, slot.frame)
      assert.notEqual(adopted.layout, slot.layout)
      assert.equal(adopted.id, slot.id)
      assert.equal(adopted.label, slot.label)
      assert.equal(adopted.enabled, slot.enabled)
      assert.equal(adopted.imageDataUrl, slot.imageDataUrl)
      assert.deepEqual(adopted.imageSource, slot.imageSource)
      assert.deepEqual(adopted.imageSize, slot.imageSize)
      assert.deepEqual(adopted.frame, slot.frame)
      assert.equal(adopted.layout.rotation, slot.layout.rotation)
      assert.equal(adopted.layout.fontSizePt, slot.layout.fontSizePt)
      assert.equal(adopted.layout.width, slot.layout.width)
      assert.equal(adopted.layout.scale, 1)
      assert.equal(adopted.layout.x, input.action.viewport.centerXPercent)
      assert.equal(adopted.layout.y, input.action.viewport.centerYPercent)
      assert.equal(adopted.fit, 'contain')
      assert.deepEqual(adopted.reservedArtworkViewport, {
        kind: 'sbls/case-insert-artwork-viewport',
        formatVersion: 1,
        templateId: 'jewelCase',
        templateRevision: null,
        coordinateBasis,
        widthPercent: input.action.viewport.widthPercent,
        heightPercent: input.action.viewport.heightPercent,
        focalPosition: { xPercent: 50, yPercent: 50 },
        zoom: 1,
      })
      const persisted = JSON.stringify(adopted.reservedArtworkViewport)
      for (const forbidden of [
        'assignment',
        'capabilities',
        'warning',
        'consent',
        'sourceRect',
        'visibleSourceRect',
      ]) {
        assert.equal(persisted.includes(forbidden), false)
      }
      assertDeeplyFrozen(adopted)
    }
  }
})

test('maps Contain, Cover, and resolved explicit crop to one slot-owned fitting model', () => {
  for (const mode of ['contain', 'cover'] as const) {
    const input = planningInput(OWNER_CASES[1], 'backPanelSafe', { mode })
    const adopted = assertAdopted(adoptCaseInsertArtworkViewport({
      slot: slotFor(input.assignment.object.id),
      target: targetFor(input),
      evidence: evidenceFor(input),
    }))
    assert.equal(adopted.fit, mode)
    assert.deepEqual(adopted.reservedArtworkViewport?.focalPosition,
      { xPercent: 50, yPercent: 50 })
    assert.equal(adopted.reservedArtworkViewport?.zoom, 1)
  }

  const deferred = planningInput(OWNER_CASES[1], 'backPanelSafe')
  deferred.source = null
  const deferredPlan = evidenceFor(deferred).plan
  const aspect = deferredPlan.viewport.physicalAspectRatio
  const cropWidthPercent = 70
  const cropHeightPercent = 1600 * cropWidthPercent / 100 /
    aspect / 900 * 100
  const crop = planningInput(OWNER_CASES[1], 'backPanelSafe', {
    mode: 'explicit-crop',
    sourceWindow: {
      centerXPercent: 44,
      centerYPercent: 57,
      widthPercent: cropWidthPercent,
      heightPercent: cropHeightPercent,
    },
  })
  const cropEvidence = evidenceFor(crop)
  assert.equal(cropEvidence.status, 'resolved')
  const adoptedCrop = assertAdopted(adoptCaseInsertArtworkViewport({
    slot: slotFor(crop.assignment.object.id),
    target: targetFor(crop),
    evidence: cropEvidence,
  }))
  assert.equal(adoptedCrop.fit, 'crop')
  assert.deepEqual(
    adoptedCrop.reservedArtworkViewport?.focalPosition,
    { xPercent: 44, yPercent: 57 },
  )
  assert.ok((adoptedCrop.reservedArtworkViewport?.zoom ?? 0) >= 1)
})

test('rejects canonically planned viewport state outside operational bounds', () => {
  const deferred = planningInput(OWNER_CASES[1], 'backPanelSafe')
  deferred.source = null
  const aspect = evidenceFor(deferred).plan.viewport.physicalAspectRatio
  const cropWidthPercent = 0.001
  const cropHeightPercent = 1600 * cropWidthPercent / 100 /
    aspect / 900 * 100
  const hugeCrop = planningInput(OWNER_CASES[1], 'backPanelSafe', {
    mode: 'explicit-crop',
    sourceWindow: {
      centerXPercent: 50,
      centerYPercent: 50,
      widthPercent: cropWidthPercent,
      heightPercent: cropHeightPercent,
    },
  })
  const hugeCropEvidence = evidenceFor(hugeCrop)
  assert.equal(hugeCropEvidence.status, 'resolved')
  assert.ok(
    (hugeCropEvidence.plan.fitting.derivedZoom ?? 0) >
      CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_ZOOM_MAX,
  )
  assertFailure(adoptCaseInsertArtworkViewport({
    slot: slotFor(hugeCrop.assignment.object.id),
    target: targetFor(hugeCrop),
    evidence: hugeCropEvidence,
  }), 'unsupported', 'viewport-zoom-unsupported')

  const tinyViewport = planningInput(OWNER_CASES[0], 'frontSafe')
  tinyViewport.action.viewport.widthPercent =
    CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_PERCENT_MIN / 10
  const tinyViewportEvidence = evidenceFor(tinyViewport)
  assert.equal(tinyViewportEvidence.ok, true)
  assertFailure(adoptCaseInsertArtworkViewport({
    slot: slotFor(tinyViewport.assignment.object.id),
    target: targetFor(tinyViewport),
    evidence: tinyViewportEvidence,
  }), 'unsupported', 'viewport-size-unsupported')
})

test('adopts deferred Contain and Cover but rejects deferred explicit crop', () => {
  for (const mode of ['contain', 'cover'] as const) {
    const input = planningInput(OWNER_CASES[0], 'frontSafe', { mode }, null)
    const evidence = evidenceFor(input)
    assert.equal(evidence.status, 'deferred')
    const adopted = assertAdopted(adoptCaseInsertArtworkViewport({
      slot: slotFor(input.assignment.object.id),
      target: targetFor(input),
      evidence,
    }))
    assert.equal(adopted.fit, mode)
  }

  const explicit = planningInput(OWNER_CASES[1], 'backPanelSafe', {
    mode: 'explicit-crop',
    sourceWindow: {
      centerXPercent: 50,
      centerYPercent: 50,
      widthPercent: 70,
      heightPercent: 50,
    },
  }, null)
  assertFailure(adoptCaseInsertArtworkViewport({
    slot: slotFor(explicit.assignment.object.id),
    target: targetFor(explicit),
    evidence: evidenceFor(explicit),
  }), 'unsupported', 'deferred-explicit-crop-unsupported')
})

test('rechecks assignment, template, owner, object, basis, and canonical evidence', () => {
  const input = planningInput(OWNER_CASES[1], 'backPanelSafe')
  const evidence = evidenceFor(input)
  const slot = slotFor(input.assignment.object.id)
  const target = targetFor(input)

  assertFailure(adoptCaseInsertArtworkViewport({
    slot,
    target: {
      ...target,
      assignmentId: 'case:preset-assignment:other-assignment',
    },
    evidence,
  }), 'incompatible', 'assignment-target-mismatch')
  assertFailure(adoptCaseInsertArtworkViewport({
    slot,
    target: { ...target, objectId: 'tray-artwork-2' },
    evidence,
  }), 'incompatible', 'object-target-mismatch')
  assertFailure(adoptCaseInsertArtworkViewport({
    slot,
    target: {
      ...target,
      ownerId: 'case.cover.artwork-slots',
      coordinateBasis: 'frontSafe',
    },
    evidence,
  }), 'incompatible', 'owner-target-mismatch')
  assertFailure(adoptCaseInsertArtworkViewport({
    slot,
    target: { ...target, coordinateBasis: 'backPanel' },
    evidence,
  }), 'incompatible', 'role-region-basis-target-mismatch')
  assertFailure(adoptCaseInsertArtworkViewport({
    slot,
    target: {
      ...target,
      templateId: 'unsupportedCase' as never,
    },
    evidence,
  }), 'unsupported', 'template-unsupported')

  const tampered = structuredClone(evidence) as MutableRecord
  const plan = tampered.plan as MutableRecord
  plan.identity = 'case:preset-artwork-fitting-plan:v1:tampered'
  assertFailure(adoptCaseInsertArtworkViewport({
    slot,
    target,
    evidence: tampered,
  }), 'invalid', 'evidence-invalid')
})

test('rejects background, title, logo, mark, text, and unknown owner families', () => {
  const input = planningInput()
  const evidence = evidenceFor(input)
  const slot = slotFor(input.assignment.object.id)
  const target = targetFor(input)
  for (const ownerId of [
    'case.cover.background',
    'case.cover.title-artwork',
    'case.cover.logo-slots',
    'case.cover.mark-slots',
    'case.cover.text-blocks',
    'case.unknown.artwork-slots',
  ]) {
    assertFailure(adoptCaseInsertArtworkViewport({
      slot,
      target: { ...target, ownerId },
      evidence,
    }), 'unsupported', 'owner-unsupported')
  }
})

test('source replacement and clearing preserve adopted viewport owner state', () => {
  const input = planningInput()
  const adopted = assertAdopted(adoptCaseInsertArtworkViewport({
    slot: slotFor(input.assignment.object.id),
    target: targetFor(input),
    evidence: evidenceFor(input),
  })) as ProjectCaseInsertImageSlot
  const viewport = structuredClone(adopted.reservedArtworkViewport)
  const replacement = setCaseInsertImageSlotImage(adopted, {
    imageDataUrl: 'data:image/png;base64,cmVwbGFjZW1lbnQ=',
    imageSize: { width: 1200, height: 900 },
    imageSource: {
      source: 'uploaded',
      sourceId: null,
      sourceLabel: 'Replacement',
      sourceUrl: null,
    },
  })
  assert.deepEqual(replacement.reservedArtworkViewport, viewport)
  const cleared = clearCaseInsertImageSlotImage(replacement)
  assert.deepEqual(cleared.reservedArtworkViewport, viewport)
  assert.equal(cleared.imageDataUrl, null)
  assert.equal(cleared.enabled, false)
})

test('public removal transitions remove viewport-bearing slots and preserve siblings', () => {
  for (const owner of OWNER_CASES) {
    const input = planningInput(owner, owner.coordinateBases[1])
    const adopted = structuredClone(assertAdopted(
      adoptCaseInsertArtworkViewport({
        slot: slotFor(owner.objectId),
        target: targetFor(input),
        evidence: evidenceFor(input),
      }),
    )) as ProjectCaseInsertImageSlot
    const sibling = slotFor(`${owner.objectId}-sibling`)
    let state = createDefaultProjectJewelCaseState('Removal Test')

    if (owner.ownerId === 'case.cover.artwork-slots' ||
        owner.ownerId === 'case.tray.artwork-slots') {
      const paneId = owner.ownerId === 'case.cover.artwork-slots'
        ? 'cover'
        : 'tray'
      const otherPaneId = paneId === 'cover' ? 'tray' : 'cover'
      state = {
        ...state,
        templates: {
          ...state.templates,
          [paneId]: {
            ...state.templates[paneId],
            artworkSlots: [adopted, sibling],
          },
        },
      }
      const otherPane = state.templates[otherPaneId]
      const spine = state.spine
      const removed = removeCaseInsertTemplateImageSlot(
        state,
        paneId,
        'artworkSlots',
        adopted.id,
      )

      assert.deepEqual(removed.templates[paneId].artworkSlots, [sibling])
      assert.equal(removed.templates[paneId].artworkSlots[0], sibling)
      assert.equal(removed.templates[otherPaneId], otherPane)
      assert.equal(removed.spine, spine)
      assert.equal(
        removed.templates[paneId].artworkSlots.some(
          (slot) => slot.reservedArtworkViewport !== null &&
            slot.reservedArtworkViewport !== undefined,
        ),
        false,
      )
      continue
    }

    const side = owner.ownerId === 'case.spine.left.artwork-slots'
      ? 'left'
      : 'right'
    const otherSide = side === 'left' ? 'right' : 'left'
    state = {
      ...state,
      spine: {
        ...state.spine,
        [side]: {
          ...state.spine[side],
          artworkSlots: [adopted, sibling],
        },
      },
    }
    const otherSpine = state.spine[otherSide]
    const templates = state.templates
    const removed = removeJewelCaseSpineImageSlot(
      state,
      side,
      'artworkSlots',
      adopted.id,
    )

    assert.deepEqual(removed.spine[side].artworkSlots, [sibling])
    assert.equal(removed.spine[side].artworkSlots[0], sibling)
    assert.equal(removed.spine[otherSide], otherSpine)
    assert.equal(removed.templates, templates)
    assert.equal(
      removed.spine[side].artworkSlots.some(
        (slot) => slot.reservedArtworkViewport !== null &&
          slot.reservedArtworkViewport !== undefined,
      ),
      false,
    )
  }
})

test('fails typed without mutation for malformed and hostile adoption inputs', () => {
  const input = planningInput()
  const evidence = evidenceFor(input)
  const slot = slotFor(input.assignment.object.id)
  const target = targetFor(input)
  const before = structuredClone({ slot, target, evidence })

  const malformedCases: MutableRecord[] = []
  const extraSlotField = structuredClone(slot) as unknown as MutableRecord
  extraSlotField.forged = true
  malformedCases.push(extraSlotField)

  const extraLayoutField = structuredClone(slot) as unknown as MutableRecord
  ;(extraLayoutField.layout as MutableRecord).forged = true
  malformedCases.push(extraLayoutField)

  const malformedSource = structuredClone(slot) as unknown as MutableRecord
  malformedSource.imageSource = { evil: true }
  malformedCases.push(malformedSource)

  const malformedDefault = structuredClone(slot) as unknown as MutableRecord
  malformedDefault.defaultSteamLogo = 42
  malformedCases.push(malformedDefault)

  const malformedPriorViewport = structuredClone(slot) as unknown as MutableRecord
  malformedPriorViewport.reservedArtworkViewport = { forged: true }
  malformedCases.push(malformedPriorViewport)

  const malformedBounds = structuredClone(slot) as unknown as MutableRecord
  ;(malformedBounds.imageSize as MutableRecord).contentBounds = {
    x: 0,
    y: 0,
    width: 2000,
    height: 900,
  }
  malformedCases.push(malformedBounds)

  const outOfRangeFrame = structuredClone(slot) as unknown as MutableRecord
  ;(outOfRangeFrame.frame as MutableRecord).width = 9
  malformedCases.push(outOfRangeFrame)

  for (const malformed of malformedCases) {
    assertFailure(adoptCaseInsertArtworkViewport({
      slot: malformed,
      target,
      evidence,
    }), 'invalid', 'slot-invalid')
  }

  const malformedSlot = structuredClone(slot) as unknown as MutableRecord
  ;(malformedSlot.layout as MutableRecord).width = Number.POSITIVE_INFINITY
  assertFailure(adoptCaseInsertArtworkViewport({
    slot: malformedSlot,
    target,
    evidence,
  }), 'invalid', 'input-not-plain')

  const cyclic = structuredClone({ slot, target, evidence }) as MutableRecord
  cyclic.self = cyclic
  assertFailure(
    adoptCaseInsertArtworkViewport(cyclic),
    'invalid',
    'input-not-plain',
  )
  const accessor = structuredClone({ slot, target, evidence }) as MutableRecord
  Object.defineProperty(accessor, 'computed', { get: () => true })
  assertFailure(
    adoptCaseInsertArtworkViewport(accessor),
    'invalid',
    'input-not-plain',
  )

  assert.deepEqual({ slot, target, evidence }, before)
})
