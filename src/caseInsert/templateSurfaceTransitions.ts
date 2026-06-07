import type {
  ProjectCaseInsertImageFit,
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertLayout,
  ProjectCaseInsertSurfaceState,
  ProjectCaseInsertTextBlock,
  ProjectCaseInsertTextList,
  ProjectJewelCaseState,
} from '../project/projectTypes.ts'
import { createDefaultCaseInsertImageSlot } from './defaults.ts'
import type {
  CaseInsertImageSlotGroupKey,
  CaseInsertTemplatePaneId,
} from './templateSurfaces.ts'

export type CaseInsertPrimaryImageSlotKey = 'background' | 'titleArtwork'

type ImageSlotGroupConfig = {
  idPrefix: string
  labelPrefix: string
  fit: ProjectCaseInsertImageFit
  defaultLayout: Partial<ProjectCaseInsertLayout>
}

const imageSlotGroupConfig: Record<
  CaseInsertTemplatePaneId,
  Record<CaseInsertImageSlotGroupKey, ImageSlotGroupConfig>
> = {
  cover: {
    artworkSlots: {
      idPrefix: 'cover-artwork',
      labelPrefix: 'Artwork',
      fit: 'contain',
      defaultLayout: { scale: 1, x: 50, y: 62 },
    },
    logoSlots: {
      idPrefix: 'cover-logo',
      labelPrefix: 'Logo',
      fit: 'contain',
      defaultLayout: { scale: 1, x: 20, y: 84 },
    },
    markSlots: {
      idPrefix: 'cover-mark',
      labelPrefix: 'Mark',
      fit: 'contain',
      defaultLayout: { scale: 1, x: 82, y: 84 },
    },
  },
  tray: {
    artworkSlots: {
      idPrefix: 'tray-artwork',
      labelPrefix: 'Artwork',
      fit: 'contain',
      defaultLayout: { scale: 1, x: 50, y: 62 },
    },
    logoSlots: {
      idPrefix: 'tray-logo',
      labelPrefix: 'Logo',
      fit: 'contain',
      defaultLayout: { scale: 1, x: 18, y: 88 },
    },
    markSlots: {
      idPrefix: 'tray-mark',
      labelPrefix: 'Mark',
      fit: 'contain',
      defaultLayout: { scale: 1, x: 84, y: 88 },
    },
  },
}

function updateImageSlotById(
  slots: ProjectCaseInsertImageSlot[],
  slotId: string,
  updater: (slot: ProjectCaseInsertImageSlot) => ProjectCaseInsertImageSlot,
) {
  let didUpdate = false
  const nextSlots = slots.map((slot) => {
    if (slot.id !== slotId) {
      return slot
    }

    didUpdate = true
    return updater(slot)
  })

  return didUpdate ? nextSlots : slots
}

function updateTextBlockById(
  textBlocks: ProjectCaseInsertTextBlock[],
  textBlockId: string,
  updater: (textBlock: ProjectCaseInsertTextBlock) => ProjectCaseInsertTextBlock,
) {
  let didUpdate = false
  const nextTextBlocks = textBlocks.map((textBlock) => {
    if (textBlock.id !== textBlockId) {
      return textBlock
    }

    didUpdate = true
    return updater(textBlock)
  })

  return didUpdate ? nextTextBlocks : textBlocks
}

function updateTextListById(
  textLists: ProjectCaseInsertTextList[],
  textListId: string,
  updater: (textList: ProjectCaseInsertTextList) => ProjectCaseInsertTextList,
) {
  let didUpdate = false
  const nextTextLists = textLists.map((textList) => {
    if (textList.id !== textListId) {
      return textList
    }

    didUpdate = true
    return updater(textList)
  })

  return didUpdate ? nextTextLists : textLists
}

function getNextSlotIndex(
  slots: ProjectCaseInsertImageSlot[],
  idPrefix: string,
) {
  let index = slots.length + 1

  while (slots.some(({ id }) => id === `${idPrefix}-${index}`)) {
    index += 1
  }

  return index
}

export function getCaseInsertImageSlotGroupConfig(
  paneId: CaseInsertTemplatePaneId,
  slotKey: CaseInsertImageSlotGroupKey,
) {
  return imageSlotGroupConfig[paneId][slotKey]
}

