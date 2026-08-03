const SHA256_ROUND_CONSTANTS = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
  0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
  0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
  0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
  0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
])

function rotateRight(value: number, amount: number) {
  return (value >>> amount) | (value << (32 - amount))
}

const SHA256_BLOCK_BYTE_LENGTH = 64
const SHA256_LENGTH_BYTE_OFFSET = 56
const UTF16_CHUNK_CODE_UNITS = 16 * 1024
const UTF8_CHUNK_BYTE_LENGTH = UTF16_CHUNK_CODE_UNITS * 3

class CaseInsertPresetSha256Digest {
  private readonly state = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ])

  private readonly words = new Uint32Array(64)
  private readonly pending = new Uint8Array(SHA256_BLOCK_BYTE_LENGTH)
  private pendingLength = 0
  private byteLength = 0
  private finalized = false

  update(bytes: Uint8Array) {
    if (this.finalized) {
      throw new Error('Cannot update a finalized identity digest.')
    }
    const nextByteLength = this.byteLength + bytes.length
    if (!Number.isSafeInteger(nextByteLength) ||
        nextByteLength > Number.MAX_SAFE_INTEGER / 8) {
      throw new Error('Identity digest input is too large.')
    }
    this.byteLength = nextByteLength

    let offset = 0
    if (this.pendingLength > 0) {
      const copied = Math.min(
        SHA256_BLOCK_BYTE_LENGTH - this.pendingLength,
        bytes.length,
      )
      this.pending.set(bytes.subarray(0, copied), this.pendingLength)
      this.pendingLength += copied
      offset += copied
      if (this.pendingLength === SHA256_BLOCK_BYTE_LENGTH) {
        this.compress(this.pending, 0)
        this.pendingLength = 0
      }
    }

    while (offset + SHA256_BLOCK_BYTE_LENGTH <= bytes.length) {
      this.compress(bytes, offset)
      offset += SHA256_BLOCK_BYTE_LENGTH
    }
    if (offset < bytes.length) {
      this.pending.set(bytes.subarray(offset), 0)
      this.pendingLength = bytes.length - offset
    }
  }

  finish() {
    if (this.finalized) {
      throw new Error('Identity digest was already finalized.')
    }
    this.finalized = true

    const finalByteLength = this.pendingLength < SHA256_LENGTH_BYTE_OFFSET
      ? SHA256_BLOCK_BYTE_LENGTH
      : SHA256_BLOCK_BYTE_LENGTH * 2
    const finalBytes = new Uint8Array(finalByteLength)
    finalBytes.set(this.pending.subarray(0, this.pendingLength))
    finalBytes[this.pendingLength] = 0x80

    const bitLength = this.byteLength * 8
    const view = new DataView(finalBytes.buffer)
    view.setUint32(
      finalByteLength - 8,
      Math.floor(bitLength / 0x1_0000_0000),
    )
    view.setUint32(finalByteLength - 4, bitLength >>> 0)
    for (let offset = 0; offset < finalByteLength;
      offset += SHA256_BLOCK_BYTE_LENGTH) {
      this.compress(finalBytes, offset)
    }

    return [...this.state]
      .map((word) => word.toString(16).padStart(8, '0'))
      .join('')
  }

  private compress(bytes: Uint8Array, offset: number) {
    for (let index = 0; index < 16; index += 1) {
      const byteOffset = offset + index * 4
      this.words[index] = (
        (bytes[byteOffset]! << 24) |
        (bytes[byteOffset + 1]! << 16) |
        (bytes[byteOffset + 2]! << 8) |
        bytes[byteOffset + 3]!
      ) >>> 0
    }

    let a = this.state[0]!
    let b = this.state[1]!
    let c = this.state[2]!
    let d = this.state[3]!
    let e = this.state[4]!
    let f = this.state[5]!
    let g = this.state[6]!
    let h = this.state[7]!
    for (let index = 0; index < 64; index += 1) {
      let word = this.words[index]!
      if (index >= 16) {
        const previous15 = this.words[index - 15]!
        const previous2 = this.words[index - 2]!
        const small0 = rotateRight(previous15, 7) ^
          rotateRight(previous15, 18) ^ (previous15 >>> 3)
        const small1 = rotateRight(previous2, 17) ^
          rotateRight(previous2, 19) ^ (previous2 >>> 10)
        word = (this.words[index - 16]! + small0 +
          this.words[index - 7]! + small1) >>> 0
        this.words[index] = word
      }
      const big1 = rotateRight(e!, 6) ^ rotateRight(e!, 11) ^
        rotateRight(e!, 25)
      const choose = (e! & f!) ^ (~e! & g!)
      const temp1 = (h! + big1 + choose + SHA256_ROUND_CONSTANTS[index]! +
        word) >>> 0
      const big0 = rotateRight(a!, 2) ^ rotateRight(a!, 13) ^
        rotateRight(a!, 22)
      const majority = (a! & b!) ^ (a! & c!) ^ (b! & c!)
      const temp2 = (big0 + majority) >>> 0
      h = g
      g = f
      f = e
      e = (d! + temp1) >>> 0
      d = c
      c = b
      b = a
      a = (temp1 + temp2) >>> 0
    }
    this.state[0] = (this.state[0]! + a!) >>> 0
    this.state[1] = (this.state[1]! + b!) >>> 0
    this.state[2] = (this.state[2]! + c!) >>> 0
    this.state[3] = (this.state[3]! + d!) >>> 0
    this.state[4] = (this.state[4]! + e!) >>> 0
    this.state[5] = (this.state[5]! + f!) >>> 0
    this.state[6] = (this.state[6]! + g!) >>> 0
    this.state[7] = (this.state[7]! + h!) >>> 0
  }
}

