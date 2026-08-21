import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'

import {
  CASE_INSERT_LAYOUT_PRESET_PROJECT_STATE_VERSION,
} from '../project/caseInsertPresetProjectPersistenceTypes.ts'
import {
  CURRENT_PROJECT_SCHEMA_VERSION,
} from '../project/projectSchema.ts'
import {
  getJewelCaseTemplateRegion,
} from '../templates/caseInsertTemplates.ts'
import {
  PROJECT_PACKAGE_WRITE_REQUEST_MAGIC,
} from '../tauri/projectPackageWrite.ts'
import {
  CASE_INSERT_PRESET_ARTWORK_VIEWPORT_ACTION_FORMAT_VERSION,
  CASE_INSERT_PRESET_ARTWORK_VIEWPORT_ACTION_KIND,
  CASE_INSERT_PRESET_ARTWORK_VIEWPORT_OWNER_IDS_V1,
  CASE_INSERT_PRESET_ARTWORK_VIEWPORT_PLAN_FORMAT_VERSION,
  CASE_INSERT_PRESET_ARTWORK_VIEWPORT_PLAN_KIND,
  planCaseInsertPresetArtworkViewport,
  validateCaseInsertPresetArtworkViewportPlanningSuccess,
  type CaseInsertPresetArtworkViewportPlanningResult,
} from './caseInsertPresetArtworkViewport.ts'
import {
  CASE_INSERT_PRESET_CATALOG,
} from './caseInsertPresetCatalog.ts'
import {
  CASE_INSERT_PRESET_DEFINITION_KIND,
  CASE_INSERT_PRESET_FORMAT_VERSION,
  CASE_INSERT_PRESET_OWNER_IDS,
} from './caseInsertPresetDefinition.ts'
import {
  JEWEL_CASE_ESSENTIALS_CASE_PRESET,
  JEWEL_CASE_ESSENTIALS_CASE_PRESET_ID,
  JEWEL_CASE_ESSENTIALS_CASE_PRESET_REVISION,
} from './builtins/jewelCaseEssentialsCasePreset.ts'

type MutableRecord = Record<string, unknown>
type TestSource = {
  assetIdentity: string
  provenanceIdentity: string | null
  width: number
  height: number
  contentBounds: {
    x: number
    y: number
    width: number
    height: number
  } | null
}
type TestPlanningInput = {
  assignment: {
    presetId: string
    presetRevision: number
    slotId: string
    assignmentId: string
    roleId: string
    region: string
    coordinateBasis: string
    ownerId: string
    object: { kind: string; id: string }
  }
  template: {
    id: string
    revision: number | null
    presetCompatibility: {
      presetId: string
      presetRevision: number
      mode: string
      templateId?: string
    }
  }
  action: {
    kind: string
    formatVersion: number
    viewport: {
      centerXPercent: number
      centerYPercent: number
      widthPercent: number
      heightPercent: number
    }
    fitting: unknown
  }
  source: TestSource | null
  capabilities: {
    ownerId: string
    object: { kind: string; id: string }
    viewportGeometry: boolean
    contain: boolean
    cover: boolean
    explicitCropFraming: boolean
    focalOffset: boolean
    zoom: boolean
  }
}

const SCREENSHOT_SLOT_ID = 'case:preset-slot:back-screenshots'
const SCREENSHOT_ASSIGNMENT_IDS = [
  'case:preset-assignment:back-screenshot-one',
  'case:preset-assignment:back-screenshot-two',
  'case:preset-assignment:back-screenshot-three',
] as const

function screenshotSlot() {
  const slot = JEWEL_CASE_ESSENTIALS_CASE_PRESET.slots.find(
    ({ id }) => id === SCREENSHOT_SLOT_ID,
  )
  assert.ok(slot)
  return slot
}

function inputForPresetAssignment(
  slotId: string,
  assignmentId: string,
): TestPlanningInput {
  const slot = JEWEL_CASE_ESSENTIALS_CASE_PRESET.slots.find(
    ({ id }) => id === slotId,
  )
  assert.ok(slot)
  const assignment = slot.assignments.find(({ id }) => id === assignmentId)
  assert.ok(assignment)
  return {
    assignment: {
      presetId: JEWEL_CASE_ESSENTIALS_CASE_PRESET_ID,
      presetRevision: JEWEL_CASE_ESSENTIALS_CASE_PRESET_REVISION,
      slotId: slot.id,
      assignmentId: assignment.id,
      roleId: slot.roleId,
      region: assignment.region,
      coordinateBasis: assignment.coordinateBasis,
      ownerId: assignment.ownerId,
      object: { ...assignment.object },
    },
    template: {
      id: 'jewelCase',
      revision: null,
      presetCompatibility: {
        presetId: JEWEL_CASE_ESSENTIALS_CASE_PRESET_ID,
        presetRevision: JEWEL_CASE_ESSENTIALS_CASE_PRESET_REVISION,
        ...JEWEL_CASE_ESSENTIALS_CASE_PRESET.compatibility,
      },
    },
    action: {
      kind: CASE_INSERT_PRESET_ARTWORK_VIEWPORT_ACTION_KIND,
      formatVersion: CASE_INSERT_PRESET_ARTWORK_VIEWPORT_ACTION_FORMAT_VERSION,
      viewport: { ...assignment.contentRegion },
      fitting: { mode: 'contain' },
    },
    source: {
      assetIdentity: 'asset:sha256:test-landscape',
      provenanceIdentity: 'steam:app:100:screenshot:0',
      width: 1600,
      height: 900,
      contentBounds: null,
    },
    capabilities: {
      ownerId: assignment.ownerId,
      object: { ...assignment.object },
      viewportGeometry: true,
      contain: true,
      cover: true,
      explicitCropFraming: true,
      focalOffset: true,
      zoom: true,
    },
  }
}

function planningInput(index = 0) {
  return inputForPresetAssignment(
    SCREENSHOT_SLOT_ID,
    SCREENSHOT_ASSIGNMENT_IDS[index]!,
  )
}

function spineArtworkInput(side: 'left' | 'right'): TestPlanningInput {
  const input = planningInput()
  const sideName = side === 'left' ? 'left' : 'right'
  const ownerId = `case.spine.${sideName}.artwork-slots`
  const objectId = `${sideName}-spine-artwork-1`
  input.assignment = {
    ...input.assignment,
    slotId: `case:preset-slot:${sideName}-spine-artwork`,
    assignmentId: `case:preset-assignment:${sideName}-spine-artwork-one`,
    roleId: 'additional-artwork',
    region: `${sideName}-spine`,
    coordinateBasis: `${sideName}SpineSafe`,
    ownerId,
    object: { kind: 'repeated', id: objectId },
  }
  input.capabilities = {
    ...input.capabilities,
    ownerId,
    object: { kind: 'repeated', id: objectId },
  }
  input.action.viewport = {
    centerXPercent: 50,
    centerYPercent: 50,
    widthPercent: 60,
    heightPercent: 50,
  }
  return input
}

