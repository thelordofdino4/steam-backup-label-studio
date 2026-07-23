import type {
  DiscTextHtmlSources,
  DiscTextSettings,
  DiscTextValues,
} from '../discText/index.ts'
import type { DiscTextValueSources } from '../project/metadataDiscText.ts'
import type {
  BackgroundImageSize,
  ProjectAdditionalArtwork,
  ProjectLogoAssets,
  ProjectMediaMark,
  ProjectMetadata,
  ProjectPlatformMarks,
  ProjectRatingBadge,
  ProjectTitleArtwork,
} from '../project/projectTypes.ts'

export const DISC_GUIDED_SLOT_IDS = [
  'disc:guided:game-title:primary',
  'disc:guided:background-image:primary',
  'disc:guided:rating-badge:primary',
  'disc:guided:media-format-mark:primary',
  'disc:guided:operating-system-marks:group',
  'disc:guided:developer-logo:primary',
  'disc:guided:publisher-logo:primary',
  'disc:guided:legal-text:copyright',
  'disc:guided:additional-artwork:primary',
  'disc:guided:additional-text:custom-note',
] as const

export type DiscGuidedSlotId = (typeof DISC_GUIDED_SLOT_IDS)[number]

export type DiscGuidedSlotState = {
  background: {
    enabled: boolean
    imageDataUrl: string | null
    imageSize: BackgroundImageSize | null
  }
  titleArtwork: ProjectTitleArtwork
  metadata: ProjectMetadata
  ratingBadge: ProjectRatingBadge
  mediaMark: ProjectMediaMark
  platformMarks: ProjectPlatformMarks
  logoAssets: Pick<
    ProjectLogoAssets,
    | 'developerLogoDataUrl'
    | 'developerLogoLayout'
    | 'publisherLogoDataUrl'
    | 'publisherLogoLayout'
  >
  additionalArtwork: ProjectAdditionalArtwork
  discText: {
    settings: DiscTextSettings
    values: DiscTextValues
    valueSources: DiscTextValueSources
    titleValue: string
    htmlSources: DiscTextHtmlSources
  }
}
