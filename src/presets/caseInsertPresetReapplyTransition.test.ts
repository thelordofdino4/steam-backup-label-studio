import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  createDefaultCaseInsertImageSlot,
} from '../caseInsert/defaults.ts'
import { normalizeProjectJewelCaseState } from '../caseInsert/normalization.ts'
import {
  createCaseInsertPresetAssignmentSnapshot,
} from '../caseInsert/presetAssignmentSnapshot.ts'
import { captureNormalizedProjectSnapshot } from '../lifecycle/canonicalProject.ts'
import { createBlankJewelCaseSavedProject } from '../project/caseInsertProjectAdapters.ts'
import { createProjectImageAssetProvenance } from '../project/projectAssetStatus.ts'
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
  type CaseInsertPresetReapplyPlan,
} from './caseInsertPresetReapplyPlanning.ts'
import {
  createCaseInsertPresetReapplyConsentAcceptance,
  createCaseInsertPresetReapplyReviewAcceptance,
  transitionCaseInsertPresetReapply,
  type TransitionCaseInsertPresetReapplyInput,
} from './caseInsertPresetReapplyTransition.ts'
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
  sessionId: string
  projectRevision: number
  scope: CaseInsertPresetApplicationScope
  snapshot: Extract<
    ReturnType<typeof createCaseInsertPresetAssignmentSnapshot>,
    { ok: true }
  >['value']
}>

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
  mutateSource?: (aggregate: ProjectJewelCaseState) => void
  mutateCurrent?: (aggregate: ProjectJewelCaseState) => void
}> = {}): Fixture {
  const parsed = createCaseInsertPresetCatalog({
    builtins: [options.definition ?? createMinimalCaseInsertPresetDefinition()],
  })
  assert.equal(parsed.ok, true)
  if (!parsed.ok) throw new Error(parsed.error.code)
  const listedDefinition = parsed.catalog.list()[0]!
  const definition = parsed.catalog.getExact(
    listedDefinition.id,
    listedDefinition.revision,
  )!
  const scope = options.scope ?? definition.applicationScopes[0]!
  const sessionId = 'reapply-transition-session'
  const sourceRevision = 30
  const source = createBlankJewelCaseSavedProject()
  options.mutateSource?.(source.caseInsert)
  source.caseInsert = normalizeProjectJewelCaseState(source.caseInsert)
  const sourceSnapshot = createCaseInsertPresetAssignmentSnapshot({
    sessionId,
    projectRevision: sourceRevision,
    project: captureNormalizedProjectSnapshot(source),
  })
  assert.equal(sourceSnapshot.ok, true)
  if (!sourceSnapshot.ok) throw new Error(sourceSnapshot.error.code)
  const resolution = resolveCaseInsertPresetAssignments({
    catalog: parsed.catalog,
    reference: { id: definition.id, revision: definition.revision },
    requestedScope: scope,
    snapshot: sourceSnapshot.value,
    expectedSnapshotIdentity: sourceSnapshot.value.identity,
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
      snapshotIdentity: sourceSnapshot.value.identity,
    },
  })
  assert.equal(applyPlan.ok, true)
  if (!applyPlan.ok) throw new Error(applyPlan.status)
  const applyConsents = applyPlan.plan.materialConsentRequirements.map(({ id }) =>
    createCaseInsertPresetMaterialConsentAcceptance(applyPlan.plan, id))
  const applied = applyCaseInsertPresetFirstTime({
    planningResult: applyPlan,
    source: {
      projectKind: 'caseInsert',
      aggregate: structuredClone(sourceSnapshot.value.caseInsert),
      snapshotIdentity: sourceSnapshot.value.identity,
      preset: { id: definition.id, revision: definition.revision },
      requestedScope: scope,
    },
    attachment: { status: 'unattached' },
    reviewApproval: createCaseInsertPresetApplyReviewApproval(applyPlan.plan),
    materialConsentAcceptances:
      applyConsents as CaseInsertPresetMaterialConsentAcceptance[],
  })
  assert.equal(applied.ok, true)
  if (!applied.ok) throw new Error(applied.code)
  const configuration = validateCaseInsertAppliedPresetConfigurationCandidate(
    applied,
  )
  assert.equal(configuration.ok, true)
  if (!configuration.ok) throw new Error(configuration.code)
  const aggregate = structuredClone(applied.aggregate)
  options.mutateCurrent?.(aggregate)
  const normalized = normalizeProjectJewelCaseState(aggregate)
  const projectRevision = 31
  const report = detectCaseInsertPresetCustomization({
    configuration: configuration.configuration,
    current: {
      projectKind: 'caseInsert',
      aggregate: normalized,
      sessionId,
      projectRevision,
      template: configuration.configuration.template,
    },
  })
  assert.equal(report.ok, true)
  if (!report.ok) throw new Error(report.code)
  const currentProject = createBlankJewelCaseSavedProject()
  currentProject.caseInsert = structuredClone(normalized)
  const snapshot = createCaseInsertPresetAssignmentSnapshot({
    sessionId,
    projectRevision,
    project: captureNormalizedProjectSnapshot(currentProject),
  })
  assert.equal(snapshot.ok, true)
  if (!snapshot.ok) throw new Error(snapshot.error.code)
  return {
    definition,
    configuration: configuration.configuration,
    report,
    aggregate: normalized,
    sessionId,
    projectRevision,
    scope,
    snapshot: snapshot.value,
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
  const slot = (definition.slots as Record<string, unknown>[])[0]!
  const assignment = slot.assignments as Record<string, unknown>[]
  Object.assign(
    assignment[0]!.contentRegion as Record<string, unknown>,
    values,
  )
}

