import {
  MEDIA_MARK_BASE_HEIGHT_RATIO,
  MEDIA_MARK_BASE_WIDTH_RATIO,
  PLATFORM_MARK_BASE_HEIGHT_RATIO,
  PLATFORM_MARK_BASE_WIDTH_RATIO,
  PLATFORM_MARK_GROUP_MAX_WIDTH_RATIO,
} from '../discGeometry'
import { getMediaMarkLabel, getPlatformMarkLabel } from '../project/projectMediaMark'
import type { ProjectMediaMark, ProjectPlatformMarks } from '../project/projectTypes'
import { loadImage } from './canvasImage'

function drawPlaceholderMediaMark(
  context: CanvasRenderingContext2D,
  exportSize: number,
  mediaMark: ProjectMediaMark,
) {
  const width = exportSize * MEDIA_MARK_BASE_WIDTH_RATIO * mediaMark.layout.scale
  const height = exportSize * MEDIA_MARK_BASE_HEIGHT_RATIO * mediaMark.layout.scale
  const x = exportSize * (mediaMark.layout.x / 100) - width / 2
  const y = exportSize * (mediaMark.layout.y / 100) - height / 2
  const label = getMediaMarkLabel(mediaMark.value)

  context.save()
  context.fillStyle = 'rgba(17, 24, 39, 0.88)'
  context.strokeStyle = 'rgba(249, 250, 251, 0.92)'
  context.lineWidth = Math.max(2, exportSize * 0.0022)
  context.beginPath()
  context.roundRect(x, y, width, height, exportSize * 0.006)
  context.fill()
  context.stroke()

  context.fillStyle = '#f9fafb'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = `900 ${Math.max(12, height * 0.28)}px Arial`
  context.fillText(label.toUpperCase(), x + width / 2, y + height * 0.44, width * 0.86)
  context.font = `800 ${Math.max(6, height * 0.1)}px Arial`
  context.fillText('MEDIA MARK', x + width / 2, y + height * 0.73, width * 0.86)
  context.restore()
}

async function drawCustomMediaMark(
  context: CanvasRenderingContext2D,
  exportSize: number,
  mediaMark: ProjectMediaMark,
) {
  if (!mediaMark.customImageDataUrl) {
    return
  }

  const image = await loadImage(mediaMark.customImageDataUrl)
  const naturalWidth = image.naturalWidth || image.width || 1
  const naturalHeight = image.naturalHeight || image.height || 1
  const aspectRatio = naturalWidth / naturalHeight

  const maxWidth = exportSize * MEDIA_MARK_BASE_WIDTH_RATIO * mediaMark.layout.scale
  const maxHeight = exportSize * MEDIA_MARK_BASE_HEIGHT_RATIO * mediaMark.layout.scale

  let drawWidth = maxWidth
  let drawHeight = drawWidth / aspectRatio

  if (drawHeight > maxHeight) {
    drawHeight = maxHeight
    drawWidth = drawHeight * aspectRatio
  }

  const centerX = exportSize * (mediaMark.layout.x / 100)
  const centerY = exportSize * (mediaMark.layout.y / 100)

  context.drawImage(
    image,
    centerX - drawWidth / 2,
    centerY - drawHeight / 2,
    drawWidth,
    drawHeight,
  )
}

export async function drawMediaMark(
  context: CanvasRenderingContext2D,
  exportSize: number,
  mediaMark: ProjectMediaMark,
) {
  if (!mediaMark.layout.enabled) {
    return
  }

  if (mediaMark.source === 'custom' && mediaMark.customImageDataUrl) {
    await drawCustomMediaMark(context, exportSize, mediaMark)
    return
  }

  drawPlaceholderMediaMark(context, exportSize, mediaMark)
}

function getPlatformMarksPlaceholderWidthRatio(platformMarks: ProjectPlatformMarks) {
  return Math.min(
    PLATFORM_MARK_GROUP_MAX_WIDTH_RATIO,
    PLATFORM_MARK_BASE_WIDTH_RATIO * Math.max(1, platformMarks.values.length),
  )
}

