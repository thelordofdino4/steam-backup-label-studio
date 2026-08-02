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
import type {
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertTextBlock,
  ProjectCaseInsertTextList,
  ProjectJewelCaseState,
} from '../project/projectTypes.ts'
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
  planCaseInsertPresetFirstApply,
  type CaseInsertPresetApplyPlanningResult,
} from './caseInsertPresetApplyPlanning.ts'
import {
  resolveCaseInsertPresetAssignments,
  type CaseInsertPresetAssignmentResolutionResult,
} from './caseInsertPresetAssignmentResolution.ts'
import {
  applyCaseInsertPresetFirstTime,
  createCaseInsertPresetApplyReviewApproval,
  createCaseInsertPresetMaterialConsentAcceptance,
  type CaseInsertPresetApplyTransitionResult,
  type CaseInsertPresetMaterialConsentAcceptance,
} from './caseInsertPresetApplyTransition.ts'
import {
  detectCaseInsertPresetCustomization,
  validateCaseInsertAppliedPresetConfigurationCandidate,
  type CaseInsertAppliedPresetConfiguration,
  type CaseInsertPresetCustomizationDetectionResult,
} from './caseInsertPresetAppliedConfiguration.ts'

type AssignmentSpec = Readonly<{
  suffix: string
  roleId: CaseInsertPresetRoleId
  region: CaseInsertPresetConcreteRegionId
  coordinateBasis: CaseInsertPresetCoordinateBasis
  ownerId: CaseInsertPresetOwnerId
  object: Readonly<{ kind: 'fixed' | 'repeated'; id: string }>
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
const FRONT_BACKGROUND: AssignmentSpec = {
  suffix: 'front-background',
  roleId: 'background-artwork',
  region: 'front-cover',
  coordinateBasis: 'front',
  ownerId: 'case.cover.background',
  object: { kind: 'fixed', id: 'case:cover:background' },
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
const LEFT_TITLE: AssignmentSpec = {
  suffix: 'left-title',
  roleId: 'vertical-game-logo-title',
  region: 'left-spine',
  coordinateBasis: 'leftSpineSafe',
  ownerId: 'case.spine.left.title-text',
  object: { kind: 'fixed', id: 'case:spine:left:text:title' },
}
const RIGHT_TITLE: AssignmentSpec = {
  suffix: 'right-title',
  roleId: 'vertical-game-logo-title',
  region: 'right-spine',
  coordinateBasis: 'rightSpineSafe',
  ownerId: 'case.spine.right.title-text',
  object: { kind: 'fixed', id: 'case:spine:right:text:title' },
}

type TransitionFixture = Readonly<{
  result: Extract<CaseInsertPresetApplyTransitionResult, { ok: true }>
  planningResult: Extract<CaseInsertPresetApplyPlanningResult, { ok: true }>
}>

type ResolvedResult = Extract<
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

function isDeeplyFrozen(value: unknown): boolean {
  if (!value || typeof value !== 'object') return true
  return Object.isFrozen(value) && Object.values(value).every(isDeeplyFrozen)
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
    id: 'builtin:case-preset:configuration-fixture',
    revision: 11,
    name: 'Configuration fixture',
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
        targetPresence: 'required' as const,
        contentRegion: spec.contentRegion ?? defaultRegion(),
      }],
    })),
  }
}

function buildTransition(
  specs: readonly AssignmentSpec[],
  scope: CaseInsertPresetApplicationScope,
  mutate?: (aggregate: ProjectJewelCaseState) => void,
  sourceAggregate?: ProjectJewelCaseState,
  identity: Readonly<{ sessionId: string; projectRevision: number }> = {
    sessionId: 'configuration-session',
    projectRevision: 41,
  },
  transformResolution?: (resolution: ResolvedResult) => ResolvedResult,
): TransitionFixture {
  const project = createBlankJewelCaseSavedProject()
  project.caseInsert = sourceAggregate
    ? structuredClone(sourceAggregate)
    : project.caseInsert
  mutate?.(project.caseInsert)
  project.caseInsert = normalizeProjectJewelCaseState(project.caseInsert)
  const snapshotResult = createCaseInsertPresetAssignmentSnapshot({
    ...identity,
    project: captureNormalizedProjectSnapshot(project),
  })
  assert.equal(snapshotResult.ok, true)
  if (!snapshotResult.ok) throw new Error(snapshotResult.error.code)

  const definition = createDefinition(specs)
  const catalogResult = createCaseInsertPresetCatalog({ builtins: [definition] })
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
  const acceptances = planningResult.plan.materialConsentRequirements.map(
    ({ id }) => createCaseInsertPresetMaterialConsentAcceptance(
      planningResult.plan,
      id,
    ),
  )
  assert.equal(acceptances.every(Boolean), true)
  const result = applyCaseInsertPresetFirstTime({
    planningResult,
    source: {
      projectKind: 'caseInsert',
      aggregate: structuredClone(snapshotResult.value.caseInsert),
      snapshotIdentity: planningResult.plan.source.snapshotIdentity,
      preset: {
        id: planningResult.plan.preset.id,
        revision: planningResult.plan.preset.revision,
      },
      requestedScope: scope,
    },
    attachment: { status: 'unattached' },
    reviewApproval: createCaseInsertPresetApplyReviewApproval(
      planningResult.plan,
    ),
    materialConsentAcceptances:
      acceptances as CaseInsertPresetMaterialConsentAcceptance[],
  })
  assert.equal(result.ok, true)
  if (!result.ok) throw new Error(`${result.status}:${result.code}`)
  return { result, planningResult }
}

