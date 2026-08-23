import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createDefaultCaseInsertImageSlot,
} from '../caseInsert/defaults.ts'
import {
  createCaseInsertPresetAssignmentSnapshot,
} from '../caseInsert/presetAssignmentSnapshot.ts'
import { captureNormalizedProjectSnapshot } from '../lifecycle/canonicalProject.ts'
import {
  createBlankJewelCaseSavedProject,
} from '../project/caseInsertProjectAdapters.ts'
import {
  createEmbeddedProjectImageAssetProvenance,
} from '../project/projectAssetStatus.ts'
import type {
  ProjectCaseInsertImageSlot,
  ProjectJewelCaseState,
} from '../project/projectTypes.ts'
import {
  JEWEL_CASE_ESSENTIALS_CASE_PRESET_ID,
} from './builtins/jewelCaseEssentialsCasePreset.ts'
import {
  applyCaseInsertPresetFirstTime,
  createCaseInsertPresetApplyReviewApproval,
  createCaseInsertPresetMaterialConsentAcceptance,
  type CaseInsertPresetMaterialConsentAcceptance,
} from './caseInsertPresetApplyTransition.ts'
import {
  planCaseInsertPresetFirstApply,
  type CaseInsertPresetApplyPlanningResult,
  type CaseInsertPresetPlanArtworkViewportAction,
} from './caseInsertPresetApplyPlanning.ts'
import {
  resolveCaseInsertPresetAssignments,
} from './caseInsertPresetAssignmentResolution.ts'
import {
  applyCaseInsertPresetReviewedArtworkActions,
} from './caseInsertPresetArtworkActionTransition.ts'
import { CASE_INSERT_PRESET_CATALOG } from './caseInsertPresetCatalog.ts'
import {
  createCaseInsertPresetUnattachedEndpoint,
} from './caseInsertPresetAttachmentEndpoint.ts'

const SAMPLE_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+XMRdAAAAAElFTkSuQmCC'

type SuccessfulPlan = Extract<
  CaseInsertPresetApplyPlanningResult,
  Readonly<{ ok: true }>
>

type Fixture = Readonly<{
  aggregate: ProjectJewelCaseState
  planningResult: SuccessfulPlan
  plan: SuccessfulPlan['plan']
}>

function clone<T>(value: T): T {
  return structuredClone(value)
}

function createArtworkSlot(
  id: string,
  label: string,
  source = false,
): ProjectCaseInsertImageSlot {
  const slot = createDefaultCaseInsertImageSlot(id, label)
  slot.enabled = true
  slot.fit = 'contain'
  slot.layout = { x: -12, y: 34, scale: 0.73, rotation: 17 }
  slot.frame = {
    ...slot.frame,
    enabled: true,
    color: '#123456',
  }
  if (source) {
    slot.imageDataUrl = SAMPLE_IMAGE
    slot.imageSource = createEmbeddedProjectImageAssetProvenance(slot.label)
    slot.imageSize = { width: 1600, height: 900 }
  }
  return slot
}

function createFixture(
  mutate?: (aggregate: ProjectJewelCaseState) => void,
): Fixture {
  const project = createBlankJewelCaseSavedProject('Apply artwork fixture')
  mutate?.(project.caseInsert)
  const projectSnapshot = captureNormalizedProjectSnapshot(project)
  const snapshot = createCaseInsertPresetAssignmentSnapshot({
    sessionId: 'apply-artwork-session',
    projectRevision: 41,
    project: projectSnapshot,
  })
  assert.equal(snapshot.ok, true, snapshot.ok
    ? undefined
    : JSON.stringify(snapshot))
  if (!snapshot.ok) throw new Error(snapshot.error.code)
  const resolution = resolveCaseInsertPresetAssignments({
    catalog: CASE_INSERT_PRESET_CATALOG,
    reference: {
      id: JEWEL_CASE_ESSENTIALS_CASE_PRESET_ID,
      revision: 2,
    },
    requestedScope: { kind: 'region', region: 'back-panel' },
    snapshot: snapshot.value,
    expectedSnapshotIdentity: snapshot.value.identity,
  })
  assert.equal(resolution.ok, true, resolution.ok
    ? undefined
    : JSON.stringify(resolution))
  if (!resolution.ok) throw new Error(resolution.status)
  const planningResult = planCaseInsertPresetFirstApply({
    operation: 'apply',
    resolution,
    expected: {
      projectKind: 'caseInsert',
      preset: {
        id: resolution.value.preset.id,
        revision: resolution.value.preset.revision,
      },
      requestedScope: resolution.value.requestedScope,
      snapshotIdentity: resolution.value.snapshotIdentity,
    },
  })
  assert.equal(planningResult.ok, true, planningResult.ok
    ? undefined
    : JSON.stringify(planningResult))
  if (!planningResult.ok) throw new Error(planningResult.status)
  return {
    aggregate: clone(snapshot.value.caseInsert) as ProjectJewelCaseState,
    planningResult,
    plan: planningResult.plan,
  }
}

