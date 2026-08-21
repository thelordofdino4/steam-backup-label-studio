import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  createCaseInsertPresetUnattachedEndpoint,
} from './caseInsertPresetAttachmentEndpoint.ts'

import { createDefaultCaseInsertImageSlot } from '../caseInsert/defaults.ts'
import { normalizeProjectJewelCaseState } from '../caseInsert/normalization.ts'
import {
  createCaseInsertPresetAssignmentSnapshot,
  resolveCaseInsertPresetAggregateBinding,
  type CaseInsertPresetAssignmentSnapshot,
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
import {
  planCaseInsertPresetFirstApply,
} from './caseInsertPresetApplyPlanning.ts'
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
  validateCaseInsertAppliedPresetConfigurationCandidate,
  type CaseInsertAppliedPresetConfiguration,
  type CaseInsertAppliedPresetOwnedFieldAddress,
} from './caseInsertPresetAppliedConfiguration.ts'
import {
  canonicalizeCaseInsertPresetDetachPlanContent,
  createCaseInsertPresetDetachPlanIdentity,
  createCaseInsertPresetDetachReleaseIdentity,
  createCaseInsertPresetDetachReviewIdentity,
} from './caseInsertPresetDetachIdentity.ts'
import {
  planCaseInsertPresetDetach,
  type CaseInsertPresetDetachPlan,
  type PlanCaseInsertPresetDetachInput,
} from './caseInsertPresetDetachPlanning.ts'
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
  input: PlanCaseInsertPresetDetachInput
}>

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) deepFreeze(child)
    Object.freeze(value)
  }
  return value
}

function isDeeplyFrozen(value: unknown): boolean {
  if (!value || typeof value !== 'object' || !Object.isFrozen(value)) return false
  return Object.values(value).every((child) =>
    !child || typeof child !== 'object' || isDeeplyFrozen(child))
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
  mutateSource?: (aggregate: ProjectJewelCaseState) => void
  mutateCurrent?: (
    aggregate: ProjectJewelCaseState,
    configuration: CaseInsertAppliedPresetConfiguration,
  ) => void
  sessionId?: string
  sourceRevision?: number
  currentRevision?: number
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
  const sessionId = options.sessionId ?? 'detach-planning-session'
  const sourceRevision = options.sourceRevision ?? 20
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
  const executableResolution = options.transformInitialResolution
    ? options.transformInitialResolution(resolution)
    : resolution
  const planning = planCaseInsertPresetFirstApply({
    operation: 'apply',
    resolution: executableResolution,
    expected: {
      projectKind: 'caseInsert',
      preset: { id: definition.id, revision: definition.revision },
      requestedScope,
      snapshotIdentity: sourceSnapshot.value.identity,
    },
  })
  assert.equal(planning.ok, true)
  if (!planning.ok) throw new Error(planning.status)
  const acceptances = planning.plan.materialConsentRequirements.map(({ id }) =>
    createCaseInsertPresetMaterialConsentAcceptance(planning.plan, id))
  assert.equal(acceptances.every(Boolean), true)
  const transition = applyCaseInsertPresetFirstTime({
    planningResult: planning,
    source: {
      projectKind: 'caseInsert',
      aggregate: structuredClone(sourceSnapshot.value.caseInsert),
      snapshotIdentity: sourceSnapshot.value.identity,
      preset: { id: definition.id, revision: definition.revision },
      requestedScope,
    },
    attachment: createCaseInsertPresetUnattachedEndpoint(),
    reviewApproval: createCaseInsertPresetApplyReviewApproval(planning.plan),
    materialConsentAcceptances:
      acceptances as CaseInsertPresetMaterialConsentAcceptance[],
  })
  assert.equal(transition.ok, true)
  if (!transition.ok) throw new Error(`${transition.status}:${transition.code}`)
  const validated = validateCaseInsertAppliedPresetConfigurationCandidate(
    transition,
  )
  assert.equal(validated.ok, true)
  if (!validated.ok) throw new Error(`${validated.status}:${validated.code}`)
  const aggregate = structuredClone(transition.aggregate)
  options.mutateCurrent?.(aggregate, validated.configuration)
  const normalized = normalizeProjectJewelCaseState(aggregate)
  const currentRevision = options.currentRevision ?? sourceRevision + 1
  const snapshot = buildSnapshot(normalized, sessionId, currentRevision)
  return {
    definition,
    configuration: validated.configuration,
    aggregate: normalized,
    input: {
      operation: 'detach',
      configuration: validated.configuration,
      current: {
        projectKind: 'caseInsert',
        aggregate: normalized,
        sessionId,
        projectRevision: currentRevision,
        template: validated.configuration.template,
        snapshot,
      },
    },
  }
}

