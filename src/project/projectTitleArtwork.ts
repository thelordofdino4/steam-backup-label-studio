import type { SteamLogoPlacement } from '../discText/types'
import { getTitleArtworkBoundsPercent } from '../disc/geometry.ts'
import {
  createPercentPositionedImageRenderArtifact,
  type PercentPositionedImageRenderArtifact,
} from '../render/imageRenderArtifact.ts'
import {
  shouldRenderOptionalLayoutFeature,
  setOptionalLayoutFeatureEnabled,
} from '../editor/optionalVisualFeature.ts'
import {
  clearEditorImageAssetContent,
  setEditorImageAssetContent,
} from '../editor/imageAssetTransitions.ts'
import { getDefaultTitleArtworkLayoutForTemplate } from '../layout/discTemplateLayoutDefaults.ts'
import {
  getImageContentSize,
  imageSizesWithContentBoundsMatch,
} from '../image/imageContentBounds.ts'
import type { SteamArtworkAsset } from '../steam/steamApi.ts'
import type { DiscTemplate } from '../types/template.ts'
import type { ImportedImageAsset } from '../utils/importedImageAsset.ts'
import type {
  BackgroundImageSize,
  ProjectTitleArtwork,
  ProjectTitleArtworkDefaultAsset,
  TitleArtworkLayout,
} from './projectTypes.ts'
import {
  normalizeBoolean,
  normalizeFiniteNumber,
  normalizeImageSize,
  normalizeNullableString,
  normalizePositiveNumber,
  normalizeString,
} from './savedProjectNormalization.ts'

export type TitleArtworkLayoutField = keyof TitleArtworkLayout

type TitleArtworkLayoutPoint = {
  x: number
  y: number
}

type SetTitleArtworkImageOptions = {
  rememberAsDefault?: boolean
}

type RememberTitleArtworkDefaultOptions = {
  replace?: boolean
}

export type TitleArtworkRenderItem = PercentPositionedImageRenderArtifact<
  TitleArtworkLayout,
  {
  imageSize: BackgroundImageSize
  sourceLabel: string
  }
>

export const DEFAULT_TITLE_ARTWORK_SOURCE_LABEL = 'Steam title/logo artwork'
export const CUSTOM_TITLE_ARTWORK_SOURCE_LABEL = 'Custom game logo artwork'
export const TITLE_ARTWORK_SCALE_MIN = 0.35
export const TITLE_ARTWORK_SCALE_MAX = 5

export const DEFAULT_TITLE_ARTWORK_SIZE: BackgroundImageSize = {
  width: 900,
  height: 360,
}

function getTitleArtworkRenderSize(
  imageSize: BackgroundImageSize | null,
) {
  return imageSize ?? DEFAULT_TITLE_ARTWORK_SIZE
}

function normalizeTitleArtworkLabel(label: unknown, fallbackLabel: string) {
  return normalizeString(label, fallbackLabel)
}

function createDefaultTitleArtworkLayout(
  selectedDiscTemplate?: DiscTemplate,
  steamLogoPlacement: SteamLogoPlacement = 'top',
  imageSize: BackgroundImageSize | null = null,
): TitleArtworkLayout {
  return selectedDiscTemplate
    ? getDefaultTitleArtworkLayoutForTemplate(
        selectedDiscTemplate,
        steamLogoPlacement,
        imageSize,
      )
    : {
        enabled: false,
        scale: 1,
        x: 50,
        y: steamLogoPlacement === 'bottom' ? 81.5 : 19.5,
      }
}

export function createDefaultProjectTitleArtwork(
  selectedDiscTemplate?: DiscTemplate,
  steamLogoPlacement: SteamLogoPlacement = 'top',
  imageSize: BackgroundImageSize | null = null,
): ProjectTitleArtwork {
  return {
    source: 'steam',
    steamArtworkAssetId: null,
    sourceLabel: DEFAULT_TITLE_ARTWORK_SOURCE_LABEL,
    imageDataUrl: null,
    imageSize: null,
    defaultSteamLogo: null,
    layout: createDefaultTitleArtworkLayout(
      selectedDiscTemplate,
      steamLogoPlacement,
      imageSize,
    ),
  }
}

