import { useProjectAsyncWork } from './useProjectAsyncWork.ts'
import type { ProjectAsyncRequest } from '../lifecycle/projectAsyncWork.ts'
import { useCallback, useState } from 'react'
import {
  createBackgroundImageImportFromDataUrl,
  type BackgroundImageImportResult,
} from '../image/backgroundImageImport'
import { createProjectImageAssetProvenance } from '../project/projectAssetStatus'
import type { ProjectMetadata } from '../project/projectTypes'
import {
  discoverLogoCandidates,
  downloadRemoteLogoCandidateAsDataUrl,
  type LogoCandidateSourceStatus,
  type RemoteLogoCandidate,
} from '../steam/steamLogoCandidates'
import type { SteamImportedGame } from '../steam/steamApi'

export type WebArtworkDiscoveryState = {
  candidates: RemoteLogoCandidate[]
  sourceStatuses: LogoCandidateSourceStatus[]
  isLoading: boolean
  isApplying: boolean
  error: string | null
  hasSearched: boolean
  inputKey: string | null
  sessionId?: string | null
}

type UseWebArtworkDiscoveryParams = {
  selectedSteamGame: SteamImportedGame | null
  projectMetadata: ProjectMetadata
  applyBackgroundImageImport: (importedBackground: BackgroundImageImportResult) => void
  announceStatus: (message: string) => void
}

