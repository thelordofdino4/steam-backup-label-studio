import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { createDefaultCaseInsertImageSlot } from '../caseInsert/defaults.ts'
import { normalizeProjectJewelCaseState } from '../caseInsert/normalization.ts'
import {
  createCaseInsertPresetAssignmentSnapshot,
} from '../caseInsert/presetAssignmentSnapshot.ts'
import { captureNormalizedProjectSnapshot } from '../lifecycle/canonicalProject.ts'
import { createBlankJewelCaseSavedProject } from '../project/caseInsertProjectAdapters.ts'
import type {
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertTextBlock,
  ProjectJewelCaseState,
} from '../project/projectTypes.ts'
import {
  planCaseInsertPresetFirstApply,
  type CaseInsertPresetApplyPlanningResult,
  type CaseInsertPresetPlanFieldAction,
} from './caseInsertPresetApplyPlanning.ts'
import {
  resolveCaseInsertPresetAssignments,
  type CaseInsertPresetAssignmentResolutionResult,
} from './caseInsertPresetAssignmentResolution.ts'
import {
  CASE_INSERT_PRESET_CATALOG,
  createCaseInsertPresetCatalog,
} from './caseInsertPresetCatalog.ts'
import {
  CASE_INSERT_PRESET_DEFINITION_KIND,
  CASE_INSERT_PRESET_FORMAT_VERSION,
  type CaseInsertPresetApplicationScope,
  type CaseInsertPresetConcreteRegionId,
  type CaseInsertPresetCoordinateBasis,
  type CaseInsertPresetOwnerId,
  type CaseInsertPresetRoleId,
} from './caseInsertPresetDefinition.ts'
import {
  applyCaseInsertPresetFirstTime,
  createCaseInsertPresetApplyReviewApproval,
  createCaseInsertPresetMaterialConsentAcceptance,
  type ApplyCaseInsertPresetFirstTimeInput,
  type CaseInsertPresetApplyTransitionResult,
  type CaseInsertPresetMaterialConsentAcceptance,
  type ImmutableProjectJewelCaseState,
} from './caseInsertPresetApplyTransition.ts'

type AssignmentSpec = Readonly<{
  suffix: string
  roleId: CaseInsertPresetRoleId
  region: CaseInsertPresetConcreteRegionId
  coordinateBasis: CaseInsertPresetCoordinateBasis
  ownerId: CaseInsertPresetOwnerId
  object: Readonly<{ kind: 'fixed' | 'repeated'; id: string }>
  targetPresence?: 'required' | 'optional'
  contentRegion?: Readonly<{
    centerXPercent: number
    centerYPercent: number
    widthPercent: number
    heightPercent: number
  }>
}>

const FRONT_TEXT: AssignmentSpec = {
  suffix: 'front-title-text',
  roleId: 'game-title',
  region: 'front-cover',
  coordinateBasis: 'frontSafe',
  ownerId: 'case.cover.text-blocks',
  object: { kind: 'fixed', id: 'case:cover:text:title' },
}

const TRAY_BACKGROUND: AssignmentSpec = {
  suffix: 'tray-background',
  roleId: 'background-artwork',
  region: 'tray-card',
  coordinateBasis: 'back',
  ownerId: 'case.tray.background',
  object: { kind: 'fixed', id: 'case:tray:background' },
}

const BACK_DESCRIPTION: AssignmentSpec = {
  suffix: 'back-description',
  roleId: 'game-description-text',
  region: 'back-panel',
  coordinateBasis: 'backPanelSafe',
  ownerId: 'case.tray.text-blocks',
  object: { kind: 'fixed', id: 'case:tray:text:description' },
}

const LEFT_SPINE_TITLE: AssignmentSpec = {
  suffix: 'left-spine-title',
  roleId: 'vertical-game-logo-title',
  region: 'left-spine',
  coordinateBasis: 'leftSpineSafe',
  ownerId: 'case.spine.left.title-text',
  object: { kind: 'fixed', id: 'case:spine:left:text:title' },
}

const RIGHT_SPINE_TITLE: AssignmentSpec = {
  suffix: 'right-spine-title',
  roleId: 'vertical-game-logo-title',
  region: 'right-spine',
  coordinateBasis: 'rightSpineSafe',
  ownerId: 'case.spine.right.title-text',
  object: { kind: 'fixed', id: 'case:spine:right:text:title' },
}

const ALL_REGIONS = [
  FRONT_TEXT,
  TRAY_BACKGROUND,
  BACK_DESCRIPTION,
  LEFT_SPINE_TITLE,
  RIGHT_SPINE_TITLE,
] as const

