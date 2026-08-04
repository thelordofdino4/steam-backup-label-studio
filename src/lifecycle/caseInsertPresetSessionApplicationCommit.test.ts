import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  normalizeProjectJewelCaseState,
} from '../caseInsert/normalization.ts'
import {
  createCaseInsertPresetAssignmentSnapshot,
} from '../caseInsert/presetAssignmentSnapshot.ts'
import { createBlankDiscSavedProject } from '../project/blankDiscProject.ts'
import {
  createBlankJewelCaseSavedProject,
} from '../project/caseInsertProjectAdapters.ts'
import type {
  SavedCaseInsertProject,
} from '../project/projectTypes.ts'
import {
  CASE_INSERT_PRESET_APPLICATION_ADOPTION_TRANSITION_KIND,
  CASE_INSERT_PRESET_APPLICATION_ADOPTION_TRANSITION_VERSION,
  CASE_INSERT_PRESET_VALIDATED_ADOPTION_SUCCESS_BUNDLE_KIND,
  CASE_INSERT_PRESET_VALIDATED_ADOPTION_SUCCESS_BUNDLE_VERSION,
  auditCaseInsertPresetValidatedAdoptionSuccessBundle,
  transitionCaseInsertPresetApplicationAdoption,
  type CaseInsertPresetApplicationAdoptionTransitionResult,
  type CaseInsertPresetValidatedAdoptionSuccessBundle,
} from '../presets/caseInsertPresetApplicationAdoptionTransition.ts'
import {
  buildCaseInsertPresetApplicationAdoptionFixture,
} from '../presets/caseInsertPresetApplicationAdoption.testFixture.test.ts'
import {
  applyCaseInsertPresetFirstTime,
  createCaseInsertPresetApplyReviewApproval,
  createCaseInsertPresetMaterialConsentAcceptance,
  type CaseInsertPresetMaterialConsentAcceptance,
} from '../presets/caseInsertPresetApplyTransition.ts'
import {
  planCaseInsertPresetFirstApply,
} from '../presets/caseInsertPresetApplyPlanning.ts'
import {
  resolveCaseInsertPresetAssignments,
} from '../presets/caseInsertPresetAssignmentResolution.ts'
import {
  createCaseInsertPresetCatalog,
} from '../presets/caseInsertPresetCatalog.ts'
import {
  CASE_INSERT_PRESET_ADOPTION_EVIDENCE_CANDIDATE_KIND,
  CASE_INSERT_PRESET_ADOPTION_EVIDENCE_CANDIDATE_VERSION,
  auditCaseInsertPresetApplicationAdoptionEvidence,
  createCaseInsertPresetApplicationSnapshot,
  createCaseInsertPresetUnattachedState,
  type CaseInsertPresetApplicationAdoptionEvidence,
  type CaseInsertPresetApplicationAdoptionOperation,
  type CaseInsertPresetApplicationSnapshot,
  type CaseInsertPresetAttachmentState,
} from '../presets/caseInsertPresetConfigurationAdoptionModel.ts'
import {
  createCoordinatedCaseInsertPresetDefinition,
} from '../presets/caseInsertPresetTestFixtures.ts'
import {
  detectCaseInsertPresetCustomization,
} from '../presets/caseInsertPresetAppliedConfiguration.ts'
import {
  planCaseInsertPresetReapply,
} from '../presets/caseInsertPresetReapplyPlanning.ts'
import {
  createCaseInsertPresetReapplyConsentAcceptance,
  createCaseInsertPresetReapplyReviewAcceptance,
  transitionCaseInsertPresetReapply,
} from '../presets/caseInsertPresetReapplyTransition.ts'
import {
  sameCaseInsertPresetValue,
} from '../presets/caseInsertPresetSafeInput.ts'
import {
  captureNormalizedProjectSnapshot,
  normalizedProjectSnapshotsAreExactlyEqual,
} from './canonicalProject.ts'
import {
  commitCaseInsertPresetSessionApplication,
  prepareCaseInsertPresetSessionAdoptionCommit,
  type CaseInsertPresetSessionAdoptionCommitSnapshot,
} from './caseInsertPresetSessionApplicationCommit.ts'
import {
  representCaseInsertPresetApplicationSnapshot,
} from './caseInsertPresetSessionApplication.ts'
import {
  captureApplicationLifecycleState,
  createLoadedProjectSession,
  createNewProjectSession,
  isProjectSessionDirty,
  replaceActiveProjectContent,
  type ApplicationLifecycleState,
  type CaseInsertProjectSession,
} from './projectSession.ts'

type AdoptionSuccess = Exclude<
  CaseInsertPresetApplicationAdoptionTransitionResult,
  { ok: false }
>
type MutableRecord = Record<string, unknown>

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

function requireCaseSession(
  state: ApplicationLifecycleState,
): CaseInsertProjectSession {
  const session = state.activeSession
  assert.ok(session)
  assert.equal(session.kind, 'caseInsert')
  if (!session || session.kind !== 'caseInsert') {
    throw new Error('Expected a Case Insert project session.')
  }
  return session
}

function projectForApplication(
  application: CaseInsertPresetApplicationSnapshot,
  title = 'Preset lifecycle commit',
): SavedCaseInsertProject {
  const project = createBlankJewelCaseSavedProject()
  project.title = title
  project.game.manualTitle = title
  project.caseInsert = structuredClone(application.snapshot.caseInsert)
  return project
}

