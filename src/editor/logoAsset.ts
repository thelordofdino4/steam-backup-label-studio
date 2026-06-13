export type LogoAssetKind = 'developer' | 'publisher'

export type LogoAlignmentPreset = {
  label: string
  x: number
  y: number
}

export const LOGO_ASSET_KIND_LABELS: Record<LogoAssetKind, string> = {
  developer: 'Developer',
  publisher: 'Publisher',
}

export function getLogoAssetKindLabel(logoKey: LogoAssetKind) {
  return LOGO_ASSET_KIND_LABELS[logoKey]
}

export function getPrimaryLogoAssetLabel(logoKey: LogoAssetKind) {
  return `${getLogoAssetKindLabel(logoKey)} logo`
}

export function createAdditionalLogoAssetLabel(
  logoKey: LogoAssetKind,
  additionalLogoIndex: number,
) {
  return `Additional ${logoKey} ${additionalLogoIndex + 1}`
}

export function normalizeLogoAssetLabel(
  label: unknown,
  fallbackLabel: string,
) {
  return typeof label === 'string' && label.trim()
    ? label
    : fallbackLabel
}

export function getLogoAssetImageLabel(label: string) {
  const trimmedLabel = label.trim() || 'Logo'

  return /\blogo\b/i.test(trimmedLabel)
    ? trimmedLabel
    : `${trimmedLabel} logo`
}

export function getLogoAssetImageFallbackLabel(label: string) {
  return `${getLogoAssetImageLabel(label)} image`
}

export function getLogoAssetUploadActionLabel({
  hasImage,
  label,
}: {
  hasImage: boolean
  label: string
}) {
  const imageLabel = getLogoAssetImageLabel(label).toLocaleLowerCase()

  return hasImage ? `Replace ${imageLabel}` : `Choose ${imageLabel}`
}

export function getLogoAssetEmptyHint({
  label,
  mentionsCandidateSearch = false,
}: {
  label: string
  mentionsCandidateSearch?: boolean
}) {
  const imageLabel = getLogoAssetImageLabel(label).toLocaleLowerCase()
  const actionHint = mentionsCandidateSearch
    ? 'search logo candidates or upload a custom logo here'
    : 'upload an image before export to render your actual logo'

  return `No ${imageLabel} image is selected yet. The built-in default logo is shown for placement; ${actionHint}.`
}

export function createLogoAssetSummary({
  enabled,
  hasImage,
  scale,
}: {
  enabled: boolean
  hasImage: boolean
  scale: number
}) {
  return [
    enabled ? 'shown' : 'hidden',
    hasImage ? 'custom image' : 'built-in default',
    `scale ${scale.toFixed(2)}`,
  ].join(' · ')
}
