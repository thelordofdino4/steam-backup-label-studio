import {
  getDefaultAdditionalLogoAssetLayoutForTemplate,
  getDefaultLogoAssetLayoutForTemplate,
  getNextAdditionalLogoAssetLayoutForTemplate,
} from '../layout/discTemplateLayoutDefaults.ts'
import {
  LOGO_PLACEHOLDER_IMAGE_URLS,
  getLogoPlaceholderImageSize,
} from '../assets/assetManifest.ts'
import type { DiscTemplate } from '../types/template'
import type {
  BackgroundImageSize,
  LogoAssetLayout,
  ProjectAdditionalLogoAsset,
  ProjectImageAssetProvenance,
  ProjectLogoAssets,
  ProjectLogoAssetsInput,
} from './projectTypes'
import {
  createEmbeddedProjectImageAssetProvenance,
  normalizeProjectImageAssetProvenance,
} from './projectAssetStatus.ts'
import {
  clearEditorImageAssetSourceContent,
  setEditorImageAssetSourceContent,
} from '../editor/imageAssetTransitions.ts'
import {
  isOptionalVisualFeatureEnabled,
  setOptionalVisualFeatureEnabled,
} from '../editor/optionalVisualFeature.ts'
import {
  createAdditionalLogoAssetLabel,
  getLogoAssetImageFallbackLabel,
  getLogoAssetKindLabel,
  getPrimaryLogoAssetLabel,
  normalizeLogoAssetLabel,
  type LogoAssetKind,
} from '../editor/logoAsset.ts'
import {
  normalizeBoolean,
  normalizeFiniteNumber,
  normalizeImageSize,
  normalizeNullableString,
  normalizePositiveNumber,
} from './savedProjectNormalization.ts'
import { getLogoAssetBoundsPercent } from '../disc/geometry.ts'
import { getImageContentSize } from '../image/imageContentBounds.ts'

export type LogoAssetKey = LogoAssetKind
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

function getLegacyEmbeddedLogoLabel(logoKey: LogoAssetKey) {
  return getLogoAssetImageFallbackLabel(getPrimaryLogoAssetLabel(logoKey))
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

function getPrimaryLogoAssetDataUrl(
  logoAssets: ProjectLogoAssets,
  logoKey: LogoAssetKey,
) {
  return logoKey === 'developer'
    ? logoAssets.developerLogoDataUrl
    : logoAssets.publisherLogoDataUrl
}

function getPrimaryLogoAssetSource(
  logoAssets: ProjectLogoAssets,
  logoKey: LogoAssetKey,
) {
  return logoKey === 'developer'
    ? logoAssets.developerLogoSource
    : logoAssets.publisherLogoSource
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
  return imageSize ?? getLogoPlaceholderImageSize('developer')
}

export function createDefaultProjectLogoAssets(
  selectedDiscTemplate?: DiscTemplate,
): ProjectLogoAssets {
  return {
    developerLogoDataUrl: null,
    developerLogoSource: null,
    developerLogoSize: null,
    developerLogoLayout: selectedDiscTemplate
      ? getDefaultLogoAssetLayoutForTemplate(selectedDiscTemplate, 'developer')
      : DEFAULT_DEVELOPER_LOGO_LAYOUT,
    additionalDeveloperLogos: [],
    publisherLogoDataUrl: null,
    publisherLogoSource: null,
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

export function getPrimaryLogoAssetCanonicalVisualBounds(
  logoAssets: ProjectLogoAssets,
  logoKey: LogoAssetKey,
) {
  const imageDataUrl = getPrimaryLogoAssetDataUrl(logoAssets, logoKey)
  const imageSize = getPrimaryLogoAssetSize(logoAssets, logoKey)
  const canonicalImageSize = imageDataUrl?.trim()
    ? getLogoAssetRenderSize(imageSize)
    : getLogoPlaceholderImageSize(logoKey)

  if (!getImageContentSize(canonicalImageSize)) {
    return null
  }

  const bounds = getLogoAssetBoundsPercent(canonicalImageSize, 1)

  return bounds.halfWidth > 0 && bounds.halfHeight > 0
    ? bounds
    : null
}

export function getLogoAssetSource(
  logoAssets: ProjectLogoAssets,
  logoKey: LogoAssetKey,
  additionalLogoId?: string,
) {
  if (additionalLogoId) {
    return findAdditionalLogoAsset(logoAssets, logoKey, additionalLogoId)?.imageSource ?? null
  }

  return getPrimaryLogoAssetSource(logoAssets, logoKey)
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
  imageSource: ProjectImageAssetProvenance | null = null,
  additionalLogoId?: string,
): ProjectLogoAssets {
  const nextLayout = setOptionalVisualFeatureEnabled(
    getLogoAssetLayout(logoAssets, logoKey, additionalLogoId),
    true,
  )

  if (additionalLogoId) {
    return updateAdditionalLogoAsset(
      logoAssets,
      logoKey,
      additionalLogoId,
      (logoAsset) => ({
        ...setEditorImageAssetSourceContent(logoAsset, {
          imageDataUrl,
          imageSource,
          imageSize,
        }),
        layout: nextLayout,
      }),
    )
  }

  if (logoKey === 'developer') {
    return {
      ...logoAssets,
      developerLogoDataUrl: imageDataUrl,
      developerLogoSource: imageSource,
      developerLogoSize: imageSize,
      developerLogoLayout: nextLayout,
    }
  }

  return {
    ...logoAssets,
    publisherLogoDataUrl: imageDataUrl,
    publisherLogoSource: imageSource,
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
      clearEditorImageAssetSourceContent,
    )
  }

  if (logoKey === 'developer') {
    return {
      ...logoAssets,
      developerLogoDataUrl: null,
      developerLogoSource: null,
      developerLogoSize: null,
    }
  }

  return {
    ...logoAssets,
    publisherLogoDataUrl: null,
    publisherLogoSource: null,
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
      label: createAdditionalLogoAssetLabel(logoKey, additionalLogos.length),
      imageDataUrl: null,
      imageSource: null,
      imageSize: null,
      layout,
    },
  ])
}

