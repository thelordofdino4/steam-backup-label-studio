export type BackgroundArtworkSource =
  | 'steam-artwork'
  | 'web-artwork'
  | 'local-steam-screenshot'
  | 'local-file'

export type ActiveBackgroundArtworkSource = BackgroundArtworkSource | 'none'

export const NO_BACKGROUND_ARTWORK_SOURCE: ActiveBackgroundArtworkSource = 'none'

type BackgroundArtworkSourceItem = {
  id: string
}

type ResolveActiveBackgroundArtworkSourceParams = {
  backgroundImageUrl: string | null
  selectedArtworkId: string | null
  steamArtwork: BackgroundArtworkSourceItem[]
  webArtworkCandidates: BackgroundArtworkSourceItem[]
  localSteamScreenshots: BackgroundArtworkSourceItem[]
}

export function resolveActiveBackgroundArtworkSource({
  backgroundImageUrl,
  selectedArtworkId,
  steamArtwork,
  webArtworkCandidates,
  localSteamScreenshots,
}: ResolveActiveBackgroundArtworkSourceParams): ActiveBackgroundArtworkSource {
  if (!backgroundImageUrl) return NO_BACKGROUND_ARTWORK_SOURCE
  if (!selectedArtworkId) return 'local-file'

  if (steamArtwork.some((asset) => asset.id === selectedArtworkId)) {
    return 'steam-artwork'
  }

  if (webArtworkCandidates.some((candidate) => candidate.id === selectedArtworkId)) {
    return 'web-artwork'
  }

  if (localSteamScreenshots.some((asset) => asset.id === selectedArtworkId)) {
    return 'local-steam-screenshot'
  }

  return 'local-file'
}

export function canTuneBackgroundArtworkSource(
  activeSource: ActiveBackgroundArtworkSource,
  source: BackgroundArtworkSource,
  hasBackgroundImage: boolean,
) {
  return hasBackgroundImage && activeSource === source
}
