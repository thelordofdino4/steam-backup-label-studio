import { MediaMarkSetupControls } from '../sidebar/branding/MediaMarkControls'
import { PlatformMarkSetupControls } from '../sidebar/branding/PlatformMarkControls'
import { RatingBadgeSetupControls } from '../sidebar/branding/RatingBadgeControls'
import { TechnicalMarkSetupControls } from '../sidebar/branding/TechnicalMarkControls'
import type { BrandingPanelProps } from '../sidebar/branding/types'

export type CaseInsertBrandingSetupControlsProps = Pick<
  BrandingPanelProps,
  | 'projectMetadata'
  | 'projectRatingBadge'
  | 'projectMediaMark'
  | 'projectPlatformMarks'
  | 'projectTechnicalMarks'
  | 'handleProjectMetadataChange'
  | 'handleProjectMetadataFieldsChange'
  | 'handleRatingBadgeUpload'
  | 'handleRatingBadgeSourceChange'
  | 'handleRatingBadgeEnabledChange'
  | 'handleSupplementalUskRatingBadgeEnabledChange'
  | 'handleSupplementalUskRatingBadgeValueChange'
  | 'handleClearRatingBadgeImage'
  | 'handleMediaMarkUpload'
  | 'handleMediaMarkValueChange'
  | 'handleMediaMarkSourceChange'
  | 'handleMediaMarkThemeChange'
  | 'handleMediaMarkLayoutChange'
  | 'handleClearMediaMarkImage'
  | 'handlePlatformMarkToggle'
  | 'handlePlatformMarkUpload'
  | 'handlePlatformMarkSourceChange'
  | 'handlePlatformMarkThemeChange'
  | 'handlePlatformMarkLayoutChange'
  | 'handleClearPlatformMarkImage'
  | 'handleTechnicalMarkToggle'
  | 'handleTechnicalMarkUpload'
  | 'handleTechnicalMarkSourceChange'
  | 'handleTechnicalMarkLayoutChange'
  | 'handleTechnicalMarkLabelChange'
  | 'handleClearTechnicalMarkImage'
>

export function CaseInsertRatingBadgeSetupControls(
  props: CaseInsertBrandingSetupControlsProps,
) {
  return <RatingBadgeSetupControls {...props} />
}

export function CaseInsertMediaMarkSetupControls(
  props: CaseInsertBrandingSetupControlsProps,
) {
  return <MediaMarkSetupControls {...props} />
}

export function CaseInsertPlatformMarkSetupControls(
  props: CaseInsertBrandingSetupControlsProps,
) {
  return <PlatformMarkSetupControls {...props} />
}

export function CaseInsertTechnicalMarkSetupControls(
  props: CaseInsertBrandingSetupControlsProps,
) {
  return <TechnicalMarkSetupControls {...props} />
}