function mutableClone(value: unknown): MutableRecord {
  return structuredClone(value) as MutableRecord
}

function assertFailure(
  result: CaseInsertPresetArtworkViewportPlanningResult,
  status: 'invalid' | 'incompatible' | 'unsupported',
  code: string,
  path?: string,
) {
  assert.equal(result.ok, false)
  if (result.ok) assert.fail('Expected a planning failure.')
  assert.equal(result.status, status)
  assert.equal(result.error.code, code)
  if (path !== undefined) assert.equal(result.error.path, path)
  return result
}

function assertSuccess(
  result: CaseInsertPresetArtworkViewportPlanningResult,
) {
  assert.equal(result.ok, true)
  if (!result.ok) assert.fail(`Unexpected ${result.status} planning failure.`)
  return result.plan
}

function assertDeeplyFrozen(value: unknown, seen = new Set<unknown>()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return
  seen.add(value)
  assert.ok(Object.isFrozen(value))
  for (const nested of Object.values(value)) {
    assertDeeplyFrozen(nested, seen)
  }
}

function assertApproximately(
  actual: number,
  expected: number,
  tolerance = 1e-10,
) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)),
    `Expected ${actual} to approximately equal ${expected}.`,
  )
}

function withFitting(input: TestPlanningInput, fitting: unknown) {
  const changed = structuredClone(input)
  ;(changed.action as MutableRecord).fitting = fitting
  return changed
}

function explicitCropFor(
  input: TestPlanningInput,
  options: Readonly<{
    centerXPercent?: number
    centerYPercent?: number
    widthPercent?: number
  }> = {},
) {
  assert.ok(input.source)
  const deferred = structuredClone(input)
  deferred.source = null
  const viewport = assertSuccess(
    planCaseInsertPresetArtworkViewport(deferred),
  ).viewport
  const widthPercent = options.widthPercent ?? 80
  const heightPercent = (
    input.source.width * widthPercent / 100 /
    viewport.physicalAspectRatio /
    input.source.height * 100
  )
  return withFitting(input, {
    mode: 'explicit-crop',
    sourceWindow: {
      centerXPercent: options.centerXPercent ?? 50,
      centerYPercent: options.centerYPercent ?? 50,
      widthPercent,
      heightPercent,
    },
  })
}

test('derives the three Jewel screenshot viewport shapes from physical template geometry', () => {
  const basis = getJewelCaseTemplateRegion('backPanelSafe')
  const leftSpine = getJewelCaseTemplateRegion('leftSpine')
  const rightSpine = getJewelCaseTemplateRegion('rightSpine')
  assert.ok(basis && leftSpine && rightSpine)

  const plans = [0, 1, 2].map((index) => {
    const input = planningInput(index)
    input.source = null
    return assertSuccess(planCaseInsertPresetArtworkViewport(input))
  })

  for (const plan of plans) {
    assert.equal(plan.resolution, 'deferred')
    const expectedCenterX = basis.bounds.xMm + basis.bounds.widthMm *
      plan.viewport.normalizedRegion.centerXPercent / 100
    const expectedCenterY = basis.bounds.yMm + basis.bounds.heightMm *
      plan.viewport.normalizedRegion.centerYPercent / 100
    assertApproximately(
      plan.viewport.physicalWidthMm,
      basis.bounds.widthMm * 0.26,
    )
    assertApproximately(
      plan.viewport.physicalHeightMm,
      basis.bounds.heightMm * 0.16,
    )
    assertApproximately(
      plan.viewport.physicalAspectRatio,
      plan.viewport.physicalWidthMm / plan.viewport.physicalHeightMm,
    )
    assertApproximately(plan.viewport.centerXMm, expectedCenterX)
    assertApproximately(plan.viewport.centerYMm, expectedCenterY)
    assertApproximately(
      plan.viewport.rectMm.xMm,
      expectedCenterX - plan.viewport.physicalWidthMm / 2,
    )
    assertApproximately(
      plan.viewport.rectMm.yMm,
      expectedCenterY - plan.viewport.physicalHeightMm / 2,
    )
    assertApproximately(
      plan.viewport.rectMm.xMm + plan.viewport.rectMm.widthMm,
      expectedCenterX + plan.viewport.physicalWidthMm / 2,
    )
    assertApproximately(
      plan.viewport.rectMm.yMm + plan.viewport.rectMm.heightMm,
      expectedCenterY + plan.viewport.physicalHeightMm / 2,
    )
    assert.notEqual(plan.viewport.physicalAspectRatio, 26 / 16)
    assert.ok(
      plan.viewport.rectMm.xMm >=
        leftSpine.bounds.xMm + leftSpine.bounds.widthMm,
    )
    assert.ok(
      plan.viewport.rectMm.xMm + plan.viewport.rectMm.widthMm <=
        rightSpine.bounds.xMm,
    )
  }

  assert.deepEqual(
    plans.map(({ viewport }) => [
      viewport.physicalWidthMm,
      viewport.physicalHeightMm,
      viewport.physicalAspectRatio,
    ]),
    Array.from({ length: 3 }, () => [
      plans[0]!.viewport.physicalWidthMm,
      plans[0]!.viewport.physicalHeightMm,
      plans[0]!.viewport.physicalAspectRatio,
    ]),
  )
  assert.equal(new Set(plans.map(({ viewport }) => viewport.identity)).size, 3)
})

test('keeps viewport shape independent of source aspect ratio and browser geometry', () => {
  const landscapeInput = planningInput()
  const portraitInput = planningInput()
  assert.ok(portraitInput.source)
  portraitInput.source = {
    ...portraitInput.source,
    assetIdentity: 'asset:sha256:test-portrait',
    width: 900,
    height: 1600,
  }

  const landscape = assertSuccess(
    planCaseInsertPresetArtworkViewport(landscapeInput),
  )
  const portrait = assertSuccess(
    planCaseInsertPresetArtworkViewport(portraitInput),
  )
  assert.deepEqual(landscape.viewport, portrait.viewport)
  assert.notDeepEqual(
    landscape.fitting.renderedContentRectMm,
    portrait.fitting.renderedContentRectMm,
  )
  assert.equal('previewWidth' in landscape.viewport, false)
  assert.equal('operatingSystem' in landscape.viewport, false)
})

