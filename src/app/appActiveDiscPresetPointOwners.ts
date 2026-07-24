import type {
  DiscPointPresetTarget,
} from '../presets/discPresetDefinition.ts'
import {
  createDiscCanonicalVisualBoundsFromCenteredRenderBounds,
  type DiscPresetFocusedOwnerState,
  type DiscPresetOwnerStateCatalog,
  type DiscPresetOwnerUpdate,
} from '../presets/discPresetOwnerPlacement.ts'
import {
  DISC_PRESET_PRODUCTION_ADAPTER_REGISTRY,
} from '../presets/discPresetProductionAdapterRegistry.ts'
import {
  DISC_PRESET_REGISTRY,
  type DiscPresetRegistry,
} from '../presets/discPresetRegistry.ts'
import {
  createDiscPresetTemplateResolutionInput,
} from '../presets/discPresetResolution.ts'
import {
  resolveDiscPresetPlacementForTarget,
  type ActiveDiscPresetState,
  type DiscPresetTargetedApplicationResult,
} from '../presets/discPresetTargetedApplication.ts'
import {
  getPrimaryLogoAssetCanonicalVisualBounds,
} from '../project/projectLogoAssets.ts'
import {
  getTitleArtworkCanonicalVisualBounds,
} from '../project/projectTitleArtwork.ts'
import type {
  ProjectLogoAssets,
  ProjectMediaMark,
  ProjectMetadata,
  ProjectRatingBadge,
  ProjectTitleArtwork,
} from '../project/projectTypes.ts'
import {
  getMediaMarkCanonicalVisualBounds,
} from '../render/mediaMarkRenderModel.ts'
import {
  getPrimaryRatingBadgeCanonicalVisualBounds,
} from '../render/ratingBadgeRenderModel.ts'
import type { DiscTemplate } from '../types/template.ts'

type ActiveDiscPresetPointOwnerInput = Readonly<{
  presetState: ActiveDiscPresetState | null
  selectedDiscTemplate: DiscTemplate
  registry?: DiscPresetRegistry
}>

type ResolveActiveDiscPresetPointPlacementInput<
  TTarget extends DiscPointPresetTarget,
> = ActiveDiscPresetPointOwnerInput & Readonly<{
  target: TTarget
  ownerState: DiscPresetFocusedOwnerState<TTarget>
}>

type TitleArtworkLayoutUpdate = Extract<
  DiscPresetOwnerUpdate,
  { kind: 'title-artwork-layout' }
>

type RatingBadgeLayoutUpdate = Extract<
  DiscPresetOwnerUpdate,
  { kind: 'rating-layout' }
>

type MediaMarkLayoutUpdate = Extract<
  DiscPresetOwnerUpdate,
  { kind: 'media-mark-layout' }
>

type PrimaryLogoLayoutUpdate = Extract<
  DiscPresetOwnerUpdate,
  { kind: 'primary-logo-layout' }
>

export type ActiveDiscPresetTitleArtworkResult = Readonly<{
  titleArtwork: ProjectTitleArtwork
  application: DiscPresetTargetedApplicationResult | null
}>

export type ActiveDiscPresetRatingBadgeResult = Readonly<{
  ratingBadge: ProjectRatingBadge
  application: DiscPresetTargetedApplicationResult | null
}>

export type ActiveDiscPresetMediaMarkResult = Readonly<{
  mediaMark: ProjectMediaMark
  application: DiscPresetTargetedApplicationResult | null
}>

export type ActiveDiscPresetLogoAssetsResult = Readonly<{
  logoAssets: ProjectLogoAssets
  application: DiscPresetTargetedApplicationResult | null
}>

export function isActiveDiscPresetPointFitImpossible(
  application: DiscPresetTargetedApplicationResult | null,
  target: DiscPointPresetTarget,
) {
  return application?.warnings.some((warning) =>
    warning.kind === 'placement-impossible' && warning.target === target
  ) ?? false
}

function createFocusedOwnerCatalog<TTarget extends DiscPointPresetTarget>(
  target: TTarget,
  ownerState: DiscPresetFocusedOwnerState<TTarget>,
): DiscPresetOwnerStateCatalog {
  return { [target]: ownerState } as DiscPresetOwnerStateCatalog
}

function resolveActiveDiscPresetPointPlacement<
  TTarget extends DiscPointPresetTarget,
