import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { discTemplates } from '../templates/discTemplates.ts'
import {
  restoreProjectStateFromContents,
  restoreSavedProjectState,
} from './restoreProjectState.ts'
import { createDefaultProjectMetadata } from './projectMetadata.ts'
import {
  getProjectPlatformMarkAsset,
  getProjectPlatformMarkInference,
} from './projectMediaMark.ts'
import { getProjectTechnicalMarkAsset } from './projectTechnicalMarks.ts'
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
  assert.equal(restored.discTextTitleValue, '')
  assert.equal(restored.discTextValueSources.title, 'metadata')
  assert.deepEqual(restored.projectLogoAssets.additionalDeveloperLogos, [])
  assert.deepEqual(restored.projectLogoAssets.additionalPublisherLogos, [])
  assert.equal(restored.projectAdditionalArtwork.enabled, false)
  assert.deepEqual(restored.projectAdditionalArtwork.elements, [])
  assert.deepEqual(restored.projectTechnicalMarks.values, [])
  assert.equal(restored.projectDiscNumberArtwork.mode, 'text')
  assert.equal(restored.template.selectedDiscTemplateId, 'standardPrintableDisc')
  assert.equal(restored.template.customDiscTemplate, undefined)
  assert.deepEqual(restored.backgroundOffset, { x: 8, y: -4 })
  assert.equal(restored.backgroundScale, 1.35)
  assert.equal(restored.isBackgroundArtworkEnabled, true)
})

test('restores saved disc number artwork badge settings', async () => {
  const restored = await restoreSavedProjectState({
    ...baseProject,
    discNumberArtwork: {
      mode: 'badge',
      badgeSet: 'starterRing',
    },
  })

  assert.equal(restored.projectDiscNumberArtwork.mode, 'badge')
  assert.equal(restored.projectDiscNumberArtwork.badgeSet, 'starterRing')
})

test('restores saved Steam default game logo for later restore actions', async () => {
  const restored = await restoreSavedProjectState({
    ...baseProject,
    titleArtwork: {
      source: 'custom',
      sourceLabel: 'Custom game logo artwork',
      imageDataUrl: 'data:image/png;base64,current-custom-logo',
      imageSize: { width: 640, height: 240 },
      defaultSteamLogo: {
        steamArtworkAssetId: 'cdn-logo',
        sourceLabel: 'Steam CDN logo',
        imageDataUrl: 'data:image/png;base64,steam-default-logo',
        imageSize: { width: 900, height: 360 },
      },
      layout: {
        enabled: true,
        scale: 1.2,
        x: 50,
        y: 28,
      },
    },
  })

  assert.equal(
    restored.projectTitleArtwork.defaultSteamLogo?.imageDataUrl,
    'data:image/png;base64,steam-default-logo',
  )
  assert.equal(restored.projectTitleArtwork.defaultSteamLogo?.sourceLabel, 'Steam CDN logo')
  assert.equal(restored.projectTitleArtwork.source, 'custom')
})

