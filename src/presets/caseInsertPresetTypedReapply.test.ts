import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createCaseInsertPresetAssignmentSnapshot,
  type CaseInsertPresetAssignmentSnapshot,
} from '../caseInsert/presetAssignmentSnapshot.ts'
import { captureNormalizedProjectSnapshot } from '../lifecycle/canonicalProject.ts'
import { createBlankJewelCaseSavedProject } from '../project/caseInsertProjectAdapters.ts'
import { createProjectImageAssetProvenance } from '../project/projectAssetStatus.ts'
import type { ProjectJewelCaseState } from '../project/projectTypes.ts'
import {
  JEWEL_CASE_ESSENTIALS_CASE_PRESET,
  JEWEL_CASE_ESSENTIALS_CASE_PRESET_ID,
} from './builtins/jewelCaseEssentialsCasePreset.ts'
import {
  JEWEL_CASE_ESSENTIALS_CASE_PRESET_V2,
} from './builtins/jewelCaseEssentialsCasePresetV2.ts'
import type {
  CaseInsertPresetApplicationScope,
} from './caseInsertPresetDefinition.ts'
import {
  detectCaseInsertPresetCustomization,
  type CaseInsertPresetTypedCustomizationFieldRecord,
  type CaseInsertViewportAppliedPresetConfiguration,
} from './caseInsertPresetAppliedConfiguration.ts'
import {
  applyCaseInsertPresetFirstTime,
  createCaseInsertPresetApplyReviewApproval,
  createCaseInsertPresetMaterialConsentAcceptance,
  type CaseInsertPresetMaterialConsentAcceptance,
} from './caseInsertPresetApplyTransition.ts'
import {
  planCaseInsertPresetFirstApply,
  type CaseInsertPresetApplyPlanningResult,
} from './caseInsertPresetApplyPlanning.ts'
import {
  resolveCaseInsertPresetAssignments,
} from './caseInsertPresetAssignmentResolution.ts'
import { CASE_INSERT_PRESET_CATALOG } from './caseInsertPresetCatalog.ts'
import {
  createCaseInsertPresetUnattachedEndpoint,
} from './caseInsertPresetAttachmentEndpoint.ts'
import {
  planCaseInsertPresetDetach,
} from './caseInsertPresetDetachPlanning.ts'
import {
  createCaseInsertPresetDetachReviewAcceptance,
  transitionCaseInsertPresetDetach,
} from './caseInsertPresetDetachTransition.ts'
import {
  planCaseInsertPresetReapply,
  type CaseInsertPresetTypedCustomizedFieldPolicyRecord,
  type CaseInsertPresetTypedReapplyPlan,
} from './caseInsertPresetReapplyPlanning.ts'
import {
  createCaseInsertPresetTypedReapplyPlanIdentity,
  createCaseInsertPresetTypedReapplyReviewIdentity,
} from './caseInsertPresetTypedReapplyPlanning.ts'
import {
  createCaseInsertPresetReapplyConsentAcceptance,
  createCaseInsertPresetReapplyReviewAcceptance,
  transitionCaseInsertPresetReapply,
} from './caseInsertPresetReapplyTransition.ts'

type SuccessfulApplyPlan = Extract<
  CaseInsertPresetApplyPlanningResult,
  { ok: true }
>

type DeepMutable<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer Item)[]
    ? DeepMutable<Item>[]
    : T extends object
      ? { -readonly [Key in keyof T]: DeepMutable<T[Key]> }
      : T

const SESSION_ID = 'typed-reapply-session'

function clone<T>(value: T): T {
  return structuredClone(value)
}

function snapshotFor(
  aggregate: Readonly<ProjectJewelCaseState>,
  revision: number,
): CaseInsertPresetAssignmentSnapshot {
  const project = createBlankJewelCaseSavedProject('Typed Reapply fixture')
  project.caseInsert = clone(aggregate)
  const normalized = captureNormalizedProjectSnapshot(project)
  const result = createCaseInsertPresetAssignmentSnapshot({
    sessionId: SESSION_ID,
    projectRevision: revision,
    project: normalized,
  })
  assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result))
  if (!result.ok) throw new Error(result.error.code)
  return result.value
}

