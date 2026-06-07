import assert from 'node:assert/strict'
import test from 'node:test'
import type {
  CaseInsertBrandingSourceCatalog,
} from '../caseInsert/brandingSlotSources.ts'
import { createDefaultCaseInsertImageSlot } from '../caseInsert/defaults.ts'
import { createDefaultProjectLogoAssets } from '../project/projectLogoAssets.ts'
import {
  createDefaultProjectMediaMark,
  updateMediaMarkLayoutField,
  updateMediaMarkValue,
} from '../project/projectMediaMark.ts'
import { createDefaultProjectMetadata } from '../project/projectMetadata.ts'
import {
  createDefaultProjectPlatformMarks,
  updatePlatformMarkToggle,
} from '../project/projectPlatformMarks.ts'
import { createDefaultProjectRatingBadge } from '../project/projectRatingBadge.ts'
import {
  createDefaultProjectTechnicalMarks,
  updateTechnicalMarkToggle,
} from '../project/projectTechnicalMarks.ts'
import { createDefaultProjectJewelCaseState } from '../project/projectCaseInsert.ts'
import type {
  BackgroundImageSize,
  ProjectCaseInsertImageSlot,
  ProjectImageAssetProvenance,
  ProjectJewelCaseState,
} from '../project/projectTypes.ts'
import { buildCaseInsertExportPreflightSummary } from './caseInsertExportPreflight.ts'

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

function createEnabledBundledMarkBrandingSources(): CaseInsertBrandingSourceCatalog {
  const ratingBadge = createDefaultProjectRatingBadge()
  const mediaMark = updateMediaMarkValue(
    updateMediaMarkLayoutField(createDefaultProjectMediaMark(), 'enabled', true),
    'dvd',
  )

  return {
    projectMetadata: {
      ...createDefaultProjectMetadata(),
      ratingSystem: 'ESRB',
      ratingValue: 'E',
    },
    projectLogoAssets: createDefaultProjectLogoAssets(),
    projectRatingBadge: {
      ...ratingBadge,
      layout: {
        ...ratingBadge.layout,
        enabled: true,
      },
    },
    projectMediaMark: mediaMark,
    projectPlatformMarks: updatePlatformMarkToggle(
      createDefaultProjectPlatformMarks(),
      'windows',
      true,
    ),
    projectTechnicalMarks: updateTechnicalMarkToggle(
      createDefaultProjectTechnicalMarks(),
      'audio',
      true,
    ),
  }
}

function createImageSlot(
  slot: ProjectCaseInsertImageSlot,
  size: BackgroundImageSize,
  imageSource: ProjectImageAssetProvenance | null = null,
): ProjectCaseInsertImageSlot {
  return {
    ...slot,
    enabled: true,
    imageDataUrl: `data:image/png;base64,${slot.id}`,
    imageSize: size,
    imageSource,
  }
}

function createBundledSlot(
  id: string,
  label: string,
  sourceId: string,
): ProjectCaseInsertImageSlot {
  return createImageSlot(
    createDefaultCaseInsertImageSlot(id, label, { enabled: true }),
    { width: 1000, height: 1000 },
    {
      source: 'placeholder',
      sourceId,
      sourceLabel: `${label} bundled generic`,
    },
  )
}

function createCleanCoverProject(): ProjectJewelCaseState {
  const project = createDefaultProjectJewelCaseState('Test Game')

  return {
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
  }
}

test('clean cover sheet case preflight has no warnings', () => {
  const summary = buildCaseInsertExportPreflightSummary({
    caseInsert: createCleanCoverProject(),
    activeTemplatePane: 'cover',
    brandingSources: createDefaultBrandingSources(),
    dpi: 300,
  })

  assert.equal(summary.hasWarnings, false)
  assert.deepEqual(summary.warnings, [])
  assert.match(summary.message, /Template: Cover Sheet/)
  assert.match(summary.message, /PNG output: 1414 x 1414 px at 300 DPI/)
  assert.match(summary.message, /Spine regions: Not applicable/)
})

test('cover sheet preflight warns about guides and blank cover without spine warnings', () => {
  const project = createDefaultProjectJewelCaseState('Test Game')
  const summary = buildCaseInsertExportPreflightSummary({
    caseInsert: {
      ...project,
      export: {
        ...project.export,
        guideIds: ['frontSafeBounds'],
      },
    },
    activeTemplatePane: 'cover',
    brandingSources: createDefaultBrandingSources(),
    dpi: 300,
  })

  assert.equal(summary.hasWarnings, true)
  assert.ok(summary.warnings.includes(
    'Guide marks are enabled and will appear in the exported PNG.',
  ))
  assert.ok(summary.warnings.includes(
    'Cover Sheet has no background image; uncovered areas will export as blank white.',
  ))
  assert.ok(summary.warnings.every((warning) => !/spine/i.test(warning)))
  assert.match(summary.message, /Continue with export\?/)
})

