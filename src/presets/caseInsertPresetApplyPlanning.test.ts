import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { createDefaultCaseInsertImageSlot } from '../caseInsert/defaults.ts'
import {
  createCaseInsertPresetAssignmentSnapshot,
} from '../caseInsert/presetAssignmentSnapshot.ts'
import { captureNormalizedProjectSnapshot } from '../lifecycle/canonicalProject.ts'
import { createBlankJewelCaseSavedProject } from '../project/caseInsertProjectAdapters.ts'
import type { ProjectJewelCaseState } from '../project/projectTypes.ts'
import { caseInsertTemplates } from '../templates/caseInsertTemplates.ts'
import {
  planCaseInsertPresetFirstApply,
  type CaseInsertPresetApplyPlanningResult,
  type PlanCaseInsertPresetFirstApplyInput,
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
  actionRegion?: Readonly<{
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

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) deepFreeze(child)
    Object.freeze(value)
  }
  return value
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function defaultRegion() {
  return {
    centerXPercent: 40,
    centerYPercent: 35,
    widthPercent: 60,
    heightPercent: 50,
  }
}

function scopeForRegions(
  regions: readonly CaseInsertPresetConcreteRegionId[],
): CaseInsertPresetApplicationScope[] {
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

function createDefinition(
  specs: readonly AssignmentSpec[],
  id = 'builtin:case-preset:planner-fixture',
) {
  const regions = [...new Set(specs.map(({ region }) => region))]
  return {
    kind: CASE_INSERT_PRESET_DEFINITION_KIND,
    formatVersion: CASE_INSERT_PRESET_FORMAT_VERSION,
    id,
    revision: 4,
    name: 'Planner fixture',
    surface: 'case-insert',
    compatibility: {
      mode: 'specific-template',
      templateId: 'jewelCase',
    },
    applicationScopes: scopeForRegions(regions),
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
        ...(spec.actionRegion ? { actionRegion: spec.actionRegion } : {}),
      }],
    })),
  }
}

function createSnapshot(
  mutate?: (caseInsert: ProjectJewelCaseState) => void,
  projectRevision = 12,
) {
  const project = createBlankJewelCaseSavedProject()
  mutate?.(project.caseInsert)
  const result = createCaseInsertPresetAssignmentSnapshot({
    sessionId: 'planner-session',
    projectRevision,
    project: captureNormalizedProjectSnapshot(project),
  })
  assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result))
  if (!result.ok) throw new Error(result.error.code)
  return result.value
}

function resolve(
  specs: readonly AssignmentSpec[],
  requestedScope: CaseInsertPresetApplicationScope,
  snapshot = createSnapshot(),
  options: Readonly<{ alias?: string }> = {},
) {
  const definition = createDefinition(specs)
  const catalogResult = createCaseInsertPresetCatalog({
    builtins: [definition],
    aliases: options.alias
      ? [{ alias: options.alias, canonicalId: definition.id }]
      : [],
  })
  assert.equal(catalogResult.ok, true)
  if (!catalogResult.ok) throw new Error(catalogResult.error.code)
  return resolveCaseInsertPresetAssignments({
    catalog: catalogResult.catalog,
    reference: {
      id: options.alias ?? definition.id,
      revision: definition.revision,
    },
    requestedScope,
    snapshot,
    expectedSnapshotIdentity: snapshot.identity,
  })
}

function plan(
  resolution: CaseInsertPresetAssignmentResolutionResult,
  overrides: Partial<PlanCaseInsertPresetFirstApplyInput> = {},
) {
  assert.equal(resolution.ok, true)
  if (!resolution.ok) throw new Error(resolution.status)
  return planCaseInsertPresetFirstApply({
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
    ...overrides,
  })
}

function planned(result: CaseInsertPresetApplyPlanningResult) {
  assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result))
  if (!result.ok) throw new Error(result.status)
  return result.plan
}

