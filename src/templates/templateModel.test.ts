import assert from 'node:assert/strict'
import test from 'node:test'
import { discTemplates } from './discTemplates.ts'
import {
  getTemplatePhysicalSize,
  getTemplateRegion,
  isDiscTemplate,
  isRectangularPrintTemplate,
  validateRectangularPrintTemplate,
} from './templateModel.ts'
import type { RectangularPrintTemplate } from '../types/template.ts'

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