test('keeps left and right coordinate bases independently identified', () => {
  const left = inputForPresetAssignment(
    'case:preset-slot:spine-backgrounds',
    'case:preset-assignment:left-spine-background',
  )
  left.source = null
  const right = inputForPresetAssignment(
    'case:preset-slot:spine-backgrounds',
    'case:preset-assignment:right-spine-background',
  )
  right.source = null

  const leftPlan = assertSuccess(planCaseInsertPresetArtworkViewport(left))
  const rightPlan = assertSuccess(planCaseInsertPresetArtworkViewport(right))
  assert.notEqual(leftPlan.viewport.identity, rightPlan.viewport.identity)
  assert.notEqual(leftPlan.viewport.basisRectMm.xMm,
    rightPlan.viewport.basisRectMm.xMm)
  assert.equal(leftPlan.template.surfaceId, rightPlan.template.surfaceId)
})

test('extends only viewport action v1 with repeated left and right Spine artwork owners', () => {
  assert.equal(
    CASE_INSERT_PRESET_OWNER_IDS.includes(
      'case.spine.left.artwork-slots' as never,
    ),
    false,
  )
  assert.equal(
    CASE_INSERT_PRESET_OWNER_IDS.includes(
      'case.spine.right.artwork-slots' as never,
    ),
    false,
  )
  assert.ok(CASE_INSERT_PRESET_ARTWORK_VIEWPORT_OWNER_IDS_V1.includes(
    'case.spine.left.artwork-slots',
  ))
  assert.ok(CASE_INSERT_PRESET_ARTWORK_VIEWPORT_OWNER_IDS_V1.includes(
    'case.spine.right.artwork-slots',
  ))

  for (const side of ['left', 'right'] as const) {
    const plan = assertSuccess(
      planCaseInsertPresetArtworkViewport(spineArtworkInput(side)),
    )
    assert.equal(plan.assignment.ownerId,
      `case.spine.${side}.artwork-slots`)
    assert.equal(plan.assignment.region, `${side}-spine`)
    assert.equal(plan.assignment.roleId, 'additional-artwork')
    assert.equal(plan.assignment.object.kind, 'repeated')
    assert.equal(plan.viewport.coordinateBasis, `${side}SpineSafe`)
  }
})

test('returns a stable deferred plan without inventing source geometry', () => {
  const input = explicitCropFor(planningInput(), {
    centerXPercent: 60,
    widthPercent: 80,
  })
  input.source = null

  const first = planCaseInsertPresetArtworkViewport(input)
  const second = planCaseInsertPresetArtworkViewport(input)
  const plan = assertSuccess(first)
  assert.equal(plan.resolution, 'deferred')
  assert.equal(plan.source, null)
  assert.deepEqual(plan.fitting, {
    status: 'deferred-source-dimensions',
    visibleSourceRect: null,
    renderedContentRectMm: null,
    scaleMmPerSourcePixel: null,
    derivedFocalPosition: null,
    derivedZoom: null,
  })
  assert.equal(plan.clipping.classification, 'unknown-deferred')
  assert.equal(plan.clipping.visibleClipping, null)
  assert.deepEqual(plan.pendingCapabilityChecks, ['zoom'])
  assert.deepEqual(first, second)
})

test('Contain preserves the complete source aspect without clipping', () => {
  const plan = assertSuccess(
    planCaseInsertPresetArtworkViewport(planningInput()),
  )
  assert.equal(plan.resolution, 'resolved')
  assert.deepEqual(plan.fitting.visibleSourceRect, {
    x: 0,
    y: 0,
    width: 1600,
    height: 900,
  })
  assertApproximately(
    plan.fitting.renderedContentRectMm.widthMm /
      plan.fitting.renderedContentRectMm.heightMm,
    1600 / 900,
  )
  assert.equal(plan.fitting.viewportFill, 'letterboxed')
  assert.equal(plan.clipping.classification, 'none')
  assert.equal(plan.clipping.visibleClipping, false)
  assert.deepEqual(plan.warnings, [])
  assert.deepEqual(plan.materialConsentRequirements, [])
})

test('Cover deterministically centers derived clipping and emits stable review evidence', () => {
  const input = withFitting(planningInput(), { mode: 'cover' })
  const first = assertSuccess(planCaseInsertPresetArtworkViewport(input))
  const second = assertSuccess(planCaseInsertPresetArtworkViewport(input))
  assert.equal(first.resolution, 'resolved')
  assert.deepEqual(first, second)
  assert.equal(first.fitting.viewportFill, 'complete')
  assert.equal(first.fitting.visibleSourceRect.x, 0)
  assert.equal(first.fitting.visibleSourceRect.width, 1600)
  assert.ok(first.fitting.visibleSourceRect.y > 0)
  assert.ok(first.fitting.visibleSourceRect.height < 900)
  assertApproximately(
    first.fitting.renderedContentRectMm.widthMm /
      first.fitting.renderedContentRectMm.heightMm,
    1600 / 900,
  )
  assertApproximately(
    first.fitting.renderedContentRectMm.widthMm,
    first.viewport.physicalWidthMm,
  )
  assert.ok(
    first.fitting.renderedContentRectMm.heightMm >=
      first.viewport.physicalHeightMm,
  )
  assert.equal(first.fitting.derivedFocalPosition, null)
  assert.equal(first.fitting.derivedZoom, null)
  assert.equal(first.clipping.classification, 'derived-cover')
  assert.equal(first.clipping.material, true)
  assert.equal(first.clipping.clippedSourcePixels?.left, 0)
  assert.equal(first.clipping.clippedSourcePixels?.right, 0)
  assertApproximately(
    first.clipping.clippedSourcePixels!.top,
    first.clipping.clippedSourcePixels!.bottom,
  )
  assert.ok(first.clipping.clippedSourceFractions!.area > 0)
  assert.equal(first.warnings.length, 1)
  assert.equal(first.materialConsentRequirements.length, 1)
  assert.equal(
    first.materialConsentRequirements[0]!.warningId,
    first.warnings[0]!.id,
  )
})

