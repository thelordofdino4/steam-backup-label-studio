import {
  clampProjectRatingBadgeToSafeZone,
} from '../layout/discElementSafeZone.ts'
import {
  preserveDiscPointOwnerPlacement,
} from '../presets/discPresetOwnerPlacement.ts'
import {
  updateSupplementalUskRatingBadgeEnabledState,
  updateSupplementalUskRatingBadgeValue,
} from '../project/projectRatingBadge.ts'
import type {
  ProjectMetadata,
  ProjectRatingBadge,
} from '../project/projectTypes.ts'
import type { DiscTemplate } from '../types/template.ts'
import type { ActiveDiscPresetState, DiscPresetTargetedApplicationResult } from '../presets/discPresetTargetedApplication.ts'
import {
  applyActiveDiscPresetToRatingBadgeState,
  isActiveDiscPresetPointFitImpossible,
} from './appActiveDiscPresetPointOwners.ts'

type SupplementalUskAction =
  | Readonly<{ kind: 'choose-value'; ratingValue: string }>
  | Readonly<{
      kind: 'apply-suggestion'
      ratingValue: string
      metadata: Pick<ProjectMetadata, 'ratingSystem' | 'ratingValue'>
      selectedDiscTemplate: DiscTemplate
      presetState: ActiveDiscPresetState | null
    }>

/** Prepare both authored Disc paths without changing editor or preset state. */
export function planDiscSupplementalUskEdit(
  ratingBadge: ProjectRatingBadge,
  action: SupplementalUskAction,
): Readonly<{
  badge: ProjectRatingBadge
  placementApplication: DiscPresetTargetedApplicationResult | null
}> {
  if (action.kind === 'choose-value') {
    return {
      badge: updateSupplementalUskRatingBadgeValue(ratingBadge, action.ratingValue),
      placementApplication: null,
    }
  }
  let placementApplication: DiscPresetTargetedApplicationResult | null = null
  const badge = applySupplementalUskRatingCandidate({
    ratingBadge,
    metadata: action.metadata,
    supplementalRatingValue: action.ratingValue,
    selectedDiscTemplate: action.selectedDiscTemplate,
    applyActivePrimaryRatingPlacement: fitted => {
      const result = applyActiveDiscPresetToRatingBadgeState({
        presetState: action.presetState,
        selectedDiscTemplate: action.selectedDiscTemplate,
        ratingBadge: fitted,
        metadata: action.metadata,
      })
      placementApplication = result.application
      return isActiveDiscPresetPointFitImpossible(result.application, 'rating.primary')
        ? null
        : result.ratingBadge
    },
  })
  return { badge, placementApplication }
}

type ApplyActivePrimaryRatingPlacement = (
  ratingBadge: ProjectRatingBadge,
) => ProjectRatingBadge | null

export function applySupplementalUskRatingCandidate({
  ratingBadge,
  metadata,
  supplementalRatingValue,
  selectedDiscTemplate,
  applyActivePrimaryRatingPlacement,
}: Readonly<{
  ratingBadge: ProjectRatingBadge
  metadata: Pick<ProjectMetadata, 'ratingSystem' | 'ratingValue'>
  supplementalRatingValue: string
  selectedDiscTemplate: DiscTemplate
  applyActivePrimaryRatingPlacement: ApplyActivePrimaryRatingPlacement
}>): ProjectRatingBadge {
  const primaryWasEnabled = ratingBadge.layout.enabled
  const semanticRatingBadge = clampProjectRatingBadgeToSafeZone(
    updateSupplementalUskRatingBadgeEnabledState(
      updateSupplementalUskRatingBadgeValue({
        ...ratingBadge,
        layout: {
          ...ratingBadge.layout,
          enabled: true,
        },
      }, supplementalRatingValue),
      true,
    ),
    selectedDiscTemplate,
    metadata,
  )

  if (primaryWasEnabled) {
    return {
      ...semanticRatingBadge,
      layout: ratingBadge.layout,
    }
  }

  return applyActivePrimaryRatingPlacement(semanticRatingBadge) ?? {
    ...semanticRatingBadge,
    layout: preserveDiscPointOwnerPlacement(
      semanticRatingBadge.layout,
      ratingBadge.layout,
    ),
  }
}
