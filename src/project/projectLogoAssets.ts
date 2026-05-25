import type { LogoAssetLayout, ProjectLogoAssets } from './projectTypes'

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
