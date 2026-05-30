import type {
  DiscTextLayoutSettings,
  DiscTextSettings,
  DiscTextValues,
  SteamLogoPlacement,
} from '../discText'
import type { DiscTextAvoidanceRegion } from '../discTextAvoidance'
import {
  getDiscTextFontFamilyCanvas,
  type DiscTextStyleSettings,
} from '../discTextStyles'
import {
  createDiscNumberBadgeRenderModel,
  getEffectiveDiscTextSettingsForDiscNumberArtwork,
} from '../discNumberArtwork'
import type { ProjectDiscNumberArtwork } from '../project/projectTypes'
import {
  buildDiscTextSvgLayer,
  measureDiscTextWithBrowserCanvas,
} from '../discTextSvgLayer'
import { createSvgDataUrl } from '../svgUtils'
import { loadImage } from './canvasImage'

export async function drawDiscTextElements(
  context: CanvasRenderingContext2D,
  discContentSize: number,
  discOrigin: number,
  settings: DiscTextSettings,
  values: DiscTextValues,
  styles: DiscTextStyleSettings,
  projectDiscNumberArtwork: ProjectDiscNumberArtwork,
  layoutSettings: DiscTextLayoutSettings,
  title: string,
  placement: SteamLogoPlacement,
  safeZoneRadius: number,
  avoidanceRegions: DiscTextAvoidanceRegion[] = [],
) {
  const safeZoneRadiusPercent = (safeZoneRadius / discContentSize) * 100
  const discNumberBadge = createDiscNumberBadgeRenderModel(
    projectDiscNumberArtwork,
    settings,
    values,
    layoutSettings,
  )
  const effectiveSettings = getEffectiveDiscTextSettingsForDiscNumberArtwork(
    settings,
    projectDiscNumberArtwork,
  )

  if (discNumberBadge) {
    const badgeImage = await loadImage(discNumberBadge.imageDataUrl)
    const drawWidth = discContentSize * (discNumberBadge.widthPercent / 100) * discNumberBadge.layout.scale
    const drawHeight = discContentSize * (discNumberBadge.heightPercent / 100) * discNumberBadge.layout.scale
    const centerX = discOrigin + discContentSize * (discNumberBadge.layout.x / 100)
    const centerY = discOrigin + discContentSize * (discNumberBadge.layout.y / 100)

    context.drawImage(
      badgeImage,
      centerX - drawWidth / 2,
      centerY - drawHeight / 2,
      drawWidth,
      drawHeight,
    )

    const textStyle = styles.discNumber
    const maxTextWidth = drawWidth * 0.78
    let fontSize = drawHeight * 0.26
    const fontFamily = getDiscTextFontFamilyCanvas(textStyle.fontFamily)

    context.save()
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillStyle = textStyle.color
    context.strokeStyle = 'rgba(0, 0, 0, 0.78)'
    context.lineJoin = 'round'

    for (let attempt = 0; attempt < 8; attempt += 1) {
      context.font = `900 ${fontSize}px ${fontFamily}`
      if (context.measureText(discNumberBadge.text).width <= maxTextWidth) {
        break
      }
      fontSize *= 0.88
    }

    context.lineWidth = Math.max(2, fontSize * 0.12)
    context.strokeText(discNumberBadge.text.toUpperCase(), centerX, centerY)
    context.fillText(discNumberBadge.text.toUpperCase(), centerX, centerY)
    context.restore()
  }

  const svg = buildDiscTextSvgLayer({
    settings: effectiveSettings,
    values,
    styles,
    layoutSettings,
    title,
    placement,
    safeZoneRadiusPercent,
    measureText: measureDiscTextWithBrowserCanvas,
    avoidanceRegions,
    width: discContentSize,
    height: discContentSize,
    idPrefix: 'disc-text-export',
  })
  const textLayerImage = await loadImage(createSvgDataUrl(svg))

  context.drawImage(textLayerImage, discOrigin, discOrigin, discContentSize, discContentSize)
}
