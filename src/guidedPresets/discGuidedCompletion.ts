import {
  getMediaMarkPlaceholderImageSize,
  getMediaMarkPlaceholderImageUrl,
  getPlatformMarkPlaceholderImageSize,
  getPlatformMarkPlaceholderImageUrl,
} from '../assets/assetManifest.ts'
import {
  getDiscTextContent,
  getDiscTextHtmlSource,
  isDiscTextHtmlEnabled,
  type DiscTextHtmlSources,
  type DiscTextSettings,
  type DiscTextValues,
} from '../discText/index.ts'
import { resolveDiscTextMetadataState } from '../discText/metadataStateTransitions.ts'
import { resolveMarkImageSource } from '../editor/markImageSource.ts'
import {
  isOptionalVisualFeatureEnabled,
  shouldRenderOptionalLayoutFeature,
  shouldRenderOptionalVisualFeature,
} from '../editor/optionalVisualFeature.ts'
import { hasActiveImageContent } from '../image/imageContentBounds.ts'
import type { DiscTextValueSources } from '../project/metadataDiscText.ts'
import { shouldRenderAdditionalArtworkElement } from '../project/projectAdditionalArtwork.ts'
import { DEFAULT_DISC_PROJECT_TITLE } from '../project/projectMetadata.ts'
import { shouldRenderRatingBadge } from '../project/projectRatingBadge.ts'
import { getProjectPlatformMarkAsset } from '../project/projectPlatformMarks.ts'
import { shouldRenderTitleArtwork } from '../project/projectTitleArtwork.ts'
import type {
  ProjectLogoAssets,
  ProjectMediaMark,
  ProjectMetadata,
  ProjectPlatformMarks,
  ProjectRatingBadge,
  ProjectTitleArtwork,
} from '../project/projectTypes.ts'
import { parseHtmlText } from '../text/htmlText.ts'
import type {
  DiscGuidedSlotId,
  DiscGuidedSlotState,
} from './discGuidedSlotState.ts'

export type DiscGuidedSlotCompletionHandler = (
  slotId: DiscGuidedSlotId,
) => void

export const ignoreDiscGuidedSlotCompletion: DiscGuidedSlotCompletionHandler =
  () => undefined

export const DISC_GUIDED_COMPLETION_SLOT_IDS = {
  gameTitle: 'disc:guided:game-title:primary',
  backgroundImage: 'disc:guided:background-image:primary',
  ratingBadge: 'disc:guided:rating-badge:primary',
  mediaFormatMark: 'disc:guided:media-format-mark:primary',
  operatingSystemMarks: 'disc:guided:operating-system-marks:group',
  developerLogo: 'disc:guided:developer-logo:primary',
  publisherLogo: 'disc:guided:publisher-logo:primary',
  legalText: 'disc:guided:legal-text:copyright',
} as const satisfies Record<string, DiscGuidedSlotId>

type DiscGuidedTextOwnerState = Readonly<{
  metadata: ProjectMetadata
  discText: Readonly<{
    settings: DiscTextSettings
    values: DiscTextValues
    valueSources: DiscTextValueSources
    titleValue: string
    htmlSources: DiscTextHtmlSources
  }>
}>

export function isMeaningfulDiscGuidedTextContent(content: string) {
  return content.trim().length > 0
}

function getResolvedDiscTextContent(
  state: DiscGuidedTextOwnerState,
  key: 'title' | 'copyright' | 'customNote',
) {
  const resolution = resolveDiscTextMetadataState(state.metadata, {
    discTextValues: state.discText.values,
    discTextValueSources: state.discText.valueSources,
    discTextTitleValue: state.discText.titleValue,
  })
  const fallbackText = getDiscTextContent(
    key,
    resolution.metadataBoundDiscTextValues,
    resolution.resolvedDiscTextTitle,
  )

  return isDiscTextHtmlEnabled(state.discText.htmlSources, key)
    ? parseHtmlText(
        getDiscTextHtmlSource(
          state.discText.htmlSources,
          key,
          fallbackText,
        ),
      ).plainText
    : fallbackText
}

function isUntouchedDefaultTitle(
  state: DiscGuidedTextOwnerState,
  resolvedTitle: string,
) {
  return resolvedTitle.trim() === DEFAULT_DISC_PROJECT_TITLE &&
    state.discText.valueSources.title === 'metadata' &&
    state.metadata.title.trim() === DEFAULT_DISC_PROJECT_TITLE &&
    state.discText.titleValue.trim() === '' &&
    state.metadata.steamAppId.trim() === ''
}

