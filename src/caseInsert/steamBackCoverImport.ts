import type {
  ProjectCaseInsertTextBlock,
  ProjectCaseInsertTextList,
  ProjectJewelCaseState,
} from '../project/projectTypes.ts'
import type { SteamImportedGame } from '../steam/steamApi.ts'
import {
  CASE_INSERT_TRAY_DEFAULT_STEAM_TEXT_BLOCK_LAYOUTS,
  CASE_INSERT_TRAY_DEFAULT_STEAM_TEXT_LIST_LAYOUTS,
} from './defaultImportLayouts.ts'
import {
  createFittedSteamBackCoverCopy,
  normalizeSteamBackCoverText,
  type BackCoverDescriptionVariantId,
} from './backCoverCopyFit.ts'

type SteamBackCoverImportOptions = {
  descriptionVariant?: BackCoverDescriptionVariantId
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

type SteamTextTarget = { source?: string; value?: string; items?: string[] }

function hasCaseInsertTextValue(current: SteamTextTarget) {
  return current.value
    ? current.value.trim().length > 0
    : current.items
      ? current.items.some((item) => item.trim())
      : false
}

function shouldApplySteamValue(
  current: SteamTextTarget,
  replaceExisting: boolean,
) {
  return replaceExisting ||
    current.source === 'steam' ||
    !hasCaseInsertTextValue(current)
}

function shouldApplySteamDefaultLayout(
  current: SteamTextTarget,
  replaceExisting: boolean,
) {
  return replaceExisting || !hasCaseInsertTextValue(current)
}

function withSteamDefaultTextBlockLayout(
  textBlock: ProjectCaseInsertTextBlock,
): ProjectCaseInsertTextBlock {
  const config = CASE_INSERT_TRAY_DEFAULT_STEAM_TEXT_BLOCK_LAYOUTS[textBlock.id]

  if (!config) {
    return textBlock
  }

  return {
    ...textBlock,
    align: config.align ?? textBlock.align,
    layout: {
      ...textBlock.layout,
      ...config.layout,
    },
  }
}

function withSteamDefaultTextListLayout(
  textList: ProjectCaseInsertTextList,
): ProjectCaseInsertTextList {
  const config = CASE_INSERT_TRAY_DEFAULT_STEAM_TEXT_LIST_LAYOUTS[textList.id]

  if (!config) {
    return textList
  }

  return {
    ...textList,
    layout: {
      ...textList.layout,
      ...config.layout,
    },
  }
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

  const updatedTextBlock: ProjectCaseInsertTextBlock = {
    ...textBlock,
    enabled: enableImportedText ? value.trim().length > 0 : textBlock.enabled,
    value,
    source: 'steam',
  }

  return shouldApplySteamDefaultLayout(textBlock, replaceExisting)
    ? withSteamDefaultTextBlockLayout(updatedTextBlock)
    : updatedTextBlock
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

  const updatedTextList: ProjectCaseInsertTextList = {
    ...textList,
    enabled: enableImportedText ? items.length > 0 : textList.enabled,
    items,
    source: 'steam',
  }

  return shouldApplySteamDefaultLayout(textList, replaceExisting)
    ? withSteamDefaultTextListLayout(updatedTextList)
    : updatedTextList
}

export function applySteamBackCoverImportToCaseInsert(
  caseInsert: ProjectJewelCaseState,
  importedGame: SteamImportedGame,
  options: SteamBackCoverImportOptions = {},
): ProjectJewelCaseState {
  const replaceExisting = options.replaceExisting ?? false
  const enableImportedText = options.enableImportedText ?? false
  const backCoverCopy = createFittedSteamBackCoverCopy(importedGame, {
    descriptionVariant: options.descriptionVariant,
    legalText: options.legalText,
  })
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
                backCoverCopy.description,
                replaceExisting,
                enableImportedText,
              )
            case TRAY_MINIMUM_REQUIREMENTS_ID:
              return updateSteamTextBlock(
                textBlock,
                backCoverCopy.minimumRequirements,
                replaceExisting,
                enableImportedText,
              )
            case TRAY_RECOMMENDED_REQUIREMENTS_ID:
              return updateSteamTextBlock(
                textBlock,
                backCoverCopy.recommendedRequirements,
                replaceExisting,
                enableImportedText,
              )
            case 'tray-copyright-text':
            case 'tray-legal-text':
              return updateSteamTextBlock(
                textBlock,
                backCoverCopy.legalText,
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
                backCoverCopy.featureBullets,
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
  const normalizedLegalText = normalizeSteamBackCoverText(legalText)

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
