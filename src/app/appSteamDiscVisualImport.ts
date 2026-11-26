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
  SteamPlatformMarkImportResult,
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
  prepareSteamTitleArtworkImport: (game: SteamImportedGame) => Promise<SteamTitleArtworkImportResult>
  applyPlatformMarksImport?: typeof applySteamPlatformMarksImport
}

export type PreparedSteamDiscVisualImport = Readonly<{
  importedGame: SteamImportedGame
  nextProjectMetadata: ProjectMetadata
  useMetadataCopyright: boolean
  titleArtwork: SteamTitleArtworkImportResult
  platform: SteamPlatformMarkImportResult
}>

type SteamDiscVisualApplyPorts = Readonly<{
  applySteamImportedDiscTextValues: ApplySteamImportedDiscTextValues
  applySteamTitleArtworkImport: ApplySteamTitleArtworkImport
}>

export async function prepareSteamDiscVisualDefaultImport({
  importedGame,
  nextProjectMetadata,
  shouldUpdateCopyrightDiscTextSource,
  projectPlatformMarks,
  selectedDiscTemplate,
  selectedSteamGame,
  prepareSteamTitleArtworkImport,
  applyPlatformMarksImport = applySteamPlatformMarksImport,
}: RunSteamDiscVisualDefaultImportParams): Promise<PreparedSteamDiscVisualImport> {
  const preparedTitleArtwork = await prepareSteamTitleArtworkImport(importedGame)
  const platformMarkImport = applyPlatformMarksImport({
    importedGame,
    currentPlatformMarks: projectPlatformMarks,
    selectedDiscTemplate,
    previousSelectedSteamGame: selectedSteamGame,
  })

  return Object.freeze({
    importedGame,
    nextProjectMetadata,
    useMetadataCopyright: shouldUpdateCopyrightDiscTextSource,
    titleArtwork: preparedTitleArtwork,
    platform: platformMarkImport,
  })
}

/** Compatibility apply port: callers must already hold the accepted request.
 * Preparation never receives mirror or editor mutation ports.
 */
export function applyPreparedSteamDiscVisualDefaultImport(
  prepared: PreparedSteamDiscVisualImport,
  { applySteamImportedDiscTextValues, applySteamTitleArtworkImport }: SteamDiscVisualApplyPorts,
): SteamDiscVisualDefaultImport {
  const nextDiscTextResolution = applySteamImportedDiscTextValues(
    prepared.importedGame,
    prepared.nextProjectMetadata,
    { useMetadataCopyright: prepared.useMetadataCopyright },
  )
  const titleArtworkImport = applySteamTitleArtworkImport(prepared.titleArtwork)
  return {
    nextDiscTextResolution,
    titleArtworkStatusMessage: titleArtworkImport.statusMessage,
    platformMarkImportStatus: prepared.platform.status,
    platformMarkStatusMessage: prepared.platform.statusMessage,
    platformMarks: prepared.platform.platformMarks,
  }
}
