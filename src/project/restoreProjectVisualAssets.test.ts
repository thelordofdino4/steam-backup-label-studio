import assert from 'node:assert/strict'
import test from 'node:test'
import { discTemplates } from '../templates/discTemplates.ts'
import {
  restoreSavedProjectState,
} from './restoreProjectState.ts'
import { createDefaultProjectMetadata } from './projectMetadata.ts'
import type { SavedDiscProject } from './projectTypes.ts'

const baseProject: SavedDiscProject = {
  schemaVersion: '0.2.0',
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

test('restores disabled rating badge source layout and supplemental USK state', async () => {
  const restored = await restoreSavedProjectState({
    ...baseProject,
    metadata: {
      ...createDefaultProjectMetadata(),
      ratingSystem: 'PEGI',
      ratingValue: '16',
    },
    ratingBadge: {
      source: 'custom',
      customImageDataUrl: 'data:image/png;base64,rating',
      customImageSize: { width: 128, height: 96 },
      layout: {
        enabled: false,
        scale: 1.25,
        x: 78,
        y: 50,
      },
      uskBadge: {
        ratingValue: '12',
        layout: {
          enabled: true,
          scale: 1.3,
          x: 67,
          y: 50,
        },
      },
    },
  })

  assert.equal(restored.projectMetadata.ratingSystem, 'PEGI')
  assert.equal(restored.projectMetadata.ratingValue, '16')
  assert.equal(restored.projectRatingBadge.layout.enabled, false)
  assert.equal(restored.projectRatingBadge.source, 'custom')
  assert.equal(restored.projectRatingBadge.customImageDataUrl, 'data:image/png;base64,rating')
  assert.deepEqual(restored.projectRatingBadge.customImageSize, { width: 128, height: 96 })
  assert.equal(restored.projectRatingBadge.layout.scale, 1.25)
  assert.equal(restored.projectRatingBadge.layout.x, 78)
  assert.equal(restored.projectRatingBadge.layout.y, 50)
  assert.equal(restored.projectRatingBadge.uskBadge.ratingValue, '12')
  assert.equal(restored.projectRatingBadge.uskBadge.layout.enabled, true)
  assert.equal(restored.projectRatingBadge.uskBadge.layout.scale, 1.3)
  assert.equal(restored.projectRatingBadge.uskBadge.layout.x, 67)
  assert.equal(restored.projectRatingBadge.uskBadge.layout.y, 50)
})

test('restores saved asset provenance and defaults legacy embedded assets safely', async () => {
  const restored = await restoreSavedProjectState({
    ...baseProject,
    steamBackupLogo: {
      placement: 'top',
      lockupImageDataUrl: 'data:image/png;base64,custom-lockup',
      lockupImageSize: { width: 480, height: 128 },
    },
    background: {
      ...baseProject.background,
      imageDataUrl: 'data:image/png;base64,background',
      imageSource: {
        source: 'local-steam-screenshot',
        sourceId: 'shot-1',
        sourceLabel: 'C:\\Users\\John\\Steam\\screenshots\\shot.png',
        sourceUrl: 'file:///C:/Users/John/Steam/screenshots/shot.png',
      },
    },
    logoAssets: {
      developerLogoDataUrl: 'data:image/png;base64,developer',
      developerLogoSource: {
        source: 'steam-logo-candidate',
        sourceId: 'candidate-1',
        sourceLabel: 'Developer logo',
        sourceUrl: 'https://example.test/logo.png',
      },
    },
  })

  assert.equal(restored.backgroundImageSource?.source, 'local-steam-screenshot')
  assert.equal(restored.backgroundImageSource?.sourceId, 'shot-1')
  assert.equal(restored.backgroundImageSource?.sourceLabel, 'shot.png')
  assert.equal(restored.backgroundImageSource?.sourceUrl, null)
  assert.equal(restored.steamBannerLockupImageSource?.source, 'embedded')
  assert.equal(restored.projectLogoAssets.developerLogoSource?.source, 'steam-logo-candidate')
  assert.equal(restored.projectLogoAssets.developerLogoSource?.sourceUrl, 'https://example.test/logo.png')
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

test('restores custom template, clamps foreground layouts, and backfills old background image size', async () => {
  let resolveCount = 0
  const project: SavedDiscProject = {
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