function applyFixture(
  fixture: Fixture,
  materialConsentAcceptances?: readonly CaseInsertPresetMaterialConsentAcceptance[],
) {
  const acceptances = fixture.plan.materialConsentRequirements.map(
    ({ id }) => createCaseInsertPresetMaterialConsentAcceptance(
      fixture.plan,
      id,
    ),
  )
  assert.equal(acceptances.every(Boolean), true)
  return applyCaseInsertPresetFirstTime({
    planningResult: fixture.planningResult,
    source: {
      projectKind: 'caseInsert',
      aggregate: fixture.aggregate,
      snapshotIdentity: fixture.plan.source.snapshotIdentity,
      preset: {
        id: fixture.plan.preset.id,
        revision: fixture.plan.preset.revision,
      },
      requestedScope: fixture.plan.requestedScope,
    },
    attachment: createCaseInsertPresetUnattachedEndpoint(),
    reviewApproval: createCaseInsertPresetApplyReviewApproval(fixture.plan),
    materialConsentAcceptances:
      materialConsentAcceptances ??
      (acceptances as CaseInsertPresetMaterialConsentAcceptance[]),
  })
}

function requireApplied(fixture: Fixture) {
  const result = applyFixture(fixture)
  assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result))
  if (!result.ok) throw new Error(`${result.status}:${result.code}`)
  return result
}

function viewportAction(
  fixture: Fixture,
  objectId: string,
): CaseInsertPresetPlanArtworkViewportAction {
  const action = fixture.plan.artworkViewportActions.find(
    ({ target }) => target.runtimeObjectId === objectId,
  )
  assert.ok(action)
  return action
}

test('revision 2 plans reviewed creation and deferred Cover evidence without mutation', () => {
  const fixture = createFixture()
  const before = clone(fixture.aggregate)

  assert.equal(fixture.plan.formatVersion, 3)
  assert.deepEqual(
    fixture.plan.assignments
      .filter(({ objectId }) => /^tray-artwork-[123]$/.test(objectId))
      .map(({ assignmentId }) => assignmentId),
    [
      'case:preset-assignment:back-screenshot-one',
      'case:preset-assignment:back-screenshot-three',
      'case:preset-assignment:back-screenshot-two',
    ],
  )
  assert.deepEqual(
    fixture.plan.objectCreationActions.map(
      ({ target }) => target.runtimeObjectId,
    ),
    ['tray-artwork-1', 'tray-artwork-2', 'tray-artwork-3'],
  )
  assert.deepEqual(
    fixture.plan.objectCreationActions.map(
      ({ canonicalInitialObject }) => canonicalInitialObject.label,
    ),
    ['Artwork 1', 'Artwork 2', 'Artwork 3'],
  )
  assert.deepEqual(
    fixture.plan.artworkViewportActions.map(
      ({ target }) => target.runtimeObjectId,
    ),
    ['tray-artwork-1', 'tray-artwork-2', 'tray-artwork-3'],
  )
  assert.equal(fixture.plan.warnings.filter(
    ({ kind }) => kind === 'artwork-cover-fitting-deferred',
  ).length, 3)
  assert.deepEqual(fixture.plan.materialConsentRequirements, [])
  for (const action of fixture.plan.artworkViewportActions) {
    assert.equal(action.targetOrigin, 'planned-creation')
    assert.deepEqual(action.sourceState, { status: 'absent' })
    assert.equal(action.evidence.status, 'deferred')
    assert.equal(action.evidence.plan.intent.declaration.mode, 'cover')
    assert.notEqual(
      action.evidence.plan.viewport.physicalAspectRatio,
      26 / 16,
    )
    assert.equal(action.proposedValues.layoutScale, 1)
    assert.equal(action.proposedValues.imageFit, 'cover')
    assert.deepEqual(
      action.proposedValues.reservedArtworkViewport?.focalPosition,
      { xPercent: 50, yPercent: 50 },
    )
  }
  assert.deepEqual(fixture.aggregate, before)
})

