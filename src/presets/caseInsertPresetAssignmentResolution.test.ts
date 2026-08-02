import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { createDefaultCaseInsertImageSlot } from '../caseInsert/defaults.ts'
import {
  createCaseInsertPresetAssignmentSnapshot,
} from '../caseInsert/presetAssignmentSnapshot.ts'
import { captureNormalizedProjectSnapshot } from '../lifecycle/canonicalProject.ts'
import { createBlankDiscSavedProject } from '../project/blankDiscProject.ts'
import { createBlankJewelCaseSavedProject } from '../project/caseInsertProjectAdapters.ts'
import {
  createEmbeddedProjectImageAssetProvenance,
} from '../project/projectAssetStatus.ts'
import type {
  ProjectJewelCaseState,
} from '../project/projectTypes.ts'
import {
  createCaseInsertPresetCatalog,
  type CaseInsertPresetCatalog,
} from './caseInsertPresetCatalog.ts'
import {
  resolveCaseInsertPresetAssignments,
  type ResolveCaseInsertPresetAssignmentsInput,
} from './caseInsertPresetAssignmentResolution.ts'
import type { CaseInsertPresetDefinitionV1 } from './caseInsertPresetDefinition.ts'
import {
  cloneFixture,
  createCoordinatedCaseInsertPresetDefinition,
  createMinimalCaseInsertPresetDefinition,
} from './caseInsertPresetTestFixtures.ts'

type MutableRecord = Record<string, unknown>

function slotsOf(definition: MutableRecord) {
  return definition.slots as MutableRecord[]
}

function assignmentsOf(slot: MutableRecord) {
  return slot.assignments as MutableRecord[]
}

function createRepeatedDefinition(
  targetPresence: 'required' | 'optional' = 'required',
) {
  const definition = createMinimalCaseInsertPresetDefinition()
  const slot = slotsOf(definition)[0]!
  slot.id = 'case:preset-slot:cover-artwork'
  slot.roleId = 'additional-artwork'
  const assignment = assignmentsOf(slot)[0]!
  assignment.id = 'case:preset-assignment:cover-artwork'
  assignment.ownerId = 'case.cover.artwork-slots'
  assignment.object = { kind: 'repeated', id: 'cover-artwork-1' }
  assignment.targetPresence = targetPresence
  return definition
}

function createSnapshot(
  mutate?: (caseInsert: ProjectJewelCaseState) => void,
  projectRevision = 7,
) {
  const project = createBlankJewelCaseSavedProject()
  mutate?.(project.caseInsert)
  const captured = captureNormalizedProjectSnapshot(project)
  const result = createCaseInsertPresetAssignmentSnapshot({
    sessionId: 'case-session',
    projectRevision,
    project: captured,
  })
  assert.equal(result.ok, true)
  if (!result.ok) throw new Error(result.error.code)
  return result.value
}

function createCatalog(definition: unknown, alias?: string) {
  const created = createCaseInsertPresetCatalog({
    builtins: [definition],
    aliases: alias
      ? [{
          alias,
          canonicalId: 'builtin:case-preset:minimal-cover',
        }]
      : [],
  })
  assert.equal(created.ok, true)
  if (!created.ok) throw new Error(created.error.code)
  return created.catalog
}

function resolve(
  definition: MutableRecord,
  requestedScope: unknown,
  snapshot = createSnapshot(),
  overrides: Partial<ResolveCaseInsertPresetAssignmentsInput> = {},
) {
  return resolveCaseInsertPresetAssignments({
    catalog: createCatalog(definition),
    reference: {
      id: definition.id as string,
      revision: definition.revision as number,
    },
    requestedScope,
    snapshot,
    expectedSnapshotIdentity: snapshot.identity,
    ...overrides,
  })
}

function getResolved(
  result: ReturnType<typeof resolveCaseInsertPresetAssignments>,
) {
  assert.equal(result.ok, true)
  if (!result.ok) throw new Error(result.status)
  return result.value
}

