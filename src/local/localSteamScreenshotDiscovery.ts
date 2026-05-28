import type { SteamImportedGame } from '../steam/steamApi'
import { findSteamScreenshots, type LocalSteamScreenshotAsset } from './localArtwork'

export type LocalSteamScreenshotDiscoveryResult = {
  screenshots: LocalSteamScreenshotAsset[]
  statusMessage: string
}

function getLocalSteamScreenshotDiscoveryStatusMessage(
  gameTitle: string,
  screenshotCount: number,
) {
  return screenshotCount > 0
    ? `Found ${screenshotCount} local Steam screenshot${screenshotCount === 1 ? '' : 's'} for ${gameTitle}.`
    : `No local Steam screenshots found for ${gameTitle}.`
}

export async function createLocalSteamScreenshotDiscovery(
  selectedSteamGame: SteamImportedGame,
): Promise<LocalSteamScreenshotDiscoveryResult> {
  const screenshots = await findSteamScreenshots(selectedSteamGame.appId)

  return {
    screenshots,
    statusMessage: getLocalSteamScreenshotDiscoveryStatusMessage(
      selectedSteamGame.title,
      screenshots.length,
    ),
  }
}