function successful(input: PlanCaseInsertPresetDetachInput) {
  const result = planCaseInsertPresetDetach(input)
  assert.equal(result.ok, true)
  if (!result.ok) throw new Error(`${result.status}:${result.code}`)
  return result
}

function failed(input: PlanCaseInsertPresetDetachInput, status: string) {
  const result = planCaseInsertPresetDetach(input)
  assert.equal(result.ok, false)
  if (result.ok) throw new Error('Expected Detach planning to fail.')
  assert.equal(result.status, status)
  assert.equal('plan' in result, false)
  assert.equal('projectedOwnership' in result, false)
  assert.equal('releaseFootprint' in result, false)
  return result
}

function addressKey(address: CaseInsertAppliedPresetOwnedFieldAddress) {
  return [
    address.region,
    address.featureOwnerId,
    address.bindingKind,
    address.bindingId,
    address.runtimeObjectId,
    address.fieldId,
  ].join('|')
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
  assert.equal(binding.currentState.id, address.runtimeObjectId)
  return binding.currentState as MutableLayoutTarget
}

function setOwnedValue(
  aggregate: ProjectJewelCaseState,
  configuration: CaseInsertAppliedPresetConfiguration,
  index: number,
  value: number,
) {
  const address = configuration.ownedFields[index]!.address
  const target = targetFor(aggregate, address)
  switch (address.fieldId) {
    case 'layout-x': target.layout.x = value; break
    case 'layout-y': target.layout.y = value; break
    case 'layout-scale': target.layout.scale = value; break
    case 'layout-width': target.layout.width = value; break
  }
}

function planContent(plan: CaseInsertPresetDetachPlan) {
  return Object.fromEntries(Object.entries(plan).filter(([key]) =>
    key !== 'reviewIdentity' && key !== 'planIdentity')) as Omit<
      CaseInsertPresetDetachPlan,
      'reviewIdentity' | 'planIdentity'
    >
}

test('valid configuration plans complete exact release with zero aggregate writes', () => {
  const fixture = buildFixture()
  const inputBefore = structuredClone(fixture.input)
  const result = successful(fixture.input)
  const { plan } = result

  assert.equal(plan.operation, 'detach')
  assert.equal(plan.releaseFootprint.length, fixture.configuration.ownedFields.length)
  assert.equal(plan.aggregatePreservations.length, plan.releaseFootprint.length)
  assert.equal(new Set(plan.releaseFootprint.map(({ address }) =>
    addressKey(address))).size, fixture.configuration.ownedFields.length)
  assert.deepEqual(
    new Set(plan.releaseFootprint.map(({ address }) => addressKey(address))),
    new Set(fixture.configuration.ownedFields.map(({ address }) =>
      addressKey(address))),
  )
  assert.equal(plan.semanticEffects.aggregateWriteCount, 0)
  assert.equal(plan.semanticEffects.releasesCompleteConfiguration, true)
  assert.equal(plan.semanticEffects.preservesEveryAggregateValue, true)
  assert.equal(
    plan.semanticEffects.configurationDisposition,
    'remove-authoritative-applied-preset-configuration',
  )
  assert.deepEqual(plan.materialConsentRequirements, [])
  assert.deepEqual(plan.projectedOwnership, {
    kind: 'sbls/case-insert-preset-detach-ownership-projection',
    authority: 'non-authoritative-detach-projection',
    sourceConfigurationIdentity: fixture.configuration.configurationIdentity,
    state: 'no-applied-preset-ownership',
    ownedFieldCount: 0,
  })
  assert.equal(plan.warnings.length, 1)
  assert.equal(plan.warnings[0]!.kind,
    'complete-applied-preset-ownership-release')
  assert.equal(plan.warnings[0]!.aggregateEffect,
    'preserve-every-current-value')
  assert.equal('aggregateActions' in plan, false)
  assert.equal('nextConfiguration' in plan, false)
  assert.equal('retainedOwnedFields' in plan, false)
  assert.equal('newlyClaimedFields' in plan, false)
  assert.equal('selectedDefinition' in plan, false)
  assert.equal('reviewAcceptance' in plan, false)
  assert.equal('consentAcceptance' in plan, false)
  assert.equal(isDeeplyFrozen(result), true)
  assert.deepEqual(fixture.input, inputBefore)
})

