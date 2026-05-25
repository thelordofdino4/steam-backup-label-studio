import type { LogoAssetLayout, ProjectLogoAssets } from '../project/projectTypes'
import { loadImage } from './canvasImage'

const LOGO_BASE_WIDTH_RATIO = 0.18
const LOGO_MAX_HEIGHT_RATIO = 0.1

async function drawLogoAsset(
  context: CanvasRenderingContext2D,
  exportSize: number,
  imageDataUrl: string | null,
  layout: LogoAssetLayout,
) {
  if (!imageDataUrl || !layout.enabled) {
    return
  }

  const image = await loadImage(imageDataUrl)
  const naturalWidth = image.naturalWidth || image.width || 1
  const naturalHeight = image.naturalHeight || image.height || 1
  const aspectRatio = naturalWidth / naturalHeight

  const maxWidth = exportSize * LOGO_BASE_WIDTH_RATIO * layout.scale
  const maxHeight = exportSize * LOGO_MAX_HEIGHT_RATIO * layout.scale

  let drawWidth = maxWidth
  let drawHeight = drawWidth / aspectRatio

  if (drawHeight > maxHeight) {
    drawHeight = maxHeight
    drawWidth = drawHeight * aspectRatio
  }

  const centerX = exportSize * (layout.x / 100)
  const centerY = exportSize * (layout.y / 100)

  context.drawImage(
    image,
    centerX - drawWidth / 2,
    centerY - drawHeight / 2,
    drawWidth,
    drawHeight,
  )
}

export async function drawLogoAssets(
  context: CanvasRenderingContext2D,
  exportSize: number,
  logoAssets: ProjectLogoAssets,
) {
  await drawLogoAsset(
    context,
    exportSize,
    logoAssets.developerLogoDataUrl,
    logoAssets.developerLogoLayout,
  )
  await drawLogoAsset(
    context,
    exportSize,
    logoAssets.publisherLogoDataUrl,
    logoAssets.publisherLogoLayout,
  )
}
