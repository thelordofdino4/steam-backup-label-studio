export type ArtworkFrameMaterialSeed = {
  algorithm: 'sha256-image-v1' | 'fallback-v1'
  key: string
  seed32: number
}

export type ArtworkFrameMaterialSeedPayload =
  | ArrayBuffer
  | ArrayBufferView
  | string

export type ArtworkFrameMaterialSeedCache = Map<
  string,
  Promise<ArtworkFrameMaterialSeed>
>

export type ArtworkFrameMaterialSeedOptions = {
  cache?: ArtworkFrameMaterialSeedCache
  crypto?: Pick<Crypto, 'subtle'> | null
}

const DEFAULT_MATERIAL_SEED_CACHE: ArtworkFrameMaterialSeedCache = new Map()
const BYTE_PAYLOAD_IDS = new WeakMap<object, number>()
let nextBytePayloadId = 0

function getBytePayloadId(payload: object) {
  const existingId = BYTE_PAYLOAD_IDS.get(payload)

  if (existingId) {
    return existingId
  }

  nextBytePayloadId += 1
  BYTE_PAYLOAD_IDS.set(payload, nextBytePayloadId)

  return nextBytePayloadId
}

function encodeText(value: string) {
  return new TextEncoder().encode(value)
}

function decodeBase64(value: string) {
  const normalized = value.replace(/\s+/g, '')

  if (typeof atob === 'function') {
    const binary = atob(normalized)
    const bytes = new Uint8Array(binary.length)

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }

    return bytes
  }

  const bufferConstructor = (globalThis as unknown as {
    Buffer?: {
      from: (value: string, encoding: 'base64') => Uint8Array
    }
  }).Buffer

  if (bufferConstructor) {
    return new Uint8Array(bufferConstructor.from(normalized, 'base64'))
  }

  throw new Error('Base64 decoding is not available in this environment.')
}

function getBytesFromDataUrl(value: string) {
  const commaIndex = value.indexOf(',')

  if (!value.startsWith('data:') || commaIndex < 0) {
    return encodeText(value)
  }

  const metadata = value.slice(5, commaIndex).toLowerCase()
  const payload = value.slice(commaIndex + 1)

  try {
    return metadata.includes(';base64')
      ? decodeBase64(payload)
      : encodeText(decodeURIComponent(payload))
  } catch {
    return encodeText(value)
  }
}

function getPayloadBytes(payload: ArtworkFrameMaterialSeedPayload) {
  if (typeof payload === 'string') {
    return getBytesFromDataUrl(payload)
  }

  if (payload instanceof ArrayBuffer) {
    return new Uint8Array(payload)
  }

  return new Uint8Array(
    payload.buffer,
    payload.byteOffset,
    payload.byteLength,
  )
}

function getPayloadCacheKey(payload: ArtworkFrameMaterialSeedPayload) {
  if (typeof payload === 'string') {
    return `string:${payload}`
  }

  if (payload instanceof ArrayBuffer) {
    return `array-buffer:${getBytePayloadId(payload)}:${payload.byteLength}`
  }

  return [
    'array-view',
    getBytePayloadId(payload),
    payload.byteOffset,
    payload.byteLength,
  ].join(':')
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function bytesToArrayBuffer(bytes: Uint8Array) {
  const buffer = new ArrayBuffer(bytes.byteLength)

  new Uint8Array(buffer).set(bytes)

  return buffer
}

function getSeed32(bytes: Uint8Array) {
  if (bytes.length >= 4) {
    return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
      .getUint32(0)
  }

  let seed = 0

  for (const byte of bytes) {
    seed = ((seed << 8) | byte) >>> 0
  }

  return seed >>> 0
}

function getFallbackHash(bytes: Uint8Array) {
  let hash = 2166136261

  for (const byte of bytes) {
    hash ^= byte
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

function getSubtleCrypto(options: ArtworkFrameMaterialSeedOptions) {
  if (options.crypto === null) {
    return null
  }

  return options.crypto?.subtle ?? globalThis.crypto?.subtle ?? null
}

async function createUncachedArtworkFrameMaterialSeed(
  payload: ArtworkFrameMaterialSeedPayload,
  options: ArtworkFrameMaterialSeedOptions,
): Promise<ArtworkFrameMaterialSeed> {
  const bytes = getPayloadBytes(payload)
  const subtle = getSubtleCrypto(options)

  if (subtle) {
    const digest = await subtle.digest('SHA-256', bytesToArrayBuffer(bytes))
    const digestBytes = new Uint8Array(digest)
    const digestHex = bytesToHex(digestBytes)

    return {
      algorithm: 'sha256-image-v1',
      key: `sha256-image-v1:${digestHex}`,
      seed32: getSeed32(digestBytes),
    }
  }

  const fallbackHash = getFallbackHash(bytes)
  const fallbackKey = fallbackHash.toString(16).padStart(8, '0')

  return {
    algorithm: 'fallback-v1',
    key: `fallback-v1:${fallbackKey}:${bytes.byteLength.toString(16)}`,
    seed32: fallbackHash,
  }
}

export function clearArtworkFrameMaterialSeedCache() {
  DEFAULT_MATERIAL_SEED_CACHE.clear()
}

export function createArtworkFrameMaterialSeed(
  payload: ArtworkFrameMaterialSeedPayload,
  options: ArtworkFrameMaterialSeedOptions = {},
) {
  const cache = options.cache ?? DEFAULT_MATERIAL_SEED_CACHE
  const cacheKey = getPayloadCacheKey(payload)
  const cached = cache.get(cacheKey)

  if (cached) {
    return cached
  }

  const seedPromise = createUncachedArtworkFrameMaterialSeed(payload, options)

  cache.set(cacheKey, seedPromise)

  return seedPromise
}

export async function resolveArtworkFrameMaterialSeed(
  payload: ArtworkFrameMaterialSeedPayload | null | undefined,
  options: ArtworkFrameMaterialSeedOptions = {},
) {
  if (!payload) {
    return null
  }

  try {
    return await createArtworkFrameMaterialSeed(payload, options)
  } catch {
    return null
  }
}