function sessionForApplication(
  application: CaseInsertPresetApplicationSnapshot,
  contentRevision = 13,
): CaseInsertProjectSession {
  const project = projectForApplication(application)
  const state = createLoadedProjectSession({
    sessionId: application.snapshot.identity.sessionId,
    currentPath: 'C:\\projects\\preset-lifecycle-commit.sbls',
    persistenceFormat: 'sbls-package-v1',
    project,
  })
  const initial = requireCaseSession(state)
  const represented = representCaseInsertPresetApplicationSnapshot({
    sessionId: initial.id,
    project: initial.project,
    snapshot: application,
  })
  assert.equal(represented.ok, true)
  if (!represented.ok) throw new Error(represented.detail)
  return requireCaseSession(captureApplicationLifecycleState({
    activeSession: {
      ...initial,
      revision: contentRevision,
      caseInsertPresetApplication: represented.application,
    },
    visibleWorkspace: 'home',
  }))
}

function adoptionResult(
  operation: CaseInsertPresetApplicationAdoptionOperation,
  current: CaseInsertPresetApplicationSnapshot,
  evidence: CaseInsertPresetApplicationAdoptionEvidence,
): AdoptionSuccess {
  const result = transitionCaseInsertPresetApplicationAdoption({
    kind: CASE_INSERT_PRESET_APPLICATION_ADOPTION_TRANSITION_KIND,
    formatVersion:
      CASE_INSERT_PRESET_APPLICATION_ADOPTION_TRANSITION_VERSION,
    operation,
    current,
    evidence,
  })
  assert.equal(result.ok, true)
  if (!result.ok) throw new Error(`${result.status}:${result.code}`)
  return result
}

function validatedAdoptionBundle(
  current: CaseInsertPresetApplicationSnapshot,
  evidence: CaseInsertPresetApplicationAdoptionEvidence,
  adoption: AdoptionSuccess,
): CaseInsertPresetValidatedAdoptionSuccessBundle {
  const audited = auditCaseInsertPresetValidatedAdoptionSuccessBundle({
    kind: CASE_INSERT_PRESET_VALIDATED_ADOPTION_SUCCESS_BUNDLE_KIND,
    formatVersion:
      CASE_INSERT_PRESET_VALIDATED_ADOPTION_SUCCESS_BUNDLE_VERSION,
    operation: adoption.operation,
    current,
    evidence,
    adoption,
  })
  assert.equal(audited.ok, true, JSON.stringify(audited))
  if (!audited.ok) throw new Error(`${audited.status}:${audited.code}`)
  return audited.bundle
}

function prepare(
  session: CaseInsertProjectSession,
  adoptionBundle: CaseInsertPresetValidatedAdoptionSuccessBundle,
): CaseInsertPresetSessionAdoptionCommitSnapshot {
  const prepared = prepareCaseInsertPresetSessionAdoptionCommit({
    sourceSession: session,
    adoptionBundle,
  })
  assert.equal(prepared.ok, true, JSON.stringify(prepared))
  if (!prepared.ok) throw new Error(`${prepared.status}:${prepared.code}`)
  return prepared.snapshot
}

function assertFailureHasNoPartialOutput(value: unknown) {
  assert.equal(typeof value, 'object')
  assert.ok(value)
  const failure = value as MutableRecord
  assert.equal(failure.ok, false)
  for (const forbidden of [
    'session',
    'successorSession',
    'project',
    'aggregate',
    'companion',
    'attachment',
    'configuration',
    'receipt',
    'snapshot',
  ]) {
    assert.equal(forbidden in failure, false, forbidden)
  }
  assert.equal(isDeeplyFrozen(failure), true)
}

function operationFixture(
  operation: CaseInsertPresetApplicationAdoptionOperation,
  contentRevision = 13,
) {
  const fixture = buildCaseInsertPresetApplicationAdoptionFixture(
    `lifecycle-commit-${operation}`,
  )
  const currentApplication = operation === 'apply'
    ? fixture.sourceApplication
    : fixture.firstApplication
  const evidence = operation === 'apply'
    ? fixture.applyEvidence
    : operation === 'reapply'
      ? fixture.reapplyEvidence
      : fixture.detachEvidence
  const source = sessionForApplication(currentApplication, contentRevision)
  const adoption = adoptionResult(operation, currentApplication, evidence)
  const adoptionBundle = validatedAdoptionBundle(
    currentApplication,
    evidence,
    adoption,
  )
  return {
    fixture,
    source,
    evidence,
    adoption,
    adoptionBundle,
    snapshot: prepare(source, adoptionBundle),
  }
}