export function canUseTitleArtwork(titleArtwork: ProjectTitleArtwork) {
  return Boolean(titleArtwork.imageDataUrl)
}

export function shouldRenderTitleArtwork(titleArtwork: ProjectTitleArtwork) {
  return shouldRenderOptionalLayoutFeature(
    titleArtwork,
    canUseTitleArtwork(titleArtwork),
  )
}

function isSameTitleArtworkDefaultImage(
  titleArtwork: ProjectTitleArtwork,
  defaultSteamLogo: ProjectTitleArtworkDefaultAsset,
) {
  return titleArtwork.imageDataUrl === defaultSteamLogo.imageDataUrl &&
    imageSizesWithContentBoundsMatch(
      titleArtwork.imageSize,
      defaultSteamLogo.imageSize,
    )
}

export function getTitleArtworkDefaultSteamLogo(
  titleArtwork: ProjectTitleArtwork,
) {
  return titleArtwork.defaultSteamLogo
}

export function canRestoreTitleArtworkDefaultSteamLogo(
  titleArtwork: ProjectTitleArtwork,
) {
  const defaultSteamLogo = getTitleArtworkDefaultSteamLogo(titleArtwork)

  if (!defaultSteamLogo) {
    return false
  }

  return !isSameTitleArtworkDefaultImage(titleArtwork, defaultSteamLogo) ||
    titleArtwork.source !== 'steam' ||
    titleArtwork.steamArtworkAssetId !== defaultSteamLogo.steamArtworkAssetId
}

export function createTitleArtworkRenderItem(
  titleArtwork: ProjectTitleArtwork,
): TitleArtworkRenderItem | null {
  if (!shouldRenderTitleArtwork(titleArtwork) || !titleArtwork.imageDataUrl) {
    return null
  }

  const imageSize = getTitleArtworkRenderSize(titleArtwork.imageSize)

  return createPercentPositionedImageRenderArtifact({
    imageDataUrl: titleArtwork.imageDataUrl,
    imageSize,
    label: 'Game title artwork',
    alt: 'Game title artwork',
    layout: titleArtwork.layout,
    unscaledBounds: getTitleArtworkBoundsPercent(imageSize, 1),
    scaledBounds: getTitleArtworkBoundsPercent(
      imageSize,
      titleArtwork.layout.scale,
    ),
    sourceLabel: titleArtwork.sourceLabel,
  })
}

export function getTitleArtworkCanonicalVisualBounds(
  titleArtwork: ProjectTitleArtwork,
) {
  if (!titleArtwork.imageDataUrl?.trim()) {
    return null
  }

  const imageSize = getTitleArtworkRenderSize(titleArtwork.imageSize)

  if (!getImageContentSize(imageSize)) {
    return null
  }

  const bounds = getTitleArtworkBoundsPercent(imageSize, 1)

  return bounds.halfWidth > 0 && bounds.halfHeight > 0
    ? bounds
    : null
}

export function setTitleArtworkLayout(
  titleArtwork: ProjectTitleArtwork,
  layout: TitleArtworkLayout,
): ProjectTitleArtwork {
  return {
    ...titleArtwork,
    layout,
  }
}

export function updateTitleArtworkLayoutField(
  titleArtwork: ProjectTitleArtwork,
  field: TitleArtworkLayoutField,
  value: boolean | number,
): ProjectTitleArtwork {
  return setTitleArtworkLayout(titleArtwork, {
    ...titleArtwork.layout,
    [field]: value,
  })
}

export function updateTitleArtworkLayoutPosition(
  titleArtwork: ProjectTitleArtwork,
  point: TitleArtworkLayoutPoint,
): ProjectTitleArtwork {
  return setTitleArtworkLayout(titleArtwork, {
    ...titleArtwork.layout,
    x: point.x,
    y: point.y,
  })
}

