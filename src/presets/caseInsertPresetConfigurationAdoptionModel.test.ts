import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  createCaseInsertPresetUnattachedEndpoint,
} from './caseInsertPresetAttachmentEndpoint.ts'

import { normalizeProjectJewelCaseState } from '../caseInsert/normalization.ts'
import {
  createCaseInsertPresetAssignmentSnapshot,
  type CaseInsertPresetAssignmentSnapshot,
} from '../caseInsert/presetAssignmentSnapshot.ts'
import { captureNormalizedProjectSnapshot } from '../lifecycle/canonicalProject.ts'
import { createBlankJewelCaseSavedProject } from '../project/caseInsertProjectAdapters.ts'
import type { ProjectJewelCaseState } from '../project/projectTypes.ts'
import {
  detectCaseInsertPresetCustomization,
  validateCaseInsertAppliedPresetConfigurationCandidate,
  type CaseInsertAppliedPresetConfiguration,
} from './caseInsertPresetAppliedConfiguration.ts'
import {
  resolveCaseInsertPresetAssignments,
} from './caseInsertPresetAssignmentResolution.ts'
import {
  planCaseInsertPresetFirstApply,
} from './caseInsertPresetApplyPlanning.ts'
import {
  applyCaseInsertPresetFirstTime,
  createCaseInsertPresetApplyReviewApproval,
  createCaseInsertPresetMaterialConsentAcceptance,
  type CaseInsertPresetApplyTransitionResult,
  type CaseInsertPresetMaterialConsentAcceptance,
} from './caseInsertPresetApplyTransition.ts'
import {
  CASE_INSERT_PRESET_CATALOG,
  createCaseInsertPresetCatalog,
} from './caseInsertPresetCatalog.ts'
import {
  CASE_INSERT_PRESET_ADOPTION_EVIDENCE_CANDIDATE_KIND,
  CASE_INSERT_PRESET_ADOPTION_EVIDENCE_CANDIDATE_VERSION,
  CASE_INSERT_PRESET_AGGREGATE_EVIDENCE_GAPS,
  CASE_INSERT_PRESET_APPLICATION_ADOPTION_RECEIPT_KIND,
  CASE_INSERT_PRESET_APPLICATION_ADOPTION_RECEIPT_VERSION,
  CASE_INSERT_PRESET_APPLICATION_ADOPTION_RELATIONSHIPS,
  CASE_INSERT_PRESET_APPLICATION_SNAPSHOT_KIND,
  CASE_INSERT_PRESET_APPLICATION_SNAPSHOT_VERSION,
  CASE_INSERT_PRESET_ATTACHED_IDENTITY_PREFIX,
  CASE_INSERT_PRESET_ATTACHMENT_STATE_KIND,
  CASE_INSERT_PRESET_ATTACHMENT_STATE_VERSION,
  CASE_INSERT_PRESET_UNATTACHED_IDENTITY,
  auditCaseInsertPresetApplicationAdoptionEvidence,
  classifyCaseInsertPresetApplicationAdoptionRelationship,
  createCaseInsertPresetApplicationSnapshot,
  createCaseInsertPresetAttachedState,
  createCaseInsertPresetUnattachedState,
  projectCaseInsertPresetApplicationAdoptionIdentity,
  validateCaseInsertPresetApplicationSnapshot,
  validateCaseInsertPresetAttachmentState,
  type CaseInsertPresetAdoptionEvidenceCandidate,
  type CaseInsertPresetApplicationAdoptionIdentityInput,
  type CaseInsertPresetApplicationAdoptionReceipt,
} from './caseInsertPresetConfigurationAdoptionModel.ts'
import {
  createCaseInsertPresetDetachReviewAcceptance,
  transitionCaseInsertPresetDetach,
  type CaseInsertPresetDetachTransitionResult,
} from './caseInsertPresetDetachTransition.ts'
import { planCaseInsertPresetDetach } from './caseInsertPresetDetachPlanning.ts'
import {
  planCaseInsertPresetReapply,
} from './caseInsertPresetReapplyPlanning.ts'
import {
  createCaseInsertPresetReapplyConsentAcceptance,
  createCaseInsertPresetReapplyReviewAcceptance,
  transitionCaseInsertPresetReapply,
  type CaseInsertPresetReapplyTransitionResult,
} from './caseInsertPresetReapplyTransition.ts'
import {
  encodeCaseInsertPresetDeterministicIdentity,
} from './caseInsertPresetReapplyIdentity.ts'
import {
  createCoordinatedCaseInsertPresetDefinition,
} from './caseInsertPresetTestFixtures.ts'

type MutableRecord = Record<string, unknown>

type EvidenceFixture = Readonly<{
  apply: Extract<CaseInsertPresetApplyTransitionResult, { ok: true }>
  reapply: Extract<CaseInsertPresetReapplyTransitionResult, { ok: true }>
  detach: Extract<CaseInsertPresetDetachTransitionResult, { ok: true }>
  firstConfiguration: CaseInsertAppliedPresetConfiguration
  nextConfiguration: CaseInsertAppliedPresetConfiguration
  firstSnapshot: CaseInsertPresetAssignmentSnapshot
  nextSnapshot: CaseInsertPresetAssignmentSnapshot
  applyPlan: unknown
  applyReviewApproval: unknown
}>

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (value && typeof value === 'object') {
    if (seen.has(value)) return value
    seen.add(value)
    for (const child of Object.values(value)) deepFreeze(child, seen)
    Object.freeze(value)
  }
  return value
}

function isDeeplyFrozen(
  value: unknown,
  seen = new WeakSet<object>(),
): boolean {
  if (value === null || typeof value !== 'object') return true
  if (seen.has(value)) return true
  seen.add(value)
  return Object.isFrozen(value) && Object.values(value).every((child) =>
    isDeeplyFrozen(child, seen))
}

function buildSnapshot(
  aggregate: ProjectJewelCaseState,
  sessionId: string,
  projectRevision: number,
) {
  const project = createBlankJewelCaseSavedProject()
  project.caseInsert = structuredClone(aggregate)
  const result = createCaseInsertPresetAssignmentSnapshot({
    sessionId,
    projectRevision,
    project: captureNormalizedProjectSnapshot(project),
  })
  assert.equal(result.ok, true)
  if (!result.ok) throw new Error(result.error.code)
  return result.value
}

