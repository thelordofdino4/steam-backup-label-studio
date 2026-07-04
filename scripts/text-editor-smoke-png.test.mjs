import assert from 'node:assert/strict'
import test from 'node:test'
import zlib from 'node:zlib'
import {
  decodePngRgba,
  getPaintBoundsFromScreenshot,
  getScreenshotPixel,
  isGuideOverlayPixel,
} from './text-editor-smoke-png.mjs'

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let index = 0; index < 8; index += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }

  return (crc ^ 0xffffffff) >>> 0
}

function createChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii')
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])))

  return Buffer.concat([length, typeBuffer, data, crc])
}

function createPng(width, height, pixelFactory) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const rowLength = width * 4
  const raw = Buffer.alloc((rowLength + 1) * height)
  let offset = 0
  for (let y = 0; y < height; y += 1) {
    raw[offset] = 0
    offset += 1
    for (let x = 0; x < width; x += 1) {
      const [red, green, blue, alpha] = pixelFactory(x, y)
      raw[offset] = red
      raw[offset + 1] = green
      raw[offset + 2] = blue
      raw[offset + 3] = alpha
      offset += 4
    }
  }

  return Buffer.concat([
    signature,
    createChunk('IHDR', ihdr),
    createChunk('IDAT', zlib.deflateSync(raw)),
    createChunk('IEND', Buffer.alloc(0)),
  ])
}

test('text editor smoke PNG helpers decode RGBA screenshots', () => {
  const png = createPng(3, 2, (x, y) => [10 + x, 20 + y, 30, 255])
  const image = decodePngRgba(png)

  assert.equal(image.width, 3)
  assert.equal(image.height, 2)
  assert.deepEqual(getScreenshotPixel(image, 2, 1), [12, 21, 30, 255])
})

test('text editor smoke paint bounds ignore background, transparency, and guide pixels', () => {
  const png = createPng(8, 8, (x, y) => {
    if (x >= 2 && x <= 4 && y >= 2 && y <= 5) return [220, 40, 40, 255]
    if (x === 6 && y >= 2 && y <= 5) return [20, 40, 220, 255]
    if (x === 1 && y === 3) return [0, 0, 0, 0]

    return [245, 245, 245, 255]
  })

  assert.deepEqual(getPaintBoundsFromScreenshot(png), {
    bottom: 5,
    height: 8,
    left: 2,
    right: 4,
    top: 2,
    width: 8,
  })
  assert.equal(isGuideOverlayPixel([20, 40, 220, 255]), true)
})

test('text editor smoke PNG helpers preserve failure wording', () => {
  assert.throws(
    () => decodePngRgba(Buffer.from('not a png')),
    /Screenshot was not a PNG\./,
  )
  assert.throws(
    () => getPaintBoundsFromScreenshot(
      createPng(4, 4, () => [245, 245, 245, 255]),
    ),
    /Screenshot analysis did not find visible text paint\./,
  )
})