function applyRevision2(
  requestedScope: CaseInsertPresetApplicationScope = {
    kind: 'region',
    region: 'back-panel',
  },
) {
  const project = createBlankJewelCaseSavedProject('Typed Reapply fixture')
  const normalized = captureNormalizedProjectSnapshot(project)
  const snapshot = createCaseInsertPresetAssignmentSnapshot({
    sessionId: SESSION_ID,
    projectRevision: 41,
    project: normalized,
  })
  assert.equal(snapshot.ok, true)
  if (!snapshot.ok) throw new Error(snapshot.error.code)
  const resolution = resolveCaseInsertPresetAssignments({
    catalog: CASE_INSERT_PRESET_CATALOG,
    reference: {
      id: JEWEL_CASE_ESSENTIALS_CASE_PRESET_ID,
      revision: 2,
    },
    requestedScope,
    snapshot: snapshot.value,
    expectedSnapshotIdentity: snapshot.value.identity,
  })
  assert.equal(resolution.ok, true)
  if (!resolution.ok) throw new Error(resolution.status)
  const planning = planCaseInsertPresetFirstApply({
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
  assert.equal(planning.ok, true)
  if (!planning.ok) throw new Error(planning.status)
  const successfulPlanning = planning as SuccessfulApplyPlan
  const acceptances = successfulPlanning.plan.materialConsentRequirements.map(
    ({ id }) => createCaseInsertPresetMaterialConsentAcceptance(
      successfulPlanning.plan,
      id,
    ),
  )
  assert.equal(acceptances.every(Boolean), true)
  const applied = applyCaseInsertPresetFirstTime({
    planningResult: successfulPlanning,
    source: {
      projectKind: 'caseInsert',
      aggregate: snapshot.value.caseInsert,
      snapshotIdentity: successfulPlanning.plan.source.snapshotIdentity,
      preset: {
        id: successfulPlanning.plan.preset.id,
        revision: successfulPlanning.plan.preset.revision,
      },
      requestedScope: successfulPlanning.plan.requestedScope,
    },
    attachment: createCaseInsertPresetUnattachedEndpoint(),
    reviewApproval: createCaseInsertPresetApplyReviewApproval(
      successfulPlanning.plan,
    ),
    materialConsentAcceptances:
      acceptances as CaseInsertPresetMaterialConsentAcceptance[],
  })
  assert.equal(applied.ok, true, applied.ok ? undefined : JSON.stringify(applied))
  if (!applied.ok) throw new Error(`${applied.status}:${applied.code}`)
  assert.equal(applied.successorConfiguration.formatVersion, 3)
  return {
    aggregate: applied.aggregate,
    configuration: applied.successorConfiguration as
      CaseInsertViewportAppliedPresetConfiguration,
  }
}

function reportFor(
  aggregate: Readonly<ProjectJewelCaseState>,
  configuration: CaseInsertViewportAppliedPresetConfiguration,
  revision: number,
) {
  const report = detectCaseInsertPresetCustomization({
    configuration,
    current: {
      projectKind: 'caseInsert',
      aggregate: clone(aggregate),
      sessionId: SESSION_ID,
      projectRevision: revision,
      template: { id: 'jewelCase', revision: null },
    },
  })
  assert.equal(report.ok, true, report.ok ? undefined : JSON.stringify(report))
  if (!report.ok || report.formatVersion !== 2) {
    throw new Error(report.ok ? 'report-version' : report.code)
  }
  return report
}

function objectAbsentPolicy(
  report: ReturnType<typeof reportFor>,
  configuration: CaseInsertViewportAppliedPresetConfiguration,
  objectId: string,
  policy: CaseInsertPresetTypedCustomizedFieldPolicyRecord['policy'],
) {
  const field = report.fields.find(({ address }) =>
    address.runtimeObjectId === objectId &&
    address.fieldId === 'object-presence')
  assert.ok(field)
  assert.equal(field.fieldStatus, 'object-absent')
  return {
    configurationIdentity: configuration.configurationIdentity,
    customizationReportIdentity: report.reportIdentity,
    address: field.address,
    lastAppliedValue: field.lastAppliedValue,
    observation: field.observation,
    selectedPreset: {
      id: configuration.preset.id,
      revision: configuration.preset.revision,
    },
    policy,
  } satisfies CaseInsertPresetTypedCustomizedFieldPolicyRecord
}

function customizedFieldPolicy(
  report: ReturnType<typeof reportFor>,
  configuration: CaseInsertViewportAppliedPresetConfiguration,
  field: CaseInsertPresetTypedCustomizationFieldRecord,
  policy: CaseInsertPresetTypedCustomizedFieldPolicyRecord['policy'],
) {
  assert.equal(field.fieldStatus, 'value-diverged')
  return {
    configurationIdentity: configuration.configurationIdentity,
    customizationReportIdentity: report.reportIdentity,
    address: field.address,
    lastAppliedValue: field.lastAppliedValue,
    observation: field.observation,
    selectedPreset: {
      id: configuration.preset.id,
      revision: configuration.preset.revision,
    },
    policy,
  } satisfies CaseInsertPresetTypedCustomizedFieldPolicyRecord
}

function reidentifyTypedPlan(
  plan: CaseInsertPresetTypedReapplyPlan,
  mutate: (draft: DeepMutable<CaseInsertPresetTypedReapplyPlan>) => void,
) {
  const draft = clone(plan) as DeepMutable<CaseInsertPresetTypedReapplyPlan>
  mutate(draft)
  const content = Object.fromEntries(Object.entries(draft).filter(([key]) =>
    key !== 'reviewIdentity')) as Omit<
      CaseInsertPresetTypedReapplyPlan,
      'reviewIdentity'
    >
  draft.reviewIdentity = createCaseInsertPresetTypedReapplyReviewIdentity(
    content,
  )
  return draft as CaseInsertPresetTypedReapplyPlan
}

function planTypedReapply(input: Readonly<{
  aggregate: Readonly<ProjectJewelCaseState>
  configuration: CaseInsertViewportAppliedPresetConfiguration
  revision: number
  policies?: readonly CaseInsertPresetTypedCustomizedFieldPolicyRecord[]
}>) {
  const snapshot = snapshotFor(input.aggregate, input.revision)
  const report = reportFor(
    input.aggregate,
    input.configuration,
    input.revision,
  )
  const result = planCaseInsertPresetReapply({
    operation: 'reapply',
    configuration: input.configuration,
    customizationReport: report,
    current: {
      projectKind: 'caseInsert',
      aggregate: clone(input.aggregate),
      sessionId: SESSION_ID,
      projectRevision: input.revision,
      template: { id: 'jewelCase', revision: null },
      snapshot,
    },
    selectedDefinition: JEWEL_CASE_ESSENTIALS_CASE_PRESET_V2,
    customizedFieldPolicies: input.policies ?? [],
  })
  assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result))
  if (!result.ok || result.plan.formatVersion !== 3) {
    throw new Error(result.ok ? 'plan-version' : result.code)
  }
  return { report, plan: result.plan }
}

