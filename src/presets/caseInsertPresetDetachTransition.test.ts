import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { createDefaultCaseInsertImageSlot } from '../caseInsert/defaults.ts'
import { normalizeProjectJewelCaseState } from '../caseInsert/normalization.ts'
import {
  createCaseInsertPresetAssignmentSnapshot,
  resolveCaseInsertPresetAggregateBinding,
} from '../caseInsert/presetAssignmentSnapshot.ts'
import { captureNormalizedProjectSnapshot } from '../lifecycle/canonicalProject.ts'
import { createBlankJewelCaseSavedProject } from '../project/caseInsertProjectAdapters.ts'
import type { ProjectJewelCaseState } from '../project/projectTypes.ts'
import {
  CASE_INSERT_PRESET_CATALOG,
  createCaseInsertPresetCatalog,
} from './caseInsertPresetCatalog.ts'
import type {
  CaseInsertPresetApplicationScope,
  CaseInsertPresetDefinitionV1,
} from './caseInsertPresetDefinition.ts'
import { planCaseInsertPresetFirstApply } from './caseInsertPresetApplyPlanning.ts'
import {
  resolveCaseInsertPresetAssignments,
  type CaseInsertPresetAssignmentResolutionResult,
} from './caseInsertPresetAssignmentResolution.ts'
import {
  applyCaseInsertPresetFirstTime,
  createCaseInsertPresetApplyReviewApproval,
  createCaseInsertPresetMaterialConsentAcceptance,
  type CaseInsertPresetMaterialConsentAcceptance,
} from './caseInsertPresetApplyTransition.ts'
import {
  detectCaseInsertPresetCustomization,
  validateCaseInsertAppliedPresetConfigurationCandidate,
  type CaseInsertAppliedPresetConfiguration,
  type CaseInsertAppliedPresetOwnedFieldAddress,
} from './caseInsertPresetAppliedConfiguration.ts'
import {
  canonicalizeCaseInsertPresetDetachPlanContent,
  createCaseInsertPresetDetachPlanIdentity,
  createCaseInsertPresetDetachPreservationIdentity,
  createCaseInsertPresetDetachReleaseIdentity,
  createCaseInsertPresetDetachReviewIdentity,
  createCaseInsertPresetDetachWarningIdentity,
} from './caseInsertPresetDetachIdentity.ts'
import {
  planCaseInsertPresetDetach,
  type CaseInsertPresetDetachPlan,
} from './caseInsertPresetDetachPlanning.ts'
import {
  createCaseInsertPresetDetachReviewAcceptance,
  transitionCaseInsertPresetDetach,
  type CaseInsertPresetDetachTransitionResult,
  type TransitionCaseInsertPresetDetachInput,
} from './caseInsertPresetDetachTransition.ts'
import {
  cloneFixture,
  createCoordinatedCaseInsertPresetDefinition,
  createMinimalCaseInsertPresetDefinition,
} from './caseInsertPresetTestFixtures.ts'

type MutableRecord = Record<string, unknown>
type SuccessfulResolution = Extract<
  CaseInsertPresetAssignmentResolutionResult,
  { ok: true }
>
type MutableLayoutTarget = {
  id: string
  enabled: boolean
  layout: { x: number; y: number; scale: number; width: number }
}
type Fixture = Readonly<{
  definition: CaseInsertPresetDefinitionV1
  configuration: CaseInsertAppliedPresetConfiguration
  aggregate: ProjectJewelCaseState
  plan: CaseInsertPresetDetachPlan
  input: TransitionCaseInsertPresetDetachInput
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
  if (!value || typeof value !== 'object' || !Object.isFrozen(value)) return false
  if (seen.has(value)) return true
  seen.add(value)
  return Object.values(value).every((child) =>
    !child || typeof child !== 'object' || isDeeplyFrozen(child, seen))
}

function buildSnapshot(
  aggregate: ProjectJewelCaseState,
  sessionId: string,
  projectRevision: number,
) {
  const project = createBlankJewelCaseSavedProject()
  project.caseInsert = structuredClone(aggregate)
  const snapshot = createCaseInsertPresetAssignmentSnapshot({
    sessionId,
    projectRevision,
    project: captureNormalizedProjectSnapshot(project),
  })
  assert.equal(snapshot.ok, true)
  if (!snapshot.ok) throw new Error(snapshot.error.code)
  return snapshot.value
}