test('case preflight ignores additional artwork slots when globally hidden', () => {
  const project = createCleanCoverProject()
  const enabledEmptySlot = createDefaultCaseInsertImageSlot(
    'cover-artwork-1',
    'Artwork 1',
    { enabled: true },
  )
  const hiddenSummary = buildCaseInsertExportPreflightSummary({
    caseInsert: {
      ...project,
      templates: {
        ...project.templates,
        cover: {
          ...project.templates.cover,
          additionalArtworkEnabled: false,
          artworkSlots: [enabledEmptySlot],
        },
      },
    },
    activeTemplatePane: 'cover',
    brandingSources: createDefaultBrandingSources(),
    dpi: 300,
  })
  const visibleSummary = buildCaseInsertExportPreflightSummary({
    caseInsert: {
      ...project,
      templates: {
        ...project.templates,
        cover: {
          ...project.templates.cover,
          additionalArtworkEnabled: true,
          artworkSlots: [enabledEmptySlot],
        },
      },
    },
    activeTemplatePane: 'cover',
    brandingSources: createDefaultBrandingSources(),
    dpi: 300,
  })

  assert.equal(hiddenSummary.hasWarnings, false)
  assert.ok(!hiddenSummary.warnings.some((warning) =>
    /^Artwork /.test(warning)))
  assert.ok(visibleSummary.warnings.includes(
    'Artwork 1 is enabled, but no image is selected; it will not render.',
  ))
})

test('tray card preflight catches guide, image, text, and spine risks', () => {
  const project = createDefaultProjectJewelCaseState('Test Game')
  const trayLogo = createDefaultCaseInsertImageSlot(
    'tray-logo-1',
    'Tray logo',
    { enabled: true },
  )
  const longDescription = Array.from(
    { length: 18 },
    (_, index) => `Long description sentence ${index + 1} with print-risk detail.`,
  ).join(' ')
  const summary = buildCaseInsertExportPreflightSummary({
    caseInsert: {
      ...project,
      templates: {
        ...project.templates,
        tray: {
          ...project.templates.tray,
          background: createImageSlot(
            project.templates.tray.background,
            { width: 100, height: 100 },
          ),
          logoSlots: [trayLogo],
          textBlocks: project.templates.tray.textBlocks.map((textBlock) =>
            textBlock.id === 'tray-description'
              ? {
                  ...textBlock,
                  enabled: true,
                  value: longDescription,
                }
              : textBlock),
        },
      },
      spine: {
        ...project.spine,
        left: {
          ...project.spine.left,
          title: {
            ...project.spine.left.title,
            layout: {
              ...project.spine.left.title.layout,
              scale: 0.2,
            },
          },
        },
      },
      export: {
        ...project.export,
        guideIds: ['leftSpineBounds'],
      },
    },
    activeTemplatePane: 'tray',
    brandingSources: createDefaultBrandingSources(),
    dpi: 300,
  })

  assert.equal(summary.hasWarnings, true)
  assert.ok(summary.warnings.includes(
    'Guide marks are enabled and will appear in the exported PNG.',
  ))
  assert.ok(summary.warnings.some((warning) =>
    /Tray Card background is 100 x 100px/.test(warning)))
  assert.ok(summary.warnings.includes(
    'Tray logo is enabled, but no image is selected; it will not render.',
  ))
  assert.ok(summary.warnings.some((warning) =>
    /Description may overflow its text box/.test(warning)))
  assert.ok(summary.warnings.some((warning) =>
    /Left spine title uses 10px spine title text/.test(warning)))
  assert.match(summary.message, /Spine regions: Included/)
})

test('case preflight matches disc warnings for bundled generic visual assets', () => {
  const project = createCleanCoverProject()
  const summary = buildCaseInsertExportPreflightSummary({
    caseInsert: {
      ...project,
      templates: {
        ...project.templates,
        cover: {
          ...project.templates.cover,
          logoSlots: [
            createBundledSlot('cover-logo-1', 'Developer logo', 'case-logo:developer'),
          ],
          markSlots: [
            createBundledSlot('cover-rating-1', 'ESRB E', 'case-rating:ESRB:E'),
            createBundledSlot('cover-media-1', 'DVD', 'case-media:dvd:light'),
            createBundledSlot(
              'cover-platform-1',
              'Windows',
              'case-platform:windows:color',
            ),
            createBundledSlot('cover-technical-1', 'Audio', 'case-technical:audio'),
          ],
        },
      },
    },
    activeTemplatePane: 'cover',
    brandingSources: createEnabledBundledMarkBrandingSources(),
    dpi: 300,
  })

  assert.equal(summary.hasWarnings, true)
  assert.ok(summary.warnings.includes(
    'Developer logo uses bundled generic logo artwork.',
  ))
  assert.ok(summary.warnings.includes(
    'ESRB E rating badge uses bundled rating artwork.',
  ))
  assert.ok(summary.warnings.includes(
    'DVD media mark uses bundled generic artwork.',
  ))
  assert.ok(summary.warnings.includes(
    'Windows operating-system mark uses bundled generic artwork.',
  ))
  assert.ok(summary.warnings.includes(
    'Audio technical mark uses bundled generic artwork.',
  ))
})