test('explicit crop produces exact source-window, focal, zoom, clipping, and consent evidence', () => {
  const input = explicitCropFor(planningInput(), {
    centerXPercent: 60,
    centerYPercent: 50,
    widthPercent: 80,
  })
  const plan = assertSuccess(planCaseInsertPresetArtworkViewport(input))
  assert.equal(plan.resolution, 'resolved')
  assert.equal(plan.intent.declaration.mode, 'explicit-crop')
  assertApproximately(plan.fitting.visibleSourceRect.x, 320)
  assertApproximately(plan.fitting.visibleSourceRect.width, 1280)
  assertApproximately(
    plan.fitting.visibleSourceRect.height /
      plan.fitting.visibleSourceRect.width,
    1 / plan.viewport.physicalAspectRatio,
  )
  assert.deepEqual(plan.fitting.derivedFocalPosition, {
    xPercent: 60,
    yPercent: 50,
  })
  assertApproximately(plan.fitting.derivedZoom!, 1.25)
  assert.deepEqual(plan.requiredCapabilities, [
    'viewport-geometry',
    'explicit-crop-framing',
    'focal-offset',
    'zoom',
  ])
  assert.equal(plan.clipping.classification, 'explicit-crop')
  assert.equal(plan.warnings[0]?.classification, 'explicit-crop')
  assert.equal(plan.materialConsentRequirements.length, 1)
  assert.equal(plan.preservation.destructiveCrop, 'not-performed')
  assert.equal(plan.preservation.imageBytes, 'preserved-outside-boundary')
})

test('distinguishes an exact requested crop from the same window derived by Cover', () => {
  const coverInput = withFitting(planningInput(), { mode: 'cover' })
  const cover = assertSuccess(planCaseInsertPresetArtworkViewport(coverInput))
  const visible = cover.fitting.visibleSourceRect
  const cropInput = withFitting(planningInput(), {
    mode: 'explicit-crop',
    sourceWindow: {
      centerXPercent: (
        visible.x + visible.width / 2
      ) / cover.source!.contentRect.width * 100,
      centerYPercent: (
        visible.y + visible.height / 2
      ) / cover.source!.contentRect.height * 100,
      widthPercent: visible.width / cover.source!.contentRect.width * 100,
      heightPercent: visible.height / cover.source!.contentRect.height * 100,
    },
  })
  cropInput.capabilities.zoom = false
  cropInput.capabilities.focalOffset = false
  const crop = assertSuccess(planCaseInsertPresetArtworkViewport(cropInput))
  assertApproximately(crop.fitting.derivedZoom!, 1)
  assertApproximately(
    crop.fitting.visibleSourceRect.x,
    cover.fitting.visibleSourceRect.x,
  )
  assertApproximately(
    crop.fitting.visibleSourceRect.y,
    cover.fitting.visibleSourceRect.y,
  )
  assertApproximately(
    crop.fitting.visibleSourceRect.width,
    cover.fitting.visibleSourceRect.width,
  )
  assertApproximately(
    crop.fitting.visibleSourceRect.height,
    cover.fitting.visibleSourceRect.height,
  )
  assert.equal(cover.clipping.classification, 'derived-cover')
  assert.equal(crop.clipping.classification, 'explicit-crop')
  assert.notEqual(cover.intent.identity, crop.intent.identity)
})

test('fails closed when an explicit crop source window has the wrong physical aspect', () => {
  const input = withFitting(planningInput(), {
    mode: 'explicit-crop',
    sourceWindow: {
      centerXPercent: 50,
      centerYPercent: 50,
      widthPercent: 50,
      heightPercent: 50,
    },
  })
  assertFailure(
    planCaseInsertPresetArtworkViewport(input),
    'incompatible',
    'crop-window-aspect-incompatible',
    'action.fitting.sourceWindow',
  )
})

test('strictly validates explicit crop intent and source-window geometry', () => {
  const examples: readonly Readonly<{
    fitting: unknown
    code: string
    path: string
  }>[] = [
    {
      fitting: { mode: 'future-fit' },
      code: 'invalid-fitting-intent',
      path: 'action.fitting.mode',
    },
    {
      fitting: { mode: 'explicit-crop' },
      code: 'unexpected-field',
      path: 'action.fitting',
    },
    {
      fitting: {
        mode: 'explicit-crop',
        sourceWindow: {
          centerXPercent: 50,
          centerYPercent: 50,
          widthPercent: 0,
          heightPercent: 50,
        },
      },
      code: 'invalid-fitting-intent',
      path: 'action.fitting.sourceWindow',
    },
    {
      fitting: {
        mode: 'explicit-crop',
        sourceWindow: {
          centerXPercent: 50,
          centerYPercent: 50,
          widthPercent: 50,
          heightPercent: -1,
        },
      },
      code: 'invalid-fitting-intent',
      path: 'action.fitting.sourceWindow',
    },
    {
      fitting: {
        mode: 'explicit-crop',
        sourceWindow: {
          centerXPercent: -1,
          centerYPercent: 50,
          widthPercent: 50,
          heightPercent: 50,
        },
      },
      code: 'invalid-fitting-intent',
      path: 'action.fitting.sourceWindow',
    },
    {
      fitting: {
        mode: 'explicit-crop',
        sourceWindow: {
          centerXPercent: 10,
          centerYPercent: 50,
          widthPercent: 50,
          heightPercent: 50,
        },
      },
      code: 'invalid-fitting-intent',
      path: 'action.fitting.sourceWindow',
    },
    {
      fitting: {
        mode: 'explicit-crop',
        sourceWindow: {
          centerXPercent: 50,
          centerYPercent: 50,
          widthPercent: 50,
          heightPercent: 50,
          extra: true,
        },
      },
      code: 'invalid-fitting-intent',
      path: 'action.fitting.sourceWindow',
    },
  ]

  for (const example of examples) {
    const input = planningInput()
    input.action.fitting = example.fitting
    assertFailure(
      planCaseInsertPresetArtworkViewport(input),
      'invalid',
      example.code,
      example.path,
    )
  }

  for (const nonFinite of [Number.NaN, Number.POSITIVE_INFINITY]) {
    const input = planningInput()
    input.action.fitting = {
      mode: 'explicit-crop',
      sourceWindow: {
        centerXPercent: nonFinite,
        centerYPercent: 50,
        widthPercent: 50,
        heightPercent: 50,
      },
    }
    assertFailure(
      planCaseInsertPresetArtworkViewport(input),
      'invalid',
      'input-not-plain',
      '$',
    )
  }
})

test('uses validated content bounds as read-only source authority', () => {
  const input = withFitting(planningInput(), { mode: 'cover' })
  input.source = {
    assetIdentity: 'asset:sha256:bounded-content',
    provenanceIdentity: null,
    width: 2000,
    height: 1200,
    contentBounds: { x: 200, y: 100, width: 1600, height: 900 },
  }
  const plan = assertSuccess(planCaseInsertPresetArtworkViewport(input))
  assert.deepEqual(plan.source?.imageRect, {
    x: 0,
    y: 0,
    width: 2000,
    height: 1200,
  })
  assert.deepEqual(plan.source?.contentRect, {
    x: 200,
    y: 100,
    width: 1600,
    height: 900,
  })
  assert.equal(plan.fitting.visibleSourceRect.x, 200)
  assert.ok(plan.fitting.visibleSourceRect.y > 100)
  assert.ok(
    plan.fitting.visibleSourceRect.y +
      plan.fitting.visibleSourceRect.height < 1000,
  )
  assert.equal(plan.preservation.contentBounds, 'read-only-source-authority')
})