function validatedConfiguration(
  result: Extract<CaseInsertPresetApplyTransitionResult, { ok: true }>,
) {
  const validated = validateCaseInsertAppliedPresetConfigurationCandidate(result)
  assert.equal(validated.ok, true)
  if (!validated.ok) throw new Error(`${validated.status}:${validated.code}`)
  return validated.configuration
}

function detect(
  configuration: CaseInsertAppliedPresetConfiguration,
  aggregate: ProjectJewelCaseState,
  current: Partial<{
    projectKind: string
    sessionId: string
    projectRevision: number
    template: Readonly<{ id: string; revision: number | null }>
  }> = {},
) {
  return detectCaseInsertPresetCustomization({
    configuration,
    current: {
      projectKind: current.projectKind ?? 'caseInsert',
      aggregate,
      sessionId: current.sessionId ??
        configuration.source.snapshotIdentity.sessionId,
      projectRevision: current.projectRevision ??
        configuration.source.snapshotIdentity.projectRevision,
      template: current.template ?? configuration.template,
    },
  })
}

function successful(
  result: CaseInsertPresetCustomizationDetectionResult,
) {
  assert.equal(result.ok, true)
  if (!result.ok) throw new Error(`${result.status}:${result.code}`)
  return result
}

type MutableCaseObject =
  | ProjectCaseInsertImageSlot
  | ProjectCaseInsertTextBlock
  | ProjectCaseInsertTextList

function ownerItems(
  aggregate: ProjectJewelCaseState,
  ownerId: CaseInsertPresetOwnerId,
): MutableCaseObject[] {
  const { cover, tray } = aggregate.templates
  const { left, right } = aggregate.spine
  switch (ownerId) {
    case 'case.cover.background': return [cover.background]
    case 'case.cover.title-artwork': return [cover.titleArtwork]
    case 'case.cover.text-blocks': return cover.textBlocks
    case 'case.cover.artwork-slots': return cover.artworkSlots
    case 'case.cover.logo-slots': return cover.logoSlots
    case 'case.cover.mark-slots': return cover.markSlots
    case 'case.tray.background': return [tray.background]
    case 'case.tray.title-artwork': return [tray.titleArtwork]
    case 'case.tray.text-blocks': return tray.textBlocks
    case 'case.tray.text-lists': return tray.textLists
    case 'case.tray.artwork-slots': return tray.artworkSlots
    case 'case.tray.logo-slots': return tray.logoSlots
    case 'case.tray.mark-slots': return tray.markSlots
    case 'case.spine.left.background': return [left.background]
    case 'case.spine.left.title-artwork': return [left.titleArtwork]
    case 'case.spine.left.title-text': return [left.title]
    case 'case.spine.left.text-blocks': return left.textBlocks
    case 'case.spine.left.logo-slots': return left.logoSlots
    case 'case.spine.left.mark-slots': return left.markSlots
    case 'case.spine.right.background': return [right.background]
    case 'case.spine.right.title-artwork': return [right.titleArtwork]
    case 'case.spine.right.title-text': return [right.title]
    case 'case.spine.right.text-blocks': return right.textBlocks
    case 'case.spine.right.logo-slots': return right.logoSlots
    case 'case.spine.right.mark-slots': return right.markSlots
  }
}

function targetFor(
  aggregate: ProjectJewelCaseState,
  configuration: CaseInsertAppliedPresetConfiguration,
  index = 0,
) {
  const address = configuration.ownedFields[index]!.address
  const target = ownerItems(aggregate, address.featureOwnerId).find(
    ({ id }) => id === address.runtimeObjectId,
  )
  assert.ok(target)
  return { address, target }
}