function buildFixture(options: Readonly<{
  definition?: unknown
  scope?: CaseInsertPresetApplicationScope
  sessionId?: string
  mutateSource?: (aggregate: ProjectJewelCaseState) => void
  mutateCurrent?: (
    aggregate: ProjectJewelCaseState,
    configuration: CaseInsertAppliedPresetConfiguration,
  ) => void
  transformInitialResolution?: (
    resolution: SuccessfulResolution,
  ) => SuccessfulResolution
}> = {}): Fixture {
  const catalog = createCaseInsertPresetCatalog({
    builtins: [options.definition ?? createMinimalCaseInsertPresetDefinition()],
  })
  assert.equal(catalog.ok, true)
  if (!catalog.ok) throw new Error(catalog.error.code)
  const summary = catalog.catalog.list()[0]!
  const definition = catalog.catalog.getExact(summary.id, summary.revision)!
  const sessionId = options.sessionId ?? 'detach-transition-session'
  const sourceRevision = 40
  const sourceProject = createBlankJewelCaseSavedProject()
  options.mutateSource?.(sourceProject.caseInsert)
  sourceProject.caseInsert = normalizeProjectJewelCaseState(
    sourceProject.caseInsert,
  )
  const sourceSnapshot = createCaseInsertPresetAssignmentSnapshot({
    sessionId,
    projectRevision: sourceRevision,
    project: captureNormalizedProjectSnapshot(sourceProject),
  })
  assert.equal(sourceSnapshot.ok, true)
  if (!sourceSnapshot.ok) throw new Error(sourceSnapshot.error.code)
  const requestedScope = options.scope ?? definition.applicationScopes[0]!
  const resolution = resolveCaseInsertPresetAssignments({
    catalog: catalog.catalog,
    reference: { id: definition.id, revision: definition.revision },
    requestedScope,
    snapshot: sourceSnapshot.value,
    expectedSnapshotIdentity: sourceSnapshot.value.identity,
  })
  assert.equal(resolution.ok, true)
  if (!resolution.ok) throw new Error(resolution.status)
  const planning = planCaseInsertPresetFirstApply({
    operation: 'apply',
    resolution: options.transformInitialResolution
      ? options.transformInitialResolution(resolution)
      : resolution,
    expected: {
      projectKind: 'caseInsert',
      preset: { id: definition.id, revision: definition.revision },
      requestedScope,
      snapshotIdentity: sourceSnapshot.value.identity,
    },
  })
  assert.equal(planning.ok, true)
  if (!planning.ok) throw new Error(planning.status)
  const applyAcceptances = planning.plan.materialConsentRequirements.map(
    ({ id }) => createCaseInsertPresetMaterialConsentAcceptance(planning.plan, id),
  )
  assert.equal(applyAcceptances.every(Boolean), true)
  const applied = applyCaseInsertPresetFirstTime({
    planningResult: planning,
    source: {
      projectKind: 'caseInsert',
      aggregate: structuredClone(sourceSnapshot.value.caseInsert),
      snapshotIdentity: sourceSnapshot.value.identity,
      preset: { id: definition.id, revision: definition.revision },
      requestedScope,
    },
    attachment: { status: 'unattached' },
    reviewApproval: createCaseInsertPresetApplyReviewApproval(planning.plan),
    materialConsentAcceptances:
      applyAcceptances as CaseInsertPresetMaterialConsentAcceptance[],
  })
  assert.equal(applied.ok, true)
  if (!applied.ok) throw new Error(`${applied.status}:${applied.code}`)
  const validated = validateCaseInsertAppliedPresetConfigurationCandidate(applied)
  assert.equal(validated.ok, true)
  if (!validated.ok) throw new Error(`${validated.status}:${validated.code}`)
  const aggregate = structuredClone(applied.aggregate)
  options.mutateCurrent?.(aggregate, validated.configuration)
  const normalized = normalizeProjectJewelCaseState(aggregate)
  const projectRevision = sourceRevision + 1
  const snapshot = buildSnapshot(normalized, sessionId, projectRevision)
  const detached = planCaseInsertPresetDetach({
    operation: 'detach',
    configuration: validated.configuration,
    current: {
      projectKind: 'caseInsert',
      aggregate: normalized,
      sessionId,
      projectRevision,
      template: validated.configuration.template,
      snapshot,
    },
  })
  assert.equal(detached.ok, true)
  if (!detached.ok) throw new Error(`${detached.status}:${detached.code}`)
  const input = {
    operation: 'detach',
    plan: detached.plan,
    sourceConfiguration: validated.configuration,
    reviewAcceptance:
      createCaseInsertPresetDetachReviewAcceptance(detached.plan),
    materialConsentAcceptances: [],
    current: {
      projectKind: 'caseInsert',
      aggregate: normalized,
      sessionId,
      projectRevision,
      template: validated.configuration.template,
      snapshot,
    },
  } as const satisfies TransitionCaseInsertPresetDetachInput
  return {
    definition,
    configuration: validated.configuration,
    aggregate: normalized,
    plan: detached.plan,
    input,
  }
}

function successful(input: TransitionCaseInsertPresetDetachInput) {
  const result = transitionCaseInsertPresetDetach(input)
  assert.equal(result.ok, true)
  if (!result.ok) throw new Error(`${result.status}:${result.code}`)
  return result
}

