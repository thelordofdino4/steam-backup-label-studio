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
  createCaseInsertPresetResolvedLayoutProposal,
  planCaseInsertPresetFirstApply,
} from './caseInsertPresetApplyPlanning.ts'
import {
  resolveCaseInsertPresetAssignments,
  resolveCaseInsertPresetAssignmentsForDefinition,
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
  type CaseInsertPresetCustomizationReport,
} from './caseInsertPresetAppliedConfiguration.ts'
import {
  planCaseInsertPresetReapply,
  type CaseInsertPresetCustomizedFieldPolicy,
  type CaseInsertPresetCustomizedFieldPolicyRecord,
  type PlanCaseInsertPresetReapplyInput,
} from './caseInsertPresetReapplyPlanning.ts'
import {
  cloneFixture,
  createCoordinatedCaseInsertPresetDefinition,
  createMinimalCaseInsertPresetDefinition,
} from './caseInsertPresetTestFixtures.ts'

type MutableDefinition = ReturnType<typeof createMinimalCaseInsertPresetDefinition>

type Fixture = Readonly<{
  definition: CaseInsertPresetDefinitionV1
  configuration: CaseInsertAppliedPresetConfiguration
  report: CaseInsertPresetCustomizationReport
  aggregate: ProjectJewelCaseState
  input: PlanCaseInsertPresetReapplyInput
}>

type SuccessfulResolution = Extract<
  CaseInsertPresetAssignmentResolutionResult,
  { ok: true }
>

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) deepFreeze(child)
    Object.freeze(value)
  }
  return value
}

function buildFixture(options: Readonly<{
  definition?: unknown
  scope?: CaseInsertPresetApplicationScope
  mutateCurrent?: (aggregate: ProjectJewelCaseState) => void
  mutateSource?: (aggregate: ProjectJewelCaseState) => void
  sessionId?: string
  currentRevision?: number
  transformInitialResolution?: (
    resolution: SuccessfulResolution,
  ) => SuccessfulResolution
}> = {}): Fixture {
  const rawDefinition = options.definition ??
    createMinimalCaseInsertPresetDefinition()
  const catalogResult = createCaseInsertPresetCatalog({
    builtins: [rawDefinition],
  })
  assert.equal(catalogResult.ok, true)
  if (!catalogResult.ok) throw new Error(catalogResult.error.code)
  const definition = catalogResult.catalog.list()[0]!
  const parsedDefinition = catalogResult.catalog.getExact(
    definition.id,
    definition.revision,
  )!
  const sessionId = options.sessionId ?? 'reapply-planning-session'
  const sourceRevision = 20
  const project = createBlankJewelCaseSavedProject()
  options.mutateSource?.(project.caseInsert)
  project.caseInsert = normalizeProjectJewelCaseState(project.caseInsert)
  const sourceSnapshot = createCaseInsertPresetAssignmentSnapshot({
    sessionId,
    projectRevision: sourceRevision,
    project: captureNormalizedProjectSnapshot(project),
  })
  assert.equal(sourceSnapshot.ok, true)
  if (!sourceSnapshot.ok) throw new Error(sourceSnapshot.error.code)
  const scope = options.scope ?? parsedDefinition.applicationScopes[0]!
  const resolution = resolveCaseInsertPresetAssignments({
    catalog: catalogResult.catalog,
    reference: {
      id: parsedDefinition.id,
      revision: parsedDefinition.revision,
    },
    requestedScope: scope,
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
      preset: {
        id: parsedDefinition.id,
        revision: parsedDefinition.revision,
      },
      requestedScope: scope,
      snapshotIdentity: sourceSnapshot.value.identity,
    },
  })
  assert.equal(planning.ok, true)
  if (!planning.ok) throw new Error(planning.status)
  const materialConsentAcceptances = planning.plan
    .materialConsentRequirements
    .map(({ id }) => createCaseInsertPresetMaterialConsentAcceptance(
      planning.plan,
      id,
    ))
  assert.equal(materialConsentAcceptances.every(Boolean), true)
  const transition = applyCaseInsertPresetFirstTime({
    planningResult: planning,
    source: {
      projectKind: 'caseInsert',
      aggregate: structuredClone(sourceSnapshot.value.caseInsert),
      snapshotIdentity: sourceSnapshot.value.identity,
      preset: {
        id: parsedDefinition.id,
        revision: parsedDefinition.revision,
      },
      requestedScope: scope,
    },
    attachment: createCaseInsertPresetUnattachedEndpoint(),
    reviewApproval: createCaseInsertPresetApplyReviewApproval(planning.plan),
    materialConsentAcceptances:
      materialConsentAcceptances as CaseInsertPresetMaterialConsentAcceptance[],
  })
  assert.equal(transition.ok, true)
  if (!transition.ok) throw new Error(`${transition.status}:${transition.code}`)
  const validated = validateCaseInsertAppliedPresetConfigurationCandidate(
    transition,
  )
  assert.equal(validated.ok, true)
  if (!validated.ok) throw new Error(`${validated.status}:${validated.code}`)
  const aggregate = structuredClone(transition.aggregate)
  options.mutateCurrent?.(aggregate)
  const normalized = normalizeProjectJewelCaseState(aggregate)
  const currentRevision = options.currentRevision ?? 21
  const detection = detectCaseInsertPresetCustomization({
    configuration: validated.configuration,
    current: {
      projectKind: 'caseInsert',
      aggregate: normalized,
      sessionId,
      projectRevision: currentRevision,
      template: validated.configuration.template,
    },
  })
  assert.equal(detection.ok, true)
  if (!detection.ok) throw new Error(`${detection.status}:${detection.code}`)
  const currentProject = createBlankJewelCaseSavedProject()
  currentProject.caseInsert = structuredClone(normalized)
  const currentSnapshot = createCaseInsertPresetAssignmentSnapshot({
    sessionId,
    projectRevision: currentRevision,
    project: captureNormalizedProjectSnapshot(currentProject),
  })
  assert.equal(currentSnapshot.ok, true)
  if (!currentSnapshot.ok) throw new Error(currentSnapshot.error.code)
  return {
    definition: parsedDefinition,
    configuration: validated.configuration,
    report: detection,
    aggregate: normalized,
    input: {
      operation: 'reapply',
      configuration: validated.configuration,
      customizationReport: detection,
      current: {
        projectKind: 'caseInsert',
        aggregate: normalized,
        sessionId,
        projectRevision: currentRevision,
        template: validated.configuration.template,
        snapshot: currentSnapshot.value,
      },
      selectedDefinition: parsedDefinition,
      customizedFieldPolicies: [],
    },
  }
}

