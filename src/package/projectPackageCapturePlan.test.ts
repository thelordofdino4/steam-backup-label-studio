import assert from 'node:assert/strict'
import test from 'node:test'

import { createProjectSnapshot } from '../project/createProjectSnapshot.ts'
import {
  createBlankJewelCaseSavedProject,
} from '../project/caseInsertProjectAdapters.ts'
import { CURRENT_PROJECT_SCHEMA_VERSION } from '../project/projectSchema.ts'
import type {
  ProjectCaseInsertImageSlot,
  SavedCaseInsertProject,
  SavedDiscProject,
} from '../project/projectTypes.ts'
import {
  createProjectPackageCapturePlan,
  type ProjectPackageAssetCapture,
} from './projectPackageCapturePlan.ts'

const DATA_URL = 'data:image/png;base64,iVBORw0KGgo='

function byOwner(
  captures: readonly ProjectPackageAssetCapture[],
  ownerId: ProjectPackageAssetCapture['ownerId'],
) {
  return captures.find((capture) => capture.ownerId === ownerId)
}

function createDiscProject(title: string): SavedDiscProject {
  return {
    schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
    projectType: 'disc',
    title,
    savedAt: '2026-07-29T00:00:00.000Z',
    game: { manualTitle: title, selectedSteamGame: null },
    template: {
      type: 'disc',
      variant: 'standardPrintableDisc',
      customDimensions: null,
    },
    steamBackupLogo: {
      placement: 'top',
      lockupImageDataUrl: null,
      lockupImageSize: null,
    },
    background: {
      enabled: true,
      scale: 1,
      offset: { x: 0, y: 0 },
      imageDataUrl: null,
      imageSize: null,
      note: 'package planner fixture',
    },
    logoAssets: {
      additionalDeveloperLogos: [],
      additionalPublisherLogos: [],
    },
    titleArtwork: {},
    additionalArtwork: { enabled: false, elements: [] },
    platformMarks: { values: [], assets: {} },
    technicalMarks: { values: [], assets: {}, additionalAssets: {} },
  }
}

function surfaces(project: SavedCaseInsertProject) {
  return [
    project.caseInsert.templates.cover,
    project.caseInsert.templates.tray,
    project.caseInsert.spine.left,
    project.caseInsert.spine.right,
  ] as const
}

function customSlot(
  source: ProjectCaseInsertImageSlot,
  id: string,
  enabled: boolean,
): ProjectCaseInsertImageSlot {
  return {
    ...structuredClone(source),
    id,
    enabled,
    imageDataUrl: DATA_URL,
    imageSource: { source: 'uploaded', sourceId: `${id}:source` },
    imageSize: { width: 1, height: 1 },
  }
}

test('blank Disc and Case projects use only closed, safe package-v1 decisions', () => {
  const disc = createProjectSnapshot({
    manualGameTitle: 'Blank Disc',
    savedAt: '2026-07-29T00:00:00.000Z',
  })
  const discPlan = createProjectPackageCapturePlan(disc)
  assert.equal(discPlan.version, 1)
  assert.equal(discPlan.captures.length, 18)
  assert.equal(
    discPlan.captures.some(
      ({ decision }) => decision.kind === 'unsupported-nonportable-asset',
    ),
    false,
  )
  assert.deepEqual(byOwner(discPlan.captures, 'disc.steam-banner')?.decision, {
    kind: 'qualified-built-in',
    compatibilityId: 'steam-banner:banner-lockup',
  })
  assert.deepEqual(byOwner(discPlan.captures, 'disc.logo.developer')?.decision, {
    kind: 'qualified-built-in',
    compatibilityId: 'logo:developer',
  })
  assert.deepEqual(byOwner(discPlan.captures, 'disc.logo.publisher')?.decision, {
    kind: 'qualified-built-in',
    compatibilityId: 'logo:publisher',
  })

  const caseProject = createBlankJewelCaseSavedProject('Blank Case')
  const casePlan = createProjectPackageCapturePlan(caseProject)
  assert.equal(
    casePlan.captures.some(
      ({ decision }) => decision.kind === 'unsupported-nonportable-asset',
    ),
    false,
  )
  assert.deepEqual(
    casePlan.captures
      .filter(({ ownerId }) => ownerId.endsWith('.banner'))
      .map(({ ownerId, decision }) => [ownerId, decision]),
    [
      ['case.cover.banner', {
        kind: 'qualified-built-in',
        compatibilityId: 'steam-banner:banner-lockup',
      }],
      ['case.tray.banner', {
        kind: 'qualified-built-in',
        compatibilityId: 'steam-banner:banner-lockup',
      }],
      ['case.spine-left.banner', {
        kind: 'qualified-built-in',
        compatibilityId: 'steam-banner:spine-icon',
      }],
      ['case.spine-right.banner', {
        kind: 'qualified-built-in',
        compatibilityId: 'steam-banner:spine-icon',
      }],
    ],
  )
})