function failed(
  input: TransitionCaseInsertPresetDetachInput,
  status: Extract<
    CaseInsertPresetDetachTransitionResult,
    { ok: false }
  >['status'],
) {
  const result = transitionCaseInsertPresetDetach(input)
  assert.equal(result.ok, false)
  if (result.ok) throw new Error('Expected Detach transition failure.')
  assert.equal(result.status, status)
  assert.equal('aggregate' in result, false)
  assert.equal('releaseResult' in result, false)
  assert.equal('transitionIdentity' in result, false)
  assert.equal('nextConfiguration' in result, false)
  assert.equal(isDeeplyFrozen(result), true)
  return result
}

function targetFor(
  aggregate: ProjectJewelCaseState,
  address: CaseInsertAppliedPresetOwnedFieldAddress,
) {
  const binding = resolveCaseInsertPresetAggregateBinding(
    aggregate,
    address.featureOwnerId,
    { kind: address.bindingKind, id: address.bindingId },
  )
  assert.equal(binding.status, 'found')
  if (binding.status !== 'found') throw new Error(binding.status)
  return binding.currentState as MutableLayoutTarget
}

function setOwnedValue(
  aggregate: ProjectJewelCaseState,
  configuration: CaseInsertAppliedPresetConfiguration,
  fieldId: 'layout-x' | 'layout-y' | 'layout-scale' | 'layout-width',
  value: number,
) {
  const field = configuration.ownedFields.find((candidate) =>
    candidate.address.fieldId === fieldId)
  assert.ok(field)
  const target = targetFor(aggregate, field.address)
  switch (fieldId) {
    case 'layout-x': target.layout.x = value; break
    case 'layout-y': target.layout.y = value; break
    case 'layout-scale': target.layout.scale = value; break
    case 'layout-width': target.layout.width = value; break
  }
}

function reidentifyPlan(value: unknown): CaseInsertPresetDetachPlan {
  const mutable = structuredClone(value) as MutableRecord
  const content = Object.fromEntries(Object.entries(mutable).filter(([key]) =>
    key !== 'reviewIdentity' && key !== 'planIdentity')) as Omit<
      CaseInsertPresetDetachPlan,
      'reviewIdentity' | 'planIdentity'
    >
  const canonical = canonicalizeCaseInsertPresetDetachPlanContent(content)
  for (const release of canonical.releaseFootprint) {
    const mutableRelease = release as unknown as MutableRecord
    const releaseContent = Object.fromEntries(Object.entries(mutableRelease)
      .filter(([key]) => key !== 'id'))
    mutableRelease.id = createCaseInsertPresetDetachReleaseIdentity(
      releaseContent as never,
    )
  }
  for (const preservation of canonical.aggregatePreservations) {
    const mutablePreservation = preservation as unknown as MutableRecord
    const preservationContent = Object.fromEntries(
      Object.entries(mutablePreservation).filter(([key]) => key !== 'id'),
    )
    mutablePreservation.id = createCaseInsertPresetDetachPreservationIdentity(
      preservationContent as never,
    )
  }
  for (const warning of canonical.warnings) {
    const mutableWarning = warning as unknown as MutableRecord
    const warningContent = Object.fromEntries(Object.entries(mutableWarning)
      .filter(([key]) => key !== 'id'))
    mutableWarning.id = createCaseInsertPresetDetachWarningIdentity(
      warningContent as never,
    )
  }
  const reviewIdentity = createCaseInsertPresetDetachReviewIdentity(canonical)
  return deepFreeze({
    ...canonical,
    reviewIdentity,
    planIdentity: createCaseInsertPresetDetachPlanIdentity({
      ...canonical,
      reviewIdentity,
    }),
  })
}

function withPlan(
  fixture: Fixture,
  plan: CaseInsertPresetDetachPlan,
): TransitionCaseInsertPresetDetachInput {
  return {
    ...fixture.input,
    plan,
    reviewAcceptance: createCaseInsertPresetDetachReviewAcceptance(plan),
  }
}

function repeatedDefinition() {
  const raw = createMinimalCaseInsertPresetDefinition()
  const slot = ((raw as MutableRecord).slots as MutableRecord[])[0]!
  slot.roleId = 'additional-artwork'
  const assignment = (slot.assignments as MutableRecord[])[0]!
  assignment.ownerId = 'case.cover.artwork-slots'
  assignment.object = { kind: 'repeated', id: 'case:user-artwork:target' }
  return raw
}

function addRepeatedTargets(aggregate: ProjectJewelCaseState) {
  const target = createDefaultCaseInsertImageSlot(
    'case:user-artwork:target',
    'Target',
    { enabled: false },
  )
  target.imageDataUrl = 'data:image/png;base64,AA=='
  aggregate.templates.cover.artworkSlots.push(
    target,
    createDefaultCaseInsertImageSlot('case:user-artwork:other', 'Other'),
  )
}

