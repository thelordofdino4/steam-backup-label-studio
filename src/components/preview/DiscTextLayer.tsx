import { useMemo, type PointerEvent } from 'react'
import {
  DISC_TEXT_KEYS,
  isCurvedCopyrightDiscTextLayout,
  type DiscTextAlignment,
  type DiscTextKey,
  type DiscTextLayout,
  type DiscTextLayoutNumericField,
  type DiscTextLayoutSettings,
  type DiscTextHtmlSources,
  type DiscTextSettings,
  type DiscTextValues,
  type SteamLogoPlacement,
} from '../../discText/index'
import {
  getDiscTextFontFamilyCss,
  type DiscTextStyleField,
  type DiscTextStyleSettings,
  type DiscTextStyleValue,
} from '../../discText/styles'
import {
  createDiscNumberBadgeRenderModel,
  getEffectiveDiscTextSettingsForDiscNumberArtwork,
} from '../../discText/discNumberArtwork'
import {
  buildDiscTextSvgLayer,
  measureDiscTextWithBrowserCanvas,
} from '../../discText/svgLayer'
import type { TextContentMode } from '../../text/htmlText'
import type { DiscTextAvoidanceRegion } from '../../discText/avoidance'
import { resolveMetadataBoundDiscTextValues, type DiscTextValueSources } from '../../project/metadataDiscText'
import type { ProjectDiscNumberArtwork, ProjectMetadata } from '../../project/projectTypes'
import type { DiscTemplate } from '../../types/template'
import { createSvgDataUrl } from '../../utils/svg'
import {
  createDiscTextPreviewEditableElementId,
  createPreviewEditableAttributes,
  DISC_TEXT_KEY_ATTRIBUTE,
} from '../../editor/previewElementOverlay'
import { ContentBoundedImage } from './ContentBoundedImage'
import { DiscInlineTextEditorLayer } from './DiscInlineTextEditorLayer'

export type DiscTextLayerProps = {
  discTextSettings: DiscTextSettings
  discTextValues: DiscTextValues
  discTextValueSources: DiscTextValueSources
  discTextHtmlSources: DiscTextHtmlSources
  discTextStyles: DiscTextStyleSettings
  projectDiscNumberArtwork: ProjectDiscNumberArtwork
  projectMetadata: ProjectMetadata
  manualGameTitle: string
  discTextLayout: DiscTextLayoutSettings
  steamLogoPlacement: SteamLogoPlacement
  selectedDiscTemplate: DiscTemplate
  avoidanceRegions: DiscTextAvoidanceRegion[]
  getDiscTextPreviewTransform: (key: DiscTextKey, layout: DiscTextLayout) => string
  selectedDiscTextKey: DiscTextKey | null
  onSelectedDiscTextKeyChange: (key: DiscTextKey | null) => void
  onDiscTextEnabledChange: (key: DiscTextKey, enabled: boolean) => void
  onDiscTextValueChange: (key: DiscTextKey, value: string) => void
  onDiscTextContentModeChange: (key: DiscTextKey, contentMode: TextContentMode) => void
  onDiscTextEditComplete: (key: DiscTextKey) => void
  onDiscTextStyleChange: (
    key: DiscTextKey,
    field: DiscTextStyleField,
    value: DiscTextStyleValue,
  ) => void
  onDiscTextRichTextCommand: (
    key: DiscTextKey,
    command: 'bold' | 'italic' | 'underline' | 'color' | 'bulletedList',
    selection: { end: number; start: number } | undefined,
    value: boolean | string,
  ) => { end: number; start: number } | void
  getDiscTextRichTextCommandState: (
    key: DiscTextKey,
    command: 'bold' | 'italic' | 'underline' | 'color' | 'bulletedList',
    selection: { end: number; start: number },
  ) => 'active' | 'inactive' | 'mixed' | {
    state: 'active' | 'inactive' | 'mixed'
    value?: string
  }
  onApplyDiscTextStylePreset: (key: DiscTextKey, presetId: string) => void
  onResetDiscTextStyle: (key: DiscTextKey) => void
  onDiscTextLayoutChange: (
    key: DiscTextKey,
    field: DiscTextLayoutNumericField,
    value: number,
  ) => void
  onDiscTextAlignmentChange: (
    key: DiscTextKey,
    alignment: DiscTextAlignment,
  ) => void
  onDiscTextVisualAvoidanceChange: (
    key: DiscTextKey,
    avoidVisualElements: boolean,
  ) => void
  onResetDiscTextLayout: (key: DiscTextKey) => void
  handleDiscTextPointerDown: (event: PointerEvent<Element>, key: DiscTextKey) => void
  handleDiscTextPointerMove: (event: PointerEvent<Element>) => void
  handleDiscTextPointerUp: (event: PointerEvent<Element>) => void
}

function getDiscTextKeyFromEventTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return null

  const textElement = target.closest(`[${DISC_TEXT_KEY_ATTRIBUTE}]`)
  const key = textElement?.getAttribute(DISC_TEXT_KEY_ATTRIBUTE)

  if (key && DISC_TEXT_KEYS.includes(key as DiscTextKey)) {
    return key as DiscTextKey
  }

  return null
}

export function DiscTextLayer({
  discTextSettings,
  discTextValues,
  discTextValueSources,
  discTextHtmlSources,
  discTextStyles,
  projectDiscNumberArtwork,
  projectMetadata,
  manualGameTitle,
  discTextLayout,
  steamLogoPlacement,
  selectedDiscTemplate,
  avoidanceRegions,
  selectedDiscTextKey,
  onSelectedDiscTextKeyChange,
  onDiscTextEnabledChange,
  onDiscTextValueChange,
  onDiscTextContentModeChange,
  onDiscTextEditComplete,
  onDiscTextStyleChange,
  onDiscTextRichTextCommand,
  getDiscTextRichTextCommandState,
  onApplyDiscTextStylePreset,
  onResetDiscTextStyle,
  onDiscTextLayoutChange,
  onDiscTextAlignmentChange,
  onDiscTextVisualAvoidanceChange,
  onResetDiscTextLayout,
  handleDiscTextPointerDown,
  handleDiscTextPointerMove,
  handleDiscTextPointerUp,
}: DiscTextLayerProps) {
  const safeZoneRadiusPercent =
    (selectedDiscTemplate.safeDiameterMm / selectedDiscTemplate.outerDiameterMm) * 50
  const metadataBoundDiscTextValues = useMemo(
    () => resolveMetadataBoundDiscTextValues(
      discTextValues,
      projectMetadata,
      discTextValueSources,
    ),
    [discTextValueSources, discTextValues, projectMetadata],
  )
  const effectiveSettings = useMemo(
    () => getEffectiveDiscTextSettingsForDiscNumberArtwork(
      discTextSettings,
      projectDiscNumberArtwork,
    ),
    [discTextSettings, projectDiscNumberArtwork],
  )
  const visibleTextLayerSvg = useMemo(
    () => {
      return buildDiscTextSvgLayer({
        settings: effectiveSettings,
        values: metadataBoundDiscTextValues,
        htmlSources: discTextHtmlSources,
        styles: discTextStyles,
        layoutSettings: discTextLayout,
        title: manualGameTitle,
        placement: steamLogoPlacement,
        safeZoneRadiusPercent,
        measureText: measureDiscTextWithBrowserCanvas,
        avoidanceRegions,
        width: 100,
        height: 100,
        idPrefix: 'disc-text-preview-image',
      })
    },
    [
      discTextHtmlSources,
      discTextStyles,
      discTextLayout,
      effectiveSettings,
      manualGameTitle,
      metadataBoundDiscTextValues,
      steamLogoPlacement,
      safeZoneRadiusPercent,
      avoidanceRegions,
    ],
  )
  const hitTargetTextLayerSvg = useMemo(
    () => {
      return buildDiscTextSvgLayer({
        settings: effectiveSettings,
        values: metadataBoundDiscTextValues,
        htmlSources: discTextHtmlSources,
        styles: discTextStyles,
        layoutSettings: discTextLayout,
        title: manualGameTitle,
        placement: steamLogoPlacement,
        safeZoneRadiusPercent,
        measureText: measureDiscTextWithBrowserCanvas,
        avoidanceRegions,
        width: '100%',
        height: '100%',
        idPrefix: 'disc-text-preview-hit-target',
      })
    },
    [
      discTextHtmlSources,
      discTextStyles,
      discTextLayout,
      effectiveSettings,
      manualGameTitle,
      metadataBoundDiscTextValues,
      steamLogoPlacement,
      safeZoneRadiusPercent,
      avoidanceRegions,
    ],
  )
  const visibleTextLayerDataUrl = useMemo(
    () => createSvgDataUrl(visibleTextLayerSvg),
    [visibleTextLayerSvg],
  )
  const discNumberBadgeRenderModel = useMemo(() => {
    return createDiscNumberBadgeRenderModel(
      projectDiscNumberArtwork,
      discTextSettings,
      metadataBoundDiscTextValues,
      discTextLayout,
    )
  }, [
    discTextSettings,
    discTextLayout,
    metadataBoundDiscTextValues,
    projectDiscNumberArtwork,
  ])

  function handlePointerDown(event: PointerEvent<Element>) {
    const key = getDiscTextKeyFromEventTarget(event.target)
    if (!key) return

    if (!isCurvedCopyrightDiscTextLayout(key, discTextLayout[key])) {
      event.preventDefault()
      event.stopPropagation()
      onSelectedDiscTextKeyChange(key)
      return
    }

    handleDiscTextPointerDown(event, key)
  }

  return (
    <div className="disc-text-layer" aria-label="Disc text elements">
      {discNumberBadgeRenderModel ? (
        <div
          className="disc-number-badge-layer"
          aria-label={`${discNumberBadgeRenderModel.text} disc number badge`}
          {...createPreviewEditableAttributes({
            id: createDiscTextPreviewEditableElementId('discNumber'),
            label: 'Disc number badge',
            kind: 'text',
          })}
          onPointerDown={(event) => handleDiscTextPointerDown(event, 'discNumber')}
          onPointerMove={handleDiscTextPointerMove}
          onPointerUp={handleDiscTextPointerUp}
          onPointerCancel={handleDiscTextPointerUp}
          style={{
            left: `${discNumberBadgeRenderModel.layout.x}%`,
            top: `${discNumberBadgeRenderModel.layout.y}%`,
            width: `${discNumberBadgeRenderModel.widthPercent}%`,
            height: `${discNumberBadgeRenderModel.heightPercent}%`,
            transform: `translate(-50%, -50%) scale(${discNumberBadgeRenderModel.layout.scale})`,
            color: discTextStyles.discNumber.color,
            fontFamily: getDiscTextFontFamilyCss(discTextStyles.discNumber.fontFamily),
          }}
        >
          <ContentBoundedImage
            className="disc-number-badge-image"
            imageSize={discNumberBadgeRenderModel.imageSize}
            src={discNumberBadgeRenderModel.imageDataUrl}
            alt=""
            draggable={false}
          />
          <span className="disc-number-badge-text">{discNumberBadgeRenderModel.text}</span>
        </div>
      ) : null}
      <img
        className="disc-text-layer-image"
        src={visibleTextLayerDataUrl}
        alt=""
        draggable={false}
      />
      <div
        className="disc-text-layer-hit-target"
        aria-hidden="true"
        onPointerDown={handlePointerDown}
        onPointerMove={handleDiscTextPointerMove}
        onPointerUp={handleDiscTextPointerUp}
        onPointerCancel={handleDiscTextPointerUp}
        dangerouslySetInnerHTML={{ __html: hitTargetTextLayerSvg }}
      />
      <DiscInlineTextEditorLayer
        discTextSettings={effectiveSettings}
        discTextValues={metadataBoundDiscTextValues}
        discTextHtmlSources={discTextHtmlSources}
        discTextStyles={discTextStyles}
        discTextLayout={discTextLayout}
        title={manualGameTitle}
        selectedDiscTextKey={selectedDiscTextKey}
        avoidanceRegions={avoidanceRegions}
        measureText={measureDiscTextWithBrowserCanvas}
        onSelectedDiscTextKeyChange={onSelectedDiscTextKeyChange}
        onDiscTextEnabledChange={onDiscTextEnabledChange}
        onDiscTextValueChange={onDiscTextValueChange}
        onDiscTextContentModeChange={onDiscTextContentModeChange}
        onDiscTextEditComplete={onDiscTextEditComplete}
        onDiscTextStyleChange={onDiscTextStyleChange}
        onDiscTextRichTextCommand={onDiscTextRichTextCommand}
        getDiscTextRichTextCommandState={getDiscTextRichTextCommandState}
        onApplyDiscTextStylePreset={onApplyDiscTextStylePreset}
        onResetDiscTextStyle={onResetDiscTextStyle}
        onDiscTextLayoutChange={onDiscTextLayoutChange}
        onDiscTextAlignmentChange={onDiscTextAlignmentChange}
        onDiscTextVisualAvoidanceChange={onDiscTextVisualAvoidanceChange}
        onResetDiscTextLayout={onResetDiscTextLayout}
        onMoveHandlePointerDown={handleDiscTextPointerDown}
        onMoveHandlePointerMove={handleDiscTextPointerMove}
        onMoveHandlePointerUp={handleDiscTextPointerUp}
      />
    </div>
  )
}
