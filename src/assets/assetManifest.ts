import type {
  DiscNumberBadgeSet,
  GameRatingSystem,
  MediaMarkTheme,
  MediaMarkValue,
  PlatformMarkTheme,
  PlatformMarkValue,
  ProjectMetadata,
  TechnicalMarkValue,
  BackgroundImageSize,
} from '../project/projectTypes'
import {
  normalizeEsrbRatingValue,
  normalizePegiRatingValue,
  normalizeUskRatingValue,
  type EsrbRatingValue,
  type PegiRatingValue,
  type UskRatingValue,
} from '../project/projectMetadata.ts'

type LogoPlaceholderKind = 'developer' | 'publisher'
type RatingBadgePlaceholderKind = Exclude<GameRatingSystem, 'none'>
type MediaMarkPlaceholderImageUrls = string | {
  light: string
  dark: string
}
type PlatformMarkPlaceholderImageUrls = string | {
  color: string
  light: string
  dark: string
} | Partial<Record<PlatformMarkTheme, string>>
type ThemedPlaceholderImageSizes<TTheme extends string> =
  | BackgroundImageSize
  | Partial<Record<TTheme, BackgroundImageSize>>
type StatusToastIconKind =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'steam'
  | 'artwork'
  | 'template'
  | 'export'
  | 'project'
  | 'logo'
  | 'text'

export type BuiltInImageAsset = {
  id: string
  imageUrl: string
  imageSize: BackgroundImageSize
}

function createImageSize(
  width: number,
  height: number,
  contentBounds?: BackgroundImageSize['contentBounds'],
): BackgroundImageSize {
  const fullContentBounds =
    contentBounds &&
    contentBounds.x === 0 &&
    contentBounds.y === 0 &&
    contentBounds.width === width &&
    contentBounds.height === height

  return contentBounds && !fullContentBounds
    ? { width, height, contentBounds }
    : { width, height }
}

function createBuiltInImageAsset(
  id: string,
  imageUrl: string,
  imageSize: BackgroundImageSize,
): BuiltInImageAsset {
  return {
    id,
    imageUrl,
    imageSize,
  }
}

function pushThemedBuiltInImageAssets<TTheme extends string>(
  assets: BuiltInImageAsset[],
  idPrefix: string,
  imageUrls: string | Partial<Record<TTheme, string>>,
  imageSizes: ThemedPlaceholderImageSizes<TTheme>,
) {
  if (typeof imageUrls === 'string') {
    const imageSize = isBackgroundImageSize(imageSizes) ? imageSizes : null

    if (imageSize) {
      assets.push(createBuiltInImageAsset(idPrefix, imageUrls, imageSize))
    }

    return
  }

  Object.entries(imageUrls).forEach(([theme, imageUrl]) => {
    if (typeof imageUrl !== 'string') {
      return
    }

    const imageSize = isBackgroundImageSize(imageSizes)
      ? imageSizes
      : imageSizes[theme as TTheme]

    if (imageSize) {
      assets.push(
        createBuiltInImageAsset(`${idPrefix}:${theme}`, imageUrl, imageSize),
      )
    }
  })
}

// The saved-project source value is still "placeholder" for compatibility.
// Assets without "placeholder" in the filename are organized as official
// built-ins under domain folders; true temporary fallbacks stay in
// `assets/placeholders/`.
export const DEFAULT_STEAM_BANNER_LOCKUP_IMAGE_URL = new URL(
  './steam-banner/steam-default-logo.png',
  import.meta.url,
).href

export const DEFAULT_STEAM_BANNER_SPINE_ICON_IMAGE_URL = new URL(
  './toast-icons/toast-steam.png',
  import.meta.url,
).href

export const DEFAULT_STEAM_BANNER_LOCKUP_IMAGE_SIZE: BackgroundImageSize =
  createImageSize(388, 117)

export const DEFAULT_STEAM_BANNER_SPINE_ICON_IMAGE_SIZE: BackgroundImageSize =
  createImageSize(48, 48, { x: 1, y: 1, width: 46, height: 46 })

export const LOGO_PLACEHOLDER_IMAGE_URLS: Record<LogoPlaceholderKind, string> = {
  developer: new URL(
    './placeholders/logos/developer-logo-placeholder.svg',
    import.meta.url,
  ).href,
  publisher: new URL(
    './placeholders/logos/publisher-logo-placeholder.svg',
    import.meta.url,
  ).href,
}

const LOGO_PLACEHOLDER_IMAGE_SIZES: Record<LogoPlaceholderKind, BackgroundImageSize> = {
  developer: createImageSize(480, 180),
  publisher: createImageSize(480, 180),
}

