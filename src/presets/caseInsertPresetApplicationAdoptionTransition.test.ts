import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  CASE_INSERT_PRESET_CATALOG,
} from './caseInsertPresetCatalog.ts'
import {
  CASE_INSERT_PRESET_APPLICATION_ADOPTION_TRANSITION_KIND,
  CASE_INSERT_PRESET_APPLICATION_ADOPTION_TRANSITION_VERSION,
  CASE_INSERT_PRESET_VALIDATED_ADOPTION_SUCCESS_BUNDLE_KIND,
  CASE_INSERT_PRESET_VALIDATED_ADOPTION_SUCCESS_BUNDLE_VERSION,
  auditCaseInsertPresetValidatedAdoptionSuccessBundle,
  transitionCaseInsertPresetApplicationAdoption,
  type CaseInsertPresetApplicationAdoptionTransitionResult,
} from './caseInsertPresetApplicationAdoptionTransition.ts'
import {
  buildCaseInsertPresetApplicationAdoptionFixture,
} from './caseInsertPresetApplicationAdoption.testFixture.test.ts'

type MutableRecord = Record<string, unknown>

const fixture = buildCaseInsertPresetApplicationAdoptionFixture()

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

function expectFailure(
  result: CaseInsertPresetApplicationAdoptionTransitionResult,
  expectedStatus?: string,
) {
  assert.equal(result.ok, false)
  if (result.ok) return
  if (expectedStatus) assert.equal(result.status, expectedStatus)
  assert.equal(isDeeplyFrozen(result), true)
  for (const forbidden of [
    'state', 'successor', 'receipt', 'adoptionIdentity', 'transitionResult',
    'evidence', 'aggregate', 'attachment', 'configuration', 'releaseResult',
  ]) {
    assert.equal(forbidden in result, false, forbidden)
  }
}

function rawRequest(
  operation: 'apply' | 'reapply' | 'detach',
  current: unknown,
  evidence: unknown,
) {
  return {
    kind: CASE_INSERT_PRESET_APPLICATION_ADOPTION_TRANSITION_KIND,
    formatVersion:
      CASE_INSERT_PRESET_APPLICATION_ADOPTION_TRANSITION_VERSION,
    operation,
    current,
    evidence,
  }
}

test('validated adoption success bundles bind one exact versioned success', () => {
  const adoption = transitionCaseInsertPresetApplicationAdoption(rawRequest(
    'apply', fixture.sourceApplication, fixture.applyEvidence,
  ))
  assert.equal(adoption.ok, true)
  if (!adoption.ok || adoption.operation !== 'apply') return

  const input = {
    kind: CASE_INSERT_PRESET_VALIDATED_ADOPTION_SUCCESS_BUNDLE_KIND,
    formatVersion:
      CASE_INSERT_PRESET_VALIDATED_ADOPTION_SUCCESS_BUNDLE_VERSION,
    operation: 'apply',
    current: fixture.sourceApplication,
    evidence: fixture.applyEvidence,
    adoption,
  }
  const audited = auditCaseInsertPresetValidatedAdoptionSuccessBundle(input)
  const repeated = auditCaseInsertPresetValidatedAdoptionSuccessBundle(
    structuredClone(input),
  )

  assert.equal(audited.ok, true)
  assert.deepEqual(audited, repeated)
  if (!audited.ok) return
  assert.equal(isDeeplyFrozen(audited), true)
  assert.notEqual(audited.bundle.current, fixture.sourceApplication)
  assert.notEqual(audited.bundle.evidence, fixture.applyEvidence)
  assert.notEqual(audited.bundle.adoption, adoption)

  const forged = structuredClone(input)
  const forgedReceipt = forged.adoption.receipt as unknown as MutableRecord
  forgedReceipt.applicationAdoptionStatus = 'not-adopted'
  const mismatch = auditCaseInsertPresetValidatedAdoptionSuccessBundle(forged)
  assert.equal(mismatch.ok, false)
  if (!mismatch.ok) assert.equal(mismatch.status, 'adoption-success-mismatch')

  const unsupported = auditCaseInsertPresetValidatedAdoptionSuccessBundle({
    ...input,
    formatVersion: 2,
  })
  assert.equal(unsupported.ok, false)
  if (!unsupported.ok) {
    assert.equal(
      unsupported.status,
      'unsupported-adoption-success-bundle-version',
    )
  }
})

