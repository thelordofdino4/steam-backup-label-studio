import type { ProjectRatingBadge, RatingBadgeLayout } from '../project/projectTypes.ts'

export type DiscRatingLayoutSyncBasis = Readonly<{
  primary: Readonly<RatingBadgeLayout>
  supplemental: Readonly<RatingBadgeLayout>
}>

export function captureDiscRatingLayoutBasis(badge: ProjectRatingBadge): DiscRatingLayoutSyncBasis {
  return {
    primary: { ...badge.layout },
    supplemental: { ...badge.uskBadge.layout },
  }
}

function reconcileLayout(
  previous: Readonly<RatingBadgeLayout>,
  projected: Readonly<RatingBadgeLayout>,
  accepted: Readonly<RatingBadgeLayout>,
): RatingBadgeLayout {
  const samePlacement = (a: Readonly<RatingBadgeLayout>, b: Readonly<RatingBadgeLayout>) =>
    a.scale === b.scale && a.x === b.x && a.y === b.y
  // Keep a position and scale together: mixing separately fitted values can
  // invalidate the original safe-zone calculation. Visibility is independent.
  const placement = samePlacement(projected, previous) || !samePlacement(accepted, previous)
    ? accepted : projected
  const enabled = projected.enabled === previous.enabled || accepted.enabled !== previous.enabled
    ? accepted.enabled : projected.enabled
  return { enabled, scale: placement.scale, x: placement.x, y: placement.y }
}

export function reconcileDiscRatingLayouts(
  basis: DiscRatingLayoutSyncBasis,
  draft: ProjectRatingBadge,
  accepted: ProjectRatingBadge,
): ProjectRatingBadge {
  return {
    ...draft,
    layout: reconcileLayout(basis.primary, draft.layout, accepted.layout),
    uskBadge: {
      ...draft.uskBadge,
      layout: reconcileLayout(basis.supplemental, draft.uskBadge.layout, accepted.uskBadge.layout),
    },
  }
}
