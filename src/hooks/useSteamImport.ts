import { useApplicationDiagnostics } from './useApplicationDiagnostics.ts'
import { commandFailed, commandSucceeded, type ApplicationCommandResult } from '../lifecycle/applicationCommandTypes.ts'
import { observeSteamWorkflowSafely, steamWorkflowError, type SteamWorkflowStage } from '../steam/steamWorkflowDiagnostics.ts'
import { useRef, useState } from 'react'
import { useProjectAsyncWork } from './useProjectAsyncWork.ts'
import type { ProjectAsyncRequest } from '../lifecycle/projectAsyncWork.ts'
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

type PrepareSteamGameImport = (
  importedState: SteamGameImportResult,
) => Promise<() => undefined> | (() => undefined)

export function useSteamImport({
  announceStatus,
}: UseSteamImportOptions) {
  const [gameSearchQuery, setGameSearchQuery] = useState('')
  const [steamSearchResults, setSteamSearchResults] = useState<SteamSearchResult[]>([])
  const [selectedSteamGame, setSelectedSteamGame] =
    useState<SteamImportedGame | null>(null)
  const [isSteamSearchLoading, setIsSteamSearchLoading] = useState(false)
  const asyncWork = useProjectAsyncWork()
  const diagnostics = useApplicationDiagnostics()
  const [pendingImport, setPendingImport] = useState<ProjectAsyncRequest | null>(null)
  const isSteamImportLoading = pendingImport !== null && asyncWork.isCurrent(pendingImport)

  // Every submission (including empty input), reset and clear supersedes
  // pending searches. Transport completion alone cannot publish stale state.
  const searchGeneration = useRef(0)

  function resetSteamImportState() {
    searchGeneration.current += 1
    setGameSearchQuery('')
    setSteamSearchResults([])
    setSelectedSteamGame(null)
    setIsSteamSearchLoading(false)
    asyncWork.invalidate('steam-game')
    setPendingImport(null)
  }

  function clearSteamSearchResults() {
    searchGeneration.current += 1
    setSteamSearchResults([])
    setIsSteamSearchLoading(false)
  }

  async function runSteamImport(
    appId: number,
    prepareImportedState: PrepareSteamGameImport,
  ) {
    const request = asyncWork.begin('steam-game')
    if (!asyncWork.isCurrent(request)) return
    const observation = observeSteamWorkflowSafely(diagnostics.observeSteamWorkflow, { workflowId: 'steam.import', requestId: request.requestId })
    let stage: SteamWorkflowStage = 'fetch-and-normalize'
    let outcome: ApplicationCommandResult<unknown> = { status: 'cancelled', reason: 'operation-cancelled' }
    setPendingImport(request)
    announceStatus(`Importing Steam App ID ${appId}...`)

    try {
      const importedState = await createSteamGameImport(appId)
      if (!asyncWork.isCurrent(request)) return
      // Preparation may download/decode, but cannot mutate project owners.
      stage = 'prepare'
      observation.stage(stage)
      const applyPreparedImport = await prepareImportedState(importedState)
      stage = 'apply'
      observation.stage(stage)
      if (asyncWork.commit(request, applyPreparedImport)) outcome = commandSucceeded(undefined)
    } catch (cause) {
      const error = steamWorkflowError('steam.import', stage, cause)
      outcome = commandFailed(error)
      if (!asyncWork.publish(request, () => { announceStatus(error.userMessage) })) {
        outcome = { status: 'cancelled', reason: 'operation-cancelled' }
      }
    } finally {
      observation.complete(outcome)
    }
  }

  async function handleSteamSearch() {
    const generation = ++searchGeneration.current
    const trimmedQuery = gameSearchQuery.trim()

    if (!trimmedQuery) {
      setIsSteamSearchLoading(false)
      announceStatus('Enter a Steam game title or App ID to search.')
      return
    }

    const observation = observeSteamWorkflowSafely(diagnostics.observeSteamWorkflow, { workflowId: 'steam.search', requestId: generation })
    let outcome: ApplicationCommandResult<unknown> = { status: 'cancelled', reason: 'operation-cancelled' }
    setIsSteamSearchLoading(true)
    announceStatus(`Searching Steam for "${trimmedQuery}"...`)

    try {
      const results = await searchSteamStore(trimmedQuery)
      if (generation !== searchGeneration.current) return
      setSteamSearchResults(results)
      announceStatus(
        results.length > 0
          ? `Found ${results.length} Steam result${results.length === 1 ? '' : 's'}.`
          : 'Steam returned no results. Manual title entry is still available.',
      )
      outcome = commandSucceeded(undefined)
    } catch (cause) {
      if (generation !== searchGeneration.current) return
      const error = steamWorkflowError('steam.search', 'fetch-and-normalize', cause)
      outcome = commandFailed(error)
      announceStatus(error.userMessage)
    } finally {
      observation.complete(outcome)
      if (generation === searchGeneration.current) {
        setIsSteamSearchLoading(false)
      }
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
