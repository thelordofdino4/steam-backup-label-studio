import type {
  ProjectCaseInsertTextBlock,
  ProjectJewelCaseState,
  ProjectMetadata,
} from '../project/projectTypes.ts'
import {
  getCaseInsertTextBlockDiscKey,
  getCaseInsertTextBlockRenderValue,
  getNextCaseInsertTextSource,
  isCaseInsertMetadataTextBlock,
} from './textContent.ts'
import {
  setCaseInsertTextListItems,
  updateCaseInsertTextListHtmlSource,
  updateCaseInsertTextBlockValue,
} from './textTransitions.ts'
import {
  updateCaseInsertTemplateTextBlock,
  updateCaseInsertTemplateTextList,
} from './templateSurfaceTransitions.ts'
import {
  getJewelCaseSpineSideScopedId,
  updateProjectJewelCaseSpineSides,
} from './jewelCaseTransitions.ts'
import type { CaseInsertPreviewTextTarget } from './previewTextSelection.ts'
import type { DiscTextKey } from '../discText/types.ts'
import {
  getHtmlSource,
  isHtmlTextEnabled,
} from '../text/htmlText.ts'

const CASE_INSERT_RENDERED_PREFIXES: Partial<Record<DiscTextKey, string>> = {
  backupDate: 'Backed up ',
  appId: 'Steam App ID ',
  developer: 'Developer: ',
  publisher: 'Publisher: ',
}

function getPreviewTextListItems(value: string) {
  return value
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((item) => item.replace(/^\s*(?:[-*]|\u2022)\s+/, ''))
}

function getPreviewTextBlockDraftValue(
  textBlock: ProjectCaseInsertTextBlock,
  value: string,
) {
  const discKey = getCaseInsertTextBlockDiscKey(textBlock)
  const prefix = discKey ? CASE_INSERT_RENDERED_PREFIXES[discKey] : undefined

  if (prefix && value.startsWith(prefix)) {
    return value.slice(prefix.length)
  }

  return value
}

export function getCaseInsertPreviewTextEditValue(
  textBlock: ProjectCaseInsertTextBlock,
  metadata?: ProjectMetadata,
) {
  if (isHtmlTextEnabled(textBlock)) {
    return getHtmlSource(textBlock, textBlock.value)
  }

  if (textBlock.source !== 'metadata') {
    const discKey = getCaseInsertTextBlockDiscKey(textBlock)
    const prefix = discKey ? CASE_INSERT_RENDERED_PREFIXES[discKey] : undefined

    return prefix && textBlock.value
      ? `${prefix}${textBlock.value}`
      : textBlock.value
  }

  return getCaseInsertTextBlockRenderValue(textBlock, metadata)
}

function updatePreviewTextBlockDraft(
  textBlock: ProjectCaseInsertTextBlock,
  value: string,
) {
  return updateCaseInsertTextBlockValue(
    textBlock,
    getPreviewTextBlockDraftValue(textBlock, value),
    'manual',
  )
}

export function getCaseInsertPreviewTextListEditValue(
  textList: {
    items: readonly string[]
    contentMode?: 'plain' | 'html' | 'markdown'
    htmlSource?: string | null
    markdownSource?: string | null
  },
) {
  return isHtmlTextEnabled(textList)
    ? getHtmlSource(textList, textList.items.map((item) => `• ${item}`).join('\n'))
    : textList.items.map((item) => `• ${item}`).join('\n')
}

function finalizePreviewTextBlockDraft(textBlock: ProjectCaseInsertTextBlock) {
  if (!isCaseInsertMetadataTextBlock(textBlock) || textBlock.value.trim()) {
    return textBlock
  }

  return updateCaseInsertTextBlockValue(
    textBlock,
    textBlock.value,
    getNextCaseInsertTextSource(textBlock, textBlock.value),
  )
}

export function updateCaseInsertPreviewTextDraftValue(
  caseInsert: ProjectJewelCaseState,
  target: CaseInsertPreviewTextTarget,
  value: string,
): ProjectJewelCaseState {
  switch (target.scope) {
    case 'templateTextBlock':
      return updateCaseInsertTemplateTextBlock(
        caseInsert,
        target.paneId,
        target.textBlockId,
        (textBlock) => updatePreviewTextBlockDraft(textBlock, value),
      )
    case 'templateTextList':
      return updateCaseInsertTemplateTextList(
        caseInsert,
        target.paneId,
        target.textListId,
        (textList) => isHtmlTextEnabled(textList)
          ? updateCaseInsertTextListHtmlSource(textList, value)
          : setCaseInsertTextListItems(
              textList,
              getPreviewTextListItems(value),
            ),
      )
    case 'spineTitle':
      return updateProjectJewelCaseSpineSides(
        caseInsert,
        target.side,
        (spineSide) => ({
          ...spineSide,
          title: updatePreviewTextBlockDraft(spineSide.title, value),
        }),
      )
    case 'spineTextBlock':
      return updateProjectJewelCaseSpineSides(
        caseInsert,
        target.side,
        (spineSide, side) => {
          const targetTextBlockId = getJewelCaseSpineSideScopedId(
            side,
            target.textBlockId,
          )

          return {
            ...spineSide,
            textBlocks: spineSide.textBlocks.map((textBlock) =>
              textBlock.id === targetTextBlockId
                ? updatePreviewTextBlockDraft(textBlock, value)
                : textBlock),
          }
        },
      )
    default:
      return caseInsert
  }
}

export function finalizeCaseInsertPreviewTextDraft(
  caseInsert: ProjectJewelCaseState,
  target: CaseInsertPreviewTextTarget,
): ProjectJewelCaseState {
  switch (target.scope) {
    case 'templateTextBlock':
      return updateCaseInsertTemplateTextBlock(
        caseInsert,
        target.paneId,
        target.textBlockId,
        finalizePreviewTextBlockDraft,
      )
    case 'spineTitle':
      return updateProjectJewelCaseSpineSides(
        caseInsert,
        target.side,
        (spineSide) => ({
          ...spineSide,
          title: finalizePreviewTextBlockDraft(spineSide.title),
        }),
      )
    case 'spineTextBlock':
      return updateProjectJewelCaseSpineSides(
        caseInsert,
        target.side,
        (spineSide, side) => {
          const targetTextBlockId = getJewelCaseSpineSideScopedId(
            side,
            target.textBlockId,
          )

          return {
            ...spineSide,
            textBlocks: spineSide.textBlocks.map((textBlock) =>
              textBlock.id === targetTextBlockId
                ? finalizePreviewTextBlockDraft(textBlock)
                : textBlock),
          }
        },
      )
    case 'templateTextList':
    default:
      return caseInsert
  }
}