test('maps the canonical all-transparent bounds sentinel to empty source content', () => {
  const input = planningInput()
  assert.ok(input.source)
  input.source.contentBounds = { x: 0, y: 0, width: 0, height: 0 }
  assertFailure(
    planCaseInsertPresetArtworkViewport(input),
    'invalid',
    'empty-source-content',
    'source.contentBounds',
  )

  input.source.contentBounds = { x: 0, y: 0, width: 0, height: 1 }
  assertFailure(
    planCaseInsertPresetArtworkViewport(input),
    'invalid',
    'invalid-content-bounds',
    'source.contentBounds',
  )
})

test('rejects malformed content bounds and hostile source dimensions', () => {
  const cases: readonly Readonly<{
    mutate: (input: MutableRecord) => void
    code: string
  }>[] = [
    {
      mutate(input) {
        const source = input.source as MutableRecord
        source.width = Number.NaN
      },
      code: 'input-not-plain',
    },
    {
      mutate(input) {
        const source = input.source as MutableRecord
        source.height = Number.POSITIVE_INFINITY
      },
      code: 'input-not-plain',
    },
    {
      mutate(input) {
        const source = input.source as MutableRecord
        source.width = 0
      },
      code: 'invalid-source-dimensions',
    },
    {
      mutate(input) {
        const source = input.source as MutableRecord
        source.contentBounds = { x: -1, y: 0, width: 1, height: 1 }
      },
      code: 'invalid-content-bounds',
    },
    {
      mutate(input) {
        const source = input.source as MutableRecord
        source.contentBounds = { x: 1500, y: 0, width: 101, height: 1 }
      },
      code: 'invalid-content-bounds',
    },
    {
      mutate(input) {
        const source = input.source as MutableRecord
        source.extra = true
      },
      code: 'unexpected-field',
    },
  ]

  for (const example of cases) {
    const input = mutableClone(planningInput())
    example.mutate(input)
    assertFailure(
      planCaseInsertPresetArtworkViewport(input),
      'invalid',
      example.code,
    )
  }
})

test('strictly validates viewport shape, finite bounds, containment, and exact keys', () => {
  const cases: readonly Readonly<{
    mutate: (viewport: MutableRecord) => void
    code: string
  }>[] = [
    { mutate: (value) => { value.widthPercent = 0 }, code: 'invalid-viewport' },
    { mutate: (value) => { value.heightPercent = -1 }, code: 'invalid-viewport' },
    { mutate: (value) => { value.centerXPercent = Number.NaN }, code: 'input-not-plain' },
    { mutate: (value) => { value.centerYPercent = Number.POSITIVE_INFINITY }, code: 'input-not-plain' },
    { mutate: (value) => { value.centerXPercent = 5; value.widthPercent = 20 }, code: 'viewport-outside-basis' },
    { mutate: (value) => { value.extra = true }, code: 'invalid-viewport' },
  ]
  for (const example of cases) {
    const input = mutableClone(planningInput())
    const action = input.action as MutableRecord
    const viewport = action.viewport as MutableRecord
    example.mutate(viewport)
    assertFailure(
      planCaseInsertPresetArtworkViewport(input),
      'invalid',
      example.code,
      example.code === 'input-not-plain' ? '$' : 'action.viewport',
    )
  }

  const extraRoot = mutableClone(planningInput())
  extraRoot.extra = true
  assertFailure(
    planCaseInsertPresetArtworkViewport(extraRoot),
    'invalid',
    'unexpected-field',
    '$',
  )
  assertFailure(
    planCaseInsertPresetArtworkViewport(null),
    'invalid',
    'input-not-plain',
    '$',
  )
})

test('rejects unsupported action, template, assignment, owner, and basis identities', () => {
  const actionKind = mutableClone(planningInput())
  ;(actionKind.action as MutableRecord).kind = 'future/action'
  assertFailure(
    planCaseInsertPresetArtworkViewport(actionKind),
    'unsupported',
    'action-kind-unsupported',
  )

  const actionVersion = mutableClone(planningInput())
  ;(actionVersion.action as MutableRecord).formatVersion = 2
  assertFailure(
    planCaseInsertPresetArtworkViewport(actionVersion),
    'unsupported',
    'action-version-unsupported',
  )

  const template = mutableClone(planningInput())
  ;(template.template as MutableRecord).id = 'futureCase'
  assertFailure(
    planCaseInsertPresetArtworkViewport(template),
    'incompatible',
    'template-id-incompatible',
    'template.presetCompatibility.templateId',
  )

  const unavailableTemplate = mutableClone(planningInput())
  ;(unavailableTemplate.template as MutableRecord).id = 'futureCase'
  ;((unavailableTemplate.template as MutableRecord)
    .presetCompatibility as MutableRecord).templateId = 'futureCase'
  assertFailure(
    planCaseInsertPresetArtworkViewport(unavailableTemplate),
    'unsupported',
    'template-unsupported',
  )

  const wrongPresetCompatibility = mutableClone(planningInput())
  ;((wrongPresetCompatibility.template as MutableRecord)
    .presetCompatibility as MutableRecord).presetId =
      'builtin:case-preset:different'
  assertFailure(
    planCaseInsertPresetArtworkViewport(wrongPresetCompatibility),
    'incompatible',
    'template-compatibility-target-mismatch',
    'template.presetCompatibility',
  )

  const wrongPresetRevision = mutableClone(planningInput())
  ;((wrongPresetRevision.template as MutableRecord)
    .presetCompatibility as MutableRecord).presetRevision = 2
  assertFailure(
    planCaseInsertPresetArtworkViewport(wrongPresetRevision),
    'incompatible',
    'template-compatibility-target-mismatch',
    'template.presetCompatibility',
  )

  const overlongTemplate = mutableClone(planningInput())
  ;(overlongTemplate.template as MutableRecord).id = 't'.repeat(121)
  assertFailure(
    planCaseInsertPresetArtworkViewport(overlongTemplate),
    'invalid',
    'invalid-template-identity',
    'template',
  )

  const invalidTemplateSurrogate = mutableClone(planningInput())
  ;(invalidTemplateSurrogate.template as MutableRecord).id =
    `jewelCase:${'\uD800'}`
  assertFailure(
    planCaseInsertPresetArtworkViewport(invalidTemplateSurrogate),
    'invalid',
    'invalid-template-identity',
    'template',
  )

  const invalidCompatibilitySurrogate = mutableClone(planningInput())
  ;((invalidCompatibilitySurrogate.template as MutableRecord)
    .presetCompatibility as MutableRecord).templateId =
      `jewelCase:${'\uDC00'}`
  assertFailure(
    planCaseInsertPresetArtworkViewport(invalidCompatibilitySurrogate),
    'invalid',
    'invalid-template-compatibility',
    'template.presetCompatibility',
  )

  const malformedCompatibility = mutableClone(planningInput())
  ;((malformedCompatibility.template as MutableRecord)
    .presetCompatibility as MutableRecord).extra = true
  assertFailure(
    planCaseInsertPresetArtworkViewport(malformedCompatibility),
    'invalid',
    'invalid-template-compatibility',
    'template.presetCompatibility',
  )

  const revision = mutableClone(planningInput())
  ;(revision.template as MutableRecord).revision = 1
  assertFailure(
    planCaseInsertPresetArtworkViewport(revision),
    'unsupported',
    'template-revision-unsupported',
  )

  const assignmentIdentity = mutableClone(planningInput())
  ;(assignmentIdentity.assignment as MutableRecord).assignmentId =
    'not-a-canonical-assignment-id'
  assertFailure(
    planCaseInsertPresetArtworkViewport(assignmentIdentity),
    'invalid',
    'invalid-assignment-identity',
  )

  const incoherentAssignment = mutableClone(planningInput())
  ;(incoherentAssignment.assignment as MutableRecord).roleId =
    'game-description-text'
  assertFailure(
    planCaseInsertPresetArtworkViewport(incoherentAssignment),
    'invalid',
    'invalid-assignment-identity',
  )

  const textOwner = inputForPresetAssignment(
    'case:preset-slot:back-description',
    'case:preset-assignment:back-description',
  )
  assertFailure(
    planCaseInsertPresetArtworkViewport(textOwner),
    'unsupported',
    'assignment-owner-unsupported',
  )

  const basis = mutableClone(planningInput())
  ;(basis.assignment as MutableRecord).coordinateBasis = 'frontSafe'
  assertFailure(
    planCaseInsertPresetArtworkViewport(basis),
    'incompatible',
    'region-coordinate-basis-mismatch',
  )
})

