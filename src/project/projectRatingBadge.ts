import { getDefaultRatingBadgeLayoutForTemplate } from '../layout/discTemplateLayoutDefaults.ts'
import {
  isOptionalLayoutFeatureEnabled,
  setOptionalLayoutFeatureEnabled,
} from '../editor/optionalVisualFeature.ts'
import {
  hasCustomMarkImage,
} from '../editor/markImageSource.ts'
import type { DiscTemplate } from '../types/template'
import {
  getRatingMetadataForBadgeEnabled,
  normalizeUskRatingValue,
  type UskRatingValue,
} from './projectMetadata.ts'
import type {
  BackgroundImageSize,
  ProjectMetadata,
  ProjectRatingBadge,
  ProjectSupplementalUskRatingBadge,
  RatingBadgeLayout,
  RatingBadgeSource,
} from './projectTypes'

export type RatingBadgeLayoutField = keyof RatingBadgeLayout
export type RatingBadgeElementKey = 'primary' | 'usk'

type RatingBadgeLayoutPoint = {
  x: number
  y: number
}

const DEFAULT_SUPPLEMENTAL_USK_RATING_VALUE: UskRatingValue = '0'
const SUPPLEMENTAL_USK_BADGE_X_OFFSET = -11
const SUPPLEMENTAL_USK_BADGE_SCALE_MULTIPLIER = 1.2

export const DEFAULT_RATING_BADGE_LAYOUT: RatingBadgeLayout = {
  enabled: false,
  scale: 1,
  x: 78,
  y: 50,
}

export const DEFAULT_SUPPLEMENTAL_USK_BADGE_LAYOUT: RatingBadgeLayout = {
  ...DEFAULT_RATING_BADGE_LAYOUT,
  scale: DEFAULT_RATING_BADGE_LAYOUT.scale * SUPPLEMENTAL_USK_BADGE_SCALE_MULTIPLIER,
  x: DEFAULT_RATING_BADGE_LAYOUT.x + SUPPLEMENTAL_USK_BADGE_X_OFFSET,
}

function createDefaultSupplementalUskRatingBadge(
  selectedDiscTemplate?: DiscTemplate,
): ProjectSupplementalUskRatingBadge {
  const baseLayout = selectedDiscTemplate
    ? getDefaultRatingBadgeLayoutForTemplate(selectedDiscTemplate)
    : DEFAULT_RATING_BADGE_LAYOUT

  return {
    ratingValue: DEFAULT_SUPPLEMENTAL_USK_RATING_VALUE,
    layout: {
      ...baseLayout,
      enabled: false,
      scale: baseLayout.scale * SUPPLEMENTAL_USK_BADGE_SCALE_MULTIPLIER,
      x: baseLayout.x + SUPPLEMENTAL_USK_BADGE_X_OFFSET,
    },
  }
}

export function createDefaultProjectRatingBadge(
  selectedDiscTemplate?: DiscTemplate,
): ProjectRatingBadge {
  return {
    source: 'placeholder',
    customImageDataUrl: null,
    customImageSize: null,
    layout: selectedDiscTemplate
      ? getDefaultRatingBadgeLayoutForTemplate(selectedDiscTemplate)
      : DEFAULT_RATING_BADGE_LAYOUT,
    uskBadge: createDefaultSupplementalUskRatingBadge(selectedDiscTemplate),
  }
}

export function updateRatingBadgeSource(
  ratingBadge: ProjectRatingBadge,
  source: RatingBadgeSource,
): ProjectRatingBadge {
  return {
    ...ratingBadge,
    source,
  }
}

export function updateRatingBadgeLayoutField(
  ratingBadge: ProjectRatingBadge,
  field: RatingBadgeLayoutField,
  value: boolean | number,
): ProjectRatingBadge {
  return {
    ...ratingBadge,
    layout: {
      ...ratingBadge.layout,
      [field]: value,
    },
  }
}