function transitionTyped(input: Readonly<{
  aggregate: Readonly<ProjectJewelCaseState>
  configuration: CaseInsertViewportAppliedPresetConfiguration
  revision: number
  report: ReturnType<typeof reportFor>
  plan: CaseInsertPresetTypedReapplyPlan
}>) {
  const reviewAcceptance = createCaseInsertPresetReapplyReviewAcceptance(
    input.plan,
  )
  const materialConsentAcceptances = input.plan.materialConsentRequirements
    .map(({ id }) => createCaseInsertPresetReapplyConsentAcceptance(
      input.plan,
      id,
    ))
  assert.equal(materialConsentAcceptances.every(Boolean), true)
  return transitionCaseInsertPresetReapply({
    operation: 'reapply',
    plan: input.plan,
    sourceConfiguration: input.configuration,
    customizationReport: input.report,
    reviewAcceptance,
    materialConsentAcceptances: materialConsentAcceptances.filter(
      (value): value is NonNullable<typeof value> => value !== null,
    ),
    current: {
      projectKind: 'caseInsert',
      aggregate: clone(input.aggregate),
      sessionId: SESSION_ID,
      projectRevision: input.revision,
      template: { id: 'jewelCase', revision: null },
    },
  })
}

function withoutSlot(
  aggregate: Readonly<ProjectJewelCaseState>,
  objectId: string,
) {
  const next = clone(aggregate)
  next.templates.tray.artworkSlots = next.templates.tray.artworkSlots.filter(
    ({ id }) => id !== objectId,
  )
  return next
}

test('revision 2 Apply owns each created slot presence, exact layout, fit, and viewport values', () => {
  const applied = applyRevision2()
  const expected = new Map([
    ['tray-artwork-1', { x: 17, y: 78 }],
    ['tray-artwork-2', { x: 50, y: 78 }],
    ['tray-artwork-3', { x: 83, y: 78 }],
  ])
  for (const [runtimeObjectId, layout] of expected) {
    const fields = applied.configuration.ownedFields.filter(({ address }) =>
      address.runtimeObjectId === runtimeObjectId)
    assert.equal(fields.length, 6)
    const byId = new Map(fields.map((field) => [field.address.fieldId, field]))
    assert.deepEqual(byId.get('object-presence')?.lastAppliedValue, {
      kind: 'object-presence', value: 'present',
    })
    assert.deepEqual(byId.get('layout-x')?.lastAppliedValue, {
      kind: 'layout-number', value: layout.x,
    })
    assert.deepEqual(byId.get('layout-y')?.lastAppliedValue, {
      kind: 'layout-number', value: layout.y,
    })
    assert.deepEqual(byId.get('layout-scale')?.lastAppliedValue, {
      kind: 'layout-number', value: 1,
    })
    assert.deepEqual(byId.get('image-fit')?.lastAppliedValue, {
      kind: 'image-fit', value: 'cover',
    })
    assert.deepEqual(
      byId.get('reserved-artwork-viewport')?.lastAppliedValue,
      {
        kind: 'reserved-artwork-viewport',
        value: {
          kind: 'sbls/case-insert-artwork-viewport',
          formatVersion: 1,
          templateId: 'jewelCase',
          templateRevision: null,
          coordinateBasis: 'backPanelSafe',
          widthPercent: 26,
          heightPercent: 16,
          focalPosition: { xPercent: 50, yPercent: 50 },
          zoom: 1,
        },
      },
    )
    assert.equal(
      byId.get('object-presence')?.sources[0]?.declaredPolicy,
      'create-empty-repeated-artwork-slot-v1',
    )
    for (const fieldId of [
      'layout-x',
      'layout-y',
      'layout-scale',
      'image-fit',
      'reserved-artwork-viewport',
    ] as const) {
      assert.equal(
        byId.get(fieldId)?.sources[0]?.declaredPolicy,
        'reserved-artwork-viewport-v1',
      )
    }
  }
})

test('typed Reapply is an exact-revision semantic no-op on the clean baseline', () => {
  const applied = applyRevision2()
  const planned = planTypedReapply({ ...applied, revision: 42 })
  assert.deepEqual(planned.plan.objectCreationActions, [])
  assert.equal(planned.plan.artworkViewportActions.length, 3)
  assert.equal(planned.plan.artworkViewportActions.every((action) =>
    action.writeOwnedFieldIds.length === 0), true)
  assert.deepEqual(planned.plan.aggregateWrites, [])

  const result = transitionTyped({ ...applied, ...planned, revision: 42 })
  assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result))
  if (!result.ok) return
  assert.equal(result.status, 'reapplied-aggregate-semantic-no-op')
  assert.deepEqual(result.aggregate, applied.aggregate)
  assert.equal(result.nextConfiguration.formatVersion, 3)
  assert.notEqual(
    result.nextConfiguration.configurationIdentity,
    applied.configuration.configurationIdentity,
  )
})

