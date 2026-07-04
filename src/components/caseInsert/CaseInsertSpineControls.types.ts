import type {
  CaseInsertBrandingMarkTarget,
  CaseInsertBrandingMarkTargetState,
} from '../../caseInsert/brandingMarkSlots'
import type { JewelCaseSpineSide } from '../../caseInsert/types'
import type { JewelCaseSpineEditorActions } from '../../hooks/useJewelCaseSpineEditor'
import type { LogoCandidateDiscoveryState } from '../../hooks/useLogoAssetDiscovery'
import type { LogoAssetKey } from '../../project/projectLogoAssets'
import type {
  ProjectJewelCaseSpineState,
  ProjectMetadata,
} from '../../project/projectTypes'
import type { CaseInsertPreviewTextTarget } from '../../caseInsert/previewTextSelection'
import type { CaseInsertBrandingSetupControlsProps } from './CaseInsertBrandingSetupControls'
import type { CaseInsertImageSourceCatalog } from './CaseInsertImageSourceControls'

export type CaseInsertSpineControlsProps = {
  spine: ProjectJewelCaseSpineState
  projectMetadata: ProjectMetadata
  actions: JewelCaseSpineEditorActions
  imageSources: CaseInsertImageSourceCatalog
  getBrandingControls: (
    target: CaseInsertBrandingMarkTarget,
    targetState: CaseInsertBrandingMarkTargetState,
  ) => CaseInsertBrandingSetupControlsProps
  logoCandidateDiscovery: LogoCandidateDiscoveryState
  handleFindLogoCandidates: (logoKey: LogoAssetKey) => void | Promise<void>
  onSelectedTextTargetChange: (
    target: CaseInsertPreviewTextTarget | null,
  ) => void
}

export type CaseInsertSpineControlSection = {
  side: JewelCaseSpineSide
  label: string
}
