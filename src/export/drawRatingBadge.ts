import type { ProjectMetadata, ProjectRatingBadge } from '../project/projectTypes'
import {
  RATING_BADGE_BASE_HEIGHT_RATIO,
  RATING_BADGE_BASE_WIDTH_RATIO,
} from '../discGeometry'
import { loadImage } from './canvasImage'

function getPlaceholderLabel(metadata: ProjectMetadata) {
  if (metadata.ratingSystem === 'none') {
    return ''
  }

  return metadata.ratingValue.trim() || metadata.ratingSystem
}

function drawPlaceholderRatingBadge(
  context: CanvasRenderingContext2D,
  exportSize: number,
  metadata: ProjectMetadata,
  badge: ProjectRatingBadge,
) {
  const label = getPlaceholderLabel(metadata)

  if (!label) {
    return
  }

  const width = exportSize * RATING_BADGE_BASE_WIDTH_RATIO * badge.layout.scale
  const height = exportSize * RATING_BADGE_BASE_HEIGHT_RATIO * badge.layout.scale
  const x = exportSize * (badge.layout.x / 100) - width / 2
  const y = exportSize * (badge.layout.y / 100) - height / 2
  const radius = metadata.ratingSystem === 'PEGI' ? Math.min(width, height) / 2 : exportSize * 0.008

  context.save()

  context.fillStyle = metadata.ratingSystem === 'custom' ? '#111827' : '#f9fafb'
  context.strokeStyle = metadata.ratingSystem === 'custom' ? '#f9fafb' : '#111827'
  context.lineWidth = Math.max(2, exportSize * 0.004)

  context.beginPath()

  if (metadata.ratingSystem === 'PEGI') {
    const centerX = x + width / 2
    const centerY = y + height / 2
    context.arc(centerX, centerY, Math.min(width, height) / 2, 0, Math.PI * 2)
  } else {
    context.roundRect(x, y, width, height, radius)
  }

  context.fill()
  context.stroke()

  const textColor = metadata.ratingSystem === 'custom' ? '#f9fafb' : '#111827'
  context.fillStyle = textColor
  context.textAlign = 'center'
  context.textBaseline = 'middle'

  context.font = `800 ${Math.max(8, height * 0.11)}px sans-serif`
  context.fillText(metadata.ratingSystem, x + width / 2, y + height * 0.18)

  context.font = `900 ${Math.max(12, height * 0.31)}px sans-serif`
  context.fillText(label, x + width / 2, y + height * 0.5)

  context.font = `800 ${Math.max(6, height * 0.08)}px sans-serif`
  context.fillText('PLACEHOLDER', x + width / 2, y + height * 0.82)

  context.restore()
}

async function drawCustomRatingBadge(
  context: CanvasRenderingContext2D,
  exportSize: number,
  badge: ProjectRatingBadge,
) {
  if (!badge.customImageDataUrl) {
    return
  }

  const image = await loadImage(badge.customImageDataUrl)
  const naturalWidth = image.naturalWidth || image.width || 1
  const naturalHeight = image.naturalHeight || image.height || 1
  const aspectRatio = naturalWidth / naturalHeight

  const maxWidth = exportSize * RATING_BADGE_BASE_WIDTH_RATIO * badge.layout.scale
  const maxHeight = exportSize * RATING_BADGE_BASE_HEIGHT_RATIO * badge.layout.scale

  let drawWidth = maxWidth
  let drawHeight = drawWidth / aspectRatio

  if (drawHeight > maxHeight) {
    drawHeight = maxHeight
    drawWidth = drawHeight * aspectRatio
  }

  const centerX = exportSize * (badge.layout.x / 100)
  const centerY = exportSize * (badge.layout.y / 100)

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
  exportSize: number,
  metadata: ProjectMetadata,
  badge: ProjectRatingBadge,
) {
  if (!badge.layout.enabled || metadata.ratingSystem === 'none') {
    return
  }

  if (badge.source === 'custom' && badge.customImageDataUrl) {
    await drawCustomRatingBadge(context, exportSize, badge)
    return
  }

  drawPlaceholderRatingBadge(context, exportSize, metadata, badge)
}