function attachmentOnlyApplyFixture(
  options: Readonly<{
    sessionId?: string
    applicationRevision?: number
    contentRevision?: number
  }> = {},
) {
  const seed = buildCaseInsertPresetApplicationAdoptionFixture(
    'attachment-only-apply-seed',
  )
  const sessionId = options.sessionId ?? 'attachment-only-apply-session'
  const applicationRevision = options.applicationRevision ?? 90
  const project = createBlankJewelCaseSavedProject()
  project.caseInsert = normalizeProjectJewelCaseState(
    structuredClone(seed.apply.aggregate),
  )
  const normalizedProject = captureNormalizedProjectSnapshot(project)
  const assignment = createCaseInsertPresetAssignmentSnapshot({
    sessionId,
    projectRevision: applicationRevision,
    project: normalizedProject,
  })
  assert.equal(assignment.ok, true)
  if (!assignment.ok) throw new Error(assignment.error.code)

  const catalog = createCaseInsertPresetCatalog({
    builtins: [createCoordinatedCaseInsertPresetDefinition()],
  })
  assert.equal(catalog.ok, true)
  if (!catalog.ok) throw new Error(catalog.error.code)
  const summary = catalog.catalog.list()[0]!
  const definition = catalog.catalog.getExact(summary.id, summary.revision)!
  const scope = { kind: 'complete' as const }
  const resolution = resolveCaseInsertPresetAssignments({
    catalog: catalog.catalog,
    reference: { id: definition.id, revision: definition.revision },
    requestedScope: scope,
    snapshot: assignment.value,
    expectedSnapshotIdentity: assignment.value.identity,
  })
  assert.equal(resolution.ok, true)
  if (!resolution.ok) throw new Error(resolution.status)
  const plan = planCaseInsertPresetFirstApply({
    operation: 'apply',
    resolution,
    expected: {
      projectKind: 'caseInsert',
      preset: { id: definition.id, revision: definition.revision },
      requestedScope: scope,
      snapshotIdentity: assignment.value.identity,
    },
  })
  assert.equal(plan.ok, true)
  if (!plan.ok) throw new Error(plan.status)
  const applied = applyCaseInsertPresetFirstTime({
    planningResult: plan,
    source: {
      projectKind: 'caseInsert',
      aggregate: structuredClone(project.caseInsert),
      snapshotIdentity: assignment.value.identity,
      preset: { id: definition.id, revision: definition.revision },
      requestedScope: scope,
    },
    attachment: createCaseInsertPresetUnattachedState(),
    reviewApproval: createCaseInsertPresetApplyReviewApproval(plan.plan),
    materialConsentAcceptances:
      plan.plan.materialConsentRequirements.map(({ id }) =>
        createCaseInsertPresetMaterialConsentAcceptance(
          plan.plan,
          id,
        )) as CaseInsertPresetMaterialConsentAcceptance[],
  })
  assert.equal(applied.ok, true)
  if (!applied.ok) throw new Error(`${applied.status}:${applied.code}`)
  assert.equal(sameCaseInsertPresetValue(
    assignment.value.caseInsert,
    applied.aggregate,
  ), true)

  const audited = auditCaseInsertPresetApplicationAdoptionEvidence({
    kind: CASE_INSERT_PRESET_ADOPTION_EVIDENCE_CANDIDATE_KIND,
    formatVersion: CASE_INSERT_PRESET_ADOPTION_EVIDENCE_CANDIDATE_VERSION,
    operation: 'apply',
    applicationAdoptionStatus: 'not-adopted',
    transitionResult: applied,
  })
  assert.equal(audited.ok, true)
  if (!audited.ok) throw new Error(`${audited.status}:${audited.code}`)
  const sourceApplication = createCaseInsertPresetApplicationSnapshot({
    snapshot: assignment.value,
    attachment: createCaseInsertPresetUnattachedState(),
  })
  assert.equal(sourceApplication.ok, true)
  if (!sourceApplication.ok) throw new Error(sourceApplication.code)
  const adoption = adoptionResult(
    'apply',
    sourceApplication.value,
    audited.evidence,
  )
  const adoptionBundle = validatedAdoptionBundle(
    sourceApplication.value,
    audited.evidence,
    adoption,
  )
  const source = sessionForApplication(
    sourceApplication.value,
    options.contentRevision ?? 55,
  )
  return {
    source,
    evidence: audited.evidence,
    adoption,
    adoptionBundle,
    snapshot: prepare(source, adoptionBundle),
  }
}

