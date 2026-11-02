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
  prepared: SteamTitleArtworkImportResult,
) => SteamTitleArtworkImportResult

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
  prepareSteamTitleArtworkImport: (game: SteamImportedGame) => Promise<SteamTitleArtworkImportResult>
  applySteamTitleArtworkImport: ApplySteamTitleArtworkImport
  applyPlatformMarksImport?: typeof applySteamPlatformMarksImport
}

export async function prepareSteamDiscVisualDefaultImport({
  importedGame,
  nextProjectMetadata,
  shouldUpdateCopyrightDiscTextSource,
  projectPlatformMarks,
  selectedDiscTemplate,
  selectedSteamGame,
  applySteamImportedDiscTextValues,
  prepareSteamTitleArtworkImport,
  applySteamTitleArtworkImport,
  applyPlatformMarksImport = applySteamPlatformMarksImport,
}: RunSteamDiscVisualDefaultImportParams): Promise<() => SteamDiscVisualDefaultImport> {
  const preparedTitleArtwork = await prepareSteamTitleArtworkImport(importedGame)
  const platformMarkImport = applyPlatformMarksImport({
    importedGame,
    currentPlatformMarks: projectPlatformMarks,
    selectedDiscTemplate,
    previousSelectedSteamGame: selectedSteamGame,
  })

  return () => {
    const nextDiscTextResolution = applySteamImportedDiscTextValues(
      importedGame,
      nextProjectMetadata,
      { useMetadataCopyright: shouldUpdateCopyrightDiscTextSource },
    )
    const titleArtworkImport = applySteamTitleArtworkImport(preparedTitleArtwork)
    return {
      nextDiscTextResolution,
      titleArtworkStatusMessage: titleArtworkImport.statusMessage,
      platformMarkImportStatus: platformMarkImport.status,
      platformMarkStatusMessage: platformMarkImport.statusMessage,
      platformMarks: platformMarkImport.platformMarks,
    }
  }
}
