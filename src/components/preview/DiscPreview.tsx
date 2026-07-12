import { Fragment, useMemo, useState, type PointerEvent, type ReactNode, type RefObject } from 'react'
import type { DiscTextAlignment, DiscTextArcSide, DiscTextKey, DiscTextLayout, DiscTextLayoutNumericField, DiscTextLayoutSettings, DiscTextHtmlSources, DiscTextSettings, DiscTextValues, SteamLogoPlacement } from '../../discText/index'
import type { DiscTextStyleField, DiscTextStyleSettings, DiscTextStyleValue } from '../../discText/styles'
import type { TextContentMode } from '../../text/htmlText'
import type { BackgroundImageSize, BackgroundOffset, PlatformMarkValue, ProjectAdditionalArtwork, ProjectDiscNumberArtwork, ProjectLogoAssets, ProjectMediaMark, ProjectMetadata, ProjectPlatformMarks, ProjectRatingBadge, ProjectTechnicalMarks, ProjectTitleArtwork, SelectedDiscTemplateId, SteamBannerColors, TechnicalMarkValue } from '../../project/projectTypes'
import type { DiscTemplate } from '../../types/template'
import { BackgroundLayer, type BackgroundPreviewSize } from './BackgroundLayer'
import { DiscGuideOverlay } from './DiscGuideOverlay'
import { DiscTextLayer } from './DiscTextLayer'
import { PreviewToastStack, type PreviewToast } from './PreviewToastStack'
import { SteamBannerPreview } from './SteamBannerPreview'
import { LogoAssetLayer } from './LogoAssetLayer'
import { RatingBadgeLayer } from './RatingBadgeLayer'
import { MediaMarkLayer } from './MediaMarkLayer'
import { PlatformMarksLayer } from './PlatformMarksLayer'
import { TechnicalMarksLayer } from './TechnicalMarksLayer'
import { TitleArtworkLayer } from './TitleArtworkLayer'
import { AdditionalArtworkLayer } from './AdditionalArtworkLayer'
import { PreviewDesignCheckPanel } from './PreviewDesignCheckPanel'
import { DiscGuideLegendPreviewPanel } from './PreviewGuideLegendPanel'
import { PreviewElementOverlay } from './PreviewElementOverlay'
import { DiscGuidedPlaceholderOverlay } from './DiscGuidedPlaceholderOverlay'
import { DiscGuidedPlaceholderActions } from './DiscGuidedPlaceholderActions'
import { PreviewHeader } from './PreviewHeader'
import { PreviewViewport } from './PreviewViewport'
import { ContextualTextRibbonProvider } from './ContextualTextRibbonBridge'
import { usePreviewGuideLegendPlacement } from './usePreviewGuideLegendPlacement'
import type { SteamBannerLockupLayout } from '../../project/projectTypes'
import { DISC_EDITOR_PREVIEW_LAYER_ORDER, type DiscEditorPreviewLayerId } from '../../editor/layerOrder'
import { resolveMetadataBoundDiscTextValues, type DiscTextValueSources, type MetadataBoundDiscTextKey } from '../../project/metadataDiscText'
import type { LogoAssetKey } from '../../project/projectLogoAssets'
import type { RatingBadgeElementKey } from '../../project/projectRatingBadge'
import { createDiscTextOccupiedRegions } from '../../layout/discTextOccupiedRegions'
import { measureDiscTextWithBrowserCanvas } from '../../discText/svgLayer'
import { buildDiscDesignCheckSummary } from '../../export/discDesignCheck'
import type { DiscGuidedPlaceholderViewModel } from '../../guidedPresets/discGuidedPlaceholderViewModel'
import type { DiscGuidedSlotId } from '../../guidedPresets/discGuidedSlots'
import type { DiscGuidedWorkflowState } from '../../guidedPresets/discGuidedWorkflow'

