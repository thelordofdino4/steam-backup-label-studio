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
  buildDiscTextSvgLayer,
  measureDiscTextWithBrowserCanvas,
} from '../../discTextSvgLayer'
import { resolveMetadataBoundDiscTextValues } from '../../project/metadataDiscText'
import type { ProjectMetadata } from '../../project/projectTypes'
import type { DiscTemplate } from '../../types/template'
import { createSvgDataUrl } from '../../svgUtils'

export type DiscTextLayerProps = {
  discTextSettings: DiscTextSettings
  discTextValues: DiscTextValues
  projectMetadata: ProjectMetadata
  manualGameTitle: string
  discTextLayout: DiscTextLayoutSettings
  steamLogoPlacement: SteamLogoPlacement
  selectedDiscTemplate: DiscTemplate
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
  projectMetadata,
  manualGameTitle,
  discTextLayout,
  steamLogoPlacement,
  selectedDiscTemplate,
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
      )

      return buildDiscTextSvgLayer({
        settings: discTextSettings,
        values: metadataBoundDiscTextValues,
        layoutSettings: discTextLayout,
        title: manualGameTitle,
        placement: steamLogoPlacement,
        safeZoneRadiusPercent,
        measureText: measureDiscTextWithBrowserCanvas,
        width: 100,
        height: 100,
        idPrefix: 'disc-text-preview-image',
      })
    },
    [
      discTextSettings,
      discTextValues,
      discTextLayout,
      manualGameTitle,
      projectMetadata,
      steamLogoPlacement,
      safeZoneRadiusPercent,
    ],
  )
  const hitTargetTextLayerSvg = useMemo(
    () => {
      const metadataBoundDiscTextValues = resolveMetadataBoundDiscTextValues(
        discTextValues,
        projectMetadata,
      )

      return buildDiscTextSvgLayer({
        settings: discTextSettings,
        values: metadataBoundDiscTextValues,
        layoutSettings: discTextLayout,
        title: manualGameTitle,
        placement: steamLogoPlacement,
        safeZoneRadiusPercent,
        measureText: measureDiscTextWithBrowserCanvas,
        width: '100%',
        height: '100%',
        idPrefix: 'disc-text-preview-hit-target',
      })
    },
    [
      discTextSettings,
      discTextValues,
      discTextLayout,
      manualGameTitle,
      projectMetadata,
      steamLogoPlacement,
      safeZoneRadiusPercent,
    ],
  )
  const visibleTextLayerDataUrl = useMemo(
    () => createSvgDataUrl(visibleTextLayerSvg),
    [visibleTextLayerSvg],
  )

  function handlePointerDown(event: PointerEvent<Element>) {
    const key = getDiscTextKeyFromEventTarget(event.target)
    if (!key) return

    handleDiscTextPointerDown(event, key)
  }

  return (
    <div className="disc-text-layer" aria-label="Disc text elements">
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