export function isDiscGuidedTextOwnerSatisfied(
  state: DiscGuidedTextOwnerState,
  key: 'title' | 'copyright' | 'customNote',
) {
  if (!state.discText.settings[key]) {
    return false
  }

  const content = getResolvedDiscTextContent(state, key)

  return isMeaningfulDiscGuidedTextContent(content) &&
    (key !== 'title' || !isUntouchedDefaultTitle(state, content))
}

export function isDiscGuidedBackgroundOwnerSatisfied(
  background: DiscGuidedSlotState['background'],
) {
  return shouldRenderOptionalVisualFeature(
    background,
    Boolean(background.imageDataUrl) &&
      Boolean(
        background.imageSize &&
        background.imageSize.width > 0 &&
        background.imageSize.height > 0,
      ) &&
      hasActiveImageContent(background.imageSize),
  )
}

export function isDiscGuidedTitleArtworkOwnerSatisfied(
  titleArtwork: ProjectTitleArtwork,
) {
  return shouldRenderTitleArtwork(titleArtwork)
}

export function isDiscGuidedRatingBadgeOwnerSatisfied(
  metadata: Pick<ProjectMetadata, 'ratingSystem'>,
  ratingBadge: ProjectRatingBadge,
) {
  return shouldRenderRatingBadge(metadata, ratingBadge)
}

function hasRenderableImageSource({
  source,
  customImageDataUrl,
  customImageSize,
  builtInImageDataUrl,
  builtInImageSize,
}: Parameters<typeof resolveMarkImageSource>[0]) {
  const resolvedImage = resolveMarkImageSource({
    source,
    customImageDataUrl,
    customImageSize,
    builtInImageDataUrl,
    builtInImageSize,
  })

  return Boolean(
    resolvedImage.imageDataUrl &&
    resolvedImage.imageSize &&
    resolvedImage.imageSize.width > 0 &&
    resolvedImage.imageSize.height > 0 &&
    hasActiveImageContent(resolvedImage.imageSize),
  )
}

export function isDiscGuidedMediaMarkOwnerSatisfied(
  mediaMark: ProjectMediaMark,
) {
  return shouldRenderOptionalLayoutFeature(
    mediaMark,
    hasRenderableImageSource({
      source: mediaMark.source,
      customImageDataUrl: mediaMark.customImageDataUrl,
      customImageSize: mediaMark.customImageSize,
      builtInImageDataUrl: getMediaMarkPlaceholderImageUrl(
        mediaMark.value,
        mediaMark.theme,
      ),
      builtInImageSize: getMediaMarkPlaceholderImageSize(
        mediaMark.value,
        mediaMark.theme,
      ),
    }),
  )
}

export function isDiscGuidedPlatformMarksOwnerSatisfied(
  platformMarks: ProjectPlatformMarks,
) {
  return platformMarks.values.some((value) => {
    const asset = getProjectPlatformMarkAsset(platformMarks, value)

    return shouldRenderOptionalLayoutFeature(
      asset,
      hasRenderableImageSource({
        source: asset.source,
        customImageDataUrl: asset.customImageDataUrl,
        customImageSize: asset.customImageSize,
        builtInImageDataUrl: getPlatformMarkPlaceholderImageUrl(
          value,
          asset.theme,
        ),
        builtInImageSize: getPlatformMarkPlaceholderImageSize(
          value,
          asset.theme,
        ),
      }),
    )
  })
}

export function isDiscGuidedPrimaryLogoOwnerSatisfied(
  logoAssets: Pick<
    ProjectLogoAssets,
    'developerLogoLayout' | 'publisherLogoLayout'
  >,
  logoKey: 'developer' | 'publisher',
) {
  return isOptionalVisualFeatureEnabled(
    logoKey === 'developer'
      ? logoAssets.developerLogoLayout
      : logoAssets.publisherLogoLayout,
  )
}

