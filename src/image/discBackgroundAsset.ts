import { MAX_IMPORTED_IMAGE_DATA_URL_BYTES } from './importedImagePolicy.ts'

const rasterToken = Symbol('accepted Disc raster')

/**
 * An exact, already accepted raster source. There is no process-wide name
 * table: retaining a reference retains its one backing string, and dropping
 * the final reference makes it collectible. The browser keeps ownership of
 * decoded image resources. No URL is allocated or revoked by this owner.
 */
export class DiscBackgroundRaster {
  readonly id: string
  readonly encodedSourceBytes: number
  readonly #source: string

  private constructor(token: typeof rasterToken, id: string, source: string) {
    if (token !== rasterToken) throw new TypeError('Invalid Disc raster constructor.')
    this.id = id
    this.encodedSourceBytes = source.length
    this.#source = source
    Object.freeze(this)
  }

  static owns(value: unknown): value is DiscBackgroundRaster {
    return typeof value === 'object' && value !== null && #source in value
  }

  static async stageAcceptedSource(source: string): Promise<DiscBackgroundAsset> {
    if (typeof source !== 'string') throw new TypeError('Invalid accepted Disc raster source.')
    // This identifies the exact encoded representation, not the package
    // codec's independent hash of decoded payload bytes. MIME spelling and
    // base64 are never rewritten by this boundary.
    if (!isBoundedCanonicalRasterEnvelope(source)) return legacyDiscBackgroundAsset(source)
    try {
      const subtle = globalThis.crypto?.subtle
      if (!subtle) return legacyDiscBackgroundAsset(source)
      const chunkSize = 256 * 1024
      const chunks = new Uint8Array(Math.ceil(source.length / chunkSize) * 32)
      const encode = new TextEncoder()
      for (let offset = 0, i = 0; offset < source.length; offset += chunkSize, i++) {
        const digest = await subtle.digest('SHA-256', encode.encode(source.slice(offset, offset + chunkSize)))
        chunks.set(new Uint8Array(digest), i * 32)
      }
      const root = new Uint8Array(await subtle.digest('SHA-256', chunks))
      const hex = Array.from(root, byte => byte.toString(16).padStart(2, '0')).join('')
      return new DiscBackgroundRaster(rasterToken, `encoded-chunked256-sha256:${hex}`, source)
    } catch {
      // Resource/capability failure does not make already accepted artwork
      // invalid or silently change the bytes saved by the prior policy.
      return legacyDiscBackgroundAsset(source)
    }
  }

  static source(asset: DiscBackgroundRaster): string {
    return asset.#source
  }
}

Object.freeze(DiscBackgroundRaster)

type LegacyDiscBackgroundAsset = Readonly<{ kind: 'legacy-inline'; source: string }>
const ownedLegacyAssets = new WeakSet<object>()

export type DiscBackgroundAsset = DiscBackgroundRaster | LegacyDiscBackgroundAsset | null

export function isDiscBackgroundAsset(value: unknown): value is DiscBackgroundAsset {
  return value === null || DiscBackgroundRaster.owns(value) ||
    (typeof value === 'object' && value !== null && ownedLegacyAssets.has(value))
}

export function legacyDiscBackgroundAsset(source: string | null): DiscBackgroundAsset {
  if (source === null) return null
  if (typeof source !== 'string') throw new TypeError('Invalid legacy Disc background source.')
  const asset: LegacyDiscBackgroundAsset = Object.freeze({ kind: 'legacy-inline', source })
  ownedLegacyAssets.add(asset)
  return asset
}

function isBoundedCanonicalRasterEnvelope(source: string): boolean {
  if (source.length > MAX_IMPORTED_IMAGE_DATA_URL_BYTES) return false
  const comma = source.indexOf(',')
  if (comma < 0 || comma > 23 || comma + 1 >= source.length) return false
  const header = source.slice(0, comma)
  return /^data:image\/(?:png|jpeg|webp|gif|bmp);base64$/.test(header)
}

export function readDiscBackgroundAsset(asset: DiscBackgroundAsset): string | null {
  return DiscBackgroundRaster.owns(asset) ? DiscBackgroundRaster.source(asset) : asset?.source ?? null
}

export function discBackgroundAssetsExactlyEqual(first: DiscBackgroundAsset, second: DiscBackgroundAsset): boolean {
  if (first === second) return true
  if (DiscBackgroundRaster.owns(first) && DiscBackgroundRaster.owns(second) && first.id !== second.id) {
    return false
  }
  return readDiscBackgroundAsset(first) === readDiscBackgroundAsset(second)
}

export function reuseDiscBackgroundAsset(
  candidate: DiscBackgroundAsset,
  owned: DiscBackgroundAsset,
): DiscBackgroundAsset {
  if (DiscBackgroundRaster.owns(candidate) && !DiscBackgroundRaster.owns(owned)) return candidate
  return discBackgroundAssetsExactlyEqual(candidate, owned) ? owned : candidate
}

export function hasDiscBackgroundAsset(asset: DiscBackgroundAsset): boolean {
  return DiscBackgroundRaster.owns(asset) || Boolean(asset?.source)
}