function aggregateChangingReapplyFixture() {
  const fixture = buildCaseInsertPresetApplicationAdoptionFixture(
    'aggregate-changing-reapply-session',
  )
  const current = fixture.firstApplication
  const selectedDefinition = structuredClone(
    createCoordinatedCaseInsertPresetDefinition(),
  ) as unknown as MutableRecord
  selectedDefinition.revision = 2
  for (const slot of selectedDefinition.slots as MutableRecord[]) {
    for (const assignment of slot.assignments as MutableRecord[]) {
      const region = assignment.contentRegion as MutableRecord
      region.centerXPercent = (region.centerXPercent as number) + 1
    }
  }

  const customization = detectCaseInsertPresetCustomization({
    configuration: fixture.firstConfiguration,
    current: {
      projectKind: 'caseInsert',
      aggregate: current.snapshot.caseInsert,
      sessionId: current.snapshot.identity.sessionId,
      projectRevision: current.snapshot.identity.projectRevision,
      template: fixture.firstConfiguration.template,
    },
  })
  assert.equal(customization.ok, true)
  if (!customization.ok) throw new Error(customization.code)
  const planning = planCaseInsertPresetReapply({
    operation: 'reapply',
    configuration: fixture.firstConfiguration,
    customizationReport: customization,
    current: {
      projectKind: 'caseInsert',
      aggregate: current.snapshot.caseInsert,
      sessionId: current.snapshot.identity.sessionId,
      projectRevision: current.snapshot.identity.projectRevision,
      template: fixture.firstConfiguration.template,
      snapshot: current.snapshot,
    },
    selectedDefinition,
    customizedFieldPolicies: [],
  })
  assert.equal(planning.ok, true, JSON.stringify(planning))
  if (!planning.ok) throw new Error(`${planning.status}:${planning.code}`)
  const reapply = transitionCaseInsertPresetReapply({
    operation: 'reapply',
    plan: planning.plan,
    sourceConfiguration: fixture.firstConfiguration,
    customizationReport: customization,
    reviewAcceptance:
      createCaseInsertPresetReapplyReviewAcceptance(planning.plan),
    materialConsentAcceptances:
      planning.plan.materialConsentRequirements.map(({ id }) =>
        createCaseInsertPresetReapplyConsentAcceptance(planning.plan, id)!),
    current: {
      projectKind: 'caseInsert',
      aggregate: current.snapshot.caseInsert,
      sessionId: current.snapshot.identity.sessionId,
      projectRevision: current.snapshot.identity.projectRevision,
      template: fixture.firstConfiguration.template,
    },
  })
  assert.equal(reapply.ok, true, JSON.stringify(reapply))
  if (!reapply.ok) throw new Error(`${reapply.status}:${reapply.code}`)
  assert.equal(reapply.status, 'reapplied')
  assert.equal(sameCaseInsertPresetValue(
    current.snapshot.caseInsert,
    reapply.aggregate,
  ), false)

  const audited = auditCaseInsertPresetApplicationAdoptionEvidence({
    kind: CASE_INSERT_PRESET_ADOPTION_EVIDENCE_CANDIDATE_KIND,
    formatVersion: CASE_INSERT_PRESET_ADOPTION_EVIDENCE_CANDIDATE_VERSION,
    operation: 'reapply',
    applicationAdoptionStatus: 'not-adopted',
    transitionResult: reapply,
  })
  assert.equal(audited.ok, true)
  if (!audited.ok) throw new Error(`${audited.status}:${audited.code}`)
  const adoption = adoptionResult('reapply', current, audited.evidence)
  const adoptionBundle = validatedAdoptionBundle(
    current,
    audited.evidence,
    adoption,
  )
  const source = sessionForApplication(current, 41)
  return {
    source,
    adoption,
    snapshot: prepare(source, adoptionBundle),
  }
}

function applicationAtRevision(
  session: CaseInsertProjectSession,
  applicationRevision: number,
  attachment: CaseInsertPresetAttachmentState,
) {
  const assignment = createCaseInsertPresetAssignmentSnapshot({
    sessionId: session.id,
    projectRevision: applicationRevision,
    project: captureNormalizedProjectSnapshot(
      session.project as unknown as SavedCaseInsertProject,
    ),
  })
  assert.equal(assignment.ok, true)
  if (!assignment.ok) throw new Error(assignment.error.code)
  const application = createCaseInsertPresetApplicationSnapshot({
    snapshot: assignment.value,
    attachment,
  })
  assert.equal(application.ok, true)
  if (!application.ok) throw new Error(application.code)
  return application.value
}

function sessionWithApplication(
  session: CaseInsertProjectSession,
  application: CaseInsertPresetApplicationSnapshot,
): CaseInsertProjectSession {
  const represented = representCaseInsertPresetApplicationSnapshot({
    sessionId: session.id,
    project: session.project,
    snapshot: application,
  })
  assert.equal(represented.ok, true)
  if (!represented.ok) throw new Error(represented.detail)
  return requireCaseSession(captureApplicationLifecycleState({
    activeSession: {
      ...session,
      caseInsertPresetApplication: represented.application,
    },
    visibleWorkspace: 'home',
  }))
}

test('Apply atomically commits the exact aggregate, companion, receipt, and one revision advance', () => {
  const { source, evidence, adoption, snapshot } = operationFixture('apply')
  const result = commitCaseInsertPresetSessionApplication({
    currentSession: source,
    successorSnapshot: snapshot,
  })
  assert.equal(result.ok, true)
  if (!result.ok) throw new Error(`${result.status}:${result.code}`)

  assert.equal(result.operation, 'apply')
  assert.deepEqual(result.session.project.caseInsert,
    adoption.state.snapshot.caseInsert)
  assert.equal(result.session.revision, source.revision + 1)
  assert.equal(result.session.revision, snapshot.successorSession.revision)
  assert.equal(
    result.session.caseInsertPresetApplication.applicationRevision,
    adoption.state.snapshot.identity.projectRevision,
  )
  assert.equal(
    result.session.caseInsertPresetApplication.applicationRevision,
    source.caseInsertPresetApplication.applicationRevision + 1,
  )
  assert.deepEqual(
    result.session.caseInsertPresetApplication.attachment,
    adoption.state.attachment,
  )
  assert.deepEqual(
    result.session.caseInsertPresetApplication,
    snapshot.successorSession.caseInsertPresetApplication,
  )
  assert.deepEqual(result.receipt, adoption.receipt)
  assert.equal(result.receipt.attachmentAction, 'attached')
  assert.equal(result.receipt.persistence.status, 'not-persisted')
  assert.equal(evidence.applicationAdoptionStatus, 'not-adopted')
  assert.equal('caseInsert' in result.session.caseInsertPresetApplication, false)
  assert.equal('project' in result.session.caseInsertPresetApplication, false)
  assert.equal('receipt' in result.session.caseInsertPresetApplication, false)
  assert.equal(isDeeplyFrozen(result), true)
  assert.notEqual(result.session, source)
  assert.equal(result.session.currentPath, source.currentPath)
  assert.equal(result.session.persistenceFormat, source.persistenceFormat)
  assert.deepEqual(result.session.cleanBaseline, source.cleanBaseline)
})

