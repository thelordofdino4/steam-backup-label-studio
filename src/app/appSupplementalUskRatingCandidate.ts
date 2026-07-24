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
