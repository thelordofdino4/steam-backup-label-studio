import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createApplicationLifecycleCompositionRoot,
} from '../../lifecycle/applicationLifecycleCompositionRoot.ts'
import {
  createNewProjectSession,
  selectIsActiveProjectDirty,
} from '../../lifecycle/projectSession.ts'
import {
  createBlankJewelCaseSavedProject,
} from '../../project/caseInsertProjectAdapters.ts'
import {
  getJewelCaseTemplateRegion,
  type JewelCaseRegionId,
} from '../../templates/caseInsertTemplates.ts'
import {
  CASE_INSERT_PRESET_CATALOG,
} from '../caseInsertPresetCatalog.ts'
import {
  evaluateCaseInsertPresetCompatibility,
  type CaseInsertPresetCompatibilityContext,
} from '../caseInsertPresetCompatibility.ts'
import {
  CASE_INSERT_PRESET_CONCRETE_REGION_IDS,
  CASE_INSERT_PRESET_COORDINATE_BASES_BY_REGION,
  CASE_INSERT_PRESET_OWNER_IDS,
  getCaseInsertPresetApplicationScopeKey,
  isCaseInsertPresetCoordinateBasisAllowed,
  parseCaseInsertPresetDefinition,
  type CaseInsertPresetAssignmentDefinitionV1,
} from '../caseInsertPresetDefinition.ts'
import {
  JEWEL_CASE_ESSENTIALS_CASE_PRESET,
  JEWEL_CASE_ESSENTIALS_CASE_PRESET_ID,
  JEWEL_CASE_ESSENTIALS_CASE_PRESET_REVISION,
} from './jewelCaseEssentialsCasePreset.ts'

type Rect = Readonly<{
  surface: 'front' | 'back'
  left: number
  top: number
  right: number
  bottom: number
}>

const BACKGROUND_ASSIGNMENT_IDS = new Set([
  'case:preset-assignment:front-background',
  'case:preset-assignment:tray-background',
  'case:preset-assignment:left-spine-background',
  'case:preset-assignment:right-spine-background',
])

function assignments() {
  return JEWEL_CASE_ESSENTIALS_CASE_PRESET.slots.flatMap(
    ({ roleId, assignments }) => assignments.map((assignment) => ({
      roleId,
      ...assignment,
    })),
  )
}

function assertDeeplyFrozen(value: unknown, seen = new Set<unknown>()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return
  seen.add(value)
  assert.ok(Object.isFrozen(value))
  for (const nested of Object.values(value)) {
    assertDeeplyFrozen(nested, seen)
  }
}

function compatibilityContext(
  overrides: Partial<CaseInsertPresetCompatibilityContext> = {},
): CaseInsertPresetCompatibilityContext {
  return {
    projectKind: 'caseInsert',
    templateId: 'jewelCase',
    templateCapabilities: CASE_INSERT_PRESET_CONCRETE_REGION_IDS.map(
      (region) => ({
        region,
        coordinateBases: CASE_INSERT_PRESET_COORDINATE_BASES_BY_REGION[region],
      }),
    ),
    ownerCapabilities: CASE_INSERT_PRESET_OWNER_IDS.map((ownerId) => ({
      ownerId,
      repeatedObjectIds: ownerId === 'case.tray.artwork-slots'
        ? ['tray-artwork-1', 'tray-artwork-2', 'tray-artwork-3']
        : [],
    })),
    requestedScope: { kind: 'complete' },
    ...overrides,
  }
}

function toPhysicalRect(
  assignment: CaseInsertPresetAssignmentDefinitionV1,
): Rect {
  const basis = getJewelCaseTemplateRegion(
    assignment.coordinateBasis as JewelCaseRegionId,
  )
  assert.ok(basis)
  const { bounds } = basis
  const { contentRegion } = assignment
  const width = bounds.widthMm * contentRegion.widthPercent / 100
  const height = bounds.heightMm * contentRegion.heightPercent / 100
  const centerX = bounds.xMm +
    bounds.widthMm * contentRegion.centerXPercent / 100
  const centerY = bounds.yMm +
    bounds.heightMm * contentRegion.centerYPercent / 100
  return {
    surface: basis.surfaceId as 'front' | 'back',
    left: centerX - width / 2,
    top: centerY - height / 2,
    right: centerX + width / 2,
    bottom: centerY + height / 2,
  }
}

function positiveOverlap(left: Rect, right: Rect) {
  if (left.surface !== right.surface) return false
  return Math.min(left.right, right.right) - Math.max(left.left, right.left) > 0 &&
    Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top) > 0
}

