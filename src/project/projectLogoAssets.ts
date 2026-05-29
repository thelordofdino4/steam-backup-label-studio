import { getDefaultLogoAssetLayoutForTemplate } from '../layout/discTemplateLayoutDefaults.ts'
import { LOGO_PLACEHOLDER_IMAGE_URLS } from '../discPlaceholderAssets.ts'
import type { DiscTemplate } from '../types/template'
import type { BackgroundImageSize, LogoAssetLayout, ProjectLogoAssets } from './projectTypes'

export type LogoAssetKey = 'developer' | 'publisher'
export type LogoAssetLayoutField = keyof LogoAssetLayout

type LogoAssetLayoutPoint = {
  x: number
  y: number
}

export const LOGO_PLACEHOLDER_SIZE: BackgroundImageSize = {
  width: 480,
  height: 180,
}

export function getLogoAssetRenderDataUrl(
  logoKey: LogoAssetKey,
  imageDataUrl: string | null,
) {
  return imageDataUrl ?? LOGO_PLACEHOLDER_IMAGE_URLS[logoKey]
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

export function createDefaultProjectLogoAssets(
  selectedDiscTemplate?: DiscTemplate,
): ProjectLogoAssets {
  return {
    developerLogoDataUrl: null,
    developerLogoSize: null,
    developerLogoLayout: selectedDiscTemplate
      ? getDefaultLogoAssetLayoutForTemplate(selectedDiscTemplate, 'developer')
      : DEFAULT_DEVELOPER_LOGO_LAYOUT,
    publisherLogoDataUrl: null,
    publisherLogoSize: null,
    publisherLogoLayout: selectedDiscTemplate
      ? getDefaultLogoAssetLayoutForTemplate(selectedDiscTemplate, 'publisher')
      : DEFAULT_PUBLISHER_LOGO_LAYOUT,
  }
}

export function getLogoAssetLayout(
  logoAssets: ProjectLogoAssets,
  logoKey: LogoAssetKey,
) {
  return logoKey === 'developer'
    ? logoAssets.developerLogoLayout
    : logoAssets.publisherLogoLayout
}

export function getLogoAssetSize(
  logoAssets: ProjectLogoAssets,
  logoKey: LogoAssetKey,
) {
  return logoKey === 'developer'
    ? logoAssets.developerLogoSize
    : logoAssets.publisherLogoSize
}

export function setLogoAssetLayout(
  logoAssets: ProjectLogoAssets,
  logoKey: LogoAssetKey,
  layout: LogoAssetLayout,
): ProjectLogoAssets {
  if (logoKey === 'developer') {
    return {
      ...logoAssets,
      developerLogoLayout: layout,
    }
  }

  return {
    ...logoAssets,
    publisherLogoLayout: layout,
  }
}

export function updateLogoAssetLayoutField(
  logoAssets: ProjectLogoAssets,
  logoKey: LogoAssetKey,
  field: LogoAssetLayoutField,
  value: boolean | number,
): ProjectLogoAssets {
  return setLogoAssetLayout(logoAssets, logoKey, {
    ...getLogoAssetLayout(logoAssets, logoKey),
    [field]: value,
  })
}

export function updateLogoAssetLayoutPosition(
  logoAssets: ProjectLogoAssets,
  logoKey: LogoAssetKey,
  point: LogoAssetLayoutPoint,
): ProjectLogoAssets {
  return setLogoAssetLayout(logoAssets, logoKey, {
    ...getLogoAssetLayout(logoAssets, logoKey),
    x: point.x,
    y: point.y,
  })
}

export function setLogoAssetImage(
  logoAssets: ProjectLogoAssets,
  logoKey: LogoAssetKey,
  imageDataUrl: string,
  imageSize: BackgroundImageSize,
): ProjectLogoAssets {
  const nextLayout = {
    ...getLogoAssetLayout(logoAssets, logoKey),
    enabled: true,
  }

  if (logoKey === 'developer') {
    return {
      ...logoAssets,
      developerLogoDataUrl: imageDataUrl,
      developerLogoSize: imageSize,
      developerLogoLayout: nextLayout,
    }
  }

  return {
    ...logoAssets,
    publisherLogoDataUrl: imageDataUrl,
    publisherLogoSize: imageSize,
    publisherLogoLayout: nextLayout,
  }
}

export function clearLogoAsset(
  logoAssets: ProjectLogoAssets,
  logoKey: LogoAssetKey,
): ProjectLogoAssets {
  if (logoKey === 'developer') {
    return {
      ...logoAssets,
      developerLogoDataUrl: null,
      developerLogoSize: null,
    }
  }

  return {
    ...logoAssets,
    publisherLogoDataUrl: null,
    publisherLogoSize: null,
  }
}

export function resetProjectLogoAssetLayout(
  logoAssets: ProjectLogoAssets,
  logoKey: LogoAssetKey,
  selectedDiscTemplate?: DiscTemplate,
): ProjectLogoAssets {
  const defaults = createDefaultProjectLogoAssets(selectedDiscTemplate)
  const defaultLayout = getLogoAssetLayout(defaults, logoKey)
  const currentLayout = getLogoAssetLayout(logoAssets, logoKey)

  return setLogoAssetLayout(logoAssets, logoKey, {
    ...defaultLayout,
    enabled: currentLayout.enabled,
  })
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
  selectedDiscTemplate?: DiscTemplate,
): ProjectLogoAssets {
  const defaults = createDefaultProjectLogoAssets(selectedDiscTemplate)

  return {
    developerLogoDataUrl: logoAssets?.developerLogoDataUrl ?? null,
    developerLogoSize: logoAssets?.developerLogoSize ?? null,
    developerLogoLayout: normalizeLogoAssetLayout(
      logoAssets?.developerLogoLayout,
      defaults.developerLogoLayout,
    ),
    publisherLogoDataUrl: logoAssets?.publisherLogoDataUrl ?? null,
    publisherLogoSize: logoAssets?.publisherLogoSize ?? null,
    publisherLogoLayout: normalizeLogoAssetLayout(
      logoAssets?.publisherLogoLayout,
      defaults.publisherLogoLayout,
    ),
  }
}
