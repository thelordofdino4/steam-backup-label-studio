import type {
  ProjectCaseInsertImageSlot,
  ProjectJewelCaseFrontState,
  ProjectJewelCaseState,
} from '../project/projectTypes.ts'
import { createDefaultCaseInsertImageSlot } from './defaults.ts'
import { updateProjectJewelCaseFront } from './jewelCaseTransitions.ts'

export type JewelCaseFrontImageSlotKey =
  | 'background'
  | 'titleArtwork'
  | 'calloutArtwork'

export type JewelCaseFrontRepeatedImageSlotKey = 'logoSlots' | 'markSlots'

const repeatedSlotConfig: Record<
  JewelCaseFrontRepeatedImageSlotKey,
  {
    idPrefix: string
    labelPrefix: string
    defaultLayout: { scale: number; x: number; y: number }
  }
> = {
  logoSlots: {
    idPrefix: 'front-logo',
    labelPrefix: 'Front logo',
    defaultLayout: { scale: 1, x: 20, y: 84 },
  },
  markSlots: {
    idPrefix: 'front-mark',
    labelPrefix: 'Front mark',
    defaultLayout: { scale: 1, x: 82, y: 84 },
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

function getNextRepeatedSlotIndex(
  slots: ProjectCaseInsertImageSlot[],
  idPrefix: string,
) {
  let index = slots.length + 1

  while (slots.some(({ id }) => id === `${idPrefix}-${index}`)) {
    index += 1
  }

  return index
}

export function createJewelCaseFrontRepeatedImageSlot(
  slotKey: JewelCaseFrontRepeatedImageSlotKey,
  index: number,
): ProjectCaseInsertImageSlot {
  const config = repeatedSlotConfig[slotKey]

  return createDefaultCaseInsertImageSlot(
    `${config.idPrefix}-${index}`,
    `${config.labelPrefix} ${index}`,
    {
      enabled: true,
      fit: 'contain',
      layout: config.defaultLayout,
    },
  )
}

export function updateJewelCaseFrontImageSlot(
  state: ProjectJewelCaseState,
  slotKey: JewelCaseFrontImageSlotKey,
  updater: (slot: ProjectCaseInsertImageSlot) => ProjectCaseInsertImageSlot,
): ProjectJewelCaseState {
  return updateProjectJewelCaseFront(state, (front) => ({
    ...front,
    [slotKey]: updater(front[slotKey]),
  }))
}

export function addJewelCaseFrontRepeatedImageSlot(
  state: ProjectJewelCaseState,
  slotKey: JewelCaseFrontRepeatedImageSlotKey,
): ProjectJewelCaseState {
  return updateProjectJewelCaseFront(state, (front) => {
    const config = repeatedSlotConfig[slotKey]
    const index = getNextRepeatedSlotIndex(front[slotKey], config.idPrefix)

    return {
      ...front,
      [slotKey]: [
        ...front[slotKey],
        createJewelCaseFrontRepeatedImageSlot(slotKey, index),
      ],
    }
  })
}

export function updateJewelCaseFrontRepeatedImageSlot(
  state: ProjectJewelCaseState,
  slotKey: JewelCaseFrontRepeatedImageSlotKey,
  slotId: string,
  updater: (slot: ProjectCaseInsertImageSlot) => ProjectCaseInsertImageSlot,
): ProjectJewelCaseState {
  return updateProjectJewelCaseFront(state, (front) => ({
    ...front,
    [slotKey]: updateImageSlotById(front[slotKey], slotId, updater),
  }))
}

export function removeJewelCaseFrontRepeatedImageSlot(
  state: ProjectJewelCaseState,
  slotKey: JewelCaseFrontRepeatedImageSlotKey,
  slotId: string,
): ProjectJewelCaseState {
  return updateProjectJewelCaseFront(state, (front) => ({
    ...front,
    [slotKey]: front[slotKey].filter((slot) => slot.id !== slotId),
  }))
}

export function renameJewelCaseFrontRepeatedImageSlot(
  front: ProjectJewelCaseFrontState,
  slotKey: JewelCaseFrontRepeatedImageSlotKey,
  slotId: string,
  label: string,
): ProjectJewelCaseFrontState {
  const trimmedLabel = label.trim()

  return {
    ...front,
    [slotKey]: updateImageSlotById(front[slotKey], slotId, (slot) => ({
      ...slot,
      label: trimmedLabel || slot.label,
    })),
  }
}