const ESRB_RATING_BADGE_IMAGE_URLS: Record<EsrbRatingValue, string> = {
  E: new URL(
    './rating/esrb/rating-badge-esrb-e.svg',
    import.meta.url,
  ).href,
  'E10+': new URL(
    './rating/esrb/rating-badge-esrb-e10-plus.svg',
    import.meta.url,
  ).href,
  T: new URL(
    './rating/esrb/rating-badge-esrb-t.svg',
    import.meta.url,
  ).href,
  M: new URL(
    './rating/esrb/rating-badge-esrb-m.svg',
    import.meta.url,
  ).href,
  AO: new URL(
    './rating/esrb/rating-badge-esrb-ao.svg',
    import.meta.url,
  ).href,
  RP: new URL(
    './rating/esrb/rating-badge-esrb-rp.svg',
    import.meta.url,
  ).href,
  'RP17+': new URL(
    './rating/esrb/rating-badge-esrb-rp17-plus.svg',
    import.meta.url,
  ).href,
}

const PEGI_RATING_BADGE_IMAGE_URLS: Record<PegiRatingValue, string> = {
  '3': new URL(
    './rating/pegi/rating-badge-pegi-3.png',
    import.meta.url,
  ).href,
  '7': new URL(
    './rating/pegi/rating-badge-pegi-7.png',
    import.meta.url,
  ).href,
  '12': new URL(
    './rating/pegi/rating-badge-pegi-12.png',
    import.meta.url,
  ).href,
  '16': new URL(
    './rating/pegi/rating-badge-pegi-16.png',
    import.meta.url,
  ).href,
  '18': new URL(
    './rating/pegi/rating-badge-pegi-18.png',
    import.meta.url,
  ).href,
}

const USK_RATING_BADGE_IMAGE_URLS: Record<UskRatingValue, string> = {
  '0': new URL(
    './rating/usk/rating-badge-usk-0.svg',
    import.meta.url,
  ).href,
  '6': new URL(
    './rating/usk/rating-badge-usk-6.svg',
    import.meta.url,
  ).href,
  '12': new URL(
    './rating/usk/rating-badge-usk-12.svg',
    import.meta.url,
  ).href,
  '16': new URL(
    './rating/usk/rating-badge-usk-16.svg',
    import.meta.url,
  ).href,
  '18': new URL(
    './rating/usk/rating-badge-usk-18.svg',
    import.meta.url,
  ).href,
}

const RATING_BADGE_PLACEHOLDER_IMAGE_URLS: Record<Exclude<RatingBadgePlaceholderKind, 'ESRB' | 'PEGI' | 'USK'>, string> = {
  custom: new URL(
    './placeholders/rating/rating-badge-custom-placeholder.svg',
    import.meta.url,
  ).href,
}

const ESRB_RATING_BADGE_IMAGE_SIZES: Record<EsrbRatingValue, BackgroundImageSize> = {
  E: createImageSize(60, 91),
  'E10+': createImageSize(60, 91),
  T: createImageSize(60, 91),
  M: createImageSize(60, 91),
  AO: createImageSize(60, 91),
  RP: createImageSize(144, 215),
  'RP17+': createImageSize(100, 150),
}

const PEGI_RATING_BADGE_IMAGE_SIZES: Record<PegiRatingValue, BackgroundImageSize> = {
  '3': createImageSize(181, 220),
  '7': createImageSize(181, 220),
  '12': createImageSize(181, 220),
  '16': createImageSize(181, 220),
  '18': createImageSize(180, 220),
}

const USK_RATING_BADGE_IMAGE_SIZES: Record<UskRatingValue, BackgroundImageSize> = {
  '0': createImageSize(1406, 1406),
  '6': createImageSize(1406, 1406),
  '12': createImageSize(1406, 1406),
  '16': createImageSize(1406, 1406),
  '18': createImageSize(1406, 1406),
}

const RATING_BADGE_PLACEHOLDER_IMAGE_SIZES: Record<
  Exclude<RatingBadgePlaceholderKind, 'ESRB' | 'PEGI' | 'USK'>,
  BackgroundImageSize
> = {
  custom: createImageSize(90, 130),
}