test('Apply atomically adopts the exact aggregate and promoted configuration', () => {
  const input = rawRequest(
    'apply', fixture.sourceApplication, fixture.applyEvidence,
  )
  const sourceBefore = structuredClone(fixture.sourceApplication)
  const evidenceBefore = structuredClone(fixture.applyEvidence)
  const first = transitionCaseInsertPresetApplicationAdoption(input)
  const repeated = transitionCaseInsertPresetApplicationAdoption(
    structuredClone(input),
  )

  assert.equal(first.ok, true)
  assert.deepEqual(first, repeated)
  if (!first.ok || first.operation !== 'apply') return
  assert.equal(first.status, 'adopted')
  assert.deepEqual(first.state.snapshot.caseInsert, fixture.apply.aggregate)
  assert.equal(first.state.attachment.status, 'attached')
  if (first.state.attachment.status === 'attached') {
    assert.deepEqual(
      first.state.attachment.configuration,
      fixture.apply.successorConfiguration,
    )
    assert.equal(
      first.state.attachment.configuration.configurationIdentity,
      fixture.apply.successEvidence.successorConfigurationIdentity,
    )
    assert.equal(first.state.attachment.configuration.attachmentStatus,
      'detached-uninstalled')
  }
  assert.equal(first.receipt.operation, 'apply')
  assert.equal(first.receipt.attachmentAction, 'attached')
  assert.equal(first.receipt.previousAttachment.status, 'unattached')
  assert.equal(first.receipt.successorAttachment.status, 'attached')
  assert.equal(first.receipt.applicationAdoptionStatus, 'adopted')
  assert.equal(first.receipt.persistence.status, 'not-persisted')
  assert.equal(first.receipt.atomicityProof.partialSuccess, false)
  assert.equal(
    first.state.snapshot.identity.projectRevision,
    fixture.sourceRevision + 1,
  )
  assert.equal(first.state.snapshot.identity.sessionId,
    fixture.sourceSnapshot.identity.sessionId)
  assert.equal(isDeeplyFrozen(first), true)
  assert.notEqual(first.state, fixture.sourceApplication)
  assert.notEqual(first.state.snapshot.caseInsert, fixture.apply.aggregate)
  if (first.state.attachment.status === 'attached') {
    assert.notEqual(
      first.state.attachment.configuration,
      fixture.apply.successorConfiguration,
    )
  }
  assert.deepEqual(fixture.sourceApplication, sourceBefore)
  assert.deepEqual(fixture.applyEvidence, evidenceBefore)
  assert.equal(fixture.applyEvidence.applicationAdoptionStatus, 'not-adopted')
})

test('Reapply atomically replaces the exact attached configuration', () => {
  const result = transitionCaseInsertPresetApplicationAdoption(
    rawRequest('reapply', fixture.firstApplication, fixture.reapplyEvidence),
  )
  assert.equal(result.ok, true)
  if (!result.ok || result.operation !== 'reapply') return
  assert.deepEqual(result.state.snapshot.caseInsert, fixture.reapply.aggregate)
  assert.equal(result.state.attachment.status, 'attached')
  if (result.state.attachment.status === 'attached') {
    assert.deepEqual(result.state.attachment.configuration,
      fixture.nextConfiguration)
    assert.notEqual(
      result.state.attachment.configuration.configurationIdentity,
      fixture.firstConfiguration.configurationIdentity,
    )
  }
  assert.equal(result.receipt.operation, 'reapply')
  assert.equal(result.receipt.attachmentAction, 'replaced')
  assert.equal(result.receipt.previousAttachment.status, 'attached')
  assert.equal(result.receipt.successorAttachment.status, 'attached')
  assert.equal(
    result.receipt.sourceConfigurationIdentity,
    fixture.firstConfiguration.configurationIdentity,
  )
  assert.equal(
    result.receipt.successorConfigurationIdentity,
    fixture.nextConfiguration.configurationIdentity,
  )
  assert.equal(
    result.state.snapshot.identity.projectRevision,
    fixture.firstSnapshot.identity.projectRevision + 1,
  )
  assert.equal(isDeeplyFrozen(result), true)
  assert.equal(fixture.reapplyEvidence.applicationAdoptionStatus, 'not-adopted')
})

