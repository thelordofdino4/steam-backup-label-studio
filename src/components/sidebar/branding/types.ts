import type { ChangeEvent } from 'react'
import type { SteamLogoPlacement } from '../../../discText/index'
import type { LogoCandidateDiscoveryState } from '../../../hooks/useLogoAssetDiscovery'
import type {
  BackgroundImageSize,
  LogoAssetLayout,
  MediaMarkLayout,
  MediaMarkSource,
  MediaMarkTheme,
  MediaMarkValue,
  PlatformMarkLayout,
  PlatformMarkSource,
  PlatformMarkTheme,
  PlatformMarkValue,
  ProjectImageAssetProvenance,
  ProjectLogoAssets,
  ProjectMediaMark,
  ProjectMetadata,
  ProjectPlatformMarks,
  ProjectRatingBadge,
  ProjectTechnicalMarks,
  RatingBadgeLayout,
  RatingBadgeSource,
  SteamBannerColors,
  SteamBannerLockupLayout,
  TechnicalMarkLayout,
  TechnicalMarkSource,
  TechnicalMarkValue,
} from '../../../project/projectTypes'
import type { RemoteLogoCandidate } from '../../../steam/steamLogoCandidates'
import type { DiscTemplate } from '../../../types/template'

export type LogoKey = 'developer' | 'publisher'

export type BrandingPanelProps = {
  steamLogoPlacement: SteamLogoPlacement
  handleSteamLogoPlacementChange: (placement: SteamLogoPlacement) => void
  steamBannerLockupImageUrl: string | null
  steamBannerLockupImageSource: ProjectImageAssetProvenance | null
  steamBannerLockupImageSize: BackgroundImageSize | null
  steamBannerLockupLayout: SteamBannerLockupLayout
  steamBannerUseTextFallback: boolean
  steamBannerFallbackText: string
  steamBannerColors: SteamBannerColors
  projectLogoAssets: ProjectLogoAssets
  projectMetadata: ProjectMetadata
  projectRatingBadge: ProjectRatingBadge
  projectMediaMark: ProjectMediaMark
  projectPlatformMarks: ProjectPlatformMarks
  projectTechnicalMarks: ProjectTechnicalMarks
  selectedDiscTemplate: DiscTemplate
  handleProjectMetadataChange: (field: keyof ProjectMetadata, value: string) => void
  handleProjectMetadataFieldsChange: (fields: Partial<ProjectMetadata>) => void
  handleSteamBannerLockupUpload: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>
  handleClearSteamBannerLockup: () => void
  handleSteamBannerLockupLayoutChange: (field: keyof SteamBannerLockupLayout, value: number) => void
  handleResetSteamBannerLockupLayout: () => void
  handleSteamBannerUseTextFallbackChange: (useTextFallback: boolean) => void
  handleSteamBannerFallbackTextChange: (fallbackText: string) => void
  handleSteamBannerColorChange: (field: keyof SteamBannerColors, value: string) => void
  handleResetSteamBannerColors: () => void
  handleLogoAssetUpload: (
    logoKey: LogoKey,
    event: ChangeEvent<HTMLInputElement>,
    additionalLogoId?: string,
  ) => void | Promise<void>
  logoCandidateDiscovery: LogoCandidateDiscoveryState
  handleFindLogoCandidates: (logoKey: LogoKey) => void | Promise<void>
  handleApplyLogoCandidate: (
    logoKey: LogoKey,
    candidate: RemoteLogoCandidate,
    additionalLogoId?: string,
  ) => void | Promise<void>
  handleLogoAssetLayoutChange: (
    logoKey: LogoKey,
    field: keyof LogoAssetLayout,
    value: boolean | number,
    additionalLogoId?: string,
  ) => void
  handleClearLogoAsset: (logoKey: LogoKey, additionalLogoId?: string) => void
  handleResetLogoAssetLayout: (logoKey: LogoKey, additionalLogoId?: string) => void
  handleAddAdditionalLogoAsset: (logoKey: LogoKey) => void
  handleAdditionalLogoAssetLabelChange: (
    logoKey: LogoKey,
    additionalLogoId: string,
    label: string,
  ) => void
  handleRemoveAdditionalLogoAsset: (logoKey: LogoKey, additionalLogoId: string) => void
  handleRatingBadgeUpload: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>
  handleRatingBadgeSourceChange: (source: RatingBadgeSource) => void
  handleRatingBadgeEnabledChange: (enabled: boolean) => void
  handleRatingBadgeLayoutChange: (field: keyof RatingBadgeLayout, value: boolean | number) => void
  handleSupplementalUskRatingBadgeEnabledChange: (enabled: boolean) => void
  handleSupplementalUskRatingBadgeValueChange: (ratingValue: string) => void
  handleSupplementalUskRatingBadgeLayoutChange: (
    field: keyof RatingBadgeLayout,
    value: boolean | number,
  ) => void
  handleClearRatingBadgeImage: () => void
  handleResetRatingBadgeLayout: () => void
  handleResetSupplementalUskRatingBadgeLayout: () => void
  handleMediaMarkUpload: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>
  handleMediaMarkValueChange: (value: MediaMarkValue) => void
  handleMediaMarkSourceChange: (source: MediaMarkSource) => void
  handleMediaMarkThemeChange: (theme: MediaMarkTheme) => void
  handleMediaMarkLayoutChange: (field: keyof MediaMarkLayout, value: boolean | number) => void
  handleClearMediaMarkImage: () => void
  handleResetMediaMarkLayout: () => void
  handlePlatformMarkToggle: (value: PlatformMarkValue, enabled: boolean) => void
  handlePlatformMarkUpload: (
    value: PlatformMarkValue,
    event: ChangeEvent<HTMLInputElement>,
  ) => void | Promise<void>
  handlePlatformMarkSourceChange: (value: PlatformMarkValue, source: PlatformMarkSource) => void
  handlePlatformMarkThemeChange: (value: PlatformMarkValue, theme: PlatformMarkTheme) => void
  handlePlatformMarkLayoutChange: (
    platformValue: PlatformMarkValue,
    field: keyof PlatformMarkLayout,
    layoutValue: boolean | number,
  ) => void
  handleClearPlatformMarkImage: (value: PlatformMarkValue) => void
  handleResetPlatformMarkLayout: (value: PlatformMarkValue) => void
  handleTechnicalMarkToggle: (value: TechnicalMarkValue, enabled: boolean) => void
  handleTechnicalMarkUpload: (
    value: TechnicalMarkValue,
    event: ChangeEvent<HTMLInputElement>,
  ) => void | Promise<void>
  handleTechnicalMarkSourceChange: (value: TechnicalMarkValue, source: TechnicalMarkSource) => void
  handleTechnicalMarkLayoutChange: (
    technicalValue: TechnicalMarkValue,
    field: keyof TechnicalMarkLayout,
    layoutValue: boolean | number,
  ) => void
  handleTechnicalMarkLabelChange: (value: TechnicalMarkValue, label: string) => void
  handleClearTechnicalMarkImage: (value: TechnicalMarkValue) => void
  handleResetTechnicalMarkLayout: (value: TechnicalMarkValue) => void
}
