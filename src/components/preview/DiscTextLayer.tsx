import { useMemo, type PointerEvent } from 'react'
import {
  DISC_TEXT_KEYS,
  type DiscTextKey,
  type DiscTextLayout,
  type DiscTextLayoutSettings,
  type DiscTextSettings,
  type DiscTextValues,
  type SteamLogoPlacement,
} from '../../discText'
import {
  getDiscTextFontFamilyCss,
  type DiscTextStyleSettings,
} from '../../discTextStyles'
import {
  createDiscNumberBadgeRenderModel,
  getEffectiveDiscTextSettingsForDiscNumberArtwork,
} from '../../discNumberArtwork'
import {
  buildDiscTextSvgLayer,
  measureDiscTextWithBrowserCanvas,
} from '../../discTextSvgLayer'
import type { DiscTextAvoidanceRegion } from '../../discTextAvoidance'
import { resolveMetadataBoundDiscTextValues, type DiscTextValueSources } from '../../project/metadataDiscText'
import type { ProjectDiscNumberArtwork, ProjectMetadata } from '../../project/projectTypes'
import type { DiscTemplate } from '../../types/template'
import { createSvgDataUrl } from '../../svgUtils'

export type DiscTextLayerProps = {
  discTextSettings: DiscTextSettings
  discTextValues: DiscTextValues
  discTextValueSources: DiscTextValueSources
  discTextStyles: DiscTextStyleSettings
  projectDiscNumberArtwork: ProjectDiscNumberArtwork
  projectMetadata: ProjectMetadata
  manualGameTitle: string
  discTextLayout: DiscTextLayoutSettings
  steamLogoPlacement: SteamLogoPlacement
  selectedDiscTemplate: DiscTemplate
  avoidanceRegions: DiscTextAvoidanceRegion[]
  getDiscTextPreviewTransform: (key: DiscTextKey, layout: DiscTextLayout) => string
  handleDiscTextPointerDown: (event: PointerEvent<Element>, key: DiscTextKey) => void
  handleDiscTextPointerMove: (event: PointerEvent<Element>) => void
  handleDiscTextPointerUp: (event: PointerEvent<Element>) => void
}

function getDiscTextKeyFromEventTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return null

  const textElement = target.closest('[data-disc-text-key]')
  const key = textElement?.getAttribute('data-disc-text-key')

  if (key && DISC_TEXT_KEYS.includes(key as DiscTextKey)) {
    return key as DiscTextKey
  }

  return null
}

export function DiscTextLayer({
  discTextSettings,
  discTextValues,
  discTextValueSources,
  discTextStyles,
  projectDiscNumberArtwork,
  projectMetadata,
  manualGameTitle,
  discTextLayout,
  steamLogoPlacement,
  selectedDiscTemplate,
  avoidanceRegions,
  handleDiscTextPointerDown,
  handleDiscTextPointerMove,
  handleDiscTextPointerUp,
}: DiscTextLayerProps) {
  const safeZoneRadiusPercent =
    (selectedDiscTemplate.safeDiameterMm / selectedDiscTemplate.outerDiameterMm) * 50
  const visibleTextLayerSvg = useMemo(
    () => {
      const metadataBoundDiscTextValues = resolveMetadataBoundDiscTextValues(
        discTextValues,
        projectMetadata,
        discTextValueSources,
      )
      const effectiveSettings = getEffectiveDiscTextSettingsForDiscNumberArtwork(
        discTextSettings,
        projectDiscNumberArtwork,
      )

      return buildDiscTextSvgLayer({
        settings: effectiveSettings,
        values: metadataBoundDiscTextValues,
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
      discTextSettings,
      discTextValues,
      discTextValueSources,
      discTextStyles,
      projectDiscNumberArtwork,
      discTextLayout,
      manualGameTitle,
      projectMetadata,
      steamLogoPlacement,
      safeZoneRadiusPercent,
      avoidanceRegions,
    ],
  )
  const hitTargetTextLayerSvg = useMemo(
    () => {
      const metadataBoundDiscTextValues = resolveMetadataBoundDiscTextValues(
        discTextValues,
        projectMetadata,
        discTextValueSources,
      )
      const effectiveSettings = getEffectiveDiscTextSettingsForDiscNumberArtwork(
        discTextSettings,
        projectDiscNumberArtwork,
      )

      return buildDiscTextSvgLayer({
        settings: effectiveSettings,
        values: metadataBoundDiscTextValues,
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
      discTextSettings,
      discTextValues,
      discTextValueSources,
      discTextStyles,
      projectDiscNumberArtwork,
      discTextLayout,
      manualGameTitle,
      projectMetadata,
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
    const metadataBoundDiscTextValues = resolveMetadataBoundDiscTextValues(
      discTextValues,
      projectMetadata,
      discTextValueSources,
    )

    return createDiscNumberBadgeRenderModel(
      projectDiscNumberArtwork,
      discTextSettings,
      metadataBoundDiscTextValues,
      discTextLayout,
    )
  }, [
    discTextSettings,
    discTextValues,
    discTextValueSources,
    discTextLayout,
    projectDiscNumberArtwork,
    projectMetadata,
  ])

  function handlePointerDown(event: PointerEvent<Element>) {
    const key = getDiscTextKeyFromEventTarget(event.target)
    if (!key) return

    handleDiscTextPointerDown(event, key)
  }

  return (
    <div className="disc-text-layer" aria-label="Disc text elements">
      {discNumberBadgeRenderModel ? (
        <div
          className="disc-number-badge-layer"
          aria-label={`${discNumberBadgeRenderModel.text} disc number badge`}
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
          <img
            className="disc-number-badge-image"
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
    </div>
  )
}
