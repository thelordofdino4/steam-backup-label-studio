import type { ProjectMetadata, ProjectRatingBadge, RatingBadgeLayout, RatingBadgeSource } from '../project/projectTypes'
import {
  shouldRenderSupplementalUskRatingBadge,
  shouldRenderRatingBadge,
  shouldUseCustomRatingBadgeImage,
} from '../project/projectRatingBadge'
import {
  RATING_BADGE_BASE_HEIGHT_RATIO,
  RATING_BADGE_BASE_WIDTH_RATIO,
} from '../discGeometry'
import {
  getRatingBadgePlaceholderRenderModel,
} from '../discPlaceholderAssets'
import { loadImage } from './canvasImage'

type DrawableRatingBadge = {
  source: RatingBadgeSource
  customImageDataUrl: string | null
  customImageSize: ProjectRatingBadge['customImageSize']
  layout: RatingBadgeLayout
}

async function drawPlaceholderRatingBadge(
  context: CanvasRenderingContext2D,
  discContentSize: number,
  discOrigin: number,
  metadata: Pick<ProjectMetadata, 'ratingSystem' | 'ratingValue'>,
  badge: DrawableRatingBadge,
) {
  const renderModel = getRatingBadgePlaceholderRenderModel(metadata)

  const image = await loadImage(renderModel.imageUrl)
  const naturalWidth = image.naturalWidth || image.width || 1
  const naturalHeight = image.naturalHeight || image.height || 1
  const aspectRatio = naturalWidth / naturalHeight
  const maxWidth = discContentSize * RATING_BADGE_BASE_WIDTH_RATIO * badge.layout.scale
  const maxHeight = discContentSize * RATING_BADGE_BASE_HEIGHT_RATIO * badge.layout.scale

  let drawWidth = maxWidth
  let drawHeight = drawWidth / aspectRatio

  if (drawHeight > maxHeight) {
    drawHeight = maxHeight
    drawWidth = drawHeight * aspectRatio
  }

  const centerX = discOrigin + discContentSize * (badge.layout.x / 100)
  const centerY = discOrigin + discContentSize * (badge.layout.y / 100)
  const x = centerX - drawWidth / 2
  const y = centerY - drawHeight / 2

  context.drawImage(image, x, y, drawWidth, drawHeight)

  if (!renderModel.overlayLabel) {
    return
  }

  context.save()
  context.fillStyle = renderModel.textColor
  context.font = `900 ${drawHeight * (36 / 130)}px Arial, sans-serif`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(
    renderModel.overlayLabel,
    x + drawWidth * (45 / 90),
    y + drawHeight * (66 / 130),
  )
  context.restore()
}

async function drawCustomRatingBadge(
  context: CanvasRenderingContext2D,
  discContentSize: number,
  discOrigin: number,
  badge: DrawableRatingBadge,
) {
  if (!badge.customImageDataUrl) {
    return
  }

  const image = await loadImage(badge.customImageDataUrl)
  const naturalWidth = image.naturalWidth || image.width || 1
  const naturalHeight = image.naturalHeight || image.height || 1
  const aspectRatio = naturalWidth / naturalHeight

  const maxWidth = discContentSize * RATING_BADGE_BASE_WIDTH_RATIO * badge.layout.scale
  const maxHeight = discContentSize * RATING_BADGE_BASE_HEIGHT_RATIO * badge.layout.scale

  let drawWidth = maxWidth
  let drawHeight = drawWidth / aspectRatio

  if (drawHeight > maxHeight) {
    drawHeight = maxHeight
    drawWidth = drawHeight * aspectRatio
  }

  const centerX = discOrigin + discContentSize * (badge.layout.x / 100)
  const centerY = discOrigin + discContentSize * (badge.layout.y / 100)

  context.drawImage(
    image,
    centerX - drawWidth / 2,
    centerY - drawHeight / 2,
    drawWidth,
    drawHeight,
  )
}

export async function drawRatingBadge(
  context: CanvasRenderingContext2D,
  discContentSize: number,
  discOrigin: number,
  metadata: ProjectMetadata,
  badge: ProjectRatingBadge,
) {
  if (shouldRenderRatingBadge(metadata, badge)) {
    if (shouldUseCustomRatingBadgeImage(badge)) {
      await drawCustomRatingBadge(context, discContentSize, discOrigin, badge)
    } else {
      await drawPlaceholderRatingBadge(context, discContentSize, discOrigin, metadata, badge)
    }
  }

  if (shouldRenderSupplementalUskRatingBadge(metadata, badge)) {
    await drawPlaceholderRatingBadge(
      context,
      discContentSize,
      discOrigin,
      {
        ratingSystem: 'USK',
        ratingValue: badge.uskBadge.ratingValue,
      },
      {
        source: 'placeholder',
        customImageDataUrl: null,
        customImageSize: null,
        layout: badge.uskBadge.layout,
      },
    )
  }
}
