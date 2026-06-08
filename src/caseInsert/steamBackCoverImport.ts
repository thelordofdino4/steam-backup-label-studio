import type {
  ProjectCaseInsertTextBlock,
  ProjectCaseInsertTextList,
  ProjectJewelCaseState,
} from '../project/projectTypes.ts'
import type { SteamImportedGame } from '../steam/steamApi.ts'

type SteamBackCoverImportOptions = {
  legalText?: string
  replaceExisting?: boolean
  enableImportedText?: boolean
}

const TRAY_DESCRIPTION_ID = 'tray-description'
const TRAY_MINIMUM_REQUIREMENTS_ID = 'tray-minimum-requirements'
const TRAY_RECOMMENDED_REQUIREMENTS_ID = 'tray-recommended-requirements'
const TRAY_COPYRIGHT_TEXT_IDS = new Set([
  'tray-copyright-text',
  'tray-legal-text',
])
const TRAY_FEATURE_BULLETS_ID = 'tray-feature-bullets'
const MAX_STEAM_FEATURE_BULLETS = 5

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&copy;/gi, '(c)')
    .replace(/&#169;/g, '(c)')
}

function normalizeSteamText(value: string | undefined) {
  if (!value) return ''

  return decodeHtmlEntities(
    value
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:p|div|li|ul|ol)>/gi, '\n')
      .replace(/<li\b[^>]*>/gi, '- ')
      .replace(/<[^>]*>/g, ' '),
  )
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
}

function shouldApplySteamValue(
  current: { source?: string; value?: string; items?: string[] },
  replaceExisting: boolean,
) {
  const hasValue = current.value
    ? current.value.trim().length > 0
    : current.items
      ? current.items.some((item) => item.trim())
      : false

  return replaceExisting || current.source === 'steam' || !hasValue
}

function updateSteamTextBlock(
  textBlock: ProjectCaseInsertTextBlock,
  value: string,
  replaceExisting: boolean,
  enableImportedText: boolean,
): ProjectCaseInsertTextBlock {
  if (!shouldApplySteamValue(textBlock, replaceExisting)) {
    return textBlock
  }

  return {
    ...textBlock,
    enabled: enableImportedText ? value.trim().length > 0 : textBlock.enabled,
    value,
    source: 'steam',
  }
}

function updateSteamTextList(
  textList: ProjectCaseInsertTextList,
  items: string[],
  replaceExisting: boolean,
  enableImportedText: boolean,
): ProjectCaseInsertTextList {
  if (!shouldApplySteamValue(textList, replaceExisting)) {
    return textList
  }

  return {
    ...textList,
    enabled: enableImportedText ? items.length > 0 : textList.enabled,
    items,
    source: 'steam',
  }
}

function uniqueNonEmpty(values: string[]) {
  const seen = new Set<string>()
  const uniqueValues: string[] = []

  for (const value of values) {
    const normalizedValue = normalizeSteamText(value)
    const key = normalizedValue.toLocaleLowerCase()

    if (!normalizedValue || seen.has(key)) {
      continue
    }

    seen.add(key)
    uniqueValues.push(normalizedValue)
  }

  return uniqueValues
}

function createSteamFeatureBullets(importedGame: SteamImportedGame) {
  return uniqueNonEmpty([
    ...importedGame.categories,
    ...importedGame.genres,
  ]).slice(0, MAX_STEAM_FEATURE_BULLETS)
}

export function applySteamBackCoverImportToCaseInsert(
  caseInsert: ProjectJewelCaseState,
  importedGame: SteamImportedGame,
  options: SteamBackCoverImportOptions = {},
): ProjectJewelCaseState {
  const replaceExisting = options.replaceExisting ?? false
  const enableImportedText = options.enableImportedText ?? false
  const description = normalizeSteamText(
    importedGame.shortDescription ?? importedGame.detailedDescription,
  )
  const minimumRequirements = normalizeSteamText(importedGame.minimumRequirements)
  const recommendedRequirements = normalizeSteamText(
    importedGame.recommendedRequirements,
  )
  const legalText = normalizeSteamText(options.legalText ?? importedGame.legalNotice)
  const featureBullets = createSteamFeatureBullets(importedGame)
  const tray = caseInsert.templates.tray

  return {
    ...caseInsert,
    templates: {
      ...caseInsert.templates,
      tray: {
        ...tray,
        textBlocks: tray.textBlocks.map((textBlock) => {
          switch (textBlock.id) {
            case TRAY_DESCRIPTION_ID:
              return updateSteamTextBlock(
                textBlock,
                description,
                replaceExisting,
                enableImportedText,
              )
            case TRAY_MINIMUM_REQUIREMENTS_ID:
              return updateSteamTextBlock(
                textBlock,
                minimumRequirements,
                replaceExisting,
                enableImportedText,
              )
            case TRAY_RECOMMENDED_REQUIREMENTS_ID:
              return updateSteamTextBlock(
                textBlock,
                recommendedRequirements,
                replaceExisting,
                enableImportedText,
              )
            case 'tray-copyright-text':
            case 'tray-legal-text':
              return updateSteamTextBlock(
                textBlock,
                legalText,
                replaceExisting,
                enableImportedText,
              )
            default:
              return textBlock
          }
        }),
        textLists: tray.textLists.map((textList) =>
          textList.id === TRAY_FEATURE_BULLETS_ID
            ? updateSteamTextList(
                textList,
                featureBullets,
                replaceExisting,
                enableImportedText,
              )
            : textList,
        ),
      },
    },
  }
}

export function applyCaseInsertBackCoverLegalText(
  caseInsert: ProjectJewelCaseState,
  legalText: string,
  options: { replaceExisting?: boolean } = {},
) {
  const tray = caseInsert.templates.tray
  const normalizedLegalText = normalizeSteamText(legalText)

  return {
    ...caseInsert,
    templates: {
      ...caseInsert.templates,
      tray: {
        ...tray,
        textBlocks: tray.textBlocks.map((textBlock) =>
          TRAY_COPYRIGHT_TEXT_IDS.has(textBlock.id)
            ? updateSteamTextBlock(
                textBlock,
                normalizedLegalText,
                options.replaceExisting ?? true,
                true,
              )
            : textBlock,
        ),
      },
    },
  }
}