function withRevision(
  definition: CaseInsertPresetDefinitionV1,
  revision: number,
  mutate?: (definition: MutableDefinition) => void,
) {
  const selected = cloneFixture(definition) as MutableDefinition
  selected.revision = revision
  mutate?.(selected)
  return selected
}

function assignmentRegion(
  definition: MutableDefinition,
  values: Partial<Readonly<{
    centerXPercent: number
    centerYPercent: number
    widthPercent: number
    heightPercent: number
  }>>,
) {
  const assignment = (definition.slots as Record<string, unknown>[])[0]!
    .assignments as Record<string, unknown>[]
  Object.assign(
    assignment[0]!.contentRegion as Record<string, unknown>,
    values,
  )
}

function successful(input: PlanCaseInsertPresetReapplyInput) {
  const result = planCaseInsertPresetReapply(input)
  assert.equal(result.ok, true)
  if (!result.ok) throw new Error(`${result.status}:${result.code}`)
  return result
}

function failed(
  input: PlanCaseInsertPresetReapplyInput,
  status: string,
) {
  const result = planCaseInsertPresetReapply(input)
  assert.equal(result.ok, false)
  if (result.ok) throw new Error('Expected Reapply planning to fail.')
  assert.equal(result.status, status)
  assert.equal('plan' in result, false)
  return result
}

function selectedProposedValue(
  fixture: Fixture,
  selectedDefinition: unknown,
  address: CaseInsertAppliedPresetOwnedFieldAddress,
) {
  const resolution = resolveCaseInsertPresetAssignmentsForDefinition({
    definition: selectedDefinition,
    requestedScope: fixture.configuration.requestedScope,
    snapshot: fixture.input.current.snapshot,
    expectedSnapshotIdentity: fixture.input.current.snapshot.identity,
  })
  assert.equal(resolution.ok, true)
  if (!resolution.ok) throw new Error(resolution.status)
  const proposal = createCaseInsertPresetResolvedLayoutProposal({
    resolution,
    expected: {
      projectKind: 'caseInsert',
      preset: resolution.value.preset,
      requestedScope: fixture.configuration.requestedScope,
      snapshotIdentity: fixture.input.current.snapshot.identity,
    },
  })
  assert.equal(proposal.ok, true)
  if (!proposal.ok) throw new Error(proposal.status)
  const action = proposal.fieldActions.find((candidate) => {
    const source = candidate.sources[0]
    return source?.region === address.region &&
      candidate.featureOwnerId === address.featureOwnerId &&
      candidate.object.bindingKind === address.bindingKind &&
      candidate.object.bindingId === address.bindingId &&
      candidate.object.runtimeId === address.runtimeObjectId &&
      candidate.fieldId === address.fieldId
  })
  assert.ok(action)
  return action.proposedValue
}