test('successful Detach preserves the complete aggregate and returns pure release evidence', () => {
  const fixture = buildFixture({
    definition: createCoordinatedCaseInsertPresetDefinition(),
    scope: { kind: 'complete' },
  })
  const inputBefore = structuredClone(fixture.input)
  const result = successful(fixture.input)

  assert.equal(result.status, 'detached-aggregate-semantic-no-op')
  assert.deepEqual(result.aggregate, fixture.aggregate)
  assert.notEqual(result.aggregate, fixture.aggregate)
  assert.equal(result.releaseResult.operation, 'detach')
  assert.equal(result.releaseResult.transitionClassification,
    'meaningful-configuration-ownership-release')
  assert.equal(result.releaseResult.releasedFootprint.length,
    fixture.configuration.ownedFields.length)
  assert.equal(result.releaseResult.proof.releasesCompleteConfiguration, true)
  assert.equal(result.releaseResult.proof.aggregateWriteCount, 0)
  assert.equal(result.releaseResult.proof.aggregateClassification,
    'aggregate-semantic-no-write')
  assert.equal(result.releaseResult.nextAppliedPresetConfiguration, null)
  assert.equal(result.releaseResult.applicationAdoptionStatus, 'not-adopted')
  assert.equal(isDeeplyFrozen(result), true)
  assert.deepEqual(fixture.input, inputBefore)
  assert.equal('configuration' in result.releaseResult, false)
  assert.equal('installed' in result.releaseResult, false)
  assert.equal('persisted' in result.releaseResult, false)
})

test('clean, customized, mixed, enabled, and disabled values are all preserved exactly', () => {
  const fixture = buildFixture({
    definition: createCoordinatedCaseInsertPresetDefinition(),
    scope: { kind: 'complete' },
    mutateCurrent: (aggregate, configuration) => {
      setOwnedValue(aggregate, configuration, 'layout-x', 12.3456789012345)
      setOwnedValue(aggregate, configuration, 'layout-y', -0)
      setOwnedValue(aggregate, configuration, 'layout-scale', 1.00000000000001)
      setOwnedValue(aggregate, configuration, 'layout-width', 77.77777777777779)
      aggregate.templates.cover.background.enabled = false
    },
  })
  const result = successful(fixture.input)
  assert.deepEqual(result.aggregate, fixture.aggregate)
  for (const release of result.releaseResult.releasedFootprint) {
    const target = targetFor(result.aggregate, release.address)
    const key = release.address.fieldId.replace('layout-', '') as
      keyof MutableLayoutTarget['layout']
    assert.equal(target.layout[key], release.currentValue)
  }
  const report = detectCaseInsertPresetCustomization({
    configuration: fixture.configuration,
    current: {
      projectKind: 'caseInsert',
      aggregate: result.aggregate as ProjectJewelCaseState,
      sessionId: fixture.input.current.sessionId as string,
      projectRevision: fixture.input.current.projectRevision as number,
      template: fixture.input.current.template as { id: string; revision: null },
    },
  })
  assert.equal(report.ok, true)
  if (report.ok) assert.equal(report.status, 'customized')
})

test('repeated stable IDs ignore array order while output preserves caller ordering and disabled payloads', () => {
  const fixture = buildFixture({
    definition: repeatedDefinition(),
    mutateSource: addRepeatedTargets,
  })
  const reordered = structuredClone(fixture.aggregate)
  reordered.templates.cover.artworkSlots.reverse()
  const current = {
    ...fixture.input.current,
    aggregate: reordered,
    snapshot: buildSnapshot(
      reordered,
      fixture.input.current.sessionId as string,
      fixture.input.current.projectRevision as number,
    ),
  }
  const result = successful({ ...fixture.input, current })
  assert.deepEqual(
    result.aggregate.templates.cover.artworkSlots.map(({ id }) => id),
    reordered.templates.cover.artworkSlots.map(({ id }) => id),
  )
  const target = result.aggregate.templates.cover.artworkSlots.find(({ id }) =>
    id === 'case:user-artwork:target')!
  assert.equal(target.enabled, false)
  assert.equal(target.imageDataUrl, 'data:image/png;base64,AA==')
})

test('deep-frozen inputs are supported and outputs remain detached from later caller mutation', () => {
  const fixture = buildFixture()
  const mutable = structuredClone(fixture.input)
  const frozen = deepFreeze(structuredClone(fixture.input))
  const result = successful(frozen)
  assert.equal(isDeeplyFrozen(frozen), true)
  ;(mutable.current.aggregate.templates.cover.background.layout as
    MutableLayoutTarget['layout']).x = 999
  assert.notEqual(result.aggregate.templates.cover.background.layout.x, 999)
  assert.throws(() => {
    ;(result.releaseResult.releasedFootprint as unknown[]).push('mutation')
  }, TypeError)
})