test('Detach atomically preserves aggregate semantics and releases attachment', () => {
  const result = transitionCaseInsertPresetApplicationAdoption(
    rawRequest('detach', fixture.firstApplication, fixture.detachEvidence),
  )
  assert.equal(result.ok, true)
  if (!result.ok || result.operation !== 'detach') return
  assert.deepEqual(result.state.snapshot.caseInsert,
    fixture.firstApplication.snapshot.caseInsert)
  assert.equal(
    result.state.snapshot.identity.aggregateContentIdentity,
    fixture.firstApplication.snapshot.identity.aggregateContentIdentity,
  )
  assert.equal(result.state.attachment.status, 'unattached')
  assert.deepEqual(result.state.attachment, {
    kind: 'sbls/case-insert-preset-attachment-state',
    formatVersion: 1,
    status: 'unattached',
    attachmentIdentity: 'case:preset-attachment:v1:unattached',
  })
  assert.equal('configuration' in result.state.attachment, false)
  assert.equal(result.receipt.operation, 'detach')
  assert.equal(result.receipt.attachmentAction, 'released')
  assert.equal(result.receipt.successorConfigurationIdentity, null)
  assert.equal(
    result.receipt.configurationReleaseIdentity,
    fixture.detach.releaseResult.releaseIdentity,
  )
  assert.equal(result.receipt.aggregateAdoptionClassification,
    'exact-unchanged-semantic-transition-result')
  assert.equal(isDeeplyFrozen(result), true)
  assert.equal(fixture.detachEvidence.applicationAdoptionStatus, 'not-adopted')
})

test('receipts bind whole success, both applications, context, and every edge', () => {
  const results = [
    transitionCaseInsertPresetApplicationAdoption(rawRequest(
      'apply', fixture.sourceApplication, fixture.applyEvidence,
    )),
    transitionCaseInsertPresetApplicationAdoption(rawRequest(
      'reapply', fixture.firstApplication, fixture.reapplyEvidence,
    )),
    transitionCaseInsertPresetApplicationAdoption(rawRequest(
      'detach', fixture.firstApplication, fixture.detachEvidence,
    )),
  ]
  for (const result of results) {
    assert.equal(result.ok, true)
    if (!result.ok) continue
    const proof = result.operation === 'apply'
      ? fixture.apply.successEvidence
      : result.operation === 'reapply'
        ? fixture.reapply.successEvidence
        : fixture.detach.successEvidence
    assert.equal(result.receipt.consumedTransitionIdentity,
      proof.transitionIdentity)
    assert.equal(result.receipt.consumedWholeSuccessIdentity,
      proof.wholeSuccessIdentity)
    assert.notEqual(result.receipt.sourceApplicationStateIdentity,
      result.receipt.successorApplicationStateIdentity)
    assert.equal(result.receipt.sourceAggregateIdentity,
      proof.sourceAggregateContentIdentity)
    assert.equal(result.receipt.resultAggregateIdentity,
      proof.resultAggregateContentIdentity)
    assert.equal(result.receipt.sourceApplicationContext.sessionId,
      result.receipt.successorApplicationContext.sessionId)
    assert.equal(result.receipt.successorProjectRevision,
      result.receipt.sourceProjectRevision + 1)
    assert.match(result.receipt.adoptionIdentity,
      /^case:preset-application-adoption:v1:/)
    assert.equal(result.receipt.exclusions.projectSchema, 'not-changed')
    assert.equal(result.receipt.exclusions.saveLoad, 'not-integrated')
    assert.equal(result.receipt.exclusions.store, 'not-integrated')
    assert.equal(result.receipt.exclusions.ui, 'not-integrated')
    assert.equal(result.receipt.exclusions.catalog, 'not-installed')
    assert.equal(result.receipt.exclusions.runtime, 'not-integrated')
  }
  assert.equal(new Set(results.flatMap((result) => result.ok
    ? [result.receipt.adoptionIdentity]
    : [])).size, 3)
})