test('requires exact capability target evidence', () => {
  const wrongOwner = mutableClone(planningInput())
  ;(wrongOwner.capabilities as MutableRecord).ownerId =
    'case.cover.artwork-slots'
  assertFailure(
    planCaseInsertPresetArtworkViewport(wrongOwner),
    'incompatible',
    'capability-target-mismatch',
    'capabilities',
  )

  const wrongObject = mutableClone(planningInput())
  ;((wrongObject.capabilities as MutableRecord).object as MutableRecord).id =
    'tray-artwork-2'
  assertFailure(
    planCaseInsertPresetArtworkViewport(wrongObject),
    'incompatible',
    'capability-target-mismatch',
    'capabilities',
  )

  const malformed = mutableClone(planningInput())
  ;(malformed.capabilities as MutableRecord).cover = 'yes'
  assertFailure(
    planCaseInsertPresetArtworkViewport(malformed),
    'invalid',
    'invalid-capability-evidence',
    'capabilities',
  )
})

test('fails with typed evidence for each unsupported immediate owner capability', () => {
  const examples = [
    { fitting: { mode: 'contain' }, capability: 'viewportGeometry', expected: 'viewport-geometry' },
    { fitting: { mode: 'contain' }, capability: 'contain', expected: 'contain' },
    { fitting: { mode: 'cover' }, capability: 'cover', expected: 'cover' },
    {
      fitting: {
        mode: 'explicit-crop',
        sourceWindow: {
          centerXPercent: 50,
          centerYPercent: 50,
          widthPercent: 100,
          heightPercent: 90,
        },
      },
      capability: 'explicitCropFraming',
      expected: 'explicit-crop-framing',
    },
  ] as const

  for (const example of examples) {
    const input = withFitting(planningInput(), example.fitting)
    ;(input.capabilities as unknown as MutableRecord)[example.capability] = false
    const result = assertFailure(
      planCaseInsertPresetArtworkViewport(input),
      'unsupported',
      'owner-capability-unsupported',
    )
    assert.equal(result.error.capability, example.expected)
    assert.equal(result.error.ownerId, 'case.tray.artwork-slots')
    assert.equal(result.error.objectId, 'tray-artwork-1')
  }
})

test('requires focal capability for off-center explicit framing', () => {
  const input = explicitCropFor(planningInput(), {
    centerXPercent: 60,
    widthPercent: 80,
  })
  input.capabilities.focalOffset = false
  const result = assertFailure(
    planCaseInsertPresetArtworkViewport(input),
    'unsupported',
    'owner-capability-unsupported',
  )
  assert.equal(result.error.capability, 'focal-offset')
})

test('requires zoom capability only when explicit framing magnifies beyond Cover', () => {
  const input = explicitCropFor(planningInput(), { widthPercent: 80 })
  input.capabilities.zoom = false
  const result = assertFailure(
    planCaseInsertPresetArtworkViewport(input),
    'unsupported',
    'owner-capability-unsupported',
  )
  assert.equal(result.error.capability, 'zoom')

  input.source = null
  const deferred = assertSuccess(planCaseInsertPresetArtworkViewport(input))
  assert.equal(deferred.resolution, 'deferred')
  assert.deepEqual(deferred.pendingCapabilityChecks, ['zoom'])
})