function policyFor(
  fixture: Fixture,
  selectedDefinition: CaseInsertPresetDefinitionV1 | unknown,
  address: CaseInsertAppliedPresetOwnedFieldAddress,
  policy: CaseInsertPresetCustomizedFieldPolicy,
): CaseInsertPresetCustomizedFieldPolicyRecord {
  const old = fixture.configuration.ownedFields.find((field) =>
    assertAddress(field.address, address))!
  const reportField = fixture.report.fields.find((field) =>
    assertAddress(field.address, address))!
  const parsed = createCaseInsertPresetCatalog({ builtins: [selectedDefinition] })
  assert.equal(parsed.ok, true)
  if (!parsed.ok) throw new Error(parsed.error.code)
  const selected = parsed.catalog.list()[0]!
  return deepFreeze({
    configurationIdentity: fixture.configuration.configurationIdentity,
    customizationReportIdentity: fixture.report.reportIdentity,
    address: { ...address },
    lastAppliedValue: old.lastAppliedValue,
    currentValue: reportField.currentValue,
    selectedPreset: { id: selected.id, revision: selected.revision },
    selectedProposedValue: selectedProposedValue(
      fixture,
      selectedDefinition,
      address,
    ),
    policy,
  })
}

function assertAddress(
  left: CaseInsertAppliedPresetOwnedFieldAddress,
  right: CaseInsertAppliedPresetOwnedFieldAddress,
) {
  return left.region === right.region &&
    left.featureOwnerId === right.featureOwnerId &&
    left.bindingKind === right.bindingKind &&
    left.bindingId === right.bindingId &&
    left.runtimeObjectId === right.runtimeObjectId &&
    left.fieldId === right.fieldId
}

test('clean same-revision Reapply is a deterministic configuration-bearing aggregate no-op', () => {
  const fixture = buildFixture()
  const before = structuredClone(fixture)
  const first = successful(fixture.input)
  const second = successful({
    ...fixture.input,
    customizedFieldPolicies: [],
  })

  assert.equal(first.status, 'aggregate-semantic-no-op')
  assert.equal(first.plan.aggregateWrites.length, 0)
  assert.equal(first.plan.semanticEffects.configurationEffect, true)
  assert.equal(first.plan.preset.previousRevision, fixture.definition.revision)
  assert.equal(first.plan.preset.selectedRevision, fixture.definition.revision)
  assert.equal(first.plan.reviewIdentity, second.plan.reviewIdentity)
  assert.equal(Object.isFrozen(first.plan), true)
  assert.equal(Object.isFrozen(first.plan.fieldEffects), true)
  assert.equal(
    first.plan.projectedConfiguration.authority,
    'non-authoritative-uninstalled-projection',
  )
  assert.equal('configurationIdentity' in first.plan.projectedConfiguration, false)
  assert.deepEqual(structuredClone(fixture), before)
})

test('clean selected revision plans exact x, y, and scale without rounding', () => {
  const fixture = buildFixture()
  const selected = withRevision(fixture.definition, 2, (definition) =>
    assignmentRegion(definition, {
      centerXPercent: 37.1234567890123,
      centerYPercent: 41.9876543210987,
      widthPercent: 63.3333333333333,
      heightPercent: 51.1111111111111,
    }))
  const result = successful({ ...fixture.input, selectedDefinition: selected })

  assert.equal(result.status, 'planned')
  assert.equal(result.plan.preset.selectedRevision, 2)
  assert.deepEqual(
    result.plan.aggregateWrites.map(({ address, proposedValue }) => [
      address.fieldId,
      proposedValue,
    ]),
    [
      ['layout-x', -24.00464491100678],
      ['layout-y', -14.936734943128585],
      ['layout-scale', 0.47641049819267633],
    ],
  )
})

test('customized overwrite is explicit, review-visible, and consent-gated even when numerically no-write', () => {
  const cleanFixture = buildFixture()
  const address = cleanFixture.configuration.ownedFields.find(({ address }) =>
    address.fieldId === 'layout-x')!.address
  const selected = withRevision(cleanFixture.definition, 2, (definition) => {
    assignmentRegion(definition, { centerXPercent: 53.5 })
  })
  const desiredCurrent = selectedProposedValue(
    cleanFixture,
    selected,
    address,
  )
  const fixture = buildFixture({
    mutateCurrent: (aggregate) => {
      aggregate.templates.cover.background.layout.x = desiredCurrent
    },
  })
  const policy = policyFor(
    fixture,
    selected,
    address,
    'overwrite-with-selected-preset',
  )
  const result = successful({
    ...fixture.input,
    selectedDefinition: selected,
    customizedFieldPolicies: [policy],
  })
  const effect = result.plan.fieldEffects.find(({ address: candidate }) =>
    assertAddress(candidate, address))!

  assert.equal(effect.disposition, 'retained-customized-overwrite')
  assert.equal(effect.policy, 'overwrite-with-selected-preset')
  assert.equal(effect.aggregateWriteRequired, false)
  assert.equal(effect.projectedLastAppliedValue, effect.selectedProposedValue)
  assert.equal(result.plan.materialConsentRequirements.some(({ kind }) =>
    kind === 'overwrite-customized-owned-field'), true)
})

