import type {
  CaseInsertBrandingMarkTarget,
  CaseInsertBrandingMarkTargetState,
} from '../../caseInsert/brandingMarkSlots'
import type { CaseInsertTemplatePaneId } from '../../caseInsert/templateSurfaces'
import type { CaseInsertTemplateEditorActions } from '../../hooks/useCaseInsertTemplateEditor'
import type { LogoCandidateDiscoveryState } from '../../hooks/useLogoAssetDiscovery'
import type { LogoAssetKey } from '../../project/projectLogoAssets'
import type {
  ProjectCaseInsertSurfaceState,
  ProjectMetadata,
} from '../../project/projectTypes'
import type { CaseInsertPreviewTextTarget } from '../../caseInsert/previewTextSelection'
import type { CaseInsertBrandingSetupControlsProps } from './CaseInsertBrandingSetupControls'
import type { CaseInsertImageSourceCatalog } from './CaseInsertImageSourceControls'

export type CaseInsertTemplateControlsProps = {
  paneId: CaseInsertTemplatePaneId
  templateState: ProjectCaseInsertSurfaceState
  projectMetadata: ProjectMetadata
  actions: CaseInsertTemplateEditorActions
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
