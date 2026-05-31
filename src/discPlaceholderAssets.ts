import type {
  DiscNumberBadgeSet,
  GameRatingSystem,
  MediaMarkTheme,
  MediaMarkValue,
  PlatformMarkTheme,
  PlatformMarkValue,
  ProjectMetadata,
  TechnicalMarkValue,
} from './project/projectTypes'
import {
  normalizeEsrbRatingValue,
  normalizePegiRatingValue,
  type EsrbRatingValue,
  type PegiRatingValue,
} from './project/projectMetadata.ts'

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

// The saved-project source value is still "placeholder" for compatibility.
// Assets without "placeholder" in the filename are organized as official
// built-ins under domain folders; true temporary fallbacks stay in
// `assets/placeholders/`.
export const DEFAULT_STEAM_BANNER_LOCKUP_IMAGE_URL = new URL(
  './assets/steam-banner/steam-default-lockup.png',
  import.meta.url,
).href

export const LOGO_PLACEHOLDER_IMAGE_URLS: Record<LogoPlaceholderKind, string> = {
  developer: new URL(
    './assets/placeholders/developer-logo-placeholder.svg',
    import.meta.url,
  ).href,
  publisher: new URL(
    './assets/placeholders/publisher-logo-placeholder.svg',
    import.meta.url,
  ).href,
}

const ESRB_RATING_BADGE_IMAGE_URLS: Record<EsrbRatingValue, string> = {
  E: new URL(
    './assets/rating/esrb/rating-badge-esrb-e.svg',
    import.meta.url,
  ).href,
  'E10+': new URL(
    './assets/rating/esrb/rating-badge-esrb-e10-plus.svg',
    import.meta.url,
  ).href,
  T: new URL(
    './assets/rating/esrb/rating-badge-esrb-t.svg',
    import.meta.url,
  ).href,
  M: new URL(
    './assets/rating/esrb/rating-badge-esrb-m.svg',
    import.meta.url,
  ).href,
  AO: new URL(
    './assets/rating/esrb/rating-badge-esrb-ao.svg',
    import.meta.url,
  ).href,
  RP: new URL(
    './assets/rating/esrb/rating-badge-esrb-rp.svg',
    import.meta.url,
  ).href,
  'RP17+': new URL(
    './assets/rating/esrb/rating-badge-esrb-rp17-plus.svg',
    import.meta.url,
  ).href,
}

const PEGI_RATING_BADGE_IMAGE_URLS: Record<PegiRatingValue, string> = {
  '3': new URL(
    './assets/rating/pegi/rating-badge-pegi-3.png',
    import.meta.url,
  ).href,
  '7': new URL(
    './assets/rating/pegi/rating-badge-pegi-7.png',
    import.meta.url,
  ).href,
  '12': new URL(
    './assets/rating/pegi/rating-badge-pegi-12.png',
    import.meta.url,
  ).href,
  '16': new URL(
    './assets/rating/pegi/rating-badge-pegi-16.png',
    import.meta.url,
  ).href,
  '18': new URL(
    './assets/rating/pegi/rating-badge-pegi-18.png',
    import.meta.url,
  ).href,
}

const RATING_BADGE_PLACEHOLDER_IMAGE_URLS: Record<Exclude<RatingBadgePlaceholderKind, 'ESRB' | 'PEGI'>, string> = {
  custom: new URL(
    './assets/placeholders/rating-badge-custom-placeholder.svg',
    import.meta.url,
  ).href,
}