function assertEquivalentResolvedPlanActions(
  left: ReturnType<typeof planned>,
  right: ReturnType<typeof planned>,
) {
  assert.deepEqual(
    {
      resolvedRegions: left.resolvedRegions,
      assignments: left.assignments,
      fieldActions: left.fieldActions,
      preservationDecisions: left.preservationDecisions,
      skips: left.skips,
      warnings: left.warnings,
      blockers: left.blockers,
      materialConsentRequirements: left.materialConsentRequirements,
      semanticNoOp: left.semanticNoOp,
      fieldFootprint: left.fieldFootprint,
    },
    {
      resolvedRegions: right.resolvedRegions,
      assignments: right.assignments,
      fieldActions: right.fieldActions,
      preservationDecisions: right.preservationDecisions,
      skips: right.skips,
      warnings: right.warnings,
      blockers: right.blockers,
      materialConsentRequirements: right.materialConsentRequirements,
      semanticNoOp: right.semanticNoOp,
      fieldFootprint: right.fieldFootprint,
    },
  )
}

function fieldValue(
  result: CaseInsertPresetApplyPlanningResult,
  fieldId: string,
) {
  return planned(result).fieldActions.find((action) =>
    action.fieldId === fieldId)?.proposedValue
}

test('plans a minimal Front Apply with exact typed direct owner fields', () => {
  const result = plan(resolve(
    [{
      ...FRONT_TEXT,
      contentRegion: {
        centerXPercent: 20,
        centerYPercent: 30,
        widthPercent: 40,
        heightPercent: 50,
      },
    }],
    { kind: 'region', region: 'front-cover' },
  ))
  const value = planned(result)

  assert.equal(result.status, 'planned')
  assert.deepEqual(value.resolvedRegions, ['front-cover'])
  assert.deepEqual(
    value.fieldActions.map(({ kind, fieldId, proposedValue }) => ({
      kind,
      fieldId,
      proposedValue,
    })),
    [
      { kind: 'set-layout-x', fieldId: 'layout-x', proposedValue: 20 },
      { kind: 'set-layout-y', fieldId: 'layout-y', proposedValue: 30 },
      { kind: 'set-layout-width', fieldId: 'layout-width', proposedValue: 40 },
    ],
  )
  assert.equal(value.operation, 'apply')
  assert.equal(value.kind, 'sbls/case-insert-preset-apply-plan')
  assert.equal(value.formatVersion, 2)
})

test('converts a template coordinate basis into the authoritative owner basis', () => {
  const contentRegion = {
    centerXPercent: 50,
    centerYPercent: 50,
    widthPercent: 50,
    heightPercent: 50,
  }
  const result = plan(resolve(
    [{ ...FRONT_TEXT, coordinateBasis: 'front', contentRegion }],
    { kind: 'region', region: 'front-cover' },
  ))
  const template = caseInsertTemplates.jewelCase
  const front = template.regions.find(({ id }) => id === 'front')!.bounds
  const safe = template.regions.find(({ id }) => id === 'frontSafe')!.bounds

  assert.equal(fieldValue(result, 'layout-x'), 50)
  assert.equal(fieldValue(result, 'layout-y'), 50)
  assert.equal(
    fieldValue(result, 'layout-width'),
    front.widthMm * 50 / safe.widthMm,
  )
})

test('keeps complete Tray and Back Panel planning separate', () => {
  const result = plan(resolve(
    [
      {
        ...TRAY_BACKGROUND,
        contentRegion: {
          centerXPercent: 50,
          centerYPercent: 50,
          widthPercent: 80,
          heightPercent: 80,
        },
      },
      BACK_DESCRIPTION,
    ],
    { kind: 'section', section: 'back' },
  ))
  const value = planned(result)
  const tray = value.assignments.find(({ region }) => region === 'tray-card')!
  const panel = value.assignments.find(({ region }) => region === 'back-panel')!

  assert.deepEqual(value.resolvedRegions, ['tray-card', 'back-panel'])
  assert.equal(tray.ownerId, 'case.tray.background')
  assert.equal(panel.ownerId, 'case.tray.text-blocks')
  assert.ok(value.warnings.some(({ kind }) => kind === 'complete-tray-span'))
  assert.equal(fieldValue(result, 'layout-scale'), 0.8)
})

