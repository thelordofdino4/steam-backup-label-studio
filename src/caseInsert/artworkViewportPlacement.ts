import {
  getCenteredRectLayoutSliderRanges,
  type CaseInsertLayoutSliderRanges,
} from '../layout/caseInsertElementSafeZone.ts'
import type { ProjectCaseInsertImageSlot } from '../project/projectTypes.ts'
import {
  resolveCaseInsertArtworkViewportRenderArtifact,
  type CaseInsertArtworkViewportLayout,
  type CaseInsertArtworkViewportRenderOwner,
} from './artworkViewportRenderArtifact.ts'

/**
 * Adapts the shared viewport artifact to existing placement controls. Null
 * means the active viewport is unavailable; callers retain their exact legacy
 * path only when the slot itself has no viewport.
 */
export function getCaseInsertArtworkViewportLayoutSliderRanges({
  owner,
  slot,
  layout,
}: {
  owner: CaseInsertArtworkViewportRenderOwner
  slot: ProjectCaseInsertImageSlot
  layout: CaseInsertArtworkViewportLayout
}): CaseInsertLayoutSliderRanges | null {
  const result = resolveCaseInsertArtworkViewportRenderArtifact({
    owner,
    slot,
    layout,
  })

  return result.status === 'resolved'
    ? getCenteredRectLayoutSliderRanges(
        result.artifact.basisRect,
        result.artifact.boundingRect,
      )
    : null
}
