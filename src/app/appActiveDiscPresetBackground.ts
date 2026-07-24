import type {
  DiscBackgroundPresetOwnerState,
  DiscPresetOwnerUpdate,
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
import type { DiscTemplate } from '../types/template.ts'

type BackgroundLayoutUpdate = Extract<
  DiscPresetOwnerUpdate,
  { kind: 'background-layout' }
>

export type ActiveDiscPresetBackgroundResult = Readonly<{
  background: DiscBackgroundPresetOwnerState
  application: DiscPresetTargetedApplicationResult | null
}>

function findBackgroundLayoutUpdate(
  application: DiscPresetTargetedApplicationResult | null,
): BackgroundLayoutUpdate | undefined {
  if (application?.status !== 'applied' && application?.status !== 'partial') {
    return undefined
  }

  return application.updates.find((candidate): candidate is BackgroundLayoutUpdate =>
    candidate.kind === 'background-layout' &&
    candidate.target === 'background.primary')
}

export function isActiveDiscPresetBackgroundFitImpossible(
  application: DiscPresetTargetedApplicationResult | null,
) {
  return application?.warnings.some((warning) =>
    warning.kind === 'placement-impossible' &&
    warning.target === 'background.primary'
  ) ?? false
}

export function applyActiveDiscPresetToBackgroundState({
  presetState,
  selectedDiscTemplate,
  background,
  registry = DISC_PRESET_REGISTRY,
}: Readonly<{
  presetState: ActiveDiscPresetState | null
  selectedDiscTemplate: DiscTemplate
  background: DiscBackgroundPresetOwnerState
  registry?: DiscPresetRegistry
}>): ActiveDiscPresetBackgroundResult {
  if (!presetState) {
    return Object.freeze({ background, application: null })
  }

  const application = resolveDiscPresetPlacementForTarget({
    presetRef: presetState.ref,
    resolvedPreset: presetState.resolvedDefinition,
    registry,
    template: createDiscPresetTemplateResolutionInput(selectedDiscTemplate),
    target: 'background.primary',
    ownerState: { 'background.primary': background },
    adapterRegistry: DISC_PRESET_PRODUCTION_ADAPTER_REGISTRY,
  })
  const update = findBackgroundLayoutUpdate(application)

  if (!update) return Object.freeze({ background, application })

  return Object.freeze({
    background: {
      ...background,
      scale: update.layout.scale,
      offset: { ...update.layout.offset },
    },
    application,
  })
}