test('replay and out-of-order adoption fail closed without successor output', () => {
  const cases = [
    ['apply', fixture.sourceApplication, fixture.applyEvidence],
    ['reapply', fixture.firstApplication, fixture.reapplyEvidence],
    ['detach', fixture.firstApplication, fixture.detachEvidence],
  ] as const
  for (const [operation, current, evidence] of cases) {
    const first = transitionCaseInsertPresetApplicationAdoption(
      rawRequest(operation, current, evidence),
    )
    assert.equal(first.ok, true)
    if (!first.ok) continue
    expectFailure(transitionCaseInsertPresetApplicationAdoption(
      rawRequest(operation, first.state, evidence),
    ), 'stale-application-snapshot')
  }
  expectFailure(transitionCaseInsertPresetApplicationAdoption(rawRequest(
    'apply', fixture.firstApplication, fixture.applyEvidence,
  )), 'stale-application-snapshot')
  expectFailure(transitionCaseInsertPresetApplicationAdoption(rawRequest(
    'reapply', fixture.sourceApplication, fixture.reapplyEvidence,
  )), 'stale-application-snapshot')
})

test('request shape, version, operation, evidence version, and adoption status are exact', () => {
  expectFailure(transitionCaseInsertPresetApplicationAdoption(null),
    'invalid-adoption-transition')
  expectFailure(transitionCaseInsertPresetApplicationAdoption({}),
    'invalid-adoption-transition')

  const extra = rawRequest(
    'apply', fixture.sourceApplication, fixture.applyEvidence,
  ) as MutableRecord
  extra.extra = true
  expectFailure(transitionCaseInsertPresetApplicationAdoption(extra),
    'invalid-adoption-transition')

  const version = structuredClone(rawRequest(
    'apply', fixture.sourceApplication, fixture.applyEvidence,
  )) as MutableRecord
  version.formatVersion = 2
  expectFailure(transitionCaseInsertPresetApplicationAdoption(version),
    'unsupported-adoption-transition-version')

  const operation = structuredClone(rawRequest(
    'apply', fixture.sourceApplication, fixture.applyEvidence,
  )) as MutableRecord
  operation.operation = 'reapply'
  expectFailure(transitionCaseInsertPresetApplicationAdoption(operation),
    'adoption-operation-mismatch')

  const evidenceVersion = structuredClone(fixture.applyEvidence) as
    MutableRecord
  evidenceVersion.formatVersion = 99
  expectFailure(transitionCaseInsertPresetApplicationAdoption(rawRequest(
    'apply', fixture.sourceApplication, evidenceVersion,
  )), 'unsupported-transition-version')

  const adopted = structuredClone(fixture.applyEvidence) as MutableRecord
  adopted.applicationAdoptionStatus = 'adopted'
  expectFailure(transitionCaseInsertPresetApplicationAdoption(rawRequest(
    'apply', fixture.sourceApplication, adopted,
  )), 'transition-already-adopted')

  expectFailure(transitionCaseInsertPresetApplicationAdoption(rawRequest(
    'apply', fixture.sourceApplication, fixture.apply,
  )), 'invalid-transition-evidence')

  expectFailure(transitionCaseInsertPresetApplicationAdoption(rawRequest(
    'apply',
    fixture.sourceApplication,
    {
      kind: 'sbls/case-insert-preset-adoption-evidence-candidate',
      formatVersion: 2,
      operation: 'apply',
      applicationAdoptionStatus: 'not-adopted',
      transitionResult: {
        ok: false,
        status: 'stale-plan',
        code: 'fixture-operation-failure',
      },
    },
  )), 'invalid-transition-evidence')
})

