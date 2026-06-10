import {
  Fragment,
  type CSSProperties,
  type ReactNode,
  type RefObject,
  useMemo,
} from 'react'
import {
  CASE_INSERT_EDITOR_PREVIEW_LAYER_ORDER,
  type CaseInsertEditorPreviewLayerId,
} from '../../editor/layerOrder'
import {
  createJewelCasePreviewLayout,
  type CaseInsertPreviewLayout,
} from '../../layout/caseInsertPreviewLayout'
import {
  createCaseInsertGuideLayout,
} from '../../layout/caseInsertGuideLayout'
import type { JewelCasePixelRect } from '../../layout/jewelCaseLayout'
import type { ProjectJewelCaseState } from '../../project/projectTypes'
import type {
  CaseInsertBrandingSourceCatalog,
} from '../../caseInsert/brandingSlotSources'
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
import { CaseInsertSteamBannerPreviewLayer } from './CaseInsertSteamBannerPreviewLayer'
import { CaseInsertSpinePreviewLayer } from './CaseInsertSpinePreviewLayer'
import { CaseInsertGuideOverlay } from './CaseInsertGuideOverlay'
import { PreviewToastStack, type PreviewToast } from './PreviewToastStack'
import type {
  CaseInsertPreviewPointerHandlers,
} from '../../interaction/useCaseInsertPreviewPointerDrag'

export type CaseInsertPreviewProps = {
  caseInsert: ProjectJewelCaseState
  activeTemplatePane: CaseInsertTemplatePaneId
  brandingSources: CaseInsertBrandingSourceCatalog
  caseInsertPreviewRef: RefObject<HTMLDivElement | null>
  pointerHandlers: CaseInsertPreviewPointerHandlers
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
  brandingSources,
  caseInsertPreviewRef,
  pointerHandlers,
  statusToasts,
}: CaseInsertPreviewProps) {
  const activePaneConfig = getCaseInsertTemplatePaneConfig(activeTemplatePane)
  const activeTemplateState = caseInsert.templates[activeTemplatePane]
  const layout = useMemo(
    () => createCaseInsertGuideLayout(
      createJewelCasePreviewLayout(
        caseInsert.templateType,
        activePaneConfig.surfaceId,
      ),
      caseInsert,
    ),
    [activePaneConfig.surfaceId, caseInsert],
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
        brandingSources={brandingSources}
        pointerHandlers={pointerHandlers.template}
      />
    ),
    'case-screenshot-artwork': (
      <CaseInsertTemplateArtworkLayer
        paneId={activeTemplatePane}
        templateState={activeTemplateState}
        layout={layout}
        brandingSources={brandingSources}
        pointerHandlers={pointerHandlers.template}
      />
    ),
    'case-steam-banner': activeTemplatePane === 'cover' ? (
      <CaseInsertSteamBannerPreviewLayer
        banner={activeTemplateState.steamBanner}
        layout={layout}
        target={{ kind: 'cover' }}
      />
    ) : <EmptyCaseLayer />,
    'case-artwork': <EmptyCaseLayer />,
    'case-title-artwork': <EmptyCaseLayer />,
    'case-logo-assets': (
      <CaseInsertTemplateLogoLayer
        paneId={activeTemplatePane}
        templateState={activeTemplateState}
        layout={layout}
        brandingSources={brandingSources}
        pointerHandlers={pointerHandlers.template}
      />
    ),
    'case-rating-badges': (
      <CaseInsertTemplateMarkLayer
        paneId={activeTemplatePane}
        templateState={activeTemplateState}
        layout={layout}
        kind="rating"
        brandingSources={brandingSources}
        pointerHandlers={pointerHandlers.template}
      />
    ),
    'case-media-marks': (
      <CaseInsertTemplateMarkLayer
        paneId={activeTemplatePane}
        templateState={activeTemplateState}
        layout={layout}
        kind="media"
        brandingSources={brandingSources}
        pointerHandlers={pointerHandlers.template}
      />
    ),
    'case-platform-marks': (
      <CaseInsertTemplateMarkLayer
        paneId={activeTemplatePane}
        templateState={activeTemplateState}
        layout={layout}
        kind="platform"
        brandingSources={brandingSources}
        pointerHandlers={pointerHandlers.template}
      />
    ),
    'case-technical-marks': (
      <CaseInsertTemplateMarkLayer
        paneId={activeTemplatePane}
        templateState={activeTemplateState}
        layout={layout}
        kind="technical"
        brandingSources={brandingSources}
        pointerHandlers={pointerHandlers.template}
      />
    ),
    'case-text': (
      <CaseInsertTemplateTextLayer
        paneId={activeTemplatePane}
        templateState={activeTemplateState}
        layout={layout}
        brandingSources={brandingSources}
        pointerHandlers={pointerHandlers.template}
      />
    ),
    'case-spine-content': (
      <CaseInsertSpinePreviewLayer
        spine={caseInsert.spine}
        layout={layout}
        brandingSources={brandingSources}
        pointerHandlers={pointerHandlers.spine}
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
        ref={caseInsertPreviewRef}
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