function mutateOwnedValue(
  aggregate: ProjectJewelCaseState,
  configuration: CaseInsertAppliedPresetConfiguration,
  index: number,
  value: number,
) {
  const { address, target } = targetFor(aggregate, configuration, index)
  switch (address.fieldId) {
    case 'layout-x': target.layout.x = value; break
    case 'layout-y': target.layout.y = value; break
    case 'layout-scale': target.layout.scale = value; break
    case 'layout-width': target.layout.width = value; break
  }
}

test('validates a minimal successful Front Apply into the sole detached domain value', () => {
  const { result } = buildTransition(
    [FRONT_TEXT],
    { kind: 'region', region: 'front-cover' },
  )
  const inputBefore = structuredClone(result)
  const configuration = validatedConfiguration(result)
  assert.equal(configuration.kind,
    'sbls/case-insert-applied-preset-configuration')
  assert.equal(configuration.formatVersion, 1)
  assert.equal(configuration.domainStatus, 'validated-authoritative')
  assert.equal(configuration.attachmentStatus, 'detached-uninstalled')
  assert.equal(configuration.firstApply.operation, 'apply')
  assert.equal(configuration.ownedFields.length, 3)
  assert.equal(isDeeplyFrozen(configuration), true)
  assert.deepEqual(result, inputBefore)
  assert.notEqual(configuration, result.configurationCandidate)
  assert.notEqual(
    configuration.ownedFields[0],
    result.configurationCandidate.ownedFields[0],
  )
  assert.equal('path' in configuration, false)
  assert.equal('installed' in configuration, false)
})

test('validates an applied-semantic-no-op candidate with its complete footprint', () => {
  const first = buildTransition(
    [FRONT_TEXT],
    { kind: 'region', region: 'front-cover' },
  )
  const second = buildTransition(
    [FRONT_TEXT],
    { kind: 'region', region: 'front-cover' },
    undefined,
    structuredClone(first.result.aggregate),
  )
  assert.equal(second.result.status, 'applied-semantic-no-op')
  const configuration = validatedConfiguration(second.result)
  assert.equal(configuration.firstApply.transitionStatus,
    'applied-semantic-no-op')
  assert.equal(configuration.ownedFields.length, 3)
  assert.equal(successful(detect(
    configuration,
    structuredClone(second.result.aggregate),
  )).status, 'clean')
})

test('candidate validation fails closed for aggregate mismatch and malformed evidence', () => {
  const fixture = buildTransition(
    [FRONT_TEXT],
    { kind: 'region', region: 'front-cover' },
  )
  const mismatch = structuredClone(fixture.result)
  mismatch.aggregate.templates.cover.textBlocks.find(
    ({ id }) => id === 'cover-title-text',
  )!.layout.x += 1
  const mismatchResult = validateCaseInsertAppliedPresetConfigurationCandidate(
    deepFreeze(mismatch),
  )
  assert.equal(mismatchResult.ok, false)
  if (!mismatchResult.ok) assert.equal(mismatchResult.code,
    'candidate-aggregate-incoherent')

  const duplicate = structuredClone(fixture.result)
  duplicate.configurationCandidate.ownedFields.push(
    structuredClone(duplicate.configurationCandidate.ownedFields[0]!),
  )
  const duplicateResult = validateCaseInsertAppliedPresetConfigurationCandidate(
    deepFreeze(duplicate),
  )
  assert.equal(duplicateResult.ok, false)
  if (!duplicateResult.ok) assert.equal(duplicateResult.code,
    'owned-field-address-duplicate')

  const warning = structuredClone(fixture.result)
  warning.configurationCandidate.reviewedWarningIds.push(
    warning.configurationCandidate.reviewedWarningIds[0] ??
      'case:preset-warning:v1:duplicate',
  )
  warning.configurationCandidate.reviewedWarningIds.push(
    warning.configurationCandidate.reviewedWarningIds.at(-1)!,
  )
  assert.equal(validateCaseInsertAppliedPresetConfigurationCandidate(
    deepFreeze(warning),
  ).ok, false)
})

test('candidate validation distinguishes unsupported version, operation, field, and value', () => {
  const fixture = buildTransition(
    [FRONT_TEXT],
    { kind: 'region', region: 'front-cover' },
  )
  const version = structuredClone(fixture.result) as unknown as Record<string, unknown>
  const versionCandidate = version.configurationCandidate as Record<string, unknown>
  versionCandidate.formatVersion = 2
  const versionResult = validateCaseInsertAppliedPresetConfigurationCandidate(
    deepFreeze(version) as unknown as CaseInsertPresetApplyTransitionResult,
  )
  assert.equal(versionResult.ok, false)
  if (!versionResult.ok) assert.equal(versionResult.status,
    'unsupported-configuration-version')

  for (const [property, value] of [
    ['operation', 'reapply'],
    ['owned-field', 'layout-rotation'],
    ['last-applied-value', Number.NaN],
  ] as const) {
    const malformed = structuredClone(fixture.result) as unknown as Record<string, unknown>
    const candidate = malformed.configurationCandidate as Record<string, unknown>
    if (property === 'operation') candidate.operation = value
    const owned = (candidate.ownedFields as Record<string, unknown>[])[0]!
    if (property === 'owned-field') owned.fieldId = value
    if (property === 'last-applied-value') owned.lastAppliedValue = value
    assert.equal(validateCaseInsertAppliedPresetConfigurationCandidate(
      deepFreeze(malformed) as unknown as CaseInsertPresetApplyTransitionResult,
    ).ok, false)
  }
})