function buildEvidenceFixture(): EvidenceFixture {
  const catalog = createCaseInsertPresetCatalog({
    builtins: [createCoordinatedCaseInsertPresetDefinition()],
  })
  assert.equal(catalog.ok, true)
  if (!catalog.ok) throw new Error(catalog.error.code)
  const summary = catalog.catalog.list()[0]!
  const definition = catalog.catalog.getExact(summary.id, summary.revision)!
  const sessionId = 'application-adoption-model-session'
  const sourceRevision = 70
  const sourceProject = createBlankJewelCaseSavedProject()
  sourceProject.caseInsert = normalizeProjectJewelCaseState(
    sourceProject.caseInsert,
  )
  const sourceSnapshot = buildSnapshot(
    sourceProject.caseInsert,
    sessionId,
    sourceRevision,
  )
  const scope = { kind: 'complete' as const }
  const resolution = resolveCaseInsertPresetAssignments({
    catalog: catalog.catalog,
    reference: { id: definition.id, revision: definition.revision },
    requestedScope: scope,
    snapshot: sourceSnapshot,
    expectedSnapshotIdentity: sourceSnapshot.identity,
  })
  assert.equal(resolution.ok, true)
  if (!resolution.ok) throw new Error(resolution.status)
  const applyPlan = planCaseInsertPresetFirstApply({
    operation: 'apply',
    resolution,
    expected: {
      projectKind: 'caseInsert',
      preset: { id: definition.id, revision: definition.revision },
      requestedScope: scope,
      snapshotIdentity: sourceSnapshot.identity,
    },
  })
  assert.equal(applyPlan.ok, true)
  if (!applyPlan.ok) throw new Error(applyPlan.status)
  const applyAcceptances = applyPlan.plan.materialConsentRequirements.map(
    ({ id }) => createCaseInsertPresetMaterialConsentAcceptance(
      applyPlan.plan,
      id,
    ),
  )
  const applyReviewApproval = createCaseInsertPresetApplyReviewApproval(
    applyPlan.plan,
  )
  const apply = applyCaseInsertPresetFirstTime({
    planningResult: applyPlan,
    source: {
      projectKind: 'caseInsert',
      aggregate: structuredClone(sourceSnapshot.caseInsert),
      snapshotIdentity: sourceSnapshot.identity,
      preset: { id: definition.id, revision: definition.revision },
      requestedScope: scope,
    },
    attachment: createCaseInsertPresetUnattachedEndpoint(),
    reviewApproval: applyReviewApproval,
    materialConsentAcceptances:
      applyAcceptances as CaseInsertPresetMaterialConsentAcceptance[],
  })
  assert.equal(apply.ok, true)
  if (!apply.ok) throw new Error(`${apply.status}:${apply.code}`)
  const firstConfiguration =
    validateCaseInsertAppliedPresetConfigurationCandidate(apply)
  assert.equal(firstConfiguration.ok, true)
  if (!firstConfiguration.ok) throw new Error(firstConfiguration.code)

  const firstRevision = sourceRevision + 1
  const firstAggregate = normalizeProjectJewelCaseState(
    structuredClone(apply.aggregate),
  )
  const firstSnapshot = buildSnapshot(
    firstAggregate,
    sessionId,
    firstRevision,
  )
  const report = detectCaseInsertPresetCustomization({
    configuration: firstConfiguration.configuration,
    current: {
      projectKind: 'caseInsert',
      aggregate: firstAggregate,
      sessionId,
      projectRevision: firstRevision,
      template: firstConfiguration.configuration.template,
    },
  })
  assert.equal(report.ok, true)
  if (!report.ok) throw new Error(report.code)
  const reapplyPlan = planCaseInsertPresetReapply({
    operation: 'reapply',
    configuration: firstConfiguration.configuration,
    customizationReport: report,
    current: {
      projectKind: 'caseInsert',
      aggregate: firstAggregate,
      sessionId,
      projectRevision: firstRevision,
      template: firstConfiguration.configuration.template,
      snapshot: firstSnapshot,
    },
    selectedDefinition: definition,
    customizedFieldPolicies: [],
  })
  assert.equal(reapplyPlan.ok, true)
  if (!reapplyPlan.ok) throw new Error(reapplyPlan.code)
  const reapply = transitionCaseInsertPresetReapply(deepFreeze({
    operation: 'reapply',
    plan: reapplyPlan.plan,
    sourceConfiguration: firstConfiguration.configuration,
    customizationReport: report,
    reviewAcceptance:
      createCaseInsertPresetReapplyReviewAcceptance(reapplyPlan.plan),
    materialConsentAcceptances:
      reapplyPlan.plan.materialConsentRequirements.map(({ id }) =>
        createCaseInsertPresetReapplyConsentAcceptance(
          reapplyPlan.plan,
          id,
        )!),
    current: {
      projectKind: 'caseInsert',
      aggregate: firstAggregate,
      sessionId,
      projectRevision: firstRevision,
      template: firstConfiguration.configuration.template,
    },
  }))
  assert.equal(reapply.ok, true)
  if (!reapply.ok) throw new Error(`${reapply.status}:${reapply.code}`)

  const detachPlan = planCaseInsertPresetDetach({
    operation: 'detach',
    configuration: firstConfiguration.configuration,
    current: {
      projectKind: 'caseInsert',
      aggregate: firstAggregate,
      sessionId,
      projectRevision: firstRevision,
      template: firstConfiguration.configuration.template,
      snapshot: firstSnapshot,
    },
  })
  assert.equal(detachPlan.ok, true)
  if (!detachPlan.ok) throw new Error(detachPlan.code)
  const detach = transitionCaseInsertPresetDetach({
    operation: 'detach',
    plan: detachPlan.plan,
    sourceConfiguration: firstConfiguration.configuration,
    reviewAcceptance:
      createCaseInsertPresetDetachReviewAcceptance(detachPlan.plan),
    materialConsentAcceptances: [],
    current: {
      projectKind: 'caseInsert',
      aggregate: firstAggregate,
      sessionId,
      projectRevision: firstRevision,
      template: firstConfiguration.configuration.template,
      snapshot: firstSnapshot,
    },
  })
  assert.equal(detach.ok, true)
  if (!detach.ok) throw new Error(`${detach.status}:${detach.code}`)
  const nextSnapshot = buildSnapshot(
    structuredClone(reapply.aggregate),
    sessionId,
    firstRevision + 1,
  )
  return {
    apply,
    reapply,
    detach,
    firstConfiguration: firstConfiguration.configuration,
    nextConfiguration: reapply.nextConfiguration,
    firstSnapshot,
    nextSnapshot,
    applyPlan: applyPlan.plan,
    applyReviewApproval,
  }
}

function evidenceCandidate(
  operation: 'apply',
  transitionResult: EvidenceFixture['apply'],
): Extract<CaseInsertPresetAdoptionEvidenceCandidate, { operation: 'apply' }>
function evidenceCandidate(
  operation: 'reapply',
  transitionResult: EvidenceFixture['reapply'],
): Extract<CaseInsertPresetAdoptionEvidenceCandidate, { operation: 'reapply' }>
function evidenceCandidate(
  operation: 'detach',
  transitionResult: EvidenceFixture['detach'],
): Extract<CaseInsertPresetAdoptionEvidenceCandidate, { operation: 'detach' }>
function evidenceCandidate(
  operation: 'apply' | 'reapply' | 'detach',
  transitionResult: EvidenceFixture[typeof operation],
): CaseInsertPresetAdoptionEvidenceCandidate
function evidenceCandidate(
  operation: 'apply' | 'reapply' | 'detach',
  transitionResult: EvidenceFixture[typeof operation],
): CaseInsertPresetAdoptionEvidenceCandidate {
  return deepFreeze({
    kind: CASE_INSERT_PRESET_ADOPTION_EVIDENCE_CANDIDATE_KIND,
    formatVersion: CASE_INSERT_PRESET_ADOPTION_EVIDENCE_CANDIDATE_VERSION,
    operation,
    applicationAdoptionStatus: 'not-adopted',
    transitionResult,
  }) as CaseInsertPresetAdoptionEvidenceCandidate
}