function planFor(
  fixture: Fixture,
  selectedDefinition: unknown = fixture.definition,
  policies: readonly CaseInsertPresetCustomizedFieldPolicyRecord[] = [],
) {
  const result = planCaseInsertPresetReapply({
    operation: 'reapply',
    configuration: fixture.configuration,
    customizationReport: fixture.report,
    current: {
      projectKind: 'caseInsert',
      aggregate: fixture.aggregate,
      sessionId: fixture.sessionId,
      projectRevision: fixture.projectRevision,
      template: fixture.configuration.template,
      snapshot: fixture.snapshot,
    },
    selectedDefinition,
    customizedFieldPolicies: policies,
  })
  assert.equal(result.ok, true, JSON.stringify(result))
  if (!result.ok) throw new Error(`${result.status}:${result.code}`)
  return result.plan
}

function inputFor(
  fixture: Fixture,
  plan: CaseInsertPresetReapplyPlan,
  overrides: Partial<TransitionCaseInsertPresetReapplyInput> = {},
): TransitionCaseInsertPresetReapplyInput {
  const acceptances = plan.materialConsentRequirements.map(({ id }) =>
    createCaseInsertPresetReapplyConsentAcceptance(plan, id)!)
  return deepFreeze({
    operation: 'reapply',
    plan,
    sourceConfiguration: fixture.configuration,
    customizationReport: fixture.report,
    reviewAcceptance: createCaseInsertPresetReapplyReviewAcceptance(plan),
    materialConsentAcceptances: acceptances,
    current: {
      projectKind: 'caseInsert',
      aggregate: fixture.aggregate,
      sessionId: fixture.sessionId,
      projectRevision: fixture.projectRevision,
      template: fixture.configuration.template,
    },
    ...overrides,
  })
}

function successful(input: TransitionCaseInsertPresetReapplyInput) {
  const result = transitionCaseInsertPresetReapply(input)
  assert.equal(result.ok, true, JSON.stringify(result))
  if (!result.ok) throw new Error(`${result.status}:${result.code}`)
  return result
}

function failed(input: TransitionCaseInsertPresetReapplyInput, status: string) {
  const result = transitionCaseInsertPresetReapply(input)
  assert.equal(result.ok, false)
  if (result.ok) throw new Error('Expected Reapply transition failure.')
  assert.equal(result.status, status)
  assert.equal('aggregate' in result, false)
  assert.equal('nextConfiguration' in result, false)
  return result
}

