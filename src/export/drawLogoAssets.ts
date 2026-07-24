import type { LogoAssetLayout, ProjectLogoAssets } from '../project/projectTypes.ts'
import { getLogoAssetBoundsPercent } from '../disc/geometry.ts'
import {
  createLogoAssetRenderItems,
  getLogoAssetRenderDataUrl,
  getLogoAssetRenderSize,
  type LogoAssetKey,
} from '../project/projectLogoAssets.ts'
import { loadCanvasSafeImage } from './canvasImage.ts'
import { drawMarkImage } from './drawMarkImage.ts'
import type { BackgroundImageSize } from '../project/projectTypes.ts'

async function drawLogoAsset(
  context: CanvasRenderingContext2D,
  discContentSize: number,
  discOrigin: number,
  imageDataUrl: string | null,
  imageSize: BackgroundImageSize | null,
  layout: LogoAssetLayout,
  logoKey: LogoAssetKey,
  imageLoader: typeof loadCanvasSafeImage,
) {
  const renderImageSize = getLogoAssetRenderSize(imageSize)

  await drawMarkImage(
    context,
    discContentSize,
    discOrigin,
    {
      imageDataUrl: getLogoAssetRenderDataUrl(logoKey, imageDataUrl),
      imageSize: renderImageSize,
      label: `${logoKey} logo`,
      layout,
      scaledBounds: getLogoAssetBoundsPercent(
        renderImageSize,
        layout.scale,
      ),
    },
    imageLoader,
  )
}

export async function drawLogoAssets(
  context: CanvasRenderingContext2D,
  discContentSize: number,
  discOrigin: number,
  logoAssets: ProjectLogoAssets,
  imageLoader: typeof loadCanvasSafeImage = loadCanvasSafeImage,
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
      imageLoader,
    )
  }
}