test('configuration identity is deterministic, content-bound, detached, and deeply immutable', () => {
  const first = validatedConfiguration(buildTransition(
    [FRONT_TEXT],
    { kind: 'region', region: 'front-cover' },
  ).result)
  const second = validatedConfiguration(buildTransition(
    [FRONT_TEXT],
    { kind: 'region', region: 'front-cover' },
  ).result)
  assert.equal(first.configurationIdentity, second.configurationIdentity)
  assert.equal(first.configurationIdentity.startsWith(
    'case:preset-applied-configuration:v1:'), true)
  assert.equal(isDeeplyFrozen(first), true)

  const changed = structuredClone(first) as unknown as Record<string, unknown>
  changed.configurationIdentity = 'wrong'
  const detection = detectCaseInsertPresetCustomization({
    configuration: deepFreeze(changed) as unknown as CaseInsertAppliedPresetConfiguration,
    current: {
      projectKind: 'caseInsert',
      aggregate: structuredClone(buildTransition(
        [FRONT_TEXT],
        { kind: 'region', region: 'front-cover' },
      ).result.aggregate),
      sessionId: first.source.snapshotIdentity.sessionId,
      projectRevision: first.source.snapshotIdentity.projectRevision,
      template: first.template,
    },
  })
  assert.equal(detection.ok, false)
  if (!detection.ok) assert.equal(detection.status, 'invalid-configuration')
})

test('initially clean reports compare exact x, y, scale, and width values', () => {
  const fixture = buildTransition(
    [FRONT_TEXT, FRONT_BACKGROUND],
    { kind: 'section', section: 'front' },
  )
  const configuration = validatedConfiguration(fixture.result)
  const report = successful(detect(
    configuration,
    structuredClone(fixture.result.aggregate),
  ))
  assert.equal(report.status, 'clean')
  assert.deepEqual(
    [...new Set(report.fields.map(({ address }) => address.fieldId))].sort(),
    ['layout-scale', 'layout-width', 'layout-x', 'layout-y'],
  )
  assert.equal(report.fields.every(({ fieldStatus }) =>
    fieldStatus === 'unchanged'), true)
})

test('one or multiple exact owned-value differences aggregate as customized', () => {
  const fixture = buildTransition(
    [FRONT_TEXT, FRONT_BACKGROUND],
    { kind: 'section', section: 'front' },
  )
  const configuration = validatedConfiguration(fixture.result)
  const one = structuredClone(fixture.result.aggregate)
  mutateOwnedValue(
    one,
    configuration,
    0,
    configuration.ownedFields[0]!.lastAppliedValue + 0.125,
  )
  const oneReport = successful(detect(
    configuration,
    normalizeProjectJewelCaseState(one),
  ))
  assert.equal(oneReport.status, 'customized')
  assert.equal(oneReport.summary.customizedFieldCount, 1)

  const multiple = structuredClone(one)
  mutateOwnedValue(
    multiple,
    configuration,
    1,
    configuration.ownedFields[1]!.lastAppliedValue + 0.25,
  )
  const multipleReport = successful(detect(
    configuration,
    normalizeProjectJewelCaseState(multiple),
  ))
  assert.equal(multipleReport.summary.customizedFieldCount, 2)
  assert.equal(configuration.ownedFields.length, oneReport.fields.length)
  assert.equal(configuration.ownedFields.length, multipleReport.fields.length)
})

