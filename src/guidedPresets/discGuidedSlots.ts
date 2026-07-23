import type { DiscRolePresetRole } from '../layout/discRolePresets.ts'
import { shouldRenderAdditionalArtworkElement } from '../project/projectAdditionalArtwork.ts'
import {
  isDiscGuidedBackgroundOwnerSatisfied,
  isDiscGuidedMediaMarkOwnerSatisfied,
  isDiscGuidedPlatformMarksOwnerSatisfied,
  isDiscGuidedPrimaryLogoOwnerSatisfied,
  isDiscGuidedRatingBadgeOwnerSatisfied,
  isDiscGuidedTextOwnerSatisfied,
  isDiscGuidedTitleArtworkOwnerSatisfied,
} from './discGuidedCompletion.ts'
import type {
  DiscGuidedSlotId,
  DiscGuidedSlotState,
} from './discGuidedSlotState.ts'

export { DISC_GUIDED_SLOT_IDS } from './discGuidedSlotState.ts'
export type {
  DiscGuidedSlotId,
  DiscGuidedSlotState,
} from './discGuidedSlotState.ts'

export type GuidedContentKind = 'image' | 'text' | 'domain-mark'

export type GuidedSlotLifecycle =
  | 'unfilled'
  | 'suggested'
  | 'filled'
  | 'completed'
  | 'omitted'
  | 'unsupported'

export type DiscGuidedSlotPresentation =
  | 'unsupported'
  | 'available'
  | 'suggested'
  | 'owner-filled'
  | 'completed'
  | 'omitted'

export type DiscGuidedSlotResolutionFlags = Readonly<{
  unsupported: boolean
  omitted: boolean
  completed: boolean
  ownerFilled: boolean
  suggested: boolean
}>

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
  omittable: boolean
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

export type DiscGuidedSlotResolution = Readonly<{
  lifecycle: GuidedSlotLifecycle
  presentation: DiscGuidedSlotPresentation
  flags: DiscGuidedSlotResolutionFlags
  definition: DiscGuidedSlotDefinition
  binding: DiscGuidedResolvedBinding | null
  suggestion: DiscGuidedSlotSuggestion | null
}>

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
    omittable: true,
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
    omittable: true,
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
    omittable: true,
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
    omittable: true,
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
    omittable: true,
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
    omittable: true,
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
    omittable: true,
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
    omittable: true,
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
    omittable: true,
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
    omittable: true,
    suggestionSourceKinds: [],
    autoFillEligibility: 'none',
  },
] as const satisfies readonly DiscGuidedSlotDefinition[]

export function getDiscGuidedSlotDefinition(slotId: string) {
  return DISC_GUIDED_SLOT_DEFINITIONS.find(
    (definition) => definition.id === slotId,
  )
}

function resolveDiscTextBinding(
  state: DiscGuidedSlotState,
  candidate: Extract<DiscGuidedBindingCandidate, { owner: 'discText' }>,
): DiscGuidedResolvedBinding | null {
  return isDiscGuidedTextOwnerSatisfied(state, candidate.key)
    ? candidate
    : null
}

function resolveLogoBinding(
  state: DiscGuidedSlotState,
  candidate: Extract<DiscGuidedBindingCandidate, { owner: 'logoAssets' }>,
): DiscGuidedResolvedBinding | null {
  return isDiscGuidedPrimaryLogoOwnerSatisfied(
    state.logoAssets,
    candidate.logoKey,
  )
    ? candidate
    : null
}

function resolveBindingCandidate(
  state: DiscGuidedSlotState,
  candidate: DiscGuidedBindingCandidate,
): DiscGuidedResolvedBinding | null {
  switch (candidate.owner) {
    case 'backgroundImage':
      return isDiscGuidedBackgroundOwnerSatisfied(state.background)
        ? candidate
        : null
    case 'titleArtwork':
      return isDiscGuidedTitleArtworkOwnerSatisfied(state.titleArtwork)
        ? candidate
        : null
    case 'discText':
      return resolveDiscTextBinding(state, candidate)
    case 'ratingBadge':
      return isDiscGuidedRatingBadgeOwnerSatisfied(
        state.metadata,
        state.ratingBadge,
      )
        ? candidate
        : null
    case 'mediaMark':
      return isDiscGuidedMediaMarkOwnerSatisfied(state.mediaMark)
        ? candidate
        : null
    case 'platformMarks':
      return isDiscGuidedPlatformMarksOwnerSatisfied(state.platformMarks)
        ? candidate
        : null
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
  omittedSlotIds,
  completedSlotIds = new Set<DiscGuidedSlotId>(),
  unsupported = false,
}: {
  slotId: DiscGuidedSlotId
  state: DiscGuidedSlotState
  suggestions: readonly DiscGuidedSlotSuggestion[]
  omittedSlotIds: ReadonlySet<DiscGuidedSlotId>
  completedSlotIds?: ReadonlySet<DiscGuidedSlotId>
  unsupported?: boolean
}): DiscGuidedSlotResolution {
  const definition = getDiscGuidedSlotDefinition(slotId)

  if (!definition) {
    throw new Error(`Unknown Disc guided slot: ${slotId}`)
  }

  const binding = resolveExistingBinding(definition, state)
  const suggestion = resolveSuggestion(definition, suggestions)
  const flags: DiscGuidedSlotResolutionFlags = {
    unsupported,
    omitted: omittedSlotIds.has(slotId),
    completed: completedSlotIds.has(slotId),
    ownerFilled: binding !== null,
    suggested: suggestion !== null,
  }
  const presentation: DiscGuidedSlotPresentation = flags.unsupported
    ? 'unsupported'
    : flags.omitted
      ? 'omitted'
      : flags.completed
        ? 'completed'
        : flags.ownerFilled
          ? 'owner-filled'
          : flags.suggested
            ? 'suggested'
            : 'available'
  const lifecycle: GuidedSlotLifecycle = presentation === 'owner-filled'
    ? 'filled'
    : presentation === 'available'
      ? 'unfilled'
      : presentation

  return {
    lifecycle,
    presentation,
    flags,
    definition,
    binding,
    suggestion,
  }
}

export function resolveDiscGuidedSlots({
  state,
  suggestions,
  omittedSlotIds,
  completedSlotIds = new Set<DiscGuidedSlotId>(),
}: {
  state: DiscGuidedSlotState
  suggestions: readonly DiscGuidedSlotSuggestion[]
  omittedSlotIds: ReadonlySet<DiscGuidedSlotId>
  completedSlotIds?: ReadonlySet<DiscGuidedSlotId>
}) {
  return DISC_GUIDED_SLOT_DEFINITIONS.map((definition) =>
    resolveDiscGuidedSlot({
      slotId: definition.id,
      state,
      suggestions,
      omittedSlotIds,
      completedSlotIds,
    }),
  )
}
