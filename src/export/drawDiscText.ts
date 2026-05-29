import type {
  DiscTextLayoutSettings,
  DiscTextSettings,
  DiscTextValues,
  SteamLogoPlacement,
} from '../discText'
import type { DiscTextStyleSettings } from '../discTextStyles'
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
  layoutSettings: DiscTextLayoutSettings,
  title: string,
  placement: SteamLogoPlacement,
  safeZoneRadius: number,
) {
  const safeZoneRadiusPercent = (safeZoneRadius / discContentSize) * 100
  const svg = buildDiscTextSvgLayer({
    settings,
    values,
    styles,
    layoutSettings,
    title,
    placement,
    safeZoneRadiusPercent,
    measureText: measureDiscTextWithBrowserCanvas,
    width: discContentSize,
    height: discContentSize,
    idPrefix: 'disc-text-export',
  })
  const textLayerImage = await loadImage(createSvgDataUrl(svg))

  context.drawImage(textLayerImage, discOrigin, discOrigin, discContentSize, discContentSize)
}