export function isDiscGuidedSlotOwnerSatisfied(
  slotId: DiscGuidedSlotId,
  state: DiscGuidedSlotState,
) {
  switch (slotId) {
    case 'disc:guided:game-title:primary':
      return isDiscGuidedTitleArtworkOwnerSatisfied(state.titleArtwork) ||
        isDiscGuidedTextOwnerSatisfied(state, 'title')
    case 'disc:guided:background-image:primary':
      return isDiscGuidedBackgroundOwnerSatisfied(state.background)
    case 'disc:guided:rating-badge:primary':
      return isDiscGuidedRatingBadgeOwnerSatisfied(
        state.metadata,
        state.ratingBadge,
      )
    case 'disc:guided:media-format-mark:primary':
      return isDiscGuidedMediaMarkOwnerSatisfied(state.mediaMark)
    case 'disc:guided:operating-system-marks:group':
      return isDiscGuidedPlatformMarksOwnerSatisfied(state.platformMarks)
    case 'disc:guided:developer-logo:primary':
      return isDiscGuidedPrimaryLogoOwnerSatisfied(
        state.logoAssets,
        'developer',
      )
    case 'disc:guided:publisher-logo:primary':
      return isDiscGuidedPrimaryLogoOwnerSatisfied(
        state.logoAssets,
        'publisher',
      )
    case 'disc:guided:legal-text:copyright':
      return isDiscGuidedTextOwnerSatisfied(state, 'copyright')
    case 'disc:guided:additional-artwork:primary':
      return state.additionalArtwork.elements.some((element) =>
        shouldRenderAdditionalArtworkElement(state.additionalArtwork, element),
      )
    case 'disc:guided:additional-text:custom-note':
      return isDiscGuidedTextOwnerSatisfied(state, 'customNote')
  }
}

export function getSatisfiedDiscGuidedSlotIds(
  state: DiscGuidedSlotState,
  canonicalOrder: readonly DiscGuidedSlotId[],
) {
  return canonicalOrder.filter((slotId) =>
    isDiscGuidedSlotOwnerSatisfied(slotId, state),
  )
}

export function getSatisfiedDiscGuidedSlotIdsForMetadataAction(
  state: DiscGuidedSlotState,
  affectedFields: readonly (keyof ProjectMetadata)[],
) {
  const affected = new Set(affectedFields)
  const completedSlotIds: DiscGuidedSlotId[] = []

  if (
    affected.has('title') &&
    isDiscGuidedTextOwnerSatisfied(state, 'title')
  ) {
    completedSlotIds.push(DISC_GUIDED_COMPLETION_SLOT_IDS.gameTitle)
  }

  if (
    (affected.has('ratingSystem') || affected.has('ratingValue')) &&
    isDiscGuidedRatingBadgeOwnerSatisfied(
      state.metadata,
      state.ratingBadge,
    )
  ) {
    completedSlotIds.push(DISC_GUIDED_COMPLETION_SLOT_IDS.ratingBadge)
  }

  if (
    affected.has('copyrightText') &&
    isDiscGuidedTextOwnerSatisfied(state, 'copyright')
  ) {
    completedSlotIds.push(DISC_GUIDED_COMPLETION_SLOT_IDS.legalText)
  }

  return completedSlotIds
}

export function completeDiscGuidedSlotsForMetadataAction(
  onDiscGuidedSlotCompleted: DiscGuidedSlotCompletionHandler,
  state: DiscGuidedSlotState,
  affectedFields: readonly (keyof ProjectMetadata)[],
) {
  for (const slotId of getSatisfiedDiscGuidedSlotIdsForMetadataAction(
    state,
    affectedFields,
  )) {
    onDiscGuidedSlotCompleted(slotId)
  }
}

export function completeDiscGuidedRatingBadgeAction(
  onDiscGuidedSlotCompleted: DiscGuidedSlotCompletionHandler,
  metadata: Pick<ProjectMetadata, 'ratingSystem'>,
  ratingBadge: ProjectRatingBadge,
) {
  completeDiscGuidedSlotWhenSatisfied(
    onDiscGuidedSlotCompleted,
    DISC_GUIDED_COMPLETION_SLOT_IDS.ratingBadge,
    isDiscGuidedRatingBadgeOwnerSatisfied(metadata, ratingBadge),
  )
}

export function completeDiscGuidedSlotWhenSatisfied(
  onDiscGuidedSlotCompleted: DiscGuidedSlotCompletionHandler,
  slotId: DiscGuidedSlotId,
  isSatisfied: boolean,
) {
  if (isSatisfied) {
    onDiscGuidedSlotCompleted(slotId)
  }
}