export type DiscPreviewProps = {
  discPreviewRef: RefObject<HTMLDivElement | null>
  selectedDiscTemplateId: SelectedDiscTemplateId
  statusToasts: PreviewToast[]
  background: {
    imageUrl: string | null
    imageSize: BackgroundImageSize | null
    previewSize: BackgroundPreviewSize
    offset: BackgroundOffset
    scale: number
  }
  steamBanner: {
    logoPlacement: SteamLogoPlacement
    colors: SteamBannerColors
    lockupImageUrl: string | null
    lockupImageSize: BackgroundImageSize | null
    lockupLayout: SteamBannerLockupLayout
    useTextFallback: boolean
    fallbackText: string
  }
  artwork: {
    logoAssets: ProjectLogoAssets
    titleArtwork: ProjectTitleArtwork
    additionalArtwork: ProjectAdditionalArtwork
  }
  metadata: ProjectMetadata
  marks: {
    ratingBadge: ProjectRatingBadge
    mediaMark: ProjectMediaMark
    platformMarks: ProjectPlatformMarks
    technicalMarks: ProjectTechnicalMarks
  }
  discText: {
    settings: DiscTextSettings
    values: DiscTextValues
    valueSources: DiscTextValueSources
    htmlSources: DiscTextHtmlSources
    styles: DiscTextStyleSettings
    manualGameTitle: string
    layout: DiscTextLayoutSettings
    discNumberArtwork: ProjectDiscNumberArtwork
    selectedDiscTemplate: DiscTemplate
    selectedKey: DiscTextKey | null
    getPreviewTransform: (key: DiscTextKey, layout: DiscTextLayout) => string
    onSelectedKeyChange: (key: DiscTextKey | null) => void
    onTextEnabledChange: (key: DiscTextKey, enabled: boolean) => void
    onTextValueChange: (
      key: DiscTextKey,
      value: string,
      options?: { sourceMode?: boolean },
    ) => void
    onTextContentModeChange: (
      key: DiscTextKey,
      contentMode: TextContentMode,
    ) => void
    onUseMetadataTextValue: (key: MetadataBoundDiscTextKey) => void
    onTextEditComplete: (key: DiscTextKey) => void
    onTextStyleChange: (
      key: DiscTextKey,
      field: DiscTextStyleField,
      value: DiscTextStyleValue,
    ) => void
    onTextRichTextCommand: (
      key: DiscTextKey,
      command:
        | 'bold'
        | 'italic'
        | 'underline'
        | 'color'
        | 'bulletedList'
        | 'fontFamily'
        | 'fontSizePt',
      selection: { end: number; start: number } | undefined,
      value: boolean | number | string,
    ) => { end: number; start: number } | void
    onTextRichTextKeyboardCommand: (
      key: DiscTextKey,
      command: 'enter' | 'shiftEnter' | 'backspace',
      selection: { end: number; start: number },
    ) => { end: number; start: number } | null | void
    getTextRichTextCommandState: (
      key: DiscTextKey,
      command:
        | 'bold'
        | 'italic'
        | 'underline'
        | 'color'
        | 'bulletedList'
        | 'fontFamily'
        | 'fontSizePt',
      selection: { end: number; start: number },
    ) => 'active' | 'inactive' | 'mixed' | {
      state: 'active' | 'inactive' | 'mixed'
      value?: number | string
    }
    onApplyTextStylePreset: (key: DiscTextKey, presetId: string) => void
    onResetTextStyle: (key: DiscTextKey) => void
    onTextLayoutChange: (
      key: DiscTextKey,
      field: DiscTextLayoutNumericField,
      value: number,
    ) => void
    onTextAlignmentChange: (
      key: DiscTextKey,
      alignment: DiscTextAlignment,
    ) => void
    onTextArcSideChange: (
      key: DiscTextKey,
      arcSide: DiscTextArcSide,
    ) => void
    onTextVisualAvoidanceChange: (
      key: DiscTextKey,
      avoidVisualElements: boolean,
    ) => void
    onResetTextLayout: (key: DiscTextKey) => void
  }
  pointerHandlers: {
    background: {
      handleBackgroundPointerDown: (event: PointerEvent<HTMLDivElement>) => void
      handleBackgroundPointerMove: (event: PointerEvent<HTMLDivElement>) => void
      handleBackgroundPointerUp: (event: PointerEvent<HTMLDivElement>) => void
    }
    ratingBadge: {
      handleRatingBadgePointerDown: (
        event: PointerEvent<Element>,
        badgeKey?: RatingBadgeElementKey,
      ) => void
      handleRatingBadgePointerMove: (event: PointerEvent<Element>) => void
      handleRatingBadgePointerUp: (event: PointerEvent<Element>) => void
    }
    mediaMark: {
      handleMediaMarkPointerDown: (event: PointerEvent<Element>) => void
      handleMediaMarkPointerMove: (event: PointerEvent<Element>) => void
      handleMediaMarkPointerUp: (event: PointerEvent<Element>) => void
    }
    platformMarks: {
      handlePlatformMarkPointerDown: (
        event: PointerEvent<Element>,
        value: PlatformMarkValue,
      ) => void
      handlePlatformMarkPointerMove: (event: PointerEvent<Element>) => void
      handlePlatformMarkPointerUp: (event: PointerEvent<Element>) => void
    }
    technicalMarks: {
      handleTechnicalMarkPointerDown: (
        event: PointerEvent<Element>,
        value: TechnicalMarkValue,
        assetId?: string | null,
      ) => void
      handleTechnicalMarkPointerMove: (event: PointerEvent<Element>) => void
      handleTechnicalMarkPointerUp: (event: PointerEvent<Element>) => void
    }
    logoAssets: {
      handleLogoAssetPointerDown: (
        event: PointerEvent<Element>,
        logoKey: LogoAssetKey,
        additionalLogoId?: string,
      ) => void
      handleLogoAssetPointerMove: (event: PointerEvent<Element>) => void
      handleLogoAssetPointerUp: (event: PointerEvent<Element>) => void
    }
    titleArtwork: {
      handleTitleArtworkPointerDown: (event: PointerEvent<Element>) => void
      handleTitleArtworkPointerMove: (event: PointerEvent<Element>) => void
      handleTitleArtworkPointerUp: (event: PointerEvent<Element>) => void
    }
    additionalArtwork: {
      handleAdditionalArtworkPointerDown: (
        event: PointerEvent<Element>,
        elementId: string,
      ) => void
      handleAdditionalArtworkPointerMove: (event: PointerEvent<Element>) => void
      handleAdditionalArtworkPointerUp: (event: PointerEvent<Element>) => void
    }
    discText: {
      handleDiscTextPointerDown: (event: PointerEvent<Element>, key: DiscTextKey) => void
      handleDiscTextMoveHandlePointerDown: (
        event: PointerEvent<Element>,
        key: DiscTextKey,
      ) => void
      handleDiscTextPointerMove: (event: PointerEvent<Element>) => void
      handleDiscTextPointerUp: (event: PointerEvent<Element>) => void
    }
  }
  guideOverlay: {
    innerPrintableBoundaryPercent: number
    printableInsetPercent: number
    safeInsetPercent: number
    physicalCenterHolePercent: number
  }
  editorAffordances?: {
    guidedPlaceholders: readonly DiscGuidedPlaceholderViewModel[]
    guidedWorkflow: DiscGuidedWorkflowState
    onOmitGuidedSlot: (slotId: DiscGuidedSlotId) => void
  }
}

