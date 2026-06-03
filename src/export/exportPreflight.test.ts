import assert from 'node:assert/strict'
import test from 'node:test'
import { DEFAULT_DISC_TEXT_SETTINGS } from '../discText.ts'
import { DEFAULT_EXPORT_GUIDES } from './exportGuides.ts'
import { createDefaultProjectLogoAssets } from '../project/projectLogoAssets.ts'
import { createDefaultProjectMediaMark, createDefaultProjectPlatformMarks, updateMediaMarkLayoutField, updateMediaMarkSource, updatePlatformMarkSource, updatePlatformMarkToggle } from '../project/projectMediaMark.ts'
import { createDefaultProjectMetadata } from '../project/projectMetadata.ts'
import { createDefaultProjectRatingBadge } from '../project/projectRatingBadge.ts'
import { createDefaultProjectTechnicalMarks, updateTechnicalMarkSource, updateTechnicalMarkToggle } from '../project/projectTechnicalMarks.ts'
import { createDefaultProjectTitleArtwork } from '../project/projectTitleArtwork.ts'
import { discTemplates } from '../templates/discTemplates.ts'
import { buildExportPreflightSummary } from './exportPreflight.ts'

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

test('preflight warns about enabled visual elements that will be missing or generic-asset-backed', () => {
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
  assert.ok(summary.warnings.includes(
    'Developer logo is enabled, but no image is uploaded; the bundled generic logo will export.',
  ))
  assert.ok(summary.warnings.includes(
    'Licensor logo is enabled, but no image is uploaded; the bundled generic logo will export.',
  ))
  assert.ok(summary.warnings.includes(
    'Custom rating badge is selected, but no custom image is uploaded; bundled rating artwork will export when rating metadata is renderable.',
  ))
  assert.ok(summary.warnings.includes(
    'Custom Data Disc media mark is selected, but no custom image is uploaded; the bundled generic artwork will export.',
  ))
  assert.ok(summary.warnings.includes(
    'Custom PC operating system mark is selected, but no custom image is uploaded; the bundled generic artwork will export.',
  ))
  assert.ok(summary.warnings.includes(
    'Custom Audio technical mark is selected, but no custom image is uploaded; the bundled generic artwork will export.',
  ))
})
