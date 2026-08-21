import type { CSSProperties } from 'react'
import type { CaseInsertPreviewLayout } from '../../layout/caseInsertPreviewLayout'
import type {
  CaseInsertArtworkViewportRenderArtifact,
} from '../../render/caseInsertArtworkViewportRenderArtifact'

function percent(value: number, total: number) {
  return `${(value / total) * 100}%`
}

export function getCaseInsertArtworkViewportPreviewOuterStyle(
  artifact: CaseInsertArtworkViewportRenderArtifact,
): CSSProperties {
  const basis = artifact.basisRect

  return {
    left: percent(artifact.box.center.x - basis.x, basis.width),
    top: percent(artifact.box.center.y - basis.y, basis.height),
    width: percent(artifact.box.width, basis.width),
    height: percent(artifact.box.height, basis.height),
    transform: `translate(-50%, -50%) rotate(${artifact.box.rotationDegrees}deg)`,
    transformOrigin: 'center',
  }
}

export function getCaseInsertArtworkViewportPreviewBasisStyle(
  artifact: CaseInsertArtworkViewportRenderArtifact,
  layout: Pick<CaseInsertPreviewLayout, 'width' | 'height'>,
): CSSProperties {
  const isSpine = artifact.owner === 'left-spine' ||
    artifact.owner === 'right-spine'

  return {
    left: percent(artifact.basisRect.x, layout.width),
    top: percent(artifact.basisRect.y, layout.height),
    width: percent(artifact.basisRect.width, layout.width),
    height: percent(artifact.basisRect.height, layout.height),
    overflow: 'hidden',
    pointerEvents: 'none',
    ...(isSpine ? { zIndex: 2 } : {}),
  }
}

export function getCaseInsertArtworkViewportPreviewDestinationStyle(
  artifact: CaseInsertArtworkViewportRenderArtifact,
): CSSProperties {
  const frame = artifact.localFrameRect
  const destination = artifact.destinationRect

  return {
    left: percent(destination.x - frame.x, frame.width),
    top: percent(destination.y - frame.y, frame.height),
    width: percent(destination.width, frame.width),
    height: percent(destination.height, frame.height),
  }
}

export function getCaseInsertArtworkViewportPreviewSourceStyle(
  artifact: CaseInsertArtworkViewportRenderArtifact,
): CSSProperties {
  const imageSize = artifact.imageSize
  const source = artifact.visibleSourceRect
  if (!imageSize || imageSize.width <= 0 || imageSize.height <= 0 ||
      source.width <= 0 || source.height <= 0) {
    return { display: 'none' }
  }

  return {
    left: percent(-source.x, source.width),
    top: percent(-source.y, source.height),
    width: percent(imageSize.width, source.width),
    height: percent(imageSize.height, source.height),
  }
}

export function getCaseInsertArtworkViewportPreviewClassNames(
  artifact: CaseInsertArtworkViewportRenderArtifact,
) {
  const isSpine = artifact.owner === 'left-spine' ||
    artifact.owner === 'right-spine'

  return Object.freeze({
    basis: [
      'case-insert-artwork-viewport-basis',
      isSpine ? 'case-insert-artwork-viewport-basis--spine' : '',
    ].filter(Boolean).join(' '),
    viewport: [
      'case-insert-artwork-viewport',
      `case-insert-artwork-viewport--${artifact.owner}`,
      isSpine ? 'case-insert-spine-overlay-artwork' : '',
    ].filter(Boolean).join(' '),
  })
}
