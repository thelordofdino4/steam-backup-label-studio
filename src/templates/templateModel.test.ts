import assert from 'node:assert/strict'
import test from 'node:test'
import { EXPORT_DPI, MM_PER_INCH, buildCustomDiscTemplate } from '../disc/geometry.ts'
import type { DiscTemplateGeometryGuardrailState } from '../layout/discTemplateGeometryGuardrail.ts'
import {
  CUSTOM_OUTER_DIAMETER_MAX_MM,
  createDefaultDiscTemplateState,
  createDiscTemplateGuideOverlay,
  createDiscTemplateSelectionChange,
  getDiscTemplateExportPreviewFallbackSize,
  getSelectedDiscTemplate,
  restoreDiscTemplateRuntimeState,
  updateCustomDiscTemplateDimension,
} from './discTemplateStateModel.ts'
import { discTemplates } from './discTemplates.ts'
import {
  getTemplatePhysicalSize,
  getTemplateRegion,
  isDiscTemplate,
  isRectangularPrintTemplate,
  validateRectangularPrintTemplate,
} from './templateModel.ts'
import type { RectangularPrintTemplate } from '../types/template.ts'

function assertApproximatelyEqual(actual: number, expected: number) {
  assert.ok(
    Math.abs(actual - expected) < 0.000001,
    `Expected ${actual} to approximately equal ${expected}`,
  )
}

function createRectangularFixture(): RectangularPrintTemplate {
  return {
    id: 'testJewelCase',
    name: 'Test jewel case insert',
    type: 'caseInsert',
    variant: 'jewelCase',
    units: 'mm',
    widthMm: 240,
    heightMm: 120,
    regions: [
      {
        id: 'bleed',
        name: 'Bleed area',
        role: 'bleed',
        bounds: { xMm: 0, yMm: 0, widthMm: 240, heightMm: 120 },
      },
      {
        id: 'trim',
        name: 'Trim area',
        role: 'trim',
        bounds: { xMm: 3, yMm: 3, widthMm: 234, heightMm: 114 },
        parentRegionId: 'bleed',
      },
      {
        id: 'back',
        name: 'Back cover',
        role: 'back',
        bounds: { xMm: 3, yMm: 3, widthMm: 105, heightMm: 114 },
        parentRegionId: 'trim',
      },
      {
        id: 'spine',
        name: 'Spine',
        role: 'spine',
        bounds: { xMm: 108, yMm: 3, widthMm: 24, heightMm: 114 },
        parentRegionId: 'trim',
      },
      {
        id: 'front',
        name: 'Front cover',
        role: 'front',
        bounds: { xMm: 132, yMm: 3, widthMm: 105, heightMm: 114 },
        parentRegionId: 'trim',
      },
      {
        id: 'frontSafe',
        name: 'Front safe area',
        role: 'safe',
        bounds: { xMm: 136, yMm: 7, widthMm: 97, heightMm: 106 },
        parentRegionId: 'front',
      },
    ],
    guides: [
      {
        id: 'trimBounds',
        name: 'Trim bounds',
        type: 'regionBounds',
        regionId: 'trim',
        visibleByDefault: true,
      },
      {
        id: 'frontFold',
        name: 'Front fold',
        type: 'foldLine',
        visibleByDefault: true,
        line: { orientation: 'vertical', offsetMm: 132, startMm: 3, endMm: 117 },
      },
      {
        id: 'spineLeft',
        name: 'Spine left boundary',
        type: 'spineLine',
        visibleByDefault: true,
        line: { orientation: 'vertical', offsetMm: 108, startMm: 3, endMm: 117 },
      },
    ],
  }
}

test('disc and rectangular template types stay distinct', () => {
  const discTemplate = discTemplates.standardPrintableDisc
  const rectangularTemplate = createRectangularFixture()

  assert.equal(isDiscTemplate(discTemplate), true)
  assert.equal(isRectangularPrintTemplate(discTemplate), false)
  assert.equal(isDiscTemplate(rectangularTemplate), false)
  assert.equal(isRectangularPrintTemplate(rectangularTemplate), true)
})

test('shared physical size helper preserves disc dimensions', () => {
  assert.deepEqual(getTemplatePhysicalSize(discTemplates.standardPrintableDisc), {
    widthMm: 120,
    heightMm: 120,
  })
})

test('disc template guide overlay derives printable guide geometry from the selected template', () => {
  const template = buildCustomDiscTemplate(discTemplates.standardPrintableDisc, {
    outerDiameterMm: 100,
    physicalCenterHoleDiameterMm: 20,
    innerHoleDiameterMm: 30,
    printableDiameterMm: 90,
    safeDiameterMm: 80,
  })

  const overlay = createDiscTemplateGuideOverlay(template)

  assertApproximatelyEqual(overlay.innerPrintableBoundaryPercent, 30)
  assertApproximatelyEqual(overlay.physicalCenterHolePercent, 20)
  assertApproximatelyEqual(overlay.printableInsetPercent, 5)
  assertApproximatelyEqual(overlay.safeInsetPercent, 10)
})

test('disc template export preview fallback follows print geometry at export DPI', () => {
  const template = discTemplates.standardPrintableDisc

  assert.equal(
    getDiscTemplateExportPreviewFallbackSize(template),
    Math.round((template.outerDiameterMm / MM_PER_INCH) * EXPORT_DPI),
  )
})