export function setTitleArtworkImage(
  titleArtwork: ProjectTitleArtwork,
  importedImage: ImportedImageAsset,
  steamAsset: SteamArtworkAsset,
  selectedDiscTemplate?: DiscTemplate,
  steamLogoPlacement: SteamLogoPlacement = 'top',
  options: SetTitleArtworkImageOptions = {},
): ProjectTitleArtwork {
  const defaultLayout = createDefaultTitleArtworkLayout(
    selectedDiscTemplate,
    steamLogoPlacement,
    importedImage.imageSize,
  )
  const nextLayout = titleArtwork.imageDataUrl
    ? titleArtwork.layout
    : defaultLayout

  const nextTitleArtwork: ProjectTitleArtwork = setEditorImageAssetContent({
    ...titleArtwork,
    source: 'steam' as const,
    steamArtworkAssetId: steamAsset.id,
    sourceLabel: steamAsset.label,
    layout: nextLayout,
  }, importedImage)

  const enabledTitleArtwork =
    setOptionalLayoutFeatureEnabled(nextTitleArtwork, true)

  return options.rememberAsDefault
    ? rememberTitleArtworkDefaultSteamLogo(
        enabledTitleArtwork,
        importedImage,
        steamAsset,
        { replace: true },
      )
    : enabledTitleArtwork
}

export function rememberTitleArtworkDefaultSteamLogo(
  titleArtwork: ProjectTitleArtwork,
  importedImage: ImportedImageAsset,
  steamAsset: SteamArtworkAsset,
  options: RememberTitleArtworkDefaultOptions = {},
): ProjectTitleArtwork {
  if (titleArtwork.defaultSteamLogo && !options.replace) {
    return titleArtwork
  }

  return {
    ...titleArtwork,
    defaultSteamLogo: {
      steamArtworkAssetId: steamAsset.id,
      sourceLabel: normalizeTitleArtworkLabel(
        steamAsset.label,
        DEFAULT_TITLE_ARTWORK_SOURCE_LABEL,
      ),
      imageDataUrl: importedImage.imageDataUrl,
      imageSize: importedImage.imageSize,
    },
  }
}

export function clearTitleArtworkDefaultSteamLogo(
  titleArtwork: ProjectTitleArtwork,
): ProjectTitleArtwork {
  return {
    ...titleArtwork,
    defaultSteamLogo: null,
  }
}

export function restoreTitleArtworkDefaultSteamLogo(
  titleArtwork: ProjectTitleArtwork,
): ProjectTitleArtwork {
  const defaultSteamLogo = getTitleArtworkDefaultSteamLogo(titleArtwork)

  if (!defaultSteamLogo) {
    return titleArtwork
  }

  return setEditorImageAssetContent({
    ...setOptionalLayoutFeatureEnabled(titleArtwork, true),
    source: 'steam' as const,
    steamArtworkAssetId: defaultSteamLogo.steamArtworkAssetId,
    sourceLabel: defaultSteamLogo.sourceLabel,
  }, defaultSteamLogo)
}

export function setCustomTitleArtworkImage(
  titleArtwork: ProjectTitleArtwork,
  importedImage: ImportedImageAsset,
  selectedDiscTemplate?: DiscTemplate,
  steamLogoPlacement: SteamLogoPlacement = 'top',
): ProjectTitleArtwork {
  const defaultLayout = createDefaultTitleArtworkLayout(
    selectedDiscTemplate,
    steamLogoPlacement,
    importedImage.imageSize,
  )
  const nextLayout = titleArtwork.imageDataUrl
    ? titleArtwork.layout
    : defaultLayout

  return setOptionalLayoutFeatureEnabled(setEditorImageAssetContent({
    ...titleArtwork,
    source: 'custom' as const,
    steamArtworkAssetId: null,
    sourceLabel: CUSTOM_TITLE_ARTWORK_SOURCE_LABEL,
    layout: nextLayout,
  }, importedImage), true)
}

export function clearTitleArtworkImage(
  titleArtwork: ProjectTitleArtwork,
  selectedDiscTemplate?: DiscTemplate,
  steamLogoPlacement: SteamLogoPlacement = 'top',
): ProjectTitleArtwork {
  return {
    ...clearEditorImageAssetContent(titleArtwork),
    steamArtworkAssetId: null,
    sourceLabel: DEFAULT_TITLE_ARTWORK_SOURCE_LABEL,
    layout: {
      ...createDefaultTitleArtworkLayout(selectedDiscTemplate, steamLogoPlacement),
      enabled: false,
    },
  }
}