test('snapshot capture detaches and deeply freezes one normalized Case aggregate', () => {
  const project = createBlankJewelCaseSavedProject()
  const snapshot = createSnapshot()
  const originalX = snapshot.caseInsert.templates.cover.background.layout.x

  project.caseInsert.templates.cover.background.layout.x = originalX + 10

  assert.equal(
    snapshot.caseInsert.templates.cover.background.layout.x,
    originalX,
  )
  assert.equal('title' in snapshot, false)
  assert.equal('currentPath' in snapshot, false)
  assert.ok(Object.isFrozen(snapshot))
  assert.ok(Object.isFrozen(snapshot.identity))
  assert.ok(Object.isFrozen(snapshot.caseInsert))
  assert.ok(Object.isFrozen(snapshot.caseInsert.templates.cover.background))
})

test('resolves a minimal Front assignment to its fixed synthetic object', () => {
  const result = resolve(
    createMinimalCaseInsertPresetDefinition(),
    { kind: 'region', region: 'front-cover' },
  )
  const value = getResolved(result)

  assert.equal(result.status, 'resolved')
  assert.deepEqual(value.resolvedRegions, ['front-cover'])
  assert.equal(value.assignments.length, 1)
  assert.deepEqual(value.assignments[0]?.object, {
    kind: 'fixed',
    id: 'case:cover:background',
  })
  assert.equal(value.assignments[0]?.ownerId, 'case.cover.background')
  assert.equal(value.assignments[0]?.bindingStatus, 'resolved')
  assert.equal(value.assignments[0]?.currentState?.id, 'cover-background')
})

test('expands Front, Back, Spine, complete, and every concrete scope exactly', () => {
  const definition = createCoordinatedCaseInsertPresetDefinition()
  const expectations = [
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
    ...[
      'front-cover',
      'tray-card',
      'back-panel',
      'left-spine',
      'right-spine',
    ].map((region) => [
      { kind: 'region', region },
      [region],
    ]),
  ] as const

  for (const [scope, expectedRegions] of expectations) {
    const value = getResolved(resolve(definition, scope))
    assert.deepEqual(value.resolvedRegions, expectedRegions)
    assert.deepEqual(
      [...new Set(value.assignments.map(({ region }) => region))],
      expectedRegions,
    )
  }
})

test('keeps complete Tray and Back Panel assignments physically distinct', () => {
  const value = getResolved(resolve(
    createCoordinatedCaseInsertPresetDefinition(),
    { kind: 'section', section: 'back' },
  ))
  const tray = value.assignments.find(({ region }) => region === 'tray-card')
  const panel = value.assignments.find(({ region }) => region === 'back-panel')

  assert.equal(tray?.coordinateBasis, 'back')
  assert.equal(tray?.ownerId, 'case.tray.background')
  assert.equal(panel?.coordinateBasis, 'backPanelSafe')
  assert.equal(panel?.ownerId, 'case.tray.text-blocks')
})

test('keeps Left and Right Spine independent regardless of mirror mode', () => {
  const definition = createCoordinatedCaseInsertPresetDefinition()
  const mirrored = getResolved(resolve(
    definition,
    { kind: 'section', section: 'spine' },
    createSnapshot(({ spine }) => { spine.mirrored = true }),
  ))
  const independent = getResolved(resolve(
    definition,
    { kind: 'section', section: 'spine' },
    createSnapshot(({ spine }) => { spine.mirrored = false }),
  ))

  const identity = (value: typeof mirrored) => value.assignments.map(
    ({ region, ownerId, object }) => ({ region, ownerId, object }),
  )
  assert.deepEqual(identity(mirrored), identity(independent))
  assert.deepEqual(mirrored.resolvedRegions, ['left-spine', 'right-spine'])
  assert.equal(mirrored.assignments.some(({ region }) => region === 'spine'), false)
})

