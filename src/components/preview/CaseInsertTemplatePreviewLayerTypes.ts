import type {
  CaseInsertBrandingSourceCatalog,
} from '../../caseInsert/brandingSlotSources'
import type { CaseInsertTemplatePaneId } from '../../caseInsert/templateSurfaces'
import type { CaseInsertPreviewLayout } from '../../layout/caseInsertPreviewLayout'
import type {
  CaseInsertPreviewTextTarget,
} from '../../caseInsert/previewTextSelection'
import type {
  CaseInsertTemplatePreviewPointerHandlers,
} from '../../interaction/useCaseInsertPreviewPointerDrag'
import type { ProjectCaseInsertSurfaceState } from '../../project/projectTypes'
import type {
  CaseInsertPreviewTextControlHandlers,
} from './caseInsertInlineTextEditorControls'

export type CaseInsertTemplateLayerProps = {
  paneId: CaseInsertTemplatePaneId
  templateState: ProjectCaseInsertSurfaceState
  layout: CaseInsertPreviewLayout
  pointerHandlers: CaseInsertTemplatePreviewPointerHandlers
  brandingSources: CaseInsertBrandingSourceCatalog
}

export type CaseInsertTemplateTextLayerProps = CaseInsertTemplateLayerProps & {
  selectedTextTarget: CaseInsertPreviewTextTarget | null
  onSelectedTextTargetChange: (
    target: CaseInsertPreviewTextTarget | null,
  ) => void
  onTextTargetValueChange: (
    target: CaseInsertPreviewTextTarget,
    value: string,
    options?: { sourceMode?: boolean },
  ) => void
  onTextTargetEditComplete: (target: CaseInsertPreviewTextTarget) => void
  previewTextControlHandlers: CaseInsertPreviewTextControlHandlers
}

export type CaseInsertTemplateMarkLayerKind =
  | 'rating'
  | 'media'
  | 'platform'
  | 'technical'
