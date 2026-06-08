import type {
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertTextBlock,
  ProjectJewelCaseSpineSideState,
  ProjectJewelCaseState,
} from '../project/projectTypes.ts'
import type { JewelCaseSpineSide } from './types.ts'

export type JewelCaseSpineImageSlotKey =
  | 'background'
  | 'titleArtwork'

export type JewelCaseSpineImageSlotGroupKey =
  | 'artworkSlots'
  | 'logoSlots'
  | 'markSlots'

export function updateProjectJewelCaseSpineSide(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  updater: (
    spineSide: ProjectJewelCaseSpineSideState,
  ) => ProjectJewelCaseSpineSideState,
): ProjectJewelCaseState {
  return {
    ...state,
    spine: {
      ...state.spine,
      [side]: updater(state.spine[side]),
    },
  }
}

export function updateJewelCaseSpineTitle(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  updater: (title: ProjectCaseInsertTextBlock) => ProjectCaseInsertTextBlock,
): ProjectJewelCaseState {
  return updateProjectJewelCaseSpineSide(state, side, (spineSide) => ({
    ...spineSide,
    title: updater(spineSide.title),
  }))
}

export function updateJewelCaseSpineImageSlot(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  slotKey: JewelCaseSpineImageSlotKey,
  updater: (slot: ProjectCaseInsertImageSlot) => ProjectCaseInsertImageSlot,
): ProjectJewelCaseState {
  return updateProjectJewelCaseSpineSide(state, side, (spineSide) => ({
    ...spineSide,
    [slotKey]: updater(spineSide[slotKey]),
  }))
}

export function setJewelCaseSpineAdditionalArtworkEnabled(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  enabled: boolean,
): ProjectJewelCaseState {
  return updateProjectJewelCaseSpineSide(state, side, (spineSide) => ({
    ...spineSide,
    additionalArtworkEnabled: enabled,
  }))
}

export function updateJewelCaseSpineImageSlotInGroup(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  slotKey: JewelCaseSpineImageSlotGroupKey,
  slotId: string,
  updater: (slot: ProjectCaseInsertImageSlot) => ProjectCaseInsertImageSlot,
): ProjectJewelCaseState {
  return updateProjectJewelCaseSpineSide(state, side, (spineSide) => ({
    ...spineSide,
    [slotKey]: spineSide[slotKey].map((slot) =>
      slot.id === slotId ? updater(slot) : slot),
  }))
}

export function addJewelCaseSpineImageSlot(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  slotKey: JewelCaseSpineImageSlotGroupKey,
  slot: ProjectCaseInsertImageSlot,
): ProjectJewelCaseState {
  return updateProjectJewelCaseSpineSide(state, side, (spineSide) => ({
    ...spineSide,
    additionalArtworkEnabled: slotKey === 'artworkSlots'
      ? true
      : spineSide.additionalArtworkEnabled,
    [slotKey]: [...spineSide[slotKey], slot],
  }))
}

export function removeJewelCaseSpineImageSlot(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  slotKey: JewelCaseSpineImageSlotGroupKey,
  slotId: string,
): ProjectJewelCaseState {
  return updateProjectJewelCaseSpineSide(state, side, (spineSide) => ({
    ...spineSide,
    [slotKey]: spineSide[slotKey].filter((slot) => slot.id !== slotId),
  }))
}

export function renameJewelCaseSpineImageSlot(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  slotKey: JewelCaseSpineImageSlotGroupKey,
  slotId: string,
  label: string,
): ProjectJewelCaseState {
  const trimmedLabel = label.trim()

  return updateJewelCaseSpineImageSlotInGroup(
    state,
    side,
    slotKey,
    slotId,
    (slot) => ({
      ...slot,
      label: trimmedLabel || slot.label,
    }),
  )
}