test('exact review acceptance is mandatory and bound to plan, review, configuration, warnings, and requirements', () => {
  const fixture = buildFixture()
  failed({ ...fixture.input, reviewAcceptance: undefined },
    'missing-review-acceptance')
  failed({ ...fixture.input, reviewAcceptance: deepFreeze({ accepted: true }) },
    'invalid-review-acceptance')
  const stale = structuredClone(fixture.input.reviewAcceptance) as MutableRecord
  stale.planReviewIdentity = 'case:preset-detach-review:v1:stale'
  failed({ ...fixture.input, reviewAcceptance: deepFreeze(stale) },
    'review-mismatch')
  const other = buildFixture({ sessionId: 'other-detach-transition-session' })
  failed({ ...fixture.input, reviewAcceptance: other.input.reviewAcceptance },
    'review-mismatch')
  const forged = structuredClone(fixture.input.reviewAcceptance) as MutableRecord
  forged.acceptanceIdentity = 'case:preset-detach-review-acceptance:v1:forged'
  failed({ ...fixture.input, reviewAcceptance: deepFreeze(forged) },
    'review-mismatch')
  const broadened = structuredClone(fixture.input.reviewAcceptance) as
    MutableRecord
  broadened.extraAuthority = true
  failed({ ...fixture.input, reviewAcceptance: deepFreeze(broadened) },
    'invalid-review-acceptance')
})

test('the current no-consent Detach profile requires the exact empty acceptance set', () => {
  const fixture = buildFixture()
  successful({ ...fixture.input, materialConsentAcceptances: [] })
  failed({ ...fixture.input, materialConsentAcceptances: undefined },
    'missing-material-consent')
  failed({
    ...fixture.input,
    materialConsentAcceptances: [deepFreeze({ requirementId: 'unexpected' })],
  }, 'unexpected-material-consent')
  failed({
    ...fixture.input,
    materialConsentAcceptances: [
      deepFreeze({ requirementId: 'duplicate' }),
      deepFreeze({ requirementId: 'duplicate' }),
    ],
  }, 'duplicate-material-consent')
})

test('request, operation, configuration domain, and attachment status fail closed', () => {
  const fixture = buildFixture()
  const invalid = transitionCaseInsertPresetDetach(null as never)
  assert.equal(invalid.ok, false)
  if (!invalid.ok) assert.equal(invalid.status, 'invalid-request')
  failed({ ...fixture.input, operation: 'reapply' }, 'unsupported-operation')

  const domain = structuredClone(fixture.configuration) as MutableRecord
  domain.kind = 'sbls/disc-preset-configuration'
  failed({ ...fixture.input, sourceConfiguration: deepFreeze(domain) },
    'invalid-source-configuration')

  const attachment = structuredClone(fixture.configuration) as MutableRecord
  attachment.attachmentStatus = 'installed'
  failed({ ...fixture.input, sourceConfiguration: deepFreeze(attachment) },
    'invalid-source-configuration')

  const cyclicPlan = structuredClone(fixture.plan) as MutableRecord
  cyclicPlan.untrustedCycle = cyclicPlan
  failed({ ...fixture.input, plan: deepFreeze(cyclicPlan) }, 'invalid-plan')

  const cyclicConfiguration = structuredClone(fixture.configuration) as
    MutableRecord
  cyclicConfiguration.untrustedCycle = cyclicConfiguration
  failed({
    ...fixture.input,
    sourceConfiguration: deepFreeze(cyclicConfiguration),
  }, 'invalid-source-configuration')
})

test('plan version, identity, operation, and hidden executable fields fail closed', () => {
  const fixture = buildFixture()
  const version = structuredClone(fixture.plan) as MutableRecord
  version.formatVersion = 2
  failed({ ...fixture.input, plan: deepFreeze(version) },
    'unsupported-plan-version')
  const identity = structuredClone(fixture.plan) as MutableRecord
  identity.planIdentity = 'case:preset-detach-plan:v1:forged'
  failed({ ...fixture.input, plan: deepFreeze(identity) },
    'plan-identity-mismatch')
  const operation = structuredClone(fixture.plan) as MutableRecord
  operation.operation = 'apply'
  failed({ ...fixture.input, plan: deepFreeze(operation) }, 'invalid-plan')
  for (const key of [
    'aggregateWrites', 'retainedOwnedFields', 'newlyClaimedFields',
    'nextConfiguration', 'selectedDefinition',
  ]) {
    const hidden = structuredClone(fixture.plan) as MutableRecord
    hidden[key] = []
    failed({ ...fixture.input, plan: deepFreeze(hidden) }, 'invalid-plan')
  }
})