test('defines the exact strict, immutable Jewel Case Essentials identity and scopes', () => {
  const parsed = parseCaseInsertPresetDefinition(
    JEWEL_CASE_ESSENTIALS_CASE_PRESET,
  )
  assert.equal(parsed.ok, true)
  assert.equal(JEWEL_CASE_ESSENTIALS_CASE_PRESET.id,
    JEWEL_CASE_ESSENTIALS_CASE_PRESET_ID)
  assert.equal(JEWEL_CASE_ESSENTIALS_CASE_PRESET.revision,
    JEWEL_CASE_ESSENTIALS_CASE_PRESET_REVISION)
  assert.equal(JEWEL_CASE_ESSENTIALS_CASE_PRESET.name,
    'Jewel Case Essentials')
  assert.equal(JEWEL_CASE_ESSENTIALS_CASE_PRESET.surface, 'case-insert')
  assert.deepEqual(JEWEL_CASE_ESSENTIALS_CASE_PRESET.compatibility, {
    mode: 'specific-template',
    templateId: 'jewelCase',
  })
  assert.deepEqual(
    JEWEL_CASE_ESSENTIALS_CASE_PRESET.applicationScopes.map(
      getCaseInsertPresetApplicationScopeKey,
    ),
    [
      'region:front-cover',
      'region:tray-card',
      'region:back-panel',
      'region:left-spine',
      'region:right-spine',
      'section:front',
      'section:back',
      'section:spine',
      'complete',
    ],
  )
  assert.equal(JEWEL_CASE_ESSENTIALS_CASE_PRESET.slots.length, 10)
  assert.equal(assignments().length, 15)
  assertDeeplyFrozen(JEWEL_CASE_ESSENTIALS_CASE_PRESET)
})

test('uses only the reviewed role, owner, object, basis, placement, and presence table', () => {
  assert.deepEqual(assignments().map((assignment) => ({
    id: assignment.id,
    region: assignment.region,
    role: assignment.roleId,
    owner: assignment.ownerId,
    object: `${assignment.object.kind}:${assignment.object.id}`,
    basis: assignment.coordinateBasis,
    placement: [
      assignment.contentRegion.centerXPercent,
      assignment.contentRegion.centerYPercent,
      assignment.contentRegion.widthPercent,
      assignment.contentRegion.heightPercent,
    ],
    presence: assignment.targetPresence,
  })), [
    { id: 'case:preset-assignment:back-description', region: 'back-panel', role: 'game-description-text', owner: 'case.tray.text-blocks', object: 'fixed:case:tray:text:description', basis: 'backPanelSafe', placement: [30, 18, 50, 24], presence: 'required' },
    { id: 'case:preset-assignment:back-feature-bullets', region: 'back-panel', role: 'feature-bullets-callouts', owner: 'case.tray.text-lists', object: 'fixed:case:tray:text-list:feature-bullets', basis: 'backPanelSafe', placement: [78, 18, 34, 24], presence: 'required' },
    { id: 'case:preset-assignment:back-legal', region: 'back-panel', role: 'legal-info', owner: 'case.tray.text-blocks', object: 'fixed:case:tray:text:copyright', basis: 'backPanelSafe', placement: [50, 94, 90, 8], presence: 'required' },
    { id: 'case:preset-assignment:back-screenshot-one', region: 'back-panel', role: 'screenshots', owner: 'case.tray.artwork-slots', object: 'repeated:tray-artwork-1', basis: 'backPanelSafe', placement: [17, 78, 26, 16], presence: 'optional' },
    { id: 'case:preset-assignment:back-screenshot-three', region: 'back-panel', role: 'screenshots', owner: 'case.tray.artwork-slots', object: 'repeated:tray-artwork-3', basis: 'backPanelSafe', placement: [83, 78, 26, 16], presence: 'optional' },
    { id: 'case:preset-assignment:back-screenshot-two', region: 'back-panel', role: 'screenshots', owner: 'case.tray.artwork-slots', object: 'repeated:tray-artwork-2', basis: 'backPanelSafe', placement: [50, 78, 26, 16], presence: 'optional' },
    { id: 'case:preset-assignment:back-minimum-requirements', region: 'back-panel', role: 'system-requirements', owner: 'case.tray.text-blocks', object: 'fixed:case:tray:text:minimum-requirements', basis: 'backPanelSafe', placement: [27, 52, 44, 28], presence: 'required' },
    { id: 'case:preset-assignment:back-recommended-requirements', region: 'back-panel', role: 'system-requirements', owner: 'case.tray.text-blocks', object: 'fixed:case:tray:text:recommended-requirements', basis: 'backPanelSafe', placement: [73, 52, 44, 28], presence: 'required' },
    { id: 'case:preset-assignment:front-background', region: 'front-cover', role: 'background-artwork', owner: 'case.cover.background', object: 'fixed:case:cover:background', basis: 'front', placement: [50, 50, 100, 100], presence: 'required' },
    { id: 'case:preset-assignment:front-title-artwork', region: 'front-cover', role: 'game-title', owner: 'case.cover.title-artwork', object: 'fixed:case:cover:title-artwork', basis: 'frontSafe', placement: [50, 18, 70, 24], presence: 'required' },
    { id: 'case:preset-assignment:left-spine-background', region: 'left-spine', role: 'spine-background-artwork', owner: 'case.spine.left.background', object: 'fixed:case:spine:left:background', basis: 'leftSpine', placement: [50, 50, 100, 100], presence: 'required' },
    { id: 'case:preset-assignment:right-spine-background', region: 'right-spine', role: 'spine-background-artwork', owner: 'case.spine.right.background', object: 'fixed:case:spine:right:background', basis: 'rightSpine', placement: [50, 50, 100, 100], presence: 'required' },
    { id: 'case:preset-assignment:left-spine-title-text', region: 'left-spine', role: 'vertical-game-logo-title', owner: 'case.spine.left.title-text', object: 'fixed:case:spine:left:text:title', basis: 'leftSpineSafe', placement: [50, 50, 82, 70], presence: 'required' },
    { id: 'case:preset-assignment:right-spine-title-text', region: 'right-spine', role: 'vertical-game-logo-title', owner: 'case.spine.right.title-text', object: 'fixed:case:spine:right:text:title', basis: 'rightSpineSafe', placement: [50, 50, 82, 70], presence: 'required' },
    { id: 'case:preset-assignment:tray-background', region: 'tray-card', role: 'background-artwork', owner: 'case.tray.background', object: 'fixed:case:tray:background', basis: 'back', placement: [50, 50, 100, 100], presence: 'required' },
  ])

  for (const assignment of assignments()) {
    assert.equal(
      isCaseInsertPresetCoordinateBasisAllowed(
        assignment.region,
        assignment.coordinateBasis,
      ),
      true,
    )
    assert.equal('actionRegion' in assignment, false)
  }
})

