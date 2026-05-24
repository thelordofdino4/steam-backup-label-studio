import { invoke } from '@tauri-apps/api/core'
import { bytesToBase64 } from '../utils/bytesToBase64'

export type SteamSearchResult = {
  appId: number
  title: string
  tinyImage?: string
  price?: string
}

export type SteamArtworkAsset = {
  id: string
  label: string
  url: string
  kind: 'header' | 'capsule' | 'background' | 'logo' | 'screenshot' | 'library'
}

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
  storeUrl: string
  artwork: SteamArtworkAsset[]
}

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
    data?: {
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
      header_image?: string
      capsule_image?: string
      background_raw?: string
      screenshots?: Array<{
        id: number
        path_thumbnail: string
        path_full: string
      }>
    }
  }
>

function formatPrice(price?: { final?: number; currency?: string }) {
  if (!price || typeof price.final !== 'number') {
    return undefined
  }

  if (price.final === 0) {
    return 'Free'
  }

  return `${price.currency ?? 'USD'} ${(price.final / 100).toFixed(2)}`
}


function dedupeArtwork(artwork: SteamArtworkAsset[]) {
  const seen = new Set<string>()

  return artwork.filter((asset) => {
    if (seen.has(asset.url)) {
      return false
    }

    seen.add(asset.url)
    return true
  })
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
  const responseText = await invoke<string>('fetch_steam_app_details', {
    appid: appId,
  })
  const response = JSON.parse(responseText) as SteamAppDetailsResponse
  const entry = response[String(appId)]

  if (!entry?.success || !entry.data) {
    throw new Error(`Steam did not return details for App ID ${appId}.`)
  }

  const data = entry.data
  const title = data.name ?? `Steam App ${appId}`
  const artwork = dedupeArtwork([
    ...(data.header_image
      ? [
          {
            id: 'header-image',
            label: 'Store header image',
            url: data.header_image,
            kind: 'header' as const,
          },
        ]
      : []),
    ...(data.capsule_image
      ? [
          {
            id: 'capsule-image',
            label: 'Store capsule image',
            url: data.capsule_image,
            kind: 'capsule' as const,
          },
        ]
      : []),
    ...(data.background_raw
      ? [
          {
            id: 'background-raw',
            label: 'Store background image',
            url: data.background_raw,
            kind: 'background' as const,
          },
        ]
      : []),
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
    ...(data.screenshots ?? []).map((screenshot) => ({
      id: `screenshot-${screenshot.id}`,
      label: `Screenshot ${screenshot.id}`,
      url: screenshot.path_full,
      kind: 'screenshot' as const,
    })),
  ])

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
    storeUrl: `https://store.steampowered.com/app/${appId}`,
    artwork,
  }
}

export async function downloadSteamArtworkAsDataUrl(url: string) {
  const downloadedArtwork = await invoke<DownloadedArtwork>('download_steam_artwork', {
    url,
  })
  const base64 = bytesToBase64(downloadedArtwork.bytes)

  return `data:${downloadedArtwork.content_type};base64,${base64}`
}
