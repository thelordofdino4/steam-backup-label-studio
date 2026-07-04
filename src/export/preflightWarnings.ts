type ImageSize = {
  width: number
  height: number
}

type LayoutValueWarningInput = {
  x: number
  y: number
  scale: number
}

type CustomMarkMissingImageKind =
  | 'ratingBadge'
  | 'mediaMark'
  | 'operatingSystemMark'
  | 'technicalMark'

const CUSTOM_MARK_MISSING_IMAGE_DESCRIPTORS: Record<
  CustomMarkMissingImageKind,
  string
> = {
  ratingBadge: 'rating badge',
  mediaMark: 'media mark',
  operatingSystemMark: 'operating system mark',
  technicalMark: 'technical mark',
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

export function createCustomMarkMissingImageWarning(
  label: string,
  kind: CustomMarkMissingImageKind,
) {
  const descriptor = CUSTOM_MARK_MISSING_IMAGE_DESCRIPTORS[kind]
  const describedLabel = ensureLabelDescriptor(label, descriptor)

  return `Custom ${describedLabel} is selected, but no custom image is uploaded.`
}

export function ensureLabelDescriptor(label: string, descriptor: string) {
  const descriptorPattern = new RegExp(`\\b${escapeRegExp(descriptor)}\\b`, 'i')

  return descriptorPattern.test(label) ? label : `${label} ${descriptor}`
}

export function formatMillimeters(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function formatPixels(value: number) {
  return String(Math.round(value))
}