>({
  presetState,
  selectedDiscTemplate,
  registry = DISC_PRESET_REGISTRY,
  target,
  ownerState,
}: ResolveActiveDiscPresetPointPlacementInput<TTarget>):
  DiscPresetTargetedApplicationResult | null {
  if (!presetState) return null

  return resolveDiscPresetPlacementForTarget({
    presetRef: presetState.ref,
    resolvedPreset: presetState.resolvedDefinition,
    registry,
    template: createDiscPresetTemplateResolutionInput(
      selectedDiscTemplate,
    ),
    target,
    ownerState: createFocusedOwnerCatalog(target, ownerState),
    adapterRegistry: DISC_PRESET_PRODUCTION_ADAPTER_REGISTRY,
  })
}

function getApplicableUpdates(
  application: DiscPresetTargetedApplicationResult | null,
) {
  return application?.status === 'applied' || application?.status === 'partial'
    ? application.updates
    : Object.freeze([] as const)
}

function findTitleArtworkLayoutUpdate(
  application: DiscPresetTargetedApplicationResult | null,
): TitleArtworkLayoutUpdate | undefined {
  for (const candidate of getApplicableUpdates(application)) {
    if (
      candidate.kind === 'title-artwork-layout' &&
      candidate.target === 'game-title.artwork'
    ) {
      return candidate
    }
  }

  return undefined
}

function findRatingBadgeLayoutUpdate(
  application: DiscPresetTargetedApplicationResult | null,
): RatingBadgeLayoutUpdate | undefined {
  for (const candidate of getApplicableUpdates(application)) {
    if (
      candidate.kind === 'rating-layout' &&
      candidate.target === 'rating.primary'
    ) {
      return candidate
    }
  }

  return undefined
}

function findMediaMarkLayoutUpdate(
  application: DiscPresetTargetedApplicationResult | null,
): MediaMarkLayoutUpdate | undefined {
  for (const candidate of getApplicableUpdates(application)) {
    if (
      candidate.kind === 'media-mark-layout' &&
      candidate.target === 'media-format.primary'
    ) {
      return candidate
    }
  }

  return undefined
}

function findPrimaryLogoLayoutUpdate(
  application: DiscPresetTargetedApplicationResult | null,
  logoKey: 'developer' | 'publisher',
): PrimaryLogoLayoutUpdate | undefined {
  const target = logoKey === 'developer'
    ? 'developer-logo.primary'
    : 'publisher-logo.primary'

  for (const candidate of getApplicableUpdates(application)) {
    if (
      candidate.kind === 'primary-logo-layout' &&
      candidate.target === target &&
      candidate.logoKey === logoKey
    ) {
      return candidate
    }
  }

  return undefined
}

export function applyActiveDiscPresetToTitleArtworkState({
  presetState,
  selectedDiscTemplate,
  titleArtwork,
  registry = DISC_PRESET_REGISTRY,
}: ActiveDiscPresetPointOwnerInput & Readonly<{
  titleArtwork: ProjectTitleArtwork
}>): ActiveDiscPresetTitleArtworkResult {
  const application = resolveActiveDiscPresetPointPlacement({
    presetState,
    selectedDiscTemplate,
    registry,
    target: 'game-title.artwork',
    ownerState: {
      layout: titleArtwork.layout,
      canonicalVisualBoundsAtScaleOne:
        createDiscCanonicalVisualBoundsFromCenteredRenderBounds(
          getTitleArtworkCanonicalVisualBounds(titleArtwork),
        ),
    },
  })
  const update = findTitleArtworkLayoutUpdate(application)

  if (!update) return Object.freeze({ titleArtwork, application })

  return Object.freeze({
    titleArtwork: {
      ...titleArtwork,
      layout: {
        ...titleArtwork.layout,
        x: update.layout.x,
        y: update.layout.y,
        scale: update.layout.scale,
      },
    },
    application,
  })
}