type Fixture = Readonly<{
  aggregate: ProjectJewelCaseState
  planningResult: CaseInsertPresetApplyPlanningResult
  plan: Extract<CaseInsertPresetApplyPlanningResult, { ok: true }>['plan']
  scope: CaseInsertPresetApplicationScope
}>

type ResolvedResult = Extract<
  CaseInsertPresetAssignmentResolutionResult,
  { ok: true }
>

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) deepFreeze(child)
    Object.freeze(value)
  }
  return value
}

function defaultRegion() {
  return {
    centerXPercent: 31.234567890123,
    centerYPercent: 42.345678901234,
    widthPercent: 53.456789012345,
    heightPercent: 40,
  }
}

function scopesFor(regions: readonly CaseInsertPresetConcreteRegionId[]) {
  const scopes: CaseInsertPresetApplicationScope[] = regions.map((region) => ({
    kind: 'region',
    region,
  }))
  if (regions.includes('front-cover')) {
    scopes.push({ kind: 'section', section: 'front' })
  }
  if (regions.includes('tray-card') || regions.includes('back-panel')) {
    scopes.push({ kind: 'section', section: 'back' })
  }
  if (regions.includes('left-spine') || regions.includes('right-spine')) {
    scopes.push({ kind: 'section', section: 'spine' })
  }
  if (regions.length > 1) scopes.push({ kind: 'complete' })
  return scopes
}

function createDefinition(specs: readonly AssignmentSpec[]) {
  const regions = [...new Set(specs.map(({ region }) => region))]
  return {
    kind: CASE_INSERT_PRESET_DEFINITION_KIND,
    formatVersion: CASE_INSERT_PRESET_FORMAT_VERSION,
    id: 'builtin:case-preset:transition-fixture',
    revision: 7,
    name: 'Transition fixture',
    surface: 'case-insert' as const,
    compatibility: {
      mode: 'specific-template' as const,
      templateId: 'jewelCase',
    },
    applicationScopes: scopesFor(regions),
    slots: specs.map((spec) => ({
      id: `case:preset-slot:${spec.suffix}`,
      roleId: spec.roleId,
      assignments: [{
        id: `case:preset-assignment:${spec.suffix}`,
        region: spec.region,
        coordinateBasis: spec.coordinateBasis,
        ownerId: spec.ownerId,
        object: { ...spec.object },
        targetPresence: spec.targetPresence ?? 'required',
        contentRegion: spec.contentRegion ?? defaultRegion(),
      }],
    })),
  }
}

function createFixture(
  specs: readonly AssignmentSpec[],
  scope: CaseInsertPresetApplicationScope,
  mutate?: (aggregate: ProjectJewelCaseState) => void,
  transformResolution?: (resolution: ResolvedResult) => ResolvedResult,
): Fixture {
  const project = createBlankJewelCaseSavedProject()
  mutate?.(project.caseInsert)
  project.caseInsert = normalizeProjectJewelCaseState(project.caseInsert)
  const projectSnapshot = captureNormalizedProjectSnapshot(project)
  const snapshotResult = createCaseInsertPresetAssignmentSnapshot({
    sessionId: 'transition-session',
    projectRevision: 23,
    project: projectSnapshot,
  })
  assert.equal(snapshotResult.ok, true)
  if (!snapshotResult.ok) throw new Error(snapshotResult.error.code)

  const definition = createDefinition(specs)
  const catalogResult = createCaseInsertPresetCatalog({
    builtins: [definition],
  })
  assert.equal(catalogResult.ok, true)
  if (!catalogResult.ok) throw new Error(catalogResult.error.code)
  const resolution = resolveCaseInsertPresetAssignments({
    catalog: catalogResult.catalog,
    reference: { id: definition.id, revision: definition.revision },
    requestedScope: scope,
    snapshot: snapshotResult.value,
    expectedSnapshotIdentity: snapshotResult.value.identity,
  })
  assert.equal(resolution.ok, true)
  if (!resolution.ok) throw new Error(resolution.status)
  const executableResolution = transformResolution
    ? transformResolution(resolution)
    : resolution
  const planningResult = planCaseInsertPresetFirstApply({
    operation: 'apply',
    resolution: executableResolution,
    expected: {
      projectKind: 'caseInsert',
      preset: {
        id: executableResolution.value.preset.id,
        revision: executableResolution.value.preset.revision,
      },
      requestedScope: executableResolution.value.requestedScope,
      snapshotIdentity: executableResolution.value.snapshotIdentity,
    },
  })
  assert.equal(planningResult.ok, true)
  if (!planningResult.ok) throw new Error(planningResult.status)
  return {
    aggregate: clone(snapshotResult.value.caseInsert),
    planningResult,
    plan: planningResult.plan,
    scope,
  }
}