export function createCaseInsertTemplateImageSlot(
  paneId: CaseInsertTemplatePaneId,
  slotKey: CaseInsertImageSlotGroupKey,
  index: number,
): ProjectCaseInsertImageSlot {
  const config = getCaseInsertImageSlotGroupConfig(paneId, slotKey)

  return createDefaultCaseInsertImageSlot(
    `${config.idPrefix}-${index}`,
    `${config.labelPrefix} ${index}`,
    {
      enabled: true,
      fit: config.fit,
      layout: config.defaultLayout,
    },
  )
}

export function updateProjectCaseInsertTemplate(
  state: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  updater: (
    templateState: ProjectCaseInsertSurfaceState,
  ) => ProjectCaseInsertSurfaceState,
): ProjectJewelCaseState {
  return {
    ...state,
    templates: {
      ...state.templates,
      [paneId]: updater(state.templates[paneId]),
    },
  }
}

export function updateCaseInsertTemplateImageSlot(
  state: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  slotKey: CaseInsertPrimaryImageSlotKey,
  updater: (slot: ProjectCaseInsertImageSlot) => ProjectCaseInsertImageSlot,
): ProjectJewelCaseState {
  return updateProjectCaseInsertTemplate(state, paneId, (templateState) => ({
    ...templateState,
    [slotKey]: updater(templateState[slotKey]),
  }))
}

export function setCaseInsertTemplateAdditionalArtworkEnabled(
  state: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  enabled: boolean,
): ProjectJewelCaseState {
  return updateProjectCaseInsertTemplate(state, paneId, (templateState) => ({
    ...templateState,
    additionalArtworkEnabled: enabled,
  }))
}

export function addCaseInsertTemplateImageSlot(
  state: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  slotKey: CaseInsertImageSlotGroupKey,
): ProjectJewelCaseState {
  return updateProjectCaseInsertTemplate(state, paneId, (templateState) => {
    const config = getCaseInsertImageSlotGroupConfig(paneId, slotKey)
    const index = getNextSlotIndex(templateState[slotKey], config.idPrefix)

    return {
      ...templateState,
      additionalArtworkEnabled: slotKey === 'artworkSlots'
        ? true
        : templateState.additionalArtworkEnabled,
      [slotKey]: [
        ...templateState[slotKey],
        createCaseInsertTemplateImageSlot(paneId, slotKey, index),
      ],
    }
  })
}

export function updateCaseInsertTemplateImageSlotInGroup(
  state: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  slotKey: CaseInsertImageSlotGroupKey,
  slotId: string,
  updater: (slot: ProjectCaseInsertImageSlot) => ProjectCaseInsertImageSlot,
): ProjectJewelCaseState {
  return updateProjectCaseInsertTemplate(state, paneId, (templateState) => ({
    ...templateState,
    [slotKey]: updateImageSlotById(templateState[slotKey], slotId, updater),
  }))
}

export function removeCaseInsertTemplateImageSlot(
  state: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  slotKey: CaseInsertImageSlotGroupKey,
  slotId: string,
): ProjectJewelCaseState {
  return updateProjectCaseInsertTemplate(state, paneId, (templateState) => ({
    ...templateState,
    [slotKey]: templateState[slotKey].filter((slot) => slot.id !== slotId),
  }))
}

export function renameCaseInsertTemplateImageSlot(
  templateState: ProjectCaseInsertSurfaceState,
  slotKey: CaseInsertImageSlotGroupKey,
  slotId: string,
  label: string,
): ProjectCaseInsertSurfaceState {
  const trimmedLabel = label.trim()

  return {
    ...templateState,
    [slotKey]: updateImageSlotById(templateState[slotKey], slotId, (slot) => ({
      ...slot,
      label: trimmedLabel || slot.label,
    })),
  }
}

export function updateCaseInsertTemplateTextBlock(
  state: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  textBlockId: string,
  updater: (textBlock: ProjectCaseInsertTextBlock) => ProjectCaseInsertTextBlock,
): ProjectJewelCaseState {
  return updateProjectCaseInsertTemplate(state, paneId, (templateState) => ({
    ...templateState,
    textBlocks: updateTextBlockById(
      templateState.textBlocks,
      textBlockId,
      updater,
    ),
  }))
}

export function updateCaseInsertTemplateTextList(
  state: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  textListId: string,
  updater: (textList: ProjectCaseInsertTextList) => ProjectCaseInsertTextList,
): ProjectJewelCaseState {
  return updateProjectCaseInsertTemplate(state, paneId, (templateState) => ({
    ...templateState,
    textLists: updateTextListById(templateState.textLists, textListId, updater),
  }))
}