test('restores saved disc text visual avoidance and backfills legacy layouts', async () => {
  const restored = await restoreSavedProjectState({
    ...baseProject,
    discText: {
      layout: {
        title: {
          avoidVisualElements: true,
        },
        subtitle: {
          y: 25,
        },
      },
    },
  })

  assert.equal(restored.discTextLayout.title.avoidVisualElements, true)
  assert.equal(restored.discTextLayout.subtitle.avoidVisualElements, false)
  assert.equal(restored.discTextLayout.subtitle.y, 25)
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

test('restores additional developer and publisher logos from saved project data', async () => {
  const restored = await restoreSavedProjectState({
    ...baseProject,
    logoAssets: {
      developerLogoDataUrl: null,
      developerLogoSize: null,
      developerLogoLayout: {
        enabled: true,
        scale: 1,
        x: 22,
        y: 62,
      },
      additionalDeveloperLogos: [
        {
          id: 'developer-extra',
          label: 'Studio logo',
          imageDataUrl: 'data:image/png;base64,developer-extra',
          imageSize: { width: 400, height: 120 },
          layout: {
            enabled: true,
            scale: 1,
            x: 99,
            y: 99,
          },
        },
      ],
      publisherLogoDataUrl: null,
      publisherLogoSize: null,
      publisherLogoLayout: {
        enabled: true,
        scale: 1,
        x: 22,
        y: 72,
      },
      additionalPublisherLogos: [
        {
          id: 'publisher-extra',
          imageDataUrl: null,
          imageSize: null,
          layout: {
            enabled: false,
            scale: 1.2,
            x: 42,
            y: 72,
          },
        },
      ],
    },
  })
  const additionalDeveloperLogo = restored.projectLogoAssets.additionalDeveloperLogos[0]!
  const additionalPublisherLogo = restored.projectLogoAssets.additionalPublisherLogos[0]!

  assert.equal(additionalDeveloperLogo.id, 'developer-extra')
  assert.equal(additionalDeveloperLogo.label, 'Studio logo')
  assert.equal(additionalDeveloperLogo.imageDataUrl, 'data:image/png;base64,developer-extra')
  assert.equal(additionalDeveloperLogo.layout.enabled, true)
  assert.equal(additionalDeveloperLogo.layout.x < 99, true)
  assert.equal(additionalDeveloperLogo.layout.y < 99, true)
  assert.equal(additionalPublisherLogo.id, 'publisher-extra')
  assert.equal(additionalPublisherLogo.label, 'Additional publisher 1')
  assert.equal(additionalPublisherLogo.layout.enabled, false)
  assert.equal(additionalPublisherLogo.layout.scale, 1.2)
})

test('restores additional artwork from saved project data and clamps layout', async () => {
  const restored = await restoreSavedProjectState({
    ...baseProject,
    additionalArtwork: {
      enabled: true,
      elements: [
        {
          id: 'character-art',
          label: 'Character render',
          source: 'local-steam-screenshot',
          sourceId: 'screenshot-1',
          sourceLabel: 'Screenshot 1',
          imageDataUrl: 'data:image/png;base64,character',
          imageSize: { width: 900, height: 900 },
          layout: {
            enabled: true,
            scale: 1.4,
            x: 99,
            y: 99,
          },
        },
        {
          id: 'hidden-art',
          source: 'custom',
          sourceId: null,
          sourceLabel: 'Hidden',
          imageDataUrl: 'data:image/png;base64,hidden',
          imageSize: { width: 400, height: 200 },
          layout: {
            enabled: false,
            scale: 0.8,
            x: 50,
            y: 50,
          },
        },
      ],
    },
  })
  const characterArt = restored.projectAdditionalArtwork.elements[0]!
  const hiddenArt = restored.projectAdditionalArtwork.elements[1]!

  assert.equal(restored.projectAdditionalArtwork.enabled, true)
  assert.equal(characterArt.id, 'character-art')
  assert.equal(characterArt.label, 'Character render')
  assert.equal(characterArt.source, 'local-steam-screenshot')
  assert.equal(characterArt.imageDataUrl, 'data:image/png;base64,character')
  assert.equal(characterArt.layout.enabled, true)
  assert.equal(characterArt.layout.scale, 1.4)
  assert.equal(characterArt.layout.x < 99, true)
  assert.equal(characterArt.layout.y < 99, true)
  assert.equal(characterArt.frame.enabled, false)
  assert.equal(hiddenArt.layout.enabled, false)
  assert.equal(hiddenArt.label, 'Artwork 2')
  assert.equal(hiddenArt.imageDataUrl, 'data:image/png;base64,hidden')
})

test('restores technical marks from saved project data and clamps layout', async () => {
  const restored = await restoreSavedProjectState({
    ...baseProject,
    technicalMarks: {
      values: ['audio'],
      assets: {
        audio: {
          label: 'Dolby-style audio',
          source: 'custom',
          customImageDataUrl: 'data:image/png;base64,audio',
          customImageSize: { width: 512, height: 128 },
          layout: {
            enabled: true,
            scale: 1,
            x: 99,
            y: 99,
          },
        },
      },
    },
  })
  const audioMark = getProjectTechnicalMarkAsset(restored.projectTechnicalMarks, 'audio')

  assert.deepEqual(restored.projectTechnicalMarks.values, ['audio'])
  assert.equal(audioMark.source, 'custom')
  assert.equal(audioMark.label, 'Dolby-style audio')
  assert.equal(audioMark.customImageDataUrl, 'data:image/png;base64,audio')
  assert.equal(audioMark.layout.enabled, true)
  assert.equal(audioMark.layout.x < 99, true)
  assert.equal(audioMark.layout.y < 99, true)
})

test('restores inferred platform mark metadata from saved project data', async () => {
  const restored = await restoreSavedProjectState({
    ...baseProject,
    platformMarks: {
      values: ['windows', 'linux'],
      inference: {
        source: 'steam-appdetails',
        status: 'applied',
        steamAppId: 123,
        values: ['windows', 'linux'],
        message: 'Steam appdetails platform flags applied: Windows, Linux.',
      },
      assets: {
        windows: {
          source: 'placeholder',
          customImageDataUrl: null,
          customImageSize: null,
          layout: {
            enabled: true,
            scale: 1,
            x: 99,
            y: 99,
          },
        },
        linux: {
          source: 'placeholder',
          customImageDataUrl: null,
          customImageSize: null,
          layout: {
            enabled: true,
            scale: 1,
            x: 50,
            y: 70,
          },
        },
      },
    },
  })
  const windowsMark = getProjectPlatformMarkAsset(
    restored.projectPlatformMarks,
    'windows',
  )
  const inference = getProjectPlatformMarkInference(restored.projectPlatformMarks)

  assert.deepEqual(restored.projectPlatformMarks.values, ['windows', 'linux'])
  assert.equal(windowsMark.layout.enabled, true)
  assert.equal(windowsMark.layout.x < 99, true)
  assert.equal(windowsMark.layout.y < 99, true)
  assert.equal(inference.source, 'steam-appdetails')
  assert.equal(inference.status, 'applied')
  assert.equal(inference.steamAppId, 123)
  assert.deepEqual(inference.values, ['windows', 'linux'])
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

test('restores saved background artwork visibility', async () => {
  const restored = await restoreSavedProjectState({
    ...baseProject,
    background: {
      ...baseProject.background,
      enabled: false,
      imageDataUrl: 'data:image/png;base64,background',
    },
  })

  assert.equal(restored.isBackgroundArtworkEnabled, false)
  assert.equal(restored.backgroundImageUrl, 'data:image/png;base64,background')
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
      titleValue: 'Custom rendered title',
      values: {
        appId: 'Custom rendered ID',
        backupDate: '2026-05-28',
      },
      valueSources: {
        title: 'manual',
        appId: 'manual',
        backupDate: 'metadata',
      },
    },
  })

  assert.equal(restoredExplicitSources.discTextTitleValue, 'Custom rendered title')
  assert.equal(restoredExplicitSources.discTextValueSources.title, 'manual')
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

  const restoredLegacyTitleSource = await restoreSavedProjectState({
    ...baseProject,
    metadata: {
      ...createDefaultProjectMetadata(),
      title: 'Game metadata title',
      steamAppId: '123',
    },
    discText: {
      titleValue: 'Custom rendered title',
    },
  })

  assert.equal(restoredLegacyTitleSource.discTextTitleValue, 'Custom rendered title')
  assert.equal(restoredLegacyTitleSource.discTextValueSources.title, 'manual')

  const restoredEmptyManualSource = await restoreSavedProjectState({
    ...baseProject,
    metadata: {
      ...createDefaultProjectMetadata(),
      title: 'Manual Saved Title',
      steamAppId: '123',
    },
    discText: {
      titleValue: '',
      values: {
        appId: '',
      },
      valueSources: {
        title: 'manual',
        appId: 'manual',
      },
    },
  })

  assert.equal(restoredEmptyManualSource.discTextValueSources.title, 'metadata')
  assert.equal(restoredEmptyManualSource.discTextValueSources.appId, 'metadata')
})

test('restores saved disc text styles and backfills legacy style defaults', async () => {
  const restoredLegacyStyles = await restoreSavedProjectState(baseProject)
  const restoredSavedStyles = await restoreSavedProjectState({
    ...baseProject,
    discText: {
      styles: {
        title: {
          fontFamily: 'georgia',
          color: '#112233',
          contrast: 'shadow',
          backgroundEnabled: true,
          backgroundColor: '#445566',
          backgroundOpacity: 0.5,
          backgroundPadding: 2.2,
          borderEnabled: true,
          borderColor: '#778899',
          borderRadius: 1.4,
        },
      },
    },
  })

  assert.equal(restoredLegacyStyles.discTextStyles.title.fontFamily, 'arial')
  assert.equal(restoredLegacyStyles.discTextStyles.title.contrast, 'strokeShadow')
  assert.equal(restoredLegacyStyles.discTextStyles.title.backgroundEnabled, false)
  assert.equal(restoredSavedStyles.discTextStyles.title.fontFamily, 'georgia')
  assert.equal(restoredSavedStyles.discTextStyles.title.color, '#112233')
  assert.equal(restoredSavedStyles.discTextStyles.title.contrast, 'shadow')
  assert.equal(restoredSavedStyles.discTextStyles.title.backgroundEnabled, true)
  assert.equal(restoredSavedStyles.discTextStyles.title.backgroundColor, '#445566')
  assert.equal(restoredSavedStyles.discTextStyles.title.backgroundOpacity, 0.5)
  assert.equal(restoredSavedStyles.discTextStyles.title.backgroundPadding, 2.2)
  assert.equal(restoredSavedStyles.discTextStyles.title.borderEnabled, true)
  assert.equal(restoredSavedStyles.discTextStyles.title.borderColor, '#778899')
  assert.equal(restoredSavedStyles.discTextStyles.title.borderRadius, 1.4)
  assert.equal(restoredSavedStyles.discTextStyles.subtitle.backgroundEnabled, false)
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