function approvedInput(
  fixture: Fixture,
  overrides: Partial<ApplyCaseInsertPresetFirstTimeInput> = {},
): ApplyCaseInsertPresetFirstTimeInput {
  const acceptances = fixture.plan.materialConsentRequirements.map(
    ({ id }) => createCaseInsertPresetMaterialConsentAcceptance(fixture.plan, id),
  )
  assert.equal(acceptances.every(Boolean), true)
  return {
    planningResult: fixture.planningResult,
    source: {
      projectKind: 'caseInsert',
      aggregate: fixture.aggregate,
      snapshotIdentity: fixture.plan.source.snapshotIdentity,
      preset: {
        id: fixture.plan.preset.id,
        revision: fixture.plan.preset.revision,
      },
      requestedScope: fixture.scope,
    },
    attachment: { status: 'unattached' },
    reviewApproval: createCaseInsertPresetApplyReviewApproval(fixture.plan),
    materialConsentAcceptances:
      acceptances as CaseInsertPresetMaterialConsentAcceptance[],
    ...overrides,
  }
}

function applied(result: CaseInsertPresetApplyTransitionResult) {
  if (!result.ok) throw new Error(`${result.status}:${result.code}`)
  assert.equal(result.ok, true)
  return result
}

function failed(
  result: CaseInsertPresetApplyTransitionResult,
  status: Extract<CaseInsertPresetApplyTransitionResult, { ok: false }>['status'],
) {
  assert.equal(result.ok, false)
  if (result.ok) throw new Error('Expected failure')
  assert.equal(result.status, status)
  assert.equal('aggregate' in result, false)
  assert.equal('configurationCandidate' in result, false)
  return result
}

function textById(
  aggregate: ProjectJewelCaseState | ImmutableProjectJewelCaseState,
  owner: 'cover' | 'tray',
  id: string,
) {
  const runtimeId = {
    'case:cover:text:title': 'cover-title-text',
    'case:tray:text:description': 'tray-description',
  }[id] ?? id
  const block = aggregate.templates[owner].textBlocks.find(
    (item) => item.id === runtimeId,
  )
  assert.ok(block)
  return block
}

function fieldValue(
  target: Readonly<ProjectCaseInsertImageSlot> |
    Readonly<ProjectCaseInsertTextBlock>,
  fieldId: CaseInsertPresetPlanFieldAction['fieldId'],
) {
  switch (fieldId) {
    case 'layout-x': return target.layout.x
    case 'layout-y': return target.layout.y
    case 'layout-scale': return target.layout.scale
    case 'layout-width': return target.layout.width ?? null
  }
}

function targetForAction(
  aggregate: ProjectJewelCaseState | ImmutableProjectJewelCaseState,
  action: CaseInsertPresetPlanFieldAction,
) {
  switch (action.featureOwnerId) {
    case 'case.cover.text-blocks':
      return textById(aggregate, 'cover', action.object.runtimeId)
    case 'case.cover.artwork-slots':
    case 'case.cover.logo-slots': {
      const items = action.featureOwnerId === 'case.cover.artwork-slots'
        ? aggregate.templates.cover.artworkSlots
        : aggregate.templates.cover.logoSlots
      const target = items.find(
        ({ id }) => id === action.object.runtimeId,
      )
      assert.ok(target)
      return target
    }
    case 'case.tray.background': return aggregate.templates.tray.background
    case 'case.tray.text-blocks':
      return textById(aggregate, 'tray', action.object.runtimeId)
    case 'case.spine.left.title-text': return aggregate.spine.left.title
    case 'case.spine.right.title-text': return aggregate.spine.right.title
    default: throw new Error(`Unexpected test owner ${action.featureOwnerId}`)
  }
}

function mutablePlanningResult(result: CaseInsertPresetApplyPlanningResult) {
  return clone(result) as unknown as {
    status: 'planned' | 'semantic-no-op'
    plan: {
      formatVersion: number
      operation: string
      identity: { operation: string }
      reviewIdentity: string
      fieldActions: Array<CaseInsertPresetPlanFieldAction & {
        kind: string
        proposedValue: number
      }>
      fieldFootprint: Array<{
        acceptedValueCandidate: number
        sourceAssignmentIds: string[]
      }>
    }
  }
}

