import type { ReactNode } from 'react'
import { MediaMarkSetupControls } from '../sidebar/branding/MediaMarkControls'
import { PlatformMarkSetupControls } from '../sidebar/branding/PlatformMarkControls'
import { RatingBadgeSetupControls } from '../sidebar/branding/RatingBadgeControls'
import { TechnicalMarkSetupControls } from '../sidebar/branding/TechnicalMarkControls'
import type {
  PlatformMarkValue,
  ProjectPlatformMarkAsset,
  ProjectTechnicalMarkAsset,
  TechnicalMarkValue,
} from '../../project/projectTypes'
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
  | 'handleAddTechnicalMarkAsset'
  | 'handleRemoveTechnicalMarkAsset'
> & {
  idPrefix?: string
}

export function CaseInsertRatingBadgeSetupControls(
  props: CaseInsertBrandingSetupControlsProps & {
    children?: ReactNode
    renderSupplementalUskLayoutControls?: () => ReactNode
  },
) {
  return <RatingBadgeSetupControls {...props} />
}

export function CaseInsertMediaMarkSetupControls(
  props: CaseInsertBrandingSetupControlsProps & {
    children?: ReactNode
  },
) {
  return <MediaMarkSetupControls {...props} />
}

export function CaseInsertPlatformMarkSetupControls(
  props: CaseInsertBrandingSetupControlsProps & {
    renderLayoutControls?: (
      value: PlatformMarkValue,
      label: string,
      asset: ProjectPlatformMarkAsset,
    ) => ReactNode
  },
) {
  return <PlatformMarkSetupControls {...props} />
}

export function CaseInsertTechnicalMarkSetupControls(
  props: CaseInsertBrandingSetupControlsProps & {
    renderLayoutControls?: (
      value: TechnicalMarkValue,
      label: string,
      asset: ProjectTechnicalMarkAsset,
      assetId?: string | null,
    ) => ReactNode
  },
) {
  return <TechnicalMarkSetupControls {...props} />
}