test('customized preserve plans no write and retains current value, ownership, provenance, and prior baseline', () => {
  const fixture = buildFixture({
    mutateCurrent: (aggregate) => {
      aggregate.templates.cover.background.layout.x += 3
    },
  })
  const reportField = fixture.report.fields.find(({ fieldStatus }) =>
    fieldStatus === 'value-diverged')!
  const selected = withRevision(fixture.definition, 2, (definition) =>
    assignmentRegion(definition, { centerXPercent: 45 }))
  const policy = policyFor(
    fixture,
    selected,
    reportField.address,
    'preserve-current-customization',
  )
  const result = successful({
    ...fixture.input,
    selectedDefinition: selected,
    customizedFieldPolicies: [policy],
  })
  const effect = result.plan.preservedCustomizedFields[0]!
  const projected = result.plan.projectedConfiguration.ownedFields.find(
    ({ address }) => assertAddress(address, reportField.address),
  )!

  assert.equal(effect.aggregateWriteRequired, false)
  assert.equal(effect.currentValue, reportField.currentValue)
  assert.equal(effect.projectedLastAppliedValue, reportField.lastAppliedValue)
  assert.equal(effect.projectedCustomizationStatus, 'customized')
  assert.equal(effect.ownershipOutcome, 'retained')
  assert.deepEqual(effect.projectedSources, effect.previousSources)
  assert.equal(projected.lastAppliedValue, reportField.lastAppliedValue)
  assert.equal(projected.expectedCustomizationStatus, 'customized')
  assert.equal(result.plan.materialConsentRequirements.some(({ address }) =>
    address && assertAddress(address, reportField.address)), false)
})

test('mixed customized policies produce independent exact dispositions', () => {
  const fixture = buildFixture({
    mutateCurrent: (aggregate) => {
      aggregate.templates.cover.background.layout.x += 4
      aggregate.templates.cover.background.layout.y += 5
    },
  })
  const customized = fixture.report.fields.filter(({ fieldStatus }) =>
    fieldStatus === 'value-diverged')
  const selected = withRevision(fixture.definition, 2, (definition) =>
    assignmentRegion(definition, { centerXPercent: 48, centerYPercent: 47 }))
  const policies = customized.map((field, index) => policyFor(
    fixture,
    selected,
    field.address,
    index === 0
      ? 'overwrite-with-selected-preset'
      : 'preserve-current-customization',
  ))
  const result = successful({
    ...fixture.input,
    selectedDefinition: selected,
    customizedFieldPolicies: policies.reverse(),
  })

  assert.equal(result.plan.preservedCustomizedFields.length, 1)
  assert.equal(result.plan.fieldEffects.filter(({ disposition }) =>
    disposition === 'retained-customized-overwrite').length, 1)
  assert.equal(result.plan.materialConsentRequirements.filter(({ kind }) =>
    kind === 'overwrite-customized-owned-field').length, 1)
})

test('customized policies fail closed when missing, duplicate, foreign, clean, or unsupported', () => {
  const fixture = buildFixture({
    mutateCurrent: (aggregate) => {
      aggregate.templates.cover.background.layout.x += 4
    },
  })
  const customized = fixture.report.fields.find(({ fieldStatus }) =>
    fieldStatus === 'value-diverged')!
  const clean = fixture.report.fields.find(({ fieldStatus }) =>
    fieldStatus === 'unchanged')!
  const policy = policyFor(
    fixture,
    fixture.definition,
    customized.address,
    'preserve-current-customization',
  )
  failed(fixture.input, 'policy-incomplete')
  failed({
    ...fixture.input,
    customizedFieldPolicies: [policy, policy],
  }, 'policy-mismatch')
  failed({
    ...fixture.input,
    customizedFieldPolicies: [deepFreeze({
      ...policy,
      configurationIdentity: 'foreign-configuration',
    })],
  }, 'policy-mismatch')
  failed({
    ...fixture.input,
    customizedFieldPolicies: [deepFreeze({
      ...policy,
      customizationReportIdentity: 'foreign-report',
    })],
  }, 'policy-mismatch')
  failed({
    ...fixture.input,
    customizedFieldPolicies: [deepFreeze({
      ...policy,
      selectedProposedValue: policy.selectedProposedValue + 1,
    })],
  }, 'policy-mismatch')
  failed({
    ...fixture.input,
    customizedFieldPolicies: [deepFreeze({
      ...policy,
      address: {
        ...policy.address,
        runtimeObjectId: 'case:unknown-runtime-object',
      },
    })],
  }, 'policy-mismatch')
  failed({
    ...fixture.input,
    customizedFieldPolicies: [policyFor(
      fixture,
      fixture.definition,
      clean.address,
      'preserve-current-customization',
    )],
  }, 'policy-mismatch')
  failed({
    ...fixture.input,
    customizedFieldPolicies: [deepFreeze({
      ...policy,
      policy: 'implicit-default-is-prohibited',
    })],
  }, 'unsupported-policy')
})