test('Back Panel actions remain bound to Back Panel safe coordinates, not spine space', () => {
  const result = plan(resolve(
    [BACK_DESCRIPTION],
    { kind: 'region', region: 'back-panel' },
  ))
  const value = planned(result)
  const sources = value.fieldActions.flatMap(({ sources }) => sources)

  assert.ok(sources.every(({ region }) => region === 'back-panel'))
  assert.ok(sources.every(({ coordinateBasis }) =>
    coordinateBasis === 'backPanelSafe'))
  assert.ok(sources.every(({ ownerId }) => ownerId === 'case.tray.text-blocks'))
  assert.equal(value.resolvedRegions.includes('left-spine'), false)
  assert.equal(value.resolvedRegions.includes('right-spine'), false)
})

test('plans Left and Right Spine independently and ignores mirrored editing', () => {
  const scope = { kind: 'section', section: 'spine' } as const
  const unmirrored = plan(resolve(
    [LEFT_SPINE_TITLE, RIGHT_SPINE_TITLE],
    scope,
    createSnapshot((state) => { state.spine.mirrored = false }),
  ))
  const mirrored = plan(resolve(
    [LEFT_SPINE_TITLE, RIGHT_SPINE_TITLE],
    scope,
    createSnapshot((state) => { state.spine.mirrored = true }),
  ))

  assertEquivalentResolvedPlanActions(planned(unmirrored), planned(mirrored))
  assert.notEqual(
    planned(unmirrored).preconditions.aggregateContentIdentity,
    planned(mirrored).preconditions.aggregateContentIdentity,
  )
  assert.notEqual(planned(unmirrored).reviewIdentity, planned(mirrored).reviewIdentity)
  assert.deepEqual(
    planned(unmirrored).assignments.map(({ region, objectId }) => ({
      region,
      objectId,
    })),
    [
      { region: 'left-spine', objectId: 'case:spine:left:text:title' },
      { region: 'right-spine', objectId: 'case:spine:right:text:title' },
    ],
  )
})

test('plans coordinated multi-region scopes and records material consent', () => {
  const specs = [
    FRONT_TEXT,
    TRAY_BACKGROUND,
    BACK_DESCRIPTION,
    LEFT_SPINE_TITLE,
    RIGHT_SPINE_TITLE,
  ]
  const result = plan(resolve(specs, { kind: 'complete' }))
  const value = planned(result)

  assert.deepEqual(value.resolvedRegions, [
    'front-cover',
    'tray-card',
    'back-panel',
    'left-spine',
    'right-spine',
  ])
  assert.deepEqual(
    value.materialConsentRequirements.map(({ kind }) => kind),
    ['multiple-concrete-regions'],
  )
  assert.equal(value.blockers.length, 0)
})

test('each concrete, Front, Back, Spine, and Complete scope stays exact', () => {
  const specs = [
    FRONT_TEXT,
    TRAY_BACKGROUND,
    BACK_DESCRIPTION,
    LEFT_SPINE_TITLE,
    RIGHT_SPINE_TITLE,
  ]
  const expectations = [
    [{ kind: 'region', region: 'front-cover' }, ['front-cover']],
    [{ kind: 'region', region: 'tray-card' }, ['tray-card']],
    [{ kind: 'region', region: 'back-panel' }, ['back-panel']],
    [{ kind: 'region', region: 'left-spine' }, ['left-spine']],
    [{ kind: 'region', region: 'right-spine' }, ['right-spine']],
    [{ kind: 'section', section: 'front' }, ['front-cover']],
    [{ kind: 'section', section: 'back' }, ['tray-card', 'back-panel']],
    [{ kind: 'section', section: 'spine' }, ['left-spine', 'right-spine']],
    [{ kind: 'complete' }, [
      'front-cover',
      'tray-card',
      'back-panel',
      'left-spine',
      'right-spine',
    ]],
  ] as const

  for (const [scope, expected] of expectations) {
    assert.deepEqual(planned(plan(resolve(specs, scope))).resolvedRegions, expected)
  }
})

