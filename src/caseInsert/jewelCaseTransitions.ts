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
  const currentSide = state.spine[side]
  const nextSide = updater(currentSide)
  if (nextSide === currentSide) return state

  return {
    ...state,
    spine: {
      ...state.spine,
      [side]: nextSide,
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
  return updateProjectJewelCaseSpineSide(state, side, (spineSide) => {
    const nextTitle = updater(spineSide.title)
    return nextTitle === spineSide.title
      ? spineSide
      : { ...spineSide, title: nextTitle }
  })
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

    const nextTextBlock = updater(textBlock)
    if (nextTextBlock !== textBlock) didUpdate = true
    return nextTextBlock
  })

  return didUpdate ? nextTextBlocks : textBlocks
}

export function updateJewelCaseSpineTextBlock(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  textBlockId: string,
  updater: (textBlock: ProjectCaseInsertTextBlock) => ProjectCaseInsertTextBlock,
): ProjectJewelCaseState {
  return updateProjectJewelCaseSpineSide(state, side, (spineSide) => {
    const nextTextBlocks = updateTextBlockById(
      spineSide.textBlocks,
      textBlockId,
      updater,
    )
    return nextTextBlocks === spineSide.textBlocks
      ? spineSide
      : { ...spineSide, textBlocks: nextTextBlocks }
  })
}

export function updateJewelCaseSpineImageSlot(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  slotKey: JewelCaseSpineImageSlotKey,
  updater: (slot: ProjectCaseInsertImageSlot) => ProjectCaseInsertImageSlot,
): ProjectJewelCaseState {
  return updateProjectJewelCaseSpineSide(state, side, (spineSide) => {
    const currentSlot = spineSide[slotKey]
    const nextSlot = updater(currentSlot)
    return nextSlot === currentSlot
      ? spineSide
      : { ...spineSide, [slotKey]: nextSlot }
  })
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
  return updateProjectJewelCaseSpineSide(state, side, (spineSide) => {
    let changed = false
    const nextSlots = spineSide[slotKey].map((slot) => {
      if (slot.id !== slotId) return slot
      const nextSlot = updater(slot)
      if (nextSlot !== slot) changed = true
      return nextSlot
    })
    return changed
      ? { ...spineSide, [slotKey]: nextSlots }
      : spineSide
  })
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