export function resetProjectTitleArtworkLayout(
  titleArtwork: ProjectTitleArtwork,
  selectedDiscTemplate?: DiscTemplate,
  steamLogoPlacement: SteamLogoPlacement = 'top',
): ProjectTitleArtwork {
  return {
    ...titleArtwork,
    layout: {
      ...createDefaultTitleArtworkLayout(
        selectedDiscTemplate,
        steamLogoPlacement,
        titleArtwork.imageSize,
      ),
      enabled: titleArtwork.layout.enabled,
    },
  }
}

function normalizeTitleArtworkLayout(
  layout: Partial<TitleArtworkLayout> | undefined,
  defaults: TitleArtworkLayout,
): TitleArtworkLayout {
  return {
    enabled: normalizeBoolean(layout?.enabled, defaults.enabled),
    scale: normalizePositiveNumber(layout?.scale, defaults.scale),
    x: normalizeFiniteNumber(layout?.x, defaults.x),
    y: normalizeFiniteNumber(layout?.y, defaults.y),
  }
}

function normalizeTitleArtworkDefaultSteamLogo(
  defaultSteamLogo: Partial<ProjectTitleArtworkDefaultAsset> | null | undefined,
): ProjectTitleArtworkDefaultAsset | null {
  const steamArtworkAssetId = normalizeNullableString(
    defaultSteamLogo?.steamArtworkAssetId,
  )
  const imageDataUrl = normalizeNullableString(defaultSteamLogo?.imageDataUrl)
  const imageSize = normalizeImageSize(defaultSteamLogo?.imageSize)

  if (
    !defaultSteamLogo ||
    !steamArtworkAssetId ||
    !imageDataUrl ||
    !imageSize
  ) {
    return null
  }

  return {
    steamArtworkAssetId,
    sourceLabel: normalizeTitleArtworkLabel(
      defaultSteamLogo.sourceLabel,
      DEFAULT_TITLE_ARTWORK_SOURCE_LABEL,
    ),
    imageDataUrl,
    imageSize,
  }
}

export function normalizeProjectTitleArtwork(
  titleArtwork: Partial<ProjectTitleArtwork> | undefined,
  selectedDiscTemplate?: DiscTemplate,
  steamLogoPlacement: SteamLogoPlacement = 'top',
): ProjectTitleArtwork {
  const imageSize = normalizeImageSize(titleArtwork?.imageSize)
  const source = titleArtwork?.source === 'custom' ? 'custom' : 'steam'
  const steamArtworkAssetId = normalizeNullableString(
    titleArtwork?.steamArtworkAssetId,
  )
  const imageDataUrl = normalizeNullableString(titleArtwork?.imageDataUrl)
  const defaultSteamLogo = normalizeTitleArtworkDefaultSteamLogo(
    titleArtwork?.defaultSteamLogo,
  )
  const currentSteamLogoAsDefault =
    source === 'steam' &&
    steamArtworkAssetId &&
    imageDataUrl &&
    imageSize
      ? {
          steamArtworkAssetId,
          sourceLabel: normalizeTitleArtworkLabel(
            titleArtwork?.sourceLabel,
            DEFAULT_TITLE_ARTWORK_SOURCE_LABEL,
          ),
          imageDataUrl,
          imageSize,
        }
      : null
  const defaults = createDefaultProjectTitleArtwork(
    selectedDiscTemplate,
    steamLogoPlacement,
    imageSize,
  )

  return {
    source,
    steamArtworkAssetId,
    sourceLabel: normalizeTitleArtworkLabel(
      titleArtwork?.sourceLabel,
      DEFAULT_TITLE_ARTWORK_SOURCE_LABEL,
    ),
    imageDataUrl,
    imageSize,
    defaultSteamLogo: defaultSteamLogo ?? currentSteamLogoAsDefault,
    layout: normalizeTitleArtworkLayout(titleArtwork?.layout, defaults.layout),
  }
}
