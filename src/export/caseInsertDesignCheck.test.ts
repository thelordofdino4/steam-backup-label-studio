import assert from 'node:assert/strict'
import test from 'node:test'
import type {
  CaseInsertBrandingSourceCatalog,
} from '../caseInsert/brandingSlotSources.ts'
import {
  createDefaultCaseInsertImageSlot,
} from '../caseInsert/defaults.ts'
import { createDefaultProjectJewelCaseState } from '../project/projectCaseInsert.ts'
import { createDefaultProjectLogoAssets } from '../project/projectLogoAssets.ts'
import { createDefaultProjectMediaMark } from '../project/projectMediaMark.ts'
import { createDefaultProjectMetadata } from '../project/projectMetadata.ts'
import { createDefaultProjectPlatformMarks } from '../project/projectPlatformMarks.ts'
import { createDefaultProjectRatingBadge } from '../project/projectRatingBadge.ts'
import { createDefaultProjectTechnicalMarks } from '../project/projectTechnicalMarks.ts'
import type { BackgroundImageSize, ProjectCaseInsertImageSlot } from '../project/projectTypes.ts'
import { buildCaseInsertDesignCheckSummary } from './caseInsertDesignCheck.ts'
import { GUIDE_MARKS_EXPORT_WARNING } from './preflightWarnings.ts'

function createDefaultBrandingSources(): CaseInsertBrandingSourceCatalog {
  return {
    projectMetadata: createDefaultProjectMetadata(),
    projectLogoAssets: createDefaultProjectLogoAssets(),
    projectRatingBadge: createDefaultProjectRatingBadge(),
    projectMediaMark: createDefaultProjectMediaMark(),
    projectPlatformMarks: createDefaultProjectPlatformMarks(),
    projectTechnicalMarks: createDefaultProjectTechnicalMarks(),
  }
}

function createImageSlot(
  slot: ProjectCaseInsertImageSlot,
  size: BackgroundImageSize,
  sourceId = slot.id,
): ProjectCaseInsertImageSlot {
  return {
    ...slot,
    enabled: true,
    imageDataUrl: `data:image/png;base64,${slot.id}`,
    imageSize: size,
    imageSource: {
      source: 'custom',
      sourceId,
      sourceLabel: slot.label,
    },
  }
}

function createCustomSlot(
  id: string,
  label: string,
  sourceId = id,
) {
  const slot = createImageSlot(
    createDefaultCaseInsertImageSlot(id, label, { enabled: true }),
    { width: 512, height: 256 },
    sourceId,
  )

  return {
    ...slot,
    layout: {
      ...slot.layout,
      scale: 0.4,
      x: 50,
      y: 74,
    },
  }
}

test('clean case insert design check has no warnings', () => {
  const project = createDefaultProjectJewelCaseState('Test Game')
  const summary = buildCaseInsertDesignCheckSummary({
    caseInsert: {
      ...project,
      templates: {
        ...project.templates,
        cover: {
          ...project.templates.cover,
          background: createImageSlot(
            project.templates.cover.background,
            { width: 1414, height: 1414 },
          ),
          titleArtwork: createImageSlot(
            project.templates.cover.titleArtwork,
            { width: 1024, height: 360 },
          ),
          logoSlots: [
            createCustomSlot(
              'cover-developer-logo',
              'Developer logo',
              'case-logo:manual:developer',
            ),
          ],
          markSlots: [
            createCustomSlot(
              'cover-rating-mark',
              'Rating badge',
              'case-rating:manual:rating',
            ),
          ],
        },
      },
    },
    activeTemplatePane: 'cover',
    brandingSources: createDefaultBrandingSources(),
  })

  assert.equal(summary.hasWarnings, false)
  assert.deepEqual(summary.warnings, [])
  assert.deepEqual(summary.notes, [])
  assert.ok(summary.items.every((item) => item.status === 'pass'))
  assert.match(summary.message, /No cover sheet design warnings found/)
})