export function updateRatingBadgeLayoutPosition(
  ratingBadge: ProjectRatingBadge,
  point: RatingBadgeLayoutPoint,
): ProjectRatingBadge {
  return {
    ...ratingBadge,
    layout: {
      ...ratingBadge.layout,
      x: point.x,
      y: point.y,
    },
  }
}

export function getRatingBadgeElementLayout(
  ratingBadge: ProjectRatingBadge,
  badgeKey: RatingBadgeElementKey,
) {
  return badgeKey === 'primary' ? ratingBadge.layout : ratingBadge.uskBadge.layout
}

export function setRatingBadgeElementLayout(
  ratingBadge: ProjectRatingBadge,
  badgeKey: RatingBadgeElementKey,
  layout: RatingBadgeLayout,
): ProjectRatingBadge {
  if (badgeKey === 'primary') {
    return {
      ...ratingBadge,
      layout,
    }
  }

  return {
    ...ratingBadge,
    uskBadge: {
      ...ratingBadge.uskBadge,
      layout,
    },
  }
}

export function updateRatingBadgeElementLayoutPosition(
  ratingBadge: ProjectRatingBadge,
  badgeKey: RatingBadgeElementKey,
  point: RatingBadgeLayoutPoint,
): ProjectRatingBadge {
  const layout = getRatingBadgeElementLayout(ratingBadge, badgeKey)

  return setRatingBadgeElementLayout(ratingBadge, badgeKey, {
    ...layout,
    x: point.x,
    y: point.y,
  })
}

export function setRatingBadgeCustomImage(
  ratingBadge: ProjectRatingBadge,
  imageDataUrl: string,
  imageSize: BackgroundImageSize,
): ProjectRatingBadge {
  return setOptionalLayoutFeatureEnabled({
    ...ratingBadge,
    source: 'custom',
    customImageDataUrl: imageDataUrl,
    customImageSize: imageSize,
  }, true)
}

export function clearRatingBadgeImage(
  ratingBadge: ProjectRatingBadge,
): ProjectRatingBadge {
  return {
    ...ratingBadge,
    source: 'placeholder',
    customImageDataUrl: null,
    customImageSize: null,
  }
}

export function resetProjectRatingBadgeLayout(
  ratingBadge: ProjectRatingBadge,
  selectedDiscTemplate?: DiscTemplate,
): ProjectRatingBadge {
  const defaults = createDefaultProjectRatingBadge(selectedDiscTemplate)
  const defaultLayout = selectedDiscTemplate
    ? getDefaultRatingBadgeLayoutForTemplate(selectedDiscTemplate, ratingBadge)
    : defaults.layout

  return {
    ...ratingBadge,
    layout: {
      ...defaultLayout,
      enabled: ratingBadge.layout.enabled,
    },
  }
}

export function updateSupplementalUskRatingBadgeEnabledState(
  ratingBadge: ProjectRatingBadge,
  enabled: boolean,
): ProjectRatingBadge {
  return {
    ...ratingBadge,
    uskBadge: setOptionalLayoutFeatureEnabled(ratingBadge.uskBadge, enabled),
  }
}

export function updateSupplementalUskRatingBadgeValue(
  ratingBadge: ProjectRatingBadge,
  ratingValue: string,
): ProjectRatingBadge {
  return {
    ...ratingBadge,
    uskBadge: {
      ...ratingBadge.uskBadge,
      ratingValue:
        normalizeUskRatingValue(ratingValue) ??
        DEFAULT_SUPPLEMENTAL_USK_RATING_VALUE,
    },
  }
}

export function updateSupplementalUskRatingBadgeLayoutField(
  ratingBadge: ProjectRatingBadge,
  field: RatingBadgeLayoutField,
  value: boolean | number,
): ProjectRatingBadge {
  return {
    ...ratingBadge,
    uskBadge: {
      ...ratingBadge.uskBadge,
      layout: {
        ...ratingBadge.uskBadge.layout,
        [field]: value,
      },
    },
  }
}

