import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createSteamArtworkAssets,
  normalizeSteamArtworkUrl,
} from './steamArtworkAssets.ts'
import { getSteamTitleArtworkAssetCandidates } from './steamTitleArtworkImport.ts'
import type { SteamImportedGame } from './steamApi.ts'

const WARFRAME_APP_ID = 230410
const WARFRAME_LIBRARY_LOGO_HASH = '1d099ca9fd4a39a37981fe45b5066c7f880d141a'

function createSteamGame(artwork = createSteamArtworkAssets(WARFRAME_APP_ID, {})): SteamImportedGame {
  return {
    appId: WARFRAME_APP_ID,
    title: 'Warframe',
    developer: ['Digital Extremes'],
    publisher: ['Digital Extremes'],
    genres: [],
    categories: [],
    storeUrl: `https://store.steampowered.com/app/${WARFRAME_APP_ID}`,
    artwork,
  }
}

test('builds hashed Steam store item assets alongside legacy CDN fallbacks', () => {
  const artwork = createSteamArtworkAssets(WARFRAME_APP_ID, {
    header_image:
      'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/230410/60ce7425b864dd3c0dd855bfc66004c6f9ca4844/header.jpg?t=1778595605',
    capsule_image:
      'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/230410/80dd2d83df77e9037b14b0076713d2e63666192d/capsule_231x87.jpg?t=1778595605',
    background_raw:
      'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/230410/abe410dd90bf9c57d4279b19abf2a695faf50c6e/page_bg_raw.jpg?t=1778595605',
    library_assets_full: {
      library_logo: {
        image: {
          english: `${WARFRAME_LIBRARY_LOGO_HASH}/logo.png`,
        },
        image2x: {
          english: `${WARFRAME_LIBRARY_LOGO_HASH}/logo_2x.png`,
        },
      },
      library_header: {
        image: {
          english: '60ce7425b864dd3c0dd855bfc66004c6f9ca4844/library_header.jpg',
        },
      },
      library_hero: {
        image: {
          english: '9c95478bc7f8d8c7b93260030f5f2d4bd8bd9da2/library_hero.jpg',
        },
      },
    },
    screenshots: [
      {
        id: 257308474,
        path_thumbnail:
          'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/230410/ss_thumb.jpg',
        path_full:
          'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/230410/ss_full.jpg',
      },
    ],
  })

  assert.equal(
    artwork.find((asset) => asset.id === 'store-library-logo')?.url,
    `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/230410/${WARFRAME_LIBRARY_LOGO_HASH}/logo.png`,
  )
  assert.equal(
    artwork.find((asset) => asset.id === 'store-library-logo-2x')?.url,
    `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/230410/${WARFRAME_LIBRARY_LOGO_HASH}/logo_2x.png`,
  )
  assert.ok(artwork.some((asset) => asset.id === 'cdn-logo'))
  assert.ok(artwork.some((asset) => asset.id === 'cdn-library-capsule'))
  assert.ok(artwork.some((asset) => asset.id === 'screenshot-257308474'))
})

test('builds official StoreBrowse hashed assets returned outside appdetails', () => {
  const artwork = createSteamArtworkAssets(WARFRAME_APP_ID, {
    store_browse_items: [
      {
        appid: WARFRAME_APP_ID,
        assets: {
          asset_url_format: 'steam/apps/230410/${FILENAME}?t=1778595605',
          main_capsule:
            '0837adc4fa4f925a5550212a7cc586e940648bb7/capsule_616x353.jpg',
          main_capsule_2x:
            'd95df6f7e6ca48880fd4c3d50cecf3223a3fa784/capsule_616x353_2x.jpg',
          small_capsule:
            '80dd2d83df77e9037b14b0076713d2e63666192d/capsule_231x87.jpg',
          header: '60ce7425b864dd3c0dd855bfc66004c6f9ca4844/header.jpg',
          header_2x:
            '9ab86707d12867947e9beff841973f6a4d80b4fa/header_2x.jpg',
          library_capsule:
            'd34f5b8006b986b9a8fafd6429d6c71c36b3c6d6/library_capsule.jpg',
          library_hero:
            '9c95478bc7f8d8c7b93260030f5f2d4bd8bd9da2/library_hero.jpg',
          hero_capsule:
            '7d4b00bf186b2151db7a66386a77c141523d4223/hero_capsule.jpg',
          raw_page_background:
            'abe410dd90bf9c57d4279b19abf2a695faf50c6e/page_bg_raw.jpg',
        },
      },
    ],
  })

  assert.equal(
    artwork.find((asset) => asset.id === 'store-main-capsule')?.url,
    'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/230410/0837adc4fa4f925a5550212a7cc586e940648bb7/capsule_616x353.jpg',
  )
  assert.equal(
    artwork.find((asset) => asset.id === 'store-library-capsule')?.kind,
    'library',
  )
  assert.equal(
    artwork.find((asset) => asset.id === 'store-hero-capsule')?.label,
    'Steam hero capsule',
  )
  assert.equal(
    artwork.find((asset) => asset.id === 'store-background-raw')?.label,
    'Steam raw page background image',
  )
  assert.ok(artwork.some((asset) => asset.id === 'store-header-2x'))
})