type PreviewLayerMap = Record<DiscEditorPreviewLayerId, ReactNode>

export function DiscPreview({
  discPreviewRef,
  selectedDiscTemplateId,
  statusToasts,
  background,
  steamBanner,
  artwork,
  metadata,
  marks,
  discText,
  pointerHandlers,
  guideOverlay,
  editorAffordances,
}: DiscPreviewProps) {
  const [isDesignCheckOpen, setIsDesignCheckOpen] = useState(false)
  const [isGuideLegendOpen, setIsGuideLegendOpen] = useState(false)
  const { guideLegendClosedSize, previewAreaRef } =
    usePreviewGuideLegendPlacement({
      closedButtonCount: 2,
      isOpen: isDesignCheckOpen || isGuideLegendOpen,
      previewRef: discPreviewRef,
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
  const metadataBoundDiscTextValues = useMemo(
    () => resolveMetadataBoundDiscTextValues(
      discText.values,
      metadata,
      discText.valueSources,
    ),
    [discText.valueSources, discText.values, metadata],
  )
  const discTextOccupiedRegions = useMemo(
    () => createDiscTextOccupiedRegions({
      projectTitleArtwork: artwork.titleArtwork,
      projectLogoAssets: artwork.logoAssets,
      projectAdditionalArtwork: artwork.additionalArtwork,
      projectMetadata: metadata,
      projectRatingBadge: marks.ratingBadge,
      projectMediaMark: marks.mediaMark,
      projectPlatformMarks: marks.platformMarks,
      projectTechnicalMarks: marks.technicalMarks,
      projectDiscNumberArtwork: discText.discNumberArtwork,
      discTextSettings: discText.settings,
      discTextValues: metadataBoundDiscTextValues,
      discTextHtmlSources: discText.htmlSources,
      discTextLayout: discText.layout,
      discTextStyles: discText.styles,
      discTextTitle: discText.manualGameTitle,
      measureText: measureDiscTextWithBrowserCanvas,
      selectedDiscTemplate: discText.selectedDiscTemplate,
    }),
    [
      artwork.additionalArtwork,
      artwork.logoAssets,
      artwork.titleArtwork,
      discText.discNumberArtwork,
      discText.layout,
      discText.htmlSources,
      discText.manualGameTitle,
      discText.selectedDiscTemplate,
      discText.settings,
      discText.styles,
      marks.mediaMark,
      marks.platformMarks,
      marks.ratingBadge,
      marks.technicalMarks,
      metadata,
      metadataBoundDiscTextValues,
    ],
  )
  const designCheckSummary = useMemo(
    () => buildDiscDesignCheckSummary({
      selectedDiscTemplateId,
      selectedDiscTemplate: discText.selectedDiscTemplate,
      backgroundImageUrl: background.imageUrl,
      backgroundImageSize: background.imageSize,
      backgroundScale: background.scale,
      steamLogoPlacement: steamBanner.logoPlacement,
      projectLogoAssets: artwork.logoAssets,
      projectTitleArtwork: artwork.titleArtwork,
      projectAdditionalArtwork: artwork.additionalArtwork,
      projectDiscNumberArtwork: discText.discNumberArtwork,
      projectMetadata: metadata,
      projectRatingBadge: marks.ratingBadge,
      projectMediaMark: marks.mediaMark,
      projectPlatformMarks: marks.platformMarks,
      projectTechnicalMarks: marks.technicalMarks,
      discTextSettings: discText.settings,
      discTextValues: metadataBoundDiscTextValues,
      discTextLayout: discText.layout,
      discTextStyles: discText.styles,
      manualGameTitle: discText.manualGameTitle,
    }),
    [
      artwork.additionalArtwork,
      artwork.logoAssets,
      artwork.titleArtwork,
      background.imageSize,
      background.imageUrl,
      background.scale,
      discText.discNumberArtwork,
      discText.layout,
      discText.manualGameTitle,
      discText.selectedDiscTemplate,
      discText.settings,
      discText.styles,
      marks.mediaMark,
      marks.platformMarks,
      marks.ratingBadge,
      marks.technicalMarks,
      metadata,
      metadataBoundDiscTextValues,
      selectedDiscTemplateId,
      steamBanner.logoPlacement,
    ],
  )
  const previewLayers: PreviewLayerMap = {
    'background-artwork': (
      <BackgroundLayer
        backgroundImageUrl={background.imageUrl}
        backgroundImageSize={background.imageSize}
        backgroundPreviewSize={background.previewSize}
        backgroundOffset={background.offset}
        backgroundScale={background.scale}
        {...pointerHandlers.background}
      />
    ),
    'steam-banner': (
      <SteamBannerPreview
        steamLogoPlacement={steamBanner.logoPlacement}
        steamBannerColors={steamBanner.colors}
        steamBannerLockupImageUrl={steamBanner.lockupImageUrl}
        steamBannerLockupImageSize={steamBanner.lockupImageSize}
        steamBannerLockupLayout={steamBanner.lockupLayout}
        steamBannerUseTextFallback={steamBanner.useTextFallback}
        steamBannerFallbackText={steamBanner.fallbackText}
      />
    ),
    'additional-artwork': (
      <AdditionalArtworkLayer
        projectAdditionalArtwork={artwork.additionalArtwork}
        {...pointerHandlers.additionalArtwork}
      />
    ),
    'title-artwork': (
      <TitleArtworkLayer
        projectTitleArtwork={artwork.titleArtwork}
        {...pointerHandlers.titleArtwork}
      />
    ),
    'logo-assets': (
      <LogoAssetLayer
        projectLogoAssets={artwork.logoAssets}
        {...pointerHandlers.logoAssets}
      />
    ),
    'rating-badge': (
      <RatingBadgeLayer
        projectMetadata={metadata}
        projectRatingBadge={marks.ratingBadge}
        {...pointerHandlers.ratingBadge}
      />
    ),
    'media-mark': (
      <MediaMarkLayer
        projectMediaMark={marks.mediaMark}
        {...pointerHandlers.mediaMark}
      />
    ),
    'platform-marks': (
      <PlatformMarksLayer
        projectPlatformMarks={marks.platformMarks}
        {...pointerHandlers.platformMarks}
      />
    ),
    'technical-marks': (
      <TechnicalMarksLayer
        projectTechnicalMarks={marks.technicalMarks}
        {...pointerHandlers.technicalMarks}
      />
    ),
    'disc-text': (
      <DiscTextLayer
        discTextSettings={discText.settings}
        discTextValues={discText.values}
        discTextValueSources={discText.valueSources}
        discTextHtmlSources={discText.htmlSources}
        discTextStyles={discText.styles}
        projectDiscNumberArtwork={discText.discNumberArtwork}
        projectMetadata={metadata}
        manualGameTitle={discText.manualGameTitle}
        discTextLayout={discText.layout}
        steamLogoPlacement={steamBanner.logoPlacement}
        selectedDiscTemplate={discText.selectedDiscTemplate}
        avoidanceRegions={discTextOccupiedRegions}
        getDiscTextPreviewTransform={discText.getPreviewTransform}
        selectedDiscTextKey={discText.selectedKey}
        onSelectedDiscTextKeyChange={discText.onSelectedKeyChange}
        onDiscTextEnabledChange={discText.onTextEnabledChange}
        onDiscTextValueChange={discText.onTextValueChange}
        onDiscTextContentModeChange={discText.onTextContentModeChange}
        onUseMetadataDiscTextValue={discText.onUseMetadataTextValue}
        onDiscTextEditComplete={discText.onTextEditComplete}
        onDiscTextStyleChange={discText.onTextStyleChange}
        onDiscTextRichTextCommand={discText.onTextRichTextCommand}
        onDiscTextRichTextKeyboardCommand={
          discText.onTextRichTextKeyboardCommand
        }
        getDiscTextRichTextCommandState={discText.getTextRichTextCommandState}
        onApplyDiscTextStylePreset={discText.onApplyTextStylePreset}
        onResetDiscTextStyle={discText.onResetTextStyle}
        onDiscTextLayoutChange={discText.onTextLayoutChange}
        onDiscTextAlignmentChange={discText.onTextAlignmentChange}
        onDiscTextArcSideChange={discText.onTextArcSideChange}
        onDiscTextVisualAvoidanceChange={discText.onTextVisualAvoidanceChange}
        onResetDiscTextLayout={discText.onResetTextLayout}
        {...pointerHandlers.discText}
      />
    ),
    'editor-guide-overlay': (
      <DiscGuideOverlay
        innerPrintableBoundaryPercent={guideOverlay.innerPrintableBoundaryPercent}
        printableInsetPercent={guideOverlay.printableInsetPercent}
        safeInsetPercent={guideOverlay.safeInsetPercent}
        physicalCenterHolePercent={guideOverlay.physicalCenterHolePercent}
      />
    ),
  }

  return (
    <ContextualTextRibbonProvider>
      <section
        ref={previewAreaRef}
        className={[
          'preview-area',
          discText.selectedKey ? 'has-contextual-text-ribbon-active' : '',
        ].filter(Boolean).join(' ')}
        aria-labelledby="disc-preview-title"
      >
        <PreviewHeader
          contextualTextRibbonActive={Boolean(discText.selectedKey)}
          title="Disc Preview"
          titleId="disc-preview-title"
        />

        <PreviewToastStack statusToasts={statusToasts} />

        <div className="preview-workspace">
          <PreviewViewport label="disc preview">
            <div
              ref={discPreviewRef}
              className="disc-preview"
              data-smoke-id="disc-preview"
              aria-label="Blank standard printable disc preview"
              tabIndex={-1}
            >
              {DISC_EDITOR_PREVIEW_LAYER_ORDER.map((layerId) => (
                <Fragment key={layerId}>{previewLayers[layerId]}</Fragment>
              ))}
              {editorAffordances ? (
                <DiscGuidedPlaceholderOverlay
                  placeholders={editorAffordances.guidedPlaceholders}
                  physicalCenterHolePercent={guideOverlay.physicalCenterHolePercent}
                />
              ) : null}
              {editorAffordances ? (
                <DiscGuidedPlaceholderActions
                  placeholders={editorAffordances.guidedPlaceholders}
                  workflowRevision={editorAffordances.guidedWorkflow}
                  onOmitSlot={editorAffordances.onOmitGuidedSlot}
                  fallbackFocusRef={discPreviewRef}
                />
              ) : null}
              <PreviewElementOverlay previewRef={discPreviewRef} />
            </div>
          </PreviewViewport>

          <PreviewDesignCheckPanel
            closedOffset={guideLegendClosedSize + 4}
            closedSize={guideLegendClosedSize}
            isOpen={isDesignCheckOpen}
            label="Disc design check"
            onOpenChange={handleDesignCheckOpenChange}
            summary={designCheckSummary}
          />

          <DiscGuideLegendPreviewPanel
            closedSize={guideLegendClosedSize}
            isOpen={isGuideLegendOpen}
            onOpenChange={handleGuideLegendOpenChange}
          />
        </div>
      </section>
    </ContextualTextRibbonProvider>
  )
}
