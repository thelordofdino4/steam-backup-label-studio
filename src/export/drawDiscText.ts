import type {
  DiscTextLayoutSettings,
  DiscTextMarkdownSources,
  DiscTextSettings,
  DiscTextValues,
  SteamLogoPlacement,
} from '../discText/index'
import type { DiscTextAvoidanceRegion } from '../discText/avoidance'
import {
  getDiscTextFontFamilyCanvas,
  type DiscTextStyleSettings,
} from '../discText/styles'
import {
  createDiscNumberBadgeRenderModel,
  getEffectiveDiscTextSettingsForDiscNumberArtwork,
} from '../discText/discNumberArtwork'
import type { ProjectDiscNumberArtwork } from '../project/projectTypes'
import {
  buildDiscTextSvgLayer,
  measureDiscTextWithBrowserCanvas,
} from '../discText/svgLayer'
import { createSvgDataUrl } from '../utils/svg'
import { drawImageContent, loadCanvasSafeImage, loadImage } from './canvasImage'

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
  markdownSources: DiscTextMarkdownSources = {},
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
    const badgeImage = await loadCanvasSafeImage(
      discNumberBadge.imageDataUrl,
      discNumberBadge.label,
    )
    const drawWidth = discContentSize * (discNumberBadge.widthPercent / 100) * discNumberBadge.layout.scale
    const drawHeight = discContentSize * (discNumberBadge.heightPercent / 100) * discNumberBadge.layout.scale
    const centerX = discOrigin + discContentSize * (discNumberBadge.layout.x / 100)
    const centerY = discOrigin + discContentSize * (discNumberBadge.layout.y / 100)

    drawImageContent(
      context,
      badgeImage,
      discNumberBadge.imageSize,
      {
        x: centerX - drawWidth / 2,
        y: centerY - drawHeight / 2,
        width: drawWidth,
        height: drawHeight,
      },
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
    markdownSources,
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
  const textLayerImage = await loadImage(createSvgDataUrl(svg), 'disc text layer')

  context.drawImage(textLayerImage, discOrigin, discOrigin, discContentSize, discContentSize)
}