test('exact comparison uses no rounding or epsilon and restoration becomes clean', () => {
  const fixture = buildTransition(
    [FRONT_TEXT],
    { kind: 'region', region: 'front-cover' },
  )
  const configuration = validatedConfiguration(fixture.result)
  const aggregate = structuredClone(fixture.result.aggregate)
  const index = configuration.ownedFields.findIndex(
    ({ address }) => address.fieldId === 'layout-x',
  )
  const exact = configuration.ownedFields[index]!.lastAppliedValue
  const distinct = exact + 0.0000000000001
  assert.notEqual(distinct, exact)
  mutateOwnedValue(aggregate, configuration, index, distinct)
  assert.equal(successful(detect(
    configuration,
    normalizeProjectJewelCaseState(aggregate),
  )).status, 'customized')
  mutateOwnedValue(aggregate, configuration, index, exact)
  assert.equal(successful(detect(
    configuration,
    normalizeProjectJewelCaseState(aggregate),
  )).status, 'clean')

  mutateOwnedValue(aggregate, configuration, index, 157.99999999999997)
  const precision = successful(detect(
    configuration,
    normalizeProjectJewelCaseState(aggregate),
  ))
  assert.equal(precision.status, 'customized')
  assert.equal(precision.fields[index]!.currentValue, 157.99999999999997)
})

test('out-of-footprint layout, text, rich text, source, style, branding, and enablement stay clean', () => {
  const fixture = buildTransition(
    [FRONT_TEXT],
    { kind: 'region', region: 'front-cover' },
  )
  const configuration = validatedConfiguration(fixture.result)
  const aggregate = structuredClone(fixture.result.aggregate)
  const block = aggregate.templates.cover.textBlocks.find(
    ({ id }) => id === 'cover-title-text',
  )!
  block.layout.scale = 1.75
  block.layout.rotation = 17
  block.value = 'Changed outside the layout footprint'
  block.contentMode = 'html'
  block.htmlSource = '<strong>Changed</strong>'
  block.source = 'metadata'
  block.enabled = !block.enabled
  block.style.bold = !block.style.bold
  aggregate.templates.cover.steamBanner.fallbackText = 'Branding changed'
  const report = successful(detect(
    configuration,
    normalizeProjectJewelCaseState(aggregate),
  ))
  assert.equal(report.status, 'clean')
})

test('image bytes, provenance, fit, crop-adjacent state, frame, rotation, and enablement stay outside the footprint', () => {
  const fixture = buildTransition(
    [FRONT_BACKGROUND],
    { kind: 'region', region: 'front-cover' },
  )
  const configuration = validatedConfiguration(fixture.result)
  const aggregate = structuredClone(fixture.result.aggregate)
  const background = aggregate.templates.cover.background
  background.imageDataUrl = 'data:image/png;base64,AAAA'
  background.imageSource = { kind: 'uploaded', label: 'Replacement' }
  background.fit = 'cover'
  background.layout.rotation = 19
  background.frame = 'rounded'
  background.enabled = !background.enabled
  assert.equal(successful(detect(
    configuration,
    normalizeProjectJewelCaseState(aggregate),
  )).status, 'clean')
})

test('disabled targets still compare owned payload fields without owning enablement', () => {
  const fixture = buildTransition(
    [FRONT_TEXT],
    { kind: 'region', region: 'front-cover' },
  )
  const configuration = validatedConfiguration(fixture.result)
  const aggregate = structuredClone(fixture.result.aggregate)
  const { target } = targetFor(aggregate, configuration)
  target.enabled = false
  mutateOwnedValue(
    aggregate,
    configuration,
    0,
    configuration.ownedFields[0]!.lastAppliedValue + 1,
  )
  const report = successful(detect(
    configuration,
    normalizeProjectJewelCaseState(aggregate),
  ))
  assert.equal(report.status, 'customized')
  assert.equal(report.summary.customizedFieldCount, 1)
})

test('fixed synthetic owner addressing remains exact', () => {
  const fixture = buildTransition(
    [FRONT_TEXT, TRAY_BACKGROUND, BACK_DESCRIPTION],
    { kind: 'complete' },
  )
  const configuration = validatedConfiguration(fixture.result)
  assert.equal(configuration.ownedFields.some(({ address }) =>
    address.bindingId === 'case:cover:text:title' &&
    address.runtimeObjectId === 'cover-title-text'), true)
  assert.equal(configuration.ownedFields.some(({ address }) =>
    address.region === 'tray-card' &&
    address.featureOwnerId === 'case.tray.background'), true)
  assert.equal(configuration.ownedFields.some(({ address }) =>
    address.region === 'back-panel' &&
    address.featureOwnerId === 'case.tray.text-blocks'), true)
  assert.equal(successful(detect(
    configuration,
    structuredClone(fixture.result.aggregate),
  )).status, 'clean')
})