test('canonical unattached state has one exact deeply immutable representation', () => {
  const first = createCaseInsertPresetUnattachedState()
  const second = createCaseInsertPresetUnattachedState()
  assert.equal(first, second)
  assert.deepEqual(first, {
    kind: CASE_INSERT_PRESET_ATTACHMENT_STATE_KIND,
    formatVersion: CASE_INSERT_PRESET_ATTACHMENT_STATE_VERSION,
    status: 'unattached',
    attachmentIdentity: CASE_INSERT_PRESET_UNATTACHED_IDENTITY,
  })
  assert.equal(isDeeplyFrozen(first), true)
  const validated = validateCaseInsertPresetAttachmentState(first)
  assert.equal(validated.ok, true)
  if (validated.ok) assert.equal(validated.state, first)
})

test('one complete v1 or v2 configuration forms one canonical attachment', () => {
  const fixture = buildEvidenceFixture()
  const first = createCaseInsertPresetAttachedState(fixture.firstConfiguration)
  const next = createCaseInsertPresetAttachedState(fixture.nextConfiguration)
  assert.equal(first.ok, true)
  assert.equal(next.ok, true)
  if (!first.ok || !next.ok) return
  assert.equal(first.state.status, 'attached')
  assert.equal(next.state.status, 'attached')
  if (first.state.status === 'attached' && next.state.status === 'attached') {
    assert.equal(first.state.configuration.attachmentStatus,
      'detached-uninstalled')
    assert.equal(next.state.configuration.attachmentStatus,
      'detached-uninstalled')
  }
  assert.equal(fixture.detach.releaseResult.applicationAdoptionStatus,
    'not-adopted')
  assert.equal(fixture.detach.releaseResult.nextAppliedPresetConfiguration, null)
  assert.notEqual(first.state.attachmentIdentity,
    createCaseInsertPresetUnattachedState().attachmentIdentity)
  assert.notEqual(first.state.attachmentIdentity, next.state.attachmentIdentity)
  assert.equal(isDeeplyFrozen(first), true)
  assert.equal(isDeeplyFrozen(next), true)
  assert.notEqual(first.state.configuration, fixture.firstConfiguration)

  const repeated = createCaseInsertPresetAttachedState(
    structuredClone(fixture.firstConfiguration),
  )
  assert.equal(repeated.ok, true)
  if (repeated.ok) {
    assert.equal(
      repeated.state.attachmentIdentity,
      first.state.attachmentIdentity,
    )
  }

  const reordered = structuredClone(fixture.firstConfiguration)
  reordered.ownedFields.reverse()
  for (const field of reordered.ownedFields) field.sources.reverse()
  const callerOrder = reordered.ownedFields.map(({ address }) =>
    address.runtimeObjectId)
  const canonical = createCaseInsertPresetAttachedState(deepFreeze(reordered))
  assert.equal(canonical.ok, true)
  if (canonical.ok) {
    assert.equal(canonical.state.attachmentIdentity,
      first.state.attachmentIdentity)
  }
  assert.deepEqual(
    reordered.ownedFields.map(({ address }) => address.runtimeObjectId),
    callerOrder,
  )
})

test('attachment validation rejects malformed, competing, forged, and cross-domain states', () => {
  const fixture = buildEvidenceFixture()
  const valid = createCaseInsertPresetAttachedState(fixture.firstConfiguration)
  assert.equal(valid.ok, true)
  if (!valid.ok) return

  for (const value of [null, undefined, 7, 'attached', [], {}, {
    status: 'unattached',
  }, {
    kind: CASE_INSERT_PRESET_ATTACHMENT_STATE_KIND,
    formatVersion: 1,
    status: 'detached',
    attachmentIdentity: CASE_INSERT_PRESET_UNATTACHED_IDENTITY,
  }, {
    ...createCaseInsertPresetUnattachedState(),
    configuration: fixture.firstConfiguration,
  }, {
    ...createCaseInsertPresetUnattachedState(),
    releaseResult: fixture.detach.releaseResult,
  }, {
    ...valid.state,
    configurations: [fixture.firstConfiguration, fixture.nextConfiguration],
  }]) {
    const result = validateCaseInsertPresetAttachmentState(value)
    assert.equal(result.ok, false)
    if (!result.ok) {
      assert.equal('state' in result, false)
      assert.equal(isDeeplyFrozen(result), true)
    }
  }

  const unsupported = {
    ...createCaseInsertPresetUnattachedState(),
    formatVersion: 2,
  }
  const unsupportedResult = validateCaseInsertPresetAttachmentState(unsupported)
  assert.equal(unsupportedResult.ok, false)
  if (!unsupportedResult.ok) {
    assert.equal(unsupportedResult.status,
      'unsupported-adoption-model-version')
  }

  const forgedAttachment = structuredClone(valid.state)
  forgedAttachment.attachmentIdentity = 'case:preset-attachment:v1:forged'
  const forgedAttachmentResult = validateCaseInsertPresetAttachmentState(
    deepFreeze(forgedAttachment),
  )
  assert.equal(forgedAttachmentResult.ok, false)
  if (!forgedAttachmentResult.ok) {
    assert.equal(forgedAttachmentResult.status,
      'configuration-identity-mismatch')
  }

  const forgedConfiguration = structuredClone(fixture.firstConfiguration)
  forgedConfiguration.configurationIdentity = 'forged'
  const forgedConfigurationResult = createCaseInsertPresetAttachedState(
    deepFreeze(forgedConfiguration),
  )
  assert.equal(forgedConfigurationResult.ok, false)

  const crossDomain = structuredClone(fixture.firstConfiguration) as MutableRecord
  crossDomain.kind = 'sbls/disc-preset-configuration'
  const crossDomainResult = createCaseInsertPresetAttachedState(
    deepFreeze(crossDomain),
  )
  assert.equal(crossDomainResult.ok, false)
  if (!crossDomainResult.ok) {
    assert.equal(crossDomainResult.status, 'configuration-domain-mismatch')
  }

  const partial = structuredClone(fixture.firstConfiguration)
  partial.ownedFields.pop()
  const partialResult = createCaseInsertPresetAttachedState(deepFreeze(partial))
  assert.equal(partialResult.ok, false)

  const releaseAsConfiguration = createCaseInsertPresetAttachedState(
    fixture.detach.releaseResult,
  )
  assert.equal(releaseAsConfiguration.ok, false)
})