test('binds fixed synthetic and repeated objects without using array position', () => {
  const repeated: AssignmentSpec = {
    suffix: 'cover-logo-two',
    roleId: 'company-logos',
    region: 'front-cover',
    coordinateBasis: 'frontSafe',
    ownerId: 'case.cover.logo-slots',
    object: { kind: 'repeated', id: 'cover-logo-2' },
  }
  const slots = [
    createDefaultCaseInsertImageSlot('cover-logo-1', 'First'),
    createDefaultCaseInsertImageSlot('cover-logo-2', 'Second'),
  ]
  const first = plan(resolve(
    [FRONT_TEXT, repeated],
    { kind: 'section', section: 'front' },
    createSnapshot((state) => { state.templates.cover.logoSlots = slots }),
  ))
  const reordered = plan(resolve(
    [FRONT_TEXT, repeated],
    { kind: 'section', section: 'front' },
    createSnapshot((state) => {
      state.templates.cover.logoSlots = [...slots].reverse()
    }),
  ))

  assertEquivalentResolvedPlanActions(planned(first), planned(reordered))
  assert.notEqual(
    planned(first).preconditions.aggregateContentIdentity,
    planned(reordered).preconditions.aggregateContentIdentity,
  )
  assert.notEqual(planned(first).reviewIdentity, planned(reordered).reviewIdentity)
  assert.ok(planned(first).fieldActions.some(({ object }) =>
    object.bindingKind === 'repeated' && object.runtimeId === 'cover-logo-2'))
  assert.ok(planned(first).fieldActions.some(({ object }) =>
    object.bindingKind === 'fixed' && object.runtimeId === 'cover-title-text'))
})

test('preserves disabled payloads and never enables them implicitly', () => {
  const result = plan(resolve(
    [FRONT_TEXT],
    { kind: 'region', region: 'front-cover' },
    createSnapshot((state) => {
      const title = state.templates.cover.textBlocks.find(
        ({ id }) => id === 'cover-title-text',
      )!
      title.enabled = false
      title.value = 'Preserve me'
      title.contentMode = 'html'
      title.htmlSource = '<p><strong>Preserve me</strong></p>'
    }),
  ))
  const value = planned(result)

  assert.equal(value.assignments[0]?.bindingStatus, 'resolved-disabled')
  assert.ok(value.warnings.some(({ kind }) =>
    kind === 'disabled-target-layout-only'))
  assert.ok(value.preservationDecisions.some(({ category }) =>
    category === 'enablement-and-disabled-payload'))
  assert.equal(JSON.stringify(value).includes('Preserve me'), false)
  assert.equal(value.fieldActions.some(({ fieldId }) =>
    fieldId === ('enabled' as string)), false)
})

test('missing optional targets skip while missing required targets block', () => {
  const optional: AssignmentSpec = {
    suffix: 'missing-logo',
    roleId: 'company-logos',
    region: 'front-cover',
    coordinateBasis: 'frontSafe',
    ownerId: 'case.cover.logo-slots',
    object: { kind: 'repeated', id: 'missing-logo' },
    targetPresence: 'optional',
  }
  const optionalResult = plan(resolve(
    [optional],
    { kind: 'region', region: 'front-cover' },
  ))
  assert.equal(optionalResult.ok, true)
  assert.equal(planned(optionalResult).skips[0]?.kind, 'missing-optional-target')

  const requiredResult = plan(resolve(
    [
      { ...optional, targetPresence: 'required' },
      BACK_DESCRIPTION,
    ],
    { kind: 'complete' },
  ))
  assert.equal(requiredResult.ok, false)
  assert.equal(requiredResult.status, 'blocked')
  if (requiredResult.status === 'blocked') {
    assert.equal(requiredResult.blockers[0]?.kind, 'missing-required-target')
  }
})