test('forged projection, semantic effects, and warning evidence fail after valid reidentification', () => {
  const fixture = buildFixture()
  const projection = structuredClone(fixture.plan) as MutableRecord
  ;(projection.projectedOwnership as MutableRecord).authority = 'authoritative'
  failed(withPlan(fixture, reidentifyPlan(projection)),
    'projected-ownership-mismatch')
  const effects = structuredClone(fixture.plan) as MutableRecord
  ;(effects.semanticEffects as MutableRecord).aggregateWriteCount = 1
  failed(withPlan(fixture, reidentifyPlan(effects)), 'invalid-plan')
  const warning = structuredClone(fixture.plan) as MutableRecord
  ;((warning.warnings as MutableRecord[])[0]!).releaseCount = 999
  failed(withPlan(fixture, reidentifyPlan(warning)), 'invalid-plan')
})

test('release, preservation, and precondition footprints must be exact and unique', () => {
  const fixture = buildFixture({
    definition: createCoordinatedCaseInsertPresetDefinition(),
    scope: { kind: 'complete' },
  })
  const omit = structuredClone(fixture.plan) as MutableRecord
  ;(omit.releaseFootprint as unknown[]).pop()
  failed(withPlan(fixture, reidentifyPlan(omit)), 'footprint-mismatch')

  const duplicate = structuredClone(fixture.plan) as MutableRecord
  ;(duplicate.releaseFootprint as unknown[]).push(
    structuredClone((duplicate.releaseFootprint as unknown[])[0]),
  )
  failed(withPlan(fixture, reidentifyPlan(duplicate)),
    'duplicate-owned-address')

  const extra = structuredClone(fixture.plan) as MutableRecord
  const extraRelease = structuredClone(
    (extra.releaseFootprint as MutableRecord[])[0]!,
  )
  ;(extraRelease.address as MutableRecord).runtimeObjectId =
    'case:unowned-object'
  ;(extra.releaseFootprint as MutableRecord[]).push(extraRelease)
  failed(withPlan(fixture, reidentifyPlan(extra)), 'footprint-mismatch')

  const preservation = structuredClone(fixture.plan) as MutableRecord
  const first = (preservation.aggregatePreservations as MutableRecord[])[0]!
  first.currentValue = (first.currentValue as number) + 1
  failed(withPlan(fixture, reidentifyPlan(preservation)), 'footprint-mismatch')

  const duplicatePreservation = structuredClone(fixture.plan) as MutableRecord
  ;(duplicatePreservation.aggregatePreservations as unknown[]).push(
    structuredClone(
      (duplicatePreservation.aggregatePreservations as unknown[])[0],
    ),
  )
  failed(withPlan(fixture, reidentifyPlan(duplicatePreservation)),
    'duplicate-owned-address')

  const precondition = structuredClone(fixture.plan) as MutableRecord
  ;(precondition.preconditions as MutableRecord).fields = []
  failed(withPlan(fixture, reidentifyPlan(precondition)), 'footprint-mismatch')
})

test('forged owner, region, source provenance, and generic Spine retargeting never broaden reviewed authority', () => {
  const fixture = buildFixture()
  for (const mutate of [
    (release: MutableRecord) => {
      ;(release.address as MutableRecord).featureOwnerId =
        'case.tray.background'
    },
    (release: MutableRecord) => {
      ;(release.address as MutableRecord).region = 'tray-card'
    },
    (release: MutableRecord) => {
      ;(release.address as MutableRecord).region = 'spine'
    },
    (release: MutableRecord) => {
      ;(release.sources as MutableRecord[])[0]!.slotId =
        'case:preset-slot:role-only-retarget'
    },
  ]) {
    const plan = structuredClone(fixture.plan) as MutableRecord
    mutate((plan.releaseFootprint as MutableRecord[])[0]!)
    const result = transitionCaseInsertPresetDetach(withPlan(
      fixture,
      reidentifyPlan(plan),
    ))
    assert.equal(result.ok, false)
    if (!result.ok) {
      assert.ok([
        'footprint-mismatch',
        'unsupported-release-record',
        'invalid-region',
      ].includes(result.status))
    }
  }
})

test('configuration validation is independent, identity-bound, domain-bound, and caller-order independent', () => {
  const fixture = buildFixture({
    transformInitialResolution: (resolution) => {
      const coalesced = structuredClone(resolution)
      const duplicate = structuredClone(coalesced.value.assignments[0]!)
      duplicate.assignmentId = 'case:preset-assignment:coalesced-background'
      duplicate.slotId = 'case:preset-slot:coalesced-background'
      coalesced.value.assignments.push(duplicate)
      return deepFreeze(coalesced)
    },
  })
  const reordered = structuredClone(fixture.configuration)
  reordered.ownedFields.reverse()
  for (const field of reordered.ownedFields) {
    ;(field.sources as CaseInsertPresetAppliedConfigurationSource[]).reverse()
  }
  successful({
    ...fixture.input,
    sourceConfiguration: deepFreeze(reordered),
  })
  const forged = structuredClone(fixture.configuration) as MutableRecord
  forged.configurationIdentity = 'case:preset-applied-configuration:v1:forged'
  failed({ ...fixture.input, sourceConfiguration: deepFreeze(forged) },
    'configuration-identity-mismatch')
  const version = structuredClone(fixture.configuration) as MutableRecord
  version.formatVersion = 999
  failed({ ...fixture.input, sourceConfiguration: deepFreeze(version) },
    'unsupported-configuration-version')
  const mismatch = buildFixture({
    sessionId: 'configuration-mismatch-session',
  })
  failed({
    ...fixture.input,
    sourceConfiguration: mismatch.configuration,
  }, 'configuration-mismatch')
})

