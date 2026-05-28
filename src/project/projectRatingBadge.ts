import { getDefaultRatingBadgeLayoutForTemplate } from '../layout/discTemplateLayoutDefaults.ts'
import type { DiscTemplate } from '../types/template'
import { getRatingMetadataForBadgeEnabled } from './projectMetadata.ts'
import type { BackgroundImageSize, ProjectMetadata, ProjectRatingBadge, RatingBadgeLayout, RatingBadgeSource } from './projectTypes'

export type RatingBadgeLayoutField = keyof RatingBadgeLayout

type RatingBadgeLayoutPoint = {
  x: number
  y: number
}

export const DEFAULT_RATING_BADGE_LAYOUT: RatingBadgeLayout = {
  enabled: false,
  scale: 1,
  x: 78,
  y: 50,
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

export function setRatingBadgeCustomImage(
  ratingBadge: ProjectRatingBadge,
  imageDataUrl: string,
  imageSize: BackgroundImageSize,
): ProjectRatingBadge {
  return {
    ...ratingBadge,
    source: 'custom',
    customImageDataUrl: imageDataUrl,
    customImageSize: imageSize,
    layout: {
      ...ratingBadge.layout,
      enabled: true,
    },
  }
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

export function shouldRenderRatingBadge(
  metadata: Pick<ProjectMetadata, 'ratingSystem'>,
  ratingBadge: ProjectRatingBadge,
) {
  return ratingBadge.layout.enabled && metadata.ratingSystem !== 'none'
}

export function shouldUseCustomRatingBadgeImage(
  ratingBadge: Pick<ProjectRatingBadge, 'source' | 'customImageDataUrl'>,
) {
  return ratingBadge.source === 'custom' && Boolean(ratingBadge.customImageDataUrl)
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
    ratingBadge: {
      ...ratingBadge,
      layout: {
        ...ratingBadge.layout,
        enabled,
      },
    },
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
  }
}
