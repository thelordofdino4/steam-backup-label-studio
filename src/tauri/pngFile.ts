import { invoke } from '@tauri-apps/api/core'

const FRAME_MAGIC = new TextEncoder().encode('SBLSPEV1')
const FRAME_HEADER_BYTES = 12
export const MAX_PNG_DESTINATION_UTF8_BYTES = 128 * 1024

type InvokePngWrite = (command: string, body: Uint8Array) => Promise<void>

export function framePngWrite(path: string, bytes: Uint8Array): Uint8Array {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0) {
    throw new Error('PNG write request does not contain PNG bytes.')
  }
  // Reject ill-formed UTF-16 rather than silently replacing it with U+FFFD.
  if (typeof path !== 'string' || !path || path.includes('\0') || /[\uD800-\uDFFF]/u.test(path)) {
    throw new Error('PNG destination metadata is invalid.')
  }
  if (path.length > MAX_PNG_DESTINATION_UTF8_BYTES) {
    throw new Error('PNG destination metadata is too large.')
  }
  const encoded = new TextEncoder().encode(path)
  if (encoded.byteLength > MAX_PNG_DESTINATION_UTF8_BYTES) {
    throw new Error('PNG destination metadata is too large.')
  }
  const payloadOffset = FRAME_HEADER_BYTES + encoded.byteLength
  // One contiguous raw frame; no per-byte number boxing or JSON fallback.
  const frame = new Uint8Array(payloadOffset + bytes.byteLength)
  frame.set(FRAME_MAGIC)
  new DataView(frame.buffer).setUint32(8, encoded.byteLength, true)
  frame.set(encoded, FRAME_HEADER_BYTES)
  frame.set(bytes, payloadOffset)
  return frame
}

export function createPngFileWriter(invokeCommand: InvokePngWrite = invoke) {
  return async (path: string, bytes: Uint8Array): Promise<void> =>
    invokeCommand('write_export_png', framePngWrite(path, bytes))
}

export const writePngFile = createPngFileWriter()
