import type { ChangeEvent } from 'react'
import type {
  BackgroundOffsetField,
  BackgroundOffsetSliderRanges,
} from '../../../image/backgroundImage'
import type { WebArtworkDiscoveryState } from '../../../hooks/useWebArtworkDiscovery'
import type { LocalSteamScreenshotAsset } from '../../../local/localArtwork'
import type {
  AdditionalArtworkFrameField,
  AdditionalArtworkLayoutField,
} from '../../../project/projectAdditionalArtwork'
import type { TitleArtworkLayoutField } from '../../../project/projectTitleArtwork'
import type {
  BackgroundOffset,
  ProjectAdditionalArtwork,
  ProjectImageAssetProvenance,
  ProjectTitleArtwork,
} from '../../../project/projectTypes'
import type { RemoteLogoCandidate } from '../../../steam/steamLogoCandidates'
import type { SteamArtworkAsset, SteamImportedGame } from '../../../steam/steamApi'
import type { DiscTemplate } from '../../../types/template'

export type ArtworkPanelProps = {
  selectedSteamGame: SteamImportedGame | null
  selectedArtworkId: string | null
  isArtworkLoading: boolean
  handleUseSteamArtwork: (asset: SteamArtworkAsset) => void | Promise<void>
  webArtworkDiscovery: WebArtworkDiscoveryState
  handleFindWebArtworkCandidates: () => void | Promise<void>
  handleUseWebArtworkCandidate: (candidate: RemoteLogoCandidate) => void | Promise<void>
  localSteamScreenshots: LocalSteamScreenshotAsset[]
  localSteamScreenshotThumbnails: Record<string, string>
  hasCheckedLocalSteamScreenshots: boolean
  isLocalSteamScreenshotsLoading: boolean
  handleFindLocalSteamScreenshots: () => void | Promise<void>
  handleOpenLocalSteamScreenshotFolder: () => void | Promise<void>
  handleUseLocalSteamScreenshot: (
    asset: LocalSteamScreenshotAsset,
  ) => void | Promise<void>
  handleBackgroundUpload: (event: ChangeEvent<HTMLInputElement>) => void
  isBackgroundArtworkEnabled: boolean
  handleBackgroundArtworkEnabledChange: (enabled: boolean) => void
  backgroundScale: number
  backgroundOffset: BackgroundOffset
  backgroundOffsetSliderRanges: BackgroundOffsetSliderRanges
  handleBackgroundScaleChange: (value: number) => void
  handleBackgroundOffsetChange: (
    field: BackgroundOffsetField,
    value: number,
  ) => void
  backgroundImageUrl: string | null
  backgroundImageSource: ProjectImageAssetProvenance | null
  handleResetBackground: () => void
  canFitBackgroundToSteamBannerOpenArea: boolean
  backgroundFitButtonLabel: string
  handleFitBackgroundToSteamBannerOpenArea: () => void
  projectTitleArtwork: ProjectTitleArtwork
  selectedDiscTemplate: DiscTemplate
  handleTitleArtworkLayoutChange: (
    field: TitleArtworkLayoutField,
    value: boolean | number,
  ) => void
  handleResetTitleArtworkLayout: () => void
  handleRestoreTitleArtworkDefault: () => void
  handleTitleArtworkUpload: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>
  projectAdditionalArtwork: ProjectAdditionalArtwork
  handleAdditionalArtworkEnabledChange: (enabled: boolean) => void
  handleAddAdditionalArtworkElement: () => void
  handleAdditionalArtworkUpload: (
    elementId: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => void | Promise<void>
  handleUseSteamArtworkAsAdditionalArtwork: (
    elementId: string,
    asset: SteamArtworkAsset,
  ) => void | Promise<void>
  handleUseWebArtworkCandidateAsAdditionalArtwork: (
    elementId: string,
    candidate: RemoteLogoCandidate,
  ) => void | Promise<void>
  handleUseLocalSteamScreenshotAsAdditionalArtwork: (
    elementId: string,
    asset: LocalSteamScreenshotAsset,
  ) => void | Promise<void>
  handleAdditionalArtworkLayoutChange: (
    elementId: string,
    field: AdditionalArtworkLayoutField,
    value: boolean | number,
  ) => void
  handleAdditionalArtworkLabelChange: (elementId: string, label: string) => void
  handleAdditionalArtworkFrameChange: (
    elementId: string,
    field: AdditionalArtworkFrameField,
    value: boolean | number | string,
  ) => void
  handleResetAdditionalArtworkElementLayout: (elementId: string) => void
  handleResetAdditionalArtworkElementFrame: (elementId: string) => void
  handleClearAdditionalArtworkElementImage: (elementId: string) => void
  handleRemoveAdditionalArtworkElement: (elementId: string) => void
}
