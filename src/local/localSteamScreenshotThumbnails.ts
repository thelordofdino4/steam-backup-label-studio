import { readLocalImageAsDataUrl, type LocalSteamScreenshotAsset } from './localArtwork'

export async function loadMissingLocalSteamScreenshotThumbnails(
  screenshots: LocalSteamScreenshotAsset[],
  currentThumbnails: Record<string, string>,
  limit = 24,
) {
  const screenshotsWithoutThumbnails = screenshots.filter(
    (asset) => !currentThumbnails[asset.id],
  )

  if (screenshotsWithoutThumbnails.length === 0) {
    return {}
  }

  const thumbnailEntries = await Promise.all(
    screenshotsWithoutThumbnails.slice(0, limit).map(async (asset) => {
      try {
        return [asset.id, await readLocalImageAsDataUrl(asset.path)] as const
      } catch {
        return null
      }
    }),
  )
  const loadedThumbnails = thumbnailEntries.filter(
    (entry): entry is readonly [string, string] => entry !== null,
  )

  return Object.fromEntries(loadedThumbnails)
}
