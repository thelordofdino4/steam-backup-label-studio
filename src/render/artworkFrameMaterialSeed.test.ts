import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createArtworkFrameMaterialSeed,
  resolveArtworkFrameMaterialSeed,
  type ArtworkFrameMaterialSeed,
  type ArtworkFrameMaterialSeedPayload,
} from './artworkFrameMaterialSeed.ts'

const SHA256_ABC =
  'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'

function createFreshCache() {
  return new Map<string, Promise<ArtworkFrameMaterialSeed>>()
}

function textBytes(value: string) {
  return new TextEncoder().encode(value)
}

function createCountingCrypto(digestCalls: { count: number }) {
  return {
    subtle: {
      digest: async (algorithm: AlgorithmIdentifier, data: BufferSource) => {
        digestCalls.count += 1
        return globalThis.crypto.subtle.digest(algorithm, data)
      },
    },
  } as unknown as Pick<Crypto, 'subtle'>
}

test('artwork frame material seed uses SHA-256 when Web Crypto is available', async (context) => {
  if (!globalThis.crypto?.subtle) {
    context.skip('Web Crypto is not available in this environment.')
    return
  }

  const seed = await createArtworkFrameMaterialSeed(
    'data:image/png;base64,YWJj',
    { cache: createFreshCache() },
  )

  assert.equal(seed.algorithm, 'sha256-image-v1')
  assert.equal(seed.key, `sha256-image-v1:${SHA256_ABC}`)
  assert.equal(seed.seed32, 0xba7816bf)
})

test('artwork frame material seed has deterministic fallback output', async () => {
  const cache = createFreshCache()
  const payload = textBytes('fallback-image')
  const firstSeed = await createArtworkFrameMaterialSeed(payload, {
    cache,
    crypto: null,
  })
  const secondSeed = await createArtworkFrameMaterialSeed(payload, {
    cache: createFreshCache(),
    crypto: null,
  })

  assert.equal(firstSeed.algorithm, 'fallback-v1')
  assert.deepEqual(secondSeed, firstSeed)
  assert.match(firstSeed.key, /^fallback-v1:[0-9a-f]{8}:[0-9a-f]+$/)
  assert.equal(firstSeed.seed32 > 0, true)
})

test('artwork frame material seed changes for different image payloads', async () => {
  const firstSeed = await createArtworkFrameMaterialSeed(
    'data:image/png;base64,Zmlyc3Q=',
    { cache: createFreshCache(), crypto: null },
  )
  const secondSeed = await createArtworkFrameMaterialSeed(
    'data:image/png;base64,c2Vjb25k',
    { cache: createFreshCache(), crypto: null },
  )

  assert.notEqual(secondSeed.key, firstSeed.key)
  assert.notEqual(secondSeed.seed32, firstSeed.seed32)
})

test('artwork frame material seed is stable for same image payload', async () => {
  const payload = 'data:image/png;base64,c2FtZS1pbWFnZQ=='
  const firstSeed = await createArtworkFrameMaterialSeed(payload, {
    cache: createFreshCache(),
    crypto: null,
  })
  const secondSeed = await createArtworkFrameMaterialSeed(payload, {
    cache: createFreshCache(),
    crypto: null,
  })

  assert.deepEqual(secondSeed, firstSeed)
})

test('artwork frame material seed caches unchanged payloads', async (context) => {
  if (!globalThis.crypto?.subtle) {
    context.skip('Web Crypto is not available in this environment.')
    return
  }

  const digestCalls = { count: 0 }
  const crypto = createCountingCrypto(digestCalls)
  const cache = createFreshCache()
  const payload: ArtworkFrameMaterialSeedPayload =
    'data:image/png;base64,Y2FjaGVkLWltYWdl'
  const firstSeed = await createArtworkFrameMaterialSeed(payload, {
    cache,
    crypto,
  })
  const secondSeed = await createArtworkFrameMaterialSeed(payload, {
    cache,
    crypto,
  })

  assert.deepEqual(secondSeed, firstSeed)
  assert.equal(digestCalls.count, 1)
})

test('artwork frame material seed resolver returns null without image payload', async () => {
  assert.equal(await resolveArtworkFrameMaterialSeed(null), null)
  assert.equal(await resolveArtworkFrameMaterialSeed(undefined), null)
})