test('minimal Front Apply executes exact reviewed x, y, and width values', () => {
  const fixture = createFixture([FRONT_TEXT], {
    kind: 'region',
    region: 'front-cover',
  })
  const sourceBefore = clone(fixture.aggregate)
  const result = applied(applyCaseInsertPresetFirstTime(approvedInput(fixture)))
  const target = textById(result.aggregate, 'cover', FRONT_TEXT.object.id)

  assert.equal(result.status, 'applied')
  for (const action of fixture.plan.fieldActions) {
    assert.equal(fieldValue(target, action.fieldId), action.proposedValue)
  }
  assert.equal(target.layout.x, 31.234567890123)
  assert.equal(target.layout.y, 42.345678901234)
  assert.equal(target.layout.width, 53.456789012345)
  assert.deepEqual(fixture.aggregate, sourceBefore)
  assert.notEqual(result.aggregate, fixture.aggregate)
  assert.equal(Object.isFrozen(result.aggregate), true)
  assert.equal(Object.isFrozen(result.aggregate.templates.cover.textBlocks), true)
})

test('Back Panel and complete Tray execute through distinct owners and bases', () => {
  const back = createFixture([BACK_DESCRIPTION], {
    kind: 'region', region: 'back-panel',
  })
  const tray = createFixture([TRAY_BACKGROUND], {
    kind: 'region', region: 'tray-card',
  })
  const backResult = applied(applyCaseInsertPresetFirstTime(approvedInput(back)))
  const trayResult = applied(applyCaseInsertPresetFirstTime(approvedInput(tray)))

  assert.deepEqual(backResult.configurationCandidate.resolvedRegions, ['back-panel'])
  assert.deepEqual(trayResult.configurationCandidate.resolvedRegions, ['tray-card'])
  assert.equal(
    backResult.aggregate.templates.tray.background.layout.x,
    back.aggregate.templates.tray.background.layout.x,
  )
  assert.notEqual(
    textById(backResult.aggregate, 'tray', BACK_DESCRIPTION.object.id).layout.x,
    textById(back.aggregate, 'tray', BACK_DESCRIPTION.object.id).layout.x,
  )
  assert.notEqual(
    trayResult.aggregate.templates.tray.background.layout.x,
    tray.aggregate.templates.tray.background.layout.x,
  )
  assert.equal(
    textById(trayResult.aggregate, 'tray', BACK_DESCRIPTION.object.id).layout.x,
    textById(tray.aggregate, 'tray', BACK_DESCRIPTION.object.id).layout.x,
  )
})

test('Left and Right Spine remain independent and mirroring cannot fan out writes', () => {
  const fixture = createFixture(
    [LEFT_SPINE_TITLE, RIGHT_SPINE_TITLE],
    { kind: 'region', region: 'left-spine' },
    (aggregate) => { aggregate.spine.mirrored = true },
  )
  const rightBefore = clone(fixture.aggregate.spine.right)
  const result = applied(applyCaseInsertPresetFirstTime(approvedInput(fixture)))

  assert.notEqual(result.aggregate.spine.left.title.layout.x,
    fixture.aggregate.spine.left.title.layout.x)
  assert.deepEqual(result.aggregate.spine.right, rightBefore)
  assert.equal(result.aggregate.spine.mirrored, true)
  assert.deepEqual(result.configurationCandidate.resolvedRegions, ['left-spine'])
})

test('all concrete and section scopes change only their declared regions', () => {
  const cases: Array<readonly [CaseInsertPresetApplicationScope, string[]]> = [
    [{ kind: 'region', region: 'front-cover' }, ['front-cover']],
    [{ kind: 'region', region: 'tray-card' }, ['tray-card']],
    [{ kind: 'region', region: 'back-panel' }, ['back-panel']],
    [{ kind: 'region', region: 'left-spine' }, ['left-spine']],
    [{ kind: 'region', region: 'right-spine' }, ['right-spine']],
    [{ kind: 'section', section: 'front' }, ['front-cover']],
    [{ kind: 'section', section: 'back' }, ['tray-card', 'back-panel']],
    [{ kind: 'section', section: 'spine' }, ['left-spine', 'right-spine']],
    [{ kind: 'complete' }, [
      'front-cover', 'tray-card', 'back-panel', 'left-spine', 'right-spine',
    ]],
  ]
  for (const [scope, regions] of cases) {
    const fixture = createFixture(ALL_REGIONS, scope)
    const result = applied(applyCaseInsertPresetFirstTime(approvedInput(fixture)))
    assert.deepEqual(result.configurationCandidate.resolvedRegions, regions)
    const changedOwners = new Set(
      result.configurationCandidate.ownedFields.map(({ featureOwnerId }) =>
        featureOwnerId),
    )
    for (const assignment of fixture.plan.assignments) {
      assert.equal(changedOwners.has(assignment.ownerId),
        regions.includes(assignment.region))
    }
  }
})