test('Disc traversal includes retained custom alternatives and deterministic arrays', () => {
  const project = createDiscProject('Full Disc')
  project.background.enabled = false
  project.background.imageDataUrl = DATA_URL
  project.background.imageSource = { source: 'uploaded', sourceId: 'background' }
  project.background.imageSize = { width: 1, height: 1 }
  project.titleArtwork!.imageDataUrl = DATA_URL
  project.titleArtwork!.imageSize = { width: 1, height: 1 }
  project.titleArtwork!.defaultSteamLogo = {
    imageDataUrl: DATA_URL,
    imageSize: { width: 1, height: 1 },
    steamArtworkAssetId: 'retained-default',
  }
  project.logoAssets!.additionalDeveloperLogos = [
    {
      id: 'developer-retained',
      imageDataUrl: DATA_URL,
      imageSource: { source: 'uploaded', sourceId: 'developer-retained' },
      imageSize: { width: 1, height: 1 },
    },
  ]
  project.additionalArtwork!.elements = [
    {
      id: 'first',
      imageDataUrl: DATA_URL,
      imageSize: { width: 1, height: 1 },
      sourceId: 'retained-first',
      layout: { enabled: false, scale: 1, x: 0, y: 0 },
    },
    {
      id: 'second',
      imageDataUrl: DATA_URL,
      imageSize: { width: 1, height: 1 },
      sourceId: 'selected-second',
      layout: { enabled: true, scale: 1, x: 0, y: 0 },
    },
  ]
  project.platformMarks!.assets.windows = {
    source: 'custom',
    theme: 'windows11',
    customImageDataUrl: DATA_URL,
    customImageSize: { width: 1, height: 1 },
    layout: { enabled: false, scale: 1, x: 0, y: 0 },
  }
  project.technicalMarks!.additionalAssets.audio = [
    {
      id: 'remembered-audio',
      source: 'custom',
      customImageDataUrl: DATA_URL,
      customImageSize: { width: 1, height: 1 },
    },
  ]

  const plan = createProjectPackageCapturePlan(project)
  const customOwners = plan.captures
    .filter(({ decision }) => decision.kind === 'project-owned-data-url')
    .map(({ ownerId }) => ownerId)
  assert.deepEqual(customOwners, [
    'disc.background',
    'disc.logo.developer.additional.0',
    'disc.title.current',
    'disc.title.default',
    'disc.artwork.additional.0',
    'disc.artwork.additional.1',
    'disc.platform.windows',
    'disc.technical.audio.additional.0',
  ])
})

test('Case traversal covers all four surfaces and disabled remembered arrays', () => {
  const project = createBlankJewelCaseSavedProject('Full Case')
  const expectedOwners: string[] = []
  surfaces(project).forEach((surface, index) => {
    surface.background = customSlot(surface.background, `background-${index}`, false)
    surface.titleArtwork = customSlot(surface.titleArtwork, `title-${index}`, true)
    surface.titleArtwork.defaultSteamLogo = {
      imageDataUrl: DATA_URL,
      imageSize: { width: 1, height: 1 },
      steamArtworkAssetId: `default-${index}`,
    }
    surface.artworkSlots = [customSlot(surface.background, `art-${index}`, false)]
    surface.logoSlots = [customSlot(surface.background, `logo-${index}`, false)]
    surface.markSlots = [customSlot(surface.background, `mark-${index}`, false)]
    const surfaceId = ['cover', 'tray', 'spine-left', 'spine-right'][index]
    expectedOwners.push(
      `case.${surfaceId}.background`,
      `case.${surfaceId}.title.current`,
      `case.${surfaceId}.title.default`,
      `case.${surfaceId}.artwork.0`,
      `case.${surfaceId}.logo.0`,
      `case.${surfaceId}.mark.0`,
    )
  })

  const plan = createProjectPackageCapturePlan(project)
  assert.deepEqual(
    plan.captures
      .filter(({ decision }) => decision.kind === 'project-owned-data-url')
      .map(({ ownerId }) => ownerId),
    expectedOwners,
  )
})

