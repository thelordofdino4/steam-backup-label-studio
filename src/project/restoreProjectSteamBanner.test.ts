import assert from 'node:assert/strict'
import test from 'node:test'
import { DEFAULT_STEAM_BANNER_FALLBACK_TEXT } from '../branding/steamBannerDefaults.ts'
import {
  restoreSavedProjectState,
} from './restoreProjectState.ts'
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

test('restores saved built-in Steam banner lockups with the current included default', async () => {
  const restored = await restoreSavedProjectState(
    {
      ...baseProject,
      steamBackupLogo: {
        placement: 'top',
        lockupImageDataUrl: '/assets/steam-default-lockup-stale.png',
        lockupImageSource: {
          source: 'built-in',
          sourceId: null,
          sourceLabel: 'Default Steam banner lockup',
        },
        lockupImageSize: null,
      },
    },
    {
      defaultSteamBannerLockupImageUrl: 'current-default-lockup.png',
    },
  )

  assert.equal(restored.steamBannerLockupImageUrl, 'current-default-lockup.png')
  assert.equal(restored.steamBannerLockupImageSource?.source, 'built-in')
  assert.equal(restored.steamBannerLockupImageSize, null)
})

test('restores saved Steam banner text fallback while keeping the lockup image', async () => {
  const restored = await restoreSavedProjectState({
    ...baseProject,
    steamBackupLogo: {
      placement: 'bottom',
      lockupImageDataUrl: 'data:image/png;base64,custom-lockup',
      lockupImageSize: { width: 480, height: 128 },
      useTextFallback: true,
      fallbackText: 'Taihazu Archive',
    },
  })

  assert.equal(restored.steamLogoPlacement, 'bottom')
  assert.equal(restored.steamBannerLockupImageUrl, 'data:image/png;base64,custom-lockup')
  assert.equal(restored.steamBannerUseTextFallback, true)
  assert.equal(restored.steamBannerFallbackText, 'Taihazu Archive')
})

test('normalizes blank Steam banner fallback text to the default', async () => {
  const restored = await restoreSavedProjectState({
    ...baseProject,
    steamBackupLogo: {
      placement: 'top',
      useTextFallback: true,
      fallbackText: '   ',
    },
  })

  assert.equal(restored.steamBannerUseTextFallback, true)
  assert.equal(restored.steamBannerFallbackText, DEFAULT_STEAM_BANNER_FALLBACK_TEXT)
})
