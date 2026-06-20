import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DEFAULT_DISC_TEXT_SETTINGS,
  createDefaultDiscTextLayout,
  createDefaultDiscTextValues,
} from '../discText/index.ts'
import { createDefaultProjectDiscNumberArtwork } from '../discText/discNumberArtwork.ts'
import { createDefaultDiscTextStyles } from '../discText/styles.ts'
import { createDefaultProjectAdditionalArtwork } from '../project/projectAdditionalArtwork.ts'
import { createDefaultProjectLogoAssets } from '../project/projectLogoAssets.ts'
import { createDefaultProjectMediaMark } from '../project/projectMediaMark.ts'
import { createDefaultProjectMetadata } from '../project/projectMetadata.ts'
import { createDefaultProjectPlatformMarks } from '../project/projectPlatformMarks.ts'
import { createDefaultProjectRatingBadge } from '../project/projectRatingBadge.ts'
import { createDefaultProjectTechnicalMarks } from '../project/projectTechnicalMarks.ts'
import { createDefaultProjectTitleArtwork } from '../project/projectTitleArtwork.ts'
import { discTemplates } from '../templates/discTemplates.ts'
import { buildDiscDesignCheckSummary } from './discDesignCheck.ts'

function createDefaultDesignCheckParams(): Parameters<typeof buildDiscDesignCheckSummary>[0] {
  return {
    selectedDiscTemplateId: 'standardPrintableDisc',
    selectedDiscTemplate: discTemplates.standardPrintableDisc,
    backgroundImageUrl: 'data:image/png;base64,background',
    backgroundImageSize: { width: 2048, height: 2048 },
    backgroundScale: 1,
    steamLogoPlacement: 'top',
    projectLogoAssets: createDefaultProjectLogoAssets(
      discTemplates.standardPrintableDisc,
    ),
    projectTitleArtwork: createDefaultProjectTitleArtwork(
      discTemplates.standardPrintableDisc,
      'top',
    ),
    projectAdditionalArtwork: createDefaultProjectAdditionalArtwork(),
    projectDiscNumberArtwork: createDefaultProjectDiscNumberArtwork(),
    projectMetadata: {
      ...createDefaultProjectMetadata(),
      ratingSystem: 'ESRB',
      ratingValue: 'E',
    },
    projectRatingBadge: createDefaultProjectRatingBadge(
      discTemplates.standardPrintableDisc,
    ),
    projectMediaMark: createDefaultProjectMediaMark(
      discTemplates.standardPrintableDisc,
    ),
    projectPlatformMarks: createDefaultProjectPlatformMarks(),
    projectTechnicalMarks: createDefaultProjectTechnicalMarks(),
    discTextSettings: DEFAULT_DISC_TEXT_SETTINGS,
    discTextValues: createDefaultDiscTextValues(),
    discTextLayout: createDefaultDiscTextLayout(
      'top',
      discTemplates.standardPrintableDisc,
    ),
    discTextStyles: createDefaultDiscTextStyles(),
    manualGameTitle: 'Test Game',
  }
}

function createCompleteDesignCheckParams():
Parameters<typeof buildDiscDesignCheckSummary>[0] {
  const params = createDefaultDesignCheckParams()

  return {
    ...params,
    projectLogoAssets: {
      ...params.projectLogoAssets,
      developerLogoDataUrl: 'data:image/png;base64,developer-logo',
      developerLogoSize: { width: 512, height: 180 },
      developerLogoLayout: {
        ...params.projectLogoAssets.developerLogoLayout,
        enabled: true,
      },
    },
    projectTitleArtwork: {
      ...params.projectTitleArtwork,
      imageDataUrl: 'data:image/png;base64,title-artwork',
      imageSize: { width: 1024, height: 360 },
      layout: {
        ...params.projectTitleArtwork.layout,
        enabled: true,
      },
    },
    projectRatingBadge: {
      ...params.projectRatingBadge,
      source: 'custom',
      customImageDataUrl: 'data:image/png;base64,rating',
      customImageSize: { width: 320, height: 460 },
      layout: {
        ...params.projectRatingBadge.layout,
        enabled: true,
      },
    },
    projectMediaMark: {
      ...params.projectMediaMark,
      source: 'custom',
      customImageDataUrl: 'data:image/png;base64,media',
      customImageSize: { width: 420, height: 180 },
      layout: {
        ...params.projectMediaMark.layout,
        enabled: true,
      },
    },
    discTextSettings: {
      ...params.discTextSettings,
      copyright: true,
    },
    discTextValues: {
      ...params.discTextValues,
      copyright: '(c) 2026 Example Studio. All rights reserved.',
    },
  }
}

