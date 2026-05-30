import assert from 'node:assert/strict'
import test from 'node:test'
import { discTemplates } from '../templates/discTemplates.ts'
import {
  createDefaultProjectPlatformMarks,
  getProjectPlatformMarkAsset,
  getProjectPlatformMarkInference,
  markProjectPlatformMarksManual,
  updatePlatformMarkToggle,
} from '../project/projectMediaMark.ts'
import type { SteamImportedGame, SteamPlatformSupport } from './steamApi.ts'
import {
  applySteamPlatformMarksImport,
  inferPlatformMarkValuesFromSteamMetadata,
} from './steamPlatformMarks.ts'

const selectedDiscTemplate = discTemplates.standardPrintableDisc

function createSteamGame(
  appId: number,
  platforms?: SteamPlatformSupport,
): SteamImportedGame {
  return {
    appId,
    title: `Steam Game ${appId}`,
    developer: [],
    publisher: [],
    genres: [],
    categories: [],
    platforms,
    storeUrl: `https://store.steampowered.com/app/${appId}`,
    artwork: [],
  }
}

test('maps reliable Steam appdetails platform flags to Windows, Linux, and macOS marks', () => {
  const result = applySteamPlatformMarksImport({
    importedGame: createSteamGame(100, {
      windows: true,
      linux: true,
      mac: true,
    }),
    currentPlatformMarks: createDefaultProjectPlatformMarks(),
    selectedDiscTemplate,
    previousSelectedSteamGame: null,
  })

  assert.equal(result.status, 'applied')
  assert.deepEqual(result.platformMarks.values, ['windows', 'linux', 'macos'])
  assert.equal(
    getProjectPlatformMarkAsset(result.platformMarks, 'windows').layout.enabled,
    true,
  )
  assert.equal(
    getProjectPlatformMarkAsset(result.platformMarks, 'linux').layout.enabled,
    true,
  )
  assert.equal(
    getProjectPlatformMarkAsset(result.platformMarks, 'macos').layout.enabled,
    true,
  )
  assert.equal(result.platformMarks.inference?.source, 'steam-appdetails')
  assert.equal(result.platformMarks.inference?.status, 'applied')
  assert.equal(result.platformMarks.inference?.steamAppId, 100)
})

test('leaves SteamOS manual because Linux support is not Steam Deck support', () => {
  const detection = inferPlatformMarkValuesFromSteamMetadata({
    windows: false,
    linux: true,
    mac: false,
  })

  assert.equal(detection.status, 'reliable')
  assert.deepEqual(detection.values, ['linux'])
  assert.equal(detection.values.includes('steamDeck'), false)
})

test('clears previous auto-applied marks when the next game has no reliable platform data', () => {
  const firstImport = applySteamPlatformMarksImport({
    importedGame: createSteamGame(100, {
      windows: true,
      linux: true,
      mac: false,
    }),
    currentPlatformMarks: createDefaultProjectPlatformMarks(),
    selectedDiscTemplate,
    previousSelectedSteamGame: null,
  })
  const nextGame = createSteamGame(200)
  const result = applySteamPlatformMarksImport({
    importedGame: nextGame,
    currentPlatformMarks: firstImport.platformMarks,
    selectedDiscTemplate,
    previousSelectedSteamGame: createSteamGame(100),
  })

  assert.equal(result.status, 'no-data')
  assert.deepEqual(result.platformMarks.values, [])
  assert.equal(
    getProjectPlatformMarkAsset(result.platformMarks, 'windows').layout.enabled,
    false,
  )
  assert.equal(result.platformMarks.inference?.source, 'steam-appdetails')
  assert.equal(result.platformMarks.inference?.status, 'no-data')
  assert.equal(result.platformMarks.inference?.steamAppId, 200)
})

test('preserves manual platform mark overrides when reimporting the same Steam game', () => {
  const currentPlatformMarks = markProjectPlatformMarksManual(
    updatePlatformMarkToggle(
      createDefaultProjectPlatformMarks(),
      'pc',
      true,
      selectedDiscTemplate,
    ),
    100,
  )
  const result = applySteamPlatformMarksImport({
    importedGame: createSteamGame(100, {
      windows: true,
      linux: false,
      mac: false,
    }),
    currentPlatformMarks,
    selectedDiscTemplate,
    previousSelectedSteamGame: createSteamGame(100),
  })

  assert.equal(result.status, 'skipped-manual')
  assert.deepEqual(result.platformMarks.values, ['pc'])
  assert.equal(getProjectPlatformMarkInference(result.platformMarks).source, 'manual')
})

test('updates manual marks when switching to a different Steam game with reliable metadata', () => {
  const currentPlatformMarks = markProjectPlatformMarksManual(
    updatePlatformMarkToggle(
      createDefaultProjectPlatformMarks(),
      'pc',
      true,
      selectedDiscTemplate,
    ),
    100,
  )
  const result = applySteamPlatformMarksImport({
    importedGame: createSteamGame(200, {
      windows: false,
      linux: true,
      mac: false,
    }),
    currentPlatformMarks,
    selectedDiscTemplate,
    previousSelectedSteamGame: createSteamGame(100),
  })

  assert.equal(result.status, 'applied')
  assert.deepEqual(result.platformMarks.values, ['linux'])
  assert.equal(getProjectPlatformMarkInference(result.platformMarks).source, 'steam-appdetails')
})