test('new claims are explicit and changed claims require exact material consent', () => {
  const fixture = buildFixture()
  const selected = withRevision(fixture.definition, 2, (definition) => {
    const slots = definition.slots as Record<string, unknown>[]
    slots.push({
      id: 'case:preset-slot:cover-title-artwork',
      roleId: 'game-title',
      assignments: [{
        id: 'case:preset-assignment:cover-title-artwork',
        region: 'front-cover',
        coordinateBasis: 'frontSafe',
        ownerId: 'case.cover.title-artwork',
        object: { kind: 'fixed', id: 'case:cover:title-artwork' },
        targetPresence: 'required',
        contentRegion: {
          centerXPercent: 27,
          centerYPercent: 31,
          widthPercent: 42,
          heightPercent: 28,
        },
      }],
    })
  })
  const result = successful({ ...fixture.input, selectedDefinition: selected })

  assert.equal(result.plan.newlyClaimedFields.length, 3)
  assert.equal(result.plan.newlyClaimedFields.every(({ ownershipOutcome }) =>
    ownershipOutcome === 'claimed'), true)
  assert.equal(result.plan.materialConsentRequirements.some(({ kind }) =>
    kind === 'new-field-claim-with-value-change'), true)
  assert.equal(result.plan.projectedConfiguration.ownedFields.length,
    fixture.configuration.ownedFields.length + 3)
})

test('retirement preserves current values and movement remains retirement plus new claim', () => {
  const fixture = buildFixture({
    mutateCurrent: (aggregate) => {
      aggregate.templates.cover.background.layout.x += 2
    },
  })
  const selected = withRevision(fixture.definition, 2, (definition) => {
    const slot = (definition.slots as Record<string, unknown>[])[0]!
    slot.roleId = 'game-title'
    const assignment = (slot.assignments as Record<string, unknown>[])[0]!
    assignment.ownerId = 'case.cover.title-artwork'
    assignment.object = { kind: 'fixed', id: 'case:cover:title-artwork' }
    assignment.coordinateBasis = 'frontSafe'
  })
  const result = successful({ ...fixture.input, selectedDefinition: selected })

  assert.equal(result.plan.retiredFields.length, 3)
  assert.equal(result.plan.newlyClaimedFields.length, 3)
  assert.equal(result.plan.retiredFields.every((field) =>
    !result.plan.projectedConfiguration.ownedFields.some(({ address }) =>
      assertAddress(address, field.address))), true)
  assert.equal(result.plan.retiredFields.every(({ aggregateWriteRequired }) =>
    !aggregateWriteRequired), true)
  assert.equal(result.plan.retiredFields.some(({ projectedCustomizationStatus }) =>
    projectedCustomizationStatus === 'not-owned'), true)
  const policyForNowRetiredField = policyFor(
    fixture,
    fixture.definition,
    fixture.report.fields.find(({ fieldStatus }) =>
      fieldStatus === 'value-diverged')!.address,
    'preserve-current-customization',
  )
  failed({
    ...fixture.input,
    selectedDefinition: selected,
    customizedFieldPolicies: [policyForNowRetiredField],
  }, 'policy-mismatch')
})

