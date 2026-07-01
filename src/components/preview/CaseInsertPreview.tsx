import {
  Fragment,
  type CSSProperties,
  type ReactNode,
  type RefObject,
  useCallback,
  useMemo,
  useState,
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
import { PreviewDesignCheckPanel } from './PreviewDesignCheckPanel'
import { CaseInsertGuideLegendPreviewPanel } from './PreviewGuideLegendPanel'
import { PreviewElementOverlay } from './PreviewElementOverlay'
import {
  ArtworkFrameMaterialLightEditorOverlay,
  type ArtworkFrameMaterialPreviewLightOverride,
} from './ArtworkFrameMaterialLightEditorOverlay'
import { PreviewHeader } from './PreviewHeader'
import { PreviewViewport } from './PreviewViewport'
import { ContextualTextRibbonProvider } from './ContextualTextRibbonBridge'
import { usePreviewGuideLegendPlacement } from './usePreviewGuideLegendPlacement'
import type {
  CaseInsertPreviewPointerHandlers,
} from '../../interaction/useCaseInsertPreviewPointerDrag'
import { buildCaseInsertDesignCheckSummary } from '../../export/caseInsertDesignCheck'
import type {
  CaseInsertPreviewTextTarget,
} from '../../caseInsert/previewTextSelection'
import type {
  CaseInsertPreviewTextControlHandlers,
} from './caseInsertInlineTextEditorControls'
import type { PreviewEditableElement } from '../../editor/previewElementOverlay'
import {
  getCaseInsertArtworkFrameMaterialLightEditorTarget,
  type ArtworkFrameMaterialLightOverride,
  type ArtworkFrameMaterialLightOverrideMap,
} from '../../render/artworkFrameMaterialLightEditor'
import type {
  ArtworkFrameMaterialLightVector,
} from '../../render/artworkFrameMaterialLighting'
import type {
  ArtworkFrameCanvasMaterialQualityMode,
} from '../../render/artworkFrameMaterialPlan'

export type CaseInsertPreviewProps = {
  caseInsert: ProjectJewelCaseState
  activeTemplatePane: CaseInsertTemplatePaneId
  brandingSources: CaseInsertBrandingSourceCatalog
  selectedTextTarget: CaseInsertPreviewTextTarget | null
  caseInsertPreviewRef: RefObject<HTMLDivElement | null>
  pointerHandlers: CaseInsertPreviewPointerHandlers
  statusToasts: PreviewToast[]
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
  materialLightOverridesByEditableId?: ArtworkFrameMaterialLightOverrideMap
  onMaterialLightChange?: (
    editableId: string,
    lightOverride: ArtworkFrameMaterialLightOverride,
  ) => void
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
  selectedTextTarget,
  caseInsertPreviewRef,
  pointerHandlers,
  statusToasts,
  onSelectedTextTargetChange,
  onTextTargetValueChange,
  onTextTargetEditComplete,
  previewTextControlHandlers,
  materialLightOverridesByEditableId = {},
  onMaterialLightChange,
}: CaseInsertPreviewProps) {
  const [isDesignCheckOpen, setIsDesignCheckOpen] = useState(false)
  const [isGuideLegendOpen, setIsGuideLegendOpen] = useState(false)
  const [
    selectedMaterialLightElement,
    setSelectedMaterialLightElement,
  ] = useState<PreviewEditableElement | null>(null)
  const [
    materialLightQualityModesByEditableId,
    setMaterialLightQualityModesByEditableId,
  ] = useState<Record<string, ArtworkFrameCanvasMaterialQualityMode>>({})
  const { guideLegendClosedSize, previewAreaRef } =
    usePreviewGuideLegendPlacement({
      closedButtonCount: 2,
      isOpen: isDesignCheckOpen || isGuideLegendOpen,
      previewRef: caseInsertPreviewRef,
    })

  function handleDesignCheckOpenChange(isOpen: boolean) {
    setIsDesignCheckOpen(isOpen)
    if (isOpen) {
      setIsGuideLegendOpen(false)
    }
  }

  function handleGuideLegendOpenChange(isOpen: boolean) {
    setIsGuideLegendOpen(isOpen)
    if (isOpen) {
      setIsDesignCheckOpen(false)
    }
  }
  const materialLightEditorTarget = useMemo(
    () => getCaseInsertArtworkFrameMaterialLightEditorTarget(
      caseInsert,
      activeTemplatePane,
      selectedMaterialLightElement,
    ),
    [activeTemplatePane, caseInsert, selectedMaterialLightElement],
  )
  const previewMaterialLightOverridesByEditableId = useMemo(() => {
    const previewOverrides:
      Record<string, ArtworkFrameMaterialPreviewLightOverride> = {}

    for (const [editableId, lightOverride] of Object.entries(
      materialLightOverridesByEditableId,
    )) {
      previewOverrides[editableId] = {
        ...lightOverride,
        qualityMode: materialLightQualityModesByEditableId[editableId] ?? 'full',
      }
    }

    return previewOverrides
  }, [materialLightOverridesByEditableId, materialLightQualityModesByEditableId])
  const handleMaterialLightChange = useCallback((
    editableId: string,
    lightVector: ArtworkFrameMaterialLightVector,
    qualityMode: ArtworkFrameCanvasMaterialQualityMode,
  ) => {
    setMaterialLightQualityModesByEditableId((current) => ({
      ...current,
      [editableId]: qualityMode,
    }))
    onMaterialLightChange?.(editableId, {
      lightVector,
    })
  }, [onMaterialLightChange])
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
  const designCheckSummary = useMemo(
    () => buildCaseInsertDesignCheckSummary({
      caseInsert,
      activeTemplatePane,
      brandingSources,
    }),
    [activeTemplatePane, brandingSources, caseInsert],
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
        materialLightOverridesByEditableId={
          previewMaterialLightOverridesByEditableId
        }
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
        selectedTextTarget={selectedTextTarget}
        pointerHandlers={pointerHandlers.template}
        onSelectedTextTargetChange={onSelectedTextTargetChange}
        onTextTargetValueChange={onTextTargetValueChange}
        onTextTargetEditComplete={onTextTargetEditComplete}
        previewTextControlHandlers={previewTextControlHandlers}
      />
    ),
    'case-spine-content': (
      <CaseInsertSpinePreviewLayer
        spine={caseInsert.spine}
        layout={layout}
        brandingSources={brandingSources}
        selectedTextTarget={selectedTextTarget}
        pointerHandlers={pointerHandlers.spine}
        materialLightOverridesByEditableId={
          previewMaterialLightOverridesByEditableId
        }
        onSelectedTextTargetChange={onSelectedTextTargetChange}
        onTextTargetValueChange={onTextTargetValueChange}
        onTextTargetEditComplete={onTextTargetEditComplete}
        previewTextControlHandlers={previewTextControlHandlers}
      />
    ),
    'case-editor-guide-overlay': <CaseInsertGuideOverlay layout={layout} />,
  }

  return (
    <ContextualTextRibbonProvider>
      <section
        ref={previewAreaRef}
        className={[
          'preview-area',
          selectedTextTarget ? 'has-contextual-text-ribbon-active' : '',
        ].filter(Boolean).join(' ')}
        aria-labelledby="case-insert-preview-title"
      >
        <PreviewHeader
          contextualTextRibbonActive={Boolean(selectedTextTarget)}
          title={`${activePaneConfig.label} Preview`}
          titleId="case-insert-preview-title"
        />

        <PreviewToastStack statusToasts={statusToasts} />

        <div className="preview-workspace">
          <PreviewViewport label={`${activePaneConfig.label} preview`}>
            <div
              ref={caseInsertPreviewRef}
              className="case-insert-preview"
              data-smoke-id={`case-preview-${activeTemplatePane}`}
              style={previewStyle}
              aria-label={`${activePaneConfig.label} live preview`}
            >
              {CASE_INSERT_EDITOR_PREVIEW_LAYER_ORDER.map((layerId) => (
                <Fragment key={layerId}>{previewLayers[layerId]}</Fragment>
              ))}
              <PreviewElementOverlay
                previewRef={caseInsertPreviewRef}
                onSelectedElementChange={setSelectedMaterialLightElement}
              />
              <ArtworkFrameMaterialLightEditorOverlay
                lightOverride={
                  materialLightEditorTarget
                    ? previewMaterialLightOverridesByEditableId[
                        materialLightEditorTarget.editableId
                      ] ?? null
                    : null
                }
                onLightChange={handleMaterialLightChange}
                previewRef={caseInsertPreviewRef}
                target={materialLightEditorTarget}
              />
            </div>
          </PreviewViewport>

          <PreviewDesignCheckPanel
            closedOffset={guideLegendClosedSize + 4}
            closedSize={guideLegendClosedSize}
            isOpen={isDesignCheckOpen}
            label="Case insert design check"
            onOpenChange={handleDesignCheckOpenChange}
            summary={designCheckSummary}
          />

          <CaseInsertGuideLegendPreviewPanel
            closedSize={guideLegendClosedSize}
            isOpen={isGuideLegendOpen}
            onOpenChange={handleGuideLegendOpenChange}
          />
        </div>
      </section>
    </ContextualTextRibbonProvider>
  )
}
