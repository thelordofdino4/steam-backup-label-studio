import type { SteamLogoPlacement } from '../discText/index'
import type {
  BackgroundImageSize,
  ProjectImageAssetProvenance,
  SteamBannerColors,
  SteamBannerLockupLayout,
} from '../project/projectTypes'

export type SteamBannerColorField = keyof SteamBannerColors
export type SteamBannerLockupLayoutField = keyof SteamBannerLockupLayout
export type SteamBannerLockupImageKind = 'banner-lockup' | 'spine-icon'

export const DEFAULT_STEAM_BANNER_COLORS: SteamBannerColors = {
  gradientStart: '#2b475e',
  gradientEnd: '#1b2838',
  accent: '#2aabe1',
}

export const DEFAULT_STEAM_BANNER_LOCKUP_LAYOUT: SteamBannerLockupLayout = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
}

// Taihazu's Steam lockup text fallback idea lives here so preview, export, and saved projects share one behavior.
export const DEFAULT_STEAM_BANNER_FALLBACK_TEXT = 'STEAM'
export const STEAM_BANNER_FALLBACK_TEXT_HEIGHT_RATIO = 0.72
const STEAM_BANNER_FALLBACK_TEXT_PREFERRED_CHARACTERS = 7

export const DEFAULT_ENABLED_STEAM_LOGO_PLACEMENT: SteamLogoPlacement = 'bottom'

const DEFAULT_STEAM_BANNER_LOCKUP_SOURCE_LABELS:
Record<SteamBannerLockupImageKind, string> = {
  'banner-lockup': 'Default Steam banner lockup',
  'spine-icon': 'Default Steam spine icon',
}

const CUSTOM_STEAM_BANNER_LOCKUP_SOURCE_LABELS:
Record<SteamBannerLockupImageKind, string> = {
  'banner-lockup': 'Custom Steam banner lockup',
  'spine-icon': 'Custom Steam spine icon',
}

export type SteamBannerLockupImageState = {
  imageUrl: string | null
  imageSize: BackgroundImageSize | null
}

export function createSteamBannerLockupImageState(
  imageUrl: string | null | undefined,
  imageSize: BackgroundImageSize | null | undefined,
  defaultImageUrl: string | null,
): SteamBannerLockupImageState {
  return {
    imageUrl: imageUrl ?? defaultImageUrl,
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

export function normalizeSteamBannerFallbackText(value: unknown): string {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : DEFAULT_STEAM_BANNER_FALLBACK_TEXT
}

export function getSteamBannerFallbackTextLengthScale(value: unknown): number {
  const text = normalizeSteamBannerFallbackText(value)

  return Math.min(
    1,
    STEAM_BANNER_FALLBACK_TEXT_PREFERRED_CHARACTERS /
      Math.max(text.length, 1),
  )
}

export function getSteamBannerFallbackTextFontSizeForHeight(
  value: unknown,
  targetHeight: number,
  minFontSize = 0,
): number {
  const height = Number.isFinite(targetHeight) && targetHeight > 0
    ? targetHeight
    : 0

  return Math.max(
    minFontSize,
    height *
      STEAM_BANNER_FALLBACK_TEXT_HEIGHT_RATIO *
      getSteamBannerFallbackTextLengthScale(value),
  )
}

export function shouldRenderSteamBannerTextFallback(
  useTextFallback: boolean,
  lockupImageUrl: string | null | undefined,
): boolean {
  return useTextFallback || !lockupImageUrl
}

export function getDefaultSteamBannerLockupSourceLabel(
  kind: SteamBannerLockupImageKind,
) {
  return DEFAULT_STEAM_BANNER_LOCKUP_SOURCE_LABELS[kind]
}

export function getCustomSteamBannerLockupSourceLabel(
  kind: SteamBannerLockupImageKind,
) {
  return CUSTOM_STEAM_BANNER_LOCKUP_SOURCE_LABELS[kind]
}

export function isCustomSteamBannerLockupSource(
  source: Pick<ProjectImageAssetProvenance, 'source'> | null | undefined,
) {
  return source?.source !== 'built-in'
}

export function createSteamLogoPlacementMemory(
  placement: SteamLogoPlacement,
): SteamLogoPlacement {
  return placement === 'none' ? DEFAULT_ENABLED_STEAM_LOGO_PLACEMENT : placement
}

export function getEnabledSteamLogoPlacement(
  rememberedPlacement: SteamLogoPlacement,
): SteamLogoPlacement {
  return rememberedPlacement === 'none'
    ? DEFAULT_ENABLED_STEAM_LOGO_PLACEMENT
    : rememberedPlacement
}

export function getNextSteamLogoPlacementMemory(
  currentMemory: SteamLogoPlacement,
  placement: SteamLogoPlacement,
): SteamLogoPlacement {
  return placement === 'none' ? currentMemory : placement
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
