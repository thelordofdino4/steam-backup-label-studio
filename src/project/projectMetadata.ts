import type { GameRatingSystem, ProjectMetadata } from './projectTypes'
import type { SteamImportedGame } from '../steam/steamApi'

export const ESRB_RATING_VALUES = ['E', 'E10+', 'T', 'M', 'AO', 'RP', 'RP17+'] as const
export const PEGI_RATING_VALUES = ['3', '7', '12', '16', '18'] as const
export const USK_RATING_VALUES = ['0', '6', '12', '16', '18'] as const
const DEFAULT_ENABLED_RATING_SYSTEM: GameRatingSystem = 'ESRB'
const DEFAULT_ENABLED_RATING_VALUE = 'E'

export type EsrbRatingValue = (typeof ESRB_RATING_VALUES)[number]
export type PegiRatingValue = (typeof PEGI_RATING_VALUES)[number]
export type UskRatingValue = (typeof USK_RATING_VALUES)[number]

function normalizeForRatingMatch(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9+]+/g, ' ')
    .trim()
}

export function normalizeEsrbRatingValue(value: string): EsrbRatingValue | null {
  const normalized = normalizeForRatingMatch(value)
  const compact = normalized.replace(/\s+/g, '')
  const tokens = normalized.split(/\s+/).filter(Boolean)
  const hasRatingPending =
    tokens.includes('rp') ||
    compact.includes('rp17') ||
    compact.includes('rplm17') ||
    compact.includes('ratingpending')
  const hasSeventeenSignal =
    compact.includes('17+') ||
    /\b17\b/.test(normalized) ||
    compact.includes('lm17') ||
    compact.includes('m17') ||
    normalized.includes('likely mature')

  if (hasRatingPending && hasSeventeenSignal) return 'RP17+'
  if (tokens.includes('ao') || normalized.includes('adults only')) return 'AO'
  if (normalized.includes('e10') || normalized.includes('everyone 10')) return 'E10+'
  if (hasRatingPending) return 'RP'
  if (tokens.includes('m') || normalized.includes('mature')) return 'M'
  if (tokens.includes('t') || normalized.includes('teen')) return 'T'
  if (tokens.includes('e') || normalized.includes('everyone')) return 'E'

  return null
}

export function normalizePegiRatingValue(value: string): PegiRatingValue | null {
  const normalized = normalizeForRatingMatch(value)
  const compact = normalized.replace(/\s+/g, '')
  const rating =
    normalized.match(/\b(3|7|12|16|18)\b/)?.[1] ??
    compact.match(/^pegi(3|7|12|16|18)$/)?.[1] ??
    null

  return PEGI_RATING_VALUES.includes(rating as PegiRatingValue)
    ? rating as PegiRatingValue
    : null
}

export function normalizeUskRatingValue(value: string): UskRatingValue | null {
  const normalized = normalizeForRatingMatch(value)
  const compact = normalized.replace(/\s+/g, '')
  const rating =
    normalized.match(/\b(0|6|12|16|18)\b/)?.[1] ??
    compact.match(/^usk(0|6|12|16|18)$/)?.[1] ??
    null

  return USK_RATING_VALUES.includes(rating as UskRatingValue)
    ? rating as UskRatingValue
    : null
}

export function getRatingValuesForSystem(system: GameRatingSystem): readonly string[] {
  if (system === 'ESRB') {
    return ESRB_RATING_VALUES
  }

  if (system === 'PEGI') {
    return PEGI_RATING_VALUES
  }

  if (system === 'USK') {
    return USK_RATING_VALUES
  }

  return []
}

export function formatRatingValueForSystem(system: GameRatingSystem, value: string) {
  if (system === 'PEGI' || system === 'USK') {
    return `${system} ${value}`
  }

  return value
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