test('repeated stable IDs ignore reorder, preserve disabled state, and fail ambiguous without fallback', () => {
  const raw = createMinimalCaseInsertPresetDefinition()
  const slot = (raw.slots as Record<string, unknown>[])[0]!
  slot.roleId = 'additional-artwork'
  const assignment = (slot.assignments as Record<string, unknown>[])[0]!
  assignment.ownerId = 'case.cover.artwork-slots'
  assignment.object = { kind: 'repeated', id: 'case:user-artwork:target' }
  assignment.coordinateBasis = 'frontSafe'
  const addSourceSlots = (aggregate: ProjectJewelCaseState) => {
    aggregate.templates.cover.artworkSlots.push(
      createDefaultCaseInsertImageSlot(
        'case:user-artwork:target',
        'Target',
        { enabled: false },
      ),
      createDefaultCaseInsertImageSlot(
        'case:user-artwork:other',
        'Other',
        { enabled: true },
      ),
    )
  }
  const ordered = buildFixture({ definition: raw, mutateSource: addSourceSlots })
  const reordered = buildFixture({
    definition: raw,
    mutateSource: addSourceSlots,
    mutateCurrent: (aggregate) => {
      aggregate.templates.cover.artworkSlots.reverse()
    },
  })
  const orderedPlan = successful(ordered.input).plan
  const reorderedPlan = successful(reordered.input).plan
  assert.deepEqual(orderedPlan.fieldEffects, reorderedPlan.fieldEffects)
  assert.notEqual(
    orderedPlan.preconditions.aggregateContentIdentity,
    reorderedPlan.preconditions.aggregateContentIdentity,
  )
  assert.notEqual(orderedPlan.reviewIdentity, reorderedPlan.reviewIdentity)
  assert.equal(reorderedPlan.fieldEffects.every(({ address, enablement }) =>
    address.runtimeObjectId === 'case:user-artwork:target' &&
    !enablement.objectEnabled && !enablement.effectiveEnabled), true)

  const duplicateAggregate = structuredClone(reordered.aggregate)
  duplicateAggregate.templates.cover.artworkSlots.push(
    createDefaultCaseInsertImageSlot(
      'case:user-artwork:target',
      'Duplicate target',
      { enabled: true },
    ),
  )
  const duplicateProject = createBlankJewelCaseSavedProject()
  duplicateProject.caseInsert = normalizeProjectJewelCaseState(duplicateAggregate)
  const duplicateSnapshot = createCaseInsertPresetAssignmentSnapshot({
    sessionId: reordered.input.current.sessionId as string,
    projectRevision: reordered.input.current.projectRevision as number,
    project: captureNormalizedProjectSnapshot(duplicateProject),
  })
  assert.equal(duplicateSnapshot.ok, true)
  if (!duplicateSnapshot.ok) throw new Error(duplicateSnapshot.error.code)
  failed({
    ...reordered.input,
    current: {
      ...reordered.input.current,
      aggregate: duplicateProject.caseInsert,
      snapshot: duplicateSnapshot.value,
    },
  }, 'target-ambiguous')

  const missingAggregate = structuredClone(reordered.aggregate)
  missingAggregate.templates.cover.artworkSlots =
    missingAggregate.templates.cover.artworkSlots.filter(({ id }) =>
      id !== 'case:user-artwork:target')
  const missingProject = createBlankJewelCaseSavedProject()
  missingProject.caseInsert = normalizeProjectJewelCaseState(missingAggregate)
  const missingSnapshot = createCaseInsertPresetAssignmentSnapshot({
    sessionId: reordered.input.current.sessionId as string,
    projectRevision: reordered.input.current.projectRevision as number,
    project: captureNormalizedProjectSnapshot(missingProject),
  })
  assert.equal(missingSnapshot.ok, true)
  if (!missingSnapshot.ok) throw new Error(missingSnapshot.error.code)
  failed({
    ...reordered.input,
    current: {
      ...reordered.input.current,
      aggregate: missingProject.caseInsert,
      snapshot: missingSnapshot.value,
    },
  }, 'target-missing')
})

test('invalid, mismatched, incompatible, stale, and forged authorities fail with typed results', () => {
  const fixture = buildFixture()
  failed({ ...fixture.input, operation: 'detach' }, 'unsupported-operation')

  const other = withRevision(fixture.definition, 2)
  other.id = 'builtin:case-preset:other-id'
  failed({ ...fixture.input, selectedDefinition: other }, 'preset-identity-mismatch')
  failed({ ...fixture.input, selectedDefinition: {} }, 'invalid-selected-definition')

  const incompatible = withRevision(fixture.definition, 2)
  incompatible.compatibility = {
    mode: 'specific-template',
    templateId: 'unsupported-case-template',
  }
  failed({ ...fixture.input, selectedDefinition: incompatible },
    'incompatible-selected-definition')

  failed({
    ...fixture.input,
    current: {
      ...fixture.input.current,
      projectRevision: fixture.input.current.projectRevision as number + 1,
    },
  }, 'stale-customization-report')
  failed({
    ...fixture.input,
    current: { ...fixture.input.current, sessionId: 'another-session' },
  }, 'attachment-context-mismatch')

  const unsupportedConfiguration = deepFreeze({
    ...structuredClone(fixture.configuration),
    formatVersion: 999,
  })
  failed({ ...fixture.input, configuration: unsupportedConfiguration },
    'unsupported-configuration-version')
  const unsupportedReport = deepFreeze({
    ...structuredClone(fixture.report),
    formatVersion: 999,
  })
  failed({ ...fixture.input, customizationReport: unsupportedReport },
    'unsupported-report-version')
  const foreignReport = buildFixture({ sessionId: 'foreign-report-session' })
  failed({
    ...fixture.input,
    customizationReport: foreignReport.report,
  }, 'report-mismatch')
})