function wouldSplitSurrogatePair(value: string, offset: number) {
  if (offset <= 0 || offset >= value.length) return false
  const previous = value.charCodeAt(offset - 1)
  const next = value.charCodeAt(offset)
  return previous >= 0xd800 && previous <= 0xdbff &&
    next >= 0xdc00 && next <= 0xdfff
}

function isHighSurrogate(value: number) {
  return value >= 0xd800 && value <= 0xdbff
}

function isLowSurrogate(value: number) {
  return value >= 0xdc00 && value <= 0xdfff
}

function updateDigestWithStringRange(
  digest: CaseInsertPresetSha256Digest,
  encoder: TextEncoder,
  utf8Buffer: Uint8Array,
  value: string,
  start: number,
  limit: number,
) {
  let offset = start
  while (offset < limit) {
    let end = Math.min(offset + UTF16_CHUNK_CODE_UNITS, limit)
    if (wouldSplitSurrogatePair(value, end)) end -= 1
    const chunk = value.slice(offset, end)
    const encoded = encoder.encodeInto(chunk, utf8Buffer)
    if (encoded.read !== chunk.length) {
      throw new Error('Identity digest UTF-8 buffer is insufficient.')
    }
    digest.update(utf8Buffer.subarray(0, encoded.written))
    offset = end
  }
}

/**
 * Pure synchronous SHA-256 for deterministic transient workflow identities.
 * Input is encoded incrementally so the digest does not allocate a complete
 * UTF-8 source buffer or padded message. It avoids Node, Web Crypto, and
 * runtime-command dependencies.
 */
export function createCaseInsertPresetIdentityDigestFromChunks(
  chunks: Iterable<string>,
) {
  const digest = new CaseInsertPresetSha256Digest()
  const encoder = new TextEncoder()
  const utf8Buffer = new Uint8Array(UTF8_CHUNK_BYTE_LENGTH)
  let trailingHighSurrogate: number | null = null
  for (const value of chunks) {
    if (typeof value !== 'string') {
      throw new Error('Identity digest chunks must be strings.')
    }
    let start = 0
    if (trailingHighSurrogate !== null && value.length > 0) {
      if (isLowSurrogate(value.charCodeAt(0))) {
        updateDigestWithStringRange(
          digest,
          encoder,
          utf8Buffer,
          String.fromCharCode(trailingHighSurrogate, value.charCodeAt(0)),
          0,
          2,
        )
        start = 1
      } else {
        updateDigestWithStringRange(
          digest,
          encoder,
          utf8Buffer,
          String.fromCharCode(trailingHighSurrogate),
          0,
          1,
        )
      }
      trailingHighSurrogate = null
    }
    if (start >= value.length) continue

    let limit = value.length
    const finalCodeUnit = value.charCodeAt(limit - 1)
    if (isHighSurrogate(finalCodeUnit)) {
      trailingHighSurrogate = finalCodeUnit
      limit -= 1
    }
    updateDigestWithStringRange(
      digest,
      encoder,
      utf8Buffer,
      value,
      start,
      limit,
    )
  }
  if (trailingHighSurrogate !== null) {
    updateDigestWithStringRange(
      digest,
      encoder,
      utf8Buffer,
      String.fromCharCode(trailingHighSurrogate),
      0,
      1,
    )
  }
  return digest.finish()
}

export function createCaseInsertPresetIdentityDigest(value: string) {
  return createCaseInsertPresetIdentityDigestFromChunks([value])
}
