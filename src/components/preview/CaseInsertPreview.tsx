import { Fragment, type CSSProperties, type ReactNode, useMemo } from 'react'
import {
  CASE_INSERT_EDITOR_PREVIEW_LAYER_ORDER,
  type CaseInsertEditorPreviewLayerId,
} from '../../editor/layerOrder'
import {
  createJewelCasePreviewLayout,
  type CaseInsertPreviewLayout,
} from '../../layout/caseInsertPreviewLayout'
import type { JewelCasePixelRect } from '../../layout/jewelCaseLayout'
import type { ProjectJewelCaseState } from '../../project/projectTypes'
import {
  CaseInsertFrontBackgroundLayer,
  CaseInsertFrontCalloutArtworkLayer,
  CaseInsertFrontLogoLayer,
  CaseInsertFrontMarkLayer,
  CaseInsertFrontTextLayer,
  CaseInsertFrontTitleArtworkLayer,
} from './CaseInsertFrontPreviewLayers'
import { CaseInsertGuideOverlay } from './CaseInsertGuideOverlay'
import { PreviewToastStack, type PreviewToast } from './PreviewToastStack'

export type CaseInsertPreviewProps = {
  caseInsert: ProjectJewelCaseState
  statusToasts: PreviewToast[]
}

type PreviewLayerMap = Record<CaseInsertEditorPreviewLayerId, ReactNode>

function getRectStyle(rect: JewelCasePixelRect, layout: CaseInsertPreviewLayout) {
  return {
    left: `${rect.x / layout.width * 100}%`,
    top: `${rect.y / layout.height * 100}%`,
    width: `${rect.width / layout.width * 100}%`,
    height: `${rect.height / layout.height * 100}%`,
  }
}

function CaseInsertSurfaceBaseLayer({
  layout,
}: {
  layout: CaseInsertPreviewLayout
}) {
  const visibleRegions = layout.regions.filter(({ role }) =>
    role === 'front' || role === 'printable' || role === 'spine',
  )

  return (
    <div className="case-insert-surface-base-layer" aria-hidden="true">
      {layout.surfaces.map((surface) => (
        <div
          className={`case-insert-surface case-insert-surface-${surface.surfaceId}`}
          key={surface.surfaceId}
          style={getRectStyle(surface.bounds, layout)}
        />
      ))}
      {visibleRegions.map((region) => (
        <div
          className={[
            'case-insert-region-fill',
            `case-insert-region-fill-${region.role}`,
            `case-insert-region-fill-${region.regionId}`,
          ].join(' ')}
          key={region.regionId}
          style={getRectStyle(region.bounds, layout)}
        />
      ))}
    </div>
  )
}

function EmptyCaseLayer() {
  return null
}

export function CaseInsertPreview({
  caseInsert,
  statusToasts,
}: CaseInsertPreviewProps) {
  const layout = useMemo(
    () => createJewelCasePreviewLayout(caseInsert.templateType),
    [caseInsert.templateType],
  )
  const previewStyle = {
    '--case-insert-preview-aspect': `${layout.width} / ${layout.height}`,
  } as CSSProperties
  const previewLayers: PreviewLayerMap = {
    'case-surface-base': <CaseInsertSurfaceBaseLayer layout={layout} />,
    'case-background-artwork': (
      <CaseInsertFrontBackgroundLayer front={caseInsert.front} layout={layout} />
    ),
    'case-screenshot-artwork': <EmptyCaseLayer />,
    'case-callout-artwork': (
      <CaseInsertFrontCalloutArtworkLayer
        front={caseInsert.front}
        layout={layout}
      />
    ),
    'case-title-artwork': (
      <CaseInsertFrontTitleArtworkLayer
        front={caseInsert.front}
        layout={layout}
      />
    ),
    'case-logo-assets': (
      <CaseInsertFrontLogoLayer front={caseInsert.front} layout={layout} />
    ),
    'case-rating-badges': (
      <CaseInsertFrontMarkLayer front={caseInsert.front} layout={layout} />
    ),
    'case-media-marks': <EmptyCaseLayer />,
    'case-platform-marks': <EmptyCaseLayer />,
    'case-technical-marks': <EmptyCaseLayer />,
    'case-text': (
      <CaseInsertFrontTextLayer front={caseInsert.front} layout={layout} />
    ),
    'case-spine-content': <EmptyCaseLayer />,
    'case-editor-guide-overlay': <CaseInsertGuideOverlay layout={layout} />,
  }

  return (
    <section className="preview-area" aria-labelledby="case-insert-preview-title">
      <div className="preview-pane-label">
        <span>Live Preview</span>
        <strong id="case-insert-preview-title">Jewel Case Preview</strong>
      </div>

      <PreviewToastStack statusToasts={statusToasts} />

      <div
        className="case-insert-preview"
        style={previewStyle}
        aria-label="Jewel case front, spine, and back live preview"
      >
        {CASE_INSERT_EDITOR_PREVIEW_LAYER_ORDER.map((layerId) => (
          <Fragment key={layerId}>{previewLayers[layerId]}</Fragment>
        ))}
      </div>
    </section>
  )
}
