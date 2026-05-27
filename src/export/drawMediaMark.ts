import {
  MEDIA_MARK_BASE_HEIGHT_RATIO,
  MEDIA_MARK_BASE_WIDTH_RATIO,
  PLATFORM_MARK_BASE_HEIGHT_RATIO,
  PLATFORM_MARK_BASE_WIDTH_RATIO,
} from '../discGeometry'
import {
  buildMediaMarkPlaceholderSvg,
  buildPlatformMarkPlaceholderSvg,
} from '../discPlaceholderSvg'
import type { PlatformMarkValue, ProjectMediaMark, ProjectPlatformMarkAsset, ProjectPlatformMarks } from '../project/projectTypes'
import { createSvgDataUrl } from '../svgUtils'
import { loadImage } from './canvasImage'

async function drawPlaceholderMediaMark(
  context: CanvasRenderingContext2D,
  discContentSize: number,
  discOrigin: number,
  mediaMark: ProjectMediaMark,
) {
  const width = discContentSize * MEDIA_MARK_BASE_WIDTH_RATIO * mediaMark.layout.scale
  const height = discContentSize * MEDIA_MARK_BASE_HEIGHT_RATIO * mediaMark.layout.scale
  const x = discOrigin + discContentSize * (mediaMark.layout.x / 100) - width / 2
  const y = discOrigin + discContentSize * (mediaMark.layout.y / 100) - height / 2
  const image = await loadImage(createSvgDataUrl(buildMediaMarkPlaceholderSvg(mediaMark.value)))

  context.drawImage(image, x, y, width, height)
}

async function drawCustomMediaMark(
  context: CanvasRenderingContext2D,
  discContentSize: number,
  discOrigin: number,
  mediaMark: ProjectMediaMark,
) {
  if (!mediaMark.customImageDataUrl) {
    return
  }

  const image = await loadImage(mediaMark.customImageDataUrl)
  const naturalWidth = image.naturalWidth || image.width || 1
  const naturalHeight = image.naturalHeight || image.height || 1
  const aspectRatio = naturalWidth / naturalHeight

  const maxWidth = discContentSize * MEDIA_MARK_BASE_WIDTH_RATIO * mediaMark.layout.scale
  const maxHeight = discContentSize * MEDIA_MARK_BASE_HEIGHT_RATIO * mediaMark.layout.scale

  let drawWidth = maxWidth
  let drawHeight = drawWidth / aspectRatio

  if (drawHeight > maxHeight) {
    drawHeight = maxHeight
    drawWidth = drawHeight * aspectRatio
  }

  const centerX = discOrigin + discContentSize * (mediaMark.layout.x / 100)
  const centerY = discOrigin + discContentSize * (mediaMark.layout.y / 100)

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
  discContentSize: number,
  discOrigin: number,
  mediaMark: ProjectMediaMark,
) {
  if (!mediaMark.layout.enabled) {
    return
  }

  if (mediaMark.source === 'custom' && mediaMark.customImageDataUrl) {
    await drawCustomMediaMark(context, discContentSize, discOrigin, mediaMark)
    return
  }

  await drawPlaceholderMediaMark(context, discContentSize, discOrigin, mediaMark)
}

async function drawPlaceholderPlatformMark(
  context: CanvasRenderingContext2D,
  discContentSize: number,
  discOrigin: number,
  value: PlatformMarkValue,
  asset: ProjectPlatformMarkAsset,
) {
  const width = discContentSize * PLATFORM_MARK_BASE_WIDTH_RATIO * asset.layout.scale
  const height = discContentSize * PLATFORM_MARK_BASE_HEIGHT_RATIO * asset.layout.scale
  const x = discOrigin + discContentSize * (asset.layout.x / 100) - width / 2
  const y = discOrigin + discContentSize * (asset.layout.y / 100) - height / 2
  const image = await loadImage(createSvgDataUrl(buildPlatformMarkPlaceholderSvg(value)))

  context.drawImage(image, x, y, width, height)
}

async function drawCustomPlatformMark(
  context: CanvasRenderingContext2D,
  discContentSize: number,
  discOrigin: number,
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
    discContentSize * PLATFORM_MARK_BASE_WIDTH_RATIO * asset.layout.scale
  const maxHeight =
    discContentSize * PLATFORM_MARK_BASE_HEIGHT_RATIO * asset.layout.scale

  let drawWidth = maxWidth
  let drawHeight = drawWidth / aspectRatio

  if (drawHeight > maxHeight) {
    drawHeight = maxHeight
    drawWidth = drawHeight * aspectRatio
  }

  const centerX = discOrigin + discContentSize * (asset.layout.x / 100)
  const centerY = discOrigin + discContentSize * (asset.layout.y / 100)

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
  discContentSize: number,
  discOrigin: number,
  platformMarks: ProjectPlatformMarks,
) {
  for (const value of platformMarks.values) {
    const asset = platformMarks.assets[value]

    if (!asset?.layout.enabled) {
      continue
    }

    if (asset.source === 'custom' && asset.customImageDataUrl) {
      await drawCustomPlatformMark(context, discContentSize, discOrigin, asset)
      continue
    }

    await drawPlaceholderPlatformMark(context, discContentSize, discOrigin, value, asset)
  }
}