test('coordinated Complete Apply is aggregate-atomic and consent-complete', () => {
  const fixture = createFixture(ALL_REGIONS, { kind: 'complete' })
  assert.equal(fixture.plan.materialConsentRequirements.length, 1)
  const result = applied(applyCaseInsertPresetFirstTime(approvedInput(fixture)))

  assert.equal(result.configurationCandidate.ownedFields.length,
    fixture.plan.fieldActions.length)
  assert.deepEqual(
    result.configurationCandidate.acceptedMaterialConsentRequirementIds,
    fixture.plan.materialConsentRequirements.map(({ id }) => id),
  )
  assert.equal(result.configurationCandidate.reviewedWarningIds.length,
    fixture.plan.warnings.length)
  for (const action of fixture.plan.fieldActions) {
    assert.equal(
      fieldValue(targetForAction(result.aggregate, action), action.fieldId),
      action.proposedValue,
    )
  }
})

test('stable repeated-object addressing ignores array reorder', () => {
  const repeatedId = 'cover-logo-2'
  const spec: AssignmentSpec = {
    suffix: 'front-repeated-artwork',
    roleId: 'company-logos',
    region: 'front-cover',
    coordinateBasis: 'frontSafe',
    ownerId: 'case.cover.logo-slots',
    object: { kind: 'repeated', id: repeatedId },
  }
  const fixture = createFixture([spec], { kind: 'region', region: 'front-cover' },
    (aggregate) => {
      aggregate.templates.cover.logoSlots.push(
        createDefaultCaseInsertImageSlot('cover-logo-1', 'Other'),
        createDefaultCaseInsertImageSlot(repeatedId, 'Target'),
      )
    })
  const reordered = clone(fixture.aggregate)
  reordered.templates.cover.logoSlots.reverse()
  const first = applied(applyCaseInsertPresetFirstTime(approvedInput(fixture)))
  const second = applied(applyCaseInsertPresetFirstTime(approvedInput(fixture, {
    source: { ...approvedInput(fixture).source, aggregate: reordered },
  })))
  const firstTarget = first.aggregate.templates.cover.logoSlots.find(
    ({ id }) => id === repeatedId,
  )!
  const secondTarget = second.aggregate.templates.cover.logoSlots.find(
    ({ id }) => id === repeatedId,
  )!
  assert.deepEqual(firstTarget.layout, secondTarget.layout)
  assert.equal(second.aggregate.templates.cover.logoSlots[0]!.id, repeatedId)
})

test('missing and duplicate repeated targets fail closed without output', () => {
  const repeatedId = 'cover-logo-required'
  const spec: AssignmentSpec = {
    suffix: 'required-repeated',
    roleId: 'company-logos',
    region: 'front-cover',
    coordinateBasis: 'frontSafe',
    ownerId: 'case.cover.logo-slots',
    object: { kind: 'repeated', id: repeatedId },
  }
  const fixture = createFixture(
    [FRONT_TEXT, spec],
    { kind: 'section', section: 'front' },
    (aggregate) => {
      aggregate.templates.cover.logoSlots.push(
        createDefaultCaseInsertImageSlot(repeatedId, 'Target'),
      )
    },
  )
  const sourceBefore = clone(fixture.aggregate)
  const missing = clone(fixture.aggregate)
  missing.templates.cover.logoSlots = []
  failed(applyCaseInsertPresetFirstTime(approvedInput(fixture, {
    source: { ...approvedInput(fixture).source, aggregate: missing },
  })), 'target-missing')
  assert.deepEqual(fixture.aggregate, sourceBefore)

  const duplicate = clone(fixture.aggregate)
  duplicate.templates.cover.logoSlots.push(
    clone(duplicate.templates.cover.logoSlots[0]!),
  )
  failed(applyCaseInsertPresetFirstTime(approvedInput(fixture, {
    source: { ...approvedInput(fixture).source, aggregate: duplicate },
  })), 'target-ambiguous')
})

test('disabled payloads and optional-target skips preserve all content', () => {
  const optional: AssignmentSpec = {
    suffix: 'optional-missing',
    roleId: 'company-logos',
    region: 'front-cover',
    coordinateBasis: 'frontSafe',
    ownerId: 'case.cover.logo-slots',
    object: { kind: 'repeated', id: 'cover-logo-missing' },
    targetPresence: 'optional',
  }
  const fixture = createFixture([FRONT_TEXT, optional], {
    kind: 'region', region: 'front-cover',
  }, (aggregate) => {
    const title = textById(aggregate, 'cover', FRONT_TEXT.object.id)
    title.enabled = false
    title.value = 'Preserved rich text'
    title.contentMode = 'html'
    title.htmlSource = '<strong>Preserved rich text</strong>'
    title.source = 'metadata'
    title.layout.rotation = 17
    title.style.color = '#123456'
  })
  const before = clone(textById(fixture.aggregate, 'cover', FRONT_TEXT.object.id))
  const result = applied(applyCaseInsertPresetFirstTime(approvedInput(fixture)))
  const after = textById(result.aggregate, 'cover', FRONT_TEXT.object.id)

  assert.equal(after.enabled, false)
  assert.equal(after.value, before.value)
  assert.equal(after.htmlSource, before.htmlSource)
  assert.equal(after.source, before.source)
  assert.equal(after.layout.rotation, before.layout.rotation)
  assert.equal(after.style.color, before.style.color)
  assert.equal(result.aggregate.templates.cover.artworkSlots.length, 0)
  assert.equal(fixture.plan.skips.length, 1)
})

