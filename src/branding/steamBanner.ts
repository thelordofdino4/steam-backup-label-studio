import { DEFAULT_STEAM_BANNER_LOCKUP_IMAGE_URL } from '../assets/assetManifest.ts'
import type { BackgroundImageSize } from '../project/projectTypes'
import {
  createSteamBannerLockupImageState as createSteamBannerLockupImageStateWithDefault,
  type SteamBannerLockupImageState,
} from './steamBannerDefaults'

export { DEFAULT_STEAM_BANNER_LOCKUP_IMAGE_URL } from '../assets/assetManifest.ts'
export {
  DEFAULT_ENABLED_STEAM_LOGO_PLACEMENT,
  DEFAULT_STEAM_BANNER_COLORS,
  DEFAULT_STEAM_BANNER_FALLBACK_TEXT,
  DEFAULT_STEAM_BANNER_LOCKUP_LAYOUT,
  createCustomSteamBannerLockupImageState,
  createSteamLogoPlacementMemory,
  getDefaultSteamBannerLockupSourceLabel,
  getEnabledSteamLogoPlacement,
  getNextSteamLogoPlacementMemory,
  isCustomSteamBannerLockupSource,
  normalizeSteamBannerFallbackText,
  shouldRenderSteamBannerTextFallback,
  updateSteamBannerColor,
  updateSteamBannerLockupLayoutField,
  type SteamBannerColorField,
  type SteamBannerLockupImageKind,
  type SteamBannerLockupLayoutField,
} from './steamBannerDefaults'
export type { SteamBannerLockupImageState } from './steamBannerDefaults'

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
  return createSteamBannerLockupImageStateWithDefault(
    imageUrl,
    imageSize,
    DEFAULT_STEAM_BANNER_LOCKUP_IMAGE_URL,
  )
}