test('attachment-only first Apply retains content revision while attaching and advancing application once', () => {
  const { source, evidence, adoption, snapshot } = attachmentOnlyApplyFixture()
  assert.equal(sameCaseInsertPresetValue(
    source.project.caseInsert,
    adoption.state.snapshot.caseInsert,
  ), true)
  const result = commitCaseInsertPresetSessionApplication({
    currentSession: source,
    successorSnapshot: snapshot,
  })
  assert.equal(result.ok, true)
  if (!result.ok) throw new Error(`${result.status}:${result.code}`)

  assert.equal(result.operation, 'apply')
  assert.equal(result.session.revision, source.revision)
  assert.equal(
    result.session.caseInsertPresetApplication.applicationRevision,
    source.caseInsertPresetApplication.applicationRevision + 1,
  )
  assert.equal(normalizedProjectSnapshotsAreExactlyEqual(
    result.session.project,
    source.project,
  ), true)
  assert.equal(result.session.caseInsertPresetApplication.attachment.status,
    'attached')
  assert.equal(result.receipt.attachmentAction, 'attached')
  assert.equal(evidence.applicationAdoptionStatus, 'not-adopted')
})

test('attachment-only Reapply retains content revision and dirty state while advancing application once', () => {
  const { source, adoption, snapshot } = operationFixture('reapply', 21)
  assert.equal(sameCaseInsertPresetValue(
    source.project.caseInsert,
    adoption.state.snapshot.caseInsert,
  ), true)
  const sourceDirty = isProjectSessionDirty(source)
  const result = commitCaseInsertPresetSessionApplication({
    currentSession: source,
    successorSnapshot: snapshot,
  })
  assert.equal(result.ok, true)
  if (!result.ok) throw new Error(`${result.status}:${result.code}`)

  assert.equal(result.operation, 'reapply')
  assert.equal(result.session.revision, source.revision)
  assert.equal(
    result.session.caseInsertPresetApplication.applicationRevision,
    source.caseInsertPresetApplication.applicationRevision + 1,
  )
  assert.equal(
    result.session.caseInsertPresetApplication.applicationRevision,
    adoption.state.snapshot.identity.projectRevision,
  )
  assert.equal(normalizedProjectSnapshotsAreExactlyEqual(
    result.session.project,
    source.project,
  ), true)
  assert.equal(isProjectSessionDirty(result.session), sourceDirty)
  assert.equal(result.receipt.attachmentAction, 'replaced')
  assert.notEqual(
    result.receipt.sourceConfigurationIdentity,
    result.receipt.successorConfigurationIdentity,
  )
})

test('aggregate-changing Reapply advances both revisions exactly once and derives dirty state', () => {
  const { source, adoption, snapshot } = aggregateChangingReapplyFixture()
  assert.equal(isProjectSessionDirty(source), false)

  const result = commitCaseInsertPresetSessionApplication({
    currentSession: source,
    successorSnapshot: snapshot,
  })
  assert.equal(result.ok, true)
  if (!result.ok) throw new Error(`${result.status}:${result.code}`)

  assert.equal(result.operation, 'reapply')
  assert.deepEqual(
    result.session.project.caseInsert,
    adoption.state.snapshot.caseInsert,
  )
  assert.equal(result.session.revision, source.revision + 1)
  assert.equal(
    result.session.caseInsertPresetApplication.applicationRevision,
    source.caseInsertPresetApplication.applicationRevision + 1,
  )
  assert.equal(
    result.session.caseInsertPresetApplication.applicationRevision,
    adoption.state.snapshot.identity.projectRevision,
  )
  assert.equal(
    result.session.caseInsertPresetApplication.attachment.status,
    'attached',
  )
  if (result.session.caseInsertPresetApplication.attachment.status ===
      'attached' && adoption.state.attachment.status === 'attached') {
    assert.deepEqual(
      result.session.caseInsertPresetApplication.attachment.configuration,
      adoption.state.attachment.configuration,
    )
  }
  assert.equal(result.session.id, source.id)
  assert.equal(result.session.currentPath, source.currentPath)
  assert.equal(result.session.persistenceFormat, source.persistenceFormat)
  assert.equal(result.session.displayName, source.displayName)
  assert.deepEqual(result.session.cleanBaseline, source.cleanBaseline)
  assert.deepEqual(result.session.lastEditorRoute, source.lastEditorRoute)
  assert.equal(result.session.project.title, source.project.title)
  assert.deepEqual(result.session.project.game, source.project.game)
  assert.equal(isProjectSessionDirty(result.session), true)
  assert.deepEqual(result.receipt, adoption.receipt)
})

test('aggregate-unchanged Detach remains a committed attachment release, not a no-op', () => {
  const { source, evidence, adoption, snapshot } = operationFixture('detach', 31)
  assert.deepEqual(
    adoption.state.snapshot.caseInsert,
    source.project.caseInsert,
  )
  const result = commitCaseInsertPresetSessionApplication({
    currentSession: source,
    successorSnapshot: snapshot,
  })
  assert.equal(result.ok, true)
  if (!result.ok) throw new Error(`${result.status}:${result.code}`)

  assert.equal(result.operation, 'detach')
  assert.equal(result.session.revision, source.revision)
  assert.equal(
    result.session.caseInsertPresetApplication.applicationRevision,
    source.caseInsertPresetApplication.applicationRevision + 1,
  )
  assert.equal(
    result.session.caseInsertPresetApplication.attachment.status,
    'unattached',
  )
  assert.equal(
    result.session.caseInsertPresetApplication.attachment.attachmentIdentity,
    'case:preset-attachment:v1:unattached',
  )
  assert.equal(result.receipt.attachmentAction, 'released')
  assert.equal(
    result.receipt.aggregateAdoptionClassification,
    'exact-unchanged-semantic-transition-result',
  )
  assert.equal(evidence.applicationAdoptionStatus, 'not-adopted')
  assert.equal(isProjectSessionDirty(result.session), isProjectSessionDirty(source))
})

