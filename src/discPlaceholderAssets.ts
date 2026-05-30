import type {
  GameRatingSystem,
  MediaMarkValue,
  PlatformMarkValue,
  ProjectMetadata,
  TechnicalMarkValue,
} from './project/projectTypes'

const developerLogoPlaceholderUrl = new URL(
  './assets/placeholders/developer-logo-placeholder.svg',
  import.meta.url,
).href
const publisherLogoPlaceholderUrl = new URL(
  './assets/placeholders/publisher-logo-placeholder.svg',
  import.meta.url,
).href
const ratingBadgeCustomPlaceholderUrl = new URL(
  './assets/placeholders/rating-badge-custom-placeholder.svg',
  import.meta.url,
).href
const ratingBadgeEsrbPlaceholderUrl = new URL(
  './assets/placeholders/rating-badge-esrb-placeholder.svg',
  import.meta.url,
).href
const ratingBadgePegiPlaceholderUrl = new URL(
  './assets/placeholders/rating-badge-pegi-placeholder.svg',
  import.meta.url,
).href
const mediaMarkCdRomPlaceholderUrl = new URL(
  './assets/placeholders/media-mark-cd-rom-placeholder.svg',
  import.meta.url,
).href
const mediaMarkBluRayPlaceholderUrl = new URL(
  './assets/placeholders/media-mark-blu-ray-placeholder.svg',
  import.meta.url,
).href
const mediaMarkDataDiscPlaceholderUrl = new URL(
  './assets/placeholders/media-mark-data-disc-placeholder.svg',
  import.meta.url,
).href
const mediaMarkDvdPlaceholderUrl = new URL(
  './assets/placeholders/media-mark-dvd-placeholder.svg',
  import.meta.url,
).href
const mediaMarkDvdRomPlaceholderUrl = new URL(
  './assets/placeholders/media-mark-dvd-rom-placeholder.svg',
  import.meta.url,
).href
const mediaMarkInstallDiscPlaceholderUrl = new URL(
  './assets/placeholders/media-mark-install-disc-placeholder.svg',
  import.meta.url,
).href
const platformMarkLinuxPlaceholderUrl = new URL(
  './assets/placeholders/platform-mark-linux-placeholder.svg',
  import.meta.url,
).href
const platformMarkMacosPlaceholderUrl = new URL(
  './assets/placeholders/platform-mark-macos-placeholder.svg',
  import.meta.url,
).href
const platformMarkPcPlaceholderUrl = new URL(
  './assets/placeholders/platform-mark-pc-placeholder.svg',
  import.meta.url,
).href
const platformMarkSteamDeckPlaceholderUrl = new URL(
  './assets/placeholders/platform-mark-steam-deck-placeholder.svg',
  import.meta.url,
).href
const platformMarkWindowsPlaceholderUrl = new URL(
  './assets/placeholders/platform-mark-windows-placeholder.svg',
  import.meta.url,
).href
const technicalMarkAudioPlaceholderUrl = new URL(
  './assets/placeholders/technical-mark-audio-placeholder.svg',
  import.meta.url,
).href
const technicalMarkCodecPlaceholderUrl = new URL(
  './assets/placeholders/technical-mark-codec-placeholder.svg',
  import.meta.url,
).href
const technicalMarkMiddlewarePlaceholderUrl = new URL(
  './assets/placeholders/technical-mark-middleware-placeholder.svg',
  import.meta.url,
).href
const technicalMarkSurroundPlaceholderUrl = new URL(
  './assets/placeholders/technical-mark-surround-placeholder.svg',
  import.meta.url,
).href
const technicalMarkTechnologyPlaceholderUrl = new URL(
  './assets/placeholders/technical-mark-technology-placeholder.svg',
  import.meta.url,
).href

type RatingBadgePlaceholderKind = Exclude<GameRatingSystem, 'none'>

export const LOGO_PLACEHOLDER_IMAGE_URLS: Record<'developer' | 'publisher', string> = {
  developer: developerLogoPlaceholderUrl,
  publisher: publisherLogoPlaceholderUrl,
}

const RATING_BADGE_PLACEHOLDER_IMAGE_URLS: Record<RatingBadgePlaceholderKind, string> = {
  ESRB: ratingBadgeEsrbPlaceholderUrl,
  PEGI: ratingBadgePegiPlaceholderUrl,
  custom: ratingBadgeCustomPlaceholderUrl,
}

const MEDIA_MARK_PLACEHOLDER_IMAGE_URLS: Record<MediaMarkValue, string> = {
  bluRay: mediaMarkBluRayPlaceholderUrl,
  cdRom: mediaMarkCdRomPlaceholderUrl,
  dataDisc: mediaMarkDataDiscPlaceholderUrl,
  dvd: mediaMarkDvdPlaceholderUrl,
  dvdRom: mediaMarkDvdRomPlaceholderUrl,
  installDisc: mediaMarkInstallDiscPlaceholderUrl,
}

const PLATFORM_MARK_PLACEHOLDER_IMAGE_URLS: Record<PlatformMarkValue, string> = {
  linux: platformMarkLinuxPlaceholderUrl,
  macos: platformMarkMacosPlaceholderUrl,
  pc: platformMarkPcPlaceholderUrl,
  steamDeck: platformMarkSteamDeckPlaceholderUrl,
  windows: platformMarkWindowsPlaceholderUrl,
}

const TECHNICAL_MARK_PLACEHOLDER_IMAGE_URLS: Record<TechnicalMarkValue, string> = {
  audio: technicalMarkAudioPlaceholderUrl,
  codec: technicalMarkCodecPlaceholderUrl,
  middleware: technicalMarkMiddlewarePlaceholderUrl,
  surround: technicalMarkSurroundPlaceholderUrl,
  technology: technicalMarkTechnologyPlaceholderUrl,
}

export function getRatingBadgePlaceholderImageUrl(
  metadata: Pick<ProjectMetadata, 'ratingSystem'>,
) {
  if (metadata.ratingSystem === 'custom') {
    return RATING_BADGE_PLACEHOLDER_IMAGE_URLS.custom
  }

  if (metadata.ratingSystem === 'PEGI') {
    return RATING_BADGE_PLACEHOLDER_IMAGE_URLS.PEGI
  }

  return RATING_BADGE_PLACEHOLDER_IMAGE_URLS.ESRB
}

export function getRatingBadgePlaceholderTextColor(
  metadata: Pick<ProjectMetadata, 'ratingSystem'>,
) {
  return metadata.ratingSystem === 'custom' ? '#f9fafb' : '#111827'
}

export function getMediaMarkPlaceholderImageUrl(value: MediaMarkValue) {
  return MEDIA_MARK_PLACEHOLDER_IMAGE_URLS[value]
}

export function getPlatformMarkPlaceholderImageUrl(value: PlatformMarkValue) {
  return PLATFORM_MARK_PLACEHOLDER_IMAGE_URLS[value]
}

export function getTechnicalMarkPlaceholderImageUrl(value: TechnicalMarkValue) {
  return TECHNICAL_MARK_PLACEHOLDER_IMAGE_URLS[value]
}