test('definition and assignment source order cannot change plan ordering', () => {
  const specs = [
    FRONT_TEXT,
    TRAY_BACKGROUND,
    BACK_DESCRIPTION,
    LEFT_SPINE_TITLE,
    RIGHT_SPINE_TITLE,
  ]
  const forward = planned(plan(resolve(specs, { kind: 'complete' })))
  const reverse = planned(plan(resolve([...specs].reverse(), {
    kind: 'complete',
  })))

  assert.deepEqual(forward, reverse)
  assert.deepEqual(
    forward.assignments.map(({ region }) => region),
    [
      'front-cover',
      'tray-card',
      'back-panel',
      'left-spine',
      'right-spine',
    ],
  )
})

test('preserves content, provenance, metadata, style, fit, crop, and untargeted fields', () => {
  const repeated: AssignmentSpec = {
    suffix: 'cover-logo',
    roleId: 'company-logos',
    region: 'front-cover',
    coordinateBasis: 'frontSafe',
    ownerId: 'case.cover.logo-slots',
    object: { kind: 'repeated', id: 'cover-logo-1' },
  }
  const result = plan(resolve(
    [FRONT_TEXT, repeated],
    { kind: 'section', section: 'front' },
    createSnapshot((state) => {
      state.templates.cover.logoSlots = [createDefaultCaseInsertImageSlot(
        'cover-logo-1',
        'Company logo',
      )]
    }),
  ))
  const categories = new Set(planned(result).preservationDecisions.map(
    ({ category }) => category,
  ))

  for (const category of [
    'image-bytes',
    'image-provenance',
    'text-content',
    'rich-text-content',
    'metadata-source-and-manual-override',
    'branding-selection-and-custom-assets',
    'enablement-and-disabled-payload',
    'repeated-object-identity',
    'frame-material-and-style',
    'fit-crop-and-rotation',
    'untargeted-object-fields',
    'owners-outside-requested-scope',
  ]) {
    assert.ok(categories.has(category as never), category)
  }
  assert.equal('candidateProject' in planned(result), false)
  assert.equal('createdObjects' in planned(result), false)
})

test('detects field and aggregate semantic no-ops exactly', () => {
  const spec = {
    ...FRONT_TEXT,
    contentRegion: {
      centerXPercent: 22,
      centerYPercent: 33,
      widthPercent: 44,
      heightPercent: 50,
    },
  }
  const result = plan(resolve(
    [spec],
    { kind: 'region', region: 'front-cover' },
    createSnapshot((state) => {
      const title = state.templates.cover.textBlocks.find(
        ({ id }) => id === 'cover-title-text',
      )!
      title.layout.x = 22
      title.layout.y = 33
      title.layout.width = 44
    }),
  ))

  assert.equal(result.status, 'semantic-no-op')
  assert.equal(planned(result).semanticNoOp.aggregate, true)
  assert.ok(planned(result).fieldActions.every(({ semanticNoOp }) => semanticNoOp))
  assert.equal(planned(result).materialConsentRequirements.length, 0)
})

test('coalesces identical writes and rejects conflicting writes without order wins', () => {
  const base = resolve(
    [FRONT_TEXT],
    { kind: 'region', region: 'front-cover' },
  )
  assert.equal(base.ok, true)
  if (!base.ok) throw new Error(base.status)

  const identical = clone(base)
  const duplicate = clone(identical.value.assignments[0]!)
  duplicate.assignmentId = 'case:preset-assignment:front-title-text-copy'
  duplicate.slotId = 'case:preset-slot:front-title-text-copy'
  identical.value.assignments.push(duplicate)
  deepFreeze(identical)
  const identicalResult = plan(identical)
  assert.equal(identicalResult.ok, true)
  assert.ok(planned(identicalResult).fieldActions.every(({ sources }) =>
    sources.length === 2))

  const conflicting = clone(base)
  const conflict = clone(conflicting.value.assignments[0]!)
  conflict.assignmentId = 'case:preset-assignment:front-title-text-conflict'
  conflict.slotId = 'case:preset-slot:front-title-text-conflict'
  conflict.contentRegion.centerXPercent = 45
  conflicting.value.assignments.push(conflict)
  deepFreeze(conflicting)
  const conflictResult = plan(conflicting)
  assert.equal(conflictResult.ok, false)
  assert.equal(conflictResult.status, 'conflicting-actions')
  if (conflictResult.status === 'conflicting-actions') {
    assert.equal(conflictResult.blockers[0]?.fieldId, 'layout-x')
    assert.deepEqual(conflictResult.blockers[0]?.proposedValues, [40, 45])
  }
})