test('atomic Apply preserves custom order and appends canonical slots 1, 2, 3', () => {
  const fixture = createFixture((aggregate) => {
    aggregate.templates.tray.artworkSlots = [
      createArtworkSlot('custom-second', 'Second custom'),
      createArtworkSlot('custom-first', 'First custom'),
    ]
  })
  const sourceBefore = clone(fixture.aggregate)
  const result = requireApplied(fixture)
  const slots = result.aggregate.templates.tray.artworkSlots

  assert.deepEqual(slots.map(({ id }) => id), [
    'custom-second',
    'custom-first',
    'tray-artwork-1',
    'tray-artwork-2',
    'tray-artwork-3',
  ])
  assert.deepEqual(slots.slice(0, 2), sourceBefore.templates.tray.artworkSlots)
  assert.equal(
    result.aggregate.templates.tray.additionalArtworkEnabled,
    sourceBefore.templates.tray.additionalArtworkEnabled,
  )
  for (const [index, slot] of slots.slice(2).entries()) {
    assert.equal(slot.label, `Artwork ${index + 1}`)
    assert.equal(slot.enabled, false)
    assert.equal(slot.imageDataUrl, null)
    assert.equal(slot.imageSource, null)
    assert.equal(slot.imageSize, null)
    assert.equal(slot.defaultSteamLogo, null)
    assert.equal(slot.fit, 'cover')
    assert.deepEqual(slot.layout, {
      x: [17, 50, 83][index],
      y: 78,
      scale: 1,
      rotation: 0,
    })
    assert.deepEqual(slot.reservedArtworkViewport, {
      kind: 'sbls/case-insert-artwork-viewport',
      formatVersion: 1,
      templateId: 'jewelCase',
      templateRevision: null,
      coordinateBasis: 'backPanelSafe',
      widthPercent: 26,
      heightPercent: 16,
      focalPosition: { xPercent: 50, yPercent: 50 },
      zoom: 1,
    })
  }
  assert.equal(result.configurationCandidate.formatVersion, 2)
  assert.equal(result.successorConfiguration.formatVersion, 3)
  assert.equal(result.successorConfiguration.reapply, null)
  const screenshotFields = result.successorConfiguration.ownedFields.filter(
    ({ address }) => /^tray-artwork-[123]$/.test(address.bindingId),
  )
  assert.equal(screenshotFields.length, 18)
  for (const number of [1, 2, 3]) {
    assert.deepEqual(screenshotFields
      .filter(({ address }) => address.bindingId === `tray-artwork-${number}`)
      .map(({ address }) => address.fieldId)
      .sort(), [
      'image-fit',
      'layout-scale',
      'layout-x',
      'layout-y',
      'object-presence',
      'reserved-artwork-viewport',
    ])
  }
  assert.deepEqual(fixture.aggregate, sourceBefore)
  assert.equal(Object.isFrozen(result.aggregate), true)
})

