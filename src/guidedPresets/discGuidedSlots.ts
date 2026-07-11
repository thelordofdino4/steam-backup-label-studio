import {
  getMediaMarkPlaceholderImageSize,
  getMediaMarkPlaceholderImageUrl,
  getPlatformMarkPlaceholderImageSize,
  getPlatformMarkPlaceholderImageUrl,
} from '../assets/assetManifest.ts'
import {
  resolveMarkImageSource,
} from '../editor/markImageSource.ts'
import {
  getDiscTextContent,
  getDiscTextHtmlSource,
  isDiscTextHtmlEnabled,
  type DiscTextHtmlSources,
  type DiscTextSettings,
  type DiscTextValues,
} from '../discText/index.ts'
import { resolveDiscTextMetadataState } from '../discText/metadataStateTransitions.ts'
import {
  isOptionalVisualFeatureEnabled,
  shouldRenderOptionalLayoutFeature,
  shouldRenderOptionalVisualFeature,
} from '../editor/optionalVisualFeature.ts'
import { hasActiveImageContent } from '../image/imageContentBounds.ts'
import type { DiscRolePresetRole } from '../layout/discRolePresets.ts'
import type { DiscTextValueSources } from '../project/metadataDiscText.ts'
import { shouldRenderAdditionalArtworkElement } from '../project/projectAdditionalArtwork.ts'
import { DEFAULT_DISC_PROJECT_TITLE } from '../project/projectMetadata.ts'
import { shouldRenderRatingBadge } from '../project/projectRatingBadge.ts'
import { getProjectPlatformMarkAsset } from '../project/projectPlatformMarks.ts'
import { shouldRenderTitleArtwork } from '../project/projectTitleArtwork.ts'
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
import { parseHtmlText } from '../text/htmlText.ts'

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

export type GuidedContentKind = 'image' | 'text' | 'domain-mark'

export type GuidedSlotLifecycle =
  | 'unfilled'
  | 'suggested'
  | 'filled'
  | 'skipped'

export type DiscGuidedSlotRequirement = 'expected' | 'optional'

export type DiscGuidedBindingCandidate =
  | { owner: 'backgroundImage' }
  | { owner: 'titleArtwork' }
  | {
      owner: 'discText'
      key: 'title' | 'copyright' | 'customNote'
    }
  | {
      owner: 'ratingBadge'
      badgeKey: 'primary'
    }
  | { owner: 'mediaMark' }
  | {
      owner: 'platformMarks'
      selection: 'enabled-values'
    }
  | {
      owner: 'logoAssets'
      logoKey: 'developer' | 'publisher'
      scope: 'primary'
    }
  | {
      owner: 'additionalArtwork'
      selection: 'first-renderable-existing'
    }

export type DiscGuidedResolvedBinding =
  | Exclude<DiscGuidedBindingCandidate, { owner: 'additionalArtwork' }>
  | {
      owner: 'additionalArtwork'
      elementId: string
    }

export type DiscGuidedSuggestionSourceKind =
  | 'steam-import'
  | 'metadata'
  | 'configured-owner'
  | 'external'

export type DiscGuidedAutoFillEligibility =
  | 'none'
  | 'accepted-import-result'
  | 'accepted-metadata'

export type DiscGuidedPlaceholderGeometryRef = {
  guidedPresetId: string
  geometryKey: string
}

export type DiscGuidedSlotDefinition = {
  id: DiscGuidedSlotId
  surface: 'disc'
  role: DiscRolePresetRole
  acceptedContentKinds: readonly GuidedContentKind[]
  preferredContentKind?: GuidedContentKind
  candidateBindings: readonly DiscGuidedBindingCandidate[]
  requirement: DiscGuidedSlotRequirement
  skippable: boolean
  suggestionSourceKinds: readonly DiscGuidedSuggestionSourceKind[]
  autoFillEligibility: DiscGuidedAutoFillEligibility
  placeholderGeometry?: DiscGuidedPlaceholderGeometryRef
}

export type DiscGuidedSlotSuggestion = {
  id: string
  slotId: DiscGuidedSlotId
  contentKind: GuidedContentKind
  sourceKind: DiscGuidedSuggestionSourceKind
}

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

export type DiscGuidedSlotResolution =
  | {
      lifecycle: 'filled'
      definition: DiscGuidedSlotDefinition
      binding: DiscGuidedResolvedBinding
      suggestion: null
    }
  | {
      lifecycle: 'suggested'
      definition: DiscGuidedSlotDefinition
      binding: null
      suggestion: DiscGuidedSlotSuggestion
    }
  | {
      lifecycle: 'unfilled' | 'skipped'
      definition: DiscGuidedSlotDefinition
      binding: null
      suggestion: null
    }

