import { invoke } from '@tauri-apps/api/core'
import { bytesToBase64 } from '../utils/bytesToBase64.ts'
import {
  createSteamArtworkAssets,
  type SteamArtworkAsset,
  type SteamArtworkAppDetailsData,
  type SteamLocalLibraryCacheAsset,
  type SteamStoreBrowseItemData,
} from './steamArtworkAssets.ts'

export type SteamSearchResult = {
  appId: number
  title: string
  tinyImage?: string
  price?: string
}

export type { SteamArtworkAsset } from './steamArtworkAssets.ts'

export type SteamImportedGame = {
  appId: number
  title: string
  developer: string[]
  publisher: string[]
  releaseDate?: string
  shortDescription?: string
  detailedDescription?: string
  genres: string[]
  categories: string[]
  minimumRequirements?: string
  recommendedRequirements?: string
  legalNotice?: string
  ratings?: SteamRatingBoardMap
  platforms?: SteamPlatformSupport
  website?: string
  storeUrl: string
  artwork: SteamArtworkAsset[]
}

export type SteamPlatformSupport = {
  windows?: boolean
  mac?: boolean
  linux?: boolean
}

export type SteamRatingBoardData = {
  rating?: string
  descriptors?: string
  required_age?: string
  use_age_gate?: string
  rating_generated?: string
  banned?: string
  [key: string]: unknown
}

export type SteamRatingBoardMap = Record<string, SteamRatingBoardData>

type DownloadedArtwork = {
  content_type: string
  bytes: number[]
}

type SteamStoreSearchResponse = {
  items?: Array<{
    id: number
    name: string
    tiny_image?: string
    price?: {
      final?: number
      currency?: string
    }
  }>
}

type SteamAppDetailsResponse = Record<
  string,
  {
    success: boolean
    data?: SteamArtworkAppDetailsData & {
      name?: string
      developers?: string[]
      publishers?: string[]
      release_date?: {
        date?: string
      }
      short_description?: string
      detailed_description?: string
      genres?: Array<{ description: string }>
      categories?: Array<{ description: string }>
      pc_requirements?: {
        minimum?: string
        recommended?: string
      }
      legal_notice?: string
      ratings?: SteamRatingBoardMap
      platforms?: {
        windows?: boolean
        mac?: boolean
        linux?: boolean
      }
      website?: string
    }
  }
>

type SteamStoreBrowseItemsResponse = {
  response?: {
    store_items?: SteamStoreBrowseItemData[]
  }
}

function formatPrice(price?: { final?: number; currency?: string }) {
  if (!price || typeof price.final !== 'number') {
    return undefined
  }

  if (price.final === 0) {
    return 'Free'
  }

  return `${price.currency ?? 'USD'} ${(price.final / 100).toFixed(2)}`
}


function normalizeSteamPlatformSupport(
  platforms: SteamPlatformSupport | undefined,
): SteamPlatformSupport | undefined {
  if (!platforms) {
    return undefined
  }

  const normalized: SteamPlatformSupport = {}

  if (typeof platforms.windows === 'boolean') {
    normalized.windows = platforms.windows
  }

  if (typeof platforms.mac === 'boolean') {
    normalized.mac = platforms.mac
  }

  if (typeof platforms.linux === 'boolean') {
    normalized.linux = platforms.linux
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined
}

async function fetchSteamStoreBrowseItems(
  appId: number,
): Promise<SteamStoreBrowseItemData[]> {
  const responseText = await invoke<string>('fetch_steam_store_items', {
    appid: appId,
  })
  const response = JSON.parse(responseText) as SteamStoreBrowseItemsResponse

  return (response.response?.store_items ?? []).filter((item) => {
    const itemAppId = item.appid ?? item.id

    return itemAppId === undefined || itemAppId === appId
  })
}

async function findSteamLibraryCacheAssets(
  appId: number,
): Promise<SteamLocalLibraryCacheAsset[]> {
  return invoke<SteamLocalLibraryCacheAsset[]>(
    'find_steam_library_cache_assets',
    { appid: appId },
  )
}

export async function searchSteamStore(term: string): Promise<SteamSearchResult[]> {
  const trimmedTerm = term.trim()

  if (!trimmedTerm) {
    return []
  }

  const responseText = await invoke<string>('search_steam_store', {
    term: trimmedTerm,
  })
  const response = JSON.parse(responseText) as SteamStoreSearchResponse

  return (response.items ?? []).map((item) => ({
    appId: item.id,
    title: item.name,
    tinyImage: item.tiny_image,
    price: formatPrice(item.price),
  }))
}

export async function importSteamApp(appId: number): Promise<SteamImportedGame> {
  const [responseText, storeBrowseItems, localLibraryCacheAssets] =
    await Promise.all([
      invoke<string>('fetch_steam_app_details', {
        appid: appId,
      }),
      fetchSteamStoreBrowseItems(appId).catch(() => []),
      findSteamLibraryCacheAssets(appId).catch(() => []),
    ])
  const response = JSON.parse(responseText) as SteamAppDetailsResponse
  const entry = response[String(appId)]

  if (!entry?.success || !entry.data) {
    throw new Error(`Steam did not return details for App ID ${appId}.`)
  }

  const data = entry.data
  const title = data.name ?? `Steam App ${appId}`
  const artwork = createSteamArtworkAssets(appId, {
    ...data,
    store_browse_items: storeBrowseItems,
    local_library_cache_assets: localLibraryCacheAssets,
  })

  return {
    appId,
    title,
    developer: data.developers ?? [],
    publisher: data.publishers ?? [],
    releaseDate: data.release_date?.date,
    shortDescription: data.short_description,
    detailedDescription: data.detailed_description,
    genres: (data.genres ?? []).map((genre) => genre.description),
    categories: (data.categories ?? []).map((category) => category.description),
    minimumRequirements: data.pc_requirements?.minimum,
    recommendedRequirements: data.pc_requirements?.recommended,
    legalNotice: data.legal_notice,
    ratings: data.ratings,
    platforms: normalizeSteamPlatformSupport(data.platforms),
    website: data.website,
    storeUrl: `https://store.steampowered.com/app/${appId}`,
    artwork,
  }
}

export async function fetchSteamPageHtml(url: string) {
  return invoke<string>('fetch_steam_page_html', { url })
}

export async function downloadSteamArtworkAsDataUrl(url: string) {
  const downloadedArtwork = await invoke<DownloadedArtwork>('download_steam_artwork', {
    url,
  })
  const base64 = bytesToBase64(downloadedArtwork.bytes)

  return `data:${downloadedArtwork.content_type};base64,${base64}`
}