const MEDIA_MARK_PLACEHOLDER_IMAGE_URLS: Record<MediaMarkValue, MediaMarkPlaceholderImageUrls> = {
  bluRay: new URL(
    './media-format/blu-ray/media-mark-blu-ray.svg',
    import.meta.url,
  ).href,
  cdRom: {
    light: new URL(
      './media-format/cd-rom/media-mark-cd-rom-light.svg',
      import.meta.url,
    ).href,
    dark: new URL(
      './media-format/cd-rom/media-mark-cd-rom-dark.svg',
      import.meta.url,
    ).href,
  },
  dataDisc: {
    light: new URL(
      './media-format/data-disc/media-mark-data-disc-light.png',
      import.meta.url,
    ).href,
    dark: new URL(
      './media-format/data-disc/media-mark-data-disc-dark.png',
      import.meta.url,
    ).href,
  },
  dvd: {
    light: new URL(
      './media-format/dvd/media-mark-dvd-light.svg',
      import.meta.url,
    ).href,
    dark: new URL(
      './media-format/dvd/media-mark-dvd-dark.svg',
      import.meta.url,
    ).href,
  },
  dvdRom: {
    light: new URL(
      './media-format/dvd-rom/media-mark-dvd-rom-light.png',
      import.meta.url,
    ).href,
    dark: new URL(
      './media-format/dvd-rom/media-mark-dvd-rom-dark.png',
      import.meta.url,
    ).href,
  },
  installDisc: {
    light: new URL(
      './media-format/install-disc/media-mark-install-disc-light.png',
      import.meta.url,
    ).href,
    dark: new URL(
      './media-format/install-disc/media-mark-install-disc-dark.png',
      import.meta.url,
    ).href,
  },
}

const PLATFORM_MARK_PLACEHOLDER_IMAGE_URLS: Record<PlatformMarkValue, PlatformMarkPlaceholderImageUrls> = {
  linux: {
    color: new URL(
      './operating-system/linux/platform-mark-linux-color.svg',
      import.meta.url,
    ).href,
    light: new URL(
      './operating-system/linux/platform-mark-linux-light.svg',
      import.meta.url,
    ).href,
    dark: new URL(
      './operating-system/linux/platform-mark-linux-dark.svg',
      import.meta.url,
    ).href,
  },
  macos: {
    macos1988: new URL(
      './operating-system/macos/platform-mark-macos-1988.png',
      import.meta.url,
    ).href,
    macos1995: new URL(
      './operating-system/macos/platform-mark-macos-1995.png',
      import.meta.url,
    ).href,
    macos2001: new URL(
      './operating-system/macos/platform-mark-macos-2001.png',
      import.meta.url,
    ).href,
    macos2003: new URL(
      './operating-system/macos/platform-mark-macos-2003.png',
      import.meta.url,
    ).href,
    macos2012: new URL(
      './operating-system/macos/platform-mark-macos-2012.png',
      import.meta.url,
    ).href,
    macos2016: new URL(
      './operating-system/macos/platform-mark-macos-2016.png',
      import.meta.url,
    ).href,
    macos2017: new URL(
      './operating-system/macos/platform-mark-macos-2017.jpg',
      import.meta.url,
    ).href,
  },
  pc: {
    pcPlatform: new URL(
      './operating-system/pc/platform-mark-pc-platform.png',
      import.meta.url,
    ).href,
    pcSimplified: new URL(
      './operating-system/pc/platform-mark-pc-simplified.png',
      import.meta.url,
    ).href,
    pcSimplifiedDark: new URL(
      './operating-system/pc/platform-mark-pc-simplified-dark.png',
      import.meta.url,
    ).href,
  },
  steamDeck: {
    color: new URL(
      './operating-system/steamos/platform-mark-steamos-color.svg',
      import.meta.url,
    ).href,
    light: new URL(
      './operating-system/steamos/platform-mark-steamos-light.svg',
      import.meta.url,
    ).href,
    dark: new URL(
      './operating-system/steamos/platform-mark-steamos-dark.svg',
      import.meta.url,
    ).href,
  },
  windows: {
    retro: new URL(
      './operating-system/windows/platform-mark-windows-retro.svg',
      import.meta.url,
    ).href,
    xp: new URL(
      './operating-system/windows/platform-mark-windows-xp.png',
      import.meta.url,
    ).href,
    vista: new URL(
      './operating-system/windows/platform-mark-windows-vista.png',
      import.meta.url,
    ).href,
    windows7: new URL(
      './operating-system/windows/platform-mark-windows-7.png',
      import.meta.url,
    ).href,
    windows10: new URL(
      './operating-system/windows/platform-mark-windows-10.svg',
      import.meta.url,
    ).href,
    windows11: new URL(
      './operating-system/windows/platform-mark-windows-11.png',
      import.meta.url,
    ).href,
  },
}