test('session, revision, aggregate, and attachment CAS facts are rechecked', () => {
  const session = structuredClone(fixture.sourceApplication) as MutableRecord
  const sessionSnapshot = session.snapshot as MutableRecord
  const sessionIdentity = sessionSnapshot.identity as MutableRecord
  sessionIdentity.sessionId = 'stale-session'
  expectFailure(transitionCaseInsertPresetApplicationAdoption(rawRequest(
    'apply', session, fixture.applyEvidence,
  )), 'stale-application-snapshot')

  const revision = structuredClone(fixture.sourceApplication) as MutableRecord
  const revisionSnapshot = revision.snapshot as MutableRecord
  const revisionIdentity = revisionSnapshot.identity as MutableRecord
  revisionIdentity.projectRevision = fixture.sourceRevision + 1
  expectFailure(transitionCaseInsertPresetApplicationAdoption(rawRequest(
    'apply', revision, fixture.applyEvidence,
  )), 'stale-application-snapshot')

  const projectKind = structuredClone(fixture.sourceApplication) as
    MutableRecord
  projectKind.projectKind = 'disc'
  expectFailure(transitionCaseInsertPresetApplicationAdoption(rawRequest(
    'apply', projectKind, fixture.applyEvidence,
  )), 'invalid-adoption-model')

  const template = structuredClone(fixture.sourceApplication) as MutableRecord
  const templateSnapshot = template.snapshot as MutableRecord
  const templateIdentity = templateSnapshot.identity as MutableRecord
  const templateReference = templateIdentity.template as MutableRecord
  templateReference.id = 'dvdCase'
  expectFailure(transitionCaseInsertPresetApplicationAdoption(rawRequest(
    'apply', template, fixture.applyEvidence,
  )), 'application-context-mismatch')

  const other = buildCaseInsertPresetApplicationAdoptionFixture(
    'different-application-session',
  )
  expectFailure(transitionCaseInsertPresetApplicationAdoption(rawRequest(
    'apply', other.sourceApplication, fixture.applyEvidence,
  )), 'stale-application-snapshot')

  expectFailure(transitionCaseInsertPresetApplicationAdoption(rawRequest(
    'apply', fixture.firstApplication, fixture.applyEvidence,
  )))
  expectFailure(transitionCaseInsertPresetApplicationAdoption(rawRequest(
    'detach', fixture.sourceApplication, fixture.detachEvidence,
  )))
})

