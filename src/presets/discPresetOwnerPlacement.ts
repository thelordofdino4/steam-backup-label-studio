import type {
  DiscTextRenderableContent,
} from '../discText/renderableContent.ts'
import type {
  DiscTextLayout,
  DiscTextKey,
} from '../discText/types.ts'
import type {
  DiscTextStyle,
} from '../discText/styles.ts'
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
import { getProjectPlatformMarkAsset } from '../project/projectPlatformMarks.ts'
import type { DiscTemplate } from '../types/template.ts'
import type {
  DiscPresetPlacementTarget,
} from './discPresetDefinition.ts'
import type {
  DiscCanonicalVisualBounds,
} from './fitVisualBoundsToDiscPresetRegion.ts'

export function createDiscCanonicalVisualBoundsFromCenteredRenderBounds(
  bounds: Readonly<{
    halfWidth: number
    halfHeight: number
  }> | null,
): DiscCanonicalVisualBounds | null {
  if (
    !bounds ||
    !Number.isFinite(bounds.halfWidth) ||
    !Number.isFinite(bounds.halfHeight) ||
    bounds.halfWidth <= 0 ||
    bounds.halfHeight <= 0
  ) {
    return null
  }

  return Object.freeze({
    centerOffsetXPercent: 0,
    centerOffsetYPercent: 0,
    widthPercent: bounds.halfWidth * 2,
    heightPercent: bounds.halfHeight * 2,
  })
}

type PointLayoutState<TLayout> = Readonly<{
  layout: Readonly<TLayout>
  canonicalVisualBoundsAtScaleOne: DiscCanonicalVisualBounds | null
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

export type DiscTitleTextPresetOwnerState =
  DiscTextPresetOwnerState<'title'> & Readonly<{
    content: DiscTextRenderableContent
    style: Readonly<DiscTextStyle>
    template: Readonly<DiscTemplate>
  }>

export type DiscLegalTextPresetOwnerState =
  DiscTextPresetOwnerState<'copyright'> & Readonly<{
    content: DiscTextRenderableContent
    style: Readonly<DiscTextStyle>
    template: Readonly<DiscTemplate>
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
  'game-title.text': DiscTitleTextPresetOwnerState
  'background.primary': DiscBackgroundPresetOwnerState
  'rating.primary': DiscRatingPresetOwnerState
  'media-format.primary': DiscMediaMarkPresetOwnerState
  'operating-system-marks.enabled': DiscPlatformMarksPresetOwnerState
  'developer-logo.primary': DiscPrimaryLogoPresetOwnerState<'developer'>
  'publisher-logo.primary': DiscPrimaryLogoPresetOwnerState<'publisher'>
  'legal.copyright': DiscLegalTextPresetOwnerState
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
  Partial<Pick<DiscTextLayout, 'fontSizePt' | 'avoidVisualElements'>>
>

export type DiscBackgroundLayoutPresetUpdate = Readonly<{
  scale: number
  offset: Readonly<BackgroundOffset>
}>

export type DiscPlatformMarkLayoutPresetUpdate = Readonly<
  Pick<PlatformMarkLayout, 'x' | 'y' | 'scale'>
>

type DiscPointOwnerLayout = {
  enabled: boolean
  x: number
  y: number
  scale: number
}

export function preserveDiscPointOwnerPlacement<
  TLayout extends DiscPointOwnerLayout,
>(
  semanticLayout: TLayout,
  previousLayout: Readonly<Pick<TLayout, 'x' | 'y' | 'scale'>>,
): TLayout {
  return {
    ...semanticLayout,
    x: previousLayout.x,
    y: previousLayout.y,
    scale: previousLayout.scale,
  }
}

export function preserveDiscPlatformMarkPlacements(
  semanticPlatformMarks: ProjectPlatformMarks,
  previousPlatformMarks: ProjectPlatformMarks,
  template: DiscTemplate,
): ProjectPlatformMarks {
  const assets = { ...semanticPlatformMarks.assets }

  for (const value of Object.keys(assets) as PlatformMarkValue[]) {
    const semanticAsset = assets[value]
    if (!semanticAsset) continue

    assets[value] = {
      ...semanticAsset,
      layout: preserveDiscPointOwnerPlacement(
        semanticAsset.layout,
        getProjectPlatformMarkAsset(
          previousPlatformMarks,
          value,
          template,
        ).layout,
      ),
    }
  }

  return {
    ...semanticPlatformMarks,
    assets,
  }
}

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