test('repeated objects resolve by stable ID and array reorder cannot change the report', () => {
  const repeated: AssignmentSpec = {
    suffix: 'front-artwork-b',
    roleId: 'additional-artwork',
    region: 'front-cover',
    coordinateBasis: 'frontSafe',
    ownerId: 'case.cover.artwork-slots',
    object: { kind: 'repeated', id: 'front-artwork-b' },
  }
  const fixture = buildTransition(
    [repeated],
    { kind: 'region', region: 'front-cover' },
    (aggregate) => {
      aggregate.templates.cover.artworkSlots = [
        createDefaultCaseInsertImageSlot('front-artwork-a', 'A'),
        createDefaultCaseInsertImageSlot('front-artwork-b', 'B'),
      ]
    },
  )
  const configuration = validatedConfiguration(fixture.result)
  const original = successful(detect(
    configuration,
    structuredClone(fixture.result.aggregate),
  ))
  const reordered = structuredClone(fixture.result.aggregate)
  reordered.templates.cover.artworkSlots.reverse()
  const after = successful(detect(
    configuration,
    normalizeProjectJewelCaseState(reordered),
  ))
  assert.equal(after.status, 'clean')
  assert.equal(after.reportIdentity, original.reportIdentity)
  assert.deepEqual(after.fields, original.fields)
})

test('duplicate and missing repeated targets fail as ambiguous or missing with no fallback owner', () => {
  const repeated: AssignmentSpec = {
    suffix: 'front-artwork-target',
    roleId: 'additional-artwork',
    region: 'front-cover',
    coordinateBasis: 'frontSafe',
    ownerId: 'case.cover.artwork-slots',
    object: { kind: 'repeated', id: 'front-artwork-target' },
  }
  const fixture = buildTransition(
    [repeated],
    { kind: 'region', region: 'front-cover' },
    (aggregate) => {
      aggregate.templates.cover.artworkSlots = [
        createDefaultCaseInsertImageSlot('front-artwork-target', 'Target'),
      ]
    },
  )
  const configuration = validatedConfiguration(fixture.result)
  const duplicate = structuredClone(fixture.result.aggregate)
  duplicate.templates.cover.artworkSlots.push(
    structuredClone(duplicate.templates.cover.artworkSlots[0]!),
  )
  const ambiguous = detect(configuration, duplicate)
  assert.equal(ambiguous.ok, false)
  if (!ambiguous.ok) assert.equal(ambiguous.status, 'target-ambiguous')

  const missing = structuredClone(fixture.result.aggregate)
  const target = missing.templates.cover.artworkSlots.shift()!
  missing.templates.tray.artworkSlots.push(target)
  const absent = detect(configuration, normalizeProjectJewelCaseState(missing))
  assert.equal(absent.ok, false)
  if (!absent.ok) assert.equal(absent.status, 'target-missing')
})

test('left and right spines remain independent and mirror mode cannot fan out inspection', () => {
  const fixture = buildTransition(
    [LEFT_TITLE, RIGHT_TITLE],
    { kind: 'section', section: 'spine' },
  )
  const configuration = validatedConfiguration(fixture.result)
  const mirrorOnly = structuredClone(fixture.result.aggregate)
  mirrorOnly.spine.mirrored = !mirrorOnly.spine.mirrored
  assert.equal(successful(detect(
    configuration,
    normalizeProjectJewelCaseState(mirrorOnly),
  )).status, 'clean')

  const leftChanged = structuredClone(mirrorOnly)
  const leftIndex = configuration.ownedFields.findIndex(
    ({ address }) => address.region === 'left-spine',
  )
  mutateOwnedValue(
    leftChanged,
    configuration,
    leftIndex,
    configuration.ownedFields[leftIndex]!.lastAppliedValue + 1,
  )
  const report = successful(detect(
    configuration,
    normalizeProjectJewelCaseState(leftChanged),
  ))
  assert.equal(report.status, 'customized')
  assert.equal(report.fields.some(({ address, fieldStatus }) =>
    address.region === 'right-spine' && fieldStatus === 'value-diverged'), false)
})

test('an opposite-spine object cannot replace a missing exact target', () => {
  const leftLogo: AssignmentSpec = {
    suffix: 'left-logo',
    roleId: 'company-logos',
    region: 'left-spine',
    coordinateBasis: 'leftSpineSafe',
    ownerId: 'case.spine.left.logo-slots',
    object: { kind: 'repeated', id: 'spine-company-logo' },
  }
  const fixture = buildTransition(
    [leftLogo],
    { kind: 'region', region: 'left-spine' },
    (aggregate) => {
      aggregate.spine.left.logoSlots = [
        createDefaultCaseInsertImageSlot('spine-company-logo', 'Company'),
      ]
    },
  )
  const configuration = validatedConfiguration(fixture.result)
  const aggregate = structuredClone(fixture.result.aggregate)
  const target = aggregate.spine.left.logoSlots.shift()!
  aggregate.spine.right.logoSlots.push(target)
  const report = detect(configuration, normalizeProjectJewelCaseState(aggregate))
  assert.equal(report.ok, false)
  if (!report.ok) assert.equal(report.status, 'target-missing')
})