const WINDOWS_11_PLATFORM_MARK_IMAGE_SIZE: BackgroundImageSize = {
  width: 482,
  height: 482,
  contentShape: {
    width: 482,
    height: 482,
    path: 'M26 0 L230 0 L230 1 L231 1 L231 231 L1 231 L1 230 L0 230 L0 26 L1 26 L1 22 L2 22 L2 19 L3 19 L3 17 L4 17 L4 15 L5 15 L5 14 L6 14 L6 12 L7 12 L7 11 L8 11 L8 10 L9 10 L9 9 L10 9 L10 8 L11 8 L11 7 L12 7 L12 6 L14 6 L14 5 L15 5 L15 4 L17 4 L17 3 L19 3 L19 2 L22 2 L22 1 L26 1 Z M253 0 L456 0 L456 1 L461 1 L461 2 L463 2 L463 3 L466 3 L466 4 L467 4 L467 5 L469 5 L469 6 L470 6 L470 7 L471 7 L471 8 L473 8 L473 9 L474 9 L474 11 L475 11 L475 12 L476 12 L476 13 L477 13 L477 14 L478 14 L478 16 L479 16 L479 18 L480 18 L480 20 L481 20 L481 24 L482 24 L482 231 L252 231 L252 1 L253 1 Z M1 252 L231 252 L231 482 L24 482 L24 481 L20 481 L20 480 L18 480 L18 479 L16 479 L16 478 L14 478 L14 477 L13 477 L13 476 L12 476 L12 475 L11 475 L11 474 L9 474 L9 473 L8 473 L8 471 L7 471 L7 470 L6 470 L6 469 L5 469 L5 467 L4 467 L4 466 L3 466 L3 463 L2 463 L2 461 L1 461 L1 457 L0 457 L0 253 L1 253 Z M252 252 L482 252 L482 459 L481 459 L481 462 L480 462 L480 464 L479 464 L479 466 L478 466 L478 468 L477 468 L477 470 L476 470 L476 471 L475 471 L475 472 L474 472 L474 473 L473 473 L473 474 L472 474 L472 475 L471 475 L471 476 L470 476 L470 477 L468 477 L468 478 L466 478 L466 479 L464 479 L464 480 L462 480 L462 481 L459 481 L459 482 L252 482 Z',
    fillRule: 'evenodd',
    safetyOutset: 0,
  },
}

const MEDIA_MARK_PLACEHOLDER_IMAGE_SIZES: Record<MediaMarkValue, ThemedPlaceholderImageSizes<MediaMarkTheme>> = {
  bluRay: createImageSize(284, 150),
  cdRom: {
    light: createImageSize(300, 145),
    dark: createImageSize(300, 145),
  },
  dataDisc: {
    light: createImageSize(512, 512, { x: 24, y: 24, width: 464, height: 464 }),
    dark: createImageSize(512, 512, { x: 24, y: 24, width: 464, height: 464 }),
  },
  dvd: {
    light: createImageSize(300, 132),
    dark: createImageSize(300, 132),
  },
  dvdRom: {
    light: createImageSize(1024, 612, { x: 2, y: 2, width: 1021, height: 609 }),
    dark: createImageSize(1024, 612, { x: 2, y: 2, width: 1021, height: 609 }),
  },
  installDisc: {
    light: createImageSize(512, 512, { x: 119, y: 12, width: 274, height: 488 }),
    dark: createImageSize(512, 512, { x: 119, y: 12, width: 274, height: 488 }),
  },
}

const PLATFORM_MARK_PLACEHOLDER_IMAGE_SIZES: Record<PlatformMarkValue, ThemedPlaceholderImageSizes<PlatformMarkTheme>> = {
  linux: {
    color: createImageSize(150, 150, { x: 11, y: 0, width: 128, height: 150 }),
    light: createImageSize(150, 150, { x: 11, y: 0, width: 128, height: 150 }),
    dark: createImageSize(150, 150, { x: 11, y: 0, width: 128, height: 150 }),
  },
  macos: {
    macos1988: createImageSize(500, 281, { x: 73, y: 6, width: 352, height: 268 }),
    macos1995: createImageSize(500, 281, { x: 106, y: 7, width: 290, height: 266 }),
    macos2001: createImageSize(1536, 864, { x: 331, y: 26, width: 868, height: 808 }),
    macos2003: createImageSize(1536, 864, { x: 271, y: 26, width: 987, height: 809 }),
    macos2012: createImageSize(1536, 864, { x: 40, y: 140, width: 1454, height: 577 }),
    macos2016: createImageSize(768, 432, { x: 16, y: 121, width: 733, height: 191 }),
    macos2017: createImageSize(768, 432),
  },
  pc: {
    pcPlatform: createImageSize(512, 512),
    pcSimplified: createImageSize(539, 467, { x: 1, y: 1, width: 538, height: 466 }),
    pcSimplifiedDark: createImageSize(539, 467, { x: 1, y: 1, width: 538, height: 466 }),
  },
  steamDeck: {
    color: createImageSize(150, 150, { x: 18, y: 0, width: 114, height: 150 }),
    light: createImageSize(150, 150, { x: 18, y: 0, width: 114, height: 150 }),
    dark: createImageSize(150, 150, { x: 18, y: 0, width: 114, height: 150 }),
  },
  windows: {
    retro: createImageSize(187, 150),
    xp: createImageSize(518, 457, { x: 0, y: 1, width: 518, height: 456 }),
    vista: createImageSize(512, 512),
    windows7: createImageSize(507, 432, { x: 5, y: 0, width: 502, height: 430 }),
    windows10: createImageSize(88, 88),
    windows11: WINDOWS_11_PLATFORM_MARK_IMAGE_SIZE,
  },
}

