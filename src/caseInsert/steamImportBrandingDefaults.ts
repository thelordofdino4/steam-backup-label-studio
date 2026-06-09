import type {
  CaseInsertBrandingSourceCatalog,
} from './brandingSlotSources.ts'
import {
  setProjectJewelCaseBrandingMarkTargetKindEnabled,
} from './brandingMarkSlots.ts'
import {
  updateRatingBadgeEnabledState,
} from '../project/projectRatingBadge.ts'
import type {
  ProjectJewelCaseState,
  ProjectMetadata,
  ProjectRatingBadge,
} from '../project/projectTypes.ts'
import type {
  RatingBoardCandidate,
} from '../steam/steamMetadataCandidates.ts'

function shouldEnableImportedCaseInsertRating(
  ratingCandidate: RatingBoardCandidate | null,
) {
  return Boolean(
    ratingCandidate?.canApply &&
      ratingCandidate.applyKind === 'rating' &&
      ratingCandidate.ratingSystem !== 'none',
  )
}

export function getCaseInsertRatingBadgeForSteamImport(params: {
  projectMetadata: ProjectMetadata
  projectRatingBadge: ProjectRatingBadge
  ratingCandidate: RatingBoardCandidate | null
}) {
  if (!shouldEnableImportedCaseInsertRating(params.ratingCandidate)) {
    return params.projectRatingBadge
  }

  return updateRatingBadgeEnabledState(
    params.projectMetadata,
    params.projectRatingBadge,
    true,
  ).ratingBadge
}

export function applyCaseInsertSteamImportBrandingDefaults(params: {
  caseInsert: ProjectJewelCaseState
  brandingSources: CaseInsertBrandingSourceCatalog
  ratingCandidate: RatingBoardCandidate | null
}) {
  if (!shouldEnableImportedCaseInsertRating(params.ratingCandidate)) {
    return params.caseInsert
  }

  return setProjectJewelCaseBrandingMarkTargetKindEnabled(
    params.caseInsert,
    { type: 'template', paneId: 'cover' },
    'rating',
    true,
    params.brandingSources,
  )
}
