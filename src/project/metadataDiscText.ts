import type { DiscTextKey, DiscTextValues } from '../discText'
import type { ProjectMetadata } from './projectTypes'

function normalizeText(value: string | undefined) {
  return value?.trim() ?? ''
}

export type MetadataBoundDiscTextKey = Exclude<keyof DiscTextValues, 'customNote'>
export type DiscTextValueSource = 'metadata' | 'manual'
export type DiscTextValueSources = Record<MetadataBoundDiscTextKey, DiscTextValueSource>

export const METADATA_BOUND_DISC_TEXT_KEYS: MetadataBoundDiscTextKey[] = [
  'subtitle',
  'discNumber',
  'backupDate',
  'appId',
  'developer',
  'publisher',
  'installNotes',
  'copyright',
]

const DEFAULT_DISC_TEXT_VALUE_SOURCES: DiscTextValueSources = {
  subtitle: 'metadata',
  discNumber: 'metadata',
  backupDate: 'metadata',
  appId: 'metadata',
  developer: 'metadata',
  publisher: 'metadata',
  installNotes: 'metadata',
  copyright: 'metadata',
}

export function createDefaultDiscTextValueSources(): DiscTextValueSources {
  return { ...DEFAULT_DISC_TEXT_VALUE_SOURCES }
}

export function isMetadataBoundDiscTextKey(
  key: DiscTextKey,
): key is MetadataBoundDiscTextKey {
  return METADATA_BOUND_DISC_TEXT_KEYS.includes(key as MetadataBoundDiscTextKey)
}

export function getProjectMetadataDiscNumberText(metadata: ProjectMetadata) {
  const discNumber = normalizeText(metadata.discNumber)
  const discTotal = normalizeText(metadata.discTotal)

  if (discNumber && discTotal) {
    return `Disc ${discNumber} of ${discTotal}`
  }

  if (discNumber) {
    return `Disc ${discNumber}`
  }

  if (discTotal) {
    return `Disc 1 of ${discTotal}`
  }

  return ''
}

export function getProjectMetadataDiscTextValue(
  key: MetadataBoundDiscTextKey,
  metadata: ProjectMetadata,
) {
  switch (key) {
    case 'subtitle':
      return normalizeText(metadata.subtitle)
    case 'discNumber':
      return getProjectMetadataDiscNumberText(metadata)
    case 'backupDate':
      return normalizeText(metadata.backupDate)
    case 'appId':
      return normalizeText(metadata.steamAppId)
    case 'developer':
      return normalizeText(metadata.developer)
    case 'publisher':
      return normalizeText(metadata.publisher)
    case 'installNotes':
      return normalizeText(metadata.installNotes)
    case 'copyright':
      return normalizeText(metadata.copyrightText)
  }
}

export function resolveMetadataBoundDiscTextValues(
  values: DiscTextValues,
  metadata: ProjectMetadata,
  sources: DiscTextValueSources = DEFAULT_DISC_TEXT_VALUE_SOURCES,
): DiscTextValues {
  const resolvedValues = { ...values }

  for (const key of METADATA_BOUND_DISC_TEXT_KEYS) {
    if (sources[key] === 'manual') {
      continue
    }

    const metadataValue = getProjectMetadataDiscTextValue(key, metadata)
    resolvedValues[key] = metadataValue || values[key]
  }

  return resolvedValues
}

export function updateDiscTextValueSource(
  sources: DiscTextValueSources,
  key: MetadataBoundDiscTextKey,
  source: DiscTextValueSource,
): DiscTextValueSources {
  return {
    ...sources,
    [key]: source,
  }
}

function isDiscTextValueSource(value: unknown): value is DiscTextValueSource {
  return value === 'metadata' || value === 'manual'
}

function inferDiscTextValueSource(
  key: MetadataBoundDiscTextKey,
  values: DiscTextValues,
  metadata: ProjectMetadata,
): DiscTextValueSource {
  const savedValue = normalizeText(values[key])
  const metadataValue = getProjectMetadataDiscTextValue(key, metadata)

  if (savedValue && savedValue !== metadataValue) {
    return 'manual'
  }

  return 'metadata'
}

export function normalizeDiscTextValueSources(
  sources: Partial<Record<MetadataBoundDiscTextKey, unknown>> | undefined,
  values: DiscTextValues,
  metadata: ProjectMetadata,
): DiscTextValueSources {
  const normalizedSources = createDefaultDiscTextValueSources()

  for (const key of METADATA_BOUND_DISC_TEXT_KEYS) {
    const savedSource = sources?.[key]
    normalizedSources[key] = isDiscTextValueSource(savedSource)
      ? savedSource
      : inferDiscTextValueSource(key, values, metadata)
  }

  return normalizedSources
}

export function getDiscTextKeysForProjectMetadataField(
  field: keyof ProjectMetadata,
): MetadataBoundDiscTextKey[] {
  switch (field) {
    case 'subtitle':
      return ['subtitle']
    case 'steamAppId':
      return ['appId']
    case 'developer':
      return ['developer']
    case 'publisher':
      return ['publisher']
    case 'backupDate':
      return ['backupDate']
    case 'discNumber':
    case 'discTotal':
      return ['discNumber']
    case 'installNotes':
      return ['installNotes']
    case 'copyrightText':
      return ['copyright']
    default:
      return []
  }
}
