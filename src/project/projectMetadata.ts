import type { GameRatingSystem, ProjectMetadata } from './projectTypes'
import type { SteamImportedGame } from '../steam/steamApi'

const ESRB_RATING_VALUES = ['RP', 'E', 'E10+', 'T', 'M', 'AO'] as const
const PEGI_RATING_VALUES = ['3', '7', '12', '16', '18'] as const

export function getRatingValuesForSystem(system: GameRatingSystem): readonly string[] {
  if (system === 'ESRB') {
    return ESRB_RATING_VALUES
  }

  if (system === 'PEGI') {
    return PEGI_RATING_VALUES
  }

  return []
}

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

export function updateProjectMetadataField(
  metadata: ProjectMetadata,
  field: keyof ProjectMetadata,
  value: string,
): ProjectMetadata {
  return {
    ...metadata,
    [field]: value,
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