test('typed Reapply reviews populated unowned artwork evidence without writing owned fields', () => {
  const applied = applyRevision2()
  const aggregate = clone(applied.aggregate)
  const slot = aggregate.templates.tray.artworkSlots.find(({ id }) =>
    id === 'tray-artwork-1')!
  slot.imageDataUrl = 'data:image/png;base64,dW5vd25lZC1hcnR3b3Jr'
  slot.imageSize = { width: 1600, height: 200 }
  slot.imageSource = createProjectImageAssetProvenance({
    source: 'uploaded',
    sourceLabel: 'wide-unowned-screenshot.png',
  })
  slot.label = 'User screenshot label'
  slot.enabled = true
  slot.frame = {
    ...slot.frame,
    enabled: true,
    color: '#123456',
  }

  const report = reportFor(aggregate, applied.configuration, 420)
  assert.equal(report.status, 'clean')
  const planned = planTypedReapply({
    aggregate,
    configuration: applied.configuration,
    revision: 420,
  })
  assert.deepEqual(planned.plan.aggregateWrites, [])
  const reviewedAction = planned.plan.artworkViewportActions.find(
    ({ target }) => target.runtimeObjectId === slot.id,
  )
  assert.ok(reviewedAction)
  assert.deepEqual(reviewedAction.writeOwnedFieldIds, [])
  const clippingWarning = planned.plan.warnings.find(({ kind }) =>
    kind === 'material-visible-clipping')
  const clippingRequirement = planned.plan.materialConsentRequirements.find(
    ({ kind }) => kind === 'material-visible-clipping',
  )
  assert.ok(clippingWarning)
  assert.ok(clippingRequirement)
  assert.equal(reviewedAction.evidence.plan.warnings.some(({ id }) =>
    id === clippingWarning.id), true)
  assert.equal(reviewedAction.evidence.plan.materialConsentRequirements.some(
    ({ id }) => id === clippingRequirement.id,
  ), true)

  const result = transitionTyped({
    aggregate,
    configuration: applied.configuration,
    revision: 420,
    ...planned,
  })
  assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result))
  if (!result.ok) return
  assert.equal(result.status, 'reapplied-aggregate-semantic-no-op')
  assert.deepEqual(result.aggregate, aggregate)
})

test('typed Reapply binds current x/y/scale/fit/viewport evidence and exact consent identities', () => {
  const applied = applyRevision2()
  const aggregate = clone(applied.aggregate)
  const slot = aggregate.templates.tray.artworkSlots.find(({ id }) =>
    id === 'tray-artwork-1')
  assert.ok(slot)
  assert.ok(slot.reservedArtworkViewport)
  slot.layout.x = 21
  slot.layout.y = 73
  slot.layout.scale = 1.25
  slot.fit = 'contain'
  slot.reservedArtworkViewport = {
    ...slot.reservedArtworkViewport,
    focalPosition: { xPercent: 42, yPercent: 61 },
    zoom: 1.4,
  }
  const report = reportFor(aggregate, applied.configuration, 421)
  const customized = report.fields.filter(({ address, fieldStatus }) =>
    address.runtimeObjectId === 'tray-artwork-1' &&
    fieldStatus === 'value-diverged')
  assert.deepEqual(
    customized.map(({ address }) => address.fieldId),
    [
      'layout-x',
      'layout-y',
      'layout-scale',
      'image-fit',
      'reserved-artwork-viewport',
    ],
  )
  const observations = new Map(customized.map((field) => [
    field.address.fieldId,
    field.observation,
  ]))
  assert.deepEqual(observations.get('layout-x'), {
    status: 'present', value: { kind: 'layout-number', value: 21 },
  })
  assert.deepEqual(observations.get('layout-y'), {
    status: 'present', value: { kind: 'layout-number', value: 73 },
  })
  assert.deepEqual(observations.get('layout-scale'), {
    status: 'present', value: { kind: 'layout-number', value: 1.25 },
  })
  assert.deepEqual(observations.get('image-fit'), {
    status: 'present', value: { kind: 'image-fit', value: 'contain' },
  })
  assert.deepEqual(observations.get('reserved-artwork-viewport'), {
    status: 'present',
    value: {
      kind: 'reserved-artwork-viewport',
      value: slot.reservedArtworkViewport,
    },
  })
  const planned = planTypedReapply({
    aggregate,
    configuration: applied.configuration,
    revision: 421,
    policies: customized.map((field) => customizedFieldPolicy(
      report,
      applied.configuration,
      field,
      'overwrite-with-selected-preset',
    )),
  })
  assert.equal(planned.plan.artworkViewportActions.length, 3)
  const selectedAction = planned.plan.artworkViewportActions.find(
    ({ target }) => target.runtimeObjectId === slot.id,
  )
  assert.ok(selectedAction)
  assert.deepEqual(selectedAction.currentValues, {
    layoutX: 21,
    layoutY: 73,
    layoutScale: 1.25,
    imageFit: 'contain',
    reservedArtworkViewport: slot.reservedArtworkViewport,
  })
  assert.deepEqual(selectedAction.proposedValues, {
    layoutX: 17,
    layoutY: 78,
    layoutScale: 1,
    imageFit: 'cover',
    reservedArtworkViewport: {
      kind: 'sbls/case-insert-artwork-viewport',
      formatVersion: 1,
      templateId: 'jewelCase',
      templateRevision: null,
      coordinateBasis: 'backPanelSafe',
      widthPercent: 26,
      heightPercent: 16,
      focalPosition: { xPercent: 50, yPercent: 50 },
      zoom: 1,
    },
  })
  assert.equal(
    planned.plan.materialConsentRequirements.filter(({ kind }) =>
      kind === 'overwrite-customized-owned-field').length,
    5,
  )
  assert.equal(planned.plan.materialConsentRequirements.every(({ id }) =>
    id.startsWith('case:preset-reapply-requirement:v2:')), true)
  for (const warning of planned.plan.warnings.filter(({ evidence }) =>
    typeof evidence.id === 'string')) {
    assert.equal(warning.id, warning.evidence.id)
  }
  const result = transitionTyped({
    aggregate,
    configuration: applied.configuration,
    revision: 421,
    ...planned,
  })
  assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result))
  if (!result.ok) return
  assert.equal(reportFor(
    result.aggregate,
    result.nextConfiguration,
    422,
  ).status, 'clean')
})

