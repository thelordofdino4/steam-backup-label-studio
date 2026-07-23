import type {
  DiscTextLayoutSettings,
} from '../discText/types.ts'
import {
  getDiscTextContent,
} from '../discText/index.ts'
import {
  getDiscTextRenderableContent,
} from '../discText/renderableContent.ts'
import {
  resolveDiscTextMetadataState,
} from '../discText/metadataStateTransitions.ts'
import {
  getDiscGuidedLayoutDefinition,
} from '../guidedPresets/discGuidedLayouts.ts'
import type {
  DiscGuidedWorkflowState,
} from '../guidedPresets/discGuidedWorkflow.ts'
import type {
  DiscRolePresetApplicationState,
  DiscRolePresetFeatureOwner,
} from '../layout/discRolePresets.ts'
import {
  buildDiscPresetApplicationPlan,
  type DiscPresetApplicationStatus,
  type DiscPresetApplicationWarning,
} from '../presets/discPresetApplication.ts'
import type {
  DiscPresetApplicationServices,
} from '../presets/discPresetApplicationServices.ts'
import type {
  ActiveDiscPresetState,
  ActiveDiscPresetRef,
} from '../presets/discPresetTargetedApplication.ts'
import type {
  DiscPresetOwnerStateCatalog,
  DiscPresetOwnerUpdate,
} from '../presets/discPresetPlacementAdapters.ts'
import {
  DISC_PRESET_PRODUCTION_ADAPTER_REGISTRY,
} from '../presets/discPresetProductionAdapterRegistry.ts'
import {
  DISC_PRESET_REGISTRY,
  type DiscPresetRegistry,
} from '../presets/discPresetRegistry.ts'
import {
  createDiscPresetTemplateResolutionInput,
  resolveDiscPresetDefinition,
  type ResolvedDiscPresetDefinition,
} from '../presets/discPresetResolution.ts'
import {
  getProjectPlatformMarkAsset,
} from '../project/projectPlatformMarks.ts'
import type { DiscTemplate } from '../types/template.ts'
import {
  DISC_PRESET_PRODUCTION_APPLICATION_SERVICES,
} from './appDiscPresetMeasurementService.ts'

export type RegisteredDiscPresetFeatureOwner = Extract<
  DiscRolePresetFeatureOwner,
  | 'backgroundImage'
  | 'titleArtwork'
  | 'discText'
  | 'ratingBadge'
  | 'mediaMark'
  | 'platformMarks'
  | 'logoAssets'
>

type RegisteredDiscPresetRequiredTextStateKey =
  | 'discTextValues'
  | 'discTextValueSources'
  | 'discTextTitleValue'
  | 'discTextHtmlSources'
  | 'discTextStyles'
  | 'metadata'

export type RegisteredDiscPresetApplicationState = Pick<
  DiscRolePresetApplicationState,
  | 'background'
  | 'titleArtwork'
  | 'discTextSettings'
  | 'discTextLayout'
  | 'logoAssets'
  | 'ratingBadge'
  | 'mediaMark'
  | 'platformMarks'
> & Required<Pick<
  DiscRolePresetApplicationState,
  RegisteredDiscPresetRequiredTextStateKey
>>

export type RegisteredDiscPresetApplicationResult<
  TState extends RegisteredDiscPresetApplicationState =
    RegisteredDiscPresetApplicationState,
> = Readonly<{
  status: DiscPresetApplicationStatus
  canonicalPresetId: string
  presetRef: ActiveDiscPresetRef
  resolvedPreset: ResolvedDiscPresetDefinition | null
  state: TState
  updates: readonly DiscPresetOwnerUpdate[]
  updatedOwners: readonly RegisteredDiscPresetFeatureOwner[]
  warnings: readonly DiscPresetApplicationWarning[]
}>

type ApplyRegisteredDiscPresetInput<
  TState extends RegisteredDiscPresetApplicationState,
> = Readonly<{
  presetId: string
  currentState: TState
  selectedDiscTemplate: DiscTemplate
  services?: DiscPresetApplicationServices
}>

type ReconstructActiveDiscPresetStateInput<
  TState extends RegisteredDiscPresetApplicationState,
> = Readonly<{
  workflow: DiscGuidedWorkflowState
  currentState: TState
  selectedDiscTemplate: DiscTemplate
  registry?: DiscPresetRegistry
  services?: DiscPresetApplicationServices
}>

