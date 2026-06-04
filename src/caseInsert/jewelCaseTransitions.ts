import type {
  ProjectJewelCaseSpineSideState,
  ProjectJewelCaseState,
} from '../project/projectTypes.ts'
import type { JewelCaseSpineSide } from './types.ts'

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
