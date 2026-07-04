import type { ProjectMetadata } from '../project/projectTypes.ts'
import {
  getAutoApplyLegalTextCandidate,
  getAutoApplyRatingCandidate,
  type LegalTextCandidate,
  type RatingBoardCandidate,
  type SteamMetadataCandidateDiscoveryResult,
} from './steamMetadataCandidates.ts'

export function isRatingMetadataDefault(metadata: ProjectMetadata) {
  return metadata.ratingSystem === 'none' && metadata.ratingValue.trim() === ''
}

export function getAutoApplyRatingCandidateForMetadata(
  result: SteamMetadataCandidateDiscoveryResult,
  metadata: ProjectMetadata,
  allowReplaceExisting: boolean,
): RatingBoardCandidate | null {
  const candidate = getAutoApplyRatingCandidate(result.ratingCandidates)

  if (!candidate) return null
  if (allowReplaceExisting || isRatingMetadataDefault(metadata)) return candidate

  return null
}

export function getAutoApplyLegalCandidateForMetadata(
  result: SteamMetadataCandidateDiscoveryResult,
  metadata: ProjectMetadata,
  allowReplaceExisting: boolean,
): LegalTextCandidate | null {
  const candidate = getAutoApplyLegalTextCandidate(result.legalCandidates)

  if (!candidate) return null
  if (allowReplaceExisting || metadata.copyrightText.trim() === '') return candidate

  return null
}
