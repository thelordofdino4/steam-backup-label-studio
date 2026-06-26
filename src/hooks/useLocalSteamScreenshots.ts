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
  const [localSteamScreenshots, setLocalSteamScreenshots] = useState<
    LocalSteamScreenshotAsset[]
  >([])
  const [localSteamScreenshotThumbnails, setLocalSteamScreenshotThumbnails] =
    useState<Record<string, string>>({})
  const [hasCheckedLocalSteamScreenshots, setHasCheckedLocalSteamScreenshots] =
    useState(false)
  const [isLocalSteamScreenshotsLoading, setIsLocalSteamScreenshotsLoading] =
    useState(false)

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
    setIsLocalSteamScreenshotsLoading(false)
  }

  function clearLocalSteamScreenshotResults() {
    setLocalSteamScreenshots([])
    setLocalSteamScreenshotThumbnails({})
    setHasCheckedLocalSteamScreenshots(false)
  }

  async function handleFindLocalSteamScreenshots() {
    if (!selectedSteamGame) {
      announceStatus('Select or import a Steam game before checking local screenshots.')
      return
    }

    setIsLocalSteamScreenshotsLoading(true)
    setHasCheckedLocalSteamScreenshots(true)
    announceStatus(`Checking local Steam screenshots for ${selectedSteamGame.title}...`)

    try {
      const discovery = await createLocalSteamScreenshotDiscovery(selectedSteamGame)
      setLocalSteamScreenshots(discovery.screenshots)
      announceStatus(discovery.statusMessage)
    } catch (error) {
      setLocalSteamScreenshots([])
      setLocalSteamScreenshotThumbnails({})
      announceStatus(`Local Steam screenshot check failed: ${String(error)}`)
    } finally {
      setIsLocalSteamScreenshotsLoading(false)
    }
  }

  async function handleUseLocalSteamScreenshot(asset: LocalSteamScreenshotAsset) {
    setSelectedArtworkId(asset.id)
    announceStatus(`Loading ${asset.label}...`)

    try {
      applyBackgroundImageImport(await createLocalSteamScreenshotBackgroundImport(asset))
    } catch (error) {
      setSelectedArtworkId(null)
      announceStatus(`Local screenshot could not be applied: ${String(error)}`)
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
    localSteamScreenshots,
    localSteamScreenshotThumbnails,
    hasCheckedLocalSteamScreenshots,
    isLocalSteamScreenshotsLoading,
    resetLocalSteamScreenshotSearch,
    clearLocalSteamScreenshotResults,
    handleFindLocalSteamScreenshots,
    handleUseLocalSteamScreenshot,
    handleOpenLocalSteamScreenshotFolder,
  }
}