test('binds repeated objects only by stable ID and ignores array order', () => {
  const definition = createRepeatedDefinition()
  const firstSlot = createDefaultCaseInsertImageSlot(
    'cover-artwork-1',
    'Renamed target',
    { enabled: true },
  )
  const otherSlot = createDefaultCaseInsertImageSlot(
    'cover-artwork-2',
    'First visible item',
    { enabled: true },
  )
  const first = createSnapshot(({ templates }) => {
    templates.cover.additionalArtworkEnabled = true
    templates.cover.artworkSlots = [firstSlot, otherSlot]
  })
  const reordered = createSnapshot(({ templates }) => {
    templates.cover.additionalArtworkEnabled = true
    templates.cover.artworkSlots = [otherSlot, firstSlot]
  })

  const firstResolution = getResolved(resolve(
    definition,
    { kind: 'region', region: 'front-cover' },
    first,
  ))
  const reorderedResolution = getResolved(resolve(
    definition,
    { kind: 'region', region: 'front-cover' },
    reordered,
  ))

  assert.deepEqual(
    {
      preset: reorderedResolution.preset,
      requestedScope: reorderedResolution.requestedScope,
      resolvedRegions: reorderedResolution.resolvedRegions,
      assignments: reorderedResolution.assignments,
      compatibilityStatus: reorderedResolution.compatibilityStatus,
      compatibilityReasons: reorderedResolution.compatibilityReasons,
    },
    {
      preset: firstResolution.preset,
      requestedScope: firstResolution.requestedScope,
      resolvedRegions: firstResolution.resolvedRegions,
      assignments: firstResolution.assignments,
      compatibilityStatus: firstResolution.compatibilityStatus,
      compatibilityReasons: firstResolution.compatibilityReasons,
    },
  )
  assert.notEqual(
    reorderedResolution.snapshotIdentity.aggregateContentIdentity,
    firstResolution.snapshotIdentity.aggregateContentIdentity,
  )
  assert.equal(firstResolution.assignments[0]?.currentState?.id, 'cover-artwork-1')
  assert.equal(firstResolution.assignments[0]?.currentState?.label, 'Renamed target')
})

test('fails closed when a repeated stable ID is ambiguous', () => {
  const snapshot = createSnapshot(({ templates }) => {
    templates.cover.additionalArtworkEnabled = true
    templates.cover.artworkSlots = [
      createDefaultCaseInsertImageSlot('cover-artwork-1', 'One'),
      createDefaultCaseInsertImageSlot('cover-artwork-1', 'Duplicate'),
    ]
  })
  const result = resolve(
    createRepeatedDefinition(),
    { kind: 'region', region: 'front-cover' },
    snapshot,
  )

  assert.equal(result.ok, false)
  assert.equal(result.status, 'ambiguous-binding')
  if (result.status === 'ambiguous-binding') {
    assert.equal(result.error.objectId, 'cover-artwork-1')
    assert.equal(result.error.matches, 2)
  }
})

test('distinguishes missing optional and required targets', () => {
  const optional = resolve(
    createRepeatedDefinition('optional'),
    { kind: 'region', region: 'front-cover' },
  )
  const required = resolve(
    createRepeatedDefinition('required'),
    { kind: 'region', region: 'front-cover' },
  )

  assert.equal(optional.ok, true)
  assert.equal(optional.status, 'resolved-with-missing-targets')
  assert.equal(
    optional.ok ? optional.value.assignments[0]?.bindingStatus : null,
    'missing-optional',
  )
  assert.equal(required.ok, true)
  assert.equal(required.status, 'resolved-with-missing-targets')
  assert.equal(
    required.ok ? required.value.assignments[0]?.bindingStatus : null,
    'missing-required',
  )
})

test('distinguishes preserved disabled payload from an absent object', () => {
  const snapshot = createSnapshot(({ templates }) => {
    const slot = createDefaultCaseInsertImageSlot(
      'cover-artwork-1',
      'Dormant payload',
      { enabled: true },
    )
    slot.imageDataUrl = 'data:image/png;base64,AA=='
    slot.imageSource = createEmbeddedProjectImageAssetProvenance(slot.label)
    templates.cover.additionalArtworkEnabled = false
    templates.cover.artworkSlots = [slot]
  })
  const disabled = resolve(
    createRepeatedDefinition('optional'),
    { kind: 'region', region: 'front-cover' },
    snapshot,
  )
  const missing = resolve(
    createRepeatedDefinition('optional'),
    { kind: 'region', region: 'front-cover' },
  )

  assert.equal(
    disabled.ok ? disabled.value.assignments[0]?.bindingStatus : null,
    'resolved-disabled',
  )
  assert.equal(
    disabled.ok ? disabled.value.assignments[0]?.currentState?.imageDataUrl : null,
    'data:image/png;base64,AA==',
  )
  assert.deepEqual(
    disabled.ok ? disabled.value.assignments[0]?.enablement : null,
    {
      objectEnabled: true,
      ownerEnabled: false,
      effectiveEnabled: false,
    },
  )
  assert.equal(
    missing.ok ? missing.value.assignments[0]?.bindingStatus : null,
    'missing-optional',
  )
})

