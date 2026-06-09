export type SteamArtworkAssetKind =
  | 'header'
  | 'capsule'
  | 'background'
  | 'logo'
  | 'screenshot'
  | 'library'

export type SteamArtworkAsset = {
  id: string
  label: string
  url: string
  kind: SteamArtworkAssetKind
}

export type SteamStoreBrowseItemData = {
  appid?: number
  id?: number
  assets?: unknown
  assets_without_overrides?: unknown
}

export type SteamLocalLibraryCacheAsset = {
  relative_path?: string
  path?: string
  label?: string
}

export type SteamArtworkAppDetailsData = {
  header_image?: string
  capsule_image?: string
  capsule_imagev5?: string
  background?: string
  background_raw?: string
  library_assets?: unknown
  library_assets_full?: unknown
  assets?: unknown
  store_browse_items?: SteamStoreBrowseItemData[]
  local_library_cache_assets?: SteamLocalLibraryCacheAsset[]
  screenshots?: Array<{
    id: number
    path_thumbnail: string
    path_full: string
  }>
}

type StoreAssetDescriptor = {
  idBase: string
  label: string
  kind: SteamArtworkAssetKind
}

const STORE_ASSET_RELATIVE_PATH_PATTERN =
  /^([a-f0-9]{40}(?:\/[A-Za-z0-9_./%-]+\.(?:png|jpe?g|webp)|\.(?:png|jpe?g|webp)))$/i

