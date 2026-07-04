import zlib from 'node:zlib'
import { fail } from './text-editor-smoke-reporting.mjs'

function paethPredictor(a, b, c) {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)

  if (pa <= pb && pa <= pc) return a
  if (pb <= pc) return b
  return c
}

export function decodePngRgba(buffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  if (!buffer.subarray(0, 8).equals(signature)) {
    fail('Screenshot was not a PNG.')
  }

  let offset = 8
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = 0
  const idatChunks = []

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii')
    const data = buffer.subarray(offset + 8, offset + 8 + length)
    offset += 12 + length

    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      bitDepth = data[8]
      colorType = data[9]
    } else if (type === 'IDAT') {
      idatChunks.push(data)
    } else if (type === 'IEND') {
      break
    }
  }

  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
    fail(`Unsupported screenshot PNG format: bitDepth=${bitDepth}, colorType=${colorType}.`)
  }

  const channels = colorType === 6 ? 4 : 3
  const rowLength = width * channels
  const inflated = zlib.inflateSync(Buffer.concat(idatChunks))
  const rgba = new Uint8Array(width * height * 4)
  let sourceOffset = 0
  let previous = new Uint8Array(rowLength)

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset]
    sourceOffset += 1
    const raw = inflated.subarray(sourceOffset, sourceOffset + rowLength)
    sourceOffset += rowLength
    const row = new Uint8Array(rowLength)

    for (let x = 0; x < rowLength; x += 1) {
      const left = x >= channels ? row[x - channels] : 0
      const up = previous[x] ?? 0
      const upperLeft = x >= channels ? previous[x - channels] ?? 0 : 0
      const value = raw[x]

      if (filter === 0) row[x] = value
      else if (filter === 1) row[x] = (value + left) & 0xff
      else if (filter === 2) row[x] = (value + up) & 0xff
      else if (filter === 3) row[x] = (value + Math.floor((left + up) / 2)) & 0xff
      else if (filter === 4) row[x] = (value + paethPredictor(left, up, upperLeft)) & 0xff
      else fail(`Unsupported screenshot PNG filter ${filter}.`)
    }

    for (let x = 0; x < width; x += 1) {
      const source = x * channels
      const target = (y * width + x) * 4
      rgba[target] = row[source]
      rgba[target + 1] = row[source + 1]
      rgba[target + 2] = row[source + 2]
      rgba[target + 3] = channels === 4 ? row[source + 3] : 255
    }

    previous = row
  }

  return { data: rgba, height, width }
}

export function getScreenshotPixel(image, x, y) {
  const offset = (y * image.width + x) * 4

  return [
    image.data[offset],
    image.data[offset + 1],
    image.data[offset + 2],
    image.data[offset + 3],
  ]
}

export function colorDistance(first, second) {
  return Math.abs(first[0] - second[0]) +
    Math.abs(first[1] - second[1]) +
    Math.abs(first[2] - second[2])
}

export function isGuideOverlayPixel(pixel) {
  const [red, green, blue] = pixel

  return blue > 145 && blue - red > 60 && blue - green > 35
}

export function getPaintBoundsFromScreenshot(buffer) {
  const image = decodePngRgba(buffer)
  const background = getScreenshotPixel(
    image,
    Math.floor(image.width / 2),
    image.height - 1,
  )
  const verticalGuideInset = Math.min(12, Math.floor(image.height / 6))
  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (
    let y = verticalGuideInset;
    y < image.height - verticalGuideInset;
    y += 1
  ) {
    for (let x = 1; x < image.width - 1; x += 1) {
      const pixel = getScreenshotPixel(image, x, y)
      if (
        pixel[3] < 24 ||
        colorDistance(pixel, background) <= 35 ||
        isGuideOverlayPixel(pixel)
      ) {
        continue
      }

      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
    }
  }

  if (!Number.isFinite(minX)) {
    fail('Screenshot analysis did not find visible text paint.')
  }

  return {
    height: image.height,
    left: minX,
    right: maxX,
    top: minY,
    bottom: maxY,
    width: image.width,
  }
}
