import type { SteamLogoPlacement } from '../discText.ts'
import { getTitleArtworkBoundsPercent, type RenderBoundsPercent } from '../discGeometry.ts'
import { getDefaultTitleArtworkLayoutForTemplate } from '../layout/discTemplateLayoutDefaults.ts'
import type { SteamArtworkAsset } from '../steam/steamApi.ts'
import type { DiscTemplate } from '../types/template.ts'
import type { ImportedImageAsset } from '../utils/importedImageAsset.ts'
import type {
  BackgroundImageSize,
  ProjectTitleArtwork,
  TitleArtworkLayout,
} from './projectTypes.ts'

export type TitleArtworkLayoutField = keyof TitleArtworkLayout

type TitleArtworkLayoutPoint = {
  x: number
  y: number
}

export type TitleArtworkRenderItem = {
  imageDataUrl: string
  imageSize: BackgroundImageSize
  layout: TitleArtworkLayout
  unscaledBounds: RenderBoundsPercent
  scaledBounds: RenderBoundsPercent
  sourceLabel: string
}

export const DEFAULT_TITLE_ARTWORK_SOURCE_LABEL = 'Steam title/logo artwork'
export const CUSTOM_TITLE_ARTWORK_SOURCE_LABEL = 'Custom game logo artwork'
export const TITLE_ARTWORK_SCALE_MIN = 0.35
export const TITLE_ARTWORK_SCALE_MAX = 5

export const DEFAULT_TITLE_ARTWORK_SIZE: BackgroundImageSize = {
  width: 900,
  height: 360,
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
  return titleArtwork.layout.enabled && canUseTitleArtwork(titleArtwork)
}

export function createTitleArtworkRenderItem(
  titleArtwork: ProjectTitleArtwork,
): TitleArtworkRenderItem | null {
  if (!shouldRenderTitleArtwork(titleArtwork) || !titleArtwork.imageDataUrl) {
    return null
  }

  const imageSize = titleArtwork.imageSize ?? DEFAULT_TITLE_ARTWORK_SIZE

  return {
    imageDataUrl: titleArtwork.imageDataUrl,
    imageSize,
    layout: titleArtwork.layout,
    unscaledBounds: getTitleArtworkBoundsPercent(imageSize, 1),
    scaledBounds: getTitleArtworkBoundsPercent(
      imageSize,
      titleArtwork.layout.scale,
    ),
    sourceLabel: titleArtwork.sourceLabel,
  }
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
): ProjectTitleArtwork {
  const defaultLayout = createDefaultTitleArtworkLayout(
    selectedDiscTemplate,
    steamLogoPlacement,
    importedImage.imageSize,
  )
  const nextLayout = titleArtwork.imageDataUrl
    ? titleArtwork.layout
    : defaultLayout

  return {
    ...titleArtwork,
    source: 'steam',
    steamArtworkAssetId: steamAsset.id,
    sourceLabel: steamAsset.label,
    imageDataUrl: importedImage.imageDataUrl,
    imageSize: importedImage.imageSize,
    layout: {
      ...nextLayout,
      enabled: true,
    },
  }
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

  return {
    ...titleArtwork,
    source: 'custom',
    steamArtworkAssetId: null,
    sourceLabel: CUSTOM_TITLE_ARTWORK_SOURCE_LABEL,
    imageDataUrl: importedImage.imageDataUrl,
    imageSize: importedImage.imageSize,
    layout: {
      ...nextLayout,
      enabled: true,
    },
  }
}

export function clearTitleArtworkImage(
  titleArtwork: ProjectTitleArtwork,
  selectedDiscTemplate?: DiscTemplate,
  steamLogoPlacement: SteamLogoPlacement = 'top',
): ProjectTitleArtwork {
  return {
    ...titleArtwork,
    steamArtworkAssetId: null,
    sourceLabel: DEFAULT_TITLE_ARTWORK_SOURCE_LABEL,
    imageDataUrl: null,
    imageSize: null,
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
    enabled: layout?.enabled ?? defaults.enabled,
    scale: layout?.scale ?? defaults.scale,
    x: layout?.x ?? defaults.x,
    y: layout?.y ?? defaults.y,
  }
}

export function normalizeProjectTitleArtwork(
  titleArtwork: Partial<ProjectTitleArtwork> | undefined,
  selectedDiscTemplate?: DiscTemplate,
  steamLogoPlacement: SteamLogoPlacement = 'top',
): ProjectTitleArtwork {
  const imageSize = titleArtwork?.imageSize ?? null
  const defaults = createDefaultProjectTitleArtwork(
    selectedDiscTemplate,
    steamLogoPlacement,
    imageSize,
  )

  return {
    source: titleArtwork?.source === 'custom' ? 'custom' : 'steam',
    steamArtworkAssetId: titleArtwork?.steamArtworkAssetId ?? null,
    sourceLabel: titleArtwork?.sourceLabel ?? DEFAULT_TITLE_ARTWORK_SOURCE_LABEL,
    imageDataUrl: titleArtwork?.imageDataUrl ?? null,
    imageSize,
    layout: normalizeTitleArtworkLayout(titleArtwork?.layout, defaults.layout),
  }
}