test('rejects invalid, unsupported, and assignment-empty scope requests', () => {
  const definition = createMinimalCaseInsertPresetDefinition()
  const invalid = resolve(definition, { kind: 'region', region: 'spine' })
  const unsupported = resolve(definition, { kind: 'section', section: 'back' })
  const noDeclaredAssignments = resolve(
    definition,
    { kind: 'region', region: 'right-spine' },
  )

  assert.equal(invalid.status, 'invalid-scope')
  assert.equal(
    invalid.status === 'invalid-scope' ? invalid.error.code : null,
    'scope-invalid',
  )
  assert.equal(unsupported.status, 'invalid-scope')
  assert.equal(
    unsupported.status === 'invalid-scope' ? unsupported.error.code : null,
    'scope-unsupported',
  )
  assert.equal(noDeclaredAssignments.status, 'invalid-scope')
})

test('reports wrong project kind, definition, template, and revisions distinctly', () => {
  const wrongKindProject = createBlankDiscSavedProject()
  const wrongKindSnapshot = createCaseInsertPresetAssignmentSnapshot({
    sessionId: 'wrong-kind',
    projectRevision: 0,
    project: captureNormalizedProjectSnapshot(wrongKindProject),
  })
  assert.equal(wrongKindSnapshot.ok, false)
  if (!wrongKindSnapshot.ok) {
    assert.equal(wrongKindSnapshot.error.code, 'unsupported-project-kind')
  }

  const unsupportedTemplateProject = createBlankJewelCaseSavedProject()
  ;(unsupportedTemplateProject.template as { variant: string }).variant =
    'dvdAmaray'
  ;(unsupportedTemplateProject.caseInsert as { templateType: string })
    .templateType = 'dvdAmaray'
  const unsupportedTemplateSnapshot = createCaseInsertPresetAssignmentSnapshot({
    sessionId: 'unsupported-template',
    projectRevision: 0,
    project: captureNormalizedProjectSnapshot(unsupportedTemplateProject),
  })
  assert.equal(unsupportedTemplateSnapshot.ok, false)
  if (!unsupportedTemplateSnapshot.ok) {
    assert.equal(
      unsupportedTemplateSnapshot.error.code,
      'unsupported-template',
    )
  }

  const definition = createMinimalCaseInsertPresetDefinition()
  definition.compatibility = {
    mode: 'specific-template',
    templateId: 'futureCase',
  }
  const incompatible = resolve(
    definition,
    { kind: 'region', region: 'front-cover' },
  )
  assert.equal(incompatible.status, 'incompatible')

  const validDefinition = createMinimalCaseInsertPresetDefinition()
  const snapshot = createSnapshot()
  const wrongPresetRevision = resolveCaseInsertPresetAssignments({
    catalog: createCatalog(validDefinition),
    reference: {
      id: validDefinition.id as string,
      revision: 99,
    },
    requestedScope: { kind: 'region', region: 'front-cover' },
    snapshot,
    expectedSnapshotIdentity: snapshot.identity,
  })
  assert.equal(wrongPresetRevision.status, 'invalid-reference')

  const staleProjectRevision = resolve(
    validDefinition,
    { kind: 'region', region: 'front-cover' },
    snapshot,
    {
      expectedSnapshotIdentity: {
        ...snapshot.identity,
        projectRevision: snapshot.identity.projectRevision + 1,
      },
    },
  )
  assert.equal(staleProjectRevision.status, 'stale-snapshot')
  if (staleProjectRevision.status === 'stale-snapshot') {
    assert.deepEqual(staleProjectRevision.dimensions, ['project-revision'])
  }

  const staleTemplate = resolve(
    validDefinition,
    { kind: 'region', region: 'front-cover' },
    snapshot,
    {
      expectedSnapshotIdentity: {
        ...snapshot.identity,
        template: { id: 'futureCase', revision: null },
      },
    },
  )
  assert.equal(staleTemplate.status, 'stale-snapshot')
  if (staleTemplate.status === 'stale-snapshot') {
    assert.deepEqual(staleTemplate.dimensions, ['template-id'])
  }
})