test('Case reserved artwork viewport remains non-asset state beside its captured image', () => {
  const withoutViewport = createBlankJewelCaseSavedProject('Viewport Case')
  withoutViewport.caseInsert.templates.tray.artworkSlots = [
    customSlot(
      withoutViewport.caseInsert.templates.tray.background,
      'reserved-back-panel-artwork',
      true,
    ),
  ]
  const withViewport = structuredClone(withoutViewport)
  withViewport.caseInsert.templates.tray.artworkSlots[0].reservedArtworkViewport = {
    kind: 'sbls/case-insert-artwork-viewport',
    formatVersion: 1,
    templateId: 'jewelCase',
    templateRevision: null,
    coordinateBasis: 'backPanelSafe',
    widthPercent: 26,
    heightPercent: 16,
    focalPosition: {
      xPercent: 50,
      yPercent: 50,
    },
    zoom: 1,
  }

  const withoutPlan = createProjectPackageCapturePlan(withoutViewport)
  const withPlan = createProjectPackageCapturePlan(withViewport)
  assert.deepEqual(withPlan, withoutPlan)
  assert.deepEqual(
    byOwner(withPlan.captures, 'case.tray.artwork.0')?.decision,
    { kind: 'project-owned-data-url' },
  )
  assert.equal(JSON.stringify(withPlan).includes('reservedArtworkViewport'), false)
  assert.equal(JSON.stringify(withPlan).includes('backPanelSafe'), false)
})

test('unsafe accepted-owner values fail closed while unrelated candidates are ignored', () => {
  const project = createProjectSnapshot({ manualGameTitle: 'Unsafe Disc' })
  project.background.imageDataUrl = 'blob:https://example.invalid/private'
  project.background.imageSource = { source: 'uploaded', sourceId: 'local-file' }
  project.ratingBadge = {
    source: 'placeholder',
    customImageDataUrl: 'blob:https://example.invalid/rating',
    customImageSize: null,
  }
  project.mediaMark = {
    value: 'dataDisc',
    source: 'placeholder',
    theme: 'light',
    customImageDataUrl: 'https://example.invalid/media.png',
    customImageSize: null,
  }
  project.platformMarks = {
    values: ['windows'],
    assets: {
      windows: {
        source: 'placeholder',
        theme: 'windows11',
        customImageDataUrl: 'blob:https://example.invalid/platform',
        customImageSize: null,
        layout: { enabled: true, scale: 1, x: 0, y: 0 },
      },
    },
  }
  project.technicalMarks = {
    values: ['audio'],
    assets: {
      audio: {
        source: 'placeholder',
        customImageDataUrl: 'https://example.invalid/audio.png',
        customImageSize: null,
        layout: { enabled: true, scale: 1, x: 0, y: 0 },
      },
    },
    additionalAssets: {},
  }
  Object.assign(project, {
    searchCandidates: [{ imageDataUrl: 'https://catalog.invalid/unaccepted.png' }],
  })

  const plan = createProjectPackageCapturePlan(project)
  for (const ownerId of [
    'disc.background',
    'disc.rating.custom',
    'disc.media.custom',
    'disc.platform.windows',
    'disc.technical.audio',
  ] as const) {
    assert.deepEqual(byOwner(plan.captures, ownerId)?.decision, {
      kind: 'unsupported-nonportable-asset',
    })
  }
  assert.equal(
    JSON.stringify(plan).includes('catalog.invalid'),
    false,
  )
})

test('built-in qualification is exact and rejects cross-platform theme aliases', () => {
  const project = createDiscProject('Theme Disc')
  project.platformMarks!.assets.linux = {
    source: 'placeholder',
    theme: 'windows11',
    customImageDataUrl: null,
    customImageSize: null,
    layout: { enabled: true, scale: 1, x: 0, y: 0 },
  }
  const plan = createProjectPackageCapturePlan(project)
  assert.deepEqual(byOwner(plan.captures, 'disc.platform.linux')?.decision, {
    kind: 'unsupported-nonportable-asset',
  })
  assert.deepEqual(byOwner(plan.captures, 'disc.media.custom')?.decision, {
    kind: 'no-accepted-asset',
  })
})