export function createRegisteredDiscPresetOwnerStateSnapshot(
  state: RegisteredDiscPresetApplicationState,
  selectedDiscTemplate: DiscTemplate,
): DiscPresetOwnerStateCatalog {
  const textResolution = resolveDiscTextMetadataState(state.metadata, {
    discTextValues: state.discTextValues,
    discTextValueSources: state.discTextValueSources,
    discTextTitleValue: state.discTextTitleValue,
  })
  const copyrightFallback = getDiscTextContent(
    'copyright',
    textResolution.metadataBoundDiscTextValues,
    textResolution.resolvedDiscTextTitle,
  )

  return Object.freeze({
    'game-title.artwork': Object.freeze({
      layout: Object.freeze({ ...state.titleArtwork.layout }),
    }),
    'game-title.text': Object.freeze({
      key: 'title',
      enabled: state.discTextSettings.title,
      layout: Object.freeze({ ...state.discTextLayout.title }),
    }),
    'background.primary': Object.freeze({
      enabled: state.background.enabled,
      imageDataUrl: state.background.imageDataUrl,
      imageSource: state.background.imageSource ?? null,
      imageSize: state.background.imageSize ?? null,
      scale: state.background.scale,
      offset: Object.freeze({ ...state.background.offset }),
    }),
    'rating.primary': Object.freeze({
      layout: Object.freeze({ ...state.ratingBadge.layout }),
    }),
    'media-format.primary': Object.freeze({
      layout: Object.freeze({ ...state.mediaMark.layout }),
    }),
    'operating-system-marks.enabled': Object.freeze({
      platformMarks: state.platformMarks,
      template: selectedDiscTemplate,
    }),
    'developer-logo.primary': Object.freeze({
      logoKey: 'developer',
      layout: Object.freeze({ ...state.logoAssets.developerLogoLayout }),
    }),
    'publisher-logo.primary': Object.freeze({
      logoKey: 'publisher',
      layout: Object.freeze({ ...state.logoAssets.publisherLogoLayout }),
    }),
    'legal.copyright': Object.freeze({
      key: 'copyright',
      enabled: state.discTextSettings.copyright,
      content: getDiscTextRenderableContent({
        fallbackText: copyrightFallback,
        htmlSources: state.discTextHtmlSources,
        key: 'copyright',
      }),
      layout: Object.freeze({ ...state.discTextLayout.copyright }),
      style: Object.freeze({ ...state.discTextStyles.copyright }),
      template: Object.freeze({ ...selectedDiscTemplate }),
    }),
  })
}

function getOwnerForUpdate(
  update: DiscPresetOwnerUpdate,
): RegisteredDiscPresetFeatureOwner {
  switch (update.kind) {
    case 'title-artwork-layout':
      return 'titleArtwork'
    case 'disc-text-layout':
      return 'discText'
    case 'background-layout':
      return 'backgroundImage'
    case 'rating-layout':
      return 'ratingBadge'
    case 'media-mark-layout':
      return 'mediaMark'
    case 'platform-mark-layout':
      return 'platformMarks'
    case 'primary-logo-layout':
      return 'logoAssets'
    default:
      return assertNever(update)
  }
}

function applyDiscTextLayoutUpdate(
  layout: DiscTextLayoutSettings,
  update: Extract<DiscPresetOwnerUpdate, { kind: 'disc-text-layout' }>,
): DiscTextLayoutSettings {
  return {
    ...layout,
    [update.key]: {
      ...layout[update.key],
      ...update.layout,
    },
  }
}

function applyOwnerUpdate<
  TState extends RegisteredDiscPresetApplicationState,
>(
  state: TState,
  update: DiscPresetOwnerUpdate,
  selectedDiscTemplate: DiscTemplate,
): TState {
  switch (update.kind) {
    case 'title-artwork-layout':
      return {
        ...state,
        titleArtwork: {
          ...state.titleArtwork,
          layout: {
            ...state.titleArtwork.layout,
            ...update.layout,
          },
        },
      }
    case 'disc-text-layout':
      return {
        ...state,
        discTextLayout: applyDiscTextLayoutUpdate(
          state.discTextLayout,
          update,
        ),
      }
    case 'background-layout':
      return {
        ...state,
        background: {
          ...state.background,
          scale: update.layout.scale,
          offset: { ...update.layout.offset },
        },
      }
    case 'rating-layout':
      return {
        ...state,
        ratingBadge: {
          ...state.ratingBadge,
          layout: {
            ...state.ratingBadge.layout,
            ...update.layout,
          },
        },
      }
    case 'media-mark-layout':
      return {
        ...state,
        mediaMark: {
          ...state.mediaMark,
          layout: {
            ...state.mediaMark.layout,
            ...update.layout,
          },
        },
      }
    case 'platform-mark-layout': {
      const asset = getProjectPlatformMarkAsset(
        state.platformMarks,
        update.markId,
        selectedDiscTemplate,
      )
      return {
        ...state,
        platformMarks: {
          ...state.platformMarks,
          assets: {
            ...state.platformMarks.assets,
            [update.markId]: {
              ...asset,
              layout: {
                ...asset.layout,
                ...update.layout,
              },
            },
          },
        },
      }
    }
    case 'primary-logo-layout':
      if (update.logoKey === 'developer') {
        return {
          ...state,
          logoAssets: {
            ...state.logoAssets,
            developerLogoLayout: {
              ...state.logoAssets.developerLogoLayout,
              ...update.layout,
            },
          },
        }
      }
      return {
        ...state,
        logoAssets: {
          ...state.logoAssets,
          publisherLogoLayout: {
            ...state.logoAssets.publisherLogoLayout,
            ...update.layout,
          },
        },
      }
    default:
      return assertNever(update)
  }
}

