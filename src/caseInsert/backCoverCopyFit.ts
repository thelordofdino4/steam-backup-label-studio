import type { SteamImportedGame } from '../steam/steamApi.ts'

export type BackCoverDescriptionVariantId = 'short' | 'medium' | 'full'

export type BackCoverDescriptionVariant = {
  id: BackCoverDescriptionVariantId
  label: string
  text: string
  maxCharacters: number
}

export type FittedSteamBackCoverCopy = {
  description: string
  descriptionVariants: BackCoverDescriptionVariant[]
  featureBullets: string[]
  minimumRequirements: string
  recommendedRequirements: string
  legalText: string
  warnings: string[]
}

type FittedSteamBackCoverCopyOptions = {
  descriptionVariant?: BackCoverDescriptionVariantId
  legalText?: string
}

const DESCRIPTION_CHARACTER_LIMITS: Record<
  BackCoverDescriptionVariantId,
  number
> = {
  short: 180,
  medium: 360,
  full: 720,
}
const DESCRIPTION_VARIANT_LABELS: Record<BackCoverDescriptionVariantId, string> = {
  short: 'Short',
  medium: 'Medium',
  full: 'Full',
}
export const MAX_BACK_COVER_FEATURE_BULLETS = 5
const MAX_BACK_COVER_FEATURE_BULLET_LENGTH = 76
const DENSE_REQUIREMENTS_CHARACTER_LIMIT = 520
const DENSE_REQUIREMENTS_LINE_LIMIT = 10
const DENSE_LEGAL_CHARACTER_LIMIT = 260
const DENSE_LEGAL_LINE_LIMIT = 5

const LOW_PRIORITY_STEAM_FEATURE_PATTERNS = [
  /^steam /i,
  /^remote play/i,
  /^partial controller support$/i,
  /^full controller support$/i,
  /^controller support$/i,
  /^stats$/i,
  /^leaderboards$/i,
]

const BOILERPLATE_DESCRIPTION_LINE_PATTERNS = [
  /^about (this|the) game$/i,
  /^key features:?$/i,
  /^features:?$/i,
  /^system requirements:?$/i,
]

export function decodeSteamHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&copy;/gi, '(c)')
    .replace(/&#169;/g, '(c)')
}

export function normalizeSteamBackCoverText(value: string | undefined) {
  if (!value) return ''

  return decodeSteamHtmlEntities(
    value
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:p|div|h[1-6]|li|ul|ol)>/gi, '\n')
      .replace(/<li\b[^>]*>/gi, '- ')
      .replace(/<[^>]*>/g, ' '),
  )
    .replace(/\u00a0/g, ' ')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
}

export function createFittedSteamBackCoverCopy(
  importedGame: SteamImportedGame,
  options: FittedSteamBackCoverCopyOptions = {},
): FittedSteamBackCoverCopy {
  const descriptionVariants = createBackCoverDescriptionVariants({
    detailedDescription: importedGame.detailedDescription,
    shortDescription: importedGame.shortDescription,
  })
  const selectedDescriptionVariant =
    descriptionVariants.find(({ id }) => id === options.descriptionVariant) ??
    descriptionVariants.find(({ id }) => id === 'medium') ??
    descriptionVariants[0]
  const minimumRequirements = normalizeSteamBackCoverText(
    importedGame.minimumRequirements,
  )
  const recommendedRequirements = normalizeSteamBackCoverText(
    importedGame.recommendedRequirements,
  )
  const legalText = normalizeSteamBackCoverText(
    options.legalText ?? importedGame.legalNotice,
  )

  return {
    description: selectedDescriptionVariant?.text ?? '',
    descriptionVariants,
    featureBullets: createBackCoverFeatureBullets(importedGame),
    minimumRequirements,
    recommendedRequirements,
    legalText,
    warnings: createBackCoverCopyWarnings({
      legalText,
      minimumRequirements,
      recommendedRequirements,
    }),
  }
}

export function createBackCoverDescriptionVariants({
  detailedDescription,
  shortDescription,
}: {
  detailedDescription?: string
  shortDescription?: string
}): BackCoverDescriptionVariant[] {
  const normalizedShortDescription = normalizeBackCoverDescription(
    normalizeSteamBackCoverText(shortDescription),
  )
  const normalizedDetailedDescription = normalizeBackCoverDescription(
    normalizeSteamBackCoverText(detailedDescription),
  )
  const fullSource =
    normalizedDetailedDescription || normalizedShortDescription
  const mediumSource = normalizedShortDescription || fullSource

  return (['short', 'medium', 'full'] as const).map((id) => {
    const source = id === 'full' ? fullSource : mediumSource
    const maxCharacters = DESCRIPTION_CHARACTER_LIMITS[id]

    return {
      id,
      label: DESCRIPTION_VARIANT_LABELS[id],
      text: fitTextToCharacterLimit(source, maxCharacters),
      maxCharacters,
    }
  })
}

