import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyDiscTextStylePreset,
  createDefaultDiscTextStyles,
} from '../discText/styles.ts'
import { createDefaultProjectMetadata } from './projectMetadata.ts'
import { restoreSavedProjectState } from './restoreProjectState.ts'
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

test('restores saved disc text HTML sources and migrates legacy Markdown', async () => {
  const restored = await restoreSavedProjectState({
    ...baseProject,
    discText: {
      values: {
        customNote: 'plain fallback',
      },
      htmlSources: {
        customNote: '<p>A <strong>HTML</strong> note<script>alert(1)</script></p>',
        title: 42 as unknown as string,
      },
      markdownSources: {
        backupDate: 'A **legacy** note',
      },
    },
  })

  assert.deepEqual(restored.discTextHtmlSources, {
    customNote: '<p>A <strong>HTML</strong> note</p>',
    backupDate: '<p>A <strong>legacy</strong> note</p>',
  })
})

test('restores saved disc text styles and backfills legacy style defaults', async () => {
  const restoredLegacyStyles = await restoreSavedProjectState(baseProject)
  const metallicPresetStyles = applyDiscTextStylePreset(
    createDefaultDiscTextStyles(),
    'title',
    'metallic',
  )
  const restoredSavedStyles = await restoreSavedProjectState({
    ...baseProject,
    discText: {
      styles: {
        title: {
          fontFamily: 'georgia',
          color: '#112233',
          bold: true,
          italic: true,
          underline: true,
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
  const restoredPresetStyles = await restoreSavedProjectState({
    ...baseProject,
    discText: {
      styles: {
        title: metallicPresetStyles.title,
      },
    },
  })

  assert.equal(restoredLegacyStyles.discTextStyles.title.fontFamily, 'arial')
  assert.equal(restoredLegacyStyles.discTextStyles.title.bold, false)
  assert.equal(restoredLegacyStyles.discTextStyles.title.italic, false)
  assert.equal(restoredLegacyStyles.discTextStyles.title.underline, false)
  assert.equal(restoredLegacyStyles.discTextStyles.title.contrast, 'strokeShadow')
  assert.equal(restoredLegacyStyles.discTextStyles.title.backgroundEnabled, false)
  assert.equal(restoredSavedStyles.discTextStyles.title.fontFamily, 'georgia')
  assert.equal(restoredSavedStyles.discTextStyles.title.color, '#112233')
  assert.equal(restoredSavedStyles.discTextStyles.title.bold, true)
  assert.equal(restoredSavedStyles.discTextStyles.title.italic, true)
  assert.equal(restoredSavedStyles.discTextStyles.title.underline, true)
  assert.equal(restoredSavedStyles.discTextStyles.title.contrast, 'shadow')
  assert.equal(restoredSavedStyles.discTextStyles.title.backgroundEnabled, true)
  assert.equal(restoredSavedStyles.discTextStyles.title.backgroundColor, '#445566')
  assert.equal(restoredSavedStyles.discTextStyles.title.backgroundOpacity, 0.5)
  assert.equal(restoredSavedStyles.discTextStyles.title.backgroundPadding, 2.2)
  assert.equal(restoredSavedStyles.discTextStyles.title.borderEnabled, true)
  assert.equal(restoredSavedStyles.discTextStyles.title.borderColor, '#778899')
  assert.equal(restoredSavedStyles.discTextStyles.title.borderRadius, 1.4)
  assert.equal(restoredSavedStyles.discTextStyles.subtitle.backgroundEnabled, false)
  assert.deepEqual(restoredPresetStyles.discTextStyles.title, metallicPresetStyles.title)
})
