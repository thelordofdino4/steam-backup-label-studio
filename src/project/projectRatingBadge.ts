import type { ProjectRatingBadge, RatingBadgeLayout } from './projectTypes'

export const DEFAULT_RATING_BADGE_LAYOUT: RatingBadgeLayout = {
  enabled: false,
  scale: 1,
  x: 22,
  y: 78,
}

export function createDefaultProjectRatingBadge(): ProjectRatingBadge {
  return {
    source: 'placeholder',
    customImageDataUrl: null,
    customImageSize: null,
    layout: DEFAULT_RATING_BADGE_LAYOUT,
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
