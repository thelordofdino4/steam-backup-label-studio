import { getSteamBackCoverImportStatus } from '../caseInsert/steamBackCoverImport.ts'
import { syncProjectJewelCaseBrandingMarkSlots } from '../caseInsert/brandingMarkSlots.ts'
import {
  applySteamImportDefaultsToCaseInsert,
  type ApplySteamImportDefaultsToCaseInsertParams,
} from '../caseInsert/steamImportDefaults.ts'
import { createCaseInsertProjectSnapshot } from '../project/caseInsertProjectAdapters.ts'
import type { ProjectRatingBadge, SavedCaseInsertProject } from '../project/projectTypes.ts'
import type { CaseInsertBrandingSourceCatalog } from '../caseInsert/brandingSlotSources.ts'
import { getCaseInsertRatingBadgeForSteamImport } from '../caseInsert/steamImportBrandingDefaults.ts'
import type { SteamImportMetadataPlan } from './appSteamImportPlan.ts'

/** A single Case document proposal, using the same ordered owners as the
 * existing pair of React updates. Do not mutate editor state during planning. */
export function planCaseSteamDocumentImport({
  current,
  importedGame,
  titleArtworkSeed,
  metadataPlan,
  brandingSources,
}: Readonly<{
  current: SavedCaseInsertProject
  importedGame: ApplySteamImportDefaultsToCaseInsertParams['importedGame']
  titleArtworkSeed: ApplySteamImportDefaultsToCaseInsertParams['titleArtworkSeed']
  metadataPlan: SteamImportMetadataPlan
  brandingSources: CaseInsertBrandingSourceCatalog
}>): Readonly<{
  project: SavedCaseInsertProject
  ratingBadge: ProjectRatingBadge
  backCoverStatus: string
}> {
  const projectMetadata = metadataPlan.nextProjectMetadata
  const ratingBadge = getCaseInsertRatingBadgeForSteamImport({
    projectMetadata, ratingCandidate: metadataPlan.autoRatingCandidate,
    projectRatingBadge: brandingSources.projectRatingBadge,
  })
  const sources = { ...brandingSources, projectMetadata, projectRatingBadge: ratingBadge }
  const defaults = applySteamImportDefaultsToCaseInsert({
    caseInsert: current.caseInsert, importedGame,
    legalText: projectMetadata.copyrightText,
    replaceExisting: metadataPlan.isDifferentSelectedSteamGame,
    titleArtworkSeed, ratingCandidate: metadataPlan.autoRatingCandidate,
    brandingSources: sources,
  })
  const synced = syncProjectJewelCaseBrandingMarkSlots(defaults, sources)
  const project = createCaseInsertProjectSnapshot({
    manualGameTitle: importedGame.title, selectedSteamGame: importedGame,
    projectMetadata, caseInsert: synced,
    activeCaseInsertTemplatePane: current.editor?.activeCaseInsertTemplatePane,
    savedAt: current.savedAt,
  })
  return {
    project: { ...project, caseInsertLayoutPreset: current.caseInsertLayoutPreset },
    ratingBadge,
    backCoverStatus: getSteamBackCoverImportStatus(project.caseInsert),
  }
}
