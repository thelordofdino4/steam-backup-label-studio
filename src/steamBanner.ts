import defaultSteamBannerLockupUrl from './assets/steam-default-lockup.png'
import type { BackgroundImageSize, SteamBannerColors, SteamBannerLockupLayout } from './project/projectTypes'

export type SteamBannerColorField = keyof SteamBannerColors
export type SteamBannerLockupLayoutField = keyof SteamBannerLockupLayout

export const DEFAULT_STEAM_BANNER_COLORS: SteamBannerColors = {
  gradientStart: '#2b475e',
  gradientEnd: '#1b2838',
  accent: '#2aabe1',
}

export const DEFAULT_STEAM_BANNER_LOCKUP_IMAGE_URL = defaultSteamBannerLockupUrl

export const DEFAULT_STEAM_BANNER_LOCKUP_LAYOUT: SteamBannerLockupLayout = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
}

export type SteamBannerLockupImageState = {
  imageUrl: string | null
  imageSize: BackgroundImageSize | null
}

export function createDefaultSteamBannerLockupImageState(): SteamBannerLockupImageState {
  return {
    imageUrl: DEFAULT_STEAM_BANNER_LOCKUP_IMAGE_URL,
    imageSize: null,
  }
}

export function createSteamBannerLockupImageState(
  imageUrl: string | null | undefined,
  imageSize: BackgroundImageSize | null | undefined,
): SteamBannerLockupImageState {
  return {
    imageUrl: imageUrl ?? DEFAULT_STEAM_BANNER_LOCKUP_IMAGE_URL,
    imageSize: imageSize ?? null,
  }
}

export function createCustomSteamBannerLockupImageState(
  imageUrl: string,
  imageSize: BackgroundImageSize,
): SteamBannerLockupImageState {
  return {
    imageUrl,
    imageSize,
  }
}

export function updateSteamBannerLockupLayoutField(
  layout: SteamBannerLockupLayout,
  field: SteamBannerLockupLayoutField,
  value: number,
): SteamBannerLockupLayout {
  return {
    ...layout,
    [field]: value,
  }
}

export function updateSteamBannerColor(
  colors: SteamBannerColors,
  field: SteamBannerColorField,
  value: string,
): SteamBannerColors {
  return {
    ...colors,
    [field]: value,
  }
}
