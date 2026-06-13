import assert from 'node:assert/strict'
import test from 'node:test'
import { DEFAULT_DISC_TEXT_SETTINGS } from '../discText/index.ts'
import { DEFAULT_EXPORT_GUIDES } from './exportGuides.ts'
import { createDefaultProjectLogoAssets } from '../project/projectLogoAssets.ts'
import { createDefaultProjectMediaMark, updateMediaMarkLayoutField, updateMediaMarkSource } from '../project/projectMediaMark.ts'
import { createDefaultProjectMetadata } from '../project/projectMetadata.ts'
import { createDefaultProjectPlatformMarks, updatePlatformMarkSource, updatePlatformMarkToggle } from '../project/projectPlatformMarks.ts'
import { createDefaultProjectRatingBadge } from '../project/projectRatingBadge.ts'
import { createDefaultProjectTechnicalMarks, updateTechnicalMarkSource, updateTechnicalMarkToggle } from '../project/projectTechnicalMarks.ts'
import { createDefaultProjectTitleArtwork } from '../project/projectTitleArtwork.ts'
import { discTemplates } from '../templates/discTemplates.ts'
import { buildExportPreflightSummary } from './exportPreflight.ts'
import { GUIDE_MARKS_EXPORT_WARNING } from './preflightWarnings.ts'

function createDefaultPreflightParams(): Parameters<typeof buildExportPreflightSummary>[0] {
  return {
    selectedDiscTemplateId: 'standardPrintableDisc',
    selectedDiscTemplate: discTemplates.standardPrintableDisc,
    backgroundImageUrl: 'data:image/png;base64,background',
    backgroundImageSize: { width: 1024, height: 1024 },
    selectedSteamGame: null,
    manualGameTitle: 'Test Game',
    steamLogoPlacement: 'top',
    steamBannerUseTextFallback: false,
    steamBannerFallbackText: 'STEAM',
    steamBannerLockupImageUrl: 'default-lockup.png',
    discTextSettings: DEFAULT_DISC_TEXT_SETTINGS,
    projectLogoAssets: createDefaultProjectLogoAssets(discTemplates.standardPrintableDisc),
    projectTitleArtwork: createDefaultProjectTitleArtwork(
      discTemplates.standardPrintableDisc,
      'top',
    ),
    projectMetadata: {
      ...createDefaultProjectMetadata(),
      ratingSystem: 'ESRB',
      ratingValue: 'E',
    },
    projectRatingBadge: createDefaultProjectRatingBadge(
      discTemplates.standardPrintableDisc,
    ),
    projectMediaMark: createDefaultProjectMediaMark(discTemplates.standardPrintableDisc),
    projectPlatformMarks: createDefaultProjectPlatformMarks(),
    projectTechnicalMarks: createDefaultProjectTechnicalMarks(),
    exportGuides: DEFAULT_EXPORT_GUIDES,
  }
}

test('clean export preflight has no warnings', () => {
  const summary = buildExportPreflightSummary(createDefaultPreflightParams())

  assert.equal(summary.hasWarnings, false)
  assert.deepEqual(summary.warnings, [])
  assert.match(summary.message, /Steam Backup branding: Top, image lockup/)
})

test('preflight identifies text fallback Steam banner lockups', () => {
  const summary = buildExportPreflightSummary({
    ...createDefaultPreflightParams(),
    steamBannerUseTextFallback: true,
    steamBannerFallbackText: 'Taihazu Archive',
  })

  assert.match(
    summary.message,
    /Steam Backup branding: Top, text lockup "Taihazu Archive"/,
  )
})

test('missing background is advisory and still lets the user continue export', () => {
  const summary = buildExportPreflightSummary({
    ...createDefaultPreflightParams(),
    backgroundImageUrl: null,
    backgroundImageSize: null,
  })

  assert.equal(summary.hasWarnings, true)
  assert.match(
    summary.message,
    /No background image is selected; the export will use the default blank disc fill\./,
  )
  assert.match(summary.message, /Continue with export\?/)
})

test('disc preflight does not warn about built-in mark artwork', () => {
  const params = createDefaultPreflightParams()
  const projectMediaMark = updateMediaMarkLayoutField(
    params.projectMediaMark,
    'enabled',
    true,
  )
  const projectPlatformMarks = updatePlatformMarkToggle(
    params.projectPlatformMarks,
    'pc',
    true,
  )
  const projectTechnicalMarks = updateTechnicalMarkToggle(
    params.projectTechnicalMarks,
    'audio',
    true,
  )
  const summary = buildExportPreflightSummary({
    ...params,
    projectMediaMark,
    projectPlatformMarks,
    projectTechnicalMarks,
    exportGuides: {
      ...params.exportGuides,
      safeZone: true,
    },
  })

  assert.ok(summary.warnings.includes(GUIDE_MARKS_EXPORT_WARNING))
  assert.ok(!summary.warnings.some((warning) =>
    /bundled|generic artwork|built-in .*artwork/i.test(warning)))
})

test('preflight warns about enabled visual elements that will be missing', () => {
  const params = createDefaultPreflightParams()
  const projectMediaMark = updateMediaMarkSource(
    updateMediaMarkLayoutField(params.projectMediaMark, 'enabled', true),
    'custom',
  )
  const projectPlatformMarks = updatePlatformMarkSource(
    updatePlatformMarkToggle(params.projectPlatformMarks, 'pc', true),
    'pc',
    'custom',
  )
  const projectTechnicalMarks = updateTechnicalMarkSource(
    updateTechnicalMarkToggle(params.projectTechnicalMarks, 'audio', true),
    'audio',
    'custom',
  )
  const summary = buildExportPreflightSummary({
    ...params,
    projectTitleArtwork: {
      ...params.projectTitleArtwork,
      layout: {
        ...params.projectTitleArtwork.layout,
        enabled: true,
      },
    },
    projectLogoAssets: {
      ...params.projectLogoAssets,
      developerLogoLayout: {
        ...params.projectLogoAssets.developerLogoLayout,
        enabled: true,
      },
      additionalDeveloperLogos: [
        {
          id: 'developer-extra',
          label: 'Licensor logo',
          imageDataUrl: null,
          imageSize: null,
          layout: {
            ...params.projectLogoAssets.developerLogoLayout,
            enabled: true,
          },
        },
      ],
    },
    projectRatingBadge: {
      ...params.projectRatingBadge,
      source: 'custom',
      customImageDataUrl: null,
      layout: {
        ...params.projectRatingBadge.layout,
        enabled: true,
      },
    },
    projectMediaMark,
    projectPlatformMarks,
    projectTechnicalMarks,
  })

  assert.equal(summary.hasWarnings, true)
  assert.ok(summary.warnings.includes(
    'Title/logo artwork is enabled, but no Steam or custom title artwork image is selected; it will not render in the exported PNG.',
  ))
  assert.ok(!summary.warnings.some((warning) => /Developer logo/.test(warning)))
  assert.ok(!summary.warnings.some((warning) => /Licensor logo/.test(warning)))
  assert.ok(summary.warnings.includes(
    'Custom rating badge is selected, but no custom image is uploaded.',
  ))
  assert.ok(summary.warnings.includes(
    'Custom Data Disc media mark is selected, but no custom image is uploaded.',
  ))
  assert.ok(summary.warnings.includes(
    'Custom PC operating system mark is selected, but no custom image is uploaded.',
  ))
  assert.ok(summary.warnings.includes(
    'Custom audio technical mark is selected, but no custom image is uploaded.',
  ))
  assert.ok(!summary.warnings.some((warning) =>
    /bundled|generic artwork|built-in .*artwork/i.test(warning)))
})