test('clean, customized, and mixed fields have identical release semantics and preserve exact values', () => {
  const clean = buildFixture({
    definition: createCoordinatedCaseInsertPresetDefinition(),
    scope: { kind: 'complete' },
  })
  const customized = buildFixture({
    definition: createCoordinatedCaseInsertPresetDefinition(),
    scope: { kind: 'complete' },
    mutateCurrent: (aggregate, configuration) => {
      setOwnedValue(aggregate, configuration, 0, 12.3456789012345)
      setOwnedValue(aggregate, configuration, 7, 87.00000000000001)
    },
  })
  const cleanPlan = successful(clean.input).plan
  const plan = successful(customized.input).plan

  assert.equal(plan.releaseFootprint.length, cleanPlan.releaseFootprint.length)
  for (const release of plan.releaseFootprint) {
    assert.equal(release.ownershipDisposition,
      'release-complete-configuration-ownership')
    assert.equal(release.aggregateDisposition, 'preserve-exact-current-value')
    const preservation = plan.aggregatePreservations.find(({ address }) =>
      addressKey(address) === addressKey(release.address))
    assert.ok(preservation)
    assert.equal(preservation.currentValue, release.currentValue)
    assert.equal(preservation.preservation, 'exact-current-value-no-write')
  }
  assert.equal(plan.releaseFootprint[0]!.currentValue, 12.3456789012345)
  assert.equal(plan.releaseFootprint[7]!.currentValue, 87.00000000000001)
  assert.notEqual(
    plan.releaseFootprint[0]!.currentValue,
    plan.releaseFootprint[0]!.previousLastAppliedValue,
  )
  assert.equal('customizationPolicy' in plan, false)
  assert.equal('overwrite' in plan, false)
  assert.equal('restore' in plan, false)
})

test('plan and review identities are exact, deterministic, and bind configuration, revision, values, target, and template', () => {
  const base = buildFixture()
  const same = successful(base.input).plan
  const repeated = successful(base.input).plan
  assert.deepEqual(repeated, same)
  assert.equal(
    same.reviewIdentity,
    createCaseInsertPresetDetachReviewIdentity(planContent(same)),
  )
  assert.equal(
    same.planIdentity,
    createCaseInsertPresetDetachPlanIdentity({
      ...planContent(same),
      reviewIdentity: same.reviewIdentity,
    }),
  )

  const anotherConfiguration = successful(buildFixture({
    sessionId: 'another-detach-session',
  }).input).plan
  assert.notEqual(anotherConfiguration.source.configurationIdentity,
    same.source.configurationIdentity)
  assert.notEqual(anotherConfiguration.planIdentity, same.planIdentity)

  const laterRevision = successful(buildFixture({ currentRevision: 22 }).input)
    .plan
  assert.notEqual(laterRevision.planIdentity, same.planIdentity)

  const changedValue = successful(buildFixture({
    mutateCurrent: (aggregate, configuration) =>
      setOwnedValue(aggregate, configuration, 0, 50.00000000000001),
  }).input).plan
  assert.notEqual(changedValue.planIdentity, same.planIdentity)

  const changedDefinition = cloneFixture(createMinimalCaseInsertPresetDefinition())
  ;(changedDefinition as MutableRecord).id = 'builtin:case-preset:other-target'
  const changedSlot = ((changedDefinition as MutableRecord).slots as
    MutableRecord[])[0]!
  changedSlot.roleId = 'game-title'
  const assignment = (changedSlot.assignments as MutableRecord[])[0]!
  assignment.ownerId = 'case.cover.title-artwork'
  assignment.object = { kind: 'fixed', id: 'case:cover:title-artwork' }
  const changedTarget = successful(buildFixture({
    definition: changedDefinition,
  }).input).plan
  assert.notEqual(changedTarget.planIdentity, same.planIdentity)

  const changedTemplateContent = structuredClone(planContent(same))
  ;(changedTemplateContent.source.template as { id: string }).id = 'future-case'
  ;(changedTemplateContent.preconditions.template as { id: string }).id =
    'future-case'
  assert.notEqual(
    createCaseInsertPresetDetachReviewIdentity(changedTemplateContent),
    same.reviewIdentity,
  )
})

