import { useState } from 'react'
import {
  searchSteamStore,
  type SteamImportedGame,
  type SteamSearchResult,
} from '../steam/steamApi'
import {
  createSteamGameImport,
  type SteamGameImportResult,
} from '../steam/steamGameImport'

type UseSteamImportOptions = {
  announceStatus: (message: string) => void
}

type ApplySteamGameImport = (
  importedState: SteamGameImportResult,
) => Promise<void> | void

export function useSteamImport({
  announceStatus,
}: UseSteamImportOptions) {
  const [gameSearchQuery, setGameSearchQuery] = useState('')
  const [steamSearchResults, setSteamSearchResults] = useState<SteamSearchResult[]>([])
  const [selectedSteamGame, setSelectedSteamGame] =
    useState<SteamImportedGame | null>(null)
  const [isSteamSearchLoading, setIsSteamSearchLoading] = useState(false)
  const [isSteamImportLoading, setIsSteamImportLoading] = useState(false)

  function resetSteamImportState() {
    setGameSearchQuery('')
    setSteamSearchResults([])
    setSelectedSteamGame(null)
    setIsSteamSearchLoading(false)
    setIsSteamImportLoading(false)
  }

  function clearSteamSearchResults() {
    setSteamSearchResults([])
  }

  async function runSteamImport(
    appId: number,
    applyImportedState: ApplySteamGameImport,
  ) {
    setIsSteamImportLoading(true)
    announceStatus(`Importing Steam App ID ${appId}...`)

    try {
      const importedState = await createSteamGameImport(appId)

      await applyImportedState(importedState)
    } catch (error) {
      announceStatus(`Steam import failed: ${String(error)}`)
    } finally {
      setIsSteamImportLoading(false)
    }
  }

  async function handleSteamSearch() {
    const trimmedQuery = gameSearchQuery.trim()

    if (!trimmedQuery) {
      announceStatus('Enter a Steam game title or App ID to search.')
      return
    }

    setIsSteamSearchLoading(true)
    announceStatus(`Searching Steam for "${trimmedQuery}"...`)

    try {
      const results = await searchSteamStore(trimmedQuery)
      setSteamSearchResults(results)
      announceStatus(
        results.length > 0
          ? `Found ${results.length} Steam result${results.length === 1 ? '' : 's'}.`
          : 'Steam returned no results. Manual title entry is still available.',
      )
    } catch (error) {
      announceStatus(`Steam search failed: ${String(error)}`)
    } finally {
      setIsSteamSearchLoading(false)
    }
  }

  return {
    gameSearchQuery,
    setGameSearchQuery,
    steamSearchResults,
    selectedSteamGame,
    setSelectedSteamGame,
    isSteamSearchLoading,
    isSteamImportLoading,
    resetSteamImportState,
    clearSteamSearchResults,
    runSteamImport,
    handleSteamSearch,
  }
}