test('fails closed for unsupported action regions and Back text fitting under #181', () => {
  const actionRegion = {
    centerXPercent: 50,
    centerYPercent: 50,
    widthPercent: 70,
    heightPercent: 30,
  }
  const result = plan(resolve(
    [{ ...BACK_DESCRIPTION, actionRegion }],
    { kind: 'region', region: 'back-panel' },
  ))

  assert.equal(result.ok, false)
  assert.equal(result.status, 'unsupported-action')
  if (result.status === 'unsupported-action') {
    assert.equal(result.actions[0]?.kind, 'text-fitting-unavailable')
  }
})

test('blocks geometry that would escape the owner-safe basis instead of clamping', () => {
  const result = plan(resolve(
    [{
      ...FRONT_TEXT,
      coordinateBasis: 'front',
      contentRegion: {
        centerXPercent: 3,
        centerYPercent: 50,
        widthPercent: 6,
        heightPercent: 20,
      },
    }],
    { kind: 'region', region: 'front-cover' },
  ))
  assert.equal(result.ok, false)
  assert.equal(result.status, 'blocked')
  if (result.status === 'blocked') {
    assert.equal(result.blockers[0]?.kind, 'geometry-outside-owner-basis')
  }
})

test('rejects stale, mismatched, alias, incompatible, and unsupported operation inputs', () => {
  const resolution = resolve(
    [FRONT_TEXT],
    { kind: 'region', region: 'front-cover' },
    createSnapshot(undefined, 9),
    { alias: 'case.planner.alias' },
  )
  assert.equal(resolution.ok, true)
  if (!resolution.ok) throw new Error(resolution.status)

  const stale = plan(resolution, {
    expected: {
      projectKind: 'caseInsert',
      preset: { ...resolution.value.preset },
      requestedScope: resolution.value.requestedScope,
      snapshotIdentity: {
        ...resolution.value.snapshotIdentity,
        projectRevision: 10,
      },
    },
  })
  assert.equal(stale.status, 'stale-resolution')

  assert.equal(plan(resolution, {
    expected: {
      projectKind: 'caseInsert',
      preset: { id: 'case.planner.alias', revision: 4 },
      requestedScope: resolution.value.requestedScope,
      snapshotIdentity: resolution.value.snapshotIdentity,
    },
  }).status, 'invalid-resolution')

  assert.equal(plan(resolution, {
    expected: {
      projectKind: 'disc',
      preset: { ...resolution.value.preset },
      requestedScope: resolution.value.requestedScope,
      snapshotIdentity: resolution.value.snapshotIdentity,
    },
  }).status, 'invalid-resolution')

  assert.equal(plan(resolution, { operation: 'reapply' }).status,
    'unsupported-operation')
  assert.equal(plan(resolution, { operation: 'detach' }).status,
    'unsupported-operation')
})

