import {
  getDefaultAdditionalLogoAssetLayoutForTemplate,
  getDefaultLogoAssetLayoutForTemplate,
  getNextAdditionalLogoAssetLayoutForTemplate,
} from '../layout/discTemplateLayoutDefaults.ts'
import { LOGO_PLACEHOLDER_IMAGE_URLS } from '../discPlaceholderAssets.ts'
import type { DiscTemplate } from '../types/template'
import type {
  BackgroundImageSize,
  LogoAssetLayout,
  ProjectAdditionalLogoAsset,
  ProjectLogoAssets,
} from './projectTypes'

export type LogoAssetKey = 'developer' | 'publisher'
export type LogoAssetLayoutField = keyof LogoAssetLayout

export type LogoAssetRenderItem = {
  logoKey: LogoAssetKey
  additionalLogoId?: string
  imageDataUrl: string | null
  imageSize: BackgroundImageSize | null
  layout: LogoAssetLayout
  label: string
}

type LogoAssetLayoutPoint = {
  x: number
  y: number
}

const FALLBACK_ADDITIONAL_LOGO_X_OFFSET_PERCENT = 20

let additionalLogoAssetIdCounter = 0

export const LOGO_PLACEHOLDER_SIZE: BackgroundImageSize = {
  width: 480,
  height: 180,
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

function createAdditionalLogoAssetId(logoKey: LogoAssetKey) {
  const randomId = globalThis.crypto?.randomUUID?.()

  if (randomId) {
    return `${logoKey}-${randomId}`
  }

  additionalLogoAssetIdCounter += 1

  return `${logoKey}-${Date.now().toString(36)}-${additionalLogoAssetIdCounter}`
}

function getAdditionalLogoField(logoKey: LogoAssetKey) {
  return logoKey === 'developer'
    ? 'additionalDeveloperLogos'
    : 'additionalPublisherLogos'
}

function getPrimaryLogoAssetLayout(
  logoAssets: ProjectLogoAssets,
  logoKey: LogoAssetKey,
) {
  return logoKey === 'developer'
    ? logoAssets.developerLogoLayout
    : logoAssets.publisherLogoLayout
}

function getPrimaryLogoAssetSize(
  logoAssets: ProjectLogoAssets,
  logoKey: LogoAssetKey,
) {
  return logoKey === 'developer'
    ? logoAssets.developerLogoSize
    : logoAssets.publisherLogoSize
}

function getFallbackAdditionalLogoLayout(
  logoKey: LogoAssetKey,
  additionalLogoIndex: number,
): LogoAssetLayout {
  const primaryLayout = logoKey === 'developer'
    ? DEFAULT_DEVELOPER_LOGO_LAYOUT
    : DEFAULT_PUBLISHER_LOGO_LAYOUT

  return {
    ...primaryLayout,
    x: primaryLayout.x +
      FALLBACK_ADDITIONAL_LOGO_X_OFFSET_PERCENT * (additionalLogoIndex + 1),
  }
}

function findAdditionalLogoAsset(
  logoAssets: ProjectLogoAssets,
  logoKey: LogoAssetKey,
  additionalLogoId: string,
) {
  return getAdditionalLogoAssets(logoAssets, logoKey).find(
    (logoAsset) => logoAsset.id === additionalLogoId,
  )
}

function setAdditionalLogoAssets(
  logoAssets: ProjectLogoAssets,
  logoKey: LogoAssetKey,
  additionalLogos: ProjectAdditionalLogoAsset[],
): ProjectLogoAssets {
  if (logoKey === 'developer') {
    return {
      ...logoAssets,
      additionalDeveloperLogos: additionalLogos,
    }
  }

  return {
    ...logoAssets,
    additionalPublisherLogos: additionalLogos,
  }
}

function updateAdditionalLogoAsset(
  logoAssets: ProjectLogoAssets,
  logoKey: LogoAssetKey,
  additionalLogoId: string,
  updater: (logoAsset: ProjectAdditionalLogoAsset) => ProjectAdditionalLogoAsset,
) {
  let didUpdate = false
  const nextAdditionalLogos = getAdditionalLogoAssets(logoAssets, logoKey).map(
    (logoAsset) => {
      if (logoAsset.id !== additionalLogoId) {
        return logoAsset
      }

      didUpdate = true
      return updater(logoAsset)
    },
  )

  return didUpdate
    ? setAdditionalLogoAssets(logoAssets, logoKey, nextAdditionalLogos)
    : logoAssets
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

export function createDefaultProjectLogoAssets(
  selectedDiscTemplate?: DiscTemplate,
): ProjectLogoAssets {
  return {
    developerLogoDataUrl: null,
    developerLogoSize: null,
    developerLogoLayout: selectedDiscTemplate
      ? getDefaultLogoAssetLayoutForTemplate(selectedDiscTemplate, 'developer')
      : DEFAULT_DEVELOPER_LOGO_LAYOUT,
    additionalDeveloperLogos: [],
    publisherLogoDataUrl: null,
    publisherLogoSize: null,
    publisherLogoLayout: selectedDiscTemplate
      ? getDefaultLogoAssetLayoutForTemplate(selectedDiscTemplate, 'publisher')
      : DEFAULT_PUBLISHER_LOGO_LAYOUT,
    additionalPublisherLogos: [],
  }
}

export function getAdditionalLogoAssets(
  logoAssets: ProjectLogoAssets,
  logoKey: LogoAssetKey,
) {
  return logoAssets[getAdditionalLogoField(logoKey)] ?? []
}

export function getLogoAssetLayout(
  logoAssets: ProjectLogoAssets,
  logoKey: LogoAssetKey,
  additionalLogoId?: string,
) {
  if (additionalLogoId) {
    return findAdditionalLogoAsset(logoAssets, logoKey, additionalLogoId)?.layout ??
      getFallbackAdditionalLogoLayout(logoKey, 0)
  }

  return getPrimaryLogoAssetLayout(logoAssets, logoKey)
}

export function getLogoAssetSize(
  logoAssets: ProjectLogoAssets,
  logoKey: LogoAssetKey,
  additionalLogoId?: string,
) {
  if (additionalLogoId) {
    return findAdditionalLogoAsset(logoAssets, logoKey, additionalLogoId)?.imageSize ?? null
  }

  return getPrimaryLogoAssetSize(logoAssets, logoKey)
}

export function setLogoAssetLayout(
  logoAssets: ProjectLogoAssets,
  logoKey: LogoAssetKey,
  layout: LogoAssetLayout,
  additionalLogoId?: string,
): ProjectLogoAssets {
  if (additionalLogoId) {
    return updateAdditionalLogoAsset(
      logoAssets,
      logoKey,
      additionalLogoId,
      (logoAsset) => ({
        ...logoAsset,
        layout,
      }),
    )
  }

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
  additionalLogoId?: string,
): ProjectLogoAssets {
  return setLogoAssetLayout(
    logoAssets,
    logoKey,
    {
      ...getLogoAssetLayout(logoAssets, logoKey, additionalLogoId),
      [field]: value,
    },
    additionalLogoId,
  )
}

export function updateLogoAssetLayoutPosition(
  logoAssets: ProjectLogoAssets,
  logoKey: LogoAssetKey,
  point: LogoAssetLayoutPoint,
  additionalLogoId?: string,
): ProjectLogoAssets {
  return setLogoAssetLayout(
    logoAssets,
    logoKey,
    {
      ...getLogoAssetLayout(logoAssets, logoKey, additionalLogoId),
      x: point.x,
      y: point.y,
    },
    additionalLogoId,
  )
}

export function setLogoAssetImage(
  logoAssets: ProjectLogoAssets,
  logoKey: LogoAssetKey,
  imageDataUrl: string,
  imageSize: BackgroundImageSize,
  additionalLogoId?: string,
): ProjectLogoAssets {
  const nextLayout = {
    ...getLogoAssetLayout(logoAssets, logoKey, additionalLogoId),
    enabled: true,
  }

  if (additionalLogoId) {
    return updateAdditionalLogoAsset(
      logoAssets,
      logoKey,
      additionalLogoId,
      (logoAsset) => ({
        ...logoAsset,
        imageDataUrl,
        imageSize,
        layout: nextLayout,
      }),
    )
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
  additionalLogoId?: string,
): ProjectLogoAssets {
  if (additionalLogoId) {
    return updateAdditionalLogoAsset(
      logoAssets,
      logoKey,
      additionalLogoId,
      (logoAsset) => ({
        ...logoAsset,
        imageDataUrl: null,
        imageSize: null,
      }),
    )
  }

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

export function addAdditionalLogoAsset(
  logoAssets: ProjectLogoAssets,
  logoKey: LogoAssetKey,
  selectedDiscTemplate?: DiscTemplate,
): ProjectLogoAssets {
  const additionalLogos = getAdditionalLogoAssets(logoAssets, logoKey)
  const previousAdditionalLogo = additionalLogos[additionalLogos.length - 1]
  const referenceLayout = previousAdditionalLogo?.layout ??
    getPrimaryLogoAssetLayout(logoAssets, logoKey)
  const layout = selectedDiscTemplate
    ? getNextAdditionalLogoAssetLayoutForTemplate(
        selectedDiscTemplate,
        referenceLayout,
      )
    : {
        ...referenceLayout,
        enabled: true,
        x: referenceLayout.x + FALLBACK_ADDITIONAL_LOGO_X_OFFSET_PERCENT,
      }

  return setAdditionalLogoAssets(logoAssets, logoKey, [
    ...additionalLogos,
    {
      id: createAdditionalLogoAssetId(logoKey),
      imageDataUrl: null,
      imageSize: null,
      layout,
    },
  ])
}

export function removeAdditionalLogoAsset(
  logoAssets: ProjectLogoAssets,
  logoKey: LogoAssetKey,
  additionalLogoId: string,
): ProjectLogoAssets {
  return setAdditionalLogoAssets(
    logoAssets,
    logoKey,
    getAdditionalLogoAssets(logoAssets, logoKey).filter(
      (logoAsset) => logoAsset.id !== additionalLogoId,
    ),
  )
}

export function resetProjectLogoAssetLayout(
  logoAssets: ProjectLogoAssets,
  logoKey: LogoAssetKey,
  selectedDiscTemplate?: DiscTemplate,
  additionalLogoId?: string,
): ProjectLogoAssets {
  if (additionalLogoId) {
    const additionalLogos = getAdditionalLogoAssets(logoAssets, logoKey)
    const additionalLogoIndex = Math.max(
      0,
      additionalLogos.findIndex((logoAsset) => logoAsset.id === additionalLogoId),
    )

    return updateAdditionalLogoAsset(
      logoAssets,
      logoKey,
      additionalLogoId,
      (logoAsset) => {
        const defaultLayout = selectedDiscTemplate
          ? getDefaultAdditionalLogoAssetLayoutForTemplate(
              selectedDiscTemplate,
              logoKey,
              additionalLogoIndex,
              logoAsset.imageSize,
            )
          : getFallbackAdditionalLogoLayout(logoKey, additionalLogoIndex)

        return {
          ...logoAsset,
          layout: {
            ...defaultLayout,
            enabled: logoAsset.layout.enabled,
          },
        }
      },
    )
  }

  const defaults = createDefaultProjectLogoAssets(selectedDiscTemplate)
  const defaultLayout = getLogoAssetLayout(defaults, logoKey)
  const currentLayout = getLogoAssetLayout(logoAssets, logoKey)

  return setLogoAssetLayout(logoAssets, logoKey, {
    ...defaultLayout,
    enabled: currentLayout.enabled,
  })
}

export function createLogoAssetRenderItems(
  logoAssets: ProjectLogoAssets,
): LogoAssetRenderItem[] {
  const renderItems: LogoAssetRenderItem[] = []

  if (logoAssets.developerLogoLayout.enabled) {
    renderItems.push({
      logoKey: 'developer',
      imageDataUrl: logoAssets.developerLogoDataUrl,
      imageSize: logoAssets.developerLogoSize,
      layout: logoAssets.developerLogoLayout,
      label: 'Developer',
    })
    renderItems.push(
      ...logoAssets.additionalDeveloperLogos
        .filter((logoAsset) => logoAsset.layout.enabled)
        .map((logoAsset, index) => ({
          logoKey: 'developer' as const,
          additionalLogoId: logoAsset.id,
          imageDataUrl: logoAsset.imageDataUrl,
          imageSize: logoAsset.imageSize,
          layout: logoAsset.layout,
          label: `Additional developer ${index + 1}`,
        })),
    )
  }

  if (logoAssets.publisherLogoLayout.enabled) {
    renderItems.push({
      logoKey: 'publisher',
      imageDataUrl: logoAssets.publisherLogoDataUrl,
      imageSize: logoAssets.publisherLogoSize,
      layout: logoAssets.publisherLogoLayout,
      label: 'Publisher',
    })
    renderItems.push(
      ...logoAssets.additionalPublisherLogos
        .filter((logoAsset) => logoAsset.layout.enabled)
        .map((logoAsset, index) => ({
          logoKey: 'publisher' as const,
          additionalLogoId: logoAsset.id,
          imageDataUrl: logoAsset.imageDataUrl,
          imageSize: logoAsset.imageSize,
          layout: logoAsset.layout,
          label: `Additional publisher ${index + 1}`,
        })),
    )
  }

  return renderItems
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

function normalizeAdditionalLogoAsset(
  logoKey: LogoAssetKey,
  logoAsset: Partial<ProjectAdditionalLogoAsset> | undefined,
  additionalLogoIndex: number,
  selectedDiscTemplate?: DiscTemplate,
): ProjectAdditionalLogoAsset | null {
  if (!logoAsset || typeof logoAsset !== 'object') {
    return null
  }

  const imageSize = logoAsset.imageSize ?? null
  const defaultLayout = selectedDiscTemplate
    ? getDefaultAdditionalLogoAssetLayoutForTemplate(
        selectedDiscTemplate,
        logoKey,
        additionalLogoIndex,
        imageSize,
      )
    : getFallbackAdditionalLogoLayout(logoKey, additionalLogoIndex)

  return {
    id: typeof logoAsset.id === 'string' && logoAsset.id.trim()
      ? logoAsset.id
      : createAdditionalLogoAssetId(logoKey),
    imageDataUrl: logoAsset.imageDataUrl ?? null,
    imageSize,
    layout: normalizeLogoAssetLayout(logoAsset.layout, defaultLayout),
  }
}

function normalizeAdditionalLogoAssets(
  logoAssets: Partial<ProjectLogoAssets> | undefined,
  logoKey: LogoAssetKey,
  selectedDiscTemplate?: DiscTemplate,
) {
  const rawAdditionalLogos = logoAssets?.[getAdditionalLogoField(logoKey)]

  if (!Array.isArray(rawAdditionalLogos)) {
    return []
  }

  return rawAdditionalLogos.flatMap((logoAsset, index) => {
    const normalizedLogoAsset = normalizeAdditionalLogoAsset(
      logoKey,
      logoAsset,
      index,
      selectedDiscTemplate,
    )

    return normalizedLogoAsset ? [normalizedLogoAsset] : []
  })
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
    additionalDeveloperLogos: normalizeAdditionalLogoAssets(
      logoAssets,
      'developer',
      selectedDiscTemplate,
    ),
    publisherLogoDataUrl: logoAssets?.publisherLogoDataUrl ?? null,
    publisherLogoSize: logoAssets?.publisherLogoSize ?? null,
    publisherLogoLayout: normalizeLogoAssetLayout(
      logoAssets?.publisherLogoLayout,
      defaults.publisherLogoLayout,
    ),
    additionalPublisherLogos: normalizeAdditionalLogoAssets(
      logoAssets,
      'publisher',
      selectedDiscTemplate,
    ),
  }
}