test('deleted owned screenshot reports one actionable absence and Overwrite recreates it atomically', () => {
  const applied = applyRevision2()
  const aggregate = withoutSlot(applied.aggregate, 'tray-artwork-1')
  const initialReport = reportFor(aggregate, applied.configuration, 43)
  assert.equal(initialReport.fields.filter(({ fieldStatus }) =>
    fieldStatus === 'object-absent').length, 1)
  assert.equal(initialReport.fields.filter(({ fieldStatus }) =>
    fieldStatus === 'target-unavailable').length, 5)
  assert.equal(initialReport.summary.customizedFieldCount, 1)
  assert.equal(initialReport.summary.unavailableFieldCount, 5)
  const policy = objectAbsentPolicy(
    initialReport,
    applied.configuration,
    'tray-artwork-1',
    'overwrite-with-selected-preset',
  )
  const planned = planTypedReapply({
    aggregate,
    configuration: applied.configuration,
    revision: 43,
    policies: [policy],
  })
  assert.equal(planned.plan.objectCreationActions.length, 1)
  assert.deepEqual(
    planned.plan.objectCreationActions[0]?.target.runtimeObjectId,
    'tray-artwork-1',
  )
  assert.deepEqual(
    planned.plan.artworkViewportActions[0]?.writeOwnedFieldIds,
    [
      'layout-x',
      'layout-y',
      'layout-scale',
      'image-fit',
      'reserved-artwork-viewport',
    ],
  )
  const result = transitionTyped({
    aggregate,
    configuration: applied.configuration,
    revision: 43,
    ...planned,
  })
  assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result))
  if (!result.ok) return
  assert.ok(result.aggregate.templates.tray.artworkSlots.some(({ id }) =>
    id === 'tray-artwork-1'))
  assert.equal(reportFor(
    result.aggregate,
    result.nextConfiguration as CaseInsertViewportAppliedPresetConfiguration,
    44,
  ).status, 'clean')
})

test('deleted owned screenshot Preserve retains complete ownership and performs zero writes', () => {
  const applied = applyRevision2()
  const aggregate = withoutSlot(applied.aggregate, 'tray-artwork-2')
  const report = reportFor(aggregate, applied.configuration, 45)
  const policy = objectAbsentPolicy(
    report,
    applied.configuration,
    'tray-artwork-2',
    'preserve-current-customization',
  )
  const planned = planTypedReapply({
    aggregate,
    configuration: applied.configuration,
    revision: 45,
    policies: [policy],
  })
  assert.deepEqual(planned.plan.objectCreationActions, [])
  assert.equal(planned.plan.artworkViewportActions.length, 2)
  assert.equal(planned.plan.artworkViewportActions.every((action) =>
    action.target.runtimeObjectId !== 'tray-artwork-2' &&
    action.writeOwnedFieldIds.length === 0), true)
  assert.equal(planned.plan.warnings.some((warning) =>
    warning.kind === 'artwork-cover-fitting-deferred' &&
    warning.evidence.assignmentId ===
      'case:preset-assignment:back-screenshot-two'), false)
  assert.deepEqual(planned.plan.aggregateWrites, [])
  const result = transitionTyped({
    aggregate,
    configuration: applied.configuration,
    revision: 45,
    ...planned,
  })
  assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result))
  if (!result.ok) return
  assert.deepEqual(result.aggregate, aggregate)
  assert.equal(result.nextConfiguration.ownedFields.length,
    applied.configuration.ownedFields.length)
  const nextReport = reportFor(
    result.aggregate,
    result.nextConfiguration as CaseInsertViewportAppliedPresetConfiguration,
    46,
  )
  assert.equal(nextReport.status, 'customized')
  assert.equal(nextReport.summary.customizedFieldCount, 1)
})

test('typed Detach releases missing-object ownership with an exact zero-write aggregate', () => {
  const applied = applyRevision2()
  const aggregate = withoutSlot(applied.aggregate, 'tray-artwork-3')
  const snapshot = snapshotFor(aggregate, 47)
  const planned = planCaseInsertPresetDetach({
    operation: 'detach',
    configuration: applied.configuration,
    current: {
      projectKind: 'caseInsert',
      aggregate,
      sessionId: SESSION_ID,
      projectRevision: 47,
      template: { id: 'jewelCase', revision: null },
      snapshot,
    },
  })
  assert.equal(planned.ok, true, planned.ok ? undefined : JSON.stringify(planned))
  if (!planned.ok) return
  assert.equal(planned.plan.formatVersion, 3)
  const result = transitionCaseInsertPresetDetach({
    operation: 'detach',
    plan: planned.plan,
    sourceConfiguration: applied.configuration,
    reviewAcceptance: createCaseInsertPresetDetachReviewAcceptance(
      planned.plan,
    ),
    materialConsentAcceptances: [],
    current: {
      projectKind: 'caseInsert',
      aggregate,
      sessionId: SESSION_ID,
      projectRevision: 47,
      template: { id: 'jewelCase', revision: null },
      snapshot,
    },
  })
  assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result))
  if (!result.ok) return
  assert.deepEqual(result.aggregate, aggregate)
  assert.equal(result.releaseResult.proof.aggregateWriteCount, 0)
  assert.equal(result.releaseResult.proof.preservesEveryAggregateValue, true)
})

