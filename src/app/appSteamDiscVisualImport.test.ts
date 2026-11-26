import assert from 'node:assert/strict'
import test from 'node:test'
import type {
  DiscTextMetadataResolution,
} from '../discText/metadataStateTransitions.ts'
import { createDefaultProjectMetadata } from '../project/projectMetadata.ts'
import { createDefaultProjectPlatformMarks } from '../project/projectPlatformMarks.ts'
import type { SteamImportedGame } from '../steam/steamApi.ts'
import type {
  SteamPlatformMarkImportResult,
} from '../steam/steamPlatformMarks.ts'
import type {
  SteamTitleArtworkImportResult,
} from '../steam/steamTitleArtworkImport.ts'
import { discTemplates } from '../templates/discTemplates.ts'
import {
  applyPreparedSteamDiscVisualDefaultImport,
  prepareSteamDiscVisualDefaultImport,
  shouldApplySteamPlatformMarksEligibilityChange,
} from './appSteamDiscVisualImport.ts'

function createImportedGame(
  overrides: Partial<SteamImportedGame> = {},
): SteamImportedGame {
  return {
    appId: 620,
    title: 'Portal 2',
    developer: ['Valve'],
    publisher: ['Valve'],
    releaseDate: '2011-04-18',
    genres: [],
    categories: [],
    storeUrl: 'https://store.steampowered.com/app/620/Portal_2/',
    artwork: [],
    ...overrides,
  }
}

test('Steam disc visual default import stages artwork before applying any text or title owner', async () => {
  const importedGame = createImportedGame()
  const metadata = createDefaultProjectMetadata()
  const currentPlatformMarks = createDefaultProjectPlatformMarks()
  const nextPlatformMarks = {
    ...currentPlatformMarks,
    values: ['windows' as const],
  }
  const nextDiscTextResolution = {
    resolvedDiscTextTitle: 'Portal 2',
  } as DiscTextMetadataResolution
  const callOrder: string[] = []

  const prepared = await prepareSteamDiscVisualDefaultImport({
    importedGame,
    nextProjectMetadata: metadata,
    shouldUpdateCopyrightDiscTextSource: true,
    projectPlatformMarks: currentPlatformMarks,
    selectedDiscTemplate: discTemplates.standardPrintableDisc,
    selectedSteamGame: null,
    prepareSteamTitleArtworkImport: async (game): Promise<SteamTitleArtworkImportResult> => {
      callOrder.push('title-artwork')
      assert.equal(game, importedGame)
      return {
        titleArtwork: {} as SteamTitleArtworkImportResult['titleArtwork'],
        status: 'seeded',
        statusMessage: 'Using Steam logo as the disc title artwork.',
      }
    },
    applyPlatformMarksImport: (params): SteamPlatformMarkImportResult => {
      callOrder.push('platform-marks')
      assert.equal(params.importedGame, importedGame)
      assert.equal(params.currentPlatformMarks, currentPlatformMarks)
      assert.equal(params.selectedDiscTemplate, discTemplates.standardPrintableDisc)
      assert.equal(params.previousSelectedSteamGame, null)
      return {
        platformMarks: nextPlatformMarks,
        status: 'applied',
        values: ['windows'],
        statusMessage: 'Updated operating system marks from Steam appdetails: Windows.',
      }
    },
  })

  assert.deepEqual(callOrder, ['title-artwork', 'platform-marks'])
  assert.ok(Object.isFrozen(prepared))
  const result = applyPreparedSteamDiscVisualDefaultImport(prepared, {
    applySteamImportedDiscTextValues: (game, projectMetadata, options) => {
      callOrder.push('disc-text')
      assert.equal(game, importedGame)
      assert.equal(projectMetadata, metadata)
      assert.deepEqual(options, { useMetadataCopyright: true })
      return nextDiscTextResolution
    },
    applySteamTitleArtworkImport: (prepared) => { callOrder?.push('apply-title-artwork'); return prepared },
  })
  assert.deepEqual(callOrder, ['title-artwork', 'platform-marks', 'disc-text', 'apply-title-artwork'])
  assert.equal(result.nextDiscTextResolution, nextDiscTextResolution)
  assert.equal(result.platformMarks, nextPlatformMarks)
  assert.equal(result.platformMarkImportStatus, 'applied')
  assert.equal(
    result.titleArtworkStatusMessage,
    'Using Steam logo as the disc title artwork.',
  )
  assert.equal(
    result.platformMarkStatusMessage,
    'Updated operating system marks from Steam appdetails: Windows.',
  )
})