const DEFAULT_PLATFORM_MARK_PLACEHOLDER_THEME: Record<PlatformMarkValue, PlatformMarkTheme> = {
  linux: 'color',
  macos: 'macos1988',
  pc: 'pcPlatform',
  steamDeck: 'color',
  windows: 'windows11',
}

const TECHNICAL_MARK_PLACEHOLDER_IMAGE_URLS: Record<TechnicalMarkValue, string> = {
  audio: new URL(
    './placeholders/technical/technical-mark-audio-placeholder.svg',
    import.meta.url,
  ).href,
  codec: new URL(
    './placeholders/technical/technical-mark-codec-placeholder.svg',
    import.meta.url,
  ).href,
  middleware: new URL(
    './placeholders/technical/technical-mark-middleware-placeholder.svg',
    import.meta.url,
  ).href,
  surround: new URL(
    './placeholders/technical/technical-mark-surround-placeholder.svg',
    import.meta.url,
  ).href,
  technology: new URL(
    './placeholders/technical/technical-mark-technology-placeholder.svg',
    import.meta.url,
  ).href,
}

const TECHNICAL_MARK_PLACEHOLDER_IMAGE_SIZES: Record<TechnicalMarkValue, BackgroundImageSize> = {
  audio: createImageSize(130, 80),
  codec: createImageSize(130, 80),
  middleware: createImageSize(130, 80),
  surround: createImageSize(130, 80),
  technology: createImageSize(130, 80),
}

export const DISC_NUMBER_BADGE_IMAGE_URLS: Record<DiscNumberBadgeSet, string> = {
  starterRing: new URL(
    './disc-number-badges/starter-ring.svg',
    import.meta.url,
  ).href,
}

const DISC_NUMBER_BADGE_IMAGE_SIZES: Record<DiscNumberBadgeSet, BackgroundImageSize> = {
  starterRing: createImageSize(240, 128, { x: 0, y: 4, width: 240, height: 124 }),
}

export const STATUS_TOAST_ICON_URLS: Record<StatusToastIconKind, string> = {
  artwork: new URL(
    './toast-icons/toast-artwork.png',
    import.meta.url,
  ).href,
  error: new URL(
    './toast-icons/toast-error.png',
    import.meta.url,
  ).href,
  export: new URL(
    './toast-icons/toast-export.png',
    import.meta.url,
  ).href,
  info: new URL(
    './toast-icons/toast-info.png',
    import.meta.url,
  ).href,
  logo: new URL(
    './toast-icons/toast-logo.png',
    import.meta.url,
  ).href,
  project: new URL(
    './toast-icons/toast-project.png',
    import.meta.url,
  ).href,
  steam: new URL(
    './toast-icons/toast-steam.png',
    import.meta.url,
  ).href,
  success: new URL(
    './toast-icons/toast-success.png',
    import.meta.url,
  ).href,
  template: new URL(
    './toast-icons/toast-template.png',
    import.meta.url,
  ).href,
  text: new URL(
    './toast-icons/toast-text.png',
    import.meta.url,
  ).href,
  warning: new URL(
    './toast-icons/toast-warning.png',
    import.meta.url,
  ).href,
}

