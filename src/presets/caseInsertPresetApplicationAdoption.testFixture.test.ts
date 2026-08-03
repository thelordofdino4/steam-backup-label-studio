import assert from 'node:assert/strict'

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
  createCaseInsertPresetUnattachedEndpoint,
} from './caseInsertPresetAttachmentEndpoint.ts'
import {
  createCaseInsertPresetCatalog,
} from './caseInsertPresetCatalog.ts'
import {
  CASE_INSERT_PRESET_ADOPTION_EVIDENCE_CANDIDATE_KIND,
  CASE_INSERT_PRESET_ADOPTION_EVIDENCE_CANDIDATE_VERSION,
  auditCaseInsertPresetApplicationAdoptionEvidence,
  createCaseInsertPresetApplicationSnapshot,
  createCaseInsertPresetAttachedState,
  createCaseInsertPresetUnattachedState,
  type CaseInsertPresetApplicationAdoptionEvidence,
  type CaseInsertPresetApplicationSnapshot,
} from './caseInsertPresetConfigurationAdoptionModel.ts'
import {
  planCaseInsertPresetDetach,
} from './caseInsertPresetDetachPlanning.ts'
import {
  createCaseInsertPresetDetachReviewAcceptance,
  transitionCaseInsertPresetDetach,
  type CaseInsertPresetDetachTransitionResult,
} from './caseInsertPresetDetachTransition.ts'
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
  createCoordinatedCaseInsertPresetDefinition,
} from './caseInsertPresetTestFixtures.ts'

export type CaseInsertPresetApplicationAdoptionFixture = Readonly<{
  sourceRevision: number
  sourceSnapshot: CaseInsertPresetAssignmentSnapshot
  firstSnapshot: CaseInsertPresetAssignmentSnapshot
  nextSnapshot: CaseInsertPresetAssignmentSnapshot
  sourceApplication: CaseInsertPresetApplicationSnapshot
  firstApplication: CaseInsertPresetApplicationSnapshot
  apply: Extract<CaseInsertPresetApplyTransitionResult, { ok: true }>
  reapply: Extract<CaseInsertPresetReapplyTransitionResult, { ok: true }>
  detach: Extract<CaseInsertPresetDetachTransitionResult, { ok: true }>
  applyEvidence: Extract<
    CaseInsertPresetApplicationAdoptionEvidence,
    { operation: 'apply' }
  >
  reapplyEvidence: Extract<
    CaseInsertPresetApplicationAdoptionEvidence,
    { operation: 'reapply' }
  >
  detachEvidence: Extract<
    CaseInsertPresetApplicationAdoptionEvidence,
    { operation: 'detach' }
  >
  firstConfiguration: CaseInsertAppliedPresetConfiguration
  nextConfiguration: CaseInsertAppliedPresetConfiguration
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

function auditEvidence(
  operation: 'apply' | 'reapply' | 'detach',
  transitionResult:
    | Extract<CaseInsertPresetApplyTransitionResult, { ok: true }>
    | Extract<CaseInsertPresetReapplyTransitionResult, { ok: true }>
    | Extract<CaseInsertPresetDetachTransitionResult, { ok: true }>,
) {
  const audited = auditCaseInsertPresetApplicationAdoptionEvidence({
    kind: CASE_INSERT_PRESET_ADOPTION_EVIDENCE_CANDIDATE_KIND,
    formatVersion: CASE_INSERT_PRESET_ADOPTION_EVIDENCE_CANDIDATE_VERSION,
    operation,
    applicationAdoptionStatus: 'not-adopted',
    transitionResult,
  })
  assert.equal(audited.ok, true)
  if (!audited.ok) throw new Error(`${audited.status}:${audited.code}`)
  return audited.evidence
}

function applicationSnapshot(
  snapshot: CaseInsertPresetAssignmentSnapshot,
  attachment: ReturnType<typeof createCaseInsertPresetUnattachedState> |
    CaseInsertAppliedPresetConfiguration,
) {
  const state = 'configurationIdentity' in attachment
    ? createCaseInsertPresetAttachedState(attachment)
    : { ok: true as const, state: attachment }
  assert.equal(state.ok, true)
  if (!state.ok) throw new Error(state.code)
  const application = createCaseInsertPresetApplicationSnapshot({
    snapshot,
    attachment: state.state,
  })
  assert.equal(application.ok, true)
  if (!application.ok) throw new Error(application.code)
  return application.value
}

export function buildCaseInsertPresetApplicationAdoptionFixture(
  sessionId = 'application-adoption-transition-session',
): CaseInsertPresetApplicationAdoptionFixture {
  const catalog = createCaseInsertPresetCatalog({
    builtins: [createCoordinatedCaseInsertPresetDefinition()],
  })
  assert.equal(catalog.ok, true)
  if (!catalog.ok) throw new Error(catalog.error.code)
  const summary = catalog.catalog.list()[0]!
  const definition = catalog.catalog.getExact(summary.id, summary.revision)!
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
    reviewApproval: createCaseInsertPresetApplyReviewApproval(applyPlan.plan),
    materialConsentAcceptances:
      applyPlan.plan.materialConsentRequirements.map(({ id }) =>
        createCaseInsertPresetMaterialConsentAcceptance(
          applyPlan.plan,
          id,
        )) as CaseInsertPresetMaterialConsentAcceptance[],
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
  const firstSnapshot = buildSnapshot(firstAggregate, sessionId, firstRevision)
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
  const sourceApplication = applicationSnapshot(
    sourceSnapshot,
    createCaseInsertPresetUnattachedState(),
  )
  const firstApplication = applicationSnapshot(
    firstSnapshot,
    firstConfiguration.configuration,
  )
  return deepFreeze({
    sourceRevision,
    sourceSnapshot,
    firstSnapshot,
    nextSnapshot,
    sourceApplication,
    firstApplication,
    apply,
    reapply,
    detach,
    applyEvidence: auditEvidence('apply', apply) as Extract<
      CaseInsertPresetApplicationAdoptionEvidence,
      { operation: 'apply' }
    >,
    reapplyEvidence: auditEvidence('reapply', reapply) as Extract<
      CaseInsertPresetApplicationAdoptionEvidence,
      { operation: 'reapply' }
    >,
    detachEvidence: auditEvidence('detach', detach) as Extract<
      CaseInsertPresetApplicationAdoptionEvidence,
      { operation: 'detach' }
    >,
    firstConfiguration: firstConfiguration.configuration,
    nextConfiguration: reapply.nextConfiguration,
  })
}
