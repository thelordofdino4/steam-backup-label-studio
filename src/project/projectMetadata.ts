import type { GameRatingSystem, ProjectMetadata } from './projectTypes'
import type { SteamImportedGame } from '../steam/steamApi'

const ESRB_RATING_VALUES = ['RP', 'E', 'E10+', 'T', 'M', 'AO'] as const
const PEGI_RATING_VALUES = ['3', '7', '12', '16', '18'] as const
const DEFAULT_ENABLED_RATING_SYSTEM: GameRatingSystem = 'ESRB'
const DEFAULT_ENABLED_RATING_VALUE = 'E'

export function getRatingValuesForSystem(system: GameRatingSystem): readonly string[] {
  if (system === 'ESRB') {
    return ESRB_RATING_VALUES
  }

  if (system === 'PEGI') {
    return PEGI_RATING_VALUES
  }

  return []
}

export function getActiveRatingSystemForBadge(system: GameRatingSystem): GameRatingSystem {
  return system === 'none' ? DEFAULT_ENABLED_RATING_SYSTEM : system
}

export function getCoercedRatingValueForSystem(
  system: GameRatingSystem,
  currentRatingValue: string,
): string {
  if (system === 'none') {
    return ''
  }

  const allowedValues = getRatingValuesForSystem(system)

  if (allowedValues.length > 0 && !allowedValues.includes(currentRatingValue)) {
    return allowedValues[0]
  }

  if (system === 'custom' && currentRatingValue === '') {
    return 'Custom'
  }

  return currentRatingValue
}

export function getRatingMetadataForSystemChange(
  metadata: ProjectMetadata,
  ratingSystem: GameRatingSystem,
): Pick<ProjectMetadata, 'ratingSystem' | 'ratingValue'> {
  return {
    ratingSystem,
    ratingValue: getCoercedRatingValueForSystem(ratingSystem, metadata.ratingValue),
  }
}

export function getRatingMetadataForBadgeEnabled(
  metadata: ProjectMetadata,
): Pick<ProjectMetadata, 'ratingSystem' | 'ratingValue'> {
  if (metadata.ratingSystem !== 'none') {
    return {
      ratingSystem: metadata.ratingSystem,
      ratingValue: getCoercedRatingValueForSystem(
        metadata.ratingSystem,
        metadata.ratingValue,
      ),
    }
  }

  return {
    ratingSystem: DEFAULT_ENABLED_RATING_SYSTEM,
    ratingValue: DEFAULT_ENABLED_RATING_VALUE,
  }
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
