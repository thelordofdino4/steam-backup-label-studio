import assert from 'node:assert/strict'
import test from 'node:test'
import { createPngFileWriter, framePngWrite, MAX_PNG_DESTINATION_UTF8_BYTES } from './pngFile.ts'

const crossLanguageFrame = new Uint8Array([83, 66, 76, 83, 80, 69, 86, 49, 28, 0, 0, 0, 67, 58, 92, 74, 97, 195, 169, 110, 92, 228, 191, 157, 229, 173, 152, 32, 240, 159, 146, 191, 37, 50, 48, 33, 46, 112, 110, 103, 0, 255, 33])

test('renderer passes one raw frame with exact Unicode path and only the requested typed-array subview', async () => {
  const path = 'C:\\Ja\u00e9n\\\u4fdd\u5b58 \u{1f4bf}%20!.png'
  const original = new Uint8Array([77, 0, 255, 33, 88])
  const bytes = original.subarray(1, 4)
  const calls: unknown[][] = []
  const write = createPngFileWriter(async (...args) => { calls.push(args) })
  await write(path, bytes)
  assert.deepEqual(calls, [['write_export_png', crossLanguageFrame]])
  assert.deepEqual(original, new Uint8Array([77, 0, 255, 33, 88]))
})

test('long Windows Unicode paths avoid percent expansion and preserve exact path text', () => {
  const path = '\\\\?\\C:\\' + '\u4fdd\u5b58\\'.repeat(500) + 'output.png'
  const frame = framePngWrite(path, new Uint8Array([1]))
  const length = new DataView(frame.buffer).getUint32(8, true)
  assert.equal(new TextDecoder().decode(frame.subarray(12, 12 + length)), path)
  assert.equal(frame.at(-1), 1)
  assert.equal(framePngWrite('a'.repeat(MAX_PNG_DESTINATION_UTF8_BYTES), new Uint8Array([1])).length,
    MAX_PNG_DESTINATION_UTF8_BYTES + 13)
})

test('malformed metadata and wrong body fail before any native invoke; rejection has no fallback', async () => {
  let calls = 0
  const nativeError = 'PNG destination commit failed during destination replacement: locked.'
  const write = createPngFileWriter(async () => { calls += 1; throw nativeError })
  const bytes = new Uint8Array([1])
  for (const path of ['', 'bad\0.png', '\uD800.png', '\uDC00.png']) {
    await assert.rejects(write(path, bytes), /metadata is invalid/)
  }
  for (const path of ['a'.repeat(MAX_PNG_DESTINATION_UTF8_BYTES + 1), '保'.repeat(50_000)]) {
    await assert.rejects(write(path, bytes), /metadata is too large/)
  }
  await assert.rejects(write('out.png', [] as unknown as Uint8Array), /does not contain PNG bytes/)
  await assert.rejects(write('out.png', new Uint8Array()), /does not contain PNG bytes/)
  assert.equal(calls, 0)
  await assert.rejects(write('out.png', bytes), error => error === nativeError)
  assert.equal(calls, 1)
})
