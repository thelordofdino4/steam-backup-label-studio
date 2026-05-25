import {
  MEDIA_MARK_BASE_HEIGHT_RATIO,
  MEDIA_MARK_BASE_WIDTH_RATIO,
  PLATFORM_MARK_BASE_HEIGHT_RATIO,
  PLATFORM_MARK_BASE_WIDTH_RATIO,
} from '../discGeometry'
import { getMediaMarkLabel, getPlatformMarkLabel } from '../project/projectMediaMark'
import type { PlatformMarkValue, ProjectMediaMark, ProjectPlatformMarkAsset, ProjectPlatformMarks } from '../project/projectTypes'
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

function drawPlaceholderPlatformMark(
  context: CanvasRenderingContext2D,
  exportSize: number,
  value: PlatformMarkValue,
  asset: ProjectPlatformMarkAsset,
) {
  const width = exportSize * PLATFORM_MARK_BASE_WIDTH_RATIO * asset.layout.scale
  const height = exportSize * PLATFORM_MARK_BASE_HEIGHT_RATIO * asset.layout.scale
  const x = exportSize * (asset.layout.x / 100) - width / 2
  const y = exportSize * (asset.layout.y / 100) - height / 2

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
  context.font = `900 ${Math.max(8, height * 0.23)}px Arial`
  context.fillText(
    getPlatformMarkLabel(value).toUpperCase(),
    x + width / 2,
    y + height / 2,
    width * 0.82,
  )

  context.restore()
}

async function drawCustomPlatformMark(
  context: CanvasRenderingContext2D,
  exportSize: number,
  asset: ProjectPlatformMarkAsset,
) {
  if (!asset.customImageDataUrl) {
    return
  }

  const image = await loadImage(asset.customImageDataUrl)
  const naturalWidth = image.naturalWidth || image.width || 1
  const naturalHeight = image.naturalHeight || image.height || 1
  const aspectRatio = naturalWidth / naturalHeight

  const maxWidth =
    exportSize * PLATFORM_MARK_BASE_WIDTH_RATIO * asset.layout.scale
  const maxHeight =
    exportSize * PLATFORM_MARK_BASE_HEIGHT_RATIO * asset.layout.scale

  let drawWidth = maxWidth
  let drawHeight = drawWidth / aspectRatio

  if (drawHeight > maxHeight) {
    drawHeight = maxHeight
    drawWidth = drawHeight * aspectRatio
  }

  const centerX = exportSize * (asset.layout.x / 100)
  const centerY = exportSize * (asset.layout.y / 100)

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
  for (const value of platformMarks.values) {
    const asset = platformMarks.assets[value]

    if (!asset?.layout.enabled) {
      continue
    }

    if (asset.source === 'custom' && asset.customImageDataUrl) {
      await drawCustomPlatformMark(context, exportSize, asset)
      continue
    }

    drawPlaceholderPlatformMark(context, exportSize, value, asset)
  }
}