test('hostile prototypes, accessors, aliases, and cycles fail without mutation', () => {
  const fixture = buildEvidenceFixture()
  const cyclic = structuredClone(fixture.firstConfiguration) as MutableRecord
  cyclic.cycle = cyclic
  const cyclicResult = createCaseInsertPresetAttachedState(
    deepFreeze(cyclic),
  )
  assert.equal(cyclicResult.ok, false)
  if (!cyclicResult.ok) assert.equal(cyclicResult.code,
    'cyclic-or-aliased-input')

  const getterState: MutableRecord = {
    kind: CASE_INSERT_PRESET_ATTACHMENT_STATE_KIND,
    formatVersion: 1,
    status: 'unattached',
  }
  Object.defineProperty(getterState, 'attachmentIdentity', {
    enumerable: true,
    get: () => CASE_INSERT_PRESET_UNATTACHED_IDENTITY,
  })
  const getterResult = validateCaseInsertPresetAttachmentState(getterState)
  assert.equal(getterResult.ok, false)
  if (!getterResult.ok) assert.equal(getterResult.code,
    'record-accessor-unsupported')

  const customPrototype = Object.create({ inherited: true }) as MutableRecord
  Object.assign(customPrototype, createCaseInsertPresetUnattachedState())
  const prototypeResult = validateCaseInsertPresetAttachmentState(
    customPrototype,
  )
  assert.equal(prototypeResult.ok, false)
  if (!prototypeResult.ok) assert.equal(prototypeResult.code,
    'record-prototype-unsupported')

  const aliased = structuredClone(fixture.firstConfiguration) as MutableRecord
  const ownedFields = aliased.ownedFields as MutableRecord[]
  if (ownedFields.length > 1) ownedFields[1] = ownedFields[0]!
  const aliasResult = createCaseInsertPresetAttachedState(deepFreeze(aliased))
  assert.equal(aliasResult.ok, false)

  let getterExecuted = false
  const snapshotEnvelope: MutableRecord = {
    attachment: createCaseInsertPresetUnattachedState(),
  }
  Object.defineProperty(snapshotEnvelope, 'snapshot', {
    enumerable: true,
    get: () => {
      getterExecuted = true
      throw new Error('must not execute')
    },
  })
  const snapshotEnvelopeResult = createCaseInsertPresetApplicationSnapshot(
    snapshotEnvelope,
  )
  assert.equal(snapshotEnvelopeResult.ok, false)
  assert.equal(getterExecuted, false)
  if (!snapshotEnvelopeResult.ok) {
    assert.equal(snapshotEnvelopeResult.code, 'record-accessor-unsupported')
  }

  const frozenTrap = new Proxy(
    { ...createCaseInsertPresetUnattachedState() },
    { isExtensible: () => { throw new Error('must be contained') } },
  )
  const frozenTrapResult = validateCaseInsertPresetAttachmentState(frozenTrap)
  assert.equal(frozenTrapResult.ok, false)
  if (!frozenTrapResult.ok) {
    assert.equal(frozenTrapResult.code, 'input-introspection-failed')
  }

  let arrayLengthRead = false
  const arrayLengthTrap = new Proxy([], {
    get: (target, property, receiver) => {
      if (property === 'length') {
        arrayLengthRead = true
        throw new Error('must be contained')
      }
      return Reflect.get(target, property, receiver)
    },
  })
  const arrayLengthTrapResult = validateCaseInsertPresetAttachmentState(
    arrayLengthTrap,
  )
  assert.equal(arrayLengthTrapResult.ok, false)
  assert.equal(arrayLengthRead, false)

  const nullSnapshotResult = createCaseInsertPresetApplicationSnapshot(null)
  assert.equal(nullSnapshotResult.ok, false)
})

test('application snapshot keeps aggregate and attachment in one coherent domain value', () => {
  const fixture = buildEvidenceFixture()
  const attached = createCaseInsertPresetAttachedState(
    fixture.firstConfiguration,
  )
  assert.equal(attached.ok, true)
  if (!attached.ok) return
  const value = createCaseInsertPresetApplicationSnapshot({
    snapshot: fixture.firstSnapshot,
    attachment: attached.state,
  })
  assert.equal(value.ok, true)
  if (!value.ok) return
  assert.deepEqual(value.value, {
    kind: CASE_INSERT_PRESET_APPLICATION_SNAPSHOT_KIND,
    formatVersion: CASE_INSERT_PRESET_APPLICATION_SNAPSHOT_VERSION,
    projectKind: 'caseInsert',
    snapshot: fixture.firstSnapshot,
    attachment: attached.state,
  })
  assert.equal(isDeeplyFrozen(value), true)
  assert.equal(
    value.value.snapshot.caseInsert.templateType,
    value.value.attachment.status === 'attached'
      ? value.value.attachment.configuration.template.id
      : '',
  )
  const roundTrip = validateCaseInsertPresetApplicationSnapshot(value.value)
  assert.equal(roundTrip.ok, true)

  const futureAttachment = createCaseInsertPresetAttachedState(
    fixture.nextConfiguration,
  )
  assert.equal(futureAttachment.ok, true)
  if (!futureAttachment.ok) return
  const stale = createCaseInsertPresetApplicationSnapshot({
    snapshot: fixture.firstSnapshot,
    attachment: futureAttachment.state,
  })
  assert.equal(stale.ok, false)
  if (!stale.ok) {
    assert.equal(stale.status, 'application-context-mismatch')
  }

  const successor = createCaseInsertPresetApplicationSnapshot({
    snapshot: fixture.nextSnapshot,
    attachment: futureAttachment.state,
  })
  assert.equal(successor.ok, true)

  const wrongSessionSnapshot = buildSnapshot(
    structuredClone(fixture.firstSnapshot.caseInsert),
    'different-application-session',
    fixture.firstSnapshot.identity.projectRevision,
  )
  const wrongSession = createCaseInsertPresetApplicationSnapshot({
    snapshot: wrongSessionSnapshot,
    attachment: attached.state,
  })
  assert.equal(wrongSession.ok, false)
  if (!wrongSession.ok) {
    assert.equal(wrongSession.status, 'application-context-mismatch')
  }

  for (const dimension of ['root', 'identity', 'template'] as const) {
    const expandedSnapshot = structuredClone(fixture.firstSnapshot) as
      MutableRecord
    if (dimension === 'root') expandedSnapshot.extra = true
    const expandedIdentity = expandedSnapshot.identity as MutableRecord
    if (dimension === 'identity') expandedIdentity.extra = true
    if (dimension === 'template') {
      (expandedIdentity.template as MutableRecord).extra = true
    }
    const expanded = createCaseInsertPresetApplicationSnapshot({
      snapshot: deepFreeze(expandedSnapshot),
      attachment: attached.state,
    })
    assert.equal(expanded.ok, false, dimension)
  }

  const unattached = createCaseInsertPresetApplicationSnapshot({
    snapshot: fixture.firstSnapshot,
    attachment: createCaseInsertPresetUnattachedState(),
  })
  assert.equal(unattached.ok, true)
  if (unattached.ok) assert.equal(unattached.value.attachment.status,
    'unattached')

  const wrongVersion = structuredClone(value.value) as MutableRecord
  wrongVersion.formatVersion = 2
  const wrongVersionResult = validateCaseInsertPresetApplicationSnapshot(
    deepFreeze(wrongVersion),
  )
  assert.equal(wrongVersionResult.ok, false)
  if (!wrongVersionResult.ok) {
    assert.equal(wrongVersionResult.status,
      'unsupported-adoption-model-version')
  }
})