const STORE_ASSET_URL_PATTERN =
  /\/store_item_assets\/steam\/apps\/(\d+)\/([a-f0-9]{40}(?:\/[^?#\s]+|\.(?:png|jpe?g|webp)))/i

function createSteamArtworkAsset(
  id: string,
  label: string,
  url: string | undefined,
  kind: SteamArtworkAssetKind,
): SteamArtworkAsset | null {
  const trimmedUrl = url?.trim()

  return trimmedUrl
    ? {
        id,
        label,
        url: trimmedUrl,
        kind,
      }
    : null
}

function compactArtworkAssets(
  assets: Array<SteamArtworkAsset | null>,
): SteamArtworkAsset[] {
  return assets.filter((asset): asset is SteamArtworkAsset => Boolean(asset))
}

function normalizeSteamStaticHost(host: string) {
  const normalizedHost = host.toLocaleLowerCase()

  return normalizedHost.endsWith('.steamstatic.com') ||
    normalizedHost === 'steamstatic.com'
    ? 'steamstatic.com'
    : normalizedHost
}

export function normalizeSteamArtworkUrl(url: string) {
  try {
    const parsedUrl = new URL(url)
    const host = normalizeSteamStaticHost(parsedUrl.hostname)
    const pathname = parsedUrl.pathname.replace(/\/+/g, '/')

    return `${parsedUrl.protocol.toLocaleLowerCase()}//${host}${pathname.toLocaleLowerCase()}`
  } catch {
    return url.trim().toLocaleLowerCase()
  }
}

function dedupeSteamArtworkAssets(assets: SteamArtworkAsset[]) {
  const seenUrls = new Set<string>()

  return assets.filter((asset) => {
    const key = normalizeSteamArtworkUrl(asset.url)

    if (seenUrls.has(key)) {
      return false
    }

    seenUrls.add(key)
    return true
  })
}

function withUniqueIds(assets: SteamArtworkAsset[]) {
  const seenIds = new Map<string, number>()

  return assets.map((asset) => {
    const seenCount = seenIds.get(asset.id) ?? 0
    seenIds.set(asset.id, seenCount + 1)

    return seenCount === 0
      ? asset
      : {
          ...asset,
          id: `${asset.id}-${seenCount + 1}`,
        }
  })
}

function createStoreItemAssetUrl(appId: number, value: string) {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return null
  }

  try {
    const parsedUrl = new URL(trimmedValue)
    const match = parsedUrl.pathname.match(STORE_ASSET_URL_PATTERN)

    return match?.[1] === String(appId) ? trimmedValue : null
  } catch {
    const relativePath = trimmedValue.match(STORE_ASSET_RELATIVE_PATH_PATTERN)?.[1]

    return relativePath
      ? `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/${relativePath}`
      : null
  }

  return null
}

function getStoreAssetFileName(url: string) {
  try {
    const parsedUrl = new URL(url)
    const parts = parsedUrl.pathname.split('/').filter(Boolean)

    return parts[parts.length - 1]?.toLocaleLowerCase() ?? ''
  } catch {
    const parts = url.split('/').filter(Boolean)

    return parts[parts.length - 1]?.toLocaleLowerCase() ?? ''
  }
}

function getStoreAssetDescriptor(
  contextPath: string[],
  url: string,
): StoreAssetDescriptor | null {
  const context = contextPath.join(' ').toLocaleLowerCase()
  const fileName = getStoreAssetFileName(url)
  const twoX = fileName.includes('_2x') || context.includes('_2x') ? ' (2x)' : ''

  if (context.includes('library_logo') || fileName === 'logo.png' ||
      fileName === 'logo_2x.png') {
    return {
      idBase: `store-library-logo${twoX ? '-2x' : ''}`,
      label: `Steam library logo${twoX}`,
      kind: 'logo',
    }
  }

  if (context.includes('library_header') ||
      fileName.startsWith('library_header')) {
    return {
      idBase: `store-library-header${twoX ? '-2x' : ''}`,
      label: `Steam library header${twoX}`,
      kind: 'header',
    }
  }

  if (context.includes('library_capsule') ||
      fileName.startsWith('library_capsule') ||
      fileName.startsWith('library_600x900')) {
    return {
      idBase: `store-library-capsule${twoX ? '-2x' : ''}`,
      label: `Steam library capsule${twoX}`,
      kind: 'library',
    }
  }

  if (context.includes('library_hero_blur') ||
      fileName.startsWith('library_hero_blur')) {
    return {
      idBase: `store-library-hero-blur${twoX ? '-2x' : ''}`,
      label: `Steam library hero blur${twoX}`,
      kind: 'library',
    }
  }

  if (context.includes('library_hero') ||
      fileName.startsWith('library_hero')) {
    return {
      idBase: `store-library-hero${twoX ? '-2x' : ''}`,
      label: `Steam library hero${twoX}`,
      kind: 'library',
    }
  }

  if (context.includes('hero_capsule') ||
      fileName.startsWith('hero_capsule')) {
    return {
      idBase: `store-hero-capsule${twoX ? '-2x' : ''}`,
      label: `Steam hero capsule${twoX}`,
      kind: 'library',
    }
  }

  if (context.includes('main_capsule') ||
      fileName.startsWith('capsule_616x353')) {
    return {
      idBase: `store-main-capsule${twoX ? '-2x' : ''}`,
      label: `Steam main capsule${twoX}`,
      kind: 'capsule',
    }
  }

  if (context.includes('small_capsule') ||
      fileName.startsWith('capsule_231x87') ||
      fileName.startsWith('capsule_184x69')) {
    return {
      idBase: `store-small-capsule${twoX ? '-2x' : ''}`,
      label: `Steam small capsule${twoX}`,
      kind: 'capsule',
    }
  }

  if (context.includes('header_image') ||
      context.endsWith(' header') ||
      context.endsWith(' header_2x') ||
      fileName === 'header.jpg' ||
      fileName === 'header_2x.jpg') {
    return {
      idBase: `store-header${twoX ? '-2x' : ''}`,
      label: `Steam store header${twoX}`,
      kind: 'header',
    }
  }

  if (fileName.startsWith('capsule_')) {
    return {
      idBase: `store-${fileName.replace(/\.[^.]+$/, '').replace(/_/g, '-')}`,
      label: `Steam store capsule${twoX}`,
      kind: 'capsule',
    }
  }

  if (context.includes('raw_page_background') ||
      fileName.includes('page_bg_raw')) {
    return {
      idBase: 'store-background-raw',
      label: 'Steam raw page background image',
      kind: 'background',
    }
  }

  if (context.includes('background') || fileName.includes('page_bg')) {
    return {
      idBase: 'store-background',
      label: 'Steam store background image',
      kind: 'background',
    }
  }

  const idBase = fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLocaleLowerCase()

  return idBase
    ? {
        idBase: `store-${idBase}`,
        label: `Steam asset ${fileName}`,
        kind: 'library',
      }
    : null
}

function collectManifestStoreAssets(
  appId: number,
  value: unknown,
  contextPath: string[] = [],
): SteamArtworkAsset[] {
  if (typeof value === 'string') {
    const url = createStoreItemAssetUrl(appId, value)

    if (!url) {
      return []
    }

    const descriptor = getStoreAssetDescriptor(contextPath, url)

    return descriptor
      ? [
          {
            id: descriptor.idBase,
            label: descriptor.label,
            url,
            kind: descriptor.kind,
          },
        ]
      : []
  }

  if (!value || typeof value !== 'object') {
    return []
  }

  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, nestedValue]) =>
      collectManifestStoreAssets(appId, nestedValue, [...contextPath, key]),
  )
}