test('prepared authorization and committed output are detached, deeply immutable, and deterministic', () => {
  const fixture = buildCaseInsertPresetApplicationAdoptionFixture(
    'detached-lifecycle-commit',
  )
  const source = sessionForApplication(fixture.sourceApplication)
  const adoption = adoptionResult(
    'apply',
    fixture.sourceApplication,
    fixture.applyEvidence,
  )
  const bundle = validatedAdoptionBundle(
    fixture.sourceApplication,
    fixture.applyEvidence,
    adoption,
  )
  const mutable = {
    sourceSession: structuredClone(source),
    adoptionBundle: structuredClone(bundle),
  }
  const before = structuredClone(mutable)
  const first = prepareCaseInsertPresetSessionAdoptionCommit(mutable)
  const second = prepareCaseInsertPresetSessionAdoptionCommit(
    structuredClone(mutable),
  )
  assert.equal(first.ok, true)
  assert.equal(second.ok, true)
  if (!first.ok || !second.ok) throw new Error('Preparation failed.')
  assert.deepEqual(mutable, before)
  assert.equal(Object.isFrozen(mutable), false)
  assert.notEqual(first.snapshot.sourceSession, mutable.sourceSession)
  assert.notEqual(
    first.snapshot.adoptionBundle,
    mutable.adoptionBundle,
  )
  assert.equal(isDeeplyFrozen(first), true)
  assert.equal(first.snapshot.snapshotIdentity,
    second.snapshot.snapshotIdentity)
  assert.deepEqual(first.snapshot, second.snapshot)

  mutable.sourceSession.displayName = 'caller mutation'
  ;((mutable.adoptionBundle.adoption as unknown as MutableRecord)
    .receipt as MutableRecord).adoptionIdentity = 'caller mutation'
  assert.notEqual(first.snapshot.sourceSession.displayName, 'caller mutation')
  assert.notEqual(
    first.snapshot.adoptionBundle.adoption.receipt.adoptionIdentity,
    'caller mutation',
  )

  const committed = commitCaseInsertPresetSessionApplication({
    currentSession: structuredClone(source),
    successorSnapshot: structuredClone(first.snapshot),
  })
  assert.equal(committed.ok, true)
  assert.equal(isDeeplyFrozen(committed), true)
})

test('full-session compare-and-swap rejects content, application, attachment, metadata, replay, and unrelated edits', () => {
  const { source, snapshot } = operationFixture('detach', 40)
  const staleCases: Array<Readonly<{
    current: unknown
    status: string
  }>> = []

  const titleProject = structuredClone(
    source.project,
  ) as unknown as SavedCaseInsertProject
  titleProject.title = 'Later title edit'
  titleProject.game.manualTitle = 'Later title edit'
  const titleChanged = replaceActiveProjectContent(
    { activeSession: source, visibleWorkspace: 'home' },
    titleProject,
  ).activeSession
  assert.ok(titleChanged)
  staleCases.push({
    current: titleChanged,
    status: 'project-revision-mismatch',
  })

  const aggregateProject = structuredClone(
    source.project,
  ) as unknown as SavedCaseInsertProject
  aggregateProject.caseInsert.templates.cover.background.layout.x += 0.01
  const aggregateChanged = replaceActiveProjectContent(
    { activeSession: source, visibleWorkspace: 'home' },
    aggregateProject,
  ).activeSession
  assert.ok(aggregateChanged)
  staleCases.push({
    current: aggregateChanged,
    status: 'project-revision-mismatch',
  })

  const applicationAdvanced = applicationAtRevision(
    source,
    source.caseInsertPresetApplication.applicationRevision + 1,
    source.caseInsertPresetApplication.attachment,
  )
  staleCases.push({
    current: sessionWithApplication(source, applicationAdvanced),
    status: 'application-revision-mismatch',
  })

  const attachmentChanged = applicationAtRevision(
    source,
    source.caseInsertPresetApplication.applicationRevision,
    createCaseInsertPresetUnattachedState(),
  )
  staleCases.push({
    current: sessionWithApplication(source, attachmentChanged),
    status: 'attachment-state-mismatch',
  })

  const alternativeApply = attachmentOnlyApplyFixture({
    sessionId: source.id,
    applicationRevision:
      source.caseInsertPresetApplication.applicationRevision - 1,
    contentRevision: source.revision,
  })
  assert.equal(alternativeApply.adoption.state.attachment.status, 'attached')
  assert.notEqual(
    alternativeApply.adoption.state.attachment.attachmentIdentity,
    source.caseInsertPresetApplication.attachment.attachmentIdentity,
  )
  const configurationChanged = applicationAtRevision(
    source,
    source.caseInsertPresetApplication.applicationRevision,
    alternativeApply.adoption.state.attachment,
  )
  staleCases.push({
    current: sessionWithApplication(source, configurationChanged),
    status: 'configuration-identity-mismatch',
  })

  staleCases.push({
    current: requireCaseSession(captureApplicationLifecycleState({
      activeSession: { ...source, currentPath: 'C:\\projects\\moved.sbls' },
      visibleWorkspace: 'home',
    })),
    status: 'unrelated-project-content-change',
  })
  staleCases.push({
    current: requireCaseSession(captureApplicationLifecycleState({
      activeSession: { ...source, cleanBaseline: null },
      visibleWorkspace: 'home',
    })),
    status: 'unrelated-project-content-change',
  })
  staleCases.push({
    current: requireCaseSession(captureApplicationLifecycleState({
      activeSession: {
        ...source,
        lastEditorRoute: { workspace: 'caseInsert', surface: 'back' },
      },
      visibleWorkspace: 'home',
    })),
    status: 'unrelated-project-content-change',
  })

  for (const stale of staleCases) {
    const result = commitCaseInsertPresetSessionApplication({
      currentSession: stale.current,
      successorSnapshot: snapshot,
    })
    assert.equal(result.ok, false)
    if (result.ok) continue
    assert.equal(result.status, stale.status)
    assertFailureHasNoPartialOutput(result)
  }

  const first = commitCaseInsertPresetSessionApplication({
    currentSession: source,
    successorSnapshot: snapshot,
  })
  assert.equal(first.ok, true)
  if (!first.ok) throw new Error(first.code)
  const replay = commitCaseInsertPresetSessionApplication({
    currentSession: first.session,
    successorSnapshot: snapshot,
  })
  assert.equal(replay.ok, false)
  if (!replay.ok) assert.equal(replay.status, 'replayed-adoption')
  assertFailureHasNoPartialOutput(replay)
})