function getUpdatedOwners(
  updates: readonly DiscPresetOwnerUpdate[],
): readonly RegisteredDiscPresetFeatureOwner[] {
  const owners: RegisteredDiscPresetFeatureOwner[] = []

  for (const update of updates) {
    const owner = getOwnerForUpdate(update)
    if (!owners.includes(owner)) owners.push(owner)
  }

  return Object.freeze(owners)
}

function assertNever(value: never): never {
  throw new Error(`Unsupported Disc preset owner update: ${String(value)}`)
}

export function reconstructActiveDiscPresetState<
  TState extends RegisteredDiscPresetApplicationState,
>({
  workflow,
  currentState,
  selectedDiscTemplate,
  registry = DISC_PRESET_REGISTRY,
  services = DISC_PRESET_PRODUCTION_APPLICATION_SERVICES,
}: ReconstructActiveDiscPresetStateInput<TState>): ActiveDiscPresetState | null {
  if (!workflow.activeLayout) return null

  const layout = getDiscGuidedLayoutDefinition(
    workflow.activeLayout.id,
    workflow.activeLayout.version,
  )

  if (!layout) return null

  try {
    // Guided layout versions and canonical preset revisions intentionally share
    // this explicit mapping boundary. Never substitute a newer Classic revision
    // by guess when the persisted layout version is unavailable.
    const definition = registry.get(layout.presetId, layout.version)

    if (!definition) return null

    const template = createDiscPresetTemplateResolutionInput(
      selectedDiscTemplate,
    )
    const resolution = resolveDiscPresetDefinition({ definition, template })
    const application = buildDiscPresetApplicationPlan({
      resolution,
      adapterRegistry: DISC_PRESET_PRODUCTION_ADAPTER_REGISTRY,
      ownerState: createRegisteredDiscPresetOwnerStateSnapshot(
        currentState,
        selectedDiscTemplate,
      ),
      services,
      template,
    })

    if (application.status === 'rejected' || !application.resolvedPreset) {
      return null
    }

    return Object.freeze({
      ref: Object.freeze({
        id: definition.id,
        revision: definition.revision,
      }),
      resolvedDefinition: application.resolvedPreset,
    })
  } catch {
    return null
  }
}

export function applyRegisteredDiscPresetToState<
  TState extends RegisteredDiscPresetApplicationState,
>({
  presetId,
  currentState,
  selectedDiscTemplate,
  services = DISC_PRESET_PRODUCTION_APPLICATION_SERVICES,
}: ApplyRegisteredDiscPresetInput<TState>):
  RegisteredDiscPresetApplicationResult<TState> | null {
  const definition = DISC_PRESET_REGISTRY.get(presetId)
  if (!definition) return null

  const template = createDiscPresetTemplateResolutionInput(
    selectedDiscTemplate,
  )
  const resolution = resolveDiscPresetDefinition({
    definition,
    template,
  })
  const application = buildDiscPresetApplicationPlan({
    resolution,
    adapterRegistry: DISC_PRESET_PRODUCTION_ADAPTER_REGISTRY,
    ownerState: createRegisteredDiscPresetOwnerStateSnapshot(
      currentState,
      selectedDiscTemplate,
    ),
    services,
    template,
  })
  const nextState = application.status === 'rejected'
    ? currentState
    : application.updates.reduce(
      (state, update) => applyOwnerUpdate(
        state,
        update,
        selectedDiscTemplate,
      ),
      currentState,
    )

  return Object.freeze({
    status: application.status,
    canonicalPresetId: definition.id,
    presetRef: Object.freeze({
      id: definition.id,
      revision: definition.revision,
    }),
    resolvedPreset: application.resolvedPreset,
    state: nextState,
    updates: application.updates,
    updatedOwners: application.status === 'rejected'
      ? Object.freeze([])
      : getUpdatedOwners(application.updates),
    warnings: application.warnings,
  })
}