test('canonical identities ignore release, preservation, precondition, and provenance caller ordering without mutating arrays', () => {
  const fixture = buildFixture({
    transformInitialResolution: (resolution) => {
      const coalesced = structuredClone(resolution)
      const duplicate = structuredClone(coalesced.value.assignments[0]!)
      duplicate.assignmentId =
        'case:preset-assignment:coalesced-background'
      duplicate.slotId = 'case:preset-slot:coalesced-background'
      coalesced.value.assignments.push(duplicate)
      return deepFreeze(coalesced)
    },
  })
  const plan = successful(fixture.input).plan
  assert.equal(plan.releaseFootprint.every(({ sources }) =>
    sources.length === 2), true)
  const reorderedConfiguration = structuredClone(fixture.configuration)
  reorderedConfiguration.ownedFields.reverse()
  for (const field of reorderedConfiguration.ownedFields) field.sources.reverse()
  const configurationBefore = structuredClone(reorderedConfiguration)
  const reorderedPlan = successful({
    ...fixture.input,
    configuration: reorderedConfiguration,
  }).plan
  assert.deepEqual(reorderedPlan, plan)
  assert.deepEqual(reorderedConfiguration, configurationBefore)
  assert.equal(Object.isFrozen(reorderedConfiguration), false)

  const shuffled = structuredClone(planContent(plan))
  shuffled.releaseFootprint.reverse()
  shuffled.aggregatePreservations.reverse()
  shuffled.preconditions.fields.reverse()
  const before = structuredClone(shuffled)
  const canonical = canonicalizeCaseInsertPresetDetachPlanContent(shuffled)
  assert.deepEqual(shuffled, before)
  assert.equal(
    createCaseInsertPresetDetachReviewIdentity(shuffled),
    plan.reviewIdentity,
  )
  assert.equal(
    createCaseInsertPresetDetachPlanIdentity({
      ...shuffled,
      reviewIdentity: plan.reviewIdentity,
    }),
    plan.planIdentity,
  )
  assert.deepEqual(canonical, planContent(plan))
  const release = plan.releaseFootprint[0]!
  const forwardSources = structuredClone(release.sources)
  const reversedSources = [...forwardSources].reverse()
  assert.equal(createCaseInsertPresetDetachReleaseIdentity({
    ...release,
    sources: forwardSources,
  }), createCaseInsertPresetDetachReleaseIdentity({
    ...release,
    sources: reversedSources,
  }))
  assert.deepEqual(forwardSources, release.sources)
})

test('configuration validation fails closed for unsupported, forged, foreign, hidden, duplicate, and unsupported-field data', () => {
  const fixture = buildFixture()
  const unsupported = cloneFixture(fixture.configuration) as MutableRecord
  unsupported.formatVersion = 999
  failed({ ...fixture.input, configuration: deepFreeze(unsupported) },
    'unsupported-configuration-version')

  const forged = cloneFixture(fixture.configuration) as MutableRecord
  forged.configurationIdentity = 'case:preset-configuration:v1:forged'
  failed({ ...fixture.input, configuration: deepFreeze(forged) },
    'configuration-identity-mismatch')

  failed({ ...fixture.input, configuration: deepFreeze({
    kind: 'sbls/disc-applied-preset-configuration',
    formatVersion: 1,
  }) }, 'invalid-source-configuration')

  const extended = cloneFixture(fixture.configuration) as MutableRecord
  extended.hiddenOwnership = ['layout-rotation']
  failed({ ...fixture.input, configuration: deepFreeze(extended) },
    'invalid-source-configuration')

  const unsupportedField = cloneFixture(fixture.configuration) as MutableRecord
  const unsupportedFields = unsupportedField.ownedFields as MutableRecord[]
  ;(unsupportedFields[0]!.address as MutableRecord).fieldId = 'layout-rotation'
  failed({ ...fixture.input, configuration: deepFreeze(unsupportedField) },
    'unsupported-owned-field')

  const duplicate = cloneFixture(fixture.configuration) as MutableRecord
  ;(duplicate.ownedFields as unknown[]).push(
    cloneFixture((duplicate.ownedFields as unknown[])[0]),
  )
  failed({ ...fixture.input, configuration: deepFreeze(duplicate) },
    'duplicate-owned-address')

  const incomplete = cloneFixture(fixture.configuration) as MutableRecord
  ;(incomplete.ownedFields as unknown[]).pop()
  failed({ ...fixture.input, configuration: deepFreeze(incomplete) },
    'configuration-identity-mismatch')
})