test('whole-success and fragment substitution cannot authorize adoption', () => {
  const wholeSuccess = structuredClone(fixture.applyEvidence) as MutableRecord
  const wholeResult = wholeSuccess.transitionResult as MutableRecord
  const wholeProof = wholeResult.successEvidence as MutableRecord
  wholeProof.wholeSuccessIdentity =
    fixture.reapply.successEvidence.wholeSuccessIdentity
  expectFailure(transitionCaseInsertPresetApplicationAdoption(rawRequest(
    'apply', fixture.sourceApplication, wholeSuccess,
  )), 'invalid-transition-evidence')

  const aggregate = structuredClone(fixture.applyEvidence) as MutableRecord
  const aggregateResult = aggregate.transitionResult as MutableRecord
  aggregateResult.aggregate = structuredClone(
    fixture.sourceApplication.snapshot.caseInsert,
  )
  expectFailure(transitionCaseInsertPresetApplicationAdoption(rawRequest(
    'apply', fixture.sourceApplication, aggregate,
  )), 'invalid-transition-evidence')

  const configuration = structuredClone(fixture.reapplyEvidence) as
    MutableRecord
  const configurationResult = configuration.transitionResult as MutableRecord
  configurationResult.nextConfiguration = structuredClone(
    fixture.firstConfiguration,
  )
  expectFailure(transitionCaseInsertPresetApplicationAdoption(rawRequest(
    'reapply', fixture.firstApplication, configuration,
  )), 'invalid-transition-evidence')

  const release = structuredClone(fixture.detachEvidence) as MutableRecord
  const releaseTransition = release.transitionResult as MutableRecord
  const releaseResult = releaseTransition.releaseResult as MutableRecord
  releaseResult.releaseIdentity = 'case:preset-detach-release:v1:forged'
  expectFailure(transitionCaseInsertPresetApplicationAdoption(rawRequest(
    'detach', fixture.firstApplication, release,
  )), 'invalid-transition-evidence')
})

test('hostile values fail as typed inert errors without invoking accessors', () => {
  let getterCalls = 0
  const accessor = {}
  Object.defineProperty(accessor, 'kind', {
    enumerable: true,
    get() {
      getterCalls += 1
      return CASE_INSERT_PRESET_APPLICATION_ADOPTION_TRANSITION_KIND
    },
  })
  const cycle: MutableRecord = {}
  cycle.self = cycle
  const alias: MutableRecord = {}
  const shared = { value: 'shared' }
  alias.left = shared
  alias.right = shared
  const symbolKey = rawRequest(
    'apply', fixture.sourceApplication, fixture.applyEvidence,
  ) as MutableRecord & { [key: symbol]: unknown }
  symbolKey[Symbol('forged-brand')] = true
  const thenable = { then() { return undefined } }
  for (const hostile of [
    accessor,
    Object.create({ inherited: true }),
    cycle,
    alias,
    symbolKey,
    thenable,
    () => undefined,
    Promise.resolve('not-evidence'),
  ]) {
    expectFailure(transitionCaseInsertPresetApplicationAdoption(hostile),
      'invalid-adoption-transition')
  }
  assert.equal(getterCalls, 0)
})

test('transition source is pure and has no planner, executor, catalog, or runtime edge', () => {
  const source = readFileSync(
    new URL(
      './caseInsertPresetApplicationAdoptionTransition.ts',
      import.meta.url,
    ),
    'utf8',
  )
  assert.doesNotMatch(source,
    /from ['"].*(ApplyPlanning|ReapplyPlanning|DetachPlanning)/)
  assert.doesNotMatch(source, /from ['"].*AssignmentResolution/)
  assert.doesNotMatch(source, /from ['"].*PresetCompatibility/)
  assert.doesNotMatch(source, /from ['"].*PresetCatalog/)
  assert.doesNotMatch(source, /from ['"].*AggregateFieldTransition/)
  assert.doesNotMatch(source, /from ['"].*AppliedConfiguration\.ts/)
  assert.doesNotMatch(source,
    /from ['"].*(applicationLifecycle|projectSession|App|React|react|tauri|renderer|export)/)
  assert.doesNotMatch(source,
    /\b(?:applyCaseInsertPresetFirstTime|transitionCaseInsertPresetReapply|transitionCaseInsertPresetDetach|detectCaseInsertPresetCustomization|resolveCaseInsertPresetAssignments|evaluateCaseInsertPresetCompatibility|applyCaseInsertPresetAggregateLayoutWrites)\s*\(/)
  assert.doesNotMatch(source,
    /\b(?:localStorage|sessionStorage|fetch|invoke|listen|emit|writeFile|save)\s*\(/)
  assert.doesNotMatch(source, /async\s+function|\bawait\b|new Promise/)
  assert.equal(CASE_INSERT_PRESET_CATALOG.list().length, 0)
})
