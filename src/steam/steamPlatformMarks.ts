import { clampProjectPlatformMarksToSafeZone } from '../layout/discElementSafeZone.ts'
import {
  createProjectPlatformMarkInference,
  getPlatformMarkLabel,
  getProjectPlatformMarkInference,
  setProjectPlatformMarkValues,
} from '../project/projectMediaMark.ts'
import type {
  PlatformMarkValue,
  ProjectPlatformMarks,
} from '../project/projectTypes.ts'
import type { DiscTemplate } from '../types/template'
import type { SteamImportedGame, SteamPlatformSupport } from './steamApi'

export type SteamPlatformMarkImportStatus =
  | 'applied'
  | 'no-data'
  | 'skipped-manual'

export type SteamPlatformMarkImportResult = {
  platformMarks: ProjectPlatformMarks
  status: SteamPlatformMarkImportStatus
  values: PlatformMarkValue[]
  statusMessage: string
}

export type SteamPlatformMarkDetection = {
  status: 'reliable' | 'no-data'
  values: PlatformMarkValue[]
  reason: string
}

const STEAM_PLATFORM_MAPPINGS: Array<{
  field: keyof SteamPlatformSupport
  value: PlatformMarkValue
}> = [
  { field: 'windows', value: 'windows' },
  { field: 'linux', value: 'linux' },
  { field: 'mac', value: 'macos' },
]

function formatPlatformMarkList(values: PlatformMarkValue[]) {
  return values.map(getPlatformMarkLabel).join(', ')
}

export function inferPlatformMarkValuesFromSteamMetadata(
  platforms: SteamPlatformSupport | undefined,
): SteamPlatformMarkDetection {
  if (!platforms) {
    return {
      status: 'no-data',
      values: [],
      reason: 'Steam appdetails did not include a platforms object.',
    }
  }

  const values = STEAM_PLATFORM_MAPPINGS
    .filter(({ field }) => platforms[field] === true)
    .map(({ value }) => value)

  if (values.length === 0) {
    return {
      status: 'no-data',
      values: [],
      reason:
        'Steam appdetails platforms did not report Windows, Linux, or macOS support.',
    }
  }

  return {
    status: 'reliable',
    values,
    reason: 'Steam appdetails reported supported operating systems.',
  }
}

function shouldPreserveManualPlatformMarks(
  platformMarks: ProjectPlatformMarks,
  importedGame: SteamImportedGame,
  previousSelectedSteamGame: SteamImportedGame | null,
) {
  const inference = getProjectPlatformMarkInference(platformMarks)

  return (
    inference.source === 'manual' &&
    (
      inference.steamAppId === importedGame.appId ||
      previousSelectedSteamGame?.appId === importedGame.appId
    )
  )
}

export function applySteamPlatformMarksImport({
  importedGame,
  currentPlatformMarks,
  selectedDiscTemplate,
  previousSelectedSteamGame,
}: {
  importedGame: SteamImportedGame
  currentPlatformMarks: ProjectPlatformMarks
  selectedDiscTemplate: DiscTemplate
  previousSelectedSteamGame: SteamImportedGame | null
}): SteamPlatformMarkImportResult {
  if (
    shouldPreserveManualPlatformMarks(
      currentPlatformMarks,
      importedGame,
      previousSelectedSteamGame,
    )
  ) {
    return {
      platformMarks: currentPlatformMarks,
      status: 'skipped-manual',
      values: currentPlatformMarks.values,
      statusMessage:
        'Kept manually edited operating system marks for this Steam game.',
    }
  }

  const detection = inferPlatformMarkValuesFromSteamMetadata(importedGame.platforms)

  if (detection.status === 'reliable') {
    const inference = createProjectPlatformMarkInference({
      source: 'steam-appdetails',
      status: 'applied',
      steamAppId: importedGame.appId,
      values: detection.values,
      message:
        `Steam appdetails platform flags applied: ${formatPlatformMarkList(detection.values)}. ` +
        'SteamOS remains manual because Steam appdetails does not confirm Steam Deck support.',
    })
    const platformMarks = setProjectPlatformMarkValues(
      currentPlatformMarks,
      detection.values,
      selectedDiscTemplate,
      inference,
    )

    return {
      platformMarks: clampProjectPlatformMarksToSafeZone(
        platformMarks,
        selectedDiscTemplate,
      ),
      status: 'applied',
      values: detection.values,
      statusMessage:
        `Updated operating system marks from Steam appdetails: ${formatPlatformMarkList(detection.values)}.`,
    }
  }

  const inference = createProjectPlatformMarkInference({
    source: 'steam-appdetails',
    status: 'no-data',
    steamAppId: importedGame.appId,
    values: [],
    message:
      `${detection.reason} Operating system marks are off until manually enabled. ` +
      'SteamOS remains manual because Steam appdetails does not confirm Steam Deck support.',
  })
  const platformMarks = setProjectPlatformMarkValues(
    currentPlatformMarks,
    [],
    selectedDiscTemplate,
    inference,
  )

  return {
    platformMarks: clampProjectPlatformMarksToSafeZone(
      platformMarks,
      selectedDiscTemplate,
    ),
    status: 'no-data',
    values: [],
    statusMessage:
      'Steam appdetails did not include reliable operating system metadata; OS marks are off until manually enabled.',
  }
}
