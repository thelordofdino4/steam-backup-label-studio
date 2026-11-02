import type {
  CaseInsertBrandingSourceCatalog,
} from './brandingSlotSources.ts'
import {
  applySteamBackCoverImportToCaseInsert,
  getSteamBackCoverImportStatus,
} from './steamBackCoverImport.ts'
import {
  applyCaseInsertSteamImportBrandingDefaults,
} from './steamImportBrandingDefaults.ts'
import {
  applySteamCaseInsertTitleArtworkSeedToProject,
  type CaseInsertTitleArtworkImportSeed,
} from './titleArtwork.ts'
import type {
  ProjectJewelCaseState,
} from '../project/projectTypes.ts'
import type {
  RatingBoardCandidate,
} from '../steam/steamMetadataCandidates.ts'
import type {
  SteamImportedGame,
} from '../steam/steamApi.ts'

export type ApplySteamImportDefaultsToCaseInsertParams = {
  caseInsert: ProjectJewelCaseState
  importedGame: SteamImportedGame
  legalText: string
  replaceExisting: boolean
  titleArtworkSeed: CaseInsertTitleArtworkImportSeed | null
  ratingCandidate: RatingBoardCandidate | null
  brandingSources: CaseInsertBrandingSourceCatalog
}

/** Prepare once so committed content and its feedback describe the same state. */
export function prepareCaseInsertSteamImport(params: ApplySteamImportDefaultsToCaseInsertParams) {
  const caseInsert = applySteamImportDefaultsToCaseInsert(params)
  return { caseInsert, statusMessage: getSteamBackCoverImportStatus(caseInsert) }
}

export function applySteamImportDefaultsToCaseInsert({
  caseInsert,
  importedGame,
  legalText,
  replaceExisting,
  titleArtworkSeed,
  ratingCandidate,
  brandingSources,
}: ApplySteamImportDefaultsToCaseInsertParams): ProjectJewelCaseState {
  const caseInsertWithSteamText = applySteamBackCoverImportToCaseInsert(
    caseInsert,
    importedGame,
    {
      legalText,
      replaceExisting,
    },
  )

  const caseInsertWithTitleArtwork = titleArtworkSeed
    ? applySteamCaseInsertTitleArtworkSeedToProject(
        caseInsertWithSteamText,
        titleArtworkSeed,
      )
    : caseInsertWithSteamText

  return applyCaseInsertSteamImportBrandingDefaults({
    caseInsert: caseInsertWithTitleArtwork,
    ratingCandidate,
    brandingSources,
  })
}