test('disc template state defaults to the standard template with custom dimensions prepared', () => {
  const state = createDefaultDiscTemplateState()

  assert.equal(state.selectedDiscTemplateId, 'standardPrintableDisc')
  assert.equal(getSelectedDiscTemplate(state), discTemplates.standardPrintableDisc)
  assert.equal(state.customDiscTemplate.id, 'custom')
  assert.equal(
    state.customDiscTemplate.outerDiameterMm,
    discTemplates.standardPrintableDisc.outerDiameterMm,
  )
})

test('disc template selection returns the selected template and status copy', () => {
  const customDiscTemplate = buildCustomDiscTemplate(
    discTemplates.standardPrintableDisc,
    { safeDiameterMm: 90 },
  )
  const change = createDiscTemplateSelectionChange(
    {
      selectedDiscTemplateId: 'standardPrintableDisc',
      customDiscTemplate,
    },
    'custom',
  )

  assert.equal(change.state.selectedDiscTemplateId, 'custom')
  assert.equal(change.selectedTemplate, customDiscTemplate)
  assert.equal(
    change.statusMessage,
    'Custom disc dimensions enabled. Edit the numeric fields below.',
  )
})

test('disc template restore preserves existing custom dimensions when a standard project has none', () => {
  const customDiscTemplate = buildCustomDiscTemplate(
    discTemplates.standardPrintableDisc,
    { outerDiameterMm: 110 },
  )
  const restored = restoreDiscTemplateRuntimeState(
    {
      selectedDiscTemplateId: 'custom',
      customDiscTemplate,
    },
    {
      selectedDiscTemplateId: 'standardPrintableDisc',
    },
  )

  assert.equal(restored.selectedDiscTemplateId, 'standardPrintableDisc')
  assert.equal(restored.customDiscTemplate, customDiscTemplate)
})

test('custom disc dimension updates normalize values and defer clamping until custom is selected', () => {
  const result = updateCustomDiscTemplateDimension({
    state: createDefaultDiscTemplateState(),
    field: 'outerDiameterMm',
    value: '400',
    geometryGuardrailState: {} as DiscTemplateGeometryGuardrailState,
    validateGeometry: () => ({ allowed: true, blockingElementLabels: [] }),
  })

  assert.equal(result.changed, true)
  assert.equal(result.statusMessage, null)
  assert.equal(result.selectedTemplateToClamp, null)
  assert.equal(
    result.state.customDiscTemplate.outerDiameterMm,
    CUSTOM_OUTER_DIAMETER_MAX_MM,
  )
})

test('custom disc dimension updates return a clamp target when custom is active', () => {
  const result = updateCustomDiscTemplateDimension({
    state: {
      ...createDefaultDiscTemplateState(),
      selectedDiscTemplateId: 'custom',
    },
    field: 'safeDiameterMm',
    value: '90',
    geometryGuardrailState: {} as DiscTemplateGeometryGuardrailState,
    validateGeometry: () => ({ allowed: true, blockingElementLabels: [] }),
  })

  assert.equal(result.changed, true)
  assert.equal(
    result.selectedTemplateToClamp,
    result.state.customDiscTemplate,
  )
})

test('custom disc dimension updates keep prior state when guardrails block geometry', () => {
  const state = createDefaultDiscTemplateState()
  const result = updateCustomDiscTemplateDimension({
    state,
    field: 'safeDiameterMm',
    value: '40',
    geometryGuardrailState: {} as DiscTemplateGeometryGuardrailState,
    validateGeometry: () => ({
      allowed: false,
      blockingElementLabels: ['rating badge', 'developer logo'],
    }),
  })

  assert.equal(result.changed, false)
  assert.equal(result.state, state)
  assert.equal(result.selectedTemplateToClamp, null)
  assert.equal(
    result.statusMessage,
    'Custom geometry needs more printable space for rating badge and 1 more.',
  )
})

test('rectangular template model expresses front, back, spine, trim, bleed, and safe regions', () => {
  const template = createRectangularFixture()

  assert.deepEqual(getTemplatePhysicalSize(template), {
    widthMm: 240,
    heightMm: 120,
  })
  assert.equal(getTemplateRegion(template, 'front')?.role, 'front')
  assert.equal(getTemplateRegion(template, 'back')?.role, 'back')
  assert.equal(getTemplateRegion(template, 'spine')?.role, 'spine')
  assert.equal(getTemplateRegion(template, 'bleed')?.role, 'bleed')
  assert.equal(getTemplateRegion(template, 'trim')?.role, 'trim')
  assert.equal(getTemplateRegion(template, 'frontSafe')?.role, 'safe')
})

test('rectangular template validation accepts named regions and guides inside the canvas', () => {
  const result = validateRectangularPrintTemplate(createRectangularFixture())

  assert.equal(result.valid, true)
  assert.deepEqual(result.errors, [])
})

test('rectangular template validation catches regions and guides outside the canvas', () => {
  const template = createRectangularFixture()
  const result = validateRectangularPrintTemplate({
    ...template,
    regions: [
      ...template.regions,
      {
        id: 'badRegion',
        name: 'Bad region',
        role: 'safe',
        bounds: { xMm: 230, yMm: 0, widthMm: 20, heightMm: 20 },
      },
    ],
    guides: [
      ...template.guides,
      {
        id: 'badGuide',
        name: 'Bad guide',
        type: 'foldLine',
        visibleByDefault: true,
        line: {
          orientation: 'vertical',
          offsetMm: 300,
          startMm: 0,
          endMm: 20,
        },
      },
    ],
  })

  assert.equal(result.valid, false)
  assert.ok(
    result.errors.includes(
      'Region "badRegion" must stay inside the template canvas.',
    ),
  )
  assert.ok(
    result.errors.includes(
      'Guide "badGuide" line offset must stay inside the canvas.',
    ),
  )
})
