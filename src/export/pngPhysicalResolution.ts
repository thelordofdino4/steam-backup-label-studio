const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10] as const
const METRES_PER_INCH = 0.0254
const MAX_PNG_LENGTH = 0x7fffffff
const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, value) => {
  let crc = value
  for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
  return crc >>> 0
})

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff]
  return (crc ^ 0xffffffff) >>> 0
}

function invalid(detail: string): never {
  throw new Error(`Could not encode PNG physical resolution: ${detail}.`)
}

/**
 * Sets one canonical pHYs chunk in a canvas-produced PNG, without decoding or
 * re-encoding pixels. PNG stores integer pixels/metre; 300 DPI is 11811 px/m.
 * Bounds, CRCs and IHDR dimensions are checked before any destination write.
 */
export function encodePngPhysicalResolution(
  bytes: Uint8Array,
  dpi: number,
  expectedSize: Readonly<{ width: number; height: number }>,
): Uint8Array {
  const pixelsPerMetre = Math.round(dpi / METRES_PER_INCH)
  if (!Number.isFinite(dpi) || dpi <= 0 || pixelsPerMetre < 1 || pixelsPerMetre > 0xffffffff) {
    invalid('DPI cannot be represented')
  }
  for (const value of [expectedSize.width, expectedSize.height]) {
    if (!Number.isSafeInteger(value) || value < 1 || value > MAX_PNG_LENGTH) invalid('invalid canvas dimensions')
  }
  if (!PNG_SIGNATURE.every((byte, index) => bytes[index] === byte)) invalid('invalid PNG signature')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const chunks: Array<{ type: string; start: number; end: number }> = []
  let offset = PNG_SIGNATURE.length as number
  let removedBytes = 0
  let sawImageData = false
  let imageDataEnded = false
  let sawEnd = false
  while (offset < bytes.length) {
    if (bytes.length - offset < 12) invalid('truncated chunk')
    const length = view.getUint32(offset)
    if (length > MAX_PNG_LENGTH || length > bytes.length - offset - 12) invalid('invalid chunk length')
    const end = offset + length + 12
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8))
    if (!/^[A-Za-z]{2}[A-Z][A-Za-z]$/.test(type)) invalid('invalid chunk type')
    if (crc32(bytes.subarray(offset + 4, end - 4)) !== view.getUint32(end - 4)) invalid('chunk checksum mismatch')
    if (chunks.length === 0 && type !== 'IHDR') invalid('missing image header')
    if (type === 'IHDR') {
      if (chunks.length !== 0 || length !== 13) invalid('invalid image header')
      if (view.getUint32(offset + 8) !== expectedSize.width || view.getUint32(offset + 12) !== expectedSize.height) {
        invalid('encoded dimensions do not match the canvas')
      }
    }
    if (type === 'IDAT') {
      if (imageDataEnded) invalid('noncontiguous image data')
      sawImageData = true
    } else if (sawImageData) {
      imageDataEnded = true
    }
    if (type === 'pHYs') {
      if (length !== 9) invalid('invalid physical resolution chunk')
      removedBytes += end - offset
    }
    if (type === 'IEND') {
      if (length !== 0 || !sawImageData || end !== bytes.length) invalid('invalid image end')
      sawEnd = true
    }
    chunks.push({ type, start: offset, end })
    offset = end
  }
  if (!sawEnd) invalid('missing image end')

  const density = new Uint8Array(21)
  const densityView = new DataView(density.buffer)
  densityView.setUint32(0, 9)
  density.set([112, 72, 89, 115], 4) // pHYs
  densityView.setUint32(8, pixelsPerMetre)
  densityView.setUint32(12, pixelsPerMetre)
  density[16] = 1 // metre; never unspecified pixel aspect ratio
  densityView.setUint32(17, crc32(density.subarray(4, 17)))

  const output = new Uint8Array(bytes.length - removedBytes + density.length)
  output.set(PNG_SIGNATURE)
  let destination = PNG_SIGNATURE.length as number
  for (const chunk of chunks) {
    if (chunk.type === 'pHYs') continue
    output.set(bytes.subarray(chunk.start, chunk.end), destination)
    destination += chunk.end - chunk.start
    if (chunk.type === 'IHDR') {
      output.set(density, destination)
      destination += density.length
    }
  }
  return output
}