export function applyActiveDiscPresetToRatingBadgeState({
  presetState,
  selectedDiscTemplate,
  ratingBadge,
  metadata,
  registry = DISC_PRESET_REGISTRY,
}: ActiveDiscPresetPointOwnerInput & Readonly<{
  ratingBadge: ProjectRatingBadge
  metadata: Pick<ProjectMetadata, 'ratingSystem' | 'ratingValue'>
}>): ActiveDiscPresetRatingBadgeResult {
  const application = resolveActiveDiscPresetPointPlacement({
    presetState,
    selectedDiscTemplate,
    registry,
    target: 'rating.primary',
    ownerState: {
      layout: ratingBadge.layout,
      canonicalVisualBoundsAtScaleOne:
        createDiscCanonicalVisualBoundsFromCenteredRenderBounds(
          getPrimaryRatingBadgeCanonicalVisualBounds(metadata, ratingBadge),
        ),
    },
  })
  const update = findRatingBadgeLayoutUpdate(application)

  if (!update) return Object.freeze({ ratingBadge, application })

  return Object.freeze({
    ratingBadge: {
      ...ratingBadge,
      layout: {
        ...ratingBadge.layout,
        x: update.layout.x,
        y: update.layout.y,
        scale: update.layout.scale,
      },
    },
    application,
  })
}

export function applyActiveDiscPresetToMediaMarkState({
  presetState,
  selectedDiscTemplate,
  mediaMark,
  registry = DISC_PRESET_REGISTRY,
}: ActiveDiscPresetPointOwnerInput & Readonly<{
  mediaMark: ProjectMediaMark
}>): ActiveDiscPresetMediaMarkResult {
  const application = resolveActiveDiscPresetPointPlacement({
    presetState,
    selectedDiscTemplate,
    registry,
    target: 'media-format.primary',
    ownerState: {
      layout: mediaMark.layout,
      canonicalVisualBoundsAtScaleOne:
        createDiscCanonicalVisualBoundsFromCenteredRenderBounds(
          getMediaMarkCanonicalVisualBounds(mediaMark),
        ),
    },
  })
  const update = findMediaMarkLayoutUpdate(application)

  if (!update) return Object.freeze({ mediaMark, application })

  return Object.freeze({
    mediaMark: {
      ...mediaMark,
      layout: {
        ...mediaMark.layout,
        x: update.layout.x,
        y: update.layout.y,
        scale: update.layout.scale,
      },
    },
    application,
  })
}

export function applyActiveDiscPresetToLogoAssetsState({
  presetState,
  selectedDiscTemplate,
  logoAssets,
  logoKey,
  registry = DISC_PRESET_REGISTRY,
}: ActiveDiscPresetPointOwnerInput & Readonly<{
  logoAssets: ProjectLogoAssets
  logoKey: 'developer' | 'publisher'
}>): ActiveDiscPresetLogoAssetsResult {
  const target = logoKey === 'developer'
    ? 'developer-logo.primary' as const
    : 'publisher-logo.primary' as const
  const layout = logoKey === 'developer'
    ? logoAssets.developerLogoLayout
    : logoAssets.publisherLogoLayout
  const application = resolveActiveDiscPresetPointPlacement({
    presetState,
    selectedDiscTemplate,
    registry,
    target,
    ownerState: {
      logoKey,
      layout,
      canonicalVisualBoundsAtScaleOne:
        createDiscCanonicalVisualBoundsFromCenteredRenderBounds(
          getPrimaryLogoAssetCanonicalVisualBounds(logoAssets, logoKey),
        ),
    },
  })
  const update = findPrimaryLogoLayoutUpdate(application, logoKey)

  if (!update) return Object.freeze({ logoAssets, application })

  const nextLayout = {
    ...layout,
    x: update.layout.x,
    y: update.layout.y,
    scale: update.layout.scale,
  }

  return Object.freeze({
    logoAssets: logoKey === 'developer'
      ? {
          ...logoAssets,
          developerLogoLayout: nextLayout,
        }
      : {
          ...logoAssets,
          publisherLogoLayout: nextLayout,
        },
    application,
  })
}

export function applyActiveDiscPresetToDeveloperLogoState(
  input: Omit<
    Parameters<typeof applyActiveDiscPresetToLogoAssetsState>[0],
    'logoKey'
  >,
) {
  return applyActiveDiscPresetToLogoAssetsState({
    ...input,
    logoKey: 'developer',
  })
}

export function applyActiveDiscPresetToPublisherLogoState(
  input: Omit<
    Parameters<typeof applyActiveDiscPresetToLogoAssetsState>[0],
    'logoKey'
  >,
) {
  return applyActiveDiscPresetToLogoAssetsState({
    ...input,
    logoKey: 'publisher',
  })
}