test('a different valid Case session cannot consume an adoption authorization', () => {
  const { source, snapshot } = operationFixture('apply', 17)
  const otherState = createLoadedProjectSession({
    sessionId: 'different-valid-case-session',
    currentPath: source.currentPath!,
    persistenceFormat: source.persistenceFormat!,
    project: source.project as unknown as SavedCaseInsertProject,
  })
  const initialOther = requireCaseSession(otherState)
  const otherAtApplicationRevision = applicationAtRevision(
    initialOther,
    source.caseInsertPresetApplication.applicationRevision,
    createCaseInsertPresetUnattachedState(),
  )
  const other = sessionWithApplication(
    requireCaseSession(captureApplicationLifecycleState({
      activeSession: { ...initialOther, revision: source.revision },
      visibleWorkspace: 'home',
    })),
    otherAtApplicationRevision,
  )
  const result = commitCaseInsertPresetSessionApplication({
    currentSession: other,
    successorSnapshot: snapshot,
  })
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.status, 'session-identity-mismatch')
  assertFailureHasNoPartialOutput(result)
})

test('Disc, partial Case, unsupported versions, forged snapshots, raw units, and adopted evidence fail closed', () => {
  const { source, snapshot } = operationFixture('apply')
  const disc = createNewProjectSession({
    sessionId: 'disc-cannot-adopt-case-preset',
    project: createBlankDiscSavedProject(),
  }).activeSession
  assert.ok(disc)
  const partial = structuredClone(source) as unknown as MutableRecord
  delete partial.caseInsertPresetApplication
  const unsupportedApplication = structuredClone(source) as unknown as
    MutableRecord
  ;(unsupportedApplication.caseInsertPresetApplication as
    MutableRecord).formatVersion = 99

  const badCurrentValues = [disc, partial, unsupportedApplication]
  for (const currentSession of badCurrentValues) {
    const result = commitCaseInsertPresetSessionApplication({
      currentSession,
      successorSnapshot: snapshot,
    })
    assert.equal(result.ok, false)
    assertFailureHasNoPartialOutput(result)
  }

  const malformedSnapshots: unknown[] = [
    source.project.caseInsert,
    source.caseInsertPresetApplication.attachment,
    snapshot.adoptionBundle.evidence,
    snapshot.adoptionBundle.adoption.receipt,
    null,
    7,
    [],
    Promise.resolve(snapshot),
    new Map(),
    new Set(),
  ]
  const unsupported = structuredClone(snapshot) as unknown as MutableRecord
  unsupported.formatVersion = 99
  malformedSnapshots.push(unsupported)
  const forgedIdentity = structuredClone(snapshot) as unknown as MutableRecord
  forgedIdentity.snapshotIdentity =
    'case:preset-session-adoption-commit:v1:forged'
  malformedSnapshots.push(forgedIdentity)
  const forgedReceipt = structuredClone(snapshot) as unknown as MutableRecord
  ;(((forgedReceipt.adoptionBundle as MutableRecord).adoption as
    MutableRecord).receipt as
    MutableRecord).adoptionIdentity = 'case:preset-application-adoption:v1:forged'
  malformedSnapshots.push(forgedReceipt)
  const adoptedEvidence = structuredClone(snapshot) as unknown as MutableRecord
  ;((adoptedEvidence.adoptionBundle as MutableRecord).evidence as
    MutableRecord).applicationAdoptionStatus = 'adopted'
  malformedSnapshots.push(adoptedEvidence)
  const crossOperation = structuredClone(snapshot) as unknown as MutableRecord
  crossOperation.operation = 'detach'
  malformedSnapshots.push(crossOperation)

  for (const successorSnapshot of malformedSnapshots) {
    const result = commitCaseInsertPresetSessionApplication({
      currentSession: source,
      successorSnapshot,
    })
    assert.equal(result.ok, false)
    assertFailureHasNoPartialOutput(result)
  }
})

