import { useProjectAsyncWork } from './useProjectAsyncWork.ts'
import type { ProjectAsyncRequest } from '../lifecycle/projectAsyncWork.ts'
import { useEffect, useState } from 'react'
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

export function useLocalSteamScreenshots({
  selectedSteamGame,
  applyBackgroundImageImport,
  setSelectedArtworkId,
  announceStatus,
}: UseLocalSteamScreenshotsOptions) {
  const asyncWork = useProjectAsyncWork()
  const [resultSessionId, setResultSessionId] = useState<string | null>(null)
  const [localSteamScreenshots, setLocalSteamScreenshots] = useState<
    LocalSteamScreenshotAsset[]
  >([])
  const [localSteamScreenshotThumbnails, setLocalSteamScreenshotThumbnails] =
    useState<Record<string, string>>({})
  const [hasCheckedLocalSteamScreenshots, setHasCheckedLocalSteamScreenshots] =
    useState(false)
  const [pendingSearch, setPendingSearch] = useState<ProjectAsyncRequest | null>(null)
  const isLocalSteamScreenshotsLoading = pendingSearch !== null && asyncWork.isCurrent(pendingSearch)

  useEffect(() => {
    let isCancelled = false

    async function loadLocalSteamScreenshotThumbnails() {
      const loadedThumbnails = await loadMissingLocalSteamScreenshotThumbnails(
        localSteamScreenshots,
        localSteamScreenshotThumbnails,
      )

      if (isCancelled) {
        return
      }

      if (Object.keys(loadedThumbnails).length === 0) {
        return
      }

      setLocalSteamScreenshotThumbnails((currentThumbnails) => ({
        ...currentThumbnails,
        ...loadedThumbnails,
      }))
    }

    void loadLocalSteamScreenshotThumbnails()

    return () => {
      isCancelled = true
    }
  }, [localSteamScreenshots, localSteamScreenshotThumbnails])

  function resetLocalSteamScreenshotSearch() {
    setLocalSteamScreenshots([])
    setHasCheckedLocalSteamScreenshots(false)
    asyncWork.invalidate('screenshot-discovery')
    setPendingSearch(null)
  }

  function clearLocalSteamScreenshotResults() {
    asyncWork.invalidate('screenshot-discovery')
    setLocalSteamScreenshots([])
    setLocalSteamScreenshotThumbnails({})
    setHasCheckedLocalSteamScreenshots(false)
  }

  async function handleFindLocalSteamScreenshots() {
    if (!selectedSteamGame) {
      announceStatus('Select or import a Steam game before checking local screenshots.')
      return
    }

    const request = asyncWork.begin('screenshot-discovery')
    setPendingSearch(request)
    setResultSessionId(request.sessionId)
    setHasCheckedLocalSteamScreenshots(true)
    announceStatus(`Checking local Steam screenshots for ${selectedSteamGame.title}...`)

    try {
      const discovery = await createLocalSteamScreenshotDiscovery(selectedSteamGame)
      asyncWork.publish(request, () => {
        setLocalSteamScreenshots(discovery.screenshots)
        announceStatus(discovery.statusMessage)
      })
    } catch (error) {
      asyncWork.publish(request, () => {
        setLocalSteamScreenshots([])
        setLocalSteamScreenshotThumbnails({})
        announceStatus(`Local Steam screenshot check failed: ${String(error)}`)
      })
    }
  }

  async function handleUseLocalSteamScreenshot(asset: LocalSteamScreenshotAsset) {
    const request = asyncWork.begin('background-artwork')
    setSelectedArtworkId(asset.id)
    announceStatus(`Loading ${asset.label}...`)

    try {
      const imported = await createLocalSteamScreenshotBackgroundImport(asset)
      asyncWork.commit(request, () => { applyBackgroundImageImport(imported) })
    } catch (error) {
      asyncWork.publish(request, () => {
        setSelectedArtworkId(null)
        announceStatus(`Local screenshot could not be applied: ${String(error)}`)
      })
    }
  }

  async function handleOpenLocalSteamScreenshotFolder() {
    const folderPath = localSteamScreenshots[0]?.folderPath

    if (!folderPath) {
      announceStatus('No local Steam screenshot folder is available yet.')
      return
    }

    try {
      await openLocalFolder(folderPath)
      announceStatus('Opened local Steam screenshot folder.')
    } catch (error) {
      announceStatus(`Could not open screenshot folder: ${String(error)}`)
    }
  }

  return {
    localSteamScreenshots: resultSessionId === asyncWork.getCurrentSessionId() ? localSteamScreenshots : [],
    localSteamScreenshotThumbnails: resultSessionId === asyncWork.getCurrentSessionId() ? localSteamScreenshotThumbnails : {},
    hasCheckedLocalSteamScreenshots: resultSessionId === asyncWork.getCurrentSessionId() && hasCheckedLocalSteamScreenshots,
    isLocalSteamScreenshotsLoading,
    resetLocalSteamScreenshotSearch,
    clearLocalSteamScreenshotResults,
    handleFindLocalSteamScreenshots,
    handleUseLocalSteamScreenshot,
    handleOpenLocalSteamScreenshotFolder,
  }
}
