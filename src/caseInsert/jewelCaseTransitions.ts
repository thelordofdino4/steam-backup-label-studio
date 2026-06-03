import type {
  ProjectCaseInsertImageSlot,
  ProjectJewelCaseBackState,
  ProjectJewelCaseFrontState,
  ProjectJewelCaseSpineSideState,
  ProjectJewelCaseState,
} from '../project/projectTypes.ts'
import { createDefaultCaseInsertImageSlot } from './defaults.ts'
import type { JewelCaseSpineSide } from './types.ts'

export function updateProjectJewelCaseFront(
  state: ProjectJewelCaseState,
  updater: (front: ProjectJewelCaseFrontState) => ProjectJewelCaseFrontState,
): ProjectJewelCaseState {
  return {
    ...state,
    front: updater(state.front),
  }
}

export function updateProjectJewelCaseBack(
  state: ProjectJewelCaseState,
  updater: (back: ProjectJewelCaseBackState) => ProjectJewelCaseBackState,
): ProjectJewelCaseState {
  return {
    ...state,
    back: updater(state.back),
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

function updateCaseInsertImageSlotById(
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

export function addJewelCaseBackScreenshotSlot(
  state: ProjectJewelCaseState,
): ProjectJewelCaseState {
  return updateProjectJewelCaseBack(state, (back) => {
    const nextIndex = back.screenshotSlots.length + 1

    return {
      ...back,
      screenshotSlots: [
        ...back.screenshotSlots,
        createDefaultCaseInsertImageSlot(
          `back-screenshot-${nextIndex}`,
          `Back screenshot ${nextIndex}`,
          { fit: 'cover' },
        ),
      ],
    }
  })
}

export function updateJewelCaseBackScreenshotSlot(
  state: ProjectJewelCaseState,
  slotId: string,
  updater: (slot: ProjectCaseInsertImageSlot) => ProjectCaseInsertImageSlot,
): ProjectJewelCaseState {
  return updateProjectJewelCaseBack(state, (back) => ({
    ...back,
    screenshotSlots: updateCaseInsertImageSlotById(
      back.screenshotSlots,
      slotId,
      updater,
    ),
  }))
}

export function removeJewelCaseBackScreenshotSlot(
  state: ProjectJewelCaseState,
  slotId: string,
): ProjectJewelCaseState {
  return updateProjectJewelCaseBack(state, (back) => ({
    ...back,
    screenshotSlots: back.screenshotSlots.filter((slot) => slot.id !== slotId),
  }))
}
