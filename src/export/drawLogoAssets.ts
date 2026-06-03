import type { LogoAssetLayout, ProjectLogoAssets } from '../project/projectTypes'
import { LOGO_BASE_WIDTH_RATIO, LOGO_MAX_HEIGHT_RATIO } from '../disc/geometry'
import {
  createLogoAssetRenderItems,
  getLogoAssetRenderDataUrl,
  type LogoAssetKey,
} from '../project/projectLogoAssets'
import { loadCanvasSafeImage } from './canvasImage'

async function drawLogoAsset(
  context: CanvasRenderingContext2D,
  discContentSize: number,
  discOrigin: number,
  imageDataUrl: string | null,
  layout: LogoAssetLayout,
  logoKey: LogoAssetKey,
) {
  const image = await loadCanvasSafeImage(
    getLogoAssetRenderDataUrl(logoKey, imageDataUrl),
    `${logoKey} logo image`,
  )
  const naturalWidth = image.naturalWidth || image.width || 1
  const naturalHeight = image.naturalHeight || image.height || 1
  const aspectRatio = naturalWidth / naturalHeight

  const maxWidth = discContentSize * LOGO_BASE_WIDTH_RATIO * layout.scale
  const maxHeight = discContentSize * LOGO_MAX_HEIGHT_RATIO * layout.scale

  let drawWidth = maxWidth
  let drawHeight = drawWidth / aspectRatio

  if (drawHeight > maxHeight) {
    drawHeight = maxHeight
    drawWidth = drawHeight * aspectRatio
  }

  const centerX = discOrigin + discContentSize * (layout.x / 100)
  const centerY = discOrigin + discContentSize * (layout.y / 100)

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
  discContentSize: number,
  discOrigin: number,
  logoAssets: ProjectLogoAssets,
) {
  for (const logoAsset of createLogoAssetRenderItems(logoAssets)) {
    await drawLogoAsset(
      context,
      discContentSize,
      discOrigin,
      logoAsset.imageDataUrl,
      logoAsset.layout,
      logoAsset.logoKey,
    )
  }
}