test('binds deterministic identities to assignment, viewport, intent, source, and capability evidence', () => {
  const input = planningInput()
  const first = assertSuccess(planCaseInsertPresetArtworkViewport(input))
  const second = assertSuccess(planCaseInsertPresetArtworkViewport(input))
  assert.equal(first.identity, second.identity)
  assert.equal(first.viewport.identity, second.viewport.identity)
  assert.equal(first.intent.identity, second.intent.identity)

  const otherSource = planningInput()
  assert.ok(otherSource.source)
  otherSource.source.assetIdentity = 'asset:sha256:other'
  const sourcePlan = assertSuccess(
    planCaseInsertPresetArtworkViewport(otherSource),
  )
  assert.notEqual(first.identity, sourcePlan.identity)
  assert.equal(first.viewport.identity, sourcePlan.viewport.identity)
  assert.equal(first.intent.identity, sourcePlan.intent.identity)

  const otherIntent = withFitting(planningInput(), { mode: 'cover' })
  const intentPlan = assertSuccess(
    planCaseInsertPresetArtworkViewport(otherIntent),
  )
  assert.notEqual(first.identity, intentPlan.identity)
  assert.equal(first.viewport.identity, intentPlan.viewport.identity)
  assert.notEqual(first.intent.identity, intentPlan.intent.identity)

  const otherAssignment = planningInput(1)
  const assignmentPlan = assertSuccess(
    planCaseInsertPresetArtworkViewport(otherAssignment),
  )
  assert.notEqual(first.viewport.identity, assignmentPlan.viewport.identity)
  assert.notEqual(first.identity, assignmentPlan.identity)

  const otherViewport = planningInput()
  otherViewport.action.viewport.centerYPercent = 77
  const viewportPlan = assertSuccess(
    planCaseInsertPresetArtworkViewport(otherViewport),
  )
  assert.notEqual(first.viewport.identity, viewportPlan.viewport.identity)
  assert.notEqual(first.identity, viewportPlan.identity)

  const otherCapabilities = planningInput()
  otherCapabilities.capabilities.cover = false
  const capabilityPlan = assertSuccess(
    planCaseInsertPresetArtworkViewport(otherCapabilities),
  )
  assert.equal(first.viewport.identity, capabilityPlan.viewport.identity)
  assert.equal(first.intent.identity, capabilityPlan.intent.identity)
  assert.notEqual(first.identity, capabilityPlan.identity)

  const anyTemplateCompatibility = planningInput()
  anyTemplateCompatibility.template.presetCompatibility = {
    presetId: JEWEL_CASE_ESSENTIALS_CASE_PRESET_ID,
    presetRevision: JEWEL_CASE_ESSENTIALS_CASE_PRESET_REVISION,
    mode: 'any-case-template',
  }
  const compatibilityPlan = assertSuccess(
    planCaseInsertPresetArtworkViewport(anyTemplateCompatibility),
  )
  assert.deepEqual(first.viewport.rectMm, compatibilityPlan.viewport.rectMm)
  assert.notEqual(first.viewport.identity, compatibilityPlan.viewport.identity)
  assert.notEqual(first.identity, compatibilityPlan.identity)
})

test('keeps null and literal null provenance distinct in plan and review identities', () => {
  const absentProvenance = withFitting(planningInput(), { mode: 'cover' })
  const literalProvenance = withFitting(planningInput(), { mode: 'cover' })
  assert.ok(absentProvenance.source && literalProvenance.source)
  absentProvenance.source.provenanceIdentity = null
  literalProvenance.source.provenanceIdentity = 'null'

  const absent = assertSuccess(
    planCaseInsertPresetArtworkViewport(absentProvenance),
  )
  const literal = assertSuccess(
    planCaseInsertPresetArtworkViewport(literalProvenance),
  )
  assert.equal(absent.viewport.identity, literal.viewport.identity)
  assert.equal(absent.intent.identity, literal.intent.identity)
  assert.notEqual(absent.identity, literal.identity)
  assert.equal(absent.warnings.length, 1)
  assert.equal(literal.warnings.length, 1)
  assert.notEqual(absent.warnings[0]!.id, literal.warnings[0]!.id)
  assert.notEqual(
    absent.materialConsentRequirements[0]!.id,
    literal.materialConsentRequirements[0]!.id,
  )
})

test('rejects unpaired source-identity surrogates and supports valid pairs deterministically', () => {
  const highSurrogate = planningInput()
  assert.ok(highSurrogate.source)
  highSurrogate.source.assetIdentity = `asset:${'\uD800'}`
  assertFailure(
    planCaseInsertPresetArtworkViewport(highSurrogate),
    'invalid',
    'invalid-source-identity',
    'source',
  )

  const lowSurrogate = planningInput()
  assert.ok(lowSurrogate.source)
  lowSurrogate.source.provenanceIdentity = `source:${'\uDC00'}`
  assertFailure(
    planCaseInsertPresetArtworkViewport(lowSurrogate),
    'invalid',
    'invalid-source-identity',
    'source',
  )

  const paired = withFitting(planningInput(), { mode: 'cover' })
  assert.ok(paired.source)
  paired.source.assetIdentity = `asset:${'\uD83D\uDE00'}`
  paired.source.provenanceIdentity = `source:${'\uD83D\uDE80'}`
  const first = assertSuccess(planCaseInsertPresetArtworkViewport(paired))
  const second = assertSuccess(planCaseInsertPresetArtworkViewport(paired))
  assert.equal(first.identity, second.identity)
  assert.equal(first.warnings[0]!.id, second.warnings[0]!.id)
  assert.equal(
    first.materialConsentRequirements[0]!.id,
    second.materialConsentRequirements[0]!.id,
  )
})

test('does not mutate inputs and deeply freezes success and failure results', () => {
  const input = planningInput()
  assert.ok(input.source)
  input.source.contentBounds = { x: 1, y: 2, width: 1590, height: 890 }
  const before = structuredClone(input)
  const result = planCaseInsertPresetArtworkViewport(input)
  assert.deepEqual(input, before)
  assertDeeplyFrozen(result)

  input.source.assetIdentity = 'caller-mutated-after-planning'
  const plan = assertSuccess(result)
  assert.notEqual(plan.source?.assetIdentity, input.source.assetIdentity)

  const failureInput = mutableClone(planningInput())
  ;((failureInput.action as MutableRecord).viewport as MutableRecord)
    .widthPercent = 0
  const failureBefore = structuredClone(failureInput)
  const failure = planCaseInsertPresetArtworkViewport(failureInput)
  assert.deepEqual(failureInput, failureBefore)
  assertDeeplyFrozen(failure)
})

test('reconstructs and returns only canonical planner success evidence', () => {
  const resolved = planCaseInsertPresetArtworkViewport(planningInput())
  assert.equal(resolved.ok, true)
  const resolvedValidation =
    validateCaseInsertPresetArtworkViewportPlanningSuccess(resolved)
  assert.equal(resolvedValidation.ok, true)
  if (!resolvedValidation.ok) assert.fail('Expected canonical resolved evidence.')
  assert.deepEqual(resolvedValidation.canonicalResult, resolved)
  assert.notEqual(resolvedValidation.canonicalResult, resolved)
  assertDeeplyFrozen(resolvedValidation)

  const deferredInput = planningInput()
  deferredInput.source = null
  const deferred = planCaseInsertPresetArtworkViewport(deferredInput)
  const deferredValidation =
    validateCaseInsertPresetArtworkViewportPlanningSuccess(deferred)
  assert.equal(deferredValidation.ok, true)
  if (!deferredValidation.ok) assert.fail('Expected canonical deferred evidence.')
  assert.deepEqual(deferredValidation.canonicalResult, deferred)

  const planningFailure = planCaseInsertPresetArtworkViewport(null)
  const failureValidation =
    validateCaseInsertPresetArtworkViewportPlanningSuccess(planningFailure)
  assert.equal(failureValidation.ok, false)
  if (failureValidation.ok) assert.fail('Expected failure evidence rejection.')
  assert.equal(failureValidation.error.code, 'evidence-not-success')
})