const STATUS_TOAST_ICON_IMAGE_SIZES: Record<StatusToastIconKind, BackgroundImageSize> = {
  artwork: createImageSize(48, 48, { x: 8, y: 11, width: 32, height: 27 }),
  error: createImageSize(48, 48, { x: 5, y: 5, width: 39, height: 39 }),
  export: createImageSize(48, 48, { x: 11, y: 7, width: 26, height: 32 }),
  info: createImageSize(48, 48, { x: 6, y: 6, width: 37, height: 37 }),
  logo: createImageSize(48, 48, { x: 6, y: 6, width: 37, height: 36 }),
  project: createImageSize(48, 48, { x: 7, y: 16, width: 34, height: 25 }),
  steam: DEFAULT_STEAM_BANNER_SPINE_ICON_IMAGE_SIZE,
  success: createImageSize(48, 48, { x: 5, y: 5, width: 39, height: 39 }),
  template: createImageSize(48, 48, { x: 6, y: 6, width: 37, height: 37 }),
  text: createImageSize(48, 48, { x: 10, y: 12, width: 30, height: 24 }),
  warning: createImageSize(48, 48, { x: 6, y: 7, width: 37, height: 32 }),
}

export function getRatingBadgePlaceholderImageUrl(
  metadata: Pick<ProjectMetadata, 'ratingSystem' | 'ratingValue'>,
) {
  if (metadata.ratingSystem === 'ESRB') {
    const ratingValue = normalizeEsrbRatingValue(metadata.ratingValue) ?? 'RP'

    return ESRB_RATING_BADGE_IMAGE_URLS[ratingValue]
  }

  if (metadata.ratingSystem === 'PEGI') {
    const ratingValue = normalizePegiRatingValue(metadata.ratingValue) ?? '3'

    return PEGI_RATING_BADGE_IMAGE_URLS[ratingValue]
  }

  if (metadata.ratingSystem === 'USK') {
    const ratingValue = normalizeUskRatingValue(metadata.ratingValue) ?? '0'

    return USK_RATING_BADGE_IMAGE_URLS[ratingValue]
  }

  if (metadata.ratingSystem === 'custom') {
    return RATING_BADGE_PLACEHOLDER_IMAGE_URLS.custom
  }

  return ESRB_RATING_BADGE_IMAGE_URLS.RP
}

export function getRatingBadgePlaceholderImageSize(
  metadata: Pick<ProjectMetadata, 'ratingSystem' | 'ratingValue'>,
) {
  if (metadata.ratingSystem === 'ESRB') {
    const ratingValue = normalizeEsrbRatingValue(metadata.ratingValue) ?? 'RP'

    return ESRB_RATING_BADGE_IMAGE_SIZES[ratingValue]
  }

  if (metadata.ratingSystem === 'PEGI') {
    const ratingValue = normalizePegiRatingValue(metadata.ratingValue) ?? '3'

    return PEGI_RATING_BADGE_IMAGE_SIZES[ratingValue]
  }

  if (metadata.ratingSystem === 'USK') {
    const ratingValue = normalizeUskRatingValue(metadata.ratingValue) ?? '0'

    return USK_RATING_BADGE_IMAGE_SIZES[ratingValue]
  }

  if (metadata.ratingSystem === 'custom') {
    return RATING_BADGE_PLACEHOLDER_IMAGE_SIZES.custom
  }

  return ESRB_RATING_BADGE_IMAGE_SIZES.RP
}

export function getRatingBadgePlaceholderTextColor(
  metadata: Pick<ProjectMetadata, 'ratingSystem'>,
) {
  return metadata.ratingSystem === 'custom' ? '#f9fafb' : '#111827'
}

function getRatingBadgePlaceholderLabel(
  metadata: Pick<ProjectMetadata, 'ratingSystem' | 'ratingValue'>,
) {
  if (metadata.ratingSystem === 'none') {
    return ''
  }

  return metadata.ratingValue.trim() || metadata.ratingSystem
}

export function getRatingBadgePlaceholderRenderModel(
  metadata: Pick<ProjectMetadata, 'ratingSystem' | 'ratingValue'>,
) {
  const esrbRatingValue = metadata.ratingSystem === 'ESRB'
    ? normalizeEsrbRatingValue(metadata.ratingValue) ?? 'RP'
    : null
  const pegiRatingValue = metadata.ratingSystem === 'PEGI'
    ? normalizePegiRatingValue(metadata.ratingValue) ?? '3'
    : null
  const uskRatingValue = metadata.ratingSystem === 'USK'
    ? normalizeUskRatingValue(metadata.ratingValue) ?? '0'
    : null
  const overlayLabel =
    metadata.ratingSystem === 'ESRB' ||
    metadata.ratingSystem === 'PEGI' ||
    metadata.ratingSystem === 'USK'
      ? null
      : getRatingBadgePlaceholderLabel(metadata)
  const label = metadata.ratingSystem === 'ESRB'
    ? `ESRB ${esrbRatingValue}`
    : metadata.ratingSystem === 'PEGI'
      ? `PEGI ${pegiRatingValue}`
      : metadata.ratingSystem === 'USK'
        ? `USK ${uskRatingValue}`
      : getRatingBadgePlaceholderLabel(metadata)

  return {
    imageUrl: getRatingBadgePlaceholderImageUrl(metadata),
    imageSize: getRatingBadgePlaceholderImageSize(metadata),
    overlayLabel,
    textColor: getRatingBadgePlaceholderTextColor(metadata),
    altLabel: label ? `${label} rating badge` : 'Rating badge',
  }
}