test('returns invalid-definition when a catalog violates its canonical contract', () => {
  const malformed = createMinimalCaseInsertPresetDefinition()
  assignmentsOf(slotsOf(malformed)[0]!)[0]!.ownerId = 'case.cover.unknown'
  const catalog: CaseInsertPresetCatalog = {
    getExact: () => null,
    getLatest: () => null,
    list: () => [],
    resolve: () => ({
      ok: true,
      value: {
        canonicalReference: {
          id: 'builtin:case-preset:minimal-cover',
          revision: 1,
        },
        definition: malformed as unknown as CaseInsertPresetDefinitionV1,
        source: 'builtin',
        matchedAlias: null,
      },
    }),
  }
  const snapshot = createSnapshot()
  const result = resolveCaseInsertPresetAssignments({
    catalog,
    reference: {
      id: 'builtin:case-preset:minimal-cover',
      revision: 1,
    },
    requestedScope: { kind: 'region', region: 'front-cover' },
    snapshot,
    expectedSnapshotIdentity: snapshot.identity,
  })

  assert.equal(result.status, 'invalid-definition')
})

test('canonicalizes alias lookup output and never returns the alias identity', () => {
  const definition = createMinimalCaseInsertPresetDefinition()
  const catalog = createCatalog(definition, 'classic-case-cover')
  const snapshot = createSnapshot()
  const result = resolveCaseInsertPresetAssignments({
    catalog,
    reference: { id: 'classic-case-cover', revision: 1 },
    requestedScope: { kind: 'region', region: 'front-cover' },
    snapshot,
    expectedSnapshotIdentity: snapshot.identity,
  })
  const value = getResolved(result)

  assert.equal(value.preset.id, 'builtin:case-preset:minimal-cover')
  assert.equal(
    JSON.stringify(value).includes('classic-case-cover'),
    false,
  )
})

test('resolution is deterministic, immutable, and mutation-free', () => {
  const definition = createCoordinatedCaseInsertPresetDefinition()
  const snapshot = createSnapshot()
  const definitionBefore = cloneFixture(definition)
  const snapshotBefore = cloneFixture(snapshot)
  const first = resolve(definition, { kind: 'complete' }, snapshot)
  const second = resolve(definition, { kind: 'complete' }, snapshot)
  const value = getResolved(first)

  assert.deepEqual(second, first)
  assert.deepEqual(definition, definitionBefore)
  assert.deepEqual(snapshot, snapshotBefore)
  assert.ok(Object.isFrozen(first))
  assert.ok(Object.isFrozen(value))
  assert.ok(Object.isFrozen(value.assignments))
  assert.ok(value.assignments.every(Object.isFrozen))
  assert.ok(value.assignments.every(({ object }) => Object.isFrozen(object)))
  assert.ok(value.assignments.every(({ currentState }) =>
    currentState === null || Object.isFrozen(currentState)))
  assert.deepEqual(
    value.assignments.map(({ region }) => region),
    [
      'front-cover',
      'tray-card',
      'back-panel',
      'left-spine',
      'right-spine',
    ],
  )
})

test('pure resolver has no planner, mutation, React, renderer, DOM, or store dependency', () => {
  const resolutionSource = readFileSync(
    new URL('./caseInsertPresetAssignmentResolution.ts', import.meta.url),
    'utf8',
  )
  const snapshotSource = readFileSync(
    new URL('../caseInsert/presetAssignmentSnapshot.ts', import.meta.url),
    'utf8',
  )
  const combined = `${resolutionSource}\n${snapshotSource}`

  assert.doesNotMatch(
    combined,
    /React|App\.tsx|components|document\.|window\.|setState|dispatch|renderer|exportCaseInsert|planner|updateProject|restoreProject|fetch\(|localStorage|sessionStorage|@tauri-apps|node:fs/i,
  )
})
