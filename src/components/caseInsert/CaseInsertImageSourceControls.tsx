import type { ChangeEvent, ReactNode } from 'react'
import type { WebArtworkDiscoveryState } from '../../hooks/useWebArtworkDiscovery'
import type { LocalSteamScreenshotAsset } from '../../local/localArtwork'
import type {
  ProjectCaseInsertImageSlot,
} from '../../project/projectTypes'
import type {
  SteamArtworkAsset,
  SteamImportedGame,
} from '../../steam/steamApi'
import type { RemoteLogoCandidate } from '../../steam/steamLogoCandidates'
import {
  ArtworkImageSourceControls,
  type ArtworkImageSourceCatalog,
  type ArtworkImageSourceControlSource,
} from '../sidebar/artwork/ArtworkImageSourceControls'

export type CaseInsertImageSourceCatalog = ArtworkImageSourceCatalog

export type CaseInsertImageSourceControlSource =
  ArtworkImageSourceControlSource

export type CaseInsertImageSourceControlsProps = {
  selectedSteamGame: SteamImportedGame | null
  localSteamScreenshots: LocalSteamScreenshotAsset[]
  localSteamScreenshotThumbnails: Record<string, string>
  hasCheckedLocalSteamScreenshots: boolean
  isLocalSteamScreenshotsLoading: boolean
  onFindLocalSteamScreenshots: () => void | Promise<void>
  onOpenLocalSteamScreenshotFolder: () => void | Promise<void>
  webArtworkDiscovery: WebArtworkDiscoveryState
  onFindWebArtworkCandidates: () => void | Promise<void>
  uploadId: string
  title: string
  hasImage: boolean
  imageSource: ProjectCaseInsertImageSlot['imageSource']
  allowSteamArtwork?: boolean
  allowWebArtwork?: boolean
  allowLocalSteamScreenshots?: boolean
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>
  onUseSteamArtwork: (asset: SteamArtworkAsset) => void | Promise<void>
  onUseLocalSteamScreenshot: (
    asset: LocalSteamScreenshotAsset,
  ) => void | Promise<void>
  onUseWebArtworkCandidate: (
    candidate: RemoteLogoCandidate,
  ) => void | Promise<void>
  renderFineTuneControls?: (
    source: CaseInsertImageSourceControlSource,
    sectionLabel: string,
  ) => ReactNode
}

export function CaseInsertImageSourceControls(
  props: CaseInsertImageSourceControlsProps,
) {
  return <ArtworkImageSourceControls {...props} />
}