test('one changed precondition prevents every multi-region write', () => {
  const fixture = createFixture(
    [FRONT_TEXT, BACK_DESCRIPTION],
    { kind: 'complete' },
  )
  const changed = clone(fixture.aggregate)
  textById(changed, 'tray', BACK_DESCRIPTION.object.id).layout.y += 1
  const before = clone(changed)
  const result = failed(applyCaseInsertPresetFirstTime(approvedInput(fixture, {
    source: { ...approvedInput(fixture).source, aggregate: changed },
  })), 'precondition-failed')

  assert.deepEqual(changed, before)
  assert.equal('aggregate' in result, false)
})

test('review approval is required and bound to exact plan content', () => {
  const fixture = createFixture([FRONT_TEXT], {
    kind: 'region', region: 'front-cover',
  })
  failed(applyCaseInsertPresetFirstTime(approvedInput(fixture, {
    reviewApproval: null,
  })), 'review-required')

  const other = createFixture([BACK_DESCRIPTION], {
    kind: 'region', region: 'back-panel',
  })
  failed(applyCaseInsertPresetFirstTime(approvedInput(fixture, {
    reviewApproval: createCaseInsertPresetApplyReviewApproval(other.plan),
  })), 'review-mismatch')

  const forged = mutablePlanningResult(fixture.planningResult)
  forged.plan.fieldActions[0]!.proposedValue += 3
  forged.plan.fieldFootprint[0]!.acceptedValueCandidate += 3
  const forgedResult = deepFreeze(forged) as unknown as
    CaseInsertPresetApplyPlanningResult
  failed(applyCaseInsertPresetFirstTime(approvedInput(fixture, {
    planningResult: forgedResult,
  })), 'review-mismatch')
})

test('material consent must exactly cover this reviewed plan', () => {
  const fixture = createFixture(
    [FRONT_TEXT, BACK_DESCRIPTION],
    { kind: 'complete' },
  )
  const input = approvedInput(fixture)
  assert.equal(input.materialConsentAcceptances.length, 1)
  failed(applyCaseInsertPresetFirstTime({
    ...input,
    materialConsentAcceptances: [],
  }), 'consent-incomplete')
  failed(applyCaseInsertPresetFirstTime({
    ...input,
    materialConsentAcceptances: [
      ...input.materialConsentAcceptances,
      input.materialConsentAcceptances[0]!,
    ],
  }), 'consent-mismatch')
  const unknown = clone(input.materialConsentAcceptances[0]!)
  unknown.requirementId = 'case:preset-consent:unknown'
  failed(applyCaseInsertPresetFirstTime({
    ...input,
    materialConsentAcceptances: [unknown],
  }), 'consent-mismatch')

  const other = createFixture(
    [TRAY_BACKGROUND, RIGHT_SPINE_TITLE],
    { kind: 'complete' },
  )
  failed(applyCaseInsertPresetFirstTime({
    ...input,
    materialConsentAcceptances: approvedInput(other)
      .materialConsentAcceptances,
  }), 'consent-mismatch')
})