export const DISC_GUIDED_SLOT_DEFINITIONS = [
  {
    id: 'disc:guided:game-title:primary',
    surface: 'disc',
    role: 'game-title',
    acceptedContentKinds: ['image', 'text'],
    preferredContentKind: 'image',
    candidateBindings: [
      { owner: 'titleArtwork' },
      { owner: 'discText', key: 'title' },
    ],
    requirement: 'expected',
    skippable: true,
    suggestionSourceKinds: ['steam-import', 'metadata', 'external'],
    autoFillEligibility: 'accepted-import-result',
  },
  {
    id: 'disc:guided:background-image:primary',
    surface: 'disc',
    role: 'background-artwork',
    acceptedContentKinds: ['image'],
    preferredContentKind: 'image',
    candidateBindings: [{ owner: 'backgroundImage' }],
    requirement: 'expected',
    skippable: true,
    suggestionSourceKinds: [],
    autoFillEligibility: 'none',
  },
  {
    id: 'disc:guided:rating-badge:primary',
    surface: 'disc',
    role: 'game-info-logos',
    acceptedContentKinds: ['domain-mark', 'image'],
    preferredContentKind: 'domain-mark',
    candidateBindings: [{ owner: 'ratingBadge', badgeKey: 'primary' }],
    requirement: 'optional',
    skippable: true,
    suggestionSourceKinds: ['metadata', 'configured-owner', 'external'],
    autoFillEligibility: 'accepted-metadata',
  },
  {
    id: 'disc:guided:media-format-mark:primary',
    surface: 'disc',
    role: 'game-info-logos',
    acceptedContentKinds: ['domain-mark', 'image'],
    preferredContentKind: 'domain-mark',
    candidateBindings: [{ owner: 'mediaMark' }],
    requirement: 'optional',
    skippable: true,
    suggestionSourceKinds: ['configured-owner', 'external'],
    autoFillEligibility: 'none',
  },
  {
    id: 'disc:guided:operating-system-marks:group',
    surface: 'disc',
    role: 'game-info-logos',
    acceptedContentKinds: ['domain-mark', 'image'],
    preferredContentKind: 'domain-mark',
    candidateBindings: [
      { owner: 'platformMarks', selection: 'enabled-values' },
    ],
    requirement: 'optional',
    skippable: true,
    suggestionSourceKinds: ['configured-owner', 'external'],
    autoFillEligibility: 'none',
  },
  {
    id: 'disc:guided:developer-logo:primary',
    surface: 'disc',
    role: 'company-logos',
    acceptedContentKinds: ['image'],
    preferredContentKind: 'image',
    candidateBindings: [
      { owner: 'logoAssets', logoKey: 'developer', scope: 'primary' },
    ],
    requirement: 'optional',
    skippable: true,
    suggestionSourceKinds: ['configured-owner', 'external'],
    autoFillEligibility: 'accepted-import-result',
  },
  {
    id: 'disc:guided:publisher-logo:primary',
    surface: 'disc',
    role: 'company-logos',
    acceptedContentKinds: ['image'],
    preferredContentKind: 'image',
    candidateBindings: [
      { owner: 'logoAssets', logoKey: 'publisher', scope: 'primary' },
    ],
    requirement: 'optional',
    skippable: true,
    suggestionSourceKinds: ['configured-owner', 'external'],
    autoFillEligibility: 'accepted-import-result',
  },
  {
    id: 'disc:guided:legal-text:copyright',
    surface: 'disc',
    role: 'legal-info',
    acceptedContentKinds: ['text'],
    preferredContentKind: 'text',
    candidateBindings: [{ owner: 'discText', key: 'copyright' }],
    requirement: 'optional',
    skippable: true,
    suggestionSourceKinds: ['metadata', 'external'],
    autoFillEligibility: 'accepted-metadata',
  },
  {
    id: 'disc:guided:additional-artwork:primary',
    surface: 'disc',
    role: 'additional-artwork',
    acceptedContentKinds: ['image'],
    preferredContentKind: 'image',
    candidateBindings: [
      { owner: 'additionalArtwork', selection: 'first-renderable-existing' },
    ],
    requirement: 'optional',
    skippable: true,
    suggestionSourceKinds: [],
    autoFillEligibility: 'none',
  },
  {
    id: 'disc:guided:additional-text:custom-note',
    surface: 'disc',
    role: 'additional-text',
    acceptedContentKinds: ['text'],
    preferredContentKind: 'text',
    candidateBindings: [{ owner: 'discText', key: 'customNote' }],
    requirement: 'optional',
    skippable: true,
    suggestionSourceKinds: [],
    autoFillEligibility: 'none',
  },
] as const satisfies readonly DiscGuidedSlotDefinition[]

export function getDiscGuidedSlotDefinition(slotId: string) {
  return DISC_GUIDED_SLOT_DEFINITIONS.find(
    (definition) => definition.id === slotId,
  )
}

function getResolvedDiscTextContent(
  state: DiscGuidedSlotState,
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
  state: DiscGuidedSlotState,
  resolvedTitle: string,
) {
  return resolvedTitle.trim() === DEFAULT_DISC_PROJECT_TITLE &&
    state.discText.valueSources.title === 'metadata' &&
    state.metadata.title.trim() === DEFAULT_DISC_PROJECT_TITLE &&
    state.discText.titleValue.trim() === '' &&
    state.metadata.steamAppId.trim() === ''
}