test('multi-region reports preserve complete Tray, Back Panel, and partial customization distinctions', () => {
  const fixture = buildTransition(
    [TRAY_BACKGROUND, BACK_DESCRIPTION, LEFT_TITLE, RIGHT_TITLE],
    { kind: 'complete' },
  )
  const configuration = validatedConfiguration(fixture.result)
  const clean = successful(detect(
    configuration,
    structuredClone(fixture.result.aggregate),
  ))
  assert.equal(clean.status, 'clean')
  assert.equal(clean.fields.some(({ address }) =>
    address.region === 'tray-card'), true)
  assert.equal(clean.fields.some(({ address }) =>
    address.region === 'back-panel'), true)

  const aggregate = structuredClone(fixture.result.aggregate)
  const backIndex = configuration.ownedFields.findIndex(
    ({ address }) => address.region === 'back-panel',
  )
  mutateOwnedValue(
    aggregate,
    configuration,
    backIndex,
    configuration.ownedFields[backIndex]!.lastAppliedValue + 2,
  )
  const customized = successful(detect(
    configuration,
    normalizeProjectJewelCaseState(aggregate),
  ))
  assert.equal(customized.status, 'customized')
  assert.equal(customized.summary.customizedFieldCount, 1)
  assert.equal(customized.fields.filter(({ address }) =>
    address.region === 'tray-card').every(({ fieldStatus }) =>
    fieldStatus === 'unchanged'), true)
})

test('project revision may advance while session and template continuity remain exact', () => {
  const fixture = buildTransition(
    [FRONT_TEXT],
    { kind: 'region', region: 'front-cover' },
  )
  const configuration = validatedConfiguration(fixture.result)
  const report = successful(detect(
    configuration,
    structuredClone(fixture.result.aggregate),
    { projectRevision: configuration.source.snapshotIdentity.projectRevision + 99 },
  ))
  assert.equal(report.status, 'clean')
  assert.equal(report.current.projectRevision,
    configuration.source.snapshotIdentity.projectRevision + 99)
})

test('session, template, revision regression, and project-kind mismatches fail closed', () => {
  const fixture = buildTransition(
    [FRONT_TEXT],
    { kind: 'region', region: 'front-cover' },
  )
  const configuration = validatedConfiguration(fixture.result)
  const aggregate = structuredClone(fixture.result.aggregate)
  for (const current of [
    { sessionId: 'another-session' },
    { template: { id: 'another-template', revision: null } },
    { template: { id: configuration.template.id, revision: 1 } },
    { projectRevision: configuration.source.snapshotIdentity.projectRevision - 1 },
  ]) {
    const report = detect(configuration, aggregate, current)
    assert.equal(report.ok, false)
    if (!report.ok) assert.equal(report.status, 'attachment-context-mismatch')
  }
  const wrongKind = detect(configuration, aggregate, { projectKind: 'disc' })
  assert.equal(wrongKind.ok, false)
  if (!wrongKind.ok) assert.equal(wrongKind.status,
    'incompatible-current-aggregate')
})

test('unsupported configuration versions, malformed configurations, and unsupported fields remain distinct', () => {
  const fixture = buildTransition(
    [FRONT_TEXT],
    { kind: 'region', region: 'front-cover' },
  )
  const configuration = validatedConfiguration(fixture.result)

  const unsupportedVersion = structuredClone(configuration) as unknown as Record<string, unknown>
  unsupportedVersion.formatVersion = 3
  const versionReport = detect(
    deepFreeze(unsupportedVersion) as unknown as CaseInsertAppliedPresetConfiguration,
    structuredClone(fixture.result.aggregate),
  )
  assert.equal(versionReport.ok, false)
  if (!versionReport.ok) assert.equal(versionReport.status,
    'unsupported-configuration-version')

  const malformed = structuredClone(configuration) as unknown as Record<string, unknown>
  malformed.configurationIdentity = 'malformed'
  const malformedReport = detect(
    deepFreeze(malformed) as unknown as CaseInsertAppliedPresetConfiguration,
    structuredClone(fixture.result.aggregate),
  )
  assert.equal(malformedReport.ok, false)
  if (!malformedReport.ok) assert.equal(malformedReport.status,
    'invalid-configuration')

  const unsupportedField = structuredClone(configuration) as unknown as Record<string, unknown>
  const fields = unsupportedField.ownedFields as Record<string, unknown>[]
  const address = fields[0]!.address as Record<string, unknown>
  address.fieldId = 'layout-rotation'
  const fieldReport = detect(
    deepFreeze(unsupportedField) as unknown as CaseInsertAppliedPresetConfiguration,
    structuredClone(fixture.result.aggregate),
  )
  assert.equal(fieldReport.ok, false)
  if (!fieldReport.ok) assert.equal(fieldReport.status,
    'unsupported-owned-field')
})