test('stale identities, source context, invalid aggregates, and attachment fail typed', () => {
  const fixture = createFixture([FRONT_TEXT], {
    kind: 'region', region: 'front-cover',
  })
  const input = approvedInput(fixture)
  failed(applyCaseInsertPresetFirstTime({
    ...input,
    source: {
      ...input.source,
      snapshotIdentity: {
        ...input.source.snapshotIdentity,
        projectRevision: input.source.snapshotIdentity.projectRevision + 1,
      },
    },
  }), 'stale-plan')
  failed(applyCaseInsertPresetFirstTime({
    ...input,
    source: {
      ...input.source,
      snapshotIdentity: {
        ...input.source.snapshotIdentity,
        sessionId: 'replacement-session',
      },
    },
  }), 'stale-plan')
  failed(applyCaseInsertPresetFirstTime({
    ...input,
    source: {
      ...input.source,
      snapshotIdentity: {
        ...input.source.snapshotIdentity,
        template: { id: 'futureCaseTemplate', revision: null },
      },
    },
  }), 'stale-plan')
  failed(applyCaseInsertPresetFirstTime({
    ...input,
    source: {
      ...input.source,
      requestedScope: { kind: 'complete' },
    },
  }), 'precondition-failed')
  failed(applyCaseInsertPresetFirstTime({
    ...input,
    source: {
      ...input.source,
      preset: {
        id: 'builtin:case-preset:alias' as typeof input.source.preset.id,
        revision: input.source.preset.revision,
      },
    },
  }), 'precondition-failed')
  failed(applyCaseInsertPresetFirstTime({
    ...input,
    attachment: { status: 'attached', configurationIdentity: 'existing' },
  }), 'already-attached')
  failed(applyCaseInsertPresetFirstTime({
    ...input,
    source: {
      ...input.source,
      projectKind: 'disc',
    } as unknown as ApplyCaseInsertPresetFirstTimeInput['source'],
  }), 'incompatible-source-aggregate')
  const nonNormalized = clone(input.source.aggregate) as ProjectJewelCaseState & {
    unexpected?: boolean
  }
  nonNormalized.unexpected = true
  failed(applyCaseInsertPresetFirstTime({
    ...input,
    source: { ...input.source, aggregate: nonNormalized },
  }), 'invalid-source-aggregate')
})

test('unsupported plan versions, operations, actions, and divergent writes fail closed', () => {
  const fixture = createFixture([FRONT_TEXT], {
    kind: 'region', region: 'front-cover',
  })

  const version = mutablePlanningResult(fixture.planningResult)
  version.plan.formatVersion = 2
  failed(applyCaseInsertPresetFirstTime(approvedInput(fixture, {
    planningResult: deepFreeze(version) as unknown as
      CaseInsertPresetApplyPlanningResult,
  })), 'unsupported-plan-version')

  const operation = mutablePlanningResult(fixture.planningResult)
  operation.plan.operation = 'reapply'
  operation.plan.identity.operation = 'reapply'
  failed(applyCaseInsertPresetFirstTime(approvedInput(fixture, {
    planningResult: deepFreeze(operation) as unknown as
      CaseInsertPresetApplyPlanningResult,
  })), 'unsupported-operation')

  const unsupported = mutablePlanningResult(fixture.planningResult)
  unsupported.plan.fieldActions[0]!.kind = 'delete-object'
  failed(applyCaseInsertPresetFirstTime(approvedInput(fixture, {
    planningResult: deepFreeze(unsupported) as unknown as
      CaseInsertPresetApplyPlanningResult,
  })), 'unsupported-action')

  const divergent = mutablePlanningResult(fixture.planningResult)
  const conflicting = clone(divergent.plan.fieldActions[0]!)
  conflicting.proposedValue += 1
  divergent.plan.fieldActions.push(conflicting)
  failed(applyCaseInsertPresetFirstTime(approvedInput(fixture, {
    planningResult: deepFreeze(divergent) as unknown as
      CaseInsertPresetApplyPlanningResult,
  })), 'transition-conflict')
})

test('a changed current semantic value after planning fails preflight', () => {
  const fixture = createFixture([FRONT_TEXT], {
    kind: 'region', region: 'front-cover',
  })
  const changed = clone(fixture.aggregate)
  textById(changed, 'cover', FRONT_TEXT.object.id).layout.x += 0.000000000001
  failed(applyCaseInsertPresetFirstTime(approvedInput(fixture, {
    source: { ...approvedInput(fixture).source, aggregate: changed },
  })), 'precondition-failed')
})

test('semantic no-op Apply returns a detached attachment candidate without changes', () => {
  const original = createBlankJewelCaseSavedProject().caseInsert
  const title = textById(original, 'cover', FRONT_TEXT.object.id)
  const fixture = createFixture([{
    ...FRONT_TEXT,
    contentRegion: {
      centerXPercent: title.layout.x,
      centerYPercent: title.layout.y,
      widthPercent: title.layout.width ?? 100,
      heightPercent: 20,
    },
  }], { kind: 'region', region: 'front-cover' })
  assert.equal(fixture.planningResult.status, 'semantic-no-op')
  const result = applied(applyCaseInsertPresetFirstTime(approvedInput(fixture)))

  assert.equal(result.status, 'applied-semantic-no-op')
  assert.deepEqual(result.aggregate, fixture.aggregate)
  assert.notEqual(result.aggregate, fixture.aggregate)
  assert.equal(result.configurationCandidate.installationStatus,
    'candidate-uninstalled')
  assert.equal(result.configurationCandidate.ownedFields.length, 3)
})

