import { updateDiscTextValue } from '../discText/index.ts'
import type { DiscTextKey, DiscTextValues } from '../discText/types'
import type { ProjectMetadata } from './projectTypes'
import type {
  DiscTextInputState,
  DiscTextInputUpdate,
  DiscTextInputValueKey,
  DiscTextValueSource,
  DiscTextValueSources,
  MetadataBoundDiscTextKey,
} from './metadataDiscTextTypes'

export type {
  DiscTextInputState,
  DiscTextInputUpdate,
  DiscTextInputValueKey,
  DiscTextValueSource,
  DiscTextValueSources,
  MetadataBoundDiscTextKey,
} from './metadataDiscTextTypes'

function normalizeText(value: string | undefined) {
  return value?.trim() ?? ''
}

export const METADATA_BOUND_DISC_TEXT_KEYS: MetadataBoundDiscTextKey[] = [
  'title',
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
  title: 'metadata',
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
    case 'title':
      return normalizeText(metadata.title)
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
    if (key === 'title') {
      continue
    }

    if (sources[key] === 'manual') {
      continue
    }

    const metadataValue = getProjectMetadataDiscTextValue(key, metadata)
    resolvedValues[key] = metadataValue || values[key]
  }

  return resolvedValues
}

export function resolveMetadataBoundDiscTextTitle(
  titleValue: string,
  metadata: ProjectMetadata,
  sources: DiscTextValueSources = DEFAULT_DISC_TEXT_VALUE_SOURCES,
) {
  if (sources.title === 'manual') {
    return titleValue
  }

  return getProjectMetadataDiscTextValue('title', metadata) || titleValue
}

export function getDiscTextInputState(
  key: DiscTextKey,
  values: DiscTextValues,
  resolvedValues: DiscTextValues,
  sources: DiscTextValueSources,
  titleValue: string,
  resolvedTitle: string,
): DiscTextInputState {
  if (key === 'title') {
    const isManualOverride = sources.title === 'manual'

    return {
      value: isManualOverride ? titleValue : '',
      placeholder: isManualOverride ? '' : resolvedTitle,
      isMetadataBacked: true,
      isManualOverride,
    }
  }

  if (!isMetadataBoundDiscTextKey(key)) {
    return {
      value: values[key],
      placeholder: '',
      isMetadataBacked: false,
      isManualOverride: false,
    }
  }

  const isManualOverride = sources[key] === 'manual'

  return {
    value: isManualOverride ? values[key] : '',
    placeholder: isManualOverride ? '' : resolvedValues[key],
    isMetadataBacked: true,
    isManualOverride,
  }
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

export function updateDiscTextInputValue(
  values: DiscTextValues,
  sources: DiscTextValueSources,
  key: DiscTextInputValueKey,
  value: string,
  titleValue = '',
): DiscTextInputUpdate {
  if (key === 'title') {
    const manualValue = normalizeText(value) ? value : ''

    return {
      values,
      sources: updateDiscTextValueSource(
        sources,
        key,
        manualValue ? 'manual' : 'metadata',
      ),
      titleValue: manualValue,
    }
  }

  if (!isMetadataBoundDiscTextKey(key)) {
    return {
      values: updateDiscTextValue(values, key, value),
      sources,
      titleValue,
    }
  }

  const manualValue = normalizeText(value) ? value : ''

  return {
    values: updateDiscTextValue(values, key, manualValue),
    sources: updateDiscTextValueSource(
      sources,
      key,
      manualValue ? 'manual' : 'metadata',
    ),
    titleValue,
  }
}

export function updateDiscTextInlineDraftValue(
  values: DiscTextValues,
  sources: DiscTextValueSources,
  key: DiscTextInputValueKey,
  value: string,
  titleValue = '',
): DiscTextInputUpdate {
  if (key === 'title') {
    return {
      values,
      sources: updateDiscTextValueSource(sources, key, 'manual'),
      titleValue: value,
    }
  }

  if (!isMetadataBoundDiscTextKey(key)) {
    return {
      values: updateDiscTextValue(values, key, value),
      sources,
      titleValue,
    }
  }

  return {
    values: updateDiscTextValue(values, key, value),
    sources: updateDiscTextValueSource(sources, key, 'manual'),
    titleValue,
  }
}

function isDiscTextValueSource(value: unknown): value is DiscTextValueSource {
  return value === 'metadata' || value === 'manual'
}

function inferDiscTextValueSource(
  key: MetadataBoundDiscTextKey,
  values: DiscTextValues,
  metadata: ProjectMetadata,
  titleValue = '',
): DiscTextValueSource {
  const savedValue = normalizeText(key === 'title' ? titleValue : values[key])
  const metadataValue = getProjectMetadataDiscTextValue(key, metadata)

  if (!savedValue) {
    return 'metadata'
  }

  if (savedValue && savedValue !== metadataValue) {
    return 'manual'
  }

  return 'metadata'
}

export function normalizeDiscTextValueSources(
  sources: Partial<Record<MetadataBoundDiscTextKey, unknown>> | undefined,
  values: DiscTextValues,
  metadata: ProjectMetadata,
  titleValue = '',
): DiscTextValueSources {
  const normalizedSources = createDefaultDiscTextValueSources()

  for (const key of METADATA_BOUND_DISC_TEXT_KEYS) {
    const savedSource = sources?.[key]
    const inferredSource = inferDiscTextValueSource(key, values, metadata, titleValue)
    if (!isDiscTextValueSource(savedSource)) {
      normalizedSources[key] = inferredSource
      continue
    }

    const savedValue = key === 'title' ? titleValue : values[key]
    normalizedSources[key] = normalizeText(savedValue) ? savedSource : 'metadata'
  }

  return normalizedSources
}

export function getDiscTextKeysForProjectMetadataField(
  field: keyof ProjectMetadata,
): MetadataBoundDiscTextKey[] {
  switch (field) {
    case 'title':
      return ['title']
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
