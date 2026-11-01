import assert from 'node:assert/strict'
import test from 'node:test'
import { deflateSync } from 'node:zlib'
import { encodePngPhysicalResolution } from './pngPhysicalResolution.ts'
import { canvasToPngBytes } from './canvasImage.ts'

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
// Deliberately independent bit-at-a-time CRC oracle, not the production table.
function crc(bytes: Uint8Array) {
  let result = 0xffffffff
  for (const byte of bytes) {
    result ^= byte
    for (let bit = 0; bit < 8; bit++) result = (result >>> 1) ^ ((result & 1) ? 0xedb88320 : 0)
  }
  return (result ^ 0xffffffff) >>> 0
}
function chunk(type: string, data = Buffer.alloc(0)) {
  const body = Buffer.concat([Buffer.from(type), data])
  const head = Buffer.alloc(4), tail = Buffer.alloc(4)
  head.writeUInt32BE(data.length)
  tail.writeUInt32BE(crc(body))
  return Buffer.concat([head, body, tail])
}
function density(ppm: number, unit = 1) {
  const data = Buffer.alloc(9)
  data.writeUInt32BE(ppm, 0)
  data.writeUInt32BE(ppm, 4)
  data[8] = unit
  return chunk('pHYs', data)
}
function fixture(extra: Buffer[] = []) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(2, 0)
  header.writeUInt32BE(1, 4)
  header[8] = 8; header[9] = 6
  return Buffer.concat([signature, chunk('IHDR', header), ...extra,
    chunk('tEXt', Buffer.from('Comment\0keep metadata')),
    chunk('IDAT', deflateSync(Buffer.from([0, 11, 22, 33, 255, 44, 55, 66, 0]))), chunk('IEND')])
}
function chunks(input: Uint8Array) {
  const bytes = Buffer.from(input)
  const result: Array<{ type: string; data: Buffer; bytes: Buffer }> = []
  for (let offset = 8; offset < bytes.length;) {
    const length = bytes.readUInt32BE(offset), end = offset + length + 12
    assert.ok(end <= bytes.length)
    assert.equal(crc(bytes.subarray(offset + 4, end - 4)), bytes.readUInt32BE(end - 4))
    result.push({ type: bytes.toString('ascii', offset + 4, offset + 8), data: bytes.subarray(offset + 8, end - 4), bytes: bytes.subarray(offset, end) })
    offset = end
  }
  return result
}
const size = { width: 2, height: 1 }

for (const [name, extra] of [
  ['missing', []], ['96 DPI', [density(3780)]], ['300 DPI', [density(11811)]],
  ['unspecified units', [density(1, 0)]], ['duplicate density', [density(3780), density(11811)]],
] as const) {
  test(`${name}: writes one exact 300 DPI pHYs before IDAT and preserves every other byte`, () => {
    const source = fixture([...extra])
    const before = Buffer.from(source)
    const output = encodePngPhysicalResolution(source, 300, size)
    const parsed = chunks(output)
    const physical = parsed.filter(({ type }) => type === 'pHYs')
    assert.equal(physical.length, 1)
    assert.equal(physical[0].bytes.toString('hex'), '000000097048597300002e2300002e230178a53f76')
    assert.ok(parsed.findIndex(({ type }) => type === 'pHYs') < parsed.findIndex(({ type }) => type === 'IDAT'))
    assert.deepEqual(parsed.filter(({ type }) => type !== 'pHYs').map(({ bytes }) => bytes),
      chunks(source).filter(({ type }) => type !== 'pHYs').map(({ bytes }) => bytes))
    assert.deepEqual(source, before)
    assert.deepEqual(encodePngPhysicalResolution(output, 300, size), output)
  })
}

test('Case DPI override and a byte-offset view are honored', () => {
  const source = fixture()
  const padded = Buffer.concat([Buffer.from([1, 2, 3]), source, Buffer.from([4])])
  const output = encodePngPhysicalResolution(padded.subarray(3, -1), 600, size)
  const phys = chunks(output).find(({ type }) => type === 'pHYs')!
  assert.equal(phys.data.readUInt32BE(0), 23622)
  assert.equal(phys.data.readUInt32BE(4), 23622)
  assert.equal(phys.data[8], 1)
})

test('unrepresentable DPI and invalid or mismatched canvas dimensions reject', () => {
  for (const dpi of [0, -1, NaN, Infinity, 1e20, 0.000001]) assert.throws(() => encodePngPhysicalResolution(fixture(), dpi, size), /DPI/)
  for (const width of [0, -1, NaN, Infinity, 1.5, 0x80000000]) assert.throws(() => encodePngPhysicalResolution(fixture(), 300, { width, height: 1 }), /dimensions/)
  assert.throws(() => encodePngPhysicalResolution(fixture(), 300, { width: 1, height: 1 }), /dimensions/)
})

test('malformed PNG framing, CRC, header and terminal chunks reject before byte publication', () => {
  const source = fixture(), records = chunks(source)
  const header = records[0].bytes, data = records.find(({ type }) => type === 'IDAT')!.bytes
  const corrupt = Buffer.from(source); corrupt[corrupt.length - 1] ^= 1
  const overlong = Buffer.from(source); overlong.writeUInt32BE(0xffffffff, 8)
  const invalid = [
    Buffer.from([1, 2]), source.subarray(0, 12), source.subarray(0, -1), source.subarray(0, -12),
    Buffer.concat([source, Buffer.from([0])]), corrupt, overlong,
    Buffer.concat([signature, data, chunk('IEND')]),
    Buffer.concat([signature, header, header, data, chunk('IEND')]),
    Buffer.concat([signature, header, chunk('IEND')]),
    Buffer.concat([signature, header, chunk('pHYs', Buffer.alloc(8)), data, chunk('IEND')]),
    Buffer.concat([signature, header, data, chunk('tEXt', Buffer.from('x\0y')), data, chunk('IEND')]),
    Buffer.concat([signature, header, data, chunk('IEND', Buffer.from([0]))]),
  ]
  for (const bytes of invalid) assert.throws(() => encodePngPhysicalResolution(bytes, 300, size), /Could not encode PNG/)
})

test('shared canvas adapter publishes only checked PNG bytes at the explicit caller DPI', async () => {
  const canvas = { ...size, toBlob(callback: BlobCallback, type: string) {
    assert.equal(type, 'image/png')
    callback(new Blob([new Uint8Array(fixture([density(3780)]))], { type }))
  } } as HTMLCanvasElement
  const output = await canvasToPngBytes(canvas, 600)
  assert.equal(chunks(Uint8Array.from(output)).find(({ type }) => type === 'pHYs')!.data.readUInt32BE(0), 23622)
})

test('null Blob, failed reads and invalid encoder output reject without success bytes', async () => {
  for (const blob of [null, { arrayBuffer: async () => { throw new Error('read failed') } }, new Blob(['invalid PNG'])]) {
    const canvas = { ...size, toBlob(callback: BlobCallback) { callback(blob as Blob | null) } } as HTMLCanvasElement
    await assert.rejects(canvasToPngBytes(canvas, 300))
  }
})