test('configuration candidates are deterministic and retain coalesced provenance', () => {
  const fixture = createFixture(
    [FRONT_TEXT],
    { kind: 'region', region: 'front-cover' },
    undefined,
    (resolution) => {
      const duplicate = clone(resolution)
      const mutable = duplicate as unknown as {
        value: {
          assignments: Array<ResolvedResult['value']['assignments'][number] & {
            assignmentId: `case:preset-assignment:${string}`
            slotId: `case:preset-slot:${string}`
          }>
        }
      }
      const source = clone(mutable.value.assignments[0]!)
      source.assignmentId = 'case:preset-assignment:front-title-second-source'
      source.slotId = 'case:preset-slot:front-title-second-source'
      mutable.value.assignments.push(source)
      return deepFreeze(duplicate)
    },
  )
  const first = applied(applyCaseInsertPresetFirstTime(approvedInput(fixture)))
  const second = applied(applyCaseInsertPresetFirstTime(approvedInput(fixture)))

  assert.deepEqual(first.configurationCandidate, second.configurationCandidate)
  assert.equal(Object.isFrozen(first.configurationCandidate), true)
  assert.equal(Object.isFrozen(first.configurationCandidate.ownedFields), true)
  assert.equal(first.configurationCandidate.ownedFields[0]!.sources.length, 2)
  for (const owned of first.configurationCandidate.ownedFields) {
    const action = fixture.plan.fieldActions.find(({ id }) =>
      id === [
        'case:preset-field-action',
        owned.featureOwnerId,
        owned.object.runtimeId,
        owned.fieldId,
      ].join(':'))
    assert.ok(action)
    assert.equal(owned.lastAppliedValue, action.proposedValue)
    assert.equal(owned.sources.every(({ roleId, slotId, assignmentId }) =>
      Boolean(roleId && slotId && assignmentId)), true)
  }
})

test('content, provenance, style, unrelated regions, and caller inputs stay detached', () => {
  const fixture = createFixture([TRAY_BACKGROUND], {
    kind: 'region', region: 'tray-card',
  }, (aggregate) => {
    const background = aggregate.templates.tray.background
    background.imageDataUrl = 'data:image/png;base64,cHJlc2VydmVkLWJ5dGVz'
    background.imageSource = {
      source: 'uploaded',
      sourceId: 'asset-1',
      sourceLabel: 'Preserved upload',
    }
    background.imageSize = { width: 1024, height: 512 }
    background.fit = 'cover'
    background.layout.rotation = 11
    aggregate.templates.cover.background.label = 'Out of scope owner'
  })
  const frozenAggregate = deepFreeze(clone(fixture.aggregate))
  const frozenInput = deepFreeze(approvedInput(fixture, {
    source: { ...approvedInput(fixture).source, aggregate: frozenAggregate },
  }))
  const before = clone(frozenInput)
  const result = applied(applyCaseInsertPresetFirstTime(frozenInput))
  const background = result.aggregate.templates.tray.background

  assert.equal(background.imageDataUrl,
    'data:image/png;base64,cHJlc2VydmVkLWJ5dGVz')
  assert.deepEqual(background.imageSource, {
    source: 'uploaded',
    sourceId: 'asset-1',
    sourceLabel: 'Preserved upload',
    sourceUrl: null,
  })
  assert.deepEqual(background.imageSize, { width: 1024, height: 512 })
  assert.equal(background.fit, 'cover')
  assert.equal(background.layout.rotation, 11)
  assert.equal(result.aggregate.templates.cover.background.label,
    'Out of scope owner')
  assert.deepEqual(frozenInput, before)
  const candidateText = JSON.stringify(result.configurationCandidate)
  assert.equal(candidateText.includes('cHJlc2VydmVkLWJ5dGVz'), false)
  assert.equal(candidateText.includes('Preserved upload'), false)
})

test('transition source stays pure, directly addressed, and runtime-disconnected', () => {
  const transitionSource = readFileSync(
    new URL('./caseInsertPresetApplyTransition.ts', import.meta.url),
    'utf8',
  )
  assert.equal(transitionSource.includes('planCaseInsertPresetFirstApply('), false)
  assert.equal(transitionSource.includes('resolveCaseInsertPresetAssignments'), false)
  assert.equal(transitionSource.includes('caseInsertPresetCatalog'), false)
  assert.equal(transitionSource.includes('JSON.stringify'), false)
  assert.equal(transitionSource.includes('React'), false)
  assert.equal(transitionSource.includes('@tauri-apps'), false)
  assert.equal(transitionSource.includes('invoke('), false)
  assert.equal(transitionSource.includes('writeFile'), false)
  assert.equal(transitionSource.includes('dispatch('), false)
  assert.deepEqual(CASE_INSERT_PRESET_CATALOG.list(), [])
})
