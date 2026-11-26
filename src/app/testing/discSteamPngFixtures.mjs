import assert from 'node:assert/strict'
import { crc32, deflateSync } from 'node:zlib'
import { decodePngRgba } from '../../../scripts/text-editor-smoke-png.mjs'

function pngChunk(name, data) {
  const type = Buffer.from(name)
  const header = Buffer.alloc(8)
  const checksum = Buffer.alloc(4)
  header.writeUInt32BE(data.length)
  type.copy(header, 4)
  checksum.writeUInt32BE(crc32(Buffer.concat([type, data])))
  return Buffer.concat([header, data, checksum])
}

// Deliberately different sizes, color and off-center alpha bounds. No real assets.
function generatePng(id, width, height, bounds, rgb) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width)
  header.writeUInt32BE(height, 4)
  header.set([8, 6], 8)
  const stride = width * 4 + 1
  const rgba = Buffer.alloc(height * stride)
  for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
    for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
      rgba.set([...rgb, 255], y * stride + 1 + x * 4)
    }
  }
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header), pngChunk('IDAT', deflateSync(rgba)), pngChunk('IEND', Buffer.alloc(0)),
  ])

  const decoded = decodePngRgba(png)
  assert.deepEqual([decoded.width, decoded.height], [width, height])
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const offset = (y * width + x) * 4
    const inside = x >= bounds.x && x < bounds.x + bounds.width &&
      y >= bounds.y && y < bounds.y + bounds.height
    assert.deepEqual([...decoded.data.subarray(offset, offset + 4)], inside ? [...rgb, 255] : [0, 0, 0, 0])
  }
  return {
    id, width, height, bounds, bytes: [...png],
    dataUrl: 'data:image/png;base64,' + png.toString('base64'),
  }
}

export function makeDiscSteamPngFixtures(retiredAppId, incomingAppId) {
  const older = generatePng(retiredAppId, 24, 14, { x: 3, y: 2, width: 10, height: 5 }, [224, 43, 23])
  const newer = generatePng(incomingAppId, 30, 19, { x: 7, y: 4, width: 14, height: 8 }, [41, 153, 203])
  assert.notEqual(older.dataUrl, newer.dataUrl)
  return { older, newer }
}
