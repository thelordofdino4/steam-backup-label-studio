import type { ProjectMetadata } from '../project/projectTypes.ts'
import {
  createProjectMetadataFromSteamGame,
} from '../project/projectMetadata.ts'
import type { SteamImportedGame } from '../steam/steamApi.ts'
import type {
  LegalTextCandidate,
  RatingBoardCandidate,
  SteamMetadataCandidateDiscoveryResult,
} from '../steam/steamMetadataCandidates.ts'
import {
  getAutoApplyLegalCandidateForMetadata,
  getAutoApplyRatingCandidateForMetadata,
} from '../steam/steamMetadataAutoApply.ts'

export type CreateSteamImportMetadataPlanParams = {
  importedGame: SteamImportedGame
  selectedSteamGame: SteamImportedGame | null
  projectMetadata: ProjectMetadata
  metadataCandidateResult: SteamMetadataCandidateDiscoveryResult
}

export type SteamImportMetadataPlan = {
  isDifferentSelectedSteamGame: boolean
  autoRatingCandidate: RatingBoardCandidate | null
  autoLegalCandidate: LegalTextCandidate | null
  nextProjectMetadata: ProjectMetadata
  shouldResetGameScopedRating: boolean
  shouldResetGameScopedLegal: boolean
  shouldUpdateCopyrightDiscTextSource: boolean
}

export type CreateSteamMetadataAutoApplyPlanParams = {
  metadataCandidateResult: SteamMetadataCandidateDiscoveryResult
  projectMetadata: ProjectMetadata
  isDifferentSelectedSteamGame?: boolean
}

export type SteamMetadataAutoApplyPlan = {
  ratingCandidate: RatingBoardCandidate | null
  legalCandidate: LegalTextCandidate | null
  metadataFields: Partial<ProjectMetadata>
}

export function createSteamMetadataCandidateFields({
  ratingCandidate,
  legalCandidate,
}: {
  ratingCandidate: RatingBoardCandidate | null
  legalCandidate: LegalTextCandidate | null
}): Partial<ProjectMetadata> {
  return {
    ...(ratingCandidate
      ? {
          ratingSystem: ratingCandidate.ratingSystem,
          ratingValue: ratingCandidate.ratingValue,
        }
      : {}),
    ...(legalCandidate
      ? {
          copyrightText: legalCandidate.text,
        }
      : {}),
  }
}

export function createSteamMetadataAutoApplyPlan({
  metadataCandidateResult,
  projectMetadata,
  isDifferentSelectedSteamGame = false,
}: CreateSteamMetadataAutoApplyPlanParams): SteamMetadataAutoApplyPlan {
  const ratingCandidate = getAutoApplyRatingCandidateForMetadata(
    metadataCandidateResult,
    projectMetadata,
    isDifferentSelectedSteamGame,
  )
  const legalCandidate = getAutoApplyLegalCandidateForMetadata(
    metadataCandidateResult,
    projectMetadata,
    isDifferentSelectedSteamGame,
  )

  return {
    ratingCandidate,
    legalCandidate,
    metadataFields: createSteamMetadataCandidateFields({
      ratingCandidate,
      legalCandidate,
    }),
  }
}

export function getAutoAppliedMetadataCandidateStatusMessage(
  ratingCandidate: RatingBoardCandidate | null,
  legalCandidate: LegalTextCandidate | null,
  options: { applyDiscVisualDefaults?: boolean } = {},
): string | null {
  const applyDiscVisualDefaults = options.applyDiscVisualDefaults ?? true
  const appliedLabels: string[] = []

  if (ratingCandidate) {
    appliedLabels.push(
      applyDiscVisualDefaults
        ? `${ratingCandidate.boardLabel} ${ratingCandidate.displayRating} rating badge`
        : `${ratingCandidate.boardLabel} ${ratingCandidate.displayRating} rating metadata`,
    )
  }

  if (legalCandidate) {
    appliedLabels.push(
      applyDiscVisualDefaults
        ? 'curved copyright/legal text'
        : 'copyright/legal metadata',
    )
  }

  return appliedLabels.length > 0
    ? `Auto-applied ${appliedLabels.join(' and ')}.`
    : null
}

export function createSteamImportMetadataPlan({
  importedGame,
  selectedSteamGame,
  projectMetadata,
  metadataCandidateResult,
}: CreateSteamImportMetadataPlanParams): SteamImportMetadataPlan {
  const isDifferentSelectedSteamGame =
    selectedSteamGame !== null &&
    selectedSteamGame.appId !== importedGame.appId
  const autoRatingCandidate = getAutoApplyRatingCandidateForMetadata(
    metadataCandidateResult,
    projectMetadata,
    isDifferentSelectedSteamGame,
  )
  const autoLegalCandidate = getAutoApplyLegalCandidateForMetadata(
    metadataCandidateResult,
    projectMetadata,
    isDifferentSelectedSteamGame,
  )
  const nextProjectMetadata = createProjectMetadataFromSteamGame(
    importedGame,
    projectMetadata,
  )
  const shouldResetGameScopedRating = isDifferentSelectedSteamGame
  const shouldResetGameScopedLegal = isDifferentSelectedSteamGame
  const nextProjectMetadataWithAutoApply = {
    ...nextProjectMetadata,
    ...(autoRatingCandidate
      ? {
          ratingSystem: autoRatingCandidate.ratingSystem,
          ratingValue: autoRatingCandidate.ratingValue,
        }
      : shouldResetGameScopedRating
        ? {
            ratingSystem: 'none' as const,
            ratingValue: '',
          }
        : {}),
    ...(autoLegalCandidate
      ? {
          copyrightText: autoLegalCandidate.text,
        }
      : shouldResetGameScopedLegal
        ? {
            copyrightText: '',
          }
        : {}),
  }

  return {
    isDifferentSelectedSteamGame,
    autoRatingCandidate,
    autoLegalCandidate,
    nextProjectMetadata: nextProjectMetadataWithAutoApply,
    shouldResetGameScopedRating,
    shouldResetGameScopedLegal,
    shouldUpdateCopyrightDiscTextSource:
      Boolean(autoLegalCandidate) || shouldResetGameScopedLegal,
  }
}