test('strengthened successes produce only opaque inert adoption evidence', () => {
  const fixture = buildEvidenceFixture()
  for (const operation of ['apply', 'reapply', 'detach'] as const) {
    const result = auditCaseInsertPresetApplicationAdoptionEvidence(
      evidenceCandidate(operation, fixture[operation]),
    )
    assert.equal(result.ok, true, `${operation}:${JSON.stringify(result)}`)
    if (!result.ok) continue
    assert.equal(result.status, 'validated-inert-evidence')
    assert.equal(result.evidence.operation, operation)
    assert.equal(result.evidence.applicationAdoptionStatus, 'not-adopted')
    assert.equal(result.evidence.transitionResult.operation, operation)
    assert.notEqual(
      result.evidence.transitionResult,
      fixture[operation],
      'validated evidence must be detached from caller input',
    )
    assert.equal('aggregate' in result, false)
    assert.equal('state' in result, false)
    assert.equal('snapshot' in result, false)
    assert.equal('receipt' in result, false)
    assert.equal(isDeeplyFrozen(result), true)
  }
})

test('legacy transition shapes remain aggregate-evidence-insufficient', () => {
  const fixture = buildEvidenceFixture()
  const legacyDetachRelease = structuredClone(fixture.detach.releaseResult) as
    MutableRecord
  legacyDetachRelease.formatVersion = 1
  delete legacyDetachRelease.releaseIdentity
  const legacy = {
    apply: deepFreeze({
      ok: true,
      status: fixture.apply.status,
      aggregate: structuredClone(fixture.apply.aggregate),
      configurationCandidate:
        structuredClone(fixture.apply.configurationCandidate),
    }),
    reapply: deepFreeze({
      ok: true,
      status: fixture.reapply.status,
      transitionIdentity:
        fixture.reapply.nextConfiguration.reapply.transitionIdentity,
      aggregate: structuredClone(fixture.reapply.aggregate),
      nextConfiguration: structuredClone(fixture.reapply.nextConfiguration),
    }),
    detach: deepFreeze({
      ok: true,
      status: fixture.detach.status,
      transitionIdentity: fixture.detach.releaseResult.transitionIdentity,
      aggregate: structuredClone(fixture.detach.aggregate),
      releaseResult: legacyDetachRelease,
    }),
  }
  for (const operation of ['apply', 'reapply', 'detach'] as const) {
    const candidate = deepFreeze({
      kind: CASE_INSERT_PRESET_ADOPTION_EVIDENCE_CANDIDATE_KIND,
      formatVersion: CASE_INSERT_PRESET_ADOPTION_EVIDENCE_CANDIDATE_VERSION,
      operation,
      applicationAdoptionStatus: 'not-adopted',
      transitionResult: legacy[operation],
    })
    const result = auditCaseInsertPresetApplicationAdoptionEvidence(candidate)
    assert.equal(result.ok, false, operation)
    assert.equal(result.status, 'aggregate-evidence-insufficient', operation)
    assert.equal(result.operation, operation)
    assert.deepEqual(result.gaps,
      CASE_INSERT_PRESET_AGGREGATE_EVIDENCE_GAPS[operation])
  }
})

test('raw artifacts, failures, operation mismatch, versions, and adoption claims are rejected', () => {
  const fixture = buildEvidenceFixture()
  for (const raw of [
    fixture.apply,
    fixture.reapply,
    fixture.detach,
    fixture.applyPlan,
    fixture.applyReviewApproval,
    fixture.firstConfiguration,
    fixture.detach.releaseResult,
    { ok: true },
    { ok: false, status: 'invalid-plan', code: 'fixture' },
  ]) {
    const result = auditCaseInsertPresetApplicationAdoptionEvidence(raw)
    assert.equal(result.status, 'invalid-transition-evidence')
  }

  const version = structuredClone(evidenceCandidate('apply', fixture.apply)) as
    MutableRecord
  version.formatVersion = 99
  const versionResult = auditCaseInsertPresetApplicationAdoptionEvidence(
    deepFreeze(version),
  )
  assert.equal(versionResult.status, 'unsupported-transition-version')

  const adopted = structuredClone(evidenceCandidate('detach', fixture.detach)) as
    MutableRecord
  adopted.applicationAdoptionStatus = 'adopted'
  const adoptedResult = auditCaseInsertPresetApplicationAdoptionEvidence(
    deepFreeze(adopted),
  )
  assert.equal(adoptedResult.status, 'transition-already-adopted')

  const mismatch = structuredClone(evidenceCandidate('apply', fixture.apply)) as
    MutableRecord
  mismatch.operation = 'reapply'
  const mismatchResult = auditCaseInsertPresetApplicationAdoptionEvidence(
    deepFreeze(mismatch),
  )
  assert.equal(mismatchResult.status, 'transition-evidence-mismatch')

  const mutable = structuredClone(evidenceCandidate('apply', fixture.apply))
  const mutableResult = auditCaseInsertPresetApplicationAdoptionEvidence(mutable)
  assert.equal(mutableResult.status, 'validated-inert-evidence')

  const transitionFailure = {
    kind: CASE_INSERT_PRESET_ADOPTION_EVIDENCE_CANDIDATE_KIND,
    formatVersion: CASE_INSERT_PRESET_ADOPTION_EVIDENCE_CANDIDATE_VERSION,
    operation: 'apply',
    applicationAdoptionStatus: 'not-adopted',
    transitionResult: {
      ok: false,
      status: 'invalid-plan',
      code: 'fixture',
    },
  }
  const transitionFailureResult =
    auditCaseInsertPresetApplicationAdoptionEvidence(
      deepFreeze(transitionFailure),
    )
  assert.equal(transitionFailureResult.status, 'invalid-transition-evidence')

  const truncatedDetach = structuredClone(
    evidenceCandidate('detach', fixture.detach),
  ) as MutableRecord
  const truncatedDetachTransition = truncatedDetach.transitionResult as
    MutableRecord
  const truncatedRelease = truncatedDetachTransition.releaseResult as
    MutableRecord
  delete truncatedRelease.proof
  const truncatedDetachResult = auditCaseInsertPresetApplicationAdoptionEvidence(
    deepFreeze(truncatedDetach),
  )
  assert.equal(truncatedDetachResult.status, 'invalid-transition-evidence')

  const forgedDetach = structuredClone(
    evidenceCandidate('detach', fixture.detach),
  ) as MutableRecord
  const forgedDetachTransition = forgedDetach.transitionResult as MutableRecord
  const forgedDetachRelease = forgedDetachTransition.releaseResult as
    MutableRecord
  const forgedDetachIdentity =
    'case:preset-detach-transition:v1:forged'
  forgedDetachTransition.transitionIdentity = forgedDetachIdentity
  forgedDetachRelease.transitionIdentity = forgedDetachIdentity
  const forgedDetachResult = auditCaseInsertPresetApplicationAdoptionEvidence(
    deepFreeze(forgedDetach),
  )
  assert.equal(forgedDetachResult.status, 'invalid-transition-evidence')

  const forgedReapply = structuredClone(
    evidenceCandidate('reapply', fixture.reapply),
  ) as MutableRecord
  const forgedReapplyTransition = forgedReapply.transitionResult as MutableRecord
  forgedReapplyTransition.transitionIdentity =
    'case:preset-reapply-transition:v1:forged'
  const forgedReapplyResult = auditCaseInsertPresetApplicationAdoptionEvidence(
    deepFreeze(forgedReapply),
  )
  assert.equal(forgedReapplyResult.status, 'invalid-transition-evidence')

  const cycle = structuredClone(evidenceCandidate('detach', fixture.detach)) as
    MutableRecord
  cycle.cycle = cycle
  const cycleResult = auditCaseInsertPresetApplicationAdoptionEvidence(
    deepFreeze(cycle),
  )
  assert.equal(cycleResult.status, 'invalid-transition-evidence')
  assert.equal(cycleResult.code, 'cyclic-or-aliased-input')
})

