import type { ProjectMetadata } from './projectTypes'
import type { SteamImportedGame } from '../steam/steamApi'

export function createDefaultProjectMetadata(): ProjectMetadata {
  return {
    title: 'Untitled Steam Backup Label',
    subtitle: '',
    steamAppId: '',
    developer: '',
    publisher: '',
    releaseDate: '',
    backupDate: new Date().toISOString().slice(0, 10),
    discNumber: '',
    discTotal: '',
    installNotes: '',
    copyrightText: '',
    ratingSystem: 'none',
    ratingValue: '',
  }
}

export function createProjectMetadataFromSteamGame(
  game: SteamImportedGame,
  currentMetadata: ProjectMetadata = createDefaultProjectMetadata(),
): ProjectMetadata {
  return {
    ...currentMetadata,
    title: game.title,
    steamAppId: String(game.appId),
    developer: game.developer.join(', '),
    publisher: game.publisher.join(', '),
    releaseDate: game.releaseDate ?? '',
  }
}

export function normalizeProjectMetadata(
  metadata: Partial<ProjectMetadata> | undefined,
  fallbackTitle: string,
  selectedSteamGameAppId?: number,
): ProjectMetadata {
  const defaults = createDefaultProjectMetadata()

  return {
    ...defaults,
    ...metadata,
    title: metadata?.title ?? fallbackTitle,
    steamAppId:
      metadata?.steamAppId ??
      (typeof selectedSteamGameAppId === 'number' ? String(selectedSteamGameAppId) : ''),
    ratingSystem: metadata?.ratingSystem ?? 'none',
  }
}
