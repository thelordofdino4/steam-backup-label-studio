import type { ProjectMetadata, ProjectRatingBadge } from '../project/projectTypes'
import {
  shouldRenderRatingBadge,
  shouldUseCustomRatingBadgeImage,
} from '../project/projectRatingBadge'
import {
  RATING_BADGE_BASE_HEIGHT_RATIO,
  RATING_BADGE_BASE_WIDTH_RATIO,
} from '../discGeometry'
import {
  getRatingBadgePlaceholderImageUrl,
  getRatingBadgePlaceholderTextColor,
} from '../discPlaceholderAssets'
import { loadImage } from './canvasImage'

function getPlaceholderLabel(metadata: ProjectMetadata) {
  if (metadata.ratingSystem === 'none') {
    return ''
  }

  return metadata.ratingValue.trim() || metadata.ratingSystem
}

async function drawPlaceholderRatingBadge(
  context: CanvasRenderingContext2D,
  discContentSize: number,
  discOrigin: number,
  metadata: ProjectMetadata,
  badge: ProjectRatingBadge,
) {
  const label = getPlaceholderLabel(metadata)

  if (!label) {
    return
  }

  const width = discContentSize * RATING_BADGE_BASE_WIDTH_RATIO * badge.layout.scale
  const height = discContentSize * RATING_BADGE_BASE_HEIGHT_RATIO * badge.layout.scale
  const x = discOrigin + discContentSize * (badge.layout.x / 100) - width / 2
  const y = discOrigin + discContentSize * (badge.layout.y / 100) - height / 2
  const image = await loadImage(getRatingBadgePlaceholderImageUrl(metadata))

  context.drawImage(image, x, y, width, height)
  context.save()
  context.fillStyle = getRatingBadgePlaceholderTextColor(metadata)
  context.font = `900 ${height * (36 / 130)}px Arial, sans-serif`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(label, x + width * (45 / 90), y + height * (66 / 130))
  context.restore()
}

async function drawCustomRatingBadge(
  context: CanvasRenderingContext2D,
  discContentSize: number,
  discOrigin: number,
  badge: ProjectRatingBadge,
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
  if (!shouldRenderRatingBadge(metadata, badge)) {
    return
  }

  if (shouldUseCustomRatingBadgeImage(badge)) {
    await drawCustomRatingBadge(context, discContentSize, discOrigin, badge)
    return
  }

  await drawPlaceholderRatingBadge(context, discContentSize, discOrigin, metadata, badge)
}