test('cycles, accessors, thenables, executable values, collections, and unsupported prototypes are rejected without execution', () => {
  const { source, snapshot } = operationFixture('apply')
  const cyclic = structuredClone(snapshot) as unknown as MutableRecord
  cyclic.self = cyclic
  let getterCalls = 0
  const accessor = Object.create(null) as MutableRecord
  Object.defineProperties(accessor, {
    currentSession: {
      enumerable: true,
      get() {
        getterCalls += 1
        return source
      },
    },
    successorSnapshot: { enumerable: true, value: snapshot },
  })
  const unsupportedPrototype = Object.create({ inherited: true }) as
    MutableRecord
  unsupportedPrototype.currentSession = source
  unsupportedPrototype.successorSnapshot = snapshot
  const sessionKindAccessor = structuredClone(source) as unknown as
    MutableRecord
  Object.defineProperty(sessionKindAccessor, 'kind', {
    enumerable: true,
    get() {
      getterCalls += 1
      return 'caseInsert'
    },
  })
  const sessionApplicationAccessor = structuredClone(source) as unknown as
    MutableRecord
  Object.defineProperty(
    sessionApplicationAccessor,
    'caseInsertPresetApplication',
    {
      enumerable: true,
      get() {
        getterCalls += 1
        return source.caseInsertPresetApplication
      },
    },
  )

  const inputs = [
    { currentSession: source, successorSnapshot: cyclic },
    accessor,
    {
      currentSession: source,
      successorSnapshot: { then() { return snapshot } },
    },
    { currentSession: source, successorSnapshot: () => snapshot },
    { currentSession: source, successorSnapshot: new WeakMap() },
    { currentSession: source, successorSnapshot: new WeakSet() },
    { currentSession: sessionKindAccessor, successorSnapshot: snapshot },
    {
      currentSession: sessionApplicationAccessor,
      successorSnapshot: snapshot,
    },
    unsupportedPrototype,
  ]
  for (const input of inputs) {
    const result = commitCaseInsertPresetSessionApplication(input)
    assert.equal(result.ok, false)
    assertFailureHasNoPartialOutput(result)
  }

  const bundleAccessor = structuredClone(
    snapshot.adoptionBundle,
  ) as unknown as MutableRecord
  Object.defineProperty(bundleAccessor.evidence as MutableRecord, 'operation', {
    enumerable: true,
    get() {
      getterCalls += 1
      return 'apply'
    },
  })
  const prepared = prepareCaseInsertPresetSessionAdoptionCommit({
    sourceSession: source,
    adoptionBundle: bundleAccessor,
  })
  assert.equal(prepared.ok, false)
  assertFailureHasNoPartialOutput(prepared)
  assert.equal(getterCalls, 0)
})

test('one failed precondition exposes no aggregate, companion, attachment, or receipt', () => {
  const { source, snapshot } = operationFixture('apply')
  const stale = requireCaseSession(captureApplicationLifecycleState({
    activeSession: { ...source, currentPath: 'C:\\projects\\stale.sbls' },
    visibleWorkspace: 'home',
  }))
  const failure = commitCaseInsertPresetSessionApplication({
    currentSession: stale,
    successorSnapshot: snapshot,
  })
  assert.equal(failure.ok, false)
  assertFailureHasNoPartialOutput(failure)
  assert.deepEqual(source.project.caseInsert,
    snapshot.sourceSession.project.caseInsert)
  assert.equal(
    snapshot.adoptionBundle.evidence.applicationAdoptionStatus,
    'not-adopted',
  )
})

test('commit adapter has no operation, store, persistence, UI, catalog, renderer, geometry, or runtime dependency', () => {
  const source = readFileSync(new URL(
    './caseInsertPresetSessionApplicationCommit.ts',
    import.meta.url,
  ), 'utf8')
  const forbidden = [
    /caseInsertPresetApplyPlanning/,
    /caseInsertPresetApplyTransition/,
    /caseInsertPresetReapplyPlanning/,
    /caseInsertPresetReapplyTransition/,
    /caseInsertPresetDetachPlanning/,
    /caseInsertPresetDetachTransition/,
    /transitionCaseInsertPresetApplicationAdoption/,
    /detectCaseInsertPresetCustomization/,
    /resolveCaseInsertPresetAssignments/,
    /evaluateCaseInsertPresetCompatibility/,
    /CASE_INSERT_PRESET_CATALOG/,
    /applicationLifecycleStateStore/,
    /applicationLifecycleCompositionRoot/,
    /replaceActiveProjectContent/,
    /synchronizeActiveProjectContent/,
    /from ['"]react['"]/,
    /\b(?:document|window)\./,
    /from ['"].*(?:renderer|export)[/'"]/,
    /from ['"](?:node:fs|fs)['"]/,
    /from ['"].*(?:projectSchema|migration|projectPackage)[/'"]/,
    /\b(?:fetch|invoke|listen|emit|writeFile|localStorage|sessionStorage)\s*\(/,
    /tauri/i,
  ]
  for (const pattern of forbidden) {
    assert.doesNotMatch(source, pattern, String(pattern))
  }
})