function addressEqual(
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

function policyFor(
  fixture: Fixture,
  selected: CaseInsertPresetDefinitionV1,
  address: CaseInsertAppliedPresetOwnedFieldAddress,
  policy: CaseInsertPresetCustomizedFieldPolicy,
) {
  const old = fixture.configuration.ownedFields.find(({ address: candidate }) =>
    addressEqual(candidate, address))!
  const report = fixture.report.fields.find(({ address: candidate }) =>
    addressEqual(candidate, address))!
  const selectedPlan = planFor(buildFixture(), selected)
  const selectedField = selectedPlan.selectedFootprint.find(
    ({ address: candidate }) => addressEqual(candidate, address),
  )
  const selectedProposedValue = selectedField?.proposedValue ??
    old.lastAppliedValue
  return deepFreeze({
    configurationIdentity: fixture.configuration.configurationIdentity,
    customizationReportIdentity: fixture.report.reportIdentity,
    address: cloneFixture(address),
    lastAppliedValue: old.lastAppliedValue,
    currentValue: report.currentValue,
    selectedPreset: { id: selected.id, revision: selected.revision },
    selectedProposedValue,
    policy,
  })
}

test('clean same-revision Reapply returns a detached immutable configuration-only transition', () => {
  const fixture = buildFixture()
  const before = structuredClone(fixture)
  const plan = planFor(fixture)
  const result = successful(inputFor(fixture, plan))

  assert.equal(result.status, 'reapplied-aggregate-semantic-no-op')
  assert.deepEqual(result.aggregate, fixture.aggregate)
  assert.equal(result.nextConfiguration.formatVersion, 2)
  assert.equal(result.nextConfiguration.attachmentStatus, 'detached-uninstalled')
  assert.equal(result.nextConfiguration.domainStatus, 'validated-authoritative')
  assert.equal(result.nextConfiguration.reapply.transitionStatus, result.status)
  assert.equal(result.nextConfiguration.preset.revision, fixture.definition.revision)
  assert.equal(Object.isFrozen(result), true)
  assert.equal(Object.isFrozen(result.aggregate), true)
  assert.equal(Object.isFrozen(result.nextConfiguration.ownedFields), true)
  assert.deepEqual(structuredClone(fixture), before)
})

test('selected revision applies exact x, y, and scale writes and adopts selected baselines', () => {
  const fixture = buildFixture()
  const selected = withRevision(fixture.definition, 2, (definition) =>
    assignmentRegion(definition, {
      centerXPercent: 37.1234567890123,
      centerYPercent: 41.9876543210987,
      widthPercent: 63.3333333333333,
      heightPercent: 51.1111111111111,
    }))
  const plan = planFor(fixture, selected)
  const result = successful(inputFor(fixture, plan))

  assert.equal(result.status, 'reapplied')
  assert.equal(result.aggregate.templates.cover.background.layout.x,
    -24.00464491100678)
  assert.equal(result.aggregate.templates.cover.background.layout.y,
    -14.936734943128585)
  assert.equal(result.aggregate.templates.cover.background.layout.scale,
    0.47641049819267633)
  assert.equal(result.nextConfiguration.preset.revision, 2)
  for (const write of plan.aggregateWrites) {
    const owned = result.nextConfiguration.ownedFields.find(({ address }) =>
      addressEqual(address, write.address))!
    assert.equal(owned.lastAppliedValue, write.proposedValue)
  }
})

test('exact review acceptance is mandatory and stale, generic, or another-plan review fails closed', () => {
  const fixture = buildFixture()
  const plan = planFor(fixture)
  const input = inputFor(fixture, plan)
  failed(deepFreeze({ ...input, reviewAcceptance: undefined }) as never,
    'invalid-review-acceptance')
  failed(deepFreeze({ ...input, reviewAcceptance: true }) as never,
    'invalid-review-acceptance')
  failed(deepFreeze({
    ...input,
    reviewAcceptance: {
      ...structuredClone(input.reviewAcceptance),
      planReviewIdentity: 'case:preset-reapply-review:v1:stale',
    },
  }), 'review-mismatch')
  const other = planFor(
    fixture,
    withRevision(fixture.definition, 2),
  )
  failed(deepFreeze({
    ...input,
    reviewAcceptance: createCaseInsertPresetReapplyReviewAcceptance(other),
  }), 'review-mismatch')
})

test('customized overwrite requires one exact consent even when the selected value is already current', () => {
  const clean = buildFixture()
  const address = clean.configuration.ownedFields.find(({ address }) =>
    address.fieldId === 'layout-x')!.address
  const fixture = buildFixture({
    mutateCurrent: (aggregate) => {
      aggregate.templates.cover.background.layout.x += 7
    },
  })
  const selected = withRevision(fixture.definition, 2, (definition) => {
    const currentX = fixture.aggregate.templates.cover.background.layout.x
    assignmentRegion(definition, {
      centerXPercent: ((currentX + 50) / 100) * 80 + 10,
    })
  })
  const policy = policyFor(
    fixture,
    selected as CaseInsertPresetDefinitionV1,
    address,
    'overwrite-with-selected-preset',
  )
  const plan = planFor(fixture, selected, [policy])
  const requirement = plan.materialConsentRequirements.find(({ kind }) =>
    kind === 'overwrite-customized-owned-field')!
  assert.ok(requirement)
  const complete = inputFor(fixture, plan)
  failed(deepFreeze({
    ...complete,
    materialConsentAcceptances: [],
  }), 'missing-material-consent')
  failed(deepFreeze({
    ...complete,
    materialConsentAcceptances: [
      complete.materialConsentAcceptances[0],
      complete.materialConsentAcceptances[0],
    ],
  }), 'duplicate-material-consent')
  const wrong = structuredClone(complete.materialConsentAcceptances[0]!)
  wrong.requirement.currentValue = wrong.requirement.currentValue! + 1
  failed(deepFreeze({
    ...complete,
    materialConsentAcceptances: [wrong],
  }), 'material-consent-mismatch')
  const wrongAddress = structuredClone(
    complete.materialConsentAcceptances[0]!,
  )
  wrongAddress.requirement.address!.runtimeObjectId =
    'case:cover:another-background'
  failed(deepFreeze({
    ...complete,
    materialConsentAcceptances: [wrongAddress],
  }), 'material-consent-mismatch')
  const unexpected = structuredClone(
    complete.materialConsentAcceptances[0]!,
  )
  unexpected.requirementId = 'case:preset-reapply-consent:v1:unexpected'
  failed(deepFreeze({
    ...complete,
    materialConsentAcceptances: [
      ...complete.materialConsentAcceptances,
      unexpected,
    ],
  }), 'unexpected-material-consent')
  failed(deepFreeze({
    ...complete,
    materialConsentAcceptances: [true],
  }) as never, 'material-consent-mismatch')
  const result = successful(complete)
  assert.equal(result.nextConfiguration.acceptedMaterialConsentRequirementIds
    .includes(requirement.id), true)
})

test('preserve performs no write and retains ownership, old baseline, provenance, and customized detection', () => {
  const fixture = buildFixture({
    mutateCurrent: (aggregate) => {
      aggregate.templates.cover.background.layout.x += 4
    },
  })
  const field = fixture.report.fields.find(({ fieldStatus }) =>
    fieldStatus === 'value-diverged')!
  const policy = policyFor(
    fixture,
    fixture.definition,
    field.address,
    'preserve-current-customization',
  )
  const plan = planFor(fixture, fixture.definition, [policy])
  const effect = plan.preservedCustomizedFields[0]!
  const result = successful(inputFor(fixture, plan))
  const next = result.nextConfiguration.ownedFields.find(({ address }) =>
    addressEqual(address, effect.address))!

  assert.equal(plan.aggregateWrites.some(({ address }) =>
    addressEqual(address, effect.address)), false)
  assert.equal(result.aggregate.templates.cover.background.layout.x,
    effect.currentValue)
  assert.equal(next.lastAppliedValue, effect.previousLastAppliedValue)
  assert.deepEqual(next.sources, effect.previousSources)
  const detection = detectCaseInsertPresetCustomization({
    configuration: result.nextConfiguration,
    current: {
      projectKind: 'caseInsert',
      aggregate: result.aggregate as ProjectJewelCaseState,
      sessionId: fixture.sessionId,
      projectRevision: fixture.projectRevision + 1,
      template: result.nextConfiguration.template,
    },
  })
  assert.equal(detection.ok, true)
  if (detection.ok) assert.equal(detection.status, 'customized')
})

test('new claims and retirement are configuration effects; movement is retirement plus claim without value transfer', () => {
  const fixture = buildFixture()
  const selected = withRevision(fixture.definition, 2, (definition) => {
    const slot = (definition.slots as Record<string, unknown>[])[0]!
    slot.roleId = 'game-title'
    const assignment = (slot.assignments as Record<string, unknown>[])[0]!
    assignment.ownerId = 'case.cover.title-artwork'
    assignment.object = { kind: 'fixed', id: 'case:cover:title-artwork' }
  })
  const plan = planFor(fixture, selected)
  const result = successful(inputFor(fixture, plan))

  assert.equal(plan.retiredFields.length, 3)
  assert.equal(plan.newlyClaimedFields.length, 3)
  assert.equal(plan.retiredFields.every(({ aggregateWriteRequired }) =>
    !aggregateWriteRequired), true)
  assert.equal(plan.retiredFields.every((retired) =>
    !result.nextConfiguration.ownedFields.some(({ address }) =>
      addressEqual(address, retired.address))), true)
  assert.equal(plan.newlyClaimedFields.every((claimed) =>
    result.nextConfiguration.ownedFields.some(({ address, lastAppliedValue }) =>
      addressEqual(address, claimed.address) &&
      lastAppliedValue === claimed.selectedProposedValue)), true)
  assert.deepEqual(
    result.aggregate.templates.cover.background,
    fixture.aggregate.templates.cover.background,
  )
})

test('fixed text width, Back Panel versus Tray, independent spines, and disabled repeated targets execute exactly', () => {
  const coordinated = buildFixture({
    definition: createCoordinatedCaseInsertPresetDefinition(),
    scope: { kind: 'complete' },
  })
  const selected = withRevision(coordinated.definition, 4, (definition) => {
    for (const slot of definition.slots as Record<string, unknown>[]) {
      const assignment = (slot.assignments as Record<string, unknown>[])[0]!
      const region = assignment.contentRegion as Record<string, number>
      region.centerXPercent += 1
      region.centerYPercent += 2
      region.widthPercent -= 3
    }
  })
  const plan = planFor(coordinated, selected)
  const result = successful(inputFor(coordinated, plan))
  assert.equal(plan.aggregateWrites.some(({ address }) =>
    address.region === 'back-panel' &&
    address.featureOwnerId === 'case.tray.text-blocks' &&
    address.fieldId === 'layout-width'), true)
  assert.equal(result.aggregate.templates.tray.textBlocks.find(({ id }) =>
    id === 'tray-description')!.enabled, false)
  assert.equal(plan.aggregateWrites.some(({ address }) =>
    address.region === 'tray-card' &&
    address.featureOwnerId === 'case.tray.background'), true)
  assert.equal(plan.aggregateWrites.some(({ address }) =>
    address.region === 'left-spine' &&
    address.featureOwnerId.startsWith('case.spine.right.')), false)
  assert.equal(plan.aggregateWrites.some(({ address }) =>
    address.region === 'right-spine' &&
    address.featureOwnerId.startsWith('case.spine.left.')), false)
  assert.equal(result.status, 'reapplied')

  const raw = createMinimalCaseInsertPresetDefinition()
  const slot = (raw.slots as Record<string, unknown>[])[0]!
  slot.roleId = 'additional-artwork'
  const assignment = (slot.assignments as Record<string, unknown>[])[0]!
  assignment.ownerId = 'case.cover.artwork-slots'
  assignment.object = { kind: 'repeated', id: 'case:user-artwork:target' }
  const addSlots = (aggregate: ProjectJewelCaseState) => {
    const target = createDefaultCaseInsertImageSlot(
      'case:user-artwork:target',
      'Target',
      { enabled: false },
    )
    target.imageDataUrl = 'data:image/png;base64,target'
    target.imageSize = { width: 640, height: 360 }
    target.imageSource = createProjectImageAssetProvenance({
      source: 'uploaded',
      sourceLabel: 'target.png',
    })
    aggregate.templates.cover.artworkSlots.push(
      target,
      createDefaultCaseInsertImageSlot(
        'case:user-artwork:other',
        'Target',
        { enabled: true },
      ),
    )
  }
  const repeated = buildFixture({ definition: raw, mutateSource: addSlots })
  const repeatedPlan = planFor(repeated)
  const repeatedInput = inputFor(repeated, repeatedPlan)
  const repeatedResult = successful(repeatedInput)
  const target = repeatedResult.aggregate.templates.cover.artworkSlots.find(
    ({ id }) => id === 'case:user-artwork:target')!
  assert.equal(target.enabled, false)
  assert.equal(target.layout.x,
    repeated.aggregate.templates.cover.artworkSlots.find(({ id }) =>
      id === target.id)!.layout.x)
  const reorderedAggregate = structuredClone(repeatedInput.current.aggregate)
  reorderedAggregate.templates.cover.artworkSlots.reverse()
  const reorderedResult = successful(deepFreeze({
    ...repeatedInput,
    current: {
      ...structuredClone(repeatedInput.current),
      aggregate: normalizeProjectJewelCaseState(reorderedAggregate),
    },
  }))
  assert.equal(
    reorderedResult.nextConfiguration.configurationIdentity,
    repeatedResult.nextConfiguration.configurationIdentity,
  )
  assert.equal(reorderedResult.aggregate.templates.cover.artworkSlots.find(
    ({ id }) => id === 'case:user-artwork:target')!.layout.x, target.layout.x)
})

test('strict CAS rejects session, revision, template, retained value, and target changes before any output', () => {
  const fixture = buildFixture()
  const plan = planFor(fixture)
  const base = inputFor(fixture, plan)
  failed(deepFreeze({
    ...base,
    current: { ...structuredClone(base.current), sessionId: 'new-session' },
  }), 'stale-reapply-plan')
  failed(deepFreeze({
    ...base,
    current: {
      ...structuredClone(base.current),
      projectRevision: fixture.projectRevision + 1,
    },
  }), 'stale-reapply-plan')
  failed(deepFreeze({
    ...base,
    current: {
      ...structuredClone(base.current),
      template: { id: 'dvdCase', revision: null },
    },
  }), 'stale-reapply-plan')
  const changed = structuredClone(base.current.aggregate)
  changed.templates.cover.background.layout.x += Number.EPSILON
  failed(deepFreeze({
    ...base,
    current: { ...structuredClone(base.current), aggregate: changed },
  }), 'stale-reapply-plan')
  const missing = structuredClone(base.current.aggregate)
  missing.templates.cover.background.id = 'case:cover:missing-background'
  failed(deepFreeze({
    ...base,
    current: { ...structuredClone(base.current), aggregate: missing },
  }), 'target-missing')
})

test('duplicate stable targets fail ambiguous and caller consent order is deterministic', () => {
  const fixture = buildFixture({
    mutateCurrent: (aggregate) => {
      aggregate.templates.cover.background.layout.x += 4
      aggregate.templates.cover.background.layout.y += 5
    },
  })
  const selected = withRevision(fixture.definition, 2, (definition) =>
    assignmentRegion(definition, { centerXPercent: 42, centerYPercent: 44 }))
  const policies = fixture.report.fields
    .filter(({ fieldStatus }) => fieldStatus === 'value-diverged')
    .map((field) => policyFor(
      fixture,
      selected as CaseInsertPresetDefinitionV1,
      field.address,
      'overwrite-with-selected-preset',
    ))
  const plan = planFor(fixture, selected, policies)
  const input = inputFor(fixture, plan)
  const forward = successful(input)
  const reverse = successful(deepFreeze({
    ...input,
    materialConsentAcceptances:
      [...input.materialConsentAcceptances].reverse(),
  }))
  assert.equal(forward.transitionIdentity, reverse.transitionIdentity)
  assert.equal(
    forward.nextConfiguration.configurationIdentity,
    reverse.nextConfiguration.configurationIdentity,
  )

  const raw = createMinimalCaseInsertPresetDefinition()
  const slot = (raw.slots as Record<string, unknown>[])[0]!
  slot.roleId = 'additional-artwork'
  const assignment = (slot.assignments as Record<string, unknown>[])[0]!
  assignment.ownerId = 'case.cover.artwork-slots'
  assignment.object = { kind: 'repeated', id: 'case:user-artwork:duplicate' }
  const duplicated = buildFixture({
    definition: raw,
    mutateSource: (aggregate) => {
      aggregate.templates.cover.artworkSlots.push(
        createDefaultCaseInsertImageSlot(
          'case:user-artwork:duplicate',
          'One',
        ),
      )
    },
  })
  const duplicatedPlan = planFor(duplicated)
  const ambiguous = structuredClone(duplicated.aggregate)
  ambiguous.templates.cover.artworkSlots.push(
    createDefaultCaseInsertImageSlot(
      'case:user-artwork:duplicate',
      'Two',
    ),
  )
  const duplicatedInput = inputFor(duplicated, duplicatedPlan)
  failed(deepFreeze({
    ...duplicatedInput,
    current: {
      ...structuredClone(duplicatedInput.current),
      aggregate: normalizeProjectJewelCaseState(ambiguous),
    },
  }), 'target-ambiguous')
})

test('unsupported and forged plan/configuration/report authorities fail without a partial pair', () => {
  const fixture = buildFixture()
  const plan = planFor(fixture)
  const input = inputFor(fixture, plan)
  const unsupportedPlan = structuredClone(plan) as Record<string, unknown>
  unsupportedPlan.formatVersion = 2
  failed(deepFreeze({ ...input, plan: unsupportedPlan }) as never,
    'unsupported-plan-version')
  const forgedPlan = structuredClone(plan)
  forgedPlan.semanticEffects.aggregateWriteCount += 1
  failed(deepFreeze({ ...input, plan: forgedPlan }), 'plan-identity-mismatch')
  const hidden = structuredClone(plan) as Record<string, unknown>
  hidden.hiddenActions = []
  failed(deepFreeze({ ...input, plan: hidden }) as never, 'invalid-plan')
  const blocked = structuredClone(plan)
  ;(blocked.blockers as unknown[]).push({ kind: 'forged-blocker' })
  failed(deepFreeze({ ...input, plan: blocked }) as never, 'invalid-plan')
  const badConfiguration = structuredClone(fixture.configuration) as
    Record<string, unknown>
  badConfiguration.formatVersion = 99
  failed(deepFreeze({
    ...input,
    sourceConfiguration: badConfiguration,
  }) as never, 'unsupported-configuration-version')
  const badReport = structuredClone(fixture.report) as Record<string, unknown>
  badReport.formatVersion = 99
  failed(deepFreeze({
    ...input,
    customizationReport: badReport,
  }) as never, 'unsupported-report-version')
})

test('plan array order and consent caller order do not affect transition identity or output', () => {
  const fixture = buildFixture()
  const selected = withRevision(fixture.definition, 2, (definition) =>
    assignmentRegion(definition, {
      centerXPercent: 42,
      centerYPercent: 47,
      widthPercent: 72,
    }))
  const plan = planFor(fixture, selected)
  const canonicalResult = successful(inputFor(fixture, plan))
  const reordered = structuredClone(plan)
  reordered.selectedFootprint.reverse()
  reordered.fieldEffects.reverse()
  reordered.aggregateWrites.reverse()
  reordered.preservedCustomizedFields.reverse()
  reordered.newlyClaimedFields.reverse()
  reordered.retiredFields.reverse()
  reordered.projectedConfiguration.ownedFields.reverse()
  reordered.materialConsentRequirements.reverse()
  reordered.preconditions.fields.reverse()
  reordered.warnings.reverse()
  reordered.preservationDecisions.reverse()
  reordered.skips.reverse()
  const reorderedPlan = deepFreeze(reordered)
  const reorderedResult = successful(inputFor(fixture, reorderedPlan))

  assert.equal(reorderedResult.transitionIdentity,
    canonicalResult.transitionIdentity)
  assert.equal(reorderedResult.nextConfiguration.configurationIdentity,
    canonicalResult.nextConfiguration.configurationIdentity)
  assert.deepEqual(reorderedResult.aggregate, canonicalResult.aggregate)
  assert.deepEqual(
    reorderedResult.nextConfiguration.ownedFields,
    canonicalResult.nextConfiguration.ownedFields,
  )
})

test('v2 configuration remains authoritative for later detection, planning, and another detached Reapply', () => {
  const fixture = buildFixture()
  const selected = withRevision(fixture.definition, 2, (definition) =>
    assignmentRegion(definition, { centerXPercent: 43 }))
  const firstPlan = planFor(fixture, selected)
  const first = successful(inputFor(fixture, firstPlan))
  const projectRevision = fixture.projectRevision + 1
  const report = detectCaseInsertPresetCustomization({
    configuration: first.nextConfiguration,
    current: {
      projectKind: 'caseInsert',
      aggregate: first.aggregate as ProjectJewelCaseState,
      sessionId: fixture.sessionId,
      projectRevision,
      template: first.nextConfiguration.template,
    },
  })
  assert.equal(report.ok, true)
  if (!report.ok) throw new Error(report.code)
  assert.equal(report.status, 'clean')
  const project = createBlankJewelCaseSavedProject()
  project.caseInsert = structuredClone(first.aggregate)
  const snapshot = createCaseInsertPresetAssignmentSnapshot({
    sessionId: fixture.sessionId,
    projectRevision,
    project: captureNormalizedProjectSnapshot(project),
  })
  assert.equal(snapshot.ok, true)
  if (!snapshot.ok) throw new Error(snapshot.error.code)
  const chainedFixture: Fixture = {
    ...fixture,
    configuration: first.nextConfiguration,
    report,
    aggregate: first.aggregate as ProjectJewelCaseState,
    projectRevision,
    snapshot: snapshot.value,
  }
  const secondPlan = planFor(chainedFixture, selected)
  const second = successful(inputFor(chainedFixture, secondPlan))

  assert.equal(second.status, 'reapplied-aggregate-semantic-no-op')
  assert.equal(second.nextConfiguration.reapply.sourceConfigurationIdentity,
    first.nextConfiguration.configurationIdentity)
  assert.equal(second.nextConfiguration.reapply.previousPresetRevision, 2)
  assert.notEqual(second.nextConfiguration.configurationIdentity,
    first.nextConfiguration.configurationIdentity)
})

test('preserve, overwrite, new-claim, and retired field changes all invalidate the CAS', () => {
  const customized = buildFixture({
    mutateCurrent: (aggregate) => {
      aggregate.templates.cover.background.layout.x += 5
    },
  })
  const customField = customized.report.fields.find(({ fieldStatus }) =>
    fieldStatus === 'value-diverged')!
  for (const policyName of [
    'preserve-current-customization',
    'overwrite-with-selected-preset',
  ] as const) {
    const policy = policyFor(
      customized,
      customized.definition,
      customField.address,
      policyName,
    )
    const plan = planFor(customized, customized.definition, [policy])
    const input = inputFor(customized, plan)
    const changed = structuredClone(input.current.aggregate)
    changed.templates.cover.background.layout.x += 1
    failed(deepFreeze({
      ...input,
      current: { ...structuredClone(input.current), aggregate: changed },
    }), 'stale-reapply-plan')
  }

  const clean = buildFixture()
  const moved = withRevision(clean.definition, 2, (definition) => {
    const slot = (definition.slots as Record<string, unknown>[])[0]!
    slot.roleId = 'game-title'
    const assignment = (slot.assignments as Record<string, unknown>[])[0]!
    assignment.ownerId = 'case.cover.title-artwork'
    assignment.object = { kind: 'fixed', id: 'case:cover:title-artwork' }
  })
  const plan = planFor(clean, moved)
  const input = inputFor(clean, plan)
  const changedRetired = structuredClone(input.current.aggregate)
  changedRetired.templates.cover.background.layout.y += 1
  failed(deepFreeze({
    ...input,
    current: {
      ...structuredClone(input.current),
      aggregate: changedRetired,
    },
  }), 'stale-reapply-plan')
  const changedClaim = structuredClone(input.current.aggregate)
  changedClaim.templates.cover.titleArtwork.layout.y += 1
  failed(deepFreeze({
    ...input,
    current: {
      ...structuredClone(input.current),
      aggregate: changedClaim,
    },
  }), 'stale-reapply-plan')
})

test('transition has no planner, detector, resolver, compatibility, catalog, renderer, persistence, UI, or runtime execution dependency', () => {
  const source = readFileSync(
    new URL('./caseInsertPresetReapplyTransition.ts', import.meta.url),
    'utf8',
  )
  assert.equal(source.includes('planCaseInsertPreset'), false)
  assert.equal(source.includes('detectCaseInsertPresetCustomization'), false)
  assert.equal(source.includes('resolveCaseInsertPresetAssignments'), false)
  assert.equal(source.includes('isCaseInsertPresetCompatible'), false)
  assert.equal(source.includes('CASE_INSERT_PRESET_CATALOG'), false)
  assert.equal(source.includes('createCaseInsertPresetCatalog'), false)
  assert.equal(source.includes('renderer'), false)
  assert.equal(source.includes('geometry'), false)
  assert.equal(source.includes('React'), false)
  assert.equal(source.includes('document.'), false)
  assert.equal(source.includes('tauri'), false)
  assert.equal(source.includes('filesystem'), false)
  assert.equal(source.includes('persist'), false)
  assert.equal(source.includes('detachCaseInsertPreset'), false)
  assert.equal(CASE_INSERT_PRESET_CATALOG.list().length, 0)
})

test('source files contain no project schema, installation, lifecycle, menu, or store integration', () => {
  const sources = [
    './caseInsertPresetReapplyTransition.ts',
    './caseInsertPresetAggregateFieldTransition.ts',
    './caseInsertPresetReapplyIdentity.ts',
  ].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n')
  for (const forbidden of [
    'ProjectFileV', 'installConfiguration', 'saveProject', 'loadProject',
    'projectSession', 'commandRegistry', 'application-menu', 'invoke(',
    'writeTextFile', 'writeFile', 'window.__TAURI__',
  ]) assert.equal(sources.includes(forbidden), false, forbidden)
})