test('present source produces exact clipping consent and preserves all unowned fields', () => {
  const fixture = createFixture((aggregate) => {
    aggregate.templates.tray.additionalArtworkEnabled = false
    aggregate.templates.tray.artworkSlots = [
      createArtworkSlot('tray-artwork-2', 'Custom two', true),
      createArtworkSlot('tray-artwork-1', 'Custom one', true),
      createArtworkSlot('tray-artwork-3', 'Custom three', true),
    ]
  })
  const sourceBefore = clone(fixture.aggregate)

  assert.deepEqual(fixture.plan.objectCreationActions, [])
  assert.equal(fixture.plan.artworkViewportActions.length, 3)
  assert.equal(fixture.plan.warnings.filter(
    ({ kind }) => kind === 'material-visible-clipping',
  ).length, 3)
  assert.equal(fixture.plan.materialConsentRequirements.filter(
    ({ kind }) => kind === 'material-visible-clipping',
  ).length, 3)
  for (const requirement of fixture.plan.materialConsentRequirements) {
    assert.equal(requirement.kind, 'material-visible-clipping')
    if (requirement.kind !== 'material-visible-clipping') continue
    assert.ok(fixture.plan.warnings.some(
      ({ id }) => id === requirement.warningId,
    ))
  }

  const blocked = applyFixture(fixture, [])
  assert.equal(blocked.ok, false)
  if (!blocked.ok) {
    assert.equal(blocked.status, 'consent-incomplete')
    assert.equal(blocked.code, 'material-consent-missing')
    assert.equal('aggregate' in blocked, false)
  }
  assert.deepEqual(fixture.aggregate, sourceBefore)

  const result = requireApplied(fixture)
  assert.deepEqual(
    result.aggregate.templates.tray.artworkSlots.map(({ id }) => id),
    ['tray-artwork-2', 'tray-artwork-1', 'tray-artwork-3'],
  )
  for (const slot of result.aggregate.templates.tray.artworkSlots) {
    const previous = sourceBefore.templates.tray.artworkSlots.find(
      ({ id }) => id === slot.id,
    )!
    assert.equal(slot.imageDataUrl, previous.imageDataUrl)
    assert.deepEqual(slot.imageSource, previous.imageSource)
    assert.deepEqual(slot.imageSize, previous.imageSize)
    assert.equal(slot.defaultSteamLogo, previous.defaultSteamLogo)
    assert.equal(slot.label, previous.label)
    assert.equal(slot.enabled, previous.enabled)
    assert.deepEqual(slot.frame, previous.frame)
    assert.equal(slot.layout.rotation, previous.layout.rotation)
    assert.equal(slot.fit, 'cover')
    assert.equal(slot.layout.scale, 1)
  }
  assert.deepEqual(fixture.aggregate, sourceBefore)
})

test('shared executor validates linkage, staleness, ambiguity, masks, and atomicity', () => {
  const fixture = createFixture((aggregate) => {
    aggregate.templates.tray.artworkSlots = [
      createArtworkSlot('tray-artwork-1', 'Keep one', true),
      createArtworkSlot('tray-artwork-2', 'Keep two', true),
      createArtworkSlot('tray-artwork-3', 'Keep three', true),
    ]
  })
  const sourceBefore = clone(fixture.aggregate)
  const one = viewportAction(fixture, 'tray-artwork-1')
  const two = viewportAction(fixture, 'tray-artwork-2')

  const masked = applyCaseInsertPresetReviewedArtworkActions({
    aggregate: fixture.aggregate,
    objectCreationActions: [],
    artworkViewportActions: [{ ...one, writeOwnedFieldIds: ['layout-x'] }],
  })
  assert.equal(masked.ok, true, masked.ok ? undefined : masked.code)
  if (!masked.ok) throw new Error(masked.code)
  const maskedOne = masked.aggregate.templates.tray.artworkSlots.find(
    ({ id }) => id === 'tray-artwork-1',
  )!
  const sourceOne = sourceBefore.templates.tray.artworkSlots.find(
    ({ id }) => id === 'tray-artwork-1',
  )!
  assert.equal(maskedOne.layout.x, one.proposedValues.layoutX)
  assert.equal(maskedOne.layout.y, sourceOne.layout.y)
  assert.equal(maskedOne.layout.scale, sourceOne.layout.scale)
  assert.equal(maskedOne.fit, sourceOne.fit)
  assert.deepEqual(
    maskedOne.reservedArtworkViewport,
    sourceOne.reservedArtworkViewport,
  )
  assert.equal(maskedOne.imageDataUrl, sourceOne.imageDataUrl)
  assert.deepEqual(maskedOne.frame, sourceOne.frame)

  const staleAggregate = clone(fixture.aggregate)
  staleAggregate.templates.tray.artworkSlots[0]!.imageDataUrl += ':changed'
  const stale = applyCaseInsertPresetReviewedArtworkActions({
    aggregate: staleAggregate,
    objectCreationActions: [],
    artworkViewportActions: [one],
  })
  assert.deepEqual(stale, {
    ok: false,
    status: 'precondition-failed',
    code: 'preset-artwork-viewport-source-changed',
    actionId: one.id,
  })

  const ambiguousAggregate = clone(fixture.aggregate)
  ambiguousAggregate.templates.tray.artworkSlots.push(
    clone(ambiguousAggregate.templates.tray.artworkSlots[0]!),
  )
  const ambiguous = applyCaseInsertPresetReviewedArtworkActions({
    aggregate: ambiguousAggregate,
    objectCreationActions: [],
    artworkViewportActions: [one],
  })
  assert.equal(ambiguous.ok, false)
  if (!ambiguous.ok) assert.equal(ambiguous.status, 'target-ambiguous')

  const missingAggregate = clone(fixture.aggregate)
  missingAggregate.templates.tray.artworkSlots =
    missingAggregate.templates.tray.artworkSlots.filter(
      ({ id }) => id !== 'tray-artwork-1',
    )
  const missing = applyCaseInsertPresetReviewedArtworkActions({
    aggregate: missingAggregate,
    objectCreationActions: [],
    artworkViewportActions: [one],
  })
  assert.equal(missing.ok, false)
  if (!missing.ok) assert.equal(missing.status, 'target-missing')

  const lateFailureAggregate = clone(fixture.aggregate)
  lateFailureAggregate.templates.tray.artworkSlots.find(
    ({ id }) => id === 'tray-artwork-2',
  )!.imageDataUrl += ':changed'
  const lateFailureBefore = clone(lateFailureAggregate)
  const lateFailure = applyCaseInsertPresetReviewedArtworkActions({
    aggregate: lateFailureAggregate,
    objectCreationActions: [],
    artworkViewportActions: [one, two],
  })
  assert.equal(lateFailure.ok, false)
  assert.deepEqual(lateFailureAggregate, lateFailureBefore)
  assert.equal('aggregate' in lateFailure, false)

  const badLinkage = applyCaseInsertPresetReviewedArtworkActions({
    aggregate: fixture.aggregate,
    objectCreationActions: [],
    artworkViewportActions: [{ ...one, targetOrigin: 'planned-creation' }],
  })
  assert.deepEqual(badLinkage, {
    ok: false,
    status: 'invalid-action',
    code: 'preset-artwork-action-linkage-invalid',
  })
  assert.deepEqual(fixture.aggregate, sourceBefore)
})