test('clean disc design check has no warnings', () => {
  const summary = buildDiscDesignCheckSummary(createCompleteDesignCheckParams())

  assert.equal(summary.hasWarnings, false)
  assert.deepEqual(summary.warnings, [])
  assert.deepEqual(summary.notes, [])
  assert.ok(summary.items.every((item) => item.status === 'pass'))
  assert.match(summary.message, /No disc design warnings found/)
})

test('disc design check warns when guide anatomy elements are missing', () => {
  const summary = buildDiscDesignCheckSummary(createDefaultDesignCheckParams())

  assert.equal(summary.hasWarnings, true)
  assert.ok(summary.warnings.includes(
    'Add a visible game title or title/logo artwork so the disc is identifiable at a glance.',
  ))
  assert.ok(summary.warnings.includes(
    'Add at least one rating badge, media format mark, platform mark, or technical logo.',
  ))
  assert.ok(summary.warnings.includes(
    "Add a developer, publisher, or related company logo to anchor the label's branding.",
  ))
  assert.ok(summary.warnings.includes(
    'Add copyright/legal text for attribution and usage context.',
  ))
})

test('disc design check keeps export details as notes', () => {
  const summary = buildDiscDesignCheckSummary({
    ...createDefaultDesignCheckParams(),
    backgroundImageUrl: null,
    backgroundImageSize: null,
    steamLogoPlacement: 'none',
  })

  assert.equal(summary.hasWarnings, true)
  assert.ok(summary.warnings.includes(
    'Add background artwork so the disc does not print as a mostly blank label.',
  ))
  assert.ok(summary.notes.includes(
    'No background image is selected; the export will use the default blank disc fill.',
  ))
  assert.ok(summary.notes.includes(
    'No visible disc design content is enabled; the exported label may be blank.',
  ))
})

test('disc design check keeps low-resolution artwork as a note', () => {
  const summary = buildDiscDesignCheckSummary({
    ...createCompleteDesignCheckParams(),
    backgroundImageSize: { width: 200, height: 200 },
  })

  assert.equal(summary.hasWarnings, false)
  assert.deepEqual(summary.warnings, [])
  assert.ok(summary.notes.some((note) =>
    /Background artwork is 200 x 200px, but exports around/.test(note)))
})

test('disc design check keeps tiny and unsafe straight text as notes', () => {
  const params = createCompleteDesignCheckParams()
  const summary = buildDiscDesignCheckSummary({
    ...params,
    discTextSettings: {
      ...params.discTextSettings,
      subtitle: true,
    },
    discTextValues: {
      ...params.discTextValues,
      subtitle: 'Tiny subtitle',
    },
    discTextLayout: {
      ...params.discTextLayout,
      subtitle: {
        ...params.discTextLayout.subtitle,
        y: 98,
        scale: 0.1,
        fontSizePt: 1,
      },
    },
  })

  assert.equal(summary.hasWarnings, false)
  assert.deepEqual(summary.warnings, [])
  assert.ok(summary.notes.some((note) =>
    /Subtitle \/ edition uses about \d+px text/.test(note)))
  assert.ok(summary.notes.includes(
    'Subtitle / edition may sit outside the safe print zone or too close to the center hole.',
  ))
})

test('disc design check keeps competing title treatments as a note', () => {
  const params = createCompleteDesignCheckParams()
  const summary = buildDiscDesignCheckSummary({
    ...params,
    discTextSettings: {
      ...params.discTextSettings,
      title: true,
    },
  })

  assert.equal(summary.hasWarnings, false)
  assert.deepEqual(summary.warnings, [])
  assert.ok(summary.notes.includes(
    'Title/logo artwork and game title text are both visible; make sure they are not competing for the same space.',
  ))
  assert.equal(
    summary.items.find((item) => item.id === 'disc-title-overlap-risk')?.status,
    'note',
  )
})
