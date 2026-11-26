import { MAX_IMPORTED_IMAGE_DATA_URL_BYTES } from './importedImagePolicy.ts'

const rasterToken = Symbol('accepted Disc raster')

/**
 * An exact, already accepted raster source. There is no process-wide name
 * table: retaining a reference retains its one backing string, and dropping
 * the final reference makes it collectible. The browser keeps ownership of
 * decoded image resources. No URL is allocated or revoked by this owner.
 */
export class DiscBackgroundRaster {
  readonly #source: string

  private constructor(token: typeof rasterToken, source: string) {
    if (token !== rasterToken) throw new TypeError('Invalid Disc raster constructor.')
    this.#source = source
    Object.freeze(this)
  }

  static owns(value: unknown): value is DiscBackgroundRaster {
    return typeof value === 'object' && value !== null && #source in value
  }

  static async stageAcceptedSource(source: string): Promise<DiscBackgroundAsset> {
    if (typeof source !== 'string') throw new TypeError('Invalid accepted Disc raster source.')
    // Caller already proved canonical raster intake via image validation or
    // native package hydration. Do not inspect even a prefix here: reading a
    // character can flatten a large rope. Keep the async ingress seam.
    return source.length > 0 && source.length <= MAX_IMPORTED_IMAGE_DATA_URL_BYTES
      ? new DiscBackgroundRaster(rasterToken, source)
      : legacyDiscBackgroundAsset(source)
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

export function readDiscBackgroundAsset(asset: DiscBackgroundAsset): string | null {
  return DiscBackgroundRaster.owns(asset) ? DiscBackgroundRaster.source(asset) : asset?.source ?? null
}

export function discBackgroundAssetsExactlyEqual(first: DiscBackgroundAsset, second: DiscBackgroundAsset): boolean {
  if (first === second) return true
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