test('rejects tampered and hostile planner success evidence', () => {
  const canonical = planCaseInsertPresetArtworkViewport(planningInput())
  assert.equal(canonical.ok, true)

  const mutations: Array<(value: MutableRecord) => void> = [
    (value) => {
      const plan = value.plan as MutableRecord
      plan.identity = 'case:preset-artwork-fitting-plan:v1:tampered'
    },
    (value) => {
      const plan = value.plan as MutableRecord
      const viewport = plan.viewport as MutableRecord
      viewport.physicalWidthMm = (viewport.physicalWidthMm as number) + 1
    },
    (value) => {
      const plan = value.plan as MutableRecord
      const assignment = plan.assignment as MutableRecord
      assignment.object = { kind: 'repeated', id: 'other-artwork-slot' }
    },
    (value) => {
      const plan = value.plan as MutableRecord
      const capabilities = plan.capabilities as MutableRecord
      capabilities.zoom = !capabilities.zoom
    },
    (value) => {
      const plan = value.plan as MutableRecord
      plan.unexpected = true
    },
  ]

  for (const mutate of mutations) {
    const tampered = structuredClone(canonical) as MutableRecord
    mutate(tampered)
    const validation =
      validateCaseInsertPresetArtworkViewportPlanningSuccess(tampered)
    assert.equal(validation.ok, false)
    if (validation.ok) assert.fail('Expected tampered evidence rejection.')
    assert.equal(validation.error.code, 'evidence-noncanonical')
  }

  const cyclic = structuredClone(canonical) as MutableRecord
  cyclic.self = cyclic
  const accessor = structuredClone(canonical) as MutableRecord
  Object.defineProperty(accessor, 'computed', { get: () => true })
  for (const hostile of [cyclic, accessor]) {
    const validation =
      validateCaseInsertPresetArtworkViewportPlanningSuccess(hostile)
    assert.equal(validation.ok, false)
    if (validation.ok) assert.fail('Expected hostile evidence rejection.')
    assert.equal(validation.error.code, 'evidence-not-plain')
  }
})

test('rejects cyclic, aliased, accessor, function, symbol, and BigInt hostile inputs', () => {
  const cyclic = mutableClone(planningInput())
  cyclic.self = cyclic

  const aliased = mutableClone(planningInput())
  const shared = { proof: true }
  aliased.left = shared
  aliased.right = shared

  const accessor = mutableClone(planningInput())
  Object.defineProperty(accessor, 'computed', { get: () => true })

  const hostile: unknown[] = [
    cyclic,
    aliased,
    accessor,
    { ...planningInput(), extra: () => true },
    { ...planningInput(), extra: Symbol('hostile') },
    { ...planningInput(), extra: 1n },
  ]
  for (const value of hostile) {
    assertFailure(
      planCaseInsertPresetArtworkViewport(value),
      'invalid',
      'input-not-plain',
      '$',
    )
  }
})

test('keeps action and plan versions separate from unchanged definition, catalog, schema, and native request identities', () => {
  assert.equal(CASE_INSERT_PRESET_ARTWORK_VIEWPORT_ACTION_KIND,
    'sbls/case-insert-preset-artwork-viewport-action')
  assert.equal(CASE_INSERT_PRESET_ARTWORK_VIEWPORT_ACTION_FORMAT_VERSION, 1)
  assert.equal(CASE_INSERT_PRESET_ARTWORK_VIEWPORT_PLAN_KIND,
    'sbls/case-insert-preset-artwork-viewport-plan')
  assert.equal(CASE_INSERT_PRESET_ARTWORK_VIEWPORT_PLAN_FORMAT_VERSION, 1)

  assert.equal(JEWEL_CASE_ESSENTIALS_CASE_PRESET.kind,
    CASE_INSERT_PRESET_DEFINITION_KIND)
  assert.equal(JEWEL_CASE_ESSENTIALS_CASE_PRESET.formatVersion,
    CASE_INSERT_PRESET_FORMAT_VERSION)
  assert.equal(JEWEL_CASE_ESSENTIALS_CASE_PRESET.id,
    'builtin:case-preset:jewel-case-essentials')
  assert.equal(JEWEL_CASE_ESSENTIALS_CASE_PRESET.revision, 1)
  assert.equal(
    createHash('sha256')
      .update(JSON.stringify(JEWEL_CASE_ESSENTIALS_CASE_PRESET))
      .digest('hex'),
    '895ec63485daea765bddcf00dadb13c397c1dd0b6c4ba0c29e8d542e9d36d3f1',
  )
  assert.deepEqual(
    CASE_INSERT_PRESET_CATALOG.getExact(
      JEWEL_CASE_ESSENTIALS_CASE_PRESET_ID,
      JEWEL_CASE_ESSENTIALS_CASE_PRESET_REVISION,
    ),
    JEWEL_CASE_ESSENTIALS_CASE_PRESET,
  )
  assert.deepEqual(CASE_INSERT_PRESET_CATALOG.list(), [{
    id: JEWEL_CASE_ESSENTIALS_CASE_PRESET_ID,
    revision: JEWEL_CASE_ESSENTIALS_CASE_PRESET_REVISION,
    name: 'Jewel Case Essentials',
    surface: 'case-insert',
    source: 'builtin',
  }])
  assert.deepEqual(
    screenshotSlot().assignments.map(({ id, contentRegion }) => ({
      id,
      contentRegion,
    })),
    [
      {
        id: 'case:preset-assignment:back-screenshot-one',
        contentRegion: {
          centerXPercent: 17,
          centerYPercent: 78,
          widthPercent: 26,
          heightPercent: 16,
        },
      },
      {
        id: 'case:preset-assignment:back-screenshot-three',
        contentRegion: {
          centerXPercent: 83,
          centerYPercent: 78,
          widthPercent: 26,
          heightPercent: 16,
        },
      },
      {
        id: 'case:preset-assignment:back-screenshot-two',
        contentRegion: {
          centerXPercent: 50,
          centerYPercent: 78,
          widthPercent: 26,
          heightPercent: 16,
        },
      },
    ],
  )
  assert.ok(screenshotSlot().assignments.every(
    (assignment) => !('actionRegion' in assignment),
  ))
  assert.equal(CURRENT_PROJECT_SCHEMA_VERSION, '0.4.0')
  assert.equal(CASE_INSERT_LAYOUT_PRESET_PROJECT_STATE_VERSION, 1)
  assert.equal(PROJECT_PACKAGE_WRITE_REQUEST_MAGIC, 'SBLSPSV1')
})
