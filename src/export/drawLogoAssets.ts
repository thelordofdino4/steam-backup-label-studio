import type { LogoAssetLayout, ProjectLogoAssets } from '../project/projectTypes'
import { LOGO_BASE_WIDTH_RATIO, LOGO_MAX_HEIGHT_RATIO } from '../disc/geometry'
import {
  createLogoAssetRenderItems,
  getLogoAssetRenderDataUrl,
  getLogoAssetRenderSize,
  type LogoAssetKey,
} from '../project/projectLogoAssets'
import {
  drawImageContent,
  getCanvasImageContentSize,
  loadCanvasSafeImage,
} from './canvasImage'
import type { BackgroundImageSize } from '../project/projectTypes'

async function drawLogoAsset(
  context: CanvasRenderingContext2D,
  discContentSize: number,
  discOrigin: number,
  imageDataUrl: string | null,
  imageSize: BackgroundImageSize | null,
  layout: LogoAssetLayout,
  logoKey: LogoAssetKey,
) {
  const renderImageSize = getLogoAssetRenderSize(imageSize)
  const image = await loadCanvasSafeImage(
    getLogoAssetRenderDataUrl(logoKey, imageDataUrl),
    `${logoKey} logo image`,
  )
  const contentSize = getCanvasImageContentSize(image, renderImageSize)

  if (!contentSize) {
    return
  }

  const aspectRatio = contentSize.width / contentSize.height

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

  drawImageContent(
    context,
    image,
    renderImageSize,
    {
      x: centerX - drawWidth / 2,
      y: centerY - drawHeight / 2,
      width: drawWidth,
      height: drawHeight,
    },
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
      logoAsset.imageSize,
      logoAsset.layout,
      logoAsset.logoKey,
    )
  }
}