export function updateAdditionalLogoAssetLabel(
  logoAssets: ProjectLogoAssets,
  logoKey: LogoAssetKey,
  additionalLogoId: string,
  label: string,
): ProjectLogoAssets {
  return updateAdditionalLogoAsset(
    logoAssets,
    logoKey,
    additionalLogoId,
    (logoAsset) => ({
      ...logoAsset,
      label,
    }),
  )
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

  if (isOptionalVisualFeatureEnabled(logoAssets.developerLogoLayout)) {
    renderItems.push({
      logoKey: 'developer',
      imageDataUrl: logoAssets.developerLogoDataUrl,
      imageSize: logoAssets.developerLogoSize,
      layout: logoAssets.developerLogoLayout,
      label: getLogoAssetKindLabel('developer'),
    })
    renderItems.push(
      ...logoAssets.additionalDeveloperLogos
        .filter((logoAsset) => isOptionalVisualFeatureEnabled(logoAsset.layout))
        .map((logoAsset, index) => ({
          logoKey: 'developer' as const,
          additionalLogoId: logoAsset.id,
          imageDataUrl: logoAsset.imageDataUrl,
          imageSize: logoAsset.imageSize,
          layout: logoAsset.layout,
          label: normalizeLogoAssetLabel(
            logoAsset.label,
            createAdditionalLogoAssetLabel('developer', index),
          ),
        })),
    )
  }

  if (isOptionalVisualFeatureEnabled(logoAssets.publisherLogoLayout)) {
    renderItems.push({
      logoKey: 'publisher',
      imageDataUrl: logoAssets.publisherLogoDataUrl,
      imageSize: logoAssets.publisherLogoSize,
      layout: logoAssets.publisherLogoLayout,
      label: getLogoAssetKindLabel('publisher'),
    })
    renderItems.push(
      ...logoAssets.additionalPublisherLogos
        .filter((logoAsset) => isOptionalVisualFeatureEnabled(logoAsset.layout))
        .map((logoAsset, index) => ({
          logoKey: 'publisher' as const,
          additionalLogoId: logoAsset.id,
          imageDataUrl: logoAsset.imageDataUrl,
          imageSize: logoAsset.imageSize,
          layout: logoAsset.layout,
          label: normalizeLogoAssetLabel(
            logoAsset.label,
            createAdditionalLogoAssetLabel('publisher', index),
          ),
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
    enabled: normalizeBoolean(layout?.enabled, defaults.enabled),
    scale: normalizePositiveNumber(layout?.scale, defaults.scale),
    x: normalizeFiniteNumber(layout?.x, defaults.x),
    y: normalizeFiniteNumber(layout?.y, defaults.y),
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

  const imageSize = normalizeImageSize(logoAsset.imageSize)
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
    label: normalizeLogoAssetLabel(
      logoAsset.label,
      createAdditionalLogoAssetLabel(logoKey, additionalLogoIndex),
    ),
    imageDataUrl: normalizeNullableString(logoAsset.imageDataUrl),
    imageSource: normalizeProjectImageAssetProvenance(
      logoAsset.imageSource,
      normalizeNullableString(logoAsset.imageDataUrl)
        ? createEmbeddedProjectImageAssetProvenance(
            `${createAdditionalLogoAssetLabel(logoKey, additionalLogoIndex)} image`,
          )
        : null,
    ),
    imageSize,
    layout: normalizeLogoAssetLayout(logoAsset.layout, defaultLayout),
  }
}

function normalizeAdditionalLogoAssets(
  logoAssets: ProjectLogoAssetsInput | undefined,
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
  logoAssets: ProjectLogoAssetsInput | undefined,
  selectedDiscTemplate?: DiscTemplate,
): ProjectLogoAssets {
  const defaults = createDefaultProjectLogoAssets(selectedDiscTemplate)

  return {
    developerLogoDataUrl: normalizeNullableString(
      logoAssets?.developerLogoDataUrl,
    ),
    developerLogoSource: normalizeProjectImageAssetProvenance(
      logoAssets?.developerLogoSource,
      normalizeNullableString(logoAssets?.developerLogoDataUrl)
        ? createEmbeddedProjectImageAssetProvenance(
            getLegacyEmbeddedLogoLabel('developer'),
          )
        : null,
    ),
    developerLogoSize: normalizeImageSize(logoAssets?.developerLogoSize),
    developerLogoLayout: normalizeLogoAssetLayout(
      logoAssets?.developerLogoLayout,
      defaults.developerLogoLayout,
    ),
    additionalDeveloperLogos: normalizeAdditionalLogoAssets(
      logoAssets,
      'developer',
      selectedDiscTemplate,
    ),
    publisherLogoDataUrl: normalizeNullableString(
      logoAssets?.publisherLogoDataUrl,
    ),
    publisherLogoSource: normalizeProjectImageAssetProvenance(
      logoAssets?.publisherLogoSource,
      normalizeNullableString(logoAssets?.publisherLogoDataUrl)
        ? createEmbeddedProjectImageAssetProvenance(
            getLegacyEmbeddedLogoLabel('publisher'),
          )
        : null,
    ),
    publisherLogoSize: normalizeImageSize(logoAssets?.publisherLogoSize),
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
