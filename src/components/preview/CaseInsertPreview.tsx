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
  getCaseInsertTemplatePaneConfig,
  type CaseInsertTemplatePaneId,
} from '../../caseInsert/templateSurfaces'
import {
  CaseInsertTemplateArtworkLayer,
  CaseInsertTemplateBackgroundLayer,
  CaseInsertTemplateLogoLayer,
  CaseInsertTemplateMarkLayer,
  CaseInsertTemplateTextLayer,
} from './CaseInsertTemplatePreviewLayers'
import { CaseInsertSpinePreviewLayer } from './CaseInsertSpinePreviewLayer'
import { CaseInsertGuideOverlay } from './CaseInsertGuideOverlay'
import { PreviewToastStack, type PreviewToast } from './PreviewToastStack'

export type CaseInsertPreviewProps = {
  caseInsert: ProjectJewelCaseState
  activeTemplatePane: CaseInsertTemplatePaneId
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
  const visibleRegions = useMemo(
    () => layout.regions.filter(({ role }) =>
      role === 'front' || role === 'printable' || role === 'spine',
    ),
    [layout.regions],
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
  activeTemplatePane,
  statusToasts,
}: CaseInsertPreviewProps) {
  const activePaneConfig = getCaseInsertTemplatePaneConfig(activeTemplatePane)
  const activeTemplateState = caseInsert.templates[activeTemplatePane]
  const layout = useMemo(
    () => createJewelCasePreviewLayout(
      caseInsert.templateType,
      activePaneConfig.surfaceId,
    ),
    [activePaneConfig.surfaceId, caseInsert.templateType],
  )
  const previewStyle = useMemo(
    () => ({
      '--case-insert-preview-aspect': `${layout.width} / ${layout.height}`,
      '--case-insert-preview-width-ratio': `${layout.width / layout.height}`,
    }) as CSSProperties,
    [layout.height, layout.width],
  )
  const previewLayers: PreviewLayerMap = {
    'case-surface-base': <CaseInsertSurfaceBaseLayer layout={layout} />,
    'case-background-artwork': (
      <CaseInsertTemplateBackgroundLayer
        paneId={activeTemplatePane}
        templateState={activeTemplateState}
        layout={layout}
      />
    ),
    'case-screenshot-artwork': (
      <CaseInsertTemplateArtworkLayer
        paneId={activeTemplatePane}
        templateState={activeTemplateState}
        layout={layout}
      />
    ),
    'case-callout-artwork': <EmptyCaseLayer />,
    'case-title-artwork': <EmptyCaseLayer />,
    'case-logo-assets': (
      <CaseInsertTemplateLogoLayer
        paneId={activeTemplatePane}
        templateState={activeTemplateState}
        layout={layout}
      />
    ),
    'case-rating-badges': (
      <CaseInsertTemplateMarkLayer
        paneId={activeTemplatePane}
        templateState={activeTemplateState}
        layout={layout}
      />
    ),
    'case-media-marks': <EmptyCaseLayer />,
    'case-platform-marks': <EmptyCaseLayer />,
    'case-technical-marks': <EmptyCaseLayer />,
    'case-text': (
      <CaseInsertTemplateTextLayer
        paneId={activeTemplatePane}
        templateState={activeTemplateState}
        layout={layout}
      />
    ),
    'case-spine-content': (
      <CaseInsertSpinePreviewLayer
        spine={caseInsert.spine}
        layout={layout}
      />
    ),
    'case-editor-guide-overlay': <CaseInsertGuideOverlay layout={layout} />,
  }

  return (
    <section className="preview-area" aria-labelledby="case-insert-preview-title">
      <div className="preview-pane-label">
        <span>Live Preview</span>
        <strong id="case-insert-preview-title">
          {activePaneConfig.label} Preview
        </strong>
      </div>

      <PreviewToastStack statusToasts={statusToasts} />

      <div
        className="case-insert-preview"
        style={previewStyle}
        aria-label={`${activePaneConfig.label} live preview`}
      >
        {CASE_INSERT_EDITOR_PREVIEW_LAYER_ORDER.map((layerId) => (
          <Fragment key={layerId}>{previewLayers[layerId]}</Fragment>
        ))}
      </div>
    </section>
  )
}
