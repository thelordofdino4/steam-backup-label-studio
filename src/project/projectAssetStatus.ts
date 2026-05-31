import type {
  ProjectImageAssetProvenance,
  ProjectImageAssetSource,
} from './projectTypes'

export type ProjectImageAssetStatus = {
  sourceLabel: string
  sourceTypeLabel: string
  embeddedLabel: string
  availabilityLabel: string
  privacyLabel: string | null
  summary: string
}

type ProjectImageAssetProvenanceInput = {
  source: ProjectImageAssetSource
  sourceId?: string | null
  sourceLabel: string
  sourceUrl?: string | null
}

type ProjectImageAssetStatusInput = {
  imageDataUrl?: string | null
  provenance?: ProjectImageAssetProvenance | null
  fallbackLabel: string
}

const PROJECT_IMAGE_ASSET_SOURCE_LABELS: Record<ProjectImageAssetSource, string> = {
  'built-in': 'Built-in asset',
  placeholder: 'Built-in generic',
  'steam-artwork': 'Steam artwork',
  'web-artwork': 'Web artwork',
  'steam-logo-candidate': 'Steam logo candidate',
  'official-logo-candidate': 'Official-site logo candidate',
  'local-steam-screenshot': 'Local Steam screenshot',
  uploaded: 'Uploaded local file',
  custom: 'Custom image',
  embedded: 'Embedded image',
}

function looksLikeLocalPath(value: string) {
  return /^[a-z]:[\\/]/i.test(value) ||
    value.startsWith('\\\\') ||
    value.startsWith('/') ||
    value.startsWith('file:')
}

function getSafePathTail(value: string) {
  return value.replace(/\\/g, '/').split('/').filter(Boolean).pop() ?? value
}

export function sanitizeProjectImageAssetSourceLabel(
  value: unknown,
  fallbackLabel: string,
) {
  if (typeof value !== 'string') return fallbackLabel

  const trimmed = value.trim()
  if (!trimmed) return fallbackLabel

  return looksLikeLocalPath(trimmed) ? getSafePathTail(trimmed) : trimmed
}

function normalizeProjectImageAssetSource(value: unknown): ProjectImageAssetSource | null {
  return typeof value === 'string' && value in PROJECT_IMAGE_ASSET_SOURCE_LABELS
    ? value as ProjectImageAssetSource
    : null
}

function normalizeProjectImageAssetSourceId(value: unknown) {
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  if (!trimmed || looksLikeLocalPath(trimmed)) return null

  return trimmed
}

function normalizeProjectImageAssetSourceUrl(value: unknown) {
  if (typeof value !== 'string') return null

  try {
    const parsedUrl = new URL(value)
    return parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:'
      ? parsedUrl.href
      : null
  } catch {
    return null
  }
}

export function createProjectImageAssetProvenance({
  source,
  sourceId = null,
  sourceLabel,
  sourceUrl = null,
}: ProjectImageAssetProvenanceInput): ProjectImageAssetProvenance {
  return {
    source,
    sourceId: normalizeProjectImageAssetSourceId(sourceId),
    sourceLabel: sanitizeProjectImageAssetSourceLabel(
      sourceLabel,
      PROJECT_IMAGE_ASSET_SOURCE_LABELS[source],
    ),
    sourceUrl: normalizeProjectImageAssetSourceUrl(sourceUrl),
  }
}

export function normalizeProjectImageAssetProvenance(
  value: Partial<ProjectImageAssetProvenance> | null | undefined,
  fallback: ProjectImageAssetProvenance | null = null,
): ProjectImageAssetProvenance | null {
  const source = normalizeProjectImageAssetSource(value?.source)

  if (!source) return fallback

  return createProjectImageAssetProvenance({
    source,
    sourceId: value?.sourceId,
    sourceLabel: value?.sourceLabel ?? PROJECT_IMAGE_ASSET_SOURCE_LABELS[source],
    sourceUrl: value?.sourceUrl,
  })
}

export function createEmbeddedProjectImageAssetProvenance(
  sourceLabel: string,
): ProjectImageAssetProvenance {
  return createProjectImageAssetProvenance({
    source: 'embedded',
    sourceLabel,
  })
}

export function getProjectImageAssetSourceTypeLabel(
  source: ProjectImageAssetSource,
) {
  return PROJECT_IMAGE_ASSET_SOURCE_LABELS[source]
}

export function isEmbeddedProjectImageAsset(imageDataUrl: string | null | undefined) {
  return Boolean(imageDataUrl?.startsWith('data:'))
}

export function getProjectImageAssetStatus({
  imageDataUrl,
  provenance,
  fallbackLabel,
}: ProjectImageAssetStatusInput): ProjectImageAssetStatus {
  const normalizedProvenance = provenance ??
    (imageDataUrl ? createEmbeddedProjectImageAssetProvenance(fallbackLabel) : null)
  const sourceTypeLabel = normalizedProvenance
    ? getProjectImageAssetSourceTypeLabel(normalizedProvenance.source)
    : 'No image'
  const sourceLabel = normalizedProvenance?.sourceLabel ?? fallbackLabel
  const isEmbedded = isEmbeddedProjectImageAsset(imageDataUrl)
  const isBundled =
    normalizedProvenance?.source === 'built-in' ||
    normalizedProvenance?.source === 'placeholder'
  const embeddedLabel = isEmbedded
    ? 'embedded in project'
    : isBundled
      ? 'bundled with app'
      : imageDataUrl
        ? 'referenced by project'
        : 'no embedded image'
  const availabilityLabel = isEmbedded || isBundled
    ? 'Original source is not required after reload.'
    : 'Original source availability is unknown until reused.'
  const privacyLabel =
    normalizedProvenance?.source === 'uploaded' ||
    normalizedProvenance?.source === 'local-steam-screenshot'
      ? 'Local path is not stored.'
      : null
  const summaryParts = [
    sourceLabel,
    sourceTypeLabel,
    embeddedLabel,
    privacyLabel,
  ].filter(Boolean)

  return {
    sourceLabel,
    sourceTypeLabel,
    embeddedLabel,
    availabilityLabel,
    privacyLabel,
    summary: summaryParts.join(' · '),
  }
}
