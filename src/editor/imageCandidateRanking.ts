export type ImageCandidateTarget =
  | 'background'
  | 'logo'
  | 'supportingArtwork'

export type ImageCandidateQualityTone = 'good' | 'neutral' | 'warning'

export type ImageCandidateRankingInput = {
  baseScore?: number
  contentKind?: 'artwork' | 'logo'
  height?: number | null
  isVector?: boolean
  kind?: string
  target: ImageCandidateTarget
  transparencyHint?: boolean
  width?: number | null
}

export type ImageCandidateRanking = {
  details: string[]
  qualityLabel: string
  qualityTone: ImageCandidateQualityTone
  score: number
}

type TargetPrintProfile = {
  idealAspect?: number
  minLongEdge: number
  minShortEdge: number
}

const TARGET_PRINT_PROFILES: Record<ImageCandidateTarget, TargetPrintProfile> = {
  background: {
    idealAspect: 1.5,
    minLongEdge: 1400,
    minShortEdge: 900,
  },
  logo: {
    minLongEdge: 512,
    minShortEdge: 256,
  },
  supportingArtwork: {
    idealAspect: 1.33,
    minLongEdge: 900,
    minShortEdge: 600,
  },
}

const BACKGROUND_KIND_SCORES: Record<string, number> = {
  background: 52,
  screenshot: 48,
  library: 34,
  header: 28,
  capsule: 18,
  logo: -36,
}

export function getImageCandidateRanking(
  input: ImageCandidateRankingInput,
): ImageCandidateRanking {
  const dimensions = normalizeDimensions(input)
  const profile = TARGET_PRINT_PROFILES[input.target]
  const isLogoLike = isCandidateLogoLike(input)
  const isTooSmall = Boolean(
    dimensions &&
    !input.isVector &&
    (
      Math.max(dimensions.width, dimensions.height) < profile.minLongEdge ||
      Math.min(dimensions.width, dimensions.height) < profile.minShortEdge
    ),
  )
  const cropsHeavily = hasHeavyCropRisk(input, dimensions)
  const printQuality = getPrintQualityLabel(input, dimensions, isTooSmall)
  const qualityLabel = getQualityLabel({
    cropsHeavily,
    input,
    isLogoLike,
    isTooSmall,
  })
  const qualityTone = getQualityTone(qualityLabel)

  return {
    details: [
      formatDimensions(dimensions),
      formatAspect(dimensions),
      `Print quality: ${printQuality}`,
    ],
    qualityLabel,
    qualityTone,
    score: getCandidateScore({
      cropsHeavily,
      dimensions,
      input,
      isLogoLike,
      isTooSmall,
    }),
  }
}

function normalizeDimensions(input: ImageCandidateRankingInput) {
  return input.width && input.height && input.width > 0 && input.height > 0
    ? { width: input.width, height: input.height }
    : null
}

function isCandidateLogoLike(input: ImageCandidateRankingInput) {
  const kind = input.kind?.toLocaleLowerCase() ?? ''

  return (
    input.contentKind === 'logo' ||
    kind.includes('logo') ||
    input.transparencyHint ||
    input.isVector === true
  )
}

function hasHeavyCropRisk(
  input: ImageCandidateRankingInput,
  dimensions: { width: number; height: number } | null,
) {
  const idealAspect = TARGET_PRINT_PROFILES[input.target].idealAspect

  if (!dimensions || !idealAspect) {
    return false
  }

  const aspect = dimensions.width / dimensions.height
  const mismatch = Math.abs(Math.log(aspect / idealAspect))

  return mismatch > 0.55
}

function getQualityLabel({
  cropsHeavily,
  input,
  isLogoLike,
  isTooSmall,
}: {
  cropsHeavily: boolean
  input: ImageCandidateRankingInput
  isLogoLike: boolean
  isTooSmall: boolean
}) {
  if (isTooSmall) return 'Too small for print'
  if (input.target === 'logo' && isLogoLike) return 'Good for logo'
  if (input.target === 'background' && cropsHeavily) return 'Crops heavily'
  if (input.target === 'background') return 'Best for background'
  if (cropsHeavily) return 'Crops heavily'

  return 'Good for artwork'
}

function getQualityTone(label: string): ImageCandidateQualityTone {
  if (label === 'Too small for print' || label === 'Crops heavily') {
    return 'warning'
  }

  if (label.startsWith('Best') || label.startsWith('Good')) {
    return 'good'
  }

  return 'neutral'
}

function getCandidateScore({
  cropsHeavily,
  dimensions,
  input,
  isLogoLike,
  isTooSmall,
}: {
  cropsHeavily: boolean
  dimensions: { width: number; height: number } | null
  input: ImageCandidateRankingInput
  isLogoLike: boolean
  isTooSmall: boolean
}) {
  let score = input.baseScore ?? 0

  if (input.target === 'background') {
    const kind = input.kind?.toLocaleLowerCase() ?? ''
    score += BACKGROUND_KIND_SCORES[kind] ?? 10
  } else if (input.target === 'logo') {
    score += isLogoLike ? 52 : -18
  } else {
    score += isLogoLike ? -12 : 24
  }

  if (input.isVector) {
    score += input.target === 'logo' ? 18 : -12
  }

  if (dimensions) {
    const longEdge = Math.max(dimensions.width, dimensions.height)
    const shortEdge = Math.min(dimensions.width, dimensions.height)

    score += Math.min(28, longEdge / 120)
    score += Math.min(18, shortEdge / 100)
  }

  if (isTooSmall) score -= 46
  if (cropsHeavily) score -= 24

  return score
}

function getPrintQualityLabel(
  input: ImageCandidateRankingInput,
  dimensions: { width: number; height: number } | null,
  isTooSmall: boolean,
) {
  if (input.isVector) return 'vector'
  if (!dimensions) return 'unknown dimensions'
  if (isTooSmall) return 'low'

  const profile = TARGET_PRINT_PROFILES[input.target]
  const longEdge = Math.max(dimensions.width, dimensions.height)
  const shortEdge = Math.min(dimensions.width, dimensions.height)

  return longEdge >= profile.minLongEdge * 1.45 &&
    shortEdge >= profile.minShortEdge * 1.25
    ? 'high'
    : 'medium'
}

function formatDimensions(
  dimensions: { width: number; height: number } | null,
) {
  return dimensions
    ? `Dimensions: ${dimensions.width} x ${dimensions.height}px`
    : 'Dimensions unknown'
}

function formatAspect(dimensions: { width: number; height: number } | null) {
  if (!dimensions) {
    return 'Aspect ratio unknown'
  }

  return `Aspect ratio: ${(dimensions.width / dimensions.height).toFixed(2)}:1`
}
