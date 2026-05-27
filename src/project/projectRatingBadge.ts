import type { BackgroundImageSize, ProjectRatingBadge, RatingBadgeLayout, RatingBadgeSource } from './projectTypes'

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

export function createDefaultProjectRatingBadge(): ProjectRatingBadge {
  return {
    source: 'placeholder',
    customImageDataUrl: null,
    customImageSize: null,
    layout: DEFAULT_RATING_BADGE_LAYOUT,
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
): ProjectRatingBadge {
  const defaults = createDefaultProjectRatingBadge()

  return {
    ...ratingBadge,
    layout: {
      ...defaults.layout,
      enabled: ratingBadge.layout.enabled,
    },
  }
}

function normalizeRatingBadgeLayout(
  layout: Partial<RatingBadgeLayout> | undefined,
): RatingBadgeLayout {
  return {
    enabled: layout?.enabled ?? DEFAULT_RATING_BADGE_LAYOUT.enabled,
    scale: layout?.scale ?? DEFAULT_RATING_BADGE_LAYOUT.scale,
    x: layout?.x ?? DEFAULT_RATING_BADGE_LAYOUT.x,
    y: layout?.y ?? DEFAULT_RATING_BADGE_LAYOUT.y,
  }
}

export function normalizeProjectRatingBadge(
  ratingBadge: Partial<ProjectRatingBadge> | undefined,
): ProjectRatingBadge {
  return {
    source: ratingBadge?.source ?? 'placeholder',
    customImageDataUrl: ratingBadge?.customImageDataUrl ?? null,
    customImageSize: ratingBadge?.customImageSize ?? null,
    layout: normalizeRatingBadgeLayout(ratingBadge?.layout),
  }
}