function resolveThemedPlaceholderImageUrl<TTheme extends string>(
  imageUrls: string | Partial<Record<TTheme, string>>,
  theme: TTheme,
  fallbackTheme: TTheme,
) {
  if (typeof imageUrls === 'string') {
    return imageUrls
  }

  const fallbackUrl = Object.values(imageUrls).find(
    (url): url is string => typeof url === 'string',
  )

  return imageUrls[theme] ?? imageUrls[fallbackTheme] ?? fallbackUrl ?? ''
}

function isBackgroundImageSize(value: unknown): value is BackgroundImageSize {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as BackgroundImageSize).width === 'number' &&
      typeof (value as BackgroundImageSize).height === 'number',
  )
}

function resolveThemedPlaceholderImageSize<TTheme extends string>(
  imageSizes: ThemedPlaceholderImageSizes<TTheme>,
  theme: TTheme,
  fallbackTheme: TTheme,
) {
  if (isBackgroundImageSize(imageSizes)) {
    return imageSizes
  }

  const fallbackSize = Object.values(imageSizes).find(isBackgroundImageSize) ?? null

  return imageSizes[theme] ?? imageSizes[fallbackTheme] ?? fallbackSize
}

export function getLogoPlaceholderImageSize(kind: LogoPlaceholderKind) {
  return LOGO_PLACEHOLDER_IMAGE_SIZES[kind]
}

export function getSteamBannerLockupImageSize(kind: 'banner-lockup' | 'spine-icon') {
  return kind === 'spine-icon'
    ? DEFAULT_STEAM_BANNER_SPINE_ICON_IMAGE_SIZE
    : DEFAULT_STEAM_BANNER_LOCKUP_IMAGE_SIZE
}

export function getMediaMarkPlaceholderImageUrl(
  value: MediaMarkValue,
  theme: MediaMarkTheme = 'light',
) {
  return resolveThemedPlaceholderImageUrl(MEDIA_MARK_PLACEHOLDER_IMAGE_URLS[value], theme, 'light')
}

export function getMediaMarkPlaceholderImageSize(
  value: MediaMarkValue,
  theme: MediaMarkTheme = 'light',
) {
  return resolveThemedPlaceholderImageSize(
    MEDIA_MARK_PLACEHOLDER_IMAGE_SIZES[value],
    theme,
    'light',
  )
}

export function getPlatformMarkPlaceholderImageUrl(
  value: PlatformMarkValue,
  theme: PlatformMarkTheme = 'color',
) {
  return resolveThemedPlaceholderImageUrl(
    PLATFORM_MARK_PLACEHOLDER_IMAGE_URLS[value],
    theme,
    DEFAULT_PLATFORM_MARK_PLACEHOLDER_THEME[value],
  )
}

export function getPlatformMarkPlaceholderImageSize(
  value: PlatformMarkValue,
  theme: PlatformMarkTheme = 'color',
) {
  return resolveThemedPlaceholderImageSize(
    PLATFORM_MARK_PLACEHOLDER_IMAGE_SIZES[value],
    theme,
    DEFAULT_PLATFORM_MARK_PLACEHOLDER_THEME[value],
  )
}

export function getTechnicalMarkPlaceholderImageUrl(value: TechnicalMarkValue) {
  return TECHNICAL_MARK_PLACEHOLDER_IMAGE_URLS[value]
}

export function getTechnicalMarkPlaceholderImageSize(value: TechnicalMarkValue) {
  return TECHNICAL_MARK_PLACEHOLDER_IMAGE_SIZES[value]
}

export function getDiscNumberBadgeImageSize(value: DiscNumberBadgeSet) {
  return DISC_NUMBER_BADGE_IMAGE_SIZES[value]
}

export function getStatusToastIconImageSize(value: StatusToastIconKind) {
  return STATUS_TOAST_ICON_IMAGE_SIZES[value]
}