test('typed Reapply identity canonicalizes every order-insensitive collection', () => {
  const applied = applyRevision2()
  const planned = planTypedReapply({ ...applied, revision: 48 }).plan
  const content = Object.fromEntries(Object.entries(clone(planned)).filter(
    ([key]) => key !== 'reviewIdentity',
  )) as Omit<CaseInsertPresetTypedReapplyPlan, 'reviewIdentity'>
  const permuted = clone(content)
  permuted.resolvedAssignments.reverse()
  permuted.selectedFootprint.reverse()
  permuted.fieldEffects.reverse()
  permuted.projectedConfiguration.ownedFields.reverse()
  permuted.preconditions.fields.reverse()
  for (const field of permuted.selectedFootprint) field.sources.reverse()
  for (const field of permuted.projectedConfiguration.ownedFields) {
    field.sources.reverse()
  }
  const reviewIdentity = createCaseInsertPresetTypedReapplyReviewIdentity(
    permuted,
  )
  assert.equal(reviewIdentity, planned.reviewIdentity)
  assert.equal(createCaseInsertPresetTypedReapplyPlanIdentity({
    ...permuted,
    reviewIdentity,
  }), createCaseInsertPresetTypedReapplyPlanIdentity(planned))
})

test('typed report rejects unavailable dependent fields without owned absent presence evidence', () => {
  const applied = applyRevision2()
  const aggregate = withoutSlot(applied.aggregate, 'tray-artwork-1')
  const report = reportFor(aggregate, applied.configuration, 49)
  const presence = report.fields.find(({ address }) =>
    address.runtimeObjectId === 'tray-artwork-1' &&
    address.fieldId === 'object-presence') as
    CaseInsertPresetTypedCustomizationFieldRecord
  const forged = clone(report)
  forged.fields = forged.fields.filter((field) => field !== presence)
  forged.summary.fieldCount -= 1
  forged.summary.customizedFieldCount -= 1
  assert.equal(forged.fields.some(({ fieldStatus }) =>
    fieldStatus === 'target-unavailable'), true)
  // The public planner validates the report before policy evaluation and must
  // reject the forged cross-field relationship regardless of its stale identity.
  const snapshot = snapshotFor(aggregate, 49)
  const result = planCaseInsertPresetReapply({
    operation: 'reapply',
    configuration: applied.configuration,
    customizationReport: Object.freeze(forged),
    current: {
      projectKind: 'caseInsert',
      aggregate,
      sessionId: SESSION_ID,
      projectRevision: 49,
      template: { id: 'jewelCase', revision: null },
      snapshot,
    },
    selectedDefinition: JEWEL_CASE_ESSENTIALS_CASE_PRESET_V2,
    customizedFieldPolicies: [],
  })
  assert.equal(result.ok, false)
})

test('typed Reapply rejects a different selected revision in planning and after self-reidentification', () => {
  const applied = applyRevision2()
  const revision = 495
  const snapshot = snapshotFor(applied.aggregate, revision)
  const report = reportFor(applied.aggregate, applied.configuration, revision)
  const planned = planCaseInsertPresetReapply({
    operation: 'reapply',
    configuration: applied.configuration,
    customizationReport: report,
    current: {
      projectKind: 'caseInsert',
      aggregate: clone(applied.aggregate),
      sessionId: SESSION_ID,
      projectRevision: revision,
      template: { id: 'jewelCase', revision: null },
      snapshot,
    },
    selectedDefinition: JEWEL_CASE_ESSENTIALS_CASE_PRESET,
    customizedFieldPolicies: [],
  })
  assert.equal(planned.ok, false)
  if (!planned.ok) {
    assert.equal(planned.status, 'incompatible-selected-definition')
    assert.equal(
      planned.code,
      'typed-reapply-requires-exact-attached-definition-revision',
    )
  }

  const valid = planTypedReapply({ ...applied, revision })
  const aggregateBefore = clone(applied.aggregate)
  const forged = reidentifyTypedPlan(valid.plan, (draft) => {
    draft.preset.selectedRevision = 1
  })
  const transition = transitionTyped({
    ...applied,
    report: valid.report,
    plan: forged,
    revision,
  })
  assert.equal(transition.ok, false)
  assert.deepEqual(applied.aggregate, aggregateBefore)
})