const MEDIA_MARK_PLACEHOLDER_IMAGE_URLS: Record<MediaMarkValue, MediaMarkPlaceholderImageUrls> = {
  bluRay: new URL(
    './assets/media-format/blu-ray/media-mark-blu-ray.svg',
    import.meta.url,
  ).href,
  cdRom: {
    light: new URL(
      './assets/media-format/cd-rom/media-mark-cd-rom-light.svg',
      import.meta.url,
    ).href,
    dark: new URL(
      './assets/media-format/cd-rom/media-mark-cd-rom-dark.svg',
      import.meta.url,
    ).href,
  },
  dataDisc: {
    light: new URL(
      './assets/media-format/data-disc/media-mark-data-disc-light.png',
      import.meta.url,
    ).href,
    dark: new URL(
      './assets/media-format/data-disc/media-mark-data-disc-dark.png',
      import.meta.url,
    ).href,
  },
  dvd: {
    light: new URL(
      './assets/media-format/dvd/media-mark-dvd-light.svg',
      import.meta.url,
    ).href,
    dark: new URL(
      './assets/media-format/dvd/media-mark-dvd-dark.svg',
      import.meta.url,
    ).href,
  },
  dvdRom: {
    light: new URL(
      './assets/media-format/dvd-rom/media-mark-dvd-rom-light.png',
      import.meta.url,
    ).href,
    dark: new URL(
      './assets/media-format/dvd-rom/media-mark-dvd-rom-dark.png',
      import.meta.url,
    ).href,
  },
  installDisc: {
    light: new URL(
      './assets/media-format/install-disc/media-mark-install-disc-light.png',
      import.meta.url,
    ).href,
    dark: new URL(
      './assets/media-format/install-disc/media-mark-install-disc-dark.png',
      import.meta.url,
    ).href,
  },
}

const PLATFORM_MARK_PLACEHOLDER_IMAGE_URLS: Record<PlatformMarkValue, PlatformMarkPlaceholderImageUrls> = {
  linux: {
    color: new URL(
      './assets/operating-system/linux/platform-mark-linux-color.svg',
      import.meta.url,
    ).href,
    light: new URL(
      './assets/operating-system/linux/platform-mark-linux-light.svg',
      import.meta.url,
    ).href,
    dark: new URL(
      './assets/operating-system/linux/platform-mark-linux-dark.svg',
      import.meta.url,
    ).href,
  },
  macos: {
    macos1988: new URL(
      './assets/operating-system/macos/platform-mark-macos-1988.png',
      import.meta.url,
    ).href,
    macos1995: new URL(
      './assets/operating-system/macos/platform-mark-macos-1995.png',
      import.meta.url,
    ).href,
    macos2001: new URL(
      './assets/operating-system/macos/platform-mark-macos-2001.png',
      import.meta.url,
    ).href,
    macos2003: new URL(
      './assets/operating-system/macos/platform-mark-macos-2003.png',
      import.meta.url,
    ).href,
    macos2012: new URL(
      './assets/operating-system/macos/platform-mark-macos-2012.png',
      import.meta.url,
    ).href,
    macos2016: new URL(
      './assets/operating-system/macos/platform-mark-macos-2016.png',
      import.meta.url,
    ).href,
    macos2017: new URL(
      './assets/operating-system/macos/platform-mark-macos-2017.jpg',
      import.meta.url,
    ).href,
  },
  pc: {
    pcPlatform: new URL(
      './assets/operating-system/pc/platform-mark-pc-platform.png',
      import.meta.url,
    ).href,
    pcSimplified: new URL(
      './assets/operating-system/pc/platform-mark-pc-simplified.png',
      import.meta.url,
    ).href,
    pcSimplifiedDark: new URL(
      './assets/operating-system/pc/platform-mark-pc-simplified-dark.png',
      import.meta.url,
    ).href,
  },
  steamDeck: {
    color: new URL(
      './assets/operating-system/steamos/platform-mark-steamos-color.svg',
      import.meta.url,
    ).href,
    light: new URL(
      './assets/operating-system/steamos/platform-mark-steamos-light.svg',
      import.meta.url,
    ).href,
    dark: new URL(
      './assets/operating-system/steamos/platform-mark-steamos-dark.svg',
      import.meta.url,
    ).href,
  },
  windows: {
    retro: new URL(
      './assets/operating-system/windows/platform-mark-windows-retro.svg',
      import.meta.url,
    ).href,
    xp: new URL(
      './assets/operating-system/windows/platform-mark-windows-xp.png',
      import.meta.url,
    ).href,
    vista: new URL(
      './assets/operating-system/windows/platform-mark-windows-vista.png',
      import.meta.url,
    ).href,
    windows7: new URL(
      './assets/operating-system/windows/platform-mark-windows-7.png',
      import.meta.url,
    ).href,
    windows10: new URL(
      './assets/operating-system/windows/platform-mark-windows-10.svg',
      import.meta.url,
    ).href,
    windows11: new URL(
      './assets/operating-system/windows/platform-mark-windows-11.png',
      import.meta.url,
    ).href,
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
    './assets/placeholders/technical-mark-audio-placeholder.svg',
    import.meta.url,
  ).href,
  codec: new URL(
    './assets/placeholders/technical-mark-codec-placeholder.svg',
    import.meta.url,
  ).href,
  middleware: new URL(
    './assets/placeholders/technical-mark-middleware-placeholder.svg',
    import.meta.url,
  ).href,
  surround: new URL(
    './assets/placeholders/technical-mark-surround-placeholder.svg',
    import.meta.url,
  ).href,
  technology: new URL(
    './assets/placeholders/technical-mark-technology-placeholder.svg',
    import.meta.url,
  ).href,
}