test('maps resolver stale and incompatible failures without planning', () => {
  const stale = deepFreeze({
    ok: false,
    status: 'stale-snapshot',
    dimensions: ['session-id'],
  } as const)
  const incompatible = deepFreeze({
    ok: false,
    status: 'incompatible',
    reasons: [{
      code: 'template-id-incompatible',
      path: 'templateId',
      severity: 'error',
    }],
  } as const)
  const expected = {
    projectKind: 'caseInsert',
    preset: { id: 'builtin:case-preset:planner-fixture', revision: 4 },
    requestedScope: { kind: 'region', region: 'front-cover' },
    snapshotIdentity: createSnapshot().identity,
  }

  assert.equal(planCaseInsertPresetFirstApply({
    operation: 'apply',
    resolution: stale,
    expected,
  }).status, 'stale-resolution')
  assert.equal(planCaseInsertPresetFirstApply({
    operation: 'apply',
    resolution: incompatible,
    expected,
  }).status, 'incompatible-resolution')
})

test('returns deeply immutable output without mutating inputs or project owners', () => {
  const project = createBlankJewelCaseSavedProject()
  const before = clone(project)
  const snapshotResult = createCaseInsertPresetAssignmentSnapshot({
    sessionId: 'planner-session',
    projectRevision: 12,
    project: captureNormalizedProjectSnapshot(project),
  })
  assert.equal(snapshotResult.ok, true)
  if (!snapshotResult.ok) throw new Error(snapshotResult.error.code)
  const resolution = resolve(
    [FRONT_TEXT, BACK_DESCRIPTION],
    { kind: 'complete' },
    snapshotResult.value,
  )
  const resolutionBefore = clone(resolution)
  const result = plan(resolution)
  const value = planned(result)

  assert.deepEqual(project, before)
  assert.deepEqual(resolution, resolutionBefore)
  assert.ok(Object.isFrozen(result))
  assert.ok(Object.isFrozen(value))
  assert.ok(Object.isFrozen(value.fieldActions))
  assert.ok(Object.isFrozen(value.fieldActions[0]?.sources))
  assert.ok(Object.isFrozen(value.preservationDecisions))
  assert.equal('project' in value, false)
  assert.equal('currentPath' in value, false)
  assert.equal('baseline' in value, false)
  assert.equal('dirty' in value, false)
})

test('field footprint and commit preconditions are deterministic and sufficient', () => {
  const result = plan(resolve(
    [FRONT_TEXT, LEFT_SPINE_TITLE, RIGHT_SPINE_TITLE],
    { kind: 'complete' },
  ))
  const value = planned(result)

  assert.equal(value.preconditions.sessionId, 'planner-session')
  assert.equal(value.preconditions.projectRevision, 12)
  assert.equal(value.preconditions.template.id, 'jewelCase')
  assert.equal(value.preconditions.template.revision, null)
  assert.equal(value.preconditions.scopeKey, 'complete')
  assert.deepEqual(
    value.fieldFootprint.map(({ fieldId }) => fieldId),
    value.fieldActions.map(({ fieldId }) => fieldId),
  )
  assert.deepEqual(
    value.fieldFootprint.map(({ acceptedValueCandidate }) =>
      acceptedValueCandidate),
    value.fieldActions.map(({ proposedValue }) => proposedValue),
  )
})

test('planner source has no React, DOM, store, renderer, filesystem, Tauri, or commit dependency', () => {
  const source = readFileSync(
    new URL('./caseInsertPresetApplyPlanning.ts', import.meta.url),
    'utf8',
  )

  assert.doesNotMatch(source, /from ['"]react|use[A-Z]|document\.|window\.|HTMLElement/)
  assert.doesNotMatch(source, /App\.tsx|Store|dispatch|setState|React|Tauri|invoke/)
  assert.doesNotMatch(source, /node:fs|filesystem|writeFile|readFile/)
  assert.doesNotMatch(source, /preview|renderer|canvas|devicePixelRatio|pixel/i)
  assert.doesNotMatch(source, /commit|applyCaseInsert|updateProject|mutation/)
})

test('production Case catalog contains only the reviewed starter preset', () => {
  assert.deepEqual(CASE_INSERT_PRESET_CATALOG.list().map(({ id, revision }) => ({
    id,
    revision,
  })), [{
    id: 'builtin:case-preset:jewel-case-essentials',
    revision: 1,
  }])
})