test('typed transition rejects self-reidentified forged plan authority without mutating source state', () => {
  const applied = applyRevision2()
  const planned = planTypedReapply({ ...applied, revision: 50 })
  type MutablePlan = DeepMutable<CaseInsertPresetTypedReapplyPlan>
  type MutableRequirement = MutablePlan['materialConsentRequirements'][number]
  type MutableDirectWrite = MutablePlan['fieldActions'][number]
  const mutations: readonly Readonly<{
    name: string
    mutate: (draft: MutablePlan) => void
  }>[] = [
    {
      name: 'projected status diverges from reviewed effect',
      mutate: (draft) => {
        draft.projectedConfiguration.ownedFields[0]!
          .expectedCustomizationStatus = 'customized'
      },
    },
    {
      name: 'projected ownership has no matching effect',
      mutate: (draft) => {
        draft.fieldEffects.pop()
      },
    },
    {
      name: 'precondition duplicates one address and omits another',
      mutate: (draft) => {
        draft.preconditions.fields[1] = clone(draft.preconditions.fields[0]!)
      },
    },
    {
      name: 'selected footprint source is not in resolved assignments',
      mutate: (draft) => {
        draft.selectedFootprint[0]!.sources[0]!.assignmentId =
          'case:preset-assignment:forged'
      },
    },
    {
      name: 'selected preset source diverges from attached configuration',
      mutate: (draft) => {
        draft.preset.source = 'user'
        draft.projectedConfiguration.selectedPreset.source = 'user'
      },
    },
    {
      name: 'fieldActions diverge from aggregateWrites',
      mutate: (draft) => {
        const effect = draft.fieldEffects.find(({ address }) =>
          address.fieldId === 'layout-x')!
        draft.fieldActions = [{
          id: 'case:preset-reapply-write:v2:forged',
          kind: 'set-layout-x',
          address: clone(effect.address),
          currentValuePrecondition: 0,
          proposedValue: 0,
          materialConsentRequirementIds: [],
        } satisfies MutableDirectWrite]
      },
    },
    {
      name: 'warning identity is duplicated',
      mutate: (draft) => {
        draft.warnings.push(clone(draft.warnings[0]!))
      },
    },
    {
      name: 'consent requirement identity is duplicated',
      mutate: (draft) => {
        const requirement = {
          id: 'case:preset-reapply-requirement:v2:forged',
          kind: 'multiple-concrete-regions',
          address: null,
          policy: null,
          selectedPreset: {
            id: draft.preset.id,
            revision: draft.preset.selectedRevision,
          },
          sourceConfigurationIdentity: draft.source.configurationIdentity,
          sourceCustomizationReportIdentity:
            draft.source.customizationReportIdentity,
          evidence: {
            id: 'case:preset-reapply-requirement:v2:forged',
            kind: 'multiple-concrete-regions',
          },
        } satisfies MutableRequirement
        draft.materialConsentRequirements.push(requirement, clone(requirement))
      },
    },
    {
      name: 'field effect address is duplicated',
      mutate: (draft) => {
        draft.fieldEffects.push(clone(draft.fieldEffects[0]!))
      },
    },
    {
      name: 'reviewed empty-mask viewport action is omitted',
      mutate: (draft) => {
        draft.artworkViewportActions.pop()
      },
    },
    {
      name: 'extra reviewed empty-mask viewport action is injected',
      mutate: (draft) => {
        const injected = clone(draft.artworkViewportActions[0]!)
        injected.id = 'case:preset-artwork-viewport-action:v1:forged-extra'
        draft.artworkViewportActions.push(injected)
      },
    },
    {
      name: 'one reviewed empty-mask viewport group substitutes another',
      mutate: (draft) => {
        const substituted = clone(draft.artworkViewportActions[1]!)
        substituted.id =
          'case:preset-artwork-viewport-action:v1:forged-substitution'
        draft.artworkViewportActions[0] = substituted
      },
    },
  ]
  for (const { name, mutate } of mutations) {
    const aggregateBefore = clone(applied.aggregate)
    const forged = reidentifyTypedPlan(planned.plan, mutate)
    const result = transitionTyped({
      ...applied,
      report: planned.report,
      plan: forged,
      revision: 50,
    })
    assert.equal(result.ok, false, name)
    assert.deepEqual(applied.aggregate, aggregateBefore, name)
  }
  const malformed = clone(planned.plan) as unknown as Record<string, unknown>
  malformed.fieldEffects = [null]
  const malformedResult = transitionCaseInsertPresetReapply({
    operation: 'reapply',
    plan: malformed as never,
    sourceConfiguration: applied.configuration,
    customizationReport: planned.report,
    reviewAcceptance: null as never,
    materialConsentAcceptances: [],
    current: {
      projectKind: 'caseInsert',
      aggregate: clone(applied.aggregate),
      sessionId: SESSION_ID,
      projectRevision: 50,
      template: { id: 'jewelCase', revision: null },
    },
  })
  assert.equal(malformedResult.ok, false)
})

test('typed transition binds exact viewport clipping warning and consent evidence sets', () => {
  const applied = applyRevision2()
  const aggregate = clone(applied.aggregate)
  const slot = aggregate.templates.tray.artworkSlots.find(({ id }) =>
    id === 'tray-artwork-1')!
  slot.imageDataUrl = 'data:image/png;base64,dHlwZWQtcmVhcHBseQ=='
  slot.imageSize = { width: 1600, height: 200 }
  slot.imageSource = createProjectImageAssetProvenance({
    source: 'uploaded',
    sourceLabel: 'wide-screenshot.png',
  })
  slot.layout.x += 4
  const report = reportFor(aggregate, applied.configuration, 501)
  const xField = report.fields.find(({ address }) =>
    address.runtimeObjectId === slot.id && address.fieldId === 'layout-x')!
  const planned = planTypedReapply({
    aggregate,
    configuration: applied.configuration,
    revision: 501,
    policies: [customizedFieldPolicy(
      report,
      applied.configuration,
      xField,
      'overwrite-with-selected-preset',
    )],
  })
  const clippingWarning = planned.plan.warnings.find(({ kind }) =>
    kind === 'material-visible-clipping')
  const clippingRequirement = planned.plan.materialConsentRequirements.find(
    ({ kind }) => kind === 'material-visible-clipping',
  )
  assert.ok(clippingWarning)
  assert.ok(clippingRequirement)
  assert.equal(
    planned.plan.artworkViewportActions[0]?.evidence.plan.warnings.some(
      ({ id }) => id === clippingWarning.id,
    ),
    true,
  )
  assert.equal(
    planned.plan.artworkViewportActions[0]?.evidence.plan
      .materialConsentRequirements.some(({ id }) =>
        id === clippingRequirement.id),
    true,
  )
  for (const { name, mutate } of [
    {
      name: 'clipping warning omitted',
      mutate: (draft: DeepMutable<CaseInsertPresetTypedReapplyPlan>) => {
        draft.warnings = draft.warnings.filter(({ id }) =>
          id !== clippingWarning.id)
      },
    },
    {
      name: 'clipping consent omitted',
      mutate: (draft: DeepMutable<CaseInsertPresetTypedReapplyPlan>) => {
        draft.materialConsentRequirements =
          draft.materialConsentRequirements.filter(({ id }) =>
            id !== clippingRequirement.id)
        for (const write of draft.fieldActions) {
          write.materialConsentRequirementIds =
            write.materialConsentRequirementIds.filter((id) =>
              id !== clippingRequirement.id)
        }
        for (const write of draft.aggregateWrites) {
          write.materialConsentRequirementIds =
            write.materialConsentRequirementIds.filter((id) =>
              id !== clippingRequirement.id)
        }
      },
    },
  ] as const) {
    const forged = reidentifyTypedPlan(planned.plan, mutate)
    const result = transitionTyped({
      aggregate,
      configuration: applied.configuration,
      report: planned.report,
      plan: forged,
      revision: 501,
    })
    assert.equal(result.ok, false, name)
  }
})