type CaseInsertPresetAppliedConfigurationSource =
  CaseInsertAppliedPresetConfiguration['ownedFields'][number]['sources'][number]

test('plan and configuration record ordering is canonical without mutating caller arrays', () => {
  const fixture = buildFixture({
    definition: createCoordinatedCaseInsertPresetDefinition(),
    scope: { kind: 'complete' },
  })
  const reordered = structuredClone(fixture.plan)
  reordered.releaseFootprint.reverse()
  reordered.aggregatePreservations.reverse()
  reordered.preconditions.fields.reverse()
  const before = structuredClone(reordered)
  const result = successful({ ...fixture.input, plan: deepFreeze(reordered) })
  assert.equal(result.transitionIdentity, successful(fixture.input)
    .transitionIdentity)
  assert.deepEqual(reordered, before)
})

test('session, revision, template, snapshot, target, enablement, and every exact field value are compare-and-swap preconditions', () => {
  const fixture = buildFixture({
    definition: createCoordinatedCaseInsertPresetDefinition(),
    scope: { kind: 'complete' },
  })
  const sessionAggregate = structuredClone(fixture.aggregate)
  failed({
    ...fixture.input,
    current: {
      ...fixture.input.current,
      sessionId: 'replacement-session',
      snapshot: buildSnapshot(
        sessionAggregate,
        'replacement-session',
        fixture.input.current.projectRevision as number,
      ),
    },
  }, 'stale-detach-plan')

  failed({
    ...fixture.input,
    current: {
      ...fixture.input.current,
      template: { id: 'other-case-template', revision: null },
    },
  }, 'stale-detach-plan')
  failed({
    ...fixture.input,
    current: {
      ...fixture.input.current,
      template: { id: fixture.input.current.template.id, revision: 1 },
    },
  }, 'attachment-context-mismatch')
  failed({
    ...fixture.input,
    current: {
      ...fixture.input.current,
      projectRevision: (fixture.input.current.projectRevision as number) + 1,
      snapshot: buildSnapshot(
        fixture.aggregate,
        fixture.input.current.sessionId as string,
        (fixture.input.current.projectRevision as number) + 1,
      ),
    },
  }, 'stale-detach-plan')
  failed({
    ...fixture.input,
    current: {
      ...fixture.input.current,
      snapshot: buildSnapshot(
        fixture.aggregate,
        fixture.input.current.sessionId as string,
        (fixture.input.current.projectRevision as number) + 1,
      ),
    },
  }, 'stale-detach-plan')

  for (const [fieldId, value] of [
    ['layout-x', 50.00000000000001],
    ['layout-y', 49.99999999999999],
    ['layout-scale', 1.00000000000001],
    ['layout-width', 80.00000000000001],
  ] as const) {
    const changed = structuredClone(fixture.aggregate)
    setOwnedValue(changed, fixture.configuration, fieldId, value)
    failed({
      ...fixture.input,
      current: {
        ...fixture.input.current,
        aggregate: changed,
        snapshot: buildSnapshot(
          changed,
          fixture.input.current.sessionId as string,
          fixture.input.current.projectRevision as number,
        ),
      },
    }, 'stale-detach-plan')
  }

  const disabled = structuredClone(fixture.aggregate)
  disabled.templates.cover.background.enabled =
    !disabled.templates.cover.background.enabled
  failed({
    ...fixture.input,
    current: {
      ...fixture.input.current,
      aggregate: disabled,
      snapshot: buildSnapshot(
        disabled,
        fixture.input.current.sessionId as string,
        fixture.input.current.projectRevision as number,
      ),
    },
  }, 'stale-detach-plan')
})