function createManifestSteamArtworkAssets(
  appId: number,
  data: SteamArtworkAppDetailsData,
) {
  return [
    ...collectManifestStoreAssets(appId, data.library_assets_full, [
      'library_assets_full',
    ]),
    ...collectManifestStoreAssets(appId, data.library_assets, [
      'library_assets',
    ]),
    ...collectManifestStoreAssets(appId, data.assets, ['assets']),
    ...collectManifestStoreAssets(appId, data.store_browse_items, [
      'store_browse_items',
    ]),
    ...collectManifestStoreAssets(appId, data.local_library_cache_assets, [
      'local_library_cache_assets',
    ]),
  ]
}

function createAppDetailsSteamArtworkAssets(data: SteamArtworkAppDetailsData) {
  return compactArtworkAssets([
    createSteamArtworkAsset(
      'header-image',
      'Store header image',
      data.header_image,
      'header',
    ),
    createSteamArtworkAsset(
      'capsule-image',
      'Store capsule image',
      data.capsule_image,
      'capsule',
    ),
    createSteamArtworkAsset(
      'capsule-image-v5',
      'Store small capsule image',
      data.capsule_imagev5,
      'capsule',
    ),
    createSteamArtworkAsset(
      'background-raw',
      'Store background image',
      data.background_raw ?? data.background,
      'background',
    ),
  ])
}

function createLegacySteamArtworkAssets(appId: number) {
  return [
    {
      id: 'cdn-header',
      label: 'Steam CDN header image',
      url: `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`,
      kind: 'header' as const,
    },
    {
      id: 'cdn-capsule-large',
      label: 'Steam CDN large capsule',
      url: `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/capsule_616x353.jpg`,
      kind: 'capsule' as const,
    },
    {
      id: 'cdn-logo',
      label: 'Steam CDN logo',
      url: `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/logo.png`,
      kind: 'logo' as const,
    },
    {
      id: 'cdn-library-capsule',
      label: 'Steam library capsule',
      url: `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`,
      kind: 'library' as const,
    },
    {
      id: 'cdn-library-hero',
      label: 'Steam library hero',
      url: `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_hero.jpg`,
      kind: 'library' as const,
    },
  ]
}

function createScreenshotSteamArtworkAssets(data: SteamArtworkAppDetailsData) {
  return (data.screenshots ?? []).map((screenshot) => ({
    id: `screenshot-${screenshot.id}`,
    label: `Screenshot ${screenshot.id}`,
    url: screenshot.path_full,
    kind: 'screenshot' as const,
  }))
}

export function createSteamArtworkAssets(
  appId: number,
  data: SteamArtworkAppDetailsData,
): SteamArtworkAsset[] {
  return withUniqueIds(
    dedupeSteamArtworkAssets([
      ...createAppDetailsSteamArtworkAssets(data),
      ...createManifestSteamArtworkAssets(appId, data),
      ...createLegacySteamArtworkAssets(appId),
      ...createScreenshotSteamArtworkAssets(data),
    ]),
  )
}

export function isSteamStoreItemAsset(asset: SteamArtworkAsset) {
  return STORE_ASSET_URL_PATTERN.test(asset.url)
}

export function getSteamTitleArtworkAssetPriority(asset: SteamArtworkAsset) {
  const label = asset.label.toLocaleLowerCase()

  if (asset.kind !== 'logo') {
    return Number.POSITIVE_INFINITY
  }

  if (isSteamStoreItemAsset(asset) && label.includes('library logo')) {
    return 0
  }

  if (isSteamStoreItemAsset(asset)) {
    return 1
  }

  if (asset.id === 'cdn-logo' || label === 'steam cdn logo') {
    return 2
  }

  return 3
}