export const DISC_NUMBER_BADGE_IMAGE_URLS: Record<DiscNumberBadgeSet, string> = {
  starterRing: new URL(
    './assets/disc-number-badges/starter-ring.svg',
    import.meta.url,
  ).href,
}

export const STATUS_TOAST_ICON_URLS: Record<StatusToastIconKind, string> = {
  artwork: new URL(
    './assets/toast-icons/toast-artwork.png',
    import.meta.url,
  ).href,
  error: new URL(
    './assets/toast-icons/toast-error.png',
    import.meta.url,
  ).href,
  export: new URL(
    './assets/toast-icons/toast-export.png',
    import.meta.url,
  ).href,
  info: new URL(
    './assets/toast-icons/toast-info.png',
    import.meta.url,
  ).href,
  logo: new URL(
    './assets/toast-icons/toast-logo.png',
    import.meta.url,
  ).href,
  project: new URL(
    './assets/toast-icons/toast-project.png',
    import.meta.url,
  ).href,
  steam: new URL(
    './assets/toast-icons/toast-steam.png',
    import.meta.url,
  ).href,
  success: new URL(
    './assets/toast-icons/toast-success.png',
    import.meta.url,
  ).href,
  template: new URL(
    './assets/toast-icons/toast-template.png',
    import.meta.url,
  ).href,
  text: new URL(
    './assets/toast-icons/toast-text.png',
    import.meta.url,
  ).href,
  warning: new URL(
    './assets/toast-icons/toast-warning.png',
    import.meta.url,
  ).href,
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

  if (metadata.ratingSystem === 'custom') {
    return RATING_BADGE_PLACEHOLDER_IMAGE_URLS.custom
  }

  return ESRB_RATING_BADGE_IMAGE_URLS.RP
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
  const overlayLabel =
    metadata.ratingSystem === 'ESRB' || metadata.ratingSystem === 'PEGI'
      ? null
      : getRatingBadgePlaceholderLabel(metadata)
  const label = metadata.ratingSystem === 'ESRB'
    ? `ESRB ${esrbRatingValue}`
    : metadata.ratingSystem === 'PEGI'
      ? `PEGI ${pegiRatingValue}`
      : getRatingBadgePlaceholderLabel(metadata)

  return {
    imageUrl: getRatingBadgePlaceholderImageUrl(metadata),
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

export function getMediaMarkPlaceholderImageUrl(
  value: MediaMarkValue,
  theme: MediaMarkTheme = 'light',
) {
  return resolveThemedPlaceholderImageUrl(MEDIA_MARK_PLACEHOLDER_IMAGE_URLS[value], theme, 'light')
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

export function getTechnicalMarkPlaceholderImageUrl(value: TechnicalMarkValue) {
  return TECHNICAL_MARK_PLACEHOLDER_IMAGE_URLS[value]
}