test('session, revision, template, project-kind, snapshot, and exact-value freshness are strict', () => {
  const fixture = buildFixture()
  failed({
    ...fixture.input,
    current: { ...fixture.input.current, projectKind: 'disc' },
  }, 'invalid-request')
  failed({
    ...fixture.input,
    current: { ...fixture.input.current, sessionId: 'wrong-session' },
  }, 'attachment-context-mismatch')
  failed({
    ...fixture.input,
    current: {
      ...fixture.input.current,
      projectRevision:
        fixture.configuration.source.snapshotIdentity.projectRevision - 1,
    },
  }, 'stale-detach-context')
  failed({
    ...fixture.input,
    current: {
      ...fixture.input.current,
      template: { id: 'not-a-template', revision: null },
    },
  }, 'attachment-context-mismatch')
  failed({
    ...fixture.input,
    current: {
      ...fixture.input.current,
      template: { id: fixture.configuration.template.id, revision: 1 },
    },
  }, 'invalid-request')
  failed({
    ...fixture.input,
    current: {
      ...fixture.input.current,
      projectRevision: (fixture.input.current.projectRevision as number) + 1,
    },
  }, 'stale-detach-context')

  const changed = structuredClone(fixture.aggregate)
  setOwnedValue(changed, fixture.configuration, 0, 50.00000000000001)
  failed({
    ...fixture.input,
    current: { ...fixture.input.current, aggregate: changed },
  }, 'stale-detach-context')
  const epsilon = successful(buildFixture({
    mutateCurrent: (aggregate, configuration) =>
      setOwnedValue(aggregate, configuration, 0, 50.00000000000001),
  }).input).plan
  assert.equal(epsilon.releaseFootprint[0]!.currentValue, 50.00000000000001)
  assert.notEqual(epsilon.releaseFootprint[0]!.currentValue, 50)
})

test('fixed Front, Back Panel, complete Tray, and independent spines retain exact concrete regions', () => {
  const fixture = buildFixture({
    definition: createCoordinatedCaseInsertPresetDefinition(),
    scope: { kind: 'complete' },
    mutateSource: (aggregate) => { aggregate.spine.mirrored = true },
  })
  const plan = successful(fixture.input).plan
  assert.deepEqual(plan.resolvedRegions, [
    'front-cover',
    'tray-card',
    'back-panel',
    'left-spine',
    'right-spine',
  ])
  const regions = new Set(plan.releaseFootprint.map(({ address }) =>
    address.region))
  assert.deepEqual(regions, new Set([
    'front-cover',
    'tray-card',
    'back-panel',
    'left-spine',
    'right-spine',
  ]))
  assert.equal(plan.releaseFootprint.some(({ address }) =>
    address.region === ('spine' as never)), false)
  assert.equal(plan.releaseFootprint.filter(({ address }) =>
    address.region === 'left-spine').every(({ address }) =>
    address.featureOwnerId.startsWith('case.spine.left.')), true)
  assert.equal(plan.releaseFootprint.filter(({ address }) =>
    address.region === 'right-spine').every(({ address }) =>
    address.featureOwnerId.startsWith('case.spine.right.')), true)
  assert.equal(plan.releaseFootprint.filter(({ address }) =>
    address.region === 'tray-card').every(({ address }) =>
    address.featureOwnerId === 'case.tray.background'), true)
  assert.equal(plan.releaseFootprint.filter(({ address }) =>
    address.region === 'back-panel').every(({ address }) =>
    address.featureOwnerId === 'case.tray.text-blocks'), true)
  assert.equal(plan.releaseFootprint.every(({ address }) =>
    address.bindingKind === 'fixed'), true)
})

