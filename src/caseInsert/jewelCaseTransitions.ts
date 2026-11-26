import type {
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertTextBlock,
  ProjectJewelCaseSpineSideState,
  ProjectJewelCaseSpineState,
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

export const JEWEL_CASE_SPINE_SIDES: JewelCaseSpineSide[] = ['left', 'right']

export function getJewelCaseSpineEditSides(
  spine: ProjectJewelCaseSpineState,
  side: JewelCaseSpineSide,
): JewelCaseSpineSide[] {
  return spine.mirrored ? JEWEL_CASE_SPINE_SIDES : [side]
}

export function getJewelCaseSpineSideScopedId(
  side: JewelCaseSpineSide,
  id: string,
) {
  const currentPrefix = `${side}-spine-`

  if (id.startsWith(currentPrefix)) {
    return id
  }

  const oppositePrefix = side === 'left' ? 'right-spine-' : 'left-spine-'

  return id.startsWith(oppositePrefix)
    ? `${currentPrefix}${id.slice(oppositePrefix.length)}`
    : id
}

export function setJewelCaseSpineMirrored(
  state: ProjectJewelCaseState,
  mirrored: boolean,
): ProjectJewelCaseState {
  return state.spine.mirrored === mirrored
    ? state
    : {
        ...state,
        spine: {
          ...state.spine,
          mirrored,
        },
      }
}

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

export function updateProjectJewelCaseSpineSides(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  updater: (
    spineSide: ProjectJewelCaseSpineSideState,
    side: JewelCaseSpineSide,
  ) => ProjectJewelCaseSpineSideState,
): ProjectJewelCaseState {
  let didChange = false
  const spine = { ...state.spine }

  getJewelCaseSpineEditSides(state.spine, side).forEach((targetSide) => {
    const spineSide = state.spine[targetSide]
    const nextSpineSide = updater(spineSide, targetSide)

    if (nextSpineSide !== spineSide) {
      spine[targetSide] = nextSpineSide
      didChange = true
    }
  })

  return didChange
    ? {
        ...state,
        spine,
      }
    : state
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

export function updateJewelCaseSpineTextBlock(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  textBlockId: string,
  updater: (textBlock: ProjectCaseInsertTextBlock) => ProjectCaseInsertTextBlock,
): ProjectJewelCaseState {
  return updateProjectJewelCaseSpineSide(state, side, (spineSide) => ({
    ...spineSide,
    textBlocks: updateTextBlockById(
      spineSide.textBlocks,
      textBlockId,
      updater,
    ),
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