test('report classification, footprint, identity, and current values are validated without rerunning detection', () => {
  const fixture = buildFixture()
  const invalidClassification = structuredClone(fixture.report)
  invalidClassification.status = 'customized'
  failed({
    ...fixture.input,
    customizationReport: deepFreeze(invalidClassification),
  }, 'invalid-customization-report')

  const missingField = structuredClone(fixture.report)
  missingField.fields.pop()
  failed({
    ...fixture.input,
    customizationReport: deepFreeze(missingField),
  }, 'report-mismatch')

  const changedAggregate = structuredClone(fixture.aggregate)
  changedAggregate.templates.cover.background.layout.x += 1
  failed({
    ...fixture.input,
    current: {
      ...fixture.input.current,
      aggregate: normalizeProjectJewelCaseState(changedAggregate),
    },
  }, 'attachment-context-mismatch')

  const reordered = structuredClone(fixture.report)
  reordered.fields.reverse()
  const reorderedResult = successful({
    ...fixture.input,
    customizationReport: deepFreeze(reordered),
  })
  assert.equal(reorderedResult.plan.fieldEffects.length,
    fixture.configuration.ownedFields.length)
})

test('required missing targets block, optional missing targets skip, and no partial plan is returned', () => {
  const fixture = buildFixture()
  const required = withRevision(fixture.definition, 2, (definition) => {
    const slots = definition.slots as Record<string, unknown>[]
    slots.push({
      id: 'case:preset-slot:missing-required',
      roleId: 'additional-artwork',
      assignments: [{
        id: 'case:preset-assignment:missing-required',
        region: 'front-cover',
        coordinateBasis: 'frontSafe',
        ownerId: 'case.cover.artwork-slots',
        object: { kind: 'repeated', id: 'case:missing-required' },
        targetPresence: 'required',
        contentRegion: {
          centerXPercent: 50,
          centerYPercent: 50,
          widthPercent: 30,
          heightPercent: 30,
        },
      }],
    })
  })
  failed({ ...fixture.input, selectedDefinition: required }, 'target-missing')

  const optional = cloneFixture(required)
  const slots = optional.slots as Record<string, unknown>[]
  const assignments = slots[slots.length - 1]!.assignments as
    Record<string, unknown>[]
  assignments[0]!.targetPresence = 'optional'
  const result = successful({ ...fixture.input, selectedDefinition: optional })
  assert.equal(result.plan.skips.length, 1)
  assert.equal(result.plan.skips[0]!.kind, 'missing-optional-target')
})

