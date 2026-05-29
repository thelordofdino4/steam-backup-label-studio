import { useCallback, useState } from 'react'
import {
  buildSteamMetadataCandidatesFromImportedGame,
  discoverSteamMetadataCandidates,
  type LegalTextCandidate,
  type RatingBoardCandidate,
  type SteamMetadataCandidateSourceStatus,
} from '../steam/steamMetadataCandidates'
import type { SteamImportedGame } from '../steam/steamApi'
import type { ProjectMetadata } from '../project/projectTypes'

export type SteamMetadataAssistanceState = {
  ratingCandidates: RatingBoardCandidate[]
  legalCandidates: LegalTextCandidate[]
  sourceStatuses: SteamMetadataCandidateSourceStatus[]
  isLoading: boolean
  error: string | null
  lastSearchedLabel: string | null
  inputKey: string | null
}

type UseSteamMetadataAssistanceParams = {
  selectedSteamGame: SteamImportedGame | null
  projectMetadata: ProjectMetadata
  announceStatus: (message: string) => void
}

const EMPTY_METADATA_ASSISTANCE: SteamMetadataAssistanceState = {
  ratingCandidates: [],
  legalCandidates: [],
  sourceStatuses: [],
  isLoading: false,
  error: null,
  lastSearchedLabel: null,
  inputKey: null,
}

function getNumericSteamAppId(value: string) {
  const trimmedValue = value.trim()

  return /^\d+$/.test(trimmedValue) ? trimmedValue : ''
}

function getDiscoveryInputKey(
  selectedSteamGame: SteamImportedGame | null,
  projectMetadata: ProjectMetadata,
) {
  return selectedSteamGame
    ? String(selectedSteamGame.appId)
    : getNumericSteamAppId(projectMetadata.steamAppId)
}

function getDiscoveryInputKeyForGame(game: SteamImportedGame) {
  return String(game.appId)
}

function getSearchLabel(
  selectedSteamGame: SteamImportedGame | null,
  projectMetadata: ProjectMetadata,
) {
  if (selectedSteamGame?.title) return selectedSteamGame.title

  const steamAppId = getNumericSteamAppId(projectMetadata.steamAppId)
  if (steamAppId) return `Steam App ID ${steamAppId}`

  return projectMetadata.title || 'this project'
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function getCandidateCountMessage(
  ratingCount: number,
  legalCount: number,
  label: string,
) {
  const totalCount = ratingCount + legalCount

  if (totalCount === 0) {
    return `No rating or legal candidates found for ${label}. Manual metadata editing remains available.`
  }

  const pieces = [
    ratingCount > 0
      ? `${ratingCount} rating candidate${ratingCount === 1 ? '' : 's'}`
      : '',
    legalCount > 0
      ? `${legalCount} legal snippet${legalCount === 1 ? '' : 's'}`
      : '',
  ].filter(Boolean)

  return `Found ${pieces.join(' and ')} for ${label}. Review them in Game metadata.`
}

export function useSteamMetadataAssistance({
  selectedSteamGame,
  projectMetadata,
  announceStatus,
}: UseSteamMetadataAssistanceParams) {
  const [metadataAssistance, setMetadataAssistance] =
    useState<SteamMetadataAssistanceState>(EMPTY_METADATA_ASSISTANCE)
  const discoveryInputKey = getDiscoveryInputKey(selectedSteamGame, projectMetadata)
  const canFindMetadataCandidates = Boolean(discoveryInputKey)

  const loadImportedSteamMetadataCandidates = useCallback((game: SteamImportedGame) => {
    const result = buildSteamMetadataCandidatesFromImportedGame(game)
    const ratingCount = result.ratingCandidates.length
    const legalCount = result.legalCandidates.length

    setMetadataAssistance({
      ...result,
      isLoading: false,
      error: null,
      lastSearchedLabel: game.title,
      inputKey: getDiscoveryInputKeyForGame(game),
    })

    if (ratingCount + legalCount > 0) {
      announceStatus(getCandidateCountMessage(ratingCount, legalCount, game.title))
    }

    return result
  }, [announceStatus])

  const findSteamMetadataCandidates = useCallback(async () => {
    const lastSearchedLabel = getSearchLabel(selectedSteamGame, projectMetadata)

    if (!canFindMetadataCandidates) {
      announceStatus(
        'Import a Steam game or enter a numeric Steam App ID before finding rating/legal candidates.',
      )
      return null
    }

    setMetadataAssistance((currentState) => ({
      ...currentState,
      isLoading: true,
      error: null,
      lastSearchedLabel,
      inputKey: discoveryInputKey,
    }))
    announceStatus(`Finding rating/legal candidates for ${lastSearchedLabel}...`)

    try {
      const result = await discoverSteamMetadataCandidates({
        selectedSteamGame,
        projectMetadata,
      })
      const ratingCount = result.ratingCandidates.length
      const legalCount = result.legalCandidates.length

      setMetadataAssistance({
        ...result,
        isLoading: false,
        error: null,
        lastSearchedLabel,
        inputKey: discoveryInputKey,
      })
      announceStatus(getCandidateCountMessage(ratingCount, legalCount, lastSearchedLabel))
      return result
    } catch (error) {
      const message = getErrorMessage(error)

      setMetadataAssistance((currentState) => ({
        ...currentState,
        isLoading: false,
        error: message,
        lastSearchedLabel,
        inputKey: discoveryInputKey,
      }))
      announceStatus(`Rating/legal candidate search failed: ${message}`)
      return null
    }
  }, [
    announceStatus,
    canFindMetadataCandidates,
    discoveryInputKey,
    projectMetadata,
    selectedSteamGame,
  ])

  return {
    steamMetadataAssistance:
      metadataAssistance.inputKey === discoveryInputKey
        ? metadataAssistance
        : EMPTY_METADATA_ASSISTANCE,
    canFindMetadataCandidates,
    findSteamMetadataCandidates,
    loadImportedSteamMetadataCandidates,
  }
}