test('missing and ambiguous repeated targets block the entire multi-region result', () => {
  const definition = cloneFixture(createCoordinatedCaseInsertPresetDefinition())
  const frontSlot = ((definition as MutableRecord).slots as MutableRecord[])
    .find(({ id }) => id === 'case:preset-slot:front-cover')!
  frontSlot.roleId = 'additional-artwork'
  const assignment = (frontSlot.assignments as MutableRecord[])[0]!
  assignment.ownerId = 'case.cover.artwork-slots'
  assignment.object = { kind: 'repeated', id: 'case:user-artwork:target' }
  const fixture = buildFixture({
    definition,
    scope: { kind: 'complete' },
    mutateSource: addRepeatedTargets,
  })
  const missing = structuredClone(fixture.aggregate)
  missing.templates.cover.artworkSlots =
    missing.templates.cover.artworkSlots.filter(({ id }) =>
      id !== 'case:user-artwork:target')
  failed({
    ...fixture.input,
    current: {
      ...fixture.input.current,
      aggregate: missing,
      snapshot: buildSnapshot(
        missing,
        fixture.input.current.sessionId as string,
        fixture.input.current.projectRevision as number,
      ),
    },
  }, 'target-missing')
  const ambiguous = structuredClone(fixture.aggregate)
  ambiguous.templates.cover.artworkSlots.push(createDefaultCaseInsertImageSlot(
    'case:user-artwork:target',
    'Duplicate',
  ))
  const result = failed({
    ...fixture.input,
    current: {
      ...fixture.input.current,
      aggregate: ambiguous,
      snapshot: buildSnapshot(
        ambiguous,
        fixture.input.current.sessionId as string,
        fixture.input.current.projectRevision as number,
      ),
    },
  }, 'target-ambiguous')
  assert.deepEqual(Object.keys(result).sort(), ['address', 'code', 'ok', 'status'])
})

test('complete region evidence keeps Tray, Back Panel, left/right Spine, and mirroring distinct', () => {
  const fixture = buildFixture({
    definition: createCoordinatedCaseInsertPresetDefinition(),
    scope: { kind: 'complete' },
    mutateCurrent: (aggregate) => {
      aggregate.spine.mirrored = !aggregate.spine.mirrored
    },
  })
  const result = successful(fixture.input)
  const regions = new Set(result.releaseResult.releasedFootprint.map(
    ({ address }) => address.region,
  ))
  assert.deepEqual(regions, new Set([
    'front-cover', 'tray-card', 'back-panel', 'left-spine', 'right-spine',
  ]))
  assert.equal(result.releaseResult.releasedFootprint
    .filter(({ address }) => address.region === 'tray-card')
    .every(({ address }) => address.featureOwnerId === 'case.tray.background'),
  true)
  assert.equal(result.releaseResult.releasedFootprint
    .filter(({ address }) => address.region === 'back-panel')
    .every(({ address }) => address.featureOwnerId === 'case.tray.text-blocks'),
  true)
  assert.equal(result.releaseResult.releasedFootprint
    .filter(({ address }) => address.region === 'left-spine')
    .every(({ address }) => address.featureOwnerId.startsWith('case.spine.left.')),
  true)
  assert.equal(result.releaseResult.releasedFootprint
    .filter(({ address }) => address.region === 'right-spine')
    .every(({ address }) => address.featureOwnerId.startsWith('case.spine.right.')),
  true)
  assert.equal(result.aggregate.spine.mirrored, fixture.aggregate.spine.mirrored)
})

test('transition identities are deterministic and bind plan, configuration, review, revision, template, and exact values', () => {
  const fixture = buildFixture()
  const first = successful(fixture.input)
  const second = successful(fixture.input)
  assert.equal(first.transitionIdentity, second.transitionIdentity)

  const reviewed = structuredClone(fixture.input.reviewAcceptance) as
    MutableRecord
  reviewed.acceptanceIdentity = `${reviewed.acceptanceIdentity}:other`
  failed({ ...fixture.input, reviewAcceptance: deepFreeze(reviewed) },
    'review-mismatch')

  const changedValue = buildFixture({
    mutateCurrent: (aggregate, configuration) =>
      setOwnedValue(aggregate, configuration, 'layout-x', 43.21000000000001),
  })
  assert.notEqual(successful(changedValue.input).transitionIdentity,
    first.transitionIdentity)
})

test('transition source has no planner rerun, writer, detector, resolver, catalog, UI, renderer, persistence, or runtime dependency', () => {
  const source = readFileSync(
    new URL('./caseInsertPresetDetachTransition.ts', import.meta.url),
    'utf8',
  )
  for (const forbidden of [
    'planCaseInsertPresetDetach',
    'planCaseInsertPresetFirstApply',
    'applyCaseInsertPresetFirstTime',
    'planCaseInsertPresetReapply',
    'transitionCaseInsertPresetReapply',
    'detectCaseInsertPresetCustomization',
    'resolveCaseInsertPresetAssignments',
    'evaluateCaseInsertPresetCompatibility',
    'CASE_INSERT_PRESET_CATALOG',
    'caseInsertPresetCatalog',
    'applyCaseInsertPresetAggregateLayoutWrites',
    'geometry',
    'react',
    'store',
    'renderer',
    'preview',
    '../export/',
    'filesystem',
    'persistence',
    '@tauri-apps',
  ]) assert.equal(source.includes(forbidden), false, forbidden)
  assert.deepEqual(CASE_INSERT_PRESET_CATALOG.list(), [])
})
