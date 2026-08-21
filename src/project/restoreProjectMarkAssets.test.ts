import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getProjectPlatformMarkAsset,
  getProjectPlatformMarkInference,
} from './projectPlatformMarks.ts'
import { getProjectTechnicalMarkAsset } from './projectTechnicalMarks.ts'
import type { SavedDiscProject } from './projectTypes.ts'
import { CURRENT_PROJECT_SCHEMA_VERSION } from './projectSchema.ts'
import {
  restoreSavedProjectState,
} from './restoreProjectState.ts'

const baseProject: SavedDiscProject = {
  schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
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