test('legal relationship registry permits only coherent attach, replace, and release edges', () => {
  assert.deepEqual(
    Object.keys(CASE_INSERT_PRESET_APPLICATION_ADOPTION_RELATIONSHIPS),
    ['apply', 'reapply', 'detach'],
  )
  assert.deepEqual(
    CASE_INSERT_PRESET_APPLICATION_ADOPTION_RELATIONSHIPS.apply,
    {
      operation: 'apply',
      requiredCurrentAttachment: 'authoritative-absence',
      sourceConfigurationIdentity: 'must-be-absent',
      aggregateResult: 'exact-transition-result',
      successorAttachment: 'exact-successor-configuration',
      attachmentAction: 'attached',
      replayRule: 'changed-source-state-is-conflict',
      outOfOrderRule:
        'session-revision-template-or-attachment-mismatch-is-conflict',
      currentEvidenceReadiness:
        'validated-evidence-pure-adoption-transition-required',
    },
  )
  assert.equal(
    CASE_INSERT_PRESET_APPLICATION_ADOPTION_RELATIONSHIPS.reapply
      .requiredCurrentAttachment,
    'exact-source-configuration',
  )
  assert.equal(
    CASE_INSERT_PRESET_APPLICATION_ADOPTION_RELATIONSHIPS.detach
      .successorAttachment,
    'authoritative-absence',
  )
  assert.equal(
    CASE_INSERT_PRESET_APPLICATION_ADOPTION_RELATIONSHIPS.detach
      .aggregateResult,
    'exact-unchanged-semantic-transition-result',
  )
  assert.equal(isDeeplyFrozen(
    CASE_INSERT_PRESET_APPLICATION_ADOPTION_RELATIONSHIPS), true)
})

test('attachment-edge classification rejects replay, missing, and different-source state', () => {
  const fixture = buildEvidenceFixture()
  const attached = createCaseInsertPresetAttachedState(
    fixture.firstConfiguration,
  )
  assert.equal(attached.ok, true)
  if (!attached.ok || attached.state.status !== 'attached') return
  const sourceConfigurationIdentity =
    attached.state.configuration.configurationIdentity

  const apply = classifyCaseInsertPresetApplicationAdoptionRelationship({
    operation: 'apply',
    currentAttachment: createCaseInsertPresetUnattachedState(),
    evidenceEdge: {
      sourceConfigurationIdentity: null,
      successorConfigurationIdentity: sourceConfigurationIdentity,
    },
  })
  assert.equal(apply.ok, true)
  if (apply.ok) {
    assert.equal(apply.attachmentAction, 'attached')
    assert.equal(apply.adoptionReadiness,
      'evidence-validated-pure-adoption-transition-required')
  }

  const replayedApply = classifyCaseInsertPresetApplicationAdoptionRelationship({
    operation: 'apply',
    currentAttachment: attached.state,
    evidenceEdge: {
      sourceConfigurationIdentity: null,
      successorConfigurationIdentity: sourceConfigurationIdentity,
    },
  })
  assert.equal(replayedApply.ok, false)
  if (!replayedApply.ok) {
    assert.equal(replayedApply.status, 'unexpected-source-attachment')
  }

  const crossDomainApply =
    classifyCaseInsertPresetApplicationAdoptionRelationship({
      operation: 'apply',
      currentAttachment: createCaseInsertPresetUnattachedState(),
      evidenceEdge: {
        sourceConfigurationIdentity: null,
        successorConfigurationIdentity: 'disc:preset-configuration:v1:fixture',
      },
    })
  assert.equal(crossDomainApply.ok, false)
  if (!crossDomainApply.ok) {
    assert.equal(crossDomainApply.status, 'successor-attachment-mismatch')
  }

  for (const operation of ['reapply', 'detach'] as const) {
    const exact = classifyCaseInsertPresetApplicationAdoptionRelationship({
      operation,
      currentAttachment: attached.state,
      evidenceEdge: {
        sourceConfigurationIdentity,
        successorConfigurationIdentity: operation === 'reapply'
          ? fixture.nextConfiguration.configurationIdentity
          : null,
      },
    })
    assert.equal(exact.ok, true)
    if (exact.ok) {
      assert.equal(exact.attachmentAction,
        operation === 'reapply' ? 'replaced' : 'released')
      assert.equal(isDeeplyFrozen(exact), true)
    }

    const missing = classifyCaseInsertPresetApplicationAdoptionRelationship({
      operation,
      currentAttachment: createCaseInsertPresetUnattachedState(),
      evidenceEdge: {
        sourceConfigurationIdentity,
        successorConfigurationIdentity: operation === 'reapply'
          ? fixture.nextConfiguration.configurationIdentity
          : null,
      },
    })
    assert.equal(missing.ok, false)
    if (!missing.ok) assert.equal(missing.status, 'missing-source-attachment')

    const differentSource =
      classifyCaseInsertPresetApplicationAdoptionRelationship({
        operation,
        currentAttachment: attached.state,
        evidenceEdge: {
          sourceConfigurationIdentity:
            'case:preset-applied-configuration:v1:different',
          successorConfigurationIdentity: operation === 'reapply'
            ? fixture.nextConfiguration.configurationIdentity
            : null,
        },
      })
    assert.equal(differentSource.ok, false)
    if (!differentSource.ok) {
      assert.equal(differentSource.status, 'configuration-identity-mismatch')
    }
  }

  const detachTombstone =
    classifyCaseInsertPresetApplicationAdoptionRelationship({
      operation: 'detach',
      currentAttachment: attached.state,
      evidenceEdge: {
        sourceConfigurationIdentity,
        successorConfigurationIdentity: sourceConfigurationIdentity,
      },
    })
  assert.equal(detachTombstone.ok, false)
  if (!detachTombstone.ok) {
    assert.equal(detachTombstone.status, 'successor-attachment-mismatch')
  }

  const unchangedReapplyAttachment =
    classifyCaseInsertPresetApplicationAdoptionRelationship({
      operation: 'reapply',
      currentAttachment: attached.state,
      evidenceEdge: {
        sourceConfigurationIdentity,
        successorConfigurationIdentity: sourceConfigurationIdentity,
      },
    })
  assert.equal(unchangedReapplyAttachment.ok, false)
  if (!unchangedReapplyAttachment.ok) {
    assert.equal(unchangedReapplyAttachment.status,
      'successor-attachment-mismatch')
  }
})

