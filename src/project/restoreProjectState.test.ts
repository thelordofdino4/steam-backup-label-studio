import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { discTemplates } from '../templates/discTemplates.ts'
import {
  restoreProjectStateFromContents,
  restoreSavedProjectState,
} from './restoreProjectState.ts'
import { createDefaultProjectMetadata } from './projectMetadata.ts'
import type { SavedProject } from './projectTypes.ts'

const baseProject: SavedProject = {
  schemaVersion: '0.1.0',
  title: 'Saved Title',
  savedAt: '2026-01-01T00:00:00.000Z',
  game: {
    manualTitle: 'Manual Saved Title',
    selectedSteamGame: {
      appId: 123,
      title: 'Imported Game',
      developer: ['Example Dev'],
      publisher: ['Example Publisher'],
      releaseDate: '2025',
      artwork: [],
    },
  },
  template: {
    type: 'disc',
    variant: 'standardPrintableDisc',
    customDimensions: null,
  },
  steamBackupLogo: {
    placement: 'top',
  },
  background: {
    scale: 1.35,
    offset: { x: 8, y: -4 },
    imageDataUrl: null,
    note: 'test project',
  },
}

test('restores schema 0.1.0 project contents into editor state', async () => {
  const restored = await restoreProjectStateFromContents(JSON.stringify(baseProject))

  assert.equal(restored.manualGameTitle, 'Manual Saved Title')
  assert.equal(restored.selectedSteamGame?.appId, 123)
  assert.equal(restored.projectMetadata.title, 'Manual Saved Title')
  assert.equal(restored.projectMetadata.steamAppId, '123')
  assert.equal(restored.template.selectedDiscTemplateId, 'standardPrintableDisc')
  assert.equal(restored.template.customDiscTemplate, undefined)
  assert.deepEqual(restored.backgroundOffset, { x: 8, y: -4 })
  assert.equal(restored.backgroundScale, 1.35)
})

test('restores custom template, clamps foreground layouts, and backfills old background image size', async () => {
  let resolveCount = 0
  const project: SavedProject = {
    ...baseProject,
    template: {
      type: 'disc',
      variant: 'custom',
      customDimensions: {
        ...discTemplates.standardPrintableDisc,
        outerDiameterMm: 110,
        printableDiameterMm: 108,
        safeDiameterMm: 80,
      },
    },
    logoAssets: {
      developerLogoDataUrl: 'data:image/png;base64,developer',
      developerLogoSize: { width: 1000, height: 500 },
      developerLogoLayout: {
        enabled: true,
        scale: 1,
        x: 99,
        y: 99,
      },
      publisherLogoDataUrl: null,
      publisherLogoSize: null,
      publisherLogoLayout: {
        enabled: false,
        scale: 1,
        x: 22,
        y: 72,
      },
    },
    export: {
      guideMode: 'all',
    },
    background: {
      ...baseProject.background,
      imageDataUrl: 'data:image/png;base64,background',
    },
  }

  const restored = await restoreSavedProjectState(project, {
    resolveBackgroundImageSize: async (imageDataUrl) => {
      resolveCount += 1
      assert.equal(imageDataUrl, project.background.imageDataUrl)
      return { width: 640, height: 480 }
    },
  })

  assert.equal(restored.template.selectedDiscTemplateId, 'custom')
  assert.equal(restored.template.customDiscTemplate?.outerDiameterMm, 110)
  assert.equal(restored.template.selectedDiscTemplate.safeDiameterMm, 80)
  assert.equal(restored.projectLogoAssets.developerLogoLayout.x < 99, true)
  assert.equal(restored.projectLogoAssets.developerLogoLayout.y < 99, true)
  assert.deepEqual(restored.exportGuides, {
    centerHole: true,
    outerEdge: true,
    printableArea: true,
    safeZone: true,
  })
  assert.deepEqual(restored.backgroundImageSize, { width: 640, height: 480 })
  assert.equal(resolveCount, 1)
})

test('keeps saved background image size without resolving it again', async () => {
  let resolveCount = 0
  const restored = await restoreSavedProjectState({
    ...baseProject,
    background: {
      ...baseProject.background,
      imageDataUrl: 'data:image/png;base64,background',
      imageSize: { width: 800, height: 600 },
    },
  }, {
    resolveBackgroundImageSize: async () => {
      resolveCount += 1
      return { width: 1, height: 1 }
    },
  })

  assert.deepEqual(restored.backgroundImageSize, { width: 800, height: 600 })
  assert.equal(resolveCount, 0)
})

test('restores saved and legacy disc text metadata source state', async () => {
  const restoredExplicitSources = await restoreSavedProjectState({
    ...baseProject,
    metadata: {
      ...createDefaultProjectMetadata(),
      title: 'Manual Saved Title',
      steamAppId: '123',
      backupDate: '2026-05-28',
    },
    discText: {
      values: {
        appId: 'Custom rendered ID',
        backupDate: '2026-05-28',
      },
      valueSources: {
        appId: 'manual',
        backupDate: 'metadata',
      },
    },
  })

  assert.equal(restoredExplicitSources.discTextValueSources.appId, 'manual')
  assert.equal(restoredExplicitSources.discTextValueSources.backupDate, 'metadata')

  const restoredLegacySources = await restoreSavedProjectState({
    ...baseProject,
    metadata: {
      ...createDefaultProjectMetadata(),
      title: 'Manual Saved Title',
      steamAppId: '123',
    },
    discText: {
      values: {
        appId: 'Custom rendered ID',
      },
    },
  })

  assert.equal(restoredLegacySources.discTextValueSources.appId, 'manual')
})

test('restores checked-in project fixtures', async () => {
  const fixturePaths = [
    'fixtures/projects/legacy-minimal-0.1.0.sbls.json',
    'fixtures/projects/full-branding.sbls.json',
    'fixtures/projects/custom-dimensions.sbls.json',
    'fixtures/projects/blank-project.sbls.json',
    'fixtures/projects/background-only.sbls.json',
  ]

  for (const fixturePath of fixturePaths) {
    const contents = await readFile(fixturePath, 'utf8')
    const restored = await restoreProjectStateFromContents(contents, {
      defaultSteamBannerLockupImageUrl: 'default-lockup.png',
      resolveBackgroundImageSize: async () => ({ width: 320, height: 200 }),
    })

    assert.equal(typeof restored.manualGameTitle, 'string')
    assert.equal(restored.template.selectedDiscTemplate.type, 'disc')
    assert.equal(typeof restored.backgroundScale, 'number')
  }
})