test('authoritative coalesced provenance and caller policy ordering remain deterministic', () => {
  const fixture = buildFixture({
    mutateCurrent: (aggregate) => {
      aggregate.templates.cover.background.layout.x += 4
      aggregate.templates.cover.background.layout.y += 5
    },
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
  const selected = withRevision(fixture.definition, 2)
  const policies = fixture.report.fields
    .filter(({ fieldStatus }) => fieldStatus === 'value-diverged')
    .map((field) => policyFor(
      fixture,
      selected,
      field.address,
      'preserve-current-customization',
    ))
  const first = successful({
    ...fixture.input,
    selectedDefinition: selected,
    customizedFieldPolicies: policies,
  })
  const second = successful({
    ...fixture.input,
    selectedDefinition: selected,
    customizedFieldPolicies: [...policies].reverse(),
  })

  assert.equal(first.plan.reviewIdentity, second.plan.reviewIdentity)
  assert.equal(first.plan.fieldEffects.every(({ previousSources }) =>
    previousSources.length === 2), true)
  assert.equal(first.plan.selectedFootprint.every(({ sources }) =>
    sources.length === 1), true)
  assert.equal(first.plan.preservedCustomizedFields.every(
    ({ provenanceDisposition }) => provenanceDisposition === 'unchanged',
  ), true)
  assert.equal(first.plan.fieldEffects.some(({ provenanceDisposition }) =>
    provenanceDisposition === 'changed'), true)
})

test('Back Panel, complete Tray, and independent spines retain concrete addressing under every declared scope', async (t) => {
  const raw = createCoordinatedCaseInsertPresetDefinition()
  const catalog = createCaseInsertPresetCatalog({ builtins: [raw] })
  assert.equal(catalog.ok, true)
  if (!catalog.ok) throw new Error(catalog.error.code)
  const definition = catalog.catalog.getExact(
    catalog.catalog.list()[0]!.id,
    catalog.catalog.list()[0]!.revision,
  )!
  const scopes = definition.applicationScopes
  for (const scope of scopes) {
    await t.test(JSON.stringify(scope), () => {
      const fixture = buildFixture({ definition, scope })
      const mirrored = structuredClone(fixture.aggregate)
      mirrored.spine.mirrored = !mirrored.spine.mirrored
      const mirroredFixture = buildFixture({
        definition,
        scope,
        mutateCurrent: (aggregate) => {
          aggregate.spine.mirrored = mirrored.spine.mirrored
        },
      })
      const first = successful(fixture.input)
      const second = successful(mirroredFixture.input)
      assert.deepEqual(
        first.plan.fieldEffects.map(({ address }) => [
          address.region,
          address.featureOwnerId,
          address.fieldId,
        ]),
        second.plan.fieldEffects.map(({ address }) => [
          address.region,
          address.featureOwnerId,
          address.fieldId,
        ]),
      )
      assert.equal(first.plan.fieldEffects.some(({ address }) =>
        address.region === 'back-panel' &&
        address.featureOwnerId === 'case.tray.background'), false)
      assert.equal(first.plan.fieldEffects.some(({ address }) =>
        address.region === 'tray-card' &&
        address.featureOwnerId === 'case.tray.text-blocks'), false)
      assert.equal(first.plan.fieldEffects.some(({ address }) =>
        address.region === 'left-spine' &&
        address.featureOwnerId.startsWith('case.spine.right.')), false)
      assert.equal(first.plan.fieldEffects.some(({ address }) =>
        address.region === 'right-spine' &&
        address.featureOwnerId.startsWith('case.spine.left.')), false)
    })
  }
})

test('text owners plan exact width while image/background owners plan exact scale', () => {
  const raw = createCoordinatedCaseInsertPresetDefinition()
  const fixture = buildFixture({
    definition: raw,
    scope: { kind: 'complete' },
  })
  const result = successful(fixture.input)
  const fields = new Set(result.plan.selectedFootprint.map(({ address }) =>
    address.fieldId))
  assert.equal(fields.has('layout-x'), true)
  assert.equal(fields.has('layout-y'), true)
  assert.equal(fields.has('layout-scale'), true)
  assert.equal(fields.has('layout-width'), true)
})

test('plan identity binds policy, selected revision, current preconditions, warnings, and consents', () => {
  const fixture = buildFixture({
    mutateCurrent: (aggregate) => {
      aggregate.templates.cover.background.layout.x += 5
    },
  })
  const customized = fixture.report.fields.find(({ fieldStatus }) =>
    fieldStatus === 'value-diverged')!
  const overwrite = policyFor(
    fixture,
    fixture.definition,
    customized.address,
    'overwrite-with-selected-preset',
  )
  const preserve = policyFor(
    fixture,
    fixture.definition,
    customized.address,
    'preserve-current-customization',
  )
  const overwritePlan = successful({
    ...fixture.input,
    customizedFieldPolicies: [overwrite],
  }).plan
  const preservePlan = successful({
    ...fixture.input,
    customizedFieldPolicies: [preserve],
  }).plan
  const selectedRevision = withRevision(fixture.definition, 2)
  const revisionPolicy = policyFor(
    fixture,
    selectedRevision,
    customized.address,
    'preserve-current-customization',
  )
  const revisionPlan = successful({
    ...fixture.input,
    selectedDefinition: selectedRevision,
    customizedFieldPolicies: [revisionPolicy],
  }).plan

  assert.notEqual(overwritePlan.reviewIdentity, preservePlan.reviewIdentity)
  assert.notEqual(preservePlan.reviewIdentity, revisionPlan.reviewIdentity)
  assert.notEqual(
    overwritePlan.materialConsentRequirements[0]?.id,
    preservePlan.materialConsentRequirements[0]?.id,
  )
})

test('the planner has no execution, detector rerun, first-Apply planner, catalog, persistence, or runtime dependency', () => {
  const source = readFileSync(
    new URL('./caseInsertPresetReapplyPlanning.ts', import.meta.url),
    'utf8',
  )
  assert.equal(source.includes('planCaseInsertPresetFirstApply'), false)
  assert.equal(source.includes('detectCaseInsertPresetCustomization'), false)
  assert.equal(source.includes('CASE_INSERT_PRESET_CATALOG'), false)
  assert.equal(source.includes('createCaseInsertPresetCatalog'), false)
  assert.equal(source.includes('JSON.stringify'), false)
  assert.equal(source.includes('React'), false)
  assert.equal(source.includes('tauri'), false)
  assert.equal(source.includes('filesystem'), false)
  assert.equal(source.includes('persist'), false)
  assert.equal(source.includes('applyCaseInsertPreset'), false)
  assert.equal(source.includes('detach'), false)
  assert.equal(CASE_INSERT_PRESET_CATALOG.list().length, 0)
})