export function createBackCoverFeatureBullets(
  importedGame: SteamImportedGame,
) {
  const extractedFeatureBullets = extractDescriptionFeatureBullets(
    importedGame.detailedDescription,
  )
  const metadataFeatureBullets = uniqueNonEmpty([
    ...importedGame.categories,
    ...importedGame.genres,
  ])
  const highPriorityMetadataBullets = metadataFeatureBullets.filter(
    (value) => !isLowPrioritySteamFeature(value),
  )
  const lowPriorityMetadataBullets = metadataFeatureBullets.filter(
    isLowPrioritySteamFeature,
  )

  return uniqueNonEmpty([
    ...extractedFeatureBullets,
    ...highPriorityMetadataBullets,
    ...lowPriorityMetadataBullets,
  ])
    .map((value) =>
      fitTextToCharacterLimit(value, MAX_BACK_COVER_FEATURE_BULLET_LENGTH))
    .slice(0, MAX_BACK_COVER_FEATURE_BULLETS)
}

function normalizeBackCoverDescription(value: string) {
  return value
    .split('\n')
    .map((line) => line.replace(/^[-*]\s+/, '').trim())
    .filter(
      (line) =>
        line &&
        !BOILERPLATE_DESCRIPTION_LINE_PATTERNS.some((pattern) =>
          pattern.test(line)),
    )
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractDescriptionFeatureBullets(value: string | undefined) {
  const lines = normalizeSteamBackCoverText(value).split('\n')
  const featureBullets: string[] = []
  let isFeatureSection = false

  for (const line of lines) {
    if (/^(key features|features):?$/i.test(line)) {
      isFeatureSection = true
      continue
    }

    if (/^(about (this|the) game|system requirements):?$/i.test(line)) {
      isFeatureSection = false
      continue
    }

    const listItemMatch = /^[-*]\s+(.+)$/.exec(line)

    if (listItemMatch) {
      featureBullets.push(listItemMatch[1] ?? '')
      continue
    }

    if (isFeatureSection && line.length <= MAX_BACK_COVER_FEATURE_BULLET_LENGTH) {
      featureBullets.push(line)
    }
  }

  return uniqueNonEmpty(featureBullets)
}

function createBackCoverCopyWarnings({
  legalText,
  minimumRequirements,
  recommendedRequirements,
}: {
  legalText: string
  minimumRequirements: string
  recommendedRequirements: string
}) {
  const warnings: string[] = []
  const requirementsText = [minimumRequirements, recommendedRequirements]
    .filter(Boolean)
    .join('\n')

  if (
    isDenseText(
      requirementsText,
      DENSE_REQUIREMENTS_CHARACTER_LIMIT,
      DENSE_REQUIREMENTS_LINE_LIMIT,
    )
  ) {
    warnings.push(
      'Steam requirements are long for a tray card; consider keeping the minimum requirements and shortening lower-priority detail before print.',
    )
  }

  if (
    isDenseText(
      legalText,
      DENSE_LEGAL_CHARACTER_LIMIT,
      DENSE_LEGAL_LINE_LIMIT,
    )
  ) {
    warnings.push(
      'Legal text is long for a tray card; consider keeping required notices and removing lower-priority boilerplate before print.',
    )
  }

  return warnings
}

function isDenseText(
  value: string,
  characterLimit: number,
  lineLimit: number,
) {
  if (!value.trim()) {
    return false
  }

  return value.length > characterLimit || value.split('\n').length > lineLimit
}

function isLowPrioritySteamFeature(value: string) {
  return LOW_PRIORITY_STEAM_FEATURE_PATTERNS.some((pattern) =>
    pattern.test(value))
}

function uniqueNonEmpty(values: string[]) {
  const seen = new Set<string>()
  const uniqueValues: string[] = []

  for (const value of values) {
    const normalizedValue = normalizeSteamBackCoverText(value)
    const key = normalizedValue.toLocaleLowerCase()

    if (!normalizedValue || seen.has(key)) {
      continue
    }

    seen.add(key)
    uniqueValues.push(normalizedValue)
  }

  return uniqueValues
}

function fitTextToCharacterLimit(value: string, characterLimit: number) {
  const normalizedValue = value.trim()

  if (normalizedValue.length <= characterLimit) {
    return normalizedValue
  }

  const sentenceFit = fitSentencesToCharacterLimit(
    normalizedValue,
    characterLimit,
  )

  if (sentenceFit.length >= Math.min(72, characterLimit)) {
    return sentenceFit
  }

  return fitWordsToCharacterLimit(normalizedValue, characterLimit)
}

function fitSentencesToCharacterLimit(value: string, characterLimit: number) {
  const sentences = value.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [value]
  let fittedText = ''

  for (const sentence of sentences) {
    const nextText = `${fittedText} ${sentence.trim()}`.trim()

    if (nextText.length > characterLimit) {
      break
    }

    fittedText = nextText
  }

  return fittedText ? ensureTerminalPunctuation(fittedText) : ''
}

function fitWordsToCharacterLimit(value: string, characterLimit: number) {
  const ellipsis = '...'
  const availableCharacters = Math.max(1, characterLimit - ellipsis.length)
  const words = value.split(/\s+/)
  let fittedText = ''

  for (const word of words) {
    const nextText = `${fittedText} ${word}`.trim()

    if (nextText.length > availableCharacters) {
      break
    }

    fittedText = nextText
  }

  return `${fittedText.replace(/[.,;:!?]+$/, '')}${ellipsis}`
}

function ensureTerminalPunctuation(value: string) {
  return /[.!?]$/.test(value) ? value : `${value}.`
}