test('repeated stable-ID lookup ignores array order, preserves disabled payload, and rejects ambiguous or missing targets', () => {
  const raw = createMinimalCaseInsertPresetDefinition()
  const slot = ((raw as MutableRecord).slots as MutableRecord[])[0]!
  slot.roleId = 'additional-artwork'
  const assignment = (slot.assignments as MutableRecord[])[0]!
  assignment.ownerId = 'case.cover.artwork-slots'
  assignment.object = { kind: 'repeated', id: 'case:user-artwork:target' }
  const addTargets = (aggregate: ProjectJewelCaseState) => {
    const target = createDefaultCaseInsertImageSlot(
      'case:user-artwork:target',
      'Target',
      { enabled: false },
    )
    target.imageDataUrl = 'data:image/png;base64,AA=='
    target.imageSource = {
      source: 'custom',
      sourceId: 'fixture-image',
      sourceLabel: 'Fixture image',
    }
    aggregate.templates.cover.artworkSlots.push(
      target,
      createDefaultCaseInsertImageSlot(
        'case:user-artwork:other',
        'Other',
        { enabled: true },
      ),
    )
  }
  const ordered = buildFixture({ definition: raw, mutateSource: addTargets })
  const reordered = buildFixture({
    definition: raw,
    mutateSource: addTargets,
    mutateCurrent: (aggregate) => aggregate.templates.cover.artworkSlots.reverse(),
  })
  const first = successful(ordered.input).plan
  const second = successful(reordered.input).plan
  assert.notEqual(first.reviewIdentity, second.reviewIdentity)
  assert.notEqual(first.planIdentity, second.planIdentity)
  assert.notEqual(
    first.preconditions.aggregateContentIdentity,
    second.preconditions.aggregateContentIdentity,
  )
  assert.equal(second.releaseFootprint.every(({ address, enablement }) =>
    address.runtimeObjectId === 'case:user-artwork:target' &&
    address.bindingKind === 'repeated' && !enablement.objectEnabled &&
    !enablement.effectiveEnabled), true)
  assert.equal(
    reordered.aggregate.templates.cover.artworkSlots.find(({ id }) =>
      id === 'case:user-artwork:target')!.imageDataUrl,
    'data:image/png;base64,AA==',
  )

  const duplicate = structuredClone(reordered.aggregate)
  duplicate.templates.cover.artworkSlots.push(createDefaultCaseInsertImageSlot(
    'case:user-artwork:target',
    'Duplicate',
  ))
  const duplicateSnapshot = buildSnapshot(
    duplicate,
    reordered.input.current.sessionId as string,
    reordered.input.current.projectRevision as number,
  )
  failed({
    ...reordered.input,
    current: {
      ...reordered.input.current,
      aggregate: duplicate,
      snapshot: duplicateSnapshot,
    },
  }, 'target-ambiguous')

  const missing = structuredClone(reordered.aggregate)
  missing.templates.cover.artworkSlots =
    missing.templates.cover.artworkSlots.filter(({ id }) =>
      id !== 'case:user-artwork:target')
  const missingSnapshot = buildSnapshot(
    missing,
    reordered.input.current.sessionId as string,
    reordered.input.current.projectRevision as number,
  )
  failed({
    ...reordered.input,
    current: {
      ...reordered.input.current,
      aggregate: missing,
      snapshot: missingSnapshot,
    },
  }, 'target-missing')
})