test('invalid current semantic values are not mislabeled as customization', () => {
  const fixture = buildTransition(
    [FRONT_TEXT],
    { kind: 'region', region: 'front-cover' },
  )
  const configuration = validatedConfiguration(fixture.result)
  const aggregate = structuredClone(fixture.result.aggregate)
  const index = configuration.ownedFields.findIndex(
    ({ address }) => address.fieldId === 'layout-x',
  )
  mutateOwnedValue(aggregate, configuration, index, Number.NaN)
  const report = detect(configuration, aggregate)
  assert.equal(report.ok, false)
  if (!report.ok) assert.equal(report.status, 'invalid-current-value')
})

test('coalesced provenance and deterministic field order survive validation and reports', () => {
  const fixture = buildTransition(
    [FRONT_TEXT],
    { kind: 'region', region: 'front-cover' },
    undefined,
    undefined,
    undefined,
    (resolution) => {
      const duplicate = structuredClone(resolution)
      const mutable = duplicate as unknown as {
        value: {
          assignments: Array<ResolvedResult['value']['assignments'][number] & {
            assignmentId: `case:preset-assignment:${string}`
            slotId: `case:preset-slot:${string}`
          }>
        }
      }
      const source = structuredClone(mutable.value.assignments[0]!)
      source.assignmentId =
        'case:preset-assignment:front-title-second-source'
      source.slotId = 'case:preset-slot:front-title-second-source'
      mutable.value.assignments.push(source)
      return deepFreeze(duplicate)
    },
  )
  const configuration = validatedConfiguration(fixture.result)
  assert.equal(configuration.ownedFields.every(({ sources }) =>
    sources.length === 2), true)
  assert.deepEqual(
    configuration.ownedFields[0]!.sources.map(({ assignmentId }) => assignmentId),
    [
      'case:preset-assignment:front-title-second-source',
      'case:preset-assignment:front-title-text',
    ],
  )
  const report = successful(detect(
    configuration,
    structuredClone(fixture.result.aggregate),
  ))
  assert.equal(report.fields.every(({ sources }) => sources.length === 2), true)
  assert.equal(report.reportIdentity.startsWith(
    'case:preset-customization-report:v1:'), true)
})

test('configuration and report outputs expose no mutable aliases and mutate no inputs', () => {
  const fixture = buildTransition(
    [FRONT_TEXT],
    { kind: 'region', region: 'front-cover' },
  )
  const transitionBefore = structuredClone(fixture.result)
  const configuration = validatedConfiguration(fixture.result)
  const aggregate = structuredClone(fixture.result.aggregate)
  const aggregateBefore = structuredClone(aggregate)
  const report = successful(detect(configuration, aggregate))
  assert.deepEqual(fixture.result, transitionBefore)
  assert.deepEqual(aggregate, aggregateBefore)
  assert.equal(isDeeplyFrozen(configuration), true)
  assert.equal(isDeeplyFrozen(report), true)
  assert.notEqual(report.fields[0]!.address,
    configuration.ownedFields[0]!.address)
  assert.notEqual(report.fields[0]!.sources,
    configuration.ownedFields[0]!.sources)
  assert.equal(report.fields.length, configuration.ownedFields.length)
})

test('detector is catalog-independent and production Case catalog remains empty', () => {
  const fixture = buildTransition(
    [FRONT_TEXT],
    { kind: 'region', region: 'front-cover' },
  )
  const configuration = validatedConfiguration(fixture.result)
  assert.deepEqual(CASE_INSERT_PRESET_CATALOG.list(), [])
  assert.equal(successful(detect(
    configuration,
    structuredClone(fixture.result.aggregate),
  )).status, 'clean')
})

test('pure domain has no resolver, planner, catalog, renderer, runtime, store, filesystem, or UI execution dependency', () => {
  const source = readFileSync(
    new URL('./caseInsertPresetAppliedConfiguration.ts', import.meta.url),
    'utf8',
  )
  assert.equal(source.includes('caseInsertPresetCatalog'), false)
  assert.equal(source.includes('caseInsertPresetAssignmentResolution'), false)
  assert.equal(source.includes('resolveCaseInsertPresetAssignments('), false)
  assert.equal(source.includes('planCaseInsertPresetFirstApply('), false)
  assert.equal(source.includes('react'), false)
  assert.equal(source.includes('tauri'), false)
  assert.equal(source.includes('renderer'), false)
  assert.equal(source.includes('filesystem'), false)
  assert.equal(source.includes('JSON.stringify'), false)
  assert.equal(source.includes('Date.now'), false)
  assert.equal(source.includes('randomUUID'), false)
})