function resolveDiscTextBinding(
  state: DiscGuidedSlotState,
  candidate: Extract<DiscGuidedBindingCandidate, { owner: 'discText' }>,
): DiscGuidedResolvedBinding | null {
  if (!state.discText.settings[candidate.key]) {
    return null
  }

  const content = getResolvedDiscTextContent(state, candidate.key)

  if (!content.trim()) {
    return null
  }

  if (candidate.key === 'title' && isUntouchedDefaultTitle(state, content)) {
    return null
  }

  return candidate
}

function resolveLogoBinding(
  state: DiscGuidedSlotState,
  candidate: Extract<DiscGuidedBindingCandidate, { owner: 'logoAssets' }>,
): DiscGuidedResolvedBinding | null {
  const layout = candidate.logoKey === 'developer'
    ? state.logoAssets.developerLogoLayout
    : state.logoAssets.publisherLogoLayout
  const imageDataUrl = candidate.logoKey === 'developer'
    ? state.logoAssets.developerLogoDataUrl
    : state.logoAssets.publisherLogoDataUrl

  return isOptionalVisualFeatureEnabled(layout) && Boolean(imageDataUrl)
    ? candidate
    : null
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

function shouldRenderMediaMark(mediaMark: ProjectMediaMark) {
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

function hasRenderablePlatformMark(platformMarks: ProjectPlatformMarks) {
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

function resolveBindingCandidate(
  state: DiscGuidedSlotState,
  candidate: DiscGuidedBindingCandidate,
): DiscGuidedResolvedBinding | null {
  switch (candidate.owner) {
    case 'backgroundImage':
      return shouldRenderOptionalVisualFeature(
        state.background,
        Boolean(state.background.imageDataUrl) &&
          Boolean(
            state.background.imageSize &&
            state.background.imageSize.width > 0 &&
            state.background.imageSize.height > 0,
          ) &&
          hasActiveImageContent(state.background.imageSize),
      )
        ? candidate
        : null
    case 'titleArtwork':
      return shouldRenderTitleArtwork(state.titleArtwork) ? candidate : null
    case 'discText':
      return resolveDiscTextBinding(state, candidate)
    case 'ratingBadge':
      return shouldRenderRatingBadge(state.metadata, state.ratingBadge)
        ? candidate
        : null
    case 'mediaMark':
      return shouldRenderMediaMark(state.mediaMark) ? candidate : null
    case 'platformMarks':
      return hasRenderablePlatformMark(state.platformMarks) ? candidate : null
    case 'logoAssets':
      return resolveLogoBinding(state, candidate)
    case 'additionalArtwork': {
      const element = state.additionalArtwork.elements.find((candidateElement) =>
        shouldRenderAdditionalArtworkElement(
          state.additionalArtwork,
          candidateElement,
        ),
      )

      return element
        ? { owner: 'additionalArtwork', elementId: element.id }
        : null
    }
  }
}

function resolveExistingBinding(
  definition: DiscGuidedSlotDefinition,
  state: DiscGuidedSlotState,
) {
  for (const candidate of definition.candidateBindings) {
    const binding = resolveBindingCandidate(state, candidate)

    if (binding) {
      return binding
    }
  }

  return null
}

function resolveSuggestion(
  definition: DiscGuidedSlotDefinition,
  suggestions: readonly DiscGuidedSlotSuggestion[],
) {
  return suggestions.find((suggestion) =>
    suggestion.slotId === definition.id &&
    definition.acceptedContentKinds.includes(suggestion.contentKind),
  ) ?? null
}

export function resolveDiscGuidedSlot({
  slotId,
  state,
  suggestions,
  skippedSlotIds,
}: {
  slotId: DiscGuidedSlotId
  state: DiscGuidedSlotState
  suggestions: readonly DiscGuidedSlotSuggestion[]
  skippedSlotIds: ReadonlySet<DiscGuidedSlotId>
}): DiscGuidedSlotResolution {
  const definition = getDiscGuidedSlotDefinition(slotId)

  if (!definition) {
    throw new Error(`Unknown Disc guided slot: ${slotId}`)
  }

  if (skippedSlotIds.has(slotId)) {
    return {
      lifecycle: 'skipped',
      definition,
      binding: null,
      suggestion: null,
    }
  }

  const binding = resolveExistingBinding(definition, state)

  if (binding) {
    return {
      lifecycle: 'filled',
      definition,
      binding,
      suggestion: null,
    }
  }

  const suggestion = resolveSuggestion(definition, suggestions)

  if (suggestion) {
    return {
      lifecycle: 'suggested',
      definition,
      binding: null,
      suggestion,
    }
  }

  return {
    lifecycle: 'unfilled',
    definition,
    binding: null,
    suggestion: null,
  }
}

export function resolveDiscGuidedSlots({
  state,
  suggestions,
  skippedSlotIds,
}: {
  state: DiscGuidedSlotState
  suggestions: readonly DiscGuidedSlotSuggestion[]
  skippedSlotIds: ReadonlySet<DiscGuidedSlotId>
}) {
  return DISC_GUIDED_SLOT_DEFINITIONS.map((definition) =>
    resolveDiscGuidedSlot({
      slotId: definition.id,
      state,
      suggestions,
      skippedSlotIds,
    }),
  )
}