test('one invalid reviewed creation blocks every slot and viewport mutation', () => {
  const fixture = createFixture((aggregate) => {
    aggregate.templates.tray.artworkSlots = [
      createArtworkSlot('custom-existing', 'Existing custom artwork', true),
    ]
  })
  const sourceBefore = clone(fixture.aggregate)
  const forgedCreations = clone(fixture.plan.objectCreationActions)
  forgedCreations[1]!.canonicalInitialObject.label =
    'Noncanonical hostile label'

  const result = applyCaseInsertPresetReviewedArtworkActions({
    aggregate: fixture.aggregate,
    objectCreationActions: forgedCreations,
    artworkViewportActions: fixture.plan.artworkViewportActions,
  })

  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.equal(result.status, 'invalid-action')
    assert.equal(result.code, 'preset-artwork-creation-action-invalid')
    assert.equal(result.actionId, forgedCreations[1]!.id)
    assert.equal('aggregate' in result, false)
  }
  assert.deepEqual(fixture.aggregate, sourceBefore)
  assert.deepEqual(
    fixture.aggregate.templates.tray.artworkSlots.map(({ id }) => id),
    ['custom-existing'],
  )
  assert.deepEqual(
    fixture.aggregate.templates.tray.artworkSlots[0]!.layout,
    sourceBefore.templates.tray.artworkSlots[0]!.layout,
  )
})

test('reviewed Apply is deterministic and a stale source never returns partial output', () => {
  const fixture = createFixture()
  const sourceBefore = clone(fixture.aggregate)
  const first = requireApplied(fixture)
  const second = requireApplied(fixture)
  assert.deepEqual(first, second)
  assert.deepEqual(fixture.aggregate, sourceBefore)

  const staleAggregate = clone(fixture.aggregate)
  staleAggregate.templates.tray.background.layout.x += 1
  const stale = applyCaseInsertPresetFirstTime({
    planningResult: fixture.planningResult,
    source: {
      projectKind: 'caseInsert',
      aggregate: staleAggregate,
      snapshotIdentity: fixture.plan.source.snapshotIdentity,
      preset: {
        id: fixture.plan.preset.id,
        revision: fixture.plan.preset.revision,
      },
      requestedScope: fixture.plan.requestedScope,
    },
    attachment: createCaseInsertPresetUnattachedEndpoint(),
    reviewApproval: createCaseInsertPresetApplyReviewApproval(fixture.plan),
    materialConsentAcceptances: [],
  })
  assert.equal(stale.ok, false)
  if (!stale.ok) assert.equal(stale.status, 'invalid-source-aggregate')
  assert.equal('aggregate' in stale, false)
  assert.deepEqual(fixture.aggregate, sourceBefore)
})