test('builds local Steam library cache hashes as remote Store Item Asset URLs', () => {
  const artwork = createSteamArtworkAssets(WARFRAME_APP_ID, {
    local_library_cache_assets: [
      {
        relative_path: `${WARFRAME_LIBRARY_LOGO_HASH}/logo.png`,
        path:
          'C:\\Program Files (x86)\\Steam\\appcache\\librarycache\\230410\\1d099ca9fd4a39a37981fe45b5066c7f880d141a\\logo.png',
        label: 'logo.png',
      },
      {
        relative_path:
          '60ce7425b864dd3c0dd855bfc66004c6f9ca4844/library_header.jpg',
        label: 'library_header.jpg',
      },
      {
        relative_path: '22064646470f4c53388ba87774c7ac10f0a91ffa.jpg',
        label: '22064646470f4c53388ba87774c7ac10f0a91ffa.jpg',
      },
    ],
  })

  assert.equal(
    artwork.find((asset) => asset.id === 'store-library-logo')?.url,
    `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/230410/${WARFRAME_LIBRARY_LOGO_HASH}/logo.png`,
  )
  assert.equal(
    artwork.find((asset) => asset.id === 'store-library-header')?.label,
    'Steam library header',
  )
  assert.ok(
    artwork.some(
      (asset) =>
        asset.url ===
        'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/230410/22064646470f4c53388ba87774c7ac10f0a91ffa.jpg',
    ),
  )
})

test('title artwork prefers hashed library logos over legacy CDN logos', () => {
  const artwork = createSteamArtworkAssets(WARFRAME_APP_ID, {
    library_assets_full: {
      library_logo: {
        image: {
          english: `${WARFRAME_LIBRARY_LOGO_HASH}/logo.png`,
        },
      },
    },
  })
  const titleCandidates = getSteamTitleArtworkAssetCandidates(
    createSteamGame(artwork),
  )

  assert.deepEqual(
    titleCandidates.map((asset) => asset.id).slice(0, 2),
    ['store-library-logo', 'cdn-logo'],
  )
})

test('dedupes Steam assets by normalized host, path, and queryless URL', () => {
  const hash = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  const artwork = createSteamArtworkAssets(620, {
    header_image:
      `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/620/${hash}/header.jpg?t=1`,
    library_assets_full: {
      header_image:
        `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/620/${hash}/header.jpg?t=2`,
    },
    background_raw:
      'https://cdn.akamai.steamstatic.com/steam/apps/620/library_hero.jpg?t=1',
  })

  assert.equal(
    artwork.filter(
      (asset) =>
        normalizeSteamArtworkUrl(asset.url) ===
        `https://steamstatic.com/store_item_assets/steam/apps/620/${hash}/header.jpg`,
    ).length,
    1,
  )
  assert.equal(
    artwork.filter(
      (asset) =>
        normalizeSteamArtworkUrl(asset.url) ===
        'https://steamstatic.com/steam/apps/620/library_hero.jpg',
    ).length,
    1,
  )
})

test('ignores manifest URLs for other Steam app ids', () => {
  const artwork = createSteamArtworkAssets(620, {
    library_assets_full: {
      library_logo: {
        image: {
          english:
            'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/230410/1d099ca9fd4a39a37981fe45b5066c7f880d141a/logo.png',
        },
      },
    },
  })

  assert.equal(
    artwork.some((asset) => asset.id === 'store-library-logo'),
    false,
  )
  assert.ok(artwork.some((asset) => asset.id === 'cdn-logo'))
})
