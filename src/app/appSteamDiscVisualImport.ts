import type {
  DiscTextMetadataResolution,
} from '../discText/metadataStateTransitions.ts'
import type {
  ProjectMetadata,
  ProjectPlatformMarks,
} from '../project/projectTypes.ts'
import {
  applySteamPlatformMarksImport,
} from '../steam/steamPlatformMarks.ts'
import type {
  SteamPlatformMarkImportStatus,
} from '../steam/steamPlatformMarks.ts'
import type {
  SteamTitleArtworkImportResult,
} from '../steam/steamTitleArtworkImport.ts'
import type { SteamImportedGame } from '../steam/steamApi.ts'
import type { DiscTemplate } from '../types/template.ts'

type ApplySteamImportedDiscTextValues = (
  importedGame: SteamImportedGame,
  metadata: ProjectMetadata,
  options: { useMetadataCopyright: boolean },
) => DiscTextMetadataResolution

type ApplySteamTitleArtworkImport = (
  importedGame: SteamImportedGame,
) => Promise<SteamTitleArtworkImportResult>

export type SteamDiscVisualDefaultImport = {
  nextDiscTextResolution: DiscTextMetadataResolution
  platformMarks: ProjectPlatformMarks
  platformMarkImportStatus: SteamPlatformMarkImportStatus
  platformMarkStatusMessage: string
  titleArtworkStatusMessage: string
}

export function shouldApplySteamPlatformMarksEligibilityChange(
  status: SteamPlatformMarkImportStatus,
) {
  return status !== 'skipped-manual'
}

export type RunSteamDiscVisualDefaultImportParams = {
  importedGame: SteamImportedGame
  nextProjectMetadata: ProjectMetadata
  shouldUpdateCopyrightDiscTextSource: boolean
  projectPlatformMarks: ProjectPlatformMarks
  selectedDiscTemplate: DiscTemplate
  selectedSteamGame: SteamImportedGame | null
  applySteamImportedDiscTextValues: ApplySteamImportedDiscTextValues
  applySteamTitleArtworkImport: ApplySteamTitleArtworkImport
  applyPlatformMarksImport?: typeof applySteamPlatformMarksImport
}

export async function runSteamDiscVisualDefaultImport({
  importedGame,
  nextProjectMetadata,
  shouldUpdateCopyrightDiscTextSource,
  projectPlatformMarks,
  selectedDiscTemplate,
  selectedSteamGame,
  applySteamImportedDiscTextValues,
  applySteamTitleArtworkImport,
  applyPlatformMarksImport = applySteamPlatformMarksImport,
}: RunSteamDiscVisualDefaultImportParams): Promise<SteamDiscVisualDefaultImport> {
  const nextDiscTextResolution = applySteamImportedDiscTextValues(
    importedGame,
    nextProjectMetadata,
    { useMetadataCopyright: shouldUpdateCopyrightDiscTextSource },
  )
  const titleArtworkImport = await applySteamTitleArtworkImport(importedGame)
  const platformMarkImport = applyPlatformMarksImport({
    importedGame,
    currentPlatformMarks: projectPlatformMarks,
    selectedDiscTemplate,
    previousSelectedSteamGame: selectedSteamGame,
  })

  return {
    nextDiscTextResolution,
    titleArtworkStatusMessage: titleArtworkImport.statusMessage,
    platformMarkImportStatus: platformMarkImport.status,
    platformMarkStatusMessage: platformMarkImport.statusMessage,
    platformMarks: platformMarkImport.platformMarks,
  }
}