test('typed transition binds exact multiple-region warning and consent evidence', () => {
  const applied = applyRevision2({ kind: 'complete' })
  const aggregate = clone(applied.aggregate)
  aggregate.templates.cover.background.layout.x += 3
  const report = reportFor(aggregate, applied.configuration, 502)
  const field = report.fields.find(({ address, fieldStatus }) =>
    address.featureOwnerId === 'case.cover.background' &&
    address.fieldId === 'layout-x' && fieldStatus === 'value-diverged')!
  const planned = planTypedReapply({
    aggregate,
    configuration: applied.configuration,
    revision: 502,
    policies: [customizedFieldPolicy(
      report,
      applied.configuration,
      field,
      'preserve-current-customization',
    )],
  })
  const warning = planned.plan.warnings.find(({ kind }) =>
    kind === 'multiple-concrete-regions')
  const requirement = planned.plan.materialConsentRequirements.find(
    ({ kind }) => kind === 'multiple-concrete-regions',
  )
  assert.ok(warning)
  assert.ok(requirement)
  for (const { name, mutate } of [
    {
      name: 'multiple-region warning omitted',
      mutate: (draft: DeepMutable<CaseInsertPresetTypedReapplyPlan>) => {
        draft.warnings = draft.warnings.filter(({ id }) => id !== warning.id)
      },
    },
    {
      name: 'multiple-region consent omitted',
      mutate: (draft: DeepMutable<CaseInsertPresetTypedReapplyPlan>) => {
        draft.materialConsentRequirements =
          draft.materialConsentRequirements.filter(({ id }) =>
            id !== requirement.id)
        for (const write of draft.fieldActions) {
          write.materialConsentRequirementIds =
            write.materialConsentRequirementIds.filter((id) =>
              id !== requirement.id)
        }
        for (const write of draft.aggregateWrites) {
          write.materialConsentRequirementIds =
            write.materialConsentRequirementIds.filter((id) =>
              id !== requirement.id)
        }
      },
    },
  ] as const) {
    const result = transitionTyped({
      aggregate,
      configuration: applied.configuration,
      report: planned.report,
      plan: reidentifyTypedPlan(planned.plan, mutate),
      revision: 502,
    })
    assert.equal(result.ok, false, name)
  }
})

test('typed transition rejects forged viewport write masks and creation links without partial mutation', () => {
  const applied = applyRevision2()
  const aggregate = withoutSlot(applied.aggregate, 'tray-artwork-1')
  const report = reportFor(aggregate, applied.configuration, 51)
  const policy = objectAbsentPolicy(
    report,
    applied.configuration,
    'tray-artwork-1',
    'overwrite-with-selected-preset',
  )
  const planned = planTypedReapply({
    aggregate,
    configuration: applied.configuration,
    revision: 51,
    policies: [policy],
  })
  const mutations: readonly Readonly<{
    name: string
    mutate: (draft: DeepMutable<CaseInsertPresetTypedReapplyPlan>) => void
  }>[] = [
    {
      name: 'deferred Cover warning is omitted',
      mutate: (draft) => {
        draft.warnings = draft.warnings.filter(({ kind }) =>
          kind !== 'artwork-cover-fitting-deferred')
      },
    },
    {
      name: 'viewport mask omits a required reviewed write',
      mutate: (draft) => {
        draft.artworkViewportActions[0]!.writeOwnedFieldIds.pop()
      },
    },
    {
      name: 'viewport proposal diverges from selected owned value',
      mutate: (draft) => {
        draft.artworkViewportActions[0]!.proposedValues.layoutX = 99
      },
    },
    {
      name: 'creation action links to no reviewed viewport action',
      mutate: (draft) => {
        draft.objectCreationActions[0]!.viewportActionId =
          'case:preset-artwork-viewport-action:v1:forged'
      },
    },
  ]
  for (const { name, mutate } of mutations) {
    const aggregateBefore = clone(aggregate)
    const forged = reidentifyTypedPlan(planned.plan, mutate)
    const result = transitionTyped({
      aggregate,
      configuration: applied.configuration,
      report: planned.report,
      plan: forged,
      revision: 51,
    })
    assert.equal(result.ok, false, name)
    assert.deepEqual(aggregate, aggregateBefore, name)
  }
})
