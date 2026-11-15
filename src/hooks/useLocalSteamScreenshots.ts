import { useProjectAsyncWork } from './useProjectAsyncWork.ts'
import type { ProjectAsyncRequest } from '../lifecycle/projectAsyncWork.ts'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  createLocalSteamScreenshotBackgroundImport,
  type BackgroundImageImportResult,
} from '../image/backgroundImageImport'
import {
  openLocalFolder,
  type LocalSteamScreenshotAsset,
} from '../local/localArtwork'
import { createLocalSteamScreenshotDiscovery } from '../local/localSteamScreenshotDiscovery'
import { loadMissingLocalSteamScreenshotThumbnails } from '../local/localSteamScreenshotThumbnails'
import type { SteamImportedGame } from '../steam/steamApi'

type UseLocalSteamScreenshotsOptions = {
  selectedSteamGame: SteamImportedGame | null
  applyBackgroundImageImport: (
    importedBackground: BackgroundImageImportResult,
  ) => void
  setSelectedArtworkId: (artworkId: string | null) => void
  announceStatus: (message: string) => void
}

type ScreenshotIdentity = Readonly<{ sessionId: string | null; appId: number | null }>
type ScreenshotResults = {
  identity: ScreenshotIdentity | null
  screenshots: LocalSteamScreenshotAsset[]
  thumbnails: Record<string, string>
  hasChecked: boolean
}
const emptyResults: ScreenshotResults = {
  identity: null, screenshots: [], thumbnails: {}, hasChecked: false,
}

export function useLocalSteamScreenshots({
  selectedSteamGame,
  applyBackgroundImageImport,
  setSelectedArtworkId,
  announceStatus,
}: UseLocalSteamScreenshotsOptions) {
  const asyncWork = useProjectAsyncWork()
  const sessionId = asyncWork.getCurrentSessionId()
  const appId = selectedSteamGame?.appId ?? null
  const identity = useMemo(() => ({ sessionId, appId }), [sessionId, appId])
  const currentIdentity = useRef(identity)
  const [results, setResults] = useState<ScreenshotResults>(emptyResults)
  const currentResults = useRef(results)
  const [pendingSearch, setPendingSearch] = useState<{
    identity: ScreenshotIdentity; request: ProjectAsyncRequest
  } | null>(null)
  const visibleResults = results.identity === identity ? results : emptyResults
  const isLocalSteamScreenshotsLoading = pendingSearch?.identity === identity &&
    asyncWork.isCurrent(pendingSearch.request)

  // Input identity can change without a lifecycle revision. Retire its old
  // discovery authority, while render-time filtering hides accepted data at once.
  useLayoutEffect(() => {
    currentIdentity.current = identity
    return () => { asyncWork.invalidate('screenshot-discovery') }
  }, [asyncWork, identity])

  useLayoutEffect(() => { currentResults.current = results }, [results])

  function isIdentityCurrent(candidate: ScreenshotIdentity) {
    return candidate === currentIdentity.current && candidate.appId !== null &&
      candidate.sessionId !== null && candidate.sessionId === asyncWork.getCurrentSessionId()
  }

  useEffect(() => {
    if (results.identity !== identity || results.screenshots.length === 0) return
    let isCancelled = false

    async function loadLocalSteamScreenshotThumbnails() {
      const loadedThumbnails = await loadMissingLocalSteamScreenshotThumbnails(
        results.screenshots,
        results.thumbnails,
      )

      if (isCancelled || currentIdentity.current !== identity) {
        return
      }

      if (Object.keys(loadedThumbnails).length === 0) {
        return
      }

      setResults(current => current === results
        ? { ...current, thumbnails: { ...current.thumbnails, ...loadedThumbnails } }
        : current)
    }

    void loadLocalSteamScreenshotThumbnails()

    return () => {
      isCancelled = true
    }
  }, [identity, results])

  function resetLocalSteamScreenshotSearch() {
    clearLocalSteamScreenshotResults()
  }

  function clearLocalSteamScreenshotResults() {
    asyncWork.invalidate('screenshot-discovery')
    setResults(emptyResults)
    setPendingSearch(null)
  }

  async function handleFindLocalSteamScreenshots() {
    if (currentIdentity.current !== identity) return
    if (!selectedSteamGame) {
      announceStatus('Select or import a Steam game before checking local screenshots.')
      return
    }

    const request = asyncWork.begin('screenshot-discovery')
    setPendingSearch({ identity, request })
    setResults(current => ({
      ...(current.identity === identity ? current : emptyResults),
      identity, hasChecked: true,
    }))
    announceStatus(`Checking local Steam screenshots for ${selectedSteamGame.title}...`)

    try {
      const discovery = await createLocalSteamScreenshotDiscovery(selectedSteamGame)
      if (!isIdentityCurrent(identity)) return
      asyncWork.publish(request, () => {
        setResults({ identity, screenshots: discovery.screenshots, thumbnails: {}, hasChecked: true })
        announceStatus(discovery.statusMessage)
      })
    } catch (error) {
      if (!isIdentityCurrent(identity)) return
      asyncWork.publish(request, () => {
        setResults({ ...emptyResults, identity, hasChecked: true })
        announceStatus(`Local Steam screenshot check failed: ${String(error)}`)
      })
    }
  }

  async function handleUseLocalSteamScreenshot(asset: LocalSteamScreenshotAsset) {
    if (!isIdentityCurrent(identity) || currentResults.current.identity !== identity ||
      !currentResults.current.screenshots.some(current => current.id === asset.id && current.path === asset.path)) return
    const request = asyncWork.begin('background-artwork')
    setSelectedArtworkId(asset.id)
    announceStatus(`Loading ${asset.label}...`)

    try {
      const imported = await createLocalSteamScreenshotBackgroundImport(asset)
      if (!isIdentityCurrent(identity)) return
      asyncWork.commit(request, () => { applyBackgroundImageImport(imported) })
    } catch (error) {
      if (!isIdentityCurrent(identity)) return
      asyncWork.publish(request, () => {
        setSelectedArtworkId(null)
        announceStatus(`Local screenshot could not be applied: ${String(error)}`)
      })
    }
  }

  async function handleOpenLocalSteamScreenshotFolder() {
    if (!isIdentityCurrent(identity)) return
    const folderPath = currentResults.current.identity === identity
      ? currentResults.current.screenshots[0]?.folderPath : undefined

    if (!folderPath) {
      announceStatus('No local Steam screenshot folder is available yet.')
      return
    }

    const continuation = asyncWork.captureSessionContinuation()
    const mayAnnounce = () => isIdentityCurrent(identity) &&
      asyncWork.isSessionContinuationCurrent(continuation)
    try {
      await openLocalFolder(folderPath)
      if (mayAnnounce()) announceStatus('Opened local Steam screenshot folder.')
    } catch (error) {
      if (mayAnnounce()) announceStatus(`Could not open screenshot folder: ${String(error)}`)
    }
  }

  return {
    localSteamScreenshots: visibleResults.screenshots,
    localSteamScreenshotThumbnails: visibleResults.thumbnails,
    hasCheckedLocalSteamScreenshots: visibleResults.hasChecked,
    isLocalSteamScreenshotsLoading,
    resetLocalSteamScreenshotSearch,
    clearLocalSteamScreenshotResults,
    handleFindLocalSteamScreenshots,
    handleUseLocalSteamScreenshot,
    handleOpenLocalSteamScreenshotFolder,
  }
}