const EMPTY_WEB_ARTWORK_DISCOVERY: WebArtworkDiscoveryState = {
  candidates: [],
  sourceStatuses: [],
  isLoading: false,
  isApplying: false,
  error: null,
  hasSearched: false,
  inputKey: null,
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function hasUsefulNames(names: string[], metadataName: string) {
  return names.some((name) => name.trim()) || Boolean(metadataName.trim())
}

function dedupeCandidates(candidates: RemoteLogoCandidate[]) {
  const byUrl = new Map<string, RemoteLogoCandidate>()

  for (const candidate of candidates) {
    const existing = byUrl.get(candidate.url)
    byUrl.set(candidate.url, existing && existing.score >= candidate.score ? existing : candidate)
  }

  return [...byUrl.values()].sort((left, right) =>
    right.score - left.score || left.label.localeCompare(right.label),
  )
}

function dedupeSourceStatuses(sourceStatuses: LogoCandidateSourceStatus[]) {
  const bySource = new Map<string, LogoCandidateSourceStatus>()

  for (const sourceStatus of sourceStatuses) {
    bySource.set(`${sourceStatus.source}:${sourceStatus.label}`, sourceStatus)
  }

  return [...bySource.values()]
}

export function useWebArtworkDiscovery({
  selectedSteamGame,
  projectMetadata,
  applyBackgroundImageImport,
  announceStatus,
}: UseWebArtworkDiscoveryParams) {
  const asyncWork = useProjectAsyncWork()
  const [pendingSearch, setPendingSearch] = useState<ProjectAsyncRequest | null>(null)
  const [pendingApply, setPendingApply] = useState<ProjectAsyncRequest | null>(null)
  const [webArtworkDiscovery, setWebArtworkDiscovery] =
    useState<WebArtworkDiscoveryState>(EMPTY_WEB_ARTWORK_DISCOVERY)
  const discoveryInputKey = [
    selectedSteamGame?.appId ?? projectMetadata.steamAppId,
    projectMetadata.developer,
    projectMetadata.publisher,
  ].join('|')

  const findWebArtworkCandidates = useCallback(async () => {
    const request = asyncWork.begin('artwork-discovery')
    setPendingSearch(request)
    const discoveryTargets = [
      hasUsefulNames(selectedSteamGame?.developer ?? [], projectMetadata.developer) ? 'developer' as const : null,
      hasUsefulNames(selectedSteamGame?.publisher ?? [], projectMetadata.publisher) ? 'publisher' as const : null,
    ].filter((target): target is 'developer' | 'publisher' => Boolean(target))

    if (discoveryTargets.length === 0) {
      setWebArtworkDiscovery((currentState) => ({
        ...currentState,
        error: 'Import a Steam game or enter developer/publisher metadata before finding web artwork.',
        hasSearched: true,
        inputKey: discoveryInputKey,
        sessionId: request.sessionId,
      }))
      announceStatus('Import a Steam game or enter developer/publisher metadata before finding web artwork.')
      return
    }

    setWebArtworkDiscovery((currentState) => ({
      ...currentState,
      isLoading: true,
      error: null,
      hasSearched: true,
      inputKey: discoveryInputKey,
      sessionId: request.sessionId,
    }))

    try {
      const settledResults = await Promise.allSettled(
        discoveryTargets.map((logoKey) =>
          discoverLogoCandidates({
            logoKey,
            selectedSteamGame,
            projectMetadata,
          }),
        ),
      )
      asyncWork.publish(request, () => {
        const fulfilledResults = settledResults.flatMap((result) =>
          result.status === 'fulfilled' ? [result.value] : [],
        )
        const candidates = dedupeCandidates(
          fulfilledResults.flatMap((result) => result.artworkCandidates),
        )
        const sourceStatuses = dedupeSourceStatuses(
          fulfilledResults.flatMap((result) => result.sourceStatuses),
        )
        const firstFailure = settledResults.find((result) => result.status === 'rejected')
        const error = firstFailure?.status === 'rejected' ? getErrorMessage(firstFailure.reason) : null

        setWebArtworkDiscovery((currentState) => ({
          ...currentState,
          candidates,
          sourceStatuses,
          isLoading: false,
          error: candidates.length > 0 ? null : error,
          inputKey: discoveryInputKey,
          sessionId: request.sessionId,
        }))
        announceStatus(
          candidates.length > 0
            ? `Found ${candidates.length} web artwork candidate${candidates.length === 1 ? '' : 's'}.`
            : 'No web artwork candidates found. Steam artwork and local upload are still available.',
        )

      })
    } catch (error) {
      asyncWork.publish(request, () => {
        const message = getErrorMessage(error)
        setWebArtworkDiscovery((currentState) => ({
          ...currentState,
          candidates: [],
          sourceStatuses: [],
          isLoading: false,
          error: message,
          inputKey: discoveryInputKey,
          sessionId: request.sessionId,
        }))
        announceStatus(`Web artwork search failed: ${message}`)

      })
    }
  }, [asyncWork, announceStatus, discoveryInputKey, projectMetadata, selectedSteamGame])

  const applyWebArtworkCandidate = useCallback(async (candidate: RemoteLogoCandidate) => {
    const request = asyncWork.begin('background-artwork')
    setPendingApply(request)
    setWebArtworkDiscovery((currentState) => ({
      ...currentState,
      isApplying: true,
      error: null,
    }))
    announceStatus(`Downloading ${candidate.label}...`)

    try {
      const imageDataUrl = await downloadRemoteLogoCandidateAsDataUrl(candidate)
      const importedBackground = await createBackgroundImageImportFromDataUrl(
        imageDataUrl,
        `Using ${candidate.label} as the disc background.`,
        createProjectImageAssetProvenance({
          source: 'web-artwork',
          sourceId: candidate.id,
          sourceLabel: candidate.label,
          sourceUrl: candidate.url,
        }),
        candidate.id,
      )
      asyncWork.commit(request, () => {
        applyBackgroundImageImport(importedBackground)
        setWebArtworkDiscovery((currentState) => ({
          ...currentState,
          isApplying: false,
          error: null,
        }))

      })
    } catch (error) {
      asyncWork.publish(request, () => {
        const message = getErrorMessage(error)
        setWebArtworkDiscovery((currentState) => ({
          ...currentState,
          isApplying: false,
          error: message,
        }))
        announceStatus(`Web artwork import failed: ${message}`)

      })
    }
  }, [asyncWork, announceStatus, applyBackgroundImageImport])

  return {
    webArtworkDiscovery: webArtworkDiscovery.inputKey === discoveryInputKey &&
      webArtworkDiscovery.sessionId === asyncWork.getCurrentSessionId()
      ? {
        ...webArtworkDiscovery,
        isLoading: webArtworkDiscovery.isLoading && pendingSearch !== null && asyncWork.isCurrent(pendingSearch),
        isApplying: webArtworkDiscovery.isApplying && pendingApply !== null && asyncWork.isCurrent(pendingApply),
      }
      : EMPTY_WEB_ARTWORK_DISCOVERY,
    findWebArtworkCandidates,
    applyWebArtworkCandidate,
  }
}
