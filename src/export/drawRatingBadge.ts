import type {
  ProjectMetadata,
  ProjectRatingBadge,
} from '../project/projectTypes.ts'
import {
  shouldRenderSupplementalUskRatingBadge,
  shouldRenderRatingBadge,
} from '../project/projectRatingBadge.ts'
import { getRatingBadgeBoundsPercent } from '../disc/geometry.ts'
import {
  getRatingBadgePlaceholderRenderModel,
} from '../assets/assetManifest.ts'
import {
  createPrimaryRatingBadgeRenderModel,
  type PrimaryRatingBadgeRenderModel,
} from '../render/ratingBadgeRenderModel.ts'
import {
  drawImageContent,
  getCanvasImageContentSize,
  loadCanvasSafeImage,
} from './canvasImage.ts'

type RatingBadgeImageLoader = typeof loadCanvasSafeImage

type DrawableRatingBadgeRenderModel = Pick<
  PrimaryRatingBadgeRenderModel,
  | 'alt'
  | 'imageDataUrl'
  | 'imageSize'
  | 'isCustomImage'
  | 'layout'
  | 'overlayLabel'
  | 'scaledBounds'
  | 'textColor'
>

async function drawResolvedRatingBadge(
  context: CanvasRenderingContext2D,
  discContentSize: number,
  discOrigin: number,
  model: DrawableRatingBadgeRenderModel,
  imageLoader: RatingBadgeImageLoader,
) {
  const image = await imageLoader(
    model.imageDataUrl,
    model.isCustomImage ? 'custom rating badge image' : model.alt,
  )
  const contentSize = getCanvasImageContentSize(image, model.imageSize)

  if (!contentSize) {
    return
  }

  const aspectRatio = contentSize.width / contentSize.height
  const maxWidth = discContentSize * (model.scaledBounds.halfWidth * 2 / 100)
  const maxHeight = discContentSize * (model.scaledBounds.halfHeight * 2 / 100)

  let drawWidth = maxWidth
  let drawHeight = drawWidth / aspectRatio

  if (drawHeight > maxHeight) {
    drawHeight = maxHeight
    drawWidth = drawHeight * aspectRatio
  }

  const centerX = discOrigin + discContentSize * (model.layout.x / 100)
  const centerY = discOrigin + discContentSize * (model.layout.y / 100)
  const x = centerX - drawWidth / 2
  const y = centerY - drawHeight / 2

  drawImageContent(
    context,
    image,
    model.imageSize,
    { x, y, width: drawWidth, height: drawHeight },
  )

  if (!model.overlayLabel) {
    return
  }

  context.save()
  context.beginPath()
  context.rect(x, y, drawWidth, drawHeight)
  context.clip()
  context.fillStyle = model.textColor
  context.font = `900 ${drawHeight * (36 / 130)}px Arial, sans-serif`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(
    model.overlayLabel,
    x + drawWidth * (45 / 90),
    y + drawHeight * (66 / 130),
  )
  context.restore()
}

function createSupplementalUskRatingBadgeRenderModel(
  ratingBadge: ProjectRatingBadge,
): DrawableRatingBadgeRenderModel {
  const placeholder = getRatingBadgePlaceholderRenderModel({
    ratingSystem: 'USK',
    ratingValue: ratingBadge.uskBadge.ratingValue,
  })

  return {
    alt: placeholder.altLabel,
    imageDataUrl: placeholder.imageUrl,
    imageSize: placeholder.imageSize,
    isCustomImage: false,
    layout: ratingBadge.uskBadge.layout,
    overlayLabel: placeholder.overlayLabel,
    scaledBounds: getRatingBadgeBoundsPercent(
      placeholder.imageSize,
      ratingBadge.uskBadge.layout.scale,
    ),
    textColor: placeholder.textColor,
  }
}

export async function drawRatingBadge(
  context: CanvasRenderingContext2D,
  discContentSize: number,
  discOrigin: number,
  metadata: ProjectMetadata,
  ratingBadge: ProjectRatingBadge,
  imageLoader: RatingBadgeImageLoader = loadCanvasSafeImage,
) {
  if (shouldRenderRatingBadge(metadata, ratingBadge)) {
    const primaryModel = createPrimaryRatingBadgeRenderModel(
      metadata,
      ratingBadge,
    )

    if (primaryModel) {
      await drawResolvedRatingBadge(
        context,
        discContentSize,
        discOrigin,
        primaryModel,
        imageLoader,
      )
    }
  }

  if (shouldRenderSupplementalUskRatingBadge(metadata, ratingBadge)) {
    await drawResolvedRatingBadge(
      context,
      discContentSize,
      discOrigin,
      createSupplementalUskRatingBadgeRenderModel(ratingBadge),
      imageLoader,
    )
  }
}