export function resetSupplementalUskRatingBadgeLayout(
  ratingBadge: ProjectRatingBadge,
  selectedDiscTemplate?: DiscTemplate,
): ProjectRatingBadge {
  const defaults = createDefaultSupplementalUskRatingBadge(selectedDiscTemplate)

  return {
    ...ratingBadge,
    uskBadge: {
      ...ratingBadge.uskBadge,
      layout: {
        ...defaults.layout,
        enabled: ratingBadge.uskBadge.layout.enabled,
      },
    },
  }
}

export function shouldRenderRatingBadge(
  metadata: Pick<ProjectMetadata, 'ratingSystem'>,
  ratingBadge: ProjectRatingBadge,
) {
  return isOptionalLayoutFeatureEnabled(ratingBadge) &&
    metadata.ratingSystem !== 'none'
}

export function shouldRenderSupplementalUskRatingBadge(
  metadata: Pick<ProjectMetadata, 'ratingSystem'>,
  ratingBadge: ProjectRatingBadge,
) {
  return (
    shouldRenderRatingBadge(metadata, ratingBadge) &&
    metadata.ratingSystem === 'PEGI' &&
    isOptionalLayoutFeatureEnabled(ratingBadge.uskBadge) &&
    Boolean(normalizeUskRatingValue(ratingBadge.uskBadge.ratingValue))
  )
}

export function shouldUseCustomRatingBadgeImage(
  ratingBadge: Pick<ProjectRatingBadge, 'source' | 'customImageDataUrl'>,
) {
  return hasCustomMarkImage(
    ratingBadge.source,
    ratingBadge.customImageDataUrl,
  )
}

export function updateRatingBadgeEnabledState(
  metadata: ProjectMetadata,
  ratingBadge: ProjectRatingBadge,
  enabled: boolean,
): { metadata: ProjectMetadata; ratingBadge: ProjectRatingBadge } {
  const nextMetadata = enabled
    ? {
        ...metadata,
        ...getRatingMetadataForBadgeEnabled(metadata),
      }
    : metadata

  return {
    metadata: nextMetadata,
    ratingBadge: setOptionalLayoutFeatureEnabled(ratingBadge, enabled),
  }
}

function normalizeRatingBadgeLayout(
  layout: Partial<RatingBadgeLayout> | undefined,
  defaults: RatingBadgeLayout = DEFAULT_RATING_BADGE_LAYOUT,
): RatingBadgeLayout {
  return {
    enabled: layout?.enabled ?? defaults.enabled,
    scale: layout?.scale ?? defaults.scale,
    x: layout?.x ?? defaults.x,
    y: layout?.y ?? defaults.y,
  }
}

function normalizeSupplementalUskRatingBadge(
  ratingBadge: Partial<ProjectSupplementalUskRatingBadge> | undefined,
  selectedDiscTemplate?: DiscTemplate,
): ProjectSupplementalUskRatingBadge {
  const defaults = createDefaultSupplementalUskRatingBadge(selectedDiscTemplate)

  return {
    ratingValue:
      normalizeUskRatingValue(ratingBadge?.ratingValue ?? '') ??
      defaults.ratingValue,
    layout: normalizeRatingBadgeLayout(ratingBadge?.layout, defaults.layout),
  }
}

export function normalizeProjectRatingBadge(
  ratingBadge: Partial<ProjectRatingBadge> | undefined,
  selectedDiscTemplate?: DiscTemplate,
): ProjectRatingBadge {
  const defaults = createDefaultProjectRatingBadge(selectedDiscTemplate)
  const source = ratingBadge?.source ?? 'placeholder'
  const customImageSize = ratingBadge?.customImageSize ?? null
  const defaultLayout = selectedDiscTemplate
    ? getDefaultRatingBadgeLayoutForTemplate(selectedDiscTemplate, {
        source,
        customImageSize,
      })
    : defaults.layout

  return {
    source,
    customImageDataUrl: ratingBadge?.customImageDataUrl ?? null,
    customImageSize,
    layout: normalizeRatingBadgeLayout(ratingBadge?.layout, defaultLayout),
    uskBadge: normalizeSupplementalUskRatingBadge(
      ratingBadge?.uskBadge,
      selectedDiscTemplate,
    ),
  }
}