function drawPlaceholderPlatformMarks(
  context: CanvasRenderingContext2D,
  exportSize: number,
  platformMarks: ProjectPlatformMarks,
) {
  if (platformMarks.values.length === 0) {
    return
  }

  const width =
    exportSize *
    getPlatformMarksPlaceholderWidthRatio(platformMarks) *
    platformMarks.layout.scale
  const height =
    exportSize * PLATFORM_MARK_BASE_HEIGHT_RATIO * platformMarks.layout.scale
  const x = exportSize * (platformMarks.layout.x / 100) - width / 2
  const y = exportSize * (platformMarks.layout.y / 100) - height / 2

  context.save()
  context.fillStyle = 'rgba(17, 24, 39, 0.88)'
  context.strokeStyle = 'rgba(249, 250, 251, 0.92)'
  context.lineWidth = Math.max(2, exportSize * 0.0022)
  context.beginPath()
  context.roundRect(x, y, width, height, exportSize * 0.006)
  context.fill()
  context.stroke()

  const gap = Math.max(3, width * 0.016)
  const innerPadding = Math.max(5, height * 0.12)
  const chipWidth =
    (width - innerPadding * 2 - gap * (platformMarks.values.length - 1)) /
    platformMarks.values.length
  const chipHeight = height - innerPadding * 2

  context.fillStyle = '#f9fafb'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = `900 ${Math.max(8, height * 0.24)}px Arial`

  platformMarks.values.forEach((value, index) => {
    const chipX = x + innerPadding + index * (chipWidth + gap)
    const chipY = y + innerPadding

    context.strokeStyle = 'rgba(249, 250, 251, 0.72)'
    context.lineWidth = Math.max(1, exportSize * 0.0011)
    context.beginPath()
    context.roundRect(chipX, chipY, chipWidth, chipHeight, exportSize * 0.004)
    context.stroke()
    context.fillText(
      getPlatformMarkLabel(value).toUpperCase(),
      chipX + chipWidth / 2,
      chipY + chipHeight / 2,
      chipWidth * 0.82,
    )
  })

  context.restore()
}

async function drawCustomPlatformMarks(
  context: CanvasRenderingContext2D,
  exportSize: number,
  platformMarks: ProjectPlatformMarks,
) {
  if (!platformMarks.customImageDataUrl) {
    return
  }

  const image = await loadImage(platformMarks.customImageDataUrl)
  const naturalWidth = image.naturalWidth || image.width || 1
  const naturalHeight = image.naturalHeight || image.height || 1
  const aspectRatio = naturalWidth / naturalHeight

  const maxWidth =
    exportSize * PLATFORM_MARK_GROUP_MAX_WIDTH_RATIO * platformMarks.layout.scale
  const maxHeight =
    exportSize * PLATFORM_MARK_BASE_HEIGHT_RATIO * platformMarks.layout.scale

  let drawWidth = maxWidth
  let drawHeight = drawWidth / aspectRatio

  if (drawHeight > maxHeight) {
    drawHeight = maxHeight
    drawWidth = drawHeight * aspectRatio
  }

  const centerX = exportSize * (platformMarks.layout.x / 100)
  const centerY = exportSize * (platformMarks.layout.y / 100)

  context.drawImage(
    image,
    centerX - drawWidth / 2,
    centerY - drawHeight / 2,
    drawWidth,
    drawHeight,
  )
}

export async function drawPlatformMarks(
  context: CanvasRenderingContext2D,
  exportSize: number,
  platformMarks: ProjectPlatformMarks,
) {
  if (!platformMarks.layout.enabled) {
    return
  }

  if (platformMarks.source === 'custom' && platformMarks.customImageDataUrl) {
    await drawCustomPlatformMarks(context, exportSize, platformMarks)
    return
  }

  drawPlaceholderPlatformMarks(context, exportSize, platformMarks)
}