test('case insert design check warns when cover guide anatomy is missing', () => {
  const project = createDefaultProjectJewelCaseState('Test Game')
  const summary = buildCaseInsertDesignCheckSummary({
    caseInsert: {
      ...project,
      templates: {
        ...project.templates,
        cover: {
          ...project.templates.cover,
          background: createImageSlot(
            project.templates.cover.background,
            { width: 1414, height: 1414 },
          ),
        },
      },
    },
    activeTemplatePane: 'cover',
    brandingSources: createDefaultBrandingSources(),
  })

  assert.equal(summary.hasWarnings, true)
  assert.ok(summary.warnings.includes(
    'Add a visible game title or title/logo artwork so the front cover is identifiable at a glance.',
  ))
  assert.ok(summary.warnings.includes(
    'Add at least one front-cover rating badge, media format mark, platform mark, or technical logo.',
  ))
  assert.ok(summary.warnings.includes(
    "Add a developer, publisher, or related company logo to anchor the front cover's branding.",
  ))
})

test('case insert design check reuses visible design warnings without guide export warning', () => {
  const project = createDefaultProjectJewelCaseState('Test Game')
  const summary = buildCaseInsertDesignCheckSummary({
    caseInsert: {
      ...project,
      export: {
        ...project.export,
        guideIds: ['frontSafeBounds'],
      },
    },
    activeTemplatePane: 'cover',
    brandingSources: createDefaultBrandingSources(),
  })

  assert.equal(summary.hasWarnings, true)
  assert.ok(!summary.warnings.includes(GUIDE_MARKS_EXPORT_WARNING))
  assert.ok(summary.warnings.includes(
    'Add front background artwork so the cover does not export as mostly blank space.',
  ))
  assert.ok(summary.notes.includes(
    'Cover Sheet has no background image; uncovered areas will export as blank white.',
  ))
})

test('case insert design check keeps print-quality risks as notes', () => {
  const project = createDefaultProjectJewelCaseState('Test Game')
  const summary = buildCaseInsertDesignCheckSummary({
    caseInsert: {
      ...project,
      templates: {
        ...project.templates,
        cover: {
          ...project.templates.cover,
          background: createImageSlot(
            project.templates.cover.background,
            { width: 100, height: 100 },
          ),
          titleArtwork: createImageSlot(
            project.templates.cover.titleArtwork,
            { width: 1024, height: 360 },
          ),
          logoSlots: [
            createCustomSlot(
              'cover-developer-logo',
              'Developer logo',
              'case-logo:manual:developer',
            ),
          ],
          markSlots: [
            createCustomSlot(
              'cover-rating-mark',
              'Rating badge',
              'case-rating:manual:rating',
            ),
          ],
        },
      },
    },
    activeTemplatePane: 'cover',
    brandingSources: createDefaultBrandingSources(),
  })

  assert.equal(summary.hasWarnings, false)
  assert.deepEqual(summary.warnings, [])
  assert.ok(summary.notes.some((note) =>
    /Cover Sheet background is 100 x 100px/.test(note)))
})

test('case insert design check warns when back-cover guide anatomy is missing', () => {
  const project = createDefaultProjectJewelCaseState('Test Game')
  const summary = buildCaseInsertDesignCheckSummary({
    caseInsert: project,
    activeTemplatePane: 'tray',
    brandingSources: createDefaultBrandingSources(),
  })

  assert.equal(summary.hasWarnings, true)
  assert.ok(summary.warnings.includes(
    'Add a short game description so the back cover explains what the game is.',
  ))
  assert.ok(summary.warnings.includes(
    'Add at least one screenshot or supporting artwork slot so the back cover is not only text.',
  ))
  assert.ok(summary.warnings.includes(
    'Add copyright/legal text for attribution and usage context.',
  ))
  assert.ok(summary.warnings.includes(
    'Add a company logo to both spines so shelf-facing edges carry the case branding.',
  ))
})
