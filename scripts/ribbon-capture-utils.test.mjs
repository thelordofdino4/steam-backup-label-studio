import assert from 'node:assert/strict'
import test from 'node:test'
import zlib from 'node:zlib'
import {
  comparePixelBuffers,
  createManifestEntry,
  decodePngRgba,
  validateClientSize,
  validatePngScreenshot,
} from './ribbon-capture-utils.mjs'

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

test('client-size validation requires exact content dimensions', () => {
  assert.equal(
    validateClientSize({
      actualHeight: 650,
      actualWidth: 900,
      requestedHeight: 650,
      requestedWidth: 900,
    }).passed,
    true,
  )
  assert.equal(
    validateClientSize({
      actualHeight: 651,
      actualWidth: 900,
      requestedHeight: 650,
      requestedWidth: 900,
    }).passed,
    false,
  )
})

test('PNG validation rejects cropped, black, and transparent captures', () => {
  const colorful = createPng(4, 4, (x, y) => [
    32 + x * 30,
    64 + y * 30,
    x % 2 === 0 ? 180 : 40,
    255,
  ])
  const valid = validatePngScreenshot(colorful, {
    expectedHeight: 4,
    expectedWidth: 4,
    minColorfulPixelRatio: 0.01,
  })
  assert.equal(valid.passed, true)
  assert.equal(valid.stats.width, 4)
  assert.equal(valid.stats.height, 4)

  const cropped = validatePngScreenshot(colorful, {
    expectedHeight: 8,
    expectedWidth: 4,
    minColorfulPixelRatio: 0.01,
  })
  assert.equal(cropped.passed, false)
  assert.match(cropped.failures.join(' '), /expected full-window/)

  const black = validatePngScreenshot(
    createPng(4, 4, () => [0, 0, 0, 255]),
    { expectedHeight: 4, expectedWidth: 4 },
  )
  assert.equal(black.passed, false)
  assert.match(black.failures.join(' '), /nonblack|luminance/)

  const transparent = validatePngScreenshot(
    createPng(4, 4, () => [255, 0, 0, 0]),
    { expectedHeight: 4, expectedWidth: 4 },
  )
  assert.equal(transparent.passed, false)
  assert.match(transparent.failures.join(' '), /opaque/)
})

test('PNG decoder and comparison produce stable repeated capture hashes', () => {
  const first = createPng(3, 2, (x, y) => [x * 40, y * 50, 120, 255])
  const second = Buffer.from(first)
  const image = decodePngRgba(first)
  assert.equal(image.width, 3)
  assert.equal(image.height, 2)
  assert.equal(comparePixelBuffers(first, second).passed, true)
})

test('manifest entries must label browser versus Tauri capture methods', () => {
  const entry = createManifestEntry({
    activeRibbonTab: 'HTML',
    actualClient: { height: 650, width: 900 },
    branch: 'fix/native-ribbon-layout-rebuild',
    commitSha: 'abc123',
    devicePixelRatio: 1,
    domValidation: { failures: [], passed: true },
    editorModule: 'disc',
    method: 'browser',
    outerWindow: { height: 650, width: 900 },
    png: { failures: [], passed: true },
    requestedClient: { height: 650, width: 900 },
    screenshotPath: 'capture.png',
    screenshotPixels: { height: 650, width: 900 },
    selectedTextTarget: 'curved-copyright',
    timestamp: '2026-06-22T00:00:00.000Z',
  })
  assert.equal(entry.captureMethod, 'browser')
  assert.throws(
    () => createManifestEntry({ ...entry, method: 'crop' }),
    /browser or tauri/,
  )
})