test('one invalid target blocks a complete multi-region plan and returns no partial output', () => {
  const definition = createCoordinatedCaseInsertPresetDefinition()
  const frontSlot = ((definition as MutableRecord).slots as MutableRecord[])
    .find(({ id }) => id === 'case:preset-slot:front-cover')!
  frontSlot.roleId = 'additional-artwork'
  const frontAssignment = (frontSlot.assignments as MutableRecord[])[0]!
  frontAssignment.ownerId = 'case.cover.artwork-slots'
  frontAssignment.object = {
    kind: 'repeated',
    id: 'case:user-artwork:atomic-target',
  }
  const fixture = buildFixture({
    definition,
    scope: { kind: 'complete' },
    mutateSource: (aggregate) => {
      aggregate.templates.cover.artworkSlots.push(
        createDefaultCaseInsertImageSlot(
          'case:user-artwork:atomic-target',
          'Atomic target',
        ),
      )
    },
  })
  const invalid = structuredClone(fixture.aggregate)
  invalid.templates.cover.artworkSlots.push(createDefaultCaseInsertImageSlot(
    'case:user-artwork:atomic-target',
    'Ambiguous target',
  ))
  const snapshot = buildSnapshot(
    invalid,
    fixture.input.current.sessionId as string,
    fixture.input.current.projectRevision as number,
  )
  const result = failed({
    ...fixture.input,
    current: { ...fixture.input.current, aggregate: invalid, snapshot },
  }, 'target-ambiguous')
  assert.deepEqual(Object.keys(result).sort(), ['address', 'code', 'ok', 'status'])
})

test('deep-frozen inputs work and planner outputs are detached, frozen, and non-mutating', () => {
  const fixture = buildFixture({
    definition: createCoordinatedCaseInsertPresetDefinition(),
    scope: { kind: 'complete' },
  })
  const frozenInput = deepFreeze(structuredClone(fixture.input))
  const before = structuredClone(frozenInput)
  const result = successful(frozenInput)
  assert.deepEqual(frozenInput, before)
  assert.equal(isDeeplyFrozen(frozenInput), true)
  assert.equal(isDeeplyFrozen(result), true)
  assert.notEqual(result.plan.releaseFootprint,
    fixture.configuration.ownedFields)
  assert.notEqual(result.plan.source.configurationSnapshotIdentity,
    fixture.configuration.source.snapshotIdentity)
  assert.throws(() => {
    ;(result.plan.releaseFootprint as unknown[]).push('mutation')
  }, TypeError)
})

test('planner accepts no review, consent, definition, report, policy, execution, configuration, store, persistence, or runtime dependency', () => {
  const fixture = buildFixture()
  const inputKeys = Object.keys(fixture.input).sort()
  assert.deepEqual(inputKeys, ['configuration', 'current', 'operation'])
  assert.deepEqual(Object.keys(fixture.input.current).sort(), [
    'aggregate',
    'projectKind',
    'projectRevision',
    'sessionId',
    'snapshot',
    'template',
  ])
  assert.equal(CASE_INSERT_PRESET_CATALOG.list().length, 1)

  const plannerSource = readFileSync(
    new URL('./caseInsertPresetDetachPlanning.ts', import.meta.url),
    'utf8',
  )
  for (const forbidden of [
    'caseInsertPresetApplyPlanning',
    'planCaseInsertPresetFirstApply',
    'applyCaseInsertPresetFirstTime',
    'caseInsertPresetReapplyPlanning',
    'caseInsertPresetReapplyTransition',
    'detectCaseInsertPresetCustomization',
    'caseInsertPresetAssignmentResolution',
    'caseInsertPresetCompatibility',
    'caseInsertPresetCatalog',
    'react',
    'tauri',
    'renderer',
    'filesystem',
    'projectSchema',
    'lifecycleStore',
  ]) assert.equal(plannerSource.includes(forbidden), false, forbidden)

  const result = successful(fixture.input)
  assert.equal('aggregate' in result, false)
  assert.equal('configuration' in result, false)
  assert.equal('configurationCandidate' in result.plan, false)
  assert.equal('reviewAcceptance' in result.plan, false)
  assert.equal('materialConsentAcceptance' in result.plan, false)
})

test('typed request and operation failures contain no actionable output', () => {
  const fixture = buildFixture()
  failed({ ...fixture.input, operation: 'reapply' }, 'unsupported-operation')
  failed(null as unknown as PlanCaseInsertPresetDetachInput, 'invalid-request')
  failed({
    ...fixture.input,
    current: {
      ...fixture.input.current,
      snapshot: {} as CaseInsertPresetAssignmentSnapshot,
    },
  }, 'attachment-context-mismatch')
})