test('the production catalog contains exactly one canonical built-in revision and no alias', () => {
  assert.deepEqual(CASE_INSERT_PRESET_CATALOG.list(), [{
    id: JEWEL_CASE_ESSENTIALS_CASE_PRESET_ID,
    revision: 1,
    name: 'Jewel Case Essentials',
    surface: 'case-insert',
    source: 'builtin',
  }])
  assert.deepEqual(
    CASE_INSERT_PRESET_CATALOG.getExact(
      JEWEL_CASE_ESSENTIALS_CASE_PRESET_ID,
      1,
    ),
    JEWEL_CASE_ESSENTIALS_CASE_PRESET,
  )
  assert.deepEqual(
    CASE_INSERT_PRESET_CATALOG.getLatest(
      JEWEL_CASE_ESSENTIALS_CASE_PRESET_ID,
    ),
    JEWEL_CASE_ESSENTIALS_CASE_PRESET,
  )
  assert.strictEqual(
    CASE_INSERT_PRESET_CATALOG.getExact(
      JEWEL_CASE_ESSENTIALS_CASE_PRESET_ID,
      1,
    ),
    CASE_INSERT_PRESET_CATALOG.getLatest(
      JEWEL_CASE_ESSENTIALS_CASE_PRESET_ID,
    ),
  )
  assert.equal(
    CASE_INSERT_PRESET_CATALOG.getExact(
      JEWEL_CASE_ESSENTIALS_CASE_PRESET_ID,
      2,
    ),
    null,
  )
  const unknown = CASE_INSERT_PRESET_CATALOG.resolve({
    id: JEWEL_CASE_ESSENTIALS_CASE_PRESET_ID,
    revision: 2,
  })
  assert.equal(unknown.ok, false)
  if (!unknown.ok) assert.equal(unknown.error.code, 'unknown-revision')
  const alias = CASE_INSERT_PRESET_CATALOG.resolve({
    id: 'jewel-case-essentials',
    revision: 1,
  })
  assert.equal(alias.ok, false)
  if (!alias.ok) assert.equal(alias.error.code, 'unknown-id')
})

