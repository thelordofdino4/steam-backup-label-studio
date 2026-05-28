import type { DiscTextValues } from '../discText'
import type { DiscTextValueSources } from '../project/metadataDiscText'
import { createProjectMetadataFromSteamGame } from '../project/projectMetadata'
import type { ProjectMetadata } from '../project/projectTypes'
import { importSteamApp, type SteamImportedGame } from './steamApi'

export type SteamGameImportResult = {
  importedGame: SteamImportedGame
  manualGameTitle: string
  statusMessage: string
}

function getSteamGameImportStatusMessage(importedGame: SteamImportedGame) {
  const artworkCount = importedGame.artwork.length

  return artworkCount > 0
    ? `Imported Steam metadata and ${artworkCount} artwork asset${artworkCount === 1 ? '' : 's'} for ${importedGame.title}.`
    : `Imported Steam metadata for ${importedGame.title}.`
}

export async function createSteamGameImport(
  appId: number,
): Promise<SteamGameImportResult> {
  const importedGame = await importSteamApp(appId)

  return {
    importedGame,
    manualGameTitle: importedGame.title,
    statusMessage: getSteamGameImportStatusMessage(importedGame),
  }
}

export function applySteamGameImportToProjectMetadata(
  importedGame: SteamImportedGame,
  currentMetadata: ProjectMetadata,
): ProjectMetadata {
  return createProjectMetadataFromSteamGame(importedGame, currentMetadata)
}

export function applySteamGameImportToDiscTextValues(
  importedGame: SteamImportedGame,
  currentDiscTextValues: DiscTextValues,
  discTextValueSources?: DiscTextValueSources,
): DiscTextValues {
  if (discTextValueSources?.appId === 'manual') {
    return currentDiscTextValues
  }

  return {
    ...currentDiscTextValues,
    appId: String(importedGame.appId),
  }
}
