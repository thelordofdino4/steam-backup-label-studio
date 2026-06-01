import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DEFAULT_DISC_TEXT_SETTINGS,
  createDefaultDiscTextLayout,
  createDefaultDiscTextValues,
} from '../discText.ts'
import { buildCustomDiscTemplate } from '../discGeometry.ts'
import { createDefaultProjectLogoAssets } from '../project/projectLogoAssets.ts'
import { createDefaultProjectMetadata } from '../project/projectMetadata.ts'
import {
  createDefaultProjectMediaMark,
  createDefaultProjectPlatformMarks,
  updatePlatformMarkToggle,
} from '../project/projectMediaMark.ts'
import { createDefaultProjectRatingBadge } from '../project/projectRatingBadge.ts'
import { discTemplates } from '../templates/discTemplates.ts'
import {
  validateDiscTemplateGeometryGuardrail,
  type DiscTemplateGeometryGuardrailState,
} from './discTemplateGeometryGuardrail.ts'

const standardTemplate = discTemplates.standardPrintableDisc

function measureText(text: string, font: string) {
  const fontSizeMatch = font.match(/(\d+(?:\.\d+)?)px/)
  const fontSize = fontSizeMatch ? Number(fontSizeMatch[1]) : 1

  return text.length * fontSize * 0.55
}

function createGuardrailState(
  overrides: Partial<DiscTemplateGeometryGuardrailState> = {},
): DiscTemplateGeometryGuardrailState {
  return {
    discTextSettings: DEFAULT_DISC_TEXT_SETTINGS,
    discTextValues: createDefaultDiscTextValues(),
    discTextTitle: 'Untitled Steam Backup Label',
    discTextLayout: createDefaultDiscTextLayout('top', standardTemplate),
    projectLogoAssets: createDefaultProjectLogoAssets(standardTemplate),
    projectMetadata: createDefaultProjectMetadata(),
    projectRatingBadge: createDefaultProjectRatingBadge(standardTemplate),
    projectMediaMark: createDefaultProjectMediaMark(standardTemplate),
    projectPlatformMarks: createDefaultProjectPlatformMarks(),
    ...overrides,
  }
}

function enableRatingBadge() {
  const ratingBadge = createDefaultProjectRatingBadge(standardTemplate)

  return {
    ...ratingBadge,
    layout: {
      ...ratingBadge.layout,
      enabled: true,
    },
  }
}

test('custom geometry guardrail allows valid edits for enabled movable elements', () => {
  const template = buildCustomDiscTemplate(standardTemplate, {
    safeDiameterMm: 100,
  })
  const result = validateDiscTemplateGeometryGuardrail(
    template,
    createGuardrailState({
      projectRatingBadge: enableRatingBadge(),
    }),
    measureText,
  )

  assert.equal(result.allowed, true)
  assert.deepEqual(result.blockingElementLabels, [])
})

test('custom geometry guardrail blocks safe-zone shrinkage that cannot fit an enabled badge', () => {
  const template = buildCustomDiscTemplate(standardTemplate, {
    safeDiameterMm: 40,
  })
  const result = validateDiscTemplateGeometryGuardrail(
    template,
    createGuardrailState({
      projectRatingBadge: enableRatingBadge(),
    }),
    measureText,
  )

  assert.equal(result.allowed, false)
  assert.ok(result.blockingElementLabels.includes('rating badge'))
})

test('custom geometry guardrail blocks inner hub growth that cannot fit an enabled badge', () => {
  const template = buildCustomDiscTemplate(standardTemplate, {
    innerHoleDiameterMm: 90,
  })
  const result = validateDiscTemplateGeometryGuardrail(
    template,
    createGuardrailState({
      projectRatingBadge: enableRatingBadge(),
    }),
    measureText,
  )

  assert.equal(result.allowed, false)
  assert.ok(result.blockingElementLabels.includes('rating badge'))
})

test('custom geometry guardrail uses rendered bounds instead of center points', () => {
  const template = buildCustomDiscTemplate(standardTemplate, {
    physicalCenterHoleDiameterMm: 0,
    innerHoleDiameterMm: 0,
    printableDiameterMm: 20,
    safeDiameterMm: 20,
  })
  const logoAssets = createDefaultProjectLogoAssets(standardTemplate)
  const result = validateDiscTemplateGeometryGuardrail(
    template,
    createGuardrailState({
      projectLogoAssets: {
        ...logoAssets,
        developerLogoLayout: {
          ...logoAssets.developerLogoLayout,
          enabled: true,
          x: 50,
          y: 50,
        },
      },
    }),
    measureText,
  )

  assert.equal(result.allowed, false)
  assert.ok(result.blockingElementLabels.includes('developer logo'))
})

test('custom geometry guardrail includes enabled straight disc text bounds', () => {
  const template = buildCustomDiscTemplate(standardTemplate, {
    innerHoleDiameterMm: 100,
  })
  const textLayout = createDefaultDiscTextLayout('top', standardTemplate)
  const result = validateDiscTemplateGeometryGuardrail(
    template,
    createGuardrailState({
      discTextSettings: {
        ...DEFAULT_DISC_TEXT_SETTINGS,
        title: true,
      },
      discTextTitle: 'CENTER TITLE',
      discTextLayout: {
        ...textLayout,
        title: {
          ...textLayout.title,
          y: 50,
        },
      },
    }),
    measureText,
  )

  assert.equal(result.allowed, false)
  assert.ok(result.blockingElementLabels.includes('Game title'))
})

test('custom geometry guardrail includes enabled operating system marks', () => {
  const template = buildCustomDiscTemplate(standardTemplate, {
    innerHoleDiameterMm: 90,
  })
  const result = validateDiscTemplateGeometryGuardrail(
    template,
    createGuardrailState({
      projectPlatformMarks: updatePlatformMarkToggle(
        createDefaultProjectPlatformMarks(),
        'windows',
        true,
        standardTemplate,
      ),
    }),
    measureText,
  )

  assert.equal(result.allowed, false)
  assert.ok(result.blockingElementLabels.includes('Windows operating system mark'))
})

test('custom geometry guardrail ignores hidden movable element state', () => {
  const template = buildCustomDiscTemplate(standardTemplate, {
    physicalCenterHoleDiameterMm: 0,
    innerHoleDiameterMm: 0,
    printableDiameterMm: 12,
    safeDiameterMm: 12,
  })
  const result = validateDiscTemplateGeometryGuardrail(
    template,
    createGuardrailState(),
    measureText,
  )

  assert.equal(result.allowed, true)
})
