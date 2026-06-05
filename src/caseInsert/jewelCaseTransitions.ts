import type {
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertTextBlock,
  ProjectJewelCaseSpineSideState,
  ProjectJewelCaseState,
} from '../project/projectTypes.ts'
import type { JewelCaseSpineSide } from './types.ts'

export type JewelCaseSpineImageSlotKey =
  | 'background'
  | 'steamBackupBranding'
  | 'logo'

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
