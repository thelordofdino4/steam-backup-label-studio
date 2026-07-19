import type {
  DiscTextLayout,
  DiscTextKey,
} from '../discText/types.ts'
import type {
  BackgroundImageSize,
  BackgroundOffset,
  LogoAssetLayout,
  MediaMarkLayout,
  PlatformMarkLayout,
  PlatformMarkValue,
  ProjectImageAssetProvenance,
  ProjectPlatformMarks,
  RatingBadgeLayout,
  TitleArtworkLayout,
} from '../project/projectTypes.ts'
import type { DiscTemplate } from '../types/template.ts'
import type {
  DiscPresetPlacementTarget,
} from './discPresetDefinition.ts'

type PointLayoutState<TLayout> = Readonly<{
  layout: Readonly<TLayout>
}>

export type DiscTitleArtworkPresetOwnerState =
  PointLayoutState<TitleArtworkLayout>

export type DiscRatingPresetOwnerState =
  PointLayoutState<RatingBadgeLayout>

export type DiscMediaMarkPresetOwnerState =
  PointLayoutState<MediaMarkLayout>

export type DiscPrimaryLogoPresetOwnerState<
  TLogoKey extends 'developer' | 'publisher' = 'developer' | 'publisher',
> = PointLayoutState<LogoAssetLayout> & Readonly<{
  logoKey: TLogoKey
}>

export type DiscTextPresetOwnerState<
  TKey extends Extract<DiscTextKey, 'title' | 'copyright'> =
    Extract<DiscTextKey, 'title' | 'copyright'>,
> = Readonly<{
  key: TKey
  enabled: boolean
  layout: Readonly<DiscTextLayout>
}>

export type DiscBackgroundPresetOwnerState = Readonly<{
  enabled: boolean
  imageDataUrl: string | null
  imageSource: ProjectImageAssetProvenance | null
  imageSize: BackgroundImageSize | null
  scale: number
  offset: Readonly<BackgroundOffset>
}>

export type DiscPlatformMarksPresetOwnerState = Readonly<{
  platformMarks: Readonly<ProjectPlatformMarks>
  template: Readonly<DiscTemplate>
}>

export type DiscPresetFocusedOwnerStateByTarget = Readonly<{
  'game-title.artwork': DiscTitleArtworkPresetOwnerState
  'game-title.text': DiscTextPresetOwnerState<'title'>
  'background.primary': DiscBackgroundPresetOwnerState
  'rating.primary': DiscRatingPresetOwnerState
  'media-format.primary': DiscMediaMarkPresetOwnerState
  'operating-system-marks.enabled': DiscPlatformMarksPresetOwnerState
  'developer-logo.primary': DiscPrimaryLogoPresetOwnerState<'developer'>
  'publisher-logo.primary': DiscPrimaryLogoPresetOwnerState<'publisher'>
  'legal.copyright': DiscTextPresetOwnerState<'copyright'>
}>

export type DiscPresetFocusedOwnerState<
  TTarget extends DiscPresetPlacementTarget = DiscPresetPlacementTarget,
> = DiscPresetFocusedOwnerStateByTarget[TTarget]

export type DiscPresetOwnerStateCatalog = Readonly<{
  [TTarget in DiscPresetPlacementTarget]?:
    DiscPresetFocusedOwnerStateByTarget[TTarget]
}>

export type DiscTitleArtworkLayoutPresetUpdate = Readonly<
  Pick<TitleArtworkLayout, 'x' | 'y' | 'scale'>
>

export type DiscRatingLayoutPresetUpdate = Readonly<
  Pick<RatingBadgeLayout, 'x' | 'y' | 'scale'>
>

export type DiscMediaMarkLayoutPresetUpdate = Readonly<
  Pick<MediaMarkLayout, 'x' | 'y' | 'scale'>
>

export type DiscPrimaryLogoLayoutPresetUpdate = Readonly<
  Pick<LogoAssetLayout, 'x' | 'y' | 'scale'>
>

export type DiscTextLayoutPresetUpdate = Readonly<
  Pick<DiscTextLayout, 'x' | 'y' | 'width' | 'align' | 'mode'> &
  Partial<Pick<DiscTextLayout, 'fontSizePt'>>
>

export type DiscBackgroundLayoutPresetUpdate = Readonly<{
  scale: number
  offset: Readonly<BackgroundOffset>
}>

export type DiscPlatformMarkLayoutPresetUpdate = Readonly<
  Pick<PlatformMarkLayout, 'x' | 'y' | 'scale'>
>

export type DiscPresetOwnerUpdate =
  | Readonly<{
      kind: 'title-artwork-layout'
      slotId: import('../guidedPresets/discGuidedSlots.ts').DiscGuidedSlotId
      target: 'game-title.artwork'
      layout: DiscTitleArtworkLayoutPresetUpdate
    }>
  | Readonly<{
      kind: 'rating-layout'
      slotId: import('../guidedPresets/discGuidedSlots.ts').DiscGuidedSlotId
      target: 'rating.primary'
      layout: DiscRatingLayoutPresetUpdate
    }>
  | Readonly<{
      kind: 'media-mark-layout'
      slotId: import('../guidedPresets/discGuidedSlots.ts').DiscGuidedSlotId
      target: 'media-format.primary'
      layout: DiscMediaMarkLayoutPresetUpdate
    }>
  | Readonly<{
      kind: 'primary-logo-layout'
      slotId: import('../guidedPresets/discGuidedSlots.ts').DiscGuidedSlotId
      target: 'developer-logo.primary'
      logoKey: 'developer'
      layout: DiscPrimaryLogoLayoutPresetUpdate
    }>
  | Readonly<{
      kind: 'primary-logo-layout'
      slotId: import('../guidedPresets/discGuidedSlots.ts').DiscGuidedSlotId
      target: 'publisher-logo.primary'
      logoKey: 'publisher'
      layout: DiscPrimaryLogoLayoutPresetUpdate
    }>
  | Readonly<{
      kind: 'disc-text-layout'
      slotId: import('../guidedPresets/discGuidedSlots.ts').DiscGuidedSlotId
      target: 'game-title.text' | 'legal.copyright'
      key: 'title' | 'copyright'
      layout: DiscTextLayoutPresetUpdate
    }>
  | Readonly<{
      kind: 'background-layout'
      slotId: import('../guidedPresets/discGuidedSlots.ts').DiscGuidedSlotId
      target: 'background.primary'
      layout: DiscBackgroundLayoutPresetUpdate
    }>
  | Readonly<{
      kind: 'platform-mark-layout'
      slotId: 'disc:guided:operating-system-marks:group'
      target: 'operating-system-marks.enabled'
      markId: PlatformMarkValue
      layout: DiscPlatformMarkLayoutPresetUpdate
    }>
