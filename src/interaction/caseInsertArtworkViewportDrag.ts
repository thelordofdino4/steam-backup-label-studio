import {
  getCenteredRectLayoutSliderRanges,
} from '../layout/caseInsertElementSafeZone.ts'
import type {
  CaseInsertPreviewLayout,
} from '../layout/caseInsertPreviewLayout.ts'
import type { JewelCasePixelRect } from '../layout/jewelCaseLayout.ts'
import type { ProjectCaseInsertImageSlot } from '../project/projectTypes.ts'
import {
  resolveCaseInsertArtworkViewportRenderArtifact,
  type CaseInsertArtworkViewportRenderOwner,
} from '../caseInsert/artworkViewportRenderArtifact.ts'
import type { DragPointRange } from './dragGeometry.ts'

export type CaseInsertArtworkViewportDragPlacement = Readonly<{
  region: JewelCasePixelRect
  pointRange: DragPointRange
}>

/**
 * Projects the shared viewport render artifact into the existing percent-drag
 * adapter. It owns no viewport or fitting geometry of its own.
 */
export function getCaseInsertArtworkViewportDragPlacement({
  owner,
  slot,
  layout,
}: {
  owner: CaseInsertArtworkViewportRenderOwner
  slot: ProjectCaseInsertImageSlot
  layout: CaseInsertPreviewLayout
}): CaseInsertArtworkViewportDragPlacement | null {
  const viewportResult = resolveCaseInsertArtworkViewportRenderArtifact({
    owner,
    slot,
    layout,
  })

  if (viewportResult.status !== 'resolved') {
    return null
  }

  const ranges = getCenteredRectLayoutSliderRanges(
    viewportResult.artifact.basisRect,
    viewportResult.artifact.boundingRect,
  )

  return {
    region: viewportResult.artifact.basisRect,
    pointRange: {
      minX: ranges.x.min,
      maxX: ranges.x.max,
      minY: ranges.y.min,
      maxY: ranges.y.max,
    },
  }
}