test('specific-template and Disc incompatibility are deterministic and non-mutating', () => {
  const before = structuredClone(JEWEL_CASE_ESSENTIALS_CASE_PRESET)
  const compatible = evaluateCaseInsertPresetCompatibility(
    JEWEL_CASE_ESSENTIALS_CASE_PRESET,
    compatibilityContext(),
  )
  assert.equal(compatible.status, 'compatible')

  const wrongTemplate = evaluateCaseInsertPresetCompatibility(
    JEWEL_CASE_ESSENTIALS_CASE_PRESET,
    compatibilityContext({ templateId: 'futureCase' }),
  )
  assert.deepEqual(
    wrongTemplate.reasons.map(({ code }) => code),
    ['template-id-incompatible'],
  )

  const wrongKind = evaluateCaseInsertPresetCompatibility(
    JEWEL_CASE_ESSENTIALS_CASE_PRESET,
    compatibilityContext({ projectKind: 'disc' }),
  )
  assert.deepEqual(
    wrongKind.reasons.map(({ code }) => code),
    ['project-kind-incompatible'],
  )
  assert.deepEqual(JEWEL_CASE_ESSENTIALS_CASE_PRESET, before)
})

test('foregrounds are contained, Back Panel excludes spines, and representative regions do not overlap', () => {
  const foregrounds = assignments().filter(
    ({ id }) => !BACKGROUND_ASSIGNMENT_IDS.has(id),
  )
  const physical = foregrounds.map((assignment) => ({
    assignment,
    rect: toPhysicalRect(assignment),
  }))

  for (const { assignment, rect } of physical) {
    assert.match(assignment.coordinateBasis, /Safe$/)
    const basis = getJewelCaseTemplateRegion(
      assignment.coordinateBasis as JewelCaseRegionId,
    )
    assert.ok(basis)
    assert.ok(rect.left >= basis.bounds.xMm)
    assert.ok(rect.top >= basis.bounds.yMm)
    assert.ok(rect.right <= basis.bounds.xMm + basis.bounds.widthMm)
    assert.ok(rect.bottom <= basis.bounds.yMm + basis.bounds.heightMm)
  }

  const backPanel = getJewelCaseTemplateRegion('backPanelSafe')
  const leftSpine = getJewelCaseTemplateRegion('leftSpine')
  const rightSpine = getJewelCaseTemplateRegion('rightSpine')
  assert.ok(backPanel && leftSpine && rightSpine)
  for (const { rect } of physical.filter(
    ({ assignment }) => assignment.region === 'back-panel',
  )) {
    assert.ok(rect.left >= backPanel.bounds.xMm)
    assert.ok(rect.right <= backPanel.bounds.xMm + backPanel.bounds.widthMm)
    assert.ok(rect.left >= leftSpine.bounds.xMm + leftSpine.bounds.widthMm)
    assert.ok(rect.right <= rightSpine.bounds.xMm)
  }

  for (let left = 0; left < physical.length; left += 1) {
    for (let right = left + 1; right < physical.length; right += 1) {
      assert.equal(
        positiveOverlap(physical[left]!.rect, physical[right]!.rect),
        false,
        `${physical[left]!.assignment.id} overlaps ${physical[right]!.assignment.id}`,
      )
    }
  }

  const trayBackground = toPhysicalRect(assignments().find(
    ({ id }) => id === 'case:preset-assignment:tray-background',
  )!)
  assert.ok(physical
    .filter(({ rect }) => rect.surface === 'back')
    .every(({ rect }) => positiveOverlap(trayBackground, rect)))
  assert.deepEqual(
    assignments()
      .filter(({ region }) => region.endsWith('-spine'))
      .map(({ region, ownerId }) => ({ region, ownerId })),
    [
      { region: 'left-spine', ownerId: 'case.spine.left.background' },
      { region: 'right-spine', ownerId: 'case.spine.right.background' },
      { region: 'left-spine', ownerId: 'case.spine.left.title-text' },
      { region: 'right-spine', ownerId: 'case.spine.right.title-text' },
    ],
  )
})

test('catalog listing has no automatic lifecycle, dirty, or attachment effect', () => {
  const root = createApplicationLifecycleCompositionRoot({
    initialState: createNewProjectSession({
      sessionId: 'catalog-side-effect-proof',
      project: createBlankJewelCaseSavedProject(),
    }),
  })
  const before = root.getLifecycleState()
  const dirtyBefore = selectIsActiveProjectDirty(before)

  assert.equal(CASE_INSERT_PRESET_CATALOG.list().length, 1)

  assert.strictEqual(root.getLifecycleState(), before)
  assert.equal(selectIsActiveProjectDirty(root.getLifecycleState()), dirtyBefore)
  assert.equal(
    root.getLifecycleState().activeSession?.kind === 'caseInsert'
      ? root.getLifecycleState().activeSession
        .caseInsertPresetApplication.attachment.status
      : null,
    'unattached',
  )
})
