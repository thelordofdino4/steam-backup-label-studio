type ImageSize = {
  width: number
  height: number
}

type LayoutValueWarningInput = {
  x: number
  y: number
  scale: number
}

type BundledAssetKind =
  | 'logo'
  | 'ratingBadge'
  | 'mediaMark'
  | 'operatingSystemMark'
  | 'technicalMark'
  | 'genericArtwork'

const BUNDLED_ASSET_WARNING_COPY: Record<
  BundledAssetKind,
  { descriptor: string | null; assetDescription: string }
> = {
  logo: {
    descriptor: 'logo',
    assetDescription: 'bundled generic logo artwork',
  },
  ratingBadge: {
    descriptor: 'rating badge',
    assetDescription: 'bundled rating artwork',
  },
  mediaMark: {
    descriptor: 'media mark',
    assetDescription: 'bundled generic artwork',
  },
  operatingSystemMark: {
    descriptor: 'operating system mark',
    assetDescription: 'bundled generic artwork',
  },
  technicalMark: {
    descriptor: 'technical mark',
    assetDescription: 'bundled generic artwork',
  },
  genericArtwork: {
    descriptor: null,
    assetDescription: 'bundled generic artwork',
  },
}

export const GUIDE_MARKS_EXPORT_WARNING =
  'Guide marks are enabled and will appear in the exported PNG.'

export function buildGuideExportWarnings(hasEnabledGuides: boolean) {
  return hasEnabledGuides ? [GUIDE_MARKS_EXPORT_WARNING] : []
}

export function createMissingBackgroundWarning(
  label: string | null,
  fillDescription: string,
) {
  return label
    ? `${label} has no background image; ${fillDescription}.`
    : `No background image is selected; ${fillDescription}.`
}

export function createMissingImageWarning(
  label: string,
  options: {
    imageDescription?: string
    outcome?: string
    exportTarget?: string
  } = {},
) {
  const imageDescription = options.imageDescription ?? 'image'
  const outcome = options.outcome ?? 'it will not render'
  const target = options.exportTarget ? ` in the ${options.exportTarget}` : ''

  return `${label} is enabled, but no ${imageDescription} is selected; ${outcome}${target}.`
}

export function createMissingImageFallbackWarning(
  label: string,
  options: {
    imageAction?: 'selected' | 'uploaded'
    fallbackDescription: string
  },
) {
  return `${label} is enabled, but no image is ${options.imageAction ?? 'selected'}; ${options.fallbackDescription}.`
}

export function createMissingImageSizeWarning(label: string) {
  return `${label} has image data but no size metadata; export may skip placement or resolution checks.`
}

export function createUnresolvedPlacementWarning(label: string) {
  return `${label} is enabled, but export could not resolve its print placement.`
}

export function createUnresolvedFitWarning(label: string) {
  return `${label} is enabled, but export could not resolve its print fit.`
}

export function buildUpscaleWarnings(
  label: string,
  imageSize: ImageSize,
  rect: Pick<ImageSize, 'width' | 'height'>,
  threshold = 1.05,
) {
  const scale = Math.max(rect.width / imageSize.width, rect.height / imageSize.height)

  if (scale <= threshold) {
    return []
  }

  return [
    `${label} is ${imageSize.width} x ${imageSize.height}px, but exports around ${formatPixels(rect.width)} x ${formatPixels(rect.height)}px; it may look soft in print.`,
  ]
}

export function buildLayoutValueWarnings(
  label: string,
  layout: LayoutValueWarningInput,
) {
  const warnings: string[] = []

  if (layout.x < 0 || layout.x > 100 || layout.y < 0 || layout.y > 100) {
    warnings.push(
      `${label} placement is outside the safe control range and will be clamped during export.`,
    )
  }

  if (!Number.isFinite(layout.scale) || layout.scale <= 0) {
    warnings.push(`${label} scale is invalid and will use a fallback size.`)
  }

  return warnings
}

export function createBundledAssetWarning(
  label: string,
  kind: BundledAssetKind,
) {
  const { descriptor, assetDescription } = BUNDLED_ASSET_WARNING_COPY[kind]
  const describedLabel = descriptor
    ? ensureLabelDescriptor(label, descriptor)
    : label

  return `${describedLabel} uses ${assetDescription}.`
}

export function createCustomMarkMissingImageWarning(
  label: string,
  kind: Exclude<BundledAssetKind, 'logo' | 'genericArtwork'>,
) {
  const { descriptor, assetDescription } = BUNDLED_ASSET_WARNING_COPY[kind]
  const describedLabel = ensureLabelDescriptor(label, descriptor ?? 'mark')
  const fallbackDescription = kind === 'ratingBadge'
    ? `${assetDescription} will export when rating metadata is renderable`
    : `the ${assetDescription} will export`

  return `Custom ${describedLabel} is selected, but no custom image is uploaded; ${fallbackDescription}.`
}

export function ensureLabelDescriptor(label: string, descriptor: string) {
  const descriptorPattern = new RegExp(`\\b${escapeRegExp(descriptor)}\\b`, 'i')

  return descriptorPattern.test(label) ? label : `${label} ${descriptor}`
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function formatPixels(value: number) {
  return String(Math.round(value))
}