function identityInput(
  operation: 'apply',
): Extract<CaseInsertPresetApplicationAdoptionIdentityInput, {
  operation: 'apply'
}>
function identityInput(
  operation: 'reapply',
): Extract<CaseInsertPresetApplicationAdoptionIdentityInput, {
  operation: 'reapply'
}>
function identityInput(
  operation: 'detach',
): Extract<CaseInsertPresetApplicationAdoptionIdentityInput, {
  operation: 'detach'
}>
function identityInput(
  operation: 'apply' | 'reapply' | 'detach',
): CaseInsertPresetApplicationAdoptionIdentityInput
function identityInput(
  operation: 'apply' | 'reapply' | 'detach',
): CaseInsertPresetApplicationAdoptionIdentityInput {
  const attachedConfigurationIdentity =
    'case:preset-applied-configuration:v1:fixture'
  const replacementConfigurationIdentity =
    'case:preset-applied-configuration:v1:replacement'
  const attached = {
    status: 'attached' as const,
    attachmentIdentity: `${CASE_INSERT_PRESET_ATTACHED_IDENTITY_PREFIX}${
      encodeCaseInsertPresetDeterministicIdentity({
        configurationIdentity: attachedConfigurationIdentity,
      })
    }`,
    configurationIdentity: attachedConfigurationIdentity,
  }
  const replacement = {
    status: 'attached' as const,
    attachmentIdentity: `${CASE_INSERT_PRESET_ATTACHED_IDENTITY_PREFIX}${
      encodeCaseInsertPresetDeterministicIdentity({
        configurationIdentity: replacementConfigurationIdentity,
      })
    }`,
    configurationIdentity: replacementConfigurationIdentity,
  }
  const common = {
    consumedTransitionIdentity: `case:preset-${operation}-transition:v2:fixture`,
    consumedWholeSuccessIdentity:
      `case:preset-transition-whole-success:v1:${operation}-fixture`,
    sourceApplicationStateIdentity:
      'case:preset-application-state:v1:source',
    successorApplicationStateIdentity:
      `case:preset-application-state:v1:${operation}-successor`,
    sourceAggregateIdentity: 'case:aggregate:v1:source',
    resultAggregateIdentity: operation === 'detach'
      ? 'case:aggregate:v1:source'
      : 'case:aggregate:v1:result',
    sourceConfigurationIdentity: operation === 'apply'
      ? null
      : attachedConfigurationIdentity,
    successorConfigurationIdentity: operation === 'detach'
      ? null
      : operation === 'apply'
        ? attachedConfigurationIdentity
        : replacementConfigurationIdentity,
    configurationReleaseIdentity: operation === 'detach'
      ? 'case:preset-detach-configuration-release:v1:fixture'
      : null,
  }
  const sourceContext = {
    projectKind: 'caseInsert' as const,
    sessionId: 'receipt-session',
    projectRevision: 91,
    template: { id: 'jewelCase', revision: null },
  }
  const successorContext = {
    projectKind: 'caseInsert' as const,
    sessionId: 'receipt-session',
    projectRevision: 92,
    template: { id: 'jewelCase', revision: null },
  }
  if (operation === 'apply') return {
    ...common,
    operation,
    source: {
      ...sourceContext,
      attachment: {
        status: 'unattached',
        attachmentIdentity: CASE_INSERT_PRESET_UNATTACHED_IDENTITY,
      },
    },
    successor: {
      ...successorContext,
      attachment: attached,
    },
    aggregateAdoptionClassification: 'exact-transition-result',
    attachmentAction: 'attached',
  }
  if (operation === 'reapply') return {
    ...common,
    operation,
    source: { ...sourceContext, attachment: attached },
    successor: { ...successorContext, attachment: replacement },
    aggregateAdoptionClassification: 'exact-transition-result',
    attachmentAction: 'replaced',
  }
  return {
    ...common,
    operation,
    source: { ...sourceContext, attachment: attached },
    successor: {
      ...successorContext,
      attachment: {
        status: 'unattached',
        attachmentIdentity: CASE_INSERT_PRESET_UNATTACHED_IDENTITY,
      },
    },
    aggregateAdoptionClassification:
      'exact-unchanged-semantic-transition-result',
    attachmentAction: 'released',
  }
}

test('adoption identity projection is deterministic but is not a receipt', () => {
  for (const operation of ['apply', 'reapply', 'detach'] as const) {
    const input = identityInput(operation)
    const first = projectCaseInsertPresetApplicationAdoptionIdentity(input)
    const second = projectCaseInsertPresetApplicationAdoptionIdentity(
      structuredClone(input),
    )
    assert.equal(first.ok, true)
    assert.deepEqual(first, second)
    if (first.ok) {
      assert.match(first.adoptionIdentity,
        /^case:preset-application-adoption:v1:/)
      assert.equal('receipt' in first, false)
      assert.equal('state' in first, false)
    }
  }

  const changed = structuredClone(identityInput('apply'))
  changed.resultAggregateIdentity = 'case:aggregate:v1:different'
  const original = projectCaseInsertPresetApplicationAdoptionIdentity(
    identityInput('apply'),
  )
  const changedResult = projectCaseInsertPresetApplicationAdoptionIdentity(
    changed,
  )
  assert.equal(original.ok, true)
  assert.equal(changedResult.ok, true)
  if (original.ok && changedResult.ok) {
    assert.notEqual(original.adoptionIdentity, changedResult.adoptionIdentity)
  }

  const badEdge = structuredClone(identityInput('detach')) as MutableRecord
  badEdge.attachmentAction = 'attached'
  const badEdgeResult = projectCaseInsertPresetApplicationAdoptionIdentity(
    badEdge,
  )
  assert.equal(badEdgeResult.ok, false)
  if (!badEdgeResult.ok) {
    assert.equal(badEdgeResult.status, 'unsupported-state-transition')
    assert.equal('adoptionIdentity' in badEdgeResult, false)
  }

  const forgedAttachment = structuredClone(identityInput('apply')) as
    MutableRecord
  const forgedSuccessor = forgedAttachment.successor as MutableRecord
  const forgedReference = forgedSuccessor.attachment as MutableRecord
  forgedReference.attachmentIdentity =
    'case:preset-attachment:v1:attached:forged'
  const forgedAttachmentResult =
    projectCaseInsertPresetApplicationAdoptionIdentity(forgedAttachment)
  assert.equal(forgedAttachmentResult.ok, false)
  if (!forgedAttachmentResult.ok) {
    assert.equal(forgedAttachmentResult.status, 'invalid-adoption-model')
  }

  const substitutedDetachAggregate = structuredClone(
    identityInput('detach'),
  ) as MutableRecord
  substitutedDetachAggregate.resultAggregateIdentity =
    'case:aggregate:v1:substituted'
  const substitutedDetachResult =
    projectCaseInsertPresetApplicationAdoptionIdentity(
      substitutedDetachAggregate,
    )
  assert.equal(substitutedDetachResult.ok, false)
  if (!substitutedDetachResult.ok) {
    assert.equal(substitutedDetachResult.status, 'application-context-mismatch')
  }

  const unchangedReapply = structuredClone(identityInput('reapply')) as
    MutableRecord
  const unchangedReapplySource = unchangedReapply.source as MutableRecord
  const unchangedReapplySuccessor = unchangedReapply.successor as MutableRecord
  unchangedReapplySuccessor.attachment = structuredClone(
    unchangedReapplySource.attachment,
  )
  const unchangedReapplyResult =
    projectCaseInsertPresetApplicationAdoptionIdentity(unchangedReapply)
  assert.equal(unchangedReapplyResult.ok, false)
  if (!unchangedReapplyResult.ok) {
    assert.equal(unchangedReapplyResult.status, 'unsupported-state-transition')
  }
})

