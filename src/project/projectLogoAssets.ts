import type { BackgroundImageSize, LogoAssetLayout, ProjectLogoAssets } from './projectTypes'

export type LogoAssetKey = 'developer' | 'publisher'

export const LOGO_PLACEHOLDER_SIZE: BackgroundImageSize = {
  width: 480,
  height: 180,
}

function createLogoPlaceholderDataUrl(label: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${LOGO_PLACEHOLDER_SIZE.width}" height="${LOGO_PLACEHOLDER_SIZE.height}" viewBox="0 0 ${LOGO_PLACEHOLDER_SIZE.width} ${LOGO_PLACEHOLDER_SIZE.height}"><rect width="480" height="180" rx="24" fill="#111827"/><rect x="12" y="12" width="456" height="156" rx="18" fill="none" stroke="#f9fafb" stroke-width="8"/><text x="240" y="82" text-anchor="middle" font-family="Arial, sans-serif" font-size="44" font-weight="900" fill="#f9fafb">${label}</text><text x="240" y="126" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="800" fill="#cbd5e1">LOGO PLACEHOLDER</text></svg>`

  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const LOGO_PLACEHOLDER_DATA_URLS: Record<LogoAssetKey, string> = {
  developer: createLogoPlaceholderDataUrl('DEVELOPER'),
  publisher: createLogoPlaceholderDataUrl('PUBLISHER'),
}

export function getLogoAssetRenderDataUrl(
  logoKey: LogoAssetKey,
  imageDataUrl: string | null,
) {
  return imageDataUrl ?? LOGO_PLACEHOLDER_DATA_URLS[logoKey]
}

export function getLogoAssetRenderSize(imageSize: BackgroundImageSize | null) {
  return imageSize ?? LOGO_PLACEHOLDER_SIZE
}

export const DEFAULT_DEVELOPER_LOGO_LAYOUT: LogoAssetLayout = {
  enabled: false,
  scale: 1,
  x: 22,
  y: 62,
}

export const DEFAULT_PUBLISHER_LOGO_LAYOUT: LogoAssetLayout = {
  enabled: false,
  scale: 1,
  x: 22,
  y: 72,
}

export function createDefaultProjectLogoAssets(): ProjectLogoAssets {
  return {
    developerLogoDataUrl: null,
    developerLogoSize: null,
    developerLogoLayout: DEFAULT_DEVELOPER_LOGO_LAYOUT,
    publisherLogoDataUrl: null,
    publisherLogoSize: null,
    publisherLogoLayout: DEFAULT_PUBLISHER_LOGO_LAYOUT,
  }
}

function normalizeLogoAssetLayout(
  layout: Partial<LogoAssetLayout> | undefined,
  defaults: LogoAssetLayout,
): LogoAssetLayout {
  return {
    enabled: layout?.enabled ?? defaults.enabled,
    scale: layout?.scale ?? defaults.scale,
    x: layout?.x ?? defaults.x,
    y: layout?.y ?? defaults.y,
  }
}

export function normalizeProjectLogoAssets(
  logoAssets: Partial<ProjectLogoAssets> | undefined,
): ProjectLogoAssets {
  return {
    developerLogoDataUrl: logoAssets?.developerLogoDataUrl ?? null,
    developerLogoSize: logoAssets?.developerLogoSize ?? null,
    developerLogoLayout: normalizeLogoAssetLayout(
      logoAssets?.developerLogoLayout,
      DEFAULT_DEVELOPER_LOGO_LAYOUT,
    ),
    publisherLogoDataUrl: logoAssets?.publisherLogoDataUrl ?? null,
    publisherLogoSize: logoAssets?.publisherLogoSize ?? null,
    publisherLogoLayout: normalizeLogoAssetLayout(
      logoAssets?.publisherLogoLayout,
      DEFAULT_PUBLISHER_LOGO_LAYOUT,
    ),
  }
}