test('Steam disc visual default import passes through copyright metadata source decisions', async () => {
  const importedGame = createImportedGame()
  const metadata = createDefaultProjectMetadata()
  const platformMarks = createDefaultProjectPlatformMarks()
  const nextDiscTextResolution = {
    resolvedDiscTextTitle: 'Portal 2',
  } as DiscTextMetadataResolution

  const prepared = await prepareSteamDiscVisualDefaultImport({
    importedGame,
    nextProjectMetadata: metadata,
    shouldUpdateCopyrightDiscTextSource: false,
    projectPlatformMarks: platformMarks,
    selectedDiscTemplate: discTemplates.standardPrintableDisc,
    selectedSteamGame: createImportedGame({ appId: 400, title: 'Portal' }),
    prepareSteamTitleArtworkImport: async () => ({
      titleArtwork: {} as SteamTitleArtworkImportResult['titleArtwork'],
      status: 'unavailable',
      statusMessage: 'No Steam title/logo artwork was found.',
    }),
    applyPlatformMarksImport: (params) => ({
      platformMarks: params.currentPlatformMarks,
      status: 'no-data',
      values: [],
      statusMessage: 'Steam appdetails did not include reliable operating system metadata.',
    }),
  })

  assert.ok(Object.isFrozen(prepared))
  const result = applyPreparedSteamDiscVisualDefaultImport(prepared, {
    applySteamImportedDiscTextValues: (_game, _metadata, options) => {
      assert.deepEqual(options, { useMetadataCopyright: false })
      return nextDiscTextResolution
    },
    applySteamTitleArtworkImport: (prepared) => prepared,
  })
  assert.equal(result.platformMarkImportStatus, 'no-data')
  assert.equal(
    shouldApplySteamPlatformMarksEligibilityChange(
      result.platformMarkImportStatus,
    ),
    true,
  )
})

test('Steam disc visual default import preserves skipped-manual OS placement eligibility', async () => {
  const importedGame = createImportedGame()
  const metadata = createDefaultProjectMetadata()
  const platformMarks = createDefaultProjectPlatformMarks()

  const prepared = await prepareSteamDiscVisualDefaultImport({
    importedGame,
    nextProjectMetadata: metadata,
    shouldUpdateCopyrightDiscTextSource: false,
    projectPlatformMarks: platformMarks,
    selectedDiscTemplate: discTemplates.standardPrintableDisc,
    selectedSteamGame: importedGame,
    prepareSteamTitleArtworkImport: async () => ({
      titleArtwork: {} as SteamTitleArtworkImportResult['titleArtwork'],
      status: 'unavailable',
      statusMessage: 'No Steam title/logo artwork was found.',
    }),
    applyPlatformMarksImport: (params) => ({
      platformMarks: params.currentPlatformMarks,
      status: 'skipped-manual',
      values: params.currentPlatformMarks.values,
      statusMessage: 'Kept manually edited operating system marks.',
    }),
  })

  assert.ok(Object.isFrozen(prepared))
  const result = applyPreparedSteamDiscVisualDefaultImport(prepared, {
    applySteamImportedDiscTextValues: () => ({
      resolvedDiscTextTitle: 'Portal 2',
    }) as DiscTextMetadataResolution,
    applySteamTitleArtworkImport: (prepared) => prepared,
  })
  assert.equal(result.platformMarks, platformMarks)
  assert.equal(result.platformMarkImportStatus, 'skipped-manual')
  assert.equal(
    shouldApplySteamPlatformMarksEligibilityChange(
      result.platformMarkImportStatus,
    ),
    false,
  )
})