test('receipt schema records atomicity and explicit non-persistence', () => {
  const applyInput = identityInput('apply')
  const reapplyInput = identityInput('reapply')
  const detachInput = identityInput('detach')
  const applyProjection = projectCaseInsertPresetApplicationAdoptionIdentity(
    applyInput,
  )
  const reapplyProjection = projectCaseInsertPresetApplicationAdoptionIdentity(
    reapplyInput,
  )
  const detachProjection = projectCaseInsertPresetApplicationAdoptionIdentity(
    detachInput,
  )
  assert.equal(applyProjection.ok, true)
  assert.equal(reapplyProjection.ok, true)
  assert.equal(detachProjection.ok, true)
  if (!applyProjection.ok || !reapplyProjection.ok || !detachProjection.ok) {
    return
  }

  function commonReceiptFields(
    input: CaseInsertPresetApplicationAdoptionIdentityInput,
    adoptionIdentity: string,
  ) {
    return {
      kind: CASE_INSERT_PRESET_APPLICATION_ADOPTION_RECEIPT_KIND,
      formatVersion: CASE_INSERT_PRESET_APPLICATION_ADOPTION_RECEIPT_VERSION,
      adoptionIdentity,
      consumedTransitionIdentity: input.consumedTransitionIdentity,
      consumedWholeSuccessIdentity: input.consumedWholeSuccessIdentity,
      sourceApplicationStateIdentity: input.sourceApplicationStateIdentity,
      successorApplicationStateIdentity:
        input.successorApplicationStateIdentity,
      sourceAggregateIdentity: input.sourceAggregateIdentity,
      resultAggregateIdentity: input.resultAggregateIdentity,
      sourceConfigurationIdentity: input.sourceConfigurationIdentity,
      successorConfigurationIdentity: input.successorConfigurationIdentity,
      configurationReleaseIdentity: input.configurationReleaseIdentity,
      sourceApplicationContext: {
        projectKind: input.source.projectKind,
        sessionId: input.source.sessionId,
        projectRevision: input.source.projectRevision,
        template: input.source.template,
      },
      successorApplicationContext: {
        projectKind: input.successor.projectKind,
        sessionId: input.successor.sessionId,
        projectRevision: input.successor.projectRevision,
        template: input.successor.template,
      },
      sourceProjectRevision: input.source.projectRevision,
      successorProjectRevision: input.successor.projectRevision,
      applicationAdoptionStatus: 'adopted' as const,
      atomicityProof: {
        aggregateAndAttachment:
          'one-coherent-application-domain-state' as const,
        partialSuccess: false as const,
      },
      persistence: { status: 'not-persisted' as const },
      exclusions: {
        projectSchema: 'not-changed' as const,
        saveLoad: 'not-integrated' as const,
        store: 'not-integrated' as const,
        ui: 'not-integrated' as const,
        catalog: 'not-installed' as const,
        runtime: 'not-integrated' as const,
      },
    }
  }

  const receipts = [
    deepFreeze({
      ...commonReceiptFields(applyInput, applyProjection.adoptionIdentity),
      operation: 'apply',
      previousAttachment: applyInput.source.attachment,
      successorAttachment: applyInput.successor.attachment,
      aggregateAdoptionClassification: 'exact-transition-result',
      attachmentAction: 'attached',
    } as const satisfies CaseInsertPresetApplicationAdoptionReceipt),
    deepFreeze({
      ...commonReceiptFields(reapplyInput, reapplyProjection.adoptionIdentity),
      operation: 'reapply',
      previousAttachment: reapplyInput.source.attachment,
      successorAttachment: reapplyInput.successor.attachment,
      aggregateAdoptionClassification: 'exact-transition-result',
      attachmentAction: 'replaced',
    } as const satisfies CaseInsertPresetApplicationAdoptionReceipt),
    deepFreeze({
      ...commonReceiptFields(detachInput, detachProjection.adoptionIdentity),
      operation: 'detach',
      previousAttachment: detachInput.source.attachment,
      successorAttachment: detachInput.successor.attachment,
      aggregateAdoptionClassification:
        'exact-unchanged-semantic-transition-result',
      attachmentAction: 'released',
    } as const satisfies CaseInsertPresetApplicationAdoptionReceipt),
  ]
  assert.deepEqual(receipts.map(({ attachmentAction }) => attachmentAction), [
    'attached', 'replaced', 'released',
  ])
  for (const receipt of receipts) {
    assert.equal(receipt.atomicityProof.partialSuccess, false)
    assert.equal(receipt.persistence.status, 'not-persisted')
    assert.equal(receipt.exclusions.projectSchema, 'not-changed')
    assert.equal(isDeeplyFrozen(receipt), true)
  }
})

test('model exports no executor and has no forbidden runtime dependency', () => {
  const source = readFileSync(
    new URL('./caseInsertPresetConfigurationAdoptionModel.ts', import.meta.url),
    'utf8',
  )
  assert.doesNotMatch(source, /export function adoptCaseInsertPreset/)
  assert.doesNotMatch(source, /from ['"].*(ApplyPlanning|ReapplyPlanning|DetachPlanning)/)
  assert.doesNotMatch(source, /from ['"].*AssignmentResolution/)
  assert.doesNotMatch(source, /from ['"].*PresetCompatibility/)
  assert.doesNotMatch(source, /from ['"].*PresetCatalog/)
  assert.doesNotMatch(source, /from ['"].*AggregateFieldTransition/)
  assert.doesNotMatch(source, /from ['"].*(applicationLifecycle|projectSession)/)
  assert.doesNotMatch(source, /from ['"].*(React|react|tauri|renderer|export)/)
  assert.doesNotMatch(source,
    /\b(?:applyCaseInsertPresetFirstTime|transitionCaseInsertPresetReapply|transitionCaseInsertPresetDetach|detectCaseInsertPresetCustomization|resolveCaseInsertPresetAssignments|evaluateCaseInsertPresetCompatibility|applyCaseInsertPresetAggregateLayoutWrites)\s*\(/)
  assert.doesNotMatch(source, /JSON\.stringify|Date\.now|randomUUID/)
  assert.match(source,
    /CASE_INSERT_PRESET_VALIDATED_APPLICATION_ADOPTION_EVIDENCE/)
  assert.match(source,
    /declare const CASE_INSERT_PRESET_COHERENT_ADOPTION_SUCCESS/)
  assert.equal(CASE_INSERT_PRESET_CATALOG.list().length, 0)
})
