import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  restoreProjectStateFromContents,
} from './restoreProjectState.ts'
import { DEFAULT_STEAM_BANNER_FALLBACK_TEXT } from '../branding/steamBannerDefaults.ts'
import type { SavedDiscProject } from './projectTypes.ts'

type LegacySavedDiscProject = Omit<SavedDiscProject, 'schemaVersion'> & {
  schemaVersion: '0.1.0'
}

const baseProject: LegacySavedDiscProject = {
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
  assert.equal(restored.steamBannerUseTextFallback, false)
  assert.equal(restored.steamBannerFallbackText, DEFAULT_STEAM_BANNER_FALLBACK_TEXT)
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