export function getEditorBuiltInImageAssets(): BuiltInImageAsset[] {
  const assets: BuiltInImageAsset[] = [
    createBuiltInImageAsset(
      'steam-banner:banner-lockup',
      DEFAULT_STEAM_BANNER_LOCKUP_IMAGE_URL,
      DEFAULT_STEAM_BANNER_LOCKUP_IMAGE_SIZE,
    ),
    createBuiltInImageAsset(
      'steam-banner:spine-icon',
      DEFAULT_STEAM_BANNER_SPINE_ICON_IMAGE_URL,
      DEFAULT_STEAM_BANNER_SPINE_ICON_IMAGE_SIZE,
    ),
  ]

  ;(Object.keys(LOGO_PLACEHOLDER_IMAGE_URLS) as LogoPlaceholderKind[]).forEach((kind) => {
    assets.push(
      createBuiltInImageAsset(
        `logo:${kind}`,
        LOGO_PLACEHOLDER_IMAGE_URLS[kind],
        LOGO_PLACEHOLDER_IMAGE_SIZES[kind],
      ),
    )
  })
  ;(Object.keys(ESRB_RATING_BADGE_IMAGE_URLS) as EsrbRatingValue[]).forEach((value) => {
    assets.push(
      createBuiltInImageAsset(
        `rating:ESRB:${value}`,
        ESRB_RATING_BADGE_IMAGE_URLS[value],
        ESRB_RATING_BADGE_IMAGE_SIZES[value],
      ),
    )
  })
  ;(Object.keys(PEGI_RATING_BADGE_IMAGE_URLS) as PegiRatingValue[]).forEach((value) => {
    assets.push(
      createBuiltInImageAsset(
        `rating:PEGI:${value}`,
        PEGI_RATING_BADGE_IMAGE_URLS[value],
        PEGI_RATING_BADGE_IMAGE_SIZES[value],
      ),
    )
  })
  ;(Object.keys(USK_RATING_BADGE_IMAGE_URLS) as UskRatingValue[]).forEach((value) => {
    assets.push(
      createBuiltInImageAsset(
        `rating:USK:${value}`,
        USK_RATING_BADGE_IMAGE_URLS[value],
        USK_RATING_BADGE_IMAGE_SIZES[value],
      ),
    )
  })
  assets.push(
    createBuiltInImageAsset(
      'rating:custom',
      RATING_BADGE_PLACEHOLDER_IMAGE_URLS.custom,
      RATING_BADGE_PLACEHOLDER_IMAGE_SIZES.custom,
    ),
  )
  ;(Object.keys(MEDIA_MARK_PLACEHOLDER_IMAGE_URLS) as MediaMarkValue[]).forEach((value) => {
    pushThemedBuiltInImageAssets(
      assets,
      `media:${value}`,
      MEDIA_MARK_PLACEHOLDER_IMAGE_URLS[value],
      MEDIA_MARK_PLACEHOLDER_IMAGE_SIZES[value],
    )
  })
  ;(Object.keys(PLATFORM_MARK_PLACEHOLDER_IMAGE_URLS) as PlatformMarkValue[]).forEach((value) => {
    pushThemedBuiltInImageAssets(
      assets,
      `platform:${value}`,
      PLATFORM_MARK_PLACEHOLDER_IMAGE_URLS[value],
      PLATFORM_MARK_PLACEHOLDER_IMAGE_SIZES[value],
    )
  })
  ;(Object.keys(TECHNICAL_MARK_PLACEHOLDER_IMAGE_URLS) as TechnicalMarkValue[]).forEach((value) => {
    assets.push(
      createBuiltInImageAsset(
        `technical:${value}`,
        TECHNICAL_MARK_PLACEHOLDER_IMAGE_URLS[value],
        TECHNICAL_MARK_PLACEHOLDER_IMAGE_SIZES[value],
      ),
    )
  })
  ;(Object.keys(DISC_NUMBER_BADGE_IMAGE_URLS) as DiscNumberBadgeSet[]).forEach((value) => {
    assets.push(
      createBuiltInImageAsset(
        `disc-number:${value}`,
        DISC_NUMBER_BADGE_IMAGE_URLS[value],
        DISC_NUMBER_BADGE_IMAGE_SIZES[value],
      ),
    )
  })
  ;(Object.keys(STATUS_TOAST_ICON_URLS) as StatusToastIconKind[]).forEach((value) => {
    assets.push(
      createBuiltInImageAsset(
        `toast:${value}`,
        STATUS_TOAST_ICON_URLS[value],
        STATUS_TOAST_ICON_IMAGE_SIZES[value],
      ),
    )
  })

  return assets
}
